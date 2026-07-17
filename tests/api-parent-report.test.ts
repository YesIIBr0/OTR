// [BE-TEST · F5.3] Integración de GET /api/parent-report — reporte mensual del hijo (PRD §11).
// Protege el gate de DATOS DE MENORES: solo un PARENT con Guardianship ACTIVE parent=yo↔hijo
// puede leer el reporte de ese estudiante. Cualquier otro rol, o un padre SIN vínculo activo,
// nunca ve los datos (403). Además fija la forma del reporte: asistencia del mes, gasto del mes,
// skills, y el "próximo paso" apuntando al skill más bajo — bilingüe (es/en). Mockea Prisma + sesión.
import { describe, it, expect, beforeEach, vi } from "vitest";
import { makeDb } from "./helpers/route-harness";

// Caja hoisteada (los factory de vi.mock se elevan sobre los imports; solo pueden tocar
// `vi` y vars de vi.hoisted). El Proxy reenvía perezosamente a box.db.db.
const box = vi.hoisted(() => ({ db: null as any, user: null as any }));
vi.mock("../app/lib/db", () => ({
  db: new Proxy({}, { get: (_t, p: string) => (p === "then" ? undefined : box.db.db[p]) }),
}));
vi.mock("../app/lib/auth", () => ({ setSession: vi.fn(), getSessionUser: () => box.user, clearSession: vi.fn() }));

import { GET } from "../app/api/parent-report/route";

box.db = makeDb();
const db = box.db;

const PARENT = { id: "p1", role: "PARENT", name: "Papá Test" };
const STUDENT_ID = "s1";

async function get(studentId?: string) {
  const qs = studentId === undefined ? "" : `?studentId=${encodeURIComponent(studentId)}`;
  const res = await GET(new Request(`http://test.local/api/parent-report${qs}`));
  return { status: res.status, json: await res.json() };
}

beforeEach(() => {
  db.reset();
  vi.clearAllMocks();
  box.user = PARENT;
});

describe("GET /api/parent-report — gate de acceso a datos del menor", () => {
  it("sin sesión → 401", async () => {
    box.user = null;
    const { status } = await get(STUDENT_ID);
    expect(status).toBe(401);
    expect(db.fn("guardianship.findUnique")).not.toHaveBeenCalled();
  });

  it("rol distinto de PARENT (STUDENT) → 403", async () => {
    box.user = { id: "x", role: "STUDENT" };
    const { status } = await get(STUDENT_ID);
    expect(status).toBe(403);
    expect(db.fn("guardianship.findUnique")).not.toHaveBeenCalled();
  });

  it("falta studentId → 400", async () => {
    const { status } = await get(); // sin query
    expect(status).toBe(400);
  });

  it("PARENT SIN vínculo con ese estudiante (findUnique null) → 403, sin exponer datos", async () => {
    db.fn("guardianship.findUnique").mockResolvedValue(null);
    const { status, json } = await get(STUDENT_ID);
    expect(status).toBe(403);
    expect(json.error).toBe("No tienes un vínculo activo con ese estudiante");
    expect(db.fn("user.findUnique")).not.toHaveBeenCalled();
    // La consulta del vínculo va estrictamente por (parentId=yo, studentId) — nunca por id ajeno.
    expect(db.fn("guardianship.findUnique").mock.calls[0][0].where).toEqual({
      parentId_studentId: { parentId: PARENT.id, studentId: STUDENT_ID },
    });
  });

  it("vínculo existe pero NO está ACTIVE (p.ej. PENDING) → 403", async () => {
    db.fn("guardianship.findUnique").mockResolvedValue({ status: "PENDING" });
    const { status } = await get(STUDENT_ID);
    expect(status).toBe(403);
    expect(db.fn("user.findUnique")).not.toHaveBeenCalled();
  });

  it("vínculo ACTIVE pero el estudiante no existe → 404", async () => {
    db.fn("guardianship.findUnique").mockResolvedValue({ status: "ACTIVE" });
    db.fn("user.findUnique").mockResolvedValue(null);
    const { status } = await get(STUDENT_ID);
    expect(status).toBe(404);
  });
});

describe("GET /api/parent-report — composición del reporte (vínculo ACTIVE)", () => {
  beforeEach(() => {
    db.fn("guardianship.findUnique").mockResolvedValue({ status: "ACTIVE" });
    db.fn("user.findUnique").mockResolvedValue({
      id: STUDENT_ID, name: "Hijo Val", initials: "HV", level: "Novato", xp: 120, ageBand: "minor",
    });
    // 3 sesiones del mes: 2 COMPLETED (una con grabación) + 1 CONFIRMED → asistencia 2/3 = 67%.
    db.fn("booking.findMany").mockResolvedValue([
      { id: "b1", status: "COMPLETED", slotAt: new Date(), recordingUrl: "/uploads/rec.mp4" },
      { id: "b2", status: "COMPLETED", slotAt: new Date(), recordingUrl: null },
      { id: "b3", status: "CONFIRMED", slotAt: new Date(), recordingUrl: null },
    ]);
    // El más bajo (Delivery=40) debe ser el foco del "próximo paso".
    db.fn("studentSkill.findMany").mockResolvedValue([
      { skill: "Confianza", score: 80 },
      { skill: "Delivery", score: 40 },
    ]);
    db.fn("certificate.findMany").mockResolvedValue([
      { id: "c1", title: "Fundamentos PF", issuedAt: new Date() },
    ]);
    // Gasto del mes: 5000 + 2500 = 7500 centavos → "$75".
    db.fn("escrowTxn.findMany").mockResolvedValue([{ amountCents: 5000 }, { amountCents: 2500 }]);
  });

  it("devuelve el reporte con asistencia, gasto, skills y foco en el skill más bajo (es/en)", async () => {
    const { status, json } = await get(STUDENT_ID);
    expect(status).toBe(200);
    const r = json.report;
    expect(r.studentId).toBe(STUDENT_ID);
    expect(r.studentName).toBe("Hijo Val");

    // Asistencia del mes: 2 asistidas de 3 agendadas → 67%.
    expect(r.es.attendance).toEqual({ attended: 2, scheduled: 3, pct: 67 });
    // Grabaciones: solo la sesión COMPLETED con recordingUrl.
    expect(r.es.recordings).toHaveLength(1);
    expect(r.es.recordings[0].url).toBe("/uploads/rec.mp4");

    // Gasto del mes.
    expect(r.es.spendCents).toBe(7500);
    expect(r.es.spendLabel).toBe("$75");

    // Próximo paso → el skill más bajo (Delivery).
    expect(r.es.focusSkill).toBe("Delivery");
    expect(r.es.nextStep).toContain("Delivery");
    expect(r.en.focusSkill).toBe("Delivery"); // Cross-ex/Delivery no cambian de nombre en EN

    // Skills presentes en ambos idiomas.
    expect(r.es.skills).toHaveLength(2);
    expect(r.en.skills).toHaveLength(2);

    // El gasto se consulta con status != REFUNDED (solo cuenta el dinero efectivamente comprometido).
    expect(db.fn("escrowTxn.findMany").mock.calls[0][0].where.status).toEqual({ not: "REFUNDED" });
  });
});
