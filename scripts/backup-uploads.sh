#!/usr/bin/env bash
# ============================================================
#  OTR · Backup diario del volumen de subidas (otr_uploads → /app/var/uploads).
#  Respalda TODO lo que suben los usuarios y que NO vive en Postgres ni en git:
#    · entregas/tareas de los alumnos (PDF, audio, docs)
#    · grabaciones y adjuntos de sesiones
#    · avatares y material del coach
#  tar.gz del contenido del volumen + rotación local (conserva los últimos 7). Cron:
#    30 3 * * * /opt/otr/scripts/backup-uploads.sh >> /var/log/otr-backup.log 2>&1
#
#  OFFSITE: mismo bloque compartido que backup-db.sh (rclone → B2/R2 + verificación).
#  Si rclone no está configurado degrada con gracia (solo local + aviso). Config del
#  bucket one-time: ver DEPLOY.md § Backups offsite.
# ============================================================
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."   # → /opt/otr
# Lógica offsite compartida con backup-db.sh (rclone + verificación + rotación remota).
source "$(dirname "${BASH_SOURCE[0]}")/lib/offsite.sh"
DIR=/opt/otr/backups
mkdir -p "$DIR"
TS=$(date -u +%Y%m%d-%H%M%S)
NAME="otr-uploads-$TS.tar.gz"
OUT="$DIR/$NAME"

# El volumen se declara "otr_uploads" en docker-compose.yml, pero compose lo prefija con
# el nombre del proyecto (p.ej. otr_otr_uploads). Lo detectamos por sufijo; override con
# OTR_UPLOADS_VOLUME si tu instalación usa otro nombre.
VOL="${OTR_UPLOADS_VOLUME:-}"
if [ -z "$VOL" ]; then
  VOL="$(docker volume ls --format '{{.Name}}' | grep -E '(^|_)otr_uploads$' | head -n1)"
fi
[ -n "$VOL" ] || { echo "$(date -u) ✗ no encuentro el volumen otr_uploads (¿está levantado el stack?)"; exit 1; }

# tar.gz del contenido del volumen (montado :ro) hacia $DIR (montado como /backup).
# alpine trae tar (busybox); corre como root del contenedor → el archivo queda en el host.
docker run --rm -v "$VOL":/data:ro -v "$DIR":/backup alpine \
  tar czf "/backup/$NAME" -C /data .

# Un archivo vacío = fallo (no dejar un backup inútil que pise la rotación). Un tar de un
# volumen SIN subidas aún sigue pesando >0 (cabecera gzip), así que -s es fiable.
if [ ! -s "$OUT" ]; then echo "$(date -u) ✗ backup de uploads vacío — abortado"; rm -f "$OUT"; exit 1; fi
echo "$(date -u) ✓ backup uploads $OUT ($(du -h "$OUT" | cut -f1)) desde volumen $VOL"

# Rotación local: conserva los 7 más recientes.
ls -1t "$DIR"/otr-uploads-*.tar.gz 2>/dev/null | tail -n +8 | xargs -r rm -f

# Offsite: sube el tar a B2/R2 y verifica. El backup LOCAL ya está a salvo aunque esto
# falle, pero un fallo REAL de subida (rclone configurado) sí debe verse en el log → exit 1.
if ! subir_offsite "$OUT" "uploads"; then
  echo "$(date -u) ✗ offsite falló — el backup LOCAL sí quedó en $OUT"
  exit 1
fi
