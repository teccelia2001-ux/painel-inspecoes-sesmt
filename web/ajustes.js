/* ============================================================
   AJUSTES — cadastro de equipes e inspetores
   Tabela com filtros, ações por linha e diálogo de criação/edição.
   ============================================================ */

/* Sugestão de e-mail a partir do nome: "José Pereira" -> jose.pereira */
const semAcentoAj = t => String(t || "").normalize("NFD")
  .replace(/[̀-ͯ]/g, "").toLowerCase().trim();


/* Meta de inspeção que cada função ganha por padrão, ao ser escolhida no
   cadastro. É sugestão, não trava: o administrador pode digitar outro
   número por cima, e aí o campo para de acompanhar a função.

   A chave é a função sem acento e em minúsculas, e o "de" é opcional —
   "Técnico Segurança" (como está cadastrado) e "Técnico de Segurança"
   (como se escreve) caem na mesma linha. */
const META_POR_FUNCAO = {
  "supervisor": 4,
  "tecnico seguranca": 12,
  "engenheiro seguranca": 4,
  "coordenador operacional": 4,
  "gerente operacional": 2
};
const metaDaFuncao = f => META_POR_FUNCAO[
  semAcentoAj(f).replace(/\bde\b/g, " ").replace(/\s+/g, " ").trim()];
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
      ["REA", "Reaviso — DESC"],
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
  { k: "meta", rot: "Meta de inspeção (por mês)", tipo: "numero", padrao: 0 },
  { k: "ativo", rot: "Situação", tipo: "booleano", rotSim: "Ativo", rotNao: "Inativo", padrao: true }
];

/* Os três níveis de acesso — o mesmo desenho da página de Usuários do
   sistema de Programação: nome, cor e uma frase dizendo o que o nível pode.
   A frase aparece no formulário assim que se escolhe o nível, para ninguém
   dar administrador a quem só devia olhar. */
const NIVEIS_ACESSO = [
  { v: "admin", rot: "Administrador", cls: "nv-admin",
    desc: "Edita os cadastros e usa todas as ferramentas do painel: equipes, "
        + "inspetores, perguntas, usuários e inspeções. Também visualiza tudo." },
  { v: "inspetor", rot: "Inspetor do app", cls: "nv-inspetor",
    desc: "Acessa o app no celular para fazer inspeções e visualiza o painel. "
        + "Não edita nada no painel." },
  { v: "visualizador", rot: "Visualizador", cls: "nv-vis",
    desc: "Apenas visualiza o painel: vê números, inspeções e fotos. Não altera "
        + "nada, não usa o app e não aparece em indicador nenhum." }
];
/* Não é nível de conta: é o inspetor que está no cadastro (conta na meta, no
   ranking e nos gráficos) mas não tem login. Aparece na lista para a meta
   dele continuar tendo onde ser mudada. */
const NIVEL_SEM_LOGIN = { v: "semlogin", rot: "Sem login", cls: "nv-semlogin",
  desc: "Está no cadastro de inspetores — conta na meta, no ranking e nos gráficos —, "
      + "mas não entra no app nem no painel. Escolha um nível para criar o login." };
const ORDEM_NIVEL = ["admin", "inspetor", "semlogin", "visualizador", ""];
const nivelDe = v => v === "semlogin" ? NIVEL_SEM_LOGIN : NIVEIS_ACESSO.find(n => n.v === v);

