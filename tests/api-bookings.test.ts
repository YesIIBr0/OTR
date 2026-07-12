// [BE-TEST] Integración de POST /api/bookings — invariantes de DINERO y SEGURIDAD del
// marketplace de coaching: quién puede reservar a nombre de quién, el candado parental de
// menores, el conflicto de agenda y que el escrow SOLO nace cuando la reserva queda
// CONFIRMED. Mockea Prisma + sesión + mail (harness). Ejercita la LÓGICA real del handler.
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
  emailShell: vi.fn(),
  emailButton: vi.fn(),
  sendPasswordReset: vi.fn(),
  hashToken: (x: string) => x,
}));

import { POST } from "../app/api/bookings/route";

box.db = makeDb();
const db = box.db;

// --- IDs fijos para poder mockear db.user.findUnique por where.id + select sin importar
//     el orden exacto en el que la ruta hace cada lookup. ---
const COACH_PROFILE_ID = "coachprofile-1";
const COACH_USER_ID = "coachuser-1";
const STUDENT_ID = "student-adult-1"; // alumno adulto
const MINOR_ID = "student-minor-1"; // alumno menor (self-booking)
const PARENT_ID = "parent-1";
const CHILD_ID = "child-minor-1"; // hijo del PARENT_ID (booking por tutor)

const HOURLY_CENTS = 5000; // RD$50.00 — sin paquete, se cobra la tarifa por hora del coach

/** Slot futuro válido: +24h (pasa el lead de 12h), alineado al minuto exacto. */
function futureSlot(hoursAhead = 24): string {
  const ms = Date.now() + hoursAhead * 3600 * 1000;
  const aligned = Math.floor(ms / 60000) * 60000;
  return new Date(aligned).toISOString();
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

  // Coach: acepta lookup por CoachProfile.id (el que usan los tests) o por userId.
  db.fn("coachProfile.findUnique").mockImplementation(async ({ where }: any) => {
    if (where?.id === COACH_PROFILE_ID || where?.userId === COACH_USER_ID) {
      return {
        id: COACH_PROFILE_ID,
        userId: COACH_USER_ID,
        active: true,
        hourlyCents: HOURLY_CENTS,
        availability: [], // sin franjas publicadas → no restringe el slot
      };
    }
    return null;
  });

  db.fn("coachPackage.findUnique").mockResolvedValue(null);

  // user.findUnique se llama con distintos `select` para distintos propósitos a lo largo
  // de la ruta (coachVerified, name del coach, ageBand/role del hijo, email de notificación).
  // Resolvemos por where.id + la forma del select en vez de por orden de llamada.
  db.fn("user.findUnique").mockImplementation(async ({ where, select }: any) => {
    const id = where?.id;
    if (id === COACH_USER_ID) {
      if (select?.coachVerified !== undefined) return { coachVerified: true };
      if (select?.name !== undefined) return { name: "Coach Test" };
    }
    if (id === STUDENT_ID) {
      if (select?.email !== undefined) return { email: "student@test.com" };
      if (select?.name !== undefined) return { name: "Estudiante Test" };
    }
    if (id === MINOR_ID) {
      if (select?.email !== undefined) return { email: "minor@test.com" };
      if (select?.name !== undefined) return { name: "Menor Test" };
    }
    if (id === CHILD_ID) {
      if (select?.role !== undefined) return { id: CHILD_ID, ageBand: "minor", role: "STUDENT" };
      if (select?.email !== undefined) return { email: "child@test.com" };
      if (select?.name !== undefined) return { name: "Hijo Test" };
    }
    if (id === PARENT_ID) {
      if (select?.email !== undefined) return { email: "parent@test.com" };
    }
    return null;
  });

  db.fn("guardianship.findFirst").mockResolvedValue(null);
  db.fn("guardianship.findMany").mockResolvedValue([]);

  db.fn("booking.findMany").mockResolvedValue([]); // sin choque de horario por defecto
  db.fn("booking.create").mockImplementation(async ({ data }: any) => ({
    id: "booking-created-1",
    videoUrl: null,
    ...data,
  }));
  db.fn("booking.update").mockImplementation(async ({ where, data }: any) => ({
    id: where.id,
    status: "CONFIRMED", // solo se llama cuando la reserva quedó CONFIRMED (asigna la sala)
    ...data,
  }));
  db.fn("escrowTxn.create").mockResolvedValue({ id: "escrow-created-1" });
  db.fn("coachProfile.update").mockResolvedValue({});
  db.fn("activityEvent.create").mockResolvedValue({ id: "activity-1" });
});

