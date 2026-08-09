// @ts-nocheck
import { DB } from "./data";
import { C } from "./components";
import { IC } from "./icons";
import { esc } from "./esc";
import { matches } from "./text";
import { t, getLang, registerDict } from "./i18n";
// [F4.1] Registra el diccionario de esta pantalla en SU chunk (fuera del inicial): teacher.*. Ver app/lib/i18n.ts.
import { dict as d_teacher } from "./i18n-keys/teacher";
registerDict(d_teacher);
export const S = {};
  // [ISAAC 2026-08-09] El color iba INLINE y pisaba `.spark i{background:var(--n-600)}`
  // del kit (screens.css): el roster pintaba ~96 barritas naranjas y era la pantalla más
  // naranja del producto. Vuelve al gris del kit; --danger se conserva porque ahí el color
  // SÍ significa algo (alumno en riesgo). Única línea tocada de este archivo.
  const spark = (vals,color='var(--n-600)') => `<div class="spark">${vals.map(v=>`<i style="height:${v}%;background:${color}"></i>`).join('')}</div>`;

  /* ============================================================
     Helpers comunes del panel del profesor (gestión real)
     ============================================================ */

  // Refresco "suave": re-pide los datos reales y re-renderiza la pantalla actual.
  // refresh() global no existe (es local de Aula.tsx), así que lo reimplementamos
  // re-pidiendo /api/app-data y re-renderizando vía window.go (que reusa el shell).
  async function softRefresh(route = "teacher") {
    try {
      const res = await fetch("/api/app-data");
      if (res.ok) {
        const fresh = await res.json();
        const role = DB.me?.role; // conservamos el rol fijado por Aula.tsx
        Object.assign(DB, fresh);
        if (role) DB.me = { ...(fresh.me || {}), role };
      }
    } catch { /* silencioso: si falla la red, al menos re-renderiza con lo que hay */ }
    if (typeof window !== "undefined" && window.go) window.go(route);
  }

  /* [MOCKUP V2 · adjudicación] Día + mes corto para el .date-box del kit a partir de
     un ISO real (recordedAt de la solicitud). Sin fecha utilizable devuelve null y la
     fila se pinta sin tile — nada inventado. Mismo helper que el dashboard. */
  function adjDateFromIso(iso) {
    const ts = Date.parse(iso || "");
    if (Number.isNaN(ts)) return null;
    const d = new Date(ts);
    let mon;
    try { mon = d.toLocaleDateString(getLang() === "en" ? "en-US" : "es-ES", { month: "short" }).replace(".", ""); } catch { mon = ""; }
    return { day: d.getDate(), mon };
  }

  // Recorre teacherCourses y devuelve la lección por id (para prefills).
  function findLesson(id) {
    for (const c of (DB.teacherCourses || []))
      for (const m of (c.modules || []))
        for (const l of (m.lessons || []))
          if (l.id === id) return l;
    return null;
  }

  /* ============================================================
     PANEL DEL PROFESOR · TRACKING + GESTIÓN
     ============================================================ */
  S.teacher = {
    render() {
      const atRisk = DB.students.filter(s=>s.risk);
      const k = DB.teacherKpis || {avg:0,attendance:0,onTime:0,atRisk:0};
      const courses = DB.teacherCourses || [];
      const courseCount = courses.length;
      const moduleCount = courses.reduce((a,c)=>a+(c.modules?.length||0),0);
      const lessonCount = courses.reduce((a,c)=>a+(c.modules||[]).reduce((b,m)=>b+(m.lessons?.length||0),0),0);
      const quizCount = courses.reduce((a,c)=>a+(c.modules||[]).reduce((b,m)=>b+(m.lessons||[]).filter(l=>l.type==='quiz').length,0),0);
      // [COG-01] Pestañas: separar el seguimiento del grupo (tracking) de la gestión de contenido.
      const tab = (typeof window!=='undefined' && (window as any).__teacherTab === 'contenido') ? 'contenido' : 'grupo';

      return `
      <div class="page-head page-head--rule">
        <div><p class="ph-eyebrow">${t("teacher.eyebrow")}</p>
        <h1 class="ph-title">${t("teacher.title")}</h1>
        <div class="page-sub">${t("teacher.trackingSub").replace("{students}", `${DB.students.length} ${DB.students.length===1?t("teacher.studentUnitSingular"):t("teacher.studentUnitPlural")}`).replace("{courses}", `${courseCount} ${courseCount===1?t("teacher.courseUnitSingular"):t("teacher.courseUnitPlural")}`)}</div></div>
        <div class="row" style="gap:8px">
          <button class="btn btn-accent btn--sm" data-action="grade-subs">${IC.chart} ${t("teacher.gradeBtn")}</button>
        </div>
      </div>

      <div class="tabs fade-up" id="tr-tabs" style="--d:0">
        <button class="tab ${tab==='grupo'?'active':''}" data-teacher-tab="grupo"><span class="row vcenter" style="gap:6px"><span style="display:inline-flex;width:15px;height:15px">${IC.users}</span>${t("teacher.tabGroup")}</span></button>
        <button class="tab ${tab==='contenido'?'active':''}" data-teacher-tab="contenido"><span class="row vcenter" style="gap:6px"><span style="display:inline-flex;width:15px;height:15px">${IC.book}</span>${t("teacher.tabContent")}</span></button>
      </div>
      ${/* [MOCKUP V2 §1] Ritmo del v2: 26px entre bloques de sección (antes 18). */""}
      ${tab==='grupo' ? `<div class="grid g-4" style="margin-bottom:26px">
        <div class="tile tile--hero otr-shine fade-up" style="--d:0">${C.kpi(t("teacher.kpiAvg"),String(k.avg),{unit:'%',ic:'chart',accent:'var(--otr-green-text)'})}</div>
        <div class="tile fade-up" style="--d:1">${C.kpi(t("teacher.kpiAttendance"),String(k.attendance),{unit:'%',ic:'users'})}</div>
        ${/* [auditoría] el valor deriva de Enrollment.engagement (Alto/Medio/Bajo→%), no de entregas vs dueAt: se etiqueta como engagement, no como puntualidad medida */""}
        <div class="tile fade-up" style="--d:2">${C.kpi(t("teacher.kpiEngagement"),String(k.onTime),{unit:'%',ic:'chart'})}</div>
        <div class="tile fade-up" style="--d:3;border-color:color-mix(in srgb,var(--danger) 32%,transparent);background:var(--danger-soft)">${C.kpi(t("teacher.kpiAtRisk"),String(k.atRisk),{ic:'flag'})}</div>
      </div>

      <div class="split rail-320">
        <div class="fade-up">
          ${/* [ENT-06] Búsqueda + filtro de riesgo (cliente), consistente con Participantes */""}
          <div class="row vcenter" style="gap:8px;margin-bottom:10px">
            <div class="searchbox" style="flex:1"><span style="display:flex;width:16px;height:16px">${IC.search}</span><input id="tr-search" placeholder="${t("teacher.searchStudentPh")}" aria-label="${t("teacher.searchStudentAria")}"/></div>
            <span class="mkt-fbar" style="flex:none"><span class="chip" id="tr-risk" data-on="0" role="button" tabindex="0">${IC.flag} ${t("teacher.riskChip")}</span></span>
          </div>
          <div class="table-wrap scroll-m">
            <table class="tbl">
              <thead><tr><th>${t("teacher.thStudent")}</th><th>${t("teacher.thLevel")}</th><th class="num">${t("teacher.thGrade")}</th><th class="num">${t("teacher.thAttendance")}</th><th>${t("teacher.thEngagement")}</th><th class="center">${t("teacher.thTrend")}</th><th class="num">${t("teacher.thLastAccess")}</th></tr></thead>
              <tbody id="tr-body">
                ${DB.students.map(s=>`<tr data-name="${esc(String(s.n).toLowerCase())}" data-risk="${s.risk?'1':'0'}">
                  <td><div class="cell-user">${C.avatar(s.i,{size:'sm'})}<div class="nm">${esc(s.n)}</div>${s.risk?C.chip(t("teacher.riskBadge"), 'accent'):''}</div></td>
                  <td>${C.levelBadge(s.lvl)}</td>
                  <td class="num">${s.grade==null?'<span class="faint">—</span>':`<b style="color:${s.grade>=85?'var(--ok)':s.grade>=70?'var(--warn)':'var(--danger)'}">${s.grade}%</b>`}</td>
                  <td class="num tnum">${s.att==null?'—':`${s.att}%`}</td>
                  ${/* [auditoría] "—" (sin ActivityEvent aún) no es una clase eng-Alto/Medio/Bajo válida en CSS → se mapea a eng-none */""}
                  <td><span class="eng-pill eng-${s.eng==='—'?'none':s.eng}">${esc(s.eng)}</span></td>
                  <td class="center">${spark(s.trend==='up'?[40,55,50,68,72,80,88]:s.trend==='down'?[80,70,64,55,48,40,34]:[60,62,58,64,60,62,60], s.risk?'var(--danger)':'var(--n-600)')}</td>
                  <td class="num faint" style="font-size:12px">${esc(s.last)}</td>
                </tr>`).join('')}
              </tbody>
            </table>
            <div id="tr-empty" class="faint" style="display:none;padding:16px;text-align:center;font-size:13px">${t("teacher.noStudentsFilter")}</div>
          </div>
        </div>

        ${/* [MOCKUP V2 §5/§7] Las dos cards del rail pasan al patrón de lista del v2:
             la card no aporta padding, cada fila trae el suyo y va a sangre; el estado
             de la fila es texto plano (.adj-tag), no un chip con fondo. */""}
        <div class="stack" style="gap:26px">
          <div class="card adj-list adj-list--rail fade-up" style="--d:1">
            <div class="adj-head">${C.secTitle(t("teacher.needAttention"), { sm: true, right: atRisk.length ? C.chip(String(atRisk.length), "accent") : "" })}</div>
            ${atRisk.map(s=>`<div class="evrow">
                <div class="date-box">${C.avatar(s.i,{size:'sm',bg:'var(--danger)'})}</div>
                <div class="ev-main">
                  <span class="adj-tag adj-tag--alert">${t("teacher.riskBadge")}</span>
                  <div class="ev-title">${esc(s.n)}</div>
                  <div class="ev-meta">${s.att!=null&&s.att<70?t("teacher.lowAttendance"):t("teacher.noSubmissions")} · ${esc(s.last)}</div>
                </div>
                ${/* [GOAL S1] Botón SOLO-ICONO: `title` NO es un nombre accesible fiable (VoiceOver/NVDA
                     lo anuncian vacío). aria-label con el nombre del alumno, que además distingue los
                     N botones idénticos de la lista. s.n ya viene escapado de queries.ts (contrato de
                     escape: aquí se renderiza crudo). */""}
                <div class="ev-actions"><button class="btn btn-outline btn--sm" data-go="messages" aria-label="${t("teacher.sendMessageTo").split("{name}").join(s.n)}" title="${t("teacher.sendMessage")}">${IC.msg}</button></div>
              </div>`).join('')}
            ${atRisk.length?'':'<div class="empty"><div class="ill">'+IC.checkCircle+'</div><h4>'+t("teacher.noAlertsTitle")+'</h4><p>'+t("teacher.noAlertsBody")+'</p></div>'}
          </div>
          <div class="card adj-list adj-list--rail fade-up" style="--d:2">
            <div class="adj-head">${C.secTitle(t("teacher.pendingGradingTitle"), { sm: true, right: C.chip(String(DB.pendingSubs ?? 0), "black") })}</div>
            ${(DB.pendingSubs ?? 0) > 0
              ? `<div class="evrow">
                  <div class="date-box"><span class="adj-ic">${IC.mic}</span></div>
                  <div class="ev-main">
                    <div class="ev-title">${t("teacher.pendingSubsToReview").replace("{n}", `${DB.pendingSubs} ${DB.pendingSubs === 1 ? t("teacher.submissionUnitSingular") : t("teacher.submissionUnitPlural")}`)}</div>
                    <div class="ev-meta">${t("teacher.pendingGradingHint")}</div>
                  </div>
                </div>
                <div class="adj-foot"><button class="btn btn-accent btn--sm btn-block" data-action="grade-subs">${t("teacher.gradeSubmissions")}</button></div>`
              : `<div class="empty"><div class="ill">${IC.checkCircle}</div><h4>${t("teacher.allCaughtUpTitle")}</h4><p>${t("teacher.allCaughtUpBody")}</p></div>`}
          </div>
        </div>
      </div>` : this.managePanel({courseCount,moduleCount,lessonCount,quizCount})}`;
    },

    /* ---------------- PANEL DE GESTIÓN (Cursos → Módulos → Lecciones → Examen) ---------------- */
    managePanel({courseCount,moduleCount,lessonCount,quizCount}) {
      const courses = DB.teacherCourses || [];

      // [PRD-05] Tarjeta-resumen fina por curso. El árbol completo (Cursos → Módulos →
      // Lecciones → Examen) y su edición viven en el constructor canónico (S.manage,
      // scr-extra.ts) al que se llega con go("manage"). Aquí solo mostramos un resumen
      // y un único CTA que enruta al editor, evitando duplicar la jerarquía.
      const courseCard = (c, i = 0) => {
        const mods = c.modules || [];
        const lessons = mods.reduce((n, m) => n + (m.lessons?.length || 0), 0);
        const quizzes = mods.reduce((n, m) => n + (m.lessons || []).filter(l => l.type === 'quiz').length, 0);
        const pluralize = (n, sing, plur) => `${n} ${n === 1 ? sing : plur}`;
        return `<div class="card card-pad tm-course fade-up" style="margin-bottom:14px;--d:${i}">
        <div class="row between vcenter" style="gap:12px;flex-wrap:wrap">
          <div class="row vcenter" style="gap:10px;min-width:0">${C.courseDot(c.color)}
            <div style="min-width:0">
              <b style="font-size:15px;letter-spacing:-.01em">${esc(c.code)} · ${esc(c.name)}</b>
              <div class="faint" style="font-size:12px;margin-top:2px">${pluralize(mods.length,t("teacher.moduleUnitSingular"),t("teacher.moduleUnitPlural"))} · ${pluralize(lessons,t("teacher.lessonUnitSingular"),t("teacher.lessonUnitPlural"))} · ${pluralize(quizzes,t("teacher.quizUnitSingular"),t("teacher.quizUnitPlural"))}</div>
            </div>
          </div>
          <button class="btn btn-outline btn-sm" onclick="go('manage')" style="flex:none">${IC.sliders} ${t("teacher.editContentBtn")}</button>
        </div>
      </div>`;
      };

      const empty = `<div class="card"><div class="empty"><div class="ill">${IC.book}</div>
        <h4>${t("teacher.noCoursesTitle")}</h4><p>${t("teacher.noCoursesBody")}</p></div></div>`;

      return `
      <div class="kit-section" style="margin-top:28px">
        <div class="page-head page-head--rule" style="margin-bottom:14px">
          <div><p class="ph-eyebrow">${t("teacher.manageEyebrow")}</p>
          <h2 class="ph-title" style="font-size:22px">${t("teacher.manageTitle")}</h2>
          <div class="page-sub">${t("teacher.manageSub")}</div></div>
          <div class="row" style="gap:8px">
            <button class="btn btn-outline btn-sm" data-tm="resource">${IC.plus} ${t("teacher.resourceFileBtn")}</button>
            <button class="btn btn-primary btn-sm" onclick="go('manage')">${IC.sliders} ${t("teacher.fullEditorBtn")}</button>
          </div>
        </div>

        <div class="grid g-4" style="margin-bottom:16px">
          <div class="tile tile--hero fade-up" style="--d:0">${C.kpi(t("teacher.kpiCourses"),String(courseCount),{ic:'book',accent:'var(--otr-green-text)'})}</div>
          <div class="tile fade-up" style="--d:1">${C.kpi(t("teacher.kpiModules"),String(moduleCount),{ic:'grid'})}</div>
          <div class="tile fade-up" style="--d:2">${C.kpi(t("teacher.kpiLessons"),String(lessonCount),{ic:'doc'})}</div>
          <div class="tile fade-up" style="--d:3">${C.kpi(t("teacher.kpiQuizzes"),String(quizCount),{ic:'target'})}</div>
        </div>

        ${courses.length ? courses.map(courseCard).join('') : empty}
      </div>`;
    },

    /* ---------------- MOUNT: cablea el panel de gestión (quiz, uploads, recursos) ---------------- */
    mount(root) {
      if (!root) return;

      // [COG-01] Cambio de pestaña Grupo/Contenido (re-render, patrón de coachwork).
      root.querySelectorAll("[data-teacher-tab]").forEach((el) =>
        el.addEventListener("click", () => {
          (window as any).__teacherTab = el.getAttribute("data-teacher-tab");
          if (typeof window !== "undefined" && (window as any).go) (window as any).go("teacher");
        })
      );

      root.addEventListener("click", (e) => {
        const btn = e.target.closest && e.target.closest("[data-tm]");
        if (!btn || !root.contains(btn)) return;
        e.preventDefault();
        const kind = btn.getAttribute("data-tm");
        // [PRD-05] La autoría de examen/video por lección vive ahora en el editor
        // canónico (S.manage, scr-extra.ts). Aquí solo queda el alta de recurso suelto.
        if (kind === "resource") openResourceUpload();
      });

      // [ENT-06] Búsqueda + filtro de riesgo del roster (cliente, sobre las filas ya pintadas).
      const trBody = root.querySelector("#tr-body");
      const trSearch = root.querySelector("#tr-search");
      const trRisk = root.querySelector("#tr-risk");
      const trEmpty = root.querySelector("#tr-empty");
      if (trBody) {
        const applyTr = () => {
          const q = (trSearch && trSearch.value || "").trim();
          const riskOnly = trRisk && trRisk.getAttribute("data-on") === "1";
          let shown = 0;
          trBody.querySelectorAll("tr").forEach((tr) => {
            const name = tr.getAttribute("data-name") || "";
            const risk = tr.getAttribute("data-risk") === "1";
            const ok = (!q || matches(name, q)) && (!riskOnly || risk);
            tr.style.display = ok ? "" : "none";
            if (ok) shown++;
          });
          if (trEmpty) trEmpty.style.display = shown ? "none" : "";
        };
        trSearch && trSearch.addEventListener("input", applyTr);
        const toggleRisk = () => {
          const on = trRisk.getAttribute("data-on") === "1";
          trRisk.setAttribute("data-on", on ? "0" : "1");
          trRisk.classList.toggle("active", !on);
          applyTr();
        };
        trRisk && trRisk.addEventListener("click", toggleRisk);
        trRisk && trRisk.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleRisk(); } });
      }
    },
  };

  /* Exponemos los constructores reales para que el editor dedicado (S.manage,
     scr-extra.ts) y/o la delegación global de Aula.tsx puedan reusar EXACTAMENTE
     el mismo modal de autoría de examen/video/recurso. Las funciones son
     declaraciones hoisteadas, así que la asignación a window es segura aquí. */
  if (typeof window !== "undefined") {
    window.otrOpenQuizBuilder = openQuizBuilder;
    window.otrOpenLessonVideo = openLessonVideo;
    window.otrOpenResourceUpload = openResourceUpload;
  }

  /* ============================================================
     MODAL genérico (mismo look que Aula.tsx, pero local y sin
     depender de funciones internas no expuestas).
     ============================================================ */
  function buildModal({ title, bodyHtml, okLabel = t("teacher.save"), wide = false }) {
    const scrim = document.createElement("div");
    scrim.className = "modal-scrim";
    // [MOCKUP V2] .modal--v2: mismo criterio de aire que las pantallas (título 20/800,
    // campos separados 18px, botones del kit a 40px). Solo presentación.
    scrim.innerHTML = `<div class="modal modal--v2" role="dialog"${wide ? ' style="max-width:680px"' : ''}>
      <div class="modal-head"><h3>${esc(title)}</h3></div>
      <div class="modal-body">${bodyHtml}<p class="fm-err" style="color:var(--danger);font-size:13px;display:none;margin:8px 0 0"></p></div>
      <div class="modal-foot"><button class="btn btn-outline" data-x>${t("teacher.cancel")}</button><button class="btn btn-primary" data-ok>${esc(okLabel)}</button></div>
    </div>`;
    document.body.appendChild(scrim);
    const close = () => scrim.remove();
    const showErr = (msg) => { const el = scrim.querySelector(".fm-err"); if (el) { el.textContent = msg; el.style.display = "block"; } };
    scrim.addEventListener("click", (e) => { if (e.target === scrim || (e.target.closest && e.target.closest("[data-x]"))) close(); });
    return { scrim, close, showErr, body: scrim.querySelector(".modal-body"), okBtn: scrim.querySelector("[data-ok]") };
  }

  /* ============================================================
     1) CONSTRUCTOR DE QUIZ — UI dinámica (añadir/quitar preguntas
        y opciones), prefill desde DB.quizByLesson, guarda en
        /api/quizzes. Para 1 correcta usamos radio por pregunta.
     ============================================================ */
  function openQuizBuilder(lessonId, lessonTitle) {
    const existing = (DB.quizByLesson || {})[lessonId] || null;

    const head = `
      <div class="field" style="margin-bottom:12px">
        <label class="label">${t("teacher.quizTitleLabel")}</label>
        <input class="input" id="qz-title" placeholder="${t("teacher.quizTitlePh")}" value="${existing ? esc(existing.title) : ''}"/>
      </div>
      <div class="row" style="gap:12px;margin-bottom:12px">
        <div class="field" style="flex:1">
          <label class="label">${t("teacher.quizPassLabel")}</label>
          <input class="input" id="qz-pass" type="number" min="0" max="100" value="${existing ? existing.passScore : 60}"/>
        </div>
      </div>
      <div style="margin:6px 0 8px">${C.secTitle(t("teacher.quizQuestions"), { sm: true, right: `<button type="button" class="btn btn-outline btn--sm" id="qz-add-q">${IC.plus} ${t("teacher.quizAddQuestion")}</button>` })}</div>
      <div id="qz-questions" class="stack" style="gap:14px"></div>`;

    const m = buildModal({ title: t("teacher.quizModalTitle").replace("{lesson}", esc(lessonTitle || t("teacher.lessonFallback"))), bodyHtml: head, okLabel: t("teacher.quizSaveBtn"), wide: true });
    const qWrap = m.body.querySelector("#qz-questions");
    let qSeq = 0; // identificador local para agrupar radios por pregunta

    // Crea el DOM de UNA opción dentro de una pregunta.
    function optionNode(qid, opt) {
      const wrap = document.createElement("div");
      wrap.className = "qz-opt row vcenter";
      wrap.style.cssText = "gap:8px;margin:6px 0";
      wrap.innerHTML = `
        <input type="radio" name="correct-${qid}" class="qz-correct" ${opt && opt.correct ? "checked" : ""} title="${t("teacher.markCorrect")}" style="flex:none;width:16px;height:16px"/>
        <input class="input qz-opt-text" placeholder="${t("teacher.optionTextPh")}" value="${opt ? esc(opt.text) : ""}" style="flex:1"/>
        <button type="button" class="btn btn-quiet btn-sm qz-del-opt" title="${t("teacher.removeOption")}" style="color:var(--danger);flex:none">${IC.close}</button>`;
      wrap.querySelector(".qz-del-opt").addEventListener("click", () => {
        const opts = wrap.parentElement;
        if (opts.querySelectorAll(".qz-opt").length <= 2) { window.toast && window.toast(t("teacher.minTwoOptions"), "warn"); return; }
        wrap.remove();
      });
      return wrap;
    }

    // Crea el DOM de UNA pregunta (con sus opciones).
    function questionNode(q) {
      const qid = ++qSeq;
      const node = document.createElement("div");
      node.className = "qz-q card card-pad";
      node.style.cssText = "padding:14px 14px 12px";
      node.dataset.qid = qid;
      node.innerHTML = `
        <div class="row between vcenter" style="margin-bottom:8px;gap:8px">
          <input class="input qz-prompt" placeholder="${t("teacher.questionPromptPh")}" value="${q ? esc(q.prompt) : ""}" style="flex:1"/>
          <div class="row" style="gap:4px;flex:none">
            <button type="button" class="btn btn-quiet btn-sm qz-dup-q" title="${t("teacher.duplicateQuestion")}" style="font-size:12px">${t("teacher.duplicate")}</button>
            <button type="button" class="btn btn-quiet btn-sm qz-del-q" title="${t("teacher.removeQuestion")}" style="color:var(--danger)">${IC.close}</button>
          </div>
        </div>
        <div class="qz-opts"></div>
        <button type="button" class="btn btn-outline btn-sm qz-add-opt" style="margin-top:6px">${IC.plus} ${t("teacher.addOption")}</button>`;
      const optsWrap = node.querySelector(".qz-opts");
      const initialOpts = (q && q.options && q.options.length) ? q.options : [null, null];
      initialOpts.forEach((o) => optsWrap.appendChild(optionNode(qid, o)));
      node.querySelector(".qz-add-opt").addEventListener("click", () => optsWrap.appendChild(optionNode(qid, null)));
      node.querySelector(".qz-del-q").addEventListener("click", () => {
        if (qWrap.querySelectorAll(".qz-q").length <= 1) { window.toast && window.toast(t("teacher.minOneQuestion"), "warn"); return; }
        node.remove();
      });
      // [PRD-04] Duplicar pregunta: clona el estado vivo del DOM (enunciado + opciones + correcta).
      node.querySelector(".qz-dup-q").addEventListener("click", () => {
        const options = Array.from(node.querySelectorAll(".qz-opt")).map((o) => ({
          text: o.querySelector(".qz-opt-text").value,
          correct: o.querySelector(".qz-correct").checked,
        }));
        node.after(questionNode({ prompt: node.querySelector(".qz-prompt").value, options }));
      });
      return node;
    }

    // Prefill: preguntas existentes, o una pregunta vacía de arranque.
    const seed = (existing && existing.questions && existing.questions.length) ? existing.questions : [null];
    seed.forEach((q) => qWrap.appendChild(questionNode(q)));
    m.body.querySelector("#qz-add-q").addEventListener("click", () => qWrap.appendChild(questionNode(null)));

    // Guardar → recolecta el árbol, valida en cliente y POST /api/quizzes.
    m.okBtn.addEventListener("click", async () => {
      const title = (m.body.querySelector("#qz-title").value || "").trim();
      let passScore = Number(m.body.querySelector("#qz-pass").value);
      if (!Number.isFinite(passScore)) passScore = 60;
      passScore = Math.min(100, Math.max(0, Math.round(passScore)));

      const questions = [];
      let invalid = "";
      qWrap.querySelectorAll(".qz-q").forEach((qn) => {
        const prompt = (qn.querySelector(".qz-prompt").value || "").trim();
        const opts = [];
        const radios = qn.querySelectorAll(".qz-opt");
        radios.forEach((ow) => {
          const text = (ow.querySelector(".qz-opt-text").value || "").trim();
          const correct = ow.querySelector(".qz-correct").checked;
          if (text) opts.push({ text, correct });
        });
        if (!prompt) { invalid = invalid || t("teacher.errQuestionNoPrompt"); return; }
        if (opts.length < 2) { invalid = invalid || t("teacher.errQuestionMinOptions").replace("{prompt}", prompt.slice(0, 30)); return; }
        if (!opts.some((o) => o.correct)) { invalid = invalid || t("teacher.errQuestionNoCorrect").replace("{prompt}", prompt.slice(0, 30)); return; }
        questions.push({ prompt, options: opts });
      });

      if (invalid) { m.showErr(invalid); return; }
      if (!questions.length) { m.showErr(t("teacher.errNoValidQuestion")); return; }

      m.okBtn.textContent = t("teacher.saving"); m.okBtn.disabled = true;
      try {
        await window.api("/api/quizzes", { lessonId, title: title || t("teacher.quizTitlePh"), passScore, questions });
        window.toast && window.toast(t("teacher.quizSaved"), "ok");
        m.close();
        await softRefresh("teacher");
      } catch (err) {
        m.okBtn.textContent = t("teacher.quizSaveBtn"); m.okBtn.disabled = false;
        m.showErr((err && err.message) || t("teacher.quizSaveError"));
      }
    });
  }

  /* ============================================================
     2) SUBIDA REAL de video de lección — videoKind='upload' con
        <input type="file" accept="video/*"> → window.otrUpload →
        url resultante a /api/lessons/[id]. Mantiene youtube/cloudflare.
     ============================================================ */
  function openLessonVideo(lessonId, lessonTitle) {
    const l = findLesson(lessonId) || {};
    const curKind = l.videoKind || "none";
    const body = `
      <div class="field" style="margin-bottom:12px">
        <label class="label">${t("teacher.videoSourceLabel")}</label>
        <select class="select" id="lv-kind">
          <option value="none" ${curKind==='none'?'selected':''}>${t("teacher.videoOptNone")}</option>
          <option value="upload" ${curKind==='upload'?'selected':''}>${t("teacher.videoOptUpload")}</option>
          <option value="youtube" ${curKind==='youtube'?'selected':''}>${t("teacher.videoOptYoutube")}</option>
          <option value="cloudflare" ${curKind==='cloudflare'?'selected':''}>${t("teacher.videoOptCloudflare")}</option>
        </select>
      </div>

      <div class="field lv-block" data-for="upload" style="margin-bottom:12px;display:none">
        <label class="label">${t("teacher.videoFileLabel")}</label>
        <input type="file" id="lv-file" accept="video/*" class="input" style="padding:8px"/>
        <div id="lv-up-state" class="faint" style="font-size:12px;margin-top:6px"></div>
      </div>

      <div class="field lv-block" data-for="link" style="margin-bottom:6px;display:none">
        <label class="label" id="lv-src-label">${t("teacher.videoLinkLabel")}</label>
        <input class="input" id="lv-src" placeholder="${t("teacher.videoLinkPh")}" value="${(curKind==='youtube'||curKind==='cloudflare')?esc(l.videoSrc||''):''}"/>
      </div>`;

    const m = buildModal({ title: t("teacher.videoModalTitle").replace("{lesson}", esc(lessonTitle || t("teacher.lessonFallback"))), bodyHtml: body, okLabel: t("teacher.videoSaveBtn") });
    const kindSel = m.body.querySelector("#lv-kind");
    const fileInput = m.body.querySelector("#lv-file");
    const upState = m.body.querySelector("#lv-up-state");
    const srcLabel = m.body.querySelector("#lv-src-label");
    let uploadedUrl = (curKind === "upload") ? (l.videoSrc || "") : "";

    function syncBlocks() {
      const k = kindSel.value;
      m.body.querySelectorAll(".lv-block").forEach((el) => {
        const fr = el.getAttribute("data-for");
        const show = (fr === "upload" && k === "upload") || (fr === "link" && (k === "youtube" || k === "cloudflare"));
        el.style.display = show ? "" : "none";
      });
      if (k === "youtube") srcLabel.textContent = t("teacher.videoYoutubeUrlLabel");
      else if (k === "cloudflare") srcLabel.textContent = t("teacher.videoCloudflareIdLabel");
    }
    kindSel.addEventListener("change", syncBlocks);
    syncBlocks();

    // Sube en cuanto el profesor elige el archivo (feedback inmediato).
    fileInput && fileInput.addEventListener("change", async () => {
      const file = fileInput.files && fileInput.files[0];
      if (!file) return;
      upState.textContent = t("teacher.uploading"); m.okBtn.disabled = true;
      try {
        const res = await window.otrUpload(file, "video"); // {url, ...}
        uploadedUrl = res.url;
        upState.innerHTML = `<span class="row vcenter" style="gap:5px;color:var(--ok)"><span style="display:inline-flex;width:13px;height:13px">${IC.check}</span>${t("teacher.uploaded")}</span> · <span class="faint">${esc(res.original || "")}</span>`;
      } catch (err) {
        uploadedUrl = "";
        upState.textContent = t("teacher.uploadError");
      } finally {
        m.okBtn.disabled = false;
      }
    });

    m.okBtn.addEventListener("click", async () => {
      const k = kindSel.value;
      let payload;
      if (k === "upload") {
        if (!uploadedUrl) { m.showErr(t("teacher.errUploadVideoFirst")); return; }
        payload = { videoKind: "upload", videoSrc: uploadedUrl };
      } else if (k === "youtube" || k === "cloudflare") {
        const src = (m.body.querySelector("#lv-src").value || "").trim();
        if (!src) { m.showErr(t("teacher.errPasteVideoUrl")); return; }
        payload = { videoKind: k, videoSrc: src };
      } else {
        payload = { videoKind: "none", videoSrc: "" };
      }
      m.okBtn.textContent = t("teacher.saving"); m.okBtn.disabled = true;
      try {
        await window.api(`/api/lessons/${lessonId}`, payload, "PATCH");
        window.toast && window.toast(t("teacher.videoUpdated"), "ok");
        m.close();
        await softRefresh("teacher");
      } catch (err) {
        m.okBtn.textContent = t("teacher.videoSaveBtn"); m.okBtn.disabled = false;
        m.showErr((err && err.message) || t("teacher.videoSaveError"));
      }
    });
  }

  /* ============================================================
     3) RECURSOS con archivo real — <input type=file> →
        window.otrUpload(file,'resource') → url al crear Resource.
     ============================================================ */
  function openResourceUpload() {
    const body = `
      <div class="field" style="margin-bottom:12px">
        <label class="label">${t("teacher.resTitleLabel")}</label>
        <input class="input" id="rs-title" placeholder="${t("teacher.resTitlePh")}"/>
      </div>
      <div class="row" style="gap:12px;margin-bottom:12px">
        <div class="field" style="flex:1">
          <label class="label">${t("teacher.resTypeLabel")}</label>
          <select class="select" id="rs-kind">
            <option value="brief">${t("teacher.resTypeBrief")}</option>
            <option value="template">${t("teacher.resTypeTemplate")}</option>
            <option value="drill">${t("teacher.resTypeDrill")}</option>
            <option value="recording">${t("teacher.resTypeRecording")}</option>
            <option value="link">${t("teacher.resTypeLink")}</option>
          </select>
        </div>
        <div class="field" style="flex:1">
          <label class="label">${t("teacher.resAccessLabel")}</label>
          <select class="select" id="rs-gated">
            <option value="no">${t("teacher.resAccessPublic")}</option>
            <option value="yes">${t("teacher.resAccessEnrolled")}</option>
          </select>
        </div>
      </div>
      <div class="row" style="gap:12px;margin-bottom:12px">
        <div class="field" style="flex:1"><label class="label">${t("teacher.resTagLabel")}</label><input class="input" id="rs-tag" placeholder="${t("teacher.resTagPh")}"/></div>
        <div class="field" style="flex:1"><label class="label">${t("teacher.resFormatLabel")}</label><input class="input" id="rs-format" placeholder="${t("teacher.resFormatPh")}"/></div>
      </div>
      <div class="field" style="margin-bottom:12px">
        <label class="label">${t("teacher.resFileLabel")}</label>
        <input type="file" id="rs-file" class="input" style="padding:8px"/>
        <div id="rs-up-state" class="faint" style="font-size:12px;margin-top:6px"></div>
      </div>
      <div class="field" style="margin-bottom:6px">
        <label class="label">${t("teacher.resExternalUrlLabel")}</label>
        <input class="input" id="rs-url" placeholder="https://…"/>
      </div>`;

    const m = buildModal({ title: t("teacher.resModalTitle"), bodyHtml: body, okLabel: t("teacher.resCreateBtn") });
    const fileInput = m.body.querySelector("#rs-file");
    const upState = m.body.querySelector("#rs-up-state");
    let uploadedUrl = "";

    fileInput && fileInput.addEventListener("change", async () => {
      const file = fileInput.files && fileInput.files[0];
      if (!file) return;
      upState.textContent = t("teacher.uploading"); m.okBtn.disabled = true;
      try {
        const res = await window.otrUpload(file, "resource");
        uploadedUrl = res.url;
        upState.innerHTML = `<span class="row vcenter" style="gap:5px;color:var(--ok)"><span style="display:inline-flex;width:13px;height:13px">${IC.check}</span>${t("teacher.uploaded")}</span> · <span class="faint">${esc(res.original || "")}</span>`;
      } catch (err) {
        uploadedUrl = "";
        upState.textContent = t("teacher.uploadError");
      } finally {
        m.okBtn.disabled = false;
      }
    });

    m.okBtn.addEventListener("click", async () => {
      const title = (m.body.querySelector("#rs-title").value || "").trim();
      if (!title) { m.showErr(t("teacher.errTitleRequired")); return; }
      const externalUrl = (m.body.querySelector("#rs-url").value || "").trim();
      const url = uploadedUrl || externalUrl;
      if (!url) { m.showErr(t("teacher.errFileOrUrl")); return; }

      const payload = {
        title,
        kind: m.body.querySelector("#rs-kind").value,
        tag: (m.body.querySelector("#rs-tag").value || "").trim(),
        format: (m.body.querySelector("#rs-format").value || "").trim(),
        url,
        gated: m.body.querySelector("#rs-gated").value === "yes",
      };
      m.okBtn.textContent = t("teacher.creating"); m.okBtn.disabled = true;
      try {
        await window.api("/api/resources", payload);
        window.toast && window.toast(t("teacher.resourceCreated"), "ok");
        m.close();
        await softRefresh("teacher");
      } catch (err) {
        m.okBtn.textContent = t("teacher.resCreateBtn"); m.okBtn.disabled = false;
        m.showErr((err && err.message) || t("teacher.resourceCreateError"));
      }
    });
  }

  /* ============================================================
     PARTICIPANTES
     ============================================================ */
  S.participants = {
    render() {
      // Conteos REALES derivados del roster (DB.students). El único coach es el
      // profesor que mira la pantalla; no hay segunda lista de coaches en los datos.
      const studentCount = (DB.students || []).length;
      const coachCount = 1; // el profesor/coach que imparte el grupo
      const total = studentCount + coachCount;
      const coach = DB.teacher || {};
      // DB.teacher ya viene escapado desde queries.ts; no re-escapar (evita &amp;amp;).
      const coachName = coach.name || t("teacher.coachNameFallback");
      const coachInit = coach.initials || "C";

      // Fila de un estudiante. data-name/data-role permiten el filtrado local en mount().
      const studentRow = (s) => `<tr data-role="student" data-risk="${s.risk?'1':'0'}" data-name="${esc(s.n.toLowerCase())}">
        <td><div class="cell-user">${C.avatar(s.i,{size:'sm'})}<div><div class="nm">${esc(s.n)}</div>${s.risk?C.chip(t("teacher.riskBadge"), 'accent'):''}</div></div></td>
        <td>${C.chip(t("teacher.ptRoleStudent"), "outline")}</td>
        <td>${C.levelBadge(s.lvl)}</td>
        ${/* [auditoría] XP real del alumno (antes la barra "Progreso" era xp/55, una constante inventada que no reflejaba avance de curso) */""}
        <td class="num tnum" style="font-size:12px">${(s.xp||0).toLocaleString('es')}</td>
        <td class="num faint" style="font-size:12px">${esc(s.last)}</td>
        <td class="center"><div class="row vcenter" style="gap:6px;justify-content:flex-end">
          <button class="btn btn-outline btn-sm" data-adjudicate="${s.id}" data-name="${esc(s.n)}">${t("teacher.adjudicate")}</button>
          <button class="btn btn-outline btn-sm" data-action="eval-skills" data-user="${s.id}" data-name="${esc(s.n)}">${t("teacher.evaluate")}</button>
          ${/* [GOAL S1] Ídem que en el panel del profesor: solo-icono ⇒ aria-label obligatorio.
               Sin él la tabla ofrece 8 botones que el lector de pantalla anuncia todos vacíos. */""}
          <button class="icon-btn" style="width:30px;height:30px" data-go="messages" aria-label="${t("teacher.sendMessageTo").split("{name}").join(s.n)}" title="${t("teacher.sendMessage")}">${IC.msg}</button>
        </div></td>
      </tr>`;

      return `
      <div class="page-head page-head--rule"><div><p class="ph-eyebrow">${t("teacher.ptEyebrow")}</p>
      <h1 class="ph-title">${t("teacher.ptTitle")}</h1><div class="page-sub">${t("teacher.ptCountsSub").replace("{students}", `${studentCount} ${studentCount===1?t("teacher.studentUnitSingular"):t("teacher.studentUnitPlural")}`).replace("{coaches}", `${coachCount} ${t("teacher.coachUnit")}`)}</div></div>
      <div class="stat-group">
        ${C.statInline(studentCount, studentCount===1?t("teacher.studentUnitSingular"):t("teacher.studentUnitPlural"))}
        ${C.statInline(coachCount, t("teacher.coachUnit"))}
      </div></div>

      ${/* [REQ-1] Cola de solicitudes de debate de los alumnos — se rellena en mount(). */""}
      <div id="dq-queue" class="adj-block"></div>

      <div class="row between vcenter" style="margin-bottom:26px;flex-wrap:wrap;gap:12px">
        <div class="searchbox" style="width:280px"><span style="display:flex;width:16px;height:16px">${IC.search}</span><input id="pt-search" aria-label="${t("teacher.ptSearchAria")}" placeholder="${t("teacher.ptSearchPh")}"/></div>
        <div class="row wrap" style="gap:8px" id="pt-filters">
          <button type="button" class="chip active" data-filter="all">${t("teacher.ptFilterAll")} · ${total}</button>
          <button type="button" class="chip" data-filter="student">${t("teacher.ptFilterStudents")} · ${studentCount}</button>
          <button type="button" class="chip" data-filter="coach">${t("teacher.ptFilterCoaches")} · ${coachCount}</button>
          <button type="button" class="chip" data-filter="risk">${t("teacher.ptFilterRisk")} · ${(DB.students||[]).filter(s=>s.risk).length}</button>
        </div>
      </div>

      <div class="table-wrap scroll-m fade-up">
        <table class="tbl">
          <thead><tr><th>${t("teacher.ptThName")}</th><th>${t("teacher.ptThRole")}</th><th>${t("teacher.ptThLevel")}</th><th class="num">${t("teacher.ptThXp")}</th><th class="num">${t("teacher.ptThLastAccess")}</th><th></th></tr></thead>
          <tbody id="pt-body">
            <tr data-role="coach" data-risk="0" data-name="${coachName.toLowerCase()}">
              <td><div class="cell-user">${C.avatar(coachInit,{size:'sm',bg:'var(--otr-navy)'})}<div><div class="nm">${coachName}</div>${coach.headline?`<div class="em">${coach.headline}</div>`:''}</div></div></td>
              <td>${C.chip(t("teacher.ptRoleCoach"), "black")}</td><td class="faint">—</td><td class="faint">—</td><td class="num faint" style="font-size:12px">—</td><td></td></tr>
            ${(DB.students||[]).map(studentRow).join('')}
          </tbody>
        </table>
        <div id="pt-empty" class="faint" style="display:none;padding:18px;text-align:center;font-size:13px">${t("teacher.ptNoParticipants")}</div>
      </div>`;
    },

    mount(root) {
      if (!root) return;
      const body = root.querySelector("#pt-body");
      const filters = root.querySelector("#pt-filters");
      const search = root.querySelector("#pt-search");
      const empty = root.querySelector("#pt-empty");
      if (!body) return;
      let activeFilter = "all";

      // [REQ-1] COLA DE SOLICITUDES: auto-reportes de debate pendientes de los alumnos.
      // El coach Aprueba (adjudica → mueve el rating Glicko) o Rechaza (con motivo).
      const queueBox = root.querySelector("#dq-queue");
      if (queueBox) {
        // [MOCKUP V2 §2] El resultado es METADATO de la fila: texto plano 10/800/.07em,
        // sin fondo. Naranja accesible (#9E3211) para la victoria, gris 600 para la derrota.
        const resultTag = (r) => r === "WIN"
          ? `<span class="adj-tag adj-tag--win">${t("teacher.win")}</span>`
          : `<span class="adj-tag adj-tag--loss">${t("teacher.loss")}</span>`;
        const meta = (q) => [q.format, q.side, q.opponent ? "vs " + q.opponent : "", q.eventName, q.tournamentCode]
          .filter(Boolean).map(esc).join(" · ");
        const removeCard = (id) => {
          const c = queueBox.querySelector(`[data-req="${id}"]`); c && c.remove();
          if (!queueBox.querySelector("[data-req]")) queueBox.innerHTML = "";
        };
        const wireQueue = () => {
          queueBox.querySelectorAll("[data-approve]").forEach((btn) =>
            btn.addEventListener("click", async () => {
              const id = btn.getAttribute("data-approve");
              btn.disabled = true; btn.textContent = t("teacher.approving");
              try {
                const d = await window.api("/api/debates/" + id, { action: "approve" }, "PATCH");
                const mv = (typeof d?.ratingAfter === "number" && typeof d?.ratingBefore === "number") ? ` · ${d.ratingBefore}→${d.ratingAfter}` : "";
                window.toast?.(`${t("teacher.approved")}${mv}${d?.promoted ? t("teacher.promotedTo").replace("{tier}", d.tierAfter) : ""}`, "ok");
                removeCard(id);
              } catch (e) {
                btn.disabled = false; btn.textContent = t("teacher.approve");
                window.toast?.((e && e.message) || t("teacher.queueError"), "warn");
              }
            }));
          queueBox.querySelectorAll("[data-reject]").forEach((btn) =>
            btn.addEventListener("click", () => {
              const id = btn.getAttribute("data-reject");
              const m = buildModal({
                title: t("teacher.rejectTitle"),
                bodyHtml: `<div class="field"><label class="label">${t("teacher.rejectReasonLabel")}</label><textarea class="input" id="rj-reason" rows="3" placeholder="${t("teacher.rejectReasonPh")}" style="resize:vertical;min-height:72px"></textarea></div>`,
                okLabel: t("teacher.reject"),
              });
              m.okBtn.addEventListener("click", async () => {
                const reason = (m.body.querySelector("#rj-reason")?.value || "").trim();
                m.okBtn.disabled = true; m.okBtn.textContent = t("teacher.rejecting");
                try {
                  await window.api("/api/debates/" + id, { action: "reject", reason }, "PATCH");
                  m.close(); window.toast?.(t("teacher.rejected"), "ok"); removeCard(id);
                } catch (e) {
                  m.okBtn.disabled = false; m.okBtn.textContent = t("teacher.reject");
                  m.showErr((e && e.message) || t("teacher.queueError"));
                }
              });
            }));
        };
        (async () => {
          let data; try { data = await window.api("/api/debates?queue=1", undefined, "GET"); } catch { return; }
          const reqs = (data && data.requests) || [];
          if (!reqs.length) { queueBox.innerHTML = ""; return; }
          // [MOCKUP V2 §5/§7] La cola deja de ser una pila de cards con padding propio y
          // pasa a UNA card sin padding con filas .evrow a sangre: columna de fecha del kit
          // (la del auto-reporte), título de 16px, meta en una línea y acciones a la derecha.
          queueBox.innerHTML =
            C.secTitle(t("teacher.debateQueueTitle"), { sm: true, tag: "h2", right: C.chip(String(reqs.length), "black") }) +
            `<p class="adj-sub">${t("teacher.debateQueueSub")}</p>` +
            `<div class="card adj-list">` +
            reqs.map((q) => {
              const dt = adjDateFromIso(q.recordedAt);
              return `
              <div class="evrow" data-req="${esc(q.id)}">
                ${dt ? C.dateBox(dt.day, dt.mon) : "<span></span>"}
                <div class="ev-main">
                  ${resultTag(q.result)}
                  <div class="ev-title">${esc(q.studentName)}</div>
                  <div class="ev-meta">${meta(q)}</div>
                  ${q.studentNote ? `<p class="adj-note">“${esc(q.studentNote)}”</p>` : ""}
                </div>
                <div class="ev-actions">
                  <button class="btn btn-accent btn--sm" data-approve="${esc(q.id)}">${t("teacher.approve")}</button>
                  <button class="btn btn-outline btn--sm" data-reject="${esc(q.id)}">${t("teacher.reject")}</button>
                </div>
              </div>`;
            }).join("") +
            `</div>`;
          wireQueue();
        })();
      }

      function apply() {
        const q = (search?.value || "").trim();
        let shown = 0;
        body.querySelectorAll("tr").forEach((tr) => {
          const role = tr.getAttribute("data-role");
          const risk = tr.getAttribute("data-risk") === "1";
          const name = tr.getAttribute("data-name") || "";
          const matchesFilter =
            activeFilter === "all" ? true :
            activeFilter === "risk" ? risk :
            activeFilter === role;
          const matchesQuery = !q || matches(name, q);
          const show = matchesFilter && matchesQuery;
          tr.style.display = show ? "" : "none";
          if (show) shown++;
        });
        if (empty) empty.style.display = shown ? "none" : "";
      }

      filters && filters.addEventListener("click", (e) => {
        const chip = e.target.closest && e.target.closest("[data-filter]");
        if (!chip || !filters.contains(chip)) return;
        activeFilter = chip.getAttribute("data-filter");
        filters.querySelectorAll(".chip").forEach((c) => c.classList.toggle("active", c === chip));
        apply();
      });
      search && search.addEventListener("input", apply);

      // [§6.5/§7.5] Adjudicar una ronda del alumno: el coach llena la rúbrica → el backend
      // mueve el rating Glicko del ALUMNO, escribe el ballot y nudgea sus skills (§8.2).
      const CRIT = [
        ["Argumentation", t("teacher.critArgumentation")], ["Rebuttal", t("teacher.critRebuttal")], ["Delivery", t("teacher.critDelivery")],
        ["Evidence/Research", t("teacher.critEvidence")], ["Crossfire", t("teacher.critCrossfire")],
      ];
      // El respiro entre campos lo pone .modal--v2 (18px), no un inline de 12px.
      // [GOAL K-14] La <label> se ATA a su control (for=id, mismo patrón que formModal de
      // Aula.tsx): sin `for` el lector de pantalla anuncia "edit text" sin decir de qué campo.
      // `forId` vacío ⇒ el bloque no es un control único (la rúbrica son 5): en ese caso la
      // label lleva id propio y el grupo la referencia con aria-labelledby.
      const fld = (label, html, forId) => forId
        ? `<div class="field"><label class="label" for="${forId}">${label}</label>${html}</div>`
        : `<div class="field"><label class="label" id="bl-rubric-lbl">${label}</label>${html}</div>`;
      body.querySelectorAll("[data-adjudicate]").forEach((btn) =>
        btn.addEventListener("click", () => {
          const uid = btn.getAttribute("data-adjudicate");
          const name = btn.getAttribute("data-name") || t("teacher.studentFallbackName");
          // [MOCKUP V2 §7] La rúbrica pasa a rejilla de datos: un solo borde exterior y
          // divisores de 1px entre criterios (menos peso visual, más aire real entre campos).
          // [GOAL K-14] Cada criterio es su propio control con nombre: la fila pasa a <label>
          // que ENVUELVE al input y además lo referencia por id. Antes eran 5 spin buttons
          // anónimos ("spin button, 7" ×5). La fila sigue siendo .adj-crit > span + .input, así
          // que el CSS del kit (rejilla, divisores, ancho 62px) no cambia ni un píxel.
          const critId = (k) => "bl-score-" + String(k).toLowerCase().replace(/[^a-z0-9]+/g, "-");
          const rubric = `<div class="adj-rubric" role="group" aria-labelledby="bl-rubric-lbl">${CRIT.map(([k, es]) =>
            `<label class="adj-crit" for="${critId(k)}"><span>${es}</span><input class="input bl-score" id="${critId(k)}" data-c="${k}" type="number" min="0" max="10" step="1" value="7"/></label>`).join("")}</div>`;
          // [RATING-1 §6.2] PF/Policy/Parli son 2v2: el coach puede nombrar al compañero
          // (otro de sus alumnos) para que SU rating también se mueva con el resultado.
          const partnerOpts = (DB.students || []).filter((s) => s.id !== uid)
            .map((s) => `<option value="${s.id}">${esc(s.n)}</option>`).join("");
          const bodyHtml =
            fld(t("teacher.adjResultLabel"), `<select class="select" id="bl-result"><option value="WIN">${t("teacher.adjResultWin")}</option><option value="LOSS">${t("teacher.adjResultLoss")}</option></select>`, "bl-result") +
            fld(t("teacher.adjFormatLabel"), `<select class="select" id="bl-format"><option value="PF">Public Forum</option><option value="LD">Lincoln-Douglas</option><option value="Policy">Policy</option><option value="Parli">${t("teacher.adjFormatParli")}</option></select>`, "bl-format") +
            fld(t("teacher.adjOpponentLabel"), `<input class="input" id="bl-opp" placeholder="${t("teacher.adjOpponentPh")}"/>`, "bl-opp") +
            (partnerOpts ? fld(t("teacher.adjPartnerLabel"), `<select class="select" id="bl-partner"><option value="">${t("teacher.adjPartnerNone")}</option>${partnerOpts}</select>`, "bl-partner") : "") +
            fld(t("teacher.adjRubricLabel"), rubric) +
            fld(t("teacher.adjCommentsLabel"), `<textarea class="input" id="bl-comments" rows="3" placeholder="${t("teacher.adjCommentsPh")}" style="resize:vertical;min-height:72px"></textarea>`, "bl-comments");
          const m = buildModal({ title: t("teacher.adjModalTitle").replace("{name}", name), bodyHtml, okLabel: t("teacher.adjPublishBtn") });
          m.okBtn.addEventListener("click", async () => {
            const result = m.body.querySelector("#bl-result").value;
            const format = m.body.querySelector("#bl-format").value;
            const opponent = m.body.querySelector("#bl-opp").value.trim();
            const partnerEl = m.body.querySelector("#bl-partner");
            const partnerUserId = partnerEl ? partnerEl.value : "";
            const comments = m.body.querySelector("#bl-comments").value.trim();
            const scores = Array.from(m.body.querySelectorAll(".bl-score")).map((i) => ({ criterion: i.getAttribute("data-c"), score: Number(i.value) }));
            m.okBtn.disabled = true; m.okBtn.textContent = t("teacher.adjudicating");
            try {
              const d = await window.api("/api/debates", { targetUserId: uid, result, format, opponent, partnerUserId: partnerUserId || undefined, source: "OTR", ballot: { comments, scores } });
              m.close();
              const before = d?.ratingBefore, after = d?.ratingAfter;
              const delta = (typeof after === "number" && typeof before === "number") ? after - before : 0;
              const mv = delta ? ` · ${before}→${after} (${delta > 0 ? "+" : ""}${delta})` : "";
              const partnerNote = partnerUserId ? t("teacher.adjPartnerUpdated") : "";
              window.toast?.(`${t("teacher.adjToastBase").replace("{name}", name)}${mv}${d?.promoted ? t("teacher.adjToastPromoted").replace("{tier}", d.tierAfter) : ""}${partnerNote}`, "ok");
            } catch (e) {
              m.okBtn.disabled = false; m.okBtn.textContent = t("teacher.adjPublishBtn");
              m.showErr((e && e.message) || t("teacher.adjError"));
            }
          });
        }),
      );
    }
  };
