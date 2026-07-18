// @ts-nocheck
/* OTR · Admin → Métricas de negocio (PRD §3.3 admin console). Pantalla role-scoped ADMIN.
   No lee DB.* : en mount hace window.api('/api/admin/metrics','GET') y pinta un snapshot
   agregado (usuarios por rol, embudo de alumnos, registros por semana, reservas, GMV
   simulado por escrow, debates y membresías). Resuelve el hueco de que el fundador no
   podía responder "¿cómo va OTR?" sin entrar a la base de datos a mano.

   Patrón de la casa: render(state)->string + mount(root,state); IC.* iconos, C.kpi/C.bar,
   navy + sky, fade-up; nada de emojis. Cliente vía globales de Aula.tsx: api(url,body,method). */
import { C } from "./components";
import { esc } from "./esc";
import { IC } from "./icons";
import { t, getLang, registerDict } from "./i18n";
// [F4.1] Registra el diccionario de esta pantalla en SU chunk (fuera del inicial): am.* (directo) + au.*/mb.* (compartidos con otras vistas admin). Ver app/lib/i18n.ts.
import { dict as d_am } from "./i18n-keys/am";
import { dict as d_au } from "./i18n-keys/au";
import { dict as d_mb } from "./i18n-keys/mb";
registerDict(d_am);
registerDict(d_au);
registerDict(d_mb);
import { money } from "./money";

export const S = {};

/* ---------------- estado del cliente (window.__adminMetrics) ---------------- */
function metricsState() {
  const w = window as any;
  if (!w.__adminMetrics) w.__adminMetrics = { loaded: false, loading: false, error: false, data: null };
  return w.__adminMetrics;
}

/* ---------------- labels ---------------- */
const ROLE_ORDER = ["STUDENT", "PARENT", "TEACHER", "COACH", "ADMIN"];
const ROLE_LABEL = {
  STUDENT: t("au.roleStudent"),
  PARENT: t("au.roleParent"),
  TEACHER: t("au.roleTeacher"),
  COACH: t("au.roleCoach"),
  ADMIN: t("au.roleAdmin"),
};
const TIER_ORDER = ["free", "pro", "elite"];
const TIER_LABEL = { free: t("am.tierFree"), pro: t("am.tierPro"), elite: t("am.tierElite") };
const STATUS_ORDER = ["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED", "DISPUTED"];
const STATUS_LABEL = {
  PENDING: t("mb.statusPending"),
  CONFIRMED: t("mb.statusConfirmed"),
  COMPLETED: t("mb.statusCompleted"),
  CANCELLED: t("mb.statusCancelled"),
  DISPUTED: t("mb.statusDisputed"),
};

const fmtNum = (n) => (Number(n) || 0).toLocaleString(getLang() === "en" ? "en" : "es");
function fmtWeek(iso) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  try {
    return d.toLocaleDateString(getLang() === "en" ? "en" : "es", { day: "numeric", month: "short" });
  } catch {
    return String(iso).slice(5, 10);
  }
}

// Ordena las llaves de un objeto counts por un orden preferido; agrega las que no
// estén en ese orden al final (nunca esconde un valor nuevo del backend).
function orderedEntries(obj, order) {
  const seen = new Set();
  const rows = [];
  for (const k of order) {
    if (obj[k] != null) { rows.push([k, obj[k]]); seen.add(k); }
  }
  for (const k of Object.keys(obj)) if (!seen.has(k)) rows.push([k, obj[k]]);
  return rows;
}

/* ---------------- tabla pequeña (rol / plan / estado) ---------------- */
function miniTable(title, ic, rows, labelMap, thLabel, thCount) {
  const body = rows.length
    ? rows.map(([k, v]) => `<tr><td>${labelMap[k] || k}</td><td class="num tnum">${fmtNum(v)}</td></tr>`).join("")
    : `<tr><td colspan="2" class="faint" style="text-align:center;padding:16px 0">${t("am.tableEmpty")}</td></tr>`;
  return `
  <div class="card fade-up">
    <div class="card-head"><h3 class="row vcenter" style="gap:8px"><span style="display:inline-flex;width:16px;height:16px">${IC[ic]}</span>${title}</h3></div>
    <div class="table-wrap" style="border:0;border-radius:0;box-shadow:none">
      <table class="tbl">
        <thead><tr><th>${thLabel}</th><th class="num">${thCount}</th></tr></thead>
        <tbody>${body}</tbody>
      </table>
    </div>
  </div>`;
}

