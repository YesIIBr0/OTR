// Contenedor de datos del LMS. YA NO contiene mock: se hidrata en tiempo de
// ejecución con los datos reales de la base de datos (ver app/lib/queries.ts,
// inyectados por el Server Component en app/page.tsx → Aula). Forma tipada en
// ./db-types (AppDB) — cobertura incremental de las claves reales de queries.ts,
// con índice dinámico de escape para lo aún no nombrado (ver ese archivo).
import type { AppDB } from "./db-types";

export const DB: AppDB = {};
