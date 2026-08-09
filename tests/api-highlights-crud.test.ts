// [BE-TEST · RONDA3] CRUD de /api/highlights ("Lo mejor de la temporada").
//   · Gates de rol: sin sesión 401; STUDENT 403 en POST/PATCH/DELETE (ni escribe ni audita);
//     TEACHER y ADMIN pueden las tres (un logro NO arrastra datos de terceros, a diferencia de
//     un torneo con inscritos: por eso el DELETE aquí no es solo-ADMIN).
//   · Allowlist ESTRICTA: id/position/lo-que-sea del body se ignoran; el orden lo fija el server.
//   · Saneado de URLs: imageUrl por safeUrl (javascript: → ""), instagramUrl además exige
//     https + host de Instagram (un enlace ajeno responde 400 y NO se guarda).
//   · audit() en create/update/delete (rastro F2, atribuible).
// Mockea Prisma + sesión con el harness (mismo patrón vi.hoisted+Proxy del resto de la suite).
import { describe, it, expect, beforeEach, vi } from "vitest";
import { makeDb, jsonReq } from "./helpers/route-harness";

/* eslint-disable @typescript-eslint/no-explicit-any */
const box = vi.hoisted(() => ({ db: null as any, user: null as any }));
vi.mock("../app/lib/db", () => ({
  db: new Proxy({}, { get: (_t, p: string) => (p === "then" ? undefined : box.db.db[p]) }),
}));
vi.mock("../app/lib/auth", () => ({ setSession: vi.fn(), getSessionUser: () => box.user, clearSession: vi.fn() }));

import { GET, POST } from "../app/api/highlights/route";
import { PATCH, DELETE } from "../app/api/highlights/[id]/route";
import { parseHighlightDate, highlightDateISO, safeInstagramUrl } from "../app/api/highlights/input";

box.db = makeDb();
const db = box.db;

const STUDENT = { id: "u-stu", name: "Analía Reyes", role: "STUDENT" };
const TEACHER = { id: "u-tea", name: "Saúl Méndez", role: "TEACHER" };
const ADMIN = { id: "u-adm", name: "Admin OTR", role: "ADMIN" };
const HID = "hl-1";
const IG = "https://www.instagram.com/p/ABC123/";

const BEFORE = {
  id: HID, title: "New Horizons — Varsity Champions", date: new Date(2026, 6, 12, 12, 0, 0),
  category: "Final", imageUrl: "/img/hero-speaking.jpg", instagramUrl: "", position: 2,
};

async function get(user: any) {
  box.user = user;
  const res = await GET();
  return { status: res.status, json: await res.json() };
}
async function post(user: any, body: Record<string, unknown>) {
  box.user = user;
  const res = await POST(jsonReq("/api/highlights", body));
  return { status: res.status, json: await res.json() };
}
async function patch(user: any, body: Record<string, unknown>, id = HID) {
  box.user = user;
  const res = await PATCH(jsonReq(`/api/highlights/${id}`, body, "PATCH"), { params: Promise.resolve({ id }) });
  return { status: res.status, json: await res.json() };
}
async function del(user: any, id = HID) {
  box.user = user;
  const res = await DELETE(jsonReq(`/api/highlights/${id}`, undefined, "DELETE"), { params: Promise.resolve({ id }) });
  return { status: res.status, json: await res.json() };
}

beforeEach(() => {
  db.reset();
  vi.clearAllMocks();
  db.fn("highlight.create").mockImplementation(async ({ data }: any) => ({ id: "hl-new", ...data }));
  db.fn("highlight.findFirst").mockResolvedValue({ position: 3 });
  db.fn("highlight.findUnique").mockResolvedValue({ ...BEFORE });
  db.fn("highlight.findMany").mockResolvedValue([{ ...BEFORE }]);
  db.fn("highlight.update").mockImplementation(async ({ data }: any) => ({ ...BEFORE, ...data }));
  db.fn("highlight.delete").mockResolvedValue({ id: HID });
});

