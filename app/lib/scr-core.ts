// @ts-nocheck
import { DB } from "./data";
import { C } from "./components";
import { IC } from "./icons";
import { esc } from "./esc";
import { videoEmbedHtml } from "./video";
export const S = {};

// Curso ACTIVO (multi-curso Moodle): el seleccionado por window.__course, o el
// primero de coursesContent. Todas las vistas (hero, módulos, progreso, índice,
// lección) derivan de aquí — NO de DB.courseModules[0] (eso es solo el backbone
// del dashboard).
function activeCourse() {
  const list = (DB.coursesContent || []);
  if (!list.length) return null;
  const code = (window as any).__course;
  return list.find((c: any) => c.code === code) || list[0];
}

// Busca una lección por id entre TODOS los cursos inscritos (el id es único global).
// Devuelve { lesson, course } o nulos. Permite abrir una lección de cualquier curso.
function findLesson(id) {
  for (const c of (DB.coursesContent || []))
    for (const m of (c.modules || []))
      for (const it of (m.items || []))
        if (it.id === id) return { lesson: it, course: c };
  return { lesson: null, course: null };
}

// Lección activa (seleccionada al navegar; patrón window.__lesson). Se busca
// entre TODOS los cursos para que una lección de LD-101/ORA-101 también abra.
function currentLesson() {
  const id = (window as any).__lesson;
  if (!id) return null;
  return findLesson(id).lesson;
}

