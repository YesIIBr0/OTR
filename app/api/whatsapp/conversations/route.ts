// OTR Aula · WhatsApp Business — bandeja del equipo (Fase 1).
//  GET — TEACHER o ADMIN — lista WhatsAppContact ordenados por lastMessageAt desc, con el
//        último mensaje de cada uno (preview corto). UNA sola query (sin N+1): findMany de
//        contactos con include del mensaje más reciente por contacto (take:1, createdAt desc).
import { db } from "../../../lib/db";
import { getSessionUser } from "../../../lib/auth";
import { ok, bad } from "../../../lib/api";
import { requireRole } from "../../../lib/authz";

const TAKE = 100;

export async function GET() {
  const user = await getSessionUser();
  if (!user) return bad("No autenticado", 401);
  if (!requireRole(user, "TEACHER", "ADMIN")) return bad("No autorizado", 403);

  // [F3.3] take-per-parent: el último mensaje de cada contacto vía include + take:1 (orderBy
  // createdAt desc), en UNA sola query. Antes se bajaban TODOS los mensajes de hasta 100
  // contactos para quedarnos con el primero por contacto (sin cota → degradaba con hilos largos).
  const contacts = await db.whatsAppContact.findMany({
    orderBy: { lastMessageAt: "desc" },
    take: TAKE,
    include: {
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { body: true, direction: true, createdAt: true },
      },
    },
  });
  if (!contacts.length) return ok({ conversations: [] });

  const conversations = contacts.map((c) => {
    const last = c.messages[0] || null;
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
