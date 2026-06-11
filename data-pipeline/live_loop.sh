#!/usr/bin/env bash
# Heartbeat del carril rápido. Lo usan live-quotes y live-quotes-relay (ping-pong de respaldo).
# Estrategia robusta: UN loop largo que corre hasta el cierre del mercado (o tope ~4h50m por el
# límite de 6h de GitHub), refrescando cada ~70s. Así con UN disparo se cubre casi toda la sesión
# sin depender de "saltos" frágiles. Cadencia suave -> no se quema la IP con Yahoo.
# Publica quotes-fast.json en `data-fast` del repo de DATOS (panel-mercado-data) -> Vercel no lo mira.
# Requiere env DATA_DEPLOY_KEY (deploy key con write a panel-mercado-data).
set -u
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

DOW=$(date -u +%u); MIN=$((10#$(date -u +%H%M)))
if [ "$DOW" -gt 5 ] || [ "$MIN" -lt 1325 ] || [ "$MIN" -gt 2005 ]; then
  echo "mercado cerrado ($MIN UTC, dia $DOW) -> salgo (reinicia en la próxima apertura)"
  exit 0
fi

# SSH con la deploy key del repo de datos (no se imprime)
KEYF="$(mktemp)"; printf '%s\n' "$DATA_DEPLOY_KEY" > "$KEYF"; chmod 600 "$KEYF"
export GIT_SSH_COMMAND="ssh -i $KEYF -o StrictHostKeyChecking=accept-new -o UserKnownHostsFile=/dev/null"
DATA_PUSH_URL="git@github.com:facundoalan81-cpu/panel-mercado-data.git"

git config --global user.email "41898282+github-actions[bot]@users.noreply.github.com"
git config --global user.name "panel-bot"
PUB="$ROOT/_pub"
rm -rf "$PUB"; mkdir -p "$PUB" && (cd "$PUB" && git init -q && git checkout -q -b data-fast)

# Fin = el menor entre el cierre (20:05 UTC) y un tope de 4h50m (margen bajo el límite de 6h del runner)
CLOSE=$(date -u -d "$(date -u +%Y-%m-%d) 20:05:00" +%s)
HARD=$(( $(date -u +%s) + 290*60 ))
END=$CLOSE; [ "$HARD" -lt "$END" ] && END=$HARD

# El cron de GitHub no dispara en este repo (scheduler dormido) -> los INDICADORES también se
# refrescan desde acá: dispatch de build-signals cada ~55 ciclos (~1 h) mientras el mercado opera.
# GITHUB_TOKEN sí puede crear workflow_dispatch (es la excepción documentada a la anti-recursión).
dispatch_signals() {
  [ -n "${GH_TOKEN:-}" ] || return 0
  curl -s -o /dev/null -X POST \
    -H "Authorization: Bearer $GH_TOKEN" -H "Accept: application/vnd.github+json" \
    "https://api.github.com/repos/facundoalan81-cpu/panel-mercado/actions/workflows/build-signals.yml/dispatches" \
    -d '{"ref":"main"}' && echo "build-signals despachado ($(date -u +%H:%M))"
}

n=0
while [ "$(date -u +%s)" -lt "$END" ]; do
  n=$((n+1))
  if [ $(( (n - 1) % 55 )) -eq 0 ]; then dispatch_signals; fi
  python "$ROOT/data-pipeline/build_quotes.py" --fast || true
  if [ -f "$ROOT/data-pipeline/output/quotes-fast.json" ]; then
    cp "$ROOT/data-pipeline/output/quotes-fast.json" "$PUB/quotes-fast.json"
    (cd "$PUB" && git add quotes-fast.json && git commit -q -m "fast $(date -u +%H%M%S)" && git push -q -f "$DATA_PUSH_URL" data-fast) && echo "ciclo $n publicado ($(date -u +%H:%M:%S))"
  else
    echo "ciclo $n sin datos"
  fi
  sleep 55
done
echo "loop ok: $n ciclos (hasta cierre o tope) -> la otra workflow re-encadena para la cola de la sesión"
