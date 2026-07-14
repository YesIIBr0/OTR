// OTR Aula · Webhook de WhatsApp Business (Meta Cloud API) — Fase 1: recepción de mensajes
// entrantes. Lo llama Meta directamente (no un usuario de la app): SIN gate de sesión.
//
//  GET  — handshake de verificación que Meta dispara al configurar la URL del webhook en su
//         dashboard: hub.mode=subscribe + hub.verify_token=WHATSAPP_VERIFY_TOKEN → responde
//         hub.challenge EN TEXTO PLANO (no JSON). Si no coincide: 403 sin cuerpo.
//  POST — mensajes entrantes, firmados con X-Hub-Signature-256 (HMAC-SHA256 sobre el body
//         CRUDO, clave WHATSAPP_APP_SECRET). Firma inválida → 401 sin tocar la DB. Firma
//         válida → upsert de WhatsAppContact + create de WhatsAppMessage IN por cada mensaje
//         de texto; ignora "statuses" (confirmaciones de entrega de NUESTROS salientes) y
//         otros tipos sin crashear. SIEMPRE responde 200 rápido (Meta reintenta agresivo si
//         no hay 200/timeout) — todo el procesamiento va envuelto en try/catch amplio.
import { NextResponse } from "next/server";
import { db } from "../../../lib/db";
import { esc } from "../../../lib/esc";
import { verifyWhatsAppSignature } from "../../../lib/whatsapp";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge") || "";
  if (mode === "subscribe" && token && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    // Texto plano, no NextResponse.json — así lo exige el handshake de Meta.
    return new NextResponse(challenge, { status: 200, headers: { "content-type": "text/plain" } });
  }
  return new NextResponse(null, { status: 403 });
}

interface WaMessage {
  from?: string;
  id?: string;
  type?: string;
  text?: { body?: string };
}
interface WaChangeValue {
  contacts?: Array<{ profile?: { name?: string } }>;
  messages?: WaMessage[];
}
interface WaChange {
  field?: string;
  value?: WaChangeValue;
}
interface WaPayload {
  entry?: Array<{ changes?: WaChange[] }>;
}

export async function POST(req: Request) {
  // Body CRUDO primero (antes de cualquier parseo) — lo exige la verificación de firma.
  const raw = await req.text();
  const sig = req.headers.get("x-hub-signature-256");
  if (!verifyWhatsAppSignature(raw, sig)) {
    return new NextResponse(null, { status: 401 }); // firma inválida → ni se toca la DB
  }

  try {
    const payload = JSON.parse(raw) as WaPayload;
    const entries = Array.isArray(payload.entry) ? payload.entry : [];

    for (const entry of entries) {
      const changes = Array.isArray(entry.changes) ? entry.changes : [];
      for (const change of changes) {
        if (change.field !== "messages") continue; // ignora otros campos de suscripción
        const value = change.value || {};
        const messages = Array.isArray(value.messages) ? value.messages : [];
        // Defensivo: además de "statuses" con field !== "messages", Meta también puede mandar
        // field==="messages" con solo `statuses` en el value (confirmaciones de entrega de
        // NUESTROS salientes) — sin `messages`, no hay nada que guardar aquí.
        if (!messages.length) continue;
        const contactName = value.contacts?.[0]?.profile?.name;

        for (const msg of messages) {
          const from = String(msg.from || "").trim();
          if (!from) continue;
          const now = new Date();

          const contact = await db.whatsAppContact.upsert({
            where: { phone: from },
            update: { lastMessageAt: now, ...(contactName ? { name: esc(contactName) } : {}) },
            create: { phone: from, name: contactName ? esc(contactName) : null, lastMessageAt: now },
          });

          // El body se escapa AQUÍ, al guardarlo (contrato de escape del repo): puede llegar
          // HTML/scripts de un remitente malicioso. La pantalla admin lo renderiza CRUDO.
          const body =
            msg.type === "text"
              ? esc(msg.text?.body ?? "")
              : esc(`[mensaje no soportado: ${msg.type || "desconocido"}]`);

          if (msg.id) {
            // Dedupe de reintentos de Meta por waMessageId (@unique): si ya existe, no-op.
            await db.whatsAppMessage.upsert({
              where: { waMessageId: msg.id },
              update: {},
              create: { contactId: contact.id, direction: "IN", body, waMessageId: msg.id, status: "received" },
            });
          } else {
            await db.whatsAppMessage.create({
              data: { contactId: contact.id, direction: "IN", body, status: "received" },
            });
          }
        }
      }
    }
  } catch (err) {
    // Un error de parseo/DB NUNCA debe bloquear el ack — Meta reintenta agresivamente si no.
    console.error("[whatsapp webhook] error procesando payload:", err);
  }

  return NextResponse.json({ received: true });
}
