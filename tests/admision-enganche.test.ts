/* [ADM] ENGANCHE del flujo de admisión — la fase que decide QUIÉN entra y QUIÉN ve qué.
   Plan: docs/superpowers/plans/2026-08-10-onboarding-admision.md (§F4).

   Tres contratos, y los tres han sido bugs reales de este repo si se rompen:

     1. ENRUTADO. El alumno con la admisión incompleta entra al wizard; el que la terminó,
        al Aula normal. Y el PLACEMENT ya no bloquea a nadie: era un muro en el arranque
        (Aula.tsx) y ahora es una invitación dentro del dashboard.
     2. GUARD DE ROL de la ruta nueva: el wizard recoge datos personales de un menor y la
        firma de su tutor — el sondeo R4 ya nos encontró tres pantallas abiertas por omitir
        `role`, y esta es de las que peor se abrirían.
     3. PRIVACIDAD del payload: el progreso viaja; el expediente NO. Ni el coach ni el admin
        reciben cédula, teléfono, firma, fecha de nacimiento ni la URL del vídeo del alumno.

   El caché global (tests/perf-cache-aislamiento.test.ts) vigila que nada por-usuario se
   comparta; aquí se comprueba el otro lado: que la admisión —que ES por usuario— NUNCA se
   pida a través de cached(). */
import { describe, it, expect, vi } from "vitest";

/* eslint-disable @typescript-eslint/no-explicit-any */

const box = vi.hoisted(() => ({ db: null as any, calls: [] as Array<{ model: string; method: string; args: any }> }));
vi.mock("../app/lib/db", () => ({
  db: new Proxy({}, { get: (_t, p: string) => (p === "then" ? undefined : box.db[p]) }),
}));

import { startRoute, isRouteAllowed, resolveHashRoute } from "../app/lib/router";
import { ROUTES } from "../app/lib/screens";
import { admissionProgress, ADMISSION_STEPS, getAppData } from "../app/lib/queries";
import { invalidate } from "../app/lib/cache";

/* ===================== 1 · ENRUTADO ===================================================== */

describe("ADM · el arranque del Aula manda al alumno según su ADMISIÓN", () => {
  it("admisión incompleta → wizard de admisión (la puerta)", () => {
    expect(startRoute({ role: "student", hashRoute: "dashboard", needsAdmission: true })).toBe("admission");
  });

  it("admisión completa → el Aula normal (lo que pedía la URL)", () => {
    expect(startRoute({ role: "student", hashRoute: "dashboard", needsAdmission: false })).toBe("dashboard");
    // y respeta el deep-link: no secuestra a quien ya está dentro
    expect(startRoute({ role: "student", hashRoute: "debate", needsAdmission: false })).toBe("debate");
  });

  it("la admisión GANA al flag de registro recién hecho (onboarding no se la salta)", () => {
    expect(startRoute({ role: "student", hashRoute: "dashboard", needsAdmission: true, justRegistered: true })).toBe("admission");
    expect(startRoute({ role: "student", hashRoute: "dashboard", needsAdmission: false, justRegistered: true })).toBe("onboarding");
  });

  it("solo al ESTUDIANTE: un coach o un admin nunca acaban en el wizard", () => {
    for (const role of ["teacher", "parent", "admin"]) {
      expect(startRoute({ role, hashRoute: "dashboard", needsAdmission: true })).toBe("dashboard");
    }
  });

  it("sin subsistema de admisión (needsAdmission false/undefined) nadie queda encerrado fuera", () => {
    expect(startRoute({ role: "student", hashRoute: "dashboard" })).toBe("dashboard");
    expect(startRoute({ role: "student", hashRoute: "dashboard", needsAdmission: undefined })).toBe("dashboard");
  });
});

describe("ADM · el PLACEMENT dejó de ser un muro", () => {
  it("el arranque NUNCA devuelve 'placement', tenga el alumno el estado que tenga", () => {
    const combos = [
      { needsAdmission: true, justRegistered: true },
      { needsAdmission: true, justRegistered: false },
      { needsAdmission: false, justRegistered: true },
      { needsAdmission: false, justRegistered: false },
    ];
    for (const c of combos) {
      expect(startRoute({ role: "student", hashRoute: "dashboard", ...c })).not.toBe("placement");
    }
  });

  it("pero la pantalla sigue existiendo y sigue siendo alcanzable POR EL ALUMNO (es su evaluación)", () => {
    expect(ROUTES.placement).toBeTruthy();
    expect(isRouteAllowed("placement", "student")).toBe(true);
    expect(resolveHashRoute("#placement", "student")).toBe("placement");
  });
});

/* ===================== 2 · GUARD DE ROL DE LA RUTA NUEVA ================================ */

