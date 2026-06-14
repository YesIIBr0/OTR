import { NextResponse } from "next/server";
import { db } from "../../../lib/db";
import { getSessionUser } from "../../../lib/auth";
import { teacherOwnsLesson } from "../../../lib/authz";
import { normalizeKind, normalizeVideoSrc } from "../../../lib/video";
import { sanitizeHtml } from "../../../lib/sanitize";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const { id } = await params;
  const lesson = await teacherOwnsLesson(id, user);
  if (!lesson) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {}; // allowlist explícita (anti mass-assignment)
  if (body.title != null) data.title = String(body.title).slice(0, 160);
  if (body.type != null) data.type = String(body.type);
  if (body.dur !== undefined) data.dur = body.dur || null;
  const kind = body.videoKind != null ? normalizeKind(body.videoKind) : lesson.videoKind;
  if (body.videoKind != null) data.videoKind = kind;
  if (body.videoSrc !== undefined) data.videoSrc = normalizeVideoSrc(kind, body.videoSrc);
  if (body.contentHtml !== undefined) data.contentHtml = sanitizeHtml(body.contentHtml);
  if (body.releaseAfterId !== undefined) data.releaseAfterId = body.releaseAfterId || null;
  const updated = await db.lesson.update({ where: { id }, data });
  return NextResponse.json({ ok: true, lesson: updated });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const { id } = await params;
  const lesson = await teacherOwnsLesson(id, user);
  if (!lesson) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  await db.lesson.deleteMany({ where: { id } });
  // updateMany no lanza P2025 si el curso ya no existe (a diferencia de update).
  await db.course.updateMany({ where: { id: lesson.module.courseId }, data: { lessonsCount: { decrement: 1 } } });
  return NextResponse.json({ ok: true });
}
