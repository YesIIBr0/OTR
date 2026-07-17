// [BE-TEST · DINERO F5.1] Integración de POST /api/stripe/webhook — la FUENTE DE VERDAD del
// acceso pagado (el redirect success_url es falsificable; el acceso se concede aquí tras
// verificar la firma del evento). Esta suite BLINDA el flujo antes de conectar Stripe real (F7):
//   · sin credenciales (STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET) → 503 sin tocar nada,
//   · firma inválida → 400 SIN tocar la DB,
//   · checkout.session.completed válido → crea Enrollment source="PAID" + studentsCount++,
//   · misma sesión ya inscrita → no duplica (idempotencia por unicidad de Enrollment),
//   · metadata incompleta / tipo de evento desconocido → 200 sin efecto.
// Mockea el SDK "stripe" (vi.mock) para controlar constructEvent sin claves reales, y Prisma
// (harness). NO se usa ninguna clave real: la firma se simula vía el mock de constructEvent.
//
// GAP DOCUMENTADO PARA F7 (ver test "replay del mismo event.id"): la ruta NO lleva un ledger
// de event.id procesados. Su idempotencia depende EXCLUSIVAMENTE de la unicidad de Enrollment
// (userId_courseId): si el mismo evento llega dos veces ANTES de que la inscripción exista en
// la DB, se crea DOS veces. Con Stripe real (reintentos de webhook) hace falta dedupe por
// event.id + registro de pago. El test lo deja fijado como comportamiento actual, no lo arregla.
import { describe, it, expect, beforeEach, vi } from "vitest";
import { makeDb } from "./helpers/route-harness";

// Caja hoisteada: db (Proxy perezoso del harness) + `ev`, el vi.fn que suplanta a
// stripe.webhooks.constructEvent. El factory de vi.mock solo puede tocar `vi` y esta caja.
const box = vi.hoisted(() => ({ db: null as any, ev: null as any }));
vi.mock("../app/lib/db", () => ({
  db: new Proxy({}, { get: (_t, p: string) => (p === "then" ? undefined : box.db.db[p]) }),
}));
// SDK de Stripe falso: `new Stripe(key).webhooks.constructEvent(...)` reenvía a box.ev, que
// cada test configura para devolver un evento o lanzar (firma inválida). Sin red ni claves.
vi.mock("stripe", () => ({
  default: class FakeStripe {
    webhooks = { constructEvent: (...a: any[]) => box.ev(...a) };
  },
}));

import { POST } from "../app/api/stripe/webhook/route";

box.db = makeDb();
const db = box.db;

const USER_ID = "student-1";
const COURSE_ID = "course-1";

// Construye el POST crudo del webhook: cuerpo texto (la ruta usa req.text()) + firma.
function webhookReq(body: string, sig = "t=1,v1=firma"): Request {
  return new Request("http://test.local/api/stripe/webhook", {
    method: "POST",
    headers: { "stripe-signature": sig },
    body,
  });
}

function completedEvent(metadata: Record<string, string> | undefined, id = "evt_1") {
  return { id, type: "checkout.session.completed", data: { object: { metadata } } };
}

beforeEach(() => {
  db.reset();
  vi.clearAllMocks();
  process.env.STRIPE_SECRET_KEY = "sk_test_dummy_no_real";
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_dummy_no_real";
  box.ev = vi.fn();
  db.fn("enrollment.findUnique").mockResolvedValue(null);
  db.fn("enrollment.create").mockResolvedValue({ id: "enr-1" });
  db.fn("course.update").mockResolvedValue({ id: COURSE_ID });
});

describe("POST /api/stripe/webhook — configuración ausente", () => {
  it("sin STRIPE_SECRET_KEY → 503 sin verificar firma ni tocar DB", async () => {
    delete process.env.STRIPE_SECRET_KEY;
    const res = await POST(webhookReq("{}"));
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe("Stripe no configurado");
    expect(box.ev).not.toHaveBeenCalled();
    expect(db.fn("enrollment.create")).not.toHaveBeenCalled();
  });

  it("sin STRIPE_WEBHOOK_SECRET → 503", async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
    const res = await POST(webhookReq("{}"));
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe("Stripe no configurado");
    expect(box.ev).not.toHaveBeenCalled();
  });
});

