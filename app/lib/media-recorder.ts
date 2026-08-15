// OTR LMS · controlador de grabación reutilizable (getUserMedia + MediaRecorder + subida).
//
// Para qué: el paso 4 de admisión (DPP) pide un vídeo de ~30 s "grabar o subir". La lógica de
// grabar —pedir cámara/micro, negociar el contenedor, cronometrar, cortar solo, convertir el
// Blob en File y subirlo— es la misma que ya hace a mano la pantalla de entregas
// (app/lib/scr-learn.ts, grabador de AUDIO). Esto la deja en UN sitio para que la pantalla de
// admisión no la copie.
//
// Es HEADLESS a propósito: no crea ni pinta nada. La pantalla pone su propio HTML y recibe
// avisos por callbacks. Así sirve tanto al grabador de audio de entregas (mono, ondas, botón
// redondo) como al de vídeo de admisión (preview en <video>, rúbrica, 30 s) sin imponer markup.
//
// Se comparte por IMPORT directo (el mecanismo normal del repo: components.ts, esc.ts, icons.ts),
// no por un global `window.otr*`. Los globales de Aula.tsx existen para el bus Aula→pantallas
// (go/api/toast); esto es una utilidad pura y no necesita pasar por ahí. La SUBIDA sí usa
// `window.otrUpload` —resuelto en tiempo de llamada— para no duplicar el canal a /api/uploads
// ni crear un ciclo de imports con Aula.tsx.
//
// OJO scr-learn.ts NO se ha migrado a este módulo: su grabador funciona, no tiene tests y sin
// micrófono real no se puede verificar con clicks. Ver el reporte de la tarea.

export type RecorderMode = "audio" | "video";

export type RecorderState = "idle" | "recording" | "uploading" | "done" | "error";

export type RecorderResult = {
  url: string;
  original?: string;
  mime?: string;
  size?: number;
  id?: string;
};

export type RecorderOpts = {
  /** "video" pide cámara+micro; "audio" sólo micro. Default: "video". */
  mode?: RecorderMode;
  /** Corte automático, en segundos. Default: 35 (los 30 s del DPP + margen). */
  maxSecs?: number;
  /** `kind` que se manda a /api/uploads. Debe ser DPP_VIDEO_KIND para el paso 4. */
  kind?: string;
  /** false = no sube; la pantalla se queda con el File y decide. Default: true. */
  upload?: boolean;
  /** <video>/<audio> donde ver el directo mientras se graba (opcional). */
  preview?: HTMLMediaElement | null;
  /** Inyección del stream (tests, o canvas.captureStream()). Default: getUserMedia. */
  getStream?: () => Promise<MediaStream>;
  /** Cada segundo mientras graba. */
  onTick?: (secs: number) => void;
  /** Cambios de estado, para pintar la UI. */
  onState?: (state: RecorderState) => void;
  /** Grabación lista: el File local y, si se subió, la respuesta de /api/uploads. */
  onReady?: (file: File, res: RecorderResult | null, secs: number) => void;
  /** Cualquier fallo (permiso denegado, sin soporte, subida rechazada). */
  onError?: (err: Error) => void;
};

export type RecorderHandle = {
  start: () => Promise<void>;
  stop: () => void;
  /** Descarta lo grabado y vuelve a idle (no libera los listeners: eso es destroy). */
  reset: () => void;
  /** Corta, apaga cámara/micro y libera el objectURL. Llamar al desmontar la pantalla. */
  destroy: () => void;
  isRecording: () => boolean;
  /** objectURL de lo grabado, para reproducirlo. null si no hay nada. */
  getPlaybackUrl: () => string | null;
};

/* Preferencias de contenedor, en orden. El primero soportado gana.
   Chrome/Firefox/Android → webm (VP9/VP8); Safari 17+ → mp4. Los tres tipos base
   (webm/mp4) están en la allowlist estricta de lib/uploads para el kind dpp-video. */
const VIDEO_TYPES = [
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm",
  "video/mp4",
];
const AUDIO_TYPES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];

/* Bitrate PEDIDO explícitamente, no el que le apetezca al navegador. Sin esto, MediaRecorder
   sube a ~2,5 Mbps en 720p y el peso de 30 s queda a merced del navegador de turno.
   A 1,5 Mbps + 96 kbps ≈ 1,6 Mbps → 30 s ≈ 6,0 MB y 35 s ≈ 7,0 MB, con calidad de sobra para
   una cabeza parlante en 720p y muy por debajo de DPP_VIDEO_MAX_BYTES (16 MB).
   [A5] El comentario original citaba además un techo de plataforma de 10 MB —Next truncaba el
   cuerpo por haber middleware— que ya está arreglado (MAX_BODY_BYTES, next.config.mjs). El
   bitrate no cambia: no lo dictaba ese techo, sino la calidad que necesita el vídeo. */
