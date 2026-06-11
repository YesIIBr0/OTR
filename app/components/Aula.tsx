"use client";
import { useEffect, useRef } from "react";
import { renderShell } from "../lib/shell";
import { SCREENS, ROUTES } from "../lib/screens";
import { IC, otrCrest } from "../lib/icons";
import { DB } from "../lib/data";
import { esc } from "../lib/esc";

export default function Aula({ data, user }: { data: any; user: any }) {
  const ref = useRef<HTMLDivElement>(null);
  const initialHtml = `
    <div style="min-height:100vh;display:grid;place-items:center;background:var(--otr-navy);color:#fff;font-family:var(--font-ui)">
      <div style="text-align:center">
        ${/* Escudo OTR del brand book (pantalla de carga, fondo negro) — markup canónico en lib/icons (otrCrest) */""}
        ${otrCrest({ id: "load", attrs: 'style="width:48px;height:54px;margin:0 auto;display:block"' })}
        <p style="margin-top:14px;color:rgba(234,242,251,.6)">Cargando tu aula…</p>
      </div>
    </div>`;

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    Object.assign(DB, data); // datos reales de la BD
    const isTeacher = user?.role === "TEACHER";
    const isParent = user?.role === "PARENT";
    const isAdmin = user?.role === "ADMIN";
    // Vista role-scoped (PRD §2/§3.3): una cuenta, experiencia fijada por el rol REAL.
    const viewRole: "student" | "teacher" | "parent" | "admin" =
      isAdmin ? "admin" : isTeacher ? "teacher" : isParent ? "parent" : "student";
    const _pf = { headline: data?.me?.headline, bio: data?.me?.bio, teachingStyle: data?.me?.teachingStyle, formats: data?.me?.formats, location: data?.me?.location, preferences: data?.me?.preferences };
    DB.me = { name: esc(user.name), email: user.email, initials: esc(user.initials), level: user.level || "Novato", streak: user.streak || 0, role: viewRole, ..._pf };
    const state: { role: "student" | "teacher" | "parent" | "admin" } = { role: viewRole };
    let currentRoute = "dashboard";

    // Teardown defensivo del grabador de audio de scr-learn antes de cambiar de pantalla.
    // scr-learn registra window.__recTeardown (limpia setInterval + detiene el stream de mic);
    // si no hay grabador activo, no existe el hook y no pasa nada.
    function teardownRecorder() {
      try {
        const fn = (window as any).__recTeardown;
        if (typeof fn === "function") fn();
      } catch { /* defensivo: nunca bloquea la navegación */ }
    }

    function renderApp(r: string) {
      const def = (ROUTES as any)[r];
      if (!def) return;
      teardownRecorder();
      currentRoute = r;
      root.innerHTML = renderShell(def.nav, def.crumbs, (SCREENS as any)[def.screen].render(state), state.role);
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
      setTimeout(() => { t.style.opacity = "0"; t.style.transform = "translateY(8px) scale(.98)"; t.style.transition = "opacity .3s var(--ease), transform .3s var(--ease)"; setTimeout(() => t.remove(), 300); }, 2600);
    }
    (window as any).toast = toast;

    // Entrada premium fade-up para popovers/modales. NO deja opacity:0 como estado base:
    // si la animación no corre (o reduced-motion), el contenido queda visible.
    const reduceMotion = typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches : false;
    function enter(el: HTMLElement, dy = 8) {
      if (reduceMotion) return;
      el.style.opacity = "0";
      el.style.transform = `translateY(${dy}px)`;
      el.style.transition = "opacity .26s var(--ease), transform .26s var(--ease)";
      requestAnimationFrame(() => requestAnimationFrame(() => { el.style.opacity = "1"; el.style.transform = "none"; }));
    }

    (window as any).modal = function ({ title = "", body = "", ok = "Confirmar", cancel = "Cancelar", tone = "primary" } = {}) {
      const scrim = document.createElement("div"); scrim.className = "modal-scrim";
      scrim.innerHTML = `<div class="modal" role="dialog"><div class="modal-head"><h3>${title}</h3></div><div class="modal-body">${body}</div><div class="modal-foot"><button class="btn btn-ghost" data-x>${cancel}</button><button class="btn btn-${tone}" data-ok>${ok}</button></div></div>`;
      document.body.appendChild(scrim);
      enter(scrim.querySelector(".modal") as HTMLElement);
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
    (window as any).api = api;

    // Sube un archivo real a /api/uploads vía FormData y devuelve { url, original, mime, size, id }.
    // NO se fija Content-Type manualmente: el navegador añade el boundary del multipart.
    async function otrUpload(file: File, kind: string) {
      try {
        if (!file) throw new Error("No hay archivo");
        const fd = new FormData();
        fd.append("file", file);
        fd.append("kind", kind || "file");
        const r = await fetch("/api/uploads", { method: "POST", body: fd });
        const j = await r.json().catch(() => ({}));
        if (!r.ok || !j.ok) throw new Error(j.error || "Error al subir el archivo");
        return j;
      } catch (e: any) {
        toast(e?.message || "Error al subir el archivo", "danger");
        throw e;
      }
    }
    if (typeof window !== "undefined") (window as any).otrUpload = otrUpload;

    // Refresh suave: re-pide los datos del usuario y re-renderiza la pantalla actual (sin recarga completa).
    async function refresh() {
      try {
        const res = await fetch("/api/app-data");
        if (!res.ok) return;
        const fresh = await res.json();
        Object.assign(DB, fresh);
        DB.me = { ...fresh.me, role: viewRole };
        renderApp(currentRoute);
      } catch { /* silencioso */ }
    }

    function formModal(title: string, fields: any[], onSubmit: (v: any) => Promise<void>) {
      const scrim = document.createElement("div"); scrim.className = "modal-scrim";
      const inner = fields.map((f) => f.type === "select"
        ? `<div class="field" style="margin-bottom:12px"><label class="label">${f.label}</label><select class="select" data-f="${f.name}">${(f.options || []).map((o: any) => `<option value="${o.value}" ${o.value === f.value ? "selected" : ""}>${o.label}</option>`).join("")}</select></div>`
        : f.type === "textarea"
          ? `<div class="field" style="margin-bottom:12px"><label class="label">${f.label}</label><textarea class="input" data-f="${f.name}" rows="6" placeholder="${f.ph || ""}" style="resize:vertical;min-height:96px;font-family:inherit;line-height:1.5">${f.value || ""}</textarea></div>`
          : `<div class="field" style="margin-bottom:12px"><label class="label">${f.label}</label><input class="input" data-f="${f.name}"${f.type === "number" ? ` type="number" min="0" max="100"` : ""} placeholder="${f.ph || ""}" value="${f.value != null ? f.value : ""}"/></div>`
      ).join("");
      scrim.innerHTML = `<div class="modal" role="dialog"><div class="modal-head"><h3>${title}</h3></div><div class="modal-body">${inner}<p class="fm-err" style="color:var(--danger);font-size:13px;display:none;margin:4px 0 0"></p></div><div class="modal-foot"><button class="btn btn-ghost" data-x>Cancelar</button><button class="btn btn-primary" data-ok>Guardar</button></div></div>`;
      document.body.appendChild(scrim);
      enter(scrim.querySelector(".modal") as HTMLElement);
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
        { name: "format", label: "Formato", ph: "Public Forum" },
        { name: "modality", label: "Modalidad", type: "select", value: "online", options: [
          { value: "online", label: "Online" }, { value: "presencial", label: "Presencial" }, { value: "híbrido", label: "Híbrido" }] },
        { name: "capacity", label: "Cupo (capacidad)", ph: "20" },
        { name: "summary", label: "Resumen del programa", type: "textarea", ph: "Describe de qué trata este programa…" },
      ], async (v) => { await api("/api/courses", v); toast("Curso creado", "ok"); await refresh(); });
    }
    function openCreateModule() {
      const courses = DB.manage?.courses || [];
      formModal("Nuevo módulo", [
        { name: "courseId", label: "Curso", type: "select", options: courses.map((c: any) => ({ value: c.id, label: `${c.code} · ${c.name}` })) },
        { name: "title", label: "Título del módulo", ph: "Unidad 4 · Estrategia" },
      ], async (v) => { await api("/api/modules", v); toast("Módulo creado", "ok"); await refresh(); });
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
      ], async (v) => { await api("/api/lessons", v); toast("Contenido creado", "ok"); await refresh(); });
    }
    function openEditLesson(id: string, l: any) {
      formModal("Editar lección", [
        { name: "title", label: "Título", value: l.title },
        { name: "videoKind", label: "Video", type: "select", value: l.videoKind || "none", options: [
          { value: "none", label: "Sin video" }, { value: "youtube", label: "YouTube (pegar URL)" }, { value: "cloudflare", label: "Cloudflare Stream (UID)" }] },
        { name: "videoSrc", label: "URL de YouTube o UID de Cloudflare", value: l.videoSrc || "" },
        { name: "contentHtml", label: "Contenido de la lección", type: "textarea", value: l.contentHtml || "" },
      ], async (v) => { await api(`/api/lessons/${id}`, v, "PATCH"); toast("Lección actualizada", "ok"); await refresh(); });
    }
    function openCreateMenu() {
      const scrim = document.createElement("div"); scrim.className = "modal-scrim";
      scrim.innerHTML = `<div class="modal" role="dialog"><div class="modal-head"><h3>Crear</h3></div><div class="modal-body"><div class="stack" style="gap:8px">
        <button class="btn btn-ghost btn-block" data-c="course">${IC.book} Nuevo curso</button>
        <button class="btn btn-ghost btn-block" data-c="module">${IC.grid} Nuevo módulo</button>
        <button class="btn btn-ghost btn-block" data-c="lesson">${IC.doc} Nueva lección / contenido</button>
      </div></div><div class="modal-foot"><button class="btn btn-ghost" data-x>Cerrar</button></div></div>`;
      document.body.appendChild(scrim);
      enter(scrim.querySelector(".modal") as HTMLElement);
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
        toast("¡Inscrito!", "ok");
        setTimeout(() => refresh(), 400);
      } catch (e: any) { toast(e.message || "Error", "danger"); }
    }
    function openNewThread() {
      formModal("Nueva discusión", [
        { name: "title", label: "Título", ph: "¿Cómo estructurar un rebuttal?" },
        { name: "tag", label: "Etiqueta", ph: "Refutación" },
        { name: "excerpt", label: "Mensaje", ph: "Cuéntanos tu duda o aporte…" },
      ], async (v) => { await api("/api/forum/threads", v); toast("Discusión creada", "ok"); await refresh(); });
    }
    function openNewResource() {
      formModal("Nuevo recurso", [
        { name: "title", label: "Título", ph: "Plantilla de caso · Public Forum" },
        { name: "kind", label: "Tipo", type: "select", value: "brief", options: [
          { value: "brief", label: "Brief" }, { value: "template", label: "Plantilla" }, { value: "drill", label: "Drill" },
          { value: "recording", label: "Grabación" }, { value: "link", label: "Enlace" }] },
        { name: "tag", label: "Etiqueta", ph: "Refutación" },
        { name: "format", label: "Formato", ph: "Public Forum" },
        { name: "url", label: "URL (opcional)", ph: "https://…" },
        { name: "contentHtml", label: "Contenido", type: "textarea", ph: "Escribe el contenido (admite <b>, <h2>, <ul>, <li>…)" },
        { name: "gated", label: "Acceso", type: "select", value: "no", options: [
          { value: "no", label: "Público" }, { value: "yes", label: "Solo inscritos (gated)" }] },
      ], async (v) => {
        await api("/api/resources", { ...v, gated: v.gated === "yes" });
        toast("Recurso creado", "ok"); await refresh();
      });
    }
    async function openGradeSubs() {
      let subs: any[] = [];
      try { const d = await api("/api/submissions", null, "GET"); subs = d.submissions || []; } catch {}
      const scrim = document.createElement("div"); scrim.className = "modal-scrim";
      // Bloque del contenido entregado por el alumno: reproductor para audio/video,
      // descarga para archivos, o el texto crudo para entregas escritas.
      const subContent = (s: any) => {
        const kind = (s.kind || "").toLowerCase();
        if ((kind === "audio" || kind === "video") && s.fileUrl) {
          const tag = kind === "video" ? "video" : "audio";
          return `<div style="margin:8px 0"><${tag} controls preload="none" src="${esc(s.fileUrl)}" style="width:100%;max-height:200px;border-radius:8px"></${tag}>${s.fileName ? `<div class="faint" style="font-size:11.5px;margin-top:4px">${esc(s.fileName)}</div>` : ""}</div>`;
        }
        if (s.fileUrl) {
          return `<div style="margin:8px 0"><a class="btn btn-ghost btn-sm" href="${esc(s.fileUrl)}" target="_blank" rel="noopener" download>${IC.doc} Descargar ${esc(s.fileName || "archivo")}</a></div>`;
        }
        if (s.textBody) {
          return `<div style="margin:8px 0;padding:10px 12px;border:1px solid var(--border);border-radius:8px;background:var(--surface-2);font-size:13px;line-height:1.55;white-space:pre-wrap;max-height:220px;overflow:auto">${esc(s.textBody)}</div>`;
        }
        return `<div class="faint" style="font-size:12px;margin:6px 0">Sin contenido adjunto.</div>`;
      };
      const rows = subs.length ? subs.map((s: any) => `
        <div class="card card-pad" data-sub="${s.id}" style="margin-bottom:12px">
          <div class="row between vcenter" style="gap:10px">
            <div style="min-width:0"><div style="font-weight:600;font-size:13.5px">${esc(s.userName)}</div><div class="faint" style="font-size:12px">${esc(s.activity)} · ${s.status === "GRADED" ? "Calificado: " + (s.grade ?? "—") : "Pendiente"}</div></div>
            <span class="badge" style="height:18px;font-size:10px;flex:none">${esc(s.kind || "entrega")}</span>
          </div>
          ${subContent(s)}
          <div class="field" style="margin:8px 0 0">
            <label class="label">Feedback</label>
            <textarea class="input gsub-feedback" rows="3" placeholder="Comentarios para el alumno…" style="resize:vertical;min-height:64px;font-family:inherit;line-height:1.5">${s.feedback ? esc(s.feedback) : ""}</textarea>
          </div>
          <div class="row between vcenter" style="gap:10px;margin-top:8px">
            <div class="field" style="margin:0"><label class="label">Nota (0-100)</label><input class="input gsub-grade" type="number" min="0" max="100" style="width:96px" placeholder="0-100" value="${s.grade ?? ""}"/></div>
            <button class="btn btn-primary btn-sm gsub-save" style="align-self:flex-end">Guardar</button>
          </div>
        </div>`).join("") : `<div class="empty" style="padding:20px"><b>Sin entregas todavía</b><p>Cuando un alumno entregue una grabación, aparecerá aquí.</p></div>`;
      scrim.innerHTML = `<div class="modal" role="dialog" style="max-width:560px"><div class="modal-head"><h3>Calificar entregas</h3></div><div class="modal-body">${rows}</div><div class="modal-foot"><button class="btn btn-ghost" data-x>Cerrar</button></div></div>`;
      document.body.appendChild(scrim);
      enter(scrim.querySelector(".modal") as HTMLElement);
      let gdirty = false;
      const close = () => { scrim.remove(); if (gdirty) refresh(); };
      scrim.addEventListener("click", async (e: any) => {
        if (e.target === scrim || e.target.closest("[data-x]")) { close(); return; }
        const save = e.target.closest(".gsub-save");
        if (save) {
          const row = save.closest("[data-sub]"); const id = row.getAttribute("data-sub");
          const grade = row.querySelector(".gsub-grade").value;
          const feedback = row.querySelector(".gsub-feedback")?.value || "";
          save.textContent = "…";
          try { await api(`/api/submissions/${id}`, { grade, feedback }, "PATCH"); save.innerHTML = `<span style="display:inline-flex;width:16px;height:16px">${IC.check}</span>`; gdirty = true; toast("Calificación guardada", "ok"); }
          catch (err: any) { save.textContent = "Guardar"; toast(err.message || "Error", "danger"); }
        }
      });
    }

    function openEditCourse(id: string, name: string) {
      let c: any = null;
      for (const tc of ((DB as any).teacherCourses || [])) if (tc.id === id) c = tc;
      formModal("Editar curso", [
        { name: "name", label: "Nombre del curso", value: name },
        { name: "format", label: "Formato", value: c?.format || "", ph: "Public Forum" },
        { name: "modality", label: "Modalidad", type: "select", value: c?.modality || "online", options: [
          { value: "online", label: "Online" }, { value: "presencial", label: "Presencial" }, { value: "híbrido", label: "Híbrido" }] },
        { name: "capacity", label: "Cupo (capacidad)", value: c?.capacity || "", ph: "20" },
        { name: "summary", label: "Resumen del programa", type: "textarea", value: c?.summary || "", ph: "Describe de qué trata este programa…" },
      ], async (v) => { await api(`/api/courses/${id}`, v, "PATCH"); toast("Curso actualizado", "ok"); await refresh(); });
    }

    function openEditProfile() {
      const m: any = (DB as any).me || {};
      const fields: any[] = [
        { name: "name", label: "Nombre completo", value: user.name },
        { name: "headline", label: "Titular", value: m.headline || "", ph: "ej: Coach · Public Forum" },
        { name: "location", label: "Ubicación", value: m.location || "", ph: "Santo Domingo, RD" },
        { name: "bio", label: "Sobre mí", type: "textarea", value: m.bio || "", ph: "Cuéntale al Hub quién eres…" },
      ];
      if (isTeacher) {
        fields.push({ name: "teachingStyle", label: "Cómo trabajo (estilo de enseñanza)", type: "textarea", value: m.teachingStyle || "", ph: "Drills intensivos, foco en delivery, repetición deliberada…" });
        fields.push({ name: "formats", label: "Qué enseño (formatos, separados por coma)", value: m.formats || "", ph: "Public Forum, Lincoln-Douglas, Oratoria" });
      }
      fields.push({ name: "currentPassword", label: "Contraseña actual (solo si la cambias)", ph: "opcional" });
      fields.push({ name: "newPassword", label: "Nueva contraseña", ph: "opcional" });
      formModal("Editar perfil", fields, async (v) => { await api("/api/profile", v, "PATCH"); toast("Perfil actualizado", "ok"); await refresh(); });
    }

    const SKILLS = ["Confianza", "Estructura", "Evidencia", "Refutación", "Cross-ex", "Delivery"];
    async function openEvalSkills(userId: string, name: string) {
      let prefill: any = {};
      try {
        const d = await api("/api/skills?userId=" + encodeURIComponent(userId), null, "GET");
        for (const s of (d.skills || [])) prefill[s.skill] = s.score;
      } catch {}
      formModal(`Evaluar a ${esc(name)}`, SKILLS.map((sk) => ({
        name: sk, label: sk, type: "number", value: prefill[sk] != null ? prefill[sk] : 0,
      })), async (v) => {
        const scores: any = {};
        for (const sk of SKILLS) scores[sk] = Math.max(0, Math.min(100, Number(v[sk]) || 0));
        await api("/api/skills", { userId, scores });
        toast("Habilidades guardadas", "ok");
        await refresh();
      });
    }

    async function leaveReview(courseId: string) {
      const sel = root.querySelector(".star.on") as HTMLElement | null;
      const rating = sel ? Number(sel.getAttribute("data-rating")) : 0;
      const bodyEl = root.querySelector("#review-body") as HTMLTextAreaElement | null;
      const body = bodyEl ? bodyEl.value : "";
      if (!rating) { toast("Selecciona una calificación", "warn"); return; }
      try {
        await api("/api/reviews", { courseId, rating, body });
        toast("¡Reseña publicada!", "ok");
        await refresh();
      } catch (e: any) { toast(e.message || "Error", "danger"); }
    }

    let notifOpen = false;
    function toggleNotif(force?: boolean) {
      notifOpen = force != null ? force : !notifOpen;
      document.getElementById("notif-panel")?.remove();
      if (!notifOpen) return;
      const panel = document.createElement("div"); panel.id = "notif-panel"; panel.className = "notif-panel";
      panel.innerHTML = `<div class="notif-head"><b>Notificaciones</b><button class="btn btn-quiet btn-sm" id="notif-read">Marcar leídas</button></div><div id="notif-list">${(DB.notifications || []).map((n: any) => `<div class="notif-item ${n.unread ? "unread" : ""}"><div class="notif-ic ${n.tone}">${IC[n.ic]}</div><div class="nt-main"><div class="nt-t">${n.t}</div><div class="nt-d">${n.d}</div><div class="nt-w">${n.when}</div></div></div>`).join("")}</div><div class="notif-foot"><a href="#" onclick="return false">Ver todas</a></div>`;
      root.querySelector(".main")?.appendChild(panel);
      enter(panel, 6);
      panel.querySelector("#notif-read")?.addEventListener("click", () => {
        api("/api/notifications", null, "PATCH")
          .then(() => {
            // Actualización local (sin re-fetch de /api/app-data): marca todo como leído,
            // cierra el panel y repinta la ruta actual con el render existente.
            (DB.notifications || []).forEach((n: any) => { n.unread = false; });
            toast("Notificaciones marcadas como leídas", "ok");
            toggleNotif(false);
            renderApp(currentRoute);
          })
          .catch((err: any) => toast(err.message || "Error", "danger"));
      });
    }

    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("#create-menu")) { e.stopPropagation(); openCreateMenu(); return; }
      if (t.closest('[data-action="logout"]')) { e.preventDefault(); api("/api/auth/logout").finally(() => location.reload()); return; }
      const enrollEl = t.closest("[data-enroll]") as HTMLElement | null;
      if (enrollEl) { e.preventDefault(); doEnroll(enrollEl.getAttribute("data-enroll")!); return; }
      if (t.closest('[data-action="new-thread"]')) { e.preventDefault(); openNewThread(); return; }
      if (t.closest('[data-action="grade-subs"]')) { e.preventDefault(); openGradeSubs(); return; }
      const markEl = t.closest('[data-action="mark-lesson-done"]') as HTMLElement | null;
      if (markEl) {
        e.preventDefault();
        const lessonId = markEl.dataset.lesson;
        const done = markEl.dataset.done === "true";
        api("/api/lesson-progress", { lessonId, done })
          .then((d: any) => {
            // Actualización local (sin re-fetch de /api/app-data):
            // 1) marca la lección como doneByMe según lo enviado, en el módulo del dashboard.
            (DB.courseModules || []).forEach((m: any) => {
              (m.items || []).forEach((it: any) => { if (it.id === lessonId) it.doneByMe = done; });
            });
            // 1b) multi-curso: refleja el mismo cambio en DB.coursesContent (de donde
            //     lee la vista de curso/lección F1) y localiza el curso afectado.
            let touchedCode: string | null = null;
            (DB.coursesContent || []).forEach((c: any) => {
              (c.modules || []).forEach((m: any) => {
                (m.items || []).forEach((it: any) => {
                  if (it.id === lessonId) { it.doneByMe = done; touchedCode = c.code; }
                });
              });
            });
            // 2) fija el progreso del curso afectado con el valor devuelto por la API.
            //    Actualiza tanto DB.courses como DB.coursesContent del curso tocado;
            //    si la API no devolvió progress, se deja el valor actual sin tocar.
            if (d && typeof d.progress === "number") {
              const cc = (DB.coursesContent || []).find((c: any) => c.code === touchedCode);
              if (cc) cc.progress = d.progress;
              const cl = (DB.courses || []).find((c: any) => c.code === touchedCode);
              if (cl) cl.progress = d.progress;
              else if (DB.courses && DB.courses[0]) DB.courses[0].progress = d.progress;
            }
            toast("Progreso guardado", "ok");
            renderApp(currentRoute);
          })
          .catch((err: any) => toast(err.message || "Error", "danger"));
        return;
      }
      const evalEl = t.closest('[data-action="eval-skills"]') as HTMLElement | null;
      if (evalEl) { e.preventDefault(); openEvalSkills(evalEl.dataset.user || "", evalEl.dataset.name || ""); return; }
      const delEl = t.closest("[data-del]") as HTMLElement | null;
      if (delEl) {
        e.preventDefault();
        const [kind, id] = delEl.getAttribute("data-del")!.split(":");
        const url = kind === "course" ? `/api/courses/${id}` : kind === "module" ? `/api/modules/${id}` : `/api/lessons/${id}`;
        api(url, null, "DELETE").then(() => { toast("Eliminado", "ok"); refresh(); }).catch((err: any) => toast(err.message, "danger"));
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
      if (t.closest('[data-action="new-resource"]')) { e.preventDefault(); openNewResource(); return; }
      if (t.closest('[data-action="edit-coach"]')) { e.preventDefault(); openEditProfile(); return; }
      const starEl = t.closest(".star") as HTMLElement | null;
      if (starEl) {
        e.preventDefault();
        const wrap = starEl.parentElement;
        const r = Number(starEl.getAttribute("data-rating"));
        wrap?.querySelectorAll(".star").forEach((s: any) => s.classList.toggle("on", Number(s.getAttribute("data-rating")) <= r));
        return;
      }
      const reviewEl = t.closest('[data-action="leave-review"]') as HTMLElement | null;
      if (reviewEl) { e.preventDefault(); leaveReview(reviewEl.getAttribute("data-course")!); return; }
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

    let startRoute = state.role === "admin" ? "admin" : state.role === "teacher" ? "teacher" : state.role === "parent" ? "parent" : "dashboard";
    // Estudiante nuevo sin placement (PRD §2.2 Journey A): arranca en la auto-evaluación
    // de 3 min, que tras enviarse navega al dashboard con el radar ya poblado.
    if (state.role === "student" && data?.me?.needsPlacement) startRoute = "placement";
    try { if (sessionStorage.getItem("otr_onboard")) { startRoute = "onboarding"; sessionStorage.removeItem("otr_onboard"); } } catch {}
    renderApp(startRoute);
    return () => { root.removeEventListener("click", onClick); root.removeEventListener("keydown", onKey); };
  }, []);

  return <div ref={ref} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: initialHtml }} />;
}
