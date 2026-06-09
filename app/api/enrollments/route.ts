import { NextResponse } from "next/server";
import { db } from "../../lib/db";
import { getSessionUser } from "../../lib/auth";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const { courseId } = await req.json();
  if (!courseId) return NextResponse.json({ error: "Falta el curso" }, { status: 400 });
  const existing = await db.enrollment.findUnique({ where: { userId_courseId: { userId: user.id, courseId } } });
  if (existing) return NextResponse.json({ ok: true, already: true });
  const enrollment = await db.enrollment.create({
    data: { userId: user.id, courseId, status: "ACTIVE", source: "MANUAL", lastAccess: "ahora" },
  });
  await db.course.update({ where: { id: courseId }, data: { studentsCount: { increment: 1 } } });
  return NextResponse.json({ ok: true, enrollment });
}
