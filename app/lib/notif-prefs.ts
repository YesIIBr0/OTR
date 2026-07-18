// OTR · Lectura server-side de las preferencias de notificación (User.notificationPrefs).
// notificationPrefs es un JSON string (puede ser null): { session_reminders: bool, weekly_digest: bool, ... }
// tal como lo persiste el toggle de Ajustes (scr-settings.ts → PATCH /api/profile).
//
// Espejo EXACTO de la rama server de scr-settings.ts `notifOn()`: una preferencia está ACTIVA salvo
// que el JSON traiga explícitamente la clave en `false`. Clave ausente o JSON corrupto → `def`
// (las prefs nacen por default en true, así que un usuario que nunca tocó Ajustes recibe todo).
export function wantsNotification(notificationPrefs: string | null | undefined, key: string, def = true): boolean {
  try {
    const p = JSON.parse(notificationPrefs || "null");
    if (p && typeof p === "object" && Object.prototype.hasOwnProperty.call(p, key)) {
      return p[key] === true;
    }
  } catch {
    // JSON ilegible → cae al default: no bloqueamos un envío por una preferencia corrupta.
  }
  return def;
}
