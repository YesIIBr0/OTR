// [BE-TEST] Integración de PATCH /api/bookings/[id] — transiciones de una reserva
// (approve/complete/cancel/recording) y sus gates de rol/propiedad (PRD §7).
// Mockea Prisma + sesión + mail (harness). Ejercita la LÓGICA real del handler.
import { describe, it, expect, beforeEach, vi } from "vitest";
import { makeDb, jsonReq } from "./helpers/route-harness";

const box = vi.hoisted(() => ({ db: null as any, user: null as any }));
vi.mock("../app/lib/db", () => ({
  db: new Proxy({}, { get: (_t, p: string) => (p === "then" ? undefined : box.db.db[p]) }),
}));
vi.mock("../app/lib/auth", () => ({ setSession: vi.fn(), getSessionUser: () => box.user, clearSession: vi.fn() }));
vi.mock("../app/lib/mail", () => ({
  sendMail: vi.fn(),
  emailShell: vi.fn((title: string, body: string) => `<html>${title}${body}</html>`),
  emailButton: vi.fn(() => "<a>btn</a>"),
  sendPasswordReset: vi.fn(),
  hashToken: (x: string) => x,
}));

import { PATCH } from "../app/api/bookings/[id]/route";
import { sendMail } from "../app/lib/mail";

box.db = makeDb();
const db = box.db;

function makeBooking(overrides: Record<string, unknown> = {}) {
  return {
    id: "b1",
    studentId: "student1",
    coachId: "coach1",
    consentBy: "parent1",
    status: "PENDING",
    priceCents: 5000,
    videoUrl: null,
    recordingUrl: null,
    slotAt: new Date().toISOString(),
    escrow: null,
    ...overrides,
  };
}

async function patchBooking(id: string, body: Record<string, unknown>) {
  const res = await PATCH(jsonReq(`/api/bookings/${id}`, body, "PATCH"), {
    params: Promise.resolve({ id }),
  });
  const json = await res.json();
  return { status: res.status, json };
}

beforeEach(() => {
  db.reset();
  vi.clearAllMocks();
  // Defaults razonables; cada test sobreescribe lo que necesite (booking.findUnique sobre todo).
  db.fn("booking.findUnique").mockResolvedValue(null);
  db.fn("booking.update").mockImplementation(async ({ where, data }: any) => ({
    id: where.id,
    status: data.status,
    videoUrl: data.videoUrl,
  }));
  db.fn("escrowTxn.create").mockImplementation(async ({ data }: any) => ({ id: "e-new", ...data }));
  db.fn("escrowTxn.updateMany").mockResolvedValue({ count: 1 });
  db.fn("coachSession.upsert").mockResolvedValue({ id: "cs1" });
  db.fn("user.update").mockResolvedValue({ id: "student1", xp: 25 });
  db.fn("user.findUnique").mockResolvedValue(null);
  db.fn("activityEvent.create").mockResolvedValue({ id: "a1" });
});

describe("PATCH /api/bookings/[id] — gates generales", () => {
  it("sin sesión → 401", async () => {
    box.user = null;
    const { status } = await patchBooking("b1", { action: "approve" });
    expect(status).toBe(401);
  });

  it("acción inválida → 400 sin tocar la DB", async () => {
    box.user = { id: "parent1", role: "PARENT" };
    const { status, json } = await patchBooking("b1", { action: "bogus" });
    expect(status).toBe(400);
    expect(json.ok).toBe(false);
    expect(db.fn("booking.findUnique")).not.toHaveBeenCalled();
  });

  it("body vacío (sin action ni status) → 400", async () => {
    box.user = { id: "parent1", role: "PARENT" };
    const { status } = await patchBooking("b1", {});
    expect(status).toBe(400);
  });

  it("reserva inexistente → 404", async () => {
    box.user = { id: "parent1", role: "PARENT" };
    db.fn("booking.findUnique").mockResolvedValue(null);
    const { status, json } = await patchBooking("nope", { action: "approve" });
    expect(status).toBe(404);
    expect(json.error).toBe("Reserva no encontrada");
  });
});

