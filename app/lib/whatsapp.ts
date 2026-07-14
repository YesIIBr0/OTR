// OTR Aula · WhatsApp Business (Meta Cloud API) — Fase 1: envío de mensajes salientes 1 a 1
// + verificación de la firma del webhook entrante. Deliberadamente SIN ninguna función de
// "enviar a una lista/todos los contactos" — eso exige plantillas pre-aprobadas por Meta y
// es una decisión de negocio pendiente, fuera de alcance de esta fase.
import { createHmac, timingSafeEqual } from "crypto";

export interface SendWhatsAppInput {
  to: string; // E.164 sin "+" (ej "18092920939")
  body: string;
}
export interface SendWhatsAppResult {
  ok: boolean;
  waMessageId?: string;
  error?: string;
}

/** Envía un mensaje de texto por la Graph API de WhatsApp Business. Best-effort — mismo
    espíritu que app/lib/mail.ts sendMail: sin credenciales configuradas, NUNCA lanza; loguea
    y degrada con gracia devolviendo {ok:false}. */
export async function sendWhatsAppMessage({ to, body }: SendWhatsAppInput): Promise<SendWhatsAppResult> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) {
    console.log("[whatsapp] no configurado — mensaje no enviado a", to);
    return { ok: false, error: "not configured" };
  }
  const apiVersion = process.env.WHATSAPP_API_VERSION || "v21.0";
  try {
    const res = await fetch(`https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "text",
        text: { body },
      }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const msg = (data && data.error && data.error.message) || `HTTP ${res.status}`;
      console.error("[whatsapp] error al enviar:", msg);
      return { ok: false, error: msg };
    }
    const waMessageId: string | undefined = data?.messages?.[0]?.id;
    return { ok: true, waMessageId };
  } catch (err) {
    console.error("[whatsapp] error de red al enviar:", err);
    return { ok: false, error: err instanceof Error ? err.message : "network error" };
  }
}

/** Verifica la firma HMAC-SHA256 del webhook (header X-Hub-Signature-256: sha256=<hex>) contra
    el body CRUDO, usando WHATSAPP_APP_SECRET. Mismo patrón que auth-crypto.ts verifySession:
    timingSafeEqual sobre los hex ya calculados (no hace falta decodificar hex a bytes).
    Fail-closed: sin secreto en env o sin header, devuelve false. */
export function verifyWhatsAppSignature(rawBody: string, signatureHeader: string | null): boolean {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret || !signatureHeader) return false;
  const prefix = "sha256=";
  if (!signatureHeader.startsWith(prefix)) return false;
  const provided = signatureHeader.slice(prefix.length);
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
