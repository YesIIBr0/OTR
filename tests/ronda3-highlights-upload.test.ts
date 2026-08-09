// [FE/BE-TEST · RONDA3] La foto del logro se SUBE, no se pega.
//
// Isaac: «que en el otro portal de coach nosotros podamos subir en un view fácil». Lo que se
// blinda aquí es exactamente lo que puede MENTIRLE al coach o romperle la pantalla al alumno:
//   ① el modal del staff ofrece una zona de subida real (input file + dropzone del kit) y el
//      pegar-URL queda como atajo secundario, no como única vía;
//   ② se reusa el camino que YA existe (window.otrUpload → POST /api/uploads) con kind
//      "image", que es el ÚNICO de los públicos que deja a la alumna VER la foto;
//   ③ la validación se ESTRECHA a imagen y nunca se relaja: SVG/PDF fuera, tope de 25 MB;
//   ④ vista previa de lo que se va a publicar + error honesto (si falla, se ve que falló);
//   ⑤ el servidor no se fía del cliente: un /uploads/*.pdf colado en imageUrl no se guarda;
//   ⑥ i18n ES+EN de todo el texto nuevo.
//
// Los builders son módulos "@ts-nocheck" que solo arman strings → se prueban en Node con un
// stub de window (mismo patrón que ronda3-highlights.test.ts).
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/* eslint-disable @typescript-eslint/no-explicit-any */
(globalThis as any).window = (globalThis as any).window || {};
const win: any = (globalThis as any).window;
win.api = async () => ({});
win.go = () => {};
win.toast = () => {};
win.otrFormModal = () => {};
win.otrUpload = async () => ({});

import { hlImageReject, hlUploadBlock, hlUploadDone, hlUploadErr, HL_IMAGE_MIME } from "../app/lib/scr-highlights";
import { safeHighlightImageUrl } from "../app/api/highlights/input";
import { t } from "../app/lib/i18n";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");

// Archivo mínimo (no toca disco): solo interesan `type` y `size`.
const fileLike = (type: string, size = 1024) => ({ type, size, name: "foto" }) as unknown as File;

/* ================= ① la zona de subida existe ================= */
describe("① el coach SUBE la foto: el modal trae zona de subida, no solo un campo de texto", () => {
  const html = hlUploadBlock("");

  it("usa la dropzone del kit (la misma que la entrega del alumno), con su botón de elegir", () => {
    expect(html).toContain('class="dropzone hlv-drop"');
    expect(html).toContain("data-hl-drop");
    expect(html).toContain("data-hl-pick");
    expect(html).toContain(t("hl.imgPick"));
  });

  it("hay un <input type=file> REAL y solo admite imágenes (ni PDF ni SVG en el selector)", () => {
    expect(html).toContain('type="file"');
    expect(html).toContain(`accept="${HL_IMAGE_MIME.join(",")}"`);
    expect(html).not.toContain("application/pdf");
    expect(html).not.toContain("image/svg");
  });

  it("dice qué formatos y qué tope acepta ANTES de subir (los de /api/uploads, no otros)", () => {
    expect(html).toContain(t("hl.imgHint"));
    expect(t("hl.imgHint")).toContain("25");
  });

  it("la etiqueta del bloque es la foto del logro y el estado es una región viva (a11y)", () => {
    expect(html).toContain(t("hl.fieldImage"));
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
  });

  it("al editar un logro que ya tiene foto, el bloque abre con esa foto puesta", () => {
    const withPhoto = hlUploadBlock("/uploads/abc.png");
    expect(withPhoto).toContain('src="/uploads/abc.png"');
    expect(withPhoto).toContain("hlv-up-done");
  });

  it("pegar la URL sigue siendo posible, pero como atajo secundario (etiqueta propia)", () => {
    const src = read("app/lib/scr-highlights.ts");
    expect(src).toContain('name: "imageUrl"');          // el campo de texto NO desaparece
    expect(src).toContain('t("hl.imgUrlLabel")');       // …y se re-rotula como alternativa
    expect(t("hl.imgUrlLabel")).not.toBe(t("hl.fieldImage"));
  });
});

