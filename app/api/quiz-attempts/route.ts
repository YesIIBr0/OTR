import { getSessionUser } from "../../lib/auth";
import { bad } from "../../lib/api";

// [H1/m11] DEPRECADO: este endpoint confiaba en score/total/lessonTitle del cliente
// (farmeo de XP). La calificación real ocurre en /api/quizzes/[id]/attempt (servidor).
// No escribe nada; siempre 410 Gone.
export async function POST() {
  const user = await getSessionUser();
  if (!user) return bad("No autenticado", 401);
  return bad("Endpoint obsoleto: usa /api/quizzes/[id]/attempt", 410);
}
