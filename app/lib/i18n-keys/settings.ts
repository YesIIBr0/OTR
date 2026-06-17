/* OTR Aula · i18n keys — pantalla Ajustes (scr-settings.ts, prefijo "settings").
   Módulo de datos puro: { es, en }. Cada llave debe existir en AMBOS idiomas.
   es = texto original exacto; en = traducción natural (tono de producto). */
export const dict = {
  es: {
    // page head
    "settings.eyebrow": "Cuenta",
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
    "settings.notifWeeklyDesc": "Tu progreso, racha y próximos pasos cada semana.",
    "settings.notifDebateLabel": "Resultados de debate",
    "settings.notifDebateDesc": "Cuando tu rating se mueve o asciendes de tier.",
    "settings.notifMarketplaceLabel": "Novedades del marketplace",
    "settings.notifMarketplaceDesc": "Nuevos coaches y recomendaciones para ti.",
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
    "settings.passwordTooShort": "La nueva contraseña debe tener al menos 6 caracteres",
    "settings.passwordMismatch": "Las contraseñas no coinciden",
    "settings.passwordUpdated": "Contraseña actualizada",
  },
  en: {
    // page head
    "settings.eyebrow": "Account",
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
    "settings.notifWeeklyDesc": "Your progress, streak and next steps every week.",
    "settings.notifDebateLabel": "Debate results",
    "settings.notifDebateDesc": "When your rating moves or you move up a tier.",
    "settings.notifMarketplaceLabel": "Marketplace updates",
    "settings.notifMarketplaceDesc": "New coaches and recommendations for you.",
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
    "settings.passwordTooShort": "The new password must be at least 6 characters",
    "settings.passwordMismatch": "Passwords don't match",
    "settings.passwordUpdated": "Password updated",
  },
};
