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
import { t } from "./i18n";

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
const ROLE_LABEL = { ...Object.fromEntries(ROLE_OPTS.map((o) => [o.v, o.l])), COACH: "Coach" };
const isCoachRole = (r) => r === "TEACHER" || r === "COACH";

const ini = (name) =>
  (String(name || "?").split(" ").map((w) => w[0]).join("") || "?").slice(0, 2).toUpperCase();

function roleBadge(role) {
  const r = String(role || "").toUpperCase();
  if (r === "ADMIN") return `<span class="badge navy"><span class="dot"></span>${esc(ROLE_LABEL[r] || r)}</span>`;
  if (isCoachRole(r)) return `<span class="badge sky"><span class="dot"></span>${esc(ROLE_LABEL[r] || r)}</span>`;
  return `<span class="badge">${esc(ROLE_LABEL[r] || r || "—")}</span>`;
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
    ? `<button class="btn btn-sm ${verified ? "btn-ghost" : "btn-soft"}" data-user-verify="${esc(u.id)}" data-val="${verified ? "false" : "true"}">
         ${verified ? t("au.unverify") : t("au.verifyCoach")}
       </button>`
    : "";
  const suspendBtn = `<button class="btn btn-sm ${suspended ? "btn-soft" : "btn-ghost"}" data-user-suspend="${esc(u.id)}" data-val="${suspended ? "false" : "true"}" style="${suspended ? "" : "color:var(--danger)"}">
        ${suspended ? t("au.reactivate") : t("au.suspend")}
      </button>`;

  return `
  <div class="card card-pad fade-up" style="--d:${d}" data-user-card="${esc(u.id)}">
    <div class="row between vcenter wrap" style="gap:10px">
      <div class="row vcenter" style="gap:10px;min-width:0;flex:1">
        ${C.avatar(esc(ini(u.name)), { size: "sm", bg: "var(--otr-navy)" })}
        <div style="min-width:0">
          <div class="row vcenter" style="gap:8px;flex-wrap:wrap">
            <b style="font-size:13.5px">${esc(u.name)}</b>
            ${roleBadge(role)}
            ${isCoachRole(role) && verified ? `<span class="badge sky" style="font-size:10.5px">${IC.check} ${t("au.verifiedBadge")}</span>` : ""}
            ${suspended ? `<span class="badge warn" style="font-size:10.5px">${t("au.suspendedBadge")}</span>` : ""}
          </div>
          <div class="faint" style="font-size:12px;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(u.email)}${u.ageBand === "minor" ? " · menor" : ""}</div>
        </div>
      </div>
    </div>
    <div class="row vcenter wrap" style="gap:8px;margin-top:12px;padding-top:12px;border-top:1px solid var(--border)">
      <span class="faint" style="font-size:11.5px;align-self:center">${t("au.roleLabel")}</span>
      ${roleSelect}
      <span style="flex:1"></span>
      ${verifyBtn}
      ${suspendBtn}
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
    const chips = FILTERS.map((f) =>
      `<button type="button" class="chip ${(st.role || "") === f.v ? "active" : ""}" data-au-role="${f.v}">${f.l}</button>`).join("");

    // [ENT-02] Cargar más mientras la lista cargada sea menor que el total filtrado.
    const more = (st.total || 0) > users.length
      ? `<div class="row" style="justify-content:center;margin-top:16px"><button class="btn btn-soft btn-sm" id="au-more">Cargar más · ${users.length} de ${st.total}</button></div>`
      : "";

    return `
    <div class="page-head fade-up"><div>
      <p class="eyebrow">${t("au.eyebrow")}</p>
      <h1 class="page-title">${t("au.title")}</h1>
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
        <button class="btn btn-primary btn-sm" id="au-search-btn">${IC.search} ${t("au.searchBtn")}</button>
      </div>
      <div class="row wrap" style="gap:8px;margin-top:12px" id="au-roles">${chips}</div>
    </div>

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
  },
};
