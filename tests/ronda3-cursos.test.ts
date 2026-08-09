// [FE-TEST · RONDA3 · CURSOS] Segunda vuelta del mockup del cliente sobre la sección
// Cursos:
//   ① ARRIBA "Mis clases" es una LISTA (1 programa por fila) con stats de cabecera,
//      filtros Todas/En curso/Completadas y buscador — no una rejilla de cards.
//   ② ABAJO "Descubre nuevos cursos" por CATEGORÍAS ("como Preply"): tiles con conteo,
//      recomendados y el catálogo filtrable con el coach de cada curso visible.
//
// Lo que se blinda aquí es lo que puede MENTIR si se rompe:
//   · los CONTEOS (stats, chips de filtro, tiles de categoría) salen del dato REAL —
//     el catálogo se agrupa por su `format` derivado, no por una tabla escrita a mano;
//   · el botón de cada fila corresponde a su estado REAL (Continuar / Empezar / Repasar
//     / apagado si no hay clases publicadas);
//   · los filtros y el buscador FILTRAN de verdad (no son decorado);
//   · nada se inventa: sin torneos no hay tile de torneos, sin recomendables no hay
//     sección de recomendados, y una categoría sin cursos no pinta tile.
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
import { courseCategoryKey } from "../app/lib/queries";
import { t, getLang } from "../app/lib/i18n";

const Core: any = SCore;
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));
/** getLang() lee document.cookie; en Node el stub del test es la única fuente. */
const setLang = (l: string) => { (globalThis as any).document = { cookie: `otr_lang=${l}` }; };

/** PF-101: empezado (2 de 4 clases). LD-101: terminado. ORA-101: sin clases publicadas. */
const PF_MODULES = [
  { t: "Unidad 1", done: true, locked: false, items: [
    { id: "pf-1", t: "Bienvenida", type: "video", doneByMe: true, locked: false, dur: "8 min" },
    { id: "pf-2", t: "Qué es Public Forum", type: "lesson", doneByMe: true, locked: false, dur: "15 min" },
  ] },
  { t: "Unidad 2", done: false, locked: false, items: [
    { id: "pf-3", t: "Construye tu primer contention", type: "assign", doneByMe: false, locked: false, due: "Mañana · 23:59" },
    { id: "pf-4", t: "Evidencia creíble", type: "lesson", doneByMe: false, locked: false, dur: "16 min" },
  ] },
];
const LD_MODULES = [
  { t: "Unidad 1", done: true, locked: false, items: [
    { id: "ld-1", t: "Qué es Lincoln-Douglas", type: "video", doneByMe: true, locked: false, dur: "9 min" },
    { id: "ld-2", t: "El value", type: "lesson", doneByMe: true, locked: false, dur: "16 min" },
  ] },
];
const CATALOG = [
  { id: "c-pf", code: "PF-101", name: "Public Forum I", coach: "Saúl Méndez", color: "#F25623", price: 0,
    enrolled: true, format: "PF", modality: "online", category: "pf", summary: "Domina Public Forum.",
    rating: 4.8, reviewCount: 6, moduleCount: 3, lessonCount: 9, students: 8, welcomeVideoKind: "none", welcomeVideoSrc: "" },
  { id: "c-ld", code: "LD-101", name: "Lincoln-Douglas Foundations", coach: "Saúl Méndez", color: "#F25623", price: 0,
    enrolled: true, format: "LD", modality: "online", category: "ld", summary: "El debate de valores.",
    rating: null, reviewCount: 0, moduleCount: 2, lessonCount: 6, students: 3, welcomeVideoKind: "none", welcomeVideoSrc: "" },
  { id: "c-pa", code: "PARLI-101", name: "Parliamentary Essentials", coach: "Isabela Szabo", color: "#F25623", price: 0,
    enrolled: false, format: "Parli", modality: "híbrido", category: "parli", summary: "Piensa rápido.",
    rating: 4.5, reviewCount: 2, moduleCount: 0, lessonCount: 0, students: 2, welcomeVideoKind: "none", welcomeVideoSrc: "" },
  { id: "c-pol", code: "POL-101", name: "Policy Debate", coach: "Isabela Szabo", color: "#F25623", price: 0,
    enrolled: false, format: "Policy", modality: "online", category: "policy", summary: "Investigación pura.",
    rating: null, reviewCount: 0, moduleCount: 0, lessonCount: 0, students: 0, welcomeVideoKind: "none", welcomeVideoSrc: "" },
  { id: "c-ora", code: "ORA-101", name: "Oratoria &amp; Speaking", coach: "Saúl Méndez", color: "#C8401A", price: 0,
    enrolled: true, format: "Oratoria", modality: "presencial", category: "oratoria", summary: "Adueñate del escenario.",
    rating: null, reviewCount: 0, moduleCount: 0, lessonCount: 0, students: 4, welcomeVideoKind: "none", welcomeVideoSrc: "" },
];

