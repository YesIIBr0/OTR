// OTR · Admisión — allowlist de entrada, reglas de edad y forma de salida [ADM · plan
// docs/superpowers/plans/2026-08-10-onboarding-admision.md].
//
// Mismo contrato que app/api/highlights/input.ts: la ruta NUNCA pasa el body crudo a Prisma
// (bloquea mass-assignment de studentId/status/*CompletedAt); aquí se recorta, se valida y se
// devuelve SOLO lo permitido. Vive junto a las rutas porque el reparto acota este agente a
// app/api/admission/**.
//
// El formulario recoge datos personales de MENORES y la firma de su tutor: todo lo que no se
// use se deja fuera a propósito (ver el reporte de la tarea para lo que se descartó y por qué).
import { clean, safeUrl } from "../../lib/api";
import { esc } from "../../lib/esc";

// ============================================================
//  Reglas de edad — DOS umbrales distintos que NO se mezclan
// ============================================================

/** Política de la academia: por debajo de esta edad el formulario EXIGE datos del tutor. */
export const GUARDIAN_AGE = 21;
/** Ley/COPPA: por debajo de esta edad el alumno es MENOR (User.ageBand) y aplican las
 *  protecciones de privacidad (fuera del ranking público, Safety Gate, Guardianship…).
 *  Pedirle tutor a un chico de 19 NO lo convierte en menor. */
export const MINOR_AGE = 18;

/** Edad exacta a partir de la fecha COMPLETA de nacimiento (no del año, como el registro). */
export function ageFromBirthDate(birth: Date, now: Date = new Date()): number {
  // La fecha de nacimiento se guarda en componentes UTC (ver FECHA CIVIL en parseBirthDate),
  // así que se compara en UTC: mezclarlo con componentes locales devolvería una edad distinta
  // según la zona del servidor, y de esta edad depende si se exige tutor y si es menor.
  let age = now.getUTCFullYear() - birth.getUTCFullYear();
  const m = now.getUTCMonth() - birth.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < birth.getUTCDate())) age--;
  return age;
}

// ============================================================
//  Consentimiento — TEXTO EXACTO + VERSIÓN (evidencia legal)
// ============================================================

/* [FUENTE ÚNICA] El clausulado y su versión viven en app/lib/consent.ts porque la PANTALLA
   que se lo enseña a la familia también los necesita. Se re-exportan aquí para que todo lo
   que ya importaba desde este módulo siga funcionando, pero el texto se edita en un solo
   sitio: enseñar uno y registrar otro invalidaría la evidencia. */
export {
  CONSENT_VERSION,
  CONSENT_TEXT_DATA,
  CONSENT_TEXT_GUARDIAN,
  CONSENT_KIND_DATA,
  CONSENT_KIND_GUARDIAN,
} from "../../lib/consent";

// ============================================================
//  Los 4 pasos (orden fijo — se completan en secuencia)
// ============================================================

export const ADMISSION_STEPS = [
  { n: 1, key: "form", field: "formCompletedAt", label: "Formulario de Admisión" },
  { n: 2, key: "call", field: "callCompletedAt", label: "Llamada de Descubrimiento" },
  { n: 3, key: "community", field: "communityCompletedAt", label: "Comunidad de WhatsApp" },
  { n: 4, key: "video", field: "videoCompletedAt", label: "Documentar tu Punto de Partida" },
] as const;

export const TOTAL_STEPS = ADMISSION_STEPS.length;

// ============================================================
//  Allowlists de los desplegables del formulario
// ============================================================

export const GRADE_LEVELS = ["SECUNDARIA", "BACHILLERATO", "UNIVERSIDAD", "GRADUADO"] as const;
export const GUARDIAN_RELATIONS = ["PADRE_MADRE", "TUTOR_LEGAL", "TUTOR"] as const;
export const PROGRAMS = ["DEBATE_COMPETITIVO", "ORATORIA", "TALLER_INTENSIVO"] as const;
export const PREFERRED_DAYS = ["LUN_MIE", "MAR_JUE", "OTRO"] as const;

