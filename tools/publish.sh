#!/bin/sh
# Veröffentlicht den aktuellen Stand auf GitHub Pages. Aufruf: sh tools/publish.sh "Kurze Beschreibung"
# Neue App-Version vorher mit: python3 tools/build_sw.py vNN
set -e
cd "$(dirname "$0")/.."
msg="${1:-Update}"
ver=$(sed -n "s/.*APP_VERSION = '\(v[0-9]*\)'.*/\1/p" js/version.js)
grep -q "$ver" sw.js || { echo "Abbruch: sw.js passt nicht zu $ver. Erst tools/build_sw.py ausführen."; exit 1; }
git add -A
for p in backups lore-originale docs reference .claude; do
  if git diff --cached --name-only | grep -q "^$p/"; then echo "Abbruch: $p/ darf nicht hochgeladen werden."; git reset -q; exit 1; fi
done
if git diff --cached --quiet; then echo "Nichts Neues."; else git commit -q -m "$ver: $msg" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"; fi
git push -q origin main
echo "Veröffentlicht: $ver ($(git rev-parse --short HEAD))"
