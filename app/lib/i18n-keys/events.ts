/* OTR Aula · i18n keys — scr-events.ts (prefix "events")
   Diccionario por-pantalla para "Eventos". Default-safe: solo datos.
   es = texto original exacto reemplazado en la pantalla; en = traducción
   profesional natural. Consumido por el helper t() de ./i18n. */
export const dict = {
  es: {
    // page head
    "events.title": "Eventos",
    "events.subtitle": "Seminarios, sesiones en vivo y torneos — todo en un lugar",

    // sección Próximos eventos
    "events.upcomingTitle": "Próximos eventos",
    // [MOCKUP 2026-08] chips de tipo de la fila .evrow (versalitas, 10/800)
    "events.chipEvent": "Evento",
    "events.chipTournament": "Torneo",
    "events.emptyEventsTitle": "Aún no hay eventos en agenda",
    "events.emptyEventsBody": "Cuando OTR programe un seminario, sesión en vivo o workshop, aparecerá aquí.",

    // sección Próximos torneos (debate) — datos en DB.tournaments (status UPCOMING/LIVE).
    "events.upcomingTournamentsTitle": "Próximos torneos",
    "events.nextTournamentEyebrow": "Próximo torneo",
    "events.moreTournamentsSoon": "Más torneos en camino — mantente atento.",
    "events.tournamentRegister": "Inscribirme",
    "events.tournamentRegistered": "Inscripción confirmada",
    "events.tournamentRegisterError": "No se pudo inscribir — inténtalo de nuevo",
    "events.tournamentFallback": "Torneo",
    "events.viewAllDebateHub": "Ver todos en el Debate Hub",
    "events.emptyTournamentsTitle": "Sin torneos por ahora",
    "events.emptyTournamentsBody": "Cuando OTR abra inscripciones lo verás aquí. Mientras, suma rondas de práctica.",

    // [F6.2] Gestión de torneos (SOLO staff: ADMIN/TEACHER).
    "events.tnNew": "Torneo",
    "events.tnEdit": "Editar",
    "events.tnDelete": "Borrar",
    "events.tnCreateTitle": "Nuevo torneo",
    "events.tnEditTitle": "Editar torneo",
    "events.tnFieldName": "Nombre",
    "events.tnFieldFormat": "Formato",
    "events.tnFieldAgeDivision": "División",
    "events.tnFieldRegion": "Región",
    "events.tnFieldModality": "Modalidad",
    "events.tnFieldEntry": "Cuota de inscripción (RD$)",
    "events.tnFieldSource": "Origen",
    "events.tnFieldStatus": "Estado",
    "events.tnFieldStartsAt": "Fecha de inicio",
    "events.tnModalityOnline": "En línea",
    "events.tnModalityPresencial": "Presencial",
    "events.tnModalityHibrido": "Híbrido",
    "events.tnSourceOTR": "OTR",
    "events.tnSourceExternal": "Externo",
    "events.tnStatusUpcoming": "Próximo",
    "events.tnStatusLive": "En vivo",
    "events.tnStatusDone": "Finalizado",
    "events.tnCreated": "Torneo creado",
    "events.tnUpdated": "Torneo actualizado",
    "events.tnDeleted": "Torneo borrado",
    "events.tnDeleteConfirm": "¿Borrar el torneo \"{name}\"? Esta acción no se puede deshacer.",
    "events.tnError": "No se pudo completar — inténtalo de nuevo",
  },
  en: {
    // page head
    "events.title": "Events",
    "events.subtitle": "Seminars, live sessions and tournaments — all in one place",

    // Upcoming events section
    "events.upcomingTitle": "Upcoming events",
    // [MOCKUP 2026-08] type chips of the .evrow row (uppercase, 10/800)
    "events.chipEvent": "Event",
    "events.chipTournament": "Tournament",
    "events.emptyEventsTitle": "No events on the calendar yet",
    "events.emptyEventsBody": "When OTR schedules a seminar, live session or workshop, it will appear here.",

    // Upcoming tournaments section (debate) — data from DB.tournaments (status UPCOMING/LIVE).
    "events.upcomingTournamentsTitle": "Upcoming tournaments",
    "events.nextTournamentEyebrow": "Next tournament",
    "events.moreTournamentsSoon": "More tournaments on the way — stay tuned.",
    "events.tournamentRegister": "Register",
    "events.tournamentRegistered": "Registration confirmed",
    "events.tournamentRegisterError": "Couldn't register — try again",
    "events.tournamentFallback": "Tournament",
    "events.viewAllDebateHub": "View all in the Debate Hub",
    "events.emptyTournamentsTitle": "No tournaments right now",
    "events.emptyTournamentsBody": "When OTR opens registration you'll see it here. In the meantime, add practice rounds.",

    // [F6.2] Tournament management (staff only: ADMIN/TEACHER).
    "events.tnNew": "Tournament",
    "events.tnEdit": "Edit",
    "events.tnDelete": "Delete",
    "events.tnCreateTitle": "New tournament",
    "events.tnEditTitle": "Edit tournament",
    "events.tnFieldName": "Name",
    "events.tnFieldFormat": "Format",
    "events.tnFieldAgeDivision": "Division",
    "events.tnFieldRegion": "Region",
    "events.tnFieldModality": "Modality",
    "events.tnFieldEntry": "Entry fee (RD$)",
    "events.tnFieldSource": "Source",
    "events.tnFieldStatus": "Status",
    "events.tnFieldStartsAt": "Start date",
    "events.tnModalityOnline": "Online",
    "events.tnModalityPresencial": "In person",
    "events.tnModalityHibrido": "Hybrid",
    "events.tnSourceOTR": "OTR",
    "events.tnSourceExternal": "External",
    "events.tnStatusUpcoming": "Upcoming",
    "events.tnStatusLive": "Live",
    "events.tnStatusDone": "Finished",
    "events.tnCreated": "Tournament created",
    "events.tnUpdated": "Tournament updated",
    "events.tnDeleted": "Tournament deleted",
    "events.tnDeleteConfirm": "Delete the tournament \"{name}\"? This can't be undone.",
    "events.tnError": "Couldn't complete — try again",
  },
};