const pick = (v: unknown, allowed: readonly string[]): string | null => {
  const s = clean(v, 40).toUpperCase();
  return allowed.includes(s) ? s : null;
};

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * "YYYY-MM-DD" → Date al MEDIODÍA local. Mediodía y no medianoche por lo mismo que
 * parseHighlightDate: la fecha se re-lee con componentes locales y en RD (UTC-4) una
 * medianoche UTC se leería como el día anterior. Basura → null.
 */
export function parseBirthDate(v: unknown): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(clean(v, 16));
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  // [FECHA CIVIL] Mediodía UTC, no local. Una fecha de nacimiento no es un instante: es un día
  // del calendario. Guardarla con componentes locales la ata a la zona de quien la escribe, y
  // aquí el desarrollo corre en UTC-4 mientras el servidor corre en UTC — el mismo dato leído
  // en el otro lado se corría un día. El mediodía deja 12 h de margen a cada lado, así que
  // ninguna zona del mundo cruza de día, y `new Date("YYYY-MM-DD")` (medianoche UTC, que es
  // como llega un dato importado o un fixture) también aterriza en el día correcto al leerlo.
  const date = new Date(Date.UTC(y, mo - 1, d, 12, 0, 0, 0));
  // Rechaza fechas que el Date "corrige" sola (31 de febrero → 3 de marzo).
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d) return null;
  return date;
}

/** Date → "YYYY-MM-DD" en componentes UTC (round-trip exacto de parseBirthDate, sea cual sea
 *  la zona del servidor). Ver la nota de FECHA CIVIL en parseBirthDate. */
