// Regresión: el Aula y el Debate Hub tienen DOS rankings distintos y NO deben mezclarse.
//
// Bug real (visto con clicks en dev, 2026-08-08): al volverse mensual la tarjeta del
// dashboard, `DB.leaderboard` pasó a venir ordenado por XP del mes. El Debate Hub leía
// ESE mismo objeto, así que su tabla —rotulada "ranking por rating Glicko-2"— listaba
// a Silvana (1815) por debajo de Analía (1720). Dos criterios, un solo objeto.
//
// Desde entonces el payload trae `DB.debateLeaderboard` (siempre por rating) aparte de
// `DB.leaderboard` (la del Aula, mensual cuando hay temporada viva). Este test fija esa
// separación: si alguien vuelve a apuntar el Hub a la tabla del Aula, falla aquí.
import { describe, it, expect, beforeEach } from "vitest";

// Stub de `window` ANTES de importar la pantalla (mismo motivo que en screens.test.ts:
// varios helpers de scr-*.ts referencian `window` a nivel de módulo).
(globalThis as any).window = (globalThis as any).window || {};
const win: any = (globalThis as any).window;
win.api = async () => ({});
win.go = () => {};
win.toast = () => {};

import { DB } from "../app/lib/data";
import { S as SDebate } from "../app/lib/scr-debate";

// Isabella es 1ª por las dos varas. La diferencia está en el 2º/3er puesto:
//   · por RATING  → Silvana (1815) antes que Analía (1720)
//   · por XP DEL MES → Analía (560) antes que Silvana (360)
const ISA = { name: "Isabella Guzmán", initials: "IG", rating: 1850, tier: "Platinum", you: false };
const SIL = { name: "Silvana Espaillat", initials: "SE", rating: 1815, tier: "Platinum", you: false };
const ANA = { name: "Analía Reyes", initials: "AR", rating: 1720, tier: "Gold", you: true };

function hydrate() {
  for (const k of Object.keys(DB)) delete (DB as any)[k];
  Object.assign(DB, {
    me: { name: "Analía Reyes", role: "STUDENT", xp: 3120, lang: "es" },
    debate: {
      rating: 1720, rd: 60, tier: "Gold", provisional: false,
      speakerAvg: null, speakerRounds: 0, recentForm: [], history: [],
      analytics: { byFormat: [], bySide: [], criteria: [] },
    },
    // Tabla del AULA: ordenada por XP del mes, con premios de temporada.
    leaderboard: {
      period: { label: "agosto", endsInDays: 23 },
      rows: [
        { rank: 1, ...ISA, xp: 840, prize: "Beca completa · próximo módulo" },
        { rank: 2, ...ANA, xp: 560, prize: "Sesión 1:1 con coach" },
        { rank: 3, ...SIL, xp: 360, prize: "Kit oficial OTR + credencial" },
      ],
      me: { rank: 2, rating: 1720, tier: "Gold", xp: 560 },
    },
    // Tabla del DEBATE HUB: ordenada por rating Glicko-2, sin xp ni premios.
    debateLeaderboard: {
      rows: [
        { rank: 1, ...ISA },
        { rank: 2, ...SIL },
        { rank: 3, ...ANA },
      ],
      me: { rank: 3, rating: 1720, tier: "Gold" },
    },
    membership: { tier: "pro" },
    tournaments: [],
  });
}

/** Puestos del podio del Hub, en el orden de la tabla (no en el del DOM). */
function hubPodiumOrder(html: string): string[] {
  const names = ["Isabella Guzmán", "Silvana Espaillat", "Analía Reyes"];
  return names
    .map((n) => ({ n, rank: Number((html.match(new RegExp(`>(\\d)</div>\\s*<div class="pod-n">${n}`)) || [])[1]) }))
    .filter((x) => !Number.isNaN(x.rank))
    .sort((a, b) => a.rank - b.rank)
    .map((x) => x.n);
}

describe("dos rankings, dos tablas", () => {
  beforeEach(() => {
    hydrate();
    win.__debateTab = "leaderboard";
  });

  it("el Debate Hub lista por RATING aunque la tabla del Aula venga por XP del mes", () => {
    const html = (SDebate as any).debateHub.render({ role: "student" });
    expect(hubPodiumOrder(html)).toEqual(["Isabella Guzmán", "Silvana Espaillat", "Analía Reyes"]);
    // Mi posición es la del rating (3ª), no la mensual (2ª).
    expect(html).toContain(">#3<");
  });

  it("el Hub no arrastra ni el XP del mes ni los premios de la temporada del Aula", () => {
    const html = (SDebate as any).debateHub.render({ role: "student" });
    expect(html).not.toContain("840 XP");
    expect(html).not.toContain("Beca completa");
  });

  it("sin debateLeaderboard (payload viejo) cae a DB.leaderboard en vez de quedarse vacío", () => {
    delete (DB as any).debateLeaderboard;
    const html = (SDebate as any).debateHub.render({ role: "student" });
    expect(html).toContain("Isabella Guzmán");
  });
});
