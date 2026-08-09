/* [PERF-P] GUARDIÁN del micro-caché global de getAppData.
   El caché de app/lib/cache.ts vive en el PROCESO y su clave NO acepta userId: es para datos
   idénticos para todo el mundo (catálogo publicado, insignias, niveles, browse del marketplace,
   agregados de Review, torneos próximos). Meter ahí algo que dependa del usuario serviría los
   datos de una persona a otra — el fallo más caro posible en este archivo.

   Este test ejercita el getAppData REAL (Prisma mockeado, como el resto de la suite) con DOS
   usuarios seguidos DENTRO de la misma ventana de TTL, que es justo el escenario donde una
   clave mal elegida se nota. Comprueba las dos mitades del contrato:

     1. lo GLOBAL se comparte  → el segundo usuario ve exactamente el mismo catálogo/marketplace
        (si alguien quita un cached() la prueba sigue verde: eso no es un fallo, solo más lento);
     2. lo PERSONAL nunca se comparte → ni un dato del primer usuario aparece en el payload del
        segundo. Incluye el caso fino que motivó el test: `tournaments[].registered` se deriva
        ahora de una consulta por usuario mientras la LISTA de torneos viene del caché global;
        si ese flag volviera a colgarse de la lista cacheada, el segundo usuario heredaría las
        inscripciones del primero y esta prueba se pondría roja. */
import { describe, it, expect, vi, beforeAll } from "vitest";

/* eslint-disable @typescript-eslint/no-explicit-any */

const box = vi.hoisted(() => ({ db: null as any }));
vi.mock("../app/lib/db", () => ({
  db: new Proxy({}, { get: (_t, p: string) => (p === "then" ? undefined : box.db[p]) }),
}));

import { getAppData } from "../app/lib/queries";
import { invalidate } from "../app/lib/cache";

const baseUser = {
  initials: "XX", level: "OTR Competitor", streak: 0, headline: "", bio: "", teachingStyle: "",
  formats: "", location: "", avatarUrl: null, preferences: null, debateRd: 80, debateTier: "Gold",
  speakerAvg: 0, speakerRounds: 0, leaderboardOptIn: true, ageBand: "adult",
  placedAt: new Date("2026-01-10T12:00:00.000Z"), membership: "free", membershipSince: null,
  publicSlug: null, publicProfile: false, lang: "es", notificationPrefs: null, totpSecret: null,
};
const ANA = { ...baseUser, id: "u-ana", name: "Ana Uno", email: "ana@otr.do", role: "STUDENT", xp: 3120, debateRating: 1720 };
const BETO = { ...baseUser, id: "u-beto", name: "Beto Dos", email: "beto@otr.do", role: "STUDENT", xp: 40, debateRating: 1100 };

const TOURNAMENT = {
  id: "t-1", name: "Copa Lincoln-Douglas RD", format: "LD", region: "RD", modality: "presencial",
  startsAt: new Date("2026-08-15T17:00:00.000Z"), status: "UPCOMING", entryCents: 0,
  ageDivision: "", source: "",
};
const COURSE = {
  id: "c-pf", code: "PF-101", name: "Public Forum I", nameEn: null, color: "accent", coachName: "Saúl Méndez",
  priceCents: 0, format: "PF", modality: "online", summary: "", summaryEn: null,
  welcomeVideoKind: null, welcomeVideoSrc: null, studentsCount: 12, modules: [],
};
const BADGE = { id: "b-1", name: "Primer discurso", description: "", icon: "mic", tone: "accent", xp: 120, position: 0 };

function defaultFor(method: string): any {
  if (method === "findMany" || method === "groupBy") return [];
  if (method === "count") return 0;
  if (method === "aggregate") return { _avg: {}, _count: { _all: 0 }, _sum: {}, _max: {}, _min: {} };
  return null;
}

