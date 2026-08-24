# Dashboard de Inspeções (SESMT / Teccel) — Engenharia reversa da estrutura

Fonte: relatório público Power BI `r=...cfd905e6-f1a7-4080-b079-63b510def900`
Capacidade **Brazil South**. Tema base: **CY18SU07**.
Canvas: 1280x720 (páginas PAINEL e Ranking) e **1510x720** (demais páginas).

---

## 1. Modelo de dados

### Tabelas de fato (inspeções)
Padrão: cada formulário/checklist vira um par de tabelas — versão "geral" e versão "Teccel" (empreiteira):

| Tabela | Colunas | Observação |
|---|---|---|
| `DEOP Inspeções` / `DEOP Inspeções Teccel` | 42 | obras/emergência |
| `DECP Inspeções` / `DECP Inspeções Teccel` | 42 | construção |
| `DCMD LV Inspeções` / `... Teccel` | 40 | linha viva |
| `DCMD PODA Inspeções` / `... Teccel` | 47 | poda |
| `Inspeções1` (16) / `Inspeções Teccel1` (17) | — | **tabela unificada** (append de todas as anteriores) |

Colunas de `Inspeções Teccel1` (a que os visuais realmente usam):
`Carimbo de data/hora`, `Data da Inspeção`, `Equipe Inspecionada`, `Inspetor`, `Placa`,
`Desvios Encontrados`, `Fotos dos desvios encontrados`, `Fotos boas práticas`, `ID`,
`Perguntas`, `Conformidade`, `Categoria`, `Gravidade`, `Pontos`, `EQUIPE_ID`, `Pontos N.C`, `Tipo Serviço`.

> A origem é claramente **Google Forms/Sheets** (`Carimbo de data/hora`, colunas de fotos). Cada linha é **uma pergunta de checklist**, não uma inspeção — por isso as medidas contam `DISTINCTCOUNT(ID)`.

### Dimensões
- `Ddata` — calendário: `Data`, `Mês/Ano`, `Mes`, `Serial`, `Dia`, `Dias Uteis`, `Dias Corridos`, `Hoje`, `Dias Uteis até hoje`, `Dias Uteis até hoje(att)`, `Dias Uteis 2H`, `Dias Uteis 16h`, `Comparativo Hoje`, `Validação dias uteis`, `TODAY`
- `Inspetores` — `INSPETOR`, `CARGO`, `ÁREA`, `REGIONAL`, `FUNÇÃO`, `META INSPEÇÃO DINAMICA`, `META INSPEÇÃO ESTÁTICA`, `META DDS`, `META AÇÃO NA COMUNIDADE`
- `Meta Inspetores` — mesma coisa + `DATA`, `INSPETOR_ID` (**metas versionadas por mês**)
- `Equipes` — `EQUIPE`, `TIPO`, `SUPERVISOR`, `DATA`, `EQUIPE_ID`, `Supervisor_ID`, `PONTOS`
- `Perguntas` — `Perguntas`, `Checklist`, `Conformidade`, `Categoria`, `Pontos`, `Gravidade`
- `Atualização` — `Data e Hora`, `Data e hora certa`, `Atualização`, `Atualização v2` (carimbo de refresh no cabeçalho)
- ~20 tabelas `LocalDateTable_*` — auto date/time do Power BI (lixo, ver melhorias)

### Tabelas de medidas
`#Medidas` (metas / auxiliares):
`Meta_Insp`, `Meta_DDS`, `Meta_Comunidade`, `Meta_insp_dia`, `Meta_DDS_dia`, `Qtd_mês`,
`Dias_uteis`, `Dias_uteis_até_hoje`, `Qtd_Inspetor`, `Qtd_Tratado`, `% Atingida`, `👍🏼 ou 👎🏼`,
`Valor Inicial`, `Valor Final`, `Valor 0`, `Valor 1`, `Valor2` (limites dos velocímetros)

`#Medidas_Teccel` (execução):
`Qtd_Insp_Teccel`, `Qtd_Inspeção_N.C_Teccel`, `Qtd_N.C_Teccel`, `%MetaInspTeccel`,
`%MetaInspTeccelTotal`, `%Inspeção_Teccel`, `ICIT_Teccel`, `Gravidade`,
`Pontos Iniciais`, `Pontos N.C`, `Qtd Pontos Final`, `Critério Desempate`, `Ranking`,
`EquipeTop1`, `EquipeTop2`, `EquipeTop3`

