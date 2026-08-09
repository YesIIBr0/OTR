// [FE-TEST · RONDA2 · CLASES] Homologación de la sección Cursos al mockup del cliente:
//   · MENÚ de clases ('course')        → card por curso: progreso, siguiente clase, CTA.
//   · ADENTRO ('course-detail')        → hero de la clase en curso, "Sobre esta clase",
//     material de preparación, rail "Contenido del curso" y card del coach.
//
// Lo que se blinda aquí es lo que puede MENTIR si se rompe:
//   ① el hero es HONESTO: solo dice "Clase en vivo hoy" cuando hay una reserva
//      CONFIRMADA de HOY con el coach de ese curso; si no, es "Próxima clase" + Continuar.
//   ② el rail refleja el estado REAL de cada clase (hecha / ahora / bloqueada) y la
//      bloqueada NO navega.
//   ③ nada se inventa: sin material, la sección no se pinta; sin dato, no hay celda.
//
// Los builders son módulos "@ts-nocheck" que solo arman strings de HTML → se prueban en
// Node con un stub de window (mismo patrón que ui-cursos-clases.test.ts).
import { describe, it, expect, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/* eslint-disable @typescript-eslint/no-explicit-any */
(globalThis as any).window = (globalThis as any).window || {};
const win: any = (globalThis as any).window;
win.api = async () => ({});
win.go = () => {};
win.toast = () => {};

import { DB } from "../app/lib/data";
import { S as SCore } from "../app/lib/scr-core";
import { ROUTES } from "../app/lib/screens";
import { CONTEXT_PARENT, contextFallbackRoute, routeNeedsContext } from "../app/lib/router";
import { t } from "../app/lib/i18n";

const Core: any = SCore;
const DAY = 86400000;
/** ISO de HOY a una hora fija (para "clase en vivo hoy" sin depender del reloj). */
const todayAt = (h: number) => { const d = new Date(); d.setHours(h, 0, 0, 0); return d.toISOString(); };

const MODULES = [
  {
    t: "Unidad 1 · Fundamentos",
    done: true,
    locked: false,
    items: [
      { id: "l-1", t: "Bienvenida y diagnóstico", type: "video", doneByMe: true, locked: false, dur: "8 min" },
      { id: "l-2", t: "Qué es Public Forum", type: "lesson", doneByMe: true, locked: false, dur: "15 min",
        contentHtml: "<p>Public Forum es un formato de <strong>equipos</strong>.</p><p>Segundo párrafo.</p>" },
    ],
  },
  {
    t: "Unidad 2 · Construcción del caso",
    done: false,
    locked: false,
    items: [
      { id: "l-3", t: "Construye tu primer contention", type: "assign", doneByMe: false, locked: false,
        due: "Mañana · 23:59", contentHtml: "<p>Entrega tu primer contention completo.</p>" },
      { id: "l-4", t: "Evidencia creíble", type: "lesson", doneByMe: false, locked: false, dur: "16 min" },
      { id: "l-5", t: "Grabación: constructivo de 2 min", type: "mic", doneByMe: false, locked: true, due: "Viernes · 23:59" },
    ],
  },
];

/** Copia PROFUNDA: varios tests mutan módulos/actividades y no pueden contaminarse. */
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

function resetFixture() {
  for (const k of Object.keys(DB)) delete (DB as any)[k];
  Object.assign(DB, {
    me: { name: "Analía Reyes", initials: "AR", role: "student" },
    courses: [{ id: "PF-101", code: "PF-101", name: "Public Forum I", coach: "Saúl Méndez", progress: 40, students: 8, lessons: 5 }],
    coursesContent: [{
      id: "PF-101", dbId: "c-1", code: "PF-101", name: "Public Forum I", coach: "Saúl Méndez",
      color: "#F25623", progress: 40, layout: "modules", format: "PF", modality: "online",
      summary: "Domina el formato Public Forum desde cero.", modules: clone(MODULES),
    }],
    courseModules: clone(MODULES),
    catalog: [],
    myGrades: { rows: [], avg: 0, submitted: 0, total: 0, best: 0 },
    myBookings: [],
    events: [], activity: [], notifications: [], messages: [], badges: [], levels: [], skills: [],
    marketplace: { viewer: { ageBand: null }, coaches: [] },
  });
  for (const k of Object.keys(win)) if (k.startsWith("__")) delete win[k];
  win.DB = DB;
  win.__course = "PF-101";
}
beforeEach(resetFixture);

/* ============ ① El hero es honesto con el dato ============ */
describe("Hero de la clase · en vivo vs continuar", () => {
  it("SIN sesión de hoy: 'Próxima clase' + CTA Continuar hacia la siguiente clase real", () => {
    const html = Core.courseDetail.render({ role: "student" });
    expect(html).toContain(t("core.clsNextClass"));
    expect(html).not.toContain(t("core.clsLiveToday"));
    expect(html).not.toContain(t("core.clsJoinNote")); // la nota del enlace es SOLO del en-vivo
    // El hero apunta a la primera clase NO completada y navegable (l-3, una entrega).
    expect(html).toContain('data-cls-lesson="l-3"');
    expect(html).toContain('data-cls-dest="assignment"');
    expect(html).toContain("Construye tu primer contention");
  });

  it("CON reserva CONFIRMADA de hoy del coach del curso: 'Clase en vivo hoy' + Entrar a la clase", () => {
    (DB as any).myBookings = [{
      id: "mb-1", status: "CONFIRMED", coachId: "u-saul", coachName: "Saúl Méndez",
      slotAtIso: todayAt(18), slotLabel: "hoy · 6:00 PM", durationMin: 90, upcoming: true,
      videoUrl: "/aula?room=mb-1",
    }];
    const html = Core.courseDetail.render({ role: "student" });
    expect(html).toContain(t("core.clsLiveToday"));
    expect(html).toContain(t("core.clsJoin"));
    expect(html).toContain(t("core.clsJoinNote"));
    expect(html).toContain('data-cls-room="mb-1"');
    // La franja de datos toma la duración REAL de la reserva.
    expect(html).toContain(t("core.clsMinutes").replace("{n}", "90"));
  });

  it("una reserva de OTRO coach no convierte el hero en 'clase en vivo'", () => {
    (DB as any).myBookings = [{
      id: "mb-9", status: "CONFIRMED", coachName: "Otra Coach", slotAtIso: todayAt(18),
      durationMin: 60, upcoming: true, videoUrl: "/aula?room=mb-9",
    }];
    const html = Core.courseDetail.render({ role: "student" });
    expect(html).not.toContain(t("core.clsLiveToday"));
    expect(html).not.toContain("data-cls-room");
  });

  it("una reserva del coach pero de OTRO día tampoco: 'hoy' significa hoy", () => {
    (DB as any).myBookings = [{
      id: "mb-2", status: "CONFIRMED", coachName: "Saúl Méndez",
      slotAtIso: new Date(Date.now() + 3 * DAY).toISOString(), durationMin: 60, upcoming: true,
      videoUrl: "/aula?room=mb-2",
    }];
    const html = Core.courseDetail.render({ role: "student" });
    expect(html).not.toContain(t("core.clsLiveToday"));
    expect(html).toContain(t("core.clsNextClass"));
  });

  it("una reserva de hoy PENDIENTE de aprobación no promete una clase en vivo", () => {
    (DB as any).myBookings = [{
      id: "mb-3", status: "PENDING", coachName: "Saúl Méndez", slotAtIso: todayAt(18),
      durationMin: 60, upcoming: true, videoUrl: "",
    }];
    expect(Core.courseDetail.render({ role: "student" })).not.toContain(t("core.clsLiveToday"));
  });

  it("el hero sitúa la clase en el curso: 'Módulo 2 · Clase 3 de 5'", () => {
    const html = Core.courseDetail.render({ role: "student" });
    expect(html).toContain(t("core.clsModuleClassOf").replace("{m}", "2").replace("{i}", "3").replace("{n}", "5"));
  });
});

/* ============ ② El rail dice el estado real ============ */
describe("Rail 'Contenido del curso' · estados reales", () => {
  it("marca hecha / ahora / bloqueada, y solo una está 'ahora'", () => {
    const html = Core.courseDetail.render({ role: "student" });
    expect((html.match(/cls-les is-done/g) || []).length).toBe(2);   // l-1, l-2
    expect((html.match(/cls-les is-now/g) || []).length).toBe(1);    // l-3
    expect((html.match(/cls-les is-lock/g) || []).length).toBe(1);   // l-5
    expect(html).toContain(t("core.clsNow"));
  });

  it("la clase BLOQUEADA no navega (botón disabled, sin data-cls-lesson)", () => {
    const html = Core.courseDetail.render({ role: "student" });
    const row = html.slice(html.indexOf("cls-les is-lock"));
    expect(row.slice(0, 120)).toContain("disabled");
    expect(html).not.toContain('data-cls-lesson="l-5"');
  });

  it("la clase HECHA sí navega (se puede repasar)", () => {
    expect(Core.courseDetail.render({ role: "student" })).toContain('data-cls-lesson="l-1"');
  });

  it("el % y el conteo salen del dato, no de un número escrito a mano", () => {
    const html = Core.courseDetail.render({ role: "student" });
    expect(html).toContain(">40%<");
    expect(html).toContain(t("core.clsTocCaption").replace("{done}", "2").replace("{total}", "5").replace("{m}", "2"));
  });

  it("el botón del coach lleva a Mensajes con nombre accesible", () => {
    const html = Core.courseDetail.render({ role: "student" });
    expect(html).toContain('data-go="messages"');
    expect(html).toContain(t("core.clsMessageCoach").replace("{coach}", "Saúl Méndez"));
    expect(html).toContain(t("core.clsYourCoach"));
  });
});

/* ============ ③ Sobre esta clase / material: nada inventado ============ */
describe("Sobre esta clase y material de preparación", () => {
  it("la descripción sale del primer párrafo real de la clase", () => {
    const html = Core.courseDetail.render({ role: "student" });
    expect(html).toContain("Entrega tu primer contention completo.");
    expect(html).not.toContain("Segundo párrafo."); // solo el primero, no el contenido entero
  });

  it("sin contenido propio cae al resumen del curso, y sin resumen a un vacío honesto", () => {
    (DB as any).coursesContent[0].modules[1].items[0].contentHtml = "";
    expect(Core.courseDetail.render({ role: "student" })).toContain("Domina el formato Public Forum desde cero.");
    (DB as any).coursesContent[0].summary = "";
    expect(Core.courseDetail.render({ role: "student" })).toContain(t("core.clsAboutFallback"));
  });

  it("la franja de datos usa la fecha de entrega REAL de la clase", () => {
    const html = Core.courseDetail.render({ role: "student" });
    expect(html).toContain(t("core.clsFactDue"));
    expect(html).toContain("Mañana · 23:59");
  });

  it("el material son las otras actividades del MISMO módulo, sin repetir la clase actual", () => {
    const html = Core.courseDetail.render({ role: "student" });
    const mats = html.slice(html.indexOf('class="cls-mats'), html.indexOf('class="cls-rail'));
    expect(mats).toContain("Evidencia creíble");
    expect(mats).toContain("Grabación: constructivo de 2 min");
    expect(mats).not.toContain("Construye tu primer contention");
    expect(mats).not.toContain("Bienvenida y diagnóstico"); // esa es de otro módulo
  });

  it("sin material, la sección NO se pinta (nada de vacíos feos)", () => {
    (DB as any).coursesContent[0].modules[1].items = [clone(MODULES[1].items[0])];
    const html = Core.courseDetail.render({ role: "student" });
    expect(html).not.toContain(t("core.clsMaterials"));
    expect(html).not.toContain('cls-mats');
  });
});

/* ============ ④ Menú de clases + navegación ============ */
describe("Menú de clases", () => {
  // [RONDA3] El menú dejó de ser una rejilla de cards: ahora es una LISTA de 1 fila por
  // programa (2ª vuelta del mockup de Isaac). Lo que se blinda es lo MISMO de siempre —
  // el programa, su progreso REAL, cuál es su próxima clase y un CTA que abre el adentro.
  it("pinta una FILA por curso con progreso, próxima clase y CTA que abre el adentro", () => {
    const html = Core.coursesMine.render({ role: "student" });
    expect(html).toContain(t("core.clsMenuTitle"));
    expect(html).toContain("Public Forum I");
    expect(html).toContain("cls-row");
    // Progreso: módulo en curso sobre el total de módulos + el % real del payload.
    expect(html).toContain(t("core.clsModuleOf").replace("{m}", "2").replace("{n}", "2"));
    expect(html).toContain(">40%<");
    // Próxima clase: la primera no completada y navegable, con su entrega real.
    expect(html).toContain("Construye tu primer contention");
    expect(html).toContain("Mañana · 23:59");
    expect(html).toContain('data-cls-open="PF-101"');
    expect(html).toContain(t("core.continue"));
  });

  it("un curso sin empezar ofrece 'Empezar' en vez de 'Continuar'", () => {
    (DB as any).coursesContent[0].modules.forEach((m: any) => m.items.forEach((i: any) => { i.doneByMe = false; }));
    expect(Core.coursesMine.render({ role: "student" })).toContain(t("core.clsStart"));
  });

  it("un curso sin contenido publicado lo dice y no ofrece un CTA que no lleva a nada", () => {
    (DB as any).coursesContent[0].modules = [];
    const html = Core.coursesMine.render({ role: "student" });
    expect(html).toContain(t("core.clsNoContentYet"));
    expect(html).toContain("disabled");
  });

  it("el menú NO pinta el 'adentro' (rejilla, hero y rail son de la otra pantalla)", () => {
    const html = Core.coursesMine.render({ role: "student" });
    expect(html).not.toContain('class="cls-in"');
    expect(html).not.toContain("cls-hero");
    expect(html).not.toContain("cls-rail");
  });
});

/* ============ ⑤ Router: el adentro es pantalla-con-contexto ============ */
describe("Router · 'course-detail'", () => {
  it("la ruta existe, cuelga del nav de Cursos y usa la pantalla courseDetail", () => {
    expect((ROUTES as any)["course-detail"]).toBeTruthy();
    expect((ROUTES as any)["course-detail"].screen).toBe("courseDetail");
    expect((ROUTES as any)["course-detail"].nav).toBe("course");
  });

  it("sin contexto fresco (F5 / Atrás) el alumno cae al MENÚ de clases, no a un curso ajeno", () => {
    expect(routeNeedsContext("course-detail")).toBe(true);
    expect(CONTEXT_PARENT["course-detail"]).toBe("course");
    expect(contextFallbackRoute("course-detail", "student")).toBe("course");
  });

  it("el breadcrumb del adentro vuelve al menú", () => {
    expect(Core.courseDetail.render({ role: "student" })).toContain("data-cls-back");
  });
});

/* ============ ⑥ AA: ni blanco sobre naranja ni el gris que no pasa ============ */
describe("Accesibilidad de la sección", () => {
  const css = readFileSync(join(process.cwd(), "app/styles/screens.css"), "utf8");
  const bloque = css.slice(css.indexOf("RONDA2 · CLASES (mockup Isaac)"));
  // Sin comentarios: el propio comentario del bloque NOMBRA el #808080 para explicar por qué
  // no se usa. Se corta la cabecera (el slice empieza DENTRO de ella) y se quitan los demás.
  const reglas = bloque.slice(bloque.indexOf("*/") + 2).replace(/\/\*[\s\S]*?\*\//g, "");

  it("el naranja de texto pequeño es el accesible (#9E3211), no el naranja pleno", () => {
    expect(bloque).toContain("--otr-green-text");
    // .cls-pct / .cls-toc-pct / .cls-les-s / .cls-mat-a son texto de 11-12,5px en naranja.
    for (const sel of [".cls-pct{", ".cls-toc-pct{", ".cls-les-s{"]) {
      const r = bloque.slice(bloque.indexOf(sel), bloque.indexOf(sel) + 160);
      expect(r, `${sel} usa el naranja accesible`).toContain("var(--otr-green-text)");
    }
  });

  it("el punto de la clase EN CURSO lleva texto negro sobre el naranja, nunca blanco", () => {
    const r = bloque.slice(bloque.indexOf(".cls-les.is-now .cls-les-dot{"));
    expect(r.slice(0, 140)).toContain("var(--text-on-accent)");
  });

  it("el label del coach sobre negro no usa el gris que falla AA en oscuro", () => {
    const r = bloque.slice(bloque.indexOf(".cls-coach .lbl{"));
    expect(r.slice(0, 80)).toContain("var(--ink-300)");
  });

  it("el #808080 del mockup no entra como color de texto", () => {
    expect(reglas.toLowerCase()).not.toContain("#808080");
  });
});
