// [BE-TEST · F5.3] Integración de la bandeja de WhatsApp (lectura) — /api/whatsapp/conversations
// GET (lista) + /api/whatsapp/conversations/[id] GET (hilo).
// Protege:
//   Gate de rol — solo TEACHER|ADMIN entran; STUDENT/PARENT → 403 (la bandeja del equipo trae
//     PII de contactos externos).
//   Forma NUEVA (post-F3) — la lista trae el ÚLTIMO mensaje por contacto vía include+take:1
//     (orderBy createdAt desc), en UNA sola query (sin N+1). lastMessage es null si no hay mensajes.
//   Hilo por id — 404 si el contacto no existe; si existe, mensajes del contacto (asc, tope 200).
// Mockea Prisma + sesión.
import { describe, it, expect, beforeEach, vi } from "vitest";
import { makeDb, jsonReq } from "./helpers/route-harness";

// Caja hoisteada (los factory de vi.mock se elevan sobre los imports; solo pueden tocar
// `vi` y vars de vi.hoisted). El Proxy reenvía perezosamente a box.db.db.
const box = vi.hoisted(() => ({ db: null as any, user: null as any }));
vi.mock("../app/lib/db", () => ({
  db: new Proxy({}, { get: (_t, p: string) => (p === "then" ? undefined : box.db.db[p]) }),
}));
vi.mock("../app/lib/auth", () => ({ setSession: vi.fn(), getSessionUser: () => box.user, clearSession: vi.fn() }));

import { GET as LIST } from "../app/api/whatsapp/conversations/route";
import { GET as THREAD } from "../app/api/whatsapp/conversations/[id]/route";

box.db = makeDb();
const db = box.db;

async function list() {
  const res = await LIST();
  return { status: res.status, json: await res.json() };
}
async function thread(id: string) {
  const res = await THREAD(jsonReq(`/api/whatsapp/conversations/${id}`, undefined, "GET"), {
    params: Promise.resolve({ id }),
  });
  return { status: res.status, json: await res.json() };
}

beforeEach(() => {
  db.reset();
  vi.clearAllMocks();
  box.user = null;
});

// ---------------------------------------------------------------------------
// Lista de conversaciones
// ---------------------------------------------------------------------------
describe("GET /api/whatsapp/conversations — gate de rol", () => {
  it("sin sesión → 401", async () => {
    box.user = null;
    const { status } = await list();
    expect(status).toBe(401);
    expect(db.fn("whatsAppContact.findMany")).not.toHaveBeenCalled();
  });

  it("STUDENT → 403 (la bandeja es solo del equipo)", async () => {
    box.user = { id: "s1", role: "STUDENT" };
    const { status } = await list();
    expect(status).toBe(403);
    expect(db.fn("whatsAppContact.findMany")).not.toHaveBeenCalled();
  });

  it("PARENT → 403", async () => {
    box.user = { id: "p1", role: "PARENT" };
    const { status } = await list();
    expect(status).toBe(403);
  });
});

describe("GET /api/whatsapp/conversations — forma con lastMessage (post-F3: take 1 por contacto)", () => {
  it("TEACHER → 200: cada contacto trae SOLO su último mensaje (o null si no tiene)", async () => {
    box.user = { id: "t1", role: "TEACHER" };
    const at = new Date("2026-07-10T12:00:00Z");
    db.fn("whatsAppContact.findMany").mockResolvedValue([
      { id: "c1", phone: "18090000001", name: "Ana", lastMessageAt: at, messages: [{ body: "Hola equipo", direction: "IN", createdAt: at }] },
      { id: "c2", phone: "18090000002", name: "Beto", lastMessageAt: null, messages: [] },
    ]);

    const { status, json } = await list();
    expect(status).toBe(200);
    expect(json.conversations).toHaveLength(2);
    // Contacto con mensajes → lastMessage con la forma acotada.
    expect(json.conversations[0]).toMatchObject({
      id: "c1", phone: "18090000001", name: "Ana",
      lastMessage: { body: "Hola equipo", direction: "IN" },
    });
    // Contacto sin mensajes → lastMessage null (no rompe).
    expect(json.conversations[1].lastMessage).toBeNull();

    // Fija la query NUEVA: una sola findMany, con include del mensaje más reciente (take:1).
    expect(db.fn("whatsAppContact.findMany")).toHaveBeenCalledOnce();
    const arg = db.fn("whatsAppContact.findMany").mock.calls[0][0];
    expect(arg.orderBy).toEqual({ lastMessageAt: "desc" });
    expect(arg.take).toBe(100);
    expect(arg.include.messages.take).toBe(1);
    expect(arg.include.messages.orderBy).toEqual({ createdAt: "desc" });
  });

  it("ADMIN sin contactos → 200 { conversations: [] }", async () => {
    box.user = { id: "a1", role: "ADMIN" };
    db.fn("whatsAppContact.findMany").mockResolvedValue([]);
    const { status, json } = await list();
    expect(status).toBe(200);
    expect(json.conversations).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Hilo de una conversación
// ---------------------------------------------------------------------------
describe("GET /api/whatsapp/conversations/[id] — hilo", () => {
  it("sin sesión → 401", async () => {
    box.user = null;
    const { status } = await thread("c1");
    expect(status).toBe(401);
    expect(db.fn("whatsAppContact.findUnique")).not.toHaveBeenCalled();
  });

  it("STUDENT → 403", async () => {
    box.user = { id: "s1", role: "STUDENT" };
    const { status } = await thread("c1");
    expect(status).toBe(403);
    expect(db.fn("whatsAppContact.findUnique")).not.toHaveBeenCalled();
  });

  it("contacto inexistente → 404", async () => {
    box.user = { id: "t1", role: "TEACHER" };
    db.fn("whatsAppContact.findUnique").mockResolvedValue(null);
    const { status } = await thread("no-existe");
    expect(status).toBe(404);
    expect(db.fn("whatsAppMessage.findMany")).not.toHaveBeenCalled();
  });

  it("ADMIN + contacto existente → 200 con { contact, messages } (asc, tope 200)", async () => {
    box.user = { id: "a1", role: "ADMIN" };
    db.fn("whatsAppContact.findUnique").mockResolvedValue({ id: "c1", phone: "18090000001", name: "Ana" });
    db.fn("whatsAppMessage.findMany").mockResolvedValue([{ id: "m1", body: "Hola" }, { id: "m2", body: "¿Info?" }]);

    const { status, json } = await thread("c1");
    expect(status).toBe(200);
    expect(json.contact).toMatchObject({ id: "c1", name: "Ana" });
    expect(json.messages).toHaveLength(2);

    const arg = db.fn("whatsAppMessage.findMany").mock.calls[0][0];
    expect(arg.where).toEqual({ contactId: "c1" });
    expect(arg.orderBy).toEqual({ createdAt: "asc" });
    expect(arg.take).toBe(200);
  });
});
