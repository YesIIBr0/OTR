#!/usr/bin/env bash
# ============================================================
#  OTR · ROLLBACK en <5 min [R3 — Tribunal 5.3].
#  Vuelve a la imagen ANTERIOR (taggeada :prev por vps-pull.sh en cada deploy) sin CI
#  ni red de por medio: retag local + down/up + healthcheck. Antes, volver atrás era
#  revertir el commit y esperar ~8 min de CI — cada deploy era un acto de fe.
#
#  USO (en el VPS, como root):
#    /opt/otr/scripts/rollback.sh            → rollback a :prev y PAUSA el auto-deploy
#    /opt/otr/scripts/rollback.sh --resume   → reanuda el auto-deploy (cuando el fix
#                                              ya esté en main; el cron re-desplegará
#                                              el :latest del registry en ≤2 min)
#
#  QUÉ NO HACE (a propósito): no revierte migraciones de DB. La convención del repo es
#  que las migraciones sean aditivas (columnas/tablas nuevas, nullable) — la imagen
#  anterior corre sin problema sobre el schema más nuevo. Si una migración destructiva
#  rompiera eso, el rollback correcto es restore del backup (ver DEPLOY.md § restore).
# ============================================================
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."   # → /opt/otr

IMG_LATEST="ghcr.io/yesiibr0/otr:latest"
IMG_PREV="ghcr.io/yesiibr0/otr:prev"

if [ "${1:-}" = "--resume" ]; then
  rm -f .deploy-hold
  echo "$(date -u) ▶ auto-deploy REANUDADO — el cron desplegará el :latest del registry en ≤2 min."
  echo "  (Asegúrate de que el fix ya esté pusheado a main; si no, volverá la versión rota.)"
  exit 0
fi

[ -f .env.production ] || { echo "$(date -u) ✗ falta .env.production"; exit 1; }

if ! docker image inspect "$IMG_PREV" >/dev/null 2>&1; then
  echo "$(date -u) ✗ no existe imagen :prev — no hay a qué volver (¿primer deploy?)."
  echo "  Alternativa: docker pull ghcr.io/yesiibr0/otr:<SHA_del_commit_bueno> && docker tag esa imagen como $IMG_PREV y reintenta."
  exit 1
fi

# 1) PAUSA el auto-deploy ANTES de tocar nada: sin esto, el cron (cada 2 min) volvería a
#    desplegar :latest encima del rollback.
touch .deploy-hold
echo "$(date -u) ⏸ auto-deploy en pausa (.deploy-hold)"

# 2) Retag local: :prev pasa a ser :latest para el compose. Cero red, cero CI.
docker tag "$IMG_PREV" "$IMG_LATEST"
echo "$(date -u) ▸ rollback: $IMG_PREV → $IMG_LATEST (retag local)"
echo "$(date -u) rollback: $(docker image inspect "$IMG_LATEST" --format '{{.Id}}')" >> releases.log

# 3) Swap idéntico al de vps-pull.sh (down limpia huérfanos; up recrea determinista).
docker compose --env-file .env.production down --remove-orphans
docker compose --env-file .env.production up -d --remove-orphans

# 4) Healthcheck — mismo criterio que el deploy normal.
for i in $(seq 1 20); do
  code=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/api/health || echo 000)
  if [ "$code" = "200" ]; then
    echo "$(date -u) ✓ ROLLBACK OK (HTTP 200). El auto-deploy queda EN PAUSA."
    echo "  Siguiente paso: pushea el fix a main y corre  scripts/rollback.sh --resume"
    exit 0
  fi
  sleep 3
done
echo "$(date -u) ✗ healthcheck no llegó a 200 tras el rollback — revisa docker compose logs web"
exit 1
