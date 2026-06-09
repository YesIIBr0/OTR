// OTR LMS · utilidades de video/contenido. Módulo PURO (sin BD): se usa en el servidor
// (API, para validar/sanitizar) y en el cliente (pantallas, para construir el embed).
// YouTube no requiere llaves. Cloudflare funciona con el UID público; con llaves se puede
// firmar la reproducción (follow-up).

const KINDS = new Set(["none", "youtube", "cloudflare"]);

export function normalizeKind(kind: unknown): string {
  const k = String(kind ?? "none").trim().toLowerCase();
  return KINDS.has(k) ? k : "none";
}

/** Extrae el ID de 11 chars de cualquier forma de URL/ID de YouTube; null si no matchea. */
export function parseYouTubeId(src: unknown): string | null {
  const s = String(src ?? "").trim();
  if (!s) return null;
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s; // ID pelado
  const m = s.match(/(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

export function ytEmbedUrl(src: unknown): string | null {
  const id = parseYouTubeId(src);
  return id ? `https://www.youtube.com/embed/${id}` : null;
}

/** Valida el UID de Cloudflare Stream (alfanumérico); null si inválido. */
export function cfUid(src: unknown): string | null {
  const s = String(src ?? "").trim();
  return /^[A-Za-z0-9]+$/.test(s) ? s : null;
}

export function cfEmbedUrl(uid: string): string {
  const sub = process.env.CLOUDFLARE_CUSTOMER_SUBDOMAIN; // undefined en cliente / sin llaves
  return sub
    ? `https://customer-${sub}.cloudflarestream.com/${uid}/iframe`
    : `https://iframe.videodelivery.net/${uid}`; // iframe público genérico (funciona con solo el UID)
}

/** Normaliza/valida videoSrc según proveedor; devuelve el valor limpio o null. (Servidor) */
export function normalizeVideoSrc(kind: unknown, src: unknown): string | null {
  const k = normalizeKind(kind);
  if (k === "youtube") return parseYouTubeId(src); // guarda el ID limpio
  if (k === "cloudflare") return cfUid(src); // guarda el UID limpio
  return null;
}

/** HTML del iframe embebido. El src SIEMPRE apunta a dominios fijos (no inyectable). '' si no hay video. */
export function videoEmbedHtml(kind: unknown, src: unknown): string {
  const k = normalizeKind(kind);
  const frame = (url: string, allow: string) =>
    `<iframe src="${url}" loading="lazy" style="position:absolute;inset:0;width:100%;height:100%;border:0" allow="${allow}" allowfullscreen></iframe>`;
  if (k === "youtube") {
    const url = ytEmbedUrl(src);
    if (url) return frame(url, "accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture");
  }
  if (k === "cloudflare") {
    const uid = cfUid(src);
    if (uid) return frame(cfEmbedUrl(uid), "accelerometer;gyroscope;autoplay;encrypted-media;picture-in-picture");
  }
  return "";
}

/**
 * Sanitización conservadora de contentHtml — se aplica en SERVIDOR antes de persistir,
 * de modo que el cliente puede inyectarlo por innerHTML con seguridad. Allowlist de tags;
 * elimina script/iframe/style, atributos on*, style=, y href/src con javascript:/data:.
 */
const ALLOWED_TAGS = new Set([
  "P", "B", "STRONG", "I", "EM", "U", "H2", "H3", "H4", "UL", "OL", "LI", "BR", "A", "BLOCKQUOTE", "CODE", "PRE", "SPAN", "DIV",
]);
export function sanitizeHtml(html: unknown): string | null {
  let s = String(html ?? "");
  if (!s.trim()) return null;
  // 1) eliminar bloques peligrosos completos (con o sin cierre)
  s = s.replace(/<\s*(script|style|iframe|object|embed|link|meta|svg|math|form)[\s\S]*?<\/\s*\1\s*>/gi, "");
  s = s.replace(/<\s*\/?\s*(script|style|iframe|object|embed|link|meta|svg|math|form)[^>]*>/gi, "");
  // 2) quitar manejadores on*=, style= y javascript:/data: en href/src
  s = s.replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  s = s.replace(/\sstyle\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  s = s.replace(/(href|src)\s*=\s*("|')\s*(javascript|data|vbscript):[^"']*\2/gi, '$1="#"');
  // 3) eliminar tags fuera de la allowlist (conserva su contenido de texto)
  s = s.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g, (m, tag) =>
    ALLOWED_TAGS.has(String(tag).toUpperCase()) ? m : "");
  s = s.trim().slice(0, 20000);
  return s || null;
}
