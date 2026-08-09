/* [RONDA 3 · Isaac] "En el dashboard el leaderboard debe enseñar todos — así como aquí"
   (captura del mockup: podio 2-1-3 a la izquierda + lista de puestos 4-8 a la derecha con
   la fila del usuario resaltada).

   El defecto NO estaba en la vista: el layout de dos columnas ya existía. Estaba en los
   DATOS — el ranking mensual excluye a los menores por privacidad y el seed solo tenía
   3 alumnos adultos, así que `DB.leaderboard.rows` traía 3 filas y la card caía siempre
   a "solo podio". Estos tests fijan las dos mitades:
     · la vista, con 8 filas, pinta la lista 4-8 y marca la fila propia;
     · con 3 filas sigue degradando al podio a ancho completo (nada de media card vacía);
   y de paso los dos arreglos que entraron con ellos: los premios en inglés (fuga de i18n
   que se ve en la captura del cliente) y el enlace a Instagram de cada highlight. */
import { describe, it, expect, beforeEach, vi } from "vitest";

/* eslint-disable @typescript-eslint/no-explicit-any */
(globalThis as any).window = (globalThis as any).window || {};
const win: any = (globalThis as any).window;
win.api = async () => ({});
win.go = () => {};
win.toast = () => {};

import { DB } from "../app/lib/data";
import { S as SCore } from "../app/lib/scr-core";
import { t } from "../app/lib/i18n";

const Core: any = SCore;

/** Una fila del board mensual, con la forma EXACTA que emite queries.ts. */
const row = (rank: number, name: string, xp: number, extra: any = {}) =>
  ({ rank, name, initials: name.slice(0, 2).toUpperCase(), rating: 1500, tier: "Silver", you: false, xp, ...extra });

/** Los 8 elegibles de la temporada sembrada (Analía 5ª, dentro de la LISTA). */
const OCHO = [
  row(1, "Isabella Guzmán", 840, { prize: "Beca completa · próximo módulo" }),
  row(2, "Mariela Valdez", 780, { prize: "Sesión 1:1 con coach" }),
  row(3, "Leonel Peña", 700, { prize: "Kit oficial OTR + credencial" }),
  row(4, "Yamilet Bautista", 620),
  row(5, "Analía Reyes", 560, { you: true }),
  row(6, "Silvana Espaillat", 360),
  row(7, "Rafael Disla", 300),
  row(8, "Noelia Cabrera", 240),
];

function hydrate(rows: any[], me: any, extra: any = {}) {
  for (const k of Object.keys(DB)) delete (DB as any)[k];
  Object.assign(DB, {
    me: { name: "Analía Reyes", initials: "AR", role: "student", level: "OTR Competitor" },
    xp: 3120, // XP DE POR VIDA — no es la de la temporada (ver el test de la fila de cortesía)
    courses: [], courseModules: [], coursesContent: [], catalog: [], skills: [], badges: [],
    events: [], activity: [], notifications: [], messages: [], levels: [], myBookings: [],
    leaderboard: { period: { label: "agosto", endsInDays: 22 }, rows, me },
    ...extra,
  });
}

beforeEach(() => {
  hydrate(OCHO, { rank: 5, rating: 1720, tier: "Gold", xp: 560 });
});

