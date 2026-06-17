/* OTR Aula · i18n keys — scr-parent.ts (prefix "parent")
   Diccionario por-pantalla para el "Portal de familia". Default-safe: solo datos.
   es = texto original exacto reemplazado en la pantalla; en = traducción
   profesional natural. Consumido por el helper t() de ./i18n. */
export const dict = {
  es: {
    // page head
    "parent.eyebrow": "Portal de familia",
    "parent.title": "Pruebas y tranquilidad",
    "parent.subtitle": "El progreso real de tu hijo/a, cada sesión segura y cada peso bajo tu control",

    // loading state
    "parent.loadingTitle": "Cargando tu portal…",
    "parent.loadingBody": "Buscando a tus estudiantes vinculados.",

    // KPIs
    "parent.kpiChildren": "Hijos vinculados",
    "parent.kpiUpcoming": "Próximas sesiones",
    "parent.kpiPendingApprovals": "Aprobaciones pendientes",
    "parent.kpiMonthlySpend": "Gasto del mes",

    // pending approvals card
    "parent.pendingApprovalsTitle": "Aprobaciones pendientes",
    "parent.toReview": "por revisar",
    "parent.pendingApprovalsBody": "Ninguna sesión con coach se confirma sin tu aprobación.",

    // consent row buttons
    "parent.approve": "Aprobar",
    "parent.reject": "Rechazar",

    // pending guardianship links block
    "parent.pendingLinksTitle": "Solicitudes de vínculo pendientes",
    "parent.pendingLinksBody": "Estos estudiantes te declararon como su tutor al registrarse. Confirma el vínculo para ver su progreso y aprobar sus reservas.",
    "parent.protectedMinor": "menor protegido",
    "parent.confirmLink": "Confirmar vínculo",

    // child card
    "parent.minorProtected": "Menor — protegido",
    "parent.awaitingConsent": "Esperando su consentimiento",
    "parent.monthlySpend": "Gasto del mes",
    "parent.skills": "Habilidades",
    "parent.skillsEmpty": "Las evaluaciones del coach aparecerán aquí tras las primeras sesiones.",
    "parent.attendance": "Asistencia",
    "parent.achievements": "Logros y certificaciones",
    "parent.upcomingSessions": "Próximas sesiones",
    "parent.cancel": "Cancelar",
    "parent.upcomingEmpty": "Sin sesiones agendadas — explora coaches con tu hijo/a desde el marketplace.",

    // link form
    "parent.studentEmailLabel": "Correo del estudiante",
    "parent.studentEmailPh": "estudiante@correo.com",
    "parent.linkStudent": "Vincular estudiante",
    "parent.linkFormNote": "Si tu hijo/a es menor, el vínculo se activa de inmediato. Si es adulto, deberá aceptar tu solicitud.",

    // monthly report card
    "parent.monthlyReport": "Reporte mensual",
    "parent.monthlyReportEmpty": "Cuando tu hijo/a tenga sesiones registradas, aquí podrás abrir su resumen del mes — asistencia, habilidades, logros y gasto — listo para imprimir.",
    "parent.monthlyReportBody": "Resumen del mes con asistencia, habilidades, logros y gasto — disponible aquí cuando quieras, listo para imprimir.",
    "parent.childLabel": "Hijo/a",

    // membership & billing card
    "parent.currentPlan": "Plan actual",
    "parent.managePlan": "Gestionar plan",
    "parent.membershipBilling": "Membresía y facturación",
    "parent.approvalThresholdTitle": "Umbral de aprobación por hijo/a",
    "parent.approvalThresholdBody": "Decide cuánto se puede reservar sin pedirte aprobación cada vez. El resto siempre pasa por ti.",

    // approval threshold options
    "parent.threshold_each": "Aprobar cada reserva",
    "parent.threshold_25": "Auto hasta $25",
    "parent.threshold_50": "Auto hasta $50",
    "parent.threshold_full": "Confianza total",
    "parent.thresholdUpdated": "Umbral actualizado",

    // empty state
    "parent.emptyHeading": "Vincula a tu hijo/a para empezar",
    "parent.emptyBody": "Conecta su cuenta de estudiante con su correo y tendrás su progreso real, sus sesiones y cada aprobación en un solo lugar.",
    "parent.whatYoullSee": "Qué verás aquí",
    "parent.see1Title": "Progreso real",
    "parent.see1Body": "Nivel, habilidades y logros, al día.",
    "parent.see2Title": "Asistencia y sesiones",
    "parent.see2Body": "Sesiones asistidas vs agendadas y lo que viene.",
    "parent.see3Title": "Seguridad y consentimiento",
    "parent.see3Body": "Cada reserva con un coach pasa por tu aprobación.",
    "parent.see4Title": "Gasto claro",
    "parent.see4Body": "Cuánto inviertes, con pagos protegidos en escrow.",

    // security & consent card
    "parent.securityConsentTitle": "Seguridad y consentimiento",
    "parent.securityPoint1": "Toda sesión 1:1 ocurre dentro de OTR — nunca por fuera.",
    "parent.securityPoint2": "Las reservas de menores requieren tu aprobación.",
    "parent.securityPoint3": "Los pagos quedan en escrow y se liberan al completar la sesión.",
    "parent.publicProfileTitle": "Perfil público — requiere tu consentimiento",
    "parent.publicProfileBody": "El perfil compartible de tu hijo/a está apagado por defecto. Tú decides si se publica.",
    "parent.unpublish": "Despublicar",
    "parent.enable": "Habilitar",

    // coach messages card
    "parent.coachMessagesTitle": "Mensajes de coaches",
    "parent.coachMessagesBody": "Lo que los coaches ven en tu hijo/a, contado de primera mano — siempre dentro de OTR.",
    "parent.openMessages": "Abrir mensajes",

    // link another student card
    "parent.linkAnother": "Vincular otro estudiante",

    // report modal
    "parent.close": "Cerrar",
    "parent.selectChild": "Selecciona un hijo/a",
    "parent.loadingReport": "Cargando reporte…",
    "parent.errGenerateReport": "No se pudo generar el reporte",
    "parent.errLoadReport": "No se pudo cargar el reporte",

    // approve / reject booking (mount)
    "parent.approving": "Aprobando…",
    "parent.rejecting": "Rechazando…",
    "parent.toastApproved": "Sesión aprobada — quedó confirmada",
    "parent.toastRejected": "Reserva rechazada",
    "parent.errUpdateBooking": "No se pudo actualizar la reserva",

    // cancel session (mount)
    "parent.cancelArm": "¿Cancelar? Tocar de nuevo",
    "parent.cancelling": "Cancelando…",
    "parent.toastSessionCancelled": "Sesión cancelada",
    "parent.errCancelSession": "No se pudo cancelar la sesión",

    // public profile toggle (mount)
    "parent.publishing": "Publicando…",
    "parent.unpublishing": "Quitando…",
    "parent.toastProfileEnabled": "Perfil público habilitado — tú tienes el control",
    "parent.toastProfileDisabled": "Perfil público despublicado",
    "parent.errUpdateProfile": "No se pudo actualizar el perfil público",

    // threshold change (mount)
    "parent.errUpdateThreshold": "No se pudo actualizar el umbral",

    // confirm guardianship link (mount)
    "parent.confirming": "Confirmando…",
    "parent.toastLinkConfirmed": "Vínculo confirmado — ya ves su progreso",
    "parent.toastStudentMustAccept": "El estudiante debe aceptar la solicitud",
    "parent.errConfirmLink": "No se pudo confirmar el vínculo",

    // link student by email (mount)
    "parent.invalidEmail": "Escribe un correo válido",
    "parent.linking": "Vinculando…",
    "parent.toastAlreadyLinked": "Ese estudiante ya estaba vinculado",
    "parent.toastRequestSent": "Solicitud enviada — falta el consentimiento del estudiante",
    "parent.toastStudentLinked": "Estudiante vinculado",
    "parent.errLinkStudent": "No se pudo vincular al estudiante",
  },
  en: {
    // page head
    "parent.eyebrow": "Family Portal",
    "parent.title": "Proof and peace of mind",
    "parent.subtitle": "Your child's real progress, every session secure, and every dollar under your control",

    // loading state
    "parent.loadingTitle": "Loading your portal…",
    "parent.loadingBody": "Looking for your linked students.",

    // KPIs
    "parent.kpiChildren": "Linked children",
    "parent.kpiUpcoming": "Upcoming sessions",
    "parent.kpiPendingApprovals": "Pending approvals",
    "parent.kpiMonthlySpend": "This month's spend",

    // pending approvals card
    "parent.pendingApprovalsTitle": "Pending approvals",
    "parent.toReview": "to review",
    "parent.pendingApprovalsBody": "No coaching session is confirmed without your approval.",

    // consent row buttons
    "parent.approve": "Approve",
    "parent.reject": "Reject",

    // pending guardianship links block
    "parent.pendingLinksTitle": "Pending link requests",
    "parent.pendingLinksBody": "These students named you as their guardian when they signed up. Confirm the link to see their progress and approve their bookings.",
    "parent.protectedMinor": "protected minor",
    "parent.confirmLink": "Confirm link",

    // child card
    "parent.minorProtected": "Minor — protected",
    "parent.awaitingConsent": "Awaiting their consent",
    "parent.monthlySpend": "This month's spend",
    "parent.skills": "Skills",
    "parent.skillsEmpty": "Coach assessments will appear here after the first sessions.",
    "parent.attendance": "Attendance",
    "parent.achievements": "Achievements and certifications",
    "parent.upcomingSessions": "Upcoming sessions",
    "parent.cancel": "Cancel",
    "parent.upcomingEmpty": "No sessions scheduled — explore coaches with your child from the marketplace.",

    // link form
    "parent.studentEmailLabel": "Student email",
    "parent.studentEmailPh": "student@email.com",
    "parent.linkStudent": "Link student",
    "parent.linkFormNote": "If your child is a minor, the link is activated right away. If they're an adult, they'll need to accept your request.",

    // monthly report card
    "parent.monthlyReport": "Monthly report",
    "parent.monthlyReportEmpty": "Once your child has recorded sessions, you'll be able to open their month-in-review here — attendance, skills, achievements and spend — ready to print.",
    "parent.monthlyReportBody": "A month-in-review with attendance, skills, achievements and spend — available here whenever you want, ready to print.",
    "parent.childLabel": "Child",

    // membership & billing card
    "parent.currentPlan": "Current plan",
    "parent.managePlan": "Manage plan",
    "parent.membershipBilling": "Membership and billing",
    "parent.approvalThresholdTitle": "Approval threshold per child",
    "parent.approvalThresholdBody": "Decide how much can be booked without asking your approval each time. Everything else always goes through you.",

    // approval threshold options
    "parent.threshold_each": "Approve every booking",
    "parent.threshold_25": "Auto up to $25",
    "parent.threshold_50": "Auto up to $50",
    "parent.threshold_full": "Full trust",
    "parent.thresholdUpdated": "Threshold updated",

    // empty state
    "parent.emptyHeading": "Link your child to get started",
    "parent.emptyBody": "Connect their student account with their email and you'll have their real progress, their sessions and every approval in one place.",
    "parent.whatYoullSee": "What you'll see here",
    "parent.see1Title": "Real progress",
    "parent.see1Body": "Level, skills and achievements, kept current.",
    "parent.see2Title": "Attendance and sessions",
    "parent.see2Body": "Sessions attended vs. scheduled and what's coming up.",
    "parent.see3Title": "Safety and consent",
    "parent.see3Body": "Every booking with a coach goes through your approval.",
    "parent.see4Title": "Clear spending",
    "parent.see4Body": "How much you invest, with payments protected in escrow.",

    // security & consent card
    "parent.securityConsentTitle": "Safety and consent",
    "parent.securityPoint1": "Every 1:1 session happens inside OTR — never outside it.",
    "parent.securityPoint2": "Bookings for minors require your approval.",
    "parent.securityPoint3": "Payments stay in escrow and are released once the session is completed.",
    "parent.publicProfileTitle": "Public profile — requires your consent",
    "parent.publicProfileBody": "Your child's shareable profile is off by default. You decide whether it's published.",
    "parent.unpublish": "Unpublish",
    "parent.enable": "Enable",

    // coach messages card
    "parent.coachMessagesTitle": "Coach messages",
    "parent.coachMessagesBody": "What coaches see in your child, told firsthand — always inside OTR.",
    "parent.openMessages": "Open messages",

    // link another student card
    "parent.linkAnother": "Link another student",

    // report modal
    "parent.close": "Close",
    "parent.selectChild": "Select a child",
    "parent.loadingReport": "Loading report…",
    "parent.errGenerateReport": "Could not generate the report",
    "parent.errLoadReport": "Could not load the report",

    // approve / reject booking (mount)
    "parent.approving": "Approving…",
    "parent.rejecting": "Rejecting…",
    "parent.toastApproved": "Session approved — it's now confirmed",
    "parent.toastRejected": "Booking rejected",
    "parent.errUpdateBooking": "Could not update the booking",

    // cancel session (mount)
    "parent.cancelArm": "Cancel? Tap again",
    "parent.cancelling": "Cancelling…",
    "parent.toastSessionCancelled": "Session cancelled",
    "parent.errCancelSession": "Could not cancel the session",

    // public profile toggle (mount)
    "parent.publishing": "Publishing…",
    "parent.unpublishing": "Removing…",
    "parent.toastProfileEnabled": "Public profile enabled — you're in control",
    "parent.toastProfileDisabled": "Public profile unpublished",
    "parent.errUpdateProfile": "Could not update the public profile",

    // threshold change (mount)
    "parent.errUpdateThreshold": "Could not update the threshold",

    // confirm guardianship link (mount)
    "parent.confirming": "Confirming…",
    "parent.toastLinkConfirmed": "Link confirmed — you can now see their progress",
    "parent.toastStudentMustAccept": "The student must accept the request",
    "parent.errConfirmLink": "Could not confirm the link",

    // link student by email (mount)
    "parent.invalidEmail": "Enter a valid email",
    "parent.linking": "Linking…",
    "parent.toastAlreadyLinked": "That student was already linked",
    "parent.toastRequestSent": "Request sent — awaiting the student's consent",
    "parent.toastStudentLinked": "Student linked",
    "parent.errLinkStudent": "Could not link the student",
  },
};
