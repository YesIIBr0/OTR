import { randomBytes } from "crypto";
import { db } from "../../../lib/db";
import { ok, bad, readJson, clean, clientIp } from "../../../lib/api";
import { rateLimit } from "../../../lib/rate-limit";
import { hashToken, sendPasswordReset } from "../../../lib/mail";

// POST /api/auth/forgot — { email }. Rate-limited. SIEMPRE devuelve ok() para no
// filtrar si el correo existe. Si el usuario existe: crea un token de un solo uso
// (hasheado en DB) y envía el enlace de recuperación por correo.
export async function POST(req: Request) {
  const ip = clientIp(req);
  const rl = rateLimit(`forgot:${ip}`, 5, 10 * 60 * 1000);
  if (!rl.ok) return bad(`Demasiadas solicitudes. Intenta en ${rl.retryAfter}s.`, 429);

  const body = await readJson<{ email?: string }>(req);
  const email = clean(body.email, 160).toLowerCase();

  // Buscamos el usuario, pero respondemos ok() pase lo que pase (anti-enumeración).
  const user = email ? await db.user.findUnique({ where: { email } }) : null;
  if (user) {
    const rawToken = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // +1h
    await db.passwordReset.create({
      data: { userId: user.id, tokenHash: hashToken(rawToken), expiresAt },
    });
    // Preferimos APP_URL (configurado, de confianza) sobre el header Origin
    // (spoofeable → host/origin header injection en el enlace de reset). H8/m5.
    const origin = process.env.APP_URL || req.headers.get("origin") || "";
    const link = `${origin}/aula?reset=${rawToken}`;
    await sendPasswordReset(user.email, link); // nunca lanza
  }

  return ok();
}
