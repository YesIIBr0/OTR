/* OTR LMS · HUB screens: onboarding (perfil por rol), hub home,
   directorio de profesores/programas, perfil público con reviews,
   biblioteca de materiales. */
(function () {
  window.SCREENS = window.SCREENS || {};
  const S = window.SCREENS;

  const stars = (n, size = 14) => {
    let s = '';
    for (let i = 1; i <= 5; i++) {
      const fill = i <= Math.round(n) ? 'var(--otr-sky-lo)' : 'var(--n-200)';
      s += `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${fill}" style="flex:none"><path d="M12 3.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8L12 17l-5.3 2.7 1-5.8L3.5 9.7l5.9-.9z"/></svg>`;
    }
    return `<span style="display:inline-flex;gap:2px;align-items:center">${s}</span>`;
  };
  const teacherOf = (id) => DB.teachers.find(t => t.id === id);

  /* ---- experiencia del estudiante (persistente) ---- */
  const XP_KEY = 'otr_my_experience';
  function getXP() {
    try { return JSON.parse(localStorage.getItem(XP_KEY)) || dfltXP(); } catch (e) { return dfltXP(); }
  }
  function dfltXP() { return { programs: ['pf', 'ora'], goals: ['Perder el miedo escénico', 'Ganar torneos'], schedule: 'Tarde', pace: 'Estándar' }; }
  function setXPstore(v) { try { localStorage.setItem(XP_KEY, JSON.stringify(v)); } catch (e) {} }
  window.__otrXP = { getXP, setXPstore };

  /* ---- programas publicados por profesores (persistentes) ---- */
  try {
    (JSON.parse(localStorage.getItem('otr_pub_programs')) || []).forEach(p => {
      if (!DB.programs.find(x => x.id === p.id)) DB.programs.push(p);
      const t = DB.teachers.find(x => x.id === p.teacher);
      if (t && !t.programIds.includes(p.id)) t.programIds.push(p.id);
    });
  } catch (e) {}

  /* ---- agregar/quitar un programa de mi ruta (compartido) ---- */
  function toggleRoute(pid) {
    const xp = getXP();
    const i = xp.programs.indexOf(pid);
    const added = i < 0;
    added ? xp.programs.push(pid) : xp.programs.splice(i, 1);
    setXPstore(xp);
    const p = DB.programs.find(x => x.id === pid);
    window.toast && window.toast(added ? `${p ? p.name : 'Programa'} agregado a tu ruta ✓` : `${p ? p.name : 'Programa'} quitado de tu ruta`, added ? 'ok' : '');
    return added;
  }
  function wireAddRoute(root, onChange) {
    root.querySelectorAll('.add-route').forEach(b => b.addEventListener('click', (e) => {
      e.stopPropagation();
      const added = toggleRoute(b.dataset.pid);
      b.className = 'btn btn-sm add-route ' + (added ? 'btn-navy' : 'btn-soft');
      b.textContent = added ? '✓ En tu ruta' : '+ Mi ruta';
      if (onChange) onChange();
    }));
  }

  /* ---------------- ONBOARDING (standalone wizard) ---------------- */
  S.onboarding = {
    renderInto(root) {
      const st = { step: 0, role: null, data: {} };
      const G = { goals: [], progs: [], specs: [] };

      function paint() {
        root.innerHTML = `
        <div class="ob">
          <div class="ob-card">
            <div class="ob-head">
              <svg class="crest" style="width:30px;height:34px" viewBox="0 0 26 30" fill="none">
                <path d="M13 1 L24 5.5 V16 C24 23 19 27.5 13 29.5 C7 27.5 2 23 2 16 V5.5 Z" fill="#0C2340"></path>
                <text x="13" y="18.5" font-family="Archivo Expanded" font-weight="900" font-size="8" fill="#fff" text-anchor="middle">OTR</text>
              </svg>
              <div class="ob-dots">${[0,1,2].map(i=>`<span class="${i<=st.step?'on':''}"></span>`).join('')}</div>
              <a href="#login" style="font-size:12.5px">Ya tengo cuenta</a>
            </div>
            <div class="ob-body" id="ob-body">${stepHTML()}</div>
          </div>
        </div>`;
        wire();
      }

      function stepHTML() {
        if (st.step === 0) return `
          <p class="eyebrow">Crea tu perfil</p>
          <h2 class="ob-title">¿Cómo llegas a OTR?</h2>
          <p class="muted" style="margin-bottom:22px">Tu perfil define tu experiencia en el hub.</p>
          <div class="ob-roles">
            <button class="ob-role ${st.role==='student'?'sel':''}" data-role="student">
              <span class="or-ic">🎓</span>
              <b>Soy estudiante</b>
              <span>Quiero entrenar, competir y subir de nivel con una ruta a mi medida.</span>
            </button>
            <button class="ob-role ${st.role==='teacher'?'sel':''}" data-role="teacher">
              <span class="or-ic">🏆</span>
              <b>Soy profesor / coach</b>
              <span>Quiero publicar mis programas, mostrar cómo trabajo y recibir reviews.</span>
            </button>
          </div>`;
        if (st.step === 1 && st.role === 'student') return `
          <p class="eyebrow">Paso 2 · Tu experiencia</p>
          <h2 class="ob-title">Cuéntanos de ti.</h2>
          <div class="grid g-2" style="margin:18px 0">
            <div class="field"><label class="label">Nombre</label><input class="input" id="ob-name" placeholder="Tu nombre" value="${st.data.name||''}"/></div>
            <div class="field"><label class="label">Edad</label><select class="select" id="ob-age"><option>10–12</option><option selected>13–15</option><option>16–18</option><option>18+</option></select></div>
          </div>
          <label class="label" style="margin-bottom:8px;display:block">Tu nivel actual</label>
          <div class="ob-chips" data-group="level">
            ${['Nunca he debatido','Algo de experiencia','Compito en torneos','Varsity / avanzado'].map((l,i)=>`<button class="chip ${st.data.level===l?'active':''}" data-v="${l}">${l}</button>`).join('')}
          </div>
          <label class="label" style="margin:18px 0 8px;display:block">¿Qué quieres lograr? <span class="hint">(elige varias)</span></label>
          <div class="ob-chips" data-group="goals">
            ${['Perder el miedo escénico','Ganar torneos','Hablar con claridad','Prepararme para la universidad','Liderazgo'].map(g=>`<button class="chip ${G.goals.includes(g)?'active':''}" data-v="${g}">${g}</button>`).join('')}
          </div>
          <label class="label" style="margin:18px 0 8px;display:block">Programas que te interesan</label>
          <div class="ob-chips" data-group="progs">
            ${DB.programs.map(p=>`<button class="chip ${G.progs.includes(p.name)?'active':''}" data-v="${p.name}">${p.name}</button>`).join('')}
          </div>`;
        if (st.step === 1 && st.role === 'teacher') return `
          <p class="eyebrow">Paso 2 · Tu perfil de coach</p>
          <h2 class="ob-title">Muestra cómo trabajas.</h2>
          <div class="grid g-2" style="margin:18px 0">
            <div class="field"><label class="label">Nombre</label><input class="input" id="ob-name" placeholder="Coach…" value="${st.data.name||''}"/></div>
            <div class="field"><label class="label">Años de experiencia</label><select class="select" id="ob-age"><option>1–2</option><option selected>3–5</option><option>5+</option></select></div>
          </div>
          <label class="label" style="margin-bottom:8px;display:block">¿Qué enseñas?</label>
          <div class="ob-chips" data-group="specs">
            ${['Public Forum','Lincoln–Douglas','Parliamentary','World Schools','Oratoria','Voz y presencia'].map(s2=>`<button class="chip ${G.specs.includes(s2)?'active':''}" data-v="${s2}">${s2}</button>`).join('')}
          </div>
          <div class="field" style="margin-top:18px"><label class="label">Cómo trabajas (tu método en una línea)</label>
          <textarea class="textarea" id="ob-how" placeholder="Ej: diagnóstico primero, drills bajo presión, feedback después de cada ronda…">${st.data.how||''}</textarea></div>`;
        // step 2 — summary
        const isS = st.role === 'student';
        return `
          <p class="eyebrow">Paso 3 · Listo</p>
          <h2 class="ob-title">${isS ? 'Tu ruta está lista.' : 'Tu perfil está listo.'}</h2>
          <div class="ob-summary">
            <div class="row vcenter" style="gap:12px">
              <span class="avatar lg" style="background:${isS?'var(--otr-sky-lo)':'var(--otr-navy)'}">${(st.data.name||'OT').slice(0,2).toUpperCase()}</span>
              <div><b style="font-size:16px">${st.data.name||'Tu nombre'}</b>
              <div class="muted" style="font-size:13px">${isS ? (st.data.level||'Novato') + ' · ' + (G.goals[0]||'A dominar la sala') : (G.specs.join(' · ')||'Coach OTR')}</div></div>
            </div>
            <div class="divider"></div>
            ${isS
              ? `<div class="row wrap" style="gap:8px">${(G.progs.length?G.progs:['Public Forum I']).map(p=>`<span class="badge sky">${p}</span>`).join('')}</div>
                 <p class="muted" style="font-size:13px;margin-top:12px">Empezarás como <b>Novato</b> — tu diagnóstico de la semana 1 puede subirte de nivel directo.</p>`
              : `<p class="muted" style="font-size:13.5px">${st.data.how||'Tu método aparecerá en tu perfil público.'}</p>
                 <p class="muted" style="font-size:13px;margin-top:10px">Podrás publicar programas y recibir reviews verificadas de tus estudiantes.</p>`}
          </div>`;
      }

      function wire() {
        root.querySelectorAll('.ob-role').forEach(b => b.addEventListener('click', () => { st.role = b.dataset.role; paint(); }));
        root.querySelectorAll('.ob-chips').forEach(grp => {
          const g = grp.dataset.group;
          grp.querySelectorAll('.chip').forEach(c => c.addEventListener('click', () => {
            const v = c.dataset.v;
            if (g === 'level') { st.data.level = v; }
            else { const arr = G[g]; const i = arr.indexOf(v); i >= 0 ? arr.splice(i, 1) : arr.push(v); }
            saveInputs(); paint();
          }));
        });
        const back = root.querySelector('#ob-back'), next = root.querySelector('#ob-next');
        // footer buttons live outside stepHTML — build them
        const body = root.querySelector('#ob-body');
        const foot = document.createElement('div');
        foot.className = 'ob-foot';
        foot.innerHTML = `
          <button class="btn btn-ghost" id="ob-back" ${st.step===0?'style="visibility:hidden"':''}>Atrás</button>
          <button class="btn ${st.step===2?'btn-navy':'btn-primary'}" id="ob-next" ${st.step===0&&!st.role?'disabled':''}>
            ${st.step===2 ? (st.role==='teacher'?'Publicar mi perfil':'Entrar al hub') : 'Continuar →'}</button>`;
        body.appendChild(foot);
        foot.querySelector('#ob-back').addEventListener('click', () => { st.step--; paint(); });
        foot.querySelector('#ob-next').addEventListener('click', () => {
          saveInputs();
          if (st.step < 2) { st.step++; paint(); return; }
          // finish
          try { sessionStorage.setItem('otr_hub_name', st.data.name || ''); } catch (e) {}
          if (st.role === 'student') {
            const ids = DB.programs.filter(p => G.progs.includes(p.name)).map(p => p.id);
            setXPstore({ programs: ids.length ? ids : ['pf'], goals: G.goals.length ? G.goals : ['Dominar la sala'], schedule: 'Tarde', pace: 'Estándar' });
          }
          if (window.OTR) window.OTR.state.role = st.role === 'teacher' ? 'teacher' : 'student';
          location.hash = st.role === 'teacher' ? '#my-programs' : '#hub';
          setTimeout(() => window.toast && window.toast(st.role==='teacher' ? 'Perfil publicado — visible en Explorar' : '¡Bienvenido al hub, ' + (st.data.name||'campeón') + '! 🏆', 'ok'), 400);
        });
      }
      function saveInputs() {
        const n = root.querySelector('#ob-name'); if (n) st.data.name = n.value;
        const h = root.querySelector('#ob-how'); if (h) st.data.how = h.value;
      }
      paint();
    }
  };

  /* ---------------- HUB HOME ---------------- */
  S.hubHome = {
    render(state) {
      const isStudent = !state || state.role !== 'teacher';
      const xp = getXP();
      const myProgs = DB.programs.filter(p => xp.programs.includes(p.id));
      const expCard = isStudent ? `
          <div class="card card-pad" style="border-color:var(--otr-sky)">
            <div class="row between vcenter"><b style="font-size:13.5px">Tu experiencia</b><span class="badge sky">${myProgs.length} programa${myProgs.length===1?'':'s'}</span></div>
            <div class="row wrap" style="gap:6px;margin-top:10px">${myProgs.length ? myProgs.map(p=>`<span class="badge">${p.name}</span>`).join('') : '<span class="faint" style="font-size:12.5px">Aún no armas tu ruta</span>'}</div>
            <button class="btn btn-soft btn-sm btn-block" style="margin-top:12px" onclick="go('my-experience')">${IC.sliders} Personalizar mi ruta</button>
          </div>` : '';
      return `
      <div class="hello-card" style="margin-bottom:18px">
        <div class="h-row">
          <div>
            <p class="eyebrow" style="color:var(--otr-sky-hi)">El hub de la academia</p>
            <h2 class="brand-font">Bienvenida al Hub OTR</h2>
            <p style="color:rgba(234,242,251,.72);font-size:13.5px;margin-top:4px">Eventos, anuncios, materiales y tu comunidad — todo en un lugar.</p>
          </div>
          <div class="row" style="gap:10px">
            <button class="btn btn-primary btn-sm" onclick="go('explore')">Explorar programas</button>
            <button class="btn btn-ghost btn-sm" style="background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.2);color:#fff" onclick="go('library')">Biblioteca</button>
          </div>
        </div>
      </div>

      <div class="split" style="grid-template-columns:1fr 320px">
        <div class="stack" style="gap:14px">
          ${DB.hubFeed.map(f=>`
            <div class="card card-pad feed-item">
              <div class="row" style="gap:14px;align-items:flex-start">
                <div class="notif-ic ${f.tone}" style="width:40px;height:40px;border-radius:11px">${IC[f.ic]}</div>
                <div style="flex:1;min-width:0">
                  <div class="row between vcenter" style="gap:10px"><b style="font-size:14.5px">${f.t}</b><span class="faint" style="font-size:12px;white-space:nowrap">${f.when}</span></div>
                  <p class="muted" style="font-size:13.5px;margin-top:4px">${f.d}</p>
                  ${f.cta?`<button class="btn btn-soft btn-sm" style="margin-top:10px" data-toast="ok::¡Listo! Te llegará la confirmación">${f.cta}</button>`:''}
                </div>
              </div>
            </div>`).join('')}
        </div>

        <div class="stack" style="gap:16px">
          ${expCard}
          <div class="card card-pad">
            <b style="font-size:13.5px">Tus coaches</b>
            <div class="stack" style="gap:4px;margin-top:10px">
              ${DB.teachers.map(t=>`
                <div class="lrow" style="padding:9px 0;cursor:pointer;border-bottom:1px solid var(--border)" onclick="go('teacher-${t.id}')">
                  ${C.avatar(t.ini,{size:'sm',bg:'var(--otr-navy)'})}
                  <div style="flex:1;min-width:0"><div style="font-weight:600;font-size:13px">${t.name}</div>
                  <div class="row vcenter" style="gap:5px">${stars(t.rating,11)}<span class="faint" style="font-size:11.5px">${t.rating} · ${t.reviews} reviews</span></div></div>
                  ${IC.chevR}
                </div>`).join('')}
            </div>
            <button class="btn btn-ghost btn-sm btn-block" style="margin-top:10px" onclick="go('explore')">Ver todos</button>
          </div>
          <div class="card card-pad" style="background:linear-gradient(140deg,var(--otr-pale),#fff)">
            <b style="font-size:13.5px">Red OTR de por vida</b>
            <p class="muted" style="font-size:12.5px;margin-top:6px">Graduarte de OTR significa acceso de por vida a coaches, competidores, mentores y conexiones internacionales.</p>
            <div class="avatar-stack" style="margin-top:12px">${['IR','JS','AS','VC'].map(x=>C.avatar(x,{size:'sm'})).join('')}<span class="avatar sm" style="background:var(--n-200);color:var(--text-2)">+60</span></div>
          </div>
        </div>
      </div>`;
    }
  };

  /* ---------------- EXPLORAR (directorio) ---------------- */
  S.explore = {
    render() {
      return `
      <div class="page-head"><div><div class="page-title">Explorar</div>
      <div class="page-sub">Profesores y programas de la academia — elige con quién y cómo entrenar</div></div></div>

      <div class="row" style="gap:8px;margin-bottom:18px;flex-wrap:wrap" id="ex-filters">
        ${['Todos','Public Forum','Lincoln–Douglas','Oratoria','Parliamentary','World Schools','Intensivos'].map((f,i)=>`<button class="chip ${i===0?'active':''}" data-f="${f}">${f}</button>`).join('')}
      </div>

      <b style="font-size:14px;display:block;margin-bottom:12px">Coaches</b>
      <div class="grid g-3" style="margin-bottom:26px">
        ${DB.teachers.map(t=>`
          <div class="tile click teacher-card" onclick="go('teacher-${t.id}')">
            <div class="row" style="gap:12px">
              ${C.avatar(t.ini,{size:'lg',bg:'var(--otr-navy)'})}
              <div style="min-width:0"><b style="font-size:14.5px">${t.name}</b>
                <div class="muted" style="font-size:12px;margin-top:2px">${t.tagline}</div>
                <div class="row vcenter" style="gap:6px;margin-top:5px">${stars(t.rating,12)}<b style="font-size:12.5px">${t.rating}</b><span class="faint" style="font-size:12px">(${t.reviews})</span></div>
              </div>
            </div>
            <div class="row wrap" style="gap:6px;margin-top:12px">${t.specialties.slice(0,3).map(s2=>`<span class="badge">${s2}</span>`).join('')}</div>
            <div class="divider" style="margin:12px 0"></div>
            <div class="row between vcenter"><span class="faint" style="font-size:12px">${t.students}+ estudiantes</span><span class="sky" style="font-size:12.5px;font-weight:600">Ver perfil →</span></div>
          </div>`).join('')}
      </div>

      <b style="font-size:14px;display:block;margin-bottom:12px">Programas</b>
      <div class="grid g-3" id="ex-programs">
        ${DB.programs.map(p=>{ const t=teacherOf(p.teacher); return `
          <div class="tile click program-card" data-tags="${p.name} ${p.type}" onclick="go('teacher-${t.id}')">
            ${p.tag?`<span class="badge navy" style="position:absolute;top:-9px;left:14px">${p.tag}</span>`:''}
            <div class="row between vcenter"><b style="font-size:15px">${p.name}</b><span class="badge sky">${p.type}</span></div>
            <p class="muted" style="font-size:13px;margin:8px 0 12px">${p.desc}</p>
            <div class="row vcenter" style="gap:8px;font-size:12px;color:var(--text-2)">
              ${C.avatar(t.ini,{size:'sm',bg:'var(--otr-navy)'})}<span>${t.name.replace('Coach ','')}</span>
              <span class="dot-sep"></span><span>${p.cadence}</span>
            </div>
            <div class="divider" style="margin:12px 0"></div>
            <div class="row between vcenter">
              <span class="faint" style="font-size:12px">${p.level} · ${p.seats} cupos</span>
              <button class="btn btn-sm add-route ${getXP().programs.includes(p.id)?'btn-navy':'btn-soft'}" data-pid="${p.id}">${getXP().programs.includes(p.id)?'✓ En tu ruta':'+ Mi ruta'}</button>
            </div>
          </div>`; }).join('')}
      </div>`;
    },
    mount(root) {
      wireAddRoute(root);
      root.querySelectorAll('#ex-filters .chip').forEach(c => c.addEventListener('click', () => {
        root.querySelectorAll('#ex-filters .chip').forEach(x=>x.classList.remove('active'));
        c.classList.add('active');
        const f = c.dataset.f;
        root.querySelectorAll('.program-card').forEach(p => {
          const show = f==='Todos' || p.dataset.tags.toLowerCase().includes(f.toLowerCase().replace('intensivos','intensivo'));
          p.style.display = show ? '' : 'none';
        });
      }));
    }
  };

  /* ---------------- PERFIL PÚBLICO DEL PROFESOR ---------------- */
  function teacherScreen(t) {
    return {
      render(state) {
        const role = state ? state.role : 'student';
        const xp = getXP();
        const enrolled = t.programIds.some(id => xp.programs.includes(id));
        const canReview = role === 'student' && enrolled;
        return `
        <button class="btn btn-ghost btn-sm" style="margin-bottom:14px" onclick="go('explore')">${IC.chevL} Explorar</button>
        <div class="card card-pad" style="margin-bottom:18px">
          <div class="profile-head">
            ${C.avatar(t.ini,{size:'xl',bg:'var(--otr-navy)'})}
            <div style="flex:1;min-width:220px">
              <div class="row vcenter" style="gap:10px;flex-wrap:wrap"><h2 style="font-size:22px;font-weight:750">${t.name}</h2>${C.badge('Coach verificado','navy')}</div>
              <div class="muted" style="font-size:13.5px;margin-top:3px">${t.tagline}</div>
              <div class="row vcenter" style="gap:8px;margin-top:8px">${stars(t.rating,15)}<b>${t.rating}</b><span class="faint">· ${t.reviews} reviews · ${t.students}+ estudiantes</span></div>
              <div class="row wrap" style="gap:6px;margin-top:12px">${t.specialties.map(s2=>`<span class="badge sky">${s2}</span>`).join('')}</div>
            </div>
            <div class="stack" style="gap:8px">
              <button class="btn btn-primary" id="tp-enroll">${enrolled ? '✓ Entrenando con ' + t.name.split(' ')[1] : 'Entrenar con ' + t.name.split(' ')[1]}</button>
              <button class="btn btn-ghost btn-sm" onclick="go('messages')">${IC.msg} Mensaje</button>
            </div>
          </div>
        </div>

        <div class="split" style="grid-template-columns:1fr 340px">
          <div class="stack" style="gap:16px">
            <div class="card card-pad">
              <b style="font-size:14px">Sobre mí</b>
              <p class="muted" style="font-size:14px;line-height:1.6;margin-top:8px">${t.bio}</p>
              <div class="row vcenter" style="gap:8px;margin-top:12px">${IC.trophy}<span style="font-size:13px;font-weight:600">${t.wins}</span></div>
            </div>
            <div class="card card-pad">
              <b style="font-size:14px">Cómo trabajo</b>
              <div class="stack" style="gap:10px;margin-top:12px">
                ${t.how.map((h,i)=>`<div class="row" style="gap:12px"><span style="width:24px;height:24px;border-radius:7px;background:var(--otr-pale);color:var(--action-hover);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;flex:none">${i+1}</span><span style="font-size:13.5px">${h}</span></div>`).join('')}
              </div>
            </div>
            <div class="card">
              <div class="card-head"><h3>Reviews</h3><div class="row vcenter" style="gap:6px">${stars(t.rating,13)}<b style="font-size:13px">${t.rating}</b></div></div>
              <div class="card-body" id="rev-list" style="padding:8px 18px">
                ${t.reviewList.map(r=>`
                  <div class="review-row">
                    ${C.avatar(r.ini,{size:'sm'})}
                    <div style="flex:1;min-width:0">
                      <div class="row vcenter" style="gap:8px;flex-wrap:wrap"><b style="font-size:13px">${r.who}</b>${stars(r.stars,11)}<span class="faint" style="font-size:11.5px">${r.when}</span></div>
                      <p class="muted" style="font-size:13px;margin-top:4px">${r.text}</p>
                    </div>
                  </div>`).join('')}
              </div>
              <div class="card-body" style="border-top:1px solid var(--border)">
                ${canReview ? `
                <b style="font-size:13px">Deja tu review</b>
                <div class="row vcenter" style="gap:3px;margin:10px 0" id="rate-pick">
                  ${[1,2,3,4,5].map(i=>`<button class="rate-star" data-s="${i}" aria-label="${i} estrellas"><svg width="22" height="22" viewBox="0 0 24 24" fill="var(--n-200)"><path d="M12 3.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8L12 17l-5.3 2.7 1-5.8L3.5 9.7l5.9-.9z"/></svg></button>`).join('')}
                </div>
                <textarea class="textarea" id="rev-text" placeholder="¿Cómo fue entrenar con ${t.name.split(' ')[1]}?"></textarea>
                <button class="btn btn-primary btn-sm" style="margin-top:10px" id="rev-send">Publicar review</button>`
                : `
                <div class="row" style="gap:12px;align-items:flex-start">
                  <span style="display:flex;color:var(--text-3);margin-top:2px">${IC.lock}</span>
                  <div style="flex:1">
                    <b style="font-size:13px">Reviews verificadas</b>
                    <p class="muted" style="font-size:12.5px;margin-top:4px">${role==='teacher' ? 'Los coaches no pueden dejarse reviews entre sí.' : `Solo estudiantes con un programa activo de ${t.name.split(' ')[1]} pueden dejar review.`}</p>
                    ${role==='teacher' ? '' : `<button class="btn btn-soft btn-sm" style="margin-top:10px" id="tp-enroll-2">+ Agregar uno de sus programas</button>`}
                  </div>
                </div>`}
              </div>
            </div>
          </div>

          <div class="stack" style="gap:16px">
            <div class="card card-pad">
              <b style="font-size:13.5px">Sus programas</b>
              <div class="stack" style="gap:10px;margin-top:12px">
                ${t.programIds.map(pid=>{ const p=DB.programs.find(x=>x.id===pid); if(!p) return ''; const inR=getXP().programs.includes(p.id); return `
                  <div class="mini-program">
                    <div class="row between vcenter"><b style="font-size:13px">${p.name}</b><span class="badge">${p.type}</span></div>
                    <div class="faint" style="font-size:12px;margin-top:3px">${p.cadence} · ${p.level} · ${p.seats} cupos</div>
                    <button class="btn btn-sm add-route ${inR?'btn-navy':'btn-soft'}" style="margin-top:9px" data-pid="${p.id}">${inR?'✓ En tu ruta':'+ Mi ruta'}</button>
                  </div>`; }).join('')}
              </div>
            </div>
            <div class="alert info"><span class="ai">${IC.checkCircle}</span><div><div class="at">Reviews verificadas</div>Solo estudiantes y padres con programas activos pueden publicar.</div></div>
          </div>
        </div>`;
      },
      mount(root, state) {
        const repaint = () => {
          const page = root.querySelector('.page');
          page.innerHTML = this.render(state);
          this.mount(root, state);
        };
        wireAddRoute(root, repaint);
        const enroll = (e) => {
          const xp = getXP();
          const firstFree = t.programIds.find(id => !xp.programs.includes(id));
          if (firstFree) { toggleRoute(firstFree); repaint(); }
          else { window.toast && window.toast('Ya entrenas con ' + t.name.split(' ')[1] + ' — revisa Mi experiencia', 'ok'); }
        };
        const e1 = root.querySelector('#tp-enroll'); if (e1) e1.addEventListener('click', enroll);
        const e2 = root.querySelector('#tp-enroll-2'); if (e2) e2.addEventListener('click', enroll);
        const send = root.querySelector('#rev-send');
        if (!send) return;
        let rating = 0;
        const paintStars = () => root.querySelectorAll('.rate-star svg').forEach((s,i)=>s.setAttribute('fill', i < rating ? 'var(--otr-sky-lo)' : 'var(--n-200)'));
        root.querySelectorAll('.rate-star').forEach(b => b.addEventListener('click', () => { rating = +b.dataset.s; paintStars(); }));
        root.querySelector('#rev-send').addEventListener('click', () => {
          const txt = root.querySelector('#rev-text');
          if (!rating) { window.toast && window.toast('warn::Elige una calificación de estrellas'.split('::')[1], 'warn'); return; }
          if (!txt.value.trim()) { txt.classList.add('err'); txt.focus(); return; }
          const me = (window.OTR && window.OTR.state.role === 'teacher') ? DB.teacher : DB.me;
          const div = document.createElement('div');
          div.className = 'review-row';
          div.innerHTML = `${C.avatar(me.initials,{size:'sm'})}
            <div style="flex:1"><div class="row vcenter" style="gap:8px"><b style="font-size:13px">${me.name}</b>${stars(rating,11)}<span class="faint" style="font-size:11.5px">ahora</span></div>
            <p class="muted" style="font-size:13px;margin-top:4px">${txt.value}</p></div>`;
          root.querySelector('#rev-list').prepend(div);
          txt.value = ''; txt.classList.remove('err'); rating = 0; paintStars();
          window.toast && window.toast('Review publicada ✓', 'ok');
        });
      }
    };
  }
  DB.teachers.forEach(t => { S['teacher_' + t.id] = teacherScreen(t); });

  /* ---------------- MI EXPERIENCIA (estudiante · customizable) ---------------- */
  S.myExperience = {
    render() {
      const xp = getXP();
      const sessions = { 'Ligero': 1, 'Estándar': 2, 'Intensivo': 3 }[xp.pace] || 2;
      const active = DB.programs.filter(p => xp.programs.includes(p.id));
      const coaches = [...new Set(active.map(p => p.teacher))].map(teacherOf).filter(Boolean);
      return `
      <div class="page-head"><div><div class="page-title">Mi experiencia</div>
      <div class="page-sub">Tu academia, a tu medida — tú eliges qué entrenar, con quién y a qué ritmo</div></div>
      <span class="badge sky">Se guarda automáticamente</span></div>

      <div class="split" style="grid-template-columns:1fr 320px">
        <div class="stack" style="gap:18px">
          <div>
            <b style="font-size:14px;display:block;margin-bottom:10px">Tus programas <span class="faint" style="font-weight:450">· toca para agregar o quitar</span></b>
            <div class="grid g-2">
              ${DB.programs.map(p => { const on = xp.programs.includes(p.id); const t = teacherOf(p.teacher); return `
                <div class="tile xp-prog ${on ? 'on' : ''}" data-pid="${p.id}" role="button" tabindex="0">
                  <div class="row between vcenter"><b style="font-size:14px">${p.name}</b>
                    <span class="xp-check ${on ? 'on' : ''}">${on ? IC.check : IC.plus}</span></div>
                  <div class="faint" style="font-size:12px;margin-top:4px">${t.name.replace('Coach ','')} · ${p.cadence} · ${p.level}</div>
                </div>`; }).join('')}
            </div>
          </div>

          <div class="card card-pad">
            <b style="font-size:14px">Tu ritmo</b>
            <div class="seg" style="margin-top:10px" id="xp-pace">
              ${['Ligero','Estándar','Intensivo'].map(v=>`<button class="${xp.pace===v?'on':''}" data-v="${v}">${v}</button>`).join('')}
            </div>
            <div class="divider"></div>
            <b style="font-size:14px">Tu horario preferido</b>
            <div class="row wrap" style="gap:8px;margin-top:10px" id="xp-sched">
              ${['Tarde','Noche','Sábado'].map(v=>`<button class="chip ${xp.schedule===v?'active':''}" data-v="${v}">${v}</button>`).join('')}
            </div>
            <div class="divider"></div>
            <b style="font-size:14px">Tus metas</b>
            <div class="row wrap" style="gap:8px;margin-top:10px" id="xp-goals">
              ${['Perder el miedo escénico','Ganar torneos','Hablar con claridad','Prepararme para la universidad','Liderazgo'].map(g=>`<button class="chip ${xp.goals.includes(g)?'active':''}" data-v="${g}">${g}</button>`).join('')}
            </div>
          </div>
        </div>

        <div class="stack" style="gap:16px">
          <div class="card card-pad" style="background:linear-gradient(150deg,var(--otr-navy),var(--otr-ink));color:#fff">
            <b style="font-size:13.5px;color:var(--otr-sky-hi)">Tu semana quedaría así</b>
            <div class="brand-font" style="font-size:30px;font-weight:800;margin-top:10px">${active.length ? active.length * sessions : 0} <span style="font-size:14px;font-weight:600;opacity:.7">sesiones/sem</span></div>
            <div style="font-size:12.5px;opacity:.75;margin-top:4px">${active.length} programa${active.length===1?'':'s'} · ritmo ${xp.pace.toLowerCase()} · horario: ${xp.schedule.toLowerCase()}</div>
            <div class="divider" style="background:rgba(255,255,255,.14)"></div>
            <b style="font-size:12.5px;color:var(--otr-sky-hi)">Tus coaches</b>
            <div class="stack" style="gap:8px;margin-top:10px">
              ${coaches.length ? coaches.map(t=>`<div class="row vcenter" style="gap:9px">${C.avatar(t.ini,{size:'sm',bg:'rgba(255,255,255,.15)'})}<span style="font-size:12.5px">${t.name}</span></div>`).join('') : '<span style="font-size:12.5px;opacity:.6">Agrega un programa para ver tus coaches</span>'}
            </div>
          </div>
          <div class="alert info"><span class="ai">${IC.target}</span><div><div class="at">Tu ruta es tuya</div>Cámbiala cuando quieras — tu coach la ve y ajusta el plan contigo.</div></div>
          <button class="btn btn-primary btn-block" data-toast="ok::Experiencia guardada — tu coach fue notificado">Confirmar mi ruta</button>
        </div>
      </div>`;
    },
    mount(root, state) {
      const repaint = () => {
        const page = root.querySelector('.page');
        page.innerHTML = S.myExperience.render(state);
        S.myExperience.mount(root, state);
      };
      root.querySelectorAll('.xp-prog').forEach(el => el.addEventListener('click', () => {
        const xp = getXP(); const id = el.dataset.pid;
        const i = xp.programs.indexOf(id);
        i >= 0 ? xp.programs.splice(i, 1) : xp.programs.push(id);
        setXPstore(xp); repaint();
      }));
      root.querySelectorAll('#xp-pace button').forEach(b => b.addEventListener('click', () => {
        const xp = getXP(); xp.pace = b.dataset.v; setXPstore(xp); repaint();
      }));
      root.querySelectorAll('#xp-sched .chip').forEach(b => b.addEventListener('click', () => {
        const xp = getXP(); xp.schedule = b.dataset.v; setXPstore(xp); repaint();
      }));
      root.querySelectorAll('#xp-goals .chip').forEach(b => b.addEventListener('click', () => {
        const xp = getXP(); const v = b.dataset.v;
        const i = xp.goals.indexOf(v); i >= 0 ? xp.goals.splice(i, 1) : xp.goals.push(v);
        setXPstore(xp); repaint();
      }));
    }
  };

  /* ---------------- MIS PROGRAMAS (profesor · publica tu oferta) ---------------- */
  S.myPrograms = {
    render() {
      const mine = DB.programs.filter(p => p.teacher === 'saul');
      return `
      <div class="page-head"><div><div class="page-title">Mis programas</div>
      <div class="page-sub">Publica tu oferta — los estudiantes la ven en Explorar y se inscriben desde tu perfil</div></div>
      <button class="btn btn-ghost btn-sm" onclick="go('teacher-saul')">${IC.eye} Ver mi perfil público</button></div>

      <div class="split" style="grid-template-columns:1fr 380px">
        <div>
          <b style="font-size:14px;display:block;margin-bottom:12px">Publicados (${mine.length})</b>
          <div class="stack" style="gap:12px" id="mp-list">
            ${mine.map(p=>`
              <div class="card card-pad">
                <div class="row between vcenter" style="flex-wrap:wrap;gap:8px">
                  <div><b style="font-size:14.5px">${p.name}</b>
                  <div class="faint" style="font-size:12.5px;margin-top:3px">${p.type} · ${p.cadence} · ${p.level} · ${p.seats} cupos</div></div>
                  <div class="row" style="gap:6px">${p.tag?`<span class="badge navy">${p.tag}</span>`:''}<span class="badge ok"><span class="dot"></span>Activo</span></div>
                </div>
              </div>`).join('')}
          </div>
        </div>

        <div class="card">
          <div class="card-head"><h3>Publicar nuevo programa</h3></div>
          <div class="card-body stack" style="gap:13px">
            <div class="field"><label class="label">Nombre <span class="req">*</span></label><input class="input" id="np-name" placeholder="Ej: Crossfire Bootcamp"/></div>
            <div class="grid g-2" style="gap:12px">
              <div class="field"><label class="label">Formato</label><select class="select" id="np-type"><option>Grupal</option><option>1-a-1</option><option>Intensivo</option></select></div>
              <div class="field"><label class="label">Nivel</label><select class="select" id="np-level"><option>Todos</option><option>Novato–JV</option><option>JV–Varsity</option><option>Varsity</option></select></div>
            </div>
            <div class="grid g-2" style="gap:12px">
              <div class="field"><label class="label">Cadencia</label><input class="input" id="np-cad" placeholder="2 sesiones/sem"/></div>
              <div class="field"><label class="label">Cupos</label><input class="input" id="np-seats" type="number" value="6" min="1" max="20"/></div>
            </div>
            <div class="field"><label class="label">Descripción <span class="req">*</span></label><textarea class="textarea" id="np-desc" placeholder="¿Qué aprende el estudiante y cómo trabajas?"></textarea></div>
            <button class="btn btn-primary btn-block" id="np-pub">Publicar programa</button>
            <p class="faint" style="font-size:11.5px;text-align:center">Aparecerá en Explorar y en tu perfil público al instante.</p>
          </div>
        </div>
      </div>`;
    },
    mount(root, state) {
      root.querySelector('#np-pub').addEventListener('click', () => {
        const name = root.querySelector('#np-name'), desc = root.querySelector('#np-desc');
        let ok = true;
        [name, desc].forEach(f => { if (!f.value.trim()) { f.classList.add('err'); ok = false; } else f.classList.remove('err'); });
        if (!ok) { window.toast && window.toast('Completa nombre y descripción', 'warn'); return; }
        const p = {
          id: 'p' + Date.now(), name: name.value.trim(), teacher: 'saul',
          type: root.querySelector('#np-type').value, cadence: root.querySelector('#np-cad').value.trim() || '1 sesión/sem',
          level: root.querySelector('#np-level').value, seats: parseInt(root.querySelector('#np-seats').value, 10) || 6,
          desc: desc.value.trim(), tag: 'Nuevo'
        };
        DB.programs.push(p);
        const t = teacherOf('saul'); if (t && !t.programIds.includes(p.id)) t.programIds.push(p.id);
        try {
          const stored = JSON.parse(localStorage.getItem('otr_pub_programs')) || [];
          stored.push(p); localStorage.setItem('otr_pub_programs', JSON.stringify(stored));
        } catch (e) {}
        const page = root.querySelector('.page');
        page.innerHTML = S.myPrograms.render(state);
        S.myPrograms.mount(root, state);
        window.toast && window.toast('Programa publicado — ya es visible en Explorar ✓', 'ok');
      });
    }
  };

  /* ---------------- BIBLIOTECA DE MATERIALES ---------------- */
  S.library = {
    render() {
      const fmtIc = { PDF:'doc', Video:'play', Audio:'headset', Drive:'file' };
      return `
      <div class="page-head"><div><div class="page-title">Biblioteca</div>
      <div class="page-sub">Todo el material de la academia — plantillas, guías, evidencia y rondas grabadas</div></div>
      <span class="badge sky">${DB.materials.length} recursos</span></div>

      <div class="row" style="gap:8px;margin-bottom:16px;flex-wrap:wrap" id="lib-filters">
        ${['Todos','Plantilla','Guía','Evidencia','Video'].map((f,i)=>`<button class="chip ${i===0?'active':''}" data-f="${f}">${f==='Todos'?f:f+'s'}</button>`).join('')}
      </div>

      <div class="grid g-2" id="lib-grid">
        ${DB.materials.map(m=>`
          <div class="tile lib-item" data-type="${m.type}">
            <div class="row" style="gap:13px;align-items:flex-start">
              <div class="mi-ic" style="width:38px;height:38px;border-radius:10px;background:var(--otr-pale);color:var(--action-hover)">${IC[fmtIc[m.fmt]||'doc']}</div>
              <div style="flex:1;min-width:0">
                <div class="row vcenter" style="gap:8px;flex-wrap:wrap"><b style="font-size:13.5px">${m.t}</b>${m.hot?'<span class="badge warn">🔥 Popular</span>':''}</div>
                <div class="faint" style="font-size:12px;margin-top:3px">${m.type} · ${m.fmt} · ${m.meta}</div>
              </div>
              <button class="btn btn-soft btn-sm" data-toast="ok::Descargando — disponible sin conexión">${IC.download}</button>
            </div>
          </div>`).join('')}
      </div>
      <div class="alert info" style="margin-top:18px"><span class="ai">${IC.lock}</span><div><div class="at">Material exclusivo de la academia</div>El acceso es parte de tu membresía — compartirlo fuera de OTR rompe el código de honor.</div></div>`;
    },
    mount(root) {
      root.querySelectorAll('#lib-filters .chip').forEach(c => c.addEventListener('click', () => {
        root.querySelectorAll('#lib-filters .chip').forEach(x=>x.classList.remove('active'));
        c.classList.add('active');
        const f = c.dataset.f;
        root.querySelectorAll('.lib-item').forEach(it => { it.style.display = (f==='Todos'||it.dataset.type===f) ? '' : 'none'; });
      }));
    }
  };
})();
