// [M4] Render smoke-test harness — red de seguridad DINÁMICA sobre la capa de UI.
//
// Las 21 pantallas del Aula (app/lib/scr-*.ts) son módulos "// @ts-nocheck" que
// exportan `S = { <ruta>: { render(state) -> string, mount(root, state) } }`.
// render() SOLO arma un string de HTML (no toca el DOM), así que se puede probar
// en Node con un stub de `window` — sin jsdom/happy-dom.
//
// Este test hidrata DB (app/lib/data.ts, el mismo objeto mutable que en runtime
// llena queries.ts → getAppData) con un fixture generoso que sigue la forma REAL
// del contrato (ver queries.ts `base`), monta los globals window.__* que cada
// pantalla lee, y para cada ruta exportada llama render() bajo varios roles,
// afirmando que devuelve un string no vacío y que NO explota.
//
// Motivación (bug real que este arnés habría atrapado): scr-marketplace.ts
// `bookedPanel` referenciaba una variable `c` que no era parámetro de la función
// → ReferenceError al pintar el panel "ya reservado" del perfil de un coach.
// El caso "reserva ya confirmada" al final de este archivo reproduce exactamente
// ese camino.
import { describe, it, expect, beforeEach } from "vitest";

/* ================================================================
   1) STUB DE `window` — ANTES de importar ninguna pantalla, porque
      varias hacen `const w = window` (o `window as any`) dentro de
      sus funciones; algunas también acceden vía `window.__x` directo
      a nivel de módulo-helper. Un stub mutable evita cualquier
      ReferenceError con "window is not defined" en Node.
   ================================================================ */
(globalThis as any).window = (globalThis as any).window || {};
const win: any = (globalThis as any).window;

// Los "globales de Aula.tsx" que mount() normalmente usaría; render() no
// debería depender de ellos, pero algunos helpers los referencian de forma
// defensiva (p.ej. w.toast?.(...)) — los dejamos como no-ops por si acaso.
win.api = async () => ({});
win.go = () => {};
win.toast = () => {};
win.print = () => {};
win.otrFormModal = () => {};

// Ahora sí: importar DB + las 21 pantallas (imports estáticos, todas conocidas).
import { DB } from "../app/lib/data";

import { S as SAdminUsers } from "../app/lib/scr-admin-users";
import { S as SAdminMetrics } from "../app/lib/scr-admin-metrics";
import { S as SAdminWhatsapp } from "../app/lib/scr-admin-whatsapp";
import { S as SListings } from "../app/lib/scr-listings";
import { S as SMyListings } from "../app/lib/scr-my-listings";
import { S as SAdmin } from "../app/lib/scr-admin";
import { S as SArsenal } from "../app/lib/scr-arsenal";
import { S as SCertificate } from "../app/lib/scr-certificate";
import { S as SCoachwork } from "../app/lib/scr-coachwork";
import { S as SCommunity } from "../app/lib/scr-community";
import { S as SCore } from "../app/lib/scr-core";
import { S as SDebate } from "../app/lib/scr-debate";
import { S as SEvents } from "../app/lib/scr-events";
import { S as SExtra } from "../app/lib/scr-extra";
import { S as SHub } from "../app/lib/scr-hub";
import { S as SLearn } from "../app/lib/scr-learn";
import { S as SLifetime } from "../app/lib/scr-lifetime";
import { S as SMarketplace } from "../app/lib/scr-marketplace";
import { S as SMyBookings } from "../app/lib/scr-mybookings";
import { S as SParent } from "../app/lib/scr-parent";
import { S as SPlacement } from "../app/lib/scr-placement";
import { S as SProfile } from "../app/lib/scr-profile";
import { S as SRoom } from "../app/lib/scr-room";
import { S as SSettings } from "../app/lib/scr-settings";
import { S as STeacher } from "../app/lib/scr-teacher";

