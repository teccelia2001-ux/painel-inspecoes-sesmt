/* ============================================================
   APP — 7 páginas replicando a estrutura do relatório original
   Coordenadas extraídas do JSON de layout do Power BI (canvas 1510x720)
   ============================================================ */

const canvas = document.getElementById("canvas");
const PAGINAS = [
  { id: "painel",  nome: "PAINEL",            icone: "🏠", desc: "Menu principal" },
  { id: "taxa",    nome: "Taxa de Contato",   icone: "📊", desc: "Realizado x meta por inspetor" },
  { id: "ranking", nome: "Ranking",           icone: "🏅", desc: "Desempenho individual dos inspetores" },
  { id: "avanco",  nome: "Avanço Mensal",     icone: "📈", desc: "Evolução mês a mês da taxa e do ICIT" },
  { id: "icit",    nome: "ICIT",              icone: "🛡️", desc: "Conformidade e inconformidades" },
  { id: "dia",     nome: "Inspeções por dia", icone: "📅", desc: "Volume diário de inspeções" },
  { id: "jornada", nome: "Jornada Segura",    icone: "🏆", desc: "Ranking de pontuação das equipes" },
  { id: "ajustes", nome: "Ajustes",           icone: "⚙️", desc: "Cadastro de equipes e inspetores" }
];
let paginaAtual = "painel";

/* Significado das siglas — aparece ao passar o cursor */
const SIGLAS = {
  ICIT: "Índice de Conformidade de Inspeção em Turmas",
  "N.C": "Não Conformidade",
  SESMT: "Serviço Especializado em Segurança e Medicina do Trabalho"
};

/* O que cada número quer dizer, em uma frase. Vira dica nos cartões de todas
   as páginas e texto visível no resumo geral.
   A dúvida que mais aparece é entre "inspeções com N.C" (conta VISITAS) e
   "N.C apontadas" (conta ITENS reprovados) — as duas frases deixam isso claro. */
const EXPLICACAO = {
  "Inspeções": "Visitas de inspeção realizadas no período filtrado.",
  "Inspeções realizadas": "Visitas de inspeção realizadas no período filtrado.",
  "Realizado": "Visitas de inspeção realizadas no período filtrado.",
  "Meta inspeção": "Total de inspeções previstas, somando a meta de cada inspetor.",
  "Meta de inspeções": "Total de inspeções previstas, somando a meta de cada inspetor.",
  "Meta até hoje": "Quanto da meta já deveria estar cumprido, rateado pelos dias úteis decorridos.",
  "% atingido": "Realizado dividido pela meta até hoje. O original limita em 100%.",
  "Insp. c/ N.C": "Quantas VISITAS acharam pelo menos um problema — a visita conta uma vez só, "
    + "tendo ela 1 ou 10 apontamentos.",
  "Inspeções com N.C": "Quantas VISITAS acharam pelo menos um problema — a visita conta uma vez só, "
    + "tendo ela 1 ou 10 apontamentos.",
  "N.C apontadas": "Quantos ITENS do checklist foram reprovados no total. Uma mesma visita "
    + "pode gerar vários apontamentos.",
  "ICIT": "Inspeções sem nenhum problema dividido pelo total de inspeções. Quanto maior, melhor.",
  "ICIT (conformidade)": "Inspeções sem nenhum problema dividido pelo total de inspeções. "
    + "Quanto maior, melhor.",
  "% com N.C": "Fatia das inspeções do dia que tiveram pelo menos um problema.",
  "Gravíssimos": "Apontamentos classificados como gravíssimos.",
  "Equipes avaliadas": "Equipes com pontuação inicial cadastrada no período."
};

/* Frase curta para acompanhar o rótulo no resumo geral */
const RESUMO_DICA = {
  "Inspeções realizadas": "visitas feitas",
  "Meta de inspeções": "visitas previstas no período",
  "Meta até hoje": "previsto pelos dias úteis",
  "ICIT (conformidade)": "visitas sem nenhum problema",
  "Inspeções com N.C": "visitas com problema",
  "N.C apontadas": "itens reprovados no total"
};

/* O que o resumo do PAINEL mostra. A visão fica guardada entre as trocas de
   página, mas não na URL: é escolha de leitura, não um link a compartilhar. */
const VISOES_RESUMO = [
  { k: "geral",  rot: "Geral",     desc: "Os números do ano inteiro, somados." },
  { k: "mes",    rot: "Mês a mês", campo: null,     desc: "Um bloco por mês, com o quanto da meta foi atingido." },
  { k: "polo",   rot: "Por polo",  campo: "polo",   desc: "Cada polo no período todo, com a meta de quem é do polo." },
  { k: "equipe", rot: "Por equipe", campo: "equipe", desc: "Cada equipe de campo pelo ICIT — equipe não tem meta de inspeção." }
];
let visaoResumo = "geral";
/* Item aberto em relatório completo: {visao, chave, mesAno} ou null */
let detalheResumo = null;
/* Texto digitado na busca da lista do resumo. Some ao trocar de visão: é
   um recorte de leitura, não um filtro do painel. */
let buscaResumo = "";

/* Compara ignorando acento e maiúscula: "plantao" acha "PLANTÃO". */
const semAcento = s => String(s || "").normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

/* ---------- helpers de construção ---------- */
function marcaHTML() {
  return `<img class="logo" src="${LOGO_TECCEL}" alt="Teccel Energia">
    <div class="divisor"></div>
    <div><div class="nome">PAINEL DE INSPEÇÕES</div>
    <div class="sub">SESMT · Obras RD · Regional Oeste</div></div>`;
}

/* Marca as siglas conhecidas com a descrição no title (dica ao passar o cursor) */
function marcarSiglas(raiz) {
  raiz.querySelectorAll(".rot, .titulo, th, .tit").forEach(elm => {
    if (elm.dataset.sigla) return;
    const alvo = Object.keys(SIGLAS).find(s =>
      new RegExp(`(^|[^A-Za-zÀ-ú])${s.replace(".", "\\.")}([^A-Za-zÀ-ú]|$)`, "i").test(elm.textContent));
    if (!alvo) return;
    elm.dataset.sigla = alvo;
    /* Dentro de um cartão que já explica o número, a dica do rótulo repetiria
       metade da frase: junta as duas em vez de sobrescrever uma com a outra. */
    const dono = elm.closest(".card.comdica");
    elm.title = dono ? `${dono.title}\n${alvo} = ${SIGLAS[alvo]}`
                     : `${alvo} — ${SIGLAS[alvo]}`;
    elm.classList.add("sigla");
  });
}
function box(pai, x, y, w, h, cls) {
  const d = document.createElement("div");
  d.className = "v " + (cls || "");
  d.style.cssText = `left:${x}px;top:${y}px;width:${w}px;height:${h}px`;
  pai.appendChild(d);
  return d;
}
function visual(pai, x, y, w, h, titulo) {
  const d = box(pai, x, y, w, h, "painel");
  if (titulo) d.appendChild(Object.assign(document.createElement("div"), { className: "titulo", textContent: titulo }));
  const c = document.createElement("div");
  c.className = "corpo" + (titulo ? "" : " semtitulo");
  d.appendChild(c);
  return c;
}
function cartao(pai, x, y, w, h, rotulo, classe) {
  const d = box(pai, x, y, w, h, "card " + (classe || ""));
  d.innerHTML = `<div class="valor">—</div><div class="rot">${rotulo}</div>`;
  if (EXPLICACAO[rotulo]) { d.title = EXPLICACAO[rotulo]; d.classList.add("comdica"); }
  return d.querySelector(".valor");
}
function legenda(host, itens) {
  const l = document.createElement("div");
  l.className = "legenda";
  l.innerHTML = itens.map(i => `<span><i style="background:${i.cor}"></i>${i.txt}</span>`).join("");
  host.parentElement.appendChild(l);
}

