// OTR · /api/highlights/[id] — edición y borrado de un logro de la temporada [RONDA3 · Isaac].
//   PATCH  — edita (staff: ADMIN|TEACHER). Allowlist PARCIAL compartida con el alta; audit
//            "highlight.update" con el detalle antes→después (solo lo que cambió de verdad).
//   DELETE — borra (staff: ADMIN|TEACHER). A diferencia de un torneo —que arrastraría las
//            inscripciones de alumnos y por eso es solo-ADMIN— un Highlight es contenido de
//            marca SIN datos de terceros colgando: el coach que lo publicó puede retirarlo.
//            Idempotente (borrar lo ya borrado responde 200). audit "highlight.delete".
import { db } from "../../../lib/db";
import { getSessionUser } from "../../../lib/auth";
import { ok, bad, readJson } from "../../../lib/api";
import { requireRole } from "../../../lib/authz";
import { audit } from "../../../lib/audit";
import { invalidate } from "../../../lib/cache"; // ver el porqué en ../route.ts
import { asHighlightData, cleanHighlightInput, fmtHighlightVal, highlightRow } from "../input";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return bad("No autenticado", 401);
  if (!requireRole(user, "ADMIN", "TEACHER"))
    return bad("Solo administradores o profesores pueden gestionar los logros", 403);

  const { id } = await params;
  const before = await db.highlight.findUnique({ where: { id } });
  if (!before) return bad("Logro no encontrado", 404);

  const body = await readJson<Record<string, unknown>>(req);
  const { data, badInstagram } = cleanHighlightInput(body, { forCreate: false });
  if (badInstagram) return bad("El enlace debe ser una publicación de Instagram (https://www.instagram.com/…)");
  if (data.title !== undefined && !data.title) return bad("El título del logro es obligatorio");
  if (Object.keys(data).length === 0) return bad("Nada que actualizar");

  const after = await db.highlight.update({ where: { id }, data: asHighlightData(data) });
  invalidate("highlights");

  // [F2] Rastro atribuible: SOLO los campos que cambiaron, en formato antes→después.
  const changes: string[] = [];
  for (const k of Object.keys(data)) {
    const b = fmtHighlightVal((before as Record<string, unknown>)[k]);
    const a = fmtHighlightVal((after as Record<string, unknown>)[k]);
    if (b !== a) changes.push(`${k}: ${b}→${a}`);
  }
  await audit({
    actorId: user.id,
    actorName: user.name,
    action: "highlight.update",
    targetType: "highlight",
    targetId: id,
    detail: `Logro "${after.title}" · ${changes.length ? changes.join(" · ") : "sin cambios netos"}`,
  });

  return ok({ highlight: highlightRow(after) });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return bad("No autenticado", 401);
  if (!requireRole(user, "ADMIN", "TEACHER"))
    return bad("Solo administradores o profesores pueden gestionar los logros", 403);

  const { id } = await params;
  const highlight = await db.highlight.findUnique({ where: { id } });
  if (!highlight) return ok(); // idempotente: ya no existe

  await db.highlight.delete({ where: { id } });
  invalidate("highlights");
  await audit({
    actorId: user.id,
    actorName: user.name,
    action: "highlight.delete",
    targetType: "highlight",
    targetId: id,
    detail: `Logro "${highlight.title}" eliminado`,
  });

  return ok();
}
