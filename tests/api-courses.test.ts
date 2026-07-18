// [BE-TEST · F6.3] Dueño del curso y reasignación por ADMIN.
//   POST /api/courses:
//     · ADMIN + teacherId válido (TEACHER/ADMIN) → el curso nace a nombre de ESE coach + audit course.create.
//     · ADMIN + teacherId inexistente o con rol STUDENT → 400 (no crea, no audita).
//     · TEACHER manda teacherId → SE IGNORA (dueño = él mismo, sin audit; conserva el anti mass-assignment).
//     · ADMIN sin teacherId → comportamiento histórico (dueño = admin, sin audit).
//   PATCH /api/courses/[id]:
//     · ADMIN reasigna a otro coach válido → cambia teacherId+coachName + audit course.reassign (antes→después).
//     · ADMIN reasigna a inexistente/STUDENT → 400 (no actualiza, no audita).
//     · TEACHER manda teacherId → SE IGNORA (fuera del allowlist), edita el resto y responde 200 SIN reasignar
//       (decisión de diseño: el teacher dueño no ve un 403 al tocar campos legítimos; su teacherId simplemente
//        no entra al update, igual que published/priceCents — el anti mass-assignment se conserva).
//     · TEACHER que NO es dueño → 403.
// Mockea Prisma + sesión con el harness (mismo patrón vi.hoisted+Proxy del resto de la suite).
// authz.teacherOwnsCourse y audit() NO se mockean: corren su lógica real sobre el db falso.
import { describe, it, expect, beforeEach, vi } from "vitest";
import { makeDb, jsonReq } from "./helpers/route-harness";

const box = vi.hoisted(() => ({ db: null as any, user: null as any }));
vi.mock("../app/lib/db", () => ({
  db: new Proxy({}, { get: (_t, p: string) => (p === "then" ? undefined : box.db.db[p]) }),
}));
vi.mock("../app/lib/auth", () => ({ setSession: vi.fn(), getSessionUser: () => box.user, clearSession: vi.fn() }));

import { POST } from "../app/api/courses/route";
import { PATCH } from "../app/api/courses/[id]/route";

box.db = makeDb();
const db = box.db;

const TEACHER = { id: "u-tea", name: "Saúl Coach", role: "TEACHER" };
const TEACHER2 = { id: "u-tea2", name: "Ana Coach", role: "TEACHER" };
const STUDENT = { id: "u-stu", name: "Luis Alumno", role: "STUDENT" };
const ADMIN = { id: "u-adm", name: "Admin OTR", role: "ADMIN" };
const CID = "crs-1";

// Curso ANTERIOR (lo que teacherOwnsCourse lee vía course.findUnique): dueño = TEACHER.
const BEFORE = { id: CID, name: "Public Forum II", code: "PF-201", teacherId: TEACHER.id, coachName: TEACHER.name, welcomeVideoKind: "none" };

async function post(user: any, body: Record<string, unknown>) {
  box.user = user;
  const res = await POST(jsonReq("/api/courses", body));
  return { status: res.status, json: await res.json() };
}
async function patch(user: any, body: Record<string, unknown>, id = CID) {
  box.user = user;
  const res = await PATCH(jsonReq(`/api/courses/${id}`, body, "PATCH"), { params: Promise.resolve({ id }) });
  return { status: res.status, json: await res.json() };
}

beforeEach(() => {
  db.reset();
  vi.clearAllMocks();
  // POST: el código no existe (findUnique del code → null); count → 3; create ecoa la data con id.
  db.fn("course.findUnique").mockResolvedValue(null);
  db.fn("course.count").mockResolvedValue(3);
  db.fn("course.create").mockImplementation(async ({ data }: any) => ({ id: "crs-new", ...data }));
  // PATCH: teacherOwnsCourse lee el curso ANTERIOR; update ecoa el merge.
  db.fn("course.update").mockImplementation(async ({ data }: any) => ({ ...BEFORE, ...data }));
});

