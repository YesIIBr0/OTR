// OTR Hub · Sistema de reportes + moderación (PRD §7.4).
// POST: cualquier usuario autenticado abre un reporte sobre un objetivo (user|message|
//   conversation|booking|coach) → Report{ status:'OPEN' } + ledger 'report_filed'.
// GET: solo ADMIN — cola de reportes OPEN/REVIEWED (desc) con el nombre del reporter.
// PATCH: solo ADMIN — resuelve un reporte (REVIEWED|DISMISSED) + nota opcional.
import { db } from "../../lib/db";
import { getSessionUser } from "../../lib/auth";
import { ok, bad, readJson, clean } from "../../lib/api";
import { requireRole } from "../../lib/authz";
import { esc } from "../../lib/esc";
import { rateLimit } from "../../lib/rate-limit";
import { logActivitySafe } from "../../lib/activity";
import { audit } from "../../lib/audit";

const TARGET_TYPES = ["user", "message", "conversation", "booking", "coach"];

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return bad("No autenticado", 401);

  // [F1.4] Anti-inundación de la cola de moderación: 10 reportes / 10 min por usuario.
  const rl = rateLimit(`report:${user.id}`, 10, 10 * 60 * 1000);
  if (!rl.ok) return bad(`Demasiadas solicitudes. Intenta en ${rl.retryAfter}s.`, 429);

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
  if (!requireRole(user, "ADMIN")) return bad("Solo administradores", 403);

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

  // [F2.3] CONTEXTO del objetivo — el admin modera VIENDO el contenido reportado, no un id
  // opaco. Resolvemos en BATCH (agrupamos los targetIds por tipo → UNA query por tipo, sin
  // N+1) y adjuntamos un campo `context` (objeto | null) sin tocar el shape que la UI ya
  // consume. Todo texto de usuario (body de mensaje, títulos, nombres) se escapa UNA vez
  // AQUÍ con esc() — el body se guarda CRUDO en DB (ver /api/messages POST) y el builder
  // scr-admin lo renderiza CRUDO (contrato de escape: el servidor escapa, el builder no).
  const messageIds = [...new Set(reports.filter((r) => r.targetType === "message").map((r) => r.targetId))];
  const conversationIds = [...new Set(reports.filter((r) => r.targetType === "conversation").map((r) => r.targetId))];
  const bookingIds = [...new Set(reports.filter((r) => r.targetType === "booking").map((r) => r.targetId))];

  const [ctxMessages, ctxConversations, ctxBookings] = await Promise.all([
    messageIds.length
      ? db.chatMessage.findMany({
          where: { id: { in: messageIds } },
          select: { id: true, body: true, senderId: true, conversationId: true },
        })
      : [],
    conversationIds.length
      ? db.conversation.findMany({
          where: { id: { in: conversationIds } },
          select: {
            id: true,
            name: true,
            participants: { select: { userId: true } },
            // Últimos 3 mensajes: orderBy position desc + take 3 (Prisma aplica el take POR
            // conversación → sin N+1). Se invierten abajo a orden cronológico para leerlos.
            messages: { orderBy: { position: "desc" }, take: 3, select: { id: true, body: true, senderId: true } },
          },
        })
      : [],
    bookingIds.length
      ? db.booking.findMany({
          where: { id: { in: bookingIds } },
          select: { id: true, coachId: true, studentId: true, slotAt: true, status: true },
        })
      : [],
  ]);

  // Nombres de TODOS los usuarios referidos por el contexto en UNA sola query (emisores de
  // mensajes, participantes/emisores de conversaciones, coach + alumno de reservas).
  const ctxUserIds = new Set<string>();
  for (const m of ctxMessages) if (m.senderId) ctxUserIds.add(m.senderId);
  for (const c of ctxConversations) {
    for (const p of c.participants) ctxUserIds.add(p.userId);
    for (const m of c.messages) if (m.senderId) ctxUserIds.add(m.senderId);
  }
  for (const b of ctxBookings) {
    ctxUserIds.add(b.coachId);
    ctxUserIds.add(b.studentId);
  }
  const ctxUsers = ctxUserIds.size
    ? await db.user.findMany({ where: { id: { in: [...ctxUserIds] } }, select: { id: true, name: true } })
    : [];
  const ctxNameById: Record<string, string> = {};
  for (const u of ctxUsers) ctxNameById[u.id] = u.name;

  // Mapas de contexto por targetId (varios reports pueden apuntar al mismo objetivo).
  const messageCtx: Record<string, unknown> = {};
  for (const m of ctxMessages) {
    messageCtx[m.id] = {
      kind: "message",
      body: esc(m.body),
      senderName: esc(ctxNameById[m.senderId || ""] || ""),
      conversationId: m.conversationId,
    };
  }
  const conversationCtx: Record<string, unknown> = {};
  for (const c of ctxConversations) {
    conversationCtx[c.id] = {
      kind: "conversation",
      title: esc(c.name),
      participants: c.participants.map((p) => esc(ctxNameById[p.userId] || "")).filter(Boolean),
      messages: [...c.messages].reverse().map((m) => ({
        body: esc(m.body),
        senderName: esc(ctxNameById[m.senderId || ""] || ""),
      })),
    };
  }
  const bookingCtx: Record<string, unknown> = {};
  for (const b of ctxBookings) {
    bookingCtx[b.id] = {
      kind: "booking",
      coachName: esc(ctxNameById[b.coachId] || ""),
      studentName: esc(ctxNameById[b.studentId] || ""),
      slotAt: b.slotAt,
      status: b.status,
    };
  }

  const items = reports.map((r) => {
    let context: unknown = null;
    if (r.targetType === "message") context = messageCtx[r.targetId] || null;
    else if (r.targetType === "conversation") context = conversationCtx[r.targetId] || null;
    else if (r.targetType === "booking") context = bookingCtx[r.targetId] || null;
    return {
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
      // [F2.3] contexto del objetivo (mensaje/conversación/reserva) o null si no aplica / no existe.
      context,
    };
  });

  return ok({ reports: items, total });
}

