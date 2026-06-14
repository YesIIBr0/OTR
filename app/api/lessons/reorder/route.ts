import { NextResponse } from "next/server";
import { db } from "../../../lib/db";
import { getSessionUser } from "../../../lib/auth";
import { teacherOwnsModule } from "../../../lib/authz";

// [P1] Reordenar las lecciones de un módulo. Body: { moduleId, orderedIds: string[] }.
// Escribe `position` según el orden recibido, en una transacción. Solo reordena
// lecciones que pertenecen al módulo (no se pueden mover lecciones ajenas).
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const moduleId = typeof body.moduleId === "string" ? body.moduleId : "";
  const orderedIds: string[] = Array.isArray(body.orderedIds)
    ? body.orderedIds.filter((x: unknown) => typeof x === "string")
    : [];
  if (!moduleId || !orderedIds.length) return NextResponse.json({ error: "Faltan campos" }, { status: 400 });
  if (!(await teacherOwnsModule(moduleId, user))) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  const owned = await db.lesson.findMany({ where: { moduleId, id: { in: orderedIds } }, select: { id: true } });
  const ownedSet = new Set(owned.map((l) => l.id));
  await db.$transaction(
    orderedIds
      .filter((id) => ownedSet.has(id))
      .map((id, i) => db.lesson.update({ where: { id }, data: { position: i } })),
  );
  return NextResponse.json({ ok: true });
}
