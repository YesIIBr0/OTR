// [BE-TEST · F-MKT M1+M2] /api/listings — el corazón del marketplace abierto. Fija:
// GET público solo-ACTIVE con filtros y escape UNA vez; POST del profesor nace SIEMPRE
// PENDING (vetting con menores — jamás auto-publica) con allowlist/piso de precio/tope
// por profesor; PATCH admin approve/reject auditado con razón visible; PATCH dueño con
// RE-VETTING (editar contenido publicado vuelve a PENDING) y pause/activate sin re-aprobar.
import { describe, it, expect, beforeEach, vi } from "vitest";
import { makeDb, jsonReq } from "./helpers/route-harness";

const box = vi.hoisted(() => ({ db: null as any, user: null as any }));
vi.mock("../app/lib/db", () => ({
  db: new Proxy({}, { get: (_t, p: string) => (p === "then" ? undefined : box.db.db[p]) }),
}));
vi.mock("../app/lib/auth", () => ({ setSession: vi.fn(), getSessionUser: () => box.user, clearSession: vi.fn() }));
vi.mock("../app/lib/rate-limit", () => ({ rateLimit: () => ({ ok: true, retryAfter: 0 }) }));

import { GET, POST } from "../app/api/listings/route";
import { PATCH } from "../app/api/listings/[id]/route";

box.db = makeDb();
const db = box.db;

const TEACHER = { id: "t-1", name: "Saúl", role: "TEACHER" };
const ADMIN = { id: "a-1", name: "Root", role: "ADMIN" };
const BASE = { id: "l-1", teacherId: TEACHER.id, category: "ingles", title: "Inglés conversacional", description: "", priceCentsHour: 2000, language: "es", modality: "online", status: "PENDING", rejectReason: null };