/* ---------------- card embudo de alumnos ---------------- */
function funnelCard(funnel) {
  const total = Math.max(0, Number(funnel.studentsTotal) || 0);
  const steps = [
    { l: t("am.funnelStudents"), v: funnel.studentsTotal },
    { l: t("am.funnelPlaced"), v: funnel.placed },
    { l: t("am.funnelEnrolled"), v: funnel.enrolled },
    // [R6] Activación real: ≥1 acción core alguna vez (el "aha" medible, no el registro).
    { l: t("am.funnelFirstAction"), v: funnel.firstCoreAction },
    { l: t("am.funnelBooked"), v: funnel.booked },
  ];
  const rows = steps
    .map((s) => {
      const v = Math.max(0, Number(s.v) || 0);
      const pct = total > 0 ? Math.round((v / total) * 100) : 0;
      return `
      <div class="comp-row">
        <span class="cr-name">${s.l}</span>
        <span class="cr-bar">${C.bar(pct, { cls: "navy" })}</span>
        <span class="cr-score" style="width:96px"><b class="tnum">${fmtNum(v)}</b> <span class="faint" style="font-size:11px;font-weight:400">· ${pct}%</span></span>
      </div>`;
    })
    .join("");
  return `
  <div class="card card-pad fade-up" style="--d:2">
    <b style="font-size:14px">${t("am.funnelTitle")}</b>
    <p class="faint" style="font-size:12px;margin-top:2px">${t("am.funnelSub")}</p>
    <div style="margin-top:8px">${rows}</div>
  </div>`;
}

/* ---------------- card registros por semana ---------------- */
function weeklyCard(weeks) {
  const max = Math.max(1, ...weeks.map((w) => Number(w.count) || 0));
  const allZero = weeks.every((w) => !w.count);
  const bars = weeks
    .map((w) => {
      const v = Number(w.count) || 0;
      const h = Math.max(2, Math.round((v / max) * 100));
      return `
      <div style="display:flex;flex-direction:column;align-items:center;gap:6px;flex:1;min-width:0">
        <span class="tnum" style="font-size:11px;font-weight:700">${v}</span>
        <div style="width:100%;max-width:26px;height:72px;display:flex;align-items:flex-end">
          <div style="width:100%;height:${h}%;min-height:2px;background:linear-gradient(180deg,var(--otr-green-text),var(--otr-green));border-radius:3px 3px 0 0"></div>
        </div>
        <span class="faint" style="font-size:10px;white-space:nowrap">${fmtWeek(w.weekStart)}</span>
      </div>`;
    })
    .join("");
  return `
  <div class="card card-pad fade-up" style="--d:3">
    <b style="font-size:14px">${t("am.weeklyTitle")}</b>
    <p class="faint" style="font-size:12px;margin-top:2px">${t("am.weeklySub")}</p>
    <div style="display:flex;align-items:flex-end;gap:6px;margin-top:16px">${bars}</div>
    ${allZero ? `<p class="faint" style="font-size:12px;margin-top:10px;text-align:center">${t("am.weeklyEmpty")}</p>` : ""}
  </div>`;
}

