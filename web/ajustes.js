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
  },
  /* Inspeções — as feitas, para consultar e baixar.

     Sai do modelo já montado (FATO), não de uma consulta nova: é o mesmo
     conjunto que alimenta os números do painel. Assim a planilha baixada
     bate com a tela — se saísse de outra consulta, um dia divergiria e
     ninguém saberia qual das duas está certa. */
  inspecoes: {
    titulo: "Inspeções", desc: "Uma linha por não conformidade encontrada. "
      + "Use os filtros e baixe em PDF o que ficar na tela.",
    somenteLeitura: true, chave: "id", baixar: "⭳ Baixar PDF",
    /* O terceiro item da tupla é a ordem das opções, quando alfabética não
       serve: mês tem de sair jan→dez, e gravidade da pior para a mais leve. */
    filtros: [["ano", "Ano"], ["mesNome", "Mês", (a, b) => ORDEM_MES.indexOf(a) - ORDEM_MES.indexOf(b)],
              ["polo", "Polo"], ["equipe", "Equipe"], ["inspetor", "Inspetor"],
              ["gravidade", "Gravidade", (a, b) => postoGravidade(a) - postoGravidade(b)],
              ["tipo", "Departamento"]],
    /* UMA LINHA POR NÃO CONFORMIDADE, não por inspeção (27/08/2026).

       A inspeção com três desvios ocupa três linhas, repetindo data, equipe,
       inspetor e polo. Repetição é justamente o que torna a planilha
       utilizável: dá para ordenar por gravidade, filtrar por polo e contar
       desvio sem abrir nada. Escondê-los atrás de um clique ficava bonito na
       tela e inútil no papel.

       Inspeção sem desvio aparece uma vez, com "Sem desvio" — some da lista
       seria pior: pareceria que ninguém inspecionou aquela equipe. */
    colunas: [
      { t: "Data", v: r => r.dataStr },
      { t: "Equipe", v: r => r.equipe || r.equipeBruta || "—", forte: true },
      { t: "Inspetor", v: r => r.inspetor || r.inspetorBruto || "—" },
      { t: "Polo", v: r => r.polo || "—", etiqueta: true },
      { t: "Gravidade", v: r => r.gravidade, etiqueta: true },
      { t: "Não conformidade", v: r => r.descricao }
    ]
  },
  /* Rascunhos — só leitura, e de outra fonte: vem do banco na hora, não
     do cadastro. Fica aqui, e não numa página do painel, porque é
     manutenção do sistema e não indicador: rascunho NÃO conta como
     inspeção feita em lugar nenhum. Quem apaga é o inspetor, pelo app. */
  rascunhos: {
    titulo: "Rascunhos", desc: "Inspeções começadas no app e ainda não enviadas. "
      + "Não entram em nenhum número do painel.",
    somenteLeitura: true, chave: "id",
    filtros: [["inspetor", "Inspetor"], ["departamento", "Departamento"]],
    colunas: [
      { t: "Equipe", v: r => r.equipe || "—", forte: true },
      { t: "Inspetor", v: r => r.inspetor || "—" },
      { t: "Departamento", v: r => NOME_DEPARTAMENTO[r.departamento] || r.departamento || "—",
        etiqueta: true },
      { t: "Data", v: r => r.data ? r.data.slice(8, 10) + "/" + r.data.slice(5, 7)
                                    + "/" + r.data.slice(0, 4) : "—" },
      { t: "Respostas", v: r => fmtN(contaRespostas(r)), num: true },
      { t: "Começada em", v: r => r.criada_em
          ? new Date(r.criada_em).toLocaleString("pt-BR",
              { day: "2-digit", month: "2-digit", year: "2-digit",
                hour: "2-digit", minute: "2-digit" })
          : "—" }
    ]
  }
};
/* As não conformidades de uma inspeção: [id, pergunta, categoria, gravidade, pontos] */
const ncDe = r => NC_BY_ID[r.id] || [];

/* A tabela de fato desdobrada: uma linha por não conformidade, e uma linha
   para a inspeção que não teve nenhuma.

   Feito sob demanda, não guardado: FATO muda a cada sincronização e a cada
   edição de cadastro, e uma cópia velha aqui mostraria desvio de equipe que
   já foi renomeada. São ~120 inspeções — o custo é irrelevante. */
