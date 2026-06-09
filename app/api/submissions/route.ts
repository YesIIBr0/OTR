import { db } from "../../lib/db";
import { getSessionUser } from "../../lib/auth";
import { ok, bad, readJson, clean } from "../../lib/api";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return bad("No autenticado", 401);
  const body = await readJson<{ activity?: string; kind?: string; courseCode?: string }>(req);
  const activity = clean(body.activity, 160) || "Entrega";
  const kind = clean(body.kind, 24) || "audio";
  const courseCode = clean(body.courseCode, 24) || "PF-101";
  const submission = await db.submission.create({
    data: { userId: user.id, userName: user.name, activity, kind, courseCode },
  });
  return ok({ submission });
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) return bad("No autenticado", 401);

  // Alumno: solo sus propias entregas. Profesor: solo entregas de sus cursos. Admin: todas.
  let where: Record<string, unknown> = { userId: user.id };
  if (user.role === "ADMIN") {
    where = {};
  } else if (user.role === "TEACHER") {
    const myCourses = await db.course.findMany({ where: { teacherId: user.id }, select: { code: true } });
    where = { courseCode: { in: myCourses.map((c) => c.code) } };
  }
  const submissions = await db.submission.findMany({ where, orderBy: { createdAt: "desc" } });
  return ok({ submissions });
}
