/* [GOAL A2 · F2] CABLEADO del idioma: ejercita getAppData() DE VERDAD.
   Los tests unitarios de tests/i18n-dates.test.ts prueban los formateadores, pero no que
   queries.ts les pase el idioma: borrar `, lang` de un call-site dejaba la suite verde.
   Aquí se llama al getAppData REAL (mismo código que sirve /api/app-data) con Prisma
   mockeado —sin base de datos, igual que el resto de la suite y que la CI— y se comprueban
   las etiquetas de fecha de las cuatro rutas que las generan:
     · myBookings[].slotLabel          (slotLabel → fmtDateTimeRD)
     · events[].when                   (eventDateLabel → fmtDateTimeRD)
     · lifetime.identity.memberSinceLabel   (fmtMemberSinceLabel)
     · membership.sinceLabel           (fmtPlanSinceLabel)
     · lifetime.journey[].whenLabel / monthLabel  (shortDateLabel / monthFullLabel)
     · certificates[].issuedAt         (monthYearLabel)
   Si alguien quita el `lang` de cualquiera de esos call-sites, ESTE archivo se pone rojo. */
import { describe, it, expect, vi, beforeAll } from "vitest";

/* eslint-disable @typescript-eslint/no-explicit-any */

// El factory de vi.mock se hoistea sobre los imports: solo puede tocar `vi` y vi.hoisted.
const box = vi.hoisted(() => ({ db: null as any }));
vi.mock("../app/lib/db", () => ({
  db: new Proxy({}, { get: (_t, p: string) => (p === "then" ? undefined : box.db[p]) }),
}));

import { getAppData } from "../app/lib/queries";

/* ---- Datos mínimos, con las MISMAS formas que el seed real -------------------- */

const ME = {
  id: "u-ar", name: "Analía Reyes", email: "analia.reyes@otr.do", role: "STUDENT",
  initials: "AR", level: "OTR Competitor", xp: 3120, streak: 5,
  headline: "", bio: "", teachingStyle: "", formats: "", location: "", avatarUrl: null,
  preferences: null, debateRating: 1720, debateRd: 80, debateTier: "Gold",
  membership: "pro",
  // Martes 11 de agosto de 2026 a mediodía UTC (día calendario 11 en cualquier zona de
  // UTC-12 a UTC+11 → el test no depende de la TZ del proceso, ver tests/i18n-dates.test.ts).
  membershipSince: new Date("2026-08-11T12:00:00.000Z"),
  publicSlug: "analia-reyes", publicProfile: true, lang: "es",
  ageBand: "adult", placedAt: new Date("2026-01-10T12:00:00.000Z"),
};

// Reserva futura de Analía con el Head Coach: 4:00 PM hora RD (UTC-4) del martes 11.
const SLOT_AT = new Date("2026-08-11T20:00:00.000Z");
const MY_BOOKING = {
  id: "bk-ar-saul-2", studentId: "u-ar", coachId: "u-saul", packageId: "pkg-saul-1",
  slotAt: SLOT_AT, durationMin: 60, status: "CONFIRMED", priceCents: 4500,
  videoUrl: "/aula?room=bk-ar-saul-2", recordingUrl: null, escrow: { amountCents: 4500, status: "HELD" },
};

const COACH_USER = { id: "u-saul", name: "Saúl Méndez", initials: "SM", coachVerified: true, headline: "Head Coach", avatarUrl: null, location: "Santo Domingo, RD" };

const COACH_PROFILE = {
  id: "cp-saul", userId: "u-saul", introVideoUrl: null, credentials: "Head Coach",
  specialties: "Public Forum, Lincoln-Douglas, Oratoria", languages: "es,en",
  hourlyCents: 4500, responseTime: "", cancelPolicy: "", bookingCount: 38, active: true,
  packages: [{ id: "pkg-saul-1", name: "Single", sessions: 1, priceCents: 4500, discountPct: 0 }],
  availability: [],
};

// Evento de agenda ("Próximos eventos") — sábado 15 de agosto, 1:00 PM RD.
const EVENT_ROW = {
  id: "ev-1", title: "Torneo interno OTR · Primavera", course: "PF-101",
  startsAt: new Date("2026-08-15T17:00:00.000Z"), whenLabel: "", tone: "accent",
};

// Ledger del journey. Va en el mismo orden que la consulta real (createdAt DESC): getAppData
// lo invierte a ASC, así que el MÁS ANTIGUO es el que fija "Miembro desde …" y journey[0].
const ACTIVITY = [
  { id: "ae-2", userId: "u-ar", type: "lesson_done", title: "Completó una lección", detail: "", xp: 20, meta: null, createdAt: new Date("2026-08-11T12:00:00.000Z") },
  { id: "ae-1", userId: "u-ar", type: "enrolled", title: "Se inscribió en OTR", detail: "", xp: 10, meta: null, createdAt: new Date("2026-08-05T12:00:00.000Z") },
];

