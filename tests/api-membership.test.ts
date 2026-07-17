// [BE-TEST · DINERO F5.1] Integración de GET/POST /api/membership — la membresía del PRD §13
// es hoy una SUSCRIPCIÓN SIMULADA (sin Stripe): "contratar" un plan solo cambia User.membership
// y arranca/limpia membershipSince. Esta suite BLINDA el flujo antes de cablear la pasarela (F7):
//   · GET: gate de sesión (401) + reporte del plan actual con etiqueta legible de antigüedad,
//   · POST: gate de sesión (401), plan inválido/elite (400),
//   · transición free→pro: arranca membershipSince (Date) y loguea al ledger de actividad,
//   · transición pro→free: limpia membershipSince (null) y loguea "Volvió al plan Free",
//   · idempotencia: mismo plan → NO re-escribe ni vuelve a loguear.
// Mockea Prisma + sesión (harness). logActivitySafe pasa por el MISMO db mockeado (activity.ts
// importa ./db), así que se verifica sobre db.activityEvent.create — sin mock aparte.
import { describe, it, expect, beforeEach, vi } from "vitest";
import { makeDb, jsonReq } from "./helpers/route-harness";

// Caja hoisteada (los factory de vi.mock se elevan sobre los imports; solo pueden tocar
// `vi` y vars de vi.hoisted). El Proxy reenvía perezosamente a box.db.db.
const box = vi.hoisted(() => ({ db: null as any, user: null as any }));
vi.mock("../app/lib/db", () => ({
  db: new Proxy({}, { get: (_t, p: string) => (p === "then" ? undefined : box.db.db[p]) }),
}));
vi.mock("../app/lib/auth", () => ({ setSession: vi.fn(), getSessionUser: () => box.user, clearSession: vi.fn() }));

import { GET, POST } from "../app/api/membership/route";

box.db = makeDb();
const db = box.db;

function userFree(extra: Record<string, unknown> = {}) {
  return { id: "u1", name: "Ana", role: "STUDENT", membership: "free", membershipSince: null, ...extra };
}

async function post(body: Record<string, unknown> | undefined, user: any = userFree()) {
  box.user = user;
  const res = await POST(jsonReq("/api/membership", body));
  return { status: res.status, json: await res.json() };
}

async function get(user: any) {
  box.user = user;
  const res = await GET();
  return { status: res.status, json: await res.json() };
}

beforeEach(() => {
  db.reset();
  vi.clearAllMocks();
  // user.update devuelve lo que recibe (la ruta lee updated.membership / updated.membershipSince).
  db.fn("user.update").mockImplementation(async ({ data }: any) => ({ id: "u1", ...data }));
  db.fn("activityEvent.create").mockResolvedValue({ id: "act-1" });
});

describe("GET /api/membership — plan actual", () => {
  it("sin sesión → 401 con code 'auth'", async () => {
    const { status, json } = await get(null);
    expect(status).toBe(401);
    expect(json).toMatchObject({ ok: false, error: "No autenticado", code: "auth" });
  });

  it("plan free sin antigüedad → tier free, sinceLabel null", async () => {
    const { status, json } = await get(userFree());
    expect(status).toBe(200);
    expect(json).toEqual({ ok: true, tier: "free", sinceLabel: null });
  });

  it("plan pro con membershipSince → etiqueta legible 'mes año'", async () => {
    // 15 de junio de 2026 (getMonth()=5 → "junio").
    const { status, json } = await get(userFree({ membership: "pro", membershipSince: new Date(2026, 5, 15) }));
    expect(status).toBe(200);
    expect(json).toEqual({ ok: true, tier: "pro", sinceLabel: "junio 2026" });
  });
});

