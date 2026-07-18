// [BE-TEST · F-MKT M3] POST /api/bookings vía listingId — la reserva del marketplace
// abierto. Fija: solo listings ACTIVE son reservables; la tarifa es la del LISTING
// (priceCentsHour × sesión de 60 min); el booking registra listingId; NO exige
// CoachProfile (sin incremento de bookingCount); y las defensas del flujo original
// aplican IGUAL: profesor verificado obligatorio y SAFETY GATE de menores intacto.
import { describe, it, expect, beforeEach, vi } from "vitest";
import { makeDb, jsonReq } from "./helpers/route-harness";

const box = vi.hoisted(() => ({ db: null as any, user: null as any }));
vi.mock("../app/lib/db", () => ({
  db: new Proxy({}, { get: (_t, p: string) => (p === "then" ? undefined : box.db.db[p]) }),
}));
vi.mock("../app/lib/auth", () => ({ setSession: vi.fn(), getSessionUser: () => box.user, clearSession: vi.fn() }));
vi.mock("../app/lib/mail", () => ({
  sendMail: vi.fn(),
  emailShell: vi.fn(),
  emailButton: vi.fn(),
  hashToken: (x: string) => x,
}));

import { POST } from "../app/api/bookings/route";

box.db = makeDb();
const db = box.db;

const TEACHER_ID = "mkt-teacher-1";
const STUDENT_ID = "mkt-student-1";
const MINOR_ID = "mkt-minor-1";
const LISTING = {
  id: "listing-1", teacherId: TEACHER_ID, category: "ingles", title: "Inglés conversacional B1-B2",
  priceCentsHour: 2500, status: "ACTIVE",
};

function futureSlot(hoursAhead = 24): string {
  const ms = Date.now() + hoursAhead * 3600 * 1000;
  return new Date(Math.floor(ms / 60000) * 60000).toISOString();
}

async function bookReq(user: any, body: Record<string, unknown>) {
  box.user = user;
  const res = await POST(jsonReq("/api/bookings", body));
  const json = await res.json();
  return { status: res.status, json };
}

beforeEach(() => {
  db.reset();
  vi.clearAllMocks();
  db.fn("listing.findUnique").mockResolvedValue({ ...LISTING });
  db.fn("user.findUnique").mockImplementation(async ({ where, select }: any) => {
    if (where?.id === TEACHER_ID) {
      if (select?.coachVerified !== undefined) return { coachVerified: true };
      if (select?.name !== undefined) return { name: "Profe Inglés" };
      if (select?.email !== undefined) return { email: "profe@test.com" };
    }
    if (where?.id === STUDENT_ID && select?.email !== undefined) return { email: "alumno@test.com" };
    return null;
  });
  db.fn("guardianship.findMany").mockResolvedValue([]);
  db.fn("booking.findMany").mockResolvedValue([]);
  db.fn("booking.create").mockImplementation(async ({ data }: any) => ({ id: "bk-1", videoUrl: null, ...data }));
  db.fn("booking.update").mockImplementation(async ({ where, data }: any) => ({ id: where.id, status: "CONFIRMED", ...data }));
  db.fn("escrowTxn.create").mockResolvedValue({ id: "es-1" });
  db.fn("activityEvent.create").mockResolvedValue({ id: "ae-1" });
});

describe("POST /api/bookings — reservar desde un listing (marketplace abierto)", () => {
  it("listing inexistente o no-ACTIVE (PAUSED/PENDING) → 404: solo lo publicado se reserva", async () => {
    db.fn("listing.findUnique").mockResolvedValue(null);
    expect((await bookReq({ id: STUDENT_ID, role: "STUDENT", ageBand: "adult" }, { listingId: "nope", slotAt: futureSlot() })).status).toBe(404);
    db.fn("listing.findUnique").mockResolvedValue({ ...LISTING, status: "PAUSED" });
    expect((await bookReq({ id: STUDENT_ID, role: "STUDENT", ageBand: "adult" }, { listingId: LISTING.id, slotAt: futureSlot() })).status).toBe(404);
  });

  it("adulto reserva → CONFIRMED con la tarifa DEL LISTING, listingId registrado, sin CoachProfile", async () => {
    const { status, json } = await bookReq(
      { id: STUDENT_ID, role: "STUDENT", ageBand: "adult" },
      { listingId: LISTING.id, slotAt: futureSlot() },
    );
    expect(status).toBe(200);
    expect(json.status).toBe("CONFIRMED");

    const data = db.fn("booking.create").mock.calls[0][0].data;
    expect(data.listingId).toBe(LISTING.id);
    expect(data.packageId).toBeNull();
    expect(data.coachId).toBe(TEACHER_ID);
    expect(data.priceCents).toBe(2500); // tarifa/hora del listing × sesión de 60 min
    // Escrow nace HELD con el monto del listing y el take rate de la casa.
    const escrow = db.fn("escrowTxn.create").mock.calls[0][0].data;
    expect(escrow.amountCents).toBe(2500);
    expect(escrow.takeRatePct).toBe(18);
    // Sin CoachProfile no hay contador que incrementar — y no debe explotar por eso.
    expect(db.fn("coachProfile.update")).not.toHaveBeenCalled();
    expect(db.fn("coachProfile.findUnique")).not.toHaveBeenCalled();
  });

  it("profesor del listing SIN verificar → 403 (el vetting aplica igual en esta vía)", async () => {
    db.fn("user.findUnique").mockImplementation(async ({ where, select }: any) => {
      if (where?.id === TEACHER_ID && select?.coachVerified !== undefined) return { coachVerified: false };
      return null;
    });
    const { status } = await bookReq(
      { id: STUDENT_ID, role: "STUDENT", ageBand: "adult" },
      { listingId: LISTING.id, slotAt: futureSlot() },
    );
    expect(status).toBe(403);
    expect(db.fn("booking.create")).not.toHaveBeenCalled();
  });

  it("MENOR sin guardián vinculado → 403: el Safety Gate no se salta por venir de un listing", async () => {
    const { status, json } = await bookReq(
      { id: MINOR_ID, role: "STUDENT", ageBand: "minor" },
      { listingId: LISTING.id, slotAt: futureSlot() },
    );
    expect(status).toBe(403);
    expect(json.error).toMatch(/consentimiento parental/i);
    expect(db.fn("booking.create")).not.toHaveBeenCalled();
  });

  it("el profesor no puede reservar su propio listing → 400", async () => {
    const { status } = await bookReq(
      { id: TEACHER_ID, role: "STUDENT", ageBand: "adult" },
      { listingId: LISTING.id, slotAt: futureSlot() },
    );
    expect(status).toBe(400);
  });
});
