// OTR · TOTP (RFC 6238 / HOTP RFC 4226) con node:crypto — CERO dependencias [R5 — Tribunal 3.1].
// 2FA para cuentas ADMIN: la llave de los datos de menores no puede ser solo una contraseña.
// SHA-1 + 6 dígitos + paso de 30 s (el estándar de Google Authenticator / Authy / 1Password).
// Ventana de verificación ±1 paso (desfase de reloj del teléfono). Comparación timing-safe.
import { createHmac, randomBytes, timingSafeEqual } from "crypto";

const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"; // RFC 4648, sin padding

export function base32Encode(buf: Buffer): string {
  let bits = 0, value = 0, out = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(s: string): Buffer {
  const limpio = s.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0, value = 0;
  const out: number[] = [];
  for (const ch of limpio) {
    value = (value << 5) | B32.indexOf(ch);
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

// 160 bits de entropía (el tamaño que usan los vectores del RFC y las apps estándar).
export function generateTotpSecret(): string {
  return base32Encode(randomBytes(20));
}

// HOTP (RFC 4226): HMAC-SHA1(key, counter BE64) → truncación dinámica → 6 dígitos.
function hotp(key: Buffer, counter: number): string {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const mac = createHmac("sha1", key).update(buf).digest();
  const offset = mac[mac.length - 1] & 0xf;
  const code =
    ((mac[offset] & 0x7f) << 24) | (mac[offset + 1] << 16) | (mac[offset + 2] << 8) | mac[offset + 3];
  return String(code % 1_000_000).padStart(6, "0");
}

// Código vigente para un secreto base32 (nowMs inyectable → testeable con los vectores RFC).
export function totpCode(secret: string, nowMs = Date.now()): string {
  return hotp(base32Decode(secret), Math.floor(nowMs / 30_000));
}

// Verifica con ventana ±1 paso (30 s de desfase tolerado en cada dirección).
export function verifyTotp(secret: string, code: string, nowMs = Date.now()): boolean {
  const limpio = String(code || "").replace(/\s+/g, "");
  if (!/^\d{6}$/.test(limpio)) return false;
  const key = base32Decode(secret);
  if (key.length === 0) return false;
  const step = Math.floor(nowMs / 30_000);
  for (const w of [0, -1, 1]) {
    const esperado = hotp(key, step + w);
    if (timingSafeEqual(Buffer.from(esperado), Buffer.from(limpio))) return true;
  }
  return false;
}

// URL otpauth:// para pegar/escanear en la app autenticadora (entrada manual soportada
// por todas; no incluimos lib de QR a propósito — cero deps).
export function otpauthUrl(secret: string, account: string): string {
  const issuer = encodeURIComponent("OTR Academy");
  return `otpauth://totp/${issuer}:${encodeURIComponent(account)}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;
}
