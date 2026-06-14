#!/usr/bin/env bash
# ============================================================
#  OTR · Deploy en el VPS — BAJA la imagen pre-construida en CI (ghcr.io) y la levanta.
#  El VPS YA NO construye (el build ocurre en GitHub Actions, en runners potentes) →
#  deploys rápidos y sin presión de CPU/RAM sobre la app en vivo del VPS de 1 CPU.
#
#  Requiere estar logueado en ghcr (lo hace el paso de CI por SSH justo antes).
#  NO toca .env.production (los secretos viven SOLO en el VPS, nunca en git/CI).
# ============================================================
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."   # → /opt/otr

say() { printf '\n\033[1;33m▸ %s\033[0m\n' "$*"; }
die() { printf '\n\033[1;31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

[ -f .env.production ] || die "Falta .env.production en el VPS — los secretos no están; aborto."

say "Bajando la imagen pre-construida desde ghcr.io…"
docker compose --env-file .env.production pull web

say "Recreando contenedores desde cero (evita conflictos de nombre/huérfanos)…"
docker compose --env-file .env.production down --remove-orphans
docker compose --env-file .env.production up -d --remove-orphans

say "Aplicando el esquema a la base de datos (db push)…"
docker compose exec -T web npx prisma db push --skip-generate

say "Healthcheck — esperando HTTP 200 en /aula…"
for i in $(seq 1 30); do
  code=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/aula || echo 000)
  if [ "$code" = "200" ]; then
    printf '\033[1;32m  ✓ App sana (HTTP 200) tras el deploy — intento %s\033[0m\n' "$i"
    docker image prune -f >/dev/null 2>&1 || true   # limpia imágenes viejas (ahorra disco)
    exit 0
  fi
  sleep 2
done
say "La app NO respondió 200 — últimos logs:"
docker compose logs web --tail=40 || true
die "Deploy fallido: la app no quedó sana."
