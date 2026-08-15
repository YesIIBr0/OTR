// OTR LMS · guardado de archivos reales en disco.
// Se guardan FUERA de public/ (Next no sirve archivos creados en runtime bajo public/
// con `next start` → daban 404). Se sirven por app/uploads/[...path]/route.ts con
// cabeceras seguras (nosniff + Content-Disposition). Defensa en profundidad: valida
// mime + tamaño aquí también, no solo en la ruta.
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { db } from "./db";
import { probeVideoDurationSec } from "./video-probe";

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // 25 MB (video grande → usar YouTube/Cloudflare)

// Directorio de subidas (persistente, montado por volumen en Docker). Configurable.
export const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), "var", "uploads");

// Tipos peligrosos servidos same-origin (XSS almacenado) → BLOQUEADOS aunque casen un prefijo.
const BLOCKED_MIME = new Set<string>([
  "image/svg+xml",
  "image/svg",
  "text/html",
  "application/xhtml+xml",
]);

// Allowlist exacta de tipos MIME permitidos (además de los prefijos seguros).
const EXACT_MIME = new Set<string>([
  "application/pdf",
  "text/plain",
  "application/msword",
  // Office Open XML (docx/xlsx/pptx)
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);
// image/ incluiría svg → se bloquea explícitamente en BLOCKED_MIME.
const PREFIX_MIME = ["image/", "audio/", "video/"];

/** ¿El MIME está permitido? (bloquea explícitamente tipos peligrosos como SVG/HTML) */
export function isAllowedMime(mime: string): boolean {
  const m = (mime || "").toLowerCase().split(";")[0].trim();
  if (BLOCKED_MIME.has(m)) return false;
  if (EXACT_MIME.has(m)) return true;
  return PREFIX_MIME.some((p) => m.startsWith(p));
}

// Extensiones seguras por MIME (no confiamos en el nombre original para el path).
const EXT_BY_MIME: Record<string, string> = {
  "application/pdf": ".pdf",
  "text/plain": ".txt",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": ".pptx",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
  "audio/mpeg": ".mp3",
  "audio/wav": ".wav",
  "audio/ogg": ".ogg",
  "audio/webm": ".weba",
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "video/quicktime": ".mov",
};

/** Deriva una extensión segura: por MIME conocido, o saneando la del nombre original. */
function safeExt(original: string, mime: string): string {
  const byMime = EXT_BY_MIME[(mime || "").toLowerCase().split(";")[0].trim()];
  if (byMime) return byMime;
  const raw = path.extname(original || "").toLowerCase();
  const cleaned = raw.replace(/[^a-z0-9.]/g, "");
  // Nunca permitir extensiones ejecutables/activas aunque vengan del nombre original.
  if (/^\.[a-z0-9]{1,8}$/.test(cleaned) && !/\.(svg|html?|xht|js|mjs)$/.test(cleaned)) return cleaned;
  return ".bin";
}

/* ================== Política ESTRICTA del vídeo DPP (paso 4 de admisión) ==================
   "Documentar tu Punto de Partida": el alumno graba o sube ~30 s presentándose.
   Este bloque ESTRECHA la validación común; no la relaja en ningún punto. La regla general
   sigue igual para todos los demás kinds (avatar, submission, resource, image, video…).

   ¿Por qué un kind propio y no el "video" que ya existe?
   `kind:"video"` lo usa scr-teacher para el vídeo de una LECCIÓN, que es largo y pesado.
   Colgar de él un tope de 30 s / 16 MB rompería la subida del coach. Kind separado =
   política separada. Además `dpp-video` NO está en PUBLIC_KINDS de app/uploads/[...path],
   así que el archivo de un MENOR queda privado por defecto (dueño, admin, coach vinculado
   o tutor con guardianship ACTIVE). Un kind "público" como "image" lo dejaría ver a
   cualquier autenticado: la pantalla de admisión debe mandar EXACTAMENTE esta constante. */
export const DPP_VIDEO_KIND = "dpp-video";

/* Allowlist EXACTA (la común acepta cualquier `video/*`). Se limita a los contenedores que
   (a) produce un navegador o un móvil y (b) app/uploads/[...path] ya sirve INLINE — un tipo
   que no se puede previsualizar es un tipo que el alumno no puede revisar antes de enviar:
     · video/webm     → MediaRecorder en Chrome/Firefox/Edge y Android
     · video/mp4      → MediaRecorder en Safari 17+, y el mp4 del carrete de Android/iOS
     · video/quicktime→ .mov del carrete de iOS
   Fuera queda a propósito video/3gpp (Android antiguo): habría que ampliar INLINE_OK y
   EXT_BY_MIME —tocar el camino común por un formato heredado— y el grabador del navegador
   cubre ese caso sin ampliar nada. */
export const DPP_VIDEO_MIME = new Set<string>(["video/webm", "video/mp4", "video/quicktime"]);

/* Tope de 8 MB. Sale de dos límites, y manda el más pequeño:
   ① TECHO REAL DE LA PLATAFORMA (medido, no teórico): este proyecto tiene middleware.ts, y
      Next trunca el cuerpo de cualquier petición que pase por él a partir de 10 MB
      (`middlewareClientMaxBodySize`, default). Con el cuerpo truncado, `req.formData()`
      revienta y /api/uploads responde "Esperaba multipart/form-data" — un error que no dice
      nada al alumno. Es decir: el MAX_UPLOAD_BYTES de 25 MB NO es alcanzable hoy (afecta a
      TODAS las subidas, no sólo al vídeo; ver el reporte de la tarea). El tope del DPP se
      queda por DEBAJO de ese techo para que el alumno reciba siempre el mensaje correcto.
   ② ARITMÉTICA DE 30 s: el grabador pide 1,5 Mbps de vídeo + 96 kbps de audio (ver
      media-recorder.ts) ≈ 1,6 Mbps → 35 s (los 30 s objetivo + el margen de parada) ≈ 7,0 MB.
      Con 720p de "cabeza parlante" ese bitrate da sobrada calidad para presentarse.
   8 MB cubre ②, deja margen para el overhead del multipart y no llega a ①. */
export const DPP_VIDEO_MAX_BYTES = 8 * 1024 * 1024;

/* Objetivo 30 s; el servidor rechaza a partir de 40 s. El margen no es decorativo: una
   grabación real de 30 s desde Chrome llegó declarando 30,48 s (latencia de parada +
   redondeo del contenedor). Sólo se aplica cuando el contenedor DECLARA su duración —que en
   la práctica es el caso tanto en MP4 como en el WebM de MediaRecorder, medido— y si no la
   declara NO se inventa: ver el contrato en lib/video-probe.ts. */
export const DPP_VIDEO_MAX_SECONDS = 40;

/**
 * Reglas extra por `kind`. Devuelve el mensaje de error, o null si pasa.
 * Sólo puede RECHAZAR lo que la validación común ya aceptó: nunca amplía nada.
 */
export function checkKindPolicy(kind: string, mime: string, size: number): string | null {
  const k = (kind || "").trim();
  if (k !== DPP_VIDEO_KIND) return null;

  const m = (mime || "").toLowerCase().split(";")[0].trim();
  if (!DPP_VIDEO_MIME.has(m)) {
    return "El vídeo debe estar en formato MP4, WebM o MOV";
  }
  if (typeof size === "number" && size > DPP_VIDEO_MAX_BYTES) {
    return `Vídeo demasiado grande (máx ${Math.round(DPP_VIDEO_MAX_BYTES / (1024 * 1024))}MB para 30 segundos)`;
  }
  return null;
}

export type SavedUpload = {
  url: string;
  original: string;
  mime: string;
  size: number;
  id: string;
};

/**
 * Guarda el archivo en UPLOAD_DIR/<uuid><ext> y registra la fila Upload.
 * Lanza Error con mensaje legible si falla la validación.
 */
export async function saveUpload(file: File, userId: string, kind: string): Promise<SavedUpload> {
  if (!file || typeof (file as File).arrayBuffer !== "function") {
    throw new Error("Archivo no recibido");
  }
  const mime = (file.type || "application/octet-stream").toLowerCase().split(";")[0].trim();
  const original = String(file.name || "archivo").slice(0, 255);

  if (!isAllowedMime(mime)) {
    throw new Error("Tipo de archivo no permitido");
  }

  // Rechaza por tamaño declarado antes de leer en memoria (defensa contra DoS).
  const declared = (file as File).size;
  if (typeof declared === "number" && declared > MAX_UPLOAD_BYTES) {
    throw new Error("Archivo demasiado grande (máx 25MB)");
  }

  // Regla extra por kind ANTES de leer el archivo a memoria (mismo criterio que el tope común).
  const kindNorm = (kind || "file").slice(0, 20);
  const declaredKindErr = checkKindPolicy(kindNorm, mime, typeof declared === "number" ? declared : 0);
  if (declaredKindErr) throw new Error(declaredKindErr);

  const buffer = Buffer.from(await file.arrayBuffer());
  const size = buffer.byteLength;
  if (size <= 0) throw new Error("Archivo vacío");
  if (size > MAX_UPLOAD_BYTES) throw new Error("Archivo demasiado grande (máx 25MB)");

  // Revalidación con el tamaño REAL: `file.size` lo declara el cliente y puede mentir.
  const kindErr = checkKindPolicy(kindNorm, mime, size);
  if (kindErr) throw new Error(kindErr);

  // Duración: el tamaño NO la acota (16 MB a bitrate bajo son minutos). Se lee la que el
  // contenedor declara; si no la declara (típico en el WebM que graba MediaRecorder en vivo)
  // NO se rechaza — ver el contrato en lib/video-probe.ts y lo documentado para el cliente.
  if (kindNorm === DPP_VIDEO_KIND) {
    const secs = probeVideoDurationSec(buffer);
    if (secs !== null && secs > DPP_VIDEO_MAX_SECONDS) {
      throw new Error(`El vídeo dura ${Math.round(secs)}s; el máximo es ${DPP_VIDEO_MAX_SECONDS}s`);
    }
  }

  const ext = safeExt(original, mime);
  const filename = crypto.randomUUID() + ext;
  await mkdir(UPLOAD_DIR, { recursive: true });
  const diskPath = path.join(UPLOAD_DIR, filename);
  await writeFile(diskPath, buffer);

  const url = `/uploads/${filename}`;
  const row = await db.upload.create({
    data: {
      userId,
      kind: (kind || "file").slice(0, 20),
      filename,
      original,
      mime,
      size,
      url,
    },
  });

  return { url, original, mime, size, id: row.id };
}