const SCREENS: Record<string, Record<string, any>> = {
  "scr-admin-users": SAdminUsers,
  "scr-admin-metrics": SAdminMetrics,
  "scr-admin-whatsapp": SAdminWhatsapp,
  "scr-listings": SListings,
  "scr-my-listings": SMyListings,
  "scr-admin": SAdmin,
  "scr-arsenal": SArsenal,
  "scr-certificate": SCertificate,
  "scr-coachwork": SCoachwork,
  "scr-community": SCommunity,
  "scr-core": SCore,
  "scr-debate": SDebate,
  "scr-events": SEvents,
  "scr-extra": SExtra,
  "scr-hub": SHub,
  "scr-learn": SLearn,
  "scr-lifetime": SLifetime,
  "scr-marketplace": SMarketplace,
  "scr-mybookings": SMyBookings,
  "scr-parent": SParent,
  "scr-placement": SPlacement,
  "scr-profile": SProfile,
  "scr-room": SRoom,
  "scr-settings": SSettings,
  "scr-teacher": STeacher,
};

/* ================================================================
   2) FIXTURE — sigue la forma REAL de `base` en app/lib/queries.ts
      (getAppData), generosa: arrays con al menos un elemento donde
      las pantallas indexan por id/código, para no caer siempre en
      el "empty state" y ejercitar más ramas de cada render().
   ================================================================ */
const NOW = Date.now();
const isoIn = (ms: number) => new Date(NOW + ms).toISOString();
const DAY = 86400000;

const QUIZ_FIXTURE = {
  id: "quiz-1",
  lessonId: "lesson-quiz-1",
  title: "Examen — Estructura del caso",
  passScore: 60,
  questions: [
    {
      id: "q1",
      prompt: "¿Qué es un 'claim'?",
      options: [
        { id: "o1", text: "Una afirmación que se defiende con evidencia" },
        { id: "o2", text: "Un tipo de torneo" },
      ],
    },
  ],
};

const LESSON_VIDEO = {
  id: "lesson-1",
  t: "Introducción a la retórica",
  titleEs: "Introducción a la retórica",
  type: "video",
  done: true,
  doneByMe: true,
  locked: false,
  grade: 92,
  dur: "12 min",
  due: "20 jun",
  dueAt: isoIn(5 * DAY),
  maxPoints: 100,
  submitKinds: null,
  videoKind: "youtube",
  videoSrc: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  contentHtml: "<p>Contenido de la lección.</p>",
  quiz: undefined,
};
const LESSON_QUIZ = {
  id: "lesson-quiz-1",
  t: "Examen — Estructura del caso",
  titleEs: "Examen — Estructura del caso",
  type: "quiz",
  done: false,
  doneByMe: false,
  locked: false,
  grade: null,
  dur: "20 min",
  due: "22 jun",
  dueAt: isoIn(7 * DAY),
  maxPoints: 100,
  submitKinds: null,
  videoKind: null,
  videoSrc: null,
  contentHtml: "",
  quiz: QUIZ_FIXTURE,
};
const LESSON_ASSIGN = {
  id: "lesson-assign-1",
  t: "Ensayo de refutación",
  titleEs: "Ensayo de refutación",
  type: "mic",
  done: false,
  doneByMe: false,
  locked: false,
  grade: null,
  dur: "30 min",
  due: "25 jun",
  dueAt: isoIn(9 * DAY),
  maxPoints: 100,
  submitKinds: "file,text,audio",
  videoKind: null,
  videoSrc: null,
  contentHtml: "<p>Entrega tu ensayo.</p>",
  quiz: undefined,
};

const MODULES_PF101 = [
  { t: "Módulo 1 — Fundamentos", done: false, locked: false, items: [LESSON_VIDEO, LESSON_QUIZ] },
  { t: "Módulo 2 — Práctica", done: false, locked: false, items: [LESSON_ASSIGN] },
];

const COURSE_PF101 = {
  id: "PF-101", dbId: "course-pf101", code: "PF-101", name: "Public Forum 101", coach: "Saul Martinez",
  color: "#2CAA20", progress: 45, next: "Ensayo de refutación", students: 24, lessons: 3, due: 1,
  format: "Online", modality: "Grupal", capacity: 30, summary: "Fundamentos de Public Forum.", layout: "modules",
};
const COURSE_CONTENT_PF101 = {
  id: "PF-101", dbId: "course-pf101", code: "PF-101", name: "Public Forum 101", coach: "Saul Martinez",
  color: "#2CAA20", progress: 45, summary: "Fundamentos de Public Forum.", format: "Online", modality: "Grupal",
  layout: "modules", modules: MODULES_PF101,
};

