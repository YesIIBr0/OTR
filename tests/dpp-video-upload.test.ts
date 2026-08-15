// [A3 · ADMISIÓN PASO 4] El vídeo "Documentar tu Punto de Partida" (~30 s) que sube un alumno
// —posiblemente MENOR— por el /api/uploads que ya existe.
//
// Lo que se blinda aquí es exactamente lo que puede colarse o romperse:
//   ① la política del kind `dpp-video` ESTRECHA la común y NUNCA la relaja: allowlist exacta
//      de contenedores (webm/mp4/mov), tope de 16 MB (< los 25 MB globales) y nada más;
//   ② el resto de kinds (avatar, image de logros, submission, resource, video de lección)
//      pasa EXACTAMENTE igual que antes — la regla nueva no los toca;
//   ③ el tamaño NO acota la duración (16 MB a bitrate bajo son minutos), así que se lee la
//      duración que DECLARA el contenedor: mp4 `moov.mvhd`, webm `Segment.Info.Duration`;
//   ④ el probe es best-effort y honesto: si el contenedor no declara duración (el caso del
//      WebM en vivo de MediaRecorder) devuelve null y NO se rechaza — no se promete lo que
//      no se comprueba;
//   ⑤ el servidor no se fía del `size` que declara el cliente: revalida con los bytes reales.
//
// Los fixtures de vídeo se fabrican byte a byte (sin ffmpeg ni binarios en el repo) para que
// el test sea determinista y no dependa del entorno.
import { describe, it, expect, beforeEach, vi } from "vitest";
import { makeDb } from "./helpers/route-harness";
import {
  checkKindPolicy,
  DPP_VIDEO_KIND,
  DPP_VIDEO_MAX_BYTES,
  DPP_VIDEO_MAX_SECONDS,
  MAX_UPLOAD_BYTES,
} from "../app/lib/uploads";
import { probeVideoDurationSec } from "../app/lib/video-probe";

/* ------------------------------ fixtures de contenedor ------------------------------ */

/** Box ISO-BMFF: [size:uint32][type:4][payload]. */
function box(type: string, payload: Buffer): Buffer {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(8 + payload.length, 0);
  head.write(type, 4, "latin1");
  return Buffer.concat([head, payload]);
}

/** MP4 mínimo con `moov.mvhd` declarando timescale/duration (mvhd v0 = 100 bytes de payload). */
function mp4WithDuration(secs: number, timescale = 1000): Buffer {
  const mvhd = Buffer.alloc(100);
  mvhd.writeUInt8(0, 0); // version 0
  mvhd.writeUInt32BE(timescale, 12); // tras version+flags(4) + creation(4) + modification(4)
  mvhd.writeUInt32BE(Math.round(secs * timescale), 16);
  return Buffer.concat([box("ftyp", Buffer.from("isom")), box("moov", box("mvhd", mvhd))]);
}

/** vint de tamaño EBML (sólo se necesitan tamaños de 1 byte para estos fixtures). */
function ebmlSize(n: number): Buffer {
  if (n < 0x80) return Buffer.from([0x80 | n]);
  return Buffer.from([0x40 | (n >> 8), n & 0xff]); // 2 bytes
}
function ebml(id: number[], payload: Buffer): Buffer {
  return Buffer.concat([Buffer.from(id), ebmlSize(payload.length), payload]);
}
const ID_EBML_HEAD = [0x1a, 0x45, 0xdf, 0xa3];
const ID_SEGMENT = [0x18, 0x53, 0x80, 0x67];
const ID_INFO = [0x15, 0x49, 0xa9, 0x66];
const ID_TIMECODE_SCALE = [0x2a, 0xd7, 0xb1];
const ID_DURATION = [0x44, 0x89];

