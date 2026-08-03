// [BE-TEST · DINERO F5.1] Integración de POST /api/checkout — la única puerta de "compra"
// de acceso a un curso. HOY la venta por curso está APAGADA (COURSE_SALES_ENABLED=false,
// modelo de ingresos = membresía + marketplace + coaching, PRD §13.1): la ruta NUNCA toca
// Stripe y SIEMPRE inscribe directo con source="FREE", incluso si el curso tiene precio.
// Esta suite BLINDA ese comportamiento actual antes de cablear Stripe real (F7):
//   · gate de sesión (401),
//   · validación de courseId (400) y curso inexistente (404),
//   · inscripción directa atómica (Enrollment ACTIVE/FREE + studentsCount++),
//   · idempotencia (ya inscrito → no duplica),
//   · curso con precio → sigue inscribiendo GRATIS (venta apagada; no invoca Stripe).
// Mockea Prisma + sesión (harness). No mockea "stripe" a propósito: con la venta apagada la
// rama de Stripe es inalcanzable, y que el test pase lo demuestra.
import { describe, it, expect, beforeEach, vi } from "vitest";
import { makeDb, jsonReq } from "./helpers/route-harness";

// Caja hoisteada (los factory de vi.mock se elevan sobre los imports; solo pueden tocar
// `vi` y vars de vi.hoisted). El Proxy reenvía perezosamente a box.db.db.
const box = vi.hoisted(() => ({ db: null as any, user: null as any }));
vi.mock("../app/lib/db", () => ({
  db: new Proxy({}, { get: (_t, p: string) => (p === "then" ? undefined : box.db.db[p]) }),
}));
vi.mock("../app/lib/auth", () => ({ setSession: vi.fn(), getSessionUser: () => box.user, clearSession: vi.fn() }));

import { POST } from "../app/api/checkout/route";

box.db = makeDb();
const db = box.db;

const STUDENT = { id: "student-1", name: "Ana Ruiz", role: "STUDENT" };
const COURSE_ID = "course-1";

async function checkout(body: Record<string, unknown> | undefined, user: any = STUDENT) {
  box.user = user;
  const res = await POST(jsonReq("/api/checkout", body));
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

beforeEach(() => {
  db.reset();
  vi.clearAllMocks();
  box.user = STUDENT;
  // Curso gratis por defecto (priceCents 0). Cada test que necesite precio lo sobreescribe.
  db.fn("course.findUnique").mockResolvedValue({ id: COURSE_ID, name: "PF Fundamentos", priceCents: 0 });
  db.fn("enrollment.findUnique").mockResolvedValue(null);
  db.fn("enrollment.create").mockResolvedValue({ id: "enr-1" });
  db.fn("course.update").mockResolvedValue({ id: COURSE_ID });
});

describe("POST /api/checkout — gates de entrada", () => {
  it("sin sesión → 401 y no consulta el curso", async () => {
    const { status, json } = await checkout({ courseId: COURSE_ID }, null);
    expect(status).toBe(401);
    expect(json.error).toBe("No autenticado");
    expect(db.fn("course.findUnique")).not.toHaveBeenCalled();
  });

  it("sin courseId → 400 'Falta el curso'", async () => {
    const { status, json } = await checkout({});
    expect(status).toBe(400);
    expect(json.error).toBe("Falta el curso");
    expect(db.fn("course.findUnique")).not.toHaveBeenCalled();
  });

  it("courseId de curso inexistente → 404 y no inscribe", async () => {
    db.fn("course.findUnique").mockResolvedValue(null);
    const { status, json } = await checkout({ courseId: "no-existe" });
    expect(status).toBe(404);
    expect(json.error).toBe("Curso no encontrado");
    expect(db.fn("enrollment.create")).not.toHaveBeenCalled();
  });
});

describe("POST /api/checkout — inscripción directa (venta por curso APAGADA)", () => {
  it("curso gratis, no inscrito → crea Enrollment ACTIVE/FREE y suma studentsCount (transacción atómica)", async () => {
    const { status, json } = await checkout({ courseId: COURSE_ID });
    expect(status).toBe(200);
    expect(json).toEqual({ ok: true, enrolled: true });

    // [GOAL G2] Ya NO hay findUnique previo: enrollOnce INTENTA escribir y trata la
    // violación de unicidad como "ya inscrito" (entre leer y escribir siempre hay ventana,
    // y dos checkouts simultáneos daban un 500 real en staging).
    expect(db.fn("enrollment.findUnique")).not.toHaveBeenCalled();
    // Inscripción creada dentro de la transacción, marcada como fuente FREE.
    expect(db.fn("enrollment.create")).toHaveBeenCalledWith({
      data: { userId: STUDENT.id, courseId: COURSE_ID, status: "ACTIVE", source: "FREE", lastAccess: "ahora" },
    });
    // Contador del curso incrementado en la MISMA transacción.
    expect(db.fn("course.update")).toHaveBeenCalledWith({
      where: { id: COURSE_ID },
      data: { studentsCount: { increment: 1 } },
    });
  });

  it("ya inscrito (el INSERT choca con el unique) → idempotente: responde 200 enrolled:true, NO 500", async () => {
    // Así se comporta Postgres cuando la fila ya existe: el create rechaza con P2002.
    db.fn("enrollment.create").mockRejectedValueOnce(Object.assign(new Error("Unique constraint failed"), { code: "P2002" }));
    const { status, json } = await checkout({ courseId: COURSE_ID });
    expect(status).toBe(200);
    expect(json).toEqual({ ok: true, enrolled: true });
    // (En Postgres la transacción hace ROLLBACK, así que el contador NO persiste; el
    // harness registra la llamada porque evalúa ambas promesas antes del Promise.all.)
  });

  it("curso CON precio → igual inscribe GRATIS (venta apagada; nunca invoca Stripe)", async () => {
    // priceCents>0 pero COURSE_SALES_ENABLED=false: la rama de Stripe es inalcanzable.
    db.fn("course.findUnique").mockResolvedValue({ id: COURSE_ID, name: "Curso Premium", priceCents: 12000 });
    const { status, json } = await checkout({ courseId: COURSE_ID });
    expect(status).toBe(200);
    // La respuesta NO trae `url` de Stripe: es inscripción directa, no checkout de pago.
    expect(json).toEqual({ ok: true, enrolled: true });
    expect(json.url).toBeUndefined();
    // Y la fuente sigue siendo FREE aunque el curso tenga precio (documenta la venta apagada).
    expect(db.fn("enrollment.create")).toHaveBeenCalledWith({
      data: { userId: STUDENT.id, courseId: COURSE_ID, status: "ACTIVE", source: "FREE", lastAccess: "ahora" },
    });
  });
});
