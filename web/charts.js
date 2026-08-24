/* ============================================================
   VISUAIS — SVG puro, sem bibliotecas externas
   Réplica dos tipos usados no relatório original:
   lineClusteredColumnComboChart, Tachometer, waterfallChart, tableEx, card
   ============================================================ */

const NS = "http://www.w3.org/2000/svg";
const el = (t, a = {}, txt) => {
  const n = document.createElementNS(NS, t);
  for (const k in a) if (a[k] !== null && a[k] !== undefined) n.setAttribute(k, a[k]);
  if (txt !== undefined) n.textContent = txt;
  return n;
};
const fmtN  = v => v === null || v === undefined ? "—" : Math.round(v).toLocaleString("pt-BR");
const fmtP  = (v, d = 1) => v === null || v === undefined ? "—" : (v * 100).toFixed(d).replace(".", ",") + "%";
const fmtD  = (v, d = 1) => v === null || v === undefined ? "—" : v.toFixed(d).replace(".", ",");
const corta = (s, n) => s.length > n ? s.slice(0, n - 1) + "…" : s;

/* ---------- Combo: colunas agrupadas + linha (o visual mais usado) ---------- */
function comboChart(host, dados, opt) {
  opt = Object.assign({
    series: [{ key: "qtd", label: "Realizado", cor: "var(--c1)" }],
    linha: null, rotulo: "chave", pctLinha: true, rotacionar: true,
    metaLinha: null, maxRot: 14
  }, opt);

  const W = host.clientWidth, H = host.clientHeight;
  const m = { t: 16, r: opt.linha ? 44 : 14, b: opt.rotacionar ? 62 : 30, l: 40 };
  const iw = Math.max(10, W - m.l - m.r), ih = Math.max(10, H - m.t - m.b);
  const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, width: W, height: H, class: "chart" });
  host.innerHTML = "";
  host.appendChild(svg);
  if (!dados.length) { svg.appendChild(el("text", { x: W / 2, y: H / 2, class: "vazio", "text-anchor": "middle" }, "sem dados")); return; }

  const maxV = Math.max(1, ...dados.flatMap(d => opt.series.map(s => d[s.key] || 0)));
  const esc  = v => ih - (v / maxV) * ih;
  const bw   = iw / dados.length;
  const sw   = Math.min(26, (bw * 0.68) / opt.series.length);

  const g = el("g", { transform: `translate(${m.l},${m.t})` });
  svg.appendChild(g);

  /* grade + eixo Y */
  for (let i = 0; i <= 4; i++) {
    const y = ih - (ih / 4) * i, v = (maxV / 4) * i;
    g.appendChild(el("line", { x1: 0, x2: iw, y1: y, y2: y, class: "grade" }));
    g.appendChild(el("text", { x: -8, y: y + 4, class: "eixo", "text-anchor": "end" }, fmtN(v)));
  }

  /* colunas */
  dados.forEach((d, i) => {
    const x0 = i * bw + (bw - sw * opt.series.length) / 2;
    opt.series.forEach((s, j) => {
      const v = d[s.key] || 0, y = esc(v);
      const r = el("rect", { x: x0 + j * sw, y, width: sw - 2, height: Math.max(0, ih - y), fill: s.cor, rx: 2, class: "barra" });
      r.appendChild(el("title", {}, `${d[opt.rotulo]}\n${s.label}: ${fmtN(v)}`));
      g.appendChild(r);
      if (v > 0 && dados.length <= 20)
        g.appendChild(el("text", { x: x0 + j * sw + (sw - 2) / 2, y: y - 4, class: "rotulo", "text-anchor": "middle" }, fmtN(v)));
    });
  });

  /* meta como linha de referência */
  if (opt.metaLinha !== null && opt.metaLinha !== undefined && opt.metaLinha <= maxV) {
    const y = esc(opt.metaLinha);
    g.appendChild(el("line", { x1: 0, x2: iw, y1: y, y2: y, class: "meta" }));
  }

  /* linha secundária (%) */
  if (opt.linha) {
    const vals = dados.map(d => d[opt.linha.key]);
    const finitos = vals.filter(v => v !== null && v !== undefined);
    const maxL = opt.pctLinha ? Math.max(1, ...finitos) : Math.max(1, ...finitos);
    const escL = v => ih - (v / maxL) * ih;
    let dpath = "", prev = false;
    dados.forEach((d, i) => {
      const v = d[opt.linha.key], x = i * bw + bw / 2;
      if (v === null || v === undefined) { prev = false; return; }
      dpath += (prev ? "L" : "M") + x + " " + escL(v);
      prev = true;
    });
    g.appendChild(el("path", { d: dpath, fill: "none", stroke: opt.linha.cor || "var(--c-linha)", "stroke-width": 2.5, "stroke-linejoin": "round" }));
    dados.forEach((d, i) => {
      const v = d[opt.linha.key];
      if (v === null || v === undefined) return;
      const x = i * bw + bw / 2, y = escL(v);
      const c = el("circle", { cx: x, cy: y, r: 3.5, fill: opt.linha.cor || "var(--c-linha)" });
      c.appendChild(el("title", {}, `${d[opt.rotulo]}\n${opt.linha.label}: ${opt.pctLinha ? fmtP(v) : fmtD(v)}`));
      g.appendChild(c);
      if (dados.length <= 16)
        g.appendChild(el("text", { x, y: y - 9, class: "rotulo-linha", "text-anchor": "middle" }, opt.pctLinha ? fmtP(v, 0) : fmtD(v, 0)));
    });
    for (let i = 0; i <= 4; i++) {
      const y = ih - (ih / 4) * i, v = (maxL / 4) * i;
      g.appendChild(el("text", { x: iw + 8, y: y + 4, class: "eixo eixo2" }, opt.pctLinha ? fmtP(v, 0) : fmtD(v, 0)));
    }
  }

  /* eixo X */
  dados.forEach((d, i) => {
    const x = i * bw + bw / 2;
    const t = el("text", { x, y: ih + 14, class: "eixo", "text-anchor": opt.rotacionar ? "end" : "middle" },
      corta(String(d[opt.rotulo]), opt.maxRot));
    if (opt.rotacionar) t.setAttribute("transform", `rotate(-35 ${x} ${ih + 14})`);
    g.appendChild(t);
  });
}

