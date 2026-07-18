import { db } from "../../../lib/db";
import { setSession } from "../../../lib/auth";
import { verifyPassword } from "../../../lib/auth-crypto";
import { ok, bad, readJson, clean, clientIp } from "../../../lib/api";
import { rateLimit } from "../../../lib/rate-limit";
import { verifyTotp } from "../../../lib/totp";

export async function POST(req: Request) {
  const ip = clientIp(req);
  const data = await readJson<{ email?: string; password?: string }>(req);
  const email = clean(data.email, 160).toLowerCase();
  const password = String(data.password ?? "");

  // Anti fuerza-bruta: 8 intentos por IP+correo cada 5 minutos.
  const rl = rateLimit(`login:${ip}:${email}`, 8, 5 * 60 * 1000);
  if (!rl.ok) return bad(`Demasiados intentos. Intenta de nuevo en ${rl.retryAfter}s.`, 429);

  if (!email || !password) return bad("Correo o contraseña incorrectos", 401);
  const user = await db.user.findUnique({ where: { email } });
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return bad("Correo o contraseña incorrectos", 401);
  }
  // [F5-fix] Un suspendido NO recibe cookie: antes el login emitía sesión y era getSessionUser
  // (auth.ts P0-7) quien lo cortaba en el request siguiente — funcionalmente seguro, pero
  // confuso (el usuario "entraba" y todo fallaba en silencio) y regalaba una cookie inútil.
  // Se rechaza aquí explícito, DESPUÉS de verificar la contraseña (no filtra si la cuenta existe).
  if (user.suspended) return bad("Cuenta suspendida. Contacta al equipo de OTR.", 403);
  // [R5] 2FA TOTP: si la cuenta la tiene activa (típicamente ADMIN), el código es OBLIGATORIO
  // y se pide DESPUÉS de validar la contraseña (no filtra si la cuenta tiene 2FA a quien no
  // conoce la contraseña). Sin código → el cliente muestra el segundo campo (code totpRequired).
  if (user.totpSecret) {
    const totp = clean((data as { totp?: string }).totp, 12);
    if (!totp) return bad("Código de verificación requerido", 401);
    if (!verifyTotp(user.totpSecret, totp)) return bad("Código de verificación incorrecto", 401);
  }
  await setSession(user);
  return ok();
}
