import { NextResponse } from "next/server";
import { db } from "../../lib/db";
import { getSessionUser } from "../../lib/auth";
import { hashPassword, verifyPassword } from "../../lib/auth-crypto";

export async function PATCH(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const { name, currentPassword, newPassword } = await req.json();
  const data: any = {};
  if (name && name.trim()) {
    data.name = name.trim();
    data.initials = name.trim().split(/\s+/).map((p: string) => p[0]).slice(0, 2).join("").toUpperCase();
  }
  if (newPassword) {
    if (!verifyPassword(currentPassword || "", user.passwordHash)) {
      return NextResponse.json({ error: "La contraseña actual es incorrecta" }, { status: 400 });
    }
    data.passwordHash = hashPassword(newPassword);
  }
  if (Object.keys(data).length === 0) return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 });
  await db.user.update({ where: { id: user.id }, data });
  return NextResponse.json({ ok: true });
}
