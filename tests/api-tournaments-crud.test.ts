// [BE-TEST · F6.2] Integración del CRUD de torneos: POST create (colección) + PATCH/DELETE [id].
//   · Gates de rol: STUDENT 403 en todo; TEACHER puede create/patch pero NO delete; ADMIN todo.
//   · Allowlist ESTRICTA: un campo no permitido (id/rounds/foo…) se ignora; un status inventado
//     cae al default (create) o se ignora (patch).
//   · Validación básica: sin nombre → 400.
//   · audit() se llama en create/update/delete (rastro F2, atribuible).
//   · Política de DELETE elegida: BLOQUEAR si hay inscritos (409) en vez de cascada silenciosa.
//   · La inscripción (POST register, sin op) sigue INTACTA.
// Mockea Prisma + sesión con el harness (mismo patrón vi.hoisted+Proxy del resto de la suite).
import { describe, it, expect, beforeEach, vi } from "vitest";
import { makeDb, jsonReq } from "./helpers/route-harness";

const box = vi.hoisted(() => ({ db: null as any, user: null as any }));
vi.mock("../app/lib/db", () => ({
  db: new Proxy({}, { get: (_t, p: string) => (p === "then" ? undefined : box.db.db[p]) }),
}));
vi.mock("../app/lib/auth", () => ({ setSession: vi.fn(), getSessionUser: () => box.user, clearSession: vi.fn() }));

import { POST } from "../app/api/tournaments/route";
import { PATCH, DELETE } from "../app/api/tournaments/[id]/route";

box.db = makeDb();
const db = box.db;

const STUDENT = { id: "u-stu", name: "Ana Estudiante", role: "STUDENT" };
const TEACHER = { id: "u-tea", name: "Saúl Coach", role: "TEACHER" };
const ADMIN = { id: "u-adm", name: "Admin OTR", role: "ADMIN" };
const TID = "trn-1";

// Estado ANTERIOR del torneo (lo que PATCH/DELETE leen antes de mutar).
const BEFORE = { id: TID, name: "Copa OTR", format: "PF", ageDivision: "JV", region: "RD", modality: "online", entryCents: 0, source: "OTR", status: "UPCOMING", startsAt: null };

async function post(user: any, body: Record<string, unknown>) {
  box.user = user;
  const res = await POST(jsonReq("/api/tournaments", body));
  return { status: res.status, json: await res.json() };
}
async function patch(user: any, body: Record<string, unknown>, id = TID) {
  box.user = user;
  const res = await PATCH(jsonReq(`/api/tournaments/${id}`, body, "PATCH"), { params: Promise.resolve({ id }) });
  return { status: res.status, json: await res.json() };
}
async function del(user: any, id = TID) {
  box.user = user;
  const res = await DELETE(jsonReq(`/api/tournaments/${id}`, undefined, "DELETE"), { params: Promise.resolve({ id }) });
  return { status: res.status, json: await res.json() };
}

beforeEach(() => {
  db.reset();
  vi.clearAllMocks();
  db.fn("tournament.create").mockImplementation(async ({ data }: any) => ({ id: "trn-new", ...data }));
  db.fn("tournament.findUnique").mockResolvedValue({ ...BEFORE, _count: { registrations: 0 } });
  db.fn("tournament.update").mockImplementation(async ({ data }: any) => ({ ...BEFORE, ...data }));
  db.fn("tournament.delete").mockResolvedValue({ id: TID });
});

// ------------------------------------------------------------------ POST create
describe("POST /api/tournaments (op:create) — alta de torneo", () => {
  const OK_BODY = { op: "create", name: "Nuevo Torneo", format: "LD", region: "RD" };

  it("STUDENT → 403 y no crea ni audita", async () => {
    const { status } = await post(STUDENT, OK_BODY);
    expect(status).toBe(403);
    expect(db.fn("tournament.create")).not.toHaveBeenCalled();
    expect(db.fn("auditLog.create")).not.toHaveBeenCalled();
  });

  it("TEACHER → 200, crea con la allowlist y escribe audit tournament.create", async () => {
    const { status, json } = await post(TEACHER, OK_BODY);
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
    const arg = db.fn("tournament.create").mock.calls[0][0].data;
    expect(arg).toMatchObject({ name: "Nuevo Torneo", format: "LD", region: "RD", modality: "online", source: "OTR", status: "UPCOMING", entryCents: 0 });
    expect(db.fn("auditLog.create").mock.calls[0][0].data).toMatchObject({ action: "tournament.create", actorId: TEACHER.id, targetType: "tournament" });
  });

  it("ADMIN → 200 (también puede crear)", async () => {
    const { status } = await post(ADMIN, OK_BODY);
    expect(status).toBe(200);
    expect(db.fn("tournament.create")).toHaveBeenCalledOnce();
  });

  it("sin nombre → 400 y no crea (validación básica)", async () => {
    const { status } = await post(ADMIN, { op: "create", format: "PF" });
    expect(status).toBe(400);
    expect(db.fn("tournament.create")).not.toHaveBeenCalled();
  });

  it("allowlist: ignora campos peligrosos (id/rounds/registrations/foo) y normaliza status inventado", async () => {
    await post(ADMIN, { op: "create", name: "X", status: "HACKED", id: "evil", rounds: [{ label: "x" }], registrations: [{}], foo: "bar", _count: {} });
    const arg = db.fn("tournament.create").mock.calls[0][0].data;
    expect(arg).not.toHaveProperty("id");
    expect(arg).not.toHaveProperty("rounds");
    expect(arg).not.toHaveProperty("registrations");
    expect(arg).not.toHaveProperty("foo");
    expect(arg).not.toHaveProperty("_count");
    expect(arg.status).toBe("UPCOMING"); // valor no permitido → default seguro
  });

  it("entryCents: negativo/basura → 0; entero válido se conserva", async () => {
    await post(ADMIN, { op: "create", name: "A", entryCents: -50 });
    expect(db.fn("tournament.create").mock.calls[0][0].data.entryCents).toBe(0);
    db.fn("tournament.create").mockClear();
    await post(ADMIN, { op: "create", name: "B", entryCents: 50000 });
    expect(db.fn("tournament.create").mock.calls[0][0].data.entryCents).toBe(50000);
  });
});