// ------------------------------------------------------------------ GET
describe("GET /api/highlights", () => {
  it("sin sesión → 401", async () => {
    const { status } = await get(null);
    expect(status).toBe(401);
    expect(db.fn("highlight.findMany")).not.toHaveBeenCalled();
  });

  it("con sesión de ALUMNA → 200 y devuelve la fecha en ISO (para prefijar, no para pintar)", async () => {
    const { status, json } = await get(STUDENT);
    expect(status).toBe(200);
    expect(json.highlights).toHaveLength(1);
    expect(json.highlights[0]).toMatchObject({ id: HID, dateISO: "2026-07-12", instagramUrl: "" });
  });

  it("contrato de escape: el título sale escapado UNA vez (el modal lo decodifica en value=…)", async () => {
    db.fn("highlight.findMany").mockResolvedValue([{ ...BEFORE, title: 'Harvard <b>"JV"</b> & Co' }]);
    const { json } = await get(TEACHER);
    expect(json.highlights[0].title).toContain("&lt;b&gt;");
    expect(json.highlights[0].title).toContain("&amp;");
    expect(json.highlights[0].title).not.toContain("<b>");
  });
});

// ------------------------------------------------------------------ POST
describe("POST /api/highlights — alta (staff)", () => {
  const OK_BODY = { title: "Harvard JV Champions", category: "Final", date: "2026-08-01", imageUrl: "/img/a.jpg", instagramUrl: IG };

  it("sin sesión → 401 y no crea", async () => {
    const { status } = await post(null, OK_BODY);
    expect(status).toBe(401);
    expect(db.fn("highlight.create")).not.toHaveBeenCalled();
  });

  it("STUDENT → 403, no crea y no audita", async () => {
    const { status } = await post(STUDENT, OK_BODY);
    expect(status).toBe(403);
    expect(db.fn("highlight.create")).not.toHaveBeenCalled();
    expect(db.fn("auditLog.create")).not.toHaveBeenCalled();
  });

  it("TEACHER → 200, guarda el enlace de IG y audita highlight.create", async () => {
    const { status, json } = await post(TEACHER, OK_BODY);
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
    const arg = db.fn("highlight.create").mock.calls[0][0].data;
    expect(arg).toMatchObject({ title: "Harvard JV Champions", category: "Final", imageUrl: "/img/a.jpg", instagramUrl: IG });
    expect(db.fn("auditLog.create").mock.calls[0][0].data).toMatchObject({
      action: "highlight.create", actorId: TEACHER.id, targetType: "highlight",
    });
  });

  it("ADMIN → 200 (también puede publicar)", async () => {
    const { status } = await post(ADMIN, OK_BODY);
    expect(status).toBe(200);
    expect(db.fn("highlight.create")).toHaveBeenCalledOnce();
  });

  it("sin título → 400 y no crea", async () => {
    const { status } = await post(ADMIN, { category: "Final" });
    expect(status).toBe(400);
    expect(db.fn("highlight.create")).not.toHaveBeenCalled();
  });

  it("allowlist: ignora id/position/basura del body; el orden lo fija el servidor (último+1)", async () => {
    await post(ADMIN, { ...OK_BODY, id: "evil", position: 999, foo: "bar" });
    const arg = db.fn("highlight.create").mock.calls[0][0].data;
    expect(arg).not.toHaveProperty("id");
    expect(arg).not.toHaveProperty("foo");
    expect(arg.position).toBe(4); // findFirst devolvió position 3
  });

  it("enlace que NO es de Instagram → 400 y NO se crea nada", async () => {
    const { status } = await post(ADMIN, { ...OK_BODY, instagramUrl: "https://evil.example.com/p/1" });
    expect(status).toBe(400);
    expect(db.fn("highlight.create")).not.toHaveBeenCalled();
  });

  it("javascript: en la imagen se neutraliza a cadena vacía (safeUrl)", async () => {
    await post(ADMIN, { ...OK_BODY, imageUrl: "javascript:alert(1)", instagramUrl: "" });
    expect(db.fn("highlight.create").mock.calls[0][0].data.imageUrl).toBe("");
  });

  it("sin enlace de IG el logro se publica igual (la fila simplemente no navega)", async () => {
    const { status } = await post(TEACHER, { title: "St. Michael's — Co-Campeones", category: "Equipo" });
    expect(status).toBe(200);
    expect(db.fn("highlight.create").mock.calls[0][0].data.instagramUrl).toBe("");
  });
});

