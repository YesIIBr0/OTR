import { db } from "../../../lib/db";
import { ok, bad, readJson, clean, clientIp } from "../../../lib/api";
import { hashPassword } from "../../../lib/auth-crypto";
import { hashToken } from "../../../lib/mail";
import { rateLimit } from "../../../lib/rate-limit";
import { passwordPolicyError } from "../../../lib/password-policy";

// POST /api/auth/reset — { token, password }. Valida el token (no usado, no expirado),
// la contraseña (política R2: ≥8 + no-común), actualiza el hash y marca el token usado.
export async function POST(req: Request) {
  // [F1.4] Anti fuerza-bruta de tokens de reset: 5 intentos por IP cada 10 min (igual que /auth/forgot).
  const ip = clientIp(req);
  const rl = rateLimit(`reset:${ip}`, 5, 10 * 60 * 1000);
  if (!rl.ok) return bad(`Demasiadas solicitudes. Intenta en ${rl.retryAfter}s.`, 429);

  const body = await readJson<{ token?: string; password?: string }>(req);
  const token = clean(body.token, 200);
  const password = String(body.password ?? "");

  if (!token) return bad("Token inválido", 400);
  // [R2] Mínimo 8 + bloqueo de comunes (antes: 6 y sin lista) — ver lib/password-policy.
  const pwErr = passwordPolicyError(password);
  if (pwErr) return bad(pwErr, 400);

  const record = await db.passwordReset.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!record || record.usedAt || record.expiresAt.getTime() < Date.now()) {
    return bad("El enlace de recuperación es inválido o ha expirado", 400);
  }

  await db.$transaction([
    db.user.update({ where: { id: record.userId }, data: { passwordHash: hashPassword(password) } }),
    db.passwordReset.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
  ]);

  return ok();
}