const VIDEO_BPS = 1_500_000;
const AUDIO_BPS = 96_000;

/** ¿Puede este navegador grabar? La pantalla debe ofrecer "subir archivo" si devuelve false. */
export function canRecord(): boolean {
  if (typeof navigator === "undefined" || typeof window === "undefined") return false;
  const w = window as unknown as { MediaRecorder?: unknown };
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && w.MediaRecorder);
}

/** Primer contenedor soportado por este navegador (o "" para que decida MediaRecorder). */
export function pickMimeType(mode: RecorderMode): string {
  const w = window as unknown as { MediaRecorder?: { isTypeSupported?: (t: string) => boolean } };
  const MR = w.MediaRecorder;
  const list = mode === "audio" ? AUDIO_TYPES : VIDEO_TYPES;
  if (!MR || typeof MR.isTypeSupported !== "function") return "";
  for (const t of list) if (MR.isTypeSupported(t)) return t;
  return "";
}

/** Extensión coherente con el contenedor (el servidor la re-deriva del MIME igualmente). */
function extFor(type: string): string {
  const t = (type || "").toLowerCase();
  if (t.includes("mp4")) return "mp4";
  if (t.includes("quicktime")) return "mov";
  if (t.includes("ogg")) return "ogg";
  return "webm";
}

/**
 * Crea el controlador. No pide permisos hasta el primer start().
 * Contrato de uso mínimo:
 *   const rec = createRecorder({ kind: DPP_VIDEO_KIND, preview: videoEl, onReady: ... });
 *   botón.onclick = () => rec.isRecording() ? rec.stop() : rec.start();
 *   // al desmontar la pantalla: rec.destroy();
 */
