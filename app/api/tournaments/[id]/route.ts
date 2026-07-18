// OTR Debate Hub · /api/tournaments/[id]  [F6.2]
//   PATCH  — edita un torneo (staff: ADMIN|TEACHER). Allowlist estricta compartida con create,
//            SIN campos peligrosos. audit "tournament.update" con el detalle antes→después.
//   DELETE — borra un torneo (SOLO ADMIN). Política SEGURA: si tiene inscritos, se BLOQUEA
//            (no cascada silenciosa que borre inscripciones de alumnos). audit "tournament.delete".
import { ok, bad, readJson } from "../../../lib/api";
import { getSessionUser } from "../../../lib/auth";
import { db } from "../../../lib/db";
import { requireRole } from "../../../lib/authz";
import { audit } from "../../../lib/audit";
import { cleanTournamentInput, fmtTournamentVal } from "../../../lib/tournaments";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return bad("No autenticado", 401);
  if (!requireRole(user, "ADMIN", "TEACHER"))
    return bad("Solo administradores o profesores pueden gestionar torneos", 403);

  const { id } = await params;
  const before = await db.tournament.findUnique({ where: { id } });
  if (!before) return bad("Torneo no encontrado", 404);

  const body = await readJson<Record<string, unknown>>(req);
  // Allowlist parcial: solo campos presentes y válidos; nunca el body crudo (bloquea id/rounds/…).
  const data = cleanTournamentInput(body, { forCreate: false });
  if (Object.keys(data).length === 0) return bad("Nada que actualizar");

  const after = await db.tournament.update({ where: { id }, data });

  // [F2] Rastro de auditoría: SOLO lo que realmente cambió, en formato antes→después.
  const changes: string[] = [];
  for (const k of Object.keys(data)) {
    const b = fmtTournamentVal((before as Record<string, unknown>)[k]);
    const a = fmtTournamentVal((after as Record<string, unknown>)[k]);
    if (b !== a) changes.push(`${k}: ${b}→${a}`);
  }
  await audit({
    actorId: user.id,
    actorName: user.name,
    action: "tournament.update",
    targetType: "tournament",
    targetId: id,
    detail: `Torneo "${after.name}" · ${changes.length ? changes.join(" · ") : "sin cambios netos"}`,
  });

  return ok({ tournament: after });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return bad("No autenticado", 401);
  // Borrado destructivo → SOLO ADMIN (más estricto que create/patch).
  if (!requireRole(user, "ADMIN")) return bad("Solo administradores", 403);

  const { id } = await params;
  const tournament = await db.tournament.findUnique({
    where: { id },
    include: { _count: { select: { registrations: true } } },
  });
  if (!tournament) return ok(); // idempotente: ya no existe

  // Política SEGURA: bloquear si hay inscritos. El schema tiene onDelete: Cascade, así que un
  // delete arrastraría las TournamentRegistration de alumnos reales sin dejar rastro → pérdida de
  // datos que ellos no autorizaron. Preferimos frenar y exigir cancelar inscripciones primero.
  if (tournament._count.registrations > 0)
    return bad("No se puede borrar un torneo con inscritos. Cancela las inscripciones primero.", 409);

  await db.tournament.delete({ where: { id } }); // cascade limpia solo las rondas (estructura, no datos de alumnos)
  await audit({
    actorId: user.id,
    actorName: user.name,
    action: "tournament.delete",
    targetType: "tournament",
    targetId: id,
    detail: `Torneo "${tournament.name}" borrado`,
  });

  return ok();
}
