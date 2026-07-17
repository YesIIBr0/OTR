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

import { POST, PATCH } from "../app/api/guardianship/route";
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

async function patch(body: Record<string, unknown>) {
  const res = await PATCH(jsonReq("/api/guardianship", body, "PATCH"));
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

// [BE-TEST · BUG vínculo-padre §11.3] PATCH /api/guardianship — el lado del ALUMNO que faltaba:
// un padre reclama un vínculo (initiatedBy="parent") que nace PENDING y nunca se auto-activa
// (COPPA); el alumno debe poder CONFIRMARLO o RECHAZARLO desde su cuenta. Confirmar activa +
// escribe ConsentRecord en la misma $transaction (mismo patrón que la confirmación del padre
// en POST); rechazar deja el vínculo en REVOKED sin evidencia de consentimiento.
describe("PATCH /api/guardianship — el alumno confirma/rechaza un vínculo parent-initiated", () => {
  const PENDING_PARENT_INITIATED = {
    id: "g1", studentId: STUDENT_MINOR.id, parentId: PARENT.id, status: "PENDING", initiatedBy: "parent",
  };

  it("rechaza sin sesión con 401", async () => {
    box.user = null;
    const { status } = await patch({ guardianshipId: "g1" });
    expect(status).toBe(401);
  });

  it("rechaza a un rol que no es STUDENT ni PARENT con 403", async () => {
    box.user = { id: "t1", role: "TEACHER" };
    const { status } = await patch({ guardianshipId: "g1" });
    expect(status).toBe(403);
    expect(db.fn("guardianship.findUnique")).not.toHaveBeenCalled();
  });

  it("404 si la solicitud no existe", async () => {
    box.user = STUDENT_MINOR;
    db.fn("guardianship.findUnique").mockResolvedValue(null);
    const { status } = await patch({ guardianshipId: "g-no-existe" });
    expect(status).toBe(404);
  });

  it("404 si el vínculo es de OTRO alumno (ownership estricto — nunca por id ajeno)", async () => {
    box.user = STUDENT_MINOR;
    db.fn("guardianship.findUnique").mockResolvedValue({ ...PENDING_PARENT_INITIATED, studentId: "otro-alumno" });
    const { status } = await patch({ guardianshipId: "g1" });
    expect(status).toBe(404);
    expect(db.fn("guardianship.update")).not.toHaveBeenCalled();
  });

  it("400 si initiatedBy='student' (ese lo confirma el PADRE vía POST, no esta ruta)", async () => {
    box.user = STUDENT_MINOR;
    db.fn("guardianship.findUnique").mockResolvedValue({ ...PENDING_PARENT_INITIATED, initiatedBy: "student" });
    const { status } = await patch({ guardianshipId: "g1" });
    expect(status).toBe(400);
    expect(db.fn("guardianship.update")).not.toHaveBeenCalled();
  });

  it("400 si el vínculo ya no está PENDING (p.ej. ya ACTIVE)", async () => {
    box.user = STUDENT_MINOR;
    db.fn("guardianship.findUnique").mockResolvedValue({ ...PENDING_PARENT_INITIATED, status: "ACTIVE" });
    const { status } = await patch({ guardianshipId: "g1" });
    expect(status).toBe(400);
    expect(db.fn("guardianship.update")).not.toHaveBeenCalled();
  });

  it("confirma: PENDING+initiatedBy=parent+dueño → ACTIVE + ConsentRecord en una $transaction + email al padre", async () => {
    box.user = STUDENT_MINOR;
    db.fn("guardianship.findUnique").mockResolvedValue(PENDING_PARENT_INITIATED);
    db.fn("user.findUnique").mockResolvedValue(PARENT); // fetch del padre para notificarlo
    db.fn("guardianship.update").mockImplementation(async ({ data }: any) => ({ ...PENDING_PARENT_INITIATED, ...data }));
    db.fn("consentRecord.create").mockResolvedValue({ id: "c1" });

    const { status, json } = await patch({ guardianshipId: "g1" });

    expect(status).toBe(200);
    expect(json.guardianship.status).toBe("ACTIVE");

    const updateArg = db.fn("guardianship.update").mock.calls[0][0];
    expect(updateArg.where).toEqual({ id: "g1" });
    expect(updateArg.data.status).toBe("ACTIVE");

    // Evidencia COPPA auditable, misma transacción — grantedById es el ALUMNO (quien confirma).
    const consentArg = db.fn("consentRecord.create").mock.calls[0][0].data;
    expect(consentArg.studentId).toBe(STUDENT_MINOR.id);
    expect(consentArg.grantedById).toBe(STUDENT_MINOR.id);
    expect(consentArg.kind).toBe("guardianship");
    expect(consentArg.policyVersion).toBe("2026-07");

    // Notificación al padre, best-effort fuera de la tx.
    expect(sendMail).toHaveBeenCalledOnce();
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({ to: PARENT.email }));
  });

  it("rechaza (action:'reject'): PENDING+initiatedBy=parent+dueño → REVOKED, sin ConsentRecord ni email", async () => {
    box.user = STUDENT_MINOR;
    db.fn("guardianship.findUnique").mockResolvedValue(PENDING_PARENT_INITIATED);
    db.fn("user.findUnique").mockResolvedValue(PARENT);
    db.fn("guardianship.update").mockImplementation(async ({ data }: any) => ({ ...PENDING_PARENT_INITIATED, ...data }));

    const { status, json } = await patch({ guardianshipId: "g1", action: "reject" });

    expect(status).toBe(200);
    expect(json.guardianship.status).toBe("REVOKED");
    const updateArg = db.fn("guardianship.update").mock.calls[0][0];
    expect(updateArg.data).toEqual({ status: "REVOKED" });
    expect(db.fn("consentRecord.create")).not.toHaveBeenCalled();
    expect(sendMail).not.toHaveBeenCalled();
  });
});
