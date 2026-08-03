// Sesión (server-only): lee/escribe la cookie y resuelve el usuario actual.
import { cookies } from "next/headers";
import { db } from "./db";
import { signSession, verifySession, passwordFingerprint } from "./auth-crypto";

const COOKIE = "otr_session";

export async function getSessionUser() {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;
  const session = verifySession(token);
  if (!session) return null;
  const user = await db.user.findUnique({ where: { id: session.userId } });
  if (!user) return null;
  // [P0-7] Suspendido por moderación → sin sesión válida (queda fuera al instante en cada request).
  if (user.suspended) return null;
  // La sesión queda ligada a la contraseña actual: si cambió, deja de ser válida (m4).
  if (passwordFingerprint(user.passwordHash) !== session.fp) return null;
  // [GOAL G4] Revocación server-side: si el usuario cerró sesión en todos los dispositivos
  // (sessionEpoch incrementado), los tokens emitidos antes dejan de valer AL INSTANTE.
  if ((user.sessionEpoch ?? 0) !== session.epoch) return null;
  return user;
}

/** Emite la cookie de sesión. Pasa el objeto user (id + passwordHash + sessionEpoch). */
export async function setSession(user: { id: string; passwordHash?: string | null; sessionEpoch?: number | null }) {
  const store = await cookies();
  store.set(COOKIE, signSession(user.id, passwordFingerprint(user.passwordHash), user.sessionEpoch ?? 0), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // solo HTTPS en producción (m1)
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSession() {
  const store = await cookies();
  store.delete(COOKIE);
}

/**
 * [GOAL G4] Revoca TODAS las sesiones vivas del usuario (este dispositivo y cualquier otro,
 * incluida la de un atacante con la cookie robada) incrementando su sessionEpoch.
 * Devuelve el nuevo epoch para re-emitir la cookie de quien lo pidió, si sigue en su sesión.
 */
export async function revokeAllSessions(userId: string): Promise<number> {
  const updated = await db.user.update({
    where: { id: userId },
    data: { sessionEpoch: { increment: 1 } },
    select: { sessionEpoch: true },
  });
  return updated.sessionEpoch;
}
