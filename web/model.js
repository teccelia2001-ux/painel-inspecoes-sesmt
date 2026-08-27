/* ============================================================
   MODELO SEMÂNTICO — réplica em JS das medidas DAX do relatório
   ============================================================ */

const MESES_NOME = ["","jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
/* Refeito a cada reconstrucao, nao so na carga: sincronizar troca o NC
   inteiro, e um indice velho faria a nao conformidade nova nao contar
   ponto nenhum na Jornada Segura — sem erro, so numero errado. */
let NC_BY_ID;

/* Índices e tabela de fato enriquecida. Como os cadastros de equipes e
   inspetores podem ser editados na aba Ajustes, tudo isto é reconstruído
   por reconstruirModelo() a cada alteração. */
let IDX_INSPETOR, IDX_EQUIPE, FATO;

function reconstruirModelo() {
  NC_BY_ID = NC.reduce((a, r) => ((a[r[0]] = a[r[0]] || []).push(r), a), {});

  /* Os índices aceitam o nome de hoje E os que a linha já teve. Renomear
     uma equipe no cadastro deixava órfã toda inspeção feita com o nome
     velho — ela caía em "(vazio)" e sumia da Jornada Segura, sem aviso.
     Aconteceu três vezes; a última derrubou 14 inspeções de uma vez.
     O nome atual sempre vence, caso um nome antigo colida com ele. */
  const indexar = (linhas, apelidos) => {
    const ix = {};
    linhas.forEach(r => (r[apelidos] || []).forEach(antigo => { ix[antigo] = r; }));
    linhas.forEach(r => { ix[r[0]] = r; });
    return ix;
  };
  IDX_INSPETOR = indexar(INSPETORES, 5);
  IDX_EQUIPE   = indexar(EQUIPES, 4);

  FATO = INSPECOES.map(r => {
    const [d, m, y] = r[4].split("/").map(Number);
    const mesAno = m + "/" + y;
    /* No Power BI original as dimensões INSPETOR e EQUIPE se ligavam ao fato por
       chaves versionadas por mês (INSPETOR_ID / EQUIPE_ID em "Meta Inspetores" e
       "Equipes"), e só existiam de abr a jul/2026. As inspeções de agosto ficavam
       sem equipe e sem inspetor, caindo no grupo "(vazio)" — mesmo com a equipe
       cadastrada, porque faltava a versão daquele mês.

       Aqui o cadastro é único e editável na aba Ajustes, não versionado: a
       inspeção casa pelo nome em qualquer mês. Quem continua em "(vazio)" é só
       quem realmente não está cadastrado.
       A META também deixou de ser versionada por mês em 27/08/2026: é do
       inspetor, e vale do primeiro mês com inspeção até hoje. Ver mesesComMeta(). */
    const insp = IDX_INSPETOR[r[1]];
    const eq   = IDX_EQUIPE[r[2]];
    return {
      /* Guarda o nome de HOJE, não o que veio na inspeção: assim o que
         foi feito antes do rename aparece junto com o que veio depois,
         num grupo só. O nome original fica em inspetorBruto/equipeBruta. */
      id: r[0], inspetor: insp ? insp[0] : "", inspetorBruto: r[1],
      equipe: eq ? eq[0] : "", equipeBruta: r[2],
      tipo: r[3], data: new Date(y, m - 1, d),
      dataStr: r[4], mesAno, serial: "" + y + String(m).padStart(2, "0"),
      ano: "" + y, mes: "" + m,
      polo: insp ? insp[1] : "", funcao: insp ? insp[2] : "",
      supervisor: eq ? eq[2] : "", tipoEquipe: eq ? eq[1] : ""
    };
  });
  /* Meses que valem pontuação na Jornada Segura: os que têm inspeção.
     Se um mês desconta pontos por não conformidade, ele também precisa dar os
     pontos iniciais daquele mês — senão a equipe que trabalhou no mês fica
     atrás da que não recebeu inspeção nenhuma. Vale-se dos meses com inspeção
     em vez de uma lista fixa para não precisar mexer aqui a cada mês novo. */
  MESES_COM_INSPECAO = new Set(FATO.map(x => x.mesAno));
  return FATO;
}
let MESES_COM_INSPECAO;
reconstruirModelo();

/* ============================================================
   SINCRONIZAR — traz para o painel o que o app gravou

   As inspeções antigas vivem embutidas no data.js; as novas, feitas
   pelo app, vivem no banco. Aqui as duas viram uma coisa só.

   O data.js NÃO é alterado: a junção acontece na memória, a cada
   sincronização. Assim nada se perde se a rede falhar no meio, e o
   painel continua abrindo sem login — só que, sem login, mostrando
   apenas o histórico.
   ============================================================ */
const Sincronia = {
  /* Guarda o que veio do banco, para poder refazer a junção quando o
     cadastro mudar sem precisar baixar tudo de novo. */
  doBanco: null,
  em: null,
  erro: null,
  bancoTemHistorico: false,

  /* O código do departamento no banco x o nome usado no histórico */
  DEPARTAMENTO: { DCMD_CM: "DCMD C&M", DCMD_LV: "DCMD LV", DCMD_PODA: "DCMD PODA",
                  DECP: "DECP", DEOP: "DEOP" },

  async sincronizar() {
    this.erro = null;
    try {
      const d = await Banco.baixarInspecoes();
      if (d.motivo === "sem-login") {
        this.erro = "Entre com sua conta para ver as inspeções feitas pelo app.";
        return false;
      }
      this.doBanco = d;
      this.em = new Date();
      this.aplicar();
      return true;
    } catch (e) {
      this.erro = e.message;
      return false;
    }
  },

  /* Junta o que veio do banco com o histórico e reconstrói o modelo. */
  aplicar() {
    const d = this.doBanco;
    if (!d) return;

    const porCodigo = Object.fromEntries(d.perguntas.map(p => [p.codigo, p]));
    const naoConformes = {};
    d.respostas.forEach(r => (naoConformes[r.inspecao] = naoConformes[r.inspecao] || []).push(r.pergunta));

    /* Prefixo no id para nunca colidir com o histórico, que usa número. */
    const idDe = x => "app-" + x.id.slice(0, 8);

    const inspecoes = d.inspecoes.map(x => [
      idDe(x),
      x.inspetor,
      x.equipe,
      this.DEPARTAMENTO[x.departamento] || x.departamento,
      x.data.slice(8, 10) + "/" + x.data.slice(5, 7) + "/" + x.data.slice(0, 4)
    ]);

    const nc = [];
    d.inspecoes.forEach(x => {
      (naoConformes[x.id] || []).forEach(cod => {
        const p = porCodigo[cod];
        if (!p) return;
        nc.push([idDe(x), p.texto, p.categoria || "", p.gravidade || "", p.pontos_nc || 0]);
      });
    });

    /* O banco já tem o histórico? Então ele é a única fonte, e juntar
       com o data.js dobraria tudo. Enquanto a migração 09 não roda, o
       banco só tem o que o app gravou, e aí o histórico do arquivo
       ainda faz falta. A pergunta é respondida pelo campo origem, não
       por contagem: contagem erra quando o app grava e o histórico
       ainda não foi migrado. */
    this.bancoTemHistorico = d.inspecoes.some(x => x.origem === "historico");
    INSPECOES = this.bancoTemHistorico ? inspecoes : HISTORICO.inspecoes.concat(inspecoes);
    NC = this.bancoTemHistorico ? nc : HISTORICO.nc.concat(nc);
    reconstruirModelo();
  },

  /* Volta a mostrar só o histórico — usado ao sair da conta. */
  esquecer() {
    this.doBanco = null; this.em = null; this.erro = null;
    this.bancoTemHistorico = false;
    INSPECOES = HISTORICO.inspecoes;
    NC = HISTORICO.nc;
    reconstruirModelo();
  },

  resumo() {
    if (!this.doBanco) return null;
    const doApp = this.doBanco.inspecoes.filter(x => x.origem !== "historico").length;
    return {
      inspecoes: this.doBanco.inspecoes.length,
      doApp: doApp,
      nc: this.doBanco.respostas.length,
      fonteUnica: this.bancoTemHistorico,
      em: this.em
    };
  }
};

/* ---------- Filtros ---------- */
const CAMPOS = ["ano", "mes", "polo", "inspetor", "funcao", "supervisor", "equipe"];
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
    ok("ano", f.ano) && ok("mes", f.mes) && ok("polo", f.polo) &&
    ok("inspetor", f.inspetor) && ok("funcao", f.funcao) &&
    ok("supervisor", f.supervisor) && ok("equipe", f.equipe));
}

