// @ts-nocheck
/* OTR · Coach Workspace (PRD §7.5, supply-side) — S.coachwork.
   La experiencia role-scoped del coach: agenda de reservas (booking inbox),
   ingresos con escrow transparente (take rate 18%) y gestión de disponibilidad
   y paquetes. El alumno reserva en el marketplace; aquí el coach opera.

   Datos (contrato C1, defensivo con (DB.coachwork||{})):
     DB.coachwork = {
       profile: null | { id, hourlyCents, specialties, languages, ratingAvg,
         reviewCount, bookingCount, active,
         availability:[{ id, weekday 0-6, startMin, endMin, label? }],
         packages:[{ id, name, sessions, priceCents, discountPct, position }] },
       upcoming:[{ id, studentName, studentInitials?, slotLabel, packageName?,
         amountCents?, amountLabel?, status PENDING|CONFIRMED }],
       past:[{ ...idem, status COMPLETED|CANCELLED, escrowStatus HELD|RELEASED|REFUNDED }],
       metrics?:{ rating?, totalBookings?, completed?, repeatStudents? },
       heldCents?/heldLabel, releasedCents?/releasedLabel,
       payoutCents?/payoutLabel, monthPayoutCents?/monthPayoutLabel, takeRatePct? }

   Acciones:
     PATCH /api/bookings/[id]  { action:'complete' | 'cancel' }  (coach dueño)
     PATCH /api/coach-profile  { removeAvailabilityId } | { addAvailability:{weekday,startMin,endMin} }
       → responde { profile } con el perfil actualizado (se aplica local + repaint).

   Patrón de la casa: render(state)->string + mount(root,state); IC.* iconos,
   esc() para texto del usuario, navy + sky, fade-up; nada de emojis.
   Cliente vía globales de Aula.tsx: api(url,body,method), toast(), data-go. */
import { DB } from "./data";
import { C } from "./components";
import { IC } from "./icons";
import { esc } from "./esc";
import { t, registerDict } from "./i18n";
// [F4.1] Registra el diccionario de esta pantalla en SU chunk (fuera del inicial): cw.*. Ver app/lib/i18n.ts.
import { dict as d_cw } from "./i18n-keys/cw";
registerDict(d_cw);
import { money } from "./money";

export const S = {};

/* ---------------- tabs internas (patrón window.__x de scr-debate) ---------------- */
const TABS = [
  { k: "agenda", l: t("cw.tabAgenda"), ic: "calendar" },
  { k: "earnings", l: t("cw.tabEarnings"), ic: "chart" },
  { k: "availability", l: t("cw.tabAvailability"), ic: "clock" },
];
function activeTab() {
  const t = (window as any).__cwTab;
  return TABS.some((x) => x.k === t) ? t : "agenda";
}
function subTabs(active) {
  return `
  <div class="tabs fade-up" style="--d:1" id="cw-tabs">
    ${TABS.map((t) => `<button class="tab ${t.k === active ? "active" : ""}" data-cw-tab="${t.k}"><span class="row vcenter" style="gap:6px"><span style="display:inline-flex;width:15px;height:15px">${IC[t.ic]}</span>${t.l}</span></button>`).join("")}
  </div>`;
}

/* ---------------- helpers ---------------- */
const ini = (name) => (String(name || "A").split(" ").map((w) => w[0]).join("") || "A").slice(0, 2).toUpperCase();
const DIAS = t("cw.weekdays").split(", ");
const DIAS_CORTO = t("cw.weekdaysShort").split(", ");
function fmtMin(min) {
  const t = Math.max(0, Number(min) || 0);
  const h = Math.floor(t / 60), m = t % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  let hh = h % 12; if (hh === 0) hh = 12;
  return `${hh}:${String(m).padStart(2, "0")} ${ampm}`;
}

