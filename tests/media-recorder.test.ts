// [A3 · ADMISIÓN PASO 4] Controlador de grabación reutilizable (app/lib/media-recorder.ts).
//
// Existe para que la pantalla de admisión NO copie la lógica de grabar que hoy vive a mano
// dentro de la pantalla de entregas. Lo que se blinda es el contrato que va a usar el otro
// agente:
//   ① corta SOLO al llegar al máximo (el DPP son 30 s, no un vídeo libre);
//   ② al parar arma un File y lo sube por window.otrUpload con el kind que se le pasó
//      —el canal que ya existe—, sin montar uno nuevo;
//   ③ si el usuario NIEGA la cámara/el micro, avisa por onError y no deja el estado colgado;
//   ④ si la subida falla, se entera la pantalla (no se puede guardar creyendo que entró);
//   ⑤ destroy() apaga la cámara y los timers — sin eso queda el piloto encendido al navegar;
//   ⑥ negocia el contenedor con MediaRecorder.isTypeSupported y elige uno que la allowlist
//      estricta del servidor acepta.
//
// El stream se INYECTA (opts.getStream): en Node no hay cámara, y en el navegador ese mismo
// hueco permite verificar con un canvas.captureStream() real.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createRecorder, pickMimeType, canRecord } from "../app/lib/media-recorder";

/* eslint-disable @typescript-eslint/no-explicit-any */

// --- doble de MediaRecorder: guarda los callbacks y emite un chunk al parar ---
class FakeMediaRecorder {
  static supported: string[] = ["video/webm;codecs=vp9,opus", "video/webm", "audio/webm;codecs=opus"];
  static isTypeSupported(t: string) { return FakeMediaRecorder.supported.includes(t); }
  static last: FakeMediaRecorder | null = null;

  state = "inactive";
  ondataavailable: ((e: any) => void) | null = null;
  onstop: (() => void) | null = null;
  mimeType: string;
  opts: any;
  constructor(_stream: any, opts?: any) {
    this.mimeType = opts?.mimeType || "";
    this.opts = opts || {};
    FakeMediaRecorder.last = this;
  }
  start() { this.state = "recording"; }
  stop() {
    this.state = "inactive";
    // Un chunk con el tipo negociado, como haría el navegador.
    this.ondataavailable?.({ data: new Blob([new Uint8Array(2048)], { type: this.mimeType || "video/webm" }) });
    this.onstop?.();
  }
}

const tracks = { stopped: 0 };
function fakeStream(): any {
  return { getTracks: () => [{ stop: () => { tracks.stopped++; } }] };
}

let uploads: Array<{ file: File; kind?: string }> = [];

beforeEach(() => {
  vi.useFakeTimers();
  tracks.stopped = 0;
  uploads = [];
  FakeMediaRecorder.last = null;
  FakeMediaRecorder.supported = ["video/webm;codecs=vp9,opus", "video/webm", "audio/webm;codecs=opus"];

  (globalThis as any).window = globalThis as any;
  (globalThis as any).MediaRecorder = FakeMediaRecorder;
  // `navigator` es sólo-lectura en Node: hay que redefinir la propiedad.
  Object.defineProperty(globalThis, "navigator", {
    value: { mediaDevices: { getUserMedia: async () => fakeStream() } },
    configurable: true,
    writable: true,
  });
  (globalThis as any).URL.createObjectURL = () => "blob:fake-url";
  (globalThis as any).URL.revokeObjectURL = () => {};
  (globalThis as any).window.otrUpload = async (file: File, kind?: string) => {
    uploads.push({ file, kind });
    return { url: "/uploads/fake.webm", original: file.name, mime: file.type, size: file.size, id: "up-1" };
  };
});

afterEach(() => {
  vi.useRealTimers();
  delete (globalThis as any).MediaRecorder;
  delete (globalThis as any).window.otrUpload;
});

/* ------------------------------ ⑥ negociación de contenedor ------------------------------ */

