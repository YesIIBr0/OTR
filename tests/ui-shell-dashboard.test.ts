// [FE-TEST · A/C] Dos cambios de shell:
//   A · [MOCKUP T2, 2026-08-07] el sidebar DESAPARECE: la navegación es una top-nav
//       horizontal de 62px (antes esta sección cubría el interruptor de plegado del
//       sidebar, que murió con él);
//   C · [MOCKUP T4, 2026-08-07] el dashboard se reconstruye contra el mockup: cabecera
//       con la fecha + "Hola, <nombre>" + stats, hero negro de la próxima clase y rail
//       derecho (rango + logros). Las secciones sin dato real NO se pintan.
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

/* ================= A · top-nav horizontal (adiós sidebar) ================= */
describe("A · la navegación vive en una top-nav horizontal", () => {
  it("el shell ya no pinta sidebar: ni aside, ni interruptor de plegado", () => {
    const html = renderShell("dashboard", ["Inicio"], "<div></div>", "student");
    expect(html).not.toContain("<aside");
    expect(html).not.toContain("data-sidebar-toggle");
    expect(html).not.toContain("data-nav-toggle");
    expect(html).toContain('<header class="topnav">');
  });

  it("la barra trae escudo + wordmark 'Aula', links de nav y el bloque derecho", () => {
    const html = renderShell("dashboard", ["Inicio"], "<div></div>", "student");
    expect(html).toContain('class="tn-word">Aula<');
    expect(html).toContain('class="tn-links"');
    expect(html).toContain('id="bell"');                       // campana (mismo id: mismo handler)
    expect(html).toContain("data-user-menu");                  // chip de usuario
    expect(html).toContain('id="sb-usermenu"');
  });

  it("el ítem activo se marca en el link horizontal (aria-current + .active)", () => {
    const html = renderShell("dashboard", ["Inicio"], "<div></div>", "student");
    expect(html).toMatch(/class="tn-link active"[^>]*data-go="dashboard"[^>]*aria-current="page"/);
  });

  it("la pill de XP sale con el dato REAL de DB.xp y se calla si no hay XP", () => {
    expect(renderShell("dashboard", ["Inicio"], "", "student")).not.toContain('class="tn-xp"');
    (DB as any).xp = 1240;
    const html = renderShell("dashboard", ["Inicio"], "", "student");
    expect(html).toContain('class="tn-xp"');
    expect(html).toMatch(/1[.,]?240/);   // con separador de millares del idioma activo
    delete (DB as any).xp;
  });

  it("el sub del chip: tier+nivel para el alumno, ROL para coach/padre/admin", () => {
    expect(renderShell("dashboard", ["Inicio"], "", "student")).toContain("Tier Novato · OTR Competitor");
    // El nivel es progresión de ESTUDIANTE: un coach no se etiqueta con el nivel del alumno.
    const coach = renderShell("teacher", ["Panel"], "", "teacher");
    expect(coach).not.toContain("OTR Competitor");
    expect(coach).toContain(`class="tn-usub">${t("role.teacher", "es")}<`);
  });

  it("el CSS del shell describe la barra del spec: 62px, translúcida y borde cálido", () => {
    const css = readFileSync(join(process.cwd(), "app/styles/app.css"), "utf8");
    expect(css).toMatch(/\.topnav\{[^}]*height:62px/);
    expect(css).toMatch(/rgba\(248,248,246,\.85\)/);
    expect(css).toMatch(/backdrop-filter:blur\(12px\)/);
    // el sidebar ya no existe en el layout
    expect(css).not.toMatch(/\.app\.mini\{/);
    expect(css).not.toContain("var(--sidebar-w)");
    // main del mockup: 1256px centrado
    expect(css).toMatch(/\.page\{max-width:1256px;margin:0 auto;padding:30px 30px 72px\}/);
  });

  it("móvil (<=760px) conserva la bottom-tab-bar y compacta la barra", () => {
    const html = renderShell("dashboard", ["Inicio"], "", "student");
    expect(html).toContain('class="tabbar mobile-only"');
    const css = readFileSync(join(process.cwd(), "app/styles/responsive.css"), "utf8");
    const movil = css.slice(css.indexOf("@media (max-width:760px)"));
    expect(movil).toContain(".tabbar{");
    expect(movil).toContain(".tn-word");   // sin wordmark ni nombre: solo escudo/XP/campana/avatar
  });

  // La llave del sidebar plegado sigue exportada: Aula.tsx la importa (handler legado).
  it("SIDEBAR_MINI_KEY sigue exportada para no romper el delegador", () => {
    expect(SIDEBAR_MINI_KEY).toBe("otr_sidebar_mini");
  });
});

/* ================= C · dashboard ================= */
describe("C · el dashboard replica el mockup con datos reales", () => {
  it("abre con la cabecera del mockup: fecha de hoy + 'Hola, <nombre>'", () => {
    const html = Core.dashboard.render({ role: "student" });
    expect(html).toContain(`${t("core.dashHello")}, Isaac`);
    const head = html.indexOf("page-head--rule");
    const grid = html.indexOf("dash-grid");
    expect(head).toBeGreaterThanOrEqual(0);
    expect(head).toBeLessThan(grid);            // la cabecera abre la pantalla
    expect(html).toContain("ph-eyebrow");       // eyebrow con la fecha de hoy
  });

  it("el hero negro es lo primero de la columna principal", () => {
    const html = Core.dashboard.render({ role: "student" });
    const grid = html.indexOf("dash-grid");
    const hero = html.indexOf("dash-hero");
    expect(hero).toBeGreaterThan(grid);
    // Y el rail derecho (rango + logros) va DESPUÉS del hero, no antes.
    expect(html.indexOf("dash-aside")).toBeGreaterThan(hero);
  });

  it("sin clase agendada el hero conserva la acción real: retomar la lección", () => {
    const html = Core.dashboard.render({ role: "student" });
    expect(html).toContain(t("core.naResumeCta"));        // "Continuar lección"
    expect(html).toContain('data-dash-lesson="l-1"');     // el CTA lleva a la lección real
  });

  it("la racha va en la cabecera y el nivel en la tarjeta de rango", () => {
    const html = Core.dashboard.render({ role: "student" });
    const cabecera = html.slice(0, html.indexOf("dash-grid"));
    expect(cabecera).toContain(t("core.dashStatStreak"));
    expect(cabecera).toContain(">3<");                    // DB.me.streak real
    expect(html).toContain("OTR Competitor");             // nivel en la card "Tu rango"
  });

  it("no inventa secciones: sin torneos, sin logros y sin leaderboard no se pintan", () => {
    const html = Core.dashboard.render({ role: "student" });
    expect(html).not.toContain("dash-lb");                // DB.leaderboard ausente
    expect(html).not.toContain("dash-badges");            // DB.badges vacío
    expect(html).not.toContain("hl-grid");                // sin highlights reales
  });

  // El seed no tiene ninguna reserva a menos de 60 min, así que la ruta "en vivo"
  // (countdown + badge + fila --live) se cubre aquí con una reserva sintética.
  it("una clase a <60 min saca countdown, badge 'En vivo pronto' y fila en vivo", () => {
    const iso = new Date(Date.now() + 20 * 60 * 1000).toISOString();
    (DB as any).myBookings = [{
      id: "bk-1", status: "CONFIRMED", upcoming: true, coachName: "Saúl Méndez",
      packageName: "Single", slotLabel: "hoy · 4:00 PM", slotAtIso: iso,
      durationMin: 60, videoUrl: "https://meet.example/x",
    }];
    const html = Core.dashboard.render({ role: "student" });
    expect(html).toContain(t("core.dashLiveSoon"));            // badge naranja del hero
    expect(html).toContain('id="dash-cd"');                    // countdown mm:ss
    expect(html).toMatch(/id="dash-cd"[^>]*>(19|20):\d{2}</);  // ~20 min restantes
    expect(html).toContain(t("core.dashJoinCta"));             // CTA solo con videoUrl real
    expect(html).toContain("evrow--live");                     // la fila de hoy va en vivo
    expect(html).toContain("date-box--live");
  });

  it("sin URL de sala el CTA del hero NO ofrece unirse", () => {
    (DB as any).myBookings = [{
      id: "bk-2", status: "PENDING", upcoming: true, coachName: "Saúl Méndez",
      slotLabel: "lun 11 ago · 4:00 PM", slotAtIso: new Date(Date.now() + 864e5 * 4).toISOString(),
    }];
    const html = Core.dashboard.render({ role: "student" });
    expect(html).not.toContain(t("core.dashJoinCta"));
    expect(html).toContain(t("core.dashSessionWith").replace("{coach}", "Saúl Méndez"));
  });
});
