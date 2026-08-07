/* OTR LMS · shell (TOP-NAV horizontal + tabbar móvil) — mockup 2026-08-07.
   [MOCKUP T2] Adiós sidebar: la navegación vive en una barra superior sticky de 62px
   (spec docs/superpowers/specs/2026-08-07-dashboard-mockup-spec.md §2.1). Los ÍTEMS son
   exactamente los mismos del sidebar anterior (mismo NAV por rol, mismos `data-go`), solo
   cambia dónde se pintan: los primeros como links horizontales y el resto —con sus grupos
   como cabeceras— dentro del desplegable "Más" (un <details>, sin JS nuevo: la SPA delega
   por data-*, ver components/Aula.tsx).
   NAV = MAPA TOP-LEVEL del PRD §3.1 (Fase 1 MVP):
   Dashboard · Learn (Cursos: activos + catálogo) · Membresía · Debate Hub (flagship) ·
   Marketplace (coaches) · Progress Center · Parent Portal · Coach Workspace · Settings.
   Diferidos APAGADOS del nav (no se borran archivos): Comunidad/Foro general ('forum') y
   Certificaciones como producto ('certificate' bajo Learn).
   Las etiquetas (grupos + items) son bilingües vía i18n.t(); 'k' es la llave del
   diccionario y 'l' el fallback en español. */
import { IC, otrCrest } from "./icons";
import { DB } from "./data";
import { t, getLang } from "./i18n";

export type Role = "student" | "teacher" | "parent" | "admin";

interface NavItem {
  r: string;
  ic: string;
  k?: string;
  l: string;
  badge?: string;
}
interface NavGroup {
  gk?: string;
  group: string;
  items: NavItem[];
  // El grupo ya no colapsa (era del sidebar): ahora es la CABECERA de su bloque dentro del
  // menú "Más". `key` se conserva porque identifica al grupo de forma estable.
  key?: string;
}