// ------------------------------------------------------------------ PATCH
describe("PATCH /api/highlights/[id] — edición (staff)", () => {
  it("STUDENT → 403 y no toca la fila", async () => {
    const { status } = await patch(STUDENT, { title: "Hackeado" });
    expect(status).toBe(403);
    expect(db.fn("highlight.update")).not.toHaveBeenCalled();
  });

  it("TEACHER → 200, edición PARCIAL (solo lo enviado) y audit con antes→después", async () => {
    const { status } = await patch(TEACHER, { instagramUrl: IG });
    expect(status).toBe(200);
    const arg = db.fn("highlight.update").mock.calls[0][0].data;
    expect(Object.keys(arg)).toEqual(["instagramUrl"]);
    const detail = db.fn("auditLog.create").mock.calls[0][0].data.detail as string;
    expect(detail).toContain("instagramUrl");
    expect(detail).toContain(IG);
  });

  it("logro inexistente → 404", async () => {
    db.fn("highlight.findUnique").mockResolvedValue(null);
    const { status } = await patch(ADMIN, { title: "X" });
    expect(status).toBe(404);
  });

  it("body sin campos conocidos → 400 (nada que actualizar)", async () => {
    const { status } = await patch(ADMIN, { foo: "bar" });
    expect(status).toBe(400);
    expect(db.fn("highlight.update")).not.toHaveBeenCalled();
  });

  it("título vaciado → 400 (no se deja un logro sin título)", async () => {
    const { status } = await patch(ADMIN, { title: "   " });
    expect(status).toBe(400);
    expect(db.fn("highlight.update")).not.toHaveBeenCalled();
  });
});

// ------------------------------------------------------------------ DELETE
describe("DELETE /api/highlights/[id] — retirada (staff)", () => {
  it("STUDENT → 403 y no borra", async () => {
    const { status } = await del(STUDENT);
    expect(status).toBe(403);
    expect(db.fn("highlight.delete")).not.toHaveBeenCalled();
  });

  it("TEACHER → 200, borra y audita highlight.delete", async () => {
    const { status } = await del(TEACHER);
    expect(status).toBe(200);
    expect(db.fn("highlight.delete")).toHaveBeenCalledOnce();
    expect(db.fn("auditLog.create").mock.calls[0][0].data).toMatchObject({ action: "highlight.delete" });
  });

  it("ADMIN → 200; y borrar lo ya borrado es idempotente (200 sin delete)", async () => {
    await del(ADMIN);
    expect(db.fn("highlight.delete")).toHaveBeenCalledOnce();
    db.fn("highlight.delete").mockClear();
    db.fn("highlight.findUnique").mockResolvedValue(null);
    const { status } = await del(ADMIN);
    expect(status).toBe(200);
    expect(db.fn("highlight.delete")).not.toHaveBeenCalled();
  });
});

// ------------------------------------------------------------------ helpers puros
describe("saneado y fechas (input.ts)", () => {
  it("safeInstagramUrl acepta instagram.com por https y rechaza el resto", () => {
    expect(safeInstagramUrl("https://www.instagram.com/p/A/")).toBe("https://www.instagram.com/p/A/");
    expect(safeInstagramUrl("https://instagram.com/reel/B/")).toBe("https://instagram.com/reel/B/");
    expect(safeInstagramUrl("http://www.instagram.com/p/A/")).toBeNull(); // sin https, no
    expect(safeInstagramUrl("https://instagram.com.evil.net/p/A/")).toBeNull(); // sufijo falso
    expect(safeInstagramUrl("javascript:alert(1)")).toBeNull();
    expect(safeInstagramUrl("")).toBeNull();
  });

  it("la fecha del formulario se guarda al MEDIODÍA local y vuelve idéntica en ISO", () => {
    const d = parseHighlightDate("2026-08-01");
    expect(d).toBeInstanceOf(Date);
    expect(d!.getHours()).toBe(12);
    expect(highlightDateISO(d)).toBe("2026-08-01"); // sin corrimiento de día por zona horaria
    expect(parseHighlightDate("")).toBeNull();
    expect(parseHighlightDate("basura")).toBeNull();
  });
});