/** WebM cerrado (como el de ffmpeg o un export): Segment→Info→TimecodeScale + Duration. */
function webmWithDuration(secs: number): Buffer {
  const scale = Buffer.alloc(4);
  scale.writeUInt32BE(1_000_000, 0); // 1 ms por tick
  const dur = Buffer.alloc(8);
  dur.writeDoubleBE(secs * 1000, 0); // ticks = ms
  const info = ebml(ID_INFO, Buffer.concat([ebml(ID_TIMECODE_SCALE, scale), ebml(ID_DURATION, dur)]));
  return Buffer.concat([ebml(ID_EBML_HEAD, Buffer.from([0x42, 0x86, 0x81, 0x01])), ebml(ID_SEGMENT, info)]);
}

/** WebM "en vivo" al estilo MediaRecorder: Segment de tamaño DESCONOCIDO y sin Duration. */
function webmStreamingNoDuration(): Buffer {
  const scale = Buffer.alloc(4);
  scale.writeUInt32BE(1_000_000, 0);
  const info = ebml(ID_INFO, ebml(ID_TIMECODE_SCALE, scale));
  const unknownSize = Buffer.from([0xff]); // vint "todo unos" = tamaño desconocido
  return Buffer.concat([
    ebml(ID_EBML_HEAD, Buffer.from([0x42, 0x86, 0x81, 0x01])),
    Buffer.from(ID_SEGMENT),
    unknownSize,
    info,
  ]);
}

/* ------------------------------ ① y ② la política del kind ------------------------------ */

describe("checkKindPolicy — el kind dpp-video ESTRECHA, nunca relaja", () => {
  it("acepta los contenedores que graba un navegador o un móvil", () => {
    for (const m of ["video/webm", "video/mp4", "video/quicktime"]) {
      expect(checkKindPolicy(DPP_VIDEO_KIND, m, 1024)).toBeNull();
    }
  });

  it("acepta el MIME con parámetros de códec que añade MediaRecorder", () => {
    expect(checkKindPolicy(DPP_VIDEO_KIND, "video/webm;codecs=vp9,opus", 1024)).toBeNull();
    expect(checkKindPolicy(DPP_VIDEO_KIND, "VIDEO/MP4", 1024)).toBeNull();
  });

  it("rechaza vídeo fuera de la allowlist aunque la regla común lo aceptaría (video/*)", () => {
    // video/x-msvideo pasa isAllowedMime por el prefijo "video/" pero NO es un DPP válido.
    expect(checkKindPolicy(DPP_VIDEO_KIND, "video/x-msvideo", 1024)).toMatch(/MP4, WebM o MOV/);
    expect(checkKindPolicy(DPP_VIDEO_KIND, "video/3gpp", 1024)).toMatch(/MP4, WebM o MOV/);
  });

  it("rechaza lo que no es vídeo (imagen, PDF, audio) para este kind", () => {
    for (const m of ["image/png", "application/pdf", "audio/webm", "text/plain"]) {
      expect(checkKindPolicy(DPP_VIDEO_KIND, m, 1024)).toMatch(/MP4, WebM o MOV/);
    }
  });

  it("el tope del DPP es MÁS estricto que el común y no lo modifica", () => {
    expect(DPP_VIDEO_MAX_BYTES).toBeLessThan(MAX_UPLOAD_BYTES);
    expect(checkKindPolicy(DPP_VIDEO_KIND, "video/mp4", DPP_VIDEO_MAX_BYTES)).toBeNull();
    expect(checkKindPolicy(DPP_VIDEO_KIND, "video/mp4", DPP_VIDEO_MAX_BYTES + 1)).toMatch(/demasiado grande/i);
  });

  it("NO toca ningún otro kind: los que ya funcionaban siguen pasando", () => {
    // Estos son los caminos vivos hoy: avatar, foto de logro, entrega, recurso, vídeo de lección.
    expect(checkKindPolicy("avatar", "image/png", 5_000_000)).toBeNull();
    expect(checkKindPolicy("image", "image/jpeg", 5_000_000)).toBeNull();
    expect(checkKindPolicy("submission", "audio/webm", 5_000_000)).toBeNull();
    expect(checkKindPolicy("resource", "application/pdf", 5_000_000)).toBeNull();
    // El vídeo de una LECCIÓN es largo y pesado: sigue con el tope común, no con el del DPP.
    expect(checkKindPolicy("video", "video/mp4", MAX_UPLOAD_BYTES)).toBeNull();
    expect(checkKindPolicy("file", "video/x-msvideo", 20_000_000)).toBeNull();
  });
});

