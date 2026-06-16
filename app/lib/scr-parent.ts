// @ts-nocheck
/* OTR · Parent Portal (PRD §11) — S.parentPortal. Rol PARENT, role-scoped.
   Tono "proof and peace of mind": pruebas claras del progreso del hijo +
   tranquilidad total sobre seguridad, consentimiento y gasto.

   Datos:
     DB.parent = { children:[{ name, initials, level, ageBand,
       skillDeltas:[{name,delta}], attendance:{attended,scheduled},
       achievements:[...], upcoming:[...], spendCents,
       pendingConsents:[{bookingId,coachName,slotLabel,priceLabel}] }] }
   Fallback si DB.parent aún no llega del backend: GET /api/guardianship
   (vínculos reales parent↔student) para mostrar al menos a los hijos.
   Acciones: Aprobar/Rechazar → PATCH /api/bookings/[id] { status };
   Vincular hijo → POST /api/guardianship { email }.

   Patrón de la casa: render(state)->string + mount(root,state); IC.* iconos,
   esc() para texto del usuario, navy + sky, fade-up; nada de emojis. */
import { DB } from "./data";
import { C } from "./components";
import { IC } from "./icons";
import { esc } from "./esc";

export const S = {};

/* ---------------- helpers ---------------- */
const money = (cents) => {
  const v = (Number(cents) || 0) / 100;
  return `$${v % 1 ? v.toFixed(2) : v.toFixed(0)}`;
};
const ini = (name) => (String(name || "?").split(" ").map((w) => w[0]).join("") || "?").slice(0, 2).toUpperCase();
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/* ---------------- normalización (defensiva) ---------------- */
function normChild(k = {}) {
  const att = k.attendance || {};
  const pp = k.publicProfile || {};
  return {
    id: k.id || k.childId || (k.student && k.student.id) || "",
    name: k.name || (k.student && k.student.name) || "Estudiante",
    initials: k.initials || (k.student && k.student.initials) || ini(k.name || (k.student && k.student.name)),
    level: k.level || (k.student && k.student.level) || "Novato",
    ageBand: k.ageBand || (k.student && k.student.ageBand) || "",
    // §8.4: perfil público del hijo — el padre da el consentimiento desde aquí.
    publicProfile: { enabled: !!pp.enabled, slug: pp.slug || null },
    linkStatus: k.linkStatus || k.status || "ACTIVE",
    skillDeltas: Array.isArray(k.skillDeltas) ? k.skillDeltas : [],
    attendance: { attended: Number(att.attended) || 0, scheduled: Number(att.scheduled) || 0 },
    achievements: Array.isArray(k.achievements) ? k.achievements : [],
    upcoming: Array.isArray(k.upcoming) ? k.upcoming : [],
    spendCents: Number(k.spendCents) || 0,
    pendingConsents: Array.isArray(k.pendingConsents) ? k.pendingConsents : [],
    // PRD §11.3: umbral de auto-aprobación por hijo. null = aprobar cada reserva;
    // N centavos = auto-aprueba bajo N; consentLevel 'full' = confianza total.
    approveUnderCents: k.approveUnderCents == null ? null : Number(k.approveUnderCents),
    consentLevel: k.consentLevel || "full",
  };
}
// DB.parent (contrato completo) → fallback de window.__parentFallback (GET /api/guardianship).
function getChildren() {
  const p = DB.parent;
  if (p && Array.isArray(p.children)) return p.children.map(normChild);
  const fb = (window).__parentFallback;
  if (fb && Array.isArray(fb)) return fb.map(normChild);
  return null; // aún no sabemos (primer render antes del fetch)
}

/* ---------------- membresía + umbral de aprobación (PRD §11.3) ---------------- */
// El padre es el payer: plan de membresía (lee DB.membership.tier) + umbral de
// auto-aprobación por hijo (PATCH /api/guardianship). Opciones del selector → el
// valor que viaja al backend; 'full' usa consentLevel en vez de approveUnderCents.
const TIER_LABELS = { free: "Free", pro: "OTR Pro", elite: "OTR Elite" };
function membershipTier() {
  const m = DB.membership || {};
  const t = String(m.tier || "free").toLowerCase();
  return { key: t, label: TIER_LABELS[t] || "Free", sinceLabel: m.sinceLabel || "" };
}
const THRESHOLD_OPTIONS = [
  { v: "each", label: "Aprobar cada reserva", cents: null, full: false },
  { v: "25", label: "Auto hasta $25", cents: 2500, full: false },
  { v: "50", label: "Auto hasta $50", cents: 5000, full: false },
  { v: "full", label: "Confianza total", cents: 999999, full: true },
];
// Valor actual de un hijo → la opción del selector que le corresponde.
function thresholdValueFor(child) {
  if (String(child.consentLevel || "").toLowerCase() === "full") return "full";
  const c = child.approveUnderCents;
  if (c == null) return "each";
  if (Number(c) >= 999999) return "full";
  if (Number(c) >= 5000) return "50";
  if (Number(c) >= 2500) return "25";
  return "each";
}