// ------------------------------------------------------------------ POST create + dueño
describe("POST /api/courses — dueño del curso", () => {
  const OK = { name: "Public Forum II", code: "PF-201" };

  it("STUDENT → 403 (no puede crear cursos)", async () => {
    const { status } = await post(STUDENT, OK);
    expect(status).toBe(403);
    expect(db.fn("course.create")).not.toHaveBeenCalled();
  });

  it("TEACHER crea → dueño = él, coachName = su nombre, SIN audit", async () => {
    const { status, json } = await post(TEACHER, OK);
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
    const data = db.fn("course.create").mock.calls[0][0].data;
    expect(data.teacherId).toBe(TEACHER.id);
    expect(data.coachName).toBe(TEACHER.name);
    expect(db.fn("auditLog.create")).not.toHaveBeenCalled();
  });

  it("TEACHER manda teacherId ajeno → SE IGNORA (dueño = él, sin validar destino ni auditar)", async () => {
    const { status } = await post(TEACHER, { ...OK, teacherId: TEACHER2.id });
    expect(status).toBe(200);
    const data = db.fn("course.create").mock.calls[0][0].data;
    expect(data.teacherId).toBe(TEACHER.id); // no el ajeno
    expect(db.fn("user.findUnique")).not.toHaveBeenCalled(); // ni siquiera valida (no es ADMIN)
    expect(db.fn("auditLog.create")).not.toHaveBeenCalled();
  });

  it("ADMIN + teacherId de un TEACHER válido → dueño = ese coach + audit course.create", async () => {
    db.fn("user.findUnique").mockResolvedValue({ id: TEACHER2.id, name: TEACHER2.name, role: "TEACHER" });
    const { status } = await post(ADMIN, { ...OK, teacherId: TEACHER2.id });
    expect(status).toBe(200);
    const data = db.fn("course.create").mock.calls[0][0].data;
    expect(data.teacherId).toBe(TEACHER2.id);
    expect(data.coachName).toBe(TEACHER2.name);
    const a = db.fn("auditLog.create").mock.calls[0][0].data;
    expect(a).toMatchObject({ action: "course.create", actorId: ADMIN.id, targetType: "course" });
    expect(a.detail).toContain(TEACHER2.name);
  });

  it("ADMIN + teacherId con rol STUDENT → 400 (no crea, no audita)", async () => {
    db.fn("user.findUnique").mockResolvedValue({ id: STUDENT.id, name: STUDENT.name, role: "STUDENT" });
    const { status } = await post(ADMIN, { ...OK, teacherId: STUDENT.id });
    expect(status).toBe(400);
    expect(db.fn("course.create")).not.toHaveBeenCalled();
    expect(db.fn("auditLog.create")).not.toHaveBeenCalled();
  });

  it("ADMIN + teacherId inexistente → 400 (no crea)", async () => {
    db.fn("user.findUnique").mockResolvedValue(null);
    const { status } = await post(ADMIN, { ...OK, teacherId: "u-fantasma" });
    expect(status).toBe(400);
    expect(db.fn("course.create")).not.toHaveBeenCalled();
  });

  it("ADMIN sin teacherId → dueño = admin, SIN audit (comportamiento histórico)", async () => {
    const { status } = await post(ADMIN, OK);
    expect(status).toBe(200);
    const data = db.fn("course.create").mock.calls[0][0].data;
    expect(data.teacherId).toBe(ADMIN.id);
    expect(db.fn("user.findUnique")).not.toHaveBeenCalled();
    expect(db.fn("auditLog.create")).not.toHaveBeenCalled();
  });

  it("ADMIN + teacherId = su propio id → dueño = admin sin validar ni auditar (self)", async () => {
    const { status } = await post(ADMIN, { ...OK, teacherId: ADMIN.id });
    expect(status).toBe(200);
    const data = db.fn("course.create").mock.calls[0][0].data;
    expect(data.teacherId).toBe(ADMIN.id);
    expect(db.fn("user.findUnique")).not.toHaveBeenCalled();
    expect(db.fn("auditLog.create")).not.toHaveBeenCalled();
  });
});

