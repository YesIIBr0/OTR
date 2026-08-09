// [CIERRE · GOAL 2026-08] Los dos XSS ALMACENADOS que cerró la última revisión de rama.
//
//   C1 · coach → admin. El renderer de <option> del formModal de Aula.tsx pinta la etiqueta
//        CRUDA (contrato de la casa: queries.ts escapa una vez y los builders pintan crudo).
//        El selector "Dueño del curso" de "Nuevo curso" se alimentaba de /api/admin/users,
//        que NO pasa por queries.ts: un coach con markup en su nombre lo ejecutaba en el
//        navegador del ADMIN. El arreglo escapa EN EL BORDE (el call-site), igual que ya
//        hacía el "Reasignar dueño" de scr-extra contra esa misma API.
//
//   C2 · coach → cualquier visitante. GET /api/coaches/[id] devolvía name/headline/bio/
//        credenciales/reseñas CRUDOS y scr-marketplace los pinta crudos tras loadDetail()
//        (`normCoach({...base, ...detail})` hace que el detalle PISE al base ya escapado).
//        El arreglo escapa en la ruta, con el mismo criterio que queries.ts y que
//        /api/listings/[id]; el builder pierde sus esc() para no escapar DOS veces.
//
// Aula.tsx es un componente de cliente (.tsx) y la suite corre en Node sin DOM, así que C1
// se blinda leyendo el fuente (mismo recurso que brand-palette.test.ts) y C2 se ejercita de
// verdad: la ruta con la DB mockeada y el builder con el payload que la ruta produce.
import { describe, it, expect, beforeEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { makeDb, jsonReq } from "./helpers/route-harness";

/* eslint-disable @typescript-eslint/no-explicit-any */
const box = vi.hoisted(() => ({ db: null as any, user: null as any }));
vi.mock("../app/lib/db", () => ({
  db: new Proxy({}, { get: (_t, p: string) => (p === "then" ? undefined : box.db.db[p]) }),
}));
vi.mock("../app/lib/auth", () => ({ setSession: vi.fn(), getSessionUser: () => box.user, clearSession: vi.fn() }));

(globalThis as any).window = (globalThis as any).window || {};
const win: any = (globalThis as any).window;
win.api = async () => ({});
win.go = () => {};
win.toast = () => {};

import { GET } from "../app/api/coaches/[id]/route";
import { DB } from "../app/lib/data";
import { S as SMkt } from "../app/lib/scr-marketplace";

const Mkt: any = SMkt;
box.db = makeDb();
const db = box.db;

/** La sonda: si alguna vez se crea un elemento, el navegador ejecutaría el markup del coach. */
const PROBE = '<i data-probe>x</i>';
const PROBE_ESC = '&lt;i data-probe&gt;x&lt;/i&gt;';

/** El HTML sin sus atributos. Dentro de un atributo el doble escape es LEGÍTIMO (transporte:
 *  data-coach-name/data-mk-spec se leen con getAttribute, que decodifica una capa). Lo que
 *  nunca puede llevar dos capas es el TEXTO que se muestra. */
const textOnly = (html: string) => html.replace(/\s[\w:-]+="[^"]*"/g, "");

const PROFILE = {
  id: "cp-1",
  userId: "u-coach",
  active: true,
  introVideoUrl: "",
  credentials: `Campeón nacional ${PROBE}`,
  specialties: "Public Forum, Extemp",
  languages: "ES,EN",
  hourlyCents: 280000,
  responseTime: "~2 h",
  cancelPolicy: "Cancela 24 h antes & sin cargo",
  bookingCount: 12,
  packages: [{ id: "pk-1", name: `Paquete "Élite" ${PROBE}`, sessions: 5, priceCents: 1200000, discountPct: 10 }],
  availability: [{ id: "av-1", weekday: 1, startMin: 540, endMin: 600 }],
};
const COACH_USER = {
  id: "u-coach",
  name: `Saúl ${PROBE}`,
  initials: "SM",
  headline: `Coach de St. Michael's ${PROBE}`,
  bio: `Campeón desde 2018. ${PROBE}`,
  teachingStyle: "Caso primero",
  formats: "Public Forum",
  avatarUrl: "",
  coachVerified: true,
  location: "Santo Domingo",
};
const STUDENT = { id: "s-1", name: "Analía", role: "STUDENT" };

async function get(id = "cp-1") {
  const res = await GET(jsonReq(`/api/coaches/${id}`, undefined, "GET"), { params: Promise.resolve({ id }) });
  return { status: res.status, json: (await res.json().catch(() => ({}))) as any };
}

beforeEach(() => {
  db.reset();
  vi.clearAllMocks();
  box.user = STUDENT;
  db.fn("coachProfile.findUnique").mockResolvedValue({ ...PROFILE });
  db.fn("user.findUnique").mockResolvedValue({ ...COACH_USER });
  db.fn("review.findMany").mockResolvedValue([
    {
      id: "rv-1",
      rating: 5,
      body: `Me llevó a semis ${PROBE}`,
      createdAt: new Date("2026-06-01"),
      studentId: "s-9",
      student: { name: `Diego ${PROBE}`, initials: "DF" },
    },
  ]);
  db.fn("booking.findMany").mockResolvedValue([]);
});

/* ============ C2 · la ruta escapa en el borde ============ */
describe("C2 · GET /api/coaches/[id] escapa el texto de usuario UNA vez", () => {
  it("nombre, titular, bio, credenciales y política salen escapados", async () => {
    const { status, json } = await get();
    expect(status).toBe(200);
    const c = json.coach;
    for (const campo of ["name", "headline", "bio", "credentials"] as const) {
      expect(c[campo]).toContain(PROBE_ESC);
      expect(c[campo]).not.toContain("<i data-probe>");
    }
    expect(c.cancelPolicy).toBe("Cancela 24 h antes &amp; sin cargo");
  });

  it("los paquetes y las reseñas también (nombre del paquete, autor y cuerpo)", async () => {
    const { json } = await get();
    expect(json.coach.packages[0].name).toContain(PROBE_ESC);
    expect(json.reviews[0].body).toContain(PROBE_ESC);
    expect(json.reviews[0].studentName).toContain(PROBE_ESC);
    expect(json.reviews[0].body).not.toContain("<i data-probe>");
  });

  it("escapa UNA vez, no dos (nada de &amp;lt;)", async () => {
    const { json } = await get();
    expect(JSON.stringify(json)).not.toContain("&amp;lt;");
  });

  it("no toca lo que no es texto de usuario: ids, números y etiquetas del servidor", async () => {
    const { json } = await get();
    expect(json.coach.id).toBe("cp-1");
    expect(json.coach.userId).toBe("u-coach");
    expect(json.coach.hourlyCents).toBe(280000);
    expect(json.coach.availability[0].dayLabel).toBe("Lunes");
    // languages viaja crudo A PROPÓSITO: langBadges() lo escapa al pintar (una sola capa).
    expect(json.coach.languages).toBe("ES,EN");
  });
});

/* ============ C2 · el builder pinta esa salida UNA vez ============ */
describe("C2 · la ficha del marketplace no crea el elemento ni antes ni después de loadDetail", () => {
  beforeEach(() => {
    for (const k of Object.keys(DB)) delete (DB as any)[k];
    Object.assign(DB, {
      me: { name: "Analía Reyes", initials: "AR", role: "student" },
      // Tal cual lo sirve queries.ts: escapado UNA vez.
      marketplace: {
        viewer: { ageBand: "adult" },
        coaches: [{
          id: "u-coach", profileId: "cp-1",
          name: `Saúl ${PROBE_ESC}`, initials: "SM", headline: `Coach de St. Michael&#39;s ${PROBE_ESC}`,
          coachVerified: true, languages: ["ES", "EN"], specialties: `Public Forum ${PROBE_ESC}`,
          credentials: "", responseTime: "~2 h", cancelPolicy: "", hourlyCents: 280000,
          ratingAvg: 5, reviewCount: 1, bookingCount: 12, packages: [], availability: [],
          fromPriceCents: 280000,
        }],
      },
    });
    win.__mkCoachId = null;
    win.__mkDetail = null;
    win.__mkDetailFail = null;
    // [G2] Estas pruebas ejercitan el render de la FICHA presembrando __mkCoachId. Tras el fix,
    // render() descarta la ficha salvo en un repintado interno; marcamos ese modo para que la
    // ficha se pinte de verdad (las de GRID dejan __mkCoachId=null y siguen dando la lista).
    win.__mkInternalRepaint = true;
  });

  it("el GRID pinta el markup como TEXTO (queda la entidad, no el elemento)", () => {
    const html = Mkt.marketplace.render({ role: "student" });
    expect(html).toContain(PROBE_ESC);
    expect(html).not.toContain("<i data-probe>");
    expect(textOnly(html)).not.toContain("&amp;lt;");
  });

  it("la FICHA tras loadDetail() tampoco lo crea, y el detalle no gana crudo sobre el base", async () => {
    const { json } = await get();
    win.__mkCoachId = "u-coach";
    // Exactamente lo que guarda loadDetail() con la respuesta REAL de la ruta.
    const coach = json.coach;
    win.__mkDetail = {
      id: "u-coach",
      data: { ...coach, id: coach.userId, profileId: coach.id, reviewsList: json.reviews },
    };
    const html = Mkt.marketplace.render({ role: "student" });
    expect(html).toContain(PROBE_ESC);
    expect(html).not.toContain("<i data-probe>");
    expect(textOnly(html)).not.toContain("&amp;lt;");
    // La bio y las credenciales del detalle son el camino que antes salía CRUDO.
    expect(html).toContain(`Campeón desde 2018. ${PROBE_ESC}`);
    expect(html).toContain(`Campeón nacional ${PROBE_ESC}`);
  });

  it("una comilla del nombre real se lee bien (ni &#39; a la vista ni doble escape)", () => {
    win.__mkCoachId = "u-coach";
    win.__mkDetail = null;
    const html = Mkt.marketplace.render({ role: "student" });
    expect(html).toContain("St. Michael&#39;s");
    expect(textOnly(html)).not.toContain("&amp;#39;");
  });
});

/* ============ C1 · el select de "Dueño del curso" ============ */
describe("C1 · el <option> del formModal no puede recibir texto crudo de la API", () => {
  const aula = () => readFileSync(join(process.cwd(), "app/components/Aula.tsx"), "utf8");

  it("el selector de coach dueño (admin) escapa el nombre en el call-site", () => {
    const src = aula();
    expect(src).toContain("...coaches.map((c) => ({ value: c.id, label: esc(c.name) }))");
    // Y el nombre CRUDO ya no viaja al renderer.
    expect(src).not.toContain("coaches.map((c) => ({ value: c.id, label: c.name }))");
  });

  it("el atributo value del <option> va escapado (contexto de atributo)", () => {
    expect(aula()).toContain('<option value="${esc(o.value)}"');
  });

  it("scr-extra escapa contra la MISMA API (mismo criterio, una sola capa)", () => {
    const src = readFileSync(join(process.cwd(), "app/lib/scr-extra.ts"), "utf8");
    expect(src).toContain("coaches.map((c) => ({ value: c.id, label: esc(c.name) }))");
  });
});