async function list(qs = "") {
  const res = await GET(jsonReq(`/api/listings${qs}`, undefined, "GET"));
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}
async function create(body: Record<string, unknown>) {
  const res = await POST(jsonReq("/api/listings", body));
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}
async function patch(id: string, body: Record<string, unknown>) {
  const res = await PATCH(jsonReq(`/api/listings/${id}`, body, "PATCH"), { params: Promise.resolve({ id }) });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

beforeEach(() => {
  db.reset();
  vi.clearAllMocks();
  box.user = TEACHER;
  db.fn("listing.findMany").mockResolvedValue([]);
  db.fn("listing.count").mockResolvedValue(0);
  db.fn("listing.create").mockImplementation(async ({ data }: any) => ({ ...BASE, ...data }));
  db.fn("listing.findUnique").mockResolvedValue({ ...BASE });
  db.fn("listing.update").mockImplementation(async ({ data }: any) => ({ ...BASE, ...data }));
  db.fn("review.groupBy").mockResolvedValue([]);
  db.fn("auditLog.create").mockResolvedValue({ id: "au-1" });
  db.fn("notification.create").mockResolvedValue({ id: "n-1" });
});

describe("GET /api/listings — buscador del alumno", () => {
  it("sin sesión → 401; con sesión solo lista ACTIVE", async () => {
    box.user = null;
    expect((await list()).status).toBe(401);
    box.user = { id: "s-1", name: "Ana", role: "STUDENT" };
    await list();
    expect(db.fn("listing.findMany").mock.calls[0][0].where.status).toBe("ACTIVE");
  });

  it("filtra por categoría VÁLIDA; una inventada se ignora (no filtra por basura)", async () => {
    box.user = { id: "s-1", name: "Ana", role: "STUDENT" };
    await list("?category=ingles");
    expect(db.fn("listing.findMany").mock.calls[0][0].where.category).toBe("ingles");
    await list("?category=hackeo");
    expect(db.fn("listing.findMany").mock.calls[1][0].where.category).toBeUndefined();
  });

  it("escapa title/teacherName UNA vez y deriva rating de Review (fuente viva)", async () => {
    box.user = { id: "s-1", name: "Ana", role: "STUDENT" };
    db.fn("listing.findMany").mockResolvedValue([
      { ...BASE, status: "ACTIVE", title: "Inglés <B1> & B2", teacher: { id: TEACHER.id, name: "Saúl & Co", coachVerified: true } },
    ]);
    db.fn("listing.count").mockResolvedValue(1);
    db.fn("review.groupBy").mockResolvedValue([{ teacherId: TEACHER.id, _avg: { rating: 4.5 }, _count: { _all: 12 } }]);
    const { json } = await list();
    expect(json.listings[0].title).toBe("Inglés &lt;B1&gt; &amp; B2");
    expect(json.listings[0].teacherName).toBe("Saúl &amp; Co");
    expect(json.listings[0].rating).toBe(4.5);
    expect(json.listings[0].reviewCount).toBe(12);
    expect(json.categories).toContain("matematicas");
  });
});

describe("POST /api/listings — publicar (nace PENDING, jamás auto-publica)", () => {
  it("STUDENT → 403", async () => {
    box.user = { id: "s-1", name: "Ana", role: "STUDENT" };
    expect((await create({ category: "ingles", title: "Clases", priceCentsHour: 2000 })).status).toBe(403);
  });

  it("crea PENDING con allowlist (teacherId/status del body se IGNORAN) + audit", async () => {
    const { status, json } = await create({
      category: "Ingles", title: "Inglés conversacional", priceCentsHour: 2000,
      teacherId: "otro", status: "ACTIVE", id: "inyectado",
    });
    expect(status).toBe(200);
    expect(json.listing.status).toBe("PENDING");
    const data = db.fn("listing.create").mock.calls[0][0].data;
    expect(data.teacherId).toBe(TEACHER.id); // del session user, no del body
    expect(data.status).toBeUndefined(); // default del schema = PENDING
    expect(data.category).toBe("ingles"); // normalizada a minúsculas
    expect(db.fn("auditLog.create").mock.calls[0][0].data.action).toBe("listing.create");
  });

  it("valida: categoría inventada 400, título corto 400, precio bajo el piso 400", async () => {
    expect((await create({ category: "brujeria", title: "Clases de algo", priceCentsHour: 2000 })).status).toBe(400);
    expect((await create({ category: "ingles", title: "abc", priceCentsHour: 2000 })).status).toBe(400);
    expect((await create({ category: "ingles", title: "Clases de inglés", priceCentsHour: 50 })).status).toBe(400);
  });

  it("tope por profesor: al llegar al máximo responde 400", async () => {
    db.fn("listing.count").mockResolvedValue(10);
    const { status, json } = await create({ category: "ingles", title: "Clases de inglés", priceCentsHour: 2000 });
    expect(status).toBe(400);
    expect(json.error).toMatch(/Máximo/);
  });
});

describe("PATCH /api/listings/[id] — admin: la cola de vetting (M2)", () => {
  it("approve: PENDING→ACTIVE + audit + notify al profesor; TEACHER no puede", async () => {
    expect((await patch("l-1", { action: "approve" })).status).toBe(403); // dueño ≠ admin
    box.user = ADMIN;
    const { status, json } = await patch("l-1", { action: "approve" });
    expect(status).toBe(200);
    expect(json.listing.status).toBe("ACTIVE");
    expect(db.fn("auditLog.create").mock.calls[0][0].data.action).toBe("listing.approve");
    expect(db.fn("notification.create").mock.calls[0][0].data.userId).toBe(TEACHER.id);
  });

  it("reject: guarda la razón visible al profesor + audit; ya-revisada → 400", async () => {
    box.user = ADMIN;
    const { json } = await patch("l-1", { action: "reject", reason: "Falta descripción del temario" });
    expect(json.listing.status).toBe("REJECTED");
    expect(db.fn("listing.update").mock.calls[0][0].data.rejectReason).toBe("Falta descripción del temario");
    db.fn("listing.findUnique").mockResolvedValue({ ...BASE, status: "ACTIVE" });
    expect((await patch("l-1", { action: "approve" })).status).toBe(400);
  });
});

describe("PATCH /api/listings/[id] — dueño: edición con re-vetting", () => {
  it("editar CONTENIDO de un listing ACTIVE lo devuelve a PENDING (lo aprobado es lo publicado)", async () => {
    db.fn("listing.findUnique").mockResolvedValue({ ...BASE, status: "ACTIVE" });
    const { json } = await patch("l-1", { title: "Inglés B2 intensivo" });
    expect(json.listing.status).toBe("PENDING");
  });

  it("pause/activate alterna SOLO entre ACTIVE↔PAUSED sin re-aprobar; PENDING no se auto-publica", async () => {
    db.fn("listing.findUnique").mockResolvedValue({ ...BASE, status: "ACTIVE" });
    expect((await patch("l-1", { action: "pause" })).json.listing.status).toBe("PAUSED");
    db.fn("listing.findUnique").mockResolvedValue({ ...BASE, status: "PAUSED" });
    expect((await patch("l-1", { action: "activate" })).json.listing.status).toBe("ACTIVE");
    db.fn("listing.findUnique").mockResolvedValue({ ...BASE, status: "PENDING" });
    expect((await patch("l-1", { action: "activate" })).status).toBe(400);
  });

  it("editar un REJECTED lo re-encola (PENDING) y limpia la razón; otro profesor → 403", async () => {
    db.fn("listing.findUnique").mockResolvedValue({ ...BASE, status: "REJECTED", rejectReason: "x" });
    const { json } = await patch("l-1", { description: "Temario corregido" });
    expect(json.listing.status).toBe("PENDING");
    expect(db.fn("listing.update").mock.calls[0][0].data.rejectReason).toBeNull();
    box.user = { id: "t-2", name: "Otro", role: "TEACHER" };
    db.fn("listing.findUnique").mockResolvedValue({ ...BASE });
    expect((await patch("l-1", { title: "Robo de listing" })).status).toBe(403);
  });
});

describe("GET /api/listings — vistas mine (profesor) y review (admin)", () => {
  it("?mine=1: STUDENT 403; el profesor recibe SUS listings en todos los estados", async () => {
    box.user = { id: "s-1", name: "Ana", role: "STUDENT" };
    const r1 = await GET(jsonReq("/api/listings?mine=1", undefined, "GET"));
    expect(r1.status).toBe(403);
    box.user = TEACHER;
    db.fn("listing.findMany").mockResolvedValue([{ ...BASE, status: "REJECTED", rejectReason: "Falta <detalle>" }]);
    const r2 = await GET(jsonReq("/api/listings?mine=1", undefined, "GET"));
    const json = await r2.json();
    expect(db.fn("listing.findMany").mock.calls[0][0].where).toEqual({ teacherId: TEACHER.id });
    expect(json.listings[0].status).toBe("REJECTED");
    expect(json.listings[0].rejectReason).toBe("Falta &lt;detalle&gt;"); // esc una vez
  });

  it("?review=1: TEACHER 403; el admin recibe SOLO PENDING (la más antigua primero) con el profesor", async () => {
    const r1 = await GET(jsonReq("/api/listings?review=1", undefined, "GET"));
    expect(r1.status).toBe(403); // TEACHER no revisa
    box.user = ADMIN;
    db.fn("listing.findMany").mockResolvedValue([
      { ...BASE, createdAt: new Date(), teacher: { name: "Saúl", email: "s@x.com", coachVerified: false } },
    ]);
    const r2 = await GET(jsonReq("/api/listings?review=1", undefined, "GET"));
    const json = await r2.json();
    const arg = db.fn("listing.findMany").mock.calls[0][0];
    expect(arg.where).toEqual({ status: "PENDING" });
    expect(arg.orderBy).toEqual({ createdAt: "asc" });
    expect(json.listings[0].teacherName).toBe("Saúl");
    expect(json.listings[0].teacherVerified).toBe(false); // el admin VE si aún falta verificar al humano
  });
});
