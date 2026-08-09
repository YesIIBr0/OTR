import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { C } from "../app/lib/components";

/* ============================================================================
   [PEDIDO DE ISAAC · 2026-08-09] Sistema de color: negro/blanco dominante,
   verde semántico, naranja de acento puntual.

   Textual del cliente:
     «Igual demasiado naranja. Reemplaza más por negro con blanco. Para completed
      - verde. Para progress bar - verde. Unirse a una llamada y todo eso negro
      con blanco.»

   Este archivo guarda las cuatro reglas que salen de ahí, en el KIT (tokens.css,
   app.css, screens.css, components.ts) y no pantalla por pantalla:
     1) el CTA de acción (.btn-accent) es NEGRO con texto BLANCO — y BLANCO con
        texto negro sobre superficie oscura;
     2) toda barra/anillo de progreso va en la escala verde --success;
     3) "Completado" (chip, check, tile de hecho) va en verde;
     4) el naranja no vuelve a colarse en esos tres sitios.

   Los contrastes NO se dan por buenos de memoria: se calculan aquí con la
   fórmula de luminancia relativa de WCAG 2.1 sobre los hexes reales de
   tokens.css, así que si alguien retoca un verde el test canta el número nuevo.
   ========================================================================== */

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p: string) => readFileSync(path.join(ROOT, p), "utf8");
const TOKENS = read("app/styles/tokens.css");
const APP = read("app/styles/app.css");
const SCREENS = read("app/styles/screens.css");

