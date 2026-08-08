// [A11Y · GOAL 2026-08] Guardián de la auditoría de teclado/semántica
// (docs/review/GOAL_2026-08_teclado.md). Fija los hallazgos K-01…K-05, K-09, K-12 y K-13
// para que no vuelvan a colarse en un refactor de estilos o de builders.
//
// Los tres primeros son de CONTRASTE y de CASCADA: se comprueban sobre el CSS real
// (leído del disco) recalculando la fórmula de luminancia relativa de WCAG 2.1 — el
// mismo cálculo con el que la auditoría midió 2,37:1 en el anillo y 1,39:1 en el borde
// del input. Los de semántica se comprueban sobre el HTML que devuelven los builders.
import { describe, it, expect, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");

const TOKENS = read("app/styles/tokens.css");
const APP = read("app/styles/app.css");
const SCREENS = read("app/styles/screens.css");
const AUTH = read("app/components/Auth.tsx");
const COMPONENTS = read("app/lib/components.ts");

/* ================================================================
   Contraste WCAG 2.1 (§1.4.11 · no-text contrast, mínimo 3:1)
   ================================================================ */

function srgbToLinear(channel8bit: number): number {
  const c = channel8bit / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** Luminancia relativa de un hex #RRGGBB. */
function luminance(hex: string): number {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex.trim());
  if (!m) throw new Error(`hex inválido: ${hex}`);
  const [r, g, b] = m.slice(1).map((h) => srgbToLinear(parseInt(h, 16)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Ratio de contraste entre dos colores opacos. */
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Valor de un custom property del :root de tokens.css. */
function token(name: string): string {
  const m = new RegExp(`^\\s*${name}\\s*:\\s*([^;]+);`, "m").exec(TOKENS);
  if (!m) throw new Error(`token no encontrado: ${name}`);
  return m[1].trim();
}

// La fórmula, contra los valores que la propia auditoría publicó.
describe("fórmula de contraste (control del propio test)", () => {
  it("reproduce las mediciones del documento", () => {
    // #E19681 = el anillo viejo (alpha .55) compuesto sobre blanco → el 2,37:1 del doc.
    expect(contrast("#E19681", "#FFFFFF")).toBeCloseTo(2.37, 1);
    // #DCDBD6 = --border-strong sobre blanco → el 1,39:1 del doc.
    expect(contrast("#DCDBD6", "#FFFFFF")).toBeCloseTo(1.39, 1);
  });
});

/* ================================================================
   K-02 · El anillo de foco llega a 3:1 sobre los fondos del sistema
   ================================================================ */
describe("K-02 · anillo de foco", () => {
  const WHITE = "#FFFFFF";
  const GREIGE = "#F1F1EF"; // canvas de marca
  const BLACK_BTN = "#171717"; // .btn-primary

  it("--ring usa color PLENO, sin alpha (el alpha lo diluía a 2,37:1)", () => {
    const ring = token("--ring");
    expect(ring).not.toMatch(/rgba|hsla|color-mix/i);
    expect(ring).toMatch(/var\(--otr-green-lo\)|#C8401A/i);
  });

  it("el color del anillo supera 3:1 sobre blanco, greige y el botón negro", () => {
    const ringColor = token("--otr-green-lo"); // #C8401A
    expect(contrast(ringColor, WHITE)).toBeGreaterThanOrEqual(3);
    expect(contrast(ringColor, GREIGE)).toBeGreaterThanOrEqual(3);
    expect(contrast(ringColor, BLACK_BTN)).toBeGreaterThanOrEqual(3);
  });
});

/* ================================================================
   K-03 · El contorno de los controles de formulario llega a 3:1
   ================================================================ */
describe("K-03 · borde de input/select/textarea", () => {
  it("--border-field supera 3:1 sobre el blanco del input", () => {
    expect(contrast(token("--border-field"), "#FFFFFF")).toBeGreaterThanOrEqual(3);
  });

  it("la regla .input,.select,.textarea usa --border-field y no --border-strong", () => {
    const rule = /\.input,\.select,\.textarea\{[^}]*\}/.exec(APP);
    expect(rule, "no se encontró la regla base de los controles en app.css").toBeTruthy();
    expect(rule![0]).toContain("var(--border-field)");
    expect(rule![0]).not.toContain("var(--border-strong)");
  });

  it("--border-strong sigue existiendo para los bordes decorativos", () => {
    // No se toca el token global: lo usan separadores, dropzone y .btn-outline.
    expect(token("--border-strong")).toBe("#DCDBD6");
  });
});

/* ================================================================
   K-01 · Los botones que apagan box-shadow recuperan el anillo al foco
   ================================================================ */
describe("K-01 · foco visible en .btn-primary / .btn-accent / .rec-btn.recording", () => {
  // Deben vivir en screens.css (última hoja de la cascada), porque las reglas que
  // corrigen tienen la MISMA especificidad y están en ese mismo archivo.
  const focusRule = /\.btn\.btn-primary:focus-visible,\s*\.btn\.btn-accent:focus-visible,\s*\.rec-btn\.recording:focus-visible\{([^}]*)\}/.exec(
    SCREENS,
  );

  it("existe la regla de restauración del anillo para las tres clases", () => {
    expect(focusRule, "falta el bloque :focus-visible de K-01 en screens.css").toBeTruthy();
    expect(focusRule![1]).toContain("var(--ring)");
  });

  it("va DESPUÉS de los box-shadow:none que la pisaban", () => {
    const killer = SCREENS.indexOf(".btn.btn-primary{");
    expect(killer).toBeGreaterThan(-1);
    expect(focusRule!.index).toBeGreaterThan(killer);
  });

  it("hover + foco conserva el glow del acento y suma el anillo", () => {
    const m = /\.btn\.btn-accent:hover:focus-visible\{([^}]*)\}/.exec(SCREENS);
    expect(m).toBeTruthy();
    expect(m![1]).toContain("var(--sh-glow)");
    expect(m![1]).toContain("var(--ring)");
  });
});

/* ================================================================
   K-12 · prefers-reduced-motion apaga el ecualizador infinito del login
   ================================================================ */
describe("K-12 · prefers-reduced-motion", () => {
  // Ancla ÚNICA: screens.css ya tiene otros `[A11Y · GOAL 2026-08]` sueltos y otros dos
  // bloques `prefers-reduced-motion` anteriores (el de .hl-img, p. ej.).
  const SECTION = SCREENS.slice(SCREENS.indexOf("A11Y · GOAL 2026-08 (auditoría de teclado"));
  const block = /@media\s*\(prefers-reduced-motion:\s*reduce\)\{([\s\S]*?)\n\}/.exec(SECTION);

  it("existe el bloque reduce en la sección A11Y de screens.css", () => {
    expect(block, "falta el @media reduce de K-12 en screens.css").toBeTruthy();
  });

  it("para la animación INFINITA de .lb-wave i (WCAG 2.2.2) y deja el estado en paused", () => {
    const m = /\.lb-wave i\{([^}]*)\}/.exec(block![1]);
    expect(m).toBeTruthy();
    expect(m![1]).toContain("animation:none");
    // `animation:none` resetea play-state a `running`; el paused explícito va después
    // para que la medición por getComputedStyle también lo refleje.
    expect(m![1]).toContain("animation-play-state:paused");
  });

  it("apaga también las tres transiciones de chevron/estrella que se escapaban", () => {
    for (const sel of [".tn-more > summary .chev", ".module-head .chev", ".rate-star svg"]) {
      expect(block![1]).toContain(sel);
    }
    expect(block![1]).toMatch(/transition:none/);
  });
});

/* ================================================================
   K-04 / K-05 · Landmark y autocomplete del login
   ================================================================ */
describe("K-04/K-05 · login", () => {
  it("el contenido del login vive dentro de un <main> (antes: 0 landmarks)", () => {
    expect(AUTH).toContain('<main className="login">');
    expect(AUTH).toContain("</main>");
    expect(AUTH).not.toContain('<div className="login">');
  });

  it("#auth-email declara autocomplete=email (WCAG 1.3.5)", () => {
    const line = AUTH.split("\n").find((l) => l.includes('id="auth-email"'))!;
    expect(line).toContain('autoComplete="email"');
  });

  it("#auth-password declara current-password en login y new-password en registro", () => {
    const line = AUTH.split("\n").find((l) => l.includes('id="auth-password"'))!;
    expect(line).toContain("current-password");
    expect(line).toContain("new-password");
  });
});

/* ================================================================
   K-13 · El <svg> del anillo de progreso es decorativo
   ================================================================ */
describe("K-13 · aria-hidden del anillo", () => {
  it("C.ring() marca su <svg> como decorativo", () => {
    const ring = /ring\(pct: number[\s\S]*?\n {2}\},/.exec(COMPONENTS);
    expect(ring).toBeTruthy();
    expect(ring![0]).toMatch(/<svg[^>]*aria-hidden="true"/);
  });
});

/* ================================================================
   K-09 · Escalera de encabezados de Debate Hub y Niveles
   ================================================================ */

/* Stub de `window` ANTES de importar las pantallas (mismo patrón que screens.test.ts). */
/* eslint-disable @typescript-eslint/no-explicit-any */
(globalThis as any).window = (globalThis as any).window || {};
const win: any = (globalThis as any).window;
win.api = async () => ({});
win.go = () => {};
win.toast = () => {};

import { DB } from "../app/lib/data";
import { S as SDebateRaw } from "../app/lib/scr-debate";
import { S as SProfileRaw } from "../app/lib/scr-profile";

// Los builders son módulos `// @ts-nocheck` que declaran `export const S = {}` y luego
// le cuelgan las rutas en runtime: el tipo estático es `{}`. Mismo trato que en
// tests/screens.test.ts (mapa `Record<string, any>`).
const SDebate = SDebateRaw as any;
const SProfile = SProfileRaw as any;

/** Niveles de `<hN>` en orden de documento. */
function headingLevels(html: string): number[] {
  return [...html.matchAll(/<h([1-6])[\s>]/g)].map((m) => Number(m[1]));
}

/** Devuelve los saltos ("h1→h3") que rompen la escalera; vacío = correcto. */
function levelSkips(html: string): string[] {
  const levels = headingLevels(html);
  const bad: string[] = [];
  for (let i = 1; i < levels.length; i++) {
    if (levels[i] > levels[i - 1] + 1) bad.push(`h${levels[i - 1]}→h${levels[i]}`);
  }
  return bad;
}

function resetDB(extra: Record<string, unknown> = {}) {
  for (const k of Object.keys(DB)) delete (DB as any)[k];
  Object.assign(DB, {
    me: { name: "Analía Reyes", initials: "AR", role: "student", level: "OTR Competitor", streak: 4 },
    levels: [
      { name: "OTR Initiate", range: "0–500", color: "#F25623" },
      { name: "OTR Competitor", range: "500–1500", color: "#F25623" },
      { name: "OTR Strategist", range: "1500–3000", color: "#F25623" },
    ],
    xp: 900, xpLevelStart: 500, xpNext: 1500,
    skills: [], activity: [], badges: [], certificates: [],
    debate: {}, tournaments: [], messages: [], notifications: [],
    ...extra,
  });
  win.__debateTab = "overview";
}

describe("K-09 · escalera de encabezados", () => {
  beforeEach(() => resetDB());

  it("Debate Hub no salta niveles (antes: h1 → h3 'Debates recientes')", () => {
    const html = SDebate.debateHub.render({});
    expect(headingLevels(html)[0]).toBe(1);
    expect(levelSkips(html)).toEqual([]);
  });

  it("Debate Hub tampoco salta con un torneo próximo cargado", () => {
    resetDB({
      tournaments: [
        { id: "t-1", name: "Copa OTR", format: "Public Forum", region: "RD", modality: "Online", startsLabel: "12 jul", status: "UPCOMING", registered: false },
      ],
    });
    expect(levelSkips(SDebate.debateHub.render({}))).toEqual([]);
  });

  it("Niveles no salta (antes: h1 → h4 y un h3 DESPUÉS de un h4)", () => {
    const html = SProfile.progress.render();
    expect(headingLevels(html)[0]).toBe(1);
    expect(levelSkips(html)).toEqual([]);
  });

  it("Niveles tampoco salta con competencias cargadas", () => {
    resetDB({
      skills: [
        { skill: "Confianza", score: 80 }, { skill: "Estructura", score: 75 },
        { skill: "Evidencia", score: 88 }, { skill: "Refutación", score: 70 },
        { skill: "Cross-ex", score: 65 }, { skill: "Delivery", score: 90 },
      ],
      activity: [{ title: "Ronda adjudicada", xp: 40, when: "hace 2 días" }],
    });
    expect(levelSkips(SProfile.progress.render())).toEqual([]);
  });

  it("cada pantalla conserva UN solo h1", () => {
    expect(headingLevels(SDebate.debateHub.render({})).filter((l) => l === 1)).toHaveLength(1);
    expect(headingLevels(SProfile.progress.render()).filter((l) => l === 1)).toHaveLength(1);
  });
});
