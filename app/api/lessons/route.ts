import { NextResponse } from "next/server";
import { db } from "../../lib/db";
import { getSessionUser } from "../../lib/auth";
import { teacherOwnsModule } from "../../lib/authz";
import { normalizeKind, normalizeVideoSrc } from "../../lib/video";
import { sanitizeHtml } from "../../lib/sanitize";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const { moduleId, title, titleEn, type, dur, videoKind, videoSrc, contentHtml, contentHtmlEn, dueAt, submitKinds, maxPoints } = await req.json();
  if (!moduleId || !title) return NextResponse.json({ error: "Faltan campos" }, { status: 400 });
  const mod = await teacherOwnsModule(moduleId, user);
  if (!mod) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  const count = await db.lesson.count({ where: { moduleId } });
  const kind = normalizeKind(videoKind);
  // Apartado de entrega (opcional, para tareas/grabaciones): se aceptan al crear.
  const d = dueAt ? new Date(dueAt) : null;
  const dueAtVal = d && !Number.isNaN(d.getTime()) ? d : null;
  const allowed = ["audio", "video", "file", "text"];
  const sk = String(submitKinds || "").split(",").map((s: string) => s.trim().toLowerCase()).filter((s: string) => allowed.includes(s));
  const mp = Number(maxPoints);
  const lesson = await db.lesson.create({
    data: {
      moduleId, title: String(title).slice(0, 160), type: type || "lesson", dur: dur || null, position: count,
      videoKind: kind, videoSrc: normalizeVideoSrc(kind, videoSrc), contentHtml: sanitizeHtml(contentHtml),
      // [I18N-1 / §17.3] Variantes EN opcionales → el contenido nace bilingüe.
      titleEn: titleEn ? String(titleEn).slice(0, 160) : null,
      contentHtmlEn: contentHtmlEn ? sanitizeHtml(contentHtmlEn) : null,
      dueAt: dueAtVal,
      submitKinds: sk.length ? sk.join(",") : null,
      maxPoints: maxPoints === "" || maxPoints == null || Number.isNaN(mp) ? null : Math.max(0, Math.min(1000, Math.round(mp))),
    },
  });
  await db.course.update({ where: { id: mod.courseId }, data: { lessonsCount: { increment: 1 } } });
  return NextResponse.json({ ok: true, lesson });
}