### Os dois KPIs centrais
- **Taxa de Contato** = inspeções realizadas ÷ meta (meta = nº de inspetores × meta individual, rateada por dias úteis → `Meta_insp_dia`).
- **ICIT** = Índice de Conformidade de Inspeção — inspeções SEM não conformidade ÷ inspeções totais: `(Qtd_Insp_Teccel − Qtd_Inspeção_N.C_Teccel) / Qtd_Insp_Teccel`. (Confirmado por consulta ao relatório: 71/118 = 60,17%.)

DAX equivalente (**reconstruído** — o serviço público não expõe o texto original das medidas):

```dax
Qtd_Insp_Teccel         = DISTINCTCOUNT('Inspeções Teccel1'[ID])
Qtd_N.C_Teccel          = CALCULATE(COUNTROWS('Inspeções Teccel1'), 'Inspeções Teccel1'[Conformidade] = "NÃO")
Qtd_Inspeção_N.C_Teccel = CALCULATE(DISTINCTCOUNT('Inspeções Teccel1'[ID]), 'Inspeções Teccel1'[Conformidade] = "NÃO")
ICIT_Teccel             = DIVIDE([Qtd_Insp_Teccel] - [Qtd_Inspeção_N.C_Teccel], [Qtd_Insp_Teccel])
Dias_uteis              = CALCULATE(SUM(Ddata[Dias Uteis]))
Meta_Insp               = SUMX(VALUES(Inspetores[INSPETOR]), Inspetores[META INSPEÇÃO DINAMICA])
Meta_insp_dia           = DIVIDE([Meta_Insp], [Dias_uteis]) * [Dias_uteis_até_hoje]
%MetaInspTeccelTotal    = DIVIDE([Qtd_Insp_Teccel], [Meta_Insp])
% Atingida              = MIN(DIVIDE([Qtd_Insp_Teccel], [Meta_insp_dia]), 1)
👍🏼 ou 👎🏼             = IF([% Atingida] >= 1, "👍🏼", "👎🏼")
Pontos Iniciais         = SUM(Equipes[PONTOS])
Pontos N.C              = SUM('Inspeções Teccel1'[Pontos N.C])
Qtd Pontos Final        = [Pontos Iniciais] - [Pontos N.C]
Ranking                 = RANKX(ALL(Equipes[EQUIPE]), [Qtd Pontos Final] + [Critério Desempate], , DESC)
EquipeTop1              = CALCULATE(SELECTEDVALUE(Equipes[EQUIPE]), FILTER(ALL(Equipes[EQUIPE]), [Ranking] = 1))
```

---

## 2. Páginas (7) e visuais

Todas as páginas (exceto PAINEL) repetem o mesmo **cabeçalho padrão**:
- 4 cards de KPI no topo direito (y≈5, altura ~65px)
- faixa de **6 slicers dropdown** em y≈90: `Ano`, `Mês`, `ÁREA`, `INSPETOR`, `FUNÇÃO`, `SUPERVISOR` (na ICIT entra também `EQUIPE`)
- botão de voltar (`actionButton` + imagem, canto superior esquerdo) apontando para o PAINEL
- **imagem de fundo por página** (ex.: `ICIT.png`, escala `Fit`) — o "design" do dashboard é uma arte PNG por trás, com os visuais transparentes por cima

| # | Página | Canvas | Visuais | Conteúdo |
|---|---|---|---|---|
| 1 | **PAINEL** | 1280 | 7 | Menu de navegação: 1 card (`Atualização v2`) + 6 botões (423x66) para as demais páginas |
| 2 | **Taxa de Contato** | 1510 | 18 | 2 combos grandes (1095x256) `SESMT` e `OPERAÇÃO` por INSPETOR; 2 combos-resumo (370px) à direita; cards `Meta_Insp`, `Meta_insp_dia`, `Qtd_Insp_Teccel` |
| 3 | **Ranking** | 1280 | 15 | 1 `tableEx` 1261x540: INSPETOR, FUNÇÃO, ÁREA, Meta_Insp, Meta_insp_dia, Qtd_Insp_Teccel, % Atingida, 👍🏼/👎🏼 |
| 4 | **Avanço Mensal** | 1510 | 17 | 2 combos mês a mês (Taxa de Contato / ICIT) por `Mês/Ano` + 2 **velocímetros** (custom visual `Tachometer1474636471549`) com `%Inspeção_Teccel` e `ICIT_Teccel` |
| 5 | **ICIT** | 1510 | 27 | Velocímetro ICIT; combos ICIT por INSPETOR / EQUIPE / Tipo Serviço / SUPERVISOR; **waterfall** "Inconformidades por Categoria"; barras "TOP 5 Inconformidades" (`Perguntas` × `Conformidade`); 8 cards (4 deles pela medida `Gravidade`) |
| 6 | **Inspeções por dia** | 1510 | 15 | 1 combo full-width 1483x547: `Qtd_Insp_Teccel` + `Qtd_Inspeção_N.C_Teccel` por dia |
| 7 | **Jornada Segura** | 1510 | 20 | `tableEx` de gamificação (EQUIPE, inspeções, N.C, ICIT, Pontos Iniciais, Pontos N.C, Pontos Final, Critério Desempate, Ranking) + pódio com card `EquipeTop1` sobre imagem |

