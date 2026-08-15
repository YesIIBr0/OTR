/* [GOAL A2 + A4 · F2] Fechas del payload en el idioma de la request + título real de
   la próxima clase.

   A2 — con cookie `otr_lang=en` la UI salía en inglés pero las FECHAS en español
   ("mar 11 ago · 4:00 PM", "sáb 15 ago"): los formateadores del payload
   (queries.ts) tenían las tablas de días/meses cableadas a español y NUNCA recibían
   el idioma. Aquí se fija el contrato: MISMO instante → etiqueta ES con 'es' y
   etiqueta EN con 'en', y la etiqueta EN no puede contener NINGÚN token español.

   A4 — la "próxima clase" del dashboard se titulaba literalmente "Single", que es el
   nombre COMERCIAL del paquete (Single / 5-pack / 10-pack), no la clase. El título
   sale ahora del dato real del coach y el paquete queda como metadato. */
import { describe, it, expect, beforeEach } from "vitest";

/* Stubs de `window` ANTES de importar builders (mismo patrón que ui-shell-dashboard). */
/* eslint-disable @typescript-eslint/no-explicit-any */
(globalThis as any).window = (globalThis as any).window || {};
const win: any = (globalThis as any).window;
win.api = async () => ({});
win.go = () => {};
win.toast = () => {};
/* eslint-enable @typescript-eslint/no-explicit-any */

import {
  fmtDateTimeRD, fmtDayMonth, fmtDayMonthYear, fmtMonthYear, fmtMonthFull,
  fmtMonthNameYear, fmtMemberSinceLabel, fmtPlanSinceLabel,
} from "../app/lib/i18n";
import { bookingClassTitle } from "../app/lib/queries";
import { DB } from "../app/lib/data";
import { S as SCore } from "../app/lib/scr-core";

/* eslint-disable @typescript-eslint/no-explicit-any */
const Core: any = SCore;

// Martes 11 de agosto de 2026, 4:00 PM hora RD (UTC-4) → 20:00 UTC.
// Es exactamente el label que el barrido pilló en inglés: "mar 11 ago · 4:00 PM".
// Solo para fmtDateTimeRD, que fija la zona a RD y por tanto NO depende de la TZ del proceso.
const T = new Date("2026-08-11T20:00:00.000Z");

// [CI] Los formateadores de día/mes/año SÍ leen la fecha en la zona del proceso (comportamiento
// que ya tenían shortDateLabel/monthYearLabel/monthFullLabel y que no toqué). Sus fixtures usan
// MEDIODÍA UTC: así el día calendario es el 11 desde UTC-12 hasta UTC+11 y el test no depende de
// la TZ de la máquina (con 20:00Z fallaba en Asia/Tokyo, que ya estaba en el día 12).
const T_LOCAL = new Date("2026-08-11T12:00:00.000Z");

// Tokens que SOLO existen en español: si aparecen con lang='en', la fecha se quedó sin traducir.
const ES_TOKENS = /\b(lun|mar|mié|jue|vie|sáb|dom|ene|abr|ago|dic|enero|agosto|diciembre)\b/i;

