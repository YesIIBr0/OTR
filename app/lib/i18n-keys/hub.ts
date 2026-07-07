/* OTR Aula · i18n keys — scr-hub.ts (prefix "hub")
   Diccionario por-pantalla para el Hub OTR (home, explorar, mi experiencia,
   onboarding). Default-safe: solo datos. es = texto original exacto reemplazado
   en la pantalla; en = traducción profesional natural. Consumido por t() de ./i18n. */
export const dict = {
  es: {
    // fallbacks compartidos (coach/equipo/nombre)
    "hub.coachFallbackTagline": "Coach OTR",
    "hub.programTeamFallback": "Equipo OTR",
    "hub.fallbackName": "campeón",
    "hub.reviewUnitSingular": "reseña",
    "hub.reviewUnitPlural": "reseñas",

    // tarjeta de programa (programCard)
    "hub.programFree": "Gratis",
    "hub.programInRoute": "En tu ruta",
    "hub.programEnroll": "Inscribirme",

    // hub home — bienvenida
    "hub.homeEyebrow": "El hub de la academia",
    "hub.homeWelcome": "Bienvenido al Hub OTR, {name}",
    "hub.homeSubtitle": "Eventos, programas, materiales y tu comunidad — todo en un lugar.",
    "hub.homeExploreBtn": "Explorar programas",
    "hub.homeArsenalBtn": "Arsenal",

    // hub home — feed vacío
    "hub.feedEmptyTitle": "Sin novedades por ahora",
    "hub.feedEmptyBody": "Los anuncios y eventos de la academia aparecerán aquí.",

    // hub home — tu ruta (estudiante)
    "hub.homeYourRoute": "Tu ruta",
    "hub.homeNoPrograms": "Aún no te inscribes a un programa",
    "hub.homeViewJourney": "Ver mi trayectoria",

    // hub home — presencia (profesor)
    "hub.homePresenceTitle": "Tu presencia en el hub",
    "hub.homePresenceBody": "Tu perfil público, tus programas y tus reseñas — lo que ven los estudiantes.",
    "hub.homeViewCoachProfile": "Ver mi perfil de coach",

    // hub home — coaches + red
    "hub.homeAcademyCoaches": "Coaches de la academia",
    "hub.homeViewAllCoaches": "Ver todos",
    "hub.homeLifetimeTitle": "Red OTR de por vida",
    "hub.homeLifetimeBody": "Graduarte de OTR significa acceso de por vida a coaches, competidores, mentores y conexiones internacionales.",

    // explorar
    "hub.exploreTitle": "Explorar",
    "hub.exploreSub": "Coaches y programas de la academia — elige con quién y cómo entrenar",
    "hub.exploreFilterAll": "Todos",
    "hub.exploreCoachesLabel": "Coaches",
    "hub.exploreProgramsLabel": "Programas",
    "hub.exploreViewProfile": "Ver perfil",

    // mi experiencia
    "hub.xpTitle": "Mi experiencia",
    "hub.xpSub": "Tu academia, a tu medida — tus programas reales + cómo quieres entrenar",
    "hub.xpAutosave": "Se guarda automáticamente",
    "hub.xpActivePrograms": "Tus programas activos",
    "hub.xpEmptyTitle": "Aún sin programas",
    "hub.xpEmptyBody": "Inscríbete desde Cursos para armar tu ruta.",
    "hub.xpEmptyCta": "Explorar programas",
    "hub.xpAddToRoute": "Agregar a tu ruta",
    "hub.xpPaceLabel": "Tu ritmo",
    "hub.xpScheduleLabel": "Tu horario preferido",
    "hub.xpGoalsLabel": "Tus metas",

    // opciones de ritmo / horario / metas (el VALOR crudo es el dato guardado;
    // solo la etiqueta visible "hub.opt.<valor>" se traduce)
    "hub.opt.Ligero": "Ligero",
    "hub.opt.Estándar": "Estándar",
    "hub.opt.Intensivo": "Intensivo",
    "hub.opt.Tarde": "Tarde",
    "hub.opt.Noche": "Noche",
    "hub.opt.Sábado": "Sábado",
    "hub.opt.Perder el miedo escénico": "Perder el miedo escénico",
    "hub.opt.Ganar torneos": "Ganar torneos",
    "hub.opt.Hablar con claridad": "Hablar con claridad",
    "hub.opt.Prepararme para la universidad": "Prepararme para la universidad",
    "hub.opt.Liderazgo": "Liderazgo",
    "hub.xpYourWeek": "Tu semana",
    "hub.xpSessionsPerWeek": "sesiones/sem",
    "hub.xpProgramUnitSingular": "programa",
    "hub.xpProgramUnitPlural": "programas",
    "hub.xpPaceWord": "ritmo",
    "hub.xpScheduleWord": "horario:",
    "hub.xpYourCoaches": "Tus coaches",
    "hub.xpEnrollToSeeCoaches": "Inscríbete para ver tus coaches",
    "hub.xpRouteIsYoursTitle": "Tu ruta es tuya",
    "hub.xpRouteIsYoursBody": "Cámbiala cuando quieras — tu coach la ve y ajusta el plan contigo.",

    // onboarding
    "hub.obSetupTitle": "Configura tu experiencia",
    "hub.obCoachProfileBadge": "Perfil de coach",
    "hub.obStudentProfileBadge": "Perfil de estudiante",
    "hub.obTeacherEyebrow": "Tu perfil público",
    "hub.obTeacherTitle": "Muestra cómo trabajas.",
    "hub.obTeacherBody": "Esto es lo que los estudiantes ven antes de elegirte. Se guarda en tu perfil real.",
    "hub.obHeadlineLabel": "Titular",
    "hub.obHeadlinePlaceholder": "Ej: Head Coach · Public Forum & Parliamentary",
    "hub.obFormatsLabel": "¿Qué enseñas? (formatos)",
    "hub.obFormatsPlaceholder": "Public Forum · Lincoln–Douglas · Oratoria",
    "hub.obStyleLabel": "Cómo trabajas (tu método)",
    "hub.obStylePlaceholder": "Diagnóstico primero, drills bajo presión, feedback después de cada ronda…",
    "hub.obStudentEyebrow": "Tu experiencia",
    "hub.obStudentTitle": "Arma tu ruta, {name}.",
    "hub.obStudentBody": "Elige cómo quieres entrenar — puedes cambiarlo cuando quieras en \"Mi experiencia\".",
    "hub.obGoalsQuestion": "¿Qué quieres lograr?",
    "hub.obPaceLabel": "Tu ritmo",
    "hub.obStartPrograms": "Programas para empezar",
    "hub.obSkip": "Saltar",
    "hub.obSaveAndEnter": "Guardar y entrar al hub",
  },
  en: {
    // shared fallbacks (coach/team/name)
    "hub.coachFallbackTagline": "OTR Coach",
    "hub.programTeamFallback": "OTR Team",
    "hub.fallbackName": "champion",
    "hub.reviewUnitSingular": "review",
    "hub.reviewUnitPlural": "reviews",

    // program card (programCard)
    "hub.programFree": "Free",
    "hub.programInRoute": "On your path",
    "hub.programEnroll": "Enroll",

    // hub home — welcome
    "hub.homeEyebrow": "The academy hub",
    "hub.homeWelcome": "Welcome to the OTR Hub, {name}",
    "hub.homeSubtitle": "Events, programs, materials and your community — all in one place.",
    "hub.homeExploreBtn": "Explore programs",
    "hub.homeArsenalBtn": "Arsenal",

    // hub home — empty feed
    "hub.feedEmptyTitle": "Nothing new right now",
    "hub.feedEmptyBody": "Academy announcements and events will show up here.",

    // hub home — your path (student)
    "hub.homeYourRoute": "Your path",
    "hub.homeNoPrograms": "You haven't enrolled in a program yet",
    "hub.homeViewJourney": "View my journey",

    // hub home — presence (teacher)
    "hub.homePresenceTitle": "Your presence in the hub",
    "hub.homePresenceBody": "Your public profile, your programs and your reviews — what students see.",
    "hub.homeViewCoachProfile": "View my coach profile",

    // hub home — coaches + network
    "hub.homeAcademyCoaches": "Academy coaches",
    "hub.homeViewAllCoaches": "View all",
    "hub.homeLifetimeTitle": "Lifetime OTR network",
    "hub.homeLifetimeBody": "Graduating from OTR means lifetime access to coaches, competitors, mentors and international connections.",

    // explore
    "hub.exploreTitle": "Explore",
    "hub.exploreSub": "Academy coaches and programs — choose who you train with and how",
    "hub.exploreFilterAll": "All",
    "hub.exploreCoachesLabel": "Coaches",
    "hub.exploreProgramsLabel": "Programs",
    "hub.exploreViewProfile": "View profile",

    // my experience
    "hub.xpTitle": "My experience",
    "hub.xpSub": "Your academy, tailored to you — your real programs + how you want to train",
    "hub.xpAutosave": "Saves automatically",
    "hub.xpActivePrograms": "Your active programs",
    "hub.xpEmptyTitle": "No programs yet",
    "hub.xpEmptyBody": "Enroll from Courses to build your path.",
    "hub.xpEmptyCta": "Explore programs",
    "hub.xpAddToRoute": "Add to your path",
    "hub.xpPaceLabel": "Your pace",
    "hub.xpScheduleLabel": "Your preferred schedule",
    "hub.xpGoalsLabel": "Your goals",

    // pace / schedule / goal options (the raw VALUE is the stored datum;
    // only the visible "hub.opt.<value>" label is translated)
    "hub.opt.Ligero": "Light",
    "hub.opt.Estándar": "Standard",
    "hub.opt.Intensivo": "Intensive",
    "hub.opt.Tarde": "Afternoon",
    "hub.opt.Noche": "Evening",
    "hub.opt.Sábado": "Saturday",
    "hub.opt.Perder el miedo escénico": "Beat stage fright",
    "hub.opt.Ganar torneos": "Win tournaments",
    "hub.opt.Hablar con claridad": "Speak with clarity",
    "hub.opt.Prepararme para la universidad": "Prep for university",
    "hub.opt.Liderazgo": "Leadership",
    "hub.xpYourWeek": "Your week",
    "hub.xpSessionsPerWeek": "sessions/wk",
    "hub.xpProgramUnitSingular": "program",
    "hub.xpProgramUnitPlural": "programs",
    "hub.xpPaceWord": "pace",
    "hub.xpScheduleWord": "schedule:",
    "hub.xpYourCoaches": "Your coaches",
    "hub.xpEnrollToSeeCoaches": "Enroll to see your coaches",
    "hub.xpRouteIsYoursTitle": "Your path is yours",
    "hub.xpRouteIsYoursBody": "Change it whenever you like — your coach sees it and adjusts the plan with you.",

    // onboarding
    "hub.obSetupTitle": "Set up your experience",
    "hub.obCoachProfileBadge": "Coach profile",
    "hub.obStudentProfileBadge": "Student profile",
    "hub.obTeacherEyebrow": "Your public profile",
    "hub.obTeacherTitle": "Show how you work.",
    "hub.obTeacherBody": "This is what students see before choosing you. It's saved to your real profile.",
    "hub.obHeadlineLabel": "Headline",
    "hub.obHeadlinePlaceholder": "e.g. Head Coach · Public Forum & Parliamentary",
    "hub.obFormatsLabel": "What do you teach? (formats)",
    "hub.obFormatsPlaceholder": "Public Forum · Lincoln–Douglas · Public Speaking",
    "hub.obStyleLabel": "How you work (your method)",
    "hub.obStylePlaceholder": "Diagnosis first, drills under pressure, feedback after every round…",
    "hub.obStudentEyebrow": "Your experience",
    "hub.obStudentTitle": "Build your path, {name}.",
    "hub.obStudentBody": "Choose how you want to train — you can change it anytime under \"My experience\".",
    "hub.obGoalsQuestion": "What do you want to achieve?",
    "hub.obPaceLabel": "Your pace",
    "hub.obStartPrograms": "Programs to start with",
    "hub.obSkip": "Skip",
    "hub.obSaveAndEnter": "Save and enter the hub",
  },
};
