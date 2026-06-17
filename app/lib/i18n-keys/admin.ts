/* OTR Aula · i18n keys — scr-admin.ts (prefix "admin")
   Diccionario por-pantalla para la "Consola de moderación". Default-safe:
   solo datos. es = texto original exacto reemplazado en la pantalla; en =
   traducción profesional natural. Consumido por el helper t() de ./i18n. */
export const dict = {
  es: {
    // page head
    "admin.eyebrow": "Administración",
    "admin.title": "Consola de moderación",
    "admin.subtitle": "Revisa y resuelve los reportes de la comunidad — usuarios, mensajes y reservas",

    // KPIs
    "admin.kpiOpen": "Reportes abiertos",
    "admin.kpiQueue": "En la cola",

    // status badges
    "admin.statusOpen": "Abierto",
    "admin.statusReviewed": "Revisado",
    "admin.statusDismissed": "Descartado",

    // target type labels
    "admin.targetUser": "Usuario",
    "admin.targetMessage": "Mensaje",
    "admin.targetConversation": "Conversación",
    "admin.targetBooking": "Reserva",
    "admin.targetCoach": "Coach",
    "admin.targetFallback": "Objetivo",

    // report card
    "admin.reportedBy": "Reportado por",
    "admin.suspendUser": "Suspender al usuario",
    "admin.markReviewed": "Marcar revisado",
    "admin.dismiss": "Descartar",

    // loading / empty states
    "admin.loadingHeading": "Cargando reportes…",
    "admin.loadingBody": "Estamos recuperando la cola de moderación.",
    "admin.emptyHeading": "Todo en orden — sin reportes pendientes",
    "admin.emptyBody": "Cuando alguien reporte un usuario, mensaje o reserva, aparecerá aquí.",

    // pagination
    "admin.loadMore": "Cargar más",
    "admin.ofConnector": "de",
    "admin.loadingProgress": "Cargando…",

    // in-flight button labels
    "admin.markingProgress": "Marcando…",
    "admin.dismissingProgress": "Descartando…",
    "admin.suspendConfirm": "¿Confirmar suspensión? Tocar de nuevo",
    "admin.suspendingProgress": "Suspendiendo…",

    // toasts
    "admin.toastLoadError": "No se pudo cargar la cola de moderación",
    "admin.toastDismissed": "Reporte descartado",
    "admin.toastReviewed": "Reporte marcado como revisado",
    "admin.toastUpdateError": "No se pudo actualizar el reporte",
    "admin.toastSuspended": "Usuario suspendido · reporte marcado revisado",
    "admin.toastSuspendError": "No se pudo suspender al usuario",
  },
  en: {
    // page head
    "admin.eyebrow": "Administration",
    "admin.title": "Moderation console",
    "admin.subtitle": "Review and resolve community reports — users, messages and bookings",

    // KPIs
    "admin.kpiOpen": "Open reports",
    "admin.kpiQueue": "In the queue",

    // status badges
    "admin.statusOpen": "Open",
    "admin.statusReviewed": "Reviewed",
    "admin.statusDismissed": "Dismissed",

    // target type labels
    "admin.targetUser": "User",
    "admin.targetMessage": "Message",
    "admin.targetConversation": "Conversation",
    "admin.targetBooking": "Booking",
    "admin.targetCoach": "Coach",
    "admin.targetFallback": "Target",

    // report card
    "admin.reportedBy": "Reported by",
    "admin.suspendUser": "Suspend user",
    "admin.markReviewed": "Mark reviewed",
    "admin.dismiss": "Dismiss",

    // loading / empty states
    "admin.loadingHeading": "Loading reports…",
    "admin.loadingBody": "We're fetching the moderation queue.",
    "admin.emptyHeading": "All clear — no pending reports",
    "admin.emptyBody": "When someone reports a user, message or booking, it will appear here.",

    // pagination
    "admin.loadMore": "Load more",
    "admin.ofConnector": "of",
    "admin.loadingProgress": "Loading…",

    // in-flight button labels
    "admin.markingProgress": "Marking…",
    "admin.dismissingProgress": "Dismissing…",
    "admin.suspendConfirm": "Confirm suspension? Tap again",
    "admin.suspendingProgress": "Suspending…",

    // toasts
    "admin.toastLoadError": "Couldn't load the moderation queue",
    "admin.toastDismissed": "Report dismissed",
    "admin.toastReviewed": "Report marked as reviewed",
    "admin.toastUpdateError": "Couldn't update the report",
    "admin.toastSuspended": "User suspended · report marked reviewed",
    "admin.toastSuspendError": "Couldn't suspend the user",
  },
};
