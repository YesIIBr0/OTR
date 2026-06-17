// OTR Hub · Reseñas de coaches/programas.
// POST: el estudiante (inscrito) deja/actualiza su reseña de un programa (upsert por courseId+studentId).
// GET: lista reseñas por ?teacherId= o ?courseId=.
import { db } from "../../lib/db";
import { getSessionUser } from "../../lib/auth";
import { ok, bad, readJson, clean } from "../../lib/api";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return bad("No autenticado", 401);

  const body = await readJson<{ courseId?: string; rating?: number; body?: string }>(req);
  const courseId = clean(body.courseId, 64);
  if (!courseId) return bad("Falta courseId");

  // El programa debe existir y tener un coach asignado (teacherId no nulo).
  const course = await db.course.findUnique({
    where: { id: courseId },
    select: { id: true, teacherId: true },
  });
  if (!course) return bad("Programa no encontrado", 404);
  if (!course.teacherId) return bad("Este programa no tiene coach asignado", 400);

  // VERIFIED-BOOKING-ONLY (PRD §7.4): la reseña exige una sesión COMPLETADA con
  // este coach — no basta estar inscrito en un curso (eso permitía ratings sin
  // experiencia 1:1 real y no está en el PDF).
  const completed = await db.booking.findFirst({
    where: { studentId: user.id, coachId: course.teacherId, status: "COMPLETED" },
    select: { id: true },
  });
  if (!completed) return bad("Completa una sesión con este coach para poder reseñarlo", 403);

  // rating: entero acotado 1..5.
  const rating = Math.min(5, Math.max(1, Math.round(Number(body.rating) || 0)));
  const text = clean(body.body, 1000);

  const review = await db.review.upsert({
    where: { courseId_studentId: { courseId, studentId: user.id } },
    update: { rating, body: text, teacherId: course.teacherId },
    create: {
      courseId,
      studentId: user.id,
      teacherId: course.teacherId,
      rating,
      body: text,
    },
  });

  // [auditoría/stale-stored §7.4] Recalcula el agregado CANÓNICO del coach desde las Review
  // reales y lo persiste en CoachProfile. ratingAvg/reviewCount son la fuente que el marketplace
  // MUESTRA y ORDENA; antes solo los fijaba el seed y nunca se sincronizaban con las reseñas → un
  // coach con reseñas reales seguía mostrando la cifra sembrada. updateMany = no-op si no hay perfil.
  const agg = await db.review.aggregate({
    where: { teacherId: course.teacherId },
    _avg: { rating: true },
    _count: { _all: true },
  });
  await db.coachProfile.updateMany({
    where: { userId: course.teacherId },
    data: {
      ratingAvg: Math.round((agg._avg.rating || 0) * 10) / 10,
      reviewCount: agg._count._all || 0,
    },
  });

  return ok({ review });
}

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return bad("No autenticado", 401);

  const { searchParams } = new URL(req.url);
  const teacherId = clean(searchParams.get("teacherId"), 64);
  const courseId = clean(searchParams.get("courseId"), 64);

  const where: Record<string, unknown> = {};
  if (teacherId) where.teacherId = teacherId;
  if (courseId) where.courseId = courseId;

  const reviews = await db.review.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      student: { select: { name: true } },
    },
  });

  return ok({ reviews });
}
