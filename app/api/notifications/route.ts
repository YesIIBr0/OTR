// OTR LMS · Notificaciones — marca como leídas todas las del usuario.
import { db } from "../../lib/db";
import { getSessionUser } from "../../lib/auth";
import { ok, bad } from "../../lib/api";

export async function PATCH() {
  const user = await getSessionUser();
  if (!user) return bad("No autenticado", 401);

  // Las notificaciones mostradas a un usuario son las suyas (userId) y las
  // globales (userId = null); marcamos ambas como leídas.
  await db.notification.updateMany({
    where: { OR: [{ userId: user.id }, { userId: null }] },
    data: { unread: false },
  });

  return ok();
}
