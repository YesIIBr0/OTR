// OTR Debate Hub · /api/tournaments
//   GET  — lista de torneos con filtros opcionales ?format= ?region= ?status=
//          y conteo de inscritos por torneo.
//   POST — register (auth): inscribe al usuario (idempotente). Valida que el
//          torneo exista y esté UPCOMING.
import { db } from "../../lib/db";
import { getSessionUser } from "../../lib/auth";
import { ok, bad, readJson, clean } from "../../lib/api";

const VALID_STATUS = new Set(["UPCOMING", "LIVE", "DONE"]);

export async function GET(req: Request) {
  const url = new URL(req.url);
  const format = clean(url.searchParams.get("format"), 16);
  const region = clean(url.searchParams.get("region"), 64);
  const statusRaw = clean(url.searchParams.get("status"), 16).toUpperCase();

  const where: Record<string, unknown> = {};
  if (format) where.format = format;
  if (region) where.region = region;
  if (statusRaw && VALID_STATUS.has(statusRaw)) where.status = statusRaw;

  const rows = await db.tournament.findMany({
    where,
    orderBy: [{ startsAt: "asc" }, { name: "asc" }],
    include: { _count: { select: { registrations: true } } },
  });

  const tournaments = rows.map((t) => ({
    id: t.id,
    name: t.name,
    format: t.format,
    ageDivision: t.ageDivision,
    region: t.region,
    modality: t.modality,
    entryCents: t.entryCents,
    startsAt: t.startsAt,
    source: t.source,
    status: t.status,
    registered: t._count.registrations,
  }));

  return ok({ tournaments });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return bad("No autenticado", 401);

  const body = await readJson<{ tournamentId?: string; partner?: string }>(req);
  const tournamentId = clean(body.tournamentId, 80);
  if (!tournamentId) return bad("Falta el torneo");

  const tournament = await db.tournament.findUnique({ where: { id: tournamentId } });
  if (!tournament) return bad("Torneo no encontrado", 404);
  if (tournament.status !== "UPCOMING") return bad("Las inscripciones están cerradas", 409);

  const partner = clean(body.partner, 120) || null;

  // Idempotente: si ya está inscrito, no duplicar.
  const existing = await db.tournamentRegistration.findUnique({
    where: { tournamentId_userId: { tournamentId, userId: user.id } },
  });
  if (existing) return ok({ registration: existing, already: true });

  const registration = await db.tournamentRegistration.create({
    data: { tournamentId, userId: user.id, partner },
  });

  return ok({ registration });
}