describe("POST /api/bookings — STUDENT reserva a su nombre", () => {
  it("alumno ADULTO → 200 CONFIRMED, escrow HELD nace, studentId = el propio alumno", async () => {
    const { status, json } = await bookReq(
      { id: STUDENT_ID, role: "STUDENT", ageBand: "adult" },
      { coachId: COACH_PROFILE_ID, slotAt: futureSlot() },
    );
    expect(status).toBe(200);
    expect(json.status).toBe("CONFIRMED");

    const createArgs = db.fn("booking.create").mock.calls[0][0].data;
    expect(createArgs.studentId).toBe(STUDENT_ID);
    expect(createArgs.status).toBe("CONFIRMED");

    // Escrow SOLO nace en CONFIRMED.
    expect(db.fn("escrowTxn.create")).toHaveBeenCalledOnce();
    const escrowArgs = db.fn("escrowTxn.create").mock.calls[0][0].data;
    expect(escrowArgs.amountCents).toBe(HOURLY_CENTS);
    expect(escrowArgs.status).toBe("HELD");
  });

  it("alumno MENOR con guardián ACTIVE consentLevel estándar → 200 PENDING, escrow NO nace", async () => {
    db.fn("guardianship.findMany").mockResolvedValueOnce([
      { parentId: PARENT_ID, consentLevel: "standard", approveUnderCents: null, createdAt: new Date() },
    ]);
    const { status, json } = await bookReq(
      { id: MINOR_ID, role: "STUDENT", ageBand: "minor" },
      { coachId: COACH_PROFILE_ID, slotAt: futureSlot() },
    );
    expect(status).toBe(200);
    expect(json.status).toBe("PENDING");

    const createArgs = db.fn("booking.create").mock.calls[0][0].data;
    expect(createArgs.studentId).toBe(MINOR_ID);
    expect(createArgs.status).toBe("PENDING");
    expect(createArgs.consentBy).toBe(PARENT_ID);

    // Candado parental: sin consentimiento amplio ni umbral, NO se retienen fondos todavía.
    expect(db.fn("escrowTxn.create")).not.toHaveBeenCalled();
  });

  it("alumno MENOR sin guardianship ACTIVE → 403, no crea nada", async () => {
    db.fn("guardianship.findMany").mockResolvedValueOnce([]);
    const { status, json } = await bookReq(
      { id: MINOR_ID, role: "STUDENT", ageBand: "minor" },
      { coachId: COACH_PROFILE_ID, slotAt: futureSlot() },
    );
    expect(status).toBe(403);
    expect(json.error).toMatch(/consentimiento parental/i);
    expect(db.fn("booking.create")).not.toHaveBeenCalled();
    expect(db.fn("escrowTxn.create")).not.toHaveBeenCalled();
  });

  it("alumno MENOR con guardián consentLevel 'full' → CONFIRMED directo y SÍ nace escrow", async () => {
    db.fn("guardianship.findMany").mockResolvedValueOnce([
      { parentId: PARENT_ID, consentLevel: "full", approveUnderCents: null, createdAt: new Date() },
    ]);
    const { status, json } = await bookReq(
      { id: MINOR_ID, role: "STUDENT", ageBand: "minor" },
      { coachId: COACH_PROFILE_ID, slotAt: futureSlot() },
    );
    expect(status).toBe(200);
    expect(json.status).toBe("CONFIRMED");
    expect(db.fn("escrowTxn.create")).toHaveBeenCalledOnce();
  });
});

