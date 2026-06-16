#!/usr/bin/env bash
# ============================================================
#  OTR · Backup diario de PostgreSQL (mitiga el riesgo #1: pérdida total de datos).
#  pg_dump comprimido + rotación (conserva los últimos 14). Cron:
#    0 3 * * * /opt/otr/scripts/backup-db.sh >> /var/log/otr-backup.log 2>&1
#
#  ⚠️ Es backup LOCAL en el MISMO VPS — primer paso. NO protege ante pérdida del disco
#  hasta subirlo OFFSITE (Backblaze B2 / S3). Ese es el siguiente paso (requiere credenciales).
# ============================================================
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."   # → /opt/otr
DIR=/opt/otr/backups
mkdir -p "$DIR"
TS=$(date -u +%Y%m%d-%H%M%S)
OUT="$DIR/otr-$TS.sql.gz"

docker compose --env-file .env.production exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB"' | gzip > "$OUT"

# Un dump vacío = fallo (no dejar un backup inútil que pise la rotación).
if [ ! -s "$OUT" ]; then echo "$(date -u) ✗ backup vacío — abortado"; rm -f "$OUT"; exit 1; fi
echo "$(date -u) ✓ backup $OUT ($(du -h "$OUT" | cut -f1))"

# Rotación: conserva los 14 más recientes.
ls -1t "$DIR"/otr-*.sql.gz 2>/dev/null | tail -n +15 | xargs -r rm -f
