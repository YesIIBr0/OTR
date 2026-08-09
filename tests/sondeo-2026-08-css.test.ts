// [SONDEO 2026-08-09 · Agente A] Los tres GRAVES visuales del sondeo, blindados donde de
// verdad viven: en la hoja de estilos. Cada caso afirma el arreglo Y la causa que lo hacía
// necesario, para que un refactor que borre cualquiera de las dos haga sonar el test.
//
//   · G1 — el `.modal` BASE (no solo `.modal--v2`) scrollea por dentro: con contenido largo
//          ("Calificar entregas", "Editar curso") el pie con "Cerrar" salía de pantalla.
//   · G3 — en teléfono la fila de aprobación del portal de familia se partía letra a letra
//          porque el grupo de botones (flex:none) aplastaba la columna de texto.
//   · G4 — en @375 el título del ranking a 2 líneas se encimaba con su meta (faltaba wrap).
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");
const screens = () => read("app/styles/screens.css");
const responsive = () => read("app/styles/responsive.css");

/* ================= G1 · el modal base scrollea internamente ================= */
describe("SONDEO · G1 · el `.modal` base ya no deja el pie fuera de pantalla", () => {
  it(".modal base es columna flex con tope de alto, igual que --v2", () => {
    const regla = screens().match(/\.modal\{[^}]*\}/)![0];
    expect(regla).toContain("display:flex");
    expect(regla).toContain("flex-direction:column");
    expect(regla).toContain("max-height:calc(100vh - 40px)");
  });

  it("el cuerpo base scrollea (overflow-y:auto) y cabeza/pie quedan fijos (flex:none)", () => {
    const css = screens();
    const body = css.match(/\.modal-body\{[^}]*\}/)![0]; // la primera es la base, no la de --v2
    expect(body).toContain("overflow-y:auto");
    expect(css).toMatch(/\.modal-head\{[^}]*flex:none[^}]*\}/);
    expect(css).toMatch(/\.modal-foot\{[^}]*flex:none[^}]*\}/);
  });

  it("el drawer conserva altura COMPLETA anulando el max-height que ahora trae el base", () => {
    const regla = screens().match(/\.modal-scrim\.is-drawer \.modal\{[^}]*\}/)![0];
    expect(regla).toContain("height:100%");
    expect(regla).toContain("max-height:none");
  });

  it("al imprimir el reporte del padre el modal se suelta (block, sin tope, sin recorte)", () => {
    const regla = screens().match(/body:has\(#pr-print\) \.modal-scrim \.modal\{[^}]*\}/)![0];
    expect(regla).toContain("max-height:none");
    expect(regla).toContain("overflow:visible");
    expect(regla).toContain("display:block");
  });
});

/* ================= G3 · la fila de aprobación no se parte en móvil ================= */
describe("SONDEO · G3 · la tarjeta «quiere reservar con» fluye en líneas normales @teléfono", () => {
  it("en ≤520px la `.lrow` con grupo de botones envuelve y el grupo baja a su propia línea", () => {
    const css = responsive();
    expect(css).toContain("@media (max-width:520px)");
    expect(css).toContain(".lrow:has(> .row .btn){flex-wrap:wrap}");
    expect(css).toContain(
      ".lrow > .row:has(.btn){flex:0 0 100% !important;justify-content:flex-end;margin-top:6px}",
    );
  });

  it("la causa sigue viva: texto flex:1;min-width:0 aplastado por botones flex:none", () => {
    // Si el builder deja de tener esta estructura, el fix CSS ya no aplicaría — que avise.
    const src = read("app/lib/scr-parent.ts");
    expect(src).toContain('style="flex:1;min-width:0"');
    expect(src).toContain('class="row" style="gap:6px;flex:none"');
  });
});

/* ================= G4 · el head del ranking no se encima en @375 ================= */
describe("SONDEO · G4 · «Clasificación de agosto» y su meta no se pisan", () => {
  it(".dash-lb .dlb-head permite wrap (la meta cae a su propia línea)", () => {
    const regla = screens().match(/\.dash-lb \.dlb-head\{[^}]*\}/)![0];
    expect(regla).toContain("flex-wrap:wrap");
  });

  it("el título del head puede encoger dentro de su caja (min-width:0)", () => {
    expect(screens()).toMatch(/\.dash-lb \.dlb-head \.sec-title\{[^}]*min-width:0[^}]*\}/);
  });
});
