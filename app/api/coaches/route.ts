// Marketplace (PRD §7) · GET /api/coaches — directorio de coaches activos (auth).
// Devuelve CoachProfile.active=true + datos del User (nombre, iniciales, headline,
// avatar, verificación, ubicación) + rating/reviews/precio + paquete más barato
// ("desde $X"). Filtros opcionales:
//   ?lang=es|en        → languages del coach contiene el idioma
//   ?format=PF|LD|...  → specialties del coach contiene el formato/tema
//   ?maxPrice=50       → precio "desde" (USD) ≤ maxPrice
//   ?sort=recommended|rating|price (default: recommended)
// CONTRATO: en todo el marketplace, Booking.coachId = User.id del coach (simétrico
// con studentId). Aquí devolvemos ambos: id (CoachProfile.id) y userId (User.id).
import { db } from "../../lib/db";
import { getSessionUser } from "../../lib/auth";
import { ok, bad, clean } from "../../lib/api";

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return bad("No autenticado", 401);

  const { searchParams } = new URL(req.url);
  const lang = clean(searchParams.get("lang"), 20).toLowerCase();
  const format = clean(searchParams.get("format"), 60).toLowerCase();
  const maxPrice = Math.max(0, Number(searchParams.get("maxPrice")) || 0); // USD
  const sort = clean(searchParams.get("sort"), 20).toLowerCase() || "recommended";

  const profiles = await db.coachProfile.findMany({
    where: { active: true },
    include: { packages: { orderBy: { position: "asc" } } },
  });

  // CoachProfile.userId no tiene @relation en el schema → join manual (patrón guardianship).
  const users = profiles.length
    ? await db.user.findMany({
        // [§7.4 / MARKETPLACE-MEMBERSHIP-1] Solo coaches VERIFICADOS van al marketplace
        // (la reserva ya lo exigía; el descubrimiento también debe — no listar no-verificados).
        where: { id: { in: profiles.map((p) => p.userId) }, coachVerified: true },
        select: {
          id: true,
          name: true,
          initials: true,
          headline: true,
          avatarUrl: true,
          coachVerified: true,
          location: true,
        },
      })
    : [];
  const byId = new Map(users.map((u) => [u.id, u]));

  // Solo perfiles cuyo coach está verificado (byId ya filtró a coachVerified:true).
  let coaches = profiles.filter((p) => byId.has(p.userId)).map((p) => {
    const u = byId.get(p.userId);
    // Paquete más barato → "desde $X". Sin paquetes, cae a la tarifa por hora.
    const cheapest = p.packages.length
      ? p.packages.reduce((a, b) => (b.priceCents < a.priceCents ? b : a))
      : null;
    const fromCents = cheapest ? cheapest.priceCents : p.hourlyCents;
    return {
      id: p.id, // CoachProfile.id
      userId: p.userId, // User.id del coach (= Booking.coachId)
      name: u?.name ?? "Coach",
      initials: u?.initials ?? "C",
      headline: u?.headline ?? null,
      avatarUrl: u?.avatarUrl ?? null,
      verified: u?.coachVerified ?? false,
      location: u?.location ?? null,
      ratingAvg: p.ratingAvg,
      reviewCount: p.reviewCount,
      bookingCount: p.bookingCount,
      hourlyCents: p.hourlyCents,
      specialties: p.specialties,
      languages: p.languages,
      responseTime: p.responseTime,
      fromCents,
      fromLabel: fromCents > 0 ? `desde $${Math.round(fromCents / 100)}` : null,
      packages: p.packages.map((k) => ({
        id: k.id,
        name: k.name,
        sessions: k.sessions,
        priceCents: k.priceCents,
        discountPct: k.discountPct,
      })),
    };
  });

  // Filtros en memoria: pocos coaches y evita diferencias de case entre SQLite/Postgres.
  if (lang) coaches = coaches.filter((c) => c.languages.toLowerCase().includes(lang));
  if (format) coaches = coaches.filter((c) => (c.specialties ?? "").toLowerCase().includes(format));
  if (maxPrice > 0) coaches = coaches.filter((c) => c.fromCents > 0 && c.fromCents <= maxPrice * 100);

  if (sort === "price") {
    // Más barato primero; sin precio publicado al final.
    coaches.sort((a, b) => (a.fromCents || Infinity) - (b.fromCents || Infinity));
  } else if (sort === "rating") {
    coaches.sort((a, b) => b.ratingAvg - a.ratingAvg || b.reviewCount - a.reviewCount);
  } else {
    // recommended: verificados primero, luego rating y trayectoria (bookings).
    coaches.sort(
      (a, b) =>
        Number(b.verified) - Number(a.verified) ||
        b.ratingAvg - a.ratingAvg ||
        b.bookingCount - a.bookingCount,
    );
  }

  return ok({ coaches });
}