/* ---------------- normalización defensiva (contrato C1) ---------------- */
const cw = () => DB.coachwork || {};
function normBooking(b = {}) {
  const student = b.studentName || b.student || b.name || t("cw.studentFallback");
  const amountCents = Number(b.amountCents != null ? b.amountCents : b.priceCents) || 0;
  return {
    id: b.id || b.bookingId || "",
    student,
    initials: b.studentInitials || b.initials || ini(student),
    slotLabel: b.slotLabel || b.when || "",
    pkgName: b.packageName || b.pkgName || (b.package && b.package.name) || t("cw.singleSession"),
    amountCents,
    amountLabel: b.amountLabel || b.priceLabel || (amountCents ? money(amountCents) : ""),
    status: String(b.status || "").toUpperCase(),
    escrowStatus: String(b.escrowStatus || (b.escrow && b.escrow.status) || "").toUpperCase(),
    // Contrato C1: campos de sala/grabación que llegan en el inbox del coach.
    slotAtIso: b.slotAtIso || "",
    videoUrl: b.videoUrl || "",
    recordingUrl: b.recordingUrl || "",
  };
}
function getLists() {
  const c = cw();
  const box = c.inbox || c; // contrato C1: DB.coachwork.inbox.{upcoming,past}
  return {
    upcoming: (Array.isArray(box.upcoming) ? box.upcoming : []).map(normBooking),
    past: (Array.isArray(box.past) ? box.past : []).map(normBooking),
  };
}
function getProfile() {
  const p = cw().profile;
  if (!p) return null;
  return {
    id: p.id || "",
    hourlyCents: Number(p.hourlyCents) || 0,
    specialties: p.specialties || "",
    languages: p.languages || "",
    ratingAvg: Number(p.ratingAvg) || 0,
    reviewCount: Number(p.reviewCount) || 0,
    bookingCount: Number(p.bookingCount) || 0,
    active: p.active !== false,
    availability: Array.isArray(p.availability) ? p.availability : [],
    packages: Array.isArray(p.packages) ? p.packages : [],
  };
}
function getMetrics() {
  const c = cw();
  const m = c.metrics || c.stats || {};
  const p = getProfile();
  const { upcoming, past } = getLists();
  // Alumnos recurrentes: 2+ reservas (no canceladas) del mismo alumno.
  const byStudent = {};
  [...upcoming, ...past].forEach((b) => {
    if (b.status === "CANCELLED") return;
    byStudent[b.student] = (byStudent[b.student] || 0) + 1;
  });
  const repeat = Object.values(byStudent).filter((n) => n >= 2).length;
  return {
    rating: Number(m.rating != null ? m.rating : m.ratingAvg != null ? m.ratingAvg : p ? p.ratingAvg : 0) || 0,
    reviews: Number(m.reviewCount != null ? m.reviewCount : p ? p.reviewCount : 0) || 0,
    // [auditoría] Reservas totales = bookingCount canónico por-coach (CoachProfile.bookingCount,
    // lo mismo que ve el marketplace), NO el subconjunto visible del inbox (capado a take:200).
    total: Number(m.bookingCount != null ? m.bookingCount : p ? p.bookingCount : 0) || upcoming.length + past.length,
    completed: Number(m.completed) || past.filter((b) => b.status === "COMPLETED").length,
    repeat: Number(m.repeatStudents != null ? m.repeatStudents : m.recurring) || repeat,
  };
}
function getEarnings() {
  const cAll = cw();
  const c = cAll.earnings || cAll; // contrato C1: DB.coachwork.earnings.{...}
  const { upcoming, past } = getLists();
  const takeRate = Number(c.takeRatePct) || 18;
  // Fallbacks calculados si C1 no manda cents/labels (defensa en profundidad).
  const heldCalc = upcoming
    .filter((b) => b.status === "PENDING" || b.status === "CONFIRMED")
    .reduce((s, b) => s + b.amountCents, 0);
  const releasedCalc = past
    .filter((b) => b.escrowStatus === "RELEASED")
    .reduce((s, b) => s + b.amountCents, 0);
  const held = typeof c.heldCents === "number" ? c.heldCents : heldCalc;
  const released = typeof c.releasedCents === "number" ? c.releasedCents : releasedCalc;
  const payout = typeof c.payoutCents === "number" ? c.payoutCents : Math.round((released * (100 - takeRate)) / 100);
  return {
    takeRate,
    heldLabel: c.heldLabel || money(held),
    releasedLabel: c.releasedLabel || money(released),
    payoutLabel: c.payoutLabel || money(payout),
    monthPayoutLabel: c.monthPayoutLabel || (typeof c.monthPayoutCents === "number" ? money(c.monthPayoutCents) : "—"),
  };
}

