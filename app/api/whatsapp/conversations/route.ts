// OTR Aula · WhatsApp Business — bandeja del equipo (Fase 1).
//  GET — TEACHER o ADMIN — lista WhatsAppContact ordenados por lastMessageAt desc, con el
//        último mensaje de cada uno (preview corto). Dos queries en total (sin N+1): una
//        findMany de contactos + una findMany de mensajes de esos contactos ordenada por
//        fecha desc, quedándonos con la primera ocurrencia (= la más reciente) por contacto.
import { db } from "../../../lib/db";
import { getSessionUser } from "../../../lib/auth";
import { ok, bad } from "../../../lib/api";

const TAKE = 100;

export async function GET() {
  const user = await getSessionUser();
  if (!user) return bad("No autenticado", 401);
  if (user.role !== "TEACHER" && user.role !== "ADMIN") return bad("No autorizado", 403);

  const contacts = await db.whatsAppContact.findMany({
    orderBy: { lastMessageAt: "desc" },
    take: TAKE,
  });
  if (!contacts.length) return ok({ conversations: [] });

  const contactIds = contacts.map((c) => c.id);
  const messages = await db.whatsAppMessage.findMany({
    where: { contactId: { in: contactIds } },
    orderBy: { createdAt: "desc" },
    select: { contactId: true, body: true, direction: true, createdAt: true },
  });
  const lastByContact = new Map<string, (typeof messages)[number]>();
  for (const m of messages) if (!lastByContact.has(m.contactId)) lastByContact.set(m.contactId, m);

  const conversations = contacts.map((c) => {
    const last = lastByContact.get(c.id) || null;
    return {
      id: c.id,
      phone: c.phone,
      name: c.name,
      lastMessageAt: c.lastMessageAt,
      lastMessage: last ? { body: last.body, direction: last.direction, createdAt: last.createdAt } : null,
    };
  });

  return ok({ conversations });
}