const COACH_FIXTURE = {
  id: "coach-1", profileId: "cp-1", name: "Saul Martinez", initials: "SM",
  headline: "Coach de Public Forum · 8 años", avatarUrl: "", coachVerified: true, location: "Santo Domingo",
  introVideoUrl: "", credentials: "Juez certificado NSDA", specialties: "Public Forum, Extemp",
  specialtiesList: ["Public Forum", "Extemp"], languages: "ES,EN",
  hourlyCents: 4000, hourlyLabel: "$40", responseTime: "2 horas", cancelPolicy: "Cancelación gratuita hasta 24h antes",
  ratingAvg: 4.8, reviewCount: 12, bookingCount: 34,
  packages: [{ id: "pkg-1", name: "Paquete de 5", sessions: 5, priceCents: 18000, priceLabel: "$180", discountPct: 10 }],
  availability: [{ weekday: 1, startMin: 540, endMin: 1080 }],
  fromPriceCents: 3600, fromPriceLabel: "Desde $36",
};

const MY_BOOKINGS_FIXTURE = [
  {
    id: "mb-1", status: "CONFIRMED", coachId: "coach-1", coachName: "Saul Martinez", coachInitials: "SM",
    packageName: "Paquete de 5", slotLabel: "lun 14 jul · 4:00 PM", slotAtIso: isoIn(3 * DAY), durationMin: 60,
    upcoming: true, priceCents: 3600, priceLabel: "$36", escrowStatus: "HELD",
    videoUrl: "/aula?room=mb-1", recordingUrl: "", canReview: false,
  },
  {
    id: "mb-2", status: "COMPLETED", coachId: "coach-1", coachName: "Saul Martinez", coachInitials: "SM",
    packageName: "", slotLabel: "vie 4 jul · 3:00 PM", slotAtIso: isoIn(-6 * DAY), durationMin: 60,
    upcoming: false, priceCents: 3600, priceLabel: "$36", escrowStatus: "RELEASED",
    videoUrl: "", recordingUrl: "https://cdn.example.com/rec-mb2.mp4", canReview: true,
  },
];

const COACHWORK_FIXTURE = {
  inbox: {
    upcoming: [{
      id: "bk-1", status: "CONFIRMED", studentName: "Juan Pérez", studentInitials: "JP",
      slotLabel: "lun 14 jul · 4:00 PM", durationMin: 60, packageName: "Paquete de 5",
      amountCents: 3600, amountLabel: "$36", slotAtIso: isoIn(3 * DAY),
      videoUrl: "/aula?room=bk-1", recordingUrl: "", awaitingConsent: false,
    }],
    past: [{
      id: "bk-0", status: "COMPLETED", studentName: "María López", studentInitials: "ML",
      slotLabel: "vie 4 jul · 3:00 PM", durationMin: 60, packageName: "",
      amountCents: 3600, amountLabel: "$36", slotAtIso: isoIn(-6 * DAY),
      videoUrl: "", recordingUrl: "", awaitingConsent: false, escrowStatus: "RELEASED",
    }],
  },
  earnings: {
    heldCents: 3600, releasedCents: 14400, payoutCents: 11808, monthPayoutCents: 2952, takeRatePct: 18,
    heldLabel: "$36", releasedLabel: "$144", payoutLabel: "$118.08", monthPayoutLabel: "$29.52",
  },
  metrics: { ratingAvg: 4.8, reviewCount: 12, bookingCount: 34, completed: 20, repeatStudents: 5 },
  profile: {
    active: true, hourlyCents: 4000, hourlyLabel: "$40", specialties: "Public Forum, Extemp",
    languages: ["ES", "EN"],
    availability: [{ id: "av-1", weekday: 1, startMin: 540, endMin: 1080, label: "Lun 9:00 AM – 6:00 PM" }],
    packages: [{ id: "pkg-1", name: "Paquete de 5", sessions: 5, priceCents: 18000, priceLabel: "$180", discountPct: 10 }],
  },
};

