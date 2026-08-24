#!/bin/bash
# Gera dashboard.html — versão single-file (para publicar/compartilhar)
set -e
out=../index.html
{
  echo '<title>Painel de Inspeções SESMT</title>'
  echo '<meta name="theme-color" content="#ffffff">'
  echo '<link rel="preconnect" href="https://fonts.googleapis.com">'
  echo '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
  echo '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700;800&display=swap">'
  echo '<style>'
  sed -n '/^<style>$/,/^<\/style>$/p' index.html | sed '1d;$d'
  echo '</style>'
  echo '<div id="palco"><div id="canvas"></div></div>'
  for f in assets.js data.js model.js servidor.js charts.js ajustes.js app.js; do
    echo '<script>'; cat "$f"; echo '</script>'
  done
} > "$out"
# index.html   -> https://teccelia2001-ux.github.io/painel-inspecoes-sesmt/
# dashboard.html -> cópia para anexar em e-mail
cp "$out" ../dashboard.html
echo "gerado: index.html e dashboard.html ($(wc -c < "$out") bytes cada)"
