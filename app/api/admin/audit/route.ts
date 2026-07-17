// OTR Hub · Admin — rastro de auditoría (F2.2, lectura del AuditLog de F2.1).
// Expone la vista de solo-lectura del rastro inmutable de acciones ADMINISTRATIVAS
// (cambios de rol, verificación de coach, suspensiones, resolución de reportes, borrado
// de cursos). Requisito de trazabilidad de una plataforma con menores (COPPA / Ley 172-13 RD):
// toda acción administrativa debe ser auditable después del hecho.
//
//  GET — solo ADMIN — lista paginada del AuditLog, recientes primero (createdAt desc).
//        Paginación por page/take (take tope 100). → ok({ entries, total }).
//
// Contrato de escape: actorName y detail guardan texto de usuario CRUDO (el nombre real del
// actor y del objetivo). Se escapan UNA vez AQUÍ con esc(); la UI (scr-admin.ts) los renderiza
// crudo. action/targetType/targetId son constantes/ids del servidor (no texto de usuario).
import { db } from "../../../lib/db";
import { getSessionUser } from "../../../lib/auth";
import { ok, bad } from "../../../lib/api";
import { esc } from "../../../lib/esc";

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return bad("No autenticado", 401);
  if (user.role !== "ADMIN") return bad("Solo administradores", 403);

  // Paginación por página: take acotado a 100 (defensa contra un take gigante que degrade la
  // query), page ≥ 1. skip acumulativo derivado en el servidor — el cliente solo manda page/take.
  const url = new URL(req.url);
  const take = Math.min(100, Math.max(1, Number(url.searchParams.get("take")) || 50));
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const skip = (page - 1) * take;

  const [rows, total] = await Promise.all([
    db.auditLog.findMany({ orderBy: { createdAt: "desc" }, skip, take }),
    db.auditLog.count(),
  ]);

  const entries = rows.map((a) => ({
    id: a.id,
    actorName: esc(a.actorName), // texto de usuario → escapado UNA vez (contrato de escape)
    action: a.action,
    targetType: a.targetType,
    targetId: a.targetId,
    detail: esc(a.detail), // texto de usuario (embebe el nombre del objetivo) → escapado UNA vez
    when: a.createdAt, // ISO (Date serializada por NextResponse.json); la UI formatea el relativo
  }));

  return ok({ entries, total });
}