const PARENT_FIXTURE = {
  children: [{
    id: "child-1", childId: "child-1", name: "Sofía Reyes", initials: "SR",
    level: "OTR Apprentice", ageBand: "minor",
    publicProfile: { enabled: false, slug: null },
    skillDeltas: [{ skill: "Confianza", name: "Confianza", score: 72 }],
    attendance: { attended: 6, scheduled: 8 },
    achievements: ["Primer discurso"],
    upcoming: [{ id: "ub-1", coachName: "Saul Martinez", slotLabel: "mar 15 jul · 5:00 PM", durationMin: 60 }],
    spendCents: 7200, spendLabel: "$72",
    pendingConsents: [{ id: "pc-1", bookingId: "pc-1", coachName: "Saul Martinez", slotLabel: "jue 17 jul · 4:00 PM", priceLabel: "$36" }],
    approveUnderCents: null, consentLevel: "standard",
  }],
  pendingLinks: [{ id: "pl-1", studentId: "student-x", name: "Pedro Ruiz", email: "pedro@example.com", initials: "PR", ageBand: "adult" }],
};

const LIFETIME_FIXTURE = {
  identity: {
    name: "Analía Reyes", initials: "AR", level: "OTR Competitor", ageBand: null,
    memberSinceLabel: "Miembro desde enero 2026", languages: ["ES", "EN"], location: "Santo Domingo",
  },
  skillGraph: ["Confianza", "Estructura", "Evidencia", "Refutación", "Cross-ex", "Delivery"].map((skill) => ({
    skill, name: skill, score: 65, events: [{ title: "Ganaste un debate", whenLabel: "3 jul" }],
  })),
  ledger: { coursesCompleted: 1, lessonsDone: 8, debates: 5, wins: 3, sessionsAttended: 4, tournaments: 1, hoursStudied: 4 },
  performance: { rating: 1620, tier: "Contendiente", rd: 120, provisional: false, history: [{ label: "3 jul", ratingAfter: 1620, tierAfter: "Contendiente" }] },
  credentials: [{ title: "Certificado Public Forum 101", issuedLabel: "jun 2026" }],
  journey: [{ whenLabel: "3 jul", monthLabel: "Julio 2026", title: "Ganaste un debate", detail: "vs Ana G.", type: "debate_win" }],
  publicProfile: { enabled: false, slug: null, url: null, canToggle: true, minorNote: "Tu padre/madre puede habilitar tu perfil público." },
};

const TEACHER_COURSES_FIXTURE = [{
  id: "course-pf101", code: "PF-101", name: "Public Forum 101", color: "#2CAA20", published: true, layout: "modules",
  format: "Online", modality: "Grupal", capacity: 30, summary: "Fundamentos de Public Forum.",
  modules: [{
    id: "m1", title: "Módulo 1 — Fundamentos", hidden: false,
    lessons: [{
      id: "lesson-1", title: "Introducción a la retórica", type: "video", dur: "12 min", due: "20 jun",
      hidden: false, dueAt: isoIn(5 * DAY), submitKinds: null, maxPoints: 100,
      videoKind: "youtube", videoSrc: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      contentHtml: "<p>Contenido.</p>", releaseAfterId: null,
    }],
  }],
}];