Tipos de visual usados: `card`, `tableEx`, `slicer`, `image`, `textbox`, `actionButton`,
`lineClusteredColumnComboChart` (o cavalo de batalha — colunas = quantidade, linha = %),
`waterfallChart` e o custom visual **Tachometer** (velocímetro).

---

## 3. Como remontar do zero

1. **Camada de dados** — Sheets/Excel: `Inspeções` (uma linha por pergunta respondida), `Inspetores`, `Equipes`, `Perguntas`, `Metas`.
2. **Power Query** — append dos checklists numa tabela única com coluna `Checklist` / `Tipo Serviço`; tipar `Data da Inspeção`; TRIM/UPPER em INSPETOR e EQUIPE.
3. **Calendário** — `Ddata = CALENDAR(...)` com `Dias Uteis` (0/1, exclui fim de semana e feriados), `Dias Uteis até hoje`, `Mês/Ano` e `Serial` para ordenação.
4. **Relacionamentos** — estrela: `Ddata[Data] 1→* Inspeções[Data da Inspeção]`; `Inspetores[INSPETOR] 1→*`; `Equipes[EQUIPE_ID] 1→*`; `Perguntas[Perguntas] 1→*`.
5. **Medidas** — tabelas vazias `#Medidas` e `#Medidas_Teccel` com o DAX da seção 1.
6. **Layout** — canvas 1510x720, fundo PNG por página, cabeçalho (6 slicers + 4 cards) copiado entre páginas, botões com ação *Page navigation*.

---

## 4. Melhorias propostas

**Modelo**
1. Desativar auto date/time — elimina ~20 `LocalDateTable_*` e reduz o modelo.
2. Uma única tabela de fato com coluna `Empresa` (Teccel/Própria) em vez de duplicar 8 tabelas e 2 conjuntos de medidas — corta `#Medidas_Teccel` inteira.
3. `Ddata` marcada como tabela de datas, com `Serial` como *Sort by column* de `Mês/Ano`.
4. Unificar `Inspetores` + `Meta Inspetores` numa dimensão com vigência (`DE`/`ATE`), evitando meta errada em análise retroativa.
5. Colunas de fotos (URLs) fora do modelo ou marcadas como *Image URL* — hoje só ocupam memória.

**Medidas**
6. `DIVIDE()` em toda divisão (evita erro quando a meta é 0 num filtro de inspetor sem meta).
7. O ICIT hoje mistura dois conceitos numa medida só. Separar `% Conformidade de inspeção` (atual) de `% de respostas conformes` (grão de pergunta), que é o que a gestão costuma querer ver.
8. Criar variação vs. mês anterior (MoM) e média móvel 3M para os gráficos mês a mês.
9. Medidas de status para formatação condicional, no lugar do emoji fixo 👍🏼/👎🏼.

**Visual / UX**
10. Substituir os velocímetros (custom visual, lento e impreciso de ler) por KPI cards com barra de progresso nativos.
11. Padronizar o canvas — hoje mistura 1280 e 1510, o que faz as páginas "pularem" na navegação.
12. *Sync slicers* entre páginas, em vez de 6 slicers soltos replicados — hoje o filtro se perde ao navegar.
13. Trocar o fundo PNG por tema JSON + formas nativas: o PNG quebra em telas de outra proporção e impede mudar cor sem reeditar a arte.
14. Botão **Limpar filtros** (bookmark) e indicador de filtros ativos.
15. Na página ICIT, o waterfall de categorias funcionaria melhor como **Pareto** (barras + linha acumulada) — o objetivo é priorizar os desvios que mais pesam.
16. Drill-through de EQUIPE/INSPETOR para uma página de detalhe com a lista de desvios e fotos.
17. Acessibilidade: alt-text nos visuais, ordem de tabulação e paleta com contraste próprio (hoje depende da arte de fundo).
18. "Inspeções por dia" ganharia meta diária como linha de referência e destaque para dias sem inspeção.
