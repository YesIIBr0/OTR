// [BE-TEST] Integración de la campana de notificaciones (bug: "casi no se alimenta").
// Cubre los 4 puntos del fix:
//   1) POST /api/messages   → incrementa Conversation.unread + notifica al OTRO participante.
//   2) POST /api/bookings   → notifica al ALUMNO ("Sesión confirmada" / "Sesión por aprobar").
//   3) PATCH /api/bookings/[id] approve  → notifica al ALUMNO ("Sesión confirmada").
//      PATCH /api/bookings/[id] complete → notifica al COACH ("Pago liberado").
//   4) GET /api/notifications → feed del usuario (suyas + globales), no leídas primero, esc() UNA vez.
// Mockea Prisma + sesión + mail (harness). Ejercita la LÓGICA real de cada handler.
import { describe, it, expect, beforeEach, vi } from "vitest";
import { makeDb, jsonReq } from "./helpers/route-harness";

const box = vi.hoisted(() => ({ db: null as any, user: null as any }));
vi.mock("../app/lib/db", () => ({
  db: new Proxy({}, { get: (_t, p: string) => (p === "then" ? undefined : box.db.db[p]) }),
}));
vi.mock("../app/lib/auth", () => ({ setSession: vi.fn(), getSessionUser: () => box.user, clearSession: vi.fn() }));
// POST /api/messages ahora tiene rate-limit (F1.4); lo neutralizamos en el test para ejercitar
// la lógica de la campana sin depender del limiter (mismo mecanismo que api-register.test.ts).
vi.mock("../app/lib/rate-limit", () => ({ rateLimit: () => ({ ok: true, retryAfter: 0 }) }));
vi.mock("../app/lib/mail", () => ({
  sendMail: vi.fn(),
  emailShell: vi.fn((title: string, body: string) => `<html>${title}${body}</html>`),
  emailButton: vi.fn(() => "<a>btn</a>"),
  sendPasswordReset: vi.fn(),
  hashToken: (x: string) => x,
}));

import { POST as messagesPOST } from "../app/api/messages/route";
import { POST as bookingsPOST } from "../app/api/bookings/route";
import { PATCH as bookingsPatch } from "../app/api/bookings/[id]/route";
import { GET as notificationsGET } from "../app/api/notifications/route";

box.db = makeDb();
const db = box.db;

function futureSlot(hoursAhead = 24): string {
  const ms = Date.now() + hoursAhead * 3600 * 1000;
  const aligned = Math.floor(ms / 60000) * 60000;
  return new Date(aligned).toISOString();
}

