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

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return bad("No autenticado", 401);
  if (user.role !== "ADMIN") return bad("Solo administradores", 403);

  // [ENT-01] Acota la cola: antes la query era sin límite (degradaba con miles de
  // reportes). Page de 100 + skip acumulativo + total para "cargar más" en el cliente.
  const url = new URL(req.url);
  const skip = Math.max(0, Number(url.searchParams.get("skip")) || 0);
  const where = { status: { in: ["OPEN", "REVIEWED"] } };
  const [reports, total] = await Promise.all([
    db.report.findMany({ where, orderBy: { createdAt: "desc" }, skip, take: 100 }),
    db.report.count({ where }),
  ]);

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

  // [ADM-03] Resuelve un nombre legible del objetivo (usuario/coach) para que la
  // cola de moderación muestre A QUIÉN se reporta, no un id opaco.
  const userTargetIds = [...new Set(reports.filter((r) => r.targetType === "user").map((r) => r.targetId))];
  const coachTargetIds = [...new Set(reports.filter((r) => r.targetType === "coach").map((r) => r.targetId))];
  const coachProfiles = coachTargetIds.length
    ? await db.coachProfile.findMany({ where: { id: { in: coachTargetIds } }, select: { id: true, userId: true } })
    : [];
  const coachUserId: Record<string, string> = {};
  for (const cp of coachProfiles) coachUserId[cp.id] = cp.userId;
  const allTargetUserIds = [...new Set([...userTargetIds, ...Object.values(coachUserId)])];
  const targetUsers = allTargetUserIds.length
    ? await db.user.findMany({ where: { id: { in: allTargetUserIds } }, select: { id: true, name: true } })
    : [];
  const userNameById: Record<string, string> = {};
  for (const u of targetUsers) userNameById[u.id] = u.name;
  const targetNameById: Record<string, string> = {};
  for (const r of reports) {
    if (r.targetType === "user") targetNameById[r.targetId] = userNameById[r.targetId] || "";
    else if (r.targetType === "coach") targetNameById[r.targetId] = userNameById[coachUserId[r.targetId]] || "";
  }

  const items = reports.map((r) => ({
    id: r.id,
    targetType: r.targetType,
    targetId: r.targetId,
    targetName: targetNameById[r.targetId] || null,
    reason: r.reason,
    status: r.status,
    resolution: r.resolution,
    createdAt: r.createdAt,
    reporterId: r.reporterId,
    reporterName: nameById[r.reporterId] || "Usuario OTR",
  }));

  return ok({ reports: items, total });
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
