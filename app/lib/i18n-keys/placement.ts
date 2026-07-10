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

    // descripciones de las 6 dimensiones (el key de cada dimensión NO se traduce)
    "placement.descConfianza": "Qué tan firme te plantas al hablar frente al público o al juez.",
    "placement.descEstructura": "Tu capacidad de ordenar ideas: claim, warrant e impacto claros.",
    "placement.descEvidencia": "Cómo respaldas tus argumentos con datos, ejemplos y fuentes.",
    "placement.descRefutacion": "Tu habilidad para responder y desmontar los argumentos del rival.",
    "placement.descCrossEx": "Cómo preguntas con intención y respondes sin ceder terreno en el cruzado.",
    "placement.descDelivery": "Voz, ritmo y presencia: cómo llega tu discurso a la sala.",

    // sliders (aria-labels)
    "placement.sliderAria": "{skill} — del 0 al 100",
    "placement.sliderAriaSet": "{skill} — del 0 al 100, ubicado en {value}",

    // progreso + pie
    "placement.placed": "Has ubicado {count} de {total} habilidades",
    "placement.moveBars": "Mueve cada barra para continuar",
    "placement.progressAria": "Progreso del placement",
    "placement.coachNote": "Podrás afinar todo esto más adelante con tu coach.",
    "placement.submit": "Fijar mi punto de partida",
    "placement.skip": "Saltar por ahora",

    // estados del envío (toasts / botón)
    "placement.missing": "Aún te faltan {n} habilidades por ubicar",
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

    // descriptions of the 6 dimensions (each dimension key is NOT translated)
    "placement.descConfianza": "How firmly you hold your ground speaking in front of an audience or judge.",
    "placement.descEstructura": "Your ability to order ideas: clear claim, warrant and impact.",
    "placement.descEvidencia": "How you back your arguments with data, examples and sources.",
    "placement.descRefutacion": "Your skill at responding to and dismantling your opponent's arguments.",
    "placement.descCrossEx": "How you ask with intent and answer without giving ground in cross-examination.",
    "placement.descDelivery": "Voice, pace and presence: how your speech lands in the room.",

    // sliders (aria-labels)
    "placement.sliderAria": "{skill} — from 0 to 100",
    "placement.sliderAriaSet": "{skill} — from 0 to 100, set to {value}",

    // progress + footer
    "placement.placed": "You've placed {count} of {total} skills",
    "placement.moveBars": "Move each bar to continue",
    "placement.progressAria": "Placement progress",
    "placement.coachNote": "You'll be able to fine-tune all of this later with your coach.",
    "placement.submit": "Set my starting point",
    "placement.skip": "Skip for now",

    // submission states (toasts / button)
    "placement.missing": "You still have {n} skills left to place",
    "placement.saving": "Saving…",
    "placement.savedOk": "Done — this is your starting point",
    "placement.saveError": "We couldn't save your assessment",
  },
};
