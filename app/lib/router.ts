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

/** Pantalla inicial de cada rol (espejo de ROLE_HOME en components/Aula.tsx). */
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
