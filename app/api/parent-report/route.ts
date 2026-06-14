// OTR Hub · Reporte mensual del padre (PRD §11.1 / §11.2 — "retention weapon").
// GET (auth PARENT) ?studentId= → compone el reporte del MES EN CURSO para ese hijo:
// nombre, mes/año, nivel, XP, asistencia (sesiones del mes), skills actuales con su
// score, logros (certificados), gasto del mes (escrow no reembolsado) y un "próximo
// paso" textual (el skill más bajo → "Enfocar en {skill}").
//
// El PRD lo pide BILINGÜE: devolvemos report.es y report.en con los labels traducidos.
// Los datos numéricos son idénticos en ambos; solo cambian títulos/explicaciones.
//
// SIMULACIÓN DE ENVÍO: el envío real por email/cron está fuera de alcance aquí.
// app/lib/mail.ts (sendMail) existe, pero NO se invoca en esta ruta: solo generamos
// el artefacto consultable (para render web / impresión). No se emite PDF binario.
import { db } from "../../lib/db";
import { getSessionUser } from "../../lib/auth";
import { ok, bad, clean } from "../../lib/api";

const MESES_ES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const MESES_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// Skills canónicos del PRD → traducción de display (los datos son por `skill` raw).
const SKILL_EN: Record<string, string> = {
  Confianza: "Confidence",
  Estructura: "Structure",
  Evidencia: "Evidence",
  Refutación: "Rebuttal",
  "Cross-ex": "Cross-ex",
  Delivery: "Delivery",
};

