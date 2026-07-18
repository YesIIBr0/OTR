// OTR Debate Hub · /api/tournaments
//   GET  — lista de torneos con filtros opcionales ?format= ?region= ?status=
//          y conteo de inscritos por torneo.
//   POST — dos operaciones sobre la MISMA colección, distinguidas por body.op:
//            · op:"create"  → alta de torneo (staff: ADMIN|TEACHER). Allowlist estricta. [F6.2]
//            · (por defecto) → register (auth): inscribe al usuario (idempotente). Valida que
//              el torneo exista y esté UPCOMING. CONTRATO INTACTO — la rama de creación se
//              antepone sin tocar una línea de la inscripción.
import { db } from "../../lib/db";
import { getSessionUser } from "../../lib/auth";
import { ok, bad, readJson, clean } from "../../lib/api";
import { requireRole } from "../../lib/authz";
import { audit } from "../../lib/audit";
import {
  VALID_STATUS,
  cleanTournamentInput,
  type TournamentCreateData,
} from "../../lib/tournaments";

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

// [F6.2] Alta de torneo (staff). Allowlist ESTRICTA vía cleanTournamentInput: nunca el body
// crudo (bloquea mass-assignment de id/rounds/registrations/_count). audit "tournament.create".
async function createTournament(
  user: { id: string; name: string },
  body: Record<string, unknown>,
) {
  const data = cleanTournamentInput(body, { forCreate: true }) as TournamentCreateData;
  if (!data.name) return bad("El nombre del torneo es obligatorio");

  const tournament = await db.tournament.create({ data });
  await audit({
    actorId: user.id,
    actorName: user.name,
    action: "tournament.create",
    targetType: "tournament",
    targetId: tournament.id,
    detail: `Torneo "${tournament.name}" creado (${tournament.format} · ${tournament.status})`,
  });
  return ok({ tournament });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return bad("No autenticado", 401);

  const body = await readJson<{ op?: string; tournamentId?: string; partner?: string }>(req);

  // --- Rama de CREACIÓN (staff) — se distingue por op:"create", así la inscripción de abajo
  //     conserva su contrato exacto para el alumno. Gate de rol estricto (STUDENT → 403). ---
  if (body.op === "create") {
    if (!requireRole(user, "ADMIN", "TEACHER"))
      return bad("Solo administradores o profesores pueden gestionar torneos", 403);
    return createTournament(user, body as Record<string, unknown>);
  }

  // --- Inscripción (register) — comportamiento INTACTO ---
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