/* ------------------------------ ③ y ④ la duración declarada ------------------------------ */

describe("probeVideoDurationSec — lee la duración del contenedor, o admite que no la sabe", () => {
  it("MP4: lee moov.mvhd (v0)", () => {
    expect(probeVideoDurationSec(mp4WithDuration(30))).toBeCloseTo(30, 3);
    expect(probeVideoDurationSec(mp4WithDuration(612))).toBeCloseTo(612, 3);
  });

  it("MP4: respeta el timescale (no asume 1000)", () => {
    expect(probeVideoDurationSec(mp4WithDuration(30, 90_000))).toBeCloseTo(30, 3);
  });

  it("WebM cerrado: lee Segment.Info.Duration con su TimecodeScale", () => {
    expect(probeVideoDurationSec(webmWithDuration(28.5))).toBeCloseTo(28.5, 2);
  });

  // Chrome SÍ deja escrita la Duration al cerrar (medido: una grabación real de 30 s devolvió
  // 30,48 s). Pero un WebM en streaming puede no traerla, y entonces no se inventa: null y la
  // subida pasa, acotada por tamaño. Es el contrato honesto del probe.
  it("WebM en streaming sin Duration → null: NO se inventa una duración", () => {
    expect(probeVideoDurationSec(webmStreamingNoDuration())).toBeNull();
  });

  it("basura, vacío o truncado → null y sin lanzar (nunca tumba una subida legítima)", () => {
    expect(probeVideoDurationSec(Buffer.alloc(0))).toBeNull();
    expect(probeVideoDurationSec(Buffer.from("no soy un video"))).toBeNull();
    expect(probeVideoDurationSec(mp4WithDuration(30).subarray(0, 20))).toBeNull();
    expect(probeVideoDurationSec(Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0xff, 0xff]))).toBeNull();
  });

  it("un fichero PEQUEÑO puede ser LARGO: por eso el tamaño no basta como límite", () => {
    // 10 minutos declarados en un mp4 de menos de 200 bytes: pasa cualquier tope de bytes.
    const largo = mp4WithDuration(600);
    expect(largo.length).toBeLessThan(DPP_VIDEO_MAX_BYTES);
    expect(probeVideoDurationSec(largo)!).toBeGreaterThan(DPP_VIDEO_MAX_SECONDS);
  });
});

/* ------------------------------ el gate real de POST /api/uploads ------------------------------ */

const box_ = vi.hoisted(() => ({ db: null as any, user: null as any })); // eslint-disable-line @typescript-eslint/no-explicit-any
vi.mock("../app/lib/db", () => ({
  db: new Proxy({}, { get: (_t, p: string) => (p === "then" ? undefined : box_.db.db[p]) }),
}));
vi.mock("../app/lib/auth", () => ({ setSession: vi.fn(), getSessionUser: () => box_.user, clearSession: vi.fn() }));
vi.mock("../app/lib/rate-limit", () => ({ rateLimit: () => ({ ok: true, retryAfter: 0 }) }));
// Parcial: la política y los topes son REALES (es el contrato que se ejercita); sólo se
// stubea saveUpload, porque escribir a disco no es viable en el arnés.
vi.mock("../app/lib/uploads", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../app/lib/uploads")>();
  return { ...actual, saveUpload: vi.fn() };
});