/* ---------------- badges de estado ---------------- */
// Una variante DISTINTA por estado (si no, todo igual no dice nada): confirmada = negro
// (vigente), pendiente = tinte, completada = verde con check, cancelada = contorno.
// Mismos criterios que el panel del alumno (scr-mybookings.ts).
function statusBadge(status) {
  // [Isaac 2026-08-09] Mismo criterio que Mis reservas: vigente en negro, terminado en
  // verde con check. El naranja deja de usarse para marcar estados.
  if (status === "CONFIRMED") return C.chip(t("cw.statusConfirmed"), "black");
  if (status === "PENDING") return C.chip(t("cw.statusPending"), "tint");
  if (status === "COMPLETED") return C.chip(t("cw.statusCompleted"), "accent", { ic: "check" });
  if (status === "CANCELLED") return C.chip(t("cw.statusCancelled"), "outline");
  return status ? C.chip(esc(status), "outline") : "";
}
function escrowBadge(st) {
  if (st === "HELD") return C.chip(t("cw.escrowHeld"), "tint");
  if (st === "RELEASED") return C.chip(t("cw.escrowReleased"), "tint", { ic: "check" });
  if (st === "REFUNDED") return C.chip(t("cw.escrowRefunded"), "outline");
  return st ? C.chip(esc(st), "outline") : `<span class="faint" style="font-size:12px">—</span>`;
}

/* ================= TAB 1 · AGENDA ================= */
/* [MOCKUP V2 §5] Día + mes corto para el .date-box del kit (60px, sin caja) a partir
   del ISO real de la sesión. Sin ISO utilizable devuelve null y el hueco lo ocupa el
   avatar del alumno: la columna guía nunca queda vacía. */
function slotDate(iso) {
  const ts = Date.parse(iso || "");
  if (Number.isNaN(ts)) return null;
  const dt = new Date(ts);
  return { d: dt.getDate(), m: dt.toLocaleDateString(undefined, { month: "short" }).replace(".", "") };
}

function bookingRow(b, opts = {}) {
  // [MOCKUP V2] Los botones son hijos DIRECTOS de .ev-actions (antes iban en un
  // <div class="row" style="flex:none"> que no dejaba envolver en móvil y se salía de la card).
  const actions = opts.actions && b.status === "CONFIRMED"
    ? `<button class="btn btn-outline btn--sm" data-cw-join="${esc(b.id)}"><span class="row vcenter" style="gap:6px"><span style="display:inline-flex;width:15px;height:15px">${IC.video}</span>${t("cw.joinSession")}</span></button>
       <button class="btn btn-accent btn--sm" data-cw-complete="${esc(b.id)}">${t("cw.completeSession")}</button>
       <button class="btn btn-outline btn--sm" data-cw-cancel="${esc(b.id)}" style="color:var(--danger)">${t("cw.cancel")}</button>`
    // [COACH-01] PENDING (esperando consentimiento del padre): el coach puede RECHAZARLA.
    // Antes no se renderizaba ninguna acción y la reserva quedaba atascada en su agenda.
    : opts.actions && b.status === "PENDING"
    ? `<button class="btn btn-outline btn--sm" data-cw-cancel="${esc(b.id)}" style="color:var(--danger)">${t("cw.rejectBooking")}</button>`
    // [COACH-REC] Grabación: en sesiones COMPLETED el coach adjunta el enlace de la grabación
    // (PATCH action:'recording'). Si ya hay una, además ofrece verla.
    : opts.recording && b.status === "COMPLETED"
    ? `${b.recordingUrl ? `<a class="btn btn-outline btn--sm" href="${esc(b.recordingUrl)}" target="_blank" rel="noopener noreferrer"><span class="row vcenter" style="gap:6px"><span style="display:inline-flex;width:14px;height:14px">${IC.play}</span>${t("cw.viewRecording")}</span></a>` : ""}
       <button class="btn btn-outline btn--sm" data-cw-recording="${esc(b.id)}">${b.recordingUrl ? t("cw.changeRecording") : t("cw.attachRecording")}</button>`
    : "";
  // [MOCKUP V2 §2/§5] La fila pasa al .evrow del kit: columna de fecha, título de 16px y
  // meta de 12.5px. Los estados que YA no piden acción (historial) son metadatos y van en
  // texto plano dentro de .ev-main; el estado de una sesión viva conserva su chip con
  // fondo en .ev-actions, que es donde el coach mira para decidir.
  const dt = slotDate(b.slotAtIso);
  const lead = dt
    ? C.dateBox(dt.d, dt.m)
    : `<div class="date-box">${C.avatar(esc(b.initials), { size: "sm", bg: "var(--otr-navy)" })}</div>`;
  const live = !!opts.actions;
  return `
  <div class="evrow">
    ${lead}
    <div class="ev-main">
      ${live ? "" : `${statusBadge(b.status)}${opts.escrow ? escrowBadge(b.escrowStatus) : ""}`}
      <div class="ev-title">${esc(b.student)}</div>
      <div class="ev-meta">
        <span>${esc(b.slotLabel)}${b.slotLabel ? " · " : ""}${esc(b.pkgName)}</span>
        ${b.amountLabel ? `<span class="adj-amount">${esc(b.amountLabel)}</span>` : ""}
      </div>
    </div>
    <div class="ev-actions wrap">
      ${live ? statusBadge(b.status) : ""}
      ${actions}
    </div>
  </div>`;
}

