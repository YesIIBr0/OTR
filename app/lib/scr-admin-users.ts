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

export const S = {};

/* ---------------- estado del cliente (window.__adminUsers) ---------------- */
function usersState() {
  const w = window as any;
  if (!w.__adminUsers) w.__adminUsers = { loaded: false, loading: false, users: [], total: 0, q: "" };
  return w.__adminUsers;
}

/* ---------------- helpers ---------------- */
const ROLE_OPTS = [
  { v: "STUDENT", l: "Estudiante" },
  { v: "PARENT", l: "Familia" },
  { v: "TEACHER", l: "Profesor / Coach" },
  { v: "COACH", l: "Coach" },
  { v: "ADMIN", l: "Administrador" },
];
const ROLE_LABEL = Object.fromEntries(ROLE_OPTS.map((o) => [o.v, o.l]));
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
         ${verified ? "Quitar verificación" : "Verificar coach"}
       </button>`
    : "";
  const suspendBtn = `<button class="btn btn-sm ${suspended ? "btn-soft" : "btn-ghost"}" data-user-suspend="${esc(u.id)}" data-val="${suspended ? "false" : "true"}" style="${suspended ? "" : "color:var(--danger)"}">
        ${suspended ? "Reactivar" : "Suspender"}
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
            ${isCoachRole(role) && verified ? `<span class="badge sky" style="font-size:10.5px">${IC.check} Verificado</span>` : ""}
            ${suspended ? `<span class="badge warn" style="font-size:10.5px">Suspendido</span>` : ""}
          </div>
          <div class="faint" style="font-size:12px;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(u.email)}${u.ageBand === "minor" ? " · menor" : ""}</div>
        </div>
      </div>
    </div>
    <div class="row vcenter wrap" style="gap:8px;margin-top:12px;padding-top:12px;border-top:1px solid var(--border)">
      <span class="faint" style="font-size:11.5px;align-self:center">Rol</span>
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
      <h4>Cargando usuarios…</h4>
      <p>Estamos recuperando la lista de cuentas.</p>
    </div></div>`;
  }

  const users = Array.isArray(st.users) ? st.users : [];
  if (!users.length) {
    return `
    <div class="card fade-up"><div class="empty">
      <div class="ill">${IC.users}</div>
      <h4>${st.q ? "Sin resultados" : "Sin usuarios"}</h4>
      <p>${st.q ? "Ningún usuario coincide con tu búsqueda." : "Cuando se registren usuarios, aparecerán aquí."}</p>
    </div></div>`;
  }

  return `<div class="stack" style="gap:14px">${users.map((u, i) => userCard(u, Math.min(i, 6))).join("")}</div>`;
}

/* ================= PANTALLA ================= */
S.adminUsers = {
  render(state) {
    const st = usersState();
    const users = Array.isArray(st.users) ? st.users : [];
    const coaches = users.filter((u) => isCoachRole(String(u.role || "").toUpperCase())).length;
    const admins = users.filter((u) => String(u.role || "").toUpperCase() === "ADMIN").length;
    const suspended = users.filter((u) => u.suspended).length;

    return `
    <div class="page-head fade-up"><div>
      <p class="eyebrow">Administración</p>
      <div class="page-title">Gestión de usuarios</div>
      <div class="page-sub">Cambia roles, verifica coaches y suspende cuentas — sin tocar la base de datos</div>
    </div></div>

    <div class="grid g-4 fade-up" style="--d:1;margin-bottom:18px">
      <div class="tile">${C.kpi("Usuarios", String(st.total || users.length), { ic: "users" })}</div>
      <div class="tile">${C.kpi("Coaches", String(coaches), { ic: "user" })}</div>
      <div class="tile">${C.kpi("Admins", String(admins), { ic: "check" })}</div>
      <div class="tile">${C.kpi("Suspendidos", String(suspended), { ic: "flag" })}</div>
    </div>

    <div class="card card-pad fade-up" style="--d:2;margin-bottom:16px">
      <div class="row vcenter" style="gap:8px">
        <input class="input" id="au-search" placeholder="Buscar por nombre o correo…" value="${esc(st.q || "")}" style="flex:1"/>
        <button class="btn btn-primary btn-sm" id="au-search-btn">${IC.search} Buscar</button>
      </div>
    </div>

    <div class="fade-up" style="--d:3" id="au-body">${viewBody()}</div>`;
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

    const load = (q) => {
      st.loading = true;
      st.q = q != null ? q : st.q;
      const qs = st.q ? `?q=${encodeURIComponent(st.q)}` : "";
      w.api("/api/admin/users" + qs, null, "GET")
        .then((d) => {
          st.users = Array.isArray(d && d.users) ? d.users : [];
          st.total = d && typeof d.total === "number" ? d.total : st.users.length;
          st.loaded = true;
        })
        .catch((e) => {
          st.users = [];
          st.loaded = true;
          w.toast?.((e && e.message) || "No se pudo cargar la lista de usuarios", "danger");
        })
        .finally(() => {
          st.loading = false;
          repaint();
        });
    };

    // Carga inicial (una sola vez por sesión de pantalla).
    if (!st.loaded && !st.loading) {
      load(st.q);
      return; // el repaint del finally re-montará con los datos
    }

    // --- Búsqueda ---
    const searchEl = root.querySelector("#au-search");
    const doSearch = () => load(String(searchEl?.value || "").trim());
    root.querySelector("#au-search-btn")?.addEventListener("click", doSearch);
    searchEl?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); doSearch(); }
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
        w.toast?.(okMsg, "ok");
        repaint();
      } catch (e) {
        w.toast?.((e && e.message) || "No se pudo actualizar el usuario", "danger");
        repaint();
      }
    };

    root.querySelectorAll("[data-user-role]").forEach((sel) =>
      sel.addEventListener("change", () => {
        const id = sel.getAttribute("data-user-role");
        const role = sel.value;
        patch(id, { role }, (u) => (u.role = role), "Rol actualizado");
      })
    );

    root.querySelectorAll("[data-user-verify]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-user-verify");
        const val = btn.getAttribute("data-val") === "true";
        btn.disabled = true;
        patch(id, { coachVerified: val }, (u) => (u.coachVerified = val), val ? "Coach verificado" : "Verificación retirada");
      })
    );

    root.querySelectorAll("[data-user-suspend]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-user-suspend");
        const val = btn.getAttribute("data-val") === "true";
        btn.disabled = true;
        patch(id, { suspended: val }, (u) => (u.suspended = val), val ? "Usuario suspendido" : "Usuario reactivado");
      })
    );
  },
};
