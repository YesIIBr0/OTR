// [BE-TEST] Integración de POST /api/guardianship — vínculo parent↔student y su lógica
// COPPA (PRD §3.3, §11.3): un vínculo NUEVO reclamado por el padre nace SIEMPRE PENDING
// (nunca ACTIVE por la sola palabra del padre); solo pasa a ACTIVE cuando el padre CONFIRMA
// un vínculo que el propio menor declaró al registrarse (initiatedBy="student"), y esa
// activación deja evidencia auditable (ConsentRecord) dentro de la misma $transaction.
// Mockea Prisma + sesión + mail (harness). Ejercita la LÓGICA real del handler sin DB.
import { describe, it, expect, beforeEach, vi } from "vitest";
import { makeDb, jsonReq } from "./helpers/route-harness";

// Caja hoisteada (los factory de vi.mock se elevan sobre los imports; solo pueden tocar
// `vi` y vars de vi.hoisted). El Proxy reenvía perezosamente a box.db.db.
const box = vi.hoisted(() => ({ db: null as any, user: null as any }));
vi.mock("../app/lib/db", () => ({
  db: new Proxy({}, { get: (_t, p: string) => (p === "then" ? undefined : box.db.db[p]) }),
}));
vi.mock("../app/lib/auth", () => ({ setSession: vi.fn(), getSessionUser: () => box.user, clearSession: vi.fn() }));
vi.mock("../app/lib/mail", () => ({ sendMail: vi.fn(), emailShell: vi.fn(), emailButton: vi.fn(), sendPasswordReset: vi.fn(), hashToken: (x: string) => x }));

import { POST } from "../app/api/guardianship/route";
import { sendMail } from "../app/lib/mail";

box.db = makeDb();
const db = box.db;

const PARENT = { id: "p1", role: "PARENT", name: "Papá Test", email: "papa@x.com" };
const STUDENT_MINOR = { id: "s1", role: "STUDENT", email: "hijo@x.com", name: "Hijo Val", ageBand: "minor" };
const STUDENT_ADULT = { id: "s2", role: "STUDENT", email: "adulto@x.com", name: "Adulto Val", ageBand: "adult" };

async function claim(body: Record<string, unknown>) {
  const res = await POST(jsonReq("/api/guardianship", body));
  const json = await res.json();
  return { status: res.status, json };
}

beforeEach(() => {
  db.reset();
  vi.clearAllMocks();
  box.user = PARENT;
  // Por defecto: el alumno buscado por email es un MENOR sin vínculo previo.
  db.fn("user.findUnique").mockResolvedValue(STUDENT_MINOR);
  db.fn("guardianship.findUnique").mockResolvedValue(null);
  db.fn("guardianship.create").mockImplementation(async ({ data }: any) => ({ id: "g-new", ...data }));
  db.fn("guardianship.update").mockImplementation(async ({ data }: any) => ({ id: "g1", ...data }));
  db.fn("consentRecord.create").mockResolvedValue({ id: "c1" });
  db.fn("activityEvent.create").mockResolvedValue({ id: "a1" });
});

describe("POST /api/guardianship — gate de rol", () => {
  it("rechaza sin sesión con 401", async () => {
    box.user = null;
    const { status } = await claim({ email: "hijo@x.com" });
    expect(status).toBe(401);
    expect(db.fn("user.findUnique")).not.toHaveBeenCalled();
  });

  it("rechaza a quien no es PARENT con 403 (STUDENT no puede reclamar vínculos)", async () => {
    box.user = { id: "s1", role: "STUDENT" };
    const { status } = await claim({ email: "hijo@x.com" });
    expect(status).toBe(403);
    expect(db.fn("user.findUnique")).not.toHaveBeenCalled();
    expect(db.fn("guardianship.create")).not.toHaveBeenCalled();
  });
});