/* ---------- cabeçalho comum (marca + cards + slicers) ---------- */
function cabecalho(pg, cards) {
  const topo = document.createElement("div");
  topo.className = "faixa-topo";
  pg.appendChild(topo);
  const marca = document.createElement("div");
  marca.className = "marca";
  marca.innerHTML = marcaHTML();
  pg.appendChild(marca);

  const b = document.createElement("button");
  b.className = "voltar"; b.textContent = "←"; b.title = "Voltar ao painel";
  b.onclick = () => irPara("painel");
  pg.appendChild(b);

  const refs = {};
  const larg = 150, gap = 8;
  const x0 = 1494 - cards.length * (larg + gap);
  cards.forEach((c, i) => {
    refs[c.k] = cartao(pg, x0 + i * (larg + gap), 8, larg, 62, c.rot, c.cls);
  });

  // No modo fluido a faixa de filtros fica recolhida atrás deste botão,
  // para não empurrar os gráficos para fora da primeira tela do celular.
  const alt = document.createElement("button");
  alt.className = "btn-filtros";
  alt.innerHTML = `<span>Filtros</span><span class="cont"></span>`;
  alt.onclick = e => { e.stopPropagation(); pg.classList.toggle("filtros-abertos"); };
  pg.appendChild(alt);

  const faixa = document.createElement("div");
  faixa.className = "faixa-slicers";
  pg.appendChild(faixa);
  [["ano", "Ano"], ["mes", "Mês"], ["polo", "Polo"], ["inspetor", "Inspetor"],
   ["funcao", "Função"], ["supervisor", "Supervisor"], ["equipe", "Equipe"]]
    .forEach(([campo, rot]) => faixa.appendChild(montarSlicer(campo, rot)));

  const lim = document.createElement("button");
  lim.className = "limpar"; lim.textContent = "✕ Limpar filtros";
  lim.onclick = () => { CAMPOS.forEach(c => filtros[c].clear()); render(); };
  faixa.appendChild(lim);
  return refs;
}

function montarSlicer(campo, rotulo) {
  const d = document.createElement("div");
  d.className = "slicer";
  d.dataset.campo = campo;
  d.innerHTML = `<button><span class="lb">${rotulo}</span><span class="vl">Tudo</span></button><div class="lista"></div>`;
  d.querySelector("button").onclick = e => {
    e.stopPropagation();
    const aberto = d.classList.contains("aberto");
    document.querySelectorAll(".slicer.aberto").forEach(s => s.classList.remove("aberto"));
    if (!aberto) { preencherLista(d, campo); d.classList.add("aberto"); }
  };
  return d;
}
function preencherLista(d, campo) {
  const lista = d.querySelector(".lista");
  lista.innerHTML = "";
  opcoes(campo).forEach(v => {
    const lab = document.createElement("label");
    const cb = document.createElement("input");
    cb.type = "checkbox"; cb.checked = filtros[campo].has(v);
    cb.onchange = () => {
      cb.checked ? filtros[campo].add(v) : filtros[campo].delete(v);
      render();
      preencherLista(d, campo);
      d.classList.add("aberto");
    };
    lab.appendChild(cb);
    lab.appendChild(document.createTextNode(campo === "mes" ? MESES_NOME[+v] : v));
    lista.appendChild(lab);
  });
}
document.addEventListener("click", () => document.querySelectorAll(".slicer.aberto").forEach(s => s.classList.remove("aberto")));

/* ---------- abas ---------- */
function abas() {
  const d = document.createElement("div");
  d.className = "abas";
  PAGINAS.forEach(p => {
    const b = document.createElement("button");
    b.textContent = p.nome;
    b.dataset.pg = p.id;
    b.onclick = () => irPara(p.id);
    d.appendChild(b);
  });
  const s = document.createElement("span");
  s.className = "att";
  // A versão ajuda a saber se o navegador está mostrando o build atual
  s.textContent = `Atualizado em ${ATUALIZACAO} · v${VERSAO}`;
  s.title = "Versão do painel — use para conferir se a página está atualizada";
  d.appendChild(s);
  return d;
}

/* ============================================================
   MONTAGEM DAS PÁGINAS
   ============================================================ */
const R = {};   // referências para atualização

/* --- 1. PAINEL (menu, 7 visuais no original) --- */
function pgPainel() {
  const pg = document.createElement("div");
  pg.className = "pagina"; pg.id = "pg-painel";
  const topo = document.createElement("div"); topo.className = "faixa-topo"; pg.appendChild(topo);
  const marca = document.createElement("div"); marca.className = "marca";
  marca.innerHTML = marcaHTML();
  pg.appendChild(marca);

  R.painelAtt = cartao(pg, 1180, 8, 300, 62, "Última atualização");

  /* O passo se ajusta à quantidade de páginas: com 8 itens o espaçamento
     antigo (82px) passava do rodapé do canvas. */
  const itens = PAGINAS.slice(1);
  const topo0 = 122, fundo = 684;
  const passo = Math.min(82, (fundo - topo0) / itens.length);
  const altura = Math.min(66, passo - 10);
  itens.forEach((p, i) => {
    const d = box(pg, 60, topo0 + i * passo, 560, altura);
    const b = document.createElement("button");
    b.className = "menu-btn";
    b.innerHTML = `<span class="ic">${p.icone}</span><span>${p.nome}<span class="desc">${p.desc}</span></span>`;
    b.onclick = () => irPara(p.id);
    d.appendChild(b);
  });

  const res = box(pg, 680, 122, 770, 552, "painel");
  res.innerHTML = `<div class="titulo">Resumo geral (sem filtros)</div>`;
  R.painelTitulo = res.querySelector(".titulo");
  const c = document.createElement("div"); c.className = "corpo"; res.appendChild(c);

  /* Seletor do que aparece no resumo — mesmas pílulas do resto do painel */
  const sel = document.createElement("div");
  sel.className = "pilulas rp-sel";
  VISOES_RESUMO.forEach(v => {
    const b = document.createElement("button");
    b.textContent = v.rot; b.dataset.visao = v.k; b.title = v.desc;
    b.onclick = () => { visaoResumo = v.k; detalheResumo = null; buscaResumo = ""; resumoPainel(); };
    sel.appendChild(b);
  });
  c.appendChild(sel);
  R.painelSel = sel;

  const conteudo = document.createElement("div");
  conteudo.className = "rp-conteudo";
  c.appendChild(conteudo);
  R.painelResumo = conteudo;
  return pg;
}