function viewAgenda() {
  const m = getMetrics();
  const { upcoming, past } = getLists();

  if (!upcoming.length && !past.length) {
    return `
    <div class="card fade-up"><div class="empty">
      <div class="ill">${IC.calendar}</div>
      <h4>${t("cw.agendaEmptyHeading")}</h4>
      <p>${t("cw.agendaEmptyBody")}</p>
      <button class="btn btn-outline btn--sm" data-go="coach">${t("cw.agendaEmptyCta")}</button>
    </div></div>`;
  }

  return `
  ${/* [MOCKUP V2 §1] 26px entre bloques de sección (antes 18/16): el aire va ENTRE bloques. */""}
  <div class="grid g-4" style="margin-bottom:26px">
    <div class="tile tile--hero otr-shine fade-up" style="--d:0">${C.kpi(t("cw.kpiRating"), m.rating ? m.rating.toFixed(1) : "—", { ic: "star", unit: m.reviews ? ` · ${m.reviews} ${m.reviews === 1 ? t("cw.reviewSingular") : t("cw.reviewPlural")}` : "", accent: "var(--otr-gold-text)" })}</div>
    <div class="tile fade-up" style="--d:1">${C.kpi(t("cw.kpiTotalBookings"), String(m.total), { ic: "calendar" })}</div>
    <div class="tile fade-up" style="--d:2">${C.kpi(t("cw.kpiCompleted"), String(m.completed), { ic: "checkCircle" })}</div>
    <div class="tile fade-up" style="--d:3">${C.kpi(t("cw.kpiRepeatStudents"), String(m.repeat), { ic: "users" })}</div>
  </div>

  ${/* [MOCKUP V2 §7] Card sin padding: las filas traen el suyo y llegan a sangre. */""}
  <div class="card adj-list fade-up" style="--d:1">
    <div class="adj-head">${C.secTitle(t("cw.upcomingTitle"), { sm: true, right: C.chip(String(upcoming.length), "black") })}
      <p class="adj-sub" style="margin:6px 0 0">${t("cw.upcomingNote")}</p></div>
    ${upcoming.length
      ? upcoming.map((b) => bookingRow(b, { actions: true })).join("")
      : `<p class="muted" style="font-size:13px">${t("cw.upcomingEmpty")}</p>`}
  </div>

  <div class="card adj-list fade-up" style="--d:2;margin-top:26px">
    <div class="adj-head">${C.secTitle(t("cw.historyTitle"), { sm: true, right: C.chip(String(past.length), "outline") })}</div>
    ${past.length
      ? past.map((b) => bookingRow(b, { escrow: true, recording: true })).join("")
      : `<p class="muted" style="font-size:13px">${t("cw.historyEmpty")}</p>`}
  </div>`;
}

