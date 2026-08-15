// OTR LMS · funciones de consulta — leen de la base de datos (Prisma).
import { db } from "./db";
import { esc } from "./esc";
import { cached } from "./cache";
import { safeUrl } from "./api";
// [GOAL A2 · F2] Los labels de fecha del payload ya NO se arman con tablas en español
// fijo (consultations.ts / MONTHS_ES local): se delegan a los formateadores de i18n.ts,
// que reciben el idioma de la request (cookie otr_lang → getAppData(email, lang)).
import { fmtDateTimeRD, fmtDayMonth, fmtMonthYear, fmtMonthFull, fmtMemberSinceLabel, fmtPlanSinceLabel, fmtRelativeAgo, fmtClockRD } from "./i18n";

const ME_EMAIL = "analia.reyes@otr.do";

// Etiqueta de fecha relativa ("hace 2 h" / "2 h ago"). [DEUDA-H] La implementación vive
// ahora en i18n.ts (fmtRelativeAgo) porque también la necesitan /api/notifications y
// /api/messages para derivar la etiqueta del timestamp en vez de servir el texto guardado.
// Se conserva el nombre local para no tocar los seis call-sites de este archivo.
const whenLabel = fmtRelativeAgo;

// Día calendario en hora RD (UTC-4) como entero, para comparar actividad por día.
const RD_OFFSET_MS = -4 * 3600000;
function dayNumRD(d: Date): number {
  const dt = d instanceof Date ? d : new Date(d);
  return Math.floor((dt.getTime() + RD_OFFSET_MS) / 86400000);
}

// [GAMIFICATION-2 §9] Racha REAL y NO predatoria, derivada del ledger (ActivityEvent).
// Cuenta días consecutivos con actividad y tolera UN día perdido (grace/freeze): un solo
// hueco no rompe la racha; dos días seguidos sin actividad sí. Se calcula EN LECTURA (no
// un contador almacenado que castiga un olvido reiniciándose a 0 — eso sería predatorio).
function computeStreak(events: Array<{ createdAt: Date }>): number {
  if (!events || !events.length) return 0;
  const active = new Set(events.map((e) => dayNumRD(e.createdAt)));
  const today = Math.floor((Date.now() + RD_OFFSET_MS) / 86400000);
  // La racha está viva solo si hubo actividad hoy o ayer.
  let cursor = active.has(today) ? today : active.has(today - 1) ? today - 1 : null;
  if (cursor === null) return 0;
  let streak = 0, graceUsed = false;
  while (cursor >= today - 400) {
    if (active.has(cursor)) { streak++; cursor--; }
    else if (!graceUsed) { graceUsed = true; cursor--; } // perdona un único hueco (freeze)
    else break;
  }
  return streak;
}

// [DASHBOARD-ACCESS-2 §4] Estado de ciclo de vida para adaptar el dashboard al usuario:
//   new       — sin actividad aún (recién registrado / sin placement).
//   active    — actividad en los últimos 2 días.
//   returning — volvió tras 3-13 días fuera.
//   lapsed    — 14+ días sin actividad ("bienvenido de nuevo").
function lifecycleState(events: Array<{ createdAt: Date }>, isNew: boolean): { state: string; daysAway: number | null } {
  if (isNew || !events || !events.length) return { state: "new", daysAway: null };
  const today = Math.floor((Date.now() + RD_OFFSET_MS) / 86400000);
  const last = Math.max(...events.map((e) => dayNumRD(e.createdAt)));
  const daysAway = today - last;
  const state = daysAway >= 14 ? "lapsed" : daysAway >= 3 ? "returning" : "active";
  return { state, daysAway };
}

/* ============================================================================
   [ADM] ADMISIÓN — progreso de los 4 pasos (plan 2026-08-10-onboarding-admision).
   Los pasos se completan EN ORDEN: 1 formulario · 2 llamada de descubrimiento ·
   3 comunidad (WhatsApp) · 4 vídeo DPP. La fuente es el modelo `Admission` (A0), que
   guarda un timestamp por paso — null = pendiente.

   Esta reducción es PURA (no toca la DB) para poder testearla directo, igual que
   computeRosterMetrics. La consumen las TRES vistas: el alumno (enrutado al wizard),
   el coach (progreso de su roster) y el admin (plataforma + consentimiento).

   PRIVACIDAD: aquí NO entra ni un dato personal del formulario. El `select` de las
   consultas (ver ADMISSION_SELECT) trae SOLO timestamps; el nombre/cédula/teléfono
   del tutor, la fecha de nacimiento, el colegio y la URL del vídeo NUNCA salen de la
   base hacia el payload de nadie. El consentimiento viaja como BOOLEANO, no como texto.
   ============================================================================ */
export const ADMISSION_STEPS = ["form", "call", "community", "video"] as const;
export type AdmissionStepKey = (typeof ADMISSION_STEPS)[number];

/** Fila de `Admission` tal como la lee este archivo: solo lo que hace falta para el progreso. */
export interface AdmissionRow {
  formCompletedAt?: Date | string | null;
  callCompletedAt?: Date | string | null;
  communityCompletedAt?: Date | string | null;
  videoCompletedAt?: Date | string | null;
  completedAt?: Date | string | null;
  status?: string | null;
  guardianSignedAt?: Date | string | null;
}

export interface AdmissionProgress {
  /** Un booleano por paso, en el orden del wizard. */
  steps: Record<AdmissionStepKey, boolean>;
  done: number;     // pasos cerrados (0-4)
  total: number;    // 4
  pct: number;      // 0-100, redondeado
  step: number;     // el paso que TOCA (1-4); con la admisión completa se queda en 4
  complete: boolean;
  /** Consentimientos como BOOLEANO (jamás el texto ni la firma). */
  consent: { data: boolean; guardian: boolean };
}

/**
 * Reduce una fila de `Admission` (o su ausencia) al progreso que consume la UI.
 * Sin fila = alumno recién registrado: 0 de 4, toca el paso 1.
 *
 * `step` es el PRIMER paso pendiente, no `done + 1`: si alguien cerrara el 1 y el 3, lo que
 * toca sigue siendo el 2. `complete` exige los CUATRO timestamps — no se fía de `status`,
 * que es un derivado materializado para filtrar y podría quedarse atrás.
 *
 * El consentimiento de datos se deriva de `formCompletedAt`: el paso 1 no se puede enviar sin
 * aceptarlo (es campo obligatorio del formulario), y la evidencia literal vive en
 * AdmissionConsent, que este archivo NO lee a propósito (el texto aceptado no es dato de
 * pantalla). La firma del tutor sí tiene columna propia con su fecha.
 */
export function admissionProgress(row?: AdmissionRow | null): AdmissionProgress {
  const at = (v: Date | string | null | undefined): boolean => v != null && v !== "";
  const steps = {
    form: at(row?.formCompletedAt),
    call: at(row?.callCompletedAt),
    community: at(row?.communityCompletedAt),
    video: at(row?.videoCompletedAt),
  } as Record<AdmissionStepKey, boolean>;
  const done = ADMISSION_STEPS.filter((k) => steps[k]).length;
  const total = ADMISSION_STEPS.length;
  const firstPending = ADMISSION_STEPS.findIndex((k) => !steps[k]);
  const complete = firstPending === -1;
  return {
    steps,
    done,
    total,
    pct: Math.round((done / total) * 100),
    step: complete ? total : firstPending + 1,
    complete,
    consent: { data: steps.form, guardian: at(row?.guardianSignedAt) },
  };
}

// [BUG-ROSTER-REAL] La analítica del roster del coach (grade/attendance/engagement/trend/
// risk) vivía en columnas Enrollment con @default sembrado (0/"Medio"/"flat"/false) que NUNCA
// se recalculaban → el panel del profesor mostraba datos de seed, no la realidad del alumno.
// Esta función PURA reduce señales REALES (ya agregadas en batch por getAppData, sin N+1: ver
// rosterGradeAgg/rosterQuizRows/rosterBookingAgg/rosterProgressRows/rosterLastEventAgg/
// rosterRecentEvents) a la forma que consumen scr-teacher.ts/scr-extra.ts. Pura y sin tocar la
// DB → testeable directo (tests/roster-metrics.test.ts) sin mockear Prisma.
// [GOAL G3] TTL del micro-caché de datos GLOBALES (idénticos para cualquier usuario). Corto
// a propósito: con N alumnos entrando a la vez la query se hace UNA vez en vez de N, y un
// cambio del equipo se ve en ≤TTL. Nunca se cachea nada por usuario (ver lib/cache.ts).
const GLOBAL_TTL_MS = 30_000;

const ROSTER_RISK_PROGRESS_PCT = 50; // progreso del curso por debajo de esto cuenta como "bajo"
const ROSTER_RISK_INACTIVE_DAYS = 14; // + sin actividad en 14 días → riesgo (mismo umbral que lifecycleState 'lapsed')
const ROSTER_ENG_HIGH_EVENTS = 6; // >=6 ActivityEvent en los últimos 14 días → "Alto"
const ROSTER_ENG_MED_EVENTS = 2; // >=2 (y <6) → "Medio"; 1 o más pero <2 → "Bajo"; 0 CON historial previo → "Bajo"

export type RosterMetricsInput = {
  progressPct: number; // 0-100: LessonProgress done / lecciones contables del curso
  gradeFromSubmissions: number | null; // avg de Submission GRADED (courseCode del curso)
  gradeFromQuizzes: number | null; // fallback: avg % de QuizAttempt de las lecciones del curso
  bookingCompleted: number; // Booking COMPLETED del alumno con este coach
  bookingRelevant: number; // Booking CONFIRMED + COMPLETED del alumno con este coach
  lastEventAt: Date | null; // ActivityEvent más reciente del alumno (cualquier fecha, o null si nunca)
  recentLast7: number; // nº de ActivityEvent en los últimos 7 días
  recentPrior7: number; // nº de ActivityEvent entre hace 8 y 14 días (para el trend)
  nowMs: number; // "ahora" del caller (testeable sin Date.now() real)
  lang?: string; // idioma del label relativo de "last"
};

export type RosterMetrics = {
  grade: number | null; // null = sin entregas calificadas ni exámenes → "—" en la UI, no un 0 falso
  att: number | null; // null = sin reservas confirmadas/completadas con este coach (sin señal)
  eng: "Alto" | "Medio" | "Bajo" | "—"; // "—" = nunca tuvo ActivityEvent (no hay señal, no "Medio" inventado)
  trend: "up" | "down" | "flat";
  risk: boolean;
  last: string; // label relativo ("hace 2 días") o "—" si nunca hubo actividad
  prog: number; // 0-100, expuesto para paneles futuros y para depurar el criterio de risk
};

export function computeRosterMetrics(input: RosterMetricsInput): RosterMetrics {
  const {
    progressPct, gradeFromSubmissions, gradeFromQuizzes,
    bookingCompleted, bookingRelevant, lastEventAt,
    recentLast7, recentPrior7, nowMs, lang = "es",
  } = input;

  const grade = gradeFromSubmissions ?? gradeFromQuizzes ?? null;
  const att = bookingRelevant > 0 ? Math.round((bookingCompleted / bookingRelevant) * 100) : null;

  const hasHistory = !!lastEventAt;
  const daysSinceActivity = hasHistory ? Math.floor((nowMs - (lastEventAt as Date).getTime()) / 86400000) : null;
  const recent14 = recentLast7 + recentPrior7;

  const eng: RosterMetrics["eng"] = !hasHistory
    ? "—"
    : recent14 >= ROSTER_ENG_HIGH_EVENTS ? "Alto"
    : recent14 >= ROSTER_ENG_MED_EVENTS ? "Medio"
    : "Bajo";

  const trend: RosterMetrics["trend"] = !hasHistory
    ? "flat"
    : recentLast7 > recentPrior7 ? "up"
    : recentLast7 < recentPrior7 ? "down"
    : "flat";

  const risk = progressPct < ROSTER_RISK_PROGRESS_PCT
    && (!hasHistory || (daysSinceActivity ?? Infinity) >= ROSTER_RISK_INACTIVE_DAYS);

  const last = hasHistory ? whenLabel(lastEventAt, lang, nowMs) : "—";

  return { grade, att, eng, trend, risk, last, prog: Math.round(progressPct) };
}

/* ============================================================================
   [GOAL S4/S5] Cabecera y preview de una conversación — función PURA (se testea
   sin Prisma, igual que computeRosterMetrics).

   Conversation.name/initials/lastLabel son etiquetas DESNORMALIZADAS escritas
   desde UN solo lado del hilo. Dos consecuencias reales que arregla esto:

   · S4 — el coach abría el hilo con su alumna y leía SU PROPIO nombre ("SM ·
     Coach Saúl Méndez") en la cabecera y en la lista. Regla: si la etiqueta
     guardada ya nombra a una contraparte, se respeta (hilos bien etiquetados y
     canales tipo "Equipo OTR (anuncios)", que no nombran a nadie, se quedan
     como están); si nombra al USUARIO ACTUAL, se sustituye por la contraparte.
   · S5 — la lista previsualizaba "Gracias coach" en un hilo cuyo detalle estaba
     vacío. Regla: el preview SALE del último mensaje real; lastLabel solo se usa
     como fallback cuando la conversación aún no tiene mensajes.

   Devuelve texto CRUDO (sin escapar): escapa el llamador, una sola vez. */
export type ConversationLabelInput = {
  storedName: string;
  storedInitials: string;
  storedLastLabel: string;
  participantIds: string[];
  meId: string | null;
  /** nombre del usuario actual (para detectar el hilo etiquetado con uno mismo). */
  meName: string | null;
  /** id → {name, initials} de los participantes (los distintos del usuario actual). */
  counterparts: Map<string, { name: string; initials: string }>;
  /** body del ÚLTIMO mensaje real del hilo (null si el hilo está vacío). */
  lastMessageBody: string | null;
};

/** Normaliza para comparar personas: sin tildes, sin mayúsculas, sin espacios de más. */
const normName = (s?: string | null) => String(s ?? "")
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .toLowerCase().replace(/\s+/g, " ").trim();

/** Igualdad ESTRICTA de nombre (ya normalizado). */
function sameNameExact(a?: string | null, b?: string | null): boolean {
  const x = normName(a), y = normName(b);
  return !!x && x === y;
}

/** Coincidencia LAXA por subcadena — existe SOLO para tolerar "Coach X" ≈ "X". */
function sameNameLoose(a?: string | null, b?: string | null): boolean {
  const x = normName(a), y = normName(b);
  if (!x || !y) return false;
  return x.includes(y) || y.includes(x);
}

export function conversationLabel(input: ConversationLabelInput): { name: string; initials: string; last: string } {
  const { storedName, storedInitials, storedLastLabel, participantIds, meId, meName, counterparts, lastMessageBody } = input;

  const others = participantIds
    .filter((id) => id && id !== meId)
    .map((id) => counterparts.get(id))
    .filter(Boolean) as Array<{ name: string; initials: string }>;

  /* Escalera de precedencia — el ORDEN importa. La comparación laxa por subcadena existe
     solo para tolerar el prefijo de cortesía ("Coach Saúl Méndez" ≡ "Saúl Méndez"); si se
     evalúa ANTES que la igualdad estricta se come el arreglo: con un alumno llamado
     "Saúl Méndez Jr" el nombre del coach es subcadena del suyo, la etiqueta "Saúl Méndez"
     pasaría por "ya nombra a la contraparte" y el coach volvería a verse a sí mismo.
       1. la etiqueta es EXACTAMENTE mi nombre → contraparte (sin pasar por la laxa)
       2. es exactamente la de una contraparte → se respeta
       3. coincide de forma laxa con una contraparte → se respeta (hilo ya bien etiquetado)
       4. coincide de forma laxa conmigo → contraparte ("Coach Saúl Méndez" siendo yo Saúl)
       5. no nombra a nadie (canal "Equipo OTR (anuncios)") → se respeta */
  const swap = others.length > 0 && (
    sameNameExact(meName, storedName)
    || (!others.some((o) => sameNameExact(o.name, storedName))
      && !others.some((o) => sameNameLoose(o.name, storedName))
      && sameNameLoose(meName, storedName))
  );

  // others[0] = primer participante del orden ESTABLE que entrega el llamador (userId asc).
  const pick = swap ? others[0] : null;

  return {
    name: pick ? pick.name : storedName,
    initials: pick ? pick.initials : storedInitials,
    // El preview manda el mensaje real; lastLabel es solo el fallback del hilo vacío.
    last: lastMessageBody != null && lastMessageBody !== "" ? lastMessageBody : storedLastLabel,
  };
}

// [DASHBOARD] Nombre del mes para el periodo del ranking mensual. Tabla propia (no Intl):
// el resto del archivo ya genera sus etiquetas así, sin depender del ICU del runtime.
const MONTHS_ES_FULL = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const MONTHS_EN_FULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
function monthNameLabel(d: Date, wantEnglish: boolean): string {
  return (wantEnglish ? MONTHS_EN_FULL : MONTHS_ES_FULL)[d.getMonth()] || "";
}
// Días que faltan para que cierre el mes de `d` (0 = hoy es el último día).
function daysLeftInMonth(d: Date): number {
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  return Math.max(0, lastDay - d.getDate());
}

/**
 * Consulta OPCIONAL: la que alimenta adornos (premios del podio, highlights, ranking
 * mensual). Si falla —modelo ausente en un Prisma Client sin regenerar, tabla que aún no
 * migró, error de query— devuelve [] en vez de tumbar TODO /api/app-data.
 *
 * Sin esto, un `db.seasonPrize` undefined lanza "Cannot read properties of undefined
 * (reading 'findMany')" DENTRO del Promise.all y el Aula entera se queda en "Cargando…"
 * con un 500: una franja decorativa se lleva por delante clases, tareas y mensajes.
 *
 * El `await` dentro del try es deliberado: atrapa TANTO el throw síncrono (el modelo que
 * no existe en el cliente) COMO la promesa rechazada (la tabla que no existe en la DB);
 * un `.catch()` encadenado solo cubriría el segundo caso. Y siempre deja traza en consola
 * — degradar no es esconder: el operador tiene que ver que falta correr la migración.
 */
async function optionalRows<T>(label: string, run: () => Promise<T[]>): Promise<T[]> {
  try {
    return await run();
  } catch (err) {
    console.warn(`[app-data] '${label}' no disponible — se degrada a lista vacía (¿falta migrar o regenerar el cliente?):`, err);
    return [];
  }
}
/* [ADM] SELECT único de `Admission` para las tres vistas. Es la lista blanca de privacidad
   del flujo: SOLO timestamps. Todo lo demás que guarda el modelo —nombre, cédula, teléfono y
   firma del tutor, correo del tutor, fecha de nacimiento, colegio, programa, días preferidos y
   la URL del vídeo DPP— se queda en la base: no lo necesita ni el coach ni el admin para saber
   por qué paso va alguien, y son datos de un MENOR y de su tutor. Añadir un campo aquí es
   una decisión de privacidad, no un detalle de implementación. */
const ADMISSION_SELECT = {
  formCompletedAt: true, callCompletedAt: true, communityCompletedAt: true, videoCompletedAt: true,
  completedAt: true, status: true, guardianSignedAt: true,
} as const;

/**
 * [ADM] Consulta de admisión TOLERANTE, con una diferencia clave respecto a optionalRows:
 * distingue "no hay filas" (devuelve []) de "el subsistema no existe todavía" (devuelve null).
 *
 * Esa distinción es la que evita el peor fallo posible de este enganche: si el modelo/tabla
 * `Admission` aún no está migrado y degradáramos a [], TODO estudiante parecería tener la
 * admisión a 0 de 4 y el arranque lo mandaría a un wizard que no existe — el Aula entera
 * quedaría inalcanzable. Con null, `me.admission` viaja como null y el arranque no redirige
 * a nadie: la plataforma se comporta exactamente como antes de este cambio.
 */
async function admissionRows<T>(label: string, run: () => Promise<T[]>): Promise<T[] | null> {
  try {
    return await run();
  } catch (err) {
    console.warn(`[app-data] admisión '${label}' no disponible — el flujo queda apagado (¿falta migrar o regenerar el cliente?):`, err);
    return null;
  }
}