/* --- 2. Taxa de Contato (18 visuais) --- */
function pgTaxa() {
  const pg = document.createElement("div"); pg.className = "pagina"; pg.id = "pg-taxa";
  R.taxaCards = cabecalho(pg, [
    { k: "meta", rot: "Meta inspeção" }, { k: "metaDia", rot: "Meta até hoje" },
    { k: "qtd", rot: "Realizado", cls: "destaque" }, { k: "pct", rot: "% atingido" }
  ]);
  R.taxaSesmt  = visual(pg, 14, 171, 1095, 256, "SESMT — realizado x meta por inspetor");
  R.taxaResumo = visual(pg, 1126, 171, 370, 256, "SESMT — total");
  R.taxaOper   = visual(pg, 14, 450, 1095, 225, "OPERAÇÃO — realizado x meta por inspetor");
  R.taxaOperR  = visual(pg, 1126, 450, 370, 225, "OPERAÇÃO — total");
  return pg;
}

/* --- 3. Ranking (15 visuais) --- */
function pgRanking() {
  const pg = document.createElement("div"); pg.className = "pagina"; pg.id = "pg-ranking";
  R.rkCards = cabecalho(pg, [
    { k: "meta", rot: "Meta inspeção" }, { k: "metaDia", rot: "Meta até hoje" },
    { k: "qtd", rot: "Realizado", cls: "destaque" }, { k: "pct", rot: "% atingido" }
  ]);
  const c = visual(pg, 14, 166, 1482, 510, "Ranking de inspetores");
  c.classList.add("rolagem");
  R.rkTabela = c;
  return pg;
}

/* --- 4. Avanço Mensal (17 visuais) --- */
function pgAvanco() {
  const pg = document.createElement("div"); pg.className = "pagina"; pg.id = "pg-avanco";
  R.avCards = cabecalho(pg, [
    { k: "meta", rot: "Meta inspeção" }, { k: "metaDia", rot: "Meta até hoje" },
    { k: "qtd", rot: "Realizado", cls: "destaque" }, { k: "icit", rot: "ICIT", cls: "ok" }
  ]);
  R.avTaxa  = visual(pg, 14, 171, 1003, 257, "Taxa de contato mês a mês");
  R.avIcit  = visual(pg, 14, 448, 1003, 227, "ICIT mês a mês");
  R.avG1    = visual(pg, 1029, 171, 464, 257, "Taxa de contato total");
  R.avG2    = visual(pg, 1029, 448, 464, 227, "ICIT total");
  return pg;
}

/* --- 5. ICIT (27 visuais) --- */
function pgIcit() {
  const pg = document.createElement("div"); pg.className = "pagina"; pg.id = "pg-icit";
  R.icCards = cabecalho(pg, [
    { k: "qtd", rot: "Inspeções", cls: "destaque" }, { k: "insNC", rot: "Insp. c/ N.C", cls: "alerta" },
    { k: "icit", rot: "ICIT", cls: "ok" }, { k: "gravissimo", rot: "Gravíssimos", cls: "alerta" }
  ]);
  R.icGauge  = visual(pg, 17, 164, 349, 269, "ICIT");
  R.icInsp   = visual(pg, 379, 164, 363, 269, "ICIT por inspetor");
  R.icCat    = visual(pg, 752, 164, 292, 269, "Inconformidades por categoria");
  R.icTop    = visual(pg, 1055, 164, 441, 269, "Top 5 inconformidades");
  R.icEquipe = visual(pg, 17, 444, 894, 231, "ICIT por equipe");
  R.icTipo   = visual(pg, 923, 444, 290, 231, "ICIT por tipo de serviço");
  R.icSup    = visual(pg, 1221, 444, 275, 231, "ICIT por supervisor");
  return pg;
}

/* --- 6. Inspeções por dia (15 visuais) --- */
function pgDia() {
  const pg = document.createElement("div"); pg.className = "pagina"; pg.id = "pg-dia";
  R.diCards = cabecalho(pg, [
    { k: "meta", rot: "Meta inspeção" }, { k: "metaDia", rot: "Meta até hoje" },
    { k: "qtd", rot: "Realizado", cls: "destaque" }, { k: "pctNC", rot: "% com N.C", cls: "alerta" }
  ]);
  R.diChart = visual(pg, 14, 165, 1482, 510, "Quantidade de inspeções por dia");
  return pg;
}

/* --- 7. Jornada Segura (20 visuais) --- */
function pgJornada() {
  const pg = document.createElement("div"); pg.className = "pagina"; pg.id = "pg-jornada";
  R.joCards = cabecalho(pg, [
    { k: "qtd", rot: "Inspeções", cls: "destaque" }, { k: "insNC", rot: "Insp. c/ N.C", cls: "alerta" },
    { k: "icit", rot: "ICIT", cls: "ok" }, { k: "equipes", rot: "Equipes avaliadas" }
  ]);
  const c = visual(pg, 23, 163, 910, 512, "Jornada Segura — pontuação por equipe");
  c.classList.add("rolagem");
  R.joTabela = c;
  R.joPodio  = visual(pg, 951, 163, 537, 316, "Pódio — melhores equipes");
  R.joPiores = visual(pg, 951, 487, 537, 188, "Pódio — piores equipes");
  return pg;
}

/* --- 8. Ajustes (cadastros) --- */
function pgAjustes() {
  const pg = document.createElement("div"); pg.className = "pagina"; pg.id = "pg-ajustes";
  return Ajustes.montar(pg);
}

/* ---------- montagem ---------- */
[pgPainel(), pgTaxa(), pgRanking(), pgAvanco(), pgIcit(), pgDia(), pgJornada(), pgAjustes()]
  .forEach(p => canvas.appendChild(p));
canvas.appendChild(abas());

function irPara(id) {
  if (!PAGINAS.some(p => p.id === id)) id = "painel";
  paginaAtual = id;
  canvas.querySelectorAll(".pagina").forEach(p => p.classList.toggle("ativa", p.id === "pg-" + id));
  canvas.querySelectorAll(".abas button").forEach(b => b.classList.toggle("on", b.dataset.pg === id));
  marcarSiglas(canvas);
  if (location.hash.slice(1) !== id) history.replaceState(null, "", "#" + id);
  window.scrollTo(0, 0);
  render();
}
// permite compartilhar link direto de uma página: ...dashboard.html#icit
window.addEventListener("hashchange", () => irPara(location.hash.slice(1)));

/* ============================================================
   RENDER
   ============================================================ */