describe("ADM · guard de rol del wizard de admisión", () => {
  it("la ruta existe y cuelga de Inicio", () => {
    expect(ROUTES.admission).toBeTruthy();
    expect(ROUTES.admission.screen).toBe("admission");
    expect(ROUTES.admission.nav).toBe("dashboard");
  });

  it("SOLO el alumno entra: coach, familia y admin caen a su home", () => {
    expect(isRouteAllowed("admission", "student")).toBe(true);
    for (const role of ["teacher", "parent", "admin"]) {
      expect(isRouteAllowed("admission", role), `'${role}' alcanzó el wizard`).toBe(false);
    }
    expect(resolveHashRoute("#admission", "teacher")).toBe("teacher");
    expect(resolveHashRoute("#admission", "parent")).toBe("parent");
    expect(resolveHashRoute("#admission", "admin")).toBe("admin");
  });
});

/* ===================== 3 · REDUCCIÓN PURA DEL PROGRESO ================================== */

describe("ADM · admissionProgress()", () => {
  const D = new Date("2026-08-10T12:00:00.000Z");

  it("sin fila = alumno recién registrado: 0 de 4 y le toca el paso 1", () => {
    const p = admissionProgress(null);
    expect(p.done).toBe(0);
    expect(p.total).toBe(ADMISSION_STEPS.length);
    expect(p.step).toBe(1);
    expect(p.complete).toBe(false);
    expect(p.pct).toBe(0);
  });

  it("cuenta los pasos cerrados y señala el PRIMER pendiente, no done+1", () => {
    // formulario y comunidad hechos, la llamada no: lo que toca sigue siendo la llamada.
    const p = admissionProgress({ formCompletedAt: D, communityCompletedAt: D });
    expect(p.done).toBe(2);
    expect(p.step).toBe(2);
    expect(p.complete).toBe(false);
    expect(p.pct).toBe(50);
  });

  it("los cuatro timestamps = admisión completa", () => {
    const p = admissionProgress({ formCompletedAt: D, callCompletedAt: D, communityCompletedAt: D, videoCompletedAt: D });
    expect(p.complete).toBe(true);
    expect(p.done).toBe(4);
    expect(p.pct).toBe(100);
    expect(p.step).toBe(4);
  });

  it("no se fía de `status`: un COMPLETED sin timestamps no es una admisión completa", () => {
    expect(admissionProgress({ status: "COMPLETED" }).complete).toBe(false);
  });

  it("consentimiento como BOOLEANO: datos con el formulario enviado, tutor con su fecha de firma", () => {
    expect(admissionProgress({}).consent).toEqual({ data: false, guardian: false });
    expect(admissionProgress({ formCompletedAt: D }).consent.data).toBe(true);
    expect(admissionProgress({ formCompletedAt: D, guardianSignedAt: D }).consent.guardian).toBe(true);
  });
});

/* ===================== 4 · PAYLOAD: PROGRESO SÍ, EXPEDIENTE NO ========================== */

const baseUser = {
  initials: "XX", level: "OTR Competitor", streak: 0, headline: "", bio: "", teachingStyle: "",
  formats: "", location: "", avatarUrl: null, preferences: null, debateRd: 80, debateTier: "Gold",
  speakerAvg: 0, speakerRounds: 0, leaderboardOptIn: true, ageBand: "adult",
  placedAt: null, membership: "free", membershipSince: null,
  publicSlug: null, publicProfile: false, lang: "es", notificationPrefs: null, totpSecret: null,
  xp: 100, debateRating: 1200,
};
const NUEVA = { ...baseUser, id: "u-nueva", name: "Nueva Alumna", email: "nueva@otr.do", role: "STUDENT" };
const VETERANA = { ...baseUser, id: "u-vete", name: "Alumna Veterana", email: "vete@otr.do", role: "STUDENT", placedAt: new Date("2026-01-01T00:00:00.000Z") };
const ADMIN = { ...baseUser, id: "u-admin", name: "Admin OTR", email: "admin@otr.do", role: "ADMIN" };

// Datos del formulario que JAMÁS pueden salir hacia el payload de nadie.
const EXPEDIENTE = {
  guardianName: "Rosa Marte Tutora",
  guardianDocument: "001-1234567-8",
  guardianPhone: "+1 809 555 0101",
  guardianEmail: "rosa.tutora@example.com",
  guardianSignature: "Rosa Marte Tutora",
  guardianRelation: "PADRE_MADRE",
  birthDate: new Date("2011-05-04T00:00:00.000Z"),
  phone: "+1 829 555 0199",
  school: "Colegio Santo Domingo",
  gradeLevel: "SECUNDARIA",
  program: "DEBATE_COMPETITIVO",
  preferredDays: "LUN_MIE",
  dppVideoUrl: "/uploads/dpp-menor.mp4",
};