const NAV: Record<Role, NavGroup[]> = {
  // ESTUDIANTE — mapa PRD. 'hub'/'my-experience' viven bajo Aprender como
  // parte de la experiencia del estudiante; 'debate' y 'parent' apuntan a
  // pantallas placeholder honestas ("En construcción · llega en esta fase").
  student: [
    { gk:'group.main', group:'Principal', items:[
      { r:'dashboard', ic:'home', k:'nav.dashboard', l:'Inicio' },
      { r:'events', ic:'calendar', k:'nav.events', l:'Eventos' },
    ]},
    // [IA-CONSOLIDACIÓN · llamada Isaac] "Aprender" y "Marketplace" eran lo mismo para el
    // alumno ("ver tus programas"): Cursos (S.course = activos + catálogo), Coaches y Mis
    // reservas. Se fusionan en UN solo grupo. Mensajes se conserva como canal coach↔alumno.
    // [UI-CURSOS U4] "Mis reservas" salió del nav: sus sesiones reservadas se pintan DENTRO
    // de Cursos, bajo el curso (scr-core → renderBookings). Un destino menos, misma función.
    { gk:'group.programs', group:'Mis programas', key:'programs', items:[
      { r:'course', ic:'book', k:'nav.coursesActive', l:'Activos' },
      { r:'catalog', ic:'search', k:'nav.coursesFind', l:'Buscar nuevos' },
      { r:'explore', ic:'search', k:'nav.explore', l:'Buscar coaches' },
      // [F-MKT M4] Buscador por materia del marketplace abierto (inglés, matemáticas, AI…).
      { r:'listings', ic:'search', k:'nav.listings', l:'Buscar clases' },
      { r:'debate', ic:'mic', k:'nav.debate', l:'Debate Hub' },
      { r:'messages', ic:'msg', k:'nav.messages', l:'Mensajes' },
    ]},
    // [UI-NAV N2] Membresía no es grupo propio: vive en el menú del chip de usuario, junto
    // a Perfil, Ajustes y Salir.
    { gk:'group.progress', group:'Progreso', key:'progress', items:[
      { r:'lifetime', ic:'award', k:'nav.lifetime', l:'Trayectoria' },
      { r:'progress', ic:'levels', k:'nav.progress', l:'Niveles' },
      { r:'grades', ic:'doc', k:'nav.grades', l:'Asignaciones' },
      { r:'badges', ic:'medal', k:'nav.badges', l:'Logros' },
    ]},
  ],
  // PROFESOR / COACH — Coach Workspace reusa 'teacher'/'manage'/'gradebook'.
  teacher: [
    { gk:'group.main', group:'Principal', items:[
      { r:'explore', ic:'search', k:'nav.explore', l:'Coaches' },
      // [F6.2] Eventos: el coach gestiona torneos (crear/editar/borrar) desde aquí. La pantalla
      // ya listaba torneos; solo faltaba exponerle la ruta (los controles son staff-only).
      { r:'events', ic:'calendar', k:'nav.events', l:'Eventos' },
    ]},
    { gk:'group.workspace', group:'Espacio de coach', items:[
      { r:'teacher', ic:'grid', k:'nav.workspace', l:'Panel de coach' },
      { r:'coachwork', ic:'calendar', k:'nav.coachwork', l:'Reservas e ingresos' },
      // [SHELL-NAV-01] Quitado el item suelto 'course' (vista de alumno sin contexto):
      // duplicaba 'Gestionar' y rompía el modelo mental del coach. La vista-como-alumno
      // sigue accesible contextual desde "Vista previa" dentro del constructor (scr-extra.ts).
      { r:'manage', ic:'sliders', k:'nav.manage', l:'Gestionar' },
      // [F-MKT M5] Sus listings del marketplace abierto (N materias, cada una con su tarifa).
      { r:'my-listings', ic:'book', k:'nav.myListings', l:'Mis clases' },
      // [NAV-03] Mensajes: el coach no tenía entrada a su único canal con alumnos/padres
      // (consultas pre-reserva del marketplace). La ruta ya existe; solo faltaba exponerla.
      { r:'messages', ic:'msg', k:'nav.messages', l:'Mensajes' },
      // "Mi perfil" abre el perfil EDITABLE del coach (S.profile→renderCoachSelf con
      // botones de edición), no la vista pública de solo lectura (r:'coach').
      { r:'profile', ic:'user', k:'nav.profile', l:'Mi perfil' },
    ]},
    // 'gradebook' apagada (PRD-estricto): el feedback es por ballots/rúbricas, no matriz de notas.
    // [roles] "Niveles" (progresión de ESTUDIANTE: XP/racha/skill-graph) NO va para el
    // profesor/coach — no es su concepto. El profesor ve a sus alumnos en "Participantes".
    { gk:'group.progress', group:'Centro de progreso', items:[
      { r:'participants', ic:'users', k:'nav.participants', l:'Participantes' },
    ]},
  ],
  // FAMILIA (PRD §11) — vista role-scoped: portal del hijo + marketplace + mensajes.
  parent: [
    { gk:'group.main', group:'Principal', items:[
      { r:'parent', ic:'users', k:'nav.parent', l:'Portal de familia' },
      // [NAV-08] "Gestionar plan" enruta a membership: el padre necesita el item en su
      // nav para no caer en un destino huérfano (sin item activo ni camino de vuelta).
      { r:'membership', ic:'star', k:'nav.membership', l:'Membresía' },
    ]},
    { gk:'group.marketplace', group:'Marketplace', items:[
      { r:'explore', ic:'search', k:'nav.explore', l:'Coaches' },
      { r:'listings', ic:'search', k:'nav.listings', l:'Buscar clases' },
      { r:'messages', ic:'msg', k:'nav.messages', l:'Mensajes' },
    ]},
  ],
  // ADMIN (PRD §3.3) — consola con moderación (el resto de secciones llegan luego).
  admin: [
    { gk:'group.main', group:'Administración', items:[
      { r:'admin', ic:'flag', k:'nav.admin', l:'Moderación' },
      { r:'admin-users', ic:'users', k:'nav.users', l:'Usuarios' },
      { r:'admin-metrics', ic:'chart', k:'nav.metrics', l:'Métricas' },
      { r:'admin-whatsapp', ic:'msg', k:'nav.whatsapp', l:'WhatsApp' },
      // [F6.3] Gestión de cursos: el admin crea cursos a nombre de un coach y reasigna dueños.
      // Reusa la pantalla 'manage' del profesor (ruta abierta a admin en screens.ts).
      { r:'manage', ic:'book', k:'nav.course', l:'Cursos' },
      { r:'explore', ic:'search', k:'nav.explore', l:'Coaches' },
      { r:'debate', ic:'mic', k:'nav.debate', l:'Debate Hub' },
      // [F6.2] Eventos: el admin gestiona torneos (crear/editar/borrar) desde la pantalla que
      // ya los listaba. El borrado (con inscritos bloqueado) es exclusivo del admin.
      { r:'events', ic:'calendar', k:'nav.events', l:'Eventos' },
    ]},
  ],
};