function marcarSlicers() {
  document.querySelectorAll(".slicer").forEach(s => {
    const c = s.dataset.campo, sel = [...filtros[c]];
    s.classList.toggle("on", sel.length > 0);
    s.querySelector(".vl").textContent = !sel.length ? "Tudo"
      : sel.length === 1 ? (c === "mes" ? MESES_NOME[+sel[0]] : sel[0])
      : sel.length + " selecionados";
  });
  const n = CAMPOS.filter(c => filtros[c].size > 0).length;
  document.querySelectorAll(".btn-filtros").forEach(b => {
    b.classList.toggle("on", n > 0);
    b.querySelector(".cont").textContent = n ? `${n} ativo${n > 1 ? "s" : ""}` : "todos os dados";
  });
}
function setCards(refs, vals) {
  for (const k in vals) if (refs[k]) refs[k].textContent = vals[k];
}

function render() {
  marcarSlicers();
  marcarSiglas(canvas);
  const f = fatoFiltrado(), ms = mesesAtivos(), k = kpis(f, ms);
  const base = {
    meta: fmtN(k.Meta_Insp), metaDia: fmtD(k.Meta_insp_dia, 0), qtd: fmtN(k.Qtd_Insp),
    pct: fmtP(k.pctInspecao, 0), icit: fmtP(k.ICIT, 0), insNC: fmtN(k.Qtd_Inspecao_NC)
  };

  if (paginaAtual === "painel") {
    R.painelAtt.textContent = ATUALIZACAO;
    R.painelAtt.style.fontSize = "17px";
    resumoPainel();
  }

  if (paginaAtual === "taxa") {
    setCards(R.taxaCards, base);
    // O original quebra a página em dois blocos por FUNÇÃO: SESMT e OPERAÇÃO
    const porInsp = porInspetor(f, ms);
    const serie = [{ key: "meta", label: "Meta", cor: "var(--c2)" },
                   { key: "qtd", label: "Realizado", cor: "var(--c1)" }];
    const bloco = (host, hostTotal, funcoes) => {
      // função é o índice 2 de [nome, polo, função, meta dinâmica, meta estática]
      const d = porInsp.filter(g => funcoes.includes((IDX_INSPETOR[g.chave] || [])[2]))
                       .sort((a, b) => b.qtd - a.qtd);
      comboChart(host, d, { series: serie, linha: { key: "pctTotal", label: "% da meta" } });
      const meta = d.reduce((a, x) => a + x.meta, 0), qtd = d.reduce((a, x) => a + x.qtd, 0);
      comboChart(hostTotal, [{ chave: "Total", meta, qtd, pct: pct(qtd, meta) }],
        { series: serie, linha: { key: "pct", label: "% da meta" }, rotacionar: false });
    };
    bloco(R.taxaSesmt, R.taxaResumo, ["Técnico Segurança", "Engenheiro Segurança"]);
    bloco(R.taxaOper, R.taxaOperR, ["Supervisor", "Coordenador Operacional", "Gerente Operacional"]);
    legendaUnica(R.taxaSesmt, [{ cor: "var(--c2)", txt: "Meta" }, { cor: "var(--c1)", txt: "Realizado" }, { cor: "var(--c-linha)", txt: "% meta" }]);
  }

  if (paginaAtual === "ranking") {
    setCards(R.rkCards, base);
    // sem a linha "(vazio)": inspeções sem inspetor cadastrado não entram no ranking
    const linhas = porInspetor(f, ms).sort((a, b) => (b.pct ?? -1) - (a.pct ?? -1));
    tabela(R.rkTabela, [
      { titulo: "#", valor: (l, i) => "", num: true },
      { titulo: "Inspetor", valor: l => l.chave },
      { titulo: "Função", valor: l => (IDX_INSPETOR[l.chave] || ["","",""])[2] },
      { titulo: "Polo", valor: l => (IDX_INSPETOR[l.chave] || ["",""])[1] },
      { titulo: "Meta inspeção", valor: l => fmtN(l.meta), num: true },
      { titulo: "Meta até hoje", valor: l => fmtD(l.metaDia, 1), num: true },
      { titulo: "Realizado", valor: l => fmtN(l.qtd), num: true },
      { titulo: "% atingida", valor: l => fmtP(l.pct), num: true, classe: l => (l.pct >= 1 ? "ok" : "nok") },
      { titulo: "ICIT", valor: l => fmtP(l.icit), num: true },
      { titulo: "👍🏼 ou 👎🏼", valor: l => l.pct >= 1 ? "👍🏼" : "👎🏼", num: true }
    ], linhas);
    [...R.rkTabela.querySelectorAll("tbody tr")].forEach((tr, i) => tr.cells[0].textContent = i + 1);
  }

  if (paginaAtual === "avanco") {
    setCards(R.avCards, base);
    const meses = porMes(f, ms);
    comboChart(R.avTaxa, meses, {
      series: [{ key: "meta", label: "Meta", cor: "var(--c2)" }, { key: "qtd", label: "Realizado", cor: "var(--c1)" }],
      linha: { key: "pct", label: "% atingido" }, rotacionar: false
    });
    legendaUnica(R.avTaxa, [{ cor: "var(--c2)", txt: "Meta" }, { cor: "var(--c1)", txt: "Realizado" }, { cor: "var(--c-linha)", txt: "% atingido" }]);
    comboChart(R.avIcit, meses, {
      series: [{ key: "qtd", label: "Inspeções", cor: "var(--c1)" }, { key: "nc", label: "Com N.C", cor: "var(--ruim)" }],
      linha: { key: "icit", label: "ICIT" }, rotacionar: false
    });
    legendaUnica(R.avIcit, [{ cor: "var(--c1)", txt: "Inspeções" }, { cor: "var(--ruim)", txt: "Com N.C" }, { cor: "var(--c-linha)", txt: "ICIT" }]);
    gauge(R.avG1, k.pctInspecao, { max: 1.2, faixas: [0.7, 0.95] });
    gauge(R.avG2, k.ICIT, { max: 1, faixas: [0.6, 0.85] });
  }

  if (paginaAtual === "icit") {
    const g = gravidades(f);
    setCards(R.icCards, Object.assign({}, base, { gravissimo: fmtN(g["Gravíssimo"]) }));
    gauge(R.icGauge, k.ICIT, { max: 1, faixas: [0.6, 0.85] });
    const porInsp = porInspetor(f, ms).sort((a, b) => b.qtd - a.qtd);
    comboChart(R.icInsp, porInsp, {
      series: [{ key: "qtd", label: "Inspeções", cor: "var(--c1)" }, { key: "nc", label: "Com N.C", cor: "var(--ruim)" }],
      linha: { key: "icit", label: "ICIT" }
    });
    waterfall(R.icCat, ncPorCampo(f, 2));
    barrasH(R.icTop, ncPorCampo(f, 1).slice(0, 5), { maxRot: 52 });
    const porEq = agrupar(f, "equipe", ms).filter(x => x.qtd > 0).sort((a, b) => b.qtd - a.qtd).slice(0, 22);
    comboChart(R.icEquipe, porEq, {
      series: [{ key: "qtd", label: "Inspeções", cor: "var(--c1)" }, { key: "nc", label: "Com N.C", cor: "var(--ruim)" }],
      linha: { key: "icit", label: "ICIT" }, maxRot: 12, minColuna: 30
    });
    comboChart(R.icTipo, agrupar(f, "tipo", ms).sort((a, b) => b.qtd - a.qtd), {
      series: [{ key: "qtd", label: "Inspeções", cor: "var(--c1)" }, { key: "nc", label: "Com N.C", cor: "var(--ruim)" }],
      linha: { key: "icit", label: "ICIT" }, maxRot: 10
    });
    comboChart(R.icSup, agrupar(f, "supervisor", ms).filter(x => x.chave !== "(vazio)").sort((a, b) => b.qtd - a.qtd), {
      series: [{ key: "qtd", label: "Inspeções", cor: "var(--c1)" }, { key: "nc", label: "Com N.C", cor: "var(--ruim)" }],
      linha: { key: "icit", label: "ICIT" }, maxRot: 10
    });
  }

  if (paginaAtual === "dia") {
    const dias = porDia(f).map(d => Object.assign(d, { pctNC: d.qtd ? d.nc / d.qtd : null }));
    setCards(R.diCards, Object.assign({}, base, {
      pctNC: fmtP(pct(k.Qtd_Inspecao_NC, k.Qtd_Insp), 1)
    }));
    comboChart(R.diChart, dias, {
      series: [{ key: "qtd", label: "Inspeções", cor: "var(--c1)" }, { key: "nc", label: "Com N.C", cor: "var(--ruim)" }],
      linha: { key: "pctNC", label: "% com N.C" }, maxRot: 6, minColuna: 22
    });
    legendaUnica(R.diChart, [{ cor: "var(--c1)", txt: "Inspeções" }, { cor: "var(--ruim)", txt: "Com N.C" },
      { cor: "var(--c-linha)", txt: "% com N.C" }]);
  }

  if (paginaAtual === "ajustes") { Ajustes.render(); return; }

  if (paginaAtual === "jornada") {
    const j = jornada(f, ms).filter(l => l.pontosIniciais !== null);
    setCards(R.joCards, Object.assign({}, base, { equipes: fmtN(j.length) }));
    tabela(R.joTabela, [
      { titulo: "#", valor: l => l.ranking, num: true },
      { titulo: "Equipe", valor: l => l.equipe },
      { titulo: "Supervisor", valor: l => l.supervisor },
      { titulo: "Insp.", valor: l => fmtN(l.qtd), num: true },
      { titulo: "C/ N.C", valor: l => fmtN(l.nc), num: true },
      { titulo: "N.C", valor: l => fmtN(l.ncLinhas), num: true },
      { titulo: "ICIT", valor: l => fmtP(l.icit, 0), num: true, classe: l => (l.icit >= 0.8 ? "ok" : l.icit < 0.5 ? "nok" : "") },
      { titulo: "Pts iniciais", valor: l => fmtN(l.pontosIniciais), num: true },
      { titulo: "Pts N.C", valor: l => fmtN(l.pontosNC), num: true, classe: () => "nok" },
      { titulo: "Pts final", valor: l => fmtN(l.pontosFinal), num: true, classe: () => "ok" },
      { titulo: "Desempate", valor: l => fmtD(l.desempate, 1), num: true }
    ], j);
    R.joPodio.innerHTML  = podioHTML(j);
    R.joPiores.innerHTML = podioPioresHTML(j);
  }
}

