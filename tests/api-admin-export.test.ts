// [BE-TEST · F6.4] GET /api/admin/export — export CSV de users/enrollments/bookings, solo ADMIN.
// Fija las DOS defensas del serializador (que NO son esc() de HTML — contrato distinto para CSV):
//   1. Quoting RFC 4180: celdas con coma/comilla/salto entre comillas, comillas dobladas.
//   2. Anti formula-injection: celda que empieza con =/+/-/@ se prefija con comilla simple —
//      sin esto, un usuario llamado "=HYPERLINK(...)" ejecuta una fórmula en el Excel del admin.
// Además: gates 401/403, entidad inválida 400, BOM UTF-8 (Excel), Content-Disposition datado
// y X-Total cuando el cap trunca. Mockea Prisma con el harness.
import { describe, it, expect, beforeEach, vi } from "vitest";
import { makeDb, jsonReq } from "./helpers/route-harness";

const box = vi.hoisted(() => ({ db: null as any, user: null as any }));
vi.mock("../app/lib/db", () => ({
  db: new Proxy({}, { get: (_t, p: string) => (p === "then" ? undefined : box.db.db[p]) }),
}));
vi.mock("../app/lib/auth", () => ({ setSession: vi.fn(), getSessionUser: () => box.user, clearSession: vi.fn() }));

import { GET } from "../app/api/admin/export/route";

box.db = makeDb();
const db = box.db;

const ADMIN = { id: "admin-1", name: "Root", role: "ADMIN" };

async function exportCsv(entity: string | null) {
  const url = entity === null ? "/api/admin/export" : `/api/admin/export?entity=${entity}`;
  const res = await GET(jsonReq(url, undefined, "GET"));
  const text = await res.text();
  return { status: res.status, text, headers: res.headers };
}

beforeEach(() => {
  db.reset();
  vi.clearAllMocks();
  box.user = ADMIN;
  db.fn("user.findMany").mockResolvedValue([]);
  db.fn("user.count").mockResolvedValue(0);
  db.fn("enrollment.findMany").mockResolvedValue([]);
  db.fn("enrollment.count").mockResolvedValue(0);
  db.fn("booking.findMany").mockResolvedValue([]);
  db.fn("booking.count").mockResolvedValue(0);
});

describe("GET /api/admin/export — gates y validación", () => {
  it("sin sesión → 401 sin tocar la DB", async () => {
    box.user = null;
    const { status } = await exportCsv("users");
    expect(status).toBe(401);
    expect(db.fn("user.findMany")).not.toHaveBeenCalled();
  });

  it("TEACHER → 403 (solo ADMIN exporta datos completos)", async () => {
    box.user = { id: "t1", name: "Coach", role: "TEACHER" };
    const { status } = await exportCsv("users");
    expect(status).toBe(403);
  });

  it("entidad inválida o ausente → 400", async () => {
    expect((await exportCsv("secrets")).status).toBe(400);
    expect((await exportCsv(null)).status).toBe(400);
  });
});

