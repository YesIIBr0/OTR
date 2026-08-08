/* [GOAL E5 · 2026-08] Las deudas puntuales de la última ola, fijadas como contrato.
 *
 * Tres familias de regresión:
 *
 *  A) CONTRATO DE ESCAPE — queries.ts escapa el texto de usuario UNA vez al armar el
 *     payload y los builders lo pintan CRUDO. Cuando un builder lo re-escapaba, un hilo
 *     «Cross & rebuttal» se leía «Cross &amp; rebuttal» y un cuerpo con <b> mostraba
 *     «&lt;b&gt;» en pantalla. Las pruebas alimentan el builder con la MISMA forma que
 *     produce queries (escapado una vez) y exigen las dos mitades del contrato:
 *       · el carácter especial aparece UNA sola vez (nada de &amp;amp; / &amp;#39;),
 *       · y ni una sola etiqueta viva se cuela (cero inyección).
 *
 *  B) FECHAS CON IDIOMA — la consola de moderación formateaba con locale "es" FIJO, así
 *     que con la cookie en inglés se leía "Reported by … · 8 ago 2026".
 *
 *  C) MONEDA UNIFICADA — "$" es el único símbolo del producto (app/lib/money.ts). La
 *     membresía ("US$9") y la cuota de torneo ("RD$") eran la 2ª y la 3ª moneda.
 *
 * Además: el estado vacío de Mensajes tiene SALIDA, y las dos reglas de a11y que
 * faltaban en screens.css (anillo de foco del .rec-btn en reposo + reduce de .typing).
 */
import { describe, it, expect, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/* Stub de `window` ANTES de importar builders (mismo patrón que screens/i18n-dates). */
/* eslint-disable @typescript-eslint/no-explicit-any */
(globalThis as any).window = (globalThis as any).window || {};
const win: any = (globalThis as any).window;
win.api = async () => ({});
win.go = () => {};
win.toast = () => {};
/* eslint-enable @typescript-eslint/no-explicit-any */

/* getLang() lee `document.cookie` (es la fuente del idioma en el cliente). En Node no hay
   document: un stub mínimo con la propiedad `cookie` basta para conducir el idioma desde el
   test sin arrastrar jsdom, igual que el stub de `window` de arriba. */
(globalThis as any).document = (globalThis as any).document || { cookie: "" };
const setLang = (l: string) => { (globalThis as any).document.cookie = `otr_lang=${l}`; };

import { esc } from "../app/lib/esc";
import { DB } from "../app/lib/data";
import { fmtDayMonthYear, fmtDayMonthYearTimeRD } from "../app/lib/i18n";
import { S as SCommunity } from "../app/lib/scr-community";
import { renderBookings } from "../app/lib/scr-mybookings";
import { S as SLifetime } from "../app/lib/scr-lifetime";
import { dict as dEvents } from "../app/lib/i18n-keys/events";

/* eslint-disable @typescript-eslint/no-explicit-any */
const Comm: any = SCommunity;
const Lifetime: any = SLifetime;

// Sonda estándar de escape: un `&` y una etiqueta viva, como el hilo real del barrido.
const RAW = `Cross & rebuttal <b>ahora</b> con O'Neil`;
// Lo que un builder RECIBE del payload: exactamente esto, escapado UNA vez por queries.ts.
const ONCE = esc(RAW);

/** El HTML pinta el texto UNA sola vez y sin etiquetas vivas. */
function expectEscapedOnce(html: string) {
  // Doble escape: el `&` del payload («&amp;») vuelto a escapar da «&amp;amp;».
  expect(html, "doble escape del &").not.toContain("&amp;amp;");
  expect(html, "doble escape de la comilla").not.toContain("&amp;#39;");
  expect(html, "doble escape del <").not.toContain("&amp;lt;");
  // Y el texto sí está, escapado una vez.
  expect(html).toContain("Cross &amp; rebuttal");
  expect(html).toContain("O&#39;Neil");
  // Cero inyección: la etiqueta de la sonda nunca llega viva al HTML.
  expect(html, "inyección: <b> vivo").not.toContain("<b>ahora</b>");
}

beforeEach(() => {
  setLang("es");
});

/* ══════════════════════════ A · CONTRATO DE ESCAPE ══════════════════════════ */

describe("E5·1 — el FORO pinta al contrato de escape (una vez, sin inyección)", () => {
  it("listado de hilos: título, extracto, etiqueta y autor van crudos del payload", () => {
    // Forma EXACTA de queries.ts:2016 — todo escapado una vez salvo `last` (etiqueta nuestra).
    DB.forum = [
      { id: "t-1", title: ONCE, author: ONCE, ini: esc("O'N"), tag: ONCE, replies: 3, views: 9, pinned: true, last: "hace 2h", excerpt: ONCE },
    ];
    const html = Comm.forum.render();
    expectEscapedOnce(html);
  });

  it("hilo abierto: título, tag, autor y cuerpo del post van crudos del payload", () => {
    // Forma EXACTA de queries.ts:2017-2019 — `when` es la excepción (sin escapar en el payload).
    DB.forumThread = {
      id: "t-1", title: ONCE, tag: ONCE,
      posts: [{ author: ONCE, ini: esc("O'N"), role: "Coach", when: "hace 1h", op: true, body: ONCE }],
    };
    const html = Comm.forumThread.render();
    expectEscapedOnce(html);
  });

  it("`last`/`when` SÍ se escapan aquí: queries no los toca (son etiquetas nuestras)", () => {
    // Si un lastLabel/whenLabel trajera un carácter especial, el builder debe protegerlo:
    // es la única mitad del contrato que NO viene resuelta desde el servidor.
    DB.forum = [{ id: "t-1", title: "x", author: "x", ini: "XX", tag: "x", replies: 0, views: 0, pinned: false, last: "hace <2h", excerpt: "x" }];
    expect(Comm.forum.render()).toContain("hace &lt;2h");

    DB.forumThread = { id: "t-1", title: "x", tag: "x", posts: [{ author: "x", ini: "XX", role: "Coach", when: "hace <1h", op: false, body: "x" }] };
    expect(Comm.forumThread.render()).toContain("hace &lt;1h");
  });
});

describe("E5·11 — MIS RESERVAS pinta al contrato de escape", () => {
  const booking = (extra: Record<string, unknown> = {}) => ({
    id: "bk-1", status: "CONFIRMED", coachId: "u-c", coachName: ONCE, coachInitials: esc("O'N"),
    packageName: ONCE, slotLabel: "lun 16 jun · 4:00 PM", slotAtIso: "2099-06-16T20:00:00.000Z",
    durationMin: 60, upcoming: true, priceCents: 4500, priceLabel: "$45",
    escrowStatus: "HELD", videoUrl: "", recordingUrl: "", canReview: false, ...extra,
  });

  it("fila de PRÓXIMAS: nombre del coach y nombre del paquete no se re-escapan", () => {
    DB.myBookings = [booking()];
    expectEscapedOnce(renderBookings());
  });

  it("fila de HISTORIAL: mismo contrato", () => {
    DB.myBookings = [booking({ status: "COMPLETED", upcoming: false, canReview: false })];
    expectEscapedOnce(renderBookings());
  });

  it("`data-coach-name` CONSERVA el esc() extra a propósito (defensa de la inyección)", () => {
    // Ese atributo se lee con getAttribute() —que decodifica UNA vez— y va a innerHTML como
    // título del modal de reseña. Sin el esc() de más, un nombre con etiqueta llegaría VIVO
    // al innerHTML. Es la única excepción documentada al contrato en esta pantalla.
    DB.myBookings = [booking({ status: "COMPLETED", upcoming: false, canReview: true })];
    const html = renderBookings();
    expect(html).toContain("data-coach-name=");
    // El atributo lleva el doble escape (&amp;lt;) aunque el texto visible NO lo lleve.
    const attr = /data-coach-name="([^"]*)"/.exec(html);
    expect(attr).not.toBeNull();
    expect((attr as RegExpExecArray)[1]).toContain("&amp;lt;");
  });
});

