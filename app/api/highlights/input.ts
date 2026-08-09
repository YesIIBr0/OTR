// OTR · "Lo mejor de la temporada" — allowlist de entrada del CRUD de Highlight [RONDA3].
// Mismo contrato que lib/tournaments.ts y lib/listings.ts: la ruta NUNCA pasa el body crudo a
// Prisma (bloquea mass-assignment de id/position/lo-que-sea); aquí se recorta, se valida y se
// devuelve SOLO lo permitido. Vive junto a la ruta (y no en app/lib) porque el reparto de la
// ronda 3 acota este agente a app/api/highlights/**; si se consolida con más superficies de
// highlights, su sitio natural es app/lib/highlights.ts.
import { clean, safeUrl } from "../../lib/api";
import { esc } from "../../lib/esc";
// Solo para el TIPO del argumento de Prisma (ver asHighlightData). `import type` no arrastra
// el cliente a este módulo.
import type { db } from "../../lib/db";

/** Campos escribibles de Highlight. `position` NO es de usuario: lo calcula la ruta. */
export interface HighlightWriteData {
  title?: string;
  category?: string;
  date?: Date | null;
  imageUrl?: string;
  instagramUrl?: string;
  position?: number;
}

/**
 * Enlace de la publicación de Instagram. Parte de safeUrl (la política de la casa: sin
 * javascript:/data:) y ADEMÁS exige https + host de Instagram — mismo criterio que
 * safeVideoUrl con las grabaciones: es una URL que escribe el staff y clican alumnos y
 * familias, así que no puede ser un destino arbitrario (anti-phishing). Devuelve null si
 * no cumple; "" (vacío) se trata como "sin enlace", no como error.
 */
const INSTAGRAM_HOSTS = ["instagram.com", "instagr.am", "cdninstagram.com"];
export function safeInstagramUrl(v: unknown, max = 2000): string | null {
  const s = safeUrl(v, max);
  if (!s) return null;
  try {
    const u = new URL(s);
    if (u.protocol !== "https:") return null;
    const host = u.hostname.toLowerCase();
    return INSTAGRAM_HOSTS.some((h) => host === h || host.endsWith("." + h)) ? s : null;
  } catch {
    return null;
  }
}

/**
 * "YYYY-MM-DD" (lo que emite <input type="date"> del modal del kit) → Date al MEDIODÍA local.
 * Mediodía y no medianoche a propósito: la etiqueta del payload se deriva con getDate() local
 * (queries.ts → fmtDayMonth), así que una medianoche UTC se leería como el día anterior en RD
 * (UTC-4). Cadena vacía o basura → null (el logro queda sin fecha, que el modelo permite).
 */
export function parseHighlightDate(v: unknown): Date | null {
  const s = clean(v, 32);
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0, 0);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Date → "YYYY-MM-DD" en componentes LOCALES (round-trip exacto de parseHighlightDate). */
export function highlightDateISO(d?: Date | string | null): string {
  if (!d) return "";
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

export interface CleanedHighlight {
  data: HighlightWriteData;
  /** true si vino un enlace de Instagram NO vacío que no pasó el saneado → la ruta responde 400. */
  badInstagram: boolean;
}

/**
 * Allowlist. `forCreate` fija los valores por defecto del alta; en PATCH solo entra lo que
 * venga PRESENTE en el body (edición parcial, igual que cleanTournamentInput).
 */
export function cleanHighlightInput(
  body: Record<string, unknown>,
  opts: { forCreate: boolean },
): CleanedHighlight {
  const b = body || {};
  const data: HighlightWriteData = {};
  let badInstagram = false;

  if (opts.forCreate || b.title !== undefined) data.title = clean(b.title, 160);
  if (opts.forCreate || b.category !== undefined) data.category = clean(b.category, 40);
  if (opts.forCreate || b.date !== undefined) data.date = parseHighlightDate(b.date);
  if (opts.forCreate || b.imageUrl !== undefined) data.imageUrl = safeUrl(b.imageUrl) || "";

  if (opts.forCreate || b.instagramUrl !== undefined) {
    const raw = clean(b.instagramUrl, 2000);
    if (!raw) data.instagramUrl = "";
    else {
      const safe = safeInstagramUrl(raw);
      if (safe) data.instagramUrl = safe;
      else badInstagram = true; // no se guarda un enlace que el alumno no debería clicar
    }
  }

  return { data, badInstagram };
}

/** Formatea un valor de Highlight para el rastro de auditoría (antes→después). */
export function fmtHighlightVal(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (v instanceof Date) return highlightDateISO(v);
  return String(v);
}

// [R3 · reparto] `instagramUrl` lo añade al modelo Highlight el agente de la MISMA ronda que
// toca prisma/schema*.prisma + queries.ts. Esta rama no puede tocar el esquema, así que el
// argumento se castea en UN solo punto: con la migración integrada persiste tal cual, y sin
// ella el CRUD sigue compilando.
type HighlightCreateData = Parameters<typeof db.highlight.create>[0]["data"];
export const asHighlightData = (d: HighlightWriteData) => d as unknown as HighlightCreateData;

/** Fila de Highlight tal y como la consume el cliente. */
export interface HighlightRowOut {
  id: string;
  title: string;
  category: string;
  dateISO: string;
  imageUrl: string;
  instagramUrl: string;
  position: number;
}

/**
 * Contrato de escape: title/category se escapan UNA vez AQUÍ (el builder los pinta crudos, y
 * el modal los mete en value="…", donde el navegador los decodifica al valor real para
 * editar) — el mismo contrato que GET /api/listings?mine=1. Las URLs ya vienen saneadas
 * desde la escritura (safeUrl / safeInstagramUrl), así que salen tal cual.
 */
export function highlightRow(h: {
  id: string; title: string; date: Date | null; category: string; imageUrl: string; position: number;
}): HighlightRowOut {
  return {
    id: h.id,
    title: esc(h.title),
    category: esc(h.category),
    dateISO: highlightDateISO(h.date),
    imageUrl: h.imageUrl || "",
    instagramUrl: (h as { instagramUrl?: string }).instagramUrl || "",
    position: h.position,
  };
}
