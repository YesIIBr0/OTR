// [FE-TEST · GOAL F3] Los dos defectos cosméticos del barrido del rol ALUMNO
// (docs/review/GOAL_2026-08_barrido-alumno.md):
//
//   A3 · dashboard — el nombre de insignia de UNA palabra larga ("Semifinalista")
//        no tenía dónde partir: medía 75px dentro de una caja de 57px y el
//        overflow:hidden de .bt-n lo cortaba a media palabra, sin ellipsis.
//        El arreglo vive en el CSS (app/styles/screens.css), así que aquí se fija
//        el CONTRATO de las dos piezas que tienen que seguir casando: el builder
//        pinta el nombre en <span class="bt-n"> y la hoja le da dónde cortar.
//
//   A5 · progress — "Progreso y niveles" no tenía NI UN control (100% lectura).
//        Ahora cierra con dos salidas del kit hacia insignias y Debate Hub.
//
// Mismo patrón que screens.test.ts / ui-shell-dashboard.test.ts: los builders son
// módulos "@ts-nocheck" que solo arman strings, se prueban en Node con un stub de
// window (sin jsdom).
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
import { S as SProfile } from "../app/lib/scr-profile";
import { ROUTES } from "../app/lib/screens";
import { t } from "../app/lib/i18n";

const Core: any = SCore;
const Profile: any = SProfile;

const css = () => readFileSync(join(process.cwd(), "app/styles/screens.css"), "utf8");

beforeEach(() => {
  for (const k of Object.keys(DB)) delete (DB as any)[k];
  Object.assign(DB, {
    me: { name: "Analía Reyes", initials: "AR", role: "student", level: "OTR Competitor", streak: 5 },
    xp: 3120, xpLevelStart: 2400, xpNext: 5000,
    levels: [
      { name: "OTR Initiate", range: "0 – 800 XP", color: "#BDBDBD" },
      { name: "OTR Competitor", range: "2.400 – 5.000 XP", color: "#2CAA20" },
      { name: "OTR Strategist", range: "5.000 – 9.000 XP", color: "#F25623" },
    ],
    // La insignia del defecto, con su nombre REAL de seed (prisma/seed.ts).
    badges: [
      { n: "Semifinalista", d: "Llegaste a Varsity o Elite", ic: "medal", got: true, xp: 220 },
      { n: "Refutador", d: "Dominas la refutación de impacto", ic: "target", got: false, xp: 180 },
    ],
    skills: [{ skill: "Confianza", score: 88 }],
    activity: [{ title: "Semifinalista del interno OTR", xp: 200, when: "hace 2 d" }],
    courses: [], courseModules: [], coursesContent: [], catalog: [],
    events: [], notifications: [], messages: [], myBookings: [],
  });
});

/* ================= A3 · el nombre de la insignia no se corta ================= */
describe("A3 · el chip de la insignia parte en dos líneas en vez de cortarse", () => {
  it("el dashboard pinta el nombre en .bt-n (la clase que engancha el arreglo)", () => {
    const html = Core.dashboard.render({ role: "student" });
    expect(html).toContain('<span class="bt-n">Semifinalista</span>');
  });

  it("la hoja le da a .bt-n dónde partir la palabra (hyphens + overflow-wrap)", () => {
    const rule = css().match(/\.badge-tile \.bt-n\{[^}]*hyphens[^}]*\}/);
    expect(rule).not.toBeNull();
    expect(rule![0]).toContain("hyphens:auto");
    expect(rule![0]).toContain("overflow-wrap:break-word");
  });

  it("se conservan las dos líneas del criterio ya tomado (nada de ellipsis en 1 línea)", () => {
    const base = css().match(/\.badge-tile \.bt-n\{[^}]*-webkit-line-clamp:2[^}]*\}/);
    expect(base).not.toBeNull();
    expect(base![0]).not.toContain("white-space:nowrap");
  });
});

