#!/bin/bash
# Gera dashboard.html — versão single-file (para publicar/compartilhar)
set -e
out=../index.html
{
  echo '<title>Painel de Inspeções SESMT</title>'
  echo '<meta name="theme-color" content="#0d1b2a">'
  echo '<link rel="preconnect" href="https://fonts.googleapis.com">'
  echo '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
  echo '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700;800&display=swap">'
  echo '<style>'
  sed -n '/^<style>$/,/^<\/style>$/p' index.html | sed '1d;$d'
  echo '</style>'
  echo '<div id="palco"><div id="canvas"></div></div>'
  for f in data.js model.js charts.js app.js; do
    echo '<script>'; cat "$f"; echo '</script>'
  done
} > "$out"
# A mesma página é servida em três lugares:
#   ../index.html        -> https://teccelia2001-ux.github.io/        (endereço curto)
#   ../sesmt/index.html  -> https://teccelia2001-ux.github.io/sesmt/  (endereço nomeado)
#   ../dashboard.html    -> arquivo para anexar em e-mail
mkdir -p ../sesmt
cp "$out" ../sesmt/index.html
cp "$out" ../dashboard.html
echo "gerado: index.html, sesmt/index.html e dashboard.html ($(wc -c < "$out") bytes cada)"
