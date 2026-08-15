// @ts-nocheck
/* OTR Aula · FLUJO DE ADMISIÓN de 4 pasos (S.admission) — mockup de Isaac.
   Plan: docs/superpowers/plans/2026-08-10-onboarding-admision.md

   Es la PRIMERA pantalla del alumno nuevo: bienvenida → wizard de 4 pasos que se
   desbloquean EN ORDEN → pantalla final "Estás dentro de OTR Academy".

     1 · Formulario de Admisión  → formulario NATIVO (no Typeform): los datos del
         tutor y el consentimiento son la base legal para operar con menores y
         tienen que vivir aquí, no en un tercero.
     2 · Llamada de Descubrimiento → REUSA la reserva que ya existe en el repo
         (GET /api/consultations/availability + POST /api/consultations), no un
         enlace externo "pendiente por añadir".
     3 · Comunidad → el enlace del grupo NO existe todavía. Es CONFIGURABLE y
         mientras no exista se muestra un estado honesto; JAMÁS un enlace roto.
     4 · DPP → rúbrica de 4 puntos + grabar o subir el vídeo (window.otrUpload →
         POST /api/uploads, el mismo camino de highlights y entregas).

   ── Kit y color ──────────────────────────────────────────────────────────────
   Negro/blanco dominante; VERDE (--success / --success-strong) para completado y
   progreso; el naranja no vuelve como superficie. El mockup pinta en naranja el
   asterisco de requerido, el punto de las cabeceras, el accent-color de los radios
   y el aviso de la pantalla final: aquí van, respectivamente, en --danger (la
   convención de .label .req del kit), negro, negro y un panel neutro. Sin emoji:
   la bandera del prefijo telefónico se sustituye por el texto "+1 · RD".

   ── Contrato de escape ───────────────────────────────────────────────────────
   `state.form` guarda SIEMPRE texto CRUDO (lo que el usuario tecleó, o el JSON de
   /api/admission). El builder lo escapa UNA vez al pintarlo dentro de un atributo
   value="…". El único origen ya-escapado es el payload de queries.ts (DB.me de ./data),
   que se des-escapa con admUnesc() al sembrar el formulario para no doble-escapar
   un apellido con apóstrofo. Ver app/lib/queries.ts y tests/esc.test.ts.

   ── Contrato con el backend (agente A0) ──────────────────────────────────────
   GET  /api/admission          → { admission: { steps, form, videoUrl, communityUrl } }
   POST /api/admission/form     → guarda el paso 1 (validación TAMBIÉN en servidor)
   PATCH /api/admission         → { step, done } marca un paso
   POST /api/admission/video    → { url } registra el vídeo del DPP
   Todo defensivo: si un endpoint no existe todavía (404) o falla, el wizard sigue
   funcionando en cliente y lo DICE — nunca finge haber guardado. */
import { DB } from "./data";
import { IC } from "./icons";
import { esc } from "./esc";
import { t, registerDict, fmtMonthNameYear, fmtDayMonthYearTimeRD } from "./i18n";
import { dict as d_adm } from "./i18n-keys/adm";
import { PRIVACY_NOTICE_TEXT, CONSENT_KIND_MEDIA } from "./consent";
import { isValidPhoneNumber } from "./phone";
import {
  DPP_VIDEO_KIND,
  DPP_VIDEO_MIME,
  DPP_VIDEO_MAX_BYTES,
  DPP_VIDEO_TARGET_SECONDS,
} from "./dpp-video";
registerDict(d_adm);

/* ============================================================================
   1 · MODELO — reglas puras (sin DOM). Exportadas para los tests.
   ========================================================================== */

/** El formulario pide TUTOR por debajo de esta edad (lo fija el mockup de Isaac).
 *  OJO: no es el umbral de menor de edad del sistema —las protecciones de
 *  privacidad (COPPA/Guardianship) siguen atadas a <18—, es el umbral con el que
 *  ESTE formulario decide si enseñar el bloque del tutor. */
export const ADM_GUARDIAN_MAX_AGE = 21;

/** Los 4 pasos, en orden. `kind` decide qué contenido monta el panel. */
export const ADM_STEPS = [
  { id: "form", kind: "form", ic: "doc", short: "adm.s1Short", title: "adm.s1Title", tag: "adm.s1Tag", desc: "adm.s1Desc" },
  { id: "call", kind: "scheduler", ic: "calendar", short: "adm.s2Short", title: "adm.s2Title", tag: "adm.s2Tag", desc: "adm.s2Desc" },
  { id: "community", kind: "community", ic: "msgCircle", short: "adm.s3Short", title: "adm.s3Title", tag: "adm.s3Tag", desc: "adm.s3Desc" },
  { id: "dpp", kind: "recorder", ic: "video", short: "adm.s4Short", title: "adm.s4Title", tag: "adm.s4Tag", desc: "adm.s4Desc" },
];

/** Primer paso NO completado = el más lejano al que se puede llegar.
 *  Todo lo que esté por encima está BLOQUEADO (desbloqueo secuencial del mockup). */
export function admReach(done) {
  const d = Array.isArray(done) ? done : [];
  for (let i = 0; i < ADM_STEPS.length; i++) if (!d[i]) return i;
  return ADM_STEPS.length - 1;
}

/** Estado de un paso del rail: "done" | "active" | "pending" | "locked".
 *  `locked` es el array que manda el SERVIDOR (steps[i].locked del contrato de A0);
 *  si no viene, se deduce del orden local. El servidor manda porque es quien aplica
 *  la regla de verdad — el cliente solo la refleja. */
export function admStatus(i, done, step, locked = null) {
  const d = Array.isArray(done) ? done : [];
  if (d[i]) return "done";
  const isLocked = Array.isArray(locked) && typeof locked[i] === "boolean" ? locked[i] : i > admReach(d);
  if (isLocked) return "locked";
  return i === step ? "active" : "pending";
}

export const ADM_STATUS_KEY = { done: "adm.stDone", active: "adm.stActive", pending: "adm.stPending", locked: "adm.stLocked" };

/** "N de 4 · X%" de la cabecera.
 *
 *  [DEFECTO 2026-08-15] Antes contaba `done.filter(Boolean)` sobre lo que viniera en
 *  `admission.steps`. El contrato de A0 manda OBJETOS ({n,key,done,locked,…}), y un
 *  objeto siempre es truthy: una admisión de 2 de 4 se pintaba "4 de 4 · 100%".
 *  Ahora el progreso sale de `stepsDone`/`percent` del servidor cuando existen, y el
 *  conteo local queda solo como respaldo mientras el GET no ha respondido.
 *
 *  Acepta el ESTADO (preferido) o un array de booleanos (cálculo local puro). */
export function admProgress(source) {
  const total = ADM_STEPS.length;
  const isState = !!source && !Array.isArray(source);
  const done = isState ? (source.done || []) : (Array.isArray(source) ? source : []);
  const localCount = done.filter(Boolean).length;

  const serverCount = isState && Number.isFinite(source.stepsDone) ? source.stepsDone : null;
  const count = serverCount == null ? localCount : Math.max(0, Math.min(total, Math.round(serverCount)));

  const serverPct = isState && Number.isFinite(source.percent) ? source.percent : null;
  const percent = serverPct == null ? Math.round((count / total) * 100) : Math.max(0, Math.min(100, Math.round(serverPct)));
  return { count, total, percent };
}

/** Fecha de nacimiento MM/DD/AAAA → Date válida, o null. Rechaza fechas que no
 *  existen (31/02) porque Date las "corrige" en silencio al mes siguiente. */
export function admBirthDate(form) {
  const f = form || {};
  const m = Number(String(f.birthM || "").trim());
  const d = Number(String(f.birthD || "").trim());
  const y = Number(String(f.birthY || "").trim());
  if (!m || !d || !y) return null;
  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1900) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return dt;
}

/** Edad cumplida en años, o null si la fecha no es utilizable.
 *  Se comparan dos cosas de naturaleza distinta, y por eso se leen distinto: el NACIMIENTO es
 *  un día del calendario, que se guarda y se lee en UTC (ver app/api/admission/input.ts), y
 *  "hoy" es el día en el reloj DEL ALUMNO, porque esto se pinta en su navegador. Leer ambos en
 *  UTC hacía que, en zonas muy al este, el día de su cumpleaños número 21 la pantalla siguiera
 *  pidiéndole tutor. */
export function admAge(form, now = Date.now()) {
  const dt = admBirthDate(form);
  if (!dt) return null;
  const ref = new Date(now);
  let age = ref.getFullYear() - dt.getUTCFullYear();
  const beforeBirthday =
    ref.getMonth() < dt.getUTCMonth() ||
    (ref.getMonth() === dt.getUTCMonth() && ref.getDate() < dt.getUTCDate());
  if (beforeBirthday) age--;
  return age;
}

