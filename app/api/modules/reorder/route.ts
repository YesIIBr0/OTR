import { NextResponse } from "next/server";
import { db } from "../../../lib/db";
import { getSessionUser } from "../../../lib/auth";
import { teacherOwnsCourse } from "../../../lib/authz";

// [P1] Reordenar los módulos de un curso. Body: { courseId, orderedIds: string[] }.
// Escribe `position` según el orden recibido, en una transacción. Solo reordena
// módulos que pertenecen al curso (no se pueden mover módulos ajenos).
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const courseId = typeof body.courseId === "string" ? body.courseId : "";
  const orderedIds: string[] = Array.isArray(body.orderedIds)
    ? body.orderedIds.filter((x: unknown) => typeof x === "string")
    : [];
  if (!courseId || !orderedIds.length) return NextResponse.json({ error: "Faltan campos" }, { status: 400 });
  if (!(await teacherOwnsCourse(courseId, user))) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  const owned = await db.module.findMany({ where: { courseId, id: { in: orderedIds } }, select: { id: true } });
  const ownedSet = new Set(owned.map((m) => m.id));
  await db.$transaction(
    orderedIds
      .filter((id) => ownedSet.has(id))
      .map((id, i) => db.module.update({ where: { id }, data: { position: i } })),
  );
  return NextResponse.json({ ok: true });
}