function inspecoesPorNC() {
  const linhas = [];
  FATO.forEach(r => {
    /* "ago" em vez de "8": o filtro de mês é lido por gente. O ano fica de
       fora do rótulo porque já existe filtro de ano — juntar os dois faria
       12 opções virarem 24 sem necessidade. */
    const base = Object.assign({}, r, { mesNome: MESES_NOME[+r.mes] });
    const nc = ncDe(r);
    if (!nc.length) {
      linhas.push(Object.assign({}, base, {
        gravidade: "Sem desvio", descricao: "—", pontosNC: 0, temNC: false
      }));
      return;
    }
    nc.forEach(x => linhas.push(Object.assign({}, base, {
      gravidade: x[3] || "Sem classificação",
      descricao: x[1] || "—",
      categoria: x[2] || "",
      pontosNC: x[4] || 0,
      temNC: true
    })));
  });
  return linhas;
}
const ORDEM_MES = MESES_NOME.slice(1);   // jan…dez, sem o vazio da posição 0

/* Da mais grave para a mais leve — é a ordem em que se lê um relatório de
   segurança. "Sem desvio" fica por último, e não no meio do alfabeto. */
const ORDEM_GRAVIDADE = ["Gravíssimo", "Grave", "Leve", "Sem classificação", "Sem desvio"];
const postoGravidade = g => {
  const i = ORDEM_GRAVIDADE.findIndex(o =>
    o.toLowerCase() === String(g || "").trim().toLowerCase());
  return i < 0 ? ORDEM_GRAVIDADE.length : i;
};

/* O count embutido do PostgREST chega como [{count: n}] */
const contaRespostas = r => (r.sesmt_respostas && r.sesmt_respostas[0]
  ? r.sesmt_respostas[0].count : 0);
