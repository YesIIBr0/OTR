// [BE-TEST · F6.1] Integración de POST /api/cron/reminders (recordatorios de sesión).
// Protege el contrato completo del job:
//   · Gate del secreto FAIL-CLOSED: sin CRON_SECRET en el entorno → 503; header ausente/incorrecto → 401.
//   · Selección: solo reservas CONFIRMED, reminderSentAt NULL, slotAt en la ventana de 24h.
//   · Envío a alumno Y coach; preferencia session_reminders apagada de uno → no le manda pero NO
//     bloquea al otro; ambos apagados → 0 envíos pero SÍ marca (idempotencia procesal).
//   · Marca Booking.reminderSentAt tras procesar; correr dos veces no re-envía (la query filtra null).
// Mockea Prisma (harness), mail (sendMail/emailShell/emailButton) y notify. dateLabel/timeLabel,
// esc y wantsNotification corren REALES (lógica pura que también queremos ejercitar).
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { makeDb } from "./helpers/route-harness";

// Caja hoisteada: el Proxy reenvía perezosamente a box.db.db (relleno en la evaluación del módulo).
const box = vi.hoisted(() => ({ db: null as any }));
vi.mock("../app/lib/db", () => ({
  db: new Proxy({}, { get: (_t, p: string) => (p === "then" ? undefined : box.db.db[p]) }),
}));
// sendMail/notify no lanzan en producción; aquí son espías. emailShell/emailButton se dejan como
// funciones simples (el route las invoca antes de sendMail; su salida no se asevera).
vi.mock("../app/lib/mail", () => ({
  sendMail: vi.fn(),
  emailShell: (title: string, body: string) => `${title}|${body}`,
  emailButton: (label: string, href: string) => `${label}:${href}`,
}));
vi.mock("../app/lib/notify", () => ({ notify: vi.fn() }));

import { POST } from "../app/api/cron/reminders/route";
import { sendMail } from "../app/lib/mail";
import { notify } from "../app/lib/notify";

box.db = makeDb();
const db = box.db;
const SECRET = "test-cron-secret-abc";

function call(headers: Record<string, string> = {}) {
  return POST(new Request("http://test.local/api/cron/reminders", { method: "POST", headers }));
}
// Una sesión dentro de la ventana de 24h.
const soon = () => new Date(Date.now() + 2 * 3600 * 1000);
function booking(over: Record<string, any> = {}) {
  return {
    id: "b1",
    slotAt: soon(),
    student: { id: "s1", name: "Ana", email: "ana@x.com", notificationPrefs: null },
    coach: { id: "c1", name: "Beto", email: "beto@x.com", notificationPrefs: null },
    ...over,
  };
}

beforeEach(() => {
  db.reset();
  vi.clearAllMocks();
  process.env.CRON_SECRET = SECRET;
  process.env.APP_URL = "https://otr.test";
});
afterEach(() => {
  delete process.env.CRON_SECRET;
  delete process.env.APP_URL;
});

describe("POST /api/cron/reminders — gate del secreto (fail-closed)", () => {
  it("sin CRON_SECRET en el entorno → 503 y no toca la DB", async () => {
    delete process.env.CRON_SECRET;
    const res = await call({ "x-cron-secret": SECRET });
    expect(res.status).toBe(503);
    expect(db.fn("booking.findMany")).not.toHaveBeenCalled();
  });

  it("header ausente → 401", async () => {
    const res = await call();
    expect(res.status).toBe(401);
    expect(db.fn("booking.findMany")).not.toHaveBeenCalled();
  });

  it("header incorrecto → 401", async () => {
    const res = await call({ "x-cron-secret": "no-es-el-secreto" });
    expect(res.status).toBe(401);
    expect(db.fn("booking.findMany")).not.toHaveBeenCalled();
  });
});