/* ---------- Medidas ---------- */
// #Medidas
function Dias_uteis(ms)          { return (ms || mesesAtivos()).reduce((a, d) => a + d[2], 0); }
function Dias_uteis_ate_hoje(ms) { return (ms || mesesAtivos()).reduce((a, d) => a + d[3], 0); }

function inspetoresValidos() {
  return INSPETORES.filter(i => bate("polo", i[1]) && bate("inspetor", i[0]) && bate("funcao", i[2]));
}
/* Meses que contam meta: do PRIMEIRO MÊS COM INSPEÇÃO até o MÊS CORRENTE.

   Decidido em 27/08/2026. Antes a meta era versionada por mês numa lista fixa
   (META_MESES, abr–jul/2026) e agosto aparecia com meta 0 e 0,0% atingida para
   todo mundo. A meta passou a ser a do inspetor, mas valer nos 12 meses do ano
   punia duas vezes sem motivo: jan–mar, antes de as inspeções começarem, e
   set–dez, que ainda não chegaram — o atingido caía de 31% para 19%.

   O corte é pelo serial (d[1], "202604"), não por "tem inspeção no mês": assim
   um mês recém-começado já nasce com meta, em vez de zerar até alguém
   inspecionar — que é justamente o defeito que isto conserta. */
const serialDe = mesAno => {
  const [m, y] = mesAno.split("/");
  return "" + y + String(m).padStart(2, "0");
};
function mesesComMeta(ms) {
  const seriais = [...MESES_COM_INSPECAO].map(serialDe).sort();
  if (!seriais.length) return [];
  const inicio = seriais[0];             // "202604" — primeira inspeção
  const anoInicio = inicio.slice(0, 4);
  const agora = new Date();
  const fim = "" + agora.getFullYear() + String(agora.getMonth() + 1).padStart(2, "0");

  /* 2026 é a exceção: as inspeções começaram em abril, e dar meta a jan–mar
     seria cobrar de um período em que o programa nem existia. Do ano seguinte
     em diante a meta vale o ANO INTEIRO, inclusive os meses que ainda não
     chegaram — assim o painel mostra a meta anual cheia desde janeiro, e não
     uma meta que cresce mês a mês. */
  return (ms || mesesAtivos()).filter(d => {
    if (d[1] < inicio) return false;
    return d[1].slice(0, 4) > anoInicio || d[1] <= fim;
  });
}