const NOME_DEPARTAMENTO = { DCMD_CM: "DCMD C&M", DCMD_LV: "DCMD LINHA VIVA",
  DCMD_PODA: "DCMD PODA", DECP: "DECP", DEOP: "DEOP" };
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
      b.onclick = () => {
        this.secao = k; this.busca = ""; this.filtros = {};
        this.render();
        /* Rascunho muda o tempo todo, e é pouca linha: busca a cada
           abertura da aba, em vez de guardar e mostrar coisa velha. */
        if (k === "rascunhos") this.carregarRascunhos();
      };
      corpo.querySelector(".aj-abas").appendChild(b);
    });
    corpo.querySelector(".aj-novo").onclick = () => this.abrirDialogo(null);
    return pg;
  },

  /* Os rascunhos não moram no Cadastros: são buscados quando a aba abre. */
  rascunhos: [],
  rascunhosEm: null,

  buscandoRascunhos: false,

  async carregarRascunhos() {
    /* A trava não é por desempenho: carregarRascunhos() termina em render(),
       e o render() pede a busca quando a aba está aberta e vazia. Sem ela,
       um erro de rede (que deixa rascunhosEm nulo) viraria laço infinito. */
    if (this.buscandoRascunhos) return;
    this.buscandoRascunhos = true;
    try {
      this.rascunhos = await Banco.baixarRascunhos();
      this.rascunhosEm = new Date();
    } catch (e) {
      this.rascunhos = [];
      this.avisar("Não deu para buscar os rascunhos: " + e.message, true);
    } finally {
      this.buscandoRascunhos = false;
    }
    this.render();
  },

  fonte(secao) {
    if (secao === "rascunhos") return this.rascunhos;
    if (secao === "inspecoes") return inspecoesPorNC();
    return Cadastros.lista(secao);
  },


  /* Relatório em PDF do que está na tela — com os filtros aplicados, não a
     base inteira. Quem filtrou por um polo quer aquele polo.

     Não há biblioteca de PDF aqui, e não vale trazer uma: o painel é um
     arquivo só, sem dependência externa, e escrever PDF à mão quebra em
     acento. Manda IMPRIMIR — o próprio navegador oferece "Salvar como PDF"
     no destino, com texto selecionável e acentuação certa.

     Num iframe escondido, não em aba nova: aba nova costuma ser bloqueada
     como pop-up, e o usuário acharia que o botão não faz nada. */
  baixarPDF() {
    const s = SECOES[this.secao];
    const linhas = this.linhasVisiveis();
    if (!linhas.length) return this.avisar("Não há nada para baixar com esses filtros.", true);

    /* Quais filtros valiam. Sem isso o relatório vira um número solto, e
       ninguém lembra depois se aquilo era o ano todo ou um polo só. */
    const usados = Object.entries(this.filtros).filter(([, v]) => v && v.length)
      .map(([k, v]) => `${(s.filtros.find(f => f[0] === k) || [k, k])[1]}: ${v.join(", ")}`);
    if (this.busca.trim()) usados.push(`busca: "${this.busca.trim()}"`);

    /* Cada linha é uma N.C — menos as "Sem desvio". E como a inspeção se
       repete a cada desvio, contar inspeção é contar id distinto. */
    const totalNC = linhas.filter(r => r.temNC).length;
    const inspecoes = new Set(linhas.map(r => r.id)).size;
    const semNC = linhas.filter(r => !r.temNC).length;
    const pontos = linhas.reduce((a, r) => a + (r.pontosNC || 0), 0);
    const agora = new Date();

    /* No papel as não conformidades vão ABAIXO da inspeção, na mesma folha —
       é o que dá sentido ao relatório: a visita e o que ela encontrou. */
    /* Tabela plana, igual à da tela: uma linha por não conformidade. A
       gravidade ganha cor no papel — é o que se procura primeiro. */
    const corpo = linhas.map(r => {
      const classe = semAcentoAj(r.gravidade || "").replace(/[^a-z]/g, "");
      return `<tr class="${r.temNC ? "insp" : "insp limpa"}">` + s.colunas.map(c =>
        `<td${c.t === "Gravidade" ? ` class="grav ${classe}"` : ""}>${esc(c.v(r))}</td>`
      ).join("") + "</tr>";
    }).join("");

    const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
      <title>Inspecoes SESMT ${agora.toISOString().slice(0, 10)}</title>
      <style>
        @page { size: A4; margin: 14mm 12mm }
        body { font: 11px "Open Sans", Arial, sans-serif; color: #241f1a; margin: 0 }
        h1 { font-size: 16px; margin: 0 0 2px }
        .sub { color: #7b7168; font-size: 10px; margin: 0 0 10px }
        .resumo { margin: 0 0 12px; font-size: 11px }
        .resumo b { font-size: 13px }
        table { border-collapse: collapse; width: 100% }
        th { text-align: left; font-size: 9.5px; text-transform: uppercase;
             letter-spacing: .05em; color: #7b7168;
             border-bottom: 1.5px solid #241f1a; padding: 5px 6px }
        td { padding: 5px 6px; vertical-align: top }
        tr.insp td { border-bottom: 1px solid #e6e0d8; line-height: 1.4 }
        tr.limpa td { color: #a49a90 }         /* inspeção sem desvio: discreta */
        td.grav { font-weight: 700; white-space: nowrap }
        td.gravissimo { color: #b3261e }
        td.grave { color: #8a4b00 }
        td.leve { color: #31536e }
        td.semdesvio, td.semclassificacao { color: #a49a90; font-weight: 400 }
        tr { break-inside: avoid }             /* não parte a linha ao meio */
        thead { display: table-header-group }  /* cabeçalho em toda página */
        .rodape { margin-top: 14px; font-size: 9px; color: #a49a90 }
      </style></head><body>
      <h1>Inspeções SESMT · Regional Oeste</h1>
      <p class="sub">${usados.length ? esc(usados.join(" · ")) : "Sem filtros"}
        — gerado em ${agora.toLocaleString("pt-BR")}</p>
      <p class="resumo"><b>${inspecoes}</b> ${
        inspecoes === 1 ? "inspeção" : "inspeções"} · <b>${totalNC}</b> ${
        totalNC === 1 ? "não conformidade" : "não conformidades"} · <b>${semNC}</b>
        sem nenhum desvio · <b>${pontos}</b> ${
        Math.abs(pontos) === 1 ? "ponto" : "pontos"} na Jornada Segura</p>
      <table><thead><tr>${s.colunas.map(c => `<th>${esc(c.t)}</th>`).join("")}</tr></thead>
        <tbody>${corpo}</tbody></table>
      <p class="rodape">Painel de Inspeções SESMT — os mesmos números da tela.</p>
      </body></html>`;

    const q = document.createElement("iframe");
    q.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
    q.srcdoc = html;
    q.onload = () => {
      q.contentWindow.focus();
      q.contentWindow.print();
      /* Remover antes de o diálogo fechar cancelaria a impressão. */
      setTimeout(() => q.remove(), 60000);
    };
    document.body.appendChild(q);

    this.avisar(`${inspecoes} ${inspecoes === 1 ? "inspeção" : "inspeções"} e `
      + `${totalNC} ${totalNC === 1 ? "não conformidade" : "não conformidades"} no relatório. `
      + `Na janela de impressão, escolha "Salvar como PDF" no destino.`);
  },

  /* Administrador apaga rascunho abandonado — o inspetor apaga o dele
     pelo app, mas rascunho de quem saiu da empresa ou perdeu o acesso
     ficaria para sempre. As respostas vão junto, por cascata no banco. */
  async excluirRascunho(r) {
    const n = contaRespostas(r);
    if (!confirm(`Excluir o rascunho de ${r.equipe || "—"}, de ${r.inspetor || "—"}?\n\n`
        + `${n} ${n === 1 ? "resposta será perdida" : "respostas serão perdidas"}. `
        + "Não dá para desfazer.")) return;
    try {
      await Banco.excluir("sesmt_inspecoes", r.id);
      this.avisar(`Rascunho de ${r.equipe || "—"} excluído.`);
      await this.carregarRascunhos();
    } catch (e) {
      this.avisar("Não deu para excluir: " + e.message, true);
    }
  },

  linhasVisiveis() {
    const s = SECOES[this.secao];
    const busca = this.busca.trim().toLowerCase();
    return this.fonte(this.secao).filter(r => {
      for (const [campo] of s.filtros) {
        // lista vazia (ou ausente) = todos; várias marcadas = qualquer uma serve
        const sel = this.filtros[campo];
        if (!sel || !sel.length) continue;
        const val = campo === s.statusK ? (r[campo] ? "Ativo" : "Inativo") : (r[campo] || "");
        if (!sel.includes(String(val))) return false;
      }
      if (!busca) return true;
      return Object.values(r).some(v => String(v).toLowerCase().includes(busca));
    }).sort(this.secao === "inspecoes"
      /* A mais recente primeiro; dentro do mesmo dia, a equipe; dentro da
         mesma inspeção, o desvio mais grave no topo. */
      ? (a, b) => (b.serial + b.dataStr).localeCompare(a.serial + a.dataStr)
                  || ordemNatural(a.equipe, b.equipe)
                  || (postoGravidade(a.gravidade) - postoGravidade(b.gravidade))
      : this.secao === "rascunhos"
      // já vem do banco em ordem de criação, do mais novo para o mais velho
      ? () => 0
      : this.secao === "equipes"
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
    /* O mesmo botão do canto serve a três propósitos: criar, baixar, ou nada.
       Rascunho não se cria pelo painel (nasce no app) e inspeção também não —
       nela o botão vira o download. */
    const btNovo = this.el.querySelector(".aj-novo");
    btNovo.style.display = s.somenteLeitura && !s.baixar ? "none" : "";
    btNovo.querySelector("span").textContent = s.baixar || s.novo || "";
    btNovo.firstChild.textContent = s.baixar ? "" : "+ ";
    btNovo.onclick = s.baixar ? () => this.baixarPDF() : () => this.abrirDialogo(null);

    this.renderEstado();
    this.renderFiltros();

    const linhas = this.linhasVisiveis();
    const host = this.el.querySelector(".aj-tabela");
    const podeEditar = Banco.podeEditar();

    if (s.somenteLeitura) {
      /* Aba aberta e nunca buscada — acontece ao montar o painel já nos
         Ajustes, sem passar pelo clique na aba. Busca uma vez e volta. */
      if (this.secao === "rascunhos" && !this.rascunhosEm
          && !this.buscandoRascunhos && Banco.autenticado()) {
        this.carregarRascunhos();
      }
      /* Uma lixeira por linha, e não o menu ⋮: aqui só há uma ação.
         Aparece para administrador — a política do banco recusaria de
         qualquer jeito, mas botão que só serve para dar erro é armadilha.

         SÓ em rascunhos. A regra valia para qualquer seção só-leitura e a
         lixeira apareceu na aba Inspeções, onde um clique chamaria
         excluirRascunho() sobre uma inspeção de verdade. Inspeção enviada
         não se apaga pelo painel. */
      const acao = podeEditar && this.secao === "rascunhos" ? [{ titulo: "Ações", valor: r => {
        const b = document.createElement("button");
        b.className = "aj-lixeira";
        b.textContent = "🗑";
        b.title = `Excluir o rascunho de ${r.equipe || "—"}`;
        b.onclick = () => this.excluirRascunho(r);
        return b;
      } }] : [];
      tabela(host, acao.concat(s.colunas.map(c => ({
        titulo: c.t, num: c.num,
        valor: r => c.etiqueta
          ? Object.assign(document.createElement("span"), {
              /* A gravidade ganha cor pela própria classe: é o que se procura
                 primeiro numa lista de desvios, e etiqueta cinza obrigava a
                 ler palavra por palavra. */
              className: "etiqueta" + (c.t === "Gravidade"
                ? " gr-" + semAcentoAj(c.v(r)).replace(/[^a-z]/g, "") : ""),
              textContent: c.v(r) })
          : c.v(r),
        classe: () => c.forte ? "forte" : ""
      }))), linhas);
      const cont = this.el.querySelector(".aj-cont");
      if (cont) {
        const total = this.fonte(this.secao).length;
        // na aba Inspeções cada linha é um desvio, não uma inspeção
        const nome = this.secao === "inspecoes"
          ? (linhas.length === 1 ? "linha" : "linhas")
          : (linhas.length === 1 ? "rascunho" : "rascunhos");
        cont.textContent = linhas.length === total
          ? `${linhas.length} ${nome}`
          : `${linhas.length} de ${total} ${nome}`;
      }
      return;
    }

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
      /* Rascunho vem de outra consulta, e o ⟳ tem de trazer os dois: estando
         na aba Rascunhos, sincronizar sem isto redesenhava a mesma lista de
         antes e parecia que o botão não fazia nada. */
      if (this.secao === "rascunhos") await this.carregarRascunhos();
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
  sair() {
    /* Rascunho é inspeção de alguém: não pode ficar na tela depois do logout,
       nem ser mostrado a quem entrar em seguida. */
    this.rascunhos = []; this.rascunhosEm = null;
    Porta.trancar();
  },

  avisar(texto, ruim) {
    /* A faixa entra DEPOIS de this.estado, que é irmão de this.el — não filho.
       Procurá-la dentro de this.el nunca achava nada, e cada clique empilhava
       mais uma sobre o cabeçalho; as de erro, sem temporizador, ficavam para
       sempre. Procurar no pai, e limpar todas as que restaram. */
    const pai = this.estado.parentNode;
    if (pai) pai.querySelectorAll(".aj-avisosinc").forEach(v => v.remove());
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

  /* Filtro de marcar VÁRIAS opções (27/08/2026).

     Era um <select> de escolha única, e ver "PATOS e SOUSA" exigia baixar dois
     relatórios. Agora cada filtro guarda uma LISTA; vazia significa todos.

     Não é <select multiple>: no celular ele vira uma caixa de rolagem
     minúscula, e no desktop obriga a segurar Ctrl — ninguém descobre isso
     sozinho. É um botão que abre uma lista de caixas de marcar. */
  renderFiltros() {
    const s = SECOES[this.secao];
    const host = this.el.querySelector(".aj-filtros");
    host.innerHTML = "";
    s.filtros.forEach(([campo, rot, ordenar]) => {
      const brutos = campo === s.statusK ? ["Ativo", "Inativo"]
        : [...new Set(this.fonte(this.secao).map(r => r[campo]).filter(Boolean))];
      const vals = ordenar ? brutos.sort(ordenar) : brutos.sort(ordemNatural);
      const escolhidos = this.filtros[campo] || [];

      const d = document.createElement("div");
      d.className = "aj-filtro aj-multi";
      d.innerHTML = `<span>${rot}</span>
        <button type="button" class="aj-mbotao">${
          !escolhidos.length ? "Todos"
          : escolhidos.length === 1 ? esc(escolhidos[0])
          : escolhidos.length + " selecionados"}</button>
        <div class="aj-mlista">
          <label class="aj-mtodos"><input type="checkbox"${
            !escolhidos.length ? " checked" : ""}> <b>Todos</b></label>
          ${vals.map(v => `<label><input type="checkbox" value="${esc(v)}"${
            escolhidos.includes(String(v)) ? " checked" : ""}> ${esc(v)}</label>`).join("")}
        </div>`;

      const lista = d.querySelector(".aj-mlista");
      d.querySelector(".aj-mbotao").onclick = e => {
        e.stopPropagation();
        const aberto = d.classList.contains("aberto");
        /* Só uma lista aberta por vez: duas abertas se sobrepõem. */
        host.querySelectorAll(".aj-multi.aberto").forEach(x => x.classList.remove("aberto"));
        if (!aberto) d.classList.add("aberto");
      };
      lista.onclick = e => e.stopPropagation();

      /* "Todos" limpa a lista — é o mesmo que nenhum marcado. */
      lista.querySelector(".aj-mtodos input").onchange = () => {
        this.filtros[campo] = [];
        this.render();
      };
      lista.querySelectorAll("input[value]").forEach(cx => {
        cx.onchange = () => {
          const atual = new Set(this.filtros[campo] || []);
          if (cx.checked) atual.add(cx.value); else atual.delete(cx.value);
          this.filtros[campo] = [...atual];
          this.render();
          /* Redesenhar fecha a lista; reabrir mantém o ritmo de quem vai
             marcar três polos seguidos, em vez de reabrir a cada clique. */
          const novo = this.el.querySelectorAll(".aj-multi")[s.filtros.findIndex(f => f[0] === campo)];
          if (novo) novo.classList.add("aberto");
        };
      });
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

    /* Inspetor novo sai COM login, sempre. Era opcional até 27/08/2026, e
       antes disso um segundo passo separado — o resultado foi cadastro sem
       acesso, que só se descobre quando a pessoa tenta usar o app. Inspetor
       existe para inspecionar, e hoje inspecionar é pelo app.

       Vale só para quem é novo: quem já está cadastrado usa o ⋮ → Criar
       acesso, e não vai ganhar um login por ter sido editado. */
    const comAcesso = novo && this.secao === "inspetores" && Banco.podeEditar();
    const blocoAcesso = !comAcesso ? "" : `
      <div class="aj-acesso">
        <p class="aj-dtexto"><b>Login do app.</b> O inspetor entra com estes
          dados para fazer inspeção pelo celular. Combine a senha com ele — ela
          não fica guardada e depois só dá para trocar, não para consultar.</p>
        <label class="aj-campo"><span>E-mail do inspetor</span>
          <input name="email" type="email" required
                 autocapitalize="none" spellcheck="false"></label>
        ${this.camposSenha()}
      </div>`;

    this.dialogo(novo ? s.novo : `Editar ${dados[s.chave]}`, corpo + blocoAcesso,
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

        /* Confere e-mail e senha ANTES de gravar o cadastro: reclamar depois
           deixaria o inspetor já criado, e a segunda tentativa esbarraria no
           "já existe um cadastro com esse nome". */
        const querAcesso = comAcesso;
        let email = "", senha = "";
        if (querAcesso) {
          email = form.email.value.trim();
          if (!email) throw new Error("Informe o e-mail do inspetor.");
          senha = this.senhaConferida(form);
        }

        await Cadastros.salvar(this.secao, reg);

        if (querAcesso) {
          /* O cadastro já está gravado. Se o acesso falhar aqui, não dá para
             desfazer sem apagar o inspetor — então o diálogo fecha e o aviso
             diz exatamente o que ficou pela metade. */
          try {
            await Banco.acessoInspetor("criar", reg.inspetor, email, senha);
            await Cadastros.carregar();
            Cadastros.aplicarNoModelo();
            this.avisar(`${reg.inspetor} cadastrado, e o login ${email} já está criado.`);
          } catch (e) {
            this.avisar(`${reg.inspetor} foi cadastrado, mas o login NÃO foi criado: `
              + e.message + " Crie pelo ⋮ → Criar acesso, na linha dele.", true);
          }
        }
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

    /* Bloco do login, no cadastro de inspetor novo. Escondido, os campos ficam
       DESABILITADOS — campo required invisível trava o envio do formulário sem
       dizer por quê, e o navegador não consegue nem apontar para ele. */
    /* O e-mail acompanha o nome enquanto ele é digitado — "José da Silva" vira
       jose.da.silva@teccel.com.br. Para de acompanhar assim que o
       administrador editar o e-mail à mão: dali em diante o campo é dele.

       Não é enfeite. É esse padrão que faz a conta casar sozinha com o
       cadastro; e-mail fora dele vira trabalho manual depois, como aconteceu
       com quatro contas em 27/08/2026. */
    const bloco = fundo.querySelector(".aj-acesso");
    const campoNome = form.elements.inspetor;
    if (bloco && campoNome) {
      const campoEmail = bloco.querySelector("input[name=email]");
      let aMao = false;
      campoEmail.oninput = () => { aMao = true; };
      const sugerir = () => {
        if (aMao) return;
        const chave = semAcentoAj(campoNome.value)
          .replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, "");
        campoEmail.value = chave ? chave + "@teccel.com.br" : "";
      };
      campoNome.oninput = sugerir;
      sugerir();
    }

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
document.addEventListener("click", () => {
  document.querySelectorAll(".aj-acoes.aberto").forEach(d => d.classList.remove("aberto"));
  document.querySelectorAll(".aj-multi.aberto").forEach(d => d.classList.remove("aberto"));
});
