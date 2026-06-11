// POST /api/quizzes — el profesor crea/actualiza (upsert por lessonId) el examen de una lección.
import { ok, bad, readJson, clean } from "../../lib/api";
import { getSessionUser } from "../../lib/auth";
import { db } from "../../lib/db";

type InOption = { text?: unknown; correct?: unknown };
type InQuestion = { prompt?: unknown; options?: InOption[] };
type Body = {
  lessonId?: unknown;
  title?: unknown;
  passScore?: unknown;
  questions?: InQuestion[];
};

const isTeacher = (role: string) => role === "TEACHER" || role === "ADMIN";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return bad("No autenticado", 401);
  if (!isTeacher(user.role)) return bad("Solo profesores", 403);

  const body = await readJson<Body>(req);
  const lessonId = clean(body.lessonId, 60);
  if (!lessonId) return bad("Falta lessonId");

  // Ownership: la lección debe pertenecer a un curso de este profesor (ADMIN siempre pasa).
  const lesson = await db.lesson.findUnique({
    where: { id: lessonId },
    include: { module: { include: { course: true } } },
  });
  if (!lesson) return bad("Lección no encontrada", 404);
  if (user.role !== "ADMIN" && lesson.module.course.teacherId !== user.id) {
    return bad("No autorizado", 403);
  }

  const title = clean(body.title, 160) || "Examen de unidad";
  let passScore = Math.round(Number(body.passScore));
  if (!Number.isFinite(passScore)) passScore = 60;
  passScore = Math.min(100, Math.max(0, passScore));

  // Normaliza preguntas/opciones de la entrada.
  const rawQuestions = Array.isArray(body.questions) ? body.questions : [];
  const questions = rawQuestions
    .map((q) => {
      const prompt = clean(q?.prompt, 600);
      const options = (Array.isArray(q?.options) ? q.options : [])
        .map((o) => ({ text: clean(o?.text, 400), correct: Boolean(o?.correct) }))
        .filter((o) => o.text.length > 0);
      return { prompt, options };
    })
    .filter((q) => q.prompt.length > 0 && q.options.length >= 2);

  if (questions.length === 0) {
    return bad("El examen necesita al menos una pregunta con dos opciones");
  }

  // Upsert atómico: borra el quiz viejo (cascade limpia questions/options) y recrea.
  const quizId = await db.$transaction(async (tx) => {
    const existing = await tx.quiz.findUnique({ where: { lessonId } });
    if (existing) {
      await tx.quiz.delete({ where: { id: existing.id } });
    }
    const quiz = await tx.quiz.create({
      data: {
        lessonId,
        title,
        passScore,
        questions: {
          create: questions.map((q, qi) => ({
            prompt: q.prompt,
            position: qi,
            options: {
              create: q.options.map((o, oi) => ({
                text: o.text,
                correct: o.correct,
                position: oi,
              })),
            },
          })),
        },
      },
    });
    // Asegura que la lección quede marcada como tipo quiz.
    if (lesson.type !== "quiz") {
      await tx.lesson.update({ where: { id: lessonId }, data: { type: "quiz" } });
    }
    return quiz.id;
  });

  return ok({ quizId });
}
