/* OTR LMS · router de hash: mapeo PURO ruta ↔ URL.
   [ROUTER-HASH] Antes la navegación del SPA era window.go(r) → renderApp(r) a secas: la URL
   nunca cambiaba, así que no había deep-link (#course no abría cursos), Atrás/Adelante no
   hacían nada y F5 devolvía siempre al home del rol. El fix convierte `location.hash` en la
   FUENTE DE VERDAD de la ruta; este módulo es la parte pura (sin window, sin DOM) para poder
   testearla — ver tests/router-hash.test.ts. Aula.tsx solo lo conecta a hashchange.

   Formato: `#ruta` (y `#ruta/param` para lo que llegue a necesitar contexto en la URL).
   Se eligió HASH y no History API/pushState porque /aula es UNA sola ruta de Next que pinta
   35 pantallas por innerHTML: con pushState el servidor tendría que resolver /aula/<pantalla>
   (rewrites + 404s reales); con hash el deep-link, el back/forward y el F5 salen del navegador
   sin tocar el routing del servidor.

   Sobre el parámetro: hoy los builders pasan el contexto en globales (window.__lesson,
   __listing, __room…) fijadas JUSTO antes de go('lesson'), así que la app serializa solo la
   ruta. parseHash igualmente tolera y decodifica `#ruta/param` para que una URL escrita a mano
   no rompa la navegación (la ruta manda; el param queda disponible para quien lo consuma). */
import { ROUTES } from "./screens";

/** Pantalla inicial de cada rol. Definición ÚNICA: Aula.tsx la consume vía
    defaultRouteForRole (arranque y guard de rol) en vez de duplicar el mapa. */
const ROLE_HOME: Record<string, string> = {
  admin: "admin",
  teacher: "teacher",
  parent: "parent",
  student: "dashboard",
};

export interface ParsedHash {
  route: string;
  param: string;
}

/** Home del rol; cualquier rol desconocido cae al dashboard del alumno. */
export function defaultRouteForRole(role: string): string {
  return ROLE_HOME[role] || "dashboard";
}

/** ¿La ruta existe y el rol puede verla? (mismo criterio que el guard de renderApp). */
export function isRouteAllowed(route: string, role: string): boolean {
  const def = ROUTES[route];
  if (!def) return false;
  if (!def.role) return true;
  const allowed = Array.isArray(def.role) ? def.role : [def.role];
  return allowed.includes(role);
}

/** ruta (+param opcional) → hash de la URL, listo para asignar a location.hash. */
export function routeToHash(route: string, param?: string): string {
  return param ? `#${route}/${encodeURIComponent(param)}` : `#${route}`;
}

/**
 * hash de la URL → ruta registrada (+param). Devuelve null si el hash NO es una ruta:
 * el ancla del skip-link (#content), un `href="#"` o basura escrita a mano. Quien llama
 * decide qué hacer con el null (al montar: home del rol; en hashchange: no navegar).
 */
export function parseHash(hash: string): ParsedHash | null {
  const raw = (hash || "").replace(/^#/, "");
  if (!raw) return null;
  const slash = raw.indexOf("/");
  const route = slash === -1 ? raw : raw.slice(0, slash);
  if (!ROUTES[route]) return null;
  const rest = slash === -1 ? "" : raw.slice(slash + 1);
  let param = rest;
  try { param = decodeURIComponent(rest); } catch { /* hash mal codificado: se usa crudo */ }
  return { route, param };
}

/** Ruta EFECTIVA de un hash para un rol: la del hash si es válida y suya; si no, su home. */
export function resolveHashRoute(hash: string, role: string): string {
  const parsed = parseHash(hash);
  if (parsed && isRouteAllowed(parsed.route, role)) return parsed.route;
  return defaultRouteForRole(role);
}

/**
 * ¿El hash es un ANCLA IN-PAGE y no una ruta? El propio producto los usa: el skip-link
 * `href="#content"` (shell.ts, primer tab-stop de toda pantalla) y el índice de lección
 * `#s1/#s2/#s3` (scr-core.ts). Un hashchange así NO es navegación: ni repinta ni redirige
 * en runtime — es el navegador saltando dentro del documento.
 */
export function isInPageAnchor(hash: string): boolean {
  const raw = (hash || "").replace(/^#/, "");
  return raw.length > 0 && parseHash(hash) === null;
}

/**
 * PANTALLAS CON CONTEXTO: su render depende de una global que quien navega fija JUSTO antes
 * (window.__lesson = X; go('lesson')). Ese contexto NO viaja en la URL, así que al volver con
 * Atrás/Adelante o al recargar sobre una de estas rutas la global está vacía o —peor— trae el
 * ÍTEM DE OTRA VISITA: se pintaría algo que el usuario no pidió. Regla: si el render lo dispara
 * el historial/arranque y el contexto no viene sellado por go(), se cae al PADRE de la sección.
 * Valor '' = sin padre natural (la ruta no tiene sección en el nav) → home del rol.
 *
 * Deliberadamente FUERA:
 *  · 'course-builder' → __builderCourseId tiene respaldo en sessionStorage: el F5 sí recupera.
 *  · 'course-index'   → activeCourse() cae al curso activo, no a un curso ajeno.
 *  · 'search'         → __q es la búsqueda que el propio usuario escribió, no otro ítem.
 */
export const CONTEXT_PARENT: Record<string, string> = {
  lesson:         'course',    // window.__lesson
  assignment:     'course',    // window.__lesson
  player:         'course',    // window.__lesson
  quiz:           'course',    // window.__quizLesson
  'quiz-results': 'course',    // window.__quizResult / __quizData
  listing:        'listings',  // window.__listing
  certificate:    'badges',    // window.__cert (sin match pinta el PRIMER certificado)
  room:           '',          // window.__room (nav vacío → home del rol)
};

/** ¿Esta ruta necesita un contexto que no viaja en la URL? */
export function routeNeedsContext(route: string): boolean {
  return Object.prototype.hasOwnProperty.call(CONTEXT_PARENT, route);
}

/**
 * A dónde cae una pantalla-con-contexto abierta SIN contexto fresco: al padre de su sección
 * si el rol puede verlo; si no hay padre (o no es suyo), al home del rol.
 */
export function contextFallbackRoute(route: string, role: string): string {
  const parent = CONTEXT_PARENT[route];
  if (parent && isRouteAllowed(parent, role)) return parent;
  return defaultRouteForRole(role);
}