/** ¿Hay que pedir los datos del tutor? Sí si la edad es menor de 21.
 *  Sin fecha todavía → NO se enseña el bloque (no se pide algo que no sabemos si aplica). */
export function admNeedsGuardian(form, now = Date.now()) {
  const age = admAge(form, now);
  if (age == null) return false;
  return age < ADM_GUARDIAN_MAX_AGE;
}

const ADM_EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const admDigits = (s) => String(s || "").replace(/\D+/g, "");

/** Validación de CLIENTE del paso 1. Devuelve { <campo>: <llave i18n del error> }.
 *  El servidor valida OTRA VEZ (A0): esto es feedback, no seguridad. */
export function admValidate(form, now = Date.now()) {
  const f = form || {};
  const e = {};
  const txt = (v) => String(v == null ? "" : v).trim();

  if (txt(f.firstName).length < 2) e.firstName = "adm.eName";
  if (txt(f.lastName).length < 2) e.lastName = "adm.eLastName";

  const birth = admBirthDate(f);
  if (!birth) e.birth = "adm.eBirth";
  else if (birth.getTime() > now) e.birth = "adm.eBirthRange";

  if (!isValidPhoneNumber(f.phone)) e.phone = "adm.ePhone";
  if (!ADM_EMAIL_RE.test(txt(f.email))) e.email = "adm.eEmail";
  if (!txt(f.program)) e.program = "adm.eProgram";
  // El consentimiento es OBLIGATORIO: sin él no hay base para tratar los datos.
  if (f.consent !== true) e.consent = "adm.eConsent";

  if (admNeedsGuardian(f, now)) {
    if (txt(f.gName).length < 2) e.gName = "adm.eGName";
    if (txt(f.gDoc).length < 5) e.gDoc = "adm.eGDoc";
    if (!txt(f.gRel)) e.gRel = "adm.eGRel";
    if (!isValidPhoneNumber(f.gPhone)) e.gPhone = "adm.eGPhone";
    if (txt(f.gSign).length < 3) e.gSign = "adm.eGSign";
  }
  return e;
}

/** Enlace del grupo de la comunidad. CONFIGURABLE (payload/API), nunca hardcodeado.
 *  Solo se acepta http(s) absoluto: cualquier otra cosa (javascript:, vacío, basura)
 *  devuelve "" y la pantalla pinta el estado honesto "disponible en breve". */
export function admCommunityUrl(raw) {
  const s = String(raw || "").trim();
  if (!s) return "";
  if (!/^https?:\/\//i.test(s)) return "";
  return s;
}

/* Vídeo del DPP. NO se redefine nada aquí: el contrato —qué formatos, cuánto pesa, cuánto
   dura y con qué `kind` hay que subirlo— es el de app/lib/dpp-video.ts, el mismo que aplica
   el servidor. Cuando esta pantalla tenía sus propias copias, subía con `kind:"video"` y el
   servidor no aplicaba NINGUNA de las reglas del DPP: un vídeo de 45 s entraba sin queja
   mientras la pantalla prometía 30 s, y el tope anunciado (25 MB) no era el real (16 MB). */
export const ADM_VIDEO_MIME = [...DPP_VIDEO_MIME];
export const ADM_MAX_VIDEO_BYTES = DPP_VIDEO_MAX_BYTES;
export const ADM_MAX_VIDEO_SECONDS = DPP_VIDEO_TARGET_SECONDS;

/** Motivo por el que un archivo NO sirve como vídeo del DPP, o "" si sirve. */
export function admVideoReject(file) {
  if (!file) return "adm.dppBadType";
  const type = String(file.type || "").toLowerCase();
  if (!ADM_VIDEO_MIME.includes(type)) return "adm.dppBadType";
  if (Number(file.size || 0) > ADM_MAX_VIDEO_BYTES) return "adm.dppTooBig";
  return "";
}

/* ============================================================================
   2 · ESTADO — vive en window.__admission para sobrevivir a los repintados.
   ========================================================================== */

/* Campos del formulario en el ORDEN de la pantalla. Los desplegables guardan el
   CÓDIGO del contrato de A0 (SECUNDARIA, DEBATE_COMPETITIVO…), no la etiqueta que
   se ve: la etiqueta la pone t() y el código es lo que viaja y lo que la API valida
   contra su allowlist (app/api/admission/input.ts). */
const ADM_FORM_KEYS = [
  "firstName", "lastName", "birthM", "birthD", "birthY", "phone", "email", "school", "level",
  "gName", "gDoc", "gRel", "gPhone", "gEmail", "gSign",
  "program", "experience", "days", "mediaConsent",
];

export const ADM_GRADE_LEVELS = [
  { v: "SECUNDARIA", labelKey: "adm.lvSecundaria" },
  { v: "BACHILLERATO", labelKey: "adm.lvBachillerato" },
  { v: "UNIVERSIDAD", labelKey: "adm.lvUniversidad" },
  { v: "GRADUADO", labelKey: "adm.lvGraduado" },
];
export const ADM_PROGRAMS = [
  { v: "DEBATE_COMPETITIVO", k: "A", labelKey: "adm.progDebate" },
  { v: "ORATORIA", k: "B", labelKey: "adm.progOratoria" },
  { v: "TALLER_INTENSIVO", k: "C", labelKey: "adm.progTaller" },
];
export const ADM_RELATIONS = [
  { v: "PADRE_MADRE", k: "A", labelKey: "adm.relParent" },
  { v: "TUTOR_LEGAL", k: "B", labelKey: "adm.relLegal" },
  { v: "TUTOR", k: "C", labelKey: "adm.relOther" },
];
export const ADM_DAYS = [
  { v: "LUN_MIE", k: "A", labelKey: "adm.dayLW" },
  { v: "MAR_JUE", k: "B", labelKey: "adm.dayTT" },
  { v: "OTRO", k: "C", labelKey: "adm.dayOther" },
];
export const ADM_EXPERIENCE = [
  { v: "true", k: "S", labelKey: "adm.yes" },
  { v: "false", k: "N", labelKey: "adm.no" },
];

function admBlankForm() {
  const f = {};
  ADM_FORM_KEYS.forEach((k) => { f[k] = ""; });
  f.consent = false;
  return f;
}

/** Deshace el escape del PAYLOAD (queries.ts escapa una vez). Solo se usa al sembrar
 *  el formulario desde DB.me (./data): dentro de un input el usuario tiene que ver
 *  «O'Brien», no «O&#39;Brien», y el builder volverá a escaparlo al pintar. */
export function admUnesc(s) {
  return String(s == null ? "" : s)
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

export function admDefaultState() {
  return {
    view: "welcome",            // welcome | wizard | done
    step: 0,
    done: [false, false, false, false],
    locked: null,               // steps[i].locked del servidor (null = dedúcelo del orden)
    stepsDone: null,            // admission.stepsDone — MANDA sobre el conteo local
    percent: null,              // admission.percent
    form: admBlankForm(),
    errors: {},
    saving: false,
    notice: "",                 // aviso honesto del último guardado fallido
    loaded: false,              // ya se resolvió GET /api/admission (o su fallo)
    fetching: false,            // hay un GET en vuelo (no relanzar en cada repintado)
    // paso 2
    cal: null,                  // { y, m } mes visible del calendario
    day: "",                    // YYYY-MM-DD elegido
    slots: null,                // null = sin cargar · [] = ninguno libre
    slotsLoading: false,
    slot: "",                   // ISO del slot elegido
    bookedAt: "",               // ISO ya confirmado
    bookingId: "",              // ConsultationBooking que satisface el paso 2
    schedClosed: false,         // la agenda en línea no está disponible
    // paso 3
    communityUrl: "",
    communityOpened: false,
    // paso 4
    videoUrl: "",
    dppMsg: "",
    dppBusy: false,
    recording: false,
    rec: null,
  };
}

function ADM() {
  const w = typeof window === "undefined" ? {} : window;
  if (!w.__admission) w.__admission = admDefaultState();
  return w.__admission;
}

/** Reinicio explícito (lo usa "Ver el proceso de nuevo" y los tests). */
export function admResetState() {
  const w = typeof window === "undefined" ? {} : window;
  w.__admission = admDefaultState();
  return w.__admission;
}

/** Lee un paso del array `steps` del contrato de A0.
 *  Acepta el objeto real ({n,key,done,locked,completedAt}) y, defensivamente, un
 *  booleano suelto. Lo que NO se acepta es "el elemento existe → está hecho": ese
 *  atajo es el que pintaba "4 de 4 · 100%" con 2 pasos hechos. */
export function admStepFlags(entry) {
  if (typeof entry === "boolean") return { done: entry, locked: null };
  if (!entry || typeof entry !== "object") return { done: false, locked: null };
  return {
    done: entry.done === true,
    locked: typeof entry.locked === "boolean" ? entry.locked : null,
  };
}

/** Parte "AAAA-MM-DD" en las tres casillas del formulario. */
export function admSplitBirth(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ""));
  return m ? { birthY: m[1], birthM: m[2], birthD: m[3] } : null;
}

