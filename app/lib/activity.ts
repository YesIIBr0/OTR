// OTR · ActivityEvent spine (servidor) — helper central del PRD §4.
// TODA acción significativa del usuario escribe aquí un registro inmutable
// (ledger universal): lecciones completadas, exámenes calificados, entregas
// evaluadas, debates, sesiones de coach, insignias, certificados, etc.
// El timeline del Progress Profile y el dashboard leen de esta tabla.
import { db } from "./db";

export type ActivityType =
  | "lesson_done"
  | "quiz_done"
  | "submission_graded"
  | "debate_win"
  | "debate_loss"
  | "session_done"
  | "badge_earned"
  | "cert_earned"
  | "skill_up"
  | "tournament_result"
  | "booking_made";

// [PUBLIC-PROFILE §8.4] Tipos de hito REALES de aprendizaje que el timeline PÚBLICO muestra.
// Excluye eventos meta (public_profile_on, membership_changed, message_sent…) que no son hitos
// verificados y ensuciaban el perfil público ("Activó su perfil público").
export const MILESTONE_ACTIVITY_TYPES: ActivityType[] = [
  "lesson_done",
  "quiz_done",
  "submission_graded",
  "debate_win",
  "debate_loss",
  "session_done",
  "badge_earned",
  "cert_earned",
  "skill_up",
  "tournament_result",
  "booking_made",
];

export interface LogActivityInput {
  userId: string;
  type: ActivityType | string;
  title: string;
  detail?: string | null;
  xp?: number;
  source?: string;
  refId?: string | null;
  // meta: objeto serializable (skill deltas, rating delta, score…) o string JSON.
  meta?: Record<string, unknown> | string | null;
}

// Escribe un ActivityEvent. Best-effort: nunca debe tumbar la operación que lo
// invoca, así que el llamador puede envolverlo en try/catch o usar logActivitySafe.
export async function logActivity(input: LogActivityInput) {
  const meta =
    input.meta == null
      ? null
      : typeof input.meta === "string"
        ? input.meta
        : JSON.stringify(input.meta);
  return db.activityEvent.create({
    data: {
      userId: input.userId,
      type: String(input.type),
      title: input.title,
      detail: input.detail ?? null,
      xp: Math.max(0, Math.round(Number(input.xp) || 0)),
      source: input.source ?? "",
      refId: input.refId ?? null,
      meta,
    },
  });
}

// Variante que jamás propaga errores: si el ledger falla, la acción principal
// (marcar lección, calificar examen…) ya se persistió y no debe revertirse.
export async function logActivitySafe(input: LogActivityInput) {
  try {
    return await logActivity(input);
  } catch {
    return null;
  }
}
