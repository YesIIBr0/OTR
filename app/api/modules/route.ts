import { NextResponse } from "next/server";
import { db } from "../../lib/db";
import { getSessionUser } from "../../lib/auth";
import { teacherOwnsCourse } from "../../lib/authz";
import { readJson, clean } from "../../lib/api";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const body = await readJson<Record<string, unknown>>(req);
  const courseId = clean(body.courseId, 80);
  const title = clean(body.title, 120);
  // [I18N-2 §17.3] variante EN opcional del título de la sección.
  const titleEn = clean(body.titleEn, 120) || null;
  if (!courseId || !title) return NextResponse.json({ error: "Faltan campos" }, { status: 400 });
  if (!(await teacherOwnsCourse(courseId, user))) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  const count = await db.module.count({ where: { courseId } });
  const module_ = await db.module.create({ data: { courseId, title, titleEn, position: count } });
  return NextResponse.json({ ok: true, module: module_ });
}