const TABBAR: Record<Role, NavItem[]> = {
  student: [ {r:'dashboard',ic:'home',k:'nav.dashboard',l:'Inicio'},{r:'debate',ic:'mic',k:'nav.debate',l:'Debate'},{r:'course',ic:'book',k:'nav.course',l:'Aprender'},{r:'lifetime',ic:'award',k:'nav.lifetime',l:'Trayectoria'},{r:'profile',ic:'user',k:'nav.profile',l:'Perfil'} ],
  teacher: [ {r:'teacher',ic:'grid',k:'nav.workspace',l:'Panel'},{r:'coachwork',ic:'calendar',k:'nav.coachwork',l:'Reservas'},{r:'participants',ic:'users',k:'nav.participants',l:'Alumnos'},{r:'messages',ic:'msg',k:'nav.messages',l:'Mensajes'},{r:'profile',ic:'user',k:'nav.profile',l:'Perfil'} ],
  parent: [ {r:'parent',ic:'users',k:'nav.parent',l:'Familia'},{r:'explore',ic:'search',k:'nav.explore',l:'Coaches'},{r:'messages',ic:'msg',k:'nav.messages',l:'Mensajes'},{r:'profile',ic:'user',k:'nav.profile',l:'Perfil'} ],
  // [NAV-06] Admin necesita su propio tabbar en móvil; sin él caía al de estudiante
  // (Inicio/Debate/Aprender/Trayectoria/Perfil), sin Moderación ni Usuarios.
  admin: [ {r:'admin',ic:'flag',k:'nav.admin',l:'Moderación'},{r:'admin-users',ic:'users',k:'nav.users',l:'Usuarios'},{r:'explore',ic:'search',k:'nav.explore',l:'Coaches'},{r:'debate',ic:'mic',k:'nav.debate',l:'Debate'},{r:'profile',ic:'user',k:'nav.profile',l:'Perfil'} ],
};

// Qué ítems se pintan como links horizontales (5 como el mockup §2.1, el máximo que entra
// sin apretar a 1256px); el resto cae en el menú "Más" con TODOS los demás.
// El orden del NAV es de SIDEBAR (agrupado por sección); en una barra horizontal no hay
// cabeceras de grupo, así que se eligen a mano los 5 destinos de uso diario de cada rol —
// los que se leen solos, sin el grupo encima. Una ruta que no esté aquí no se pierde: vive
// en "Más" y, si es la activa, sube sola a la barra.
const TOPNAV_INLINE: Record<Role, string[]> = {
  student: ['dashboard', 'course', 'events', 'debate', 'progress'],
  teacher: ['teacher', 'coachwork', 'manage', 'my-listings', 'participants'],
  parent:  ['parent', 'explore', 'listings', 'messages', 'membership'],
  admin:   ['admin', 'admin-users', 'admin-metrics', 'manage', 'events'],
};
// Etiqueta del LINK HORIZONTAL cuando la del sidebar no se lee fuera de su grupo:
// "Activos" tenía sentido bajo la cabecera "Mis programas"; suelto en la barra, no.
// Llaves i18n YA existentes (las usa el tabbar móvil) — no se inventa vocabulario.
const TOPNAV_LABEL: Record<string, string> = { course: 'nav.course' };

