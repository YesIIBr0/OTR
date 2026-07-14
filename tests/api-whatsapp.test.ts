// [BE-TEST] Integración de la bandeja de WhatsApp Business (Meta Cloud API, Fase 1):
// handshake del webhook, verificación de firma HMAC del POST entrante, dedupe/placeholder
// de mensajes, y el gate de rol + degradación sin credenciales de /api/whatsapp/send.
// Mockea Prisma + sesión (harness). La firma SÍ se calcula real (HMAC-SHA256 con un
// WHATSAPP_APP_SECRET de prueba) — es la única forma de probar la verificación de verdad.
import { createHmac } from "crypto";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { makeDb, jsonReq } from "./helpers/route-harness";

// Caja hoisteada (los factory de vi.mock se elevan sobre los imports; solo pueden tocar
// `vi` y vars de vi.hoisted). El Proxy reenvía perezosamente a box.db.db.
const box = vi.hoisted(() => ({ db: null as any, user: null as any }));
vi.mock("../app/lib/db", () => ({
  db: new Proxy({}, { get: (_t, p: string) => (p === "then" ? undefined : box.db.db[p]) }),
}));
vi.mock("../app/lib/auth", () => ({ setSession: vi.fn(), getSessionUser: () => box.user, clearSession: vi.fn() }));

import { GET, POST } from "../app/api/whatsapp/webhook/route";
import { POST as sendPOST } from "../app/api/whatsapp/send/route";

box.db = makeDb();
const db = box.db;

const APP_SECRET = "test-only-app-secret-do-not-use-in-prod";

function sign(rawBody: string, secret: string): string {
  return "sha256=" + createHmac("sha256", secret).update(rawBody).digest("hex");
}

function rawReq(url: string, body: string, headers: Record<string, string> = {}): Request {
  return new Request(url, { method: "POST", headers, body });
}

beforeEach(() => {
  db.reset();
  vi.clearAllMocks();
  box.user = null;
  process.env.WHATSAPP_VERIFY_TOKEN = "verify-token-test";
  process.env.WHATSAPP_APP_SECRET = APP_SECRET;
  delete process.env.WHATSAPP_ACCESS_TOKEN;
  delete process.env.WHATSAPP_PHONE_NUMBER_ID;
});

describe("GET /api/whatsapp/webhook — handshake de verificación", () => {
  it("token correcto → 200 con hub.challenge en texto plano", async () => {
    const url = "http://test.local/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=verify-token-test&hub.challenge=123456";
    const res = await GET(new Request(url));
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("123456");
  });

  it("token incorrecto → 403", async () => {
    const url = "http://test.local/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=lo-que-sea&hub.challenge=123456";
    const res = await GET(new Request(url));
    expect(res.status).toBe(403);
  });

  it("hub.mode distinto de 'subscribe' → 403 aunque el token coincida", async () => {
    const url = "http://test.local/api/whatsapp/webhook?hub.mode=unsubscribe&hub.verify_token=verify-token-test&hub.challenge=123456";
    const res = await GET(new Request(url));
    expect(res.status).toBe(403);
  });
});