/* ================= TAB 2 · INGRESOS ================= */
function viewEarnings() {
  const e = getEarnings();
  const { past } = getLists();
  const tile = (label, value, sub, ic, d) => `
    <div class="tile fade-up" style="--d:${d}">
      ${C.kpi(label, value, { ic })}
      <p class="faint" style="font-size:11.5px;margin-top:6px">${sub}</p>
    </div>`;
  return `
  <div class="grid g-4" style="margin-bottom:26px">
    ${tile(t("cw.earnEscrow"), e.heldLabel, t("cw.earnEscrowSub"), "lock", 0)}
    ${tile(t("cw.earnReleased"), e.releasedLabel, t("cw.earnReleasedSub"), "checkCircle", 1)}
    ${tile(t("cw.earnPayout"), e.payoutLabel, t("cw.earnPayoutSub").replace("{rate}", String(e.takeRate)), "award", 2)}
    ${tile(t("cw.earnThisMonth"), e.monthPayoutLabel, t("cw.earnThisMonthSub"), "calendar", 3)}
  </div>

  <div class="alert info fade-up" style="--d:1;margin-bottom:26px"><span class="ai">${IC.lock}</span>
    <div><div class="at">${t("cw.transparencyTitle")}</div>${t("cw.transparencyBody").replace("{rate}", String(e.takeRate))}</div>
  </div>

  <div class="table-wrap fade-up" style="--d:2">
    <table class="tbl">
      <thead><tr><th>${t("cw.tblStudent")}</th><th>${t("cw.tblSession")}</th><th class="num">${t("cw.tblAmount")}</th><th>${t("cw.tblStatus")}</th><th>${t("cw.tblEscrow")}</th></tr></thead>
      <tbody>
        ${past.length
          ? past.map((b) => `
            <tr>
              <td><div class="cell-user">${C.avatar(esc(b.initials), { size: "sm" })}<div class="nm">${esc(b.student)}</div></div></td>
              <td class="faint" style="font-size:12.5px">${esc(b.slotLabel)}${b.slotLabel ? " · " : ""}${esc(b.pkgName)}</td>
              <td class="num"><b>${esc(b.amountLabel || "—")}</b></td>
              <td>${statusBadge(b.status)}</td>
              <td>${escrowBadge(b.escrowStatus)}</td>
            </tr>`).join("")
          : `<tr><td colspan="5" class="faint" style="text-align:center;padding:26px;font-size:13px">${t("cw.tblEmpty")}</td></tr>`}
      </tbody>
    </table>
  </div>`;
}

/* ================= TAB 3 · DISPONIBILIDAD ================= */
function timeOptions(selected) {
  let s = "";
  for (let m = 6 * 60; m <= 22 * 60; m += 30) {
    s += `<option value="${m}" ${m === selected ? "selected" : ""}>${fmtMin(m)}</option>`;
  }
  return s;
}
function availLabel(a) {
  if (a.label) return esc(a.label);
  return `${esc(DIAS_CORTO[Number(a.weekday) % 7] || "")} · ${fmtMin(a.startMin)} – ${fmtMin(a.endMin)}`;
}

