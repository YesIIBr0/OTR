// [BE-TEST] recalcCourseProgress (app/lib/course-progress.ts) — helper que unifica el bloque
// que estaba DUPLICADO en tres rutas (lesson-progress, quizzes/[id]/attempt, submissions).
// Fija su contrato: progreso = round(hechas VISIBLES / totales VISIBLES * 100) — [F5-fix]
// lo oculto por el profesor (lesson.hidden o module.hidden) NO cuenta, mismo criterio que
// courseProgress (queries.ts) y el gate del certificado; 0 si no hay lecciones visibles
// (sin dividir por cero), y SIEMPRE persiste el % en la matrícula vía enrollment.updateMany
// (no-op si el alumno no está inscrito). Es el % que alimenta el certificado, así que un
// cambio silencioso aquí rompería el 100%/cert. Mockea Prisma con el harness — no toca DB real.
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

  it("acota bien las queries: findMany por courseId (con hidden) y count por done+ids visibles", async () => {
    db.fn("lesson.findMany").mockResolvedValue([{ id: "l1" }, { id: "l2" }]);
    db.fn("lessonProgress.count").mockResolvedValue(1);
    await recalcCourseProgress(USER, COURSE);
    expect(db.fn("lesson.findMany")).toHaveBeenCalledWith({
      where: { module: { courseId: COURSE } },
      select: { id: true, hidden: true, module: { select: { hidden: true } } },
    });
    expect(db.fn("lessonProgress.count")).toHaveBeenCalledWith({
      where: { userId: USER, done: true, lessonId: { in: ["l1", "l2"] } },
    });
  });

  // [F5-fix] El criterio de ocultas queda unificado con la lectura (courseProgress/certificado):
  // sin esto, un curso con lecciones ocultas escribía un % distinto del que la UI mostraba.
  it("excluye lecciones ocultas y módulos ocultos del denominador Y del count", async () => {
    db.fn("lesson.findMany").mockResolvedValue([
      { id: "l1" },                                        // visible
      { id: "l2", hidden: true },                          // lección oculta → fuera
      { id: "l3", module: { hidden: true } },              // módulo oculto → fuera
      { id: "l4", hidden: false, module: { hidden: false } }, // visible
    ]);
    db.fn("lessonProgress.count").mockResolvedValue(1); // 1 de 2 visibles = 50%
    const prog = await recalcCourseProgress(USER, COURSE);
    expect(prog).toBe(50);
    // El count solo consulta las visibles (l1, l4) — lo oculto no infla ni desinfla el %.
    expect(db.fn("lessonProgress.count")).toHaveBeenCalledWith({
      where: { userId: USER, done: true, lessonId: { in: ["l1", "l4"] } },
    });
  });

  it("curso donde TODO está oculto → 0% sin consultar lessonProgress", async () => {
    db.fn("lesson.findMany").mockResolvedValue([{ id: "l1", hidden: true }]);
    const prog = await recalcCourseProgress(USER, COURSE);
    expect(prog).toBe(0);
    expect(db.fn("lessonProgress.count")).not.toHaveBeenCalled();
  });
});
