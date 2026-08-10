import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/* ============================================================================
   [PEDIDO DE ISAAC · 2026-08-09 · RONDA 2 DE COLOR] Guardián de las superficies.

   Textual del cliente, señalando su captura del dashboard:
     «Quitemos todos esos acentos naranja intenso con otros colores. Incluso la barra
      de #1 en el leaderboard».

   La ronda anterior movió BOTONES (a negro con blanco) y PROGRESO/COMPLETADO (a verde).
   Lo que quedaba —y es lo que molestaba— eran las SUPERFICIES: el bloque naranja del 1º
   del podio, su chip de premio, la fila propia de la lista, los chips de categoría de
   "Lo mejor de la temporada", el trofeo de la cabecera, las medallas de logro y el halo
   naranja de las cards negras.

   Este archivo fija esas decisiones para que nadie las revierta sin verlo:
     · el podio se pinta con METALES (--tier-gold / --tier-platinum / --tier-bronze);
     · lo demás se pinta con NEGRO/BLANCO/GRISES del sistema;
     · y el contraste de cada par nuevo se CALCULA aquí (WCAG 2.1), no se cree.

   Lo que este archivo NO prohíbe, a propósito: el naranja de marca sigue vivo en la
   barra de 3px de los títulos, el canto de los héroes, los chips de EN VIVO/TORNEO/HOY
   (decisión explícita de la ronda 1), el texto pequeño de acento y el botón de GRABAR.
   ========================================================================== */

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");

const screens = read("app/styles/screens.css");
const tokens = read("app/styles/tokens.css");
const scrCore = read("app/lib/scr-core.ts");
const scrDebate = read("app/lib/scr-debate.ts");
const scrHighlights = read("app/lib/scr-highlights.ts");
const scrProfile = read("app/lib/scr-profile.ts");
const scrSettings = read("app/lib/scr-settings.ts");
const scrLifetime = read("app/lib/scr-lifetime.ts");

