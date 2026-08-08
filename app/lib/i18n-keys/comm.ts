/* OTR Aula · i18n keys — scr-community.ts (prefix "comm")
   Diccionario por-pantalla para Comunidad (Foro, Hilo y Mensajes).
   Default-safe: solo datos. es = texto original exacto reemplazado en la
   pantalla; en = traducción profesional natural. Consumido por t() de ./i18n. */
export const dict = {
  es: {
    // foro · cabecera y controles
    "comm.forum.title": "Foro · Public Forum I",
    "comm.forum.sub": "Discusiones del grupo · pregunta, comparte recursos, debate",
    "comm.forum.newThread": "Nueva discusión",
    "comm.forum.searchPh": "Buscar en el foro…",
    "comm.forum.filterAll": "Todos",
    "comm.forum.filterUnanswered": "Sin responder",
    "comm.forum.filterResources": "Recursos",
    "comm.forum.filterMyThreads": "Mis hilos",
    "comm.forum.pinned": "Fijados",
    "comm.forum.recent": "Recientes",
    "comm.forum.byAuthor": "por {author}",
    "comm.forum.replies": "respuestas",
    "comm.forum.views": "vistas",

    // hilo · posts y respuesta
    "comm.thread.coachBadge": "Coach",
    "comm.thread.authorBadge": "Autor",
    "comm.thread.useful": "Útil",
    "comm.thread.markedUseful": "Marcado como útil",
    "comm.thread.reply": "Responder",
    "comm.thread.backToForum": "Volver al foro",
    "comm.thread.yourReply": "Tu respuesta",
    "comm.thread.toolbarList": "• Lista",
    "comm.thread.toolbarLink": "Enlace",
    "comm.thread.replyPh": "Comparte tu punto, evidencia o pregunta…",
    "comm.thread.beRespectful": "Sé respetuoso. Ataca ideas, no personas.",
    "comm.thread.postReply": "Publicar respuesta",
    "comm.thread.replyPosted": "Respuesta publicada",
    "comm.thread.error": "Error",
    "comm.thread.postError": "Error al publicar",

    // mensajes · cabecera, hilo y vacío
    "comm.msg.eyebrow": "Comunidad",
    "comm.msg.title": "Mensajes",
    "comm.msg.sub": "Habla con tus coaches y compañeros",
    "comm.msg.searchPh": "Buscar…",
    // [GOAL K-15/K-16] Nombres accesibles: el placeholder NO es un nombre (desaparece al
    // escribir) y el botón de enviar es solo-icono. Sin esto el lector anuncia "edit text"
    // y "button" a secas.
    "comm.msg.searchAria": "Buscar conversaciones",
    "comm.msg.composeAria": "Escribe un mensaje",
    "comm.msg.sendAria": "Enviar mensaje",
    "comm.msg.online": "En línea",
    "comm.msg.report": "Reportar",
    "comm.msg.today": "Hoy",
    "comm.msg.composePh": "Escribe un mensaje…",
    // [GOAL E5] Estado vacío CON SALIDA. El anterior ("cuando hables… aparecerán aquí") era un
    // callejón sin salida: un padre sin hilos —el caso normal el primer día— llegaba a Mensajes
    // desde el portal y solo veía el buscador, sin UN SOLO botón. La única superficie que ABRE
    // un hilo hoy es "Enviar mensaje" en la ficha del coach (scr-marketplace → POST
    // /api/conversations); reservar NO crea conversación. Así que la copy nombra ese camino y
    // el botón lleva a 'explore', que está en el nav de las 4 caras.
    "comm.msg.emptyHeading": "Sin conversaciones",
    "comm.msg.emptyBody": "Abre la ficha de un coach y pulsa «Enviar mensaje»: el hilo se abrirá aquí.",
    "comm.msg.emptyCta": "Buscar coaches",
    "comm.msg.now": "ahora",

    // mensajes · reportar conversación (modal)
    "comm.msg.reportTitle": "Reportar conversación",
    "comm.msg.reportReasonLabel": "Motivo del reporte",
    "comm.msg.reportReasonPh": "Cuéntanos qué ocurrió.",
    "comm.msg.reportSent": "Reporte enviado, lo revisará nuestro equipo",
  },
  en: {
    // forum · header and controls
    "comm.forum.title": "Forum · Public Forum I",
    "comm.forum.sub": "Group discussions · ask, share resources, debate",
    "comm.forum.newThread": "New discussion",
    "comm.forum.searchPh": "Search the forum…",
    "comm.forum.filterAll": "All",
    "comm.forum.filterUnanswered": "Unanswered",
    "comm.forum.filterResources": "Resources",
    "comm.forum.filterMyThreads": "My threads",
    "comm.forum.pinned": "Pinned",
    "comm.forum.recent": "Recent",
    "comm.forum.byAuthor": "by {author}",
    "comm.forum.replies": "replies",
    "comm.forum.views": "views",

    // thread · posts and reply
    "comm.thread.coachBadge": "Coach",
    "comm.thread.authorBadge": "Author",
    "comm.thread.useful": "Helpful",
    "comm.thread.markedUseful": "Marked as helpful",
    "comm.thread.reply": "Reply",
    "comm.thread.backToForum": "Back to forum",
    "comm.thread.yourReply": "Your reply",
    "comm.thread.toolbarList": "• List",
    "comm.thread.toolbarLink": "Link",
    "comm.thread.replyPh": "Share your point, evidence or question…",
    "comm.thread.beRespectful": "Be respectful. Attack ideas, not people.",
    "comm.thread.postReply": "Post reply",
    "comm.thread.replyPosted": "Reply posted",
    "comm.thread.error": "Error",
    "comm.thread.postError": "Couldn't post",

    // messages · header, thread and empty
    "comm.msg.eyebrow": "Community",
    "comm.msg.title": "Messages",
    "comm.msg.sub": "Talk with your coaches and peers",
    "comm.msg.searchPh": "Search…",
    "comm.msg.searchAria": "Search conversations",
    "comm.msg.composeAria": "Write a message",
    "comm.msg.sendAria": "Send message",
    "comm.msg.online": "Online",
    "comm.msg.report": "Report",
    "comm.msg.today": "Today",
    "comm.msg.composePh": "Type a message…",
    "comm.msg.emptyHeading": "No conversations yet",
    "comm.msg.emptyBody": "Open a coach's profile and hit “Send message” — the thread will start here.",
    "comm.msg.emptyCta": "Find coaches",
    "comm.msg.now": "now",

    // messages · report conversation (modal)
    "comm.msg.reportTitle": "Report conversation",
    "comm.msg.reportReasonLabel": "Reason for the report",
    "comm.msg.reportReasonPh": "Tell us what happened.",
    "comm.msg.reportSent": "Report sent, our team will review it",
  },
};
