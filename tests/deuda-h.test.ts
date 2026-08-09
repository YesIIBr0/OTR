/* [DEUDA-H] Deuda de datos/i18n/rótulos acumulada en varias campañas.
 *
 *   1 · Etiquetas de fecha ALMACENADAS en español ("hace 1h", "ayer", "ahora") en
 *       Notification.whenLabel, ForumThread.lastLabel, ForumPost.whenLabel,
 *       Conversation.whenLabel y ChatMessage.timeLabel: salían tal cual con la UI en inglés
 *       y además envejecían mal (texto congelado en la fila). Ahora se guarda el INSTANTE y
 *       la etiqueta se DERIVA en lectura con el idioma de la request.
 *   2 · Dos entregas del seed sin `dueAt`, con la fecha como texto libre en español
 *       ("Mañana · 23:59" / "Viernes · 23:59").
 *   6 · El selector de "Cambiar coach responsable" ofrecía filas que el backend rechaza
 *       (rol COACH → 400) y NO ofrecía a los ADMIN, que sí son dueños válidos: un curso de
 *       dueño ADMIN caía en el primer coach y "Guardar" lo reasignaba sin querer.
 *
 * Los formateadores se prueban puros; el cableado, contra el getAppData REAL con Prisma
 * mockeado (mismo patrón que tests/i18n-payload-lang.test.ts); y el selector con el stub de
 * DOM mínimo de tests/goal-e4-staff.test.ts.
 */
