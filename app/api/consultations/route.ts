// /api/consultations
//  POST  → público (rate-limited): reserva una consulta de estrategia gratuita (30 min).
//  GET   → solo ADMIN: próximas reservas ordenadas por slotAt asc.
//          (Los leads traen PII de visitantes — PRD Trust & Safety: nunca expuestos
//          a cuentas TEACHER, que son auto-registrables.)
import { db } from "../../lib/db";
import { ok, bad, readJson, clean, clientIp } from "../../lib/api";
import { getSessionUser } from "../../lib/auth";
import { rateLimit } from "../../lib/rate-limit";
import { sendMail } from "../../lib/mail";
import { isValidSlot, dateLabel, timeLabel, DURATION_MIN } from "../../lib/consultations";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// APAGADO (PRD-estricto): el flujo /consulta no está en el PDF. El GET de ADMIN
// sigue activo para leer los leads históricos. Reactivar: CONSULTA_ENABLED = true.
const CONSULTA_ENABLED = false;

export async function POST(req: Request) {
  if (!CONSULTA_ENABLED) return bad("Las consultas están desactivadas en esta fase", 410);
  // Anti-spam público: 5 reservas / 10 min por IP.
  const ip = clientIp(req);
  const rl = rateLimit(`consult:${ip}`, 5, 10 * 60 * 1000);
  if (!rl.ok) return bad(`Demasiadas solicitudes. Intenta en ${rl.retryAfter}s.`, 429);

  const body = await readJson<{
    name?: string;
    email?: string;
    phone?: string;
    goal?: string;
    level?: string;
    format?: string;
    slotAt?: string;
  }>(req);

  const name = clean(body.name, 120);
  const email = clean(body.email, 160).toLowerCase();
  const phone = clean(body.phone, 40) || null;
  const goal = clean(body.goal, 2000) || null;
  const level = clean(body.level, 40) || null;
  const format = clean(body.format, 40) || null;
  const slotAt = clean(body.slotAt, 40);

  if (name.length < 2) return bad("Ingresa tu nombre (mínimo 2 caracteres)", 400);
  if (!EMAIL_RE.test(email)) return bad("Correo inválido", 400);
  if (!isValidSlot(slotAt)) return bad("Ese horario no está disponible", 400);

  const slotDate = new Date(slotAt);

  // Doble-reserva: verifica que no exista otra reserva activa con el mismo slotAt.
  const conflict = await db.consultationBooking.findFirst({
    where: { slotAt: slotDate, status: { not: "CANCELLED" } },
    select: { id: true },
  });
  if (conflict) return bad("Ese horario ya fue reservado", 409);

  // userId si hay sesión iniciada (best-effort, no obligatorio).
  let userId: string | null = null;
  try {
    const user = await getSessionUser();
    if (user) userId = user.id;
  } catch {
    userId = null;
  }

  let booking;
  try {
    booking = await db.consultationBooking.create({
      data: {
        name,
        email,
        phone,
        goal,
        level,
        format,
        slotAt: slotDate,
        durationMin: DURATION_MIN,
        status: "CONFIRMED",
        userId,
      },
    });
  } catch {
    // Carrera: otro request tomó el slot entre el chequeo y el create.
    return bad("Ese horario ya fue reservado", 409);
  }

  const dLabel = dateLabel(slotDate);
  const tLabel = timeLabel(slotDate);

  // Email de confirmación on-brand. sendMail nunca lanza.
  await sendMail({
    to: email,
    subject: `Consulta confirmada · ${dLabel} ${tLabel} · OTR Academy`,
    html: confirmationHtml({ name, dateLabel: dLabel, timeLabel: tLabel }),
  });

  return ok({ booking: { id: booking.id, dateLabel: dLabel, timeLabel: tLabel } });
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) return bad("No autenticado", 401);
  if (user.role !== "ADMIN") return bad("No autorizado", 403);

  // Próximas reservas (desde ahora), ordenadas por slotAt asc.
  const bookings = await db.consultationBooking.findMany({
    where: { slotAt: { gte: new Date() } },
    orderBy: { slotAt: "asc" },
  });
  return ok({ bookings });
}

// --- Email de confirmación (sistema de diseño OTR: claro, navy #0C2340 + sky #4FA9E8) ---
function confirmationHtml(p: { name: string; dateLabel: string; timeLabel: string }): string {
  const esc = (s: string) =>
    String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
  const name = esc(p.name);
  const fecha = esc(p.dateLabel);
  const hora = esc(p.timeLabel);
  return `<!doctype html>
<html lang="es">
<body style="margin:0;padding:0;background:#F4F7FB;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F7FB;padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#FFFFFF;border:1px solid #E2E9F2;border-radius:16px;overflow:hidden;">
        <tr><td style="padding:28px 32px;background:#0C2340;">
          <div style="font-size:22px;font-weight:800;letter-spacing:-0.5px;color:#FFFFFF;">OTR Academy</div>
          <div style="font-size:12px;color:#9FC6E8;margin-top:2px;">By Students, For Students.</div>
        </td></tr>
        <tr><td style="padding:24px 32px 0;">
          <h1 style="margin:0 0 12px;font-size:20px;font-weight:800;color:#0C2340;letter-spacing:-0.3px;">Tu consulta está confirmada</h1>
          <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#4A5A6E;">¡Hola ${name}! Reservaste tu <strong style="color:#0C2340;">consulta de estrategia gratuita</strong>. Aquí están los detalles:</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F9FE;border:1px solid #CFE4F5;border-radius:12px;margin:0 0 20px;">
            <tr><td style="padding:18px 20px;">
              <div style="font-size:12px;color:#6B7C90;text-transform:uppercase;letter-spacing:0.5px;">Fecha y hora</div>
              <div style="font-size:18px;font-weight:700;color:#2E8BD0;margin-top:4px;">${fecha} · ${hora}</div>
              <div style="font-size:13px;color:#4A5A6E;margin-top:6px;">Duración: 30 minutos · Hora de Santo Domingo (UTC-4)</div>
            </td></tr>
          </table>
          <div style="font-size:13px;font-weight:700;color:#0C2340;margin:0 0 8px;">Qué incluye la sesión</div>
          <ul style="margin:0 0 20px;padding-left:18px;font-size:14px;line-height:1.7;color:#4A5A6E;">
            <li>Diagnóstico de tu nivel y tus metas en debate u oratoria.</li>
            <li>Un plan claro de próximos pasos para mejorar.</li>
            <li>Recomendaciones de formato y recursos según tu objetivo.</li>
          </ul>
          <p style="margin:0 0 8px;font-size:14px;line-height:1.6;color:#4A5A6E;">Recibirás el <strong style="color:#0C2340;">enlace de la videollamada</strong> antes de la sesión. Si necesitas reprogramar, responde a este correo.</p>
        </td></tr>
        <tr><td style="padding:24px 32px 28px;border-top:1px solid #E2E9F2;margin-top:8px;">
          <div style="font-size:11px;color:#8A99AB;">© OTR Academy · Own the Room.</div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
