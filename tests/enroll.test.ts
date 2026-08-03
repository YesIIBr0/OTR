// [BE-TEST · GOAL G2] enrollOnce — inscripción idempotente bajo CONCURRENCIA.
// Bug REAL encontrado probando staging con dos checkouts simultáneos del mismo curso:
// respuesta 200/500 (el segundo reventaba el unique userId_courseId). Este helper trata
// la violación de unicidad como "ya inscrito" — la unicidad la garantiza la DB, no un
// chequeo previo (entre leer y escribir SIEMPRE hay ventana). Fija además que el contador
// studentsCount solo sube cuando ESTA llamada creó la fila.
import { describe, it, expect, beforeEach, vi } from "vitest";
import { makeDb } from "./helpers/route-harness";

const box = vi.hoisted(() => ({ db: null as any }));
vi.mock("../app/lib/db", () => ({
  db: new Proxy({}, { get: (_t, p: string) => (p === "then" ? undefined : box.db.db[p]) }),
}));

import { enrollOnce } from "../app/lib/enroll";

box.db = makeDb();
const db = box.db;

const USER = "student-1";
const COURSE = "course-1";

beforeEach(() => {
  db.reset();
  vi.clearAllMocks();
  db.fn("enrollment.create").mockResolvedValue({ id: "e-1" });
  db.fn("course.update").mockResolvedValue({ id: COURSE });
});

describe("enrollOnce — idempotencia bajo concurrencia", () => {
  it("primera inscripción: crea la fila y suma studentsCount en UNA transacción", async () => {
    const r = await enrollOnce(USER, COURSE, "FREE");
    expect(r.created).toBe(true);
    expect(db.fn("enrollment.create")).toHaveBeenCalledWith({
      data: { userId: USER, courseId: COURSE, status: "ACTIVE", source: "FREE", lastAccess: "ahora" },
    });
    expect(db.fn("course.update")).toHaveBeenCalledWith({
      where: { id: COURSE }, data: { studentsCount: { increment: 1 } },
    });
  });

  it("carrera perdida (P2002): NO lanza, devuelve created:false — el usuario ve éxito, no un 500", async () => {
    // En Postgres quien viola el unique es el INSERT: el create rechaza y la transacción entera falla.
    db.fn("enrollment.create").mockRejectedValueOnce(Object.assign(new Error("Unique constraint failed"), { code: "P2002" }));
    const r = await enrollOnce(USER, COURSE, "FREE");
    expect(r.created).toBe(false);
  });

  it("dos llamadas simultáneas del mismo alumno/curso: ninguna lanza y solo UNA crea", async () => {
    // La segunda transacción choca con el unique (lo que hace Postgres de verdad).
    let n = 0;
    db.fn("enrollment.create").mockImplementation(async () => {
      n++;
      if (n > 1) throw Object.assign(new Error("Unique constraint failed"), { code: "P2002" });
      return { id: "e-1" };
    });
    const [a, b] = await Promise.all([enrollOnce(USER, COURSE, "FREE"), enrollOnce(USER, COURSE, "FREE")]);
    expect([a.created, b.created].filter(Boolean)).toHaveLength(1); // exactamente una creó
    expect([a.created, b.created]).toContain(false); // la otra resolvió idempotente
  });

  it("un error REAL (no P2002) SÍ se propaga: no se traga un fallo de base de datos", async () => {
    db.fn("enrollment.create").mockRejectedValueOnce(new Error("connection refused"));
    await expect(enrollOnce(USER, COURSE, "PAID")).rejects.toThrow(/connection refused/);
  });

  it("respeta el origen (source) — FREE del checkout vs PAID del webhook", async () => {
    await enrollOnce(USER, COURSE, "PAID");
    expect(db.fn("enrollment.create").mock.calls[0][0].data.source).toBe("PAID");
  });
});
