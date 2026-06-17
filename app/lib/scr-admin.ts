// @ts-nocheck
/* OTR · Consola de moderación (PRD §3.3 admin console mínima, §7.4 reportes) —
   S.adminConsole. Pantalla role-scoped ADMIN. No lee DB.* : en mount hace
   window.api('/api/reports', null, 'GET') y pinta la cola de reportes abiertos /
   en revisión como cards con acciones [Marcar revisado] (PATCH REVIEWED) y
   [Descartar] (PATCH DISMISSED) → mutación local + toast + re-render.

   Patrón de la casa: render(state)->string + mount(root,state); IC.* iconos,
   esc() para texto del usuario, navy + sky, fade-up; nada de emojis.
   Cliente vía globales de Aula.tsx: api(url,body,method), toast(). */
import { C } from "./components";
import { IC } from "./icons";
import { esc } from "./esc";

export const S = {};

/* ---------------- estado del cliente (window.__mod) ---------------- */
function modState() {
  const w = window as any;
  if (!w.__mod) w.__mod = { loaded: false, loading: false, reports: [], total: 0 };
  return w.__mod;
}

/* ---------------- helpers ---------------- */
const TARGET_LABEL = {
  user: "Usuario",
  message: "Mensaje",
  conversation: "Conversación",
  booking: "Reserva",
  coach: "Coach",
};
const ini = (name) =>
  (String(name || "?").split(" ").map((w) => w[0]).join("") || "?").slice(0, 2).toUpperCase();