// [GOAL A2 · F2] Los cuatro labels de fecha del payload reciben ahora el idioma de la
// request y delegan en los formateadores de i18n.ts (ES: "jun 2026" / EN: "Jun 2026").
// Antes eran tablas en español fijo → con otr_lang=en la UI salía en inglés y las fechas
// en español. La forma del label en ES NO cambia (mismo output, byte a byte).
function monthYearLabel(d?: Date | null, lang?: string): string {
  return fmtMonthYear(d, lang);
}

// Etiqueta corta de día "12 jun" / "Jun 12" (journey/atribución del Lifetime Profile, PRD §8).
function shortDateLabel(d?: Date | string | null, lang?: string): string {
  return fmtDayMonth(d, lang);
}

// Etiqueta de mes completo capitalizado "Junio 2026" / "June 2026" (agrupa el journey, PRD §8).
function monthFullLabel(d?: Date | string | null, lang?: string): string {
  return fmtMonthFull(d, lang);
}

// Etiqueta de fecha de evento futuro tipo "12 jun · 9:00 AM" / "Fri, Jun 12 · 9:00 AM".
// Usada para el inicio de los torneos del Debate Hub.
// [FIX glitch "12:23 AM"] La hora sale con zona horaria FIJA (America/Santo_Domingo) y no
// con la del SERVIDOR (UTC): antes un torneo a medianoche local se renderizaba "12:23 AM"
// en un server UTC. fmtDateTimeRD conserva ese offset fijo. Misma fuente TZ que las reservas.
function eventDateLabel(d?: Date | null, lang?: string): string {
  return fmtDateTimeRD(d, lang);
}

/* [GOAL A4 · F2] Título REAL de una clase 1:1 del marketplace.
   Defecto: el dashboard titulaba la próxima clase "Single" — que es el nombre COMERCIAL
   del paquete del coach (Single / 5-pack / 10-pack, CoachPackage.name), no la clase. El
   alumno leía "Single" como si fuera el tema de su sesión.
   Booking no tiene curso ni lección (es coaching 1:1, no una lección de un curso), así que
   el título honesto sale del dato real que SÍ existe: la primera especialidad del
   CoachProfile ("Public Forum, Lincoln-Douglas, Oratoria" → "Sesión de Public Forum") y,
   si el coach no declaró especialidades, su nombre ("Sesión con Carla Jiménez"). El paquete
   se queda donde siempre fue correcto: como METADATO (packageName, que scr-mybookings y
   scr-room ya pintan como metadato). Pura ⇒ testeable sin DB (tests/i18n-dates.test.ts).
   Devuelve texto CRUDO: el call-site aplica esc() una sola vez (contrato de escape). */
export function bookingClassTitle(input: { specialty?: string | null; coachName?: string | null; lang?: string }): string {
  const first = String(input.specialty ?? "").split(",")[0].trim();
  const en = input.lang === "en";
  if (first) return en ? `${first} session` : `Sesión de ${first}`;
  const coach = String(input.coachName ?? "").trim() || (en ? "OTR Coach" : "Coach OTR");
  return en ? `Session with ${coach}` : `Sesión con ${coach}`;
}

// Las 6 dimensiones del radar OTR, en el orden fijo del contrato.
const OTR_SKILLS = ["Confianza", "Estructura", "Evidencia", "Refutación", "Cross-ex", "Delivery"];

// [§6.2] Umbral de Glicko-2 RD por encima del cual el rating aún es "soft"/provisional.
// Una sola fuente para los call-sites del Debate Hub y del dashboard (antes el comentario decía 200).
const PROVISIONAL_RD = 150;

// Promedio de ratings redondeado a 1 decimal (0 si no hay reseñas).
function avgRating(ratings: number[]): number {
  if (!ratings.length) return 0;
  const sum = ratings.reduce((a, b) => a + (b || 0), 0);
  return Math.round((sum / ratings.length) * 10) / 10;
}

// Convierte el string de "formats" (separado por coma) en lista de strings escapados.
function formatsList(formats?: string | null): string[] {
  return String(formats ?? "")
    .split(",")
    .map((f) => f.trim())
    .filter(Boolean)
    .map((f) => esc(f));
}

// Forma del quiz para el cliente (sección 2 CONTRACT.md). Texto de usuario escapado.
// Para ESTUDIANTE las opciones NO incluyen 'correct' (anti-trampa);
// para PROFESOR/ADMIN sí, para poder editar.
function buildQuiz(quiz: any, isTeacher: boolean) {
  if (!quiz) return null;
  return {
    id: quiz.id,
    lessonId: quiz.lessonId,
    title: esc(quiz.title),
    passScore: quiz.passScore,
    questions: (quiz.questions || []).map((q: any) => ({
      id: q.id,
      prompt: esc(q.prompt),
      options: (q.options || []).map((o: any) =>
        isTeacher
          ? { id: o.id, text: esc(o.text), correct: o.correct }
          : { id: o.id, text: esc(o.text) },
      ),
    })),
  };
}

/* ===================== [RONDA3 · CURSOS] Categoría del catálogo =====================
   El cliente pidió un catálogo "por tipos de clase, como Preply". El modelo Course NO
   tiene columna `category`: el único campo que clasifica un programa es `format`
   (PF | LD | Parli | Policy | Oratoria | …), el mismo que ya se pinta como chip en la
   ficha. Así que la categoría se DERIVA de `format` (y, si viniera vacío, del prefijo
   del `code`) — no se inventa ni se siembra un campo nuevo. Devuelve una CLAVE estable;
   la etiqueta visible la pone la UI en el idioma activo (core.cat*), para no romper i18n.
   Formato desconocido → "other" (la tile se rotula "Otros programas"): nada se pierde. */
