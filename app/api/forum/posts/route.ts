import { NextResponse } from "next/server";
import { db } from "../../../lib/db";
import { getSessionUser } from "../../../lib/auth";
import { bad } from "../../../lib/api";
import { rateLimit } from "../../../lib/rate-limit";

// APAGADO (PRD-estricto): ver app/api/forum/threads/route.ts.
const FORUM_ENABLED = false;

export async function POST(req: Request) {
  if (!FORUM_ENABLED) return NextResponse.json({ error: "El foro está desactivado en esta fase" }, { status: 410 });
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  // [F1.4] Anti-spam: 30 respuestas / 10 min por usuario. Lista para cuando FORUM_ENABLED pase
  // a true (hoy el foro responde 410 antes de llegar aquí).
  const rl = rateLimit(`forum-posts:${user.id}`, 30, 10 * 60 * 1000);
  if (!rl.ok) return bad(`Demasiadas solicitudes. Intenta en ${rl.retryAfter}s.`, 429);

  const { threadId, body } = await req.json();
  if (!threadId || !body) return NextResponse.json({ error: "Faltan campos" }, { status: 400 });
  const count = await db.forumPost.count({ where: { threadId } });
  const post = await db.forumPost.create({
    data: { threadId, author: user.name, initials: user.initials, role: user.role === "TEACHER" ? "Coach" : "Estudiante", whenLabel: "ahora", op: false, body, position: count },
  });
  await db.forumThread.update({ where: { id: threadId }, data: { replies: { increment: 1 }, lastLabel: "ahora" } });
  return NextResponse.json({ ok: true, post });
}
