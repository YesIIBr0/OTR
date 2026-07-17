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
import { t } from "./i18n";

export const S = {};

/* ---------------- estado del cliente (window.__mod) ---------------- */
// tab: pestaña activa ("reports" | "audit"). audit: sub-estado del rastro de auditoría (F2.2),
// mismo shape que el de reportes (loaded/loading/error/entries/total) pero cargado ON-DEMAND —
// solo la primera vez que se abre la pestaña Auditoría, no en el mount de la consola.
function modState() {
  const w = window as any;
  if (!w.__mod) {
    w.__mod = {
      loaded: false, loading: false, reports: [], total: 0,
      tab: "reports",
      audit: { loaded: false, loading: false, error: false, entries: [], total: 0, page: 1 },
    };
  }
  return w.__mod;
}
const AUDIT_TAKE = 50;

/* ---------------- helpers ---------------- */
const TARGET_LABEL = () => ({
  user: t("admin.targetUser"),
  message: t("admin.targetMessage"),
  conversation: t("admin.targetConversation"),
  booking: t("admin.targetBooking"),
  coach: t("admin.targetCoach"),
});
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
  if (s === "OPEN") return `<span class="badge warn"><span class="dot"></span>${t("admin.statusOpen")}</span>`;
  if (s === "REVIEWED") return `<span class="badge sky"><span class="dot"></span>${t("admin.statusReviewed")}</span>`;
  if (s === "DISMISSED") return `<span class="badge"><span class="dot"></span>${t("admin.statusDismissed")}</span>`;
  return s ? `<span class="badge">${esc(s)}</span>` : "";
}