/** Fixture "base", común a todos los roles (contrato completo, generoso). */
function baseFixture() {
  return {
    me: {
      name: "Analía Reyes", email: "analia.reyes@otr.do", initials: "AR", level: "OTR Competitor",
      streak: 4, role: "student", lifecycle: "active", daysAway: 0,
      headline: "", bio: "", teachingStyle: "", formats: "", location: "Santo Domingo",
      preferences: JSON.stringify({ pace: "Estándar", schedule: "Tarde", goals: ["Ganar torneos"] }),
      needsPlacement: false, avatarUrl: "", ageBand: null, leaderboardOptIn: true,
      speakerAvg: 78, speakerRounds: 5, notificationPrefs: JSON.stringify({ session_reminders: true }),
    },
    teacher: {
      name: "Saul Martinez", email: "saul@otr.do", initials: "SM", role: "teacher",
      headline: "Coach de Public Forum · 8 años", bio: "Coach certificado.", teachingStyle: "Socrático",
      formats: "Public Forum, Extemp", location: "Santo Domingo",
    },
    levels: [
      { id: "otr-initiate", name: "OTR Initiate", range: "0-999", color: "#0C0C0C" },
      { id: "otr-apprentice", name: "OTR Apprentice", range: "1000-2499", color: "#2CAA20" },
      { id: "otr-competitor", name: "OTR Competitor", range: "2500-4999", color: "#2CAA20" },
      { id: "otr-strategist", name: "OTR Strategist", range: "5000-8999", color: "#F2B814" },
      { id: "otr-laureate", name: "OTR Laureate", range: "9000+", color: "#F2B814" },
    ],
    xp: 1620, xpNext: 2500, xpLevelStart: 1000,
    courses: [COURSE_PF101],
    courseModules: MODULES_PF101,
    coursesContent: [COURSE_CONTENT_PF101],
    mySubmissions: {},
    mySubmissionsByLesson: {},
    competencies: [{ name: "Confianza", score: 72 }],
    badges: [
      { n: "Primer discurso", d: "Entregaste tu primera actividad", got: true, ic: "mic", tone: "sky" },
      { n: "Racha de 7 días", d: "7 días seguidos activo", got: false, ic: "flame", tone: "warn" },
    ],
    events: [{ t: "Taller de oratoria", c: "OTR Academy", when: "12 jul · 9:00 AM", tone: "sky" }],
    activity: [{ type: "lesson_done", title: "Completaste 'Introducción a la retórica'", detail: "", xp: 50, when: "hace 2 días" }],
    notifications: [{ ic: "bell", tone: "sky", t: "Nueva sesión confirmada", d: "Con Saul Martinez", when: "hace 1 hora", unread: true }],
    forum: [], // Foro APAGADO (PRD-estricto): producción siempre manda [].
    forumThread: { id: "", title: "", tag: "", posts: [] },
    messages: [{
      id: "conv-1", ini: "SM", name: "Saul Martinez", last: "Nos vemos el lunes", when: "hace 1 h",
      unread: 1, online: true, navy: false,
      messages: [{ me: false, body: "Hola, ¿cómo vas con la práctica?", when: "10:32 AM" }, { me: true, body: "Muy bien, gracias!", when: "10:35 AM" }],
    }],
    chat: [{ me: false, body: "Hola, ¿cómo vas con la práctica?", when: "10:32 AM" }],
    catalog: [
      { id: "course-pf101", code: "PF-101", name: "Public Forum 101", coach: "Saul Martinez", color: "#2CAA20", price: 0, enrolled: true, format: "Online", modality: "Grupal" },
      { id: "course-ld101", code: "LD-101", name: "Lincoln-Douglas 101", coach: "Ana Gómez", color: "#0C0C0C", price: 0, enrolled: false, format: "Online", modality: "Individual" },
    ],
    arsenal: [{ id: "res-1", kind: "brief", title: "Brief: Política migratoria", tag: "PF", format: "PDF" }],
    skills: ["Confianza", "Estructura", "Evidencia", "Refutación", "Cross-ex", "Delivery"].map((skill) => ({ skill, score: 65 })),
    certificates: [{ id: "cert-1", title: "Certificado Public Forum 101", programName: "Public Forum 101", issuedAt: "jun 2026" }],
    coachProfile: {
      id: "coach-1", name: "Saul Martinez", initials: "SM", headline: "Coach de Public Forum · 8 años",
      bio: "Coach certificado con 8 años de experiencia.", teachingStyle: "Socrático",
      formatsList: ["Public Forum", "Extemp"], location: "Santo Domingo", rating: 4.8, reviewCount: 12,
      programs: [{ id: "course-pf101", code: "PF-101", name: "Public Forum 101", format: "Online", modality: "Grupal", price: 0, color: "#2CAA20", summary: "Fundamentos de Public Forum." }],
      reviews: [{ author: "Juan Pérez", ini: "JP", rating: 5, body: "Excelente coach", when: "hace 2 días" }],
    },
    myReview: null,
    canReviewCoach: true,
    myGrades: {
      rows: [
        { activity: "Ensayo 1", score: 88, letter: "B+", kind: "Entrega", status: "GRADED", feedback: "Buen trabajo" },
        { activity: "Introducción a la retórica", score: 92, letter: "A", kind: "Examen", status: "GRADED", feedback: "" },
      ],
      avg: 90, submitted: 2, total: 2, best: 92,
    },
    quizByLesson: { "lesson-quiz-1": QUIZ_FIXTURE },
    debateRank: { rating: 1620, rd: 120, tier: "Contendiente", provisional: false, recentForm: [{ result: "WIN", opponent: "Ana G.", delta: 18 }] },
    debate: {
      rating: 1620, rd: 120, tier: "Contendiente", provisional: false, speakerAvg: 78, speakerRounds: 5,
      recentForm: [{ result: "WIN", opponent: "Ana G.", delta: 18 }, { result: "LOSS", opponent: "Luis P.", delta: -12 }],
      history: [{
        id: "dr-1", format: "Public Forum", side: "PRO", opponent: "Ana G.", result: "WIN", source: "tournament",
        eventName: "Copa OTR", roundLabel: "Ronda 3", ratingAfter: 1620, adjudicated: true, when: "hace 2 días",
      }],
      analytics: {
        byFormat: [{ format: "Public Forum", wins: 3, losses: 1, draws: 0, total: 4 }],
        bySide: [{ side: "PRO", wins: 2, losses: 1, draws: 0, total: 3 }],
        criteria: [{ criterion: "Argumentation", avg: 8.2 }],
      },
    },
    leaderboard: {
      rows: [
        { rank: 1, name: "Ana G.", initials: "AG", rating: 1700, tier: "Elite", you: false },
        { rank: 2, name: "Analía Reyes", initials: "AR", rating: 1620, tier: "Contendiente", you: true },
      ],
      me: { rank: 2, rating: 1620, tier: "Contendiente" },
    },
    tournaments: [{ id: "t-1", name: "Copa OTR", format: "Public Forum", region: "RD", modality: "Online", startsLabel: "12 jul · 9:00 AM", status: "UPCOMING", entryLabel: "Gratis", registered: false }],
    marketplace: { viewer: { ageBand: null }, coaches: [COACH_FIXTURE] },
    coachwork: COACHWORK_FIXTURE,
    lifetime: LIFETIME_FIXTURE,
    membership: { tier: "pro", sinceLabel: "Desde enero 2026", prices: { proMonthly: "US$9", proAnnual: "US$79" } },
    myBookings: MY_BOOKINGS_FIXTURE,
    parent: PARENT_FIXTURE,
    students: [
      { id: "s-1", n: "Juan Pérez", i: "JP", lvl: "OTR Apprentice", xp: 1200, grade: 88, att: 92, eng: "Alto", trend: "up", risk: false, last: "hace 1 día" },
      // [BUG-ROSTER-REAL] alumno SIN señal real (nunca hubo Submission/Booking/ActivityEvent):
      // grade/att null y eng "—" — cubre las ramas nuevas del builder (antes esto NO podía
      // pasar: Enrollment.grade/att siempre traían un número sembrado).
      { id: "s-2", n: "Sin Señal", i: "SS", lvl: "OTR Initiate", xp: 0, grade: null, att: null, eng: "—", trend: "flat", risk: true, last: "—" },
    ],
    teacherKpis: { avg: 85, attendance: 90, onTime: 80, atRisk: 1 },
    pendingSubs: 3,
    gradebook: { cols: ["Quiz 1", "Ensayo"], rows: [{ n: "Juan Pérez", i: "JP", g: [90, 85] }] },
    manage: { courses: [{ id: "course-pf101", code: "PF-101", name: "Public Forum 101" }], modules: [{ id: "m1", courseId: "course-pf101", title: "Módulo 1 — Fundamentos" }] },
    teacherCourses: TEACHER_COURSES_FIXTURE,
    reviewsReceived: [{ author: "Juan Pérez", ini: "JP", rating: 5, body: "Excelente coach", when: "hace 2 días", programName: "Public Forum 101" }],
  };
}

