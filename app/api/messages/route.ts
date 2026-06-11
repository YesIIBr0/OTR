import { db } from "../../lib/db";
import { getSessionUser } from "../../lib/auth";
import { ok, bad, readJson, clean } from "../../lib/api";
import { filterContactInfo, isMinor } from "../../lib/safety";
import { logActivitySafe } from "../../lib/activity";

// PRD §7.4 / §17.4 — Mensajería segura para menores.
// Scoping real por ConversationParticipant (no por UI) + enmascarado de datos de
// contacto cuando algún participante es menor.

// GET — devuelve SOLO las conversaciones del usuario (vía ConversationParticipant).
// Fallback legacy: una conversación SIN ningún participante registrado (seed viejo)
// se trata como visible para no romper instalaciones previas a la migración §7.4.
export async function GET() {
  const user = await getSessionUser();
  if (!user) return bad("No autenticado", 401);

  const all = await db.conversation.findMany({
    orderBy: { position: "asc" },
    include: { participants: true, messages: { orderBy: { position: "asc" } } },
  });

  const visible = all.filter((c) => {
    if (c.participants.length === 0) return true; // legacy: sin scoping → visible
    return c.participants.some((p) => p.userId === user.id);
  });

  // Mantiene el shape que espera la pantalla de mensajes (scr-community: ini/name/
  // when/last/unread/online/navy en la lista; me/body/when en las burbujas).
  const conversations = visible.map((c) => ({
    id: c.id,
    ini: c.initials,
    name: c.name,
    last: c.lastLabel,
    when: c.whenLabel,
    unread: c.unread,
    online: c.online,
    navy: c.navy,
    messages: c.messages.map((m) => ({
      id: m.id,
      me: m.me,
      body: m.body,
      when: m.timeLabel,
    })),
  }));

  return ok({ conversations });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return bad("No autenticado", 401);
  const data = await readJson<{ conversationId?: string; body?: string }>(req);
  const rawBody = clean(data.body, 4000);
  if (!rawBody) return bad("Mensaje vacío", 400);

  // Resolver conversación destino.
  let convId = clean(data.conversationId, 64);
  if (convId) {
    const exists = await db.conversation.findUnique({ where: { id: convId } });
    if (!exists) return bad("Conversación no encontrada", 404);
  } else {
    const first = await db.conversation.findFirst({ orderBy: { position: "asc" } });
    convId = first?.id || "";
  }
  if (!convId) return bad("Sin conversación", 400);

  // Autorización: el emisor debe ser participante de la conversación.
  // Fallback legacy: si la conversación no tiene NINGÚN participante registrado
  // (seed previo a §7.4), se permite para no romper instalaciones existentes.
  const participants = await db.conversationParticipant.findMany({
    where: { conversationId: convId },
  });
  if (participants.length > 0) {
    const isParticipant = participants.some((p) => p.userId === user.id);
    if (!isParticipant) return bad("No autorizado en esta conversación", 403);
  }

  // Trust & Safety: si el emisor es menor, o algún participante de la conversación
  // es menor, enmascaramos datos de contacto antes de persistir.
  let needsFilter = isMinor(user);
  if (!needsFilter && participants.length > 0) {
    const otherIds = participants
      .map((p) => p.userId)
      .filter((id) => id !== user.id);
    if (otherIds.length > 0) {
      const others = await db.user.findMany({
        where: { id: { in: otherIds } },
        select: { ageBand: true },
      });
      needsFilter = others.some((o) => isMinor(o));
    }
  }

  let body = rawBody;
  let filtered = false;
  if (needsFilter) {
    const res = filterContactInfo(rawBody);
    body = res.clean;
    filtered = res.blocked; // se guarda enmascarado igual; solo avisamos
  }

  const count = await db.chatMessage.count({ where: { conversationId: convId } });
  const message = await db.chatMessage.create({
    data: { conversationId: convId, me: true, body, timeLabel: "ahora", position: count },
  });
  await db.conversation.update({
    where: { id: convId },
    data: { lastLabel: body.slice(0, 40), whenLabel: "ahora" },
  });

  await logActivitySafe({
    userId: user.id,
    type: "message_sent",
    title: "Mensaje enviado",
    detail: filtered ? "Mensaje enmascarado por seguridad" : null,
    source: "messages",
    refId: convId,
  });

  return ok({ message, filtered });
}