/* ---- WCAG 2.1: luminancia relativa y ratio de contraste ------------------- */
function luminance(hex: string): number {
  const body = hex.replace("#", "");
  const ch = [0, 2, 4].map((i) => parseInt(body.slice(i, i + 2), 16) / 255);
  const lin = ch.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
/** Valor literal de un token declarado en tokens.css (`--x:#RRGGBB`). */
function token(name: string): string {
  const m = new RegExp(`${name}:\\s*(#[0-9A-Fa-f]{6})`).exec(TOKENS);
  expect(m, `falta el token ${name} con hex literal en tokens.css`).toBeTruthy();
  return m![1].toUpperCase();
}
/** Cuerpo de la regla cuyo selector COMPLETO es `selector` (no una de una lista). */
function rule(css: string, selector: string): string {
  // El selector tiene que abrir la declaración: precedido de salto de línea o de `}`,
  // nunca de una coma (si no, `.chip--done` casaría con la lista de geometría que
  // comparten todos los chips).
  const re = new RegExp(`(?:^|[\\n}])\\s*${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\{([^}]*)\\}`, "m");
  const m = re.exec(css);
  expect(m, `no encuentro la regla ${selector}`).toBeTruthy();
  return m![1];
}

const NEGRO = "#171717";
const BLANCO = "#FFFFFF";
const GREIGE = "#F1F1EF"; // --bg
const PISTA = "#EFEFEF";  // --n-100, fondo de .bar

/* ==========================================================================
   1) CTA de acción: negro con blanco
   ========================================================================== */
describe("1 · el CTA de acción es NEGRO con texto BLANCO", () => {
  it(".btn-accent ya no es naranja en ninguna de las dos hojas", () => {
    for (const [css, sel] of [[APP, ".btn-accent"], [SCREENS, ".btn.btn-accent"]] as const) {
      const r = rule(css, sel);
      expect(r, `${sel} debe pintarse en negro`).toContain("var(--otr-black)");
      expect(r, `${sel} no puede seguir en naranja`).not.toMatch(/--otr-green\b|--action\b|#F25623/i);
      expect(r, `${sel} lleva el texto en blanco`).toMatch(/color:\s*(#fff|#FFFFFF|var\(--otr-cream\))/i);
    }
  });

  it("y ese par mide 17,9:1 (muy por encima del 4,5:1 de AA)", () => {
    expect(contrast(NEGRO, BLANCO)).toBeGreaterThan(4.5);
    expect(contrast(NEGRO, BLANCO)).toBeCloseTo(17.93, 1);
  });

  it("sobre superficie OSCURA se invierte a blanco con texto negro (si no, desaparecería)", () => {
    // El héroe del dashboard es .card--dark.hero-photo y el de la clase .hero-photo:
    // un botón negro sobre negro sería invisible.
    for (const sel of [".card--dark .btn.btn-accent", ".hero-photo .btn.btn-accent"]) {
      expect(SCREENS, `falta la inversión para ${sel}`).toContain(sel);
    }
    const at = SCREENS.indexOf(".card--dark .btn.btn-accent,.card--dark .btn.btn-primary");
    expect(at).toBeGreaterThan(-1);
    const cuerpo = SCREENS.slice(at, SCREENS.indexOf("}", at));
    expect(cuerpo).toMatch(/background:\s*#fff/i);
    expect(cuerpo).toContain("color:var(--otr-black)");
  });

  it("el CTA no arrastra el glow NARANJA del mockup", () => {
    expect(rule(SCREENS, ".btn.btn-accent")).not.toContain("--sh-glow");
    expect(rule(SCREENS, ".btn.btn-accent:hover")).not.toContain("--sh-glow");
    // El glow sigue existiendo para el botón de GRABAR, que sí es naranja.
    expect(SCREENS).toContain(".rec-btn:focus-visible{box-shadow:var(--sh-glow)");
  });
});

/* ==========================================================================
   2) Progreso en verde
   ========================================================================== */
describe("2 · toda barra/anillo de progreso va en verde", () => {
  const BARRAS: Array<[string, string]> = [
    [".bar > i", "barra del kit (competencias, cursos, XP)"],
    [".bar.navy > i", "variante destacada — ya no es la excepción naranja"],
    [".cls-bar > i", "«Mis clases» y rail «Contenido del curso»"],
    [".pl-track > i", "camino de nivel / placement"],
  ];

  it("las cuatro barras del sistema usan la escala --success y ninguna el naranja", () => {
    for (const [sel, quien] of BARRAS) {
      const css = sel.startsWith(".bar") ? APP : SCREENS;
      const r = rule(css, sel);
      expect(r, `${quien}: falta el verde`).toContain("var(--success)");
      expect(r, `${quien}: no puede quedar naranja`).not.toMatch(/--otr-green\b|--otr-sky|#F25623/i);
    }
  });

  it("el anillo de progreso (conic y SVG) también es verde", () => {
    expect(rule(SCREENS, ".ring::before")).toContain("conic-gradient(var(--success)");
    expect(rule(SCREENS, ".ring--light::before")).toContain("var(--success-strong)");
    expect(C.ring(50, 72)).toContain("var(--success-strong)");
    expect(C.ring(50, 72)).not.toContain("--otr-sky");
  });

  it("la PUNTA de la barra contrasta ≥3:1 con la pista (WCAG 1.4.11)", () => {
    // El degradado va de vivo a oscuro en el sentido de avance a propósito: el borde
    // que hay que distinguir del hueco vacío es el derecho, y ahí está el verde oscuro.
    const punta = token("--success-strong");
    const vivo = token("--win"); // = --success
    expect(contrast(punta, PISTA)).toBeGreaterThanOrEqual(3);
    expect(contrast(punta, PISTA)).toBeCloseTo(4.7, 1);
    // Y queda anotado POR QUÉ la punta no es el verde vivo:
    expect(contrast(vivo, PISTA)).toBeLessThan(3);
  });
});

/* ==========================================================================
   3) Completado en verde
   ========================================================================== */
describe("3 · «Completado» va en verde, el check incluido", () => {
  it("C.chip reencamina al verde cualquier chip con icono de check, conservando su peso", () => {
    expect(C.chip("Lección completada", "accent", { ic: "checkCircle" })).toContain("chip--done");
    expect(C.chip("Completado", "tint", { ic: "check" })).toContain("chip--done-soft");
    // …y NO toca lo que no es un completado:
    expect(C.chip("En vivo", "accent", { ic: "video" })).toContain("chip--accent");
    expect(C.chip("Pendiente", "tint")).toContain("chip--tint");
    expect(C.chip("Torneo", "accent", { ic: "trophy" })).not.toContain("chip--done");
  });

  it("las dos variantes verdes existen en el kit con su pareja fondo/texto", () => {
    expect(rule(SCREENS, ".chip--done")).toBe("background:var(--success);color:var(--text-on-accent)");
    expect(rule(SCREENS, ".chip--done-soft")).toBe("background:var(--success-soft);color:var(--ok)");
  });

  it("el éxito del sistema (--ok/--ok-soft) dejó de ser negro-sobre-gris", () => {
    expect(TOKENS).toContain("--ok:var(--success-strong)");
    expect(TOKENS).toContain("--ok-soft:var(--success-soft)");
  });

  it("el check de lección hecha del rail del curso es verde, no naranja", () => {
    const r = rule(SCREENS, ".cls-les.is-done .cls-les-dot");
    expect(r).toContain("var(--success-soft)");
    expect(r).toContain("color:var(--ok)");
    expect(r).not.toContain("242,86,35"); // el rgba del naranja de marca
  });

  it("y todos esos pares cumplen AA de texto (≥4,5:1), medido", () => {
    const vivo = token("--win");
    const fuerte = token("--success-strong");
    const suave = token("--success-soft");
    // chip sólido: letra NEGRA sobre el verde vivo (con blanca no llegaría)
    expect(contrast(NEGRO, vivo)).toBeCloseTo(5.83, 1);
    expect(contrast(BLANCO, vivo)).toBeLessThan(4.5);
    // chip suave y tile de check: verde oscuro sobre el tinte
    expect(contrast(fuerte, suave)).toBeGreaterThanOrEqual(4.5);
    // --ok como color de TEXTO en las dos superficies de la casa
    expect(contrast(fuerte, BLANCO)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(fuerte, GREIGE)).toBeGreaterThanOrEqual(4.5);
    // --ok como FONDO con la letra blanca encima (.xp-check.on)
    expect(contrast(BLANCO, fuerte)).toBeGreaterThanOrEqual(4.5);
  });
});

/* ==========================================================================
   4) El naranja se queda donde debe
   ========================================================================== */
describe("4 · el naranja sigue vivo, pero solo como acento puntual", () => {
  it("conserva sus sitios: barra del título de sección, canto del héroe, chip de acento", () => {
    expect(rule(SCREENS, ".sec-title::before")).toContain("var(--otr-green)");
    expect(rule(SCREENS, ".dash-hero::after")).toContain("var(--otr-green)");
    expect(rule(SCREENS, ".chip--accent")).toContain("var(--otr-green)");
  });

  it("pero desapareció de los avatares, que eran la mayor superficie repetida", () => {
    const r = rule(APP, ".avatar");
    expect(r).toContain("background:var(--n-600)");
    expect(r).not.toContain("--otr-sky-lo");
    expect(contrast(BLANCO, "#4D4D4D")).toBeGreaterThanOrEqual(4.5); // inicial blanca legible
  });

  it("y del sparkline del roster, que lo traía hardcodeado inline", () => {
    const teacher = read("app/lib/scr-teacher.ts");
    expect(teacher).not.toContain("'var(--otr-sky)'");
    expect(teacher).toContain("color='var(--n-600)'");
  });

  it("el chip WIN del Debate Hub se alinea con el verde de sus cuadrados", () => {
    const at = SCREENS.indexOf(".chip--accent.dbt-res,");
    expect(at).toBeGreaterThan(-1);
    expect(SCREENS.slice(at, SCREENS.indexOf("}", at))).toContain("background:var(--win)");
  });
});
