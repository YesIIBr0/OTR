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
import { fmtPlanSinceLabel } from "../../lib/i18n";

/* [GOAL E5 · i18n] La etiqueta de antigüedad sale del formatter compartido con el idioma de la
   REQUEST, ya no de una tabla de meses en español fija. Con la tabla vieja, un alumno con la UI
   en inglés que cambiaba de plan veía la pantalla de Membresía pasar de "Since August 2026"
   (payload de queries.ts, migrado en F2) a "agosto 2026" en cuanto respondía este endpoint.
   Idioma: cookie otr_lang, misma fuente que /api/app-data. Formatter: fmtPlanSinceLabel, el
   mismo que usa queries.ts ⇒ el prefijo "Desde"/"Since" deja de perderse en el camino. */

/** Idioma de la request desde la cookie otr_lang; cualquier otra cosa → 'es' (default del
 *  producto). Se lee de la cabecera Cookie del propio Request y no con cookies() de
 *  next/headers a propósito: es el MISMO dato, pero así la ruta sigue siendo una función
 *  pura de su Request y se puede probar sin montar un request scope de Next. */
function reqLang(req?: Request): "es" | "en" {
  const raw = req?.headers.get("cookie") || "";
  return /(?:^|;\s*)otr_lang=en(?:\s*;|$)/.test(raw) ? "en" : "es";
}

/** "Desde junio 2026" / "Since June 2026" — o null si no hay antigüedad que mostrar. */
function sinceLabelOf(d: Date | null | undefined, lang: string): string | null {
  if (!d) return null;
  return fmtPlanSinceLabel(d, lang) || null;
}

export async function GET(req?: Request) {
  // getSessionUser lee el User fresco de la base en cada request.
  const user = await getSessionUser();
  if (!user) return bad("No autenticado", 401);
  return ok({ tier: user.membership, sinceLabel: sinceLabelOf(user.membershipSince, reqLang(req)) });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return bad("No autenticado", 401);

  const data = await readJson<{ tier?: string }>(req);
  const tier = clean(data.tier, 20).toLowerCase();
  const lang = reqLang(req);

  if (tier === "elite") return bad("Elite llega próximamente", 400);
  if (tier !== "free" && tier !== "pro") return bad("Plan inválido", 400);

  // Idempotente: ya está en ese plan → no re-escribe ni vuelve a loguear.
  if (user.membership === tier) {
    return ok({ tier, sinceLabel: sinceLabelOf(user.membershipSince, lang) });
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

  return ok({ tier: updated.membership, sinceLabel: sinceLabelOf(updated.membershipSince, lang) });
}
