// Marketplace (PRD §7) · /api/bookings — reserva de coaching pago vía escrow.
//
//  POST (STUDENT) — body { coachId, packageId, slotAt }.
//    Flujo: valida coach+paquete → valida slot (futuro, alineado, dentro de la
//    disponibilidad del coach si la publicó, sin choque con otro Booking activo)
//    → SAFETY GATE de menores → crea Booking (+ EscrowTxn HELD solo si CONFIRMED).
//    SAFETY GATE (Trust & Safety): si el alumno es ageBand "minor" necesita un
//    Guardianship ACTIVE; consentBy = parentId. consentLevel "full" → CONFIRMED
//    (consentimiento amplio ya dado); si no → PENDING (el padre aprueba vía
//    PATCH /api/bookings/[id]). Menor sin guardián vinculado → 403.
//    ESCROW SIMULADO (§7.4): sin Stripe real en esta fase. La EscrowTxn nace HELD
//    SOLO al confirmar (no se retienen fondos de un booking PENDING de un menor;
//    se crea al aprobar el tutor). amountCents = precio del paquete, takeRatePct 18. Al
//    completarse la sesión se marca RELEASED (payout = monto − take rate); al
//    cancelarse, REFUNDED. Cuando se integre Stripe, stripeRef guardará el
//    PaymentIntent y HELD/RELEASED/REFUNDED se mapearán a capturas/transferencias.
//
//  GET — bookings del usuario según rol: STUDENT (sus reservas), COACH/TEACHER
//    (su agenda como coach + las propias como alumno), PARENT (las de sus hijos
//    vinculados y las que esperan su consentimiento), ADMIN (todas).
//
// CONTRATO: Booking.coachId = User.id del coach (simétrico con studentId).
import { db } from "../../lib/db";
import { getSessionUser } from "../../lib/auth";
import { ok, bad, readJson, clean } from "../../lib/api";
import { logActivitySafe } from "../../lib/activity";
import { TZ_OFFSET, dateLabel, timeLabel } from "../../lib/consultations";