function defaultFor(method: string): any {
  if (method === "findMany" || method === "groupBy") return [];
  if (method === "count") return 0;
  if (method === "aggregate") return { _avg: {}, _count: { _all: 0 }, _sum: {}, _max: {}, _min: {} };
  return null;
}

/** Prisma falso con el modelo Admission presente. `admissionFor` decide qué fila devuelve. */
function makeDb(admissionFor: (args: any) => any[]): any {
  const overrides: Record<string, any> = {
    "user.findUnique": (args: any) =>
      [NUEVA, VETERANA, ADMIN].find((u) => u.email === args?.where?.email) || NUEVA,
    "admission.findMany": admissionFor,
  };
  const dbProxy: any = new Proxy({}, {
    get(_t, model: string) {
      if (model === "then") return undefined;
      if (model === "$transaction") return async (x: any) => (Array.isArray(x) ? Promise.all(x) : x(dbProxy));
      if (model === "$queryRaw" || model === "$queryRawUnsafe") return async () => [];
      return new Proxy({}, {
        get: (_t2, method: string) => async (args: any) => {
          box.calls.push({ model, method: String(method), args });
          const o = overrides[`${model}.${String(method)}`];
          if (o === undefined) return defaultFor(String(method));
          return typeof o === "function" ? o(args) : o;
        },
      });
    },
  });
  return dbProxy;
}

/** Fila COMPLETA de Admission tal como la devolvería la base si no se filtrara con select. */
const filaCruda = (over: any = {}) => ({
  id: "adm-1", studentId: NUEVA.id, status: "IN_PROGRESS",
  formCompletedAt: new Date("2026-08-01T00:00:00.000Z"), callCompletedAt: null,
  communityCompletedAt: null, videoCompletedAt: null, completedAt: null,
  guardianSignedAt: new Date("2026-08-01T00:00:00.000Z"),
  ...EXPEDIENTE, ...over,
});

describe("ADM · payload del ALUMNO", () => {
  it("admisión a medias → me.needsAdmission true y el progreso viaja reducido", async () => {
    box.db = makeDb(() => [filaCruda()]);
    invalidate();
    const data: any = await getAppData(NUEVA.email, "es", NUEVA as any);
    expect(data.me.needsAdmission).toBe(true);
    expect(data.me.admission.done).toBe(1);
    expect(data.me.admission.step).toBe(2);
    expect(data.me.admission.complete).toBe(false);
  });

  it("admisión completa → needsAdmission false (entra al Aula normal)", async () => {
    const hecho = new Date("2026-08-02T00:00:00.000Z");
    box.db = makeDb(() => [filaCruda({ callCompletedAt: hecho, communityCompletedAt: hecho, videoCompletedAt: hecho, completedAt: hecho, status: "COMPLETED" })]);
    invalidate();
    const data: any = await getAppData(NUEVA.email, "es", NUEVA as any);
    expect(data.me.needsAdmission).toBe(false);
    expect(data.me.admission.complete).toBe(true);
  });

  it("el alumno sin placement NO se bloquea: needsPlacement sigue viajando para la INVITACIÓN", async () => {
    box.db = makeDb(() => [filaCruda()]);
    invalidate();
    const data: any = await getAppData(NUEVA.email, "es", NUEVA as any);
    expect(data.me.needsPlacement).toBe(true); // lo consume la tarjeta del dashboard
    // y quien ya lo hizo no la ve
    box.db = makeDb(() => [filaCruda({ studentId: VETERANA.id })]);
    invalidate();
    const otra: any = await getAppData(VETERANA.email, "es", VETERANA as any);
    expect(otra.me.needsPlacement).toBe(false);
  });

  it("ni un dato del formulario llega al payload del propio alumno", async () => {
    box.db = makeDb(() => [filaCruda()]);
    invalidate();
    const crudo = JSON.stringify(await getAppData(NUEVA.email, "es", NUEVA as any));
    for (const secreto of Object.values(EXPEDIENTE).map(String)) {
      expect(crudo, `se filtró «${secreto}»`).not.toContain(secreto);
    }
  });
});

