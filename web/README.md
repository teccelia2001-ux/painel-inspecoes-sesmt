# Réplica web do painel de inspeções (Power BI → HTML)

## Arquivos
- `data.js`   — dados reais extraídos do relatório público (118 inspeções, 80 não conformidades, dimensões e calendário)
- `model.js`  — réplica em JS das medidas DAX e da propagação de filtros
- `charts.js` — visuais em SVG puro (combo, velocímetro, waterfall, barras, tabela)
- `app.js`    — as 7 páginas nas mesmas coordenadas do layout original
- `index.html`— versão multi-arquivo (abrir direto no navegador)
- `build.sh`  — gera `../dashboard.html`, versão single-file para publicar/compartilhar

Para regerar o arquivo único depois de editar qualquer fonte:

    bash build.sh

## Validação contra o Power BI original
Todos os valores abaixo foram conferidos consultando o endpoint `querydata`
do relatório público e batem exatamente:

| Medida | Power BI | Réplica |
|---|---|---|
| Qtd_Insp_Teccel | 118 | 118 |
| Qtd_Inspeção_N.C_Teccel | 47 | 47 |
| Qtd_N.C_Teccel | 80 | 80 |
| Meta_Insp | 264 | 264 |
| Meta_insp_dia | 168,91954 | 168,91954 |
| Dias úteis / até hoje | 261 / 167 | 261 / 167 |
| Qtd_Inspetor | 44 | 44 |
| ICIT_Teccel | 0,6016949 | 0,6016949 |
| %Inspeção_Teccel | 0,6985574 | 0,6985574 |
| %MetaInspTeccelTotal | 0,4469697 | 0,4469697 |

Também conferidos linha a linha: Jornada Segura (13 equipes: inspeções, N.C,
ICIT, pontos iniciais/N.C/final e critério de desempate), ranking por inspetor
(meta, meta até hoje, % atingida) e filtros (mês = 7/2026 e inspetor = Edney).

## Descobertas do modelo original que a réplica reproduz
1. **ICIT é taxa de CONFORMIDADE**: `(Qtd_Insp − Qtd_Insp_com_N.C) / Qtd_Insp`.
2. **`% Atingida` é limitada a 100%** (Joab: 14 realizadas para meta de 10,24 → 100%).
3. **Dimensões versionadas por mês**: `Meta Inspetores` (INSPETOR_ID) e `Equipes`
   (EQUIPE_ID) só têm cadastro de abr–jul/2026. As 19 inspeções de agosto não casam
   com nenhuma equipe nem inspetor e caem no grupo em branco — no original e aqui.
4. **Os slicers vêm de `Meta Inspetores`**, não da tabela `Inspetores` (que está
   no modelo mas praticamente não é usada).
5. **Critério Desempate** = `Pontos Final + (inspeções sem N.C) / 10`.
6. `Meta_insp_dia` = `Meta_Insp / Dias_uteis × Dias_uteis_até_hoje` — usa o ano
   inteiro (261 dias) no denominador quando não há filtro de mês.

## Diferenças conscientes em relação ao original
- O visual do original é uma **imagem PNG de fundo por página**; aqui o layout é
  reconstruído em CSS (mesmas coordenadas, identidade visual própria).
- Os slicers são **sincronizados entre as páginas** (no original cada página tem
  os seus e o filtro se perde ao navegar).
- Há um botão **Limpar filtros**, que o original não tem.
- Os velocímetros são desenhados em SVG, sem o custom visual Tachometer.

## Responsividade (versão para qualquer aparelho)

O arquivo tem **dois modos de layout**, escolhidos pela largura da tela:

- **≥ 1100 px (desktop)** — canvas 1510x720 escalado, fiel ao Power BI original.
- **< 1100 px (tablet/celular)** — os mesmos visuais reempilhados numa grade:
  cards de KPI em 2 colunas, filtros recolhidos atrás do botão "Filtros",
  gráficos em largura total, tabelas com rolagem horizontal e abas fixas no rodapé.

Os gráficos são redesenhados no `resize` e no `orientationchange`, então giram
junto com o aparelho sem cortar.

### Link direto para uma página
O endereço aceita âncora, útil para mandar alguém direto ao indicador:

    dashboard.html#icit
    dashboard.html#jornada
    dashboard.html#ranking

Ids válidos: `painel`, `taxa`, `ranking`, `avanco`, `icit`, `dia`, `jornada`.

### Como distribuir
`dashboard.html` é autocontido (~71 KB): dados, medidas e visuais num arquivo só,
sem servidor, sem internet e sem dependências. Funciona em Chrome, Edge, Firefox
e Safari, no Windows, Android, iPhone e iPad.

- **E-mail / WhatsApp**: anexar o arquivo; a pessoa abre e pronto.
- **SharePoint / OneDrive corporativo**: subir e compartilhar o link (recomendado —
  mantém o controle de quem acessa).
- **Link público**: qualquer hospedagem estática (GitHub Pages, Netlify, Cloudflare
  Pages) serve o arquivo como está. Atenção: o painel contém nomes de inspetores,
  equipes, supervisores e os desvios de segurança encontrados.