describe("pickMimeType / canRecord", () => {
  it("elige el primer contenedor soportado, y es uno que el servidor acepta para el DPP", () => {
    const t = pickMimeType("video");
    expect(t).toBe("video/webm;codecs=vp9,opus");
    // El servidor corta el ";codecs=..." y compara con la allowlist: queda "video/webm".
    expect(t.split(";")[0]).toBe("video/webm");
  });

  it("cae a mp4 cuando el navegador sólo soporta mp4 (Safari)", () => {
    FakeMediaRecorder.supported = ["video/mp4"];
    expect(pickMimeType("video")).toBe("video/mp4");
  });

  it("sin ninguno soportado devuelve '' (deja decidir a MediaRecorder)", () => {
    FakeMediaRecorder.supported = [];
    expect(pickMimeType("video")).toBe("");
  });

  it("canRecord detecta el soporte del navegador", () => {
    expect(canRecord()).toBe(true);
    delete (globalThis as any).MediaRecorder;
    expect(canRecord()).toBe(false);
  });
});

/* ------------------------------ ① ② el ciclo de grabación ------------------------------ */

describe("createRecorder — grabar, cortar y subir", () => {
  it("① corta solo al llegar al máximo y ② sube el File con el kind pedido", async () => {
    const states: string[] = [];
    const ticks: number[] = [];
    let ready: { name: string; kind?: string; secs: number } | null = null;

    const rec = createRecorder({
      mode: "video",
      maxSecs: 30,
      kind: "dpp-video",
      getStream: async () => fakeStream(),
      onState: (s) => states.push(s),
      onTick: (n) => ticks.push(n),
      onReady: (file, res, secs) => { ready = { name: file.name, kind: uploads[0]?.kind, secs }; void res; },
    });

    await rec.start();
    expect(rec.isRecording()).toBe(true);

    // 29 s: sigue grabando.
    await vi.advanceTimersByTimeAsync(29_000);
    expect(rec.isRecording()).toBe(true);

    // El segundo 30 dispara el corte automático.
    await vi.advanceTimersByTimeAsync(1_000);
    expect(rec.isRecording()).toBe(false);
    await vi.runAllTimersAsync();

    expect(uploads).toHaveLength(1);
    expect(uploads[0].kind).toBe("dpp-video");
    expect(uploads[0].file.type).toContain("video/webm");
    expect(ready!.secs).toBe(30);
    expect(ready!.name).toMatch(/^dpp-\d+\.webm$/);
    expect(states).toEqual(["recording", "uploading", "done"]);
    expect(ticks[0]).toBe(0);
    expect(ticks[ticks.length - 1]).toBe(30);
  });

  it("pide un bitrate explícito para que 30 s quepan bajo el tope del servidor", async () => {
    // Sin esto MediaRecorder elige ~2,5 Mbps en 720p y el clip se pasa del tope (y del techo
    // de 10 MB de la plataforma, cuyo error no le dice nada al alumno).
    const rec = createRecorder({ kind: "dpp-video", getStream: async () => fakeStream() });
    await rec.start();
    const o = FakeMediaRecorder.last!.opts;
    expect(o.videoBitsPerSecond).toBe(1_500_000);
    expect(o.audioBitsPerSecond).toBe(96_000);
    // 35 s (30 objetivo + margen) al bitrate pedido deben pesar ≈7 MB. El presupuesto se
    // mantiene en 8 MB —MÁS estricto que DPP_VIDEO_MAX_BYTES, que hoy son 16 MB— porque lo que
    // se protege aquí es que el GRABADOR no dependa del margen que le deje el servidor.
    const bytes35s = ((o.videoBitsPerSecond + o.audioBitsPerSecond) / 8) * 35;
    expect(bytes35s).toBeLessThan(8 * 1024 * 1024);
    rec.destroy();
  });

  it("en modo audio no impone bitrate de vídeo (no rompe el grabador de voz)", async () => {
    const rec = createRecorder({ mode: "audio", kind: "submission", getStream: async () => fakeStream() });
    await rec.start();
    expect(FakeMediaRecorder.last!.opts.videoBitsPerSecond).toBeUndefined();
    rec.destroy();
  });

  it("parar a mano antes del máximo también sube", async () => {
    const rec = createRecorder({ kind: "dpp-video", getStream: async () => fakeStream() });
    await rec.start();
    await vi.advanceTimersByTimeAsync(5_000);
    rec.stop();
    await vi.runAllTimersAsync();
    expect(uploads).toHaveLength(1);
  });

  it("upload:false → no sube nada; la pantalla se queda el File", async () => {
    let got: File | null = null;
    const rec = createRecorder({
      kind: "dpp-video", upload: false, getStream: async () => fakeStream(),
      onReady: (file) => { got = file; },
    });
    await rec.start();
    await vi.advanceTimersByTimeAsync(3_000);
    rec.stop();
    await vi.runAllTimersAsync();
    expect(uploads).toHaveLength(0);
    expect(got!.size).toBeGreaterThan(0);
  });

  it("parar sin haber grabado nada no sube un archivo vacío", async () => {
    const rec = createRecorder({ kind: "dpp-video", getStream: async () => fakeStream() });
    await rec.start();
    rec.stop(); // 0 s
    await vi.runAllTimersAsync();
    expect(uploads).toHaveLength(0);
  });
});

