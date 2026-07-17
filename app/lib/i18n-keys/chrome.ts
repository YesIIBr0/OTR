/* OTR Aula · i18n keys — CHROME (prefijos "err" + "apierr")
   Este diccionario NO es de pantalla: lo consume el shell del Aula (Aula.tsx) para
   pintar toasts de error de red/servidor ANTES de que cargue el chunk de cualquier
   pantalla — y app/lib/api.ts para mapear `code` → mensaje por idioma. Por eso vive
   estático en i18n.ts (registrado en el top-level, viaja en el chunk inicial junto al
   resto del chrome), a diferencia de los diccionarios por-pantalla que cada scr-*.ts
   registra al cargar su propio chunk. Salió de extra.ts (que se quedó solo con "extra.").
   Consumido por el helper t() de ./i18n. */
export const dict = {
  es: {
    // Plantilla de error: causa + acción + reintento (Blueprint §11). El mensaje del
    // servidor (d.error), cuando existe, es la causa más específica y tiene prioridad.
    "err.network": "Sin conexión. Revisa tu internet e inténtalo de nuevo.",
    "err.server": "Algo falló de nuestro lado. Espera un momento y reintenta.",
    "err.notFound": "No encontramos lo que buscabas; quizá se movió o ya no existe.",
    "err.forbidden": "No tienes permiso para esta acción.",
    "err.generic": "No se pudo completar la acción. Inténtalo de nuevo.",
    // [I18N-API] toasts de error del servidor por código estable (app/lib/api.ts)
    "apierr.auth": "No autenticado",
    "apierr.forbidden": "No autorizado",
    "apierr.adminOnly": "Solo administradores",
    "apierr.teacherOnly": "Solo profesores",
    "apierr.coachOnly": "Solo coaches",
    "apierr.coachNotFound": "Coach no encontrado",
    "apierr.studentNotFound": "Estudiante no encontrado",
    "apierr.courseNotFound": "Curso no encontrado",
    "apierr.quizNotFound": "Examen no encontrado",
    "apierr.bookingNotFound": "Reserva no encontrada",
    "apierr.requestNotFound": "Solicitud no encontrada",
    "apierr.alreadyResolved": "Esta solicitud ya fue resuelta",
    "apierr.slotTaken": "Ese horario ya fue reservado",
    "apierr.notEnrolled": "No estás inscrito en este curso",
    "apierr.noStudentLink": "No tienes un vínculo activo con ese estudiante",
    "apierr.courseIncomplete": "Programa no completado",
    "apierr.nothingToUpdate": "Nada que actualizar",
    "apierr.invalidState": "Estado inválido",
    "apierr.requiresPayment": "Este programa requiere pago",
    "apierr.paymentsUnavailable": "Pagos no disponibles temporalmente",
    "apierr.badCredentials": "Correo o contraseña incorrectos",
    "apierr.passwordShort": "La contraseña debe tener al menos 6 caracteres",
    "apierr.underThirteen": "El registro de menores de 13 años requiere el consentimiento verificable de su padre, madre o tutor. Pídele a tu tutor que nos contacte para crear tu cuenta.",
    "err.retry": "Reintentar",
    "err.requiredSuffix": "es obligatorio.",
  },
  en: {
    // Error template: cause + action + retry (Blueprint §11). The server message
    // (d.error), when present, is the most specific cause and takes priority.
    "err.network": "No connection. Check your internet and try again.",
    "err.server": "Something failed on our side. Wait a moment and retry.",
    "err.notFound": "We couldn't find what you were after; it may have moved or no longer exists.",
    "err.forbidden": "You don't have permission for this action.",
    "err.generic": "We couldn't complete the action. Please try again.",
    // [I18N-API] server error toasts by stable code (app/lib/api.ts)
    "apierr.auth": "You're not signed in",
    "apierr.forbidden": "You don't have permission for this",
    "apierr.adminOnly": "Admins only",
    "apierr.teacherOnly": "Teachers only",
    "apierr.coachOnly": "Coaches only",
    "apierr.coachNotFound": "Coach not found",
    "apierr.studentNotFound": "Student not found",
    "apierr.courseNotFound": "Course not found",
    "apierr.quizNotFound": "Quiz not found",
    "apierr.bookingNotFound": "Booking not found",
    "apierr.requestNotFound": "Request not found",
    "apierr.alreadyResolved": "This request was already resolved",
    "apierr.slotTaken": "That time slot was already booked",
    "apierr.notEnrolled": "You're not enrolled in this course",
    "apierr.noStudentLink": "You don't have an active link with that student",
    "apierr.courseIncomplete": "Program not completed yet",
    "apierr.nothingToUpdate": "Nothing to update",
    "apierr.invalidState": "Invalid state",
    "apierr.requiresPayment": "This program requires payment",
    "apierr.paymentsUnavailable": "Payments temporarily unavailable",
    "apierr.badCredentials": "Incorrect email or password",
    "apierr.passwordShort": "Password must be at least 6 characters",
    "apierr.underThirteen": "Signing up under 13 requires verifiable consent from a parent or guardian. Ask them to contact us to create your account.",
    "err.retry": "Retry",
    "err.requiredSuffix": "is required.",
  },
};
