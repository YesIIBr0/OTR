// OTR Hub · Sistema de reportes + moderación (PRD §7.4).
// POST: cualquier usuario autenticado abre un reporte sobre un objetivo (user|message|
//   conversation|booking|coach) → Report{ status:'OPEN' } + ledger 'report_filed'.
// GET: solo ADMIN — cola de reportes OPEN/REVIEWED (desc) con el nombre del reporter.
// PATCH: solo ADMIN — resuelve un reporte (REVIEWED|DISMISSED) + nota opcional.
import { db } from "../../lib/db";
import { getSessionUser } from "../../lib/auth";
import { ok, bad, readJson, clean } from "../../lib/api";
import { logActivitySafe } from "../../lib/activity";

const TARGET_TYPES = ["user", "message", "conversation", "booking", "coach"];

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return bad("No autenticado", 401);

  const body = await readJson<{ targetType?: string; targetId?: string; reason?: string }>(req);
  const targetType = clean(body.targetType, 32).toLowerCase();
  const targetId = clean(body.targetId, 64);
  const reason = clean(body.reason, 500);

  if (!TARGET_TYPES.includes(targetType)) return bad("Tipo de objetivo inválido");
  if (!targetId) return bad("Falta el objetivo del reporte");
  if (!reason) return bad("Describe brevemente el motivo del reporte");

  const report = await db.report.create({
    data: {
      reporterId: user.id,
      targetType,
      targetId,
      reason,
      status: "OPEN",
    },
  });

  await logActivitySafe({
    userId: user.id,
    type: "report_filed",
    title: "Reporte enviado",
    detail: `${targetType} · ${reason.slice(0, 120)}`,
    source: "moderation",
    refId: report.id,
    meta: { targetType, targetId },
  });

  return ok({ reportId: report.id });
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) return bad("No autenticado", 401);
  if (user.role !== "ADMIN") return bad("Solo administradores", 403);

  const reports = await db.report.findMany({
    where: { status: { in: ["OPEN", "REVIEWED"] } },
    orderBy: { createdAt: "desc" },
  });

  // Resuelve los nombres de los reporters en una sola consulta.
  const reporterIds = [...new Set(reports.map((r) => r.reporterId))];
  const reporters = reporterIds.length
    ? await db.user.findMany({
        where: { id: { in: reporterIds } },
        select: { id: true, name: true },
      })
    : [];
  const nameById: Record<string, string> = {};
  for (const r of reporters) nameById[r.id] = r.name;

  const items = reports.map((r) => ({
    id: r.id,
    targetType: r.targetType,
    targetId: r.targetId,
    reason: r.reason,
    status: r.status,
    resolution: r.resolution,
    createdAt: r.createdAt,
    reporterId: r.reporterId,
    reporterName: nameById[r.reporterId] || "Usuario OTR",
  }));

  return ok({ reports: items });
}

export async function PATCH(req: Request) {
  const user = await getSessionUser();
  if (!user) return bad("No autenticado", 401);
  if (user.role !== "ADMIN") return bad("Solo administradores", 403);

  const body = await readJson<{ reportId?: string; status?: string; resolution?: string; action?: string }>(req);
  const reportId = clean(body.reportId, 64);
  const status = clean(body.status, 16).toUpperCase();
  const resolution = clean(body.resolution, 500);
  const action = clean(body.action, 16).toLowerCase(); // "" | "suspend" | "unsuspend"

  if (!reportId) return bad("Falta el reporte");
  const existing = await db.report.findUnique({ where: { id: reportId } });
  if (!existing) return bad("Reporte no encontrado", 404);

  // [P0-7] Acción de moderación: suspender / reactivar al usuario objetivo del reporte.
  if (action === "suspend" || action === "unsuspend") {
    let targetUserId: string | null = null;
    if (existing.targetType === "user") targetUserId = existing.targetId;
    else if (existing.targetType === "coach") {
      const cp = await db.coachProfile.findUnique({ where: { id: existing.targetId }, select: { userId: true } });
      targetUserId = cp?.userId ?? existing.targetId;
    }
    if (!targetUserId) return bad("Este reporte no apunta a un usuario suspendible", 400);
    await db.user.update({ where: { id: targetUserId }, data: { suspended: action === "suspend" } });
    await db.report.update({
      where: { id: reportId },
      data: { status: "REVIEWED", resolution: resolution || (action === "suspend" ? "Usuario suspendido" : "Usuario reactivado") },
    });
    return ok({ suspended: action === "suspend", userId: targetUserId });
  }

  if (!["REVIEWED", "DISMISSED"].includes(status)) return bad("Estado inválido");
  await db.report.update({
    where: { id: reportId },
    data: { status, resolution: resolution || null },
  });
  return ok();
}
