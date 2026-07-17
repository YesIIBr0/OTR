// [BE-TEST] Integración de POST /api/submissions — la entrega de una tarea debe completar
// la lección (LessonProgress.done=true), igual que el quiz marca done al aprobar (ver
// quizzes/[id]/attempt/route.ts:72-76). Sin esto, un curso con una tarea nunca llegaba al
// 100% y el certificado quedaba inalcanzable (BUG-CERT). Mockea Prisma + sesión (harness).
import { describe, it, expect, beforeEach, vi } from "vitest";
import { makeDb, jsonReq } from "./helpers/route-harness";

// Caja hoisteada (los factory de vi.mock se elevan sobre los imports; solo pueden tocar
// `vi` y vars de vi.hoisted). El Proxy reenvía perezosamente a box.db.db.
const box = vi.hoisted(() => ({ db: null as any, user: null as any }));
vi.mock("../app/lib/db", () => ({
  db: new Proxy({}, { get: (_t, p: string) => (p === "then" ? undefined : box.db.db[p]) }),
}));
vi.mock("../app/lib/auth", () => ({ setSession: vi.fn(), getSessionUser: () => box.user, clearSession: vi.fn() }));

import { POST } from "../app/api/submissions/route";

box.db = makeDb();
const db = box.db;

const STUDENT = { id: "student-1", name: "Ana Ruiz", role: "STUDENT" };
const COURSE_ID = "course-1";
const LESSON_ID = "lesson-1";

async function submit(body: Record<string, unknown>) {
  box.user = STUDENT;
  const res = await POST(jsonReq("/api/submissions", body));
  const json = await res.json();
  return { status: res.status, json };
}

beforeEach(() => {
  db.reset();
  vi.clearAllMocks();
  db.fn("course.findUnique").mockResolvedValue({ id: COURSE_ID });
  // Usado tanto para el gate de inscripción por courseCode como para el de la lección.
  db.fn("enrollment.findUnique").mockResolvedValue({ userId: STUDENT.id, courseId: COURSE_ID });
  db.fn("submission.create").mockImplementation(async ({ data }: any) => ({ id: "sub-1", ...data }));
  db.fn("lesson.findUnique").mockResolvedValue({ module: { courseId: COURSE_ID } });
  db.fn("lesson.findMany").mockResolvedValue([{ id: LESSON_ID }, { id: "lesson-2" }]);
  db.fn("lessonProgress.count").mockResolvedValue(1);
  db.fn("lessonProgress.upsert").mockResolvedValue({ id: "lp-1" });
  db.fn("enrollment.updateMany").mockResolvedValue({ count: 1 });
});

describe("POST /api/submissions — entrega marca la lección completada", () => {
  it("entrega CON lessonId escribe LessonProgress (done=true) y recalcula el progreso", async () => {
    const { status } = await submit({ activity: "Ensayo 1", courseCode: "C1", lessonId: LESSON_ID, textBody: "mi respuesta" });
    expect(status).toBe(200);

    expect(db.fn("lessonProgress.upsert")).toHaveBeenCalledOnce();
    const arg = db.fn("lessonProgress.upsert").mock.calls[0][0];
    expect(arg.where).toEqual({ userId_lessonId: { userId: STUDENT.id, lessonId: LESSON_ID } });
    expect(arg.create).toMatchObject({ userId: STUDENT.id, lessonId: LESSON_ID, done: true });
    expect(arg.update).toEqual({ done: true });

    // El progreso del enrollment se recalcula sobre las lecciones del curso REAL de la lección.
    expect(db.fn("enrollment.updateMany")).toHaveBeenCalledWith({
      where: { userId: STUDENT.id, courseId: COURSE_ID },
      data: { progress: 50 }, // 1 de 2 lecciones (mock lessonProgress.count = 1)
    });
  });

  it("entrega SIN lessonId (entrega suelta) NO toca el progreso", async () => {
    const { status } = await submit({ activity: "Entrega suelta", courseCode: "C1", textBody: "mi respuesta" });
    expect(status).toBe(200);
    expect(db.fn("lessonProgress.upsert")).not.toHaveBeenCalled();
    expect(db.fn("enrollment.updateMany")).not.toHaveBeenCalled();
  });

  it("re-entrega (dos POST con el mismo lessonId) es idempotente vía upsert", async () => {
    await submit({ activity: "Ensayo 1", courseCode: "C1", lessonId: LESSON_ID, textBody: "primer intento" });
    await submit({ activity: "Ensayo 1", courseCode: "C1", lessonId: LESSON_ID, textBody: "segundo intento" });

    expect(db.fn("lessonProgress.upsert")).toHaveBeenCalledTimes(2);
    const calls = db.fn("lessonProgress.upsert").mock.calls;
    for (const [arg] of calls) {
      expect(arg.where).toEqual({ userId_lessonId: { userId: STUDENT.id, lessonId: LESSON_ID } });
      expect(arg.update).toEqual({ done: true });
    }
  });

  it("no marca progreso si la lección resuelta no tiene inscripción activa en su curso real", async () => {
    // La lección pertenece a otro curso (courseId distinto) donde el alumno NO está inscrito.
    db.fn("lesson.findUnique").mockResolvedValue({ module: { courseId: "otro-curso" } });
    db.fn("enrollment.findUnique")
      .mockResolvedValueOnce({ userId: STUDENT.id, courseId: COURSE_ID }) // gate por courseCode: sí inscrito
      .mockResolvedValueOnce(null); // gate por el curso REAL de la lección: no inscrito

    const { status } = await submit({ activity: "Ensayo 1", courseCode: "C1", lessonId: LESSON_ID, textBody: "resp" });
    expect(status).toBe(200); // la entrega igual se crea
    expect(db.fn("lessonProgress.upsert")).not.toHaveBeenCalled();
  });
});