const SECOES = {
  equipes: {
    titulo: "Equipes", desc: "Equipes de campo avaliadas na Jornada Segura.",
    novo: "Nova equipe", chave: "equipe", campos: CAMPOS_EQUIPE, statusK: "ativa",
    /* "LM", "LV" e "MAN" são o que o banco guarda, não o que se lê: o filtro
       mostra o nome por extenso e continua marcando o código. Departamento
       não é coluna do banco — sai do tipo, por CAMPO_DERIVADO. */
    filtros: [["supervisor", "Supervisor"], ["tipo", "Tipo", null, v => TIPOS_EQUIPE[v] || v],
      ["departamento", "Departamento"], ["ativa", "Situação"]],
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
  /* Inspeções — as feitas, para consultar e baixar.

     Sai do modelo já montado (FATO), não de uma consulta nova: é o mesmo
     conjunto que alimenta os números do painel. Assim a planilha baixada
     bate com a tela — se saísse de outra consulta, um dia divergiria e
     ninguém saberia qual das duas está certa. */
  inspecoes: {
    titulo: "Inspeções", desc: "Uma linha por não conformidade encontrada. "
      + "Clique numa linha para ver a inspeção inteira — todos os desvios dela, "
      + "o relato e as fotos. Use os filtros e baixe em PDF o que ficar na tela.",
    somenteLeitura: true, chave: "id", baixar: "⭳ Baixar PDF",
    /* O terceiro item da tupla é a ordem das opções, quando alfabética não
       serve: mês tem de sair jan→dez, e gravidade da pior para a mais leve. */
    filtros: [["ano", "Ano"], ["mesNome", "Mês", (a, b) => ORDEM_MES.indexOf(a) - ORDEM_MES.indexOf(b)],
              ["polo", "Polo"], ["equipe", "Equipe"], ["inspetor", "Inspetor"],
              ["gravidade", "Gravidade", (a, b) => postoGravidade(a) - postoGravidade(b)],
              /* Departamento é o da inspeção ("tipo", no fato); tipo de equipe
                 é o da equipe visitada, e sai por extenso, não como código. */
              ["tipo", "Departamento"],
              ["tipoEquipe", "Tipo de equipe", null, v => TIPOS_EQUIPE[v] || v]],
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
      { t: "Não conformidade", v: r => r.descricao },
      /* A foto é da INSPEÇÃO, não do desvio: o app não pergunta a qual item
         ela se refere. Por isso o número se repete nas linhas da mesma
         inspeção, e abrir mostra todas de uma vez. */
      { t: "Fotos", v: r => { const n = (FOTOS_POR_INSPECAO[r.id] || []).length;
          return n ? "📷 " + n : "—"; }, num: true }
    ],
    /* As colunas do modo "por inspeção": a visita inteira numa linha só. */
    colunasAgrupado: [
      { t: "Data", v: r => r.dataStr },
      { t: "Equipe", v: r => r.equipe || r.equipeBruta || "—", forte: true },
      { t: "Inspetor", v: r => r.inspetor || r.inspetorBruto || "—" },
      { t: "Polo", v: r => r.polo || "—", etiqueta: true },
      { t: "Departamento", v: r => r.tipo || "—" },
      { t: "Não conformidades", v: r => r.qtdNC ? String(r.qtdNC) : "—", num: true },
      { t: "Pior gravidade", v: r => r.gravidade, etiqueta: true },
      { t: "Pontos", v: r => r.pontosNC ? String(r.pontosNC) : "—", num: true },
      { t: "Fotos", v: r => { const n = (FOTOS_POR_INSPECAO[r.id] || []).length;
          return n ? "📷 " + n : "—"; }, num: true }
    ]
  },
  /* Perguntas — a gravidade de cada item do checklist.

     Quando a classificação saiu do painel para o banco (migração 08), foram
     classificadas as 34 perguntas que algum dia tinham dado não conformidade,
     e a 13 pegou mais 7. As demais ficaram vazias porque nunca haviam
     reprovado — e no dia em que reprovam pela primeira vez, a N.C aparece no
     painel como "Sem classificação" e vale ZERO ponto na Jornada Segura.

     Foi o que aconteceu em 04/09/2026 com a amarração de escada. Esta tela
     existe para isso não depender de uma migração nova a cada vez: o
     administrador classifica na hora, e o painel recalcula.

     Os pontos andam junto com a gravidade, e não são digitados: são a mesma
     decisão vista de dois ângulos, e deixá-los divergir faria o painel mostrar
     "Gravíssimo" descontando nada. */
  perguntas: {
    titulo: "Perguntas", desc: "A gravidade de cada item do checklist — é ela que "
      + "desconta ponto na Jornada Segura quando o item reprova.",
    somenteLeitura: true, chave: "codigo",
    filtros: [["gravidade", "Gravidade", (a, b) => postoGravidade(a) - postoGravidade(b)],
              ["categoria", "Categoria"]],
    colunas: [
      { t: "Pergunta", v: r => r.texto || "—", forte: true },
      { t: "Categoria", v: r => r.categoria || "—" },
      { t: "Gravidade", v: r => r.gravidade, etiqueta: true },
      { t: "Pontos", v: r => r.pontos_nc ? String(r.pontos_nc) : "0", num: true },
      { t: "N.C já registradas", v: r => String(r.usos || 0), num: true }
    ]
  },

  /* Usuários — todas as pessoas, com o nível de acesso de cada uma.

     Antes eram três lugares para a mesma pergunta ("quem pode o quê?"): uma
     aba de visualizadores, o acesso do inspetor na aba Inspetores, e o
     administrador, que só existia por SQL. Desde 27/10/2026 é uma lista só,
     como no sistema de Programação — e a aba Inspetores saiu: o cadastro do
     inspetor (função, polo, meta) é editado aqui, na linha dele.

     As contas vêm da função de servidor, que é quem as enxerga; o cadastro
     vem do banco, como antes. montarUsuarios() junta os dois. */
  usuarios: {
    titulo: "Usuários", desc: "Quem entra no painel e no app, o que cada um pode fazer e, "
      + "para quem inspeciona, a função, o polo e a meta.",
    somenteLeitura: true, chave: "id", novo: "Novo usuário",
    filtros: [["nivelRot", "Nível"], ["funcao", "Função"], ["polo", "Polo"],
              ["situacao", "Situação"]],
    colunas: [
      { t: "Usuário", forte: true, v: r => {
          const d = document.createElement("div");
          d.className = "aj-usuario";
          const b = document.createElement("b"); b.textContent = r.nome || "—";
          const m = document.createElement("small");
          m.textContent = r.conta ? r.email || "" : "sem login";
          d.append(b, m);
          return d; } },
      { t: "Nível", v: r => {
          const n = nivelDe(r.nivel);
          const e = document.createElement("span");
          e.className = "etiqueta " + (n ? n.cls : "nv-sem");
          e.textContent = n ? n.rot : "Sem nível";
          e.title = n ? n.desc : "Conta sem nível definido: ela entra e lê tudo, mas não é "
            + "administradora, inspetora nem marcada como visualizadora. Edite para definir.";
          return e; } },
      /* Função, polo e meta são do cadastro de inspetor — o que era a aba
         Inspetores. A função decide se a pessoa entra no bloco SESMT ou
         OPERAÇÃO da Taxa de Contato; para quem não inspeciona, sai o cargo. */
      { t: "Função / cargo", v: r => r.funcao || "—" },
      { t: "Polo", v: r => r.polo || "—" },
      { t: "Meta", v: r => r.meta === null ? "—"
          : r.naMeta ? fmtN(r.meta) : fmtN(r.meta) + " · fora", num: true },
      { t: "Telefone", v: r => r.telefone || "—" },
      { t: "Situação", v: r => {
          const e = document.createElement("span");
          e.className = "situacao " + (r.ativoGeral ? "sim" : "nao");
          e.textContent = r.situacao;
          return e; } },
      { t: "Último acesso", v: r => !r.conta ? "—" : r.ultimo_acesso
          ? new Date(r.ultimo_acesso).toLocaleString("pt-BR",
              { day: "2-digit", month: "2-digit", year: "2-digit",
                hour: "2-digit", minute: "2-digit" })
          : "nunca entrou" }
    ]
  },
  /* Tratativas — o que foi feito com cada não conformidade (27/10/2026).

     A inspeção aponta o problema; a tratativa diz se ele foi corrigido, como,
     e mostra a foto. Sem isso, a não conformidade some do assunto no dia em
     que é registrada — e a próxima inspeção encontra a mesma coisa.

     As pílulas de CATEGORIA no alto separam as N.C como no gráfico
     "Inconformidades por categoria" (Procedimentos, Veículos, EPI/EPC), com
     quantas ainda estão pendentes em cada uma. */
  tratativas: {
    titulo: "Tratativas", desc: "Cada não conformidade encontrada, e o que foi feito "
      + "com ela. Clique numa linha para tratar: descrever a correção, anexar "
      + "fotos e marcar como resolvida.",
    somenteLeitura: true, chave: "chaveT",
    filtros: [["situacao", "Situação"],
              ["gravidade", "Gravidade", (a, b) => postoGravidade(a) - postoGravidade(b)],
              ["ano", "Ano"], ["mesNome", "Mês", (a, b) => ORDEM_MES.indexOf(a) - ORDEM_MES.indexOf(b)],
              ["polo", "Polo"], ["equipe", "Equipe"], ["inspetor", "Inspetor"]],
    colunas: [
      { t: "Data", v: r => r.dataStr },
      { t: "Equipe", v: r => r.equipe || r.equipeBruta || "—", forte: true },
      { t: "Inspetor", v: r => r.inspetor || r.inspetorBruto || "—" },
      { t: "Categoria", v: r => r.categoria, etiqueta: true },
      { t: "Gravidade", v: r => r.gravidade, etiqueta: true },
      { t: "Não conformidade", v: r => r.descricao },
      { t: "Situação", v: r => {
          const e = document.createElement("span");
          e.className = "trat-st " + (r.situacao === "Resolvido" ? "ok" : "pend");
          e.textContent = r.situacao === "Resolvido" ? "✓ Resolvido" : "Pendente";
          return e; } },
      { t: "Resolução", v: r => {
          const partes = [];
          if (r.resolvidoEm) partes.push(new Date(r.resolvidoEm).toLocaleDateString("pt-BR"));
          if (r.fotosTrat) partes.push("📷 " + r.fotosTrat);
          return partes.join(" · ") || "—"; } }
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
    /* O rascunho guarda o departamento como o app o escreve (DCMD_CM); no
       filtro sai o nome, igual ao da coluna. */
    filtros: [["inspetor", "Inspetor"],
      ["departamento", "Departamento", null, v => NOME_DEPARTAMENTO[v] || v]],
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
/* ============================================================
   PLANILHA .XLSX ESCRITA À MÃO

   O CSV serve para ler, mas não para trabalhar: guarda só texto, e quem
   formata a planilha (cor no cabeçalho, largura de coluna) perde tudo ao
   salvar — o Excel avisa, mas a impressão que fica é a de que as alterações
   não foram salvas. Foi o que aconteceu aqui em 08/09/2026.

   .xlsx é um zip com alguns XML dentro. Não há biblioteca neste painel e não
   vale trazer uma: o zip é montado aqui, sem compressão (método "stored"), o
   que dispensa implementar deflate e custa alguns KB a mais num arquivo de 68
   linhas. O que precisa ser feito à mão é o CRC-32 de cada arquivo — sem ele
   batendo, o Excel recusa o pacote inteiro.

   A planilha sai pronta para o trabalho: cabeçalho em negrito e congelado,
   colunas na largura certa, filtro ligado e, na coluna Gravidade, uma LISTA
   SUSPENSA com as opções válidas. É a lista que evita o "Gravissimo" sem
   acento e o "grave" minúsculo, que depois não casam com o cadastro.
   ============================================================ */
const TABELA_CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(bytes) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < bytes.length; i++) c = TABELA_CRC[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

/* Zip com os arquivos guardados sem compressão. Formato clássico: para cada
   arquivo, um cabeçalho local seguido dos bytes; no fim, o diretório central e
   o registro de fim, que é por onde o leitor começa. */
function zipar(arquivos) {
  const enc = new TextEncoder();
  const partes = [], central = [];
  let deslocamento = 0;
  const u16 = n => [n & 0xFF, (n >>> 8) & 0xFF];
  const u32 = n => [n & 0xFF, (n >>> 8) & 0xFF, (n >>> 16) & 0xFF, (n >>> 24) & 0xFF];

  arquivos.forEach(f => {
    const nome = enc.encode(f.nome);
    const dados = enc.encode(f.texto);
    const crc = crc32(dados);
    /* Bit 11 do sinalizador: os nomes estão em UTF-8. */
    const comum = [].concat(u16(20), u16(0x0800), u16(0), u16(0), u16(0),
      u32(crc), u32(dados.length), u32(dados.length), u16(nome.length));
    const local = new Uint8Array([].concat(u32(0x04034B50), comum, u16(0), [...nome]));
    partes.push(local, dados);
    /* No diretorio central vem, depois dos campos comuns: extra, comentario,
       disco, atributos internos (2 bytes) e externos (4) e o deslocamento.
       Faltava um u16 aqui e o zip inteiro ficava ilegivel: o leitor procura o
       diretorio pelo tamanho declarado e caia no meio de outro registro. */
    central.push(new Uint8Array([].concat(u32(0x02014B50), u16(20), comum,
      u16(0), u16(0), u16(0), u16(0), u32(0), u32(deslocamento), [...nome])));
    deslocamento += local.length + dados.length;
  });

  const dirTam = central.reduce((a, c) => a + c.length, 0);
  const fim = new Uint8Array([].concat(u32(0x06054B50), u16(0), u16(0),
    u16(arquivos.length), u16(arquivos.length), u32(dirTam), u32(deslocamento), u16(0)));
  return new Blob(partes.concat(central, [fim]),
    { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

const escXml = v => String(v == null ? "" : v)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;").replace(/'/g, "&apos;")
  /* Caractere de controle quebra o XML, e o Excel recusa o arquivo inteiro. */
  .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");

/* colunas: [{titulo, largura, valor(r), numero}] · listas: { "C": ["Leve", …] } */
function planilhaXlsx(nomeAba, colunas, linhas, listas) {
  const letra = i => String.fromCharCode(65 + i);
  const cel = (c, i, n, v) => c.numero
    ? `<c r="${letra(i)}${n}" t="n"><v>${Number(v) || 0}</v></c>`
    : `<c r="${letra(i)}${n}" t="inlineStr"><is><t xml:space="preserve">${escXml(v)}</t></is></c>`;

  const cabecalho = `<row r="1">${colunas.map((c, i) =>
    `<c r="${letra(i)}1" t="inlineStr" s="1"><is><t>${escXml(c.titulo)}</t></is></c>`).join("")}</row>`;
  const corpo = linhas.map((r, k) => `<row r="${k + 2}">${
    colunas.map((c, i) => cel(c, i, k + 2, c.valor(r))).join("")}</row>`).join("");

  const chaves = Object.keys(listas || {});
  const validacoes = chaves.map(col =>
    `<dataValidation type="list" allowBlank="1" showInputMessage="1" showErrorMessage="1" ` +
    `errorTitle="Valor fora da lista" error="Use uma das opções da lista." ` +
    `sqref="${col}2:${col}${linhas.length + 1}">` +
    `<formula1>"${listas[col].join(",")}"</formula1></dataValidation>`).join("");

  const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetViews><sheetView tabSelected="1" workbookViewId="0">
<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
<cols>${colunas.map((c, i) =>
  `<col min="${i + 1}" max="${i + 1}" width="${c.largura || 20}" customWidth="1"/>`).join("")}</cols>
<sheetData>${cabecalho}${corpo}</sheetData>
<autoFilter ref="A1:${letra(colunas.length - 1)}${linhas.length + 1}"/>${
  validacoes ? `<dataValidations count="${chaves.length}">${validacoes}</dataValidations>` : ""}
</worksheet>`;

  /* Dois estilos: o 0 é o normal (obrigatório) e o 1 é o do cabeçalho. */
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font>
<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts>
<fills count="3"><fill><patternFill patternType="none"/></fill>
<fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFFB4513"/><bgColor indexed="64"/></patternFill></fill></fills>
<borders count="1"><border/></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs>
</styleSheet>`;

  return zipar([
    { nome: "[Content_Types].xml", texto: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>` },
    { nome: "_rels/.rels", texto: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>` },
    { nome: "xl/workbook.xml", texto: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="${escXml(nomeAba)}" sheetId="1" r:id="rId1"/></sheets></workbook>` },
    { nome: "xl/_rels/workbook.xml.rels", texto: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>` },
    { nome: "xl/styles.xml", texto: styles },
    { nome: "xl/worksheets/sheet1.xml", texto: sheet }
  ]);
}

/* As perguntas do checklist, como vieram do banco, com a conta de quantas
   não conformidades cada uma já gerou — é o que mostra quais valem
   classificar primeiro. Sai da sincronização, não de consulta nova. */
function listaPerguntas() {
  const d = Sincronia.doBanco;
  if (!d || !d.perguntas) return [];
  const usos = {};
  (d.respostas || []).forEach(r => { usos[r.pergunta] = (usos[r.pergunta] || 0) + 1; });
  return d.perguntas.map(p => ({
    codigo: p.codigo, texto: p.texto,
    categoria: p.categoria || "",
    gravidade: p.gravidade || "Sem classificação",
    pontos_nc: p.pontos_nc || 0,
    usos: usos[p.codigo] || 0
  })).sort((a, b) => (b.usos - a.usos)
    || (postoGravidade(a.gravidade) - postoGravidade(b.gravidade))
    || String(a.texto).localeCompare(String(b.texto), "pt-BR"));
}

/* As não conformidades de uma inspeção: [id, pergunta, categoria, gravidade, pontos] */
const ncDe = r => NC_BY_ID[r.id] || [];

/* As não conformidades que podem ser TRATADAS: uma linha por N.C das
   inspeções que estão no banco (as do data.js não têm o código da pergunta,
   nem uuid para a foto ser guardada). A situação vem da tratativa, se houver
   — sem tratativa, pendente. */
function tratativasLinhas() {
  const linhas = [];
  FATO.forEach(r => {
    const uuid = UUID_POR_ID[r.id];
    if (!uuid) return;
    ncDe(r).forEach(x => {
      if (!x[5]) return;
      const chaveT = uuid + "|" + x[5];
      const t = Ajustes.trat[chaveT] || {};
      const fotos = Ajustes.tratFotos[chaveT] || [];
      linhas.push(Object.assign({}, r, {
        mesNome: MESES_NOME[+r.mes],
        uuid, cod: x[5], chaveT,
        descricao: x[1] || "—",
        categoria: x[2] || "Sem categoria",
        gravidade: x[3] || "Sem classificação",
        pontosNC: x[4] || 0, temNC: true,
        situacao: t.status === "resolvido" ? "Resolvido" : "Pendente",
        resolvidoEm: t.resolvido_em || null,
        tratadaPor: t.resolvido_por_nome || "",
        oQueFoiFeito: t.descricao || "",
        fotosTrat: fotos.length
      }));
    });
  });
  return linhas;
}

/* Foto do celular sai com 3 a 8 MB, e o bucket aceita até 5 MB. Reduz para
   1600px no lado maior, em JPEG — sobra nitidez para ver um EPI, e a foto
   sobe rápido mesmo com sinal fraco. Sem esta etapa, a foto grande era
   recusada pelo storage com um erro que não diz o motivo. */
async function comprimirFoto(arquivo, lado = 1600, qualidade = 0.82) {
  const url = URL.createObjectURL(arquivo);
  try {
    const img = await new Promise((ok, falha) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => falha(new Error(`"${arquivo.name}" não é uma imagem que o navegador abra`));
      i.src = url;
    });
    const f = Math.min(1, lado / Math.max(img.naturalWidth, img.naturalHeight));
    const tela = document.createElement("canvas");
    tela.width = Math.round(img.naturalWidth * f);
    tela.height = Math.round(img.naturalHeight * f);
    tela.getContext("2d").drawImage(img, 0, 0, tela.width, tela.height);
    return await new Promise(ok => tela.toBlob(ok, "image/jpeg", qualidade));
  } finally {
    URL.revokeObjectURL(url);
  }
}

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
/* A mesma base, agora com UMA LINHA POR INSPEÇÃO (08/09/2026).

   A tabela desdobrada por desvio repete a visita em várias linhas — três
   desvios, três linhas iguais em data, equipe, inspetor e polo —, e quem lê a
   tela pergunta "quantas inspeções foram feitas?", não "quantas linhas". Aqui
   cada visita é uma linha, com a contagem dos desvios; clicar abre a ficha com
   todos eles e a gravidade de cada um.

   Os dois modos convivem: o desdobrado continua sendo o que serve para
   filtrar por gravidade, contar desvio e imprimir a planilha. */
function inspecoesAgrupadas() {
  return FATO.map(r => {
    const nc = ncDe(r);
    const gravs = nc.map(x => x[3] || "Sem classificação");
    /* A gravidade da inspeção é a PIOR que ela encontrou: é assim que se lê
       uma lista de segurança — o gravíssimo não pode ficar escondido atrás de
       dois leves. O filtro, esse, casa com qualquer uma das encontradas. */
    const pior = gravs.slice().sort((a, b) => postoGravidade(a) - postoGravidade(b))[0];
    return Object.assign({}, r, {
      mesNome: MESES_NOME[+r.mes],
      qtdNC: nc.length,
      temNC: nc.length > 0,
      gravidade: nc.length ? pior : "Sem desvio",
      gravidades: nc.length ? [...new Set(gravs)] : ["Sem desvio"],
      pontosNC: nc.reduce((a, x) => a + (x[4] || 0), 0),
      descricao: nc.length
        ? nc.map(x => x[1]).join(" · ")     /* entra na busca por texto */
        : "—"
    });
  });
}

const ORDEM_MES = MESES_NOME.slice(1);   // jan…dez, sem o vazio da posição 0

/* Da mais grave para a mais leve — é a ordem em que se lê um relatório de
   segurança. "Sem desvio" fica por último, e não no meio do alfabeto. */
const ORDEM_GRAVIDADE = ["Gravíssimo", "Média", "Leve", "Sem classificação", "Sem desvio"];
const postoGravidade = g => {
  const i = ORDEM_GRAVIDADE.findIndex(o =>
    o.toLowerCase() === String(g || "").trim().toLowerCase());
  return i < 0 ? ORDEM_GRAVIDADE.length : i;
};

/* O count embutido do PostgREST chega como [{count: n}] */
const contaRespostas = r => (r.sesmt_respostas && r.sesmt_respostas[0]
  ? r.sesmt_respostas[0].count : 0);
const NOME_DEPARTAMENTO = { DCMD_CM: "DCMD C&M", DCMD_LV: "DCMD LINHA VIVA",
  DCMD_PODA: "DCMD PODA", DECP: "DECP", DEOP: "DEOP", DESC: "DESC" };
const TIPOS_EQUIPE = { LM: "Linha morta", LV: "Linha viva", MAN: "Manutenção",
  PER: "Perdas", PLA: "Plantão", POD: "Poda", REA: "Reaviso" };

/* De qual departamento é cada tipo de equipe. É o que o app usa para
   mostrar ao inspetor só as equipes do departamento que ele escolheu.
   A regra oficial mora no banco, em sesmt_tipos_equipe; esta cópia serve
   só para rotular a tela do painel. Mudou lá, mude aqui. */
const DEPARTAMENTO_DO_TIPO = { LM: "DCMD C&M", MAN: "DCMD C&M", LV: "DCMD LINHA VIVA",
  POD: "DCMD PODA", PER: "DECP", REA: "DESC", PLA: "DEOP" };

/* Campos que a linha não guarda: o valor sai de uma conta. Só entram quando
   a linha não tem o campo — a aba Inspeções já traz departamento pronto e
   continua usando o dela. */
const CAMPO_DERIVADO = {
  departamento: r => DEPARTAMENTO_DO_TIPO[r.tipo] || ""
};
const valorDoCampo = (r, campo) =>
  r[campo] === undefined && CAMPO_DERIVADO[campo] ? CAMPO_DERIVADO[campo](r) : r[campo];

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
  /* "inspecao" = uma linha por visita (padrão, e o que a tela pede);
     "nc" = a lista desdobrada, uma linha por desvio, para planilha e papel. */
  modoInsp: (() => { try { return localStorage.getItem("sesmt.modoInsp") || "inspecao"; }
                     catch (e) { return "inspecao"; } })(),

  /* Duas páginas usam esta mesma tela, com seções diferentes:

       Inspeções — o que o campo produziu (inspeções e rascunhos)
       Ajustes   — o cadastro (equipes, usuários e inspetores, perguntas)

     Antes era tudo em Ajustes, e quem só queria consultar uma inspeção
     entrava numa tela chamada "ajustes", ao lado dos botões que mexem no
     cadastro. São coisas de rotinas diferentes, e agora são telas diferentes.

     É a mesma instância, remontada quando a página abre: o estado de filtro
     não atravessa de uma para a outra, e isso é o certo — filtro de equipe
     não quer dizer nada na lista de inspeções. */
  VISOES: {
    inspecoes: ["inspecoes", "rascunhos", "tratativas"],
    ajustes: ["equipes", "usuarios", "perguntas"]
  },

  montar(pg, chaves) {
    const usadas = chaves && chaves.length ? chaves : Object.keys(SECOES);
    this.chaves = usadas;
    /* Ao trocar de página, a seção aberta pode não existir na nova. */
    if (usadas.indexOf(this.secao) < 0) { this.secao = usadas[0]; this.busca = ""; this.filtros = {}; }
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

    this.chaves.forEach(k => {
      const b = document.createElement("button");
      b.textContent = SECOES[k].titulo;
      b.dataset.sec = k;
      b.onclick = () => {
        this.secao = k; this.busca = ""; this.filtros = {};
        this.render();
        /* Rascunho muda o tempo todo, e é pouca linha: busca a cada
           abertura da aba, em vez de guardar e mostrar coisa velha. */
        if (k === "rascunhos") this.carregarRascunhos();
        if (k === "tratativas") this.carregarTratativas();
        if (k === "usuarios") this.carregarUsuarios();
      };
      corpo.querySelector(".aj-abas").appendChild(b);
    });
    corpo.querySelector(".aj-novo").onclick = () => this.abrirDialogo(null);
    return pg;
  },

  /* Usuários também não moram no Cadastros: as contas vêm da função de
     servidor, que é quem as enxerga. O cadastro de inspetores (função, polo,
     meta) continua no Cadastros e é juntado aqui, linha a linha. */
  usuarios: [],
  usuarioEu: "",           // id de quem está logado — não se apaga a si mesmo
  usuariosEm: null,
  buscandoUsuarios: false,

  /* Uma linha por PESSOA, juntando as duas fontes:

       conta de login (função de servidor)  +  cadastro de inspetor (banco)

     Desde 27/10/2026 a aba Inspetores não existe: o que ela mostrava (função,
     polo, meta, situação) aparece aqui, na linha da conta ligada àquele
     cadastro. O inspetor que está no cadastro mas não tem login ganha a sua
     própria linha, com o nível "Sem login" — sem ela, a meta dele não teria
     onde ser mudada, e é ele que aparece nos gráficos. */
  montarUsuarios(contas) {
    const porNome = new Map(Cadastros.inspetores.map(i => [i.inspetor, i]));
    const ligados = new Set();
    const linhas = contas.map(u => {
      const cad = u.inspetor ? porNome.get(u.inspetor) || null : null;
      if (cad) ligados.add(cad.id);
      return Object.assign({}, u, { conta: true, cad });
    });
    Cadastros.inspetores.filter(i => !ligados.has(i.id)).forEach(i => linhas.push({
      id: "cad:" + i.id, conta: false, email: "", nome: i.inspetor, cargo: "",
      telefone: "", ativo: true, ultimo_acesso: null, cad: i, inspetor: i.inspetor,
      /* Para quem não é administrador a função não devolve contas, então
         o vínculo é o único sinal de login que se tem: user_id preenchido. */
      nivel: i.user_id ? "inspetor" : "semlogin"
    }));
    /* DUAS situações, que não se misturam:
         - a do LOGIN (consegue entrar?), que é da conta;
         - a do CADASTRO (entra na meta e no ranking?), que é do inspetor.
       Um administrador pode estar ativo e fora da meta — o Jeferson, por
       exemplo. Juntar as duas num campo só fazia ele aparecer "Inativo" e,
       ao salvar, mexia numa delas sem ninguém pedir. A coluna Situação mostra
       a do login; quem não tem login mostra a do cadastro. */
    return linhas.map(r => {
      const ativo = r.conta ? !!r.ativo : !!(r.cad && r.cad.ativo);
      return Object.assign(r, {
        naMeta: r.cad ? !!r.cad.ativo : null,
        nivelRot: (nivelDe(r.nivel) || { rot: "Sem nível" }).rot,
        funcao: r.cad ? r.cad.funcao || "" : r.cargo || "",
        polo: r.cad ? r.cad.polo || "" : "",
        meta: r.cad ? Number(r.cad.meta) || 0 : null,
        ativoGeral: ativo,
        situacao: ativo ? "Ativo" : "Inativo"
      });
    });
  },

  async carregarUsuarios() {
    /* A trava não é por desempenho: carregarUsuarios() termina em render(), e
       o render() pede a busca quando a aba está aberta e vazia. Sem ela, um
       erro de rede (que deixa usuariosEm nulo) viraria laço infinito. */
    if (this.buscandoUsuarios) return;
    this.buscandoUsuarios = true;
    try {
      /* Quem não é administrador vê o cadastro de inspetores, como via na
         aba Inspetores — só não vê as contas, que são assunto de quem
         administra. */
      const r = Banco.podeEditar() ? await Banco.usuarios("listar") : null;
      this.usuarioEu = (r && r.eu) || "";
      this.usuarios = this.montarUsuarios((r && r.lista) || []);
      this.usuariosEm = new Date();
    } catch (e) {
      this.usuarios = this.montarUsuarios([]);
      this.avisar("Não deu para buscar as contas: " + e.message
        + " O cadastro de inspetores aparece mesmo assim.", true);
    } finally {
      this.buscandoUsuarios = false;
      this.render();
    }
  },

  /* Campo de escolha com "Outro…" — o mesmo desenho do "select-livre" dos
     cadastros, e ligado pela mesma rotina de dialogo(). */
  campoLivre(nome, rotulo, ops, atual) {
    const lista = ops.slice();
    if (atual && !lista.includes(atual)) lista.unshift(atual);
    return `<label class="aj-campo"><span>${rotulo}</span>
      <select class="aj-livre" data-livre="${nome}">
        <option value=""${atual ? "" : " selected"}>— não informado —</option>
        ${lista.map(o => `<option value="${esc(o)}"${o === atual ? " selected" : ""}>${esc(o)}</option>`).join("")}
        <option value="__digitar__">Outro… (digitar)</option>
      </select>
      <input name="${nome}" class="aj-livre-texto" value="${esc(atual || "")}" hidden
             autocomplete="off" placeholder="Digite"></label>`;
  },

  /* Um formulário para os três casos, como na página de Usuários do sistema
     de Programação:

       novo usuário            — conta e, se for inspetor, o cadastro dele
       conta que já existe     — a conta, e o cadastro se estiver ligada
       inspetor "Sem login"    — o cadastro; escolher um nível cria o login

     O bloco do CADASTRO (nome no painel, função, polo, meta) é o que a aba
     Inspetores fazia. Ele aparece para o inspetor, para o administrador que
     também inspeciona e para quem está sem login.

     A senha é escolhida pelo administrador e não fica guardada em lugar
     nenhum: o Supabase grava só o hash. */
  abrirUsuario(r) {
    const novo = !r;
    const soCadastro = !!r && !r.conta;
    const eu = !!r && r.conta && r.id === this.usuarioEu;
    const d = Object.assign({ nome: "", email: "", cargo: "", telefone: "",
      /* Quem nasce sem escolha nasce com o MENOR poder: errar para menos custa
         um clique; errar para mais entrega a edição do painel a quem só devia
         olhar. */
      nivel: "visualizador", ativoGeral: true, cad: null }, r || {});
    const cad = d.cad;

    /* Cadastros de inspetor que podem ser ligados a esta conta: os que não
       têm login, e o dela mesma. */
    const livres = Cadastros.inspetores.filter(i => !i.user_id || (cad && i.id === cad.id))
      .sort((a, b) => ordemNatural(a.inspetor, b.inspetor));
    const funcoes = CAMPOS_INSPETOR.find(c => c.k === "funcao").origem();
    const polos = CAMPOS_INSPETOR.find(c => c.k === "polo").origem();

    /* Linha de cadastro cujo login existe mas não pôde ser lido agora (a
       função não respondeu): só o cadastro é editável, para não tentar criar
       um segundo login para quem já tem. */
    const loginIlegivel = soCadastro && cad && cad.user_id;
    if (soCadastro) d.nivel = "semlogin";
    const niveis = loginIlegivel
      ? [{ v: "semlogin", rot: "Só o cadastro (o login não pôde ser lido agora)" }]
      : soCadastro
      ? [{ v: "semlogin", rot: "Sem login — só o cadastro" }]
          .concat(NIVEIS_ACESSO.filter(n => n.v !== "visualizador")
            .map(n => ({ v: n.v, rot: n.rot + " — criar o login" })))
      : NIVEIS_ACESSO;

    this.dialogo(novo ? "Novo usuário" : soCadastro ? "Editar inspetor" : "Editar usuário",
      `<label class="aj-campo"><span>Nível de acesso</span>
         <select name="nivel"${eu ? " disabled" : ""}>
           ${d.nivel ? "" : '<option value="" selected disabled>— escolha o nível —</option>'}
           ${niveis.map(n => `<option value="${n.v}"${n.v === d.nivel ? " selected" : ""}>${n.rot}</option>`).join("")}
         </select></label>
       <div class="aj-nivel-info"></div>

       <div class="aj-bloco aj-conta">
         <h4>Login</h4>
         <label class="aj-campo"><span>Nome completo</span>
           <input name="nome" value="${esc(soCadastro ? "" : d.nome)}" autocomplete="off"></label>
         <label class="aj-campo"><span>E-mail (será o login)</span>
           <input name="email" type="email" value="${esc(d.email)}" autocomplete="off"
                  autocapitalize="none" spellcheck="false"></label>
         <label class="aj-campo"><span>Senha${novo || soCadastro ? "" : " (opcional)"}</span>
           <input name="senha" type="text" minlength="6" autocomplete="off"
                  placeholder="${novo || soCadastro ? "pelo menos 6 caracteres" : "deixe em branco para manter a atual"}"></label>
         <div class="aj-duas">
           <label class="aj-campo"><span>Telefone</span>
             <input name="telefone" value="${esc(d.telefone)}" autocomplete="off"></label>
           <label class="aj-campo aj-cargo"><span>Cargo</span>
             <input name="cargo" value="${esc(d.cargo)}" autocomplete="off"></label>
         </div>
       </div>

       <label class="aj-check aj-inspeciona" hidden>
         <input type="checkbox" name="inspeciona"${cad ? " checked" : ""}>
         Também inspeciona pelo app (entra na meta e no ranking)</label>

       <div class="aj-bloco aj-cadastro" hidden>
         <h4>Cadastro de inspetor</h4>
         ${cad ? "" : `<label class="aj-campo"><span>Cadastro</span>
           <select name="cadastro">
             <option value="">— novo cadastro —</option>
             ${livres.map(i => `<option value="${esc(i.id)}">${esc(i.inspetor)} (já cadastrado, sem login)</option>`).join("")}
           </select></label>`}
         <label class="aj-campo"><span>Nome no painel</span>
           <input name="cadnome" value="${esc(cad ? cad.inspetor : "")}" autocomplete="off"
                  placeholder="como aparece nos gráficos — ex.: Jose Iran"></label>
         <p class="aj-dtexto">É o nome que casa com as inspeções. Mudar aqui renomeia:
           as inspeções antigas acompanham o nome novo.</p>
         ${this.campoLivre("funcao", "Função", funcoes, cad ? cad.funcao : "")}
         ${this.campoLivre("polo", "Polo", polos, cad ? cad.polo : "")}
         <label class="aj-campo"><span>Meta de inspeção (por mês)</span>
           <input name="meta" type="number" min="0" step="1" value="${cad ? Number(cad.meta) || 0 : 0}"></label>
         <label class="aj-campo"><span>Entra na meta e no ranking?</span>
           <select name="cadativo">
             <option value="1"${!cad || cad.ativo ? " selected" : ""}>Sim — conta nos indicadores</option>
             <option value="0"${cad && !cad.ativo ? " selected" : ""}>Não — fica fora (afastado, saiu)</option>
           </select></label>
       </div>

       ${!r || !r.conta ? "" : `<label class="aj-campo"><span>Login</span>
         <select name="ativo"${eu ? " disabled" : ""}>
           <option value="1"${r.ativo ? " selected" : ""}>Ativo — consegue entrar</option>
           <option value="0"${r.ativo ? "" : " selected"}>Inativo — não consegue entrar</option>
         </select></label>`}
       ${eu ? `<p class="aj-dtexto">Esta é a sua conta: você não pode mudar o seu próprio
         nível nem desativá-la. Outro administrador faz isso, se for preciso.</p>` : ""}
       <p class="aj-dtexto aj-nota-senha">${novo || soCadastro
         ? "Anote a senha antes de salvar: ela não fica guardada aqui, e só dá para trocar por outra."
         : "Informar uma senha troca a senha atual desta conta."}</p>`,
      novo ? "Criar usuário" : "Salvar",
      form => this.salvarUsuario(form, r, { novo, soCadastro, eu }));

    /* O formulário já está na tela: liga o que aparece conforme o nível. */
    const fundos = canvas.querySelectorAll(".aj-fundo");
    const form = fundos[fundos.length - 1].querySelector("form");
    const sel = form.querySelector('select[name="nivel"]');
    const q = s => form.querySelector(s);
    const atualizar = () => {
      const nv = sel.value, n = nivelDe(nv);
      q(".aj-nivel-info").innerHTML = n
        ? `<span class="etiqueta ${n.cls}">${n.rot}</span><p>${n.desc}</p>` : "";
      const criaConta = !(soCadastro && nv === "semlogin");
      q(".aj-conta").hidden = !criaConta;
      q(".aj-inspeciona").hidden = nv !== "admin";
      const comCad = nv === "inspetor" || nv === "semlogin"
        || (nv === "admin" && form.inspeciona.checked);
      q(".aj-cadastro").hidden = !comCad;
      /* Com o cadastro na tela, a função dele faz o papel do cargo. */
      q(".aj-cargo").hidden = comCad;
      q(".aj-nota-senha").hidden = !criaConta;
      form.nome.required = criaConta;
      form.email.required = criaConta;
      form.senha.required = criaConta && (novo || soCadastro);
      form.cadnome.required = comCad;
    };
    sel.addEventListener("change", atualizar);
    form.inspeciona.addEventListener("change", atualizar);
    /* Escolher um cadastro que já existe traz função, polo e meta dele. */
    if (form.cadastro) form.cadastro.addEventListener("change", () => {
      const i = Cadastros.inspetores.find(x => String(x.id) === form.cadastro.value);
      form.cadnome.value = i ? i.inspetor : "";
      form.meta.value = i ? Number(i.meta) || 0 : 0;
      form.cadativo.value = !i || i.ativo ? "1" : "0";
      [["funcao", i ? i.funcao : ""], ["polo", i ? i.polo : ""]].forEach(([k, v]) => {
        const s = form.querySelector(`select[data-livre="${k}"]`);
        if (v && ![...s.options].some(o => o.value === v))
          s.insertBefore(new Option(v, v), s.options[1]);
        s.value = v || "";
        form.elements[k].value = v || "";
        form.elements[k].hidden = true;
      });
    });
    atualizar();
  },

  /* Grava na ordem que deixa menos coisa pela metade se algo falhar:
     primeiro o cadastro (é o que os números do painel usam), depois a conta.
     Se a conta nova falhar, o cadastro NOVO criado agora é desfeito — senão
     a segunda tentativa esbarraria em "já existe um cadastro com esse nome". */
  async salvarUsuario(form, r, { novo, soCadastro, eu }) {
    const nivel = form.nivel.value;
    if (!nivel) throw new Error("Escolha o nível de acesso.");
    const comCad = nivel === "inspetor" || nivel === "semlogin"
      || (nivel === "admin" && form.inspeciona.checked);
    const ativo = !(r && r.conta) || eu ? true : form.ativo.value === "1";
    const criaConta = !(soCadastro && nivel === "semlogin");

    /* 1) O cadastro de inspetor, se houver. */
    let cadSalvo = null, cadCriadoAgora = false;
    if (comCad) {
      const atual = r && r.cad ? r.cad
        : form.cadastro && form.cadastro.value
          ? Cadastros.inspetores.find(i => String(i.id) === form.cadastro.value) : null;
      const reg = Object.assign({}, atual || {}, {
        inspetor: form.cadnome.value.trim(),
        funcao: form.funcao.value.trim(),
        polo: form.polo.value.trim(),
        meta: Number(form.meta.value) || 0,
        ativo: form.cadativo.value === "1"
      });
      if (!reg.inspetor) throw new Error("Informe o nome no painel.");
      const repetido = Cadastros.inspetores.some(i => i.id !== reg.id
        && String(i.inspetor).toLowerCase() === reg.inspetor.toLowerCase());
      if (repetido) throw new Error(`Já existe um inspetor cadastrado como ${reg.inspetor}.`);
      if (criaConta) {
        // confere a conta ANTES de gravar o cadastro, pelo mesmo motivo
        if (!form.nome.value.trim()) throw new Error("Informe o nome completo.");
        if (!form.email.value.trim()) throw new Error("Informe o e-mail.");
      }
      cadCriadoAgora = !reg.id;
      await Cadastros.salvar("inspetores", reg);
      cadSalvo = Cadastros.inspetores.find(i =>
        String(i.inspetor).toLowerCase() === reg.inspetor.toLowerCase()) || reg;
    }

    /* 2) A conta. */
    if (criaConta) {
      const dados = {
        nome: form.nome.value.trim(),
        email: form.email.value.trim().toLowerCase(),
        cargo: comCad ? (cadSalvo.funcao || "") : form.cargo.value.trim(),
        telefone: form.telefone.value.trim(),
        nivel,
        inspetor: comCad ? cadSalvo.inspetor : ""
      };
      try {
        if (novo || soCadastro) {
          dados.senha = form.senha.value;
          await Banco.usuarios("criar", dados);
        } else {
          dados.id = r.id;
          dados.ativo = ativo;
          if (eu) delete dados.nivel;           // o servidor também recusa
          if (form.senha.value) dados.senha = form.senha.value;
          await Banco.usuarios("editar", dados);
        }
      } catch (e) {
        if (cadCriadoAgora && cadSalvo && cadSalvo.id) {
          await Cadastros.excluir("inspetores", cadSalvo.id).catch(() => {});
        }
        throw e;
      }
    }

    await Cadastros.carregar().catch(() => {});
    Cadastros.aplicarNoModelo();
    await this.carregarUsuarios();
    render();
    this.avisar(!criaConta ? `Cadastro de ${cadSalvo.inspetor} salvo.`
      : novo || soCadastro ? `Usuário ${form.email.value.trim().toLowerCase()} criado.`
      : `Usuário ${form.email.value.trim().toLowerCase()} atualizado.`);
  },

  /* Apagar tem dois sentidos para quem é inspetor, e trocar um pelo outro
     custa caro: apagar só o LOGIN deixa a pessoa no cadastro (meta, ranking,
     o nome nas inspeções); apagar o CADASTRO tira o inspetor dos números. Por
     isso a escolha é explícita, e o padrão é o mais brando. */
  removerUsuario(r) {
    const cad = r.cad;
    const usos = cad ? FATO.filter(f => f.inspetorBruto === cad.inspetor
                                       || f.inspetor === cad.inspetor).length : 0;
    const avisoUsos = usos
      ? `<p class="aj-aviso forte">Há <b>${usos}</b> inspeç${usos === 1 ? "ão" : "ões"} com o nome
         ${esc(cad.inspetor)}. Elas continuam no painel, mas passam a aparecer sem
         inspetor. Para tirar da meta e do ranking sem perder o histórico, edite e
         marque como Inativo.</p>` : "";
    const opcoes = !r.conta ? "" : !cad ? "" : `
      <label class="aj-check"><input type="radio" name="oque" value="login" checked>
        Só o login — ${esc(cad.inspetor)} continua no cadastro, sem acesso</label>
      <label class="aj-check"><input type="radio" name="oque" value="tudo">
        O login e o cadastro de inspetor</label>`;
    this.dialogo(`Apagar ${esc(r.nome || r.email)}?`,
      `<p class="aj-aviso">Esta ação não pode ser desfeita.</p>
       ${r.conta ? `<p class="aj-dtexto">A conta ${esc(r.email)} é apagada e deixa de entrar
         no painel e no app. Para só impedir a entrada por um tempo, use Editar e
         marque Inativo.</p>` : ""}
       ${opcoes}
       ${cad ? `<div class="aj-aviso-cad"${r.conta ? " hidden" : ""}>${avisoUsos}</div>` : ""}`,
      "Apagar",
      async form => {
        const tudo = !r.conta || (cad && form.oque && form.oque.value === "tudo");
        if (r.conta) await Banco.usuarios("remover", { id: r.id });
        if (cad && tudo) await Cadastros.excluir("inspetores", cad.id);
        await Cadastros.carregar().catch(() => {});
        Cadastros.aplicarNoModelo();
        await this.carregarUsuarios();
        render();
        this.avisar(`${r.nome || r.email} apagado.`);
      }, true);
    /* O aviso das inspeções só faz sentido quando o cadastro vai junto. */
    const fundos = canvas.querySelectorAll(".aj-fundo");
    const form = fundos[fundos.length - 1].querySelector("form");
    const aviso = form.querySelector(".aj-aviso-cad");
    form.querySelectorAll('input[name="oque"]').forEach(x => x.addEventListener("change", () => {
      if (aviso) aviso.hidden = form.oque.value !== "tudo";
    }));
  },

  /* Classificar uma pergunta do checklist.

     Só gravidade e categoria: o texto da pergunta vem do checklist e mudar
     por aqui faria a mesma pergunta virar duas histórias diferentes entre o
     app e o painel. Os pontos seguem a gravidade, sem digitação. */
  classificarPergunta(r) {
    const PONTOS = { "": 0, "Leve": -1, "Média": -5, "Gravíssimo": -10 };
    const atual = PONTOS[r.gravidade] !== undefined ? r.gravidade : "";
    this.dialogo("Classificar pergunta",
      `<p class="aj-dtexto">${esc(r.texto)}</p>
       <label class="aj-campo"><span>Gravidade</span>
         <select name="gravidade">
           ${["", "Leve", "Média", "Gravíssimo"].map(g =>
             `<option value="${esc(g)}"${g === atual ? " selected" : ""}>${
               g ? esc(g) + " (" + PONTOS[g] + " ponto" + (PONTOS[g] === -1 ? "" : "s") + ")"
                 : "Sem classificação (0)"}</option>`).join("")}
         </select></label>
       <label class="aj-campo"><span>Categoria</span>
         <input name="categoria" value="${esc(r.categoria || "")}"
                placeholder="ex.: EPI/EPC, Veículos, Procedimento"></label>
       <p class="aj-dtexto">A gravidade decide quantos pontos a equipe perde na
         Jornada Segura quando este item reprova. Já há
         <b>${r.usos || 0}</b> não conformidade(s) registrada(s) nele — elas
         passam a valer a nova pontuação.</p>`,
      "Salvar",
      async form => {
        const g = form.gravidade.value;
        await Banco.classificarPergunta(r.codigo, {
          gravidade: g, pontos_nc: PONTOS[g] || 0,
          categoria: form.categoria.value.trim()
        });
        /* Rebaixa tudo: a pontuação muda indicador, e recalcular na memória
           sem reler o banco arriscaria divergir. */
        await Sincronia.sincronizar();
        this.render(); render();
        this.avisar(g ? `Pergunta classificada como ${g}.`
                      : "Pergunta ficou sem classificação.");
      });
  },

  /* ---------- Tratativas ----------
     O que foi feito com cada não conformidade. As tratativas vêm do banco
     quando a aba abre; as não conformidades, do modelo já montado (FATO),
     como a aba Inspeções — assim o que aparece aqui bate com os números. */
  trat: {},                // "uuid|pergunta" -> tratativa
  tratFotos: {},           // "uuid|pergunta" -> [fotos da resolução]
  tratEm: null,
  buscandoTrat: false,
  catTrat: "",             // categoria escolhida nas pílulas; "" = todas

  async carregarTratativas() {
    if (this.buscandoTrat) return;
    this.buscandoTrat = true;
    try {
      const d = await Banco.baixarTratativas();
      this.trat = {}; this.tratFotos = {};
      d.tratativas.forEach(t => { this.trat[t.inspecao + "|" + t.pergunta] = t; });
      d.fotos.forEach(f => {
        const k = f.inspecao + "|" + f.pergunta;
        (this.tratFotos[k] = this.tratFotos[k] || []).push(f);
      });
      this.tratEm = new Date();
    } catch (e) {
      this.avisar("Não deu para buscar as tratativas: " + e.message, true);
      this.tratEm = new Date();       // não insiste em laço: o botão Sincronizar refaz
    } finally {
      this.buscandoTrat = false;
    }
    this.render();
  },

  /* Abrir a não conformidade: o que foi encontrado, em que inspeção, e o
     que foi feito. Para quem não é administrador a ficha é só leitura. */
  abrirTratativa(r) {
    const pode = Banco.podeEditar();
    const t = this.trat[r.chaveT] || {};
    const fotos = (this.tratFotos[r.chaveT] || []).slice();
    const fotosInsp = FOTOS_POR_INSPECAO[r.id] || [];
    const relato = TEXTO_DESVIOS[r.id] || "";
    const campo = (rot, val) => `<div><b>${esc(rot)}</b>${esc(val || "—")}</div>`;
    const resolvido = t.status === "resolvido";

    this.dialogo(resolvido ? "Não conformidade resolvida" : "Tratar não conformidade",
      `<div class="trat-nc">
         <span class="etiqueta gr-${semAcentoAj(r.gravidade).replace(/[^a-z]/g, "")}">${esc(r.gravidade)}</span>
         <span class="etiqueta">${esc(r.categoria)}</span>
         <p>${esc(r.descricao)}</p>
       </div>
       <div class="ficha-grade">
         ${campo("Data", r.dataStr)}${campo("Equipe", r.equipe || r.equipeBruta)}
         ${campo("Inspetor", r.inspetor || r.inspetorBruto)}${campo("Polo", r.polo)}
         ${campo("Departamento", r.tipo)}
       </div>
       ${relato ? `<p class="aj-dtexto"><b>Relato do inspetor:</b> ${esc(relato)}</p>` : ""}
       ${fotosInsp.length ? `<button type="button" class="aj-mini trat-ver-insp">📷 Ver as
         ${fotosInsp.length} foto${fotosInsp.length > 1 ? "s" : ""} da inspeção</button>` : ""}

       <div class="aj-bloco">
         <h4>Tratativa</h4>
         <label class="aj-campo"><span>Situação</span>
           <select name="status"${pode ? "" : " disabled"}>
             <option value="pendente"${resolvido ? "" : " selected"}>Pendente</option>
             <option value="resolvido"${resolvido ? " selected" : ""}>Resolvido</option>
           </select></label>
         ${resolvido && t.resolvido_em ? `<p class="aj-dtexto">Resolvido em
           ${new Date(t.resolvido_em).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit",
             year: "numeric", hour: "2-digit", minute: "2-digit" })}${
           t.resolvido_por_nome ? " por " + esc(t.resolvido_por_nome) : ""}.</p>` : ""}
         <label class="aj-campo"><span>O que foi feito</span>
           <textarea name="descricao" rows="3"${pode ? "" : " readonly"}
             placeholder="ex.: capacete substituído; equipe reorientada sobre a APR">${esc(t.descricao || "")}</textarea></label>
         <div class="aj-campo"><span>Fotos da resolução</span>
           <div class="trat-fotos"><span class="aj-dtexto">${fotos.length ? "Carregando…" : "Nenhuma ainda."}</span></div>
           ${pode ? `<label class="trat-anexar">
             <input type="file" name="fotos" accept="image/*" multiple>
             <span>＋ Anexar fotos</span></label>
             <div class="trat-novas"></div>` : ""}
         </div>
       </div>`,
      pode ? "Salvar" : "Fechar",
      async form => {
        if (!pode) return;
        const status = form.status.value;
        const descricao = form.descricao.value.trim();
        const novas = [...(form.fotos.files || [])];
        const ficam = fotos.filter(f => !f.remover);
        /* Resolver sem dizer o quê nem mostrar é só apagar o problema da lista. */
        if (status === "resolvido" && !descricao && !novas.length && !ficam.length)
          throw new Error("Para marcar como resolvido, descreva o que foi feito ou anexe uma foto.");

        const reg = { inspecao: r.uuid, pergunta: r.cod, status, descricao };
        /* O nome vai só na hora de resolver: editar a descrição depois não
           troca quem resolveu. O id da conta e a hora o banco carimba. */
        if (status === "resolvido" && t.status !== "resolvido") reg.resolvido_por_nome = Banco.usuario || "";
        await Banco.salvarTratativa(reg);

        for (const f of fotos.filter(x => x.remover)) await Banco.apagarFotoTratativa(f);
        const ok = form.querySelector(".aj-ok");
        for (let i = 0; i < novas.length; i++) {
          ok.textContent = `Enviando foto ${i + 1} de ${novas.length}…`;
          await Banco.subirFotoTratativa(r.uuid, r.cod, await comprimirFoto(novas[i]));
        }
        await this.carregarTratativas();
        this.avisar(status === "resolvido" ? "Não conformidade marcada como resolvida."
                                           : "Tratativa salva.");
      });

    const fundos = canvas.querySelectorAll(".aj-fundo");
    const fundo = fundos[fundos.length - 1];
    const form = fundo.querySelector("form");
    const verInsp = fundo.querySelector(".trat-ver-insp");
    if (verInsp) verInsp.onclick = () => this.verFotos(r, fotosInsp);

    /* As fotos já enviadas: miniatura que abre em tamanho original e, para
       o administrador, um ✕ que marca para apagar ao salvar — apagar na
       hora, sem o Salvar, surpreenderia quem clicou em Cancelar. */
    const caixa = fundo.querySelector(".trat-fotos");
    if (fotos.length) Banco.assinarFotos(fotos.map(f => f.caminho)).then(urls => {
      caixa.innerHTML = "";
      fotos.forEach(f => {
        const d = document.createElement("div");
        d.className = "trat-foto";
        d.innerHTML = urls[f.caminho]
          ? `<a href="${urls[f.caminho]}" target="_blank" rel="noopener"><img src="${urls[f.caminho]}" alt=""></a>`
          : `<span class="foto-erro">indisponível</span>`;
        if (pode) {
          const x = document.createElement("button");
          x.type = "button"; x.className = "trat-tirar"; x.textContent = "✕";
          x.title = "Apagar esta foto ao salvar";
          x.onclick = () => { f.remover = !f.remover; d.classList.toggle("remover", !!f.remover); };
          d.appendChild(x);
        }
        caixa.appendChild(d);
      });
    }).catch(e => { caixa.innerHTML = `<span class="aj-dtexto">Não deu para abrir as fotos: ${esc(e.message)}</span>`; });

    /* Prévia do que vai subir, antes de salvar. */
    const entrada = form.elements.fotos;
    if (entrada) entrada.onchange = () => {
      const alvo = fundo.querySelector(".trat-novas");
      alvo.innerHTML = "";
      [...entrada.files].forEach(a => {
        const img = document.createElement("img");
        img.src = URL.createObjectURL(a);
        img.onload = () => URL.revokeObjectURL(img.src);
        alvo.appendChild(img);
      });
    };
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
    if (secao === "perguntas") return listaPerguntas();
    if (secao === "usuarios") return this.usuarios;
    if (secao === "rascunhos") return this.rascunhos;
    if (secao === "tratativas") {
      const todas = tratativasLinhas();
      return this.catTrat ? todas.filter(r => r.categoria === this.catTrat) : todas;
    }
    if (secao === "inspecoes")
      return this.modoInsp === "nc" ? inspecoesPorNC() : inspecoesAgrupadas();
    return Cadastros.lista(secao);
  },

  /* Quais colunas a aba Inspeções usa agora — depende do modo. */
  colunasInsp() {
    const s = SECOES.inspecoes;
    return this.modoInsp === "nc" ? s.colunas : s.colunasAgrupado;
  },


  /* Relatório em PDF do que está na tela — com os filtros aplicados, não a
     base inteira. Quem filtrou por um polo quer aquele polo.

     Não há biblioteca de PDF aqui, e não vale trazer uma: o painel é um
     arquivo só, sem dependência externa, e escrever PDF à mão quebra em
     acento. Manda IMPRIMIR — o próprio navegador oferece "Salvar como PDF"
     no destino, com texto selecionável e acentuação certa.

     Num iframe escondido, não em aba nova: aba nova costuma ser bloqueada
     como pop-up, e o usuário acharia que o botão não faz nada. */

  /* Clicar na contagem de fotos abre todas as da inspeção, em tamanho grande.

     As URLs são assinadas no CLIQUE, não ao desenhar a tabela: uma tela com
     160 linhas pediria 160 assinaturas para miniaturas que ninguém olharia.
     E elas expiram em uma hora — assinar cedo é assinar duas vezes. */
  ligarFotos(host, linhas) {
    [...host.querySelectorAll("tbody tr")].forEach((tr, i) => {
      const r = linhas[i];
      if (!r) return;

      /* A tabela é uma linha por DESVIO, o que é certo para filtrar e para o
         papel — mas quem olha um desvio quase sempre quer ver a inspeção
         inteira: os outros desvios da mesma visita, o relato e as fotos.
         Clicar na linha junta tudo isso num lugar só. */
      tr.classList.add("aj-clicavel");
      tr.title = "Ver a inspeção inteira: todos os desvios, o relato e as fotos";
      tr.onclick = () => this.verInspecao(r);

      const fotos = FOTOS_POR_INSPECAO[r.id];
      if (!fotos || !fotos.length) return;
      const td = tr.cells[tr.cells.length - 1];
      td.classList.add("tem-fotos");
      td.title = `${fotos.length} foto${fotos.length > 1 ? "s" : ""} — clique para ver`;
      td.onclick = e => { e.stopPropagation(); this.verFotos(r, fotos); };
    });
  },

  /* A inspeção inteira num lugar só: cabeçalho, TODOS os desvios dela, o
     relato escrito pelo inspetor e as fotos.

     A tabela continua desdobrada por desvio (é o que serve para filtrar,
     contar e imprimir); esta ficha é o caminho contrário — do desvio de volta
     para a visita que o encontrou. */
  async verInspecao(linha) {
    const nc = ncDe(linha);
    const fotos = FOTOS_POR_INSPECAO[linha.id] || [];
    const texto = TEXTO_DESVIOS[linha.id] || "";
    const placa = PLACA_POR_INSPECAO[linha.id] || "";
    const pontos = nc.reduce((a, x) => a + (x[4] || 0), 0);

    const fundo = document.createElement("div");
    fundo.className = "aj-fundo aj-fotos aj-ficha";
    const campo = (rot, val) => val
      ? `<div><b>${esc(rot)}</b>${esc(val)}</div>` : "";
    /* A placa aparece MESMO vazia, com um traço: sumir o campo faz parecer
       que o painel não mostra a placa, quando o que houve é que o inspetor
       não digitou. Assim fica claro o que falta — e é editável. */
    const campoPlaca = `<div><b>Placa do veículo</b>${
      placa ? esc(placa) : '<span class="ficha-limpa">não informada pelo inspetor</span>'}</div>`;
    fundo.innerHTML = `<div class="aj-dialogo">
      <div class="aj-dcab">
        <h3>${esc(linha.equipe || linha.equipeBruta || "—")} · ${esc(linha.dataStr)}</h3>
        <button type="button" class="aj-x" aria-label="Fechar">✕</button>
      </div>
      <div class="aj-dcorpo">
        <div class="ficha-grade">
          ${campo("Inspetor", linha.inspetor || linha.inspetorBruto)}
          ${campo("Polo", linha.polo)}
          ${campo("Departamento", linha.tipo)}
          ${campo("Supervisor", linha.supervisor)}
          ${campoPlaca}
          <div><b>Não conformidades</b>${nc.length} · ${pontos} ponto(s)</div>
        </div>

        <div class="ficha-bloco">
          <div class="fotos-rot">Não conformidades</div>
          ${nc.length ? `<ul class="ficha-nc">${nc.map(x => `<li>
              <span class="etiqueta gr-${semAcentoAj(x[3] || "").replace(/[^a-z]/g, "")}">${
                esc(x[3] || "Sem classificação")}</span>
              <span class="ficha-txt">${esc(x[1] || "—")}${
                x[2] ? ` <i>${esc(x[2])}</i>` : ""}</span></li>`).join("")}</ul>`
            : `<p class="aj-dtexto ficha-limpa">Nenhuma não conformidade nesta inspeção.</p>`}
        </div>

        ${texto ? `<div class="ficha-bloco">
          <div class="fotos-rot">Desvios encontrados (relato do inspetor)</div>
          <p class="ficha-livre">${esc(texto)}</p></div>` : ""}

        <div class="ficha-bloco" id="ficha-fotos">${fotos.length
          ? `<div class="fotos-rot">Fotos</div><p class="aj-dtexto">Carregando…</p>`
          : `<div class="fotos-rot">Fotos</div>
             <p class="aj-dtexto ficha-limpa">Nenhuma foto nesta inspeção.</p>`}</div>

        <div class="ficha-pe">
          <button type="button" class="aj-mini" id="ficha-pdf"
            title="Baixar esta inspeção em PDF, com as fotos">⭳ Baixar em PDF</button>
        </div>
      </div>
    </div>`;
    canvas.appendChild(fundo);
    const fechar = () => fundo.remove();
    fundo.querySelector(".aj-x").onclick = fechar;
    fundo.onclick = e => { if (e.target === fundo) fechar(); };
    fundo.querySelector("#ficha-pdf").onclick = e =>
      this.baixarInspecao(linha, e.currentTarget);

    /* As fotos são assinadas só aqui, ao abrir a ficha — assinar ao desenhar
       a tabela seria uma assinatura por linha para imagem que ninguém olha. */
    if (fotos.length) {
      const host = fundo.querySelector("#ficha-fotos");
      try {
        const urls = await Banco.assinarFotos(fotos.map(f => f.caminho));
        host.innerHTML = ["desvio", "boa_pratica"].map(t => {
          const minhas = fotos.filter(f => f.tipo === t);
          if (!minhas.length) return "";
          return `<div class="fotos-bloco">
            <div class="fotos-rot">${t === "desvio" ? "Fotos dos desvios" : "Fotos de boas práticas"}</div>
            <div class="fotos-tira">${minhas.map(f => urls[f.caminho]
              ? `<a href="${urls[f.caminho]}" target="_blank" rel="noopener"
                    title="Abrir em tamanho original"><img src="${urls[f.caminho]}" alt=""></a>`
              : `<span class="foto-erro">indisponível</span>`).join("")}</div></div>`;
        }).join("");
      } catch (e) {
        host.innerHTML = `<div class="fotos-rot">Fotos</div>
          <p class="aj-dtexto">Não deu para abrir as fotos: ${esc(e.message)}</p>`;
      }
    }
  },

  async verFotos(linha, fotos) {
    const fundo = document.createElement("div");
    fundo.className = "aj-fundo aj-fotos";
    fundo.innerHTML = `<div class="aj-dialogo">
      <div class="aj-dcab">
        <h3>${esc(linha.equipe || "—")} · ${esc(linha.dataStr)}</h3>
        <button type="button" class="aj-x" aria-label="Fechar">✕</button>
      </div>
      <div class="aj-dcorpo"><p class="aj-dtexto">Carregando as fotos…</p></div>
    </div>`;
    canvas.appendChild(fundo);
    const fechar = () => fundo.remove();
    fundo.querySelector(".aj-x").onclick = fechar;
    fundo.onclick = e => { if (e.target === fundo) fechar(); };

    const corpo = fundo.querySelector(".aj-dcorpo");
    try {
      const urls = await Banco.assinarFotos(fotos.map(f => f.caminho));
      corpo.innerHTML = ["desvio", "boa_pratica"].map(t => {
        const minhas = fotos.filter(f => f.tipo === t);
        if (!minhas.length) return "";
        return `<div class="fotos-bloco">
          <div class="fotos-rot">${t === "desvio" ? "Desvios" : "Boas práticas"}</div>
          <div class="fotos-tira">${minhas.map(f => urls[f.caminho]
            ? `<a href="${urls[f.caminho]}" target="_blank" rel="noopener"
                  title="Abrir em tamanho original"><img src="${urls[f.caminho]}" alt=""></a>`
            : `<span class="foto-erro">indisponível</span>`).join("")}</div></div>`;
      }).join("") || `<p class="aj-dtexto">Sem fotos.</p>`;
    } catch (e) {
      corpo.innerHTML = `<p class="aj-dtexto">Não deu para abrir as fotos: ${esc(e.message)}</p>`;
    }
  },

  /* Editar a inspeção — só o cabeçalho: equipe, inspetor, data e departamento.

     As RESPOSTAS não se editam aqui, de propósito. Quem respondeu foi o
     inspetor em campo, olhando a turma; mudar isso de escritório apagaria a
     diferença entre o que foi visto e o que alguém preferiria ter visto. Erro
     de resposta se corrige refazendo a inspeção.

     O que se corrige aqui é o que se erra ao começar: escolher a equipe
     errada na lista, a data, ou a inspeção enviada pela conta de outro
     inspetor — e esta última desloca meta e taxa de contato de dois. */
  editarInspecao(linha) {
    const uuid = UUID_POR_ID[linha.id];
    if (!uuid) return this.avisar("Esta inspeção não está no banco — não dá para editar.", true);
    const equipes = Cadastros.equipes.filter(e => e.ativa).map(e => e.equipe).sort(ordemNatural);
    const inspetores = Cadastros.inspetores.filter(i => i.ativo)
      .map(i => i.inspetor).sort(ordemNatural);
    const dep = Object.entries(Sincronia.DEPARTAMENTO);
    const [d, m, a] = String(linha.dataStr).split("/");

    /* Só vale nome do cadastro — a inspeção casa com a equipe e com o
       inspetor pelo nome, e um nome de fora a faria sumir dos números. Por
       isso é lista, e não campo livre: o campo livre só deixava errar e
       tomar a mensagem de recusa lá embaixo.

       Se o nome que a inspeção JÁ TEM não está no cadastro (equipe apagada,
       digitação antiga), ele continua como primeira opção, marcado, para a
       tela mostrar a verdade em vez de trocar por outro nome sem avisar. A
       conferência ao salvar segue valendo e obriga a escolher um válido. */
    const opcoesDoCadastro = (nomes, atual) => {
      /* Cadastro vazio (banco fora do ar): sem a opção atual o campo ficaria
         sem nenhuma, e a conferência ao salvar já não cobra lista vazia. */
      const fora = atual && !nomes.includes(atual);
      return (fora ? `<option value="${esc(atual)}" selected>${esc(atual)}${nomes.length ? " (fora do cadastro)" : ""}</option>` : "")
        + (atual ? "" : `<option value="" selected disabled>— escolha —</option>`)
        + nomes.map(n => `<option value="${esc(n)}"${n === atual ? " selected" : ""}>${esc(n)}</option>`).join("");
    };

    this.dialogo(`Editar inspeção de ${linha.equipe}`,
      `<p class="aj-dtexto">Corrige o cabeçalho da inspeção. <b>As respostas do
         checklist não mudam</b> — elas são o que o inspetor viu em campo.</p>
       <label class="aj-campo"><span>Equipe</span>
         <select name="equipe" required>${opcoesDoCadastro(equipes, linha.equipe)}</select></label>
       <label class="aj-campo"><span>Inspetor</span>
         <select name="inspetor" required>${opcoesDoCadastro(inspetores,
           linha.inspetor || linha.inspetorBruto || "")}</select></label>
       <label class="aj-campo"><span>Data</span>
         <input name="data" type="date" required value="${a}-${m}-${d}"></label>
       <label class="aj-campo"><span>Departamento</span>
         <select name="departamento">${dep.map(([cod, nome]) =>
           `<option value="${cod}"${nome === linha.tipo ? " selected" : ""}>${esc(nome)}</option>`
         ).join("")}</select></label>
       <label class="aj-campo"><span>Placa do veículo</span>
         <input name="placa" maxlength="7" placeholder="AAA1A11"
                value="${esc(PLACA_POR_INSPECAO[linha.id] || "")}"
                style="text-transform:uppercase"></label>
       <p class="aj-dtexto">A placa é digitada pelo inspetor no app e costuma
         faltar nas inspeções antigas — dá para preencher aqui.</p>`,
      "Salvar",
      async form => {
        const equipe = form.equipe.value.trim();
        if (!equipe) throw new Error("Informe a equipe.");
        /* Só cobra a lista se houver lista. Com o cadastro vazio — banco fora
           do ar, por exemplo — a conferência recusaria TODO nome, e o
           administrador ficaria sem conseguir corrigir nada. */
        if (equipes.length && !equipes.includes(equipe)) {
          throw new Error(`"${equipe}" não está no cadastro de equipes. `
            + "A inspeção casa com a equipe pelo nome — um nome fora do cadastro "
            + "faria ela sumir dos números.");
        }
        /* Mesma conferência do nome da equipe, e pela mesma razão: a inspeção
           casa com o inspetor pelo nome. Fora do cadastro, ela deixaria de
           contar na meta e na taxa de contato de qualquer um. */
        const inspetor = form.inspetor.value.trim();
        if (!inspetor) throw new Error("Informe o inspetor.");
        if (inspetores.length && !inspetores.includes(inspetor)) {
          throw new Error(`"${inspetor}" não está no cadastro de inspetores. `
            + "A inspeção casa com o inspetor pelo nome — um nome fora do "
            + "cadastro faria ela sumir da meta e da taxa de contato.");
        }
        /* Placa normalizada como o app faz: só letra e número, maiúsculas —
           "qfd 8e92" e "QFD8E92" contavam como veículos diferentes. */
        const placa = String(form.placa.value || "").toUpperCase()
          .replace(/[^A-Z0-9]/g, "").slice(0, 7);
        await Banco.atualizar("sesmt_inspecoes", uuid, {
          equipe, inspetor, data: form.data.value,
          departamento: form.departamento.value, placa: placa || null
        });
        /* Rebaixa tudo: mudar equipe ou data mexe em quase todo indicador,
           e recalcular na memória sem reler o banco arriscaria divergir. */
        await Sincronia.sincronizar();
        this.render(); render();
        this.avisar(`Inspeção atualizada para ${equipe}.`);
      });
  },

  /* Excluir a inspeção. Leva junto respostas e fotos, por cascata no banco. */
  excluirInspecao(linha) {
    const uuid = UUID_POR_ID[linha.id];
    if (!uuid) return this.avisar("Esta inspeção não está no banco — não dá para excluir.", true);
    const nc = ncDe(linha).length;
    const fotos = (FOTOS_POR_INSPECAO[linha.id] || []).length;

    this.dialogo(`Excluir a inspeção de ${linha.equipe}?`,
      `<p class="aj-dtexto">Serão apagados <b>${nc} não conformidade(s)</b> e
         <b>${fotos} foto(s)</b>, além da própria inspeção. <b>Não dá para
         desfazer</b> — nem o inspetor consegue reenviá-la.</p>
       <p class="aj-dtexto">Os números do painel mudam na hora: a equipe
         ${esc(linha.equipe)} recupera os pontos descontados, e a inspeção sai
         da contagem de ${esc(linha.inspetor || "—")}.</p>
       <label class="aj-campo"><span>Digite EXCLUIR para confirmar</span>
         <input name="confirma" autocomplete="off" placeholder="EXCLUIR"></label>`,
      "Excluir", async form => {
        /* Digitar a palavra, e não só clicar: apagar inspeção é irreversível
           e mexe em indicador de segurança do trabalho. */
        if (form.confirma.value.trim().toUpperCase() !== "EXCLUIR") {
          throw new Error('Digite EXCLUIR para confirmar.');
        }
        await Banco.excluir("sesmt_inspecoes", uuid);
        await Sincronia.sincronizar();
        this.render(); render();
        this.avisar(`Inspeção de ${linha.equipe} · ${linha.dataStr} excluída.`);
      }, true);
  },

  /* Relatório de UMA inspeção, com as fotos dentro.

     As fotos são convertidas para dados embutidos no documento, e não
     referenciadas pelo link assinado. O link expira em uma hora: um PDF
     salvo com links viraria uma folha de quadrados vazios no dia seguinte,
     que é exatamente quando alguém vai abri-lo. Embutir custa tamanho —
     cada foto some 33% ao virar base64 — e é o preço de o arquivo valer
     sozinho, sem depender do servidor nem de sessão. */
  async baixarInspecao(linha, botao) {
    const antes = botao ? botao.textContent : "";
    if (botao) { botao.disabled = true; botao.textContent = "…"; }
    try {
      const nc = ncDe(linha);
      const fotos = FOTOS_POR_INSPECAO[linha.id] || [];
      const texto = TEXTO_DESVIOS[linha.id] || "";
      const placa = PLACA_POR_INSPECAO[linha.id] || "";

      let embutidas = [];
      if (fotos.length) {
        const urls = await Banco.assinarFotos(fotos.map(f => f.caminho));
        embutidas = await Promise.all(fotos.map(async f => {
          try {
            const r = await fetch(urls[f.caminho]);
            const b = await r.blob();
            const dados = await new Promise((ok, falha) => {
              const fr = new FileReader();
              fr.onload = () => ok(fr.result);
              fr.onerror = () => falha(new Error("falhou"));
              fr.readAsDataURL(b);
            });
            return { tipo: f.tipo, dados };
          } catch (e) { return null; }   // uma foto quebrada não derruba o relatório
        }));
        embutidas = embutidas.filter(Boolean);
      }

      const bloco = t => {
        const minhas = embutidas.filter(f => f.tipo === t);
        if (!minhas.length) return "";
        return `<h2>${t === "desvio" ? "Fotos dos desvios" : "Fotos de boas práticas"}</h2>
          <div class="fotos">${minhas.map(f =>
            `<img src="${f.dados}" alt="">`).join("")}</div>`;
      };

      const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
        <title>Inspecao ${esc(linha.equipe)} ${esc(linha.dataStr)}</title><style>
          @page { size: A4 portrait; margin: 14mm 12mm }
          body { font: 11.5px "Open Sans", Arial, sans-serif; color: #241f1a; margin: 0 }
          h1 { font-size: 17px; margin: 0 0 2px }
          .sub { color: #7b7168; font-size: 10px; margin: 0 0 12px }
          h2 { font-size: 12px; text-transform: uppercase; letter-spacing: .06em;
               color: #7b7168; border-bottom: 1.5px solid #241f1a;
               padding-bottom: 4px; margin: 16px 0 8px }
          .ficha { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px 18px }
          .ficha div { border-bottom: 1px solid #e6e0d8; padding: 4px 0 }
          .ficha b { display: block; font-size: 9px; text-transform: uppercase;
                     letter-spacing: .06em; color: #7b7168; font-weight: 700 }
          ul { margin: 0; padding-left: 16px }
          li { margin: 4px 0; line-height: 1.45; break-inside: avoid }
          .g { font-weight: 800 }
          .gravissimo { color: #b3261e } .media { color: #8a4b00 } .leve { color: #31536e }
          .livre { white-space: pre-wrap; line-height: 1.5;
                   background: #fbf8f4; padding: 9px 11px; border-radius: 7px }
          .fotos { display: flex; flex-wrap: wrap; gap: 8px }
          /* Duas por linha: menor que isso não se enxerga o desvio, que é o
             motivo de a foto existir no relatório. */
          .fotos img { width: 48%; border-radius: 6px; break-inside: avoid }
          .limpa { color: #1d5220; font-weight: 700 }
          .rodape { margin-top: 16px; font-size: 9px; color: #a49a90 }
        </style></head><body>
        <h1>Inspeção — ${esc(linha.equipe || "—")}</h1>
        <p class="sub">Inspeções SESMT · Regional Oeste — gerado em ${
          new Date().toLocaleString("pt-BR")}</p>

        <div class="ficha">
          <div><b>Data</b>${esc(linha.dataStr)}</div>
          <div><b>Inspetor</b>${esc(linha.inspetor || linha.inspetorBruto || "—")}</div>
          <div><b>Departamento</b>${esc(linha.tipo || "—")}</div>
          <div><b>Polo</b>${esc(linha.polo || "—")}</div>
          <div><b>Supervisor</b>${esc(linha.supervisor || "—")}</div>
          <div><b>Não conformidades</b>${nc.length} · ${
            nc.reduce((a, x) => a + (x[4] || 0), 0)} ponto(s)</div>
          ${placa ? `<div><b>Placa do veículo</b>${esc(placa)}</div>` : ""}
        </div>

        <h2>Não conformidades</h2>
        ${nc.length ? `<ul>${nc.map(x => `<li>
            <span class="g ${semAcentoAj(x[3] || "").replace(/[^a-z]/g, "")}">${
              esc(x[3] || "Sem classificação")}</span>${
              x[4] ? ` (${x[4]} pt)` : ""} — ${esc(x[1])}${
              x[2] ? ` <i>${esc(x[2])}</i>` : ""}</li>`).join("")}</ul>`
          : `<p class="limpa">Nenhuma não conformidade registrada nesta inspeção.</p>`}

        ${texto ? `<h2>Desvios encontrados (relato do inspetor)</h2>
          <div class="livre">${esc(texto)}</div>` : ""}

        ${bloco("desvio")}${bloco("boa_pratica")}
        ${fotos.length && !embutidas.length
          ? `<p class="sub">As fotos não puderam ser carregadas.</p>` : ""}

        <p class="rodape">Painel de Inspeções SESMT — os mesmos dados da tela.</p>
        </body></html>`;

      const q = document.createElement("iframe");
      q.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
      q.srcdoc = html;
      q.onload = () => {
        q.contentWindow.focus();
        q.contentWindow.print();
        setTimeout(() => q.remove(), 60000);
      };
      document.body.appendChild(q);
      this.avisar(`Relatório de ${linha.equipe} · ${linha.dataStr} — ${nc.length} `
        + `não conformidade(s) e ${embutidas.length} foto(s). `
        + `Na janela de impressão, escolha "Salvar como PDF".`);
    } catch (e) {
      this.avisar("Não deu para gerar o relatório: " + e.message, true);
    } finally {
      if (botao) { botao.disabled = false; botao.textContent = antes; }
    }
  },

  /* As perguntas em planilha, com categoria e gravidade.

     Sai em .xlsx, não em CSV. O CSV abre no Excel, mas não se deixa
     trabalhar: guarda só texto, e a formatação some ao salvar — quem
     classificou 35 perguntas em 08/09/2026 reabriu o arquivo cru e achou que
     nada tinha sido salvo. O .xlsx guarda o que o Excel mostra, e o Ctrl+S
     não faz pergunta nenhuma.

     Sai o que está na tela: com os filtros e a busca aplicados. Quem filtrou
     por "Sem classificação" quer levar justamente essas. */
  baixarPerguntas() {
    const linhas = this.linhasVisiveis();
    if (!linhas.length) return this.avisar("Não há perguntas para baixar com esses filtros.", true);

    /* Tres colunas, só o que se preenche. Pontos, N.C registradas e o código
       da pergunta ficam na tela: na planilha eram ruído para quem está ali
       para classificar, e coluna a mais é coluna que alguém apaga sem querer.
       O casamento na volta é pelo TEXTO da pergunta, que é único. */
    const colunas = [
      { titulo: "Pergunta",  largura: 95, valor: r => r.texto },
      { titulo: "Categoria", largura: 22, valor: r => r.categoria },
      { titulo: "Gravidade", largura: 22, valor: r => r.gravidade }
    ];
    /* A gravidade vira lista suspensa na coluna C: digitada à mão ela viraria
       "Gravissimo" e "grave", que não casam com o cadastro na hora de voltar. */
    const blob = planilhaXlsx("Perguntas", colunas, linhas,
      { C: ["Sem classificação", "Leve", "Média", "Gravíssimo"] });

    const nome = "perguntas-checklist-sesmt-"
      + new Date().toISOString().slice(0, 10) + ".xlsx";
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = nome;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);

    const semClass = linhas.filter(r => !r.gravidade || r.gravidade === "Sem classificação").length;
    this.avisar(`${linhas.length} pergunta(s) na planilha`
      + (semClass ? ` — ${semClass} ainda sem classificação.` : ".")
      + " A coluna Gravidade tem lista suspensa: escolha por ela.");
  },

  baixarPDF() {
    const s = SECOES[this.secao];
    const linhas = this.linhasVisiveis();
    if (!linhas.length) return this.avisar("Não há nada para baixar com esses filtros.", true);

    /* Quais filtros valiam. Sem isso o relatório vira um número solto, e
       ninguém lembra depois se aquilo era o ano todo ou um polo só. */
    const usados = Object.entries(this.filtros).filter(([, v]) => v && v.length)
      .map(([k, v]) => {
        const f = s.filtros.find(x => x[0] === k) || [k, k];
        /* Pelo código ninguém entende o relatório: sai por extenso, como na tela. */
        return `${f[1]}: ${v.map(x => f[3] ? f[3](x) : x).join(", ")}`;
      });
    if (this.busca.trim()) usados.push(`busca: "${this.busca.trim()}"`);

    /* Cada linha é uma N.C — menos as "Sem desvio". E como a inspeção se
       repete a cada desvio, contar inspeção é contar id distinto. */
    const agrupado = this.secao === "inspecoes" && this.modoInsp !== "nc";
    const totalNC = agrupado ? linhas.reduce((a, r) => a + (r.qtdNC || 0), 0)
                             : linhas.filter(r => r.temNC).length;
    const inspecoes = new Set(linhas.map(r => r.id)).size;
    const semNC = linhas.filter(r => !r.temNC).length;
    const pontos = linhas.reduce((a, r) => a + (r.pontosNC || 0), 0);
    const agora = new Date();

    /* No papel as não conformidades vão ABAIXO da inspeção, na mesma folha —
       é o que dá sentido ao relatório: a visita e o que ela encontrou. */
    /* Tabela plana, igual à da tela: uma linha por não conformidade. A
       gravidade ganha cor no papel — é o que se procura primeiro. */
    const colsPDF = this.secao === "inspecoes" ? this.colunasInsp() : s.colunas;
    const corpo = linhas.map(r => {
      const classe = semAcentoAj(r.gravidade || "").replace(/[^a-z]/g, "");
      return `<tr class="${r.temNC ? "insp" : "insp limpa"}">` + colsPDF.map(c =>
        `<td${/gravidade/i.test(c.t) ? ` class="grav ${classe}"` : ""}>${esc(c.v(r))}</td>`
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
        td.media { color: #8a4b00 }
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
      <table><thead><tr>${colsPDF.map(c => `<th>${esc(c.t)}</th>`).join("")}</tr></thead>
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
        /* No modo "por inspeção" a linha tem VÁRIAS gravidades: filtrar por
           Gravíssimo tem de trazer a visita que encontrou um gravíssimo e dois
           leves. Por isso a comparação aceita lista, não só valor único. */
        if (campo === "gravidade" && Array.isArray(r.gravidades)) {
          if (!r.gravidades.some(g => sel.includes(String(g)))) return false;
          continue;
        }
        const val = campo === s.statusK ? (r[campo] ? "Ativo" : "Inativo")
          : (valorDoCampo(r, campo) || "");
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
      : this.secao === "tratativas"
      /* Pendente antes de resolvido; entre as pendentes, a mais grave e,
         empatando, a MAIS ANTIGA — é a que está esperando há mais tempo. */
      ? (a, b) => (a.situacao === "Pendente" ? 0 : 1) - (b.situacao === "Pendente" ? 0 : 1)
                  || (postoGravidade(a.gravidade) - postoGravidade(b.gravidade))
                  || (a.serial + a.dataStr).localeCompare(b.serial + b.dataStr)
      : this.secao === "usuarios"
      // administradores, inspetores, quem está sem login, visualizadores e,
      // por último, as contas sem nível — que são as que pedem atenção
      ? (a, b) => ORDEM_NIVEL.indexOf(a.nivel) - ORDEM_NIVEL.indexOf(b.nivel)
                  || String(a.nome || a.email).localeCompare(String(b.nome || b.email), "pt-BR")
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
    this.el.querySelector(".aj-desc").textContent = this.secao === "usuarios"
      ? (Banco.podeEditar()
         ? SECOES.usuarios.desc
         : "O cadastro de quem inspeciona — função, polo e meta. As contas de "
           + "acesso só o administrador vê e gerencia.")
      : this.secao === "inspecoes"
      ? (this.modoInsp === "nc"
         ? "Uma linha por não conformidade — para filtrar por gravidade, contar desvio "
           + "e imprimir. Clique numa linha para ver a inspeção inteira."
         : "Uma linha por inspeção. Clique nela para ver todas as não conformidades "
           + "encontradas, com a gravidade de cada uma, o relato e as fotos.")
      : s.desc;
    /* O mesmo botão do canto serve a três propósitos: criar, baixar, ou nada.
       Rascunho não se cria pelo painel (nasce no app) e inspeção também não —
       nela o botão vira o download. */
    const btNovo = this.el.querySelector(".aj-novo");
    /* Botão de criar só para quem pode gravar: quem entra como visualizador
       via um "+ Nova equipe" que o banco recusaria, e o erro parecia defeito. */
    btNovo.style.display = (s.somenteLeitura && !s.baixar && !s.novo)
      || (!s.baixar && !Banco.podeEditar()) ? "none" : "";
    btNovo.querySelector("span").textContent = s.baixar || s.novo || "";
    btNovo.firstChild.textContent = s.baixar ? "" : "+ ";
    /* A aba de usuários é só-leitura no sentido do cadastro (não mexe em
       tabela do banco), mas tem criação própria: a conta nasce na função de
       servidor, não aqui. */
    if (this.secao === "usuarios") {
      btNovo.style.display = Banco.podeEditar() ? "" : "none";
      btNovo.onclick = () => this.abrirUsuario(null);
    } else if (this.secao === "perguntas") {
      /* Aqui o botão baixa a planilha, e vale para quem só olha também:
         levar a classificação para o Excel não mexe em nada. */
      btNovo.style.display = "";
      btNovo.firstChild.textContent = "";
      btNovo.querySelector("span").textContent = "⭳ Baixar Excel";
      btNovo.onclick = () => this.baixarPerguntas();
    } else {
      btNovo.onclick = s.baixar ? () => this.baixarPDF() : () => this.abrirDialogo(null);
    }

    this.renderEstado();
    this.renderFiltros();

    const linhas = this.linhasVisiveis();
    const host = this.el.querySelector(".aj-tabela");
    const podeEditar = Banco.podeEditar();

    if (s.somenteLeitura) {
      /* Aba aberta e nunca buscada — acontece ao montar o painel já nos
         Ajustes, sem passar pelo clique na aba. Busca uma vez e volta. */
      if (this.secao === "tratativas" && !this.tratEm && !this.buscandoTrat
          && Banco.autenticado()) {
        this.carregarTratativas();
      }
      if (this.secao === "rascunhos" && !this.rascunhosEm
          && !this.buscandoRascunhos && Banco.autenticado()) {
        this.carregarRascunhos();
      }
      if (this.secao === "usuarios" && !this.usuariosEm && !this.buscandoUsuarios) {
        this.carregarUsuarios();
      }
      /* Uma lixeira por linha, e não o menu ⋮: aqui só há uma ação.
         Aparece para administrador — a política do banco recusaria de
         qualquer jeito, mas botão que só serve para dar erro é armadilha.

         SÓ em rascunhos. A regra valia para qualquer seção só-leitura e a
         lixeira apareceu na aba Inspeções, onde um clique chamaria
         excluirRascunho() sobre uma inspeção de verdade. Inspeção enviada
         não se apaga pelo painel. */
      /* Na aba Inspeções cada linha ganha ações próprias. Baixar vale para
         qualquer uma; editar e excluir, só para as que vieram do APP — as do
         histórico moram no data.js, não no banco, e não há o que alterar. */
      const acaoInsp = this.secao !== "inspecoes" ? [] : [{ titulo: "Ações", valor: r => {
        const d = document.createElement("div");
        d.className = "aj-acoes-linha";
        const doApp = String(r.id).startsWith("app-");
        const bt = (txt, dica, fn, classe) => {
          const b = document.createElement("button");
          b.className = "aj-mini " + (classe || "");
          b.textContent = txt; b.title = dica;
          b.onclick = e => { e.stopPropagation(); fn(b); };
          d.appendChild(b);
        };
        bt("⭳", "Baixar esta inspeção em PDF, com as fotos",
           b => this.baixarInspecao(r, b));
        if (podeEditar && doApp) {
          bt("✎", "Editar equipe, data ou departamento desta inspeção",
             () => this.editarInspecao(r));
          bt("🗑", "Excluir esta inspeção, com respostas e fotos",
             () => this.excluirInspecao(r), "perigo");
        }
        return d;
      } }];

      const acaoPerg = podeEditar && this.secao === "perguntas" ? [{ titulo: "Ações", valor: r => {
        const b = document.createElement("button");
        b.className = "aj-mini";
        b.textContent = "✎";
        b.title = "Classificar esta pergunta";
        b.onclick = e => { e.stopPropagation(); this.classificarPergunta(r); };
        return b;
      } }] : [];

      const acaoUsu = podeEditar && this.secao === "usuarios" ? [{ titulo: "Ações", valor: r => {
        const d = document.createElement("div");
        d.className = "aj-acoes-linha";
        const bt = (txt, dica, fn, classe) => {
          const b = document.createElement("button");
          b.className = "aj-mini " + (classe || "");
          b.textContent = txt; b.title = dica;
          b.onclick = e => { e.stopPropagation(); fn(); };
          d.appendChild(b);
        };
        bt("✎", "Editar este usuário", () => this.abrirUsuario(r));
        /* Ninguém apaga a própria conta: a função também recusa, mas botão
           que só dá erro é armadilha. */
        if (r.id !== this.usuarioEu)
          bt("🗑", "Apagar este usuário", () => this.removerUsuario(r), "perigo");
        return d;
      } }] : [];

      const acao = podeEditar && this.secao === "rascunhos" ? [{ titulo: "Ações", valor: r => {
        const b = document.createElement("button");
        b.className = "aj-lixeira";
        b.textContent = "🗑";
        b.title = `Excluir o rascunho de ${r.equipe || "—"}`;
        b.onclick = () => this.excluirRascunho(r);
        return b;
      } }] : [];
      const cols = this.secao === "inspecoes" ? this.colunasInsp() : s.colunas;
      tabela(host, acao.concat(acaoPerg).concat(acaoUsu).concat(acaoInsp).concat(cols.map(c => ({
        titulo: c.t, num: c.num,
        valor: r => c.etiqueta
          ? Object.assign(document.createElement("span"), {
              /* A gravidade ganha cor pela própria classe: é o que se procura
                 primeiro numa lista de desvios, e etiqueta cinza obrigava a
                 ler palavra por palavra. */
              className: "etiqueta" + (/gravidade/i.test(c.t)
                ? " gr-" + semAcentoAj(c.v(r)).replace(/[^a-z]/g, "") : ""),
              textContent: c.v(r) })
          : c.v(r),
        classe: () => c.forte ? "forte" : ""
      }))), linhas);
      if (this.secao === "inspecoes") this.ligarFotos(host, linhas);
      if (this.secao === "tratativas") {
        [...host.querySelectorAll("tbody tr")].forEach((tr, i) => {
          if (!linhas[i]) return;
          tr.classList.add("aj-clicavel");
          tr.title = Banco.podeEditar() ? "Tratar esta não conformidade" : "Ver a tratativa";
          tr.onclick = () => this.abrirTratativa(linhas[i]);
        });
      }
      const cont = this.el.querySelector(".aj-cont");
      if (cont) {
        const total = this.fonte(this.secao).length;
        // na aba Inspeções cada linha é um desvio, não uma inspeção
        const nome = this.secao === "perguntas"
          ? (linhas.length === 1 ? "pergunta" : "perguntas")
          : this.secao === "usuarios"
          ? (linhas.length === 1 ? "usuário" : "usuários")
          : this.secao === "tratativas"
          ? (linhas.length === 1 ? "não conformidade" : "não conformidades")
          : this.secao === "inspecoes"
          ? (this.modoInsp === "nc" ? (linhas.length === 1 ? "linha" : "linhas")
                                    : (linhas.length === 1 ? "inspeção" : "inspeções"))
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
      /* Sessão vencida e servidor fora do ar não são a mesma coisa, e mandar
         "tentar de novo" numa sessão morta faz o usuário repetir um botão que
         nunca vai funcionar. O 401 vem com mensagem própria de pedir(). */
      const vencida = /sess|401|expir/i.test(Banco.erro || "");
      this.estado.className = "aj-estado erro";
      this.estado.innerHTML = vencida
        ? `<span><b>Sua sessão expirou.</b> Entre de novo para ver os dados do banco —
             o painel está mostrando apenas o cadastro embutido.
             ${Banco.erro ? `<i>${Banco.erro}</i>` : ""}</span>
           <button class="aj-tentar">Entrar de novo</button>`
        : `<span>Sem conexão com o banco — mostrando os cadastros embutidos no painel.
             ${Banco.erro ? `<i>${Banco.erro}</i>` : ""} As alterações valem só nesta sessão.</span>
           <button class="aj-tentar">Tentar de novo</button>`;
      this.estado.querySelector(".aj-tentar").onclick = async () => {
        if (vencida) return this.sair();
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

    /* Alternador de modo — só na aba Inspeções. Os dois jeitos de olhar a
       mesma coisa: a visita (o que a tela pede) e o desvio (o que a planilha
       e o papel pedem). */
    if (this.secao === "tratativas") {
      /* Pílulas de categoria: cada uma diz quantas N.C ainda estão
         PENDENTES de quantas existem. É a pergunta de quem abre a aba. */
      const todas = tratativasLinhas();
      const cats = [...new Set(todas.map(r => r.categoria))].sort((x, y) =>
        x === "Sem categoria" ? 1 : y === "Sem categoria" ? -1 : x.localeCompare(y, "pt-BR"));
      const conta = lista => {
        const p = lista.filter(r => r.situacao === "Pendente").length;
        return `<small>${p} pendente${p === 1 ? "" : "s"} de ${lista.length}</small>`;
      };
      const d = document.createElement("div");
      d.className = "aj-filtro trat-cats";
      d.innerHTML = `<span>Categoria</span><div class="trat-pilulas">
        <button type="button" data-c=""${this.catTrat ? "" : ' class="on"'}>Todas ${conta(todas)}</button>
        ${cats.map(c => `<button type="button" data-c="${esc(c)}"${this.catTrat === c ? ' class="on"' : ""}>${
          esc(c)} ${conta(todas.filter(r => r.categoria === c))}</button>`).join("")}</div>`;
      d.querySelectorAll("button").forEach(b => b.onclick = () => {
        this.catTrat = b.dataset.c;
        this.render();
      });
      host.appendChild(d);
    }
    if (this.secao === "inspecoes") {
      const d = document.createElement("div");
      d.className = "aj-filtro aj-modo";
      d.innerHTML = `<span>Ver</span>
        <div class="aj-modo-bts">
          <button type="button" data-m="inspecao"${this.modoInsp !== "nc" ? ' class="on"' : ""}
            title="Uma linha por inspeção; clique nela para ver as não conformidades">Por inspeção</button>
          <button type="button" data-m="nc"${this.modoInsp === "nc" ? ' class="on"' : ""}
            title="Uma linha por não conformidade — para filtrar, contar e imprimir">Por não conformidade</button>
        </div>`;
      d.querySelectorAll("button").forEach(b => b.onclick = () => {
        this.modoInsp = b.dataset.m;
        try { localStorage.setItem("sesmt.modoInsp", this.modoInsp); } catch (e) {}
        /* Gravidade muda de significado entre os modos: o que estava marcado
           num não vale no outro. */
        this.filtros = {};
        this.render();
      });
      host.appendChild(d);
    }
    s.filtros.forEach(([campo, rot, ordenar, rotular]) => {
      const fonte = this.fonte(this.secao);
      /* O código continua sendo o valor marcado; o rótulo é só o que se lê. */
      const rotulo = v => rotular ? rotular(v) : v;
      const brutos = campo === s.statusK ? ["Ativo", "Inativo"]
        : campo === "gravidade" && fonte.length && Array.isArray(fonte[0].gravidades)
        ? [...new Set(fonte.flatMap(r => r.gravidades).filter(Boolean))]
        : [...new Set(fonte.map(r => valorDoCampo(r, campo)).filter(Boolean))];
      const vals = ordenar ? brutos.sort(ordenar)
        : rotular ? brutos.sort((a, b) => ordemNatural(rotulo(a), rotulo(b)))
        : brutos.sort(ordemNatural);
      const escolhidos = this.filtros[campo] || [];

      const d = document.createElement("div");
      d.className = "aj-filtro aj-multi";
      d.innerHTML = `<span>${rot}</span>
        <button type="button" class="aj-mbotao">${
          !escolhidos.length ? "Todos"
          : escolhidos.length === 1 ? esc(rotulo(escolhidos[0]))
          : escolhidos.length + " selecionados"}</button>
        <div class="aj-mlista">
          <label class="aj-mtodos"><input type="checkbox"${
            !escolhidos.length ? " checked" : ""}> <b>Todos</b></label>
          ${vals.map(v => `<label><input type="checkbox" value="${esc(v)}"${
            escolhidos.includes(String(v)) ? " checked" : ""}> ${esc(rotulo(v))}</label>`).join("")}
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
    busca.innerHTML = `<span>Buscar</span><input type="search" placeholder="${this.secao === "usuarios" ? "nome, e-mail, cargo…" : "nome, supervisor…"}" value="${esc(this.busca)}">`;
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
    /* O acesso (login, senha, e-mail) saiu daqui em 27/10/2026: é assunto da
       aba Usuários, onde está o inspetor e todos os outros níveis. Esta aba
       ficou com o CADASTRO — nome, função, polo e meta. */
    d.innerHTML = `<button class="aj-pontos" title="Ações">⋮</button>
      <div class="aj-menu">
        <button data-a="editar">✎ Editar</button>
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
        else this.confirmarExclusao(registro);
      };
    });
    return d;
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
      /* Escolher da lista é o caminho normal; digitar um nome novo é a
         exceção, e fica atrás de "Outro…".

         Era um <input list=datalist> até 27/10/2026. Parecia um campo de
         texto vazio, e quem não soubesse clicar na setinha não descobria
         que havia nomes cadastrados — pior ainda com o campo já preenchido,
         porque o Chrome filtra a lista pelo que está escrito e a seta passa
         a não mostrar mais ninguém.

         O <input> continua existindo e continua sendo quem leva o valor
         para o formulário, por isso o salvamento não mudou. */
      if (c.tipo === "select-livre") {
        const atual = dados[c.k] || "";
        const ops = c.origem();
        if (atual && !ops.includes(atual)) ops.unshift(atual);
        return `<label class="aj-campo"><span>${c.rot}</span>
          <select class="aj-livre">
            <option value=""${atual ? "" : " selected"}>— não informado —</option>
            ${ops.map(o => `<option value="${esc(o)}"${o === atual ? " selected" : ""}>${esc(o)}</option>`).join("")}
            <option value="__digitar__">Outro… (digitar um nome novo)</option>
          </select>
          <input name="${c.k}" class="aj-livre-texto" value="${esc(atual)}" hidden
                 autocomplete="off" placeholder="Digite o nome"></label>`;
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

    /* Liga a lista ao campo de texto escondido que leva o valor. Fica aqui,
       e não em abrirDialogo, para valer em qualquer diálogo que use
       "select-livre". */
    form.querySelectorAll(".aj-livre").forEach(sel => {
      const txt = sel.parentElement.querySelector(".aj-livre-texto");
      sel.addEventListener("change", () => {
        if (sel.value === "__digitar__") {
          txt.hidden = false; txt.value = ""; txt.focus();
        } else {
          txt.hidden = true; txt.value = sel.value;
          /* quem acompanha o campo (a meta segue a função) fica sabendo */
          txt.dispatchEvent(new Event("input"));
        }
      });
    });

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


    /* A meta acompanha a FUNÇÃO, do mesmo jeito que o e-mail acompanha o
       nome: escolheu "Supervisor", a meta vira 4; "Técnico de Segurança",
       12. Cada função tem seu número em META_POR_FUNCAO.

       Continua sendo só sugestão. Digitou a meta à mão, o campo é seu e
       para de mudar sozinho — é o que preserva a exceção de quem tem meta
       diferente da função. Função sem padrão cadastrado não mexe no campo. */
    const campoFuncao = form.elements.funcao, campoMeta = form.elements.meta;
    if (campoFuncao && campoMeta) {
      let metaAMao = false;
      campoMeta.oninput = () => { metaAMao = true; };
      campoFuncao.oninput = () => {
        if (metaAMao) return;
        const m = metaDaFuncao(campoFuncao.value);
        if (m !== undefined) campoMeta.value = m;
      };
      // cadastro novo já abre com a meta da função, se ela veio preenchida
      if (!campoMeta.value || campoMeta.value === "0") campoFuncao.oninput();
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
