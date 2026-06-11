// PATCH /api/consultations/[id] — TEACHER/ADMIN: cambia el status de una reserva.
import { db } from "../../../lib/db";
import { ok, bad, readJson, clean } from "../../../lib/api";
import { getSessionUser } from "../../../lib/auth";

const STATUSES = new Set(["CONFIRMED", "CANCELLED", "COMPLETED"]);

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return bad("No autenticado", 401);
  if (user.role !== "TEACHER" && user.role !== "ADMIN") return bad("No autorizado", 403);

  const { id } = await params;
  const body = await readJson<{ status?: string }>(req);
  const status = clean(body.status, 20).toUpperCase();
  if (!STATUSES.has(status)) return bad("Estado inválido", 400);

  // updateMany no lanza P2025 si el id no existe → comprobamos el conteo.
  const res = await db.consultationBooking.updateMany({ where: { id }, data: { status } });
  if (res.count === 0) return bad("Reserva no encontrada", 404);

  const booking = await db.consultationBooking.findUnique({ where: { id } });
  return ok({ booking });
}
