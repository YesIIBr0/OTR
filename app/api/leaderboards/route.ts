// OTR Debate Hub · /api/leaderboards
//   GET (auth) — top 50 por debateRating desc (?scope=global por ahora).
//   Devuelve cada entrada con { rank, name, initials, rating, tier, me } y la
//   posición del usuario actual (incluso si está fuera del top 50).
import { db } from "../../lib/db";
import { getSessionUser } from "../../lib/auth";
import { ok, bad, clean } from "../../lib/api";
import { tierFor } from "../../lib/glicko2";

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return bad("No autenticado", 401);

  const url = new URL(req.url);
  const scope = clean(url.searchParams.get("scope"), 24) || "global";
  // Por ahora solo 'global'; el scope se reserva para region/club a futuro.

  const top = await db.user.findMany({
    orderBy: [{ debateRating: "desc" }, { name: "asc" }],
    take: 50,
    select: { id: true, name: true, initials: true, debateRating: true, debateTier: true },
  });

  const leaders = top.map((u, i) => ({
    rank: i + 1,
    userId: u.id,
    name: u.name,
    initials: u.initials,
    rating: Math.round(u.debateRating),
    tier: u.debateTier || tierFor(u.debateRating),
    me: u.id === user.id,
  }));

  // Posición del usuario actual: cuántos lo superan (orden estable por rating, luego nombre).
  const meInTop = leaders.find((l) => l.me);
  let myRank: number;
  if (meInTop) {
    myRank = meInTop.rank;
  } else {
    // Rank = (#usuarios con mayor rating) + (#empates con menor nombre) + 1.
    const higher = await db.user.count({ where: { debateRating: { gt: user.debateRating } } });
    const tiedBefore = await db.user.count({
      where: { debateRating: user.debateRating, name: { lt: user.name } },
    });
    myRank = higher + tiedBefore + 1;
  }

  const me = {
    rank: myRank,
    userId: user.id,
    name: user.name,
    initials: user.initials,
    rating: Math.round(user.debateRating),
    tier: user.debateTier || tierFor(user.debateRating),
  };

  return ok({ scope, leaders, me });
}