describe("A2 · los formateadores de fecha hablan el idioma de la request", () => {
  it("fmtDateTimeRD: el MISMO instante da label ES con 'es' y label EN con 'en'", () => {
    const es = fmtDateTimeRD(T, "es");
    const en = fmtDateTimeRD(T, "en");
    expect(es).toBe("mar 11 ago · 4:00 PM"); // no cambia: es el label de hoy en ES
    expect(en).not.toBe(es);
    expect(en).toBe("Tue, 11 Aug · 4:00 PM");
    expect(en).not.toMatch(ES_TOKENS);
  });

  it("fmtDateTimeRD respeta la hora RD fija (UTC-4), no la del servidor", () => {
    // 2026-08-12T01:30:00Z = 9:30 PM del 11 en RD. Un servidor UTC no puede correr el día.
    const d = new Date("2026-08-12T01:30:00.000Z");
    expect(fmtDateTimeRD(d, "es")).toBe("mar 11 ago · 9:30 PM");
    expect(fmtDateTimeRD(d, "en")).toBe("Tue, 11 Aug · 9:30 PM");
  });

  it("fmtDayMonth: '11 ago' en ES, '11 Aug' en EN", () => {
    expect(fmtDayMonth(T_LOCAL, "es")).toBe("11 ago");
    expect(fmtDayMonth(T_LOCAL, "en")).toBe("11 Aug");
    expect(fmtDayMonth(T_LOCAL, "en")).not.toMatch(ES_TOKENS);
  });

  it("fmtMonthYear: 'ago 2026' en ES, 'Aug 2026' en EN", () => {
    expect(fmtMonthYear(T_LOCAL, "es")).toBe("ago 2026");
    expect(fmtMonthYear(T_LOCAL, "en")).toBe("Aug 2026");
    expect(fmtMonthYear(T_LOCAL, "en")).not.toMatch(ES_TOKENS);
  });

  it("fmtMonthFull: 'Agosto 2026' en ES, 'August 2026' en EN", () => {
    expect(fmtMonthFull(T_LOCAL, "es")).toBe("Agosto 2026");
    expect(fmtMonthFull(T_LOCAL, "en")).toBe("August 2026");
    expect(fmtMonthFull(T_LOCAL, "en")).not.toMatch(ES_TOKENS);
  });

  it("fmtMonthNameYear: 'agosto 2026' en ES (minúscula), 'August 2026' en EN", () => {
    expect(fmtMonthNameYear(T_LOCAL, "es")).toBe("agosto 2026");
    expect(fmtMonthNameYear(T_LOCAL, "en")).toBe("August 2026");
  });

  it("antigüedad: 'Miembro desde …' / 'Member since …' y 'Desde …' / 'Since …'", () => {
    expect(fmtMemberSinceLabel(T_LOCAL, "es")).toBe("Miembro desde agosto 2026");
    expect(fmtMemberSinceLabel(T_LOCAL, "en")).toBe("Member since August 2026");
    expect(fmtMemberSinceLabel(T_LOCAL, "en")).not.toMatch(ES_TOKENS);
    expect(fmtPlanSinceLabel(T_LOCAL, "es")).toBe("Desde agosto 2026");
    expect(fmtPlanSinceLabel(T_LOCAL, "en")).toBe("Since August 2026");
    expect(fmtPlanSinceLabel(T_LOCAL, "en")).not.toMatch(ES_TOKENS);
    // Sin fecha: "Miembro desde" conserva el respaldo del payload; el plan no inventa nada.
    expect(fmtMemberSinceLabel(null, "en")).toBe("Member since 2026");
    expect(fmtPlanSinceLabel(null, "en")).toBe("");
  });

  it("la etiqueta EN sigue siendo parseable por las cajitas de fecha (scr-core/scr-events)", () => {
    // Misma regex que scr-core.ts:133 y scr-events.ts:32 sobre el startsLabel del torneo.
    const RE = /(\d{1,2})\s+([^\s·,]{3,})/;
    for (const lang of ["es", "en"]) {
      const m = RE.exec(fmtDateTimeRD(T, lang));
      expect(m, `sin día/mes reconocibles en '${lang}'`).not.toBeNull();
      expect((m as RegExpExecArray)[1]).toBe("11");
    }
    expect(RE.exec(fmtDateTimeRD(T, "en"))![2]).toBe("Aug");
  });

  it("sin idioma reconocible cae a español (default del producto), nunca a la clave cruda", () => {
    expect(fmtDateTimeRD(T, "pt")).toBe("mar 11 ago · 4:00 PM");
    expect(fmtDayMonth(T_LOCAL, undefined)).toBe("11 ago");
  });

  it("dato ausente o inválido devuelve cadena vacía (nunca 'Invalid Date')", () => {
    for (const f of [fmtDateTimeRD, fmtDayMonth, fmtMonthYear, fmtMonthFull, fmtMonthNameYear, fmtPlanSinceLabel]) {
      expect(f(null, "es")).toBe("");
      expect(f(undefined, "en")).toBe("");
      expect(f(new Date("no-es-fecha"), "en")).toBe("");
    }
  });
});

describe("A4 · el título de la próxima clase nunca es el tipo de sesión", () => {
  it("con especialidad real del coach, el título es la clase — no el paquete 'Single'", () => {
    const es = bookingClassTitle({ specialty: "Public Forum", coachName: "Saúl Méndez", lang: "es" });
    const en = bookingClassTitle({ specialty: "Public Forum", coachName: "Saúl Méndez", lang: "en" });
    expect(es).toBe("Sesión de Public Forum");
    expect(en).toBe("Public Forum session");
    for (const title of [es, en]) {
      expect(title).not.toBe("Single");
      expect(title).not.toBe("5-pack");
      expect(title).not.toBe("10-pack");
    }
  });

  it("sin especialidad cae al coach real, nunca al nombre del paquete", () => {
    expect(bookingClassTitle({ specialty: "", coachName: "Carla Jiménez", lang: "es" }))
      .toBe("Sesión con Carla Jiménez");
    expect(bookingClassTitle({ specialty: null, coachName: "Carla Jiménez", lang: "en" }))
      .toBe("Session with Carla Jiménez");
  });

  it("toma SOLO la primera especialidad de la lista separada por comas", () => {
    expect(bookingClassTitle({
      specialty: "Public Forum, Lincoln-Douglas, Oratoria", coachName: "Saúl Méndez", lang: "es",
    })).toBe("Sesión de Public Forum");
  });
});

