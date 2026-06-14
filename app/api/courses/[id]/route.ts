import { NextResponse } from "next/server";
import { db } from "../../../lib/db";
import { getSessionUser } from "../../../lib/auth";
import { teacherOwnsCourse } from "../../../lib/authz";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const { id } = await params;
  if (!(await teacherOwnsCourse(id, user))) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  await db.course.deleteMany({ where: { id } }); // idempotente: no falla si ya no existe
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
  for (const k of ["name", "color", "next", "format", "summary"]) {
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
  const course = await db.course.update({ where: { id }, data });
  return NextResponse.json({ ok: true, course });
}
