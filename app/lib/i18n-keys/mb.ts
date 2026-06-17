/* OTR Aula · i18n keys — scr-mybookings.ts (prefix "mb")
   Diccionario por-pantalla para "Mis reservas". Default-safe: solo datos.
   es = texto original exacto reemplazado en la pantalla; en = traducción
   profesional natural. Consumido por el helper t() de ./i18n. */
export const dict = {
  es: {
    // status badges
    "mb.statusConfirmed": "Confirmada",
    "mb.statusPending": "Esperando consentimiento",
    "mb.statusCompleted": "Completada",
    "mb.statusCancelled": "Cancelada",
    "mb.statusDisputed": "En disputa",

    // escrow badges
    "mb.escrowHeld": "Pago en escrow",
    "mb.escrowReleased": "Pago liberado",
    "mb.escrowRefunded": "Reembolsado",

    // filas (rows)
    "mb.joinSession": "Unirse a la sesión",
    "mb.tutorMustApprove": "Un tutor debe aprobar",
    "mb.coachingSession": "Sesión de coaching",
    "mb.cancel": "Cancelar",
    "mb.recording": "Grabación",
    "mb.leaveReview": "Dejar reseña",

    // page head
    "mb.eyebrow": "Marketplace",
    "mb.title": "Mis reservas",
    "mb.subtitle": "Tus sesiones de coaching reservadas",

    // empty state (sin reservas)
    "mb.emptyHeading": "Tu primera sesión 1:1 te espera",
    "mb.emptyBody": "Elige a tu coach en el marketplace y reserva. Tu pago queda protegido en escrow y se libera solo al completar la sesión.",
    "mb.emptyCta": "Encontrar mi coach",

    // sección Próximas
    "mb.upcomingTitle": "Próximas",
    "mb.videoRoomNote": "La sala de video se abre dentro de OTR.",
    "mb.upcomingEmptyPre": "No tienes sesiones próximas —",
    "mb.upcomingEmptyLink": "explora coaches",
    "mb.upcomingEmptyPost": "para reservar una.",

    // sección Historial
    "mb.historyTitle": "Historial",
    "mb.historyEmpty": "Tu historial se escribe sesión a sesión — cada una quedará registrada aquí.",

    // cancelar (mount)
    "mb.cancelArm": "¿Cancelar? Tocar de nuevo",
    "mb.cancelling": "Cancelando…",
    "mb.cancelled": "Reserva cancelada — tu pago se reembolsa",
    "mb.cancelError": "No se pudo cancelar la reserva",

    // modal de reseña (mount)
    "mb.reviewRatingLabel": "Tu valoración",
    "mb.reviewRating5": "★★★★★ Excelente",
    "mb.reviewRating4": "★★★★ Muy bueno",
    "mb.reviewRating3": "★★★ Bueno",
    "mb.reviewRating2": "★★ Regular",
    "mb.reviewRating1": "★ Malo",
    "mb.reviewBodyLabel": "Tu comentario (opcional)",
    "mb.reviewBodyPh": "¿Qué tal fue tu sesión de coaching?",
    "mb.reviewThanks": "¡Gracias por tu reseña!",
  },
  en: {
    // status badges
    "mb.statusConfirmed": "Confirmed",
    "mb.statusPending": "Awaiting consent",
    "mb.statusCompleted": "Completed",
    "mb.statusCancelled": "Cancelled",
    "mb.statusDisputed": "In dispute",

    // escrow badges
    "mb.escrowHeld": "Payment in escrow",
    "mb.escrowReleased": "Payment released",
    "mb.escrowRefunded": "Refunded",

    // rows
    "mb.joinSession": "Join session",
    "mb.tutorMustApprove": "A guardian must approve",
    "mb.coachingSession": "Coaching session",
    "mb.cancel": "Cancel",
    "mb.recording": "Recording",
    "mb.leaveReview": "Leave a review",

    // page head
    "mb.eyebrow": "Marketplace",
    "mb.title": "My bookings",
    "mb.subtitle": "Your booked coaching sessions",

    // empty state (no bookings)
    "mb.emptyHeading": "Your first 1:1 session awaits",
    "mb.emptyBody": "Choose your coach in the marketplace and book. Your payment is protected in escrow and is only released once the session is completed.",
    "mb.emptyCta": "Find my coach",

    // Upcoming section
    "mb.upcomingTitle": "Upcoming",
    "mb.videoRoomNote": "The video room opens inside OTR.",
    "mb.upcomingEmptyPre": "You have no upcoming sessions —",
    "mb.upcomingEmptyLink": "explore coaches",
    "mb.upcomingEmptyPost": "to book one.",

    // History section
    "mb.historyTitle": "History",
    "mb.historyEmpty": "Your history is written session by session — each one will be recorded here.",

    // cancel (mount)
    "mb.cancelArm": "Cancel? Tap again",
    "mb.cancelling": "Cancelling…",
    "mb.cancelled": "Booking cancelled — your payment will be refunded",
    "mb.cancelError": "Could not cancel the booking",

    // review modal (mount)
    "mb.reviewRatingLabel": "Your rating",
    "mb.reviewRating5": "★★★★★ Excellent",
    "mb.reviewRating4": "★★★★ Very good",
    "mb.reviewRating3": "★★★ Good",
    "mb.reviewRating2": "★★ Fair",
    "mb.reviewRating1": "★ Poor",
    "mb.reviewBodyLabel": "Your comment (optional)",
    "mb.reviewBodyPh": "How was your coaching session?",
    "mb.reviewThanks": "Thanks for your review!",
  },
};