const DURATION_MIN = 60; // sesión de coaching estándar
const MS_MIN = 60 * 1000;
const MS_HOUR = 3600 * 1000;
const LEAD_MS = 12 * MS_HOUR; // [BOOKING-6] 12h — consistente con el slot picker del marketplace (antes 1h: UI y backend usaban reglas distintas para el mismo concepto)
const HORIZON_MS = 60 * 24 * MS_HOUR; // hasta 60 días adelante

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return bad("No autenticado", 401);
  if (user.role !== "STUDENT") return bad("Solo estudiantes pueden reservar sesiones de coaching", 403);

  const body = await readJson<{ coachId?: string; packageId?: string; slotAt?: string }>(req);
  const coachKey = clean(body.coachId, 64);
  const packageId = clean(body.packageId, 64);
  const slotRaw = clean(body.slotAt, 40);
  if (!coachKey) return bad("Falta coachId");

  // coachId acepta CoachProfile.id o User.id del coach.
  const include = { availability: true } as const;
  const profile =
    (await db.coachProfile.findUnique({ where: { id: coachKey }, include })) ??
    (await db.coachProfile.findUnique({ where: { userId: coachKey }, include }));
  if (!profile || !profile.active) return bad("Coach no encontrado", 404);
  if (profile.userId === user.id) return bad("No puedes reservar una sesión contigo mismo", 400);
  // [P0-5] Solo coaches VERIFICADOS reciben reservas (PRD §7.4/§7.6 — sirven a menores;
  // sin verificación de identidad/credenciales no se permite reservar con ellos).
  const coachVerifiedRow = await db.user.findUnique({ where: { id: profile.userId }, select: { coachVerified: true } });
  if (!coachVerifiedRow?.coachVerified) return bad("Este coach aún no está verificado", 403);

  // Paquete opcional: sin packageId la sesión se cobra a la tarifa por hora del
  // coach (el UI deriva paquetes sugeridos sin id cuando el coach no publicó).
  let pkg: { id: string; name: string; priceCents: number } | null = null;
  if (packageId) {
    const found = await db.coachPackage.findUnique({ where: { id: packageId } });
    if (!found || found.coachId !== profile.id) return bad("Paquete no encontrado para este coach", 404);
    pkg = found;
  }
  const amountCents = pkg ? pkg.priceCents : profile.hourlyCents;
  const pkgName = pkg ? pkg.name : "Sesión individual";

  // --- Slot: fecha válida, alineada al minuto, en el rango reservable ---
  const slotMs = Date.parse(slotRaw);
  if (Number.isNaN(slotMs) || slotMs % MS_MIN !== 0) return bad("Horario inválido", 400);
  const now = Date.now();
  if (slotMs < now + LEAD_MS) return bad("Ese horario ya pasó o está demasiado cerca", 400);
  if (slotMs > now + HORIZON_MS) return bad("Solo se puede reservar hasta 60 días adelante", 400);

  // Disponibilidad publicada del coach (hora RD, UTC-4 fijo): si tiene franjas,
  // la sesión completa debe caber en una. Sin franjas publicadas no se restringe.
  if (profile.availability.length) {
    const local = new Date(slotMs + TZ_OFFSET * MS_HOUR);
    const weekday = local.getUTCDay();
    const startMin = local.getUTCHours() * 60 + local.getUTCMinutes();
    const fits = profile.availability.some(
      (a) => a.weekday === weekday && a.startMin <= startMin && startMin + DURATION_MIN <= a.endMin,
    );
    if (!fits) return bad("El coach no está disponible en ese horario", 409);
  }

  // --- SAFETY GATE: menores requieren consentimiento parental ---
  let status = "CONFIRMED";
  let consentBy: string | null = null;
  if (user.ageBand === "minor") {
    const links = await db.guardianship.findMany({
      where: { studentId: user.id, status: "ACTIVE" },
      orderBy: { createdAt: "asc" },
    });
    if (!links.length) return bad("Se requiere consentimiento parental: vincula a tu familia", 403);
    // PRD §11.3 — el consentimiento per-booking se resuelve por guardián:
    //  · consentLevel "full"            → confianza total: confirma directo.
    //  · approveUnderCents = N (≥0)     → auto-aprueba si el monto ≤ N; si lo supera, PENDING.
    //  · si ninguno aplica              → PENDING (el padre aprueba cada reserva).
    // Elegimos el guardián MÁS permisivo para este monto.
    const full = links.find((l) => l.consentLevel === "full");
    const underThreshold = links.find(
      (l) => l.approveUnderCents != null && amountCents <= l.approveUnderCents,
    );
    const guardian = full ?? underThreshold ?? links[0];
    consentBy = guardian.parentId;
    status = full || underThreshold ? "CONFIRMED" : "PENDING";
  }

  const coachUser = await db.user.findUnique({
    where: { id: profile.userId },
    select: { name: true },
  });
  const coachName = coachUser?.name ?? "Coach";

  // --- Crear Booking + EscrowTxn (HELD) en transacción, re-chequeando el choque
  //     de agenda dentro de la misma transacción para cerrar la carrera. ---
  const slotAt = new Date(slotMs);
  const CONFLICT = "SLOT_TAKEN";
  let booking;
  try {
    booking = await db.$transaction(async (tx) => {
      // Bookings activos del coach alrededor del slot (las sesiones duran ≤ 24h
      // de margen hacia atrás); el solape se evalúa en memoria con durationMin.
      const neighbors = await tx.booking.findMany({
        where: {
          coachId: profile.userId,
          status: { in: ["PENDING", "CONFIRMED"] },
          slotAt: { gte: new Date(slotMs - 24 * MS_HOUR), lt: new Date(slotMs + DURATION_MIN * MS_MIN) },
        },
        select: { slotAt: true, durationMin: true },
      });
      const end = slotMs + DURATION_MIN * MS_MIN;
      const taken = neighbors.some((b) => {
        const bStart = b.slotAt.getTime();
        const bEnd = bStart + b.durationMin * MS_MIN;
        return bStart < end && bEnd > slotMs;
      });
      if (taken) throw new Error(CONFLICT);

      let b = await tx.booking.create({
        data: {
          studentId: user.id,
          coachId: profile.userId,
          packageId: pkg ? pkg.id : null,
          slotAt,
          durationMin: DURATION_MIN,
          // [BOOKING-ESCROW-1 §7.4] snapshot del precio acordado: el escrow de un
          // booking PENDING (menor esperando al tutor) se crea al aprobar, con este monto.
          priceCents: amountCents,
          status,
          consentBy,
        },
      });
      // Sala on-platform (PRD §7.3 paso 6): al confirmar directo (alumno adulto
      // o menor con consentimiento parental amplio), se asigna la sala interna
      // '/aula?room=<id>' — necesita el id ya creado. La videollamada real
      // (Cloudflare/Daily) se cabla luego; por ahora la sala es una vista
      // interna de la app. Para PENDING se asigna al aprobar (PATCH approve).
      if (b.status === "CONFIRMED" && !b.videoUrl) {
        b = await tx.booking.update({
          where: { id: b.id },
          data: { videoUrl: `/aula?room=${b.id}` },
        });
      }
      // [BOOKING-ESCROW-1 §7.4] El escrow nace HELD SOLO al confirmar. Si el booking
      // queda PENDING (menor esperando consentimiento del tutor) NO se retienen fondos
      // todavía: la EscrowTxn HELD se crea cuando el padre aprueba (PATCH /api/bookings/[id]).
      if (b.status === "CONFIRMED") {
        await tx.escrowTxn.create({
          data: {
            bookingId: b.id,
            amountCents,
            takeRatePct: 18,
            status: "HELD",
            stripeRef: null,
          },
        });
      }
      await tx.coachProfile.update({
        where: { id: profile.id },
        data: { bookingCount: { increment: 1 } },
      });
      return b;
    });
  } catch (e) {
    if (e instanceof Error && e.message === CONFLICT) return bad("Ese horario ya fue reservado", 409);
    return bad("No se pudo crear la reserva. Intenta de nuevo.", 500);
  }

  // Ledger universal (best-effort, nunca tumba la reserva).
  await logActivitySafe({
    userId: user.id,
    type: "booking_made",
    source: "marketplace",
    refId: booking.id,
    title: `Reservó sesión de coaching con ${coachName}`,
    detail: `${dateLabel(slotAt)} · ${timeLabel(slotAt)} · ${pkgName}`,
    meta: { amountCents, status: booking.status, packageId: pkg ? pkg.id : null },
  });

  return ok({ bookingId: booking.id, status: booking.status });
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) return bad("No autenticado", 401);

  // Alcance por rol (role-scoped data access, PRD §3.3).
  let where: Record<string, unknown>;
  if (user.role === "COACH" || user.role === "TEACHER") {
    where = { OR: [{ coachId: user.id }, { studentId: user.id }] };
  } else if (user.role === "PARENT") {
    const links = await db.guardianship.findMany({
      where: { parentId: user.id, status: "ACTIVE" },
      select: { studentId: true },
    });
    where = { OR: [{ consentBy: user.id }, { studentId: { in: links.map((l) => l.studentId) } }] };
  } else if (user.role === "ADMIN") {
    where = {};
  } else {
    where = { studentId: user.id };
  }

  const bookings = await db.booking.findMany({
    where,
    orderBy: { slotAt: "desc" },
    include: { escrow: true, session: true },
  });

  // Joins manuales (Booking no tiene @relation a User/CoachPackage en el schema).
  const userIds = [...new Set(bookings.flatMap((b) => [b.studentId, b.coachId]))];
  const users = userIds.length
    ? await db.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, initials: true, avatarUrl: true },
      })
    : [];
  const userById = new Map(users.map((u) => [u.id, u]));

  const pkgIds = [...new Set(bookings.map((b) => b.packageId).filter((x): x is string => !!x))];
  const pkgs = pkgIds.length
    ? await db.coachPackage.findMany({
        where: { id: { in: pkgIds } },
        select: { id: true, name: true, sessions: true, priceCents: true },
      })
    : [];
  const pkgById = new Map(pkgs.map((p) => [p.id, p]));

  return ok({
    bookings: bookings.map((b) => {
      const student = userById.get(b.studentId);
      const coach = userById.get(b.coachId);
      const pkg = b.packageId ? (pkgById.get(b.packageId) ?? null) : null;
      return {
        id: b.id,
        status: b.status,
        slotAt: b.slotAt,
        dateLabel: dateLabel(b.slotAt),
        timeLabel: timeLabel(b.slotAt),
        durationMin: b.durationMin,
        videoUrl: b.videoUrl,
        consentBy: b.consentBy,
        // El padre vinculado ve de un vistazo qué espera su aprobación.
        awaitingConsent: b.status === "PENDING" && !!b.consentBy,
        // [BOOKING-ESCROW-1] precio acordado (snapshot): visible aun cuando el escrow
        // todavía no existe (booking PENDING de un menor, fondos no retenidos aún).
        priceCents: b.priceCents,
        student: { id: b.studentId, name: student?.name ?? "Estudiante", initials: student?.initials ?? "ES" },
        coach: { id: b.coachId, name: coach?.name ?? "Coach", initials: coach?.initials ?? "C" },
        package: pkg,
        escrow: b.escrow
          ? {
              amountCents: b.escrow.amountCents,
              takeRatePct: b.escrow.takeRatePct,
              status: b.escrow.status,
              releasedAt: b.escrow.releasedAt,
            }
          : null,
        completedAt: b.session?.completedAt ?? null,
        createdAt: b.createdAt,
      };
    }),
  });
}