/** Prisma falso: lo GLOBAL es fijo; lo por-usuario se resuelve mirando el `where` de la query. */
function makeDb(): any {
  const overrides: Record<string, any> = {
    "user.findUnique": (args: any) => (args?.where?.email === BETO.email ? BETO : ANA),
    "course.findMany": [COURSE],
    "badge.findMany": [BADGE],
    "tournament.findMany": [TOURNAMENT],
    // POR USUARIO: solo Ana está inscrita en el torneo.
    "tournamentRegistration.findMany": (args: any) =>
      (args?.where?.userId === ANA.id ? [{ tournamentId: "t-1" }] : []),
    // POR USUARIO: solo Ana tiene ledger de actividad.
    "activityEvent.findMany": (args: any) =>
      (args?.where?.userId === ANA.id
        ? [{ id: "ae-1", userId: ANA.id, type: "lesson_done", title: "Ana completó una lección", detail: "", xp: 20, meta: null, createdAt: new Date("2026-08-08T12:00:00.000Z") }]
        : []),
    // POR USUARIO: solo Ana tiene notificaciones.
    "notification.findMany": (args: any) =>
      (args?.where?.OR?.[0]?.userId === ANA.id
        ? [{ id: "n-1", userId: ANA.id, title: "Secreto de Ana", body: "", unread: true, position: 0, kind: "info", href: null }]
        : []),
  };
  const dbProxy: any = new Proxy({}, {
    get(_t, model: string) {
      if (model === "then") return undefined;
      if (model === "$transaction") return async (x: any) => (Array.isArray(x) ? Promise.all(x) : x(dbProxy));
      if (model === "$queryRaw" || model === "$queryRawUnsafe") return async () => [];
      return new Proxy({}, {
        get: (_t2, method: string) => async (args: any) => {
          const o = overrides[`${model}.${String(method)}`];
          if (o === undefined) return defaultFor(String(method));
          return typeof o === "function" ? o(args) : o;
        },
      });
    },
  });
  return dbProxy;
}

let ana: any;
let beto: any;

beforeAll(async () => {
  box.db = makeDb();
  invalidate(); // arranca con el caché frío para que la 1ª llamada sea la que lo llena
  ana = await getAppData(ANA.email, "es", ANA);
  beto = await getAppData(BETO.email, "es", BETO); // dentro del TTL: lee del caché que llenó Ana
});

describe("PERF · el micro-caché global no filtra datos entre usuarios", () => {
  it("lo GLOBAL sale idéntico para los dos (catálogo, insignias, marketplace, torneos)", () => {
    expect(beto.catalog).toEqual(ana.catalog);
    expect(beto.badges).toEqual(ana.badges);
    expect(beto.marketplace.coaches).toEqual(ana.marketplace.coaches);
    expect(beto.tournaments.map((t: any) => t.id)).toEqual(ana.tournaments.map((t: any) => t.id));
    expect(ana.catalog.length).toBe(1); // el mock sí trajo catálogo (si no, el test sería vacío)
  });

  it("cada quien ve SU identidad, no la del que llenó el caché", () => {
    expect(ana.me.email).toBe(ANA.email);
    expect(beto.me.email).toBe(BETO.email);
    expect(beto.me.name).toBe(BETO.name);
    expect(beto.xp).toBe(BETO.xp); // el XP viaja en su propia clave de primer nivel, no dentro de `me`
    expect(beto.xp).not.toBe(ana.xp);
  });

  it("`registered` del torneo es POR USUARIO aunque la lista venga del caché global", () => {
    expect(ana.tournaments[0].registered).toBe(true);
    expect(beto.tournaments[0].registered).toBe(false);
    expect(ana.lifetime.ledger.tournaments).toBe(1);
    expect(beto.lifetime.ledger.tournaments).toBe(0);
  });

  it("nada personal de la primera usuaria aparece en el payload de la segunda", () => {
    const crudo = JSON.stringify(beto);
    for (const rastro of [ANA.email, ANA.name, "Ana completó una lección", "Secreto de Ana"]) {
      expect(crudo).not.toContain(rastro);
    }
    // …y no es que el payload de Beto esté vacío: su propio nombre sí está.
    expect(crudo).toContain(BETO.name);
  });
});