/* ================= A5 · "Progreso y niveles" deja de ser 100% lectura ======== */
describe("A5 · progress cierra con dos salidas reales", () => {
  it("las rutas destino existen en ROUTES (no se navega al vacío)", () => {
    expect(ROUTES.badges).toBeTruthy();
    expect(ROUTES.debate).toBeTruthy();
    expect(ROUTES.badges.screen).toBe("badges");
    expect(ROUTES.debate.screen).toBe("debateHub");
  });

  it("pinta DOS botones del kit (btn-outline sm) al final de la pantalla", () => {
    const html = Profile.progress.render({ role: "student" });
    const botones = html.match(/<button class="btn btn-outline btn--sm"/g) || [];
    expect(botones.length).toBe(2);
    expect(html).toContain("progress-exits");
    // Van al FINAL: después de la escalera de niveles y del rail de "Subidas recientes".
    const salidas = html.indexOf(`onclick="go('badges')"`);
    expect(salidas).toBeGreaterThan(html.indexOf("level-track"));
    expect(salidas).toBeGreaterThan(html.indexOf(t("profile.recentGains")));
  });

  it("cada botón navega in-app con go('<ruta>') a insignias y al Debate Hub", () => {
    const html = Profile.progress.render({ role: "student" });
    expect(html).toContain(`onclick="go('badges')"`);
    expect(html).toContain(`onclick="go('debate')"`);
  });

  it("los rótulos salen de i18n y existen en ES y EN", () => {
    const html = Profile.progress.render({ role: "student" });
    expect(html).toContain(t("profile.progressGoBadges"));
    expect(html).toContain(t("profile.progressGoDebate"));
    expect(t("profile.progressGoBadges", "es")).toBe("Ver insignias");
    expect(t("profile.progressGoBadges", "en")).toBe("View badges");
    expect(t("profile.progressGoDebate", "es")).toBe("Debate Hub");
    expect(t("profile.progressGoDebate", "en")).toBe("Debate Hub");
  });
});

/* ================= K-09 · la escalera de encabezados no salta ==============
   (auditoría de teclado, hallazgo K-09) En "Cursos" el bloque "Mis reservas"
   colgaba un h3 del <h1> del curso, y los estados vacíos de scr-core.ts colgaban
   un h4. El diseño lo dan las CLASES (.sec-title viste igual h2/h3/h4; el vacío
   lo viste .empty), así que corregir el TAG no mueve un píxel. */
const MODULOS = [{
  t: "Módulo 1 — Fundamentos", done: false, locked: false,
  items: [{ id: "l-1", t: "El modelo ARE", type: "video", done: true, doneByMe: true, locked: false, dur: "12 min" }],
}];
function fixtureCursos(extra: Record<string, unknown> = {}) {
  for (const k of Object.keys(DB)) delete (DB as any)[k];
  Object.assign(DB, {
    me: { name: "Analía Reyes", initials: "AR", role: "student", level: "OTR Competitor", streak: 5 },
    courses: [{ id: "PF-101", code: "PF-101", name: "Public Forum I", coach: "Saúl Méndez", color: "#2CAA20", progress: 50 }],
    coursesContent: [{ id: "PF-101", dbId: "c-1", code: "PF-101", name: "Public Forum I", coach: "Saúl Méndez", color: "#2CAA20", progress: 50, layout: "modules", modules: MODULOS }],
    courseModules: MODULOS, catalog: [],
    myGrades: { rows: [{ activity: "Ensayo", score: 88, letter: "B+", kind: "Entrega", status: "GRADED" }], avg: 88, submitted: 1, total: 1, best: 88 },
    myBookings: [
      { id: "mb-1", status: "CONFIRMED", coachId: "co-1", coachName: "Saúl Méndez", coachInitials: "SM", packageName: "Single", slotLabel: "lun 11 ago · 4:00 PM", slotAtIso: new Date(Date.now() + 3 * 864e5).toISOString(), upcoming: true, priceLabel: "$36", escrowStatus: "HELD", videoUrl: "/aula?room=mb-1", canReview: false },
      { id: "mb-2", status: "COMPLETED", coachId: "co-1", coachName: "Saúl Méndez", coachInitials: "SM", packageName: "10-pack", slotLabel: "jue 23 jul · 7:00 PM", slotAtIso: new Date(Date.now() - 6 * 864e5).toISOString(), upcoming: false, priceLabel: "$340", escrowStatus: "HELD", videoUrl: "", canReview: true },
    ],
    events: [], activity: [], notifications: [], messages: [], badges: [], levels: [], skills: [],
    ...extra,
  });
  for (const k of Object.keys(win)) if (k.startsWith("__")) delete win[k];
  win.DB = DB;
  win.__course = "PF-101";
}
/** Secuencia de niveles de encabezado tal y como aparecen en el HTML. */
const niveles = (html: string) => [...html.matchAll(/<h([1-6])[\s>]/g)].map((m) => Number(m[1]));
/** Saltos (subir más de un nivel de golpe) en esa secuencia. */
const saltos = (html: string) => {
  const ns = niveles(html);
  const out: string[] = [];
  ns.forEach((n, i) => { if (i && n > ns[i - 1] + 1) out.push(`h${ns[i - 1]}->h${n} (#${i})`); });
  return out;
};

