// OTR Hub · Admin — gestión de usuarios (PRD §3.3 admin console).
// Resuelve el hueco operativo: hasta ahora cambiar el rol de un usuario, VERIFICAR
// un coach (requisito para recibir reservas) o suspender/reactivar solo se podía a
// mano en la base de datos. Aquí se hace desde la consola de admin.
//
//  GET   — solo ADMIN — lista usuarios (búsqueda por nombre/email, filtro por rol),
//          tope 200, recientes primero → ok({ users, total }).
//  PATCH — solo ADMIN — { userId, role?, coachVerified?, suspended? } actualiza al
//          usuario. Anti-lockout: un admin NO puede quitarse su propio rol ADMIN ni
//          suspenderse a sí mismo. Suspender invalida la sesión al instante (auth.ts).
import type { Prisma } from "@prisma/client";
import { db } from "../../../lib/db";
import { getSessionUser } from "../../../lib/auth";
import { ok, bad, readJson, clean } from "../../../lib/api";

// role es String libre en el schema; este set es la fuente de verdad de valores válidos.
const ROLES = new Set(["STUDENT", "PARENT", "TEACHER", "COACH", "ADMIN"]);

// ENT-03 — Búsqueda tolerante a MAYÚSCULAS/minúsculas SIN romper SQLite dev.
// El conector SQLite NO soporta `mode:"insensitive"` (lanza al compilar el query) y
// `tsc` se genera contra ese cliente, así que el filtro es provider-agnóstico: generamos
// variantes de caso de la query (como se escribió, minúsculas, MAYÚSCULAS y Capitalizada)
// y hacemos OR de `contains` contra cada una. Resuelve el caso dominante ("GMAIL" encuentra
// "...@gmail.com", "reyes" encuentra "Reyes") sin Postgres ni LOWER() en SQL crudo.
// NOTA: NO es acento-insensible (buscar "maria" no halla "María"); eso exige normalizar el
// dato almacenado y queda fuera de alcance — ver docs/ux-audit para el follow-up provider-aware.
function caseVariants(q: string): string[] {
  const lower = q.toLowerCase();
  const cap = lower.charAt(0).toUpperCase() + lower.slice(1);
  return Array.from(new Set([q, lower, q.toUpperCase(), cap]));
}

const SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  membership: true,
  coachVerified: true,
  suspended: true,
  ageBand: true,
} as const;

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return bad("No autenticado", 401);
  if (user.role !== "ADMIN") return bad("Solo administradores", 403);

  const url = new URL(req.url);
  const q = clean(url.searchParams.get("q"), 80);
  const roleFilter = clean(url.searchParams.get("role"), 16).toUpperCase();
  // [ENT-02] Paginación por offset: page de 100, skip acumulativo desde el cliente.
  const skip = Math.max(0, Number(url.searchParams.get("skip")) || 0);
  const PAGE = 100;

  const where: Prisma.UserWhereInput = {};
  if (q) where.OR = caseVariants(q).flatMap((v) => [{ name: { contains: v } }, { email: { contains: v } }]);
  // [ENT-04 fix] El chip "Coaches" envía TEACHER, pero el KPI de coaches cuenta TEACHER+COACH;
  // mapeamos el filtro para que la lista coincida con el KPI (no omitir usuarios con rol COACH).
  if (roleFilter === "TEACHER" || roleFilter === "COACH") where.role = { in: ["TEACHER", "COACH"] };
  else if (ROLES.has(roleFilter)) where.role = roleFilter;

  // total = coincidencias del filtro actual (para "cargar más"); counts = stats GLOBALES
  // (KPIs estables, no sesgados por el filtro/página — antes se calculaban sobre el array cargado).
  const [users, total, allUsers, coaches, admins, suspended] = await Promise.all([
    db.user.findMany({ where, orderBy: { name: "asc" }, skip, take: PAGE, select: SELECT }),
    db.user.count({ where }),
    db.user.count(),
    db.user.count({ where: { role: { in: ["TEACHER", "COACH"] } } }),
    db.user.count({ where: { role: "ADMIN" } }),
    db.user.count({ where: { suspended: true } }),
  ]);

  return ok({ users, total, counts: { users: allUsers, coaches, admins, suspended } });
}

export async function PATCH(req: Request) {
  const user = await getSessionUser();
  if (!user) return bad("No autenticado", 401);
  if (user.role !== "ADMIN") return bad("Solo administradores", 403);

  const body = await readJson<{ userId?: unknown; role?: unknown; coachVerified?: unknown; suspended?: unknown }>(req);
  const userId = clean(body.userId, 64);
  if (!userId) return bad("Falta el usuario", 400);

  const target = await db.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!target) return bad("Usuario no encontrado", 404);

  const data: { role?: string; coachVerified?: boolean; suspended?: boolean } = {};

  if (body.role !== undefined) {
    const role = clean(body.role, 16).toUpperCase();
    if (!ROLES.has(role)) return bad("Rol inválido", 400);
    if (userId === user.id && role !== "ADMIN") return bad("No puedes quitarte tu propio rol de administrador", 400);
    data.role = role;
  }
  if (body.coachVerified !== undefined) data.coachVerified = !!body.coachVerified;
  if (body.suspended !== undefined) {
    if (userId === user.id && !!body.suspended) return bad("No puedes suspenderte a ti mismo", 400);
    data.suspended = !!body.suspended;
  }

  if (Object.keys(data).length === 0) return bad("Nada que actualizar", 400);

  const updated = await db.user.update({ where: { id: userId }, data, select: SELECT });
  return ok({ user: updated });
}
