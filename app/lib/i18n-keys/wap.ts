/* OTR Aula · i18n keys — scr-admin-whatsapp.ts (prefix "wap" — WhatsApp Panel, evita
   colisión con "mkt"/"mb"/otros prefijos de marketplace ya existentes).
   Diccionario por-pantalla para la bandeja de WhatsApp Business (Admin/Coach). Default-safe:
   solo datos. es = texto original exacto de la pantalla; en = traducción profesional
   natural. Consumido por el helper t() de ./i18n. */
export const dict = {
  es: {
    // page head
    "wap.eyebrow": "Administración",
    "wap.title": "WhatsApp",
    "wap.subtitle": "Bandeja del equipo — mensajes entrantes y respuesta 1 a 1 desde el número de WhatsApp Business",
    "wap.refresh": "Actualizar",
    "wap.refreshing": "Actualizando…",

    // lista de conversaciones
    "wap.loadingTitle": "Cargando conversaciones…",
    "wap.loadingBody": "Un momento.",
    "wap.errLoad": "No se pudieron cargar las conversaciones",
    "wap.listEmptyTitle": "Sin conversaciones todavía",
    "wap.listEmptyBody": "Cuando alguien escriba al número de WhatsApp Business, aparecerá aquí.",
    "wap.unnamedContact": "Sin nombre",

    // panel de conversación
    "wap.noSelectionTitle": "Selecciona una conversación",
    "wap.noSelectionBody": "Elige un contacto de la lista para ver los mensajes.",
    "wap.errLoadThread": "No se pudo cargar la conversación",
    "wap.composePh": "Escribe una respuesta…",
    "wap.send": "Enviar",
    "wap.sending": "Enviando…",
    "wap.sendError": "No se pudo enviar el mensaje",
    "wap.sendOk": "Mensaje enviado",
    "wap.statusFailed": "No entregado",
    "wap.statusQueued": "Enviando…",

    // tiempo relativo
    "wap.timeNow": "ahora",
    "wap.timeMin": "hace {n} min",
    "wap.timeHour": "hace {n} h",
    "wap.timeDay": "hace {n} d",
  },
  en: {
    // page head
    "wap.eyebrow": "Administration",
    "wap.title": "WhatsApp",
    "wap.subtitle": "Team inbox — incoming messages and 1-to-1 replies from the WhatsApp Business number",
    "wap.refresh": "Refresh",
    "wap.refreshing": "Refreshing…",

    // conversation list
    "wap.loadingTitle": "Loading conversations…",
    "wap.loadingBody": "One moment.",
    "wap.errLoad": "Couldn't load the conversations",
    "wap.listEmptyTitle": "No conversations yet",
    "wap.listEmptyBody": "When someone messages the WhatsApp Business number, it will appear here.",
    "wap.unnamedContact": "No name",

    // conversation panel
    "wap.noSelectionTitle": "Select a conversation",
    "wap.noSelectionBody": "Choose a contact from the list to see the messages.",
    "wap.errLoadThread": "Couldn't load the conversation",
    "wap.composePh": "Type a reply…",
    "wap.send": "Send",
    "wap.sending": "Sending…",
    "wap.sendError": "Couldn't send the message",
    "wap.sendOk": "Message sent",
    "wap.statusFailed": "Not delivered",
    "wap.statusQueued": "Sending…",

    // relative time
    "wap.timeNow": "now",
    "wap.timeMin": "{n} min ago",
    "wap.timeHour": "{n} h ago",
    "wap.timeDay": "{n} d ago",
  },
};
