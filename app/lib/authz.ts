// Autorización: el usuario debe ser el profesor dueño del recurso (o ADMIN).
import { db } from "./db";

type U = { id: string; role: string };

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
