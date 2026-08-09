// OTR · /api/highlights — "Lo mejor de la temporada" (tabla Highlight) [RONDA3 · Isaac].
//   GET  — lista completa para CUALQUIER sesión: la pantalla larga (scr-highlights) pinta
//          desde DB.highlights, pero el staff necesita los valores CRUDOS-editables (fecha
//          en ISO, URLs) para prefijar el modal de edición, y el alumno puede releerla sin
//          recargar toda la app. Contrato de escape: title/category se escapan UNA vez aquí.
//   POST — alta (staff: ADMIN|TEACHER). Allowlist estricta (input.ts), audit "highlight.create".
//
// Sin rate-limit a propósito: es una escritura de STAFF sobre catálogo de marca, igual que
// POST /api/tournaments (op:create) y a diferencia del contenido que genera el usuario
// (mensajes/foro/reseñas/listings), que sí lo lleva.
import { db } from "../../lib/db";
import { getSessionUser } from "../../lib/auth";
import { ok, bad, readJson } from "../../lib/api";
import { requireRole } from "../../lib/authz";
import { audit } from "../../lib/audit";
// La lista de logros es un dato GLOBAL cacheado 30 s en queries.ts ("highlights"). Sin
// invalidar, el coach guardaba y NO veía su logro hasta medio minuto después (verificado con
// clicks). cache.ts documenta justo este caso: "úsalo tras una escritura que deba verse YA".
import { invalidate } from "../../lib/cache";
import { asHighlightData, cleanHighlightInput, highlightRow } from "./input";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return bad("No autenticado", 401);

  const rows = await db.highlight.findMany({ orderBy: { position: "asc" }, take: 60 });
  return ok({ highlights: rows.map(highlightRow) });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return bad("No autenticado", 401);
  if (!requireRole(user, "ADMIN", "TEACHER"))
    return bad("Solo administradores o profesores pueden gestionar los logros", 403);

  const body = await readJson<Record<string, unknown>>(req);
  const { data, badInstagram } = cleanHighlightInput(body, { forCreate: true });
  if (!data.title) return bad("El título del logro es obligatorio");
  if (badInstagram) return bad("El enlace debe ser una publicación de Instagram (https://www.instagram.com/…)");

  // El orden lo fija el servidor (nunca el body): el logro nuevo entra al final de la lista.
  const last = await db.highlight.findFirst({ orderBy: { position: "desc" }, select: { position: true } });
  data.position = (last?.position ?? -1) + 1;

  const highlight = await db.highlight.create({ data: asHighlightData(data) });
  invalidate("highlights");
  await audit({
    actorId: user.id,
    actorName: user.name,
    action: "highlight.create",
    targetType: "highlight",
    targetId: highlight.id,
    detail: `Logro "${highlight.title}" publicado (${highlight.category || "sin categoría"})`,
  });

  return ok({ highlight: highlightRow(highlight) });
}
