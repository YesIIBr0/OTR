// OTR Academy · Consulta de estrategia gratuita (30 min) — config + helpers puros.
// Reemplaza el Calendly de OTR. Zona horaria fija America/Santo_Domingo (UTC-4, sin DST):
// trabajamos siempre con un offset fijo de -4h, sin librerías externas.

// --- Config de disponibilidad ---
export const TZ_OFFSET = -4; // America/Santo_Domingo, UTC-4 fijo (sin horario de verano)
export const OPEN_HOUR = 9; // ventana local: 09:00
export const CLOSE_HOUR = 18; // …hasta 18:00 (último slot empieza 17:30)
export const SLOT_MIN = 30; // duración de cada slot
export const DURATION_MIN = 30; // duración de la consulta
export const LEAD_HOURS = 12; // no reservar dentro de las próximas 12h
export const HORIZON_DAYS = 30; // hasta 30 días adelante
// Días permitidos: Lun(1)–Sáb(6). Domingo (0) cerrado. En hora LOCAL.
export const OPEN_DOW = new Set([1, 2, 3, 4, 5, 6]);

const MS_HOUR = 3600 * 1000;
const MS_MIN = 60 * 1000;

// ---- Conversión de zona horaria con offset fijo -4h ----

/** Instante UTC (ms) → "partes" de la hora LOCAL (Santo Domingo, UTC-4). */
function utcToLocalParts(utcMs: number) {
  const d = new Date(utcMs + TZ_OFFSET * MS_HOUR);
  // Leemos en UTC sobre la fecha ya desplazada → equivale a la hora local.
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1, // 1–12
    day: d.getUTCDate(),
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes(),
    dow: d.getUTCDay(), // 0 = domingo … 6 = sábado (local)
  };
}

/** Componentes de fecha/hora LOCAL (Santo Domingo) → instante UTC (ms). */
function localToUtcMs(year: number, month1: number, day: number, hour: number, minute: number): number {
  // Date.UTC nos da el instante "como si fuera UTC"; restamos el offset para volver a UTC real.
  const asIfUtc = Date.UTC(year, month1 - 1, day, hour, minute, 0, 0);
  return asIfUtc - TZ_OFFSET * MS_HOUR;
}

/** Parsea "YYYY-MM-DD" → {year, month, day} o null si no es válido. */
function parseDateStr(dateStr: string): { year: number; month: number; day: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateStr || "").trim());
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  // Verifica que la fecha exista realmente (p.ej. rechaza 2026-02-31).
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (probe.getUTCFullYear() !== year || probe.getUTCMonth() !== month - 1 || probe.getUTCDate() !== day) {
    return null;
  }
  return { year, month, day };
}

// ---- Labels en español ----

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

/** Etiqueta de fecha LOCAL: "lun 16 jun". */
export function dateLabel(isoUtc: string | Date): string {
  const utcMs = typeof isoUtc === "string" ? Date.parse(isoUtc) : isoUtc.getTime();
  const p = utcToLocalParts(utcMs);
  return `${DIAS[p.dow]} ${p.day} ${MESES[p.month - 1]}`;
}

/** Etiqueta de hora LOCAL: "9:00 AM" / "5:30 PM". */
export function timeLabel(isoUtc: string | Date): string {
  const utcMs = typeof isoUtc === "string" ? Date.parse(isoUtc) : isoUtc.getTime();
  const p = utcToLocalParts(utcMs);
  return formatTime(p.hour, p.minute);
}

function formatTime(hour24: number, minute: number): string {
  const ampm = hour24 >= 12 ? "PM" : "AM";
  let h = hour24 % 12;
  if (h === 0) h = 12;
  const mm = String(minute).padStart(2, "0");
  return `${h}:${mm} ${ampm}`;
}

// ---- Rango horizonte (en UTC) ----

/** Límite inferior: ahora + leadHours (ms UTC). */
function leadCutoffMs(now = Date.now()): number {
  return now + LEAD_HOURS * MS_HOUR;
}