/* ---------- Tachometer (velocímetro) ---------- */
function gauge(host, valor, opt) {
  opt = Object.assign({ min: 0, max: 1, faixas: [0.5, 0.8], formato: fmtP, alvo: null }, opt);
  const W = host.clientWidth, H = host.clientHeight;
  const cx = W / 2, cy = H * 0.72, R = Math.min(W * 0.42, H * 0.62), r = R * 0.62;
  const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, width: W, height: H, class: "chart" });
  host.innerHTML = ""; host.appendChild(svg);

  const ang = v => Math.PI * (1 - Math.min(1, Math.max(0, (v - opt.min) / (opt.max - opt.min))));
  const arco = (a0, a1, cor) => {
    const p = (a, rr) => [cx + rr * Math.cos(a), cy - rr * Math.sin(a)];
    const [x0, y0] = p(a0, R), [x1, y1] = p(a1, R), [x2, y2] = p(a1, r), [x3, y3] = p(a0, r);
    const large = Math.abs(a1 - a0) > Math.PI ? 1 : 0;
    return el("path", {
      d: `M${x0} ${y0} A${R} ${R} 0 ${large} 1 ${x1} ${y1} L${x2} ${y2} A${r} ${r} 0 ${large} 0 ${x3} ${y3} Z`,
      fill: cor
    });
  };
  const lim = [opt.min, ...opt.faixas, opt.max];
  const cores = ["var(--ruim)", "var(--medio)", "var(--bom)"];
  for (let i = 0; i < lim.length - 1; i++) svg.appendChild(arco(ang(lim[i]), ang(lim[i + 1]), cores[i] || "var(--bom)"));

  if (valor !== null && valor !== undefined) {
    const a = ang(valor);
    const px = cx + (R * 0.98) * Math.cos(a), py = cy - (R * 0.98) * Math.sin(a);
    svg.appendChild(el("line", { x1: cx, y1: cy, x2: px, y2: py, class: "ponteiro" }));
    svg.appendChild(el("circle", { cx, cy, r: 6, class: "pivo" }));
  }
  svg.appendChild(el("text", { x: cx, y: cy + 34, class: "gauge-valor", "text-anchor": "middle" }, opt.formato(valor)));
  svg.appendChild(el("text", { x: cx - R - 2, y: cy + 16, class: "eixo", "text-anchor": "middle" }, opt.formato(opt.min, 0)));
  svg.appendChild(el("text", { x: cx + R + 2, y: cy + 16, class: "eixo", "text-anchor": "middle" }, opt.formato(opt.max, 0)));
}

