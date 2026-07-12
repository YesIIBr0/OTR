import { NextResponse } from "next/server";
import { db } from "../../../lib/db";

// Webhook de Stripe: fuente de verdad para otorgar acceso pagado.
// El redirect success_url NO basta (es falsificable); el acceso se concede aquí,
// tras verificar la firma del evento checkout.session.completed.
export async function POST(req: Request) {
  const key = process.env.STRIPE_SECRET_KEY;
  const whSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!key || !whSecret) return NextResponse.json({ error: "Stripe no configurado" }, { status: 503 });

  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe(key);
  const sig = req.headers.get("stripe-signature") || "";
  const raw = await req.text(); // cuerpo crudo, requerido para verificar la firma

  // Tipo real del evento derivado del propio método (evita depender del nombre exacto
  // del tipo exportado por el paquete "stripe", que cambia entre versiones).
  let event: ReturnType<InstanceType<typeof Stripe>["webhooks"]["constructEvent"]>;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, whSecret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "firma inválida";
    return NextResponse.json({ error: `Firma inválida: ${msg}` }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const courseId = session.metadata?.courseId;
    const userId = session.metadata?.userId;
    if (courseId && userId) {
      const existing = await db.enrollment.findUnique({ where: { userId_courseId: { userId, courseId } } });
      if (!existing) {
        await db.enrollment.create({
          data: { userId, courseId, status: "ACTIVE", source: "PAID", lastAccess: "ahora" },
        });
        await db.course.update({ where: { id: courseId }, data: { studentsCount: { increment: 1 } } });
      }
    }
  }

  return NextResponse.json({ received: true });
}