/* ══════════════════════════ B · FECHAS CON IDIOMA ══════════════════════════ */

describe("E5·6 — las fechas de la consola de admin hablan el idioma activo", () => {
  // 8 de agosto de 2026 a mediodía UTC: mismo día calendario de UTC-12 a UTC+11, así el
  // test no depende de la TZ del proceso (mismo criterio que tests/i18n-dates.test.ts).
  const D = new Date("2026-08-08T12:00:00.000Z");
  const ES_TOKENS = /\b(lun|mar|mié|jue|vie|sáb|dom|ene|abr|ago|dic)\b/i;

  it("fmtDayMonthYear: '8 ago 2026' en ES · '8 Aug 2026' en EN", () => {
    expect(fmtDayMonthYear(D, "es")).toBe("8 ago 2026");
    expect(fmtDayMonthYear(D, "en")).toBe("8 Aug 2026");
    expect(fmtDayMonthYear(D, "en")).not.toMatch(ES_TOKENS);
  });

  it("fmtDayMonthYearTimeRD: conserva el AÑO y fija la hora RD (UTC-4)", () => {
    // 2026-08-09T01:30Z = 9:30 PM del 8 en RD: un servidor UTC no puede correr el día.
    const slot = new Date("2026-08-09T01:30:00.000Z");
    expect(fmtDayMonthYearTimeRD(slot, "es")).toBe("8 ago 2026 · 9:30 PM");
    expect(fmtDayMonthYearTimeRD(slot, "en")).toBe("8 Aug 2026 · 9:30 PM");
    expect(fmtDayMonthYearTimeRD(slot, "en")).not.toMatch(ES_TOKENS);
  });

  it("idioma raro → español; fecha ausente o inválida → cadena vacía", () => {
    expect(fmtDayMonthYear(D, "pt")).toBe("8 ago 2026");
    expect(fmtDayMonthYearTimeRD(D, undefined)).toContain("ago");
    for (const f of [fmtDayMonthYear, fmtDayMonthYearTimeRD]) {
      expect(f(null, "es")).toBe("");
      expect(f(undefined, "en")).toBe("");
      expect(f("no-es-una-fecha", "en")).toBe("");
    }
  });

  it("la cola de reportes RENDERIZADA en EN no trae la fecha en español", async () => {
    // El builder resuelve el idioma con getLang() en cada render (no lo captura al importar).
    const { S } = await import("../app/lib/scr-admin");
    const mod: any = S;
    const state = {
      loaded: true, loading: false, total: 1, tab: "reports",
      reports: [{
        id: "r-1", status: "OPEN", targetType: "message", targetId: "m-1",
        reason: "spam", reporterName: "Ana", createdAt: D.toISOString(),
      }],
      audit: { loaded: false, loading: false, error: false, entries: [], total: 0, page: 1 },
    };
    (globalThis as any).window.__mod = state;

    setLang("es");
    expect(mod.adminConsole.render(state)).toContain("8 ago 2026");

    setLang("en");
    const en = mod.adminConsole.render(state);
    expect(en).toContain("8 Aug 2026");
    expect(en).not.toContain("8 ago 2026");
  });
});