/** Siembra el estado con lo que sepamos: el payload del alumno + /api/admission.
 *  Todo opcional: si falta un dato se degrada al valor en blanco.
 *
 *  Contrato de escape: A0 escapa UNA vez el texto libre que devuelve (school, todo
 *  el bloque guardian…). Aquí se DES-escapa al meterlo en `state.form`, porque el
 *  builder lo vuelve a escapar al pintarlo dentro de value="…" y si no saldría
 *  «O&amp;#39;Brien» dentro del input. El invariante es: `state.form` siempre crudo. */
export function admHydrate(st, payload, me, opts = {}) {
  const a = (payload && (payload.admission || payload)) || {};
  const raw = (v) => admUnesc(v == null ? "" : v);

  const steps = Array.isArray(a.steps) ? a.steps : null;
  if (steps) {
    const flags = ADM_STEPS.map((_, i) => admStepFlags(steps[i]));
    st.done = flags.map((f) => f.done);
    st.locked = flags.some((f) => f.locked !== null) ? flags.map((f) => f.locked === true) : null;
  }
  // El progreso lo dice el SERVIDOR (stepsDone/percent), no el cliente.
  st.stepsDone = Number.isFinite(a.stepsDone) ? a.stepsDone : null;
  st.percent = Number.isFinite(a.percent) ? a.percent : null;

  /* [IMAGEN] Se rehidrata desde los consentimientos vivos —fuera del bloque del formulario,
     porque no viven en él— y esto NO es cosmético: la casilla viaja en CADA guardado y un
     `false` significa "retírala". Si al volver al paso 1 a corregir un teléfono saliera
     desmarcada, guardar borraría una autorización que nadie pidió retirar, y en silencio. */
  st.form.mediaConsent = (a.consents || []).some((c) => c && c.kind === CONSENT_KIND_MEDIA);

  const f = a.form && typeof a.form === "object" ? a.form : null;
  if (f) {
    const birth = admSplitBirth(f.birthDateISO || f.birthDate);
    if (birth) Object.assign(st.form, birth);
    if (f.phone != null) st.form.phone = raw(f.phone);
    if (f.school != null) st.form.school = raw(f.school);
    if (f.gradeLevel != null) st.form.level = String(f.gradeLevel || "");
    if (f.program != null) st.form.program = String(f.program || "");
    if (f.preferredDays != null) st.form.days = String(f.preferredDays || "");
    if (typeof f.priorExperience === "boolean") st.form.experience = String(f.priorExperience);
  }
  const g = a.guardian && typeof a.guardian === "object" ? a.guardian : null;
  if (g) {
    st.form.gName = raw(g.name);
    st.form.gDoc = raw(g.document);
    st.form.gRel = String(g.relation || "");
    st.form.gPhone = raw(g.phone);
    st.form.gEmail = raw(g.email);
    st.form.gSign = raw(g.signature);
  }
  // El consentimiento ya aceptado deja la casilla marcada (no se vuelve a pedir).
  if (Array.isArray(a.consents) && a.consents.some((c) => c && c.kind === "data_processing")) st.form.consent = true;

  if (a.dppVideoUrl || a.videoUrl) st.videoUrl = String(a.dppVideoUrl || a.videoUrl);
  if (a.discoveryBookingId) st.bookingId = String(a.discoveryBookingId);
  if (a.bookedAt) st.bookedAt = String(a.bookedAt);
  // El enlace del grupo NO está en el contrato de A0 todavía: se lee de donde
  // aparezca y, si no aparece, el paso 3 pinta su estado honesto.
  st.communityUrl = admCommunityUrl(a.communityUrl || a.whatsappUrl || (payload && payload.communityUrl));

  // Semilla desde el payload del Aula (ya escapado): nombre y correo del alumno.
  if (me) {
    const full = admUnesc(me.name || "").trim();
    if (full && !st.form.firstName && !st.form.lastName) {
      const parts = full.split(/\s+/);
      st.form.firstName = parts.shift() || "";
      st.form.lastName = parts.join(" ");
    }
    if (me.email) st.form.email = admUnesc(me.email);   // identidad de la sesión: no editable
  }
  // Solo en la PRIMERA carga se decide dónde aterriza el alumno. Tras una mutación
  // (guardar el formulario, marcar un paso) manda la navegación que él ya hizo:
  // re-hidratar no debe teletransportarlo a la pantalla final sin pulsar Finalizar.
  if (!opts.keepView) {
    st.step = admReach(st.done);
    if (st.done.every(Boolean)) st.view = "done";
    else if (st.done.some(Boolean)) st.view = "wizard";
  }
  st.loaded = true;
  return st;
}

/* ============================================================================
   3 · BUILDERS — devuelven strings de HTML (patrón de todas las scr-*.ts).
   ========================================================================== */

const admReq = ` <span class="req" aria-hidden="true">*</span>`;

/** Campo de texto con label REAL (for/id), hint y error asociados por aria. */
function admField(id, labelKey, value, opts = {}) {
  const err = opts.err ? t(opts.err) : "";
  const hint = opts.hintKey ? t(opts.hintKey) : "";
  const describedBy = [hint ? `${id}-hint` : "", err ? `${id}-err` : ""].filter(Boolean).join(" ");
  return `<div class="field adm-field">
    <label class="label" for="${id}">${t(labelKey)}${opts.required ? admReq : ""}</label>
    <input class="input${err ? " err" : ""}" id="${id}" name="${id}" type="${opts.type || "text"}"
      data-adm-f="${esc(opts.key || id)}" value="${esc(value || "")}"
      ${opts.inputmode ? `inputmode="${opts.inputmode}"` : ""} ${opts.autocomplete ? `autocomplete="${opts.autocomplete}"` : ""}
      ${opts.maxlength ? `maxlength="${opts.maxlength}"` : ""} ${opts.required ? 'required aria-required="true"' : ""} ${opts.readonly ? "readonly" : ""}
      placeholder="${esc(opts.placeholder != null ? opts.placeholder : t("adm.formPlaceholder"))}"
      ${err ? 'aria-invalid="true"' : ""} ${describedBy ? `aria-describedby="${describedBy}"` : ""} />
    ${hint ? `<p class="hint" id="${id}-hint">${hint}</p>` : ""}
    ${err ? `<p class="adm-err" id="${id}-err">${IC.info}${err}</p>` : ""}
  </div>`;
}

/** Grupo de opciones (radio) con fieldset/legend — un <label for> no puede cubrir
 *  varias entradas, así que la etiqueta del grupo ES la leyenda. Con opts.legendSr
 *  la leyenda queda solo para lectores (la cabecera numerada ya la enseña en pantalla,
 *  y repetirla dos veces sería ruido visual). */
function admRadioGroup(name, legendKey, options, value, opts = {}) {
  const err = opts.err ? t(opts.err) : "";
  const items = options.map((o, i) => {
    const id = `${name}-${i}`;
    return `<label class="adm-opt" for="${id}">
      <input type="radio" id="${id}" name="${name}" value="${esc(o.v)}" data-adm-f="${esc(opts.key || name)}"${value === o.v ? " checked" : ""} />
      <span class="adm-opt-key" aria-hidden="true">${esc(o.k)}</span>
      <span class="adm-opt-t">${t(o.labelKey)}</span>
    </label>`;
  }).join("");
  return `<fieldset class="adm-group${opts.cols ? " adm-group--cols" : ""}"${err ? ` aria-describedby="${name}-err"` : ""}>
    <legend class="${opts.legendSr ? "sr-only" : "label"}">${t(legendKey)}${opts.required && !opts.legendSr ? admReq : ""}</legend>
    <div class="adm-opts${opts.stack ? " adm-opts--stack" : ""}${opts.cols ? " adm-opts--cols" : ""}">${items}</div>
    ${err ? `<p class="adm-err" id="${name}-err">${IC.info}${err}</p>` : ""}
  </fieldset>`;
}

/* ---------------------------------------------------------------- bienvenida */
export function admWelcome(st) {
  const resumed = (st && st.done || []).some(Boolean);
  return `<section class="adm-hero card--dark" aria-labelledby="adm-welcome-h">
    <span class="lbl">${t("adm.welcomeEyebrow")}</span>
    <h1 class="adm-hero-h" id="adm-welcome-h">${t("adm.welcomeTitle")}</h1>
    <p class="adm-hero-p">${t("adm.welcomeLead")}</p>
    <div class="adm-hero-cta">
      <button class="btn btn-lg adm-btn-invert" id="adm-start">${resumed ? t("adm.welcomeResume") : t("adm.welcomeCta")} ${IC.arrowR}</button>
      <span class="adm-hero-meta">${t("adm.welcomeMeta")}</span>
    </div>
  </section>`;
}