/* Agrupa por pontuação: equipes com a mesma pontuação dividem o lugar.
   A ordem dentro do grupo é a do critério de desempate. */
function agruparPorPontos(linhas) {
  const lugares = [];
  linhas.forEach(l => {
    const ultimo = lugares[lugares.length - 1];
    if (ultimo && ultimo.pontos === l.pontosFinal) ultimo.equipes.push(l);
    else lugares.push({ pontos: l.pontosFinal, equipes: [l] });
  });
  return lugares;
}

/* Pódio invertido: as equipes que mais perderam pontos */
function podioPioresHTML(linhas) {
  if (!linhas.length) return `<div class="podio piores"><div class="tit">sem dados</div></div>`;
  const lugares = agruparPorPontos(linhas);
  // do fim para o começo: o último grupo é o de menor pontuação.
  // Não repete grupos que já aparecem no pódio dos melhores.
  const topo = new Set(lugares.slice(0, 3).map(l => l.pontos));
  const fundo = lugares.slice(-3).reverse().filter(l => !topo.has(l.pontos));
  const marcas = ["🚩", "2º", "3º"];

  if (!fundo.length) return `<div class="podio piores" title="Menor pontuação final — cada não conformidade desconta pontos da equipe">
    <div class="tit">⚠️ Precisam de atenção</div>
    <div class="empate">Todas as equipes filtradas estão no pódio dos melhores</div></div>`;

  return `<div class="podio piores">
    <div class="tit">⚠️ Precisam de atenção</div>
    <div class="lista-lugares">
      ${fundo.map((lug, i) => `
        <div class="lugar${i === 0 ? " pior" : ""}" title="${lug.equipes.map(e =>
            `${e.equipe} — ${e.ncLinhas} N.C, ICIT ${fmtP(e.icit, 0)}`).join(" | ")}">
          <span class="medalha">${marcas[i]}</span>
          <span class="nomes">${lug.equipes.length > 1
            ? `${lug.equipes.length} equipes empatadas`
            : lug.equipes[0].equipe}</span>
          <span class="detalhe">${fmtN(lug.equipes.reduce((a, e) => a + e.ncLinhas, 0))} N.C</span>
          <b>${fmtN(lug.pontos)}</b></div>`).join("")}
    </div>
  </div>`;
}

/* Pódio: só o primeiro lugar. Havendo empate em pontos, vence quem lidera
   no critério de desempate — a mesma ordem da tabela ao lado. */
function podioHTML(linhas) {
  if (!linhas.length) return `<div class="podio"><div class="tit">sem dados</div></div>`;

  const lugares = agruparPorPontos(linhas);
  const campea = lugares[0].equipes[0];        // já vêm ordenadas pelo desempate
  const empatadas = lugares[0].equipes.length;

  return `<div class="podio">
    <img class="marca-podio" src="${LOGO_TECCEL}" alt="Teccel Energia">
    <div class="coroa">
      <div class="tit">🏆 Equipe campeã</div>
      <div class="eq">${campea.equipe}</div>
      <div class="pts">${fmtN(campea.pontosFinal)} pontos · ICIT ${fmtP(campea.icit, 1)}
        · ${campea.qtd} inspeç${campea.qtd === 1 ? "ão" : "ões"}</div>
      ${campea.supervisor ? `<div class="sup">Supervisor: ${campea.supervisor}</div>` : ""}
      ${empatadas > 1 ? `
        <div class="empate">${empatadas} equipes empatadas com ${fmtN(campea.pontosFinal)} pontos
          — a ordem abaixo segue o critério de desempate</div>
        <div class="chips">${lugares[0].equipes.map((e, i) =>
          `<span class="chip${i === 0 ? " lider" : ""}"
            title="${e.equipe} — ${e.qtd} inspeç${e.qtd === 1 ? "ão" : "ões"}, ${e.ncLinhas} N.C, desempate ${fmtD(e.desempate, 1)}"
            >${i === 0 ? "🏆 " : ""}${e.equipe}</span>`).join("")}</div>` : ""}
    </div>
  </div>`;
}

