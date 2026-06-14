#!/usr/bin/env bash
# ============================================================
#  OTR · Deploy en el VPS (lo invoca el CI por SSH tras el rsync del código).
#  Idempotente: activa el schema Postgres, reconstruye, aplica el esquema a la
#  base y verifica que la app responda 200 antes de declarar éxito.
#
#  NO toca .env.production (los secretos viven SOLO en el VPS, nunca en git/CI).
# ============================================================
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."   # → /opt/otr (raíz del repo en el VPS)

say() { printf '\n\033[1;33m▸ %s\033[0m\n' "$*"; }
die() { printf '\n\033[1;31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

# Guarda de seguridad: sin .env.production no se construye (evita romper la BD).
[ -f .env.production ] || die "Falta .env.production en el VPS — los secretos no están; aborto."

say "Activando el schema de PostgreSQL (el repo trae el de SQLite para dev)…"
cp prisma/schema.postgres.prisma prisma/schema.prisma

say "Construyendo y levantando contenedores (app + postgres)…"
docker compose --env-file .env.production up -d --build

say "Aplicando el esquema a la base de datos (db push)…"
docker compose exec -T web npx prisma db push --skip-generate

say "Healthcheck — esperando HTTP 200 en /aula…"
for i in $(seq 1 30); do
  code=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/aula || echo 000)
  if [ "$code" = "200" ]; then
    printf '\033[1;32m  ✓ App sana (HTTP 200) tras el deploy — intento %s\033[0m\n' "$i"
    exit 0
  fi
  sleep 2
done
say "La app NO respondió 200 — últimos logs:"
docker compose logs web --tail=40 || true
die "Deploy fallido: la app no quedó sana."
