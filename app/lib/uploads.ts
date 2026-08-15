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

/* [A5] Techo del CUERPO de la petición, que no es el mismo que el del archivo: el multipart
   añade boundaries, cabeceras de parte y el campo `kind`, así que un archivo de 25 MB viaja
   dentro de un cuerpo de algo más de 25 MB. Este número va SINCRONIZADO con
   `experimental.middlewareClientMaxBodySize` (next.config.mjs), que es el punto donde Next
   trunca el cuerpo clonado para el middleware — por debajo de él el archivo NO llega entero.
   Sirve para rechazar por Content-Length ANTES de parsear, con un mensaje que dice la verdad
   ("demasiado grande") en vez del "Esperaba multipart/form-data" que salía del truncamiento. */
export const MAX_BODY_BYTES = 26 * 1024 * 1024; // 25 MB de archivo + 1 MB de sobre

/** Mensaje único del tope de archivo: el mismo texto en la ruta y en la lib. */
export const tooBigMsg = () => `Archivo demasiado grande (máx ${Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))}MB)`;

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
/* [FUENTE ÚNICA] El contrato del vídeo del DPP —kind, formatos, tope y duración— vive en
   app/lib/dpp-video.ts porque la PANTALLA que se lo pide al alumno también lo necesita y no
   puede importar este módulo (arrastra fs y prisma). Se re-exporta para que todo lo que ya
   importaba desde aquí siga igual.

   El tope de 16 MB se decide así: ① GRABAR en el navegador pide ~1,6 Mbps → 35 s ≈ 7,0 MB;
   ② SUBIR desde el móvil, 30 s a ~4 Mbps (1080p recomprimido) ≈ 15 MB, que cabe; un clip
   CRUDO de iPhone a 17 Mbps (≈64 MB) queda fuera a propósito. ③ Sigue muy por debajo de
   MAX_UPLOAD_BYTES y MAX_BODY_BYTES, así que el alumno lee siempre el mensaje específico.
   El margen de 40 s sobre los 30 pedidos está explicado en dpp-video.ts. */
export {
  DPP_VIDEO_KIND,
  DPP_VIDEO_MAX_BYTES,
  DPP_VIDEO_TARGET_SECONDS,
  DPP_VIDEO_MAX_SECONDS,
} from "./dpp-video";
import { DPP_VIDEO_KIND, DPP_VIDEO_MAX_BYTES, DPP_VIDEO_MAX_SECONDS, DPP_VIDEO_TARGET_SECONDS, DPP_VIDEO_MIME as DPP_MIME_LIST } from "./dpp-video";

/* Allowlist EXACTA (la común acepta cualquier `video/*`): se usa como Set en la validación. */
export const DPP_VIDEO_MIME = new Set<string>(DPP_MIME_LIST);

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
    throw new Error(tooBigMsg());
  }

  // Regla extra por kind ANTES de leer el archivo a memoria (mismo criterio que el tope común).
  const kindNorm = (kind || "file").slice(0, 20);
  const declaredKindErr = checkKindPolicy(kindNorm, mime, typeof declared === "number" ? declared : 0);
  if (declaredKindErr) throw new Error(declaredKindErr);

  const buffer = Buffer.from(await file.arrayBuffer());
  const size = buffer.byteLength;
  if (size <= 0) throw new Error("Archivo vacío");
  if (size > MAX_UPLOAD_BYTES) throw new Error(tooBigMsg());

  // Revalidación con el tamaño REAL: `file.size` lo declara el cliente y puede mentir.
  const kindErr = checkKindPolicy(kindNorm, mime, size);
  if (kindErr) throw new Error(kindErr);

  // Duración: el tamaño NO la acota (16 MB a bitrate bajo son minutos). Se lee la que el
  // contenedor declara; si no la declara (típico en el WebM que graba MediaRecorder en vivo)
  // NO se rechaza — ver el contrato en lib/video-probe.ts y lo documentado para el cliente.
  if (kindNorm === DPP_VIDEO_KIND) {
    const secs = probeVideoDurationSec(buffer);
    if (secs !== null && secs > DPP_VIDEO_MAX_SECONDS) {
      // El número que se le dice al alumno es el que la pantalla le pidió (30 s), no el umbral
      // interno con margen (40 s): leer "el máximo es 40s" después de que se le pidieran 30
      // solo genera la duda de cuál de los dos es verdad.
      throw new Error(`El vídeo dura ${Math.round(secs)}s; el máximo son ${DPP_VIDEO_TARGET_SECONDS} segundos`);
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