function legendaUnica(host, itens) {
  const pai = host.parentElement;
  const velha = pai.querySelector(".legenda");
  if (velha) velha.remove();
  legenda(host, itens);
}

/* Resumo geral — mesmo desenho do painel de obras: um bloco de progresso em
   destaque, os números em cartões e a gravidade dos desvios em barras.
   As cores continuam as da Teccel. */
function resumoPainel() {
  const v = VISOES_RESUMO.find(x => x.k === visaoResumo) || VISOES_RESUMO[0];
  R.painelSel.querySelectorAll("button").forEach(b =>
    b.classList.toggle("on", b.dataset.visao === v.k));
  R.painelTitulo.textContent = v.k === "geral"
    ? "Resumo geral (sem filtros)" : `Resumo ${v.rot.toLowerCase()} (sem filtros)`;
  R.painelTitulo.title = v.desc;
  // o detalhe só vale para a visão em que foi aberto
  if (detalheResumo && detalheResumo.visao !== v.k) detalheResumo = null;
  if (detalheResumo) return resumoPainelDetalhe();
  if (v.k !== "geral") return resumoPainelLista(v);
  resumoPainelGeral();
}

/* Soma as linhas mês a mês do resumo mensal numa linha por chave — o painel
   mostra o período inteiro, não cada mês de cada polo. */
function consolidar(linhas) {
  const mapa = new Map();
  linhas.forEach(l => {
    const k = l.chave;
    if (!mapa.has(k)) mapa.set(k, { chave: k, qtd: 0, nc: 0, ncLinhas: 0, meta: 0,
      metaDia: 0, pontosNC: 0, supervisor: l.supervisor || "" });
    const a = mapa.get(k);
    a.qtd += l.qtd; a.nc += l.nc; a.ncLinhas += l.ncLinhas;
    a.meta += l.meta; a.metaDia += l.metaDia; a.pontosNC += l.pontosNC;
  });
  return [...mapa.values()].map(a => Object.assign(a, {
    icit: a.qtd ? (a.qtd - a.nc) / a.qtd : null,
    pct: a.metaDia ? pctAtingida(a.qtd, a.metaDia) : null
  }));
}

/* Lista de progresso: um bloco por mês, polo ou equipe, na mesma linguagem
   do resumo geral — barra, porcentagem grande e os números embaixo. */
function resumoPainelLista(v) {
  const faixa = x => x === null || x === undefined ? "" : x >= 1 ? "bom" : x >= 0.8 ? "medio" : "ruim";
  const faixaIcit = x => x === null || x === undefined ? "" : x >= 0.85 ? "bom" : x >= 0.6 ? "medio" : "ruim";
  const bruto = resumoMensal(FATO, DDATA, v.campo);

  // por mês a ordem é o calendário; nas outras, quem mais inspecionou primeiro
  const itens = v.k === "mes"
    ? bruto.map(l => Object.assign({}, l, { chave: l.mes }))
    : consolidar(bruto).sort((a, b) => b.qtd - a.qtd);

  if (!itens.length) {
    R.painelResumo.innerHTML = `<div class="rp-vazio">sem dados</div>`;
    return;
  }

  /* Equipe não tem meta de inspeção: a barra mostra o ICIT, que é o que
     realmente mede equipe. Nas demais visões a barra é a meta atingida. */
  const porIcit = v.k === "equipe";

  /* Busca: com muitos blocos, achar uma equipe rolando a lista é sofrido.
     Só aparece quando há lista o bastante para justificar. */
  const temBusca = itens.length > 8;
  const rotBusca = v.k === "equipe" ? "equipe ou supervisor"
    : v.k === "polo" ? "polo" : "mês";

  R.painelResumo.innerHTML = `${temBusca ? `<label class="rp-busca">
    <input type="search" placeholder="Buscar ${rotBusca}…" value="${buscaResumo}"
      aria-label="Buscar na lista"><span class="rp-conta"></span></label>` : ""}
  <div class="rp-lista">${itens.map(l => {
    const valor = porIcit ? l.icit : l.pct;
    const cls = porIcit ? faixaIcit(valor) : faixa(valor);
    const larg = valor === null || valor === undefined ? 0 : Math.min(100, valor * 100);
    const pe = porIcit
      ? [`${fmtN(l.qtd)} inspeç${l.qtd === 1 ? "ão" : "ões"}`,
         `${fmtN(l.nc)} com problema`, `${fmtN(l.ncLinhas)} N.C`]
      // sem meta cadastrada não há "de quantas": mostra só o realizado
      : [l.meta ? `${fmtN(l.qtd)} de ${fmtD(l.metaDia, 0)} previstas`
                : `${fmtN(l.qtd)} inspeç${l.qtd === 1 ? "ão" : "ões"} · sem meta cadastrada`,
         `ICIT ${fmtP(l.icit, 0)}`, `${fmtN(l.ncLinhas)} N.C`];
    return `<button class="rp-item" data-chave="${l.chave || ""}" data-busca="${
        [l.chave, l.supervisor].filter(Boolean).join(" ")}"${
        l.mesAno ? ` data-mes="${l.mesAno}"` : ""} title="${
        l.supervisor ? `Supervisor: ${l.supervisor} · ` : ""}Ver o relatório completo">
      <div class="rp-cab"><b>${l.chave || "(vazio)"}</b>
        <span class="rp-pct ${cls}">${fmtP(valor, 1)}</span></div>
      <div class="rg-barra"><i class="${cls}" style="width:${larg.toFixed(1)}%"></i></div>
      <div class="rp-pe">${pe.map(t => `<span>${t}</span>`).join("")}</div>
      <span class="rp-abrir">ver relatório →</span>
    </button>`;
  }).join("")}</div>
  <div class="rg-nota">${porIcit
    ? "A barra é o <b>ICIT</b>: fatia das visitas da equipe que não acharam nenhum problema. "
      + "Equipe não tem meta de inspeção — a meta é cadastrada por inspetor."
    : "A barra é o <b>quanto da meta foi atingido</b>, comparando o realizado com a parte "
      + "da meta que já deveria estar cumprida pelos dias úteis."}
    Clique em um bloco para abrir o relatório completo dele.</div>`;

  /* A busca esconde os blocos que não batem em vez de redesenhar a lista:
     redesenhar tiraria o foco do campo a cada tecla digitada. */
  const cxBusca = R.painelResumo.querySelector(".rp-busca input");
  if (cxBusca) {
    const conta = R.painelResumo.querySelector(".rp-conta");
    const lista = R.painelResumo.querySelector(".rp-lista");
    const aplicar = () => {
      const q = semAcento(cxBusca.value);
      let achou = 0;
      R.painelResumo.querySelectorAll(".rp-item").forEach(b => {
        const bate = !q || semAcento(b.dataset.busca).includes(q);
        b.hidden = !bate;
        if (bate) achou++;
      });
      conta.textContent = !q ? ""
        : achou ? `${achou} de ${itens.length}` : "nada encontrado";
      lista.classList.toggle("vazia", !!q && !achou);
    };
    cxBusca.oninput = () => { buscaResumo = cxBusca.value; aplicar(); };
    if (buscaResumo) aplicar();
  }

  R.painelResumo.querySelectorAll(".rp-item").forEach(b =>
    b.onclick = () => {
      detalheResumo = { visao: v.k, chave: b.dataset.chave, mesAno: b.dataset.mes || null };
      resumoPainel();
    });
}

