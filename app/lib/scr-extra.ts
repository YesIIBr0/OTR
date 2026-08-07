// @ts-nocheck
// Pantallas adicionales: Catálogo (inscripción) · Gestión de contenido (profesor) · Búsqueda.
import { DB } from "./data";
import { C } from "./components";
import { IC } from "./icons";
import { esc } from "./esc";
import { matches } from "./text";
import { t, registerDict } from "./i18n";
// [F4.1] Registra el diccionario de esta pantalla en SU chunk (fuera del inicial): extra.* — los prefijos err.*/apierr.* que antes vivían aquí son CHROME (i18n-keys/chrome.ts). Ver app/lib/i18n.ts.
import { dict as d_extra } from "./i18n-keys/extra";
registerDict(d_extra);
import { videoEmbedHtml } from "./video";

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
  el.textContent = state === "saving" ? t("extra.saving") : t("extra.saved");
  if (state === "saved") { clearTimeout(el.__t); el.__t = setTimeout(() => { el.style.display = "none"; }, 1600); }
}
// Fila de ACTIVIDAD (lección). edit=true: arrastrable (grip), renombrable (doble-clic), con controles.
function lessonRow(l, mid, edit) {
  const isQuiz = l.type === "quiz";
  const quizInDb = (DB.quizByLesson || {})[l.id];
  // [MOCKUP · Task 6] Los sellos de la fila son chips rectangulares del kit (r3, versalitas).
  const quizBadge = isQuiz
    ? (quizInDb
        ? C.chip(`${quizInDb.questions?.length || 0} ${t("extra.questionsAbbrev")}`, "tint", { ic: "check" })
        : C.chip(t("extra.noQuestions"), "outline"))
    : "";
  const videoBadge = l.videoKind && l.videoKind !== "none"
    ? C.chip(l.videoKind === "youtube" ? "YouTube" : "Stream", "info", { ic: "video" })
    : "";
  const isAssign = l.type === "assign" || l.type === "mic";
  const dueBadge = isAssign && l.dueAt ? C.chip(t("extra.dueBadge").replace("{date}", fmtDue(l.dueAt)), "outline", { ic: "calendar" }) : "";
  const ptsBadge = isAssign && l.maxPoints != null ? C.chip(`${l.maxPoints} ${t("extra.pointsAbbrev")}`, "outline") : "";
  const hiddenBadge = l.hidden ? C.chip(t("extra.hidden"), "outline") : "";
  const grip = edit ? `<span class="drag-grip" title="${t("extra.dragToReorder")}">${IC.grip}</span>` : "";
  const titleSpan = `<span class="lrow-title" ${edit ? `data-inline-rename="lesson:${l.id}"` : ""} style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap${edit ? ";cursor:text" : ""}" ${edit ? `title="${t("extra.dblClickRename")}"` : ""}>${esc(l.title)}</span>`;
  const controls = edit
    ? `<span class="row" style="gap:3px;flex:none"><button class="btn btn-quiet btn-sm" data-toggle-hidden="lesson:${l.id}" title="${l.hidden ? t("extra.showToStudent") : t("extra.hideFromStudent")}">${IC.eye}</button>${isQuiz ? `<button class="btn btn-soft btn-sm" data-tm="quiz" data-lesson="${l.id}" data-title="${esc(l.title)}" title="${t("extra.quizBuilder")}">${IC.doc} ${t("extra.exam")}</button>` : ""}<button class="btn btn-quiet btn-sm" data-duplicate="lesson:${l.id}" title="${t("extra.duplicate")}">${IC.copy}</button><button class="btn btn-quiet btn-sm" data-reorder-lesson="${mid}:${l.id}:up" title="${t("extra.moveUp")}">↑</button><button class="btn btn-quiet btn-sm" data-reorder-lesson="${mid}:${l.id}:down" title="${t("extra.moveDown")}">↓</button><button class="btn btn-quiet btn-sm" data-edit-lesson="${l.id}" title="${t("extra.editActivity")}">${IC.pencil}</button><button class="btn btn-quiet btn-sm" data-del="lesson:${l.id}" style="color:var(--danger)" title="${t("extra.delete")}">${IC.close}</button></span>`
    : "";
  return `<div class="row between vcenter lrow" ${edit ? `draggable="true" data-drag="lesson:${l.id}:${mid}"` : ""} style="padding:7px 0 7px ${edit ? "4px" : "18px"};font-size:13px;color:var(--text-2)${l.hidden ? ";opacity:.5" : ""}">
    <span class="row vcenter" style="gap:6px;min-width:0">${grip}<span style="display:flex;width:15px;color:var(--text-3);flex:none">${C.typeIcon(l.type)}</span>${titleSpan}${videoBadge}${quizBadge}${dueBadge}${ptsBadge}${hiddenBadge}</span>
    ${controls}</div>`;
}
// Bloque de SECCIÓN (módulo). edit: arrastrable, renombrable (doble-clic), colapsable.
function sectionBlock(m, cid, edit) {
  const ctrls = edit
    ? `<span class="row" style="gap:3px;flex:none"><button class="btn btn-quiet btn-sm" data-toggle-hidden="module:${m.id}" title="${m.hidden ? t("extra.showToStudent") : t("extra.hideFromStudent")}">${IC.eye}</button><button class="btn btn-quiet btn-sm" data-duplicate="module:${m.id}" title="${t("extra.duplicateSection")}">${IC.copy}</button><button class="btn btn-quiet btn-sm" data-reorder-module="${cid}:${m.id}:up" title="${t("extra.moveSectionUp")}">↑</button><button class="btn btn-quiet btn-sm" data-reorder-module="${cid}:${m.id}:down" title="${t("extra.moveSectionDown")}">↓</button><button class="btn btn-quiet btn-sm" data-edit-module="${m.id}" data-title="${esc(m.title)}" title="${t("extra.renameSection")}">${IC.pencil}</button><button class="btn btn-quiet btn-sm" data-del="module:${m.id}" style="color:var(--danger)">${t("extra.delete")}</button></span>`
    : "";
  const rows = (m.lessons || []).map((l) => lessonRow(l, m.id, edit)).join("")
    || `<div class="faint" style="font-size:12px;padding:6px 0 0 18px">${t("extra.noActivitiesYet")}</div>`;
  const add = edit
    ? `<div style="padding:10px 0 2px 18px"><button class="btn btn-soft btn-sm" data-open-chooser="${m.id}">${IC.plus} ${t("extra.addActivityOrResource")}</button></div>`
    : "";
  const grip = edit ? `<span class="drag-grip" title="${t("extra.dragToReorderSection")}">${IC.grip}</span>` : "";
  return `<div class="secblk" data-sec="${m.id}" ${edit ? `draggable="true" data-drag="module:${m.id}:${cid}"` : ""} style="border-top:1px solid var(--border);padding:12px 0 6px${m.hidden ? ";opacity:.55" : ""}">
    <div class="row between vcenter" style="margin-bottom:4px;gap:6px">
      ${grip}
      <b class="row vcenter" data-acc-sec="${m.id}" style="gap:7px;font-size:13.5px;cursor:pointer;min-width:0;flex:1"><span class="sec-chev" style="display:flex;width:12px;color:var(--text-3);transition:transform .2s;flex:none">${IC.chevD}</span><span style="display:flex;width:14px;color:var(--text-3);flex:none">${IC.grid}</span>${/* [MOCKUP · Task 6] Antes esta clase era `sec-title`: choca con el .sec-title del KIT
      (barra naranja + 17/800). El título de sección del constructor pasa a `secblk-title`. */""}<span class="secblk-title" ${edit ? `data-inline-rename="module:${m.id}"` : ""} style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap${edit ? ";cursor:text" : ""}">${esc(m.title)}</span>${m.hidden ? C.chip(t("extra.hidden"), "outline") : ""}</b>${ctrls}
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
      ca.textContent = anyOpen ? t("extra.expandAll") : t("extra.collapseAll");
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
        window.api(url, { title: val }, "PATCH").then(() => saveChip(root, "saved")).catch(() => { saveChip(root, ""); span.textContent = orig; window.toast?.(t("extra.renameFailed"), "danger"); });
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
      window.api(url, body, "POST").then(() => saveChip(root, "saved")).catch(() => { saveChip(root, ""); window.toast?.(t("extra.reorderFailed"), "danger"); });
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
          <div class="cc-top" style="background:linear-gradient(120deg,${c.color},color-mix(in srgb,${c.color} 55%, #171717))">
            <span class="cc-code">${esc(c.code)}</span>
          </div>
          <div class="cc-body">
            <div class="cc-name">${c.name}</div>
            <div class="cc-coach row vcenter" style="gap:6px"><span style="display:flex;width:13px">${IC.user}</span>${c.coach}</div>
            ${c.rating != null
              ? `<div class="row vcenter" style="gap:5px;margin-top:6px;font-size:12.5px"><span style="color:var(--otr-gold,#F25623)">★</span><b>${Number(c.rating).toFixed(1)}</b>${c.reviewCount ? `<span class="faint">· ${c.reviewCount}</span>` : ""}</div>`
              : ""}
            ${c.summary
              ? `<p class="faint" style="font-size:12px;line-height:1.45;margin-top:6px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${c.summary}</p>`
              : ""}
            ${c.welcomeVideoKind && c.welcomeVideoKind !== "none" && c.welcomeVideoSrc
              ? `<button class="btn btn-soft btn-sm" style="margin-top:10px" data-welcome-video data-wv-kind="${esc(c.welcomeVideoKind)}" data-wv-src="${esc(c.welcomeVideoSrc)}" data-wv-name="${c.name}">${IC.play} ${t("extra.welcomeVideoBtn")}</button>`
              : ""}
            <div class="cc-foot" style="margin-top:16px">
              ${c.price > 0 ? `<span class="cc-pct">$${(c.price / 100).toFixed(0)}</span>` : C.chip(t("extra.free"), "outline")}
              ${c.enrolled
                ? C.chip(t("extra.enrolled"), "tint", { ic: "check" })
                : C.btn(t("extra.enroll"), "accent", { size: "sm", ic: "plus", attrs: `data-enroll="${c.id}"` })}
            </div>
          </div>
        </div>`;
      return `
      <div class="page-head page-head--rule"><div>
        <span class="ph-eyebrow">${t("extra.eyebrowAcademy")}</span>
        <h1 class="ph-title">${t("extra.catalogTitle")}</h1>
        <div class="page-sub" style="margin-top:8px">${t("extra.catalogSub")}</div>
      </div>
      <div class="stat-group">${C.statInline(courses.length, t("extra.coursesSection"))}</div></div>
      ${courses.length
        ? `<div class="grid g-3">${courses.map(card).join("")}</div>`
        : `<div class="card"><div class="empty"><div class="ill">${IC.book}</div><h4>${t("extra.catalogEmptyHeading")}</h4><p>${t("extra.catalogEmptyBody")}</p></div></div>`}`;
    },
    // [CATÁLOGO · llamada Isaac] Abre el video de bienvenida del profe en un visor ligero.
    // No usa window.modal (trae botón "Guardar" con toast): aquí solo se ve y se cierra.
    mount(root) {
      root.querySelectorAll("[data-welcome-video]").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.preventDefault(); e.stopPropagation();
          const kind = btn.getAttribute("data-wv-kind");
          const src = btn.getAttribute("data-wv-src");
          const name = btn.getAttribute("data-wv-name") || "";
          const scrim = document.createElement("div");
          scrim.className = "modal-scrim";
          scrim.innerHTML = `<div class="modal" role="dialog" aria-label="${esc(name)}" style="max-width:720px"><div class="modal-head"><h3>${esc(name)}</h3></div><div class="modal-body">${videoEmbedHtml(kind, src)}</div><div class="modal-foot"><button class="btn btn-primary" data-wv-close>${t("extra.close")}</button></div></div>`;
          document.body.appendChild(scrim);
          const close = () => scrim.remove();
          scrim.addEventListener("click", (ev) => { const tg = ev.target; if (tg === scrim || (tg.closest && tg.closest("[data-wv-close]"))) close(); });
          document.addEventListener("keydown", function onEsc(ev) { if (ev.key === "Escape") { close(); document.removeEventListener("keydown", onEsc); } });
        });
      });
    },
  },

  // "Mis cursos" — ÍNDICE de cursos del profesor (estilo lista de cursos de Moodle).
  // Cada tarjeta entra al constructor del curso (S.courseBuilder) vía data-go-builder.
  manage: {
    render() {
      const courses = DB.teacherCourses || [];
      const head = `<div class="page-head page-head--rule"><div><span class="ph-eyebrow">${t("extra.eyebrowTeacher")}</span><h1 class="ph-title">${t("extra.myCoursesTitle")}</h1>
        <div class="page-sub" style="margin-top:8px">${t("extra.myCoursesSub")}</div></div>
        ${C.btn(t("extra.newCourse"), "accent", { ic: "plus", attrs: 'data-action="new-course"' })}</div>`;
      if (!courses.length) {
        return head + `<div class="card"><div class="empty"><div class="ill">${IC.book}</div><h4>${t("extra.myCoursesEmptyHeading")}</h4><p>${t("extra.myCoursesEmptyBody")}</p>${C.btn(t("extra.newCourse"), "accent", { size: "sm", ic: "plus", attrs: 'data-action="new-course"' })}</div></div>`;
      }
      const card = (c, i) => {
        const mods = c.modules || [];
        const lessons = mods.reduce((n, m) => n + ((m.lessons || []).length), 0);
        const pub = c.published === false ? C.chip(t("extra.draft"), "outline") : C.chip(t("extra.published"), "accent", { ic: "check" });
        return `<div class="card card-pad fade-up" style="margin-bottom:12px;--d:${Math.min(i, 6)}">
          <div class="row between vcenter" style="gap:12px;flex-wrap:wrap">
            <div class="row vcenter" style="gap:11px;min-width:0">${C.courseDot(c.color)}
              <div style="min-width:0"><div class="row vcenter" style="gap:8px;flex-wrap:wrap"><b style="font-size:15px;letter-spacing:-.01em">${esc(c.code)} · ${c.name}</b>${pub}</div>
              <div class="faint" style="font-size:12px;margin-top:2px">${mods.length} ${mods.length === 1 ? t("extra.section") : t("extra.sections")} · ${lessons} ${lessons === 1 ? t("extra.activity") : t("extra.activities")}${c.format ? ` · ${c.format}` : ""}</div></div>
            </div>
            <div class="row" style="gap:6px;flex:none">
              ${C.btn(t("extra.buildCourse"), "accent", { size: "sm", ic: "sliders", attrs: `data-go-builder="${c.id}"` })}
              ${C.btn(t("extra.settings"), "outline", { size: "sm", ic: "pencil", attrs: `data-edit-course="${c.id}" data-name="${c.name}"` })}
              <button class="btn btn-quiet btn-sm" data-del="course:${c.id}" style="color:var(--danger)">${IC.flag} ${t("extra.delete")}</button>
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
        return `<div class="page-head page-head--rule"><div><span class="ph-eyebrow">${t("extra.eyebrowTeacher")}</span><h1 class="ph-title">${t("extra.builderTitle")}</h1>
          <div class="page-sub" style="margin-top:8px">${t("extra.builderPickSub")}</div></div></div>
          <div class="card"><div class="empty"><div class="ill">${IC.book}</div><h4>${t("extra.builderSelectHeading")}</h4><p>${t("extra.builderSelectBody")}</p>${C.btn(t("extra.viewMyCourses"), "accent", { size: "sm", attrs: 'data-go="manage"' })}</div></div>`;
      }
      const edit = typeof window !== "undefined" ? window.__editMode !== false : true;
      const mods = c.modules || [];
      const lessons = mods.reduce((n, m) => n + ((m.lessons || []).length), 0);
      const pub = c.published === false ? C.chip(t("extra.draft"), "outline") : C.chip(t("extra.published"), "accent", { ic: "check" });
      const head = `<div class="page-head page-head--rule"><div><span class="ph-eyebrow">${t("extra.eyebrowTeacherBuilder")}</span><h1 class="ph-title" style="font-size:30px">${esc(c.code)} · ${c.name}</h1>
        <div class="page-sub" style="margin-top:8px">${edit ? t("extra.editModeActiveSub") : t("extra.readOnlySub")}</div></div>
        <div class="stat-group">${C.statInline(mods.length, mods.length === 1 ? t("extra.section") : t("extra.sections"))}${C.statInline(lessons, lessons === 1 ? t("extra.activity") : t("extra.activities"), { accent: true })}</div></div>`;
      const hero = `
      <div class="card card-pad fade-up" style="margin-bottom:16px;--d:0">
        <div style="margin-bottom:10px">${C.btn(t("extra.myCoursesTitle"), "outline", { size: "sm", ic: "chevL", attrs: 'data-go="manage"' })}</div>
        <div class="row between vcenter" style="gap:12px;flex-wrap:wrap">
          <div class="row vcenter" style="gap:12px;min-width:0">${C.courseDot(c.color)}
            <div style="min-width:0"><div class="row vcenter" style="gap:9px;flex-wrap:wrap"><h2 style="font-size:19px;font-weight:800;letter-spacing:-.025em">${esc(c.code)} · ${c.name}</h2>${pub}</div>
            <div class="faint" style="font-size:12.5px;margin-top:3px">${mods.length} ${mods.length === 1 ? t("extra.section") : t("extra.sections")} · ${lessons} ${lessons === 1 ? t("extra.activity") : t("extra.activities")}${c.format ? ` · ${c.format}` : ""}${c.modality ? ` · ${c.modality}` : ""}</div></div>
          </div>
          <div class="row vcenter" style="gap:6px;flex:none">
            <span class="save-chip" data-save-chip style="display:none"></span>
            <button class="btn ${edit ? "btn-primary" : "btn-soft"} btn-sm" data-toggle-edit title="${t("extra.toggleEditTooltip")}">${IC.sliders} ${t("extra.editMode")}: ${edit ? "ON" : "OFF"}</button>
            <button class="btn ${c.published === false ? "btn-primary" : "btn-ghost"} btn-sm" data-publish-course="${c.id}" data-pub="${c.published === false ? "0" : "1"}" title="${t("extra.publishTooltip")}">${c.published === false ? `${IC.check} ${t("extra.publishCourse")}` : `${IC.eye} ${t("extra.moveToDraft")}`}</button>
            <button class="btn btn-ghost btn-sm" data-edit-course="${c.id}" data-name="${c.name}">${IC.pencil} ${t("extra.settings")}</button>
            <button class="btn btn-ghost btn-sm" onclick="window.__course='${esc(c.code)}';go('course')">${IC.play} ${t("extra.previewAsStudent")}</button>
          </div>
        </div>
      </div>`;
      const sections = mods.length
        ? mods.map((m) => sectionBlock(m, c.id, edit)).join("")
        : `<div class="empty" style="padding:24px"><div class="ill">${IC.grid}</div><h4>${t("extra.noSectionsYet")}</h4><p>${t("extra.noSectionsBody")}</p>${edit ? `<button class="btn btn-primary btn-sm" data-add-module="${c.id}">${IC.plus} ${t("extra.addSection")}</button>` : ""}</div>`;
      const addSection = edit && mods.length ? `<div style="border-top:1px solid var(--border);padding:14px 0 2px"><button class="btn btn-soft btn-sm" data-add-module="${c.id}">${IC.plus} ${t("extra.addSection")}</button></div>` : "";
      const tools = mods.length ? `<div class="row between vcenter" style="margin-bottom:2px"><span class="faint" style="font-size:12px">${mods.length} ${mods.length === 1 ? t("extra.section") : t("extra.sections")}</span><button class="btn btn-quiet btn-sm" data-collapse-all>${t("extra.collapseAll")}</button></div>` : "";
      const body = `<div class="card card-pad fade-up" style="--d:1">${tools}${sections}${addSection}</div>`;
      return head + hero + body;
    },
    mount(root) { mountBuilder(root); },
  },

  search: {
    render() {
      const q = (window.__q || "").trim();
      const courses = (DB.catalog || []).filter((c) => matches(`${c.name} ${c.code} ${c.coach}`, q));
      // [CORE-02] Privacidad: el índice de personas es solo para staff (coach/admin).
      // Estudiantes y familias NO pueden buscar personas (protege la privacidad de menores).
      const isStaff = DB.me?.role === "teacher" || DB.me?.role === "admin";
      const people = isStaff ? (DB.students || []).filter((s) => matches(s.n, q)) : [];
      // Foro APAGADO (PRD-estricto): sin sección de discusiones en los resultados.
      const total = courses.length + people.length;
      let _sec = 0;
      const section = (title, count, body) => body ? `<div class="kit-section fade-up" style="--d:${_sec++}"><h3 class="row between vcenter"><span>${title}</span><span class="badge-count">${count}</span></h3>${body}</div>` : "";
      return `
      <div class="page-head page-head--rule"><div><span class="ph-eyebrow">${t("extra.searchEyebrow")}</span><h1 class="ph-title" style="font-size:30px">${t("extra.searchResultsFor")} "${esc(window.__q || "")}"</h1></div>
      <div class="stat-group">${C.statInline(total, total === 1 ? t("extra.resultSingular") : t("extra.resultPlural"), { accent: true })}</div></div>
      ${total === 0 ? `<div class="card"><div class="empty"><div class="ill">${IC.search}</div><h4>${t("extra.noResults")}</h4><p>${t("extra.searchEmptyPrefix")}"${esc(window.__q || "")}${t("extra.searchEmptySuffix")}</p></div></div>` : ""}
      ${section(t("extra.coursesSection"), courses.length, courses.length ? `<div class="grid g-3">${courses.map((c) => `<div class="tile click course-card"><div class="cc-top" style="background:linear-gradient(120deg,${c.color},#171717)"><span class="cc-code">${esc(c.code)}</span></div><div class="cc-body"><div class="cc-name">${c.name}</div><div class="cc-coach row vcenter" style="gap:6px"><span style="display:flex;width:13px">${IC.user}</span>${c.coach}</div></div></div>`).join("")}</div>` : "")}
      ${section(t("extra.peopleSection"), people.length, people.length ? `<div class="card">${people.map((s) => `<div class="lrow" style="gap:11px">${C.avatar(s.i, { size: "sm" })}<div style="flex:1;min-width:0"><b style="font-weight:600">${esc(s.n)}</b></div>${C.levelBadge(s.lvl)}</div>`).join("")}</div>` : "")}`;
    },
  },
};
