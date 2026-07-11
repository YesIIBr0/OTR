// OTR Debate Hub · /api/debates/[id]
//   GET   — detalle de una ronda del DUEÑO: DebateRecord + RatingUpdate +
//           ballots con sus RubricScore. IDOR: solo el propietario la ve.
//   PATCH — [REQ-1] el COACH aprueba o rechaza una solicitud (auto-reporte del alumno):
//           aprobar = adjudicar la ronda existente (mueve el rating Glicko-2 W/L del
//           alumno + crea su RatingUpdate); rechazar = marcar rejectedAt + motivo.
import { db } from "../../../lib/db";
import { getSessionUser } from "../../../lib/auth";
import { ok, bad, readJson, clean } from "../../../lib/api";
import { logActivitySafe } from "../../../lib/activity";
import { updateRating, tierFor } from "../../../lib/glicko2";
import { sendMail, emailShell } from "../../../lib/mail";
import { esc } from "../../../lib/esc";

// RD por defecto del oponente cuando no conocemos su rating real.
const DEFAULT_OPP_RD = 350;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return bad("No autenticado", 401);

  const { id } = await params;

  const record = await db.debateRecord.findUnique({
    where: { id },
    include: {
      rating: true,
      ballots: {
        include: { scores: true },
      },
    },
  });

  // No revelar existencia ajena: dueño faltante o distinto → 404.
  if (!record || record.userId !== user.id) return bad("Ronda no encontrada", 404);

  const debate = {
    id: record.id,
    format: record.format,
    side: record.side,
    opponent: record.opponent,
    partner: record.partner,
    result: record.result,
    source: record.source,
    eventName: record.eventName,
    roundLabel: record.roundLabel,
    recordedAt: record.recordedAt,
    rating: record.rating
      ? {
          ratingBefore: Math.round(record.rating.ratingBefore),
          ratingAfter: Math.round(record.rating.ratingAfter),
          rdAfter: Math.round(record.rating.rdAfter),
          volAfter: record.rating.volAfter,
          tierAfter: record.rating.tierAfter,
          delta: Math.round(record.rating.ratingAfter - record.rating.ratingBefore),
        }
      : null,
    ballots: record.ballots.map((b) => ({
      id: b.id,
      judge: b.judge,
      comments: b.comments,
      recordingUrl: b.recordingUrl,
      scores: b.scores.map((s) => ({ criterion: s.criterion, score: s.score, flagged: s.flagged })),
    })),
  };

  return ok({ debate });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return bad("No autenticado", 401);
  if (user.role !== "TEACHER" && user.role !== "ADMIN") return bad("Solo un coach puede revisar solicitudes", 403);

  const { id } = await params;
  const body = await readJson<{ action?: string; reason?: string }>(req);
  const action = clean(body.action, 12).toLowerCase();
  if (action !== "approve" && action !== "reject") return bad("action inválida (approve | reject)");

  const record = await db.debateRecord.findUnique({ where: { id } });
  if (!record) return bad("Solicitud no encontrada", 404);
  if (record.adjudicated || record.rejectedAt) return bad("Esta solicitud ya fue resuelta", 409);

  const student = await db.user.findUnique({ where: { id: record.userId } });
  if (!student || student.role !== "STUDENT") return bad("La solicitud no pertenece a un alumno", 400);

  // Vínculo de coaching (T&S §7.4): ADMIN a cualquiera; TEACHER solo a sus alumnos
  // (con reserva con él o inscritos en su curso). Mismo criterio que la adjudicación.
  if (user.role === "TEACHER") {
    const booked = await db.booking.count({ where: { coachId: user.id, studentId: student.id } });
    const enrolled = booked > 0 ? 1 : await db.enrollment.count({ where: { userId: student.id, course: { teacher: { email: user.email } } } });
    if (booked === 0 && enrolled === 0) return bad("Solo puedes revisar solicitudes de tus alumnos", 403);
  }

  // --- RECHAZAR: queda en el historial con su motivo (auditoría), sin tocar el rating. ---
  if (action === "reject") {
    const reason = clean(body.reason, 280) || null;
    // Guard condicional: si otro coach la resolvió entre el check de arriba y aquí, no pisar.
    const claimed = await db.debateRecord.updateMany({
      where: { id, adjudicated: false, rejectedAt: null },
      data: { rejectedAt: new Date(), rejectionReason: reason, adjudicatedBy: user.id },
    });
    if (claimed.count === 0) return bad("Esta solicitud ya fue resuelta", 409);
    await logActivitySafe({
      userId: student.id, type: "debate_rejected",
      title: "Solicitud de debate rechazada",
      detail: reason || "Sin motivo indicado", source: "debate", refId: id,
      meta: { reviewedBy: user.id },
    });

    // [TAREA-D] Email al alumno con el motivo, fuera de la tx, best-effort (sendMail nunca lanza).
    if (student.email) {
      const emailBody = `<p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#44443D;">Tu solicitud de debate${record.opponent ? ` vs ${esc(record.opponent)}` : ""} fue rechazada.${reason ? ` Motivo: ${esc(reason)}.` : ""}</p>`;
      await sendMail({
        to: student.email,
        subject: "Tu debate fue rechazado · OTR Academy",
        html: emailShell("Tu debate fue rechazado", emailBody),
      });
    }

    return ok({ status: "rejected" });
  }

  // --- APROBAR = adjudicar: mueve el rating Glicko-2 (W/L) del alumno + crea RatingUpdate. ---
  // Oponente desconocido → anclado al propio rating del alumno (E≈0.5): movimiento modesto
  // y justo, igual que el resto del flujo de adjudicación.
  const score = record.result === "WIN" ? 1 : 0;
  const ratingBefore = student.debateRating;
  const tierBefore = student.debateTier;
  const next = updateRating(
    { rating: student.debateRating, rd: student.debateRd, vol: student.debateVol },
    [{ rating: student.debateRating, rd: DEFAULT_OPP_RD, score }],
  );
  const tierAfter = tierFor(next.rating);
  const promoted = tierAfter !== tierBefore && next.rating > ratingBefore;

  await db.$transaction(async (tx) => {
    // Reclama el registro con guard condicional: si un reject (u otro approve) ganó la
    // carrera tras el check inicial, count=0 → aborta la tx sin mover el rating.
    const claimed = await tx.debateRecord.updateMany({
      where: { id, adjudicated: false, rejectedAt: null },
      data: { adjudicated: true, adjudicatedBy: user.id },
    });
    if (claimed.count === 0) throw new Error("YA_RESUELTA");
    await tx.user.update({ where: { id: student.id }, data: { debateRating: next.rating, debateRd: next.rd, debateVol: next.vol, debateTier: tierAfter } });
    await tx.ratingUpdate.create({ data: { debateId: id, ratingBefore, ratingAfter: next.rating, rdAfter: next.rd, volAfter: next.vol, tierAfter } });
  });

  await logActivitySafe({
    userId: student.id,
    type: record.result === "LOSS" ? "debate_loss" : "debate_win",
    title: `${record.result === "WIN" ? "Ganó" : "Perdió"} ronda ${record.format}${record.opponent ? ` vs ${record.opponent}` : ""}${record.eventName ? ` · ${record.eventName}` : ""}`,
    detail: `Solicitud aprobada por ${user.name || "tu coach"}`,
    source: "debate", refId: id,
    meta: {
      result: record.result, format: record.format, adjudicated: true,
      ratingBefore: Math.round(ratingBefore), ratingAfter: Math.round(next.rating),
      delta: Math.round(next.rating - ratingBefore), tierBefore, tierAfter, promoted, reviewedBy: user.id,
    },
  });

  // [TAREA-D] Email al alumno con el delta de rating, fuera de la tx, best-effort.
  if (student.email) {
    const delta = Math.round(next.rating - ratingBefore);
    const emailBody = `<p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#44443D;">Tu coach aprobó tu ronda de debate${record.opponent ? ` vs ${esc(record.opponent)}` : ""}. Tu rating pasó de <strong>${Math.round(ratingBefore)}</strong> a <strong>${Math.round(next.rating)}</strong> (${delta >= 0 ? "+" : ""}${delta}).</p>`;
    await sendMail({
      to: student.email,
      subject: "Tu debate fue aprobado · OTR Academy",
      html: emailShell("Tu debate fue aprobado", emailBody),
    });
  }

  return ok({ status: "approved", ratingBefore: Math.round(ratingBefore), ratingAfter: Math.round(next.rating), tierAfter, promoted });
}
