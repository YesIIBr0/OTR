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
  // La sesión queda ligada a la contraseña actual: si cambió, deja de ser válida (m4).
  if (passwordFingerprint(user.passwordHash) !== session.fp) return null;
  return user;
}

/** Emite la cookie de sesión. Pasa el objeto user (necesita id + passwordHash). */
export async function setSession(user: { id: string; passwordHash?: string | null }) {
  const store = await cookies();
  store.set(COOKIE, signSession(user.id, passwordFingerprint(user.passwordHash)), {
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