describe("PATCH /api/bookings/[id] — approve", () => {
  it("un extraño no puede aprobar → 403", async () => {
    box.user = { id: "stranger", role: "STUDENT" };
    db.fn("booking.findUnique").mockResolvedValue(makeBooking());
    const { status } = await patchBooking("b1", { action: "approve" });
    expect(status).toBe(403);
    expect(db.fn("booking.update")).not.toHaveBeenCalled();
  });

  it("el padre vinculado pero con rol distinto de PARENT no puede aprobar → 403", async () => {
    // consentBy coincide con el user.id pero el rol no es PARENT (p.ej. cuenta migrada mal).
    box.user = { id: "parent1", role: "STUDENT" };
    db.fn("booking.findUnique").mockResolvedValue(makeBooking());
    const { status } = await patchBooking("b1", { action: "approve" });
    expect(status).toBe(403);
  });

  it("un padre NO vinculado a esta reserva (consentBy distinto) no puede aprobar → 403", async () => {
    box.user = { id: "otherParent", role: "PARENT" };
    db.fn("booking.findUnique").mockResolvedValue(makeBooking({ consentBy: "parent1" }));
    const { status } = await patchBooking("b1", { action: "approve" });
    expect(status).toBe(403);
  });

  it("reserva que no está PENDING → 409", async () => {
    box.user = { id: "parent1", role: "PARENT" };
    db.fn("booking.findUnique").mockResolvedValue(makeBooking({ status: "CONFIRMED" }));
    const { status } = await patchBooking("b1", { action: "approve" });
    expect(status).toBe(409);
  });

  it("el padre designado aprueba: PENDING→CONFIRMED, crea escrow HELD y envía email al alumno", async () => {
    box.user = { id: "parent1", role: "PARENT" };
    db.fn("booking.findUnique").mockResolvedValue(makeBooking());
    db.fn("user.findUnique").mockResolvedValue({ email: "alumno@x.com" });

    const { status, json } = await patchBooking("b1", { action: "approve" });

    expect(status).toBe(200);
    expect(json.booking.status).toBe("CONFIRMED");

    expect(db.fn("booking.update")).toHaveBeenCalledWith({
      where: { id: "b1" },
      data: { status: "CONFIRMED", videoUrl: "/aula?room=b1" },
    });
    expect(db.fn("escrowTxn.create")).toHaveBeenCalledWith({
      data: { bookingId: "b1", amountCents: 5000, takeRatePct: 18, status: "HELD", stripeRef: null },
    });
    expect(sendMail).toHaveBeenCalledTimes(1);
    expect((sendMail as any).mock.calls[0][0].to).toBe("alumno@x.com");
  });

  it("si ya existe un videoUrl no lo pisa (no manda videoUrl en el update)", async () => {
    box.user = { id: "parent1", role: "PARENT" };
    db.fn("booking.findUnique").mockResolvedValue(makeBooking({ videoUrl: "/aula?room=custom" }));
    const { status } = await patchBooking("b1", { action: "approve" });
    expect(status).toBe(200);
    expect(db.fn("booking.update")).toHaveBeenCalledWith({
      where: { id: "b1" },
      data: { status: "CONFIRMED" },
    });
  });

  it("si ya existe escrow (reserva legada) no lo duplica", async () => {
    box.user = { id: "parent1", role: "PARENT" };
    db.fn("booking.findUnique").mockResolvedValue(
      makeBooking({ escrow: { id: "e0", status: "HELD", amountCents: 5000, takeRatePct: 18 } }),
    );
    const { status } = await patchBooking("b1", { action: "approve" });
    expect(status).toBe(200);
    expect(db.fn("escrowTxn.create")).not.toHaveBeenCalled();
  });

  it("si el alumno no tiene email, no intenta enviar correo (best-effort, no rompe)", async () => {
    box.user = { id: "parent1", role: "PARENT" };
    db.fn("booking.findUnique").mockResolvedValue(makeBooking());
    db.fn("user.findUnique").mockResolvedValue(null);
    const { status } = await patchBooking("b1", { action: "approve" });
    expect(status).toBe(200);
    expect(sendMail).not.toHaveBeenCalled();
  });

  it("un ADMIN también puede aprobar sin ser el padre designado", async () => {
    box.user = { id: "admin1", role: "ADMIN" };
    db.fn("booking.findUnique").mockResolvedValue(makeBooking());
    const { status } = await patchBooking("b1", { action: "approve" });
    expect(status).toBe(200);
  });

  it("alias { status: 'CONFIRMED' } se mapea a approve", async () => {
    box.user = { id: "parent1", role: "PARENT" };
    db.fn("booking.findUnique").mockResolvedValue(makeBooking());
    const { status, json } = await patchBooking("b1", { status: "CONFIRMED" });
    expect(status).toBe(200);
    expect(json.booking.status).toBe("CONFIRMED");
  });
});