const CERTIFICATE = { id: "cert-1", userId: "u-ar", courseId: "c-pf", title: "Fundamentos de Oratoria", issuedAt: new Date("2026-08-11T12:00:00.000Z") };

// Torneo próximo (Debate Hub / pantalla Eventos) — sábado 15 de agosto, 1:00 PM RD.
const TOURNAMENT = {
  id: "t-1", name: "Copa Lincoln-Douglas RD", format: "LD", region: "RD", modality: "presencial",
  startsAt: new Date("2026-08-15T17:00:00.000Z"), status: "UPCOMING", entryCents: 0,
  ageDivision: "", source: "", registrations: [],
};

// "Lo mejor de la temporada" — la franja del dashboard con su etiqueta de fecha.
const HIGHLIGHT = {
  id: "h-1", title: "St. Michael's Tournament — Co-Campeones", category: "Torneo",
  date: new Date("2026-08-11T12:00:00.000Z"), position: 0, imageUrl: null,
};

// Ronda adjudicada: alimenta el historial de rating del Performance Record.
const DEBATE_RECORD = {
  id: "dr-1", userId: "u-ar", format: "PF", side: "PRO", opponent: "Colegio X", result: "WIN",
  source: "tournament", eventName: "Copa RD", roundLabel: "R1",
  recordedAt: new Date("2026-08-11T12:00:00.000Z"),
  rating: { ratingBefore: 1700, ratingAfter: 1720, tierAfter: "Gold" },
};

/* ---- Prisma falso: default sensato por método + overrides por modelo.método ---- */

function defaultFor(method: string): any {
  if (method === "findMany" || method === "groupBy") return [];
  if (method === "count") return 0;
  if (method === "aggregate") return { _avg: {}, _count: { _all: 0 }, _sum: {}, _max: {}, _min: {} };
  return null; // findFirst / findUnique / …
}

function makeDb(overrides: Record<string, any>): any {
  const dbProxy: any = new Proxy({}, {
    get(_t, model: string) {
      if (model === "then") return undefined;
      if (model === "$transaction") return async (x: any) => (Array.isArray(x) ? Promise.all(x) : x(dbProxy));
      if (model === "$queryRaw" || model === "$queryRawUnsafe") return async () => [];
      return new Proxy({}, {
        get: (_t2, method: string) => async (args: any) => {
          const key = `${model}.${String(method)}`;
          const o = overrides[key];
          if (o === undefined) return defaultFor(String(method));
          return typeof o === "function" ? o(args) : o;
        },
      });
    },
  });
  return dbProxy;
}

const OVERRIDES: Record<string, any> = {
  "user.findUnique": ME,
  "user.findMany": [COACH_USER],
  "coachProfile.findMany": [COACH_PROFILE],
  // Las reservas del ALUMNO (studentId) — el resto de consultas de booking van vacías.
  "booking.findMany": (args: any) => (args?.where?.studentId === "u-ar" ? [MY_BOOKING] : []),
  "eventItem.findMany": [EVENT_ROW],
  "activityEvent.findMany": ACTIVITY,
  "certificate.findMany": [CERTIFICATE],
  "tournament.findMany": [TOURNAMENT],
  "highlight.findMany": [HIGHLIGHT],
  "debateRecord.findMany": [DEBATE_RECORD],
  // Un skill real hace que el Skill Graph atribuya el evento 'lesson_done' → Estructura, que
  // es el único call-site de fecha que quedaba fuera del test (whenLabel de la atribución).
  "studentSkill.findMany": [{ id: "ss-1", userId: "u-ar", skill: "Estructura", score: 82 }],
};

let es: any;
let en: any;

beforeAll(async () => {
  box.db = makeDb(OVERRIDES);
  // `preloaded` = el User ya resuelto por getSessionUser (misma vía que /api/app-data).
  es = await getAppData(ME.email, "es", ME);
  en = await getAppData(ME.email, "en", ME);
});

// Tokens que solo existen en español: si aparecen con lang='en', ese call-site perdió el idioma.
const ES_TOKENS = /\b(lun|mar|mié|jue|vie|sáb|dom|ene|abr|ago|dic|agosto|Miembro desde|Desde)\b/;

