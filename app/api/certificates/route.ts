// OTR Hub · Certificados — emisión al completar un programa al 100%.
// GET: { ok, certificates:[...] } del usuario actual.
// POST: emite certificado del estudiante actual para courseId si su enrollment
//       existe y progress>=100; upsert por la unique (userId_courseId).
import { db } from "../../lib/db";
import { getSessionUser } from "../../lib/auth";
import { ok, bad, readJson, clean } from "../../lib/api";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return bad("No autenticado", 401);

  const certificates = await db.certificate.findMany({
    where: { userId: user.id },
    orderBy: { issuedAt: "desc" },
  });

  return ok({ certificates });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return bad("No autenticado", 401);

  const body = await readJson<{ courseId?: unknown }>(req);
  const courseId = clean(body.courseId, 80);
  if (!courseId) return bad("Falta el curso");

  const enrollment = await db.enrollment.findUnique({
    where: { userId_courseId: { userId: user.id, courseId } },
  });
  if (!enrollment) return bad("Programa no completado", 400);

  const course = await db.course.findUnique({
    where: { id: courseId },
    select: { name: true },
  });
  if (!course) return bad("Curso no encontrado", 404);

  // No confiar en enrollment.progress (mutable). Recalcular el progreso REAL:
  // total = lecciones del curso (vía módulos); done = LessonProgress done del usuario
  // para esas lecciones. Solo se emite certificado al 100% (done/total >= 1).
  // [BUG-CERT] El denominador debe usar el MISMO criterio que courseProgress en
  // queries.ts:541 (filtra lo oculto por el profesor: lesson.hidden o module.hidden no
  // cuenta para el progreso del alumno) — si no, el botón "Reclamar" podía mostrarse a
  // 100% en la UI (que ya excluye ocultas) y esta API rechazar (contaba de más).
  const lessons = await db.lesson.findMany({
    where: { module: { courseId } },
    select: { id: true, hidden: true, module: { select: { hidden: true } } },
  });
  const visibleLessonIds = lessons.filter((l) => !l.hidden && !l.module?.hidden).map((l) => l.id);
  const total = visibleLessonIds.length;
  if (total === 0) return bad("Programa no completado", 400);

  const done = await db.lessonProgress.count({
    where: {
      userId: user.id,
      done: true,
      lessonId: { in: visibleLessonIds },
    },
  });
  if (done / total < 1) return bad("Programa no completado", 400);

  const title = "OTR Certified · " + course.name;

  const certificate = await db.certificate.upsert({
    where: { userId_courseId: { userId: user.id, courseId } },
    update: { title },
    create: { userId: user.id, courseId, title },
  });

  return ok({ certificate });
}
