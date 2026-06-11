import { NextResponse } from "next/server";
import { db } from "../../../lib/db";
import { getSessionUser } from "../../../lib/auth";
import { readJson, clean } from "../../../lib/api";

// APAGADO (PRD-estricto): los discussion boards son Fase 3 (§10) y requieren
// espacios cerrados/moderados para menores. Reactivar: FORUM_ENABLED = true.
const FORUM_ENABLED = false;

export async function POST(req: Request) {
  if (!FORUM_ENABLED) return NextResponse.json({ error: "El foro está desactivado en esta fase" }, { status: 410 });
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const body = await readJson<Record<string, unknown>>(req);
  const title = clean(body.title, 160);
  if (!title) return NextResponse.json({ error: "Falta el título" }, { status: 400 });
  const tag = clean(body.tag, 40) || "General";
  const excerpt = clean(body.excerpt, 300);
  const count = await db.forumThread.count();
  const thread = await db.forumThread.create({
    data: { title, tag, excerpt, author: user.name, initials: user.initials, replies: 0, views: 0, pinned: false, lastLabel: "ahora", position: count },
  });
  return NextResponse.json({ ok: true, thread });
}
