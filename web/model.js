/* ============================================================
   MODELO SEMÂNTICO — réplica em JS das medidas DAX do relatório
   ============================================================ */

const IDX_INSPETOR = Object.fromEntries(INSPETORES.map(r => [r[0], r]));
const IDX_EQUIPE   = Object.fromEntries(EQUIPES.map(r => [r[0], r]));
const NC_BY_ID     = NC.reduce((a, r) => ((a[r[0]] = a[r[0]] || []).push(r), a), {});
const MESES_NOME   = ["","jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];

/* Enriquecimento das inspeções: {id, inspetor, equipe, tipo, data, mesAno, serial, dia, area, funcao, supervisor, tipoEquipe} */
const FATO = INSPECOES.map(r => {
  const [d, m, y] = r[4].split("/").map(Number);
  const mesAno = m + "/" + y;
  // As dimensões INSPETOR e EQUIPE se ligam ao fato por chaves versionadas por mês
  // (INSPETOR_ID / EQUIPE_ID em "Meta Inspetores" e "Equipes"). Meses sem cadastro
  // não casam e caem no grupo "(vazio)", exatamente como no relatório original.
  const vigente = META_MESES.includes(mesAno);
  const insp = vigente ? IDX_INSPETOR[r[1]] : null;
  const eq   = vigente ? IDX_EQUIPE[r[2]]   : null;
  return {
    id: r[0], inspetor: insp ? r[1] : "", inspetorBruto: r[1],
    equipe: eq ? r[2] : "", equipeBruta: r[2],
    tipo: r[3], data: new Date(y, m - 1, d),
    dataStr: r[4], mesAno, serial: "" + y + String(m).padStart(2, "0"),
    ano: "" + y, mes: "" + m,
    area: insp ? insp[2] : "", funcao: insp ? insp[4] : "", cargo: insp ? insp[1] : "",
    supervisor: eq ? eq[2] : "", tipoEquipe: eq ? eq[1] : ""
  };
});

/* ---------- Filtros ---------- */
const CAMPOS = ["ano", "mes", "area", "inspetor", "funcao", "supervisor", "equipe"];
const filtros = Object.fromEntries(CAMPOS.map(c => [c, new Set()]));

const ativo = c => filtros[c].size > 0;
const bate  = (c, v) => !ativo(c) || filtros[c].has(v);

/* Meses (Mês/Ano) que sobrevivem aos filtros de data */
function mesesAtivos() {
  return DDATA.filter(d => {
    const [m, y] = d[0].split("/");
    return bate("ano", y) && bate("mes", m);
  });
}

/* Inspeções filtradas */
function fatoFiltrado(ignorar) {
  const ig = new Set(ignorar || []);
  const ok = (c, v) => ig.has(c) || bate(c, v);
  return FATO.filter(f =>
    ok("ano", f.ano) && ok("mes", f.mes) && ok("area", f.area) &&
    ok("inspetor", f.inspetor) && ok("funcao", f.funcao) &&
    ok("supervisor", f.supervisor) && ok("equipe", f.equipe));
}

/* ---------- Medidas ---------- */
// #Medidas
function Dias_uteis(ms)          { return (ms || mesesAtivos()).reduce((a, d) => a + d[2], 0); }
function Dias_uteis_ate_hoje(ms) { return (ms || mesesAtivos()).reduce((a, d) => a + d[3], 0); }

function inspetoresValidos() {
  return INSPETORES.filter(i => bate("area", i[2]) && bate("inspetor", i[0]) && bate("funcao", i[4]));
}
function Qtd_Inspetor(ms) {
  const meses = (ms || mesesAtivos()).map(d => d[0]).filter(m => META_MESES.includes(m));
  return inspetoresValidos().length * meses.length;
}
// Meta_Insp = SUMX('Meta Inspetores'; [META INSPEÇÃO DINAMICA]) — metas versionadas por mês
function Meta_Insp(ms) {
  const meses = (ms || mesesAtivos()).map(d => d[0]).filter(m => META_MESES.includes(m));
  const porMes = inspetoresValidos().reduce((a, i) => a + i[5], 0);
  return porMes * meses.length;
}
// Meta_insp_dia = Meta_Insp / Dias_uteis * Dias_uteis_até_hoje
function Meta_insp_dia(ms) {
  const du = Dias_uteis(ms);
  return du ? Meta_Insp(ms) / du * Dias_uteis_ate_hoje(ms) : 0;
}

// #Medidas_Teccel
const Qtd_Insp        = f => f.length;
const linhasNC        = f => f.flatMap(x => NC_BY_ID[x.id] || []);
const Qtd_NC          = f => linhasNC(f).length;
const Qtd_Inspecao_NC = f => new Set(linhasNC(f).map(r => r[0])).size;
const ICIT            = f => f.length ? (f.length - Qtd_Inspecao_NC(f)) / f.length : null;
const PontosNC        = f => linhasNC(f).reduce((a, r) => a + r[4], 0);

const pct = (a, b) => (b ? a / b : null);
// % Atingida = MIN(DIVIDE([Qtd]; [Meta_insp_dia]); 1) — o original limita em 100%
const pctAtingida = (a, b) => (b ? Math.min(a / b, 1) : null);

/* Pacote de KPIs do cabeçalho */
function kpis(f, ms) {
  f  = f  || fatoFiltrado();
  ms = ms || mesesAtivos();
  const q = Qtd_Insp(f), nc = Qtd_Inspecao_NC(f), meta = Meta_Insp(ms), md = Meta_insp_dia(ms);
  return {
    Qtd_Insp: q, Qtd_Inspecao_NC: nc, Qtd_NC: Qtd_NC(f),
    Meta_Insp: meta, Meta_insp_dia: md,
    Dias_uteis: Dias_uteis(ms), Dias_uteis_ate_hoje: Dias_uteis_ate_hoje(ms),
    Qtd_Inspetor: Qtd_Inspetor(ms),
    ICIT: ICIT(f),
    pctInspecao: pctAtingida(q, md), // %Inspeção_Teccel (= % Atingida, limitado a 100%)
    pctMetaTotal: pct(q, meta)      // %MetaInspTeccelTotal
  };
}

/* Agrupamento genérico: devolve [{chave, fato[], qtd, nc, icit, meta, metaDia, pct}] */
function agrupar(f, campo, ms) {
  ms = ms || mesesAtivos();
  const mapa = new Map();
  f.forEach(x => {
    const k = x[campo] || "(vazio)";
    if (!mapa.has(k)) mapa.set(k, []);
    mapa.get(k).push(x);
  });
  return [...mapa].map(([k, rows]) => {
    let meta = 0, metaDia = 0;
    if (campo === "inspetor") {
      const i = IDX_INSPETOR[k];
      const meses = ms.map(d => d[0]).filter(m => META_MESES.includes(m)).length;
      const du = Dias_uteis(ms);
      meta = i ? i[5] * meses : 0;
      metaDia = du ? meta / du * Dias_uteis_ate_hoje(ms) : 0;
    }
    const nc = Qtd_Inspecao_NC(rows);
    return {
      chave: k, fato: rows, qtd: rows.length, nc, ncLinhas: Qtd_NC(rows),
      icit: ICIT(rows), meta, metaDia, pct: pctAtingida(rows.length, metaDia),
      pctTotal: pct(rows.length, meta), pontosNC: PontosNC(rows)
    };
  });
}

/* Agrupamento por inspetor incluindo quem tem meta mas nenhuma inspeção
   (o original lista todos os cadastrados em "Meta Inspetores") */
function porInspetor(f, ms, comVazio) {
  ms = ms || mesesAtivos();
  const g = agrupar(f, "inspetor", ms);
  const achados = new Set(g.map(x => x.chave));
  const meses = ms.map(d => d[0]).filter(m => META_MESES.includes(m)).length;
  const du = Dias_uteis(ms), duh = Dias_uteis_ate_hoje(ms);
  inspetoresValidos().forEach(i => {
    if (achados.has(i[0])) return;
    const meta = i[5] * meses;
    g.push({
      chave: i[0], fato: [], qtd: 0, nc: 0, ncLinhas: 0, icit: null,
      meta, metaDia: du ? meta / du * duh : 0, pct: 0, pctTotal: 0, pontosNC: 0
    });
  });
  return g.filter(x => comVazio || x.chave !== "(vazio)");
}

/* Jornada Segura — pontuação por equipe */
function jornada(f, ms) {
  ms = ms || mesesAtivos();
  const mesesPonto = ms.map(d => d[0]).filter(m => META_MESES.includes(m)).length;
  const linhas = agrupar(f, "equipe", ms).map(g => {
    const eq = IDX_EQUIPE[g.chave];
    const ini = eq ? eq[3] * mesesPonto : null;
    const fim = ini === null ? null : ini + g.pontosNC;
    return {
      equipe: g.chave, supervisor: eq ? eq[2] : "", tipo: eq ? eq[1] : "",
      qtd: g.qtd, nc: g.nc, ncLinhas: g.ncLinhas, icit: g.icit,
      pontosIniciais: ini, pontosNC: g.pontosNC, pontosFinal: fim,
      // Critério Desempate = Pontos Final + (inspeções sem N.C)/10  — confirmado no relatório original
      desempate: fim === null ? null : fim + (g.qtd - g.nc) / 10
    };
  });
  linhas.sort((a, b) => (b.desempate ?? -1e9) - (a.desempate ?? -1e9));
  linhas.forEach((l, i) => l.ranking = l.desempate === null ? null : i + 1);
  return linhas;
}

/* Séries temporais */
function porMes(f, ms) {
  ms = ms || mesesAtivos();
  return ms.map(d => {
    const rows = f.filter(x => x.mesAno === d[0]);
    const nc = Qtd_Inspecao_NC(rows);
    const temMeta = META_MESES.includes(d[0]);
    const meta = temMeta ? Meta_Insp([d]) : 0;
    return {
      chave: MESES_NOME[+d[0].split("/")[0]] + "/" + d[0].split("/")[1].slice(2),
      mesAno: d[0], qtd: rows.length, nc, ncLinhas: Qtd_NC(rows), icit: ICIT(rows),
      meta, metaDia: Meta_insp_dia([d]), pct: pct(rows.length, Meta_insp_dia([d])),
      qtdInspetor: temMeta ? inspetoresValidos().length : 0
    };
  });
}

function porDia(f) {
  const mapa = new Map();
  f.forEach(x => {
    const k = x.data.getTime();
    if (!mapa.has(k)) mapa.set(k, []);
    mapa.get(k).push(x);
  });
  return [...mapa].sort((a, b) => a[0] - b[0]).map(([k, rows]) => ({
    chave: rows[0].dataStr.slice(0, 5), data: new Date(k),
    qtd: rows.length, nc: Qtd_Inspecao_NC(rows)
  }));
}

/* Inconformidades por categoria / pergunta (grão de resposta) */
function ncPorCampo(f, i) {
  const linhas = linhasNC(f);
  const mapa = new Map();
  linhas.forEach(r => {
    const k = r[i] || "(sem categoria)";
    mapa.set(k, (mapa.get(k) || 0) + 1);
  });
  return [...mapa].map(([chave, qtd]) => ({ chave, qtd })).sort((a, b) => b.qtd - a.qtd);
}
function gravidades(f) {
  const g = { "Leve": 0, "Grave": 0, "Gravíssimo": 0, "": 0 };
  linhasNC(f).forEach(r => g[r[3]] = (g[r[3]] || 0) + 1);
  return g;
}

/* Valores disponíveis para cada slicer (respeitando os demais filtros) */
function opcoes(campo) {
  const base = fatoFiltrado([campo]);
  const vals = new Set();
  if (campo === "ano" || campo === "mes") {
    DDATA.forEach(d => {
      const [m, y] = d[0].split("/");
      vals.add(campo === "ano" ? y : m);
    });
  } else {
    base.forEach(f => { if (f[campo]) vals.add(f[campo]); });
    if (campo === "inspetor") INSPETORES.forEach(i => vals.add(i[0]));
    if (campo === "area")     INSPETORES.forEach(i => vals.add(i[2]));
    if (campo === "funcao")   INSPETORES.forEach(i => vals.add(i[4]));
  }
  return [...vals].sort((a, b) =>
    campo === "mes" ? a - b : String(a).localeCompare(String(b), "pt-BR", { numeric: true }));
}
