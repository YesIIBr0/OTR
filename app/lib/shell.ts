// @ts-nocheck
/* OTR LMS · shell (sidebar + topbar) + login — portado de index.html / app.js
   NAV reorganizado al MAPA TOP-LEVEL del PRD §3.1 (Fase 1 MVP):
   Dashboard · Learn (Courses / My Learning) · Debate Hub (flagship) ·
   Marketplace (coaches) · Progress Center (Levels / Achievements) ·
   Parent Portal (rol) · Coach Workspace (rol) · Settings.
   Diferidos APAGADOS del nav (no se borran archivos): Comunidad/Foro general
   ('forum') y Certificaciones como producto ('certificate' bajo Learn).
   Las etiquetas (grupos + items + topbar) son bilingües vía i18n.t().
   Las llaves 'k' apuntan al diccionario i18n; 'l' es el fallback en español. */
import { IC, otrCrest } from "./icons";
import { DB } from "./data";
import { t, getLang } from "./i18n";

const NAV = {
  // ESTUDIANTE — mapa PRD. 'hub'/'my-experience' viven bajo Aprender como
  // parte de la experiencia del estudiante; 'debate' y 'parent' apuntan a
  // pantallas placeholder honestas ("En construcción · llega en esta fase").
  student: [
    { gk:'group.main', group:'Principal', items:[
      { r:'dashboard', ic:'home', k:'nav.dashboard', l:'Inicio' },
      { r:'debate', ic:'mic', k:'nav.debate', l:'Debate Hub' },
      { r:'events', ic:'calendar', l:'Eventos' },
    ]},
    // Learn según PDF §3.1: Courses + My Learning ('hub' y 'arsenal' apagadas — no están en el PDF).
    { gk:'group.learn', group:'Aprender', items:[
      { r:'catalog', ic:'book', k:'nav.catalog', l:'Cursos' },
      { r:'course', ic:'play', k:'nav.course', l:'Mi aprendizaje' },
    ]},
    { gk:'group.progress', group:'Centro de progreso', items:[
      { r:'lifetime', ic:'award', k:'nav.lifetime', l:'Mi trayectoria' },
      { r:'progress', ic:'levels', k:'nav.progress', l:'Niveles', badge:'Varsity' },
      { r:'grades', ic:'doc', k:'nav.grades', l:'Mis calificaciones' },
      { r:'badges', ic:'medal', k:'nav.badges', l:'Logros' },
    ]},
    { gk:'group.marketplace', group:'Marketplace', items:[
      { r:'explore', ic:'search', k:'nav.explore', l:'Coaches' },
      { r:'my-bookings', ic:'calendar', k:'nav.mybookings', l:'Mis reservas' },
      // [CNV-03] Membresía (free→Pro) elevada por encima de Mensajes: es la palanca
      // de ingreso más desaprovechada y antes quedaba como último ítem del grupo.
      { r:'membership', ic:'star', k:'nav.membership', l:'Membresía' },
      // 'messages' se conserva SOLO como canal coach↔alumno (permitido en marketplace).
      { r:'messages', ic:'msg', k:'nav.messages', l:'Mensajes', badge:'2' },
    ]},
  ],
  // PROFESOR / COACH — Coach Workspace reusa 'teacher'/'manage'/'gradebook'.
  teacher: [
    { gk:'group.main', group:'Principal', items:[
      { r:'explore', ic:'search', k:'nav.explore', l:'Coaches' },
    ]},
    { gk:'group.workspace', group:'Espacio de coach', items:[
      { r:'teacher', ic:'grid', k:'nav.workspace', l:'Panel de coach' },
      { r:'coachwork', ic:'calendar', k:'nav.coachwork', l:'Reservas e ingresos' },
      // [SHELL-NAV-01] Quitado el item suelto 'course' (vista de alumno sin contexto):
      // duplicaba 'Gestionar' y rompía el modelo mental del coach. La vista-como-alumno
      // sigue accesible contextual desde "Vista previa" dentro del constructor (scr-extra.ts).
      { r:'manage', ic:'sliders', k:'nav.manage', l:'Gestionar' },
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
    ]},
    { gk:'group.marketplace', group:'Marketplace', items:[
      { r:'explore', ic:'search', k:'nav.explore', l:'Coaches' },
      { r:'messages', ic:'msg', k:'nav.messages', l:'Mensajes' },
    ]},
  ],
  // ADMIN (PRD §3.3) — consola con moderación (el resto de secciones llegan luego).
  admin: [
    { gk:'group.main', group:'Administración', items:[
      { r:'admin', ic:'flag', k:'nav.admin', l:'Moderación' },
      { r:'admin-users', ic:'users', k:'nav.users', l:'Usuarios' },
      { r:'explore', ic:'search', k:'nav.explore', l:'Coaches' },
      { r:'debate', ic:'mic', k:'nav.debate', l:'Debate Hub' },
    ]},
  ],
};

const TABBAR = {
  student: [ {r:'dashboard',ic:'home',k:'nav.dashboard',l:'Inicio'},{r:'debate',ic:'mic',k:'nav.debate',l:'Debate'},{r:'course',ic:'book',k:'nav.course',l:'Aprender'},{r:'lifetime',ic:'award',k:'nav.lifetime',l:'Trayectoria'},{r:'profile',ic:'user',k:'nav.profile',l:'Perfil'} ],
  teacher: [ {r:'teacher',ic:'grid',k:'nav.workspace',l:'Panel'},{r:'coachwork',ic:'calendar',k:'nav.coachwork',l:'Reservas'},{r:'participants',ic:'users',k:'nav.participants',l:'Alumnos'},{r:'messages',ic:'msg',k:'nav.messages',l:'Mensajes'},{r:'profile',ic:'user',k:'nav.profile',l:'Perfil'} ],
  parent: [ {r:'parent',ic:'users',k:'nav.parent',l:'Familia'},{r:'explore',ic:'search',k:'nav.explore',l:'Coaches'},{r:'messages',ic:'msg',k:'nav.messages',l:'Mensajes'},{r:'profile',ic:'user',k:'nav.profile',l:'Perfil'} ],
};

