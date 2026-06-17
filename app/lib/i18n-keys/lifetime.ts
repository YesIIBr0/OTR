/* OTR Aula · i18n keys — pantalla scr-lifetime.ts
   ("Mi trayectoria" / S.lifetimeProfile + "Membresía" / S.membership).
   Módulo simple y default-safe: { es:{...}, en:{...} }.
   es = texto original exacto; en = traducción natural y profesional. */
export const dict = {
  es: {
    // ① Hero de identidad
    "lifetime.heroEyebrow": "Tu historia en OTR",
    "lifetime.minorProtected": "Menor — cuenta protegida",

    // ② Skill Graph
    "lifetime.radarAria": "Radar de habilidades",
    "lifetime.whatMovedIt": "Qué lo movió",
    "lifetime.noEventsYet": "Aún sin eventos atribuidos. Tus próximas lecciones, rondas y ballots moverán esta habilidad.",
    "lifetime.seeWhatMoved": "Ver qué movió esta habilidad",
    "lifetime.skillEmptyTitle": "Tu Skill Graph se está formando",
    "lifetime.skillEmptyBody": "Completa lecciones y rondas adjudicadas: cada evento alimenta tus habilidades.",
    "lifetime.goToCourses": "Ir a mis cursos",
    "lifetime.skillEyebrow": "Skill Graph",
    "lifetime.skillTitle": "Tus habilidades, con historia",
    "lifetime.average": "promedio",

    // ③ Ledger (KPIs)
    "lifetime.ledgerCourses": "Cursos completados",
    "lifetime.ledgerLessons": "Lecciones terminadas",
    "lifetime.ledgerDebates": "Debates competidos",
    "lifetime.ledgerWins": "Victorias",
    "lifetime.ledgerSessions": "Sesiones asistidas",
    "lifetime.ledgerTournaments": "Torneos",
    "lifetime.ledgerHours": "Horas de coaching",

    // ④ Performance
    "lifetime.perfEyebrow": "Performance",
    "lifetime.perfTitle": "Tu rating competitivo",
    "lifetime.provisional": "provisional",
    "lifetime.stable": "estable",
    "lifetime.perfEmpty": "Tu curva de rating aparecerá aquí cuando acumules rondas adjudicadas.",
    "lifetime.viewDebateHub": "Ver Debate Hub",

    // ⑤ Credenciales
    "lifetime.credEyebrow": "Credenciales",
    "lifetime.credTitle": "Certificaciones verificables",
    "lifetime.issued": "Emitido",
    "lifetime.credEmpty": "Cuando completes un programa, tu certificación aparecerá aquí — prueba verificable de lo que sabes hacer.",

    // ⑥ Journey
    "lifetime.journeyEmptyTitle": "Tu historia empieza hoy",
    "lifetime.journeyEmptyBody": "Cada lección, debate y logro quedará registrado aquí — la línea de tiempo que algún día vas a querer compartir.",
    "lifetime.startLearning": "Empezar a aprender",
    "lifetime.journeyEyebrow": "Journey",
    "lifetime.journeyTitle": "Tu línea de tiempo",
    "lifetime.milestone": "hito",
    "lifetime.milestones": "hitos",

    // ⑦ Perfil público
    "lifetime.publicProfileAria": "Perfil público",
    "lifetime.shareEyebrow": "Comparte tu historia",
    "lifetime.publicProfileTitle": "Perfil público",
    "lifetime.publicProfileBody": "Tu Skill Graph, credenciales y journey en una sola página — la prueba pública de tu nivel.",
    "lifetime.requiresConsent": "Requiere consentimiento",
    "lifetime.visibleWithLink": "Visible con el enlace",
    "lifetime.disabledPrivate": "Desactivado (privado)",
    "lifetime.copyLink": "Copiar enlace",
    "lifetime.viewPublicProfile": "Ver perfil público",
    "lifetime.privateByDefault": "Privado por defecto. Tú decides cuándo y con quién compartirlo.",

    // Toasts (perfil público)
    "lifetime.toastPublicOn": "Tu perfil público está activo",
    "lifetime.toastPublicOff": "Perfil público desactivado",
    "lifetime.toastUpdateFailed": "No se pudo actualizar",
    "lifetime.toastLinkCopied": "Enlace copiado",
    "lifetime.toastCopyFailed": "No se pudo copiar el enlace",

    // Membresía · hero
    "lifetime.memSrTitle": "Membresía",
    "lifetime.memEyebrow": "Membresía",
    "lifetime.memYourPlan": "Tu plan:",
    "lifetime.memSubtitle": "Tu plan decide cuánto entrenas y cuánto de tu progreso puedes mostrar.",
    "lifetime.memOnThisPlan": "En este plan",
    "lifetime.memCurrentPlanBadge": "Plan vigente",

    // Membresía · tarjetas
    "lifetime.memCurrentPlanBtn": "Tu plan actual",
    "lifetime.memFreeTitle": "Empieza gratis",
    "lifetime.memForever": "para siempre",
    "lifetime.memFreeFeat1": "Perfil + Skill Graph básico",
    "lifetime.memFreeFeat2": "Práctica limitada",
    "lifetime.memFreeFeat3": "Marketplace a tarifa estándar",
    "lifetime.memSwitchToFree": "Cambiar a Free",
    "lifetime.memRecommended": "Recomendado",
    "lifetime.memProTitle": "El plan de los que compiten",
    "lifetime.memPerMonth": "/mes",
    "lifetime.memOr": "o",
    "lifetime.memPerYear": "/año (2 meses gratis)",
    "lifetime.memProFeat1": "Analytics completo: ve exactamente dónde ganar puntos",
    "lifetime.memProFeat2": "Práctica y drills ilimitados — entrena sin techo",
    "lifetime.memProFeat3": "Protección de racha: un mal día no borra tu constancia",
    "lifetime.memProFeat4": "Recomendaciones prioritarias de tu siguiente paso",
    "lifetime.memProFeat5": "Descuentos en certificaciones y coaching",
    "lifetime.memUpgradePro": "Pasar a Pro",
    "lifetime.memComingSoon": "Próximamente",
    "lifetime.memEliteTitle": "Para quienes van por todo",
    "lifetime.memVerySoon": "Muy pronto",
    "lifetime.memEliteFeat1": "Todo Pro",
    "lifetime.memEliteFeat2": "Créditos de coaching incluidos",
    "lifetime.memEliteFeat3": "Acceso temprano a torneos",
    "lifetime.memEliteFeat4": "Contenido premium",

    // Membresía · aviso de pago simulado
    "lifetime.memSimulatedTitle": "Pago simulado en esta fase",
    "lifetime.memSimulatedBody": "La facturación real llega con el lanzamiento. Mientras tanto puedes cambiar de plan libremente para explorar lo que cada uno desbloquea.",

    // Membresía · confirmación + acciones
    "lifetime.cancel": "Cancelar",
    "lifetime.memConfirmFreeTitle": "¿Cambiar a Free?",
    "lifetime.memConfirmFreeBody": "Perderás analytics completo, práctica ilimitada y la protección de tu racha. Tu progreso y tu historia se conservan intactos.",
    "lifetime.memConfirmFreeOk": "Sí, cambiar a Free",
    "lifetime.memUpdating": "Actualizando…",
    "lifetime.memToastWelcomePro": "Bienvenido a OTR Pro",
    "lifetime.memToastSwitchedFree": "Tu plan cambió a Free",
    "lifetime.memToastChangeFailed": "No se pudo cambiar el plan",
  },
  en: {
    // ① Identity hero
    "lifetime.heroEyebrow": "Your story at OTR",
    "lifetime.minorProtected": "Minor — protected account",

    // ② Skill Graph
    "lifetime.radarAria": "Skills radar",
    "lifetime.whatMovedIt": "What moved it",
    "lifetime.noEventsYet": "No attributed events yet. Your upcoming lessons, rounds and ballots will move this skill.",
    "lifetime.seeWhatMoved": "See what moved this skill",
    "lifetime.skillEmptyTitle": "Your Skill Graph is taking shape",
    "lifetime.skillEmptyBody": "Complete lessons and judged rounds: every event feeds your skills.",
    "lifetime.goToCourses": "Go to my courses",
    "lifetime.skillEyebrow": "Skill Graph",
    "lifetime.skillTitle": "Your skills, with a backstory",
    "lifetime.average": "average",

    // ③ Ledger (KPIs)
    "lifetime.ledgerCourses": "Courses completed",
    "lifetime.ledgerLessons": "Lessons finished",
    "lifetime.ledgerDebates": "Debates competed",
    "lifetime.ledgerWins": "Wins",
    "lifetime.ledgerSessions": "Sessions attended",
    "lifetime.ledgerTournaments": "Tournaments",
    "lifetime.ledgerHours": "Coaching hours",

    // ④ Performance
    "lifetime.perfEyebrow": "Performance",
    "lifetime.perfTitle": "Your competitive rating",
    "lifetime.provisional": "provisional",
    "lifetime.stable": "stable",
    "lifetime.perfEmpty": "Your rating curve will appear here once you log judged rounds.",
    "lifetime.viewDebateHub": "View Debate Hub",

    // ⑤ Credentials
    "lifetime.credEyebrow": "Credentials",
    "lifetime.credTitle": "Verifiable certifications",
    "lifetime.issued": "Issued",
    "lifetime.credEmpty": "When you complete a program, your certification will appear here — verifiable proof of what you can do.",

    // ⑥ Journey
    "lifetime.journeyEmptyTitle": "Your story starts today",
    "lifetime.journeyEmptyBody": "Every lesson, debate and achievement will be recorded here — the timeline you'll one day want to share.",
    "lifetime.startLearning": "Start learning",
    "lifetime.journeyEyebrow": "Journey",
    "lifetime.journeyTitle": "Your timeline",
    "lifetime.milestone": "milestone",
    "lifetime.milestones": "milestones",

    // ⑦ Public profile
    "lifetime.publicProfileAria": "Public profile",
    "lifetime.shareEyebrow": "Share your story",
    "lifetime.publicProfileTitle": "Public profile",
    "lifetime.publicProfileBody": "Your Skill Graph, credentials and journey on a single page — public proof of your level.",
    "lifetime.requiresConsent": "Requires consent",
    "lifetime.visibleWithLink": "Visible with the link",
    "lifetime.disabledPrivate": "Disabled (private)",
    "lifetime.copyLink": "Copy link",
    "lifetime.viewPublicProfile": "View public profile",
    "lifetime.privateByDefault": "Private by default. You decide when and with whom to share it.",

    // Toasts (public profile)
    "lifetime.toastPublicOn": "Your public profile is active",
    "lifetime.toastPublicOff": "Public profile disabled",
    "lifetime.toastUpdateFailed": "Couldn't update",
    "lifetime.toastLinkCopied": "Link copied",
    "lifetime.toastCopyFailed": "Couldn't copy the link",

    // Membership · hero
    "lifetime.memSrTitle": "Membership",
    "lifetime.memEyebrow": "Membership",
    "lifetime.memYourPlan": "Your plan:",
    "lifetime.memSubtitle": "Your plan decides how much you train and how much of your progress you can show.",
    "lifetime.memOnThisPlan": "On this plan",
    "lifetime.memCurrentPlanBadge": "Current plan",

    // Membership · cards
    "lifetime.memCurrentPlanBtn": "Your current plan",
    "lifetime.memFreeTitle": "Start for free",
    "lifetime.memForever": "forever",
    "lifetime.memFreeFeat1": "Profile + basic Skill Graph",
    "lifetime.memFreeFeat2": "Limited practice",
    "lifetime.memFreeFeat3": "Marketplace at standard rate",
    "lifetime.memSwitchToFree": "Switch to Free",
    "lifetime.memRecommended": "Recommended",
    "lifetime.memProTitle": "The plan for competitors",
    "lifetime.memPerMonth": "/mo",
    "lifetime.memOr": "or",
    "lifetime.memPerYear": "/yr (2 months free)",
    "lifetime.memProFeat1": "Full analytics: see exactly where to gain points",
    "lifetime.memProFeat2": "Unlimited practice and drills — train without limits",
    "lifetime.memProFeat3": "Streak protection: one bad day won't erase your consistency",
    "lifetime.memProFeat4": "Priority recommendations for your next step",
    "lifetime.memProFeat5": "Discounts on certifications and coaching",
    "lifetime.memUpgradePro": "Upgrade to Pro",
    "lifetime.memComingSoon": "Coming soon",
    "lifetime.memEliteTitle": "For those going all in",
    "lifetime.memVerySoon": "Very soon",
    "lifetime.memEliteFeat1": "Everything in Pro",
    "lifetime.memEliteFeat2": "Coaching credits included",
    "lifetime.memEliteFeat3": "Early access to tournaments",
    "lifetime.memEliteFeat4": "Premium content",

    // Membership · simulated-payment notice
    "lifetime.memSimulatedTitle": "Simulated payment in this phase",
    "lifetime.memSimulatedBody": "Real billing arrives at launch. In the meantime you can switch plans freely to explore what each one unlocks.",

    // Membership · confirmation + actions
    "lifetime.cancel": "Cancel",
    "lifetime.memConfirmFreeTitle": "Switch to Free?",
    "lifetime.memConfirmFreeBody": "You'll lose full analytics, unlimited practice and your streak protection. Your progress and your story stay intact.",
    "lifetime.memConfirmFreeOk": "Yes, switch to Free",
    "lifetime.memUpdating": "Updating…",
    "lifetime.memToastWelcomePro": "Welcome to OTR Pro",
    "lifetime.memToastSwitchedFree": "Your plan changed to Free",
    "lifetime.memToastChangeFailed": "Couldn't change the plan",
  },
};