describe("GET /api/admin/export — forma del CSV", () => {
  it("users: BOM + cabecera + fila + Content-Disposition datado", async () => {
    db.fn("user.findMany").mockResolvedValue([
      { id: "u1", name: "Ana Ruiz", email: "ana@x.com", role: "STUDENT", level: "Novato", xp: 120, suspended: false, createdAt: new Date("2026-01-05T00:00:00Z") },
    ]);
    db.fn("user.count").mockResolvedValue(1);
    // El BOM se verifica en BYTES (arrayBuffer): text() decodifica UTF-8 y ELIMINA el BOM
    // inicial por spec WHATWG — un charCodeAt(0) aquí daría falso negativo aunque esté.
    const resBom = await GET(jsonReq("/api/admin/export?entity=users", undefined, "GET"));
    const bytes = new Uint8Array(await resBom.arrayBuffer());
    expect([bytes[0], bytes[1], bytes[2]]).toEqual([0xef, 0xbb, 0xbf]); // BOM UTF-8 para Excel

    const { status, text, headers } = await exportCsv("users");
    expect(status).toBe(200);
    const lines = text.trimEnd().split("\r\n"); // CRLF por RFC 4180 (text() ya quitó el BOM)
    expect(lines[0]).toBe("id,nombre,email,rol,nivel,xp,suspendido,creadoEn");
    expect(lines[1]).toContain("u1,Ana Ruiz,ana@x.com,STUDENT,Novato,120,no,2026-01-05");
    expect(headers.get("Content-Type")).toContain("text/csv");
    expect(headers.get("Content-Disposition")).toMatch(/attachment; filename="otr-users-\d{4}-\d{2}-\d{2}\.csv"/);
    expect(headers.get("X-Total")).toBeNull(); // sin truncar → sin header
  });

  it("quoting RFC 4180: coma, comilla y salto de línea quedan entrecomillados y doblados", async () => {
    db.fn("user.findMany").mockResolvedValue([
      { id: "u1", name: 'Pérez, "El Orador"', email: "linea\nrota@x.com", role: "STUDENT", level: "", xp: 0, suspended: false, createdAt: new Date("2026-01-01") },
    ]);
    db.fn("user.count").mockResolvedValue(1);
    const { text } = await exportCsv("users");
    expect(text).toContain('"Pérez, ""El Orador"""');
    expect(text).toContain('"linea\nrota@x.com"');
  });

  it("formula injection: '=SUM(A1)' y '+56900' salen prefijados con comilla simple", async () => {
    db.fn("user.findMany").mockResolvedValue([
      { id: "u1", name: "=SUM(A1:A9)", email: "+56900@x.com", role: "STUDENT", level: "", xp: 0, suspended: false, createdAt: new Date("2026-01-01") },
    ]);
    db.fn("user.count").mockResolvedValue(1);
    const { text } = await exportCsv("users");
    expect(text).toContain("'=SUM(A1:A9)");
    expect(text).toContain("'+56900@x.com");
    expect(text).not.toMatch(/,=SUM/); // jamás una celda que empiece ejecutable
  });

  it("X-Total presente cuando el cap trunca (count > filas devueltas)", async () => {
    db.fn("user.findMany").mockResolvedValue([
      { id: "u1", name: "A", email: "a@x.com", role: "STUDENT", level: "", xp: 0, suspended: false, createdAt: new Date("2026-01-01") },
    ]);
    db.fn("user.count").mockResolvedValue(15000);
    const { headers } = await exportCsv("users");
    expect(headers.get("X-Total")).toBe("15000");
  });

  it("enrollments: junta alumno + curso y usa el progreso", async () => {
    db.fn("enrollment.findMany").mockResolvedValue([
      { id: "e1", status: "ACTIVE", source: "FREE", progress: 80, user: { name: "Ana", email: "ana@x.com" }, course: { code: "PF-101", name: "Fundamentos" } },
    ]);
    db.fn("enrollment.count").mockResolvedValue(1);
    const { text } = await exportCsv("enrollments");
    expect(text).toContain("id,alumno,email,cursoCodigo,cursoNombre,progresoPct,estado,fuente");
    expect(text).toContain("e1,Ana,ana@x.com,PF-101,Fundamentos,80,ACTIVE,FREE");
  });

  it("bookings: monto desde escrow con fallback a priceCents y escrow vacío como celda vacía", async () => {
    db.fn("booking.findMany").mockResolvedValue([
      { id: "b1", slotAt: new Date("2026-07-20T15:00:00Z"), status: "CONFIRMED", priceCents: 5000, packageId: "pkg1", student: { name: "Ana", email: "ana@x.com" }, coach: { name: "Saúl" }, escrow: { status: "HELD", amountCents: 5000 } },
      { id: "b2", slotAt: new Date("2026-07-21T15:00:00Z"), status: "PENDING", priceCents: 4000, packageId: null, student: { name: "Luis", email: "l@x.com" }, coach: { name: "Saúl" }, escrow: null },
    ]);
    db.fn("booking.count").mockResolvedValue(2);
    const { text } = await exportCsv("bookings");
    expect(text).toContain("b1,Ana,ana@x.com,Saúl,2026-07-20T15:00:00.000Z,CONFIRMED,pkg1,5000,HELD");
    expect(text).toContain("b2,Luis,l@x.com,Saúl,2026-07-21T15:00:00.000Z,PENDING,,4000,");
  });
});
