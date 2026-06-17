// ============================================================
//  OTR Academy · seed REAL — "Own the Room. Master the Art of Speaking."
//  By Students, For Students.
//
//  Carga el contenido real de OTR en la base de datos. Idempotente:
//  borra en orden seguro por FKs y vuelve a sembrar. Funciona igual en
//  SQLite (dev) y PostgreSQL (Hostinger) — el código Prisma es idéntico.
//
//  Usuarios sembrados (password: env SEED_PASSWORD, o una generada que se imprime al sembrar):
//    · saul@otr.do            → Saúl (TEACHER / Head Coach)
//    · analia.reyes@otr.do    → Analía (STUDENT "me" del Aula)
//    · + 7 estudiantes del roster de Public Forum I
// ============================================================
import { PrismaClient } from "@prisma/client";
import { randomBytes } from "crypto";
import { hashPassword } from "../app/lib/auth-crypto";

const db = new PrismaClient();

// Videos de YouTube reales y estables (educación de debate / oratoria).
const YT_CWI = "3cwCnkH47Lc"; // "Debate: Claim · Warrant · Impact"
const YT_SPEAK = "8S0FDjFBj8o"; // Julian Treasure — "How to speak so that people want to listen" (TED)

async function main() {
  // ----------------------------------------------------------------
  //  0) GUARDA ANTI-BORRADO — el seed BORRA toda la base. Nunca debe
  //     correr por accidente sobre datos reales de producción.
  //     Para forzar (primer despliegue / reset intencional): SEED_FORCE=1
  // ----------------------------------------------------------------
  const force = process.env.SEED_FORCE === "1";
  // Guard de PRODUCCIÓN: SIEMPRE activo, incluso con SEED_FORCE=1 (antes estaba dentro del
  // if(!force) y era saltable → OPS-6). El seed BORRA toda la base; en producción exige un
  // override explícito y SEPARADO para que no se dispare por accidente ni por un script.
  if (process.env.NODE_ENV === "production" && process.env.SEED_ALLOW_PROD !== "1") {
    console.error("✗ Abortado: NODE_ENV=production. El seed BORRA TODO. Para forzarlo de verdad usa SEED_ALLOW_PROD=1 ADEMÁS de SEED_FORCE=1.");
    await db.$disconnect();
    process.exit(1);
  }
  if (!force) {
    const users = await db.user.count();
    if (users > 0) {
      console.error(`✗ Abortado: la base ya tiene ${users} usuario(s). El seed BORRARÍA todo.`);
      console.error("  Si de verdad quieres re-sembrar (¡pierdes los datos!), corre con SEED_FORCE=1.");
      await db.$disconnect();
      process.exit(1);
    }
  }

  // ----------------------------------------------------------------
  //  1) LIMPIEZA — hijos primero, padres al final (respeta las FKs)
  // ----------------------------------------------------------------
  await db.upload.deleteMany();
  await db.passwordReset.deleteMany();
  // Debate Hub (PRD §6) — hijos primero (FKs en cascada, pero somos explícitos).
  await db.rubricScore.deleteMany();
  await db.ballot.deleteMany();
  await db.ratingUpdate.deleteMany();
  await db.debateRecord.deleteMany();
  await db.tournamentRound.deleteMany();
  await db.tournamentRegistration.deleteMany();
  await db.tournament.deleteMany();
  await db.quizOption.deleteMany();
  await db.quizQuestion.deleteMany();
  await db.quiz.deleteMany();
  await db.lessonProgress.deleteMany();
  await db.quizAttempt.deleteMany();
  await db.submission.deleteMany();
  await db.certificate.deleteMany();
  await db.studentSkill.deleteMany();
  await db.review.deleteMany();
  await db.resource.deleteMany();
  await db.gradeCell.deleteMany();
  await db.chatMessage.deleteMany();
  await db.conversationParticipant.deleteMany();
  await db.conversation.deleteMany();
  await db.report.deleteMany();
  await db.forumPost.deleteMany();
  await db.forumThread.deleteMany();
  // Ledger universal (PRD §8): sin FK a User, hay que limpiarlo explícito.
  await db.activityEvent.deleteMany();
  await db.activityItem.deleteMany();
  await db.eventItem.deleteMany();
  await db.notification.deleteMany();
  await db.badge.deleteMany();
  await db.competency.deleteMany();
  await db.lesson.deleteMany();
  await db.module.deleteMany();
  await db.enrollment.deleteMany();
  await db.course.deleteMany();
  await db.level.deleteMany();
  // Marketplace (PRD §7) + Parent Portal (PRD §11) — hijos antes que padres.
  await db.coachSession.deleteMany();
  await db.escrowTxn.deleteMany();
  await db.booking.deleteMany();
  await db.coachPackage.deleteMany();
  await db.coachAvailability.deleteMany();
  await db.coachProfile.deleteMany();
  await db.guardianship.deleteMany();
  await db.user.deleteMany();

  // ----------------------------------------------------------------
  //  2) USUARIOS — perfiles SEPARADOS (coach real + roster real)
  // ----------------------------------------------------------------
  // Password de las cuentas demo: de SEED_PASSWORD, o una aleatoria que se imprime (ya no
  // hardcodeada "otr1234" en el repo público → SEC-4/OPS-6).
  const SEED_PW = process.env.SEED_PASSWORD || randomBytes(6).toString("base64url");
  if (!process.env.SEED_PASSWORD) console.log(`→ Password de las cuentas demo (generada — guárdala): ${SEED_PW}`);
  const pw = hashPassword(SEED_PW);

  // Coach / Head Coach — perfil completo (cara profesor del Hub)
  await db.user.create({
    data: {
      id: "u-saul",
      name: "Saúl Méndez",
      email: "saul@otr.do",
      role: "TEACHER",
      initials: "SM",
      level: "Elite",
      xp: 0,
      streak: 0,
      passwordHash: pw,
      emailVerified: true,
      coachVerified: true, // PRD §7: badge de verificación en el marketplace
      headline: "Head Coach · Public Forum",
      formats: "PF,LD,Parli",
      bio:
        "Head Coach de OTR Academy. He entrenado a equipos dominicanos hasta romper en Florida Blue Key, " +
        "campeonatos en New Horizons y co-campeonatos en St. Michael's. Mi enfoque: estructura impecable, " +
        "evidencia creíble y presencia escénica que hace que el juez te escuche desde el primer claim. " +
        "By Students, For Students.",
      teachingStyle:
        "Trabajo por drills progresivos: primero vencemos la ansiedad escénica, luego construimos casos con la " +
        "estructura Claim · Warrant · Impact, y cerramos con simulacros semanales con jueces y feedback personalizado.",
      location: "Santo Domingo, RD",
    },
  });

  // Estudiantes — el "me" del Aula es Analía (analia.reyes@otr.do) + roster.
  // Debate Hub (PRD §6): rating Glicko-2 por debatiente. RD bajo (<150) = rating
  // consolidado (no provisional); RD alto = aún "soft". Tiers variados para poblar
  // la escalera Novato→…→Grandmaster del leaderboard.
  // Age-gate (PRD §11.3): academia 12-17 → la mayoría son menores (ageBand
  // 'minor' activa el SAFETY GATE de consentimiento en el marketplace).
  // Analía (la cuenta demo) y las Varsity mayores quedan 'adult' para poder
  // demostrar la reserva directa sin gate.
  const students = [
    { id: "u-ar", name: "Analía Reyes", email: "analia.reyes@otr.do", initials: "AR", level: "Varsity", xp: 3120, streak: 12, location: "Santiago, RD", debateRating: 1720, debateRd: 80, debateVol: 0.055, debateTier: "Gold", birthYear: 2007, ageBand: "adult" },
    { id: "u-si", name: "Silvana Espaillat", email: "silvana.espaillat@otr.do", initials: "SE", level: "Varsity", xp: 3340, streak: 8, location: "Santiago, RD", debateRating: 1815, debateRd: 95, debateVol: 0.05, debateTier: "Platinum", birthYear: 2008, ageBand: "adult" },
    { id: "u-is", name: "Isabella Guzmán", email: "isabella.guzman@otr.do", initials: "IG", level: "Varsity", xp: 4120, streak: 7, location: "Santo Domingo, RD", debateRating: 1850, debateRd: 70, debateVol: 0.048, debateTier: "Platinum", birthYear: 2008, ageBand: "adult" },
    { id: "u-aa", name: "Aaron Méndez", email: "aaron.mendez@otr.do", initials: "AM", level: "Varsity", xp: 3980, streak: 6, location: "Santo Domingo, RD", debateRating: 1690, debateRd: 110, debateVol: 0.06, debateTier: "Gold", birthYear: 2009, ageBand: "minor" },
    { id: "u-jo", name: "Jose Fernández", email: "jose.fernandez@otr.do", initials: "JF", level: "JV", xp: 2210, streak: 4, location: "La Vega, RD", debateRating: 1480, debateRd: 130, debateVol: 0.06, debateTier: "Silver", birthYear: 2009, ageBand: "minor" },
    { id: "u-sg", name: "Sigmund Castillo", email: "sigmund.castillo@otr.do", initials: "SC", level: "JV", xp: 2480, streak: 5, location: "La Vega, RD", debateRating: 1545, debateRd: 120, debateVol: 0.06, debateTier: "Silver", birthYear: 2010, ageBand: "minor" },
    { id: "u-cn", name: "Camila Núñez", email: "camila.nunez@otr.do", initials: "CN", level: "JV", xp: 1980, streak: 3, location: "Santo Domingo, RD", debateRating: 1420, debateRd: 160, debateVol: 0.062, debateTier: "Bronze", birthYear: 2010, ageBand: "minor" },
    { id: "u-df", name: "Diego Fermín", email: "diego.fermin@otr.do", initials: "DF", level: "Novato", xp: 820, streak: 0, location: "Punta Cana, RD", debateRating: 1360, debateRd: 220, debateVol: 0.065, debateTier: "Novato", birthYear: 2011, ageBand: "minor" },
  ];
  await db.user.createMany({
    data: students.map((s) => ({
      id: s.id,
      name: s.name,
      email: s.email,
      role: "STUDENT",
      initials: s.initials,
      level: s.level,
      xp: s.xp,
      streak: s.streak,
      passwordHash: pw,
      emailVerified: true,
      location: s.location,
      debateRating: s.debateRating,
      debateRd: s.debateRd,
      debateVol: s.debateVol,
      debateTier: s.debateTier,
      birthYear: s.birthYear,
      ageBand: s.ageBand,
      // PRD §2.2: los estudiantes sembrados ya tienen historia → placement hecho.
      // (Un alumno NUEVO registrado en vivo nace con placedAt=null y ve el placement.)
      placedAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000),
    })),
  });

  // PRD §13 (membresía simulada) + §8.4 (perfil público compartible): Analía es
  // la demo viva — PRO desde hace 2 meses y perfil público habilitado en
  // /p/analia-reyes. El resto del roster queda en el default free/privado.
  const monthsAgoDate = (m: number) => new Date(Date.now() - m * 30 * 24 * 60 * 60 * 1000);
  await db.user.update({
    where: { id: "u-ar" },
    data: {
      membership: "pro",
      membershipSince: monthsAgoDate(2),
      publicSlug: "analia-reyes",
      publicProfile: true,
    },
  });

  // Familia demo (PRD §11): Rosa Fermín (madre de Diego, menor) — su portal
  // muestra progreso del hijo y la aprobación pendiente de la reserva PENDING.
  await db.user.create({
    data: {
      id: "u-rosa",
      name: "Rosa Fermín",
      email: "rosa.fermin@otr.do",
      role: "PARENT",
      initials: "RF",
      level: "Novato",
      xp: 0,
      streak: 0,
      passwordHash: pw,
      emailVerified: true,
      location: "Punta Cana, RD",
    },
  });
  await db.guardianship.create({
    data: {
      id: "g-rosa-df",
      parentId: "u-rosa",
      studentId: "u-df",
      status: "ACTIVE",
      // 'standard': cada reserva del menor requiere aprobación explícita
      // (consentLevel 'full' confirmaría directo — ver POST /api/bookings).
      consentLevel: "standard",
      // PRD §11.3: umbral demo — auto-aprueba hasta $25 (2500¢). La reserva demo
      // de Diego ($45) queda por encima → sigue requiriendo aprobación de Rosa.
      approveUnderCents: 2500,
    },
  });

  // ADMIN (PRD §3.3): consola de moderación. Login admin@otr.do.
  await db.user.create({
    data: {
      id: "u-admin",
      name: "Equipo OTR",
      email: "admin@otr.do",
      role: "ADMIN",
      initials: "OT",
      level: "Elite",
      xp: 0,
      streak: 0,
      passwordHash: pw,
      emailVerified: true,
      location: "Santo Domingo, RD",
    },
  });

  // ----------------------------------------------------------------
  //  3) NIVELES (Novato · JV · Varsity · Elite)
  // ----------------------------------------------------------------
  await db.level.createMany({
    data: [
      { name: "Novato", range: "0 – 999 XP", color: "var(--lvl-novato)", startXp: 0, position: 0 },
      { name: "JV", range: "1.000 – 2.499 XP", color: "var(--lvl-jv)", startXp: 1000, position: 1 },
      { name: "Varsity", range: "2.500 – 4.999 XP", color: "var(--lvl-varsity)", startXp: 2500, position: 2 },
      { name: "Elite", range: "5.000+ XP", color: "var(--lvl-elite)", startXp: 5000, position: 3 },
    ],
  });

  // ----------------------------------------------------------------
  //  4) PROGRAMAS reales (Course) — todos impartidos por Saúl
  //     PF-101 es el curso principal del Aula (MAIN_COURSE).
  // ----------------------------------------------------------------
  await db.course.createMany({
    data: [
      {
        id: "c-pf",
        code: "PF-101",
        name: "Public Forum I",
        // PRD §17.3: i18n estructural — variante EN del curso principal (prueba viva
        // de "bilingual from day one"). Al conmutar a EN el Aula sirve estos campos.
        nameEn: "Public Forum I",
        coachName: "Saúl Méndez",
        color: "#2CAA20",
        next: "Refutación cruzada (crossfire)",
        lessonsCount: 10,
        studentsCount: 8,
        priceCents: 0, // sesión introductoria gratis
        position: 0,
        teacherId: "u-saul",
        format: "PF",
        modality: "online",
        capacity: 16,
        summary:
          "Domina el formato Public Forum desde cero: construye casos con Claim · Warrant · Impact, gana el crossfire " +
          "y aprende a refutar el impacto sin caer en falacias. Incluye simulacros semanales con jueces.",
        summaryEn:
          "Master Public Forum from the ground up: build cases with Claim · Warrant · Impact, win the crossfire, " +
          "and learn to rebut the impact without falling into fallacies. Includes weekly scrimmages with judges.",
      },
      {
        id: "c-ld",
        code: "LD-101",
        name: "Lincoln-Douglas Foundations",
        coachName: "Saúl Méndez",
        color: "#F2B814",
        next: "Marcos de valor (value/criterion)",
        lessonsCount: 6,
        studentsCount: 3,
        priceCents: 14900,
        position: 1,
        teacherId: "u-saul",
        format: "LD",
        modality: "online",
        capacity: 14,
        summary:
          "El debate de valores uno a uno. Aprende a estructurar un caso alrededor de un value y su criterion, " +
          "a manejar filosofía aplicada y a ganar el reloj en un formato donde cada segundo cuenta.",
      },
      {
        id: "c-pa",
        code: "PARLI-101",
        name: "Parliamentary Essentials",
        coachName: "Saúl Méndez",
        color: "#2CAA20",
        next: "POIs y estrategia de banca",
        lessonsCount: 0,
        studentsCount: 2,
        priceCents: 12900,
        position: 2,
        teacherId: "u-saul",
        format: "Parli",
        modality: "híbrido",
        capacity: 18,
        summary:
          "Piensa rápido y habla con autoridad. Parliamentary entrena improvisación, Points of Information y " +
          "trabajo en banca. Ideal para ganar fluidez bajo presión y dominar cualquier sala.",
      },
      {
        id: "c-pol",
        code: "POL-101",
        name: "Policy Debate",
        coachName: "Saúl Méndez",
        color: "#F2B814",
        next: "Plan, disadvantages y solvency",
        lessonsCount: 0,
        studentsCount: 0,
        priceCents: 17900,
        position: 3,
        teacherId: "u-saul",
        format: "Policy",
        modality: "online",
        capacity: 12,
        summary:
          "El formato más exigente en investigación. Construye un plan, defiéndelo contra disadvantages y " +
          "counterplans, y aprende a manejar volúmenes grandes de evidencia con precisión quirúrgica.",
      },
      {
        id: "c-ora",
        code: "ORA-101",
        name: "Oratoria & Speaking",
        coachName: "Saúl Méndez",
        color: "#1E8C16",
        next: "Cierre persuasivo y control del escenario",
        lessonsCount: 0,
        studentsCount: 4,
        priceCents: 0, // gratis — transversal a todos los programas
        position: 4,
        teacherId: "u-saul",
        format: "Oratoria",
        modality: "presencial",
        capacity: 24,
        summary:
          "La habilidad transversal de OTR: comanda la atención, lidera con claridad y adueñate del escenario. " +
          "Drills de voz, lenguaje corporal y estructura de discurso que sirven para debate y para la vida.",
      },
    ],
  });

  // ----------------------------------------------------------------
  //  5) MÓDULOS + LECCIONES de Public Forum I (3 módulos, 9 lecciones)
  // ----------------------------------------------------------------
  await db.module.createMany({
    data: [
      { id: "m-1", courseId: "c-pf", title: "Unidad 1 · Fundamentos de Public Forum", position: 0, done: true, locked: false },
      { id: "m-2", courseId: "c-pf", title: "Unidad 2 · Construcción del caso", position: 1, done: false, locked: false },
      { id: "m-3", courseId: "c-pf", title: "Unidad 3 · Refutación y crossfire", position: 2, done: false, locked: false },
    ],
  });

  // IDs explícitos de lección para enganchar progreso, quiz y entregas.
  const L = {
    welcome: "l-pf-welcome",
    format: "l-pf-format",
    cwiVideo: "l-pf-cwi",
    quizU1: "l-pf-quiz1",
    contention: "l-pf-contention",
    evidence: "l-pf-evidence",
    crossfire: "l-pf-crossfire",
    rebuttal: "l-pf-rebuttal",
    scrimmage: "l-pf-scrimmage",
  };

  await db.lesson.createMany({
    data: [
      // --- Unidad 1 ---
      {
        id: L.welcome, moduleId: "m-1", title: "Bienvenida y diagnóstico", type: "video", position: 0, done: true,
        titleEn: "Welcome and diagnostic",
        dur: "8 min", videoKind: "youtube", videoSrc: YT_SPEAK,
      },
      {
        id: L.format, moduleId: "m-1", title: "Qué es Public Forum: roles, tiempos y flujo de la ronda", type: "lesson", position: 1, done: true,
        titleEn: "What is Public Forum: roles, timing and the flow of the round",
        dur: "15 min",
        contentHtml:
          "<p>Public Forum (PF) es un formato de debate de equipos (2 vs 2) pensado para audiencias generales: " +
          "el juez es un votante informado, no un especialista. Cada ronda sigue un flujo fijo de discursos " +
          "constructivos, refutaciones, <em>summary</em> y <em>final focus</em>, intercalados con tres rondas de " +
          "<strong>crossfire</strong> (preguntas cruzadas).</p>" +
          "<h3>El orden de la ronda</h3>" +
          "<ol>" +
          "<li><strong>Constructive</strong> — cada equipo presenta su caso.</li>" +
          "<li><strong>Crossfire</strong> — los oradores se preguntan entre sí.</li>" +
          "<li><strong>Rebuttal</strong> — atacas el caso del rival.</li>" +
          "<li><strong>Summary</strong> — resumes por qué vas ganando.</li>" +
          "<li><strong>Final Focus</strong> — el último argumento que el juez se lleva a la mesa.</li>" +
          "</ol>" +
          "<p>Regla de oro OTR: <strong>habla para el juez, no para tu rival</strong>. Si el votante no entiende tu " +
          "impacto en 10 segundos, no existe.</p>",
        contentHtmlEn:
          "<p>Public Forum (PF) is a team debate format (2 vs 2) built for general audiences: " +
          "the judge is an informed voter, not a specialist. Every round follows a fixed flow of constructive " +
          "speeches, rebuttals, <em>summary</em> and <em>final focus</em>, interspersed with three rounds of " +
          "<strong>crossfire</strong> (cross-examination questions).</p>" +
          "<h3>The order of the round</h3>" +
          "<ol>" +
          "<li><strong>Constructive</strong> — each team presents its case.</li>" +
          "<li><strong>Crossfire</strong> — the speakers question each other.</li>" +
          "<li><strong>Rebuttal</strong> — you attack the opponent's case.</li>" +
          "<li><strong>Summary</strong> — you sum up why you are winning.</li>" +
          "<li><strong>Final Focus</strong> — the last argument the judge takes to the table.</li>" +
          "</ol>" +
          "<p>OTR golden rule: <strong>speak to the judge, not to your opponent</strong>. If the voter can't grasp your " +
          "impact in 10 seconds, it doesn't exist.</p>",
      },
      {
        id: L.cwiVideo, moduleId: "m-1", title: "Claim · Warrant · Impact en video", type: "video", position: 2, done: true,
        titleEn: "Claim · Warrant · Impact on video",
        dur: "12 min", videoKind: "youtube", videoSrc: YT_CWI,
      },
      {
        id: L.quizU1, moduleId: "m-1", title: "Quiz: fundamentos de Public Forum", type: "quiz", position: 3, done: true,
        titleEn: "Quiz: Public Forum fundamentals",
        grade: "90%",
      },
      // --- Unidad 2 ---
      {
        id: L.contention, moduleId: "m-2", title: "Construye tu primer contention", type: "assign", position: 0, done: false,
        titleEn: "Build your first contention",
        due: "Mañana · 23:59",
        contentHtml:
          "<p>Entrega tu primer <strong>contention</strong> completo usando la estructura " +
          "<strong>Claim · Warrant · Impact</strong>. Debe incluir al menos una pieza de evidencia citada " +
          "(autor, fuente y año). Sube un PDF o pega el texto.</p>" +
          "<ul><li><strong>Claim</strong>: la afirmación en una frase.</li>" +
          "<li><strong>Warrant</strong>: por qué tu evidencia respalda el claim.</li>" +
          "<li><strong>Impact</strong>: qué pasa en el mundo si tu claim es cierto (magnitud + probabilidad).</li></ul>",
        contentHtmlEn:
          "<p>Submit your first complete <strong>contention</strong> using the " +
          "<strong>Claim · Warrant · Impact</strong> structure. It must include at least one cited piece of evidence " +
          "(author, source and year). Upload a PDF or paste the text.</p>" +
          "<ul><li><strong>Claim</strong>: the assertion in a single sentence.</li>" +
          "<li><strong>Warrant</strong>: why your evidence backs the claim.</li>" +
          "<li><strong>Impact</strong>: what happens in the world if your claim is true (magnitude + probability).</li></ul>",
      },
      {
        id: L.evidence, moduleId: "m-2", title: "Evidencia creíble: cómo cortar y citar cards", type: "lesson", position: 1, done: false,
        titleEn: "Credible evidence: how to cut and cite cards",
        dur: "16 min",
        contentHtml:
          "<p>Una <em>card</em> es una pieza de evidencia recortada: <strong>tag</strong> (lo que prueba), " +
          "<strong>cita</strong> (autor, credencial, fuente, año) y el <strong>texto</strong> subrayado. " +
          "En PF el juez confía en evidencia que pueda verificar.</p>" +
          "<p><strong>Checklist OTR de evidencia:</strong></p>" +
          "<ol><li>¿La fuente es creíble y reciente?</li>" +
          "<li>¿El autor tiene credenciales en el tema?</li>" +
          "<li>¿El texto realmente dice lo que tu tag afirma (sin <em>power-tagging</em>)?</li>" +
          "<li>¿Puedes producir la card completa si el rival la pide?</li></ol>",
        contentHtmlEn:
          "<p>A <em>card</em> is a trimmed piece of evidence: a <strong>tag</strong> (what it proves), " +
          "a <strong>citation</strong> (author, credential, source, year) and the underlined <strong>text</strong>. " +
          "In PF the judge trusts evidence they can verify.</p>" +
          "<p><strong>OTR evidence checklist:</strong></p>" +
          "<ol><li>Is the source credible and recent?</li>" +
          "<li>Does the author have credentials on the topic?</li>" +
          "<li>Does the text really say what your tag claims (no <em>power-tagging</em>)?</li>" +
          "<li>Can you produce the full card if the opponent asks for it?</li></ol>",
      },
      {
        id: L.scrimmage, moduleId: "m-2", title: "Grabación: discurso constructivo de 2 min", type: "mic", position: 2, done: false,
        titleEn: "Recording: 2-minute constructive speech",
        due: "Viernes · 23:59",
        contentHtml:
          "<p>Graba tu discurso constructivo de <strong>2 minutos</strong> presentando tus dos contentions. " +
          "Trabaja la <strong>presencia</strong>: ritmo, pausas y contacto visual con la cámara. " +
          "Súbelo como audio o video y recibirás feedback del coach.</p>",
        contentHtmlEn:
          "<p>Record your <strong>2-minute</strong> constructive speech presenting your two contentions. " +
          "Work on <strong>presence</strong>: pacing, pauses and eye contact with the camera. " +
          "Upload it as audio or video and you'll receive feedback from your coach.</p>",
      },
      // --- Unidad 3 ---
      {
        id: L.crossfire, moduleId: "m-3", title: "Cómo ganar el crossfire", type: "lesson", position: 0, done: false,
        titleEn: "How to win the crossfire",
        dur: "14 min",
        contentHtml:
          "<p>El <strong>crossfire</strong> no se gana siendo agresivo, se gana siendo claro. Tu objetivo no es " +
          "humillar al rival: es <strong>sembrar la pregunta</strong> cuya respuesta usarás en tu summary.</p>" +
          "<h3>Orden de preguntas en PF</h3>" +
          "<p>Tras los dos constructivos, el <strong>primer orador</strong> de cada equipo hace el primer crossfire; " +
          "quien habló primero formula la primera pregunta. En el Grand Crossfire participan los cuatro debatientes.</p>" +
          "<p><strong>Regla OTR:</strong> haz preguntas <em>cerradas</em> que comprometan al rival, y nunca cedas " +
          "todo tu tiempo a responder — pregunta de vuelta.</p>",
        contentHtmlEn:
          "<p>The <strong>crossfire</strong> isn't won by being aggressive, it's won by being clear. Your goal isn't " +
          "to humiliate the opponent: it's to <strong>plant the question</strong> whose answer you'll use in your summary.</p>" +
          "<h3>Question order in PF</h3>" +
          "<p>After the two constructives, the <strong>first speaker</strong> of each team runs the first crossfire; " +
          "whoever spoke first asks the first question. All four debaters take part in the Grand Crossfire.</p>" +
          "<p><strong>OTR rule:</strong> ask <em>closed</em> questions that commit the opponent, and never give away " +
          "all your time to answering — ask back.</p>",
      },
      {
        id: L.rebuttal, moduleId: "m-3", title: "Refutación: ataca la lógica, no a la persona", type: "video", position: 1, done: false,
        titleEn: "Rebuttal: attack the logic, not the person",
        dur: "18 min", videoKind: "youtube", videoSrc: YT_CWI,
      },
      {
        id: "l-pf-examU3", moduleId: "m-3", title: "Examen de unidad", type: "quiz", position: 2, done: false,
        titleEn: "Unit exam",
      },
    ],
  });

  // ----------------------------------------------------------------
  //  6) QUIZ REAL de la lección quiz de PF-101 (fundamentos)
  //     Quiz + 5 preguntas + opciones (correctas marcadas).
  // ----------------------------------------------------------------
  await db.quiz.create({
    data: {
      id: "q-pf-u1",
      lessonId: L.quizU1,
      title: "Quiz: fundamentos de Public Forum",
      passScore: 60,
      questions: {
        create: [
          {
            prompt: "En la estructura Claim · Warrant · Impact, ¿qué es el WARRANT?",
            position: 0,
            options: {
              create: [
                { text: "La afirmación principal en una sola frase", correct: false, position: 0 },
                { text: "El razonamiento que conecta tu evidencia con tu claim", correct: true, position: 1 },
                { text: "Lo que pasa en el mundo si tu claim es cierto", correct: false, position: 2 },
                { text: "La fuente y el año de la evidencia citada", correct: false, position: 3 },
              ],
            },
          },
          {
            prompt: "¿Qué dos dimensiones describen mejor un buen IMPACT en Public Forum?",
            position: 1,
            options: {
              create: [
                { text: "Magnitud y probabilidad", correct: true, position: 0 },
                { text: "Volumen y velocidad", correct: false, position: 1 },
                { text: "Tono y vocabulario", correct: false, position: 2 },
                { text: "Longitud y cantidad de cards", correct: false, position: 3 },
              ],
            },
          },
          {
            prompt: "Sobre el CROSSFIRE en Public Forum, ¿cuál afirmación es correcta?",
            position: 2,
            options: {
              create: [
                { text: "El juez hace las preguntas a los equipos", correct: false, position: 0 },
                { text: "Es un periodo de preguntas cruzadas entre los oradores", correct: true, position: 1 },
                { text: "Solo el equipo que va ganando puede preguntar", correct: false, position: 2 },
                { text: "Está prohibido hacer preguntas cerradas", correct: false, position: 3 },
              ],
            },
          },
          {
            prompt: "¿Cuál es la mejor forma de refutar el impacto del rival sin caer en falacias?",
            position: 3,
            options: {
              create: [
                { text: "Cuestionar la credibilidad personal del orador rival", correct: false, position: 0 },
                { text: "Atacar la probabilidad y la magnitud del impacto con lógica y evidencia", correct: true, position: 1 },
                { text: "Hablar más rápido para no dar tiempo a responder", correct: false, position: 2 },
                { text: "Ignorar el argumento y repetir el tuyo", correct: false, position: 3 },
              ],
            },
          },
          {
            prompt: "¿Cuál de estos NO es un discurso del flujo de una ronda de Public Forum?",
            position: 4,
            options: {
              create: [
                { text: "Constructive", correct: false, position: 0 },
                { text: "Summary", correct: false, position: 1 },
                { text: "Final Focus", correct: false, position: 2 },
                { text: "Cross-Examination de 3 minutos individual", correct: true, position: 3 },
              ],
            },
          },
        ],
      },
    },
  });

  // ----------------------------------------------------------------
  //  6.5) MÓDULOS + LECCIONES de Lincoln-Douglas Foundations (LD-101)
  //       El Moodle multi-curso necesita más de un curso con contenido:
  //       LD-101 (c-ld) recibe 2 unidades con 3 lecciones cada una
  //       (tipos variados lesson/video/quiz) y un quiz real. Mismo patrón
  //       que PF-101: módulos con IDs explícitos → lecciones por moduleId.
  // ----------------------------------------------------------------
  await db.module.createMany({
    data: [
      { id: "m-ld-1", courseId: "c-ld", title: "Unidad 1 · Fundamentos del Lincoln-Douglas", position: 0, done: false, locked: false },
      { id: "m-ld-2", courseId: "c-ld", title: "Unidad 2 · Value y Criterion", position: 1, done: false, locked: false },
    ],
  });

  // IDs explícitos de lección LD (lessonId es único global) para quiz/progreso.
  const LD = {
    intro: "l-ld-intro",
    format: "l-ld-format",
    quizU1: "l-ld-quiz1",
    value: "l-ld-value",
    criterion: "l-ld-criterion",
    caseStruct: "l-ld-casestruct",
  };

  await db.lesson.createMany({
    data: [
      // --- Unidad 1 · Fundamentos del LD ---
      {
        id: LD.intro, moduleId: "m-ld-1", title: "Bienvenida: qué es Lincoln-Douglas", type: "video", position: 0, done: false,
        titleEn: "Welcome: what is Lincoln-Douglas",
        dur: "9 min", videoKind: "youtube", videoSrc: YT_SPEAK,
      },
      {
        id: LD.format, moduleId: "m-ld-1", title: "El formato uno a uno: roles, tiempos y flujo de la ronda", type: "lesson", position: 1, done: false,
        titleEn: "The one-on-one format: roles, timing and the flow of the round",
        dur: "15 min",
        contentHtml:
          "<p>Lincoln-Douglas (LD) es un debate de <strong>valores uno a uno</strong> (1 vs 1): no se discute una " +
          "política concreta, sino qué <em>valor</em> debe priorizar la sociedad. El juez evalúa qué debatiente " +
          "defiende mejor su marco de valor a lo largo de la ronda.</p>" +
          "<h3>El orden de la ronda</h3>" +
          "<ol>" +
          "<li><strong>Constructivo Afirmativo (AC)</strong> — 6 min: presentas tu value, tu criterion y tus contentions.</li>" +
          "<li><strong>Cross-examination</strong> — 3 min: la negación interroga.</li>" +
          "<li><strong>Constructivo Negativo (NC)</strong> — 7 min: tu caso + refutas el AFF.</li>" +
          "<li><strong>Cross-examination</strong> — 3 min: la afirmación interroga.</li>" +
          "<li><strong>Primer Rebuttal Afirmativo (1AR)</strong> — 4 min: el discurso más exigente del formato.</li>" +
          "<li><strong>Rebuttal Negativo (NR)</strong> y <strong>Segundo Rebuttal Afirmativo (2AR)</strong> — cierres.</li>" +
          "</ol>" +
          "<p>Regla de oro OTR: en LD <strong>el framework decide la ronda</strong>. Si ganas el value y el " +
          "criterion, el juez evalúa todo lo demás a través de tu lente.</p>",
        contentHtmlEn:
          "<p>Lincoln-Douglas (LD) is a <strong>one-on-one values debate</strong> (1 vs 1): you don't argue a " +
          "specific policy, but which <em>value</em> society should prioritize. The judge evaluates which debater " +
          "best defends their value framework across the round.</p>" +
          "<h3>The order of the round</h3>" +
          "<ol>" +
          "<li><strong>Affirmative Constructive (AC)</strong> — 6 min: present your value, criterion and contentions.</li>" +
          "<li><strong>Cross-examination</strong> — 3 min: the negative questions.</li>" +
          "<li><strong>Negative Constructive (NC)</strong> — 7 min: your case + refute the AFF.</li>" +
          "<li><strong>Cross-examination</strong> — 3 min: the affirmative questions.</li>" +
          "<li><strong>First Affirmative Rebuttal (1AR)</strong> — 4 min: the most demanding speech of the format.</li>" +
          "<li><strong>Negative Rebuttal (NR)</strong> and <strong>Second Affirmative Rebuttal (2AR)</strong> — closers.</li>" +
          "</ol>" +
          "<p>OTR golden rule: in LD <strong>the framework decides the round</strong>. If you win the value and the " +
          "criterion, the judge evaluates everything else through your lens.</p>",
      },
      {
        id: LD.quizU1, moduleId: "m-ld-1", title: "Quiz: fundamentos del Lincoln-Douglas", type: "quiz", position: 2, done: false,
        titleEn: "Quiz: Lincoln-Douglas fundamentals",
      },
      // --- Unidad 2 · Value y Criterion ---
      {
        id: LD.value, moduleId: "m-ld-2", title: "El value: cómo elegir y defender tu valor central", type: "lesson", position: 0, done: false,
        titleEn: "The value: how to choose and defend your core value",
        dur: "16 min",
        contentHtml:
          "<p>El <strong>value</strong> (o <em>value premise</em>) es el ideal abstracto que tu caso sostiene como " +
          "lo más importante en la ronda: justicia, libertad, vida, autonomía, bien común. No se prueba con " +
          "evidencia empírica — se <strong>justifica con filosofía aplicada</strong>.</p>" +
          "<p><strong>Cómo elegir tu value:</strong></p>" +
          "<ol><li>¿Qué pide explícitamente la resolución? (a veces el value está en el texto).</li>" +
          "<li>¿Es defendible desde más de un filósofo o marco?</li>" +
          "<li>¿Puedes conectarlo con TODAS tus contentions?</li></ol>" +
          "<p>Regla OTR: un value que no puedes conectar a tus contentions es un value que vas a <em>perder</em> " +
          "en el 1AR. Elige el que mejor sostenga tu historia completa.</p>",
        contentHtmlEn:
          "<p>The <strong>value</strong> (or <em>value premise</em>) is the abstract ideal your case holds as " +
          "most important in the round: justice, liberty, life, autonomy, the common good. It is not proven with " +
          "empirical evidence — it is <strong>justified with applied philosophy</strong>.</p>" +
          "<p><strong>How to choose your value:</strong></p>" +
          "<ol><li>What does the resolution explicitly call for? (sometimes the value is in the text).</li>" +
          "<li>Is it defensible from more than one philosopher or framework?</li>" +
          "<li>Can you connect it to ALL of your contentions?</li></ol>" +
          "<p>OTR rule: a value you can't connect to your contentions is a value you'll <em>lose</em> in the 1AR. " +
          "Pick the one that best holds up your full story.</p>",
      },
      {
        id: LD.criterion, moduleId: "m-ld-2", title: "El criterion: el mecanismo que mide tu value", type: "video", position: 1, done: false,
        titleEn: "The criterion: the mechanism that measures your value",
        dur: "13 min", videoKind: "youtube", videoSrc: YT_CWI,
      },
      {
        id: LD.caseStruct, moduleId: "m-ld-2", title: "Estructura del caso AFF/NEG: del framework al impacto", type: "lesson", position: 2, done: false,
        titleEn: "AFF/NEG case structure: from framework to impact",
        dur: "18 min",
        contentHtml:
          "<p>Un caso LD bien armado tiene una columna vertebral clara: <strong>value → criterion → contentions</strong>. " +
          "Cada contention debe <em>cumplir</em> el criterion, y el criterion debe <em>servir</em> al value.</p>" +
          "<h3>Esqueleto del caso</h3>" +
          "<ol>" +
          "<li><strong>Framework</strong>: enuncia tu value y tu criterion, y explica por qué el juez debe votar bajo ellos.</li>" +
          "<li><strong>Contention 1 y 2</strong>: cada una con claim, warrant filosófico/empírico e impacto que cumple el criterion.</li>" +
          "<li><strong>Voters</strong>: en el rebuttal, reduce la ronda a 1-2 razones por las que cumples el value mejor que tu rival.</li>" +
          "</ol>" +
          "<p>AFF defiende la resolución; NEG la niega o presenta un counter-framework. " +
          "Regla OTR: <strong>el lado que controla el framework controla el flujo del juez</strong>.</p>",
        contentHtmlEn:
          "<p>A well-built LD case has a clear backbone: <strong>value → criterion → contentions</strong>. " +
          "Each contention must <em>meet</em> the criterion, and the criterion must <em>serve</em> the value.</p>" +
          "<h3>Case skeleton</h3>" +
          "<ol>" +
          "<li><strong>Framework</strong>: state your value and criterion, and explain why the judge should vote under them.</li>" +
          "<li><strong>Contention 1 and 2</strong>: each with a claim, a philosophical/empirical warrant and an impact that meets the criterion.</li>" +
          "<li><strong>Voters</strong>: in the rebuttal, collapse the round to 1-2 reasons you meet the value better than your opponent.</li>" +
          "</ol>" +
          "<p>AFF defends the resolution; NEG negates it or offers a counter-framework. " +
          "OTR rule: <strong>the side that controls the framework controls the judge's flow</strong>.</p>",
      },
    ],
  });

  // Quiz real de la Unidad 1 de LD-101 (3 preguntas, opción correcta marcada).
  await db.quiz.create({
    data: {
      id: "q-ld-u1",
      lessonId: LD.quizU1,
      title: "Quiz: fundamentos del Lincoln-Douglas",
      passScore: 60,
      questions: {
        create: [
          {
            prompt: "En Lincoln-Douglas, ¿qué se debate fundamentalmente?",
            position: 0,
            options: {
              create: [
                { text: "Qué política concreta debe adoptar un gobierno", correct: false, position: 0 },
                { text: "Qué valor debe priorizar la sociedad", correct: true, position: 1 },
                { text: "Qué equipo cita más evidencia empírica", correct: false, position: 2 },
                { text: "Qué orador habla más rápido bajo presión", correct: false, position: 3 },
              ],
            },
          },
          {
            prompt: "¿Qué relación existe entre el VALUE y el CRITERION?",
            position: 1,
            options: {
              create: [
                { text: "Son sinónimos: dan lo mismo en la ronda", correct: false, position: 0 },
                { text: "El criterion es el mecanismo que mide si se cumple el value", correct: true, position: 1 },
                { text: "El value mide al criterion, no al revés", correct: false, position: 2 },
                { text: "Ninguno importa si tienes más cards que el rival", correct: false, position: 3 },
              ],
            },
          },
          {
            prompt: "¿Cuál de estos NO es un discurso del flujo de una ronda de Lincoln-Douglas?",
            position: 2,
            options: {
              create: [
                { text: "Constructivo Afirmativo (AC)", correct: false, position: 0 },
                { text: "Primer Rebuttal Afirmativo (1AR)", correct: false, position: 1 },
                { text: "Constructivo Negativo (NC)", correct: false, position: 2 },
                { text: "Grand Crossfire de los cuatro debatientes", correct: true, position: 3 },
              ],
            },
          },
        ],
      },
    },
  });

  // ----------------------------------------------------------------
  //  7) MATRÍCULAS — roster de PF-101 + cruces en otros programas
  // ----------------------------------------------------------------
  // Roster completo de Public Forum I (panel del profesor).
  await db.enrollment.createMany({
    data: [
      { userId: "u-ar", courseId: "c-pf", progress: 50, due: 2, grade: 90, attendance: 92, engagement: "Alto", trend: "up", risk: false, lastAccess: "hace 2h", source: "FREE" },
      { userId: "u-si", courseId: "c-pf", progress: 88, due: 0, grade: 93, attendance: 96, engagement: "Alto", trend: "up", risk: false, lastAccess: "hace 4h", source: "PAID" },
      { userId: "u-is", courseId: "c-pf", progress: 97, due: 0, grade: 96, attendance: 98, engagement: "Alto", trend: "up", risk: false, lastAccess: "hace 1h", source: "PAID" },
      { userId: "u-aa", courseId: "c-pf", progress: 94, due: 0, grade: 95, attendance: 97, engagement: "Alto", trend: "up", risk: false, lastAccess: "hace 3h", source: "PAID" },
      { userId: "u-jo", courseId: "c-pf", progress: 62, due: 1, grade: 80, attendance: 84, engagement: "Medio", trend: "up", risk: false, lastAccess: "hace 1d", source: "PAID" },
      { userId: "u-sg", courseId: "c-pf", progress: 70, due: 1, grade: 83, attendance: 88, engagement: "Medio", trend: "up", risk: false, lastAccess: "hace 1d", source: "PAID" },
      { userId: "u-cn", courseId: "c-pf", progress: 66, due: 1, grade: 82, attendance: 88, engagement: "Medio", trend: "flat", risk: false, lastAccess: "hace 1d", source: "PAID" },
      { userId: "u-df", courseId: "c-pf", progress: 28, due: 3, grade: 68, attendance: 70, engagement: "Bajo", trend: "down", risk: true, lastAccess: "hace 5d", source: "PAID" },
    ],
  });

  // Cruces en otros programas (para dashboard de Analía y catálogo).
  await db.enrollment.createMany({
    data: [
      { userId: "u-ar", courseId: "c-ora", progress: 40, due: 0, grade: 0, attendance: 0, engagement: "Alto", trend: "up", source: "FREE", lastAccess: "hace 2d" },
      { userId: "u-ar", courseId: "c-ld", progress: 10, due: 1, source: "PAID", lastAccess: "hace 3d" },
      { userId: "u-si", courseId: "c-pa", progress: 22, due: 1, source: "PAID", lastAccess: "hace 2d" },
      { userId: "u-is", courseId: "c-ld", progress: 35, due: 0, source: "PAID", lastAccess: "ayer" },
      { userId: "u-aa", courseId: "c-pa", progress: 30, due: 0, source: "PAID", lastAccess: "ayer" },
      { userId: "u-jo", courseId: "c-ora", progress: 18, due: 0, source: "FREE", lastAccess: "hace 4d" },
      { userId: "u-sg", courseId: "c-ld", progress: 12, due: 0, source: "PAID", lastAccess: "hace 4d" },
      { userId: "u-cn", courseId: "c-ora", progress: 25, due: 0, source: "FREE", lastAccess: "hace 3d" },
    ],
  });

  // ----------------------------------------------------------------
  //  8) DEMO viva de Analía (me) — progreso, entregas, examen, skills
  // ----------------------------------------------------------------
  // Progreso real: 5 de 10 lecciones completadas (50%). queries.ts calcula el
  // % real desde LessonProgress; el campo enrollment.progress se mantiene alineado.
  await db.lessonProgress.createMany({
    data: [
      { userId: "u-ar", lessonId: L.welcome, done: true },
      { userId: "u-ar", lessonId: L.format, done: true },
      { userId: "u-ar", lessonId: L.cwiVideo, done: true },
      { userId: "u-ar", lessonId: L.quizU1, done: true },
      { userId: "u-ar", lessonId: L.evidence, done: true },
    ],
  });

  // Entregas reales: 2 GRADED (con feedback) + 1 SUBMITTED pendiente.
  await db.submission.createMany({
    data: [
      {
        userId: "u-ar", userName: "Analía Reyes", courseCode: "PF-101",
        activity: "Diagnóstico inicial · discurso de 1 min", kind: "video",
        status: "GRADED", grade: 92,
        feedback:
          "Excelente claim — quedó clarísimo en los primeros 10 segundos. Tu warrant fue sólido. " +
          "Para subir a 95: cierra siempre con el impacto, no con un resumen. Vamos por más.",
        createdLabel: "hace 2 sem",
      },
      {
        userId: "u-ar", userName: "Analía Reyes", courseCode: "PF-101",
        activity: "Card analysis · evidencia del tema del mes", kind: "file",
        fileName: "analia-evidencia-tema-marzo.pdf",
        status: "GRADED", grade: 88,
        feedback:
          "Buena selección de fuentes y citas completas. Cuidado con el power-tagging en la card 2: " +
          "el texto no respalda del todo el tag. Revisa y vuelve a subir si quieres recalificación.",
        createdLabel: "hace 1 sem",
      },
      {
        userId: "u-ar", userName: "Analía Reyes", courseCode: "PF-101",
        activity: "Construye tu primer contention", kind: "text",
        textBody:
          "CONTENTION 1 — Claim: La adopción de IA en aulas mejora los resultados de aprendizaje. " +
          "Warrant: tutorías personalizadas a escala según un estudio de 2025. " +
          "Impact: cierra la brecha de rendimiento (magnitud alta, probabilidad media-alta).",
        status: "SUBMITTED",
        createdLabel: "ayer",
      },
    ],
  });

  // Examen real de Analía: 9/10 (90%).
  await db.quizAttempt.create({
    data: {
      userId: "u-ar", userName: "Analía Reyes",
      lessonTitle: "Quiz: fundamentos de Public Forum",
      score: 9, total: 10,
    },
  });

  // Radar de habilidades (las 6 dimensiones EXACTAS del contrato).
  await db.studentSkill.createMany({
    data: [
      { userId: "u-ar", skill: "Confianza", score: 84 },
      { userId: "u-ar", skill: "Estructura", score: 90 },
      { userId: "u-ar", skill: "Evidencia", score: 82 },
      { userId: "u-ar", skill: "Refutación", score: 76 },
      { userId: "u-ar", skill: "Cross-ex", score: 71 },
      { userId: "u-ar", skill: "Delivery", score: 88 },
    ],
  });

  // Credenciales de Analía (PRD §8: certificaciones verificables del Lifetime
  // Profile). Respetan @@unique([userId, courseId]): un curso distinto por cert.
  await db.certificate.createMany({
    data: [
      // El original del Hub: módulo introductorio gratis (Oratoria).
      { userId: "u-ar", courseId: "c-ora", title: "Fundamentos de Oratoria · OTR Academy" },
      // OTR Certified del curso principal, emitido hace ~3 meses.
      { userId: "u-ar", courseId: "c-pf", title: "OTR Certified — PF Foundations", issuedAt: monthsAgoDate(3) },
      // Certificación avanzada de refutación (colgada de LD-101), hace ~1 mes.
      { userId: "u-ar", courseId: "c-ld", title: "Advanced Rebuttal", issuedAt: monthsAgoDate(1) },
    ],
  });

  // ----------------------------------------------------------------
  //  8.5) DEBATE HUB (PRD §6) — el flagship: registro + ballot + rating
  //       Cada ronda ADJUDICADA tiene un RatingUpdate (Glicko-2). El rating
  //       SOLO se mueve en rondas adjudicadas (anti-gaming). Cada record lleva
  //       un Ballot del juez con la rúbrica (5 criterios, 0-10).
  // ----------------------------------------------------------------
  const RUBRIC = ["Argumentation", "Rebuttal", "Delivery", "Evidence/Research", "Crossfire"] as const;
  // Helper: crea un DebateRecord con su RatingUpdate 1:1 y un Ballot con rúbrica.
  type DebateSeed = {
    userId: string;
    format?: string;
    side?: "PRO" | "CON";
    opponent?: string;
    partner?: string;
    result: "WIN" | "LOSS" | "DRAW";
    source?: "OTR" | "EXTERNAL";
    eventName?: string;
    roundLabel?: string;
    daysAgo: number;
    ratingBefore: number;
    ratingAfter: number;
    rdAfter: number;
    volAfter: number;
    tierAfter: string;
    judge?: string;
    comments?: string;
    recordingUrl?: string;
    scores: [number, number, number, number, number]; // Arg, Reb, Del, Evi, Cross
  };
  const daysAgoDate = (d: number) => new Date(Date.now() - d * 24 * 60 * 60 * 1000);
  async function seedDebate(r: DebateSeed) {
    await db.debateRecord.create({
      data: {
        userId: r.userId,
        format: r.format ?? "PF",
        side: r.side ?? null,
        opponent: r.opponent ?? null,
        partner: r.partner ?? null,
        result: r.result,
        source: r.source ?? "OTR",
        eventName: r.eventName ?? null,
        roundLabel: r.roundLabel ?? null,
        recordedAt: daysAgoDate(r.daysAgo),
        // PRD §6.2: rondas sembradas = rondas reales adjudicadas (mueven rating).
        adjudicated: true,
        adjudicatedBy: "u-saul",
        rating: {
          create: {
            ratingBefore: r.ratingBefore,
            ratingAfter: r.ratingAfter,
            rdAfter: r.rdAfter,
            volAfter: r.volAfter,
            tierAfter: r.tierAfter,
          },
        },
        ballots: {
          create: [
            {
              judge: r.judge ?? "Juez OTR",
              comments: r.comments ?? null,
              recordingUrl: r.recordingUrl ?? null,
              scores: {
                create: RUBRIC.map((criterion, i) => ({ criterion, score: r.scores[i] })),
              },
            },
          ],
        },
      },
    });
  }

  // --- Analía (me) — arco de rating coherente que aterminó en ~1720 (Gold) ---
  // Orden cronológico (más antiguo → más reciente). El último ratingAfter = 1720,
  // rdAfter = 80, tier "Gold" → coincide con el perfil del usuario.
  const analiaDebates: DebateSeed[] = [
    {
      userId: "u-ar", format: "PF", side: "PRO", opponent: "Liceo Científico", partner: "Silvana Espaillat",
      result: "WIN", source: "OTR", eventName: "Scrim interno OTR", roundLabel: "Ronda 1", daysAgo: 64,
      ratingBefore: 1500, ratingAfter: 1556, rdAfter: 180, volAfter: 0.06, tierAfter: "Silver",
      judge: "Coach Saúl", comments: "Claim clarísimo y buen control del crossfire. Cierra siempre con el impacto.",
      scores: [8, 7, 8, 7, 8],
    },
    {
      userId: "u-ar", format: "PF", side: "CON", opponent: "Colegio Calasanz", partner: "Silvana Espaillat",
      result: "WIN", source: "OTR", eventName: "Scrim interno OTR", roundLabel: "Ronda 2", daysAgo: 57,
      ratingBefore: 1556, ratingAfter: 1602, rdAfter: 150, volAfter: 0.059, tierAfter: "Silver",
      judge: "Coach Saúl", comments: "Refutación sólida del impacto. Sube la probabilidad de tu segundo contention.",
      scores: [8, 8, 8, 8, 7],
    },
    {
      userId: "u-ar", format: "PF", side: "PRO", opponent: "Saint George School", partner: "Silvana Espaillat",
      result: "LOSS", source: "OTR", eventName: "Torneo interno OTR", roundLabel: "Semifinal", daysAgo: 45,
      ratingBefore: 1602, ratingAfter: 1571, rdAfter: 135, volAfter: 0.06, tierAfter: "Silver",
      judge: "Juez invitado", comments: "Perdieron el reloj en el summary. Prioriza 2 voters, no 4.",
      scores: [7, 7, 8, 7, 6],
    },
    {
      userId: "u-ar", format: "PF", side: "PRO", opponent: "Carol Morgan School", partner: "Silvana Espaillat",
      result: "WIN", source: "EXTERNAL", eventName: "Harvard JV", roundLabel: "Prelim 3", daysAgo: 33,
      ratingBefore: 1571, ratingAfter: 1640, rdAfter: 115, volAfter: 0.058, tierAfter: "Gold",
      judge: "Tab room", comments: "Excelente evidencia y delivery. Rompieron en Novice/JV con récord positivo.",
      recordingUrl: `https://www.youtube.com/watch?v=${YT_CWI}`,
      scores: [9, 8, 9, 9, 8],
    },
    {
      userId: "u-ar", format: "PF", side: "CON", opponent: "American School Foundation", partner: "Silvana Espaillat",
      result: "WIN", source: "EXTERNAL", eventName: "Florida Blue Key", roundLabel: "Prelim 5", daysAgo: 26,
      ratingBefore: 1640, ratingAfter: 1696, rdAfter: 100, volAfter: 0.056, tierAfter: "Gold",
      judge: "Tab room", comments: "Mejor récord Novice de un equipo dominicano. Crossfire impecable.",
      scores: [9, 9, 9, 9, 9],
    },
    {
      userId: "u-ar", format: "PF", side: "PRO", opponent: "Newman School", partner: "Silvana Espaillat",
      result: "LOSS", source: "EXTERNAL", eventName: "Florida Blue Key", roundLabel: "Octofinal", daysAgo: 25,
      ratingBefore: 1696, ratingAfter: 1672, rdAfter: 92, volAfter: 0.056, tierAfter: "Gold",
      judge: "Tab room", comments: "Ronda cerrada. El turn del impacto rival no quedó respondido en el final focus.",
      scores: [8, 8, 9, 8, 8],
    },
    {
      userId: "u-ar", format: "PF", side: "CON", opponent: "Babeque", partner: "Silvana Espaillat",
      result: "WIN", source: "OTR", eventName: "New Horizons", roundLabel: "Final", daysAgo: 12,
      ratingBefore: 1672, ratingAfter: 1720, rdAfter: 80, volAfter: 0.055, tierAfter: "Gold",
      judge: "Panel (3 jueces)", comments: "Campeonas. Estructura y presencia de élite — la mejor ronda del torneo.",
      scores: [9, 9, 10, 9, 9],
    },
  ];
  for (const d of analiaDebates) await seedDebate(d);

  // --- Otros estudiantes — para poblar leaderboard y dar variedad de tiers ---
  const rosterDebates: DebateSeed[] = [
    {
      userId: "u-is", format: "PF", side: "PRO", opponent: "Saint George School", partner: "Aaron Méndez",
      result: "WIN", source: "EXTERNAL", eventName: "Florida Blue Key", roundLabel: "Cuartos", daysAgo: 26,
      ratingBefore: 1800, ratingAfter: 1850, rdAfter: 70, volAfter: 0.048, tierAfter: "Platinum",
      judge: "Tab room", comments: "Romper en Blue Key con récord top. Evidencia de primer nivel.",
      scores: [10, 9, 9, 10, 9],
    },
    {
      userId: "u-si", format: "PF", side: "CON", opponent: "Carol Morgan School", partner: "Analía Reyes",
      result: "WIN", source: "OTR", eventName: "New Horizons", roundLabel: "Final", daysAgo: 12,
      ratingBefore: 1770, ratingAfter: 1815, rdAfter: 95, volAfter: 0.05, tierAfter: "Platinum",
      judge: "Panel (3 jueces)", comments: "Co-campeona. Crossfire que sembró la concesión clave.",
      scores: [9, 9, 9, 9, 10],
    },
    {
      userId: "u-aa", format: "LD", side: "PRO", opponent: "Loyola", result: "WIN", source: "OTR",
      eventName: "Scrim interno OTR", roundLabel: "Ronda 2", daysAgo: 20,
      ratingBefore: 1650, ratingAfter: 1690, rdAfter: 110, volAfter: 0.06, tierAfter: "Gold",
      judge: "Coach Saúl", comments: "Buen framework value/criterion. Gana el reloj antes del choque de impactos.",
      scores: [8, 8, 8, 9, 8],
    },
    {
      userId: "u-sg", format: "PF", side: "CON", opponent: "Liceo Científico", partner: "Camila Núñez",
      result: "LOSS", source: "OTR", eventName: "Torneo interno OTR", roundLabel: "Cuartos", daysAgo: 18,
      ratingBefore: 1570, ratingAfter: 1545, rdAfter: 120, volAfter: 0.06, tierAfter: "Silver",
      judge: "Juez invitado", comments: "Cerca. Falta consolidar el segundo contention con una card más fuerte.",
      scores: [7, 6, 7, 7, 6],
    },
    {
      userId: "u-jo", format: "PF", side: "PRO", opponent: "Babeque", partner: "Diego Fermín",
      result: "WIN", source: "OTR", eventName: "Scrim interno OTR", roundLabel: "Ronda 1", daysAgo: 15,
      ratingBefore: 1440, ratingAfter: 1480, rdAfter: 130, volAfter: 0.06, tierAfter: "Silver",
      judge: "Coach Saúl", comments: "Gran progreso: llenó los 4 minutos con estructura clara. Sigue así.",
      scores: [7, 7, 7, 6, 7],
    },
    {
      userId: "u-cn", format: "PF", side: "CON", opponent: "Saint George School", partner: "Sigmund Castillo",
      result: "DRAW", source: "OTR", eventName: "Scrim interno OTR", roundLabel: "Ronda 1", daysAgo: 14,
      ratingBefore: 1420, ratingAfter: 1420, rdAfter: 160, volAfter: 0.062, tierAfter: "Bronze",
      judge: "Coach Saúl", comments: "Ronda pareja. Trabaja el cierre del final focus para inclinar al juez.",
      scores: [6, 6, 7, 6, 6],
    },
  ];
  for (const d of rosterDebates) await seedDebate(d);

  // ----------------------------------------------------------------
  //  8.6) TORNEOS (Debate Hub) — 3 UPCOMING con fechas futuras
  //       Mezcla PF/LD, online/presencial, OTR y EXTERNAL.
  // ----------------------------------------------------------------
  const inDays = (d: number) => new Date(Date.now() + d * 24 * 60 * 60 * 1000);
  await db.tournament.create({
    data: {
      name: "Torneo interno OTR · Primavera",
      format: "PF", ageDivision: "JV", region: "RD", modality: "online",
      entryCents: 0, source: "OTR", status: "UPCOMING", startsAt: inDays(7),
      rounds: { create: [{ label: "Prelim 1", position: 0 }, { label: "Prelim 2", position: 1 }, { label: "Semifinal", position: 2 }, { label: "Final", position: 3 }] },
      // Analía ya inscrita (para el flag `registered` del Hub).
      registrations: { create: [{ userId: "u-ar", partner: "Silvana Espaillat", seed: 2 }] },
    },
  });
  await db.tournament.create({
    data: {
      name: "Copa Lincoln-Douglas RD",
      format: "LD", ageDivision: "Varsity", region: "RD", modality: "presencial",
      entryCents: 50000, source: "OTR", status: "UPCOMING", startsAt: inDays(21),
      rounds: { create: [{ label: "Prelim 1", position: 0 }, { label: "Prelim 2", position: 1 }, { label: "Final", position: 2 }] },
    },
  });
  await db.tournament.create({
    data: {
      name: "Harvard Invitational (online qualifier)",
      format: "PF", ageDivision: "Varsity", region: "Internacional", modality: "online",
      entryCents: 120000, source: "EXTERNAL", status: "UPCOMING", startsAt: inDays(40),
      rounds: { create: [{ label: "Prelim 1", position: 0 }, { label: "Prelim 2", position: 1 }, { label: "Prelim 3", position: 2 }] },
    },
  });

  // ----------------------------------------------------------------
  //  8.7) MARKETPLACE (PRD §7) — perfiles de coach con paquetes y
  //       disponibilidad + bookings demo con escrow (Trust & Safety:
  //       sesión SIEMPRE on-platform, fondos SIEMPRE vía escrow).
  // ----------------------------------------------------------------
  // Perfil de marketplace de Saúl (Head Coach).
  await db.coachProfile.create({
    data: {
      id: "cp-saul",
      userId: "u-saul",
      introVideoUrl: `https://www.youtube.com/watch?v=${YT_SPEAK}`,
      credentials: "Head Coach · 15+ torneos internacionales",
      specialties: "Public Forum, Lincoln-Douglas, Oratoria",
      languages: "es,en",
      hourlyCents: 4500, // $45/h
      responseTime: "Responde en ~2 h",
      cancelPolicy: "Cancelación gratis hasta 24 h antes de la sesión; después se retiene el 50%.",
      ratingAvg: 4.9,
      reviewCount: 12,
      bookingCount: 38,
      active: true,
      // Lun(1)–Sáb(6) · 9:00 (540 min) – 18:00 (1080 min), hora RD.
      availability: {
        create: [1, 2, 3, 4, 5, 6].map((weekday) => ({ weekday, startMin: 540, endMin: 1080 })),
      },
      packages: {
        create: [
          { id: "pkg-saul-1", name: "Single", sessions: 1, priceCents: 4500, discountPct: 0, position: 0 },
          { id: "pkg-saul-5", name: "5-pack", sessions: 5, priceCents: 20000, discountPct: 11, position: 1 },
          { id: "pkg-saul-10", name: "10-pack", sessions: 10, priceCents: 38000, discountPct: 16, position: 2 },
        ],
      },
    },
  });

  // Segundo coach demo (para que el browse del marketplace tenga >1 perfil).
  await db.user.create({
    data: {
      id: "u-carla",
      name: "Carla Jiménez",
      email: "carla.jimenez@otr.do",
      role: "TEACHER",
      initials: "CJ",
      level: "Elite",
      xp: 0,
      streak: 0,
      passwordHash: pw,
      emailVerified: true,
      coachVerified: true,
      headline: "Coach · Lincoln-Douglas & Policy",
      formats: "LD,Policy",
      bio:
        "Coach de Lincoln-Douglas y Policy con enfoque en frameworks filosóficos y manejo de evidencia a gran escala. " +
        "He preparado debatientes para circuitos locales e internacionales y juzgo torneos online del circuito NSDA.",
      teachingStyle:
        "Sesiones 1:1 centradas en framework: primero el value/criterion, después el choque de impactos. " +
        "Cada sesión cierra con un drill cronometrado y un plan de evidencia para la semana.",
      location: "Santo Domingo, RD",
    },
  });
  await db.coachProfile.create({
    data: {
      id: "cp-carla",
      userId: "u-carla",
      introVideoUrl: `https://www.youtube.com/watch?v=${YT_CWI}`,
      credentials: "Coach LD/Policy · jueza certificada del circuito NSDA",
      specialties: "Lincoln-Douglas, Policy",
      languages: "es,en",
      hourlyCents: 4000, // $40/h
      responseTime: "Responde en ~4 h",
      cancelPolicy: "Cancelación gratis hasta 12 h antes de la sesión; después no hay reembolso.",
      ratingAvg: 4.7,
      reviewCount: 8,
      bookingCount: 21,
      active: true,
      // Mar(2)–Vie(5) · 14:00 (840 min) – 20:00 (1200 min), hora RD.
      availability: {
        create: [2, 3, 4, 5].map((weekday) => ({ weekday, startMin: 840, endMin: 1200 })),
      },
      packages: {
        create: [
          { id: "pkg-carla-1", name: "Single", sessions: 1, priceCents: 4000, discountPct: 0, position: 0 },
          { id: "pkg-carla-5", name: "5-pack", sessions: 5, priceCents: 18000, discountPct: 10, position: 1 },
          { id: "pkg-carla-10", name: "10-pack", sessions: 10, priceCents: 34000, discountPct: 15, position: 2 },
        ],
      },
    },
  });

  // Bookings demo — slot a hora local RD (UTC-4) en punto, para labels limpios.
  const atHourRD = (d: Date, hourLocal: number) => {
    const x = new Date(d);
    x.setUTCHours(hourLocal + 4, 0, 0, 0); // RD = UTC-4 fijo (sin DST)
    return x;
  };

  // 1) COMPLETED: Analía × Saúl hace 9 días — escrow LIBERADO al coach
  //    (menos take rate 18%) + notas de sesión con rúbrica.
  await db.booking.create({
    data: {
      id: "bk-ar-saul-1",
      studentId: "u-ar",
      coachId: "u-saul",
      packageId: "pkg-saul-1",
      slotAt: atHourRD(daysAgoDate(9), 16), // 4:00 PM RD
      durationMin: 60,
      status: "COMPLETED",
      escrow: {
        create: {
          amountCents: 4500,
          takeRatePct: 18,
          status: "RELEASED",
          stripeRef: "pi_demo_ar_saul_1",
          releasedAt: daysAgoDate(8),
        },
      },
      session: {
        create: {
          notes:
            "Trabajamos el cierre del final focus: priorizar 2 voters y terminar SIEMPRE en el impacto. " +
            "Tarea: regrabar el último minuto del constructivo con esa estructura.",
          rubric: JSON.stringify({ Argumentation: 8, Rebuttal: 7, Delivery: 9, "Evidence/Research": 8, Crossfire: 8 }),
          completedAt: daysAgoDate(9),
        },
      },
    },
  });

  // 2) CONFIRMED futuro: Analía × Saúl en 3 días — fondos retenidos (HELD)
  //    hasta completar la sesión. Sala on-platform (nunca contacto externo).
  await db.booking.create({
    data: {
      id: "bk-ar-saul-2",
      studentId: "u-ar",
      coachId: "u-saul",
      packageId: "pkg-saul-1",
      slotAt: atHourRD(inDays(3), 16), // 4:00 PM RD
      durationMin: 60,
      status: "CONFIRMED",
      videoUrl: "/aula?room=bk-ar-saul-2",
      escrow: {
        create: { amountCents: 4500, takeRatePct: 18, status: "HELD", stripeRef: "pi_demo_ar_saul_2" },
      },
    },
  });

  // 3) COMPLETED: Jose × Carla hace 5 días — segundo coach con actividad real.
  await db.booking.create({
    data: {
      id: "bk-jo-carla-1",
      studentId: "u-jo",
      coachId: "u-carla",
      packageId: "pkg-carla-1",
      slotAt: atHourRD(daysAgoDate(5), 17), // 5:00 PM RD
      durationMin: 60,
      status: "COMPLETED",
      escrow: {
        create: {
          amountCents: 4000,
          takeRatePct: 18,
          status: "RELEASED",
          stripeRef: "pi_demo_jo_carla_1",
          releasedAt: daysAgoDate(4),
        },
      },
      session: {
        create: {
          notes:
            "Primer framework value/criterion completo (justicia / minimización de daño). " +
            "Siguiente sesión: drills de cross-ex con presión de reloj.",
          rubric: JSON.stringify({ Argumentation: 7, Rebuttal: 6, Delivery: 7, "Evidence/Research": 8, Crossfire: 6 }),
          completedAt: daysAgoDate(5),
        },
      },
    },
  });

  // 4) PENDING: Diego (menor) × Saúl en 2 días — SAFETY GATE en acción:
  //    esperando la aprobación de Rosa (consentBy) en su Parent Portal.
  await db.booking.create({
    data: {
      id: "bk-df-saul-1",
      studentId: "u-df",
      coachId: "u-saul",
      packageId: "pkg-saul-1",
      slotAt: atHourRD(inDays(2), 17), // 5:00 PM RD
      durationMin: 60,
      status: "PENDING",
      consentBy: "u-rosa",
      escrow: {
        create: { amountCents: 4500, takeRatePct: 18, status: "HELD", stripeRef: "pi_demo_df_saul_1" },
      },
    },
  });

  // ----------------------------------------------------------------
  //  8.8) JOURNEY (PRD §8) — ledger universal de Analía: 12 ActivityEvent
  //       con fechas explícitas repartidas en ~8 meses. Es la historia
  //       cronológica del Lifetime Progress Profile ("Se inscribió ·
  //       Primera victoria · Subió a Gold · Obtuvo su certificación…")
  //       y alimenta la atribución del Skill Graph (cada skill enlaza
  //       los eventos que lo movieron).
  // ----------------------------------------------------------------
  await db.activityEvent.createMany({
    data: [
      { userId: "u-ar", type: "enrolled", source: "course", refId: "c-pf", title: "Se inscribió en Public Forum I", detail: "PF-101 · Coach Saúl Méndez", xp: 50, createdAt: daysAgoDate(240) },
      { userId: "u-ar", type: "lesson_done", source: "course", refId: L.welcome, title: "Completó “Bienvenida y diagnóstico”", detail: "Public Forum I · Unidad 1", xp: 20, createdAt: daysAgoDate(224) },
      { userId: "u-ar", type: "lesson_done", source: "course", refId: L.format, title: "Completó “Qué es Public Forum”", detail: "Roles, tiempos y flujo de la ronda · Unidad 1", xp: 25, createdAt: daysAgoDate(206) },
      { userId: "u-ar", type: "quiz_passed", source: "course", refId: "q-pf-u1", title: "Aprobó el quiz de Estructura · 92%", detail: "Quiz: fundamentos de Public Forum · Unidad 1", xp: 40, createdAt: daysAgoDate(188) },
      { userId: "u-ar", type: "lesson_done", source: "course", refId: L.cwiVideo, title: "Completó “Claim · Warrant · Impact en video”", detail: "Public Forum I · Unidad 1", xp: 25, createdAt: daysAgoDate(171) },
      { userId: "u-ar", type: "booking_made", source: "marketplace", title: "Reservó una sesión 1:1 con Coach Saúl", detail: "Marketplace · paquete Single", xp: 10, createdAt: daysAgoDate(150) },
      { userId: "u-ar", type: "session_done", source: "marketplace", title: "Sesión 1:1 con Coach Saúl", detail: "Final focus: priorizar 2 voters y cerrar siempre en el impacto", xp: 30, createdAt: daysAgoDate(146) },
      { userId: "u-ar", type: "debate_logged", source: "debate", title: "Ganó vs Liceo Científico", detail: "Scrim interno OTR · Ronda 1 — primera victoria registrada", xp: 60, createdAt: daysAgoDate(120) },
      { userId: "u-ar", type: "cert_earned", source: "course", refId: "c-pf", title: "Obtuvo OTR Certified — PF Foundations", detail: "Certificación verificable de OTR Academy", xp: 100, createdAt: daysAgoDate(90) },
      { userId: "u-ar", type: "debate_logged", source: "debate", title: "Ganó vs Carol Morgan School", detail: "Harvard JV · Prelim 3 — rompieron con récord positivo", xp: 80, createdAt: daysAgoDate(33) },
      { userId: "u-ar", type: "rank_up", source: "debate", title: "Subió a Gold", detail: "Rating 1640 tras romper en Harvard JV", xp: 75, createdAt: daysAgoDate(32) },
      { userId: "u-ar", type: "debate_logged", source: "debate", title: "Ganó la final vs Babeque", detail: "New Horizons · Final — campeonas del torneo", xp: 120, createdAt: daysAgoDate(12) },
    ],
  });

  // ----------------------------------------------------------------
  //  9) REVIEWS reales — los testimonios del sitio (rating 5)
  //     Un review por (curso, estudiante). Todos sobre PF-101/Saúl.
  // ----------------------------------------------------------------
  await db.review.createMany({
    data: [
      {
        courseId: "c-pf", teacherId: "u-saul", studentId: "u-is", rating: 5,
        body:
          "Nunca habíamos roto en un torneo oficial. Con OTR ganamos 14 rondas seguidas, fuimos campeones de " +
          "New Horizons y co-campeones de St. Michael's, y rompimos en Florida Blue Key con el mejor récord " +
          "Novice de un equipo dominicano. Un giro de 360° en menos de 3 meses.",
      },
      {
        courseId: "c-pf", teacherId: "u-saul", studentId: "u-aa", rating: 5,
        body:
          "El coaching de Saúl nos cambió la mentalidad: estructura clara, evidencia fuerte y presencia. " +
          "Pasamos de no romper a competir de igual a igual con los mejores del circuito.",
      },
      {
        courseId: "c-pf", teacherId: "u-saul", studentId: "u-jo", rating: 5,
        body:
          "Batallábamos hasta para llenar 4 minutos de discurso y nunca habíamos roto. Después de OTR rompimos " +
          "en Florida Blue Key. Aprendí a confiar en mi caso y a hablarle al juez.",
      },
      {
        courseId: "c-pf", teacherId: "u-saul", studentId: "u-sg", rating: 5,
        body:
          "Gané el Novice Speaking Award en Florida Blue Key, algo impensable para mí hace unos meses. " +
          "Los drills de delivery y el feedback semanal hicieron toda la diferencia.",
      },
      {
        courseId: "c-pf", teacherId: "u-saul", studentId: "u-ar", rating: 5,
        body:
          "Nunca habíamos llegado a una final. Tras OTR nos convertimos en el mejor equipo Varsity del circuito " +
          "dominicano: finales consecutivas, ganamos New Horizons y co-campeonas de St. Michael's. Inolvidable.",
      },
      {
        courseId: "c-pf", teacherId: "u-saul", studentId: "u-si", rating: 5,
        body:
          "OTR nos enseñó a competir como élite. La estructura del caso y el manejo del crossfire nos llevaron " +
          "a finales que jamás imaginamos. By Students, For Students — se siente real.",
      },
    ],
  });

  // ----------------------------------------------------------------
  //  10) ARSENAL — recursos reales (briefs, templates, drills)
  // ----------------------------------------------------------------
  await db.resource.createMany({
    data: [
      {
        title: "Plantilla de Caso PF · Claim · Warrant · Impact (1 página)",
        kind: "template", tag: "Caso", format: "PF", gated: false, teacherId: "u-saul", position: 0,
        contentHtml:
          "<p>Estructura de una página para armar cada contention:</p>" +
          "<ol><li><strong>Claim</strong>: una frase.</li>" +
          "<li><strong>Warrant</strong>: 2-3 oraciones de razonamiento.</li>" +
          "<li><strong>Evidence (card)</strong>: tag + cita (autor, fuente, año) + texto.</li>" +
          "<li><strong>Impact</strong>: magnitud × probabilidad.</li></ol>",
      },
      {
        title: "Brief: tema del mes (Public Forum) — argumentos pro/contra",
        kind: "brief", tag: "Tema", format: "PF", gated: true, teacherId: "u-saul", position: 1,
        contentHtml:
          "<p>Resumen de los mejores argumentos de cada lado del tema vigente, con cards sugeridas y " +
          "respuestas (frontlines) listas para el rebuttal. Material exclusivo para estudiantes inscritos.</p>",
      },
      {
        title: "Drill: crossfire en 5 minutos (preguntas cerradas)",
        kind: "drill", tag: "Crossfire", format: "PF", gated: true, teacherId: "u-saul", position: 2,
        contentHtml:
          "<p>Drill cronometrado para practicar preguntas cerradas que comprometan al rival. " +
          "En pareja: 5 rondas de 1 minuto. Objetivo: sembrar una concesión por ronda.</p>",
      },
      {
        title: "Guía rápida: Value y Criterion en Lincoln-Douglas",
        kind: "brief", tag: "Framework", format: "LD", gated: true, teacherId: "u-saul", position: 3,
        contentHtml:
          "<p>Cómo elegir un value (ej: justicia, autonomía) y un criterion que lo mida, y cómo ganar el " +
          "debate de framework antes de entrar al choque de impactos.</p>",
      },
      {
        title: "Drill de delivery: voz, pausa y ritmo (Oratoria)",
        kind: "drill", tag: "Delivery", format: "Oratoria", gated: false, teacherId: "u-saul", position: 4,
        contentHtml:
          "<p>Rutina de 10 minutos: respiración diafragmática, articulación con corcho, y lectura con pausas " +
          "marcadas. Repite a diario antes de cada simulacro.</p>",
      },
      {
        title: "Grabación: simulacro de ronda completa con jueces (recording)",
        kind: "recording", tag: "Simulacro", format: "PF", gated: true, teacherId: "u-saul", position: 5,
        url: YT_SPEAK,
      },
    ],
  });

  // ----------------------------------------------------------------
  //  11) COMPETENCIAS (progreso general — vista de curso)
  // ----------------------------------------------------------------
  await db.competency.createMany({
    data: [
      { name: "Argumentación", score: 88, position: 0 },
      { name: "Refutación", score: 76, position: 1 },
      { name: "Evidencia", score: 82, position: 2 },
      { name: "Presencia escénica", score: 90, position: 3 },
      { name: "Estructura", score: 89, position: 4 },
      { name: "Manejo del tiempo", score: 72, position: 5 },
    ],
  });

  // ----------------------------------------------------------------
  //  12) INSIGNIAS (las que evalúa gotBadge en queries.ts)
  // ----------------------------------------------------------------
  await db.badge.createMany({
    data: [
      { name: "Primer discurso", description: "Completaste tu primera grabación", got: false, icon: "mic", tone: "sky", position: 0 },
      { name: "Racha de 7 días", description: "7 días seguidos entrenando", got: false, icon: "flame", tone: "sky", position: 1 },
      { name: "Refutador", description: "Dominas la refutación de impacto", got: false, icon: "target", tone: "navy", position: 2 },
      { name: "Semifinalista", description: "Llegaste a Varsity o Elite", got: false, icon: "medal", tone: "navy", position: 3 },
      { name: "Voz de oro", description: "95+ en una grabación calificada", got: false, icon: "trophy", tone: "lock", position: 4 },
      { name: "Campeón", description: "Alcanza el nivel Elite del circuito", got: false, icon: "award", tone: "lock", position: 5 },
    ],
  });

  // ----------------------------------------------------------------
  //  13) NOTIFICACIONES (algunas sin leer) — para Analía y globales
  // ----------------------------------------------------------------
  await db.notification.createMany({
    data: [
      { userId: "u-ar", icon: "chart", tone: "ok", title: "Tu entrega fue calificada", detail: "Coach Saúl · 92% — “Excelente claim”", whenLabel: "hace 1h", unread: true, position: 0 },
      { userId: "u-ar", icon: "clock", tone: "warn", title: "Entrega vence mañana", detail: "Construye tu primer contention · PF-101", whenLabel: "hace 3h", unread: true, position: 1 },
      { userId: null, icon: "msg", tone: "sky", title: "Camila te respondió en el foro", detail: "Hilo: refutación cruzada", whenLabel: "hace 5h", unread: true, position: 2 },
      { userId: null, icon: "medal", tone: "navy", title: "Nueva insignia disponible", detail: "Refutador · domina el rebuttal", whenLabel: "ayer", unread: false, position: 3 },
      { userId: null, icon: "calendar", tone: "sky", title: "Simulacro programado", detail: "Hoy 4:00 PM con jueces", whenLabel: "ayer", unread: false, position: 4 },
    ],
  });

  // ----------------------------------------------------------------
  //  14) AGENDA + ACTIVIDAD
  // ----------------------------------------------------------------
  // [auditoría] startsAt reales (relativos al seed) → la etiqueta se deriva viva (no "Hoy" congelado).
  // El "Torneo interno OTR" se quita de aquí: los torneos viven en la tabla Tournament (DB.tournaments),
  // no se duplican como evento de texto.
  const evNow = new Date();
  const evStart1 = new Date(evNow); evStart1.setDate(evStart1.getDate() + 1); evStart1.setHours(16, 0, 0, 0);
  const evStart2 = new Date(evNow); evStart2.setDate(evStart2.getDate() + 3); evStart2.setHours(23, 59, 0, 0);
  await db.eventItem.createMany({
    data: [
      { title: "Simulacro con jueces", course: "Public Forum I", startsAt: evStart1, whenLabel: "Próximamente", tone: "sky", position: 0 },
      { title: "Entrega: primer contention", course: "Public Forum I", startsAt: evStart2, whenLabel: "Próximamente", tone: "warn", position: 1 },
    ],
  });
  await db.activityItem.createMany({
    data: [
      { who: "Coach Saúl", action: "calificó tu entrega", target: "92%", whenLabel: "hace 1h", position: 0 },
      { who: "Tú", action: "completaste", target: "Quiz: fundamentos de Public Forum", whenLabel: "hace 3h", position: 1 },
      { who: "Camila N.", action: "comentó en el foro", target: "Refutación cruzada", whenLabel: "hace 5h", position: 2 },
    ],
  });

  // ----------------------------------------------------------------
  //  15) GRADEBOOK (matriz del profesor) — coherente con el roster
  // ----------------------------------------------------------------
  const cols = ["Diagnóstico", "Contention #1", "Quiz U1", "Grabación 2min", "Card analysis", "Examen U3"];
  const gbRows = [
    { n: "Isabella Guzmán", i: "IG", g: ["96", "97", "98", "95", "96", "—"] },
    { n: "Aaron Méndez", i: "AM", g: ["95", "94", "96", "94", "95", "—"] },
    { n: "Silvana Espaillat", i: "SE", g: ["93", "92", "94", "91", "93", "—"] },
    { n: "Analía Reyes", i: "AR", g: ["92", "—", "90", "—", "88", "—"] },
    { n: "Sigmund Castillo", i: "SC", g: ["83", "84", "85", "82", "—", "—"] },
    { n: "Camila Núñez", i: "CN", g: ["82", "80", "86", "81", "—", "—"] },
    { n: "Jose Fernández", i: "JF", g: ["80", "—", "82", "—", "—", "—"] },
    { n: "Diego Fermín", i: "DF", g: ["68", "—", "64", "—", "—", "—"] },
  ];
  await db.gradeCell.createMany({
    data: gbRows.flatMap((r, ri) =>
      r.g.map((v, ci) => ({ studentName: r.n, studentInit: r.i, studentPos: ri, colName: cols[ci], colPos: ci, value: v })),
    ),
  });

  // ----------------------------------------------------------------
  //  16) FORO — hilos y posts coherentes con la marca
  // ----------------------------------------------------------------
  await db.forumThread.createMany({
    data: [
      { id: "t-1", title: "¿Cómo refutar un argumento de impacto sin caer en falacias?", author: "Camila Núñez", initials: "CN", tag: "Refutación", replies: 8, views: 42, pinned: true, lastLabel: "hace 2h", excerpt: "En el simulacro me costó atacar el impacto sin que el juez lo viera como ataque personal. ¿Tips?", position: 0 },
      { id: "t-2", title: "Plantilla de Contention que uso para PF (compartida)", author: "Isabella Guzmán", initials: "IG", tag: "Recursos", replies: 14, views: 96, pinned: true, lastLabel: "hace 6h", excerpt: "Les dejo mi estructura Claim · Warrant · Impact en una página. Me sirvió para romper en Blue Key.", position: 1 },
      { id: "t-3", title: "Dudas sobre el crossfire — ¿quién pregunta primero?", author: "Diego Fermín", initials: "DF", tag: "Reglas", replies: 3, views: 21, pinned: false, lastLabel: "hace 1d", excerpt: "Nunca me queda claro el orden en Public Forum. ¿Alguien me lo explica simple?", position: 2 },
      { id: "t-4", title: "Mi evidencia para el tema de este mes", author: "Analía Reyes", initials: "AR", tag: "Evidencia", replies: 5, views: 33, pinned: false, lastLabel: "hace 2d", excerpt: "Encontré un estudio de 2025 muy fuerte. ¿Lo revisamos juntos antes del torneo?", position: 3 },
    ],
  });
  await db.forumPost.createMany({
    data: [
      { threadId: "t-1", author: "Camila Núñez", initials: "CN", role: "Estudiante", whenLabel: "hace 2h", op: true, body: "En el simulacro me costó atacar el impacto del rival sin que el juez lo viera como ataque personal. ¿Cómo lo separan ustedes?", position: 0 },
      { threadId: "t-1", author: "Saúl Méndez", initials: "SM", role: "Coach", whenLabel: "hace 1h", op: false, body: "Buena pregunta. Ataca la <b>lógica</b>, no a la persona: cuestiona la probabilidad y la magnitud del impacto. “Aunque eso fuera cierto, su probabilidad es baja porque…”. Eso es refutar, no descalificar.", position: 1 },
      { threadId: "t-1", author: "Isabella Guzmán", initials: "IG", role: "Estudiante", whenLabel: "hace 40 min", op: false, body: "A mí me funciona el “turn”: tomo su impacto y muestro que en realidad juega a mi favor. El juez lo ama.", position: 2 },
    ],
  });

  // ----------------------------------------------------------------
  //  17) MENSAJERÍA — conversaciones y chat
  // ----------------------------------------------------------------
  await db.conversation.createMany({
    data: [
      { id: "cv-1", initials: "SM", name: "Coach Saúl Méndez", lastLabel: "Te dejé feedback en la entrega 👏", whenLabel: "hace 1h", unread: 2, online: true, navy: true, position: 0 },
      { id: "cv-2", initials: "CN", name: "Camila Núñez", lastLabel: "¿Practicamos crossfire mañana?", whenLabel: "hace 3h", unread: 0, online: true, navy: false, position: 1 },
      { id: "cv-3", initials: "OTR", name: "Equipo OTR (anuncios)", lastLabel: "Recordatorio: torneo interno el sábado", whenLabel: "ayer", unread: 0, online: false, navy: true, position: 2 },
      { id: "cv-4", initials: "SE", name: "Silvana Espaillat", lastLabel: "Te paso mi evidencia del tema", whenLabel: "ayer", unread: 0, online: false, navy: false, position: 3 },
      // Conversación menor↔coach (PRD §7.4): activa el filtro de contact-info.
      { id: "cv-5", initials: "DF", name: "Diego Fermín", lastLabel: "Gracias coach", whenLabel: "hace 2h", unread: 0, online: false, navy: false, position: 4 },
    ],
  });
  await db.chatMessage.createMany({
    data: [
      { conversationId: "cv-1", me: false, body: "¡Hola Analía! Vi tu diagnóstico de 1 minuto.", timeLabel: "10:02", position: 0 },
      { conversationId: "cv-1", me: false, body: "Tu claim quedó clarísimo en los primeros 10 segundos 👏", timeLabel: "10:02", position: 1 },
      { conversationId: "cv-1", me: true, body: "¡Gracias coach! Sentí que el cierre me quedó flojo.", timeLabel: "10:05", position: 2 },
      { conversationId: "cv-1", me: false, body: "Un poco. Cierra siempre con el impacto, no con un resumen. Vuelve a grabar el último tramo y me lo mandas.", timeLabel: "10:06", position: 3 },
      { conversationId: "cv-1", me: true, body: "Hecho. Lo subo hoy mismo 💪", timeLabel: "10:08", position: 4 },
    ],
  });

  // PRD §7.4/§17: participantes reales de cada conversación (scoping en capa de datos).
  // Analía (u-ar) está en todas; cv-1 también incluye a Saúl (coach).
  await db.conversationParticipant.createMany({
    data: [
      { conversationId: "cv-1", userId: "u-ar" }, { conversationId: "cv-1", userId: "u-saul" },
      { conversationId: "cv-2", userId: "u-ar" }, { conversationId: "cv-2", userId: "u-cn" },
      { conversationId: "cv-3", userId: "u-ar" }, { conversationId: "cv-3", userId: "u-admin" },
      { conversationId: "cv-4", userId: "u-ar" }, { conversationId: "cv-4", userId: "u-si" },
      { conversationId: "cv-5", userId: "u-df" }, { conversationId: "cv-5", userId: "u-saul" },
    ],
  });

  // PRD §7.4: un reporte demo OPEN para poblar la consola de moderación del ADMIN.
  await db.report.create({
    data: {
      id: "rep-1",
      reporterId: "u-df",
      targetType: "message",
      targetId: "cv-2",
      reason: "Un mensaje pedía contacto fuera de la plataforma.",
      status: "OPEN",
    },
  });

  // ----------------------------------------------------------------
  //  Resumen
  // ----------------------------------------------------------------
  const [users, courses, lessons, quizzes, reviews, resources, enrollments, debates, tournaments, coachProfiles, bookings, certificates, journeyEvents] = await Promise.all([
    db.user.count(),
    db.course.count(),
    db.lesson.count(),
    db.quiz.count(),
    db.review.count(),
    db.resource.count(),
    db.enrollment.count(),
    db.debateRecord.count(),
    db.tournament.count(),
    db.coachProfile.count(),
    db.booking.count(),
    db.certificate.count(),
    db.activityEvent.count(),
  ]);
  console.log("✓ Seed OTR completo");
  console.log(`  · Usuarios:      ${users} (2 coaches + ${users - 2} estudiantes)`);
  console.log(`  · Programas:     ${courses}`);
  console.log(`  · Lecciones:     ${lessons} (PF-101)`);
  console.log(`  · Quizzes:       ${quizzes}`);
  console.log(`  · Reviews:       ${reviews}`);
  console.log(`  · Recursos:      ${resources}`);
  console.log(`  · Matrículas:    ${enrollments}`);
  console.log(`  · Debate Hub:    ${debates} rondas · ${tournaments} torneos`);
  console.log(`  · Marketplace:   ${coachProfiles} coaches · ${bookings} bookings (escrow demo)`);
  console.log(`  · Lifetime §8:   ${certificates} certificados · ${journeyEvents} eventos de journey (Analía)`);
  console.log("  · Membresía §13: Analía PRO (simulada) · perfil público /p/analia-reyes");
  console.log("  · Login demo:    saul@otr.do / analia.reyes@otr.do — password: ver arriba (SEED_PASSWORD o la generada)");
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
