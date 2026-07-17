// [BE-TEST] recalcCourseProgress (app/lib/course-progress.ts) — helper que unifica el bloque
// que estaba DUPLICADO en tres rutas (lesson-progress, quizzes/[id]/attempt, submissions).
// Fija su contrato: progreso = round(lecciones hechas / lecciones totales del curso * 100),
// 0 si el curso no tiene lecciones (sin dividir por cero), y SIEMPRE persiste el % en la
// matrícula vía enrollment.updateMany (no-op si el alumno no está inscrito). Es el % que
// alimenta el certificado, así que un cambio silencioso aquí rompería el 100%/cert.
// Mockea Prisma con el harness — no toca DB real.
import { describe, it, expect, beforeEach, vi } from "vitest";
import { makeDb } from "./helpers/route-harness";

const box = vi.hoisted(() => ({ db: null as any }));
vi.mock("../app/lib/db", () => ({
  db: new Proxy({}, { get: (_t, p: string) => (p === "then" ? undefined : box.db.db[p]) }),
}));

import { recalcCourseProgress } from "../app/lib/course-progress";

box.db = makeDb();
const db = box.db;

const USER = "user-1";
const COURSE = "course-1";

beforeEach(() => {
  db.reset();
  vi.clearAllMocks();
  db.fn("enrollment.updateMany").mockResolvedValue({ count: 1 });
});

describe("recalcCourseProgress — cálculo y persistencia del % del curso", () => {
  it("progreso = round(hechas/totales*100) y lo escribe en la matrícula", async () => {
    db.fn("lesson.findMany").mockResolvedValue([{ id: "l1" }, { id: "l2" }, { id: "l3" }, { id: "l4" }]);
    db.fn("lessonProgress.count").mockResolvedValue(1); // 1 de 4 = 25%
    const prog = await recalcCourseProgress(USER, COURSE);
    expect(prog).toBe(25);
    expect(db.fn("enrollment.updateMany")).toHaveBeenCalledWith({
      where: { userId: USER, courseId: COURSE },
      data: { progress: 25 },
    });
  });

  it("redondea al entero más cercano (2 de 3 → 67%)", async () => {
    db.fn("lesson.findMany").mockResolvedValue([{ id: "l1" }, { id: "l2" }, { id: "l3" }]);
    db.fn("lessonProgress.count").mockResolvedValue(2);
    expect(await recalcCourseProgress(USER, COURSE)).toBe(67); // Math.round(66.66…) = 67
  });

  it("curso sin lecciones → 0% (no divide por cero) e igual persiste 0", async () => {
    db.fn("lesson.findMany").mockResolvedValue([]);
    db.fn("lessonProgress.count").mockResolvedValue(0);
    const prog = await recalcCourseProgress(USER, COURSE);
    expect(prog).toBe(0);
    expect(db.fn("enrollment.updateMany")).toHaveBeenCalledWith({
      where: { userId: USER, courseId: COURSE },
      data: { progress: 0 },
    });
  });

  it("100% cuando todas las lecciones del curso están hechas", async () => {
    db.fn("lesson.findMany").mockResolvedValue([{ id: "l1" }, { id: "l2" }]);
    db.fn("lessonProgress.count").mockResolvedValue(2);
    expect(await recalcCourseProgress(USER, COURSE)).toBe(100);
  });

  it("acota bien las queries: findMany por courseId y count por done+ids de esas lecciones", async () => {
    db.fn("lesson.findMany").mockResolvedValue([{ id: "l1" }, { id: "l2" }]);
    db.fn("lessonProgress.count").mockResolvedValue(1);
    await recalcCourseProgress(USER, COURSE);
    expect(db.fn("lesson.findMany")).toHaveBeenCalledWith({
      where: { module: { courseId: COURSE } },
      select: { id: true },
    });
    expect(db.fn("lessonProgress.count")).toHaveBeenCalledWith({
      where: { userId: USER, done: true, lessonId: { in: ["l1", "l2"] } },
    });
  });
});