/* ---------------------------------------------------------------------- rail */
export function admRail(st) {
  const items = ADM_STEPS.map((s, i) => {
    const status = admStatus(i, st.done, st.step, st.locked);
    const locked = status === "locked";
    const label = `${t("adm.stepOf").replace("{n}", String(i + 1))}: ${t(s.short)} — ${t(ADM_STATUS_KEY[status])}${locked ? ". " + t("adm.lockedHint") : ""}`;
    const mark = status === "done" ? IC.check : locked ? IC.lock : String(i + 1);
    return `<li class="adm-rail-i">
      <button type="button" class="adm-rail-b adm-rail-b--${status}" data-adm-go="${i}"
        ${locked ? 'disabled aria-disabled="true"' : ""} ${status === "active" ? 'aria-current="step"' : ""}
        aria-label="${esc(label)}">
        <span class="adm-dot" aria-hidden="true">${mark}</span>
        <span class="adm-rail-t" aria-hidden="true">
          <span class="adm-rail-n">${t(s.short)}</span>
          <span class="adm-rail-s">${t(ADM_STATUS_KEY[status])}</span>
        </span>
      </button>
    </li>`;
  }).join("");
  return `<nav class="adm-rail" aria-label="${t("adm.railAria")}"><ol class="adm-rail-l">${items}</ol></nav>`;
}

/* ------------------------------------------------------------------ progreso */
export function admProgressBar(st) {
  const { count, percent } = admProgress(st);
  const text = t("adm.progressCount").replace("{n}", String(count));
  return `<div class="adm-top">
    <div class="adm-top-r">
      <p class="adm-top-n" id="adm-progress-label">${text}</p>
      <span class="adm-support">${IC.headset}${t("adm.support")}</span>
      <b class="adm-top-p">${percent}%</b>
    </div>
    <div class="adm-bar" role="progressbar" aria-labelledby="adm-progress-label"
      aria-valuemin="0" aria-valuemax="4" aria-valuenow="${count}"
      aria-valuetext="${esc(t("adm.progressValueText").replace("{n}", String(count)).replace("{p}", String(percent)))}">
      <i style="width:${percent}%"></i>
    </div>
    ${/* Se pinta VACÍA y la rellena mount(): una región live recién insertada en el
         DOM no la anuncian los lectores; una que YA existía y cambia de texto, sí. */""}
    <p class="sr-only" id="adm-live" role="status" aria-live="polite" data-adm-say="${esc(text)}"></p>
  </div>`;
}

/* ------------------------------------------------ paso 1 · formulario nativo */
export function admFormBlock(st, now = Date.now()) {
  const f = st.form || {};
  const e = st.errors || {};
  const guardian = admNeedsGuardian(f, now);
  const errCount = Object.keys(e).length;

  // Las secciones se numeran por lo que SE VE: si el bloque del tutor no aplica, el
  // formulario lee 1-2-3-4 y no 1-3-4-5 (un salto se lee como un fallo, no como una
  // sección oculta). admRenumberSections() lo rehace en vivo al cambiar la edad.
  const n = (base) => (guardian ? base : base - 1);   // 2 = el bloque del tutor
  const sec = (num, titleKey, extra = "") =>
    `<div class="adm-sec-h"><span class="adm-sec-n" aria-hidden="true">${num}</span><h3 class="adm-sec-t">${t(titleKey)}${extra}</h3></div>`;

  const birthErr = e.birth ? t(e.birth) : "";
  const birth = `<fieldset class="adm-group">
    <legend class="label">${t("adm.fBirth")}${admReq}</legend>
    <div class="adm-birth">
      <label class="sr-only" for="adm-birthM">${t("adm.fBirthMM")}</label>
      <input class="input adm-birth-i${birthErr ? " err" : ""}" id="adm-birthM" data-adm-f="birthM" inputmode="numeric" maxlength="2" placeholder="MM" value="${esc(f.birthM || "")}" ${birthErr ? 'aria-invalid="true" aria-describedby="adm-birth-err"' : 'aria-describedby="adm-birth-hint"'} />
      <span class="adm-birth-sep" aria-hidden="true">/</span>
      <label class="sr-only" for="adm-birthD">${t("adm.fBirthDD")}</label>
      <input class="input adm-birth-i${birthErr ? " err" : ""}" id="adm-birthD" data-adm-f="birthD" inputmode="numeric" maxlength="2" placeholder="DD" value="${esc(f.birthD || "")}" ${birthErr ? 'aria-invalid="true" aria-describedby="adm-birth-err"' : 'aria-describedby="adm-birth-hint"'} />
      <span class="adm-birth-sep" aria-hidden="true">/</span>
      <label class="sr-only" for="adm-birthY">${t("adm.fBirthYY")}</label>
      <input class="input adm-birth-i adm-birth-i--y${birthErr ? " err" : ""}" id="adm-birthY" data-adm-f="birthY" inputmode="numeric" maxlength="4" placeholder="AAAA" value="${esc(f.birthY || "")}" ${birthErr ? 'aria-invalid="true" aria-describedby="adm-birth-err"' : 'aria-describedby="adm-birth-hint"'} />
    </div>
    <p class="hint" id="adm-birth-hint">${t("adm.fBirthHint")}</p>
    ${birthErr ? `<p class="adm-err" id="adm-birth-err">${IC.info}${birthErr}</p>` : ""}
  </fieldset>`;

  const phone = (id, key, labelKey, value, err, required) => {
    const errTxt = err ? t(err) : "";
    return `<div class="field adm-field">
      <label class="label" for="${id}">${t(labelKey)}${required ? admReq : ""}</label>
      <div class="adm-phone${errTxt ? " err" : ""}">
        <span class="adm-phone-cc" aria-hidden="true">${t("adm.phoneCc")}</span>
        <input class="input" id="${id}" data-adm-f="${key}" type="tel" inputmode="tel" autocomplete="tel"
          placeholder="(809) 555-0123" value="${esc(value || "")}" ${required ? 'required aria-required="true"' : ""}
          ${errTxt ? `aria-invalid="true" aria-describedby="${id}-err"` : `aria-describedby="${id}-hint"`} />
      </div>
      <p class="hint" id="${id}-hint">${t("adm.fPhoneHint")}</p>
      ${errTxt ? `<p class="adm-err" id="${id}-err">${IC.info}${errTxt}</p>` : ""}
    </div>`;
  };

  // El <option> guarda el CÓDIGO del contrato (SECUNDARIA…), no la etiqueta visible.
  const levelSel = `<div class="field adm-field">
    <label class="label" for="adm-level">${t("adm.fLevel")}</label>
    <select class="select" id="adm-level" data-adm-f="level">
      <option value="">${t("adm.lvPick")}</option>
      ${ADM_GRADE_LEVELS.map((o) => `<option value="${esc(o.v)}"${f.level === o.v ? " selected" : ""}>${t(o.labelKey)}</option>`).join("")}
    </select>
  </div>`;

  const guardianBlock = `<div class="adm-sec" id="adm-guardian"${guardian ? "" : " hidden"}>
    ${sec(2, "adm.sec2")}
    <p class="adm-sec-note">${t("adm.sec2Why")}</p>
    <div class="adm-grid">
      ${admField("adm-gName", "adm.gName", f.gName, { key: "gName", err: e.gName, required: guardian, autocomplete: "name" })}
      ${admField("adm-gDoc", "adm.gDoc", f.gDoc, { key: "gDoc", err: e.gDoc, required: guardian })}
    </div>
    ${admRadioGroup("adm-grel", "adm.gRel", ADM_RELATIONS, f.gRel, { key: "gRel", err: e.gRel, required: guardian })}
    <div class="adm-grid">
      ${phone("adm-gPhone", "gPhone", "adm.gPhone", f.gPhone, e.gPhone, guardian)}
      ${admField("adm-gEmail", "adm.gEmail", f.gEmail, { key: "gEmail", type: "email", hintKey: "adm.gEmailHint", placeholder: "tutor@ejemplo.com" })}
    </div>
    ${/* La firma va DESPUÉS del texto que se firma: una firma sin clausulado no
         prueba nada. El texto es CONSENT_TEXT_GUARDIAN, el mismo que la API registra
         como evidencia (app/api/admission/input.ts, agente A0). */""}
    <div class="adm-consent adm-consent--sign">
      <p class="adm-consent-t">${t("adm.consentGuardian")}</p>
      ${admField("adm-gSign", "adm.gSign", f.gSign, { key: "gSign", err: e.gSign, required: guardian, hintKey: "adm.gSignHint" })}
    </div>
  </div>`;

  const consentErr = e.consent ? t(e.consent) : "";
  /* [LEY 172-13] Informar ANTES de pedir el consentimiento, no después y no en otra página:
     el aviso entero se pinta aquí encima de la casilla, en un bloque con su propio scroll
     para que no empuje el formulario tres pantallas hacia abajo. Es <details> abierto por
     defecto —se puede plegar tras leerlo, pero nadie tiene que abrir nada para verlo— y su
     texto sale de la MISMA constante que la API registra como evidencia. */
  const aviso = `<details class="adm-notice" open>
    <summary class="adm-notice-s">${t("adm.noticeTitle")}</summary>
    <div class="adm-notice-b" tabindex="0" role="region" aria-label="${t("adm.noticeTitle")}">
      ${PRIVACY_NOTICE_TEXT.split("\n\n").map((p) => `<p>${esc(p)}</p>`).join("")}
    </div>
  </details>`;

  const consent = `${aviso}<div class="adm-consent${consentErr ? " err" : ""}">
    <label class="adm-consent-l" for="adm-consent">
      <input type="checkbox" id="adm-consent" data-adm-f="consent"${f.consent ? " checked" : ""}
        ${consentErr ? 'aria-invalid="true" aria-describedby="adm-consent-err"' : ""} required aria-required="true" />
      <span>${t("adm.consent")}</span>
    </label>
    ${consentErr ? `<p class="adm-err" id="adm-consent-err">${IC.info}${consentErr}</p>` : ""}
  </div>
  ${/* [IMAGEN] Separada, opcional y sin `required`: la difusión pública de la imagen de un
       menor no puede ir dentro del consentimiento que hace falta para inscribirse — sería
       ni libre ni específica. El rótulo dice que es opcional para que no se marque por
       inercia creyendo que hace falta. */""}
  <div class="adm-consent adm-consent--opt">
    <label class="adm-consent-l" for="adm-media">
      <input type="checkbox" id="adm-media" data-adm-f="mediaConsent"${f.mediaConsent ? " checked" : ""} />
      <span><b class="adm-consent-opt">${t("adm.mediaOptional")}</b> ${t("adm.consentMedia")}</span>
    </label>
  </div>`;

  return `<div class="adm-box">
    <div class="adm-box-h"><span class="adm-box-dot" aria-hidden="true"></span>${t("adm.formHeader")}</div>
    <form class="adm-box-b" id="adm-form" novalidate>
      ${errCount ? `<p class="adm-alert" id="adm-form-alert" tabindex="-1" role="alert">${IC.info}${t("adm.errSummary").replace("{n}", String(errCount))}</p>` : ""}
      ${st.notice ? `<p class="adm-alert adm-alert--soft" role="status">${IC.info}${esc(st.notice)}</p>` : ""}

      <div class="adm-sec">
        ${sec(1, "adm.sec1")}
        <div class="adm-grid">
          ${admField("adm-firstName", "adm.fName", f.firstName, { key: "firstName", err: e.firstName, required: true, autocomplete: "given-name" })}
          ${admField("adm-lastName", "adm.fLastName", f.lastName, { key: "lastName", err: e.lastName, required: true, autocomplete: "family-name" })}
        </div>
        ${birth}
        ${phone("adm-phone", "phone", "adm.fPhone", f.phone, e.phone, true)}
        ${admField("adm-email", "adm.fEmail", f.email, { key: "email", err: e.email, required: true, type: "email", autocomplete: "email", placeholder: "nombre@ejemplo.com", readonly: !!String(f.email || "").trim(), hintKey: String(f.email || "").trim() ? "adm.emailLocked" : "" })}
        <div class="adm-grid">
          ${admField("adm-school", "adm.fSchool", f.school, { key: "school" })}
          ${levelSel}
        </div>
      </div>

      ${guardianBlock}

      <div class="adm-sec">
        ${sec(n(3), "adm.sec3", admReq)}
        ${admRadioGroup("adm-program", "adm.sec3", ADM_PROGRAMS, f.program, { key: "program", err: e.program, cols: true, legendSr: true })}
      </div>

      <div class="adm-sec">
        ${sec(n(4), "adm.sec4")}
        ${admRadioGroup("adm-exp", "adm.sec4", ADM_EXPERIENCE, f.experience, { key: "experience", legendSr: true })}
      </div>

      <div class="adm-sec">
        ${sec(n(5), "adm.sec5")}
        ${admRadioGroup("adm-days", "adm.sec5", ADM_DAYS, f.days, { key: "days", stack: true, legendSr: true })}
      </div>

      ${consent}

      <div class="adm-box-f">
        <button type="submit" class="btn btn-accent" id="adm-form-save"${st.saving ? " disabled" : ""}>
          ${st.saving ? t("adm.formSaving") : t("adm.formSave")}${st.saving ? "" : " " + IC.arrowR}
        </button>
      </div>
    </form>
  </div>`;
}

