/* ============================================================
   AJUSTES — cadastro de equipes e inspetores
   Tabela com filtros, ações por linha e diálogo de criação/edição.
   ============================================================ */

/* Sugestão de e-mail a partir do nome: "José Pereira" -> jose.pereira */
const semAcentoAj = t => String(t || "").normalize("NFD")
  .replace(/[̀-ͯ]/g, "").toLowerCase().trim();

const CAMPOS_EQUIPE = [
  { k: "equipe", rot: "Nome da equipe", obrigatorio: true },
  /* O tipo define o departamento, e é por ele que o app decide quais
     equipes mostrar ao inspetor. Por isso o departamento aparece aqui,
     no rótulo: escolher o tipo É escolher o departamento. */
  { k: "tipo", rot: "Tipo de equipe (define o departamento)", tipo: "select", opcoes: [
      ["LM", "Linha morta (rede desligada) — DCMD C&M"],
      ["MAN", "Manutenção — DCMD C&M"],
      ["LV", "Linha viva — DCMD LINHA VIVA"],
      ["POD", "Poda — DCMD PODA"],
      ["PER", "Perdas — DECP"],
      ["REA", "Reaviso — DECP"],
      ["PLA", "Plantão — DEOP"]] },
  { k: "supervisor", rot: "Supervisor", tipo: "select-livre", origem: () => [...new Set(
      Cadastros.inspetores.map(i => i.inspetor)
        .concat(Cadastros.equipes.map(e => e.supervisor)))].filter(Boolean).sort() },
  { k: "pontos", rot: "Pontos iniciais por mês", tipo: "numero", padrao: 100 },
  { k: "ativa", rot: "Situação", tipo: "booleano", rotSim: "Ativa", rotNao: "Inativa", padrao: true }
];

const CAMPOS_INSPETOR = [
  { k: "inspetor", rot: "Nome do inspetor", obrigatorio: true },
  { k: "funcao", rot: "Função", tipo: "select-livre", origem: () => [...new Set(
      Cadastros.inspetores.map(i => i.funcao))].filter(Boolean).sort() },
  { k: "polo", rot: "Polo", tipo: "select-livre", origem: () => [...new Set(
      Cadastros.inspetores.map(i => i.polo))].filter(Boolean).sort() },
  { k: "meta_dinamica", rot: "Meta de inspeção dinâmica (por mês)", tipo: "numero", padrao: 0 },
  { k: "meta_estatica", rot: "Meta de inspeção estática (por mês)", tipo: "numero", padrao: 0 },
  { k: "ativo", rot: "Situação", tipo: "booleano", rotSim: "Ativo", rotNao: "Inativo", padrao: true }
];

const SECOES = {
  equipes: {
    titulo: "Equipes", desc: "Equipes de campo avaliadas na Jornada Segura.",
    novo: "Nova equipe", chave: "equipe", campos: CAMPOS_EQUIPE, statusK: "ativa",
    filtros: [["supervisor", "Supervisor"], ["tipo", "Tipo"], ["ativa", "Situação"]],
    /* "departamento" não é campo do banco: vem do tipo, pela mesma regra
       que o app usa. Ver DEPARTAMENTO_DO_TIPO. */
    colunas: [
      { t: "Equipe", v: r => r.equipe, forte: true },
      { t: "Supervisor", v: r => r.supervisor || "—" },
      { t: "Tipo", v: r => TIPOS_EQUIPE[r.tipo] || r.tipo || "—", etiqueta: true },
      { t: "Departamento", v: r => DEPARTAMENTO_DO_TIPO[r.tipo] || "—", etiqueta: true },
      { t: "Pontos", v: r => fmtN(r.pontos), num: true }
    ]
  },
  inspetores: {
    titulo: "Inspetores", desc: "Quem faz as inspeções e a meta individual de cada um.",
    novo: "Novo inspetor", chave: "inspetor", campos: CAMPOS_INSPETOR, statusK: "ativo",
    filtros: [["funcao", "Função"], ["polo", "Polo"], ["ativo", "Situação"]],
    /* "acesso" não é coluna do banco: é derivado do user_id, para dar
       um filtro de "quem ainda não tem login" sem inventar campo. */
    colunas: [
      { t: "Inspetor", v: r => r.inspetor, forte: true },
      { t: "Função", v: r => r.funcao || "—" },
      { t: "Polo", v: r => r.polo || "—", etiqueta: true },
      { t: "Meta dinâmica", v: r => fmtN(r.meta_dinamica), num: true },
      { t: "Meta estática", v: r => fmtN(r.meta_estatica), num: true },
      { t: "Acesso", v: r => r.user_id ? "tem login" : "—", etiqueta: true }
    ]
  }
};
const TIPOS_EQUIPE = { LM: "Linha morta", LV: "Linha viva", MAN: "Manutenção",
  PER: "Perdas", PLA: "Plantão", POD: "Poda", REA: "Reaviso" };

