#!/usr/bin/env bash
# ============================================================
#  OTR · VPS-PULL — deploy iniciado por el VPS (no por GitHub).
#  Un cron corre este script cada ~2 min: baja la última imagen de ghcr y
#  REDESPLIEGA solo si la imagen cambió. Como el VPS INICIA la conexión (saliente),
#  es inmune a los drops de red de Hostinger sobre IPs entrantes de runners.
#
#  Requisito (una sola vez): el VPS debe estar logueado en ghcr con un token
#  read:packages →  docker login ghcr.io -u <user> -p <PAT_read_packages>
# ============================================================
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."   # → /opt/otr
IMG="ghcr.io/yesiibr0/otr:latest"

[ -f .env.production ] || { echo "$(date -u) ✗ falta .env.production"; exit 0; }

before=$(docker image inspect "$IMG" --format '{{.Id}}' 2>/dev/null || echo none)
# Baja la imagen; si falla (p.ej. sin login a ghcr) salimos sin romper el cron.
if ! docker compose --env-file .env.production pull web >/dev/null 2>&1; then
  echo "$(date -u) ✗ pull falló (¿el VPS está logueado en ghcr? docker login ghcr.io)"; exit 0
fi
after=$(docker image inspect "$IMG" --format '{{.Id}}' 2>/dev/null || echo none)

# Sin cambios → nada que hacer (cron silencioso, no reinicia la app sin motivo).
[ "$before" = "$after" ] && exit 0

echo "$(date -u) ▸ nueva imagen detectada — redeploy"
# Migrar ANTES de swappear (down/up): `run` levanta un contenedor efímero con la imagen
# NUEVA pero conectado al stack VIEJO (la app y la DB actuales siguen vivas mientras esto
# corre). Si `migrate deploy` falla, abortamos aquí — nunca llegamos al down/up — así la
# versión anterior sigue sirviendo tráfico en vez de quedar reemplazada por una app nueva
# corriendo contra un schema a medio migrar.
if ! docker compose --env-file .env.production run --rm web npx prisma migrate deploy; then
  echo "$(date -u) ✗ migrate deploy FALLÓ — se aborta el deploy (la versión anterior sigue corriendo)"
  exit 1
fi

# down --remove-orphans limpia TODOS los contenedores del proyecto POR ETIQUETA (incluido un
# huérfano renombrado <hash>_otr-web-1 que un recreate interrumpido deja en este VPS de 1 CPU
# y que provoca "container name already in use" + 502). up recrea desde cero. ~10-15s de
# downtime SOLO cuando hay imagen nueva (push a main), a cambio de deploys deterministas.
docker compose --env-file .env.production down --remove-orphans
docker compose --env-file .env.production up -d --remove-orphans

for i in $(seq 1 20); do
  code=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/api/health || echo 000)
  if [ "$code" = "200" ]; then
    echo "$(date -u) ✓ deploy OK (HTTP 200)"
    docker image prune -f >/dev/null 2>&1 || true
    exit 0
  fi
  sleep 3
done
echo "$(date -u) ✗ healthcheck no llegó a 200 tras el redeploy"
