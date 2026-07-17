#!/usr/bin/env bash
# ============================================================
#  OTR · Offsite compartido — sube un backup local a un bucket remoto (Backblaze B2
#  o Cloudflare R2) vía rclone, VERIFICA la subida y aplica rotación remota.
#  Lo consumen backup-db.sh y backup-uploads.sh (source, no ejecutable directo).
#
#  Por qué: el VPS es un ÚNICO punto de pérdida total — app + Postgres + uploads +
#  backups viven en el MISMO disco. Un fallo de disco sin copia offsite = pérdida
#  total de datos de una plataforma con menores. Esto cierra ese riesgo (RPO ≤24 h).
#
#  Degradación con gracia: si rclone NO está instalado o el remote no está
#  configurado, NO rompe el cron — deja el backup LOCAL y avisa (return 0). Solo
#  devuelve error (return 1) si rclone SÍ está configurado pero la subida o la
#  verificación fallan (un problema real que el operador debe ver en el log).
#
#  Config (override por entorno o por /etc/otr-backup.env):
#    OTR_BACKUP_REMOTE      remote:bucket[/prefijo] de rclone   (default "otr-backups:")
#    OTR_OFFSITE_KEEP_DAYS  antigüedad máx. remota, en días     (default 30)
#
#  Los crons (cron.d) NO heredan el entorno del shell, así que la config offsite se lee
#  de /etc/otr-backup.env si existe (KEY=value). Ese archivo lo escribe el fundador UNA
#  vez (ver DEPLOY.md § Backups offsite) y sobrevive a re-ejecutar bootstrap-vps.sh.
# ============================================================
[ -f /etc/otr-backup.env ] && source /etc/otr-backup.env
: "${OTR_BACKUP_REMOTE:=otr-backups:}"
: "${OTR_OFFSITE_KEEP_DAYS:=30}"

# subir_offsite <archivo_local> <subcarpeta_remota>
#   return 0 → subido+verificado, o offsite no configurado (degradación con gracia).
#   return 1 → rclone configurado pero la subida/verificación FALLÓ (error real).
subir_offsite() {
  local archivo="$1" sub="$2"

  # Construye el destino remoto respetando la sintaxis de rclone: si la base termina
  # en ':' (remote pelado, p.ej. "otr-backups:") se concatena directo; si incluye
  # bucket/ruta (p.ej. "otr-backups:mi-bucket") se une con '/'.
  local base="${OTR_BACKUP_REMOTE%/}" remoto
  if [[ "$base" == *: ]]; then remoto="${base}${sub}"; else remoto="${base}/${sub}"; fi

  # ¿rclone instalado?
  if ! command -v rclone >/dev/null 2>&1; then
    echo "$(date -u) ⚠ backup solo local — rclone no está instalado; configura offsite (ver DEPLOY.md)"
    return 0
  fi
  # ¿existe el remote esperado en la config de rclone?
  local remote_name="${OTR_BACKUP_REMOTE%%:*}"
  if ! rclone listremotes 2>/dev/null | grep -qx "${remote_name}:"; then
    echo "$(date -u) ⚠ backup solo local — rclone sin remote '${remote_name}:'; configura offsite (ver DEPLOY.md)"
    return 0
  fi

  # Subir. rclone copy ya valida integridad (size/hash) al transferir y reintenta.
  echo "$(date -u) ▸ offsite: subiendo $(basename "$archivo") → ${remoto}/"
  if ! rclone copy "$archivo" "${remoto}/" --no-traverse; then
    echo "$(date -u) ✗ offsite: rclone copy FALLÓ para $(basename "$archivo")"
    return 1
  fi
  # Verificación explícita: compara SOLO el archivo recién subido (source→dest, one-way)
  # contra el remoto usando hash/size nativos del bucket.
  if ! rclone check "$(dirname "$archivo")" "${remoto}/" \
        --include "/$(basename "$archivo")" --one-way 2>/dev/null; then
    echo "$(date -u) ✗ offsite: verificación (rclone check) FALLÓ para $(basename "$archivo")"
    return 1
  fi
  echo "$(date -u) ✓ offsite: $(basename "$archivo") subido y verificado en ${remoto}/"

  # Rotación remota: borra lo más viejo que OTR_OFFSITE_KEEP_DAYS. No es crítico:
  # un fallo aquí no debe tumbar el backup (ya está a salvo), por eso '|| true'.
  rclone delete "${remoto}/" --min-age "${OTR_OFFSITE_KEEP_DAYS}d" 2>/dev/null || true
  return 0
}
