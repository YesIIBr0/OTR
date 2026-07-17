// OTR LMS · Progreso de lecciones — marca/desmarca una lección y recalcula el progreso del curso.
import { db } from "../../lib/db";
import { getSessionUser } from "../../lib/auth";
import { ok, bad, readJson } from "../../lib/api";
import { logActivitySafe } from "../../lib/activity";
import { recalcCourseProgress } from "../../lib/course-progress";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return bad("No autenticado", 401);

  const body = await readJson<{ lessonId?: string; done?: boolean }>(req);
  const lessonId = String(body.lessonId ?? "").trim();
  if (!lessonId) return bad("Falta lessonId");
  const done = Boolean(body.done);

  // [H2/m2] Resuelve el curso de la lección (lesson→module→course) ANTES de escribir,
  // para verificar inscripción y evitar progreso en cursos ajenos.
  const lesson = await db.lesson.findUnique({
    where: { id: lessonId },
    include: { module: { include: { course: true } } },
  });
  const courseId = lesson?.module?.courseId;

  // Verifica que el usuario esté INSCRITO en el curso de esa lección.
  if (courseId) {
    const enrolled = await db.enrollment.findUnique({
      where: { userId_courseId: { userId: user.id, courseId } },
    });
    if (!enrolled) return bad("No estás inscrito en este curso", 403);
  }

  // [P2] Gating: no se puede completar una lección cuyo prerrequisito no esté hecho.
  if (done && lesson?.releaseAfterId) {
    const prereqDone = await db.lessonProgress.findUnique({
      where: { userId_lessonId: { userId: user.id, lessonId: lesson.releaseAfterId } },
      select: { done: true },
    });
    if (!prereqDone?.done) return bad("Completa la lección previa primero", 403);
  }

  // Upsert del progreso por el unique (userId, lessonId).
  const prev = await db.lessonProgress.findUnique({
    where: { userId_lessonId: { userId: user.id, lessonId } },
    select: { done: true },
  });
  await db.lessonProgress.upsert({
    where: { userId_lessonId: { userId: user.id, lessonId } },
    create: { userId: user.id, lessonId, done },
    update: { done },
  });

  // Spine ActivityEvent: registra SOLO la transición a "completada" (no al
  // desmarcar ni al re-marcar algo ya hecho), para no inflar el timeline.
  if (done && !prev?.done) {
    await logActivitySafe({
      userId: user.id,
      type: "lesson_done",
      title: `Completó la lección "${lesson?.title ?? ""}"`,
      source: "lesson-progress",
      refId: lessonId,
    });
  }

  // Recalcula el % del curso (lecciones hechas/totales) y lo persiste en la matrícula.
  // Bloque unificado en app/lib/course-progress.ts (antes duplicado en 3 rutas).
  let progress = 0;
  if (courseId) {
    progress = await recalcCourseProgress(user.id, courseId);
  }

  return ok({ progress });
}
