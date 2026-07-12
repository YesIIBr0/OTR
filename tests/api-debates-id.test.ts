// [BE-TEST] Integración de PATCH /api/debates/[id] — el coach aprueba/rechaza una
// solicitud de debate (auto-reporte del alumno). Es el corazón del rating: aprobar mueve
// el Glicko-2 real del alumno (usa app/lib/glicko2 SIN mockear, es puro); rechazar solo
// audita motivo. Mockea Prisma + sesión + mail (harness). GET no se cubre aquí (fuera de
// alcance del ticket).
import { describe, it, expect, beforeEach, vi } from "vitest";
import { makeDb, jsonReq } from "./helpers/route-harness";

// Caja hoisteada (los factory de vi.mock se elevan sobre los imports; solo pueden tocar
// `vi` y vars de vi.hoisted). El Proxy reenvía perezosamente a box.db.db.
const box = vi.hoisted(() => ({ db: null as any, user: null as any }));
vi.mock("../app/lib/db", () => ({
  db: new Proxy({}, { get: (_t, p: string) => (p === "then" ? undefined : box.db.db[p]) }),
}));
vi.mock("../app/lib/auth", () => ({ setSession: vi.fn(), getSessionUser: () => box.user, clearSession: vi.fn() }));
vi.mock("../app/lib/mail", () => ({
  sendMail: vi.fn(),
  emailShell: vi.fn((title: string, body: string) => `<html>${title}${body}</html>`),
}));

import { PATCH } from "../app/api/debates/[id]/route";
import { sendMail } from "../app/lib/mail";
import { updateRating, tierFor } from "../app/lib/glicko2";

box.db = makeDb();
const db = box.db;

const DEBATE_ID = "d1";
const STUDENT_ID = "s1";
const TEACHER_ID = "t1";
// Mismo valor que DEFAULT_OPP_RD en app/api/debates/[id]/route.ts (no exportado): RD del
// oponente cuando se adjudica una solicitud sin oponente real conocido.
const DEFAULT_OPP_RD = 350;

function baseRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: DEBATE_ID,
    userId: STUDENT_ID,
    format: "PF",
    opponent: "Bob",
    result: "WIN",
    adjudicated: false,
    rejectedAt: null,
    ...overrides,
  };
}

function baseStudent(overrides: Record<string, unknown> = {}) {
  return {
    id: STUDENT_ID,
    role: "STUDENT",
    email: "alumno@x.com",
    name: "Alumno Uno",
    debateRating: 1500,
    debateRd: 350,
    debateVol: 0.06,
    debateTier: tierFor(1500), // consistente con el rating de arriba
    ...overrides,
  };
}

async function reviewDebate(id: string, body: Record<string, unknown>) {
  const res = await PATCH(jsonReq(`/api/debates/${id}`, body, "PATCH"), {
    params: Promise.resolve({ id }),
  });
  const json = await res.json();
  return { status: res.status, json };
}

beforeEach(() => {
  db.reset();
  vi.clearAllMocks();
  // Por defecto: coach TEACHER logueado, con vínculo válido (reserva) con el alumno.
  box.user = { id: TEACHER_ID, role: "TEACHER", email: "coach@x.com", name: "Coach Uno" };
  db.fn("debateRecord.findUnique").mockResolvedValue(baseRecord());
  db.fn("user.findUnique").mockResolvedValue(baseStudent());
  db.fn("booking.count").mockResolvedValue(1);
  db.fn("enrollment.count").mockResolvedValue(0);
  db.fn("debateRecord.updateMany").mockResolvedValue({ count: 1 });
  db.fn("user.update").mockResolvedValue({});
  db.fn("ratingUpdate.create").mockResolvedValue({});
  db.fn("activityEvent.create").mockResolvedValue({});
});

describe("PATCH /api/debates/[id] — autenticación / rol", () => {
  it("sin sesión → 401", async () => {
    box.user = null;
    const { status } = await reviewDebate(DEBATE_ID, { action: "approve" });
    expect(status).toBe(401);
  });

  it("STUDENT no puede revisar solicitudes → 403", async () => {
    box.user = { id: "s-otro", role: "STUDENT", email: "otro@x.com" };
    const { status, json } = await reviewDebate(DEBATE_ID, { action: "approve" });
    expect(status).toBe(403);
    expect(json.code).toBe("coachOnly");
    expect(db.fn("debateRecord.findUnique")).not.toHaveBeenCalled();
  });

  it("action inválida → 400", async () => {
    const { status } = await reviewDebate(DEBATE_ID, { action: "foo" });
    expect(status).toBe(400);
  });
});

