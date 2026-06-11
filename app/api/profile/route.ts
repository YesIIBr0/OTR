import { NextResponse } from "next/server";
import { db } from "../../lib/db";
import { getSessionUser, setSession } from "../../lib/auth";
import { hashPassword, verifyPassword } from "../../lib/auth-crypto";
import { clean, safeUrl } from "../../lib/api";

export async function PATCH(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};

  if (body.name && String(body.name).trim()) {
    const nm = String(body.name).trim().slice(0, 80);
    data.name = nm;
    data.initials = nm.split(/\s+/).map((p: string) => p[0]).slice(0, 2).join("").toUpperCase();
  }
  // Campos de perfil del Hub (allowlist + saneo de longitud)
  // safeUrl rechaza javascript:/data: (acepta relativo + http/https/mailto/tel).
  if (body.avatarUrl !== undefined) data.avatarUrl = safeUrl(body.avatarUrl, 400);
  if (body.headline !== undefined) data.headline = clean(body.headline, 80) || null;
  if (body.bio !== undefined) data.bio = clean(body.bio, 600) || null;
  if (body.location !== undefined) data.location = clean(body.location, 80) || null;
  if (body.formats !== undefined) data.formats = clean(body.formats, 160) || null;
  if (body.teachingStyle !== undefined) data.teachingStyle = clean(body.teachingStyle, 600) || null;
  if (body.preferences !== undefined) data.preferences = clean(body.preferences, 1000) || null;

  if (body.newPassword) {
    if (String(body.newPassword).length < 6) {
      return NextResponse.json({ error: "La nueva contraseña debe tener al menos 6 caracteres" }, { status: 400 });
    }
    if (!verifyPassword(body.currentPassword || "", user.passwordHash)) {
      return NextResponse.json({ error: "La contraseña actual es incorrecta" }, { status: 400 });
    }
    data.passwordHash = hashPassword(String(body.newPassword));
  }

  if (Object.keys(data).length === 0) return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 });
  await db.user.update({ where: { id: user.id }, data });
  // Si cambió la contraseña, reemite la sesión (la huella va ligada al passwordHash;
  // sin esto el propio usuario quedaría deslogueado tras cambiarla).
  if (data.passwordHash) {
    await setSession({ id: user.id, passwordHash: data.passwordHash as string });
  }
  return NextResponse.json({ ok: true });
}