/* ---------- relatório completo de um mês, polo ou equipe ----------
   Reaproveita os blocos do resumo geral, recortando o fato para o item e
   trocando a meta pela do escopo — a medida Meta_Insp soma todos os inspetores
   filtrados, então por polo ela precisa ser recalculada aqui. */
function resumoPainelDetalhe() {
  const d = detalheResumo;
  const v = VISOES_RESUMO.find(x => x.k === d.visao);
  const campo = v.campo;
  const igual = x => (x[campo] || "(vazio)") === (d.chave || "(vazio)");

  let f, ms, k, opt = {};
  if (d.visao === "mes") {
    const linha = DDATA.find(x => x[0] === d.mesAno);
    ms = linha ? [linha] : DDATA;
    f = FATO.filter(x => x.mesAno === d.mesAno);
    k = kpis(f, ms);
    opt.rotuloDias = "no mês";
  } else {
    ms = DDATA;
    f = FATO.filter(igual);
    k = Object.assign({}, kpis(f, ms));
    const escopo = consolidar(resumoMensal(FATO, DDATA, campo))
      .find(l => (l.chave || "(vazio)") === (d.chave || "(vazio)"));
    if (campo === "polo") {
      k.Meta_Insp = escopo ? escopo.meta : 0;
      k.Meta_insp_dia = escopo ? escopo.metaDia : 0;
      k.pctInspecao = escopo ? escopo.pct : null;
      // meses COM META, não todos os da tela: com os 12 do ano, um polo de um
      // inspetor só mostrava "12" onde a meta era de 5 meses.
      k.Qtd_Inspetor = inspetoresValidos().filter(i => i[1] === d.chave).length
        * mesesComMeta(ms).length;
      opt.semMeta = !k.Meta_Insp;
    } else {
      opt.semMeta = true;   // equipe não tem meta de inspeção
    }
  }

  const nome = d.visao === "mes" ? nomeMes(d.mesAno) : (d.chave || "(vazio)");
  R.painelTitulo.textContent = `Relatório de ${nome} (sem filtros)`;
  R.painelTitulo.title = `Os mesmos números do resumo geral, recortados para ${nome}.`;

  R.painelResumo.innerHTML =
    `<button class="rp-voltar">← ${v.rot.toLowerCase()}</button>` + blocosResumo(k, gravidades(f), opt);
  R.painelResumo.querySelector(".rp-voltar").onclick = () => {
    detalheResumo = null; resumoPainel();
  };
}

function resumoPainelGeral() {
  const f = FATO, ms = DDATA;
  R.painelResumo.innerHTML = blocosResumo(kpis(f, ms), gravidades(f), {});
}

/* Os mesmos blocos do resumo geral, mas alimentados por fora: servem tanto ao
   ano inteiro quanto ao relatório de um mês, polo ou equipe.
   opt.semMeta — o escopo não tem meta cadastrada (equipe): o progresso passa a
   ser o ICIT e os cartões de meta saem. */
function blocosResumo(k, g, opt) {
  opt = opt || {};
  const faixa = v => v === null || v === undefined ? "" : v >= 1 ? "bom" : v >= 0.8 ? "medio" : "ruim";
  // mesmas faixas do velocímetro do ICIT
  const faixaIcit = v => v === null || v === undefined ? "" : v >= 0.85 ? "bom" : v >= 0.6 ? "medio" : "ruim";

  const cartoes = [
    ["Inspeções realizadas", fmtN(k.Qtd_Insp), ""],
    ...(opt.semMeta ? [] : [
      ["Meta de inspeções", fmtN(k.Meta_Insp), ""],
      ["Meta até hoje", fmtD(k.Meta_insp_dia, 1), ""]]),
    ["ICIT (conformidade)", fmtP(k.ICIT), faixaIcit(k.ICIT)],
    ["Inspeções com N.C", fmtN(k.Qtd_Inspecao_NC), "ruim"],
    ["N.C apontadas", fmtN(k.Qtd_NC), "ruim"]
  ];

  /* Parte das N.C vem da origem sem gravidade preenchida. Sem esta quarta
     linha a soma das barras fica menor que o total de N.C apontadas. */
  const desvios = [
    ["Gravíssimo", g["Gravíssimo"], "var(--ruim)", ""],
    ["Grave", g["Grave"], "var(--medio)", ""],
    ["Leve", g["Leve"], "var(--c2)", ""],
    ["Sem classificação", g[""], "var(--txt3)",
      "Não conformidades que vieram sem gravidade preenchida na origem"]
  ].filter(d => d[1] > 0);
  const totalDesvios = desvios.reduce((a, d) => a + (d[1] || 0), 0);

  // sem meta cadastrada, o indicador de topo passa a ser o ICIT
  const topo = opt.semMeta
    ? { rot: "Conformidade (ICIT)", v: k.ICIT, cls: faixaIcit(k.ICIT), icone: "🛡️",
        pe: [`Visitas sem problema: ${fmtN(k.Qtd_Insp - k.Qtd_Inspecao_NC)}`,
             `Inspeções: ${fmtN(k.Qtd_Insp)}`] }
    : { rot: "Progresso geral", v: k.pctInspecao, cls: faixa(k.pctInspecao), icone: "🎯",
        pe: [`Meta: ${fmtN(k.Meta_Insp)}`, `Realizado: ${fmtN(k.Qtd_Insp)}`] };

  return `
    <div class="rg">
      <div class="rg-progresso">
        <div class="rg-cab"><span>${topo.rot}</span><span class="rg-alvo">${topo.icone}</span></div>
        <div class="rg-pct ${topo.cls}">${fmtP(topo.v)}</div>
        <div class="rg-barra"><i class="${topo.cls}"
          style="width:${Math.min(100, (topo.v || 0) * 100).toFixed(1)}%"></i></div>
        <div class="rg-pe">${topo.pe.map(t => `<span>${t}</span>`).join("")}</div>
      </div>

      <div class="rg-cartoes">
        ${cartoes.map(([rot, val, cls]) => `<div class="rg-card"${
            EXPLICACAO[rot] ? ` title="${EXPLICACAO[rot]}"` : ""}>
          <div class="rg-val ${cls}">${val}</div>
          <div class="rg-rot">${rot}</div>
          ${RESUMO_DICA[rot] ? `<div class="rg-dica">${RESUMO_DICA[rot]}</div>` : ""}</div>`).join("")}
      </div>

      <div class="rg-nota">Uma visita entra uma vez só em <b>inspeções com N.C</b>, mas pode
        reprovar vários itens do checklist${k.Qtd_Inspecao_NC ? `: as ${fmtN(k.Qtd_Inspecao_NC)}
        visitas com problema geraram ${fmtN(k.Qtd_NC)} apontamentos, média de
        ${fmtD(k.Qtd_NC / k.Qtd_Inspecao_NC, 1)} por visita` : ""}.</div>

      <div class="rg-desvios">
        <div class="rg-cab"><span>Desvios por gravidade</span>
          <b title="Soma igual ao total de N.C apontadas">${fmtN(totalDesvios)}</b></div>
        ${desvios.map(([nome, qtd, cor, dica]) => `<div class="rg-linha"${dica ? ` title="${dica}"` : ""}>
          <i style="background:${cor}"></i><span>${nome}</span>
          <div class="rg-mini"><i style="background:${cor};width:${
            totalDesvios ? ((qtd || 0) / totalDesvios * 100).toFixed(1) : 0}%"></i></div>
          <b>${fmtN(qtd)}</b>
          <em>${totalDesvios ? fmtP((qtd || 0) / totalDesvios, 0) : "—"}</em></div>`).join("")}
      </div>

      <div class="rg-pedaco">
        ${opt.semMeta ? "" : `<span>Inspetores × meses com meta <b>${fmtN(k.Qtd_Inspetor)}</b></span>`}
        <span>Dias úteis ${opt.rotuloDias || "no período com meta"} / até hoje
          <b>${k.Dias_uteis} / ${k.Dias_uteis_ate_hoje}</b></span>
      </div>
    </div>`;
}

