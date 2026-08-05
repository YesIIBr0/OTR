// [FE-TEST · UI-CURSOS] Reorganización pedida sobre las capturas del alumno:
//   U1 · la tarjeta del curso mide la MITAD (banner compacto)
//   U2 · "Contenido" y "Calificaciones" viven DENTRO del curso (tabs in-place, sin navegar)
//   U3 · las reservas (próximas + historial) se pintan BAJO los cursos
//   U4 · la pantalla suelta "Mis reservas" desaparece (nav, ruta y todos sus data-go)
//   U5 · "Buscar clases": chips grandes y tarjetas con thumbnail
//
// Los builders son módulos "@ts-nocheck" que solo arman strings de HTML, así que se
// prueban en Node con un stub de window (mismo patrón que screens.test.ts). Lo que se
// fija aquí es el CONTRATO visible: qué aparece en el HTML y qué ya no puede aparecer.
import { describe, it, expect, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/* eslint-disable @typescript-eslint/no-explicit-any */
(globalThis as any).window = (globalThis as any).window || {};
const win: any = (globalThis as any).window;
win.api = async () => ({});
win.go = () => {};
win.toast = () => {};
win.otrFormModal = () => {};

import { DB } from "../app/lib/data";
import { S as SCore } from "../app/lib/scr-core";
import { S as SListings } from "../app/lib/scr-listings";
import { S as SMarketplace } from "../app/lib/scr-marketplace";
import * as Bookings from "../app/lib/scr-mybookings";
import { renderShell } from "../app/lib/shell";
import { ROUTES } from "../app/lib/screens";
import { t } from "../app/lib/i18n";

const Core: any = SCore;
const Listings: any = SListings;
const Marketplace: any = SMarketplace;
const NOW = Date.now();
const DAY = 86400000;
const isoIn = (ms: number) => new Date(NOW + ms).toISOString();

const MODULES = [
  {
    t: "Módulo 1 — Fundamentos",
    done: false,
    locked: false,
    items: [
      { id: "l-1", t: "El modelo ARE", type: "video", done: true, doneByMe: true, locked: false, grade: 92, dur: "12 min" },
      { id: "l-2", t: "Quiz: Fundamentos", type: "quiz", done: false, doneByMe: false, locked: false, grade: null, dur: "20 min" },
    ],
  },
];

/** Fixture mínimo pero con la forma real del contrato de queries.ts (getAppData). */
function resetFixture() {
  for (const k of Object.keys(DB)) delete (DB as any)[k];
  Object.assign(DB, {
    me: { name: "Isaac Peshach", initials: "IP", role: "student", level: "OTR Competitor", streak: 3 },
    courses: [{ id: "PF-FUND-2026", code: "PF-FUND-2026", name: "Fundamentos de Public Forum", coach: "Isaac Peshach", color: "#2CAA20", progress: 0, students: 2, lessons: 4 }],
    coursesContent: [{ id: "PF-FUND-2026", dbId: "c-1", code: "PF-FUND-2026", name: "Fundamentos de Public Forum", coach: "Isaac Peshach", color: "#2CAA20", progress: 0, layout: "modules", modules: MODULES }],
    courseModules: MODULES,
    catalog: [],
    myGrades: {
      rows: [{ activity: "Ensayo de refutación", score: 88, letter: "B+", kind: "Entrega", status: "GRADED", feedback: "Buen trabajo" }],
      avg: 88, submitted: 1, total: 1, best: 88,
    },
    myBookings: [
      { id: "mb-1", status: "CONFIRMED", coachId: "coach-1", coachName: "Saul Martinez", coachInitials: "SM", packageName: "Paquete de 5", slotLabel: "lun 14 jul · 4:00 PM", slotAtIso: isoIn(3 * DAY), upcoming: true, priceLabel: "$36", escrowStatus: "HELD", videoUrl: "/aula?room=mb-1", canReview: false },
      { id: "mb-2", status: "COMPLETED", coachId: "coach-1", coachName: "Isaac Peshach", coachInitials: "IP", packageName: "10-pack", slotLabel: "jue 23 jul · 7:00 PM", slotAtIso: isoIn(-6 * DAY), upcoming: false, priceLabel: "$340", escrowStatus: "HELD", videoUrl: "", canReview: true },
    ],
    events: [], activity: [], notifications: [], messages: [], badges: [], levels: [], skills: [],
    marketplace: { viewer: { ageBand: null }, coaches: [] },
  });
  for (const k of Object.keys(win)) if (k.startsWith("__")) delete win[k];
  win.DB = DB;
  win.__course = "PF-FUND-2026";
}

beforeEach(resetFixture);

/* ================= U3 · las reservas van bajo los cursos ================= */
describe("U3 · Cursos incluye las reservas del alumno", () => {
  it("el historial de reservas se pinta dentro de la sección Cursos", () => {
    const html = Core.coursesMine.render({ role: "student" });
    expect(html).toContain(t("mb.historyTitle"));   // "Historial"
    expect(html).toContain("10-pack");              // la reserva pasada, con su paquete
    expect(html).toContain("$340");
  });

  it("también trae las próximas (unirse/cancelar siguen accesibles sin la pantalla suelta)", () => {
    const html = Core.coursesMine.render({ role: "student" });
    expect(html).toContain(t("mb.upcomingTitle"));
    expect(html).toContain("data-mb-join=\"mb-1\"");
    expect(html).toContain("data-mb-cancel=\"mb-1\"");
  });

  it("el panel es reutilizable y NO una pantalla enrutable", () => {
    expect(typeof Bookings.renderBookings).toBe("function");
    expect(typeof Bookings.mountBookings).toBe("function");
    expect((Bookings as any).S?.myBookings).toBeUndefined();
  });

  it("un rol sin reservas (profesor) no rompe ni pinta la sección vacía", () => {
    delete (DB as any).myBookings;
    expect(() => Core.coursesMine.render({ role: "teacher" })).not.toThrow();
    expect(Core.coursesMine.render({ role: "teacher" })).not.toContain(t("mb.historyTitle"));
  });
});

/* ================= U4 · muere la pantalla "Mis reservas" ================= */
describe("U4 · la pantalla suelta Mis reservas desaparece", () => {
  it("la ruta 'my-bookings' ya no existe", () => {
    expect((ROUTES as any)["my-bookings"]).toBeUndefined();
  });

  it("el nav del alumno no la ofrece", () => {
    const shell = renderShell("course", ["Cursos"], "<div></div>", "student");
    expect(shell).not.toContain("my-bookings");
  });

  it("ningún builder deja un data-go huérfano a la ruta borrada", () => {
    // Los tres emisores que había: dashboard (scr-core), perfil de coach (scr-marketplace)
    // y la sala (scr-room, vía su enlace de vuelta).
    const htmls = [
      Core.dashboard.render({ role: "student" }),
      Core.coursesMine.render({ role: "student" }),
      Marketplace.marketplace.render({ role: "student" }),
    ];
    for (const html of htmls) expect(html).not.toContain("my-bookings");
  });

  it("el código fuente no conserva referencias a la ruta borrada", () => {
    const lib = join(process.cwd(), "app/lib");
    for (const f of ["scr-core.ts", "scr-marketplace.ts", "scr-room.ts", "shell.ts", "screens.ts"]) {
      expect(readFileSync(join(lib, f), "utf8"), `${f} sin 'my-bookings'`).not.toContain("my-bookings");
    }
  });
});

/* ================= U2 · Contenido/Calificaciones dentro del curso ================= */
describe("U2 · los tabs viven dentro del curso", () => {
  it("ofrece los dos tabs como cambio in-place, no como navegación a otra ruta", () => {
    const html = Core.coursesMine.render({ role: "student" });
    expect(html).toContain('data-course-tab="content"');
    expect(html).toContain('data-course-tab="grades"');
    expect(html).not.toContain("go('grades')"); // antes saltaba fuera de la pantalla
  });

  it("los tabs y su panel quedan DENTRO de la tarjeta del curso (.course-hero)", () => {
    const html = Core.coursesMine.render({ role: "student" });
    const hero = html.indexOf("course-hero");
    const tabs = html.indexOf('data-course-tab="content"');
    const cierre = html.indexOf("<!--/course-hero-->");
    expect(hero).toBeGreaterThanOrEqual(0);
    expect(cierre).toBeGreaterThan(tabs);
    expect(tabs).toBeGreaterThan(hero);
  });

  it("el tab Calificaciones pinta las notas SIN salir de Cursos", () => {
    win.__courseTab = "grades";
    const html = Core.coursesMine.render({ role: "student" });
    expect(html).toContain("Ensayo de refutación");
    expect(html).toContain("88");
    expect(html).toContain("B+");
    expect(html).toContain("Buen trabajo"); // el comentario del coach sigue visible
  });

  it("el tab por defecto es Contenido (los módulos del curso)", () => {
    const html = Core.coursesMine.render({ role: "student" });
    expect(html).toContain("El modelo ARE");
  });

  it("sin notas todavía, el tab Calificaciones muestra un vacío honesto y no rompe", () => {
    (DB as any).myGrades = { rows: [], avg: 0, submitted: 0, total: 0, best: 0 };
    win.__courseTab = "grades";
    expect(() => Core.coursesMine.render({ role: "student" })).not.toThrow();
    expect(Core.coursesMine.render({ role: "student" })).toContain(t("core.gradesEmpty"));
  });
});

/* ================= U1 · la tarjeta del curso, a la mitad ================= */
describe("U1 · la tarjeta del curso mide la mitad", () => {
  it("el banner del hero baja de 120px a la mitad o menos", () => {
    const css = readFileSync(join(process.cwd(), "app/styles/screens.css"), "utf8");
    const m = css.match(/\.course-hero\s+\.ch-banner\{[^}]*height:(\d+)px/);
    expect(m, "existe la regla de altura del banner").toBeTruthy();
    expect(Number(m![1])).toBeLessThanOrEqual(60);
  });
});

/* ================= U5 · Buscar clases: más grande y con thumbnail ================= */
describe("U5 · Buscar clases", () => {
  const CLASE = {
    id: "l-1", category: "ingles", title: "Inglés conversacional B2", description: "Clases dinámicas",
    priceCentsHour: 2000, language: "es", modality: "online",
    teacherId: "t-1", teacherName: "Saúl Martínez", verified: true, rating: 4.8, reviewCount: 12,
  };

  it("las filas traen cover de materia", () => {
    win.__listings = { loaded: true, loading: false, error: false, items: [CLASE], total: 1, category: "", q: "" };
    const html = Listings.listings.render({ role: "student" });
    expect(html).toContain("lst-cover");
    expect(html).toContain("Inglés conversacional B2");
  });

  it("los chips de materia son los grandes (chip--lg), no los chips base", () => {
    win.__listings = { loaded: true, loading: false, error: false, items: [], total: 0, category: "", q: "" };
    const html = Listings.listings.render({ role: "student" });
    expect(html).toContain("chip--lg");
    expect((html.match(/chip--lg/g) || []).length).toBeGreaterThanOrEqual(9); // "Todas" + 9 materias
  });

  it("existe el estilo del thumbnail y del chip grande", () => {
    const css = readFileSync(join(process.cwd(), "app/styles/screens.css"), "utf8")
      + readFileSync(join(process.cwd(), "app/styles/app.css"), "utf8");
    expect(css).toMatch(/\.lst-cover\{/);
    expect(css).toMatch(/\.chip--lg\{/);
  });

  it("el estado vacío y el de carga siguen sin romper", () => {
    win.__listings = { loaded: true, loading: false, error: false, items: [], total: 0, category: "ingles", q: "" };
    expect(() => Listings.listings.render({ role: "student" })).not.toThrow();
    win.__listings = { loaded: false, loading: true, error: false, items: [], total: 0, category: "", q: "" };
    expect(() => Listings.listings.render({ role: "student" })).not.toThrow();
  });
});
