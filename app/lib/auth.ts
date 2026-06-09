// Sesión (server-only): lee/escribe la cookie y resuelve el usuario actual.
import { cookies } from "next/headers";
import { db } from "./db";
import { signSession, verifySession } from "./auth-crypto";

const COOKIE = "otr_session";

export async function getSessionUser() {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;
  const userId = verifySession(token);
  if (!userId) return null;
  return db.user.findUnique({ where: { id: userId } });
}

export async function setSession(userId: string) {
  const store = await cookies();
  store.set(COOKIE, signSession(userId), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSession() {
  const store = await cookies();
  store.delete(COOKIE);
}