function resetFixture() {
  for (const k of Object.keys(DB)) delete (DB as any)[k];
  Object.assign(DB, {
    me: { name: "Analía Reyes", initials: "AR", role: "student" },
    courses: [],
    coursesContent: [
      { id: "PF-101", dbId: "c-pf", code: "PF-101", name: "Public Forum I", coach: "Saúl Méndez",
        color: "#F25623", progress: 50, layout: "modules", format: "PF", modality: "online",
        summary: "Domina Public Forum.", modules: clone(PF_MODULES) },
      { id: "LD-101", dbId: "c-ld", code: "LD-101", name: "Lincoln-Douglas Foundations", coach: "Saúl Méndez",
        color: "#F25623", progress: 100, layout: "modules", format: "LD", modality: "online",
        summary: "El debate de valores.", modules: clone(LD_MODULES) },
      { id: "ORA-101", dbId: "c-ora", code: "ORA-101", name: "Oratoria &amp; Speaking", coach: "Saúl Méndez",
        color: "#C8401A", progress: 0, layout: "modules", format: "Oratoria", modality: "presencial",
        summary: "Adueñate del escenario.", modules: [] },
    ],
    courseModules: clone(PF_MODULES),
    catalog: clone(CATALOG),
    tournaments: [{ id: "t-1", name: "Copa OTR" }, { id: "t-2", name: "Nacional RD" }, { id: "t-3", name: "Invitational" }],
    myGrades: { rows: [], avg: 0, submitted: 0, total: 0, best: 0 },
    myBookings: [],
    events: [], activity: [], notifications: [], messages: [], badges: [], levels: [], skills: [],
    marketplace: { viewer: { ageBand: null }, coaches: [] },
  });
  for (const k of Object.keys(win)) if (k.startsWith("__")) delete win[k];
  win.DB = DB;
  setLang("es");
}
beforeEach(resetFixture);

const mine = () => Core.coursesMine.render({ role: "student" });
const findNew = () => Core.coursesCatalog.render({ role: "student" });
/** Trozo de HTML de una fila concreta de la lista (para no leer la de al lado). */
function rowOf(html: string, name: string) {
  const rows = html.split('<div class="cls-row fade-up');
  const hit = rows.find((r) => r.includes(name));
  return hit ? hit.slice(0, hit.indexOf("cls-row-act") + 900) : "";
}

/* ============ ① Cabecera: los números son los reales ============ */
describe("① Cabecera de 'Mis clases'", () => {
  it("lleva título y los DOS stats del mockup, SIN eyebrow encima", () => {
    const html = mine();
    // [R3 · Isaac] "Tu formación" desapareció: el h1 abre la cabecera.
    expect(html).not.toContain("ph-eyebrow");
    expect(html).toContain(t("core.clsMenuTitle"));
    expect(html).toContain(t("core.clsStatPrograms"));
    expect(html).toContain(t("core.clsStatAvg"));
  });

  it("el nº de programas y el progreso medio se CALCULAN del dato (3 y 50%)", () => {
    const html = mine();
    // 3 programas inscritos; media de 50 + 100 + 0 = 50%.
    expect(html).toContain('<span class="si-n">3</span>');
    expect(html).toContain('<span class="si-n">50%</span>');
  });

  it("con un solo programa el promedio es el suyo (no una media inventada)", () => {
    (DB as any).coursesContent = [(DB as any).coursesContent[1]]; // LD al 100%
    expect(mine()).toContain('<span class="si-n">100%</span>');
  });
});

