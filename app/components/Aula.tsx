"use client";
import { useEffect, useRef } from "react";
import { renderShell } from "../lib/shell";
import { SCREENS, ROUTES } from "../lib/screens";
import { IC } from "../lib/icons";
import { DB } from "../lib/data";
import { esc } from "../lib/esc";

export default function Aula({ data, user }: { data: any; user: any }) {
  const ref = useRef<HTMLDivElement>(null);
  const initialHtml = `
    <div style="min-height:100vh;display:grid;place-items:center;background:var(--otr-navy);color:#fff;font-family:var(--font-ui)">
      <div style="text-align:center">
        <svg viewBox="0 0 26 30" fill="none" style="width:48px;height:54px;margin:0 auto;display:block"><path d="M13 1 L24 5.5 V16 C24 23 19 27.5 13 29.5 C7 27.5 2 23 2 16 V5.5 Z" fill="#fff"/><text x="13" y="18.5" font-family="Archivo Expanded" font-weight="900" font-size="8" fill="#0C2340" text-anchor="middle">OTR</text></svg>
        <p style="margin-top:14px;color:rgba(234,242,251,.6)">Cargando tu aula…</p>
      </div>
    </div>`;

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    Object.assign(DB, data); // datos reales de la BD
    const isTeacher = user?.role === "TEACHER";
    DB.me = { name: esc(user.name), email: user.email, initials: esc(user.initials), level: user.level || "Novato", streak: user.streak || 0, role: "student" };
    if (isTeacher) DB.teacher = { name: esc(user.name), email: user.email, initials: esc(user.initials), role: "teacher" };
    const state: { role: "student" | "teacher" } = { role: isTeacher ? "teacher" : "student" };
    let currentRoute = "dashboard";

    function renderApp(r: string) {
      const def = (ROUTES as any)[r];
      if (!def) return;
      currentRoute = r;
      if (def.role && def.role !== state.role) state.role = def.role;
      root.innerHTML = renderShell(def.nav, def.crumbs, (SCREENS as any)[def.screen].render(state), state.role, isTeacher);
      const content = root.querySelector<HTMLElement>("#content");
      (SCREENS as any)[def.screen].mount?.(content, state);
      if (content) content.scrollTop = 0;
    }
    (window as any).go = (r: string) => renderApp(r);

    let toastWrap: HTMLElement | null = null;
    function toast(msg: string, tone?: string) {
      if (!toastWrap) { toastWrap = document.createElement("div"); toastWrap.className = "toast-wrap"; document.body.appendChild(toastWrap); }
      const ic = tone === "ok" ? IC.checkCircle : tone === "warn" ? IC.clock : tone === "danger" ? IC.flag : IC.bell;
      const t = document.createElement("div"); t.className = "toast " + (tone || "");
      t.innerHTML = `<span class="ti">${ic}</span>${msg}`;
      toastWrap.appendChild(t);
      setTimeout(() => { t.style.opacity = "0"; t.style.transform = "translateY(8px)"; t.style.transition = ".3s"; setTimeout(() => t.remove(), 300); }, 2600);
    }
    (window as any).toast = toast;
    (window as any).modal = function ({ title = "", body = "", ok = "Confirmar", cancel = "Cancelar", tone = "primary" } = {}) {
      const scrim = document.createElement("div"); scrim.className = "modal-scrim";
      scrim.innerHTML = `<div class="modal" role="dialog"><div class="modal-head"><h3>${title}</h3></div><div class="modal-body">${body}</div><div class="modal-foot"><button class="btn btn-ghost" data-x>${cancel}</button><button class="btn btn-${tone}" data-ok>${ok}</button></div></div>`;
      document.body.appendChild(scrim);
      const close = () => scrim.remove();
      scrim.addEventListener("click", (e: any) => { if (e.target === scrim || e.target.closest("[data-x]")) close(); });
      scrim.querySelector("[data-ok]")?.addEventListener("click", () => { close(); toast("Acción confirmada", "ok"); });
    };

    async function api(url: string, body?: any, method = "POST") {
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || "Error");
      return d;
    }

    // Refresh suave: re-pide los datos del usuario y re-renderiza la pantalla actual (sin recarga completa).
    async function refresh() {
      try {
        const res = await fetch("/api/app-data");
        if (!res.ok) return;
        const fresh = await res.json();
        Object.assign(DB, fresh);
        DB.me = { ...fresh.me };
        if (isTeacher) DB.teacher = { ...fresh.teacher };
        renderApp(currentRoute);
      } catch { /* silencioso */ }
    }

    function formModal(title: string, fields: any[], onSubmit: (v: any) => Promise<void>) {
      const scrim = document.createElement("div"); scrim.className = "modal-scrim";
      const inner = fields.map((f) => f.type === "select"
        ? `<div class="field" style="margin-bottom:12px"><label class="label">${f.label}</label><select class="select" data-f="${f.name}">${(f.options || []).map((o: any) => `<option value="${o.value}" ${o.value === f.value ? "selected" : ""}>${o.label}</option>`).join("")}</select></div>`
        : f.type === "textarea"
          ? `<div class="field" style="margin-bottom:12px"><label class="label">${f.label}</label><textarea class="input" data-f="${f.name}" rows="6" placeholder="${f.ph || ""}" style="resize:vertical;min-height:96px;font-family:inherit;line-height:1.5">${f.value || ""}</textarea></div>`
          : `<div class="field" style="margin-bottom:12px"><label class="label">${f.label}</label><input class="input" data-f="${f.name}" placeholder="${f.ph || ""}" value="${f.value || ""}"/></div>`
      ).join("");
      scrim.innerHTML = `<div class="modal" role="dialog"><div class="modal-head"><h3>${title}</h3></div><div class="modal-body">${inner}<p class="fm-err" style="color:var(--danger);font-size:13px;display:none;margin:4px 0 0"></p></div><div class="modal-foot"><button class="btn btn-ghost" data-x>Cancelar</button><button class="btn btn-primary" data-ok>Guardar</button></div></div>`;
      document.body.appendChild(scrim);
      const close = () => scrim.remove();
      scrim.addEventListener("click", (e: any) => { if (e.target === scrim || e.target.closest("[data-x]")) close(); });
      scrim.querySelector("[data-ok]")?.addEventListener("click", async () => {
        const values: any = {}; scrim.querySelectorAll("[data-f]").forEach((el: any) => (values[el.dataset.f] = el.value));
        const okBtn = scrim.querySelector("[data-ok]") as HTMLElement; okBtn.textContent = "Guardando…";
        try { await onSubmit(values); close(); } catch (err: any) { const e = scrim.querySelector(".fm-err") as HTMLElement; e.textContent = err.message || "Error"; e.style.display = "block"; okBtn.textContent = "Guardar"; }
      });
    }

    function openCreateCourse() {
      formModal("Nuevo curso", [
        { name: "name", label: "Nombre del curso", ph: "Public Forum II" },
        { name: "code", label: "Código único", ph: "PF-201" },
        { name: "next", label: "Siguiente tema", ph: "Introducción al formato" },
      ], async (v) => { await api("/api/courses", v); toast("Curso creado ✓", "ok"); await refresh(); });
    }
    function openCreateModule() {
      const courses = DB.manage?.courses || [];
      formModal("Nuevo módulo", [
        { name: "courseId", label: "Curso", type: "select", options: courses.map((c: any) => ({ value: c.id, label: `${c.code} · ${c.name}` })) },
        { name: "title", label: "Título del módulo", ph: "Unidad 4 · Estrategia" },
      ], async (v) => { await api("/api/modules", v); toast("Módulo creado ✓", "ok"); await refresh(); });
    }
    function openCreateLesson() {
      const courses = DB.manage?.courses || [];
      const modules = DB.manage?.modules || [];
      const cmap: any = Object.fromEntries(courses.map((c: any) => [c.id, c.code]));
      formModal("Nueva lección / contenido", [
        { name: "moduleId", label: "Módulo", type: "select", options: modules.map((m: any) => ({ value: m.id, label: `${cmap[m.courseId] || ""} · ${m.title}` })) },
        { name: "title", label: "Título", ph: "Claim · Warrant · Impact" },
        { name: "type", label: "Tipo", type: "select", options: [
          { value: "lesson", label: "Lección" }, { value: "video", label: "Video" }, { value: "quiz", label: "Examen" },
          { value: "assign", label: "Tarea" }, { value: "mic", label: "Grabación" }, { value: "file", label: "Archivo" }] },
        { name: "dur", label: "Duración (opcional)", ph: "15 min" },
        { name: "videoKind", label: "Video", type: "select", value: "none", options: [
          { value: "none", label: "Sin video" }, { value: "youtube", label: "YouTube (pegar URL)" }, { value: "cloudflare", label: "Cloudflare Stream (UID)" }] },
        { name: "videoSrc", label: "URL de YouTube o UID de Cloudflare", ph: "https://youtu.be/… o el UID" },
        { name: "contentHtml", label: "Contenido de la lección", type: "textarea", ph: "Escribe el contenido (admite <b>, <h2>, <ul>, <li>…)" },
      ], async (v) => { await api("/api/lessons", v); toast("Contenido creado ✓", "ok"); await refresh(); });
    }
    function openEditLesson(id: string, l: any) {
      formModal("Editar lección", [
        { name: "title", label: "Título", value: l.title },
        { name: "videoKind", label: "Video", type: "select", value: l.videoKind || "none", options: [
          { value: "none", label: "Sin video" }, { value: "youtube", label: "YouTube (pegar URL)" }, { value: "cloudflare", label: "Cloudflare Stream (UID)" }] },
        { name: "videoSrc", label: "URL de YouTube o UID de Cloudflare", value: l.videoSrc || "" },
        { name: "contentHtml", label: "Contenido de la lección", type: "textarea", value: l.contentHtml || "" },
      ], async (v) => { await api(`/api/lessons/${id}`, v, "PATCH"); toast("Lección actualizada ✓", "ok"); await refresh(); });
    }
    function openCreateMenu() {
      const scrim = document.createElement("div"); scrim.className = "modal-scrim";
      scrim.innerHTML = `<div class="modal" role="dialog"><div class="modal-head"><h3>Crear</h3></div><div class="modal-body"><div class="stack" style="gap:8px">
        <button class="btn btn-ghost btn-block" data-c="course">${IC.book} Nuevo curso</button>
        <button class="btn btn-ghost btn-block" data-c="module">${IC.grid} Nuevo módulo</button>
        <button class="btn btn-ghost btn-block" data-c="lesson">${IC.doc} Nueva lección / contenido</button>
      </div></div><div class="modal-foot"><button class="btn btn-ghost" data-x>Cerrar</button></div></div>`;
      document.body.appendChild(scrim);
      const close = () => scrim.remove();
      scrim.addEventListener("click", (e: any) => {
        if (e.target === scrim || e.target.closest("[data-x]")) { close(); return; }
        const c = e.target.closest("[data-c]");
        if (c) { close(); const k = c.dataset.c; if (k === "course") openCreateCourse(); else if (k === "module") openCreateModule(); else openCreateLesson(); }
      });
    }

    async function doEnroll(courseId: string) {
      try {
        const d = await api("/api/checkout", { courseId });
        if (d.url) { location.href = d.url; return; }
        toast("¡Inscrito! ✓", "ok");
        setTimeout(() => refresh(), 400);
      } catch (e: any) { toast(e.message || "Error", "danger"); }
    }
    function openNewThread() {
      formModal("Nueva discusión", [
        { name: "title", label: "Título", ph: "¿Cómo estructurar un rebuttal?" },
        { name: "tag", label: "Etiqueta", ph: "Refutación" },
        { name: "excerpt", label: "Mensaje", ph: "Cuéntanos tu duda o aporte…" },
      ], async (v) => { await api("/api/forum/threads", v); toast("Discusión creada ✓", "ok"); await refresh(); });
    }
    async function openGradeSubs() {
      let subs: any[] = [];
      try { const d = await api("/api/submissions", null, "GET"); subs = d.submissions || []; } catch {}
      const scrim = document.createElement("div"); scrim.className = "modal-scrim";
      const rows = subs.length ? subs.map((s: any) => `
        <div class="lrow" data-sub="${s.id}" style="padding:10px 0;gap:10px;align-items:center">
          <div style="flex:1"><div style="font-weight:600;font-size:13.5px">${esc(s.userName)}</div><div class="faint" style="font-size:12px">${esc(s.activity)} · ${s.status === "GRADED" ? "Calificado: " + s.grade : "Pendiente"}</div></div>
          <input class="input gsub-grade" style="width:64px" placeholder="0-100" value="${s.grade ?? ""}"/>
          <button class="btn btn-primary btn-sm gsub-save">Guardar</button>
        </div>`).join("") : `<div class="empty" style="padding:20px"><b>Sin entregas todavía</b><p>Cuando un alumno entregue una grabación, aparecerá aquí.</p></div>`;
      scrim.innerHTML = `<div class="modal" role="dialog" style="max-width:540px"><div class="modal-head"><h3>Calificar entregas</h3></div><div class="modal-body">${rows}</div><div class="modal-foot"><button class="btn btn-ghost" data-x>Cerrar</button></div></div>`;
      document.body.appendChild(scrim);
      let gdirty = false;
      const close = () => { scrim.remove(); if (gdirty) refresh(); };
      scrim.addEventListener("click", async (e: any) => {
        if (e.target === scrim || e.target.closest("[data-x]")) { close(); return; }
        const save = e.target.closest(".gsub-save");
        if (save) {
          const row = save.closest("[data-sub]"); const id = row.getAttribute("data-sub");
          const grade = row.querySelector(".gsub-grade").value;
          save.textContent = "…";
          try { await api(`/api/submissions/${id}`, { grade }, "PATCH"); save.textContent = "✓"; gdirty = true; toast("Calificación guardada ✓", "ok"); }
          catch (err: any) { save.textContent = "Guardar"; toast(err.message || "Error", "danger"); }
        }
      });
    }

    function openEditCourse(id: string, name: string) {
      formModal("Editar curso", [{ name: "name", label: "Nombre del curso", value: name }],
        async (v) => { await api(`/api/courses/${id}`, v, "PATCH"); toast("Curso actualizado ✓", "ok"); await refresh(); });
    }

    function openEditProfile() {
      formModal("Editar perfil", [
        { name: "name", label: "Nombre completo", value: user.name },
        { name: "currentPassword", label: "Contraseña actual (solo si la cambias)", ph: "opcional" },
        { name: "newPassword", label: "Nueva contraseña", ph: "opcional" },
      ], async (v) => { await api("/api/profile", v, "PATCH"); toast("Perfil actualizado ✓", "ok"); await refresh(); });
    }

    let notifOpen = false;
    function toggleNotif(force?: boolean) {
      notifOpen = force != null ? force : !notifOpen;
      document.getElementById("notif-panel")?.remove();
      if (!notifOpen) return;
      const panel = document.createElement("div"); panel.id = "notif-panel"; panel.className = "notif-panel";
      panel.innerHTML = `<div class="notif-head"><b>Notificaciones</b><button class="btn btn-quiet btn-sm" id="notif-read">Marcar leídas</button></div><div id="notif-list">${(DB.notifications || []).map((n: any) => `<div class="notif-item ${n.unread ? "unread" : ""}"><div class="notif-ic ${n.tone}">${IC[n.ic]}</div><div class="nt-main"><div class="nt-t">${n.t}</div><div class="nt-d">${n.d}</div><div class="nt-w">${n.when}</div></div></div>`).join("")}</div><div class="notif-foot"><a href="#" onclick="return false">Ver todas</a></div>`;
      root.querySelector(".main")?.appendChild(panel);
      panel.querySelector("#notif-read")?.addEventListener("click", () => { panel.querySelectorAll(".notif-item").forEach((i) => i.classList.remove("unread")); root.querySelector("#bell .bell-count")?.remove(); toast("Notificaciones marcadas como leídas", "ok"); });
    }

    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("#create-menu")) { e.stopPropagation(); openCreateMenu(); return; }
      if (t.closest('[data-action="logout"]')) { e.preventDefault(); api("/api/auth/logout").finally(() => location.reload()); return; }
      const enrollEl = t.closest("[data-enroll]") as HTMLElement | null;
      if (enrollEl) { e.preventDefault(); doEnroll(enrollEl.getAttribute("data-enroll")!); return; }
      if (t.closest('[data-action="new-thread"]')) { e.preventDefault(); openNewThread(); return; }
      if (t.closest('[data-action="grade-subs"]')) { e.preventDefault(); openGradeSubs(); return; }
      const delEl = t.closest("[data-del]") as HTMLElement | null;
      if (delEl) {
        e.preventDefault();
        const [kind, id] = delEl.getAttribute("data-del")!.split(":");
        const url = kind === "course" ? `/api/courses/${id}` : kind === "module" ? `/api/modules/${id}` : `/api/lessons/${id}`;
        api(url, null, "DELETE").then(() => { toast("Eliminado ✓", "ok"); refresh(); }).catch((err: any) => toast(err.message, "danger"));
        return;
      }
      const editEl = t.closest("[data-edit-course]") as HTMLElement | null;
      if (editEl) { e.preventDefault(); openEditCourse(editEl.getAttribute("data-edit-course")!, editEl.dataset.name || ""); return; }
      const editLessonEl = t.closest("[data-edit-lesson]") as HTMLElement | null;
      if (editLessonEl) {
        e.preventDefault();
        const lid = editLessonEl.getAttribute("data-edit-lesson");
        let found: any = null;
        for (const c of ((DB as any).teacherCourses || [])) for (const m of c.modules) for (const l of m.lessons) if (l.id === lid) found = l;
        if (found) openEditLesson(lid!, found);
        return;
      }
      if (t.closest('[data-action="edit-profile"]')) { e.preventDefault(); openEditProfile(); return; }
      if (t.closest("#burger")) { root.querySelector(".app")?.classList.toggle("drawer-open"); return; }
      if (t.closest("#bell")) { e.stopPropagation(); toggleNotif(); return; }
      if (notifOpen && !t.closest("#notif-panel") && !t.closest("#bell")) toggleNotif(false);
      const roleBtn = t.closest("#role-switch button") as HTMLElement | null;
      if (roleBtn) { state.role = roleBtn.dataset.role as any; renderApp(state.role === "teacher" ? "teacher" : "dashboard"); return; }
      const goEl = t.closest("[data-go]") as HTMLElement | null;
      if (goEl) { e.preventDefault(); renderApp(goEl.getAttribute("data-go")!); return; }
      const acc = t.closest("[data-acc]") as HTMLElement | null;
      if (acc) { acc.closest(".module")?.classList.toggle("open"); return; }
      const toastEl = t.closest("[data-toast]") as HTMLElement | null;
      if (toastEl) { const v = toastEl.getAttribute("data-toast")!; const i = v.indexOf("::"); i > 0 ? toast(v.slice(i + 2), v.slice(0, i)) : toast(v); }
    };
    root.addEventListener("click", onClick);
    const onKey = (e: KeyboardEvent) => {
      const inp = e.target as HTMLElement;
      if (inp && inp.matches?.(".searchbox input") && e.key === "Enter") {
        (window as any).__q = (inp as HTMLInputElement).value;
        renderApp("search");
      }
    };
    root.addEventListener("keydown", onKey);

    renderApp(state.role === "teacher" ? "teacher" : "dashboard");
    return () => { root.removeEventListener("click", onClick); root.removeEventListener("keydown", onKey); };
  }, []);

  return <div ref={ref} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: initialHtml }} />;
}
