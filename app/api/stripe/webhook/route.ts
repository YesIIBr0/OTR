import { NextResponse } from "next/server";
import { db } from "../../../lib/db";
import { enrollOnce } from "../../../lib/enroll";

// Webhook de Stripe: fuente de verdad para otorgar acceso pagado.
// El redirect success_url NO basta (es falsificable); el acceso se concede aquí,
// tras verificar la firma del evento checkout.session.completed.
//
// [R1/F7-prep] Robustez que el gap de F5 dejó fijado y ahora se cierra:
//  · DEDUPE por event.id: Stripe REINTENTA webhooks. Cada evento se registra en el ledger
//    StripeEvent (PK = event.id) ANTES de aplicar efectos; un replay choca con la PK y
//    responde 200 sin repetir efectos. Si el ledger falla por otra causa (DB caída) se
//    responde 500 a propósito: Stripe reintenta más tarde y no se pierde el pago.
//  · ATOMICIDAD: Enrollment + studentsCount van en UNA $transaction (misma forma que
//    /api/checkout) — antes eran dos awaits sueltos y un fallo intermedio desalineaba el contador.
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

  // Dedupe: registra el evento en el ledger ANTES de aplicar efectos. P2002 (PK duplicada)
  // = replay de Stripe → 200 sin efectos. Cualquier otro error = problema real de DB → 500
  // para que Stripe REINTENTE (responder 200 aquí perdería el pago para siempre).
  try {
    await db.stripeEvent.create({ data: { id: event.id, type: event.type } });
  } catch (err) {
    if ((err as { code?: string })?.code === "P2002") {
      return NextResponse.json({ received: true, duplicate: true });
    }
    return NextResponse.json({ error: "No se pudo registrar el evento" }, { status: 500 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const courseId = session.metadata?.courseId;
    const userId = session.metadata?.userId;
    if (courseId && userId) {
      // [GOAL G2] Idempotente y atómico vía enrollOnce: el dedupe por event.id cubre el
      // REPLAY del mismo evento, pero dos eventos DISTINTOS del mismo curso/usuario casi
      // simultáneos también colisionarían — aquí la unicidad de la DB decide sin 500.
      await enrollOnce(userId, courseId, "PAID");
    }
  }

  return NextResponse.json({ received: true });
}
