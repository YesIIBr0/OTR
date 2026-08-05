// [FE-TEST · A/C] Dos cambios de shell pedidos sobre capturas:
//   A · el sidebar se puede PLEGAR (el modo .app.mini existía en CSS pero sin interruptor,
//       así que esos ~220px de ancho no se podían recuperar nunca);
//   C · el dashboard abre con "Bienvenido, <nombre>" y la acción siguiente baja a ser una
//       tarjeta más — antes la franja negra se comía la primera pantalla.
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
import { renderShell, SIDEBAR_MINI_KEY } from "../app/lib/shell";
import { S as SCore } from "../app/lib/scr-core";
import { t } from "../app/lib/i18n";

const Core: any = SCore;

beforeEach(() => {
  for (const k of Object.keys(DB)) delete (DB as any)[k];
  Object.assign(DB, {
    me: { name: "Isaac Peshach", initials: "IP", role: "student", level: "OTR Competitor", streak: 3, lifecycle: "returning" },
    courses: [{ id: "c1", code: "PF-FUND-2026", name: "Fundamentos de Public Forum", coach: "Isaac", color: "#2CAA20", progress: 0, due: 0 }],
    courseModules: [{ t: "M1", items: [{ id: "l-1", t: "¿Qué es Public Forum?", type: "video", doneByMe: false, locked: false }] }],
    coursesContent: [], catalog: [], skills: [], badges: [], events: [], activity: [],
    notifications: [], messages: [], levels: [], myBookings: [],
    debateRank: { rating: 1500, tier: "Novato", provisional: true },
  });
  for (const k of Object.keys(win)) if (k.startsWith("__")) delete win[k];
});

/* ================= A · plegar el sidebar ================= */
describe("A · el sidebar se puede plegar", () => {
  it("la cabecera trae el interruptor, con etiqueta accesible", () => {
    const html = renderShell("dashboard", ["Inicio"], "<div></div>", "student");
    expect(html).toContain("data-sidebar-toggle");
    expect(html).toContain(`aria-label="${t("nav.collapse", "es")}"`);
  });

  it("el modo compacto ya tenía estilos: el interruptor solo enciende .app.mini", () => {
    const css = readFileSync(join(process.cwd(), "app/styles/app.css"), "utf8");
    expect(css).toMatch(/\.app\.mini\{/);
    expect(css).toMatch(/\.sb-collapse\{/);
    // Plegado, el sidebar esconde etiquetas pero conserva los iconos (sigue navegable).
    expect(css).toContain(".app.mini .sb-item .lbl");
  });

  it("recuerda el estado plegado entre navegaciones", () => {
    const store: Record<string, string> = {};
    (globalThis as any).localStorage = {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => { store[k] = v; },
    };
    expect(renderShell("dashboard", ["Inicio"], "", "student")).not.toContain('class="app mini"');
    store[SIDEBAR_MINI_KEY] = "1";
    expect(renderShell("dashboard", ["Inicio"], "", "student")).toContain('class="app mini"');
    delete (globalThis as any).localStorage;
  });
});

/* ================= C · dashboard ================= */
describe("C · el dashboard abre con el saludo", () => {
  it("arriba va 'Bienvenido, <nombre>' como título de página", () => {
    const html = Core.dashboard.render({ role: "student" });
    expect(html).toContain(`${t("core.welcomeGreeting")}, Isaac`);
    const titulo = html.indexOf("page-title");
    const kpis = html.indexOf("core.kpiTotalXp") >= 0 ? html.indexOf("core.kpiTotalXp") : html.indexOf("XP");
    expect(titulo).toBeGreaterThanOrEqual(0);
    expect(titulo).toBeLessThan(kpis); // el saludo abre la pantalla
  });

  it("la franja negra ya NO es lo primero: baja bajo los KPIs", () => {
    const html = Core.dashboard.render({ role: "student" });
    const saludo = html.indexOf("page-title");
    const hero = html.indexOf("hello-card");
    expect(hero).toBeGreaterThan(saludo);
    // Y queda dentro de la rejilla de contenido, no suelta arriba.
    expect(html.indexOf("split")).toBeLessThan(hero);
  });

  it("la acción siguiente NO se pierde: conserva su CTA con el destino real", () => {
    const html = Core.dashboard.render({ role: "student" });
    expect(html).toContain(t("core.naResumeCta"));      // "Continuar lección"
    expect(html).toContain("window.__lesson='l-1'");    // el CTA sigue llevando a la lección
  });

  it("la racha y el nivel siguen visibles arriba", () => {
    const html = Core.dashboard.render({ role: "student" });
    const saludo = html.slice(0, html.indexOf("hello-card"));
    expect(saludo).toContain(t("core.streakDays"));
    expect(saludo).toContain("OTR Competitor");
  });
});
