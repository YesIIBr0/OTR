// [BE-TEST] Integración de GET /api/admin/audit — lectura del rastro de auditoría (F2.2).
//   Gate: solo ADMIN (401 sin sesión, 403 con rol no-admin) — copia del gate de /api/admin/users.
//   Shape: { entries: [{ id, actorName, action, targetType, targetId, detail, when }], total }.
//   Contrato de escape: actorName y detail se escapan UNA vez aquí (texto de usuario crudo en DB).
//   Paginación: page/take → skip=(page-1)*take, take acotado a 100 (defensa anti-degradación).
// Mockea Prisma + sesión (harness), igual que el resto de la suite.
import { describe, it, expect, beforeEach, vi } from "vitest";
import { makeDb, jsonReq } from "./helpers/route-harness";

// Caja hoisteada (los factory de vi.mock se elevan sobre los imports; solo pueden tocar
// `vi` y vars de vi.hoisted). El Proxy reenvía perezosamente a box.db.db.
const box = vi.hoisted(() => ({ db: null as any, user: null as any }));
vi.mock("../app/lib/db", () => ({
  db: new Proxy({}, { get: (_t, p: string) => (p === "then" ? undefined : box.db.db[p]) }),
}));
vi.mock("../app/lib/auth", () => ({ setSession: vi.fn(), getSessionUser: () => box.user, clearSession: vi.fn() }));

import { GET } from "../app/api/admin/audit/route";

box.db = makeDb();
const db = box.db;

const ADMIN = { id: "admin-1", name: "Admin OTR", role: "ADMIN" };

// Una entrada del rastro TAL CUAL vive en DB: actorName/detail con texto CRUDO (sin escapar).
const RAW_ROW = {
  id: "al-1",
  actorName: "Ana & Co",
  action: "user.role_change",
  targetType: "user",
  targetId: "user-9",
  detail: `Bob "el <malo>" Díaz: rol STUDENT → TEACHER`,
  createdAt: "2026-07-17T12:00:00.000Z",
};

async function get(qs = "") {
  const res = await GET(jsonReq(`/api/admin/audit${qs}`, undefined, "GET"));
  const json = await res.json();
  return { status: res.status, json };
}

beforeEach(() => {
  db.reset();
  vi.clearAllMocks();
  box.user = ADMIN;
  db.fn("auditLog.findMany").mockResolvedValue([{ ...RAW_ROW }]);
  db.fn("auditLog.count").mockResolvedValue(1);
});

describe("GET /api/admin/audit — gate de rol", () => {
  it("401 si no hay sesión", async () => {
    box.user = null;
    const { status } = await get();
    expect(status).toBe(401);
    expect(db.fn("auditLog.findMany")).not.toHaveBeenCalled();
  });

  it("403 si el usuario no es ADMIN", async () => {
    box.user = { id: "s-1", name: "Estudiante", role: "STUDENT" };
    const { status } = await get();
    expect(status).toBe(403);
    expect(db.fn("auditLog.findMany")).not.toHaveBeenCalled();
  });
});

describe("GET /api/admin/audit — shape + contrato de escape", () => {
  it("200 con { entries, total } y las columnas esperadas", async () => {
    const { status, json } = await get();
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.total).toBe(1);
    expect(Array.isArray(json.entries)).toBe(true);
    expect(Object.keys(json.entries[0]).sort()).toEqual(
      ["action", "actorName", "detail", "id", "targetId", "targetType", "when"].sort(),
    );
    expect(json.entries[0]).toMatchObject({
      id: "al-1",
      action: "user.role_change",
      targetType: "user",
      targetId: "user-9",
      when: "2026-07-17T12:00:00.000Z",
    });
  });

  it("escapa actorName y detail UNA vez (el resto de campos no se tocan)", async () => {
    const { json } = await get();
    const e = json.entries[0];
    expect(e.actorName).toBe("Ana &amp; Co");
    expect(e.detail).toBe("Bob &quot;el &lt;malo&gt;&quot; Díaz: rol STUDENT → TEACHER");
    // action/targetType/targetId son constantes/ids del servidor: se devuelven crudos.
    expect(e.action).toBe("user.role_change");
    expect(e.targetId).toBe("user-9");
  });
});

describe("GET /api/admin/audit — paginación (page/take)", () => {
  it("defaults: page=1, take=50 → skip=0, take=50, orderBy createdAt desc", async () => {
    await get();
    const arg = db.fn("auditLog.findMany").mock.calls[0][0];
    expect(arg.skip).toBe(0);
    expect(arg.take).toBe(50);
    expect(arg.orderBy).toEqual({ createdAt: "desc" });
  });

  it("page=3&take=50 → skip=100", async () => {
    await get("?page=3&take=50");
    const arg = db.fn("auditLog.findMany").mock.calls[0][0];
    expect(arg.skip).toBe(100);
    expect(arg.take).toBe(50);
  });

  it("take se ACOTA a 100 aunque el cliente pida más (anti-degradación)", async () => {
    await get("?page=2&take=5000");
    const arg = db.fn("auditLog.findMany").mock.calls[0][0];
    expect(arg.take).toBe(100);
    expect(arg.skip).toBe(100); // (2-1)*100
  });

  it("page/take no numéricos caen a los defaults (page=1, take=50)", async () => {
    await get("?page=abc&take=xyz");
    const arg = db.fn("auditLog.findMany").mock.calls[0][0];
    expect(arg.skip).toBe(0); // page NaN → 1 → skip 0
    expect(arg.take).toBe(50); // take NaN → default 50
  });

  it("page=0 se fuerza a 1 (skip=0)", async () => {
    await get("?page=0&take=50");
    const arg = db.fn("auditLog.findMany").mock.calls[0][0];
    expect(arg.skip).toBe(0);
  });
});
