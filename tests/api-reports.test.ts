// [BE-TEST] Integración de /api/reports — moderación (PRD §7.4) + endurecimiento F1.
//   PATCH suspend (F1.6, anti-lockout): copia la guarda de /api/admin/users — no puedes
//     suspenderte a ti mismo ni suspender a otro ADMIN (si no, un admin queda fuera de la
//     plataforma desde la cola de moderación).
//   POST (F1.4, rate-limit): la cola de moderación no se puede inundar (10 / 10 min por usuario).
// A diferencia del resto de la suite, este archivo NO mockea el rate-limit: ejercita el limiter
// REAL de POST end-to-end (con un userId dedicado para no contaminar los demás tests). Los tests
// de PATCH no tocan el limiter (solo POST lo invoca). Mockea Prisma + sesión (harness).
import { describe, it, expect, beforeEach, vi } from "vitest";
import { makeDb, jsonReq } from "./helpers/route-harness";

// Caja hoisteada (los factory de vi.mock se elevan sobre los imports; solo pueden tocar
// `vi` y vars de vi.hoisted). El Proxy reenvía perezosamente a box.db.db.
const box = vi.hoisted(() => ({ db: null as any, user: null as any }));
vi.mock("../app/lib/db", () => ({
  db: new Proxy({}, { get: (_t, p: string) => (p === "then" ? undefined : box.db.db[p]) }),
}));
vi.mock("../app/lib/auth", () => ({ setSession: vi.fn(), getSessionUser: () => box.user, clearSession: vi.fn() }));

import { GET, POST, PATCH } from "../app/api/reports/route";

box.db = makeDb();
const db = box.db;

const ADMIN = { id: "admin-1", name: "Admin OTR", role: "ADMIN" };

async function patch(body: Record<string, unknown>) {
  const res = await PATCH(jsonReq("/api/reports", body, "PATCH"));
  const json = await res.json();
  return { status: res.status, json };
}

async function get() {
  const res = await GET(jsonReq("/api/reports", undefined, "GET"));
  const json = await res.json();
  return { status: res.status, json };
}