function Qtd_Inspetor(ms) {
  return inspetoresValidos().length * mesesComMeta(ms).length;
}
// Meta_Insp — a meta cadastrada no inspetor, em cada mês que conta meta
function Meta_Insp(ms) {
  const porMes = inspetoresValidos().reduce((a, i) => a + i[3], 0);
  return porMes * mesesComMeta(ms).length;
}
/* Meta_insp_dia = Meta_Insp / Dias_uteis * Dias_uteis_até_hoje

   Os dias úteis são os dos MESES QUE TÊM META, não os de todos os meses da
   tela. Usar os 12 meses do ano dividia uma meta de 5 meses por 260 dias
   úteis: a meta até hoje saía 265 em vez de 395, e o atingido aparecia 46%
   quando era 31%. */
function Meta_insp_dia(ms) {
  const comMeta = mesesComMeta(ms);
  const du = Dias_uteis(comMeta);
  return du ? Meta_Insp(ms) / du * Dias_uteis_ate_hoje(comMeta) : 0;
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
    /* Dias úteis DOS MESES COM META — é a base que divide a meta em
       Meta_insp_dia. Mostrar aqui os dias do ano inteiro (261/169) ao lado de
       uma meta de 5 meses fazia o rodapé desmentir a própria conta. */
    Dias_uteis: Dias_uteis(mesesComMeta(ms)),
    Dias_uteis_ate_hoje: Dias_uteis_ate_hoje(mesesComMeta(ms)),
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
      const comMeta = mesesComMeta(ms);
      const du = Dias_uteis(comMeta);
      meta = i ? i[3] * comMeta.length : 0;
      metaDia = du ? meta / du * Dias_uteis_ate_hoje(comMeta) : 0;
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
  const comMeta = mesesComMeta(ms);
  const meses = comMeta.length;
  const du = Dias_uteis(comMeta), duh = Dias_uteis_ate_hoje(comMeta);
  inspetoresValidos().forEach(i => {
    if (achados.has(i[0])) return;
    const meta = i[3] * meses;
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
  // pontua todo mês que teve inspeção — o mesmo conjunto que gera os descontos
  const mesesPonto = ms.map(d => d[0]).filter(m => MESES_COM_INSPECAO.has(m)).length;
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

/* ---------- Resumo mensal ----------
   Uma linha por mês, opcionalmente desdobrada por polo ou por equipe.

   A meta é cadastrada por inspetor, então ela existe por mês e por polo (soma
   das metas de quem é daquele polo) mas NÃO por equipe — na visão por equipe
   entram no lugar os pontos da Jornada Segura.
   Todo mês tem meta: a do inspetor vale sempre (mudou em 27/08/2026). */
function nomeMes(mesAno) {
  const [m, y] = mesAno.split("/");
  return MESES_NOME[+m] + "/" + y.slice(2);
}

function resumoMensal(f, ms, campo) {
  ms = ms || mesesAtivos();
  const linhas = [];

  ms.forEach(d => {
    const mesAno = d[0];
    const doMes = f.filter(x => x.mesAno === mesAno);
    const temMeta = mesesComMeta([d]).length > 0;
    const du = Dias_uteis([d]), duh = Dias_uteis_ate_hoje([d]);
    const proporcional = meta => (du ? meta / du * duh : 0);

    const base = rows => {
      const metaDia = 0;
      return { mes: nomeMes(mesAno), mesAno, qtd: rows.length,
        nc: Qtd_Inspecao_NC(rows), ncLinhas: Qtd_NC(rows), icit: ICIT(rows),
        pontosNC: PontosNC(rows), metaDia };
    };

    if (!campo) {
      const meta = Meta_Insp([d]), metaDia = proporcional(meta);
      linhas.push(Object.assign(base(doMes), {
        chave: "", meta, metaDia, pct: pctAtingida(doMes.length, metaDia),
        inspetores: temMeta ? inspetoresValidos().length : 0
      }));
      return;
    }

    /* Chaves do mês: as que aparecem nas inspeções mais as cadastradas, para
       quem não fez nenhuma inspeção aparecer com zero em vez de sumir. */
    const chaves = new Map();
    doMes.forEach(x => {
      const k = x[campo] || "(vazio)";
      if (!chaves.has(k)) chaves.set(k, []);
      chaves.get(k).push(x);
    });
    if (campo === "polo" && temMeta)
      inspetoresValidos().forEach(i => { if (!chaves.has(i[1])) chaves.set(i[1], []); });

    // dentro do mês, quem mais inspecionou primeiro; empate resolve pelo nome
    [...chaves].sort((a, b) => b[1].length - a[1].length ||
      String(a[0]).localeCompare(String(b[0]), "pt-BR", { numeric: true }))
    .forEach(([k, rows]) => {
      let meta = 0, extra = {};
      if (campo === "polo") {
        meta = temMeta ? inspetoresValidos().filter(i => i[1] === k)
          .reduce((a, i) => a + i[3], 0) : 0;
        extra.inspetores = temMeta ? inspetoresValidos().filter(i => i[1] === k).length : 0;
      } else {
        // equipe: sem meta cadastrada; o que vale é a pontuação da Jornada Segura
        const eq = IDX_EQUIPE[k];
        extra.supervisor = eq ? eq[2] : "";
        // mesmo critério da Jornada Segura: mês com inspeção pontua
        extra.pontosIniciais = eq && MESES_COM_INSPECAO.has(mesAno) ? eq[3] : null;
      }
      const metaDia = proporcional(meta);
      const l = Object.assign(base(rows), extra, {
        chave: k, meta, metaDia, pct: meta ? pctAtingida(rows.length, metaDia) : null
      });
      if (campo === "equipe")
        l.pontosFinal = l.pontosIniciais === null ? null : l.pontosIniciais + l.pontosNC;
      linhas.push(l);
    });
  });

  /* Linhas sem inspeção e sem meta só poluiriam a tabela */
  return linhas.filter(l => l.qtd > 0 || l.meta > 0 || l.pontosIniciais);
}

/* Séries temporais */
function porMes(f, ms) {
  ms = ms || mesesAtivos();
  return ms.map(d => {
    const rows = f.filter(x => x.mesAno === d[0]);
    const nc = Qtd_Inspecao_NC(rows);
    const meta = Meta_Insp([d]);
    return {
      chave: MESES_NOME[+d[0].split("/")[0]] + "/" + d[0].split("/")[1].slice(2),
      mesAno: d[0], qtd: rows.length, nc, ncLinhas: Qtd_NC(rows), icit: ICIT(rows),
      meta, metaDia: Meta_insp_dia([d]), pct: pct(rows.length, Meta_insp_dia([d])),
      qtdInspetor: inspetoresValidos().length
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
    if (campo === "polo")     INSPETORES.forEach(i => vals.add(i[1]));
    if (campo === "funcao")   INSPETORES.forEach(i => vals.add(i[2]));
  }
  return [...vals].sort((a, b) =>
    campo === "mes" ? a - b : String(a).localeCompare(String(b), "pt-BR", { numeric: true }));
}