describe("POST /api/cron/reminders — selección de reservas", () => {
  it("secreto OK, sin reservas → 200 y consulta CONFIRMED + reminderSentAt null + ventana 24h", async () => {
    db.fn("booking.findMany").mockResolvedValue([]);
    const res = await call({ "x-cron-secret": SECRET });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.processed).toBe(0);
    expect(json.reminded).toBe(0);

    const arg = db.fn("booking.findMany").mock.calls[0][0];
    expect(arg.where.status).toBe("CONFIRMED");
    expect(arg.where.reminderSentAt).toBeNull();
    expect(arg.where.slotAt.gte).toBeInstanceOf(Date);
    expect(arg.where.slotAt.lte).toBeInstanceOf(Date);
    // La ventana es exactamente 24h.
    expect(arg.where.slotAt.lte.getTime() - arg.where.slotAt.gte.getTime()).toBe(24 * 3600 * 1000);
    expect(arg.take).toBe(200); // cota defensiva
  });
});

describe("POST /api/cron/reminders — envío a alumno y coach", () => {
  it("ambos con preferencia por defecto → email + notify a los dos y marca reminderSentAt", async () => {
    db.fn("booking.findMany").mockResolvedValue([booking()]);
    db.fn("booking.update").mockResolvedValue({});

    const res = await call({ "x-cron-secret": SECRET });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.processed).toBe(1);
    expect(json.reminded).toBe(1);

    expect(sendMail).toHaveBeenCalledTimes(2);
    const tos = vi.mocked(sendMail).mock.calls.map((c) => (c[0] as any).to).sort();
    expect(tos).toEqual(["ana@x.com", "beto@x.com"]);
    expect(notify).toHaveBeenCalledTimes(2);
    const userIds = vi.mocked(notify).mock.calls.map((c) => (c[0] as any).userId).sort();
    expect(userIds).toEqual(["c1", "s1"]);

    // Sella la marca de idempotencia con una fecha real.
    const upd = db.fn("booking.update").mock.calls[0][0];
    expect(upd.where).toEqual({ id: "b1" });
    expect(upd.data.reminderSentAt).toBeInstanceOf(Date);
  });

  it("preferencia del alumno apagada → solo el coach recibe, pero marca igual (no bloquea al otro)", async () => {
    db.fn("booking.findMany").mockResolvedValue([
      booking({ student: { id: "s1", name: "Ana", email: "ana@x.com", notificationPrefs: JSON.stringify({ session_reminders: false }) } }),
    ]);
    db.fn("booking.update").mockResolvedValue({});

    const res = await call({ "x-cron-secret": SECRET });
    const json = await res.json();
    expect(sendMail).toHaveBeenCalledTimes(1);
    expect((vi.mocked(sendMail).mock.calls[0][0] as any).to).toBe("beto@x.com");
    expect(notify).toHaveBeenCalledTimes(1);
    expect((vi.mocked(notify).mock.calls[0][0] as any).userId).toBe("c1");
    expect(db.fn("booking.update")).toHaveBeenCalledTimes(1);
    expect(json.reminded).toBe(1);
  });

  it("ambos con la preferencia apagada → 0 envíos pero SÍ marca reminderSentAt (idempotencia procesal)", async () => {
    db.fn("booking.findMany").mockResolvedValue([
      booking({
        student: { id: "s1", name: "Ana", email: "ana@x.com", notificationPrefs: JSON.stringify({ session_reminders: false }) },
        coach: { id: "c1", name: "Beto", email: "beto@x.com", notificationPrefs: JSON.stringify({ session_reminders: false }) },
      }),
    ]);
    db.fn("booking.update").mockResolvedValue({});

    const res = await call({ "x-cron-secret": SECRET });
    const json = await res.json();
    expect(sendMail).not.toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalled();
    expect(db.fn("booking.update")).toHaveBeenCalledTimes(1);
    expect(json.reminded).toBe(0);
    expect(json.processed).toBe(1);
  });
});

describe("POST /api/cron/reminders — idempotencia real", () => {
  it("correr dos veces no re-envía: la query filtra reminderSentAt null (2ª corrida ya no la trae)", async () => {
    db.fn("booking.findMany").mockResolvedValueOnce([booking()]).mockResolvedValueOnce([]);
    db.fn("booking.update").mockResolvedValue({});

    await call({ "x-cron-secret": SECRET }); // 1ª: manda a ambos y marca
    await call({ "x-cron-secret": SECRET }); // 2ª: reminderSentAt ya seteado → 0 reservas

    expect(sendMail).toHaveBeenCalledTimes(2); // solo la primera corrida
    expect(notify).toHaveBeenCalledTimes(2);
    expect(db.fn("booking.update")).toHaveBeenCalledTimes(1);
  });
});
