// [BE-TEST] Integración de GET /uploads/[...path] — autorización POR OBJETO (fix IDOR).
// Mockea Prisma + sesión + fs (harness). El foco es qué status devuelve según la relación
// usuario↔dueño del archivo (dueño/admin/coach vinculado/tutor ACTIVE/tipo público), no el
// streaming en sí. `stat` se stubea para que "el archivo existe" siempre, y `createReadStream`
// devuelve una instancia REAL de stream.Readable (vacía, sin datos) porque Readable.toWeb()
// exige un stream.Readable de verdad — un objeto suelto con .on/.pipe explota.
import { describe, it, expect, beforeEach, vi } from "vitest";
import { Readable } from "stream";
import { makeDb, jsonReq } from "./helpers/route-harness";

// Caja hoisteada (los factory de vi.mock se elevan sobre los imports; solo pueden tocar
// `vi` y vars de vi.hoisted). El Proxy reenvía perezosamente a box.db.db.
const box = vi.hoisted(() => ({ db: null as any, user: null as any }));
vi.mock("../app/lib/db", () => ({
  db: new Proxy({}, { get: (_t, p: string) => (p === "then" ? undefined : box.db.db[p]) }),
}));
vi.mock("../app/lib/auth", () => ({ setSession: vi.fn(), getSessionUser: () => box.user, clearSession: vi.fn() }));
vi.mock("fs/promises", () => ({
  stat: vi.fn(async () => ({ isFile: () => true, size: 10 })),
  // app/lib/uploads.ts (importado transitivamente por la ruta, por UPLOAD_DIR) también
  // pide writeFile/mkdir a "fs/promises" — no se llaman en este test, pero deben existir
  // como named exports o el import explota.
  writeFile: vi.fn(),
  mkdir: vi.fn(),
}));
vi.mock("fs", () => ({
  createReadStream: vi.fn(() => new Readable({ read() {} })),
}));

import { GET } from "../app/uploads/[...path]/route";

box.db = makeDb();
const db = box.db;

const OWNER_ID = "u-owner";
const FILENAME = "archivo.mp3";

function uploadRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "up1",
    userId: OWNER_ID,
    kind: "submission", // sensible por defecto (no está en PUBLIC_KINDS)
    filename: FILENAME,
    original: "tarea.mp3",
    mime: "audio/mpeg",
    size: 10,
    url: `/uploads/${FILENAME}`,
    ...overrides,
  };
}

async function getUpload(filename = FILENAME) {
  const req = jsonReq(`/uploads/${filename}`, undefined, "GET");
  return GET(req, { params: Promise.resolve({ path: [filename] }) });
}

beforeEach(() => {
  db.reset();
  vi.clearAllMocks();
  box.user = null;
  // Por defecto: la fila existe, es sensible, y no hay vínculo coach/tutor.
  db.fn("upload.findFirst").mockResolvedValue(uploadRow());
  db.fn("booking.count").mockResolvedValue(0);
  db.fn("enrollment.count").mockResolvedValue(0);
  db.fn("guardianship.count").mockResolvedValue(0);
});

describe("GET /uploads/[...path] — autenticación", () => {
  it("sin sesión → 401 y ni siquiera consulta la DB", async () => {
    box.user = null;
    const res = await getUpload();
    expect(res.status).toBe(401);
    expect(db.fn("upload.findFirst")).not.toHaveBeenCalled();
  });
});

describe("GET /uploads/[...path] — existencia", () => {
  it("sin fila Upload (sin metadata) → 404", async () => {
    box.user = { id: "u-1", role: "STUDENT", email: "a@x.com" };
    db.fn("upload.findFirst").mockResolvedValue(null);
    const res = await getUpload();
    expect(res.status).toBe(404);
  });
});

describe("GET /uploads/[...path] — autorización por objeto (IDOR)", () => {
  it("el DUEÑO accede a su propio archivo sensible → 200", async () => {
    box.user = { id: OWNER_ID, role: "STUDENT", email: "owner@x.com" };
    const res = await getUpload();
    expect(res.status).toBe(200);
  });

  it("ADMIN accede aunque no sea dueño → 200", async () => {
    box.user = { id: "u-admin", role: "ADMIN", email: "admin@x.com" };
    const res = await getUpload();
    expect(res.status).toBe(200);
  });

  it("tipo público (avatar) → 200 para cualquier autenticado, aunque no sea dueño", async () => {
    db.fn("upload.findFirst").mockResolvedValue(uploadRow({ kind: "avatar", mime: "image/png" }));
    box.user = { id: "u-otro", role: "STUDENT", email: "otro@x.com" };
    const res = await getUpload();
    expect(res.status).toBe(200);
  });

  it("tipo público (image) → 200 para cualquier autenticado", async () => {
    db.fn("upload.findFirst").mockResolvedValue(uploadRow({ kind: "image", mime: "image/png" }));
    box.user = { id: "u-otro", role: "STUDENT", email: "otro@x.com" };
    const res = await getUpload();
    expect(res.status).toBe(200);
  });

  it("tipo público (resource) → 200 para cualquier autenticado", async () => {
    db.fn("upload.findFirst").mockResolvedValue(uploadRow({ kind: "resource", mime: "application/pdf" }));
    box.user = { id: "u-otro", role: "STUDENT", email: "otro@x.com" };
    const res = await getUpload();
    expect(res.status).toBe(200);
  });

  it("tipo SENSIBLE (submission) de OTRO alumno extraño → 404 (IDOR cerrado)", async () => {
    box.user = { id: "u-extrano", role: "STUDENT", email: "extrano@x.com" };
    const res = await getUpload();
    expect(res.status).toBe(404);
  });

  it("tipo SENSIBLE (video) de OTRO alumno extraño → 404 (IDOR cerrado)", async () => {
    db.fn("upload.findFirst").mockResolvedValue(uploadRow({ kind: "video", mime: "video/mp4" }));
    box.user = { id: "u-extrano", role: "STUDENT", email: "extrano@x.com" };
    const res = await getUpload();
    expect(res.status).toBe(404);
  });

  it("TEACHER con vínculo por RESERVA (booking) al dueño → 200", async () => {
    box.user = { id: "u-teacher", role: "TEACHER", email: "coach@x.com" };
    db.fn("booking.count").mockResolvedValue(1);
    const res = await getUpload();
    expect(res.status).toBe(200);
  });

  it("TEACHER con vínculo por INSCRIPCIÓN (enrollment) al dueño → 200", async () => {
    box.user = { id: "u-teacher", role: "TEACHER", email: "coach@x.com" };
    db.fn("enrollment.count").mockResolvedValue(1);
    const res = await getUpload();
    expect(res.status).toBe(200);
  });

  it("TEACHER sin ningún vínculo con el dueño → 404", async () => {
    box.user = { id: "u-teacher", role: "TEACHER", email: "coach@x.com" };
    const res = await getUpload();
    expect(res.status).toBe(404);
  });

  it("PARENT con guardianship ACTIVE al dueño → 200", async () => {
    box.user = { id: "u-parent", role: "PARENT", email: "papa@x.com" };
    db.fn("guardianship.count").mockResolvedValue(1);
    const res = await getUpload();
    expect(res.status).toBe(200);
  });

  it("PARENT sin guardianship ACTIVE al dueño → 404", async () => {
    box.user = { id: "u-parent", role: "PARENT", email: "papa@x.com" };
    const res = await getUpload();
    expect(res.status).toBe(404);
  });
});