// Items navegables (no bloqueados) del curso ACTIVO en orden, con su tipo/destino.
function activeItemsFlat() {
  const c = activeCourse();
  if (!c) return [];
  const out = [];
  for (const m of (c.modules || [])) {
    if (m.locked) continue;
    for (const it of (m.items || [])) {
      if (it.locked) continue;
      out.push(it);
    }
  }
  return out;
}

  /* ---------------- DASHBOARD (PRD §4.2) ----------------
     Regla del PRD: "nunca vacío, siempre exactamente UNA acción siguiente obvia".
     Orden: ① Next Action hero · ② Skill snapshot · ③ Recommended for you;
     RIGHT rail: ④ Upcoming sessions · ⑤ Debate Rank · ⑥ Achievements;
     BOTTOM: tira de leaderboard del cohort. Sin emojis (IC.*), navy+sky. */

  // Las 6 dimensiones del radar OTR, en orden fijo del contrato.
  const DASH_SKILL_DIMS = ['Confianza','Estructura','Evidencia','Refutación','Cross-ex','Delivery'];

  // Próxima lección NO completada del primer curso (para "retomar lección").
  function nextLessonItem() {
    for (const m of (DB.courseModules || [])) {
      if (m.locked) continue;
      for (const it of (m.items || [])) {
        if (it.locked) continue;
        if (!it.doneByMe) return it;
      }
    }
    return null;
  }
  // Destino de navegación según el tipo de actividad (mismo patrón que la vista de curso).
  function destFor(it) {
    return it.type === 'quiz' ? 'quiz' : (it.type === 'mic' || it.type === 'assign') ? 'assignment' : it.type === 'video' ? 'player' : 'lesson';
  }

  S.dashboard = {
    render() {
      const firstName = esc((DB.me?.name || "").split(" ")[0] || "");
      const myLevel = DB.me?.level || "Novato";
      const order = ['Novato','JV','Varsity','Elite'];
      const myIdx = order.indexOf(myLevel);
      const nextName = order[myIdx+1] || 'Elite';
      const courses = DB.courses || [];
      const pending = courses.reduce((s,c)=>s+(c.due||0),0);
      const avg = courses.length ? Math.round(courses.reduce((s,c)=>s+(c.progress||0),0)/courses.length) : 0;

      /* ---- ① NEXT ACTION (una sola acción obvia, CTA primario navy) ---- */
      const nextL = nextLessonItem();
      const firstCourse = courses[0];
      let na;
      if (nextL && firstCourse) {
        // Retomar lección: lo más obvio si hay curso con actividad pendiente.
        const setLesson = `${nextL.type==='quiz'?`window.__quizLesson='${nextL.id}';`:''}window.__lesson='${nextL.id}';`;
        na = {
          eyebrow: 'Tu siguiente paso',
          title: `Retoma "${esc(nextL.t)}"`,
          sub: firstCourse ? `${esc(firstCourse.name)} · ${firstCourse.progress}% completado` : '',
          cta: 'Continuar lección', ic: IC.play,
          onclick: `${setLesson}go('${destFor(nextL)}')`,
        };
      } else if (!courses.length) {
        // Sin cursos: la acción obvia es explorar el catálogo.
        na = { eyebrow: 'Empieza aquí', title: 'Tu entrenamiento empieza hoy',
          sub: 'Elige tu primer programa y reserva tu lugar.', cta: 'Explorar catálogo', ic: IC.book, onclick: `go('catalog')` };
      } else if ((DB.debateRank?.provisional)) {
        // Curso al día y sin rating real: el PRD pide empujar al primer debate de práctica.
        na = { eyebrow: 'Tu siguiente paso', title: 'Juega tu primer debate de práctica',
          sub: 'Aún sin rondas. Estrena tu rating en un simulacro.', cta: 'Practicar debate', ic: IC.mic, onclick: `window.__debateTab='practice';go('debate')` };
      } else {
        // Todo al día: reservar sesión con el coach para seguir subiendo.
        na = { eyebrow: 'Tu siguiente paso', title: 'Reserva una sesión con tu coach',
          sub: 'Vas al día. Una sesión 1:1 te acerca al siguiente tier.', cta: 'Reservar sesión', ic: IC.headset, onclick: `go('explore')` };
      }

      const heroNext = `
      <div class="hello-card fade-up" style="--d:0;margin-bottom:18px">
        <div class="h-row">
          <div style="max-width:560px">
            <p class="eyebrow" style="color:var(--otr-sky-hi)">${na.eyebrow}</p>
            <h2 class="brand-font" style="margin-top:2px">Buenas, ${firstName}</h2>
            <p style="color:#fff;font-size:15px;font-weight:650;margin-top:10px">${na.title}</p>
            ${na.sub ? `<p style="color:rgba(234,242,251,.72);font-size:13px;margin-top:3px">${na.sub}</p>` : ''}
            <button class="btn btn-primary" style="margin-top:14px" onclick="${na.onclick}">${na.ic} ${na.cta}</button>
          </div>
          <div class="row" style="gap:10px;align-self:flex-start">
            <span class="streak">${IC.flame} ${DB.me?.streak||0} días de racha</span>
            ${C.levelBadge(myLevel)}
          </div>
        </div>
      </div>`;

      /* ---- KPIs ligeros (XP/nivel sí son Fase 1) ---- */
      const kpis = `
      <div class="grid g-4 fade-up" style="--d:1;margin-bottom:20px">
        <div class="tile">${C.kpi('Cursos activos',String(courses.length),{ic:'book'})}</div>
        <div class="tile">${C.kpi('Progreso medio',String(avg),{unit:'%',ic:'chart'})}</div>
        <div class="tile">${C.kpi('XP total',(DB.xp||0).toLocaleString('es'),{ic:'flame'})}</div>
        <div class="tile">${C.kpi('Entregas pendientes',String(pending),{ic:'clock'})}</div>
      </div>`;

      /* ---- ② SKILL SNAPSHOT (radar, reusa DB.skills) ---- */
      const skillMap = {};
      (DB.skills || []).forEach((s)=>{ skillMap[s.skill] = Math.max(0, Math.min(100, Number(s.score)||0)); });
      const hasSkills = (DB.skills || []).length > 0;
      const comps = DASH_SKILL_DIMS.map((n)=>[n, skillMap[n] != null ? skillMap[n] : 0]);
      const skillAvg = hasSkills ? Math.round(comps.reduce((a,c)=>a+c[1],0)/comps.length) : 0;
      const skillCard = `
        <div class="card card-pad">
          <div class="row between vcenter">
            <div><div class="eyebrow" style="margin-bottom:2px">Radar OTR</div><b style="font-size:15px">Tus habilidades</b></div>
            ${hasSkills ? `<span class="badge sky">${skillAvg} prom.</span>` : ''}
          </div>
          ${hasSkills
            ? `<div style="margin-top:12px">${comps.map(c=>`<div class="comp-row"><span class="cr-name">${c[1]>=85?`<span style="display:inline-flex;width:13px;height:13px;color:var(--ok);vertical-align:-2px">${IC.star}</span> `:''}${c[0]}</span><span class="cr-bar">${C.bar(c[1],{cls:'navy'})}</span><span class="cr-score" style="color:${c[1]>=85?'var(--ok)':c[1]>=75?'var(--text)':'var(--warn)'}">${c[1]}</span></div>`).join('')}
              <button class="btn btn-soft btn-sm" style="margin-top:12px" onclick="go('progress')">Ver progreso ${IC.arrowR}</button></div>`
            : `<div class="empty" style="padding:24px;margin-top:8px"><div class="ill">${IC.award}</div><h4>Tu radar está por estrenarse</h4><p>Completa una lección y tu coach medirá tus 6 habilidades.</p></div>`}
        </div>`;

      /* ---- ③ RECOMMENDED FOR YOU (cursos no inscritos / práctica) ---- */
      const enrolledCodes = new Set(courses.map(c=>c.code));
      const recos = (DB.catalog || []).filter(c=>!c.enrolled && !enrolledCodes.has(c.code)).slice(0,3);
      const recoCards = recos.map(c=>`
        <div class="tile course-card click" onclick="go('catalog')">
          <div class="cc-top" style="background:linear-gradient(120deg,${c.color},color-mix(in srgb,${c.color} 55%, #0C0C0C))">
            <span class="cc-code">${esc(c.code)}</span>
          </div>
          <div class="cc-body">
            <div class="cc-name">${esc(c.name)}</div>
            <div class="cc-coach">${esc(c.coach)}</div>
            <div class="cc-meta">${c.format?`<span class="row vcenter" style="gap:5px">${IC.flag} ${esc(c.format)}</span>`:''}${c.modality?`<span class="dot-sep"></span><span>${esc(c.modality)}</span>`:''}</div>
            <button class="btn btn-soft btn-sm" style="margin-top:10px;width:100%">Ver programa ${IC.arrowR}</button>
          </div>
        </div>`).join('');
      const recoCard = `
        <div class="card card-pad">
          <div class="row between vcenter" style="margin-bottom:14px">
            <div><div class="eyebrow" style="margin-bottom:2px">Para ti</div><b style="font-size:15px">Recomendado</b></div>
          </div>
          ${recos.length
            ? `<div class="grid g-3">${recoCards}</div>`
            : `<div class="empty" style="padding:24px"><div class="ill">${IC.target}</div><h4>Vas con todo</h4><p>Ya estás en todos los programas disponibles. Una sesión 1:1 con tu coach te lleva más lejos.</p><button class="btn btn-soft btn-sm" onclick="go('explore')">Reservar sesión ${IC.arrowR}</button></div>`}
        </div>`;

      /* ---- ④ UPCOMING SESSIONS (reservas REALES del usuario, PRD §4.2 ④) ----
         Lee DB.myBookings (STUDENT): CONFIRMED/PENDING futuras, ordenadas por
         slotAtIso asc, máximo 3. CTA al marketplace (data-go='explore') en el
         empty. Defensivo si no hay myBookings (rol no-STUDENT) → cae a DB.events
         o al empty. La sala on-platform (videoUrl) abre con window.open. */
      const nextSessions = (Array.isArray(DB.myBookings) ? DB.myBookings : [])
        .filter(b => b && b.upcoming && (b.status === 'CONFIRMED' || b.status === 'PENDING'))
        .sort((a,b)=> (Date.parse(a.slotAtIso)||0) - (Date.parse(b.slotAtIso)||0))
        .slice(0,3);

      // Countdown textual desde el ISO del slot ("" si no hay fecha o ya pasó).
      const dashCountdown = (iso) => {
        if (!iso) return '';
        const t = Date.parse(iso);
        if (Number.isNaN(t)) return '';
        const ms = t - Date.now();
        if (ms <= 0) return '';
        const min = Math.round(ms/60000);
        if (min < 60) return `en ${min} min`;
        const hours = Math.round(min/60);
        if (hours < 24) return `en ${hours} h`;
        const days = Math.round(hours/24);
        return `en ${days} día${days===1?'':'s'}`;
      };

      // EMPTY STATE: sin reservas próximas → CTA al marketplace (PRD §4.2 ④).
      const sessionsEmpty = `<div style="padding:10px 0"><p class="faint" style="font-size:13px">Tu agenda está libre — tu primer coach te espera.</p><button class="btn btn-soft btn-sm" style="margin-top:8px" data-go="explore">Explorar coaches ${IC.arrowR}</button></div>`;

      // Si DB.myBookings no existe (rol no-STUDENT): respaldo a DB.events; si
      // tampoco hay, empty con CTA.
      const sessionsHasBookings = Array.isArray(DB.myBookings);
      const sessionsBody = nextSessions.length
        ? nextSessions.map(b=>{
            const cd = dashCountdown(b.slotAtIso);
            const statusBadge = b.status === 'CONFIRMED'
              ? `<span class="badge sky"><span class="dot"></span>Confirmada</span>`
              : `<span class="badge warn"><span class="dot"></span>Esperando aprobación</span>`;
            const canJoin = b.status === 'CONFIRMED' && b.videoUrl;
            const action = canJoin
              ? `<button class="btn btn-soft btn-sm" style="flex:none" onclick="window.open('${esc(b.videoUrl)}','_blank','noopener')">${IC.video} Unirse</button>`
              : `<button class="btn btn-soft btn-sm" style="flex:none" data-go="my-bookings">Ver ${IC.arrowR}</button>`;
            return `
              <div class="agenda-item" style="align-items:center">
                ${C.avatar(esc(b.coachInitials || 'C'),{size:'sm',bg:'var(--otr-navy)'})}
                <div style="flex:1;min-width:0">
                  <div class="ai-t">${esc(b.coachName || 'Coach OTR')}</div>
                  <div class="ai-c">${esc(b.slotLabel || '')}${cd?` · ${esc(cd)}`:''}</div>
                  <div class="row vcenter" style="gap:6px;margin-top:5px">${statusBadge}</div>
                </div>
                ${action}
              </div>`;
          }).join('')
        : (!sessionsHasBookings && (DB.events||[]).length
            ? DB.events.map(e=>`
              <div class="agenda-item">
                <span class="when-dot" style="background:var(--${e.tone==='warn'?'warn':e.tone==='navy'?'otr-navy':'otr-sky'})"></span>
                <div><div class="ai-t">${esc(e.t)}</div><div class="ai-c">${esc(e.c)}</div></div>
                <span class="ai-w">${esc(e.when)}</span>
              </div>`).join('')
            : sessionsEmpty);

      const upcoming = `
        <div class="card">
          <div class="card-head"><h3>Próximas sesiones</h3><a href="#" data-go="my-bookings" style="font-size:12.5px">Ver todo</a></div>
          <div class="card-body" style="padding:6px 16px 12px">
            ${sessionsBody}
          </div>
        </div>`;

      /* ---- ⑤ DEBATE RANK (DB.debateRank; no-debatientes ven CTA de práctica) ---- */
      const dr = DB.debateRank || { rating: 1500, rd: 350, tier: 'Novato', provisional: true };
      const debateCard = `
        <div class="card card-pad">
          <div class="row between vcenter">
            <div><div class="eyebrow" style="margin-bottom:2px">Debate Rank</div><b style="font-size:15px">${esc(dr.tier)}</b></div>
            <span class="badge ${dr.provisional?'':'sky'}">${dr.provisional?'Provisional':'Estable'}</span>
          </div>
          <div class="row vcenter" style="gap:8px;margin:12px 0 4px">
            <span class="brand-font" style="font-size:30px;font-weight:800;color:var(--otr-navy)">${dr.rating}</span>
            <span class="muted" style="font-size:12.5px">rating ${dr.provisional?`(±${dr.rd})`:''}</span>
          </div>
          ${dr.provisional
            ? `<p class="faint" style="font-size:12.5px;margin:6px 0 12px">Rating provisional. Tu primera ronda lo pone en juego.</p>
               <button class="btn btn-primary btn-sm" style="width:100%" onclick="window.__debateTab='practice';go('debate')">${IC.mic} Juega tu primer debate de práctica</button>`
            : `<p class="faint" style="font-size:12.5px;margin:6px 0 12px">Cada ronda adjudicada te acerca al siguiente tier.</p>
               <button class="btn btn-soft btn-sm" style="width:100%" onclick="window.__debateTab='history';go('debate')">Ver historial ${IC.arrowR}</button>`}
        </div>`;

      /* ---- ⑥ ACHIEVEMENTS (badges recientes + "X para el siguiente") ---- */
      const badges = DB.badges || [];
      const earned = badges.filter(b=>b.got);
      const nextBadge = badges.find(b=>!b.got);
      const xpToNext = Math.max(0, (DB.xpNext||0) - (DB.xp||0));
      const achievements = `
        <div class="card card-pad">
          <div class="row between vcenter" style="margin-bottom:12px">
            <div><div class="eyebrow" style="margin-bottom:2px">Logros</div><b style="font-size:15px">${earned.length} de ${badges.length}</b></div>
            ${C.levelBadge(myLevel)}
          </div>
          <div class="row wrap" style="gap:7px">
            ${earned.slice(0,6).map(b=>`<span class="badge gold" title="${esc(b.d||'')}">${IC.medal} ${esc(b.n)}</span>`).join('') || `<span class="muted" style="font-size:12.5px">Sin insignias todavía. La primera cae con tu primera lección.</span>`}
          </div>
          <div class="divider"></div>
          ${C.bar(Math.max(0,Math.min(100,((DB.xp-DB.xpLevelStart)/((DB.xpNext-DB.xpLevelStart)||1))*100)),{cls:'thin navy'})}
          <div class="row between" style="font-size:12px;color:var(--text-2);margin-top:6px">
            <span class="tnum">${xpToNext.toLocaleString('es')} XP para ${nextName}</span>
            ${nextBadge?`<span class="sky" style="font-weight:600">Próx: ${esc(nextBadge.n)}</span>`:''}
          </div>
        </div>`;

      /* ---- BOTTOM: tira de leaderboard del cohort ---- */
      // STUDENT no recibe DB.students; usa DB.activity (timeline propio) como respaldo.
      const roster = (DB.students || []).slice(0, 5);
      const leaderboard = roster.length
        ? `<div class="card fade-up" style="--d:4;margin-top:18px">
            <div class="card-head"><h3>Leaderboard del cohort</h3><a href="#" onclick="return false" style="font-size:12.5px">Ver todo</a></div>
            <div class="card-body" style="padding:6px 16px 12px">
              ${roster.map((s,i)=>`<div class="agenda-item">
                <span class="badge ${i<3?'gold':''}" style="min-width:26px;justify-content:center">${i+1}</span>
                <div class="row vcenter" style="gap:9px;flex:1">${C.avatar(esc(s.i),{size:'sm'})}<div><div class="ai-t">${esc(s.n)}</div><div class="ai-c">${esc(s.lvl)}</div></div></div>
                <span class="ai-w tnum">${(s.xp||0).toLocaleString('es')} XP</span></div>`).join('')}
            </div>
          </div>`
        : `<div class="card fade-up" style="--d:4;margin-top:18px">
            <div class="card-head"><h3>Tu actividad reciente</h3></div>
            <div class="card-body" style="padding:6px 16px 12px">
              ${(DB.activity||[]).length ? DB.activity.slice(0,5).map(a=>`<div class="agenda-item"><span class="when-dot" style="background:var(--otr-sky)"></span>
                <div><div class="ai-t">${esc(a.title)}</div>${a.xp?`<div class="ai-c sky">+${a.xp} XP</div>`:a.detail?`<div class="ai-c">${esc(a.detail)}</div>`:''}</div>
                <span class="ai-w">${esc(a.when)}</span></div>`).join('') : `<p class="faint" style="font-size:13px;padding:10px 0">Sin actividad aún. Tu historial arranca con la primera lección.</p>`}
            </div>
          </div>`;

      return `
      ${heroNext}
      ${kpis}
      <div class="split fade-up" style="--d:2">
        <div class="stack" style="gap:16px">
          ${skillCard}
          ${recoCard}
        </div>
        <div class="stack" style="gap:16px">
          ${upcoming}
          ${debateCard}
          ${achievements}
        </div>
      </div>
      ${leaderboard}`;
    }
  };

  /* ---------------- VISTA DE CURSO ---------------- */
  S.course = {
    render() {
      // Curso ACTIVO (multi-curso). El hero, módulos, progreso y % derivan de aquí.
      const c = activeCourse();
      if (!c) {
        return `<div class="page-head"><div><div class="page-title">Tu entrenamiento empieza aquí</div><div class="page-sub">Elige tu primer programa y entra a entrenar.</div></div></div>
        <div class="card"><div class="empty"><div class="ill">${IC.book}</div><h4>Tu primer programa te espera</h4><p>Entrena con los coaches más dominantes — explora el catálogo.</p><button class="btn btn-primary btn-sm" onclick="go('catalog')">Explorar catálogo</button></div></div>`;
      }
      // Metadatos extra (estudiantes/lecciones) solo viven en DB.courses; los unimos por code.
      const meta = (DB.courses || []).find((x: any) => x.code === c.code) || {};
      const cMods = c.modules || [];
      const allItems = cMods.flatMap(m => m.items || []);
      const totalActs = allItems.length;
      const doneActs = allItems.filter(it => it.doneByMe).length;

      // SELECTOR "Mis cursos": solo si el alumno tiene >1 curso. Chip por curso con
      // nombre + progreso; al clicar fija window.__course y recarga la vista.
      const courseList = (DB.coursesContent || []);
      const selector = courseList.length > 1
        ? `<div class="course-switch row wrap fade-up" style="--d:0;gap:10px;margin-bottom:16px">
            ${courseList.map((x: any) => {
              const on = x.code === c.code;
              return `<button class="chip-course${on ? ' active' : ''}" onclick="window.__course='${esc(x.code)}';go('course')" style="display:flex;align-items:center;gap:10px;padding:9px 13px;border-radius:12px;border:1.5px solid ${on ? 'var(--otr-sky)' : 'var(--line)'};background:${on ? 'color-mix(in srgb,var(--otr-sky) 12%,#fff)' : '#fff'};cursor:pointer;text-align:left">
                <span class="cc-code" style="background:${x.color};color:#fff;border-radius:7px;padding:3px 7px;font-size:11px;font-weight:700">${esc(x.code)}</span>
                <span style="display:flex;flex-direction:column;line-height:1.25"><b style="font-size:12.5px;color:var(--text)">${esc(x.name)}</b><span class="muted tnum" style="font-size:11.5px">${x.progress || 0}% completado</span></span>
              </button>`;
            }).join('')}
          </div>`
        : '';

      // Layout de la vista del alumno (personalizable por el coach): modules (acordeón,
      // default) | grid (tarjeta por sección) | single (todas las secciones en una página).
      const layout = c.layout || 'modules';
      const itemRow = (it: any) => `
        <div class="mitem ${it.doneByMe?'done':''} ${it.locked?'lock':''}" ${!it.locked?`onclick="${it.type==='quiz'?`window.__quizLesson='${it.id}';`:''}window.__lesson='${it.id}';go('${destFor(it)}')"`:''}>
          <div class="mi-ic">${it.doneByMe?IC.check:C.typeIcon(it.type)}</div>
          <div class="mi-t">${esc(it.t)}</div>
          <div class="mi-meta">${it.grade?C.badge(esc(it.grade),'ok'):''}${it.due?`<span style="color:var(--warn)">${esc(it.due)}</span>`:''}${it.dur?`<span>${esc(it.dur)}</span>`:''}${it.locked?IC.lock:''}</div>
        </div>`;
      const secIc = (m: any, mi: number) => `<span class="mh-ic ${m.done?'done':m.locked?'lock':''}" style="width:24px;height:24px;font-size:12px;flex:none">${m.done?IC.check:m.locked?IC.lock:`<b>${mi+1}</b>`}</span>`;
      const emptyMods = `<div class="card"><div class="empty" style="padding:32px"><div class="ill">${IC.book}</div><h4>Contenido en camino</h4><p>Tu coach está montando los módulos. En cuanto publique, entrenas.</p></div></div>`;
      let modules;
      if (!cMods.length) {
        modules = emptyMods;
      } else if (layout === 'grid') {
        modules = `<div class="grid g-2" style="gap:14px">${cMods.map((m,mi)=>`
          <div class="card card-pad fade-up" style="--d:${Math.min(mi,6)}">
            <div class="row vcenter between" style="gap:10px;margin-bottom:10px"><b class="row vcenter" style="gap:8px;font-size:14px;min-width:0">${secIc(m,mi)}<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(m.t)}</span></b><span class="badge sky" style="flex:none">${m.items.length}</span></div>
            <div class="stack" style="gap:3px">${m.items.map(itemRow).join('') || `<div class="faint" style="font-size:12px">Sin actividades.</div>`}</div>
          </div>`).join('')}</div>`;
      } else if (layout === 'single') {
        modules = `<div class="stack" style="gap:16px">${cMods.map((m,mi)=>`
          <div class="card card-pad fade-up" style="--d:${Math.min(mi,6)}">
            <div class="row vcenter" style="gap:8px;margin-bottom:8px">${secIc(m,mi)}<b style="font-size:14.5px">${esc(m.t)}</b>${m.done?'<span class="badge ok" style="flex:none">Completada</span>':m.locked?'<span class="badge" style="flex:none">Bloqueada</span>':''}</div>
            <div class="module-items" style="display:block">${m.items.map(itemRow).join('') || `<div class="faint" style="font-size:12px;padding:6px 0">Sin actividades.</div>`}</div>
          </div>`).join('')}</div>`;
      } else {
        modules = cMods.map((m,mi)=>`
        <div class="module ${mi===1?'open':''}">
          <div class="module-head" data-acc>
            <div class="mh-ic ${m.done?'done':m.locked?'lock':''}">${m.done?IC.check:m.locked?IC.lock:`<b>${mi+1}</b>`}</div>
            <div class="mh-text"><div class="mh-title">${esc(m.t)}</div><div class="mh-sub">${m.items.length} actividades${m.done?' · completada':m.locked?' · bloqueada':''}</div></div>
            <span class="chev">${IC.chevD}</span>
          </div>
          <div class="module-items">
            ${m.items.map(itemRow).join('')}
          </div>
        </div>`).join('');
      }

      // "Continuar": próxima actividad NO completada del curso ACTIVO. Fija
      // window.__lesson (y __quizLesson si aplica) y enruta por tipo antes de navegar.
      const flat = activeItemsFlat();
      const nextItem = flat.find(it => !it.doneByMe) || flat[0] || null;
      const continueBtn = nextItem
        ? `<button class="btn btn-primary" onclick="${nextItem.type==='quiz'?`window.__quizLesson='${esc(nextItem.id)}';`:''}window.__lesson='${esc(nextItem.id)}';go('${destFor(nextItem)}')">Continuar ${IC.arrowR}</button>`
        : `<button class="btn btn-primary" disabled style="opacity:.55;cursor:default">Sin actividades</button>`;

      // Promedio real del alumno (DB.myGrades.avg). Sin notas → se omite la fila.
      const avgGrade = (DB.myGrades && typeof DB.myGrades.avg === 'number') ? DB.myGrades.avg : null;
      const hasAvg = avgGrade != null && (DB.myGrades?.submitted || 0) > 0;

      // Barra de "vista previa" para el profesor/admin (ve el curso como alumno) con
      // botón de volver al constructor.
      const isPreview = (DB.me?.role === 'teacher' || DB.me?.role === 'admin');
      const previewBar = isPreview
        ? `<div class="card card-pad fade-up" style="--d:0;margin-bottom:14px;background:color-mix(in srgb,var(--otr-sky) 8%,#fff);border-color:var(--otr-sky)"><div class="row between vcenter" style="gap:10px;flex-wrap:wrap"><span class="row vcenter" style="gap:8px;font-size:13px"><span style="display:flex;width:16px;color:var(--otr-sky-lo)">${IC.eye}</span><b>Vista previa</b> — así ve este curso un alumno</span><button class="btn btn-soft btn-sm" data-go="course-builder">${IC.chevL} Volver al constructor</button></div></div>`
        : '';
      return `
      ${previewBar}
      ${selector}
      <div class="course-hero fade-up" style="--d:0">
        <div class="ch-banner" style="background:linear-gradient(120deg,${c.color},var(--otr-navy))">
          <div class="stripes"></div>
          <span class="cc-code" style="position:relative;z-index:2">${esc(c.code)}</span>
        </div>
        <div class="ch-body">
          <div style="flex:1;min-width:220px">
            <h2 style="font-size:20px;font-weight:800;letter-spacing:var(--track-tight)">${esc(c.name)}</h2>
            <div class="row vcenter wrap" style="gap:10px 12px;margin-top:8px;font-size:13px;color:var(--text-2)">
              <span class="row vcenter" style="gap:6px">${C.avatar('SM',{size:'sm'})} ${esc(c.coach)}</span>
              ${meta.students!=null?`<span class="dot-sep"></span><span>${meta.students} estudiantes</span>`:''}
              ${meta.lessons!=null?`<span class="dot-sep"></span><span>${meta.lessons} lecciones</span>`:''}
            </div>
          </div>
          <div class="row vcenter" style="gap:18px">
            ${C.ring(c.progress, 64)}
            <div class="stack" style="gap:8px">
              ${continueBtn}
              <button class="btn btn-ghost btn-sm" onclick="go('course-index')">Índice del curso</button>
            </div>
          </div>
        </div>
      </div>

      <div class="tabs fade-up" style="--d:1">
        <button class="tab active">Contenido</button>
        <button class="tab" onclick="go('grades')">Calificaciones</button>
      </div>

      <div class="split fade-up" style="--d:2">
        <div>${modules}</div>
        <div class="stack" style="gap:16px">
          <div class="card card-pad">
            <b style="font-size:14px">Tu progreso</b>
            <div class="row vcenter between" style="margin:14px 0 8px"><span class="muted" style="font-size:13px">${doneActs} de ${totalActs} actividades</span><b class="sky">${c.progress}%</b></div>
            ${C.bar(c.progress)}
            ${hasAvg ? `<div class="divider"></div>
            <div class="row between" style="font-size:13px"><span class="muted">Promedio actual</span><b>${avgGrade}%</b></div>` : ''}
          </div>
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
      // Índice del curso ACTIVO (no del primer curso fijo).
      const c = activeCourse();
      const all = [];
      (c?.modules || []).forEach((m,mi)=>{ (m.items||[]).forEach(it=>all.push({...it,unit:`U${mi+1}`})); });

      // KPIs reales: % completado del curso, total de actividades y tiempo estimado
      // (suma de las duraciones "Nn min" de los items que la declaren; se omite si 0).
      const totalActs = all.length;
      const totalMin = all.reduce((s,it)=>{ const m = /(\d+)\s*min/i.exec(it.dur||''); return s + (m ? Number(m[1]) : 0); }, 0);
      const timeLabel = totalMin >= 60 ? `~${Math.round(totalMin/60)}h` : totalMin > 0 ? `${totalMin} min` : null;
      return `
      <div class="page-head fade-up" style="--d:0"><div>
        <div class="page-title">Índice del curso</div>
        <div class="page-sub">${esc(c?.name || 'Curso')} · todo tu plan, actividad por actividad</div>
      </div><button class="btn btn-ghost" onclick="go('course')">${IC.chevL} Volver al curso</button></div>

      <div class="grid g-3 fade-up" style="--d:1;margin-bottom:20px">
        <div class="tile">${C.kpi('Completado',String(c?.progress ?? 0),{unit:'%',ic:'checkCircle'})}</div>
        <div class="tile">${C.kpi('Actividades',String(totalActs),{ic:'grid'})}</div>
        ${timeLabel ? `<div class="tile">${C.kpi('Tiempo estimado',timeLabel,{ic:'clock'})}</div>` : ''}
      </div>

      <div class="table-wrap scroll-m fade-up" style="--d:2">
        <table class="tbl">
          <thead><tr><th>Actividad</th><th>Unidad</th><th>Tipo</th><th class="center">Estado</th><th class="num">Nota</th></tr></thead>
          <tbody>
            ${all.length ? all.map(it=>`<tr style="cursor:pointer" ${!it.locked?`onclick="${it.type==='quiz'?`window.__quizLesson='${it.id}';`:''}window.__lesson='${it.id}';go('${destFor(it)}')"`:''}>
              <td><div class="row vcenter" style="gap:10px"><span style="display:flex;width:18px;color:var(--text-2)">${C.typeIcon(it.type)}</span><b style="font-weight:600">${esc(it.t)}</b></div></td>
              <td><span class="tag-soft">${esc(it.unit)}</span></td>
              <td class="muted" style="text-transform:capitalize">${({video:'Video',lesson:'Lección',quiz:'Quiz',assign:'Tarea',mic:'Grabación'})[it.type]||esc(it.type)}</td>
              <td class="center">${it.done?C.badge('Hecho','ok',{dot:1}):it.locked?C.badge('Bloqueado','',{dot:1}):C.badge('Pendiente','warn',{dot:1})}</td>
              <td class="num">${it.grade?esc(it.grade):'—'}</td>
            </tr>`).join('') : `<tr><td colspan="5"><div class="empty" style="padding:32px"><div class="ill">${IC.grid}</div><h4>El plan se está armando</h4><p>Tu coach está cargando actividades. Pronto tendrás ruta.</p></div></td></tr>`}
          </tbody>
        </table>
      </div>`;
    }
  };

  /* ---------------- LECCIÓN / CONTENIDO ---------------- */
  S.lesson = {
    render() {
      const lid = (window as any).__lesson;
      const { lesson: L, course: Lcourse } = lid ? findLesson(lid) : { lesson: null, course: null };
      const hasL = !!L;
      const title = hasL ? esc(L.t) : "Claim · Warrant · Impact";
      const embed = hasL ? videoEmbedHtml(L.videoKind, L.videoSrc) : "";

      // Prosa demo SOLO cuando no hay ninguna lección seleccionada (entrada legacy
      // sin window.__lesson). NUNCA se inyecta como relleno de una lección real.
      const defaultProse = `
            <p>Un argumento sólido no es una opinión más fuerte: es una <b>estructura</b>. En OTR entrenamos cada contención sobre tres piezas que el juez puede seguir sin esfuerzo.</p>
            <h2 id="s1">1. Claim — la afirmación</h2>
            <p>Es la oración que quieres que el juez crea. Debe ser específica, defendible y relevante para la resolución. Si no puedes escribirla en una sola línea, todavía no la tienes.</p>
            <div class="callout"><b>Regla OTR:</b> si tu claim necesita "y además…", probablemente son dos claims. Sepáralos.</div>
            <h2 id="s2">2. Warrant — el porqué</h2>
            <p>El warrant es la lógica o evidencia que conecta tu claim con la realidad. Aquí vive el 80% del trabajo. Un buen warrant responde: <i>¿por qué es esto cierto?</i></p>
            <ul><li>Evidencia empírica (datos, estudios, ejemplos).</li><li>Razonamiento causal (A provoca B).</li><li>Principios y analogías.</li></ul>
            <h2 id="s3">3. Impact — el porqué importa</h2>
            <p>El impacto traduce tu argumento al lenguaje del juez: ¿qué cambia en el mundo si tienes razón? Magnitud, probabilidad y tiempo. Sin impacto, ganaste la lógica pero perdiste la ronda.</p>`;

      // Cuerpo: (1) lección real con notas → su HTML; (2) lección real sin notas
      // pero con video → nota neutra (no la prosa demo); (3) lección real sin nada
      // → estado vacío; (4) sin lección seleccionada → prosa demo legacy.
      let body;
      if (hasL) {
        if (L.contentHtml) body = `<div class="prose">${L.contentHtml}</div>`;
        else if (embed) body = `<p class="faint" style="font-size:13px;margin-top:4px">Sin notas de texto para esta lección.</p>`;
        else body = `<div class="empty" style="padding:32px"><div class="ill">${IC.book}</div><h4>Lección en preparación</h4><p>Tu coach todavía no publicó el contenido. Vuelve pronto.</p></div>`;
      } else {
        body = `<div class="prose">${defaultProse}</div>`;
      }

      // Navegación Anterior/Siguiente: recorre los items NO bloqueados del curso al
      // que pertenece la lección activa, en orden. Setea window.__lesson y enruta por
      // tipo. Vacío en los extremos (o sin lección).
      const seq = (Lcourse?.modules || []).flatMap(m => m.locked ? [] : (m.items || []).filter(it => !it.locked));
      const pos = hasL ? seq.findIndex(it => it.id === L.id) : -1;
      const prev = pos > 0 ? seq[pos - 1] : null;
      const next = pos >= 0 && pos < seq.length - 1 ? seq[pos + 1] : null;
      const navBtn = (it, label, dir) => it
        ? `<button class="btn btn-soft btn-sm" onclick="${it.type==='quiz'?`window.__quizLesson='${esc(it.id)}';`:''}window.__lesson='${esc(it.id)}';go('${destFor(it)}')">${dir==='prev'?`${IC.chevL} `:''}${label}${dir==='next'?` ${IC.arrowR}`:''}</button>`
        : `<button class="btn btn-soft btn-sm" disabled style="opacity:.45;cursor:default">${dir==='prev'?`${IC.chevL} `:''}${label}${dir==='next'?` ${IC.arrowR}`:''}</button>`;

      return `
      <div class="row between vcenter fade-up" style="--d:0;margin-bottom:6px">
        <span class="badge sky">${IC.book} Lección</span>
        ${hasL && L.dur ? `<span class="muted row vcenter" style="font-size:12.5px;gap:5px">${IC.clock} ${esc(L.dur)}</span>` : ''}
      </div>
      <div class="lesson-wrap fade-up" style="--d:1">
        <div>
          <h1 class="page-title" style="font-size:28px;margin-bottom:14px">${title}</h1>
          ${embed ? `<div class="player-stage" style="margin-bottom:18px">${embed}</div>` : ""}
          ${body}
          <div class="lesson-nav row vcenter between" style="gap:10px">
            ${hasL ? navBtn(prev, 'Anterior', 'prev') : `<span></span>`}
            <button class="btn btn-ghost" onclick="go('course')">${IC.chevL} Volver al curso</button>
            ${hasL ? navBtn(next, 'Siguiente', 'next') : `<span></span>`}
          </div>
        </div>
        <aside class="lesson-outline">
          <div class="ol-t">En esta lección</div>
          ${hasL
            ? `<a href="#" onclick="return false" class="active">${title}</a>`
            : `<a href="#s1" class="active">Claim — la afirmación</a>
          <a href="#s2">Warrant — el porqué</a>
          <a href="#s3">Impact — por qué importa</a>`}
          <div class="divider"></div>
          ${hasL && L.id
            ? (L.doneByMe
                ? `<button class="btn btn-soft btn-sm" data-action="mark-lesson-done" data-lesson="${esc(L.id)}" data-done="false">Completada ${IC.check}</button>`
                : `<button class="btn btn-primary btn-sm" data-action="mark-lesson-done" data-lesson="${esc(L.id)}" data-done="true">Marcar como completada</button>`)
            : `<label class="check"><input type="checkbox" /> Marcar como completada</label>`}
        </aside>
      </div>`;
    }
  };
