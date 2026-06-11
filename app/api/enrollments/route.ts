import { NextResponse } from "next/server";
import { db } from "../../lib/db";
import { getSessionUser } from "../../lib/auth";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const { courseId } = await req.json();
  if (!courseId) return NextResponse.json({ error: "Falta el curso" }, { status: 400 });
  // El curso debe existir y solo se permite inscripción directa si es gratis.
  // El acceso a programas de pago SOLO puede crearse desde el webhook de Stripe.
  const course = await db.course.findUnique({ where: { id: courseId } });
  if (!course) return NextResponse.json({ error: "Curso no encontrado" }, { status: 404 });
  if (course.priceCents > 0) return NextResponse.json({ error: "Este programa requiere pago" }, { status: 402 });
  const existing = await db.enrollment.findUnique({ where: { userId_courseId: { userId: user.id, courseId } } });
  if (existing) return NextResponse.json({ ok: true, already: true });
  const enrollment = await db.enrollment.create({
    data: { userId: user.id, courseId, status: "ACTIVE", source: "FREE", lastAccess: "ahora" },
  });
  await db.course.update({ where: { id: courseId }, data: { studentsCount: { increment: 1 } } });
  return NextResponse.json({ ok: true, enrollment });
}
