// OTR LMS · Recalcula el progreso de un curso para un alumno y lo persiste en su matrícula.
// Protege el % de avance que alimenta el certificado: es el bloque que estaba DUPLICADO
// línea a línea en tres rutas de escritura (lesson-progress, quizzes/[id]/attempt y
// submissions). Unificar evita que las copias se desincronicen (p. ej. una arregla un bug
// y las otras no). Comportamiento IDÉNTICO a esas tres copias:
//   - cuenta TODAS las lecciones del curso (no filtra `hidden`; ver nota al pie),
//   - progreso = round(hechas / totales * 100), 0 si el curso no tiene lecciones,
//   - escribe el % en enrollment.updateMany (no-op si el alumno no está matriculado).
// Devuelve el % calculado para que el handler lo confirme al cliente.
//
// NOTA (olor conocido, NO se cambia aquí — refactor puro): queries.ts `courseProgress`
// y el gate de certificado SÍ excluyen lecciones/módulos ocultos (`hidden`), pero estas
// tres rutas de escritura NUNCA lo hicieron. Un curso con lecciones ocultas puede, por
// tanto, mostrar un % distinto entre la escritura (esta función) y la lectura (queries.ts).
// Se documenta para el supervisor; unificar el criterio de `hidden` es un cambio de
// comportamiento fuera del alcance de esta tarea.
import { db } from "./db";

export async function recalcCourseProgress(userId: string, courseId: string): Promise<number> {
  const courseLessons = await db.lesson.findMany({ where: { module: { courseId } }, select: { id: true } });
  const doneCount = await db.lessonProgress.count({
    where: { userId, done: true, lessonId: { in: courseLessons.map((l) => l.id) } },
  });
  const progress = courseLessons.length ? Math.round((doneCount / courseLessons.length) * 100) : 0;
  await db.enrollment.updateMany({ where: { userId, courseId }, data: { progress } });
  return progress;
}
