// [BE/FE-TEST · A5] El tope de subida DECLARADO tiene que ser el tope REAL.
//
// El bug: este proyecto tiene `middleware.ts` con matcher `/api/:path*`, así que Next clona
// el cuerpo de toda petición de escritura a /api para poder pasárselo al middleware
// (`getCloneableBody`, next/dist/server/body-streams.js). Cuando el clon supera
// `experimental.middlewareClientMaxBodySize` —por DEFECTO 10 MB— Next corta las DOS ramas del
// tee, incluida la que se le reinyecta al route handler. El multipart llega partido,
// `req.formData()` revienta y /api/uploads respondía "Esperaba multipart/form-data": un error
// que miente sobre la causa. Medido: 9 MB pasaba, 10 MB fallaba, con `MAX_UPLOAD_BYTES` = 25 MB.
//
// Lo que se fija aquí (y por qué cada cosa es un test y no un comentario):
//   ① el techo REAL de la plataforma (next.config) va por ENCIMA del tope declarado — si
//      alguien quita esa línea, el 25 MB vuelve a ser mentira y esto se pone rojo;
//   ② un archivo que no cabe se rechaza diciendo QUE NO CABE y CUÁNTO cabe, nunca con un
//      error técnico de multipart;
//   ③ un cuerpo genuinamente malformado sigue dando el error de multipart (no se camufla);
//   ④ los avisos del CLIENTE usan el mismo número que el servidor (mirrors sin deriva);
//   ⑤ el backstop de rate-limit del middleware sigue aplicando a /api/uploads.
import { describe, it, expect, beforeEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { makeDb } from "./helpers/route-harness";

/* eslint-disable @typescript-eslint/no-explicit-any */
const box = vi.hoisted(() => ({ db: null as any, user: null as any }));
vi.mock("../app/lib/db", () => ({
  db: new Proxy({}, { get: (_t, p: string) => (p === "then" ? undefined : box.db.db[p]) }),
}));
vi.mock("../app/lib/auth", () => ({ setSession: vi.fn(), getSessionUser: () => box.user, clearSession: vi.fn() }));
vi.mock("../app/lib/rate-limit", () => ({ rateLimit: () => ({ ok: true, retryAfter: 0 }) }));
vi.mock("../app/lib/uploads", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../app/lib/uploads")>();
  return { ...actual, saveUpload: vi.fn() };
});

import { POST } from "../app/api/uploads/route";
import { MAX_UPLOAD_BYTES, MAX_BODY_BYTES, DPP_VIDEO_MAX_BYTES, saveUpload } from "../app/lib/uploads";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");
const MB = 1024 * 1024;

box.db = makeDb();
beforeEach(() => {
  box.db.reset();
  vi.clearAllMocks();
  box.user = { id: "u-sube", role: "STUDENT", email: "sube@x.com" };
});

/** Petición que sólo DECLARA su tamaño: la ruta debe cortar antes de leer nada. */
function declaredReq(contentLength: number): Request {
  return new Request("http://test.local/api/uploads", {
    method: "POST",
    headers: { "content-type": "multipart/form-data; boundary=x", "content-length": String(contentLength) },
    body: "--x--\r\n",
  });
}

/** Petición cuyo cuerpo es ilegible (lo que ve la ruta cuando Next lo trunca). */
function brokenBodyReq(contentLength: number): Request {
  return {
    headers: new Headers({ "content-length": String(contentLength) }),
    formData: async () => {
      throw new TypeError("Could not parse content as FormData.");
    },
  } as unknown as Request;
}

/* ============ ① el techo real de la plataforma cubre lo que se promete ============ */
describe("① next.config declara un techo de cuerpo por encima del tope de subida", () => {
  it("experimental.middlewareClientMaxBodySize existe y es >= MAX_BODY_BYTES", async () => {
    const cfg = (await import("../next.config.mjs")).default as any;
    const limit = cfg?.experimental?.middlewareClientMaxBodySize;
    // Sin esta clave Next aplica su default de 10 MB y TODA subida >10 MB se trunca.
    expect(typeof limit).toBe("number");
    expect(limit).toBeGreaterThanOrEqual(MAX_BODY_BYTES);
  });

  it("el techo del CUERPO deja margen sobre el del ARCHIVO (boundaries + campo kind)", () => {
    // El multipart pesa más que el archivo: si el techo fuese exactamente 25 MB, un archivo
    // de 25 MB —que la política acepta— se truncaría igual.
    expect(MAX_BODY_BYTES).toBeGreaterThan(MAX_UPLOAD_BYTES);
  });

  it("el middleware sigue cubriendo /api/uploads (el backstop no se abrió para arreglar esto)", () => {
    // La salida fácil habría sido sacar /api/uploads del matcher o meterlo en EXCLUDED: se
    // acababa el truncamiento, y de paso el tope global de escrituras. No se hizo.
    const mw = read("middleware.ts");
    expect(mw).toContain('matcher: "/api/:path*"');
    expect(mw).toContain("MAX_WRITES");
    const excluded = /EXCLUDED\s*=\s*\[([^\]]*)\]/.exec(mw)?.[1] || "";
    expect(excluded).not.toMatch(/uploads/);
  });
});

