/* Contenedor de datos del LMS. YA NO contiene mock: se hidrata en tiempo de
   ejecución con los datos reales de la base de datos (ver app/lib/queries.ts,
   inyectados por el Server Component en app/page.tsx → Aula).

   El shape de DB es genuinamente dinámico: ~20 builders `scr-*.ts` (con
   `// @ts-nocheck`, ver ADR-0004) y `app/components/Aula.tsx` leen/escriben
   decenas de claves de nivel superior que vienen de las distintas funciones de
   queries.ts (cada pantalla aporta su propia porción vía `Object.assign(DB, data)`).
   No hay un contrato estable único: tipamos las claves que SÍ se leen sin cast
   desde código chequeado (Aula.tsx) con una forma laxa pero real, y dejamos el
   resto como índice dinámico — evita reescribir queries.ts/scr-*.ts para inventar
   un contrato que hoy no existe. */
export interface DBStore {
  me?: Record<string, unknown>;
  notifications?: Array<Record<string, unknown>>;
  courseModules?: Array<Record<string, unknown>>;
  coursesContent?: Array<Record<string, unknown>>;
  courses?: Array<Record<string, unknown>>;
  manage?: {
    courses?: Array<Record<string, unknown>>;
    modules?: Array<Record<string, unknown>>;
  };
  // Resto de claves (teacherCourses, quizByLesson, debate, leaderboard, lifetime,
  // parent, activity, catalog, students, chat, tournaments, …): se acceden siempre
  // vía `(DB as any)` desde código chequeado, o desde builders `scr-*.ts` sin
  // chequeo — no forzamos su forma aquí.
  [key: string]: unknown;
}

export const DB: DBStore = {};
