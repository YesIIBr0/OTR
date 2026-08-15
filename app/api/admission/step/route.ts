// OTR · /api/admission/step — marcar un paso de la admisión como completado [ADM].
//   PATCH { step: 1|2|3|4, bookingId? } — SOLO el STUDENT dueño de la admisión.
//
// La regla que hace que esto sea un flujo y no cuatro casillas sueltas: un paso NO se puede
// completar si el anterior sigue pendiente. Se comprueba en SERVIDOR contra los timestamps
// guardados — el rail bloqueado del mockup es comodidad visual, no seguridad.
//
// Paso 2 (llamada de descubrimiento): no se cree la palabra del cliente. El servidor exige
// que EXISTA una ConsultationBooking viva del alumno y guarda a cuál corresponde
// (discoveryBookingId). Referencia, no copia: el slot y el estado siguen viviendo en la
// reserva, y si esa reserva se cancela después el paso sigue marcado (el hecho ocurrió) pero
// el puntero cae a null solo. Paso 4: no se marca sin vídeo DPP registrado.
import { db } from "../../../lib/db";
import { getSessionUser } from "../../../lib/auth";
import { ok, bad, readJson, clean } from "../../../lib/api";
import { requireRole } from "../../../lib/authz";
import { rateLimit } from "../../../lib/rate-limit";
import { logActivitySafe } from "../../../lib/activity";
import {
  ADMISSION_STEPS,
  TOTAL_STEPS,
  admissionPayload,
  doneCount,
  previousStepsDone,
  stepCompletedAt,
  type AdmissionRow,
} from "../input";

export async function PATCH(req: Request) {
  const user = await getSessionUser();
  if (!user) return bad("No autenticado", 401);
  // Coach y admin son SOLO LECTURA sobre la admisión: marcar un paso por el alumno vaciaría
  // de sentido el registro (el paso 1 lleva un consentimiento firmado detrás).
  if (!requireRole(user, "STUDENT")) return bad("Solo el estudiante puede avanzar su admisión", 403);

  const rl = rateLimit(`admission-step:${user.id}`, 30, 10 * 60 * 1000);
  if (!rl.ok) return bad(`Demasiadas solicitudes. Intenta en ${rl.retryAfter}s.`, 429);

  const body = await readJson<{ step?: number | string; bookingId?: string }>(req);
  const n = Number.parseInt(String(body.step ?? ""), 10);
  const step = ADMISSION_STEPS.find((s) => s.n === n);
  if (!step) return bad("Paso inválido", 400);

  const admission = (await db.admission.findUnique({ where: { studentId: user.id } })) as AdmissionRow | null;
  if (!admission) return bad("Primero llena el formulario de admisión", 400);

  // Idempotente: volver a marcar lo ya hecho responde 200 sin reescribir el timestamp (eso
  // falsificaría cuándo ocurrió).
  if (stepCompletedAt(admission, n)) {
    const consents = await db.admissionConsent.findMany({ where: { admissionId: admission.id }, orderBy: { createdAt: "asc" } });
    return ok({ admission: admissionPayload(admission, consents), already: true });
  }

  // [ORDEN] El corazón del flujo.
  if (!previousStepsDone(admission, n)) return bad(`Completa el paso ${n - 1} antes del paso ${n}`, 400);

  if (n === 1) {
    // El paso 1 ES el formulario: no hay forma honesta de "marcarlo" sin los datos ni el
    // consentimiento detrás.
    return bad("El paso 1 se completa guardando el formulario de admisión", 400);
  }

  const patch: Record<string, unknown> = { [step.field]: new Date() };

  if (n === 2) {
    // Reserva del alumno: por sesión (userId) o por su correo, que es como la crea el flujo
    // público /consulta. CANCELLED no cuenta.
    const where = {
      status: { not: "CANCELLED" },
      OR: [{ userId: user.id }, { email: user.email }],
      ...(clean(body.bookingId, 64) ? { id: clean(body.bookingId, 64) } : {}),
    };
    const booking = await db.consultationBooking.findFirst({ where, orderBy: { slotAt: "desc" } });
    // El OR de arriba también es el guard de propiedad: un bookingId ajeno no encaja con
    // userId/email y cae aquí igual que si no existiera.
    if (!booking) return bad("Agenda tu llamada de descubrimiento antes de completar este paso", 400);
    patch.discoveryBookingId = booking.id;
  }

  if (n === 4 && !admission.dppVideoUrl) {
    return bad("Sube tu vídeo de 30 segundos antes de completar este paso", 400);
  }

  // ¿Este paso cierra la admisión? Se calcula ANTES de escribir, con los 4 timestamps.
  const closes = doneCount(admission) + 1 === TOTAL_STEPS;
  if (closes) {
    patch.status = "COMPLETED";
    patch.completedAt = new Date();
  }

  const updated = (await db.admission.update({ where: { id: admission.id }, data: patch })) as AdmissionRow;

  await logActivitySafe({
    userId: user.id,
    type: "admission_step",
    source: "admission",
    refId: admission.id,
    title: `Completó el paso ${n} de la admisión: ${step.label}`,
    detail: closes ? "Admisión completada" : `Paso ${n} de ${TOTAL_STEPS}`,
  });

  const consents = await db.admissionConsent.findMany({ where: { admissionId: admission.id }, orderBy: { createdAt: "asc" } });
  return ok({ admission: admissionPayload(updated, consents), already: false });
}
