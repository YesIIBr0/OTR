// @ts-nocheck
/* OTR · Admin → Gestión de usuarios (PRD §3.3). Pantalla role-scoped ADMIN.
   No lee DB.* : en mount hace window.api('/api/admin/users','GET') y pinta la lista
   con búsqueda. Acciones por usuario: cambiar ROL (select), VERIFICAR coach (toggle)
   y SUSPENDER/REACTIVAR (toggle) → PATCH /api/admin/users → mutación local + toast +
   re-render. Resuelve el hueco de que crear/verificar coaches y nombrar admins antes
   solo se podía a mano en la base de datos.

   Patrón de la casa: render(state)->string + mount(root,state); IC.* iconos,
   esc() para texto del usuario, navy + sky, fade-up; nada de emojis.
   Cliente vía globales de Aula.tsx: api(url,body,method), toast(). */
import { C } from "./components";
import { IC } from "./icons";
import { esc } from "./esc";
// [ADM] La lista de usuarios sigue viniendo de /api/admin/users; la admisión NO. Viaja en el
// payload del Aula (DB.adminAdmissions, solo para ADMIN) porque es dato derivado de lectura,
// no una entidad que esta pantalla mute — y así no hay que ampliar el endpoint de usuarios
// con datos de menores que la mayoría de sus consumidores no necesita.
import { DB } from "./data";
import { t, registerDict } from "./i18n";
// [F4.1] Registra el diccionario de esta pantalla en SU chunk (fuera del inicial): au.*. Ver app/lib/i18n.ts.
import { dict as d_au } from "./i18n-keys/au";
registerDict(d_au);

export const S = {};

/* ---------------- estado del cliente (window.__adminUsers) ---------------- */
function usersState() {
  const w = window as any;
  if (!w.__adminUsers) w.__adminUsers = { loaded: false, loading: false, users: [], total: 0, q: "", role: "", counts: null };
  return w.__adminUsers;
}

/* ---------------- helpers ---------------- */
const ROLE_OPTS = [
  { v: "STUDENT", l: t("au.roleStudent") },
  { v: "PARENT", l: t("au.roleParent") },
  { v: "TEACHER", l: t("au.roleTeacher") },
  { v: "ADMIN", l: t("au.roleAdmin") },
];
// COACH es un rol legacy (unificado en TEACHER): ya no se ofrece en el selector,
// pero se conserva su etiqueta para que las filas COACH existentes rendericen bien.
const ROLE_LABEL = { ...Object.fromEntries(ROLE_OPTS.map((o) => [o.v, o.l])), COACH: t("au.roleCoach") };
const isCoachRole = (r) => r === "TEACHER" || r === "COACH";

const ini = (name) =>
  (String(name || "?").split(" ").map((w) => w[0]).join("") || "?").slice(0, 2).toUpperCase();

// [GOAL-E4 revisión · minor 4] Interpolación de {name} SIN `String.replace`: el segundo
// argumento de replace interpreta los patrones `$&`, "$`", `$'` y `$1`, así que un nombre con
// `$&` (o el `&amp;` que deja `esc()` en cualquier nombre con "&") se corrompía —
// "AC&DC" → esc → "AC&amp;DC" → replace → "Suspender a AC{name}amp;DC". split+join no
// interpreta nada. Reemplaza TODAS las apariciones, igual que hacía replace con un string.
const withName = (tpl, name) => String(tpl).split("{name}").join(String(name));

// [GOAL-E4 revisión · Important-1] Nombre accesible EN REPOSO de un botón que muta su propio
// texto (y su aria-label) mientras trabaja. Se memoriza en el dataset la PRIMERA vez, así que
// da igual cuántos ciclos armar→fallar→rearmar pase el botón: restaurar siempre devuelve el
// label con la persona, nunca un estado intermedio. Vale para cualquier acción de la fila.
function restLabelOf(btn) {
  if (btn.dataset.restLabel == null) btn.dataset.restLabel = btn.getAttribute("aria-label") || "";
  return btn.dataset.restLabel;
}

