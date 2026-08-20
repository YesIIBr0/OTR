/* [FE-TEST · ADMISIÓN] El wizard de admisión de 4 pasos (app/lib/scr-admission.ts).
 *
 * Es la PRIMERA pantalla del alumno nuevo y la que recoge datos personales de menores
 * y de sus tutores, así que lo que se blinda aquí es lo que puede hacer daño de verdad:
 *   ① el DESBLOQUEO SECUENCIAL: no se salta un paso, y el rail lo dice (disabled + aria);
 *   ② el BLOQUE DE TUTOR aparece —y se exige— SOLO por edad (<21), como pide el formulario;
 *   ③ la VALIDACIÓN de cliente es real y el error viaja PEGADO a su campo (aria-invalid +
 *      aria-describedby), no en un toast genérico;
 *   ④ el CONSENTIMIENTO es obligatorio: sin él no se guarda nada, aunque el resto esté lleno;
 *   ⑤ el enlace de la comunidad NO existe todavía → estado honesto, JAMÁS un href roto;
 *   ⑥ contrato de escape, accesibilidad de etiquetas, i18n ES+EN y kit sin naranja.
 *
 * Los builders son módulos "@ts-nocheck" que solo arman strings → se prueban en Node con
 * un stub de window (mismo patrón que screens.test.ts / ronda3-highlights.test.ts).
 */
