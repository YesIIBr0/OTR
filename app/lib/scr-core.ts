// @ts-nocheck
import { DB } from "./data";
import { C } from "./components";
import { IC } from "./icons";
import { esc } from "./esc";
import { videoEmbedHtml } from "./video";
import { t, tierLabel, getLang, registerDict, fmtDateTimeRD, fmtDayMonth } from "./i18n";
// [F4.1] Registra el diccionario de esta pantalla en SU chunk (fuera del inicial): core.* (directo) + debate.* (vía tierLabel → "debate.tier.*"). Ver app/lib/i18n.ts.
import { dict as d_core } from "./i18n-keys/core";
import { dict as d_debate } from "./i18n-keys/debate";
registerDict(d_core);
registerDict(d_debate);
// [EPIC-2] La sección "Cursos" unifica "Mis cursos" (S.course) + "Catálogo" (S.catalog).
// Reusamos el render/mount del catálogo (vive en scr-extra) sin duplicar su lógica.
// scr-extra NO importa scr-core → no hay ciclo.
import { S as extraScreens } from "./scr-extra";
// [UI-CURSOS U3] Las reservas del alumno se pintan BAJO los cursos: "Mis reservas" dejó de
// ser una pantalla propia. scr-mybookings sigue siendo el dueño de esa UI (render + mount);
// aquí solo se embebe. scr-mybookings NO importa scr-core → no hay ciclo.
import { renderBookings, mountBookings } from "./scr-mybookings";
export const S = {};

// Sub-tab activo de la sección Cursos. Patrón window.__x como el resto del SPA
// (cf. window.__debateTab). "mine" = cursos activos; "catalog" = buscar nuevos.
function coursesTab() {
  const v = (window as any).__coursesTab;
  return v === "catalog" ? "catalog" : "mine";
}