// [MOCKUP 2026-08] Chips del kit (r3, versalitas 10/800): admin en negro sólido, coach en
// el tinte frío del kit (chip--info) y el resto en outline neutro.
function roleBadge(role) {
  const r = String(role || "").toUpperCase();
  if (r === "ADMIN") return `<span class="chip chip--black">${esc(ROLE_LABEL[r] || r)}</span>`;
  if (isCoachRole(r)) return `<span class="chip chip--info">${esc(ROLE_LABEL[r] || r)}</span>`;
  return `<span class="chip chip--outline">${esc(ROLE_LABEL[r] || r || "—")}</span>`;
}

/* ---------------- [ADM] admisión y consentimiento ----------------
   Qué resuelve: operar legalmente con menores exige poder responder "¿quién tiene el
   consentimiento firmado?" sin abrir la base de datos. El caso crítico —y el único que esta
   pantalla destaca— es MENOR con el formulario enviado y SIN la firma de su tutor.

   Qué NO se pinta, y tampoco viaja en el payload (ver ADMISSION_SELECT en queries.ts):
   el nombre, la cédula, la relación, el teléfono y el correo del tutor; la firma; el texto
   del consentimiento aceptado (su evidencia literal vive en AdmissionConsent y se pide por la
   vía de auditoría, no por una pantalla); la fecha de nacimiento, el colegio, el programa,
   los días preferidos y la URL del vídeo DPP del alumno. Aquí solo hay progreso y BOOLEANOS. */
const ADM_STEP_KEYS = ["au.admStepForm", "au.admStepCall", "au.admStepCommunity", "au.admStepVideo"];
const admStepLabel = (n) => t(ADM_STEP_KEYS[Math.min(Math.max(Number(n) || 1, 1), 4) - 1]);
const admData = () => (DB.adminAdmissions && Array.isArray(DB.adminAdmissions.rows)) ? DB.adminAdmissions : null;
// Índice por usuario para poder anotar la fila de la lista sin recorrer el array por card.
function admByUser() {
  const w = window as any;
  const data = admData();
  if (!data) return null;
  if (!w.__admIndex || w.__admIndexSrc !== data.rows) {
    w.__admIndex = new Map(data.rows.map((r) => [r.id, r]));
    w.__admIndexSrc = data.rows;
  }
  return w.__admIndex;
}

/* Estado de consentimiento de UNA persona, en chips del kit: verde = firmado (completado),
   negro = falta la firma del tutor de un menor (el que hay que perseguir), outline = el
   formulario ni se ha enviado. Sin naranja: no es un estado "en vivo". */
function consentChips(r) {
  if (!r.consentData) return C.chip(t("au.admConsentNone"), "outline");
  const out = [C.chip(t("au.admConsentData"), "accent", { ic: "check" })];
  if (r.consentGuardian) out.push(C.chip(t("au.admConsentGuardian"), "accent", { ic: "check" }));
  else if (r.minor) out.push(C.chip(t("au.admConsentGuardianMissing"), "black"));
  return out.join(" ");
}