describe("A4 · el dashboard pinta el título real, no 'Single'", () => {
  beforeEach(() => {
    for (const k of Object.keys(DB)) delete (DB as any)[k];
    Object.assign(DB, {
      me: { name: "Analía Reyes", initials: "AR", role: "student", level: "OTR Competitor", streak: 5 },
      courses: [], courseModules: [], coursesContent: [], catalog: [], skills: [], badges: [],
      events: [], activity: [], notifications: [], messages: [], levels: [], tournaments: [],
      myBookings: [{
        id: "bk-ar-saul-2", status: "CONFIRMED", upcoming: true, coachName: "Saúl Méndez",
        title: "Sesión de Public Forum", packageName: "Single",
        slotLabel: "mar 11 ago · 4:00 PM", slotAtIso: new Date(Date.now() + 864e5 * 3).toISOString(),
        durationMin: 60,
      }],
    });
  });

  it("el hero y la fila de eventos usan booking.title; 'Single' no aparece como título", () => {
    const html = Core.dashboard.render({ role: "student" });
    expect(html).toContain('<h2 class="dh-title">Sesión de Public Forum</h2>');
    expect(html).toContain('<div class="ev-title">Sesión de Public Forum</div>');
    expect(html).not.toContain('<h2 class="dh-title">Single</h2>');
    expect(html).not.toContain('<div class="ev-title">Single</div>');
  });

  it("el paquete no se pierde: baja de título a metadato del hero", () => {
    const html = Core.dashboard.render({ role: "student" });
    const meta = html.slice(html.indexOf('<div class="dh-meta">'), html.indexOf('<div class="dh-side">'));
    expect(meta).toContain("Single");   // metadato, junto al slot y la duración
    expect(meta).toContain("60 min");
  });

  it("si el payload NO trae título (dato viejo), sigue habiendo respaldo — nunca vacío", () => {
    (DB as any).myBookings[0].title = "";
    const html = Core.dashboard.render({ role: "student" });
    expect(html).toMatch(/<h2 class="dh-title">.+<\/h2>/);
  });
});

/* ============================================================================
   [ZONA] LAS FECHAS DE CALENDARIO SON LAS DE RD, CORRA DONDE CORRA EL CÓDIGO
   Estas etiquetas las produce el SERVIDOR (queries.ts arma el journey) y también el
   NAVEGADOR del alumno. El servidor de producción corre en UTC y la academia está en RD
   (UTC-4): con componentes locales, el mismo dato salía con DÍAS DISTINTOS según quién lo
   formateara, y todo lo ocurrido entre las 20:00 y las 23:59 hora dominicana —justo cuando
   hay clases— se etiquetaba con el día siguiente.
   ========================================================================== */
describe("[ZONA] día y mes se leen en hora de RD, no en la del runtime", () => {
  /** Lunes 10 de agosto de 2026, 8:00 PM en Santo Domingo = martes 11 a las 00:00 UTC. */
  const CLASE_NOCTURNA = new Date("2026-08-11T00:00:00.000Z");

  it("una clase de las 8 de la noche lleva la fecha del día en que ocurrió, no la del día siguiente", () => {
    expect(fmtDayMonth(CLASE_NOCTURNA, "es")).toBe("10 ago");
    expect(fmtDayMonthYear(CLASE_NOCTURNA, "es")).toBe("10 ago 2026");
    expect(fmtDayMonth(CLASE_NOCTURNA, "en")).toBe("10 Aug");
  });

  it("el último día del mes a las 9 PM no salta de mes ni de año", () => {
    // 31 dic 2026, 9:00 PM en RD = 1 de enero de 2027, 01:00 UTC. En UTC se leería 2027.
    const finDeAno = new Date("2027-01-01T01:00:00.000Z");
    expect(fmtDayMonthYear(finDeAno, "es")).toBe("31 dic 2026");
    expect(fmtMonthYear(finDeAno, "es")).toBe("dic 2026");
    expect(fmtMonthFull(finDeAno, "es")).toBe("Diciembre 2026");
    expect(fmtMonthNameYear(finDeAno, "en")).toBe("December 2026");
  });

  it("el resultado NO depende de la zona del proceso: es el mismo en cualquier servidor", () => {
    // Se comprueba la propiedad de verdad —no que "pasa en mi máquina"— comparando contra el
    // cálculo explícito en RD, que es lo que la función promete.
    const enRD = (iso: string) => {
      const d = new Date(iso);
      const rd = new Date(d.getTime() - 4 * 3600000);
      return { dia: rd.getUTCDate(), mes: rd.getUTCMonth() };
    };
    const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
    for (const iso of [
      "2026-08-11T00:00:00.000Z", "2026-08-11T03:59:00.000Z", "2026-08-11T04:00:00.000Z",
      "2027-01-01T01:00:00.000Z", "2026-03-01T02:30:00.000Z", "2026-12-31T23:59:00.000Z",
    ]) {
      const { dia, mes } = enRD(iso);
      expect(fmtDayMonth(iso, "es")).toBe(`${dia} ${MESES[mes]}`);
    }
  });
});
