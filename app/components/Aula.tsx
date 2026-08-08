"use client";
import { useEffect, useRef } from "react";
import { renderShell } from "../lib/shell";
import { ROUTES, ensureScreen, prefetchForRole } from "../lib/screens";
import { IC, otrCrest } from "../lib/icons";
import { DB } from "../lib/data";
import { esc } from "../lib/esc";
// Alias 'tr' para no chocar con los muchos `const t = e.target` locales de este archivo.
import { t as tr } from "../lib/i18n";
// COURSE_TEMPLATES (~11.6 kB) se carga de forma diferida vía import() dentro de
// openCourseStart(): solo lo baja el profesor al abrir el modal "crear curso",
// no viaja en el first load de /aula (F4.2).

export default function Aula({ data, user }: { data: any; user: any }) {
  const ref = useRef<HTMLDivElement>(null);
  const initialHtml = `
    <div style="min-height:100vh;display:grid;place-items:center;background:var(--otr-navy);color:#fff;font-family:var(--font-ui)">
      <div style="text-align:center">
        ${/* Escudo OTR del brand book (pantalla de carga, fondo negro) — markup canónico en lib/icons (otrCrest) */""}
        ${otrCrest({ attrs: 'style="width:48px;height:50px;margin:0 auto;display:block"', ink: "#FFFFFF" })}
        <p style="margin-top:14px;color:rgba(255,255,255,.6)">${tr("aula.loading")}</p>
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

    // [A11Y] El SPA inyecta innerHTML sin recargar el documento → teclado y lector de pantalla
    // no detectan el cambio de pantalla. Región aria-live persistente para anunciar la ruta.
    let routeAnnouncer: HTMLElement | null = null;
    function announceRoute(name: string) {
      if (!routeAnnouncer) {
        routeAnnouncer = document.createElement("div");
        routeAnnouncer.className = "sr-only";
        routeAnnouncer.setAttribute("aria-live", "polite");
        routeAnnouncer.setAttribute("aria-atomic", "true");
        document.body.appendChild(routeAnnouncer);
      }
      routeAnnouncer.textContent = name;
    }
    // El idioma activo (cookie otr_lang) debe reflejarse en <html lang> para el lector de pantalla.
    try { const m = document.cookie.match(/(?:^|;\s*)otr_lang=([^;]+)/); document.documentElement.lang = m && m[1] === "en" ? "en" : "es"; } catch {}

    async function renderApp(r: string, opts?: { keepScroll?: boolean }) {
      let def = (ROUTES as any)[r];
      if (!def) return;
      // Guard de rol en el cliente: si la ruta exige un rol distinto al actual, redirige al
      // home del rol (el backend ya rechaza los datos, pero esto evita pintar UI ajena).
      // def.role puede ser un string (un rol) o una lista (varios roles autorizados).
      if (def.role) {
        const allowed = Array.isArray(def.role) ? def.role : [def.role];
        if (!allowed.includes(state.role)) { r = ROLE_HOME[state.role] || "dashboard"; def = (ROUTES as any)[r]; if (!def) return; }
      }
      const keep = !!(opts && opts.keepScroll);
      currentRoute = r; // se fija ANTES del await para el guard "la última navegación gana"
      // [UI-CURSOS U4] Publica la ruta viva: los paneles EMBEBIDOS (p.ej. las reservas dentro
      // de Cursos) necesitan repintar "donde estoy" tras una mutación, no saltar a una
      // pantalla propia — que puede no existir.
      (window as unknown as Record<string, unknown>).__route = r;

      // [PERF · code-splitting] Asegura que el chunk del módulo de la pantalla esté cargado
      // antes de pintar. Instantáneo si ya se cargó (microtask); en el primer acceso baja su
      // chunk. ensureScreen tiene fallback load-all, así que un mapeo incompleto nunca rompe.
      const screen: any = await ensureScreen(def.screen);
      if (currentRoute !== r) return;      // otra navegación ocurrió mientras cargaba el chunk
      if (!screen) return;                 // defensivo (el fallback debería evitarlo siempre)

      // [FE-01] Refresh suave (marcar lección, calificar, reordenar, toggle de edición):
      // preserva el scroll y el foco del usuario en vez de saltar al tope. La navegación real
      // (go) sigue arrancando arriba (keepScroll=false).
      teardownRecorder();

      // [PERF] Refresh suave (MISMA ruta): repinta SOLO el contenido dentro de #content,
      // conservando sidebar+topbar (idénticos en la misma ruta) y el propio <div.page> (así NO
      // se re-dispara la animación .rise). Antes se reconstruía todo el shell en cada mutación.
      const keepContent = keep ? root.querySelector<HTMLElement>("#content") : null;
      const keepPage = keepContent ? keepContent.querySelector<HTMLElement>(".page") : null;
      if (keep && keepContent && keepPage) {
        const prevScroll = keepContent.scrollTop;
        const activeId = document.activeElement instanceof HTMLElement ? document.activeElement.id : "";
        keepPage.innerHTML = screen.render(state);
        screen.mount?.(keepContent, state);
        keepContent.scrollTop = prevScroll;
        if (activeId) { const el = document.getElementById(activeId); if (el && typeof (el as any).focus === "function") (el as any).focus(); }
        return;
      }

      // Render COMPLETO: primer paint o navegación real (go). Reconstruye el shell entero.
      root.innerHTML = renderShell(def.nav, def.crumbs, screen.render(state), state.role);
      const content = root.querySelector<HTMLElement>("#content");
      screen.mount?.(content, state);
      if (content) content.scrollTop = 0;
      // [A11Y] Navegación real: fija el document.title, anuncia la pantalla por la región
      // aria-live y mueve el foco al contenido — así teclado y lector de pantalla detectan
      // el cambio (el innerHTML silencioso no lo notan solos). Se salta si hay un modal
      // abierto (p.ej. crear curso navega al constructor antes de cerrar su modal) para no
      // robarle el foco a un diálogo todavía visible.
      const heading = root.querySelector<HTMLElement>("h1, .page-title");
      const pageName = (heading?.textContent || "").trim();
      if (pageName) { document.title = `${pageName} · OTR Aula`; announceRoute(pageName); }
      if (content && typeof content.focus === "function" && !document.querySelector(".modal-scrim")) { try { content.focus({ preventScroll: true } as any); } catch { content.focus(); } }
      // [PERF] Tras el primer paint, prefetch (idle, fire-and-forget) de las pantallas probables
      // del rol → navegación instantánea sin inflar el bundle inicial.
      prefetchForRole(state.role);
    }
    (window as any).go = (r: string) => { void renderApp(r); };

    let toastWrap: HTMLElement | null = null;
    function toast(msg: string, tone?: string, action?: { label?: string; onClick: () => void }) {
      // [A11Y-02] El contenedor de toasts es una región viva: los lectores de pantalla
      // anuncian cada toast. Los de error (danger) usan role="alert" (asertivo).
      if (!toastWrap) { toastWrap = document.createElement("div"); toastWrap.className = "toast-wrap"; toastWrap.setAttribute("aria-live", "polite"); toastWrap.setAttribute("aria-atomic", "false"); document.body.appendChild(toastWrap); }
      const ic = tone === "ok" ? IC.checkCircle : tone === "warn" ? IC.clock : tone === "danger" ? IC.flag : IC.bell;
      const el = document.createElement("div"); el.className = "toast " + (tone || ""); el.setAttribute("role", tone === "danger" ? "alert" : "status");
      // [Blueprint §11] El error no es un callejón sin salida: si la acción se puede reintentar,
      // el toast trae su botón de "Reintentar" y vive más tiempo para dar margen a actuar.
      const retry = !!(action && typeof action.onClick === "function");
      el.innerHTML = `<span class="ti">${ic}</span><span class="tmsg">${msg}</span>${retry ? `<button type="button" class="toast-retry" data-retry>${esc(action!.label || tr("err.retry"))}</button>` : ""}`;
      toastWrap.appendChild(el);
      let gone = false;
      const dismiss = () => { if (gone) return; gone = true; el.style.opacity = "0"; el.style.transform = "translateY(8px) scale(.98)"; el.style.transition = "opacity .3s var(--ease), transform .3s var(--ease)"; setTimeout(() => el.remove(), 300); };
      if (retry) el.querySelector("[data-retry]")?.addEventListener("click", () => { dismiss(); try { action!.onClick(); } catch { /* el reintento no debe romper la UI */ } });
      setTimeout(dismiss, retry ? 8000 : 2600);
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

    (window as any).modal = function ({ title = "", body = "", ok = tr("aula.confirm"), cancel = tr("aula.cancel"), tone = "primary" } = {}) {
      const scrim = document.createElement("div"); scrim.className = "modal-scrim";
      scrim.innerHTML = `<div class="modal" role="dialog"><div class="modal-head"><h3>${title}</h3></div><div class="modal-body">${body}</div><div class="modal-foot"><button class="btn btn-ghost" data-x>${cancel}</button><button class="btn btn-${tone}" data-ok>${ok}</button></div></div>`;
      document.body.appendChild(scrim);
      enter(scrim.querySelector(".modal") as HTMLElement);
      const close = () => scrim.remove();
      scrim.addEventListener("click", (e: any) => { if (e.target === scrim || e.target.closest("[data-x]")) close(); });
      scrim.querySelector("[data-ok]")?.addEventListener("click", () => { close(); toast(tr("aula.changesSaved"), "ok"); });
    };

    // [Blueprint §11] Plantilla de error causa+acción. En vez de un "Error" pelado, el mensaje
    // dice qué pasó y qué hacer: la causa del servidor (d.error) manda por ser la más específica;
    // si no, se mapea por status; el fallo de red (fetch que rechaza) tiene su propio mensaje.
    function apiErrorMsg(status: number, serverErr?: string, code?: string) {
      // [I18N-API] Si el servidor mandó un `code` estable (app/lib/api.ts bad()), el toast
      // sale en el idioma activo vía apierr.*; si la llave no existe, cae al mensaje ES.
      if (code) { const k = "apierr." + code; const v = tr(k); if (v && v !== k) return v; }
      if (serverErr) return serverErr;
      if (status === 404) return tr("err.notFound");
      if (status === 401 || status === 403) return tr("err.forbidden");
      if (status >= 500) return tr("err.server");
      return tr("err.generic");
    }
    async function api(url: string, body?: any, method = "POST") {
      let res: Response;
      try {
        res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
      } catch {
        throw new Error(tr("err.network"));
      }
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(apiErrorMsg(res.status, d.error, d.code));
      return d;
    }
    (window as any).api = api;

    // Sube un archivo real a /api/uploads vía FormData y devuelve { url, original, mime, size, id }.
    // NO se fija Content-Type manualmente: el navegador añade el boundary del multipart.
    async function otrUpload(file: File, kind: string) {
      try {
        if (!file) throw new Error(tr("aula.noFile"));
        const fd = new FormData();
        fd.append("file", file);
        fd.append("kind", kind || "file");
        const r = await fetch("/api/uploads", { method: "POST", body: fd });
        const j = await r.json().catch(() => ({}));
        if (!r.ok || !j.ok) throw new Error(j.error || tr("aula.uploadError"));
        return j;
      } catch (e: any) {
        toast(e?.message || tr("aula.uploadError"), "danger");
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
            ? wrap(`<div class="row" style="gap:4px;margin-bottom:6px;flex-wrap:wrap">${([["bold", "<b>B</b>", tr("aula.rtBold")], ["italic", "<i>I</i>", tr("aula.rtItalic")], ["formatBlock:h3", "H", tr("aula.rtHeading")], ["insertUnorderedList", `• ${tr("aula.rtList")}`, tr("aula.rtList")], ["createLink", '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 15l6-6"/><path d="M11.5 6.5l1-1a4 4 0 0 1 6 6l-1 1"/><path d="M12.5 17.5l-1 1a4 4 0 0 1-6-6l1-1"/></svg>', tr("aula.rtLink")], ["removeFormat", "⨯", tr("aula.rtClearFormat")]] as any[]).map((c) => `<button type="button" class="btn btn-quiet btn-sm" data-rcmd="${c[0]}" title="${c[2]}">${c[1]}</button>`).join("")}</div><div class="input" id="${fid}" data-f="${f.name}" data-rich="1" contenteditable="true" aria-describedby="${hintId}"${req} style="min-height:140px;max-height:340px;overflow:auto;resize:vertical;line-height:1.6;padding:10px">${f.value || ""}</div>`)
            : f.type === "textarea"
              ? wrap(`<textarea class="input" id="${fid}" data-f="${f.name}" rows="6" placeholder="${f.ph || ""}" aria-describedby="${hintId}"${req} style="resize:vertical;min-height:96px;font-family:inherit;line-height:1.5">${f.value || ""}</textarea>`)
              : wrap(`<input class="input" id="${fid}" data-f="${f.name}"${f.type === "number" ? ` type="number" min="0" max="1000"` : f.type === "date" ? ` type="date"` : f.type === "password" ? ` type="password" autocomplete="new-password"` : ""} placeholder="${f.ph || ""}" value="${f.value != null ? f.value : ""}" aria-describedby="${hintId}"${req}/>`);
      }).join("");
      scrim.innerHTML = `<div class="modal" role="dialog"><div class="modal-head"><h3>${title}</h3></div><div class="modal-body">${inner}<p class="fm-err" style="color:var(--danger);font-size:13px;display:none;margin:4px 0 0"></p></div><div class="modal-foot"><button class="btn btn-ghost" data-x>${tr("aula.cancel")}</button><button class="btn btn-primary" data-ok>${tr("aula.save")}</button></div></div>`;
      document.body.appendChild(scrim);
      enter(scrim.querySelector(".modal") as HTMLElement);
      // [P1] Editor rico: la barra aplica comandos al contenteditable. mousedown+preventDefault preserva la selección.
      scrim.querySelectorAll("[data-rcmd]").forEach((b: any) => b.addEventListener("mousedown", (ev: any) => {
        ev.preventDefault();
        const cmd = String(b.dataset.rcmd);
        const editor = b.closest(".field")?.querySelector("[data-rich]") as HTMLElement | null;
        editor?.focus();
        if (cmd.startsWith("formatBlock:")) document.execCommand("formatBlock", false, cmd.split(":")[1]);
        else if (cmd === "createLink") {
          const raw = window.prompt(tr("aula.linkUrlPrompt"));
          const url = (raw || "").trim();
          // Solo permitimos http/https; rechazamos javascript:, data:, etc.
          if (url && /^https?:\/\//i.test(url)) {
            const sel = window.getSelection();
            if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
              const range = sel.getRangeAt(0);
              const anchor = document.createElement("a");
              anchor.href = url;
              anchor.target = "_blank";
              anchor.rel = "noopener noreferrer";
              try {
                range.surroundContents(anchor);
              } catch {
                // surroundContents falla si la selección cruza límites de nodo;
                // extraemos el contenido y lo envolvemos manualmente.
                anchor.appendChild(range.extractContents());
                range.insertNode(anchor);
              }
              sel.removeAllRanges();
            }
          } else if (url) {
            toast(tr("aula.onlyHttpLinks"), "warn");
          }
        }
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
        fields.forEach((f) => {
          if (!f.req) return;
          const el = scrim.querySelector(`[data-f="${f.name}"]`) as HTMLElement | null;
          if (!el) return;
          const raw = (el as any).dataset.rich ? (el.textContent || "").trim() : String((el as any).value || "").trim();
          if (!raw) {
            el.classList.add("err"); el.setAttribute("aria-invalid", "true");
            const h = el.parentElement?.querySelector(".fm-fieldhint") as HTMLElement | null;
            if (h) { h.textContent = `${f.label} ${tr("err.requiredSuffix")}`; h.style.display = "block"; }
            if (!firstBad) firstBad = el;
          }
        });
        if (firstBad) { (firstBad as HTMLElement).focus(); return; }
        const okBtn = scrim.querySelector("[data-ok]") as HTMLElement; okBtn.textContent = tr("aula.saving");
        try { await onSubmit(values); close(); } catch (err: any) { const e = scrim.querySelector(".fm-err") as HTMLElement; e.textContent = err.message || tr("err.generic"); e.style.display = "block"; okBtn.textContent = tr("aula.save"); }
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
      scrim.innerHTML = `<div class="modal" role="dialog" style="max-width:400px"><div class="modal-head"><h3>${title}</h3></div><div class="modal-body"><p class="muted" data-prog style="font-size:13.5px">${tr("aula.preparing")}</p><div style="height:8px;background:var(--n-150,#e8edf3);border-radius:100px;overflow:hidden;margin-top:10px"><div data-progbar style="height:100%;width:0;background:var(--otr-sky);transition:width .25s"></div></div></div></div>`;
      document.body.appendChild(scrim);
      enter(scrim.querySelector(".modal") as HTMLElement);
      return {
        update: (d: number, total: number) => {
          const p = scrim.querySelector("[data-prog]"); const b = scrim.querySelector("[data-progbar]") as HTMLElement;
          if (p) p.textContent = tr("aula.creatingContent").replace("{done}", String(d)).replace("{total}", String(total));
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
      const prog = progressModal(tr("aula.creatingTemplate").replace("{name}", tpl.name));
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
        prog.close(); toast(tr("aula.courseFromTemplate"), "ok");
      } catch (e: any) { prog.close(); toast(tr("aula.templatePartialFail") + (e?.message || ""), "warn"); }
    }
    // [F6.3] Cache de coaches para el selector de dueño del ADMIN (se baja una sola vez, on-demand
    // al abrir el modal de crear curso). null = aún no cargado; [] = cargado sin resultados.
    let adminCoachList: Array<{ id: string; name: string }> | null = null;
    async function loadAdminCoaches(): Promise<Array<{ id: string; name: string }>> {
      if (adminCoachList) return adminCoachList;
      try {
        // Reusa /api/admin/users?role=TEACHER (devuelve TEACHER+COACH, ver ruta): la lista de
        // quienes pueden impartir un curso. Best-effort: si falla, el selector queda vacío y el
        // curso nace a nombre del propio admin (comportamiento por defecto del backend).
        const d = await api("/api/admin/users?role=TEACHER", undefined, "GET");
        adminCoachList = (d?.users || []).map((u: any) => ({ id: u.id, name: u.name }));
      } catch {
        adminCoachList = [];
      }
      return adminCoachList;
    }

    // Paso 0: galería "¿Cómo quieres empezar?" — en blanco o desde una plantilla OTR.
    // async: las plantillas (~11.6 kB) se bajan bajo demanda al abrir el modal (F4.2),
    // así ningún alumno las descarga en el first load de /aula.
    async function openCourseStart() {
      const { COURSE_TEMPLATES } = await import("../lib/course-templates");
      const scrim = document.createElement("div"); scrim.className = "modal-scrim";
      const blank = `<button class="tile click" data-tpl="" style="text-align:left;padding:14px;cursor:pointer;border:1.5px dashed var(--border);background:var(--surface)">
        <b style="font-size:13.5px;display:block">${IC.plus} ${tr("aula.startBlank")}</b><span class="faint" style="font-size:12px;display:block;margin-top:3px">${tr("aula.startBlankDesc")}</span></button>`;
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
          <span class="faint" style="font-size:11px;display:block;margin-top:6px">${tr("aula.tplSections").replace("{secs}", String(secs)).replace("{acts}", String(acts)).replace("{format}", esc(tp.format))}</span>
          <details style="margin-top:8px"><summary style="cursor:pointer;font-size:12px;color:var(--otr-green-text);font-weight:600">${tr("aula.tplViewContent")}</summary><div style="margin-top:8px">${preview}</div></details>
          <button class="btn btn-soft btn-sm" data-tpl="${esc(tp.id)}" style="margin-top:10px;width:100%">${tr("aula.tplUse")}</button>
        </div>`;
      }).join("");
      scrim.innerHTML = `<div class="modal" role="dialog" style="max-width:680px"><div class="modal-head"><h3>${tr("aula.startTitle")}</h3></div><div class="modal-body"><div class="grid g-2" style="gap:10px;align-items:start">${blank}${cards}</div></div><div class="modal-foot"><button class="btn btn-ghost" data-x>${tr("aula.cancel")}</button></div></div>`;
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
    async function openCreateCourse(tpl?: any) {
      const fields: any[] = [
        { name: "name", label: tr("aula.courseFullName"), value: tpl ? tpl.name : "", ph: "Public Forum II", req: true },
        { name: "code", label: tr("aula.courseCode"), ph: "PF-201", req: true },
        { name: "format", label: tr("aula.courseFormat"), type: "select", value: tpl ? tpl.format : "Public Forum", options: [
          { value: "Public Forum", label: "Public Forum" }, { value: "Lincoln-Douglas", label: "Lincoln-Douglas" }, { value: "Parlamentario", label: "Parlamentario" }, { value: "Policy", label: "Policy" }, { value: "Oratoria", label: "Oratoria" }, { value: "Otro", label: tr("aula.formatOther") }] },
        { name: "modality", label: tr("aula.modality"), type: "select", value: "online", options: [
          { value: "online", label: tr("aula.modalityOnline") }, { value: "presencial", label: tr("aula.modalityPresential") }, { value: "híbrido", label: tr("aula.modalityHybrid") }] },
        { name: "capacity", label: tr("aula.capacityOpt"), ph: "20" },
        { name: "color", label: tr("aula.courseColor"), type: "select", value: "#171717", options: [
          { value: "#171717", label: tr("aula.colorNavy") }, { value: "#4D4D4D", label: tr("aula.colorGray") }, { value: "#F25623", label: tr("aula.colorSky") }, { value: "#8C8C8C", label: tr("aula.colorLightBlue") }, { value: "#C8401A", label: tr("aula.colorGreen") }] },
        { name: "next", label: tr("aula.nextTopicOpt"), ph: tr("aula.nextTopicPh") },
        { name: "summary", label: tr("aula.programSummary"), type: "textarea", value: tpl ? tpl.summary : "", ph: tr("aula.programSummaryPh") },
        { name: "published", label: tr("aula.status"), type: "select", value: "false", options: [
          { value: "false", label: tr("aula.statusDraft") }, { value: "true", label: tr("aula.statusPublished") }] },
      ];
      // [F6.3] Selector de coach dueño — SOLO ADMIN. Un profesor crea sus propios cursos (dueño =
      // él, sin selector). El admin elige a nombre de quién nace el curso; "A mi nombre" (value "")
      // conserva el comportamiento por defecto (dueño = admin). Los coaches se bajan on-demand.
      if (isAdmin) {
        const coaches = await loadAdminCoaches();
        fields.push({ name: "teacherId", label: tr("aula.courseOwner"), type: "select", value: "", options: [
          { value: "", label: tr("aula.courseOwnerSelf") },
          ...coaches.map((c) => ({ value: c.id, label: c.name })),
        ] });
      }
      formModal(tpl ? tr("aula.newCourseTpl").replace("{name}", tpl.name) : tr("aula.newCourse"), fields, async (v) => {
        v.published = v.published === "true";
        if (v.capacity === "") delete v.capacity;
        // teacherId vacío ("A mi nombre") o ausente → no se envía: el backend usa al creador.
        if (!v.teacherId) delete v.teacherId;
        const d = await api("/api/courses", v);
        const newId = d?.course?.id;
        if (tpl && newId) await applyTemplate(newId, tpl);
        else toast(tr("aula.courseCreated"), "ok");
        await refresh();
        // Flujo Moodle: entrar directo al constructor del curso recién creado.
        if (newId) { (window as any).__builderCourseId = newId; try { sessionStorage.setItem("otr_builder_course", newId); } catch {} renderApp("course-builder"); }
      });
    }
    // Duplicar (clonar) una actividad o sección orquestando los POST existentes.
    async function duplicateEntity(kind: string, id: string) {
      const tcs = (DB as any).teacherCourses || [];
      const dupLesson = async (moduleId: string, l: any) => {
        const ld = await api("/api/lessons", { moduleId, title: l.title + tr("aula.copySuffix"), type: l.type, dur: l.dur, contentHtml: l.contentHtml, videoKind: l.videoKind, videoSrc: l.videoSrc, dueAt: l.dueAt, submitKinds: l.submitKinds, maxPoints: l.maxPoints });
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
          await dupLesson(moduleId, found); toast(tr("aula.lessonDuplicated"), "ok");
        } else if (kind === "module") {
          let courseId: any = null, mod: any = null;
          for (const c of tcs) for (const m of c.modules) if (m.id === id) { courseId = c.id; mod = m; }
          if (!mod) return;
          const md = await api("/api/modules", { courseId, title: mod.title + tr("aula.copySuffix") });
          const newMod = md?.module?.id;
          if (newMod) for (const l of (mod.lessons || [])) await dupLesson(newMod, l);
          toast(tr("aula.moduleDuplicated"), "ok");
        }
        await refresh();
      } catch (err: any) { toast(err?.message || tr("aula.cantDuplicate"), "danger"); }
    }
    function openCreateModule(courseId?: string) {
      const courses = DB.manage?.courses || [];
      if (!courses.length) { toast(tr("aula.createCourseFirst"), "warn"); return; }
      formModal(tr("aula.newModule"), [
        { name: "courseId", label: tr("aula.course"), type: "select", value: courseId || courses[0]?.id, options: courses.map((c: any) => ({ value: c.id, label: `${c.code} · ${c.name}` })) },
        { name: "title", label: tr("aula.moduleTitle"), ph: tr("aula.moduleTitlePh"), req: true },
      ], async (v) => { await api("/api/modules", v); toast(tr("aula.moduleCreated"), "ok"); await refresh(); });
    }
    const LESSON_TYPES = [
      { value: "lesson", label: tr("aula.typeLesson") }, { value: "video", label: tr("aula.typeVideo") }, { value: "quiz", label: tr("aula.typeQuiz") },
      { value: "assign", label: tr("aula.typeAssign") }, { value: "mic", label: tr("aula.typeMic") }, { value: "file", label: tr("aula.typeFile") }];
    // Presets de tipos de entrega permitidos para tareas (apartado de entrega).
    const SUBMIT_KIND_OPTS = [
      { value: "", label: tr("aula.submitAll") },
      { value: "file", label: tr("aula.submitFile") },
      { value: "text", label: tr("aula.submitText") },
      { value: "audio", label: tr("aula.submitAudio") },
      { value: "video", label: tr("aula.submitVideo") },
      { value: "file,text", label: tr("aula.submitFileText") },
    ];
    // presetType: cuando viene del Activity Chooser, el tipo ya está elegido → se oculta
    // el select de tipo y se envía ese type. Sin preset, el formulario lo deja elegir.
    function openCreateLesson(moduleId?: string, presetType?: string) {
      const courses = DB.manage?.courses || [];
      const modules = DB.manage?.modules || [];
      if (!modules.length) { toast(tr("aula.createSectionFirst"), "warn"); return; }
      const cmap: any = Object.fromEntries(courses.map((c: any) => [c.id, c.code]));
      const typeLabel = (LESSON_TYPES.find((t) => t.value === presetType)?.label) || tr("aula.typeActivity");
      const fields: any[] = [
        { name: "moduleId", label: tr("aula.section"), type: "select", value: moduleId || modules[0]?.id, options: modules.map((m: any) => ({ value: m.id, label: `${cmap[m.courseId] || ""} · ${m.title}` })) },
      ];
      if (!presetType) fields.push({ name: "type", label: tr("aula.type"), type: "select", options: LESSON_TYPES });
      fields.push({ name: "title", label: tr("aula.title"), ph: tr("aula.titlePh"), req: true });
      fields.push({ name: "dur", label: tr("aula.durationOpt"), ph: tr("aula.durationPh") });
      fields.push({ name: "videoKind", label: tr("aula.video"), type: "select", value: "none", options: [
        { value: "none", label: tr("aula.videoNone") }, { value: "youtube", label: tr("aula.videoYoutube") }, { value: "cloudflare", label: tr("aula.videoCloudflare") }] });
      fields.push({ name: "videoSrc", label: tr("aula.videoSrc"), ph: tr("aula.videoSrcPh") });
      fields.push({ name: "contentHtml", label: presetType === "assign" || presetType === "mic" ? tr("aula.instructionsForStudent") : tr("aula.activityContent"), type: "richtext", ph: tr("aula.contentPh") });
      if (presetType === "assign" || presetType === "mic") {
        fields.push({ name: "dueAt", label: tr("aula.dueDateOpt"), type: "date" });
        fields.push({ name: "submitKinds", label: tr("aula.allowedSubmitKinds"), type: "select", value: "", options: SUBMIT_KIND_OPTS });
        fields.push({ name: "maxPoints", label: tr("aula.maxPointsOpt"), type: "number", ph: "100" });
      }
      formModal(presetType ? tr("aula.newActivityType").replace("{type}", typeLabel) : tr("aula.newLessonContent"), fields, async (v) => {
        const d = await api("/api/lessons", { ...v, type: presetType || v.type });
        toast(tr("aula.activityCreated"), "ok");
        await refresh();
        // Si es un examen, abrir el constructor de preguntas directo (flujo redondo estilo Moodle).
        const created = d?.lesson;
        if (created && (presetType || v.type) === "quiz" && (window as any).otrOpenQuizBuilder) (window as any).otrOpenQuizBuilder(created.id, created.title);
      });
    }
    // Activity chooser estilo Moodle: grid de tipos con icono + descripción.
    function openActivityChooser(moduleId: string) {
      const ITEMS = [
        { type: "lesson", label: tr("aula.chooserLesson"), desc: tr("aula.chooserLessonDesc"), ic: IC.book },
        { type: "video", label: tr("aula.chooserVideo"), desc: tr("aula.chooserVideoDesc"), ic: IC.play },
        { type: "quiz", label: tr("aula.chooserQuiz"), desc: tr("aula.chooserQuizDesc"), ic: IC.doc },
        { type: "assign", label: tr("aula.chooserAssign"), desc: tr("aula.chooserAssignDesc"), ic: IC.pencil },
        { type: "mic", label: tr("aula.chooserMic"), desc: tr("aula.chooserMicDesc"), ic: IC.mic },
        { type: "file", label: tr("aula.chooserFile"), desc: tr("aula.chooserFileDesc"), ic: IC.file },
      ];
      const scrim = document.createElement("div"); scrim.className = "modal-scrim";
      const cards = ITEMS.map((it) => `
        <button class="tile click" data-pick="${it.type}" style="text-align:left;padding:13px;display:flex;gap:11px;align-items:flex-start;cursor:pointer;border:1px solid var(--border);background:var(--surface)">
          <span style="display:flex;width:22px;height:22px;color:var(--otr-sky-lo);flex:none;margin-top:1px">${it.ic}</span>
          <span style="min-width:0"><b style="font-size:13.5px;display:block">${it.label}</b><span class="faint" style="font-size:12px;line-height:1.4;display:block;margin-top:2px">${it.desc}</span></span>
        </button>`).join("");
      scrim.innerHTML = `<div class="modal" role="dialog" style="max-width:560px"><div class="modal-head"><h3>${tr("aula.addActivityOrResource")}</h3></div><div class="modal-body"><div class="grid g-2" style="gap:10px">${cards}</div></div><div class="modal-foot"><button class="btn btn-ghost" data-x>${tr("aula.cancel")}</button></div></div>`;
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
      const prereqOptions = [{ value: "", label: tr("aula.prereqNone") }, ...courseLessons.filter((x: any) => x.id !== id).map((x: any) => ({ value: x.id, label: x.title }))];
      const efields: any[] = [
        { name: "title", label: tr("aula.title"), value: l.title },
        { name: "type", label: tr("aula.type"), type: "select", value: l.type || "lesson", options: LESSON_TYPES },
        { name: "dur", label: tr("aula.durationOpt"), value: l.dur || "", ph: tr("aula.durationPh") },
        { name: "releaseAfterId", label: tr("aula.prereq"), type: "select", value: l.releaseAfterId || "", options: prereqOptions },
        { name: "videoKind", label: tr("aula.video"), type: "select", value: l.videoKind || "none", options: [
          { value: "none", label: tr("aula.videoNone") }, { value: "youtube", label: tr("aula.videoYoutube") }, { value: "cloudflare", label: tr("aula.videoCloudflare") }] },
        { name: "videoSrc", label: tr("aula.videoSrc"), value: l.videoSrc || "" },
        { name: "contentHtml", label: tr("aula.activityContent"), type: "richtext", value: l.contentHtml || "" },
      ];
      if (l.type === "assign" || l.type === "mic") {
        efields.push({ name: "dueAt", label: tr("aula.dueDateOpt"), type: "date", value: l.dueAt ? String(l.dueAt).slice(0, 10) : "" });
        efields.push({ name: "submitKinds", label: tr("aula.allowedSubmitKinds"), type: "select", value: l.submitKinds || "", options: SUBMIT_KIND_OPTS });
        efields.push({ name: "maxPoints", label: tr("aula.maxPointsOpt"), type: "number", value: l.maxPoints != null ? l.maxPoints : "" });
      }
      formModal(tr("aula.editActivity"), efields, async (v) => { await api(`/api/lessons/${id}`, v, "PATCH"); toast(tr("aula.activityUpdated"), "ok"); await refresh(); });
    }
    function openEditModule(id: string, title: string) {
      formModal(tr("aula.editModule"), [
        { name: "title", label: tr("aula.moduleTitle"), value: title },
      ], async (v) => { await api(`/api/modules/${id}`, v, "PATCH"); toast(tr("aula.moduleUpdated"), "ok"); await refresh(); });
    }
    function openCreateMenu() {
      const scrim = document.createElement("div"); scrim.className = "modal-scrim";
      scrim.innerHTML = `<div class="modal" role="dialog"><div class="modal-head"><h3>${tr("aula.create")}</h3></div><div class="modal-body"><div class="stack" style="gap:8px">
        <button class="btn btn-ghost btn-block" data-c="course">${IC.book} ${tr("aula.newCourse")}</button>
        <button class="btn btn-ghost btn-block" data-c="module">${IC.grid} ${tr("aula.newModule")}</button>
        <button class="btn btn-ghost btn-block" data-c="lesson">${IC.doc} ${tr("aula.newLessonContent")}</button>
      </div></div><div class="modal-foot"><button class="btn btn-ghost" data-x>${tr("aula.close")}</button></div></div>`;
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
        toast(tr("aula.enrolled"), "ok");
        await refresh();
        // [LEARN-2] Entrar directo al curso recién inscrito (antes solo refrescaba el catálogo
        // y el alumno se quedaba ahí sin un siguiente paso claro). __course indexa por code.
        const enrolled = ((DB as any).coursesContent || []).find((c: any) => c.dbId === courseId || c.id === courseId);
        if (enrolled) { (window as any).__course = enrolled.code; renderApp("course"); }
      } catch (e: any) { toast(e.message || tr("err.generic"), "danger"); }
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
        toast(tr("aula.certIssued"), "ok");
        await refresh();
        renderApp("certificate");
      } catch (e: any) { toast(e.message || tr("aula.programNotCompleted"), "danger"); }
    }
    // [COACH-05] Publicar / pasar a borrador un curso sin abrir el modal de Configuración.
    // PATCH /api/courses/[id] {published} (allowlisted + teacherOwnsCourse). Publicar lo hace
    // visible en el catálogo del alumno — antes el único camino era el formulario completo.
    async function doPublishCourse(id: string, publish: boolean) {
      try {
        await api(`/api/courses/${encodeURIComponent(id)}`, { published: publish }, "PATCH");
        toast(publish ? tr("aula.coursePublished") : tr("aula.courseToDraft"), "ok");
        await refresh();
      } catch (e: any) { toast(e.message || tr("err.generic"), "danger"); }
    }
    function openNewThread() {
      formModal(tr("aula.newThread"), [
        { name: "title", label: tr("aula.title"), ph: tr("aula.threadTitlePh") },
        { name: "tag", label: tr("aula.tag"), ph: tr("aula.tagPh") },
        { name: "excerpt", label: tr("aula.message"), ph: tr("aula.messagePh") },
      ], async (v) => { await api("/api/forum/threads", v); toast(tr("aula.threadCreated"), "ok"); await refresh(); });
    }
    function openNewResource() {
      formModal(tr("aula.newResource"), [
        { name: "title", label: tr("aula.title"), ph: tr("aula.resourceTitlePh") },
        { name: "kind", label: tr("aula.type"), type: "select", value: "brief", options: [
          { value: "brief", label: tr("aula.resourceKindBrief") }, { value: "template", label: tr("aula.resourceKindTemplate") }, { value: "drill", label: tr("aula.resourceKindDrill") },
          { value: "recording", label: tr("aula.resourceKindRecording") }, { value: "link", label: tr("aula.resourceKindLink") }] },
        { name: "tag", label: tr("aula.tag"), ph: tr("aula.tagPh") },
        { name: "format", label: tr("aula.format"), ph: tr("aula.formatPfPh") },
        { name: "url", label: tr("aula.urlOpt"), ph: "https://…" },
        { name: "contentHtml", label: tr("aula.content"), type: "textarea", ph: tr("aula.resourceContentPh") },
        { name: "gated", label: tr("aula.access"), type: "select", value: "no", options: [
          { value: "no", label: tr("aula.accessPublic") }, { value: "yes", label: tr("aula.accessEnrolledOnly") }] },
      ], async (v) => {
        await api("/api/resources", { ...v, gated: v.gated === "yes" });
        toast(tr("aula.resourceCreated"), "ok"); await refresh();
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
          return `<div style="margin:8px 0"><a class="btn btn-ghost btn-sm" href="${esc(s.fileUrl)}" target="_blank" rel="noopener" download>${IC.doc} ${tr("aula.download")} ${esc(s.fileName || tr("aula.file"))}</a></div>`;
        }
        if (s.textBody) {
          return `<div style="margin:8px 0;padding:10px 12px;border:1px solid var(--border);border-radius:8px;background:var(--surface-2);font-size:13px;line-height:1.55;white-space:pre-wrap;max-height:220px;overflow:auto">${esc(s.textBody)}</div>`;
        }
        return `<div class="faint" style="font-size:12px;margin:6px 0">${tr("aula.noContentAttached")}</div>`;
      };
      const rows = subs.length ? subs.map((s: any) => `
        <div class="card card-pad" data-sub="${s.id}" style="margin-bottom:12px">
          <div class="row between vcenter" style="gap:10px">
            <label class="row vcenter" style="gap:10px;min-width:0;cursor:pointer"><input type="checkbox" class="gsub-check" style="flex:none;width:16px;height:16px"/><span style="min-width:0"><span style="display:block;font-weight:600;font-size:13.5px">${esc(s.userName)}</span><span class="faint" style="display:block;font-size:12px">${esc(s.activity)} · ${s.status === "GRADED" ? tr("aula.graded") + (s.grade ?? "—") : tr("aula.pending")}</span></span></label>
            <span class="badge" style="height:18px;font-size:10px;flex:none">${esc(s.kind || tr("aula.submissionDefault"))}</span>
          </div>
          ${subContent(s)}
          <div class="field" style="margin:8px 0 0">
            <label class="label">${tr("aula.feedback")}</label>
            <textarea class="input gsub-feedback" rows="3" placeholder="${tr("aula.feedbackPh")}" style="resize:vertical;min-height:64px;font-family:inherit;line-height:1.5">${s.feedback ? esc(s.feedback) : ""}</textarea>
          </div>
          <div class="row between vcenter" style="gap:10px;margin-top:8px">
            <div class="field" style="margin:0"><label class="label">${tr("aula.grade0100")}</label><input class="input gsub-grade" type="number" min="0" max="100" style="width:96px" placeholder="0-100" value="${s.grade ?? ""}"/></div>
            <button class="btn btn-primary btn-sm gsub-save" style="align-self:flex-end">${tr("aula.save")}</button>
          </div>
        </div>`).join("") : `<div class="empty" style="padding:20px"><b>${tr("aula.noSubmissionsTitle")}</b><p>${tr("aula.noSubmissionsBody")}</p></div>`;
      // [PRD-02] Calificación en lote: selección múltiple + nota/feedback comunes aplicados
      // a las seleccionadas (calificar 25 grabaciones del mismo drill deja de ser 25 ciclos).
      const batchBar = subs.length > 1 ? `
        <div class="card card-pad" style="margin-bottom:14px;background:var(--bg-sunken)">
          <div class="row vcenter" style="gap:8px;flex-wrap:wrap">
            <label class="row vcenter" style="gap:6px;font-size:12.5px;cursor:pointer"><input type="checkbox" id="gsub-all" style="width:16px;height:16px"/> ${tr("aula.selectAll")}</label>
            <span style="flex:1"></span>
            <input class="input" id="gsub-bgrade" type="number" min="0" max="100" placeholder="${tr("aula.gradeShort")}" style="width:84px"/>
            <input class="input" id="gsub-bfeedback" placeholder="${tr("aula.commonFeedbackPh")}" style="flex:1;min-width:150px"/>
            <button class="btn btn-primary btn-sm" id="gsub-bapply">${tr("aula.applyToSelected")}</button>
          </div>
        </div>` : "";
      scrim.innerHTML = `<div class="modal" role="dialog" style="max-width:560px"><div class="modal-head"><h3>${tr("aula.gradeSubmissions")}</h3></div><div class="modal-body">${batchBar}${rows}</div><div class="modal-foot"><button class="btn btn-ghost" data-x>${tr("aula.close")}</button></div></div>`;
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
          if (!checked.length) { toast(tr("aula.selectAtLeastOne"), "warn"); return; }
          if (!bgrade && !bfeedback) { toast(tr("aula.putGradeOrFeedback"), "warn"); return; }
          (bapply as any).disabled = true; bapply.textContent = tr("aula.applying");
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
          (bapply as any).disabled = false; bapply.textContent = tr("aula.applyToSelected");
          toast((okN === 1 ? tr("aula.gradedCountOne") : tr("aula.gradedCountMany")).replace("{n}", String(okN)), okN ? "ok" : "danger");
          return;
        }
        const save = e.target.closest(".gsub-save");
        if (save) {
          const row = save.closest("[data-sub]"); const id = row.getAttribute("data-sub");
          const grade = row.querySelector(".gsub-grade").value;
          const feedback = row.querySelector(".gsub-feedback")?.value || "";
          save.textContent = "…";
          try { await api(`/api/submissions/${id}`, { grade, feedback }, "PATCH"); save.innerHTML = `<span style="display:inline-flex;width:16px;height:16px">${IC.check}</span>`; gdirty = true; toast(tr("aula.gradeSaved"), "ok"); }
          catch (err: any) { save.textContent = tr("aula.save"); toast(err.message || tr("err.generic"), "danger"); }
        }
      });
    }

    function openEditCourse(id: string, name: string) {
      let c: any = null;
      for (const tc of ((DB as any).teacherCourses || [])) if (tc.id === id) c = tc;
      formModal(tr("aula.editCourse"), [
        { name: "name", label: tr("aula.courseName"), value: name },
        { name: "format", label: tr("aula.format"), value: c?.format || "", ph: tr("aula.formatPfPh") },
        { name: "modality", label: tr("aula.modality"), type: "select", value: c?.modality || "online", options: [
          { value: "online", label: tr("aula.modalityOnline") }, { value: "presencial", label: tr("aula.modalityPresential") }, { value: "híbrido", label: tr("aula.modalityHybrid") }] },
        { name: "capacity", label: tr("aula.capacity"), value: c?.capacity || "", ph: "20" },
        { name: "summary", label: tr("aula.programSummary"), type: "textarea", value: c?.summary || "", ph: tr("aula.programSummaryPh") },
        // [EPIC-5] Video de bienvenida del curso (lo ve el alumno en la cabecera del programa).
        // Mismo patrón que el video de lección: proveedor + fuente (ID/URL).
        { name: "welcomeVideoKind", label: tr("aula.welcomeVideo"), type: "select", value: c?.welcomeVideoKind || "none", options: [
          { value: "none", label: tr("aula.videoNone") }, { value: "youtube", label: "YouTube" }, { value: "cloudflare", label: tr("aula.videoCloudflareStream") }] },
        { name: "welcomeVideoSrc", label: tr("aula.welcomeVideoSrc"), value: c?.welcomeVideoSrc || "", ph: tr("aula.welcomeVideoSrcPh") },
        { name: "layout", label: tr("aula.layout"), type: "select", value: c?.layout || "modules", options: [
          { value: "modules", label: tr("aula.layoutModules") }, { value: "grid", label: tr("aula.layoutGrid") }, { value: "single", label: tr("aula.layoutSingle") }] },
        { name: "published", label: tr("aula.status"), type: "select", value: (c?.published === false ? "false" : "true"), options: [
          { value: "true", label: tr("aula.statusPublished") }, { value: "false", label: tr("aula.statusDraft") }] },
      ], async (v) => { if (v.published !== undefined) v.published = v.published === "true"; await api(`/api/courses/${id}`, v, "PATCH"); toast(tr("aula.courseUpdated"), "ok"); await refresh(); });
    }

    function openEditProfile() {
      const m: any = (DB as any).me || {};
      const fields: any[] = [
        { name: "name", label: tr("aula.fullName"), value: user.name },
        { name: "headline", label: tr("aula.headline"), value: m.headline || "", ph: tr("aula.headlinePh") },
        { name: "location", label: tr("aula.location"), value: m.location || "", ph: tr("aula.locationPh") },
        { name: "bio", label: tr("aula.aboutMe"), type: "textarea", value: m.bio || "", ph: tr("aula.aboutMePh") },
      ];
      if (isTeacher) {
        fields.push({ name: "teachingStyle", label: tr("aula.teachingStyle"), type: "textarea", value: m.teachingStyle || "", ph: tr("aula.teachingStylePh") });
        fields.push({ name: "formats", label: tr("aula.formats"), value: m.formats || "", ph: tr("aula.formatsPh") });
      }
      fields.push({ name: "currentPassword", label: tr("aula.currentPassword"), ph: tr("aula.optional") });
      fields.push({ name: "newPassword", label: tr("aula.newPassword"), ph: tr("aula.optional") });
      formModal(tr("aula.editProfile"), fields, async (v) => { await api("/api/profile", v, "PATCH"); toast(tr("aula.profileUpdated"), "ok"); await refresh(); });
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
      formModal(tr("aula.coachMarketProfile"), [
        { name: "active", label: tr("aula.marketVisibility"), type: "select", value: cp.active === false ? "off" : "on", options: [
          { value: "on", label: tr("aula.marketVisibleOn") }, { value: "off", label: tr("aula.marketVisibleOff") }] },
        { name: "hourlyUsd", label: tr("aula.hourlyRate"), value: centsToUsd(cp.hourlyCents), ph: "45" },
        { name: "languages", label: tr("aula.languages"), value: cp.languages || "", ph: "es,en" },
        { name: "specialties", label: tr("aula.specialties"), value: cp.specialties || "", ph: tr("aula.specialtiesPh") },
        { name: "responseTime", label: tr("aula.responseTime"), value: cp.responseTime || "", ph: tr("aula.responseTimePh") },
        { name: "introVideoUrl", label: tr("aula.introVideo"), value: cp.introVideoUrl || "", ph: "https://youtu.be/…" },
        { name: "credentials", label: tr("aula.credentials"), type: "textarea", value: cp.credentials || "", ph: tr("aula.credentialsPh") },
        { name: "cancelPolicy", label: tr("aula.cancelPolicy"), type: "textarea", value: cp.cancelPolicy || "", ph: tr("aula.cancelPolicyPh") },
        { name: "pkgSingle", label: tr("aula.priceSingle"), value: pkgUsd(1), ph: "45" },
        { name: "pkg5", label: tr("aula.price5"), value: pkgUsd(5), ph: "200" },
        { name: "pkg10", label: tr("aula.price10"), value: pkgUsd(10), ph: "380" },
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
        toast(tr("aula.coachProfileUpdated"), "ok");
        await refresh();
      });
    }

    const SKILLS = ["Confianza", "Estructura", "Evidencia", "Refutación", "Cross-ex", "Delivery"];
    // El VALOR de cada skill es dato del backend (clave de scores) y NO se traduce; solo su etiqueta visible.
    const SKILL_LABELS: any = { "Confianza": "aula.skillConfidence", "Estructura": "aula.skillStructure", "Evidencia": "aula.skillEvidence", "Refutación": "aula.skillRebuttal", "Cross-ex": "aula.skillCrossex", "Delivery": "aula.skillDelivery" };
    async function openEvalSkills(userId: string, name: string) {
      const prefill: any = {};
      try {
        const d = await api("/api/skills?userId=" + encodeURIComponent(userId), null, "GET");
        for (const s of (d.skills || [])) prefill[s.skill] = s.score;
      } catch {}
      formModal(tr("aula.evaluateName").replace("{name}", esc(name)), SKILLS.map((sk) => ({
        name: sk, label: tr(SKILL_LABELS[sk] || sk), type: "number", value: prefill[sk] != null ? prefill[sk] : 0,
      })), async (v) => {
        const scores: any = {};
        for (const sk of SKILLS) scores[sk] = Math.max(0, Math.min(100, Number(v[sk]) || 0));
        await api("/api/skills", { userId, scores });
        toast(tr("aula.skillsSaved"), "ok");
        await refresh();
      });
    }

    async function leaveReview(courseId: string) {
      const sel = root.querySelector(".star.on") as HTMLElement | null;
      const rating = sel ? Number(sel.getAttribute("data-rating")) : 0;
      const bodyEl = root.querySelector("#review-body") as HTMLTextAreaElement | null;
      const body = bodyEl ? bodyEl.value : "";
      if (!rating) { toast(tr("aula.selectRating"), "warn"); return; }
      try {
        await api("/api/reviews", { courseId, rating, body });
        toast(tr("aula.reviewPublished"), "ok");
        await refresh();
      } catch (e: any) { toast(e.message || tr("err.generic"), "danger"); }
    }

    let notifOpen = false;
    function toggleNotif(force?: boolean) {
      notifOpen = force != null ? force : !notifOpen;
      document.getElementById("notif-panel")?.remove();
      if (!notifOpen) return;
      const panel = document.createElement("div"); panel.id = "notif-panel"; panel.className = "notif-panel";
      panel.innerHTML = `<div class="notif-head"><b>${tr("aula.notifications")}</b><button class="btn btn-quiet btn-sm" id="notif-read">${tr("aula.markRead")}</button></div><div id="notif-list">${(DB.notifications || []).map((n: any) => `<div class="notif-item ${n.unread ? "unread" : ""}"><div class="notif-ic ${n.tone}">${IC[n.ic]}</div><div class="nt-main"><div class="nt-t">${n.t}</div><div class="nt-d">${n.d}</div><div class="nt-w">${n.when}</div></div></div>`).join("")}</div><div class="notif-foot"><a href="#" onclick="return false">${tr("aula.viewAll")}</a></div>`;
      root.querySelector(".main")?.appendChild(panel);
      enter(panel, 6);
      panel.querySelector("#notif-read")?.addEventListener("click", () => {
        api("/api/notifications", null, "PATCH")
          .then(() => {
            // Actualización local (sin re-fetch de /api/app-data): marca todo como leído,
            // cierra el panel y repinta la ruta actual con el render existente.
            (DB.notifications || []).forEach((n: any) => { n.unread = false; });
            toast(tr("aula.notifsMarkedRead"), "ok");
            toggleNotif(false);
            renderApp(currentRoute, { keepScroll: true });
          })
          .catch((err: any) => toast(err.message || tr("err.generic"), "danger"));
      });
    }

    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("#create-menu")) { e.stopPropagation(); openCreateMenu(); return; }

      // [UI-NAV N2] Menú de cuenta del chip de usuario. Se cierra al elegir (el data-go
      // navega y el shell se repinta) o al clicar fuera — ver el else de más abajo.
      const userMenuBtn = t.closest("[data-user-menu]") as HTMLElement | null;
      if (userMenuBtn) {
        e.preventDefault();
        const menu = document.getElementById("sb-usermenu");
        if (!menu) return;
        const open = userMenuBtn.getAttribute("aria-expanded") !== "true";
        userMenuBtn.setAttribute("aria-expanded", String(open));
        menu.hidden = !open;
        return;
      }
      if (!t.closest("#sb-usermenu")) {
        const openMenu = document.getElementById("sb-usermenu");
        if (openMenu && !openMenu.hidden) {
          openMenu.hidden = true;
          document.querySelector("[data-user-menu]")?.setAttribute("aria-expanded", "false");
        }
      }

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
            toast(done ? tr("aula.lessonMarkedDone") : tr("aula.lessonUnmarked"), "ok");
            renderApp(currentRoute, { keepScroll: true });
          })
          .catch((err: any) => toast(err.message || tr("err.generic"), "danger"));
        return;
      }
      const evalEl = t.closest('[data-action="eval-skills"]') as HTMLElement | null;
      if (evalEl) { e.preventDefault(); openEvalSkills(evalEl.dataset.user || "", evalEl.dataset.name || ""); return; }
      const delEl = t.closest("[data-del]") as HTMLElement | null;
      if (delEl) {
        e.preventDefault();
        const [kind, id] = delEl.getAttribute("data-del")!.split(":");
        const msg = kind === "course"
          ? tr("aula.confirmDeleteCourse")
          : kind === "module"
          ? tr("aula.confirmDeleteModule")
          : tr("aula.confirmDeleteLesson");
        if (!window.confirm(msg)) return;
        const url = kind === "course" ? `/api/courses/${id}` : kind === "module" ? `/api/modules/${id}` : `/api/lessons/${id}`;
        api(url, null, "DELETE").then(() => { toast(tr("aula.deleted"), "ok"); refresh(); }).catch((err: any) => toast(err.message, "danger"));
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
        api(url, { hidden: !cur }, "PATCH").then(() => { toast(!cur ? tr("aula.hiddenFromStudent") : tr("aula.visibleToStudent"), "ok"); return refresh(); }).catch((err: any) => toast(err.message || tr("err.generic"), "danger"));
        return;
      }
      if (t.closest('[data-action="edit-profile"]')) { e.preventDefault(); openEditProfile(); return; }
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
      if (acc) { const open = acc.closest(".module")?.classList.toggle("open"); acc.setAttribute("aria-expanded", open ? "true" : "false"); return; }
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