function crumbsHtml(crumbs) {
  return crumbs.map((c,i)=>
    i===crumbs.length-1 ? `<span class="here">${c}</span>` : `<span>${c}</span><span class="sep">/</span>`
  ).join('');
}

export function renderShell(activeNav, crumbs, content, role = 'student') {
  const nav = NAV[role] || NAV.student;
  const lang = getLang();
  const L = (it) => (it.k ? t(it.k, lang) : it.l); // label bilingüe con fallback al texto 'l'
  const unreadMsgs = (DB.messages || []).reduce((s, m) => s + (m.unread || 0), 0);
  const navBadge = (it) => {
    if (it.r === 'progress') return DB.me?.level || '';
    if (it.r === 'messages') return unreadMsgs > 0 ? String(unreadMsgs) : '';
    return it.badge || '';
  };
  const sbNav = nav.map(g => `
    <div class="sb-group">${g.gk ? t(g.gk, lang) : g.group}</div>
    ${g.items.map(it => `
      <a class="sb-item ${it.r===activeNav?'active':''}" href="#${it.r}" data-go="${it.r}">
        ${IC[it.ic]}<span class="lbl">${L(it)}</span>
        ${navBadge(it)?`<span class="badge-count">${navBadge(it)}</span>`:''}
      </a>`).join('')}
  `).join('') + `
    <div class="sb-group">${t('group.system', lang)}</div>
    <a class="sb-item ${activeNav==='settings'?'active':''}" href="#settings" data-go="settings">${IC.settings}<span class="lbl">Ajustes</span></a>
    <a class="sb-item" href="#" data-action="logout">${IC.logout}<span class="lbl">${t('nav.logout', lang)}</span></a>`;

  const tabbar = (TABBAR[role]||TABBAR.student).map(it =>
    `<a class="${it.r===activeNav?'active':''}" href="#${it.r}" data-go="${it.r}">${IC[it.ic]}<span>${L(it)}</span></a>`).join('');

  const u = DB.me;
  const avBg = role === 'teacher' ? 'var(--otr-navy)' : 'var(--otr-sky-lo)';

  return `
  <div class="app">
    <aside class="sidebar">
      <div class="sb-head">
        <a class="sb-logo" href="#dashboard" data-go="dashboard">
          ${/* Escudo OTR del brand book (sidebar, fondo negro) — markup canónico en ./icons (otrCrest) */""}
          ${otrCrest({ id: "sb", attrs: 'class="crest"' })}
          <span class="txt">OTR <span class="sub">Aula</span></span>
        </a>
      </div>
      <nav class="sb-nav">${sbNav}</nav>
      <div class="sb-foot">
        <div class="sb-user" data-go="profile">
          <span class="avatar sm" style="background:${avBg}">${u.initials}</span>
          <span class="meta" style="min-width:0">
            <span style="display:block;font-weight:600;font-size:12.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${u.name}</span>
            <span style="display:block;font-size:11px;color:rgba(234,242,251,.5)">${role==='admin'?t('role.admin',lang):role==='teacher'?t('role.teacher',lang):role==='parent'?t('role.parent',lang):t('role.student',lang)}</span>
          </span>
        </div>
      </div>
    </aside>

    <div class="main">
      <header class="topbar">
        <button class="icon-btn mobile-only" id="burger" aria-label="${t('top.menu', lang)}">${IC.menu}</button>
        <div class="crumbs" id="crumbs">${crumbsHtml(crumbs)}</div>
        <div class="spacer"></div>
        <div class="searchbox desk-only">
          <span style="display:flex;width:16px;height:16px">${IC.search}</span>
          <input aria-label="${t('top.search', lang)}" placeholder="${t('top.search', lang)}" />
        </div>
        <div class="lang-toggle" role="group" aria-label="${t('top.lang', lang)}" style="display:flex;align-items:center;gap:2px;font-size:12px;font-weight:600;border:1px solid var(--border);border-radius:100px;padding:3px;margin-right:8px">
          ${['es','en'].map(lg => `<button type="button" class="${lg===lang?'on':''}" data-lang="${lg}" onclick="window.otrSetLang&&window.otrSetLang('${lg}')" style="border:0;cursor:pointer;font-family:inherit;font-weight:600;font-size:11.5px;padding:4px 9px;border-radius:100px;transition:.2s;background:${lg===lang?'var(--otr-navy)':'transparent'};color:${lg===lang?'#fff':'var(--text-2)'}">${lg.toUpperCase()}</button>`).join('')}
        </div>
        ${role==='teacher'?`<button class="btn btn-primary btn-sm" id="create-menu" style="height:32px;margin-right:8px">${t('top.create', lang)}</button>`:''}
        ${(() => { const u = (DB.notifications || []).filter(n => n.unread).length; return `<button class="icon-btn" id="bell" aria-label="${t('top.notifications', lang)}">${IC.bell}${u>0?`<span class="bell-count">${u}</span>`:''}</button>`; })()}
      </header>

      <div class="content" id="content"><div class="page rise">${content}</div></div>

      <nav class="tabbar mobile-only">${tabbar}</nav>
    </div>
  </div>`;
}

