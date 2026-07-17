// OTR LMS · Recalcula el progreso de un curso para un alumno y lo persiste en su matrícula.
// Protege el % de avance que alimenta el certificado: es el bloque que estaba DUPLICADO
// línea a línea en tres rutas de escritura (lesson-progress, quizzes/[id]/attempt y
// submissions). Unificar evita que las copias se desincronicen (p. ej. una arregla un bug
// y las otras no).
//
// [F5-fix] Criterio de lecciones OCULTAS unificado con la LECTURA: las tres copias
// originales contaban TODAS las lecciones, pero queries.ts `courseProgress` y el gate del
// certificado (app/api/certificates/route.ts) excluyen lecciones/módulos con `hidden` —
// así que un curso con contenido oculto por el profesor mostraba un % distinto entre lo
// escrito (enrollment.progress) y lo que ve el alumno, y el "100%" podía no cuadrar.
// Desde este helper, TODO el sistema cuenta solo lecciones visibles:
//   - progreso = round(hechas_visibles / totales_visibles * 100), 0 si no hay visibles,
//   - escribe el % en enrollment.updateMany (no-op si el alumno no está matriculado).
// Devuelve el % calculado para que el handler lo confirme al cliente.
import { db } from "./db";

export async function recalcCourseProgress(userId: string, courseId: string): Promise<number> {
  const courseLessons = await db.lesson.findMany({
    where: { module: { courseId } },
    select: { id: true, hidden: true, module: { select: { hidden: true } } },
  });
  // Mismo filtro que certificates/route.ts y courseProgress (queries.ts): lo oculto no cuenta.
  const visibleIds = courseLessons.filter((l) => !l.hidden && !l.module?.hidden).map((l) => l.id);
  const doneCount = visibleIds.length
    ? await db.lessonProgress.count({ where: { userId, done: true, lessonId: { in: visibleIds } } })
    : 0;
  const progress = visibleIds.length ? Math.round((doneCount / visibleIds.length) * 100) : 0;
  await db.enrollment.updateMany({ where: { userId, courseId }, data: { progress } });
  return progress;
}