export function createRecorder(opts: RecorderOpts = {}): RecorderHandle {
  const mode: RecorderMode = opts.mode || "video";
  const maxSecs = typeof opts.maxSecs === "number" && opts.maxSecs > 0 ? opts.maxSecs : 35;
  const kind = opts.kind || "file";
  const doUpload = opts.upload !== false;

  let rec: MediaRecorder | null = null;
  let stream: MediaStream | null = null;
  let chunks: Blob[] = [];
  let blobUrl: string | null = null;
  let recording = false;
  let secs = 0;
  let tick: ReturnType<typeof setInterval> | null = null;
  // reset()/destroy() paran la grabadora, y eso dispara `onstop` igual que un stop() normal.
  // Sin esta marca, descartar una toma acabaría SUBIÉNDOLA igual (lo cazó el test de reset).
  let discarded = false;

  const emitState = (s: RecorderState) => { try { opts.onState?.(s); } catch { /* la UI no rompe la grabación */ } };
  const emitError = (e: Error) => { emitState("error"); try { opts.onError?.(e); } catch { /* idem */ } };

  function stopTimer() { if (tick) { clearInterval(tick); tick = null; } }

  function releaseStream() {
    if (stream) {
      try { stream.getTracks().forEach((t) => t.stop()); } catch { /* ya parado */ }
      stream = null;
    }
    // Soltar el directo del preview; si hay reproducción se re-asigna en onstop.
    if (opts.preview) { try { (opts.preview as HTMLMediaElement).srcObject = null; } catch { /* no soportado */ } }
  }

  function revokeBlobUrl() {
    if (blobUrl) { try { URL.revokeObjectURL(blobUrl); } catch { /* ya liberado */ } blobUrl = null; }
  }

  async function start(): Promise<void> {
    if (recording) return;
    if (!canRecord() && !opts.getStream) {
      emitError(new Error("Este navegador no puede grabar; sube un archivo en su lugar"));
      return;
    }

    // 1) Stream (permiso de cámara/micro). Es el paso que el usuario puede denegar.
    try {
      stream = opts.getStream
        ? await opts.getStream()
        : await navigator.mediaDevices.getUserMedia(
            mode === "audio" ? { audio: true } : { audio: true, video: { facingMode: "user" } },
          );
    } catch {
      emitError(new Error("No se pudo acceder a la cámara o el micrófono"));
      return;
    }

    // 2) Preview en directo (silenciado: con audio se acopla).
    if (opts.preview && mode === "video") {
      try {
        const v = opts.preview as HTMLVideoElement;
        v.srcObject = stream;
        v.muted = true;
        v.play?.().catch(() => { /* autoplay bloqueado: no es fatal */ });
      } catch { /* sin preview */ }
    }

    // 3) Grabadora.
    chunks = [];
    discarded = false;
    revokeBlobUrl();
    const mimeType = pickMimeType(mode);
    const recOpts: MediaRecorderOptions =
      mode === "audio"
        ? { audioBitsPerSecond: AUDIO_BPS }
        : { videoBitsPerSecond: VIDEO_BPS, audioBitsPerSecond: AUDIO_BPS };
    if (mimeType) recOpts.mimeType = mimeType;
    try {
      const w = window as unknown as { MediaRecorder: new (s: MediaStream, o?: MediaRecorderOptions) => MediaRecorder };
      rec = new w.MediaRecorder(stream, recOpts);
    } catch {
      releaseStream();
      emitError(new Error("Este navegador no puede grabar en un formato compatible"));
      return;
    }

    rec.ondataavailable = (e: BlobEvent) => { if (e.data && e.data.size > 0) chunks.push(e.data); };
    rec.onstop = () => { void finish(); };

    rec.start();
    recording = true;
    secs = 0;
    emitState("recording");
    try { opts.onTick?.(0); } catch { /* la UI no rompe la grabación */ }
    tick = setInterval(() => {
      secs++;
      try { opts.onTick?.(secs); } catch { /* idem */ }
      if (secs >= maxSecs) stop(); // corte duro: el DPP son 30 s, no un vídeo libre
    }, 1000);
  }

  // Cierra la grabación: arma el File y (si toca) lo sube.
  async function finish(): Promise<void> {
    stopTimer();
    releaseStream();

    // Toma descartada (reset/destroy): se tira, no se sube. El estado lo emite quien descartó.
    if (discarded) { discarded = false; chunks = []; return; }

    const type = (chunks[0] && chunks[0].type) || (mode === "audio" ? "audio/webm" : "video/webm");
    const blob = new Blob(chunks, { type });

    if (blob.size <= 0 || secs <= 0) { emitState("idle"); return; }

    revokeBlobUrl();
    blobUrl = URL.createObjectURL(blob);
    if (opts.preview) {
      // Ya no hay directo: reproducir lo grabado (con sonido).
      try { opts.preview.srcObject = null; opts.preview.src = blobUrl; opts.preview.muted = false; } catch { /* sin preview */ }
    }

    // El nombre es cosmético: el servidor guarda con un uuid y deriva la extensión del MIME.
    const base = mode === "audio" ? "grabacion" : "dpp";
    const file = new File([blob], `${base}-${Date.now()}.${extFor(type)}`, { type });

    if (!doUpload) {
      emitState("done");
      try { opts.onReady?.(file, null, secs); } catch { /* la UI no rompe el flujo */ }
      return;
    }

    emitState("uploading");
    const up = (window as unknown as { otrUpload?: (f: File, k?: string) => Promise<RecorderResult> }).otrUpload;
    if (!up) { emitError(new Error("No se pudo subir la grabación")); return; }
    try {
      const res = await up(file, kind);
      if (!res || !res.url) throw new Error("No se pudo subir la grabación");
      emitState("done");
      try { opts.onReady?.(file, res, secs); } catch { /* idem */ }
    } catch (e) {
      // otrUpload ya avisa por toast con el mensaje del servidor; se propaga para que la
      // pantalla lo deje escrito y no se guarde creyendo que el vídeo entró.
      emitError(e instanceof Error ? e : new Error("No se pudo subir la grabación"));
    }
  }

  function stop(): void {
    if (!recording) return;
    recording = false;
    stopTimer();
    try { if (rec && rec.state !== "inactive") rec.stop(); } catch { /* ya parada */ }
  }

  function reset(): void {
    discarded = true; // antes del stop(): `onstop` debe encontrar ya la marca
    stop();
    stopTimer();
    releaseStream();
    chunks = [];
    secs = 0;
    revokeBlobUrl();
    if (opts.preview) { try { opts.preview.removeAttribute("src"); opts.preview.load?.(); } catch { /* sin preview */ } }
    emitState("idle");
  }

  function destroy(): void {
    discarded = true; // desmontando la pantalla: lo que quede a medias no se sube
    try { if (rec && rec.state !== "inactive") rec.stop(); } catch { /* ya parada */ }
    recording = false;
    stopTimer();
    releaseStream();
    revokeBlobUrl();
    rec = null;
  }

  return {
    start,
    stop,
    reset,
    destroy,
    isRecording: () => recording,
    getPlaybackUrl: () => blobUrl,
  };
}
