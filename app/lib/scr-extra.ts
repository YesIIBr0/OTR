// @ts-nocheck
// Pantallas adicionales: Catálogo (inscripción) · Gestión de contenido (profesor) · Búsqueda.
import { DB } from "./data";
import { C } from "./components";
import { IC } from "./icons";

export const S = {
  catalog: {
    render() {
      const courses = DB.catalog || [];
      const card = (c) => `
        <div class="tile course-card">
          <div class="cc-top" style="background:linear-gradient(120deg,${c.color},color-mix(in srgb,${c.color} 55%, #0C2340))">
            <span class="cc-code">${c.code}</span>
          </div>
          <div class="cc-body">
            <div class="cc-name">${c.name}</div>
            <div class="cc-coach">${c.coach}</div>
            <div class="cc-foot" style="margin-top:14px;align-items:center">
              ${c.price > 0 ? `<span class="cc-pct">$${(c.price / 100).toFixed(0)}</span>` : `<span class="badge ok">Gratis</span>`}
              ${c.enrolled
                ? `<span class="badge ok"><span class="dot"></span>Inscrito</span>`
                : `<button class="btn btn-primary btn-sm" data-enroll="${c.id}">${IC.plus} Inscribirme</button>`}
            </div>
          </div>
        </div>`;
      return `
      <div class="page-head"><div>
        <div class="page-title">Catálogo de cursos</div>
        <div class="page-sub">Explora e inscríbete en los cursos de OTR</div>
      </div></div>
      <div class="grid g-3">${courses.map(card).join("")}</div>`;
    },
  },

  manage: {
    render() {
      const courses = DB.teacherCourses || [];
      if (!courses.length) {
        return `<div class="page-head"><div><div class="page-title">Gestión de contenido</div>
          <div class="page-sub">Aún no tienes cursos. Usa el botón <b>+ Crear</b> arriba para empezar.</div></div></div>
          <div class="card"><div class="empty"><div class="ill">${IC.book}</div><h4>Sin cursos todavía</h4><p>Crea tu primer curso con "+ Crear → Nuevo curso".</p></div></div>`;
      }
      const lesson = (l) => `<div class="row between vcenter" style="padding:6px 0 6px 16px;font-size:13px;color:var(--text-2)">
        <span class="row vcenter" style="gap:8px"><span style="display:flex;width:15px">${C.typeIcon(l.type)}</span>${l.title}${l.videoKind && l.videoKind !== 'none' ? `<span class="badge sky" style="height:18px;font-size:10px;gap:3px">${IC.video} ${l.videoKind === 'youtube' ? 'YouTube' : 'Stream'}</span>` : ''}</span>
        <span class="row" style="gap:4px"><button class="btn btn-quiet btn-sm" data-edit-lesson="${l.id}" title="Editar lección">${IC.pencil}</button>
        <button class="btn btn-quiet btn-sm" data-del="lesson:${l.id}" title="Eliminar lección">✕</button></span></div>`;
      const mod = (m) => `<div style="border-top:1px solid var(--border);padding:10px 0">
        <div class="row between vcenter"><b style="font-size:13.5px">${m.title}</b>
          <button class="btn btn-quiet btn-sm" data-del="module:${m.id}" style="color:var(--danger)">Eliminar módulo</button></div>
        ${m.lessons.map(lesson).join("") || '<div class="faint" style="font-size:12px;padding:6px 0 0 16px">Sin lecciones — añade con "+ Crear"</div>'}
      </div>`;
      const course = (c) => `<div class="card card-pad" style="margin-bottom:14px">
        <div class="row between vcenter">
          <div class="row vcenter" style="gap:10px"><span style="width:11px;height:11px;border-radius:3px;background:${c.color}"></span><b style="font-size:15px">${c.code} · ${c.name}</b></div>
          <div class="row" style="gap:6px">
            <button class="btn btn-ghost btn-sm" data-edit-course="${c.id}" data-name="${c.name}">${IC.pencil} Editar</button>
            <button class="btn btn-quiet btn-sm" data-del="course:${c.id}" style="color:var(--danger)">${IC.flag} Eliminar</button>
          </div>
        </div>
        ${c.modules.map(mod).join("") || '<div class="faint" style="font-size:12px;margin-top:8px">Sin módulos todavía — añade con "+ Crear → Nuevo módulo"</div>'}
      </div>`;
      return `
      <div class="page-head"><div><div class="page-title">Gestión de contenido</div>
      <div class="page-sub">Edita y elimina tus cursos, módulos y lecciones · usa <b>+ Crear</b> para añadir</div></div></div>
      ${courses.map(course).join("")}`;
    },
  },

  search: {
    render() {
      const q = (window.__q || "").toLowerCase().trim();
      const courses = (DB.catalog || []).filter((c) => `${c.name} ${c.code} ${c.coach}`.toLowerCase().includes(q));
      const people = (DB.students || []).filter((s) => s.n.toLowerCase().includes(q));
      const threads = (DB.forum || []).filter((t) => `${t.title} ${t.tag}`.toLowerCase().includes(q));
      const total = courses.length + people.length + threads.length;
      const section = (title, body) => body ? `<div class="kit-section"><h3>${title}</h3>${body}</div>` : "";
      return `
      <div class="page-head"><div><div class="page-title">Resultados para "${window.__q || ""}"</div>
      <div class="page-sub">${total} resultado${total === 1 ? "" : "s"}</div></div></div>
      ${total === 0 ? `<div class="card"><div class="empty"><div class="ill">${IC.search}</div><h4>Sin resultados</h4><p>Prueba con otra búsqueda.</p></div></div>` : ""}
      ${section("Cursos", courses.length ? `<div class="grid g-3">${courses.map((c) => `<div class="tile course-card"><div class="cc-top" style="background:linear-gradient(120deg,${c.color},#0C2340)"><span class="cc-code">${c.code}</span></div><div class="cc-body"><div class="cc-name">${c.name}</div><div class="cc-coach">${c.coach}</div></div></div>`).join("")}</div>` : "")}
      ${section("Personas", people.length ? `<div class="card">${people.map((s) => `<div class="lrow" style="padding:10px 16px;gap:10px">${C.avatar(s.i, { size: "sm" })}<div style="flex:1"><b>${s.n}</b></div>${C.levelBadge(s.lvl)}</div>`).join("")}</div>` : "")}
      ${section("Foro", threads.length ? `<div class="card">${threads.map((t) => `<div class="forum-row" onclick="go('forum-thread')">${C.avatar(t.ini, { size: "sm" })}<div class="fr-main"><div class="fr-title">${t.title}</div><div class="fr-meta"><span class="tag-soft">${t.tag}</span></div></div></div>`).join("")}</div>` : "")}`;
    },
  },
};