describe("POST /api/bookings — PARENT reserva por un hijo", () => {
  it("sin studentId → 400 'Falta el estudiante de la reserva'", async () => {
    const { status, json } = await bookReq(
      { id: PARENT_ID, role: "PARENT" },
      { coachId: COACH_PROFILE_ID, slotAt: futureSlot() }, // sin studentId
    );
    expect(status).toBe(400);
    expect(json.error).toMatch(/Falta el estudiante/i);
    expect(db.fn("booking.create")).not.toHaveBeenCalled();
  });

  it("sin Guardianship ACTIVE parent→hijo → 403 'No tienes un vínculo activo'", async () => {
    db.fn("guardianship.findFirst").mockResolvedValueOnce(null);
    const { status, json } = await bookReq(
      { id: PARENT_ID, role: "PARENT" },
      { coachId: COACH_PROFILE_ID, slotAt: futureSlot(), studentId: CHILD_ID },
    );
    expect(status).toBe(403);
    expect(json.error).toMatch(/vínculo activo/i);
    expect(db.fn("booking.create")).not.toHaveBeenCalled();
  });

  it("con Guardianship ACTIVE + hijo MENOR → confirma directo (reservar=aprobar), usa el ageBand/id del HIJO, no del padre", async () => {
    db.fn("guardianship.findFirst").mockResolvedValueOnce({ studentId: CHILD_ID });
    const { status, json } = await bookReq(
      { id: PARENT_ID, role: "PARENT", ageBand: null },
      { coachId: COACH_PROFILE_ID, slotAt: futureSlot(), studentId: CHILD_ID },
    );
    expect(status).toBe(200);
    // [PARENT-BOOKING] El padre ES la autoridad de consentimiento: reservar = aprobar,
    // por eso confirma directo aunque el hijo sea "minor" (no pasa por el candado PENDING
    // que sí aplica cuando el propio menor reserva para sí mismo).
    expect(json.status).toBe("CONFIRMED");

    const createArgs = db.fn("booking.create").mock.calls[0][0].data;
    // El estudiante de la reserva es el HIJO, nunca el padre.
    expect(createArgs.studentId).toBe(CHILD_ID);
    expect(createArgs.studentId).not.toBe(PARENT_ID);
    expect(createArgs.consentBy).toBe(PARENT_ID);

    // No pasa por el gate de auto-reserva de menor (ese es otro camino de código).
    expect(db.fn("guardianship.findMany")).not.toHaveBeenCalled();
    expect(db.fn("escrowTxn.create")).toHaveBeenCalledOnce();
  });
});

describe("POST /api/bookings — conflicto de horario", () => {
  it("slot ya reservado con ese coach → 409 'Ese horario ya fue reservado', no crea booking", async () => {
    const slot = futureSlot();
    db.fn("booking.findMany").mockResolvedValueOnce([{ slotAt: new Date(slot), durationMin: 60 }]);
    const { status, json } = await bookReq(
      { id: STUDENT_ID, role: "STUDENT", ageBand: "adult" },
      { coachId: COACH_PROFILE_ID, slotAt: slot },
    );
    expect(status).toBe(409);
    expect(json.error).toBe("Ese horario ya fue reservado");
    expect(db.fn("booking.create")).not.toHaveBeenCalled();
    expect(db.fn("escrowTxn.create")).not.toHaveBeenCalled();
  });
});

describe("POST /api/bookings — rol no permitido", () => {
  it("ADMIN no puede reservar sesiones de coaching → 403 con el copy correcto", async () => {
    const { status, json } = await bookReq(
      { id: "admin-1", role: "ADMIN" },
      { coachId: COACH_PROFILE_ID, slotAt: futureSlot() },
    );
    expect(status).toBe(403);
    expect(json.error).toBe("Solo estudiantes o su tutor pueden reservar sesiones de coaching");
    expect(db.fn("booking.create")).not.toHaveBeenCalled();
  });
});
