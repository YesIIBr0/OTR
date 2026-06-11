// Coach Workspace (PRD §7.5) · /api/coach-profile — gestión del perfil de coach
// (supply-side, role-scoped TEACHER/COACH/ADMIN, siempre sobre el perfil PROPIO).
//
//  GET   — CoachProfile propio con availability + packages → ok({ profile })
//          o ok({ profile: null }) si aún no hizo onboarding.
//  PATCH — body acepta cualquiera de:
//          · campos: { hourlyCents?, specialties?, languages?, responseTime?,
//            cancelPolicy?, active? } → actualiza; si NO existe CoachProfile
//            lo crea on-the-fly con defaults sensatos (onboarding §7.5).
//          · { addAvailability: { weekday 0-6, startMin, endMin } } → valida
//            inicio<fin, mínimo 60 min y sin solape en el mismo día (409).
//          · { removeAvailabilityId } → valida pertenencia y borra la franja.
//          Las operaciones se aplican en ese orden; el UI manda una por request.
//
// Siempre responde con el perfil FRESCO en el mismo shape que DB.coachwork.profile
// (queries.ts/C1): availability con label "Lun 9:00 AM – 6:00 PM" (weekday 0=Dom)
// y packages con priceLabel "$X".
import { db } from "../../lib/db";
import { getSessionUser } from "../../lib/auth";
import { ok, bad, readJson, clean } from "../../lib/api";
import { logActivitySafe } from "../../lib/activity";

const ROLES = new Set(["TEACHER", "COACH", "ADMIN"]);
// Convención CoachAvailability.weekday: 0=Dom … 6=Sáb (ver schema.prisma).
const WEEKDAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

