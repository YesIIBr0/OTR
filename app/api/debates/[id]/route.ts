// OTR Debate Hub · /api/debates/[id]
//   GET — detalle de una ronda del DUEÑO: DebateRecord + RatingUpdate +
//         ballots con sus RubricScore. IDOR: solo el propietario la ve.
import { db } from "../../../lib/db";
import { getSessionUser } from "../../../lib/auth";
import { ok, bad } from "../../../lib/api";

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
