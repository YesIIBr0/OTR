// OTR · 2FA TOTP — gestión (activar/desactivar) [R5 — Tribunal 3.1]. SOLO ADMIN puede
// gestionarla (la llave de los datos de menores no puede ser solo una contraseña); el
// login (auth/login) la EXIGE a cualquier cuenta con el secreto puesto.
//
// POST { action }:
//  · "setup"   → genera un secreto NUEVO y lo devuelve con su otpauth:// SIN guardarlo.
//                El cliente lo mete en su app autenticadora y confirma con "enable".
//  · "enable"  → { secret, code }: verifica que el usuario POSEE el secreto (código TOTP
//                vigente) y recién entonces lo persiste. Dos fases: un secreto que el
//                usuario nunca cargó en su app lo dejaría fuera de su propia cuenta.
//  · "disable" → { code }: exige un código vigente del secreto ACTUAL (un atacante con la
//                sesión robada pero sin el teléfono no puede apagar la 2FA).
// audit() en enable/disable — cambiar la 2FA de una cuenta admin es acción auditable.
import { db } from "../../../lib/db";
import { getSessionUser } from "../../../lib/auth";
import { ok, bad, readJson, clean } from "../../../lib/api";
import { requireRole } from "../../../lib/authz";
import { generateTotpSecret, verifyTotp, otpauthUrl } from "../../../lib/totp";
import { audit } from "../../../lib/audit";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return bad("No autenticado", 401);
  if (!requireRole(user, "ADMIN")) return bad("Solo administradores", 403);

  const body = await readJson<{ action?: string; secret?: string; code?: string }>(req);
  const action = clean(body.action, 20);

  if (action === "setup") {
    if (user.totpSecret) return bad("La 2FA ya está activa — desactívala antes de generar otro secreto", 400);
    const secret = generateTotpSecret();
    return ok({ secret, otpauth: otpauthUrl(secret, user.email) });
  }

  if (action === "enable") {
    if (user.totpSecret) return bad("La 2FA ya está activa", 400);
    const secret = clean(body.secret, 64).toUpperCase();
    const code = clean(body.code, 12);
    // Solo secretos con forma válida (base32, ≥16 chars = ≥80 bits) — y la prueba de
    // posesión: un código vigente generado por SU app con ese secreto.
    if (!/^[A-Z2-7]{16,}$/.test(secret)) return bad("Secreto inválido", 400);
    if (!verifyTotp(secret, code)) return bad("Código de verificación incorrecto", 401);
    await db.user.update({ where: { id: user.id }, data: { totpSecret: secret } });
    await audit({
      actorId: user.id, actorName: user.name, action: "user.totp_enable", targetType: "user", targetId: user.id,
      detail: "2FA TOTP activada",
    });
    return ok({ enabled: true });
  }

  if (action === "disable") {
    if (!user.totpSecret) return bad("La 2FA no está activa", 400);
    const code = clean(body.code, 12);
    if (!verifyTotp(user.totpSecret, code)) return bad("Código de verificación incorrecto", 401);
    await db.user.update({ where: { id: user.id }, data: { totpSecret: null } });
    await audit({
      actorId: user.id, actorName: user.name, action: "user.totp_disable", targetType: "user", targetId: user.id,
      detail: "2FA TOTP desactivada",
    });
    return ok({ enabled: false });
  }

  return bad("Acción inválida: usa setup, enable o disable", 400);
}