function admissionSection() {
  const data = admData();
  if (!data) return "";
  /* Orden de la lista = orden de urgencia, y NUNCA se esconde a nadie: primero los menores
     sin firma del tutor (lo que hay que perseguir), luego las admisiones a medias y al final
     las completas. Que las completas sigan en la lista es el punto: la pregunta que esta
     pantalla responde es "¿quién tiene el consentimiento firmado?", no solo "¿quién no?". */
  const rank = (r) => (r.consentPending ? 0 : !r.complete ? 1 : 2);
  const ordered = data.rows.slice().sort((a, b) => rank(a) - rank(b) || a.done - b.done);
  const pending = data.rows.filter((r) => r.consentPending);
  const incomplete = data.rows.filter((r) => !r.complete);
  // El título nombra LO QUE ENCABEZA la lista: sin firmas pendientes ni admisiones a medias,
  // la lista ya no es un pendiente sino el registro de consentimiento por alumno.
  const listTitle = pending.length ? t("au.admPendingTitle") : incomplete.length ? t("au.admInProgressTitle") : t("au.admAllTitle");
  const row = (r) => `
    <div class="evrow">
      <div class="date-box">${C.avatar(esc(ini(r.n)), { size: "sm" })}</div>
      <div class="ev-main">
        <div class="ev-title">${r.n}${r.minor ? ` <span class="faint" style="font-weight:600">· ${t("au.minorSuffix")}</span>` : ""}</div>
        <div class="ev-meta">${t("au.admStepOf").split("{done}").join(String(r.done)).split("{total}").join(String(r.total))}${r.complete ? "" : ` · ${t("au.admNextStep").split("{step}").join(admStepLabel(r.step))}`}</div>
      </div>
      <div class="ev-actions">${consentChips(r)}</div>
    </div>`;
  return `
  <div class="sec-title sec-title--sm"><h3>${t("au.admTitle")}</h3></div>
  <div class="grid g-4 fade-up" style="--d:2;margin-bottom:14px">
    <div class="tile">${C.kpi(t("au.admKpiTotal"), String(data.total), { ic: "users" })}</div>
    <div class="tile">${C.kpi(t("au.admKpiComplete"), String(data.complete), { ic: "check" })}</div>
    <div class="tile">${C.kpi(t("au.admKpiInProgress"), String(data.inProgress), { ic: "clock" })}</div>
    <div class="tile"${data.consentPending ? ' style="border-color:color-mix(in srgb,var(--danger) 32%,transparent);background:var(--danger-soft)"' : ""}>${C.kpi(t("au.admKpiConsentPending"), String(data.consentPending), { ic: "shield" })}</div>
  </div>
  <div class="card adj-list fade-up" style="--d:2;margin-bottom:18px">
    <div class="adj-head">${C.secTitle(listTitle, {
      sm: true,
      right: pending.length ? C.chip(String(pending.length), "black")
        : incomplete.length ? C.chip(String(incomplete.length), "black")
        : C.chip(t("au.admAllDoneTitle"), "accent", { ic: "check" }),
    })}</div>
    ${ordered.slice(0, 12).map(row).join("")}
    ${ordered.length ? "" : `<div class="empty"><div class="ill">${IC.checkCircle}</div><h4>${t("au.admAllDoneTitle")}</h4><p>${t("au.admAllDoneBody")}</p></div>`}
  </div>`;
}