export function courseCategoryKey(format?: string | null, code?: string | null): string {
  const norm = (s?: string | null) =>
    String(s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  const f = norm(format);
  const c = norm(code);
  const table: Array<[string, RegExp]> = [
    ["pf", /^(pf|public ?forum)/],
    ["ld", /^(ld|lincoln)/],
    ["parli", /^(parli|parlament|british|bp|wsdc|worlds)/],
    ["policy", /^(policy|cx)/],
    ["oratoria", /^(ora|speech|speaking)/],
  ];
  for (const [key, re] of table) if (f && re.test(f)) return key;
  for (const [key, re] of table) if (c && re.test(c)) return key;
  return "other";
}

export async function getAppData(email: string = ME_EMAIL, lang: string = "es", preloaded?: any) {
  // PRD §17.3: "i18n is structural, not a wrapper". El contenido de cursos y
  // lecciones se sirve en el idioma activo, cayendo al ES si no hay traducción.
  // `lang` lo decide el SERVER (cookie otr_lang vía next/headers) y lo pasa quien
  // llama a getAppData — aquí NO se puede leer document.cookie (corre en server).
  // pickLang(es, en): devuelve la variante EN solo si lang==='en' Y existe; si no, ES.
  const wantEn = lang === "en";
  const pickLang = (es?: string | null, en?: string | null): string =>
    wantEn && en != null && en !== "" ? (en as string) : (es ?? "");
  // [BE-03] Reusa el User ya resuelto por getSessionUser en el MISMO request si el llamador
  // lo pasa (preloaded), evitando un segundo findUnique del mismo usuario por email (ahorra un
  // round-trip por refresh). base.me se construye campo a campo (no hace spread de `me`), así que
  // passwordHash no se filtra al cliente aunque venga en el objeto preloaded.
  // select defensivo (cuando NO hay preloaded): NUNCA traer passwordHash ni emailVerified.
  const me = preloaded || await db.user.findUnique({
    where: { email },
    select: {
      id: true, name: true, email: true, role: true, initials: true, level: true,
      xp: true, streak: true, headline: true, bio: true, teachingStyle: true,
      formats: true, location: true, avatarUrl: true, preferences: true,
      // PRD §4: rating de debate (Glicko-2) para la Debate Rank card del dashboard.
      debateRating: true, debateRd: true, debateTier: true,
      // [RATING-2 §6.2] Speaker Rating: promedio de oratoria, métrica separada del W/L.
      speakerAvg: true, speakerRounds: true,
      // [GAMIFICATION-1 §9] opt-in de la clasificación pública (toggle en Ajustes).
      leaderboardOptIn: true,
      // PRD §7 Safety Gate: ageBand alimenta el candado de consentimiento del marketplace.
      ageBand: true,
      // PRD §11.3 / §2.2: placedAt (null = estudiante nuevo sin placement) → me.needsPlacement.
      placedAt: true,
      // PRD §13: membresía simulada · PRD §8 identity (lang) · §8.4 perfil público.
      membership: true, membershipSince: true, publicSlug: true, publicProfile: true, lang: true,
      // [NOTIF-PERSIST] toggles de notificación persistidos (antes solo localStorage).
      notificationPrefs: true,
      // [R5] 2FA: solo para derivar me.totpEnabled (el SECRETO jamás viaja al cliente).
      totpSecret: true,
    },
  });
  const isTeacher = me?.role === "TEACHER" || me?.role === "ADMIN";
  const myRole = (me?.role || "STUDENT").toLowerCase(); // rol REAL: student | teacher | admin

  const [
    levels, meEnrollments, badges, notifications, events,
    threads, mainThread, convos, allCourses, allModules, taughtCourses,
    myStudentSkills, myCertificates, marketplaceCoaches,
    seasonPrizes, highlightRows, adminCourseRows,
    reviewAgg, reviewByCourseAgg, upcomingTournaments,
  ] = await Promise.all([
    // [GOAL G3] Global e idéntico para todos → micro-caché (ver lib/cache.ts).
    cached("levels", GLOBAL_TTL_MS, () => db.level.findMany({ orderBy: { position: "asc" } })),
    db.enrollment.findMany({ where: { user: { email } }, include: { course: true }, orderBy: { course: { position: "asc" } } }),
    // [PERF-P] Catálogo de insignias: tabla completa, sin filtro por usuario y sin PII →
    // misma clase que levels/events (el `got` por usuario se deriva después, en JS).
    cached("badges", GLOBAL_TTL_MS, () => db.badge.findMany({ orderBy: { position: "asc" } })),
    // [F3.2 fix] Notificaciones scopeadas EN LA DB (no en JS): antes se traían las 200 GLOBALES
    // por posición (sin where) y se filtraban por userId en memoria (:1699) → con más usuarios
    // las 200 posiciones se llenaban de notificaciones ajenas y las PROPIAS del usuario
    // desaparecían del feed. Misma forma correcta que /api/notifications: OR(userId propio, null),
    // no leídas primero, take acotado. me puede ser null (sin sesión) → solo globales (userId null).
    db.notification.findMany({
      where: me ? { OR: [{ userId: me.id }, { userId: null }] } : { userId: null },
      orderBy: [{ unread: "desc" }, { position: "asc" }],
      take: 50,
    }),
    cached("events", GLOBAL_TTL_MS, () => db.eventItem.findMany({ orderBy: { position: "asc" }, take: 200 })), // [GOAL G3] global
    // Foro APAGADO (PRD-estricto, Fase 3 §10): no se cargan ni envían threads.
    Promise.resolve([] as any[]),
    Promise.resolve(null as any),
    // PRD §7.4/§17.4: las conversaciones se scopean por participante (no se cargan
    // todas). El usuario solo recibe aquellas donde es ConversationParticipant.
    // Fallback legacy: conversaciones SIN ningún participante registrado (seed viejo)
    // se incluyen para no romper. me?.id puede faltar (sin sesión) → [].
    me
      ? db.conversation.findMany({
          where: { participants: { some: { userId: me.id } } },
          orderBy: { position: "asc" },
          take: 50,
          // [F3.3] take-per-parent (mismo patrón que /api/reports GET desde F2): en vez de
          // 50 convos × 200 msgs = 10k filas por carga, traemos los 60 mensajes MÁS RECIENTES
          // de cada conversación (orderBy position desc + take) y los reinvertimos a orden
          // cronológico en el mapping (~línea 1697). scr-community NO pagina el hilo y renderiza
          // el array completo → 60 cubre la ventana visible; los mensajes nuevos se anexan al final.
          // [GOAL S4] Los participantes viajan con la conversación (solo el id: una fila por
          // participante, sin join a User) para poder etiquetar el hilo con la CONTRAPARTE.
          // Conversation.name/initials es una etiqueta DESNORMALIZADA escrita desde un solo
          // lado: el coach veía su propio nombre en el hilo con su alumna.
          // [GOAL S4·rev] `orderBy` explícito: sin él Prisma no garantiza el orden de los
          // participantes y con 3+ en el hilo la etiqueta (others[0]) podía cambiar entre
          // cargas. userId asc = orden estable y barato (hay @@index([userId])).
          include: {
            messages: { orderBy: { position: "desc" }, take: 60, select: { senderId: true, me: true, body: true, timeLabel: true, sentAt: true } },
            participants: { select: { userId: true }, orderBy: { userId: "asc" } },
          },
        })
      : Promise.resolve([] as any[]),
    // [RONDA3 · CURSOS] `studentsCount` (denormalizado, coste 0) y el conteo REAL de
    // módulos/clases publicadas alimentan las tiles de categoría y las recomendaciones
    // del catálogo por categorías. El join de módulos es el MISMO patrón que ya usa la
    // lista de cursos de admin (abajo) y corre sobre el catálogo publicado (decenas de
    // filas), no sobre toda la tabla.
    // [PERF-P] El catálogo publicado NO depende del usuario (`enrolled` se deriva después
    // con enrolledIds) → micro-caché global. Con N alumnos entrando a la vez se lee UNA vez.
    cached("catalog:published", GLOBAL_TTL_MS, () =>
      db.course.findMany({ where: { published: true }, orderBy: { position: "asc" }, select: { id: true, code: true, name: true, nameEn: true, color: true, coachName: true, priceCents: true, format: true, modality: true, summary: true, summaryEn: true, welcomeVideoKind: true, welcomeVideoSrc: true, studentsCount: true, modules: { select: { _count: { select: { lessons: true } } } } } })),
    // Mapa de módulos para gestión de contenido: solo profesor/admin.
    isTeacher ? db.module.findMany({ where: { course: { teacher: { email } } }, orderBy: { position: "asc" }, select: { id: true, courseId: true, title: true } }) : Promise.resolve([]),
    // Cursos impartidos (con reseñas para el perfil del coach): solo profesor/admin.
    isTeacher
      ? db.course.findMany({ where: { teacher: { email } }, include: { modules: { include: { lessons: { orderBy: { position: "asc" } } }, orderBy: { position: "asc" } }, reviews: { include: { student: true }, orderBy: { createdAt: "desc" } } }, orderBy: { position: "asc" } })
      : Promise.resolve([]),
    // Habilidades (radar) del estudiante logueado. [] si no existe el usuario.
    me ? db.studentSkill.findMany({ where: { userId: me.id } }) : Promise.resolve([]),
    // Certificados del estudiante logueado, con el curso para obtener programName.
    me
      ? db.certificate.findMany({ where: { userId: me.id }, orderBy: { issuedAt: "desc" } })
      : Promise.resolve([]),
    // Marketplace (PRD §7): perfiles de coach ACTIVOS con paquetes y disponibilidad.
    // Visible para TODOS los roles (browse/search de coaches).
    // [ENT-07] El filtro/orden del marketplace es en cliente sobre este conjunto. Subimos el
    // techo a 500 para eliminar el "cliff" de coaches que desaparecían >100 en cualquier escala
    // realista cercana. La paginación server-side real (cursor + filtro/orden en /api/coaches,
    // que ya existe) es el fix definitivo para miles de coaches — diferido a su propio esfuerzo.
    // [F3.3] take 500 se MANTIENE a propósito (bajarlo a 100 reintroduciría el cliff que ENT-07
    // arregló; la fila no tiene columnas pesadas y ya está capada). Lo que SÍ afinamos es el
    // select explícito: el mapping (marketplace + workspace propio) NO usa los agregados
    // ALMACENADOS ratingAvg/reviewCount (se derivan EN VIVO de Review, ver reviewByTeacher) →
    // no viajan (evita leer por error el valor stale). `active` SÍ se incluye: el coach que ve su
    // propio perfil lo obtiene de aquí (está active:true) y el workspace lee myCoachProfile.active.
    // [PERF-P] El browse del marketplace es el MISMO para todo el mundo (where active:true,
    // sin filtro por usuario y sin PII: el select ya excluye email/passwordHash). Era la
    // consulta más cara del payload — 4 sentencias (perfil + paquetes + disponibilidad +
    // los User públicos de esos coaches) en CADA carga de CUALQUIER rol, incluido el alumno
    // que nunca abre el marketplace. Ahora es UNA clave global: perfiles y usuarios viajan
    // juntos porque el 2º depende de los ids del 1º (antes eso era una ola extra de fan-out).
    // El coach que edita SU perfil no lee de aquí: `myCoachProfileRow` (abajo) va siempre
    // fresco a la DB y tiene precedencia, así que nunca ve su propia escritura con retraso.
    cached("marketplace:coaches", GLOBAL_TTL_MS, async () => {
      const profiles = await db.coachProfile.findMany({
        where: { active: true },
        select: {
          id: true, userId: true, introVideoUrl: true, credentials: true, specialties: true,
          languages: true, hourlyCents: true, responseTime: true, cancelPolicy: true,
          bookingCount: true, active: true,
          packages: { orderBy: { position: "asc" }, select: { id: true, name: true, sessions: true, priceCents: true, discountPct: true } },
          availability: { orderBy: [{ weekday: "asc" }, { startMin: "asc" }], select: { id: true, weekday: true, startMin: true, endMin: true } },
        },
        take: 500,
      });
      // Datos públicos del User de cada coach activo.
      // select defensivo: NUNCA passwordHash ni email (no se exponen en browse).
      const users = profiles.length
        ? await db.user.findMany({
            where: { id: { in: profiles.map((p) => p.userId) } },
            select: { id: true, name: true, initials: true, headline: true, avatarUrl: true, coachVerified: true, location: true },
          })
        : [];
      return { profiles, users };
    }),
    // [DASHBOARD] Premios del podio de la temporada. Catálogo global e idéntico para
    // todos → micro-caché, igual que levels/events. Adorno ⇒ optionalRows: si la tabla
    // no está migrada, el podio sale sin cajita de premio y el Aula sigue en pie.
    optionalRows("seasonPrize", () =>
      cached("seasonPrizes", GLOBAL_TTL_MS, () => db.seasonPrize.findMany({ orderBy: { rank: "asc" }, take: 10 }))),
    // [DASHBOARD] "Lo mejor de la temporada": logros de la marca. También global y también
    // decorativo ⇒ sin él la franja simplemente no se pinta (la vista ya lo contempla).
    optionalRows("highlight", () =>
      cached("highlights", GLOBAL_TTL_MS, () => db.highlight.findMany({ orderBy: { position: "asc" }, take: 12 }))),
    // [GOAL-E4 #9] Catálogo COMPLETO (con dueño y conteos) para la pantalla "Cursos" del ADMIN.
    // Ver el bloque `base.adminCourses` al final del archivo para el porqué del campo propio.
    // [revisión · minor 6] Va DENTRO de este Promise.all, no en un await suelto después: así no
    // añade un round-trip en serie. Para cualquier rol que no sea ADMIN resuelve [] sin consultar.
    me?.role === "ADMIN"
      ? db.course.findMany({
          orderBy: { position: "asc" },
          select: {
            id: true, code: true, name: true, nameEn: true, color: true, published: true,
            format: true, modality: true, coachName: true,
            teacher: { select: { id: true, name: true } },
            modules: { select: { _count: { select: { lessons: true } } } },
          },
        })
      : Promise.resolve([] as any[]),
    // [auditoría/stale-stored] Rating y nº de reseñas del coach DERIVADOS EN VIVO de las Review
    // reales (fuente canónica), no del agregado ALMACENADO en CoachProfile (que podía estar
    // desfasado del seed o en 0 para coaches nuevos). Una sola agregación por teacher para todo
    // el payload (marketplace + workspace). Así el valor mostrado siempre coincide con las reseñas.
    // [PERF-P] Estas dos agregaciones van con `WHERE 1=1`: agregan la tabla Review ENTERA de la
    // plataforma y su resultado es IDÉNTICO para todo el mundo. Antes eran una ola PROPIA en
    // serie después de esta (dos round-trips extra en la ruta crítica) y ninguna caché las
    // tocaba (§3.4 del diagnóstico). Ahora: dentro de esta ola y con micro-caché global.
    cached("reviewAgg:byTeacher", GLOBAL_TTL_MS, () =>
      db.review.groupBy({ by: ["teacherId"], _avg: { rating: true }, _count: { _all: true } })),
    // [EPIC-5] Rating POR CURSO (reseñas de programa: Review.courseId != null) — valoración
    // del programa en la cabecera del curso del alumno.
    cached("reviewAgg:byCourse", GLOBAL_TTL_MS, () =>
      db.review.groupBy({ by: ["courseId"], _avg: { rating: true }, _count: { _all: true } })),
    // tournaments: UPCOMING|LIVE (take 20) ordenados por fecha de inicio.
    // [PERF-P] La LISTA es global; lo único por usuario era el flag `registered`, que antes
    // viajaba como un `include registrations where userId` (una sentencia extra por carga).
    // Ahora la lista se cachea y el flag se deriva de myTournamentRegRows (la misma consulta
    // que ya contaba los registros del usuario) → una sentencia menos y sin scan repetido.
    me
      ? cached("tournaments:upcoming", GLOBAL_TTL_MS, () =>
          db.tournament.findMany({
            where: { status: { in: ["UPCOMING", "LIVE"] } },
            orderBy: [{ startsAt: "asc" }],
            take: 20,
          }))
      : Promise.resolve([] as any[]),
  ]);
  // [PERF-P] El browse del marketplace viaja cacheado en un solo objeto (ver arriba).
  const coachProfiles = marketplaceCoaches.profiles;
  const coachUsers = marketplaceCoaches.users;

  // [fix nivel] El rango (Novato 0-999 · JV 1000-2499 · Varsity 2500-4999 · Elite 5000+) se
  // DERIVA del XP, NO del User.level almacenado: el placement llegó a fijar level por el promedio
  // de skills, dejando a alumnos con 0 XP marcados como JV. La fuente de verdad es el XP (igual que
  // el quiz-attempt al subir de nivel). Así "todos inician en Novato" y el badge nunca contradice al XP.
  const _meXp = me?.xp ?? 0;
  const curLevel = [...levels].sort((a, b) => (b.startXp ?? 0) - (a.startXp ?? 0)).find((l) => _meXp >= (l.startXp ?? 0)) ?? levels[0];
  const derivedLevelName = curLevel?.name || "OTR Initiate";
  // [fix] Helper reutilizable: nombre de rango DERIVADO del XP (para el usuario y para los hijos
  // del portal de familia) — la fuente canónica del rango es el XP, no el User.level almacenado.
  const levelNameForXp = (xp: number) => ([...levels].sort((a, b) => (b.startXp ?? 0) - (a.startXp ?? 0)).find((l) => (Number(xp) || 0) >= (l.startXp ?? 0)) ?? levels[0])?.name || "OTR Initiate";
  const nextLevel = levels.find((l) => l.position === (curLevel?.position ?? 0) + 1);
  // [PERF-P] Las dos agregaciones de Review ya vienen de la ola de arriba (cacheadas): aquí
  // solo se reducen a mapas. Antes ocupaban una ola PROPIA en serie entre las dos grandes.
  const reviewByTeacher = new Map<string, { avg: number; count: number }>(
    reviewAgg.map((r: any) => [r.teacherId, { avg: Math.round((r._avg.rating || 0) * 10) / 10, count: r._count._all || 0 }]),
  );
  const reviewByCourse = new Map<string, { avg: number; count: number }>(
    reviewByCourseAgg
      .filter((r: any) => r.courseId)
      .map((r: any) => [r.courseId as string, { avg: Math.round((r._avg.rating || 0) * 10) / 10, count: r._count._all || 0 }]),
  );
  const xpLevelStart = curLevel?.startXp ?? 0;
  const xpNext = nextLevel?.startXp ?? (curLevel?.startXp ?? 0);

  const enrolledIds = new Set(meEnrollments.map((e) => e.courseId));

  // --- Datos reales del estudiante para notas y progreso -------------------
  // Cargados en paralelo: progreso de lecciones (LessonProgress), entregas
  // calificadas (Submission GRADED) y exámenes (QuizAttempt) del usuario actual,
  // y todas las lecciones de sus cursos inscritos (para el % de progreso real).
  // Para el profesor: conteo de entregas pendientes de sus cursos.
  const taughtCodes = isTeacher ? taughtCourses.map((c: any) => c.code) : [];
  // Ids de los cursos cuyos quizzes nos interesan: impartidos (profesor) o
  // inscritos (alumno). Se usan para cargar los exámenes reales sin N+1.
  const taughtIds = isTeacher ? taughtCourses.map((c: any) => c.id) : [];
  const quizCourseIds = isTeacher ? taughtIds : [...enrolledIds];
  // [l7] Para ESTUDIANTE: el dashboard/courseModules deriva del PRIMER curso REAL
  // inscrito (meEnrollments ya viene ordenado por course.position asc). Si no hay
  // ninguna inscripción → [] (no se fuerza PF-101). El profesor mantiene PF-101.
  const firstEnrolledCourseId = !isTeacher ? (meEnrollments[0]?.courseId ?? null) : null;
  const firstTaughtCourseId = isTeacher ? (taughtCourses[0]?.id ?? null) : null;
  // [P0 de-mock] El "curso principal" ya NO es el hardcoded PF-101:
  //   · estudiante → su PRIMER curso inscrito (coach/reseñas/programas REALES de ese curso)
  //   · profesor   → su PRIMER curso impartido (roster real para el dashboard)
  // [GOAL S4] Nombre/iniciales de las CONTRAPARTES de mis conversaciones, en UNA sola
  // consulta (los ids ya viajan con cada conversación). Sin esto no se puede etiquetar el
  // hilo con el otro: Conversation.name está escrito desde un solo lado.
  const convoOtherIds = [...new Set(
    (convos as any[]).flatMap((c: any) => (c.participants ?? []).map((p: any) => p.userId))
      .filter((id: string) => id && id !== me?.id),
  )] as string[];
  const [studentMainCourse, taughtRoster, convoOtherUsers] = await Promise.all([
    (!isTeacher && firstEnrolledCourseId)
      ? db.course.findUnique({
          where: { id: firstEnrolledCourseId },
          include: {
            teacher: { select: { id: true, name: true, email: true, initials: true, headline: true, bio: true, teachingStyle: true, formats: true, location: true } },
            reviews: { include: { student: true }, orderBy: { createdAt: "desc" } },
          },
        })
      : Promise.resolve(null),
    (isTeacher && firstTaughtCourseId)
      // [PERF-P] `include: { user: true }` traía la fila COMPLETA del alumno —passwordHash y
      // totpSecret incluidos— para usar 5 campos (base.students). select explícito: menos
      // bytes por fila del roster y los secretos ni salen de la DB.
      ? db.enrollment.findMany({ where: { courseId: firstTaughtCourseId }, select: { userId: true, user: { select: { id: true, name: true, initials: true, level: true, xp: true } } }, orderBy: { user: { xp: "desc" } }, take: 200 })
      : Promise.resolve([] as any[]),
    convoOtherIds.length
      ? db.user.findMany({ where: { id: { in: convoOtherIds } }, select: { id: true, name: true, initials: true } })
      : Promise.resolve([] as any[]),
  ]);
  const convoCounterparts = new Map<string, { name: string; initials: string }>(
    (convoOtherUsers as any[]).map((u: any) => [u.id, { name: u.name, initials: u.initials }]),
  );
  // mainCourse efectivo (estudiante) + coach REAL de su curso (ya no PF-101/saul).
  const effMainCourse: any = isTeacher ? null : studentMainCourse;
  const studentCoach = !isTeacher ? (studentMainCourse?.teacher ?? null) : null;
  // base.teacher: profesor → él mismo; estudiante → coach del curso en que está inscrito.
  const headCoach: any = isTeacher ? me : studentCoach;

  // [BUG-ROSTER-REAL] Preparación para computeRosterMetrics: ids del roster (curso impartido
  // por el profesor) + lecciones "contables" de ESE curso (mismo criterio que courseProgress
  // del alumno — lo oculto por el profesor no cuenta). taughtCourses[0] ya viene con
  // modules→lessons cargado (primer Promise.all de esta función), así que esto es gratis.
  const rosterIds: string[] = isTeacher ? (taughtRoster as any[]).map((e: any) => e.userId) : [];
  const rosterCourse: any = isTeacher ? (taughtCourses[0] as any) : null;
  const rosterCourseCode: string = rosterCourse?.code ?? "";
  const rosterLessonRows: Array<{ id: string; title: string }> = [];
  (rosterCourse?.modules || []).forEach((m: any) => {
    if (m.hidden) return;
    (m.lessons || []).forEach((l: any) => { if (!l.hidden) rosterLessonRows.push({ id: l.id, title: l.title }); });
  });
  const rosterLessonIds = rosterLessonRows.map((l) => l.id);
  const rosterLessonTitles = [...new Set(rosterLessonRows.map((l) => l.title))];
  // "Ahora" fijado UNA vez para toda la ventana de actividad reciente (7/14 días) del roster.
  const rosterNowMs = Date.now();
  const rosterActivityCutoff = new Date(rosterNowMs - ROSTER_RISK_INACTIVE_DAYS * 86400000);

  // [DASHBOARD] Ventana del MES EN CURSO para el ranking de XP de la tarjeta del Aula.
  // Se fija una sola vez por request (el mes no puede cambiar a mitad del cálculo).
  const nowForMonth = new Date();
  const monthStart = new Date(nowForMonth.getFullYear(), nowForMonth.getMonth(), 1);
  const monthEnd = new Date(nowForMonth.getFullYear(), nowForMonth.getMonth() + 1, 1);
  const monthKey = `${nowForMonth.getFullYear()}-${nowForMonth.getMonth() + 1}`;

  /* [ADM] ¿Existe ya el subsistema de admisión en ESTE despliegue? El modelo `Admission` lo
     añade la fase F0; mientras el Prisma Client no se haya regenerado, `db.admission` es
     undefined y llamarlo lanzaría "Cannot read properties of undefined (reading 'findMany')"
     DENTRO del Promise.all — el mismo fallo que documenta optionalRows, pero con las 30
     consultas de la ola por delante. Se comprueba UNA vez y las tres lecturas se saltan enteras
     (no se lanza una query condenada a fallar). Ver también admissionRows(). */
  const admissionModel = (db as unknown as { admission?: { findMany(args: unknown): Promise<any[]> } }).admission;

  const [
    myProgress, mySubs, myQuizzes, enrolledLessons, pendingSubs, quizRows, studentModules,
    coachPrograms, myReviewRow, activityEvents,
    debateRecords, debateCriteriaScores, leaderboardRows, myLeaderboardAhead,
    myBookingRows, parentGuardianships, studentGuardianRequests, myTournamentRegRows,
    coachBookingRows, myCoachProfileRow,
    rosterGradeAgg, rosterQuizRows, rosterBookingAgg, rosterProgressRows, rosterLastEventAgg, rosterRecentEvents,
    monthXpBoard, streakRows, myReviewedRows,
    coachHeldAgg, coachRelAgg, coachMonthRelAgg, coachCompletedCount, coachByStudentAgg,
    myAdmissionRows, rosterAdmissionRows, platformAdmissionRows,
  ] = await Promise.all([
    // [PERF-P] select: del progreso solo se usan el lessonId (doneSet) y el nº de filas.
    me ? db.lessonProgress.findMany({ where: { userId: me.id, done: true }, select: { lessonId: true } }) : Promise.resolve([] as Array<{ lessonId: string }>),
    // Una sola consulta de TODAS las entregas del usuario; las GRADED se derivan en JS.
    // (Antes había dos findMany: GRADED + todas. select defensivo: solo campos usados.)
    me ? db.submission.findMany({ where: { userId: me.id }, orderBy: { createdAt: "desc" }, take: 300, select: { id: true, status: true, activity: true, grade: true, feedback: true, kind: true, fileUrl: true, fileName: true, textBody: true, courseCode: true, createdLabel: true } }) : Promise.resolve([]),
    // [F3.3] Acotado: TODOS los QuizAttempt del usuario crecían sin límite con el uso. Alimenta
    // gradeRows→myGrades (avg/best/count histórico). mySubs ya está capado a take:300, así que
    // capar los exámenes a los 200 más recientes es CONSISTENTE; el promedio refleja la actividad
    // reciente (sesgo documentado). Histórico completo/paginado → server-side, F10.
    me ? db.quizAttempt.findMany({ where: { userId: me.id }, orderBy: { createdAt: "desc" }, take: 200 }) : Promise.resolve([]),
    // Lecciones (id + courseId) de los cursos en que está inscrito, para el % real.
    // [PERF-P] Para el ESTUDIANTE esto era trabajo DUPLICADO: `studentModules` (dos filas más
    // abajo) ya trae exactamente los mismos módulos de los mismos cursos con sus lecciones.
    // Se leía la tabla Lesson dos veces por carga. Ahora el alumno deriva el conteo de ahí
    // (ver `enrolledLessonRows`) y esta consulta solo corre para el caso que NO cubre
    // studentModules: un profesor/admin que además esté inscrito en cursos.
    isTeacher && meEnrollments.length
      ? db.lesson.findMany({ where: { module: { courseId: { in: [...enrolledIds] } } }, select: { id: true, hidden: true, module: { select: { courseId: true, hidden: true } } } })
      : Promise.resolve([] as Array<{ id: string; hidden: boolean; module: { courseId: string; hidden: boolean } | null }>),
    // Entregas pendientes (no calificadas) de los cursos del profesor.
    isTeacher && taughtCodes.length
      ? db.submission.count({ where: { status: { not: "GRADED" }, courseCode: { in: taughtCodes } } })
      : Promise.resolve(0),
    // Exámenes reales (Quiz) de las lecciones de los cursos del usuario, con
    // preguntas y opciones ordenadas por posición. Una sola consulta (sin N+1).
    quizCourseIds.length
      ? db.quiz.findMany({
          where: { lesson: { module: { courseId: { in: quizCourseIds } } } },
          include: { questions: { orderBy: { position: "asc" }, include: { options: { orderBy: { position: "asc" } } } } },
        })
      : Promise.resolve([]),
    // Módulos de TODOS los cursos inscritos del estudiante (Moodle multi-curso):
    // el dashboard usa el primero; S.course/coursesContent navegan cualquiera.
    !isTeacher && enrolledIds.size
      ? db.module.findMany({ where: { courseId: { in: [...enrolledIds] } }, include: { lessons: { orderBy: { position: "asc" } } }, orderBy: [{ courseId: "asc" }, { position: "asc" }] })
      : Promise.resolve([]),
    // Programas del coach (STUDENT): no depende de resultados de esta ola → paralelo.
    studentCoach
      ? db.course.findMany({
          where: { teacherId: studentCoach.id },
          orderBy: { position: "asc" },
          select: { id: true, code: true, name: true, nameEn: true, format: true, modality: true, priceCents: true, color: true, summary: true, summaryEn: true },
        })
      : Promise.resolve([]),
    // Mi reseña del curso principal: solo depende de me + mainCourse (ya resueltos) → paralelo.
    me && effMainCourse
      ? db.review.findUnique({ where: { courseId_studentId: { courseId: effMainCourse.id, studentId: me.id } } })
      : Promise.resolve(null),
    // Spine ActivityEvent (PRD §4 + §8): últimos 60 eventos del usuario, UNA sola
    // consulta para dos consumidores — DB.activity usa los primeros 15 (desc) y
    // DB.lifetime.journey los 60 invertidos a orden cronológico (asc).
    me
      ? db.activityEvent.findMany({ where: { userId: me.id }, orderBy: { createdAt: "desc" }, take: 60 })
      : Promise.resolve([]),
    // --- Debate Hub (PRD §6) — solo para roles CON sesión (me existe) ---------
    // history + recentForm: DebateRecord del usuario con su RatingUpdate 1:1.
    // take 50 (history); recentForm usa los primeros 5 (ya vienen desc).
    me
      ? db.debateRecord.findMany({
          where: { userId: me.id },
          orderBy: { recordedAt: "desc" },
          take: 50,
          include: { rating: true },
        })
      : Promise.resolve([]),
    // analytics.criteria: promedio de RubricScore por criterio across los ballots
    // del usuario. Cargamos las RubricScore de los ballots de sus DebateRecord.
    me
      ? db.rubricScore.findMany({
          where: { ballot: { debate: { userId: me.id } } },
          // [F3.3] Guard contra crecimiento sin límite (~5 filas/debate). Cap alto que NO
          // distorsiona el promedio por criterio en uso realista (>1000 scores ≈ >200 debates).
          // orderBy id desc (cuid ~cronológico) → si algún usuario superara el cap, el promedio
          // reflejaría sus debates más recientes. El select ya proyecta 2 campos mínimos.
          orderBy: { id: "desc" },
          take: 1000,
          select: { criterion: true, score: true },
        })
      : Promise.resolve([]),
    // leaderboard.rows: top 50 usuarios por debateRating desc. [GOAL G3] La tabla es la
    // MISMA para cualquiera que la mire (el "mi posición" se calcula aparte, por usuario),
    // así que se cachea globalmente: 10 alumnos entrando a la vez = 1 sola query.
    me
      ? cached("leaderboard:top50", GLOBAL_TTL_MS, () =>
          db.user.findMany({
            where: { ageBand: { not: "minor" }, leaderboardOptIn: true }, // [P0-2] menores fuera; [GAMIFICATION-1 §9] solo quienes optaron por aparecer
            orderBy: { debateRating: "desc" },
            take: 50,
            select: { id: true, name: true, initials: true, debateRating: true, debateTier: true },
          }))
      : Promise.resolve([]),
    // Rank real del usuario en el leaderboard global: nº de usuarios con
    // debateRating ESTRICTAMENTE mayor + 1 (sirve aunque no esté en el top 50).
    me ? db.user.count({ where: { ageBand: { not: "minor" }, leaderboardOptIn: true, debateRating: { gt: me.debateRating } } }) : Promise.resolve(0),
    // "Mis reservas" (PRD §7): bookings del STUDENT con su escrow (precio/estado).
    me && me.role === "STUDENT"
      ? db.booking.findMany({ where: { studentId: me.id }, include: { escrow: true }, orderBy: { slotAt: "desc" }, take: 100 })
      : Promise.resolve([]),
    // Parent Portal (PRD §11): vínculos del padre. [MINORS-CONSENT-01 §11.3] Carga ACTIVE
    // (hijos del portal) + PENDING (solicitudes que el padre debe confirmar). Incluye el
    // student para mostrar nombre/email en la tarjeta de confirmación. Downstream filtra por status.
    me && me.role === "PARENT"
      ? db.guardianship.findMany({ where: { parentId: me.id, status: { in: ["ACTIVE", "PENDING"] } }, include: { student: { select: { id: true, name: true, email: true, initials: true, ageBand: true } } }, orderBy: { createdAt: "asc" } })
      : Promise.resolve([]),
    // [BUG vínculo-padre §11.3] Solicitudes de tutela que un PARENT reclamó sobre ESTE alumno
    // (initiatedBy="parent", status PENDING) — el lado que faltaba: el alumno debe poder VER y
    // CONFIRMAR/RECHAZAR esa solicitud (PATCH /api/guardianship). Antes un vínculo parent-initiated
    // quedaba PENDING para siempre porque nada mostraba la solicitud del lado del menor.
    me && me.role === "STUDENT"
      ? db.guardianship.findMany({ where: { studentId: me.id, status: "PENDING", initiatedBy: "parent" }, include: { parent: { select: { id: true, name: true, email: true, initials: true } } }, orderBy: { createdAt: "asc" } })
      : Promise.resolve([]),
    // PRD §8 ledger: torneos en los que el usuario se ha registrado. [PERF-P] Antes era un
    // `count` y ADEMÁS un `include registrations` dentro de la consulta de torneos: dos
    // sentencias sobre la misma tabla. Una sola findMany de una columna sirve a las dos
    // (el nº para el ledger, el Set de ids para el flag `registered`).
    me ? db.tournamentRegistration.findMany({ where: { userId: me.id }, select: { tournamentId: true } }) : Promise.resolve([] as Array<{ tournamentId: string }>),
    // Coach Workspace (PRD §7.5): TODOS los bookings donde el usuario es el coach,
    // con su escrow (inbox + earnings se derivan en JS, una sola consulta).
    isTeacher && me
      // [ENT-08] Acota el inbox del coach (antes sin límite → degradaba para coaches de
      // alto volumen). 200 reservas recientes cubren agenda próxima + historial mostrado.
      ? db.booking.findMany({ where: { coachId: me.id }, include: { escrow: true }, orderBy: { slotAt: "desc" }, take: 200 })
      : Promise.resolve([]),
    // Coach Workspace (PRD §7.5): perfil propio del coach, SIEMPRE fresco de la DB.
    // [PERF-P] Antes solo corría si el perfil NO estaba en el browse (perfil desactivado).
    // Ahora que el browse va por micro-caché global (30 s), el coach no puede leer su propio
    // perfil de ahí: acabaría viendo su edición de tarifa/paquetes/disponibilidad con retraso.
    // Esta consulta tiene PRECEDENCIA sobre la copia cacheada (ver `myCoachProfile` abajo) y
    // cuesta lo mismo que costaba el perfil en el browse, que ya no se paga.
    isTeacher && me
      ? db.coachProfile.findUnique({
          where: { userId: me.id },
          include: {
            packages: { orderBy: { position: "asc" } },
            availability: { orderBy: [{ weekday: "asc" }, { startMin: "asc" }] },
          },
        })
      : Promise.resolve(null),
    // [BUG-ROSTER-REAL] A partir de aquí: agregaciones EN BATCH (una consulta para TODO el
    // roster, sin N+1) que alimentan computeRosterMetrics. Todas condicionadas a que haya
    // roster (isTeacher && rosterIds.length) — para STUDENT/PARENT/ADMIN-sin-curso quedan [].
    // grade%: promedio de Submission GRADED del alumno EN ESTE CURSO (courseCode).
    isTeacher && rosterIds.length
      ? db.submission.groupBy({ by: ["userId"], where: { status: "GRADED", grade: { not: null }, userId: { in: rosterIds }, courseCode: rosterCourseCode }, _avg: { grade: true } })
      : Promise.resolve([] as any[]),
    // grade% fallback: QuizAttempt no tiene courseId (limitación de schema) — se acota por
    // lessonTitle a las lecciones REALES de este curso (mismo criterio ya usado para
    // correlacionar QuizAttempt↔lección en el resto de queries.ts, p.ej. gradeRows del alumno).
    isTeacher && rosterIds.length && rosterLessonTitles.length
      ? db.quizAttempt.findMany({ where: { userId: { in: rosterIds }, lessonTitle: { in: rosterLessonTitles } }, select: { userId: true, score: true, total: true } })
      : Promise.resolve([] as any[]),
    // attendance%: Booking del alumno CON ESTE coach, agrupado por estado.
    isTeacher && rosterIds.length
      ? db.booking.groupBy({ by: ["studentId", "status"], where: { coachId: me?.id, studentId: { in: rosterIds } }, _count: { _all: true } })
      : Promise.resolve([] as any[]),
    // progress%: LessonProgress done de las lecciones contables de este curso.
    isTeacher && rosterIds.length && rosterLessonIds.length
      ? db.lessonProgress.findMany({ where: { done: true, userId: { in: rosterIds }, lessonId: { in: rosterLessonIds } }, select: { userId: true } })
      : Promise.resolve([] as any[]),
    // last access REAL (sin acotar por fecha): último ActivityEvent de cada alumno, cualquiera.
    isTeacher && rosterIds.length
      ? db.activityEvent.groupBy({ by: ["userId"], where: { userId: { in: rosterIds } }, _max: { createdAt: true } })
      : Promise.resolve([] as any[]),
    // engagement/trend: ActivityEvent de los últimos 14 días (ventana acotada; se bucketiza
    // en JS en last7 vs prior7 para el trend up/down/flat).
    isTeacher && rosterIds.length
      ? db.activityEvent.findMany({ where: { userId: { in: rosterIds }, createdAt: { gte: rosterActivityCutoff } }, select: { userId: true, createdAt: true } })
      : Promise.resolve([] as any[]),
    // [DASHBOARD] Ranking de XP del MES EN CURSO — la tarjeta "Clasificación de {mes}".
    // Es un ranking DISTINTO al del Debate Hub (ese mide rating Glicko de por vida y NO
    // se toca): aquí la fuente es ActivityEvent (xp + createdAt), el ledger fechado.
    // Mismas reglas de privacidad que el ranking por rating: leaderboardOptIn y menores
    // FUERA — el filtro se aplica sobre User, así que un menor puede sumar XP y nunca sale.
    // Global e idéntico para todos (el "mi puesto" se deriva de esta misma lista) → caché
    // con la clave del mes, para que el cambio de mes nunca sirva un board caducado.
    // Envuelto en optionalRows: si la agregación falla, el board queda vacío y la tarjeta
    // cae sola al ranking por rating (la degradación que ya está diseñada), en vez de 500.
    me
      ? optionalRows("leaderboard:monthXp", () => cached(`leaderboard:monthXp:${monthKey}`, GLOBAL_TTL_MS, async () => {
          const agg = await db.activityEvent.groupBy({
            by: ["userId"],
            where: { createdAt: { gte: monthStart, lt: monthEnd } },
            _sum: { xp: true },
            orderBy: { _sum: { xp: "desc" } },
            take: 200,
          });
          const scored = agg.filter((r: any) => (r._sum?.xp ?? 0) > 0);
          if (!scored.length) return [] as any[];
          const eligible = await db.user.findMany({
            where: { id: { in: scored.map((r: any) => r.userId) }, ageBand: { not: "minor" }, leaderboardOptIn: true },
            select: { id: true, name: true, initials: true, debateRating: true, debateTier: true },
          });
          const byId = new Map(eligible.map((u) => [u.id, u]));
          return scored
            .filter((r: any) => byId.has(r.userId))
            .map((r: any) => ({ ...byId.get(r.userId)!, monthXp: r._sum?.xp ?? 0 }));
        }))
      : Promise.resolve([] as any[]),
    // [GAMIFICATION-2 §9] Fechas de los últimos 70 días para la racha real (con grace de 1 día).
    // La racha necesita cobertura por DÍAS, no por eventos: activityEvents está topado a take:60
    // (feed/journey) y un usuario muy activo llenaría esos 60 cupos con pocos días → racha
    // truncada. [PERF-P] Solo depende de `me` (ya resuelto): estaba en un `await` SUELTO justo
    // después de esta ola, o sea una ola entera de ida y vuelta para una única consulta.
    me
      ? db.activityEvent.findMany({
          where: { userId: me.id, createdAt: { gte: new Date(Date.now() - 70 * 86400000) } },
          select: { createdAt: true },
        })
      : Promise.resolve([] as Array<{ createdAt: Date }>),
    // [REVIEW-CHAIN §7.4] Coaches que el alumno YA reseñó (por cualquier curso o reseña directa)
    // → no volver a ofrecer "Dejar reseña" para ese coach. [PERF-P] Igual que streakRows: solo
    // depende de `me`, y estaba en otro `await` suelto ~600 líneas más abajo (otra ola).
    me && me.role === "STUDENT"
      ? db.review.findMany({ where: { studentId: me.id }, select: { teacherId: true } })
      : Promise.resolve([] as Array<{ teacherId: string }>),
    // [ENT-08] Totales financieros y de éxito del Coach Workspace. NO pueden derivar del array
    // de bookings (capado a take:200 para el inbox): un coach con >200 reservas subreportaría
    // sus ingresos de por vida. [PERF-P] Solo dependen de me.id → suben a esta ola; antes eran
    // un Promise.all propio dentro del bloque `if (isTeacher)`, es decir una 5ª ola en serie
    // que solo pagaban profesores y admins.
    isTeacher && me
      ? db.escrowTxn.aggregate({ where: { status: "HELD", booking: { coachId: me.id } }, _sum: { amountCents: true } })
      : Promise.resolve(null),
    isTeacher && me
      ? db.escrowTxn.aggregate({ where: { status: "RELEASED", booking: { coachId: me.id } }, _sum: { amountCents: true } })
      : Promise.resolve(null),
    isTeacher && me
      ? db.escrowTxn.aggregate({ where: { status: "RELEASED", releasedAt: { gte: monthStart }, booking: { coachId: me.id } }, _sum: { amountCents: true } })
      : Promise.resolve(null),
    isTeacher && me
      ? db.booking.count({ where: { coachId: me.id, status: "COMPLETED" } })
      : Promise.resolve(0),
    isTeacher && me
      ? db.booking.groupBy({ by: ["studentId"], where: { coachId: me.id }, _count: { studentId: true } })
      : Promise.resolve([] as any[]),
    /* [ADM] Las TRES lecturas del flujo de admisión viajan en ESTA ola (no en una serie nueva):
       las tres dependen solo de `me` y de `rosterIds`, que ya están resueltos antes del
       Promise.all, así que no cuestan un round-trip extra — comparten el de la ola. */
    // (a) La admisión del PROPIO alumno: es lo que decide si el arranque lo lleva al wizard.
    admissionModel && me && me.role === "STUDENT"
      ? admissionRows("me", () => admissionModel.findMany({ where: { studentId: me.id }, take: 1, select: ADMISSION_SELECT }))
      : Promise.resolve(null),
    // (b) Progreso del ROSTER del coach: solo sus alumnos (mismos ids que el resto del panel),
    //     y solo timestamps → el coach ve por qué paso va cada quien, nada del formulario.
    admissionModel && isTeacher && rosterIds.length
      ? admissionRows("roster", () => admissionModel.findMany({ where: { studentId: { in: rosterIds } }, select: { studentId: true, ...ADMISSION_SELECT } }))
      : Promise.resolve(null),
    // (c) Plataforma (SOLO ADMIN): las 200 admisiones movidas más recientemente, con el nombre
    //     del alumno y su ageBand —el admin ya administra ambos— para poder señalar el caso
    //     que importa legalmente: MENOR con el formulario enviado y SIN firma del tutor.
    admissionModel && me?.role === "ADMIN"
      ? admissionRows("platform", () => admissionModel.findMany({
          orderBy: { updatedAt: "desc" },
          take: 200,
          select: { studentId: true, ...ADMISSION_SELECT, student: { select: { id: true, name: true, initials: true, ageBand: true } } },
        }))
      : Promise.resolve(null),
  ]);

  // Entregas calificadas (GRADED) derivadas en JS de la consulta única de entregas.
  const mySubsGraded = (mySubs as any[]).filter((s) => s.status === "GRADED");

  // [BUG-ROSTER-REAL] Reduce las agregaciones batch del roster a Maps por alumno — O(1) al
  // construir base.students más abajo, sin volver a tocar la DB por estudiante (sin N+1).
  const rosterGradeByStudent = new Map<string, number>(
    (rosterGradeAgg as any[])
      .filter((r: any) => r._avg?.grade != null)
      .map((r: any) => [r.userId, Math.round(r._avg.grade)]),
  );
  const rosterQuizAcc = new Map<string, { sum: number; n: number }>();
  (rosterQuizRows as any[]).forEach((q: any) => {
    if (!q.total) return; // examen sin preguntas — no aporta señal
    const acc = rosterQuizAcc.get(q.userId) || { sum: 0, n: 0 };
    acc.sum += (q.score / q.total) * 100;
    acc.n += 1;
    rosterQuizAcc.set(q.userId, acc);
  });
  const rosterQuizAvgByStudent = new Map<string, number>(
    [...rosterQuizAcc.entries()].map(([uid, v]) => [uid, Math.round(v.sum / v.n)]),
  );
  const rosterBookingByStudent = new Map<string, { completed: number; relevant: number }>();
  (rosterBookingAgg as any[]).forEach((r: any) => {
    const cur = rosterBookingByStudent.get(r.studentId) || { completed: 0, relevant: 0 };
    const n = r._count?._all || 0;
    if (r.status === "COMPLETED") { cur.completed += n; cur.relevant += n; }
    else if (r.status === "CONFIRMED") { cur.relevant += n; }
    rosterBookingByStudent.set(r.studentId, cur);
  });
  const rosterProgressCountByStudent = new Map<string, number>();
  (rosterProgressRows as any[]).forEach((p: any) => {
    rosterProgressCountByStudent.set(p.userId, (rosterProgressCountByStudent.get(p.userId) || 0) + 1);
  });
  const rosterLessonTotal = rosterLessonIds.length;
  const rosterLastEventByStudent = new Map<string, Date>(
    (rosterLastEventAgg as any[])
      .filter((r: any) => r._max?.createdAt)
      .map((r: any) => [r.userId, r._max.createdAt as Date]),
  );
  // Bucketiza los ActivityEvent de los últimos 14 días en last7 (0-6 días) / prior7 (7-13 días)
  // usando el día calendario RD (mismo criterio que computeStreak/lifecycleState de arriba).
  const rosterTodayNum = Math.floor((rosterNowMs + RD_OFFSET_MS) / 86400000);
  const rosterLast7ByStudent = new Map<string, number>();
  const rosterPrior7ByStudent = new Map<string, number>();
  (rosterRecentEvents as any[]).forEach((e: any) => {
    const daysAgo = rosterTodayNum - dayNumRD(e.createdAt);
    if (daysAgo < 0 || daysAgo >= 14) return;
    const bucket = daysAgo < 7 ? rosterLast7ByStudent : rosterPrior7ByStudent;
    bucket.set(e.userId, (bucket.get(e.userId) || 0) + 1);
  });

  /* [ADM] Progreso de admisión del roster del coach, indexado por alumno (O(1) al construir
     base.students, sin N+1). Un alumno SIN fila no aparece en el Map: se resuelve con
     admissionProgress(null) = 0 de 4, que es exactamente su estado. */
  const admissionByStudent = new Map<string, AdmissionProgress>(
    (rosterAdmissionRows || []).map((r: any) => [r.studentId as string, admissionProgress(r)]),
  );

  // [GAMIFICATION-2 §9] Racha real (con grace de 1 día) — las fechas ya vienen de la ola de
  // arriba (streakRows: últimos 70 días, índice [userId,createdAt]).
  const streakDays = computeStreak(streakRows as any[]);
  // [DASHBOARD-ACCESS-2 §4] Ciclo de vida: solo necesita el evento MÁS reciente, que el
  // take:60 desc siempre incluye (incluso si fue hace meses → 'lapsed' correcto).
  const lifecycle = lifecycleState(activityEvents as any[], !!(me && me.role === "STUDENT" && !me.placedAt));

  // [l7] Origen de courseModules (dashboard): profesor → PF-101 (pfModules);
  // estudiante → módulos de su PRIMER curso inscrito. studentModules ahora trae
  // TODOS los cursos inscritos (Moodle multi-curso), así que filtramos al primero
  // para mantener el contrato del dashboard; coursesContent (abajo) trae el resto.
  const modulesForDashboard = isTeacher
    ? ((taughtCourses[0]?.modules as any[]) ?? [])
    : (studentModules as any[]).filter((m) => m.courseId === firstEnrolledCourseId);

  // Mapa lessonId -> quiz (forma del contrato). Para alumno sin 'correct'.
  const quizByLessonMap = new Map<string, any>();
  (quizRows || []).forEach((q: any) => {
    quizByLessonMap.set(q.lessonId, buildQuiz(q, isTeacher));
  });
  // DB.quizByLesson: objeto { [lessonId]: quiz } con la misma forma.
  const quizByLesson: Record<string, any> = {};
  quizByLessonMap.forEach((quiz, lessonId) => {
    quizByLesson[lessonId] = quiz;
  });

  // Conjunto de ids de lecciones completadas por el usuario (progreso real).
  const doneSet = new Set((myProgress || []).map((p: any) => p.lessonId));

  // [P2] Gating de prerrequisito: una lección está bloqueada si su releaseAfter
  // (lección previa requerida) aún no está completada. Respeta el 'locked' estático
  // que el profesor haya puesto a mano.
  const lessonLocked = (l: any): boolean =>
    l?.locked === true || (l?.releaseAfterId ? !doneSet.has(l.releaseAfterId) : false);

  // Total de lecciones por curso inscrito y cuántas ha completado el alumno.
  // [PERF-P] Para el alumno las filas salen de studentModules (mismos módulos → mismas
  // lecciones, ya cargadas); solo el profesor/admin inscrito paga la consulta dedicada.
  const enrolledLessonRows: any[] = isTeacher
    ? (enrolledLessons as any[])
    : (studentModules as any[]).flatMap((m: any) =>
        (m.lessons || []).map((l: any) => ({ id: l.id, hidden: l.hidden, module: { courseId: m.courseId, hidden: m.hidden } })),
      );
  const totalByCourse = new Map<string, number>();
  const doneByCourse = new Map<string, number>();
  (enrolledLessonRows || []).forEach((l: any) => {
    const cid = l.module?.courseId;
    if (!cid) return;
    if (l.hidden || l.module?.hidden) return; // lo oculto por el profesor no cuenta para el progreso del alumno
    totalByCourse.set(cid, (totalByCourse.get(cid) || 0) + 1);
    if (doneSet.has(l.id)) doneByCourse.set(cid, (doneByCourse.get(cid) || 0) + 1);
  });
  const courseProgress = (courseId: string): number => {
    const total = totalByCourse.get(courseId) || 0;
    if (total === 0) return 0;
    return Math.round(((doneByCourse.get(courseId) || 0) / total) * 100);
  };

  // --- Notas reales del estudiante (Submission GRADED + QuizAttempt) --------
  // Letra derivada del score numérico (>=90 A, >=85 B+, >=80 B, >=70 C, si no —).
  const letterFor = (score: number): string => {
    if (score >= 90) return "A";
    if (score >= 85) return "B+";
    if (score >= 80) return "B";
    if (score >= 70) return "C";
    return "—";
  };
  const gradeRows: any[] = [];
  // Calificaciones del alumno: incluye el FEEDBACK escrito del coach (PRD §6.5/§7.5
  // — el alumno DEBE poder leer los comentarios, no solo la nota numérica).
  (mySubsGraded || []).forEach((s: any) => {
    if (s.grade == null) {
      gradeRows.push({ activity: esc(s.activity), score: lang === "en" ? "In review" : "En revisión", letter: "—", kind: lang === "en" ? "Submission" : "Entrega", status: s.status, feedback: esc(s.feedback || "") });
    } else {
      const sc = s.grade;
      gradeRows.push({ activity: esc(s.activity), score: sc, letter: letterFor(sc), kind: lang === "en" ? "Submission" : "Entrega", status: "GRADED", feedback: esc(s.feedback || "") });
    }
  });
  (myQuizzes || []).forEach((q: any) => {
    const sc = q.total > 0 ? Math.round((q.score / q.total) * 100) : 0;
    gradeRows.push({ activity: esc(q.lessonTitle), score: sc, letter: letterFor(sc), kind: "Examen", status: "GRADED", feedback: "" });
  });
  // Entregas del alumno por nombre de actividad (para que S.assignment muestre el
  // estado: ya entregaste / en revisión / calificada + nota + feedback + archivo).
  // [i18n] Indexado por lessonId (clave ESTABLE, independiente del idioma del título) Y por
  // activity (fallback legacy para entregas viejas sin lessonId). S.assignment busca por id primero.
  const mySubmissionsByActivity: Record<string, any> = {};
  const mySubmissionsByLesson: Record<string, any> = {};
  (mySubs as any[]).forEach((s: any) => {
    if (!mySubmissionsByActivity[s.activity]) {
      const entry = {
        id: s.id, activity: esc(s.activity), status: s.status, grade: s.grade ?? null,
        feedback: esc(s.feedback || ""), kind: s.kind, fileUrl: safeUrl(s.fileUrl),
        fileName: esc(s.fileName || ""), textBody: esc(s.textBody || ""), when: esc(s.createdLabel || ""),
        letter: typeof s.grade === "number" ? letterFor(s.grade) : "—",
      };
      mySubmissionsByActivity[s.activity] = entry;
      if (s.lessonId && !mySubmissionsByLesson[s.lessonId]) mySubmissionsByLesson[s.lessonId] = entry;
    }
  });
  const numericScores = gradeRows.map((r) => r.score).filter((s) => typeof s === "number") as number[];
  const myGrades = {
    rows: gradeRows,
    avg: numericScores.length ? Math.round(numericScores.reduce((a, b) => a + b, 0) / numericScores.length) : 0,
    submitted: numericScores.length,
    total: gradeRows.length,
    best: numericScores.length ? Math.max(...numericScores) : 0,
  };

  // Insignias automáticas (derivadas de logros reales del usuario).
  // mySubs ya se cargó arriba (consulta única de entregas del usuario).
  const lvl = derivedLevelName; // [fix] rango DERIVADO del XP (no el User.level almacenado) para los badges Semifinalista/Campeón
  const gotBadge = (name: string) => {
    switch (name) {
      case "Primer discurso": return mySubs.length >= 1;
      case "Racha de 7 días": return streakDays >= 7;
      case "Refutador": return (me?.xp ?? 0) >= 1500;
      case "Semifinalista": return ["OTR Competitor", "OTR Strategist", "OTR Laureate"].includes(lvl);
      case "Voz de oro": return mySubs.some((s) => (s.grade ?? 0) >= 95);
      case "Campeón": return lvl === "OTR Laureate";
      default: return false;
    }
  };

  // --- Perfil de coach -----------------------------------------------------
  // Construye el objeto coachProfile a partir de un usuario coach, sus programas
  // (cursos que imparte) y un arreglo de reviews ya cargadas.
  function buildCoachProfile(
    coach: any,
    programs: any[],
    reviews: any[],
  ) {
    const revs = (reviews || []).map((r) => ({
      author: esc(r.student?.name),
      ini: esc(r.student?.initials),
      rating: r.rating,
      body: esc(r.body),
      when: whenLabel(r.createdAt, lang),
    }));
    return {
      id: coach?.id || "",
      name: esc(coach?.name),
      initials: esc(coach?.initials),
      headline: esc(coach?.headline),
      bio: esc(coach?.bio),
      teachingStyle: esc(coach?.teachingStyle),
      formatsList: formatsList(coach?.formats),
      location: esc(coach?.location),
      rating: avgRating((reviews || []).map((r) => r.rating)),
      reviewCount: (reviews || []).length,
      programs: (programs || []).map((c) => ({
        id: c.id,
        code: c.code,
        name: esc(pickLang(c.name, c.nameEn)),
        format: esc(c.format),
        modality: esc(c.modality),
        price: c.priceCents,
        color: c.color,
        summary: esc(pickLang(c.summary, c.summaryEn)),
      })),
      reviews: revs,
    };
  }

  let coachProfile: any;
  if (isTeacher) {
    // TEACHER/ADMIN: su propio perfil con sus programas y reseñas recibidas.
    const myReviews = taughtCourses.flatMap((c: any) =>
      (c.reviews || []).map((r: any) => ({ ...r, _courseName: c.name })),
    );
    coachProfile = buildCoachProfile(me, taughtCourses, myReviews);
  } else {
    // STUDENT: el coach del curso principal con sus programas y reseñas.
    // coachPrograms ya se cargó en paralelo arriba (Promise.all).
    const coach = studentCoach;
    coachProfile = buildCoachProfile(coach, coachPrograms, effMainCourse?.reviews ?? []);
  }

  // --- Mi reseña (del usuario actual para el curso principal) ---------------
  // myReviewRow ya se cargó en paralelo arriba (Promise.all).
  let myReview: { rating: number; body: string } | null = null;
  if (myReviewRow) {
    myReview = { rating: myReviewRow.rating, body: esc(myReviewRow.body) };
  }
  // VERIFIED-BOOKING-ONLY (PRD §7.4): puede reseñar al coach principal solo si
  // tiene una sesión 1:1 COMPLETADA con él (deriva de myBookingRows, sin query extra).
  const canReviewCoach = !!(
    studentCoach &&
    (myBookingRows as any[]).some((b) => b.coachId === studentCoach.id && b.status === "COMPLETED")
  );

  // --- Reseñas recibidas (solo TEACHER/ADMIN) -------------------------------
  const reviewsReceived = isTeacher
    ? taughtCourses.flatMap((c: any) =>
        (c.reviews || []).map((r: any) => ({
          author: esc(r.student?.name),
          ini: esc(r.student?.initials),
          rating: r.rating,
          body: esc(r.body),
          when: whenLabel(r.createdAt, lang),
          programName: esc(c.name),
        })),
      )
    : [];

  // --- Habilidades (radar) del estudiante: [{ skill, score }] -------------
  // Solo se exponen las 6 dimensiones del contrato; score se clampa 0..100.
  const skillScore = new Map<string, number>();
  (myStudentSkills || []).forEach((s: any) => {
    skillScore.set(s.skill, Math.max(0, Math.min(100, Number(s.score) || 0)));
  });
  const skills = OTR_SKILLS
    .filter((name) => skillScore.has(name))
    .map((name) => ({ skill: name, score: skillScore.get(name) as number }));

  // --- Certificados reales del estudiante: [{ id, title, programName, issuedAt }]
  const courseNameById = new Map<string, string>();
  allCourses.forEach((c) => courseNameById.set(c.id, c.name));
  const certificates = (myCertificates || []).map((c: any) => ({
    id: c.id,
    title: esc(c.title),
    programName: esc(courseNameById.get(c.courseId) || ""),
    issuedAt: monthYearLabel(c.issuedAt, lang),
  }));

  // --- Arsenal APAGADO (PRD-estricto): no existe en el PDF (el motion library
  // §6.4 es otra cosa y es Fase 2). La pantalla está desregistrada y el API
  // responde 410; no se envía ningún recurso al cliente.
  const arsenal: any[] = [];

  // --- Debate Hub (PRD §6): DB.debate / DB.leaderboard / DB.tournaments -----
  // Construidos a partir de los datos cargados en paralelo arriba. Sólo se
  // exponen cuando hay sesión (me); si no, objetos vacíos coherentes con la UI.
  const records = (debateRecords || []) as any[];

  // recentForm: últimos 5 records (ya vienen desc) → { result, opponent, delta }.
  // delta = ratingAfter - ratingBefore del RatingUpdate 1:1 (0 si la ronda no se
  // adjudicó / no tiene RatingUpdate — anti-gaming: el rating sólo mueve en ronda adjudicada).
  const recentForm = records.slice(0, 5).map((r) => ({
    result: r.result,
    opponent: esc(r.opponent || ""),
    delta: r.rating ? Math.round(r.rating.ratingAfter - r.rating.ratingBefore) : 0,
  }));

  // history: hasta 50 records con ratingAfter/source/when (label relativa).
  const debateHistory = records.map((r) => ({
    id: r.id,
    format: esc(r.format),
    side: esc(r.side || ""),
    opponent: esc(r.opponent || ""),
    result: r.result,
    source: r.source,
    eventName: esc(r.eventName || ""),
    roundLabel: esc(r.roundLabel || ""),
    ratingAfter: r.rating ? Math.round(r.rating.ratingAfter) : null,
    // [§6.2] adjudicada = tiene RatingUpdate 1:1 (el rating solo se mueve en ronda juzgada).
    // El overview separa "rondas adjudicadas" de los auto-reportes de práctica.
    adjudicated: !!r.rating,
    // [REQ-1] estado visible de la solicitud: el alumno distingue pendiente/rechazada/aprobada.
    status: r.rejectedAt ? "rejected" : (r.adjudicated || r.rating) ? "approved" : "pending",
    rejectionReason: esc(r.rejectionReason || ""),
    when: whenLabel(r.recordedAt, lang),
  }));

  // analytics.byFormat / bySide: conteo W-L-D por formato y por lado (PRO/CON).
  const tally = () => ({ wins: 0, losses: 0, draws: 0, total: 0 });
  const byFormatMap = new Map<string, ReturnType<typeof tally>>();
  const bySideMap = new Map<string, ReturnType<typeof tally>>();
  const bump = (map: Map<string, ReturnType<typeof tally>>, key: string, result: string) => {
    if (!key) return;
    const t = map.get(key) || tally();
    if (result === "WIN") t.wins++;
    else if (result === "LOSS") t.losses++;
    else if (result === "DRAW") t.draws++;
    t.total++;
    map.set(key, t);
  };
  records.forEach((r) => {
    bump(byFormatMap, r.format, r.result);
    if (r.side) bump(bySideMap, r.side, r.result);
  });
  const byFormat = [...byFormatMap.entries()].map(([format, t]) => ({ format: esc(format), ...t }));
  const bySide = [...bySideMap.entries()].map(([side, t]) => ({ side: esc(side), ...t }));

  // analytics.criteria: promedio (0-10, 1 decimal) de RubricScore por criterio,
  // across todos los ballots del usuario. Orden fijo de la rúbrica del PRD §6.
  const RUBRIC_CRITERIA = ["Argumentation", "Rebuttal", "Delivery", "Evidence/Research", "Crossfire"];
  const critSum = new Map<string, { sum: number; n: number }>();
  (debateCriteriaScores || []).forEach((s: any) => {
    const acc = critSum.get(s.criterion) || { sum: 0, n: 0 };
    acc.sum += Number(s.score) || 0;
    acc.n++;
    critSum.set(s.criterion, acc);
  });
  const criteria = RUBRIC_CRITERIA.map((criterion) => {
    const acc = critSum.get(criterion);
    return { criterion, avg: acc && acc.n ? Math.round((acc.sum / acc.n) * 10) / 10 : 0 };
  });

  // PRD §13.2: "Full analytics" del Debate Hub es beneficio Pro. Para free el tab
  // Analytics se recorta a { locked:true } — la barrera vive en los DATOS (free
  // NUNCA recibe el desglose por formato/lado/criterio), no solo en la UI. Para
  // pro/elite se emite completo. Así el beneficio es verificable.
  const isProMember = me?.membership === "pro" || me?.membership === "elite";
  const debateAnalytics = isProMember ? { byFormat, bySide, criteria } : { locked: true };

  const debate = me
    ? {
        rating: Math.round(me.debateRating ?? 1500),
        rd: Math.round(me.debateRd ?? 350),
        tier: me.debateTier || "Novato",
        provisional: (me.debateRd ?? 350) >= PROVISIONAL_RD,
        // [RATING-2 §6.2] Speaker Rating: promedio de oratoria (0-100), separado del W/L.
        // null cuando aún no hay rondas juzgadas (no se muestra una métrica vacía).
        speakerAvg: (me.speakerRounds ?? 0) > 0 ? Math.round(me.speakerAvg ?? 0) : null,
        speakerRounds: me.speakerRounds ?? 0,
        recentForm,
        history: debateHistory,
        analytics: debateAnalytics,
      }
    : null;

  // --- Leaderboard: top 50 por debateRating + posición del usuario ----------
  const initialsFrom = (name: string): string =>
    String(name || "")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0] || "")
      .join("")
      .toUpperCase();
  // [DASHBOARD] Premio del puesto (solo podio): puesto → texto, leído de SeasonPrize.
  // Contenido editable en DB; la vista NO lleva los textos hardcodeados.
  // [RONDA3 · i18n] El premio se sirve en el idioma activo con el MISMO pickLang que el
  // resto del contenido de catálogo: `textEn` si el usuario está en EN y existe; si no, el
  // ES. Antes la card en inglés pintaba "Beca completa · próximo módulo" bajo una interfaz
  // en inglés (la fuga que se ve en la captura del cliente). El premio sigue viviendo en la
  // DB —editable sin deploy—, que es la razón por la que existe SeasonPrize.
  const prizeByRank = new Map<number, string>(
    (seasonPrizes || []).map((p: any) => [p.rank, pickLang(p.text, p.textEn)]),
  );

  // [DASHBOARD] CONTRATO DE LA TARJETA DE CLASIFICACIÓN (lo consume scr-core.ts):
  //   · Con `period` presente ⇒ la tabla es el ranking de XP del MES EN CURSO. La vista
  //     titula "Clasificación de {period.label}", la meta dice "Faltan {period.endsInDays}
  //     días · Premios al cierre" y la cifra de cada fila es `row.xp` con sufijo "XP".
  //   · Con `period: null` ⇒ la tabla es el ranking GLOBAL por rating Glicko de siempre
  //     (el mismo que mide el Debate Hub) y la cifra de la fila es `row.rating`, pelado.
  // La rama mensual solo se activa si HAY actividad fechada este mes: si nadie sumó XP,
  // se degrada al ranking por rating en vez de pintar una tabla vacía o un mes falso.
  const monthBoard = (monthXpBoard || []) as any[];
  const isMonthlyBoard = monthBoard.length > 0;
  const baseRow = (u: any, i: number) => ({
    rank: i + 1,
    name: esc(u.name),
    initials: esc(u.initials || initialsFrom(u.name)),
    rating: Math.round(u.debateRating ?? 1500),
    tier: u.debateTier || "Novato",
    you: u.id === me?.id,
  });
  // `prize` solo existe si hay un SeasonPrize para ese puesto (1º/2º/3º). Es de la
  // TEMPORADA del Aula: no se cuelga del ranking del Debate Hub.
  const withPrize = (row: any) => {
    const prize = prizeByRank.get(row.rank);
    return prize ? { ...row, prize } : row;
  };
  // Tabla del DEBATE HUB: siempre por rating Glicko-2 histórico, sin xp ni premios.
  // Es la que existía desde siempre y NO cambia por el ranking mensual del Aula.
  const ratingRowsOut = ((leaderboardRows || []) as any[]).slice(0, 50).map(baseRow);
  // Tabla del DASHBOARD: mensual si hay actividad; si no, la misma de rating.
  // `xp` SOLO existe en la mensual: un número sin significado claro en la tabla por
  // rating sería peor que no tenerlo.
  const leaderboardRowsOut = (isMonthlyBoard
    ? monthBoard.slice(0, 50).map((u: any, i: number) => ({ ...baseRow(u, i), xp: u.monthXp ?? 0 }))
    : ratingRowsOut.map((r) => ({ ...r }))
  ).map(withPrize);
  // Mi puesto: en la tabla mensual es el nº de usuarios ELEGIBLES con más XP del mes que
  // yo, +1 (sirva o no yo mismo de fila: sin actividad este mes quedo detrás de todos los
  // que sí la tuvieron). En la tabla por rating sigue siendo el conteo por debateRating.
  const myMonthXp = isMonthlyBoard ? (monthBoard.find((u: any) => u.id === me?.id)?.monthXp ?? 0) : 0;
  const myMonthRank = isMonthlyBoard
    ? monthBoard.filter((u: any) => (u.monthXp ?? 0) > myMonthXp).length + 1
    : 0;
  const leaderboard = me
    ? {
        rows: leaderboardRowsOut,
        me: {
          // El puesto DEBE hablar de la misma tabla que se está pintando, o el KPI
          // "#N Clasificación" de la cabecera contradiría la card de abajo.
          rank: isMonthlyBoard ? myMonthRank : (myLeaderboardAhead as number) + 1,
          rating: Math.round(me.debateRating ?? 1500),
          tier: me.debateTier || "Novato",
          ...(isMonthlyBoard ? { xp: myMonthXp } : {}),
        },
        period: isMonthlyBoard
          ? { label: monthNameLabel(nowForMonth, wantEn), endsInDays: daysLeftInMonth(nowForMonth) }
          : null,
      }
    : null;
  // [DASHBOARD] Tabla PROPIA del Debate Hub. Antes compartía objeto con la del Aula, y al
  // volverse mensual esa, el Hub pasó a listar por XP del mes mientras seguía rotulando
  // "ranking por rating Glicko-2" (Silvana, 1815, caía al 3.er puesto detrás de un 1720).
  // Son dos rankings distintos y ahora cada uno tiene el suyo: aquí, rating de por vida.
  const debateLeaderboard = me
    ? {
        rows: ratingRowsOut,
        me: {
          rank: (myLeaderboardAhead as number) + 1,
          rating: Math.round(me.debateRating ?? 1500),
          tier: me.debateTier || "Novato",
        },
      }
    : null;

  // --- Tournaments: UPCOMING|LIVE con flag `registered` del usuario ----------
  // [F6.2] Para STAFF (ADMIN|TEACHER) adjuntamos los campos CRUDOS editables (ageDivision,
  // entryCents, source, startsISO) que el modal de edición del Aula necesita para prefilar. No
  // se exponen al alumno (payload intacto). Los strings van escapados (contrato de escape): al
  // colocarse en un value="…" el navegador los decodifica de vuelta al valor real al editar.
  const isStaff = !!me && (me.role === "ADMIN" || me.role === "TEACHER");
  // [PERF-P] Ids de torneos en los que ESTE usuario está inscrito — sustituye al
  // `include registrations where userId` que impedía cachear la lista de torneos.
  const myTournamentRegIds = new Set((myTournamentRegRows as Array<{ tournamentId: string }>).map((r) => r.tournamentId));
  const tournaments = me
    ? (upcomingTournaments || []).map((t: any) => ({
        id: t.id,
        name: esc(t.name),
        format: esc(t.format),
        region: esc(t.region || ""),
        modality: esc(t.modality),
        startsLabel: t.startsAt ? eventDateLabel(t.startsAt, lang) : (lang === "en" ? "To be announced" : "Por anunciar"),
        status: t.status,
        // [GOAL E5 · moneda] "$" y no "RD$": es el símbolo ÚNICO que ya imprime money()
        // (app/lib/money.ts) en marketplace, coachwork, listings y padres. El torneo era el
        // último sitio que rotulaba una tercera moneda junto a precios en "$" de la misma
        // pantalla. Solo cambia la PRESENTACIÓN: entryCents no se toca.
        // [CIERRE · O5] "Gratis" estaba fijo en español: un alumno con la UI en inglés
        // leía "Free entry" en la etiqueta de al lado y "Gratis" en el torneo. Se traduce
        // con el mismo `lang` de la request que usa startsLabel dos líneas arriba.
        entryLabel: t.entryCents > 0 ? `$${(t.entryCents / 100).toLocaleString("es-DO")}` : (lang === "en" ? "Free" : "Gratis"),
        registered: myTournamentRegIds.has(t.id),
        ...(isStaff
          ? {
              ageDivision: esc(t.ageDivision || ""),
              entryCents: t.entryCents,
              source: t.source,
              startsISO: t.startsAt ? new Date(t.startsAt).toISOString().slice(0, 10) : "",
            }
          : {}),
      }))
    : [];

  // --- Marketplace (PRD §7): coaches activos para browse + perfil -----------
  // Etiqueta de precio en USD (los paquetes de coaching se cotizan en USD).
  const usdLabel = (cents: number): string => {
    const v = (Number(cents) || 0) / 100;
    return `$${v.toLocaleString("en-US", Number.isInteger(v) ? undefined : { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };
  // Etiqueta de slot "lun 16 jun · 4:00 PM" / "Mon, Jun 16 · 4:00 PM" (hora RD fija).
  const slotLabel = (d: Date | string): string => fmtDateTimeRD(d, lang);
  // Lista separada por comas → array escapado (specialties, languages).
  const splitList = (s?: string | null): string[] =>
    String(s ?? "").split(",").map((x) => x.trim()).filter(Boolean).map((x) => esc(x));

  const coachUserById = new Map<string, any>();
  (coachUsers as any[]).forEach((u) => coachUserById.set(u.id, u));
  // Mapa packageId -> paquete (para resolver el nombre/precio en bookings).
  const packageById = new Map<string, any>();
  coachProfiles.forEach((p: any) => (p.packages || []).forEach((pk: any) => packageById.set(pk.id, pk)));
  // [GOAL A4 · F2] Mapa coachId (User) -> especialidades declaradas, para titular la clase
  // con el tema REAL en vez del nombre del paquete ("Single"). Ver bookingClassTitle.
  const specialtiesByCoachId = new Map<string, string>();
  coachProfiles.forEach((p: any) => specialtiesByCoachId.set(p.userId, String(p.specialties || "")));

  const marketplace = {
    // Quien mira: 'minor' activa el candado de consentimiento parental en el UI
    // (la barrera real vive en POST /api/bookings — esto es solo señalización).
    viewer: { ageBand: me?.ageBand || null },
    coaches: coachProfiles
      // [§7.4 / MARKETPLACE-MEMBERSHIP-1] Solo coaches VERIFICADOS en el marketplace.
      .filter((p: any) => coachUserById.get(p.userId)?.coachVerified)
      .map((p: any) => {
        const u = coachUserById.get(p.userId);
        const pkgs = (p.packages || []).map((pk: any) => ({
          id: pk.id,
          name: esc(pk.name),
          sessions: pk.sessions,
          priceCents: pk.priceCents,
          priceLabel: usdLabel(pk.priceCents),
          discountPct: pk.discountPct,
        }));
        // "Desde $X": el paquete más barato (o la tarifa por hora si no hay paquetes).
        const fromPriceCents = pkgs.length ? Math.min(...pkgs.map((x: any) => x.priceCents)) : p.hourlyCents;
        return {
          id: p.userId, // id del coach (User) — es el coachId que usa Booking
          profileId: p.id,
          name: esc(u.name),
          initials: esc(u.initials),
          headline: esc(u.headline),
          avatarUrl: safeUrl(u.avatarUrl),
          coachVerified: !!u.coachVerified,
          location: esc(u.location),
          introVideoUrl: safeUrl(p.introVideoUrl),
          credentials: esc(p.credentials),
          specialties: esc(p.specialties),
          specialtiesList: splitList(p.specialties),
          languages: splitList(p.languages),
          hourlyCents: p.hourlyCents,
          hourlyLabel: usdLabel(p.hourlyCents),
          responseTime: esc(p.responseTime),
          cancelPolicy: esc(p.cancelPolicy),
          ratingAvg: reviewByTeacher.get(p.userId)?.avg ?? 0, // [auditoría] en vivo desde Review
          reviewCount: reviewByTeacher.get(p.userId)?.count ?? 0,
          bookingCount: p.bookingCount,
          packages: pkgs,
          availability: (p.availability || []).map((a: any) => ({ weekday: a.weekday, startMin: a.startMin, endMin: a.endMin })),
          fromPriceCents,
          fromPriceLabel: fromPriceCents > 0 ? `Desde ${usdLabel(fromPriceCents)}` : "Gratis",
        };
      }),
  };

  // --- Parent Portal (PRD §11): tercera ola, depende de los guardianships ----
  // [MINORS-CONSENT-01 §11.3] Solo los vínculos ACTIVE alimentan los hijos del portal;
  // los PENDING son solicitudes que el padre aún debe confirmar (pendingLinks, abajo).
  const activeGuardianships = (parentGuardianships as any[]).filter((g) => g.status === "ACTIVE");
  const childIds = activeGuardianships.map((g) => g.studentId);
  // PRD §11.3: el Guardianship por hijo guarda el umbral de auto-aprobación
  // (approveUnderCents) y el nivel de consentimiento (consentLevel) → P4 los muestra.
  const guardianshipByChild = new Map<string, any>(
    activeGuardianships.map((g) => [g.studentId, g]),
  );
  // [MINORS-CONSENT-01 §11.3] Solicitudes PENDIENTES: un menor declaró a este adulto como
  // tutor al registrarse; nace PENDING y el adulto la confirma (POST /api/guardianship,
  // flip PENDING→ACTIVE). El portal DEBE mostrarlas para que el padre pueda confirmar.
  // [BUG vínculo-padre §11.3] initiatedBy viaja al cliente: cuando el PADRE es quien reclamó
  // (initiatedBy="parent") el padre YA hizo su parte — el botón "Confirmar vínculo" no aplica
  // (un segundo POST no activa nada, COPPA lo exige); la UI debe mostrar copy honesto de espera
  // en vez del mismo CTA que usa el caso student-initiated (donde sí falta la acción del padre).
  const pendingLinks = (parentGuardianships as any[])
    .filter((g) => g.status === "PENDING")
    .map((g) => ({
      id: g.id,
      studentId: g.studentId,
      name: esc(g.student?.name || ""),
      email: esc(g.student?.email || ""),
      initials: esc(g.student?.initials || (g.student?.name || "?").slice(0, 2).toUpperCase()),
      ageBand: g.student?.ageBand || "", // minor → el padre confirma; adult → espera al alumno
      initiatedBy: g.initiatedBy || "student",
    }));
  // Coach Workspace (§7.5): estudiantes de los bookings del coach (nombre/iniciales).
  const coachStudentIds = [...new Set((coachBookingRows as any[]).map((b: any) => b.studentId))];
  const [childUsers, childBookings, childCertRows, childSkills, coachStudentUsers] = await Promise.all([
    childIds.length
      ? db.user.findMany({
          where: { id: { in: childIds } },
          // §8.4: publicProfile/publicSlug del hijo — el padre habilita el perfil
          // público del menor desde su portal (solo datos aquí, sin UI todavía).
          select: { id: true, name: true, initials: true, level: true, xp: true, ageBand: true, publicProfile: true, publicSlug: true },
        })
      : Promise.resolve([]),
    childIds.length
      ? db.booking.findMany({ where: { studentId: { in: childIds } }, include: { escrow: true }, orderBy: { slotAt: "asc" }, take: 300 })
      : Promise.resolve([]),
    childIds.length
      ? db.certificate.findMany({ where: { userId: { in: childIds } }, select: { userId: true, title: true } })
      : Promise.resolve([]),
    childIds.length ? db.studentSkill.findMany({ where: { userId: { in: childIds } } }) : Promise.resolve([]),
    // select defensivo: solo lo que muestra el booking inbox del coach.
    coachStudentIds.length
      ? db.user.findMany({ where: { id: { in: coachStudentIds } }, select: { id: true, name: true, initials: true } })
      : Promise.resolve([]),
  ]);

  // Nombres de coach para bookings (míos o de mis hijos) cuyo coach NO esté en
  // el mapa del marketplace (p.ej. perfil desactivado): una sola consulta extra.
  const missingCoachIds = [
    ...new Set(
      [...(myBookingRows as any[]), ...(childBookings as any[])]
        .map((b) => b.coachId)
        .filter((id) => id && !coachUserById.has(id)),
    ),
  ];
  if (missingCoachIds.length) {
    const extras = await db.user.findMany({
      where: { id: { in: missingCoachIds } },
      select: { id: true, name: true, initials: true, headline: true, avatarUrl: true, coachVerified: true, location: true },
    });
    extras.forEach((u) => coachUserById.set(u.id, u));
  }
  const coachNameOf = (id: string): string => esc(coachUserById.get(id)?.name || "Coach OTR");
  const coachIniOf = (id: string): string => esc(coachUserById.get(id)?.initials || "C");

  const nowMs = Date.now();

  // [REVIEW-CHAIN §7.4] Coaches que el alumno YA reseñó → no volver a ofrecer "Dejar reseña"
  // para ese coach. Las filas ya vienen de la ola de arriba (myReviewedRows).
  const myReviewedCoachIds = new Set((myReviewedRows as Array<{ teacherId: string }>).map((r) => r.teacherId));

  // --- "Mis reservas" (STUDENT): bookings propios con coach + slot + precio --
  const myBookings = (myBookingRows as any[]).map((b) => ({
    id: b.id,
    status: b.status, // PENDING | CONFIRMED | COMPLETED | CANCELLED | DISPUTED
    coachId: b.coachId,
    coachName: coachNameOf(b.coachId),
    coachInitials: coachIniOf(b.coachId),
    // [GOAL A4 · F2] Título de la clase (tema real). `packageName` sigue viajando, pero
    // como METADATO comercial — nunca más como título de la próxima clase del dashboard.
    title: esc(bookingClassTitle({
      specialty: specialtiesByCoachId.get(b.coachId),
      coachName: coachUserById.get(b.coachId)?.name,
      lang,
    })),
    packageName: b.packageId ? esc(packageById.get(b.packageId)?.name || "") : "",
    slotLabel: slotLabel(b.slotAt),
    slotAtIso: new Date(b.slotAt).toISOString(),
    durationMin: b.durationMin,
    upcoming: new Date(b.slotAt).getTime() > nowMs,
    // [BOOKING-ESCROW-1] El escrow es null en un PENDING (fondos aún no retenidos);
    // el precio acordado vive en Booking.priceCents (snapshot). Fallback a él para que
    // la reserva que espera aprobación no muestre $0/vacío.
    priceCents: b.escrow?.amountCents ?? b.priceCents ?? 0,
    priceLabel: (b.escrow?.amountCents ?? b.priceCents ?? 0) > 0 ? usdLabel(b.escrow?.amountCents ?? b.priceCents) : "",
    escrowStatus: b.escrow?.status ?? null, // HELD | RELEASED | REFUNDED
    videoUrl: safeUrl(b.videoUrl), // sala on-platform
    recordingUrl: safeUrl(b.recordingUrl), // [P0-9] grabación adjunta por el coach (si la hay)
    // [REVIEW-CHAIN §7.4] reseñable si la sesión se completó y aún no reseñó a este coach.
    canReview: b.status === "COMPLETED" && !myReviewedCoachIds.has(b.coachId),
  }));

  // --- PRD §7.5: Coach Workspace (supply-side) — SOLO TEACHER/ADMIN ----------
  // Booking inbox + earnings (escrow transparente, take rate 18%) + métricas de
  // éxito del coach + gestión de perfil (disponibilidad/paquetes). null si no aplica.
  let coachwork: any = null;
  if (isTeacher && me) {
    const coachStudentById = new Map<string, any>((coachStudentUsers as any[]).map((u: any) => [u.id, u]));
    // Perfil propio: del browse (activo) o de la consulta directa (inactivo).
    // [PERF-P] La consulta directa manda sobre la copia del browse: el browse va por micro-caché
    // global (30 s) y el coach DEBE ver su propia edición al instante. Es un superset de campos.
    const myCoachProfile: any = myCoachProfileRow ?? coachProfiles.find((p: any) => p.userId === me.id) ?? null;
    // Sus paquetes resuelven nombre en el inbox aunque el perfil esté inactivo
    // (packageById solo trae los de perfiles activos del browse).
    if (myCoachProfile) {
      (myCoachProfile.packages || []).forEach((pk: any) => {
        if (!packageById.has(pk.id)) packageById.set(pk.id, pk);
      });
    }

    // Día de la semana (0=Dom..6=Sáb) y minutos desde medianoche → "9:00 AM".
    const WEEKDAYS_ES = lang === "en"
      ? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
      : ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
    const minToTime = (min: number): string => {
      const total = Number(min) || 0;
      const h24 = Math.floor(total / 60);
      const m = total % 60;
      const ampm = h24 >= 12 ? "PM" : "AM";
      let h = h24 % 12;
      if (h === 0) h = 12;
      return `${h}:${String(m).padStart(2, "0")} ${ampm}`;
    };

    const allCoachBookings = coachBookingRows as any[]; // ya vienen slotAt desc
    const bookingShape = (b: any) => ({
      id: b.id,
      status: b.status, // PENDING | CONFIRMED | COMPLETED | CANCELLED
      studentName: esc(coachStudentById.get(b.studentId)?.name || "Estudiante OTR"),
      studentInitials: esc(coachStudentById.get(b.studentId)?.initials || "E"),
      slotLabel: slotLabel(b.slotAt), // "vie 12 jun · 4:00 PM" (hora RD)
      durationMin: b.durationMin,
      packageName: b.packageId ? esc(packageById.get(b.packageId)?.name || "") : "",
      // [BOOKING-ESCROW-1] PENDING no tiene escrow → cae al snapshot Booking.priceCents.
      amountCents: b.escrow?.amountCents ?? b.priceCents ?? 0,
      amountLabel: (b.escrow?.amountCents ?? b.priceCents ?? 0) > 0 ? usdLabel(b.escrow?.amountCents ?? b.priceCents) : "",
      slotAtIso: new Date(b.slotAt).toISOString(), // [ROOM] cuenta atrás de la sala (lado coach)
      videoUrl: safeUrl(b.videoUrl), // sala on-platform
      recordingUrl: safeUrl(b.recordingUrl), // [P0-9] grabación que el coach adjunta
      // PENDING = espera el consentimiento parental del menor (Safety Gate §7).
      awaitingConsent: b.status === "PENDING",
    });
    const inboxUpcoming = allCoachBookings
      .filter((b) => (b.status === "CONFIRMED" || b.status === "PENDING") && new Date(b.slotAt).getTime() >= nowMs)
      .sort((a, b) => new Date(a.slotAt).getTime() - new Date(b.slotAt).getTime())
      .map(bookingShape);
    const inboxPast = allCoachBookings
      .filter((b) => b.status === "COMPLETED" || b.status === "CANCELLED")
      .slice(0, 20) // ya vienen desc
      .map((b) => ({ ...bookingShape(b), escrowStatus: b.escrow?.status ?? null }));

    // [ENT-08] Los TOTALES financieros y de éxito NO pueden derivar del array de bookings
    // (capado a take:200 para el inbox): un coach con >200 reservas perdería las antiguas y
    // subreportaría sus ingresos de por vida. Se calculan con agregaciones dedicadas (sin
    // límite) sobre TODO el historial. takeRatePct es uniforme (EscrowTxn @default 18, y todo
    // el código crea el escrow con 18), así que payout = liberado × (1 − 18%).
    // [PERF-P] Las 5 agregaciones ya vienen de la ola grande (coach*Agg): dependían solo de
    // me.id, así que estar aquí las convertía en una ola en serie extra para el profesor.
    // `monthStart` es el mismo del mes en curso que fija la ola (1º del mes a las 00:00).
    const TAKE_PCT = 18;
    const payoutOfCents = (cents: number): number => Math.round((cents || 0) * (1 - TAKE_PCT / 100));
    const heldCents = coachHeldAgg?._sum.amountCents || 0;
    const releasedCents = coachRelAgg?._sum.amountCents || 0;
    const payoutCents = payoutOfCents(releasedCents);
    const monthPayoutCents = payoutOfCents(coachMonthRelAgg?._sum.amountCents || 0);
    const repeatStudents = (coachByStudentAgg as any[]).filter((g: any) => (g._count?.studentId || 0) > 1).length;

    coachwork = {
      inbox: { upcoming: inboxUpcoming, past: inboxPast },
      earnings: {
        heldCents,
        releasedCents,
        payoutCents,
        monthPayoutCents,
        takeRatePct: 18,
        heldLabel: usdLabel(heldCents),
        releasedLabel: usdLabel(releasedCents),
        payoutLabel: usdLabel(payoutCents),
        monthPayoutLabel: usdLabel(monthPayoutCents),
      },
      metrics: {
        ratingAvg: reviewByTeacher.get(myCoachProfile?.userId ?? "")?.avg ?? 0, // [auditoría] en vivo desde Review
        reviewCount: reviewByTeacher.get(myCoachProfile?.userId ?? "")?.count ?? 0,
        bookingCount: myCoachProfile?.bookingCount ?? 0,
        completed: coachCompletedCount,
        repeatStudents,
      },
      // Sin CoachProfile → profile null (la UI muestra el CTA de crear perfil).
      profile: myCoachProfile
        ? {
            active: !!myCoachProfile.active,
            hourlyCents: myCoachProfile.hourlyCents,
            hourlyLabel: usdLabel(myCoachProfile.hourlyCents),
            specialties: esc(myCoachProfile.specialties),
            languages: splitList(myCoachProfile.languages),
            availability: (myCoachProfile.availability || []).map((a: any) => ({
              id: a.id,
              weekday: a.weekday,
              startMin: a.startMin,
              endMin: a.endMin,
              label: `${WEEKDAYS_ES[a.weekday] || ""} ${minToTime(a.startMin)} – ${minToTime(a.endMin)}`,
            })),
            packages: (myCoachProfile.packages || []).map((pk: any) => ({
              id: pk.id,
              name: esc(pk.name),
              sessions: pk.sessions,
              priceCents: pk.priceCents,
              priceLabel: usdLabel(pk.priceCents),
              discountPct: pk.discountPct,
            })),
          }
        : null,
    };
  }

  // DB.parent — SOLO para rol PARENT (role-scoped, PRD §11).
  let parentData: any = null;
  if (me && me.role === "PARENT") {
    // Logros por hijo: lista de títulos de certificados (scr-parent espera array).
    const certsByChild = new Map<string, string[]>();
    (childCertRows as any[]).forEach((c) => {
      const arr = certsByChild.get(c.userId) || [];
      arr.push(esc(c.title));
      certsByChild.set(c.userId, arr);
    });
    const skillsByChild = new Map<string, any[]>();
    (childSkills as any[]).forEach((s) => {
      const arr = skillsByChild.get(s.userId) || [];
      arr.push(s);
      skillsByChild.set(s.userId, arr);
    });
    const bookingsByChild = new Map<string, any[]>();
    (childBookings as any[]).forEach((b) => {
      const arr = bookingsByChild.get(b.studentId) || [];
      arr.push(b);
      bookingsByChild.set(b.studentId, arr);
    });
    const childById = new Map<string, any>((childUsers as any[]).map((u) => [u.id, u]));
    parentData = {
      // Mantiene el orden de los guardianships (createdAt asc).
      children: childIds
        .filter((id) => childById.has(id))
        .map((id) => {
          const u = childById.get(id);
          const books = bookingsByChild.get(id) || [];
          const attended = books.filter((b) => b.status === "COMPLETED").length;
          const scheduled = books.filter((b) => b.status === "CONFIRMED" || b.status === "COMPLETED").length;
          const upcoming = books
            .filter((b) => b.status === "CONFIRMED" && new Date(b.slotAt).getTime() > nowMs)
            .map((b) => ({
              id: b.id,
              coachName: coachNameOf(b.coachId),
              slotLabel: slotLabel(b.slotAt),
              durationMin: b.durationMin,
            }));
          // Billing & spend: lo retenido + liberado (REFUNDED no cuenta como gasto).
          const spendCents = books.reduce(
            (sum, b) => sum + (b.escrow && b.escrow.status !== "REFUNDED" ? b.escrow.amountCents : 0),
            0,
          );
          // Safety & consent: bookings PENDING que esperan la aprobación de ESTE padre.
          const pendingConsents = books
            .filter((b) => b.status === "PENDING" && b.consentBy === me.id)
            .map((b) => ({
              id: b.id,
              bookingId: b.id, // alias: scr-parent referencia pc.bookingId
              coachName: coachNameOf(b.coachId),
              slotLabel: slotLabel(b.slotAt),
              // [BOOKING-ESCROW-1] PENDING no tiene escrow: el monto que aprueba el tutor
              // sale del snapshot autoritativo Booking.priceCents (no del paquete, que puede
              // faltar si fue sesión sin paquete o el coach quedó inactivo) → evita $0.00.
              priceLabel: usdLabel(b.escrow?.amountCents ?? b.priceCents ?? (b.packageId && packageById.get(b.packageId)?.priceCents) ?? 0),
            }));
          return {
            id: u.id,
            childId: u.id, // alias explícito para el toggle de consentimiento §8.4
            name: esc(u.name),
            initials: esc(u.initials),
            level: levelNameForXp(u.xp), // [fix] rango del hijo DERIVADO del XP (no el almacenado)
            ageBand: u.ageBand || "minor",
            // §8.4: estado del perfil público del hijo (el padre es quien lo
            // habilita para menores — aquí solo viajan los datos, sin UI).
            publicProfile: { enabled: !!u.publicProfile, slug: u.publicSlug ? esc(u.publicSlug) : null },
            // [skill] score ACTUAL por dimensión. El delta mes-a-mes requiere histórico
            // (StudentSkillSnapshot) — Fase 2-4; hasta entonces NO se promete "crecimiento".
            skillDeltas: (skillsByChild.get(id) || []).map((s: any) => ({
              skill: esc(s.skill),
              name: esc(s.skill), // alias: scr-parent renderiza s.name
              score: Math.max(0, Math.min(100, Number(s.score) || 0)),
            })),
            attendance: { attended, scheduled },
            achievements: certsByChild.get(id) || [],
            upcoming,
            spendCents,
            spendLabel: usdLabel(spendCents),
            pendingConsents,
            // PRD §11.3: umbral configurable del padre para ESTE hijo. null en
            // approveUnderCents = aprobar cada reserva; N = auto-aprueba hasta N centavos.
            approveUnderCents: guardianshipByChild.get(id)?.approveUnderCents ?? null,
            consentLevel: guardianshipByChild.get(id)?.consentLevel || "standard", // [fix] default seguro (no "full")
          };
        }),
      // [MINORS-CONSENT-01 §11.3] Solicitudes de tutela PENDIENTES — el padre las confirma desde el portal.
      pendingLinks,
    };
  }

  // --- PRD §8: Lifetime Progress Profile (DB.lifetime) — el moat -------------
  // Identity + Skill Graph CON ATRIBUCIÓN (cada skill enlaza los eventos que lo
  // movieron — sin cajas negras) + activity ledger + performance record +
  // credenciales + Journey cronológico + perfil público compartible (§8.4).
  // Se emite para TODO usuario con sesión (TEACHER/PARENT reciben el suyo propio).
  const activityAsc = [...(activityEvents as any[])].reverse(); // la consulta viene desc → asc

  // "Miembro desde …": User no tiene createdAt en el schema → primer
  // ActivityEvent del usuario, o "2026" si aún no tiene historia.
  const firstEventAt = activityAsc[0]?.createdAt ?? null;
  // [GOAL A2 · F2] También con idioma: era la última etiqueta de fecha que quedaba en
  // español fijo (MONTHS_ES_FULL a pelo) y salía "Miembro desde agosto 2026" con la UI en EN.
  const memberSinceLabel = fmtMemberSinceLabel(firstEventAt, lang);

  // Atribución del Skill Graph (PRD §8.2, sin cajas negras):
  //  1) FUENTE PRIMARIA — meta.skillBumps escrito por el server cuando un evento
  //     mueve un skill (debates/api lo registra: [{skill, before, after}]). Esto
  //     es atribución EXACTA: el evento movió ese skill, no una adivinanza.
  //  2) RESPALDO — para eventos viejos sin skillBumps en meta, se cae a la
  //     heurística (mención en texto o mapeo por tipo) para no dejar el tap vacío.
  // Pre-parseamos meta una vez por evento.
  const parseMeta = (raw: any): any => {
    if (!raw) return null;
    if (typeof raw === "object") return raw;
    try { return JSON.parse(String(raw)); } catch { return null; }
  };
  const recentForSkills = (activityEvents as any[]).slice(0, 40).map((a) => {
    const meta = parseMeta(a.meta);
    const bumpedSkills: string[] = Array.isArray(meta?.skillBumps)
      ? meta.skillBumps.map((b: any) => String(b?.skill || "")).filter(Boolean)
      : [];
    return { ...a, _bumpedSkills: bumpedSkills };
  });
  // [SPINE-03 / §8.2] Tipos REALES de ActivityEvent escritos por las rutas (antes usaba
  // "quiz_passed"/"debate_logged" que NUNCA se escriben → el fallback de atribución no
  // hallaba nada). La atribución primaria es meta.skillBumps; este set/mapa es el respaldo.
  const SKILL_EVENT_TYPES = new Set(["quiz_done", "quiz", "lesson_done", "debate_win", "debate_loss", "skill_eval", "placement_done", "booking_made", "session_done"]);
  const TYPE_TO_SKILLS: Record<string, string[]> = {
    debate_win: ["Refutación", "Estructura"],
    debate_loss: ["Refutación", "Estructura"],
    quiz_done: ["Evidencia"],
    quiz: ["Evidencia"],
    lesson_done: ["Estructura"],
    booking_made: ["Delivery"],
    session_done: ["Delivery"],
  };
  const eventsForSkill = (skillName: string) => {
    const needle = skillName.toLowerCase();
    return recentForSkills
      .filter((a) => {
        // 1) atribución exacta del server
        if (a._bumpedSkills.includes(skillName)) return true;
        // 2) respaldo heurístico solo para eventos relevantes SIN skillBumps
        if (a._bumpedSkills.length) return false;
        if (!SKILL_EVENT_TYPES.has(a.type)) return false;
        const text = `${a.title || ""} ${a.detail || ""}`.toLowerCase();
        return text.includes(needle) || (TYPE_TO_SKILLS[a.type] || []).includes(skillName);
      })
      .slice(0, 8)
      .map((a) => ({ title: esc(a.title), whenLabel: shortDateLabel(a.createdAt, lang) }));
  };
  // Sin StudentSkill → las 6 dimensiones canónicas en 0 (el perfil nunca va vacío).
  const skillGraphBase = (myStudentSkills || []).length
    ? (myStudentSkills as any[]).map((s) => ({ skill: String(s.skill), score: Math.max(0, Math.min(100, Number(s.score) || 0)) }))
    : OTR_SKILLS.map((skill) => ({ skill, score: 0 }));
  const skillGraph = skillGraphBase.map((s) => ({
    skill: esc(s.skill),
    name: esc(s.skill),
    score: s.score,
    events: eventsForSkill(s.skill),
  }));

  // Activity ledger: números de vida entera (cursos, lecciones, debates, sesiones…).
  const lessonsDoneCount = (myProgress || []).length;
  const sessionsAttended = (myBookingRows as any[]).filter((b) => b.status === "COMPLETED").length;
  const enrollCompleted = meEnrollments.filter((e) => courseProgress(e.courseId) >= 100).length;
  const lifetimeLedger = {
    // Un certificado emitido también cuenta como curso completado (es su prueba).
    coursesCompleted: Math.max(enrollCompleted, (myCertificates || []).length),
    lessonsDone: lessonsDoneCount,
    debates: records.length,
    wins: records.filter((r) => r.result === "WIN").length,
    sessionsAttended,
    tournaments: myTournamentRegIds.size, // [PERF-P] antes un count() propio; misma cifra
    // [fix] Horas REALES de coaching = sesiones completadas (cada Booking ~1h). Antes sumaba
    // lecciones×0.4 (24 min/lección inventados — no hay tracking de tiempo de lección en el schema).
    hoursStudied: sessionsAttended,
  };

  // Performance record: historia de rating (RatingUpdate 1:1 de cada DebateRecord,
  // en orden cronológico; el label usa la fecha real de la ronda).
  const ratingHistory = records
    .filter((r) => r.rating)
    .slice()
    .sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime())
    .map((r) => ({
      label: shortDateLabel(r.recordedAt, lang),
      ratingAfter: Math.round(r.rating.ratingAfter),
      tierAfter: r.rating.tierAfter,
    }));
  const lifetimePerformance = {
    rating: Math.round(me?.debateRating ?? 1500),
    tier: me?.debateTier || "Novato",
    rd: Math.round(me?.debateRd ?? 350),
    provisional: (me?.debateRd ?? 350) >= PROVISIONAL_RD,
    history: ratingHistory,
  };

  // Credenciales verificables (certificados emitidos).
  const lifetimeCredentials = (myCertificates || []).map((c: any) => ({
    title: esc(c.title),
    issuedLabel: monthYearLabel(c.issuedAt, lang),
  }));

  // Journey: la historia cronológica vertical (hasta 60 eventos, asc) — el
  // screenshot que un estudiante comparte y que enorgullece a los padres.
  const journey = activityAsc.slice(0, 60).map((a: any) => ({
    whenLabel: shortDateLabel(a.createdAt, lang),
    monthLabel: monthFullLabel(a.createdAt, lang),
    title: esc(a.title),
    detail: esc(a.detail || ""),
    type: a.type,
  }));

  const lifetime = me
    ? {
        identity: {
          name: esc(me.name),
          initials: esc(me.initials),
          level: derivedLevelName, // [fix nivel] derivado del XP, no del valor almacenado
          ageBand: me.ageBand || null,
          memberSinceLabel,
          // Bilingüe nativo: ES siempre lleva EN al lado; cuenta en EN → solo EN.
          languages: me.lang === "en" ? ["EN"] : ["ES", "EN"],
          location: esc(me.location),
        },
        skillGraph,
        ledger: lifetimeLedger,
        performance: lifetimePerformance,
        credentials: lifetimeCredentials,
        journey,
        // §8.4: perfil público compartible — privacy-default OFF; un MENOR no
        // puede togglearlo (lo habilita su padre/madre desde el Portal de familia).
        publicProfile: {
          enabled: !!me.publicProfile,
          slug: me.publicSlug ? esc(me.publicSlug) : null,
          url: me.publicSlug ? `/p/${esc(me.publicSlug)}` : null,
          canToggle: me.ageBand !== "minor",
          minorNote: lang === "en"
            ? "Your parent or guardian can enable your public profile from the Family Portal."
            : "Tu padre/madre puede habilitar tu perfil público desde el Portal de familia.",
        },
      }
    : null;

  // --- PRD §13: membresía por suscripción (SIMULADA en F1 — sin Stripe; el
  // upgrade solo cambia User.membership). free | pro | elite ("Próximamente").
  const membership = {
    tier: me?.membership || "free",
    // [GOAL A2 · F2] Con idioma (antes "Desde agosto 2026" fijo, aun con la UI en inglés).
    sinceLabel: me?.membershipSince ? fmtPlanSinceLabel(me.membershipSince, lang) : null,
    // [GOAL E5 · moneda] "$9"/"$79" y no "US$9"/"US$79": el símbolo unificado de money()
    // (app/lib/money.ts). La membresía era la tercera moneda de la app — convivía con los
    // "$45/hora" del marketplace en la misma sesión. Solo presentación.
    prices: { proMonthly: "$9", proAnnual: "$79" },
  };

  const base: any = {
    me: { name: esc(me?.name), email: me?.email, initials: esc(me?.initials), level: derivedLevelName, streak: streakDays, role: myRole,
      // [DASHBOARD-ACCESS-2 §4] ciclo de vida para adaptar el saludo y el siguiente paso.
      lifecycle: lifecycle.state, daysAway: lifecycle.daysAway,
      headline: esc(me?.headline), bio: esc(me?.bio), teachingStyle: esc(me?.teachingStyle), formats: esc(me?.formats), location: esc(me?.location), preferences: me?.preferences ?? null,
      // PRD §11.3 / §2.2: estudiante sin placement aún (placedAt null). YA NO ES UN MURO: el
      // arranque no lo intercepta (ver Aula.tsx) — el dashboard le ofrece la evaluación como
      // invitación. Sigue viajando porque es quien decide si esa invitación se pinta.
      needsPlacement: me?.role === "STUDENT" && !me?.placedAt,
      /* [ADM] Progreso de la admisión de 4 pasos. null tiene un significado PROPIO y distinto
         de "0 de 4": el subsistema de admisión no está disponible en este despliegue (modelo
         sin migrar) o el usuario no es estudiante → nadie se enruta al wizard. Solo timestamps
         reducidos a booleanos: ni un dato del formulario viaja aquí (ver ADMISSION_SELECT). */
      admission: (me?.role === "STUDENT" && myAdmissionRows) ? admissionProgress(myAdmissionRows[0]) : null,
      // Puerta de entrada: sin admisión terminada no hay Aula (Aula.tsx lo lleva al wizard).
      needsAdmission: !!(me?.role === "STUDENT" && myAdmissionRows && !admissionProgress(myAdmissionRows[0]).complete),
      avatarUrl: safeUrl(me?.avatarUrl),
      ageBand: me?.ageBand || null,
      // [GAMIFICATION-1 §9] estado del opt-in (toggle en Ajustes). [RATING-2 §6.2] speaker rating.
      leaderboardOptIn: me?.leaderboardOptIn !== false,
      speakerAvg: (me?.speakerRounds ?? 0) > 0 ? Math.round(me?.speakerAvg ?? 0) : null, speakerRounds: me?.speakerRounds ?? 0,
      // [R5] Estado de la 2FA (booleano — el secreto no sale del servidor). Ajustes lo usa
      // para pintar la sección de verificación en dos pasos del ADMIN.
      totpEnabled: !!me?.totpSecret },
    teacher: { name: esc(headCoach?.name), email: headCoach?.email, initials: esc(headCoach?.initials), role: "teacher",
      headline: esc(headCoach?.headline), bio: esc(headCoach?.bio), teachingStyle: esc(headCoach?.teachingStyle), formats: esc(headCoach?.formats), location: esc(headCoach?.location) },
    levels: levels.map((l) => ({ id: l.name.toLowerCase(), name: l.name, range: l.range, color: l.color })),
    xp: me?.xp ?? 0,
    xpNext,
    xpLevelStart,
    courses: meEnrollments.map((e) => ({
      id: e.course.code, dbId: e.course.id, code: e.course.code, name: esc(pickLang(e.course.name, e.course.nameEn)), coach: esc(e.course.coachName),
      color: e.course.color, progress: courseProgress(e.course.id), next: esc(e.course.next),
      students: e.course.studentsCount, lessons: e.course.lessonsCount, due: e.due,
      format: esc(e.course.format), modality: esc(e.course.modality), capacity: e.course.capacity, summary: esc(pickLang(e.course.summary, e.course.summaryEn)),
      layout: e.course.layout || "modules",
    })),
    // Dashboard: solo secciones/actividades VISIBLES para el alumno (filtra hidden).
    courseModules: modulesForDashboard.filter((m: any) => !m.hidden).map((m) => ({
      t: esc(pickLang(m.title, m.titleEn)), done: m.done, locked: m.locked,
      items: m.lessons.filter((l: any) => !l.hidden).map((l) => ({
        id: l.id, t: esc(pickLang(l.title, l.titleEn)), titleEs: esc(l.title), type: l.type, done: l.done, doneByMe: doneSet.has(l.id), locked: lessonLocked(l), grade: l.grade, dur: l.dur, due: l.due,
        dueAt: l.dueAt ? l.dueAt.toISOString() : null, maxPoints: l.maxPoints ?? null, submitKinds: l.submitKinds ?? null,
        // [F3.1 dedup] courseModules es SOLO el backbone del dashboard (nextLessonItem/Aula leen
        // id/type/doneByMe/locked). El contentHtml completo del curso YA viaja en coursesContent
        // (fuente de render) y el examen en quizByLesson (fuente canónica) → aquí no se repiten.
        videoKind: l.videoKind, videoSrc: l.videoSrc,
      })),
    })),
    // Moodle multi-curso: módulos de TODOS los cursos inscritos, agrupados por curso.
    // S.course/S.courseIndex/S.lesson navegan cualquiera vía window.__course; las
    // pantallas de lección buscan window.__lesson entre todos estos items.
    coursesContent: (() => {
      // PROFESOR/ADMIN: "Vista previa como alumno" — sus cursos impartidos en el shape
      // de alumno, con secciones/actividades OCULTAS filtradas (igual que lo ve el
      // estudiante) y sin gating de progreso (el profesor no tiene avance) para poder
      // recorrer todo. Reutiliza S.course/S.lesson/S.assignment/S.quiz tal cual.
      if (isTeacher) {
        return (taughtCourses as any[]).map((c: any) => ({
          id: c.code, dbId: c.id, code: c.code,
          name: esc(pickLang(c.name, c.nameEn)), coach: esc(c.coachName),
          color: c.color, progress: 0,
          summary: esc(pickLang(c.summary, c.summaryEn)),
          format: esc(c.format), modality: esc(c.modality),
          layout: c.layout || "modules",
          // [EPIC-5] Video de bienvenida del curso (kind/src crudos; el embed se arma con
          // videoEmbedHtml en el render) + rating del programa (en vivo desde Review).
          welcomeVideoKind: c.welcomeVideoKind || "none", welcomeVideoSrc: c.welcomeVideoSrc || "",
          rating: reviewByCourse.get(c.id)?.avg ?? null, reviewCount: reviewByCourse.get(c.id)?.count ?? 0,
          modules: (c.modules || []).filter((m: any) => !m.hidden).map((m: any) => ({
            t: esc(pickLang(m.title, m.titleEn)), done: false, locked: false,
            items: (m.lessons || []).filter((l: any) => !l.hidden).map((l: any) => ({
              id: l.id, t: esc(pickLang(l.title, l.titleEn)), titleEs: esc(l.title), type: l.type, done: false, doneByMe: false,
              locked: false, grade: null, dur: l.dur, due: l.due,
              dueAt: l.dueAt ? l.dueAt.toISOString() : null, maxPoints: l.maxPoints ?? null, submitKinds: l.submitKinds ?? null,
              // [F3.1 dedup] El examen NO se re-serializa por lección: la fuente canónica es
              // DB.quizByLesson (scr-learn/scr-extra/scr-teacher lo resuelven por lessonId).
              // type==='quiz' es el flag que la UI usa; el id de la lección es la clave del lookup.
              videoKind: l.videoKind, videoSrc: l.videoSrc, contentHtml: pickLang(l.contentHtml, l.contentHtmlEn),
            })),
          })),
        }));
      }
      const src = (studentModules as any[]);
      const byCourse = new Map<string, any[]>();
      src.forEach((m) => {
        const arr = byCourse.get(m.courseId) || [];
        arr.push(m);
        byCourse.set(m.courseId, arr);
      });
      return meEnrollments.map((e: any) => ({
        id: e.course.code, dbId: e.course.id, code: e.course.code,
        name: esc(pickLang(e.course.name, e.course.nameEn)), coach: esc(e.course.coachName),
        color: e.course.color, progress: courseProgress(e.course.id),
        summary: esc(pickLang(e.course.summary, e.course.summaryEn)),
        format: esc(e.course.format), modality: esc(e.course.modality),
        layout: e.course.layout || "modules",
        // [EPIC-5] Video de bienvenida del curso + rating del programa (en vivo desde Review).
        welcomeVideoKind: e.course.welcomeVideoKind || "none", welcomeVideoSrc: e.course.welcomeVideoSrc || "",
        rating: reviewByCourse.get(e.course.id)?.avg ?? null, reviewCount: reviewByCourse.get(e.course.id)?.count ?? 0,
        // Solo secciones/actividades VISIBLES para el alumno (filtra hidden).
        modules: (byCourse.get(e.course.id) || []).filter((m: any) => !m.hidden).map((m: any) => ({
          t: esc(pickLang(m.title, m.titleEn)), done: m.done, locked: m.locked,
          items: m.lessons.filter((l: any) => !l.hidden).map((l: any) => ({
            id: l.id, t: esc(pickLang(l.title, l.titleEn)), titleEs: esc(l.title), type: l.type, done: l.done, doneByMe: doneSet.has(l.id),
            locked: lessonLocked(l), grade: l.grade, dur: l.dur, due: l.due,
            dueAt: l.dueAt ? l.dueAt.toISOString() : null, maxPoints: l.maxPoints ?? null, submitKinds: l.submitKinds ?? null,
            // [F3.1 dedup] El examen NO se re-serializa por lección: la fuente canónica es
            // DB.quizByLesson (scr-learn/scr-extra/scr-teacher lo resuelven por lessonId).
            // type==='quiz' es el flag que la UI usa; el id de la lección es la clave del lookup.
            videoKind: l.videoKind, videoSrc: l.videoSrc, contentHtml: pickLang(l.contentHtml, l.contentHtmlEn),
          })),
        })),
      }));
    })(),
    // Estado de las entregas del alumno por actividad (S.assignment lo lee).
    mySubmissions: mySubmissionsByActivity,
    // [i18n] Mismo estado indexado por lessonId (clave estable) — S.assignment lo prefiere.
    mySubmissionsByLesson,
    // [DASHBOARD] `xp` = XP que otorga la insignia (0 ⇒ la vista no lo pinta).
    // `ic` es una clave de IC (app/lib/icons.ts); el seed solo usa claves existentes.
    badges: badges.map((b) => ({ n: b.name, d: b.description, got: gotBadge(b.name), ic: b.icon, tone: b.tone, xp: b.xp ?? 0 })),
    // [DASHBOARD] "Lo mejor de la temporada": logros reales de la marca (tabla Highlight).
    // dateLabel se DERIVA de `date` (vivo, como los eventos); vacío si el logro no tiene
    // fecha documentada. imageUrl vacío ⇒ la card degrada a fondo negro sin foto.
    // Texto de catálogo (no de usuario) → sin esc(), igual que badges/events.
    // [RONDA3 · Isaac] instagramUrl: la publicación de IG del logro. Sanea con safeUrl
    // (bloquea javascript:/data:) y ADEMÁS exige http(s) absoluto: un post de Instagram
    // nunca es una ruta interna ni un mailto:, así que todo lo demás cae a "" y la
    // tarjeta simplemente no navega, en vez de abrir un enlace roto.
    highlights: (highlightRows || []).map((h: any) => {
      const ig = safeUrl(h.instagramUrl);
      return {
        id: h.id,
        title: h.title,
        dateLabel: h.date ? shortDateLabel(h.date, lang) : "",
        category: h.category,
        imageUrl: h.imageUrl || "",
        instagramUrl: ig && /^https?:\/\//i.test(ig) ? ig : "",
      };
    }),
    // [auditoría] La etiqueta de fecha se DERIVA de startsAt (viva, como los torneos); whenLabel
    // es solo fallback para eventos legados sin startsAt. Así "Hoy/Mañana" no queda congelado.
    events: events.map((e) => ({ t: e.title, c: e.course, when: (e as any).startsAt ? eventDateLabel((e as any).startsAt, lang) : e.whenLabel, tone: e.tone })),
    // PRD §4: DB.activity = timeline del Progress Profile (ActivityEvent del usuario,
    // los últimos 15 de la consulta compartida con journey). esc() en texto de usuario.
    activity: (activityEvents || []).slice(0, 15).map((a) => ({
      type: a.type, title: esc(a.title), detail: esc(a.detail || ""),
      xp: a.xp || 0, when: whenLabel(a.createdAt, lang),
    })),
    // [F3.2] Ya scopeadas en la DB (where OR userId propio/null) — sin filtro en JS. Mapping/escape intactos.
    // [DEUDA-H] La antigüedad se DERIVA del instante (whenAt/lastAt/sentAt) con el idioma de
    // la request; la columna de TEXTO solo se usa como respaldo de filas legacy sin timestamp.
    // Antes se servía el texto tal cual y la UI en inglés leía "hace 1h" / "ayer".
    notifications: notifications.map((n) => ({ ic: n.icon, tone: n.tone, t: esc(n.title), d: esc(n.detail), when: n.whenAt ? whenLabel(n.whenAt, lang) : n.whenLabel, unread: n.unread })),
    forum: threads.map((t) => ({ id: t.id, title: esc(t.title), author: esc(t.author), ini: esc(t.initials), tag: esc(t.tag), replies: t.replies, views: t.views, pinned: t.pinned, last: t.lastAt ? whenLabel(t.lastAt, lang) : t.lastLabel, excerpt: esc(t.excerpt) })),
    forumThread: mainThread ? {
      id: mainThread.id, title: esc(mainThread.title), tag: esc(mainThread.tag),
      posts: mainThread.posts.map((p) => ({ author: esc(p.author), ini: esc(p.initials), role: p.role, when: p.whenAt ? whenLabel(p.whenAt, lang) : p.whenLabel, op: p.op, body: esc(p.body) })),
    } : { id: "", title: "", tag: "", posts: [] },
    // [CROSS-02/03] Cada conversación trae su id + sus mensajes (me computado por usuario,
    // consistente con CROSS-01) para que la pantalla pueda CAMBIAR de chat y enviar al hilo
    // correcto. Antes solo se exponía el resumen + DB.chat (la 1ª conversación), por eso el
    // thread mostraba siempre lo mismo y el envío iba al primer hilo.
    messages: convos.map((c) => {
      // [F3.3] Los mensajes vienen desc (los 60 más recientes) desde la query → se reinvierten
      // aquí a orden cronológico ascendente (viejo→nuevo), que es como el hilo se renderiza.
      const thread = (c.messages ?? []).slice().reverse();
      // [GOAL S4/S5] La etiqueta del hilo (contraparte, no uno mismo) y el preview (último
      // mensaje REAL, no un lastLabel inventado) se deciden en conversationLabel() — pura y
      // testeada. Aquí solo se escapa UNA vez, como manda el contrato de escape.
      const label = conversationLabel({
        storedName: c.name,
        storedInitials: c.initials,
        storedLastLabel: c.lastLabel,
        participantIds: ((c as any).participants ?? []).map((p: any) => p.userId),
        meId: me?.id ?? null,
        meName: me?.name ?? null,
        counterparts: convoCounterparts,
        lastMessageBody: thread.length ? thread[thread.length - 1].body : null,
      });
      return {
        id: c.id, ini: esc(label.initials), name: esc(label.name), last: esc(label.last), when: c.whenAt ? whenLabel(c.whenAt, lang) : c.whenLabel,
        unread: c.unread, online: c.online, navy: c.navy,
        // [DEUDA-H] La hora del mensaje sale de `sentAt` (fmtClockRD, hora RD): timeLabel es
        // texto congelado y la API lo escribía en español ("ahora") al enviar un mensaje.
        messages: thread.map((m) => ({ me: m.senderId ? m.senderId === me?.id : m.me, body: esc(m.body), when: m.sentAt ? fmtClockRD(m.sentAt, lang) : m.timeLabel })),
      };
    }),
    // VENTA POR CURSO APAGADA (PRD §13.1): los cursos son valor de la membresía —
    // price 0 → la UI muestra "Gratis"/Inscribirme y /api/checkout inscribe directo.
    catalog: allCourses.map((c) => ({ id: c.id, code: c.code, name: esc(pickLang(c.name, c.nameEn)), coach: esc(c.coachName), color: c.color, price: 0, enrolled: enrolledIds.has(c.id),
      format: esc(c.format), modality: esc(c.modality),
      // [CATÁLOGO · llamada Isaac] overview del programa + rating por curso (Review) +
      // video de bienvenida del profesor (welcomeVideo*), para que el catálogo se sienta un
      // marketplace: el profe se presenta y el alumno ve estrellas antes de inscribirse.
      summary: esc(pickLang(c.summary, c.summaryEn)),
      rating: reviewByCourse.get(c.id)?.avg ?? null,
      reviewCount: reviewByCourse.get(c.id)?.count ?? 0,
      welcomeVideoKind: c.welcomeVideoKind || "none",
      welcomeVideoSrc: c.welcomeVideoSrc || "",
      // [RONDA3 · CURSOS] Datos que el catálogo por CATEGORÍAS necesita, todos reales:
      //   · category  → clave derivada de `format`/`code` (ver courseCategoryKey arriba).
      //   · moduleCount / lessonCount → conteo REAL de lo publicado (no lessonsCount,
      //     que es la columna denormalizada y puede quedar desfasada del contenido).
      //   · students  → Course.studentsCount (el mismo número que ya usa el Hub).
      // Sin dato, quedan en 0 y la UI no pinta esa meta (nada inventado).
      category: courseCategoryKey(c.format, c.code),
      moduleCount: (c as any).modules?.length ?? 0,
      lessonCount: ((c as any).modules ?? []).reduce((n: number, m: any) => n + (m?._count?.lessons ?? 0), 0),
      students: (c as any).studentsCount ?? 0 })),
    // --- Hub: campos nuevos (visibles para todos los roles) ---
    arsenal,
    skills,
    certificates,
    coachProfile,
    myReview,
    canReviewCoach, // §7.4 verified-booking-only: habilita el form de reseña del coach
    // Notas reales del estudiante (Submission GRADED + QuizAttempt).
    myGrades,
    // Mapa lessonId -> quiz real (misma forma del contrato; alumno sin 'correct').
    quizByLesson,
    // PRD §4: Debate Rank card. Si el RD es alto (>= PROVISIONAL_RD, default 350) el rating
    // aún es "soft"/provisional → estado novato para quien no ha debatido.
    debateRank: {
      rating: Math.round(me?.debateRating ?? 1500),
      rd: Math.round(me?.debateRd ?? 350),
      tier: me?.debateTier || "Novato",
      provisional: (me?.debateRd ?? 350) >= PROVISIONAL_RD,
      recentForm,
    },
    // PRD §6: Debate Hub (flagship). Sólo para roles CON sesión (null si no hay me).
    // DB.debate = dashboard del debatiente (rating/tier/form/history/analytics).
    debate,
    // DB.leaderboard = tabla de la TARJETA DEL AULA: ranking de XP del mes en curso
    // (con `period` y `rows[].xp`) o, sin actividad este mes, el de rating de siempre.
    leaderboard,
    // DB.debateLeaderboard = tabla del DEBATE HUB: top 50 por rating Glicko-2 + mi
    // posición. Siempre por rating, pase lo que pase con la temporada del Aula.
    debateLeaderboard,
    // DB.tournaments = torneos UPCOMING|LIVE con flag `registered`.
    tournaments,
    // PRD §7: Marketplace de coaches (browse/perfil) — visible para TODOS los roles.
    marketplace,
    // PRD §7.5: Coach Workspace (supply-side) — SOLO TEACHER/ADMIN (null si no).
    coachwork,
    // PRD §8: Lifetime Progress Profile — identity + skill graph con atribución +
    // ledger + performance + credenciales + journey + perfil público (§8.4).
    lifetime,
    // PRD §13: membresía por suscripción (simulada en F1).
    membership,
  };

  // PRD §7: "Mis reservas" — SOLO para STUDENT (sus propios bookings).
  if (me?.role === "STUDENT") {
    base.myBookings = myBookings;
    // [BUG vínculo-padre §11.3] Solicitudes de tutela que un PARENT reclamó sobre esta cuenta
    // y siguen PENDING — el alumno las confirma/rechaza (PATCH /api/guardianship) desde
    // Ajustes. Sin esto el vínculo quedaba PENDING para siempre y el alumno nunca se enteraba.
    base.pendingGuardianRequests = (studentGuardianRequests as any[]).map((g) => ({
      id: g.id,
      parentId: g.parentId,
      parentName: esc(g.parent?.name || ""),
      parentEmail: esc(g.parent?.email || ""),
      parentInitials: esc(g.parent?.initials || (g.parent?.name || "?").slice(0, 2).toUpperCase()),
    }));
  }
  // PRD §11: Parent Portal — SOLO para PARENT (role-scoped; un STUDENT/TEACHER
  // NUNCA recibe los datos de hijos de nadie).
  if (parentData) {
    base.parent = parentData;
  }

  // --- SEGMENTACIÓN por rol ------------------------------------------------
  // Un STUDENT NUNCA recibe gradebook, students, manage, teacherCourses ni
  // reviewsReceived. Solo se añaden para TEACHER/ADMIN.
  if (isTeacher) {
    // [BUG-ROSTER-REAL] grade/att/eng/trend/risk/last YA NO se leen de Enrollment (columnas
    // @default sembradas, nunca recalculadas) — se derivan EN VIVO con computeRosterMetrics a
    // partir de las agregaciones batch de arriba (Submission/QuizAttempt/Booking/
    // LessonProgress/ActivityEvent). Sin señal → null/"—" (honesto), nunca un número inventado.
    base.students = (taughtRoster as any[]).map((e: any) => {
      const uid = e.user.id;
      const prog = rosterLessonTotal ? ((rosterProgressCountByStudent.get(uid) || 0) / rosterLessonTotal) * 100 : 0;
      const m = computeRosterMetrics({
        progressPct: prog,
        gradeFromSubmissions: rosterGradeByStudent.get(uid) ?? null,
        gradeFromQuizzes: rosterQuizAvgByStudent.get(uid) ?? null,
        bookingCompleted: rosterBookingByStudent.get(uid)?.completed ?? 0,
        bookingRelevant: rosterBookingByStudent.get(uid)?.relevant ?? 0,
        lastEventAt: rosterLastEventByStudent.get(uid) ?? null,
        recentLast7: rosterLast7ByStudent.get(uid) || 0,
        recentPrior7: rosterPrior7ByStudent.get(uid) || 0,
        nowMs: rosterNowMs,
        lang,
      });
      return {
        id: uid, n: esc(e.user.name), i: esc(e.user.initials), lvl: e.user.level, xp: e.user.xp,
        grade: m.grade, att: m.att, eng: m.eng, trend: m.trend, risk: m.risk, last: m.last, prog: m.prog,
        /* [ADM] Admisión del alumno para el panel del coach: SOLO progreso (cuántos pasos van,
           cuál toca, si terminó). El coach necesita saber a quién le falta terminar de entrar
           —no se da clase a quien no completó la admisión— pero NO ve el formulario: ni cédula,
           ni teléfono, ni firma, ni fecha de nacimiento del tutor. Tampoco viaja el estado del
           CONSENTIMIENTO: es dato legal de la academia y se queda en la consola del admin.
           null = el subsistema no está disponible → el panel no pinta la columna. */
        adm: rosterAdmissionRows
          ? (() => { const p = admissionByStudent.get(uid) || admissionProgress(null);
              return { done: p.done, total: p.total, step: p.step, complete: p.complete }; })()
          : null,
      };
    });

    // --- KPIs del profesor (calculados del roster base.students) ------------
    // avg/attendance/onTime promedian SOLO alumnos con señal real (grade/att no-null, eng
    // distinto de "—") — un alumno sin datos NO cuenta como 0 ni arrastra el promedio del grupo.
    // atRisk = conteo de s.risk truthy (ver computeRosterMetrics para el umbral).
    const engPct = (eng: string): number | null => (eng === "Alto" ? 100 : eng === "Medio" ? 66 : eng === "Bajo" ? 33 : null);
    const roster = base.students as any[];
    const avgOf = (vals: number[]): number =>
      vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
    const numericSignal = (vals: Array<number | null>): number[] => vals.filter((v): v is number => v != null);
    base.teacherKpis = {
      avg: avgOf(numericSignal(roster.map((s) => s.grade))),
      attendance: avgOf(numericSignal(roster.map((s) => s.att))),
      onTime: avgOf(numericSignal(roster.map((s) => engPct(s.eng)))),
      atRisk: roster.filter((s) => s.risk).length,
    };
    // Entregas pendientes (no calificadas) de los cursos del profesor.
    base.pendingSubs = pendingSubs;

    // [F3.1] base.gradebook eliminado: la ruta 'gradebook' está APAGADA (screens.ts) y ningún
    // builder lee DB.gradebook (el feedback es por ballots/rúbricas y session tools, no matriz de
    // notas). Con ello desaparece también la query gradeCell.findMany (tabla entera) del payload.
    // Gestión de contenido: SOLO los cursos del propio profesor (borradores incluidos),
    // no los publicados globales — así un curso recién creado o en borrador sí aparece
    // en el desplegable de "Nuevo módulo" y se le puede añadir contenido.
    base.manage = {
      courses: taughtCourses.map((c: any) => ({ id: c.id, code: c.code, name: esc(c.name) })),
      modules: allModules.map((m) => ({ id: m.id, courseId: m.courseId, title: esc(m.title) })),
    };
    base.teacherCourses = taughtCourses.map((c: any) => ({
      id: c.id, code: c.code, name: esc(c.name), color: c.color, published: c.published, layout: c.layout || "modules",
      format: esc(c.format), modality: esc(c.modality), capacity: c.capacity, summary: esc(c.summary),
      // [EPIC-5] Video de bienvenida (kind/src normalizados; el form de edición los precarga).
      welcomeVideoKind: c.welcomeVideoKind || "none", welcomeVideoSrc: c.welcomeVideoSrc || "",
      modules: c.modules.map((m: any) => ({ id: m.id, title: esc(m.title), hidden: !!m.hidden, lessons: m.lessons.map((l: any) => ({ id: l.id, title: esc(l.title), type: l.type, dur: l.dur, due: l.due, hidden: !!l.hidden, dueAt: l.dueAt ? l.dueAt.toISOString() : null, submitKinds: l.submitKinds ?? null, maxPoints: l.maxPoints ?? null, videoKind: l.videoKind, videoSrc: l.videoSrc, contentHtml: l.contentHtml, releaseAfterId: l.releaseAfterId || null })) })),
    }));
    base.reviewsReceived = reviewsReceived;
  }

  // --- [GOAL-E4 #9] Rama SOLO-ADMIN: catálogo completo para la pantalla "Cursos" ---------
  // El ítem "Cursos" del nav de admin (shell.ts:123) reusa la pantalla `manage` del profesor,
  // que lee DB.teacherCourses = los cursos DE LOS QUE EL USUARIO ES DUEÑO. El admin no
  // imparte ninguno, así que veía "Mis cursos · Sin cursos todavía" mientras su PROPIA
  // pantalla de Métricas reportaba 5 cursos publicados.
  // Se sirve un campo PROPIO (`adminCourses`) en vez de rellenar `teacherCourses`: ese lo
  // consumen también el constructor de cursos y el perfil de coach, y meterle cursos ajenos
  // abriría mutaciones sobre contenido de otro dueño que aquí no se piden.
  // Alcance: LISTAR con su dueño (incluidos los borradores, que es lo que un admin necesita
  // ver) y REASIGNARLO — el endpoint existe: PATCH /api/courses/[id] acepta `teacherId` solo
  // para ADMIN, valida el destino contra OWNER_ROLES, mueve el snapshot `coachName` y deja
  // rastro `course.reassign` en la auditoría (app/api/courses/[id]/route.ts:69-86, F6.3). Por
  // eso viaja también `ownerId`: es el valor que el selector de la tarjeta preselecciona.
  // La query vive en el Promise.all de arriba y solo consulta para ADMIN.
  if (me?.role === "ADMIN") {
    base.adminCourses = (adminCourseRows as any[]).map((c: any) => ({
      id: c.id,
      code: c.code,
      name: esc(pickLang(c.name, c.nameEn)),
      color: c.color,
      published: c.published,
      format: esc(c.format || ""),
      modality: esc(c.modality || ""),
      // Dueño real (relación) con caída al denormalizado `coachName` de la fila.
      ownerId: c.teacher?.id || "",
      ownerName: esc(c.teacher?.name || c.coachName || ""),
      moduleCount: c.modules.length,
      lessonCount: c.modules.reduce((n: number, m: any) => n + (m._count?.lessons || 0), 0),
    }));

    /* [ADM] Admisión a nivel PLATAFORMA (solo ADMIN). Dos cosas que el admin necesita para
       operar: por qué paso va cada alumno y —lo que de verdad importa legalmente— quién tiene
       el consentimiento firmado. `consentPending` cuenta el caso crítico: MENOR con el
       formulario enviado y sin firma de su tutor.

       Lo que NO viaja, a propósito: nombre/cédula/relación/teléfono/correo del tutor, la firma
       misma, el texto del consentimiento (vive en AdmissionConsent, que este archivo no lee),
       fecha de nacimiento, colegio, programa, días preferidos y la URL del vídeo DPP. El admin
       ve un BOOLEANO de consentimiento, no el expediente del menor. Quien necesite la
       evidencia literal (auditoría/legal) la pide por su vía, no por el payload del Aula. */
    if (platformAdmissionRows) {
      const rows = platformAdmissionRows.map((r: any) => {
        const p = admissionProgress(r);
        const minor = r.student?.ageBand === "minor";
        return {
          id: r.student?.id || r.studentId,
          n: esc(r.student?.name || ""),
          i: esc(r.student?.initials || (r.student?.name || "?").slice(0, 2).toUpperCase()),
          minor,
          done: p.done, total: p.total, step: p.step, complete: p.complete,
          consentData: p.consent.data,
          consentGuardian: p.consent.guardian,
          // El único cruce que el admin tiene que poder ver de un vistazo.
          consentPending: minor && p.consent.data && !p.consent.guardian,
        };
      });
      base.adminAdmissions = {
        rows,
        total: rows.length,
        complete: rows.filter((r: any) => r.complete).length,
        inProgress: rows.filter((r: any) => !r.complete).length,
        consentSigned: rows.filter((r: any) => r.consentData).length,
        consentPending: rows.filter((r: any) => r.consentPending).length,
      };
    }
  }

  return base;
}
