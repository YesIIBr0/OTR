// [FE-TEST · RONDA3] Vista LARGA de "Lo mejor de la temporada" (scr-highlights.ts).
//
// Lo que se blinda aquí es exactamente lo que el cliente pidió y lo que puede MENTIR si se rompe:
//   ① UNA fila por logro (no la rejilla de 4 del dashboard) — «un view largo de solo 1 por fila».
//   ② cada fila enlaza a SU publicación de Instagram, en pestaña nueva y con rel de seguridad;
//      sin enlace la fila NO navega (no se pinta un <a> muerto).
//   ③ "Ver todos" tiene destino propio: la ruta 'highlights' existe y NO es la de Eventos.
//   ④ el staff (coach/admin) ve crear/editar/eliminar; la alumna NO ve ningún control.
//   ⑤ nada se inventa: sin logros, estado vacío digno; sin foto, la fila degrada.
//   ⑥ escape: el texto de catálogo (que queries.ts NO escapa) se escapa al pintar.
//
// Los builders son módulos "@ts-nocheck" que solo arman strings de HTML → se prueban en Node
// con un stub de window (mismo patrón que ronda2-clases.test.ts).
import { describe, it, expect, beforeEach } from "vitest";

/* eslint-disable @typescript-eslint/no-explicit-any */
(globalThis as any).window = (globalThis as any).window || {};
const win: any = (globalThis as any).window;
win.api = async () => ({});
win.go = () => {};
win.toast = () => {};
win.otrFormModal = () => {};

import { DB } from "../app/lib/data";
import { S as SHighlights } from "../app/lib/scr-highlights";
import { S as SExtra } from "../app/lib/scr-extra";
import { ROUTES } from "../app/lib/screens";
import { t } from "../app/lib/i18n";

const Hl: any = SHighlights;
const Extra: any = SExtra;
const IG = "https://www.instagram.com/p/ABC123/";

const HIGHLIGHTS = [
  { id: "h1", title: "Harvard Forensics & Debate — Junior Varsity Champions", dateLabel: "7 jul", category: "Final", imageUrl: "/img/hero-speaking.jpg", instagramUrl: IG },
  { id: "h2", title: "Florida Blue Key — Octofinales Varsity", dateLabel: "15 jul", category: "Torneo", imageUrl: "/img/hero-speaking.jpg", instagramUrl: "" },
  { id: "h3", title: "St. Michael's — Co-Campeones", dateLabel: "", category: "Equipo", imageUrl: "", instagramUrl: IG },
];

function setRole(role: string) {
  (DB as any).me = { name: "Quien mira", initials: "QM", role };
}
function reset(role = "student", items: unknown[] = HIGHLIGHTS) {
  for (const k of Object.keys(DB)) delete (DB as any)[k];
  setRole(role);
  (DB as any).highlights = JSON.parse(JSON.stringify(items));
}
const render = () => Hl.highlights.render({ role: String((DB as any).me?.role || "student") });

beforeEach(() => reset());

