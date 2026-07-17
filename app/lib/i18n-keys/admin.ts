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

    // [F2.3] contexto del objetivo — contenido reportado que ve el admin antes de accionar
    "admin.ctxReportedContent": "Contenido reportado",
    "admin.ctxSender": "Emisor",
    "admin.ctxParticipants": "Participantes",
    "admin.ctxLatestMessages": "Últimos mensajes",
    "admin.ctxCoach": "Coach",
    "admin.ctxStudent": "Alumno",
    "admin.ctxSession": "Sesión",
    "admin.ctxStatus": "Estado",
    "admin.bkPending": "Pendiente",
    "admin.bkConfirmed": "Confirmada",
    "admin.bkCompleted": "Completada",
    "admin.bkCancelled": "Cancelada",
    "admin.bkDisputed": "En disputa",

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

    // [F2.2] pestañas de la consola
    "admin.tabReports": "Reportes",
    "admin.tabAudit": "Auditoría",

    // [F2.2] rastro de auditoría — encabezados de la tabla
    "admin.auditColWhen": "Cuándo",
    "admin.auditColWho": "Quién",
    "admin.auditColAction": "Acción",
    "admin.auditColTarget": "Objetivo",
    "admin.auditColDetail": "Detalle",

    // [F2.2] etiquetas de acción (AuditLog.action)
    "admin.actRoleChange": "Cambio de rol",
    "admin.actSuspend": "Suspensión",
    "admin.actUnsuspend": "Reactivación",
    "admin.actCoachVerify": "Coach verificado",
    "admin.actCoachUnverify": "Verificación retirada",
    "admin.actReportResolve": "Reporte resuelto",
    "admin.actCourseDelete": "Curso borrado",

    // [F2.2] etiquetas de tipo de objetivo (AuditLog.targetType)
    "admin.auditTargetUser": "Usuario",
    "admin.auditTargetReport": "Reporte",
    "admin.auditTargetCourse": "Curso",

    // [F2.2] fecha relativa
    "admin.timeNow": "ahora",
    "admin.timeMin": "hace {n} min",
    "admin.timeHour": "hace {n} h",
    "admin.timeDay": "hace {n} d",

    // [F2.2] estados / vacío del rastro
    "admin.auditLoadingHeading": "Cargando el rastro…",
    "admin.auditLoadingBody": "Estamos recuperando el registro de auditoría.",
    "admin.auditEmptyHeading": "Aún no hay acciones registradas",
    "admin.auditEmptyBody": "Cada cambio de rol, verificación, suspensión o borrado quedará registrado aquí.",
    "admin.auditErrLoad": "No se pudo cargar el rastro de auditoría",
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

    // [F2.3] target context — reported content the admin sees before acting
    "admin.ctxReportedContent": "Reported content",
    "admin.ctxSender": "Sender",
    "admin.ctxParticipants": "Participants",
    "admin.ctxLatestMessages": "Latest messages",
    "admin.ctxCoach": "Coach",
    "admin.ctxStudent": "Student",
    "admin.ctxSession": "Session",
    "admin.ctxStatus": "Status",
    "admin.bkPending": "Pending",
    "admin.bkConfirmed": "Confirmed",
    "admin.bkCompleted": "Completed",
    "admin.bkCancelled": "Cancelled",
    "admin.bkDisputed": "In dispute",

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

    // [F2.2] console tabs
    "admin.tabReports": "Reports",
    "admin.tabAudit": "Audit log",

    // [F2.2] audit trail — table headers
    "admin.auditColWhen": "When",
    "admin.auditColWho": "Who",
    "admin.auditColAction": "Action",
    "admin.auditColTarget": "Target",
    "admin.auditColDetail": "Detail",

    // [F2.2] action labels (AuditLog.action)
    "admin.actRoleChange": "Role change",
    "admin.actSuspend": "Suspension",
    "admin.actUnsuspend": "Reactivation",
    "admin.actCoachVerify": "Coach verified",
    "admin.actCoachUnverify": "Verification removed",
    "admin.actReportResolve": "Report resolved",
    "admin.actCourseDelete": "Course deleted",

    // [F2.2] target type labels (AuditLog.targetType)
    "admin.auditTargetUser": "User",
    "admin.auditTargetReport": "Report",
    "admin.auditTargetCourse": "Course",

    // [F2.2] relative date
    "admin.timeNow": "now",
    "admin.timeMin": "{n} min ago",
    "admin.timeHour": "{n}h ago",
    "admin.timeDay": "{n}d ago",

    // [F2.2] audit trail states / empty
    "admin.auditLoadingHeading": "Loading the trail…",
    "admin.auditLoadingBody": "We're fetching the audit log.",
    "admin.auditEmptyHeading": "No actions recorded yet",
    "admin.auditEmptyBody": "Every role change, verification, suspension or deletion will be recorded here.",
    "admin.auditErrLoad": "Couldn't load the audit trail",
  },
};