export async function PATCH(req: Request) {
  const user = await getSessionUser();
  if (!user) return bad("No autenticado", 401);
  if (!requireRole(user, "ADMIN")) return bad("Solo administradores", 403);

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

    // [F1.6] Anti-lockout: al SUSPENDER (no al reactivar) no puedes suspenderte a ti mismo ni
    // suspender a otro ADMIN — misma guarda que /api/admin/users (route.ts:94-100). Sin esto,
    // un admin podía quedar suspendido desde la cola de moderación y perder la plataforma.
    if (action === "suspend") {
      if (targetUserId === user.id) return bad("No puedes suspenderte a ti mismo", 400);
      const targetUser = await db.user.findUnique({ where: { id: targetUserId }, select: { role: true } });
      if (targetUser?.role === "ADMIN") return bad("No puedes suspender a otro administrador", 400);
    }

    await db.user.update({ where: { id: targetUserId }, data: { suspended: action === "suspend" } });
    await db.report.update({
      where: { id: reportId },
      // [F2.1] resolvedBy: deja rastro de QUÉ admin resolvió (antes se resolvía a ciegas).
      data: {
        status: "REVIEWED",
        resolution: resolution || (action === "suspend" ? "Usuario suspendido" : "Usuario reactivado"),
        resolvedBy: user.id,
      },
    });
    // [F2.1] Rastro de auditoría best-effort (fuera de la escritura; nunca la revierte).
    await audit({
      actorId: user.id, actorName: user.name, action: action === "suspend" ? "user.suspend" : "user.unsuspend", targetType: "user", targetId: targetUserId,
      detail: `${action === "suspend" ? "Suspendido" : "Reactivado"} desde la cola de moderación (reporte ${reportId})`,
    });
    return ok({ suspended: action === "suspend", userId: targetUserId });
  }

  if (!["REVIEWED", "DISMISSED"].includes(status)) return bad("Estado inválido");
  await db.report.update({
    where: { id: reportId },
    // [F2.1] resolvedBy: id del admin que resolvió el reporte.
    data: { status, resolution: resolution || null, resolvedBy: user.id },
  });
  // [F2.1] Rastro de auditoría best-effort de la resolución (REVIEWED | DISMISSED).
  await audit({
    actorId: user.id, actorName: user.name, action: "report.resolve", targetType: "report", targetId: reportId,
    detail: `Reporte ${existing.targetType} resuelto: ${status}`,
  });
  return ok();
}
