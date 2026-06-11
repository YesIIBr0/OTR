// Perfil público compartible (PRD §8.4, §11.3) — privacy-default OFF.
// POST — habilita/deshabilita: { enabled: boolean, studentId?: string }.
//   · STUDENT adulto (ageBand !== "minor") → se lo aplica a sí mismo.
//   · STUDENT menor → 403 (necesita a su padre/madre) SALVO que exista un
//     Guardianship ACTIVE con consentLevel "full" (el tutor ya delegó el control).
//   · PARENT con studentId → flujo de consentimiento parental: valida el vínculo
//     ACTIVE y aplica el cambio al hijo.
// GET — estado propio (o el de los hijos vinculados si PARENT).
import { db } from "../../lib/db";
import { getSessionUser } from "../../lib/auth";
import { ok, bad, readJson, clean } from "../../lib/api";
import { logActivitySafe } from "../../lib/activity";

/** "María-José Núñez" → "maria-jose-nunez" (minúsculas, sin acentos, espacios→guiones). */
function slugify(name: string): string {
  const s = String(name ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quita acentos/diacríticos
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return s || "estudiante";
}

/** Slug único en la base: si colisiona con OTRO usuario, añade sufijo corto. */
async function uniqueSlug(name: string, selfId: string): Promise<string> {
  const base = slugify(name);
  let candidate = base;
  for (let i = 0; i < 8; i++) {
    const clash = await db.user.findUnique({
      where: { publicSlug: candidate },
      select: { id: true },
    });
    if (!clash || clash.id === selfId) return candidate;
    candidate = `${base}-${Math.random().toString(36).slice(2, 6)}`;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return bad("No autenticado", 401);

  const data = await readJson<{ enabled?: unknown; studentId?: string }>(req);
  if (typeof data.enabled !== "boolean") return bad("Falta el campo enabled (true/false)", 400);
  const enabled = data.enabled;

  // 1) Resolver a QUIÉN se aplica el cambio según el rol.
  let target = user;
  let byParent = false;

  if (user.role === "PARENT") {
    const studentId = clean(data.studentId, 64);
    if (!studentId) return bad("Indica el estudiante (studentId)", 400);
    const link = await db.guardianship.findFirst({
      where: { parentId: user.id, studentId, status: "ACTIVE" },
    });
    if (!link) return bad("No tienes un vínculo activo con ese estudiante", 403);
    const student = await db.user.findUnique({ where: { id: studentId } });
    if (!student) return bad("Estudiante no encontrado", 404);
    target = student;
    byParent = true;
  } else if (user.ageBand === "minor") {
    // Menor: requiere consentimiento parental (§11.3) salvo que un tutor ya le
    // haya delegado control total (Guardianship ACTIVE con consentLevel "full").
    const fullConsent = await db.guardianship.findFirst({
      where: { studentId: user.id, status: "ACTIVE", consentLevel: "full" },
    });
    if (!fullConsent) {
      return bad("Pídele a tu padre/madre que habilite tu perfil público desde el Portal de familia", 403);
    }
  }
  // Adulto (ageBand !== "minor") → se lo aplica a sí mismo sin más requisitos.

  // 2) Aplicar el cambio.
  if (enabled) {
    const slug = target.publicSlug ?? (await uniqueSlug(target.name, target.id));
    await db.user.update({
      where: { id: target.id },
      data: { publicProfile: true, publicSlug: slug },
    });
    await logActivitySafe({
      userId: target.id,
      type: "public_profile_on",
      source: "profile",
      refId: slug,
      title: "Activó su perfil público",
      detail: byParent ? "Habilitado por su padre/madre desde el Portal de familia" : null,
    });
    return ok({ enabled: true, slug, url: "/p/" + slug });
  }

  // Deshabilitar: el slug se conserva (reactivar mantiene la misma URL).
  await db.user.update({ where: { id: target.id }, data: { publicProfile: false } });
  return ok({
    enabled: false,
    slug: target.publicSlug,
    url: target.publicSlug ? "/p/" + target.publicSlug : null,
  });
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) return bad("No autenticado", 401);

  // PARENT → estado del perfil público de cada hijo vinculado (vínculos ACTIVE).
  if (user.role === "PARENT") {
    const links = await db.guardianship.findMany({
      where: { parentId: user.id, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
    });
    const studentIds = links.map((l) => l.studentId);
    const students = studentIds.length
      ? await db.user.findMany({
          where: { id: { in: studentIds } },
          select: { id: true, name: true, ageBand: true, publicProfile: true, publicSlug: true },
        })
      : [];
    const children = students.map((s) => ({
      studentId: s.id,
      name: s.name,
      ageBand: s.ageBand,
      enabled: s.publicProfile,
      slug: s.publicSlug,
      url: s.publicSlug ? "/p/" + s.publicSlug : null,
    }));
    return ok({ children });
  }

  // Estado propio.
  return ok({
    enabled: user.publicProfile,
    slug: user.publicSlug,
    url: user.publicSlug ? "/p/" + user.publicSlug : null,
    ageBand: user.ageBand,
  });
}