import { describe, it, expect, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/* eslint-disable @typescript-eslint/no-explicit-any */
(globalThis as any).window = (globalThis as any).window || {};
const win: any = (globalThis as any).window;
win.api = async () => ({});
win.go = () => {};
win.toast = () => {};
win.otrUpload = async () => ({});

import {
  ADM_STEPS,
  ADM_GUARDIAN_MAX_AGE,
  ADM_VIDEO_MIME,
  ADM_MAX_VIDEO_BYTES,
  admReach,
  admStepFlags,
  admStatus,
  admProgress,
  admBirthDate,
  admAge,
  admNeedsGuardian,
  admValidate,
  admCommunityUrl,
  admVideoReject,
  admUnesc,
  admDefaultState,
  admResetState,
  admHydrate,
  admFormPayload,
  admMonthCells,
  admWelcome,
  admRail,
  admProgressBar,
  admFormBlock,
  admSchedBlock,
  admCommunityBlock,
  admDppBlock,
  admPanel,
  admDoneScreen,
  S as SAdmission,
} from "../app/lib/scr-admission";
import { ROUTES } from "../app/lib/screens";
import { t } from "../app/lib/i18n";
import { dict as admDict } from "../app/lib/i18n-keys/adm";
import { CONSENT_TEXT_DATA, CONSENT_TEXT_GUARDIAN, CONSENT_TEXT_MEDIA, CONSENT_BINDING_LANG, PRIVACY_NOTICE_TEXT } from "../app/lib/consent";
import { DPP_VIDEO_KIND, DPP_VIDEO_MIME, DPP_VIDEO_MAX_BYTES } from "../app/lib/dpp-video";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");

/** Fecha fija de referencia: 15 de agosto de 2026 (evita tests que caducan).
 *  Va en componentes LOCALES a mediodía a propósito: el calendario de la agenda razona en la
 *  hora del alumno —"hoy" es hoy donde él está—, así que un instante en UTC puro haría que el
 *  test dijera "ayer" donde el código dice "hoy" según la zona de quien lo corra. La EDAD, en
 *  cambio, se calcula en UTC (es una fecha civil), y a mediodía ambas lecturas coinciden. */
const NOW = new Date(2026, 7, 15, 12, 0, 0, 0).getTime();
/** admValidate vive en un módulo "@ts-nocheck": su retorno se infiere como {}. */
const errs = (f: unknown, now: number = NOW) => admValidate(f, now) as Record<string, string>;
const payload = (f: unknown) => admFormPayload(f) as Record<string, unknown>;

const born = (y: number, m = 6, d = 15) => ({ birthY: String(y), birthM: String(m), birthD: String(d) });

/** Formulario COMPLETO y válido de una persona mayor de 21 (sin bloque de tutor). */
const adultForm = () => ({
  ...admDefaultState().form,
  firstName: "Camila",
  lastName: "Reyes",
  ...born(2000),
  phone: "(809) 555-0123",
  email: "camila@ejemplo.com",
  program: "DEBATE_COMPETITIVO",
  consent: true,
});

/** El mismo formulario pero de una menor de 21 → exige tutor. */
const minorForm = (extra: Record<string, unknown> = {}) => ({
  ...adultForm(),
  ...born(2010),
  ...extra,
});

const guardianData = {
  gName: "Marta Reyes",
  gDoc: "001-1234567-8",
  gRel: "PADRE_MADRE",
  gPhone: "8295550199",
  gSign: "Marta Reyes",
};

beforeEach(() => { admResetState(); });

/* ================= ① desbloqueo secuencial ================= */
describe("① los 4 pasos se abren EN ORDEN (no se salta ninguno)", () => {
  it("con nada hecho solo se alcanza el paso 1; el 2, 3 y 4 están bloqueados", () => {
    const done = [false, false, false, false];
    expect(admReach(done)).toBe(0);
    expect(admStatus(0, done, 0)).toBe("active");
    expect(admStatus(1, done, 0)).toBe("locked");
    expect(admStatus(2, done, 0)).toBe("locked");
    expect(admStatus(3, done, 0)).toBe("locked");
  });

  it("al completar el 1 se abre EXACTAMENTE el 2 (y el 3 sigue bloqueado)", () => {
    const done = [true, false, false, false];
    expect(admReach(done)).toBe(1);
    expect(admStatus(0, done, 1)).toBe("done");
    expect(admStatus(1, done, 1)).toBe("active");
    expect(admStatus(2, done, 1)).toBe("locked");
  });

  it("un paso alcanzable pero no visitado es 'pendiente', no 'bloqueado'", () => {
    const done = [true, true, false, false];
    expect(admStatus(2, done, 3 /* imposible, pero el estado no miente */)).toBe("pending");
    expect(admStatus(3, done, 2)).toBe("locked");
  });

  it("el rail deshabilita de VERDAD los pasos bloqueados y marca el activo con aria-current", () => {
    const st = admDefaultState();
    st.done = [true, false, false, false];
    st.step = 1;
    const html = admRail(st);
    // el paso 3 (índice 2) está bloqueado: botón inerte para ratón Y para teclado
    expect(html).toContain('data-adm-go="2"');
    expect(html).toMatch(/data-adm-go="2"[^>]*disabled/);
    expect(html).toMatch(/data-adm-go="2"[^>]*aria-disabled="true"/);
    // el activo se anuncia como paso actual
    expect(html).toMatch(/data-adm-go="1"[^>]*aria-current="step"/);
    // y el completado NO está deshabilitado (se puede volver a mirar)
    expect(html).not.toMatch(/data-adm-go="0"[^>]*disabled/);
  });

  it("el nombre accesible de cada botón del rail lleva número, paso y estado", () => {
    const st = admDefaultState();
    const html = admRail(st);
    expect(html).toContain(`aria-label="${t("adm.stepOf").replace("{n}", "1")}: ${t("adm.s1Short")} — ${t("adm.stActive")}`);
    // el bloqueado además explica POR QUÉ lo está
    expect(html).toContain(t("adm.lockedHint"));
  });

  it("el botón Siguiente nace deshabilitado mientras el paso no esté hecho", () => {
    const st = admDefaultState();
    st.view = "wizard";
    const html = admPanel(st, NOW);
    expect(html).toMatch(/id="adm-next"[^>]*disabled/);
    expect(html).toContain(t("adm.nextLocked"));

    st.done[0] = true;
    expect(admPanel(st, NOW)).not.toMatch(/id="adm-next"[^>]*disabled/);
  });

  it("el paso 1 y el 4 NO ofrecen 'marcar como completado' (se completan con datos reales)", () => {
    const st = admDefaultState();
    st.view = "wizard";
    st.step = 0;
    expect(admPanel(st, NOW)).not.toContain('id="adm-mark"');
    st.step = 3;
    expect(admPanel(st, NOW)).not.toContain('id="adm-mark"');
    // la llamada y la comunidad ocurren FUERA de la plataforma: esas sí se confirman
    st.step = 1;
    expect(admPanel(st, NOW)).toContain('id="adm-mark"');
    st.step = 2;
    expect(admPanel(st, NOW)).toContain('id="adm-mark"');
  });

  it("el progreso cuenta y se anuncia (0/4, 2/4, 4/4)", () => {
    expect(admProgress([false, false, false, false])).toEqual({ count: 0, total: 4, percent: 0 });
    expect(admProgress([true, true, false, false])).toEqual({ count: 2, total: 4, percent: 50 });
    expect(admProgress([true, true, true, true])).toEqual({ count: 4, total: 4, percent: 100 });

    const st = admDefaultState();
    st.done = [true, true, false, false];
    const html = admProgressBar(st);
    expect(html).toContain('role="progressbar"');
    expect(html).toContain('aria-valuenow="2"');
    expect(html).toContain('aria-valuemax="4"');
    expect(html).toContain(t("adm.progressCount").replace("{n}", "2"));
    expect(html).toContain('aria-live="polite"');
  });
});

/* ================= ①bis · REGRESIÓN: el progreso sale del servidor =================
   [DEFECTO 2026-08-15] El wizard pintaba "4 de 4 · 100%" con una admisión de 2 de 4.
   Causa: `admission.steps` del contrato de A0 son OBJETOS ({n,key,done,locked,…}) y
   la hidratación hacía `!!steps[i]` — un objeto SIEMPRE es truthy, así que los cuatro
   pasos salían hechos. Estos casos fijan la respuesta REAL de la API. */
describe("①bis una admisión de 2 de 4 se pinta 2 de 4 (no 4 de 4)", () => {
  // Respuesta literal del contrato de A0 (§1.5 de su reporte), recortada a lo que lee el front.
  const media = () => ({
    ok: true,
    admission: {
      exists: true, status: "IN_PROGRESS",
      stepsDone: 2, totalSteps: 4, percent: 50,
      steps: [
        { n: 1, key: "form", label: "Formulario de Admisión", done: true, locked: false, completedAt: "2026-08-09T17:00:48.653Z" },
        { n: 2, key: "call", label: "Llamada de Descubrimiento", done: true, locked: false, completedAt: "2026-08-10T12:00:00.000Z" },
        { n: 3, key: "community", label: "Comunidad de WhatsApp", done: false, locked: false, completedAt: null },
        { n: 4, key: "video", label: "Documentar tu Punto de Partida", done: false, locked: true, completedAt: null },
      ],
      form: { birthDateISO: "2007-03-09", phone: "+18095550101", school: "Colegio La Vega", gradeLevel: "UNIVERSIDAD", program: "ORATORIA", priorExperience: true, preferredDays: "LUN_MIE" },
      guardian: null, dppVideoUrl: "", consents: [{ kind: "data_processing", version: "2026-08" }],
    },
  });

  it("un paso del contrato es un OBJETO: 'existe' no significa 'hecho'", () => {
    expect(admStepFlags({ n: 3, done: false, locked: false })).toEqual({ done: false, locked: false });
    expect(admStepFlags({ n: 4, done: false, locked: true })).toEqual({ done: false, locked: true });
    expect(admStepFlags({ n: 1, done: true, locked: false })).toEqual({ done: true, locked: false });
    // y sigue tragando un booleano suelto, por si alguna vez llega así
    expect(admStepFlags(true)).toEqual({ done: true, locked: null });
    expect(admStepFlags(undefined)).toEqual({ done: false, locked: null });
  });

  it("hidratar la respuesta real deja 2 hechos, no 4", () => {
    const st = admHydrate(admResetState(), media(), null);
    expect(st.done).toEqual([true, true, false, false]);
    expect(st.stepsDone).toBe(2);
    expect(st.percent).toBe(50);
  });

  it("la cabecera dice «2 de 4 pasos completados» y 50%", () => {
    const st = admHydrate(admResetState(), media(), null);
    expect(admProgress(st)).toEqual({ count: 2, total: 4, percent: 50 });
    const html = admProgressBar(st);
    expect(html).toContain(t("adm.progressCount").replace("{n}", "2"));
    expect(html).toContain(">50%<");
    expect(html).toContain('aria-valuenow="2"');
    expect(html).toContain("width:50%");
    expect(html).not.toContain(t("adm.progressCount").replace("{n}", "4"));
    expect(html).not.toContain(">100%<");
  });

  it("MANDA el servidor: si stepsDone dice 2, la cabecera dice 2 aunque el array local dijera otra cosa", () => {
    const st = admDefaultState();
    st.done = [true, true, true, true];      // conteo local desincronizado a propósito
    st.stepsDone = 2; st.percent = 50;
    expect(admProgress(st)).toEqual({ count: 2, total: 4, percent: 50 });
    // y sin dato del servidor, el conteo local sigue sirviendo de respaldo
    expect(admProgress({ done: [true, false, false, false], stepsDone: null, percent: null }))
      .toEqual({ count: 1, total: 4, percent: 25 });
  });

  it("el rail a medias enseña los CUATRO estados distintos, no dos", () => {
    const st = admHydrate(admResetState(), media(), null);
    st.step = 2;                                   // el alumno está en la comunidad
    expect(admStatus(0, st.done, st.step, st.locked)).toBe("done");
    expect(admStatus(1, st.done, st.step, st.locked)).toBe("done");
    expect(admStatus(2, st.done, st.step, st.locked)).toBe("active");
    expect(admStatus(3, st.done, st.step, st.locked)).toBe("locked");

    const html = admRail(st);
    expect(html).toContain(`${t("adm.s1Short")} — ${t("adm.stDone")}`);
    expect(html).toContain(`${t("adm.s3Short")} — ${t("adm.stActive")}`);
    expect(html).toContain(`${t("adm.s4Short")} — ${t("adm.stLocked")}`);
    expect(html).toMatch(/data-adm-go="3"[^>]*disabled/);      // el vídeo, cerrado
    expect(html).not.toMatch(/data-adm-go="2"[^>]*disabled/);  // la comunidad, abierta
    // y el cuarto estado, "Pendiente", aparece cuando el alumno mira otro paso
    st.step = 0;
    expect(admStatus(2, st.done, st.step, st.locked)).toBe("pending");
    expect(admRail(st)).toContain(`${t("adm.s3Short")} — ${t("adm.stPending")}`);
  });

  it("el 'locked' del servidor manda sobre la deducción local", () => {
    const st = admDefaultState();
    st.done = [true, false, false, false];
    st.locked = [false, false, false, false];       // el servidor abre el 3 y el 4
    expect(admStatus(2, st.done, 1, st.locked)).toBe("pending");
    expect(admStatus(3, st.done, 1, st.locked)).toBe("pending");
    expect(admStatus(2, st.done, 1, null)).toBe("locked");   // sin dato: se deduce del orden
  });

  it("re-hidratar tras una mutación NO teletransporta al alumno a la pantalla final", () => {
    const st = admHydrate(admResetState(), media(), null);
    st.view = "wizard"; st.step = 2;
    const todo = media();
    todo.admission.steps.forEach((s) => { s.done = true; s.locked = false; });
    todo.admission.stepsDone = 4; todo.admission.percent = 100;
    admHydrate(st, todo, null, { keepView: true });
    expect(st.done).toEqual([true, true, true, true]);
    expect(st.view).toBe("wizard");                 // "Finalizar" lo pulsa el alumno
    expect(st.step).toBe(2);
  });

  it("los datos del formulario vuelven a sus casillas (fecha partida, códigos, consentimiento)", () => {
    const st = admHydrate(admResetState(), media(), null);
    const f = st.form as Record<string, string>;
    expect([f.birthY, f.birthM, f.birthD]).toEqual(["2007", "03", "09"]);
    expect(f.level).toBe("UNIVERSIDAD");
    expect(f.program).toBe("ORATORIA");
    expect(f.days).toBe("LUN_MIE");
    expect(f.experience).toBe("true");
    expect(st.form.consent).toBe(true);             // el consentimiento ya aceptado
  });

  it("el texto libre que la API ya escapó NO se escapa dos veces al volver al input", () => {
    const st = admResetState();
    admHydrate(st, { admission: { steps: [], guardian: { name: "Ana O&#39;Brien", document: "001", relation: "TUTOR", phone: "", email: "", signature: "Ana O&#39;Brien" } } }, null);
    expect((st.form as Record<string, string>).gName).toBe("Ana O'Brien");
    const html = admFormBlock(st, NOW);
    expect(html).toContain("Ana O&#39;Brien");
    expect(html).not.toContain("&amp;#39;");
  });
});

/* ================= ② el bloque de tutor, por edad ================= */
describe("② el bloque del tutor aparece SOLO si el estudiante es menor de 21", () => {
  it("el umbral del formulario es 21 (no el de menor de edad del sistema)", () => {
    expect(ADM_GUARDIAN_MAX_AGE).toBe(21);
  });

  it("20 años → hay que pedir tutor; 21 y 22 → no", () => {
    expect(admAge(born(2006), NOW)).toBe(20);
    expect(admNeedsGuardian(born(2006), NOW)).toBe(true);
    expect(admAge(born(2005), NOW)).toBe(21);
    expect(admNeedsGuardian(born(2005), NOW)).toBe(false);
    expect(admNeedsGuardian(born(2004), NOW)).toBe(false);
  });

  it("cumpleaños del borde: quien cumple 21 MAÑANA todavía necesita tutor", () => {
    // NOW = 15 ago 2026 · nacida el 16 de agosto de 2005 → aún tiene 20
    expect(admAge({ birthY: "2005", birthM: "8", birthD: "16" }, NOW)).toBe(20);
    expect(admNeedsGuardian({ birthY: "2005", birthM: "8", birthD: "16" }, NOW)).toBe(true);
    // …y quien los cumplió HOY, ya no
    expect(admAge({ birthY: "2005", birthM: "8", birthD: "15" }, NOW)).toBe(21);
    expect(admNeedsGuardian({ birthY: "2005", birthM: "8", birthD: "15" }, NOW)).toBe(false);
  });

  it("sin fecha de nacimiento NO se pide tutor (no se piden datos que no sabemos si aplican)", () => {
    expect(admAge({}, NOW)).toBe(null);
    expect(admNeedsGuardian({}, NOW)).toBe(false);
  });

  it("el bloque se PINTA visible para la menor y oculto para la mayor", () => {
    const stMinor = admDefaultState();
    stMinor.form = minorForm();
    const minorHtml = admFormBlock(stMinor, NOW);
    expect(minorHtml).toContain('id="adm-guardian"');
    expect(minorHtml).not.toMatch(/id="adm-guardian"[^>]*hidden/);
    expect(minorHtml).toContain(t("adm.sec2Why"));

    const stAdult = admDefaultState();
    stAdult.form = adultForm();
    expect(admFormBlock(stAdult, NOW)).toMatch(/id="adm-guardian"[^>]*hidden/);
  });

  it("la menor NO puede guardar sin los 5 datos del tutor (nombre, documento, relación, teléfono y FIRMA)", () => {
    const e = admValidate(minorForm(), NOW);
    expect(Object.keys(e).sort()).toEqual(["gDoc", "gName", "gPhone", "gRel", "gSign"]);
    expect(errs(minorForm(guardianData))).toEqual({});
  });

  it("la mayor de 21 guarda SIN tocar un solo campo de tutor", () => {
    expect(errs(adultForm())).toEqual({});
  });

  it("el bloque del tutor SOLO viaja cuando la edad lo exige (no se guardan datos de un tercero porque sí)", () => {
    const conTutor = payload(minorForm(guardianData));
    expect(conTutor.guardianName).toBe("Marta Reyes");
    expect(conTutor.guardianDocument).toBe("001-1234567-8");
    expect(conTutor.guardianRelation).toBe("PADRE_MADRE");
    expect(conTutor.guardianSignature).toBe("Marta Reyes");

    const sinTutor = payload(adultForm());
    expect(sinTutor.guardianName).toBeUndefined();
    expect(sinTutor.guardianDocument).toBeUndefined();
    expect(sinTutor.guardianSignature).toBeUndefined();
  });
});

/* ================= ③ validación real, error junto al campo ================= */
describe("③ la validación es real y el error viaja pegado a su campo", () => {
  it("un formulario vacío marca los 6 campos obligatorios del mockup + el consentimiento", () => {
    const e = errs(admDefaultState().form, NOW);
    expect(Object.keys(e).sort()).toEqual(["birth", "consent", "email", "firstName", "lastName", "phone", "program"]);
  });

  it("rechaza correos y teléfonos que no lo son", () => {
    expect(errs({ ...adultForm(), email: "camila.ejemplo.com" }).email).toBe("adm.eEmail");
    expect(errs({ ...adultForm(), email: "camila@ejemplo" }).email).toBe("adm.eEmail");
    expect(errs({ ...adultForm(), phone: "809555012" }).phone).toBe("adm.ePhone");   // 9 dígitos
    expect(errs({ ...adultForm(), phone: "80955501234" }).phone).toBe("adm.ePhone"); // 11 dígitos
    // el formato con paréntesis y guiones SÍ vale: se cuentan dígitos, no caracteres
    expect(errs({ ...adultForm(), phone: "809-555-0123" }).phone).toBeUndefined();
  });

  it("rechaza fechas que no existen y fechas futuras (Date las 'corregiría' en silencio)", () => {
    expect(admBirthDate({ birthY: "2010", birthM: "2", birthD: "31" })).toBe(null);
    expect(admBirthDate({ birthY: "2010", birthM: "13", birthD: "1" })).toBe(null);
    expect(errs({ ...adultForm(), birthM: "2", birthD: "30", birthY: "2010" }).birth).toBe("adm.eBirth");
    expect(errs({ ...adultForm(), ...born(2030) }).birth).toBe("adm.eBirthRange");
  });

  it("cada error se pinta JUNTO a su campo, con aria-invalid y aria-describedby (no un toast)", () => {
    const st = admDefaultState();
    st.errors = admValidate(st.form, NOW);
    const html = admFormBlock(st, NOW);

    expect(html).toMatch(/id="adm-firstName"[^>]*aria-invalid="true"/);
    expect(html).toMatch(/id="adm-firstName"[^>]*aria-describedby="adm-firstName-err"/);
    expect(html).toContain('<p class="adm-err" id="adm-firstName-err">');
    expect(html).toContain(t("adm.eName"));
    expect(html).toContain(t("adm.eEmail"));
    // …y un resumen enfocable arriba que dice CUÁNTOS quedan
    expect(html).toContain('id="adm-form-alert"');
    expect(html).toContain('role="alert"');
    expect(html).toContain(t("adm.errSummary").replace("{n}", "7"));
  });

  it("el estado de carga es honesto: al guardar, el botón lo dice y queda deshabilitado", () => {
    const st = admDefaultState();
    st.form = adultForm();
    st.saving = true;
    const html = admFormBlock(st, NOW);
    expect(html).toMatch(/id="adm-form-save"[^>]*disabled/);
    expect(html).toContain(t("adm.formSaving"));
  });

  it("si el servidor falla, el aviso se ve EN la pantalla (y lo escrito sigue en los campos)", () => {
    const st = admDefaultState();
    st.form = { ...adultForm(), firstName: "Camila" };
    st.notice = "No se pudo guardar";
    const html = admFormBlock(st, NOW);
    expect(html).toContain("No se pudo guardar");
    expect(html).toContain('value="Camila"');
  });
});

/* ================= ④ el consentimiento es obligatorio ================= */
describe("④ sin consentimiento explícito no se pasa de la casilla", () => {
  it("un formulario PERFECTO sin la casilla marcada sigue siendo inválido", () => {
    const e = admValidate({ ...adultForm(), consent: false }, NOW);
    expect(e).toEqual({ consent: "adm.eConsent" });
  });

  it("ni con un valor 'parecido a true' (solo el booleano true cuenta)", () => {
    expect(errs({ ...adultForm(), consent: "sí" }).consent).toBe("adm.eConsent");
    expect(errs({ ...adultForm(), consent: 1 }).consent).toBe("adm.eConsent");
  });

  it("la casilla es un control NATIVO, requerido, con su texto legal completo", () => {
    const st = admDefaultState();
    const html = admFormBlock(st, NOW);
    expect(html).toContain('type="checkbox" id="adm-consent"');
    expect(html).toMatch(/id="adm-consent"[^>]*required/);
    expect(html).toContain(t("adm.consent"));
    expect(t("adm.consent")).toContain("consentimiento");
  });

  it("y el payload lleva el consentimiento como booleano, no como cadena", () => {
    expect(payload(adultForm()).consent).toBe(true);
    expect(payload({ ...adultForm(), consent: "sí" }).consent).toBe(false);
  });
});

/* ================= ⑤ la comunidad: nunca un enlace roto ================= */
describe("⑤ paso 3: el enlace del grupo es configurable y mientras no exista se dice", () => {
  it("sin enlace configurado NO se pinta ningún href: se pinta el estado honesto", () => {
    const st = admDefaultState();
    const html = admCommunityBlock(st);
    expect(html).not.toContain("<a ");
    expect(html).not.toContain("href=");
    expect(html).toContain(t("adm.commSoon"));
    expect(html).toContain(t("adm.commSoonNote"));
  });

  it("con enlace configurado sí hay enlace, y se abre seguro (noopener)", () => {
    const st = admDefaultState();
    st.communityUrl = "https://chat.whatsapp.com/ABC123";
    const html = admCommunityBlock(st);
    expect(html).toContain('href="https://chat.whatsapp.com/ABC123"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('target="_blank"');
  });

  it("un enlace que no sea http(s) se descarta (no se pinta javascript: ni basura)", () => {
    expect(admCommunityUrl("javascript:alert(1)")).toBe("");
    expect(admCommunityUrl("chat.whatsapp.com/ABC")).toBe("");
    expect(admCommunityUrl("")).toBe("");
    expect(admCommunityUrl(null)).toBe("");
    expect(admCommunityUrl("https://chat.whatsapp.com/ABC")).toBe("https://chat.whatsapp.com/ABC");

    const st = admDefaultState();
    st.communityUrl = "javascript:alert(1)";
    expect(admCommunityBlock(st)).not.toContain("javascript:");
  });

  it("el botón de confirmar cambia de texto según haya enlace o no", () => {
    const st = admDefaultState();
    st.view = "wizard"; st.step = 2; st.done = [true, true, false, false];
    expect(admPanel(st, NOW)).toContain(t("adm.commAck"));       // sin enlace: "avísenme"
    st.communityUrl = "https://chat.whatsapp.com/ABC";
    expect(admPanel(st, NOW)).toContain(t("adm.commDone"));      // con enlace: "ya estoy dentro"
  });
});

/* ================= ⑥ pasos 2 y 4: agenda y vídeo ================= */
describe("⑥ paso 2 (agenda) y paso 4 (DPP) reusan lo que YA existe en el repo", () => {
  it("el calendario deja fuera el pasado, el domingo y lo que pase del horizonte de 30 días", () => {
    const cells = admMonthCells(2026, 7, NOW).filter(Boolean) as any[];
    const byDay = (n: number) => cells.find((c) => c.n === n);
    expect(byDay(14).disabled).toBe(true);            // ayer (viernes 14 ago 2026)
    expect(byDay(16).disabled).toBe(true);            // domingo cerrado (OPEN_DOW = 1..6)
    expect(byDay(17).disabled).toBe(false);           // lunes 17, dentro del horizonte
    expect(byDay(20).disabled).toBe(false);           // jueves 20, dentro del horizonte
    expect(byDay(15).disabled).toBe(false);           // hoy (sábado) sigue abierto
    const oct = admMonthCells(2026, 9, NOW).filter(Boolean) as any[];
    expect(oct.every((c) => c.disabled)).toBe(true);  // octubre entero pasa de los 30 días
  });

  it("el confirmar de la llamada nace deshabilitado hasta elegir hora", () => {
    const st = admDefaultState();
    expect(admSchedBlock(st, NOW)).toMatch(/id="adm-book"[^>]*disabled/);
    st.day = "2026-08-20"; st.slots = [{ iso: "2026-08-20T13:00:00Z", label: "9:00 AM" }]; st.slot = "2026-08-20T13:00:00Z";
    expect(admSchedBlock(st, NOW)).not.toMatch(/id="adm-book"[^>]*disabled/);
  });

  it("si la agenda en línea está apagada, se DICE (no se rompe ni se finge)", () => {
    const st = admDefaultState();
    st.schedClosed = true;
    const html = admSchedBlock(st, NOW);
    expect(html).toContain(t("adm.schedClosed"));
    expect(html).not.toContain('id="adm-book"');
  });

  // El tope del DPP es el SUYO (16 MB), no el genérico de la plataforma (25 MB): un vídeo de
  // 30 s no necesita más, y anunciar 25 haría al alumno esperar la subida entera para leer
  // que el máximo era otro. Ver app/lib/dpp-video.ts.
  it("el DPP acepta SOLO vídeo y con SU tope (16 MB)", () => {
    expect(ADM_MAX_VIDEO_BYTES).toBe(16 * 1024 * 1024);
    const f = (type: string, size = 1024) => ({ type, size, name: "dpp" }) as unknown as File;
    expect(admVideoReject(f("video/mp4"))).toBe("");
    expect(admVideoReject(f("video/webm"))).toBe("");
    expect(admVideoReject(f("image/png"))).toBe("adm.dppBadType");
    expect(admVideoReject(f("application/pdf"))).toBe("adm.dppBadType");
    expect(admVideoReject(f("video/mp4", 17 * 1024 * 1024))).toBe("adm.dppTooBig");
    expect(admVideoReject(null)).toBe("adm.dppBadType");
  });

  it("el selector de archivo tampoco ofrece nada que no sea vídeo, y enseña la rúbrica de 4 puntos", () => {
    const html = admDppBlock(admDefaultState());
    expect(html).toContain(`accept="${ADM_VIDEO_MIME.join(",")}"`);
    expect(html).not.toContain("image/");
    expect(html).not.toContain("application/pdf");
    [t("adm.r1"), t("adm.r2"), t("adm.r3"), t("adm.r4")].forEach((r) => expect(html).toContain(r));
    expect(t("adm.r4")).toContain("30 segundos");
  });
});

/* ================= ⑦ escape, accesibilidad, i18n y kit ================= */
describe("⑦ contrato de escape: el builder escapa UNA vez lo que el alumno teclea", () => {
  it("un apellido con comillas y ángulos no rompe el atributo ni inyecta HTML", () => {
    const st = admDefaultState();
    st.form = { ...adultForm(), lastName: 'Reyes" <img src=x onerror=alert(1)>' };
    const html = admFormBlock(st, NOW);
    // el valor entero viaja escapado DENTRO del atributo: ni cierra la comilla ni abre etiqueta
    expect(html).toContain('value="Reyes&quot; &lt;img src=x onerror=alert(1)&gt;"');
    expect(html).not.toContain("<img");
    expect(html).not.toContain('="Reyes" ');
    // …y no queda doble-escapado (&amp;quot; sería el síntoma de escapar dos veces)
    expect(html).not.toContain("&amp;quot;");
  });

  it("el nombre que llega YA escapado del payload se des-escapa al sembrar (nada de &amp;amp;)", () => {
    expect(admUnesc("O&#39;Brien")).toBe("O'Brien");
    expect(admUnesc("Ana &amp; Luis")).toBe("Ana & Luis");
    const st = admDefaultState();
    admHydrate(st, null, { name: "Ana O&#39;Brien", email: "ana@ejemplo.com" });
    const form = st.form as Record<string, string>;
    expect(form.firstName).toBe("Ana");
    expect(form.lastName).toBe("O'Brien");
    // y al pintarlo se vuelve a escapar UNA sola vez
    expect(admFormBlock(st, NOW)).toContain("O&#39;Brien");
  });
});

describe("⑧ accesibilidad: etiquetas reales, no placeholders con nombre de campo", () => {
  const st = admDefaultState();
  st.form = minorForm();          // con el bloque de tutor visible
  const html = admFormBlock(st, NOW);

  it("TODO input/select del formulario tiene su <label for> apuntándole", () => {
    const ids = [...html.matchAll(/<(?:input|select)\b[^>]*\bid="([^"]+)"/g)].map((m) => m[1]);
    expect(ids.length).toBeGreaterThanOrEqual(14);
    const sinLabel = ids.filter((id) => !html.includes(`for="${id}"`));
    expect(sinLabel, "campos sin <label for>").toEqual([]);
  });

  it("las tres casillas de la fecha llevan etiqueta propia (sr-only) bajo una leyenda visible", () => {
    expect(html).toContain(`<label class="sr-only" for="adm-birthM">${t("adm.fBirthMM")}</label>`);
    expect(html).toContain(`<label class="sr-only" for="adm-birthD">${t("adm.fBirthDD")}</label>`);
    expect(html).toContain(`<label class="sr-only" for="adm-birthY">${t("adm.fBirthYY")}</label>`);
    expect(html).toContain(`<legend class="label">${t("adm.fBirth")}`);
  });

  it("los grupos de opciones son fieldset con leyenda (un <label for> no cubre varios radios)", () => {
    expect(html.match(/<fieldset/g)?.length).toBeGreaterThanOrEqual(5);
    expect(html).toContain("<legend");
  });

  it("ningún placeholder hace de etiqueta: los placeholders son ejemplos, no nombres de campo", () => {
    const placeholders = [...html.matchAll(/placeholder="([^"]*)"/g)].map((m) => m[1]);
    expect(placeholders.length).toBeGreaterThan(0);
    const nombresDeCampo = [t("adm.fName"), t("adm.fLastName"), t("adm.fEmail"), t("adm.fPhone"), t("adm.gName")];
    placeholders.forEach((p) => expect(nombresDeCampo).not.toContain(p));
  });

  it("el título del paso es enfocable para llevar el foco al navegar entre pasos", () => {
    const stw = admDefaultState();
    stw.view = "wizard";
    expect(admPanel(stw, NOW)).toContain('id="adm-step-h" tabindex="-1"');
  });
});

describe("⑨ i18n ES+EN y kit visual", () => {
  it("todo el texto nuevo existe en los DOS idiomas y con la misma forma", () => {
    expect(Object.keys(admDict.es).sort()).toEqual(Object.keys(admDict.en).sort());
    expect(Object.keys(admDict.es).length).toBeGreaterThanOrEqual(90);
    expect(t("adm.welcomeTitle", "en")).toBe("Welcome to OTR Academy");
    expect(t("adm.stDone", "en")).toBe("Completed");
    expect(t("adm.consent", "en")).not.toBe(t("adm.consent", "es"));
  });

  it("la bienvenida y la pantalla final dicen LO QUE PIDIÓ el cliente", () => {
    const w = admWelcome(admDefaultState());
    expect(w).toContain("Bienvenido a OTR Academy");
    expect(w).toContain("4 pasos");
    expect(w).toContain("es lo que te permitirá tomar las clases");
    expect(w).toContain(t("adm.welcomeCta"));
    expect(w).toContain("4 pasos · aprox. 15 minutos");

    const d = admDoneScreen();
    expect(d).toContain("Estás dentro de");
    expect(d).toContain("Completaste los 4 pasos");
    expect(d).toContain(t("adm.doneReview"));
    ADM_STEPS.forEach((s) => expect(d).toContain(t(s.short)));
  });

  it("sin emoji en ninguna cadena (la bandera del prefijo va como texto)", () => {
    const emoji = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/u;
    const offenders = [...Object.entries(admDict.es), ...Object.entries(admDict.en)]
      .filter(([, v]) => emoji.test(String(v)))
      .map(([k]) => k);
    expect(offenders).toEqual([]);
    expect(t("adm.phoneCc")).toBe("+1 · RD");
  });

  it("la sección de CSS es propia, va al final y no reintroduce el naranja como superficie", () => {
    const css = read("app/styles/screens.css");
    const start = css.indexOf("/* === ADMISIÓN (Isaac) ===");
    expect(start).toBeGreaterThan(0);
    const section = css.slice(start);
    // es la ÚLTIMA sección del archivo: nada del resto del kit queda por debajo
    expect(css.trimEnd()).toMatch(/\/\* === FIN ADMISIÓN \(Isaac\) =+ \*\/$/);
    // ni un hex de marca a mano en las DECLARACIONES: todo sale de tokens.css
    // (los comentarios sí citan hexes, porque documentan el contraste medido)
    const rules = section.replace(/\/\*[\s\S]*?\*\//g, "");
    expect(rules).not.toMatch(/#[0-9a-fA-F]{6}/);
    expect(rules).not.toContain("--otr-green");
    expect(rules).not.toContain("--action");
    // el completado y la barra de progreso van en la escala VERDE
    expect(section).toContain("background:var(--success)");
    expect(section).toContain("background:var(--success-strong)");
    expect(section).toContain("color:var(--ok)");
  });

  it("el rail se vuelve fila horizontal en móvil (vista 375 del mockup)", () => {
    const css = read("app/styles/screens.css");
    const section = css.slice(css.indexOf("/* === ADMISIÓN (Isaac) ==="));
    const mq = section.slice(section.indexOf("@media (max-width:760px)"));
    expect(mq).toContain(".adm-rail-l{flex-direction:row");
    expect(mq).toContain(".adm-rail-t{display:none}");
    expect(mq).toContain(".adm-body{flex-direction:column");
    expect(mq).toContain(".adm-sched{grid-template-columns:1fr}");
  });
});

describe("⑩ la pantalla está enrutada y es del ALUMNO", () => {
  it("la ruta 'admission' existe, apunta a la pantalla y está cerrada al estudiante", () => {
    expect(ROUTES.admission).toBeTruthy();
    expect(ROUTES.admission.screen).toBe("admission");
    expect(ROUTES.admission.role).toBe("student");
  });

  it("el módulo se carga bajo demanda (chunk propio, como el resto de pantallas)", () => {
    const src = read("app/lib/screens.ts");
    expect(src).toContain('admission:   () => import("./scr-admission")');
    expect(src).toContain("admission:'admission'");
  });

  it("render() no explota en ninguna de las tres vistas y no deja placeholders sin traducir", () => {
    const st = admResetState();
    st.loaded = true;
    for (const view of ["welcome", "wizard", "done"] as const) {
      st.view = view;
      const html = (SAdmission as any).admission.render();
      expect(typeof html).toBe("string");
      expect(html.length).toBeGreaterThan(100);
      expect(html).not.toMatch(/\badm\.[a-zA-Z]+\b/);   // ninguna llave i18n cruda
      expect(html).not.toContain("{n}");
      expect(html).not.toContain("undefined");
    }
  });

  it("mientras no se sabe por qué paso va el alumno, se pinta 'cargando' (sin parpadeo mentiroso)", () => {
    admResetState();
    const html = (SAdmission as any).admission.render();
    expect(html).toContain(t("adm.loading"));
    expect(html).not.toContain(t("adm.welcomeCta"));
  });

  it("hidratar con pasos ya hechos arranca en el primer pendiente, no en la bienvenida", () => {
    const st = admResetState();
    admHydrate(st, { admission: { steps: [true, true, false, false] } }, null);
    expect(st.view).toBe("wizard");
    expect(st.step).toBe(2);
    expect(st.loaded).toBe(true);

    const done = admHydrate(admResetState(), { admission: { steps: [true, true, true, true] } }, null);
    expect(done.view).toBe("done");
  });

  it("si /api/admission no responde nada, el wizard arranca en blanco y funciona igual", () => {
    const st = admResetState();
    admHydrate(st, null, null);
    expect(st.view).toBe("welcome");
    expect(st.done).toEqual([false, false, false, false]);
    expect(st.loaded).toBe(true);
    expect(st.communityUrl).toBe("");
  });
});

/* ============================================================================
   ⑦ EVIDENCIA LEGAL — se enseña EXACTAMENTE lo que se registra
   El texto del consentimiento vivía dos veces: una en la API (lo que se guarda como
   prueba) y otra copiada en el diccionario (lo que la familia lee antes de firmar).
   Nada impedía cambiar una y olvidar la otra, y una firma sobre un texto distinto del
   registrado no prueba nada. Ahora hay una sola fuente —app/lib/consent.ts— y esto lo
   vigila: si alguien vuelve a escribir el texto a mano en cualquiera de los dos lados,
   este test se pone rojo.
   ========================================================================== */
describe("[ADM · LEGAL] el clausulado que se firma es el que se registra", () => {
  it("la pantalla enseña, carácter por carácter, el texto que la API guarda como evidencia", () => {
    expect(t("adm.consent")).toBe(CONSENT_TEXT_DATA);
    expect(t("adm.consentGuardian")).toBe(CONSENT_TEXT_GUARDIAN);
    // Y llega entero al HTML, no recortado ni resumido.
    const st = admDefaultState();
    st.form = minorForm(guardianData);
    const html = admFormBlock(st, NOW);
    expect(html).toContain(CONSENT_TEXT_DATA);
    expect(html).toContain(CONSENT_TEXT_GUARDIAN);
  });

  it("el cliente NO dicta el texto: solo dice sí o no, y el servidor pone el clausulado", () => {
    // Que el navegador pudiera mandar el texto sería el agujero: bastaría con editarlo en
    // el DOM para "firmar" otra cosa. El payload lleva un booleano y nada más.
    const body = JSON.stringify(payload(minorForm(guardianData)));
    expect(body).toContain('"consent":true');
    expect(body).not.toContain(CONSENT_TEXT_DATA);
    expect(body).not.toContain(CONSENT_TEXT_GUARDIAN);
  });

  it("el inglés es traducción de cortesía: existe, dice lo mismo, y no es el texto vinculante", () => {
    // La academia opera en RD y lo que se registra es el español (CONSENT_BINDING_LANG).
    // El inglés tiene que existir —se firma habiendo entendido— pero no sustituye al ES.
    expect(CONSENT_BINDING_LANG).toBe("es");
    for (const k of ["adm.consent", "adm.consentGuardian"]) {
      const en = t(k, "en");
      expect(en.length).toBeGreaterThan(40);
      expect(en).not.toBe(t(k, "es"));
    }
    expect(t("adm.consentGuardian", "en")).toMatch(/guardian|authorize/i);
  });
});

/* ============================================================================
   ⑧ EL VÍDEO SE SUBE CON EL `kind` QUE EL SERVIDOR VALIDA
   Esto se escapó de 1451 tests verdes y solo apareció con clicks: la pantalla subía
   con kind:"video" mientras el servidor aplicaba la política del DPP —duración, tope,
   formatos— sólo a kind:"dpp-video". Un vídeo de 45 s entró sin una queja, con la
   pantalla prometiendo 30. Cada lado era coherente consigo mismo; el contrato entre
   ambos no existía. Ahora hay uno, y esto lo vigila.
   ========================================================================== */
describe("[ADM · DPP] la pantalla y el servidor hablan del mismo vídeo", () => {
  it("sube con el kind EXACTO que selecciona la política del servidor", () => {
    const src = read("app/lib/scr-admission.ts");
    expect(src).toContain("window.otrUpload(file, DPP_VIDEO_KIND)");
    // Un kind literal aquí volvería a partir el contrato sin que nada se queje.
    expect(src).not.toMatch(/otrUpload\([^)]*,\s*["'][a-z-]+["']\s*\)/);
    expect(DPP_VIDEO_KIND).toBe("dpp-video");
  });

  it("anuncia el tope REAL: el alumno no espera a que suban 25 MB para leer que eran 16", () => {
    expect(ADM_MAX_VIDEO_BYTES).toBe(DPP_VIDEO_MAX_BYTES);
    expect(Math.round(ADM_MAX_VIDEO_BYTES / (1024 * 1024))).toBe(16);
    const st = admDefaultState();
    st.view = "wizard"; st.step = 3; st.done = [true, true, true, false];
    expect(admPanel(st, NOW)).toContain("16 MB");
  });

  it("acepta exactamente los formatos que el servidor sabe guardar y previsualizar", () => {
    expect([...ADM_VIDEO_MIME].sort()).toEqual([...DPP_VIDEO_MIME].sort());
  });

  it("rechaza en el navegador lo que el servidor rechazaría, sin gastar la subida", () => {
    const big = { type: "video/mp4", size: DPP_VIDEO_MAX_BYTES + 1 };
    expect(admVideoReject(big)).toBe("adm.dppTooBig");
    expect(admVideoReject({ type: "video/avi", size: 1000 })).toBe("adm.dppBadType");
    expect(admVideoReject({ type: "video/mp4", size: DPP_VIDEO_MAX_BYTES })).toBe("");
  });
});

/* ============================================================================
   ⑨ EL AVISO DE PRIVACIDAD DICE LO QUE LA LEY 172-13 EXIGE QUE DIGA
   No basta con que exista un párrafo bonito: la ley enumera QUÉ hay que informar antes
   de recoger un consentimiento. Esto lo vigila punto por punto, para que nadie recorte
   el texto "porque es muy largo" y deje fuera lo que lo hace válido.
   ========================================================================== */
describe("[ADM · LEGAL] el aviso de privacidad informa de todo lo que debe", () => {
  const AVISO = PRIVACY_NOTICE_TEXT;

  it("identifica al responsable del banco de datos y da una vía real de contacto", () => {
    expect(AVISO).toContain("OTR Debating Academy");
    expect(AVISO).toContain("Santo Domingo");
    // Una dirección de contacto que se pueda usar de verdad, y NUNCA el no-reply del
    // envío automático: si el buzón no se atiende, el derecho de acceso es de mentira.
    expect(AVISO).toMatch(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i);
    expect(AVISO).not.toMatch(/no-reply@/i);
  });

  it("dice QUÉ datos se recogen, PARA QUÉ y con qué base", () => {
    for (const dato of ["fecha de nacimiento", "cédula o pasaporte", "video"]) {
      expect(AVISO.toLowerCase()).toContain(dato.toLowerCase());
    }
    expect(AVISO).toMatch(/admisión/i);
    expect(AVISO).toMatch(/voluntari/i);          // carácter facultativo de las respuestas
    expect(AVISO).toMatch(/no podemos tramitar|no podemos/i); // consecuencia de no darlos
  });

  it("dice con quién se comparten y que no se venden", () => {
    expect(AVISO).toMatch(/no vendemos ni cedemos/i);
    expect(AVISO).toMatch(/proveedor/i);
    expect(AVISO).toMatch(/fuera del país|transferen/i);
    expect(AVISO).toMatch(/orden judicial|autoridad/i);
  });

  it("dice cuánto se conservan y enumera los cuatro derechos, con cómo ejercerlos", () => {
    expect(AVISO).toMatch(/conserv|tiempo que exijan/i);
    for (const derecho of ["acceder", "rectificar", "supriman", "oponerte"]) {
      expect(AVISO.toLowerCase()).toContain(derecho);
    }
    expect(AVISO).toMatch(/retirar este consentimiento/i);
    expect(AVISO).toMatch(/sin que retirarlo afecte/i);  // la retirada no tiene efecto retroactivo
  });

  it("trata aparte al menor de edad y dice quién consiente por él", () => {
    expect(AVISO).toMatch(/autoridad parental|tutela/i);
    expect(AVISO).toMatch(/no se publican/i);
    expect(AVISO).toMatch(/publicitario/i);
  });

  it("el video del paso 4 NO se publica salvo autorización aparte — y así se dice", () => {
    // Es el punto donde más fácil sería mentir sin querer: el video existe, la plataforma
    // publica highlights, y el alumno tiene que saber exactamente cuál es la frontera.
    expect(AVISO).toMatch(/NO se publica/);
    expect(AVISO).toMatch(/consentimiento de imagen/i);
  });

  it("la pantalla lo enseña ENTERO antes de la casilla, no tras un enlace", () => {
    const st = admDefaultState();
    st.form = minorForm(guardianData);
    const html = admFormBlock(st, NOW);
    // Cada párrafo del aviso está en el HTML, y el bloque va ABIERTO por defecto.
    for (const parrafo of AVISO.split("\n\n")) {
      expect(html).toContain(parrafo.slice(0, 60).replace(/&/g, "&amp;"));
    }
    expect(html).toMatch(/<details class="adm-notice" open>/);
    // Y la casilla obligatoria viene DESPUÉS del aviso: informar y luego preguntar.
    expect(html.indexOf("adm-notice")).toBeLessThan(html.indexOf('id="adm-consent"'));
  });

  it("la casilla de imagen es opcional de verdad: sin `required` y marcada como opcional", () => {
    const st = admDefaultState();
    st.form = minorForm(guardianData);
    const html = admFormBlock(st, NOW);
    const casilla = html.slice(html.indexOf('id="adm-media"'), html.indexOf('id="adm-media"') + 220);
    expect(casilla).not.toMatch(/required/);
    expect(html).toContain(t("adm.mediaOptional"));
    expect(html).toContain(CONSENT_TEXT_MEDIA);
  });
});

/* ============================================================================
   ⑩ VOLVER AL PASO 1 NO RETIRA LA AUTORIZACIÓN DE IMAGEN
   La casilla viaja en CADA guardado y un `false` significa "retírala". Si al reabrir el
   formulario para corregir un teléfono saliera desmarcada, guardar borraría en silencio
   una autorización que nadie pidió retirar. Es el tipo de fallo que nadie reporta porque
   nadie lo ve pasar.
   ========================================================================== */
describe("[ADM · LEGAL] la autorización de imagen sobrevive a reabrir el formulario", () => {
  const conImagen = { kind: "media_release", version: "2026-09", acceptedByRole: "guardian" };

  it("si estaba dada, la casilla vuelve marcada y el guardado la mantiene", () => {
    const st = admHydrate(admResetState(), {
      admission: { steps: [true, false, false, false], form: { phone: "+18095550144" }, consents: [conImagen] },
    }, null);
    expect(st.form.mediaConsent).toBe(true);
    expect(payload(st.form).mediaConsent).toBe(true);
  });

  it("si NO estaba dada, sigue sin estarlo — no se marca sola por reabrir", () => {
    const st = admHydrate(admResetState(), {
      admission: { steps: [true, false, false, false], form: { phone: "+18095550144" }, consents: [] },
    }, null);
    expect(st.form.mediaConsent).toBe(false);
    expect(payload(st.form).mediaConsent).toBe(false);
  });

  it("las dos casillas reflejan el estado REAL al reabrir, cada una por su vía", () => {
    // La obligatoria se rehidrata del paso ya completado (si el paso 1 está hecho, el
    // servidor exigió el consentimiento: consta, con su fecha). La de imagen se rehidrata
    // de los consentimientos vivos. Ninguna de las dos puede salir en un estado que
    // contradiga lo que hay guardado — ahí es donde se pierden autorizaciones.
    const st = admHydrate(admResetState(), {
      admission: { steps: [true, false, false, false], consents: [{ kind: "data_processing" }, conImagen] },
    }, null);
    expect(st.form.consent).toBe(true);
    expect(st.form.mediaConsent).toBe(true);
    // Y re-guardar así no retira nada: ambas viajan en true.
    const body = payload(st.form);
    expect(body.consent).toBe(true);
    expect(body.mediaConsent).toBe(true);
  });
});

/* ============================================================================
   ⑪ REABRIR EL PASO 1 NO DEJA AL ALUMNO ENCERRADO
   La pantalla exigía "exactamente 10 dígitos" y el servidor guarda en E.164 (once, con el
   +1 de RD). Cada regla era razonable por su lado; juntas hacían que, al volver al paso 1
   a corregir cualquier cosa, el formulario rechazara SUS PROPIOS teléfonos con "Revisa 2
   campos" señalando dos campos correctos, sin forma de guardar. Se vio con clicks.
   ========================================================================== */
describe("[ADM] el formulario acepta los teléfonos que la propia plataforma guardó", () => {
  it("un teléfono ya normalizado (E.164) es válido al reabrir el formulario", () => {
    const guardado = { ...minorForm(guardianData), phone: "+18095550177", gPhone: "+18295550188" };
    const e = errs(guardado);
    expect(e.phone).toBeUndefined();
    expect(e.gPhone).toBeUndefined();
  });

  it("sigue aceptando las formas en que una familia lo escribe", () => {
    for (const bueno of ["(809) 555-0123", "829 555 0177", "1 849 555 0100", "+34 600 123 456"]) {
      expect(errs({ ...adultForm(), phone: bueno }).phone).toBeUndefined();
    }
  });

  it("y sigue rechazando lo que no es un teléfono", () => {
    for (const malo of ["555-0123", "123", "no soy un teléfono", "", "8095550123456789"]) {
      expect(errs({ ...adultForm(), phone: malo }).phone).toBe("adm.ePhone");
    }
  });

  it("cliente y servidor comparten la MISMA regla, no dos parecidas", () => {
    // Si alguien vuelve a escribir una regla propia en la pantalla, esto se pone rojo.
    const src = read("app/lib/scr-admission.ts");
    expect(src).toContain("isValidPhoneNumber(f.phone)");
    expect(src).not.toMatch(/admDigits\(f\.g?[Pp]hone\)\.length/);
  });
});

/* ============================================================================
   ⑫ FIDELIDAD AL MOCKUP: portal propio y bienvenida a sangre
   El wizard vivía dentro del shell del Aula, con su barra de Cursos / Debate Hub /
   marketplace, y la bienvenida era una tarjeta más. El mockup de Isaac dibuja otra cosa:
   una cabecera de "Portal del estudiante" sin navegación —el alumno que aún no ha sido
   admitido no tiene dónde ir— y una portada a pantalla completa con la foto de marca.
   ========================================================================== */
describe("[ADM · UI] el portal de admisión se pinta como el mockup", () => {
  it("la admisión NO usa el shell del Aula: tiene el suyo, sin barra de navegación", () => {
    const aula = read("app/components/Aula.tsx");
    expect(aula).toMatch(/def\.screen === "admission"[\s\S]{0,120}renderAdmissionShell/);
    const shell = read("app/lib/shell.ts");
    const fn = shell.slice(shell.indexOf("export function renderAdmissionShell"), shell.indexOf("export function renderShell"));
    // Nada de links de navegación ni tabbar dentro del portal.
    expect(fn).not.toMatch(/tn-links|tabbar|data-go="course"|data-go="debate"/);
    // Pero sí lo que el mockup SÍ enseña: marca, portal, soporte y quién eres.
    expect(fn).toContain("PORTAL DEL ESTUDIANTE");
    expect(fn).toMatch(/Soporte 24\/7/);
    expect(fn).toContain('id="content"');          // el <main> que el resto del Aula necesita
    expect(fn).toContain("skip-link");             // y el salto al contenido, que no se pierde
  });

  it("la bienvenida es un héroe a sangre con la foto de marca, no una tarjeta", () => {
    const html = admWelcome(admDefaultState());
    expect(html).toContain("adm-hero-bg");
    expect(html).not.toContain("card--dark");
    const css = read("app/styles/screens.css");
    expect(css).toMatch(/\.adm-hero\{[^}]*width:100vw/);
    expect(css).toMatch(/\.adm-hero-bg\{[^}]*hero-speaking\.jpg/);
    // 100vw no descuenta la barra de scroll: sin recorte, abre una barra horizontal.
    expect(css).toMatch(/\.shell--adm\{[^}]*overflow-x:clip/);
  });

  it("el portal deja scrollear la página entera: el formulario no se corta", () => {
    // `html,body{height:100%}` recorta a la altura de la pantalla cualquier shell que crezca
    // con su contenido, y media página quedaba inalcanzable. Aquí el scroll es el del documento.
    const css = read("app/styles/screens.css");
    expect(css).toMatch(/\.shell--adm \.content\{[^}]*overflow:visible/);
    expect(css).toMatch(/\.shell--adm\{[^}]*min-height:100dvh/);
  });

  it("'Soporte 24/7' aparece UNA vez: en la cabecera, no repetido en la barra de progreso", () => {
    const st = admDefaultState();
    st.view = "wizard"; st.step = 0;
    expect(admProgressBar(st)).not.toContain(t("adm.support"));
  });
});

/* ──────────────────────────────────────────────────────────────────────────
   PARIDAD CON EL ARTIFACT 1e19da45 (mockup de Isaac, 11/08/2026).
   Comparación hecha pantalla a pantalla contra el artifact abierto en Chrome.
   Aquí se fija lo que el mockup dicta y nosotros habíamos derivado; las tres
   divergencias DELIBERADAS (tutor condicional, clausulado Ley 172-13 y guardado
   real en vez de "marcar como completado") NO se tocan y viven en sus propios
   casos más arriba.
   ────────────────────────────────────────────────────────────────────────── */
describe("[ADMISIÓN] paridad con el mockup de Isaac", () => {
  beforeEach(() => { admResetState(); });

  it("el panel NO pinta el chip 'Paso N de 4': el mockup enseña el título a secas", () => {
    const st = admDefaultState();
    st.loaded = true; st.view = "wizard"; st.step = 0;
    const html = admPanel(st, NOW);
    expect(html).not.toContain(t("adm.stepOf").replace("{n}", "1"));
    // …pero el rail SÍ lo conserva en su aria-label: es la única pista de orden
    // que tiene quien navega a ciegas, y ahí no estorba a nadie.
    expect(admRail(st)).toContain(t("adm.stepOf").replace("{n}", "1"));
  });

  it("el paso 3 se llama en el rail como lo escribió Isaac", () => {
    expect(admDict.es["adm.s3Short"]).toBe("Join OTR Academy Community Chat");
    expect(admDict.en["adm.s3Short"]).toBe("Join OTR Academy Community Chat");
  });

  it("los 3 programas son TILES con hueco de imagen, no chips de texto", () => {
    const st = admDefaultState();
    st.loaded = true; st.view = "wizard"; st.step = 0;
    const html = admFormBlock(st, NOW);
    expect((html.match(/class="adm-prog-t"/g) || []).length).toBe(3);
    // El hueco de la foto es parte de la tarjeta: el mockup lo deja marcado
    // ("Suelta una imagen") porque las fotos de los programas están pendientes.
    expect((html.match(/class="adm-prog-img"/g) || []).length).toBe(3);
    // Siguen siendo radios de verdad: el tile es la etiqueta, no un div clicable.
    expect((html.match(/name="adm-program"/g) || []).length).toBe(3);
  });

  it("el placeholder genérico termina en puntos suspensivos, como el mockup", () => {
    expect(admDict.es["adm.formPlaceholder"]).toMatch(/…$/);
    expect(admDict.en["adm.formPlaceholder"]).toMatch(/…$/);
  });

  it("Curso / Nivel va en su propia fila a lo ancho, no a media columna", () => {
    const st = admDefaultState();
    st.loaded = true; st.view = "wizard"; st.step = 0;
    const html = admFormBlock(st, NOW);
    const sec1 = html.slice(0, html.indexOf('id="adm-guardian"'));
    // En la sección 1 solo queda UNA rejilla de dos columnas: Nombre + Apellido.
    expect((sec1.match(/class="adm-grid"/g) || []).length).toBe(1);
    expect(sec1).toContain('id="adm-level"');
    expect(sec1).toContain('id="adm-school"');
  });
});

/* ──────────────────────────────────────────────────────────────────────────
   ⑬ EL PORTAL TIENE SALIDA (reporte de Isaac, 2026-08-19).
   Isaac abrió el enlace y cayó directo en el wizard con una sesión ajena
   —la cuenta QA que le pasamos el 9 de agosto— y no encontró forma de llegar
   a "iniciar sesión o crear cuenta". El enrutado era correcto; lo que faltaba
   era la PUERTA DE VUELTA: la cabecera del portal no tenía cerrar sesión y el
   chip del usuario era un <span> muerto. Quedar encerrado en la sesión de otro
   es peor aquí que en el resto del Aula, porque este formulario recoge datos
   personales de un menor y de su tutor.
   ────────────────────────────────────────────────────────────────────────── */
describe("[ADM · UI] el portal de admisión no encierra a nadie", () => {
  const admFn = () => {
    const shell = read("app/lib/shell.ts");
    return shell.slice(shell.indexOf("export function renderAdmissionShell"), shell.indexOf("export function renderShell"));
  };

  it("la cabecera lleva cerrar sesión, con el MISMO data-action que ya delega Aula.tsx", () => {
    expect(admFn()).toContain('data-action="logout"');
    // El delegador global (root.addEventListener("click", onClick)) cubre este shell:
    // si el atributo cambiara, el botón quedaría muerto sin que nada lo avisara.
    expect(read("app/components/Aula.tsx")).toContain('[data-action="logout"]');
  });

  it("cerrar sesión es un <button>, no un enlace a '#'", () => {
    expect(admFn()).toMatch(/<button[^>]*data-action="logout"/);
  });

  it("el chip del usuario es interactivo y dice de QUIÉN es la sesión", () => {
    const fn = admFn();
    expect(fn).toContain("<summary");        // se puede abrir: ya no es un <span> muerto
    expect(fn).toMatch(/adm-acct/);
    expect(fn).toMatch(/u\?\.email/);        // el correo, para reconocer que la sesión es ajena
  });

  it("sigue sin barra de navegación: la salida no es una excusa para meter el menú del Aula", () => {
    expect(admFn()).not.toMatch(/tn-links|tabbar|data-go="course"|data-go="debate"/);
  });
});

/* ⑭ El wordmark del login: Isaac pidió el 08/08 "quítale el Aula, deja el logo y ya".
   Se arregló en el shell del Aula pero el LOGIN se quedó con "OTR Aula". */
describe("[LOGIN] la marca del login es solo el escudo", () => {
  it("el bloque login-mark ya no pinta el wordmark 'Aula'", () => {
    const auth = read("app/components/Auth.tsx");
    const i = auth.indexOf('className="login-mark"');
    expect(i).toBeGreaterThan(-1);
    const block = auth.slice(i, auth.indexOf('className="login-form"'));
    expect(block).not.toMatch(/Aula/);
    expect(block).toContain("otrCrest");     // el escudo SÍ se queda
  });
});
