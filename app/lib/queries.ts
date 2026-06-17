// OTR LMS · funciones de consulta — leen de la base de datos (Prisma).
import { db } from "./db";
import { esc } from "./esc";
import { safeUrl } from "./api";
import { dateLabel, timeLabel } from "./consultations";

const ME_EMAIL = "analia.reyes@otr.do";
const TEACHER_EMAIL = "saul@otr.do";
const MAIN_COURSE = "PF-101";

// Etiqueta de fecha relativa en español (texto generado por nosotros, no de usuario).
function whenLabel(d?: Date | null): string {
  if (!d) return "";
  const date = d instanceof Date ? d : new Date(d);
  const ms = Date.now() - date.getTime();
  if (Number.isNaN(ms)) return "";
  const min = Math.floor(ms / 60000);
  if (min < 1) return "ahora";
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const days = Math.floor(h / 24);
  if (days < 7) return `hace ${days} ${days === 1 ? "día" : "días"}`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `hace ${weeks} sem`;
  const months = Math.floor(days / 30);
  if (months < 12) return `hace ${months} ${months === 1 ? "mes" : "meses"}`;
  const years = Math.floor(days / 365);
  return `hace ${years} ${years === 1 ? "año" : "años"}`;
}

// Día calendario en hora RD (UTC-4) como entero, para comparar actividad por día.
const RD_OFFSET_MS = -4 * 3600000;
function dayNumRD(d: Date): number {
  const dt = d instanceof Date ? d : new Date(d);
  return Math.floor((dt.getTime() + RD_OFFSET_MS) / 86400000);
}

// [GAMIFICATION-2 §9] Racha REAL y NO predatoria, derivada del ledger (ActivityEvent).
// Cuenta días consecutivos con actividad y tolera UN día perdido (grace/freeze): un solo
// hueco no rompe la racha; dos días seguidos sin actividad sí. Se calcula EN LECTURA (no
// un contador almacenado que castiga un olvido reiniciándose a 0 — eso sería predatorio).
function computeStreak(events: Array<{ createdAt: Date }>): number {
  if (!events || !events.length) return 0;
  const active = new Set(events.map((e) => dayNumRD(e.createdAt)));
  const today = Math.floor((Date.now() + RD_OFFSET_MS) / 86400000);
  // La racha está viva solo si hubo actividad hoy o ayer.
  let cursor = active.has(today) ? today : active.has(today - 1) ? today - 1 : null;
  if (cursor === null) return 0;
  let streak = 0, graceUsed = false;
  while (cursor >= today - 400) {
    if (active.has(cursor)) { streak++; cursor--; }
    else if (!graceUsed) { graceUsed = true; cursor--; } // perdona un único hueco (freeze)
    else break;
  }
  return streak;
}

// [DASHBOARD-ACCESS-2 §4] Estado de ciclo de vida para adaptar el dashboard al usuario:
//   new       — sin actividad aún (recién registrado / sin placement).
//   active    — actividad en los últimos 2 días.
//   returning — volvió tras 3-13 días fuera.
//   lapsed    — 14+ días sin actividad ("bienvenido de nuevo").
function lifecycleState(events: Array<{ createdAt: Date }>, isNew: boolean): { state: string; daysAway: number | null } {
  if (isNew || !events || !events.length) return { state: "new", daysAway: null };
  const today = Math.floor((Date.now() + RD_OFFSET_MS) / 86400000);
  const last = Math.max(...events.map((e) => dayNumRD(e.createdAt)));
  const daysAway = today - last;
  const state = daysAway >= 14 ? "lapsed" : daysAway >= 3 ? "returning" : "active";
  return { state, daysAway };
}

// Etiqueta legible mes + año en español, tipo "jun 2026" (texto generado por nosotros).
const MONTHS_ES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const MONTHS_ES_FULL = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
function monthYearLabel(d?: Date | null): string {
  if (!d) return "";
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return "";
  return `${MONTHS_ES[date.getMonth()]} ${date.getFullYear()}`;
}