function viewAvailability() {
  const p = getProfile();
  if (!p) {
    return `
    <div class="card fade-up"><div class="empty">
      <div class="ill">${IC.user}</div>
      <h4>${t("cw.activateHeading")}</h4>
      <p>${t("cw.activateBody")}</p>
      <button class="btn btn-accent" data-go="profile">${t("cw.activateCta")}</button>
    </div></div>`;
  }
  const specs = String(p.specialties).split(/[,·]/).map((s) => s.trim()).filter(Boolean);
  const sorted = [...p.availability].sort((a, b) =>
    (Number(a.weekday) - Number(b.weekday)) || (Number(a.startMin) - Number(b.startMin)));
  const pkgs = [...p.packages].sort((a, b) => (Number(a.position) || 0) - (Number(b.position) || 0));

  return `
  <div class="split rail-360">
    <div class="stack" style="gap:26px">
      <div class="card card-pad fade-up">
        ${C.secTitle(t("cw.offerTitle"), { sm: true, right: p.active ? C.chip(t("cw.offerVisible"), "accent") : C.chip(t("cw.offerInactive"), "outline") })}
        <div class="row vcenter wrap" style="gap:10px;margin-top:12px">
          <span style="font-size:13px;color:var(--text-2)">${t("cw.hourlyRate")}</span>
          <b class="brand-font" style="font-size:20px;font-weight:800">${p.hourlyCents ? money(p.hourlyCents) : "—"}</b>
          ${p.hourlyCents ? `<span class="faint" style="font-size:11.5px">${t("cw.perHour")}</span>` : ""}
        </div>
        ${specs.length ? `<div class="row wrap" style="gap:6px;margin-top:12px">${specs.map((s) => `<span class="chip chip--outline">${esc(s)}</span>`).join("")}</div>` : ""}
        <p class="faint" style="font-size:12px;margin-top:12px">${t("cw.offerEditNote")}</p>
        <button class="btn btn-outline btn--sm" data-go="profile" style="margin-top:10px">${t("cw.offerEditCta")}</button>
      </div>

      <div class="card card-pad fade-up" style="--d:1">
        ${C.secTitle(t("cw.slotsTitle"), { sm: true, right: C.chip(String(sorted.length), "black") })}
        <p class="faint" style="font-size:12px;margin-top:4px">${t("cw.slotsNote")}</p>
        ${sorted.length
          ? `<div style="margin-top:8px">${sorted.map((a) => `
            <div class="row vcenter" style="gap:10px;padding:10px 0;border-bottom:1px solid var(--border)">
              <span style="display:inline-flex;width:15px;height:15px;color:var(--otr-green);flex:none">${IC.clock}</span>
              <span style="flex:1;font-size:13px;font-weight:600">${availLabel(a)}</span>
              <button class="btn btn-outline btn--sm" data-cw-rmav="${esc(a.id || "")}" title="${t("cw.removeSlot")}" style="color:var(--danger);padding:4px 8px"><span style="display:inline-flex;width:14px;height:14px">${IC.close}</span></button>
            </div>`).join("")}</div>`
          : `<p class="muted" style="font-size:13px;margin-top:12px">${t("cw.slotsEmpty")}</p>`}

        <div class="divider"></div>
        <p class="label" style="margin-bottom:8px">${t("cw.addSlot")}</p>
        <div class="row wrap vcenter" style="gap:8px">
          <select class="select" id="cw-av-day" aria-label="${t("cw.dayOfWeek")}" style="width:auto;min-width:130px">
            ${DIAS.map((d, i) => `<option value="${i}" ${i === 1 ? "selected" : ""}>${d}</option>`).join("")}
          </select>
          <select class="select" id="cw-av-start" aria-label="${t("cw.startTime")}" style="width:auto;min-width:110px">${timeOptions(16 * 60)}</select>
          <span class="faint" style="font-size:12.5px" aria-hidden="true">${t("cw.toSep")}</span>
          <select class="select" id="cw-av-end" aria-label="${t("cw.endTime")}" style="width:auto;min-width:110px">${timeOptions(18 * 60)}</select>
          <button class="btn btn-accent btn--sm" id="cw-av-add">${IC.plus} ${t("cw.add")}</button>
        </div>
      </div>
    </div>

    <div class="stack" style="gap:26px">
      <div class="card card-pad fade-up" style="--d:1">
        ${C.secTitle(t("cw.packagesTitle"), { sm: true })}
        <p class="faint" style="font-size:12px;margin-top:-8px">${t("cw.packagesNote")}</p>
        ${pkgs.length
          ? `<div class="stack" style="gap:8px;margin-top:10px">${pkgs.map((k) => `
            <div class="tile" style="padding:11px 13px;display:flex;align-items:center;gap:10px">
              <span style="flex:1;min-width:0">
                <b style="font-size:13px;display:block">${esc(k.name || (Number(k.sessions) > 1 ? t("cw.packageOf").replace("{n}", String(k.sessions)) : t("cw.singleSession")))}</b>
                <span class="faint" style="font-size:11.5px">${Number(k.sessions) || 1} ${Number(k.sessions) === 1 ? t("cw.sessionSingular") : t("cw.sessionPlural")} · ${t("cw.sessionDuration")}</span>
              </span>
              ${Number(k.discountPct) > 0 ? `<span class="chip chip--accent" style="flex:none">-${Number(k.discountPct)}%</span>` : ""}
              <b class="cc-pct" style="font-size:14px;font-weight:800;flex:none">${money(k.priceCents)}</b>
            </div>`).join("")}</div>`
          : `<p class="muted" style="font-size:13px;margin-top:10px">${t("cw.packagesEmpty")}</p>`}
      </div>

      <div class="alert info fade-up" style="--d:2"><span class="ai">${IC.lock}</span>
        <div><div class="at">${t("cw.safeTitle")}</div>${t("cw.safeBody")}</div>
      </div>
    </div>
  </div>`;
}

/* ---------------- router de tabs ---------------- */
function renderTab(tab) {
  if (tab === "earnings") return viewEarnings();
  if (tab === "availability") return viewAvailability();
  return viewAgenda();
}