/* ---------------- card de usuario ---------------- */
function userCard(u, d) {
  const role = String(u.role || "").toUpperCase();
  const verified = !!u.coachVerified;
  const suspended = !!u.suspended;
  const roleSelect = `
    <select class="select" data-user-role="${esc(u.id)}" style="height:32px;font-size:12.5px;max-width:180px">
      ${ROLE_OPTS.map((o) => `<option value="${o.v}" ${o.v === role ? "selected" : ""}>${o.l}</option>`).join("")}
    </select>`;
  const verifyBtn = isCoachRole(role)
    ? `<button class="btn btn--sm ${verified ? "btn-outline" : "btn-primary"}" data-user-verify="${esc(u.id)}" data-val="${verified ? "false" : "true"}">
         ${verified ? t("au.unverify") : t("au.verifyCoach")}
       </button>`
    : "";
  // [GOAL-E4 #5] Las dos acciones DESTRUCTIVAS se llamaban igual en las 12 filas ("Suspender",
  // "Borrar datos"): quien navega por botones oía doce veces lo mismo sin saber a qué cuenta
  // aplicaba — y son suspensión y borrado irreversible de datos personales. El nombre
  // accesible ahora incluye a la persona; el texto visible no cambia (la fila ya la nombra).
  const personName = esc(u.name || "");
  const suspendAria = withName(suspended ? t("au.reactivateAria") : t("au.suspendAria"), personName);
  const suspendBtn = `<button class="btn btn--sm ${suspended ? "btn-primary" : "btn-outline"}" data-user-suspend="${esc(u.id)}" data-val="${suspended ? "false" : "true"}" aria-label="${suspendAria}" style="${suspended ? "" : "color:var(--danger)"}">
        ${suspended ? t("au.reactivate") : t("au.suspend")}
      </button>`;
  // [R4] Derecho de supresión (Ley 172-13/COPPA): SOLO no-admins (el server re-valida las
  // guardas). Dos toques armados — es irreversible: anonimiza y purga datos personales.
  const eraseBtn = role === "ADMIN"
    ? ""
    : `<button class="btn btn-outline btn--sm" data-user-erase="${esc(u.id)}" aria-label="${withName(t("au.eraseAria"), personName)}" style="color:var(--danger)">${t("au.erase")}</button>`;

  return `
  <div class="card card-pad fade-up" style="--d:${d}" data-user-card="${esc(u.id)}">
    <div class="row between vcenter wrap" style="gap:10px">
      <div class="row vcenter" style="gap:10px;min-width:0;flex:1">
        ${C.avatar(esc(ini(u.name)), { size: "sm", bg: "var(--otr-navy)" })}
        <div style="min-width:0">
          <div class="row vcenter" style="gap:8px;flex-wrap:wrap">
            <b style="font-size:15px;font-weight:800;letter-spacing:-.02em">${esc(u.name)}</b>
            ${roleBadge(role)}
            ${isCoachRole(role) && verified ? `<span class="chip chip--accent">${IC.check} ${t("au.verifiedBadge")}</span>` : ""}
            ${suspended ? `<span class="chip chip--tint">${t("au.suspendedBadge")}</span>` : ""}
            ${/* [ADM] Estado de admisión de ESTA persona, para que el admin no tenga que
                  cruzar dos listas al buscar a alguien. Solo aparece si hay admisión. */""}
            ${(() => { const r = admByUser()?.get(u.id); if (!r) return "";
              return r.complete
                ? C.chip(t("au.admComplete"), "accent", { ic: "check" })
                : C.chip(t("au.admStepOf").split("{done}").join(String(r.done)).split("{total}").join(String(r.total)), "outline"); })()}
          </div>
          <div class="faint" style="font-size:12px;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(u.email)}${u.ageBand === "minor" ? " · " + t("au.minorSuffix") : ""}</div>
        </div>
      </div>
    </div>
    <div class="row vcenter wrap" style="gap:8px;margin-top:12px;padding-top:12px;border-top:1px solid var(--border)">
      <span class="lbl" style="align-self:center">${t("au.roleLabel")}</span>
      ${roleSelect}
      <span style="flex:1"></span>
      ${verifyBtn}
      ${suspendBtn}
      ${eraseBtn}
    </div>
  </div>`;
}

/* ---------------- body por estado ---------------- */
function viewBody() {
  const st = usersState();

  if (!st.loaded && st.loading) {
    return `
    <div class="card fade-up"><div class="empty">
      <div class="ill">${IC.users}</div>
      <h4>${t("au.loadingTitle")}</h4>
      <p>${t("au.loadingBody")}</p>
    </div></div>`;
  }

  const users = Array.isArray(st.users) ? st.users : [];
  if (!users.length) {
    return `
    <div class="card fade-up"><div class="empty">
      <div class="ill">${IC.users}</div>
      <h4>${st.q ? t("au.emptySearchTitle") : t("au.emptyTitle")}</h4>
      <p>${st.q ? t("au.emptySearchBody") : t("au.emptyBody")}</p>
    </div></div>`;
  }

  return `<div class="stack" style="gap:14px">${users.map((u, i) => userCard(u, Math.min(i, 6))).join("")}</div>`;
}