// [UI-CURSOS U2] Tab DENTRO de la tarjeta del curso: "content" (módulos) | "grades" (notas).
// Antes "Calificaciones" era un go('grades') que sacaba al alumno de la pantalla.
function courseTab() {
  return (window as any).__courseTab === "grades" ? "grades" : "content";
}

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

  /* ---------------- DASHBOARD (mockup 2026-08 · Task 4) ----------------
     Réplica del mockup aprobado (spec: docs/superpowers/specs/2026-08-07-dashboard-
     mockup-spec.md) con DATOS REALES de window.DB. Estructura:
       ① page-head (fecha + "Hola, {nombre}" + stats)  ② hero de la próxima clase
       ③ Próximos eventos (filtro Todos/Clases/Torneos) ④ aside "Tu rango"
       ⑤ aside "Logros"  ⑥ Clasificación general  ⑦ Lo mejor de la temporada
     Regla del PRD que se conserva: "nunca vacío, siempre UNA acción siguiente obvia"
     (el hero cae a retomar lección → explorar cursos cuando no hay clase agendada).
     Regla del plan: sección sin dato real → NO se renderiza (nada inventado). */

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

  /* ---- Helpers de fecha del dashboard ---------------------------------
     Todo se deriva de datos reales: los ISO de las reservas (slotAtIso) y la
     etiqueta ya formateada de los torneos (startsLabel, "mié 12 ago · 7:00 PM",
     el payload del alumno no trae ISO crudo). */
  const dashLoc = () => (getLang() === 'en' ? 'en-US' : 'es-ES');
  // "miércoles, 6 de agosto" — .ph-eyebrow lo pone en versalitas por CSS.
  function dashTodayLabel() {
    try { return new Date().toLocaleDateString(dashLoc(), { weekday: 'long', day: 'numeric', month: 'long' }); }
    catch (e) { return ''; }
  }
  function dashIsToday(ts) {
    if (!ts) return false;
    const d = new Date(ts), n = new Date();
    return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
  }
  // Día + mes corto para el .date-box, a partir de un ISO.
  function dashDateFromIso(iso) {
    const ts = Date.parse(iso || '');
    if (Number.isNaN(ts)) return null;
    const d = new Date(ts);
    let mon;
    try { mon = d.toLocaleDateString(dashLoc(), { month: 'short' }).replace('.', ''); } catch (e) { mon = ''; }
    return { ts, day: d.getDate(), mon };
  }
  // Mismo par día/mes pero leído de la etiqueta del torneo ("mié 12 ago · 7:00 PM").
  // Sin fecha reconocible (p. ej. "Por anunciar") devuelve null y la fila va sin tile.
  function dashDateFromLabel(label) {
    const m = /(\d{1,2})\s+([^\s·,]{3,})/.exec(String(label || ''));
    return m ? { ts: 0, day: m[1], mon: m[2].replace('.', '') } : null;
  }

  /* [MOCKUP V2 §6] Foto de fondo del héroe. La foto de marca es el FALLBACK y
     vive en el CSS (.hero-photo); esto solo emite la variable --hero-img cuando
     el DATO trae imagen propia — nada inventado. Solo se aceptan rutas del
     propio sitio o https (misma política que safeUrl en el servidor). */
  function heroImgVar(url) {
    const u = String(url || '');
    return /^(\/|https:\/\/)[^'"()\s]+$/.test(u) ? `;--hero-img:url('${esc(u)}')` : '';
  }

  /* [MOCKUP §3.7] Foto de una card de "Lo mejor de la temporada". Misma política
     de URL que heroImgVar (solo rutas del propio sitio o https, sin comillas ni
     paréntesis que puedan romper el url(...)); '' → la card queda negra plana. */
  function hlImgUrl(url) {
    const u = String(url || '');
    return /^(\/|https:\/\/)[^'"()\s]+$/.test(u) ? esc(u) : '';
  }

  /* [RONDA3 · Isaac] Enlace a la publicación de Instagram de un highlight. queries.ts ya
     lo saneó con safeUrl + http(s); aquí se vuelve a exigir absoluto http(s) porque el
     builder también corre con payloads viejos o de test. '' → la tarjeta NO navega. */
  function hlPostUrl(url) {
    const u = String(url || '');
    return /^https?:\/\/[^'"<>\s]+$/.test(u) ? esc(u) : '';
  }

  S.dashboard = {
    render() {
      const lang = getLang();
      const nf = (n) => Number(n || 0).toLocaleString(lang === 'en' ? 'en' : 'es');
      // DB.me.name YA viene esc() de queries.ts (contrato de escape) → no re-escapar.
      const firstName = (DB.me?.name || '').split(' ')[0] || '';
      const myLevel = DB.me?.level || 'OTR Initiate';
      // Escalera de niveles REAL (tabla Level, ya ordenada por position). El orden
      // canónico solo entra como respaldo si el payload no trajera los niveles.
      const levelNames = (Array.isArray(DB.levels) && DB.levels.length)
        ? DB.levels.map((l) => l.name)
        : ['OTR Initiate', 'OTR Apprentice', 'OTR Competitor', 'OTR Strategist', 'OTR Laureate'];
      const lvlIdx = levelNames.indexOf(myLevel);
      const levelNum = lvlIdx >= 0 ? lvlIdx + 1 : 1;
      const nextLevelName = lvlIdx >= 0 ? (levelNames[lvlIdx + 1] || '') : '';

      /* ---- ① CABECERA: fecha + saludo + stats REALES ---- */
      // Clasificación: solo si el usuario está en el leaderboard (opt-in, no menor).
      const lbMe = DB.leaderboard && DB.leaderboard.me ? DB.leaderboard.me : null;
      const lbRows = (DB.leaderboard && Array.isArray(DB.leaderboard.rows)) ? DB.leaderboard.rows : [];
      const lessonsDone = DB.lifetime?.ledger?.lessonsDone ?? null;
      const streak = DB.me?.streak ?? null;
      const stats = [
        lbMe ? C.statInline(`#${lbMe.rank}`, t('core.dashStatRank')) : '',
        lessonsDone != null ? C.statInline(nf(lessonsDone), t('core.dashStatLessons')) : '',
        streak != null ? C.statInline(nf(streak), t('core.dashStatStreak'), { accent: true }) : '',
      ].filter(Boolean).join('');
      const head = `
      <div class="page-head page-head--rule fade-up" style="--d:0">
        <div>
          <span class="ph-eyebrow">${esc(dashTodayLabel())}</span>
          <h1 class="ph-title">${t('core.dashHello')}, ${firstName}</h1>
        </div>
        ${stats ? `<div class="stat-group">${stats}</div>` : ''}
      </div>`;

      /* ---- Reservas próximas REALES (fuente del hero y del filtro "Clases") ---- */
      const bookings = (Array.isArray(DB.myBookings) ? DB.myBookings : [])
        .filter((b) => b && b.upcoming && (b.status === 'CONFIRMED' || b.status === 'PENDING'))
        .sort((a, b) => (Date.parse(a.slotAtIso) || 0) - (Date.parse(b.slotAtIso) || 0));
      /* [GOAL A4 · F2] El título es la CLASE (b.title, que arma queries.ts con el tema real
         del coach); el paquete ("Single") es metadato comercial, no título. b.packageName
         queda solo como respaldo para un payload viejo sin title. */
      const bookingTitle = (b) => b.title || b.packageName || t('core.dashSessionWith').replace('{coach}', b.coachName || 'Coach OTR');

      /* ---- ② HERO "TU PRÓXIMA CLASE" ---- */
      const nextB = bookings[0] || null;
      const nextTs = nextB ? (Date.parse(nextB.slotAtIso) || 0) : 0;
      const msToStart = nextTs ? nextTs - Date.now() : 0;
      const soon = !!nextTs && msToStart > 0 && msToStart <= 60 * 60 * 1000; // < 60 min
      const canJoin = !!(nextB && nextB.status === 'CONFIRMED' && nextB.videoUrl);
      let hero;
      if (nextB) {
        const cdSecs = Math.max(0, Math.floor(msToStart / 1000));
        const cd = `${Math.floor(cdSecs / 60)}:${String(cdSecs % 60).padStart(2, '0')}`;
        hero = `
        <section class="card--dark dash-hero hero-photo fade-up" style="--d:1${heroImgVar(nextB.coverUrl || nextB.image)}">
          <div class="dh-eyebrow">
            <span class="lbl">${t('core.dashNextClassEyebrow')}</span>
            ${(soon || dashIsToday(nextTs)) ? C.chip(soon ? t('core.dashLiveSoon') : t('core.dashToday'), 'accent', { cls: 'chip--dot' }) : ''}
          </div>
          <div class="dh-body">
            <div style="min-width:0">
              <div class="dh-mod">${t('core.dashWithCoach').replace('{coach}', nextB.coachName || 'Coach OTR')}</div>
              <h2 class="dh-title">${bookingTitle(nextB)}</h2>
              <div class="dh-meta">
                <span class="row vcenter" style="gap:7px">${IC.clock} ${esc(nextB.slotLabel || '')}</span>
                ${nextB.durationMin ? `<span class="dh-sep"></span><span>${nextB.durationMin} min</span>` : ''}
                ${/* [GOAL A4 · F2] El paquete ("Single") no desaparece: baja de título a metadato,
                     igual que ya lo pintan Mis Reservas y la Sala. Viene esc() de queries.ts. */''}
                ${nextB.packageName ? `<span class="dh-sep"></span><span>${nextB.packageName}</span>` : ''}
              </div>
            </div>
            <div class="dh-side">
              ${soon ? `<span class="lbl">${t('core.dashStartsIn')}</span><div class="dh-cd tnum" id="dash-cd" data-at="${esc(nextB.slotAtIso)}">${cd}</div>` : ''}
              ${canJoin
                ? C.btn(t('core.dashJoinCta'), 'accent', { size: 'lg', ic: 'video', attrs: `data-dash-room="${esc(nextB.id)}"` })
                : C.btn(t('core.view'), 'outline', { size: 'lg', icRight: 'arrowR', attrs: 'data-go="course"' })}
            </div>
          </div>
        </section>`;
      } else {
        // Sin clase agendada: el hero conserva UNA acción obvia con dato real
        // (retomar la lección pendiente) y, si no hay curso, explorar el catálogo.
        const nextL = nextLessonItem();
        const cta = nextL
          ? C.btn(t('core.naResumeCta'), 'accent', { size: 'lg', ic: 'play', attrs: `data-dash-lesson="${esc(nextL.id)}" data-dash-dest="${destFor(nextL)}"` })
          : C.btn(t('core.dashExploreCourses'), 'accent', { size: 'lg', icRight: 'arrowR', attrs: 'data-go="catalog"' });
        hero = `
        <section class="card--dark dash-hero hero-photo fade-up" style="--d:1${heroImgVar(activeCourse()?.image)}">
          <div class="dh-eyebrow"><span class="lbl">${t('core.dashNoClassEyebrow')}</span></div>
          <div class="dh-body">
            <div style="min-width:0">
              <h2 class="dh-title">${nextL ? t('core.dashResumeTitle').replace('{lesson}', esc(nextL.t)) : t('core.dashNoClassTitle')}</h2>
              <div class="dh-meta"><span>${nextL ? esc(activeCourse()?.name || '') : t('core.dashNoClassSub')}</span></div>
            </div>
            <div class="dh-side">${cta}</div>
          </div>
        </section>`;
      }

      /* ---- ③ PRÓXIMOS EVENTOS (clases reales + torneos reales) ---- */
      const filter = ['classes', 'tournaments'].includes((window as any).__dashFilter) ? (window as any).__dashFilter : 'all';
      const classRows = bookings.map((b) => {
        const dt = dashDateFromIso(b.slotAtIso);
        const live = dt ? dashIsToday(dt.ts) : false;
        const join = b.status === 'CONFIRMED' && b.videoUrl;
        return {
          kind: 'classes', sort: dt ? dt.ts : 0, live,
          html: `
          <div class="evrow${live ? ' evrow--live' : ''}">
            ${dt ? C.dateBox(dt.day, dt.mon, live) : '<span></span>'}
            <div class="ev-main">
              ${C.chip(live ? t('core.dashChipLiveClass') : t('core.dashChipClass'), live ? 'black' : 'info', { ic: 'video' })}
              <div class="ev-title">${bookingTitle(b)}</div>
              <div class="ev-meta">
                <span class="row vcenter" style="gap:6px">${IC.clock} ${esc(b.slotLabel || '')}</span>
                <span class="row vcenter" style="gap:6px">${IC.user} ${b.coachName || 'Coach OTR'}</span>
              </div>
            </div>
            <div class="ev-actions">${join
              ? C.btn(t('core.join'), 'accent', { ic: 'video', attrs: `data-dash-room="${esc(b.id)}"` })
              : C.btn(t('core.view'), 'outline', { icRight: 'arrowR', attrs: 'data-go="course"' })}</div>
          </div>`,
        };
      });
      const tourRows = (Array.isArray(DB.tournaments) ? DB.tournaments : []).map((tr) => {
        const dt = dashDateFromLabel(tr.startsLabel);
        const live = tr.status === 'LIVE';
        return {
          kind: 'tournaments', sort: 0, live,
          html: `
          <div class="evrow${live ? ' evrow--live' : ''}">
            ${dt ? C.dateBox(dt.day, dt.mon, live) : '<span></span>'}
            <div class="ev-main">
              ${C.chip(t('core.dashChipTournament'), 'accent', { ic: 'trophy' })}
              <div class="ev-title">${tr.name || ''}</div>
              <div class="ev-meta">
                <span class="row vcenter" style="gap:6px">${IC.clock} ${tr.startsLabel || ''}</span>
                ${tr.format ? `<span class="row vcenter" style="gap:6px">${IC.flag} ${tr.format}</span>` : ''}
                ${/* [MOCKUP §3.4] La modalidad ES el "lugar" de la fila → chincheta. */''}
                ${tr.modality ? `<span class="row vcenter" style="gap:6px">${IC.mapPin} ${tr.modality}</span>` : ''}
              </div>
            </div>
            <div class="ev-actions">${tr.registered
              ? C.chip(t('core.dashRegistered'), 'tint', { ic: 'check' })
              : C.btn(t('core.dashRegister'), 'primary', { icRight: 'arrowR', attrs: 'data-go="events"' })}</div>
          </div>`,
        };
      });
      const allRows = [...classRows, ...tourRows];
      const shownRows = allRows.filter((r) => filter === 'all' || r.kind === filter);
      const filterChip = (k, label) => `<button class="chip ${filter === k ? 'chip--black' : 'chip--outline'} dash-filter" data-dash-filter="${k}" type="button">${label}</button>`;
      const eventsSection = allRows.length ? `
      <section class="fade-up" style="--d:2">
        ${C.secTitle(t('core.dashEventsTitle'), { right: `
          ${filterChip('all', t('core.dashFilterAll'))}
          ${classRows.length ? filterChip('classes', t('core.dashFilterClasses')) : ''}
          ${tourRows.length ? filterChip('tournaments', t('core.dashFilterTournaments')) : ''}` })}
        ${/* [MOCKUP V2 §7] La card NO lleva .card-pad: cada .evrow trae su propio
              padding y va a sangre hasta el borde (adiós --ev-bleed). */''}
        <div class="card dash-events">
          ${shownRows.length ? shownRows.map((r) => r.html).join('') : `<p class="faint" style="font-size:13px">${t('core.dashEventsEmpty')}</p>`}
        </div>
      </section>` : '';

      /* ---- ④ ASIDE · TU RANGO (nivel real + progreso de XP real + tier real) ---- */
      const xp = DB.xp || 0;
      const xpStart = DB.xpLevelStart || 0;
      const xpNext = DB.xpNext || 0;
      // Anillo: % de XP recorrido dentro del nivel actual. Sin siguiente nivel el
      // anillo va lleno (tope de la escalera); con siguiente nivel pero sin umbral
      // de XP en el payload, vacío — nunca un 100% inventado.
      const pct = xpNext > xpStart
        ? Math.max(0, Math.min(100, Math.round(((xp - xpStart) / (xpNext - xpStart)) * 100)))
        : (nextLevelName ? 0 : 100);
      const xpToNext = Math.max(0, xpNext - xp);
      const tier = DB.debateRank?.tier ? tierLabel(DB.debateRank.tier) : '';
      const rankCard = `
      <div class="card--dark dash-rank">
        <div class="dr-head">
          <span class="lbl">${t('core.dashRankTitle')}</span>
          ${/* [MOCKUP §3.8] El badge de tier ("ORO") va con escudo, no con medalla. */''}
          ${tier ? C.chip(esc(tier), 'accent', { ic: 'shield' }) : ''}
        </div>
        <div class="dr-body">
          ${C.ringConic(pct, levelNum, t('core.dashLevelCap'))}
          <div style="min-width:0">
            <div class="dr-lvl">${esc(myLevel)}</div>
            <p class="dr-sub">${!nextLevelName
              ? t('core.dashMaxLevel')
              : xpToNext > 0
                ? t('core.dashXpToNext').replace('{xp}', nf(xpToNext)).replace('{level}', esc(nextLevelName))
                : t('core.dashNextLevel').replace('{level}', esc(nextLevelName))}</p>
          </div>
        </div>
      </div>`;

      /* ---- ⑤ ASIDE · LOGROS (badges reales; los no ganados van apagados) ---- */
      const badges = Array.isArray(DB.badges) ? DB.badges : [];
      const earned = badges.filter((b) => b.got);
      const tiles = [...earned.slice(-4)];
      if (tiles.length < 4) tiles.push(...badges.filter((b) => !b.got).slice(0, 4 - tiles.length));
      const badgesCard = badges.length ? `
      <div class="card dash-badges">
        <div class="db-head">
          ${C.secTitle(t('core.dashBadgesTitle'), { sm: true })}
          ${/* [MOCKUP §3.6] El encabezado muestra el XP TOTAL ganado con las insignias
               ("+1.240 XP"), no un contador de piezas. Si ninguna insignia otorga XP
               (dato viejo), cae al recuento de siempre para no dejar el hueco vacío. */''}
          ${(() => {
            const xpTotal = earned.reduce((s, b) => s + (Number(b.xp) || 0), 0);
            return xpTotal > 0
              ? `<span class="db-count tnum">${IC.zap} +${xpTotal.toLocaleString(lang === 'en' ? 'en' : 'es')} XP</span>`
              : `<span class="db-count tnum">${IC.zap} ${earned.length}/${badges.length}</span>`;
          })()}
        </div>
        ${tiles.length ? `<div class="db-grid">${tiles.map((b) => {
          /* [MOCKUP §3.6] Cada insignia trae SU icono (Badge.icon → DB.badges[].ic:
             flame / mic / target / medal / trophy / award…). IC.medal solo es el
             respaldo cuando el dato no trae icono o trae uno que no está en el set. */
          const bIc = (b.ic && IC[b.ic]) ? IC[b.ic] : IC.medal;
          /* Con XP real en el dato, el mockup muestra "+150 XP" en vez de la
             descripción; sin XP (0 o ausente) se conserva la descripción. */
          const bXp = Number(b.xp || 0);
          const bSub = bXp > 0
            ? `<span class="bt-xp tnum">${IC.zap}${t('core.dashBadgeXp').replace('{xp}', nf(bXp))}</span>`
            : `<span class="bt-s">${esc(b.d || '')}</span>`;
          return `
          <div class="badge-tile${b.got ? '' : ' badge-tile--off'}" title="${esc(b.d || '')}">
            <span class="bt-ic">${bIc}</span>
            <span style="min-width:0">
              <span class="bt-n">${esc(b.n)}</span>
              ${bSub}
            </span>
          </div>`;
        }).join('')}</div>`
        : `<p class="faint" style="font-size:12.5px;padding:0 18px 16px;margin:0">${t('core.dashBadgesEmpty')}</p>`}
        <a class="db-foot" href="#" data-go="badges">${t('core.dashAllBadges')} ${IC.arrowR}</a>
      </div>` : '';

      /* ---- ⑥ CLASIFICACIÓN ----------------------------------------------
         Con DB.leaderboard.period (temporada real: {label,endsInDays}) la card se
         titula "Clasificación de {label}" y la meta anuncia el cierre + premios,
         como el mockup. SIN period se queda EXACTAMENTE como hasta hoy
         ("Clasificación general" / "Por rating de debate"): nada inventado. */
      const lbPeriod = (DB.leaderboard && DB.leaderboard.period) ? DB.leaderboard.period : null;
      const lbTitle = (lbPeriod && lbPeriod.label)
        ? t('core.dashStandingsTitlePeriod').replace('{period}', esc(lbPeriod.label))
        : t('core.dashStandingsTitle');
      const lbDays = lbPeriod ? Math.max(0, Number(lbPeriod.endsInDays) || 0) : 0;
      const lbMeta = lbPeriod
        ? t(lbDays === 1 ? 'core.dashStandingsMetaPeriod1' : 'core.dashStandingsMetaPeriod').replace('{days}', nf(lbDays))
        : t('core.dashStandingsMeta');
      /* La cifra de la fila depende de POR QUÉ se ordena la tabla: la general ordena
         por rating Glicko (número pelado), la mensual por XP de la temporada (con
         sufijo "XP", como el mockup). Un mismo número con dos significados sin
         etiqueta sería mentirle al alumno. */
      const lbScore = (r) => (lbPeriod
        ? t('core.dashLbXp').replace('{xp}', nf(r.xp))
        : nf(r.rating));
      const podium = lbRows.slice(0, 3);
      const listRows = lbRows.slice(3, 8);
      const meInShown = lbRows.slice(0, 8).some((r) => r.you);
      const lbRow = (r, mine) => `
        <div class="lb-row${mine ? ' lb-row--me' : ''}">
          <span class="lb-pos tnum">${r.rank}</span>
          <span class="lb-name">${r.name || ''}${mine ? ` · ${t('core.youSuffix')}` : ''}</span>
          <span class="lb-xp tnum">${lbScore(r)}</span>
        </div>`;
      /* r.name YA viene esc() de queries.ts (contrato de escape) → crudo. r.prize es
         texto de CATÁLOGO (SeasonPrize), que queries.ts no escapa —igual que badges/
         events—, así que se escapa aquí. La cajita solo se pinta con premio real. */
      const podiumTile = (r, place) => `
        <div class="lb-tile${place === 1 ? ' lb-tile--1' : ''}${r.you ? ' lb-tile--me' : ''}">
          ${place === 1 ? `<span class="lb-crown">${IC.crown}</span>` : ''}
          <div class="lb-place tnum">${r.rank}</div>
          <div class="lb-tname">${r.name || ''}${r.you ? ` · ${t('core.youSuffix')}` : ''}</div>
          <div class="lb-txp tnum">${lbScore(r)}</div>
          ${r.prize ? `<div class="lb-prize">${esc(r.prize)}</div>` : ''}
        </div>`;
      // Con un cohorte de 3 o menos, la columna de la lista quedaría vacía: el
      // podio pasa a ocupar la card entera en vez de dejar medio bloque en blanco.
      /* [RONDA3] Fila de cortesía cuando el alumno cae fuera del top 8: la cifra tiene que
         ser la de ESTA tabla. Antes usaba `xp` (= DB.xp, la XP DE POR VIDA), así que en la
         tabla mensual se pintaba 3.120 XP junto a puestos de 840 XP. Con solo 3 elegibles
         nadie llegaba a esa rama; al poblar la temporada sí se alcanza. Ahora sale de
         `lbMe.xp`, que es la XP del mes que ya calcula queries.ts. */
      const listBody = (podium.length >= 3 ? listRows : lbRows.slice(0, 8)).map((r) => lbRow(r, !!r.you)).join('')
        + ((!meInShown && lbMe) ? lbRow({ rank: lbMe.rank, name: DB.me?.name || '', rating: lbMe.rating, xp: lbMe.xp ?? 0 }, true) : '');
      const standings = lbRows.length ? `
      <section class="card--dark card--glow dash-lb fade-up" style="--d:3">
        <div class="dlb-head">
          <div class="sec-title sec-title--on-dark"><h3>${IC.trophy} ${lbTitle}</h3></div>
          <span class="dlb-meta">${lbMeta}</span>
        </div>
        <div class="dlb-grid${listBody ? '' : ' dlb-grid--solo'}">
          ${podium.length >= 3 ? `<div class="lb-podium">
            ${podiumTile(podium[1], 2)}${podiumTile(podium[0], 1)}${podiumTile(podium[2], 3)}
          </div>` : ''}
          ${listBody ? `<div class="lb-list">${listBody}</div>` : ''}
        </div>
      </section>` : '';

      /* ---- ⑦ LO MEJOR DE LA TEMPORADA — solo con media real en la DB ------
         DB.highlights: [{ id, title, dateLabel, category, imageUrl, instagramUrl }]. Son
         textos de CATÁLOGO (tabla Highlight), que queries.ts NO escapa —igual que badges
         y events—, así que se escapan aquí.
         Sin imageUrl la card cae a negra plana: degrada sin hueco roto.
         [RONDA3 · Isaac] Dos correcciones pedidas por el cliente:
           · "Ver todo" ya NO manda a Eventos (eran cosas distintas): va a la pantalla
             propia `highlights`, la lista larga de 1 por fila.
           · Cada tarjeta enlaza a SU publicación de Instagram, en pestaña nueva y con
             rel="noopener noreferrer". Sin URL la tarjeta se queda en <article>: no
             navega a ningún sitio, que es mejor que un enlace roto. */
      const highlights = Array.isArray(DB.highlights) ? DB.highlights : [];
      const highlightsSection = highlights.length ? `
      <section class="fade-up" style="--d:4">
        ${C.secTitle(t('core.dashHighlightsTitle'), { right: `<a class="hl-all" href="#" data-go="highlights">${t('core.dashHighlightsAll')}</a>` })}
        <div class="hl-grid">
          ${highlights.slice(0, 4).map((h) => {
            const img = hlImgUrl(h.imageUrl);
            const post = hlPostUrl(h.instagramUrl);
            const inner = `
              ${img ? `<span class="hl-img" style="background-image:url('${img}')"></span>` : ''}
              ${h.category ? C.chip(esc(h.category), 'accent', { cls: 'hl-tag' }) : ''}
              <div class="hl-txt"><div class="hl-t">${esc(h.title || '')}</div><div class="hl-d">${esc(h.dateLabel || '')}</div></div>`;
            return post
              ? `<a class="hl hl--ig" href="${post}" target="_blank" rel="noopener noreferrer">${inner}</a>`
              : `<article class="hl">${inner}</article>`;
          }).join('')}
        </div>
      </section>` : '';

      return `
      ${head}
      <div class="dash-grid">
        <div class="dash-main">
          ${hero}
          ${eventsSection}
          ${standings}
          ${highlightsSection}
        </div>
        <aside class="dash-aside fade-up" style="--d:2">
          ${rankCard}
          ${badgesCard}
        </aside>
      </div>`;
    },

    mount(root, state) {
      const w = window as any;
      // Nunca dejar un countdown huérfano (repaint por filtro o navegación).
      if (w.__dashTimer) { clearInterval(w.__dashTimer); w.__dashTimer = null; }

      // Repinta SOLO la página (conserva el shell), igual que el Debate Hub.
      const repaint = () => {
        const page = root.querySelector('.page');
        if (!page) return;
        page.innerHTML = S.dashboard.render(state);
        S.dashboard.mount(root, state);
      };

      // Filtro Todos / Clases / Torneos.
      root.querySelectorAll('[data-dash-filter]').forEach((el) =>
        el.addEventListener('click', (e) => {
          e.preventDefault();
          w.__dashFilter = el.getAttribute('data-dash-filter');
          repaint();
        }));

      // "Únete": abre la sala on-platform de esa reserva.
      root.querySelectorAll('[data-dash-room]').forEach((el) =>
        el.addEventListener('click', (e) => {
          e.preventDefault();
          w.__room = el.getAttribute('data-dash-room');
          if (w.go) w.go('room');
        }));

      // Fallback del hero: retomar la lección pendiente.
      root.querySelectorAll('[data-dash-lesson]').forEach((el) =>
        el.addEventListener('click', (e) => {
          e.preventDefault();
          const id = el.getAttribute('data-dash-lesson');
          const dest = el.getAttribute('data-dash-dest') || 'lesson';
          w.__lesson = id;
          if (dest === 'quiz') w.__quizLesson = id;
          if (w.go) w.go(dest);
        }));

      // Countdown mm:ss del hero (solo se pinta si faltan < 60 min).
      const cd = root.querySelector('#dash-cd');
      if (cd) {
        const at = Date.parse(cd.getAttribute('data-at') || '');
        const tick = () => {
          const ms = at - Date.now();
          if (!(ms > 0)) { cd.textContent = '0:00'; clearInterval(w.__dashTimer); w.__dashTimer = null; return; }
          const s = Math.floor(ms / 1000);
          cd.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
        };
        tick();
        w.__dashTimer = setInterval(tick, 1000);
      }
    }
  };

  /* ---------------- VISTA DE CURSO ---------------- */
  // [UI-CURSOS U2] Panel COMPACTO de notas, dentro del curso. Lee DB.myGrades — el mismo
  // payload que alimenta "Mis calificaciones" del nav, que sigue existiendo como vista
  // completa (con todos los cursos). Aquí va lo que importa junto al temario: promedio,
  // tabla de actividades y el comentario escrito del coach.
  function renderGradesPanel() {
    const g = DB.myGrades || { rows: [], avg: 0, submitted: 0, total: 0, best: 0 };
    const rows = g.rows || [];
    if (!rows.length) {
      return `<div class="empty" style="padding:30px 20px">
        <div class="ill">${IC.chart}</div>
        ${/* [GOAL F3 · K-09] h2: cuelga directo del <h1> del curso. El estilo del vacío
              lo da .empty (clase), no el tag — ver screens.css §FIXES GOAL F3. */''}
        <h2>${t("core.gradesEmpty")}</h2>
        <p>${t("core.gradesEmptyBody")}</p>
      </div>`;
    }
    const stat = (label, value) =>
      `<div><div class="faint" style="font-size:11.5px;letter-spacing:.02em">${label}</div><b class="tnum" style="font-size:21px;line-height:1.2">${value}</b></div>`;
    return `
    <div class="row wrap" style="gap:26px;margin-bottom:16px">
      ${stat(t("core.gradesKpiAvg"), `${g.avg}%`)}
      ${stat(t("core.gradesKpiSubmitted"), `${g.submitted} / ${g.total}`)}
      ${stat(t("core.gradesKpiBest"), `${g.best}%`)}
    </div>
    <div class="table-wrap scroll-m">
      <table class="tbl">
        <thead><tr><th>${t("core.gradesColActivity")}</th><th class="num">${t("core.gradesColGrade")}</th><th class="center">${t("core.gradesColLetter")}</th></tr></thead>
        <tbody>${rows.map(r => {
          const numeric = typeof r.score === 'number' || /^\d+$/.test(String(r.score));
          // r.activity y r.feedback YA vienen esc() desde queries.ts — NO re-escapar.
          const hasFeedback = r.feedback && String(r.feedback).trim();
          return `<tr>
            <td><b style="font-weight:600">${r.activity}</b>${r.kind ? ` <span class="tag-soft">${esc(r.kind)}</span>` : ''}</td>
            <td class="num"><b>${esc(String(r.score))}${numeric ? '%' : ''}</b></td>
            <td class="center">${r.letter === '—' ? '<span class="faint">—</span>' : C.badge(esc(r.letter), r.letter[0] === 'A' ? 'ok' : 'sky')}</td>
          </tr>${hasFeedback ? `<tr><td colspan="3" style="padding-top:0">
            <div class="alert info" style="margin:0 0 4px"><span class="ai">${IC.target}</span><div><div class="at">${t("core.gradesCoachComment")}</div>${r.feedback}</div></div>
          </td></tr>` : ''}`;
        }).join('')}</tbody>
      </table>
    </div>`;
  }

  /* ============ [RONDA2 · CLASES] Menú de clases + "adentro" de la clase ============
     Homologación de la sección Cursos al mockup del cliente (2026-08, Isaac):
       · MENÚ ('course')        → una card por curso: progreso, siguiente clase y CTA.
       · ADENTRO ('course-detail') → hero de la clase en curso + "Sobre esta clase" +
         material de preparación + rail "Contenido del curso" + card del coach.
     Todo sale de DB (coursesContent / courses / myBookings): sección sin dato real NO se
     pinta. Contrato de escape: el payload viene esc() de queries.ts → aquí se renderiza
     CRUDO (re-escapar produciría "&amp;amp;"). Lo que NO viene del payload (it.due,
     it.dur, códigos) se escapa aquí. */

  // Clases del curso en orden, aplanadas, con su módulo y el bloqueo EFECTIVO
  // (el de la actividad o el de su módulo).
  function classesOf(c) {
    const out = [];
    (c?.modules || []).forEach((m, mi) => (m.items || []).forEach((it) => {
      out.push({ it, mi, locked: !!it.locked || !!m.locked });
    }));
    return out;
  }

  // La clase EN CURSO: la primera no completada y navegable. Con todo hecho, la última;
  // sin nada navegable, la primera del curso. null si el curso no tiene contenido.
  function currentClass(c) {
    const all = classesOf(c);
    const open = all.filter((x) => !x.locked);
    return open.find((x) => !x.it.doneByMe) || open[open.length - 1] || all[0] || null;
  }

  // Sesión EN VIVO de HOY para este curso. Booking no lleva courseId (es una reserva 1:1
  // del marketplace), así que el único vínculo REAL con el programa es el coach: una
  // reserva CONFIRMADA de hoy con el coach del curso. Sin coincidencia → null y el hero
  // cae a la variante "Próxima clase / Continuar". Nada se inventa.
  function liveSessionOf(c) {
    const coach = String(c?.coach || '').trim();
    if (!coach) return null;
    return (Array.isArray(DB.myBookings) ? DB.myBookings : []).find((b) =>
      b && b.status === 'CONFIRMED' && b.upcoming
      && String(b.coachName || '').trim() === coach
      && dashIsToday(Date.parse(b.slotAtIso || ''))) || null;
  }

  // Iniciales del avatar del coach (el payload del curso solo trae el nombre).
  function initialsOf(name) {
    const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    return (parts.slice(0, 2).map((w) => w[0]).join('') || 'C').toUpperCase();
  }

  // Hora RD de un ISO reusando el formateador i18n ("mar 11 ago · 4:00 PM" → "4:00 PM").
  function clsTime(iso) {
    const s = fmtDateTimeRD(iso, getLang());
    const i = s.indexOf(' · ');
    return i < 0 ? '' : s.slice(i + 3);
  }
  // Franja "4:00 PM – 5:00 PM" con la duración REAL de la reserva.
  function clsRange(iso, min) {
    const a = clsTime(iso);
    const ts = Date.parse(iso || '');
    if (!a || !min || Number.isNaN(ts)) return a;
    return `${a} – ${clsTime(new Date(ts + min * 60000).toISOString())}`;
  }
  // Fecha de entrega de una actividad. `dueAt` es la fecha REAL (se formatea en el idioma
  // activo); `due` es una etiqueta de texto libre heredada que el profesor escribió a mano
  // (y que por tanto viaja en su idioma). Se prefiere la fecha real cuando existe.
  function dueLabel(it) {
    if (it?.dueAt) { const s = fmtDateTimeRD(it.dueAt, getLang()); if (s) return s; }
    return it?.due ? esc(it.due) : '';
  }
  // Etiqueta del tipo de actividad (misma tabla que el índice del curso).
  function typeLabel(type) {
    return ({ video: t('core.typeVideo'), lesson: t('core.typeLesson'), quiz: t('core.typeQuiz'), assign: t('core.typeAssign'), mic: t('core.typeMic') })[type] || esc(String(type || ''));
  }
  // Icono del mockup por tipo de actividad (list-checks / presentation / file-text…).
  function clsMatIcon(type) {
    return ({ assign: IC.listChecks, quiz: IC.listChecks, mic: IC.mic, video: IC.presentation })[type] || IC.doc;
  }
  // Primer párrafo del contenido de la lección. contentHtml YA viene sanitizado del
  // servidor y S.lesson lo pinta crudo; aquí se reusa esa misma pieza como resumen.
  function firstParagraph(html) {
    const m = /<p[^>]*>([\s\S]*?)<\/p>/i.exec(String(html || ''));
    return m && m[1].trim() ? m[1] : '';
  }

  /* ---------------- MENÚ DE CLASES (sub-tab "Cursos activos") ----------------
     [DERIVADO] El share del cliente solo exponía el "adentro"; este menú se deriva del
     MISMO lenguaje visual (card r6 borde cálido, barra naranja, textos contenidos). */
  function renderMyCourses() {
    const list = (DB.coursesContent || []);
    if (!list.length) {
      // Sin cursos activos: empuja al catálogo cambiando de sub-tab (no a la ruta vieja).
      return `<div class="page-head"><div><h1 class="page-title">${t("core.courseEmptyTitle")}</h1><div class="page-sub">${t("core.courseEmptySub")}</div></div></div>
      <div class="card"><div class="empty"><div class="ill">${IC.book}</div><h2>${t("core.courseEnrollHeading")}</h2><p>${t("core.courseEnrollBody")}</p><button class="btn btn-primary btn-sm" data-courses-tab="catalog">${t("core.exploreCatalog")}</button></div></div>`;
    }

    const head = `
    <div class="page-head page-head--rule fade-up" style="--d:0">
      <div>
        <h1 class="ph-title">${t('core.clsMenuTitle')}</h1>
        <div class="page-sub">${list.length === 1 ? t('core.clsMenuSubOne') : t('core.clsMenuSubMany').replace('{n}', String(list.length))}</div>
      </div>
      ${C.btn(t('core.findCatalogCta'), 'outline', { ic: 'search', attrs: 'data-courses-tab="catalog"' })}
    </div>`;

    const cards = list.map((c, i) => {
      const all = classesOf(c);
      const total = all.length;
      const done = all.filter((x) => x.it.doneByMe).length;
      const cur = currentClass(c);
      const pct = typeof c.progress === 'number' ? c.progress : (total ? Math.round((done * 100) / total) : 0);
      const cta = cur
        ? C.btn(done > 0 ? t('core.continue') : t('core.clsStart'), 'accent', { icRight: 'arrowR', attrs: `data-cls-open="${esc(c.code)}"` })
        // Curso sin clases publicadas: el CTA no puede llevar a ningún sitio. Va en outline
        // y no en naranja — un botón muerto no debe ser lo más ruidoso de la card.
        : C.btn(t('core.clsStart'), 'outline', { disabled: true, attrs: 'aria-disabled="true"' });
      return `
      <article class="cls-card fade-up" style="--d:${Math.min(i + 1, 6)}">
        <div class="cls-card-h">
          <h2 class="cls-card-t"><button class="cls-open" data-cls-open="${esc(c.code)}">${c.name}</button></h2>
          ${c.format ? C.chip(c.format, 'outline') : ''}
        </div>
        <div class="cls-card-coach">${C.avatar(initialsOf(c.coach), { size: 'sm' })}<span>${c.coach}</span></div>
        <div class="cls-prog">
          <div class="cls-prog-top"><span>${t('core.clsOfClasses').replace('{done}', String(done)).replace('{total}', String(total))}</span><b class="cls-pct tnum">${pct}%</b></div>
          <div class="cls-bar"><i style="width:${Math.max(0, Math.min(100, pct))}%"></i></div>
        </div>
        <div class="cls-next">${cur
          ? `${t('core.clsNextPrefix')}: <b>${cur.it.t}</b>${dueLabel(cur.it) ? ` · ${dueLabel(cur.it)}` : ''}`
          : t('core.clsNoContentYet')}</div>
        <div class="cls-card-cta">${cta}</div>
      </article>`;
    }).join('');

    return `${head}<div class="cls-grid">${cards}</div>
    ${/* [UI-CURSOS U3] Las sesiones reservadas, bajo el menú de clases. */''}
    ${renderBookings()}`;
  }

  /* ---------------- ADENTRO DE LA CLASE (ruta 'course-detail') ----------------
     Réplica del mockup de Isaac: rejilla 748 + 24 + 348 sobre el contenido de 1120. */
  function renderCourseInside() {
    const c = activeCourse();
    if (!c) return renderMyCourses();

    const tab = courseTab();
    const all = classesOf(c);
    const total = all.length;
    const doneN = all.filter((x) => x.it.doneByMe).length;
    const cur = currentClass(c);
    const curIdx = cur ? all.findIndex((x) => x.it.id === cur.it.id) : -1;
    const pct = typeof c.progress === 'number' ? c.progress : (total ? Math.round((doneN * 100) / total) : 0);
    const live = liveSessionOf(c);

    // Barra de "vista previa" para el profesor/admin (ve el curso como alumno).
    const isPreview = (DB.me?.role === 'teacher' || DB.me?.role === 'admin');
    const previewBar = isPreview
      ? `<div class="card card-pad fade-up" style="--d:0;margin-bottom:14px;background:color-mix(in srgb,var(--otr-sky) 8%,#fff);border-color:var(--otr-sky)"><div class="row between vcenter" style="gap:10px;flex-wrap:wrap"><span class="row vcenter" style="gap:8px;font-size:13px"><span style="display:flex;width:16px;color:var(--otr-sky-lo)">${IC.eye}</span><b>${t("core.previewLabel")}</b> ${t("core.previewHint")}</span><button class="btn btn-soft btn-sm" data-go="course-builder">${IC.chevL} ${t("core.backToBuilder")}</button></div></div>`
      : '';

    // Breadcrumb: vuelve al MENÚ de clases (sub-tab de cursos), no al home.
    const crumb = `
    <div class="cls-crumb-row fade-up" style="--d:0">
      <button class="cls-back" data-cls-back>${IC.arrowL}<span>${t('core.clsBackToMenu')} · ${c.name}</span></button>
      <button class="btn btn-ghost btn-sm" data-go="course-index">${t('core.viewIndex')}</button>
    </div>`;

    // [UI-CURSOS U2] Contenido ⇄ Calificaciones siguen siendo sub-tabs in-place.
    const tabs = `
    <div class="tabs cls-tabs fade-up" style="--d:0">
      <button class="tab ${tab === 'content' ? 'active' : ''}" data-course-tab="content">${t("core.tabContent")}</button>
      <button class="tab ${tab === 'grades' ? 'active' : ''}" data-course-tab="grades">${t("core.tabGrades")}</button>
    </div>`;

    if (tab === 'grades') {
      return `${previewBar}${crumb}${tabs}<div class="card card-pad fade-up" style="--d:1" id="course-panel">${renderGradesPanel()}</div>`;
    }

    /* ---- ① HERO de la clase en curso ---- */
    const canJoin = !!(live && live.videoUrl);
    const heroChip = live
      ? C.chip(t('core.clsLiveToday'), 'accent', { ic: 'video' })
      : C.chip(t('core.clsNextClass'), 'outline', { ic: 'play' });
    const heroMeta = [
      live
        ? `<span class="cls-m">${IC.calendar}${t('core.clsToday')}, ${fmtDayMonth(live.slotAtIso, getLang())}</span>`
        : (dueLabel(cur?.it) ? `<span class="cls-m">${IC.calendar}${dueLabel(cur.it)}</span>` : ''),
      live
        ? `<span class="cls-m">${IC.clock}${clsRange(live.slotAtIso, live.durationMin)}</span>`
        : (cur?.it?.dur ? `<span class="cls-m">${IC.clock}${esc(cur.it.dur)}</span>` : ''),
      `<span class="cls-m">${C.avatar(initialsOf(c.coach), { size: 'sm' })}${c.coach}</span>`,
    ].filter(Boolean).join('<span class="cls-sep"></span>');
    const heroCta = canJoin
      ? `${C.btn(t('core.clsJoin'), 'accent', { size: 'lg', ic: 'video', attrs: `data-cls-room="${esc(live.id)}"` })}
         <span class="cls-hero-note">${IC.info}${t('core.clsJoinNote')}</span>`
      : (cur ? C.btn(t('core.continue'), 'accent', { size: 'lg', ic: 'play', attrs: `data-cls-lesson="${esc(cur.it.id)}" data-cls-dest="${destFor(cur.it)}"` }) : '');
    const hero = `
    <section class="cls-hero hero-photo fade-up" style="--d:1${heroImgVar(c.image)}">
      <div class="cls-hero-top">
        ${heroChip}
        ${cur ? `<span class="cls-hero-mod">${t('core.clsModuleClassOf').replace('{m}', String(cur.mi + 1)).replace('{i}', String(curIdx + 1)).replace('{n}', String(total))}</span>` : ''}
      </div>
      <h1 class="cls-hero-t">${cur ? cur.it.t : c.name}</h1>
      <div class="cls-hero-meta">${heroMeta}</div>
      ${heroCta ? `<div class="cls-hero-cta">${heroCta}</div>` : ''}
    </section>`;

    /* ---- ② "Sobre esta clase" + franja de datos ---- */
    const lead = firstParagraph(cur?.it?.contentHtml) || c.summary || '';
    // Celdas de la franja: SOLO datos reales. La tercera va en acento.
    const facts = [];
    if (live) {
      if (live.durationMin) facts.push([t('core.clsFactDuration'), t('core.clsMinutes').replace('{n}', String(live.durationMin)), false]);
      facts.push([t('core.clsFactFormat'), live.videoUrl ? t('core.clsLiveFormat') : (c.modality || c.format || ''), false]);
    } else {
      if (cur?.it?.dur) facts.push([t('core.clsFactDuration'), esc(cur.it.dur), false]);
      const fmt = [c.format, c.modality].filter(Boolean).join(' · ');
      if (fmt) facts.push([t('core.clsFactFormat'), fmt, false]);
    }
    if (dueLabel(cur?.it)) facts.push([t('core.clsFactDue'), dueLabel(cur.it), true]);
    else if (cur?.it?.maxPoints != null) facts.push([t('core.clsFactPoints'), String(cur.it.maxPoints), true]);
    else if (cur?.it?.type) facts.push([t('core.clsFactType'), typeLabel(cur.it.type), false]);
    const factsHtml = facts.length >= 2
      ? `<div class="cls-facts" style="grid-template-columns:repeat(${facts.length},1fr)">${facts.map(([l, v, hot]) =>
          `<div class="cls-fact"><span class="cls-fact-l">${l}</span><span class="cls-fact-v${hot ? ' is-hot' : ''}">${v}</span></div>`).join('')}</div>`
      : '';
    const about = `
      ${C.secTitle(t('core.clsAbout'), { tag: 'h2' })}
      <div class="card cls-about fade-up" style="--d:2">
        <p class="cls-about-p">${lead || t('core.clsAboutFallback')}</p>
        ${factsHtml}
      </div>`;

    /* ---- ③ Material de preparación: el resto de actividades del MISMO módulo ---- */
    const mats = cur ? all.filter((x) => x.mi === cur.mi && x.it.id !== cur.it.id) : [];
    const materials = mats.length ? `
      ${C.secTitle(t('core.clsMaterials'), { tag: 'h2' })}
      <div class="cls-mats fade-up" style="--d:3">
        ${mats.map((x) => {
          const pending = !x.it.doneByMe && (x.it.type === 'assign' || x.it.type === 'mic' || x.it.type === 'quiz');
          const action = pending ? t('core.clsMatPending') : x.it.doneByMe ? t('core.clsMatDone') : t('core.clsMatOpen');
          const meta = [typeLabel(x.it.type), x.it.dur ? esc(x.it.dur) : '', dueLabel(x.it)].filter(Boolean).join(' · ');
          return `<button class="cls-mat${pending ? ' is-pending' : ''}" ${x.locked ? 'disabled' : `data-cls-lesson="${esc(x.it.id)}" data-cls-dest="${destFor(x.it)}"`}>
            <span class="cls-mat-ic">${clsMatIcon(x.it.type)}</span>
            <span class="cls-mat-txt"><span class="cls-mat-n">${x.it.t}</span><span class="cls-mat-m">${meta}</span></span>
            <span class="cls-mat-a">${action}${pending ? IC.arrowR : IC.arrowUR}</span>
          </button>`;
        }).join('')}
      </div>` : '';

    /* ---- [EPIC-5] Video de bienvenida del curso (si el coach lo configuró) ---- */
    const welcomeEmbed = videoEmbedHtml(c.welcomeVideoKind, c.welcomeVideoSrc);
    const welcome = welcomeEmbed
      ? `${C.secTitle(t('core.welcomeVideoTitle'), { tag: 'h2' })}
         <div class="card card-pad fade-up" style="--d:4"><div style="position:relative;width:100%;aspect-ratio:16/9;border-radius:var(--r-lg);overflow:hidden;background:#000">${welcomeEmbed}</div></div>`
      : '';

    /* ---- ④ RAIL: "Contenido del curso" + card del coach ---- */
    const rows = all.map((x, i) => {
      const isNow = !!cur && x.it.id === cur.it.id;
      const st = isNow ? 'now' : x.it.doneByMe ? 'done' : x.locked ? 'lock' : 'next';
      const dot = st === 'now' ? IC.play : st === 'done' ? IC.check : st === 'lock' ? IC.lock : C.typeIcon(x.it.type);
      const status = isNow ? (live ? `${t('core.clsToday')} ${clsTime(live.slotAtIso)}` : t('core.clsNow')) : '';
      const meta = `${t('core.clsModuleN').replace('{n}', String(x.mi + 1))}${x.it.dur ? ` · ${esc(x.it.dur)}` : ''}`;
      return `<button class="cls-les is-${st}" ${x.locked && !isNow ? 'disabled' : `data-cls-lesson="${esc(x.it.id)}" data-cls-dest="${destFor(x.it)}"`}>
        <span class="cls-les-dot">${dot}</span>
        <span class="cls-les-txt"><span class="cls-les-t">${x.it.t}</span><span class="cls-les-m">${meta}</span></span>
        <span class="cls-les-s">${status}</span>
      </button>`;
    }).join('');
    const caption = cur
      ? t('core.clsTocCaption').replace('{done}', String(doneN)).replace('{total}', String(total)).replace('{m}', String(cur.mi + 1))
      : t('core.clsTocCaptionPlain').replace('{done}', String(doneN)).replace('{total}', String(total));
    const rail = `
    <aside class="cls-rail fade-up" style="--d:2">
      <div class="card cls-toc">
        <div class="cls-toc-head">
          <div class="cls-toc-row"><h3 class="cls-toc-t">${t('core.clsToc')}</h3><span class="cls-toc-pct tnum">${pct}%</span></div>
          <div class="cls-bar"><i style="width:${Math.max(0, Math.min(100, pct))}%"></i></div>
          <div class="cls-toc-cap">${caption}</div>
        </div>
        ${total ? `<div class="cls-toc-list">${rows}</div>` : `<div class="cls-toc-cap" style="padding:16px 20px">${t('core.clsNoContentYet')}</div>`}
        ${(c.dbId && total > 0 && doneN === total)
          ? `<div class="cls-toc-foot"><button class="btn btn-primary btn-block" data-claim-cert="${esc(c.dbId)}">${IC.award} ${t("core.claimCertificate")}</button></div>`
          : ''}
      </div>
      <div class="cls-coach">
        ${C.avatar(initialsOf(c.coach), { size: 'lg' })}
        <span class="cls-coach-txt"><span class="lbl">${t('core.clsYourCoach')}</span><b class="cls-coach-n">${c.coach}</b></span>
        <button class="cls-coach-btn" data-go="messages" aria-label="${t('core.clsMessageCoach').replace('{coach}', c.coach)}">${IC.msgCircle}</button>
      </div>
    </aside>`;

    // Curso sin clases publicadas: nada que describir ni que preparar. Se conserva el
    // vacío honesto de siempre (h2 colgando del h1 del hero — contrato K-09).
    const main = total
      ? `${hero}${about}${materials}${welcome}`
      : `${hero}<div class="card fade-up" style="--d:2"><div class="empty" style="padding:32px"><div class="ill">${IC.book}</div><h2>${t("core.modsEmptyHeading")}</h2><p>${t("core.modsEmptyBody")}</p></div></div>`;

    return `${previewBar}${crumb}${tabs}
    <div class="cls-in">
      <div class="cls-main">${main}</div>
      ${rail}
    </div>`;
  }

  // [EPIC-2] Barra de sub-tabs de la sección Cursos (estilo Debate Hub): "Mis cursos"
  // (cursos activos) y "Buscar nuevos" (catálogo). data-courses-tab cambia window.__coursesTab.
  function coursesSubTabs(active) {
    const tabs = [
      { k: 'mine',    l: t("core.coursesTabMine"),    ic: 'book' },
      { k: 'catalog', l: t("core.coursesTabCatalog"), ic: 'search' },
    ];
    return `
    <div class="tabs fade-up" style="--d:0" id="courses-tabs">
      ${tabs.map(x => `<button class="tab ${x.k === active ? 'active' : ''}" data-courses-tab="${x.k}"><span class="row vcenter" style="gap:6px"><span style="display:inline-flex;width:15px;height:15px">${IC[x.ic]}</span>${x.l}</span></button>`).join('')}
    </div>`;
  }

  // Cableado COMPARTIDO por el menú y el "adentro": abrir un curso, volver al menú,
  // abrir una clase del rail/material y entrar a la sala de la sesión en vivo.
  function mountClases(root) {
    const w = window as any;
    root.querySelectorAll('[data-cls-open]').forEach((el) =>
      el.addEventListener('click', (e) => {
        e.preventDefault();
        w.__course = el.getAttribute('data-cls-open');
        w.__courseTab = 'content';
        if (w.go) w.go('course-detail');
      }));
    root.querySelectorAll('[data-cls-back]').forEach((el) =>
      el.addEventListener('click', (e) => { e.preventDefault(); if (w.go) w.go('course'); }));
    root.querySelectorAll('[data-cls-lesson]').forEach((el) =>
      el.addEventListener('click', (e) => {
        e.preventDefault();
        const id = el.getAttribute('data-cls-lesson');
        const dest = el.getAttribute('data-cls-dest') || 'lesson';
        w.__lesson = id;
        if (dest === 'quiz') w.__quizLesson = id;
        if (w.go) w.go(dest);
      }));
    root.querySelectorAll('[data-cls-room]').forEach((el) =>
      el.addEventListener('click', (e) => {
        e.preventDefault();
        w.__room = el.getAttribute('data-cls-room');
        if (w.go) w.go('room');
      }));
  }

  // [EPIC-2] Sección "Cursos" unificada. Un solo item de nav (r:'course') con dos
  // sub-tabs; cada uno REUSA el render existente (no duplica lógica): "Mis cursos"
  // → renderMyCourses() (arriba); "Catálogo" → S.catalog.render() de scr-extra.
  S.course = {
    render() {
      const tab = coursesTab();
      const body = tab === 'catalog'
        ? extraScreens.catalog.render()
        : renderMyCourses();
      return `${coursesSubTabs(tab)}<div class="fade-up" style="--d:1" id="courses-body">${body}</div>`;
    },
    mount(root) {
      // Repinta la página conservando el shell. Lo comparten los dos cambios de tab.
      const repaint = (keepScroll) => {
        const page = root.querySelector('.page');
        if (!page) return;
        page.innerHTML = S.course.render();
        S.course.mount(root);
        const content = root.querySelector('#content') || root;
        if (content && !keepScroll) content.scrollTop = 0;
      };
      // [UI-NAV N1] Cambio de sub-tab: NAVEGA de verdad (course ⇄ catalog) en vez de repintar
      // solo la página. Ahora "Activos" y "Buscar nuevos" también son items del sidebar, y
      // repintar en sitio dejaba el sidebar marcando el tab equivocado.
      root.querySelectorAll('[data-courses-tab]').forEach(el =>
        el.addEventListener('click', (e) => {
          e.preventDefault();
          const tab = el.getAttribute('data-courses-tab');
          (window as any).__coursesTab = tab;
          const w = window as any;
          if (w.go) w.go(tab === 'catalog' ? 'catalog' : 'course'); else repaint(false);
        }));
      mountClases(root);
      // [UI-CURSOS U3] Cablea unirse/cancelar/reseñar del panel de reservas embebido.
      mountBookings(root);
      // Mount del tab Catálogo (si lo tuviera): reusa el mount existente de S.catalog.
      if (coursesTab() === 'catalog') extraScreens.catalog.mount?.(root);
    }
  };

  // [RONDA2] "Adentro" de la clase. Pantalla CON CONTEXTO (window.__course): al recargar
  // o volver con Atrás sin contexto fresco, el router la devuelve al menú ('course').
  S.courseDetail = {
    render() { return renderCourseInside(); },
    mount(root) {
      mountClases(root);
      // [UI-CURSOS U2] Contenido ⇄ Calificaciones: cambio EN SITIO dentro de la pantalla.
      // Conserva el scroll — el alumno no pierde el punto donde estaba mirando.
      root.querySelectorAll('[data-course-tab]').forEach(el =>
        el.addEventListener('click', (e) => {
          e.preventDefault();
          (window as any).__courseTab = el.getAttribute('data-course-tab');
          const page = root.querySelector('.page');
          if (!page) return;
          page.innerHTML = S.courseDetail.render();
          S.courseDetail.mount(root);
        }));
    },
  };

  // [EPIC-2] Wrappers de ENTRADA por ruta: fijan el sub-tab inicial y delegan en
  // S.course (el renderer puro, que solo LEE window.__coursesTab y nunca lo muta, para
  // que el cambio de sub-tab in-place se conserve). La ruta 'course' arranca en
  // "Mis cursos"; 'catalog' (y todos los go('catalog')/data-go="catalog" del SPA —
  // dashboard, perfil, hub, arsenal) arrancan en "Buscar nuevos". Mismo nav 'course',
  // mismo highlight de sidebar, sin duplicar lógica.
  S.coursesMine = {
    render() { (window as any).__coursesTab = 'mine'; return S.course.render(); },
    mount(root) { S.course.mount(root); },
  };
  S.coursesCatalog = {
    render() { (window as any).__coursesTab = 'catalog'; return S.course.render(); },
    mount(root) { S.course.mount(root); },
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
        <h1 class="page-title">${t("core.indexTitle")}</h1>
        <div class="page-sub">${c?.name || t("core.courseFallback")} · ${t("core.indexSub")}</div>
      </div><button class="btn btn-ghost" onclick="go('course')">${IC.chevL} ${t("core.backToCourse")}</button></div>

      <div class="grid g-3 fade-up" style="--d:1;margin-bottom:20px">
        <div class="tile">${C.kpi(t("core.kpiCompleted"),String(c?.progress ?? 0),{unit:'%',ic:'checkCircle'})}</div>
        <div class="tile">${C.kpi(t("core.kpiActivities"),String(totalActs),{ic:'grid'})}</div>
        ${timeLabel ? `<div class="tile">${C.kpi(t("core.kpiEstTime"),timeLabel,{ic:'clock'})}</div>` : ''}
      </div>

      <div class="table-wrap scroll-m fade-up" style="--d:2">
        <table class="tbl">
          <thead><tr><th>${t("core.thActivity")}</th><th>${t("core.thUnit")}</th><th>${t("core.thType")}</th><th class="center">${t("core.thStatus")}</th><th class="num">${t("core.thGrade")}</th></tr></thead>
          <tbody>
            ${all.length ? all.map(it=>`<tr style="cursor:pointer" ${!it.locked?`role="button" tabindex="0" onclick="${it.type==='quiz'?`window.__quizLesson='${it.id}';`:''}window.__lesson='${it.id}';go('${destFor(it)}')"`:''}>
              <td><div class="row vcenter" style="gap:10px"><span style="display:flex;width:18px;color:var(--text-2)">${C.typeIcon(it.type)}</span><b style="font-weight:600">${esc(it.t)}</b></div></td>
              <td><span class="tag-soft">${esc(it.unit)}</span></td>
              <td class="muted" style="text-transform:capitalize">${({video:t("core.typeVideo"),lesson:t("core.typeLesson"),quiz:t("core.typeQuiz"),assign:t("core.typeAssign"),mic:t("core.typeMic")})[it.type]||esc(it.type)}</td>
              <td class="center">${it.done?C.badge(t("core.statHecho"),'ok',{dot:1}):it.locked?C.badge(t("core.statBloqueado"),'',{dot:1}):C.badge(t("core.statPendiente"),'warn',{dot:1})}</td>
              <td class="num">${it.grade?esc(it.grade):'—'}</td>
            </tr>`).join('') : `<tr><td colspan="5"><div class="empty" style="padding:32px"><div class="ill">${IC.grid}</div><h2>${t("core.indexEmptyHeading")}</h2><p>${t("core.indexEmptyBody")}</p></div></td></tr>`}
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
      const title = hasL ? esc(L.t) : t("core.lessonDemoTitle");
      const embed = hasL ? videoEmbedHtml(L.videoKind, L.videoSrc) : "";

      // Prosa demo SOLO cuando no hay ninguna lección seleccionada (entrada legacy
      // sin window.__lesson). NUNCA se inyecta como relleno de una lección real.
      const defaultProse = t("core.lessonDemoProse");

      // Cuerpo: (1) lección real con notas → su HTML; (2) lección real sin notas
      // pero con video → nota neutra (no la prosa demo); (3) lección real sin nada
      // → estado vacío; (4) sin lección seleccionada → prosa demo legacy.
      let body;
      if (hasL) {
        if (L.contentHtml) body = `<div class="prose">${L.contentHtml}</div>`;
        else if (embed) body = `<p class="faint" style="font-size:13px;margin-top:4px">${t("core.lessonNoNotes")}</p>`;
        else body = `<div class="empty" style="padding:32px"><div class="ill">${IC.book}</div><h2>${t("core.lessonPrepHeading")}</h2><p>${t("core.lessonPrepBody")}</p></div>`;
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
        <span class="badge sky">${IC.book} ${t("core.lessonBadge")}</span>
        ${hasL && L.dur ? `<span class="muted row vcenter" style="font-size:12.5px;gap:5px">${IC.clock} ${esc(L.dur)}</span>` : ''}
      </div>
      <div class="lesson-wrap fade-up" style="--d:1">
        <div>
          <h1 class="page-title" style="font-size:var(--fs-28);margin-bottom:var(--s-4)">${title}</h1>
          ${embed ? `<div class="player-stage" style="margin-bottom:18px">${embed}</div>` : ""}
          ${body}
          <div class="lesson-nav row vcenter between" style="gap:10px">
            ${hasL ? navBtn(prev, t("core.prev"), 'prev') : `<span></span>`}
            <button class="btn btn-ghost" onclick="go('course')">${IC.chevL} ${t("core.backToCourse")}</button>
            ${hasL ? navBtn(next, t("core.next"), 'next') : `<span></span>`}
          </div>
        </div>
        <aside class="lesson-outline">
          <div class="ol-t">${t("core.inThisLesson")}</div>
          ${hasL
            ? `<a href="#" onclick="return false" class="active">${title}</a>`
            : `<a href="#s1" class="active">${t("core.lessonDemoOutline1")}</a>
          <a href="#s2">${t("core.lessonDemoOutline2")}</a>
          <a href="#s3">${t("core.lessonDemoOutline3")}</a>`}
          <div class="divider"></div>
          ${hasL && L.id
            ? (L.doneByMe
                ? `<button class="btn btn-soft btn-sm" data-action="mark-lesson-done" data-lesson="${esc(L.id)}" data-done="false" title="${t("core.unmarkDoneTitle")}">${IC.checkCircle} ${t("core.completedUndo")}</button>`
                : `<button class="btn btn-primary btn-sm" data-action="mark-lesson-done" data-lesson="${esc(L.id)}" data-done="true">${t("core.markComplete")}</button>`)
            : `<label class="check"><input type="checkbox" /> ${t("core.markComplete")}</label>`}
        </aside>
      </div>`;
    }
  };