describe("PATCH /api/bookings/[id] — cancel", () => {
  it("un extraño no puede cancelar → 403", async () => {
    box.user = { id: "stranger", role: "STUDENT" };
    db.fn("booking.findUnique").mockResolvedValue(makeBooking());
    const { status } = await patchBooking("b1", { action: "cancel" });
    expect(status).toBe(403);
  });

  it("una reserva COMPLETED ya no se puede cancelar → 409", async () => {
    box.user = { id: "student1", role: "STUDENT" };
    db.fn("booking.findUnique").mockResolvedValue(makeBooking({ status: "COMPLETED" }));
    const { status, json } = await patchBooking("b1", { action: "cancel" });
    expect(status).toBe(409);
    expect(json.error).toMatch(/completada/);
  });

  it("una reserva ya CANCELLED → 409", async () => {
    box.user = { id: "student1", role: "STUDENT" };
    db.fn("booking.findUnique").mockResolvedValue(makeBooking({ status: "CANCELLED" }));
    const { status } = await patchBooking("b1", { action: "cancel" });
    expect(status).toBe(409);
  });

  it("el alumno dueño puede cancelar (PENDING→CANCELLED) y reembolsa el escrow HELD", async () => {
    box.user = { id: "student1", role: "STUDENT" };
    db.fn("booking.findUnique").mockResolvedValue(
      makeBooking({ escrow: { id: "e0", status: "HELD", amountCents: 5000, takeRatePct: 18 } }),
    );
    const { status, json } = await patchBooking("b1", { action: "cancel" });
    expect(status).toBe(200);
    expect(json.booking.status).toBe("CANCELLED");
    expect(json.escrow.status).toBe("REFUNDED");
    expect(db.fn("escrowTxn.updateMany")).toHaveBeenCalledWith({
      where: { bookingId: "b1", status: "HELD" },
      data: { status: "REFUNDED" },
    });
  });

  it("el padre designado puede cancelar", async () => {
    box.user = { id: "parent1", role: "PARENT" };
    db.fn("booking.findUnique").mockResolvedValue(makeBooking());
    const { status } = await patchBooking("b1", { action: "cancel" });
    expect(status).toBe(200);
  });

  it("el coach de la sesión puede cancelar", async () => {
    box.user = { id: "coach1", role: "COACH" };
    db.fn("booking.findUnique").mockResolvedValue(makeBooking());
    const { status } = await patchBooking("b1", { action: "cancel" });
    expect(status).toBe(200);
  });

  it("un ADMIN puede cancelar", async () => {
    box.user = { id: "admin1", role: "ADMIN" };
    db.fn("booking.findUnique").mockResolvedValue(makeBooking());
    const { status } = await patchBooking("b1", { action: "cancel" });
    expect(status).toBe(200);
  });

  it("sin escrow previo, la respuesta trae escrow: null", async () => {
    box.user = { id: "student1", role: "STUDENT" };
    db.fn("booking.findUnique").mockResolvedValue(makeBooking({ escrow: null }));
    const { json } = await patchBooking("b1", { action: "cancel" });
    expect(json.escrow).toBeNull();
  });

  it("alias { status: 'CANCELLED' } se mapea a cancel", async () => {
    box.user = { id: "student1", role: "STUDENT" };
    db.fn("booking.findUnique").mockResolvedValue(makeBooking());
    const { status, json } = await patchBooking("b1", { status: "CANCELLED" });
    expect(status).toBe(200);
    expect(json.booking.status).toBe("CANCELLED");
  });
});