/* ---- contraste WCAG 2.1, calculado (no copiado de un comentario) ---- */
function channels(hex: string): [number, number, number] {
  let body = hex.replace("#", "");
  if (body.length === 3) body = body.split("").map((c) => c + c).join("");
  return [0, 2, 4].map((i) => parseInt(body.slice(i, i + 2), 16)) as [number, number, number];
}
function luminance(hex: string): number {
  const [r, g, b] = channels(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
/** Composición alfa de `fg` sobre `bg` (para tintes rgba de la fila propia). */
function over(fg: string, bg: string, alpha: number): string {
  const F = channels(fg), B = channels(bg);
  return "#" + F.map((v, i) => Math.round(v * alpha + B[i] * (1 - alpha))
    .toString(16).padStart(2, "0")).join("").toUpperCase();
}
export function contrast(a: string, b: string): number {
  const l1 = Math.max(luminance(a), luminance(b));
  const l2 = Math.min(luminance(a), luminance(b));
  return (l1 + 0.05) / (l2 + 0.05);
}

/** Valores REALES leídos de tokens.css: si alguien cambia el hex, el test recalcula. */
function token(name: string): string {
  const m = tokens.match(new RegExp(`${name}:(#[0-9A-Fa-f]{6})`));
  if (!m) throw new Error(`token ${name} no declarado en tokens.css`);
  return m[1];
}
const GOLD = token("--tier-gold");
const PLATINUM = token("--tier-platinum");
const BRONZE = token("--tier-bronze");
const INK_700 = token("--ink-700");
const BLACK = token("--otr-black");
const SUCCESS = token("--win");
const WHITE = "#FFFFFF";
const ORANGE = "#F25623";

describe("ronda 2 de color · el podio se pinta con metales, no con el acento", () => {
  it("el 1º del dashboard es ORO relleno y ya no el degradado naranja", () => {
    expect(screens).toMatch(/\.dash-lb \.lb-tile--1\{background:var\(--tier-gold\)/);
    expect(screens).not.toMatch(/\.dash-lb \.lb-tile--1\{background:linear-gradient\([^}]*--otr-green/);
  });

  it("el 1º del Debate Hub (podio gemelo) recibe el MISMO oro", () => {
    // El mismo pedido aplicado a las dos pantallas que pintan un podio: si solo cambiara
    // una, quedaría la versión naranja escondida detrás de la pestaña "Leaderboard".
    expect(screens).toMatch(/\.pod--1\{background:var\(--tier-gold\)/);
    expect(screens).not.toMatch(/\.pod--1\{background:linear-gradient\([^}]*--otr-green/);
  });

  it("el 2º va en platino y el 3º en bronce, en las dos pantallas", () => {
    for (const rule of [
      /\.dash-lb \.lb-tile--2\{border-top:3px solid var\(--tier-platinum\)/,
      /\.dash-lb \.lb-tile--3\{border-top:3px solid var\(--tier-bronze\)/,
      /\.pod--2\{border-top:3px solid var\(--tier-platinum\)/,
      /\.pod--3\{border-top:3px solid var\(--tier-bronze\)/,
    ]) expect(screens).toMatch(rule);
  });

  it("los builders emiten la clase del PUESTO en los tres tiles", () => {
    // Sin `lb-tile--2/--3` y `pod--2/--3` en el marcado, las reglas de arriba no llegan
    // a pintarse nunca: el CSS solo, aquí, no basta.
    expect(scrCore).toContain('class="lb-tile lb-tile--${place}');
    expect(scrDebate).toContain('class="pod pod--${place}');
  });

  it("los tres metales cumplen AA en su superficie (contraste CALCULADO)", () => {
    // 1º: relleno oro con toda su tipografía en negro.
    expect(contrast(BLACK, GOLD)).toBeGreaterThanOrEqual(4.5);
    // 2º y 3º: número de puesto y cinta de 3px sobre el tile --ink-700.
    expect(contrast(PLATINUM, INK_700)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(BRONZE, INK_700)).toBeGreaterThanOrEqual(4.5);
    // Y contra la card negra que los rodea.
    expect(contrast(BRONZE, BLACK)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(GOLD, BLACK)).toBeGreaterThanOrEqual(4.5);
  });

  it("el oro NO se lee como el naranja de marca (es otro color, no otro tono)", () => {
    // La queja es "naranja intenso". Se mide con el CROMA (max-min de los canales):
    // el naranja está en 207 y los metales por debajo de 160 — el ojo los separa.
    const chroma = (hex: string) => Math.max(...channels(hex)) - Math.min(...channels(hex));
    expect(chroma(ORANGE)).toBeGreaterThan(200);
    for (const metal of [GOLD, PLATINUM, BRONZE]) expect(chroma(metal)).toBeLessThan(160);
  });
});

describe("ronda 2 de color · la fila propia se destaca con contraste, no con naranja", () => {
  it("ni el dashboard ni el Debate Hub tiñen de naranja la fila del usuario", () => {
    const filaDash = screens.match(/\.dash-lb \.lb-row--me\{[^}]*\}/)?.[0] || "";
    const filaHub = screens.match(/\.lbrow--you\{[^}]*\}/)?.[0] || "";
    for (const fila of [filaDash, filaHub]) {
      expect(fila).not.toContain("242,86,35");
      expect(fila).not.toContain("--otr-green");
      expect(fila).toContain("--otr-white");
    }
  });

  it("la cifra y la posición propias dejan de ser naranjas", () => {
    expect(screens).toMatch(/\.dash-lb \.lb-row--me \.lb-pos,\.dash-lb \.lb-row--me \.lb-xp\{color:#fff\}/);
    expect(screens).toMatch(/\.lbrow--you \.lb-r,\.lbrow--you \.lb-x\{color:#fff\}/);
  });

  it("el «eres tú» sigue leyéndose de un vistazo (contraste CALCULADO)", () => {
    // El tinte rgba(255,255,255,.10) compone #2E2E2E sobre la card #171717.
    const tinte = over(WHITE, BLACK, 0.10);
    // Texto propio en blanco puro sobre ese tinte: muy por encima de AA...
    expect(contrast(WHITE, tinte)).toBeGreaterThanOrEqual(4.5);
    // ...y la barra de 2px que IDENTIFICA la fila, contra la card, por encima del 3:1
    // que WCAG 1.4.11 pide a un indicador de estado.
    expect(contrast(WHITE, BLACK)).toBeGreaterThanOrEqual(3);
  });
});

describe("ronda 2 de color · chips, iconos y halos en negro/blanco/grises", () => {
  it("el chip del premio del 1º es negro con texto blanco, no naranja oscuro", () => {
    expect(screens).toMatch(/\.dash-lb \.lb-tile--1 \.lb-prize\{[^}]*background:var\(--otr-black\)[^}]*color:#fff/);
    expect(screens).toMatch(/\.pod--1 \.pod-t\{background:var\(--otr-black\);[^}]*color:#fff/);
    expect(contrast(WHITE, BLACK)).toBeGreaterThanOrEqual(4.5);
  });

  it("los chips de categoría de highlights piden `paper` en las DOS pantallas", () => {
    // `black` no serviría en la lista larga: la fila ES una card #171717 y el chip
    // desaparecería sobre ella. `paper` (blanco con texto negro) recorta en las dos.
    expect(scrCore).toContain("C.chip(esc(h.category), 'paper', { cls: 'hl-tag' })");
    expect(scrHighlights).toContain('C.chip(catLabel(h.category), "paper", { cls: "hlv-tag" })');
    expect(screens).toMatch(/\.chip--paper\{background:var\(--otr-white\);color:var\(--otr-black\)\}/);
    expect(contrast(BLACK, WHITE)).toBeGreaterThanOrEqual(4.5);
  });

  it("el trofeo de la cabecera del leaderboard va en oro, no en naranja", () => {
    expect(screens).toMatch(/\.dash-lb \.dlb-head h3 \.ic\{[^}]*color:var\(--tier-gold\)\}/);
    expect(scrDebate).toContain("color:var(--tier-gold)\">${IC.trophy}");
    expect(scrDebate).not.toContain("color:var(--otr-green)\">${IC.trophy}");
  });

  it("el halo de las cards negras deja de ser naranja", () => {
    const halo = screens.match(/\.card--dark\.card--glow::before\{[^}]*\}/)?.[0] || "";
    expect(halo).not.toContain("242,86,35");
    expect(halo).toContain("rgba(255,255,255,.07)");
  });
});

describe("ronda 2 de color · los logros son metal, no naranja", () => {
  it("la medalla de insignia y el sello del certificado usan oro→bronce", () => {
    for (const rule of [
      /\.badge-medal\.gold,\.badge-medal\.sky\{background:radial-gradient\(circle at 35% 30%,var\(--tier-gold\),var\(--tier-bronze\)\)/,
      /\.cert \.seal\{[^}]*radial-gradient\(circle at 35% 30%,var\(--tier-gold\),var\(--tier-bronze\)\)/,
    ]) expect(screens).toMatch(rule);
  });

  it("su icono pasa a NEGRO: es una MEJORA de contraste medida, no un empate", () => {
    // Antes: icono blanco sobre el naranja de marca. Ahora: icono negro sobre el metal.
    expect(screens).toMatch(/\.badge-medal\.gold,\.badge-medal\.sky\{[^}]*color:var\(--text-on-accent\)/);
    expect(screens).toMatch(/\.cert \.seal\{[^}]*color:var\(--text-on-accent\)/);
    expect(contrast(BLACK, GOLD)).toBeGreaterThan(contrast(WHITE, ORANGE));
    expect(contrast(BLACK, BRONZE)).toBeGreaterThanOrEqual(4.5);
  });

  it("«GANADA» usa el verde de completado y el certificado oficial, el negro", () => {
    // Una insignia ganada es un hecho consumado: la regla del cliente para eso ya existía
    // desde la ronda 1 («Para completed - verde»). No se inventa un color nuevo.
    expect(scrProfile).toContain("C.chip(t(\"profile.earned\"), 'done')");
    expect(scrProfile).toContain("C.chip(t(\"profile.officialCert\"), 'black', { ic: 'award' })");
    expect(contrast(BLACK, SUCCESS)).toBeGreaterThanOrEqual(4.5);
  });
});

describe("ronda 2 de color · avatares y switches sin naranja", () => {
  it("ningún avatar se pinta con el naranja oscuro --otr-sky-lo", () => {
    // Era el mismo `bg` copiado en seis sitios: marketplace, perfil, familia, ajustes y
    // comunidad. Todos van al gris neutro --n-600 (blanco encima = 8,45:1).
    for (const [name, src] of Object.entries({
      "scr-marketplace.ts": read("app/lib/scr-marketplace.ts"),
      "scr-profile.ts": scrProfile,
      "scr-parent.ts": read("app/lib/scr-parent.ts"),
      "scr-settings.ts": scrSettings,
      "scr-community.ts": read("app/lib/scr-community.ts"),
    })) {
      const avatares = src.split("\n").filter((l) => /avatar/i.test(l) && /--otr-sky-lo|--otr-green-lo/.test(l));
      expect(avatares, `${name} sigue pintando un avatar en naranja`).toEqual([]);
    }
    expect(contrast(WHITE, token("--n-600"))).toBeGreaterThanOrEqual(4.5);
  });

  it("el switch ENCENDIDO es negro (el «on» que ya usaba el resto del sistema)", () => {
    expect(scrSettings).not.toContain('on ? "var(--otr-green)"');
    expect(scrSettings.match(/on \? "var\(--otr-black\)"/g) || []).toHaveLength(2);
    expect(scrLifetime).toContain('pp.enabled ? "var(--otr-black)"');
    // La perilla blanca sobre la pista negra, muy por encima del 3:1 de WCAG 1.4.11
    // (el naranja anterior se quedaba en 3,43:1 justo).
    expect(contrast(WHITE, BLACK)).toBeGreaterThanOrEqual(3);
  });
});

describe("ronda 2 de color · lo que el cliente dijo que se QUEDA sigue en su sitio", () => {
  it("la barrita de 3px de los títulos de sección sigue siendo naranja", () => {
    // Es el último vestigio de identidad de marca y NO entra en "acento naranja intenso".
    // Si algún día se quita, que sea por decisión explícita y no de refilón.
    expect(screens).toMatch(/\.sec-title::before\{[^}]*background:var\(--otr-green\)\}/);
  });

  it("el chip sólido de acento sigue existiendo para EN VIVO/TORNEO/HOY", () => {
    // La ronda 1 lo dejó por escrito en tokens.css. Esta ronda NO lo toca: se limita a
    // dejar de PEDIRLO donde no correspondía (categorías de highlights, premios, logros).
    expect(screens).toMatch(/\.chip--accent\{background:var\(--otr-green\)/);
  });

  it("el botón de GRABAR se queda en naranja a propósito", () => {
    // Único control donde el color ES la función (grabar), y su estado activo ya vive en
    // --danger. Queda anotado aquí para que el próximo que barra naranja sepa que no es
    // un olvido, sino una decisión de esta ronda.
    expect(screens).toMatch(/\.rec-btn\{[^}]*background:var\(--otr-green\)/);
  });
});
