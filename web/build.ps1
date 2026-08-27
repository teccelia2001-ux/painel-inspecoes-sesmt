# Gera index.html e dashboard.html — versão single-file, para publicar.
#
# Equivalente ao build.sh, em PowerShell: o PowerShell desta máquina NÃO tem
# bash no PATH, e pedir "bash build.sh" aqui falha em silêncio — só o .js vai
# ao ar e o site continua servindo o index.html velho. Os dois precisam
# produzir o MESMO arquivo; ao mexer num, mexa no outro.
#
# Uso, na pasta web:
#   powershell -ExecutionPolicy Bypass -File .\build.ps1

$ErrorActionPreference = "Stop"
$web = $PSScriptRoot
$enc = New-Object System.Text.UTF8Encoding($false)   # UTF-8 sem BOM

$linhas = [System.Collections.Generic.List[string]]::new()
$linhas.Add('<title>Painel de Inspeções SESMT</title>')
$linhas.Add('<meta name="theme-color" content="#ffffff">')
$linhas.Add('<link rel="preconnect" href="https://fonts.googleapis.com">')
$linhas.Add('<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>')
$linhas.Add('<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700;800&display=swap">')

# O CSS sai do bloco <style> do index.html de desenvolvimento
$linhas.Add('<style>')
$idx = [IO.File]::ReadAllLines("$web\index.html", $enc)
$ini = [Array]::FindIndex($idx, [Predicate[string]]{ param($l) $l -eq '<style>' })
$fim = [Array]::FindIndex($idx, [Predicate[string]]{ param($l) $l -eq '</style>' })
if ($ini -lt 0 -or $fim -le $ini) { throw "bloco <style> não encontrado em index.html" }
for ($i = $ini + 1; $i -lt $fim; $i++) { $linhas.Add($idx[$i]) }
$linhas.Add('</style>')

$linhas.Add('<div id="palco"><div id="canvas"></div></div>')

# Carimbo da geração. No data.js o valor fica como "DEV" — escrito à mão ele
# envelhecia e deixava de servir para conferir o cache do navegador.
$versao = Get-Date -Format "yyyyMMdd-HHmm"

foreach ($f in @('assets.js','data.js','model.js','servidor.js','charts.js','ajustes.js','app.js')) {
  $linhas.Add('<script>')
  $conteudo = [IO.File]::ReadAllLines("$web\$f", $enc)
  if ($f -eq 'data.js') {
    $conteudo = $conteudo | ForEach-Object {
      $_ -replace '^const VERSAO = "DEV";', "const VERSAO = `"$versao`";"
    }
  }
  $linhas.AddRange([string[]]$conteudo)
  $linhas.Add('</script>')
}

$saida = ($linhas -join "`n") + "`n"
[IO.File]::WriteAllText("$web\..\index.html", $saida, $enc)
[IO.File]::WriteAllText("$web\..\dashboard.html", $saida, $enc)
"gerado: index.html e dashboard.html — v$versao, $($saida.Length) caracteres cada"
