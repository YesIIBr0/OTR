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
// [CTO-audit MEDIUM] Rechazar los placeholders PÚBLICOS de los .env.example (viven en GitHub):
// un operador que copie el template sin cambiar el valor arrancaría con un secreto HMAC conocido
// → cualquiera podría forjar cookies de sesión firmadas (suplantación, incluida la de admin, y
// acceso a datos de menores). El largo mínimo no los frena porque los placeholders son largos.
// Convertimos el error de operador en un crash explícito al arranque. NOTA: la regex NO incluye
// la palabra "placeholder" a propósito, para no rechazar el valor build-only del Dockerfile
// ("build-time-placeholder-secret-32chars"), que es seguro (solo vive en la etapa builder).
if (/cambia|changeme|your[-_]?secret|openssl[_-]?rand/i.test(SECRET)) {
  throw new Error("AUTH_SECRET es un valor placeholder público (de los .env.example). Genera uno real: openssl rand -hex 32");
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

// [GOAL G4] El token incluye el sessionEpoch del usuario. getSessionUser lo compara con el
// valor actual de la fila: incrementarlo revoca TODAS las sesiones vivas de esa cuenta al
// instante ("cerrar sesión en todos los dispositivos"). Antes, un token robado seguía
// sirviendo 30 días aunque el dueño hiciera logout (clearSession solo borra SU cookie).
export function signSession(userId: string, fp: string, epoch: number = 0): string {
  const ts = Date.now().toString(36);
  const payload = `${userId}.${ts}.${fp}.${epoch}`;
  const mac = createHmac("sha256", SECRET).update(payload).digest("hex");
  return `${payload}.${mac}`;
}

export function verifySession(token: string): { userId: string; fp: string; epoch: number } | null {
  const parts = token.split(".");
  // 5 partes = formato actual (con epoch). Cualquier formato anterior → re-login (mismo
  // criterio que ya se aplicó al migrar de 3 a 4 partes): más seguro que asumir epoch 0.
  if (parts.length !== 5) return null;
  const [userId, ts, fp, epochRaw, mac] = parts;
  const payload = `${userId}.${ts}.${fp}.${epochRaw}`;
  const expected = createHmac("sha256", SECRET).update(payload).digest("hex");
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const issued = parseInt(ts, 36);
  if (!Number.isFinite(issued) || Date.now() - issued > MAX_AGE_MS) return null; // sesión expirada
  const epoch = Number.parseInt(epochRaw, 10);
  if (!Number.isFinite(epoch)) return null;
  return { userId, fp, epoch };
}
