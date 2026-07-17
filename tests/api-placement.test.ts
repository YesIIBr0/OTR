// [BE-TEST · F5.3] Integración de /api/placement — auto-evaluación inicial del estudiante (PRD §2.2).
// Protege gates + efecto:
//   GET  — auth; devuelve { placed: !!user.placedAt }.
//   POST — solo STUDENT; upsert de las 6 dimensiones canónicas (score acotado 0-100 por la unique
//     userId_skill), fija User.placedAt, registra el ActivityEvent, y devuelve un `level` SUGERIDO
//     por el promedio (informativo — el rango real se deriva del XP, no del placement).
// Mockea Prisma + sesión + lib/activity (logActivitySafe).
import { describe, it, expect, beforeEach, vi } from "vitest";
import { makeDb, jsonReq } from "./helpers/route-harness";

// Caja hoisteada (los factory de vi.mock se elevan sobre los imports; solo pueden tocar
// `vi` y vars de vi.hoisted). El Proxy reenvía perezosamente a box.db.db.
const box = vi.hoisted(() => ({ db: null as any, user: null as any }));
vi.mock("../app/lib/db", () => ({
  db: new Proxy({}, { get: (_t, p: string) => (p === "then" ? undefined : box.db.db[p]) }),
}));
vi.mock("../app/lib/auth", () => ({ setSession: vi.fn(), getSessionUser: () => box.user, clearSession: vi.fn() }));
vi.mock("../app/lib/activity", () => ({ logActivitySafe: vi.fn() }));

import { GET, POST } from "../app/api/placement/route";
import { logActivitySafe } from "../app/lib/activity";

box.db = makeDb();
const db = box.db;

const STUDENT = { id: "st1", role: "STUDENT", placedAt: null as Date | null };
const SKILLS = ["Confianza", "Estructura", "Evidencia", "Refutación", "Cross-ex", "Delivery"];

async function post(body: Record<string, unknown>) {
  const res = await POST(jsonReq("/api/placement", body));
  return { status: res.status, json: await res.json() };
}

beforeEach(() => {
  db.reset();
  vi.clearAllMocks();
  box.user = { ...STUDENT };
  db.fn("studentSkill.findUnique").mockResolvedValue(null); // sin baseline previo → before=0
  db.fn("studentSkill.upsert").mockResolvedValue({ id: "sk" });
  db.fn("user.update").mockResolvedValue({ id: STUDENT.id });
});

describe("GET /api/placement — estado de colocación", () => {
  it("sin sesión → 401", async () => {
    box.user = null;
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("usuario SIN placedAt → { placed: false }", async () => {
    box.user = { ...STUDENT, placedAt: null };
    const res = await GET();
    expect(res.status).toBe(200);
    expect((await res.json()).placed).toBe(false);
  });

  it("usuario CON placedAt → { placed: true }", async () => {
    box.user = { ...STUDENT, placedAt: new Date() };
    const res = await GET();
    expect((await res.json()).placed).toBe(true);
  });
});

describe("POST /api/placement — gates", () => {
  it("sin sesión → 401", async () => {
    box.user = null;
    const { status } = await post({ scores: {} });
    expect(status).toBe(401);
    expect(db.fn("studentSkill.upsert")).not.toHaveBeenCalled();
  });

  it("rol no STUDENT (TEACHER) → 403", async () => {
    box.user = { id: "t1", role: "TEACHER" };
    const { status } = await post({ scores: {} });
    expect(status).toBe(403);
    expect(db.fn("studentSkill.upsert")).not.toHaveBeenCalled();
  });

  it("scores no-objeto (array) → 400", async () => {
    const { status } = await post({ scores: [1, 2, 3] });
    expect(status).toBe(400);
    expect(db.fn("studentSkill.upsert")).not.toHaveBeenCalled();
  });
});

describe("POST /api/placement — efecto", () => {
  it("scores válidos → upsert de las 6 dimensiones + placedAt + ActivityEvent + level sugerido", async () => {
    const { status, json } = await post({
      scores: { Confianza: 90, Estructura: 90, Evidencia: 90, "Refutación": 90, "Cross-ex": 90, Delivery: 90 },
    });
    expect(status).toBe(200);
    expect(json.placed).toBe(true);
    expect(json.level).toBe("Elite"); // promedio 90 → Elite (informativo)

    // Una upsert por dimensión canónica, por la unique userId_skill.
    expect(db.fn("studentSkill.upsert")).toHaveBeenCalledTimes(6);
    const upsertedSkills = db.fn("studentSkill.upsert").mock.calls.map((c: any[]) => c[0].where.userId_skill.skill);
    expect(new Set(upsertedSkills)).toEqual(new Set(SKILLS));

    // Fija placedAt (baseline del Skill Graph), NO el rango.
    expect(db.fn("user.update")).toHaveBeenCalledOnce();
    const uArg = db.fn("user.update").mock.calls[0][0];
    expect(uArg.where).toEqual({ id: STUDENT.id });
    expect(uArg.data.placedAt).toBeInstanceOf(Date);

    // Registra el evento de actividad.
    expect(logActivitySafe).toHaveBeenCalledOnce();
    expect(vi.mocked(logActivitySafe).mock.calls[0][0]).toMatchObject({ userId: STUDENT.id, type: "placement_done" });
  });

  it("acota cada score a 0-100 (150 → 100) y calcula el level sobre el promedio acotado", async () => {
    const { status, json } = await post({
      scores: { Confianza: 150, Estructura: 0, Evidencia: 0, "Refutación": 0, "Cross-ex": 0, Delivery: 0 },
    });
    expect(status).toBe(200);
    // Confianza se acotó a 100.
    const confCall = db.fn("studentSkill.upsert").mock.calls.find((c: any[]) => c[0].where.userId_skill.skill === "Confianza");
    expect(confCall[0].update.score).toBe(100);
    expect(confCall[0].create.score).toBe(100);
    // Promedio = 100/6 ≈ 17 → Novato.
    expect(json.level).toBe("Novato");
  });
});
