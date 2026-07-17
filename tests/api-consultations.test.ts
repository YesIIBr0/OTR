// [BE-TEST · F5.3] Integración de /api/consultations (+ /availability).
// FIJA EL COMPORTAMIENTO ACTUAL: el flujo público de reserva está APAGADO por bandera
// (CONSULTA_ENABLED=false, PRD-estricto) → POST responde SIEMPRE 410 y corta ANTES de tocar la
// DB o el rate-limit. Por eso NO se pueden ejercitar "reserva válida / doble-reserva" contra el
// route real (ver reporte). Sí protegemos:
//   POST — 410 (desactivado), sin efectos.
//   GET  — solo ADMIN lee los leads (traen PII de visitantes; TEACHER es auto-registrable → 403).
//   /availability GET — público: día cerrado / fecha inválida → sin slots; día abierto resta las
//     reservas activas del slot.
// Mockea Prisma + sesión.
import { describe, it, expect, beforeEach, vi } from "vitest";
import { makeDb, jsonReq } from "./helpers/route-harness";
import { computeSlotsForDate } from "../app/lib/consultations";

// Caja hoisteada (los factory de vi.mock se elevan sobre los imports; solo pueden tocar
// `vi` y vars de vi.hoisted). El Proxy reenvía perezosamente a box.db.db.
const box = vi.hoisted(() => ({ db: null as any, user: null as any }));
vi.mock("../app/lib/db", () => ({
  db: new Proxy({}, { get: (_t, p: string) => (p === "then" ? undefined : box.db.db[p]) }),
}));
vi.mock("../app/lib/auth", () => ({ setSession: vi.fn(), getSessionUser: () => box.user, clearSession: vi.fn() }));

import { POST, GET } from "../app/api/consultations/route";
import { GET as AVAIL_GET } from "../app/api/consultations/availability/route";

box.db = makeDb();
const db = box.db;

// Zona fija America/Santo_Domingo (UTC-4): calendario local a partir de un instante UTC.
function sdDateStr(tMs: number): string {
  const ld = new Date(tMs - 4 * 3600 * 1000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${ld.getUTCFullYear()}-${p(ld.getUTCMonth() + 1)}-${p(ld.getUTCDate())}`;
}
// Primer día ABIERTO y dentro del horizonte reservable (Lun-Sáb, 12h..30d) según el propio helper.
function firstOpenDate(): { date: string; slots: ReturnType<typeof computeSlotsForDate> } {
  for (let i = 2; i < 28; i++) {
    const date = sdDateStr(Date.now() + i * 24 * 3600 * 1000);
    const slots = computeSlotsForDate(date);
    if (slots.length) return { date, slots };
  }
  throw new Error("no se encontró un día abierto en el horizonte (revisar helper de consultas)");
}
// Un DOMINGO (día cerrado) dentro del horizonte → aísla el motivo de "sin slots" al día cerrado.
function firstClosedSunday(): string {
  for (let i = 2; i < 28; i++) {
    const date = sdDateStr(Date.now() + i * 24 * 3600 * 1000);
    const [y, m, d] = date.split("-").map(Number);
    if (new Date(Date.UTC(y, m - 1, d)).getUTCDay() === 0) return date; // 0 = domingo
  }
  throw new Error("no se encontró un domingo en el horizonte");
}

async function availability(date: string) {
  const res = await AVAIL_GET(new Request(`http://test.local/api/consultations/availability?date=${date}`));
  return { status: res.status, json: await res.json() };
}

beforeEach(() => {
  db.reset();
  vi.clearAllMocks();
  box.user = null;
});

describe("POST /api/consultations — flujo público APAGADO (bandera PRD-estricta)", () => {
  it("devuelve 410 y no toca la DB (corta antes del rate-limit y de crear la reserva)", async () => {
    const res = await POST(
      jsonReq("/api/consultations", { name: "Lead Uno", email: "lead@x.com", slotAt: firstOpenDate().slots[0].iso }),
    );
    const json = await res.json();
    expect(res.status).toBe(410);
    expect(json.ok).toBe(false);
    expect(db.fn("consultationBooking.findFirst")).not.toHaveBeenCalled();
    expect(db.fn("consultationBooking.create")).not.toHaveBeenCalled();
  });
});

describe("GET /api/consultations — solo ADMIN ve los leads (PII)", () => {
  it("sin sesión → 401", async () => {
    box.user = null;
    const res = await GET();
    expect(res.status).toBe(401);
    expect(db.fn("consultationBooking.findMany")).not.toHaveBeenCalled();
  });

  it("STUDENT → 403", async () => {
    box.user = { id: "s1", role: "STUDENT" };
    const res = await GET();
    expect(res.status).toBe(403);
    expect(db.fn("consultationBooking.findMany")).not.toHaveBeenCalled();
  });

  it("TEACHER → 403 (cuenta auto-registrable, nunca ve PII de visitantes)", async () => {
    box.user = { id: "t1", role: "TEACHER" };
    const res = await GET();
    expect(res.status).toBe(403);
    expect(db.fn("consultationBooking.findMany")).not.toHaveBeenCalled();
  });

  it("ADMIN → 200: próximas reservas (slotAt >= ahora) ordenadas asc", async () => {
    box.user = { id: "a1", role: "ADMIN" };
    db.fn("consultationBooking.findMany").mockResolvedValue([{ id: "cb1" }]);
    const res = await GET();
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.bookings).toEqual([{ id: "cb1" }]);
    const arg = db.fn("consultationBooking.findMany").mock.calls[0][0];
    expect(arg.orderBy).toEqual({ slotAt: "asc" });
    expect(arg.where.slotAt.gte).toBeInstanceOf(Date);
  });
});

describe("GET /api/consultations/availability — slots libres (público)", () => {
  it("fecha inválida → { slots: [] } sin consultar reservas", async () => {
    const { status, json } = await availability("no-es-fecha");
    expect(status).toBe(200);
    expect(json.slots).toEqual([]);
    expect(db.fn("consultationBooking.findMany")).not.toHaveBeenCalled();
  });

  it("día cerrado (domingo) → { slots: [] } sin consultar reservas", async () => {
    // Un domingo dentro del horizonte: el helper corta por día cerrado antes de tocar la DB.
    const { status, json } = await availability(firstClosedSunday());
    expect(status).toBe(200);
    expect(json.slots).toEqual([]);
    expect(db.fn("consultationBooking.findMany")).not.toHaveBeenCalled();
  });

  it("día abierto → resta del listado el slot que ya está reservado (activo)", async () => {
    const { date, slots } = firstOpenDate();
    // Una reserva activa cae en el primer slot del día → debe desaparecer del resultado.
    db.fn("consultationBooking.findMany").mockResolvedValue([{ slotAt: new Date(slots[0].iso) }]);

    const { status, json } = await availability(date);
    expect(status).toBe(200);
    expect(db.fn("consultationBooking.findMany")).toHaveBeenCalledOnce();
    // Solo se consideran reservas NO canceladas.
    expect(db.fn("consultationBooking.findMany").mock.calls[0][0].where.status).toEqual({ not: "CANCELLED" });
    // El slot ocupado ya no aparece; los demás sí.
    const isos = json.slots.map((s: any) => s.iso);
    expect(isos).not.toContain(slots[0].iso);
    expect(json.slots.length).toBe(slots.length - 1);
  });
});
