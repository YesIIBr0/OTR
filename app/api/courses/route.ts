import { NextResponse } from "next/server";
import { db } from "../../lib/db";
import { getSessionUser } from "../../lib/auth";
import { readJson, clean } from "../../lib/api";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (user.role !== "TEACHER" && user.role !== "ADMIN")
    return NextResponse.json({ error: "Solo profesores pueden crear cursos" }, { status: 403 });
  const body = await readJson<Record<string, unknown>>(req);
  const name = clean(body.name, 120);
  const code = clean(body.code, 40);
  if (!name || !code) return NextResponse.json({ error: "Nombre y código requeridos" }, { status: 400 });
  const exists = await db.course.findUnique({ where: { code } });
  if (exists) return NextResponse.json({ error: "Ese código ya existe" }, { status: 409 });
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
      coachName: user.name, teacherId: user.id, position: count,
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
  return NextResponse.json({ ok: true, course });
}