/* --------------------------------------------- paso 2 · agenda (reusa la API) */
const ADM_HORIZON_DAYS = 30;                 // espejo de app/lib/consultations.ts
const ADM_CLOSED_DOW = new Set([0]);         // domingo cerrado (OPEN_DOW = 1..6)
const admPad = (n) => String(n).padStart(2, "0");
export const admDayKey = (y, m, d) => `${y}-${admPad(m + 1)}-${admPad(d)}`;

/** Celdas del mes: null para el relleno inicial, o { key, n, disabled }. */
export function admMonthCells(y, m, now = Date.now()) {
  const first = new Date(y, m, 1);
  const lead = (first.getDay() + 6) % 7;                        // rejilla lunes-primero
  const days = new Date(y, m + 1, 0).getDate();
  const ref = new Date(now);
  const today = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate()).getTime();
  const horizon = today + ADM_HORIZON_DAYS * 86400000;
  const cells = [];
  for (let i = 0; i < lead; i++) cells.push(null);
  for (let d = 1; d <= days; d++) {
    const dt = new Date(y, m, d);
    const time = dt.getTime();
    const disabled = time < today || time > horizon || ADM_CLOSED_DOW.has(dt.getDay());
    cells.push({ key: admDayKey(y, m, d), n: d, disabled });
  }
  return cells;
}

export function admSchedBlock(st, now = Date.now()) {
  if (st.bookedAt) {
    return `<div class="adm-box">
      <div class="adm-box-h"><span class="adm-box-dot" aria-hidden="true"></span>${t("adm.schedHeader")}</div>
      <div class="adm-box-b">
        <p class="adm-ok">${IC.checkCircle}${t("adm.schedBooked").replace("{when}", esc(fmtDayMonthYearTimeRD(st.bookedAt)))}</p>
      </div>
    </div>`;
  }
  if (st.schedClosed) {
    return `<div class="adm-box">
      <div class="adm-box-h"><span class="adm-box-dot" aria-hidden="true"></span>${t("adm.schedHeader")}</div>
      <div class="adm-box-b"><p class="adm-alert adm-alert--soft" role="status">${IC.info}${t("adm.schedClosed")}</p></div>
    </div>`;
  }

  const cal = st.cal || (() => { const d = new Date(now); return { y: d.getFullYear(), m: d.getMonth() }; })();
  const cells = admMonthCells(cal.y, cal.m, now);
  const dow = t("adm.schedDow").split(",");
  const grid = cells.map((c) => {
    if (!c) return `<span class="adm-cal-c adm-cal-c--pad" aria-hidden="true"></span>`;
    const sel = st.day === c.key;
    return `<button type="button" class="adm-cal-c${sel ? " is-sel" : ""}" data-adm-day="${c.key}"
      ${c.disabled ? 'disabled aria-disabled="true"' : ""} ${sel ? 'aria-pressed="true"' : 'aria-pressed="false"'}>${c.n}</button>`;
  }).join("");

  const slotList = st.slotsLoading
    ? `<p class="adm-slot-msg">${t("adm.schedLoading")}</p>`
    : !st.day
      ? `<p class="adm-slot-msg">${t("adm.schedNoDay")}</p>`
      : !st.slots || st.slots.length === 0
        ? `<p class="adm-slot-msg">${t("adm.schedNone")}</p>`
        : st.slots.map((s) => `<button type="button" class="adm-slot${st.slot === s.iso ? " is-sel" : ""}" data-adm-slot="${esc(s.iso)}" aria-pressed="${st.slot === s.iso ? "true" : "false"}">${esc(s.label)}</button>`).join("");

  return `<div class="adm-box">
    <div class="adm-box-h"><span class="adm-box-dot" aria-hidden="true"></span>${t("adm.schedHeader")}</div>
    <div class="adm-sched">
      <div class="adm-cal">
        <div class="adm-cal-h">
          <b id="adm-cal-m">${esc(fmtMonthNameYear(new Date(cal.y, cal.m, 1)))}</b>
          <span class="adm-cal-nav">
            <button type="button" class="adm-cal-b" data-adm-mon="-1" aria-label="${t("adm.schedPrev")}">${IC.chevL}</button>
            <button type="button" class="adm-cal-b" data-adm-mon="1" aria-label="${t("adm.schedNext")}">${IC.chevR}</button>
          </span>
        </div>
        <div class="adm-cal-dow" aria-hidden="true">${dow.map((d) => `<span>${esc(d)}</span>`).join("")}</div>
        <div class="adm-cal-g" role="group" aria-labelledby="adm-cal-m">${grid}</div>
      </div>
      <div class="adm-slots">
        <p class="adm-slots-h" id="adm-slots-h">${st.day ? t("adm.schedPickSlot") : t("adm.schedPickDay")}</p>
        <div class="adm-slots-l" role="group" aria-labelledby="adm-slots-h" aria-busy="${st.slotsLoading ? "true" : "false"}">${slotList}</div>
        <button type="button" class="btn btn-accent adm-sched-cta" id="adm-book"${st.slot && !st.saving ? "" : " disabled"}>
          ${st.saving ? t("adm.schedBooking") : t("adm.schedConfirm")}
        </button>
      </div>
    </div>
  </div>`;
}