function achLabel(a) {
  if (typeof a === "string") return a;
  return (a && (a.name || a.title || a.label)) || "";
}
function upcomingLabel(u) {
  if (typeof u === "string") return { t: u, d: "" };
  const t = (u && (u.title || u.coachName || u.coach)) || "Sesión 1:1";
  const d = (u && (u.slotLabel || u.when || u.label)) || "";
  return { t, d };
}

/* ---------------- bloques ---------------- */
function consentRow(child, pc, i) {
  return `
  <div class="lrow fade-up" style="padding:12px 0;gap:12px;border-bottom:1px solid var(--border);--d:${i}">
    <div class="notif-ic warn" style="width:38px;height:38px;border-radius:10px;flex:none">${IC.lock}</div>
    <div style="flex:1;min-width:0">
      <b style="font-size:13.5px">${esc(child.name)} quiere reservar con ${esc(pc.coachName || "un coach")}</b>
      <div class="faint" style="font-size:12px;margin-top:2px">${esc(pc.slotLabel || "")}${pc.priceLabel ? ` · ${esc(pc.priceLabel)}` : ""}</div>
    </div>
    <div class="row" style="gap:6px;flex:none">
      <button class="btn btn-primary btn-sm" data-consent="${esc(pc.bookingId)}" data-act="ok">${IC.check} Aprobar</button>
      <button class="btn btn-ghost btn-sm" data-consent="${esc(pc.bookingId)}" data-act="no">Rechazar</button>
    </div>
  </div>`;
}

function childCard(k, i) {
  const att = k.attendance;
  const pct = att.scheduled > 0 ? Math.round((att.attended / att.scheduled) * 100) : 0;
  const pendingLink = String(k.linkStatus).toUpperCase() === "PENDING";
  return `
  <div class="card card-pad fade-up" style="--d:${i + 1}">
    <div class="row vcenter wrap" style="gap:10px">
      ${C.avatar(esc(k.initials), { size: "lg", bg: "var(--otr-navy)" })}
      <div style="flex:1;min-width:0">
        <div class="row vcenter wrap" style="gap:8px">
          <b style="font-size:15px">${esc(k.name)}</b>
          ${C.levelBadge(k.level)}
          ${k.ageBand === "minor" ? `<span class="badge sky"><span style="display:inline-flex;width:12px;height:12px">${IC.lock}</span>Menor — protegido</span>` : ""}
          ${pendingLink ? `<span class="badge warn"><span class="dot"></span>Esperando su consentimiento</span>` : ""}
        </div>

      </div>
      <div style="text-align:right;flex:none">
        <span class="faint" style="font-size:11px;display:block">Gasto del mes</span>
        <b class="brand-font" style="font-size:18px;font-weight:800">${money(k.spendCents)}</b>
      </div>
    </div>

    <div class="divider"></div>

    <b style="font-size:13px">Crecimiento de habilidades</b>
    ${k.skillDeltas.length
      ? `<div class="row wrap" style="gap:6px;margin-top:8px">${k.skillDeltas.map((s) => {
          const d = Number(s.delta) || 0;
          return `<span class="badge ${d >= 0 ? "ok" : "warn"}">${esc(s.name)} ${d >= 0 ? "+" : ""}${d}</span>`;
        }).join("")}</div>`
      : `<p class="faint" style="font-size:12px;margin-top:6px">Las evaluaciones del coach aparecerán aquí tras las primeras sesiones.</p>`}

    <div class="divider"></div>

    <div class="row between vcenter"><b style="font-size:13px">Asistencia</b>
      <span class="faint" style="font-size:12px">${att.attended} de ${att.scheduled} sesiones asistidas</span></div>
    <div style="margin-top:8px">${C.bar(pct)}</div>

    ${k.achievements.length ? `
    <div class="divider"></div>
    <b style="font-size:13px">Logros y certificaciones</b>
    <div class="row wrap" style="gap:6px;margin-top:8px">
      ${k.achievements.slice(0, 6).map((a) => `<span class="badge"><span style="display:inline-flex;width:12px;height:12px">${IC.medal}</span>${esc(achLabel(a))}</span>`).join("")}
    </div>` : ""}

    <div class="divider"></div>
    <b style="font-size:13px">Próximas sesiones</b>
    ${k.upcoming.length
      ? `<div class="stack" style="gap:4px;margin-top:6px">${k.upcoming.slice(0, 4).map((u) => {
          const x = upcomingLabel(u);
          return `<div class="lrow" style="padding:8px 0;gap:10px">
            <span style="display:inline-flex;width:16px;height:16px;color:var(--otr-sky-lo);flex:none">${IC.calendar}</span>
            <span style="flex:1;min-width:0;font-size:12.5px;font-weight:600">${esc(x.t)}</span>
            ${x.d ? `<span class="faint" style="font-size:12px;flex:none">${esc(x.d)}</span>` : ""}
            ${u.id ? `<button class="btn btn-ghost btn-sm" data-pcancel="${esc(u.id)}" style="flex:none;color:var(--danger);padding:2px 9px;font-size:12px">Cancelar</button>` : ""}
          </div>`;
        }).join("")}</div>`
      : `<p class="faint" style="font-size:12px;margin-top:6px">Sin sesiones agendadas — explora coaches con tu hijo/a desde el marketplace.</p>`}
  </div>`;
}