describe("POST /api/membership — gates de entrada", () => {
  it("sin sesión → 401", async () => {
    const { status, json } = await post({ tier: "pro" }, null);
    expect(status).toBe(401);
    expect(json).toMatchObject({ ok: false, error: "No autenticado" });
    expect(db.fn("user.update")).not.toHaveBeenCalled();
  });

  it("tier 'elite' → 400 'Elite llega próximamente' (no contratable aún)", async () => {
    const { status, json } = await post({ tier: "elite" });
    expect(status).toBe(400);
    expect(json.error).toBe("Elite llega próximamente");
    expect(db.fn("user.update")).not.toHaveBeenCalled();
  });

  it("tier desconocido → 400 'Plan inválido'", async () => {
    const { status, json } = await post({ tier: "gold" });
    expect(status).toBe(400);
    expect(json.error).toBe("Plan inválido");
    expect(db.fn("user.update")).not.toHaveBeenCalled();
  });

  it("tier ausente → 400 'Plan inválido' (clean('') no es free ni pro)", async () => {
    const { status, json } = await post({});
    expect(status).toBe(400);
    expect(json.error).toBe("Plan inválido");
  });

  it("tier con mayúsculas/espacios se normaliza: ' PRO ' → válido", async () => {
    const { status, json } = await post({ tier: " PRO " });
    expect(status).toBe(200);
    expect(json.tier).toBe("pro");
    expect(db.fn("user.update")).toHaveBeenCalledOnce();
  });
});

describe("POST /api/membership — transiciones de estado (suscripción simulada)", () => {
  it("free → pro: escribe membership 'pro' + arranca membershipSince (Date) y loguea al ledger", async () => {
    const { status, json } = await post({ tier: "pro" }, userFree());
    expect(status).toBe(200);
    expect(json.tier).toBe("pro");

    const arg = db.fn("user.update").mock.calls[0][0];
    expect(arg.where).toEqual({ id: "u1" });
    expect(arg.data.membership).toBe("pro");
    expect(arg.data.membershipSince).toBeInstanceOf(Date);

    // Ledger universal: el cambio de plan queda registrado como membership_changed.
    expect(db.fn("activityEvent.create")).toHaveBeenCalledOnce();
    const act = db.fn("activityEvent.create").mock.calls[0][0].data;
    expect(act).toMatchObject({
      userId: "u1",
      type: "membership_changed",
      title: "Activó OTR Pro",
      source: "billing",
    });
    expect(JSON.parse(act.meta)).toEqual({ from: "free", to: "pro" });
  });

  it("pro → free: limpia membershipSince (null) y loguea 'Volvió al plan Free'", async () => {
    const proUser = userFree({ membership: "pro", membershipSince: new Date(2026, 0, 1) });
    const { status, json } = await post({ tier: "free" }, proUser);
    expect(status).toBe(200);
    expect(json.tier).toBe("free");

    const arg = db.fn("user.update").mock.calls[0][0];
    expect(arg.data.membership).toBe("free");
    expect(arg.data.membershipSince).toBeNull();

    const act = db.fn("activityEvent.create").mock.calls[0][0].data;
    expect(act.title).toBe("Volvió al plan Free");
    expect(JSON.parse(act.meta)).toEqual({ from: "pro", to: "free" });
  });

  it("idempotente: ya en 'pro' y pide 'pro' → NO re-escribe ni vuelve a loguear", async () => {
    const proUser = userFree({ membership: "pro", membershipSince: new Date(2026, 5, 15) });
    const { status, json } = await post({ tier: "pro" }, proUser);
    expect(status).toBe(200);
    // Devuelve el estado actual con su etiqueta, sin tocar nada.
    expect(json).toEqual({ ok: true, tier: "pro", sinceLabel: "junio 2026" });
    expect(db.fn("user.update")).not.toHaveBeenCalled();
    expect(db.fn("activityEvent.create")).not.toHaveBeenCalled();
  });

  it("idempotente: ya en 'free' y pide 'free' → NO re-escribe ni loguea", async () => {
    const { status, json } = await post({ tier: "free" }, userFree());
    expect(status).toBe(200);
    expect(json).toEqual({ ok: true, tier: "free", sinceLabel: null });
    expect(db.fn("user.update")).not.toHaveBeenCalled();
    expect(db.fn("activityEvent.create")).not.toHaveBeenCalled();
  });
});
