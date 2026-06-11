import { NextResponse } from "next/server";
import { db } from "../../lib/db";
import { getSessionUser } from "../../lib/auth";
import { teacherOwnsModule } from "../../lib/authz";
import { normalizeKind, normalizeVideoSrc } from "../../lib/video";
import { sanitizeHtml } from "../../lib/sanitize";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const { moduleId, title, type, dur, videoKind, videoSrc, contentHtml } = await req.json();
  if (!moduleId || !title) return NextResponse.json({ error: "Faltan campos" }, { status: 400 });
  const mod = await teacherOwnsModule(moduleId, user);
  if (!mod) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  const count = await db.lesson.count({ where: { moduleId } });
  const kind = normalizeKind(videoKind);
  const lesson = await db.lesson.create({
    data: {
      moduleId, title: String(title).slice(0, 160), type: type || "lesson", dur: dur || null, position: count,
      videoKind: kind, videoSrc: normalizeVideoSrc(kind, videoSrc), contentHtml: sanitizeHtml(contentHtml),
    },
  });
  await db.course.update({ where: { id: mod.courseId }, data: { lessonsCount: { increment: 1 } } });
  return NextResponse.json({ ok: true, lesson });
}
