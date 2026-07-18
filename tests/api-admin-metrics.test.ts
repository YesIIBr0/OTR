// [BE-TEST · R6 — Tribunal 1.5] GET /api/admin/metrics — el funnel de ACTIVACIÓN y la
// North Star. Fija: gate ADMIN, funnel.firstCoreAction (≥1 acción core alguna vez) y
// northStar.activeStudentsWeek (≥1 acción core en 7 días) con su definición viajando en
// el payload — el panel nunca pinta el número sin contexto. Los counts de User se
// distinguen por la FORMA del where (mockImplementation), no por orden de llamada.
import { describe, it, expect, beforeEach, vi } from "vitest";
import { makeDb } from "./helpers/route-harness";

const box = vi.hoisted(() => ({ db: null as any, user: null as any }));
vi.mock("../app/lib/db", () => ({
  db: new Proxy({}, { get: (_t, p: string) => (p === "then" ? undefined : box.db.db[p]) }),
}));
vi.mock("../app/lib/auth", () => ({ setSession: vi.fn(), getSessionUser: () => box.user, clearSession: vi.fn() }));

import { GET } from "../app/api/admin/metrics/route";

box.db = makeDb();
const db = box.db;

async function metrics() {
  const res = await GET(); // la ruta no recibe request (agrega sin params)
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

beforeEach(() => {
  db.reset();
  vi.clearAllMocks();
  box.user = { id: "admin-1", name: "Root", role: "ADMIN" };
  // Distingue cada user.count por la forma de su where:
  db.fn("user.count").mockImplementation(async (arg: any) => {
    const w = arg?.where || {};
    if (w.activityEvents?.some?.createdAt) return 3; // North Star (ventana 7 días)
    if (w.activityEvents) return 5; // primera acción core (sin ventana)
    if (w.placedAt) return 8;
    if (w.enrollments) return 7;
    if (w.bookingsAsStudent) return 4;
    return 10; // studentsTotal
  });
  db.fn("user.groupBy").mockResolvedValue([]);
  db.fn("user.findMany").mockResolvedValue([]);
  db.fn("booking.count").mockResolvedValue(0);
  db.fn("booking.groupBy").mockResolvedValue([]);
  db.fn("booking.aggregate").mockResolvedValue({ _sum: { priceCents: 0 } });
  db.fn("debateRecord.count").mockResolvedValue(0);
  db.fn("course.count").mockResolvedValue(0);
  db.fn("enrollment.count").mockResolvedValue(0);
  db.fn("tournament.count").mockResolvedValue(0);
  db.fn("tournamentRegistration.count").mockResolvedValue(0);
});

describe("GET /api/admin/metrics — gate y métricas de activación", () => {
  it("sin sesión 401; TEACHER 403", async () => {
    box.user = null;
    expect((await metrics()).status).toBe(401);
    box.user = { id: "t1", name: "C", role: "TEACHER" };
    expect((await metrics()).status).toBe(403);
  });

  it("funnel incluye firstCoreAction y la North Star viaja con su definición", async () => {
    const { status, json } = await metrics();
    expect(status).toBe(200);
    expect(json.funnel).toMatchObject({ studentsTotal: 10, placed: 8, enrolled: 7, booked: 4, firstCoreAction: 5 });
    expect(json.northStar.activeStudentsWeek).toBe(3);
    expect(json.northStar.definition).toMatch(/acción core/);
  });

  it("la North Star cuenta SOLO con ventana de 7 días y tipos core (forma del where)", async () => {
    await metrics();
    const calls = db.fn("user.count").mock.calls.map((c: any[]) => c[0]?.where || {});
    const ns = calls.find((w: any) => w.activityEvents?.some?.createdAt);
    expect(ns.role).toBe("STUDENT");
    expect(ns.activityEvents.some.type.in).toContain("lesson_done");
    expect(ns.activityEvents.some.type.in).toContain("booking_made");
    expect(ns.activityEvents.some.createdAt.gte).toBeInstanceOf(Date);
  });
});
