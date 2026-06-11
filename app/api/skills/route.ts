// OTR Hub · Habilidades (radar) — las 6 dimensiones del estudiante.
// GET: { ok, skills:[{skill,score}] } del userId pedido.
// POST: SOLO TEACHER/ADMIN evalúan; upsert por la unique (userId_skill).
import { db } from "../../lib/db";
import { getSessionUser } from "../../lib/auth";
import { ok, bad, readJson, clean } from "../../lib/api";

// Las 6 dimensiones válidas, en orden de contrato.
const SKILLS = ["Confianza", "Estructura", "Evidencia", "Refutación", "Cross-ex", "Delivery"] as const;
const VALID = new Set<string>(SKILLS);

function clampScore(v: unknown): number {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return bad("No autenticado", 401);

  const url = new URL(req.url);
  const userId = clean(url.searchParams.get("userId"), 80);
  if (!userId) return bad("Falta userId");

  // IDOR: solo se pueden leer las propias habilidades, salvo TEACHER/ADMIN.
  const isStaff = user.role === "TEACHER" || user.role === "ADMIN";
  if (userId !== user.id && !isStaff) return bad("No autorizado", 403);

  const rows = await db.studentSkill.findMany({
    where: { userId },
    select: { skill: true, score: true },
  });

  return ok({ skills: rows });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return bad("No autenticado", 401);
  if (user.role !== "TEACHER" && user.role !== "ADMIN") return bad("Solo coaches", 403);

  const body = await readJson<{ userId?: unknown; scores?: unknown }>(req);

  const userId = clean(body.userId, 80);
  if (!userId) return bad("Falta userId");

  const scores = (body.scores ?? {}) as Record<string, unknown>;
  if (typeof scores !== "object" || Array.isArray(scores)) return bad("scores inválido");

  let count = 0;
  for (const [skill, raw] of Object.entries(scores)) {
    if (!VALID.has(skill)) continue;
    if (raw === undefined || raw === null || raw === "") continue;
    const score = clampScore(raw);
    await db.studentSkill.upsert({
      where: { userId_skill: { userId, skill } },
      update: { score },
      create: { userId, skill, score },
    });
    count++;
  }

  return ok({ count });
}