/* ================= PANTALLA ================= */
S.adminUsers = {
  render(state) {
    const st = usersState();
    const users = Array.isArray(st.users) ? st.users : [];
    // [ENT-02] KPIs desde counts GLOBALES del servidor (estables); fallback al array cargado.
    const c = st.counts || {};
    const kUsers = c.users != null ? c.users : (st.total || users.length);
    const kCoaches = c.coaches != null ? c.coaches : users.filter((u) => isCoachRole(String(u.role || "").toUpperCase())).length;
    const kAdmins = c.admins != null ? c.admins : users.filter((u) => String(u.role || "").toUpperCase() === "ADMIN").length;
    const kSusp = c.suspended != null ? c.suspended : users.filter((u) => u.suspended).length;

    // [ENT-04] Filtro por rol (la API ya soporta ?role=); reusa la capacidad del backend.
    const FILTERS = [
      { v: "", l: t("au.filterAll") }, { v: "STUDENT", l: t("au.filterStudents") }, { v: "TEACHER", l: t("au.filterCoaches") },
      { v: "PARENT", l: t("au.filterFamilies") }, { v: "ADMIN", l: t("au.filterAdmins") },
    ];
    // [MOCKUP 2026-08] Filtros como botones del kit (h34, r4): activo negro, resto outline.
    // Antes eran .chip pill; el kit no tiene pills y los chips son etiquetas, no controles.
    const chips = FILTERS.map((f) =>
      `<button type="button" class="btn btn--sm ${(st.role || "") === f.v ? "btn-primary" : "btn-outline"}" data-au-role="${f.v}">${f.l}</button>`).join("");

    // [ENT-02] Cargar más mientras la lista cargada sea menor que el total filtrado.
    const more = (st.total || 0) > users.length
      ? `<div class="row" style="justify-content:center;margin-top:16px"><button class="btn btn-outline btn--sm" id="au-more">${t("au.loadMore").replace("{loaded}", String(users.length)).replace("{total}", String(st.total))}</button></div>`
      : "";

    return `
    <div class="page-head page-head--rule fade-up"><div>
      <h1 class="ph-title">${t("au.title")}</h1>
      <div class="page-sub">${t("au.subtitle")}</div>
    </div></div>

    <div class="grid g-4 fade-up" style="--d:1;margin-bottom:18px">
      <div class="tile">${C.kpi(t("au.kpiUsers"), String(kUsers), { ic: "users" })}</div>
      <div class="tile">${C.kpi(t("au.kpiCoaches"), String(kCoaches), { ic: "user" })}</div>
      <div class="tile">${C.kpi(t("au.kpiAdmins"), String(kAdmins), { ic: "check" })}</div>
      <div class="tile">${C.kpi(t("au.kpiSuspended"), String(kSusp), { ic: "flag" })}</div>
    </div>

    <div class="card card-pad fade-up" style="--d:2;margin-bottom:16px">
      <div class="row vcenter" style="gap:8px">
        <input class="input" id="au-search" placeholder="${t("au.searchPlaceholder")}" value="${esc(st.q || "")}" style="flex:1"/>
        <button class="btn btn-primary btn--sm" id="au-search-btn">${IC.search} ${t("au.searchBtn")}</button>
      </div>
      <div class="row wrap" style="gap:8px;margin-top:12px" id="au-roles">${chips}</div>
      <!-- [F6.4] Export CSV: descarga directa del endpoint admin (la cookie de sesión viaja sola).
           Anchor nativo con download — sin JS ni estado; el servidor pone el filename datado. -->
      <div class="row" style="margin-top:12px;justify-content:flex-end">
        <a class="btn btn-outline btn--sm" href="/api/admin/export?entity=users" download>${IC.doc} ${t("au.exportCsv")}</a>
      </div>
    </div>

    ${/* [ADM] Va ANTES de la lista de usuarios: el consentimiento pendiente de un menor es
          más urgente que administrar roles, y así se ve sin scrollear la lista entera. */""}
    ${admissionSection()}

    <div class="sec-title sec-title--sm"><h3>${t("au.kpiUsers")}</h3></div>
    <div class="fade-up" style="--d:3" id="au-body">${viewBody()}${more}</div>`;
  },

  mount(root, state) {
    const w = window;
    const st = usersState();

    const repaint = () => {
      const page = root.querySelector(".page");
      if (!page) return;
      page.innerHTML = S.adminUsers.render(state);
      S.adminUsers.mount(root, state);
    };

    // load({ q?, role?, append? }): append=true pagina (skip = nº ya cargado);
    // q/role omitidos conservan el estado actual. Reemplaza la lista salvo append.
    const load = (opts) => {
      opts = opts || {};
      st.loading = true;
      if (opts.q != null) st.q = opts.q;
      if (opts.role != null) st.role = opts.role;
      const append = !!opts.append;
      const skip = append ? (Array.isArray(st.users) ? st.users.length : 0) : 0;
      const p = new URLSearchParams();
      if (st.q) p.set("q", st.q);
      if (st.role) p.set("role", st.role);
      if (skip) p.set("skip", String(skip));
      const qs = p.toString() ? `?${p.toString()}` : "";
      w.api("/api/admin/users" + qs, null, "GET")
        .then((d) => {
          const rows = Array.isArray(d && d.users) ? d.users : [];
          st.users = append ? [...(Array.isArray(st.users) ? st.users : []), ...rows] : rows;
          st.total = d && typeof d.total === "number" ? d.total : st.users.length;
          if (d && d.counts) st.counts = d.counts;
          st.loaded = true;
        })
        .catch((e) => {
          if (!append) st.users = [];
          st.loaded = true;
          w.toast?.((e && e.message) || t("au.errLoad"), "danger");
        })
        .finally(() => {
          st.loading = false;
          repaint();
        });
    };

    // Carga inicial (una sola vez por sesión de pantalla).
    if (!st.loaded && !st.loading) {
      load();
      return; // el repaint del finally re-montará con los datos
    }

    // --- Búsqueda ---
    const searchEl = root.querySelector("#au-search");
    const doSearch = () => load({ q: String(searchEl?.value || "").trim() });
    root.querySelector("#au-search-btn")?.addEventListener("click", doSearch);
    searchEl?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); doSearch(); }
    });

    // --- [ENT-04] Filtro por rol ---
    root.querySelectorAll("[data-au-role]").forEach((chip) =>
      chip.addEventListener("click", () => load({ role: chip.getAttribute("data-au-role") || "" })));

    // --- [ENT-02] Cargar más (paginación) ---
    root.querySelector("#au-more")?.addEventListener("click", (e) => {
      const btn = e.currentTarget; if (btn) { btn.disabled = true; btn.textContent = t("au.loadingBtn"); }
      load({ append: true });
    });

    // --- Cambiar rol (select) ---
    const patch = async (id, body, onLocal, okMsg) => {
      try {
        const d = await w.api("/api/admin/users", { userId: id, ...body }, "PATCH");
        const fresh = (d && d.user) || null;
        (Array.isArray(st.users) ? st.users : []).forEach((u) => {
          if (u.id === id) {
            if (fresh) Object.assign(u, fresh);
            else onLocal?.(u);
          }
        });
        // [fix verificación] Con un filtro de rol activo, si el cambio dejó a un usuario fuera
        // del filtro, quítalo de la lista para que el skip de "Cargar más" (=length) siga
        // alineado con el set filtrado del servidor (si no, se saltaría una fila de borde).
        if (st.role) {
          const matches = (r) => (st.role === "TEACHER" ? (r === "TEACHER" || r === "COACH") : r === st.role);
          st.users = (Array.isArray(st.users) ? st.users : []).filter((u) => matches(String(u.role || "").toUpperCase()));
        }
        w.toast?.(okMsg, "ok");
        repaint();
      } catch (e) {
        w.toast?.((e && e.message) || t("au.errUpdate"), "danger");
        repaint();
      }
    };

    root.querySelectorAll("[data-user-role]").forEach((sel) =>
      sel.addEventListener("change", () => {
        const id = sel.getAttribute("data-user-role");
        const role = sel.value;
        patch(id, { role }, (u) => (u.role = role), t("au.toastRoleUpdated"));
      })
    );

    root.querySelectorAll("[data-user-verify]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-user-verify");
        const val = btn.getAttribute("data-val") === "true";
        btn.disabled = true;
        patch(id, { coachVerified: val }, (u) => (u.coachVerified = val), val ? t("au.toastVerified") : t("au.toastUnverified"));
      })
    );

    root.querySelectorAll("[data-user-suspend]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-user-suspend");
        const val = btn.getAttribute("data-val") === "true";
        btn.disabled = true;
        patch(id, { suspended: val }, (u) => (u.suspended = val), val ? t("au.toastSuspended") : t("au.toastReactivated"));
      })
    );

    // [R4] Erasure con armado de dos toques (mismo patrón que data-guardian-reject en
    // scr-settings): el primer clic arma y muestra la confirmación; el segundo ejecuta.
    root.querySelectorAll("[data-user-erase]").forEach((btn) =>
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-user-erase");
        if (!id) return;
        // [GOAL-E4 #5] El aria-label (que nombra a la persona) TAPA al textContent, así que
        // cada vez que el botón cambia de texto hay que moverlo también: si no, el lector
        // seguiría diciendo "Borrar datos de X" justo cuando la pantalla pide la confirmación
        // de una acción irreversible.
        // [revisión · Important-1] `restLabel` se leía del DOM en CADA click y este botón arma
        // en dos toques: en el 2º click el atributo YA valía el texto armado, así que si la API
        // fallaba el botón se quedaba diciendo "Borrar datos" con el nombre accesible
        // "¿Seguro? Es irreversible…" — sin persona y contradiciendo al texto visible.
        // El label en reposo se captura UNA sola vez y sobrevive a todos los ciclos.
        const restLabel = restLabelOf(btn);
        const setLabel = (s) => { if (restLabel) btn.setAttribute("aria-label", s); };
        if (btn.getAttribute("data-armed") !== "1") {
          btn.setAttribute("data-armed", "1");
          const t0 = btn.textContent;
          btn.textContent = t("au.eraseArm");
          setLabel(t("au.eraseArm"));
          setTimeout(() => {
            if (btn.isConnected && btn.getAttribute("data-armed") === "1") {
              btn.removeAttribute("data-armed");
              btn.textContent = t0;
              setLabel(restLabel);
            }
          }, 4000);
          return;
        }
        btn.disabled = true;
        btn.textContent = t("au.erasing");
        setLabel(t("au.erasing"));
        try {
          await w.api("/api/admin/erase", { userId: id }, "POST");
          w.toast?.(t("au.erased"), "ok");
          // [CIERRE · O1] Era `loadUsers()`, que NO EXISTE: la función local se llama
          // `load` (línea 222). El ReferenceError caía en el catch de abajo, así que un
          // borrado GDPR que el servidor había ejecutado BIEN terminaba con toast rojo
          // "No se pudo borrar" y la fila sin refrescar — el admin creía que había fallado.
          load(); // recarga: el usuario aparece anonimizado y suspendido
        } catch (e) {
          w.toast?.((e && e.message) || t("au.eraseFailed"), "danger");
          btn.disabled = false;
          btn.removeAttribute("data-armed");
          btn.textContent = t("au.erase");
          setLabel(restLabel);
        }
      })
    );
  },
};
