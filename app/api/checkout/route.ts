import { NextResponse } from "next/server";
import { db } from "../../lib/db";
import { getSessionUser } from "../../lib/auth";

// Inscripción / venta de acceso. Si el curso tiene precio Y hay STRIPE_SECRET_KEY,
// crea un Checkout de Stripe. Si no, inscribe directo (gratis/manual).
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const { courseId } = await req.json();
  const course = await db.course.findUnique({ where: { id: courseId } });
  if (!course) return NextResponse.json({ error: "Curso no encontrado" }, { status: 404 });

  const key = process.env.STRIPE_SECRET_KEY;
  if (course.priceCents > 0 && key) {
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

  // sin precio o Stripe no configurado → inscripción directa
  const existing = await db.enrollment.findUnique({ where: { userId_courseId: { userId: user.id, courseId } } });
  if (!existing) {
    await db.enrollment.create({
      data: { userId: user.id, courseId, status: "ACTIVE", source: course.priceCents > 0 ? "PAID" : "FREE", lastAccess: "ahora" },
    });
    await db.course.update({ where: { id: courseId }, data: { studentsCount: { increment: 1 } } });
  }
  return NextResponse.json({ ok: true, enrolled: true });
}
