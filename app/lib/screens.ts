// @ts-nocheck
/* OTR LMS · registro de pantallas + rutas.
   [PERF · code-splitting] Antes se importaban los 21 builders scr-* de golpe → TODO el JS de
   las 35 pantallas (incluidas las de otros roles: teacher/coachwork/parent/admin) viajaba en el
   chunk inicial del cliente. Ahora cada módulo se carga BAJO DEMANDA con import() (webpack crea
   un chunk por módulo). El despacho ya era dinámico por string en Aula.tsx, así que renderApp
   solo tiene que await ensureScreen() antes de pintar. Un alumno ya no descarga el código del
   panel del coach ni del admin. */

// Un loader por módulo → un chunk por módulo. NOTA: scr-core importa scr-extra internamente
// (S.course usa extraScreens.catalog), así que webpack los agrupa/encadena solo — correcto.
const LOADERS = {
  core:        () => import("./scr-core"),
  learn:       () => import("./scr-learn"),
  teacher:     () => import("./scr-teacher"),
  profile:     () => import("./scr-profile"),
  community:   () => import("./scr-community"),
  extra:       () => import("./scr-extra"),
  arsenal:     () => import("./scr-arsenal"),
  hub:         () => import("./scr-hub"),
  certificate: () => import("./scr-certificate"),
  debate:      () => import("./scr-debate"),
  marketplace: () => import("./scr-marketplace"),
  parent:      () => import("./scr-parent"),
  lifetime:    () => import("./scr-lifetime"),
  coachwork:   () => import("./scr-coachwork"),
  admin:       () => import("./scr-admin"),
  adminUsers:  () => import("./scr-admin-users"),
  mybookings:  () => import("./scr-mybookings"),
  placement:   () => import("./scr-placement"),
  settings:    () => import("./scr-settings"),
  events:      () => import("./scr-events"),
  room:        () => import("./scr-room"),
};

// Nombre de pantalla → módulo que la exporta. Best-effort: ensureScreen tiene fallback
// load-all si alguna llave no está aquí, así que un mapeo incompleto NUNCA rompe la nav.
const SCREEN_MODULE = {
  dashboard:'core', course:'core', courseIndex:'core', coursesCatalog:'core', coursesMine:'core', lesson:'core',
  assignment:'learn', grades:'learn', player:'learn', quiz:'learn', quizResults:'learn',
  teacher:'teacher', participants:'teacher',
  badges:'profile', coach:'profile', profile:'profile', progress:'profile',
  forum:'community', forumThread:'community', messages:'community',
  catalog:'extra', manage:'extra', courseBuilder:'extra', search:'extra',
  arsenal:'arsenal', hub:'hub', onboarding:'hub', certificate:'certificate',
  debateHub:'debate', marketplace:'marketplace', parentPortal:'parent',
  lifetimeProfile:'lifetime', membership:'lifetime', coachwork:'coachwork',
  adminConsole:'admin', adminUsers:'adminUsers', myBookings:'mybookings',
  placement:'placement', settings:'settings', events:'events', room:'room',
};

// Cache de runtime: se va llenando con la S de cada módulo cargado.
export const SCREENS = {};
const loadedMods = new Set();
let allLoaded = false;

async function loadMod(mod) {
  if (!mod || loadedMods.has(mod) || !LOADERS[mod]) return;
  loadedMods.add(mod); // marca ANTES del await para no relanzar el mismo import en paralelo
  try {
    const m = await LOADERS[mod]();
    if (m && m.S) Object.assign(SCREENS, m.S);
  } catch (e) {
    loadedMods.delete(mod); // permite reintentar si el chunk falló
    throw e;
  }
}
async function loadAllMods() {
  if (allLoaded) return;
  await Promise.all(Object.keys(LOADERS).map((m) => loadMod(m).catch(() => {})));
  allLoaded = true;
}

// Garantiza que la pantalla esté disponible antes de renderizar. Instantáneo si su módulo ya
// se cargó; en el primer acceso baja el chunk. Si el mapa no la tiene, carga todo (seguro).
export async function ensureScreen(name) {
  if (SCREENS[name]) return SCREENS[name];
  try { await loadMod(SCREEN_MODULE[name]); } catch {}
  if (SCREENS[name]) return SCREENS[name];
  await loadAllMods();
  return SCREENS[name];
}

