import { NextResponse } from "next/server";
import { clearSession, getSessionUser, revokeAllSessions } from "../../../lib/auth";
import { readJson } from "../../../lib/api";

// POST /api/auth/logout — cierra la sesión de ESTE dispositivo (borra la cookie).
//
// [GOAL G4] body { all: true } → además REVOCA todas las sesiones vivas de la cuenta
// (incrementa User.sessionEpoch): la del móvil, la del navegador del cíber, y la de
// cualquiera que hubiera robado la cookie. Antes esto era imposible — un token robado
// valía 30 días aunque el dueño "cerrara sesión".
export async function POST(req: Request) {
  const body = await readJson<{ all?: boolean }>(req).catch(() => ({ all: false }));
  if (body?.all === true) {
    // Solo puede revocar quien tiene una sesión válida (no hace falta más: revoca LAS SUYAS).
    const user = await getSessionUser();
    if (user) await revokeAllSessions(user.id);
  }
  await clearSession();
  return NextResponse.json({ ok: true, revokedAll: body?.all === true });
}
