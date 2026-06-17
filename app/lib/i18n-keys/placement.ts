/* OTR Aula · i18n keys — scr-placement.ts (prefix "placement")
   Diccionario por-pantalla para el "Placement de bienvenida". Default-safe:
   solo datos. es = texto original exacto reemplazado en la pantalla; en =
   traducción profesional natural. Consumido por el helper t() de ./i18n. */
export const dict = {
  es: {
    // hero
    "placement.srHeading": "Tu punto de partida",
    "placement.welcome": "Bienvenido a OTR",
    "placement.title": "Ubiquémonos en 3 minutos",
    "placement.intro":
      "No hay respuestas incorrectas — esto fija <b>TU</b> punto de partida. Mueve cada barra hasta donde estás hoy en cada habilidad. Desde ahí, solo queda subir.",
    "placement.badge": "Evaluación inicial · 6 habilidades",

    // progreso + pie
    "placement.moveBars": "Mueve cada barra para continuar",
    "placement.progressAria": "Progreso del placement",
    "placement.coachNote": "Podrás afinar todo esto más adelante con tu coach.",
    "placement.submit": "Fijar mi punto de partida",

    // estados del envío (toasts / botón)
    "placement.saving": "Guardando…",
    "placement.savedOk": "Listo — este es tu punto de partida",
    "placement.saveError": "No se pudo guardar tu evaluación",
  },
  en: {
    // hero
    "placement.srHeading": "Your starting point",
    "placement.welcome": "Welcome to OTR",
    "placement.title": "Let's find your level in 3 minutes",
    "placement.intro":
      "There are no wrong answers — this sets <b>YOUR</b> starting point. Move each bar to where you are today in each skill. From here, the only way is up.",
    "placement.badge": "Initial assessment · 6 skills",

    // progress + footer
    "placement.moveBars": "Move each bar to continue",
    "placement.progressAria": "Placement progress",
    "placement.coachNote": "You'll be able to fine-tune all of this later with your coach.",
    "placement.submit": "Set my starting point",

    // submission states (toasts / button)
    "placement.saving": "Saving…",
    "placement.savedOk": "Done — this is your starting point",
    "placement.saveError": "We couldn't save your assessment",
  },
};
