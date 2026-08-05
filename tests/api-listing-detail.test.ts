// [BE-TEST · P1] GET /api/listings/[id] — el "adentro de la clase" que ve el ALUMNO.
// Antes esta ruta solo servía el crudo al dueño/admin para editar (nadie la llamaba). Ahora
// su uso por defecto es PÚBLICO: la ficha del profesor. Lo que fija este test:
//   · solo se sirve un listing ACTIVE — un borrador o uno rechazado no se filtra jamás;
//   · el rating y las sesiones salen de datos VIVOS (Review / Booking completadas), no de
//     un contador que alguien pueda escribir;
//   · "Lo que ofrezco" son los OTROS listings ACTIVE del mismo profesor (visión Isaac: un
//     profesor sube un listing por materia) — y nunca se incluye a sí mismo;
//   · contrato de escape: todo texto de usuario se escapa UNA vez aquí;
//   · el dueño/admin conservan el crudo para editar con ?edit=1.
import { describe, it, expect, beforeEach, vi } from "vitest";
import { makeDb, jsonReq } from "./helpers/route-harness";

const box = vi.hoisted(() => ({ db: null as any, user: null as any }));
vi.mock("../app/lib/db", () => ({
  db: new Proxy({}, { get: (_t, p: string) => (p === "then" ? undefined : box.db.db[p]) }),
}));
vi.mock("../app/lib/auth", () => ({ setSession: vi.fn(), getSessionUser: () => box.user, clearSession: vi.fn() }));

import { GET } from "../app/api/listings/[id]/route";

box.db = makeDb();
const db = box.db;

const TEACHER = {
  id: "t-1", name: "Saúl & Co", initials: "SM", headline: "Coach de Debate & Oratoria",
  bio: "Campeón nacional <b>desde 2018</b>.", avatarUrl: "", coachVerified: true,
  location: "Santo Domingo", formats: "Public Forum, Extemp", createdAt: new Date("2026-01-15"),
};
const LISTING = {
  id: "l-1", teacherId: "t-1", category: "debate", title: "Public Forum <desde cero>",
  description: "Estructura de caso & refutación", priceCentsHour: 280000, language: "es,en",
  modality: "online", status: "ACTIVE", createdAt: new Date("2026-07-01"), teacher: TEACHER,
};
const STUDENT = { id: "s-1", name: "Ana", role: "STUDENT" };

async function get(id = "l-1", qs = "") {
  const res = await GET(jsonReq(`/api/listings/${id}${qs}`, undefined, "GET"), { params: Promise.resolve({ id }) });
  return { status: res.status, json: await res.json().catch(() => ({})) };
}

beforeEach(() => {
  db.reset();
  vi.clearAllMocks();
  box.user = STUDENT;
  db.fn("listing.findUnique").mockResolvedValue({ ...LISTING });
  db.fn("listing.findMany").mockResolvedValue([]);
  db.fn("review.aggregate").mockResolvedValue({ _avg: { rating: null }, _count: { _all: 0 } });
  db.fn("review.findMany").mockResolvedValue([]);
  db.fn("booking.count").mockResolvedValue(0);
});

describe("GET /api/listings/[id] — ficha pública", () => {
  it("sin sesión → 401", async () => {
    box.user = null;
    expect((await get()).status).toBe(401);
  });

  it("inexistente → 404", async () => {
    db.fn("listing.findUnique").mockResolvedValue(null);
    expect((await get()).status).toBe(404);
  });

  it("un listing NO publicado no se filtra al alumno (404, no 200)", async () => {
    for (const status of ["PENDING", "PAUSED", "REJECTED"]) {
      db.fn("listing.findUnique").mockResolvedValue({ ...LISTING, status });
      expect((await get()).status, `status ${status}`).toBe(404);
    }
  });

  it("ACTIVE → sirve la clase con su profesor, escapando el texto UNA vez", async () => {
    const { status, json } = await get();
    expect(status).toBe(200);
    expect(json.listing.title).toBe("Public Forum &lt;desde cero&gt;");
    expect(json.teacher.name).toBe("Saúl &amp; Co");
    expect(json.teacher.bio).toBe("Campeón nacional &lt;b&gt;desde 2018&lt;/b&gt;.");
    expect(json.teacher.verified).toBe(true);
    expect(json.listing.priceCentsHour).toBe(280000);
  });

  it("rating y sesiones salen de datos vivos (Review + Bookings completadas)", async () => {
    db.fn("review.aggregate").mockResolvedValue({ _avg: { rating: 4.85 }, _count: { _all: 128 } });
    db.fn("booking.count").mockResolvedValue(96);
    const { json } = await get();
    expect(json.stats.rating).toBe(4.9);     // redondeado a un decimal, como se pinta
    expect(json.stats.reviewCount).toBe(128);
    expect(json.stats.sessions).toBe(96);
    // Las sesiones son COMPLETADAS del profesor: una reserva pendiente no infla el número.
    expect(db.fn("booking.count").mock.calls[0][0].where.status).toBe("COMPLETED");
    expect(db.fn("booking.count").mock.calls[0][0].where.coachId).toBe("t-1");
  });

  it("'Lo que ofrezco' = otros listings ACTIVE del profesor, sin incluirse a sí mismo", async () => {
    db.fn("listing.findMany").mockResolvedValue([
      { id: "l-2", category: "oratoria", title: "Oratoria & presentaciones", priceCentsHour: 200000, modality: "online" },
    ]);
    const { json } = await get();
    expect(json.others).toHaveLength(1);
    expect(json.others[0].title).toBe("Oratoria &amp; presentaciones");
    const where = db.fn("listing.findMany").mock.calls[0][0].where;
    expect(where.teacherId).toBe("t-1");
    expect(where.status).toBe("ACTIVE");
    expect(where.id).toEqual({ not: "l-1" }); // nunca se ofrece a sí mismo
  });

  it("las reseñas vienen con autor y fecha, escapadas y acotadas", async () => {
    db.fn("review.findMany").mockResolvedValue([
      { id: "r-1", rating: 5, body: "Subí de novato a semifinalista <en un mes>", createdAt: new Date(), student: { name: "María G." } },
    ]);
    const { json } = await get();
    expect(json.reviews[0].body).toBe("Subí de novato a semifinalista &lt;en un mes&gt;");
    expect(json.reviews[0].author).toBe("María G.");
    expect(json.reviews[0].rating).toBe(5);
    expect(db.fn("review.findMany").mock.calls[0][0].take).toBeLessThanOrEqual(20);
  });

  it("nunca expone el email del profesor ni campos internos del listing", async () => {
    const { json } = await get();
    expect(JSON.stringify(json)).not.toContain("rejectReason");
    expect(json.teacher.email).toBeUndefined();
  });
});

describe("GET ?edit=1 — el crudo del dueño/admin sigue existiendo", () => {
  it("el dueño recibe el listing sin escapar, aunque NO esté publicado", async () => {
    box.user = { id: "t-1", name: "Saúl", role: "TEACHER" };
    db.fn("listing.findUnique").mockResolvedValue({ ...LISTING, status: "PENDING" });
    const { status, json } = await get("l-1", "?edit=1");
    expect(status).toBe(200);
    expect(json.listing.title).toBe("Public Forum <desde cero>");
  });

  it("un tercero NO puede pedir el crudo", async () => {
    expect((await get("l-1", "?edit=1")).status).toBe(403);
  });
});
