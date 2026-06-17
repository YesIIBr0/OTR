// @ts-nocheck
// Pantallas adicionales: Catálogo (inscripción) · Gestión de contenido (profesor) · Búsqueda.
import { DB } from "./data";
import { C } from "./components";
import { IC } from "./icons";
import { esc } from "./esc";

/* ---- Helpers de autoría reutilizados por "Mis cursos" y el constructor de curso ---- */
// Fecha de entrega legible (de un ISO) → "15 nov".
function fmtDue(iso) {
  try { const d = new Date(iso); if (isNaN(d.getTime())) return ""; return d.toLocaleDateString("es", { day: "numeric", month: "short" }); } catch { return ""; }
}
// Chip de autoguardado en el hero del builder (Guardando… / Guardado).
function saveChip(root, state) {
  const el = root && root.querySelector("[data-save-chip]");
  if (!el) return;
  if (!state) { el.style.display = "none"; return; }
  el.style.display = "inline-flex";
  el.className = "save-chip " + (state === "saving" ? "saving" : "saved");
  el.textContent = state === "saving" ? "Guardando…" : "Guardado";
  if (state === "saved") { clearTimeout(el.__t); el.__t = setTimeout(() => { el.style.display = "none"; }, 1600); }
}
// Fila de ACTIVIDAD (lección). edit=true: arrastrable (grip), renombrable (doble-clic), con controles.
function lessonRow(l, mid, edit) {
  const isQuiz = l.type === "quiz";
  const quizInDb = (DB.quizByLesson || {})[l.id];
  const quizBadge = isQuiz
    ? (quizInDb
        ? `<span class="badge ok" style="height:18px;font-size:10px;gap:3px;flex:none">${IC.check} ${quizInDb.questions?.length || 0} preg.</span>`
        : `<span class="badge warn" style="height:18px;font-size:10px;flex:none">Sin preguntas</span>`)
    : "";
  const videoBadge = l.videoKind && l.videoKind !== "none"
    ? `<span class="badge sky" style="height:18px;font-size:10px;gap:3px;flex:none">${IC.video} ${l.videoKind === "youtube" ? "YouTube" : "Stream"}</span>`
    : "";
  const isAssign = l.type === "assign" || l.type === "mic";
  const dueBadge = isAssign && l.dueAt ? `<span class="badge" style="height:18px;font-size:10px;flex:none">${IC.calendar || ""} Entrega ${fmtDue(l.dueAt)}</span>` : "";
  const ptsBadge = isAssign && l.maxPoints != null ? `<span class="badge" style="height:18px;font-size:10px;flex:none">${l.maxPoints} pts</span>` : "";
  const hiddenBadge = l.hidden ? `<span class="badge warn" style="height:18px;font-size:10px;flex:none">Oculta</span>` : "";
  const grip = edit ? `<span class="drag-grip" title="Arrastra para reordenar">${IC.grip}</span>` : "";
  const titleSpan = `<span class="lrow-title" ${edit ? `data-inline-rename="lesson:${l.id}"` : ""} style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap${edit ? ";cursor:text" : ""}" ${edit ? `title="Doble-clic para renombrar"` : ""}>${esc(l.title)}</span>`;
  const controls = edit
    ? `<span class="row" style="gap:3px;flex:none"><button class="btn btn-quiet btn-sm" data-toggle-hidden="lesson:${l.id}" title="${l.hidden ? "Mostrar al alumno" : "Ocultar al alumno"}">${IC.eye}</button>${isQuiz ? `<button class="btn btn-soft btn-sm" data-tm="quiz" data-lesson="${l.id}" data-title="${esc(l.title)}" title="Constructor de examen">${IC.doc} Examen</button>` : ""}<button class="btn btn-quiet btn-sm" data-duplicate="lesson:${l.id}" title="Duplicar">${IC.copy}</button><button class="btn btn-quiet btn-sm" data-reorder-lesson="${mid}:${l.id}:up" title="Subir">↑</button><button class="btn btn-quiet btn-sm" data-reorder-lesson="${mid}:${l.id}:down" title="Bajar">↓</button><button class="btn btn-quiet btn-sm" data-edit-lesson="${l.id}" title="Editar actividad">${IC.pencil}</button><button class="btn btn-quiet btn-sm" data-del="lesson:${l.id}" style="color:var(--danger)" title="Eliminar">${IC.close}</button></span>`
    : "";
  return `<div class="row between vcenter lrow" ${edit ? `draggable="true" data-drag="lesson:${l.id}:${mid}"` : ""} style="padding:7px 0 7px ${edit ? "4px" : "18px"};font-size:13px;color:var(--text-2)${l.hidden ? ";opacity:.5" : ""}">
    <span class="row vcenter" style="gap:6px;min-width:0">${grip}<span style="display:flex;width:15px;color:var(--text-3);flex:none">${C.typeIcon(l.type)}</span>${titleSpan}${videoBadge}${quizBadge}${dueBadge}${ptsBadge}${hiddenBadge}</span>
    ${controls}</div>`;
}
// Bloque de SECCIÓN (módulo). edit: arrastrable, renombrable (doble-clic), colapsable.
function sectionBlock(m, cid, edit) {
  const ctrls = edit
    ? `<span class="row" style="gap:3px;flex:none"><button class="btn btn-quiet btn-sm" data-toggle-hidden="module:${m.id}" title="${m.hidden ? "Mostrar al alumno" : "Ocultar al alumno"}">${IC.eye}</button><button class="btn btn-quiet btn-sm" data-duplicate="module:${m.id}" title="Duplicar sección">${IC.copy}</button><button class="btn btn-quiet btn-sm" data-reorder-module="${cid}:${m.id}:up" title="Subir sección">↑</button><button class="btn btn-quiet btn-sm" data-reorder-module="${cid}:${m.id}:down" title="Bajar sección">↓</button><button class="btn btn-quiet btn-sm" data-edit-module="${m.id}" data-title="${esc(m.title)}" title="Renombrar sección">${IC.pencil}</button><button class="btn btn-quiet btn-sm" data-del="module:${m.id}" style="color:var(--danger)">Eliminar</button></span>`
    : "";
  const rows = (m.lessons || []).map((l) => lessonRow(l, m.id, edit)).join("")
    || `<div class="faint" style="font-size:12px;padding:6px 0 0 18px">Sin actividades todavía.</div>`;
  const add = edit
    ? `<div style="padding:10px 0 2px 18px"><button class="btn btn-soft btn-sm" data-open-chooser="${m.id}">${IC.plus} Añadir actividad o recurso</button></div>`
    : "";
  const grip = edit ? `<span class="drag-grip" title="Arrastra para reordenar la sección">${IC.grip}</span>` : "";
  return `<div class="secblk" data-sec="${m.id}" ${edit ? `draggable="true" data-drag="module:${m.id}:${cid}"` : ""} style="border-top:1px solid var(--border);padding:12px 0 6px${m.hidden ? ";opacity:.55" : ""}">
    <div class="row between vcenter" style="margin-bottom:4px;gap:6px">
      ${grip}
      <b class="row vcenter" data-acc-sec="${m.id}" style="gap:7px;font-size:13.5px;cursor:pointer;min-width:0;flex:1"><span class="sec-chev" style="display:flex;width:12px;color:var(--text-3);transition:transform .2s;flex:none">${IC.chevD}</span><span style="display:flex;width:14px;color:var(--text-3);flex:none">${IC.grid}</span><span class="sec-title" ${edit ? `data-inline-rename="module:${m.id}"` : ""} style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap${edit ? ";cursor:text" : ""}">${esc(m.title)}</span>${m.hidden ? `<span class="badge warn" style="height:18px;font-size:10px;flex:none">Oculta</span>` : ""}</b>${ctrls}
    </div>
    <div class="sec-body" data-sec-body="${m.id}">${rows}${add}</div>
  </div>`;
}
// Cablea los botones "Examen" (data-tm=quiz) al quiz builder global. Guardado anti-doble-bind.
function mountQuizButtons(root) {
  if (!root || root.__quizBtnsBound) return;
  root.__quizBtnsBound = true;
  root.addEventListener("click", (e) => {
    const btn = e.target.closest && e.target.closest('[data-tm="quiz"]');
    if (!btn || !root.contains(btn)) return;
    e.preventDefault();
    if (typeof window !== "undefined" && window.otrOpenQuizBuilder)
      window.otrOpenQuizBuilder(btn.getAttribute("data-lesson"), btn.getAttribute("data-title"));
  });
}
// Interacciones del builder: colapsar, drag&drop (reordenar) e inline-rename (doble-clic).
function mountBuilder(root) {
  if (!root) return;
  mountQuizButtons(root);
  // Botón "Colapsar/Expandir todo" (se re-renderiza cada vez → bind por elemento).
  const ca = root.querySelector("[data-collapse-all]");
  if (ca && !ca.__bound) {
    ca.__bound = true;
    ca.addEventListener("click", () => {
      const bodies = Array.from(root.querySelectorAll("[data-sec-body]"));
      const anyOpen = bodies.some((b) => b.style.display !== "none");
      bodies.forEach((b) => { b.style.display = anyOpen ? "none" : ""; });
      root.querySelectorAll(".sec-chev").forEach((c) => { c.style.transform = anyOpen ? "rotate(-90deg)" : ""; });
      ca.textContent = anyOpen ? "Expandir todo" : "Colapsar todo";
    });
  }
  if (root.__builderBound) return;
  root.__builderBound = true;

  // Colapsar sección al clic en su cabecera.
  root.addEventListener("click", (e) => {
    const h = e.target.closest && e.target.closest("[data-acc-sec]");
    if (!h || !root.contains(h)) return;
    if (e.target.closest("[data-inline-rename] input")) return; // no colapsar mientras se renombra
    const blk = h.closest(".secblk"); if (!blk) return;
    const body = blk.querySelector("[data-sec-body]"); const chev = h.querySelector(".sec-chev");
    if (!body) return;
    const collapsed = body.style.display === "none";
    body.style.display = collapsed ? "" : "none";
    if (chev) chev.style.transform = collapsed ? "" : "rotate(-90deg)";
  });

  // Inline rename (doble-clic en el título de sección o actividad).
  root.addEventListener("dblclick", (e) => {
    const span = e.target.closest && e.target.closest("[data-inline-rename]");
    if (!span || !root.contains(span) || span.querySelector("input")) return;
    e.preventDefault(); e.stopPropagation();
    const [kind, id] = span.getAttribute("data-inline-rename").split(":");
    const orig = span.textContent;
    const input = document.createElement("input");
    input.className = "inline-rename-input"; input.value = orig;
    span.textContent = ""; span.appendChild(input);
    input.focus(); input.select();
    let done = false;
    const finish = (save) => {
      if (done) return; done = true;
      const val = input.value.trim();
      span.textContent = save && val ? val : orig;
      if (save && val && val !== orig) {
        const url = kind === "module" ? `/api/modules/${id}` : `/api/lessons/${id}`;
        saveChip(root, "saving");
        window.api(url, { title: val }, "PATCH").then(() => saveChip(root, "saved")).catch(() => { saveChip(root, ""); span.textContent = orig; window.toast?.("No se pudo renombrar", "danger"); });
      }
    };
    input.addEventListener("keydown", (ev) => { if (ev.key === "Enter") { ev.preventDefault(); finish(true); } else if (ev.key === "Escape") { ev.preventDefault(); finish(false); } });
    input.addEventListener("blur", () => finish(true));
  });

  // Drag & drop nativo: reordenar DENTRO de su lista (secciones o actividades de una sección).
  let drag = null;
  const parse = (el) => { const a = (el.getAttribute("data-drag") || "").split(":"); return { kind: a[0], id: a[1], parent: a[2] }; };
  const siblings = (el, kind, parent) => Array.from(el.parentNode.children).filter((c) => {
    if (!c.getAttribute) return false; const d = parse(c); return d.kind === kind && d.parent === parent;
  });
  root.addEventListener("dragstart", (e) => {
    const row = e.target.closest && e.target.closest("[data-drag]");
    if (!row || !root.contains(row)) return;
    const d = parse(row);
    drag = { row, ...d, orig: siblings(row, d.kind, d.parent).map((c) => parse(c).id) };
    row.classList.add("sortable-ghost");
    try { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", d.id); } catch {}
  });
  root.addEventListener("dragover", (e) => {
    if (!drag) return;
    const over = e.target.closest && e.target.closest("[data-drag]");
    if (!over || over === drag.row) return;
    const od = parse(over);
    if (od.kind !== drag.kind || od.parent !== drag.parent) return; // P0: solo dentro de la misma lista
    e.preventDefault();
    const rect = over.getBoundingClientRect();
    const after = e.clientY > rect.top + rect.height / 2;
    over.parentNode.insertBefore(drag.row, after ? over.nextSibling : over);
  });
  root.addEventListener("drop", (e) => { if (drag) e.preventDefault(); });
  root.addEventListener("dragend", () => {
    if (!drag) return;
    drag.row.classList.remove("sortable-ghost");
    const now = siblings(drag.row, drag.kind, drag.parent).map((c) => parse(c).id);
    const changed = now.length === drag.orig.length && now.some((id, i) => id !== drag.orig[i]);
    if (changed) {
      saveChip(root, "saving");
      const url = drag.kind === "module" ? "/api/modules/reorder" : "/api/lessons/reorder";
      const body = drag.kind === "module" ? { courseId: drag.parent, orderedIds: now } : { moduleId: drag.parent, orderedIds: now };
      window.api(url, body, "POST").then(() => saveChip(root, "saved")).catch(() => { saveChip(root, ""); window.toast?.("No se pudo guardar el orden", "danger"); });
    }
    drag = null;
  });
}

export const S = {
  catalog: {
    render() {
      const courses = DB.catalog || [];
      const card = (c, i = 0) => `
        <div class="tile click course-card fade-up" style="--d:${i}">
          <div class="cc-top" style="background:linear-gradient(120deg,${c.color},color-mix(in srgb,${c.color} 55%, #0C0C0C))">
            <span class="cc-code">${esc(c.code)}</span>
          </div>
          <div class="cc-body">
            <div class="cc-name">${c.name}</div>
            <div class="cc-coach row vcenter" style="gap:6px"><span style="display:flex;width:13px">${IC.user}</span>${c.coach}</div>
            <div class="cc-foot" style="margin-top:16px">
              ${c.price > 0 ? `<span class="cc-pct">$${(c.price / 100).toFixed(0)}</span>` : `<span class="badge ok">Gratis</span>`}
              ${c.enrolled
                ? `<span class="badge ok"><span class="dot"></span>Inscrito</span>`
                : `<button class="btn btn-primary btn-sm" data-enroll="${c.id}">${IC.plus} Inscribirme</button>`}
            </div>
          </div>
        </div>`;
      return `
      <div class="page-head"><div>
        <p class="eyebrow">Academia OTR</p>
        <h1 class="page-title">Catálogo de cursos</h1>
        <div class="page-sub">Explora e inscríbete en los cursos de OTR</div>
      </div></div>
      ${courses.length
        ? `<div class="grid g-3">${courses.map(card).join("")}</div>`
        : `<div class="card"><div class="empty"><div class="ill">${IC.book}</div><h4>Sin cursos disponibles</h4><p>Pronto se publicarán nuevos cursos en el catálogo.</p></div></div>`}`;
    },
  },

  // "Mis cursos" — ÍNDICE de cursos del profesor (estilo lista de cursos de Moodle).
  // Cada tarjeta entra al constructor del curso (S.courseBuilder) vía data-go-builder.
  manage: {
    render() {
      const courses = DB.teacherCourses || [];
      const head = `<div class="page-head"><div><p class="eyebrow">Profesor</p><h1 class="page-title">Mis cursos</h1>
        <div class="page-sub">Crea un curso y entra a construirlo: secciones, lecciones, exámenes y tareas</div></div></div>
        <div class="row" style="margin-bottom:14px"><button class="btn btn-primary btn-sm" data-action="new-course">${IC.plus} Nuevo curso</button></div>`;
      if (!courses.length) {
        return head + `<div class="card"><div class="empty"><div class="ill">${IC.book}</div><h4>Sin cursos todavía</h4><p>Crea tu primer curso para empezar a construir su contenido.</p><button class="btn btn-primary btn-sm" data-action="new-course">${IC.plus} Nuevo curso</button></div></div>`;
      }
      const card = (c, i) => {
        const mods = c.modules || [];
        const lessons = mods.reduce((n, m) => n + ((m.lessons || []).length), 0);
        const pub = c.published === false ? `<span class="badge warn" style="flex:none">Borrador</span>` : `<span class="badge ok" style="flex:none">Publicado</span>`;
        return `<div class="card card-pad fade-up" style="margin-bottom:12px;--d:${Math.min(i, 6)}">
          <div class="row between vcenter" style="gap:12px;flex-wrap:wrap">
            <div class="row vcenter" style="gap:11px;min-width:0">${C.courseDot(c.color)}
              <div style="min-width:0"><div class="row vcenter" style="gap:8px;flex-wrap:wrap"><b style="font-size:15px;letter-spacing:-.01em">${esc(c.code)} · ${c.name}</b>${pub}</div>
              <div class="faint" style="font-size:12px;margin-top:2px">${mods.length} ${mods.length === 1 ? "sección" : "secciones"} · ${lessons} ${lessons === 1 ? "actividad" : "actividades"}${c.format ? ` · ${c.format}` : ""}</div></div>
            </div>
            <div class="row" style="gap:6px;flex:none">
              <button class="btn btn-primary btn-sm" data-go-builder="${c.id}">${IC.sliders} Construir curso</button>
              <button class="btn btn-ghost btn-sm" data-edit-course="${c.id}" data-name="${c.name}">${IC.pencil} Configuración</button>
              <button class="btn btn-quiet btn-sm" data-del="course:${c.id}" style="color:var(--danger)">${IC.flag} Eliminar</button>
            </div>
          </div>
        </div>`;
      };
      return head + courses.map(card).join("");
    },
    mount(root) { mountQuizButtons(root); },
  },

  // Constructor de curso (estilo página de curso de Moodle): secciones (módulos) con
  // sus actividades (lecciones), "Añadir sección", "Añadir actividad o recurso" (chooser),
  // toggle de Modo edición y vista previa como alumno. Lee el curso de DB.teacherCourses
  // por window.__builderCourseId (persistido en sessionStorage para sobrevivir a F5).
  courseBuilder: {
    render() {
      const courses = DB.teacherCourses || [];
      let id = (typeof window !== "undefined" && window.__builderCourseId) || "";
      if (!id && typeof window !== "undefined") { try { id = sessionStorage.getItem("otr_builder_course") || ""; window.__builderCourseId = id; } catch {} }
      const c = courses.find((x) => x.id === id);
      if (!c) {
        return `<div class="page-head"><div><p class="eyebrow">Profesor</p><h1 class="page-title">Constructor de curso</h1>
          <div class="page-sub">Elige un curso para construirlo.</div></div></div>
          <div class="card"><div class="empty"><div class="ill">${IC.book}</div><h4>Selecciona un curso</h4><p>Vuelve a "Mis cursos" y pulsa "Construir curso".</p><button class="btn btn-primary btn-sm" data-go="manage">Ver mis cursos</button></div></div>`;
      }
      const edit = typeof window !== "undefined" ? window.__editMode !== false : true;
      const mods = c.modules || [];
      const lessons = mods.reduce((n, m) => n + ((m.lessons || []).length), 0);
      const pub = c.published === false ? `<span class="badge warn" style="flex:none">Borrador</span>` : `<span class="badge ok" style="flex:none">Publicado</span>`;
      const head = `<div class="page-head"><div><p class="eyebrow">Profesor · Constructor de curso</p><h1 class="page-title">${esc(c.code)} · ${c.name}</h1>
        <div class="page-sub">${edit ? "Modo edición activo — añade secciones y actividades" : "Vista de solo lectura — activa el modo edición para construir"}</div></div></div>`;
      const hero = `
      <div class="card card-pad fade-up" style="margin-bottom:16px;--d:0">
        <div style="margin-bottom:10px"><button class="btn btn-quiet btn-sm" data-go="manage">${IC.chevL} Mis cursos</button></div>
        <div class="row between vcenter" style="gap:12px;flex-wrap:wrap">
          <div class="row vcenter" style="gap:12px;min-width:0">${C.courseDot(c.color)}
            <div style="min-width:0"><div class="row vcenter" style="gap:9px;flex-wrap:wrap"><h2 style="font-size:19px;font-weight:750">${esc(c.code)} · ${c.name}</h2>${pub}</div>
            <div class="faint" style="font-size:12.5px;margin-top:3px">${mods.length} ${mods.length === 1 ? "sección" : "secciones"} · ${lessons} ${lessons === 1 ? "actividad" : "actividades"}${c.format ? ` · ${c.format}` : ""}${c.modality ? ` · ${c.modality}` : ""}</div></div>
          </div>
          <div class="row vcenter" style="gap:6px;flex:none">
            <span class="save-chip" data-save-chip style="display:none"></span>
            <button class="btn ${edit ? "btn-primary" : "btn-soft"} btn-sm" data-toggle-edit title="Mostrar/ocultar controles de edición">${IC.sliders} Modo edición: ${edit ? "ON" : "OFF"}</button>
            <button class="btn ${c.published === false ? "btn-primary" : "btn-ghost"} btn-sm" data-publish-course="${c.id}" data-pub="${c.published === false ? "0" : "1"}" title="Publicar o pasar a borrador sin abrir Configuración">${c.published === false ? `${IC.check} Publicar curso` : `${IC.eye} Pasar a borrador`}</button>
            <button class="btn btn-ghost btn-sm" data-edit-course="${c.id}" data-name="${c.name}">${IC.pencil} Configuración</button>
            <button class="btn btn-ghost btn-sm" onclick="window.__course='${esc(c.code)}';go('course')">${IC.play} Vista previa (como alumno)</button>
          </div>
        </div>
      </div>`;
      const sections = mods.length
        ? mods.map((m) => sectionBlock(m, c.id, edit)).join("")
        : `<div class="empty" style="padding:24px"><div class="ill">${IC.grid}</div><h4>Sin secciones todavía</h4><p>Añade tu primera sección para organizar el contenido del curso.</p>${edit ? `<button class="btn btn-primary btn-sm" data-add-module="${c.id}">${IC.plus} Añadir sección</button>` : ""}</div>`;
      const addSection = edit && mods.length ? `<div style="border-top:1px solid var(--border);padding:14px 0 2px"><button class="btn btn-soft btn-sm" data-add-module="${c.id}">${IC.plus} Añadir sección</button></div>` : "";
      const tools = mods.length ? `<div class="row between vcenter" style="margin-bottom:2px"><span class="faint" style="font-size:12px">${mods.length} ${mods.length === 1 ? "sección" : "secciones"}</span><button class="btn btn-quiet btn-sm" data-collapse-all>Colapsar todo</button></div>` : "";
      const body = `<div class="card card-pad fade-up" style="--d:1">${tools}${sections}${addSection}</div>`;
      return head + hero + body;
    },
    mount(root) { mountBuilder(root); },
  },

  search: {
    render() {
      const q = (window.__q || "").toLowerCase().trim();
      const courses = (DB.catalog || []).filter((c) => `${c.name} ${c.code} ${c.coach}`.toLowerCase().includes(q));
      const people = (DB.students || []).filter((s) => s.n.toLowerCase().includes(q));
      // Foro APAGADO (PRD-estricto): sin sección de discusiones en los resultados.
      const total = courses.length + people.length;
      let _sec = 0;
      const section = (title, count, body) => body ? `<div class="kit-section fade-up" style="--d:${_sec++}"><h3 class="row between vcenter"><span>${title}</span><span class="badge-count">${count}</span></h3>${body}</div>` : "";
      return `
      <div class="page-head"><div><p class="eyebrow">Búsqueda</p><h1 class="page-title">Resultados para "${esc(window.__q || "")}"</h1>
      <div class="page-sub">${total} resultado${total === 1 ? "" : "s"}</div></div></div>
      ${total === 0 ? `<div class="card"><div class="empty"><div class="ill">${IC.search}</div><h4>Sin resultados</h4><p>No encontramos nada para "${esc(window.__q || "")}". Prueba con otra búsqueda.</p></div></div>` : ""}
      ${section("Cursos", courses.length, courses.length ? `<div class="grid g-3">${courses.map((c) => `<div class="tile click course-card"><div class="cc-top" style="background:linear-gradient(120deg,${c.color},#0C0C0C)"><span class="cc-code">${esc(c.code)}</span></div><div class="cc-body"><div class="cc-name">${c.name}</div><div class="cc-coach row vcenter" style="gap:6px"><span style="display:flex;width:13px">${IC.user}</span>${c.coach}</div></div></div>`).join("")}</div>` : "")}
      ${section("Personas", people.length, people.length ? `<div class="card">${people.map((s) => `<div class="lrow" style="gap:11px">${C.avatar(s.i, { size: "sm" })}<div style="flex:1;min-width:0"><b style="font-weight:600">${esc(s.n)}</b></div>${C.levelBadge(s.lvl)}</div>`).join("")}</div>` : "")}`;
    },
  },
};
