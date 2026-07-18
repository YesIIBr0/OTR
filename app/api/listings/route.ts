// OTR · Marketplace abierto — colección de listings [F-MKT M1].
//  GET  — PÚBLICO (requiere sesión): buscador del alumno. Solo ACTIVE, filtros
//         ?category=&q= (texto sobre título), paginado take/page (tope 50). Sirve el
//         nombre del profesor + su rating derivado de Review (la fuente viva, igual que
//         el marketplace de coaches). Contrato de escape: title/description/teacherName
//         se escapan UNA vez AQUÍ; el builder renderiza crudo.
//  POST — crea un listing (TEACHER|ADMIN): allowlist de lib/listings, nace SIEMPRE
//         PENDING (aprobación manual del admin — vetting con menores, spec §3.2),
//         rate-limited, audit().
import { db } from "../../lib/db";
import { getSessionUser } from "../../lib/auth";
import { ok, bad, readJson } from "../../lib/api";
import { esc } from "../../lib/esc";
import { requireRole } from "../../lib/authz";
import { rateLimit } from "../../lib/rate-limit";
import { audit } from "../../lib/audit";
import { cleanListingInput, LISTING_CATEGORIES, type ListingInput } from "../../lib/listings";

// Tope de listings por profesor (default reversible): evita spam de un solo dueño.
const MAX_LISTINGS_PER_TEACHER = 10;

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return bad("No autenticado", 401);

  const url = new URL(req.url);
  const category = (url.searchParams.get("category") || "").toLowerCase();
  const q = (url.searchParams.get("q") || "").slice(0, 80);
  const take = Math.min(50, Math.max(1, Number(url.searchParams.get("take")) || 24));
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);

  const where = {
    status: "ACTIVE",
    ...(category && (LISTING_CATEGORIES as readonly string[]).includes(category) ? { category } : {}),
    ...(q ? { title: { contains: q } } : {}),
  };

  const [rows, total] = await Promise.all([
    db.listing.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * take,
      take,
      select: {
        id: true, category: true, title: true, description: true, priceCentsHour: true,
        language: true, modality: true,
        teacher: { select: { id: true, name: true, coachVerified: true } },
      },
    }),
    db.listing.count({ where }),
  ]);

  // Rating del profesor derivado de Review (fuente viva) — UNA query para todos.
  const teacherIds = [...new Set(rows.map((l) => l.teacher.id))];
  const agg = teacherIds.length
    ? await db.review.groupBy({ by: ["teacherId"], where: { teacherId: { in: teacherIds } }, _avg: { rating: true }, _count: { _all: true } })
    : [];
  const ratingByTeacher = new Map(agg.map((r) => [r.teacherId, { avg: r._avg.rating, count: r._count._all }]));

  return ok({
    listings: rows.map((l) => ({
      id: l.id,
      category: l.category,
      title: esc(l.title),
      description: esc(l.description),
      priceCentsHour: l.priceCentsHour,
      language: l.language,
      modality: l.modality,
      teacherId: l.teacher.id,
      teacherName: esc(l.teacher.name),
      verified: !!l.teacher.coachVerified,
      rating: ratingByTeacher.get(l.teacher.id)?.avg ?? null,
      reviewCount: ratingByTeacher.get(l.teacher.id)?.count ?? 0,
    })),
    total,
    categories: LISTING_CATEGORIES,
  });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return bad("No autenticado", 401);
  if (!requireRole(user, "TEACHER", "ADMIN")) return bad("Solo profesores pueden publicar clases", 403);

  const rl = rateLimit(`listing-create:${user.id}`, 10, 10 * 60 * 1000);
  if (!rl.ok) return bad(`Demasiadas solicitudes. Intenta en ${rl.retryAfter}s.`, 429);

  const body = await readJson<ListingInput>(req);
  const parsed = cleanListingInput(body, true);
  if (parsed.error) return bad(parsed.error, 400);

  const count = await db.listing.count({ where: { teacherId: user.id, status: { not: "REJECTED" } } });
  if (count >= MAX_LISTINGS_PER_TEACHER) {
    return bad(`Máximo ${MAX_LISTINGS_PER_TEACHER} clases publicadas por profesor`, 400);
  }

  // Nace SIEMPRE PENDING: publica un humano del equipo tras revisar (vetting §3.2).
  const listing = await db.listing.create({ data: { ...parsed.data, teacherId: user.id } as never });
  await audit({
    actorId: user.id, actorName: user.name, action: "listing.create", targetType: "listing", targetId: listing.id,
    detail: `"${String(parsed.data.title)}" (${String(parsed.data.category)}) — pendiente de aprobación`,
  });
  return ok({ listing: { id: listing.id, status: listing.status } });
}
