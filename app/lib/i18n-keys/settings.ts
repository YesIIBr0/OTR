/* OTR Aula · i18n keys — pantalla Ajustes (scr-settings.ts, prefijo "settings").
   Módulo de datos puro: { es, en }. Cada llave debe existir en AMBOS idiomas.
   es = texto original exacto; en = traducción natural (tono de producto). */
export const dict = {
  es: {
    // page head
    "settings.title": "Ajustes",
    "settings.subtitle": "Tu cuenta, idioma, notificaciones, membresía y privacidad",

    // card titles
    "settings.cardAccount": "Cuenta",
    "settings.cardLanguage": "Idioma",
    "settings.cardNotifications": "Notificaciones",
    "settings.cardMembership": "Membresía y facturación",
    "settings.cardPrivacy": "Privacidad y seguridad",

    // account
    "settings.editProfile": "Editar perfil",

    // role labels
    "settings.roleAdmin": "Administrador",
    "settings.roleCoach": "Coach",
    "settings.roleFamily": "Familia",
    "settings.roleStudent": "Estudiante",

    // language
    "settings.languageTitle": "Idioma de la plataforma",
    "settings.languageDesc": "Cambia toda la interfaz al instante.",

    // notifications (NOTIF rows)
    "settings.notifSessionLabel": "Recordatorios de sesiones",
    "settings.notifSessionDesc": "Avisos antes de cada sesión reservada.",
    "settings.notifWeeklyLabel": "Resumen semanal",
    "settings.notifWeeklyDesc": "Resumen semanal: avance, racha y próximos pasos.",
    "settings.notifDebateLabel": "Resultados de debate",
    "settings.notifDebateDesc": "Cuando tu rating se mueve o asciendes de tier.",
    "settings.notifMarketplaceLabel": "Novedades del marketplace",
    "settings.notifMarketplaceDesc": "Nuevos coaches y programas en el catálogo.",
    "settings.toggleAria": "Activar/desactivar",

    // membership
    "settings.planTitle": "Tu plan",
    "settings.planDesc": "Revisa tu plan, beneficios y recibos.",
    "settings.manageMembership": "Gestionar membresía",

    // leaderboard
    "settings.leaderboardAria": "Aparecer en la clasificación pública",
    "settings.leaderboardTitle": "Aparecer en la clasificación",
    "settings.leaderboardMinorDesc": "Los menores nunca aparecen en el ranking público (protección de privacidad).",
    "settings.leaderboardDesc": "Muestra tu nombre y rating en el ranking público de debate.",
    "settings.notAvailable": "No disponible",
    "settings.leaderboardVisible": "Apareces en la clasificación pública",
    "settings.leaderboardHidden": "Oculto en la clasificación pública",

    // privacy
    "settings.childPrivacyTitle": "Consentimiento y privacidad del hijo/a",
    "settings.childPrivacyDesc": "Aprobaciones de reserva, visibilidad de sesiones y perfil público del menor.",
    "settings.manage": "Gestionar",
    "settings.publicProfileTitle": "Perfil público",
    "settings.publicProfileDesc": "Controla si tu trayectoria es compartible (apagado por defecto para menores).",
    "settings.myJourney": "Mi trayectoria",
    "settings.passwordTitle": "Contraseña",
    "settings.passwordDesc": "Cámbiala con tu contraseña actual — sin salir de tu cuenta.",
    "settings.changePassword": "Cambiar contraseña",

    // logout
    "settings.logoutTitle": "Cerrar sesión",
    "settings.logoutDesc": "Saldrás de tu cuenta en este dispositivo.",
    "settings.logout": "Cerrar sesión",

    // toasts / save state
    "settings.notifEnabled": "Notificación activada",
    "settings.notifDisabled": "Notificación desactivada",
    "settings.saveFailed": "No se pudo guardar el cambio",

    // change-password modal
    "settings.notAvailableHere": "No disponible aquí",
    "settings.currentPassword": "Contraseña actual",
    "settings.newPassword": "Nueva contraseña (mín. 6)",
    "settings.confirmPassword": "Confirmar nueva contraseña",
    "settings.passwordTooShort": "La nueva contraseña debe tener al menos 8 caracteres",
    "settings.logoutAllTitle": "Cerrar sesión en todos los dispositivos",
    "settings.logoutAllDesc": "Invalida al instante cualquier sesión abierta de tu cuenta — incluida la de alguien que te haya robado el acceso.",
    "settings.logoutAll": "Cerrar todas",
    "settings.logoutAllArm": "¿Seguro? Toca otra vez",
    "settings.logoutAllFailed": "No se pudo cerrar las sesiones",
    "settings.totpTitle": "Verificación en dos pasos (2FA)",
    "settings.totpOffDesc": "Protege esta cuenta admin con un código de tu app autenticadora además de la contraseña.",
    "settings.totpOnDesc": "Activa. Para desactivarla, escribe un código vigente de tu app.",
    "settings.totpSetupHelp": "Añade esta clave en tu app autenticadora (Google Authenticator, Authy, 1Password) y confirma con el código de 6 dígitos que te muestre.",
    "settings.totpSecretLabel": "Clave secreta (entrada manual)",
    "settings.totpEnable": "Activar 2FA",
    "settings.totpDisable": "Desactivar",
    "settings.totpConfirm": "Confirmar código",
    "settings.totpCancel": "Cancelar",
    "settings.totpOn": "Activa",
    "settings.totpEnabled": "Verificación en dos pasos activada",
    "settings.totpDisabled": "Verificación en dos pasos desactivada",
    "settings.totpFailed": "No se pudo completar la operación de 2FA",
    "settings.passwordMismatch": "Las contraseñas no coinciden",
    "settings.passwordUpdated": "Contraseña actualizada",

    // [BUG vínculo-padre §11.3] Solicitudes de tutela pendientes (STUDENT): un padre/madre
    // reclamó un vínculo sobre esta cuenta y espera tu confirmación — el lado del alumno que
    // faltaba (antes el vínculo quedaba PENDING para siempre sin que nadie lo viera aquí).
    "settings.guardianRequestsTitle": "Solicitudes de tutor/a pendientes",
    "settings.guardianRequestsBody": "Alguien pidió vincularse como tu tutor/a. Confirma solo si reconoces a la persona — así ve tu progreso y aprueba tus reservas.",
    "settings.guardianRequestLine": "{name} solicitó vincularse como tu tutor/a",
    "settings.guardianFallback": "Un adulto",
    "settings.guardianConfirm": "Confirmar",
    "settings.guardianReject": "Rechazar",
    "settings.guardianRejectArm": "¿Seguro? Toca de nuevo",
    "settings.guardianConfirming": "Confirmando…",
    "settings.guardianRejecting": "Rechazando…",
    "settings.guardianConfirmed": "Vínculo confirmado",
    "settings.guardianRejected": "Solicitud rechazada",
    "settings.guardianActionFailed": "No se pudo procesar la solicitud",
  },
  en: {
    // page head
    "settings.title": "Settings",
    "settings.subtitle": "Your account, language, notifications, membership and privacy",

    // card titles
    "settings.cardAccount": "Account",
    "settings.cardLanguage": "Language",
    "settings.cardNotifications": "Notifications",
    "settings.cardMembership": "Membership & billing",
    "settings.cardPrivacy": "Privacy & security",

    // account
    "settings.editProfile": "Edit profile",

    // role labels
    "settings.roleAdmin": "Administrator",
    "settings.roleCoach": "Coach",
    "settings.roleFamily": "Family",
    "settings.roleStudent": "Student",

    // language
    "settings.languageTitle": "Platform language",
    "settings.languageDesc": "Switches the entire interface instantly.",

    // notifications (NOTIF rows)
    "settings.notifSessionLabel": "Session reminders",
    "settings.notifSessionDesc": "Alerts before each booked session.",
    "settings.notifWeeklyLabel": "Weekly digest",
    "settings.notifWeeklyDesc": "Weekly summary: progress, streak and next steps.",
    "settings.notifDebateLabel": "Debate results",
    "settings.notifDebateDesc": "When your rating moves or you move up a tier.",
    "settings.notifMarketplaceLabel": "Marketplace updates",
    "settings.notifMarketplaceDesc": "New coaches and programs in the catalog.",
    "settings.toggleAria": "Turn on/off",

    // membership
    "settings.planTitle": "Your plan",
    "settings.planDesc": "Review your plan, benefits and receipts.",
    "settings.manageMembership": "Manage membership",

    // leaderboard
    "settings.leaderboardAria": "Appear on the public leaderboard",
    "settings.leaderboardTitle": "Appear on the leaderboard",
    "settings.leaderboardMinorDesc": "Minors never appear on the public ranking (privacy protection).",
    "settings.leaderboardDesc": "Shows your name and rating on the public debate ranking.",
    "settings.notAvailable": "Not available",
    "settings.leaderboardVisible": "You now appear on the public leaderboard",
    "settings.leaderboardHidden": "Hidden from the public leaderboard",

    // privacy
    "settings.childPrivacyTitle": "Child consent and privacy",
    "settings.childPrivacyDesc": "Booking approvals, session visibility and the minor's public profile.",
    "settings.manage": "Manage",
    "settings.publicProfileTitle": "Public profile",
    "settings.publicProfileDesc": "Control whether your journey is shareable (off by default for minors).",
    "settings.myJourney": "My journey",
    "settings.passwordTitle": "Password",
    "settings.passwordDesc": "Change it with your current password — without signing out.",
    "settings.changePassword": "Change password",

    // logout
    "settings.logoutTitle": "Sign out",
    "settings.logoutDesc": "You'll be signed out of your account on this device.",
    "settings.logout": "Sign out",

    // toasts / save state
    "settings.notifEnabled": "Notification turned on",
    "settings.notifDisabled": "Notification turned off",
    "settings.saveFailed": "Couldn't save the change",

    // change-password modal
    "settings.notAvailableHere": "Not available here",
    "settings.currentPassword": "Current password",
    "settings.newPassword": "New password (min. 6)",
    "settings.confirmPassword": "Confirm new password",
    "settings.passwordTooShort": "The new password must be at least 8 characters",
    "settings.logoutAllTitle": "Sign out on all devices",
    "settings.logoutAllDesc": "Instantly invalidates every open session on your account — including anyone who stole your access.",
    "settings.logoutAll": "Sign out everywhere",
    "settings.logoutAllArm": "Sure? Tap again",
    "settings.logoutAllFailed": "Could not sign out the sessions",
    "settings.totpTitle": "Two-step verification (2FA)",
    "settings.totpOffDesc": "Protect this admin account with a code from your authenticator app on top of your password.",
    "settings.totpOnDesc": "Enabled. To turn it off, enter a current code from your app.",
    "settings.totpSetupHelp": "Add this key to your authenticator app (Google Authenticator, Authy, 1Password) and confirm with the 6-digit code it shows.",
    "settings.totpSecretLabel": "Secret key (manual entry)",
    "settings.totpEnable": "Enable 2FA",
    "settings.totpDisable": "Disable",
    "settings.totpConfirm": "Confirm code",
    "settings.totpCancel": "Cancel",
    "settings.totpOn": "Enabled",
    "settings.totpEnabled": "Two-step verification enabled",
    "settings.totpDisabled": "Two-step verification disabled",
    "settings.totpFailed": "Could not complete the 2FA operation",
    "settings.passwordMismatch": "Passwords don't match",
    "settings.passwordUpdated": "Password updated",

    // pending guardian requests (STUDENT)
    "settings.guardianRequestsTitle": "Pending guardian requests",
    "settings.guardianRequestsBody": "Someone asked to link as your guardian. Confirm only if you recognize them — they'll see your progress and approve your bookings.",
    "settings.guardianRequestLine": "{name} asked to link as your guardian",
    "settings.guardianFallback": "An adult",
    "settings.guardianConfirm": "Confirm",
    "settings.guardianReject": "Reject",
    "settings.guardianRejectArm": "Sure? Tap again",
    "settings.guardianConfirming": "Confirming…",
    "settings.guardianRejecting": "Rejecting…",
    "settings.guardianConfirmed": "Link confirmed",
    "settings.guardianRejected": "Request rejected",
    "settings.guardianActionFailed": "Couldn't process the request",
  },
};
