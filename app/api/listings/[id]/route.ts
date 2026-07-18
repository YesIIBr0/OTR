// OTR · Marketplace abierto — un listing [F-MKT M1+M2].
//  GET   — dueño o ADMIN: detalle crudo para edición ("mis listings" / cola admin).
//  PATCH — dos roles, dos usos (despacho igual que guardianship):
//    · DUEÑO (TEACHER): edita campos (allowlist lib/listings) y pausa/reactiva.
//      Regla de re-vetting (default reversible): editar CONTENIDO (título/categoría/
//      descripción/precio) de un listing ACTIVE lo devuelve a PENDING — lo aprobado
//      es lo publicado, no un texto que cambió después. PAUSED↔ACTIVE no re-aprueba.
//    · ADMIN: action approve (PENDING→ACTIVE) | reject (→REJECTED con razón visible
//      al profesor). Ambas con audit() — vetting auditable (menores).
import { db } from "../../../lib/db";
import { getSessionUser } from "../../../lib/auth";
import { ok, bad, readJson, clean } from "../../../lib/api";
import { requireRole } from "../../../lib/authz";
import { audit } from "../../../lib/audit";
import { notify } from "../../../lib/notify";
import { cleanListingInput, type ListingInput } from "../../../lib/listings";

// Campos cuyo cambio en un listing ACTIVE exige re-aprobación (contenido visible al público).
const REVET_FIELDS = ["category", "title", "description", "priceCentsHour"];

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return bad("No autenticado", 401);
  const { id } = await params;
  const listing = await db.listing.findUnique({ where: { id } });
  if (!listing) return bad("Clase no encontrada", 404);
  if (listing.teacherId !== user.id && !requireRole(user, "ADMIN")) return bad("No autorizado", 403);
  return ok({ listing });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return bad("No autenticado", 401);
  const { id } = await params;
  const listing = await db.listing.findUnique({ where: { id } });
  if (!listing) return bad("Clase no encontrada", 404);

  const body = await readJson<ListingInput & { action?: string; reason?: string }>(req);
  const action = clean(body.action, 20);

  // --- Rama ADMIN: aprobar / rechazar (M2, la cola de vetting) ---
  if (action === "approve" || action === "reject") {
    if (!requireRole(user, "ADMIN")) return bad("Solo administradores", 403);
    if (listing.status !== "PENDING") return bad("Esta clase ya fue revisada", 400);
    if (action === "approve") {
      const updated = await db.listing.update({ where: { id }, data: { status: "ACTIVE", rejectReason: null } });
      await audit({
        actorId: user.id, actorName: user.name, action: "listing.approve", targetType: "listing", targetId: id,
        detail: `"${listing.title}" (${listing.category}) publicada`,
      });
      await notify({ userId: listing.teacherId, icon: "check", tone: "ok", title: "Clase publicada", detail: listing.title });
      return ok({ listing: { id, status: updated.status } });
    }
    const reason = clean(body.reason, 300) || "No cumple los criterios de publicación";
    const updated = await db.listing.update({ where: { id }, data: { status: "REJECTED", rejectReason: reason } });
    await audit({
      actorId: user.id, actorName: user.name, action: "listing.reject", targetType: "listing", targetId: id,
      detail: `"${listing.title}" rechazada: ${reason}`,
    });
    await notify({ userId: listing.teacherId, icon: "flag", tone: "warn", title: "Clase no aprobada", detail: reason });
    return ok({ listing: { id, status: updated.status } });
  }

  // --- Rama DUEÑO: editar / pausar / reactivar ---
  if (listing.teacherId !== user.id) return bad("No autorizado", 403);

  if (action === "pause" || action === "activate") {
    // Solo alterna entre ACTIVE y PAUSED (lo ya aprobado): un PENDING/REJECTED no se
    // auto-publica por esta vía — eso sería saltarse el vetting.
    if (action === "pause" && listing.status !== "ACTIVE") return bad("Solo se pausa una clase publicada", 400);
    if (action === "activate" && listing.status !== "PAUSED") return bad("Solo se reactiva una clase pausada", 400);
    const status = action === "pause" ? "PAUSED" : "ACTIVE";
    const updated = await db.listing.update({ where: { id }, data: { status } });
    return ok({ listing: { id, status: updated.status } });
  }

  const parsed = cleanListingInput(body, false);
  if (parsed.error) return bad(parsed.error, 400);
  if (Object.keys(parsed.data).length === 0) return bad("Nada que actualizar", 400);

  // Re-vetting: contenido nuevo en un listing publicado vuelve a la cola del admin.
  const touchesContent = REVET_FIELDS.some((f) => f in parsed.data);
  const data: Record<string, unknown> = { ...parsed.data };
  if (listing.status === "ACTIVE" && touchesContent) data.status = "PENDING";
  // Editar un REJECTED lo re-encola (el profesor corrigió lo señalado).
  if (listing.status === "REJECTED") {
    data.status = "PENDING";
    data.rejectReason = null;
  }

  const updated = await db.listing.update({ where: { id }, data: data as never });
  return ok({ listing: { id, status: updated.status } });
}
