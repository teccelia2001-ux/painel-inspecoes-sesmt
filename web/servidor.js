/* ============================================================
   SERVIDOR — cadastros de equipes e inspetores no Supabase

   Leitura é pública: qualquer pessoa que abre o painel recebe os
   cadastros do banco. Escrita exige login (política de RLS).

   Se o banco não responder, o painel segue com os dados embutidos
   em data.js — nunca fica em branco por causa de rede.

   A chave abaixo é a publicável (anon). Ela é pública por natureza:
   quem manda no que pode ser gravado é a RLS, não a chave.
   ============================================================ */

const SERVIDOR = {
  url: "https://aggdmvtyfrlyipaovczq.supabase.co",
  chave: "sb_publishable_Tme_a9bZSdKvUG40TK0MZw_KR6mqfq3",
  sessao: "sesmt.sessao.v1"
};

const Banco = {
  ligado: false,          // vira true quando o banco responde
  usuario: null,          // e-mail de quem está autenticado
  admin: false,           // está na lista sesmt_admins?
  erro: null,

  /* Editar exige as três coisas: banco no ar, sessão válida e ser admin.
     Estar autenticado não basta — este projeto Supabase é compartilhado
     com outros sistemas, e os usuários deles não administram o SESMT. */
  podeEditar() { return this.ligado && this.autenticado() && this.admin; },

  /* ---------- sessão ---------- */
  carregarSessao() {
    try {
      const s = JSON.parse(localStorage.getItem(SERVIDOR.sessao) || "null");
      if (s && s.expira_em > Date.now()) { this.token = s.token; this.usuario = s.email; return true; }
      localStorage.removeItem(SERVIDOR.sessao);
    } catch (e) { /* sessão ilegível: segue deslogado */ }
    return false;
  },
  /* Alguns contextos bloqueiam o armazenamento (navegação privada,
     páginas abertas como data:). Nesses casos a sessão vale só enquanto
     a aba estiver aberta, em vez de a página quebrar. */
  guardarSessao(token, email, segundos) {
    this.token = token; this.usuario = email;
    try {
      localStorage.setItem(SERVIDOR.sessao, JSON.stringify({
        token, email, expira_em: Date.now() + (segundos || 3600) * 1000
      }));
    } catch (e) { /* sessão só em memória */ }
  },
  async entrar(email, senha) {
    const r = await fetch(`${SERVIDOR.url}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { apikey: SERVIDOR.chave, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: senha })
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error_description || j.msg || "Não foi possível entrar");
    this.guardarSessao(j.access_token, email, j.expires_in);
    await this.verificarAdmin();
    if (!this.admin) throw new Error(
      "Esta conta entrou, mas não tem permissão de administrador do painel. " +
      "Peça para incluírem seu e-mail na lista de administradores.");
    return j;
  },
  sair() {
    this.token = null; this.usuario = null; this.admin = false;
    try { localStorage.removeItem(SERVIDOR.sessao); } catch (e) { /* nada a limpar */ }
  },
  autenticado() { return !!this.token; },

  /* Pergunta ao banco se a conta desta sessão administra o painel.
     A resposta vem da função sesmt_e_admin(), que lê a lista de
     administradores — a lista em si não fica exposta. */
  async verificarAdmin() {
    if (!this.autenticado()) { this.admin = false; return false; }
    try {
      const r = await this.pedir("rpc/sesmt_e_admin", { method: "POST", body: "{}" });
      this.admin = r === true;
    } catch (e) {
      this.admin = false;
    }
    return this.admin;
  },

  /* ---------- REST ---------- */
  cabecalhos(extra) {
    return Object.assign({
      apikey: SERVIDOR.chave,
      Authorization: `Bearer ${this.token || SERVIDOR.chave}`,
      "Content-Type": "application/json"
    }, extra || {});
  },
  async pedir(caminho, opcoes) {
    const r = await fetch(`${SERVIDOR.url}/rest/v1/${caminho}`,
      Object.assign({ headers: this.cabecalhos(opcoes && opcoes.headers) }, opcoes));
    const txt = await r.text();
    if (!r.ok) {
      let msg = txt;
      try { const j = JSON.parse(txt); msg = j.message || j.hint || txt; } catch (e) {}
      if (r.status === 401 || r.status === 403) msg = "Sua sessão expirou. Entre novamente para editar.";
      throw new Error(msg);
    }
    return txt ? JSON.parse(txt) : null;
  },

  /* ---------- cadastros ---------- */
  async baixarCadastros() {
    const [eq, insp] = await Promise.all([
      this.pedir("sesmt_equipes?select=*&order=equipe"),
      this.pedir("sesmt_inspetores?select=*&order=inspetor")
    ]);
    this.ligado = true;
    this.erro = null;
    await this.verificarAdmin();
    return { equipes: eq, inspetores: insp };
  },
  criar(tabela, linha)      { return this.pedir(tabela, { method: "POST", body: JSON.stringify(linha), headers: { Prefer: "return=representation" } }); },
  atualizar(tabela, id, linha) { return this.pedir(`${tabela}?id=eq.${id}`, { method: "PATCH", body: JSON.stringify(linha), headers: { Prefer: "return=representation" } }); },
  excluir(tabela, id)       { return this.pedir(`${tabela}?id=eq.${id}`, { method: "DELETE" }); }
};

/* ============================================================
   CADASTROS — o que a aba Ajustes manipula.
   Guarda a forma "rica" (com id e status) e mantém os arrays
   EQUIPES / INSPETORES do modelo sincronizados.
   ============================================================ */
const Cadastros = {
  equipes: [],       // {id, equipe, tipo, supervisor, pontos, ativa}
  inspetores: [],    // {id, inspetor, cargo, area, regional, funcao, meta_dinamica, meta_estatica, ativo}
  origem: "embutido",

  /* Dados de data.js, usados enquanto o banco não responde */
  doArquivo() {
    this.equipes = EQUIPES.map((r, i) => ({
      id: "local-e" + i, equipe: r[0], tipo: r[1], supervisor: r[2], pontos: r[3], ativa: true
    }));
    this.inspetores = INSPETORES.map((r, i) => ({
      id: "local-i" + i, inspetor: r[0], cargo: r[1], area: r[2], regional: r[3],
      funcao: r[4], meta_dinamica: r[5], meta_estatica: r[6], ativo: true
    }));
    this.origem = "embutido";
  },

  /* Reescreve os arrays que o modelo consome e recalcula tudo */
  aplicarNoModelo() {
    EQUIPES = this.equipes.filter(e => e.ativa)
      .map(e => [e.equipe, e.tipo || "", e.supervisor || "", Number(e.pontos) || 0]);
    INSPETORES = this.inspetores.filter(i => i.ativo)
      .map(i => [i.inspetor, i.cargo || "", i.area || "", i.regional || "", i.funcao || "",
                 Number(i.meta_dinamica) || 0, Number(i.meta_estatica) || 0]);
    reconstruirModelo();
  },

  async carregar() {
    this.doArquivo();
    try {
      const d = await Banco.baixarCadastros();
      if (d.equipes.length || d.inspetores.length) {
        this.equipes = d.equipes;
        this.inspetores = d.inspetores;
        this.origem = "banco";
      }
    } catch (e) {
      Banco.ligado = false;
      Banco.erro = e.message;
    }
    this.aplicarNoModelo();
    return this.origem;
  },

  lista(tipo) { return tipo === "equipes" ? this.equipes : this.inspetores; },
  tabela(tipo) { return tipo === "equipes" ? "sesmt_equipes" : "sesmt_inspetores"; },

  async salvar(tipo, registro) {
    const tabela = this.tabela(tipo);
    const novo = !registro.id || String(registro.id).startsWith("local-");
    const corpo = Object.assign({}, registro);
    delete corpo.id; delete corpo.criada_em; delete corpo.atualizada_em;

    if (Banco.podeEditar()) {
      const r = novo ? await Banco.criar(tabela, corpo)
                     : await Banco.atualizar(tabela, registro.id, corpo);
      const salvo = Array.isArray(r) ? r[0] : r;
      const lista = this.lista(tipo);
      const i = lista.findIndex(x => x.id === registro.id);
      if (i >= 0) lista[i] = salvo; else lista.push(salvo);
    } else {
      // sem banco: vale só nesta sessão, para não travar o uso
      const lista = this.lista(tipo);
      const i = lista.findIndex(x => x.id === registro.id);
      if (i >= 0) lista[i] = Object.assign({}, lista[i], registro);
      else lista.push(Object.assign({ id: "local-" + Date.now() }, registro));
    }
    this.aplicarNoModelo();
  },

  async excluir(tipo, id) {
    if (Banco.podeEditar() && !String(id).startsWith("local-"))
      await Banco.excluir(this.tabela(tipo), id);
    const lista = this.lista(tipo);
    const i = lista.findIndex(x => x.id === id);
    if (i >= 0) lista.splice(i, 1);
    this.aplicarNoModelo();
  }
};

Banco.carregarSessao();
