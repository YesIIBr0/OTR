import { NextResponse } from "next/server";
import { db } from "../../../lib/db";
import { getSessionUser } from "../../../lib/auth";
import { teacherOwnsModule } from "../../../lib/authz";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const { id } = await params;
  if (!(await teacherOwnsModule(id, user))) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  await db.module.deleteMany({ where: { id } });
  return NextResponse.json({ ok: true });
}