describe("POST /api/guardianship — vínculo nuevo", () => {
  it("crea un Guardianship PENDING con initiatedBy=parent (nunca ACTIVE por la sola palabra del padre)", async () => {
    const { status, json } = await claim({ email: "hijo@x.com" });

    expect(status).toBe(200);
    expect(json.already).toBe(false);

    const data = db.fn("guardianship.create").mock.calls[0][0].data;
    expect(data.status).toBe("PENDING");
    expect(data.initiatedBy).toBe("parent");
    expect(data.parentId).toBe(PARENT.id);
    expect(data.studentId).toBe(STUDENT_MINOR.id);
    expect(data.consentLevel).toBe("standard"); // default seguro (§11.3)

    expect(db.fn("consentRecord.create")).not.toHaveBeenCalled();
    expect(db.fn("activityEvent.create")).toHaveBeenCalledOnce();
  });

  it("respeta el consentLevel explícito de la allowlist (full es opt-in)", async () => {
    await claim({ email: "hijo@x.com", consentLevel: "full" });
    const data = db.fn("guardianship.create").mock.calls[0][0].data;
    expect(data.consentLevel).toBe("full");
  });
});

describe("POST /api/guardianship — confirmación de vínculo existente (COPPA)", () => {
  it("student-initiated + MENOR → el padre confirma: pasa a ACTIVE y escribe ConsentRecord en una $transaction", async () => {
    const existing = { id: "g1", status: "PENDING", initiatedBy: "student", parentId: PARENT.id, studentId: STUDENT_MINOR.id, consentLevel: "standard" };
    db.fn("guardianship.findUnique").mockResolvedValue(existing);

    const { status, json } = await claim({ email: "hijo@x.com" });

    expect(status).toBe(200);
    expect(json.already).toBe(false);
    expect(json.guardianship.status).toBe("ACTIVE");

    // Update del vínculo.
    const updateArg = db.fn("guardianship.update").mock.calls[0][0];
    expect(updateArg.where).toEqual({ id: existing.id });
    expect(updateArg.data.status).toBe("ACTIVE");

    // Evidencia COPPA auditable, misma transacción.
    const consentArg = db.fn("consentRecord.create").mock.calls[0][0].data;
    expect(consentArg.studentId).toBe(existing.studentId);
    expect(consentArg.grantedById).toBe(PARENT.id);
    expect(consentArg.kind).toBe("guardianship");
    expect(consentArg.policyVersion).toBe("2026-07");

    // Notificación al alumno, best-effort fuera de la tx.
    expect(sendMail).toHaveBeenCalledOnce();
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({ to: STUDENT_MINOR.email }));
  });

  it("student-initiated + ADULTO → NO auto-activa (el alumno adulto consiente por su cuenta)", async () => {
    db.fn("user.findUnique").mockResolvedValue(STUDENT_ADULT);
    const existing = { id: "g2", status: "PENDING", initiatedBy: "student", parentId: PARENT.id, studentId: STUDENT_ADULT.id, consentLevel: "standard" };
    db.fn("guardianship.findUnique").mockResolvedValue(existing);

    const { status, json } = await claim({ email: "adulto@x.com" });

    expect(status).toBe(200);
    expect(json.already).toBe(true);
    expect(json.guardianship).toEqual(existing);
    expect(db.fn("guardianship.update")).not.toHaveBeenCalled();
    expect(db.fn("consentRecord.create")).not.toHaveBeenCalled();
    expect(sendMail).not.toHaveBeenCalled();
  });

  it("parent-initiated sobre un MENOR → un segundo POST del padre NO auto-activa (falta el lado del menor)", async () => {
    const existing = { id: "g3", status: "PENDING", initiatedBy: "parent", parentId: PARENT.id, studentId: STUDENT_MINOR.id, consentLevel: "standard" };
    db.fn("guardianship.findUnique").mockResolvedValue(existing);

    const { status, json } = await claim({ email: "hijo@x.com" });

    expect(status).toBe(200);
    expect(json.already).toBe(true);
    expect(json.guardianship).toEqual(existing);
    expect(db.fn("guardianship.update")).not.toHaveBeenCalled();
    expect(db.fn("consentRecord.create")).not.toHaveBeenCalled();
    expect(sendMail).not.toHaveBeenCalled();
  });
});