describe("K-09 · Cursos: 'Mis reservas' cuelga del h1 sin saltarse un nivel", () => {
  beforeEach(() => fixtureCursos());

  it("la sección va en h2 y sus dos bloques en h3", () => {
    const html = Core.course.render({ role: "student" });
    expect(html).toContain(`<h2>${t("mb.title")}</h2>`);
    expect(html).toContain(`<h3>${t("mb.upcomingTitle")}</h3>`);
    expect(html).toContain(`<h3>${t("mb.historyTitle")}</h3>`);
    expect(html).not.toContain(`<h3>${t("mb.title")}</h3>`);
  });

  it("la escalera completa de la pantalla Cursos no salta ningún nivel", () => {
    const html = Core.course.render({ role: "student" });
    expect(niveles(html)[0]).toBe(1);          // arranca en el h1 del curso
    expect(saltos(html)).toEqual([]);
  });

  it("sin reservas, el estado vacío tampoco salta (h2 -> h3)", () => {
    fixtureCursos({ myBookings: [] });
    const html = Core.course.render({ role: "student" });
    expect(html).toContain(`<h3>${t("mb.emptyHeading")}</h3>`);
    expect(saltos(html)).toEqual([]);
  });
});

describe("K-09 · los estados vacíos de scr-core.ts cuelgan en h2 del h1 de pantalla", () => {
  beforeEach(() => fixtureCursos());

  it("sin cursos activos", () => {
    fixtureCursos({ courses: [], coursesContent: [], courseModules: [] });
    const html = Core.course.render({ role: "student" });
    expect(html).toContain(`<h2>${t("core.courseEnrollHeading")}</h2>`);
    expect(saltos(html)).toEqual([]);
  });

  it("curso sin módulos", () => {
    fixtureCursos({ coursesContent: [{ id: "PF-101", dbId: "c-1", code: "PF-101", name: "Public Forum I", coach: "Saúl Méndez", color: "#2CAA20", progress: 0, layout: "modules", modules: [] }] });
    const html = Core.course.render({ role: "student" });
    expect(html).toContain(`<h2>${t("core.modsEmptyHeading")}</h2>`);
    expect(saltos(html)).toEqual([]);
  });

  it("pestaña de calificaciones sin notas", () => {
    fixtureCursos({ myGrades: { rows: [], avg: 0, submitted: 0, total: 0, best: 0 } });
    win.__courseTab = "grades";
    const html = Core.course.render({ role: "student" });
    expect(html).toContain(`<h2>${t("core.gradesEmpty")}</h2>`);
    expect(saltos(html)).toEqual([]);
  });

  it("índice del curso sin actividades", () => {
    fixtureCursos({ coursesContent: [{ id: "PF-101", dbId: "c-1", code: "PF-101", name: "Public Forum I", coach: "Saúl Méndez", color: "#2CAA20", progress: 0, layout: "modules", modules: [] }] });
    const html = Core.courseIndex.render({ role: "student" });
    expect(html).toContain(`<h2>${t("core.indexEmptyHeading")}</h2>`);
    expect(saltos(html)).toEqual([]);
  });

  it("lección real todavía sin contenido", () => {
    fixtureCursos({
      coursesContent: [{
        id: "PF-101", dbId: "c-1", code: "PF-101", name: "Public Forum I", coach: "Saúl Méndez", color: "#2CAA20", progress: 0, layout: "modules",
        modules: [{ t: "Módulo 1", done: false, locked: false, items: [{ id: "l-9", t: "Lección nueva", type: "lesson", doneByMe: false, locked: false, contentHtml: "", videoKind: null, videoSrc: null }] }],
      }],
    });
    win.__lesson = "l-9";
    const html = Core.lesson.render({ role: "student" });
    expect(html).toContain(`<h2>${t("core.lessonPrepHeading")}</h2>`);
    expect(saltos(html)).toEqual([]);
  });

  it("la hoja viste igual el h2/h3 del vacío que el h4 que había (mismo tamaño y color)", () => {
    const hoja = css();
    const regla = hoja.match(/\.empty h2,\.empty h3\{([^}]*)\}/);
    expect(regla).not.toBeNull();
    expect(regla![1]).toContain("font-size:16px");
    expect(regla![1]).toContain("color:var(--text)");
    expect(regla![1]).toContain("margin-bottom:6px");
  });
});