/* De qual departamento é cada tipo de equipe. É o que o app usa para
   mostrar ao inspetor só as equipes do departamento que ele escolheu.
   A regra oficial mora no banco, em sesmt_tipos_equipe; esta cópia serve
   só para rotular a tela do painel. Mudou lá, mude aqui. */
const DEPARTAMENTO_DO_TIPO = { LM: "DCMD C&M", MAN: "DCMD C&M", LV: "DCMD LINHA VIVA",
  POD: "DCMD PODA", PER: "DECP", REA: "DECP", PLA: "DEOP" };

/* Ordem de exibição dos inspetores: hierarquia de campo, não alfabeto.
   Quem não estiver na lista vai para o fim. */
const ORDEM_FUNCAO = ["Supervisor", "Técnico Segurança", "Engenheiro Segurança",
  "Coordenador Operacional", "Gerente Operacional"];
const postoFuncao = f => {
  const i = ORDEM_FUNCAO.findIndex(o => o.toLowerCase() === String(f || "").trim().toLowerCase());
  return i < 0 ? ORDEM_FUNCAO.length : i;
};
/* CONST 2 antes de CONST 10: comparação numérica, não alfabética */
const ordemNatural = (a, b) =>
  String(a || "").localeCompare(String(b || ""), "pt-BR", { numeric: true, sensitivity: "base" });

