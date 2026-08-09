// [RONDA 3 · Isaac] Guardián de la pantalla "Progreso / Rangos" (app/lib/scr-profile.ts).
//
// El cliente tachó con una X la columna izquierda entera: el bloque "Camino a <siguiente
// rango>" (barra de XP) y el bloque "Competencias" (las 6 barras de habilidad). Lo que queda
// —"Racha" y "Subidas recientes"— pasa a ser el contenido principal de esa zona. Se conservan
// a propósito la escalera de rangos y las dos salidas del final ("Ver insignias"/"Debate Hub"),
// que no venían tachadas.
//
// Este test fija ESO: que los dos bloques no vuelvan por un refactor, que lo conservado siga
// en pie, y que la cabecera de las pantallas de este builder ya no lleve eyebrow.
import { describe, it, expect, beforeEach } from "vitest";

/* Stub de `window` ANTES de importar las pantallas (mismo patrón que screens.test.ts). */
/* eslint-disable @typescript-eslint/no-explicit-any */
(globalThis as any).window = (globalThis as any).window || {};
const win: any = (globalThis as any).window;
win.api = async () => ({});
win.go = () => {};
win.toast = () => {};
/* eslint-enable @typescript-eslint/no-explicit-any */

import { DB } from "../app/lib/data";
import { S as SProfileRaw } from "../app/lib/scr-profile";
import { t } from "../app/lib/i18n";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Profile = SProfileRaw as any;

/** Fixture de alumno CON habilidades evaluadas: el caso en el que antes SÍ se pintaban. */
function resetDB(extra: Record<string, unknown> = {}) {
  for (const k of Object.keys(DB)) delete (DB as Record<string, unknown>)[k];
  Object.assign(DB, {
    me: { name: "Analía Reyes", initials: "AR", role: "student", level: "OTR Competitor", streak: 4 },
    levels: [
      { name: "OTR Initiate", range: "0 – 999 XP", color: "#F25623" },
      { name: "OTR Competitor", range: "2.500 – 4.999 XP", color: "#F25623" },
      { name: "OTR Strategist", range: "5.000 – 9.999 XP", color: "#F25623" },
    ],
    xp: 3120, xpLevelStart: 2500, xpNext: 5000,
    skills: [
      { skill: "Confianza", score: 84 }, { skill: "Estructura", score: 90 },
      { skill: "Evidencia", score: 82 }, { skill: "Refutación", score: 76 },
      { skill: "Cross-ex", score: 71 }, { skill: "Delivery", score: 88 },
    ],
    activity: [{ title: "Semifinalista del interno OTR", xp: 200, when: "hace 1 día" }],
    badges: [], certificates: [],
    ...extra,
  });
}

describe("RONDA 3 · Progreso: fuera las dos columnas tachadas por Isaac", () => {
  beforeEach(() => resetDB());

  it("no pinta el bloque 'Camino a <siguiente rango>' ni su barra de XP", () => {
    const html = Profile.progress.render();
    expect(html).not.toContain(t("profile.pathTo"));      // clave borrada → t() devuelve la cruda
    expect(html).not.toContain("thick navy");             // la barra gruesa era exclusiva de ese bloque
    expect(html).not.toContain("/ 5.000 XP");
  });

  it("no pinta 'Competencias' ni una sola barra de habilidad, aun con skills cargadas", () => {
    const html = Profile.progress.render();
    expect(html).not.toContain("comp-row");
    expect(html).not.toContain(t("profile.competencies"));
    for (const label of ["skillConfidence", "skillStructure", "skillCrossex"]) {
      expect(html).not.toContain(t("aula." + label));
    }
  });

  it("el dato de habilidades sigue en el payload (lo consume 'Mi trayectoria')", () => {
    // La vista deja de pintarlo, pero DB.skills NO se toca: scr-lifetime.ts vive de skillGraph
    // y el backend sigue exponiendo ambos. Esto es un recordatorio ejecutable, no un adorno.
    expect(Array.isArray(DB.skills)).toBe(true);
    expect((DB.skills as unknown[]).length).toBe(6);
  });
});

describe("RONDA 3 · Progreso: lo que Isaac NO tachó sigue en pie", () => {
  beforeEach(() => resetDB());

  it("conserva la escalera de rangos con el actual marcado", () => {
    const html = Profile.progress.render();
    expect(html).toContain("level-track");
    expect(html).toContain("level-node cur");
    expect(html).toContain("OTR Strategist");
  });

  it("Racha y Subidas recientes son ahora el contenido de la zona", () => {
    const html = Profile.progress.render();
    expect(html).toContain(t("profile.recentGains"));
    expect(html).toContain(t("profile.dontBreakIt"));
    expect(html).toContain("Semifinalista del interno OTR");
    // La lista toma la columna grande y la racha el rail: el orden en el HTML lo demuestra.
    expect(html.indexOf(t("profile.recentGains"))).toBeLessThan(html.indexOf(t("profile.dontBreakIt")));
  });

  it("mantiene las dos salidas del final", () => {
    const html = Profile.progress.render();
    expect(html).toContain("progress-exits");
    expect(html).toContain(`onclick="go('badges')"`);
    expect(html).toContain(`onclick="go('debate')"`);
  });
});

describe("RONDA 3 · sin eyebrow en las cabeceras de scr-profile.ts", () => {
  beforeEach(() => resetDB());

  it("Rangos abre directo en el h1, sin versalitas encima", () => {
    const html = Profile.progress.render();
    expect(html).not.toContain("ph-eyebrow");
    expect(html).toContain(`<h1 class="ph-title">${t("profile.progressTitle")}</h1>`);
  });

  it("Insignias y certificados, igual", () => {
    const html = Profile.badges.render();
    expect(html).not.toContain("ph-eyebrow");
    expect(html).toContain(`<h1 class="ph-title">${t("profile.badgesTitle")}</h1>`);
  });
});