/* ---------- Waterfall (inconformidades por categoria) ---------- */
function waterfall(host, dados) {
  const W = host.clientWidth, H = host.clientHeight;
  const m = { t: 18, r: 12, b: 58, l: 38 };
  const iw = W - m.l - m.r, ih = H - m.t - m.b;
  const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, width: W, height: H, class: "chart" });
  host.innerHTML = ""; host.appendChild(svg);
  if (!dados.length) { svg.appendChild(el("text", { x: W / 2, y: H / 2, class: "vazio", "text-anchor": "middle" }, "sem dados")); return; }

  const total = dados.reduce((a, d) => a + d.qtd, 0);
  const passos = [...dados, { chave: "Total", qtd: total, total: true }];
  const max = total;
  const bw = iw / passos.length, sw = Math.min(40, bw * 0.62);
  const g = el("g", { transform: `translate(${m.l},${m.t})` });
  svg.appendChild(g);
  for (let i = 0; i <= 4; i++) {
    const y = ih - (ih / 4) * i;
    g.appendChild(el("line", { x1: 0, x2: iw, y1: y, y2: y, class: "grade" }));
    g.appendChild(el("text", { x: -8, y: y + 4, class: "eixo", "text-anchor": "end" }, fmtN((max / 4) * i)));
  }
  let acc = 0;
  passos.forEach((d, i) => {
    const x = i * bw + (bw - sw) / 2;
    const y0 = ih - (acc / max) * ih;
    const alt = (d.qtd / max) * ih;
    const y = d.total ? ih - alt : y0 - alt;
    const rect = el("rect", { x, y, width: sw, height: Math.max(1, alt), rx: 2, fill: d.total ? "var(--c-total)" : "var(--ruim)" });
    rect.appendChild(el("title", {}, `${d.chave}: ${d.qtd}`));
    g.appendChild(rect);
    g.appendChild(el("text", { x: x + sw / 2, y: y - 5, class: "rotulo", "text-anchor": "middle" }, fmtN(d.qtd)));
    if (!d.total) acc += d.qtd;
    const t = el("text", { x: x + sw / 2, y: ih + 14, class: "eixo", "text-anchor": "end" }, corta(d.chave, 16));
    t.setAttribute("transform", `rotate(-35 ${x + sw / 2} ${ih + 14})`);
    g.appendChild(t);
  });
}

/* ---------- Barras horizontais (TOP 5 inconformidades) ---------- */
function barrasH(host, dados, opt) {
  opt = Object.assign({ cor: "var(--ruim)", maxRot: 46 }, opt);
  const W = host.clientWidth, H = host.clientHeight;
  const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, width: W, height: H, class: "chart" });
  host.innerHTML = ""; host.appendChild(svg);
  if (!dados.length) { svg.appendChild(el("text", { x: W / 2, y: H / 2, class: "vazio", "text-anchor": "middle" }, "sem dados")); return; }
  const max = Math.max(...dados.map(d => d.qtd));
  const alt = Math.min(34, (H - 12) / dados.length);
  dados.forEach((d, i) => {
    const y = 8 + i * alt;
    const larg = (d.qtd / max) * (W - 40);
    const r = el("rect", { x: 0, y, width: Math.max(2, larg), height: alt - 8, rx: 2, fill: opt.cor });
    r.appendChild(el("title", {}, `${d.chave}\n${d.qtd} ocorrência(s)`));
    svg.appendChild(r);
    svg.appendChild(el("text", { x: 6, y: y + (alt - 8) / 2 + 4, class: "rotulo-barra" }, corta(d.chave, opt.maxRot)));
    svg.appendChild(el("text", { x: Math.max(2, larg) + 6, y: y + (alt - 8) / 2 + 4, class: "rotulo" }, d.qtd));
  });
}

/* ---------- Tabela (tableEx) ---------- */
function tabela(host, colunas, linhas) {
  const t = document.createElement("table");
  t.className = "tbl";
  const thead = document.createElement("thead"), tr = document.createElement("tr");
  colunas.forEach(c => {
    const th = document.createElement("th");
    th.textContent = c.titulo;
    if (c.num) th.classList.add("num");
    tr.appendChild(th);
  });
  thead.appendChild(tr); t.appendChild(thead);
  const tb = document.createElement("tbody");
  linhas.forEach(l => {
    const r = document.createElement("tr");
    colunas.forEach(c => {
      const td = document.createElement("td");
      const v = c.valor(l);
      if (v instanceof Node) td.appendChild(v); else td.textContent = v;
      if (c.num) td.classList.add("num");
      if (c.classe) td.className += " " + (c.classe(l) || "");
      r.appendChild(td);
    });
    tb.appendChild(r);
  });
  t.appendChild(tb);
  host.innerHTML = ""; host.appendChild(t);
}
