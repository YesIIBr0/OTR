"use client";
import { useEffect, useRef } from "react";
import { renderShell } from "../lib/shell";
import { SCREENS, ROUTES } from "../lib/screens";
import { IC, otrCrest } from "../lib/icons";
import { DB } from "../lib/data";
import { esc } from "../lib/esc";
import { COURSE_TEMPLATES } from "../lib/course-templates";

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
    // [fix nivel/datos-vivos] DB.me = el `me` RICO de queries (level DERIVADO del XP, streak
    // computado, lifecycle, leaderboardOptIn, ageBand, speakerAvg, needsPlacement, avatarUrl…),
    // con el rol forzado a viewRole. Antes se reconstruía desde el `user` prop (User.level
    // ALMACENADO = JV) y se descartaban todos los campos derivados — pisando los fixes de queries
    // en la carga inicial (la ruta de refresh ya usaba ...fresh.me, ahora son consistentes).
    // Fallback a los campos del user prop solo si data.me faltara (no debería para un logueado).
    DB.me = { name: esc(user.name), email: user.email, initials: esc(user.initials), level: user.level || "Novato", streak: user.streak || 0, ...(data?.me || {}), role: viewRole };
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

    const ROLE_HOME: any = { admin: "admin", teacher: "teacher", parent: "parent", student: "dashboard" };
    function renderApp(r: string, opts?: { keepScroll?: boolean }) {
      let def = (ROUTES as any)[r];
      if (!def) return;
      // Guard de rol en el cliente: si la ruta exige un rol distinto al actual, redirige al
      // home del rol (el backend ya rechaza los datos, pero esto evita pintar UI ajena).
      if (def.role && def.role !== state.role) { r = ROLE_HOME[state.role] || "dashboard"; def = (ROUTES as any)[r]; if (!def) return; }
      // [FE-01] Refresh suave (marcar lección, calificar, reordenar, toggle de edición):
      // preserva el scroll y el foco del usuario en vez de saltar al tope. Antes cada mutación
      // repintaba toda la pantalla y mandaba el scroll arriba — se sentía roto y lento. La
      // navegación real (go) sigue arrancando arriba (keepScroll=false).
      const keep = !!(opts && opts.keepScroll);
      const prevContent = keep ? root.querySelector<HTMLElement>("#content") : null;
      const prevScroll = prevContent ? prevContent.scrollTop : 0;
      const activeId = keep && document.activeElement instanceof HTMLElement ? document.activeElement.id : "";
      teardownRecorder();
      currentRoute = r;
      root.innerHTML = renderShell(def.nav, def.crumbs, (SCREENS as any)[def.screen].render(state), state.role);
      const content = root.querySelector<HTMLElement>("#content");
      (SCREENS as any)[def.screen].mount?.(content, state);
      if (content) content.scrollTop = keep ? prevScroll : 0;
      if (keep && activeId) { const el = document.getElementById(activeId); if (el && typeof (el as any).focus === "function") (el as any).focus(); }
    }
    (window as any).go = (r: string) => renderApp(r);

    let toastWrap: HTMLElement | null = null;
    function toast(msg: string, tone?: string) {
      // [A11Y-02] El contenedor de toasts es una región viva: los lectores de pantalla
      // anuncian cada toast. Los de error (danger) usan role="alert" (asertivo).
      if (!toastWrap) { toastWrap = document.createElement("div"); toastWrap.className = "toast-wrap"; toastWrap.setAttribute("aria-live", "polite"); toastWrap.setAttribute("aria-atomic", "false"); document.body.appendChild(toastWrap); }
      const ic = tone === "ok" ? IC.checkCircle : tone === "warn" ? IC.clock : tone === "danger" ? IC.flag : IC.bell;
      const t = document.createElement("div"); t.className = "toast " + (tone || ""); t.setAttribute("role", tone === "danger" ? "alert" : "status");
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
      scrim.querySelector("[data-ok]")?.addEventListener("click", () => { close(); toast("Cambios guardados", "ok"); });
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
        renderApp(currentRoute, { keepScroll: true });
      } catch { /* silencioso */ }
    }

    function formModal(title: string, fields: any[], onSubmit: (v: any) => Promise<void>) {
      const scrim = document.createElement("div"); scrim.className = "modal-scrim";
      // [A11Y-06 / UIC-04 / UIC-05] Cada campo recibe un id único para enlazar label↔control
      // (for/id), marca visual de requerido (.req con asterisco) y un hueco de hint en línea
      // (aria-describedby) donde la validación de cliente escribe el error del campo concreto.
      const fmBase = "fmf-" + Math.random().toString(36).slice(2, 7);
      const inner = fields.map((f, i) => {
        const fid = `${fmBase}-${i}`;
        const hintId = `${fid}-hint`;
        const req = f.req ? ' aria-required="true"' : "";
        const reqMark = f.req ? ` <span class="req" aria-hidden="true">*</span>` : "";
        const lbl = `<label class="label" for="${fid}">${f.label}${reqMark}</label>`;
        const hint = `<p class="fm-fieldhint" id="${hintId}" role="alert" style="color:var(--danger);font-size:12px;margin:4px 0 0;display:none"></p>`;
        const wrap = (ctrl: string) => `<div class="field" style="margin-bottom:12px">${lbl}${ctrl}${hint}</div>`;
        return f.type === "select"
          ? wrap(`<select class="select" id="${fid}" data-f="${f.name}" aria-describedby="${hintId}"${req}>${(f.options || []).map((o: any) => `<option value="${o.value}" ${o.value === f.value ? "selected" : ""}>${o.label}</option>`).join("")}</select>`)
          : f.type === "richtext"
            ? wrap(`<div class="row" style="gap:4px;margin-bottom:6px;flex-wrap:wrap">${([["bold", "<b>B</b>", "Negrita"], ["italic", "<i>I</i>", "Cursiva"], ["formatBlock:h3", "H", "Subtítulo"], ["insertUnorderedList", "• Lista", "Lista"], ["createLink", '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 15l6-6"/><path d="M11.5 6.5l1-1a4 4 0 0 1 6 6l-1 1"/><path d="M12.5 17.5l-1 1a4 4 0 0 1-6-6l1-1"/></svg>', "Enlace"], ["removeFormat", "⨯", "Quitar formato"]] as any[]).map((c) => `<button type="button" class="btn btn-quiet btn-sm" data-rcmd="${c[0]}" title="${c[2]}">${c[1]}</button>`).join("")}</div><div class="input" id="${fid}" data-f="${f.name}" data-rich="1" contenteditable="true" aria-describedby="${hintId}"${req} style="min-height:140px;max-height:340px;overflow:auto;resize:vertical;line-height:1.6;padding:10px">${f.value || ""}</div>`)
            : f.type === "textarea"
              ? wrap(`<textarea class="input" id="${fid}" data-f="${f.name}" rows="6" placeholder="${f.ph || ""}" aria-describedby="${hintId}"${req} style="resize:vertical;min-height:96px;font-family:inherit;line-height:1.5">${f.value || ""}</textarea>`)
              : wrap(`<input class="input" id="${fid}" data-f="${f.name}"${f.type === "number" ? ` type="number" min="0" max="1000"` : f.type === "date" ? ` type="date"` : f.type === "password" ? ` type="password" autocomplete="new-password"` : ""} placeholder="${f.ph || ""}" value="${f.value != null ? f.value : ""}" aria-describedby="${hintId}"${req}/>`);
      }).join("");
      scrim.innerHTML = `<div class="modal" role="dialog"><div class="modal-head"><h3>${title}</h3></div><div class="modal-body">${inner}<p class="fm-err" style="color:var(--danger);font-size:13px;display:none;margin:4px 0 0"></p></div><div class="modal-foot"><button class="btn btn-ghost" data-x>Cancelar</button><button class="btn btn-primary" data-ok>Guardar</button></div></div>`;
      document.body.appendChild(scrim);
      enter(scrim.querySelector(".modal") as HTMLElement);
      // [P1] Editor rico: la barra aplica comandos al contenteditable. mousedown+preventDefault preserva la selección.
      scrim.querySelectorAll("[data-rcmd]").forEach((b: any) => b.addEventListener("mousedown", (ev: any) => {
        ev.preventDefault();
        const cmd = String(b.dataset.rcmd);
        const editor = b.closest(".field")?.querySelector("[data-rich]") as HTMLElement | null;
        editor?.focus();
        if (cmd.startsWith("formatBlock:")) document.execCommand("formatBlock", false, cmd.split(":")[1]);
        else if (cmd === "createLink") { const url = window.prompt("URL del enlace:"); if (url) document.execCommand("createLink", false, url); }
        else document.execCommand(cmd, false);
      }));
      const close = () => scrim.remove();
      scrim.addEventListener("click", (e: any) => { if (e.target === scrim || e.target.closest("[data-x]")) close(); });
      // Limpia el estado de error de un control (al editarlo o al revalidar).
      const clearFieldErr = (el: HTMLElement) => {
        el.classList.remove("err"); el.removeAttribute("aria-invalid");
        const h = el.parentElement?.querySelector(".fm-fieldhint") as HTMLElement | null;
        if (h) { h.textContent = ""; h.style.display = "none"; }
      };
      // [UIC-05] Al editar, retira la marca de error en línea de ese campo.
      scrim.querySelectorAll("[data-f]").forEach((el: any) => {
        el.addEventListener("input", () => clearFieldErr(el));
        el.addEventListener("change", () => clearFieldErr(el));
      });
      scrim.querySelector("[data-ok]")?.addEventListener("click", async () => {
        const values: any = {}; scrim.querySelectorAll("[data-f]").forEach((el: any) => (values[el.dataset.f] = el.dataset.rich ? el.innerHTML : el.value));
        // [UIC-04 / UIC-05 / A11Y-06] Validación en cliente ANTES de llamar a la API:
        // marca cada campo requerido vacío con aria-invalid + hint en línea y enfoca el primero,
        // en vez de mostrar una sola frase genérica del backend tras llenar todo el formulario.
        let firstBad: HTMLElement | null = null;
        fields.forEach((f, i) => {
          if (!f.req) return;
          const el = scrim.querySelector(`[data-f="${f.name}"]`) as HTMLElement | null;
          if (!el) return;
          const raw = (el as any).dataset.rich ? (el.textContent || "").trim() : String((el as any).value || "").trim();
          if (!raw) {
            el.classList.add("err"); el.setAttribute("aria-invalid", "true");
            const h = el.parentElement?.querySelector(".fm-fieldhint") as HTMLElement | null;
            if (h) { h.textContent = `${f.label} es obligatorio.`; h.style.display = "block"; }
            if (!firstBad) firstBad = el;
          }
        });
        if (firstBad) { (firstBad as HTMLElement).focus(); return; }
        const okBtn = scrim.querySelector("[data-ok]") as HTMLElement; okBtn.textContent = "Guardando…";
        try { await onSubmit(values); close(); } catch (err: any) { const e = scrim.querySelector(".fm-err") as HTMLElement; e.textContent = err.message || "Error"; e.style.display = "block"; okBtn.textContent = "Guardar"; }
      });
      // [PRD-01] Enter envía desde un input de texto simple (no en textarea, editor rico ni select,
      // donde Enter tiene su propio significado). Acelera los formularios cortos sin soltar el teclado.
      scrim.addEventListener("keydown", (e: any) => {
        if (e.key !== "Enter") return;
        const t = e.target as HTMLElement;
        const tag = (t.tagName || "").toLowerCase();
        if (tag !== "input") return;
        if ((t as any).dataset?.rich || t.isContentEditable) return;
        e.preventDefault();
        (scrim.querySelector("[data-ok]") as HTMLElement)?.click();
      });
    }
    // [UIC-03] Exponemos formModal para que otras pantallas (Ajustes) abran un modal
    // consistente (validación + a11y + Enter/Esc) sin duplicar el helper.
    (window as any).otrFormModal = formModal;

    // Modal de progreso para tareas largas (aplicar plantilla / duplicar).
    function progressModal(title: string) {
      const scrim = document.createElement("div"); scrim.className = "modal-scrim";
      scrim.innerHTML = `<div class="modal" role="dialog" style="max-width:400px"><div class="modal-head"><h3>${title}</h3></div><div class="modal-body"><p class="muted" data-prog style="font-size:13.5px">Preparando…</p><div style="height:8px;background:var(--n-150,#e8edf3);border-radius:100px;overflow:hidden;margin-top:10px"><div data-progbar style="height:100%;width:0;background:var(--otr-sky);transition:width .25s"></div></div></div></div>`;
      document.body.appendChild(scrim);
      enter(scrim.querySelector(".modal") as HTMLElement);
      return {
        update: (d: number, total: number) => {
          const p = scrim.querySelector("[data-prog]"); const b = scrim.querySelector("[data-progbar]") as HTMLElement;
          if (p) p.textContent = `Creando contenido… (${d}/${total})`;
          if (b) b.style.width = Math.round((d / Math.max(1, total)) * 100) + "%";
        },
        close: () => scrim.remove(),
      };
    }
    // Aplica una plantilla a un curso recién creado: orquesta POST modules → lessons (→ quizzes).
    async function applyTemplate(courseId: string, tpl: any) {
      const sections = tpl.sections || [];
      let total = 0; sections.forEach((s: any) => { total += 1 + (s.lessons?.length || 0); });
      let done = 0;
      const prog = progressModal(`Creando "${tpl.name}"…`);
      try {
        for (const s of sections) {
          const md = await api("/api/modules", { courseId, title: s.title });
          const moduleId = md?.module?.id; done++; prog.update(done, total);
          if (!moduleId) continue;
          for (const ls of (s.lessons || [])) {
            const ld = await api("/api/lessons", { moduleId, title: ls.title, type: ls.type, dur: ls.dur, contentHtml: ls.contentHtml, submitKinds: ls.submitKinds, maxPoints: ls.maxPoints });
            done++; prog.update(done, total);
            const lessonId = ld?.lesson?.id;
            if (lessonId && ls.type === "quiz" && ls.questions && ls.questions.length) {
              try { await api("/api/quizzes", { lessonId, questions: ls.questions }); } catch {}
            }
          }
        }
        prog.close(); toast("Curso creado desde plantilla", "ok");
      } catch (e: any) { prog.close(); toast("Se creó el curso, pero falló parte de la plantilla: " + (e?.message || ""), "warn"); }
    }
    // Paso 0: galería "¿Cómo quieres empezar?" — en blanco o desde una plantilla OTR.
    function openCourseStart() {
      const scrim = document.createElement("div"); scrim.className = "modal-scrim";
      const blank = `<button class="tile click" data-tpl="" style="text-align:left;padding:14px;cursor:pointer;border:1.5px dashed var(--border);background:var(--surface)">
        <b style="font-size:13.5px;display:block">${IC.plus} En blanco</b><span class="faint" style="font-size:12px;display:block;margin-top:3px">Empieza un curso vacío y constrúyelo tú.</span></button>`;
      // [FLW-08] La tarjeta ya no es un botón opaco: muestra un preview expandible de las
      // secciones/lecciones reales (<details>, sin JS) para no elegir a ciegas; "Usar esta
      // plantilla" (data-tpl) confirma. El toggle del preview no dispara la selección.
      const cards = (COURSE_TEMPLATES || []).map((tp: any) => {
        const secs = (tp.sections || []).length;
        const acts = (tp.sections || []).reduce((n: number, s: any) => n + (s.lessons?.length || 0), 0);
        const preview = (tp.sections || []).map((s: any) =>
          `<div style="margin-bottom:4px"><div style="font-weight:600;font-size:11.5px">${esc(s.title)}</div>${(s.lessons || []).map((l: any) => `<div class="faint" style="font-size:11px;padding-left:9px">· ${esc(l.title)}</div>`).join("")}</div>`).join("");
        return `<div class="tile" style="text-align:left;padding:14px;border:1px solid var(--border);background:var(--surface)">
          <div class="row vcenter" style="gap:7px"><b style="font-size:13.5px">${esc(tp.name)}</b><span class="badge sky" style="flex:none">${esc(tp.level)}</span></div>
          <span class="faint" style="font-size:12px;line-height:1.4;display:block;margin-top:4px">${esc(tp.desc)}</span>
          <span class="faint" style="font-size:11px;display:block;margin-top:6px">${secs} secciones · ${acts} actividades · ${esc(tp.format)}</span>
          <details style="margin-top:8px"><summary style="cursor:pointer;font-size:12px;color:var(--otr-green-text);font-weight:600">Ver contenido</summary><div style="margin-top:8px">${preview}</div></details>
          <button class="btn btn-soft btn-sm" data-tpl="${esc(tp.id)}" style="margin-top:10px;width:100%">Usar esta plantilla</button>
        </div>`;
      }).join("");
      scrim.innerHTML = `<div class="modal" role="dialog" style="max-width:680px"><div class="modal-head"><h3>¿Cómo quieres empezar tu curso?</h3></div><div class="modal-body"><div class="grid g-2" style="gap:10px;align-items:start">${blank}${cards}</div></div><div class="modal-foot"><button class="btn btn-ghost" data-x>Cancelar</button></div></div>`;
      document.body.appendChild(scrim);
      enter(scrim.querySelector(".modal") as HTMLElement);
      const close = () => scrim.remove();
      scrim.addEventListener("click", (e: any) => {
        if (e.target === scrim || e.target.closest("[data-x]")) { close(); return; }
        const pick = e.target.closest("[data-tpl]");
        if (!pick) return;
        const tid = pick.getAttribute("data-tpl");
        close();
        const tpl = tid ? (COURSE_TEMPLATES || []).find((x: any) => x.id === tid) : null;
        openCreateCourse(tpl);
      });
    }
    function openCreateCourse(tpl?: any) {
      formModal(tpl ? `Nuevo curso · ${tpl.name}` : "Nuevo curso", [
        { name: "name", label: "Nombre completo del curso", value: tpl ? tpl.name : "", ph: "Public Forum II", req: true },
        { name: "code", label: "Código corto (único)", ph: "PF-201", req: true },
        { name: "format", label: "Formato / categoría", type: "select", value: tpl ? tpl.format : "Public Forum", options: [
          { value: "Public Forum", label: "Public Forum" }, { value: "Lincoln-Douglas", label: "Lincoln-Douglas" }, { value: "Parlamentario", label: "Parlamentario" }, { value: "Policy", label: "Policy" }, { value: "Oratoria", label: "Oratoria" }, { value: "Otro", label: "Otro" }] },
        { name: "modality", label: "Modalidad", type: "select", value: "online", options: [
          { value: "online", label: "Online" }, { value: "presencial", label: "Presencial" }, { value: "híbrido", label: "Híbrido" }] },
        { name: "capacity", label: "Cupo (capacidad, opcional)", ph: "20" },
        { name: "color", label: "Color del curso", type: "select", value: "#2E8BD0", options: [
          { value: "#2E8BD0", label: "Azul cielo" }, { value: "#0C2340", label: "Navy" }, { value: "#4FA9E8", label: "Azul claro" }, { value: "#2CAA20", label: "Verde" }, { value: "#64748B", label: "Gris" }] },
        { name: "next", label: "Próximo tema (opcional)", ph: "Introducción al formato" },
        { name: "summary", label: "Resumen del programa", type: "textarea", value: tpl ? tpl.summary : "", ph: "Describe de qué trata este programa…" },
        { name: "published", label: "Estado", type: "select", value: "false", options: [
          { value: "false", label: "Borrador (oculto del catálogo)" }, { value: "true", label: "Publicado (visible en el catálogo)" }] },
      ], async (v) => {
        v.published = v.published === "true";
        if (v.capacity === "") delete v.capacity;
        const d = await api("/api/courses", v);
        const newId = d?.course?.id;
        if (tpl && newId) await applyTemplate(newId, tpl);
        else toast("Curso creado — añade sus secciones", "ok");
        await refresh();
        // Flujo Moodle: entrar directo al constructor del curso recién creado.
        if (newId) { (window as any).__builderCourseId = newId; try { sessionStorage.setItem("otr_builder_course", newId); } catch {} renderApp("course-builder"); }
      });
    }
    // Duplicar (clonar) una actividad o sección orquestando los POST existentes.
    async function duplicateEntity(kind: string, id: string) {
      const tcs = (DB as any).teacherCourses || [];
      const dupLesson = async (moduleId: string, l: any) => {
        const ld = await api("/api/lessons", { moduleId, title: l.title + " (copia)", type: l.type, dur: l.dur, contentHtml: l.contentHtml, videoKind: l.videoKind, videoSrc: l.videoSrc, dueAt: l.dueAt, submitKinds: l.submitKinds, maxPoints: l.maxPoints });
        const newId = ld?.lesson?.id;
        const q = (DB as any).quizByLesson?.[l.id];
        if (newId && l.type === "quiz" && q?.questions?.length) {
          try { await api("/api/quizzes", { lessonId: newId, title: q.title, passScore: q.passScore, questions: q.questions.map((qq: any) => ({ prompt: qq.prompt, options: (qq.options || []).map((o: any) => ({ text: o.text, correct: !!o.correct })) })) }); } catch {}
        }
      };
      try {
        if (kind === "lesson") {
          let moduleId: any = null, found: any = null;
          for (const c of tcs) for (const m of c.modules) for (const l of m.lessons) if (l.id === id) { moduleId = m.id; found = l; }
          if (!found) return;
          await dupLesson(moduleId, found); toast("Actividad duplicada", "ok");
        } else if (kind === "module") {
          let courseId: any = null, mod: any = null;
          for (const c of tcs) for (const m of c.modules) if (m.id === id) { courseId = c.id; mod = m; }
          if (!mod) return;
          const md = await api("/api/modules", { courseId, title: mod.title + " (copia)" });
          const newMod = md?.module?.id;
          if (newMod) for (const l of (mod.lessons || [])) await dupLesson(newMod, l);
          toast("Sección duplicada", "ok");
        }
        await refresh();
      } catch (err: any) { toast(err?.message || "No se pudo duplicar", "danger"); }
    }
    function openCreateModule(courseId?: string) {
      const courses = DB.manage?.courses || [];
      if (!courses.length) { toast("Primero crea un curso", "warn"); return; }
      formModal("Nuevo módulo", [
        { name: "courseId", label: "Curso", type: "select", value: courseId || courses[0]?.id, options: courses.map((c: any) => ({ value: c.id, label: `${c.code} · ${c.name}` })) },
        { name: "title", label: "Título del módulo", ph: "Unidad 4 · Estrategia", req: true },
      ], async (v) => { await api("/api/modules", v); toast("Módulo creado", "ok"); await refresh(); });
    }
    const LESSON_TYPES = [
      { value: "lesson", label: "Lección" }, { value: "video", label: "Video" }, { value: "quiz", label: "Examen" },
      { value: "assign", label: "Tarea" }, { value: "mic", label: "Grabación" }, { value: "file", label: "Archivo" }];
    // Presets de tipos de entrega permitidos para tareas (apartado de entrega).
    const SUBMIT_KIND_OPTS = [
      { value: "", label: "Todos (audio, video, archivo, texto)" },
      { value: "file", label: "Solo archivo" },
      { value: "text", label: "Solo texto" },
      { value: "audio", label: "Solo audio (grabación)" },
      { value: "video", label: "Solo video" },
      { value: "file,text", label: "Archivo o texto" },
    ];
    // presetType: cuando viene del Activity Chooser, el tipo ya está elegido → se oculta
    // el select de tipo y se envía ese type. Sin preset, el formulario lo deja elegir.
    function openCreateLesson(moduleId?: string, presetType?: string) {
      const courses = DB.manage?.courses || [];
      const modules = DB.manage?.modules || [];
      if (!modules.length) { toast("Primero crea una sección dentro del curso", "warn"); return; }
      const cmap: any = Object.fromEntries(courses.map((c: any) => [c.id, c.code]));
      const typeLabel = (LESSON_TYPES.find((t) => t.value === presetType)?.label) || "Actividad";
      const fields: any[] = [
        { name: "moduleId", label: "Sección (módulo)", type: "select", value: moduleId || modules[0]?.id, options: modules.map((m: any) => ({ value: m.id, label: `${cmap[m.courseId] || ""} · ${m.title}` })) },
      ];
      if (!presetType) fields.push({ name: "type", label: "Tipo", type: "select", options: LESSON_TYPES });
      fields.push({ name: "title", label: "Título", ph: "Claim · Warrant · Impact", req: true });
      fields.push({ name: "dur", label: "Duración (opcional)", ph: "15 min" });
      fields.push({ name: "videoKind", label: "Video", type: "select", value: "none", options: [
        { value: "none", label: "Sin video" }, { value: "youtube", label: "YouTube (pegar URL)" }, { value: "cloudflare", label: "Video alojado en OTR (ID)" }] });
      fields.push({ name: "videoSrc", label: "Enlace de YouTube o ID del video", ph: "https://youtu.be/… o el ID del video" });
      fields.push({ name: "contentHtml", label: presetType === "assign" || presetType === "mic" ? "Instrucciones para el alumno" : "Contenido de la actividad", type: "richtext", ph: "Escribe el contenido…" });
      if (presetType === "assign" || presetType === "mic") {
        fields.push({ name: "dueAt", label: "Fecha límite (opcional)", type: "date" });
        fields.push({ name: "submitKinds", label: "Tipos de entrega permitidos", type: "select", value: "", options: SUBMIT_KIND_OPTS });
        fields.push({ name: "maxPoints", label: "Puntos (máximo, opcional)", type: "number", ph: "100" });
      }
      formModal(presetType ? `Nueva actividad · ${typeLabel}` : "Nueva lección / contenido", fields, async (v) => {
        const d = await api("/api/lessons", { ...v, type: presetType || v.type });
        toast("Actividad creada", "ok");
        await refresh();
        // Si es un examen, abrir el constructor de preguntas directo (flujo redondo estilo Moodle).
        const created = d?.lesson;
        if (created && (presetType || v.type) === "quiz" && (window as any).otrOpenQuizBuilder) (window as any).otrOpenQuizBuilder(created.id, created.title);
      });
    }
    // Activity chooser estilo Moodle: grid de tipos con icono + descripción.
    function openActivityChooser(moduleId: string) {
      const ITEMS = [
        { type: "lesson", label: "Lección (página)", desc: "Página de contenido enriquecido (texto, imágenes, listas).", ic: IC.book },
        { type: "video", label: "Video", desc: "Clase en video desde YouTube o subida a OTR.", ic: IC.play },
        { type: "quiz", label: "Examen", desc: "Cuestionario de opción múltiple autocalificable.", ic: IC.doc },
        { type: "assign", label: "Tarea", desc: "El alumno entrega un trabajo (archivo, texto o audio) para calificar.", ic: IC.pencil },
        { type: "mic", label: "Grabación", desc: "El alumno graba y entrega un audio de práctica de oratoria.", ic: IC.mic },
        { type: "file", label: "Archivo / recurso", desc: "Material descargable (PDF, plantilla) o enlace adjunto.", ic: IC.file },
      ];
      const scrim = document.createElement("div"); scrim.className = "modal-scrim";
      const cards = ITEMS.map((it) => `
        <button class="tile click" data-pick="${it.type}" style="text-align:left;padding:13px;display:flex;gap:11px;align-items:flex-start;cursor:pointer;border:1px solid var(--border);background:var(--surface)">
          <span style="display:flex;width:22px;height:22px;color:var(--otr-sky-lo);flex:none;margin-top:1px">${it.ic}</span>
          <span style="min-width:0"><b style="font-size:13.5px;display:block">${it.label}</b><span class="faint" style="font-size:12px;line-height:1.4;display:block;margin-top:2px">${it.desc}</span></span>
        </button>`).join("");
      scrim.innerHTML = `<div class="modal" role="dialog" style="max-width:560px"><div class="modal-head"><h3>Añadir actividad o recurso</h3></div><div class="modal-body"><div class="grid g-2" style="gap:10px">${cards}</div></div><div class="modal-foot"><button class="btn btn-ghost" data-x>Cancelar</button></div></div>`;
      document.body.appendChild(scrim);
      enter(scrim.querySelector(".modal") as HTMLElement);
      const close = () => scrim.remove();
      scrim.addEventListener("click", (e: any) => {
        if (e.target === scrim || e.target.closest("[data-x]")) { close(); return; }
        const pick = e.target.closest("[data-pick]");
        if (pick) { close(); openCreateLesson(moduleId, pick.getAttribute("data-pick")); }
      });
    }
    function openEditLesson(id: string, l: any) {
      // [P2] Candidatos a prerrequisito: las demás lecciones del MISMO curso.
      let courseLessons: any[] = [];
      for (const tc of ((DB as any).teacherCourses || [])) {
        const lessons = tc.modules.flatMap((m: any) => m.lessons);
        if (lessons.some((x: any) => x.id === id)) courseLessons = lessons;
      }
      const prereqOptions = [{ value: "", label: "— Sin prerrequisito —" }, ...courseLessons.filter((x: any) => x.id !== id).map((x: any) => ({ value: x.id, label: x.title }))];
      const efields: any[] = [
        { name: "title", label: "Título", value: l.title },
        { name: "type", label: "Tipo", type: "select", value: l.type || "lesson", options: LESSON_TYPES },
        { name: "dur", label: "Duración (opcional)", value: l.dur || "", ph: "15 min" },
        { name: "releaseAfterId", label: "Prerrequisito (completar antes de desbloquear)", type: "select", value: l.releaseAfterId || "", options: prereqOptions },
        { name: "videoKind", label: "Video", type: "select", value: l.videoKind || "none", options: [
          { value: "none", label: "Sin video" }, { value: "youtube", label: "YouTube (pegar URL)" }, { value: "cloudflare", label: "Video alojado en OTR (ID)" }] },
        { name: "videoSrc", label: "Enlace de YouTube o ID del video", value: l.videoSrc || "" },
        { name: "contentHtml", label: "Contenido de la actividad", type: "richtext", value: l.contentHtml || "" },
      ];
      if (l.type === "assign" || l.type === "mic") {
        efields.push({ name: "dueAt", label: "Fecha límite (opcional)", type: "date", value: l.dueAt ? String(l.dueAt).slice(0, 10) : "" });
        efields.push({ name: "submitKinds", label: "Tipos de entrega permitidos", type: "select", value: l.submitKinds || "", options: SUBMIT_KIND_OPTS });
        efields.push({ name: "maxPoints", label: "Puntos (máximo, opcional)", type: "number", value: l.maxPoints != null ? l.maxPoints : "" });
      }
      formModal("Editar actividad", efields, async (v) => { await api(`/api/lessons/${id}`, v, "PATCH"); toast("Actividad actualizada", "ok"); await refresh(); });
    }
    function openEditModule(id: string, title: string) {
      formModal("Editar módulo", [
        { name: "title", label: "Título del módulo", value: title },
      ], async (v) => { await api(`/api/modules/${id}`, v, "PATCH"); toast("Módulo actualizado", "ok"); await refresh(); });
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
        if (c) { close(); const k = c.dataset.c; if (k === "course") openCourseStart(); else if (k === "module") openCreateModule(); else openCreateLesson(); }
      });
    }

    async function doEnroll(courseId: string) {
      try {
        const d = await api("/api/checkout", { courseId });
        if (d.url) { location.href = d.url; return; }
        toast("¡Inscrito!", "ok");
        await refresh();
        // [LEARN-2] Entrar directo al curso recién inscrito (antes solo refrescaba el catálogo
        // y el alumno se quedaba ahí sin un siguiente paso claro). __course indexa por code.
        const enrolled = ((DB as any).coursesContent || []).find((c: any) => c.dbId === courseId || c.id === courseId);
        if (enrolled) { (window as any).__course = enrolled.code; renderApp("course"); }
      } catch (e: any) { toast(e.message || "Error", "danger"); }
    }
    // [LEARN-1] Reclamar el diploma al completar un programa al 100%. El endpoint ya existía
    // (POST /api/certificates recalcula el progreso REAL y hace upsert), pero ninguna pantalla
    // lo invocaba: el alumno terminaba el curso y nunca recibía su certificado. courseId aquí
    // es el id de BD real (coursesContent.dbId), no el code.
    async function doClaimCert(courseId: string) {
      if (!courseId) return;
      try {
        const d = await api("/api/certificates", { courseId });
        (window as any).__cert = d?.certificate?.id || null;
        toast("¡Certificado emitido!", "ok");
        await refresh();
        renderApp("certificate");
      } catch (e: any) { toast(e.message || "Programa no completado", "danger"); }
    }
    // [COACH-05] Publicar / pasar a borrador un curso sin abrir el modal de Configuración.
    // PATCH /api/courses/[id] {published} (allowlisted + teacherOwnsCourse). Publicar lo hace
    // visible en el catálogo del alumno — antes el único camino era el formulario completo.
    async function doPublishCourse(id: string, publish: boolean) {
      try {
        await api(`/api/courses/${encodeURIComponent(id)}`, { published: publish }, "PATCH");
        toast(publish ? "Curso publicado — visible en el catálogo" : "Curso pasado a borrador", "ok");
        await refresh();
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
          { value: "no", label: "Público" }, { value: "yes", label: "Solo inscritos" }] },
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
            <label class="row vcenter" style="gap:10px;min-width:0;cursor:pointer"><input type="checkbox" class="gsub-check" style="flex:none;width:16px;height:16px"/><span style="min-width:0"><span style="display:block;font-weight:600;font-size:13.5px">${esc(s.userName)}</span><span class="faint" style="display:block;font-size:12px">${esc(s.activity)} · ${s.status === "GRADED" ? "Calificado: " + (s.grade ?? "—") : "Pendiente"}</span></span></label>
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
        </div>`).join("") : `<div class="empty" style="padding:20px"><b>Sin entregas todavía</b><p>Cuando un alumno entregue una tarea, aparecerá aquí.</p></div>`;
      // [PRD-02] Calificación en lote: selección múltiple + nota/feedback comunes aplicados
      // a las seleccionadas (calificar 25 grabaciones del mismo drill deja de ser 25 ciclos).
      const batchBar = subs.length > 1 ? `
        <div class="card card-pad" style="margin-bottom:14px;background:var(--bg-sunken)">
          <div class="row vcenter" style="gap:8px;flex-wrap:wrap">
            <label class="row vcenter" style="gap:6px;font-size:12.5px;cursor:pointer"><input type="checkbox" id="gsub-all" style="width:16px;height:16px"/> Seleccionar todas</label>
            <span style="flex:1"></span>
            <input class="input" id="gsub-bgrade" type="number" min="0" max="100" placeholder="Nota" style="width:84px"/>
            <input class="input" id="gsub-bfeedback" placeholder="Feedback común (opcional)" style="flex:1;min-width:150px"/>
            <button class="btn btn-primary btn-sm" id="gsub-bapply">Aplicar a seleccionadas</button>
          </div>
        </div>` : "";
      scrim.innerHTML = `<div class="modal" role="dialog" style="max-width:560px"><div class="modal-head"><h3>Calificar entregas</h3></div><div class="modal-body">${batchBar}${rows}</div><div class="modal-foot"><button class="btn btn-ghost" data-x>Cerrar</button></div></div>`;
      document.body.appendChild(scrim);
      enter(scrim.querySelector(".modal") as HTMLElement);
      let gdirty = false;
      const close = () => { scrim.remove(); if (gdirty) refresh(); };
      scrim.addEventListener("click", async (e: any) => {
        if (e.target === scrim || e.target.closest("[data-x]")) { close(); return; }
        // [PRD-02] Seleccionar todas.
        if (e.target.id === "gsub-all") {
          const on = e.target.checked;
          scrim.querySelectorAll(".gsub-check").forEach((c: any) => (c.checked = on));
          return;
        }
        // [PRD-02] Aplicar nota/feedback comunes a las entregas seleccionadas.
        const bapply = e.target.closest("#gsub-bapply");
        if (bapply) {
          const bgrade = String((scrim.querySelector("#gsub-bgrade") as any)?.value || "").trim();
          const bfeedback = String((scrim.querySelector("#gsub-bfeedback") as any)?.value || "").trim();
          const checked = Array.from(scrim.querySelectorAll(".gsub-check")).filter((c: any) => c.checked);
          if (!checked.length) { toast("Selecciona al menos una entrega", "warn"); return; }
          if (!bgrade && !bfeedback) { toast("Pon una nota o un feedback para aplicar", "warn"); return; }
          (bapply as any).disabled = true; bapply.textContent = "Aplicando…";
          let okN = 0;
          for (const chk of checked) {
            const row = (chk as any).closest("[data-sub]"); const id = row?.getAttribute("data-sub");
            if (!id) continue;
            const body: any = {}; if (bgrade) body.grade = bgrade; if (bfeedback) body.feedback = bfeedback;
            try {
              await api(`/api/submissions/${id}`, body, "PATCH"); okN++;
              if (bgrade) (row.querySelector(".gsub-grade") as any).value = bgrade;
              if (bfeedback) (row.querySelector(".gsub-feedback") as any).value = bfeedback;
              (chk as any).checked = false;
            } catch {}
          }
          gdirty = true;
          (bapply as any).disabled = false; bapply.textContent = "Aplicar a seleccionadas";
          toast(`${okN} entrega${okN === 1 ? "" : "s"} calificada${okN === 1 ? "" : "s"}`, okN ? "ok" : "danger");
          return;
        }
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
        { name: "layout", label: "Layout (cómo lo ve el alumno)", type: "select", value: c?.layout || "modules", options: [
          { value: "modules", label: "Módulos (acordeón) — lista de secciones" }, { value: "grid", label: "Cuadrícula — tarjeta por sección" }, { value: "single", label: "Una sección por página" }] },
        { name: "published", label: "Estado", type: "select", value: (c?.published === false ? "false" : "true"), options: [
          { value: "true", label: "Publicado (visible en el catálogo)" }, { value: "false", label: "Borrador (oculto del catálogo)" }] },
      ], async (v) => { if (v.published !== undefined) v.published = v.published === "true"; await api(`/api/courses/${id}`, v, "PATCH"); toast("Curso actualizado", "ok"); await refresh(); });
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

    // Editor del perfil de MARKETPLACE del coach (lo que ve un alumno/padre al reservar):
    // tarifa, idiomas, especialidades, tiempo de respuesta, video, credenciales, política
    // y paquetes. Antes estos campos solo se cargaban a mano en la base de datos.
    async function openEditCoachMarketplace() {
      let cp: any = {};
      try { const d = await api("/api/coach-profile", null, "GET"); cp = (d && d.profile) || {}; } catch {}
      const centsToUsd = (c: any) => (c ? String(Math.round(Number(c)) / 100) : "");
      const pkgUsd = (sessions: number) => {
        const p = (cp.packages || []).find((x: any) => Number(x.sessions) === sessions);
        return p ? String(Math.round(Number(p.priceCents)) / 100) : "";
      };
      formModal("Perfil de coach · marketplace", [
        { name: "active", label: "Visibilidad en el marketplace", type: "select", value: cp.active === false ? "off" : "on", options: [
          { value: "on", label: "Visible — los alumnos pueden reservar" }, { value: "off", label: "Oculto — no aparece en el marketplace" }] },
        { name: "hourlyUsd", label: "Tarifa por hora (USD)", value: centsToUsd(cp.hourlyCents), ph: "45" },
        { name: "languages", label: "Idiomas (separados por coma)", value: cp.languages || "", ph: "es,en" },
        { name: "specialties", label: "Especialidades", value: cp.specialties || "", ph: "Public Forum, Lincoln-Douglas, Oratoria" },
        { name: "responseTime", label: "Tiempo de respuesta", value: cp.responseTime || "", ph: "Responde en ~2 h" },
        { name: "introVideoUrl", label: "Video de presentación (URL de YouTube)", value: cp.introVideoUrl || "", ph: "https://youtu.be/…" },
        { name: "credentials", label: "Credenciales", type: "textarea", value: cp.credentials || "", ph: "Head Coach · 15+ torneos internacionales · ex-seleccionado nacional" },
        { name: "cancelPolicy", label: "Política de cancelación", type: "textarea", value: cp.cancelPolicy || "", ph: "Cancelación gratis hasta 24 h antes de la sesión." },
        { name: "pkgSingle", label: "Precio · 1 sesión (USD)", value: pkgUsd(1), ph: "45" },
        { name: "pkg5", label: "Precio · paquete de 5 (USD)", value: pkgUsd(5), ph: "200" },
        { name: "pkg10", label: "Precio · paquete de 10 (USD)", value: pkgUsd(10), ph: "380" },
      ], async (v) => {
        const usdToCents = (s: any) => { const n = parseFloat(String(s ?? "").replace(/[^0-9.]/g, "")); return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : null; };
        const pk: any[] = [];
        const s1 = usdToCents(v.pkgSingle); if (s1) pk.push({ name: "Single", sessions: 1, priceCents: s1 });
        const s5 = usdToCents(v.pkg5); if (s5) pk.push({ name: "5-pack", sessions: 5, priceCents: s5 });
        const s10 = usdToCents(v.pkg10); if (s10) pk.push({ name: "10-pack", sessions: 10, priceCents: s10 });
        const body: any = {
          active: v.active === "on",
          languages: v.languages,
          specialties: v.specialties,
          responseTime: v.responseTime,
          introVideoUrl: v.introVideoUrl,
          credentials: v.credentials,
          cancelPolicy: v.cancelPolicy,
          packages: pk,
        };
        const hc = usdToCents(v.hourlyUsd); if (hc) body.hourlyCents = hc;
        await api("/api/coach-profile", body, "PATCH");
        toast("Perfil de coach actualizado", "ok");
        await refresh();
      });
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
            renderApp(currentRoute, { keepScroll: true });
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
      const certEl = t.closest("[data-claim-cert]") as HTMLElement | null;
      if (certEl) { e.preventDefault(); doClaimCert(certEl.getAttribute("data-claim-cert")!); return; }
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
            toast(done ? "Lección marcada como completada" : "Lección desmarcada", "ok");
            renderApp(currentRoute, { keepScroll: true });
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
        const msg = kind === "course"
          ? "¿Eliminar el curso completo? Se borran sus módulos, lecciones y exámenes. No se puede deshacer."
          : kind === "module"
          ? "¿Eliminar el módulo y TODAS sus lecciones? No se puede deshacer."
          : "¿Eliminar esta lección? No se puede deshacer.";
        if (!window.confirm(msg)) return;
        const url = kind === "course" ? `/api/courses/${id}` : kind === "module" ? `/api/modules/${id}` : `/api/lessons/${id}`;
        api(url, null, "DELETE").then(() => { toast("Eliminado", "ok"); refresh(); }).catch((err: any) => toast(err.message, "danger"));
        return;
      }
      // [P1] Editar módulo (lápiz en la gestión de contenido)
      const editModEl = t.closest("[data-edit-module]") as HTMLElement | null;
      if (editModEl) { e.preventDefault(); openEditModule(editModEl.getAttribute("data-edit-module")!, editModEl.dataset.title || ""); return; }
      // [P1] Reordenar módulos (↑/↓): deriva el orden de los hermanos desde DB.teacherCourses
      const rmEl = t.closest("[data-reorder-module]") as HTMLElement | null;
      if (rmEl) {
        e.preventDefault();
        const [courseId, moduleId, dir] = rmEl.getAttribute("data-reorder-module")!.split(":");
        const course = ((DB as any).teacherCourses || []).find((c: any) => c.id === courseId);
        if (course) {
          const ids = course.modules.map((m: any) => m.id);
          const i = ids.indexOf(moduleId); const j = dir === "up" ? i - 1 : i + 1;
          if (i >= 0 && j >= 0 && j < ids.length) {
            [ids[i], ids[j]] = [ids[j], ids[i]];
            api("/api/modules/reorder", { courseId, orderedIds: ids }, "POST").then(() => refresh()).catch((err: any) => toast(err.message, "danger"));
          }
        }
        return;
      }
      // [P1] Reordenar lecciones (↑/↓)
      const rlEl = t.closest("[data-reorder-lesson]") as HTMLElement | null;
      if (rlEl) {
        e.preventDefault();
        const [moduleId, lessonId, dir] = rlEl.getAttribute("data-reorder-lesson")!.split(":");
        let mod: any = null;
        for (const c of ((DB as any).teacherCourses || [])) for (const m of c.modules) if (m.id === moduleId) mod = m;
        if (mod) {
          const ids = mod.lessons.map((l: any) => l.id);
          const i = ids.indexOf(lessonId); const j = dir === "up" ? i - 1 : i + 1;
          if (i >= 0 && j >= 0 && j < ids.length) {
            [ids[i], ids[j]] = [ids[j], ids[i]];
            api("/api/lessons/reorder", { moduleId, orderedIds: ids }, "POST").then(() => refresh()).catch((err: any) => toast(err.message, "danger"));
          }
        }
        return;
      }
      const editEl = t.closest("[data-edit-course]") as HTMLElement | null;
      if (editEl) { e.preventDefault(); openEditCourse(editEl.getAttribute("data-edit-course")!, editEl.dataset.name || ""); return; }
      const pubEl = t.closest("[data-publish-course]") as HTMLElement | null;
      if (pubEl) { e.preventDefault(); doPublishCourse(pubEl.getAttribute("data-publish-course")!, pubEl.dataset.pub !== "1"); return; }
      const editLessonEl = t.closest("[data-edit-lesson]") as HTMLElement | null;
      if (editLessonEl) {
        e.preventDefault();
        const lid = editLessonEl.getAttribute("data-edit-lesson");
        let found: any = null;
        for (const c of ((DB as any).teacherCourses || [])) for (const m of c.modules) for (const l of m.lessons) if (l.id === lid) found = l;
        if (found) openEditLesson(lid!, found);
        return;
      }
      // Construir contenido DENTRO del curso (estilo Moodle): el botón pre-selecciona
      // el curso/módulo de contexto, sin desplegable global.
      const addModEl = t.closest("[data-add-module]") as HTMLElement | null;
      if (addModEl) { e.preventDefault(); openCreateModule(addModEl.getAttribute("data-add-module")!); return; }
      const addLesEl = t.closest("[data-add-lesson]") as HTMLElement | null;
      if (addLesEl) { e.preventDefault(); openCreateLesson(addLesEl.getAttribute("data-add-lesson")!); return; }
      if (t.closest('[data-action="new-course"]')) { e.preventDefault(); openCourseStart(); return; }
      const dupEl = t.closest("[data-duplicate]") as HTMLElement | null;
      if (dupEl) { e.preventDefault(); const [dk, di] = dupEl.getAttribute("data-duplicate")!.split(":"); duplicateEntity(dk, di); return; }
      // Constructor de curso estilo Moodle.
      const goBuilderEl = t.closest("[data-go-builder]") as HTMLElement | null;
      if (goBuilderEl) { e.preventDefault(); const cid = goBuilderEl.getAttribute("data-go-builder")!; (window as any).__builderCourseId = cid; try { sessionStorage.setItem("otr_builder_course", cid); } catch {} renderApp("course-builder"); return; }
      const chooserEl = t.closest("[data-open-chooser]") as HTMLElement | null;
      if (chooserEl) { e.preventDefault(); openActivityChooser(chooserEl.getAttribute("data-open-chooser")!); return; }
      if (t.closest("[data-toggle-edit]")) { e.preventDefault(); const cur = (window as any).__editMode !== false; (window as any).__editMode = !cur; try { sessionStorage.setItem("otr_edit_mode", !cur ? "1" : "0"); } catch {} renderApp(currentRoute, { keepScroll: true }); return; }
      // Mostrar/ocultar una sección o actividad al alumno (ojo).
      const hideEl = t.closest("[data-toggle-hidden]") as HTMLElement | null;
      if (hideEl) {
        e.preventDefault();
        const [kind, hid] = hideEl.getAttribute("data-toggle-hidden")!.split(":");
        let cur = false;
        for (const c of ((DB as any).teacherCourses || [])) {
          if (kind === "module") { const m = c.modules.find((x: any) => x.id === hid); if (m) cur = !!m.hidden; }
          else { for (const m of c.modules) { const l = m.lessons.find((x: any) => x.id === hid); if (l) { cur = !!l.hidden; break; } } }
        }
        const url = kind === "module" ? `/api/modules/${hid}` : `/api/lessons/${hid}`;
        api(url, { hidden: !cur }, "PATCH").then(() => { toast(!cur ? "Oculto al alumno" : "Visible para el alumno", "ok"); return refresh(); }).catch((err: any) => toast(err.message || "Error", "danger"));
        return;
      }
      if (t.closest('[data-action="edit-profile"]')) { e.preventDefault(); openEditProfile(); return; }
      if (t.closest("#burger")) { root.querySelector(".app")?.classList.toggle("drawer-open"); return; }
      if (t.closest("#bell")) { e.stopPropagation(); toggleNotif(); return; }
      if (notifOpen && !t.closest("#notif-panel") && !t.closest("#bell")) toggleNotif(false);
      if (t.closest('[data-action="new-resource"]')) { e.preventDefault(); openNewResource(); return; }
      if (t.closest('[data-action="edit-coach"]')) { e.preventDefault(); openEditProfile(); return; }
      if (t.closest('[data-action="edit-coach-market"]')) { e.preventDefault(); openEditCoachMarketplace(); return; }
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
        return;
      }
      // [A11Y-01] Activa con Enter/Espacio los contenedores clicables marcados como
      // role=button (filas de lección, tarjetas, <tr>) → operables por teclado.
      if ((e.key === "Enter" || e.key === " ") && inp?.matches?.('[role="button"][tabindex]')) {
        e.preventDefault();
        inp.click();
      }
    };
    root.addEventListener("keydown", onKey);

    // [A11Y-03] Accesibilidad de modales, CENTRALIZADA: cualquier .modal-scrim que se
    // monte (hay 6+ sitios que los crean, sin un helper común) recibe aria-modal,
    // aria-labelledby al título, foco inicial, trampa de Tab, cierre con Escape y
    // retorno de foco al disparador. Un MutationObserver evita tocar los 6 sitios.
    let mdlSeq = 0;
    const mdlFocusables = (scope: HTMLElement) => Array.from(scope.querySelectorAll<HTMLElement>(
      'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[contenteditable="true"],[tabindex]:not([tabindex="-1"])'
    )).filter((el) => el.offsetParent !== null);
    const enhanceModal = (scrim: HTMLElement) => {
      const dialog = scrim.querySelector(".modal") as HTMLElement | null;
      if (!dialog) return;
      dialog.setAttribute("aria-modal", "true");
      const h = dialog.querySelector("h3");
      if (h) { if (!h.id) h.id = "mdl-title-" + (++mdlSeq); dialog.setAttribute("aria-labelledby", h.id); }
      (scrim as any).__trigger = document.activeElement;
      const f = mdlFocusables(dialog);
      if (f.length) f[0].focus();
      else { dialog.setAttribute("tabindex", "-1"); dialog.focus(); }
    };
    const onModalKey = (e: KeyboardEvent) => {
      const scrims = document.querySelectorAll(".modal-scrim");
      if (!scrims.length) return;
      const scrim = scrims[scrims.length - 1] as HTMLElement;
      if (e.key === "Escape") {
        // Solo cierran con Escape los modales con affordance de cerrar ([data-x]);
        // los de progreso (sin botón) lo ignoran a propósito.
        const x = scrim.querySelector("[data-x]") as HTMLElement | null;
        if (x) { e.preventDefault(); x.click(); }
      } else if (e.key === "Tab") {
        const f = mdlFocusables(scrim);
        if (!f.length) { e.preventDefault(); return; }
        const first = f[0], last = f[f.length - 1], a = document.activeElement as HTMLElement;
        if (e.shiftKey && (a === first || !scrim.contains(a))) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && (a === last || !scrim.contains(a))) { e.preventDefault(); first.focus(); }
      }
    };
    const mdlObserver = new MutationObserver((muts) => {
      for (const m of muts) {
        m.addedNodes.forEach((n) => { if (n instanceof HTMLElement && n.classList?.contains("modal-scrim")) enhanceModal(n); });
        m.removedNodes.forEach((n) => {
          if (n instanceof HTMLElement && n.classList?.contains("modal-scrim")) {
            const trig = (n as any).__trigger as HTMLElement | null;
            if (trig && document.body.contains(trig)) { try { trig.focus(); } catch {} }
          }
        });
      }
    });
    mdlObserver.observe(document.body, { childList: true });
    document.addEventListener("keydown", onModalKey, true);

    let startRoute = state.role === "admin" ? "admin" : state.role === "teacher" ? "teacher" : state.role === "parent" ? "parent" : "dashboard";
    // [ONBOARDING-1] Orden correcto del arranque: el placement del alumno nuevo (PRD §2.2
    // Journey A) DEBE ganar sobre el flag de onboarding del registro — antes `otr_onboard`
    // lo pisaba y el alumno nunca hacía su evaluación inicial (radar vacío para siempre).
    // Consumimos el flag siempre (no se queda pegado), pero placement tiene prioridad.
    let justRegistered = false;
    try { justRegistered = !!sessionStorage.getItem("otr_onboard"); sessionStorage.removeItem("otr_onboard"); } catch {}
    if (state.role === "student" && data?.me?.needsPlacement) startRoute = "placement";
    else if (justRegistered) startRoute = "onboarding";
    renderApp(startRoute);
    return () => { root.removeEventListener("click", onClick); root.removeEventListener("keydown", onKey); mdlObserver.disconnect(); document.removeEventListener("keydown", onModalKey, true); };
  }, []);

  return <div ref={ref} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: initialHtml }} />;
}