import { describe, it, expect, vi, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/* eslint-disable @typescript-eslint/no-explicit-any */
(globalThis as any).window = (globalThis as any).window || {};
const win: any = (globalThis as any).window;
win.api = async () => ({});
win.go = () => {};
win.toast = () => {};
win.otrFormModal = () => {};

// El factory de vi.mock se hoistea sobre los imports: solo puede tocar `vi` y vi.hoisted.
const box = vi.hoisted(() => ({ db: null as any }));
vi.mock("../app/lib/db", () => ({
  db: new Proxy({}, { get: (_t, p: string) => (p === "then" ? undefined : box.db[p]) }),
}));

import { fmtRelativeAgo, fmtClockRD, langFromRequest, t } from "../app/lib/i18n";
import { getAppData } from "../app/lib/queries";
import { DB } from "../app/lib/data";
import { S as SExtra } from "../app/lib/scr-extra";
import { S as SCore } from "../app/lib/scr-core";

const Extra: any = SExtra;
const Core: any = SCore;

const SEED = readFileSync(join(process.cwd(), "prisma/seed.ts"), "utf8");

/* ════════════════════════════════════════════════════════════════════════════
   1 · Formateadores compartidos (puros, con "ahora" inyectado ⇒ deterministas)
   ════════════════════════════════════════════════════════════════════════════ */

const NOW = Date.parse("2026-08-11T20:00:00.000Z"); // martes 11 ago, 4:00 PM RD
const agoMin = (m: number) => new Date(NOW - m * 60000);
// Para el payload REAL: getAppData no recibe "ahora" (usa el reloj del proceso), así que los
// instantes de sus fixtures se anclan al reloj real, no a NOW.
const realAgoMin = (m: number) => new Date(Date.now() - m * 60000);

describe("[DEUDA-H · 1] fmtRelativeAgo — la antigüedad se formatea, no se guarda", () => {
  it("cubre el rango entero en español", () => {
    expect(fmtRelativeAgo(agoMin(0.5), "es", NOW)).toBe("ahora");
    expect(fmtRelativeAgo(agoMin(40), "es", NOW)).toBe("hace 40 min");
    expect(fmtRelativeAgo(agoMin(60), "es", NOW)).toBe("hace 1 h");
    expect(fmtRelativeAgo(agoMin(60 * 26), "es", NOW)).toBe("hace 1 día");
    expect(fmtRelativeAgo(agoMin(60 * 24 * 3), "es", NOW)).toBe("hace 3 días");
    expect(fmtRelativeAgo(agoMin(60 * 24 * 14), "es", NOW)).toBe("hace 2 sem");
    expect(fmtRelativeAgo(agoMin(60 * 24 * 60), "es", NOW)).toBe("hace 2 meses");
    expect(fmtRelativeAgo(agoMin(60 * 24 * 400), "es", NOW)).toBe("hace 1 año");
  });

  it("el MISMO instante en inglés no conserva un solo token español", () => {
    const pares: Array<[number, string]> = [
      [0.5, "now"], [40, "40 min ago"], [60, "1 h ago"],
      [60 * 26, "1 day ago"], [60 * 24 * 3, "3 days ago"],
      [60 * 24 * 14, "2 wk ago"], [60 * 24 * 60, "2 months ago"], [60 * 24 * 400, "1 year ago"],
    ];
    for (const [mins, esperado] of pares) {
      const en = fmtRelativeAgo(agoMin(mins), "en", NOW);
      expect(en).toBe(esperado);
      expect(en, `${mins} min conserva español`).not.toMatch(/\b(hace|ahora|día|días|sem|mes|meses|año|años)\b/);
    }
  });

  it("sin fecha devuelve cadena vacía (nunca 'Invalid Date' ni 'NaN')", () => {
    expect(fmtRelativeAgo(null, "es", NOW)).toBe("");
    expect(fmtRelativeAgo(undefined, "en", NOW)).toBe("");
    expect(fmtRelativeAgo("no es una fecha", "es", NOW)).toBe("");
  });
});

describe("[DEUDA-H · 1] fmtClockRD — hora del mensaje en hora RD", () => {
  it("14:02 UTC = 10:02 AM en RD (UTC-4), igual en ambos idiomas", () => {
    const d = new Date("2026-08-11T14:02:00.000Z");
    expect(fmtClockRD(d, "es")).toBe("10:02 AM");
    expect(fmtClockRD(d, "en")).toBe("10:02 AM");
  });
  it("mediodía y medianoche RD no salen como 0:00", () => {
    expect(fmtClockRD(new Date("2026-08-11T16:00:00.000Z"), "es")).toBe("12:00 PM");
    expect(fmtClockRD(new Date("2026-08-11T04:00:00.000Z"), "es")).toBe("12:00 AM");
  });
  it("sin fecha devuelve cadena vacía", () => {
    expect(fmtClockRD(null, "es")).toBe("");
  });
});

describe("[DEUDA-H · 1] langFromRequest — el idioma sale de la cookie de la propia request", () => {
  const req = (cookie: string) => ({ headers: { get: (n: string) => (n === "cookie" ? cookie : null) } });
  it("otr_lang=en ⇒ 'en'; cualquier otra cosa ⇒ 'es'", () => {
    expect(langFromRequest(req("otr_lang=en"))).toBe("en");
    expect(langFromRequest(req("otr_session=abc; otr_lang=en"))).toBe("en");
    expect(langFromRequest(req("otr_lang=es"))).toBe("es");
    expect(langFromRequest(req("otr_lang=enigma"))).toBe("es");
    expect(langFromRequest(req(""))).toBe("es");
    expect(langFromRequest(undefined)).toBe("es");
  });
});

/* ════════════════════════════════════════════════════════════════════════════
   1 · CABLEADO: getAppData REAL deriva las etiquetas del timestamp
   ════════════════════════════════════════════════════════════════════════════ */

const ME = {
  id: "u-ar", name: "Analía Reyes", email: "analia.reyes@otr.do", role: "STUDENT",
  initials: "AR", level: "OTR Competitor", xp: 3120, streak: 5,
  headline: "", bio: "", teachingStyle: "", formats: "", location: "", avatarUrl: null,
  preferences: null, debateRating: 1720, debateRd: 80, debateTier: "Gold",
  membership: "free", membershipSince: null,
  publicSlug: "analia-reyes", publicProfile: true, lang: "es",
  ageBand: "adult", placedAt: null,
};

const SAUL = { id: "u-saul", name: "Saúl Méndez", initials: "SM" };

// Notificación con INSTANTE (la nueva forma) + una LEGACY sin él, para probar el respaldo.
const NOTIF_ROWS = [
  { id: "n-1", userId: "u-ar", icon: "chart", tone: "ok", title: "Tu entrega fue calificada", detail: "92%", whenLabel: "", whenAt: realAgoMin(60), unread: true, position: 0 },
  { id: "n-2", userId: null, icon: "medal", tone: "navy", title: "Nueva insignia", detail: "Refutador", whenLabel: "ayer", whenAt: null, unread: false, position: 1 },
];

const CONVO_ROWS = [
  {
    id: "cv-1", initials: "SM", name: "Coach Saúl Méndez", lastLabel: "Te dejé feedback en la entrega",
    whenLabel: "", whenAt: realAgoMin(60), unread: 2, online: true, navy: true, position: 0,
    participants: [{ userId: "u-ar" }, { userId: "u-saul" }],
    // La consulta real las trae en orden DESC (las 60 más recientes) y getAppData reinvierte.
    messages: [
      { senderId: "u-ar", me: true, body: "Hecho. Lo subo hoy mismo.", timeLabel: "", sentAt: new Date("2026-08-11T14:08:00.000Z") },
      { senderId: "u-saul", me: false, body: "¡Hola Analía!", timeLabel: "", sentAt: new Date("2026-08-11T14:02:00.000Z") },
    ],
  },
  {
    // Hilo LEGACY: sin whenAt ni sentAt ⇒ debe seguir sirviendo su texto guardado.
    id: "cv-legacy", initials: "CN", name: "Camila Núñez", lastLabel: "¿Practicamos crossfire?",
    whenLabel: "hace 3h", whenAt: null, unread: 0, online: false, navy: false, position: 1,
    participants: [{ userId: "u-ar" }],
    messages: [{ senderId: "u-ar", me: true, body: "Va", timeLabel: "10:30", sentAt: null }],
  },
];

function defaultFor(method: string): any {
  if (method === "findMany" || method === "groupBy") return [];
  if (method === "count") return 0;
  if (method === "aggregate") return { _avg: {}, _count: { _all: 0 }, _sum: {}, _max: {}, _min: {} };
  return null;
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

let es: any;
let en: any;

beforeAll(async () => {
  box.db = makeDb({
    "user.findUnique": ME,
    "user.findMany": [SAUL],
    "notification.findMany": NOTIF_ROWS,
    "conversation.findMany": CONVO_ROWS,
  });
  es = await getAppData(ME.email, "es", ME);
  en = await getAppData(ME.email, "en", ME);
});

// Tokens que solo existen en español: si aparecen con lang='en', ese call-site perdió el idioma.
const ES_TOKENS = /\b(hace|ahora|ayer|día|días|sem|mes|meses|año|años)\b/;

describe("[DEUDA-H · 1] getAppData REAL: la antigüedad se deriva del instante, con idioma", () => {
  it("la notificación con whenAt sale traducida en cada idioma", () => {
    expect(es.notifications[0].when).toBe("hace 1 h");
    expect(en.notifications[0].when).toBe("1 h ago");
    expect(en.notifications[0].when).not.toMatch(ES_TOKENS);
  });

  it("la conversación con whenAt sale traducida y la hora del mensaje es la hora RD", () => {
    expect(es.messages[0].when).toBe("hace 1 h");
    expect(en.messages[0].when).toBe("1 h ago");
    expect(en.messages[0].when).not.toMatch(ES_TOKENS);
    // El hilo se reinvierte a cronológico: el primero es el de las 10:02 AM RD.
    expect(es.messages[0].messages[0].when).toBe("10:02 AM");
    expect(en.messages[0].messages[0].when).toBe("10:02 AM");
    expect(en.messages[0].messages[1].when).toBe("10:08 AM");
  });

  it("una fila LEGACY sin timestamp conserva su texto guardado (nada se pierde ni revienta)", () => {
    expect(es.notifications[1].when).toBe("ayer");
    expect(en.notifications[1].when).toBe("ayer"); // sin instante no hay nada que traducir
    expect(es.messages[1].when).toBe("hace 3h");
    expect(es.messages[1].messages[0].when).toBe("10:30");
  });
});

/* ════════════════════════════════════════════════════════════════════════════
   1 · 2 · 3 · Guardián del SEED: ninguna etiqueta de fecha vuelve a guardarse
   como texto, las dos entregas tienen fecha real y no queda un solo emoji.
   ════════════════════════════════════════════════════════════════════════════ */

describe("[DEUDA-H · 1] el seed guarda instantes, no etiquetas en español", () => {
  it("ningún whenLabel/lastLabel/timeLabel sembrado contiene una fecha en español", () => {
    const ofensivos = SEED.split("\n")
      .map((l, i) => [i + 1, l] as [number, string])
      // ActivityItem (único con `who:`) queda fuera: es una tabla MUERTA — no la lee ni
      // queries.ts ni ninguna ruta, así que su etiqueta no llega a ninguna pantalla. Si
      // alguien la cablea, tendrá que darle su timestamp igual que a las de aquí.
      .filter(([, l]) => !/\bwho:/.test(l))
      .filter(([, l]) => /(whenLabel|lastLabel|timeLabel):\s*"(hace |ayer|ahora|mañana)/i.test(l));
    expect(ofensivos.map(([n, l]) => `${n}: ${l.trim().slice(0, 90)}`)).toEqual([]);
  });

  it("las tablas con etiqueta de fecha siembran su timestamp", () => {
    for (const campo of ["whenAt:", "lastAt:", "sentAt:"]) {
      expect(SEED, `el seed ya no siembra ${campo}`).toContain(campo);
    }
  });
});

describe("[DEUDA-H · 2] las dos entregas de la Unidad 2 tienen fecha límite REAL", () => {
  it("contention y grabación siembran dueAt y ya no el label libre en español", () => {
    expect(SEED).toMatch(/id: L\.contention[\s\S]{0,400}?dueAt: dueContention/);
    expect(SEED).toMatch(/id: L\.scrimmage[\s\S]{0,400}?dueAt: dueScrimmage/);
    expect(SEED).not.toContain('due: "Mañana · 23:59"');
    expect(SEED).not.toContain('due: "Viernes · 23:59"');
  });
});

describe("[DEUDA-H · 3] «Emoji: nunca» — el seed no siembra ni uno", () => {
  it("los mensajes de cv-1 conservan el sentido sin los emoji", () => {
    // Pictogramas de color (los emoji que prohíbe la marca). Los glifos monocromos de los
    // console.log del seed (U+2713/U+2717) son salida de CLI, no contenido de producto, y
    // quedan fuera del rango a propósito.
    const EMOJI = /[\u{1F300}-\u{1FAFF}]|\u{FE0F}/u;
    const conEmoji = SEED.split("\n")
      .map((l, i) => [i + 1, l] as [number, string])
      .filter(([, l]) => EMOJI.test(l));
    expect(conEmoji.map(([n, l]) => `${n}: ${l.trim().slice(0, 80)}`)).toEqual([]);
    expect(SEED).toContain("Tu claim quedó clarísimo en los primeros 10 segundos.");
    expect(SEED).toContain("Hecho. Lo subo hoy mismo.");
  });
});

/* ════════════════════════════════════════════════════════════════════════════
   2 · La fecha límite se PINTA en el idioma activo (deriva de dueAt, no del texto)
   ════════════════════════════════════════════════════════════════════════════ */

const DUE_ISO = "2026-08-12T03:59:00.000Z"; // 11 ago 23:59 hora RD

function fixtureCurso(item: any) {
  for (const k of Object.keys(DB)) delete (DB as any)[k];
  Object.assign(DB, {
    me: { name: "Analía Reyes", initials: "AR", role: "student" },
    courses: [{ id: "PF-101", code: "PF-101", name: "Public Forum I", coach: "Saúl Méndez", progress: 40, students: 8, lessons: 2 }],
    coursesContent: [{
      id: "PF-101", dbId: "c-1", code: "PF-101", name: "Public Forum I", coach: "Saúl Méndez",
      color: "#F25623", progress: 40, layout: "modules", format: "PF", modality: "online",
      summary: "Domina el formato Public Forum desde cero.",
      modules: [{ t: "Unidad 2", done: false, locked: false, items: [item] }],
    }],
    courseModules: [], catalog: [], myGrades: { rows: [], avg: 0, submitted: 0, total: 0, best: 0 },
    myBookings: [], events: [], activity: [], notifications: [], messages: [], badges: [],
    levels: [], skills: [], marketplace: { viewer: { ageBand: null }, coaches: [] },
  });
  (globalThis as any).window.__course = "PF-101";
}

/** Renderiza el "adentro" de la clase con la cookie de idioma pedida. */
function renderConIdioma(lang: string): string {
  const previo = (globalThis as any).document;
  (globalThis as any).document = { cookie: `otr_lang=${lang}` };
  try {
    return Core.courseDetail.render({ role: "student" });
  } finally {
    if (previo === undefined) delete (globalThis as any).document;
    else (globalThis as any).document = previo;
  }
}

describe("[DEUDA-H · 2] la fecha de entrega se traduce porque sale de dueAt", () => {
  it("con dueAt, el mismo curso pinta '11 ago' en ES y '11 Aug' en EN", () => {
    fixtureCurso({ id: "l-3", t: "Construye tu primer contention", type: "assign", doneByMe: false, locked: false, dueAt: DUE_ISO });
    const htmlEs = renderConIdioma("es");
    const htmlEn = renderConIdioma("en");
    expect(htmlEs).toContain("11 ago");
    expect(htmlEn).toContain("11 Aug");
    expect(htmlEn).not.toContain("11 ago");
  });

  it("sin dueAt (fila legacy) el label libre se sirve tal cual, en los dos idiomas", () => {
    fixtureCurso({ id: "l-3", t: "Construye tu primer contention", type: "assign", doneByMe: false, locked: false, due: "Mañana · 23:59" });
    expect(renderConIdioma("es")).toContain("Mañana · 23:59");
    expect(renderConIdioma("en")).toContain("Mañana · 23:59");
  });
});

/* ════════════════════════════════════════════════════════════════════════════
   4 · Rótulo: "Dueño" (calco del inglés) → "Coach responsable"
   ════════════════════════════════════════════════════════════════════════════ */

describe("[DEUDA-H · 4] la consola de cursos rotula 'Coach responsable'", () => {
  it("ninguna clave de la consola vuelve a decir 'dueño' en español", () => {
    const claves = ["extra.courseOwner", "extra.allCoursesSub", "extra.reassignOwner", "extra.reassignAria", "extra.reassignTitle", "extra.reassignField", "extra.reassignOk"];
    for (const k of claves) {
      expect(t(k, "es"), `${k} sigue diciendo dueño`).not.toMatch(/due[ñn]o/i);
    }
    expect(t("extra.courseOwner", "es")).toBe("Coach responsable");
    expect(t("extra.courseOwner", "en")).toBe("Course owner");
  });
});

/* ════════════════════════════════════════════════════════════════════════════
   6 · El selector de coach responsable = lo que el backend acepta,
       con el dueño ACTUAL siempre preseleccionado
   ════════════════════════════════════════════════════════════════════════════ */

type Listener = () => void | Promise<void>;
class FakeEl {
  attrs: Record<string, string> = {};
  disabled = false;
  listeners: Listener[] = [];
  constructor(attrs: Record<string, string> = {}) { this.attrs = { ...attrs }; }
  getAttribute(k: string) { return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null; }
  setAttribute(k: string, v: string) { this.attrs[k] = String(v); }
  addEventListener(_type: string, fn: Listener) { this.listeners.push(fn); }
  async click() { for (const fn of this.listeners) await fn(); }
}
function fakeRoot(map: Record<string, FakeEl[]>) {
  return {
    querySelector: (sel: string) => (map[sel] && map[sel][0]) || null,
    querySelectorAll: (sel: string) => map[sel] || [],
    addEventListener: () => {},
    contains: () => false,
  } as any;
}

// La API real devuelve `role`; ?role=TEACHER trae TEACHER **y** COACH (mapeo del chip de la
// consola de usuarios) y los ADMIN solo salen por ?role=ADMIN.
const USERS_BY_ROLE: Record<string, any[]> = {
  "/api/admin/users?role=TEACHER": [
    { id: "u-saul", name: "Saúl Méndez", role: "TEACHER" },
    { id: "u-legacy", name: "Coach Legacy", role: "COACH" }, // el backend lo rechazaría con 400
  ],
  "/api/admin/users?role=ADMIN": [{ id: "u-admin", name: "Admin OTR", role: "ADMIN" }],
};

/** Abre el diálogo de reasignación de un curso y devuelve lo que vio el modal. */
async function abrirReasignar(curso: any) {
  DB.adminCourses = [curso];
  const calls: any[] = [];
  win.api = async (url: string, body: any, method: string) => {
    calls.push({ url, body, method });
    if (USERS_BY_ROLE[url]) return { users: USERS_BY_ROLE[url] };
    return { ok: true };
  };
  let campo: any = null;
  win.otrFormModal = async (_title: string, fields: any[], onSubmit: (v: any) => Promise<void>) => {
    campo = fields[0];
    // "Guardar" SIN tocar el selector = enviar el valor preseleccionado.
    await onSubmit({ teacherId: campo.value });
  };
  const btn = new FakeEl({
    "data-reassign-course": curso.id,
    "data-owner-id": curso.ownerId || "",
    "data-course-name": curso.name,
  });
  Extra.manage.mount(fakeRoot({ "[data-reassign-course]": [btn] }));
  await btn.click();
  return { campo, calls, patches: calls.filter((c) => c.method === "PATCH") };
}

const cursoBase = (over: any) => ({
  id: "c-1", code: "PF-101", name: "Public Forum I", color: "#171717", published: true,
  format: "PF", modality: "online", moduleCount: 3, lessonCount: 10,
  ownerId: "", ownerName: "", ...over,
});

describe("[DEUDA-H · 6] el selector ofrece EXACTAMENTE lo que el backend acepta", () => {
  it("descarta la fila legacy con rol COACH (el PATCH la rechazaría con 400) e incluye a los ADMIN", async () => {
    const { campo } = await abrirReasignar(cursoBase({ ownerId: "u-saul", ownerName: "Saúl Méndez" }));
    const ids = campo.options.map((o: any) => o.value);
    expect(ids).toContain("u-saul");
    expect(ids).toContain("u-admin"); // ADMIN ∈ OWNER_ROLES: antes no salía en ninguna página
    expect(ids).not.toContain("u-legacy"); // COACH ∉ OWNER_ROLES
  });

  it("un curso cuyo dueño es ADMIN lo preselecciona y guardar-sin-tocar NO reasigna", async () => {
    const { campo, patches } = await abrirReasignar(cursoBase({ ownerId: "u-admin", ownerName: "Admin OTR" }));
    expect(campo.value).toBe("u-admin");
    // El <select> marca `selected` solo si el valor EXISTE entre las opciones.
    expect(campo.options.some((o: any) => o.value === "u-admin")).toBe(true);
    expect(patches).toHaveLength(0);
  });

  it("un dueño fuera de la lista (suspendido) se antepone como opción y sigue siendo no-op", async () => {
    const { campo, patches } = await abrirReasignar(cursoBase({ ownerId: "u-fuera", ownerName: "Coach Suspendido" }));
    expect(campo.value).toBe("u-fuera");
    expect(campo.options[0]).toMatchObject({ value: "u-fuera", label: "Coach Suspendido" });
    expect(patches).toHaveLength(0);
  });

  it("un curso SIN dueño abre en 'Sin asignar' y guardar-sin-tocar tampoco reasigna", async () => {
    const { campo, patches } = await abrirReasignar(cursoBase({ ownerId: "", ownerName: "" }));
    expect(campo.value).toBe("");
    expect(campo.options[0]).toMatchObject({ value: "", label: t("extra.courseOwnerNone") });
    expect(patches).toHaveLength(0);
  });

  it("elegir a otro coach válido SÍ hace el PATCH con su id", async () => {
    DB.adminCourses = [cursoBase({ ownerId: "u-saul", ownerName: "Saúl Méndez" })];
    const calls: any[] = [];
    win.api = async (url: string, body: any, method: string) => {
      calls.push({ url, body, method });
      if (USERS_BY_ROLE[url]) return { users: USERS_BY_ROLE[url] };
      return { ok: true };
    };
    win.otrFormModal = async (_t: string, _f: any[], onSubmit: (v: any) => Promise<void>) => { await onSubmit({ teacherId: "u-admin" }); };
    const btn = new FakeEl({ "data-reassign-course": "c-1", "data-owner-id": "u-saul", "data-course-name": "Public Forum I" });
    Extra.manage.mount(fakeRoot({ "[data-reassign-course]": [btn] }));
    await btn.click();
    expect(calls.filter((c) => c.method === "PATCH")).toMatchObject([
      { url: "/api/courses/c-1", body: { teacherId: "u-admin" }, method: "PATCH" },
    ]);
    expect(DB.adminCourses[0].ownerId).toBe("u-admin");
  });
});
