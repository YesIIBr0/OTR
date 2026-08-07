// /api/cron/reminders — [F6.1] Recordatorios de sesión (cron del VPS, cada 15 min).
//  POST → selecciona reservas CONFIRMED con slotAt en las próximas 24h y reminderSentAt NULL,
//         envía un recordatorio (email on-brand + notificación in-app) al ALUMNO y al COACH
//         —cada uno respetando SU preferencia session_reminders— y sella reminderSentAt.
//
// Por qué una ruta y no un script estilo purge-activity.js: aquel es .js puro (require de
// @prisma/client) y NO puede importar los helpers TS de la app. Esta ruta REUTILIZA sin duplicar
// mail.ts (emailShell/emailButton/sendMail), notify.ts, consultations.ts (dateLabel/timeLabel) y
// el cliente Prisma singleton (db.ts).
//
// Gate del secreto (FAIL-CLOSED): sin CRON_SECRET en el entorno → 503; con él, header x-cron-secret
// ausente/incorrecto → 401. Una configuración incompleta NUNCA deja el endpoint abierto.
//
// Idempotencia REAL (no una ventana frágil): reminderSentAt. Un solo campo cubre ambos envíos
// (alumno + coach); correr el job dos veces no re-manda. Un participante con la preferencia apagada
// no recibe, pero NO bloquea al otro ni impide sellar la marca.
//
// sendMail y notify son best-effort (nunca lanzan): sin SMTP el correo se loguea y la notificación
// in-app igual queda — el flujo es correcto para cuando haya SMTP.
import { db } from "../../../lib/db";
import { ok, bad } from "../../../lib/api";
import { sendMail, emailShell, emailButton } from "../../../lib/mail";
import { notify } from "../../../lib/notify";
import { esc } from "../../../lib/esc";
import { dateLabel, timeLabel } from "../../../lib/consultations";
import { wantsNotification } from "../../../lib/notif-prefs";

const WINDOW_MS = 24 * 60 * 60 * 1000; // recordamos las sesiones de las próximas 24h
const BATCH = 200; // cota defensiva: un backlog no convierte un tick del cron en un envío ilimitado

// Verifica el secreto del cron. null = configuración incompleta (503, fail-closed);
// false = header ausente/incorrecto (401); true = autorizado.
function checkSecret(req: Request): null | boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return null;
  return (req.headers.get("x-cron-secret") || "") === expected;
}

// Un participante de la reserva, tal como lo trae el include del findMany.
type Participant = { id: string; name: string; email: string; notificationPrefs: string | null } | null;

// Envía el recordatorio a UN participante respetando su preferencia. `counterpart` = nombre de la
// otra parte (el alumno ve al coach; el coach ve al alumno). Best-effort: sendMail/notify no lanzan.
async function remind(u: Participant, counterpart: string, when: string, appUrl: string, role: "student" | "coach") {
  if (!u) return false;
  // Preferencia apagada explícitamente → no se le manda (pero el otro participante sí; ver el caller).
  if (!wantsNotification(u.notificationPrefs, "session_reminders")) return false;

  const title = "Recordatorio de sesión";
  const lead =
    role === "coach"
      ? `Tienes una sesión de coaching con ${esc(counterpart)} el ${esc(when)}.`
      : `Te recordamos tu sesión de coaching con ${esc(counterpart)} el ${esc(when)}.`;

  // Email on-brand (datos dinámicos ya escapados con esc(), como pide el contrato de emailShell).
  if (u.email) {
    const body = `<p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#4D4D4D;">${lead} Prepárate y conéctate a tiempo.</p>
          ${emailButton("Ver mi sesión", `${appUrl}/aula`)}`;
    await sendMail({ to: u.email, subject: "Recordatorio de sesión · OTR Academy", html: emailShell(title, body) });
  }

  // Notificación in-app: el TEXTO va SIN esc() — queries.ts lo escapa UNA sola vez al servir
  // (contrato de escape; doble escape → `&amp;amp;`).
  await notify({ userId: u.id, icon: "calendar", tone: "ok", title, detail: `${when} · con ${counterpart}` });
  return true;
}

export async function POST(req: Request) {
  const gate = checkSecret(req);
  if (gate === null) return bad("Recordatorios no configurados (falta CRON_SECRET)", 503);
  if (!gate) return bad("No autorizado", 401);

  const now = new Date();
  const until = new Date(now.getTime() + WINDOW_MS);

  const bookings = await db.booking.findMany({
    where: { status: "CONFIRMED", reminderSentAt: null, slotAt: { gte: now, lte: until } },
    select: {
      id: true,
      slotAt: true,
      student: { select: { id: true, name: true, email: true, notificationPrefs: true } },
      coach: { select: { id: true, name: true, email: true, notificationPrefs: true } },
    },
    orderBy: { slotAt: "asc" },
    take: BATCH,
  });

  const appUrl = process.env.APP_URL || "";
  let reminded = 0;

  for (const b of bookings) {
    const when = `${dateLabel(b.slotAt)} · ${timeLabel(b.slotAt)}`;
    // Cada participante se procesa por separado: si uno tiene la preferencia apagada, el otro
    // recibe igual. remind() devuelve true si mandó algo (para la métrica de la respuesta).
    const toStudent = await remind(b.student, b.coach?.name || "tu coach", when, appUrl, "student");
    const toCoach = await remind(b.coach, b.student?.name || "tu alumno", when, appUrl, "coach");
    if (toStudent || toCoach) reminded++;
    // Sella SIEMPRE (un solo campo cubre ambos envíos), aunque ambos tuvieran la preferencia apagada:
    // así el próximo tick no reintenta una reserva que ya se "procesó". La marca es de idempotencia,
    // no de "email entregado".
    await db.booking.update({ where: { id: b.id }, data: { reminderSentAt: new Date() } });
  }

  return ok({ processed: bookings.length, reminded });
}