describe("POST /api/stripe/webhook — verificación de firma", () => {
  it("firma inválida → 400 SIN tocar la DB", async () => {
    box.ev.mockImplementation(() => {
      throw new Error("No signatures found matching the expected signature");
    });
    const res = await POST(webhookReq("cuerpo-crudo", "firma-mala"));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/^Firma inválida:/);
    // Ninguna operación de DB ante firma inválida.
    expect(db.fn("enrollment.findUnique")).not.toHaveBeenCalled();
    expect(db.fn("enrollment.create")).not.toHaveBeenCalled();
    expect(db.fn("course.update")).not.toHaveBeenCalled();
  });

  it("pasa el cuerpo crudo, la firma y el secret a constructEvent", async () => {
    box.ev.mockReturnValue(completedEvent({ courseId: COURSE_ID, userId: USER_ID }));
    await POST(webhookReq("cuerpo-crudo-exacto", "sig-abc"));
    expect(box.ev).toHaveBeenCalledWith("cuerpo-crudo-exacto", "sig-abc", "whsec_test_dummy_no_real");
  });
});

describe("POST /api/stripe/webhook — checkout.session.completed", () => {
  it("evento válido, no inscrito → crea Enrollment PAID + suma studentsCount, responde received:true", async () => {
    box.ev.mockReturnValue(completedEvent({ courseId: COURSE_ID, userId: USER_ID }));
    const res = await POST(webhookReq("{}"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true });

    expect(db.fn("enrollment.findUnique")).toHaveBeenCalledWith({
      where: { userId_courseId: { userId: USER_ID, courseId: COURSE_ID } },
    });
    expect(db.fn("enrollment.create")).toHaveBeenCalledWith({
      data: { userId: USER_ID, courseId: COURSE_ID, status: "ACTIVE", source: "PAID", lastAccess: "ahora" },
    });
    expect(db.fn("course.update")).toHaveBeenCalledWith({
      where: { id: COURSE_ID },
      data: { studentsCount: { increment: 1 } },
    });
  });

  it("sesión ya inscrita → no duplica (idempotente por unicidad de Enrollment)", async () => {
    db.fn("enrollment.findUnique").mockResolvedValue({ userId: USER_ID, courseId: COURSE_ID, status: "ACTIVE" });
    box.ev.mockReturnValue(completedEvent({ courseId: COURSE_ID, userId: USER_ID }));
    const res = await POST(webhookReq("{}"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true });
    expect(db.fn("enrollment.create")).not.toHaveBeenCalled();
    expect(db.fn("course.update")).not.toHaveBeenCalled();
  });

  it("metadata sin courseId/userId → 200 received:true SIN inscribir", async () => {
    box.ev.mockReturnValue(completedEvent({ userId: USER_ID })); // falta courseId
    const res = await POST(webhookReq("{}"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true });
    expect(db.fn("enrollment.findUnique")).not.toHaveBeenCalled();
    expect(db.fn("enrollment.create")).not.toHaveBeenCalled();
  });

  it("metadata ausente por completo → 200 sin efecto", async () => {
    box.ev.mockReturnValue(completedEvent(undefined));
    const res = await POST(webhookReq("{}"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true });
    expect(db.fn("enrollment.create")).not.toHaveBeenCalled();
  });

  // GAP F7: la ruta NO deduplica por event.id. Si el mismo evento llega dos veces antes de que
  // la inscripción exista (findUnique null en ambas), CREA DOS VECES. En producción real la
  // unicidad de Enrollment en la DB lo frenaría en la 2ª, pero no hay registro de pago/evento.
  it("[GAP F7] replay del mismo event.id sin dedupe → crea dos veces (no hay ledger de eventos)", async () => {
    box.ev.mockReturnValue(completedEvent({ courseId: COURSE_ID, userId: USER_ID }, "evt_repetido"));
    await POST(webhookReq("{}")); // primera entrega
    await POST(webhookReq("{}")); // reintento de Stripe, mismo event.id
    // Con la DB mockeada (findUnique null siempre) queda a la vista que NO consulta event.id:
    expect(db.fn("enrollment.create")).toHaveBeenCalledTimes(2);
  });
});

describe("POST /api/stripe/webhook — otros tipos de evento", () => {
  it("tipo desconocido (payment_intent.succeeded) → 200 received:true sin efecto", async () => {
    box.ev.mockReturnValue({ id: "evt_x", type: "payment_intent.succeeded", data: { object: {} } });
    const res = await POST(webhookReq("{}"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true });
    expect(db.fn("enrollment.findUnique")).not.toHaveBeenCalled();
    expect(db.fn("enrollment.create")).not.toHaveBeenCalled();
    expect(db.fn("course.update")).not.toHaveBeenCalled();
  });
});