/* ============ ② Filtros: cuentan y filtran de verdad ============ */
describe("② Filtros Todas / En curso / Completadas", () => {
  it("cada chip muestra su conteo REAL (3 · 2 · 1)", () => {
    const html = mine();
    expect(html).toContain(`${t("core.clsFilterAll")} <span class="n tnum">(3)</span>`);
    expect(html).toContain(`${t("core.clsFilterActive")} <span class="n tnum">(2)</span>`);
    expect(html).toContain(`${t("core.clsFilterDone")} <span class="n tnum">(1)</span>`);
  });

  it("'Completadas' deja SOLO el curso terminado", () => {
    win.__clsFilter = "done";
    const html = mine();
    expect(html).toContain("Lincoln-Douglas Foundations");
    expect(html).not.toContain(">Public Forum I<");
    expect((html.match(/class="cls-row fade-up/g) || []).length).toBe(1);
  });

  it("'En curso' saca al terminado y deja los otros dos", () => {
    win.__clsFilter = "active";
    const html = mine();
    expect(html).not.toContain(">Lincoln-Douglas Foundations<");
    expect((html.match(/class="cls-row fade-up/g) || []).length).toBe(2);
  });

  it("el chip activo se marca (aria-pressed) para no depender solo del color", () => {
    win.__clsFilter = "done";
    expect(mine()).toContain('data-cls-filter="done" aria-pressed="true"');
  });

  it("los conteos NO cambian al filtrar: se cuentan sobre el total", () => {
    win.__clsFilter = "done";
    expect(mine()).toContain(`${t("core.clsFilterAll")} <span class="n tnum">(3)</span>`);
  });
});

/* ============ ③ Buscador ============ */
describe("③ Buscador de programa", () => {
  it("busca por nombre y deja una sola fila", () => {
    win.__clsQ = "lincoln";
    const html = mine();
    expect((html.match(/class="cls-row fade-up/g) || []).length).toBe(1);
    expect(html).toContain("Lincoln-Douglas Foundations");
  });

  it("también busca por coach y por código", () => {
    win.__clsQ = "ORA-101";
    expect(mine()).toContain("Oratoria &amp; Speaking");
    expect((mine().match(/class="cls-row fade-up/g) || []).length).toBe(1);
    win.__clsQ = "saúl";
    expect((mine().match(/class="cls-row fade-up/g) || []).length).toBe(3);
  });

  it("sin coincidencias muestra un vacío HONESTO con salida, no una lista en blanco", () => {
    win.__clsQ = "zzzz";
    const html = mine();
    expect(html).toContain(t("core.clsNoMatchTitle"));
    expect(html).toContain(t("core.clsClearFilters"));
    expect(html).toContain("data-cls-clear");
    expect(html).not.toContain('class="cls-row fade-up');
  });

  it("el texto buscado vuelve al input (no se pierde al repintar)", () => {
    win.__clsQ = "lincoln";
    expect(mine()).toContain('id="cls-q" type="search" class="cls-search-in" value="lincoln"');
  });
});

/* ============ ④ El botón de la fila dice la verdad del estado ============ */
describe("④ Botón por estado del programa", () => {
  it("empezado → 'Continuar' en naranja", () => {
    const row = rowOf(mine(), "Public Forum I");
    expect(row).toContain(t("core.continue"));
    expect(row).toContain("btn btn-accent");
  });

  it("terminado → 'Repasar' en contorno, chip COMPLETADO y certificado disponible", () => {
    const row = rowOf(mine(), "Lincoln-Douglas Foundations");
    expect(row).toContain(t("core.clsReview"));
    expect(row).toContain("btn btn-outline");
    expect(row).toContain(t("core.clsChipDone"));
    expect(row).toContain(t("core.clsCertReady"));
  });

  it("inscrito y sin empezar → 'Empezar' en negro", () => {
    (DB as any).coursesContent[0].modules.forEach((m: any) => m.items.forEach((i: any) => { i.doneByMe = false; }));
    (DB as any).coursesContent[0].progress = 0;
    const row = rowOf(mine(), "Public Forum I");
    expect(row).toContain(t("core.clsStart"));
    expect(row).toContain("btn btn-primary");
  });

  it("sin clases publicadas el botón queda APAGADO (no promete lo que no hay)", () => {
    const row = rowOf(mine(), "Oratoria");
    expect(row).toContain("disabled");
    expect(row).toContain('aria-disabled="true"');
    expect(row).toContain(t("core.clsNoContentYet"));
    expect(row).not.toContain("btn btn-accent");
  });

  it("todos los botones abren el ADENTRO de SU curso", () => {
    const html = mine();
    for (const code of ["PF-101", "LD-101"]) expect(html).toContain(`data-cls-open="${code}"`);
  });

  it("con una reserva CONFIRMADA de hoy del coach, la fila anuncia la clase de hoy", () => {
    const d = new Date(); d.setHours(18, 0, 0, 0);
    (DB as any).myBookings = [{
      id: "mb-1", status: "CONFIRMED", coachName: "Saúl Méndez", slotAtIso: d.toISOString(),
      durationMin: 90, upcoming: true, videoUrl: "/aula?room=mb-1",
    }];
    expect(rowOf(mine(), "Public Forum I")).toContain(t("core.clsTodayAt").split(" · ")[0]);
  });
});

/* ============ ⑤ Tiles de categoría con CONTEO REAL ============ */
describe("⑤ 'Descubre nuevos cursos' por categorías", () => {
  it("la sección cuelga de 'Mis clases' con su título y su salida al catálogo", () => {
    const html = mine();
    expect(html).toContain(t("core.discoverTitle"));
    expect(html).toContain(t("core.discoverAllCta"));
    expect(html).toContain('data-courses-tab="catalog"');
  });

  it("pinta una tile por categoría PRESENTE, con el nº real de cursos", () => {
    const html = mine();
    for (const [k, label] of [["pf", t("core.catPf")], ["ld", t("core.catLd")], ["parli", t("core.catParli")],
      ["policy", t("core.catPolicy")], ["oratoria", t("core.catOratoria")]] as const) {
      expect(html, `tile ${k}`).toContain(`data-cat="${k}"`);
      expect(html).toContain(label);
    }
    // 5 cursos, uno por categoría → cada tile dice "1 curso" y "Todas" dice "5 cursos".
    expect(html).toContain(t("core.catCountMany").replace("{n}", "5"));
    expect((html.match(new RegExp(t("core.catCountOne"), "g")) || []).length).toBe(5);
  });

  it("una categoría SIN cursos no pinta tile (nada inventado)", () => {
    (DB as any).catalog = (DB as any).catalog.filter((c: any) => c.category !== "policy");
    const html = mine();
    expect(html).not.toContain('data-cat="policy"');
    expect(html).toContain('data-cat="pf"');
  });

  it("los conteos se agrupan de verdad: dos cursos de la misma categoría suman 2", () => {
    (DB as any).catalog[3].category = "pf"; // Policy pasa a Public Forum
    const html = mine();
    const from = html.indexOf('data-cat="pf"');
    const tile = html.slice(from, html.indexOf("</button>", from));
    expect(tile).toContain(t("core.catCountMany").replace("{n}", "2"));
    expect(html).not.toContain('data-cat="policy"');
  });

  it("la tile de torneos usa el nº REAL de torneos y no es una categoría de curso", () => {
    const html = mine();
    expect(html).toContain(t("core.catTournaments"));
    expect(html).toContain(t("core.catEventsMany").replace("{n}", "3"));
    expect(html).toContain('data-go="events"');
  });

  it("sin torneos, la tile de torneos NO se pinta", () => {
    (DB as any).tournaments = [];
    expect(mine()).not.toContain(t("core.catTournaments"));
  });

  it("sin catálogo, la tira entera desaparece de 'Mis clases'", () => {
    (DB as any).catalog = [];
    expect(mine()).not.toContain(t("core.discoverTitle"));
  });
});

/* ============ ⑥ El sub-tab 'Find new' es el catálogo POR CATEGORÍAS ============ */
describe("⑥ Sub-tab 'Buscar nuevos'", () => {
  it("es el catálogo por categorías, no la rejilla plana de antes", () => {
    const html = findNew();
    expect(html).toContain(t("core.discoverTitle"));
    expect(html).toContain("cat-tiles");
    expect(html).toContain("cat-grid");
    expect(html).not.toContain("course-card"); // la card vieja del catálogo
  });

  it("sin filtro muestra el catálogo completo y lo dice con su conteo", () => {
    const html = findNew();
    expect((html.match(/class="cat-card fade-up/g) || []).length).toBe(5);
    expect(html).toContain(t("core.catalogCount").replace("{n}", "5").replace("{total}", "5"));
  });

  it("con una categoría activa filtra el catálogo y titula con ella", () => {
    win.__catCat = "parli";
    const html = findNew();
    const grid = html.slice(html.indexOf('class="cat-grid"'));
    expect((html.match(/class="cat-card fade-up/g) || []).length).toBe(1);
    expect(grid).toContain("Parliamentary Essentials");
    expect(grid).not.toContain("Policy Debate");
    expect(html).toContain(t("core.catalogCount").replace("{n}", "1").replace("{total}", "5"));
    expect(html).toContain('class="cat-tile is-on"');
  });

  it("una categoría vacía no rompe: vacío honesto con salida a 'Todas'", () => {
    win.__catCat = "policy";
    (DB as any).catalog = (DB as any).catalog.filter((c: any) => c.category !== "policy");
    const html = findNew();
    expect(html).toContain(t("core.catalogEmpty"));
    expect(html).toContain('data-cat=""');
  });

  it("CADA ficha del catálogo enseña su COACH (el cliente pidió ver los profes)", () => {
    const html = findNew();
    expect((html.match(/cat-card-coachn/g) || []).length).toBe(5);
    expect(html).toContain("Saúl Méndez");
    expect(html).toContain("Isabela Szabo");
  });

  it("la ficha ofrece inscribirse de VERDAD (data-enroll) y no repite si ya estás", () => {
    const html = findNew();
    expect(html).toContain('data-enroll="c-pa"');
    expect(html).toContain('data-enroll="c-pol"');
    expect(html).not.toContain('data-enroll="c-pf"'); // ya inscrita
    expect(html).toContain(t("core.catalogEnrolled"));
  });

  it("la meta solo dice lo que EXISTE (sin módulos, no inventa '0 módulos')", () => {
    const html = findNew();
    expect(html).toContain(t("core.metaModulesMany").replace("{n}", "3"));
    expect(html).toContain(t("core.metaClassesMany").replace("{n}", "9"));
    expect(html).not.toContain(t("core.metaModulesMany").replace("{n}", "0"));
  });
});

/* ============ ⑦ Recomendados: solo lo que aún no cursas ============ */
describe("⑦ Recomendado para ti", () => {
  it("recomienda SOLO programas en los que no estás inscrita", () => {
    const html = mine();
    const reco = html.slice(html.indexOf("reco-grid"));
    expect(reco).toContain("Parliamentary Essentials");
    expect(reco).toContain("Policy Debate");
    expect(reco.slice(0, reco.indexOf("cls-") + 1 || undefined)).not.toContain("Public Forum I");
    expect((html.match(/class="reco-card fade-up/g) || []).length).toBe(2);
  });

  it("estando en todos los programas, la sección NO se pinta", () => {
    (DB as any).catalog.forEach((c: any) => { c.enrolled = true; });
    expect(mine()).not.toContain(t("core.discoverRecoTitle"));
  });

  it("el chip sale de un dato real: 'Popular' al más inscrito de los recomendados", () => {
    const html = mine();
    const parli = html.slice(html.indexOf("PARLI-101"), html.indexOf("POL-101"));
    expect(parli).toContain(t("core.chipPopular"));   // 2 alumnos vs 0 de Policy
    const policy = html.slice(html.indexOf("POL-101"));
    expect(policy).toContain(t("core.chipCompetition"));
  });

  it("sin alumnos inscritos en ninguno, nadie es 'Popular'", () => {
    (DB as any).catalog.forEach((c: any) => { c.students = 0; });
    expect(mine()).not.toContain(t("core.chipPopular"));
  });
});

/* ============ ⑧ La categoría se DERIVA del formato (no existe en el modelo) ============ */
describe("⑧ courseCategoryKey", () => {
  it("mapea los formatos reales del catálogo OTR", () => {
    expect(courseCategoryKey("PF", "PF-101")).toBe("pf");
    expect(courseCategoryKey("LD", "LD-101")).toBe("ld");
    expect(courseCategoryKey("Parli", "PARLI-101")).toBe("parli");
    expect(courseCategoryKey("Policy", "POL-101")).toBe("policy");
    expect(courseCategoryKey("Oratoria", "ORA-101")).toBe("oratoria");
  });

  it("tolera mayúsculas, acentos y nombres largos", () => {
    expect(courseCategoryKey("public forum", "")).toBe("pf");
    expect(courseCategoryKey("ORATORÍA", "")).toBe("oratoria");
    expect(courseCategoryKey("British Parliamentary", "")).toBe("parli");
  });

  it("sin formato cae al código del curso", () => {
    expect(courseCategoryKey("", "LD-201")).toBe("ld");
    expect(courseCategoryKey(null, "ORA-202")).toBe("oratoria");
  });

  it("lo desconocido va a 'other' — no se fuerza dentro de una categoría ajena", () => {
    expect(courseCategoryKey("Ajedrez", "AJZ-1")).toBe("other");
    expect(courseCategoryKey(null, null)).toBe("other");
  });
});

/* ============ ⑨ ES + EN ============ */
describe("⑨ Bilingüe", () => {
  it("en inglés no queda ni un texto nuevo en español", () => {
    setLang("en");
    try {
      const html = mine() + findNew();
      expect(getLang()).toBe("en");
      for (const es of ["Mis clases", "Completadas", "Buscar programa", "Descubre nuevos cursos",
        "Recomendado para ti", "Torneos y liga", "Inscribirme", "Certificado disponible", "Repasar"]) {
        expect(html, `"${es}" no debería aparecer en EN`).not.toContain(es);
      }
      for (const en of ["My classes", "Completed", "Search program", "Discover new courses",
        "Recommended for you", "Tournaments & league", "Enroll"]) {
        expect(html, `falta "${en}"`).toContain(en);
      }
    } finally { setLang("es"); }
  });
});

/* ============ ⑩ AA y CSS: el bloque propio respeta la paleta ============ */
describe("⑩ Accesibilidad del bloque RONDA3", () => {
  const css = readFileSync(join(process.cwd(), "app/styles/screens.css"), "utf8");
  const bloque = css.slice(css.indexOf("RONDA3 · CURSOS PREPLY (Isaac)"));
  const reglas = bloque.slice(bloque.indexOf("*/") + 2).replace(/\/\*[\s\S]*?\*\//g, "");

  it("sobre naranja el texto/glifo va en negro (--text-on-accent), nunca en blanco", () => {
    const r = bloque.slice(bloque.indexOf(".cat-tile.is-on .cat-tile-ic{"));
    expect(r.slice(0, 140)).toContain("var(--text-on-accent)");
  });

  it("el naranja en texto pequeño es el accesible (--otr-green-text)", () => {
    const r = bloque.slice(bloque.indexOf(".cls-row-hot{"), bloque.indexOf(".cls-row-hot{") + 200);
    expect(r).toContain("var(--otr-green-text)");
  });

  it("sobre el negro de la tile activa el label sube a --ink-300", () => {
    const r = bloque.slice(bloque.indexOf(".cat-tile.is-on .cat-tile-c{"));
    expect(r.slice(0, 90)).toContain("var(--ink-300)");
  });

  it("el gris #808080 del mockup no entra como color", () => {
    expect(reglas.toLowerCase()).not.toContain("#808080");
  });

  it("en móvil la tabla se convierte en tarjetas apiladas (nada se corta)", () => {
    expect(reglas).toContain("@media (max-width:860px)");
    const m = reglas.slice(reglas.indexOf("@media (max-width:860px)"));
    expect(m.slice(0, 700)).toContain(".cls-list-head{display:none}");
  });

  it("existen los estilos de la lista y del catálogo por categorías", () => {
    for (const sel of [".cls-list{", ".cls-row{", ".cls-fchip{", ".cls-search-in{",
      ".cat-tiles{", ".cat-tile{", ".reco-card{", ".cat-card{"]) {
      expect(reglas, `falta ${sel}`).toContain(sel);
    }
  });
});

/* ============ ⑪ Lo que NO debía cambiar sigue igual ============ */
describe("⑪ La pantalla vecina no se toca", () => {
  it("el 'adentro' de la clase conserva hero, rail y sus dos tabs", () => {
    win.__course = "PF-101";
    const html = Core.courseDetail.render({ role: "student" });
    expect(html).toContain("cls-hero");
    expect(html).toContain("cls-rail");
    expect(html).toContain('data-course-tab="content"');
    expect(html).toContain('data-course-tab="grades"');
  });

  it("la lista NO pinta el adentro y el adentro NO pinta la lista", () => {
    expect(mine()).not.toContain('class="cls-in"');
    win.__course = "PF-101";
    expect(Core.courseDetail.render({ role: "student" })).not.toContain("cls-list-head");
  });
});
