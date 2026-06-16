import { NextResponse } from "next/server";
import { db } from "../../lib/db";
import { getSessionUser } from "../../lib/auth";
import { readJson, clean } from "../../lib/api";

// Inscripción / venta de acceso. Si el curso tiene precio Y hay STRIPE_SECRET_KEY,
// crea un Checkout de Stripe. Si no, inscribe directo (gratis/manual).
//
// VENTA POR CURSO APAGADA (PRD-estricto §13.1): el modelo de ingresos del PDF es
// membresía + comisión de marketplace + coaching — NO venta de cursos individuales.
// Los cursos son valor de la membresía: la inscripción es directa.
// Reactivar la venta: COURSE_SALES_ENABLED = true.
const COURSE_SALES_ENABLED = false;

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const body = await readJson<{ courseId?: unknown }>(req);
  const courseId = clean(body.courseId, 80);
  if (!courseId) return NextResponse.json({ error: "Falta el curso" }, { status: 400 });
  const course = await db.course.findUnique({ where: { id: courseId } });
  if (!course) return NextResponse.json({ error: "Curso no encontrado" }, { status: 404 });

  const key = process.env.STRIPE_SECRET_KEY;
  if (COURSE_SALES_ENABLED && course.priceCents > 0) {
    // Programa de pago: SOLO se accede vía Stripe. Sin key no se inscribe gratis.
    if (!key) return NextResponse.json({ error: "Pagos no disponibles temporalmente" }, { status: 503 });
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(key);
    const origin = req.headers.get("origin") || "http://localhost:3000";
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price_data: { currency: "usd", unit_amount: course.priceCents, product_data: { name: course.name } }, quantity: 1 }],
      success_url: `${origin}/?paid=${courseId}`,
      cancel_url: `${origin}/`,
      metadata: { courseId, userId: user.id },
    });
    return NextResponse.json({ ok: true, url: session.url });
  }

  // sin precio (gratis) → inscripción directa
  const existing = await db.enrollment.findUnique({ where: { userId_courseId: { userId: user.id, courseId } } });
  if (!existing) {
    // [DATA-4] Atómico: inscripción + contador en una transacción.
    await db.$transaction([
      db.enrollment.create({ data: { userId: user.id, courseId, status: "ACTIVE", source: "FREE", lastAccess: "ahora" } }),
      db.course.update({ where: { id: courseId }, data: { studentsCount: { increment: 1 } } }),
    ]);
  }
  return NextResponse.json({ ok: true, enrolled: true });
}
