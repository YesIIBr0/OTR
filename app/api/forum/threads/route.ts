import { NextResponse } from "next/server";
import { db } from "../../../lib/db";
import { getSessionUser } from "../../../lib/auth";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const { title, tag, excerpt } = await req.json();
  if (!title) return NextResponse.json({ error: "Falta el título" }, { status: 400 });
  const count = await db.forumThread.count();
  const thread = await db.forumThread.create({
    data: { title, tag: tag || "General", excerpt: excerpt || "", author: user.name, initials: user.initials, replies: 0, views: 0, pinned: false, lastLabel: "ahora", position: count },
  });
  return NextResponse.json({ ok: true, thread });
}