function money(cents: number): string {
  const v = (Number(cents) || 0) / 100;
  return `$${v % 1 ? v.toFixed(2) : v.toFixed(0)}`;
}

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return bad("No autenticado", 401);
  if (user.role !== "PARENT") return bad("Solo una cuenta de padre/madre puede ver reportes", 403);

  const url = new URL(req.url);
  const studentId = clean(url.searchParams.get("studentId"), 80);
  if (!studentId) return bad("Falta el estudiante");

  // Vínculo ACTIVE parent=me ↔ student requerido (no exponemos datos de no-hijos).
  const link = await db.guardianship.findUnique({
    where: { parentId_studentId: { parentId: user.id, studentId } },
  });
  if (!link || link.status !== "ACTIVE") return bad("No tienes un vínculo activo con ese estudiante", 403);

  const student = await db.user.findUnique({
    where: { id: studentId },
    select: { id: true, name: true, initials: true, level: true, xp: true, ageBand: true },
  });
  if (!student) return bad("Estudiante no encontrado", 404);

  // --- Ventana del mes en curso (hora del servidor) ---
  const now = new Date();
  const monthIdx = now.getMonth();
  const year = now.getFullYear();
  const monthStart = new Date(year, monthIdx, 1, 0, 0, 0, 0);
  const nextMonth = new Date(year, monthIdx + 1, 1, 0, 0, 0, 0);

  // --- Asistencia del mes: COMPLETED vs (CONFIRMED + COMPLETED) por slotAt en el mes ---
  const monthBookings = await db.booking.findMany({
    where: { studentId, slotAt: { gte: monthStart, lt: nextMonth } },
    select: { id: true, status: true, slotAt: true, recordingUrl: true },
  });
  const scheduled = monthBookings.filter((b) => b.status === "CONFIRMED" || b.status === "COMPLETED").length;
  const attended = monthBookings.filter((b) => b.status === "COMPLETED").length;
  const attendancePct = scheduled > 0 ? Math.round((attended / scheduled) * 100) : 0;

  // [P0-9] Grabaciones de sesiones COMPLETADAS del mes — visibilidad parental.
  const recordings = monthBookings
    .filter((b) => b.status === "COMPLETED" && b.recordingUrl)
    .map((b) => ({ id: b.id, date: b.slotAt, url: b.recordingUrl }));

  // --- Skills actuales (no son del mes: es el estado vigente) ---
  const skillRows = await db.studentSkill.findMany({
    where: { userId: studentId },
    orderBy: { score: "desc" },
    select: { skill: true, score: true },
  });

  // --- Logros: certificados del hijo (estado vigente) ---
  const certificates = await db.certificate.findMany({
    where: { userId: studentId },
    orderBy: { issuedAt: "desc" },
    select: { id: true, title: true, issuedAt: true },
  });

  // --- Gasto del mes: EscrowTxn no REFUNDED de los bookings del hijo creados en el mes ---
  const escrows = await db.escrowTxn.findMany({
    where: {
      booking: { studentId, createdAt: { gte: monthStart, lt: nextMonth } },
      status: { not: "REFUNDED" },
    },
    select: { amountCents: true },
  });
  const spendCents = escrows.reduce((s, e) => s + (Number(e.amountCents) || 0), 0);

  // --- Próximo paso: el skill más bajo → "Enfocar en {skill}" ---
  // Si no hay skills evaluadas aún, damos un paso de arranque genérico.
  const lowest = skillRows.length
    ? skillRows.reduce((min, r) => (r.score < min.score ? r : min), skillRows[0])
    : null;
  const lowestSkillEs = lowest ? lowest.skill : null;
  const lowestSkillEn = lowest ? (SKILL_EN[lowest.skill] || lowest.skill) : null;

  const nextStepEs = lowest
    ? `Enfocar en ${lowestSkillEs} — es la habilidad con más margen de crecimiento (${lowest.score}/100) este mes.`
    : "Agendar la primera sesión 1:1 para obtener una evaluación de habilidades del coach.";
  const nextStepEn = lowest
    ? `Focus on ${lowestSkillEn} — it has the most room to grow (${lowest.score}/100) this month.`
    : "Book the first 1:1 session to get a coach skill evaluation.";

  // --- Composición bilingüe ---
  // Datos numéricos compartidos; cada idioma trae sus labels.
  const shared = {
    studentName: student.name,
    studentInitials: student.initials,
    level: student.level,
    xp: student.xp,
    monthIndex: monthIdx,
    year,
    attendance: { attended, scheduled, pct: attendancePct },
    spendCents,
    spendLabel: money(spendCents),
    recordings,
  };

  const report = {
    studentId: student.id,
    studentName: student.name,
    studentInitials: student.initials,
    level: student.level,
    xp: student.xp,
    monthIndex: monthIdx,
    year,
    generatedAt: now.toISOString(),
    // Documenta que el envío por email/cron es simulado.
    delivery: { channel: "email", scheduled: "monthly", simulated: true },

    es: {
      ...shared,
      lang: "es",
      monthLabel: MESES_ES[monthIdx],
      title: `Reporte mensual de ${student.name}`,
      subtitle: `${MESES_ES[monthIdx]} ${year} · Resumen de progreso`,
      labels: {
        level: "Nivel",
        xp: "XP acumulado",
        attendance: "Asistencia",
        attendanceDetail: `${attended} de ${scheduled} sesiones asistidas`,
        skills: "Habilidades",
        skillsEmpty: "Las evaluaciones del coach aparecerán tras las primeras sesiones.",
        achievements: "Logros y certificaciones",
        achievementsEmpty: "Aún sin certificaciones — ¡en camino!",
        spend: "Inversión del mes",
        nextStep: "Próximo paso",
        print: "Imprimir reporte",
        sessionRecordings: "Grabaciones de sesiones",
      },
      skills: skillRows.map((r) => ({ name: r.skill, score: r.score })),
      achievements: certificates.map((c) => ({ id: c.id, title: c.title, issuedAt: c.issuedAt })),
      nextStep: nextStepEs,
      focusSkill: lowestSkillEs,
      explanation: "Este reporte resume el progreso de tu hijo/a en el mes en curso: asistencia, habilidades evaluadas por sus coaches, logros y la inversión realizada, todo dentro de OTR.",
    },

    en: {
      ...shared,
      lang: "en",
      monthLabel: MESES_EN[monthIdx],
      title: `${student.name}'s monthly report`,
      subtitle: `${MESES_EN[monthIdx]} ${year} · Progress summary`,
      labels: {
        level: "Level",
        xp: "Total XP",
        attendance: "Attendance",
        attendanceDetail: `${attended} of ${scheduled} sessions attended`,
        skills: "Skills",
        skillsEmpty: "Coach evaluations will appear after the first sessions.",
        achievements: "Achievements & certifications",
        achievementsEmpty: "No certifications yet — on the way!",
        spend: "This month's spend",
        nextStep: "Next step",
        print: "Print report",
        sessionRecordings: "Session recordings",
      },
      // Skills: el nombre se traduce para display; el dato (score) es el mismo.
      skills: skillRows.map((r) => ({ name: SKILL_EN[r.skill] || r.skill, score: r.score })),
      achievements: certificates.map((c) => ({ id: c.id, title: c.title, issuedAt: c.issuedAt })),
      nextStep: nextStepEn,
      focusSkill: lowestSkillEn,
      explanation: "This report summarizes your child's progress this month: attendance, coach-evaluated skills, achievements and spend — all within OTR.",
    },
  };

  return ok({ report });
}
