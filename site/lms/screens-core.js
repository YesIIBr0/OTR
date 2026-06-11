/* OTR LMS · core student screens: dashboard, course, course-index, lesson */
(function () {
  window.SCREENS = window.SCREENS || {};
  const S = window.SCREENS;

  /* ---------------- DASHBOARD / MIS CURSOS ---------------- */
  S.dashboard = {
    render() {
      const xp = (window.__otrXP && window.__otrXP.getXP()) || { programs: [] };
      const inRoute = (id) => xp.programs.includes(id) || (id === 'sum' && xp.programs.includes('camp'));
      const sorted = [...DB.courses].sort((a, b) => (inRoute(b.id) ? 1 : 0) - (inRoute(a.id) ? 1 : 0));
      const nRoute = sorted.filter(c => inRoute(c.id)).length;
      const courseCards = sorted.map(c => `
        <div class="tile course-card click" onclick="go('course')">
          <div class="cc-top" style="background:linear-gradient(120deg,${c.color},color-mix(in srgb,${c.color} 55%, #0C2340))">
            <span class="cc-code">${c.code}</span>
            ${inRoute(c.id) ? '<span class="badge sky" style="position:relative;z-index:2;margin-left:auto">En tu ruta</span>' : ''}
          </div>
          <div class="cc-body">
            <div class="cc-name">${c.name}</div>
            <div class="cc-coach">${c.coach}</div>
            <div class="cc-meta">
              <span>${IC.book} ${c.lessons} lecciones</span>
              ${c.due ? `<span class="dot-sep"></span><span style="color:var(--warn);font-weight:600">${c.due} pendiente${c.due>1?'s':''}</span>` : ''}
            </div>
            ${C.bar(c.progress, { cls:'thin' })}
            <div class="cc-foot">
              <span class="cc-pct">${c.progress}% completado</span>
              <span class="faint" style="font-size:12px">Sig: ${c.next}</span>
            </div>
          </div>
        </div>`).join('');

      return `
      <div class="hello-card" style="margin-bottom:18px">
        <div class="h-row">
          <div>
            <p class="eyebrow" style="color:var(--otr-sky-hi)">Martes · 8 jun</p>
            <h2 class="brand-font">Buenas, Analía 👋</h2>
            <p style="color:rgba(234,242,251,.72);font-size:13.5px;margin-top:4px">Tienes <b style="color:#fff">2 entregas</b> esta semana y un simulacro hoy.</p>
          </div>
          <div class="row" style="gap:10px">
            <span class="streak">${IC.flame} ${DB.me.streak} días de racha</span>
            ${C.levelBadge('Varsity')}
          </div>
        </div>
      </div>

      <div class="grid g-4" style="margin-bottom:20px">
        <div class="tile">${C.kpi('Cursos activos','5',{ic:'book'})}</div>
        <div class="tile">${C.kpi('Progreso medio','58',{unit:'%',ic:'chart',delta:'6%',dir:'up'})}</div>
        <div class="tile">${C.kpi('XP esta semana','420',{ic:'flame',delta:'80',dir:'up'})}</div>
        <div class="tile">${C.kpi('Próxima entrega','Mañana',{ic:'clock'})}</div>
      </div>

      <div class="split">
        <div>
          <div class="page-head" style="margin-bottom:14px">
            <div><div class="page-title" style="font-size:18px">Mis cursos</div></div>
            <div class="seg"><button class="on">Todos</button><button>En progreso</button><button>Completados</button></div>
          </div>
          ${nRoute ? `<div class="alert info" style="margin-bottom:14px"><span class="ai">${IC.sliders}</span><div><div class="at">Tu ruta del hub</div>${nRoute} de tus cursos vienen de los programas que elegiste en <a href="#my-experience">Mi experiencia</a> — aparecen primero.</div></div>` : ''}
          <div class="grid g-3">${courseCards}</div>
        </div>

        <div class="stack" style="gap:16px">
          <div class="card">
            <div class="card-head"><h3>Agenda</h3><a href="#" onclick="return false" style="font-size:12.5px">Ver todo</a></div>
            <div class="card-body" style="padding:6px 16px 12px">
              ${DB.events.map(e=>`
                <div class="agenda-item">
                  <span class="when-dot" style="background:var(--${e.tone==='warn'?'warn':e.tone==='navy'?'otr-navy':'otr-sky'})"></span>
                  <div><div class="ai-t">${e.t}</div><div class="ai-c">${e.c}</div></div>
                  <span class="ai-w">${e.when}</span>
                </div>`).join('')}
            </div>
          </div>

          <div class="card card-pad">
            <div class="lvl-widget">
              <div class="row between vcenter">
                <b style="font-size:14px">Tu nivel</b>${C.levelBadge('Varsity')}
              </div>
              ${C.bar(((DB.xp-DB.xpLevelStart)/(DB.xpNext-DB.xpLevelStart))*100,{cls:'thick navy'})}
              <div class="row between" style="font-size:12px;color:var(--text-2)">
                <span class="tnum">${DB.xp.toLocaleString('es')} XP</span><span class="tnum">${DB.xpNext.toLocaleString('es')} XP → Elite</span>
              </div>
              <div class="lvl-ladder">
                <div class="lvl-step done">Novato</div><div class="lvl-step done">JV</div>
                <div class="lvl-step cur">Varsity</div><div class="lvl-step">Elite</div>
              </div>
              <button class="btn btn-soft btn-sm" onclick="go('progress')">Ver progreso ${IC.arrowR}</button>
            </div>
          </div>

          <div class="card">
            <div class="card-head"><h3>Actividad</h3></div>
            <div class="card-body" style="padding:6px 16px 12px">
              ${DB.activity.map(a=>`<div class="agenda-item"><span class="when-dot" style="background:var(--otr-pale)"></span>
                <div><div class="ai-t" style="font-weight:500"><b>${a.who}</b> ${a.a} <span class="sky">${a.t}</span></div></div>
                <span class="ai-w">${a.when}</span></div>`).join('')}
            </div>
          </div>
        </div>
      </div>`;
    }
  };

  /* ---------------- VISTA DE CURSO ---------------- */
  S.course = {
    render() {
      const c = DB.courses[0];
      const modules = DB.courseModules.map((m,mi)=>`
        <div class="module ${mi===1?'open':''}">
          <div class="module-head" data-acc>
            <div class="mh-ic ${m.done?'done':m.locked?'lock':''}">${m.done?IC.check:m.locked?IC.lock:`<b>${mi+1}</b>`}</div>
            <div class="mh-text"><div class="mh-title">${m.t}</div><div class="mh-sub">${m.items.length} actividades${m.done?' · completada':m.locked?' · bloqueada':''}</div></div>
            <span class="chev">${IC.chevD}</span>
          </div>
          <div class="module-items">
            ${m.items.map(it=>`
              <div class="mitem ${it.done?'done':''} ${it.locked?'lock':''}" ${!it.locked?`onclick="go('${it.type==='quiz'?'quiz':it.type==='mic'||it.type==='assign'?'assignment':it.type==='video'?'player':'lesson'}')"`:''}>
                <div class="mi-ic">${it.done?IC.check:C.typeIcon(it.type)}</div>
                <div class="mi-t">${it.t}</div>
                <div class="mi-meta">${it.grade?C.badge(it.grade,'ok'):''}${it.due?`<span style="color:var(--warn)">${it.due}</span>`:''}${it.dur?`<span>${it.dur}</span>`:''}${it.locked?IC.lock:''}</div>
              </div>`).join('')}
          </div>
        </div>`).join('');

      return `
      <div class="course-hero">
        <div class="ch-banner" style="background:linear-gradient(120deg,${c.color},var(--otr-navy))">
          <div class="stripes"></div>
          <span class="cc-code" style="position:relative;z-index:2">${c.code}</span>
        </div>
        <div class="ch-body">
          <div style="flex:1;min-width:220px">
            <h2 style="font-size:20px;font-weight:750;letter-spacing:-.01em">${c.name}</h2>
            <div class="row vcenter" style="gap:12px;margin-top:6px;font-size:13px;color:var(--text-2)">
              <span class="row vcenter" style="gap:6px">${C.avatar('SM',{size:'sm'})} ${c.coach}</span>
              <span class="dot-sep"></span><span>${c.students} estudiantes</span>
              <span class="dot-sep"></span><span>${c.lessons} lecciones</span>
            </div>
          </div>
          <div class="row vcenter" style="gap:18px">
            ${C.ring(c.progress, 64)}
            <div class="stack" style="gap:8px">
              <button class="btn btn-primary" onclick="go('lesson')">Continuar ${IC.arrowR}</button>
              <button class="btn btn-ghost btn-sm" onclick="go('course-index')">Índice del curso</button>
            </div>
          </div>
        </div>
      </div>

      <div class="tabs">
        <button class="tab active">Contenido</button>
        <button class="tab">Calificaciones</button>
        <button class="tab">Foro</button>
        <button class="tab">Participantes</button>
      </div>

      <div class="split">
        <div>${modules}</div>
        <div class="stack" style="gap:16px">
          <div class="card card-pad">
            <b style="font-size:14px">Tu progreso</b>
            <div class="row vcenter between" style="margin:14px 0 8px"><span class="muted" style="font-size:13px">12 de 18 actividades</span><b class="sky">${c.progress}%</b></div>
            ${C.bar(c.progress)}
            <div class="divider"></div>
            <div class="row between" style="font-size:13px"><span class="muted">Promedio actual</span><b>89%</b></div>
            <div class="row between" style="font-size:13px;margin-top:8px"><span class="muted">Asistencia</span><b>92%</b></div>
          </div>
          <div class="alert info"><span class="ai">${IC.calendar}</span><div><div class="at">Próximo: Simulacro con jueces</div>Hoy 4:00 PM · trae tu caso impreso.</div></div>
        </div>
      </div>`;
    },
    mount(root) {
      root.querySelectorAll('[data-acc]').forEach(h =>
        h.addEventListener('click', () => h.closest('.module').classList.toggle('open')));
    }
  };

  /* ---------------- SHELL DE NAVEGACIÓN / ÍNDICE ---------------- */
  S.courseIndex = {
    render() {
      const all = [];
      DB.courseModules.forEach((m,mi)=>{ m.items.forEach(it=>all.push({...it,unit:`U${mi+1}`})); });
      return `
      <div class="page-head"><div>
        <div class="page-title">Índice del curso</div>
        <div class="page-sub">Public Forum I · navega cualquier actividad del curso</div>
      </div><button class="btn btn-ghost" onclick="go('course')">${IC.chevL} Volver al curso</button></div>

      <div class="grid g-3" style="margin-bottom:20px">
        <div class="tile">${C.kpi('Completado','67',{unit:'%',ic:'checkCircle'})}</div>
        <div class="tile">${C.kpi('Actividades','18',{ic:'grid'})}</div>
        <div class="tile">${C.kpi('Tiempo restante','~3h',{ic:'clock'})}</div>
      </div>

      <div class="table-wrap scroll-m">
        <table class="tbl">
          <thead><tr><th>Actividad</th><th>Unidad</th><th>Tipo</th><th class="center">Estado</th><th class="num">Nota</th></tr></thead>
          <tbody>
            ${all.map(it=>`<tr style="cursor:pointer" ${!it.locked?`onclick="go('${it.type==='quiz'?'quiz':it.type==='mic'||it.type==='assign'?'assignment':it.type==='video'?'player':'lesson'}')"`:''}>
              <td><div class="row vcenter" style="gap:10px"><span style="display:flex;width:18px;color:var(--text-2)">${C.typeIcon(it.type)}</span><b style="font-weight:600">${it.t}</b></div></td>
              <td><span class="tag-soft">${it.unit}</span></td>
              <td class="muted" style="text-transform:capitalize">${({video:'Video',lesson:'Lección',quiz:'Quiz',assign:'Tarea',mic:'Grabación'})[it.type]||it.type}</td>
              <td class="center">${it.done?C.badge('Hecho','ok',{dot:1}):it.locked?C.badge('Bloqueado','',{dot:1}):C.badge('Pendiente','warn',{dot:1})}</td>
              <td class="num">${it.grade||'—'}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
    }
  };

  /* ---------------- LECCIÓN / CONTENIDO ---------------- */
  S.lesson = {
    render() {
      return `
      <div class="row between vcenter" style="margin-bottom:6px">
        <span class="badge sky">${IC.book} Unidad 2 · Lección 1</span>
        <span class="muted" style="font-size:12.5px">${IC.clock} 18 min de lectura</span>
      </div>
      <div class="lesson-wrap">
        <div>
          <h1 class="page-title" style="font-size:28px;margin-bottom:6px">Claim · Warrant · Impact</h1>
          <p class="muted" style="margin-bottom:20px">La anatomía de un argumento que gana rondas.</p>
          <div class="prose">
            <p>Un argumento sólido no es una opinión más fuerte: es una <b>estructura</b>. En OTR entrenamos cada contención sobre tres piezas que el juez puede seguir sin esfuerzo.</p>
            <h2 id="s1">1. Claim — la afirmación</h2>
            <p>Es la oración que quieres que el juez crea. Debe ser específica, defendible y relevante para la resolución. Si no puedes escribirla en una sola línea, todavía no la tienes.</p>
            <div class="callout"><b>Regla OTR:</b> si tu claim necesita "y además…", probablemente son dos claims. Sepáralos.</div>
            <h2 id="s2">2. Warrant — el porqué</h2>
            <p>El warrant es la lógica o evidencia que conecta tu claim con la realidad. Aquí vive el 80% del trabajo. Un buen warrant responde: <i>¿por qué es esto cierto?</i></p>
            <ul><li>Evidencia empírica (datos, estudios, ejemplos).</li><li>Razonamiento causal (A provoca B).</li><li>Principios y analogías.</li></ul>
            <h2 id="s3">3. Impact — el porqué importa</h2>
            <p>El impacto traduce tu argumento al lenguaje del juez: ¿qué cambia en el mundo si tienes razón? Magnitud, probabilidad y tiempo. Sin impacto, ganaste la lógica pero perdiste la ronda.</p>
            <div class="callout"><b>Tu turno:</b> en la siguiente actividad grabarás un discurso de 2 minutos defendiendo una contención con esta estructura.</div>
          </div>
          <div class="lesson-nav">
            <button class="btn btn-ghost" onclick="go('course')">${IC.chevL} Anterior</button>
            <button class="btn btn-primary" onclick="go('assignment')">Siguiente: grabación ${IC.arrowR}</button>
          </div>
        </div>
        <aside class="lesson-outline">
          <div class="ol-t">En esta lección</div>
          <a href="#s1" class="active">Claim — la afirmación</a>
          <a href="#s2">Warrant — el porqué</a>
          <a href="#s3">Impact — por qué importa</a>
          <div class="divider"></div>
          <label class="check"><input type="checkbox" /> Marcar como completada</label>
        </aside>
      </div>`;
    }
  };
})();