/* --------------------------------------------------------- paso 3 · comunidad */
export function admCommunityBlock(st) {
  const url = admCommunityUrl(st.communityUrl);
  const cta = url
    ? `<a class="btn btn-accent" id="adm-comm-join" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${IC.msgCircle}${t("adm.commJoin")} ${IC.arrowUR}</a>`
    : `<span class="adm-soon">${IC.clock}${t("adm.commSoon")}</span>`;
  return `<div class="adm-box">
    <div class="adm-box-h"><span class="adm-box-dot" aria-hidden="true"></span>${t("adm.commHeader")}</div>
    <div class="adm-box-b">
      ${/* Sin frase repetida: el tagline del paso ya lo dice justo encima. Aquí va
           la acción y, si el enlace no existe, el estado honesto. */""}
      <div class="adm-comm">${cta}</div>
      ${url
        ? (st.communityOpened ? `<p class="adm-alert adm-alert--soft" role="status">${IC.info}${t("adm.commOpenedNote")}</p>` : "")
        : `<p class="adm-alert adm-alert--soft" role="status">${IC.info}${t("adm.commSoonNote")}</p>`}
    </div>
  </div>`;
}

/* --------------------------------------------------------------- paso 4 · DPP */
export function admDppBlock(st) {
  const mb = Math.round(ADM_MAX_VIDEO_BYTES / (1024 * 1024));
  const stage = st.videoUrl
    ? `<video class="adm-vid" src="${esc(st.videoUrl)}" controls playsinline preload="metadata"></video>`
    : `<div class="adm-stage" id="adm-stage">
        <video class="adm-vid adm-vid--live" id="adm-preview" muted playsinline${st.recording ? "" : " hidden"}></video>
        <div class="adm-stage-empty"${st.recording ? " hidden" : ""}>
          ${IC.video}<span>${t("adm.dppPreview")}</span>
        </div>
        <span class="adm-rec-badge"${st.recording ? "" : " hidden"} id="adm-rec-badge">
          <i aria-hidden="true"></i><span id="adm-rec-time">${t("adm.dppTimer").replace("{s}", "0")}</span>
        </span>
      </div>`;

  return `<div class="adm-box">
    <div class="adm-box-h"><span class="adm-box-dot" aria-hidden="true"></span>${t("adm.dppHeader")}</div>
    <div class="adm-box-b">
      ${stage}
      <div class="adm-dpp-acts">
        <button type="button" class="btn btn-accent" id="adm-rec"${st.dppBusy ? " disabled" : ""}>${IC.mic}${st.recording ? t("adm.dppStop") : t("adm.dppRecord")}</button>
        <button type="button" class="btn btn-ghost" id="adm-pick"${st.dppBusy ? " disabled" : ""}>${IC.file}${t("adm.dppUpload")}</button>
        <input type="file" id="adm-file" accept="${ADM_VIDEO_MIME.join(",")}" hidden />
        <span class="hint">${t("adm.dppHint").replace("{mb}", String(mb))}</span>
      </div>
      ${st.dppMsg ? `<p class="adm-alert adm-alert--soft" role="status">${IC.info}${esc(st.dppMsg)}</p>` : ""}
      ${st.videoUrl ? `<p class="adm-ok">${IC.checkCircle}${t("adm.dppReady")}</p>` : ""}
      <div class="adm-rubric">
        <p class="lbl">${t("adm.dppRubric")}</p>
        <ul class="adm-rubric-l">
          ${["adm.r1", "adm.r2", "adm.r3", "adm.r4"].map((k) => `<li>${IC.check}<span>${t(k)}</span></li>`).join("")}
        </ul>
      </div>
    </div>
  </div>`;
}

/* --------------------------------------------------------------- panel + pie */
export function admPanel(st, now = Date.now()) {
  const s = ADM_STEPS[st.step] || ADM_STEPS[0];
  const done = !!st.done[st.step];
  const body =
    s.kind === "form" ? admFormBlock(st, now)
      : s.kind === "scheduler" ? admSchedBlock(st, now)
        : s.kind === "community" ? admCommunityBlock(st)
          : admDppBlock(st);

  // El paso 1 se completa GUARDANDO el formulario y el 4 SUBIENDO el vídeo: ahí un
  // "marcar como completado" a mano dejaría pasar a alguien sin datos y sin DPP.
  // Solo la llamada y la comunidad —que ocurren FUERA de la plataforma— se confirman
  // a mano, que es justo lo que hace el mockup.
  const canMark = !done && (s.kind === "scheduler" || s.kind === "community");
  const last = st.step === ADM_STEPS.length - 1;

  return `<section class="adm-panel" aria-labelledby="adm-step-h">
    <div class="adm-panel-chips">
      <span class="chip chip--outline">${t("adm.stepOf").replace("{n}", String(st.step + 1))}</span>
      ${done ? `<span class="chip chip--done">${IC.check}${t("adm.stDone")}</span>` : ""}
    </div>
    <h2 class="adm-step-h" id="adm-step-h" tabindex="-1">${t(s.title)}</h2>
    <p class="adm-step-tag">${t(s.tag)}</p>
    ${t(s.desc) ? `<p class="adm-step-desc">${t(s.desc)}</p>` : ""}
    ${/* El aviso del último fallo del servidor se ve EN el paso, no en un toast que
         se va: si la API dice "agenda tu llamada antes", el alumno tiene que leerlo. */""}
    ${st.notice && s.kind !== "form" ? `<p class="adm-alert adm-notice" role="alert">${IC.info}${esc(st.notice)}</p>` : ""}
    ${body}
    <div class="adm-foot">
      <button type="button" class="btn btn-quiet" id="adm-back">${IC.arrowL}${t("adm.back")}</button>
      <div class="adm-foot-r">
        ${canMark ? `<button type="button" class="btn btn-ghost" id="adm-mark">${IC.check}${st.step === 2 && !admCommunityUrl(st.communityUrl) ? t("adm.commAck") : st.step === 2 ? t("adm.commDone") : t("adm.markDone")}</button>` : ""}
        <button type="button" class="btn btn-accent" id="adm-next"${done ? "" : ' disabled aria-describedby="adm-next-hint"'}>
          ${last ? t("adm.finish") : t("adm.next")} ${IC.arrowR}
        </button>
        ${done ? "" : `<span class="sr-only" id="adm-next-hint">${t("adm.nextLocked")}</span>`}
      </div>
    </div>
  </section>`;
}

/* ------------------------------------------------------------ pantalla final */
export function admDoneScreen() {
  const rows = ADM_STEPS.map((s) => `<li class="adm-done-i"><span class="adm-done-c" aria-hidden="true">${IC.check}</span>${t(s.short)}</li>`).join("");
  return `<section class="adm-done card--dark" aria-labelledby="adm-done-h">
    <h1 class="adm-done-h" id="adm-done-h">${t("adm.doneTitle")}</h1>
    <p class="adm-done-p">${t("adm.doneLead")}</p>
    <ul class="adm-done-l">${rows}</ul>
    <p class="adm-done-note">${IC.headset}<span>${t("adm.doneSupport")}</span></p>
    <div class="adm-done-cta">
      <button class="btn btn-lg adm-btn-invert" id="adm-enter">${t("adm.doneEnter")} ${IC.arrowR}</button>
      <button class="btn adm-btn-onDark" id="adm-review">${t("adm.doneReview")}</button>
    </div>
  </section>`;
}