// ------------------------------------------------------------------ POST register intacto
describe("POST /api/tournaments (sin op) — la inscripción sigue intacta", () => {
  it("STUDENT con tournamentId se inscribe (no toca la rama de creación)", async () => {
    db.fn("tournament.findUnique").mockResolvedValue({ id: TID, status: "UPCOMING" });
    db.fn("tournamentRegistration.findUnique").mockResolvedValue(null);
    db.fn("tournamentRegistration.create").mockResolvedValue({ id: "reg-1", tournamentId: TID, userId: STUDENT.id });
    const { status, json } = await post(STUDENT, { tournamentId: TID });
    expect(status).toBe(200);
    expect(json.registration).toMatchObject({ id: "reg-1" });
    expect(db.fn("tournament.create")).not.toHaveBeenCalled();
  });

  it("POST sin op ni tournamentId → 'Falta el torneo' (400), NO cae a creación", async () => {
    const { status } = await post(STUDENT, {});
    expect(status).toBe(400);
    expect(db.fn("tournament.create")).not.toHaveBeenCalled();
  });
});

// ------------------------------------------------------------------ PATCH [id]
describe("PATCH /api/tournaments/[id] — edición", () => {
  it("STUDENT → 403 y no actualiza", async () => {
    const { status } = await patch(STUDENT, { status: "LIVE" });
    expect(status).toBe(403);
    expect(db.fn("tournament.update")).not.toHaveBeenCalled();
  });

  it("TEACHER → 200, actualiza y audita tournament.update con antes→después", async () => {
    const { status } = await patch(TEACHER, { status: "LIVE" });
    expect(status).toBe(200);
    expect(db.fn("tournament.update").mock.calls[0][0].data).toEqual({ status: "LIVE" });
    const audit = db.fn("auditLog.create").mock.calls[0][0].data;
    expect(audit.action).toBe("tournament.update");
    expect(audit.detail).toMatch(/status: UPCOMING→LIVE/);
  });

  it("ADMIN → 200 (también puede editar)", async () => {
    const { status } = await patch(ADMIN, { name: "Copa Renombrada" });
    expect(status).toBe(200);
    expect(db.fn("tournament.update").mock.calls[0][0].data).toEqual({ name: "Copa Renombrada" });
  });

  it("torneo inexistente → 404", async () => {
    db.fn("tournament.findUnique").mockResolvedValue(null);
    const { status } = await patch(ADMIN, { status: "LIVE" });
    expect(status).toBe(404);
    expect(db.fn("tournament.update")).not.toHaveBeenCalled();
  });

  it("allowlist: un campo no permitido (id/foo) NO llega al update; solo el válido", async () => {
    await patch(ADMIN, { id: "evil", foo: "bar", region: "Internacional" });
    expect(db.fn("tournament.update").mock.calls[0][0].data).toEqual({ region: "Internacional" });
  });

  it("solo un status inventado (sin nada válido) → 'Nada que actualizar' (400)", async () => {
    const { status } = await patch(ADMIN, { status: "NOPE" });
    expect(status).toBe(400);
    expect(db.fn("tournament.update")).not.toHaveBeenCalled();
  });
});

// ------------------------------------------------------------------ DELETE [id]
describe("DELETE /api/tournaments/[id] — borrado (solo ADMIN, bloquea con inscritos)", () => {
  it("STUDENT → 403", async () => {
    const { status } = await del(STUDENT);
    expect(status).toBe(403);
    expect(db.fn("tournament.delete")).not.toHaveBeenCalled();
  });

  it("TEACHER → 403 (crear/editar sí, borrar NO)", async () => {
    const { status } = await del(TEACHER);
    expect(status).toBe(403);
    expect(db.fn("tournament.delete")).not.toHaveBeenCalled();
    expect(db.fn("auditLog.create")).not.toHaveBeenCalled();
  });

  it("ADMIN sin inscritos → 200, borra y audita tournament.delete", async () => {
    db.fn("tournament.findUnique").mockResolvedValue({ ...BEFORE, _count: { registrations: 0 } });
    const { status } = await del(ADMIN);
    expect(status).toBe(200);
    expect(db.fn("tournament.delete")).toHaveBeenCalledWith({ where: { id: TID } });
    expect(db.fn("auditLog.create").mock.calls[0][0].data).toMatchObject({ action: "tournament.delete", targetId: TID });
  });

  it("ADMIN con inscritos → 409, NO borra ni audita (política: bloquear)", async () => {
    db.fn("tournament.findUnique").mockResolvedValue({ ...BEFORE, _count: { registrations: 3 } });
    const { status, json } = await del(ADMIN);
    expect(status).toBe(409);
    expect(json.error).toMatch(/inscritos/i);
    expect(db.fn("tournament.delete")).not.toHaveBeenCalled();
    expect(db.fn("auditLog.create")).not.toHaveBeenCalled();
  });

  it("ADMIN sobre torneo inexistente → 200 idempotente (no borra)", async () => {
    db.fn("tournament.findUnique").mockResolvedValue(null);
    const { status } = await del(ADMIN);
    expect(status).toBe(200);
    expect(db.fn("tournament.delete")).not.toHaveBeenCalled();
  });
});