// Prefetch en segundo plano (fire-and-forget) de las pantallas probables de un rol, para que
// la navegación se sienta instantánea sin inflar el primer paint.
const ROLE_PREFETCH = {
  student: ['debateHub','marketplace','lifetimeProfile','events','myBookings','grades','settings','profile','placement'],
  teacher: ['teacher','participants','manage','coachwork','marketplace','messages','profile','settings'],
  parent:  ['parentPortal','marketplace','messages','membership','profile','settings'],
  admin:   ['adminConsole','adminUsers','marketplace','debateHub','profile','settings'],
};
let didPrefetch = false;
export function prefetchForRole(role) {
  if (didPrefetch) return;
  didPrefetch = true;
  const names = ROLE_PREFETCH[role] || ROLE_PREFETCH.student;
  // en el próximo idle, para no competir con el primer render
  const kick = () => names.forEach((n) => { const mod = SCREEN_MODULE[n]; if (mod && !loadedMods.has(mod)) loadMod(mod).catch(() => {}); });
  if (typeof requestIdleCallback === "function") requestIdleCallback(kick); else setTimeout(kick, 400);
}

export const ROUTES = {
  dashboard:      { screen:'dashboard',    nav:'dashboard',    crumbs:['Inicio'] },
  search:         { screen:'search',       nav:'',             crumbs:['Buscar'] },
  // [EPIC-2] 'catalog' ya no es un item de nav propio: enruta a la sección "Cursos"
  // unificada (nav:'course') forzando el sub-tab Catálogo. El screen S.catalog crudo
  // sigue existiendo (reusado dentro de S.course); aquí usamos el wrapper coursesCatalog.
  catalog:        { screen:'coursesCatalog', nav:'course',     crumbs:['Cursos','Catálogo'] },
  // Crumbs genéricos (Moodle multi-curso): el nombre real del curso/lección se
  // muestra en el hero de cada pantalla, no se hardcodea aquí.
  // [EPIC-2] La ruta raíz 'course' entra por "Mis cursos" (wrapper coursesMine);
  // S.course es el renderer interno con los dos sub-tabs.
  course:         { screen:'coursesMine',   nav:'course',       crumbs:['Cursos'] },
  'course-index': { screen:'courseIndex',  nav:'course',       crumbs:['Cursos','Índice'] },
  lesson:         { screen:'lesson',       nav:'course',       crumbs:['Cursos','Lección'] },
  assignment:     { screen:'assignment',   nav:'course',       crumbs:['Cursos','Entrega'] },
  quiz:           { screen:'quiz',         nav:'course',       crumbs:['Cursos','Examen'] },
  'quiz-results': { screen:'quizResults',  nav:'course',       crumbs:['Cursos','Resultados'] },
  player:         { screen:'player',       nav:'player',       crumbs:['Cursos','Lección'] },
  progress:       { screen:'progress',     nav:'progress',     crumbs:['Centro de progreso','Niveles'] },
  badges:         { screen:'badges',       nav:'badges',       crumbs:['Centro de progreso','Logros'] },
  // RE-REGISTRADA: el alumno necesita ver sus notas + el feedback del coach (S.grades).
  grades:         { screen:'grades',       nav:'grades',       crumbs:['Centro de progreso','Mis calificaciones'] },
  // APAGADAS (PRD-estricto §15): 'forum'/'forum-thread' (discussion boards =
  // Fase 3 §10, con espacios cerrados y moderados para menores — este foro abierto
  // no cumple ese diseño). Las pantallas siguen exportadas; solo pierden ruta.
  profile:        { screen:'profile',      nav:'profile',      crumbs:['Perfil'] },
  messages:       { screen:'messages',     nav:'messages',     crumbs:['Mensajes'] },
  teacher:        { screen:'teacher',      nav:'teacher',      crumbs:['Profesor','Tracking'], role:'teacher' },
  // 'gradebook' APAGADA (PRD-estricto): el feedback del PDF son ballots/rúbricas (§6.5) y session tools (§7.5), no una matriz de notas.
  participants:   { screen:'participants', nav:'participants', crumbs:['Profesor','Participantes'], role:'teacher' },
  manage:         { screen:'manage',       nav:'manage',       crumbs:['Profesor','Mis cursos'], role:'teacher' },
  // Constructor de curso estilo Moodle (secciones + actividades). El courseId va en
  // window.__builderCourseId (ruta plana, sin params) → ver S.courseBuilder.
  'course-builder': { screen:'courseBuilder', nav:'manage',     crumbs:['Profesor','Constructor de curso'], role:'teacher' },
  // 'arsenal' APAGADA (PRD-estricto): no existe en el PDF — el "motion library" (§6.4) es otra cosa y es Fase 2.
  coach:          { screen:'coach',        nav:'profile',      crumbs:['OTR','Coach'] },
  // 'hub' APAGADA (PRD-estricto): el HQ del PDF es el Dashboard (§4); Learn = Cursos + Mi aprendizaje.
  // Marketplace de coaches (PRD §7): 'explore' es el item "Coaches" del nav;
  // 'marketplace' queda como alias explícito de la misma pantalla.
  explore:        { screen:'marketplace',  nav:'explore',      crumbs:['Marketplace','Coaches'] },
  marketplace:    { screen:'marketplace',  nav:'explore',      crumbs:['Marketplace','Coaches'] },
  // Coach Workspace (PRD §7.5, supply-side) → scr-coachwork.ts.
  coachwork:      { screen:'coachwork',    nav:'coachwork',    crumbs:['Espacio de coach','Reservas e ingresos'] },
  // Mis reservas (PRD §7.3 paso 6 + §4.2 ④, demand-side) → scr-mybookings.ts.
  'my-bookings':  { screen:'myBookings',   nav:'my-bookings',  crumbs:['Marketplace','Mis reservas'] },
  // Sala de sesión (PRD §7.3 paso 6) → scr-room.ts; destino real del botón "Unirse".
  room:           { screen:'room',         nav:'',             crumbs:['Sala de sesión'] },
  // 'my-experience' APAGADA (PRD-estricto): preferencias de experiencia no están en el PDF.
  onboarding:     { screen:'onboarding',   nav:'dashboard',    crumbs:['Inicio','Configura tu experiencia'] },
  // Placement inicial (PRD §2.2 Journey A + §4.3): auto-evaluación de 3 min para
  // el usuario nuevo sin placement → puebla el Skill Graph y fija User.placedAt.
  placement:      { screen:'placement',    nav:'dashboard',    crumbs:['Inicio','Tu punto de partida'] },
  certificate:    { screen:'certificate',  nav:'badges',       crumbs:['Logros','Certificado'] },
  // Debate Hub (flagship, PRD §6) → pantalla real S.debateHub.
  debate:         { screen:'debateHub',    nav:'debate',       crumbs:['Debate Hub'] },
  // Parent Portal (PRD §11) → pantalla real S.parentPortal.
  parent:         { screen:'parentPortal', nav:'parent',       crumbs:['Portal de familia'] },
  // Lifetime Progress Profile (PRD §8) + Membresía (PRD §13) → scr-lifetime.ts.
  lifetime:       { screen:'lifetimeProfile', nav:'lifetime',  crumbs:['Centro de progreso','Mi trayectoria'] },
  membership:     { screen:'membership',   nav:'membership',   crumbs:['Cuenta','Membresía'] },
  // Ajustes (PRD §3.1 ⚙️ Settings): hub de cuenta/idioma/notificaciones/privacidad → scr-settings.ts.
  settings:       { screen:'settings',     nav:'settings',     crumbs:['Cuenta','Ajustes'] },
  // Eventos (PRD §3.1 📅 Events): seminarios, sesiones en vivo y torneos → scr-events.ts.
  events:         { screen:'events',       nav:'events',       crumbs:['Eventos'] },
  // Consola de moderación (PRD §3.3 admin console mínima, §7.4 reportes) → scr-admin.ts.
  admin:          { screen:'adminConsole', nav:'admin',        crumbs:['Administración','Moderación'], role:'admin' },
  // Admin → Gestión de usuarios (PRD §3.3): roles, verificación de coach, suspensión → scr-admin-users.ts.
  'admin-users':  { screen:'adminUsers',   nav:'admin-users',  crumbs:['Administración','Gestión de usuarios'], role:'admin' },
};