/* ---------------- body por estado ---------------- */
function viewBody() {
  const st = metricsState();

  if (!st.loaded && st.loading) {
    return `
    <div class="card fade-up"><div class="empty">
      <div class="ill">${IC.chart}</div>
      <h4>${t("am.loadingTitle")}</h4>
      <p>${t("am.loadingBody")}</p>
    </div></div>`;
  }

  if (st.error || !st.data) {
    return `
    <div class="card fade-up"><div class="empty">
      <div class="ill">${IC.flag}</div>
      <h4>${t("am.errLoad")}</h4>
    </div></div>`;
  }

  const d = st.data;
  const usersByRole = d.usersByRole || {};
  const funnel = d.funnel || { studentsTotal: 0, placed: 0, enrolled: 0, booked: 0, firstCoreAction: 0 };
  // [R6] North Star con definición viajando en el payload (nunca un número sin contexto).
  const northStar = d.northStar || { activeStudentsWeek: 0, definition: "" };
  const bookings = d.bookings || { total: 0, byStatus: {}, gmvCents: 0 };
  const debates = d.debates || { total: 0, pending: 0, approved: 0, rejected: 0 };
  const courses = d.courses || { published: 0, enrollments: 0 };
  const membership = d.membership || {};
  const tournaments = d.tournaments || { total: 0, registrations: 0 };
  const weeks = Array.isArray(d.registrationsByWeek) ? d.registrationsByWeek : [];
  const totalUsers = Object.values(usersByRole).reduce((a, b) => a + (Number(b) || 0), 0);

  return `
  <div class="grid g-4 fade-up" style="--d:1;margin-bottom:18px">
    <div class="tile tile--hero otr-shine" title="${esc(northStar.definition)}">${C.kpi(t("am.northStar"), fmtNum(northStar.activeStudentsWeek), { ic: "check", accent: "var(--otr-green-text)" })}</div>
    <div class="tile">${C.kpi(t("am.kpiUsers"), fmtNum(totalUsers), { ic: "users" })}</div>
    <div class="tile tile--hero-gold otr-shine">${C.kpi(t("am.kpiGmv"), money(bookings.gmvCents), { ic: "star", accent: "var(--otr-gold-text)" })}</div>
    <div class="tile">${C.kpi(t("am.kpiBookings"), fmtNum(bookings.total), { ic: "calendar" })}</div>
    <div class="tile">${C.kpi(t("am.kpiDebatesPending"), fmtNum(debates.pending), { ic: "flag" })}</div>
  </div>

  <div class="grid g-2" style="margin-bottom:18px">
    ${funnelCard(funnel)}
    ${weeklyCard(weeks)}
  </div>

  <div class="grid g-3 fade-up" style="--d:4;margin-bottom:18px">
    ${miniTable(t("am.usersByRoleTitle"), "users", orderedEntries(usersByRole, ROLE_ORDER), ROLE_LABEL, t("am.thRole"), t("am.thCountUsers"))}
    ${miniTable(t("am.membershipTitle"), "star", orderedEntries(membership, TIER_ORDER), TIER_LABEL, t("am.thTier"), t("am.thCountUsers"))}
    ${miniTable(t("am.bookingsByStatusTitle"), "calendar", orderedEntries(bookings.byStatus || {}, STATUS_ORDER), STATUS_LABEL, t("am.thStatus"), t("am.thCountBookings"))}
  </div>

  <div class="grid g-4 fade-up" style="--d:5">
    <div class="tile">${C.kpi(t("am.kpiCoursesPublished"), fmtNum(courses.published), { ic: "book" })}</div>
    <div class="tile">${C.kpi(t("am.kpiEnrollments"), fmtNum(courses.enrollments), { ic: "grid" })}</div>
    <div class="tile">${C.kpi(t("am.kpiTournaments"), fmtNum(tournaments.total), { ic: "trophy" })}</div>
    <div class="tile">${C.kpi(t("am.kpiTournamentRegs"), fmtNum(tournaments.registrations), { ic: "medal" })}</div>
  </div>`;
}

/* ================= PANTALLA ================= */
S.adminMetrics = {
  render(state) {
    return `
    <div class="page-head fade-up"><div>
      <p class="eyebrow">${t("am.eyebrow")}</p>
      <h1 class="page-title">${t("am.title")}</h1>
      <div class="page-sub">${t("am.subtitle")}</div>
    </div></div>

    <!-- [F6.4] Export CSV de entidades de negocio (descarga directa; filename datado en servidor). -->
    <div class="row fade-up" style="--d:1;margin-bottom:14px;justify-content:flex-end;gap:8px">
      <a class="btn btn-ghost btn-sm" href="/api/admin/export?entity=enrollments" download>${IC.doc} ${t("am.exportEnrollments")}</a>
      <a class="btn btn-ghost btn-sm" href="/api/admin/export?entity=bookings" download>${IC.doc} ${t("am.exportBookings")}</a>
    </div>

    <div class="fade-up" style="--d:1" id="am-body">${viewBody()}</div>`;
  },

  mount(root, state) {
    const w = window;
    const st = metricsState();

    const repaint = () => {
      const page = root.querySelector(".page");
      if (!page) return;
      page.innerHTML = S.adminMetrics.render(state);
      S.adminMetrics.mount(root, state);
    };

    if (st.loaded || st.loading) return;

    st.loading = true;
    w.api("/api/admin/metrics", null, "GET")
      .then((d) => {
        st.data = d || {};
        st.error = false;
        st.loaded = true;
      })
      .catch((e) => {
        st.data = null;
        st.error = true;
        st.loaded = true;
        w.toast?.((e && e.message) || t("am.errLoad"), "danger");
      })
      .finally(() => {
        st.loading = false;
        repaint();
      });
  },
};
