/* OTR LMS · router + shell + login */
(function () {
  window.SCREENS = window.SCREENS || {};
  const $ = (s, r = document) => r.querySelector(s);

  // ---- state ----
  const state = { role: 'student', course: 'pf', drawer: false };

  // ---- route table ----
  const ROUTES = {
    dashboard:    { screen:'dashboard',   title:'Inicio',            crumbs:['Inicio'] },
    course:       { screen:'course',      title:'Vista de curso',    crumbs:['Mis cursos','Public Forum I'] },
    'course-index':{ screen:'courseIndex',title:'Índice del curso',  crumbs:['Mis cursos','Public Forum I','Índice'] },
    lesson:       { screen:'lesson',      title:'Lección',           crumbs:['Public Forum I','Unidad 2','Claim · Warrant · Impact'] },
    assignment:   { screen:'assignment',  title:'Entrega de tarea',  crumbs:['Public Forum I','Grabación: discurso 2 min'] },
    quiz:         { screen:'quiz',         title:'Examen',            crumbs:['Public Forum I','Examen de unidad'] },
    'quiz-results':{ screen:'quizResults',title:'Resultados',        crumbs:['Public Forum I','Examen · Resultados'] },
    player:       { screen:'player',       title:'Reproductor',      crumbs:['Public Forum I','Simulacro con jueces'] },
    progress:     { screen:'progress',     title:'Progreso y niveles',crumbs:['Mi progreso'] },
    badges:       { screen:'badges',       title:'Insignias y certificados', crumbs:['Logros'] },
    grades:       { screen:'grades',       title:'Mis calificaciones',crumbs:['Calificaciones'] },
    profile:      { screen:'profile',      title:'Perfil',            crumbs:['Perfil'] },
    forum:        { screen:'forum',        title:'Foro',              crumbs:['Public Forum I','Foro'] },
    'forum-thread':{ screen:'forumThread', title:'Discusión',         crumbs:['Public Forum I','Foro','Discusión'] },
    messages:     { screen:'messages',     title:'Mensajes',          crumbs:['Mensajes'] },
    teacher:      { screen:'teacher',      title:'Panel del profesor',crumbs:['Profesor','Tracking'], role:'teacher' },
    gradebook:    { screen:'gradebook',    title:'Calificador',       crumbs:['Profesor','Calificador'], role:'teacher' },
    participants: { screen:'participants', title:'Participantes',     crumbs:['Profesor','Participantes'], role:'teacher' },
    kit:          { screen:'kit',          title:'Design System',     crumbs:['Sistema de diseño'] },
  };

  // ---- sidebar nav config ----
  const NAV = {
    student: [
      { group:'Aprender', items:[
        { r:'dashboard', ic:'home', l:'Inicio' },
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
      ]},
      { group:'Gestión', items:[
        { r:'gradebook', ic:'chart', l:'Calificador' },
        { r:'participants', ic:'users', l:'Participantes' },
        { r:'progress', ic:'levels', l:'Niveles' },
      ]},
      { group:'Comunidad', items:[
        { r:'forum', ic:'msg', l:'Foro' },
        { r:'messages', ic:'msg', l:'Mensajes' },
      ]},
    ],
  };
  const TABBAR = {
    student: [ {r:'dashboard',ic:'home',l:'Inicio'},{r:'course',ic:'book',l:'Curso'},{r:'progress',ic:'levels',l:'Niveles'},{r:'badges',ic:'medal',l:'Logros'},{r:'profile',ic:'user',l:'Perfil'} ],
    teacher: [ {r:'teacher',ic:'grid',l:'Panel'},{r:'gradebook',ic:'chart',l:'Notas'},{r:'participants',ic:'users',l:'Alumnos'},{r:'progress',ic:'levels',l:'Niveles'},{r:'profile',ic:'user',l:'Perfil'} ],
  };

  // ---- render sidebar / tabbar ----
  function renderNav(active) {
    const nav = NAV[state.role];
    $('#sb-nav').innerHTML = nav.map(g => `
      <div class="sb-group">${g.group}</div>
      ${g.items.map(it => `
        <a class="sb-item ${it.r===active?'active':''}" href="#${it.r}" data-link>
          ${IC[it.ic]}<span class="lbl">${it.l}</span>
          ${it.badge?`<span class="badge-count">${it.badge}</span>`:''}
        </a>`).join('')}
    `).join('') + `
      <div class="sb-group">Sistema</div>
      <a class="sb-item ${active==='kit'?'active':''}" href="#kit" data-link>${IC.sliders}<span class="lbl">Design System</span></a>
      <a class="sb-item" href="#login" data-link>${IC.logout}<span class="lbl">Salir</span></a>
    `;
    $('#tabbar').innerHTML = TABBAR[state.role].map(it =>
      `<a class="${it.r===active?'active':''}" href="#${it.r}" data-link>${IC[it.ic]}<span>${it.l}</span></a>`).join('');
  }

  // ---- chrome icons / user ----
  function paintChrome() {
    $('#search-ic').innerHTML = IC.search;
    $('#burger').innerHTML = IC.menu;
    $('#bell').innerHTML = IC.bell + `<span class="bell-count">3</span>`;
    const u = state.role === 'teacher' ? DB.teacher : DB.me;
    $('#sb-avatar').textContent = u.initials;
    $('#sb-username').textContent = u.name;
    $('#sb-userrole').textContent = state.role === 'teacher' ? 'Profesor' : 'Estudiante';
    $('#sidebar .avatar') && ($('#sb-avatar').style.background = state.role==='teacher' ? 'var(--otr-navy)' : 'var(--otr-sky-lo)');
  }

  // ---- login ----
  function renderLogin() {
    $('#login-root').innerHTML = `
      <div class="login">
        <div class="login-brand">
          <div class="lb-top">
            <svg class="crest" style="width:34px;height:39px" viewBox="0 0 26 30" fill="none">
              <path d="M13 1 L24 5.5 V16 C24 23 19 27.5 13 29.5 C7 27.5 2 23 2 16 V5.5 Z" fill="#fff"/>
              <text x="13" y="18.5" font-family="Archivo Expanded" font-weight="900" font-size="8" fill="#0C2340" text-anchor="middle">OTR</text>
            </svg>
            <span class="brand-font" style="color:#fff;font-size:16px">OTR <span style="opacity:.5;font-weight:600">Aula</span></span>
          </div>
          <div class="lb-mid">
            <p class="eyebrow" style="color:var(--otr-sky-hi)">Academia #1 del circuito dominicano</p>
            <h1 class="brand-font">Domina la sala.<br/>Empieza por entrenar.</h1>
            <p class="lb-sub">Tu aula de debate y oratoria: cursos, grabaciones, niveles y resultados — en un solo lugar.</p>
          </div>
          <div class="lb-foot">
            <div class="lb-wave" id="lb-wave"></div>
            <span>10 campeonatos · 55 clasificaciones · Harvard '26</span>
          </div>
        </div>
        <div class="login-form">
          <div class="lf-card">
            <h2>Inicia sesión</h2>
            <p class="muted" style="margin-bottom:22px">Bienvenido de vuelta a OTR.</p>
            <form id="login-form">
              <div class="field" style="margin-bottom:14px">
                <label class="label">Correo o usuario</label>
                <div class="input-group"><span class="lead">${IC.user}</span><input class="input" value="analia.reyes@otr.do" /></div>
              </div>
              <div class="field" style="margin-bottom:10px">
                <label class="label">Contraseña</label>
                <div class="input-group"><span class="lead">${IC.lock}</span><input class="input" type="password" value="········" /></div>
              </div>
              <div class="row between vcenter" style="margin-bottom:20px">
                <label class="check"><input type="checkbox" checked/> Recordarme</label>
                <a href="#" onclick="return false">¿Olvidaste tu contraseña?</a>
              </div>
              <button class="btn btn-primary btn-lg btn-block" type="submit">Entrar al aula ${IC.arrowR}</button>
            </form>
            <div class="lf-or"><span>o</span></div>
            <button class="btn btn-ghost btn-block" id="demo-teacher">Entrar como profesor (demo)</button>
            <p class="faint" style="text-align:center;margin-top:18px;font-size:12px">¿No tienes cuenta? <a href="#" onclick="return false">Solicita acceso</a></p>
          </div>
        </div>
      </div>`;
    drawLoginWave($('#lb-wave'));
    $('#login-form').addEventListener('submit', (e) => { e.preventDefault(); state.role='student'; location.hash = '#dashboard'; });
    $('#demo-teacher').addEventListener('click', () => { state.role='teacher'; location.hash = '#teacher'; });
  }

  function drawLoginWave(host) {
    if (!host) return;
    let s = '';
    for (let i = 0; i < 60; i++) {
      const env = Math.sin((i/59)*Math.PI);
      const h = 8 + env*70*Math.abs(Math.sin(i*0.9)) + 6;
      s += `<i style="height:${Math.min(96,h)}%;animation-delay:${(i*0.03).toFixed(2)}s"></i>`;
    }
    host.innerHTML = s;
  }

  // ---- main router ----
  function route() {
    let hash = (location.hash || '#dashboard').slice(1);
    if (hash === 'login' || hash === '') {
      $('#app').hidden = true;
      $('#login-root').hidden = false;
      renderLogin();
      window.scrollTo(0, 0);
      return;
    }
    const def = ROUTES[hash] || ROUTES.dashboard;
    if (def.role && def.role !== state.role) state.role = def.role;
    $('#login-root').hidden = true; $('#login-root').innerHTML = '';
    $('#app').hidden = false;

    renderNav(def.screen === 'courseIndex' ? 'course' : hashKey(def.screen));
    paintChrome();
    setRoleSwitch();
    // crumbs
    $('#crumbs').innerHTML = def.crumbs.map((c,i)=>
      i===def.crumbs.length-1 ? `<span class="here">${c}</span>` : `<span>${c}</span><span class="sep">/</span>`
    ).join('');

    const screen = SCREENS[def.screen];
    const content = $('#content');
    content.scrollTop = 0;
    if (!screen) { content.innerHTML = `<div class="page"><div class="empty"><div class="ill">${IC.flag}</div><h4>Pantalla en construcción</h4></div></div>`; return; }
    content.innerHTML = `<div class="page rise">${screen.render(state)}</div>`;
    if (screen.mount) screen.mount(content, state);
    closeDrawer();
    if (typeof toggleNotif === 'function') toggleNotif(false);
  }

  function hashKey(screen) {
    // map screen back to a nav route id for active state
    const m = { dashboard:'dashboard', course:'course', courseIndex:'course', lesson:'course', assignment:'course',
      quiz:'course', quizResults:'course', player:'player', progress:'progress', badges:'badges', grades:'grades',
      profile:'profile', teacher:'teacher', gradebook:'gradebook', participants:'participants', kit:'kit',
      forum:'forum', forumThread:'forum', messages:'messages' };
    return m[screen] || screen;
  }

  function setRoleSwitch() {
    $('#role-switch').querySelectorAll('button').forEach(b =>
      b.classList.toggle('on', b.dataset.role === state.role));
  }

  // ---- notifications + toasts ----
  let notifOpen = false;
  function toggleNotif(force) {
    notifOpen = force != null ? force : !notifOpen;
    let panel = document.getElementById('notif-panel');
    if (panel) panel.remove();
    if (!notifOpen) return;
    panel = document.createElement('div');
    panel.id = 'notif-panel'; panel.className = 'notif-panel';
    panel.innerHTML = `
      <div class="notif-head"><b>Notificaciones</b><button class="btn btn-quiet btn-sm" id="notif-read">Marcar leídas</button></div>
      <div id="notif-list">${DB.notifications.map(n=>`
        <div class="notif-item ${n.unread?'unread':''}">
          <div class="notif-ic ${n.tone}">${IC[n.ic]}</div>
          <div class="nt-main"><div class="nt-t">${n.t}</div><div class="nt-d">${n.d}</div><div class="nt-w">${n.when}</div></div>
        </div>`).join('')}</div>
      <div class="notif-foot"><a href="#" onclick="return false">Ver todas las notificaciones</a></div>`;
    $('.main').appendChild(panel);
    panel.querySelector('#notif-read').addEventListener('click', () => {
      panel.querySelectorAll('.notif-item').forEach(i=>i.classList.remove('unread'));
      const bc = $('#bell .bell-count'); if (bc) bc.remove();
      toast('Notificaciones marcadas como leídas','ok');
    });
  }

  let toastWrap;
  function toast(msg, tone) {
    if (!toastWrap) { toastWrap = document.createElement('div'); toastWrap.className = 'toast-wrap'; document.body.appendChild(toastWrap); }
    const ic = tone==='ok'?IC.checkCircle:tone==='warn'?IC.clock:tone==='danger'?IC.flag:IC.bell;
    const t = document.createElement('div'); t.className = 'toast ' + (tone||'');
    t.innerHTML = `<span class="ti">${ic}</span>${msg}`;
    toastWrap.appendChild(t);
    setTimeout(()=>{ t.style.opacity='0'; t.style.transform='translateY(8px)'; t.style.transition='.3s'; setTimeout(()=>t.remove(),300); }, 2600);
  }
  window.toast = toast;

  function modal({ title, body, ok='Confirmar', cancel='Cancelar', tone='primary' } = {}) {
    const scrim = document.createElement('div'); scrim.className = 'modal-scrim';
    scrim.innerHTML = `<div class="modal" role="dialog" aria-modal="true">
      <div class="modal-head"><h3>${title||''}</h3></div>
      <div class="modal-body">${body||''}</div>
      <div class="modal-foot"><button class="btn btn-ghost" data-x>${cancel}</button><button class="btn btn-${tone}" data-ok>${ok}</button></div>
    </div>`;
    document.body.appendChild(scrim);
    const close=()=>scrim.remove();
    scrim.addEventListener('click',e=>{ if(e.target===scrim||e.target.closest('[data-x]'))close(); });
    scrim.querySelector('[data-ok]').addEventListener('click',()=>{ close(); toast('Acción confirmada','ok'); });
  }
  window.modal = modal;

  // ---- interactions ----
  function openDrawer(){ state.drawer=true; $('#app').classList.add('drawer-open'); $('#scrim').hidden=false; }
  function closeDrawer(){ state.drawer=false; $('#app').classList.remove('drawer-open'); $('#scrim').hidden=true; }

  document.addEventListener('click', (e) => {
    const burger = e.target.closest('#burger');
    if (burger) { state.drawer ? closeDrawer() : openDrawer(); return; }
    if (e.target.closest('#scrim')) { closeDrawer(); return; }
    const bell = e.target.closest('#bell');
    if (bell) { e.stopPropagation(); toggleNotif(); return; }
    if (notifOpen && !e.target.closest('#notif-panel')) toggleNotif(false);
    const tEl = e.target.closest('[data-toast]');
    if (tEl) { const v = tEl.dataset.toast; const i = v.indexOf('::'); i>0 ? toast(v.slice(i+2), v.slice(0,i)) : toast(v); }
    const roleBtn = e.target.closest('#role-switch button');
    if (roleBtn) {
      state.role = roleBtn.dataset.role;
      location.hash = state.role === 'teacher' ? '#teacher' : '#dashboard';
      return;
    }
  });

  window.addEventListener('hashchange', route);
  window.addEventListener('DOMContentLoaded', () => { if (!location.hash) location.hash = '#login'; else route(); });
  // expose for screens that navigate
  window.go = (r) => { location.hash = '#' + r; };
  window.OTR = { state };
  route();
})();
