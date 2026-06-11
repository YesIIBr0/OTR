// Cripto de auth (sin dependencias — Node crypto). Hash de contraseñas + firma de sesión.
import { scryptSync, randomBytes, timingSafeEqual, createHmac, createHash } from "crypto";

export function hashPassword(pw: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(pw, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(pw: string, stored: string | null | undefined): boolean {
  if (!stored) return false;
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const h = scryptSync(pw, salt, 64);
  const hb = Buffer.from(hash, "hex");
  return h.length === hb.length && timingSafeEqual(h, hb);
}

const SECRET = process.env.AUTH_SECRET;
if (!SECRET || SECRET.length < 16) {
  throw new Error("AUTH_SECRET no configurado o demasiado corto (mín. 16 caracteres). Define un secreto fuerte en las variables de entorno antes de arrancar.");
}

const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30; // 30 días

/**
 * Huella corta que liga la sesión al passwordHash actual del usuario.
 * Cambiar la contraseña (reset o cambio manual) cambia la huella → las sesiones
 * emitidas antes dejan de validar (m4: invalidar sesiones al resetear).
 */
export function passwordFingerprint(passwordHash: string | null | undefined): string {
  return createHash("sha256").update(`${SECRET}:${passwordHash ?? ""}`).digest("hex").slice(0, 16);
}

export function signSession(userId: string, fp: string): string {
  const ts = Date.now().toString(36);
  const payload = `${userId}.${ts}.${fp}`;
  const mac = createHmac("sha256", SECRET).update(payload).digest("hex");
  return `${payload}.${mac}`;
}

export function verifySession(token: string): { userId: string; fp: string } | null {
  const parts = token.split(".");
  if (parts.length !== 4) return null; // formato antiguo (3 partes) o inválido → re-login
  const [userId, ts, fp, mac] = parts;
  const payload = `${userId}.${ts}.${fp}`;
  const expected = createHmac("sha256", SECRET).update(payload).digest("hex");
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const issued = parseInt(ts, 36);
  if (!Number.isFinite(issued) || Date.now() - issued > MAX_AGE_MS) return null; // sesión expirada
  return { userId, fp };
}