/* ================= PANTALLA ================= */
S.coachwork = {
  render(state) {
    const tab = activeTab();
    return `
    <div class="page-head page-head--rule fade-up"><div>
      <h1 class="ph-title">${t("cw.title")}</h1>
      <div class="page-sub">${t("cw.subtitle")}</div>
    </div></div>
    ${subTabs(tab)}
    <div class="fade-up" style="--d:2" id="cw-body">${renderTab(tab)}</div>`;
  },

  mount(root, state) {
    const w = window;
    const repaint = () => {
      const page = root.querySelector(".page");
      if (!page) return;
      page.innerHTML = S.coachwork.render(state);
      S.coachwork.mount(root, state);
    };

    // Cambio de tab interna.
    root.querySelectorAll("[data-cw-tab]").forEach((el) =>
      el.addEventListener("click", (e) => {
        e.preventDefault();
        w.__cwTab = el.getAttribute("data-cw-tab");
        repaint();
      })
    );

    // Mutación local: mueve una reserva de upcoming → past y ajusta el ledger.
    // Contrato C1: las listas viven en DB.coachwork.inbox y los montos en .earnings.
    const moveToPast = (id, status, escrowStatus, payoutCents) => {
      const dbcw = (DB.coachwork = DB.coachwork || {});
      const box = dbcw.inbox || dbcw;
      const c = dbcw.earnings || dbcw;
      box.upcoming = Array.isArray(box.upcoming) ? box.upcoming : [];
      box.past = Array.isArray(box.past) ? box.past : [];
      const i = box.upcoming.findIndex((b) => (b && (b.id || b.bookingId)) === id);
      if (i < 0) return;
      const [b] = box.upcoming.splice(i, 1);
      b.status = status;
      b.escrowStatus = escrowStatus;
      box.past.unshift(b);
      // Ajuste del ledger solo si C1 mandó los cents (si no, se recalcula al render).
      const amount = Number(b.amountCents != null ? b.amountCents : b.priceCents) || 0;
      if (typeof c.heldCents === "number") { c.heldCents = Math.max(0, c.heldCents - amount); delete c.heldLabel; }
      if (status === "COMPLETED") {
        if (typeof c.releasedCents === "number") { c.releasedCents += amount; delete c.releasedLabel; }
        if (typeof c.payoutCents === "number" && payoutCents) { c.payoutCents += payoutCents; delete c.payoutLabel; }
        if (typeof c.monthPayoutCents === "number" && payoutCents) { c.monthPayoutCents += payoutCents; delete c.monthPayoutLabel; }
      }
    };

    // Completar sesión → PATCH complete (escrow HELD → RELEASED, payout = monto − 18%).
    root.querySelectorAll("[data-cw-complete]").forEach((btn) =>
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-cw-complete");
        if (!id) return;
        btn.disabled = true;
        btn.textContent = t("cw.completing");
        try {
          const d = await w.api(`/api/bookings/${encodeURIComponent(id)}`, { action: "complete" }, "PATCH");
          const payout = (d && d.escrow && Number(d.escrow.payoutCents)) || 0;
          moveToPast(id, "COMPLETED", "RELEASED", payout);
          w.toast?.(t("cw.completedToast").replace("{payout}", money(payout)), "ok");
          repaint();
        } catch (e) {
          w.toast?.((e && e.message) || t("cw.completeError"), "danger");
          btn.disabled = false;
          btn.textContent = t("cw.completeSession");
        }
      })
    );

    // Cancelar → confirmación en dos toques, luego PATCH cancel (escrow → REFUNDED).
    root.querySelectorAll("[data-cw-cancel]").forEach((btn) =>
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-cw-cancel");
        if (!id) return;
        if (btn.getAttribute("data-armed") !== "1") {
          btn.setAttribute("data-armed", "1");
          btn.textContent = t("cw.cancelArm");
          setTimeout(() => {
            if (btn.isConnected && btn.getAttribute("data-armed") === "1") {
              btn.removeAttribute("data-armed");
              btn.textContent = t("cw.cancel");
            }
          }, 4000);
          return;
        }
        btn.disabled = true;
        btn.textContent = t("cw.cancelling");
        try {
          await w.api(`/api/bookings/${encodeURIComponent(id)}`, { action: "cancel" }, "PATCH");
          moveToPast(id, "CANCELLED", "REFUNDED", 0);
          w.toast?.(t("cw.cancelled"), "ok");
          repaint();
        } catch (e) {
          w.toast?.((e && e.message) || t("cw.cancelError"), "danger");
          btn.disabled = false;
          btn.removeAttribute("data-armed");
          btn.textContent = t("cw.cancel");
        }
      })
    );

    // [COACH-01b] Unirse a la sesión (filas CONFIRMED) → sala SPA-nativa. Igual que el
    // alumno: fijamos window.__room con el bookingId y navegamos a 'room' (que lee
    // slotAtIso/videoUrl ya incluidos en el inbox del coach por el contrato C1).
    root.querySelectorAll("[data-cw-join]").forEach((btn) =>
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const id = btn.getAttribute("data-cw-join") || "";
        if (!id) return;
        w.__room = id;
        w.go?.("room");
      })
    );

    // [COACH-REC] Refresco duro re-pidiendo /api/app-data y re-navegando a 'coachwork'
    // (mismo patrón que scr-mybookings: preserva el role de DB.me al fusionar).
    const softRefresh = async () => {
      try {
        const r = await fetch("/api/app-data");
        if (r.ok) {
          const fresh = await r.json();
          const role = DB.me?.role;
          Object.assign(DB, fresh);
          if (role) DB.me = { ...(fresh.me || {}), role };
        }
      } catch { /* silencioso */ }
      if (w.go) w.go("coachwork");
    };

    // [COACH-REC] Adjuntar/cambiar el enlace de la grabación de una sesión COMPLETED.
    // El endpoint PATCH /api/bookings/[id] { action:'recording' } valida la URL.
    root.querySelectorAll("[data-cw-recording]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-cw-recording");
        if (!id) return;
        w.otrFormModal?.(
          t("cw.recordingModalTitle"),
          [{ name: "recordingUrl", label: t("cw.recordingFieldLabel"), type: "text", ph: "https://..." }],
          async (values) => {
            await w.api(`/api/bookings/${encodeURIComponent(id)}`, { action: "recording", recordingUrl: values.recordingUrl }, "PATCH");
            w.toast?.(t("cw.recordingSaved"), "ok");
            await softRefresh();
          }
        );
      })
    );

    // Aplica la respuesta { profile } de PATCH /api/coach-profile al estado local.
    const applyProfile = (d) => {
      const profile = d && (d.profile || d);
      if (!profile || typeof profile !== "object") return;
      DB.coachwork = DB.coachwork || {};
      DB.coachwork.profile = profile;
    };

    // Eliminar franja de disponibilidad.
    root.querySelectorAll("[data-cw-rmav]").forEach((btn) =>
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-cw-rmav");
        if (!id) return;
        btn.disabled = true;
        try {
          const d = await w.api("/api/coach-profile", { removeAvailabilityId: id }, "PATCH");
          applyProfile(d);
          w.toast?.(t("cw.slotRemoved"), "ok");
          repaint();
        } catch (e) {
          w.toast?.((e && e.message) || t("cw.slotRemoveError"), "danger");
          btn.disabled = false;
        }
      })
    );

    // Añadir franja (día + media hora inicio/fin, 6:00 AM–10:00 PM).
    const addBtn = root.querySelector("#cw-av-add");
    addBtn?.addEventListener("click", async () => {
      const day = root.querySelector("#cw-av-day");
      const start = root.querySelector("#cw-av-start");
      const end = root.querySelector("#cw-av-end");
      const weekday = Number(day?.value);
      const startMin = Number(start?.value);
      const endMin = Number(end?.value);
      if (!(endMin > startMin)) {
        w.toast?.(t("cw.slotTimeError"), "warn");
        return;
      }
      addBtn.disabled = true;
      addBtn.textContent = t("cw.adding");
      try {
        const d = await w.api("/api/coach-profile", { addAvailability: { weekday, startMin, endMin } }, "PATCH");
        applyProfile(d);
        w.toast?.(t("cw.slotAdded"), "ok");
        repaint();
      } catch (e) {
        w.toast?.((e && e.message) || t("cw.slotAddError"), "danger");
        addBtn.disabled = false;
        addBtn.innerHTML = `${IC.plus} ${t("cw.add")}`;
      }
    });
  },
};
