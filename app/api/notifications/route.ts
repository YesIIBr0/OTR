// OTR LMS · Notificaciones — feed de la campana + marcar todas como leídas.
import { db } from "../../lib/db";
import { getSessionUser } from "../../lib/auth";
import { ok, bad } from "../../lib/api";
import { esc } from "../../lib/esc";
import { fmtRelativeAgo, langFromRequest } from "../../lib/i18n";

// [NOTIF-BELL] GET — feed incremental para refrescar la campana sin recargar todo el SPA
// (getAppData ya trae las primeras 200 en la carga inicial; esto sirve para un polling
// liviano). Mismas reglas de visibilidad que PATCH: las suyas + las globales (userId null).
// No leídas primero, tope 30. Shape espejo de DB.notifications (ic/tone/t/d/when/unread) para
// que el cliente pueda mezclarlo directo con lo que ya tiene. esc() UNA vez aquí (mismo
// contrato que queries.ts): title/detail se guardan crudos en DB.
export async function GET(req?: Request) {
  const user = await getSessionUser();
  if (!user) return bad("No autenticado", 401);
  // [DEUDA-H] Mismo idioma que /api/app-data (cookie otr_lang): la antigüedad se DERIVA de
  // `whenAt` en vez de servir el texto guardado, que estaba congelado y en español.
  const lang = langFromRequest(req);

  const rows = await db.notification.findMany({
    where: { OR: [{ userId: user.id }, { userId: null }] },
    orderBy: [{ unread: "desc" }, { position: "asc" }],
    take: 30,
  });

  return ok({
    notifications: rows.map((n) => ({
      id: n.id,
      ic: n.icon,
      tone: n.tone,
      t: esc(n.title),
      d: esc(n.detail),
      when: n.whenAt ? fmtRelativeAgo(n.whenAt, lang) : n.whenLabel,
      unread: n.unread,
    })),
  });
}

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
