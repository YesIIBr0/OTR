/* OTR Aula · i18n keys — scr-marketplace.ts (prefix "mkt")
   Diccionario por-pantalla para el "Marketplace de coaches". Default-safe: solo
   datos. es = texto original exacto reemplazado en la pantalla; en = traducción
   profesional natural. Consumido por el helper t() de ./i18n. */
export const dict = {
  es: {
    // grid: tarjeta de coach
    "mkt.verified": "Verificado",
    "mkt.from": "desde",
    "mkt.perSessionShort": "/sesión",
    "mkt.priceOnRequest": "Precio a consultar",
    "mkt.viewProfile": "Ver perfil",
    "mkt.viewProfileOf": "Ver perfil de",

    // grid: encabezado
    "mkt.eyebrow": "Marketplace",
    "mkt.title": "Coaches",
    "mkt.subtitle": "Entrena 1:1 con los coaches de debate y oratoria de OTR",

    // grid: búsqueda y filtros
    "mkt.searchPlaceholder": "Buscar coach por nombre o especialidad…",
    "mkt.searchAria": "Buscar coaches",
    "mkt.langAll": "Idioma: todos",
    "mkt.langEs": "Español (ES)",
    "mkt.langEn": "Inglés (EN)",
    "mkt.priceAll": "Precio: todos",
    "mkt.priceLow": "Menos de $50",
    "mkt.priceHigh": "Más de $100",
    "mkt.sortTop": "Mejor valorados",
    "mkt.sortReviews": "Más reseñas",
    "mkt.sortPriceAsc": "Precio: menor a mayor",
    "mkt.sortPriceDesc": "Precio: mayor a menor",
    "mkt.clearFilters": "Limpiar filtros",

    // grid: empty-state + alerta segura
    "mkt.emptyHeading": "No hay coaches con esos filtros",
    "mkt.emptyBody": "Prueba con otro idioma, especialidad o rango de precio.",
    "mkt.safeMarketTitle": "Marketplace seguro",
    "mkt.safeMarketBody": "Toda la comunicación y los pagos ocurren dentro de OTR. Los fondos quedan en custodia (escrow) y se liberan al coach solo cuando la sesión se completa.",

    // perfil: hero
    "mkt.introVideoTitle": "Video de presentación",
    "mkt.verifiedCoachEyebrow": "Coach verificado de OTR",
    "mkt.videoComingSoon": "Su video de presentación llega pronto — su historial habla por él.",

    // perfil: candado de consentimiento parental
    "mkt.consentLockTitle": "Candado de consentimiento parental",
    "mkt.consentLockBody": "Eres menor: tu reserva necesita la aprobación de tu tutor antes de confirmarse.",
    "mkt.consentHint": "Si eres menor de edad, tu reserva requerirá la aprobación de tu padre, madre o tutor.",

    // perfil: panel de reserva confirmada/pendiente
    "mkt.bookedPendingTitle": "Reserva enviada — esperando aprobación",
    "mkt.bookedConfirmedTitle": "¡Sesión confirmada!",
    "mkt.bookedPendingBody": "Le avisamos a tu padre, madre o tutor para que apruebe la sesión desde su Portal de familia. Te notificaremos en cuanto quede confirmada.",
    "mkt.bookedConfirmedBody": "Tu pago quedó protegido en custodia (escrow). La sesión ocurre dentro de OTR y los fondos se liberan al coach cuando se completa.",
    "mkt.viewMyBookings": "Ver mis reservas",
    "mkt.sendMessage": "Enviar mensaje",
    "mkt.viewMoreCoaches": "Ver más coaches",

    // perfil: copy-guía por rol (no estudiante)
    "mkt.roleMsgParent": "Pídele a tu hijo/a que reserve desde su cuenta. Aquí tú apruebas la sesión y autorizas el pago — cada reserva pasa por ti.",
    "mkt.roleMsgAdmin": "Vista de administración: las reservas las inician los estudiantes desde su propia cuenta.",
    "mkt.roleMsgCoach": "Los estudiantes pueden reservar sesiones desde este perfil. Como coach, gestiona tu perfil y tu disponibilidad desde tu espacio de coach.",
    "mkt.bookingsLabel": "Reservas",

    // perfil: flujo de reserva
    "mkt.bookSessionTitle": "Reserva tu sesión",
    "mkt.step1ChoosePackage": "1 · Elige tu paquete",
    "mkt.noPackagesNote": "Este coach aún no publicó paquetes — puedes reservar una sesión individual y acordar el precio dentro de OTR.",
    "mkt.step2ChooseDay": "2 · Elige el día",
    "mkt.suggestedScheduleHint": "(horario sugerido 9:00–18:00 — el coach lo confirma al aprobar)",
    "mkt.noDaysAvailable": "Este coach no tiene días disponibles en las próximas dos semanas.",
    "mkt.step3ChooseTime": "3 · Elige la hora",
    "mkt.noSlotsThisDay": "Sin horarios libres este día — prueba con otro.",
    "mkt.summaryPackage": "Paquete",
    "mkt.summaryFirstSession": "Primera sesión",
    "mkt.summaryTotal": "Total (tarifa de servicio incluida)",
    "mkt.escrowNote": "Tu pago queda en custodia (escrow) y se libera al coach al completar la sesión.",
    "mkt.confirmRequestApproval": "Solicitar aprobación y reservar",
    "mkt.confirmBooking": "Confirmar reserva",

    // perfil: navegación + cabecera
    "mkt.backToCoaches": "Volver a coaches",
    "mkt.respondsIn": "Responde en",
    "mkt.perSession": "por sesión",

    // perfil: sobre / credenciales / especialidades
    "mkt.loadingProfile": "Cargando el perfil completo…",
    "mkt.aboutPrefix": "Sobre",
    "mkt.theCoach": "el coach",
    "mkt.noBio": "Este coach todavía no escribió su biografía.",
    "mkt.credentials": "Credenciales",
    "mkt.specialties": "Especialidades",

    // perfil: reseñas
    "mkt.reviewsTitle": "Reseñas",
    "mkt.reviewsEligibility": "Solo quienes completaron una sesión con este coach pueden dejar reseña.",
    "mkt.studentFallback": "Alumno OTR",
    "mkt.reviewVerified": "Verificada",
    "mkt.noReviewsPrefix": "Aún no hay reseñas. Sé el primero en entrenar con",
    "mkt.thisCoach": "este coach",

    // perfil: seguridad + reporte + cancelación
    "mkt.safetyFirstTitle": "Tu seguridad primero",
    "mkt.safetyFirstBody": "Las sesiones se hacen dentro de OTR, los pagos quedan en custodia (escrow) y nunca se comparte contacto fuera de la plataforma.",
    "mkt.reportCoach": "Reportar a este coach",
    "mkt.cancelPolicyTitle": "Política de cancelación",

    // modal de reporte
    "mkt.reportModalTitle": "Reportar a",
    "mkt.reportReasonLabel": "Motivo del reporte",
    "mkt.reportReasonPlaceholder": "Cuéntanos qué ocurrió. Nuestro equipo de confianza y seguridad lo revisará.",
    "mkt.reportSentToast": "Reporte enviado — gracias por cuidar la comunidad",

    // toasts + estados del flujo
    "mkt.convoFailToast": "No se pudo iniciar la conversación",
    "mkt.bookingInProgress": "Reservando…",
    "mkt.singleSessionName": "Sesión individual",
    "mkt.bookingPendingToast": "Reserva enviada — esperando aprobación parental",
    "mkt.bookingConfirmedToast": "¡Sesión confirmada!",
    "mkt.bookingFailToast": "No se pudo crear la reserva",
  },
  en: {
    // grid: coach card
    "mkt.verified": "Verified",
    "mkt.from": "from",
    "mkt.perSessionShort": "/session",
    "mkt.priceOnRequest": "Price on request",
    "mkt.viewProfile": "View profile",
    "mkt.viewProfileOf": "View profile of",

    // grid: header
    "mkt.eyebrow": "Marketplace",
    "mkt.title": "Coaches",
    "mkt.subtitle": "Train 1:1 with OTR's debate and public-speaking coaches",

    // grid: search and filters
    "mkt.searchPlaceholder": "Search coaches by name or specialty…",
    "mkt.searchAria": "Search coaches",
    "mkt.langAll": "Language: all",
    "mkt.langEs": "Spanish (ES)",
    "mkt.langEn": "English (EN)",
    "mkt.priceAll": "Price: all",
    "mkt.priceLow": "Under $50",
    "mkt.priceHigh": "Over $100",
    "mkt.sortTop": "Top rated",
    "mkt.sortReviews": "Most reviews",
    "mkt.sortPriceAsc": "Price: low to high",
    "mkt.sortPriceDesc": "Price: high to low",
    "mkt.clearFilters": "Clear filters",

    // grid: empty state + safety alert
    "mkt.emptyHeading": "No coaches match those filters",
    "mkt.emptyBody": "Try a different language, specialty, or price range.",
    "mkt.safeMarketTitle": "Safe marketplace",
    "mkt.safeMarketBody": "All communication and payments happen inside OTR. Funds are held in escrow and released to the coach only once the session is completed.",

    // profile: hero
    "mkt.introVideoTitle": "Intro video",
    "mkt.verifiedCoachEyebrow": "Verified OTR coach",
    "mkt.videoComingSoon": "Their intro video is coming soon — their track record speaks for itself.",

    // profile: parental consent lock
    "mkt.consentLockTitle": "Parental consent lock",
    "mkt.consentLockBody": "You're a minor: your booking needs your guardian's approval before it's confirmed.",
    "mkt.consentHint": "If you're a minor, your booking will require approval from your parent or guardian.",

    // profile: confirmed/pending booking panel
    "mkt.bookedPendingTitle": "Booking sent — awaiting approval",
    "mkt.bookedConfirmedTitle": "Session confirmed!",
    "mkt.bookedPendingBody": "We've let your parent or guardian know so they can approve the session from their Parent Portal. We'll notify you as soon as it's confirmed.",
    "mkt.bookedConfirmedBody": "Your payment is protected in escrow. The session takes place inside OTR and funds are released to the coach once it's completed.",
    "mkt.viewMyBookings": "View my bookings",
    "mkt.sendMessage": "Send message",
    "mkt.viewMoreCoaches": "View more coaches",

    // profile: role-based guidance (non-student)
    "mkt.roleMsgParent": "Ask your child to book from their own account. Here you approve the session and authorize payment — every booking goes through you.",
    "mkt.roleMsgAdmin": "Admin view: bookings are started by students from their own account.",
    "mkt.roleMsgCoach": "Students can book sessions from this profile. As a coach, manage your profile and availability from your coach workspace.",
    "mkt.bookingsLabel": "Bookings",

    // profile: booking flow
    "mkt.bookSessionTitle": "Book your session",
    "mkt.step1ChoosePackage": "1 · Choose your package",
    "mkt.noPackagesNote": "This coach hasn't published packages yet — you can book a single session and agree on the price inside OTR.",
    "mkt.step2ChooseDay": "2 · Choose the day",
    "mkt.suggestedScheduleHint": "(suggested hours 9:00–18:00 — the coach confirms them on approval)",
    "mkt.noDaysAvailable": "This coach has no available days in the next two weeks.",
    "mkt.step3ChooseTime": "3 · Choose the time",
    "mkt.noSlotsThisDay": "No open times this day — try another.",
    "mkt.summaryPackage": "Package",
    "mkt.summaryFirstSession": "First session",
    "mkt.summaryTotal": "Total (service fee included)",
    "mkt.escrowNote": "Your payment is held in escrow and released to the coach once the session is completed.",
    "mkt.confirmRequestApproval": "Request approval and book",
    "mkt.confirmBooking": "Confirm booking",

    // profile: navigation + header
    "mkt.backToCoaches": "Back to coaches",
    "mkt.respondsIn": "Responds in",
    "mkt.perSession": "per session",

    // profile: about / credentials / specialties
    "mkt.loadingProfile": "Loading the full profile…",
    "mkt.aboutPrefix": "About",
    "mkt.theCoach": "the coach",
    "mkt.noBio": "This coach hasn't written a bio yet.",
    "mkt.credentials": "Credentials",
    "mkt.specialties": "Specialties",

    // profile: reviews
    "mkt.reviewsTitle": "Reviews",
    "mkt.reviewsEligibility": "Only people who completed a session with this coach can leave a review.",
    "mkt.studentFallback": "OTR student",
    "mkt.reviewVerified": "Verified",
    "mkt.noReviewsPrefix": "No reviews yet. Be the first to train with",
    "mkt.thisCoach": "this coach",

    // profile: safety + report + cancellation
    "mkt.safetyFirstTitle": "Your safety first",
    "mkt.safetyFirstBody": "Sessions take place inside OTR, payments are held in escrow, and contact is never shared outside the platform.",
    "mkt.reportCoach": "Report this coach",
    "mkt.cancelPolicyTitle": "Cancellation policy",

    // report modal
    "mkt.reportModalTitle": "Report",
    "mkt.reportReasonLabel": "Reason for the report",
    "mkt.reportReasonPlaceholder": "Tell us what happened. Our trust and safety team will review it.",
    "mkt.reportSentToast": "Report sent — thanks for keeping the community safe",

    // toasts + flow states
    "mkt.convoFailToast": "Couldn't start the conversation",
    "mkt.bookingInProgress": "Booking…",
    "mkt.singleSessionName": "Single session",
    "mkt.bookingPendingToast": "Booking sent — awaiting parental approval",
    "mkt.bookingConfirmedToast": "Session confirmed!",
    "mkt.bookingFailToast": "Couldn't create the booking",
  },
};
