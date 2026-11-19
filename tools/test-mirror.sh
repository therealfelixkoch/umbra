#!/bin/sh
# Spiegelt die App nach /private/tmp/umbra-test/site, damit der Testserver sie lesen kann
# (der Server-Prozess darf Documents nicht lesen). Danach im Browser-Pane: Launch-Konfiguration „umbra-app“
# öffnen, Tests unter http://localhost:8767/tests/index.html. Nach jeder Änderung erneut ausführen.
set -e
cd "$(dirname "$0")/.."
T=/private/tmp/umbra-test
mkdir -p "$T/site"
rsync -a --delete --exclude backups --exclude lore-originale --exclude .claude --exclude docs --exclude reference --exclude .git ./ "$T/site/"
cat > "$T/server.py" <<'EOF'
import sys, functools
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
class NoCache(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()
ThreadingHTTPServer(('127.0.0.1', int(sys.argv[2])), functools.partial(NoCache, directory=sys.argv[1])).serve_forever()
EOF
echo "Gespiegelt nach $T/site"
