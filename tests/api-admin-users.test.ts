// [BE-TEST] Integración de PATCH /api/admin/users — gobernanza F2.1 + guardas anti-lockout.
//   F2.1 (AuditLog): cambiar rol / verificar coach / suspender escribe un rastro atribuible
//     (actorId + actorName snapshot, action, antes→después) — requisito COPPA / Ley 172-13 RD.
//     El rastro es best-effort (nunca revierte el cambio) y solo se escribe si el valor CAMBIA.
//   Anti-lockout (preexistente): un admin no puede quitarse su propio rol ADMIN ni suspenderse
//     a sí mismo (si no, queda fuera de la plataforma). Estas guardas deben seguir intactas.
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

import { PATCH } from "../app/api/admin/users/route";

box.db = makeDb();
const db = box.db;

const ADMIN = { id: "admin-1", name: "Admin OTR", role: "ADMIN" };
const TARGET_ID = "user-9";
// Estado ANTERIOR del objetivo (lo que lee el route antes del update, para el antes→después).
const TARGET_BEFORE = { id: TARGET_ID, name: "Bob Díaz", role: "STUDENT", coachVerified: false, suspended: false };

async function patch(body: Record<string, unknown>) {
  const res = await PATCH(jsonReq("/api/admin/users", body, "PATCH"));
  const json = await res.json();
  return { status: res.status, json };
}

beforeEach(() => {
  db.reset();
  vi.clearAllMocks();
  box.user = ADMIN;
  db.fn("user.findUnique").mockResolvedValue({ ...TARGET_BEFORE });
  db.fn("user.update").mockImplementation(async ({ data }: any) => ({ id: TARGET_ID, ...data }));
});

describe("PATCH /api/admin/users — AuditLog (F2.1)", () => {
  it("cambio de rol: 200 + user.update role=TEACHER + AuditLog user.role_change con antes→después", async () => {
    const { status } = await patch({ userId: TARGET_ID, role: "TEACHER" });
    expect(status).toBe(200);
    expect(db.fn("user.update").mock.calls[0][0].data).toEqual({ role: "TEACHER" });
    expect(db.fn("auditLog.create")).toHaveBeenCalledOnce();
    expect(db.fn("auditLog.create").mock.calls[0][0].data).toMatchObject({
      actorId: ADMIN.id, actorName: ADMIN.name, action: "user.role_change", targetType: "user", targetId: TARGET_ID,
      detail: "Bob Díaz: rol STUDENT → TEACHER",
    });
  });

  it("suspend: 200 + AuditLog user.suspend", async () => {
    const { status } = await patch({ userId: TARGET_ID, suspended: true });
    expect(status).toBe(200);
    expect(db.fn("user.update").mock.calls[0][0].data).toEqual({ suspended: true });
    expect(db.fn("auditLog.create")).toHaveBeenCalledOnce();
    expect(db.fn("auditLog.create").mock.calls[0][0].data).toMatchObject({ action: "user.suspend", targetId: TARGET_ID });
  });

  it("verificar coach: AuditLog coach.verify", async () => {
    await patch({ userId: TARGET_ID, coachVerified: true });
    expect(db.fn("auditLog.create").mock.calls[0][0].data).toMatchObject({ action: "coach.verify", targetId: TARGET_ID });
  });

  it("no-op (rol igual al actual): user.update corre pero NO escribe AuditLog", async () => {
    const { status } = await patch({ userId: TARGET_ID, role: "STUDENT" }); // ya es STUDENT
    expect(status).toBe(200);
    expect(db.fn("user.update")).toHaveBeenCalledOnce();
    expect(db.fn("auditLog.create")).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/admin/users — guardas anti-lockout intactas", () => {
  it("BLOQUEA quitarse el propio rol ADMIN: 400, sin update, sin AuditLog", async () => {
    db.fn("user.findUnique").mockResolvedValue({ id: ADMIN.id, name: ADMIN.name, role: "ADMIN", coachVerified: false, suspended: false });
    const { status } = await patch({ userId: ADMIN.id, role: "STUDENT" });
    expect(status).toBe(400);
    expect(db.fn("user.update")).not.toHaveBeenCalled();
    expect(db.fn("auditLog.create")).not.toHaveBeenCalled();
  });

  it("BLOQUEA la auto-suspensión: 400, sin update, sin AuditLog", async () => {
    db.fn("user.findUnique").mockResolvedValue({ id: ADMIN.id, name: ADMIN.name, role: "ADMIN", coachVerified: false, suspended: false });
    const { status } = await patch({ userId: ADMIN.id, suspended: true });
    expect(status).toBe(400);
    expect(db.fn("user.update")).not.toHaveBeenCalled();
    expect(db.fn("auditLog.create")).not.toHaveBeenCalled();
  });
});
