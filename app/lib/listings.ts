// OTR · Marketplace abierto — taxonomía + allowlist COMPARTIDA [F-MKT M1].
// Una sola fuente de verdad entre /api/listings (create) y /api/listings/[id] (patch),
// mismo contrato que lib/tournaments.ts: NUNCA se copia el body crudo (anti mass-assignment
// de id/teacherId/status). La taxonomía es CURADA (decisión §3.1 del spec, default
// reversible): añadir una categoría = añadir un slug aquí + sus labels i18n — sin migración.
import { clean } from "./api";

// Slugs de categoría (el servidor guarda el slug; los labels ES/EN viven en i18n-keys).
export const LISTING_CATEGORIES = [
  "debate", "oratoria", "ingles", "matematicas", "ciencias", "programacion", "ai", "musica", "otros",
] as const;
const CATEGORY_SET = new Set<string>(LISTING_CATEGORIES);

export const LISTING_STATUS = new Set(["PENDING", "ACTIVE", "PAUSED", "REJECTED"]);
const LANGUAGES = new Set(["es", "en", "es,en"]);
const MODALITIES = new Set(["online", "presencial", "híbrido"]);

// Piso y techo de la tarifa/hora (default reversible §3.4): el piso evita listings basura a
// $0 (y carreras al fondo); el techo evita overflow/absurdos. En centavos.
export const PRICE_MIN_CENTS = 100;
export const PRICE_MAX_CENTS = 100_000_000;

export interface ListingInput {
  category?: string;
  title?: string;
  description?: string;
  priceCentsHour?: number;
  language?: string;
  modality?: string;
}

// Devuelve { data } con SOLO campos válidos presentes, o { error } legible.
// forCreate=true exige los obligatorios; false = patch parcial (solo lo enviado).
export function cleanListingInput(body: ListingInput, forCreate: boolean):
  { data: Record<string, string | number>; error?: never } | { error: string; data?: never } {
  const data: Record<string, string | number> = {};

  if (body.category !== undefined || forCreate) {
    const category = clean(body.category, 40).toLowerCase();
    if (!CATEGORY_SET.has(category)) return { error: "Categoría inválida" };
    data.category = category;
  }
  if (body.title !== undefined || forCreate) {
    const title = clean(body.title, 90);
    if (title.length < 4) return { error: "El título debe tener al menos 4 caracteres" };
    data.title = title;
  }
  if (body.description !== undefined) {
    data.description = clean(body.description, 800);
  }
  if (body.priceCentsHour !== undefined || forCreate) {
    const n = Math.round(Number(body.priceCentsHour));
    if (!Number.isFinite(n) || n < PRICE_MIN_CENTS || n > PRICE_MAX_CENTS) {
      return { error: "Tarifa por hora inválida" };
    }
    data.priceCentsHour = n;
  }
  if (body.language !== undefined) {
    const language = clean(body.language, 10).toLowerCase();
    if (!LANGUAGES.has(language)) return { error: "Idioma inválido" };
    data.language = language;
  }
  if (body.modality !== undefined) {
    const modality = clean(body.modality, 20).toLowerCase();
    if (!MODALITIES.has(modality)) return { error: "Modalidad inválida" };
    data.modality = modality;
  }
  return { data };
}
