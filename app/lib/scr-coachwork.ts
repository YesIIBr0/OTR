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

export const S = {};

/* ---------------- tabs internas (patrón window.__x de scr-debate) ---------------- */
const TABS = [
  { k: "agenda", l: "Agenda", ic: "calendar" },
  { k: "earnings", l: "Ingresos", ic: "chart" },
  { k: "availability", l: "Disponibilidad", ic: "clock" },
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
const money = (cents) => {
  const v = (Number(cents) || 0) / 100;
  return `$${v % 1 ? v.toFixed(2) : v.toFixed(0)}`;
};
const ini = (name) => (String(name || "A").split(" ").map((w) => w[0]).join("") || "A").slice(0, 2).toUpperCase();
const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const DIAS_CORTO = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
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
  const student = b.studentName || b.student || b.name || "Alumno OTR";
  const amountCents = Number(b.amountCents != null ? b.amountCents : b.priceCents) || 0;
  return {
    id: b.id || b.bookingId || "",
    student,
    initials: b.studentInitials || b.initials || ini(student),
    slotLabel: b.slotLabel || b.when || "",
    pkgName: b.packageName || b.pkgName || (b.package && b.package.name) || "Sesión individual",
    amountCents,
    amountLabel: b.amountLabel || b.priceLabel || (amountCents ? money(amountCents) : ""),
    status: String(b.status || "").toUpperCase(),
    escrowStatus: String(b.escrowStatus || (b.escrow && b.escrow.status) || "").toUpperCase(),
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
    total: Number(m.totalBookings != null ? m.totalBookings : m.bookings) || upcoming.length + past.length,
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
function statusBadge(status) {
  if (status === "CONFIRMED") return `<span class="badge sky"><span class="dot"></span>Confirmada</span>`;
  if (status === "PENDING") return `<span class="badge warn"><span class="dot"></span>Esperando consentimiento del padre</span>`;
  if (status === "COMPLETED") return `<span class="badge ok"><span class="dot"></span>Completada</span>`;
  if (status === "CANCELLED") return `<span class="badge">Cancelada</span>`;
  return status ? `<span class="badge">${esc(status)}</span>` : "";
}
function escrowBadge(st) {
  if (st === "HELD") return `<span class="badge warn">En escrow</span>`;
  if (st === "RELEASED") return `<span class="badge ok">Liberado</span>`;
  if (st === "REFUNDED") return `<span class="badge">Reembolsado</span>`;
  return st ? `<span class="badge">${esc(st)}</span>` : `<span class="faint" style="font-size:12px">—</span>`;
}

/* ================= TAB 1 · AGENDA ================= */
function bookingRow(b, opts = {}) {
  const actions = opts.actions && b.status === "CONFIRMED"
    ? `<div class="row" style="gap:8px;flex:none">
         <button class="btn btn-primary btn-sm" data-cw-complete="${esc(b.id)}">Completar sesión</button>
         <button class="btn btn-ghost btn-sm" data-cw-cancel="${esc(b.id)}" style="color:var(--danger)">Cancelar</button>
       </div>`
    // [COACH-01] PENDING (esperando consentimiento del padre): el coach puede RECHAZARLA.
    // Antes no se renderizaba ninguna acción y la reserva quedaba atascada en su agenda.
    : opts.actions && b.status === "PENDING"
    ? `<div class="row" style="gap:8px;flex:none">
         <button class="btn btn-ghost btn-sm" data-cw-cancel="${esc(b.id)}" style="color:var(--danger)">Rechazar reserva</button>
       </div>`
    : "";
  return `
  <div class="row vcenter wrap" style="gap:12px;padding:13px 0;border-bottom:1px solid var(--border)">
    ${C.avatar(esc(b.initials), { size: "sm", bg: "var(--otr-navy)" })}
    <div style="flex:1;min-width:180px">
      <b style="font-size:13.5px">${esc(b.student)}</b>
      <div class="faint" style="font-size:12px;margin-top:2px">
        ${esc(b.slotLabel)}${b.slotLabel ? " · " : ""}${esc(b.pkgName)}${b.amountLabel ? ` · <b style="color:var(--text-2)">${esc(b.amountLabel)}</b>` : ""}
      </div>
    </div>
    ${statusBadge(b.status)}
    ${opts.escrow ? escrowBadge(b.escrowStatus) : ""}
    ${actions}
  </div>`;
}

function viewAgenda() {
  const m = getMetrics();
  const { upcoming, past } = getLists();

  if (!upcoming.length && !past.length) {
    return `
    <div class="card fade-up"><div class="empty">
      <div class="ill">${IC.calendar}</div>
      <h4>Aún sin reservas</h4>
      <p>Tu perfil del marketplace trabaja por ti: cuando un alumno reserve una sesión, aparecerá aquí.</p>
      <button class="btn btn-ghost btn-sm" data-go="explore">Ver mi perfil en el marketplace</button>
    </div></div>`;
  }

  return `
  <div class="grid g-4" style="margin-bottom:18px">
    <div class="tile fade-up" style="--d:0">${C.kpi("Rating", m.rating ? m.rating.toFixed(1) : "—", { ic: "star", unit: m.reviews ? ` · ${m.reviews} reseña${m.reviews === 1 ? "" : "s"}` : "" })}</div>
    <div class="tile fade-up" style="--d:1">${C.kpi("Reservas totales", String(m.total), { ic: "calendar" })}</div>
    <div class="tile fade-up" style="--d:2">${C.kpi("Completadas", String(m.completed), { ic: "checkCircle" })}</div>
    <div class="tile fade-up" style="--d:3">${C.kpi("Alumnos recurrentes", String(m.repeat), { ic: "users" })}</div>
  </div>

  <div class="card card-pad fade-up" style="--d:1">
    <div class="row between vcenter">
      <b style="font-size:14px">Próximas sesiones</b>
      <span class="badge sky">${upcoming.length}</span>
    </div>
    <p class="faint" style="font-size:12px;margin-top:4px">Completa la sesión para liberar el pago del escrow.</p>
    ${upcoming.length
      ? `<div style="margin-top:6px">${upcoming.map((b) => bookingRow(b, { actions: true })).join("")}</div>`
      : `<p class="muted" style="font-size:13px;margin-top:12px">No tienes sesiones próximas — tu perfil del marketplace sigue trabajando por ti.</p>`}
  </div>

  <div class="card card-pad fade-up" style="--d:2;margin-top:16px">
    <div class="row between vcenter">
      <b style="font-size:14px">Historial</b>
      <span class="badge">${past.length}</span>
    </div>
    ${past.length
      ? `<div style="margin-top:6px">${past.map((b) => bookingRow(b, { escrow: true })).join("")}</div>`
      : `<p class="muted" style="font-size:13px;margin-top:12px">Todavía no completaste ninguna sesión.</p>`}
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
  <div class="grid g-4" style="margin-bottom:18px">
    ${tile("En escrow", e.heldLabel, "se libera al completar", "lock", 0)}
    ${tile("Liberado total", e.releasedLabel, "sesiones ya completadas", "checkCircle", 1)}
    ${tile("Tu payout", e.payoutLabel, `después del take rate ${e.takeRate}%`, "award", 2)}
    ${tile("Este mes", e.monthPayoutLabel, "payout del mes en curso", "calendar", 3)}
  </div>

  <div class="alert info fade-up" style="--d:1;margin-bottom:18px"><span class="ai">${IC.lock}</span>
    <div><div class="at">Transparencia total</div>OTR retiene ${e.takeRate}% por sesión; el resto se libera vía escrow cuando marcas la sesión como completada.</div>
  </div>

  <div class="table-wrap fade-up" style="--d:2">
    <table class="tbl">
      <thead><tr><th>Alumno</th><th>Sesión</th><th class="num">Monto</th><th>Estado</th><th>Escrow</th></tr></thead>
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
          : `<tr><td colspan="5" class="faint" style="text-align:center;padding:26px;font-size:13px">Sin movimientos todavía — completa tu primera sesión para ver tu historial aquí.</td></tr>`}
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
      <h4>Activa tu perfil de coach</h4>
      <p>Publica tu tarifa, especialidades y video de presentación para aparecer en el marketplace y recibir reservas.</p>
      <button class="btn btn-primary" data-go="coach">Activa tu perfil de coach</button>
    </div></div>`;
  }
  const specs = String(p.specialties).split(/[,·]/).map((s) => s.trim()).filter(Boolean);
  const sorted = [...p.availability].sort((a, b) =>
    (Number(a.weekday) - Number(b.weekday)) || (Number(a.startMin) - Number(b.startMin)));
  const pkgs = [...p.packages].sort((a, b) => (Number(a.position) || 0) - (Number(b.position) || 0));

  return `
  <div class="split rail-360">
    <div class="stack" style="gap:16px">
      <div class="card card-pad fade-up">
        <div class="row between vcenter wrap" style="gap:10px">
          <b style="font-size:14px">Tu oferta</b>
          ${p.active ? `<span class="badge ok"><span class="dot"></span>Visible en el marketplace</span>` : `<span class="badge warn"><span class="dot"></span>Perfil inactivo</span>`}
        </div>
        <div class="row vcenter wrap" style="gap:10px;margin-top:12px">
          <span style="font-size:13px;color:var(--text-2)">Tarifa por hora:</span>
          <b class="brand-font" style="font-size:20px;font-weight:800">${p.hourlyCents ? money(p.hourlyCents) : "—"}</b>
          ${p.hourlyCents ? `<span class="faint" style="font-size:11.5px">/hora</span>` : ""}
        </div>
        ${specs.length ? `<div class="row wrap" style="gap:6px;margin-top:12px">${specs.map((s) => `<span class="chip soft">${esc(s)}</span>`).join("")}</div>` : ""}
        <p class="faint" style="font-size:12px;margin-top:12px">Edita tarifa, bio y video desde tu perfil de coach.</p>
      </div>

      <div class="card card-pad fade-up" style="--d:1">
        <div class="row between vcenter">
          <b style="font-size:14px">Franjas semanales</b>
          <span class="badge sky">${sorted.length}</span>
        </div>
        <p class="faint" style="font-size:12px;margin-top:4px">Los alumnos solo pueden reservar dentro de estas ventanas (sesiones de 60 min).</p>
        ${sorted.length
          ? `<div style="margin-top:8px">${sorted.map((a) => `
            <div class="row vcenter" style="gap:10px;padding:10px 0;border-bottom:1px solid var(--border)">
              <span style="display:inline-flex;width:15px;height:15px;color:var(--otr-sky-lo);flex:none">${IC.clock}</span>
              <span style="flex:1;font-size:13px;font-weight:600">${availLabel(a)}</span>
              <button class="btn btn-quiet btn-sm" data-cw-rmav="${esc(a.id || "")}" title="Eliminar franja" style="color:var(--danger);padding:4px 8px"><span style="display:inline-flex;width:14px;height:14px">${IC.close}</span></button>
            </div>`).join("")}</div>`
          : `<p class="muted" style="font-size:13px;margin-top:12px">Sin franjas publicadas — los alumnos verán el horario estándar OTR. Añade las tuyas para controlar tu agenda.</p>`}

        <div class="divider"></div>
        <p class="label" style="margin-bottom:8px">Añadir franja</p>
        <div class="row wrap vcenter" style="gap:8px">
          <select class="select" id="cw-av-day" style="width:auto;min-width:130px">
            ${DIAS.map((d, i) => `<option value="${i}" ${i === 1 ? "selected" : ""}>${d}</option>`).join("")}
          </select>
          <select class="select" id="cw-av-start" style="width:auto;min-width:110px">${timeOptions(16 * 60)}</select>
          <span class="faint" style="font-size:12.5px">a</span>
          <select class="select" id="cw-av-end" style="width:auto;min-width:110px">${timeOptions(18 * 60)}</select>
          <button class="btn btn-primary btn-sm" id="cw-av-add">${IC.plus} Añadir</button>
        </div>
      </div>
    </div>

    <div class="stack" style="gap:16px">
      <div class="card card-pad fade-up" style="--d:1">
        <b style="font-size:14px">Tus paquetes</b>
        <p class="faint" style="font-size:12px;margin-top:4px">Solo lectura — se gestionan desde tu perfil de coach.</p>
        ${pkgs.length
          ? `<div class="stack" style="gap:8px;margin-top:10px">${pkgs.map((k) => `
            <div class="tile" style="padding:11px 13px;display:flex;align-items:center;gap:10px">
              <span style="flex:1;min-width:0">
                <b style="font-size:13px;display:block">${esc(k.name || (Number(k.sessions) > 1 ? `Paquete de ${k.sessions}` : "Sesión individual"))}</b>
                <span class="faint" style="font-size:11.5px">${Number(k.sessions) || 1} sesión${Number(k.sessions) === 1 ? "" : "es"} · 60 min</span>
              </span>
              ${Number(k.discountPct) > 0 ? `<span class="badge ok" style="flex:none">-${Number(k.discountPct)}%</span>` : ""}
              <b class="cc-pct" style="font-size:14px;font-weight:800;flex:none">${money(k.priceCents)}</b>
            </div>`).join("")}</div>`
          : `<p class="muted" style="font-size:13px;margin-top:10px">Sin paquetes publicados — los alumnos verán los paquetes indicativos derivados de tu tarifa.</p>`}
      </div>

      <div class="alert info fade-up" style="--d:2"><span class="ai">${IC.lock}</span>
        <div><div class="at">Marketplace seguro</div>Sesiones y pagos siempre dentro de OTR — los fondos quedan en escrow y se liberan al completar cada sesión.</div>
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
    <div class="page-head fade-up"><div>
      <p class="eyebrow">Espacio de coach</p>
      <div class="page-title">Reservas e ingresos</div>
      <div class="page-sub">Reservas, pagos con escrow y disponibilidad — todo dentro de OTR</div>
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
        btn.textContent = "Completando…";
        try {
          const d = await w.api(`/api/bookings/${encodeURIComponent(id)}`, { action: "complete" }, "PATCH");
          const payout = (d && d.escrow && Number(d.escrow.payoutCents)) || 0;
          moveToPast(id, "COMPLETED", "RELEASED", payout);
          w.toast?.(`Sesión completada — payout ${money(payout)}`, "ok");
          repaint();
        } catch (e) {
          w.toast?.((e && e.message) || "No se pudo completar la sesión", "danger");
          btn.disabled = false;
          btn.textContent = "Completar sesión";
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
          btn.textContent = "¿Seguro? Tocar de nuevo";
          setTimeout(() => {
            if (btn.isConnected && btn.getAttribute("data-armed") === "1") {
              btn.removeAttribute("data-armed");
              btn.textContent = "Cancelar";
            }
          }, 4000);
          return;
        }
        btn.disabled = true;
        btn.textContent = "Cancelando…";
        try {
          await w.api(`/api/bookings/${encodeURIComponent(id)}`, { action: "cancel" }, "PATCH");
          moveToPast(id, "CANCELLED", "REFUNDED", 0);
          w.toast?.("Reserva cancelada — fondos reembolsados al alumno", "ok");
          repaint();
        } catch (e) {
          w.toast?.((e && e.message) || "No se pudo cancelar la reserva", "danger");
          btn.disabled = false;
          btn.removeAttribute("data-armed");
          btn.textContent = "Cancelar";
        }
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
          w.toast?.("Franja eliminada", "ok");
          repaint();
        } catch (e) {
          w.toast?.((e && e.message) || "No se pudo eliminar la franja", "danger");
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
        w.toast?.("La hora de fin debe ser posterior a la de inicio", "warn");
        return;
      }
      addBtn.disabled = true;
      addBtn.textContent = "Añadiendo…";
      try {
        const d = await w.api("/api/coach-profile", { addAvailability: { weekday, startMin, endMin } }, "PATCH");
        applyProfile(d);
        w.toast?.("Franja añadida", "ok");
        repaint();
      } catch (e) {
        w.toast?.((e && e.message) || "No se pudo añadir la franja", "danger");
        addBtn.disabled = false;
        addBtn.innerHTML = `${IC.plus} Añadir`;
      }
    });
  },
};
