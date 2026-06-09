// @ts-nocheck
/* OTR LMS · shell (sidebar + topbar) + login — portado de index.html / app.js */
import { IC } from "./icons";
import { DB } from "./data";

const NAV = {
  student: [
    { group:'Aprender', items:[
      { r:'dashboard', ic:'home', l:'Inicio' },
      { r:'catalog', ic:'grid', l:'Catálogo' },
      { r:'course', ic:'book', l:'Mi curso' },
      { r:'player', ic:'play', l:'Reproductor' },
    ]},
    { group:'Mi progreso', items:[
      { r:'progress', ic:'levels', l:'Niveles', badge:'Varsity' },
      { r:'badges', ic:'medal', l:'Insignias' },
      { r:'grades', ic:'chart', l:'Calificaciones' },
    ]},
    { group:'Comunidad', items:[
      { r:'forum', ic:'msg', l:'Foro' },
      { r:'messages', ic:'msg', l:'Mensajes', badge:'2' },
    ]},
  ],
  teacher: [
    { group:'Enseñar', items:[
      { r:'teacher', ic:'grid', l:'Panel' },
      { r:'course', ic:'book', l:'Mis cursos' },
      { r:'manage', ic:'sliders', l:'Gestionar' },
    ]},
    { group:'Gestión', items:[
      { r:'gradebook', ic:'chart', l:'Calificador' },
      { r:'participants', ic:'users', l:'Participantes' },
      { r:'progress', ic:'levels', l:'Niveles' },
    ]},
  ],
};

const TABBAR = {
  student: [ {r:'dashboard',ic:'home',l:'Inicio'},{r:'course',ic:'book',l:'Curso'},{r:'progress',ic:'levels',l:'Niveles'},{r:'badges',ic:'medal',l:'Logros'},{r:'profile',ic:'user',l:'Perfil'} ],
  teacher: [ {r:'teacher',ic:'grid',l:'Panel'},{r:'gradebook',ic:'chart',l:'Notas'},{r:'participants',ic:'users',l:'Alumnos'},{r:'progress',ic:'levels',l:'Niveles'},{r:'profile',ic:'user',l:'Perfil'} ],
};

function crumbsHtml(crumbs) {
  return crumbs.map((c,i)=>
    i===crumbs.length-1 ? `<span class="here">${c}</span>` : `<span>${c}</span><span class="sep">/</span>`
  ).join('');
}

export function renderShell(activeNav, crumbs, content, role = 'student', canSwitch = false) {
  const nav = NAV[role] || NAV.student;
  const unreadMsgs = (DB.messages || []).reduce((s, m) => s + (m.unread || 0), 0);
  const navBadge = (it) => {
    if (it.r === 'progress') return DB.me?.level || '';
    if (it.r === 'messages') return unreadMsgs > 0 ? String(unreadMsgs) : '';
    return it.badge || '';
  };
  const sbNav = nav.map(g => `
    <div class="sb-group">${g.group}</div>
    ${g.items.map(it => `
      <a class="sb-item ${it.r===activeNav?'active':''}" href="#${it.r}" data-go="${it.r}">
        ${IC[it.ic]}<span class="lbl">${it.l}</span>
        ${navBadge(it)?`<span class="badge-count">${navBadge(it)}</span>`:''}
      </a>`).join('')}
  `).join('') + `
    <div class="sb-group">Sistema</div>
    <a class="sb-item ${activeNav==='kit'?'active':''}" href="#kit" data-go="kit">${IC.sliders}<span class="lbl">Design System</span></a>
    <a class="sb-item" href="#" data-action="logout">${IC.logout}<span class="lbl">Salir</span></a>`;

  const tabbar = (TABBAR[role]||TABBAR.student).map(it =>
    `<a class="${it.r===activeNav?'active':''}" href="#${it.r}" data-go="${it.r}">${IC[it.ic]}<span>${it.l}</span></a>`).join('');

  const u = role === 'teacher' ? DB.teacher : DB.me;
  const avBg = role === 'teacher' ? 'var(--otr-navy)' : 'var(--otr-sky-lo)';

  return `
  <div class="app">
    <aside class="sidebar">
      <div class="sb-head">
        <a class="sb-logo" href="#dashboard" data-go="dashboard">
          <svg class="crest" viewBox="0 0 26 30" fill="none" aria-hidden="true">
            <path d="M13 1 L24 5.5 V16 C24 23 19 27.5 13 29.5 C7 27.5 2 23 2 16 V5.5 Z" fill="#fff"/>
            <text x="13" y="18.5" font-family="Archivo Expanded" font-weight="900" font-size="8" fill="#0C2340" text-anchor="middle">OTR</text>
          </svg>
          <span class="txt">OTR <span class="sub">Aula</span></span>
        </a>
      </div>
      <nav class="sb-nav">${sbNav}</nav>
      <div class="sb-foot">
        <div class="sb-user" data-go="profile">
          <span class="avatar sm" style="background:${avBg}">${u.initials}</span>
          <span class="meta" style="min-width:0">
            <span style="display:block;font-weight:600;font-size:12.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${u.name}</span>
            <span style="display:block;font-size:11px;color:rgba(234,242,251,.5)">${role==='teacher'?'Profesor':'Estudiante'}</span>
          </span>
        </div>
      </div>
    </aside>

    <div class="main">
      <header class="topbar">
        <button class="icon-btn mobile-only" id="burger" aria-label="Menú">${IC.menu}</button>
        <div class="crumbs" id="crumbs">${crumbsHtml(crumbs)}</div>
        <div class="spacer"></div>
        <div class="searchbox desk-only">
          <span style="display:flex;width:16px;height:16px">${IC.search}</span>
          <input placeholder="Buscar cursos, tareas, personas…" />
        </div>
        ${canSwitch ? `<div class="role-switch desk-only" id="role-switch">
          <button data-role="student" class="${role==='student'?'on':''}">Estudiante</button>
          <button data-role="teacher" class="${role==='teacher'?'on':''}">Profesor</button>
        </div>` : ''}
        ${role==='teacher'?`<button class="btn btn-primary btn-sm" id="create-menu" style="height:32px;margin-right:8px">+ Crear</button>`:''}
        ${(() => { const u = (DB.notifications || []).filter(n => n.unread).length; return `<button class="icon-btn" id="bell" aria-label="Notificaciones">${IC.bell}${u>0?`<span class="bell-count">${u}</span>`:''}</button>`; })()}
      </header>

      <div class="content" id="content"><div class="page rise">${content}</div></div>

      <nav class="tabbar mobile-only">${tabbar}</nav>
    </div>
  </div>`;
}

