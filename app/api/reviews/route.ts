// OTR Hub · Reseñas de coaches/programas.
// POST: el estudiante (inscrito) deja/actualiza su reseña de un programa (upsert por courseId+studentId).
// GET: lista reseñas por ?teacherId= o ?courseId=.
import { db } from "../../lib/db";
import { getSessionUser } from "../../lib/auth";
import { ok, bad, readJson, clean } from "../../lib/api";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return bad("No autenticado", 401);

  const body = await readJson<{ courseId?: string; coachId?: string; rating?: number; body?: string }>(req);
  const courseId = clean(body.courseId, 64);
  const coachId = clean(body.coachId, 64);

  // rating: entero acotado 1..5; cuerpo opcional.
  const rating = Math.min(5, Math.max(1, Math.round(Number(body.rating) || 0)));
  const text = clean(body.body, 1000);

  let teacherId: string;
  let review;

  if (courseId) {
    // --- Reseña de PROGRAMA (curso) -------------------------------------------
    const course = await db.course.findUnique({ where: { id: courseId }, select: { id: true, teacherId: true } });
    if (!course) return bad("Programa no encontrado", 404);
    if (!course.teacherId) return bad("Este programa no tiene coach asignado", 400);
    teacherId = course.teacherId;
    // VERIFIED-BOOKING-ONLY (PRD §7.4): exige una sesión COMPLETADA con este coach.
    const completed = await db.booking.findFirst({ where: { studentId: user.id, coachId: teacherId, status: "COMPLETED" }, select: { id: true } });
    if (!completed) return bad("Completa una sesión con este coach para poder reseñarlo", 403);
    review = await db.review.upsert({
      where: { courseId_studentId: { courseId, studentId: user.id } },
      update: { rating, body: text, teacherId },
      create: { courseId, studentId: user.id, teacherId, rating, body: text },
    });
  } else if (coachId) {
    // --- Reseña de COACH del marketplace (sin curso, courseId=null) -----------
    // [REVIEW-CHAIN §7.4] Permite reseñar a un coach que no imparte ningún curso (la
    // cadena de reseña ya no muere). Mismo gate verified-booking que la reseña de programa.
    teacherId = coachId;
    if (teacherId === user.id) return bad("No puedes reseñarte a ti mismo", 400);
    const completed = await db.booking.findFirst({ where: { studentId: user.id, coachId: teacherId, status: "COMPLETED" }, select: { id: true } });
    if (!completed) return bad("Completa una sesión con este coach para poder reseñarlo", 403);
    // Dedup manual: una reseña de coach tiene courseId=null y los NULL no entran en
    // @@unique([courseId,studentId]) (NULLs son distintos en SQL) → buscamos y actualizamos.
    const existing = await db.review.findFirst({ where: { teacherId, studentId: user.id, courseId: null }, select: { id: true } });
    review = existing
      ? await db.review.update({ where: { id: existing.id }, data: { rating, body: text } })
      : await db.review.create({ data: { courseId: null, studentId: user.id, teacherId, rating, body: text } });
  } else {
    return bad("Falta courseId o coachId");
  }

  // [auditoría/stale-stored §7.4] Recalcula el agregado CANÓNICO del coach desde las Review
  // reales y lo persiste en CoachProfile (fuente que el marketplace MUESTRA y ORDENA).
  // updateMany = no-op si el coach aún no tiene perfil.
  const agg = await db.review.aggregate({ where: { teacherId }, _avg: { rating: true }, _count: { _all: true } });
  await db.coachProfile.updateMany({
    where: { userId: teacherId },
    data: { ratingAvg: Math.round((agg._avg.rating || 0) * 10) / 10, reviewCount: agg._count._all || 0 },
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
