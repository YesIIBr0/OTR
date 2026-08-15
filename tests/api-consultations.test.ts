// [BE-TEST · F5.3] Integración de /api/consultations (+ /availability).
// FIJA EL CONTRATO:
//   POST ANÓNIMO — sigue 410 (bandera CONSULTA_ENABLED=false, decisión PRD-estricta del
//     10 jun 2026: el funnel público /consulta no está en el PDF). Corta ANTES de tocar la
//     DB y el rate-limit. Esto NO se ha abierto y el test lo custodia.
//   POST CON SESIÓN [A4] — permitido: es el paso 2 del flujo de admisión ("Llamada de
//     Descubrimiento"), que se agenda desde la app. La identidad (nombre y correo) sale de la
//     SESIÓN, nunca del body: si no, cualquiera se suplantaría en la lista de leads del admin
//     y usaría el correo de confirmación como relay a una dirección arbitraria.
//   GET  — solo ADMIN lee los leads (traen PII de visitantes; TEACHER es auto-registrable → 403).
//   /availability GET — público: día cerrado / fecha inválida → sin slots; día abierto resta las
//     reservas activas del slot.
// Mockea Prisma + sesión + correo.
import { describe, it, expect, beforeEach, vi } from "vitest";
import { makeDb, jsonReq } from "./helpers/route-harness";
import { computeSlotsForDate } from "../app/lib/consultations";

// Caja hoisteada (los factory de vi.mock se elevan sobre los imports; solo pueden tocar
// `vi` y vars de vi.hoisted). El Proxy reenvía perezosamente a box.db.db.
const box = vi.hoisted(() => ({ db: null as any, user: null as any, mail: null as any }));
vi.mock("../app/lib/db", () => ({
  db: new Proxy({}, { get: (_t, p: string) => (p === "then" ? undefined : box.db.db[p]) }),
}));
vi.mock("../app/lib/auth", () => ({ setSession: vi.fn(), getSessionUser: () => box.user, clearSession: vi.fn() }));
vi.mock("../app/lib/mail", () => ({
  sendMail: (...a: unknown[]) => box.mail(...a),
  emailShell: (t: string, b: string) => `<html>${t}${b}</html>`,
  emailButton: vi.fn(),
}));

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

// El rate-limit vive en un mapa de módulo compartido por TODO el archivo: cada test usa un
// id de usuario distinto para no contaminarse con las cuentas de los demás.
let seq = 0;
function student(over: Record<string, unknown> = {}) {
  seq++;
  return { id: `stu-${seq}`, name: "Analía Reyes", email: `analia${seq}@otr.do`, role: "STUDENT", ...over };
}

async function reservar(body: Record<string, unknown>) {
  const res = await POST(jsonReq("/api/consultations", body));
  return { status: res.status, json: await res.json().catch(() => ({})) };
}

beforeEach(() => {
  db.reset();
  vi.clearAllMocks();
  box.user = null;
  box.mail = vi.fn().mockResolvedValue(undefined);
  db.fn("consultationBooking.findFirst").mockResolvedValue(null);
  db.fn("consultationBooking.create").mockResolvedValue({ id: "cb-1" });
});

describe("POST /api/consultations — el funnel PÚBLICO ANÓNIMO sigue APAGADO", () => {
  it("sin sesión → 410 y no toca la DB (corta antes del rate-limit y de crear la reserva)", async () => {
    const res = await POST(
      jsonReq("/api/consultations", { name: "Lead Uno", email: "lead@x.com", slotAt: firstOpenDate().slots[0].iso }),
    );
    const json = await res.json();
    expect(res.status).toBe(410);
    expect(json.ok).toBe(false);
    expect(db.fn("consultationBooking.findFirst")).not.toHaveBeenCalled();
    expect(db.fn("consultationBooking.create")).not.toHaveBeenCalled();
    expect(box.mail).not.toHaveBeenCalled();
  });
});

describe("POST /api/consultations — CON SESIÓN: paso 2 del flujo de admisión [A4]", () => {
  it("un alumno autenticado crea su reserva (200) con la identidad de la SESIÓN", async () => {
    const u = student();
    box.user = u;
    const iso = firstOpenDate().slots[0].iso;
    const { status, json } = await reservar({ slotAt: iso, goal: "Quiero competir en PF" });

    expect(status).toBe(200);
    expect(json.booking.id).toBe("cb-1");
    const data = db.fn("consultationBooking.create").mock.calls[0][0].data;
    expect(data.name).toBe(u.name);
    expect(data.email).toBe(u.email);
    expect(data.userId).toBe(u.id);
    expect(data.goal).toBe("Quiero competir en PF");
    expect(data.status).toBe("CONFIRMED");
    expect(data.slotAt).toEqual(new Date(iso));
  });

  it("IGNORA name/email del body: ni suplantación en la lista de leads ni relay del correo", async () => {
    const u = student();
    box.user = u;
    const { status } = await reservar({
      slotAt: firstOpenDate().slots[0].iso,
      name: "Admin OTR",
      email: "victima@banco.com",
    });
    expect(status).toBe(200);
    const data = db.fn("consultationBooking.create").mock.calls[0][0].data;
    expect(data.name).toBe(u.name);
    expect(data.email).toBe(u.email);
    // El correo de confirmación va SIEMPRE a la dirección de la sesión.
    expect(box.mail.mock.calls[0][0].to).toBe(u.email);
  });

  it("slot inválido → 400 sin crear nada", async () => {
    box.user = student();
    const { status } = await reservar({ slotAt: "2020-01-01T05:00:00Z" });
    expect(status).toBe(400);
    expect(db.fn("consultationBooking.create")).not.toHaveBeenCalled();
  });

  it("slot ya reservado por otro → 409 sin crear nada", async () => {
    box.user = student();
    db.fn("consultationBooking.findFirst").mockResolvedValue({ id: "cb-ocupada" });
    const { status } = await reservar({ slotAt: firstOpenDate().slots[0].iso });
    expect(status).toBe(409);
    expect(db.fn("consultationBooking.create")).not.toHaveBeenCalled();
  });

  it("rate-limit POR USUARIO (5/10 min): la 6.ª intentona → 429", async () => {
    const u = student();
    box.user = u;
    const slots = firstOpenDate().slots;
    for (let i = 0; i < 5; i++) {
      expect((await reservar({ slotAt: slots[i % slots.length].iso })).status).toBe(200);
    }
    const { status } = await reservar({ slotAt: slots[0].iso });
    expect(status).toBe(429);
    expect(db.fn("consultationBooking.create")).toHaveBeenCalledTimes(5);
  });

  it("el rate-limit de un alumno NO afecta a otro (la clave es el usuario, no la IP)", async () => {
    const slots = firstOpenDate().slots;
    box.user = student();
    for (let i = 0; i < 5; i++) await reservar({ slotAt: slots[0].iso });
    expect((await reservar({ slotAt: slots[0].iso })).status).toBe(429);
    box.user = student(); // otro alumno, misma "IP"
    expect((await reservar({ slotAt: slots[0].iso })).status).toBe(200);
  });

  it("un PARENT autenticado también puede agendar (la bandera cerraba el ANÓNIMO, no la sesión)", async () => {
    box.user = student({ role: "PARENT", name: "Rosa Fermín" });
    const { status } = await reservar({ slotAt: firstOpenDate().slots[0].iso });
    expect(status).toBe(200);
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
