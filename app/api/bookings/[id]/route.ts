// Marketplace (PRD §7) · PATCH /api/bookings/[id] — transiciones de una reserva.
// body { action: "approve" | "complete" | "cancel" } — validadas por rol/propiedad:
//
//  approve  — el PADRE designado (consentBy) aprueba: PENDING → CONFIRMED.
//  complete — el COACH de la sesión la marca COMPLETED: CONFIRMED → COMPLETED,
//             EscrowTxn HELD → RELEASED (payout simulado = monto − take rate 18%),
//             upsert CoachSession.completedAt y logActivity "session_done".
//  cancel   — alumno dueño, padre designado, coach o ADMIN: PENDING/CONFIRMED →
//             CANCELLED, EscrowTxn HELD → REFUNDED (reembolso simulado).
//
// ESCROW SIMULADO (sin Stripe real en esta fase): RELEASED/REFUNDED solo cambian
// el estado del ledger; al integrar Stripe se mapearán a transfer/refund reales.
import { db } from "../../../lib/db";
import { getSessionUser } from "../../../lib/auth";
import { ok, bad, readJson, clean } from "../../../lib/api";
import { logActivitySafe } from "../../../lib/activity";
import { dateLabel, timeLabel } from "../../../lib/consultations";

const ACTIONS = new Set(["approve", "complete", "cancel"]);

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return bad("No autenticado", 401);

  const { id } = await params;
  const body = await readJson<{ action?: string; status?: string }>(req);
  // Alias: el UI también puede mandar { status } — se mapea a la acción canónica.
  const statusAlias: Record<string, string> =
    { CONFIRMED: "approve", COMPLETED: "complete", CANCELLED: "cancel" };
  const action =
    clean(body.action, 20).toLowerCase() ||
    statusAlias[clean(body.status, 20).toUpperCase()] || "";
  if (!ACTIONS.has(action)) return bad("Acción inválida (approve | complete | cancel)", 400);

  const booking = await db.booking.findUnique({ where: { id }, include: { escrow: true } });
  if (!booking) return bad("Reserva no encontrada", 404);

  const isAdmin = user.role === "ADMIN";
  const isCoachOwner = booking.coachId === user.id && (user.role === "COACH" || user.role === "TEACHER");
  const isStudentOwner = booking.studentId === user.id;
  const isConsentParent = booking.consentBy === user.id && user.role === "PARENT";

  // --- approve: el padre designado da el consentimiento (SAFETY GATE de menores) ---
  if (action === "approve") {
    if (!isAdmin && !isConsentParent) return bad("Solo el padre/madre designado puede aprobar esta reserva", 403);
    if (booking.status !== "PENDING") return bad("Esta reserva no está pendiente de aprobación", 409);

    // Al confirmar (PRD §7.3 paso 6) se asigna la sala on-platform
    // '/aula?room=<id>' si aún no tiene una. La videollamada real
    // (Cloudflare/Daily) se cabla luego; por ahora la sala es una vista interna.
    const updated = await db.booking.update({
      where: { id },
      data: { status: "CONFIRMED", ...(booking.videoUrl ? {} : { videoUrl: `/aula?room=${id}` }) },
    });
    await logActivitySafe({
      userId: booking.studentId,
      type: "booking_confirmed",
      source: "marketplace",
      refId: id,
      title: "Sesión de coaching aprobada por tu tutor",
      detail: `${dateLabel(booking.slotAt)} · ${timeLabel(booking.slotAt)}`,
    });
    return ok({ booking: { id: updated.id, status: updated.status } });
  }

  // --- complete: el coach cierra la sesión → libera fondos del escrow ---
  if (action === "complete") {
    if (!isAdmin && !isCoachOwner) return bad("Solo el coach de la sesión puede completarla", 403);
    if (booking.status !== "CONFIRMED") return bad("Solo se puede completar una reserva confirmada", 409);

    const now = new Date();
    await db.$transaction([
      db.booking.update({ where: { id }, data: { status: "COMPLETED" } }),
      db.escrowTxn.updateMany({
        where: { bookingId: id, status: "HELD" },
        data: { status: "RELEASED", releasedAt: now },
      }),
      db.coachSession.upsert({
        where: { bookingId: id },
        update: { completedAt: now },
        create: { bookingId: id, completedAt: now },
      }),
      // XP real al total/nivel del alumno (S4 §6.2): completar acredita 25 XP.
      // Idempotente: complete solo corre una vez (CONFIRMED→COMPLETED, validado arriba).
      db.user.update({ where: { id: booking.studentId }, data: { xp: { increment: 25 } } }),
    ]);

    const coach = await db.user.findUnique({ where: { id: booking.coachId }, select: { name: true } });
    await logActivitySafe({
      userId: booking.studentId,
      type: "session_done",
      source: "marketplace",
      refId: id,
      title: `Completó sesión de coaching con ${coach?.name ?? "su coach"}`,
      detail: `${dateLabel(booking.slotAt)} · ${timeLabel(booking.slotAt)}`,
      xp: 25,
    });

    // Payout simulado al coach: monto retenido menos la comisión (take rate).
    const amount = booking.escrow?.amountCents ?? 0;
    const takeRatePct = booking.escrow?.takeRatePct ?? 18;
    const payoutCents = Math.round((amount * (100 - takeRatePct)) / 100);
    return ok({
      booking: { id, status: "COMPLETED" },
      escrow: { status: "RELEASED", amountCents: amount, takeRatePct, payoutCents },
    });
  }

  // --- cancel: dueños de la reserva (alumno, padre designado, coach) o ADMIN ---
  if (!isAdmin && !isStudentOwner && !isCoachOwner && !isConsentParent) {
    return bad("No autorizado para cancelar esta reserva", 403);
  }
  if (booking.status === "COMPLETED") return bad("Una sesión completada ya no se puede cancelar", 409);
  if (booking.status === "CANCELLED") return bad("Esta reserva ya está cancelada", 409);

  await db.$transaction([
    db.booking.update({ where: { id }, data: { status: "CANCELLED" } }),
    db.escrowTxn.updateMany({
      where: { bookingId: id, status: "HELD" },
      data: { status: "REFUNDED" },
    }),
  ]);

  await logActivitySafe({
    userId: booking.studentId,
    type: "booking_cancelled",
    source: "marketplace",
    refId: id,
    title: "Sesión de coaching cancelada",
    detail: `${dateLabel(booking.slotAt)} · ${timeLabel(booking.slotAt)} · fondos reembolsados`,
  });

  return ok({
    booking: { id, status: "CANCELLED" },
    escrow: booking.escrow ? { status: booking.escrow.status === "HELD" ? "REFUNDED" : booking.escrow.status } : null,
  });
}
