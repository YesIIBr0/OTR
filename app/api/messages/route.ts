import { db } from "../../lib/db";
import { getSessionUser } from "../../lib/auth";
import { ok, bad, readJson, clean } from "../../lib/api";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return bad("No autenticado", 401);
  const data = await readJson<{ conversationId?: string; body?: string }>(req);
  const body = clean(data.body, 2000);
  if (!body) return bad("Mensaje vacío", 400);

  let convId = clean(data.conversationId, 64);
  if (convId) {
    const exists = await db.conversation.findUnique({ where: { id: convId } });
    if (!exists) return bad("Conversación no encontrada", 404);
  } else {
    const first = await db.conversation.findFirst({ orderBy: { position: "asc" } });
    convId = first?.id || "";
  }
  if (!convId) return bad("Sin conversación", 400);

  const count = await db.chatMessage.count({ where: { conversationId: convId } });
  const message = await db.chatMessage.create({
    data: { conversationId: convId, me: true, body, timeLabel: "ahora", position: count },
  });
  await db.conversation.update({ where: { id: convId }, data: { lastLabel: body.slice(0, 40), whenLabel: "ahora" } });
  return ok({ message });
}
