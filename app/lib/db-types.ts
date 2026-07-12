// OTR Aula · tipos de la capa de datos del LMS (M8 — fundación tipada).
//
// AppDB tipa la forma REAL de DB (el objeto mutable de app/lib/data.ts, hidratado
// en runtime con el resultado de getAppData() — ver app/lib/queries.ts, `const base`
// hacia el final del archivo, que es la fuente de verdad de qué campos existen).
//
// Es DELIBERADAMENTE incremental: cubre los campos conocidos con su forma de
// contenedor (array/objeto/primitivo) para habilitar autocompletado + chequeo real,
// pero NO tipa cada propiedad anidada en profundidad (eso queda para una ola futura).
// El index signature `[key: string]: any` es la válvula de escape: cualquier campo
// no cubierto aquí sigue compilando sin romper a los consumidores ya tipados
// (Aula.tsx, app/aula/page.tsx) ni exigir tipar las 21 pantallas de una sola vez.
export interface AppDB {
  me?: {
    name?: string;
    email?: string;
    initials?: string;
    level?: string;
    streak?: number;
    role?: string;
    lifecycle?: string;
    daysAway?: number | null;
    headline?: string;
    bio?: string;
    teachingStyle?: string;
    formats?: string;
    location?: string;
    preferences?: any;
    needsPlacement?: boolean;
    avatarUrl?: string | null;
    ageBand?: string | null;
    leaderboardOptIn?: boolean;
    speakerAvg?: number | null;
    speakerRounds?: number;
    [key: string]: any;
  };
  teacher?: {
    name?: string;
    email?: string;
    initials?: string;
    role?: string;
    headline?: string;
    bio?: string;
    teachingStyle?: string;
    formats?: string;
    location?: string;
    [key: string]: any;
  };
  levels?: any[];
  xp?: number;
  xpNext?: number;
  xpLevelStart?: number;
  courses?: any[];
  courseModules?: any[];
  coursesContent?: any[];
  mySubmissions?: any;
  mySubmissionsByLesson?: any;
  competencies?: any[];
  badges?: any[];
  // PRD §3.1 Events (S.events) + torneos (S.debateHub/S.events). Ver toneVar/eventCard
  // en scr-events.ts para la forma exacta de cada item.
  events?: any[];
  tournaments?: any[];
  activity?: any[];
  notifications?: any[];
  forum?: any[];
  forumThread?: any;
  messages?: any[];
  chat?: any[];
  catalog?: any[];
  arsenal?: any;
  skills?: any;
  certificates?: any[];
  coachProfile?: any;
  myReview?: any;
  canReviewCoach?: boolean;
  myGrades?: any;
  quizByLesson?: any;
  debateRank?: {
    rating?: number;
    rd?: number;
    tier?: string;
    provisional?: boolean;
    recentForm?: any;
    [key: string]: any;
  };
  debate?: any;
  leaderboard?: any;
  marketplace?: any;
  coachwork?: any;
  lifetime?: any;
  membership?: any;
  // PRD §7: solo se añade para STUDENT.
  myBookings?: any[];
  // PRD §11: solo se añade para PARENT.
  parent?: any;
  // Solo se añaden para TEACHER/ADMIN.
  students?: any[];
  teacherKpis?: any;
  pendingSubs?: any;
  gradebook?: any;
  manage?: any;
  teacherCourses?: any[];
  reviewsReceived?: any[];
  // Válvula de escape: campos aún no enumerados arriba (y los que agreguen las
  // pantallas fuera del alcance de este milestone) siguen compilando.
  [key: string]: any;
}

// Globals que Aula.tsx cuelga de `window` para que las pantallas (scr-*.ts, montadas
// vía innerHTML + addEventListener, sin JSX) puedan navegar/llamar a la API/mostrar
// toasts y modales sin pasar props — es el "bus" del SPA. Ver app/components/Aula.tsx
// (grep `window.` / `(window as any).`) para dónde se asignan, y los scr-*.ts (grep
// `window.__`) para el resto de las claves de estado de navegación por pantalla.
declare global {
  interface Window {
    // --- bus del SPA (asignados por Aula.tsx al montar) ---
    go?: (route: string, opts?: any) => void;
    api?: (path: string, body?: any, method?: string) => Promise<any>;
    toast?: (msg: string, tone?: string) => void;
    modal?: (opts?: any) => Promise<boolean> | any;
    otrFormModal?: (opts?: any) => Promise<any> | any;
    otrUpload?: (file: File, kind?: string) => Promise<any>;
    otrOpenQuizBuilder?: (lessonId: string, title?: string) => void;
    otrOpenLessonVideo?: (...args: any[]) => void;
    otrOpenResourceUpload?: (...args: any[]) => void;
    otrSetLang?: (lang: string) => void;
    otrGetLang?: () => string;
    refresh?: () => void;
    // DB "vista" en window (usada puntualmente por alguna pantalla; normalmente las
    // pantallas importan `DB` directo de ./data — ver contrato en escaping-contract).
    DB?: AppDB;

    // --- estado de navegación por pantalla (patrón window.__x) ---
    __lesson?: string;
    __quizLesson?: string;
    __quizResult?: any;
    __quizData?: any;
    __course?: string;
    __coursesTab?: string;
    __room?: string;
    __convo?: number;
    __cert?: string | null;
    __debateTab?: string;
    __drillTimer?: any;
    __parentFallback?: any;
    __lpSkill?: string;
    __arsenalKind?: string;
    __arsenalQ?: string;
    __cwTab?: string;
    __teacherTab?: string;
    __mod?: { loaded: boolean; loading: boolean; reports: any[]; total: number; [key: string]: any };
    __adminMetrics?: { loaded: boolean; loading: boolean; error: boolean; data: any; [key: string]: any };
    __adminUsers?: { loaded: boolean; loading: boolean; users: any[]; total: number; q: string; role: string; counts: any; [key: string]: any };
    __mkF?: { lang: string; spec: string; price: string; sort: string; q: string; [key: string]: any };
    __mkSel?: { pkg: any; dayKey: any; slotIso: any; slotLabel: string; dayLabel: string; [key: string]: any };
    __mkCoachId?: string | null;
    __mkBooked?: Record<string, any>;
    __mkDetail?: { id: string; data: any } | null;
    __mkDetailFail?: string | null;
    __builderCourseId?: string;
    __editMode?: boolean;
    __recTeardown?: (() => void) | null;
    __q?: string;
  }
}

// Convierte este archivo en un módulo (requerido para que `declare global` amplíe
// el Window global del proyecto en lugar de quedar como un script aislado).
export {};
