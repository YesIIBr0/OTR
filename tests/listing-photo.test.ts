// [TEST · P5] La FOTO del profesor en el marketplace.
// En Preply el thumbnail ES la persona: la foto es la señal de confianza que decide si
// alguien sigue leyendo. OTR la tenía guardada (User.avatarUrl, editable en el perfil) pero
// no la servía en el buscador ni la usaba de cover — el listado enseñaba iniciales aunque el
// profesor hubiera subido su foto. Esto fija que:
//   · el buscador SIRVE la foto del profesor;
//   · el cover usa la foto cuando existe y cae al emblema institucional cuando no;
//   · la URL se escapa en el atributo (no se puede cerrar el src e inyectar onerror).
import { describe, it, expect, beforeEach, vi } from "vitest";

/* eslint-disable @typescript-eslint/no-explicit-any */
(globalThis as any).window = (globalThis as any).window || {};
const win: any = (globalThis as any).window;
win.api = async () => ({});
win.go = () => {};

import { makeDb, jsonReq } from "./helpers/route-harness";

const box = vi.hoisted(() => ({ db: null as any, user: null as any }));
vi.mock("../app/lib/db", () => ({
  db: new Proxy({}, { get: (_t, p: string) => (p === "then" ? undefined : box.db.db[p]) }),
}));
vi.mock("../app/lib/auth", () => ({ setSession: vi.fn(), getSessionUser: () => box.user, clearSession: vi.fn() }));

import { GET } from "../app/api/listings/route";
import { listingCover } from "../app/lib/listing-cover";
import { S as SListings } from "../app/lib/scr-listings";

box.db = makeDb();
const db = box.db;
const Listings: any = SListings;

const FOTO = "/uploads/cmqd1234-foto.jpg";

beforeEach(() => {
  db.reset();
  vi.clearAllMocks();
  box.user = { id: "s-1", name: "Ana", role: "STUDENT" };
  db.fn("listing.count").mockResolvedValue(1);
  db.fn("review.groupBy").mockResolvedValue([]);
  for (const k of Object.keys(win)) if (k.startsWith("__")) delete win[k];
});

describe("el buscador sirve la foto del profesor", () => {
  it("GET /api/listings devuelve teacherAvatar cuando el profesor tiene foto", async () => {
    db.fn("listing.findMany").mockResolvedValue([
      { id: "l-1", category: "ingles", title: "Inglés B2", description: "", priceCentsHour: 90000,
        language: "es", modality: "online",
        teacher: { id: "t-1", name: "Saúl", coachVerified: true, avatarUrl: FOTO } },
    ]);
    const res = await GET(jsonReq("/api/listings", undefined, "GET"));
    const json = await res.json();
    expect(json.listings[0].teacherAvatar).toBe(FOTO);
    // Y lo PIDE en el select: sin esto Prisma no lo trae y el campo llega siempre vacío.
    expect(db.fn("listing.findMany").mock.calls[0][0].select.teacher.select.avatarUrl).toBe(true);
  });

  it("sin foto devuelve cadena vacía (nunca null: el builder no tiene que defenderse)", async () => {
    db.fn("listing.findMany").mockResolvedValue([
      { id: "l-1", category: "ingles", title: "Inglés B2", description: "", priceCentsHour: 90000,
        language: "es", modality: "online",
        teacher: { id: "t-1", name: "Saúl", coachVerified: true, avatarUrl: null } },
    ]);
    const res = await GET(jsonReq("/api/listings", undefined, "GET"));
    expect((await res.json()).listings[0].teacherAvatar).toBe("");
  });
});

describe("cover: foto real cuando la hay, emblema institucional cuando no", () => {
  it("con foto: pinta la imagen", () => {
    const html = listingCover("ingles", "Inglés", "row", FOTO);
    expect(html).toContain("lst-cover--photo");
    expect(html).toContain(`src="${FOTO}"`);
    expect(html).toContain('loading="lazy"');
  });

  it("sin foto: cae al emblema de materia (nunca queda un hueco)", () => {
    const html = listingCover("ingles", "Inglés", "row");
    expect(html).not.toContain("<img");
    expect(html).toContain("lc-frame");
    expect(html).toContain("Inglés");
  });

  it("la URL se escapa: no se puede cerrar el src e inyectar un onerror", () => {
    const html = listingCover("ingles", "Inglés", "row", '" onerror="alert(1)');
    expect(html).not.toContain('onerror="alert(1)"');
    expect(html).toContain("&quot;");
  });
});

describe("la fila del listado usa la foto", () => {
  const CLASE = {
    id: "l-1", category: "ingles", title: "Inglés conversacional B1-B2", description: "Práctica oral",
    priceCentsHour: 90000, language: "es", modality: "online",
    teacherId: "t-1", teacherName: "Saúl Martínez", verified: true, rating: 4.8, reviewCount: 12,
  };

  it("con foto la muestra; sin foto muestra iniciales y no rompe", () => {
    win.__listings = { loaded: true, loading: false, error: false, total: 1, category: "", q: "",
      items: [{ ...CLASE, teacherAvatar: FOTO }] };
    const conFoto = Listings.listings.render({ role: "student" });
    expect(conFoto).toContain(FOTO);

    win.__listings = { loaded: true, loading: false, error: false, total: 1, category: "", q: "",
      items: [{ ...CLASE, teacherAvatar: "" }] };
    const sinFoto = Listings.listings.render({ role: "student" });
    expect(sinFoto).not.toContain("<img");
    expect(sinFoto).toContain("SM"); // iniciales del profesor
  });
});