describe("PATCH /api/bookings/[id] — complete", () => {
  it("solo el coach de la sesión (o admin) puede completar → 403 para el alumno", async () => {
    box.user = { id: "student1", role: "STUDENT" };
    db.fn("booking.findUnique").mockResolvedValue(makeBooking({ status: "CONFIRMED" }));
    const { status } = await patchBooking("b1", { action: "complete" });
    expect(status).toBe(403);
  });

  it("solo se puede completar una reserva CONFIRMED → 409 si está PENDING", async () => {
    box.user = { id: "coach1", role: "COACH" };
    db.fn("booking.findUnique").mockResolvedValue(makeBooking({ status: "PENDING" }));
    const { status } = await patchBooking("b1", { action: "complete" });
    expect(status).toBe(409);
  });

  it("el coach completa: CONFIRMED→COMPLETED, libera escrow y calcula el payout", async () => {
    box.user = { id: "coach1", role: "COACH" };
    db.fn("booking.findUnique").mockResolvedValue(
      makeBooking({ status: "CONFIRMED", escrow: { id: "e0", status: "HELD", amountCents: 5000, takeRatePct: 18 } }),
    );
    db.fn("user.findUnique").mockResolvedValue({ name: "Coach X" });

    const { status, json } = await patchBooking("b1", { action: "complete" });

    expect(status).toBe(200);
    expect(json.booking.status).toBe("COMPLETED");
    expect(json.escrow.status).toBe("RELEASED");
    expect(json.escrow.payoutCents).toBe(4100); // 5000 * (100-18)/100
    expect(db.fn("user.update")).toHaveBeenCalledWith({
      where: { id: "student1" },
      data: { xp: { increment: 25 } },
    });
  });
});

describe("PATCH /api/bookings/[id] — recording", () => {
  it("solo el coach (o admin) puede adjuntar grabación → 403 para el alumno", async () => {
    box.user = { id: "student1", role: "STUDENT" };
    db.fn("booking.findUnique").mockResolvedValue(makeBooking());
    const { status } = await patchBooking("b1", {
      action: "recording",
      recordingUrl: "https://youtu.be/abc123",
    });
    expect(status).toBe(403);
  });

  it("URL de grabación inválida → 400", async () => {
    box.user = { id: "coach1", role: "COACH" };
    db.fn("booking.findUnique").mockResolvedValue(makeBooking());
    const { status } = await patchBooking("b1", {
      action: "recording",
      recordingUrl: "javascript:alert(1)",
    });
    expect(status).toBe(400);
    expect(db.fn("booking.update")).not.toHaveBeenCalled();
  });

  it("el coach adjunta una grabación válida", async () => {
    box.user = { id: "coach1", role: "COACH" };
    db.fn("booking.findUnique").mockResolvedValue(makeBooking());
    const { status, json } = await patchBooking("b1", {
      action: "recording",
      recordingUrl: "https://youtu.be/abc123",
    });
    expect(status).toBe(200);
    expect(json.booking.recordingUrl).toBe("https://youtu.be/abc123");
  });
});
