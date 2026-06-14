// @ts-nocheck
// Pantallas adicionales: Catálogo (inscripción) · Gestión de contenido (profesor) · Búsqueda.
import { DB } from "./data";
import { C } from "./components";
import { IC } from "./icons";
import { esc } from "./esc";

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

  manage: {
    render() {
      const courses = DB.teacherCourses || [];
      if (!courses.length) {
        return `<div class="page-head"><div><p class="eyebrow">Profesor</p><div class="page-title">Gestión de contenido</div>
          <div class="page-sub">Crea tu primer curso y empieza a añadirle módulos y lecciones.</div></div></div>
          <div class="card"><div class="empty"><div class="ill">${IC.book}</div><h4>Sin cursos todavía</h4><p>Crea tu primer curso para empezar a construir su contenido.</p><button class="btn btn-primary btn-sm" data-action="new-course">${IC.plus} Nuevo curso</button></div></div>`;
      }
      const lesson = (l, mid) => {
        // Estado del examen (mismo criterio que el panel de S.teacher).
        const isQuiz = l.type === 'quiz';
        const quizInDb = (DB.quizByLesson || {})[l.id];
        const quizBadge = isQuiz
          ? (quizInDb
              ? `<span class="badge ok" style="height:18px;font-size:10px;gap:3px;flex:none">${IC.check} ${quizInDb.questions?.length || 0} preg.</span>`
              : `<span class="badge warn" style="height:18px;font-size:10px;flex:none">Sin preguntas</span>`)
          : '';
        return `<div class="row between vcenter" style="padding:7px 0 7px 18px;font-size:13px;color:var(--text-2)">
        <span class="row vcenter" style="gap:8px;min-width:0"><span style="display:flex;width:15px;color:var(--text-3);flex:none">${C.typeIcon(l.type)}</span><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(l.title)}</span>${l.videoKind && l.videoKind !== 'none' ? `<span class="badge sky" style="height:18px;font-size:10px;gap:3px;flex:none">${IC.video} ${l.videoKind === 'youtube' ? 'YouTube' : 'Stream'}</span>` : ''}${quizBadge}</span>
        <span class="row" style="gap:4px;flex:none"><button class="btn btn-quiet btn-sm" data-reorder-lesson="${mid}:${l.id}:up" title="Subir">↑</button><button class="btn btn-quiet btn-sm" data-reorder-lesson="${mid}:${l.id}:down" title="Bajar">↓</button>${isQuiz ? `<button class="btn btn-soft btn-sm" data-tm="quiz" data-lesson="${l.id}" data-title="${esc(l.title)}" title="Constructor de examen">${IC.doc} Examen</button>` : ''}<button class="btn btn-quiet btn-sm" data-edit-lesson="${l.id}" title="Editar lección">${IC.pencil}</button>
        <button class="btn btn-quiet btn-sm" data-del="lesson:${l.id}" style="color:var(--danger)" title="Eliminar lección">${IC.close}</button></span></div>`;
      };
      const mod = (m, cid) => `<div style="border-top:1px solid var(--border);padding:12px 0 6px">
        <div class="row between vcenter" style="margin-bottom:4px"><b class="row vcenter" style="gap:7px;font-size:13.5px"><span style="display:flex;width:14px;color:var(--text-3)">${IC.grid}</span>${esc(m.title)}</b>
          <span class="row" style="gap:4px;flex:none"><button class="btn btn-soft btn-sm" data-add-lesson="${m.id}" title="Añadir lección a este módulo">${IC.plus} Lección</button><button class="btn btn-quiet btn-sm" data-reorder-module="${cid}:${m.id}:up" title="Subir módulo">↑</button><button class="btn btn-quiet btn-sm" data-reorder-module="${cid}:${m.id}:down" title="Bajar módulo">↓</button><button class="btn btn-quiet btn-sm" data-edit-module="${m.id}" data-title="${esc(m.title)}" title="Editar módulo">${IC.pencil}</button><button class="btn btn-quiet btn-sm" data-del="module:${m.id}" style="color:var(--danger)">Eliminar módulo</button></span></div>
        ${m.lessons.map((l) => lesson(l, m.id)).join("") || `<div class="row vcenter" style="gap:10px;padding:6px 0 0 18px"><span class="faint" style="font-size:12px">Sin lecciones todavía.</span><button class="btn btn-soft btn-sm" data-add-lesson="${m.id}">${IC.plus} Añadir lección</button></div>`}
      </div>`;
      const course = (c, i = 0) => `<div class="card card-pad fade-up" style="margin-bottom:14px;--d:${i}">
        <div class="row between vcenter" style="gap:12px;flex-wrap:wrap">
          <div class="row vcenter" style="gap:10px;min-width:0">${C.courseDot(c.color)}<b style="font-size:15px;letter-spacing:-.01em">${esc(c.code)} · ${esc(c.name)}</b></div>
          <div class="row" style="gap:6px;flex:none">
            <button class="btn btn-soft btn-sm" data-add-module="${c.id}" title="Añadir módulo a este curso">${IC.plus} Módulo</button>
            <button class="btn btn-ghost btn-sm" data-edit-course="${c.id}" data-name="${esc(c.name)}">${IC.pencil} Editar</button>
            <button class="btn btn-quiet btn-sm" data-del="course:${c.id}" style="color:var(--danger)">${IC.flag} Eliminar</button>
          </div>
        </div>
        ${c.modules.map((m) => mod(m, c.id)).join("") || `<div class="row vcenter" style="gap:10px;margin-top:10px"><span class="faint" style="font-size:12px">Sin módulos todavía.</span><button class="btn btn-soft btn-sm" data-add-module="${c.id}">${IC.plus} Añadir primer módulo</button></div>`}
      </div>`;
      return `
      <div class="page-head"><div><p class="eyebrow">Profesor</p><div class="page-title">Gestión de contenido</div>
      <div class="page-sub">Crea cursos y añade módulos y lecciones dentro de cada uno</div></div></div>
      <div class="row" style="margin-bottom:14px"><button class="btn btn-primary btn-sm" data-action="new-course">${IC.plus} Nuevo curso</button></div>
      ${courses.map(course).join("")}`;
    },
    // El constructor de examen vive en scr-teacher.ts y se expone como
    // window.otrOpenQuizBuilder. Aquí solo lo cableamos para los botones
    // "Examen" de las lecciones type='quiz'. (edit/del usan la delegación de Aula.tsx.)
    mount(root) {
      if (!root) return;
      root.addEventListener("click", (e) => {
        const btn = e.target.closest && e.target.closest('[data-tm="quiz"]');
        if (!btn || !root.contains(btn)) return;
        e.preventDefault();
        if (typeof window !== "undefined" && window.otrOpenQuizBuilder)
          window.otrOpenQuizBuilder(btn.getAttribute("data-lesson"), btn.getAttribute("data-title"));
      });
    },
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