/* ================= ① una fila por logro ================= */
describe("① la vista larga es de UNA fila por logro", () => {
  it("pinta tantas filas como logros y NINGUNA rejilla de 4 (esa es la vista previa del dashboard)", () => {
    const html = render();
    expect((html.match(/class="hlv-row/g) || []).length).toBe(HIGHLIGHTS.length);
    expect(html).toContain('class="hlv-list"');
    expect(html).not.toContain("hl-grid"); // la rejilla de 4 vive SOLO en el dashboard
  });

  it("cada fila lleva foto, chip de categoría, título grande y fecha", () => {
    const html = render();
    expect(html).toContain("hlv-media");
    expect(html).toContain("background-image:url('/img/hero-speaking.jpg')");
    expect(html).toContain(t("hl.catFinal"));
    expect(html).toContain("hlv-t");
    expect(html).toContain("7 jul");
  });

  it("sin foto la fila degrada a tarjeta negra (no deja hueco roto ni inventa ruta)", () => {
    const html = render();
    expect(html).toContain("hlv-media--empty");
  });

  it("no muestra fecha cuando el logro no la tiene documentada", () => {
    reset("student", [HIGHLIGHTS[2]]);
    const html = render();
    expect(html).not.toContain("hlv-date");
  });
});

/* ================= ② el enlace a Instagram ================= */
describe("② cada publicación enlaza a su post de Instagram", () => {
  it("la fila con enlace es un <a> a Instagram, en pestaña nueva y con rel de seguridad", () => {
    const html = render();
    expect(html).toContain(`<a class="hlv-link" href="${IG}" target="_blank" rel="noopener noreferrer">`);
    expect(html).toContain(t("hl.openIg"));
  });

  it("la fila SIN enlace no navega: ni <a> ni href, y lo dice", () => {
    reset("student", [HIGHLIGHTS[1]]);
    const html = render();
    expect(html).not.toContain("<a class=\"hlv-link\"");
    expect(html).toContain("hlv-link--off");
    expect(html).toContain(t("hl.noLink"));
  });

  it("un enlace que no es https (javascript:) NUNCA sale como href", () => {
    reset("student", [{ ...HIGHLIGHTS[0], instagramUrl: "javascript:alert(1)" }]);
    const html = render();
    expect(html).not.toContain("javascript:");
    expect(html).toContain("hlv-link--off");
  });
});

/* ================= ③ "Ver todos" tiene destino propio ================= */
describe("③ la ruta de la vista larga existe y NO es Eventos", () => {
  it("ROUTES.highlights apunta a la pantalla highlights, colgada de Inicio", () => {
    expect(ROUTES.highlights).toBeTruthy();
    expect(ROUTES.highlights.screen).toBe("highlights");
    expect(ROUTES.highlights.nav).toBe("dashboard");
    expect(ROUTES.highlights.screen).not.toBe("events");
    expect(ROUTES.highlights.role).toBeUndefined(); // la ve todo el mundo
  });

  it("la pantalla ofrece la vuelta al dashboard", () => {
    const html = render();
    expect(html).toContain('data-go="dashboard"');
    expect(html).toContain(t("hl.back"));
  });

  it("usa la cabecera del kit (page-head--rule)", () => {
    expect(render()).toContain("page-head page-head--rule");
  });
});

/* ================= ④ gestión solo para el staff ================= */
describe("④ crear/editar/eliminar es SOLO del staff", () => {
  it("la alumna no ve ningún control de gestión", () => {
    const html = render();
    expect(html).not.toContain("data-hl-new");
    expect(html).not.toContain("data-hl-edit");
    expect(html).not.toContain("data-hl-del");
    expect(html).not.toContain("hlv-admin");
  });

  for (const role of ["teacher", "admin"]) {
    it(`el ${role} ve alta y, por fila, editar y eliminar`, () => {
      reset(role);
      const html = render();
      expect(html).toContain('data-hl-new="1"');
      expect(html).toContain(t("hl.newBtn"));
      expect((html.match(/data-hl-edit=/g) || []).length).toBe(HIGHLIGHTS.length);
      expect((html.match(/data-hl-del=/g) || []).length).toBe(HIGHLIGHTS.length);
    });
  }

  it("los botones del staff van FUERA del ancla (nunca un <button> dentro de un <a>)", () => {
    reset("teacher", [HIGHLIGHTS[0]]);
    const html = render();
    const anchor = html.slice(html.indexOf("<a class=\"hlv-link\""), html.indexOf("</a>"));
    expect(anchor).not.toContain("<button");
    expect(anchor).not.toContain("data-hl-edit");
  });

  it('el portal del coach ("Mis cursos") lleva a la pantalla de logros', () => {
    reset("teacher");
    (DB as any).teacherCourses = [];
    const html = Extra.manage.render({ role: "teacher" });
    expect(html).toContain('data-go="highlights"');
    expect(html).toContain(t("hl.manageBtn"));
  });

  it("la cara de ADMIN de esa misma pantalla también lo lleva", () => {
    reset("admin");
    (DB as any).adminCourses = [];
    const html = Extra.manage.render({ role: "admin" });
    expect(html).toContain('data-go="highlights"');
  });
});

/* ================= ⑤ estado vacío ================= */
describe("⑤ sin logros, estado vacío digno", () => {
  it("la alumna ve el vacío explicado, sin filas ni controles", () => {
    reset("student", []);
    const html = render();
    expect(html).toContain(t("hl.emptyTitle"));
    expect(html).toContain(t("hl.emptyBody"));
    expect(html).not.toContain("hlv-row");
    expect(html).not.toContain("data-hl-new");
  });

  it("el coach ve el vacío CON el atajo para publicar el primero", () => {
    reset("teacher", []);
    const html = render();
    expect(html).toContain(t("hl.emptyTitle"));
    expect(html).toContain('data-hl-new="1"');
  });

  it("no explota si DB.highlights no viene en el payload", () => {
    reset("student", []);
    delete (DB as any).highlights;
    expect(() => render()).not.toThrow();
    expect(render()).toContain(t("hl.emptyTitle"));
  });
});

/* ================= ⑥ escape + i18n ================= */
describe("⑥ contrato de escape e i18n ES↔EN", () => {
  it("el texto de catálogo (SIN escapar en el payload) se escapa al pintar", () => {
    reset("student", [{ ...HIGHLIGHTS[0], title: '<img src=x onerror=alert(1)> "OTR" & Co', category: "<b>Final</b>" }]);
    const html = render();
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;img src=x");
    expect(html).toContain("&amp;");
    expect(html).not.toContain("<b>Final</b>");
  });

  it("el ampersand del título de Harvard sale UNA sola vez escapado (sin &amp;amp;)", () => {
    const html = render();
    expect(html).toContain("Harvard Forensics &amp; Debate");
    expect(html).not.toContain("&amp;amp;");
  });

  it("todo el texto nuevo tiene EN propio (nada cae al español)", () => {
    const keys = ["hl.title", "hl.subtitle", "hl.back", "hl.openIg", "hl.noLink", "hl.emptyTitle",
      "hl.emptyBody", "hl.newBtn", "hl.editBtn", "hl.deleteBtn", "hl.createTitle", "hl.editTitle",
      "hl.fieldTitle", "hl.fieldDate", "hl.fieldImage", "hl.fieldInstagram", "hl.manageBtn"];
    for (const k of keys) {
      expect(t(k, "en"), `${k} sin traducción`).not.toBe(k);
      expect(t(k, "en"), `${k} cae al español`).not.toBe(t(k, "es"));
    }
    expect(t("hl.title", "en")).toBe("Best of the season");
    expect(t("hl.title", "es")).toBe("Lo mejor de la temporada");
  });

  it("una categoría desconocida se pinta cruda (escapada), no traducida a la fuerza", () => {
    reset("student", [{ ...HIGHLIGHTS[0], category: "Beca" }]);
    const html = render();
    expect(html).toContain("Beca");
    expect(html).not.toContain("hl.catBeca");
  });
});