/* ================= ② reusa el camino de subida que ya existe ================= */
describe("② se sube por la API existente, y con el kind que deja VER la foto a la alumna", () => {
  const src = read("app/lib/scr-highlights.ts");

  it("no monta un canal nuevo: llama a window.otrUpload (→ POST /api/uploads)", () => {
    expect(src).toContain("otrUpload(file, HL_UPLOAD_KIND)");
    expect(src).not.toContain('fetch("/api/uploads"'); // nadie duplica el POST multipart
  });

  it('el kind es "image", que la ruta de servido trata como PÚBLICO (si no, la alumna vería 404)', () => {
    expect(src).toContain('const HL_UPLOAD_KIND = "image"');
    const serve = read("app/uploads/[...path]/route.ts");
    const publicKinds = /PUBLIC_KINDS\s*=\s*new Set\(\[([^\]]*)\]\)/.exec(serve)?.[1] || "";
    expect(publicKinds).toContain('"image"');
  });

  it("la API de uploads y su lib NO se tocan para este caso (código de seguridad compartido)", () => {
    // Los gates siguen tal cual: allowlist de MIME con SVG/HTML bloqueados y tope de 25 MB.
    const lib = read("app/lib/uploads.ts");
    expect(lib).toContain("MAX_UPLOAD_BYTES = 25 * 1024 * 1024");
    expect(lib).toContain('"image/svg+xml"');
    const route = read("app/api/uploads/route.ts");
    expect(route).toContain("isAllowedMime");
    expect(route).toContain("rateLimit(`uploads:${user.id}`, 20, 10 * 60 * 1000)");
  });
});

/* ================= ③ la validación se estrecha, nunca se relaja ================= */
describe("③ solo imágenes y dentro del tope del servidor", () => {
  it("una imagen normal pasa", () => {
    for (const m of HL_IMAGE_MIME) expect(hlImageReject(fileLike(m))).toBe("");
  });

  it("un PDF (que /api/uploads SÍ acepta) se rechaza aquí: no es una foto", () => {
    expect(hlImageReject(fileLike("application/pdf"))).toBe("hl.imgErrOnlyImages");
  });

  it("un SVG se rechaza (el servidor ya lo bloquea por XSS almacenado; aquí tampoco entra)", () => {
    expect(hlImageReject(fileLike("image/svg+xml"))).toBe("hl.imgErrOnlyImages");
  });

  it("un video o un .docx tampoco cuelan", () => {
    expect(hlImageReject(fileLike("video/mp4"))).toBe("hl.imgErrOnlyImages");
    expect(hlImageReject(fileLike("application/vnd.openxmlformats-officedocument.wordprocessingml.document")))
      .toBe("hl.imgErrOnlyImages");
  });

  it("un archivo sin tipo declarado se rechaza (no se adivina)", () => {
    expect(hlImageReject(fileLike(""))).toBe("hl.imgErrOnlyImages");
  });

  it("una imagen de más de 25 MB se para antes de gastar la subida (mismo tope del servidor)", () => {
    expect(hlImageReject(fileLike("image/png", 25 * 1024 * 1024 + 1))).toBe("hl.imgErrTooBig");
    expect(hlImageReject(fileLike("image/png", 25 * 1024 * 1024))).toBe("");
  });

  it("cada motivo de rechazo tiene mensaje propio en ES y EN", () => {
    for (const k of ["hl.imgErrOnlyImages", "hl.imgErrTooBig"]) {
      expect(t(k, "es")).not.toBe(k);
      expect(t(k, "en")).not.toBe(k);
    }
  });
});

