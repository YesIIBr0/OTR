// [RONDA 3 · agente C2] Los dos encargos que van juntos sobre el Debate Hub y sus vecinos:
//
//   ENCARGO 1 — defectos del sondeo QA 2026-08-09 (docs/review/SONDEO_2026-08-09.md)
//     · M1  El admin veía la cara de COMPETIDOR: rating Glicko falso (1500), "Tu coach
//           registra y adjudica tus rondas" y el CTA "Registrarme". Misma familia que el
//           fix de perfil 7d70cc3: cada rol con su cara, sin inventar datos.
//     · M2  Aprobar una reserva en el Portal de familia no movía "Próximas sesiones"
//           hasta F5 (el backend sí guardaba). Faltaba refrescar la UI tras el 200.
//     · menor  Ajustes ofrecía "Gestionar membresía" y "Mi trayectoria" al ADMIN.
//
//   ENCARGO 2 — feedback de Isaac sobre la TARJETA DE RATING (la oscura), textual:
//     "Las W - verde" · "Las L - así negro" · "si dice «platinum» ... que sea en platino"
//     · "que no sea «Gold» en naranja, que sea gold" · "al cuadrado atrás ponle la foto
//     del estudiante" · "igualito que en dashboard".
//
// Los colores nuevos son SEMÁNTICOS (tokens propios) y están whitelisteados en
// tests/brand-palette.test.ts con su medición de contraste; aquí se fija que se usan
// donde el cliente pidió y que student/coach NO cambian de función.
import { describe, it, expect, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/* Stub de `window` ANTES de importar pantallas (mismo motivo que screens.test.ts). */
(globalThis as any).window = (globalThis as any).window || {};
const win: any = (globalThis as any).window;
win.api = async () => ({});
win.go = () => {};
win.toast = () => {};

import { DB } from "../app/lib/data";
import { S as SDebate } from "../app/lib/scr-debate";
import { S as SParent } from "../app/lib/scr-parent";
import { S as SSettings } from "../app/lib/scr-settings";

const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");
const screens = () => read("app/styles/screens.css");
const tokens = () => read("app/styles/tokens.css");

const FORM = [
  { result: "WIN", opponent: "Colegio A", delta: 48 },
  { result: "LOSS", opponent: "Colegio B", delta: -24 },
  { result: "WIN", opponent: "Colegio C", delta: 56 },
];

function hydrate(over: Record<string, any> = {}) {
  for (const k of Object.keys(DB)) delete (DB as any)[k];
  Object.assign(
    DB,
    {
      me: { name: "Analía Reyes", role: "student", initials: "AR", avatarUrl: null },
      debate: {
        rating: 1720, rd: 80, tier: "Gold", provisional: false,
        speakerAvg: null, speakerRounds: 0, recentForm: FORM, history: [],
        analytics: { byFormat: [], bySide: [], criteria: [] },
      },
      debateLeaderboard: {
        me: { rank: 3, rating: 1720, tier: "Gold" },
        rows: [
          { rank: 1, name: "Isabella Guzmán", initials: "IG", rating: 1850, tier: "Platinum" },
          { rank: 2, name: "Silvana Espaillat", initials: "SE", rating: 1815, tier: "Platinum" },
          { rank: 3, name: "Analía Reyes", initials: "AR", rating: 1720, tier: "Gold", you: true },
        ],
      },
      tournaments: [
        { id: "tn1", name: "Torneo interno OTR · Primavera", format: "PF", startsLabel: "dom 16 ago", registered: false },
      ],
      membership: { tier: "free" },
    },
    over,
  );
}

beforeEach(() => {
  hydrate();
  win.__debateTab = "overview";
});

/* ============================================================================
   ENCARGO 2 · la tarjeta de rating que pidió Isaac
   ========================================================================== */
describe("Isaac · tarjeta de rating: tiers en su metal, W verde, L negra", () => {
  it("el chip del tier Gold sale DORADO (no naranja) y arrastra su clase semántica", () => {
    const html = (SDebate as any).debateHub.render({ role: "student" });
    expect(html).toContain("chip--tier-gold");
    // El texto del tier sigue siendo el del payload traducido, no un literal nuevo.
    expect(html).toMatch(/chip--tier-gold[^>]*>(<svg[\s\S]*?<\/svg>)?Oro</);
  });

  it("«Próximo tier: Platino» va en PLATINO, no en el naranja de --dbt-sub b", () => {
    const html = (SDebate as any).debateHub.render({ role: "student" });
    expect(html).toContain("dbt-tier--platinum");
    expect(html).toMatch(/dbt-tier--platinum">Platino</);
  });

  it("un tier sin metal propio (Novato) conserva el chip de acento del kit", () => {
    hydrate({ debate: { ...(DB as any).debate, tier: "Novato", provisional: false } });
    const html = (SDebate as any).debateHub.render({ role: "student" });
    expect(html).not.toContain("chip--tier-gold");
    expect(html).not.toContain("chip--tier-platinum");
    expect(html).toContain("chip--accent");
  });

  it("CSS · la victoria usa el verde semántico y la derrota el NEGRO de marca", () => {
    const css = screens();
    expect(css).toMatch(/\.form-sq--win\{background:var\(--win\)/);
    expect(css).toMatch(/\.form-sq--loss\{background:var\(--otr-black\)/);
    // La derrota negra sobre card negra necesita contorno propio (WCAG 1.4.11, 3:1).
    expect(css).toMatch(/\.form-sq--loss\{[^}]*rgba\(255,255,255,\.38\)/);
  });

  it("CSS · los tres tokens nuevos existen con el valor medido", () => {
    const css = tokens();
    expect(css).toContain("--win:#2FA84F");
    expect(css).toContain("--tier-gold:#D4AF37");
    expect(css).toContain("--tier-platinum:#D6D5D1");
  });

  it("CSS · el chip de tier pinta el metal y mantiene texto negro (AA ≥ 8:1)", () => {
    const css = screens();
    expect(css).toMatch(/\.chip--tier-gold\{background:var\(--tier-gold\);color:var\(--text-on-accent\)/);
    expect(css).toMatch(/\.chip--tier-platinum\{background:var\(--tier-platinum\);color:var\(--text-on-accent\)/);
  });
});

describe("Isaac · la foto del estudiante detrás de la tarjeta (igual que el dashboard)", () => {
  it("con avatarUrl la card usa .hero-photo + --hero-img y suelta la textura naranja", () => {
    hydrate({ me: { name: "Analía Reyes", role: "student", initials: "AR", avatarUrl: "/uploads/analia.jpg" } });
    const html = (SDebate as any).debateHub.render({ role: "student" });
    expect(html).toContain("hero-photo");
    expect(html).toContain("--hero-img:url('/uploads/analia.jpg')");
    // La "textura" que Isaac quiere fuera es el halo de .card--glow.
    expect(html.slice(0, 400)).not.toContain("card--glow");
  });

  it("sin foto degrada al avatar de iniciales del kit y conserva la card de siempre", () => {
    const html = (SDebate as any).debateHub.render({ role: "student" });
    expect(html).not.toContain("hero-photo");
    expect(html.slice(0, 400)).toContain("card--glow");
    expect(html).toMatch(/class="avatar [^"]*"[^>]*>AR</);
  });

  it("una URL hostil (javascript:) NO llega a la hoja de estilos", () => {
    hydrate({ me: { name: "X", role: "student", initials: "X", avatarUrl: "javascript:alert(1)" } });
    const html = (SDebate as any).debateHub.render({ role: "student" });
    expect(html).not.toContain("javascript:");
    expect(html).not.toContain("--hero-img");
  });
});

/* ============================================================================
   ENCARGO 1 · M1 — el Debate Hub del ADMIN
   ========================================================================== */
describe("M1 · el admin ve una cara de observador, no un rating de competidor", () => {
  const admin = () => {
    hydrate({
      me: { name: "Equipo OTR", role: "admin", initials: "OT", avatarUrl: null },
      debate: {
        rating: 1500, rd: 350, tier: "Novato", provisional: true,
        speakerAvg: null, speakerRounds: 0, recentForm: [], history: [],
        analytics: { byFormat: [], bySide: [], criteria: [] },
      },
      debateLeaderboard: {
        me: { rank: 8, rating: 1500, tier: "Novato" },
        rows: [
          { rank: 1, name: "Isabella Guzmán", initials: "IG", rating: 1850, tier: "Platinum" },
          { rank: 2, name: "Silvana Espaillat", initials: "SE", rating: 1815, tier: "Platinum" },
          { rank: 3, name: "Analía Reyes", initials: "AR", rating: 1720, tier: "Gold" },
          { rank: 8, name: "Equipo OTR", initials: "OT", rating: 1500, tier: "Novato", you: true },
        ],
      },
    });
    return (SDebate as any).debateHub.render({ role: "admin" });
  };

  it("no pinta el rating 1500 como si fuera suyo, ni el tier, ni el aviso de provisional", () => {
    const html = admin();
    expect(html).not.toContain("Tu rating Glicko-2");
    expect(html).not.toContain("dbt-rating");
    expect(html).not.toContain("Tu rating es provisional");
    expect(html).not.toContain("Forma reciente");
  });

  it("no le ofrece «Registrarme» a un torneo ni «Tu coach registra y adjudica tus rondas»", () => {
    const html = admin();
    expect(html).not.toContain("data-tn-register");
    expect(html).not.toContain("Tu coach registra y adjudica tus rondas");
    expect(html).not.toContain('data-action="debate-record"');
  });

  it("sus sub-tabs son las de un observador (Resumen + Leaderboard), sin Mis debates ni Práctica", () => {
    const html = admin();
    expect(html).toContain('data-dtab="overview"');
    expect(html).toContain('data-dtab="leaderboard"');
    expect(html).not.toContain('data-dtab="history"');
    expect(html).not.toContain('data-dtab="practice"');
  });

  it("una sub-tab de competidor guardada de otra sesión no lo deja en una pantalla ajena", () => {
    win.__debateTab = "practice";
    const html = admin();
    expect(html).not.toContain("Encuentra compañero o rival");
    expect(html).toContain('data-dtab="leaderboard"');
  });

  it("en el Leaderboard no se le atribuye posición ni rating propios, ni se le vende OTR Pro", () => {
    win.__debateTab = "leaderboard";
    const html = admin();
    expect(html).not.toContain("Tu posición");
    expect(html).not.toContain("Ver OTR Pro");
    // La tabla real sigue completa (es su herramienta de observación).
    expect(html).toContain("Isabella Guzmán");
  });

  it("le da datos REALES del payload y una salida a su consola", () => {
    const html = admin();
    expect(html).toContain("1850"); // rating más alto de la tabla
    expect(html).toContain('data-go="admin"');
  });
});

describe("M1 · student y coach conservan el Hub EXACTAMENTE como está", () => {
  for (const role of ["student", "teacher"]) {
    it(`${role}: rating, forma reciente, 4 sub-tabs y CTA de torneo intactos`, () => {
      const html = (SDebate as any).debateHub.render({ role });
      expect(html).toContain("dbt-rating");
      expect(html).toContain("1720");
      expect(html).toContain("Forma reciente");
      expect(html).toContain('data-dtab="history"');
      expect(html).toContain('data-dtab="practice"');
      expect(html).toContain("data-tn-register");
    });
  }
});

/* ============================================================================
   ENCARGO 1 · M2 — aprobar una reserva refresca "Próximas sesiones" sin F5
   ========================================================================== */
describe("M2 · aprobar una reserva mueve «Próximas sesiones» sin recargar", () => {
  it("tras el 200 relee /api/app-data y repinta con la sesión ya confirmada", async () => {
    const PENDIENTE = {
      id: "kid-1", childId: "kid-1", name: "Diego Fermín", initials: "DF",
      upcoming: [],
      spendCents: 0,
      pendingConsents: [{ id: "bk-9", bookingId: "bk-9", coachName: "Saúl Méndez", slotLabel: "mar 12 ago · 4:00 PM", priceLabel: "$25.00" }],
      attendance: { attended: 0, scheduled: 0 }, achievements: [], skillDeltas: [],
      publicProfile: { enabled: false, slug: null },
    };
    hydrate({
      me: { name: "Rosa Fermín", role: "parent", initials: "RF" },
      parent: { children: [JSON.parse(JSON.stringify(PENDIENTE))] },
    });

    // El servidor ya guardó: la reserva pasa a CONFIRMED y aparece en upcoming.
    const FRESCO = {
      me: { name: "Rosa Fermín", initials: "RF" },
      parent: {
        children: [{
          ...PENDIENTE,
          pendingConsents: [],
          upcoming: [{ id: "bk-9", coachName: "Saúl Méndez", slotLabel: "mar 12 ago · 4:00 PM", durationMin: 60 }],
        }],
      },
    };
    let pedidoAppData = 0;
    (globalThis as any).fetch = async (url: string) => {
      if (String(url).includes("/api/app-data")) { pedidoAppData++; return { ok: true, json: async () => FRESCO }; }
      return { ok: false, json: async () => ({}) };
    };
    let patch: any = null;
    win.api = async (url: string, body: any, method: string) => { patch = { url, body, method }; return {}; };

    const page: any = { innerHTML: "" };
    const listeners: Record<string, any> = {};
    const okBtn: any = {
      disabled: false, textContent: "Aprobar",
      getAttribute: (k: string) => ({ "data-consent": "bk-9", "data-act": "ok" } as any)[k] ?? null,
      setAttribute: () => {}, removeAttribute: () => {},
      addEventListener: (ev: string, fn: any) => { listeners[ev] = fn; },
    };
    let vueltas = 0;
    const root: any = {
      querySelector: (sel: string) => (sel === ".page" ? page : null),
      querySelectorAll: (sel: string) => (vueltas === 1 && sel === "[data-consent]" ? [okBtn] : []),
    };
    const mount = () => { vueltas++; (SParent as any).parentPortal.mount(root, { role: "parent" }); };
    mount();

    await listeners.click();

    expect(patch).toEqual({ url: "/api/bookings/bk-9", body: { status: "CONFIRMED" }, method: "PATCH" });
    expect(pedidoAppData).toBe(1);
    // La verdad del servidor mandó: 1 sesión próxima, 0 aprobaciones pendientes…
    expect((DB as any).parent.children[0].upcoming).toHaveLength(1);
    // …y la pantalla ya repintada la muestra (sin F5): el KPI "Próximas sesiones" sube a 1
    // (era el defecto: se quedaba en 0) y la fila de aprobación desaparece.
    const kpi = (html: string, label: string) =>
      (html.match(new RegExp(`${label}</span>[\\s\\S]{0,40}?class="k-val">([^<]*)<`)) || [])[1];
    expect(kpi(page.innerHTML, "Próximas sesiones")).toBe("1");
    expect(kpi(page.innerHTML, "Aprobaciones pendientes")).toBe("0");
    expect(page.innerHTML).toContain("mar 12 ago · 4:00 PM");
    expect(page.innerHTML).not.toContain("data-consent");
  });
});

/* ============================================================================
   ENCARGO 1 · menor — Ajustes sin conceptos de alumno para el ADMIN
   ========================================================================== */
describe("menor · Ajustes: el admin no ve membresía ni «Mi trayectoria»", () => {
  it("admin: sin tarjeta de membresía y sin perfil público de alumno; conserva 2FA", () => {
    hydrate({ me: { name: "Equipo OTR", role: "admin", initials: "OT", email: "admin@otr.do" } });
    const html = (SSettings as any).settings.render({ role: "admin" });
    expect(html).not.toContain("Gestionar membresía");
    expect(html).not.toContain("Mi trayectoria");
    expect(html).not.toContain('data-go="lifetime"');
    expect(html).toContain("Verificación en dos pasos");
  });

  it("student: membresía y trayectoria siguen ahí (nada se le quita al alumno)", () => {
    hydrate({ me: { name: "Analía Reyes", role: "student", initials: "AR", email: "analia.reyes@otr.do" } });
    const html = (SSettings as any).settings.render({ role: "student" });
    expect(html).toContain("Gestionar membresía");
    expect(html).toContain("Mi trayectoria");
  });

  it("el correo de la cabecera se elide con title completo (defecto menor de móvil)", () => {
    hydrate({ me: { name: "Rosa Fermín", role: "parent", initials: "RF", email: "rosa.fermin@otr.do" } });
    const html = (SSettings as any).settings.render({ role: "parent" });
    expect(html).toMatch(/text-overflow:ellipsis;white-space:nowrap"[^>]*title="rosa\.fermin@otr\.do"/);
  });
});
