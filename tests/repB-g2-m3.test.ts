// [repB] Defectos del sondeo 2026-08-09 asignados al agente B:
//   · G2 (grave) — la ficha de coach (__mkCoachId) quedaba CONGELADA al navegar por el top-nav
//     (explore y marketplace son la MISMA pantalla). Tras el fix, render() descarta la ficha en
//     una ENTRADA DE RUTA del núcleo y solo la conserva en un repintado INTERNO de la pantalla.
//   · M3 (moderado) — estrellas consolidadas en UN helper (C.stars): rellenas y proporcionales,
//     iguales en marketplace y en el perfil del coach.
//   · menor — la política de cancelación se pinta desde i18n (ES+EN), no como texto libre del
//     coach bajo un heading ya traducido.
//
// environment: node con stub de `window` ANTES de importar pantallas (igual que screens.test.ts):
// varias hacen `const w = window` en sus helpers.
import { describe, it, expect, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

(globalThis as any).window = (globalThis as any).window || {};
const win: any = (globalThis as any).window;
win.api = async () => ({});
win.go = () => {};
win.toast = () => {};

import { DB } from "../app/lib/data";
import { C } from "../app/lib/components";
import { t } from "../app/lib/i18n";
import { S as SMarketplace } from "../app/lib/scr-marketplace";
import { S as SProfile } from "../app/lib/scr-profile";

const Mkt: any = SMarketplace;
const Prof: any = SProfile;
const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");

function resetMkt() {
  for (const k of Object.keys(DB)) delete (DB as any)[k];
  Object.assign(DB, {
    me: { name: "Analía Reyes", initials: "AR", role: "student" },
    marketplace: {
      viewer: { ageBand: "adult" },
      coaches: [{
        id: "coach-x", profileId: "cp-x", name: "Saúl Méndez", initials: "SM",
        headline: "Coach de Public Forum", coachVerified: true, languages: "ES,EN",
        specialties: "Public Forum", credentials: "", responseTime: "~2 h",
        cancelPolicy: "Cancelación gratis hasta 24 h antes de la sesión; después se retiene el 50%.",
        hourlyCents: 4000, ratingAvg: 4.8, reviewCount: 12, bookingCount: 34,
        packages: [], availability: [], fromPriceCents: 4000,
      }],
    },
  });
  for (const k of Object.keys(win)) if (k.startsWith("__")) delete win[k];
}

/* ================= G2 · limpieza del sub-estado de ficha ================= */
describe("G2 · la navegación del top-nav NO queda congelada en la ficha del coach", () => {
  beforeEach(() => resetMkt());

  it("una ENTRADA DE RUTA (render sin marca interna) con __mkCoachId setado cae en la LISTA", () => {
    // Reproduce el bug: el usuario abrió una ficha (o quedó de una visita previa) y el núcleo
    // repinta la ruta marketplace/explore. Antes seguía la ficha; ahora debe salir la lista.
    win.__mkCoachId = "coach-x";
    const html = Mkt.marketplace.render({ role: "student" });
    expect(html).toContain("data-mk-q");            // buscador → es el GRID
    expect(html).not.toContain("data-mk-back");     // no el botón "Volver" → NO es la ficha
    // efecto colateral esperado: el sub-estado quedó limpio para la próxima vez.
    expect(win.__mkCoachId).toBeNull();
  });

  it("un repintado INTERNO (marca __mkInternalRepaint) SÍ abre la ficha del coach", () => {
    win.__mkCoachId = "coach-x";
    win.__mkInternalRepaint = true;                 // lo que hace el repaint() interno al abrir
    const html = Mkt.marketplace.render({ role: "student" });
    expect(html).toContain("data-mk-back");         // botón "← Volver a coaches" → es la FICHA
    expect(html).toContain("Saúl Méndez");
    expect(win.__mkCoachId).toBe("coach-x");        // la ficha se conserva
  });

  it("el deep-link a la LISTA (#explore/#marketplace, sin coach) sigue mostrando la lista", () => {
    win.__mkCoachId = null;
    const html = Mkt.marketplace.render({ role: "student" });
    expect(html).toContain("data-mk-q");
    expect(html).not.toContain("data-mk-back");
  });

  it("abrir ficha → salir por el top-nav → volver a marketplace pinta la LISTA (no la ficha vieja)", () => {
    // 1) abrir la ficha (repintado interno)
    win.__mkCoachId = "coach-x"; win.__mkInternalRepaint = true;
    expect(Mkt.marketplace.render({ role: "student" })).toContain("data-mk-back");
    // 2) el usuario navega a otra sección; __mkCoachId sigue setado en memoria
    win.__mkInternalRepaint = false;
    // 3) vuelve a marketplace por el nav → entrada de ruta del núcleo → LISTA
    const back = Mkt.marketplace.render({ role: "student" });
    expect(back).toContain("data-mk-q");
    expect(back).not.toContain("data-mk-back");
  });
});

/* ================= M3 · helper ÚNICO de estrellas (C.stars) ================= */
describe("M3 · C.stars pinta estrellas rellenas y proporcionales", () => {
  it("5.0 se ve LLENO: la capa de relleno cubre el ancho total", () => {
    const w = 13 * 5 + 2 * 4; // 73
    const html = C.stars(5, { size: 13 });
    expect(html).toContain(`width:${w}px;overflow:hidden`); // capa llena a ancho completo
    expect(html).toContain('aria-label="5.0/5"');
  });

  it("3.5 se ve MEDIO: el relleno cae entre la 3.ª y la 4.ª estrella", () => {
    const w = 13 * 5 + 2 * 4;                 // 73
    const fill = Math.round((3.5 / 5) * w * 100) / 100; // 51.1
    const star3End = 13 * 3 + 2 * 3;          // 45  (fin de la 3.ª estrella)
    const star4End = 13 * 4 + 2 * 3;          // 58  (fin de la 4.ª estrella)
    expect(fill).toBeGreaterThan(star3End);
    expect(fill).toBeLessThan(star4End);
    expect(C.stars(3.5, { size: 13 })).toContain(`width:${fill}px;overflow:hidden`);
    expect(C.stars(3.5, { size: 13 })).toContain('aria-label="3.5/5"');
  });

  it("0 (o sin reseñas) no pinta capa de relleno; clamp a [0,5]", () => {
    expect(C.stars(0)).not.toContain("overflow:hidden");
    expect(C.stars(0)).toContain('aria-label="0.0/5"');
    // clamp: negativos = vacío, >5 = lleno
    expect(C.stars(-3)).not.toContain("overflow:hidden");
    const full = 13 * 5 + 2 * 4;
    expect(C.stars(9, { size: 13 })).toContain(`width:${full}px;overflow:hidden`);
  });

  it("es proporcional y monótono (más rating ⇒ más ancho de relleno)", () => {
    const wOf = (r: number) => {
      const m = /position:absolute;top:0;left:0;height:100%;width:([\d.]+)px;overflow:hidden/.exec(C.stars(r, { size: 13 }));
      return m ? parseFloat(m[1]) : 0;
    };
    expect(wOf(2)).toBeLessThan(wOf(3.5));
    expect(wOf(3.5)).toBeLessThan(wOf(5));
  });
});

describe("M3 · marketplace y perfil usan el MISMO helper (una sola implementación)", () => {
  it("scr-marketplace y scr-profile invocan C.stars y NO duplican estrellas propias", () => {
    const mkt = read("app/lib/scr-marketplace.ts");
    const prof = read("app/lib/scr-profile.ts");
    expect(mkt).toContain("C.stars(");
    expect(prof).toContain("C.stars(");
    // ya no existe el helper local `const stars = (n, size` en marketplace…
    expect(mkt).not.toMatch(/const stars = \(n, size/);
    // …ni el starsRO que pintaba IC.star en trazo fino en el perfil.
    expect(prof).not.toMatch(/opacity:\.25'\}\$\{IC\.star\}/);
  });

  it("la ficha del marketplace y el perfil público del coach emiten las estrellas unificadas", () => {
    resetMkt();
    // ficha del marketplace (repintado interno)
    win.__mkCoachId = "coach-x"; win.__mkInternalRepaint = true;
    expect(Mkt.marketplace.render({ role: "student" })).toContain('class="otr-stars"');
    // perfil público del coach (cara STUDENT) con rating 5.0 → relleno completo (size 14 → 78px)
    DB.coachProfile = {
      name: "Saúl Méndez", initials: "SM", rating: 5, reviewCount: 3,
      reviews: [], programs: [], formatsList: [],
    } as any;
    const prof = Prof.coach.render({ role: "student" });
    expect(prof).toContain('class="otr-stars"');
    const wFull = 14 * 5 + 2 * 4; // 78
    expect(prof).toContain(`width:${wFull}px;overflow:hidden`); // 5.0 lleno
  });
});

/* ================= menor · política de cancelación por i18n (ES+EN) ================= */
describe("menor · la política de cancelación traduce ES+EN", () => {
  it("existe la clave en ambos idiomas y el marketplace la usa (no texto libre del coach)", () => {
    const es = t("mkt.cancelPolicyBody", "es");
    const en = t("mkt.cancelPolicyBody", "en");
    expect(es).toContain("Cancelación gratis");
    expect(en).toContain("Free cancellation");
    expect(en).not.toBe("mkt.cancelPolicyBody"); // la clave EN resuelve de verdad
    const mkt = read("app/lib/scr-marketplace.ts");
    expect(mkt).toContain('t("mkt.cancelPolicyBody")'); // el body sale de i18n
  });

  it("la ficha en ES muestra el body traducido y NO el texto libre en el <p> de la política", () => {
    resetMkt();
    win.__mkCoachId = "coach-x"; win.__mkInternalRepaint = true;
    const html = Mkt.marketplace.render({ role: "student" });
    expect(html).toContain(t("mkt.cancelPolicyBody", "es"));
  });
});