const Ajustes = {
  secao: "equipes",
  busca: "",
  filtros: {},

  montar(pg) {
    pg.innerHTML = "";
    const topo = document.createElement("div"); topo.className = "faixa-topo"; pg.appendChild(topo);
    const marca = document.createElement("div"); marca.className = "marca";
    marca.innerHTML = marcaHTML(); pg.appendChild(marca);

    const voltar = document.createElement("button");
    voltar.className = "voltar"; voltar.textContent = "←"; voltar.title = "Voltar ao painel";
    voltar.onclick = () => irPara("painel");
    pg.appendChild(voltar);

    this.estado = document.createElement("div");
    this.estado.className = "aj-estado";
    pg.appendChild(this.estado);

    const corpo = document.createElement("div");
    corpo.className = "aj";
    corpo.innerHTML = `
      <div class="aj-abas"></div>
      <div class="aj-cab">
        <div><h2 class="aj-tit"></h2><p class="aj-desc"></p></div>
        <button class="aj-novo">+ <span></span></button>
      </div>
      <div class="aj-filtros"></div>
      <div class="aj-tabela rolagem"></div>`;
    pg.appendChild(corpo);
    this.el = corpo;

    Object.keys(SECOES).forEach(k => {
      const b = document.createElement("button");
      b.textContent = SECOES[k].titulo;
      b.dataset.sec = k;
      b.onclick = () => { this.secao = k; this.busca = ""; this.filtros = {}; this.render(); };
      corpo.querySelector(".aj-abas").appendChild(b);
    });
    corpo.querySelector(".aj-novo").onclick = () => this.abrirDialogo(null);
    return pg;
  },

  linhasVisiveis() {
    const s = SECOES[this.secao];
    const busca = this.busca.trim().toLowerCase();
    return Cadastros.lista(this.secao).filter(r => {
      for (const [campo] of s.filtros) {
        const sel = this.filtros[campo];
        if (!sel) continue;
        const val = campo === s.statusK ? (r[campo] ? "Ativo" : "Inativo") : (r[campo] || "");
        if (String(val) !== sel) return false;
      }
      if (!busca) return true;
      return Object.values(r).some(v => String(v).toLowerCase().includes(busca));
    }).sort(this.secao === "equipes"
      ? (a, b) => ordemNatural(a.equipe, b.equipe)
      // inspetores: primeiro pela função, depois pelo nome
      : (a, b) => (postoFuncao(a.funcao) - postoFuncao(b.funcao)) || ordemNatural(a.inspetor, b.inspetor));
  },

  render() {
    if (!this.el) return;
    const s = SECOES[this.secao];
    this.el.querySelectorAll(".aj-abas button").forEach(b =>
      b.classList.toggle("on", b.dataset.sec === this.secao));
    this.el.querySelector(".aj-tit").textContent = s.titulo;
    this.el.querySelector(".aj-desc").textContent = s.desc;
    this.el.querySelector(".aj-novo span").textContent = s.novo;

    this.renderEstado();
    this.renderFiltros();

    const linhas = this.linhasVisiveis();
    const host = this.el.querySelector(".aj-tabela");
    const podeEditar = Banco.podeEditar();

    tabela(host, [
      { titulo: "Ações", valor: r => this.menuAcoes(r, podeEditar) },
      ...s.colunas.map(c => ({
        titulo: c.t, num: c.num,
        valor: r => c.etiqueta
          ? Object.assign(document.createElement("span"), { className: "etiqueta", textContent: c.v(r) })
          : c.v(r),
        classe: () => c.forte ? "forte" : ""
      })),
      { titulo: "Situação", valor: r => {
          const campo = s.campos.find(c => c.k === s.statusK);
          const e = document.createElement("span");
          const ativo = r[s.statusK];
          e.className = "situacao " + (ativo ? "sim" : "nao");
          e.textContent = ativo ? campo.rotSim : campo.rotNao;
          return e;
        } }
    ], linhas);

    const total = Cadastros.lista(this.secao).length;
    const cont = this.el.querySelector(".aj-cont");
    if (cont) cont.textContent = linhas.length === total
      ? `${total} ${total === 1 ? "registro" : "registros"}`
      : `${linhas.length} de ${total}`;
  },

  /* ---------- sincronizar as inspeções do app ----------
     As feitas pelo app moram no banco; o histórico mora no data.js.
     Este botão junta as duas coisas na memória. Só aparece para quem
     entrou: a decisão de 26/08/2026 foi que inspeção não é pública. */
  botaoSincronizar() {
    const r = Sincronia.resumo();
    const quando = r ? ` (${r.doApp} do app)` : "";
    return `<button class="aj-sincronizar">⟳ Sincronizar${quando}</button>`;
  },

  ligarSincronizar() {
    const b = this.estado.querySelector(".aj-sincronizar");
    if (!b) return;
    b.onclick = async () => {
      b.disabled = true;
      b.textContent = "⟳ Buscando…";
      const ok = await Sincronia.sincronizar();
      this.render();
      render();                       // os visuais do painel recalculam
      const novo = this.estado.querySelector(".aj-sincronizar");
      if (!ok && novo) novo.title = Sincronia.erro || "";
      if (ok) {
        const r = Sincronia.resumo();
        this.avisar(r.inspecoes
          ? `${r.inspecoes} ${r.inspecoes === 1 ? "inspeção" : "inspeções"} no banco, `
            + `sendo ${r.doApp} ${r.doApp === 1 ? "feita" : "feitas"} pelo app, `
            + `com ${r.nc} ${r.nc === 1 ? "não conformidade" : "não conformidades"}.`
            + (r.fonteUnica ? "" : " O histórico ainda vem do arquivo — falta rodar a migração 09.")
          : "Nenhuma inspeção no banco ainda. Os números seguem só com o histórico do arquivo.");
      } else {
        this.avisar("Não deu para sincronizar: " + (Sincronia.erro || "erro desconhecido"), true);
      }
    };
  },

  /* Sair tem de esquecer as inspeções baixadas: elas não são públicas,
     e deixá-las na tela depois do logout mostraria a quem não pode ver. */
  /* Sair tranca o painel inteiro, não só a edição: desde 26/08/2026
     nada é visível sem login. */
  sair() { Porta.trancar(); },

  avisar(texto, ruim) {
    const velho = this.el.querySelector(".aj-avisosinc");
    if (velho) velho.remove();
    const d = document.createElement("div");
    d.className = "aj-avisosinc" + (ruim ? " ruim" : "");
    d.textContent = texto;
    this.estado.insertAdjacentElement("afterend", d);
    if (!ruim) setTimeout(() => d.remove(), 6000);
  },

  renderEstado() {
    if (Banco.podeEditar()) {
      this.estado.className = "aj-estado ok";
      this.estado.innerHTML = `<span>✓ <b>${Banco.usuario}</b> — administrador.
        As alterações valem para todos.</span>
        ${this.botaoSincronizar()}
        <button class="aj-sair">Sair</button>`;
      this.ligarSincronizar();
      this.estado.querySelector(".aj-sair").onclick = () => this.sair();
    } else if (Banco.ligado && Banco.autenticado()) {
      this.estado.className = "aj-estado aviso";
      this.estado.innerHTML = `<span><b>${Banco.usuario}</b> entrou, mas não é administrador do painel —
        só é possível consultar. Peça para incluírem seu e-mail na lista de administradores.</span>
        ${this.botaoSincronizar()}
        <button class="aj-sair">Sair</button>`;
      this.ligarSincronizar();
      this.estado.querySelector(".aj-sair").onclick = () => this.sair();
    } else if (Banco.ligado) {
      this.estado.className = "aj-estado aviso";
      this.estado.innerHTML = `<span>Você está vendo os cadastros do banco. Para alterar,
        entre com uma conta de administrador.</span>
        <button class="aj-entrar">Entrar para editar</button>`;
      this.estado.querySelector(".aj-entrar").onclick = () => this.abrirLogin();
    } else {
      this.estado.className = "aj-estado erro";
      this.estado.innerHTML = `<span>Sem conexão com o banco — mostrando os cadastros embutidos no painel.
        ${Banco.erro ? `<i>${Banco.erro}</i>` : ""} As alterações valem só nesta sessão.</span>
        <button class="aj-tentar">Tentar de novo</button>`;
      this.estado.querySelector(".aj-tentar").onclick = async () => {
        this.estado.innerHTML = "<span>Conectando…</span>";
        await Cadastros.carregar(); this.render(); render();
      };
    }
  },

  renderFiltros() {
    const s = SECOES[this.secao];
    const host = this.el.querySelector(".aj-filtros");
    host.innerHTML = "";
    s.filtros.forEach(([campo, rot]) => {
      const vals = campo === s.statusK ? ["Ativo", "Inativo"]
        : [...new Set(Cadastros.lista(this.secao).map(r => r[campo]).filter(Boolean))].sort();
      const d = document.createElement("label");
      d.className = "aj-filtro";
      d.innerHTML = `<span>${rot}</span><select><option value="">Todos</option>
        ${vals.map(v => `<option${this.filtros[campo] === String(v) ? " selected" : ""}>${v}</option>`).join("")}</select>`;
      d.querySelector("select").onchange = e => {
        this.filtros[campo] = e.target.value; this.render();
      };
      host.appendChild(d);
    });

    const busca = document.createElement("label");
    busca.className = "aj-filtro aj-busca";
    busca.innerHTML = `<span>Buscar</span><input type="search" placeholder="nome, supervisor…" value="${this.busca}">`;
    busca.querySelector("input").oninput = e => {
      this.busca = e.target.value;
      const host2 = this.el.querySelector(".aj-tabela");
      const foco = e.target;
      this.render();
      const novo = this.el.querySelector(".aj-busca input");
      if (novo) { novo.focus(); novo.setSelectionRange(foco.value.length, foco.value.length); }
    };
    host.appendChild(busca);

    const cont = document.createElement("span");
    cont.className = "aj-cont";
    host.appendChild(cont);
  },

  menuAcoes(registro, podeEditar) {
    const d = document.createElement("div");
    d.className = "aj-acoes";
    /* Acesso ao app de inspeções é assunto de inspetor, não de equipe */
    const temAcesso = !!registro.user_id;
    const acesso = this.secao !== "inspetores" ? "" : (temAcesso
      ? `<button data-a="redefinir">🔑 Redefinir senha</button>
         <button data-a="tirar-acesso" class="perigo">⊘ Remover acesso</button>`
      : `<button data-a="criar-acesso">🔑 Criar acesso</button>`);
    d.innerHTML = `<button class="aj-pontos" title="Ações">⋮</button>
      <div class="aj-menu">
        <button data-a="editar">✎ Editar</button>
        ${acesso}
        <button data-a="excluir" class="perigo">🗑 Excluir</button>
      </div>`;
    d.querySelector(".aj-pontos").onclick = e => {
      e.stopPropagation();
      const aberto = d.classList.contains("aberto");
      document.querySelectorAll(".aj-acoes.aberto").forEach(x => x.classList.remove("aberto"));
      if (aberto) return;
      /* Nas últimas linhas da tabela o menu não cabe para baixo e ficava
         cortado pelo rodapé. Mede o espaço livre e decide o lado. */
      const r = d.querySelector(".aj-pontos").getBoundingClientRect();
      /* mede o menu de verdade: com os itens de acesso ele fica bem
         mais alto do que os 84px de quando eram só duas opções */
      const menu = d.querySelector(".aj-menu");
      const ALTURA = menu.scrollHeight || 84, LARGURA = 190;
      d.classList.toggle("cima", window.innerHeight - r.bottom < ALTURA);
      d.classList.toggle("direita", window.innerWidth - r.left < LARGURA);
      d.classList.add("aberto");
    };
    d.querySelectorAll(".aj-menu button").forEach(b => {
      if (!podeEditar) { b.disabled = true; b.title = Banco.autenticado() ? "Sua conta não é administradora do painel" : "Entre com uma conta de administrador para editar"; }
      b.onclick = e => {
        e.stopPropagation();
        d.classList.remove("aberto");
        const a = b.dataset.a;
        if (a === "editar") this.abrirDialogo(registro);
        else if (a === "criar-acesso") this.criarAcesso(registro);
        else if (a === "redefinir") this.redefinirSenha(registro);
        else if (a === "tirar-acesso") this.tirarAcesso(registro);
        else this.confirmarExclusao(registro);
      };
    });
    return d;
  },


  /* ---------- acesso do inspetor ao app de inspeções ----------
     O painel nunca vê a chave de serviço: quem cria a conta é a função
     no servidor. Aqui é só a tela.

     A senha é escolhida pelo administrador, que vai combiná-la com o
     inspetor. Ela não fica guardada em lugar nenhum: vai para a função,
     que manda para o Supabase, e lá só o hash é gravado. */
  criarAcesso(registro) {
    const sugestao = semAcentoAj(registro.inspetor).replace(/[^a-z0-9]+/g, ".") + "@teccel.com.br";
    this.dialogo(`Criar acesso para ${registro.inspetor}`,
      `<p class="aj-dtexto">Cria o login do app de inspeções e já liga a este
         cadastro. Combine a senha com ${registro.inspetor} — ela não fica
         guardada e depois só dá para trocar, não para consultar.</p>
       <label class="aj-campo"><span>E-mail do inspetor</span>
         <input name="email" type="email" required value="${sugestao}"
                autocapitalize="none" spellcheck="false"></label>
       ${this.camposSenha()}`,
      "Criar acesso",
      async form => {
        const email = form.email.value.trim();
        if (!email) throw new Error("Informe o e-mail.");
        const senha = this.senhaConferida(form);
        await Banco.acessoInspetor("criar", registro.inspetor, email, senha);
        await Cadastros.carregar();
        Cadastros.aplicarNoModelo();
        this.render();
      });
  },

  redefinirSenha(registro) {
    this.dialogo(`Redefinir a senha de ${registro.inspetor}`,
      `<p class="aj-dtexto">A senha anterior deixa de valer na hora, então
         ${registro.inspetor} vai precisar da nova para entrar.</p>
       ${this.camposSenha()}`,
      "Redefinir",
      async form => {
        const senha = this.senhaConferida(form);
        await Banco.acessoInspetor("redefinir", registro.inspetor, null, senha);
      });
  },

  tirarAcesso(registro) {
    this.dialogo(`Remover o acesso de ${registro.inspetor}?`,
      `<p class="aj-dtexto">Ele deixa de conseguir criar inspeções pelo app.
         As inspeções que já enviou continuam onde estão.<br><br>
         A conta em si não é apagada — só deixa de ser deste inspetor. Apagar
         conta é feito no painel do Supabase, de propósito.</p>`,
      "Remover acesso",
      async () => {
        await Banco.acessoInspetor("remover", registro.inspetor);
        await Cadastros.carregar();
        Cadastros.aplicarNoModelo();
        this.render();
      }, true);
  },

  /* Senha digitada duas vezes: é o admin quem digita, e quem vai usar é
     outra pessoa — um erro de digitação só apareceria quando o inspetor
     tentasse entrar, longe daqui e sem saber o que houve. */
  camposSenha() {
    return `<label class="aj-campo"><span>Senha</span>
        <input name="senha" type="password" required minlength="6"
               autocomplete="new-password" placeholder="ao menos 6 caracteres"></label>
      <label class="aj-campo"><span>Repita a senha</span>
        <input name="senha2" type="password" required minlength="6"
               autocomplete="new-password"></label>
      <label class="aj-vermostrar"><input type="checkbox" name="ver"> Mostrar a senha</label>`;
  },

  senhaConferida(form) {
    const a = form.senha.value, b = form.senha2.value;
    if (!a) throw new Error("Informe a senha.");
    if (a.length < 6) throw new Error("A senha precisa de pelo menos 6 caracteres.");
    if (a !== b) throw new Error("As duas senhas não são iguais.");
    return a;
  },

  /* ---------- diálogo de criação/edição ---------- */
  abrirDialogo(registro) {
    const s = SECOES[this.secao];
    if (!Banco.podeEditar() && Banco.ligado && !Banco.autenticado()) return this.abrirLogin();
    const novo = !registro;
    const dados = Object.assign({}, registro || {});
    s.campos.forEach(c => { if (dados[c.k] === undefined) dados[c.k] = c.padrao !== undefined ? c.padrao : ""; });

    const corpo = s.campos.map(c => {
      if (c.tipo === "select") return `<label class="aj-campo"><span>${c.rot}</span>
        <select name="${c.k}">${c.opcoes.map(([v, t]) =>
          `<option value="${v}"${dados[c.k] === v ? " selected" : ""}>${t}</option>`).join("")}</select></label>`;
      if (c.tipo === "select-livre") {
        const ops = c.origem();
        return `<label class="aj-campo"><span>${c.rot}</span>
          <input name="${c.k}" list="lista-${c.k}" value="${dados[c.k] || ""}" autocomplete="off">
          <datalist id="lista-${c.k}">${ops.map(o => `<option value="${o}">`).join("")}</datalist></label>`;
      }
      if (c.tipo === "numero") return `<label class="aj-campo"><span>${c.rot}</span>
        <input type="number" name="${c.k}" value="${dados[c.k]}" min="0" step="1"></label>`;
      if (c.tipo === "booleano") return `<label class="aj-campo"><span>${c.rot}</span>
        <select name="${c.k}"><option value="1"${dados[c.k] ? " selected" : ""}>${c.rotSim}</option>
        <option value="0"${!dados[c.k] ? " selected" : ""}>${c.rotNao}</option></select></label>`;
      return `<label class="aj-campo"><span>${c.rot}</span>
        <input name="${c.k}" value="${dados[c.k] || ""}" ${c.obrigatorio ? "required" : ""} autocomplete="off"></label>`;
    }).join("");

    this.dialogo(novo ? s.novo : `Editar ${dados[s.chave]}`, corpo,
      novo ? "Criar" : "Salvar", async form => {
        const reg = Object.assign({}, registro);
        s.campos.forEach(c => {
          const v = form.elements[c.k].value;
          reg[c.k] = c.tipo === "numero" ? Number(v) || 0
                   : c.tipo === "booleano" ? v === "1"
                   : v.trim();
        });
        if (!reg[s.chave]) throw new Error("O nome é obrigatório.");
        const repetido = Cadastros.lista(this.secao).some(r =>
          r.id !== reg.id && String(r[s.chave]).toLowerCase() === reg[s.chave].toLowerCase());
        if (repetido) throw new Error(`Já existe um cadastro com o nome ${reg[s.chave]}.`);
        await Cadastros.salvar(this.secao, reg);
        this.render(); render();
      });
  },

  confirmarExclusao(registro) {
    const s = SECOES[this.secao];
    const nome = registro[s.chave];
    const usos = FATO.filter(f => this.secao === "equipes"
      ? f.equipeBruta === nome : f.inspetorBruto === nome).length;
    this.dialogo(`Excluir ${nome}?`,
      `<p class="aj-aviso">Esta ação não pode ser desfeita.</p>
       ${usos ? `<p class="aj-aviso forte">Há <b>${usos}</b> inspeç${usos === 1 ? "ão" : "ões"} registrada${usos === 1 ? "" : "s"}
         com este nome. Elas continuam no painel, mas passam a aparecer sem
         ${this.secao === "equipes" ? "equipe" : "inspetor"}. Se a intenção é tirar do ranking sem
         perder o histórico, edite e marque como inativ${this.secao === "equipes" ? "a" : "o"}.</p>` : ""}`,
      "Excluir", async () => {
        await Cadastros.excluir(this.secao, registro.id);
        this.render(); render();
      }, true);
  },

  abrirLogin() {
    this.dialogo("Entrar para editar",
      `<p class="aj-aviso">Use a conta cadastrada no Supabase. Sem entrar, o painel continua
        visível para todos, mas ninguém consegue alterar os cadastros.</p>
       <label class="aj-campo"><span>E-mail</span><input name="email" type="email" required autocomplete="username"></label>
       <label class="aj-campo"><span>Senha</span><input name="senha" type="password" required autocomplete="current-password"></label>`,
      "Entrar", async form => {
        await Banco.entrar(form.elements.email.value.trim(), form.elements.senha.value);
        await Cadastros.carregar();
        this.render(); render();
      });
  },

  dialogo(titulo, corpoHTML, rotuloOk, aoConfirmar, perigo) {
    const fundo = document.createElement("div");
    fundo.className = "aj-fundo";
    fundo.innerHTML = `<form class="aj-dialogo">
      <div class="aj-dcab"><h3>${titulo}</h3><button type="button" class="aj-x" aria-label="Fechar">✕</button></div>
      <div class="aj-dcorpo">${corpoHTML}</div>
      <div class="aj-derro"></div>
      <div class="aj-drod">
        <button type="button" class="aj-cancelar">Cancelar</button>
        <button type="submit" class="aj-ok${perigo ? " perigo" : ""}">${rotuloOk}</button>
      </div></form>`;
    canvas.appendChild(fundo);
    const form = fundo.querySelector("form");

    /* Fechar sem querer apaga o que foi digitado. Clique fora NUNCA fecha:
       só o X, o Cancelar ou o Salvar. O Esc fecha enquanto nada tiver sido
       alterado; havendo mudança, o diálogo chama atenção e fica aberto. */
    const inicial = new FormData(form);
    const alterado = () => {
      const agora = new FormData(form);
      for (const [k, v] of agora) if (String(inicial.get(k)) !== String(v)) return true;
      return false;
    };
    const insistir = () => {
      fundo.querySelector(".aj-dialogo").classList.remove("chama");
      void fundo.offsetWidth;                       // reinicia a animação
      fundo.querySelector(".aj-dialogo").classList.add("chama");
      const erro = fundo.querySelector(".aj-derro");
      erro.textContent = "Há alterações não salvas. Use Cancelar para descartar.";
    };

    const aoTeclar = e => { if (e.key === "Escape") (alterado() ? insistir() : fechar()); };
    const fechar = () => {
      document.removeEventListener("keydown", aoTeclar);
      fundo.remove();
    };
    fundo.querySelector(".aj-x").onclick = fechar;
    fundo.querySelector(".aj-cancelar").onclick = fechar;
    fundo.onclick = e => { if (e.target === fundo && alterado()) insistir(); };
    document.addEventListener("keydown", aoTeclar);

    /* "Mostrar a senha" existe porque o admin está digitando para outra
       pessoa e não tem como conferir de outro jeito. */
    const ver = fundo.querySelector("input[name=ver]");
    if (ver) ver.onchange = () => fundo.querySelectorAll("input[name^=senha]")
      .forEach(i => i.type = ver.checked ? "text" : "password");

    const primeiro = fundo.querySelector("input, select");
    if (primeiro) primeiro.focus();

    fundo.querySelector("form").onsubmit = async e => {
      e.preventDefault();
      const ok = fundo.querySelector(".aj-ok");
      const erro = fundo.querySelector(".aj-derro");
      ok.disabled = true; erro.textContent = "";
      try { await aoConfirmar(e.target); fechar(); }
      catch (x) { erro.textContent = x.message; ok.disabled = false; }
    };
  }
};
document.addEventListener("click", () =>
  document.querySelectorAll(".aj-acoes.aberto").forEach(d => d.classList.remove("aberto")));
