// [BE-TEST] Integración de POST /api/auth/register — el flujo de alta y sus gates de
// seguridad/COPPA. Mockea Prisma + sesión + rate-limit (harness). Ejercita la LÓGICA real
// del handler (validación, corte <14, minor→guardianship PENDING) sin DB.
import { describe, it, expect, beforeEach, vi } from "vitest";
import { makeDb, jsonReq } from "./helpers/route-harness";

// Caja hoisteada (los factory de vi.mock se elevan sobre los imports; solo pueden tocar
// `vi` y vars de vi.hoisted). El Proxy reenvía perezosamente a box.db.db.
const box = vi.hoisted(() => ({ db: null as any, user: null as any }));
vi.mock("../app/lib/db", () => ({
  db: new Proxy({}, { get: (_t, p: string) => (p === "then" ? undefined : box.db.db[p]) }),
}));
vi.mock("../app/lib/auth", () => ({ setSession: vi.fn(), getSessionUser: () => box.user, clearSession: vi.fn() }));
vi.mock("../app/lib/rate-limit", () => ({ rateLimit: () => ({ ok: true, retryAfter: 0 }) }));

import { POST } from "../app/api/auth/register/route";
import { setSession } from "../app/lib/auth";

box.db = makeDb();
const db = box.db;
const currentYear = new Date().getFullYear();

async function register(body: Record<string, unknown>) {
  const res = await POST(jsonReq("/api/auth/register", body));
  const json = await res.json();
  return { status: res.status, json };
}

beforeEach(() => {
  db.reset();
  vi.clearAllMocks();
  // por defecto: email libre, create devuelve un user
  db.fn("user.findUnique").mockResolvedValue(null);
  db.fn("user.create").mockImplementation(async ({ data }: any) => ({ id: "u-new", ...data }));
  db.fn("guardianship.findUnique").mockResolvedValue(null);
  db.fn("guardianship.create").mockResolvedValue({ id: "g1" });
  db.fn("activityEvent.create").mockResolvedValue({ id: "a1" });
});

describe("POST /api/auth/register — validación", () => {
  it("rechaza contraseña corta (<6)", async () => {
    const { status } = await register({ name: "Ana Ruiz", email: "ana@x.com", password: "12345", role: "student", birthYear: currentYear - 20 });
    expect(status).toBe(400);
    expect(db.fn("user.create")).not.toHaveBeenCalled();
  });

  it("rechaza email inválido", async () => {
    const { status } = await register({ name: "Ana Ruiz", email: "no-es-email", password: "secret1", role: "student", birthYear: currentYear - 20 });
    expect(status).toBe(400);
  });

  it("rechaza email ya registrado con 409", async () => {
    db.fn("user.findUnique").mockResolvedValue({ id: "u-old", email: "ana@x.com" });
    const { status } = await register({ name: "Ana Ruiz", email: "ana@x.com", password: "secret1", role: "student", birthYear: currentYear - 20 });
    expect(status).toBe(409);
    expect(db.fn("user.create")).not.toHaveBeenCalled();
  });

  it("bloquea el auto-registro de coaches con 403", async () => {
    const { status } = await register({ name: "Coach X", email: "c@x.com", password: "secret1", role: "teacher" });
    expect(status).toBe(403);
    expect(db.fn("user.create")).not.toHaveBeenCalled();
  });
});

describe("POST /api/auth/register — COPPA / age-gate", () => {
  it("BLOQUEA a un menor de 13 (corte conservador <14) con 403", async () => {
    const { status, json } = await register({ name: "Niño Test", email: "nino@x.com", password: "secret1", role: "student", birthYear: currentYear - 12 });
    expect(status).toBe(403);
    expect(json.code).toBe("underThirteen");
    expect(db.fn("user.create")).not.toHaveBeenCalled();
  });

  it("también bloquea la cohorte límite de 13 (solo tenemos año)", async () => {
    const { status } = await register({ name: "Trece", email: "t@x.com", password: "secret1", role: "student", birthYear: currentYear - 13 });
    expect(status).toBe(403);
  });

  it("crea un ADULTO (>=18) con ageBand adult y abre sesión", async () => {
    const { status } = await register({ name: "Adulta Ya", email: "adulta@x.com", password: "secret1", role: "student", birthYear: currentYear - 25 });
    expect(status).toBe(200);
    const arg = db.fn("user.create").mock.calls[0][0].data;
    expect(arg.ageBand).toBe("adult");
    expect(setSession).toHaveBeenCalledOnce();
  });

  it("un MENOR 14-17 se crea con ageBand minor", async () => {
    const { status } = await register({ name: "Menor Val", email: "menor@x.com", password: "secret1", role: "student", birthYear: currentYear - 15 });
    expect(status).toBe(200);
    expect(db.fn("user.create").mock.calls[0][0].data.ageBand).toBe("minor");
  });

  it("un menor con guardianEmail de un PARENT existente crea Guardianship PENDING (no ACTIVE)", async () => {
    // findUnique: 1ª llamada (email del alumno) → null; 2ª (guardianEmail) → parent PARENT
    db.fn("user.findUnique")
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "p1", role: "PARENT", email: "papa@x.com" });
    const { status } = await register({ name: "Hijo Val", email: "hijo@x.com", password: "secret1", role: "student", birthYear: currentYear - 15, guardianEmail: "papa@x.com" });
    expect(status).toBe(200);
    const g = db.fn("guardianship.create").mock.calls[0][0].data;
    expect(g.status).toBe("PENDING");
    expect(g.initiatedBy).toBe("student");
  });
});