export function renderShell(activeNav: string, _crumbs: string[], content: string, role: Role = 'student') {
  const nav = NAV[role] || NAV.student;
  const lang = getLang();
  const L = (it: NavItem) => (it.k ? t(it.k, lang) : it.l); // label bilingüe con fallback al texto 'l'
  // DB.messages es dinámico (fuera de las claves nombradas de DBStore, ver data.ts):
  // se narrowa a array antes de reducir en vez de asumir su forma.
  const messages = Array.isArray(DB.messages) ? (DB.messages as Array<Record<string, unknown>>) : [];
  const unreadMsgs = messages.reduce((s, m) => s + (typeof m.unread === "number" ? m.unread : 0), 0);
  const navBadge = (it: NavItem): string => {
    if (it.r === 'progress') return String(DB.me?.level ?? '');
    if (it.r === 'messages') return unreadMsgs > 0 ? String(unreadMsgs) : '';
    return it.badge || '';
  };

  // --- Reparto de ítems: inline vs. menú "Más" -------------------------------------
  // Si la ruta activa no estaba entre los 5 elegidos se AÑADE a los links visibles: la
  // barra nunca esconde DÓNDE ESTÁS.
  const flat: NavItem[] = nav.flatMap(g => g.items);
  const wanted = TOPNAV_INLINE[role] || TOPNAV_INLINE.student;
  const inline: NavItem[] = wanted.map(r => flat.find(it => it.r === r)).filter((it): it is NavItem => !!it);
  const activeItem = flat.find(it => it.r === activeNav);
  if (activeItem && !inline.includes(activeItem)) inline.push(activeItem);
  const inlineSet = new Set(inline.map(it => it.r));
  const overflow = flat.filter(it => !inlineSet.has(it.r)).length;

  const linksHtml = inline.map(it => {
    const b = navBadge(it);
    const label = TOPNAV_LABEL[it.r] ? t(TOPNAV_LABEL[it.r], lang) : L(it);
    return `
      <a class="tn-link${it.r===activeNav?' active':''}" href="#${it.r}" data-go="${it.r}"${it.r===activeNav?' aria-current="page"':''}>
        <span class="tn-lbl">${label}</span>${/^\d+$/.test(b)?`<span class="tn-count">${b}</span>`:''}
      </a>`;
  }).join('');

  // Menú "Más": TODOS los ítems del rol, con la cabecera de su grupo. Los que ya se ven
  // como link horizontal se marcan .tn-dup y el CSS los esconde en escritorio; por debajo
  // de 1025px los links se ocultan y el menú pasa a ser la navegación completa.
  const moreHtml = nav.map(g => {
    const label = g.gk ? t(g.gk, lang) : g.group;
    const allDup = g.items.every(it => inlineSet.has(it.r));
    const items = g.items.map(it => {
      const b = navBadge(it);
      return `
      <a class="tn-mi${it.r===activeNav?' active':''}${inlineSet.has(it.r)?' tn-dup':''}" role="menuitem" href="#${it.r}" data-go="${it.r}">
        ${IC[it.ic]}<span class="lbl">${L(it)}</span>${b?`<span class="tn-count">${b}</span>`:''}
      </a>`;
    }).join('');
    return `<div class="tn-mgroup${allDup?' tn-dup':''}">${label}</div>${items}`;
  }).join('');

  const tabbar = (TABBAR[role]||TABBAR.student).map(it =>
    `<a class="${it.r===activeNav?'active':''}" href="#${it.r}" data-go="${it.r}">${IC[it.ic]}<span>${L(it)}</span></a>`).join('');

  const u = DB.me;
  const avBg = role === 'teacher' ? 'var(--otr-navy)' : 'var(--otr-sky-lo)';
  const roleLabel = role==='admin'?t('role.admin',lang):role==='teacher'?t('role.teacher',lang):role==='parent'?t('role.parent',lang):t('role.student',lang);
  // Sub del chip: "Tier · Nivel" con el dato REAL del ALUMNO (tier de debate + nombre de
  // nivel); si falta, el rol — nunca un dato inventado. Coach/padre/admin ven su rol: el
  // nivel es progresión de estudiante y no es su concepto (mismo criterio que el nav).
  const tier = role === 'student' ? (DB.debateRank?.tier || '') : '';
  const userSub = role === 'student'
    ? ([tier ? `Tier ${tier}` : '', u?.level || ''].filter(Boolean).join(' · ') || roleLabel)
    : roleLabel;
  // Pill de XP: solo con XP real (>0). Un coach/admin con 0 XP no la ve.
  const xp = typeof DB.xp === 'number' ? DB.xp : 0;
  const xpPill = xp > 0
    ? `<span class="tn-xp" title="${xp.toLocaleString(lang==='en'?'en':'es')} XP">${IC.flame}<b class="tnum">${xp.toLocaleString(lang==='en'?'en':'es')}</b><span class="u">XP</span></span>`
    : '';
  const unreadNotifs = (DB.notifications || []).filter(n => n.unread).length;

  return `
  <div class="app">
    <a href="#content" class="skip-link">${lang==='en'?'Skip to content':'Saltar al contenido'}</a>
    <div class="main">
      <header class="topnav">
        <div class="topnav-in">
          <div class="tn-left">
            <a class="tn-logo" href="#dashboard" data-go="dashboard">
              ${/* Escudo OTR del brand book (barra clara: tinta negra por defecto) — markup canónico en ./icons */""}
              ${otrCrest({ id: "tn", attrs: 'class="crest"' })}
              <span class="tn-word">Aula</span>
            </a>
            <nav class="tn-links" aria-label="${t('top.menu', lang)}">${linksHtml}</nav>
            ${/* Desplegable "Más": <details> nativo — sin JS nuevo (la SPA solo delega data-*). */""}
            <details class="tn-more${overflow===0?' tn-more--dup':''}">
              <summary aria-label="${t('top.menu', lang)}">${IC.menu}<span class="lbl">${lang==='en'?'More':'Más'}</span><span class="chev">${IC.chevD}</span></summary>
              <div class="tn-menu" role="menu">${moreHtml}</div>
            </details>
          </div>

          <div class="tn-right">
            ${xpPill}
            ${role==='teacher'?`<button type="button" class="btn btn-primary btn-sm tn-create" id="create-menu">${t('top.create', lang)}</button>`:''}
            <button type="button" class="tn-icon" id="bell" aria-label="${t('top.notifications', lang)}">${IC.bell}${unreadNotifs>0?`<span class="bell-count">${unreadNotifs}</span>`:''}</button>
            <span class="tn-sep" aria-hidden="true"></span>
            <div class="tn-userwrap">
              ${/* [UI-NAV N2] El chip se ilumina cuando estás en cualquier destino de su menú:
                   sin esto esas rutas quedarían huérfanas (sin nada activo ni vuelta visible). */""}
              <button type="button" class="tn-user${['profile','membership','settings'].includes(activeNav) ? ' active' : ''}"
                      data-user-menu aria-expanded="false" aria-controls="sb-usermenu" aria-haspopup="menu">
                <span class="avatar tn-av" style="background:${avBg}">${u.initials}</span>
                <span class="tn-umeta">
                  <span class="tn-uname">${u.name}</span>
                  <span class="tn-usub">${userSub}</span>
                </span>
              </button>
              ${/* [UI-NAV N2] Menú de cuenta: Perfil, Membresía (solo alumno — el coach cobra, no
                   se suscribe), Ajustes y Salir. Mismos data-* que antes: el delegador de
                   Aula.tsx lo abre/cierra por id (#sb-usermenu) sin cambios. */""}
              <div class="tn-usermenu" id="sb-usermenu" role="menu" hidden>
                <a class="tn-mi" role="menuitem" href="#profile" data-go="profile">${IC.user}<span class="lbl">${t('nav.profile', lang)}</span></a>
                ${role === 'student' ? `<a class="tn-mi" role="menuitem" href="#membership" data-go="membership">${IC.star}<span class="lbl">${t('nav.membership', lang)}</span></a>` : ''}
                <a class="tn-mi" role="menuitem" href="#settings" data-go="settings">${IC.settings}<span class="lbl">${t('nav.settings', lang)}</span></a>
                ${/* El selector de idioma vivía en el topbar borrado; sin él no habría forma de
                     cambiar a EN. Usa window.otrSetLang (inline, sin delegación). */""}
                <div class="tn-lang" role="group" aria-label="${t('top.lang', lang)}">
                  ${['es','en'].map(lg => `<button type="button" class="${lg===lang?'on':''}" data-lang="${lg}" onclick="window.otrSetLang&&window.otrSetLang('${lg}')">${lg.toUpperCase()}</button>`).join('')}
                </div>
                <a class="tn-mi" role="menuitem" href="#" data-action="logout">${IC.logout}<span class="lbl">${t('nav.logout', lang)}</span></a>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main class="content" id="content" tabindex="-1" aria-label="${lang==='en'?'Main content':'Contenido principal'}"><div class="page rise">${content}</div></main>

      <nav class="tabbar mobile-only">${tabbar}</nav>
    </div>
  </div>`;
}