describe("ADM · payload del ADMIN (consentimiento sí, expediente no)", () => {
  it("adminAdmissions trae progreso, BOOLEANOS de consentimiento y el caso crítico", async () => {
    box.db = makeDb(() => [{
      ...filaCruda({ guardianSignedAt: null }),
      student: { id: NUEVA.id, name: "Nueva Alumna", initials: "NA", ageBand: "minor" },
    }]);
    invalidate();
    const data: any = await getAppData(ADMIN.email, "es", ADMIN as any);
    const fila = data.adminAdmissions.rows[0];
    expect(fila.consentData).toBe(true);        // envió el formulario
    expect(fila.consentGuardian).toBe(false);   // pero su tutor no ha firmado
    expect(fila.minor).toBe(true);
    expect(fila.consentPending).toBe(true);     // MENOR + formulario + sin firma = a perseguir
    expect(data.adminAdmissions.consentPending).toBe(1);
    expect(data.adminAdmissions.inProgress).toBe(1);
  });

  it("el admin ve el ESTADO del consentimiento, nunca la firma ni la cédula del tutor", async () => {
    box.db = makeDb(() => [{
      ...filaCruda(),
      student: { id: NUEVA.id, name: "Nueva Alumna", initials: "NA", ageBand: "minor" },
    }]);
    invalidate();
    const crudo = JSON.stringify(await getAppData(ADMIN.email, "es", ADMIN as any));
    for (const secreto of Object.values(EXPEDIENTE).map(String)) {
      expect(crudo, `el admin recibió «${secreto}»`).not.toContain(secreto);
    }
  });

  it("el SELECT ni siquiera pide esos campos a la base (no es un filtro de salida)", async () => {
    box.calls = [];
    box.db = makeDb(() => []);
    invalidate();
    await getAppData(ADMIN.email, "es", ADMIN as any);
    const admissionCalls = box.calls.filter((c) => c.model === "admission");
    expect(admissionCalls.length).toBeGreaterThan(0);
    for (const call of admissionCalls) {
      const sel = Object.keys(call.args?.select || {});
      for (const prohibido of Object.keys(EXPEDIENTE)) {
        expect(sel, `el select pidió '${prohibido}'`).not.toContain(prohibido);
      }
    }
  });
});

describe("ADM · el estudiante NO recibe lo del staff, y el staff no recibe de más", () => {
  it("un STUDENT no recibe adminAdmissions", async () => {
    box.db = makeDb(() => [filaCruda()]);
    invalidate();
    const data: any = await getAppData(NUEVA.email, "es", NUEVA as any);
    expect(data.adminAdmissions).toBeUndefined();
  });

  it("la admisión NUNCA pasa por el micro-caché GLOBAL (es dato por-usuario)", async () => {
    box.calls = [];
    box.db = makeDb(() => [filaCruda()]);
    invalidate();
    await getAppData(NUEVA.email, "es", NUEVA as any);
    const antes = box.calls.filter((c) => c.model === "admission").length;
    expect(antes).toBeGreaterThan(0);
    // Segunda usuaria DENTRO del TTL: si la admisión estuviera cacheada, no habría 2ª consulta
    // y la veterana heredaría el progreso de la alumna nueva.
    await getAppData(VETERANA.email, "es", VETERANA as any);
    expect(box.calls.filter((c) => c.model === "admission").length).toBeGreaterThan(antes);
  });
});

/* ===================== 5 · DEGRADACIÓN SIN EL SUBSISTEMA ================================ */

describe("ADM · sin el modelo Admission (fase F0 sin migrar) la plataforma NO se rompe", () => {
  /** Prisma falso SIN el modelo `admission` — exactamente un cliente sin regenerar. */
  function dbSinAdmission(): any {
    const dbProxy: any = new Proxy({}, {
      get(_t, model: string) {
        if (model === "then") return undefined;
        if (model === "admission") return undefined; // el modelo NO existe
        if (model === "$transaction") return async (x: any) => (Array.isArray(x) ? Promise.all(x) : x(dbProxy));
        if (model === "$queryRaw" || model === "$queryRawUnsafe") return async () => [];
        return new Proxy({}, {
          get: (_t2, method: string) => async (args: any) => {
            if (model === "user" && String(method) === "findUnique") {
              return [NUEVA, VETERANA, ADMIN].find((u) => u.email === args?.where?.email) || NUEVA;
            }
            return defaultFor(String(method));
          },
        });
      },
    });
    return dbProxy;
  }

  it("me.admission = null y needsAdmission = false → nadie se enruta a un wizard ausente", async () => {
    box.db = dbSinAdmission();
    invalidate();
    const data: any = await getAppData(NUEVA.email, "es", NUEVA as any);
    expect(data.me.admission).toBeNull();
    expect(data.me.needsAdmission).toBe(false);
    expect(startRoute({ role: "student", hashRoute: "dashboard", needsAdmission: data.me.needsAdmission })).toBe("dashboard");
  });

  it("el admin tampoco recibe una sección vacía que mienta", async () => {
    box.db = dbSinAdmission();
    invalidate();
    const data: any = await getAppData(ADMIN.email, "es", ADMIN as any);
    expect(data.adminAdmissions).toBeUndefined();
  });
});