// ---------------------------------------------------------------------------
// 1) POST /api/messages
// ---------------------------------------------------------------------------
describe("POST /api/messages — alimenta la campana", () => {
  const CONV_ID = "conv-1";
  const SENDER_ID = "sender-1";
  const RECEIVER_ID = "receiver-1";

  beforeEach(() => {
    db.reset();
    vi.clearAllMocks();
    db.fn("conversation.findUnique").mockResolvedValue({ id: CONV_ID });
    db.fn("conversationParticipant.findMany").mockResolvedValue([
      { userId: SENDER_ID },
      { userId: RECEIVER_ID },
    ]);
    db.fn("user.findMany").mockResolvedValue([{ ageBand: "adult" }]); // otro participante no es menor
    db.fn("chatMessage.count").mockResolvedValue(0);
    db.fn("chatMessage.create").mockImplementation(async ({ data }: any) => ({ id: "msg-1", ...data }));
    db.fn("conversation.update").mockResolvedValue({});
    db.fn("notification.create").mockResolvedValue({ id: "notif-1" });
    db.fn("activityEvent.create").mockResolvedValue({ id: "a1" });
  });

  it("incrementa Conversation.unread y crea UNA Notification para el receptor (no el emisor)", async () => {
    box.user = { id: SENDER_ID, role: "STUDENT", ageBand: "adult", name: "Ana" };
    const res = await messagesPOST(jsonReq("/api/messages", { conversationId: CONV_ID, body: "Hola, ¿cómo vas?" }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);

    expect(db.fn("conversation.update")).toHaveBeenCalledWith({
      where: { id: CONV_ID },
      data: { lastLabel: "Hola, ¿cómo vas?", whenLabel: "ahora", unread: { increment: 1 } },
    });

    expect(db.fn("notification.create")).toHaveBeenCalledOnce();
    const notifData = db.fn("notification.create").mock.calls[0][0].data;
    expect(notifData.userId).toBe(RECEIVER_ID);
    expect(notifData.title).toBe("Nuevo mensaje de Ana");
    expect(notifData.icon).toBe("msg");
    expect(notifData.unread).toBe(true);
  });

  it("una conversación donde el emisor es el único participante no crea notificación (nada a quién avisar)", async () => {
    db.fn("conversationParticipant.findMany").mockResolvedValue([{ userId: SENDER_ID }]);
    box.user = { id: SENDER_ID, role: "STUDENT", ageBand: "adult", name: "Ana" };
    const res = await messagesPOST(jsonReq("/api/messages", { conversationId: CONV_ID, body: "Hola" }));
    expect(res.status).toBe(200);
    expect(db.fn("notification.create")).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 2) POST /api/bookings
// ---------------------------------------------------------------------------
describe("POST /api/bookings — notifica al alumno", () => {
  const COACH_PROFILE_ID = "coachprofile-1";
  const COACH_USER_ID = "coachuser-1";
  const STUDENT_ID = "student-adult-1";
  const MINOR_ID = "student-minor-1";
  const PARENT_ID = "parent-1";
  const HOURLY_CENTS = 5000;

  beforeEach(() => {
    db.reset();
    vi.clearAllMocks();

    db.fn("coachProfile.findUnique").mockImplementation(async ({ where }: any) => {
      if (where?.id === COACH_PROFILE_ID || where?.userId === COACH_USER_ID) {
        return { id: COACH_PROFILE_ID, userId: COACH_USER_ID, active: true, hourlyCents: HOURLY_CENTS, availability: [] };
      }
      return null;
    });
    db.fn("coachPackage.findUnique").mockResolvedValue(null);
    db.fn("user.findUnique").mockImplementation(async ({ where, select }: any) => {
      const id = where?.id;
      if (id === COACH_USER_ID) {
        if (select?.coachVerified !== undefined) return { coachVerified: true };
        if (select?.name !== undefined) return { name: "Coach Test" };
      }
      if (id === STUDENT_ID && select?.email !== undefined) return { email: "student@test.com" };
      if (id === MINOR_ID && select?.email !== undefined) return { email: "minor@test.com" };
      if (id === PARENT_ID && select?.email !== undefined) return { email: "parent@test.com" };
      return null;
    });
    db.fn("guardianship.findMany").mockResolvedValue([]);
    db.fn("booking.findMany").mockResolvedValue([]);
    db.fn("booking.create").mockImplementation(async ({ data }: any) => ({ id: "booking-created-1", videoUrl: null, ...data }));
    db.fn("booking.update").mockImplementation(async ({ where, data }: any) => ({ id: where.id, status: "CONFIRMED", ...data }));
    db.fn("escrowTxn.create").mockResolvedValue({ id: "escrow-created-1" });
    db.fn("coachProfile.update").mockResolvedValue({});
    db.fn("activityEvent.create").mockResolvedValue({ id: "activity-1" });
    db.fn("notification.create").mockResolvedValue({ id: "notif-1" });
  });

  it("alumno adulto reserva → CONFIRMED: notifica 'Sesión confirmada' al propio alumno", async () => {
    box.user = { id: STUDENT_ID, role: "STUDENT", ageBand: "adult" };
    const res = await bookingsPOST(jsonReq("/api/bookings", { coachId: COACH_PROFILE_ID, slotAt: futureSlot() }));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.status).toBe("CONFIRMED");

    expect(db.fn("notification.create")).toHaveBeenCalledOnce();
    const notifData = db.fn("notification.create").mock.calls[0][0].data;
    expect(notifData.userId).toBe(STUDENT_ID);
    expect(notifData.title).toBe("Sesión confirmada");
    expect(notifData.tone).toBe("ok");
  });

  it("alumno menor sin consentimiento amplio → PENDING: notifica 'Sesión por aprobar' al propio alumno", async () => {
    db.fn("guardianship.findMany").mockResolvedValueOnce([
      { parentId: PARENT_ID, consentLevel: "standard", approveUnderCents: null, createdAt: new Date() },
    ]);
    box.user = { id: MINOR_ID, role: "STUDENT", ageBand: "minor" };
    const res = await bookingsPOST(jsonReq("/api/bookings", { coachId: COACH_PROFILE_ID, slotAt: futureSlot() }));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.status).toBe("PENDING");

    expect(db.fn("notification.create")).toHaveBeenCalledOnce();
    const notifData = db.fn("notification.create").mock.calls[0][0].data;
    expect(notifData.userId).toBe(MINOR_ID);
    expect(notifData.title).toBe("Sesión por aprobar");
    expect(notifData.tone).toBe("warn");
  });
});

// ---------------------------------------------------------------------------
// 3) PATCH /api/bookings/[id] — approve / complete
// ---------------------------------------------------------------------------
describe("PATCH /api/bookings/[id] — notifica approve/complete", () => {
  function makeBooking(overrides: Record<string, unknown> = {}) {
    return {
      id: "b1",
      studentId: "student1",
      coachId: "coach1",
      consentBy: "parent1",
      status: "PENDING",
      priceCents: 5000,
      videoUrl: null,
      recordingUrl: null,
      slotAt: new Date().toISOString(),
      escrow: null,
      ...overrides,
    };
  }

  async function patchBooking(id: string, body: Record<string, unknown>) {
    const res = await bookingsPatch(jsonReq(`/api/bookings/${id}`, body, "PATCH"), { params: Promise.resolve({ id }) });
    const json = await res.json();
    return { status: res.status, json };
  }

  beforeEach(() => {
    db.reset();
    vi.clearAllMocks();
    db.fn("booking.findUnique").mockResolvedValue(null);
    db.fn("booking.update").mockImplementation(async ({ where, data }: any) => ({ id: where.id, status: data.status, videoUrl: data.videoUrl }));
    db.fn("escrowTxn.create").mockImplementation(async ({ data }: any) => ({ id: "e-new", ...data }));
    db.fn("escrowTxn.updateMany").mockResolvedValue({ count: 1 });
    db.fn("coachSession.upsert").mockResolvedValue({ id: "cs1" });
    db.fn("user.update").mockResolvedValue({ id: "student1", xp: 25 });
    db.fn("user.findUnique").mockResolvedValue(null);
    db.fn("activityEvent.create").mockResolvedValue({ id: "a1" });
    db.fn("notification.create").mockResolvedValue({ id: "notif-1" });
  });

  it("approve: notifica 'Sesión confirmada' al alumno", async () => {
    box.user = { id: "parent1", role: "PARENT" };
    db.fn("booking.findUnique").mockResolvedValue(makeBooking());
    const { status } = await patchBooking("b1", { action: "approve" });
    expect(status).toBe(200);

    expect(db.fn("notification.create")).toHaveBeenCalledOnce();
    const notifData = db.fn("notification.create").mock.calls[0][0].data;
    expect(notifData.userId).toBe("student1");
    expect(notifData.title).toBe("Sesión confirmada");
  });

  it("complete: notifica 'Pago liberado' al coach con el monto del payout", async () => {
    box.user = { id: "coach1", role: "COACH" };
    db.fn("booking.findUnique").mockResolvedValue(
      makeBooking({ status: "CONFIRMED", coachId: "coach1", escrow: { id: "e0", status: "HELD", amountCents: 5000, takeRatePct: 18 } }),
    );
    db.fn("user.findUnique").mockResolvedValue({ name: "Coach X" });

    const { status, json } = await patchBooking("b1", { action: "complete" });
    expect(status).toBe(200);
    expect(json.escrow.payoutCents).toBe(4100);

    expect(db.fn("notification.create")).toHaveBeenCalledOnce();
    const notifData = db.fn("notification.create").mock.calls[0][0].data;
    expect(notifData.userId).toBe("coach1");
    expect(notifData.title).toBe("Pago liberado");
    expect(notifData.detail).toContain("$41"); // 4100 centavos → $41
  });

  it("cancel: NO crea notificación (fuera del alcance del fix; solo approve/complete)", async () => {
    box.user = { id: "student1", role: "STUDENT" };
    db.fn("booking.findUnique").mockResolvedValue(makeBooking({ studentId: "student1" }));
    const { status } = await patchBooking("b1", { action: "cancel" });
    expect(status).toBe(200);
    expect(db.fn("notification.create")).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 4) GET /api/notifications
// ---------------------------------------------------------------------------
describe("GET /api/notifications — feed de la campana", () => {
  beforeEach(() => {
    db.reset();
    vi.clearAllMocks();
  });

  it("sin sesión → 401", async () => {
    box.user = null;
    const res = await notificationsGET();
    expect(res.status).toBe(401);
  });

  it("devuelve las notificaciones propias + globales, no leídas primero, tope 30, escapadas UNA vez", async () => {
    box.user = { id: "u-1", role: "STUDENT" };
    db.fn("notification.findMany").mockResolvedValue([
      { id: "n1", userId: "u-1", icon: "msg", tone: "sky", title: "<b>Hola</b>", detail: "texto & más", whenLabel: "ahora", unread: true, position: 0 },
      { id: "n2", userId: null, icon: "bell", tone: "sky", title: "Global", detail: "para todos", whenLabel: "ayer", unread: false, position: 1 },
    ]);

    const res = await notificationsGET();
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.notifications).toHaveLength(2);
    // esc() UNA vez: sin doble-escape (&amp;amp;) y el <b> queda neutralizado.
    expect(json.notifications[0].t).toBe("&lt;b&gt;Hola&lt;/b&gt;");
    expect(json.notifications[0].d).toBe("texto &amp; más");
    expect(json.notifications[0].unread).toBe(true);

    expect(db.fn("notification.findMany")).toHaveBeenCalledWith({
      where: { OR: [{ userId: "u-1" }, { userId: null }] },
      orderBy: [{ unread: "desc" }, { position: "asc" }],
      take: 30,
    });
  });
});
