// OTR Aula · WhatsApp Business — responder 1 a 1 desde el admin (Fase 1).
//  POST — TEACHER o ADMIN — { contactId, body } envía un mensaje de texto al contacto vía
//         Graph API y lo persiste. NO existe (a propósito) ningún endpoint de envío masivo:
//         eso requiere plantillas pre-aprobadas por Meta, decisión de negocio pendiente.
import { db } from "../../../lib/db";
import { getSessionUser } from "../../../lib/auth";
import { ok, bad, readJson, clean } from "../../../lib/api";
import { requireRole } from "../../../lib/authz";
import { sendWhatsAppMessage } from "../../../lib/whatsapp";
import { esc } from "../../../lib/esc";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return bad("No autenticado", 401);
  if (!requireRole(user, "TEACHER", "ADMIN")) return bad("No autorizado", 403);

  const payload = await readJson<{ contactId?: unknown; body?: unknown }>(req);
  const contactId = clean(payload.contactId, 64);
  const rawBody = clean(payload.body, 4096); // texto PLANO — es lo que se envía a la Graph API
  if (!contactId) return bad("Falta el contacto", 400);
  if (!rawBody) return bad("El mensaje no puede estar vacío", 400);

  const contact = await db.whatsAppContact.findUnique({ where: { id: contactId } });
  if (!contact) return bad("Conversación no encontrada", 404);

  const now = new Date();
  // El body se guarda ESCAPADO (contrato de escape del repo: la pantalla admin renderiza los
  // mensajes crudos, sin re-escapar). El envío real a Meta usa rawBody sin escapar más abajo.
  let message = await db.whatsAppMessage.create({
    data: {
      contactId: contact.id,
      direction: "OUT",
      body: esc(rawBody),
      status: "queued",
      sentByUserId: user.id,
    },
  });

  const result = await sendWhatsAppMessage({ to: contact.phone, body: rawBody });

  message = await db.whatsAppMessage.update({
    where: { id: message.id },
    data: {
      status: result.ok ? "sent" : "failed",
      waMessageId: result.waMessageId,
    },
  });
  await db.whatsAppContact.update({ where: { id: contact.id }, data: { lastMessageAt: now } });

  if (!result.ok) return bad(result.error || "No se pudo enviar el mensaje de WhatsApp", 502);
  return ok({ message });
}