// ------------------------------------------------------------------ PATCH reasignación
describe("PATCH /api/courses/[id] — reasignación de dueño", () => {
  beforeEach(() => {
    // teacherOwnsCourse lee el curso ANTERIOR (dueño = TEACHER).
    db.fn("course.findUnique").mockResolvedValue({ ...BEFORE });
  });

  it("ADMIN reasigna a otro TEACHER válido → cambia teacherId+coachName + audit course.reassign", async () => {
    db.fn("user.findUnique").mockResolvedValue({ id: TEACHER2.id, name: TEACHER2.name, role: "TEACHER" });
    const { status } = await patch(ADMIN, { teacherId: TEACHER2.id });
    expect(status).toBe(200);
    const data = db.fn("course.update").mock.calls[0][0].data;
    expect(data.teacherId).toBe(TEACHER2.id);
    expect(data.coachName).toBe(TEACHER2.name);
    const a = db.fn("auditLog.create").mock.calls[0][0].data;
    expect(a).toMatchObject({ action: "course.reassign", actorId: ADMIN.id, targetType: "course", targetId: CID });
    // antes→después: nombre del dueño anterior y el nuevo.
    expect(a.detail).toContain(TEACHER.name);
    expect(a.detail).toContain(TEACHER2.name);
  });

  it("ADMIN reasigna a rol STUDENT → 400 (no actualiza, no audita)", async () => {
    db.fn("user.findUnique").mockResolvedValue({ id: STUDENT.id, name: STUDENT.name, role: "STUDENT" });
    const { status } = await patch(ADMIN, { teacherId: STUDENT.id });
    expect(status).toBe(400);
    expect(db.fn("course.update")).not.toHaveBeenCalled();
    expect(db.fn("auditLog.create")).not.toHaveBeenCalled();
  });

  it("ADMIN reasigna a inexistente → 400", async () => {
    db.fn("user.findUnique").mockResolvedValue(null);
    const { status } = await patch(ADMIN, { teacherId: "u-fantasma" });
    expect(status).toBe(400);
    expect(db.fn("course.update")).not.toHaveBeenCalled();
  });

  it("ADMIN 'reasigna' al MISMO dueño actual → no-op: no valida destino ni audita", async () => {
    const { status } = await patch(ADMIN, { teacherId: TEACHER.id, name: "Retocado" });
    expect(status).toBe(200);
    const data = db.fn("course.update").mock.calls[0][0].data;
    expect(data).not.toHaveProperty("teacherId"); // igual al actual → no entra al update
    expect(data.name).toBe("Retocado");
    expect(db.fn("user.findUnique")).not.toHaveBeenCalled();
    expect(db.fn("auditLog.create")).not.toHaveBeenCalled();
  });

  it("TEACHER dueño manda teacherId → SE IGNORA (fuera del allowlist), edita el resto y responde 200 sin reasignar", async () => {
    const { status } = await patch(TEACHER, { teacherId: TEACHER2.id, name: "Nuevo nombre" });
    expect(status).toBe(200);
    const data = db.fn("course.update").mock.calls[0][0].data;
    expect(data).not.toHaveProperty("teacherId"); // el anti mass-assignment se conserva
    expect(data).not.toHaveProperty("coachName");
    expect(data.name).toBe("Nuevo nombre");
    expect(db.fn("user.findUnique")).not.toHaveBeenCalled();
    expect(db.fn("auditLog.create")).not.toHaveBeenCalled();
  });

  it("TEACHER que NO es dueño → 403 (teacherOwnsCourse no autoriza)", async () => {
    db.fn("course.findUnique").mockResolvedValue({ ...BEFORE, teacherId: "otro-dueño" });
    const { status } = await patch(TEACHER, { name: "Intruso" });
    expect(status).toBe(403);
    expect(db.fn("course.update")).not.toHaveBeenCalled();
  });
});
