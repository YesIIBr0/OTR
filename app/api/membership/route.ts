// Membresía de estudiante (PRD §13) — SUSCRIPCIÓN SIMULADA, sin Stripe en esta fase.
// "Contratar" un plan solo cambia User.membership en la base de datos; cuando se
// cablee la pasarela real, este endpoint pasará a crear/cancelar la suscripción.
// GET  — plan actual del usuario (tier + desde cuándo).
// POST — cambia de plan: { tier: "free" | "pro" }. "elite" se muestra como
//        "Próximamente" y NO es contratable todavía.
import { db } from "../../lib/db";
import { getSessionUser } from "../../lib/auth";
import { ok, bad, readJson, clean } from "../../lib/api";
import { logActivitySafe } from "../../lib/activity";

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/** "junio 2026" — etiqueta legible de membershipSince (o null si no aplica). */
function sinceLabelOf(d: Date | null | undefined): string | null {
  if (!d) return null;
  return `${MESES[d.getMonth()]} ${d.getFullYear()}`;
}

export async function GET() {
  // getSessionUser lee el User fresco de la base en cada request.
  const user = await getSessionUser();
  if (!user) return bad("No autenticado", 401);
  return ok({ tier: user.membership, sinceLabel: sinceLabelOf(user.membershipSince) });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return bad("No autenticado", 401);

  const data = await readJson<{ tier?: string }>(req);
  const tier = clean(data.tier, 20).toLowerCase();

  if (tier === "elite") return bad("Elite llega próximamente", 400);
  if (tier !== "free" && tier !== "pro") return bad("Plan inválido", 400);

  // Idempotente: ya está en ese plan → no re-escribe ni vuelve a loguear.
  if (user.membership === tier) {
    return ok({ tier, sinceLabel: sinceLabelOf(user.membershipSince) });
  }

  // SIMULADO (PRD §13 F1): aquí iría el checkout/cancelación de Stripe.
  // Sube a Pro → arranca el contador de antigüedad; baja a Free → se limpia.
  const membershipSince = tier === "pro" ? new Date() : null;
  const updated = await db.user.update({
    where: { id: user.id },
    data: { membership: tier, membershipSince },
  });

  // Ledger universal: el cambio de plan también es parte de la historia.
  await logActivitySafe({
    userId: user.id,
    type: "membership_changed",
    source: "billing",
    title: tier === "pro" ? "Activó OTR Pro" : "Volvió al plan Free",
    detail: "Suscripción simulada — sin pasarela de pago en esta fase",
    meta: { from: user.membership, to: tier },
  });

  return ok({ tier: updated.membership, sinceLabel: sinceLabelOf(updated.membershipSince) });
}