/** Minutos desde medianoche → "9:00 AM" / "6:00 PM" (hora RD, sin DST). */
function minutesLabel(min: number): string {
  const h24 = Math.floor(min / 60) % 24;
  const m = min % 60;
  const suffix = h24 < 12 ? "AM" : "PM";
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h}:${String(m).padStart(2, "0")} ${suffix}`;
}

/** Centavos USD → "$40" / "$37.50" — mismo formato que usdLabel de queries.ts. */
function usdLabel(cents: number): string {
  const v = (Number(cents) || 0) / 100;
  return `$${v.toLocaleString(
    "en-US",
    Number.isInteger(v) ? undefined : { minimumFractionDigits: 2, maximumFractionDigits: 2 },
  )}`;
}

/** Perfil propio con relaciones ya ordenadas (franjas por día/hora, paquetes por posición). */
function fetchProfile(userId: string) {
  return db.coachProfile.findUnique({
    where: { userId },
    include: {
      availability: { orderBy: [{ weekday: "asc" as const }, { startMin: "asc" as const }] },
      packages: { orderBy: { position: "asc" as const } },
    },
  });
}

type ProfileWithRels = NonNullable<Awaited<ReturnType<typeof fetchProfile>>>;

/** Shape de salida = DB.coachwork.profile (C1): el UI no recalcula etiquetas. */
function shapeProfile(p: ProfileWithRels) {
  return {
    id: p.id,
    active: p.active,
    hourlyCents: p.hourlyCents,
    hourlyLabel: usdLabel(p.hourlyCents),
    specialties: p.specialties ?? "",
    languages: p.languages,
    responseTime: p.responseTime ?? "",
    cancelPolicy: p.cancelPolicy ?? "",
    availability: p.availability.map((a) => ({
      id: a.id,
      weekday: a.weekday,
      startMin: a.startMin,
      endMin: a.endMin,
      label: `${WEEKDAYS[a.weekday] ?? "?"} ${minutesLabel(a.startMin)} – ${minutesLabel(a.endMin)}`,
    })),
    packages: p.packages.map((k) => ({
      id: k.id,
      name: k.name,
      sessions: k.sessions,
      priceCents: k.priceCents,
      priceLabel: usdLabel(k.priceCents),
      discountPct: k.discountPct,
    })),
  };
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) return bad("No autenticado", 401);
  if (!ROLES.has(user.role)) return bad("Solo coaches pueden gestionar un perfil de coach", 403);

  const profile = await fetchProfile(user.id);
  return ok({ profile: profile ? shapeProfile(profile) : null });
}

type PatchBody = {
  hourlyCents?: unknown;
  specialties?: unknown;
  languages?: unknown;
  responseTime?: unknown;
  cancelPolicy?: unknown;
  active?: unknown;
  addAvailability?: unknown;
  removeAvailabilityId?: unknown;
};

export async function PATCH(req: Request) {
  const user = await getSessionUser();
  if (!user) return bad("No autenticado", 401);
  if (!ROLES.has(user.role)) return bad("Solo coaches pueden gestionar un perfil de coach", 403);

  const body = await readJson<PatchBody>(req);
  const hasFields =
    body.hourlyCents !== undefined ||
    body.specialties !== undefined ||
    body.languages !== undefined ||
    body.responseTime !== undefined ||
    body.cancelPolicy !== undefined ||
    body.active !== undefined;
  const hasAdd = body.addAvailability !== undefined;
  const hasRemove = body.removeAvailabilityId !== undefined;
  if (!hasFields && !hasAdd && !hasRemove) return bad("Nada que actualizar", 400);

  let profile = await db.coachProfile.findUnique({ where: { userId: user.id } });

  // --- Campos del perfil (crea on-the-fly si es el primer PATCH: onboarding) ---
  if (hasFields) {
    const data: {
      hourlyCents?: number;
      specialties?: string;
      languages?: string;
      responseTime?: string;
      cancelPolicy?: string;
      active?: boolean;
    } = {};
    if (body.hourlyCents !== undefined) {
      const cents = Math.round(Number(body.hourlyCents));
      if (!Number.isFinite(cents) || cents < 100 || cents > 50000) {
        return bad("Tarifa por hora fuera de rango ($1–$500 USD)", 400);
      }
      data.hourlyCents = cents;
    }
    if (body.specialties !== undefined) data.specialties = clean(body.specialties, 160);
    if (body.languages !== undefined) data.languages = clean(body.languages, 40);
    if (body.responseTime !== undefined) data.responseTime = clean(body.responseTime, 60);
    if (body.cancelPolicy !== undefined) data.cancelPolicy = clean(body.cancelPolicy, 200);
    if (body.active !== undefined) data.active = !!body.active;

    profile = profile
      ? await db.coachProfile.update({ where: { id: profile.id }, data })
      : await db.coachProfile.create({
          data: { userId: user.id, hourlyCents: 4000, active: true, ...data },
        });
  }

  // --- Alta de franja de disponibilidad semanal --------------------------------
  if (hasAdd) {
    // Sin perfil todavía: el alta de franja también dispara el onboarding.
    profile =
      profile ??
      (await db.coachProfile.create({ data: { userId: user.id, hourlyCents: 4000, active: true } }));

    const a = (body.addAvailability ?? {}) as { weekday?: unknown; startMin?: unknown; endMin?: unknown };
    const weekday = Number(a.weekday);
    const startMin = Number(a.startMin);
    const endMin = Number(a.endMin);
    if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) {
      return bad("Día inválido (0=Dom … 6=Sáb)", 400);
    }
    if (!Number.isInteger(startMin) || !Number.isInteger(endMin) || startMin < 0 || endMin > 1440) {
      return bad("Horario inválido (minutos 0–1440)", 400);
    }
    if (startMin >= endMin) return bad("La hora de inicio debe ser anterior a la de fin", 400);
    if (endMin - startMin < 60) return bad("La franja debe durar al menos 60 minutos", 400);

    const sameDay = await db.coachAvailability.findMany({ where: { coachId: profile.id, weekday } });
    const clash = sameDay.find((s) => s.startMin < endMin && startMin < s.endMin);
    if (clash) {
      return bad(
        `Se solapa con otra franja del ${WEEKDAYS[weekday]} (${minutesLabel(clash.startMin)} – ${minutesLabel(clash.endMin)})`,
        409,
      );
    }

    await db.coachAvailability.create({ data: { coachId: profile.id, weekday, startMin, endMin } });
  }

  // --- Baja de franja (valida que pertenezca a SU CoachProfile) ----------------
  if (hasRemove) {
    if (!profile) return bad("Aún no tienes perfil de coach", 404);
    const id = clean(body.removeAvailabilityId, 64);
    if (!id) return bad("removeAvailabilityId requerido", 400);
    const slot = await db.coachAvailability.findUnique({ where: { id } });
    if (!slot) return bad("Franja no encontrada", 404);
    if (slot.coachId !== profile.id) return bad("Esa franja no pertenece a tu perfil", 403);
    await db.coachAvailability.delete({ where: { id } });
  }

  // Ledger best-effort: nunca tumba la operación principal (patrón activity.ts).
  await logActivitySafe({
    userId: user.id,
    type: "coach_profile_updated",
    source: "coachwork",
    refId: profile?.id ?? null,
    title: "Actualizó su perfil de coach",
  });

  const fresh = await fetchProfile(user.id);
  return ok({ profile: fresh ? shapeProfile(fresh) : null });
}
