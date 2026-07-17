// [BE-TEST · F5.2] Integración de POST /api/uploads — subida de archivos a disco.
// Protege los gates que se ejecutan ANTES de tocar el disco: (1) sin sesión → 401; (2) MIME
// no permitido (allowlist real de lib/uploads: bloquea SVG/HTML) → 4xx; (3) tamaño declarado
// > MAX_UPLOAD_BYTES → 4xx; (4) subida válida → llama saveUpload (que crea la fila Upload) y
// devuelve la metadata.
// El Request lleva un FormData REAL (jsonReq no sirve: el route hace req.formData()).
// lib/uploads se mockea PARCIALMENTE: se conservan isAllowedMime y MAX_UPLOAD_BYTES reales
// (son el contrato que queremos ejercitar) y solo se stubea saveUpload (escribir a disco es
// inviable en el arnés). El rate-limit se neutraliza (no es el foco). Mockea Prisma + sesión.
import { describe, it, expect, beforeEach, vi } from "vitest";
import { makeDb } from "./helpers/route-harness";

// Caja hoisteada (los factory de vi.mock se elevan sobre los imports; solo pueden tocar
// `vi` y vars de vi.hoisted). El Proxy reenvía perezosamente a box.db.db.
const box = vi.hoisted(() => ({ db: null as any, user: null as any }));
vi.mock("../app/lib/db", () => ({
  db: new Proxy({}, { get: (_t, p: string) => (p === "then" ? undefined : box.db.db[p]) }),
}));
vi.mock("../app/lib/auth", () => ({ setSession: vi.fn(), getSessionUser: () => box.user, clearSession: vi.fn() }));
vi.mock("../app/lib/rate-limit", () => ({ rateLimit: () => ({ ok: true, retryAfter: 0 }) }));
// Parcial: isAllowedMime + MAX_UPLOAD_BYTES REALES; solo saveUpload es un stub (no escribe a disco).
vi.mock("../app/lib/uploads", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../app/lib/uploads")>();
  return { ...actual, saveUpload: vi.fn() };
});

import { POST } from "../app/api/uploads/route";
import { saveUpload, MAX_UPLOAD_BYTES } from "../app/lib/uploads";

box.db = makeDb();
const db = box.db;

const USER = { id: "u-uploader", role: "STUDENT", email: "sube@x.com" };

// Construye un POST multipart real con un File y (opcional) kind.
function uploadReq(file: File | null, kind?: string): Request {
  const fd = new FormData();
  if (file) fd.append("file", file);
  if (kind) fd.append("kind", kind);
  return new Request("http://test.local/api/uploads", { method: "POST", body: fd });
}

beforeEach(() => {
  db.reset();
  vi.clearAllMocks();
  box.user = USER;
});

describe("POST /api/uploads — autenticación", () => {
  it("sin sesión → 401 y ni parsea el formulario", async () => {
    box.user = null;
    const res = await POST(uploadReq(new File([Buffer.from("hola")], "a.png", { type: "image/png" }), "resource"));
    expect(res.status).toBe(401);
    expect(saveUpload).not.toHaveBeenCalled();
  });
});

describe("POST /api/uploads — validación previa a disco", () => {
  it("MIME no permitido (image/svg+xml, bloqueado por la allowlist) → 4xx, sin guardar", async () => {
    const res = await POST(uploadReq(new File([Buffer.from("<svg/>")], "x.svg", { type: "image/svg+xml" }), "resource"));
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.error).toBe("Tipo de archivo no permitido");
    expect(saveUpload).not.toHaveBeenCalled();
  });

  it("MIME no permitido (text/html — XSS almacenado) → 4xx, sin guardar", async () => {
    const res = await POST(uploadReq(new File([Buffer.from("<h1>x</h1>")], "x.html", { type: "text/html" }), "resource"));
    expect(res.status).toBe(400);
    expect(saveUpload).not.toHaveBeenCalled();
  });

  it("tamaño declarado > MAX_UPLOAD_BYTES → 4xx, sin guardar", async () => {
    const big = Buffer.alloc(MAX_UPLOAD_BYTES + 1); // 1 byte por encima del tope real
    const res = await POST(uploadReq(new File([big], "grande.mp4", { type: "video/mp4" }), "video"));
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.error).toMatch(/demasiado grande/i);
    expect(saveUpload).not.toHaveBeenCalled();
  });

  it("falta el archivo → 4xx", async () => {
    const res = await POST(uploadReq(null, "resource"));
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.error).toBe("Falta el archivo");
    expect(saveUpload).not.toHaveBeenCalled();
  });
});

describe("POST /api/uploads — subida válida", () => {
  it("archivo permitido y bajo el tope → 200: llama saveUpload (crea la fila) y devuelve la metadata", async () => {
    (saveUpload as any).mockResolvedValue({
      url: "/uploads/abc.png",
      original: "foto.png",
      mime: "image/png",
      size: 5,
      id: "up-1",
    });

    const res = await POST(uploadReq(new File([Buffer.from("hello")], "foto.png", { type: "image/png" }), "resource"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.url).toBe("/uploads/abc.png");
    expect(json.id).toBe("up-1");

    // saveUpload es el seam que persiste el archivo + crea la fila Upload; recibe (file, userId, kind).
    expect(saveUpload).toHaveBeenCalledOnce();
    const [fileArg, userIdArg, kindArg] = (saveUpload as any).mock.calls[0];
    expect(userIdArg).toBe(USER.id);
    expect(kindArg).toBe("resource");
    expect(typeof (fileArg as File).arrayBuffer).toBe("function");
    expect((fileArg as File).type).toBe("image/png");
  });

  it("sin 'kind' explícito → usa el default 'file'", async () => {
    (saveUpload as any).mockResolvedValue({ url: "/uploads/x.png", original: "x.png", mime: "image/png", size: 3, id: "up-2" });
    const res = await POST(uploadReq(new File([Buffer.from("hey")], "x.png", { type: "image/png" })));
    expect(res.status).toBe(200);
    expect((saveUpload as any).mock.calls[0][2]).toBe("file");
  });
});