type Role = "student" | "parent" | "teacher" | "admin";

/** Repuebla DB + window.__* para el rol dado. Se llama antes de cada caso. */
function resetFixture(role: Role) {
  // DB es un objeto mutable importado (app/lib/data.ts: `export const DB: any = {}`);
  // lo vaciamos y reconstruimos en vez de reasignar la referencia (los módulos ya
  // importaron ESTE objeto).
  for (const k of Object.keys(DB)) delete (DB as any)[k];
  Object.assign(DB, baseFixture());
  DB.me.role = role;

  // window.__* — reset a un estado limpio y coherente con el fixture de arriba.
  for (const k of Object.keys(win)) {
    if (k.startsWith("__")) delete win[k];
  }
  win.DB = DB; // scr-placement.ts lee window.DB?.me?.name (alias legacy, no el import).
  win.__course = "PF-101";
  win.__lesson = "lesson-1";
  win.__quizLesson = "lesson-quiz-1";
  win.__convo = 0;
  win.__debateTab = "overview";
  win.__cwTab = "agenda";
  win.__lpSkill = "";
  win.__q = "";
  win.__cert = "cert-1";
  win.__builderCourseId = "course-pf101";
  win.__editMode = true;
  win.__mkCoachId = null;
  win.__mkBooked = {};
  // La sala (S.room) resuelve la reserva del lado que corresponde al rol.
  win.__room = role === "teacher" ? "bk-1" : "mb-1";
}

