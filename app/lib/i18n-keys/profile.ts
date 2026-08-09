/* OTR Aula · i18n dictionary for scr-profile.ts
   Prefix: "profile.". Shape: { es, en } — es = exact original Spanish copy
   replaced in the screen, en = natural professional English. Default-safe
   plain module consumed by t() in ./i18n. */
export const dict = {
  es: {
    // ── programCard (reutilizada en perfiles de coach) ──
    "profile.viewProgram": "Ver programa",

    // ── Rangos ──
    // [RONDA 3 · Isaac] "«Levels» reemplazando por → «Ranks»". El menú dice "Rangos": si el
    // H1 siguiera diciendo "Progreso y niveles", pulsar "Rangos" te dejaría en una pantalla
    // con otro nombre. Es la MISMA pantalla, solo se renombra.
    "profile.progressTitle": "Rangos",
    "profile.progressSub": "Tu camino de Novato a Elite en el sistema OTR",
    // [RONDA 3 · Isaac] Se fueron con sus bloques: pathTo/maxLevel/xpToReach/maxLevelReached
    // (barra "Camino a <rango>"), competencies/avg/noEvalHeading/noEvalBody (las 6 barras de
    // habilidad, que viven en "Mi trayectoria") y yourProgress (el eyebrow de la cabecera).
    "profile.radarOtr": "Radar OTR",
    "profile.streak": "Racha",
    "profile.streakDays": "{n} días",
    "profile.badgesProgress": "{got} de {total} insignias",
    "profile.dontBreakIt": "¡No la rompas!",
    "profile.recentGains": "Subidas recientes",
    "profile.noActivityBody": "Aún sin actividad — completa lecciones, exámenes y debates para ver tus subidas aquí.",

    // ── [GOAL F3 · A5] Salidas de "Progreso y niveles" ──
    "profile.progressGoBadges": "Ver insignias",
    "profile.progressGoDebate": "Debate Hub",

    // ── Insignias y certificados ──
    "profile.badgesTitle": "Insignias y certificados",
    "profile.yourCertificates": "Tus certificados",
    "profile.officialCert": "Certificado oficial OTR",
    "profile.viewCertificate": "Ver certificado",
    "profile.noCertsHeading": "Aún no tienes certificados",
    "profile.noCertsBody": "Completa un programa al 100% para ganar tu primer certificado.",
    "profile.collection": "Colección",
    "profile.yourBadges": "Tus insignias",
    "profile.earned": "Ganada",

    // ── [GOAL-E4 #3 y #4] Caras MINIMAL de FAMILIA y ADMIN ──
    "profile.roleFamily": "Familia",
    "profile.roleAdmin": "Admin",
    "profile.linkedChildren": "Hijos vinculados",
    "profile.minorProtected": "Menor — protegido",
    "profile.noChildrenHeading": "Aún no tienes hijos vinculados",
    "profile.noChildrenBody": "Vincula a tu hijo/a desde el Portal de familia para seguir sus sesiones y aprobar sus reservas.",
    "profile.quickLinks": "Accesos rápidos",
    "profile.goParentPortal": "Portal de familia",
    "profile.goMessages": "Mensajes",
    "profile.adminConsoles": "Tus consolas",
    "profile.adminConsolesHint": "El equipo OTR no tiene perfil de marketplace: administra la plataforma desde aquí.",
    "profile.goModeration": "Moderación",
    "profile.goUsers": "Usuarios",
    "profile.goMetrics": "Métricas",

    // ── Perfil de coach (cara TEACHER) ──
    "profile.editProfile": "Editar perfil",
    "profile.marketplaceProfile": "Perfil de marketplace",
    "profile.kpiPrograms": "Programas",
    "profile.kpiRating": "Rating",
    "profile.kpiReviews": "Reseñas",
    "profile.methodology": "Metodología",
    "profile.howIWork": "Cómo trabajo",
    "profile.noMethodologySelf": "Aún no has descrito tu metodología. Edita tu perfil para contar a tus estudiantes cómo trabajas.",
    "profile.myProgramsCoach": "Mis programas",
    "profile.noProgramsCoachHeading": "Aún no tienes programas",
    "profile.noProgramsCoachBody": "Crea un programa para empezar a recibir estudiantes.",
    "profile.studentReviews": "Reseñas de estudiantes",
    "profile.noReviewsCoachHeading": "Sin reseñas todavía",
    "profile.noReviewsCoachBody": "Cuando tus estudiantes te reseñen, aparecerán aquí.",
    "profile.overallRating": "Valoración general",
    "profile.specialty": "Especialidad",
    "profile.whatITeach": "Qué enseño",
    "profile.defineFormatsSelf": "Define tus formatos en el perfil.",

    // ── Reseñas (singular/plural) ──
    "profile.reviewSingular": "reseña",
    "profile.reviewPlural": "reseñas",

    // ── Perfil del alumno (cara STUDENT) ──
    "profile.kpiBadges": "Insignias",
    "profile.kpiStreak": "Racha",
    "profile.myProgramsStudent": "Mis programas",
    "profile.explore": "Explorar",
    "profile.notEnrolledHeading": "Aún no estás inscrito",
    "profile.notEnrolledBody": "Cuando te inscribas en un programa, aparecerá aquí.",
    "profile.exploreProgramsBtn": "Explorar programas",
    "profile.yourRank": "Tu rango",
    "profile.currentLevel": "Nivel actual",
    // [MOCKUP 2026-08] rótulo corto dentro del anillo cónico (9px versalitas)
    "profile.levelCap": "Nivel",
    "profile.xpToNextLevel": "XP para el siguiente nivel",
    "profile.featuredBadges": "Insignias destacadas",
    "profile.viewAll": "Ver todas",
    "profile.noBadgesStudent": "Aún no has ganado insignias. ¡Entrena para conseguirlas!",

    // ── Perfil público de un coach (cara STUDENT) ──
    "profile.howTheyWork": "Cómo trabaja",
    "profile.noMethodologyCoach": "Este coach aún no ha descrito su metodología.",
    "profile.programs": "Programas",
    "profile.noProgramsPublished": "Sin programas publicados",
    "profile.reviews": "Reseñas",
    "profile.beFirstReview": "Sé el primero en dejar una reseña.",
    "profile.rating": "Valoración",
    "profile.formats": "Formatos",
    "profile.notSpecified": "No especificado.",

    // ── Caja de reseña (dejar / mostrar) ──
    "profile.published": "Publicada",
    "profile.yourReview": "Tu reseña",
    "profile.leaveReview": "Dejar una reseña",
    "profile.verifiedBookingOnly": "Completa una sesión 1:1 con este coach para poder reseñarlo — solo reservas verificadas.",
    "profile.yourExperience": "Tu experiencia",
    "profile.leaveYourReview": "Deja tu reseña",
    "profile.reviewPlaceholder": "Cuéntale a otros estudiantes cómo fue tu experiencia…",
    "profile.publishReview": "Publicar reseña",
  },
  en: {
    // ── programCard (reused on coach profiles) ──
    "profile.viewProgram": "View program",

    // ── Ranks ──
    "profile.progressTitle": "Ranks",
    "profile.progressSub": "Your path from Novice to Elite in the OTR system",
    "profile.radarOtr": "OTR Radar",
    "profile.streak": "Streak",
    "profile.streakDays": "{n} days",
    "profile.badgesProgress": "{got} of {total} badges",
    "profile.dontBreakIt": "Don't break it!",
    "profile.recentGains": "Recent gains",
    "profile.noActivityBody": "No activity yet — complete lessons, exams and debates to see your gains here.",

    // ── [GOAL F3 · A5] Exits from "Progress and levels" ──
    "profile.progressGoBadges": "View badges",
    "profile.progressGoDebate": "Debate Hub",

    // ── Badges and certificates ──
    "profile.badgesTitle": "Badges and certificates",
    "profile.yourCertificates": "Your certificates",
    "profile.officialCert": "Official OTR certificate",
    "profile.viewCertificate": "View certificate",
    "profile.noCertsHeading": "You don't have any certificates yet",
    "profile.noCertsBody": "Complete a program 100% to earn your first certificate.",
    "profile.collection": "Collection",
    "profile.yourBadges": "Your badges",
    "profile.earned": "Earned",

    // ── [GOAL-E4 #3 y #4] MINIMAL FAMILY and ADMIN views ──
    "profile.roleFamily": "Family",
    "profile.roleAdmin": "Admin",
    "profile.linkedChildren": "Linked children",
    "profile.minorProtected": "Minor — protected",
    "profile.noChildrenHeading": "No children linked yet",
    "profile.noChildrenBody": "Link your child from the Family Portal to follow their sessions and approve their bookings.",
    "profile.quickLinks": "Quick links",
    "profile.goParentPortal": "Family Portal",
    "profile.goMessages": "Messages",
    "profile.adminConsoles": "Your consoles",
    "profile.adminConsolesHint": "The OTR team has no marketplace profile: run the platform from here.",
    "profile.goModeration": "Moderation",
    "profile.goUsers": "Users",
    "profile.goMetrics": "Metrics",

    // ── Coach profile (TEACHER view) ──
    "profile.editProfile": "Edit profile",
    "profile.marketplaceProfile": "Marketplace profile",
    "profile.kpiPrograms": "Programs",
    "profile.kpiRating": "Rating",
    "profile.kpiReviews": "Reviews",
    "profile.methodology": "Methodology",
    "profile.howIWork": "How I work",
    "profile.noMethodologySelf": "You haven't described your methodology yet. Edit your profile to tell students how you work.",
    "profile.myProgramsCoach": "My programs",
    "profile.noProgramsCoachHeading": "You don't have any programs yet",
    "profile.noProgramsCoachBody": "Create a program to start enrolling students.",
    "profile.studentReviews": "Student reviews",
    "profile.noReviewsCoachHeading": "No reviews yet",
    "profile.noReviewsCoachBody": "When your students review you, they'll appear here.",
    "profile.overallRating": "Overall rating",
    "profile.specialty": "Specialty",
    "profile.whatITeach": "What I teach",
    "profile.defineFormatsSelf": "Define your formats in your profile.",

    // ── Reviews (singular/plural) ──
    "profile.reviewSingular": "review",
    "profile.reviewPlural": "reviews",

    // ── Student profile (STUDENT view) ──
    "profile.kpiBadges": "Badges",
    "profile.kpiStreak": "Streak",
    "profile.myProgramsStudent": "My programs",
    "profile.explore": "Explore",
    "profile.notEnrolledHeading": "You're not enrolled yet",
    "profile.notEnrolledBody": "Once you enroll in a program, it'll appear here.",
    "profile.exploreProgramsBtn": "Explore programs",
    "profile.yourRank": "Your rank",
    "profile.currentLevel": "Current level",
    // [MOCKUP 2026-08] short caption inside the conic ring (9px uppercase)
    "profile.levelCap": "Level",
    "profile.xpToNextLevel": "XP to the next level",
    "profile.featuredBadges": "Featured badges",
    "profile.viewAll": "View all",
    "profile.noBadgesStudent": "You haven't earned any badges yet. Train to unlock them!",

    // ── Public coach profile (STUDENT view) ──
    "profile.howTheyWork": "How they work",
    "profile.noMethodologyCoach": "This coach hasn't described their methodology yet.",
    "profile.programs": "Programs",
    "profile.noProgramsPublished": "No published programs",
    "profile.reviews": "Reviews",
    "profile.beFirstReview": "Be the first to leave a review.",
    "profile.rating": "Rating",
    "profile.formats": "Formats",
    "profile.notSpecified": "Not specified.",

    // ── Review box (leave / show) ──
    "profile.published": "Published",
    "profile.yourReview": "Your review",
    "profile.leaveReview": "Leave a review",
    "profile.verifiedBookingOnly": "Complete a 1:1 session with this coach to be able to review them — verified bookings only.",
    "profile.yourExperience": "Your experience",
    "profile.leaveYourReview": "Leave your review",
    "profile.reviewPlaceholder": "Tell other students about your experience…",
    "profile.publishReview": "Publish review",
  },
};
