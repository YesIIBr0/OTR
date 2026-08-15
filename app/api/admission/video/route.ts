// OTR · /api/admission/video — registra la URL del vídeo DPP del paso 4 [ADM].
//   POST { url } — SOLO el STUDENT dueño de la admisión.
//
// El ARCHIVO se sube por POST /api/uploads (que ya valida MIME, tamaño y extensión y guarda
// en disco); aquí solo se registra la ruta que devolvió. Por eso safeDppVideoUrl exige
// /uploads/<algo>.mp4|webm|mov: el DPP se graba y se guarda en la plataforma —así lo dice el
// mockup— y una URL externa arbitraria sería un destino que clican coaches y familias.
//
// Guardar el vídeo NO completa el paso: eso lo hace PATCH /api/admission/step con step=4,
// que es donde vive la regla de orden. Separar los dos deja la regla en UN solo sitio.
import { db } from "../../../lib/db";
import { getSessionUser } from "../../../lib/auth";
import { ok, bad, readJson } from "../../../lib/api";
import { requireRole } from "../../../lib/authz";
import { rateLimit } from "../../../lib/rate-limit";
import { admissionPayload, safeDppVideoUrl, type AdmissionRow } from "../input";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return bad("No autenticado", 401);
  if (!requireRole(user, "STUDENT")) return bad("Solo el estudiante puede subir su vídeo", 403);

  const rl = rateLimit(`admission-video:${user.id}`, 20, 10 * 60 * 1000);
  if (!rl.ok) return bad(`Demasiadas solicitudes. Intenta en ${rl.retryAfter}s.`, 429);

  const body = await readJson<{ url?: string }>(req);
  const url = safeDppVideoUrl(body.url);
  if (!url) return bad("Sube el vídeo desde la plataforma (formato mp4, webm o mov)", 400);

  const admission = (await db.admission.findUnique({ where: { studentId: user.id } })) as AdmissionRow | null;
  if (!admission) return bad("Primero llena el formulario de admisión", 400);

  const updated = (await db.admission.update({
    where: { id: admission.id },
    data: { dppVideoUrl: url },
  })) as AdmissionRow;

  const consents = await db.admissionConsent.findMany({ where: { admissionId: admission.id }, orderBy: { createdAt: "asc" } });
  return ok({ admission: admissionPayload(updated, consents) });
}
