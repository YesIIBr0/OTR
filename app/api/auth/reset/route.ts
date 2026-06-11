import { db } from "../../../lib/db";
import { ok, bad, readJson, clean } from "../../../lib/api";
import { hashPassword } from "../../../lib/auth-crypto";
import { hashToken } from "../../../lib/mail";

// POST /api/auth/reset — { token, password }. Valida el token (no usado, no expirado),
// la contraseña (≥6), actualiza el hash del usuario y marca el token como usado.
export async function POST(req: Request) {
  const body = await readJson<{ token?: string; password?: string }>(req);
  const token = clean(body.token, 200);
  const password = String(body.password ?? "");

  if (!token) return bad("Token inválido", 400);
  if (password.length < 6) return bad("La contraseña debe tener al menos 6 caracteres", 400);

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
