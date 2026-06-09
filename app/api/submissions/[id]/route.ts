import { db } from "../../../lib/db";
import { getSessionUser } from "../../../lib/auth";
import { ok, bad, readJson, clean } from "../../../lib/api";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user || (user.role !== "TEACHER" && user.role !== "ADMIN"))
    return bad("Solo profesores califican", 403);
  const { id } = await params;

  const existing = await db.submission.findUnique({ where: { id } });
  if (!existing) return bad("Entrega no encontrada", 404);

  // El profesor solo puede calificar entregas de un curso que imparte.
  if (user.role !== "ADMIN") {
    const course = await db.course.findFirst({ where: { code: existing.courseCode } });
    if (!course || course.teacherId !== user.id) return bad("No autorizado", 403);
  }

  const body = await readJson<{ grade?: unknown; feedback?: unknown }>(req);
  const raw = body.grade;
  const g = raw != null && raw !== "" && !Number.isNaN(Number(raw)) ? Math.max(0, Math.min(100, Number(raw))) : null;
  const feedback = clean(body.feedback, 1000) || null;

  const submission = await db.submission.update({
    where: { id },
    data: { grade: g, feedback, status: "GRADED" },
  });

  // XP idempotente: otorgar solo el delta respecto a la nota anterior (recalificar no duplica XP).
  const prevXp = existing.grade != null ? Math.round(existing.grade / 2) : 0;
  const newXp = g != null ? Math.round(g / 2) : 0;
  const delta = newXp - prevXp;
  if (delta !== 0) {
    await db.user.update({ where: { id: submission.userId }, data: { xp: { increment: delta } } });
  }
  // Notificar solo cuando la nota realmente cambia (recalificar igual no spamea al alumno).
  const gradeChanged = existing.grade !== g || existing.status !== "GRADED";
  if (g != null && gradeChanged) {
    await db.notification.create({
      data: {
        userId: submission.userId, icon: "chart", tone: "ok",
        title: "Tu entrega fue calificada", detail: `${submission.activity} · ${g} — por ${user.name}`,
        whenLabel: "ahora", unread: true, position: 0,
      },
    });
  }
  return ok({ submission });
}
