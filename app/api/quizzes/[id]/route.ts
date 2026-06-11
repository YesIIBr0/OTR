// PATCH/DELETE /api/quizzes/[id] — el profesor dueño edita o borra un examen. [id] = quizId.
import { ok, bad, readJson, clean } from "../../../lib/api";
import { getSessionUser } from "../../../lib/auth";
import { db } from "../../../lib/db";

type InOption = { text?: unknown; correct?: unknown };
type InQuestion = { prompt?: unknown; options?: InOption[] };
type Body = {
  title?: unknown;
  passScore?: unknown;
  questions?: InQuestion[];
};

const isTeacher = (role: string) => role === "TEACHER" || role === "ADMIN";

// Carga el quiz + verifica ownership de la lección vía módulo→curso→teacherId.
async function loadOwnedQuiz(quizId: string, user: { id: string; role: string }) {
  const quiz = await db.quiz.findUnique({
    where: { id: quizId },
    include: { lesson: { include: { module: { include: { course: true } } } } },
  });
  if (!quiz) return { quiz: null, owned: false };
  const owned = user.role === "ADMIN" || quiz.lesson.module.course.teacherId === user.id;
  return { quiz, owned };
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return bad("No autenticado", 401);
  if (!isTeacher(user.role)) return bad("Solo profesores", 403);

  const { id } = await params;
  const { quiz, owned } = await loadOwnedQuiz(id, user);
  if (!quiz) return bad("Examen no encontrado", 404);
  if (!owned) return bad("No autorizado", 403);

  const body = await readJson<Body>(req);

  // Campos escalares (allowlist).
  const data: Record<string, unknown> = {};
  const title = clean(body.title, 160);
  if (title) data.title = title;
  if (body.passScore !== undefined) {
    let ps = Math.round(Number(body.passScore));
    if (!Number.isFinite(ps)) ps = 60;
    data.passScore = Math.min(100, Math.max(0, ps));
  }

  // Si vienen questions, reemplaza por completo (borra y recrea con posiciones).
  let newQuestions: { prompt: string; options: { text: string; correct: boolean }[] }[] | null = null;
  if (Array.isArray(body.questions)) {
    newQuestions = body.questions
      .map((q) => {
        const prompt = clean(q?.prompt, 600);
        const options = (Array.isArray(q?.options) ? q.options : [])
          .map((o) => ({ text: clean(o?.text, 400), correct: Boolean(o?.correct) }))
          .filter((o) => o.text.length > 0);
        return { prompt, options };
      })
      .filter((q) => q.prompt.length > 0 && q.options.length >= 2);
    if (newQuestions.length === 0) {
      return bad("El examen necesita al menos una pregunta con dos opciones");
    }
  }

  await db.$transaction(async (tx) => {
    if (Object.keys(data).length > 0) {
      await tx.quiz.update({ where: { id }, data });
    }
    if (newQuestions) {
      await tx.quizQuestion.deleteMany({ where: { quizId: id } }); // cascade borra options
      for (let qi = 0; qi < newQuestions.length; qi++) {
        const q = newQuestions[qi];
        await tx.quizQuestion.create({
          data: {
            quizId: id,
            prompt: q.prompt,
            position: qi,
            options: {
              create: q.options.map((o, oi) => ({ text: o.text, correct: o.correct, position: oi })),
            },
          },
        });
      }
    }
  });

  return ok({ quizId: id });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return bad("No autenticado", 401);
  if (!isTeacher(user.role)) return bad("Solo profesores", 403);

  const { id } = await params;
  const { quiz, owned } = await loadOwnedQuiz(id, user);
  if (!quiz) return ok(); // idempotente: ya no existe
  if (!owned) return bad("No autorizado", 403);

  await db.quiz.delete({ where: { id } }); // cascade limpia questions/options
  return ok();
}