describe("A · la tarjeta enseña a TODOS: podio + lista de puestos 4-8", () => {
  it("con 8 elegibles pinta el podio Y la lista, en columnas (sin --solo)", () => {
    const html = Core.dashboard.render({ role: "student" });
    expect(html).toContain("dlb-grid");
    expect(html).not.toContain("dlb-grid--solo");   // dos columnas, como el mockup
    expect(html.match(/class="lb-tile/g)).toHaveLength(3);
    expect(html.match(/class="lb-row/g)).toHaveLength(5); // puestos 4,5,6,7,8
  });

  it("el podio va en orden 2-1-3 y solo el 1º lleva corona y tarjeta naranja", () => {
    const html = Core.dashboard.render({ role: "student" });
    const orden = [...html.matchAll(/class="lb-tname">([^<]+)/g)].map((m) => m[1].trim());
    expect(orden).toEqual(["Mariela Valdez", "Isabella Guzmán", "Leonel Peña"]);
    expect(html.match(/lb-tile--1/g)).toHaveLength(1); // solo la tarjeta del 1º
    expect(html.match(/lb-crown/g)).toHaveLength(1);   // y solo ella lleva corona
  });

  it("la lista lista los puestos 4 al 8 con su XP de temporada", () => {
    const html = Core.dashboard.render({ role: "student" });
    const puestos = [...html.matchAll(/class="lb-pos tnum">(\d+)</g)].map((m) => m[1]);
    expect(puestos).toEqual(["4", "5", "6", "7", "8"]);
    expect(html).toMatch(/>620 XP</);
    expect(html).toMatch(/>240 XP</);
  });

  it("la fila del usuario va RESALTADA y con el sufijo '· tú'", () => {
    const html = Core.dashboard.render({ role: "student" });
    expect(html.match(/lb-row lb-row--me/g)).toHaveLength(1);
    expect(html).toContain(`Analía Reyes · ${t("core.youSuffix")}</span>`);
    // y el resaltado es de ESA fila: nadie más lo lleva
    expect(html).not.toContain(`Silvana Espaillat · ${t("core.youSuffix")}`);
  });

  it("si el usuario cae en el podio, el resaltado va en su tarjeta (no se duplica)", () => {
    const podio = OCHO.map((r) => ({ ...r, you: r.rank === 2 }));
    hydrate(podio, { rank: 2, rating: 1720, tier: "Gold", xp: 780 });
    const html = Core.dashboard.render({ role: "student" });
    expect(html).toContain("lb-tile--me");
    expect(html).not.toContain("lb-row--me");
  });
});

describe("B · degradación: con 3 elegibles la card sigue siendo digna", () => {
  it("sin puestos 4+ el podio ocupa la card entera y NO se pinta lista vacía", () => {
    const tres = OCHO.slice(0, 3).map((r, i) => ({ ...r, you: i === 1 }));
    hydrate(tres, { rank: 2, rating: 1720, tier: "Gold", xp: 780 });
    const html = Core.dashboard.render({ role: "student" });
    expect(html).toContain("dlb-grid--solo");
    expect(html).not.toContain('class="lb-list"');
    expect(html).not.toContain("lb-row");
    expect(html.match(/class="lb-tile/g)).toHaveLength(3);
  });

  it("sin ningún elegible la sección entera desaparece (no card vacía)", () => {
    hydrate([], { rank: 0, rating: 1720, tier: "Gold", xp: 0 });
    const html = Core.dashboard.render({ role: "student" });
    expect(html).not.toContain("dash-lb");
  });
});

describe("C · fila de cortesía: quien queda fuera del top 8 se ve con SU XP del mes", () => {
  it("usa la XP de la temporada (leaderboard.me.xp), no la XP de por vida (DB.xp)", () => {
    const sinMi = OCHO.map((r) => ({ ...r, you: false, name: `Alumno ${r.rank}` }));
    hydrate(sinMi, { rank: 12, rating: 1720, tier: "Gold", xp: 180 });
    const html = Core.dashboard.render({ role: "student" });
    expect(html.match(/class="lb-row/g)).toHaveLength(6);  // 4-8 + la mía
    expect(html).toContain(`Analía Reyes · ${t("core.youSuffix")}`);
    expect(html).toMatch(/>180 XP</);      // XP del MES
    expect(html).not.toMatch(/3\.?120 XP/); // nunca la de por vida
  });
});

describe("D · 'Lo mejor de la temporada': 4 en vista previa, cada una a su post de IG", () => {
  const HL = [
    { id: "h1", title: "Harvard JV Champions", dateLabel: "7 jul", category: "Final", imageUrl: "/img/a.jpg", instagramUrl: "https://instagram.com/p/EJEMPLO1" },
    { id: "h2", title: "Sin post", dateLabel: "15 jul", category: "Torneo", imageUrl: "/img/b.jpg", instagramUrl: "" },
    { id: "h3", title: "Ojo", dateLabel: "", category: "Equipo", imageUrl: "/img/c.jpg", instagramUrl: "javascript:alert(1)" },
    { id: "h4", title: "Ruta interna", dateLabel: "", category: "Equipo", imageUrl: "/img/d.jpg", instagramUrl: "/eventos" },
    { id: "h5", title: "Quinta", dateLabel: "", category: "Final", imageUrl: "/img/e.jpg", instagramUrl: "https://instagram.com/p/EJEMPLO5" },
  ];

  beforeEach(() => {
    hydrate(OCHO, { rank: 5, rating: 1720, tier: "Gold", xp: 560 }, { highlights: HL });
  });

  it("solo 4 tarjetas en el dashboard (la 5ª vive en la vista larga)", () => {
    const html = Core.dashboard.render({ role: "student" });
    expect(html.match(/class="hl(?:"| )/g)).toHaveLength(4);
    expect(html).not.toContain("Quinta");
  });

  it("con post de IG la tarjeta es un enlace externo seguro; sin post no navega", () => {
    const html = Core.dashboard.render({ role: "student" });
    expect(html).toContain('<a class="hl hl--ig" href="https://instagram.com/p/EJEMPLO1" target="_blank" rel="noopener noreferrer">');
    expect(html).toContain('<article class="hl">');            // la de "Sin post"
    expect(html.match(/hl--ig/g)).toHaveLength(1);
  });

  it("una URL que no sea http(s) NUNCA se convierte en enlace", () => {
    const html = Core.dashboard.render({ role: "student" });
    expect(html).not.toContain("javascript:");
    expect(html).not.toContain('href="/eventos"');
  });

  it("'Ver todo' deja de mandar a Eventos: va a la vista propia de highlights", () => {
    const html = Core.dashboard.render({ role: "student" });
    expect(html).toContain(`<a class="hl-all" href="#" data-go="highlights">${t("core.dashHighlightsAll")}</a>`);
    expect(html).not.toContain('class="hl-all" href="#" data-go="events"');
  });
});

/* ---- E · capa de datos: premios traducidos + URL de IG saneada en el payload ----
   Mismo patrón que tests/i18n-payload-lang.test.ts: getAppData REAL con Prisma mockeado. */
const box = vi.hoisted(() => ({ db: null as any }));
vi.mock("../app/lib/db", () => ({
  db: new Proxy({}, { get: (_t: any, p: string) => (p === "then" ? undefined : box.db[p]) }),
}));

const ME_ROW = {
  id: "u-ar", name: "Analía Reyes", email: "analia.reyes@otr.do", role: "STUDENT",
  initials: "AR", level: "OTR Competitor", xp: 3120, streak: 5, lang: "es",
  debateRating: 1720, debateRd: 80, debateTier: "Gold", ageBand: "adult",
  membership: "free", publicProfile: false, leaderboardOptIn: true,
  placedAt: new Date("2026-01-10T12:00:00.000Z"),
};

function makeDb(overrides: Record<string, any>): any {
  const proxy: any = new Proxy({}, {
    get(_t, model: string) {
      if (model === "then") return undefined;
      if (model === "$transaction") return async (x: any) => (Array.isArray(x) ? Promise.all(x) : x(proxy));
      if (model === "$queryRaw" || model === "$queryRawUnsafe") return async () => [];
      return new Proxy({}, {
        get: (_t2, method: string) => async (args: any) => {
          const o = overrides[`${model}.${String(method)}`];
          if (o !== undefined) return typeof o === "function" ? o(args) : o;
          if (method === "findMany" || method === "groupBy") return [];
          if (method === "count") return 0;
          if (method === "aggregate") return { _avg: {}, _count: { _all: 0 }, _sum: {}, _max: {}, _min: {} };
          return null;
        },
      });
    },
  });
  return proxy;
}

describe("E · payload: el premio habla el idioma del alumno y el post de IG va saneado", () => {
  let es: any; let en: any;

  beforeEach(async () => {
    const { getAppData } = await import("../app/lib/queries");
    box.db = makeDb({
      "user.findUnique": ME_ROW,
      // Rank 3 SIN textEn a propósito: prueba el fallback al español.
      "seasonPrize.findMany": [
        { id: "sp1", rank: 1, text: "Beca completa · próximo módulo", textEn: "Full scholarship · next module", position: 0 },
        { id: "sp2", rank: 2, text: "Sesión 1:1 con coach", textEn: "1:1 session with a coach", position: 1 },
        { id: "sp3", rank: 3, text: "Kit oficial OTR + credencial", textEn: null, position: 2 },
      ],
      "highlight.findMany": [
        { id: "h1", title: "Harvard JV", category: "Final", date: null, imageUrl: "", instagramUrl: "https://instagram.com/p/EJEMPLO1", position: 0 },
        { id: "h2", title: "Sin post", category: "Torneo", date: null, imageUrl: "", instagramUrl: null, position: 1 },
        { id: "h3", title: "Peligro", category: "Equipo", date: null, imageUrl: "", instagramUrl: "javascript:alert(1)", position: 2 },
        { id: "h4", title: "Interna", category: "Equipo", date: null, imageUrl: "", instagramUrl: "/eventos", position: 3 },
      ],
      // Board mensual: la agregación de XP + los usuarios elegibles (tres, para que
      // existan los tres puestos del podio y con ellos los tres premios).
      "activityEvent.groupBy": (args: any) =>
        (args?.by?.[0] === "userId" && args?._sum?.xp
          ? [{ userId: "u-is", _sum: { xp: 840 } }, { userId: "u-mv", _sum: { xp: 780 } }, { userId: "u-ar", _sum: { xp: 560 } }]
          : []),
      "user.findMany": (args: any) =>
        (args?.where?.leaderboardOptIn
          ? [
              { id: "u-is", name: "Isabella Guzmán", initials: "IG", debateRating: 1850, debateTier: "Platinum" },
              { id: "u-mv", name: "Mariela Valdez", initials: "MV", debateRating: 1665, debateTier: "Gold" },
              { id: "u-ar", name: "Analía Reyes", initials: "AR", debateRating: 1720, debateTier: "Gold" },
            ]
          : []),
    });
    // El caché de queries.ts es por proceso: dos idiomas seguidos comparten las FILAS
    // (que traen los dos textos), no el texto elegido — eso es justo lo que se comprueba.
    es = await getAppData(ME_ROW.email, "es", ME_ROW);
    en = await getAppData(ME_ROW.email, "en", ME_ROW);
  });

  it("en ES los premios salen en español (el catálogo no cambia)", () => {
    const byRank = new Map(es.leaderboard.rows.map((r: any) => [r.rank, r.prize]));
    expect(byRank.get(1)).toBe("Beca completa · próximo módulo");
    expect(byRank.get(2)).toBe("Sesión 1:1 con coach");
    expect(byRank.get(3)).toBe("Kit oficial OTR + credencial");
  });

  it("en EN el premio sale traducido: la card deja de mezclar idiomas", () => {
    const byRank = new Map(en.leaderboard.rows.map((r: any) => [r.rank, r.prize]));
    expect(byRank.get(1)).toBe("Full scholarship · next module");
    expect(byRank.get(2)).toBe("1:1 session with a coach");
    expect(String(byRank.get(1))).not.toMatch(/Beca/);
  });

  it("un premio SIN traducción cae al español en vez de quedarse vacío", () => {
    // rank 3 tiene textEn=null en el mock: se prefiere el premio real en el otro idioma
    // a una cajita en blanco.
    const byRank = new Map(en.leaderboard.rows.map((r: any) => [r.rank, r.prize]));
    expect(byRank.get(3)).toBe("Kit oficial OTR + credencial");
  });

  it("instagramUrl: pasa https, y todo lo que no sea http(s) queda en ''", () => {
    const byTitle = new Map(es.highlights.map((h: any) => [h.title, h.instagramUrl]));
    expect(byTitle.get("Harvard JV")).toBe("https://instagram.com/p/EJEMPLO1");
    expect(byTitle.get("Sin post")).toBe("");
    expect(byTitle.get("Peligro")).toBe("");   // javascript: → safeUrl lo mata
    expect(byTitle.get("Interna")).toBe("");   // ruta relativa: no es un post de IG
  });
});
