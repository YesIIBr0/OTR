/* OTR Aula · i18n keys — scr-debate.ts (prefix "debate")
   Diccionario por-pantalla para el "Debate Hub". Default-safe: solo datos.
   es = texto original exacto reemplazado en la pantalla; en = traducción
   profesional natural. Consumido por el helper t() de ./i18n. */
export const dict = {
  es: {
    // sub-tabs
    "debate.tabOverview": "Resumen",
    "debate.tabHistory": "Mis debates",
    "debate.tabPractice": "Práctica",
    "debate.tabLeaderboard": "Leaderboard",

    // upsell a Pro
    "debate.seeOtrPro": "Ver OTR Pro",

    // tiers del rating (valor de DB intacto; solo la etiqueta visible se traduce)
    "debate.tier.novato": "Novato",
    "debate.tier.bronze": "Bronce",
    "debate.tier.silver": "Plata",
    "debate.tier.gold": "Oro",
    "debate.tier.platinum": "Platino",
    "debate.tier.diamond": "Diamante",
    "debate.tier.master": "Maestro",
    "debate.tier.grandmaster": "Gran Maestro",

    // panel HERO
    "debate.heroSrTitle": "Debate Hub",
    "debate.heroEyebrow": "Tu rating Glicko-2",
    "debate.rdProvisional": "provisional",
    "debate.rdStable": "estable",
    "debate.speakerTitle": "Promedio de oratoria juzgada (separado del rating de victoria/derrota)",
    "debate.speakerLabel": "Orador",
    "debate.roundSingular": "ronda",
    "debate.roundPlural": "rondas",
    "debate.provisionalTitle": "Tu rating es provisional",
    "debate.provisionalBody": "Pocas rondas adjudicadas aún. Cada ballot oficial lo acerca a tu nivel real.",
    "debate.nextTierPrefix": "Próximo tier:",
    "debate.nextTierSuffix": "— gana rondas adjudicadas y asciende.",
    "debate.topPrefix": "La cima es tuya:",
    "debate.topSuffix": "Defiéndela.",
    "debate.recentForm": "Forma reciente",
    "debate.noRoundsForm": "Aún sin rondas. Tu forma empieza con la primera.",

    // resumen / overview
    "debate.kpiParticipated": "Rondas participadas",
    "debate.kpiWins": "Victorias",
    "debate.kpiWinRate": "% de victoria",
    "debate.recentDebates": "Debates recientes",
    "debate.seeAll": "Ver todos",
    "debate.historyEmpty": "Historial en cero. Tu coach registra y adjudica tus rondas.",
    "debate.goToPractice": "Ir a práctica",
    "debate.nextTournament": "Próximo torneo",
    "debate.noEventsTitle": "Sin torneos en el radar",
    "debate.noEventsBody": "Cuando se abran torneos los verás aquí. Llega entrenado.",

    // mis debates / historial
    "debate.historyEmptyTitle": "Aún no tienes debates",
    "debate.historyEmptyBody": "Tu coach registra y adjudica tus rondas. En cuanto las apruebe, aparecerán aquí y sumarán a tu rating.",
    "debate.sourceExternal": "Externo",
    "debate.viewDebateDetail": "Ver detalle del debate",
    "debate.historyEyebrow": "Tu palmarés",
    "debate.historyTitle": "Mis debates",
    "debate.historySubTap": "toca una tarjeta para ver el ballot",

    // práctica
    "debate.findPartner": "Encuentra compañero o rival",
    "debate.nearYourRating": "Cerca de tu rating",
    "debate.cohortEmptyFinder": "Tu cohort aún no entra a la arena. En cuanto jueguen rondas, tendrás rivales a tu altura.",
    "debate.seeFullLeaderboard": "Ver leaderboard completo",
    "debate.practiceEyebrow": "Entrena bajo presión",
    "debate.practiceTitle": "Práctica",
    "debate.practiceSub": "Entrena destrezas puntuales con drills enfocados. Tu rating solo se mueve en rondas adjudicadas por un coach.",
    "debate.drillsTitle": "Drills en camino",
    "debate.drillsBody": "Pronto vas a entrenar destrezas puntuales aquí: refutación, weighing, crossfire y más.",

    // leaderboard
    "debate.lbEmptyTitle": "Entra en la clasificación",
    "debate.lbEmptyBody": "Compite en rondas adjudicadas y reclama tu posición antes que el resto del cohort.",
    "debate.yourPosition": "Tu posición",
    "debate.ofRating": "de rating",
    "debate.youBadge": "Tú",
    "debate.lbEyebrow": "El cohort",
    "debate.lbSub": "Ranking por rating Glicko-2 — solo cuentan las rondas adjudicadas",
    "debate.lbUpsell": "¿Listo para subir de tier? Descubre todo lo que incluye OTR Pro.",
    "debate.sealPro": "OTR Pro",
    "debate.sealElite": "OTR Elite",
    "debate.sealActive": "Tu membresía está activa — todos los beneficios incluidos.",
    "debate.colDebater": "Debatiente",
    "debate.colTier": "Tier",
    "debate.colRating": "Rating",
    "debate.lbPageTitle": "Leaderboard",

    // fallbacks de datos vacíos
    "debate.fallbackOpponent": "Rival",
    "debate.fallbackEvent": "Práctica",
    "debate.fallbackDebater": "Debatiente",

    // torneos
    "debate.registered": "Inscrito",
    "debate.register": "Registrarme",

    // NSDA · Tabroom (Fase-1: torneos vía API pública oficial)
    "debate.nsdaTitle": "Torneos del circuito",
    "debate.nsdaSub": "Resultados oficiales de la NSDA vía Tabroom.",
    "debate.nsdaLoading": "Cargando torneos…",
    "debate.nsdaEmpty": "No pudimos cargar los torneos ahora. Inténtalo más tarde.",
    "debate.nsdaViewResults": "Ver resultados",
    "debate.nsdaPhase2": "Pronto: sincroniza tu récord personal de la NSDA.",

    // analytics

    // detalle del debate (modal)
    "debate.detailLoadError": "No se pudo cargar el detalle del debate",
    "debate.judge": "Juez",
    "debate.watchRecording": "Ver grabación",
    "debate.noBallotTitle": "Sin ballot todavía",
    "debate.noBallotBody": "Esta ronda aún no tiene un ballot del juez registrado.",
    "debate.loadFailedTitle": "No se pudo cargar",
    "debate.loadFailedBody": "Intenta de nuevo más tarde.",
    "debate.detailModalTitle": "Detalle del debate",

    // form: registrar un debate
    "debate.recordDebate": "Registrar debate",
    "debate.fieldResult": "Resultado",
    "debate.resultWin": "Victoria",
    "debate.resultLoss": "Derrota",
    "debate.resultDraw": "Empate",
    "debate.fieldFormat": "Formato",
    "debate.fieldSide": "Lado",
    "debate.fieldOpponent": "Rival",
    "debate.phOpponent": "Equipo o debatiente rival",
    "debate.fieldPartner": "Compañero",
    "debate.phPartner": "Tu compañero de equipo",
    "debate.partnerRequiredHint": "Obligatorio en formatos por parejas (PF, Policy, Parli, WSDC).",
    "debate.fieldSource": "Fuente",
    "debate.sourceExternalNsda": "Externo / NSDA",
    "debate.fieldEvent": "Evento / torneo",
    "debate.phEvent": "Ej. Yale Invitational 2026",
    "debate.fieldTournamentCode": "Código del torneo",
    "debate.phTournamentCode": "Ej. GFBOR2026",
    "debate.tournamentCodeHint": "El código que aparece en el tab del torneo (Tabroom, etc.).",
    "debate.fieldRound": "Ronda (opcional)",
    "debate.phRound": "Round 3, Cuartos…",
    "debate.fieldJudgeComments": "Comentarios del juez (opcional)",
    "debate.requestIntro": "Esta solicitud la revisará tu coach. Tu rating solo se mueve cuando él la aprueba.",
    "debate.submitRequest": "Enviar solicitud",
    "debate.requestSent": "Solicitud enviada — tu coach la revisará",
    "debate.errEvent": "Indica el evento o torneo.",
    "debate.errCode": "Indica el código del torneo.",
    "debate.errPartner": "Este formato es por parejas: indica a tu compañero.",
    "debate.save": "Guardar",

    // modal genérico
    "debate.cancel": "Cancelar",
    "debate.close": "Cerrar",
    "debate.saving": "Guardando…",
    "debate.error": "Error",

    // registro a torneo (handler)
    "debate.registering": "Registrando…",
    "debate.registerSent": "Inscripción enviada — nos vemos en la arena.",
    "debate.registerError": "No se pudo registrar",

    // temporizador PF (runtime)
  },
  en: {
    // sub-tabs
    "debate.tabOverview": "Overview",
    "debate.tabHistory": "My debates",
    "debate.tabPractice": "Practice",
    "debate.tabLeaderboard": "Leaderboard",

    // Pro upsell
    "debate.seeOtrPro": "See OTR Pro",

    // rating tiers (DB value stays intact; only the visible label is translated)
    "debate.tier.novato": "Novice",
    "debate.tier.bronze": "Bronze",
    "debate.tier.silver": "Silver",
    "debate.tier.gold": "Gold",
    "debate.tier.platinum": "Platinum",
    "debate.tier.diamond": "Diamond",
    "debate.tier.master": "Master",
    "debate.tier.grandmaster": "Grandmaster",

    // HERO panel
    "debate.heroSrTitle": "Debate Hub",
    "debate.heroEyebrow": "Your Glicko-2 rating",
    "debate.rdProvisional": "provisional",
    "debate.rdStable": "stable",
    "debate.speakerTitle": "Average judged speaker score (separate from your win/loss rating)",
    "debate.speakerLabel": "Speaker",
    "debate.roundSingular": "round",
    "debate.roundPlural": "rounds",
    "debate.provisionalTitle": "Your rating is provisional",
    "debate.provisionalBody": "Only a few adjudicated rounds so far. Every official ballot brings it closer to your real level.",
    "debate.nextTierPrefix": "Next tier:",
    "debate.nextTierSuffix": "— win adjudicated rounds and climb.",
    "debate.topPrefix": "The summit is yours:",
    "debate.topSuffix": "Defend it.",
    "debate.recentForm": "Recent form",
    "debate.noRoundsForm": "No rounds yet. Your form starts with the first.",

    // overview
    "debate.kpiParticipated": "Rounds participated",
    "debate.kpiWins": "Wins",
    "debate.kpiWinRate": "Win rate",
    "debate.recentDebates": "Recent debates",
    "debate.seeAll": "See all",
    "debate.historyEmpty": "No history yet. Your coach records and adjudicates your rounds.",
    "debate.goToPractice": "Go to practice",
    "debate.nextTournament": "Next tournament",
    "debate.noEventsTitle": "No tournaments on the radar",
    "debate.noEventsBody": "When tournaments open, you'll see them here. Show up trained.",

    // my debates / history
    "debate.historyEmptyTitle": "No debates yet",
    "debate.historyEmptyBody": "Your coach records and adjudicates your rounds. Once approved, they'll show up here and count toward your rating.",
    "debate.sourceExternal": "External",
    "debate.viewDebateDetail": "View debate detail",
    "debate.historyEyebrow": "Your record",
    "debate.historyTitle": "My debates",
    "debate.historySubTap": "tap a card to view the ballot",

    // practice
    "debate.findPartner": "Find a partner or opponent",
    "debate.nearYourRating": "Near your rating",
    "debate.cohortEmptyFinder": "Your cohort hasn't entered the arena yet. As soon as they play rounds, you'll have opponents at your level.",
    "debate.seeFullLeaderboard": "See full leaderboard",
    "debate.practiceEyebrow": "Train under pressure",
    "debate.practiceTitle": "Practice",
    "debate.practiceSub": "Train specific skills with focused drills. Your rating only moves on rounds adjudicated by a coach.",
    "debate.drillsTitle": "Drills coming soon",
    "debate.drillsBody": "Soon you'll train specific skills here: rebuttal, weighing, crossfire and more.",

    // leaderboard
    "debate.lbEmptyTitle": "Join the standings",
    "debate.lbEmptyBody": "Compete in adjudicated rounds and claim your spot before the rest of the cohort.",
    "debate.yourPosition": "Your position",
    "debate.ofRating": "rating",
    "debate.youBadge": "You",
    "debate.lbEyebrow": "The cohort",
    "debate.lbSub": "Ranked by Glicko-2 rating — only adjudicated rounds count",
    "debate.lbUpsell": "Ready to climb a tier? Discover everything OTR Pro includes.",
    "debate.sealPro": "OTR Pro",
    "debate.sealElite": "OTR Elite",
    "debate.sealActive": "Your membership is active — all benefits included.",
    "debate.colDebater": "Debater",
    "debate.colTier": "Tier",
    "debate.colRating": "Rating",
    "debate.lbPageTitle": "Leaderboard",

    // empty-data fallbacks
    "debate.fallbackOpponent": "Opponent",
    "debate.fallbackEvent": "Practice",
    "debate.fallbackDebater": "Debater",

    // tournaments
    "debate.registered": "Registered",
    "debate.register": "Register",

    // NSDA · Tabroom (Phase 1: tournaments via the official public API)
    "debate.nsdaTitle": "Circuit tournaments",
    "debate.nsdaSub": "Official NSDA results via Tabroom.",
    "debate.nsdaLoading": "Loading tournaments…",
    "debate.nsdaEmpty": "Couldn't load tournaments right now. Try again later.",
    "debate.nsdaViewResults": "View results",
    "debate.nsdaPhase2": "Coming soon: sync your personal NSDA record.",

    // analytics

    // debate detail (modal)
    "debate.detailLoadError": "Couldn't load the debate detail",
    "debate.judge": "Judge",
    "debate.watchRecording": "Watch recording",
    "debate.noBallotTitle": "No ballot yet",
    "debate.noBallotBody": "This round doesn't have a judge's ballot recorded yet.",
    "debate.loadFailedTitle": "Couldn't load",
    "debate.loadFailedBody": "Please try again later.",
    "debate.detailModalTitle": "Debate detail",

    // form: record a debate
    "debate.recordDebate": "Record debate",
    "debate.fieldResult": "Result",
    "debate.resultWin": "Win",
    "debate.resultLoss": "Loss",
    "debate.resultDraw": "Draw",
    "debate.fieldFormat": "Format",
    "debate.fieldSide": "Side",
    "debate.fieldOpponent": "Opponent",
    "debate.phOpponent": "Opposing team or debater",
    "debate.fieldPartner": "Partner",
    "debate.phPartner": "Your teammate",
    "debate.partnerRequiredHint": "Required in team formats (PF, Policy, Parli, WSDC).",
    "debate.fieldSource": "Source",
    "debate.sourceExternalNsda": "External / NSDA",
    "debate.fieldEvent": "Event / tournament",
    "debate.phEvent": "e.g. Yale Invitational 2026",
    "debate.fieldTournamentCode": "Tournament code",
    "debate.phTournamentCode": "e.g. GFBOR2026",
    "debate.tournamentCodeHint": "The code shown on the tournament tab (Tabroom, etc.).",
    "debate.fieldRound": "Round (optional)",
    "debate.phRound": "Round 3, Quarterfinals…",
    "debate.fieldJudgeComments": "Judge's comments (optional)",
    "debate.requestIntro": "Your coach reviews this request. Your rating only moves once they approve it.",
    "debate.submitRequest": "Send request",
    "debate.requestSent": "Request sent — your coach will review it",
    "debate.errEvent": "Enter the event or tournament.",
    "debate.errCode": "Enter the tournament code.",
    "debate.errPartner": "This format is in pairs: name your partner.",
    "debate.save": "Save",

    // generic modal
    "debate.cancel": "Cancel",
    "debate.close": "Close",
    "debate.saving": "Saving…",
    "debate.error": "Error",

    // tournament registration (handler)
    "debate.registering": "Registering…",
    "debate.registerSent": "Registration sent — see you in the arena.",
    "debate.registerError": "Couldn't register",

    // PF timer (runtime)
  },
};