/* ============================================================================
   4 · PANTALLA — render() arma el string; mount() cablea los handlers.
   ========================================================================== */

export const S = {};

S.admission = {
  render() {
    const st = ADM();
    // Mientras no sepamos por qué paso va el alumno no se pinta la bienvenida: si
    // ya tenía pasos hechos, verla un instante y saltar sería un parpadeo mentiroso.
    if (!st.loaded) return `<div class="adm"><p class="adm-loading" role="status">${t("adm.loading")}</p></div>`;
    if (st.view === "welcome") return `<div class="adm">${admWelcome(st)}</div>`;
    if (st.view === "done") return `<div class="adm">${admDoneScreen(st)}</div>`;
    return `<div class="adm">
      ${admProgressBar(st)}
      <div class="adm-body">
        ${admRail(st)}
        ${admPanel(st)}
      </div>
    </div>`;
  },

  mount(root) {
    if (!root) return;
    const st = ADM();
    const w = window;

    /* -------- repintado local (no se navega: el wizard vive en una sola ruta) */
    const repaint = (focus) => {
      admStopCamera(st);
      const page = root.querySelector(".page") || root.querySelector(".adm")?.parentElement || root;
      page.innerHTML = S.admission.render();
      S.admission.mount(root);
      const target = focus && root.querySelector(focus);
      if (target && typeof target.focus === "function") { try { target.focus({ preventScroll: false }); } catch { target.focus(); } }
    };

    /* [A11Y] Anuncia el progreso por la región live que acaba de pintarse: se
       rellena en un tick posterior para que el lector lo lea como un CAMBIO. */
    const say = root.querySelector("#adm-live");
    if (say) setTimeout(() => { say.textContent = say.getAttribute("data-adm-say") || ""; }, 60);

    /* -------------------------------------------- carga inicial del progreso */
    if (!st.loaded && !st.fetching) {
      st.fetching = true;   // marca ANTES del await: un repaint no relanza el GET
      (async () => {
        let payload;
        // Defensivo a propósito: si /api/admission todavía no existe (404) o falla,
        // el wizard arranca en blanco y funciona igual — no se queda cargando.
        try { payload = await w.api("/api/admission", undefined, "GET"); } catch { payload = null; }
        admHydrate(st, payload, DB?.me);
        st.fetching = false;
        repaint();
      })();
    }

    /* ------------------------------------------------------------ bienvenida */
    root.querySelector("#adm-start")?.addEventListener("click", () => {
      st.view = "wizard";
      st.step = admReach(st.done);
      repaint("#adm-step-h");
    });

    /* ------------------------------------------------------ rail + pie de nav */
    root.querySelectorAll("[data-adm-go]").forEach((b) => b.addEventListener("click", () => {
      const i = Number(b.getAttribute("data-adm-go"));
      if (admStatus(i, st.done, st.step, st.locked) === "locked") return;   // no se salta el orden
      st.step = i; st.errors = {}; st.notice = "";
      repaint("#adm-step-h");
    }));

    root.querySelector("#adm-back")?.addEventListener("click", () => {
      if (st.step === 0) { st.view = "welcome"; repaint("#adm-start"); return; }
      st.step--; st.errors = {}; st.notice = "";
      repaint("#adm-step-h");
    });

    root.querySelector("#adm-next")?.addEventListener("click", () => {
      if (!st.done[st.step]) return;
      if (st.step < ADM_STEPS.length - 1) { st.step++; st.errors = {}; st.notice = ""; repaint("#adm-step-h"); }
      else { st.view = "done"; repaint("#adm-done-h"); }
    });

    root.querySelector("#adm-mark")?.addEventListener("click", async (ev) => {
      ev.currentTarget.disabled = true;
      const ok = await admMarkStep(st, st.step, DB?.me);
      if (!ok && st.notice) w.toast?.(st.notice, "danger");
      repaint("#adm-step-h");
    });

    root.querySelector("#adm-comm-join")?.addEventListener("click", () => { st.communityOpened = true; });

    /* -------------------------------------------------------- pantalla final */
    root.querySelector("#adm-review")?.addEventListener("click", () => { st.view = "wizard"; st.step = 0; repaint("#adm-step-h"); });
    root.querySelector("#adm-enter")?.addEventListener("click", () => { w.go?.("dashboard"); });

    /* ------------------------------------------------- paso 1 · el formulario */
    // Cada tecla escribe en el estado: navegar entre pasos NO pierde lo escrito.
    root.querySelectorAll("[data-adm-f]").forEach((el) => {
      const key = el.getAttribute("data-adm-f");
      const evName = el.type === "checkbox" || el.type === "radio" || el.tagName === "SELECT" ? "change" : "input";
      el.addEventListener(evName, () => {
        if (el.type === "checkbox") st.form[key] = !!el.checked;
        else if (el.type === "radio") { if (el.checked) st.form[key] = el.value; }
        else st.form[key] = el.value;
        if (key === "birthM" || key === "birthD" || key === "birthY") admSyncGuardian(root, st);
      });
    });

    root.querySelector("#adm-form")?.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      if (st.saving) return;
      st.errors = admValidate(st.form);
      st.notice = "";
      if (Object.keys(st.errors).length) { repaint("#adm-form-alert"); return; }

      st.saving = true; repaint();
      let saved = true;
      try {
        // POST /api/admission — el servidor VUELVE a validar y devuelve la admisión
        // entera (stepsDone/percent/steps): de ahí sale el progreso, no de aquí.
        const r = await w.api("/api/admission", admFormPayload(st.form));
        if (r && r.admission) admHydrate(st, r, DB?.me, { keepView: true }); else st.done[0] = true;
      }
      catch (e) { saved = false; st.notice = (e && e.message) || t("adm.formSaveError"); }
      st.saving = false;
      if (saved) {
        w.toast?.(t("adm.formSaved"), "ok");
        st.step = st.done[0] ? 1 : 0;
      } else {
        // Guardado fallido: NO se marca el paso (nunca fingimos haber guardado).
        w.toast?.(st.notice, "danger");
      }
      repaint("#adm-step-h");
    });

    /* --------------------------------------------------- paso 2 · el calendario */
    root.querySelectorAll("[data-adm-mon]").forEach((b) => b.addEventListener("click", () => {
      const delta = Number(b.getAttribute("data-adm-mon"));
      const base = st.cal || (() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; })();
      const d = new Date(base.y, base.m + delta, 1);
      st.cal = { y: d.getFullYear(), m: d.getMonth() };
      repaint("#adm-cal-m");
    }));

    root.querySelectorAll("[data-adm-day]").forEach((b) => b.addEventListener("click", async () => {
      const day = b.getAttribute("data-adm-day");
      st.day = day; st.slot = ""; st.slots = null; st.slotsLoading = true;
      repaint();
      let slots;
      try {
        const r = await w.api(`/api/consultations/availability?date=${encodeURIComponent(day)}`, undefined, "GET");
        slots = Array.isArray(r?.slots) ? r.slots : [];
      } catch { slots = []; }
      st.slots = slots; st.slotsLoading = false;
      repaint();
    }));

    root.querySelectorAll("[data-adm-slot]").forEach((b) => b.addEventListener("click", () => {
      st.slot = b.getAttribute("data-adm-slot");
      repaint();
    }));

    root.querySelector("#adm-book")?.addEventListener("click", async () => {
      if (!st.slot || st.saving) return;
      st.saving = true; repaint();
      const me = DB?.me || {};
      let okBooked = true;
      try {
        await w.api("/api/consultations", {
          name: [st.form.firstName, st.form.lastName].filter(Boolean).join(" ") || admUnesc(me.name || ""),
          email: st.form.email || admUnesc(me.email || ""),
          phone: st.form.phone || null,
          level: st.form.experience === "true" ? "Algo de experiencia" : "Nunca he debatido",
          format: st.form.program || null,
          slotAt: st.slot,
        });
      } catch (e) {
        okBooked = false;
        // 410 = la agenda en línea está apagada en esta fase: se dice, no se rompe.
        if (/410|desactivad|unavailable/i.test((e && e.message) || "")) st.schedClosed = true;
        else w.toast?.((e && e.message) || t("adm.schedError"), "danger");
      }
      st.saving = false;
      // La reserva la crea /api/consultations; el paso 2 lo marca el SERVIDOR, que
      // comprueba que existe una reserva viva del alumno antes de darlo por hecho.
      if (okBooked) { st.bookedAt = st.slot; await admMarkStep(st, 1, me); }
      repaint("#adm-step-h");
    });

    /* ---------------------------------------------------------- paso 4 · DPP */
    root.querySelector("#adm-pick")?.addEventListener("click", () => root.querySelector("#adm-file")?.click());
    root.querySelector("#adm-file")?.addEventListener("change", async (ev) => {
      const file = ev.target?.files?.[0];
      if (!file) return;
      await admSendVideo(st, file, repaint);
    });
    root.querySelector("#adm-rec")?.addEventListener("click", async () => {
      if (st.recording) { admStopRecording(st); return; }
      await admStartRecording(st, root, repaint);
    });
  },
};