/* ============ ② el error dice la verdad: demasiado grande, y cuánto ============ */
describe("② un archivo que no cabe se rechaza diciendo que no cabe", () => {
  const dice = (msg: string) => {
    expect(msg).toMatch(/demasiado grande/i);
    expect(msg).toContain(String(Math.round(MAX_UPLOAD_BYTES / MB)));
    expect(msg).not.toMatch(/multipart/i);
  };

  it("cuerpo declarado por encima del techo → 413 y mensaje de TAMAÑO, sin parsear", async () => {
    const res = await POST(declaredReq(MAX_BODY_BYTES + 1));
    const json = await res.json();
    expect(res.status).toBe(413);
    dice(json.error);
    expect(saveUpload).not.toHaveBeenCalled();
  });

  it("cuerpo ilegible pero con tamaño por encima del tope → mismo mensaje de TAMAÑO", async () => {
    // Es el caso real del truncamiento: lo único que llega a la ruta es un cuerpo partido.
    const res = await POST(brokenBodyReq(MAX_UPLOAD_BYTES + 1));
    const json = await res.json();
    expect(res.status).toBe(413);
    dice(json.error);
  });

  it("un archivo de exactamente MAX_UPLOAD_BYTES NO lo corta el guardia del cuerpo", async () => {
    // El multipart de un archivo de 25 MB pesa un poco más de 25 MB y debe seguir pasando
    // hasta la validación de verdad (la de la política), no morir en el guardia.
    const res = await POST(declaredReq(MAX_UPLOAD_BYTES + 512));
    expect(res.status).not.toBe(413);
  });
});

/* ============ ③ un cuerpo malformado de verdad no se camufla ============ */
describe("③ el error de multipart sigue existiendo para lo que SÍ es malformado", () => {
  it("cuerpo ilegible y pequeño → 'Esperaba multipart/form-data' (la causa real)", async () => {
    const res = await POST(brokenBodyReq(2048));
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.error).toBe("Esperaba multipart/form-data");
  });

  it("sin content-length (chunked) no se inventa un rechazo por tamaño", async () => {
    const req = {
      headers: new Headers(),
      formData: async () => {
        throw new TypeError("nope");
      },
    } as unknown as Request;
    const res = await POST(req);
    expect((await res.json()).error).toBe("Esperaba multipart/form-data");
  });
});

/* ============ ④ el cliente avisa con EL MISMO número que el servidor ============ */
describe("④ los avisos del cliente no mienten sobre el tope", () => {
  const mbDeclarado = Math.round(MAX_UPLOAD_BYTES / MB);

  it("la entrega del alumno (scr-learn) valida con el tope real, no con uno inventado", () => {
    const src = read("app/lib/scr-learn.ts");
    expect(src).toContain(`f.size > ${mbDeclarado} * 1024 * 1024`);
    // El mirror decía 50 MB: el doble de lo que el servidor acepta → el alumno subía
    // el archivo entero para que se lo rechazaran al final.
    expect(src).not.toContain("50 * 1024 * 1024");
  });

  it("el texto que lee el alumno dice el mismo número (ES y EN)", () => {
    const src = read("app/lib/i18n-keys/learn.ts");
    expect(src).not.toMatch(/fileTooBig[^\n]*50 MB/);
    expect((src.match(new RegExp(`fileTooBig[^\\n]*${mbDeclarado} MB`, "g")) || []).length).toBe(2);
  });

  it("la foto del logro (scr-highlights) usa el mismo tope, y su texto también", () => {
    expect(read("app/lib/scr-highlights.ts")).toContain(`HL_MAX_IMAGE_BYTES = ${mbDeclarado} * 1024 * 1024`);
    const hl = read("app/lib/i18n-keys/hl.ts");
    expect((hl.match(new RegExp(`${mbDeclarado} MB`, "g")) || []).length).toBeGreaterThanOrEqual(4);
  });
});

/* ============ ⑤ el vídeo DPP recupera margen, sin pasarse ============ */
describe("⑤ el tope del vídeo DPP ya no lo dicta el bug", () => {
  it("sube de los 8 MB de emergencia y sigue MUY por debajo del techo de la plataforma", () => {
    expect(DPP_VIDEO_MAX_BYTES).toBeGreaterThan(8 * MB);
    expect(DPP_VIDEO_MAX_BYTES).toBeLessThan(MAX_UPLOAD_BYTES);
    // 30 s de vídeo: por encima de ~20 MB ya no es "una presentación", es un archivo sin editar.
    expect(DPP_VIDEO_MAX_BYTES).toBeLessThanOrEqual(16 * MB);
  });

  it("su mensaje propio sigue ganando: el DPP cabe entero bajo el guardia del cuerpo", () => {
    // Si el tope del DPP superase el techo del cuerpo, el alumno vería el mensaje genérico
    // en vez del específico de 30 segundos.
    expect(DPP_VIDEO_MAX_BYTES).toBeLessThan(MAX_BODY_BYTES);
  });
});
