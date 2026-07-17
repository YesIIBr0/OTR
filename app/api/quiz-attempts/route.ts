import { getSessionUser } from "../../lib/auth";
import { bad } from "../../lib/api";
import { rateLimit } from "../../lib/rate-limit";

// [H1/m11] DEPRECADO: este endpoint confiaba en score/total/lessonTitle del cliente
// (farmeo de XP). La calificación real ocurre en /api/quizzes/[id]/attempt (servidor).
// No escribe nada; siempre 410 Gone.
export async function POST() {
  const user = await getSessionUser();
  if (!user) return bad("No autenticado", 401);

  // [F1.4] Anti-flood: aunque siempre responda 410, acota el martilleo autenticado a 30 / 10 min.
  const rl = rateLimit(`quiz-attempt:${user.id}`, 30, 10 * 60 * 1000);
  if (!rl.ok) return bad(`Demasiadas solicitudes. Intenta en ${rl.retryAfter}s.`, 429);

  return bad("Endpoint obsoleto: usa /api/quizzes/[id]/attempt", 410);
}