/* ══════════════════════════ C · MONEDA UNIFICADA ══════════════════════════ */

describe("E5·4/5 — una sola moneda visible: '$'", () => {
  it("membresía: el plan Free y los precios Pro salen en '$', nunca en 'US$'", () => {
    DB.membership = { tier: "free", sinceLabel: "Desde agosto 2026", prices: { proMonthly: "$9", proAnnual: "$79" } };
    const html = Lifetime.membership.render({ role: "student" });
    expect(html).toContain("$0");
    expect(html).not.toContain("US$");
  });

  it("membresía: los RESPALDOS del builder (payload sin prices) tampoco traen 'US$'", () => {
    DB.membership = { tier: "free" };
    expect(Lifetime.membership.render({ role: "student" })).not.toContain("US$");
  });

  it("torneos: la etiqueta del campo 'cuota' pide '$' en ES y EN, no 'RD$'", () => {
    for (const lang of ["es", "en"] as const) {
      const label = (dEvents as any)[lang]["events.tnFieldEntry"];
      expect(label).toContain("($)");
      expect(label).not.toContain("RD$");
    }
  });
});

/* ══════════════════════════ D · SALIDA + A11Y ══════════════════════════ */

describe("E5·2 — Mensajes sin conversaciones NO es un callejón sin salida", () => {
  it("el estado vacío trae un botón que navega a una pantalla real", () => {
    DB.messages = [];
    const html = Comm.messages.render();
    // Antes: 0 botones — el padre llegaba desde el portal y solo veía el buscador.
    expect(html).toContain('data-go="explore"');
    // Y la copy nombra el camino que EXISTE (la ficha del coach abre el hilo).
    expect(html).toContain("Enviar mensaje");
  });

  it("con conversaciones, el estado vacío no se pinta", () => {
    DB.messages = [{ id: "c1", ini: "SM", name: "Coach", last: "hola", when: "ahora", unread: 0, online: true, navy: true, messages: [] }];
    expect(Comm.messages.render()).not.toContain('data-go="explore"');
  });
});

describe("E5·8/9 — las dos reglas que faltaban en screens.css", () => {
  const css = readFileSync(join(process.cwd(), "app/styles/screens.css"), "utf8");

  it("K-01 bis: `.rec-btn` en REPOSO recupera el anillo de foco (sin perder su glow)", () => {
    expect(css).toContain(".rec-btn:focus-visible{box-shadow:var(--sh-glow),var(--ring)}");
  });

  it("K-12 bis: `.typing i` se detiene con prefers-reduced-motion", () => {
    const reduce = css.slice(css.indexOf("@media (prefers-reduced-motion:reduce){", css.indexOf("K-12")));
    expect(reduce).toContain(".typing i{animation:none;animation-play-state:paused}");
  });

  it("no queda NINGUNA animación infinita de screens.css fuera del bloque reduce", () => {
    // Selectores con `animation: … infinite` declarada en screens.css.
    const infinite = [...css.matchAll(/([.#][\w-]+(?:\s+\w+)?)\s*\{[^}]*animation:[^;}]*infinite[^;}]*[;}]/g)]
      .map((m) => m[1].trim());
    const reduce = css.slice(css.indexOf("@media (prefers-reduced-motion:reduce){", css.indexOf("K-12")));
    for (const sel of infinite) {
      expect(reduce, `${sel} anima en bucle y el bloque reduce no lo para`).toContain(sel);
    }
  });
});

describe("E5·10 — el modo 'restablecer contraseña' declara autocomplete", () => {
  const tsx = readFileSync(join(process.cwd(), "app/components/Auth.tsx"), "utf8");

  it("los dos campos de contraseña nueva piden 'new-password' al gestor", () => {
    for (const id of ["auth-new-password", "auth-confirm-password"]) {
      const line = tsx.split("\n").find((l) => l.includes(`id="${id}"`));
      expect(line, `sin campo ${id}`).toBeTruthy();
      expect(line, `${id} sin autoComplete`).toContain('autoComplete="new-password"');
    }
  });
});
