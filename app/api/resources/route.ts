// OTR Hub · Arsenal — recursos del coach.
// GET: lista pública (ordenada por position/createdAt).
// POST: solo TEACHER/ADMIN crean recursos; contentHtml se sanitiza en servidor.
import { db } from "../../lib/db";
import { getSessionUser } from "../../lib/auth";
import { ok, bad, readJson, clean } from "../../lib/api";
import { sanitizeHtml } from "../../lib/sanitize";

// APAGADO (PRD-estricto): el Arsenal no existe en el PDF (el "motion library" §6.4
// es otra cosa y es Fase 2). Reactivar: ARSENAL_ENABLED = true.
const ARSENAL_ENABLED = false;

const KINDS = new Set(["brief", "template", "drill", "recording", "link"]);

function normalizeKind(kind: unknown): string {
  const k = String(kind ?? "").trim().toLowerCase();
  return KINDS.has(k) ? k : "brief";
}

export async function GET() {
  if (!ARSENAL_ENABLED) return bad("El Arsenal está desactivado en esta fase", 410);
  const user = await getSessionUser();
  if (!user) return bad("No autenticado", 401);

  const resources = await db.resource.findMany({
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
  });

  // ¿Puede ver el contenido gated? TEACHER/ADMIN o inscrito en algún curso.
  const isStaff = user.role === "TEACHER" || user.role === "ADMIN";
  const canAccessGated =
    isStaff || (await db.enrollment.count({ where: { userId: user.id } })) > 0;

  // Para recursos gated sin acceso: omite url y contentHtml, deja el resto de metadatos.
  const safe = canAccessGated
    ? resources
    : resources.map((r) =>
        r.gated ? { ...r, url: null, contentHtml: null } : r
      );

  return ok({ resources: safe });
}

export async function POST(req: Request) {
  if (!ARSENAL_ENABLED) return bad("El Arsenal está desactivado en esta fase", 410);
  const user = await getSessionUser();
  if (!user) return bad("No autenticado", 401);
  if (user.role !== "TEACHER" && user.role !== "ADMIN") return bad("Solo coaches", 403);

  const body = await readJson<Record<string, unknown>>(req);

  const title = clean(body.title, 160);
  if (!title) return bad("El título es obligatorio");

  const kind = normalizeKind(body.kind);
  const tag = clean(body.tag, 80) || null;
  const format = clean(body.format, 80) || null;
  const url = clean(body.url, 400) || null;
  const contentHtml = sanitizeHtml(body.contentHtml);
  const gated = body.gated === undefined ? true : Boolean(body.gated);

  const position = await db.resource.count();

  const resource = await db.resource.create({
    data: {
      title,
      kind,
      tag,
      format,
      url,
      contentHtml,
      gated,
      teacherId: user.id,
      position,
    },
  });

  return ok({ resource });
}
