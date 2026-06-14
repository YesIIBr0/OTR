// @ts-nocheck
import { DB } from "./data";
import { C } from "./components";
import { IC } from "./icons";
import { esc } from "./esc";
export const S = {};

  /* ---------------- helpers de reseñas ---------------- */
  // Fila de estrellas SOLO de lectura (rating 0-5). Rellenas hasta `rating`.
  const starsRO = (rating) => {
    const r = Math.round(Number(rating) || 0);
    return `<span class="stars-ro" style="display:inline-flex;gap:2px;color:var(--otr-sky)">${
      Array.from({ length: 5 }, (_, i) =>
        `<span style="display:inline-flex;${i < r ? '' : 'opacity:.25'}">${IC.star}</span>`
      ).join('')
    }</span>`;
  };
  // Tarjeta de una reseña individual.
  const reviewCard = (rv, opts = {}) => `
    <div class="card card-pad" style="padding:15px 16px;background:var(--otr-offwhite);border-color:transparent">
      <div class="row vcenter between" style="gap:10px">
        <div class="row vcenter" style="gap:11px;min-width:0">
          ${C.avatar(esc(rv.ini), { size: 'sm', bg: 'var(--otr-sky-lo)' })}
          <div style="min-width:0"><div style="font-weight:700;font-size:13.5px;line-height:1.2">${esc(rv.author)}</div>
          <div class="faint" style="font-size:11.5px;margin-top:2px">${esc(rv.when)}${opts.showProgram && rv.programName ? ` · ${esc(rv.programName)}` : ''}</div></div>
        </div>
        ${starsRO(rv.rating)}
      </div>
      ${rv.body ? `<p class="muted" style="font-size:13.5px;line-height:1.55;margin-top:11px;white-space:pre-wrap">${esc(rv.body)}</p>` : ''}
    </div>`;
  // Tarjeta de un programa (course) — usada en perfiles de coach.
  const programCard = (p) => `
    <div class="card card-pad" style="border-top:3px solid ${p.color || 'var(--otr-sky)'}">
      <div class="row vcenter between" style="gap:8px;flex-wrap:wrap">
        <div class="row vcenter" style="gap:9px;min-width:0">${C.courseDot(p.color || 'var(--otr-sky)')}<b style="font-size:14.5px;line-height:1.2">${esc(p.name)}</b></div>
        ${p.code ? `<span class="mono faint" style="font-size:11.5px">${esc(p.code)}</span>` : ''}
      </div>
      ${p.summary ? `<p class="muted" style="font-size:13px;line-height:1.5;margin-top:8px">${esc(p.summary)}</p>` : ''}
      <div class="row wrap" style="gap:6px;margin-top:11px">
        ${p.format ? C.badge(esc(p.format), 'sky') : ''}
        ${p.modality ? C.badge(esc(p.modality), 'navy') : ''}
      </div>
      ${p.price != null ? `<div class="divider" style="margin:12px 0 0"></div><div class="row between vcenter" style="margin-top:12px">
        <span class="brand-font" style="font-size:19px;font-weight:800;color:var(--text)">${typeof p.price === 'number' ? '$' + (p.price / 100).toLocaleString('es') : esc(p.price)}</span>
        <button class="btn btn-ghost btn-sm" onclick="go('catalog')">Ver programa ${IC.chevR}</button>
      </div>` : ''}
    </div>`;
  // Chips a partir de una lista de formatos (array de strings).
  const formatChips = (list) => (Array.isArray(list) ? list : [])
    .filter(Boolean)
    .map((f) => `<span class="chip soft">${esc(f)}</span>`).join('');

  /* ---------------- PROGRESO / NIVELES ---------------- */
  S.progress = {
    render() {
      // [fix de-mock] TODO dinámico desde los datos REALES del usuario.
      // (Antes estaba hardcodeado a 'Varsity' + racha de 12 + 3 eventos falsos.)
      const levels = DB.levels || [];
      const curName = (DB.me && DB.me.level) || (levels[0] && levels[0].name) || 'Novato';
      let curIndex = levels.findIndex((l) => (l.name || '').toLowerCase() === String(curName).toLowerCase());
      if (curIndex < 0) curIndex = 0;
      const nextLevel = levels[curIndex + 1] || null;
      const xp = Number(DB.xp) || 0;
      const xpStart = Number(DB.xpLevelStart) || 0;
      const xpNext = Number(DB.xpNext) || xpStart;
      const toNext = Math.max(0, xpNext - xp);
      const pct = xpNext > xpStart ? Math.round(((xp - xpStart) / (xpNext - xpStart)) * 100) : 100;
      const streak = Number(DB.me && DB.me.streak) || 0;
      const recent = (DB.activity || []).slice(0, 4); // eventos REALES (DB.activity ya viene escapado)
      // Las 6 dimensiones del radar OTR, en orden fijo. Se leen de DB.skills (del estudiante).
      const SKILL_DIMS = ['Confianza','Estructura','Evidencia','Refutación','Cross-ex','Delivery'];
      const skillMap = {};
      (DB.skills || []).forEach((s) => { skillMap[s.skill] = Math.max(0, Math.min(100, Number(s.score) || 0)); });
      const hasSkills = (DB.skills || []).length > 0;
      const comps = SKILL_DIMS.map((name) => [name, skillMap[name] != null ? skillMap[name] : 0]);
      return `
      <div class="page-head fade-up" style="--d:0"><div><div class="page-title">Progreso y niveles</div>
      <div class="page-sub">Tu camino de Novato a Elite en el sistema OTR</div></div>
      ${C.levelBadge(curName)}</div>

      <div class="card card-pad fade-up" style="--d:1;margin-bottom:18px">
        <div class="level-track">
          ${levels.map((l, i) => {
            const cur = i === curIndex, done = i < curIndex, locked = i > curIndex;
            return `<div class="level-node ${cur?'cur':''} ${locked?'locked':''}">
              <div class="ln-badge" style="background:${cur?'linear-gradient(135deg,var(--otr-sky),var(--otr-sky-lo))':done?'linear-gradient(135deg,#B4B4A7,#89897D)':'linear-gradient(135deg,'+l.color+','+l.color+')'}">${esc((l.name||'')[0])}</div>
              <div class="ln-name">${esc(l.name)}${done?` <span style="display:inline-flex;width:14px;height:14px;color:var(--ok);vertical-align:-2px">${IC.check}</span>`:''}</div>
              <div class="ln-range">${esc(l.range)}</div>
            </div>`;
          }).join('')}
        </div>
      </div>

      <div class="split fade-up rail-320" style="--d:2">
        <div class="card card-pad">
          <div class="row between vcenter"><div><div class="eyebrow" style="margin-bottom:2px">Tu progreso</div><b style="font-size:15px">${nextLevel ? 'Camino a ' + esc(nextLevel.name) : 'Nivel máximo'}</b></div><span class="muted tnum" style="font-size:13px">${xp.toLocaleString('es')} / ${xpNext.toLocaleString('es')} XP</span></div>
          <div style="margin:14px 0 7px">${C.bar(pct,{cls:'thick navy'})}</div>
          <div class="row between" style="font-size:12px;color:var(--text-2)"><span class="badge sky">${esc(curName)}</span><span class="tnum">${nextLevel ? toNext.toLocaleString('es') + ' XP para ' + esc(nextLevel.name) : '¡Nivel máximo alcanzado!'}</span></div>

          <div class="divider"></div>
          <div class="row between vcenter" style="margin-bottom:4px">
            <div><div class="eyebrow" style="margin-bottom:2px">Radar OTR</div><b style="font-size:14px">Competencias</b></div>
            ${hasSkills ? `<span class="badge sky">${Math.round(comps.reduce((a,c)=>a+c[1],0)/comps.length)} prom.</span>` : ''}
          </div>
          ${hasSkills
            ? `<div style="margin-top:6px">
            ${comps.map(c=>`<div class="comp-row"><span class="cr-name">${c[1]>=85?`<span style="display:inline-flex;width:13px;height:13px;color:var(--ok);vertical-align:-2px">${IC.star}</span> `:''}${c[0]}</span><span class="cr-bar">${C.bar(c[1],{cls:'navy'})}</span><span class="cr-score" style="color:${c[1]>=85?'var(--ok)':c[1]>=75?'var(--text)':'var(--warn)'}">${c[1]}</span></div>`).join('')}
          </div>`
            : `<div class="empty" style="padding:26px;margin-top:8px"><div class="ill">${IC.award}</div><h4>Aún sin evaluación</h4><p>Tu coach evaluará tus 6 habilidades: Confianza, Estructura, Evidencia, Refutación, Cross-ex y Delivery.</p></div>`}
        </div>

        <div class="stack" style="gap:16px">
          <div class="card card-pad" style="text-align:center">
            <div class="eyebrow" style="margin-bottom:10px">Racha</div>
            <span class="streak" style="font-size:14px">${IC.flame} ${streak} días</span>
            <div style="margin-top:10px;font-size:12.5px" class="muted">Racha de entrenamiento. ¡No la rompas!</div>
            <div class="row wrap" style="gap:5px;margin-top:14px;justify-content:center">
              ${Array.from({length:14},(_,i)=>`<span style="width:15px;height:15px;border-radius:4px;background:${i<Math.min(streak,14)?'var(--otr-sky)':'var(--n-150)'}"></span>`).join('')}
            </div>
          </div>
          <div class="card">
            <div class="card-head"><h3>Subidas recientes</h3></div>
            <div class="card-body" style="padding:8px 16px 12px">
              ${recent.length ? recent.map(ev=>`
                <div class="agenda-item"><span class="when-dot" style="background:var(--otr-gold)"></span>
                <div><div class="ai-t">${ev.title || ''}</div>${ev.xp ? `<div class="ai-c sky">+${ev.xp} XP</div>` : (ev.detail ? `<div class="ai-c sky">${ev.detail}</div>` : '')}</div><span class="ai-w">${ev.when || ''}</span></div>`).join('')
                : `<div class="empty" style="padding:22px"><p class="muted" style="font-size:13px;text-align:center">Aún sin actividad — completa lecciones, exámenes y debates para ver tus subidas aquí.</p></div>`}
            </div>
          </div>
        </div>
      </div>`;
    }
  };

  /* ---------------- INSIGNIAS / CERTIFICADOS ---------------- */
  S.badges = {
    render() {
      const got = DB.badges.filter(b=>b.got).length;
      const certs = DB.certificates || [];
      return `
      <div class="page-head fade-up" style="--d:0"><div><div class="page-title">Insignias y certificados</div>
      <div class="page-sub">${got} de ${DB.badges.length} insignias · sigue ganando logros de campeón</div></div></div>

      <div class="fade-up" style="--d:1;margin-bottom:12px"><div class="eyebrow" style="margin-bottom:2px">Logros</div><b style="font-size:15px;display:block">Tus certificados</b></div>
      ${certs.length
        ? `<div class="grid g-2" style="gap:14px;margin-bottom:24px">
          ${certs.map(ct=>`
          <div class="cert">
            <div class="seal">${IC.award}</div>
            <div style="flex:1;min-width:0">
              <div class="badge gold" style="margin-bottom:7px">Certificado oficial OTR</div>
              <h3 style="font-size:17px;font-weight:750;line-height:1.2">${esc(ct.title)}</h3>
              <p class="muted" style="font-size:13px;margin-top:4px">${esc(ct.programName)}${ct.issuedAt ? ` · ${esc(ct.issuedAt)}` : ''}</p>
            </div>
            <button class="btn btn-navy btn-sm" onclick="window.__cert='${esc(ct.id)}';go('certificate')">Ver certificado</button>
          </div>`).join('')}
        </div>`
        : `<div class="empty" style="padding:32px 24px;margin-bottom:24px"><div class="ill">${IC.award}</div><h4>Aún no tienes certificados</h4><p>Completa un programa al 100% para ganar tu primer certificado.</p></div>`}

      <div class="row between vcenter fade-up" style="--d:2;margin-bottom:12px"><div><div class="eyebrow" style="margin-bottom:2px">Colección</div><b style="font-size:15px;display:block">Tus insignias</b></div><span class="badge navy">${got} / ${DB.badges.length}</span></div>
      <div class="badge-grid fade-up" style="--d:3">
        ${DB.badges.map(b=>`
          <div class="badge-card ${b.got?'':'locked'}">
            ${b.got?'<span class="badge ok" style="position:absolute;top:12px;right:12px">Ganada</span>':`<span style="position:absolute;top:12px;right:12px;color:var(--n-300)">${IC.lock}</span>`}
            <div class="badge-medal ${b.got?'gold':'lock'}">${IC[b.ic]}</div>
            <div class="bn">${esc(b.n)}</div>
            <div class="bd">${esc(b.d)}</div>
          </div>`).join('')}
      </div>`;
    }
  };

  /* ---------------- PERFIL (SEGMENTADO POR ROL) ---------------- */
  S.profile = {
    render(state) {
      const role = String((state && state.role) || (DB.me && DB.me.role) || 'student').toLowerCase();
      const isTeacher = role === 'teacher' || role === 'admin';
      return isTeacher ? renderCoachSelf() : renderStudentSelf();
    }
  };

  /* --- Perfil de COACH del propio profesor (cara TEACHER) --- */
  function renderCoachSelf() {
    const me = DB.me || {};
    const cp = DB.coachProfile || {};
    const programs = (DB.teacherCourses && DB.teacherCourses.length ? DB.teacherCourses : (cp.programs || [])) || [];
    const reviews = DB.reviewsReceived || [];
    const formats = cp.formatsList && cp.formatsList.length
      ? cp.formatsList
      : (me.formats ? String(me.formats).split(/\s*,\s*/).filter(Boolean) : []);
    const headline = cp.headline || me.headline || '';
    const bio = cp.bio || me.bio || '';
    const teachingStyle = cp.teachingStyle || me.teachingStyle || '';
    const location = cp.location || me.location || '';
    const rating = cp.rating != null ? cp.rating : 0;
    const reviewCount = cp.reviewCount != null ? cp.reviewCount : reviews.length;
    const ini = cp.initials || me.initials || '';
    const name = cp.name || me.name || '';

    return `
    <div class="card card-pad fade-up" style="--d:0;margin-bottom:18px">
      <div class="profile-head">
        ${C.avatar(esc(ini), { size: 'xl', bg: 'var(--otr-navy)' })}
        <div style="flex:1;min-width:200px">
          <div class="row vcenter" style="gap:10px;flex-wrap:wrap">
            <h2 style="font-size:22px;font-weight:750">${esc(name)}</h2>${C.badge('Coach', 'navy')}
          </div>
          ${headline ? `<div class="sky" style="font-size:13.5px;font-weight:600;margin-top:3px">${esc(headline)}</div>` : ''}
          <div class="row vcenter" style="gap:8px;margin-top:6px;flex-wrap:wrap">
            <span class="row vcenter" style="gap:6px">${starsRO(rating)}<b class="tnum" style="font-size:13.5px">${Number(rating).toFixed(1)}</b></span>
            <span class="faint" style="font-size:12.5px">· ${reviewCount} ${reviewCount === 1 ? 'reseña' : 'reseñas'}</span>
            ${location ? `<span class="faint" style="font-size:12.5px">· ${esc(location)}</span>` : ''}
          </div>
          ${bio ? `<p class="muted" style="font-size:13.5px;line-height:1.5;margin-top:10px;max-width:60ch;white-space:pre-wrap">${esc(bio)}</p>` : ''}
          <div class="row" style="gap:8px;margin-top:12px;flex-wrap:wrap">
            <button class="btn btn-primary btn-sm" data-action="edit-coach">${IC.pencil} Editar perfil</button>
            <button class="btn btn-soft btn-sm" data-action="edit-coach-market">${IC.sliders} Perfil de marketplace</button>
          </div>
        </div>
        <div class="row" style="gap:0">
          <div class="kpi" style="text-align:center;padding:0 20px"><span class="k-val brand-font" style="font-size:24px">${programs.length}</span><span class="k-label" style="justify-content:center">Programas</span></div>
          <div class="kpi" style="text-align:center;padding:0 20px;border-left:1px solid var(--border)"><span class="k-val brand-font" style="font-size:24px">${Number(rating).toFixed(1)}</span><span class="k-label" style="justify-content:center">Rating</span></div>
          <div class="kpi" style="text-align:center;padding:0 20px;border-left:1px solid var(--border)"><span class="k-val brand-font" style="font-size:24px">${reviewCount}</span><span class="k-label" style="justify-content:center">Reseñas</span></div>
        </div>
      </div>
    </div>

    <div class="split fade-up rail-320" style="--d:1">
      <div class="stack" style="gap:18px">
        <div class="card card-pad">
          <div class="eyebrow" style="margin-bottom:2px">Metodología</div>
          <b style="font-size:14px">Cómo trabajo</b>
          <p class="muted" style="font-size:13.5px;line-height:1.55;margin-top:10px;white-space:pre-wrap">${teachingStyle ? esc(teachingStyle) : 'Aún no has descrito tu metodología. Edita tu perfil para contar a tus estudiantes cómo trabajas.'}</p>
        </div>

        <div class="card card-pad">
          <div class="row between vcenter"><b style="font-size:14px">Mis programas</b><span class="badge sky">${programs.length}</span></div>
          ${programs.length
            ? `<div class="grid g-2" style="margin-top:14px;gap:14px">${programs.map(programCard).join('')}</div>`
            : `<div class="empty" style="padding:24px"><div class="ill">${IC.book}</div><h4>Aún no tienes programas</h4><p>Crea un programa para empezar a recibir estudiantes.</p></div>`}
        </div>

        <div class="card card-pad">
          <div class="row between vcenter"><b style="font-size:14px">Reseñas de estudiantes</b><span class="badge navy">${reviews.length}</span></div>
          ${reviews.length
            ? `<div class="stack" style="gap:12px;margin-top:14px">${reviews.map((rv) => reviewCard(rv, { showProgram: true })).join('')}</div>`
            : `<div class="empty" style="padding:24px"><div class="ill">${IC.star}</div><h4>Sin reseñas todavía</h4><p>Cuando tus estudiantes te reseñen, aparecerán aquí.</p></div>`}
        </div>
      </div>

      <div class="stack" style="gap:16px">
        <div class="card card-pad" style="text-align:center;background:linear-gradient(160deg,var(--otr-pale),#fff)">
          <div class="eyebrow" style="margin-bottom:8px">Valoración general</div>
          <div class="brand-font" style="font-size:38px;font-weight:800;line-height:1;color:var(--otr-navy)">${Number(rating).toFixed(1)}</div>
          <div style="margin-top:8px">${starsRO(rating)}</div>
          <div class="faint" style="font-size:12px;margin-top:7px">${reviewCount} ${reviewCount === 1 ? 'reseña' : 'reseñas'}</div>
        </div>
        <div class="card card-pad">
          <div class="eyebrow" style="margin-bottom:2px">Especialidad</div>
          <b style="font-size:13.5px">Qué enseño</b>
          <div class="row wrap" style="gap:8px;margin-top:12px">
            ${formats.length ? formatChips(formats) : '<span class="faint" style="font-size:12.5px">Define tus formatos en el perfil.</span>'}
          </div>
        </div>
      </div>
    </div>`;
  }

  /* --- Perfil del ALUMNO (cara STUDENT) --- */
  function renderStudentSelf() {
    const me = DB.me || {};
    const courses = DB.courses || [];
    const gotBadges = (DB.badges || []).filter((b) => b.got);
    return `
    <div class="card card-pad fade-up" style="--d:0;margin-bottom:18px">
      <div class="profile-head">
        ${C.avatar(esc(me.initials), { size: 'xl', bg: 'var(--otr-sky-lo)' })}
        <div style="flex:1;min-width:200px">
          <div class="row vcenter" style="gap:10px;flex-wrap:wrap"><h2 style="font-size:22px;font-weight:750">${esc(me.name)}</h2>${C.levelBadge(me.level || 'Novato')}</div>
          ${me.headline ? `<div class="sky" style="font-size:13.5px;font-weight:600;margin-top:3px">${esc(me.headline)}</div>` : ''}
          <div class="muted" style="font-size:13px;margin-top:4px">${esc(me.email)}${me.location ? ` · ${esc(me.location)}` : ''}</div>
          ${me.bio ? `<p class="muted" style="font-size:13.5px;line-height:1.5;margin-top:10px;max-width:60ch;white-space:pre-wrap">${esc(me.bio)}</p>` : ''}
          <div class="row" style="gap:8px;margin-top:12px">
            <button class="btn btn-ghost btn-sm" data-action="edit-profile">${IC.pencil} Editar perfil</button>
            <button class="btn btn-ghost btn-sm" data-action="edit-profile">${IC.settings} Ajustes</button>
          </div>
        </div>
        <div class="row" style="gap:0">
          <div class="kpi" style="text-align:center;padding:0 20px"><span class="k-val brand-font" style="font-size:24px">${courses.length}</span><span class="k-label" style="justify-content:center">Programas</span></div>
          <div class="kpi" style="text-align:center;padding:0 20px;border-left:1px solid var(--border)"><span class="k-val brand-font" style="font-size:24px">${gotBadges.length}</span><span class="k-label" style="justify-content:center">Insignias</span></div>
          <div class="kpi" style="text-align:center;padding:0 20px;border-left:1px solid var(--border)"><span class="k-val brand-font" style="font-size:24px">${(me.streak || 0)}</span><span class="k-label" style="justify-content:center">Racha</span></div>
        </div>
      </div>
    </div>

    <div class="split fade-up rail-320" style="--d:1">
      <div class="stack" style="gap:18px">
        <div class="card card-pad">
          <div class="row between vcenter"><b style="font-size:14px">Mis programas</b><button class="btn btn-ghost btn-sm" onclick="go('catalog')">Explorar ${IC.chevR}</button></div>
          ${courses.length
            ? `<div class="stack" style="gap:12px;margin-top:14px">${courses.map((c) => `
              <div class="card card-pad lift" style="padding:12px 14px;cursor:pointer" onclick="go('course')">
                <div class="row vcenter between" style="gap:10px">
                  <div class="row vcenter" style="gap:10px">${C.courseDot(c.color || 'var(--otr-sky)')}
                    <div><div style="font-weight:650;font-size:14px">${esc(c.name)}</div>
                    <div class="faint" style="font-size:12px">${esc(c.coach)}${c.format ? ` · ${esc(c.format)}` : ''}${c.modality ? ` · ${esc(c.modality)}` : ''}</div></div>
                  </div>
                  <span class="tnum faint" style="font-size:12.5px">${c.progress != null ? c.progress + '%' : ''}</span>
                </div>
                ${c.progress != null ? `<div style="margin-top:10px">${C.bar(c.progress, { cls: 'navy' })}</div>` : ''}
              </div>`).join('')}</div>`
            : `<div class="empty" style="padding:24px"><div class="ill">${IC.book}</div><h4>Aún no estás inscrito</h4><p>Cuando te inscribas en un programa, aparecerá aquí.</p><button class="btn btn-primary btn-sm" onclick="go('catalog')">Explorar programas</button></div>`}
        </div>
      </div>

      <div class="stack" style="gap:16px">
        <div class="card card-pad">
          <div class="eyebrow" style="margin-bottom:2px">Tu rango</div>
          <b style="font-size:13.5px">Nivel actual</b>
          <div class="row vcenter" style="gap:12px;margin:12px 0 14px">
            <div class="ln-badge brand-font" style="width:48px;height:48px;border-radius:14px;background:linear-gradient(135deg,var(--otr-sky),var(--otr-sky-lo));color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;box-shadow:var(--sh-2)">${esc((me.level || 'N')[0])}</div>
            <div><b style="font-size:15px">${esc(me.level || 'Novato')}</b><div class="faint" style="font-size:12px;margin-top:1px">${(DB.xpNext - DB.xp)} XP para el siguiente nivel</div></div>
          </div>
          ${C.bar(DB.xpNext > DB.xpLevelStart ? Math.round(((DB.xp - DB.xpLevelStart) / (DB.xpNext - DB.xpLevelStart)) * 100) : 0, { cls: 'navy' })}
          <div class="row between vcenter" style="font-size:12px;color:var(--text-2);margin-top:10px"><span class="tnum">${(DB.xp || 0).toLocaleString('es')} XP</span><span class="streak">${IC.flame} ${(me.streak || 0)} días</span></div>
        </div>
        <div class="card card-pad">
          <div class="eyebrow" style="margin-bottom:2px">Logros</div>
          <b style="font-size:13.5px">Insignias destacadas</b>
          ${gotBadges.length
            ? `<div class="row wrap" style="gap:12px;margin-top:14px">${gotBadges.slice(0, 4).map((b) => `<div class="badge-medal gold" style="width:46px;height:46px" title="${esc(b.n)}">${IC[b.ic]}</div>`).join('')}</div>
               <button class="btn btn-ghost btn-sm btn-block" style="margin-top:16px" onclick="go('badges')">Ver todas ${IC.chevR}</button>`
            : `<p class="faint" style="font-size:12.5px;margin-top:10px">Aún no has ganado insignias. ¡Entrena para conseguirlas!</p>`}
        </div>
      </div>
    </div>`;
  }

  /* ---------------- PERFIL PÚBLICO DE UN COACH (cara STUDENT) ---------------- */
  S.coach = {
    render() {
      const cp = DB.coachProfile || {};
      const programs = cp.programs || [];
      const reviews = cp.reviews || [];
      const formats = cp.formatsList || [];
      const rating = cp.rating != null ? cp.rating : 0;
      const reviewCount = cp.reviewCount != null ? cp.reviewCount : reviews.length;
      const myReview = DB.myReview || null;
      // §7.4: el form de reseña se gatea por reserva COMPLETADA (server-side flag).
      // El "programa principal" = primer programa del coach (sobre el que se deja la reseña).
      const mainCourse = programs[0] || null;
      const isEnrolled = !!DB.canReviewCoach; // sesión 1:1 COMPLETADA con el coach

      return `
      <div class="card card-pad fade-up" style="--d:0;margin-bottom:18px">
        <div class="profile-head">
          ${C.avatar(esc(cp.initials), { size: 'xl', bg: 'var(--otr-navy)' })}
          <div style="flex:1;min-width:200px">
            <div class="row vcenter" style="gap:10px;flex-wrap:wrap">
              <h2 style="font-size:22px;font-weight:750">${esc(cp.name)}</h2>${C.badge('Coach', 'navy')}
            </div>
            ${cp.headline ? `<div class="sky" style="font-size:13.5px;font-weight:600;margin-top:3px">${esc(cp.headline)}</div>` : ''}
            <div class="row vcenter" style="gap:8px;margin-top:6px;flex-wrap:wrap">
              <span class="row vcenter" style="gap:6px">${starsRO(rating)}<b class="tnum" style="font-size:13.5px">${Number(rating).toFixed(1)}</b></span>
              <span class="faint" style="font-size:12.5px">· ${reviewCount} ${reviewCount === 1 ? 'reseña' : 'reseñas'}</span>
              ${cp.location ? `<span class="faint" style="font-size:12.5px">· ${esc(cp.location)}</span>` : ''}
            </div>
            ${cp.bio ? `<p class="muted" style="font-size:13.5px;line-height:1.5;margin-top:10px;max-width:60ch;white-space:pre-wrap">${esc(cp.bio)}</p>` : ''}
          </div>
        </div>
      </div>

      <div class="split fade-up rail-320" style="--d:1">
        <div class="stack" style="gap:18px">
          <div class="card card-pad">
            <div class="eyebrow" style="margin-bottom:2px">Metodología</div>
            <b style="font-size:14px">Cómo trabaja</b>
            <p class="muted" style="font-size:13.5px;line-height:1.55;margin-top:10px;white-space:pre-wrap">${cp.teachingStyle ? esc(cp.teachingStyle) : 'Este coach aún no ha descrito su metodología.'}</p>
          </div>

          <div class="card card-pad">
            <div class="row between vcenter"><b style="font-size:14px">Programas</b><span class="badge sky">${programs.length}</span></div>
            ${programs.length
              ? `<div class="grid g-2" style="margin-top:14px;gap:14px">${programs.map(programCard).join('')}</div>`
              : `<div class="empty" style="padding:24px"><div class="ill">${IC.book}</div><h4>Sin programas publicados</h4></div>`}
          </div>

          <div class="card card-pad" id="reviews-block">
            <div class="row between vcenter"><b style="font-size:14px">Reseñas</b><span class="badge navy">${reviews.length}</span></div>
            ${reviews.length
              ? `<div class="stack" style="gap:12px;margin-top:14px">${reviews.map((rv) => reviewCard(rv)).join('')}</div>`
              : `<div class="empty" style="padding:24px"><div class="ill">${IC.star}</div><h4>Sin reseñas todavía</h4><p>Sé el primero en dejar una reseña.</p></div>`}
          </div>
        </div>

        <div class="stack" style="gap:16px">
          <div class="card card-pad" style="text-align:center;background:linear-gradient(160deg,var(--otr-pale),#fff)">
            <div class="eyebrow" style="margin-bottom:8px">Valoración</div>
            <div class="brand-font" style="font-size:38px;font-weight:800;line-height:1;color:var(--otr-navy)">${Number(rating).toFixed(1)}</div>
            <div style="margin-top:8px">${starsRO(rating)}</div>
            <div class="faint" style="font-size:12px;margin-top:7px">${reviewCount} ${reviewCount === 1 ? 'reseña' : 'reseñas'}</div>
          </div>

          <div class="card card-pad">
            <div class="eyebrow" style="margin-bottom:2px">Especialidad</div>
            <b style="font-size:13.5px">Formatos</b>
            <div class="row wrap" style="gap:8px;margin-top:12px">
              ${formats.length ? formatChips(formats) : '<span class="faint" style="font-size:12.5px">No especificado.</span>'}
            </div>
          </div>

          ${renderReviewBox(myReview, mainCourse, isEnrolled)}
        </div>
      </div>`;
    },
    mount(root) {
      // Toggle visual de las estrellas clicables: marca con .on hasta la elegida.
      // Aula lee la última estrella .star.on al publicar la reseña.
      const stars = Array.from(root.querySelectorAll('.star'));
      if (!stars.length) return;
      const paint = (n) => stars.forEach((s) => {
        const v = +s.getAttribute('data-rating');
        s.classList.toggle('on', v <= n);
        s.style.opacity = v <= n ? '1' : '.3';
      });
      stars.forEach((s) => {
        s.addEventListener('click', (e) => { e.preventDefault(); paint(+s.getAttribute('data-rating')); });
        s.addEventListener('mouseenter', () => {
          const cur = Math.max(0, ...stars.filter((x) => x.classList.contains('on')).map((x) => +x.getAttribute('data-rating')));
          paint(+s.getAttribute('data-rating'));
          s.setAttribute('data-restore', String(cur));
        });
      });
    }
  };

  /* --- Caja para dejar / mostrar reseña (solo cara STUDENT) --- */
  function renderReviewBox(myReview, mainCourse, isEnrolled) {
    // Ya reseñó: mostrar su reseña.
    if (myReview) {
      return `
      <div class="card card-pad" style="border-color:var(--otr-sky)">
        <div class="eyebrow" style="margin-bottom:2px">Publicada</div>
        <b style="font-size:13.5px">Tu reseña</b>
        <div style="margin-top:10px">${starsRO(myReview.rating)}</div>
        ${myReview.body ? `<p class="muted" style="font-size:13.5px;line-height:1.55;margin-top:10px;white-space:pre-wrap">${esc(myReview.body)}</p>` : ''}
      </div>`;
    }
    // VERIFIED-BOOKING-ONLY (PRD §7.4): la reseña se habilita con una sesión 1:1
    // COMPLETADA con el coach — no con la inscripción a un curso.
    if (!mainCourse || !isEnrolled) {
      return `
      <div class="card card-pad">
        <b style="font-size:13.5px">Dejar una reseña</b>
        <p class="faint" style="font-size:12.5px;line-height:1.5;margin-top:8px">Completa una sesión 1:1 con este coach para poder reseñarlo — solo reservas verificadas.</p>
      </div>`;
    }
    // Formulario de reseña.
    return `
    <div class="card card-pad">
      <div class="eyebrow" style="margin-bottom:2px">Tu experiencia</div>
      <b style="font-size:13.5px">Deja tu reseña</b>
      <div class="row" style="gap:4px;margin-top:12px" id="review-stars">
        ${[1, 2, 3, 4, 5].map((n) => `<button type="button" class="star" data-rating="${n}" aria-label="${n} estrellas" style="background:none;border:0;padding:3px;cursor:pointer;color:var(--otr-sky);opacity:.3;display:inline-flex">${IC.star}</button>`).join('')}
      </div>
      <textarea class="input" id="review-body" rows="3" placeholder="Cuéntale a otros estudiantes cómo fue tu experiencia…" style="margin-top:12px;resize:vertical"></textarea>
      <button class="btn btn-primary btn-sm btn-block" style="margin-top:12px" data-action="leave-review" data-course="${esc(mainCourse.id)}">Publicar reseña</button>
    </div>`;
  }
