import { db } from "../../../lib/db";
import { setSession } from "../../../lib/auth";
import { verifyPassword } from "../../../lib/auth-crypto";
import { ok, bad, readJson, clean, clientIp } from "../../../lib/api";
import { rateLimit } from "../../../lib/rate-limit";

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
  await setSession(user);
  return ok();
}