describe("PATCH /api/debates/[id] — vínculo de coaching (TEACHER)", () => {
  it("TEACHER sin reserva NI inscripción con el alumno → 403", async () => {
    db.fn("booking.count").mockResolvedValue(0);
    db.fn("enrollment.count").mockResolvedValue(0);
    const { status, json } = await reviewDebate(DEBATE_ID, { action: "approve" });
    expect(status).toBe(403);
    expect(json.error).toBe("Solo puedes revisar solicitudes de tus alumnos");
    expect(db.fn("user.update")).not.toHaveBeenCalled();
  });

  it("TEACHER con reserva (booking) → permitido, y no consulta enrollment (corto-circuito)", async () => {
    db.fn("booking.count").mockResolvedValue(1);
    db.fn("enrollment.count").mockResolvedValue(0);
    const { status } = await reviewDebate(DEBATE_ID, { action: "approve" });
    expect(status).toBe(200);
    expect(db.fn("enrollment.count")).not.toHaveBeenCalled();
  });

  it("TEACHER sin reserva pero con inscripción (enrollment) → permitido", async () => {
    db.fn("booking.count").mockResolvedValue(0);
    db.fn("enrollment.count").mockResolvedValue(1);
    const { status } = await reviewDebate(DEBATE_ID, { action: "approve" });
    expect(status).toBe(200);
  });

  it("ADMIN puede revisar sin vínculo de coaching (no consulta booking/enrollment)", async () => {
    box.user = { id: "admin1", role: "ADMIN", email: "admin@x.com", name: "Admin" };
    db.fn("booking.count").mockResolvedValue(0);
    db.fn("enrollment.count").mockResolvedValue(0);
    const { status } = await reviewDebate(DEBATE_ID, { action: "approve" });
    expect(status).toBe(200);
    expect(db.fn("booking.count")).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/debates/[id] — solicitud ya resuelta / inválida", () => {
  it("registro no encontrado → 404", async () => {
    db.fn("debateRecord.findUnique").mockResolvedValue(null);
    const { status } = await reviewDebate("no-existe", { action: "approve" });
    expect(status).toBe(404);
  });

  it("ya adjudicada (findUnique inicial con adjudicated:true) → 409, sin tocar al alumno", async () => {
    db.fn("debateRecord.findUnique").mockResolvedValue(baseRecord({ adjudicated: true }));
    const { status, json } = await reviewDebate(DEBATE_ID, { action: "approve" });
    expect(status).toBe(409);
    expect(json.code).toBe("alreadyResolved");
    expect(db.fn("user.findUnique")).not.toHaveBeenCalled();
  });

  it("ya rechazada (findUnique inicial con rejectedAt no nulo) → 409", async () => {
    db.fn("debateRecord.findUnique").mockResolvedValue(baseRecord({ rejectedAt: new Date() }));
    const { status } = await reviewDebate(DEBATE_ID, { action: "reject", reason: "x" });
    expect(status).toBe(409);
  });

  it("el dueño del registro no es un STUDENT → 400", async () => {
    db.fn("user.findUnique").mockResolvedValue({ ...baseStudent(), role: "TEACHER" });
    const { status } = await reviewDebate(DEBATE_ID, { action: "approve" });
    expect(status).toBe(400);
  });
});

describe("PATCH /api/debates/[id] — aprobar (mueve el rating Glicko-2 real)", () => {
  it("aprueba una WIN: sube el rating, crea RatingUpdate, adjudica y avisa por email", async () => {
    const before = { rating: 1500, rd: 350, vol: 0.06 };
    // Mismo cálculo que hace la ruta: oponente anclado al propio rating del alumno.
    const expectedNext = updateRating(before, [{ rating: before.rating, rd: DEFAULT_OPP_RD, score: 1 }]);
    const expectedTier = tierFor(expectedNext.rating);

    const { status, json } = await reviewDebate(DEBATE_ID, { action: "approve" });

    expect(status).toBe(200);
    expect(json.status).toBe("approved");
    expect(expectedNext.rating).toBeGreaterThan(before.rating); // WIN sube el rating

    const updateArg = db.fn("user.update").mock.calls[0][0];
    expect(updateArg.where).toEqual({ id: STUDENT_ID });
    expect(updateArg.data.debateRating).toBeCloseTo(expectedNext.rating, 6);
    expect(updateArg.data.debateRd).toBeCloseTo(expectedNext.rd, 6);
    expect(updateArg.data.debateVol).toBeCloseTo(expectedNext.vol, 6);
    expect(updateArg.data.debateTier).toBe(expectedTier);

    const recordArg = db.fn("debateRecord.updateMany").mock.calls[0][0];
    expect(recordArg.where).toEqual({ id: DEBATE_ID, adjudicated: false, rejectedAt: null });
    expect(recordArg.data.adjudicated).toBe(true);
    expect(recordArg.data.adjudicatedBy).toBe(TEACHER_ID);

    const ratingCreateArg = db.fn("ratingUpdate.create").mock.calls[0][0].data;
    expect(ratingCreateArg.debateId).toBe(DEBATE_ID);
    expect(ratingCreateArg.ratingBefore).toBe(1500);
    expect(ratingCreateArg.ratingAfter).toBeCloseTo(expectedNext.rating, 6);
    expect(ratingCreateArg.tierAfter).toBe(expectedTier);

    expect(vi.mocked(sendMail)).toHaveBeenCalledOnce();
    const mailArg = vi.mocked(sendMail).mock.calls[0][0];
    expect(mailArg.to).toBe("alumno@x.com");
    expect(mailArg.subject).toContain("aprobado");
  });

  it("aprueba una LOSS: el rating baja", async () => {
    db.fn("debateRecord.findUnique").mockResolvedValue(baseRecord({ result: "LOSS" }));
    const before = { rating: 1500, rd: 350, vol: 0.06 };
    const expectedNext = updateRating(before, [{ rating: before.rating, rd: DEFAULT_OPP_RD, score: 0 }]);

    const { status } = await reviewDebate(DEBATE_ID, { action: "approve" });

    expect(status).toBe(200);
    expect(expectedNext.rating).toBeLessThan(before.rating);
    const updateArg = db.fn("user.update").mock.calls[0][0];
    expect(updateArg.data.debateRating).toBeCloseTo(expectedNext.rating, 6);
  });

  it("carrera: si el guard (updateMany dentro de la tx) devuelve count:0, aborta sin mover el rating", async () => {
    db.fn("debateRecord.updateMany").mockResolvedValueOnce({ count: 0 });
    // La ruta no atrapa este error dentro de la propia transacción: se propaga.
    await expect(reviewDebate(DEBATE_ID, { action: "approve" })).rejects.toThrow("YA_RESUELTA");
    expect(db.fn("user.update")).not.toHaveBeenCalled();
    expect(db.fn("ratingUpdate.create")).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/debates/[id] — rechazar (no mueve el rating)", () => {
  it("rechaza: setea rejectedAt + motivo, NO mueve el rating, avisa por email", async () => {
    const { status, json } = await reviewDebate(DEBATE_ID, { action: "reject", reason: "Torneo no verificable" });

    expect(status).toBe(200);
    expect(json.status).toBe("rejected");

    const recordArg = db.fn("debateRecord.updateMany").mock.calls[0][0];
    expect(recordArg.where).toEqual({ id: DEBATE_ID, adjudicated: false, rejectedAt: null });
    expect(recordArg.data.rejectedAt).toBeInstanceOf(Date);
    expect(recordArg.data.rejectionReason).toBe("Torneo no verificable");
    expect(recordArg.data.adjudicatedBy).toBe(TEACHER_ID);

    expect(db.fn("user.update")).not.toHaveBeenCalled();
    expect(db.fn("ratingUpdate.create")).not.toHaveBeenCalled();

    expect(vi.mocked(sendMail)).toHaveBeenCalledOnce();
    const mailArg = vi.mocked(sendMail).mock.calls[0][0];
    expect(mailArg.to).toBe("alumno@x.com");
    expect(mailArg.subject).toContain("rechazado");
  });

  it("rechaza sin reason → rejectionReason queda null", async () => {
    await reviewDebate(DEBATE_ID, { action: "reject" });
    const recordArg = db.fn("debateRecord.updateMany").mock.calls[0][0];
    expect(recordArg.data.rejectionReason).toBeNull();
  });

  it("carrera: si el guard (updateMany) devuelve count:0 → 409, sin mover el rating", async () => {
    db.fn("debateRecord.updateMany").mockResolvedValueOnce({ count: 0 });
    const { status, json } = await reviewDebate(DEBATE_ID, { action: "reject", reason: "tarde" });
    expect(status).toBe(409);
    expect(json.code).toBe("alreadyResolved");
    expect(db.fn("user.update")).not.toHaveBeenCalled();
  });
});
