// OTR Aula · WhatsApp Business — mensajes de una conversación (Fase 1).
//  GET — TEACHER o ADMIN — mensajes del contacto [id], más viejo primero, tope 200.
import { db } from "../../../../lib/db";
import { getSessionUser } from "../../../../lib/auth";
import { ok, bad } from "../../../../lib/api";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return bad("No autenticado", 401);
  if (user.role !== "TEACHER" && user.role !== "ADMIN") return bad("No autorizado", 403);

  const { id } = await params;
  const contact = await db.whatsAppContact.findUnique({ where: { id } });
  if (!contact) return bad("Conversación no encontrada", 404);

  const messages = await db.whatsAppMessage.findMany({
    where: { contactId: id },
    orderBy: { createdAt: "asc" },
    take: 200,
  });

  return ok({ contact, messages });
}
