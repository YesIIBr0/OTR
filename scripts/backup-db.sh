#!/usr/bin/env bash
# ============================================================
#  OTR · Backup diario de PostgreSQL (mitiga el riesgo #1: pérdida total de datos).
#  pg_dump comprimido + rotación local (conserva los últimos 14). Cron:
#    0 3 * * * /opt/otr/scripts/backup-db.sh >> /var/log/otr-backup.log 2>&1
#
#  OFFSITE: tras el dump local, subir_offsite() lo sube a un bucket remoto (B2/R2) y
#  lo verifica. Si rclone no está configurado, degrada con gracia (solo local + aviso);
#  NO rompe el cron. Configuración one-time del bucket: ver DEPLOY.md § Backups offsite.
# ============================================================
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."   # → /opt/otr
# Lógica offsite compartida con backup-uploads.sh (rclone + verificación + rotación remota).
source "$(dirname "${BASH_SOURCE[0]}")/lib/offsite.sh"
DIR=/opt/otr/backups
mkdir -p "$DIR"
TS=$(date -u +%Y%m%d-%H%M%S)
OUT="$DIR/otr-$TS.sql.gz"

docker compose --env-file .env.production exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB"' | gzip > "$OUT"

# Un dump vacío = fallo (no dejar un backup inútil que pise la rotación).
if [ ! -s "$OUT" ]; then echo "$(date -u) ✗ backup vacío — abortado"; rm -f "$OUT"; exit 1; fi
echo "$(date -u) ✓ backup $OUT ($(du -h "$OUT" | cut -f1))"

# Rotación local: conserva los 14 más recientes.
ls -1t "$DIR"/otr-*.sql.gz 2>/dev/null | tail -n +15 | xargs -r rm -f

# Offsite: sube el dump a B2/R2 y verifica. El backup LOCAL ya está a salvo aunque esto
# falle, pero un fallo REAL de subida (rclone configurado) sí debe verse en el log → exit 1.
if ! subir_offsite "$OUT" "db"; then
  echo "$(date -u) ✗ offsite falló — el backup LOCAL sí quedó en $OUT"
  exit 1
fi
