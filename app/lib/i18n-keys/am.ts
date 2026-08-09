/* OTR Aula · i18n keys — scr-admin-metrics.ts (prefix "am")
   Diccionario por-pantalla para "Métricas de negocio" (Admin). Default-safe:
   solo datos. es = texto original exacto de la pantalla; en = traducción
   profesional natural. Consumido por el helper t() de ./i18n. */
export const dict = {
  es: {
    // page head
    "am.title": "Métricas de negocio",
    "am.subtitle": "Usuarios, reservas, debates y cursos — el estado de OTR de un vistazo",
    "am.exportEnrollments": "Exportar inscripciones (CSV)",
    "am.funnelFirstAction": "Primera acción core",
    "am.northStar": "Alumnos activos (7 días)",
    "am.exportBookings": "Exportar reservas (CSV)",

    // KPIs (fila principal)
    "am.kpiUsers": "Usuarios totales",
    "am.kpiGmv": "GMV (escrow simulado)",
    "am.kpiBookings": "Reservas",
    "am.kpiDebatesPending": "Debates pendientes",

    // KPIs (contexto adicional)
    "am.kpiCoursesPublished": "Cursos publicados",
    "am.kpiEnrollments": "Inscripciones a cursos",
    "am.kpiTournaments": "Torneos",
    "am.kpiTournamentRegs": "Inscripciones a torneos",

    // embudo de alumnos
    "am.funnelTitle": "Embudo de alumnos",
    "am.funnelSub": "Conversión desde estudiante registrado hasta alumno con reserva",
    "am.funnelStudents": "Estudiantes registrados",
    "am.funnelPlaced": "Con evaluación inicial",
    "am.funnelEnrolled": "Con inscripción",
    "am.funnelBooked": "Con reserva",

    // registros por semana
    "am.weeklyTitle": "Registros por semana",
    "am.weeklySub": "Últimas 8 semanas",
    "am.weeklyEmpty": "Sin registros nuevos en este rango",

    // tablas
    "am.usersByRoleTitle": "Usuarios por rol",
    "am.membershipTitle": "Membresías",
    "am.bookingsByStatusTitle": "Reservas por estado",
    "am.thRole": "Rol",
    "am.thTier": "Plan",
    "am.thStatus": "Estado",
    "am.thCountUsers": "Usuarios",
    "am.thCountBookings": "Reservas",
    "am.tableEmpty": "Sin datos todavía",

    // membership tiers
    "am.tierFree": "Gratis",
    "am.tierPro": "Pro",
    "am.tierElite": "Elite",

    // loading / error
    "am.loadingTitle": "Cargando métricas…",
    "am.loadingBody": "Estamos calculando el panorama de negocio.",
    "am.errLoad": "No se pudieron cargar las métricas",
  },
  en: {
    // page head
    "am.title": "Business metrics",
    "am.subtitle": "Users, bookings, debates and courses — OTR's status at a glance",
    "am.exportEnrollments": "Export enrollments (CSV)",
    "am.funnelFirstAction": "First core action",
    "am.northStar": "Active students (7 days)",
    "am.exportBookings": "Export bookings (CSV)",

    // KPIs (main row)
    "am.kpiUsers": "Total users",
    "am.kpiGmv": "GMV (simulated escrow)",
    "am.kpiBookings": "Bookings",
    "am.kpiDebatesPending": "Pending debates",

    // KPIs (extra context)
    "am.kpiCoursesPublished": "Published courses",
    "am.kpiEnrollments": "Course enrollments",
    "am.kpiTournaments": "Tournaments",
    "am.kpiTournamentRegs": "Tournament registrations",

    // student funnel
    "am.funnelTitle": "Student funnel",
    "am.funnelSub": "Conversion from registered student to student with a booking",
    "am.funnelStudents": "Registered students",
    "am.funnelPlaced": "With initial placement",
    "am.funnelEnrolled": "With enrollment",
    "am.funnelBooked": "With booking",

    // registrations by week
    "am.weeklyTitle": "Registrations by week",
    "am.weeklySub": "Last 8 weeks",
    "am.weeklyEmpty": "No new registrations in this range",

    // tables
    "am.usersByRoleTitle": "Users by role",
    "am.membershipTitle": "Memberships",
    "am.bookingsByStatusTitle": "Bookings by status",
    "am.thRole": "Role",
    "am.thTier": "Plan",
    "am.thStatus": "Status",
    "am.thCountUsers": "Users",
    "am.thCountBookings": "Bookings",
    "am.tableEmpty": "No data yet",

    // membership tiers
    "am.tierFree": "Free",
    "am.tierPro": "Pro",
    "am.tierElite": "Elite",

    // loading / error
    "am.loadingTitle": "Loading metrics…",
    "am.loadingBody": "We're crunching the business overview.",
    "am.errLoad": "Couldn't load the metrics",
  },
};
