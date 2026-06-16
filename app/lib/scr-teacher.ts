// @ts-nocheck
import { DB } from "./data";
import { C } from "./components";
import { IC } from "./icons";
import { esc } from "./esc";
export const S = {};
  const spark = (vals,color='var(--otr-sky)') => `<div class="spark">${vals.map(v=>`<i style="height:${v}%;background:${color}"></i>`).join('')}</div>`;
  const trendIc = t => t==='up'?`<span class="trend-up">${IC.chevD}</span>`.replace('chevD','') && `<span class="trend-up">▴</span>` : t==='down'?'<span class="trend-down">▾</span>':'<span class="trend-flat">→</span>';

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

  // Etiqueta legible para el tipo de lección.
  const LESSON_TYPES = {
    lesson: "Lección", video: "Video", quiz: "Examen",
    assign: "Tarea", mic: "Grabación", file: "Archivo",
  };

  // Badge del proveedor de video de una lección.
  function videoBadge(l) {
    const k = l.videoKind;
    if (!k || k === "none") return "";
    const label = k === "youtube" ? "YouTube" : k === "cloudflare" ? "Stream" : k === "upload" ? "Subido" : k;
    return `<span class="badge sky" style="height:18px;font-size:10px;gap:3px;flex:none"><span style="display:inline-flex;width:11px">${IC.video}</span>${esc(label)}</span>`;
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

      return `
      <div class="page-head">
        <div><p class="eyebrow">Panel del profesor</p>
        <div class="page-title">Seguimiento del grupo</div>
        <div class="page-sub">Tracking total · ${DB.students.length} estudiante${DB.students.length===1?'':'s'} en ${courseCount} curso${courseCount===1?'':'s'}</div></div>
        <div class="row" style="gap:8px">
          <button class="btn btn-primary btn-sm" data-action="grade-subs">${IC.chart} Calificar</button>
        </div>
      </div>

      <div class="grid g-4" style="margin-bottom:18px">
        <div class="tile fade-up" style="--d:0">${C.kpi('Promedio del grupo',String(k.avg),{unit:'%',ic:'chart'})}</div>
        <div class="tile fade-up" style="--d:1">${C.kpi('Asistencia',String(k.attendance),{unit:'%',ic:'users'})}</div>
        <div class="tile fade-up" style="--d:2">${C.kpi('Entregas a tiempo',String(k.onTime),{unit:'%',ic:'clock'})}</div>
        <div class="tile fade-up" style="--d:3;border-color:#eeb9b4;background:var(--danger-soft)">${C.kpi('En riesgo',String(k.atRisk),{ic:'flag'})}</div>
      </div>

      <div class="split rail-320">
        <div class="table-wrap scroll-m fade-up">
          <table class="tbl">
            <thead><tr><th>Estudiante</th><th>Nivel</th><th class="num">Nota</th><th class="num">Asist.</th><th>Engagement</th><th class="center">7 días</th><th class="num">Últ. acceso</th></tr></thead>
            <tbody>
              ${DB.students.map(s=>`<tr>
                <td><div class="cell-user">${C.avatar(s.i,{size:'sm'})}<div class="nm">${esc(s.n)}</div>${s.risk?C.badge('Riesgo','danger'):''}</div></td>
                <td>${C.levelBadge(s.lvl)}</td>
                <td class="num"><b style="color:${s.grade>=85?'var(--ok)':s.grade>=70?'var(--warn)':'var(--danger)'}">${s.grade}%</b></td>
                <td class="num tnum">${s.att}%</td>
                <td><span class="eng-pill eng-${s.eng}">${esc(s.eng)}</span></td>
                <td class="center">${spark(s.trend==='up'?[40,55,50,68,72,80,88]:s.trend==='down'?[80,70,64,55,48,40,34]:[60,62,58,64,60,62,60], s.risk?'var(--danger)':'var(--otr-sky)')}</td>
                <td class="num faint" style="font-size:12px">${esc(s.last)}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>

        <div class="stack" style="gap:16px">
          <div class="card fade-up" style="--d:1">
            <div class="card-head"><h3 class="row vcenter" style="gap:8px;color:var(--danger)">${IC.flag} Requieren atención</h3>${atRisk.length?`<span class="badge danger">${atRisk.length}</span>`:''}</div>
            <div class="card-body" style="padding:6px 16px 10px">
              ${atRisk.map(s=>`<div class="risk-row">${C.avatar(s.i,{size:'sm',bg:'var(--danger)'})}
                <div style="flex:1;min-width:0"><div style="font-weight:600;font-size:13.5px">${esc(s.n)}</div>
                <div class="faint" style="font-size:12px">${s.att<70?'Asistencia baja':'Sin entregas'} · ${esc(s.last)}</div></div>
                <button class="btn btn-soft btn-sm" data-go="messages" title="Enviar mensaje">${IC.msg}</button></div>`).join('')}
              ${atRisk.length?'':'<div class="empty" style="padding:24px 16px"><div class="ill">'+IC.checkCircle+'</div><h4>Sin alertas</h4><p>Todo el grupo va al día.</p></div>'}
            </div>
          </div>
          <div class="card card-pad fade-up" style="--d:2">
            <div class="row between vcenter" style="margin-bottom:12px"><b style="font-size:13.5px">Pendientes de calificar</b><span class="badge sky">${DB.pendingSubs ?? 0}</span></div>
            ${(DB.pendingSubs ?? 0) > 0
              ? `<div class="lrow" style="padding:10px 0"><span style="display:flex;width:18px;color:var(--text-2)">${IC.mic}</span>
                <div style="flex:1"><div style="font-weight:600;font-size:13px">${DB.pendingSubs} entrega${DB.pendingSubs === 1 ? '' : 's'} por revisar</div><div class="faint" style="font-size:12px">Ábrelas para calificar con nota y feedback</div></div></div>
                <button class="btn btn-primary btn-sm btn-block" style="margin-top:12px" data-action="grade-subs">Calificar entregas</button>`
              : `<div class="empty" style="padding:20px 16px"><div class="ill">${IC.checkCircle}</div><h4>Todo al día</h4><p>No tienes entregas pendientes de calificar.</p></div>`}
          </div>
        </div>
      </div>

      ${this.managePanel({courseCount,moduleCount,lessonCount,quizCount})}`;
    },

    /* ---------------- PANEL DE GESTIÓN (Cursos → Módulos → Lecciones → Examen) ---------------- */
    managePanel({courseCount,moduleCount,lessonCount,quizCount}) {
      const courses = DB.teacherCourses || [];

      // Una lección dentro del árbol de gestión.
      const lessonRow = (l) => {
        const hasQuiz = l.type === 'quiz';
        const quizInDb = (DB.quizByLesson || {})[l.id];
        const quizState = hasQuiz
          ? (quizInDb
              ? `<span class="badge ok" style="height:18px;font-size:10px;gap:3px;flex:none">${IC.check} ${quizInDb.questions?.length || 0} preg.</span>`
              : `<span class="badge warn" style="height:18px;font-size:10px;flex:none">Sin preguntas</span>`)
          : '';
        return `<div class="tm-lesson row between vcenter" data-lesson-id="${esc(l.id)}" style="padding:8px 0 8px 20px;font-size:13px;color:var(--text-2)">
          <span class="row vcenter" style="gap:8px;min-width:0">
            <span style="display:flex;width:15px;color:var(--text-3);flex:none">${C.typeIcon(l.type)}</span>
            <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(l.title)}</span>
            <span class="badge" style="height:18px;font-size:10px;flex:none">${esc(LESSON_TYPES[l.type] || l.type)}</span>
            ${videoBadge(l)}${quizState}
          </span>
          <span class="row" style="gap:4px;flex:none">
            ${hasQuiz ? `<button class="btn btn-soft btn-sm" data-tm="quiz" data-lesson="${esc(l.id)}" data-title="${esc(l.title)}" title="Constructor de examen">${IC.doc} Examen</button>` : ''}
            <button class="btn btn-quiet btn-sm" data-tm="lesson-video" data-lesson="${esc(l.id)}" data-title="${esc(l.title)}" title="Subir / cambiar video">${IC.video}</button>
          </span>
        </div>`;
      };

      const moduleRow = (m) => `<div class="tm-module" style="border-top:1px solid var(--border);padding:12px 0 6px">
        <div class="row vcenter" style="margin-bottom:2px"><b class="row vcenter" style="gap:7px;font-size:13.5px"><span style="display:flex;width:14px;color:var(--text-3)">${IC.grid}</span>${esc(m.title)}</b>
          <span class="faint" style="font-size:12px;margin-left:8px">${(m.lessons?.length || 0)} lección${(m.lessons?.length||0)===1?'':'es'}</span></div>
        ${(m.lessons || []).map(lessonRow).join('') || '<div class="faint" style="font-size:12px;padding:6px 0 0 20px">Sin lecciones — añade con "+ Crear"</div>'}
      </div>`;

      const courseCard = (c, i = 0) => `<div class="card card-pad tm-course fade-up" style="margin-bottom:14px;--d:${i}">
        <div class="row between vcenter" style="gap:12px;flex-wrap:wrap">
          <div class="row vcenter" style="gap:10px;min-width:0">${C.courseDot(c.color)}<b style="font-size:15px;letter-spacing:-.01em">${esc(c.code)} · ${esc(c.name)}</b></div>
          <span class="faint" style="font-size:12px">${(c.modules?.length||0)} módulos</span>
        </div>
        ${(c.modules || []).map(moduleRow).join('') || '<div class="faint" style="font-size:12px;margin-top:10px">Sin módulos todavía — añade con "+ Crear → Nuevo módulo"</div>'}
      </div>`;

      const empty = `<div class="card"><div class="empty"><div class="ill">${IC.book}</div>
        <h4>Aún no tienes cursos</h4><p>Crea tu primer curso con el botón <b>+ Crear</b> de la barra superior, y luego añade módulos, lecciones y exámenes.</p></div></div>`;

      return `
      <div class="kit-section" style="margin-top:28px">
        <div class="page-head" style="margin-bottom:14px">
          <div><p class="eyebrow">Gestión de contenido</p>
          <div class="page-title" style="font-size:22px">Estructura del curso</div>
          <div class="page-sub">Cursos → Módulos → Lecciones → Examen · sube video real y construye exámenes</div></div>
          <div class="row" style="gap:8px">
            <button class="btn btn-ghost btn-sm" data-tm="resource">${IC.plus} Recurso (archivo)</button>
            <button class="btn btn-primary btn-sm" onclick="go('manage')">${IC.sliders} Editor completo</button>
          </div>
        </div>

        <div class="grid g-4" style="margin-bottom:16px">
          <div class="tile fade-up" style="--d:0">${C.kpi('Cursos',String(courseCount),{ic:'book'})}</div>
          <div class="tile fade-up" style="--d:1">${C.kpi('Módulos',String(moduleCount),{ic:'grid'})}</div>
          <div class="tile fade-up" style="--d:2">${C.kpi('Lecciones',String(lessonCount),{ic:'doc'})}</div>
          <div class="tile fade-up" style="--d:3">${C.kpi('Exámenes',String(quizCount),{ic:'target'})}</div>
        </div>

        ${courses.length ? courses.map(courseCard).join('') : empty}
      </div>`;
    },

    /* ---------------- MOUNT: cablea el panel de gestión (quiz, uploads, recursos) ---------------- */
    mount(root) {
      if (!root) return;

      root.addEventListener("click", (e) => {
        const btn = e.target.closest && e.target.closest("[data-tm]");
        if (!btn || !root.contains(btn)) return;
        e.preventDefault();
        const kind = btn.getAttribute("data-tm");
        if (kind === "quiz") openQuizBuilder(btn.getAttribute("data-lesson"), btn.getAttribute("data-title"));
        else if (kind === "lesson-video") openLessonVideo(btn.getAttribute("data-lesson"), btn.getAttribute("data-title"));
        else if (kind === "resource") openResourceUpload();
      });
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
  function buildModal({ title, bodyHtml, okLabel = "Guardar", wide = false }) {
    const scrim = document.createElement("div");
    scrim.className = "modal-scrim";
    scrim.innerHTML = `<div class="modal" role="dialog"${wide ? ' style="max-width:680px"' : ''}>
      <div class="modal-head"><h3>${esc(title)}</h3></div>
      <div class="modal-body">${bodyHtml}<p class="fm-err" style="color:var(--danger);font-size:13px;display:none;margin:8px 0 0"></p></div>
      <div class="modal-foot"><button class="btn btn-ghost" data-x>Cancelar</button><button class="btn btn-primary" data-ok>${esc(okLabel)}</button></div>
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
        <label class="label">Título del examen</label>
        <input class="input" id="qz-title" placeholder="Examen de unidad" value="${existing ? esc(existing.title) : ''}"/>
      </div>
      <div class="row" style="gap:12px;margin-bottom:12px">
        <div class="field" style="flex:1">
          <label class="label">Puntaje para aprobar (%)</label>
          <input class="input" id="qz-pass" type="number" min="0" max="100" value="${existing ? existing.passScore : 60}"/>
        </div>
      </div>
      <div class="row between vcenter" style="margin:6px 0 8px">
        <b style="font-size:13.5px">Preguntas</b>
        <button type="button" class="btn btn-soft btn-sm" id="qz-add-q">${IC.plus} Añadir pregunta</button>
      </div>
      <div id="qz-questions" class="stack" style="gap:14px"></div>`;

    const m = buildModal({ title: `Examen · ${esc(lessonTitle || "Lección")}`, bodyHtml: head, okLabel: "Guardar examen", wide: true });
    const qWrap = m.body.querySelector("#qz-questions");
    let qSeq = 0; // identificador local para agrupar radios por pregunta

    // Crea el DOM de UNA opción dentro de una pregunta.
    function optionNode(qid, opt) {
      const wrap = document.createElement("div");
      wrap.className = "qz-opt row vcenter";
      wrap.style.cssText = "gap:8px;margin:6px 0";
      wrap.innerHTML = `
        <input type="radio" name="correct-${qid}" class="qz-correct" ${opt && opt.correct ? "checked" : ""} title="Marcar como correcta" style="flex:none;width:16px;height:16px"/>
        <input class="input qz-opt-text" placeholder="Texto de la opción" value="${opt ? esc(opt.text) : ""}" style="flex:1"/>
        <button type="button" class="btn btn-quiet btn-sm qz-del-opt" title="Quitar opción" style="color:var(--danger);flex:none">${IC.close}</button>`;
      wrap.querySelector(".qz-del-opt").addEventListener("click", () => {
        const opts = wrap.parentElement;
        if (opts.querySelectorAll(".qz-opt").length <= 2) { window.toast && window.toast("Una pregunta necesita al menos 2 opciones", "warn"); return; }
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
          <input class="input qz-prompt" placeholder="Enunciado de la pregunta" value="${q ? esc(q.prompt) : ""}" style="flex:1"/>
          <button type="button" class="btn btn-quiet btn-sm qz-del-q" title="Quitar pregunta" style="color:var(--danger);flex:none">${IC.close}</button>
        </div>
        <div class="qz-opts"></div>
        <button type="button" class="btn btn-ghost btn-sm qz-add-opt" style="margin-top:6px">${IC.plus} Añadir opción</button>`;
      const optsWrap = node.querySelector(".qz-opts");
      const initialOpts = (q && q.options && q.options.length) ? q.options : [null, null];
      initialOpts.forEach((o) => optsWrap.appendChild(optionNode(qid, o)));
      node.querySelector(".qz-add-opt").addEventListener("click", () => optsWrap.appendChild(optionNode(qid, null)));
      node.querySelector(".qz-del-q").addEventListener("click", () => {
        if (qWrap.querySelectorAll(".qz-q").length <= 1) { window.toast && window.toast("El examen necesita al menos una pregunta", "warn"); return; }
        node.remove();
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
        if (!prompt) { invalid = invalid || "Hay una pregunta sin enunciado."; return; }
        if (opts.length < 2) { invalid = invalid || `La pregunta "${prompt.slice(0, 30)}…" necesita al menos 2 opciones con texto.`; return; }
        if (!opts.some((o) => o.correct)) { invalid = invalid || `Marca la opción correcta de "${prompt.slice(0, 30)}…".`; return; }
        questions.push({ prompt, options: opts });
      });

      if (invalid) { m.showErr(invalid); return; }
      if (!questions.length) { m.showErr("Añade al menos una pregunta válida."); return; }

      m.okBtn.textContent = "Guardando…"; m.okBtn.disabled = true;
      try {
        await window.api("/api/quizzes", { lessonId, title: title || "Examen de unidad", passScore, questions });
        window.toast && window.toast("Examen guardado", "ok");
        m.close();
        await softRefresh("teacher");
      } catch (err) {
        m.okBtn.textContent = "Guardar examen"; m.okBtn.disabled = false;
        m.showErr((err && err.message) || "No se pudo guardar el examen");
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
        <label class="label">Origen del video</label>
        <select class="select" id="lv-kind">
          <option value="none" ${curKind==='none'?'selected':''}>Sin video</option>
          <option value="upload" ${curKind==='upload'?'selected':''}>Subir archivo (MP4)</option>
          <option value="youtube" ${curKind==='youtube'?'selected':''}>YouTube (pegar URL)</option>
          <option value="cloudflare" ${curKind==='cloudflare'?'selected':''}>Video alojado en OTR (ID)</option>
        </select>
      </div>

      <div class="field lv-block" data-for="upload" style="margin-bottom:12px;display:none">
        <label class="label">Archivo de video</label>
        <input type="file" id="lv-file" accept="video/*" class="input" style="padding:8px"/>
        <div id="lv-up-state" class="faint" style="font-size:12px;margin-top:6px"></div>
      </div>

      <div class="field lv-block" data-for="link" style="margin-bottom:6px;display:none">
        <label class="label" id="lv-src-label">Enlace de YouTube o ID del video</label>
        <input class="input" id="lv-src" placeholder="https://youtu.be/… o el ID del video" value="${(curKind==='youtube'||curKind==='cloudflare')?esc(l.videoSrc||''):''}"/>
      </div>`;

    const m = buildModal({ title: `Video · ${esc(lessonTitle || "Lección")}`, bodyHtml: body, okLabel: "Guardar video" });
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
      if (k === "youtube") srcLabel.textContent = "URL de YouTube";
      else if (k === "cloudflare") srcLabel.textContent = "ID del video alojado en OTR";
    }
    kindSel.addEventListener("change", syncBlocks);
    syncBlocks();

    // Sube en cuanto el profesor elige el archivo (feedback inmediato).
    fileInput && fileInput.addEventListener("change", async () => {
      const file = fileInput.files && fileInput.files[0];
      if (!file) return;
      upState.textContent = "Subiendo…"; m.okBtn.disabled = true;
      try {
        const res = await window.otrUpload(file, "video"); // {url, ...}
        uploadedUrl = res.url;
        upState.innerHTML = `<span class="row vcenter" style="gap:5px;color:var(--ok)"><span style="display:inline-flex;width:13px;height:13px">${IC.check}</span>Subido</span> · <span class="faint">${esc(res.original || "")}</span>`;
      } catch (err) {
        uploadedUrl = "";
        upState.textContent = "Error al subir el archivo.";
      } finally {
        m.okBtn.disabled = false;
      }
    });

    m.okBtn.addEventListener("click", async () => {
      const k = kindSel.value;
      let payload;
      if (k === "upload") {
        if (!uploadedUrl) { m.showErr("Sube un archivo de video primero."); return; }
        payload = { videoKind: "upload", videoSrc: uploadedUrl };
      } else if (k === "youtube" || k === "cloudflare") {
        const src = (m.body.querySelector("#lv-src").value || "").trim();
        if (!src) { m.showErr("Pega la URL/UID del video."); return; }
        payload = { videoKind: k, videoSrc: src };
      } else {
        payload = { videoKind: "none", videoSrc: "" };
      }
      m.okBtn.textContent = "Guardando…"; m.okBtn.disabled = true;
      try {
        await window.api(`/api/lessons/${lessonId}`, payload, "PATCH");
        window.toast && window.toast("Video actualizado", "ok");
        m.close();
        await softRefresh("teacher");
      } catch (err) {
        m.okBtn.textContent = "Guardar video"; m.okBtn.disabled = false;
        m.showErr((err && err.message) || "No se pudo guardar el video");
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
        <label class="label">Título</label>
        <input class="input" id="rs-title" placeholder="Plantilla de caso · Public Forum"/>
      </div>
      <div class="row" style="gap:12px;margin-bottom:12px">
        <div class="field" style="flex:1">
          <label class="label">Tipo</label>
          <select class="select" id="rs-kind">
            <option value="brief">Brief</option>
            <option value="template">Plantilla</option>
            <option value="drill">Drill</option>
            <option value="recording">Grabación</option>
            <option value="link">Enlace</option>
          </select>
        </div>
        <div class="field" style="flex:1">
          <label class="label">Acceso</label>
          <select class="select" id="rs-gated">
            <option value="no">Público</option>
            <option value="yes">Solo inscritos</option>
          </select>
        </div>
      </div>
      <div class="row" style="gap:12px;margin-bottom:12px">
        <div class="field" style="flex:1"><label class="label">Etiqueta</label><input class="input" id="rs-tag" placeholder="Refutación"/></div>
        <div class="field" style="flex:1"><label class="label">Formato</label><input class="input" id="rs-format" placeholder="Public Forum"/></div>
      </div>
      <div class="field" style="margin-bottom:12px">
        <label class="label">Archivo del recurso (PDF, audio, doc…)</label>
        <input type="file" id="rs-file" class="input" style="padding:8px"/>
        <div id="rs-up-state" class="faint" style="font-size:12px;margin-top:6px"></div>
      </div>
      <div class="field" style="margin-bottom:6px">
        <label class="label">o URL externa (opcional)</label>
        <input class="input" id="rs-url" placeholder="https://…"/>
      </div>`;

    const m = buildModal({ title: "Nuevo recurso (archivo real)", bodyHtml: body, okLabel: "Crear recurso" });
    const fileInput = m.body.querySelector("#rs-file");
    const upState = m.body.querySelector("#rs-up-state");
    let uploadedUrl = "";

    fileInput && fileInput.addEventListener("change", async () => {
      const file = fileInput.files && fileInput.files[0];
      if (!file) return;
      upState.textContent = "Subiendo…"; m.okBtn.disabled = true;
      try {
        const res = await window.otrUpload(file, "resource");
        uploadedUrl = res.url;
        upState.innerHTML = `<span class="row vcenter" style="gap:5px;color:var(--ok)"><span style="display:inline-flex;width:13px;height:13px">${IC.check}</span>Subido</span> · <span class="faint">${esc(res.original || "")}</span>`;
      } catch (err) {
        uploadedUrl = "";
        upState.textContent = "Error al subir el archivo.";
      } finally {
        m.okBtn.disabled = false;
      }
    });

    m.okBtn.addEventListener("click", async () => {
      const title = (m.body.querySelector("#rs-title").value || "").trim();
      if (!title) { m.showErr("El título es obligatorio."); return; }
      const externalUrl = (m.body.querySelector("#rs-url").value || "").trim();
      const url = uploadedUrl || externalUrl;
      if (!url) { m.showErr("Sube un archivo o pega una URL externa."); return; }

      const payload = {
        title,
        kind: m.body.querySelector("#rs-kind").value,
        tag: (m.body.querySelector("#rs-tag").value || "").trim(),
        format: (m.body.querySelector("#rs-format").value || "").trim(),
        url,
        gated: m.body.querySelector("#rs-gated").value === "yes",
      };
      m.okBtn.textContent = "Creando…"; m.okBtn.disabled = true;
      try {
        await window.api("/api/resources", payload);
        window.toast && window.toast("Recurso creado", "ok");
        m.close();
        await softRefresh("teacher");
      } catch (err) {
        m.okBtn.textContent = "Crear recurso"; m.okBtn.disabled = false;
        m.showErr((err && err.message) || "No se pudo crear el recurso");
      }
    });
  }

  /* ============================================================
     GRADEBOOK
     ============================================================ */
  S.gradebook = {
    render() {
      const gb=DB.gradebook;
      const cls=v=> v==='—'?'none':(+v>=85?'hi':(+v>=70?'mid':'lo'));
      return `
      <div class="page-head"><div><p class="eyebrow">Calificador</p>
      <div class="page-title">Public Forum I</div>
      <div class="page-sub">${gb.rows.length} estudiantes · ${gb.cols.length} actividades</div></div>
      <div class="row" style="gap:8px"><button class="btn btn-ghost btn-sm">${IC.download} Exportar CSV</button>
      <button class="btn btn-ghost btn-sm">${IC.settings} Configurar</button></div></div>

      <div class="row wrap" style="gap:8px;margin-bottom:16px">
        <span class="chip active">Todas</span><span class="chip">Sin calificar</span><span class="chip">Unidad 1</span><span class="chip">Unidad 2</span>
      </div>

      <div class="gb-wrap fade-up">
        <table class="gb">
          <thead><tr><th class="stick" style="text-align:left">Estudiante</th>
            ${gb.cols.map(c=>`<th>${c}</th>`).join('')}<th>Promedio</th></tr></thead>
          <tbody>
            ${gb.rows.map(r=>{
              const nums=r.g.filter(x=>x!=='—').map(Number);
              const avg=nums.length?Math.round(nums.reduce((a,b)=>a+b,0)/nums.length):'—';
              return `<tr><td class="stick"><div class="cell-user">${C.avatar(r.i,{size:'sm'})}<span class="nm">${esc(r.n)}</span></div></td>
                ${r.g.map(v=>`<td><span class="gcell ${cls(v)}">${v}</span></td>`).join('')}
                <td><b class="gcell ${cls(String(avg))}">${avg}${avg!=='—'?'%':''}</b></td></tr>`;
            }).join('')}
            <tr style="background:var(--surface-2)"><td class="stick" style="background:var(--surface-2)"><b style="font-weight:700">Media actividad</b></td>
              ${gb.cols.map((_,ci)=>{ const nums=gb.rows.map(r=>r.g[ci]).filter(x=>x!=='—').map(Number); const a=nums.length?Math.round(nums.reduce((x,y)=>x+y,0)/nums.length):'—'; return `<td><b class="tnum">${a}${a!=='—'?'%':''}</b></td>`; }).join('')}
              <td></td></tr>
          </tbody>
        </table>
      </div>
      <p class="faint row vcenter" style="font-size:12px;margin-top:12px;gap:6px"><span style="display:flex;width:14px">${IC.lock}</span>Toca cualquier celda para calificar · las notas se guardan al instante.</p>`;
    }
  };

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
      const coachName = coach.name || "Coach";
      const coachInit = coach.initials || "C";

      // Fila de un estudiante. data-name/data-role permiten el filtrado local en mount().
      const studentRow = (s) => `<tr data-role="student" data-risk="${s.risk?'1':'0'}" data-name="${esc(s.n.toLowerCase())}">
        <td><div class="cell-user">${C.avatar(s.i,{size:'sm'})}<div><div class="nm">${esc(s.n)}</div>${s.risk?C.badge('Riesgo','danger'):''}</div></div></td>
        <td>${C.badge('Estudiante')}</td>
        <td>${C.levelBadge(s.lvl)}</td>
        <td><div style="width:120px">${C.bar(Math.min(98,s.xp/55),{cls:'thin'})}</div></td>
        <td class="num faint" style="font-size:12px">${esc(s.last)}</td>
        <td class="center"><div class="row vcenter" style="gap:6px;justify-content:flex-end">
          <button class="btn btn-ghost btn-sm" data-action="eval-skills" data-user="${s.id}" data-name="${esc(s.n)}">Evaluar</button>
          <button class="icon-btn" style="width:30px;height:30px" data-go="messages" title="Enviar mensaje">${IC.msg}</button>
        </div></td>
      </tr>`;

      return `
      <div class="page-head"><div><p class="eyebrow">Profesor</p>
      <div class="page-title">Participantes</div><div class="page-sub">${studentCount} estudiante${studentCount===1?'':'s'} · ${coachCount} coach</div></div></div>

      <div class="row between vcenter" style="margin-bottom:16px;flex-wrap:wrap;gap:12px">
        <div class="searchbox" style="width:280px"><span style="display:flex;width:16px;height:16px">${IC.search}</span><input id="pt-search" placeholder="Buscar participante…"/></div>
        <div class="row wrap" style="gap:8px" id="pt-filters">
          <span class="chip active" data-filter="all">Todos · ${total}</span>
          <span class="chip" data-filter="student">Estudiantes · ${studentCount}</span>
          <span class="chip" data-filter="coach">Coaches · ${coachCount}</span>
          <span class="chip" data-filter="risk">En riesgo · ${(DB.students||[]).filter(s=>s.risk).length}</span>
        </div>
      </div>

      <div class="table-wrap scroll-m fade-up">
        <table class="tbl">
          <thead><tr><th>Nombre</th><th>Rol</th><th>Nivel</th><th>Progreso</th><th class="num">Últ. acceso</th><th></th></tr></thead>
          <tbody id="pt-body">
            <tr data-role="coach" data-risk="0" data-name="${coachName.toLowerCase()}">
              <td><div class="cell-user">${C.avatar(coachInit,{size:'sm',bg:'var(--otr-navy)'})}<div><div class="nm">${coachName}</div>${coach.headline?`<div class="em">${coach.headline}</div>`:''}</div></div></td>
              <td>${C.badge('Coach','navy')}</td><td class="faint">—</td><td class="faint">—</td><td class="num faint" style="font-size:12px">—</td><td></td></tr>
            ${(DB.students||[]).map(studentRow).join('')}
          </tbody>
        </table>
        <div id="pt-empty" class="faint" style="display:none;padding:18px;text-align:center;font-size:13px">Sin participantes para este filtro.</div>
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

      function apply() {
        const q = (search?.value || "").toLowerCase().trim();
        let shown = 0;
        body.querySelectorAll("tr").forEach((tr) => {
          const role = tr.getAttribute("data-role");
          const risk = tr.getAttribute("data-risk") === "1";
          const name = tr.getAttribute("data-name") || "";
          const matchesFilter =
            activeFilter === "all" ? true :
            activeFilter === "risk" ? risk :
            activeFilter === role;
          const matchesQuery = !q || name.includes(q);
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
    }
  };