function linkForm(compact = false) {
  return `
  <div class="field" style="margin-bottom:10px">
    <label class="label">Correo del estudiante</label>
    <input class="input" id="gp-email" type="email" placeholder="estudiante@correo.com" maxlength="160"/>
  </div>
  <button class="btn btn-primary ${compact ? "btn-sm " : ""}btn-block" id="gp-link">${IC.plus} Vincular estudiante</button>
  <p class="faint" style="font-size:11.5px;margin-top:8px;line-height:1.5">Si tu hijo/a es menor, el vínculo se activa de inmediato. Si es adulto, deberá aceptar tu solicitud.</p>`;
}

/* ---------------- Reporte mensual (PRD §11.1/§11.2) ---------------- */
// Estado del widget de reporte (vive en window para sobrevivir a los repaints).
function rstate() {
  const w = window;
  w.__parentReport = w.__parentReport || { lang: "es", report: null, sel: "", loading: false, error: "" };
  return w.__parentReport;
}

// Tarjeta lateral: selector de hijo (si hay varios) + botón "Ver reporte de {mes}".
function reportCard(kids) {
  const withId = kids.filter((k) => k.id);
  const months = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  const monthLabel = months[new Date().getMonth()];
  if (!withId.length) {
    return `
    <div class="card card-pad fade-up" style="--d:3;background:linear-gradient(140deg,var(--otr-pale),#fff)">
      <b style="font-size:13.5px">Reporte mensual</b>
      <p class="muted" style="font-size:12.5px;margin-top:6px">Cuando tu hijo/a tenga sesiones registradas, aquí podrás abrir su resumen del mes — asistencia, habilidades, logros y gasto — listo para imprimir.</p>
    </div>`;
  }
  const st = rstate();
  if (!st.sel || !withId.some((k) => k.id === st.sel)) st.sel = withId[0].id;
  return `
  <div class="card card-pad fade-up" style="--d:3;background:linear-gradient(140deg,var(--otr-pale),#fff)" id="pr-card">
    <b style="font-size:13.5px">Reporte mensual</b>
    <p class="muted" style="font-size:12.5px;margin-top:6px">Resumen del mes con asistencia, crecimiento de habilidades, logros y gasto. Cada fin de mes también llega por correo.</p>
    ${withId.length > 1 ? `
    <div class="field" style="margin-top:10px;margin-bottom:0">
      <label class="label">Hijo/a</label>
      <select class="input" id="pr-child">
        ${withId.map((k) => `<option value="${esc(k.id)}"${k.id === st.sel ? " selected" : ""}>${esc(k.name)}</option>`).join("")}
      </select>
    </div>` : ""}
    <button class="btn btn-primary btn-sm btn-block" style="margin-top:10px" id="pr-open">${IC.chart} Ver reporte de ${esc(monthLabel)}</button>
  </div>`;
}

