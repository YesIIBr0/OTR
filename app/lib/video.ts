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

// sanitizeHtml se movió a app/lib/sanitize.ts (usa sanitize-html, parser real y robusto,
// SOLO servidor) para no arrastrar la librería al bundle del cliente, que importa
// videoEmbedHtml desde este módulo. Las rutas API importan sanitizeHtml desde "./sanitize".
