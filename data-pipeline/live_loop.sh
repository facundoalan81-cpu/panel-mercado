#!/usr/bin/env bash
# Heartbeat del carril rápido. Lo usan live-quotes y live-quotes-relay (ping-pong).
# Mercado abierto (Lun-Vie 13:25-20:05 UTC): loop ~8 min, refresca cada ~60s y publica
# quotes-fast.json en el branch `data-fast` del repo de DATOS (panel-mercado-data), que Vercel
# NO mira -> cero deploys. Cerrado: duerme 10 min y sale (la cadena reinicia).
# Requiere env DATA_DEPLOY_KEY (deploy key con write a panel-mercado-data).
set -u
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

DOW=$(date -u +%u); MIN=$((10#$(date -u +%H%M)))
if [ "$DOW" -gt 5 ] || [ "$MIN" -lt 1325 ] || [ "$MIN" -gt 2005 ]; then
  echo "mercado cerrado ($MIN UTC, dia $DOW) -> duermo 10 min y la cadena reinicia"
  sleep 600; exit 0
fi

# SSH con la deploy key del repo de datos (no se imprime)
KEYF="$(mktemp)"; printf '%s\n' "$DATA_DEPLOY_KEY" > "$KEYF"; chmod 600 "$KEYF"
export GIT_SSH_COMMAND="ssh -i $KEYF -o StrictHostKeyChecking=accept-new -o UserKnownHostsFile=/dev/null"
DATA_PUSH_URL="git@github.com:facundoalan81-cpu/panel-mercado-data.git"

git config --global user.email "41898282+github-actions[bot]@users.noreply.github.com"
git config --global user.name "panel-bot"
PUB="$ROOT/_pub"
rm -rf "$PUB"; mkdir -p "$PUB" && (cd "$PUB" && git init -q && git checkout -q -b data-fast)

END=$((SECONDS+480))   # ~8 min; después la otra workflow toma la posta (IP nueva)
n=0
while [ $SECONDS -lt $END ]; do
  n=$((n+1))
  python "$ROOT/data-pipeline/build_quotes.py" --fast || true
  if [ -f "$ROOT/data-pipeline/output/quotes-fast.json" ]; then
    cp "$ROOT/data-pipeline/output/quotes-fast.json" "$PUB/quotes-fast.json"
    (cd "$PUB" && git add quotes-fast.json && git commit -q -m "fast $(date -u +%H%M%S)" && git push -q -f "$DATA_PUSH_URL" data-fast) && echo "ciclo $n publicado ($(date -u +%H:%M:%S))"
  else
    echo "ciclo $n sin datos"
  fi
  sleep 50
done
echo "loop ok: $n ciclos -> la otra workflow re-encadena"
