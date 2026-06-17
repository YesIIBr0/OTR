/* OTR Aula · i18n keys — scr-coachwork.ts (prefix "cw")
   Diccionario por-pantalla para "Reservas e ingresos" (Coach Workspace).
   Default-safe: solo datos. es = texto original exacto reemplazado en la
   pantalla; en = traducción profesional natural. Consumido por t() de ./i18n. */
export const dict = {
  es: {
    // tabs internas
    "cw.tabAgenda": "Agenda",
    "cw.tabEarnings": "Ingresos",
    "cw.tabAvailability": "Disponibilidad",

    // page head
    "cw.eyebrow": "Espacio de coach",
    "cw.title": "Reservas e ingresos",
    "cw.subtitle": "Reservas, pagos con escrow y disponibilidad — todo dentro de OTR",

    // badges de estado
    "cw.statusConfirmed": "Confirmada",
    "cw.statusPending": "Esperando consentimiento del padre",
    "cw.statusCompleted": "Completada",
    "cw.statusCancelled": "Cancelada",

    // badges de escrow
    "cw.escrowHeld": "En escrow",
    "cw.escrowReleased": "Liberado",
    "cw.escrowRefunded": "Reembolsado",

    // acciones de fila (booking row)
    "cw.joinSession": "Unirse a la sesión",
    "cw.completeSession": "Completar sesión",
    "cw.cancel": "Cancelar",
    "cw.rejectBooking": "Rechazar reserva",
    "cw.viewRecording": "Ver grabación",
    "cw.changeRecording": "Cambiar grabación",
    "cw.attachRecording": "Adjuntar grabación",

    // TAB 1 · agenda — empty state
    "cw.agendaEmptyHeading": "Aún sin reservas",
    "cw.agendaEmptyBody": "Tu perfil del marketplace trabaja por ti: cuando un alumno reserve una sesión, aparecerá aquí.",
    "cw.agendaEmptyCta": "Ver mi perfil en el marketplace",

    // TAB 1 · agenda — KPIs
    "cw.kpiRating": "Rating",
    "cw.kpiTotalBookings": "Reservas totales",
    "cw.kpiCompleted": "Completadas",
    "cw.kpiRepeatStudents": "Alumnos recurrentes",

    // TAB 1 · agenda — secciones
    "cw.upcomingTitle": "Próximas sesiones",
    "cw.upcomingNote": "Completa la sesión para liberar el pago del escrow.",
    "cw.upcomingEmpty": "No tienes sesiones próximas — tu perfil del marketplace sigue trabajando por ti.",
    "cw.historyTitle": "Historial",
    "cw.historyEmpty": "Todavía no completaste ninguna sesión.",

    // TAB 2 · ingresos — tiles
    "cw.earnEscrow": "En escrow",
    "cw.earnEscrowSub": "se libera al completar",
    "cw.earnReleased": "Liberado total",
    "cw.earnReleasedSub": "sesiones ya completadas",
    "cw.earnPayout": "Tu payout",
    "cw.earnThisMonth": "Este mes",
    "cw.earnThisMonthSub": "payout del mes en curso",

    // TAB 2 · ingresos — alerta + tabla
    "cw.transparencyTitle": "Transparencia total",
    "cw.tblStudent": "Alumno",
    "cw.tblSession": "Sesión",
    "cw.tblAmount": "Monto",
    "cw.tblStatus": "Estado",
    "cw.tblEscrow": "Escrow",
    "cw.tblEmpty": "Sin movimientos todavía — completa tu primera sesión para ver tu historial aquí.",

    // TAB 3 · disponibilidad — empty (perfil inactivo)
    "cw.activateHeading": "Activa tu perfil de coach",
    "cw.activateBody": "Publica tu tarifa, especialidades y video de presentación para aparecer en el marketplace y recibir reservas.",
    "cw.activateCta": "Activa tu perfil de coach",

    // TAB 3 · disponibilidad — tu oferta
    "cw.offerTitle": "Tu oferta",
    "cw.offerVisible": "Visible en el marketplace",
    "cw.offerInactive": "Perfil inactivo",
    "cw.hourlyRate": "Tarifa por hora:",
    "cw.perHour": "/hora",
    "cw.offerEditNote": "Edita tarifa, bio y video desde tu perfil de coach.",
    "cw.offerEditCta": "Editar tarifa y paquetes",

    // TAB 3 · disponibilidad — franjas semanales
    "cw.slotsTitle": "Franjas semanales",
    "cw.slotsNote": "Los alumnos solo pueden reservar dentro de estas ventanas (sesiones de 60 min).",
    "cw.removeSlot": "Eliminar franja",
    "cw.slotsEmpty": "Sin franjas publicadas — los alumnos verán el horario estándar OTR. Añade las tuyas para controlar tu agenda.",
    "cw.addSlot": "Añadir franja",
    "cw.dayOfWeek": "Día de la semana",
    "cw.startTime": "Hora de inicio",
    "cw.endTime": "Hora de fin",
    "cw.toSep": "a",
    "cw.add": "Añadir",

    // TAB 3 · disponibilidad — paquetes + alerta
    "cw.packagesTitle": "Tus paquetes",
    "cw.packagesNote": "Solo lectura — se gestionan desde tu perfil de coach.",
    "cw.packagesEmpty": "Sin paquetes publicados — los alumnos verán los paquetes indicativos derivados de tu tarifa.",
    "cw.safeTitle": "Marketplace seguro",
    "cw.safeBody": "Sesiones y pagos siempre dentro de OTR — los fondos quedan en escrow y se liberan al completar cada sesión.",

    // mount — completar sesión
    "cw.completing": "Completando…",
    "cw.completeError": "No se pudo completar la sesión",

    // mount — cancelar / rechazar
    "cw.cancelArm": "¿Seguro? Tocar de nuevo",
    "cw.cancelling": "Cancelando…",
    "cw.cancelled": "Reserva cancelada — fondos reembolsados al alumno",
    "cw.cancelError": "No se pudo cancelar la reserva",

    // mount — grabación (modal)
    "cw.recordingModalTitle": "Enlace de la grabación",
    "cw.recordingFieldLabel": "Enlace de la grabación",
    "cw.recordingSaved": "Grabación guardada",

    // mount — franjas (toasts / botón añadir)
    "cw.slotRemoved": "Franja eliminada",
    "cw.slotRemoveError": "No se pudo eliminar la franja",
    "cw.slotTimeError": "La hora de fin debe ser posterior a la de inicio",
    "cw.adding": "Añadiendo…",
    "cw.slotAdded": "Franja añadida",
    "cw.slotAddError": "No se pudo añadir la franja",
  },
  en: {
    // internal tabs
    "cw.tabAgenda": "Schedule",
    "cw.tabEarnings": "Earnings",
    "cw.tabAvailability": "Availability",

    // page head
    "cw.eyebrow": "Coach Workspace",
    "cw.title": "Bookings & earnings",
    "cw.subtitle": "Bookings, escrow payments and availability — all inside OTR",

    // status badges
    "cw.statusConfirmed": "Confirmed",
    "cw.statusPending": "Awaiting guardian consent",
    "cw.statusCompleted": "Completed",
    "cw.statusCancelled": "Cancelled",

    // escrow badges
    "cw.escrowHeld": "In escrow",
    "cw.escrowReleased": "Released",
    "cw.escrowRefunded": "Refunded",

    // booking row actions
    "cw.joinSession": "Join session",
    "cw.completeSession": "Complete session",
    "cw.cancel": "Cancel",
    "cw.rejectBooking": "Decline booking",
    "cw.viewRecording": "View recording",
    "cw.changeRecording": "Change recording",
    "cw.attachRecording": "Attach recording",

    // TAB 1 · schedule — empty state
    "cw.agendaEmptyHeading": "No bookings yet",
    "cw.agendaEmptyBody": "Your marketplace profile works for you: when a student books a session, it will show up here.",
    "cw.agendaEmptyCta": "View my marketplace profile",

    // TAB 1 · schedule — KPIs
    "cw.kpiRating": "Rating",
    "cw.kpiTotalBookings": "Total bookings",
    "cw.kpiCompleted": "Completed",
    "cw.kpiRepeatStudents": "Repeat students",

    // TAB 1 · schedule — sections
    "cw.upcomingTitle": "Upcoming sessions",
    "cw.upcomingNote": "Complete the session to release the escrow payment.",
    "cw.upcomingEmpty": "You have no upcoming sessions — your marketplace profile keeps working for you.",
    "cw.historyTitle": "History",
    "cw.historyEmpty": "You haven't completed any sessions yet.",

    // TAB 2 · earnings — tiles
    "cw.earnEscrow": "In escrow",
    "cw.earnEscrowSub": "released on completion",
    "cw.earnReleased": "Total released",
    "cw.earnReleasedSub": "sessions already completed",
    "cw.earnPayout": "Your payout",
    "cw.earnThisMonth": "This month",
    "cw.earnThisMonthSub": "payout for the current month",

    // TAB 2 · earnings — alert + table
    "cw.transparencyTitle": "Full transparency",
    "cw.tblStudent": "Student",
    "cw.tblSession": "Session",
    "cw.tblAmount": "Amount",
    "cw.tblStatus": "Status",
    "cw.tblEscrow": "Escrow",
    "cw.tblEmpty": "No activity yet — complete your first session to see your history here.",

    // TAB 3 · availability — empty (inactive profile)
    "cw.activateHeading": "Activate your coach profile",
    "cw.activateBody": "Publish your rate, specialties and intro video to appear in the marketplace and receive bookings.",
    "cw.activateCta": "Activate your coach profile",

    // TAB 3 · availability — your offer
    "cw.offerTitle": "Your offer",
    "cw.offerVisible": "Visible in the marketplace",
    "cw.offerInactive": "Profile inactive",
    "cw.hourlyRate": "Hourly rate:",
    "cw.perHour": "/hour",
    "cw.offerEditNote": "Edit your rate, bio and video from your coach profile.",
    "cw.offerEditCta": "Edit rate and packages",

    // TAB 3 · availability — weekly slots
    "cw.slotsTitle": "Weekly slots",
    "cw.slotsNote": "Students can only book within these windows (60-minute sessions).",
    "cw.removeSlot": "Remove slot",
    "cw.slotsEmpty": "No slots published — students will see the standard OTR schedule. Add your own to control your agenda.",
    "cw.addSlot": "Add a slot",
    "cw.dayOfWeek": "Day of the week",
    "cw.startTime": "Start time",
    "cw.endTime": "End time",
    "cw.toSep": "to",
    "cw.add": "Add",

    // TAB 3 · availability — packages + alert
    "cw.packagesTitle": "Your packages",
    "cw.packagesNote": "Read-only — managed from your coach profile.",
    "cw.packagesEmpty": "No packages published — students will see the indicative packages derived from your rate.",
    "cw.safeTitle": "Secure marketplace",
    "cw.safeBody": "Sessions and payments always stay inside OTR — funds are held in escrow and released when each session is completed.",

    // mount — complete session
    "cw.completing": "Completing…",
    "cw.completeError": "Could not complete the session",

    // mount — cancel / decline
    "cw.cancelArm": "Are you sure? Tap again",
    "cw.cancelling": "Cancelling…",
    "cw.cancelled": "Booking cancelled — funds refunded to the student",
    "cw.cancelError": "Could not cancel the booking",

    // mount — recording (modal)
    "cw.recordingModalTitle": "Recording link",
    "cw.recordingFieldLabel": "Recording link",
    "cw.recordingSaved": "Recording saved",

    // mount — slots (toasts / add button)
    "cw.slotRemoved": "Slot removed",
    "cw.slotRemoveError": "Could not remove the slot",
    "cw.slotTimeError": "The end time must be later than the start time",
    "cw.adding": "Adding…",
    "cw.slotAdded": "Slot added",
    "cw.slotAddError": "Could not add the slot",
  },
};