// [F2.3] Fecha + hora del slot de una reserva (la sesión sí necesita la hora, no solo el día).
function fmtSlot(v) {
  const d = new Date(v);
  if (isNaN(d.getTime())) return "";
  try {
    return d.toLocaleString("es", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return d.toISOString().slice(0, 16).replace("T", " ");
  }
}

// [F2.3] Etiqueta legible del estado de la reserva (el enum crudo en inglés es jarring en la UI).
const BK_STATUS_LABEL = () => ({
  PENDING: t("admin.bkPending"),
  CONFIRMED: t("admin.bkConfirmed"),
  COMPLETED: t("admin.bkCompleted"),
  CANCELLED: t("admin.bkCancelled"),
  DISPUTED: t("admin.bkDisputed"),
});
function bkStatusLabel(s) {
  const k = String(s || "").toUpperCase();
  return BK_STATUS_LABEL()[k] || esc(k);
}

/* [F2.3] Bloque de CONTEXTO — el contenido reportado que el admin ve ANTES de accionar
   (mensaje / últimos mensajes de la conversación / datos de la reserva). r.context viene del
   servidor con TODO el texto de usuario YA escapado (contrato de escape) → se renderiza CRUDO,
   igual que auditRow. Estilo: cita con acento a la izquierda, consistente con la card. */
function contextBlock(r) {
  const c = r.context;
  if (!c || typeof c !== "object") return "";
  const wrap = (inner) =>
    `<div class="mod-ctx" style="margin-top:11px;padding:10px 12px;border:1px solid var(--border);border-left:3px solid var(--otr-sky-lo);border-radius:10px;background:var(--surface-2);font-size:12.5px;line-height:1.55">${inner}</div>`;
  const label = (txt) =>
    `<div class="faint" style="font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;margin-bottom:6px">${txt}</div>`;

  if (c.kind === "message") {
    const from = c.senderName
      ? `<div style="margin-top:6px"><span class="faint" style="font-size:11.5px">${t("admin.ctxSender")}: <b style="color:var(--text-2)">${c.senderName}</b></span></div>`
      : "";
    return wrap(`${label(t("admin.ctxReportedContent"))}<div style="color:var(--text);white-space:pre-wrap;word-break:break-word">${c.body || ""}</div>${from}`);
  }

  if (c.kind === "conversation") {
    const title = c.title ? `<div style="font-weight:700;color:var(--text);margin-bottom:6px">${c.title}</div>` : "";
    const parts = Array.isArray(c.participants) && c.participants.length
      ? `<div style="margin-bottom:7px"><span class="faint" style="font-size:11.5px">${t("admin.ctxParticipants")}: </span><span style="color:var(--text-2)">${c.participants.join(", ")}</span></div>`
      : "";
    const msgs = Array.isArray(c.messages) && c.messages.length
      ? `<div class="faint" style="font-size:11px;margin:4px 0 2px">${t("admin.ctxLatestMessages")}</div>` +
        c.messages
          .map((m) => `<div style="padding:4px 0;border-top:1px solid var(--border);word-break:break-word">${m.senderName ? `<b style="color:var(--text-2);font-size:11.5px">${m.senderName}: </b>` : ""}<span style="color:var(--text)">${m.body || ""}</span></div>`)
          .join("")
      : "";
    return wrap(`${label(t("admin.ctxReportedContent"))}${title}${parts}${msgs}`);
  }

  if (c.kind === "booking") {
    const rows = [
      [t("admin.ctxCoach"), c.coachName],
      [t("admin.ctxStudent"), c.studentName],
      [t("admin.ctxSession"), esc(fmtSlot(c.slotAt))],
      [t("admin.ctxStatus"), bkStatusLabel(c.status)],
    ]
      .filter((kv) => kv[1])
      .map((kv) => `<div style="display:flex;gap:8px"><span class="faint" style="min-width:82px;font-size:11.5px">${kv[0]}</span><span style="color:var(--text)">${kv[1]}</span></div>`)
      .join("");
    return wrap(`${label(t("admin.ctxReportedContent"))}<div class="stack" style="gap:3px">${rows}</div>`);
  }

  return "";
}

/* ---------------- card de reporte ---------------- */
function reportCard(r, d) {
  const type = TARGET_LABEL()[r.targetType] || esc(String(r.targetType || t("admin.targetFallback")));
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
    ${contextBlock(r)}

    <div class="row vcenter wrap" style="gap:10px;margin-top:12px;padding-top:12px;border-top:1px solid var(--border)">
      <div class="row vcenter" style="gap:8px;flex:1;min-width:160px">
        ${C.avatar(esc(ini(r.reporterName)), { size: "sm", bg: "var(--otr-navy)" })}
        <span class="faint" style="font-size:12px">
          ${t("admin.reportedBy")} <b style="color:var(--text-2)">${esc(r.reporterName)}</b>${r.createdAt ? ` · ${esc(fmtDate(r.createdAt))}` : ""}
        </span>
      </div>
      <div class="row" style="gap:8px;flex:none">
        ${!reviewed && (r.targetType === "user" || r.targetType === "coach")
          ? `<button class="btn btn-sm" data-rep-suspend="${esc(r.id)}" style="background:var(--danger);color:#fff">${t("admin.suspendUser")}</button>`
          : ""}
        ${reviewed
          ? ""
          : `<button class="btn btn-soft btn-sm" data-rep-review="${esc(r.id)}">${t("admin.markReviewed")}</button>`}
        <button class="btn btn-ghost btn-sm" data-rep-dismiss="${esc(r.id)}">${t("admin.dismiss")}</button>
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
      <h4>${t("admin.loadingHeading")}</h4>
      <p>${t("admin.loadingBody")}</p>
    </div></div>`;
  }

  const reports = Array.isArray(st.reports) ? st.reports : [];

  if (!reports.length) {
    return `
    <div class="card fade-up"><div class="empty">
      <div class="ill">${IC.checkCircle}</div>
      <h4>${t("admin.emptyHeading")}</h4>
      <p>${t("admin.emptyBody")}</p>
    </div></div>`;
  }

  return `<div class="stack" style="gap:14px">${reports.map((r, i) => reportCard(r, Math.min(i, 6))).join("")}</div>`;
}

/* ================= [F2.2] RASTRO DE AUDITORÍA ================= */
// Pestañas de la consola. Se resuelven las etiquetas dentro para respetar el idioma activo.
const TABS = () => [
  { k: "reports", l: t("admin.tabReports"), ic: "flag" },
  { k: "audit", l: t("admin.tabAudit"), ic: "shield" },
];
function activeTab() {
  const st = modState();
  return st.tab === "audit" ? "audit" : "reports";
}

// Fecha relativa corta ("ahora" / "hace 5 min" / "hace 3 h" / "hace 2 d"); más allá de una
// semana cae a la fecha corta absoluta (fmtDate) — para un rastro conviene el dato preciso.
// Mismo patrón que fmtRelative de scr-admin-whatsapp.ts.
function fmtWhen(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const min = Math.floor((Date.now() - d.getTime()) / 60000);
  if (min < 1) return t("admin.timeNow");
  if (min < 60) return t("admin.timeMin").replace("{n}", String(min));
  const hr = Math.floor(min / 60);
  if (hr < 24) return t("admin.timeHour").replace("{n}", String(hr));
  const day = Math.floor(hr / 24);
  if (day < 7) return t("admin.timeDay").replace("{n}", String(day));
  return fmtDate(iso);
}

// action → { etiqueta, tono del badge }. Las destructivas (suspender, borrar, quitar
// verificación) van en warn; las afirmativas (verificar, reactivar) en sky; el resto neutro.
const ACTION_META = () => ({
  "user.role_change": { l: t("admin.actRoleChange"), tone: "navy" },
  "user.suspend": { l: t("admin.actSuspend"), tone: "warn" },
  "user.unsuspend": { l: t("admin.actUnsuspend"), tone: "sky" },
  "coach.verify": { l: t("admin.actCoachVerify"), tone: "sky" },
  "coach.unverify": { l: t("admin.actCoachUnverify"), tone: "warn" },
  "report.resolve": { l: t("admin.actReportResolve"), tone: "" },
  "course.delete": { l: t("admin.actCourseDelete"), tone: "warn" },
});
const AUDIT_TARGET_LABEL = () => ({
  user: t("admin.auditTargetUser"),
  report: t("admin.auditTargetReport"),
  course: t("admin.auditTargetCourse"),
});

function actionBadge(action) {
  const meta = ACTION_META()[action];
  if (!meta) return `<span class="badge">${esc(String(action || "—"))}</span>`;
  return `<span class="badge ${meta.tone}"><span class="dot"></span>${meta.l}</span>`;
}

/* ---------------- fila del rastro ---------------- */
// actorName y detail YA vienen escapados del servidor (contrato de escape) → se renderizan
// CRUDO. targetId es un id opaco del servidor (cuid) → seguro; se muestra recortado.
function auditRow(e) {
  const targetLabel = AUDIT_TARGET_LABEL()[e.targetType] || esc(String(e.targetType || t("admin.targetFallback")));
  const targetId = String(e.targetId || "");
  const shortId = targetId.length > 10 ? targetId.slice(0, 8) + "…" : targetId;
  return `
  <tr>
    <td class="faint" style="white-space:nowrap;font-size:12px">${esc(fmtWhen(e.when))}</td>
    <td><b style="font-size:13px">${e.actorName || "—"}</b></td>
    <td>${actionBadge(e.action)}</td>
    <td><span style="font-size:12.5px">${targetLabel}</span>${shortId ? ` <span class="chip soft" style="font-size:10.5px">${esc(shortId)}</span>` : ""}</td>
    <td style="font-size:12.5px;color:var(--text-2)">${e.detail || ""}</td>
  </tr>`;
}

/* ---------------- vista de la pestaña Auditoría ---------------- */
function auditBody() {
  const a = modState().audit;

  if (!a.loaded && a.loading) {
    return `
    <div class="card fade-up"><div class="empty">
      <div class="ill">${IC.shield || IC.doc}</div>
      <h4>${t("admin.auditLoadingHeading")}</h4>
      <p>${t("admin.auditLoadingBody")}</p>
    </div></div>`;
  }

  const entries = Array.isArray(a.entries) ? a.entries : [];
  if (!entries.length) {
    return `
    <div class="card fade-up"><div class="empty">
      <div class="ill">${IC.shield || IC.doc}</div>
      <h4>${t("admin.auditEmptyHeading")}</h4>
      <p>${t("admin.auditEmptyBody")}</p>
    </div></div>`;
  }

  return `
  <div class="card fade-up" style="--d:1">
    <div class="table-wrap scroll-m" style="border:0;border-radius:0;box-shadow:none">
      <table class="tbl">
        <thead><tr>
          <th>${t("admin.auditColWhen")}</th>
          <th>${t("admin.auditColWho")}</th>
          <th>${t("admin.auditColAction")}</th>
          <th>${t("admin.auditColTarget")}</th>
          <th>${t("admin.auditColDetail")}</th>
        </tr></thead>
        <tbody>${entries.map((e) => auditRow(e)).join("")}</tbody>
      </table>
    </div>
  </div>`;
}

/* ================= PANTALLA ================= */
S.adminConsole = {
  render(state) {
    const st = modState();
    const tab = activeTab();
    const reports = Array.isArray(st.reports) ? st.reports : [];
    const open = reports.filter((r) => String(r.status || "").toUpperCase() === "OPEN").length;

    // Barra de pestañas: Reportes (cola de moderación) | Auditoría (rastro F2.2).
    const tabsHtml = `
    <div class="tabs fade-up" style="--d:1" id="mod-tabs">
      ${TABS().map((tb) => `<button class="tab ${tb.k === tab ? "active" : ""}" data-mod-tab="${tb.k}"><span class="row vcenter" style="gap:6px"><span style="display:inline-flex;width:15px;height:15px">${IC[tb.ic] || ""}</span>${tb.l}</span></button>`).join("")}
    </div>`;

    const head = `
    <div class="page-head fade-up"><div>
      <p class="eyebrow">${t("admin.eyebrow")}</p>
      <h1 class="page-title">${t("admin.title")}</h1>
      <div class="page-sub">${t("admin.subtitle")}</div>
    </div></div>`;

    // Pestaña Auditoría: tabla del rastro + "cargar más" propio.
    if (tab === "audit") {
      const a = st.audit;
      const entries = Array.isArray(a.entries) ? a.entries : [];
      const more = (a.total || 0) > entries.length
        ? `<div class="row" style="justify-content:center;margin-top:16px"><button class="btn btn-soft btn-sm" id="audit-more">${t("admin.loadMore")} · ${entries.length} ${t("admin.ofConnector")} ${a.total}</button></div>`
        : "";
      return `${head}${tabsHtml}<div class="fade-up" style="--d:2" id="audit-body">${auditBody()}${more}</div>`;
    }

    // Pestaña Reportes (comportamiento original).
    return `${head}${tabsHtml}
    <div class="grid g-2 fade-up" style="--d:2;margin-bottom:18px">
      <div class="tile">${C.kpi(t("admin.kpiOpen"), String(open), { ic: "flag" })}</div>
      <div class="tile">${C.kpi(t("admin.kpiQueue"), String(st.total || reports.length), { ic: "doc" })}</div>
    </div>

    <div class="fade-up" style="--d:3" id="mod-body">${viewBody()}${(st.total || 0) > reports.length ? `<div class="row" style="justify-content:center;margin-top:16px"><button class="btn btn-soft btn-sm" id="mod-more">${t("admin.loadMore")} · ${reports.length} ${t("admin.ofConnector")} ${st.total}</button></div>` : ""}</div>`;
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
          w.toast?.((e && e.message) || t("admin.toastLoadError"), "danger");
        })
        .finally(() => {
          st.loading = false;
          repaint();
        });
    };

    // [F2.2] loadAudit(append): trae una página del rastro. append=true concatena la siguiente
    // (page++) para "cargar más"; si no, reemplaza. On-demand — solo al abrir la pestaña.
    const loadAudit = (append) => {
      const a = st.audit;
      a.loading = true;
      const page = append ? (a.page || 1) + 1 : 1;
      w.api(`/api/admin/audit?page=${page}&take=${AUDIT_TAKE}`, null, "GET")
        .then((d) => {
          const rows = Array.isArray(d && d.entries) ? d.entries : [];
          a.entries = append ? [...(Array.isArray(a.entries) ? a.entries : []), ...rows] : rows;
          a.total = d && typeof d.total === "number" ? d.total : a.entries.length;
          a.page = page;
          a.loaded = true;
          a.error = false;
        })
        .catch((e) => {
          if (!append) a.entries = [];
          a.loaded = true;
          a.error = true;
          w.toast?.((e && e.message) || t("admin.auditErrLoad"), "danger");
        })
        .finally(() => {
          a.loading = false;
          repaint();
        });
    };

    // Carga inicial de la pestaña ACTIVA (una sola vez por pestaña). El rastro no se carga en
    // el mount de la consola: solo cuando el admin abre la pestaña Auditoría.
    const tab = activeTab();
    if (tab === "audit") {
      if (!st.audit.loaded && !st.audit.loading) { loadAudit(false); return; }
    } else if (!st.loaded && !st.loading) {
      load(false); return;
    }

    // Cambio de pestaña (Reportes ↔ Auditoría). El repaint dispara la carga on-demand del rastro.
    root.querySelectorAll("[data-mod-tab]").forEach((el) =>
      el.addEventListener("click", (e) => {
        e.preventDefault();
        const next = el.getAttribute("data-mod-tab") || "reports";
        if (st.tab === next) return;
        st.tab = next;
        repaint();
      })
    );

    // [F2.2] Cargar más entradas del rastro (paginación por página).
    root.querySelector("#audit-more")?.addEventListener("click", (e) => {
      const b = e.currentTarget; if (b) { b.disabled = true; b.textContent = t("admin.loadingProgress"); }
      loadAudit(true);
    });

    // Resuelve un reporte: PATCH status → mutación local + toast + re-render.
    const resolve = async (btn, id, status) => {
      if (!id) return;
      const label = status === "REVIEWED" ? t("admin.markingProgress") : t("admin.dismissingProgress");
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
          w.toast?.(t("admin.toastDismissed"), "ok");
        } else {
          (Array.isArray(st.reports) ? st.reports : []).forEach((r) => {
            if (r.id === id) r.status = "REVIEWED";
          });
          w.toast?.(t("admin.toastReviewed"), "ok");
        }
        repaint();
      } catch (e) {
        w.toast?.((e && e.message) || t("admin.toastUpdateError"), "danger");
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
        btn.textContent = t("admin.suspendConfirm");
        setTimeout(() => {
          if (btn.isConnected && btn.getAttribute("data-armed") === "1") { btn.removeAttribute("data-armed"); btn.textContent = t0; }
        }, 4000);
        return;
      }
      btn.disabled = true;
      btn.textContent = t("admin.suspendingProgress");
      try {
        await w.api("/api/reports", { reportId: id, action: "suspend" }, "PATCH");
        (Array.isArray(st.reports) ? st.reports : []).forEach((r) => { if (r.id === id) r.status = "REVIEWED"; });
        w.toast?.(t("admin.toastSuspended"), "ok");
        repaint();
      } catch (e) {
        w.toast?.((e && e.message) || t("admin.toastSuspendError"), "danger");
        btn.disabled = false;
        btn.removeAttribute("data-armed");
        btn.textContent = t("admin.suspendUser");
      }
    };
    root.querySelectorAll("[data-rep-suspend]").forEach((btn) =>
      btn.addEventListener("click", () => suspendUser(btn, btn.getAttribute("data-rep-suspend")))
    );

    // [ENT-01] Cargar más reportes (paginación).
    root.querySelector("#mod-more")?.addEventListener("click", (e) => {
      const b = e.currentTarget; if (b) { b.disabled = true; b.textContent = t("admin.loadingProgress"); }
      load(true);
    });
  },
};
