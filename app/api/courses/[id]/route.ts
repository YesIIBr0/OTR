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
  const data: Record<string, string> = {};
  for (const k of ["name", "color", "next"]) {
    if (typeof body[k] === "string") data[k] = body[k].slice(0, 200);
  }
  const course = await db.course.update({ where: { id }, data });
  return NextResponse.json({ ok: true, course });
}