const { POST } = await import("../app/api/uploads/route");
const { saveUpload } = await import("../app/lib/uploads");

box_.db = makeDb();
const STUDENT = { id: "u-alumna", role: "STUDENT", email: "alumna@otr.do" };

function uploadReq(file: File | null, kind?: string): Request {
  const fd = new FormData();
  if (file) fd.append("file", file);
  if (kind) fd.append("kind", kind);
  return new Request("http://test.local/api/uploads", { method: "POST", body: fd });
}
const videoFile = (bytes: number, type = "video/webm", name = "dpp.webm") =>
  new File([Buffer.alloc(bytes)], name, { type });

beforeEach(() => {
  box_.db.reset();
  vi.clearAllMocks();
  box_.user = STUDENT;
});

describe("POST /api/uploads con kind=dpp-video", () => {
  it("sin sesión → 401 y ni se mira el archivo", async () => {
    box_.user = null;
    const res = await POST(uploadReq(videoFile(1024), DPP_VIDEO_KIND));
    expect(res.status).toBe(401);
    expect(saveUpload).not.toHaveBeenCalled();
  });

  it("vídeo válido de un alumno → 200 y se guarda con el kind PRIVADO dpp-video", async () => {
    (saveUpload as any).mockResolvedValue({ // eslint-disable-line @typescript-eslint/no-explicit-any
      url: "/uploads/abc.webm", original: "dpp.webm", mime: "video/webm", size: 1024, id: "up-dpp",
    });
    const res = await POST(uploadReq(videoFile(1024), DPP_VIDEO_KIND));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.url).toBe("/uploads/abc.webm");
    // El kind llega intacto: es lo que mantiene el archivo fuera de PUBLIC_KINDS al servirlo.
    expect((saveUpload as any).mock.calls[0][2]).toBe(DPP_VIDEO_KIND); // eslint-disable-line @typescript-eslint/no-explicit-any
    expect((saveUpload as any).mock.calls[0][1]).toBe(STUDENT.id); // eslint-disable-line @typescript-eslint/no-explicit-any
  });

  it("un archivo que NO es vídeo con kind dpp-video → 4xx, sin tocar el disco", async () => {
    const res = await POST(uploadReq(new File([Buffer.from("PNG")], "foto.png", { type: "image/png" }), DPP_VIDEO_KIND));
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.error).toMatch(/MP4, WebM o MOV/);
    expect(saveUpload).not.toHaveBeenCalled();
  });

  it("vídeo por encima del tope del DPP pero por debajo del común → 4xx (gana el estricto)", async () => {
    const size = DPP_VIDEO_MAX_BYTES + 1;
    expect(size).toBeLessThan(MAX_UPLOAD_BYTES); // el gate común lo dejaría pasar
    const res = await POST(uploadReq(videoFile(size, "video/mp4", "grande.mp4"), DPP_VIDEO_KIND));
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.error).toMatch(/demasiado grande/i);
    expect(saveUpload).not.toHaveBeenCalled();
  });

  it("NO ROMPE lo que ya funcionaba: foto de logro, avatar y entrega siguen subiendo", async () => {
    (saveUpload as any).mockResolvedValue({ url: "/uploads/x", original: "x", mime: "image/png", size: 3, id: "u1" }); // eslint-disable-line @typescript-eslint/no-explicit-any
    for (const [kind, type, name] of [
      ["image", "image/jpeg", "logro.jpg"],
      ["avatar", "image/png", "yo.png"],
      ["submission", "audio/webm", "entrega.weba"],
      ["resource", "application/pdf", "guia.pdf"],
      ["video", "video/mp4", "leccion.mp4"],
    ] as const) {
      const res = await POST(uploadReq(new File([Buffer.from("data")], name, { type }), kind));
      expect(res.status, `${kind} debía seguir subiendo`).toBe(200);
    }
    expect(saveUpload).toHaveBeenCalledTimes(5);
  });
});
