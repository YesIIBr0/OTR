// OTR · Torneos — allowlist + normalización COMPARTIDA entre /api/tournaments (create) y
// /api/tournaments/[id] (patch). [F6.2] Una sola fuente de verdad para QUÉ campos se aceptan y
// cómo se validan, para que create y update no diverjan. NUNCA copia el body crudo: solo los
// campos escalares del modelo Tournament (bloquea mass-assignment de id/rounds/registrations).
import { clean } from "./api";

// Estados válidos del torneo (mismo vocabulario que el default del schema y la UI).
export const VALID_STATUS = new Set(["UPCOMING", "LIVE", "DONE"]);
// Modalidad reutiliza el vocabulario de cursos; el seed usa online/presencial.
const MODALITIES = ["online", "presencial", "híbrido"];
// Origen: torneo propio de OTR o externo (qualifier de otro circuito).
const SOURCES = ["OTR", "EXTERNAL"];
// Tope defensivo de la cuota (RD$1,000,000 en centavos) — evita números absurdos/overflow.
const ENTRY_MAX_CENTS = 100_000_000;

/** Cuota en centavos: entero ≥ 0 y acotado. Cualquier basura → 0 (gratis). */
export function normalizeEntryCents(v: unknown): number {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(n, ENTRY_MAX_CENTS);
}

/** Fecha de inicio: string parseable → Date; vacío o inválida → null (sin fecha aún). */
export function parseTournamentDate(v: unknown): Date | null {
  const s = clean(v, 40);
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Formatea un valor para el rastro de auditoría antes→después (fecha a YYYY-MM-DD). */
export function fmtTournamentVal(v: unknown): string {
  if (v == null || v === "") return "—";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v);
}

interface CleanOpts {
  /** true = alta (rellena defaults de campos ausentes); false = patch (parcial: solo lo presente). */
  forCreate: boolean;
}

// Forma del objeto que devuelve cleanTournamentInput en modo create (todos los campos presentes).
// El name puede quedar "" (la ruta lo rechaza); tiparlo así deja pasar el create de Prisma, cuyo
// único campo obligatorio es name. Los String? del schema admiten null.
export type TournamentCreateData = {
  name: string;
  format: string;
  ageDivision: string | null;
  region: string | null;
  modality: string;
  source: string;
  status: string;
  entryCents: number;
  startsAt: Date | null;
};

/**
 * Allowlist + validación de la entrada de un torneo.
 *  · forCreate=true  → devuelve el objeto COMPLETO con defaults (name puede quedar "" → la ruta lo rechaza).
 *  · forCreate=false → devuelve solo los campos PRESENTES y válidos (para un update parcial); un campo
 *    con valor no permitido (p. ej. status inventado) se ignora en vez de romper.
 * Los campos peligrosos (id, rounds, registrations, _count, …) NUNCA se leen aquí.
 */
export function cleanTournamentInput(body: Record<string, unknown>, opts: CleanOpts): Record<string, unknown> {
  const { forCreate } = opts;
  const data: Record<string, unknown> = {};
  const has = (k: string) => body[k] !== undefined;

  // name — obligatorio en alta; en patch nunca se vacía (string no vacía o se ignora).
  if (forCreate || has("name")) {
    const name = clean(body.name, 120);
    if (forCreate) data.name = name; // puede quedar "" → la ruta de create lo rechaza
    else if (name) data.name = name;
  }
  if (forCreate || has("format")) {
    const format = clean(body.format, 24);
    if (forCreate) data.format = format || "PF";
    else if (format) data.format = format;
  }
  if (forCreate || has("ageDivision")) {
    data.ageDivision = clean(body.ageDivision, 32) || null;
  }
  if (forCreate || has("region")) {
    data.region = clean(body.region, 64) || null;
  }
  if (forCreate || has("modality")) {
    const m = clean(body.modality, 24).toLowerCase();
    if (MODALITIES.includes(m)) data.modality = m;
    else if (forCreate) data.modality = "online";
  }
  if (forCreate || has("source")) {
    const s = clean(body.source, 16).toUpperCase();
    if (SOURCES.includes(s)) data.source = s;
    else if (forCreate) data.source = "OTR";
  }
  if (forCreate || has("status")) {
    const s = clean(body.status, 16).toUpperCase();
    if (VALID_STATUS.has(s)) data.status = s;
    else if (forCreate) data.status = "UPCOMING";
  }
  if (forCreate || has("entryCents")) {
    data.entryCents = normalizeEntryCents(body.entryCents);
  }
  if (forCreate || has("startsAt")) {
    data.startsAt = parseTournamentDate(body.startsAt);
  }
  return data;
}
