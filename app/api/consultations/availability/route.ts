// GET /api/consultations/availability?date=YYYY-MM-DD — público.
// Devuelve los slots LIBRES del día (resta las reservas activas y los pasados por leadHours).
import { db } from "../../../lib/db";
import { ok } from "../../../lib/api";
import { computeSlotsForDate, localDayRangeUtc } from "../../../lib/consultations";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const date = String(url.searchParams.get("date") || "").trim();

  // Genera los slots del día (ya filtra día cerrado / fuera de rango por leadHours..horizonDays).
  const all = computeSlotsForDate(date);
  if (all.length === 0) return ok({ date, slots: [] });

  // Reservas activas (status != CANCELLED) que caen en ese día local → ocupan slot.
  const range = localDayRangeUtc(date);
  const taken = new Set<string>();
  if (range) {
    const bookings = await db.consultationBooking.findMany({
      where: {
        status: { not: "CANCELLED" },
        slotAt: { gte: range.startUtc, lt: range.endUtc },
      },
      select: { slotAt: true },
    });
    for (const b of bookings) {
      // Normaliza al mismo formato ISO ("…Z", sin milisegundos) que produce computeSlotsForDate.
      taken.add(b.slotAt.toISOString().replace(/\.\d{3}Z$/, "Z"));
    }
  }

  const slots = all.filter((s) => !taken.has(s.iso));
  return ok({ date, slots });
}
