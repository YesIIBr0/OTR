// OTR LMS · guardado de archivos reales en disco.
// Se guardan FUERA de public/ (Next no sirve archivos creados en runtime bajo public/
// con `next start` → daban 404). Se sirven por app/uploads/[...path]/route.ts con
// cabeceras seguras (nosniff + Content-Disposition). Defensa en profundidad: valida
// mime + tamaño aquí también, no solo en la ruta.
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { db } from "./db";

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

  const buffer = Buffer.from(await file.arrayBuffer());
  const size = buffer.byteLength;
  if (size <= 0) throw new Error("Archivo vacío");
  if (size > MAX_UPLOAD_BYTES) throw new Error("Archivo demasiado grande (máx 25MB)");

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
