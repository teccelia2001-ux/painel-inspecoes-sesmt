# Painel de Inspeções SESMT

Réplica web de um painel de inspeções de segurança feito originalmente em Power BI.
Um único arquivo HTML, sem servidor, sem build e sem dependências externas —
abre em celular, tablet e computador.

**Acesso:** https://teccelia2001-ux.github.io/painel-inspecoes-sesmt/

## O que o painel mostra

Sete páginas, as mesmas do relatório original:

| Página | Conteúdo |
|---|---|
| PAINEL | Menu e resumo geral |
| Taxa de Contato | Realizado × meta por inspetor, separado em SESMT e OPERAÇÃO |
| Ranking | Desempenho individual, com % da meta atingida |
| Avanço Mensal | Evolução mês a mês da taxa de contato e do ICIT |
| ICIT | Conformidade, inconformidades por categoria e top 5 desvios |
| Inspeções por dia | Volume diário |
| Jornada Segura | Ranking de pontuação das equipes |

Filtros de Ano, Mês, Área, Inspetor, Função, Supervisor e Equipe, sincronizados
entre todas as páginas.

Link direto para uma página pela âncora do endereço: `#icit`, `#jornada`,
`#ranking`, `#taxa`, `#avanco`, `#dia`, `#painel`.

## Dois KPIs centrais

- **Taxa de Contato** — inspeções realizadas ÷ meta, rateada por dias úteis decorridos.
- **ICIT** — Índice de Conformidade de Inspeção: inspeções sem nenhuma não
  conformidade ÷ inspeções totais.

## Estrutura do repositório

    index.html      página publicada (gerada — não editar à mão)
    dashboard.html  cópia idêntica, para anexar em e-mail
    web/            fontes
      data.js       dados
      model.js      medidas (equivalente ao DAX) e propagação de filtros
      charts.js     visuais em SVG
      app.js        páginas e layout
      index.html    versão multi-arquivo, para desenvolver
      build.sh      gera index.html e dashboard.html
    ESTRUTURA-DASHBOARD.md   engenharia reversa do relatório original

Depois de editar qualquer fonte:

```bash
cd web && bash build.sh
```

## Fidelidade ao original

Os valores foram conferidos contra o relatório Power BI original consultando a
API do serviço. Batem exatamente: 118 inspeções, 47 com não conformidade,
80 não conformidades, meta 264, meta proporcional 168,91954, ICIT 60,17%.
Também conferidos linha a linha o ranking por inspetor e a pontuação das
13 equipes da Jornada Segura, além da propagação dos filtros.

Detalhes em [ESTRUTURA-DASHBOARD.md](ESTRUTURA-DASHBOARD.md).
