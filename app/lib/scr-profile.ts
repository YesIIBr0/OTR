// @ts-nocheck
import { DB } from "./data";
import { C } from "./components";
import { IC } from "./icons";
import { esc } from "./esc";
import { t, getLang, registerDict } from "./i18n";
// [F4.1] Registra el diccionario de esta pantalla en SU chunk (fuera del inicial): profile.*. Ver app/lib/i18n.ts.
import { dict as d_profile } from "./i18n-keys/profile";
registerDict(d_profile);
export const S = {};

  /* ---------------- helpers de reseñas ---------------- */
  // Fila de estrellas SOLO de lectura (rating 0-5). Rellenas hasta `rating`.
  const starsRO = (rating) => {
    const r = Math.round(Number(rating) || 0);
    return `<span class="stars-ro" style="display:inline-flex;gap:2px;color:var(--otr-green)">${
      Array.from({ length: 5 }, (_, i) =>
        `<span style="display:inline-flex;${i < r ? '' : 'opacity:.25'}">${IC.star}</span>`
      ).join('')
    }</span>`;
  };
  // Tarjeta de una reseña individual.
  const reviewCard = (rv, opts = {}) => `
    <div class="card card-pad" style="padding:15px 16px;background:var(--surface-2)">
      <div class="row vcenter between" style="gap:10px">
        <div class="row vcenter" style="gap:11px;min-width:0">
          ${C.avatar(esc(rv.ini), { size: 'sm', bg: 'var(--otr-black)' })}
          <div style="min-width:0"><div style="font-weight:700;font-size:13.5px;line-height:1.2">${esc(rv.author)}</div>
          <div class="faint" style="font-size:11.5px;margin-top:2px">${esc(rv.when)}${opts.showProgram && rv.programName ? ` · ${rv.programName}` : ''}</div></div>
        </div>
        ${starsRO(rv.rating)}
      </div>
      ${rv.body ? `<p class="muted" style="font-size:13.5px;line-height:1.55;margin-top:11px;white-space:pre-wrap">${esc(rv.body)}</p>` : ''}
    </div>`;
  // Tarjeta de un programa (course) — usada en perfiles de coach.
  const programCard = (p) => `
    <div class="card card-pad" style="border-top:3px solid ${p.color || 'var(--otr-sky)'}">
      <div class="row vcenter between" style="gap:8px;flex-wrap:wrap">
        <div class="row vcenter" style="gap:9px;min-width:0">${C.courseDot(p.color || 'var(--otr-sky)')}<b style="font-size:14.5px;line-height:1.2">${p.name}</b></div>
        ${p.code ? `<span class="mono faint" style="font-size:11.5px">${esc(p.code)}</span>` : ''}
      </div>
      ${p.summary ? `<p class="muted" style="font-size:13px;line-height:1.5;margin-top:8px">${esc(p.summary)}</p>` : ''}
      <div class="row wrap" style="gap:6px;margin-top:11px">
        ${p.format ? C.chip(esc(p.format), 'info') : ''}
        ${p.modality ? C.chip(esc(p.modality), 'outline') : ''}
      </div>
      ${p.price != null ? `<div class="divider" style="margin:12px 0 0"></div><div class="row between vcenter" style="margin-top:12px">
        <span class="brand-font tnum" style="font-size:21px;font-weight:800;letter-spacing:-.02em;color:var(--text)">${typeof p.price === 'number' ? '$' + (p.price / 100).toLocaleString(getLang() === 'en' ? 'en' : 'es') : esc(p.price)}</span>
        ${C.btn(t("profile.viewProgram"), 'outline', { size: 'sm', icRight: 'chevR', attrs: `onclick="go('catalog')"` })}
      </div>` : ''}
    </div>`;
  // Chips a partir de una lista de formatos (array de strings). [MOCKUP] chips r3 del kit.
  const formatChips = (list) => (Array.isArray(list) ? list : [])
    .filter(Boolean)
    .map((f) => C.chip(esc(f), 'outline')).join('');

  /* ---------------- PROGRESO / NIVELES ---------------- */
  S.progress = {
    render() {
      // [fix de-mock] TODO dinámico desde los datos REALES del usuario.
      // (Antes estaba hardcodeado a 'Varsity' + racha de 12 + 3 eventos falsos.)
      const levels = DB.levels || [];
      const curName = (DB.me && DB.me.level) || (levels[0] && levels[0].name) || 'OTR Initiate';
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
      // Etiqueta visible según idioma; el key canónico (dato del Skill Graph) no se traduce.
      const SKILL_LABEL = { 'Confianza': 'aula.skillConfidence', 'Estructura': 'aula.skillStructure', 'Evidencia': 'aula.skillEvidence', 'Refutación': 'aula.skillRebuttal', 'Cross-ex': 'aula.skillCrossex', 'Delivery': 'aula.skillDelivery' };
      const skillMap = {};
      (DB.skills || []).forEach((s) => { skillMap[s.skill] = Math.max(0, Math.min(100, Number(s.score) || 0)); });
      const hasSkills = (DB.skills || []).length > 0;
      const comps = SKILL_DIMS.map((name) => [name, skillMap[name] != null ? skillMap[name] : 0]);
      return `
      <div class="page-head page-head--rule fade-up" style="--d:0">
      <div><span class="ph-eyebrow">${t("profile.yourProgress")}</span><h1 class="ph-title">${t("profile.progressTitle")}</h1>
      <div class="page-sub" style="margin-top:8px">${t("profile.progressSub")}</div></div>
      <div class="stat-group">
        ${C.statInline(xp.toLocaleString(getLang() === 'en' ? 'en' : 'es'), 'XP')}
        ${C.statInline(streak, t("profile.streak"), { accent: true })}
      </div></div>
      <div class="row vcenter" style="gap:8px;margin-bottom:16px">${C.chip(esc(curName), 'black', { ic: 'levels' })}</div>

      <div class="card card-pad fade-up" style="--d:1;margin-bottom:18px">
        <div class="level-track">
          ${levels.map((l, i) => {
            const cur = i === curIndex, done = i < curIndex, locked = i > curIndex;
            return `<div class="level-node ${cur?'cur':''} ${locked?'locked':''}">
              <div class="ln-badge" style="background:${cur?'linear-gradient(135deg,var(--otr-sky),var(--otr-sky-lo))':done?'linear-gradient(135deg,#BDBDBD,#8C8C8C)':'linear-gradient(135deg,'+l.color+','+l.color+')'}">${esc((l.name||'')[0])}</div>
              <div class="ln-name">${esc(l.name)}${done?` <span style="display:inline-flex;width:14px;height:14px;color:var(--ok);vertical-align:-2px">${IC.check}</span>`:''}</div>
              <div class="ln-range">${esc(l.range)}</div>
            </div>`;
          }).join('')}
        </div>
      </div>

      <div class="split fade-up rail-320" style="--d:2">
        <div class="card card-pad">
          ${/* [K-09] Niveles medía h1 → h4 → h4 → h3 (salto h1→h4 y además un h3 DESPUÉS de
                un h4). Las tres secciones de la pantalla son hermanas de primer nivel: h2.
                `.sec-title--sm > h2` ya está tipado igual que h3/h4 (screens.css:40). */""}
          ${C.secTitle(nextLevel ? t("profile.pathTo") + ' ' + esc(nextLevel.name) : t("profile.maxLevel"), { sm: true, tag: 'h2', right: `<span class="muted tnum" style="font-size:13px">${xp.toLocaleString(getLang() === 'en' ? 'en' : 'es')} / ${xpNext.toLocaleString(getLang() === 'en' ? 'en' : 'es')} XP</span>` })}
          <div style="margin:4px 0 7px">${C.bar(pct,{cls:'thick navy'})}</div>
          <div class="row between vcenter" style="font-size:12px;color:var(--text-2)">${C.chip(esc(curName), 'tint')}<span class="tnum">${nextLevel ? toNext.toLocaleString(getLang() === 'en' ? 'en' : 'es') + ' ' + t("profile.xpToReach") + ' ' + esc(nextLevel.name) : t("profile.maxLevelReached")}</span></div>

          <div class="divider"></div>
          ${C.secTitle(t("profile.competencies"), { sm: true, tag: 'h2', right: hasSkills ? C.chip(`${Math.round(comps.reduce((a,c)=>a+c[1],0)/comps.length)} ${t("profile.avg")}`, 'accent') : '' })}
          ${hasSkills
            ? `<div style="margin-top:6px">
            ${comps.map(c=>`<div class="comp-row"><span class="cr-name">${c[1]>=85?`<span style="display:inline-flex;width:13px;height:13px;color:var(--ok);vertical-align:-2px">${IC.star}</span> `:''}${t(SKILL_LABEL[c[0]] || c[0])}</span><span class="cr-bar">${C.bar(c[1],{cls:'navy'})}</span><span class="cr-score" style="color:${c[1]>=85?'var(--ok)':c[1]>=75?'var(--text)':'var(--warn)'}">${c[1]}</span></div>`).join('')}
          </div>`
            /* [K-09] Vacío colgando de la sección h2 "Competencias" → h3 (antes h4). */
            : `<div class="empty" style="padding:26px;margin-top:8px"><div class="ill">${IC.award}</div><h3>${t("profile.noEvalHeading")}</h3><p>${t("profile.noEvalBody")}</p></div>`}
        </div>

        <div class="stack" style="gap:16px">
          <div class="card card-pad" style="text-align:center">
            <span class="lbl" style="margin-bottom:10px">${t("profile.streak")}</span>
            <div class="row vcenter" style="gap:8px;justify-content:center"><span style="display:inline-flex;width:20px;height:20px;color:var(--otr-green)">${IC.flame}</span><b class="tnum" style="font-size:21px;font-weight:800;letter-spacing:-.02em">${t("profile.streakDays").replace("{n}", streak)}</b></div>
            <div style="margin-top:10px;font-size:12.5px" class="muted">${t("profile.dontBreakIt")}</div>
            <div class="row wrap" style="gap:5px;margin-top:14px;justify-content:center">
              ${Array.from({length:14},(_,i)=>`<span style="width:15px;height:15px;border-radius:var(--r-sm);background:${i<Math.min(streak,14)?'var(--otr-green)':'var(--n-150)'}"></span>`).join('')}
            </div>
          </div>
          <div class="card">
            ${/* [K-09] Tercera sección hermana → h2 (antes h3, y venía DESPUÉS de dos h4). */""}
            <div class="card-head"><div class="sec-title sec-title--sm"><h2>${t("profile.recentGains")}</h2></div></div>
            <div class="card-body" style="padding:8px 16px 12px">
              ${recent.length ? recent.map(ev=>`
                <div class="agenda-item"><span class="when-dot" style="background:var(--otr-green)"></span>
                <div><div class="ai-t">${ev.title || ''}</div>${ev.xp ? `<div class="ai-c sky">+${ev.xp} XP</div>` : (ev.detail ? `<div class="ai-c sky">${ev.detail}</div>` : '')}</div><span class="ai-w">${ev.when || ''}</span></div>`).join('')
                : `<div class="empty" style="padding:22px"><p class="muted" style="font-size:13px;text-align:center">${t("profile.noActivityBody")}</p></div>`}
            </div>
          </div>
        </div>
      </div>
      ${/* [GOAL F3 · A5] La pantalla era 100% lectura: ni un control, ninguna salida.
            Dos destinos naturales del progreso —las insignias que el XP desbloquea y
            el Debate Hub donde se gana— con el kit (btn-outline sm) y la navegación
            in-app de siempre (go('<ruta>')). Rutas reales de ROUTES: badges y debate. */''}
      <div class="row wrap fade-up progress-exits" style="--d:3;gap:10px;margin-top:20px">
        ${C.btn(t("profile.progressGoBadges"), 'outline', { size: 'sm', icRight: 'arrowR', attrs: `onclick="go('badges')"` })}
        ${C.btn(t("profile.progressGoDebate"), 'outline', { size: 'sm', icRight: 'arrowR', attrs: `onclick="go('debate')"` })}
      </div>`;
    }
  };

  /* ---------------- INSIGNIAS / CERTIFICADOS ---------------- */
  S.badges = {
    render() {
      const got = DB.badges.filter(b=>b.got).length;
      const certs = DB.certificates || [];
      return `
      <div class="page-head page-head--rule fade-up" style="--d:0">
      <div><span class="ph-eyebrow">${t("profile.achievements")}</span><h1 class="ph-title">${t("profile.badgesTitle")}</h1>
      <div class="page-sub" style="margin-top:8px">${t("profile.badgesProgress").replace("{got}", got).replace("{total}", DB.badges.length)}</div></div>
      <div class="stat-group">${C.statInline(got, t("profile.yourBadges"), { accent: true })}${C.statInline(certs.length, t("profile.yourCertificates"))}</div></div>

      <div class="fade-up" style="--d:1">${C.secTitle(t("profile.yourCertificates"))}</div>
      ${certs.length
        ? `<div class="grid g-2" style="gap:14px;margin-bottom:24px">
          ${certs.map(ct=>`
          <div class="cert">
            <div class="seal">${IC.award}</div>
            <div style="flex:1;min-width:0">
              <div style="margin-bottom:7px">${C.chip(t("profile.officialCert"), 'accent', { ic: 'award' })}</div>
              <h3 style="font-size:17px;font-weight:800;letter-spacing:-.025em;line-height:1.2">${esc(ct.title)}</h3>
              <p class="muted" style="font-size:13px;margin-top:4px">${ct.programName}${ct.issuedAt ? ` · ${esc(ct.issuedAt)}` : ''}</p>
            </div>
            ${C.btn(t("profile.viewCertificate"), 'primary', { size: 'sm', attrs: `onclick="window.__cert='${esc(ct.id)}';go('certificate')"` })}
          </div>`).join('')}
        </div>`
        : `<div class="empty" style="padding:32px 24px;margin-bottom:24px"><div class="ill">${IC.award}</div><h4>${t("profile.noCertsHeading")}</h4><p>${t("profile.noCertsBody")}</p></div>`}

      <div class="fade-up" style="--d:2">${C.secTitle(t("profile.yourBadges"), { right: C.chip(`${got} / ${DB.badges.length}`, 'black') })}</div>
      <div class="badge-grid fade-up" style="--d:3">
        ${DB.badges.map(b=>`
          <div class="badge-card ${b.got?'':'locked'}">
            ${b.got?`<span style="position:absolute;top:12px;right:12px">${C.chip(t("profile.earned"), 'accent')}</span>`:`<span style="position:absolute;top:12px;right:12px;color:var(--n-300)">${IC.lock}</span>`}
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
            <h1 style="font-size:30px;font-weight:800;letter-spacing:-.03em;margin:0">${esc(name)}</h1>${C.chip('Coach', 'black')}
          </div>
          ${headline ? `<div class="sky" style="font-size:13.5px;font-weight:600;margin-top:3px">${esc(headline)}</div>` : ''}
          <div class="row vcenter" style="gap:8px;margin-top:6px;flex-wrap:wrap">
            <span class="row vcenter" style="gap:6px">${starsRO(rating)}<b class="tnum" style="font-size:13.5px">${Number(rating).toFixed(1)}</b></span>
            <span class="faint" style="font-size:12.5px">· ${reviewCount} ${reviewCount === 1 ? t("profile.reviewSingular") : t("profile.reviewPlural")}</span>
            ${location ? `<span class="faint" style="font-size:12.5px">· ${esc(location)}</span>` : ''}
          </div>
          ${bio ? `<p class="muted" style="font-size:13.5px;line-height:1.5;margin-top:10px;max-width:60ch;white-space:pre-wrap">${esc(bio)}</p>` : ''}
          <div class="row" style="gap:8px;margin-top:12px;flex-wrap:wrap">
            ${C.btn(t("profile.editProfile"), 'accent', { size: 'sm', ic: 'pencil', attrs: 'data-action="edit-coach"' })}
            ${C.btn(t("profile.marketplaceProfile"), 'outline', { size: 'sm', ic: 'sliders', attrs: 'data-action="edit-coach-market"' })}
          </div>
        </div>
        <div class="stat-group">
          ${C.statInline(programs.length, t("profile.kpiPrograms"))}
          ${C.statInline(Number(rating).toFixed(1), t("profile.kpiRating"), { accent: true })}
          ${C.statInline(reviewCount, t("profile.kpiReviews"))}
        </div>
      </div>
    </div>

    <div class="split fade-up rail-320" style="--d:1">
      <div class="stack" style="gap:18px">
        <div class="card card-pad">
          ${C.secTitle(t("profile.howIWork"), { sm: true })}
          <p class="muted" style="font-size:13.5px;line-height:1.55;white-space:pre-wrap">${teachingStyle ? esc(teachingStyle) : t("profile.noMethodologySelf")}</p>
        </div>

        <div class="card card-pad">
          ${C.secTitle(t("profile.myProgramsCoach"), { sm: true, right: C.chip(String(programs.length), 'outline') })}
          ${programs.length
            ? `<div class="grid g-2" style="margin-top:14px;gap:14px">${programs.map(programCard).join('')}</div>`
            : `<div class="empty" style="padding:24px"><div class="ill">${IC.book}</div><h4>${t("profile.noProgramsCoachHeading")}</h4><p>${t("profile.noProgramsCoachBody")}</p></div>`}
        </div>

        <div class="card card-pad">
          ${C.secTitle(t("profile.studentReviews"), { sm: true, right: C.chip(String(reviews.length), 'black') })}
          ${reviews.length
            ? `<div class="stack" style="gap:12px;margin-top:14px">${reviews.map((rv) => reviewCard(rv, { showProgram: true })).join('')}</div>`
            : `<div class="empty" style="padding:24px"><div class="ill">${IC.star}</div><h4>${t("profile.noReviewsCoachHeading")}</h4><p>${t("profile.noReviewsCoachBody")}</p></div>`}
        </div>
      </div>

      <div class="stack" style="gap:16px">
        <div class="card card-pad" style="text-align:center">
          <span class="lbl" style="margin-bottom:8px">${t("profile.overallRating")}</span>
          <div class="brand-font tnum" style="font-size:40px;font-weight:800;letter-spacing:-.035em;line-height:1;color:var(--text)">${Number(rating).toFixed(1)}</div>
          <div style="margin-top:8px">${starsRO(rating)}</div>
          <div class="faint" style="font-size:12px;margin-top:7px">${reviewCount} ${reviewCount === 1 ? t("profile.reviewSingular") : t("profile.reviewPlural")}</div>
        </div>
        <div class="card card-pad">
          ${C.secTitle(t("profile.whatITeach"), { sm: true })}
          <div class="row wrap" style="gap:6px">
            ${formats.length ? formatChips(formats) : `<span class="faint" style="font-size:12.5px">${t("profile.defineFormatsSelf")}</span>`}
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
    // [MOCKUP · Task 6] Número de nivel REAL para el anillo cónico (posición en la
    // escalera de DB.levels, 1-based). Sin escalera cargada, cae a 1.
    const lvlIdx = (DB.levels || []).findIndex((l) => (l.name || '').toLowerCase() === String(me.level || '').toLowerCase());
    const levelNum = lvlIdx >= 0 ? lvlIdx + 1 : 1;
    return `
    <div class="card card-pad fade-up" style="--d:0;margin-bottom:18px">
      <div class="profile-head">
        ${C.avatar(esc(me.initials), { size: 'xl', bg: 'var(--otr-sky-lo)' })}
        <div style="flex:1;min-width:200px">
          <div class="row vcenter" style="gap:10px;flex-wrap:wrap"><h1 style="font-size:30px;font-weight:800;letter-spacing:-.03em;margin:0">${me.name}</h1>${C.chip(esc(me.level || 'OTR Initiate'), 'black', { ic: 'levels' })}</div>
          ${me.headline ? `<div class="sky" style="font-size:13.5px;font-weight:600;margin-top:3px">${me.headline}</div>` : ''}
          <div class="muted" style="font-size:13px;margin-top:4px">${esc(me.email)}${me.location ? ` · ${esc(me.location)}` : ''}</div>
          ${me.bio ? `<p class="muted" style="font-size:13.5px;line-height:1.5;margin-top:10px;max-width:60ch;white-space:pre-wrap">${esc(me.bio)}</p>` : ''}
          <div class="row" style="gap:8px;margin-top:12px">
            ${C.btn(t("profile.editProfile"), 'accent', { size: 'sm', ic: 'pencil', attrs: 'data-action="edit-profile"' })}
          </div>
        </div>
        <div class="stat-group">
          ${C.statInline(courses.length, t("profile.kpiPrograms"))}
          ${C.statInline(gotBadges.length, t("profile.kpiBadges"))}
          ${C.statInline(me.streak || 0, t("profile.kpiStreak"), { accent: true })}
        </div>
      </div>
    </div>

    <div class="split fade-up rail-320" style="--d:1">
      <div class="stack" style="gap:18px">
        <div class="card card-pad">
          ${C.secTitle(t("profile.myProgramsStudent"), { sm: true, right: C.btn(t("profile.explore"), 'outline', { size: 'sm', icRight: 'chevR', attrs: `onclick="go('catalog')"` }) })}
          ${courses.length
            ? `<div class="stack" style="gap:12px;margin-top:14px">${courses.map((c) => `
              <div class="card card-pad lift" role="button" tabindex="0" aria-label="Abrir ${c.name}" style="padding:12px 14px;cursor:pointer" onclick="go('course')">
                <div class="row vcenter between" style="gap:10px">
                  <div class="row vcenter" style="gap:10px">${C.courseDot(c.color || 'var(--otr-sky)')}
                    <div><div style="font-weight:650;font-size:14px">${c.name}</div>
                    <div class="faint" style="font-size:12px">${c.coach}${c.format ? ` · ${c.format}` : ''}${c.modality ? ` · ${c.modality}` : ''}</div></div>
                  </div>
                  <span class="tnum faint" style="font-size:12.5px">${c.progress != null ? c.progress + '%' : ''}</span>
                </div>
                ${c.progress != null ? `<div style="margin-top:10px">${C.bar(c.progress, { cls: 'navy' })}</div>` : ''}
              </div>`).join('')}</div>`
            : `<div class="empty" style="padding:24px"><div class="ill">${IC.book}</div><h4>${t("profile.notEnrolledHeading")}</h4><p>${t("profile.notEnrolledBody")}</p>${C.btn(t("profile.exploreProgramsBtn"), 'accent', { size: 'sm', attrs: `onclick="go('catalog')"` })}</div>`}
        </div>
      </div>

      <div class="stack" style="gap:16px">
        ${/* [MOCKUP · Task 6, spec §3.2] "Tu rango" es la card NEGRA con el anillo cónico
              del kit: nivel real + progreso de XP real. */''}
        <div class="card card--dark">
          <div class="card-pad">
            <div class="sec-row"><span class="lbl">${t("profile.yourRank")}</span>${C.chip(esc(me.level || 'OTR Initiate'), 'accent', { ic: 'levels' })}</div>
            <div class="row vcenter" style="gap:18px">
              ${C.ringConic(DB.xpNext > DB.xpLevelStart ? Math.round(((DB.xp - DB.xpLevelStart) / (DB.xpNext - DB.xpLevelStart)) * 100) : 0, levelNum, t("profile.levelCap"))}
              <div style="min-width:0">
                <b style="font-size:14px;color:#fff">${esc(me.level || 'OTR Initiate')}</b>
                <p class="dbt-sub" style="margin-top:5px"><b>${Math.max(0, (DB.xpNext || 0) - (DB.xp || 0))}</b> ${t("profile.xpToNextLevel")}</p>
                <p class="dbt-sub" style="margin-top:5px">${(DB.xp || 0).toLocaleString(getLang() === 'en' ? 'en' : 'es')} XP · ${t("profile.streakDays").replace("{n}", me.streak || 0)}</p>
              </div>
            </div>
          </div>
        </div>
        <div class="card card-pad">
          ${C.secTitle(t("profile.featuredBadges"), { sm: true })}
          ${gotBadges.length
            ? `<div class="row wrap" style="gap:12px;margin-top:4px">${gotBadges.slice(0, 4).map((b) => `<div class="badge-medal gold" style="width:46px;height:46px" title="${esc(b.n)}">${IC[b.ic]}</div>`).join('')}</div>
               <div style="margin-top:16px">${C.btn(t("profile.viewAll"), 'outline', { size: 'sm', block: true, icRight: 'chevR', attrs: `onclick="go('badges')"` })}</div>`
            : `<p class="faint" style="font-size:12.5px;margin-top:10px">${t("profile.noBadgesStudent")}</p>`}
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
              <h1 style="font-size:30px;font-weight:800;letter-spacing:-.03em;margin:0">${cp.name}</h1>${C.chip('Coach', 'black')}
            </div>
            ${cp.headline ? `<div class="sky" style="font-size:13.5px;font-weight:600;margin-top:3px">${cp.headline}</div>` : ''}
            <div class="row vcenter" style="gap:8px;margin-top:6px;flex-wrap:wrap">
              <span class="row vcenter" style="gap:6px">${starsRO(rating)}<b class="tnum" style="font-size:13.5px">${Number(rating).toFixed(1)}</b></span>
              <span class="faint" style="font-size:12.5px">· ${reviewCount} ${reviewCount === 1 ? t("profile.reviewSingular") : t("profile.reviewPlural")}</span>
              ${cp.location ? `<span class="faint" style="font-size:12.5px">· ${esc(cp.location)}</span>` : ''}
            </div>
            ${cp.bio ? `<p class="muted" style="font-size:13.5px;line-height:1.5;margin-top:10px;max-width:60ch;white-space:pre-wrap">${esc(cp.bio)}</p>` : ''}
          </div>
        </div>
      </div>

      <div class="split fade-up rail-320" style="--d:1">
        <div class="stack" style="gap:18px">
          <div class="card card-pad">
            ${C.secTitle(t("profile.howTheyWork"), { sm: true })}
            <p class="muted" style="font-size:13.5px;line-height:1.55;white-space:pre-wrap">${cp.teachingStyle ? esc(cp.teachingStyle) : t("profile.noMethodologyCoach")}</p>
          </div>

          <div class="card card-pad">
            ${C.secTitle(t("profile.programs"), { sm: true, right: C.chip(String(programs.length), 'outline') })}
            ${programs.length
              ? `<div class="grid g-2" style="margin-top:14px;gap:14px">${programs.map(programCard).join('')}</div>`
              : `<div class="empty" style="padding:24px"><div class="ill">${IC.book}</div><h4>${t("profile.noProgramsPublished")}</h4></div>`}
          </div>

          <div class="card card-pad" id="reviews-block">
            ${C.secTitle(t("profile.reviews"), { sm: true, right: C.chip(String(reviews.length), 'black') })}
            ${reviews.length
              ? `<div class="stack" style="gap:12px;margin-top:14px">${reviews.map((rv) => reviewCard(rv)).join('')}</div>`
              : `<div class="empty" style="padding:24px"><div class="ill">${IC.star}</div><h4>${t("profile.noReviewsCoachHeading")}</h4><p>${t("profile.beFirstReview")}</p></div>`}
          </div>
        </div>

        <div class="stack" style="gap:16px">
          <div class="card card-pad" style="text-align:center">
            <span class="lbl" style="margin-bottom:8px">${t("profile.rating")}</span>
            <div class="brand-font tnum" style="font-size:40px;font-weight:800;letter-spacing:-.035em;line-height:1;color:var(--text)">${Number(rating).toFixed(1)}</div>
            <div style="margin-top:8px">${starsRO(rating)}</div>
            <div class="faint" style="font-size:12px;margin-top:7px">${reviewCount} ${reviewCount === 1 ? t("profile.reviewSingular") : t("profile.reviewPlural")}</div>
          </div>

          <div class="card card-pad">
            ${C.secTitle(t("profile.formats"), { sm: true })}
            <div class="row wrap" style="gap:6px">
              ${formats.length ? formatChips(formats) : `<span class="faint" style="font-size:12.5px">${t("profile.notSpecified")}</span>`}
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
      <div class="card card-pad" style="border-color:var(--otr-green)">
        ${C.secTitle(t("profile.yourReview"), { sm: true, right: C.chip(t("profile.published"), 'tint') })}
        <div>${starsRO(myReview.rating)}</div>
        ${myReview.body ? `<p class="muted" style="font-size:13.5px;line-height:1.55;margin-top:10px;white-space:pre-wrap">${esc(myReview.body)}</p>` : ''}
      </div>`;
    }
    // VERIFIED-BOOKING-ONLY (PRD §7.4): la reseña se habilita con una sesión 1:1
    // COMPLETADA con el coach — no con la inscripción a un curso.
    if (!mainCourse || !isEnrolled) {
      return `
      <div class="card card-pad">
        ${C.secTitle(t("profile.leaveReview"), { sm: true })}
        <p class="faint" style="font-size:12.5px;line-height:1.5">${t("profile.verifiedBookingOnly")}</p>
      </div>`;
    }
    // Formulario de reseña.
    return `
    <div class="card card-pad">
      ${C.secTitle(t("profile.leaveYourReview"), { sm: true })}
      <div class="row" style="gap:4px" id="review-stars">
        ${[1, 2, 3, 4, 5].map((n) => `<button type="button" class="star" data-rating="${n}" aria-label="${n} estrellas" style="background:none;border:0;padding:3px;cursor:pointer;color:var(--otr-green);opacity:.3;display:inline-flex">${IC.star}</button>`).join('')}
      </div>
      <textarea class="input" id="review-body" rows="3" placeholder="${t("profile.reviewPlaceholder")}" style="margin-top:12px;resize:vertical"></textarea>
      <div style="margin-top:12px">${C.btn(t("profile.publishReview"), 'accent', { size: 'sm', block: true, attrs: `data-action="leave-review" data-course="${esc(mainCourse.id)}"` })}</div>
    </div>`;
  }
