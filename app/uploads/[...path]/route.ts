// Sirve los archivos subidos (que viven FUERA de public/, en UPLOAD_DIR).
// Seguridad: requiere sesión; valida el path (sin traversal); fuerza X-Content-Type-Options
// nosniff; sólo muestra inline tipos seguros (imágenes/audio/video/pdf) — el resto se
// descarga como adjunto octet-stream (neutraliza SVG/HTML con script: H4/m27/l11).
// Rendimiento: streaming con createReadStream (memoria constante) + soporte de Range
// requests (206 Partial Content) para permitir seek de audio/video sin cargar todo en RAM.
import { stat } from "fs/promises";
import { createReadStream } from "fs";
import { Readable } from "stream";
import path from "path";
import { getSessionUser } from "../../lib/auth";
import { db } from "../../lib/db";
import { UPLOAD_DIR } from "../../lib/uploads";

// Tipos que pueden mostrarse inline de forma segura.
const INLINE_OK = new Set<string>([
  "image/png", "image/jpeg", "image/gif", "image/webp",
  "audio/mpeg", "audio/wav", "audio/ogg", "audio/webm",
  "video/mp4", "video/webm", "video/quicktime",
  "application/pdf",
]);

function notFound() {
  return new Response("No encontrado", { status: 404 });
}

// Convierte un Node ReadStream en un ReadableStream web para pasarlo a Response.
function toWebStream(nodeStream: ReturnType<typeof createReadStream>): ReadableStream<Uint8Array> {
  return Readable.toWeb(nodeStream) as unknown as ReadableStream<Uint8Array>;
}

export async function GET(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const user = await getSessionUser();
  if (!user) return new Response("No autenticado", { status: 401 });

  const { path: parts } = await ctx.params;
  const requested = Array.isArray(parts) ? parts.join("/") : String(parts || "");
  const base = path.basename(requested);
  // Sólo un nombre de archivo plano (sin subrutas ni traversal).
  if (!base || base !== requested || base.includes("..") || base.startsWith(".")) return notFound();

  const full = path.join(UPLOAD_DIR, base);
  // Defensa extra: el path resuelto debe quedar dentro de UPLOAD_DIR.
  const rel = path.relative(UPLOAD_DIR, full);
  if (rel.startsWith("..") || path.isAbsolute(rel)) return notFound();

  let size: number;
  try {
    const st = await stat(full);
    if (!st.isFile()) return notFound();
    size = st.size;
  } catch {
    return notFound();
  }

  // Tipo/nombre desde la fila Upload (confiable: validado al subir).
  const row = await db.upload.findFirst({ where: { filename: base } });
  const mime = row && INLINE_OK.has(row.mime) ? row.mime : "application/octet-stream";
  const disposition = INLINE_OK.has(mime) ? "inline" : "attachment";
  const downloadName = (row?.original || base).replace(/[\r\n"]/g, "");

  // Cabeceras comunes (seguridad + cache). Accept-Ranges anuncia soporte de seek.
  const baseHeaders: Record<string, string> = {
    "Content-Type": mime,
    "Content-Disposition": `${disposition}; filename="${encodeURIComponent(downloadName)}"`,
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "private, max-age=3600",
    "Accept-Ranges": "bytes",
  };

  // ¿Pidió un rango el cliente (audio/video con seek)? Sólo soportamos "bytes=".
  const rangeHeader = req.headers.get("range");
  if (rangeHeader) {
    // Formato esperado: "bytes=start-end" (start o end pueden faltar; soportamos suffix).
    const m = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
    if (m && (m[1] !== "" || m[2] !== "")) {
      let start: number;
      let end: number;
      if (m[1] === "") {
        // Sufijo: últimos N bytes ("bytes=-500").
        const suffix = parseInt(m[2], 10);
        if (!Number.isFinite(suffix) || suffix <= 0) {
          return rangeNotSatisfiable(size);
        }
        start = Math.max(size - suffix, 0);
        end = size - 1;
      } else {
        start = parseInt(m[1], 10);
        end = m[2] === "" ? size - 1 : parseInt(m[2], 10);
      }

      // Validación del rango: dentro de límites y bien formado.
      if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= size) {
        return rangeNotSatisfiable(size);
      }
      if (end >= size) end = size - 1;

      const chunkSize = end - start + 1;
      const nodeStream = createReadStream(full, { start, end });
      return new Response(toWebStream(nodeStream), {
        status: 206,
        headers: {
          ...baseHeaders,
          "Content-Range": `bytes ${start}-${end}/${size}`,
          "Content-Length": String(chunkSize),
        },
      });
    }
    // Rango no parseable: ignorar y servir el archivo completo (200), como hacen los navegadores.
  }

  // Respuesta completa (200) por streaming: memoria constante, sin cargar el archivo entero.
  const nodeStream = createReadStream(full);
  return new Response(toWebStream(nodeStream), {
    status: 200,
    headers: {
      ...baseHeaders,
      "Content-Length": String(size),
    },
  });
}

// 416: el rango pedido no es satisfacible. Content-Range indica el tamaño total.
function rangeNotSatisfiable(size: number) {
  return new Response("Rango no satisfacible", {
    status: 416,
    headers: {
      "Content-Range": `bytes */${size}`,
      "Accept-Ranges": "bytes",
    },
  });
}
