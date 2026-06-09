import { NextResponse } from "next/server";
import { db } from "../../lib/db";
import { getSessionUser } from "../../lib/auth";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (user.role !== "TEACHER" && user.role !== "ADMIN")
    return NextResponse.json({ error: "Solo profesores pueden crear cursos" }, { status: 403 });
  const { name, code, color, next } = await req.json();
  if (!name || !code) return NextResponse.json({ error: "Nombre y código requeridos" }, { status: 400 });
  const exists = await db.course.findUnique({ where: { code } });
  if (exists) return NextResponse.json({ error: "Ese código ya existe" }, { status: 409 });
  const count = await db.course.count();
  const course = await db.course.create({
    data: {
      name, code, color: color || "#2E8BD0", next: next || "Por definir",
      coachName: user.name, teacherId: user.id, position: count,
      lessonsCount: 0, studentsCount: 0,
    },
  });
  return NextResponse.json({ ok: true, course });
}