export function birthDateISO(d?: Date | string | null): string {
  if (!d) return "";
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${date.getUTCFullYear()}-${p(date.getUTCMonth() + 1)}-${p(date.getUTCDate())}`;
}

/**
 * Teléfono móvil / WhatsApp. El formulario es de RD (bandera 🇩🇴 fija en el mockup), así que
 * un número local de 10 dígitos con NANP dominicano (809/829/849) se normaliza a E.164
 * (+1809…) — el formato que necesita cualquier envío por WhatsApp. Se admite además un
 * internacional explícito con "+" para la familia que vive fuera. Cualquier otra cosa → null.
 */
const RD_AREA = ["809", "829", "849"];
export function normalizePhone(v: unknown): string | null {
  const raw = clean(v, 40);
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10 && RD_AREA.includes(digits.slice(0, 3))) return `+1${digits}`;
  if (digits.length === 11 && digits[0] === "1" && RD_AREA.includes(digits.slice(1, 4))) return `+${digits}`;
  if (raw.startsWith("+") && digits.length >= 8 && digits.length <= 15) return `+${digits}`;
  return null;
}

/**
 * Vídeo DPP del paso 4. El archivo lo sube /api/uploads (que acepta bastante más que vídeo:
 * PDF, audio, imágenes, Office), así que además de safeUrl —la política de la casa: sin
 * javascript:/data:— se exige que una ruta /uploads/ tenga extensión de VÍDEO. Un PDF metido
 * aquí no se reproduce: le deja un reproductor roto al coach. Mismo criterio que
 * safeHighlightImageUrl. Las https externas quedan fuera a propósito: el DPP se graba y se
 * guarda en la plataforma (así lo dice el mockup: "Todo se graba y guarda aquí").
 */
const VIDEO_EXT = /\.(mp4|webm|mov|m4v|ogg)$/i;
export function safeDppVideoUrl(v: unknown, max = 2000): string | null {
  const s = safeUrl(v, max);
  if (!s) return null;
  if (!/^\/uploads\//i.test(s)) return null;
  const pathOnly = s.split("?")[0].split("#")[0];
  return VIDEO_EXT.test(pathOnly) ? s : null;
}

// ============================================================
//  Paso 1 — saneado y validación del formulario (en SERVIDOR)
// ============================================================

/** Columnas de Admission escribibles desde el formulario. Ni status ni *CompletedAt: los fija la ruta. */
export interface AdmissionFormData {
  birthDate: Date;
  phone: string;
  school: string | null;
  gradeLevel: string | null;
  guardianName: string | null;
  guardianDocument: string | null;
  guardianRelation: string | null;
  guardianPhone: string | null;
  guardianEmail: string | null;
  guardianSignature: string | null;
  guardianSignedAt: Date | null;
  program: string | null;
  priorExperience: boolean | null;
  preferredDays: string | null;
}

export interface CleanedForm {
  /** null si hay error. */
  data: AdmissionFormData | null;
  error: string | null;
  /** Derivados de la fecha de nacimiento — los usa la ruta para User y para Guardianship. */
  age: number;
  isMinor: boolean;
  needsGuardian: boolean;
  /** Nombre y apellido: NO se guardan en Admission (User.name es el dueño del dato). */
  firstName: string;
  lastName: string;
}

const fail = (error: string): CleanedForm => ({
  data: null, error, age: 0, isMinor: false, needsGuardian: false, firstName: "", lastName: "",
});

/**
 * Valida el formulario COMPLETO en servidor (el cliente valida por comodidad, no por
 * seguridad). Obligatorio = lo que el mockup marca con asterisco (nombre, apellido, fecha de
 * nacimiento, teléfono) + el consentimiento + el bloque de tutor cuando la edad lo exige.
 * El correo NO entra: es la identidad de la sesión y no se cambia desde un formulario de
 * admisión. Institución, nivel, programa, experiencia y días son opcionales, igual que en el
 * mockup.
 */
export function cleanAdmissionForm(body: Record<string, unknown>, now: Date = new Date()): CleanedForm {
  const b = body || {};

  const firstName = clean(b.firstName, 60);
  const lastName = clean(b.lastName, 60);
  if (firstName.length < 2) return fail("Escribe tu nombre");
  if (lastName.length < 2) return fail("Escribe tu apellido");

  const birthDate = parseBirthDate(b.birthDate);
  if (!birthDate) return fail("Fecha de nacimiento inválida (formato AAAA-MM-DD)");
  const age = ageFromBirthDate(birthDate, now);
  // Mismos límites de cordura que el registro (5-100 años). El corte COPPA de <14 vive en el
  // REGISTRO, donde todavía no hay cuenta: repetirlo aquí dejaría a un alumno ya registrado
  // encerrado sin admisión y sin salida. Ver el reporte de la tarea.
  if (age < 5 || age > 100) return fail("Fecha de nacimiento inválida");

  const phone = normalizePhone(b.phone);
  if (!phone) return fail("Teléfono inválido (ej: 809 555 0123)");

  const isMinor = age < MINOR_AGE;
  const needsGuardian = age < GUARDIAN_AGE;

  let guardianName: string | null = null;
  let guardianDocument: string | null = null;
  let guardianRelation: string | null = null;
  let guardianPhone: string | null = null;
  let guardianEmail: string | null = null;
  let guardianSignature: string | null = null;
  let guardianSignedAt: Date | null = null;

  if (needsGuardian) {
    guardianName = clean(b.guardianName, 120);
    if (guardianName.length < 2) return fail("Escribe el nombre completo del padre, madre o tutor");
    guardianDocument = clean(b.guardianDocument, 40);
    if (guardianDocument.length < 5) return fail("Escribe la cédula o el pasaporte del tutor");
    guardianRelation = pick(b.guardianRelation, GUARDIAN_RELATIONS);
    if (!guardianRelation) return fail("Indica la relación del tutor con el estudiante");
    guardianPhone = normalizePhone(b.guardianPhone);
    if (!guardianPhone) return fail("Teléfono del tutor inválido (ej: 809 555 0123)");
    guardianSignature = clean(b.guardianSignature, 120);
    if (guardianSignature.length < 2) return fail("Falta la firma del tutor (su nombre completo)");
    // Opcional y FUERA del mockup: sin un correo no hay forma de alcanzar a un User(PARENT),
    // y sin eso el vínculo Guardianship que ya existe en la plataforma nunca se puede crear.
    const email = clean(b.guardianEmail, 160).toLowerCase();
    if (email) {
      if (!EMAIL_RE.test(email)) return fail("Correo del tutor inválido");
      guardianEmail = email;
    }
    guardianSignedAt = now;
  }

  // El consentimiento NO es opcional: sin él no se puede tratar el dato (menos aún el de un
  // menor). Se exige explícitamente `true`, no un valor "truthy" cualquiera.
  if (b.consent !== true) return fail("Debes aceptar el consentimiento de datos personales");

  const school = clean(b.school, 160) || null;

  return {
    data: {
      birthDate,
      phone,
      school,
      gradeLevel: pick(b.gradeLevel, GRADE_LEVELS),
      guardianName,
      guardianDocument,
      guardianRelation,
      guardianPhone,
      guardianEmail,
      guardianSignature,
      guardianSignedAt,
      program: pick(b.program, PROGRAMS),
      priorExperience: typeof b.priorExperience === "boolean" ? b.priorExperience : null,
      preferredDays: pick(b.preferredDays, PREFERRED_DAYS),
    },
    error: null,
    age,
    isMinor,
    needsGuardian,
    firstName,
    lastName,
  };
}

// ============================================================
//  Salida — lo que consume el front del wizard
// ============================================================

/** Fila de Admission tal y como sale de Prisma (solo lo que este módulo lee). */
export interface AdmissionRow {
  id: string;
  studentId: string;
  formCompletedAt: Date | null;
  callCompletedAt: Date | null;
  communityCompletedAt: Date | null;
  videoCompletedAt: Date | null;
  status: string;
  completedAt: Date | null;
  birthDate: Date | null;
  phone: string | null;
  school: string | null;
  gradeLevel: string | null;
  guardianName: string | null;
  guardianDocument: string | null;
  guardianRelation: string | null;
  guardianPhone: string | null;
  guardianEmail: string | null;
  guardianSignature: string | null;
  guardianSignedAt: Date | null;
  guardianshipId: string | null;
  program: string | null;
  priorExperience: boolean | null;
  preferredDays: string | null;
  discoveryBookingId: string | null;
  dppVideoUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConsentRow {
  kind: string;
  version: string;
  text: string;
  acceptedByName: string;
  acceptedByRole: string;
  createdAt: Date;
}

const iso = (d?: Date | null) => (d ? new Date(d).toISOString() : null);

/** Timestamp de completado del paso n (o null). */
export function stepCompletedAt(a: AdmissionRow | null, n: number): Date | null {
  const step = ADMISSION_STEPS.find((s) => s.n === n);
  if (!a || !step) return null;
  return (a[step.field] as Date | null) ?? null;
}

/** Regla de ORDEN: el paso n solo se puede tocar si TODOS los anteriores están completos. */
export function previousStepsDone(a: AdmissionRow | null, n: number): boolean {
  for (let i = 1; i < n; i++) if (!stepCompletedAt(a, i)) return false;
  return true;
}

/** Cuántos de los 4 pasos están completos. */
export function doneCount(a: AdmissionRow | null): number {
  return ADMISSION_STEPS.filter((s) => stepCompletedAt(a, s.n)).length;
}

/**
 * Contrato de escape (el mismo que GET /api/highlights y /api/listings?mine=1): el texto
 * libre se escapa UNA vez AQUÍ y el builder lo pinta crudo — nunca se re-escapa. Las URLs
 * salen tal cual porque ya vienen saneadas de la escritura (safeDppVideoUrl).
 */
export function admissionPayload(a: AdmissionRow | null, consents: ConsentRow[] = []) {
  const done = doneCount(a);
  const steps = ADMISSION_STEPS.map((s) => {
    const at = stepCompletedAt(a, s.n);
    return {
      n: s.n,
      key: s.key,
      label: s.label,
      done: !!at,
      // Bloqueado = todavía no le toca (el anterior sigue pendiente). El rail del mockup
      // pinta Completado / En progreso / Pendiente / Bloqueado con esto.
      locked: !previousStepsDone(a, s.n),
      completedAt: iso(at),
    };
  });

  if (!a) {
    // Alumno sin admisión: progreso 0 de 4, sin inventar una fila en la base.
    return {
      exists: false, id: null, status: "IN_PROGRESS",
      stepsDone: 0, totalSteps: TOTAL_STEPS, percent: 0,
      steps, form: null, guardian: null, guardianshipId: null,
      discoveryBookingId: null, dppVideoUrl: null,
      completedAt: null, createdAt: null, updatedAt: null, consents: [],
    };
  }

  return {
    exists: true,
    id: a.id,
    status: a.status,
    stepsDone: done,
    totalSteps: TOTAL_STEPS,
    percent: Math.round((done / TOTAL_STEPS) * 100),
    steps,
    form: {
      birthDateISO: birthDateISO(a.birthDate),
      phone: esc(a.phone || ""),
      school: esc(a.school || ""),
      gradeLevel: a.gradeLevel || "",
      program: a.program || "",
      priorExperience: a.priorExperience,
      preferredDays: a.preferredDays || "",
    },
    guardian: a.guardianName
      ? {
          name: esc(a.guardianName),
          document: esc(a.guardianDocument || ""),
          relation: a.guardianRelation || "",
          phone: esc(a.guardianPhone || ""),
          email: esc(a.guardianEmail || ""),
          signature: esc(a.guardianSignature || ""),
          signedAt: iso(a.guardianSignedAt),
        }
      : null,
    guardianshipId: a.guardianshipId,
    discoveryBookingId: a.discoveryBookingId,
    dppVideoUrl: a.dppVideoUrl || "",
    completedAt: iso(a.completedAt),
    createdAt: iso(a.createdAt),
    updatedAt: iso(a.updatedAt),
    // Evidencia de consentimiento: sale ENTERA (texto exacto + versión + quién + cuándo)
    // para que el coach pueda demostrarla sin abrir la base.
    consents: consents.map((c) => ({
      kind: c.kind,
      version: c.version,
      text: esc(c.text),
      acceptedByName: esc(c.acceptedByName),
      acceptedByRole: c.acceptedByRole,
      acceptedAt: iso(c.createdAt),
    })),
  };
}

/** Quién pregunta. El expediente es de su dueño; los demás reciben una vista recortada. */
export type AdmissionScope = "owner" | "admin" | "coach";

/**
 * [A4 · SEC] MINIMIZACIÓN POR ROL. `admissionPayload` construye el expediente COMPLETO; esta
 * función es la única puerta por la que sale hacia alguien que no es su dueño, y recorta según
 * para qué necesita mirarlo:
 *
 *  · "owner" — el alumno: todo. Es su expediente.
 *  · "admin" — opera la academia (matrícula, supresión, incidencias): progreso, el bloque del
 *      ALUMNO, la evidencia de consentimiento completa y QUIÉN firmó. Lo que NO recibe es el
 *      documento de identidad ni el contacto del TUTOR: el tutor es un tercero que no tiene
 *      sesión aquí, y ningún trámite de la plataforma necesita su cédula circulando por un GET.
 *      Consta que existe (`hasDocument`) — que es lo que hace falta para saber si el expediente
 *      está completo. Si un trámite legal exige el valor, será una superficie aparte y con su
 *      propio rastro en AuditLog, no un campo más de este payload.
 *  · "coach" — da clase: progreso y ESTADO del consentimiento (qué, versión, cuándo, en qué
 *      calidad). Ni teléfono, ni colegio, ni fecha de nacimiento, ni programa, ni el vídeo,
 *      ni una sola línea del tutor. Para dar clase no hace falta nada de eso; el rail de
 *      "quién va a medias" se pinta con `steps`.
 *
 * Se recorta SOBRE el payload completo (no se construye una segunda vez) para que un campo
 * nuevo en `admissionPayload` no se cuele por una rama que nadie actualizó.
 */
export function admissionPayloadFor(
  scope: AdmissionScope,
  a: AdmissionRow | null,
  consents: ConsentRow[] = [],
) {
  const full = admissionPayload(a, consents);
  if (scope === "owner") return full;

  if (scope === "admin") {
    return {
      ...full,
      guardian: full.guardian
        ? {
            ...full.guardian,
            // El valor NO viaja; solo consta que el expediente lo tiene.
            document: "",
            phone: "",
            email: "",
            hasDocument: !!a?.guardianDocument,
          }
        : null,
    };
  }

  // coach
  return {
    ...full,
    form: null,
    guardian: null,
    guardianshipId: null,
    discoveryBookingId: null,
    dppVideoUrl: "",
    // Estado del consentimiento, no su contenido: el texto y el nombre del firmante son
    // evidencia legal, y quien la necesita para demostrar algo es el admin, no el coach.
    consents: full.consents.map((c) => ({
      kind: c.kind,
      version: c.version,
      acceptedByRole: c.acceptedByRole,
      acceptedAt: c.acceptedAt,
    })),
  };
}

/** Iniciales para User.initials — mismo cálculo que el registro. */
export function initialsFor(name: string): string {
  return name.split(/\s+/).map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}