// Render del cuerpo del reporte para un idioma (es|en). Devuelve innerHTML del modal.
function reportBody(report, lang) {
  const r = lang === "en" ? report.en : report.es;
  const L = r.labels;
  const att = r.attendance || { attended: 0, scheduled: 0, pct: 0 };
  const skills = Array.isArray(r.skills) ? r.skills : [];
  const ach = Array.isArray(r.achievements) ? r.achievements : [];
  const otherLang = lang === "en" ? "es" : "en";
  const otherLabel = lang === "en" ? "ES" : "EN";

  const skillsBlock = skills.length
    ? `<div class="stack" style="gap:8px;margin-top:8px">
        ${skills.map((s) => `
          <div class="row vcenter" style="gap:10px">
            <span style="flex:none;width:84px;font-size:12px;font-weight:600">${esc(s.name)}</span>
            <span style="flex:1">${C.bar(Math.max(0, Math.min(100, Number(s.score) || 0)))}</span>
            <span class="faint" style="flex:none;width:42px;text-align:right;font-size:12px">${Number(s.score) || 0}</span>
          </div>`).join("")}
      </div>`
    : `<p class="faint" style="font-size:12px;margin-top:6px">${esc(L.skillsEmpty)}</p>`;

  const achBlock = ach.length
    ? `<div class="row wrap" style="gap:6px;margin-top:8px">
        ${ach.map((a) => `<span class="badge"><span style="display:inline-flex;width:12px;height:12px">${IC.medal}</span>${esc(a.title)}</span>`).join("")}
      </div>`
    : `<p class="faint" style="font-size:12px;margin-top:6px">${esc(L.achievementsEmpty)}</p>`;

  return `
  <div id="pr-print">
    <div class="row between vcenter wrap" style="gap:10px">
      <div style="min-width:0">
        <b style="font-size:16px;display:block">${esc(r.title)}</b>
        <span class="faint" style="font-size:12.5px">${esc(r.subtitle)}</span>
      </div>
      <div class="row" style="gap:6px;flex:none" data-noprint>
        <button class="btn btn-soft btn-sm" id="pr-lang" data-lang="${otherLang}">${esc(otherLabel)}</button>
        <button class="btn btn-primary btn-sm" id="pr-print-btn">${esc(L.print)}</button>
      </div>
    </div>

    <p class="muted" style="font-size:12.5px;line-height:1.55;margin-top:10px">${esc(r.explanation)}</p>

    <div class="grid g-3" style="gap:10px;margin-top:12px">
      <div class="card card-pad" style="--d:0">
        <span class="faint" style="font-size:11px;display:block">${esc(L.level)}</span>
        <b class="brand-font" style="font-size:17px;font-weight:800">${esc(r.level)}</b>
      </div>
      <div class="card card-pad" style="--d:0">
        <span class="faint" style="font-size:11px;display:block">${esc(L.xp)}</span>
        <b class="brand-font" style="font-size:17px;font-weight:800">${Number(r.xp) || 0}</b>
      </div>
      <div class="card card-pad" style="--d:0">
        <span class="faint" style="font-size:11px;display:block">${esc(L.spend)}</span>
        <b class="brand-font" style="font-size:17px;font-weight:800">${esc(r.spendLabel)}</b>
      </div>
    </div>

    <div class="divider"></div>
    <div class="row between vcenter"><b style="font-size:13px">${esc(L.attendance)}</b>
      <span class="faint" style="font-size:12px">${esc(L.attendanceDetail)}</span></div>
    <div style="margin-top:8px">${C.bar(Number(att.pct) || 0)}</div>

    <div class="divider"></div>
    <b style="font-size:13px">${esc(L.skills)}</b>
    ${skillsBlock}

    <div class="divider"></div>
    <b style="font-size:13px">${esc(L.achievements)}</b>
    ${achBlock}

    <div class="divider"></div>
    <div class="row" style="gap:10px;align-items:flex-start">
      <span style="display:inline-flex;width:18px;height:18px;color:var(--otr-sky-lo);flex:none;margin-top:1px">${IC.levels}</span>
      <div style="min-width:0">
        <b style="font-size:13px;display:block">${esc(L.nextStep)}</b>
        <span class="muted" style="font-size:12.5px;line-height:1.5">${esc(r.nextStep)}</span>
      </div>
    </div>
  </div>`;
}

