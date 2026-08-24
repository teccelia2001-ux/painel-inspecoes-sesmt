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
  { id: "jornada", nome: "Jornada Segura",    icone: "🏆", desc: "Ranking de pontuação das equipes" }
];
let paginaAtual = "painel";

/* ---------- helpers de construção ---------- */
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
  marca.innerHTML = `<div class="logo">S</div><div><div class="nome">PAINEL DE INSPEÇÕES</div>
    <div class="sub">SESMT · Obras RD · Regional Oeste</div></div>`;
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
  [["ano", "Ano"], ["mes", "Mês"], ["area", "Área"], ["inspetor", "Inspetor"],
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
  s.textContent = "Atualizado em " + ATUALIZACAO;
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
  marca.innerHTML = `<div class="logo">S</div><div><div class="nome">PAINEL DE INSPEÇÕES</div>
    <div class="sub">SESMT · Obras RD · Regional Oeste</div></div>`;
  pg.appendChild(marca);

  R.painelAtt = cartao(pg, 1180, 8, 300, 62, "Última atualização");

  PAGINAS.slice(1).forEach((p, i) => {
    const d = box(pg, 60, 130 + i * 82, 560, 66);
    const b = document.createElement("button");
    b.className = "menu-btn";
    b.innerHTML = `<span class="ic">${p.icone}</span><span>${p.nome}<span class="desc">${p.desc}</span></span>`;
    b.onclick = () => irPara(p.id);
    d.appendChild(b);
  });

  const res = box(pg, 680, 130, 770, 476, "painel");
  res.innerHTML = `<div class="titulo">Resumo geral (sem filtros)</div>`;
  const c = document.createElement("div"); c.className = "corpo"; res.appendChild(c);
  R.painelResumo = c;
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
    { k: "qtd", rot: "Realizado", cls: "destaque" }, { k: "media", rot: "Média/dia útil" }
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
  R.joPodio  = visual(pg, 951, 163, 537, 512, "Pódio");
  return pg;
}

/* ---------- montagem ---------- */
[pgPainel(), pgTaxa(), pgRanking(), pgAvanco(), pgIcit(), pgDia(), pgJornada()]
  .forEach(p => canvas.appendChild(p));
canvas.appendChild(abas());

function irPara(id) {
  if (!PAGINAS.some(p => p.id === id)) id = "painel";
  paginaAtual = id;
  canvas.querySelectorAll(".pagina").forEach(p => p.classList.toggle("ativa", p.id === "pg-" + id));
  canvas.querySelectorAll(".abas button").forEach(b => b.classList.toggle("on", b.dataset.pg === id));
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
      const d = porInsp.filter(g => funcoes.includes((IDX_INSPETOR[g.chave] || [])[4]))
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
    const linhas = porInspetor(f, ms, true).sort((a, b) => (b.pct ?? -1) - (a.pct ?? -1));
    tabela(R.rkTabela, [
      { titulo: "#", valor: (l, i) => "", num: true },
      { titulo: "Inspetor", valor: l => l.chave },
      { titulo: "Função", valor: l => (IDX_INSPETOR[l.chave] || ["","","","",""])[4] },
      { titulo: "Área", valor: l => (IDX_INSPETOR[l.chave] || ["","",""])[2] },
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
      linha: { key: "icit", label: "ICIT" }, maxRot: 12
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
    const dias = porDia(f);
    setCards(R.diCards, Object.assign({}, base, {
      media: dias.length ? fmtD(k.Qtd_Insp / dias.length, 1) : "—"
    }));
    comboChart(R.diChart, dias, {
      series: [{ key: "qtd", label: "Inspeções", cor: "var(--c1)" }, { key: "nc", label: "Com N.C", cor: "var(--ruim)" }],
      maxRot: 6
    });
    legendaUnica(R.diChart, [{ cor: "var(--c1)", txt: "Inspeções" }, { cor: "var(--ruim)", txt: "Com N.C" }]);
  }

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
    const top = j.slice(0, 3);
    R.joPodio.innerHTML = top.length ? `
      <div class="podio">
        <div class="tit">🥇 Equipe destaque</div>
        <div class="eq">${top[0].equipe}</div>
        <div class="pts">${fmtN(top[0].pontosFinal)} pontos · ICIT ${fmtP(top[0].icit, 0)} · ${top[0].qtd} inspeções</div>
        ${top.map((l, i) => `<div class="lugar"><span class="medalha">${["🥇","🥈","🥉"][i]}</span>
           <span>${l.equipe}</span><b>${fmtN(l.pontosFinal)}</b></div>`).join("")}
      </div>` : `<div class="podio"><div class="tit">sem dados</div></div>`;
  }
}

function legendaUnica(host, itens) {
  const pai = host.parentElement;
  const velha = pai.querySelector(".legenda");
  if (velha) velha.remove();
  legenda(host, itens);
}

function resumoPainel() {
  const f = FATO, ms = DDATA, k = kpis(f, ms);
  const g = gravidades(f);
  const linhas = [
    ["Inspeções realizadas", fmtN(k.Qtd_Insp)],
    ["Meta de inspeções", fmtN(k.Meta_Insp)],
    ["Meta proporcional aos dias úteis", fmtD(k.Meta_insp_dia, 1)],
    ["% da meta atingida", fmtP(k.pctInspecao)],
    ["Inspeções com não conformidade", fmtN(k.Qtd_Inspecao_NC)],
    ["Não conformidades apontadas", fmtN(k.Qtd_NC)],
    ["ICIT (conformidade)", fmtP(k.ICIT)],
    ["Desvios gravíssimos / graves / leves", `${g["Gravíssimo"]} / ${g["Grave"]} / ${g["Leve"]}`],
    ["Inspetores × meses com meta", fmtN(k.Qtd_Inspetor)],
    ["Dias úteis no ano / até hoje", `${k.Dias_uteis} / ${k.Dias_uteis_ate_hoje}`]
  ];
  tabela(R.painelResumo, [
    { titulo: "Indicador", valor: l => l[0] },
    { titulo: "Valor", valor: l => l[1], num: true }
  ], linhas);
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

escalar();
irPara(location.hash.slice(1) || "painel");