/** Límite superior: ahora + horizonDays (ms UTC). */
function horizonCutoffMs(now = Date.now()): number {
  return now + HORIZON_DAYS * 24 * MS_HOUR;
}

// ---- Slots ----

export interface Slot {
  iso: string; // ISO UTC (canónico, sin milisegundos)
  label: string; // "9:00 AM"
}

/**
 * Genera todos los slots de un día (en hora LOCAL Santo Domingo) y los devuelve
 * como ISO UTC + label. NO filtra por disponibilidad ni por leadHours: solo aplica
 * día permitido y rango horizonte (leadHours..horizonDays). El filtrado de reservas
 * ocupadas se hace en el endpoint. Día cerrado/fuera de rango → [].
 */
export function computeSlotsForDate(dateStr: string, now = Date.now()): Slot[] {
  const parsed = parseDateStr(dateStr);
  if (!parsed) return [];

  // ¿Es un día permitido? Tomamos el día-de-semana local del mediodía (estable).
  const noonUtc = localToUtcMs(parsed.year, parsed.month, parsed.day, 12, 0);
  const dow = utcToLocalParts(noonUtc).dow;
  if (!OPEN_DOW.has(dow)) return [];

  const lead = leadCutoffMs(now);
  const horizon = horizonCutoffMs(now);

  const slots: Slot[] = [];
  for (let hour = OPEN_HOUR; hour < CLOSE_HOUR; hour++) {
    for (let minute = 0; minute < 60; minute += SLOT_MIN) {
      const utcMs = localToUtcMs(parsed.year, parsed.month, parsed.day, hour, minute);
      // Fuera del rango reservable → se omite.
      if (utcMs < lead || utcMs > horizon) continue;
      slots.push({ iso: new Date(utcMs).toISOString().replace(/\.\d{3}Z$/, "Z"), label: formatTime(hour, minute) });
    }
  }
  return slots;
}

/**
 * Valida un ISO UTC como slot reservable: parsea, cae en la ventana 09:00–18:00 local
 * en un día permitido, alineado a 30 min, y dentro de leadHours..horizonDays.
 */
export function isValidSlot(isoUtc: string, now = Date.now()): boolean {
  const utcMs = Date.parse(String(isoUtc || ""));
  if (Number.isNaN(utcMs)) return false;

  // Dentro del rango horizonte.
  if (utcMs < leadCutoffMs(now) || utcMs > horizonCutoffMs(now)) return false;

  const p = utcToLocalParts(utcMs);
  // Día permitido (Lun–Sáb).
  if (!OPEN_DOW.has(p.dow)) return false;
  // Alineado a 30 min y segundos exactos (sin desfase).
  if (p.minute !== 0 && p.minute !== 30) return false;
  if (utcMs % MS_MIN !== 0) return false;
  // Dentro de la ventana: el último slot válido empieza a las 17:30 (< 18:00).
  if (p.hour < OPEN_HOUR || p.hour >= CLOSE_HOUR) return false;

  return true;
}

/** Inicio de día LOCAL (Santo Domingo) en UTC, para "el día de" un slot. */
export function localDayStartUtcMs(isoUtc: string | Date): number {
  const utcMs = typeof isoUtc === "string" ? Date.parse(isoUtc) : isoUtc.getTime();
  const p = utcToLocalParts(utcMs);
  return localToUtcMs(p.year, p.month, p.day, 0, 0);
}

/** Rango [inicio, fin) en UTC del día LOCAL al que pertenece dateStr ("YYYY-MM-DD"). */
export function localDayRangeUtc(dateStr: string): { startUtc: Date; endUtc: Date } | null {
  const parsed = parseDateStr(dateStr);
  if (!parsed) return null;
  const startMs = localToUtcMs(parsed.year, parsed.month, parsed.day, 0, 0);
  const endMs = startMs + 24 * MS_HOUR;
  return { startUtc: new Date(startMs), endUtc: new Date(endMs) };
}
