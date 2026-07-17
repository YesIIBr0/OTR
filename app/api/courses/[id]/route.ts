import { NextResponse } from "next/server";
import { db } from "../../../lib/db";
import { getSessionUser } from "../../../lib/auth";
import { teacherOwnsCourse } from "../../../lib/authz";
import { normalizeKind, normalizeVideoSrc } from "../../../lib/video";
import { audit } from "../../../lib/audit";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const { id } = await params;
  // teacherOwnsCourse devuelve el curso (con nombre) si autoriza → lo usamos para el rastro.
  const course = await teacherOwnsCourse(id, user);
  if (!course) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  await db.course.deleteMany({ where: { id } }); // idempotente: no falla si ya no existe
  // [F2.1] Rastro de auditoría best-effort — el borrado de un curso debe ser atribuible.
  await audit({
    actorId: user.id, actorName: user.name, action: "course.delete", targetType: "course", targetId: id,
    detail: `Curso "${course.name}" borrado`,
  });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const { id } = await params;
  if (!(await teacherOwnsCourse(id, user))) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  const body = await req.json();
  // allowlist explícita — nunca el body crudo (evita mass-assignment de teacherId/priceCents/published)
  const data: Record<string, unknown> = {};
  for (const k of ["name", "nameEn", "color", "next", "format", "summary", "summaryEn"]) {
    if (typeof body[k] === "string") data[k] = body[k].slice(0, 600);
  }
  if (typeof body.modality === "string" && ["online", "presencial", "híbrido"].includes(body.modality)) data.modality = body.modality;
  if (body.capacity !== undefined) {
    const n = Number(body.capacity);
    data.capacity = body.capacity === "" || Number.isNaN(n) ? null : n;
  }
  // [P1] Borrador/publicado: toggle explícito y validado (no por el loop genérico de strings).
  if (typeof body.published === "boolean") data.published = body.published;
  // Layout de la vista del alumno (validado contra lista blanca, nunca string libre).
  if (typeof body.layout === "string" && ["modules", "grid", "single"].includes(body.layout)) data.layout = body.layout;
  // [EPIC-5] Video de bienvenida del curso — misma normalización/validación que las lecciones:
  // normalizeKind acota a none|youtube|cloudflare y normalizeVideoSrc limpia el ID/UID (o null).
  if (body.welcomeVideoKind != null) {
    const kind = normalizeKind(body.welcomeVideoKind);
    data.welcomeVideoKind = kind;
    data.welcomeVideoSrc = normalizeVideoSrc(kind, body.welcomeVideoSrc);
  } else if (body.welcomeVideoSrc !== undefined) {
    // src sin kind explícito: revalida contra el kind ya guardado.
    const cur = await db.course.findUnique({ where: { id }, select: { welcomeVideoKind: true } });
    data.welcomeVideoSrc = normalizeVideoSrc(cur?.welcomeVideoKind ?? "none", body.welcomeVideoSrc);
  }
  const course = await db.course.update({ where: { id }, data });
  return NextResponse.json({ ok: true, course });
}