// Etiqueta corta de día "12 jun" (journey/atribución del Lifetime Profile, PRD §8).
function shortDateLabel(d?: Date | string | null): string {
  if (!d) return "";
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getDate()} ${MONTHS_ES[date.getMonth()]}`;
}

// Etiqueta de mes completo capitalizado "Junio 2026" (agrupa el journey, PRD §8).
function monthFullLabel(d?: Date | string | null): string {
  if (!d) return "";
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return "";
  const m = MONTHS_ES_FULL[date.getMonth()];
  return `${m.charAt(0).toUpperCase()}${m.slice(1)} ${date.getFullYear()}`;
}

// Etiqueta de fecha de evento futuro tipo "12 jun · 9:00 AM" (texto generado por
// nosotros). Usada para el inicio de los torneos del Debate Hub.
function eventDateLabel(d?: Date | null): string {
  if (!d) return "";
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return "";
  const day = date.getDate();
  const mon = MONTHS_ES[date.getMonth()];
  let h = date.getHours();
  const min = date.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  const mm = min.toString().padStart(2, "0");
  return `${day} ${mon} · ${h}:${mm} ${ampm}`;
}

// Las 6 dimensiones del radar OTR, en el orden fijo del contrato.
const OTR_SKILLS = ["Confianza", "Estructura", "Evidencia", "Refutación", "Cross-ex", "Delivery"];

// Promedio de ratings redondeado a 1 decimal (0 si no hay reseñas).
function avgRating(ratings: number[]): number {
  if (!ratings.length) return 0;
  const sum = ratings.reduce((a, b) => a + (b || 0), 0);
  return Math.round((sum / ratings.length) * 10) / 10;
}

// Convierte el string de "formats" (separado por coma) en lista de strings escapados.
function formatsList(formats?: string | null): string[] {
  return String(formats ?? "")
    .split(",")
    .map((f) => f.trim())
    .filter(Boolean)
    .map((f) => esc(f));
}

// Forma del quiz para el cliente (sección 2 CONTRACT.md). Texto de usuario escapado.
// Para ESTUDIANTE las opciones NO incluyen 'correct' (anti-trampa);
// para PROFESOR/ADMIN sí, para poder editar.
function buildQuiz(quiz: any, isTeacher: boolean) {
  if (!quiz) return null;
  return {
    id: quiz.id,
    lessonId: quiz.lessonId,
    title: esc(quiz.title),
    passScore: quiz.passScore,
    questions: (quiz.questions || []).map((q: any) => ({
      id: q.id,
      prompt: esc(q.prompt),
      options: (q.options || []).map((o: any) =>
        isTeacher
          ? { id: o.id, text: esc(o.text), correct: o.correct }
          : { id: o.id, text: esc(o.text) },
      ),
    })),
  };
}

export async function getAppData(email: string = ME_EMAIL, lang: string = "es", preloaded?: any) {
  // PRD §17.3: "i18n is structural, not a wrapper". El contenido de cursos y
  // lecciones se sirve en el idioma activo, cayendo al ES si no hay traducción.
  // `lang` lo decide el SERVER (cookie otr_lang vía next/headers) y lo pasa quien
  // llama a getAppData — aquí NO se puede leer document.cookie (corre en server).
  // pickLang(es, en): devuelve la variante EN solo si lang==='en' Y existe; si no, ES.
  const wantEn = lang === "en";
  const pickLang = (es?: string | null, en?: string | null): string =>
    wantEn && en != null && en !== "" ? (en as string) : (es ?? "");
  // [BE-03] Reusa el User ya resuelto por getSessionUser en el MISMO request si el llamador
  // lo pasa (preloaded), evitando un segundo findUnique del mismo usuario por email (ahorra un
  // round-trip por refresh). base.me se construye campo a campo (no hace spread de `me`), así que
  // passwordHash no se filtra al cliente aunque venga en el objeto preloaded.
  // select defensivo (cuando NO hay preloaded): NUNCA traer passwordHash ni emailVerified.
  const me = preloaded || await db.user.findUnique({
    where: { email },
    select: {
      id: true, name: true, email: true, role: true, initials: true, level: true,
      xp: true, streak: true, headline: true, bio: true, teachingStyle: true,
      formats: true, location: true, avatarUrl: true, preferences: true,
      // PRD §4: rating de debate (Glicko-2) para la Debate Rank card del dashboard.
      debateRating: true, debateRd: true, debateTier: true,
      // [RATING-2 §6.2] Speaker Rating: promedio de oratoria, métrica separada del W/L.
      speakerAvg: true, speakerRounds: true,
      // [GAMIFICATION-1 §9] opt-in de la clasificación pública (toggle en Ajustes).
      leaderboardOptIn: true,
      // PRD §7 Safety Gate: ageBand alimenta el candado de consentimiento del marketplace.
      ageBand: true,
      // PRD §11.3 / §2.2: placedAt (null = estudiante nuevo sin placement) → me.needsPlacement.
      placedAt: true,
      // PRD §13: membresía simulada · PRD §8 identity (lang) · §8.4 perfil público.
      membership: true, membershipSince: true, publicSlug: true, publicProfile: true, lang: true,
    },
  });
  const isTeacher = me?.role === "TEACHER" || me?.role === "ADMIN";
  const myRole = (me?.role || "STUDENT").toLowerCase(); // rol REAL: student | teacher | admin

  const [
    teacher, levels, meEnrollments, pfModules, pfStudents,
    gradeCells, competencies, badges, notifications, events, activity,
    threads, mainThread, convos, allCourses, allModules, taughtCourses,
    resources, mainCourse, myStudentSkills, myCertificates, coachProfiles,
  ] = await Promise.all([
    db.user.findUnique({ where: { email: TEACHER_EMAIL }, select: { name: true, email: true, initials: true, headline: true, bio: true, teachingStyle: true, formats: true, location: true } }),
    db.level.findMany({ orderBy: { position: "asc" } }),
    db.enrollment.findMany({ where: { user: { email } }, include: { course: true }, orderBy: { course: { position: "asc" } } }),
    db.module.findMany({ where: { course: { code: MAIN_COURSE } }, include: { lessons: { orderBy: { position: "asc" } } }, orderBy: { position: "asc" } }),
    // Roster de estudiantes: solo para profesor/admin (un estudiante NUNCA debe verlo).
    isTeacher
      ? db.enrollment.findMany({ where: { course: { code: MAIN_COURSE } }, include: { user: true }, orderBy: { user: { xp: "desc" } }, take: 200 })
      : Promise.resolve([]),
    // Gradebook: solo profesor/admin.
    isTeacher ? db.gradeCell.findMany({ orderBy: [{ studentPos: "asc" }, { colPos: "asc" }] }) : Promise.resolve([]),
    db.competency.findMany({ orderBy: { position: "asc" } }),
    db.badge.findMany({ orderBy: { position: "asc" } }),
    db.notification.findMany({ orderBy: { position: "asc" }, take: 200 }),
    db.eventItem.findMany({ orderBy: { position: "asc" }, take: 200 }),
    db.activityItem.findMany({ orderBy: { position: "asc" }, take: 200 }),
    // Foro APAGADO (PRD-estricto, Fase 3 §10): no se cargan ni envían threads.
    Promise.resolve([] as any[]),
    Promise.resolve(null as any),
    // PRD §7.4/§17.4: las conversaciones se scopean por participante (no se cargan
    // todas). El usuario solo recibe aquellas donde es ConversationParticipant.
    // Fallback legacy: conversaciones SIN ningún participante registrado (seed viejo)
    // se incluyen para no romper. me?.id puede faltar (sin sesión) → [].
    me
      ? db.conversation.findMany({
          where: { participants: { some: { userId: me.id } } },
          orderBy: { position: "asc" },
          take: 50,
          include: { messages: { orderBy: { position: "asc" }, take: 200 } },
        })
      : Promise.resolve([] as any[]),
    db.course.findMany({ where: { published: true }, orderBy: { position: "asc" }, select: { id: true, code: true, name: true, nameEn: true, color: true, coachName: true, priceCents: true, format: true, modality: true } }),
    // Mapa de módulos para gestión de contenido: solo profesor/admin.
    isTeacher ? db.module.findMany({ where: { course: { teacher: { email } } }, orderBy: { position: "asc" }, select: { id: true, courseId: true, title: true } }) : Promise.resolve([]),
    // Cursos impartidos (con reseñas para el perfil del coach): solo profesor/admin.
    isTeacher
      ? db.course.findMany({ where: { teacher: { email } }, include: { modules: { include: { lessons: { orderBy: { position: "asc" } } }, orderBy: { position: "asc" } }, reviews: { include: { student: true }, orderBy: { createdAt: "desc" } } }, orderBy: { position: "asc" } })
      : Promise.resolve([]),
    // Arsenal (recursos), ordenados por posición y luego por creación.
    // Arsenal APAGADO (PRD-estricto): no se cargan recursos.
    Promise.resolve([] as any[]),
    // Curso principal con su profesor, programas del coach y reseñas (para coachProfile del estudiante).
    db.course.findUnique({
      where: { code: MAIN_COURSE },
      include: {
        // select defensivo del coach: solo los campos que consume buildCoachProfile (sin passwordHash).
        teacher: { select: { id: true, name: true, initials: true, headline: true, bio: true, teachingStyle: true, formats: true, location: true } },
        reviews: { include: { student: true }, orderBy: { createdAt: "desc" } },
      },
    }),
    // Habilidades (radar) del estudiante logueado. [] si no existe el usuario.
    me ? db.studentSkill.findMany({ where: { userId: me.id } }) : Promise.resolve([]),
    // Certificados del estudiante logueado, con el curso para obtener programName.
    me
      ? db.certificate.findMany({ where: { userId: me.id }, orderBy: { issuedAt: "desc" } })
      : Promise.resolve([]),
    // Marketplace (PRD §7): perfiles de coach ACTIVOS con paquetes y disponibilidad.
    // Visible para TODOS los roles (browse/search de coaches).
    // [ENT-07] El filtro/orden del marketplace es en cliente sobre este conjunto. Subimos el
    // techo a 500 para eliminar el "cliff" de coaches que desaparecían >100 en cualquier escala
    // realista cercana. La paginación server-side real (cursor + filtro/orden en /api/coaches,
    // que ya existe) es el fix definitivo para miles de coaches — diferido a su propio esfuerzo.
    db.coachProfile.findMany({
      where: { active: true },
      include: {
        packages: { orderBy: { position: "asc" } },
        availability: { orderBy: [{ weekday: "asc" }, { startMin: "asc" }] },
      },
      take: 500,
    }),
  ]);

  // [fix nivel] El rango (Novato 0-999 · JV 1000-2499 · Varsity 2500-4999 · Elite 5000+) se
  // DERIVA del XP, NO del User.level almacenado: el placement llegó a fijar level por el promedio
  // de skills, dejando a alumnos con 0 XP marcados como JV. La fuente de verdad es el XP (igual que
  // el quiz-attempt al subir de nivel). Así "todos inician en Novato" y el badge nunca contradice al XP.
  const _meXp = me?.xp ?? 0;
  const curLevel = [...levels].sort((a, b) => (b.startXp ?? 0) - (a.startXp ?? 0)).find((l) => _meXp >= (l.startXp ?? 0)) ?? levels[0];
  const derivedLevelName = curLevel?.name || "Novato";
  // [fix] Helper reutilizable: nombre de rango DERIVADO del XP (para el usuario y para los hijos
  // del portal de familia) — la fuente canónica del rango es el XP, no el User.level almacenado.
  const levelNameForXp = (xp: number) => ([...levels].sort((a, b) => (b.startXp ?? 0) - (a.startXp ?? 0)).find((l) => (Number(xp) || 0) >= (l.startXp ?? 0)) ?? levels[0])?.name || "Novato";
  const nextLevel = levels.find((l) => l.position === (curLevel?.position ?? 0) + 1);
  const xpLevelStart = curLevel?.startXp ?? 0;
  const xpNext = nextLevel?.startXp ?? (curLevel?.startXp ?? 0);

  const colMap = new Map<number, string>();
  gradeCells.forEach((c) => colMap.set(c.colPos, c.colName));
  const cols = [...colMap.entries()].sort((a, b) => a[0] - b[0]).map((e) => e[1]);
  const studentPositions = [...new Set(gradeCells.map((c) => c.studentPos))].sort((a, b) => a - b);
  const gbRows = studentPositions.map((sp) => {
    const cells = gradeCells.filter((c) => c.studentPos === sp).sort((a, b) => a.colPos - b.colPos);
    return { n: esc(cells[0]?.studentName), i: esc(cells[0]?.studentInit), g: cells.map((c) => c.value) };
  });

  const enrolledIds = new Set(meEnrollments.map((e) => e.courseId));

  // --- Datos reales del estudiante para notas y progreso -------------------
  // Cargados en paralelo: progreso de lecciones (LessonProgress), entregas
  // calificadas (Submission GRADED) y exámenes (QuizAttempt) del usuario actual,
  // y todas las lecciones de sus cursos inscritos (para el % de progreso real).
  // Para el profesor: conteo de entregas pendientes de sus cursos.
  const taughtCodes = isTeacher ? taughtCourses.map((c: any) => c.code) : [];
  // Ids de los cursos cuyos quizzes nos interesan: impartidos (profesor) o
  // inscritos (alumno). Se usan para cargar los exámenes reales sin N+1.
  const taughtIds = isTeacher ? taughtCourses.map((c: any) => c.id) : [];
  const quizCourseIds = isTeacher ? taughtIds : [...enrolledIds];
  // [l7] Para ESTUDIANTE: el dashboard/courseModules deriva del PRIMER curso REAL
  // inscrito (meEnrollments ya viene ordenado por course.position asc). Si no hay
  // ninguna inscripción → [] (no se fuerza PF-101). El profesor mantiene PF-101.
  const firstEnrolledCourseId = !isTeacher ? (meEnrollments[0]?.courseId ?? null) : null;
  const firstTaughtCourseId = isTeacher ? (taughtCourses[0]?.id ?? null) : null;
  // [P0 de-mock] El "curso principal" ya NO es el hardcoded PF-101:
  //   · estudiante → su PRIMER curso inscrito (coach/reseñas/programas REALES de ese curso)
  //   · profesor   → su PRIMER curso impartido (roster real para el dashboard)
  const [studentMainCourse, taughtRoster] = await Promise.all([
    (!isTeacher && firstEnrolledCourseId)
      ? db.course.findUnique({
          where: { id: firstEnrolledCourseId },
          include: {
            teacher: { select: { id: true, name: true, email: true, initials: true, headline: true, bio: true, teachingStyle: true, formats: true, location: true } },
            reviews: { include: { student: true }, orderBy: { createdAt: "desc" } },
          },
        })
      : Promise.resolve(null),
    (isTeacher && firstTaughtCourseId)
      ? db.enrollment.findMany({ where: { courseId: firstTaughtCourseId }, include: { user: true }, orderBy: { user: { xp: "desc" } }, take: 200 })
      : Promise.resolve([] as any[]),
  ]);
  // mainCourse efectivo (estudiante) + coach REAL de su curso (ya no PF-101/saul).
  const effMainCourse: any = isTeacher ? null : studentMainCourse;
  const studentCoach = !isTeacher ? (studentMainCourse?.teacher ?? null) : null;
  // base.teacher: profesor → él mismo; estudiante → coach del curso en que está inscrito.
  const headCoach: any = isTeacher ? me : studentCoach;
  const [
    myProgress, mySubs, myQuizzes, enrolledLessons, pendingSubs, quizRows, studentModules,
    coachPrograms, myReviewRow, activityEvents,
    debateRecords, debateCriteriaScores, leaderboardRows, upcomingTournaments, myLeaderboardAhead,
    coachUsers, myBookingRows, parentGuardianships, myTournamentRegs,
    coachBookingRows, myCoachProfileRow,
  ] = await Promise.all([
    me ? db.lessonProgress.findMany({ where: { userId: me.id, done: true } }) : Promise.resolve([]),
    // Una sola consulta de TODAS las entregas del usuario; las GRADED se derivan en JS.
    // (Antes había dos findMany: GRADED + todas. select defensivo: solo campos usados.)
    me ? db.submission.findMany({ where: { userId: me.id }, orderBy: { createdAt: "desc" }, take: 300, select: { id: true, status: true, activity: true, grade: true, feedback: true, kind: true, fileUrl: true, fileName: true, textBody: true, courseCode: true, createdLabel: true } }) : Promise.resolve([]),
    me ? db.quizAttempt.findMany({ where: { userId: me.id }, orderBy: { createdAt: "desc" } }) : Promise.resolve([]),
    // Lecciones (id + courseId) de los cursos en que está inscrito, para el % real.
    meEnrollments.length
      ? db.lesson.findMany({ where: { module: { courseId: { in: [...enrolledIds] } } }, select: { id: true, hidden: true, module: { select: { courseId: true, hidden: true } } } })
      : Promise.resolve([]),
    // Entregas pendientes (no calificadas) de los cursos del profesor.
    isTeacher && taughtCodes.length
      ? db.submission.count({ where: { status: { not: "GRADED" }, courseCode: { in: taughtCodes } } })
      : Promise.resolve(0),
    // Exámenes reales (Quiz) de las lecciones de los cursos del usuario, con
    // preguntas y opciones ordenadas por posición. Una sola consulta (sin N+1).
    quizCourseIds.length
      ? db.quiz.findMany({
          where: { lesson: { module: { courseId: { in: quizCourseIds } } } },
          include: { questions: { orderBy: { position: "asc" }, include: { options: { orderBy: { position: "asc" } } } } },
        })
      : Promise.resolve([]),
    // Módulos de TODOS los cursos inscritos del estudiante (Moodle multi-curso):
    // el dashboard usa el primero; S.course/coursesContent navegan cualquiera.
    !isTeacher && enrolledIds.size
      ? db.module.findMany({ where: { courseId: { in: [...enrolledIds] } }, include: { lessons: { orderBy: { position: "asc" } } }, orderBy: [{ courseId: "asc" }, { position: "asc" }] })
      : Promise.resolve([]),
    // Programas del coach (STUDENT): no depende de resultados de esta ola → paralelo.
    studentCoach
      ? db.course.findMany({
          where: { teacherId: studentCoach.id },
          orderBy: { position: "asc" },
          select: { id: true, code: true, name: true, nameEn: true, format: true, modality: true, priceCents: true, color: true, summary: true, summaryEn: true },
        })
      : Promise.resolve([]),
    // Mi reseña del curso principal: solo depende de me + mainCourse (ya resueltos) → paralelo.
    me && effMainCourse
      ? db.review.findUnique({ where: { courseId_studentId: { courseId: effMainCourse.id, studentId: me.id } } })
      : Promise.resolve(null),
    // Spine ActivityEvent (PRD §4 + §8): últimos 60 eventos del usuario, UNA sola
    // consulta para dos consumidores — DB.activity usa los primeros 15 (desc) y
    // DB.lifetime.journey los 60 invertidos a orden cronológico (asc).
    me
      ? db.activityEvent.findMany({ where: { userId: me.id }, orderBy: { createdAt: "desc" }, take: 60 })
      : Promise.resolve([]),
    // --- Debate Hub (PRD §6) — solo para roles CON sesión (me existe) ---------
    // history + recentForm: DebateRecord del usuario con su RatingUpdate 1:1.
    // take 50 (history); recentForm usa los primeros 5 (ya vienen desc).
    me
      ? db.debateRecord.findMany({
          where: { userId: me.id },
          orderBy: { recordedAt: "desc" },
          take: 50,
          include: { rating: true },
        })
      : Promise.resolve([]),
    // analytics.criteria: promedio de RubricScore por criterio across los ballots
    // del usuario. Cargamos las RubricScore de los ballots de sus DebateRecord.
    me
      ? db.rubricScore.findMany({
          where: { ballot: { debate: { userId: me.id } } },
          select: { criterion: true, score: true },
        })
      : Promise.resolve([]),
    // leaderboard.rows: top 50 usuarios por debateRating desc.
    me
      ? db.user.findMany({
          where: { ageBand: { not: "minor" }, leaderboardOptIn: true }, // [P0-2] menores fuera; [GAMIFICATION-1 §9] solo quienes optaron por aparecer
          orderBy: { debateRating: "desc" },
          take: 50,
          select: { id: true, name: true, initials: true, debateRating: true, debateTier: true },
        })
      : Promise.resolve([]),
    // tournaments: UPCOMING|LIVE (take 20) ordenados por fecha de inicio.
    me
      ? db.tournament.findMany({
          where: { status: { in: ["UPCOMING", "LIVE"] } },
          orderBy: [{ startsAt: "asc" }],
          take: 20,
          include: { registrations: { where: { userId: me.id }, select: { id: true } } },
        })
      : Promise.resolve([]),
    // Rank real del usuario en el leaderboard global: nº de usuarios con
    // debateRating ESTRICTAMENTE mayor + 1 (sirve aunque no esté en el top 50).
    me ? db.user.count({ where: { ageBand: { not: "minor" }, leaderboardOptIn: true, debateRating: { gt: me.debateRating } } }) : Promise.resolve(0),
    // Marketplace (PRD §7): datos públicos del User de cada coach activo.
    // select defensivo: NUNCA passwordHash ni email (no se exponen en browse).
    coachProfiles.length
      ? db.user.findMany({
          where: { id: { in: coachProfiles.map((p) => p.userId) } },
          select: { id: true, name: true, initials: true, headline: true, avatarUrl: true, coachVerified: true, location: true },
        })
      : Promise.resolve([]),
    // "Mis reservas" (PRD §7): bookings del STUDENT con su escrow (precio/estado).
    me && me.role === "STUDENT"
      ? db.booking.findMany({ where: { studentId: me.id }, include: { escrow: true }, orderBy: { slotAt: "desc" }, take: 100 })
      : Promise.resolve([]),
    // Parent Portal (PRD §11): vínculos ACTIVE del padre con sus hijos.
    me && me.role === "PARENT"
      ? db.guardianship.findMany({ where: { parentId: me.id, status: "ACTIVE" }, orderBy: { createdAt: "asc" } })
      : Promise.resolve([]),
    // PRD §8 ledger: nº de torneos en los que el usuario se ha registrado.
    me ? db.tournamentRegistration.count({ where: { userId: me.id } }) : Promise.resolve(0),
    // Coach Workspace (PRD §7.5): TODOS los bookings donde el usuario es el coach,
    // con su escrow (inbox + earnings se derivan en JS, una sola consulta).
    isTeacher && me
      // [ENT-08] Acota el inbox del coach (antes sin límite → degradaba para coaches de
      // alto volumen). 200 reservas recientes cubren agenda próxima + historial mostrado.
      ? db.booking.findMany({ where: { coachId: me.id }, include: { escrow: true }, orderBy: { slotAt: "desc" }, take: 200 })
      : Promise.resolve([]),
    // Coach Workspace (PRD §7.5): perfil propio del coach. Se reusa coachProfiles
    // (browse) si ya viene ahí; esta consulta extra solo corre si NO está (p.ej.
    // perfil desactivado — el browse filtra active:true).
    isTeacher && me && !coachProfiles.some((p) => p.userId === me.id)
      ? db.coachProfile.findUnique({
          where: { userId: me.id },
          include: {
            packages: { orderBy: { position: "asc" } },
            availability: { orderBy: [{ weekday: "asc" }, { startMin: "asc" }] },
          },
        })
      : Promise.resolve(null),
  ]);

  // Entregas calificadas (GRADED) derivadas en JS de la consulta única de entregas.
  const mySubsGraded = (mySubs as any[]).filter((s) => s.status === "GRADED");

  // [GAMIFICATION-2 §9] Racha real (con grace de 1 día). La racha necesita cobertura por
  // DÍAS, no por eventos: activityEvents está topado a take:60 (feed/journey) y un usuario
  // muy activo (varios eventos/día) llenaría esos 60 cupos con pocos días → racha truncada.
  // Consulta dedicada: solo las FECHAS de los últimos 70 días (índice [userId,createdAt]).
  const streakRows = me
    ? await db.activityEvent.findMany({
        where: { userId: me.id, createdAt: { gte: new Date(Date.now() - 70 * 86400000) } },
        select: { createdAt: true },
      })
    : [];
  const streakDays = computeStreak(streakRows as any[]);
  // [DASHBOARD-ACCESS-2 §4] Ciclo de vida: solo necesita el evento MÁS reciente, que el
  // take:60 desc siempre incluye (incluso si fue hace meses → 'lapsed' correcto).
  const lifecycle = lifecycleState(activityEvents as any[], !!(me && me.role === "STUDENT" && !me.placedAt));

  // [l7] Origen de courseModules (dashboard): profesor → PF-101 (pfModules);
  // estudiante → módulos de su PRIMER curso inscrito. studentModules ahora trae
  // TODOS los cursos inscritos (Moodle multi-curso), así que filtramos al primero
  // para mantener el contrato del dashboard; coursesContent (abajo) trae el resto.
  const modulesForDashboard = isTeacher
    ? ((taughtCourses[0]?.modules as any[]) ?? [])
    : (studentModules as any[]).filter((m) => m.courseId === firstEnrolledCourseId);

  // Mapa lessonId -> quiz (forma del contrato). Para alumno sin 'correct'.
  const quizByLessonMap = new Map<string, any>();
  (quizRows || []).forEach((q: any) => {
    quizByLessonMap.set(q.lessonId, buildQuiz(q, isTeacher));
  });
  // DB.quizByLesson: objeto { [lessonId]: quiz } con la misma forma.
  const quizByLesson: Record<string, any> = {};
  quizByLessonMap.forEach((quiz, lessonId) => {
    quizByLesson[lessonId] = quiz;
  });

  // Conjunto de ids de lecciones completadas por el usuario (progreso real).
  const doneSet = new Set((myProgress || []).map((p: any) => p.lessonId));

  // [P2] Gating de prerrequisito: una lección está bloqueada si su releaseAfter
  // (lección previa requerida) aún no está completada. Respeta el 'locked' estático
  // que el profesor haya puesto a mano.
  const lessonLocked = (l: any): boolean =>
    l?.locked === true || (l?.releaseAfterId ? !doneSet.has(l.releaseAfterId) : false);

  // Total de lecciones por curso inscrito y cuántas ha completado el alumno.
  const totalByCourse = new Map<string, number>();
  const doneByCourse = new Map<string, number>();
  (enrolledLessons || []).forEach((l: any) => {
    const cid = l.module?.courseId;
    if (!cid) return;
    if (l.hidden || l.module?.hidden) return; // lo oculto por el profesor no cuenta para el progreso del alumno
    totalByCourse.set(cid, (totalByCourse.get(cid) || 0) + 1);
    if (doneSet.has(l.id)) doneByCourse.set(cid, (doneByCourse.get(cid) || 0) + 1);
  });
  const courseProgress = (courseId: string): number => {
    const total = totalByCourse.get(courseId) || 0;
    if (total === 0) return 0;
    return Math.round(((doneByCourse.get(courseId) || 0) / total) * 100);
  };

  // --- Notas reales del estudiante (Submission GRADED + QuizAttempt) --------
  // Letra derivada del score numérico (>=90 A, >=85 B+, >=80 B, >=70 C, si no —).
  const letterFor = (score: number): string => {
    if (score >= 90) return "A";
    if (score >= 85) return "B+";
    if (score >= 80) return "B";
    if (score >= 70) return "C";
    return "—";
  };
  const gradeRows: any[] = [];
  // Calificaciones del alumno: incluye el FEEDBACK escrito del coach (PRD §6.5/§7.5
  // — el alumno DEBE poder leer los comentarios, no solo la nota numérica).
  (mySubsGraded || []).forEach((s: any) => {
    if (s.grade == null) {
      gradeRows.push({ activity: esc(s.activity), score: "En revisión", letter: "—", kind: "Entrega", status: s.status, feedback: esc(s.feedback || "") });
    } else {
      const sc = s.grade;
      gradeRows.push({ activity: esc(s.activity), score: sc, letter: letterFor(sc), kind: "Entrega", status: "GRADED", feedback: esc(s.feedback || "") });
    }
  });
  (myQuizzes || []).forEach((q: any) => {
    const sc = q.total > 0 ? Math.round((q.score / q.total) * 100) : 0;
    gradeRows.push({ activity: esc(q.lessonTitle), score: sc, letter: letterFor(sc), kind: "Examen", status: "GRADED", feedback: "" });
  });
  // Entregas del alumno por nombre de actividad (para que S.assignment muestre el
  // estado: ya entregaste / en revisión / calificada + nota + feedback + archivo).
  const mySubmissionsByActivity: Record<string, any> = {};
  (mySubs as any[]).forEach((s: any) => {
    if (!mySubmissionsByActivity[s.activity]) {
      mySubmissionsByActivity[s.activity] = {
        id: s.id, activity: esc(s.activity), status: s.status, grade: s.grade ?? null,
        feedback: esc(s.feedback || ""), kind: s.kind, fileUrl: safeUrl(s.fileUrl),
        fileName: esc(s.fileName || ""), textBody: esc(s.textBody || ""), when: esc(s.createdLabel || ""),
        letter: typeof s.grade === "number" ? letterFor(s.grade) : "—",
      };
    }
  });
  const numericScores = gradeRows.map((r) => r.score).filter((s) => typeof s === "number") as number[];
  const myGrades = {
    rows: gradeRows,
    avg: numericScores.length ? Math.round(numericScores.reduce((a, b) => a + b, 0) / numericScores.length) : 0,
    submitted: numericScores.length,
    total: gradeRows.length,
    best: numericScores.length ? Math.max(...numericScores) : 0,
  };

  // Insignias automáticas (derivadas de logros reales del usuario).
  // mySubs ya se cargó arriba (consulta única de entregas del usuario).
  const lvl = derivedLevelName; // [fix] rango DERIVADO del XP (no el User.level almacenado) para los badges Semifinalista/Campeón
  const gotBadge = (name: string) => {
    switch (name) {
      case "Primer discurso": return mySubs.length >= 1;
      case "Racha de 7 días": return streakDays >= 7;
      case "Refutador": return (me?.xp ?? 0) >= 1500;
      case "Semifinalista": return ["Varsity", "Elite"].includes(lvl);
      case "Voz de oro": return mySubs.some((s) => (s.grade ?? 0) >= 95);
      case "Campeón": return lvl === "Elite";
      default: return false;
    }
  };

  // --- Perfil de coach -----------------------------------------------------
  // Construye el objeto coachProfile a partir de un usuario coach, sus programas
  // (cursos que imparte) y un arreglo de reviews ya cargadas.
  function buildCoachProfile(
    coach: any,
    programs: any[],
    reviews: any[],
  ) {
    const revs = (reviews || []).map((r) => ({
      author: esc(r.student?.name),
      ini: esc(r.student?.initials),
      rating: r.rating,
      body: esc(r.body),
      when: whenLabel(r.createdAt),
    }));
    return {
      id: coach?.id || "",
      name: esc(coach?.name),
      initials: esc(coach?.initials),
      headline: esc(coach?.headline),
      bio: esc(coach?.bio),
      teachingStyle: esc(coach?.teachingStyle),
      formatsList: formatsList(coach?.formats),
      location: esc(coach?.location),
      rating: avgRating((reviews || []).map((r) => r.rating)),
      reviewCount: (reviews || []).length,
      programs: (programs || []).map((c) => ({
        id: c.id,
        code: c.code,
        name: esc(pickLang(c.name, c.nameEn)),
        format: esc(c.format),
        modality: esc(c.modality),
        price: c.priceCents,
        color: c.color,
        summary: esc(pickLang(c.summary, c.summaryEn)),
      })),
      reviews: revs,
    };
  }

  let coachProfile: any;
  if (isTeacher) {
    // TEACHER/ADMIN: su propio perfil con sus programas y reseñas recibidas.
    const myReviews = taughtCourses.flatMap((c: any) =>
      (c.reviews || []).map((r: any) => ({ ...r, _courseName: c.name })),
    );
    coachProfile = buildCoachProfile(me, taughtCourses, myReviews);
  } else {
    // STUDENT: el coach del curso principal con sus programas y reseñas.
    // coachPrograms ya se cargó en paralelo arriba (Promise.all).
    const coach = studentCoach;
    coachProfile = buildCoachProfile(coach, coachPrograms, effMainCourse?.reviews ?? []);
  }

  // --- Mi reseña (del usuario actual para el curso principal) ---------------
  // myReviewRow ya se cargó en paralelo arriba (Promise.all).
  let myReview: { rating: number; body: string } | null = null;
  if (myReviewRow) {
    myReview = { rating: myReviewRow.rating, body: esc(myReviewRow.body) };
  }
  // VERIFIED-BOOKING-ONLY (PRD §7.4): puede reseñar al coach principal solo si
  // tiene una sesión 1:1 COMPLETADA con él (deriva de myBookingRows, sin query extra).
  const canReviewCoach = !!(
    studentCoach &&
    (myBookingRows as any[]).some((b) => b.coachId === studentCoach.id && b.status === "COMPLETED")
  );

  // --- Reseñas recibidas (solo TEACHER/ADMIN) -------------------------------
  const reviewsReceived = isTeacher
    ? taughtCourses.flatMap((c: any) =>
        (c.reviews || []).map((r: any) => ({
          author: esc(r.student?.name),
          ini: esc(r.student?.initials),
          rating: r.rating,
          body: esc(r.body),
          when: whenLabel(r.createdAt),
          programName: esc(c.name),
        })),
      )
    : [];

  // --- Habilidades (radar) del estudiante: [{ skill, score }] -------------
  // Solo se exponen las 6 dimensiones del contrato; score se clampa 0..100.
  const skillScore = new Map<string, number>();
  (myStudentSkills || []).forEach((s: any) => {
    skillScore.set(s.skill, Math.max(0, Math.min(100, Number(s.score) || 0)));
  });
  const skills = OTR_SKILLS
    .filter((name) => skillScore.has(name))
    .map((name) => ({ skill: name, score: skillScore.get(name) as number }));

  // --- Certificados reales del estudiante: [{ id, title, programName, issuedAt }]
  const courseNameById = new Map<string, string>();
  allCourses.forEach((c) => courseNameById.set(c.id, c.name));
  const certificates = (myCertificates || []).map((c: any) => ({
    id: c.id,
    title: esc(c.title),
    programName: esc(courseNameById.get(c.courseId) || ""),
    issuedAt: monthYearLabel(c.issuedAt),
  }));

  // --- Arsenal APAGADO (PRD-estricto): no existe en el PDF (el motion library
  // §6.4 es otra cosa y es Fase 2). La pantalla está desregistrada y el API
  // responde 410; no se envía ningún recurso al cliente.
  const arsenal: any[] = [];

  // --- Debate Hub (PRD §6): DB.debate / DB.leaderboard / DB.tournaments -----
  // Construidos a partir de los datos cargados en paralelo arriba. Sólo se
  // exponen cuando hay sesión (me); si no, objetos vacíos coherentes con la UI.
  const records = (debateRecords || []) as any[];

  // recentForm: últimos 5 records (ya vienen desc) → { result, opponent, delta }.
  // delta = ratingAfter - ratingBefore del RatingUpdate 1:1 (0 si la ronda no se
  // adjudicó / no tiene RatingUpdate — anti-gaming: el rating sólo mueve en ronda adjudicada).
  const recentForm = records.slice(0, 5).map((r) => ({
    result: r.result,
    opponent: esc(r.opponent || ""),
    delta: r.rating ? Math.round(r.rating.ratingAfter - r.rating.ratingBefore) : 0,
  }));

  // history: hasta 50 records con ratingAfter/source/when (label relativa).
  const debateHistory = records.map((r) => ({
    id: r.id,
    format: esc(r.format),
    side: esc(r.side || ""),
    opponent: esc(r.opponent || ""),
    result: r.result,
    source: r.source,
    eventName: esc(r.eventName || ""),
    roundLabel: esc(r.roundLabel || ""),
    ratingAfter: r.rating ? Math.round(r.rating.ratingAfter) : null,
    when: whenLabel(r.recordedAt),
  }));

  // analytics.byFormat / bySide: conteo W-L-D por formato y por lado (PRO/CON).
  const tally = () => ({ wins: 0, losses: 0, draws: 0, total: 0 });
  const byFormatMap = new Map<string, ReturnType<typeof tally>>();
  const bySideMap = new Map<string, ReturnType<typeof tally>>();
  const bump = (map: Map<string, ReturnType<typeof tally>>, key: string, result: string) => {
    if (!key) return;
    const t = map.get(key) || tally();
    if (result === "WIN") t.wins++;
    else if (result === "LOSS") t.losses++;
    else if (result === "DRAW") t.draws++;
    t.total++;
    map.set(key, t);
  };
  records.forEach((r) => {
    bump(byFormatMap, r.format, r.result);
    if (r.side) bump(bySideMap, r.side, r.result);
  });
  const byFormat = [...byFormatMap.entries()].map(([format, t]) => ({ format: esc(format), ...t }));
  const bySide = [...bySideMap.entries()].map(([side, t]) => ({ side: esc(side), ...t }));

  // analytics.criteria: promedio (0-10, 1 decimal) de RubricScore por criterio,
  // across todos los ballots del usuario. Orden fijo de la rúbrica del PRD §6.
  const RUBRIC_CRITERIA = ["Argumentation", "Rebuttal", "Delivery", "Evidence/Research", "Crossfire"];
  const critSum = new Map<string, { sum: number; n: number }>();
  (debateCriteriaScores || []).forEach((s: any) => {
    const acc = critSum.get(s.criterion) || { sum: 0, n: 0 };
    acc.sum += Number(s.score) || 0;
    acc.n++;
    critSum.set(s.criterion, acc);
  });
  const criteria = RUBRIC_CRITERIA.map((criterion) => {
    const acc = critSum.get(criterion);
    return { criterion, avg: acc && acc.n ? Math.round((acc.sum / acc.n) * 10) / 10 : 0 };
  });

  // PRD §13.2: "Full analytics" del Debate Hub es beneficio Pro. Para free el tab
  // Analytics se recorta a { locked:true } — la barrera vive en los DATOS (free
  // NUNCA recibe el desglose por formato/lado/criterio), no solo en la UI. Para
  // pro/elite se emite completo. Así el beneficio es verificable.
  const isProMember = me?.membership === "pro" || me?.membership === "elite";
  const debateAnalytics = isProMember ? { byFormat, bySide, criteria } : { locked: true };

  const debate = me
    ? {
        rating: Math.round(me.debateRating ?? 1500),
        rd: Math.round(me.debateRd ?? 350),
        tier: me.debateTier || "Novato",
        provisional: (me.debateRd ?? 350) >= 150,
        // [RATING-2 §6.2] Speaker Rating: promedio de oratoria (0-100), separado del W/L.
        // null cuando aún no hay rondas juzgadas (no se muestra una métrica vacía).
        speakerAvg: (me.speakerRounds ?? 0) > 0 ? Math.round(me.speakerAvg ?? 0) : null,
        speakerRounds: me.speakerRounds ?? 0,
        recentForm,
        history: debateHistory,
        analytics: debateAnalytics,
      }
    : null;

  // --- Leaderboard: top 50 por debateRating + posición del usuario ----------
  const initialsFrom = (name: string): string =>
    String(name || "")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0] || "")
      .join("")
      .toUpperCase();
  const leaderboardRowsOut = (leaderboardRows || []).map((u: any, i: number) => ({
    rank: i + 1,
    name: esc(u.name),
    initials: esc(u.initials || initialsFrom(u.name)),
    rating: Math.round(u.debateRating ?? 1500),
    tier: u.debateTier || "Novato",
    you: u.id === me?.id,
  }));
  const leaderboard = me
    ? {
        rows: leaderboardRowsOut,
        me: {
          rank: (myLeaderboardAhead as number) + 1,
          rating: Math.round(me.debateRating ?? 1500),
          tier: me.debateTier || "Novato",
        },
      }
    : null;

  // --- Tournaments: UPCOMING|LIVE con flag `registered` del usuario ----------
  const tournaments = me
    ? (upcomingTournaments || []).map((t: any) => ({
        id: t.id,
        name: esc(t.name),
        format: esc(t.format),
        region: esc(t.region || ""),
        modality: esc(t.modality),
        startsLabel: t.startsAt ? eventDateLabel(t.startsAt) : "Por anunciar",
        status: t.status,
        entryLabel: t.entryCents > 0 ? `RD$${(t.entryCents / 100).toLocaleString("es-DO")}` : "Gratis",
        registered: (t.registrations || []).length > 0,
      }))
    : [];

  // --- Marketplace (PRD §7): coaches activos para browse + perfil -----------
  // Etiqueta de precio en USD (los paquetes de coaching se cotizan en USD).
  const usdLabel = (cents: number): string => {
    const v = (Number(cents) || 0) / 100;
    return `$${v.toLocaleString("en-US", Number.isInteger(v) ? undefined : { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };
  // Etiqueta de slot "lun 16 jun · 4:00 PM" (hora RD) — reutiliza consultations.ts.
  const slotLabel = (d: Date | string): string => `${dateLabel(d as any)} · ${timeLabel(d as any)}`;
  // Lista separada por comas → array escapado (specialties, languages).
  const splitList = (s?: string | null): string[] =>
    String(s ?? "").split(",").map((x) => x.trim()).filter(Boolean).map((x) => esc(x));

  const coachUserById = new Map<string, any>();
  (coachUsers as any[]).forEach((u) => coachUserById.set(u.id, u));
  // Mapa packageId -> paquete (para resolver el nombre/precio en bookings).
  const packageById = new Map<string, any>();
  coachProfiles.forEach((p: any) => (p.packages || []).forEach((pk: any) => packageById.set(pk.id, pk)));

  const marketplace = {
    // Quien mira: 'minor' activa el candado de consentimiento parental en el UI
    // (la barrera real vive en POST /api/bookings — esto es solo señalización).
    viewer: { ageBand: me?.ageBand || null },
    coaches: coachProfiles
      // [§7.4 / MARKETPLACE-MEMBERSHIP-1] Solo coaches VERIFICADOS en el marketplace.
      .filter((p: any) => coachUserById.get(p.userId)?.coachVerified)
      .map((p: any) => {
        const u = coachUserById.get(p.userId);
        const pkgs = (p.packages || []).map((pk: any) => ({
          id: pk.id,
          name: esc(pk.name),
          sessions: pk.sessions,
          priceCents: pk.priceCents,
          priceLabel: usdLabel(pk.priceCents),
          discountPct: pk.discountPct,
        }));
        // "Desde $X": el paquete más barato (o la tarifa por hora si no hay paquetes).
        const fromPriceCents = pkgs.length ? Math.min(...pkgs.map((x: any) => x.priceCents)) : p.hourlyCents;
        return {
          id: p.userId, // id del coach (User) — es el coachId que usa Booking
          profileId: p.id,
          name: esc(u.name),
          initials: esc(u.initials),
          headline: esc(u.headline),
          avatarUrl: safeUrl(u.avatarUrl),
          coachVerified: !!u.coachVerified,
          location: esc(u.location),
          introVideoUrl: safeUrl(p.introVideoUrl),
          credentials: esc(p.credentials),
          specialties: esc(p.specialties),
          specialtiesList: splitList(p.specialties),
          languages: splitList(p.languages),
          hourlyCents: p.hourlyCents,
          hourlyLabel: usdLabel(p.hourlyCents),
          responseTime: esc(p.responseTime),
          cancelPolicy: esc(p.cancelPolicy),
          ratingAvg: Math.round((p.ratingAvg || 0) * 10) / 10,
          reviewCount: p.reviewCount,
          bookingCount: p.bookingCount,
          packages: pkgs,
          availability: (p.availability || []).map((a: any) => ({ weekday: a.weekday, startMin: a.startMin, endMin: a.endMin })),
          fromPriceCents,
          fromPriceLabel: fromPriceCents > 0 ? `Desde ${usdLabel(fromPriceCents)}` : "Gratis",
        };
      }),
  };

  // --- Parent Portal (PRD §11): tercera ola, depende de los guardianships ----
  const childIds = (parentGuardianships as any[]).map((g) => g.studentId);
  // PRD §11.3: el Guardianship por hijo guarda el umbral de auto-aprobación
  // (approveUnderCents) y el nivel de consentimiento (consentLevel) → P4 los muestra.
  const guardianshipByChild = new Map<string, any>(
    (parentGuardianships as any[]).map((g) => [g.studentId, g]),
  );
  // Coach Workspace (§7.5): estudiantes de los bookings del coach (nombre/iniciales).
  const coachStudentIds = [...new Set((coachBookingRows as any[]).map((b: any) => b.studentId))];
  const [childUsers, childBookings, childCertRows, childSkills, coachStudentUsers] = await Promise.all([
    childIds.length
      ? db.user.findMany({
          where: { id: { in: childIds } },
          // §8.4: publicProfile/publicSlug del hijo — el padre habilita el perfil
          // público del menor desde su portal (solo datos aquí, sin UI todavía).
          select: { id: true, name: true, initials: true, level: true, xp: true, ageBand: true, publicProfile: true, publicSlug: true },
        })
      : Promise.resolve([]),
    childIds.length
      ? db.booking.findMany({ where: { studentId: { in: childIds } }, include: { escrow: true }, orderBy: { slotAt: "asc" }, take: 300 })
      : Promise.resolve([]),
    childIds.length
      ? db.certificate.findMany({ where: { userId: { in: childIds } }, select: { userId: true, title: true } })
      : Promise.resolve([]),
    childIds.length ? db.studentSkill.findMany({ where: { userId: { in: childIds } } }) : Promise.resolve([]),
    // select defensivo: solo lo que muestra el booking inbox del coach.
    coachStudentIds.length
      ? db.user.findMany({ where: { id: { in: coachStudentIds } }, select: { id: true, name: true, initials: true } })
      : Promise.resolve([]),
  ]);

  // Nombres de coach para bookings (míos o de mis hijos) cuyo coach NO esté en
  // el mapa del marketplace (p.ej. perfil desactivado): una sola consulta extra.
  const missingCoachIds = [
    ...new Set(
      [...(myBookingRows as any[]), ...(childBookings as any[])]
        .map((b) => b.coachId)
        .filter((id) => id && !coachUserById.has(id)),
    ),
  ];
  if (missingCoachIds.length) {
    const extras = await db.user.findMany({
      where: { id: { in: missingCoachIds } },
      select: { id: true, name: true, initials: true, headline: true, avatarUrl: true, coachVerified: true, location: true },
    });
    extras.forEach((u) => coachUserById.set(u.id, u));
  }
  const coachNameOf = (id: string): string => esc(coachUserById.get(id)?.name || "Coach OTR");
  const coachIniOf = (id: string): string => esc(coachUserById.get(id)?.initials || "C");

  const nowMs = Date.now();

  // --- "Mis reservas" (STUDENT): bookings propios con coach + slot + precio --
  const myBookings = (myBookingRows as any[]).map((b) => ({
    id: b.id,
    status: b.status, // PENDING | CONFIRMED | COMPLETED | CANCELLED | DISPUTED
    coachId: b.coachId,
    coachName: coachNameOf(b.coachId),
    coachInitials: coachIniOf(b.coachId),
    packageName: b.packageId ? esc(packageById.get(b.packageId)?.name || "") : "",
    slotLabel: slotLabel(b.slotAt),
    slotAtIso: new Date(b.slotAt).toISOString(),
    durationMin: b.durationMin,
    upcoming: new Date(b.slotAt).getTime() > nowMs,
    // [BOOKING-ESCROW-1] El escrow es null en un PENDING (fondos aún no retenidos);
    // el precio acordado vive en Booking.priceCents (snapshot). Fallback a él para que
    // la reserva que espera aprobación no muestre $0/vacío.
    priceCents: b.escrow?.amountCents ?? b.priceCents ?? 0,
    priceLabel: (b.escrow?.amountCents ?? b.priceCents ?? 0) > 0 ? usdLabel(b.escrow?.amountCents ?? b.priceCents) : "",
    escrowStatus: b.escrow?.status ?? null, // HELD | RELEASED | REFUNDED
    videoUrl: safeUrl(b.videoUrl), // sala on-platform
  }));

  // --- PRD §7.5: Coach Workspace (supply-side) — SOLO TEACHER/ADMIN ----------
  // Booking inbox + earnings (escrow transparente, take rate 18%) + métricas de
  // éxito del coach + gestión de perfil (disponibilidad/paquetes). null si no aplica.
  let coachwork: any = null;
  if (isTeacher && me) {
    const coachStudentById = new Map<string, any>((coachStudentUsers as any[]).map((u: any) => [u.id, u]));
    // Perfil propio: del browse (activo) o de la consulta directa (inactivo).
    const myCoachProfile: any = coachProfiles.find((p: any) => p.userId === me.id) ?? myCoachProfileRow ?? null;
    // Sus paquetes resuelven nombre en el inbox aunque el perfil esté inactivo
    // (packageById solo trae los de perfiles activos del browse).
    if (myCoachProfile) {
      (myCoachProfile.packages || []).forEach((pk: any) => {
        if (!packageById.has(pk.id)) packageById.set(pk.id, pk);
      });
    }

    // Día de la semana (0=Dom..6=Sáb) y minutos desde medianoche → "9:00 AM".
    const WEEKDAYS_ES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
    const minToTime = (min: number): string => {
      const total = Number(min) || 0;
      const h24 = Math.floor(total / 60);
      const m = total % 60;
      const ampm = h24 >= 12 ? "PM" : "AM";
      let h = h24 % 12;
      if (h === 0) h = 12;
      return `${h}:${String(m).padStart(2, "0")} ${ampm}`;
    };

    const allCoachBookings = coachBookingRows as any[]; // ya vienen slotAt desc
    const bookingShape = (b: any) => ({
      id: b.id,
      status: b.status, // PENDING | CONFIRMED | COMPLETED | CANCELLED
      studentName: esc(coachStudentById.get(b.studentId)?.name || "Estudiante OTR"),
      studentInitials: esc(coachStudentById.get(b.studentId)?.initials || "E"),
      slotLabel: slotLabel(b.slotAt), // "vie 12 jun · 4:00 PM" (hora RD)
      durationMin: b.durationMin,
      packageName: b.packageId ? esc(packageById.get(b.packageId)?.name || "") : "",
      // [BOOKING-ESCROW-1] PENDING no tiene escrow → cae al snapshot Booking.priceCents.
      amountCents: b.escrow?.amountCents ?? b.priceCents ?? 0,
      amountLabel: (b.escrow?.amountCents ?? b.priceCents ?? 0) > 0 ? usdLabel(b.escrow?.amountCents ?? b.priceCents) : "",
      // PENDING = espera el consentimiento parental del menor (Safety Gate §7).
      awaitingConsent: b.status === "PENDING",
    });
    const inboxUpcoming = allCoachBookings
      .filter((b) => (b.status === "CONFIRMED" || b.status === "PENDING") && new Date(b.slotAt).getTime() >= nowMs)
      .sort((a, b) => new Date(a.slotAt).getTime() - new Date(b.slotAt).getTime())
      .map(bookingShape);
    const inboxPast = allCoachBookings
      .filter((b) => b.status === "COMPLETED" || b.status === "CANCELLED")
      .slice(0, 20) // ya vienen desc
      .map((b) => ({ ...bookingShape(b), escrowStatus: b.escrow?.status ?? null }));

    // [ENT-08] Los TOTALES financieros y de éxito NO pueden derivar del array de bookings
    // (capado a take:200 para el inbox): un coach con >200 reservas perdería las antiguas y
    // subreportaría sus ingresos de por vida. Se calculan con agregaciones dedicadas (sin
    // límite) sobre TODO el historial. takeRatePct es uniforme (EscrowTxn @default 18, y todo
    // el código crea el escrow con 18), así que payout = liberado × (1 − 18%).
    const coachId = me.id;
    const nowDate = new Date(nowMs);
    const monthStart = new Date(nowDate.getFullYear(), nowDate.getMonth(), 1);
    const TAKE_PCT = 18;
    const payoutOfCents = (cents: number): number => Math.round((cents || 0) * (1 - TAKE_PCT / 100));
    const [heldAgg, relAgg, monthRelAgg, completedCount, byStudent] = await Promise.all([
      db.escrowTxn.aggregate({ where: { status: "HELD", booking: { coachId } }, _sum: { amountCents: true } }),
      db.escrowTxn.aggregate({ where: { status: "RELEASED", booking: { coachId } }, _sum: { amountCents: true } }),
      db.escrowTxn.aggregate({ where: { status: "RELEASED", releasedAt: { gte: monthStart }, booking: { coachId } }, _sum: { amountCents: true } }),
      db.booking.count({ where: { coachId, status: "COMPLETED" } }),
      db.booking.groupBy({ by: ["studentId"], where: { coachId }, _count: { studentId: true } }),
    ]);
    const heldCents = heldAgg._sum.amountCents || 0;
    const releasedCents = relAgg._sum.amountCents || 0;
    const payoutCents = payoutOfCents(releasedCents);
    const monthPayoutCents = payoutOfCents(monthRelAgg._sum.amountCents || 0);
    const repeatStudents = byStudent.filter((g: any) => (g._count?.studentId || 0) > 1).length;

    coachwork = {
      inbox: { upcoming: inboxUpcoming, past: inboxPast },
      earnings: {
        heldCents,
        releasedCents,
        payoutCents,
        monthPayoutCents,
        takeRatePct: 18,
        heldLabel: usdLabel(heldCents),
        releasedLabel: usdLabel(releasedCents),
        payoutLabel: usdLabel(payoutCents),
        monthPayoutLabel: usdLabel(monthPayoutCents),
      },
      metrics: {
        ratingAvg: Math.round((myCoachProfile?.ratingAvg || 0) * 10) / 10,
        reviewCount: myCoachProfile?.reviewCount ?? 0,
        bookingCount: myCoachProfile?.bookingCount ?? 0,
        completed: completedCount,
        repeatStudents,
      },
      // Sin CoachProfile → profile null (la UI muestra el CTA de crear perfil).
      profile: myCoachProfile
        ? {
            active: !!myCoachProfile.active,
            hourlyCents: myCoachProfile.hourlyCents,
            hourlyLabel: usdLabel(myCoachProfile.hourlyCents),
            specialties: esc(myCoachProfile.specialties),
            languages: splitList(myCoachProfile.languages),
            availability: (myCoachProfile.availability || []).map((a: any) => ({
              id: a.id,
              weekday: a.weekday,
              startMin: a.startMin,
              endMin: a.endMin,
              label: `${WEEKDAYS_ES[a.weekday] || ""} ${minToTime(a.startMin)} – ${minToTime(a.endMin)}`,
            })),
            packages: (myCoachProfile.packages || []).map((pk: any) => ({
              id: pk.id,
              name: esc(pk.name),
              sessions: pk.sessions,
              priceCents: pk.priceCents,
              priceLabel: usdLabel(pk.priceCents),
              discountPct: pk.discountPct,
            })),
          }
        : null,
    };
  }

  // DB.parent — SOLO para rol PARENT (role-scoped, PRD §11).
  let parentData: any = null;
  if (me && me.role === "PARENT") {
    // Logros por hijo: lista de títulos de certificados (scr-parent espera array).
    const certsByChild = new Map<string, string[]>();
    (childCertRows as any[]).forEach((c) => {
      const arr = certsByChild.get(c.userId) || [];
      arr.push(esc(c.title));
      certsByChild.set(c.userId, arr);
    });
    const skillsByChild = new Map<string, any[]>();
    (childSkills as any[]).forEach((s) => {
      const arr = skillsByChild.get(s.userId) || [];
      arr.push(s);
      skillsByChild.set(s.userId, arr);
    });
    const bookingsByChild = new Map<string, any[]>();
    (childBookings as any[]).forEach((b) => {
      const arr = bookingsByChild.get(b.studentId) || [];
      arr.push(b);
      bookingsByChild.set(b.studentId, arr);
    });
    const childById = new Map<string, any>((childUsers as any[]).map((u) => [u.id, u]));
    parentData = {
      // Mantiene el orden de los guardianships (createdAt asc).
      children: childIds
        .filter((id) => childById.has(id))
        .map((id) => {
          const u = childById.get(id);
          const books = bookingsByChild.get(id) || [];
          const attended = books.filter((b) => b.status === "COMPLETED").length;
          const scheduled = books.filter((b) => b.status === "CONFIRMED" || b.status === "COMPLETED").length;
          const upcoming = books
            .filter((b) => b.status === "CONFIRMED" && new Date(b.slotAt).getTime() > nowMs)
            .map((b) => ({
              id: b.id,
              coachName: coachNameOf(b.coachId),
              slotLabel: slotLabel(b.slotAt),
              durationMin: b.durationMin,
            }));
          // Billing & spend: lo retenido + liberado (REFUNDED no cuenta como gasto).
          const spendCents = books.reduce(
            (sum, b) => sum + (b.escrow && b.escrow.status !== "REFUNDED" ? b.escrow.amountCents : 0),
            0,
          );
          // Safety & consent: bookings PENDING que esperan la aprobación de ESTE padre.
          const pendingConsents = books
            .filter((b) => b.status === "PENDING" && b.consentBy === me.id)
            .map((b) => ({
              id: b.id,
              bookingId: b.id, // alias: scr-parent referencia pc.bookingId
              coachName: coachNameOf(b.coachId),
              slotLabel: slotLabel(b.slotAt),
              // [BOOKING-ESCROW-1] PENDING no tiene escrow: el monto que aprueba el tutor
              // sale del snapshot autoritativo Booking.priceCents (no del paquete, que puede
              // faltar si fue sesión sin paquete o el coach quedó inactivo) → evita $0.00.
              priceLabel: usdLabel(b.escrow?.amountCents ?? b.priceCents ?? (b.packageId && packageById.get(b.packageId)?.priceCents) ?? 0),
            }));
          return {
            id: u.id,
            childId: u.id, // alias explícito para el toggle de consentimiento §8.4
            name: esc(u.name),
            initials: esc(u.initials),
            level: levelNameForXp(u.xp), // [fix] rango del hijo DERIVADO del XP (no el almacenado)
            ageBand: u.ageBand || "minor",
            // §8.4: estado del perfil público del hijo (el padre es quien lo
            // habilita para menores — aquí solo viajan los datos, sin UI).
            publicProfile: { enabled: !!u.publicProfile, slug: u.publicSlug ? esc(u.publicSlug) : null },
            // Skill growth: score actual por dimensión; delta=0 (placeholder hasta
            // tener histórico mensual de StudentSkill).
            skillDeltas: (skillsByChild.get(id) || []).map((s: any) => ({
              skill: esc(s.skill),
              name: esc(s.skill), // alias: scr-parent renderiza s.name
              score: Math.max(0, Math.min(100, Number(s.score) || 0)),
              delta: 0,
            })),
            attendance: { attended, scheduled },
            achievements: certsByChild.get(id) || [],
            upcoming,
            spendCents,
            spendLabel: usdLabel(spendCents),
            pendingConsents,
            // PRD §11.3: umbral configurable del padre para ESTE hijo. null en
            // approveUnderCents = aprobar cada reserva; N = auto-aprueba hasta N centavos.
            approveUnderCents: guardianshipByChild.get(id)?.approveUnderCents ?? null,
            consentLevel: guardianshipByChild.get(id)?.consentLevel || "standard", // [fix] default seguro (no "full")
          };
        }),
    };
  }

  // --- PRD §8: Lifetime Progress Profile (DB.lifetime) — el moat -------------
  // Identity + Skill Graph CON ATRIBUCIÓN (cada skill enlaza los eventos que lo
  // movieron — sin cajas negras) + activity ledger + performance record +
  // credenciales + Journey cronológico + perfil público compartible (§8.4).
  // Se emite para TODO usuario con sesión (TEACHER/PARENT reciben el suyo propio).
  const activityAsc = [...(activityEvents as any[])].reverse(); // la consulta viene desc → asc

  // "Miembro desde …": User no tiene createdAt en el schema → primer
  // ActivityEvent del usuario, o "2026" si aún no tiene historia.
  const firstEventAt = activityAsc[0]?.createdAt ?? null;
  const memberSinceLabel = firstEventAt
    ? `Miembro desde ${MONTHS_ES_FULL[new Date(firstEventAt).getMonth()]} ${new Date(firstEventAt).getFullYear()}`
    : "Miembro desde 2026";

  // Atribución del Skill Graph (PRD §8.2, sin cajas negras):
  //  1) FUENTE PRIMARIA — meta.skillBumps escrito por el server cuando un evento
  //     mueve un skill (debates/api lo registra: [{skill, before, after}]). Esto
  //     es atribución EXACTA: el evento movió ese skill, no una adivinanza.
  //  2) RESPALDO — para eventos viejos sin skillBumps en meta, se cae a la
  //     heurística (mención en texto o mapeo por tipo) para no dejar el tap vacío.
  // Pre-parseamos meta una vez por evento.
  const parseMeta = (raw: any): any => {
    if (!raw) return null;
    if (typeof raw === "object") return raw;
    try { return JSON.parse(String(raw)); } catch { return null; }
  };
  const recentForSkills = (activityEvents as any[]).slice(0, 40).map((a) => {
    const meta = parseMeta(a.meta);
    const bumpedSkills: string[] = Array.isArray(meta?.skillBumps)
      ? meta.skillBumps.map((b: any) => String(b?.skill || "")).filter(Boolean)
      : [];
    return { ...a, _bumpedSkills: bumpedSkills };
  });
  // [SPINE-03 / §8.2] Tipos REALES de ActivityEvent escritos por las rutas (antes usaba
  // "quiz_passed"/"debate_logged" que NUNCA se escriben → el fallback de atribución no
  // hallaba nada). La atribución primaria es meta.skillBumps; este set/mapa es el respaldo.
  const SKILL_EVENT_TYPES = new Set(["quiz_done", "quiz", "lesson_done", "debate_win", "debate_loss", "skill_eval", "placement_done", "booking_made", "session_done"]);
  const TYPE_TO_SKILLS: Record<string, string[]> = {
    debate_win: ["Refutación", "Estructura"],
    debate_loss: ["Refutación", "Estructura"],
    quiz_done: ["Evidencia"],
    quiz: ["Evidencia"],
    lesson_done: ["Estructura"],
    booking_made: ["Delivery"],
    session_done: ["Delivery"],
  };
  const eventsForSkill = (skillName: string) => {
    const needle = skillName.toLowerCase();
    return recentForSkills
      .filter((a) => {
        // 1) atribución exacta del server
        if (a._bumpedSkills.includes(skillName)) return true;
        // 2) respaldo heurístico solo para eventos relevantes SIN skillBumps
        if (a._bumpedSkills.length) return false;
        if (!SKILL_EVENT_TYPES.has(a.type)) return false;
        const text = `${a.title || ""} ${a.detail || ""}`.toLowerCase();
        return text.includes(needle) || (TYPE_TO_SKILLS[a.type] || []).includes(skillName);
      })
      .slice(0, 8)
      .map((a) => ({ title: esc(a.title), whenLabel: shortDateLabel(a.createdAt) }));
  };
  // Sin StudentSkill → las 6 dimensiones canónicas en 0 (el perfil nunca va vacío).
  const skillGraphBase = (myStudentSkills || []).length
    ? (myStudentSkills as any[]).map((s) => ({ skill: String(s.skill), score: Math.max(0, Math.min(100, Number(s.score) || 0)) }))
    : OTR_SKILLS.map((skill) => ({ skill, score: 0 }));
  const skillGraph = skillGraphBase.map((s) => ({
    skill: esc(s.skill),
    name: esc(s.skill),
    score: s.score,
    events: eventsForSkill(s.skill),
  }));

  // Activity ledger: números de vida entera (cursos, lecciones, debates, sesiones…).
  const lessonsDoneCount = (myProgress || []).length;
  const sessionsAttended = (myBookingRows as any[]).filter((b) => b.status === "COMPLETED").length;
  const enrollCompleted = meEnrollments.filter((e) => courseProgress(e.courseId) >= 100).length;
  const lifetimeLedger = {
    // Un certificado emitido también cuenta como curso completado (es su prueba).
    coursesCompleted: Math.max(enrollCompleted, (myCertificates || []).length),
    lessonsDone: lessonsDoneCount,
    debates: records.length,
    wins: records.filter((r) => r.result === "WIN").length,
    sessionsAttended,
    tournaments: myTournamentRegs as number,
    // [fix] Horas REALES de coaching = sesiones completadas (cada Booking ~1h). Antes sumaba
    // lecciones×0.4 (24 min/lección inventados — no hay tracking de tiempo de lección en el schema).
    hoursStudied: sessionsAttended,
  };

  // Performance record: historia de rating (RatingUpdate 1:1 de cada DebateRecord,
  // en orden cronológico; el label usa la fecha real de la ronda).
  const ratingHistory = records
    .filter((r) => r.rating)
    .slice()
    .sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime())
    .map((r) => ({
      label: shortDateLabel(r.recordedAt),
      ratingAfter: Math.round(r.rating.ratingAfter),
      tierAfter: r.rating.tierAfter,
    }));
  const lifetimePerformance = {
    rating: Math.round(me?.debateRating ?? 1500),
    tier: me?.debateTier || "Novato",
    rd: Math.round(me?.debateRd ?? 350),
    provisional: (me?.debateRd ?? 350) >= 150,
    history: ratingHistory,
  };

  // Credenciales verificables (certificados emitidos).
  const lifetimeCredentials = (myCertificates || []).map((c: any) => ({
    title: esc(c.title),
    issuedLabel: monthYearLabel(c.issuedAt),
  }));

  // Journey: la historia cronológica vertical (hasta 60 eventos, asc) — el
  // screenshot que un estudiante comparte y que enorgullece a los padres.
  const journey = activityAsc.slice(0, 60).map((a: any) => ({
    whenLabel: shortDateLabel(a.createdAt),
    monthLabel: monthFullLabel(a.createdAt),
    title: esc(a.title),
    detail: esc(a.detail || ""),
    type: a.type,
  }));

  const lifetime = me
    ? {
        identity: {
          name: esc(me.name),
          initials: esc(me.initials),
          level: derivedLevelName, // [fix nivel] derivado del XP, no del valor almacenado
          ageBand: me.ageBand || null,
          memberSinceLabel,
          // Bilingüe nativo: ES siempre lleva EN al lado; cuenta en EN → solo EN.
          languages: me.lang === "en" ? ["EN"] : ["ES", "EN"],
          location: esc(me.location),
        },
        skillGraph,
        ledger: lifetimeLedger,
        performance: lifetimePerformance,
        credentials: lifetimeCredentials,
        journey,
        // §8.4: perfil público compartible — privacy-default OFF; un MENOR no
        // puede togglearlo (lo habilita su padre/madre desde el Portal de familia).
        publicProfile: {
          enabled: !!me.publicProfile,
          slug: me.publicSlug ? esc(me.publicSlug) : null,
          url: me.publicSlug ? `/p/${esc(me.publicSlug)}` : null,
          canToggle: me.ageBand !== "minor",
          minorNote: "Tu padre/madre puede habilitar tu perfil público desde el Portal de familia.",
        },
      }
    : null;

  // --- PRD §13: membresía por suscripción (SIMULADA en F1 — sin Stripe; el
  // upgrade solo cambia User.membership). free | pro | elite ("Próximamente").
  const membership = {
    tier: me?.membership || "free",
    sinceLabel: me?.membershipSince
      ? `Desde ${MONTHS_ES_FULL[new Date(me.membershipSince).getMonth()]} ${new Date(me.membershipSince).getFullYear()}`
      : null,
    prices: { proMonthly: "US$9", proAnnual: "US$79" },
  };

  const base: any = {
    me: { name: esc(me?.name), email: me?.email, initials: esc(me?.initials), level: derivedLevelName, streak: streakDays, role: myRole,
      // [DASHBOARD-ACCESS-2 §4] ciclo de vida para adaptar el saludo y el siguiente paso.
      lifecycle: lifecycle.state, daysAway: lifecycle.daysAway,
      headline: esc(me?.headline), bio: esc(me?.bio), teachingStyle: esc(me?.teachingStyle), formats: esc(me?.formats), location: esc(me?.location), preferences: me?.preferences ?? null,
      // PRD §11.3 / §2.2: estudiante sin placement aún (placedAt null) → P1/Aula.tsx lo enruta al placement.
      needsPlacement: me?.role === "STUDENT" && !me?.placedAt,
      avatarUrl: safeUrl(me?.avatarUrl),
      ageBand: me?.ageBand || null,
      // [GAMIFICATION-1 §9] estado del opt-in (toggle en Ajustes). [RATING-2 §6.2] speaker rating.
      leaderboardOptIn: me?.leaderboardOptIn !== false,
      speakerAvg: (me?.speakerRounds ?? 0) > 0 ? Math.round(me?.speakerAvg ?? 0) : null, speakerRounds: me?.speakerRounds ?? 0 },
    teacher: { name: esc(headCoach?.name), email: headCoach?.email, initials: esc(headCoach?.initials), role: "teacher",
      headline: esc(headCoach?.headline), bio: esc(headCoach?.bio), teachingStyle: esc(headCoach?.teachingStyle), formats: esc(headCoach?.formats), location: esc(headCoach?.location) },
    levels: levels.map((l) => ({ id: l.name.toLowerCase(), name: l.name, range: l.range, color: l.color })),
    xp: me?.xp ?? 0,
    xpNext,
    xpLevelStart,
    courses: meEnrollments.map((e) => ({
      id: e.course.code, dbId: e.course.id, code: e.course.code, name: esc(pickLang(e.course.name, e.course.nameEn)), coach: esc(e.course.coachName),
      color: e.course.color, progress: courseProgress(e.course.id), next: esc(e.course.next),
      students: e.course.studentsCount, lessons: e.course.lessonsCount, due: e.due,
      format: esc(e.course.format), modality: esc(e.course.modality), capacity: e.course.capacity, summary: esc(pickLang(e.course.summary, e.course.summaryEn)),
      layout: e.course.layout || "modules",
    })),
    // Dashboard: solo secciones/actividades VISIBLES para el alumno (filtra hidden).
    courseModules: modulesForDashboard.filter((m: any) => !m.hidden).map((m) => ({
      t: esc(pickLang(m.title, m.titleEn)), done: m.done, locked: m.locked,
      items: m.lessons.filter((l: any) => !l.hidden).map((l) => ({
        id: l.id, t: esc(pickLang(l.title, l.titleEn)), type: l.type, done: l.done, doneByMe: doneSet.has(l.id), locked: lessonLocked(l), grade: l.grade, dur: l.dur, due: l.due,
        dueAt: l.dueAt ? l.dueAt.toISOString() : null, maxPoints: l.maxPoints ?? null, submitKinds: l.submitKinds ?? null,
        videoKind: l.videoKind, videoSrc: l.videoSrc, contentHtml: pickLang(l.contentHtml, l.contentHtmlEn),
        // Examen real adjunto solo a lecciones type='quiz' (null si no tiene).
        quiz: l.type === "quiz" ? (quizByLessonMap.get(l.id) ?? null) : undefined,
      })),
    })),
    // Moodle multi-curso: módulos de TODOS los cursos inscritos, agrupados por curso.
    // S.course/S.courseIndex/S.lesson navegan cualquiera vía window.__course; las
    // pantallas de lección buscan window.__lesson entre todos estos items.
    coursesContent: (() => {
      // PROFESOR/ADMIN: "Vista previa como alumno" — sus cursos impartidos en el shape
      // de alumno, con secciones/actividades OCULTAS filtradas (igual que lo ve el
      // estudiante) y sin gating de progreso (el profesor no tiene avance) para poder
      // recorrer todo. Reutiliza S.course/S.lesson/S.assignment/S.quiz tal cual.
      if (isTeacher) {
        return (taughtCourses as any[]).map((c: any) => ({
          id: c.code, dbId: c.id, code: c.code,
          name: esc(pickLang(c.name, c.nameEn)), coach: esc(c.coachName),
          color: c.color, progress: 0,
          summary: esc(pickLang(c.summary, c.summaryEn)),
          format: esc(c.format), modality: esc(c.modality),
          layout: c.layout || "modules",
          modules: (c.modules || []).filter((m: any) => !m.hidden).map((m: any) => ({
            t: esc(pickLang(m.title, m.titleEn)), done: false, locked: false,
            items: (m.lessons || []).filter((l: any) => !l.hidden).map((l: any) => ({
              id: l.id, t: esc(pickLang(l.title, l.titleEn)), type: l.type, done: false, doneByMe: false,
              locked: false, grade: null, dur: l.dur, due: l.due,
              dueAt: l.dueAt ? l.dueAt.toISOString() : null, maxPoints: l.maxPoints ?? null, submitKinds: l.submitKinds ?? null,
              videoKind: l.videoKind, videoSrc: l.videoSrc, contentHtml: pickLang(l.contentHtml, l.contentHtmlEn),
              quiz: l.type === "quiz" ? (quizByLessonMap.get(l.id) ?? null) : undefined,
            })),
          })),
        }));
      }
      const src = (studentModules as any[]);
      const byCourse = new Map<string, any[]>();
      src.forEach((m) => {
        const arr = byCourse.get(m.courseId) || [];
        arr.push(m);
        byCourse.set(m.courseId, arr);
      });
      return meEnrollments.map((e: any) => ({
        id: e.course.code, dbId: e.course.id, code: e.course.code,
        name: esc(pickLang(e.course.name, e.course.nameEn)), coach: esc(e.course.coachName),
        color: e.course.color, progress: courseProgress(e.course.id),
        summary: esc(pickLang(e.course.summary, e.course.summaryEn)),
        format: esc(e.course.format), modality: esc(e.course.modality),
        layout: e.course.layout || "modules",
        // Solo secciones/actividades VISIBLES para el alumno (filtra hidden).
        modules: (byCourse.get(e.course.id) || []).filter((m: any) => !m.hidden).map((m: any) => ({
          t: esc(pickLang(m.title, m.titleEn)), done: m.done, locked: m.locked,
          items: m.lessons.filter((l: any) => !l.hidden).map((l: any) => ({
            id: l.id, t: esc(pickLang(l.title, l.titleEn)), type: l.type, done: l.done, doneByMe: doneSet.has(l.id),
            locked: lessonLocked(l), grade: l.grade, dur: l.dur, due: l.due,
            dueAt: l.dueAt ? l.dueAt.toISOString() : null, maxPoints: l.maxPoints ?? null, submitKinds: l.submitKinds ?? null,
            videoKind: l.videoKind, videoSrc: l.videoSrc, contentHtml: pickLang(l.contentHtml, l.contentHtmlEn),
            quiz: l.type === "quiz" ? (quizByLessonMap.get(l.id) ?? null) : undefined,
          })),
        })),
      }));
    })(),
    // Estado de las entregas del alumno por actividad (S.assignment lo lee).
    mySubmissions: mySubmissionsByActivity,
    competencies: competencies.map((c) => ({ name: c.name, score: c.score })),
    badges: badges.map((b) => ({ n: b.name, d: b.description, got: gotBadge(b.name), ic: b.icon, tone: b.tone })),
    // [auditoría] La etiqueta de fecha se DERIVA de startsAt (viva, como los torneos); whenLabel
    // es solo fallback para eventos legados sin startsAt. Así "Hoy/Mañana" no queda congelado.
    events: events.map((e) => ({ t: e.title, c: e.course, when: (e as any).startsAt ? eventDateLabel((e as any).startsAt) : e.whenLabel, tone: e.tone })),
    // PRD §4: DB.activity = timeline del Progress Profile (ActivityEvent del usuario,
    // los últimos 15 de la consulta compartida con journey). esc() en texto de usuario.
    activity: (activityEvents || []).slice(0, 15).map((a) => ({
      type: a.type, title: esc(a.title), detail: esc(a.detail || ""),
      xp: a.xp || 0, when: whenLabel(a.createdAt),
    })),
    notifications: notifications.filter((n) => !n.userId || n.userId === me?.id).map((n) => ({ ic: n.icon, tone: n.tone, t: esc(n.title), d: esc(n.detail), when: n.whenLabel, unread: n.unread })),
    forum: threads.map((t) => ({ id: t.id, title: esc(t.title), author: esc(t.author), ini: esc(t.initials), tag: esc(t.tag), replies: t.replies, views: t.views, pinned: t.pinned, last: t.lastLabel, excerpt: esc(t.excerpt) })),
    forumThread: mainThread ? {
      id: mainThread.id, title: esc(mainThread.title), tag: esc(mainThread.tag),
      posts: mainThread.posts.map((p) => ({ author: esc(p.author), ini: esc(p.initials), role: p.role, when: p.whenLabel, op: p.op, body: esc(p.body) })),
    } : { id: "", title: "", tag: "", posts: [] },
    // [CROSS-02/03] Cada conversación trae su id + sus mensajes (me computado por usuario,
    // consistente con CROSS-01) para que la pantalla pueda CAMBIAR de chat y enviar al hilo
    // correcto. Antes solo se exponía el resumen + DB.chat (la 1ª conversación), por eso el
    // thread mostraba siempre lo mismo y el envío iba al primer hilo.
    messages: convos.map((c) => ({
      id: c.id, ini: esc(c.initials), name: esc(c.name), last: esc(c.lastLabel), when: c.whenLabel,
      unread: c.unread, online: c.online, navy: c.navy,
      messages: (c.messages ?? []).map((m) => ({ me: m.senderId ? m.senderId === me?.id : m.me, body: esc(m.body), when: m.timeLabel })),
    })),
    // Legacy: mensajes de la 1ª conversación (se conserva por compatibilidad).
    chat: (convos[0]?.messages ?? []).map((m) => ({ me: m.senderId ? m.senderId === me?.id : m.me, body: esc(m.body), when: m.timeLabel })),
    // VENTA POR CURSO APAGADA (PRD §13.1): los cursos son valor de la membresía —
    // price 0 → la UI muestra "Gratis"/Inscribirme y /api/checkout inscribe directo.
    catalog: allCourses.map((c) => ({ id: c.id, code: c.code, name: esc(pickLang(c.name, c.nameEn)), coach: esc(c.coachName), color: c.color, price: 0, enrolled: enrolledIds.has(c.id),
      format: esc(c.format), modality: esc(c.modality) })),
    // --- Hub: campos nuevos (visibles para todos los roles) ---
    arsenal,
    skills,
    certificates,
    coachProfile,
    myReview,
    canReviewCoach, // §7.4 verified-booking-only: habilita el form de reseña del coach
    // Notas reales del estudiante (Submission GRADED + QuizAttempt).
    myGrades,
    // Mapa lessonId -> quiz real (misma forma del contrato; alumno sin 'correct').
    quizByLesson,
    // PRD §4: Debate Rank card. Si el RD es alto (>= 200, default 350) el rating
    // aún es "soft"/provisional → estado novato para quien no ha debatido.
    debateRank: {
      rating: Math.round(me?.debateRating ?? 1500),
      rd: Math.round(me?.debateRd ?? 350),
      tier: me?.debateTier || "Novato",
      provisional: (me?.debateRd ?? 350) >= 150,
      recentForm,
    },
    // PRD §6: Debate Hub (flagship). Sólo para roles CON sesión (null si no hay me).
    // DB.debate = dashboard del debatiente (rating/tier/form/history/analytics).
    debate,
    // DB.leaderboard = top 50 por rating + la posición del usuario.
    leaderboard,
    // DB.tournaments = torneos UPCOMING|LIVE con flag `registered`.
    tournaments,
    // PRD §7: Marketplace de coaches (browse/perfil) — visible para TODOS los roles.
    marketplace,
    // PRD §7.5: Coach Workspace (supply-side) — SOLO TEACHER/ADMIN (null si no).
    coachwork,
    // PRD §8: Lifetime Progress Profile — identity + skill graph con atribución +
    // ledger + performance + credenciales + journey + perfil público (§8.4).
    lifetime,
    // PRD §13: membresía por suscripción (simulada en F1).
    membership,
  };

  // PRD §7: "Mis reservas" — SOLO para STUDENT (sus propios bookings).
  if (me?.role === "STUDENT") {
    base.myBookings = myBookings;
  }
  // PRD §11: Parent Portal — SOLO para PARENT (role-scoped; un STUDENT/TEACHER
  // NUNCA recibe los datos de hijos de nadie).
  if (parentData) {
    base.parent = parentData;
  }

  // --- SEGMENTACIÓN por rol ------------------------------------------------
  // Un STUDENT NUNCA recibe gradebook, students, manage, teacherCourses ni
  // reviewsReceived. Solo se añaden para TEACHER/ADMIN.
  if (isTeacher) {
    base.students = (taughtRoster as any[]).map((e) => ({
      id: e.user.id, n: esc(e.user.name), i: esc(e.user.initials), lvl: e.user.level, xp: e.user.xp,
      grade: e.grade, att: e.attendance, eng: e.engagement, trend: e.trend, risk: e.risk, last: e.lastAccess,
    }));

    // --- KPIs del profesor (calculados del roster base.students) ------------
    // avg=promedio de s.grade; attendance=promedio de s.att; onTime=promedio de
    // s.eng (engagement string mapeado a %); atRisk=conteo de s.risk truthy.
    const engPct = (eng: string): number => (eng === "Alto" ? 100 : eng === "Bajo" ? 33 : 66);
    const roster = base.students as any[];
    const avgOf = (vals: number[]): number =>
      vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
    base.teacherKpis = {
      avg: avgOf(roster.map((s) => Number(s.grade) || 0)),
      attendance: avgOf(roster.map((s) => Number(s.att) || 0)),
      onTime: avgOf(roster.map((s) => engPct(s.eng))),
      atRisk: roster.filter((s) => s.risk).length,
    };
    // Entregas pendientes (no calificadas) de los cursos del profesor.
    base.pendingSubs = pendingSubs;

    base.gradebook = { cols, rows: gbRows };
    // Gestión de contenido: SOLO los cursos del propio profesor (borradores incluidos),
    // no los publicados globales — así un curso recién creado o en borrador sí aparece
    // en el desplegable de "Nuevo módulo" y se le puede añadir contenido.
    base.manage = {
      courses: taughtCourses.map((c: any) => ({ id: c.id, code: c.code, name: esc(c.name) })),
      modules: allModules.map((m) => ({ id: m.id, courseId: m.courseId, title: esc(m.title) })),
    };
    base.teacherCourses = taughtCourses.map((c: any) => ({
      id: c.id, code: c.code, name: esc(c.name), color: c.color, published: c.published, layout: c.layout || "modules",
      format: esc(c.format), modality: esc(c.modality), capacity: c.capacity, summary: esc(c.summary),
      modules: c.modules.map((m: any) => ({ id: m.id, title: esc(m.title), hidden: !!m.hidden, lessons: m.lessons.map((l: any) => ({ id: l.id, title: esc(l.title), type: l.type, dur: l.dur, due: l.due, hidden: !!l.hidden, dueAt: l.dueAt ? l.dueAt.toISOString() : null, submitKinds: l.submitKinds ?? null, maxPoints: l.maxPoints ?? null, videoKind: l.videoKind, videoSrc: l.videoSrc, contentHtml: l.contentHtml, releaseAfterId: l.releaseAfterId || null })) })),
    }));
    base.reviewsReceived = reviewsReceived;
  }

  return base;
}
