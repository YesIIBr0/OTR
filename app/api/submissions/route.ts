import { db } from "../../lib/db";
import { getSessionUser } from "../../lib/auth";
import { ok, bad, readJson, clean, safeUrl } from "../../lib/api";
import { recalcCourseProgress } from "../../lib/course-progress";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return bad("No autenticado", 401);
  const body = await readJson<{
    activity?: string;
    kind?: string;
    courseCode?: string;
    lessonId?: string;
    fileUrl?: string;
    fileName?: string;
    textBody?: string;
  }>(req);
  const activity = clean(body.activity, 160) || "Entrega";
  const kind = clean(body.kind, 24) || "audio";
  const courseCode = clean(body.courseCode, 24) || "";
  // [i18n] clave estable de la lección (independiente del idioma del título mostrado).
  const lessonId = clean(body.lessonId, 64) || null;

  // Verifica que el usuario esté INSCRITO en el curso (courseCode→course→enrollment)
  // antes de crear la entrega.
  const course = await db.course.findUnique({ where: { code: courseCode }, select: { id: true } });
  if (!course) return bad("Curso no encontrado", 404);
  const enrolled = await db.enrollment.findUnique({
    where: { userId_courseId: { userId: user.id, courseId: course.id } },
  });
  if (!enrolled) return bad("No estás inscrito en este curso", 403);

  // safeUrl defensivo: rechaza javascript:/data: en el href del archivo.
  const fileUrl = safeUrl(body.fileUrl, 400);
  const fileName = clean(body.fileName, 200) || null;
  const textBody = clean(body.textBody, 5000) || null;

  // BE-01 — Guard de entrega vacía (defensa en profundidad server-side). La UI ya valida
  // (scr-learn.ts), pero un POST directo con {} creaba una Submission con fileUrl/fileName/
  // textBody en null y devolvía 200 OK. Rechazamos si no hay ni archivo ni texto.
  if (!fileUrl && !textBody) return bad("Adjunta un archivo o escribe tu respuesta antes de entregar", 400);

  const submission = await db.submission.create({
    data: { userId: user.id, userName: user.name, activity, kind, courseCode, lessonId, fileUrl, fileName, textBody },
  });

  // [BUG-CERT] Al entregar la tarea el alumno completó la actividad → se marca la lección
  // como hecha (mismo espíritu que el quiz: aprobar marca done — ver
  // quizzes/[id]/attempt/route.ts:72-76). La nota del coach es un atributo posterior y NO
  // bloquea el progreso. Sin esto, cualquier curso con una tarea nunca llegaba a 100% y el
  // certificado quedaba inalcanzable. Solo si la entrega trae lessonId (entregas sueltas no
  // tocan progreso). Idempotente en re-entrega (upsert por el unique userId_lessonId).
  if (lessonId) {
    const lessonRow = await db.lesson.findUnique({
      where: { id: lessonId },
      select: { module: { select: { courseId: true } } },
    });
    const lessonCourseId = lessonRow?.module?.courseId;
    if (lessonCourseId) {
      // Defensa en profundidad: verifica inscripción en el curso REAL de la lección
      // (podría no coincidir con el courseCode declarado por el cliente).
      const lessonEnrolled = await db.enrollment.findUnique({
        where: { userId_courseId: { userId: user.id, courseId: lessonCourseId } },
      });
      if (lessonEnrolled) {
        await db.lessonProgress.upsert({
          where: { userId_lessonId: { userId: user.id, lessonId } },
          create: { userId: user.id, lessonId, done: true },
          update: { done: true },
        });
        // Recalcula el % del curso REAL de la lección (bloque unificado en course-progress.ts).
        await recalcCourseProgress(user.id, lessonCourseId);
      }
    }
  }

  return ok({ submission });
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) return bad("No autenticado", 401);

  // Alumno: solo sus propias entregas. Profesor: solo entregas de sus cursos. Admin: todas.
  let where: Record<string, unknown> = { userId: user.id };
  if (user.role === "ADMIN") {
    where = {};
  } else if (user.role === "TEACHER") {
    const myCourses = await db.course.findMany({ where: { teacherId: user.id }, select: { code: true } });
    where = { courseCode: { in: myCourses.map((c) => c.code) } };
  }
  const submissions = await db.submission.findMany({ where, orderBy: { createdAt: "desc" } });
  return ok({ submissions });
}