/* ---------- dois modos de layout ----------
   "canvas": telas largas — canvas 1510x720 escalado, fiel ao Power BI
   "fluido": telas estreitas — os mesmos visuais reempilhados em grade  */
const LARGURA_CANVAS = 1100;

function escalar() {
  const fluido = window.innerWidth < LARGURA_CANVAS;
  document.body.dataset.modo = fluido ? "fluido" : "canvas";
  if (fluido) {
    canvas.style.transform = "none";
  } else {
    const s = Math.min(window.innerWidth / 1510, window.innerHeight / 720);
    canvas.style.transform = `scale(${s})`;
  }
  return fluido;
}

/* Os gráficos leem clientWidth/clientHeight, então precisam ser redesenhados
   sempre que o layout muda de tamanho. */
let tRedesenho;
function aoRedimensionar() {
  escalar();
  clearTimeout(tRedesenho);
  tRedesenho = setTimeout(render, 120);
}
window.addEventListener("resize", aoRedimensionar);
window.addEventListener("orientationchange", aoRedimensionar);

/* ---------- marca aplicada ao documento ---------- */
// ícone da aba / do atalho no celular
["icon", "apple-touch-icon"].forEach(rel => {
  const l = document.createElement("link");
  l.rel = rel; l.href = ICONE_TECCEL; l.type = "image/png";
  document.head.appendChild(l);
});
// foto de fundo do pódio, entregue ao CSS por variável
document.documentElement.style.setProperty("--foto-podio", `url("${FOTO_PODIO}")`);

escalar();
irPara(location.hash.slice(1) || "painel");

const esc = t => String(t == null ? "" : t)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

/* ============================================================
   PORTA — o painel não abre sem login

   Decidido em 26/08/2026: nem os números nem os cadastros ficam
   visíveis para quem não entrou. Administrador e inspetor têm
   conta; quem não tem, não vê nada.

   A tela cobre o painel inteiro em vez de esvaziá-lo: painel
   vazio parece defeito, e alguém ia tentar "consertar".
   ============================================================ */
const Porta = {
  el: null,

  mostrar(aviso) {
    if (!this.el) {
      this.el = document.createElement("div");
      this.el.className = "porta";
      document.body.appendChild(this.el);
    }
    this.el.innerHTML = `
      <form class="porta-caixa">
        <img class="porta-logo" src="${LOGO_TECCEL}" alt="Teccel Energia">
        <h1>Painel de Inspeções</h1>
        <p class="porta-sub">SESMT · Regional Oeste</p>
        <p class="porta-txt">Entre com a sua conta. Se ainda não tem,
          fale com o administrador do painel.</p>
        <label class="porta-campo"><span>E-mail</span>
          <input name="email" type="email" required autocomplete="username"
                 inputmode="email" autocapitalize="none" spellcheck="false"></label>
        <label class="porta-campo"><span>Senha</span>
          <input name="senha" type="password" required autocomplete="current-password"></label>
        <div class="porta-erro">${aviso ? esc(aviso) : ""}</div>
        <button class="porta-ok" type="submit">Entrar</button>
      </form>`;
    document.body.classList.add("trancado");

    const f = this.el.querySelector("form");
    f.onsubmit = async ev => {
      ev.preventDefault();
      const b = f.querySelector(".porta-ok");
      b.disabled = true; b.textContent = "Entrando…";
      try {
        await Banco.entrar(f.elements.email.value.trim(), f.elements.senha.value);
        await this.abrir();
      } catch (e) {
        this.mostrar(e.message);
        f.elements.email.value = f.elements.email.value;
      }
    };
    f.elements.email.focus();
  },

  /* Entrou: carrega cadastro, traz as inspeções do banco e destranca.

     Falha ao buscar as inspeções NÃO tranca de volta. Quem entrou,
     entrou: mandá-lo para a tela de login por causa de uma consulta que
     não respondeu faria parecer que a senha estava errada. Abre o painel
     com o que houver e avisa — dá para tentar de novo no ⟳ Sincronizar. */
  async abrir() {
    if (this.el) this.el.innerHTML =
      `<div class="porta-caixa"><p class="porta-txt">Carregando o painel…</p></div>`;
    await Cadastros.carregar();
    let recado = null;
    try {
      const ok = await Sincronia.sincronizar();
      if (!ok) recado = Sincronia.erro;
    } catch (e) {
      recado = e.message;
    }
    if (this.el) { this.el.remove(); this.el = null; }
    document.body.classList.remove("trancado");
    render();
    if (paginaAtual === "ajustes") Ajustes.render();
    if (recado) this.avisarFalha(recado);
  },

  /* Faixa no topo: o painel abriu, mas está mostrando só o histórico
     do arquivo. Sem isso o número apareceria menor sem explicação. */
  avisarFalha(motivo) {
    const d = document.createElement("div");
    d.className = "porta-falha";
    d.innerHTML = `<b>As inspeções não vieram do banco.</b> O painel está
      mostrando apenas o histórico. Motivo: ${esc(motivo)}.
      Tente de novo em Ajustes, no botão ⟳ Sincronizar.
      <button aria-label="Fechar">✕</button>`;
    d.querySelector("button").onclick = () => d.remove();
    document.body.appendChild(d);
  },

  /* Saiu: tranca de novo e apaga o que estava na tela. */
  trancar() {
    Banco.sair();
    Sincronia.esquecer();
    this.mostrar();
  }
};

/* O painel só abre com login. Se já houver sessão guardada, entra direto;
   senão, mostra a porta. */
if (Banco.autenticado()) {
  Porta.abrir().catch(() => Porta.mostrar("A sessão expirou. Entre de novo."));
} else {
  Porta.mostrar();
}