// PRD §11.3: tarjeta de Membresía y facturación (el padre es el payer) + control
// de umbral de aprobación por hijo. Plan actual desde DB.membership; umbral desde
// child.approveUnderCents / consentLevel (expuestos por queries.ts).
function membershipCard(kids) {
  const m = membershipTier();
  const planRow = `
    <div class="row between vcenter" style="gap:10px">
      <div style="min-width:0">
        <span class="faint" style="font-size:11px;display:block">Plan actual</span>
        <b class="brand-font" style="font-size:17px;font-weight:800">${esc(m.label)}</b>
        ${m.sinceLabel ? `<span class="faint" style="font-size:11.5px;display:block;margin-top:1px">${esc(m.sinceLabel)}</span>` : ""}
      </div>
      <button class="btn btn-soft btn-sm" data-go="membership" style="flex:none">Gestionar plan</button>
    </div>`;
  const thresholds = (kids || []).filter((k) => k.id).map((k) => {
    const cur = thresholdValueFor(k);
    const opts = THRESHOLD_OPTIONS.map((o) =>
      `<option value="${o.v}"${o.v === cur ? " selected" : ""}>${esc(o.label)}</option>`,
    ).join("");
    return `
    <div class="row between vcenter" style="gap:10px">
      <span style="font-size:12.5px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(k.name)}</span>
      <select class="select" data-threshold-child="${esc(k.id)}" style="flex:none;width:auto;font-size:12.5px;padding:5px 26px 5px 10px">${opts}</select>
    </div>`;
  }).join("");
  return `
  <div class="card card-pad fade-up" style="--d:2">
    <div class="row vcenter" style="gap:8px">
      <span style="display:inline-flex;width:15px;height:15px;color:var(--otr-sky-lo)">${IC.star}</span>
      <b style="font-size:13.5px">Membresía y facturación</b>
    </div>
    <div style="margin-top:10px">${planRow}</div>
    ${kids && kids.some((k) => k.id) ? `
    <div class="divider" style="margin:12px 0"></div>
    <b style="font-size:12.5px">Umbral de aprobación por hijo/a</b>
    <p class="muted" style="font-size:12px;margin-top:4px;line-height:1.5">Decide cuánto se puede reservar sin pedirte aprobación cada vez. El resto siempre pasa por ti.</p>
    <div class="stack" style="gap:8px;margin-top:8px">${thresholds}</div>` : ""}
  </div>`;
}

function emptyState() {
  return `
  <div class="split rail-340">
    <div class="card fade-up"><div class="empty">
      <div class="ill">${IC.users}</div>
      <h4>Vincula a tu hijo/a para empezar</h4>
      <p>Conecta su cuenta de estudiante con su correo y tendrás su progreso real, sus sesiones y cada aprobación en un solo lugar.</p>
      <div style="max-width:340px;margin:14px auto 0;text-align:left">${linkForm()}</div>
    </div></div>
    <div class="stack" style="gap:16px">
      <div class="card card-pad fade-up" style="--d:1">
        <b style="font-size:13.5px">Qué verás aquí</b>
        <div class="stack" style="gap:10px;margin-top:12px">
          ${[
            { ic: "levels", t: "Progreso real", d: "Nivel, habilidades y sus avances del mes." },
            { ic: "calendar", t: "Asistencia y sesiones", d: "Sesiones asistidas vs agendadas y lo que viene." },
            { ic: "lock", t: "Seguridad y consentimiento", d: "Cada reserva con un coach pasa por tu aprobación." },
            { ic: "chart", t: "Gasto claro", d: "Cuánto inviertes, con pagos protegidos en escrow." },
          ].map((x) => `<div class="row" style="gap:10px;align-items:flex-start">
            <span style="display:inline-flex;width:16px;height:16px;color:var(--otr-sky-lo);flex:none;margin-top:2px">${IC[x.ic]}</span>
            <span style="font-size:12.5px;line-height:1.5"><b>${x.t}</b> — <span class="muted">${x.d}</span></span>
          </div>`).join("")}
        </div>
      </div>
    </div>
  </div>`;
}