describe("A2 · getAppData REAL propaga el idioma a TODAS las etiquetas de fecha", () => {
  it("el payload en 'es' no cambia: los labels siguen igual que antes del fix", () => {
    expect(es.myBookings[0].slotLabel).toBe("mar 11 ago · 4:00 PM");
    expect(es.events[0].when).toBe("sáb 15 ago · 1:00 PM");
    expect(es.lifetime.identity.memberSinceLabel).toBe("Miembro desde agosto 2026");
    expect(es.membership.sinceLabel).toBe("Desde agosto 2026");
    expect(es.certificates[0].issuedAt).toBe("ago 2026");
    expect(es.lifetime.journey[0].whenLabel).toBe("5 ago");
    expect(es.lifetime.journey[0].monthLabel).toBe("Agosto 2026");
    expect(es.tournaments[0].startsLabel).toBe("sáb 15 ago · 1:00 PM");
    expect(es.highlights[0].dateLabel).toBe("11 ago");
    expect(es.lifetime.performance.history[0].label).toBe("11 ago");
    expect(es.lifetime.credentials[0].issuedLabel).toBe("ago 2026");
    expect(es.lifetime.skillGraph[0].events[0].whenLabel).toBe("11 ago");
  });

  it("el MISMO payload en 'en' sale en inglés — ninguna etiqueta se queda en español", () => {
    expect(en.myBookings[0].slotLabel).toBe("Tue, 11 Aug · 4:00 PM");
    expect(en.events[0].when).toBe("Sat, 15 Aug · 1:00 PM");
    expect(en.lifetime.identity.memberSinceLabel).toBe("Member since August 2026");
    expect(en.membership.sinceLabel).toBe("Since August 2026");
    expect(en.certificates[0].issuedAt).toBe("Aug 2026");
    expect(en.lifetime.journey[0].whenLabel).toBe("5 Aug");
    expect(en.lifetime.journey[0].monthLabel).toBe("August 2026");
    expect(en.tournaments[0].startsLabel).toBe("Sat, 15 Aug · 1:00 PM");
    expect(en.highlights[0].dateLabel).toBe("11 Aug");
    expect(en.lifetime.performance.history[0].label).toBe("11 Aug");
    expect(en.lifetime.credentials[0].issuedLabel).toBe("Aug 2026");
    expect(en.lifetime.skillGraph[0].events[0].whenLabel).toBe("11 Aug");
  });

  it("cada etiqueta EN es DISTINTA de su ES y sin un solo token español", () => {
    const pares: Array<[string, string, string]> = [
      ["myBookings[0].slotLabel", es.myBookings[0].slotLabel, en.myBookings[0].slotLabel],
      ["events[0].when", es.events[0].when, en.events[0].when],
      ["lifetime.identity.memberSinceLabel", es.lifetime.identity.memberSinceLabel, en.lifetime.identity.memberSinceLabel],
      ["membership.sinceLabel", es.membership.sinceLabel, en.membership.sinceLabel],
      ["certificates[0].issuedAt", es.certificates[0].issuedAt, en.certificates[0].issuedAt],
      ["lifetime.journey[0].whenLabel", es.lifetime.journey[0].whenLabel, en.lifetime.journey[0].whenLabel],
      ["lifetime.journey[0].monthLabel", es.lifetime.journey[0].monthLabel, en.lifetime.journey[0].monthLabel],
      ["tournaments[0].startsLabel", es.tournaments[0].startsLabel, en.tournaments[0].startsLabel],
      ["highlights[0].dateLabel", es.highlights[0].dateLabel, en.highlights[0].dateLabel],
      ["lifetime.performance.history[0].label", es.lifetime.performance.history[0].label, en.lifetime.performance.history[0].label],
      ["lifetime.credentials[0].issuedLabel", es.lifetime.credentials[0].issuedLabel, en.lifetime.credentials[0].issuedLabel],
      ["lifetime.skillGraph[0].events[0].whenLabel", es.lifetime.skillGraph[0].events[0].whenLabel, en.lifetime.skillGraph[0].events[0].whenLabel],
    ];
    for (const [donde, labelEs, labelEn] of pares) {
      expect(labelEn, `${donde} no cambió con lang='en'`).not.toBe(labelEs);
      expect(labelEn, `${donde} conserva español con lang='en'`).not.toMatch(ES_TOKENS);
    }
  });

  it("A4 · el título de la reserva es la clase real, y el paquete sigue de metadato", () => {
    expect(es.myBookings[0].title).toBe("Sesión de Public Forum");
    expect(en.myBookings[0].title).toBe("Public Forum session");
    expect(es.myBookings[0].packageName).toBe("Single"); // metadato intacto
    expect(es.myBookings[0].title).not.toBe(es.myBookings[0].packageName);
    expect(en.myBookings[0].title).not.toBe(en.myBookings[0].packageName);
  });
});
