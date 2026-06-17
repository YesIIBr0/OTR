// OTR Hub · Placement inicial (PRD §2.2 Journey A + §4.3).
// Auto-evaluación de 3 min: el estudiante sitúa su punto de partida en las 6
// dimensiones. NO es un examen — define el baseline del Skill Graph.
// POST (STUDENT): { scores:{Confianza,…,Delivery: 0-100} } → upsert StudentSkill
//   por dimensión, fija User.placedAt=now, registra ActivityEvent 'placement_done'.
// GET (auth): { placed: !!user.placedAt }.
import { db } from "../../lib/db";
import { getSessionUser } from "../../lib/auth";
import { ok, bad, readJson } from "../../lib/api";
import { logActivitySafe } from "../../lib/activity";

// Las 6 dimensiones canónicas, en orden de contrato.
const SKILLS = ["Confianza", "Estructura", "Evidencia", "Refutación", "Cross-ex", "Delivery"] as const;
const VALID = new Set<string>(SKILLS);

function clampScore(v: unknown): number {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

// Nivel sugerido por el promedio — SOLO informativo (no fija nada).
function levelFor(avg: number): string {
  if (avg < 35) return "Novato";
  if (avg < 60) return "JV";
  if (avg < 80) return "Varsity";
  return "Elite";
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) return bad("No autenticado", 401);
  return ok({ placed: !!user.placedAt });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return bad("No autenticado", 401);
  if (user.role !== "STUDENT") return bad("Solo estudiantes", 403);

  const body = await readJson<{ scores?: unknown }>(req);
  const scores = (body.scores ?? {}) as Record<string, unknown>;
  if (typeof scores !== "object" || Array.isArray(scores)) return bad("scores inválido");

  // Acota cada dimensión 0-100 y upsert por la unique (userId_skill).
  const clamped: Record<string, number> = {};
  // [SPINE-02 / §8.2] Ledger antes/después para que el placement (el mayor cambio de skill
  // del sistema) sea ATRIBUIBLE al tocar la dimensión, vía meta.skillBumps.
  const ledger: Array<{ skill: string; before: number; after: number }> = [];
  for (const skill of SKILLS) {
    const score = clampScore(scores[skill]);
    clamped[skill] = score;
    const existing = await db.studentSkill.findUnique({ where: { userId_skill: { userId: user.id, skill } } });
    ledger.push({ skill, before: existing?.score ?? 0, after: score });
    await db.studentSkill.upsert({
      where: { userId_skill: { userId: user.id, skill } },
      update: { score },
      create: { userId: user.id, skill, score },
    });
  }

  // Nivel SUGERIDO por el promedio del placement — SOLO informativo (no fija el rango).
  const vals = SKILLS.map((s) => clamped[s]);
  const avg = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  const level = levelFor(avg);
  // [fix nivel] El placement fija el BASELINE de skills (Skill Graph) + placedAt, pero NO el
  // rango (level): el rango se DERIVA del XP — todos inician en Novato con 0 XP. Antes esto
  // fijaba level = levelFor(skill-avg), marcando a alumnos recién llegados (0 XP) como JV/Varsity.
  await db.user.update({ where: { id: user.id }, data: { placedAt: new Date() } });

  await logActivitySafe({
    userId: user.id,
    type: "placement_done",
    title: "Completó su evaluación inicial",
    source: "placement",
    meta: { scores: clamped, skillBumps: ledger },
  });

  return ok({ placed: true, level });
}
