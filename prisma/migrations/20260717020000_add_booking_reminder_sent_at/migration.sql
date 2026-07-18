-- [F6.1] Booking.reminderSentAt: marca de idempotencia del cron de recordatorios de sesión.
-- El job (POST /api/cron/reminders, cada 15 min desde el VPS) selecciona reservas CONFIRMED con
-- slotAt en las próximas 24h y reminderSentAt NULL, envía el recordatorio (email + notificación
-- in-app) al alumno y al coach —cada uno respetando su preferencia session_reminders— y sella
-- reminderSentAt para no re-enviar. Nullable, sin default: NULL = aún no recordada.
--
-- ConsultationBooking NO lleva este campo: su flujo POST está APAGADO (410, CONSULTA_ENABLED=false
-- en app/api/consultations/route.ts) → no se crean nuevas consultas que recordar. Documentado como
-- no-aplica; se añadirá aquí el día que se reactive ese flujo.

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN "reminderSentAt" TIMESTAMP(3);
