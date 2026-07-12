// @ts-nocheck
/* OTR · Banco de contenido para los Drills de Práctica del Debate Hub (Fase 1).
   [Isaac, llamada] "vamos a poner ejercicios que ellos puedan hacer dentro de la
   plataforma" — 100% cliente, no toca DB.debate ni el rating (eso solo se mueve con
   rondas adjudicadas por el coach, ver scr-debate.ts). Cada entrada trae {es,en};
   quien la consume elige el idioma con getLang() de ./i18n (mismo patrón que scr-profile).

   DRILL_ARGS  → Refutación relámpago: una afirmación corta de un tema de debate
                 escolar, tono neutral (no toma partido), para refutar en 60s.
   DRILL_WEIGH → Weighing: pares de impactos a comparar con los 3 lentes
                 (magnitud, probabilidad, plazo). No hay respuesta "correcta". */

export const DRILL_ARGS = [
  {
    id: "uniforms",
    es: "Las escuelas deberían exigir uniforme porque reduce la presión social por la ropa y facilita mantener la disciplina en el aula.",
    en: "Schools should require uniforms because it reduces social pressure over clothing and makes classroom discipline easier to maintain.",
  },
  {
    id: "social-media-age",
    es: "Las redes sociales deberían prohibirse a menores de 16 años porque su diseño está hecho para captar la atención de cerebros que aún no maduran.",
    en: "Social media should be banned for under-16s because its design is built to hook attention in brains that haven't finished maturing.",
  },
  {
    id: "homework",
    es: "La tarea obligatoria todos los días refuerza lo aprendido en clase y enseña disciplina de estudio independiente.",
    en: "Mandatory daily homework reinforces what's learned in class and teaches independent study discipline.",
  },
  {
    id: "standardized-tests",
    es: "Los exámenes estandarizados son la forma más justa de comparar el desempeño de estudiantes de escuelas muy distintas.",
    en: "Standardized tests are the fairest way to compare performance across students from very different schools.",
  },
  {
    id: "phones-in-class",
    es: "Los celulares deberían prohibirse por completo en el salón de clases porque son la principal fuente de distracción de los estudiantes.",
    en: "Cellphones should be banned entirely from the classroom because they're the main source of student distraction.",
  },
  {
    id: "longer-school-year",
    es: "Alargar el año escolar en un mes cerraría la brecha de aprendizaje que dejan las vacaciones largas.",
    en: "Extending the school year by a month would close the learning gap left by long vacations.",
  },
  {
    id: "community-service",
    es: "El servicio comunitario obligatorio para graduarse forma ciudadanos más comprometidos con su entorno.",
    en: "Mandatory community service for graduation builds citizens who are more engaged with their community.",
  },
  {
    id: "voting-age-16",
    es: "La edad para votar debería bajar a 16 años porque a esa edad ya se paga trabajo, se paga impuestos indirectos y se vive con las decisiones de política pública.",
    en: "The voting age should drop to 16 because by then people already work, pay indirect taxes, and live with public-policy decisions.",
  },
  {
    id: "narrative-grades",
    es: "Reemplazar las calificaciones numéricas por retroalimentación narrativa reduce la ansiedad y da información más útil sobre el progreso real.",
    en: "Replacing numeric grades with narrative feedback reduces anxiety and gives more useful information about real progress.",
  },
  {
    id: "ai-in-assignments",
    es: "Permitir herramientas de IA en las tareas prepara mejor a los estudiantes para un mercado laboral donde esas herramientas ya son estándar.",
    en: "Allowing AI tools in assignments better prepares students for a job market where those tools are already standard.",
  },
];

export const DRILL_WEIGH = [
  {
    id: "hours-vs-access",
    a: { es: "1,000 estudiantes pierden 1 hora de clase a la semana.", en: "1,000 students lose 1 hour of class per week." },
    b: { es: "10 estudiantes pierden el acceso total a la escuela.", en: "10 students lose all access to school." },
  },
  {
    id: "budget-vs-transport",
    a: { es: "El distrito ahorra $2 millones al año en mantenimiento.", en: "The district saves $2 million a year on maintenance." },
    b: { es: "50 familias no pueden pagar el aumento en la cuota de transporte.", en: "50 families can't afford the transportation-fee increase." },
  },
  {
    id: "stress-vs-scholarship",
    a: { es: "El 80% de los estudiantes reporta menos estrés en los exámenes.", en: "80% of students report less exam-related stress." },
    b: { es: "El 5% de los estudiantes pierde la beca por no llegar al puntaje mínimo.", en: "5% of students lose their scholarship for missing the minimum score." },
  },
  {
    id: "attendance-now-vs-later",
    a: { es: "Una política reduce el ausentismo un 15% este año.", en: "A policy cuts absenteeism 15% this year." },
    b: { es: "Otra política eliminaría el ausentismo por completo, pero recién en 5 años.", en: "Another policy would eliminate absenteeism entirely, but not for 5 years." },
  },
  {
    id: "wifi-vs-privacy",
    a: { es: "200 estudiantes acceden a internet gratuito en la escuela.", en: "200 students get free internet access at school." },
    b: { es: "2 estudiantes sufren una filtración de sus datos personales.", en: "2 students suffer a leak of their personal data." },
  },
  {
    id: "sleep-vs-jobs",
    a: { es: "El nuevo horario mejora el sueño de 3,000 estudiantes.", en: "The new schedule improves sleep for 3,000 students." },
    b: { es: "30 estudiantes pierden su empleo de medio tiempo por el cambio de horario.", en: "30 students lose their part-time job because of the schedule change." },
  },
  {
    id: "fights-vs-expulsion",
    a: { es: "Una regla evita 10 peleas al mes en el patio.", en: "A rule prevents 10 fights a month in the schoolyard." },
    b: { es: "Esa misma regla causa la expulsión permanente de 1 estudiante al mes.", en: "That same rule causes the permanent expulsion of 1 student a month." },
  },
  {
    id: "tutoring-vs-advanced",
    a: { es: "El programa gratuito de tutoría llega a 500 estudiantes de bajos recursos.", en: "The free tutoring program reaches 500 low-income students." },
    b: { es: "5 estudiantes muy avanzados se quedan sin el programa que sí necesitan.", en: "5 highly advanced students are left without the program they actually need." },
  },
];