describe("POST /api/whatsapp/webhook — firma + procesamiento", () => {
  it("firma inválida → 401, sin tocar la DB", async () => {
    const raw = JSON.stringify({ object: "whatsapp_business_account", entry: [] });
    const req = rawReq("http://test.local/api/whatsapp/webhook", raw, { "x-hub-signature-256": "sha256=deadbeef" });
    const res = await POST(req);
    expect(res.status).toBe(401);
    expect(db.fn("whatsAppContact.upsert")).not.toHaveBeenCalled();
    expect(db.fn("whatsAppMessage.upsert")).not.toHaveBeenCalled();
    expect(db.fn("whatsAppMessage.create")).not.toHaveBeenCalled();
  });

  it("sin header de firma → 401, sin tocar la DB", async () => {
    const raw = JSON.stringify({ object: "whatsapp_business_account", entry: [] });
    const res = await POST(rawReq("http://test.local/api/whatsapp/webhook", raw));
    expect(res.status).toBe(401);
    expect(db.fn("whatsAppContact.upsert")).not.toHaveBeenCalled();
  });

  it("firma válida + mensaje de texto → upsert de contacto + create de mensaje IN (body escapado)", async () => {
    db.fn("whatsAppContact.upsert").mockResolvedValue({ id: "contact-xyz", phone: "16505551234" });

    const payload = {
      object: "whatsapp_business_account",
      entry: [
        {
          id: "waba-1",
          changes: [
            {
              field: "messages",
              value: {
                messaging_product: "whatsapp",
                metadata: { display_phone_number: "15550001111", phone_number_id: "123456" },
                contacts: [{ profile: { name: "Sheena Nelson" }, wa_id: "16505551234" }],
                messages: [
                  {
                    from: "16505551234",
                    id: "wamid.TEST1",
                    timestamp: "1749416383",
                    type: "text",
                    // deliberadamente incluye HTML/entidades — debe llegar ESCAPADO a la DB.
                    text: { body: "<script>alert(1)</script> & friends" },
                  },
                ],
              },
            },
          ],
        },
      ],
    };
    const raw = JSON.stringify(payload);
    const res = await POST(rawReq("http://test.local/api/whatsapp/webhook", raw, { "x-hub-signature-256": sign(raw, APP_SECRET) }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true });

    expect(db.fn("whatsAppContact.upsert")).toHaveBeenCalledTimes(1);
    const contactArgs = db.fn("whatsAppContact.upsert").mock.calls[0][0];
    expect(contactArgs.where).toEqual({ phone: "16505551234" });
    expect(contactArgs.create.phone).toBe("16505551234");
    expect(contactArgs.create.name).toBe("Sheena Nelson");

    expect(db.fn("whatsAppMessage.upsert")).toHaveBeenCalledTimes(1);
    const msgArgs = db.fn("whatsAppMessage.upsert").mock.calls[0][0];
    expect(msgArgs.where).toEqual({ waMessageId: "wamid.TEST1" });
    expect(msgArgs.create).toMatchObject({
      contactId: "contact-xyz",
      direction: "IN",
      body: "&lt;script&gt;alert(1)&lt;/script&gt; &amp; friends",
      waMessageId: "wamid.TEST1",
      status: "received",
    });
    expect(db.fn("whatsAppMessage.create")).not.toHaveBeenCalled();
  });

  it("payload de 'statuses' (confirmaciones de entrega, no mensajes) → 200 sin crashear, sin crear mensajes", async () => {
    const payload = {
      object: "whatsapp_business_account",
      entry: [
        {
          id: "waba-1",
          changes: [
            {
              field: "messages",
              value: {
                messaging_product: "whatsapp",
                metadata: { display_phone_number: "15550001111", phone_number_id: "123456" },
                statuses: [{ id: "wamid.OUT1", status: "delivered", timestamp: "1749416400", recipient_id: "16505551234" }],
              },
            },
          ],
        },
      ],
    };
    const raw = JSON.stringify(payload);
    const res = await POST(rawReq("http://test.local/api/whatsapp/webhook", raw, { "x-hub-signature-256": sign(raw, APP_SECRET) }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true });
    expect(db.fn("whatsAppContact.upsert")).not.toHaveBeenCalled();
    expect(db.fn("whatsAppMessage.upsert")).not.toHaveBeenCalled();
    expect(db.fn("whatsAppMessage.create")).not.toHaveBeenCalled();
  });

  it("body crudo malformado (JSON inválido) con firma válida → 200 sin crashear (try/catch amplio)", async () => {
    const raw = "{ esto no es json válido";
    const res = await POST(rawReq("http://test.local/api/whatsapp/webhook", raw, { "x-hub-signature-256": sign(raw, APP_SECRET) }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true });
  });
});

describe("POST /api/whatsapp/send — gate de rol + degradación sin credenciales", () => {
  it("STUDENT no puede enviar → 403", async () => {
    box.user = { id: "u-student", role: "STUDENT" };
    const res = await sendPOST(jsonReq("/api/whatsapp/send", { contactId: "c1", body: "Hola" }));
    expect(res.status).toBe(403);
    expect(db.fn("whatsAppMessage.create")).not.toHaveBeenCalled();
  });

  it("PARENT no puede enviar → 403", async () => {
    box.user = { id: "u-parent", role: "PARENT" };
    const res = await sendPOST(jsonReq("/api/whatsapp/send", { contactId: "c1", body: "Hola" }));
    expect(res.status).toBe(403);
    expect(db.fn("whatsAppMessage.create")).not.toHaveBeenCalled();
  });

  it("ADMIN sin sesión → 401", async () => {
    box.user = null;
    const res = await sendPOST(jsonReq("/api/whatsapp/send", { contactId: "c1", body: "Hola" }));
    expect(res.status).toBe(401);
  });

  it("sin WHATSAPP_ACCESS_TOKEN/PHONE_NUMBER_ID configurados, no lanza y responde error amigable (502)", async () => {
    box.user = { id: "admin-1", role: "ADMIN" };
    db.fn("whatsAppContact.findUnique").mockResolvedValue({ id: "c1", phone: "18092920939", name: "Juan" });
    db.fn("whatsAppMessage.create").mockResolvedValue({ id: "m1", status: "queued" });
    db.fn("whatsAppMessage.update").mockResolvedValue({ id: "m1", status: "failed" });
    db.fn("whatsAppContact.update").mockResolvedValue({ id: "c1" });

    const res = await sendPOST(jsonReq("/api/whatsapp/send", { contactId: "c1", body: "Hola, ¿cómo estás?" }));
    const json = await res.json();

    expect(res.status).toBe(502);
    expect(json.ok).toBe(false);
    // el mensaje quedó guardado como "failed" (best-effort, sin lanzar) — no se pierde el intento.
    expect(db.fn("whatsAppMessage.update")).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "failed" }) })
    );
  });

  it("contacto inexistente → 404, sin crear el mensaje", async () => {
    box.user = { id: "admin-1", role: "ADMIN" };
    db.fn("whatsAppContact.findUnique").mockResolvedValue(null);
    const res = await sendPOST(jsonReq("/api/whatsapp/send", { contactId: "no-existe", body: "Hola" }));
    expect(res.status).toBe(404);
    expect(db.fn("whatsAppMessage.create")).not.toHaveBeenCalled();
  });

  it("body vacío → 400, sin tocar la DB", async () => {
    box.user = { id: "admin-1", role: "ADMIN" };
    const res = await sendPOST(jsonReq("/api/whatsapp/send", { contactId: "c1", body: "   " }));
    expect(res.status).toBe(400);
    expect(db.fn("whatsAppContact.findUnique")).not.toHaveBeenCalled();
  });
});
