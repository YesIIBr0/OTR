import { db } from "../../lib/db";
import { getSessionUser } from "../../lib/auth";
import { ok, bad, readJson, clean } from "../../lib/api";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return bad("No autenticado", 401);
  const body = await readJson<{ lessonTitle?: string; score?: unknown; total?: unknown }>(req);
  const lessonTitle = clean(body.lessonTitle, 160) || "Examen";
  const s = Math.max(0, Number(body.score) || 0);
  const t = Math.max(0, Number(body.total) || 0);

  // Mejor intento previo en esta lección (anti-farmeo de XP).
  const prevBest = await db.quizAttempt.findFirst({
    where: { userId: user.id, lessonTitle },
    orderBy: { score: "desc" },
  });
  const prevPct = prevBest && prevBest.total ? Math.round((prevBest.score / prevBest.total) * 100) : 0;

  await db.quizAttempt.create({
    data: { userId: user.id, userName: user.name, lessonTitle, score: s, total: t },
  });

  // XP solo por mejora sobre tu mejor marca: repetir con igual/peor nota no da XP.
  const pct = t ? Math.round((s / t) * 100) : 0;
  const xpGain = Math.max(0, (pct - prevPct) * 3);
  if (xpGain > 0) {
    const updated = await db.user.update({ where: { id: user.id }, data: { xp: { increment: xpGain } } });
    const levels = await db.level.findMany({ orderBy: { startXp: "desc" } });
    const newLevel = levels.find((l) => updated.xp >= l.startXp);
    if (newLevel && newLevel.name !== updated.level) {
      await db.user.update({ where: { id: user.id }, data: { level: newLevel.name } });
    }
  }
  return ok({ xpGain });
}
