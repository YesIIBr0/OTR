import { NextResponse } from "next/server";
import { db } from "../../lib/db";
import { getSessionUser } from "../../lib/auth";
import { readJson, clean } from "../../lib/api";
import { requireRole } from "../../lib/authz";
import { audit } from "../../lib/audit";

// [F6.3] Roles que pueden ser DUEÑOS de un curso (impartirlo). Un STUDENT/PARENT nunca.
// Fuente de verdad compartida por la asignación en POST y la reasignación en PATCH.
const OWNER_ROLES = ["TEACHER", "ADMIN"];

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (!requireRole(user, "TEACHER", "ADMIN"))
    return NextResponse.json({ error: "Solo profesores pueden crear cursos" }, { status: 403 });
  const body = await readJson<Record<string, unknown>>(req);
  const name = clean(body.name, 120);
  const code = clean(body.code, 40);
  if (!name || !code) return NextResponse.json({ error: "Nombre y código requeridos" }, { status: 400 });
  const exists = await db.course.findUnique({ where: { code } });
  if (exists) return NextResponse.json({ error: "Ese código ya existe" }, { status: 409 });

  // [F6.3] Dueño del curso. Por defecto el creador. UN ADMIN puede crearlo A NOMBRE de un coach
  // (teacherId): validamos que el destino existe y es TEACHER/ADMIN (no un STUDENT/PARENT), igual
  // que la reasignación del PATCH. Un TEACHER NUNCA fija un dueño ajeno: su teacherId se ignora
  // (mismo criterio anti mass-assignment del PATCH). coachName es un snapshot que sigue al dueño.
  let ownerId = user.id;
  let ownerName = user.name;
  const wantsTeacherId = clean(body.teacherId, 64);
  if (user.role === "ADMIN" && wantsTeacherId && wantsTeacherId !== user.id) {
    const target = await db.user.findUnique({ where: { id: wantsTeacherId }, select: { id: true, name: true, role: true } });
    if (!target || !OWNER_ROLES.includes(target.role))
      return NextResponse.json({ error: "El coach asignado no existe o no puede impartir cursos" }, { status: 400 });
    ownerId = target.id;
    ownerName = target.name;
  }

  const count = await db.course.count();
  const color = clean(body.color, 40) || "#1E8C16";
  const next = clean(body.next, 120) || "Por definir";
  const format = clean(body.format, 40) || null;
  const modalityRaw = clean(body.modality, 40);
  const summary = clean(body.summary, 600) || null;
  // [I18N-1 / §17.3] Variantes EN: el contenido nace bilingüe (no monolingüe). Campos opcionales.
  const nameEn = clean(body.nameEn, 120) || null;
  const summaryEn = clean(body.summaryEn, 600) || null;
  const capacity = body.capacity;
  const cap = capacity != null && capacity !== "" && !Number.isNaN(Number(capacity)) ? Number(capacity) : null;
  // Visibilidad (flujo Moodle: crear como borrador y publicar al terminar). Default true
  // para no cambiar el comportamiento histórico si el cliente no manda el campo.
  const published = body.published === undefined ? true : !!body.published;
  const layout = typeof body.layout === "string" && ["modules", "grid", "single"].includes(body.layout) ? body.layout : "modules";
  const course = await db.course.create({
    data: {
      name, code, color, next,
      coachName: ownerName, teacherId: ownerId, position: count,
      lessonsCount: 0, studentsCount: 0,
      format,
      modality: ["online", "presencial", "híbrido"].includes(modalityRaw) ? modalityRaw : "online",
      capacity: cap,
      summary,
      nameEn,
      summaryEn,
      published,
      layout,
    },
  });
  // [F6.3] Si el ADMIN asignó el curso a OTRO dueño, deja rastro (best-effort, patrón F2):
  // un curso a nombre de un tercero debe ser atribuible a quién lo creó.
  if (ownerId !== user.id) {
    await audit({
      actorId: user.id, actorName: user.name, action: "course.create", targetType: "course", targetId: course.id,
      detail: `Curso "${course.name}" creado a nombre de ${ownerName}`,
    });
  }
  return NextResponse.json({ ok: true, course });
}
