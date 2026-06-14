// POST /api/quizzes/[id]/attempt — el estudiante envía respuestas; el servidor califica. [id] = quizId.
import { ok, bad, readJson } from "../../../../lib/api";
import { getSessionUser } from "../../../../lib/auth";
import { db } from "../../../../lib/db";
import { logActivitySafe } from "../../../../lib/activity";

type Body = { answers?: Record<string, unknown> };

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return bad("No autenticado", 401);

  const { id } = await params;
  const quiz = await db.quiz.findUnique({
    where: { id },
    include: {
      lesson: { include: { module: { include: { course: true } } } },
      questions: { include: { options: true }, orderBy: { position: "asc" } },
    },
  });
  if (!quiz) return bad("Examen no encontrado", 404);
  if (quiz.questions.length === 0) return bad("El examen no tiene preguntas", 400);

  // [m2] Verifica que el usuario esté INSCRITO en el curso del quiz
  // (quiz→lesson→module→course) antes de calificar.
  const courseId = quiz.lesson?.module?.courseId;
  if (courseId) {
    const enrolled = await db.enrollment.findUnique({
      where: { userId_courseId: { userId: user.id, courseId } },
    });
    if (!enrolled) return bad("No estás inscrito en este curso", 403);
  }

  // [P2] Gating: no se puede rendir el examen si su lección está bloqueada por prerrequisito.
  if (quiz.lesson?.releaseAfterId) {
    const prereqDone = await db.lessonProgress.findUnique({
      where: { userId_lessonId: { userId: user.id, lessonId: quiz.lesson.releaseAfterId } },
      select: { done: true },
    });
    if (!prereqDone?.done) return bad("Completa la lección previa primero", 403);
  }

  const body = await readJson<Body>(req);
  const answers = body.answers && typeof body.answers === "object" ? body.answers : {};

  // Califica en el servidor (la verdad de `correct` nunca sale al cliente estudiante).
  const results: Record<string, { chosen: string | null; correctOptionId: string | null; correct: boolean }> = {};
  let score = 0;
  for (const q of quiz.questions) {
    const correctOpt = q.options.find((o) => o.correct) || null;
    const chosenRaw = answers[q.id];
    const chosen = typeof chosenRaw === "string" ? chosenRaw : null;
    const chosenOpt = chosen ? q.options.find((o) => o.id === chosen) : undefined;
    const correct = Boolean(chosenOpt && chosenOpt.correct);
    if (correct) score++;
    results[q.id] = {
      chosen: chosenOpt ? chosenOpt.id : null,
      correctOptionId: correctOpt ? correctOpt.id : null,
      correct,
    };
  }

  const total = quiz.questions.length;
  const percent = total ? Math.round((score / total) * 100) : 0;
  const passed = percent >= quiz.passScore;
  const lessonTitle = quiz.lesson.title;

  // [P2] Auto-completar: aprobar el examen marca su lección como completada y
  // recalcula el progreso del curso (así se desbloquea la lección siguiente si la usa de prereq).
  if (passed && courseId) {
    await db.lessonProgress.upsert({
      where: { userId_lessonId: { userId: user.id, lessonId: quiz.lessonId } },
      create: { userId: user.id, lessonId: quiz.lessonId, done: true },
      update: { done: true },
    });
    const courseLessons = await db.lesson.findMany({ where: { module: { courseId } }, select: { id: true } });
    const doneCount = await db.lessonProgress.count({ where: { userId: user.id, done: true, lessonId: { in: courseLessons.map((l) => l.id) } } });
    const prog = courseLessons.length ? Math.round((doneCount / courseLessons.length) * 100) : 0;
    await db.enrollment.updateMany({ where: { userId: user.id, courseId }, data: { progress: prog } });
  }

  // --- XP solo-si-mejora: lógica EXACTA de /api/quiz-attempts ---
  const prevBest = await db.quizAttempt.findFirst({
    where: { userId: user.id, lessonTitle },
    orderBy: { score: "desc" },
  });
  const prevPct = prevBest && prevBest.total ? Math.round((prevBest.score / prevBest.total) * 100) : 0;

  await db.quizAttempt.create({
    data: { userId: user.id, userName: user.name, lessonTitle, score, total },
  });

  const pct = total ? Math.round((score / total) * 100) : 0;
  const xpGain = Math.max(0, (pct - prevPct) * 3);
  if (xpGain > 0) {
    const updated = await db.user.update({ where: { id: user.id }, data: { xp: { increment: xpGain } } });
    const levels = await db.level.findMany({ orderBy: { startXp: "desc" } });
    const newLevel = levels.find((l) => updated.xp >= l.startXp);
    if (newLevel && newLevel.name !== updated.level) {
      await db.user.update({ where: { id: user.id }, data: { level: newLevel.name } });
    }
  }

  // Spine ActivityEvent: el examen se calificó en servidor → registro en el ledger.
  await logActivitySafe({
    userId: user.id,
    type: "quiz_done",
    title: `Examen "${lessonTitle}" · ${percent}%`,
    detail: passed ? "Aprobado" : "No aprobado",
    xp: xpGain,
    source: "quiz-attempt",
    refId: quiz.id,
    meta: { score, total, percent, passed },
  });

  return ok({ score, total, percent, passed, results });
}
