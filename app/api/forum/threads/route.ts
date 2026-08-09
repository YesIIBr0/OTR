import { NextResponse } from "next/server";
import { db } from "../../../lib/db";
import { getSessionUser } from "../../../lib/auth";
import { readJson, clean, bad } from "../../../lib/api";
import { rateLimit } from "../../../lib/rate-limit";

// APAGADO (PRD-estricto): los discussion boards son Fase 3 (§10) y requieren
// espacios cerrados/moderados para menores. Reactivar: FORUM_ENABLED = true.
const FORUM_ENABLED = false;

export async function POST(req: Request) {
  if (!FORUM_ENABLED) return NextResponse.json({ error: "El foro está desactivado en esta fase" }, { status: 410 });
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  // [F1.4] Anti-spam: 10 hilos nuevos / 10 min por usuario. La protección queda lista para
  // cuando FORUM_ENABLED pase a true (hoy el foro responde 410 antes de llegar aquí).
  const rl = rateLimit(`forum-threads:${user.id}`, 10, 10 * 60 * 1000);
  if (!rl.ok) return bad(`Demasiadas solicitudes. Intenta en ${rl.retryAfter}s.`, 429);

  const body = await readJson<Record<string, unknown>>(req);
  const title = clean(body.title, 160);
  if (!title) return NextResponse.json({ error: "Falta el título" }, { status: 400 });
  const tag = clean(body.tag, 40) || "General";
  const excerpt = clean(body.excerpt, 300);
  const count = await db.forumThread.count();
  const thread = await db.forumThread.create({
    // [DEUDA-H] lastAt = instante de creación del hilo; lastLabel deja de guardar "ahora".
    data: { title, tag, excerpt, author: user.name, initials: user.initials, replies: 0, views: 0, pinned: false, lastLabel: "", lastAt: new Date(), position: count },
  });
  return NextResponse.json({ ok: true, thread });
}
