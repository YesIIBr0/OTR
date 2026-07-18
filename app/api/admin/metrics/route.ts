// OTR Hub · Admin — panel de métricas de negocio (PRD §3.3 admin console).
// Resuelve el hueco de que el admin solo tenía moderación y usuarios: el fundador no
// tenía forma de responder "¿cómo va OTR?" sin entrar a la base de datos a mano.
//
//  GET — solo ADMIN — snapshot agregado de negocio:
//    usersByRole            groupBy User.role
//    registrationsByWeek    últimas 8 semanas por User.createdAt (única findMany de
//                            createdAt; el bucketing semanal se hace en JS)
//    funnel                 students totales → con placedAt → con ≥1 Enrollment → con ≥1 Booking
//    bookings                total + por status + gmvCents (CONFIRMED/COMPLETED)
//    debates                 total, pendientes, aprobados, rechazados
//    courses                 publicados + enrollments totales
//    membership              groupBy User.membership
//    tournaments              total + inscripciones
//
// Todo el resto son queries agregadas (count/groupBy/aggregate); lo único que trae filas
// es el findMany de registrationsByWeek, y solo la columna createdAt.
import { db } from "../../../lib/db";
import { getSessionUser } from "../../../lib/auth";
import { ok, bad } from "../../../lib/api";
import { requireRole } from "../../../lib/authz";

const WEEKS = 8;
const MS_DAY = 24 * 60 * 60 * 1000;
const MS_WEEK = 7 * MS_DAY;

// Bucketiza createdAt (últimas WEEKS semanas, semana ISO-ish desde `since`) en JS: una
// sola findMany de fechas en vez de 8 counts con where de rango (misma carga, una query).
function bucketByWeek(dates: Date[], since: Date, weeks: number) {
  const buckets = Array.from({ length: weeks }, (_, i) => ({
    weekStart: new Date(since.getTime() + i * MS_WEEK).toISOString(),
    count: 0,
  }));
  const sinceMs = since.getTime();
  for (const d of dates) {
    const idx = Math.floor((d.getTime() - sinceMs) / MS_WEEK);
    if (idx >= 0 && idx < weeks) buckets[idx].count++;
  }
  return buckets;
}

// [R6 — Tribunal 1.5] Acciones "core" = práctica real del alumno (no login ni navegación):
// completar lección, aprobar examen, pedir debate, reservar sesión. Alimentan los dos
// escalones nuevos del funnel y la North Star.
const CORE_TYPES = ["lesson_done", "quiz_done", "debate_requested", "booking_made"];

export async function GET() {
  const user = await getSessionUser();
  if (!user) return bad("No autenticado", 401);
  if (!requireRole(user, "ADMIN")) return bad("Solo administradores", 403);

  const now = new Date();
  const since = new Date(now.getTime() - WEEKS * MS_WEEK);

  const [
    usersByRoleRaw,
    recentUsers,
    studentsTotal,
    studentsPlaced,
    studentsEnrolled,
    studentsBooked,
    bookingsTotal,
    bookingsByStatusRaw,
    bookingsGmv,
    debatesTotal,
    debatesPending,
    debatesApproved,
    debatesRejected,
    coursesPublished,
    enrollmentsTotal,
    membershipRaw,
    tournamentsTotal,
    tournamentRegistrations,
    studentsFirstAction,
    northStarActiveWeek,
  ] = await Promise.all([
    db.user.groupBy({ by: ["role"], _count: { _all: true } }),
    db.user.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
    db.user.count({ where: { role: "STUDENT" } }),
    db.user.count({ where: { role: "STUDENT", placedAt: { not: null } } }),
    db.user.count({ where: { role: "STUDENT", enrollments: { some: {} } } }),
    db.user.count({ where: { role: "STUDENT", bookingsAsStudent: { some: {} } } }),
    db.booking.count(),
    db.booking.groupBy({ by: ["status"], _count: { _all: true } }),
    db.booking.aggregate({ where: { status: { in: ["CONFIRMED", "COMPLETED"] } }, _sum: { priceCents: true } }),
    db.debateRecord.count(),
    db.debateRecord.count({ where: { adjudicated: false, rejectedAt: null } }),
    db.debateRecord.count({ where: { adjudicated: true } }),
    db.debateRecord.count({ where: { rejectedAt: { not: null } } }),
    db.course.count({ where: { published: true } }),
    db.enrollment.count(),
    db.user.groupBy({ by: ["membership"], _count: { _all: true } }),
    db.tournament.count(),
    db.tournamentRegistration.count(),
    // [R6] Funnel de activación: alumnos con ≥1 acción core ALGUNA VEZ (¿llegaron al valor?).
    db.user.count({ where: { role: "STUDENT", activityEvents: { some: { type: { in: CORE_TYPES } } } } }),
    // [R6] NORTH STAR: alumnos con ≥1 acción core en los últimos 7 días. Es LA métrica de
    // producto (predice retención); "usuarios registrados" queda como vanidad de contexto.
    db.user.count({ where: { role: "STUDENT", activityEvents: { some: { type: { in: CORE_TYPES }, createdAt: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) } } } } }),
  ]);

  const usersByRole: Record<string, number> = {};
  for (const r of usersByRoleRaw) usersByRole[r.role] = r._count._all;

  const bookingsByStatus: Record<string, number> = {};
  for (const r of bookingsByStatusRaw) bookingsByStatus[r.status] = r._count._all;

  const membership: Record<string, number> = {};
  for (const r of membershipRaw) membership[r.membership] = r._count._all;

  const registrationsByWeek = bucketByWeek(
    recentUsers.map((u) => u.createdAt),
    since,
    WEEKS
  );

  return ok({
    usersByRole,
    registrationsByWeek,
    funnel: {
      studentsTotal,
      placed: studentsPlaced,
      enrolled: studentsEnrolled,
      booked: studentsBooked,
      // [R6] Activación real: ≥1 acción core (lección/examen/debate/reserva) alguna vez.
      firstCoreAction: studentsFirstAction,
    },
    // [R6] North Star: alumnos con práctica real esta semana. La definición viaja con el
    // dato para que el panel nunca la pinte sin contexto.
    northStar: {
      activeStudentsWeek: northStarActiveWeek,
      definition: "Alumnos con ≥1 acción core (lección, examen, debate o reserva) en los últimos 7 días",
    },
    bookings: {
      total: bookingsTotal,
      byStatus: bookingsByStatus,
      gmvCents: bookingsGmv._sum.priceCents || 0,
    },
    debates: {
      total: debatesTotal,
      pending: debatesPending,
      approved: debatesApproved,
      rejected: debatesRejected,
    },
    courses: {
      published: coursesPublished,
      enrollments: enrollmentsTotal,
    },
    membership,
    tournaments: {
      total: tournamentsTotal,
      registrations: tournamentRegistrations,
    },
  });
}
