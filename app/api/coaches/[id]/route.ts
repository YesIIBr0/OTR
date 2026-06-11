// Marketplace (PRD §7) · GET /api/coaches/[id] — perfil completo de un coach (auth).
// [id] acepta CoachProfile.id o User.id del coach. Devuelve: datos del User,
// CoachProfile (intro video, credenciales, especialidades, idiomas, políticas),
// paquetes, calendario de disponibilidad semanal (hora RD, UTC-4) y reseñas
// verificadas: las de Review (creadas solo por alumnos inscritos → verificadas
// por construcción) + flag verifiedBooking si el autor tiene un Booking COMPLETED
// con este coach.
import { db } from "../../../lib/db";
import { getSessionUser } from "../../../lib/auth";
import { ok, bad } from "../../../lib/api";

const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

/** Minutos desde medianoche (hora RD) → "9:00 AM". */
function minLabel(min: number): string {
  const h24 = Math.floor(min / 60) % 24;
  const m = min % 60;
  const ampm = h24 >= 12 ? "PM" : "AM";
  let h = h24 % 12;
  if (h === 0) h = 12;
  return `${h}:${String(m).padStart(2, "0")} ${ampm}`;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return bad("No autenticado", 401);

  const { id } = await params;

  // Acepta CoachProfile.id o User.id (el contrato del marketplace expone ambos).
  const profile =
    (await db.coachProfile.findUnique({
      where: { id },
      include: {
        packages: { orderBy: { position: "asc" } },
        availability: { orderBy: [{ weekday: "asc" }, { startMin: "asc" }] },
      },
    })) ??
    (await db.coachProfile.findUnique({
      where: { userId: id },
      include: {
        packages: { orderBy: { position: "asc" } },
        availability: { orderBy: [{ weekday: "asc" }, { startMin: "asc" }] },
      },
    }));
  if (!profile || !profile.active) return bad("Coach no encontrado", 404);

  const coachUser = await db.user.findUnique({
    where: { id: profile.userId },
    select: {
      id: true,
      name: true,
      initials: true,
      headline: true,
      bio: true,
      teachingStyle: true,
      formats: true,
      avatarUrl: true,
      coachVerified: true,
      location: true,
    },
  });
  if (!coachUser) return bad("Coach no encontrado", 404);

  // Reseñas del coach (Review.teacherId = User.id del coach). Solo alumnos
  // inscritos pueden crearlas (ver /api/reviews) → verificadas por construcción.
  const reviews = await db.review.findMany({
    where: { teacherId: profile.userId },
    orderBy: { createdAt: "desc" },
    include: { student: { select: { name: true, initials: true } } },
  });

  // Autores con sesión de coaching COMPLETED con este coach → verified booking.
  const completed = await db.booking.findMany({
    where: { coachId: profile.userId, status: "COMPLETED" },
    select: { studentId: true },
  });
  const completedBy = new Set(completed.map((b) => b.studentId));

  return ok({
    coach: {
      id: profile.id,
      userId: profile.userId, // = Booking.coachId
      name: coachUser.name,
      initials: coachUser.initials,
      headline: coachUser.headline,
      bio: coachUser.bio,
      teachingStyle: coachUser.teachingStyle,
      formats: coachUser.formats,
      avatarUrl: coachUser.avatarUrl,
      verified: coachUser.coachVerified,
      location: coachUser.location,
      introVideoUrl: profile.introVideoUrl,
      credentials: profile.credentials,
      specialties: profile.specialties,
      languages: profile.languages,
      hourlyCents: profile.hourlyCents,
      responseTime: profile.responseTime,
      cancelPolicy: profile.cancelPolicy,
      ratingAvg: profile.ratingAvg,
      reviewCount: profile.reviewCount,
      bookingCount: profile.bookingCount,
      packages: profile.packages.map((k) => ({
        id: k.id,
        name: k.name,
        sessions: k.sessions,
        priceCents: k.priceCents,
        discountPct: k.discountPct,
      })),
      availability: profile.availability.map((a) => ({
        id: a.id,
        weekday: a.weekday, // 0=dom..6=sáb (hora RD)
        dayLabel: DIAS[a.weekday] ?? "",
        startMin: a.startMin,
        endMin: a.endMin,
        label: `${minLabel(a.startMin)} – ${minLabel(a.endMin)}`,
      })),
    },
    reviews: reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      body: r.body,
      createdAt: r.createdAt,
      studentName: r.student?.name ?? "Estudiante",
      studentInitials: r.student?.initials ?? "ES",
      verifiedBooking: completedBy.has(r.studentId),
    })),
  });
}