/* ================= ④ vista previa y error honesto ================= */
describe("④ el coach ve lo que va a publicar, y se entera si la subida falla", () => {
  it("tras subir sale la foto REAL con su nombre y el aviso de subida hecha", () => {
    const html = hlUploadDone("/uploads/abc.png", "final-harvard.png");
    expect(html).toContain('<img class="hlv-up-img" src="/uploads/abc.png"');
    expect(html).toContain(t("hl.imgUploaded"));
    expect(html).toContain("final-harvard.png");
    expect(html).toContain(`alt="${t("hl.imgPreviewAlt")}"`);
  });

  it("se puede quitar la foto (deja el logro sin foto, no un enlace muerto)", () => {
    expect(hlUploadDone("/uploads/abc.png", "x.png")).toContain("data-hl-imgclear");
    expect(hlUploadDone("/uploads/abc.png", "x.png")).toContain(t("hl.imgRemove"));
  });

  it("una URL que no es del sitio ni https NO se pinta como vista previa", () => {
    expect(hlUploadDone("javascript:alert(1)", "x")).toBe("");
    expect(hlUploadDone("", "")).toBe("");
  });

  it("el nombre del archivo se escapa (viene del disco del coach, no es de fiar)", () => {
    const html = hlUploadDone("/uploads/abc.png", '<img src=x onerror=alert(1)>.png');
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;img src=x");
  });

  it("el fallo se escribe en el formulario, con el motivo del servidor y escapado", () => {
    const html = hlUploadErr("Archivo demasiado grande (máx 25MB) <b>");
    expect(html).toContain(t("hl.imgErrTitle"));
    expect(html).toContain("Archivo demasiado grande");
    expect(html).not.toContain("<b>");
  });

  it("mientras sube se dice que está subiendo (no un botón mudo)", () => {
    expect(t("hl.imgUploading", "es")).not.toBe("hl.imgUploading");
    const src = read("app/lib/scr-highlights.ts");
    expect(src).toContain("okBtn.disabled = true"); // no se guarda a medias subida
  });
});

/* ================= ⑤ el servidor no se fía del cliente ================= */
describe("⑤ imageUrl en el servidor: la ruta de subidas solo entra si es una imagen", () => {
  it("una foto subida pasa tal cual", () => {
    for (const u of ["/uploads/a.png", "/uploads/a.JPG", "/uploads/a.jpeg", "/uploads/a.webp", "/uploads/a.gif"]) {
      expect(safeHighlightImageUrl(u)).toBe(u);
    }
  });

  it("un /uploads/*.pdf o *.mp4 colado por petición cruda NO se guarda como foto", () => {
    expect(safeHighlightImageUrl("/uploads/a.pdf")).toBe("");
    expect(safeHighlightImageUrl("/uploads/a.mp4")).toBe("");
    expect(safeHighlightImageUrl("/uploads/a.bin")).toBe("");
  });

  it("no se puede disfrazar con query ni ancla", () => {
    expect(safeHighlightImageUrl("/uploads/a.pdf?x=.png")).toBe("");
    expect(safeHighlightImageUrl("/uploads/a.pdf#.png")).toBe("");
  });

  it("lo de siempre no cambia: estáticos del sitio y https externo siguen entrando", () => {
    expect(safeHighlightImageUrl("/img/hero-speaking.jpg")).toBe("/img/hero-speaking.jpg");
    expect(safeHighlightImageUrl("https://cdn.otr.do/foto")).toBe("https://cdn.otr.do/foto");
  });

  it("y javascript:/data: siguen cayendo a «sin foto»", () => {
    expect(safeHighlightImageUrl("javascript:alert(1)")).toBe("");
    expect(safeHighlightImageUrl("data:text/html,<script>")).toBe("");
    expect(safeHighlightImageUrl("")).toBe("");
  });
});

/* ================= ⑥ i18n ================= */
describe("⑥ todo el texto nuevo existe en ES y en EN", () => {
  const KEYS = ["hl.fieldImage", "hl.imgDropTitle", "hl.imgHint", "hl.imgPick",
    "hl.imgRemove", "hl.imgUploading", "hl.imgUploaded", "hl.imgPreviewAlt", "hl.imgErrTitle",
    "hl.imgErrOnlyImages", "hl.imgErrTooBig", "hl.imgUrlLabel"];

  for (const k of KEYS) {
    it(`${k} tiene ES y EN propios`, () => {
      expect(t(k, "es"), `${k} sin español`).not.toBe(k);
      expect(t(k, "en"), `${k} sin inglés`).not.toBe(k);
      expect(t(k, "en"), `${k} cae al español`).not.toBe(t(k, "es"));
    });
  }
});