/* ---------------- pantalla ---------------- */
S.parentPortal = {
  render() {
    const kids = getChildren();
    const head = `
    <div class="page-head"><div>
      <p class="eyebrow">Portal de familia</p>
      <div class="page-title">Pruebas y tranquilidad</div>
      <div class="page-sub">El progreso real de tu hijo/a, cada sesión segura y cada peso bajo tu control</div>
    </div></div>`;

    if (kids === null) {
      return `${head}
      <div class="card fade-up"><div class="empty"><div class="ill">${IC.users}</div><h4>Cargando tu portal…</h4><p>Buscando a tus estudiantes vinculados.</p></div></div>`;
    }
    if (!kids.length) return `${head}${emptyState()}`;

    const consents = kids.flatMap((k) => k.pendingConsents.map((pc) => ({ child: k, pc })));
    const upcomingTotal = kids.reduce((s, k) => s + k.upcoming.length, 0);
    const spendTotal = kids.reduce((s, k) => s + k.spendCents, 0);

    return `${head}
    <div class="grid g-4 fade-up" style="margin-bottom:18px">
      ${C.kpi("Hijos vinculados", String(kids.length), { ic: "users" })}
      ${C.kpi("Próximas sesiones", String(upcomingTotal), { ic: "calendar" })}
      ${C.kpi("Aprobaciones pendientes", String(consents.length), { ic: "lock" })}
      ${C.kpi("Gasto del mes", money(spendTotal), { ic: "chart" })}
    </div>

    ${consents.length ? `
    <div class="card card-pad fade-up" style="border-color:var(--warn);margin-bottom:18px">
      <div class="row between vcenter">
        <b style="font-size:14px">Aprobaciones pendientes</b>
        <span class="badge warn"><span class="dot"></span>${consents.length} por revisar</span>
      </div>
      <p class="muted" style="font-size:12.5px;margin-top:4px">Ninguna sesión con coach se confirma sin tu aprobación.</p>
      <div class="stack" style="gap:0;margin-top:6px">${consents.map((x, i) => consentRow(x.child, x.pc, i)).join("")}</div>
    </div>` : ""}

    <div class="split rail-320">
      <div class="stack" style="gap:16px">
        ${kids.map(childCard).join("")}
      </div>
      <div class="stack" style="gap:16px">
        <div class="card card-pad fade-up" style="--d:1;border-color:var(--otr-sky)">
          <b style="font-size:13.5px">Seguridad y consentimiento</b>
          <div class="stack" style="gap:9px;margin-top:10px">
            ${[
              "Toda sesión 1:1 ocurre dentro de OTR — nunca por fuera.",
              "Las reservas de menores requieren tu aprobación.",
              "Los pagos quedan en escrow y se liberan al completar la sesión.",
            ].map((t) => `<div class="row" style="gap:8px;align-items:flex-start"><span style="display:inline-flex;width:14px;height:14px;color:var(--otr-sky-lo);flex:none;margin-top:2px">${IC.checkCircle}</span><span class="muted" style="font-size:12.5px;line-height:1.5">${t}</span></div>`).join("")}
          </div>
          ${kids.some((k) => k.id) ? `
          <div class="divider" style="margin:12px 0"></div>
          <b style="font-size:12.5px">Perfil público — requiere tu consentimiento</b>
          <p class="muted" style="font-size:12px;margin-top:4px">El perfil compartible de tu hijo/a está apagado por defecto. Tú decides si se publica.</p>
          <div class="stack" style="gap:8px;margin-top:8px">
            ${kids.filter((k) => k.id).map((k) => `
            <div class="row between vcenter" style="gap:10px">
              <span style="font-size:12.5px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(k.name)}${k.publicProfile.enabled && k.publicProfile.slug ? ` · <a href="/p/${esc(k.publicProfile.slug)}" target="_blank" rel="noopener" style="color:var(--otr-sky-lo)">ver</a>` : ""}</span>
              <button class="btn btn-sm ${k.publicProfile.enabled ? "btn-soft" : "btn-primary"}" data-pp-child="${esc(k.id)}" data-pp-next="${k.publicProfile.enabled ? "off" : "on"}" style="flex:none">
                ${k.publicProfile.enabled ? "Despublicar" : "Habilitar"}
              </button>
            </div>`).join("")}
          </div>` : ""}
        </div>
        <div class="card card-pad fade-up" style="--d:2">
          <b style="font-size:13.5px">Mensajes de coaches</b>
          <p class="muted" style="font-size:12.5px;margin-top:6px">Lo que los coaches ven en tu hijo/a, contado de primera mano — siempre dentro de OTR.</p>
          <button class="btn btn-soft btn-sm btn-block" style="margin-top:10px" data-go="messages">${IC.msg} Abrir mensajes</button>
        </div>
        ${membershipCard(kids)}
        ${reportCard(kids)}
        <div class="card card-pad fade-up" style="--d:4">
          <b style="font-size:13.5px">Vincular otro estudiante</b>
          <div style="margin-top:10px">${linkForm(true)}</div>
        </div>
      </div>
    </div>`;
  },

  mount(root, state) {
    const w = window;
    const repaint = () => {
      const page = root.querySelector(".page");
      if (!page) return;
      page.innerHTML = S.parentPortal.render(state);
      S.parentPortal.mount(root, state);
    };

    // Fallback: si el backend aún no hidrata DB.parent, leemos los vínculos reales.
    if (!(DB.parent && Array.isArray(DB.parent.children)) && !w.__parentFallback && !w.__parentLoading) {
      w.__parentLoading = true;
      w.api("/api/guardianship", null, "GET")
        .then((d) => {
          w.__parentFallback = Array.isArray(d && d.children) ? d.children : [];
        })
        .catch(() => { w.__parentFallback = []; })
        .finally(() => { w.__parentLoading = false; repaint(); });
    }

    // Aprobar / rechazar una reserva del hijo (PATCH /api/bookings/[id]).
    root.querySelectorAll("[data-consent]").forEach((btn) =>
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-consent");
        const approve = btn.getAttribute("data-act") === "ok";
        if (!id) return;
        btn.disabled = true;
        btn.textContent = approve ? "Aprobando…" : "Rechazando…";
        try {
          await w.api(`/api/bookings/${encodeURIComponent(id)}`, { status: approve ? "CONFIRMED" : "CANCELLED" }, "PATCH");
          // Actualización local sin re-fetch: quita el consentimiento de la lista.
          const lists = [];
          if (DB.parent && Array.isArray(DB.parent.children)) lists.push(...DB.parent.children);
          if (Array.isArray(w.__parentFallback)) lists.push(...w.__parentFallback);
          lists.forEach((k) => {
            if (Array.isArray(k.pendingConsents)) k.pendingConsents = k.pendingConsents.filter((pc) => pc.bookingId !== id);
          });
          w.toast?.(approve ? "Sesión aprobada — quedó confirmada" : "Reserva rechazada", approve ? "ok" : "warn");
          repaint();
        } catch (e) {
          w.toast?.((e && e.message) || "No se pudo actualizar la reserva", "danger");
          btn.disabled = false;
          btn.textContent = approve ? "Aprobar" : "Rechazar";
        }
      })
    );

    // [PARENT-1] Cancelar una sesión CONFIRMADA del hijo (el padre designado puede cancelar
    // según /api/bookings/[id]). Antes solo se podía aprobar/rechazar pendientes; una vez
    // confirmada no había salida. Confirmación de dos toques + mutación local + repaint.
    root.querySelectorAll("[data-pcancel]").forEach((btn) =>
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-pcancel");
        if (!id) return;
        if (btn.getAttribute("data-armed") !== "1") {
          btn.setAttribute("data-armed", "1");
          const t0 = btn.textContent;
          btn.textContent = "¿Cancelar? Tocar de nuevo";
          setTimeout(() => {
            if (btn.isConnected && btn.getAttribute("data-armed") === "1") { btn.removeAttribute("data-armed"); btn.textContent = t0; }
          }, 4000);
          return;
        }
        btn.disabled = true;
        btn.textContent = "Cancelando…";
        try {
          await w.api(`/api/bookings/${encodeURIComponent(id)}`, { status: "CANCELLED" }, "PATCH");
          const lists = [];
          if (DB.parent && Array.isArray(DB.parent.children)) lists.push(...DB.parent.children);
          if (Array.isArray(w.__parentFallback)) lists.push(...w.__parentFallback);
          lists.forEach((k) => { if (Array.isArray(k.upcoming)) k.upcoming = k.upcoming.filter((u) => u.id !== id); });
          w.toast?.("Sesión cancelada", "warn");
          repaint();
        } catch (e) {
          w.toast?.((e && e.message) || "No se pudo cancelar la sesión", "danger");
          btn.disabled = false;
          btn.removeAttribute("data-armed");
          btn.textContent = "Cancelar";
        }
      })
    );

    // §8.4: consentimiento del perfil público del hijo (POST /api/public-profile).
    root.querySelectorAll("[data-pp-child]").forEach((btn) =>
      btn.addEventListener("click", async () => {
        const studentId = btn.getAttribute("data-pp-child");
        const enabled = btn.getAttribute("data-pp-next") === "on";
        if (!studentId) return;
        btn.disabled = true;
        btn.textContent = enabled ? "Publicando…" : "Quitando…";
        try {
          const resp = await w.api("/api/public-profile", { enabled, studentId });
          const kidsArr = (DB.parent && DB.parent.children) || [];
          kidsArr.forEach((k) => {
            if (k.id === studentId || k.childId === studentId) {
              k.publicProfile = { enabled, slug: (resp && resp.slug) || (k.publicProfile && k.publicProfile.slug) || null };
            }
          });
          w.toast?.(enabled ? "Perfil público habilitado — tú tienes el control" : "Perfil público despublicado", "ok");
          repaint();
        } catch (e) {
          w.toast?.((e && e.message) || "No se pudo actualizar el perfil público", "danger");
          btn.disabled = false;
          btn.textContent = enabled ? "Habilitar" : "Despublicar";
        }
      })
    );

    // PRD §11.3: umbral de auto-aprobación por hijo (PATCH /api/guardianship).
    // 'each' → null (aprobar cada reserva); '25'/'50' → centavos; 'full' →
    // 999999 + consentLevel:'full' (confianza total). Actualización local + toast.
    root.querySelectorAll("[data-threshold-child]").forEach((sel) =>
      sel.addEventListener("change", async () => {
        const studentId = sel.getAttribute("data-threshold-child");
        const opt = THRESHOLD_OPTIONS.find((o) => o.v === sel.value) || THRESHOLD_OPTIONS[0];
        if (!studentId) return;
        sel.disabled = true;
        try {
          const body = { studentId, approveUnderCents: opt.cents };
          if (opt.full) body.consentLevel = "full";
          await w.api("/api/guardianship", body, "PATCH");
          // Actualización local sin re-fetch: refleja el nuevo umbral en el hijo.
          const lists = [];
          if (DB.parent && Array.isArray(DB.parent.children)) lists.push(...DB.parent.children);
          if (Array.isArray(w.__parentFallback)) lists.push(...w.__parentFallback);
          lists.forEach((k) => {
            if (k.id === studentId || k.childId === studentId) {
              k.approveUnderCents = opt.cents;
              if (opt.full) k.consentLevel = "full";
              else if (k.consentLevel === "full") k.consentLevel = "progress_only";
            }
          });
          w.toast?.(`Umbral actualizado — ${opt.label}`, "ok");
        } catch (e) {
          w.toast?.((e && e.message) || "No se pudo actualizar el umbral", "danger");
        } finally {
          sel.disabled = false;
        }
      })
    );

    // Vincular hijo/a por correo (POST /api/guardianship).
    const link = root.querySelector("#gp-link");
    link?.addEventListener("click", async () => {
      const input = root.querySelector("#gp-email");
      const email = (input && input.value ? input.value : "").trim().toLowerCase();
      if (!EMAIL_RE.test(email)) { w.toast?.("Escribe un correo válido", "warn"); return; }
      link.disabled = true;
      link.textContent = "Vinculando…";
      try {
        const d = await w.api("/api/guardianship", { email, studentEmail: email });
        const g = d && d.guardianship;
        const pending = g && String(g.status).toUpperCase() === "PENDING";
        w.toast?.(
          d && d.already ? "Ese estudiante ya estaba vinculado"
            : pending ? "Solicitud enviada — falta el consentimiento del estudiante"
            : "Estudiante vinculado",
          "ok"
        );
        // Refresca la lista real de vínculos y repinta.
        try {
          const fresh = await w.api("/api/guardianship", null, "GET");
          w.__parentFallback = Array.isArray(fresh && fresh.children) ? fresh.children : w.__parentFallback;
        } catch (e2) { /* silencioso */ }
        repaint();
      } catch (e) {
        w.toast?.((e && e.message) || "No se pudo vincular al estudiante", "danger");
        link.disabled = false;
        link.innerHTML = `${IC.plus} Vincular estudiante`;
      }
    });

    // --- Reporte mensual (PRD §11.1/§11.2): selector de hijo + abrir modal ---
    const prChild = root.querySelector("#pr-child");
    prChild?.addEventListener("change", () => { rstate().sel = prChild.value; });

    // Abre el reporte en un modal propio (con toggle ES/EN e impresión).
    function openReportModal(report) {
      const st = rstate();
      const scrim = document.createElement("div");
      scrim.className = "modal-scrim";
      const paint = () => {
        scrim.innerHTML = `<div class="modal" role="dialog" style="max-width:560px;width:100%">
          <div class="modal-body" style="max-height:78vh;overflow:auto">${reportBody(report, st.lang)}</div>
          <div class="modal-foot" data-noprint><button class="btn btn-ghost" data-x>Cerrar</button></div>
        </div>`;
        wire();
      };
      const close = () => { scrim.remove(); document.removeEventListener("keydown", onKey); };
      const onKey = (e) => { if (e.key === "Escape") close(); };
      const wire = () => {
        scrim.querySelector("[data-x]")?.addEventListener("click", close);
        scrim.querySelector("#pr-lang")?.addEventListener("click", (e) => {
          st.lang = e.currentTarget.getAttribute("data-lang") === "en" ? "en" : "es";
          paint();
        });
        scrim.querySelector("#pr-print-btn")?.addEventListener("click", () => w.print && w.print());
      };
      scrim.addEventListener("click", (e) => { if (e.target === scrim) close(); });
      document.addEventListener("keydown", onKey);
      document.body.appendChild(scrim);
      paint();
    }

    const prOpen = root.querySelector("#pr-open");
    prOpen?.addEventListener("click", async () => {
      const st = rstate();
      const sel = (prChild && prChild.value) || st.sel;
      if (!sel) { w.toast?.("Selecciona un hijo/a", "warn"); return; }
      st.sel = sel;
      prOpen.disabled = true;
      const prevHtml = prOpen.innerHTML;
      prOpen.innerHTML = "Cargando reporte…";
      try {
        const d = await w.api(`/api/parent-report?studentId=${encodeURIComponent(sel)}`, null, "GET");
        const report = d && d.report;
        if (!report) throw new Error("No se pudo generar el reporte");
        openReportModal(report);
      } catch (e) {
        w.toast?.((e && e.message) || "No se pudo cargar el reporte", "danger");
      } finally {
        prOpen.disabled = false;
        prOpen.innerHTML = prevHtml;
      }
    });
  },
};