/* ================================================================
   3) SMOKE TEST — cada ruta exportada, bajo cada rol, debe:
        a) devolver un string
        b) no venir vacía
        c) NO LANZAR
   ================================================================ */
const ROLES: Role[] = ["student", "parent", "teacher", "admin"];

describe("Render smoke test — todas las pantallas del Aula", () => {
  let coveredRoutes = 0;

  for (const role of ROLES) {
    describe(`rol: ${role}`, () => {
      beforeEach(() => {
        resetFixture(role);
      });

      for (const [moduleName, S] of Object.entries(SCREENS)) {
        const routes = Object.keys(S).filter((k) => typeof S[k]?.render === "function");
        for (const route of routes) {
          it(`${moduleName} → S.${route}.render() no explota y devuelve HTML`, () => {
            const html = S[route].render({ role });
            expect(typeof html).toBe("string");
            expect(html.length).toBeGreaterThan(0);
            coveredRoutes++;
          });
        }
      }
    });
  }

  it("cubrió al menos 30 combinaciones ruta×rol (sanity check de que el harness realmente corrió)", () => {
    expect(coveredRoutes).toBeGreaterThanOrEqual(30);
  });
});

/* ================================================================
   4) CASO DIRIGIDO — clase de bug "bookedPanel(b) usaba `c` sin ser
      parámetro". Fuerza el panel de "ya reservado" del perfil de un
      coach en el marketplace (bookingCard → bookedPanel) para CONFIRMED
      y para PENDING, con y sin coachId disponible para el botón de
      mensaje. Esto es exactamente lo que un ReferenceError como el que
      motivó este harness rompería.
   ================================================================ */
describe("Caso dirigido — marketplace: panel de reserva ya confirmada/pendiente", () => {
  // scr-marketplace.ts es `// @ts-nocheck` y exporta `S = {}` tipado como objeto vacío;
  // TS no infiere las rutas asignadas más abajo en ese archivo. `any` local solo para
  // este acceso directo (el loop genérico de arriba ya usa Record<string, any>).
  const Marketplace: any = SMarketplace;

  beforeEach(() => {
    resetFixture("student");
  });

  it("perfil de coach con reserva CONFIRMED no explota (bookedPanel)", () => {
    win.__mkCoachId = COACH_FIXTURE.id;
    win.__mkBooked = {
      [COACH_FIXTURE.id]: { status: "CONFIRMED", pkgName: "Paquete de 5", dayLabel: "lun 14 jul", slotLabel: "4:00 PM" },
    };
    const html = Marketplace.marketplace.render({ role: "student" });
    expect(typeof html).toBe("string");
    expect(html.length).toBeGreaterThan(0);
    expect(html).toContain("Paquete de 5");
  });

  it("perfil de coach con reserva PENDING no explota (bookedPanel)", () => {
    win.__mkCoachId = COACH_FIXTURE.id;
    win.__mkBooked = {
      [COACH_FIXTURE.id]: { status: "PENDING", pkgName: "Sesión individual", dayLabel: "mar 15 jul", slotLabel: "5:00 PM" },
    };
    const html = Marketplace.marketplace.render({ role: "student" });
    expect(typeof html).toBe("string");
    expect(html.length).toBeGreaterThan(0);
  });

  it("bookedPanel con coachId ausente (undefined) tampoco explota", () => {
    // Reproduce el borde exacto del bug: bookedPanel() se llama con datos de
    // reserva pero SIN poder resolver el coachId (por eso `c` — que nunca fue
    // parámetro — habría sido un ReferenceError al querer leer `c.id`).
    win.__mkCoachId = COACH_FIXTURE.id;
    win.__mkBooked = { [COACH_FIXTURE.id]: { status: "CONFIRMED", pkgName: "", dayLabel: "", slotLabel: "" } };
    expect(() => Marketplace.marketplace.render({ role: "student" })).not.toThrow();
  });
});
