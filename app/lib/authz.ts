// Autorización: el usuario debe ser el profesor dueño del recurso (o ADMIN).
import { db } from "./db";

type U = { id: string; role: string };

// Predicado de rol: true si `user.role` está entre los roles permitidos. Reemplaza el gate
// mecánico y repetido `user.role !== "X" (&& user.role !== "Y")` que precede a un `return bad(...)`
// justo tras getSessionUser. Es un predicado puro (no devuelve la respuesta) para que cada ruta
// conserve su propio mensaje y status de bad() — idénticos a antes. NO usar en gates con lógica
// especial (ownership, consentimiento, isTeacher compuesto): esos siguen escritos a mano.
export function requireRole(user: { role: string }, ...roles: string[]): boolean {
  return roles.includes(user.role);
}

export async function teacherOwnsCourse(courseId: string, user: U) {
  const course = await db.course.findUnique({ where: { id: courseId } });
  if (!course) return null;
  if (user.role === "ADMIN" || course.teacherId === user.id) return course;
  return null;
}

export async function teacherOwnsModule(moduleId: string, user: U) {
  const m = await db.module.findUnique({ where: { id: moduleId }, include: { course: true } });
  if (!m) return null;
  if (user.role === "ADMIN" || m.course.teacherId === user.id) return m;
  return null;
}

export async function teacherOwnsLesson(lessonId: string, user: U) {
  const l = await db.lesson.findUnique({ where: { id: lessonId }, include: { module: { include: { course: true } } } });
  if (!l) return null;
  if (user.role === "ADMIN" || l.module.course.teacherId === user.id) return l;
  return null;
}