/* ------------------------------ ③ ④ ⑤ fallos y limpieza ------------------------------ */

describe("createRecorder — permisos, fallos y limpieza", () => {
  it("③ cámara/micro denegados → onError y no queda grabando", async () => {
    const errs: string[] = [];
    const rec = createRecorder({
      kind: "dpp-video",
      getStream: async () => { throw new Error("NotAllowedError"); },
      onError: (e) => errs.push(e.message),
    });
    await rec.start();
    expect(rec.isRecording()).toBe(false);
    expect(errs[0]).toMatch(/cámara o el micrófono/i);
    expect(uploads).toHaveLength(0);
  });

  it("④ si /api/uploads rechaza el vídeo, la pantalla se entera", async () => {
    (globalThis as any).window.otrUpload = async () => { throw new Error("Vídeo demasiado grande (máx 16MB para 30 segundos)"); };
    const errs: string[] = [];
    let readyCalled = false;
    const rec = createRecorder({
      kind: "dpp-video", getStream: async () => fakeStream(),
      onError: (e) => errs.push(e.message), onReady: () => { readyCalled = true; },
    });
    await rec.start();
    await vi.advanceTimersByTimeAsync(4_000);
    rec.stop();
    await vi.runAllTimersAsync();
    expect(errs[0]).toMatch(/demasiado grande/i);
    expect(readyCalled).toBe(false); // nunca se anuncia como listo
  });

  it("⑤ destroy() apaga la cámara y los timers (no queda el piloto encendido al navegar)", async () => {
    const ticks: number[] = [];
    const rec = createRecorder({ kind: "dpp-video", getStream: async () => fakeStream(), onTick: (n) => ticks.push(n) });
    await rec.start();
    await vi.advanceTimersByTimeAsync(3_000);
    const antes = ticks.length;

    rec.destroy();
    expect(tracks.stopped).toBeGreaterThan(0); // se pararon las pistas del stream
    await vi.advanceTimersByTimeAsync(5_000);
    expect(ticks.length).toBe(antes); // el cronómetro ya no corre
    expect(rec.isRecording()).toBe(false);
  });

  it("al terminar de grabar se libera el stream aunque no se llame a destroy()", async () => {
    const rec = createRecorder({ kind: "dpp-video", getStream: async () => fakeStream() });
    await rec.start();
    await vi.advanceTimersByTimeAsync(2_000);
    rec.stop();
    await vi.runAllTimersAsync();
    expect(tracks.stopped).toBeGreaterThan(0);
  });

  it("reset() descarta lo grabado y vuelve a idle", async () => {
    const states: string[] = [];
    const rec = createRecorder({ kind: "dpp-video", getStream: async () => fakeStream(), onState: (s) => states.push(s) });
    await rec.start();
    await vi.advanceTimersByTimeAsync(2_000);
    rec.reset();
    await vi.runAllTimersAsync();
    expect(rec.isRecording()).toBe(false);
    expect(states[states.length - 1]).toBe("idle");
    // La toma descartada NO se sube: parar la grabadora dispara `onstop` igual que un stop()
    // normal, y sin la marca de descarte el vídeo que el alumno acaba de tirar acabaría en disco.
    expect(uploads).toHaveLength(0);
  });

  it("destroy() a mitad de grabación tampoco sube la toma a medias", async () => {
    const rec = createRecorder({ kind: "dpp-video", getStream: async () => fakeStream() });
    await rec.start();
    await vi.advanceTimersByTimeAsync(3_000);
    rec.destroy();
    await vi.runAllTimersAsync();
    expect(uploads).toHaveLength(0);
  });

  it("start() dos veces seguidas no abre dos grabaciones", async () => {
    const rec = createRecorder({ kind: "dpp-video", getStream: async () => fakeStream() });
    await rec.start();
    const first = FakeMediaRecorder.last;
    await rec.start();
    expect(FakeMediaRecorder.last).toBe(first);
  });
});
