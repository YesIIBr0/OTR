#!/usr/bin/env bash
# ============================================================
#  OTR · Recordatorios de sesión — [F6.1]. Cron cada 15 min: golpea la ruta protegida
#  POST /api/cron/reminders con el secreto del cron (x-cron-secret). La ruta hace el trabajo
#  (selección idempotente de reservas CONFIRMED en las próximas 24h + email + notify).
#  Best-effort: si algo falla (app caída, sin secreto), NO rompe el cron.
#    */15 * * * * /opt/otr/scripts/cron-reminders.sh >> /var/log/otr-cron.log 2>&1
#
#  El secreto y el puerto viven en .env.production (la fuente de verdad del entorno de la app),
#  así no se duplica el secreto en dos sitios. La app lo lee como process.env.CRON_SECRET.
# ============================================================
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."   # → /opt/otr

[ -f .env.production ] || { echo "$(date -u) ✗ recordatorios: falta .env.production"; exit 0; }
# Carga CRON_SECRET (y APP_PORT/PORT si están) desde el entorno de la app.
set -a; . ./.env.production; set +a

# Sin secreto la ruta responde 503 (fail-closed): no tiene sentido llamarla.
[ -n "${CRON_SECRET:-}" ] || { echo "$(date -u) ⤳ recordatorios inactivos (CRON_SECRET sin configurar)"; exit 0; }

PORT="${APP_PORT:-${PORT:-3000}}"
if curl -fsS -m 60 -X POST -H "x-cron-secret: ${CRON_SECRET}" "http://127.0.0.1:${PORT}/api/cron/reminders"; then
  echo "  ← $(date -u) recordatorios ok"
else
  echo "$(date -u) ✗ recordatorios: la app no respondió (¿web arriba en :${PORT}?)"
fi
exit 0