function fmtDate(v) {
  const d = new Date(v);
  if (isNaN(d.getTime())) return "";
  try {
    return d.toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

function statusBadge(status) {
  const s = String(status || "").toUpperCase();
  if (s === "OPEN") return `<span class="badge warn"><span class="dot"></span>Abierto</span>`;
  if (s === "REVIEWED") return `<span class="badge sky"><span class="dot"></span>Revisado</span>`;
  if (s === "DISMISSED") return `<span class="badge"><span class="dot"></span>Descartado</span>`;
  return s ? `<span class="badge">${esc(s)}</span>` : "";
}

/* ---------------- card de reporte ---------------- */
function reportCard(r, d) {
  const type = TARGET_LABEL[r.targetType] || esc(String(r.targetType || "Objetivo"));
  const reviewed = String(r.status || "").toUpperCase() === "REVIEWED";
  return `
  <div class="card card-pad fade-up" style="--d:${d}" data-rep-card="${esc(r.id)}">
    <div class="row between vcenter wrap" style="gap:10px">
      <div class="row vcenter" style="gap:9px;min-width:0">
        <span style="display:inline-flex;width:16px;height:16px;color:var(--otr-sky-lo);flex:none">${IC.flag}</span>
        <b style="font-size:13.5px">${type}${r.targetName ? ` · ${esc(r.targetName)}` : ""}</b>
        ${r.targetName ? "" : `<span class="chip soft" style="font-size:11px">${esc(r.targetId)}</span>`}
      </div>
      ${statusBadge(r.status)}
    </div>

    <p style="font-size:13.5px;margin-top:11px;line-height:1.5">${esc(r.reason)}</p>

    <div class="row vcenter wrap" style="gap:10px;margin-top:12px;padding-top:12px;border-top:1px solid var(--border)">
      <div class="row vcenter" style="gap:8px;flex:1;min-width:160px">
        ${C.avatar(esc(ini(r.reporterName)), { size: "sm", bg: "var(--otr-navy)" })}
        <span class="faint" style="font-size:12px">
          Reportado por <b style="color:var(--text-2)">${esc(r.reporterName)}</b>${r.createdAt ? ` · ${esc(fmtDate(r.createdAt))}` : ""}
        </span>
      </div>
      <div class="row" style="gap:8px;flex:none">
        ${!reviewed && (r.targetType === "user" || r.targetType === "coach")
          ? `<button class="btn btn-sm" data-rep-suspend="${esc(r.id)}" style="background:var(--danger);color:#fff">Suspender al usuario</button>`
          : ""}
        ${reviewed
          ? ""
          : `<button class="btn btn-soft btn-sm" data-rep-review="${esc(r.id)}">Marcar revisado</button>`}
        <button class="btn btn-ghost btn-sm" data-rep-dismiss="${esc(r.id)}">Descartar</button>
      </div>
    </div>
  </div>`;
}

/* ---------------- body por estado ---------------- */
function viewBody() {
  const st = modState();

  if (!st.loaded && st.loading) {
    return `
    <div class="card fade-up"><div class="empty">
      <div class="ill">${IC.shield || IC.flag}</div>
      <h4>Cargando reportes…</h4>
      <p>Estamos recuperando la cola de moderación.</p>
    </div></div>`;
  }

  const reports = Array.isArray(st.reports) ? st.reports : [];

  if (!reports.length) {
    return `
    <div class="card fade-up"><div class="empty">
      <div class="ill">${IC.checkCircle}</div>
      <h4>Todo en orden — sin reportes pendientes</h4>
      <p>Cuando alguien reporte un usuario, mensaje o reserva, aparecerá aquí.</p>
    </div></div>`;
  }

  return `<div class="stack" style="gap:14px">${reports.map((r, i) => reportCard(r, Math.min(i, 6))).join("")}</div>`;
}

/* ================= PANTALLA ================= */
S.adminConsole = {
  render(state) {
    const st = modState();
    const reports = Array.isArray(st.reports) ? st.reports : [];
    const open = reports.filter((r) => String(r.status || "").toUpperCase() === "OPEN").length;

    return `
    <div class="page-head fade-up"><div>
      <p class="eyebrow">Administración</p>
      <h1 class="page-title">Consola de moderación</h1>
      <div class="page-sub">Revisa y resuelve los reportes de la comunidad — usuarios, mensajes y reservas</div>
    </div></div>

    <div class="grid g-2 fade-up" style="--d:1;margin-bottom:18px">
      <div class="tile">${C.kpi("Reportes abiertos", String(open), { ic: "flag" })}</div>
      <div class="tile">${C.kpi("En la cola", String(st.total || reports.length), { ic: "doc" })}</div>
    </div>

    <div class="fade-up" style="--d:2" id="mod-body">${viewBody()}${(st.total || 0) > reports.length ? `<div class="row" style="justify-content:center;margin-top:16px"><button class="btn btn-soft btn-sm" id="mod-more">Cargar más · ${reports.length} de ${st.total}</button></div>` : ""}</div>`;
  },

  mount(root, state) {
    const w = window;
    const st = modState();

    const repaint = () => {
      const page = root.querySelector(".page");
      if (!page) return;
      page.innerHTML = S.adminConsole.render(state);
      S.adminConsole.mount(root, state);
    };

    // [ENT-01] load(append): append=true pagina (skip = nº ya cargado); si no, reemplaza.
    const load = (append) => {
      st.loading = true;
      const skip = append ? (Array.isArray(st.reports) ? st.reports.length : 0) : 0;
      const qs = skip ? `?skip=${skip}` : "";
      w.api("/api/reports" + qs, null, "GET")
        .then((d) => {
          const rows = Array.isArray(d && d.reports) ? d.reports : [];
          st.reports = append ? [...(Array.isArray(st.reports) ? st.reports : []), ...rows] : rows;
          st.total = d && typeof d.total === "number" ? d.total : st.reports.length;
          st.loaded = true;
        })
        .catch((e) => {
          if (!append) st.reports = [];
          st.loaded = true;
          w.toast?.((e && e.message) || "No se pudo cargar la cola de moderación", "danger");
        })
        .finally(() => {
          st.loading = false;
          repaint();
        });
    };

    // Carga inicial (una sola vez por sesión de pantalla).
    if (!st.loaded && !st.loading) { load(false); return; }

    // Resuelve un reporte: PATCH status → mutación local + toast + re-render.
    const resolve = async (btn, id, status) => {
      if (!id) return;
      const label = status === "REVIEWED" ? "Marcando…" : "Descartando…";
      btn.disabled = true;
      const prev = btn.textContent;
      btn.textContent = label;
      try {
        await w.api("/api/reports", { reportId: id, status }, "PATCH");
        if (status === "DISMISSED") {
          // Descartado sale de la cola (la GET solo trae OPEN/REVIEWED).
          st.reports = (Array.isArray(st.reports) ? st.reports : []).filter((r) => r.id !== id);
          // [fix verificación] Mantener st.total en sync: si no, 'Cargar más' queda visible con un total inflado.
          if (typeof st.total === "number") st.total = Math.max(0, st.total - 1);
          w.toast?.("Reporte descartado", "ok");
        } else {
          (Array.isArray(st.reports) ? st.reports : []).forEach((r) => {
            if (r.id === id) r.status = "REVIEWED";
          });
          w.toast?.("Reporte marcado como revisado", "ok");
        }
        repaint();
      } catch (e) {
        w.toast?.((e && e.message) || "No se pudo actualizar el reporte", "danger");
        btn.disabled = false;
        btn.textContent = prev;
      }
    };

    root.querySelectorAll("[data-rep-review]").forEach((btn) =>
      btn.addEventListener("click", () => resolve(btn, btn.getAttribute("data-rep-review"), "REVIEWED"))
    );
    root.querySelectorAll("[data-rep-dismiss]").forEach((btn) =>
      btn.addEventListener("click", () => resolve(btn, btn.getAttribute("data-rep-dismiss"), "DISMISSED"))
    );

    // [ADMIN-1] Accionar al infractor desde la cola: suspende al usuario/coach reportado
    // (PATCH action:'suspend' → el backend suspende y marca el reporte REVIEWED). Confirmación
    // de dos toques por ser destructivo. Antes no había forma de cerrar el ciclo de moderación.
    const suspendUser = async (btn, id) => {
      if (!id) return;
      if (btn.getAttribute("data-armed") !== "1") {
        btn.setAttribute("data-armed", "1");
        const t0 = btn.textContent;
        btn.textContent = "¿Confirmar suspensión? Tocar de nuevo";
        setTimeout(() => {
          if (btn.isConnected && btn.getAttribute("data-armed") === "1") { btn.removeAttribute("data-armed"); btn.textContent = t0; }
        }, 4000);
        return;
      }
      btn.disabled = true;
      btn.textContent = "Suspendiendo…";
      try {
        await w.api("/api/reports", { reportId: id, action: "suspend" }, "PATCH");
        (Array.isArray(st.reports) ? st.reports : []).forEach((r) => { if (r.id === id) r.status = "REVIEWED"; });
        w.toast?.("Usuario suspendido · reporte marcado revisado", "ok");
        repaint();
      } catch (e) {
        w.toast?.((e && e.message) || "No se pudo suspender al usuario", "danger");
        btn.disabled = false;
        btn.removeAttribute("data-armed");
        btn.textContent = "Suspender al usuario";
      }
    };
    root.querySelectorAll("[data-rep-suspend]").forEach((btn) =>
      btn.addEventListener("click", () => suspendUser(btn, btn.getAttribute("data-rep-suspend")))
    );

    // [ENT-01] Cargar más reportes (paginación).
    root.querySelector("#mod-more")?.addEventListener("click", (e) => {
      const b = e.currentTarget; if (b) { b.disabled = true; b.textContent = "Cargando…"; }
      load(true);
    });
  },
};
