import { db } from "../../lib/db";
import { getSessionUser } from "../../lib/auth";
import { ok, bad, readJson, clean } from "../../lib/api";

// PRD §7 — POST /api/conversations: find-or-create de un hilo 1:1 entre el usuario actual y
// un coach (entrada desde el marketplace, botón "Enviar mensaje"). Inserta los
// ConversationParticipant de ambos y devuelve { conversationId } para hacer deep-link al hilo.
// El envío real (con el filtro de contacto §7.4) sigue por POST /api/messages.
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return bad("No autenticado", 401);

  const data = await readJson<{ coachId?: string }>(req);
  const coachId = clean(data.coachId, 64);
  if (!coachId) return bad("Falta coachId");
  if (coachId === user.id) return bad("No puedes iniciar una conversación contigo mismo", 400);

  const coach = await db.user.findUnique({ where: { id: coachId }, select: { id: true, name: true, initials: true } });
  if (!coach) return bad("Coach no encontrado", 404);

  // ¿Ya existe un hilo donde AMBOS son participantes? (1:1). Tomamos las conversaciones del
  // usuario y buscamos una que también tenga al coach como participante → reutilizar.
  const mine = await db.conversationParticipant.findMany({ where: { userId: user.id }, select: { conversationId: true } });
  const myConvIds = mine.map((p) => p.conversationId);
  let convId = "";
  if (myConvIds.length) {
    const shared = await db.conversationParticipant.findFirst({
      where: { userId: coachId, conversationId: { in: myConvIds } },
      select: { conversationId: true },
    });
    convId = shared?.conversationId || "";
  }

  if (!convId) {
    // Crear el hilo. name/initials = el coach (perspectiva del alumno que inicia el contacto).
    const last = await db.conversation.findFirst({ orderBy: { position: "desc" }, select: { position: true } });
    const conv = await db.conversation.create({
      data: {
        initials: coach.initials || (coach.name || "C").slice(0, 2).toUpperCase(),
        name: coach.name || "Coach OTR",
        lastLabel: "Nueva conversación",
        whenLabel: "ahora",
        position: (last?.position ?? 0) + 1,
        participants: { create: [{ userId: user.id }, { userId: coachId }] },
      },
    });
    convId = conv.id;
  }

  return ok({ conversationId: convId });
}
