import { NextResponse } from "next/server";
import { db } from "../../../lib/db";
import { getSessionUser } from "../../../lib/auth";
import { teacherOwnsModule } from "../../../lib/authz";

// [P1] Editar el módulo (título). Allowlist explícita (anti mass-assignment).
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const { id } = await params;
  if (!(await teacherOwnsModule(id, user))) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  if (body.title != null) data.title = String(body.title).slice(0, 120);
  // [I18N-2 §17.3] variante EN del título (puede limpiarse pasando "").
  if (body.titleEn !== undefined) data.titleEn = body.titleEn ? String(body.titleEn).slice(0, 120) : null;
  // Mostrar/ocultar la sección al alumno (ojo) — distinto de locked (gating de progreso).
  if (typeof body.hidden === "boolean") data.hidden = body.hidden;
  if (!Object.keys(data).length) return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 });
  const updated = await db.module.update({ where: { id }, data });
  return NextResponse.json({ ok: true, module: updated });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const { id } = await params;
  if (!(await teacherOwnsModule(id, user))) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  await db.module.deleteMany({ where: { id } });
  return NextResponse.json({ ok: true });
}