/* ============================================================================
   5 · EFECTOS — red, cámara y subida. Aislados del render para poder testear.
   ========================================================================== */

/** Cuerpo de POST /api/admission (paso 1), EXACTAMENTE como lo espera A0.
 *  Texto CRUDO: el servidor valida y escapa al persistir/servir.
 *  NO viaja `email`: la API no lo acepta a propósito — cambiar la identidad de la
 *  sesión desde un formulario de admisión sería un vector de secuestro de cuenta. */
export function admFormPayload(form, now = Date.now()) {
  const f = form || {};
  const txt = (v) => String(v == null ? "" : v).trim();
  const birth = admBirthDate(f);
  const pad = (n) => String(n).padStart(2, "0");

  const body = {
    firstName: txt(f.firstName),
    lastName: txt(f.lastName),
    birthDate: birth ? `${birth.getUTCFullYear()}-${pad(birth.getUTCMonth() + 1)}-${pad(birth.getUTCDate())}` : "",
    phone: txt(f.phone),
    school: txt(f.school),
    gradeLevel: txt(f.level),
    program: txt(f.program),
    preferredDays: txt(f.days),
    consent: f.consent === true,
    // Voluntario: viaja siempre, y `false` significa "no la doy" o "la retiro".
    mediaConsent: f.mediaConsent === true,
  };
  if (f.experience === "true" || f.experience === "false") body.priorExperience = f.experience === "true";

  // Bloque del tutor: solo viaja si la edad lo exige (<21). Mandarlo cuando no
  // aplica sería guardar datos de un tercero sin ningún motivo.
  if (admNeedsGuardian(f, now)) {
    body.guardianName = txt(f.gName);
    body.guardianDocument = txt(f.gDoc);
    body.guardianRelation = txt(f.gRel);
    body.guardianPhone = txt(f.gPhone);
    body.guardianSignature = txt(f.gSign);
    if (txt(f.gEmail)) body.guardianEmail = txt(f.gEmail);   // opcional: enlaza el Guardianship
  }
  return body;
}

/** Marca un paso con PATCH /api/admission/step. El SERVIDOR decide (exige el orden,
 *  la reserva viva del paso 2 y el vídeo del 4) y devuelve la admisión entera: el
 *  cliente no adivina el progreso, lo REFLEJA. Devuelve true si el paso quedó hecho. */
async function admMarkStep(st, index, me) {
  try {
    const r = await window.api?.("/api/admission/step", { step: index + 1 }, "PATCH");
    if (r && r.admission) admHydrate(st, r, me, { keepView: true });
    else st.done[index] = true;   // API ausente/antigua: al menos no se queda colgado
    st.notice = "";
    return !!st.done[index];
  } catch (e) {
    // El servidor manda: si dice que falta la reserva o el vídeo, el paso NO se marca.
    st.notice = (e && e.message) || t("adm.markError");
    return false;
  }
}

/** Sube el vídeo por el camino que YA existe (window.otrUpload → /api/uploads) y
 *  registra la URL en la admisión. */
async function admSendVideo(st, file, repaint) {
  const reject = admVideoReject(file);
  if (reject) {
    st.dppMsg = t(reject).replace("{mb}", String(Math.round(ADM_MAX_VIDEO_BYTES / (1024 * 1024))));
    repaint();
    return;
  }
  st.dppBusy = true; st.dppMsg = t("adm.dppUploading"); repaint();
  try {
    const up = await window.otrUpload(file, DPP_VIDEO_KIND);
    st.videoUrl = String(up?.url || "");
    st.dppMsg = "";
    // Registrar el vídeo NO completa el paso 4 (la regla de orden vive en el
    // servidor): primero se guarda la URL y DESPUÉS se pide marcar el paso.
    let registered = true;
    try { const r = await window.api("/api/admission/video", { url: st.videoUrl }); if (r && r.admission) admHydrate(st, r, DB?.me, { keepView: true }); }
    catch (e) { registered = false; st.dppMsg = (e && e.message) || t("adm.dppError"); }
    if (registered) {
      st.step = 3;
      await admMarkStep(st, 3, DB?.me);
      window.toast?.(t("adm.dppSaved"), "ok");
    }
  } catch (e) {
    st.dppMsg = (e && e.message) || t("adm.dppError");
  }
  st.dppBusy = false;
  repaint();
}

/** Apaga cámara/micrófono. Se llama en CADA repintado: el <video> se destruye con
 *  el innerHTML y el stream quedaría vivo (luz de la cámara encendida). */
function admStopCamera(st) {
  const rec = st && st.rec;
  if (!rec) return;
  try { if (rec.timer) clearInterval(rec.timer); } catch { /* noop */ }
  try { if (rec.recorder && rec.recorder.state === "recording") rec.recorder.stop(); } catch { /* noop */ }
  try { rec.stream?.getTracks?.().forEach((tr) => tr.stop()); } catch { /* noop */ }
  st.rec = null;
  st.recording = false;
}

async function admStartRecording(st, root, repaint) {
  const md = navigator?.mediaDevices;
  if (!md?.getUserMedia || typeof window.MediaRecorder !== "function") {
    st.dppMsg = t("adm.dppNoCam"); repaint(); return;
  }
  let stream;
  try { stream = await md.getUserMedia({ video: true, audio: true }); }
  catch { st.dppMsg = t("adm.dppNoCam"); repaint(); return; }

  st.recording = true; st.dppMsg = "";
  repaintKeepStream(st, stream, root, repaint);
}

/* El repintado apaga la cámara a propósito, así que al EMPEZAR a grabar se pinta
   primero y se engancha el stream después, sobre el <video> ya vivo. */
function repaintKeepStream(st, stream, root, repaint) {
  repaint();
  const video = root.querySelector("#adm-preview");
  const chunks = [];
  let recorder;
  try { recorder = new window.MediaRecorder(stream); }
  catch { try { stream.getTracks().forEach((tr) => tr.stop()); } catch { /* noop */ } st.recording = false; st.dppMsg = t("adm.dppNoCam"); repaint(); return; }

  if (video) { try { video.srcObject = stream; video.play?.(); } catch { /* noop */ } }
  recorder.ondataavailable = (ev) => { if (ev.data && ev.data.size) chunks.push(ev.data); };
  recorder.onstop = async () => {
    try { stream.getTracks().forEach((tr) => tr.stop()); } catch { /* noop */ }
    st.recording = false;
    const blob = new Blob(chunks, { type: "video/webm" });
    const file = new File([blob], "dpp.webm", { type: "video/webm" });
    await admSendVideo(st, file, repaint);
  };
  let secs = 0;
  const timer = setInterval(() => {
    secs++;
    const el = root.querySelector("#adm-rec-time");
    if (el) el.textContent = t("adm.dppTimer").replace("{s}", String(secs));
    if (secs >= ADM_MAX_VIDEO_SECONDS) admStopRecording(st);
  }, 1000);
  st.rec = { stream, recorder, timer };
  recorder.start();
}

function admStopRecording(st) {
  const rec = st && st.rec;
  if (!rec) return;
  try { if (rec.timer) clearInterval(rec.timer); } catch { /* noop */ }
  try { if (rec.recorder && rec.recorder.state === "recording") rec.recorder.stop(); } catch { /* noop */ }
  st.rec = null;
}

/** Enseña/oculta el bloque del tutor SIN repintar (no se pierde el foco ni el
 *  cursor mientras el alumno teclea su fecha de nacimiento). */
function admSyncGuardian(root, st) {
  const block = root.querySelector("#adm-guardian");
  if (!block) return;
  const need = admNeedsGuardian(st.form);
  if (need) block.removeAttribute("hidden"); else block.setAttribute("hidden", "");
  admRenumberSections(root);
}

/** Renumera las secciones VISIBLES (1, 2, 3…). Sin esto, ocultar el bloque del
 *  tutor dejaría el formulario numerado 1-3-4-5, que se lee como un fallo. */
function admRenumberSections(root) {
  const secs = Array.from(root.querySelectorAll(".adm-sec")).filter((s) => !s.hasAttribute("hidden"));
  secs.forEach((s, i) => { const n = s.querySelector(".adm-sec-n"); if (n) n.textContent = String(i + 1); });
}
