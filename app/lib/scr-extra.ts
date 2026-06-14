// @ts-nocheck
// Pantallas adicionales: Catálogo (inscripción) · Gestión de contenido (profesor) · Búsqueda.
import { DB } from "./data";
import { C } from "./components";
import { IC } from "./icons";
import { esc } from "./esc";

/* ---- Helpers de autoría reutilizados por "Mis cursos" y el constructor de curso ---- */
// Fila de ACTIVIDAD (lección). edit=true muestra los controles de autoría (estilo Moodle).
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
  const controls = edit
    ? `<span class="row" style="gap:4px;flex:none"><button class="btn btn-quiet btn-sm" data-reorder-lesson="${mid}:${l.id}:up" title="Subir">↑</button><button class="btn btn-quiet btn-sm" data-reorder-lesson="${mid}:${l.id}:down" title="Bajar">↓</button>${isQuiz ? `<button class="btn btn-soft btn-sm" data-tm="quiz" data-lesson="${l.id}" data-title="${esc(l.title)}" title="Constructor de examen">${IC.doc} Examen</button>` : ""}<button class="btn btn-quiet btn-sm" data-edit-lesson="${l.id}" title="Editar actividad">${IC.pencil}</button><button class="btn btn-quiet btn-sm" data-del="lesson:${l.id}" style="color:var(--danger)" title="Eliminar">${IC.close}</button></span>`
    : "";
  return `<div class="row between vcenter" style="padding:7px 0 7px 18px;font-size:13px;color:var(--text-2)">
    <span class="row vcenter" style="gap:8px;min-width:0"><span style="display:flex;width:15px;color:var(--text-3);flex:none">${C.typeIcon(l.type)}</span><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(l.title)}</span>${videoBadge}${quizBadge}</span>
    ${controls}</div>`;
}
// Bloque de SECCIÓN (módulo) con sus actividades. edit gobierna los affordances.
function sectionBlock(m, cid, edit) {
  const ctrls = edit
    ? `<span class="row" style="gap:4px;flex:none"><button class="btn btn-quiet btn-sm" data-reorder-module="${cid}:${m.id}:up" title="Subir sección">↑</button><button class="btn btn-quiet btn-sm" data-reorder-module="${cid}:${m.id}:down" title="Bajar sección">↓</button><button class="btn btn-quiet btn-sm" data-edit-module="${m.id}" data-title="${esc(m.title)}" title="Renombrar sección">${IC.pencil}</button><button class="btn btn-quiet btn-sm" data-del="module:${m.id}" style="color:var(--danger)">Eliminar</button></span>`
    : "";
  const rows = (m.lessons || []).map((l) => lessonRow(l, m.id, edit)).join("")
    || `<div class="faint" style="font-size:12px;padding:6px 0 0 18px">Sin actividades todavía.</div>`;
  const add = edit
    ? `<div style="padding:10px 0 2px 18px"><button class="btn btn-soft btn-sm" data-open-chooser="${m.id}">${IC.plus} Añadir actividad o recurso</button></div>`
    : "";
  return `<div style="border-top:1px solid var(--border);padding:12px 0 6px">
    <div class="row between vcenter" style="margin-bottom:4px"><b class="row vcenter" style="gap:7px;font-size:13.5px"><span style="display:flex;width:14px;color:var(--text-3)">${IC.grid}</span>${esc(m.title)}</b>${ctrls}</div>
    ${rows}${add}</div>`;
}
// Cablea los botones "Examen" (data-tm=quiz) al quiz builder global (window.otrOpenQuizBuilder).
function mountQuizButtons(root) {
  if (!root) return;
  root.addEventListener("click", (e) => {
    const btn = e.target.closest && e.target.closest('[data-tm="quiz"]');
    if (!btn || !root.contains(btn)) return;
    e.preventDefault();
    if (typeof window !== "undefined" && window.otrOpenQuizBuilder)
      window.otrOpenQuizBuilder(btn.getAttribute("data-lesson"), btn.getAttribute("data-title"));
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
            <div class="cc-name">${esc(c.name)}</div>
            <div class="cc-coach row vcenter" style="gap:6px"><span style="display:flex;width:13px">${IC.user}</span>${esc(c.coach)}</div>
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
        <div class="page-title">Catálogo de cursos</div>
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
      const head = `<div class="page-head"><div><p class="eyebrow">Profesor</p><div class="page-title">Mis cursos</div>
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
              <div style="min-width:0"><div class="row vcenter" style="gap:8px;flex-wrap:wrap"><b style="font-size:15px;letter-spacing:-.01em">${esc(c.code)} · ${esc(c.name)}</b>${pub}</div>
              <div class="faint" style="font-size:12px;margin-top:2px">${mods.length} ${mods.length === 1 ? "sección" : "secciones"} · ${lessons} ${lessons === 1 ? "actividad" : "actividades"}${c.format ? ` · ${esc(c.format)}` : ""}</div></div>
            </div>
            <div class="row" style="gap:6px;flex:none">
              <button class="btn btn-primary btn-sm" data-go-builder="${c.id}">${IC.sliders} Construir curso</button>
              <button class="btn btn-ghost btn-sm" data-edit-course="${c.id}" data-name="${esc(c.name)}">${IC.pencil} Configuración</button>
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
        return `<div class="page-head"><div><p class="eyebrow">Profesor</p><div class="page-title">Constructor de curso</div>
          <div class="page-sub">Elige un curso para construirlo.</div></div></div>
          <div class="card"><div class="empty"><div class="ill">${IC.book}</div><h4>Selecciona un curso</h4><p>Vuelve a "Mis cursos" y pulsa "Construir curso".</p><button class="btn btn-primary btn-sm" data-go="manage">Ver mis cursos</button></div></div>`;
      }
      const edit = typeof window !== "undefined" ? window.__editMode !== false : true;
      const mods = c.modules || [];
      const lessons = mods.reduce((n, m) => n + ((m.lessons || []).length), 0);
      const pub = c.published === false ? `<span class="badge warn" style="flex:none">Borrador</span>` : `<span class="badge ok" style="flex:none">Publicado</span>`;
      const head = `<div class="page-head"><div><p class="eyebrow">Profesor · Constructor de curso</p><div class="page-title">${esc(c.code)} · ${esc(c.name)}</div>
        <div class="page-sub">${edit ? "Modo edición activo — añade secciones y actividades" : "Vista de solo lectura — activa el modo edición para construir"}</div></div></div>`;
      const hero = `
      <div class="card card-pad fade-up" style="margin-bottom:16px;--d:0">
        <div style="margin-bottom:10px"><button class="btn btn-quiet btn-sm" data-go="manage">${IC.chevL} Mis cursos</button></div>
        <div class="row between vcenter" style="gap:12px;flex-wrap:wrap">
          <div class="row vcenter" style="gap:12px;min-width:0">${C.courseDot(c.color)}
            <div style="min-width:0"><div class="row vcenter" style="gap:9px;flex-wrap:wrap"><h2 style="font-size:19px;font-weight:750">${esc(c.code)} · ${esc(c.name)}</h2>${pub}</div>
            <div class="faint" style="font-size:12.5px;margin-top:3px">${mods.length} ${mods.length === 1 ? "sección" : "secciones"} · ${lessons} ${lessons === 1 ? "actividad" : "actividades"}${c.format ? ` · ${esc(c.format)}` : ""}${c.modality ? ` · ${esc(c.modality)}` : ""}</div></div>
          </div>
          <div class="row" style="gap:6px;flex:none">
            <button class="btn ${edit ? "btn-primary" : "btn-soft"} btn-sm" data-toggle-edit title="Mostrar/ocultar controles de edición">${IC.sliders} Modo edición: ${edit ? "ON" : "OFF"}</button>
            <button class="btn btn-ghost btn-sm" data-edit-course="${c.id}" data-name="${esc(c.name)}">${IC.pencil} Configuración</button>
            <button class="btn btn-ghost btn-sm" data-go="course">${IC.play} Vista previa</button>
          </div>
        </div>
      </div>`;
      const sections = mods.length
        ? mods.map((m) => sectionBlock(m, c.id, edit)).join("")
        : `<div class="empty" style="padding:24px"><div class="ill">${IC.grid}</div><h4>Sin secciones todavía</h4><p>Añade tu primera sección para organizar el contenido del curso.</p>${edit ? `<button class="btn btn-primary btn-sm" data-add-module="${c.id}">${IC.plus} Añadir sección</button>` : ""}</div>`;
      const addSection = edit && mods.length ? `<div style="border-top:1px solid var(--border);padding:14px 0 2px"><button class="btn btn-soft btn-sm" data-add-module="${c.id}">${IC.plus} Añadir sección</button></div>` : "";
      const body = `<div class="card card-pad fade-up" style="--d:1">${sections}${addSection}</div>`;
      return head + hero + body;
    },
    mount(root) { mountQuizButtons(root); },
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
      <div class="page-head"><div><p class="eyebrow">Búsqueda</p><div class="page-title">Resultados para "${esc(window.__q || "")}"</div>
      <div class="page-sub">${total} resultado${total === 1 ? "" : "s"}</div></div></div>
      ${total === 0 ? `<div class="card"><div class="empty"><div class="ill">${IC.search}</div><h4>Sin resultados</h4><p>No encontramos nada para "${esc(window.__q || "")}". Prueba con otra búsqueda.</p></div></div>` : ""}
      ${section("Cursos", courses.length, courses.length ? `<div class="grid g-3">${courses.map((c) => `<div class="tile click course-card"><div class="cc-top" style="background:linear-gradient(120deg,${c.color},#0C0C0C)"><span class="cc-code">${esc(c.code)}</span></div><div class="cc-body"><div class="cc-name">${esc(c.name)}</div><div class="cc-coach row vcenter" style="gap:6px"><span style="display:flex;width:13px">${IC.user}</span>${esc(c.coach)}</div></div></div>`).join("")}</div>` : "")}
      ${section("Personas", people.length, people.length ? `<div class="card">${people.map((s) => `<div class="lrow" style="gap:11px">${C.avatar(s.i, { size: "sm" })}<div style="flex:1;min-width:0"><b style="font-weight:600">${esc(s.n)}</b></div>${C.levelBadge(s.lvl)}</div>`).join("")}</div>` : "")}`;
    },
  },
};
