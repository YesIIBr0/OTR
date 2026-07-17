// [BE-TEST] Integración de /api/reports — moderación (PRD §7.4) + endurecimiento F1.
//   PATCH suspend (F1.6, anti-lockout): copia la guarda de /api/admin/users — no puedes
//     suspenderte a ti mismo ni suspender a otro ADMIN (si no, un admin queda fuera de la
//     plataforma desde la cola de moderación).
//   POST (F1.4, rate-limit): la cola de moderación no se puede inundar (10 / 10 min por usuario).
// A diferencia del resto de la suite, este archivo NO mockea el rate-limit: ejercita el limiter
// REAL de POST end-to-end (con un userId dedicado para no contaminar los demás tests). Los tests
// de PATCH no tocan el limiter (solo POST lo invoca). Mockea Prisma + sesión (harness).
import { describe, it, expect, beforeEach, vi } from "vitest";
import { makeDb, jsonReq } from "./helpers/route-harness";

// Caja hoisteada (los factory de vi.mock se elevan sobre los imports; solo pueden tocar
// `vi` y vars de vi.hoisted). El Proxy reenvía perezosamente a box.db.db.
const box = vi.hoisted(() => ({ db: null as any, user: null as any }));
vi.mock("../app/lib/db", () => ({
  db: new Proxy({}, { get: (_t, p: string) => (p === "then" ? undefined : box.db.db[p]) }),
}));
vi.mock("../app/lib/auth", () => ({ setSession: vi.fn(), getSessionUser: () => box.user, clearSession: vi.fn() }));

import { POST, PATCH } from "../app/api/reports/route";

box.db = makeDb();
const db = box.db;

const ADMIN = { id: "admin-1", name: "Admin OTR", role: "ADMIN" };

async function patch(body: Record<string, unknown>) {
  const res = await PATCH(jsonReq("/api/reports", body, "PATCH"));
  const json = await res.json();
  return { status: res.status, json };
}

// ---------------------------------------------------------------------------
// PATCH suspend — anti-lockout (F1.6)
// ---------------------------------------------------------------------------
describe("PATCH /api/reports — suspend (anti-lockout F1.6)", () => {
  const REPORT_ID = "rep-1";
  const TARGET_USER_ID = "student-9";

  beforeEach(() => {
    db.reset();
    vi.clearAllMocks();
    box.user = ADMIN;
    // Reporte OPEN contra un usuario objetivo.
    db.fn("report.findUnique").mockResolvedValue({ id: REPORT_ID, targetType: "user", targetId: TARGET_USER_ID, status: "OPEN" });
    db.fn("user.update").mockResolvedValue({ id: TARGET_USER_ID, suspended: true });
    db.fn("report.update").mockResolvedValue({ id: REPORT_ID, status: "REVIEWED" });
  });

  it("suspende a un usuario normal (no admin, no uno mismo): 200 + user.update suspended=true", async () => {
    db.fn("user.findUnique").mockResolvedValue({ role: "STUDENT" });
    const { status, json } = await patch({ reportId: REPORT_ID, action: "suspend" });
    expect(status).toBe(200);
    expect(json.suspended).toBe(true);
    expect(db.fn("user.update")).toHaveBeenCalledOnce();
    expect(db.fn("user.update").mock.calls[0][0]).toEqual({
      where: { id: TARGET_USER_ID },
      data: { suspended: true },
    });
    expect(db.fn("report.update")).toHaveBeenCalledOnce();
  });

  it("BLOQUEA suspender a otro ADMIN: 400 y NO ejecuta user.update", async () => {
    db.fn("user.findUnique").mockResolvedValue({ role: "ADMIN" });
    const { status, json } = await patch({ reportId: REPORT_ID, action: "suspend" });
    expect(status).toBe(400);
    expect(json.ok).toBe(false);
    expect(db.fn("user.update")).not.toHaveBeenCalled();
    expect(db.fn("report.update")).not.toHaveBeenCalled();
  });

  it("BLOQUEA la auto-suspensión (el objetivo es el propio admin): 400 y NO ejecuta user.update", async () => {
    // El reporte apunta al propio admin logueado.
    db.fn("report.findUnique").mockResolvedValue({ id: REPORT_ID, targetType: "user", targetId: ADMIN.id, status: "OPEN" });
    const { status } = await patch({ reportId: REPORT_ID, action: "suspend" });
    expect(status).toBe(400);
    expect(db.fn("user.update")).not.toHaveBeenCalled();
    // Corta ANTES de consultar el rol (auto-suspensión se detecta por id).
    expect(db.fn("user.findUnique")).not.toHaveBeenCalled();
  });

  it("unsuspend NO aplica la guarda anti-lockout (reactivar nunca bloquea): 200", async () => {
    db.fn("report.findUnique").mockResolvedValue({ id: REPORT_ID, targetType: "user", targetId: TARGET_USER_ID, status: "OPEN" });
    const { status } = await patch({ reportId: REPORT_ID, action: "unsuspend" });
    expect(status).toBe(200);
    // La guarda solo aplica a "suspend": unsuspend nunca consulta el rol ni bloquea.
    expect(db.fn("user.findUnique")).not.toHaveBeenCalled();
    expect(db.fn("user.update")).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// POST — rate-limit real (F1.4)
// ---------------------------------------------------------------------------
describe("POST /api/reports — rate-limit (F1.4)", () => {
  beforeEach(() => {
    // NB: NO reseteamos el limiter (es estado de módulo real); usamos un userId dedicado
    // por test para aislar el contador. Sí reseteamos los mocks de DB.
    db.reset();
    vi.clearAllMocks();
    db.fn("report.create").mockResolvedValue({ id: "rep-created" });
    db.fn("activityEvent.create").mockResolvedValue({ id: "act-1" });
  });

  async function file(userId: string) {
    box.user = { id: userId, name: "Reporter", role: "STUDENT" };
    const res = await POST(jsonReq("/api/reports", { targetType: "message", targetId: "m-1", reason: "spam" }));
    return res.status;
  }

  it("un reporte válido devuelve 200 (por debajo del límite)", async () => {
    expect(await file("reporter-ok")).toBe(200);
  });

  it("al 11º reporte en la ventana responde 429 (límite 10 / ventana)", async () => {
    const FLOODER = "flooder-1"; // userId dedicado → contador aislado del resto de tests
    const statuses: number[] = [];
    for (let i = 0; i < 11; i++) statuses.push(await file(FLOODER));
    // Los 10 primeros pasan; el 11º se corta.
    expect(statuses.slice(0, 10)).toEqual(Array(10).fill(200));
    expect(statuses[10]).toBe(429);
  });
});