// ---------------------------------------------------------------------------
// PATCH suspend — anti-lockout (F1.6)
// ---------------------------------------------------------------------------
describe("PATCH /api/reports — suspend (anti-lockout F1.6)", () => {
  const REPORT_ID = "rep-1";
  const TARGET_USER_ID = "student-9";

  beforeEach(() => {
    db.reset();
    vi.clearAllMocks();
    box.user = ADMIN;
    // Reporte OPEN contra un usuario objetivo.
    db.fn("report.findUnique").mockResolvedValue({ id: REPORT_ID, targetType: "user", targetId: TARGET_USER_ID, status: "OPEN" });
    db.fn("user.update").mockResolvedValue({ id: TARGET_USER_ID, suspended: true });
    db.fn("report.update").mockResolvedValue({ id: REPORT_ID, status: "REVIEWED" });
  });

  it("suspende a un usuario normal (no admin, no uno mismo): 200 + user.update suspended=true", async () => {
    db.fn("user.findUnique").mockResolvedValue({ role: "STUDENT" });
    const { status, json } = await patch({ reportId: REPORT_ID, action: "suspend" });
    expect(status).toBe(200);
    expect(json.suspended).toBe(true);
    expect(db.fn("user.update")).toHaveBeenCalledOnce();
    expect(db.fn("user.update").mock.calls[0][0]).toEqual({
      where: { id: TARGET_USER_ID },
      data: { suspended: true },
    });
    expect(db.fn("report.update")).toHaveBeenCalledOnce();
  });

  it("[F2.1] suspend setea resolvedBy = admin en el Report y escribe AuditLog user.suspend", async () => {
    db.fn("user.findUnique").mockResolvedValue({ role: "STUDENT" });
    await patch({ reportId: REPORT_ID, action: "suspend" });
    // El Report guarda QUÉ admin resolvió.
    expect(db.fn("report.update").mock.calls[0][0].data).toMatchObject({ status: "REVIEWED", resolvedBy: ADMIN.id });
    // Rastro de auditoría con la acción correcta y el actor como snapshot.
    expect(db.fn("auditLog.create")).toHaveBeenCalledOnce();
    expect(db.fn("auditLog.create").mock.calls[0][0].data).toMatchObject({
      actorId: ADMIN.id, actorName: ADMIN.name, action: "user.suspend", targetType: "user", targetId: TARGET_USER_ID,
    });
  });

  it("[F2.1] unsuspend escribe AuditLog user.unsuspend y setea resolvedBy", async () => {
    await patch({ reportId: REPORT_ID, action: "unsuspend" });
    expect(db.fn("report.update").mock.calls[0][0].data).toMatchObject({ resolvedBy: ADMIN.id });
    expect(db.fn("auditLog.create").mock.calls[0][0].data).toMatchObject({ action: "user.unsuspend", targetId: TARGET_USER_ID });
  });

  it("BLOQUEA suspender a otro ADMIN: 400 y NO ejecuta user.update", async () => {
    db.fn("user.findUnique").mockResolvedValue({ role: "ADMIN" });
    const { status, json } = await patch({ reportId: REPORT_ID, action: "suspend" });
    expect(status).toBe(400);
    expect(json.ok).toBe(false);
    expect(db.fn("user.update")).not.toHaveBeenCalled();
    expect(db.fn("report.update")).not.toHaveBeenCalled();
  });

  it("BLOQUEA la auto-suspensión (el objetivo es el propio admin): 400 y NO ejecuta user.update", async () => {
    // El reporte apunta al propio admin logueado.
    db.fn("report.findUnique").mockResolvedValue({ id: REPORT_ID, targetType: "user", targetId: ADMIN.id, status: "OPEN" });
    const { status } = await patch({ reportId: REPORT_ID, action: "suspend" });
    expect(status).toBe(400);
    expect(db.fn("user.update")).not.toHaveBeenCalled();
    // Corta ANTES de consultar el rol (auto-suspensión se detecta por id).
    expect(db.fn("user.findUnique")).not.toHaveBeenCalled();
  });

  it("unsuspend NO aplica la guarda anti-lockout (reactivar nunca bloquea): 200", async () => {
    db.fn("report.findUnique").mockResolvedValue({ id: REPORT_ID, targetType: "user", targetId: TARGET_USER_ID, status: "OPEN" });
    const { status } = await patch({ reportId: REPORT_ID, action: "unsuspend" });
    expect(status).toBe(200);
    // La guarda solo aplica a "suspend": unsuspend nunca consulta el rol ni bloquea.
    expect(db.fn("user.findUnique")).not.toHaveBeenCalled();
    expect(db.fn("user.update")).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// PATCH resolver — resolvedBy + AuditLog (F2.1)
// ---------------------------------------------------------------------------
describe("PATCH /api/reports — resolver (F2.1)", () => {
  const REPORT_ID = "rep-2";

  beforeEach(() => {
    db.reset();
    vi.clearAllMocks();
    box.user = ADMIN;
    db.fn("report.findUnique").mockResolvedValue({ id: REPORT_ID, targetType: "message", targetId: "m-1", status: "OPEN" });
    db.fn("report.update").mockResolvedValue({ id: REPORT_ID, status: "REVIEWED" });
  });

  it("resolver REVIEWED setea resolvedBy = admin y escribe AuditLog report.resolve", async () => {
    const { status } = await patch({ reportId: REPORT_ID, status: "REVIEWED", resolution: "sin acción" });
    expect(status).toBe(200);
    expect(db.fn("report.update").mock.calls[0][0].data).toMatchObject({ status: "REVIEWED", resolution: "sin acción", resolvedBy: ADMIN.id });
    expect(db.fn("auditLog.create")).toHaveBeenCalledOnce();
    expect(db.fn("auditLog.create").mock.calls[0][0].data).toMatchObject({
      actorId: ADMIN.id, actorName: ADMIN.name, action: "report.resolve", targetType: "report", targetId: REPORT_ID,
    });
  });

  it("resolver DISMISSED también setea resolvedBy y audita report.resolve", async () => {
    const { status } = await patch({ reportId: REPORT_ID, status: "DISMISSED" });
    expect(status).toBe(200);
    expect(db.fn("report.update").mock.calls[0][0].data).toMatchObject({ status: "DISMISSED", resolvedBy: ADMIN.id });
    expect(db.fn("auditLog.create").mock.calls[0][0].data).toMatchObject({ action: "report.resolve" });
  });
});

// ---------------------------------------------------------------------------
// GET — contexto del objetivo (F2.3): el admin modera VIENDO el contenido reportado.
//   El servidor resuelve el context según targetType (message/conversation/booking) en batch
//   y escapa el texto de usuario UNA vez (el builder scr-admin lo renderiza crudo).
// ---------------------------------------------------------------------------
describe("GET /api/reports — contexto del objetivo (F2.3)", () => {
  // Nombres devueltos por user.findMany (mismo mock cubre reporters, targets y usuarios del
  // contexto — el harness memoiza un único vi.fn por "user.findMany"; filtramos por where.id.in).
  const USERS: Record<string, string> = {
    "u-reporter": "Reporter OTR",
    "u-sender": "Emisor OTR",
    "coach-user": "Coach Uno",
    "student-user": "Alumno Uno",
  };

  beforeEach(() => {
    db.reset();
    vi.clearAllMocks();
    box.user = ADMIN;
    db.fn("report.count").mockResolvedValue(1);
    // Defaults vacíos: cada test sobrescribe solo la query de su tipo de objetivo.
    db.fn("chatMessage.findMany").mockResolvedValue([]);
    db.fn("conversation.findMany").mockResolvedValue([]);
    db.fn("booking.findMany").mockResolvedValue([]);
    db.fn("coachProfile.findMany").mockResolvedValue([]);
    db.fn("user.findMany").mockImplementation(async (arg: any) => {
      const ids: string[] = (arg && arg.where && arg.where.id && arg.where.id.in) || [];
      return ids.map((id) => ({ id, name: USERS[id] })).filter((u) => u.name);
    });
  });

  it("(1) un report de message incluye context.body (escapado UNA vez) + emisor + conversationId", async () => {
    db.fn("report.findMany").mockResolvedValue([
      { id: "rep-msg", reporterId: "u-reporter", targetType: "message", targetId: "m-1", reason: "contenido ofensivo", status: "OPEN", resolution: null, createdAt: new Date() },
    ]);
    db.fn("chatMessage.findMany").mockResolvedValue([
      { id: "m-1", body: "texto <ofensivo> & directo", senderId: "u-sender", conversationId: "conv-1" },
    ]);

    const { status, json } = await get();
    expect(status).toBe(200);
    const rep = json.reports[0];
    expect(rep.context).toBeTruthy();
    expect(rep.context.kind).toBe("message");
    // esc() aplicado EXACTAMENTE una vez en el servidor (el builder lo renderiza crudo).
    expect(rep.context.body).toBe("texto &lt;ofensivo&gt; &amp; directo");
    expect(rep.context.senderName).toBe("Emisor OTR");
    expect(rep.context.conversationId).toBe("conv-1");
    // Batch, sin N+1: una sola consulta a ChatMessage con los ids agrupados.
    expect(db.fn("chatMessage.findMany")).toHaveBeenCalledOnce();
    expect(db.fn("chatMessage.findMany").mock.calls[0][0].where).toEqual({ id: { in: ["m-1"] } });
  });

  it("(2) un report de booking incluye context con coach, alumno y estado", async () => {
    db.fn("report.findMany").mockResolvedValue([
      { id: "rep-bk", reporterId: "u-reporter", targetType: "booking", targetId: "bk-1", reason: "no se presentó", status: "OPEN", resolution: null, createdAt: new Date() },
    ]);
    db.fn("booking.findMany").mockResolvedValue([
      { id: "bk-1", coachId: "coach-user", studentId: "student-user", slotAt: new Date("2026-08-01T15:00:00Z"), status: "DISPUTED" },
    ]);

    const { status, json } = await get();
    expect(status).toBe(200);
    const rep = json.reports[0];
    expect(rep.context).toBeTruthy();
    expect(rep.context.kind).toBe("booking");
    expect(rep.context).toMatchObject({ coachName: "Coach Uno", studentName: "Alumno Uno", status: "DISPUTED" });
    expect(rep.context.slotAt).toBeTruthy();
    // No se consultan las otras tablas de contexto.
    expect(db.fn("chatMessage.findMany")).not.toHaveBeenCalled();
    expect(db.fn("conversation.findMany")).not.toHaveBeenCalled();
  });

  it("(3) un report con targetId inexistente devuelve context null (sin 500)", async () => {
    db.fn("report.findMany").mockResolvedValue([
      { id: "rep-x", reporterId: "u-reporter", targetType: "message", targetId: "no-existe", reason: "x", status: "OPEN", resolution: null, createdAt: new Date() },
    ]);
    db.fn("chatMessage.findMany").mockResolvedValue([]); // nada matchea el id fantasma

    const { status, json } = await get();
    expect(status).toBe(200);
    expect(json.reports[0].context).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// POST — rate-limit real (F1.4)
// ---------------------------------------------------------------------------
describe("POST /api/reports — rate-limit (F1.4)", () => {
  beforeEach(() => {
    // NB: NO reseteamos el limiter (es estado de módulo real); usamos un userId dedicado
    // por test para aislar el contador. Sí reseteamos los mocks de DB.
    db.reset();
    vi.clearAllMocks();
    db.fn("report.create").mockResolvedValue({ id: "rep-created" });
    db.fn("activityEvent.create").mockResolvedValue({ id: "act-1" });
  });

  async function file(userId: string) {
    box.user = { id: userId, name: "Reporter", role: "STUDENT" };
    const res = await POST(jsonReq("/api/reports", { targetType: "message", targetId: "m-1", reason: "spam" }));
    return res.status;
  }

  it("un reporte válido devuelve 200 (por debajo del límite)", async () => {
    expect(await file("reporter-ok")).toBe(200);
  });

  it("al 11º reporte en la ventana responde 429 (límite 10 / ventana)", async () => {
    const FLOODER = "flooder-1"; // userId dedicado → contador aislado del resto de tests
    const statuses: number[] = [];
    for (let i = 0; i < 11; i++) statuses.push(await file(FLOODER));
    // Los 10 primeros pasan; el 11º se corta.
    expect(statuses.slice(0, 10)).toEqual(Array(10).fill(200));
    expect(statuses[10]).toBe(429);
  });
});
