// @ts-nocheck
/* OTR · Marketplace de coaches (PRD §7) — S.marketplace.
   Trust & Safety por menores: NUNCA contacto fuera de plataforma; pagos siempre
   vía escrow; si el alumno es menor, la reserva pasa por el candado de
   consentimiento parental (status PENDING hasta que el padre apruebe).

   Datos:
     DB.marketplace = { coaches:[{ id, name, initials, headline, verified|coachVerified,
       ratingAvg|rating, reviewCount|reviews, languages, specialties, hourlyCents,
       fromCents?, responseTime, bookingCount, introVideoUrl, photoUrl,
       packages?:[{id,name,sessions,priceCents,discountPct}],
       availability?:[{weekday,startMin,endMin}] }], viewer?:{ ageBand } }
   Detalle bajo demanda: GET /api/coaches/[id] (bio, credenciales, paquetes,
   disponibilidad, reviews). Reserva: POST /api/bookings { coachId, packageId,
   slotAt, durationMin } → { booking:{ status:PENDING|CONFIRMED } }.

   Patrón de la casa: render(state)->string + mount(root,state); IC.* iconos,
   esc() para texto del usuario, navy + sky, fade-up; nada de emojis.
   Acciones del cliente vía los globales de Aula.tsx: api(), toast(), data-go. */
import { DB } from "./data";
import { C } from "./components";
import { IC } from "./icons";
import { esc } from "./esc";

export const S = {};

/* ---------------- helpers visuales ---------------- */
const stars = (n, size = 13) => {
  let s = "";
  for (let i = 1; i <= 5; i++) {
    const fill = i <= Math.round(n || 0) ? "var(--otr-sky-lo)" : "var(--n-200)";
    s += `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${fill}" style="flex:none"><path d="M12 3.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8L12 17l-5.3 2.7 1-5.8L3.5 9.7l5.9-.9z"/></svg>`;
  }
  return `<span style="display:inline-flex;gap:2px;align-items:center">${s}</span>`;
};
const money = (cents) => {
  const v = (Number(cents) || 0) / 100;
  return `$${v % 1 ? v.toFixed(2) : v.toFixed(0)}`;
};
const ini = (name) => (String(name || "C").replace(/Coach /i, "").split(" ").map((w) => w[0]).join("") || "C").slice(0, 2).toUpperCase();
// Solo deja pasar URLs http(s) o rutas locales (nunca javascript: u otros esquemas).
const safeSrc = (u) => {
  const s = String(u || "").trim();
  return /^https?:\/\//i.test(s) || (s.startsWith("/") && !s.startsWith("//")) ? s : "";
};
const langBadges = (languages) =>
  String(languages || "ES").split(/[,·\/]/).map((l) => l.trim()).filter(Boolean).slice(0, 3)
    .map((l) => `<span class="badge">${esc(l.toUpperCase())}</span>`).join("");

/* ---------------- normalización de datos (defensiva) ---------------- */
function normCoach(c = {}) {
  const name = c.name || "Coach OTR";
  const packages = Array.isArray(c.packages) ? c.packages : [];
  const hourly = Number(c.hourlyCents) || 0;
  // "desde $X": el menor precio por sesión entre paquetes; si no hay, la tarifa por hora.
  const perSession = packages
    .map((p) => (Number(p.sessions) > 0 ? (Number(p.priceCents) || 0) / Number(p.sessions) : 0))
    .filter((v) => v > 0);
  const fromCents = Number(c.fromCents) || (perSession.length ? Math.round(Math.min(...perSession)) : hourly);
  return {
    id: c.id || "",
    name,
    initials: c.initials || ini(name),
    headline: c.headline || "Coach OTR",
    verified: !!(c.verified != null ? c.verified : c.coachVerified),
    rating: Number(c.ratingAvg != null ? c.ratingAvg : c.rating) || 0,
    reviews: Number(c.reviewCount != null ? c.reviewCount : c.reviews) || 0,
    languages: c.languages || "ES",
    specialties: c.specialties || "",
    credentials: c.credentials || "",
    bio: c.bio || "",
    responseTime: c.responseTime || "",
    cancelPolicy: c.cancelPolicy || "",
    bookingCount: Number(c.bookingCount) || 0,
    hourlyCents: hourly,
    fromCents,
    introVideoUrl: safeSrc(c.introVideoUrl),
    photoUrl: safeSrc(c.photoUrl || c.avatarUrl),
    packages,
    availability: Array.isArray(c.availability) ? c.availability : [],
    reviewsList: Array.isArray(c.reviewsList) ? c.reviewsList : Array.isArray(c.reviewItems) ? c.reviewItems : [],
  };
}
function mkCoaches() {
  const m = DB.marketplace || {};
  return (Array.isArray(m.coaches) ? m.coaches : []).map(normCoach);
}
// ageBand del usuario que mira: 'minor' activa el candado de consentimiento parental.
function viewerAgeBand() {
  const m = DB.marketplace || {};
  return (m.viewer && m.viewer.ageBand) || m.ageBand || (DB.me && DB.me.ageBand) || null;
}
const isMinor = () => viewerAgeBand() === "minor";

/* ---------------- estado local de la pantalla (patrón window.__x) ---------------- */
const filtersState = () => {
  const w = window;
  if (!w.__mkF) w.__mkF = { lang: "all", spec: "Todos", price: "all", sort: "top" };
  return w.__mkF;
};
const selState = () => {
  const w = window;
  if (!w.__mkSel) w.__mkSel = { pkg: null, dayKey: null, slotIso: null, slotLabel: "", dayLabel: "" };
  return w.__mkSel;
};
const resetSel = () => { (window).__mkSel = { pkg: null, dayKey: null, slotIso: null, slotLabel: "", dayLabel: "" }; };

/* ---------------- disponibilidad → días + slots (patrón del flujo /consulta) ---------------- */
const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const SLOT_MIN = 60; // sesiones de 60 min
const LEAD_MS = 12 * 3600 * 1000; // no reservar dentro de las próximas 12h
const pad2 = (n) => String(n).padStart(2, "0");
function fmtTime(h, m) {
  const ampm = h >= 12 ? "PM" : "AM";
  let hh = h % 12; if (hh === 0) hh = 12;
  return `${hh}:${pad2(m)} ${ampm}`;
}
// Si el coach no publicó disponibilidad, usamos la ventana estándar OTR (lun–sáb 9–18).
function availRows(c) {
  if (c.availability.length) return { rows: c.availability, generic: false };
  return { rows: [1, 2, 3, 4, 5, 6].map((w) => ({ weekday: w, startMin: 9 * 60, endMin: 18 * 60 })), generic: true };
}
function nextDays(rows, n = 14) {
  const out = [];
  const now = new Date();
  for (let i = 1; i <= n; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    if (!rows.some((r) => Number(r.weekday) === d.getDay())) continue;
    out.push({
      key: `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`,
      label: `${DIAS[d.getDay()]} ${d.getDate()} ${MESES[d.getMonth()]}`,
      date: d,
    });
  }
  return out;
}
function slotsFor(rows, day) {
  if (!day) return [];
  const lead = Date.now() + LEAD_MS;
  const seen = new Set();
  const out = [];
  rows.filter((r) => Number(r.weekday) === day.date.getDay()).forEach((r) => {
    const start = Math.max(0, Number(r.startMin) || 0);
    const end = Number(r.endMin) || 0;
    for (let m = start; m + SLOT_MIN <= end; m += SLOT_MIN) {
      const dt = new Date(day.date.getFullYear(), day.date.getMonth(), day.date.getDate(), Math.floor(m / 60), m % 60);
      if (dt.getTime() < lead || seen.has(dt.getTime())) continue;
      seen.add(dt.getTime());
      out.push({ iso: dt.toISOString(), label: fmtTime(dt.getHours(), dt.getMinutes()) });
    }
  });
  return out.sort((a, b) => (a.iso < b.iso ? -1 : 1));
}

/* ---------------- paquetes (Single / 5-pack / 10-pack del PRD) ---------------- */
function coachPackages(c) {
  if (c.packages.length) {
    return [...c.packages]
      .sort((a, b) => (Number(a.position) || 0) - (Number(b.position) || 0))
      .map((p, i) => ({
        key: p.id || `pkg-${i}`,
        id: p.id || "",
        name: p.name || (Number(p.sessions) > 1 ? `Paquete de ${p.sessions}` : "Sesión individual"),
        sessions: Number(p.sessions) || 1,
        priceCents: Number(p.priceCents) || 0,
        discountPct: Number(p.discountPct) || 0,
      }));
  }
  // Sin paquetes publicados → derivamos los 3 del PRD desde la tarifa por hora (indicativos).
  if (c.hourlyCents > 0) {
    const h = c.hourlyCents;
    return [
      { key: "derived-1", id: "", name: "Sesión individual", sessions: 1, priceCents: h, discountPct: 0 },
      { key: "derived-5", id: "", name: "Paquete de 5", sessions: 5, priceCents: Math.round(h * 5 * 0.9), discountPct: 10 },
      { key: "derived-10", id: "", name: "Paquete de 10", sessions: 10, priceCents: Math.round(h * 10 * 0.8), discountPct: 20 },
    ];
  }
  return [];
}

/* ---------------- tarjeta de coach (grid) ---------------- */
function coachCard(c, i) {
  const avatar = c.photoUrl
    ? `<span class="avatar lg" style="background:var(--otr-navy) url('${esc(c.photoUrl)}') center/cover no-repeat;color:transparent">${esc(c.initials)}</span>`
    : C.avatar(esc(c.initials), { size: "lg", bg: "var(--otr-navy)" });
  return `
  <div class="tile click fade-up" data-coach="${esc(c.id)}" style="display:flex;flex-direction:column;--d:${i}">
    <div class="row" style="gap:12px">
      ${avatar}
      <div style="min-width:0;flex:1">
        <div class="row vcenter wrap" style="gap:7px">
          <b style="font-size:14.5px;line-height:1.3">${esc(c.name)}</b>
          ${c.verified ? `<span class="badge sky" style="flex:none"><span style="display:inline-flex;width:12px;height:12px">${IC.checkCircle}</span>Verificado</span>` : ""}
        </div>
        <div class="muted" style="font-size:12px;margin-top:3px">${esc(c.headline)}</div>
        <div class="row vcenter" style="gap:6px;margin-top:6px">
          ${stars(c.rating, 12)}<b style="font-size:12.5px">${c.rating ? c.rating.toFixed(1) : "—"}</b>
          <span class="faint" style="font-size:12px">(${c.reviews} reseña${c.reviews === 1 ? "" : "s"})</span>
        </div>
      </div>
    </div>
    <div class="row wrap" style="gap:6px;margin-top:12px">
      ${langBadges(c.languages)}
      ${String(c.specialties).split(/[,·]/).map((s) => s.trim()).filter(Boolean).slice(0, 2).map((s) => `<span class="badge">${esc(s)}</span>`).join("")}
    </div>
    <div class="divider" style="margin:14px 0"></div>
    <div class="row between vcenter" style="margin-top:auto;gap:10px">
      ${c.fromCents > 0
        ? `<span style="font-size:13px;color:var(--text-2)">desde <b class="cc-pct" style="font-size:15px;font-weight:800">${money(c.fromCents)}</b><span class="faint" style="font-size:11.5px"> /sesión</span></span>`
        : `<span class="faint" style="font-size:12px">Precio a consultar</span>`}
      <span class="sky row vcenter" style="font-size:12.5px;font-weight:600;gap:4px;flex:none">Ver perfil <span style="display:inline-flex;width:14px;height:14px">${IC.arrowR}</span></span>
    </div>
  </div>`;
}

/* ---------------- filtros + grid ---------------- */
function applyFilters(list) {
  const f = filtersState();
  let out = list.filter((c) => {
    if (f.lang !== "all" && !String(c.languages).toUpperCase().includes(f.lang)) return false;
    if (f.spec !== "Todos" && !String(c.specialties).toLowerCase().includes(f.spec.toLowerCase())) return false;
    if (f.price === "low" && !(c.fromCents > 0 && c.fromCents < 5000)) return false;
    if (f.price === "mid" && !(c.fromCents >= 5000 && c.fromCents <= 10000)) return false;
    if (f.price === "high" && !(c.fromCents > 10000)) return false;
    return true;
  });
  if (f.sort === "priceAsc") out = out.sort((a, b) => (a.fromCents || 1e15) - (b.fromCents || 1e15));
  else if (f.sort === "priceDesc") out = out.sort((a, b) => (b.fromCents || 0) - (a.fromCents || 0));
  else if (f.sort === "reviews") out = out.sort((a, b) => b.reviews - a.reviews);
  else out = out.sort((a, b) => b.rating - a.rating || b.reviews - a.reviews);
  return out;
}

function renderGrid() {
  const all = mkCoaches();
  const f = filtersState();
  const specs = ["Todos", ...new Set(all.flatMap((c) => String(c.specialties).split(/[,·]/).map((s) => s.trim()).filter(Boolean)))].slice(0, 8);
  const list = applyFilters(all);
  return `
  <div class="page-head"><div>
    <p class="eyebrow">Marketplace</p>
    <div class="page-title">Coaches</div>
    <div class="page-sub">Entrena con los coaches más dominantes del país — reservas seguras y pagos protegidos, todo dentro de OTR</div>
  </div>
  <span class="badge sky">${list.length} coach${list.length === 1 ? "" : "es"}</span></div>

  <div class="row wrap vcenter" style="gap:8px;margin-bottom:12px" id="mk-specs">
    ${specs.map((s) => `<button class="chip ${f.spec === s ? "active" : ""}" data-mk-spec="${esc(s)}">${esc(s)}</button>`).join("")}
  </div>
  <div class="row wrap vcenter" style="gap:10px;margin-bottom:22px">
    <select class="select" data-mk-lang style="width:auto;min-width:130px">
      <option value="all" ${f.lang === "all" ? "selected" : ""}>Idioma: todos</option>
      <option value="ES" ${f.lang === "ES" ? "selected" : ""}>Español (ES)</option>
      <option value="EN" ${f.lang === "EN" ? "selected" : ""}>Inglés (EN)</option>
    </select>
    <select class="select" data-mk-price style="width:auto;min-width:150px">
      <option value="all" ${f.price === "all" ? "selected" : ""}>Precio: todos</option>
      <option value="low" ${f.price === "low" ? "selected" : ""}>Menos de $50</option>
      <option value="mid" ${f.price === "mid" ? "selected" : ""}>$50 – $100</option>
      <option value="high" ${f.price === "high" ? "selected" : ""}>Más de $100</option>
    </select>
    <select class="select" data-mk-sort style="width:auto;min-width:170px">
      <option value="top" ${f.sort === "top" ? "selected" : ""}>Mejor valorados</option>
      <option value="reviews" ${f.sort === "reviews" ? "selected" : ""}>Más reseñas</option>
      <option value="priceAsc" ${f.sort === "priceAsc" ? "selected" : ""}>Precio: menor a mayor</option>
      <option value="priceDesc" ${f.sort === "priceDesc" ? "selected" : ""}>Precio: mayor a menor</option>
    </select>
  </div>

  ${list.length
    ? `<div class="grid g-3">${list.map(coachCard).join("")}</div>`
    : `<div class="card"><div class="empty"><div class="ill">${IC.search}</div><h4>No hay coaches con esos filtros</h4><p>Prueba con otro idioma, especialidad o rango de precio.</p></div></div>`}

  <div class="alert info fade-up" style="--d:2;margin-top:22px"><span class="ai">${IC.lock}</span>
    <div><div class="at">Marketplace seguro</div>Toda la comunicación y los pagos ocurren dentro de OTR. Los fondos quedan en custodia (escrow) y se liberan al coach solo cuando la sesión se completa.</div>
  </div>`;
}

/* ---------------- perfil de coach + flujo de reserva ---------------- */
function heroBlock(c) {
  if (c.introVideoUrl) {
    const yt = c.introVideoUrl.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/);
    const inner = yt
      ? `<iframe src="https://www.youtube-nocookie.com/embed/${esc(yt[1])}" title="Video de presentación" allow="accelerometer; encrypted-media; picture-in-picture" allowfullscreen style="width:100%;height:100%;border:0;display:block"></iframe>`
      : `<video controls preload="metadata" src="${esc(c.introVideoUrl)}" style="width:100%;height:100%;display:block;object-fit:cover;background:#000"></video>`;
    return `<div style="aspect-ratio:16/9;background:var(--otr-ink)">${inner}</div>`;
  }
  return `
  <div style="background:linear-gradient(140deg,var(--otr-navy),var(--otr-ink));padding:34px 26px;display:flex;align-items:center;gap:16px">
    ${C.avatar(esc(c.initials), { size: "lg", bg: "rgba(255,255,255,.14)" })}
    <div>
      <p class="eyebrow" style="color:var(--otr-sky-hi)">Coach verificado de OTR</p>
      <div class="brand-font" style="font-size:24px;font-weight:800;color:#fff;margin-top:2px">${esc(c.name)}</div>
      <p style="color:rgba(234,242,251,.72);font-size:12.5px;margin-top:4px">Su video de presentación llega pronto — su historial habla por él.</p>
    </div>
  </div>`;
}

function consentGate() {
  const band = viewerAgeBand();
  if (band === "minor") {
    return `
    <div class="alert warn" style="margin-top:14px"><span class="ai">${IC.lock}</span>
      <div><div class="at">Candado de consentimiento parental</div>
      Eres menor de edad: al reservar, le enviaremos la solicitud a tu padre, madre o tutor.
      La sesión queda <b>pendiente</b> hasta que la apruebe desde su Portal de familia.</div>
    </div>`;
  }
  if (!band) {
    return `<p class="faint" style="font-size:12px;margin-top:12px;display:flex;gap:6px;align-items:flex-start"><span style="display:inline-flex;width:14px;height:14px;flex:none;margin-top:1px">${IC.lock}</span>Si eres menor de edad, tu reserva requerirá la aprobación de tu padre, madre o tutor.</p>`;
  }
  return "";
}

function bookedPanel(b) {
  const pending = String(b.status || "").toUpperCase() === "PENDING";
  return `
  <div class="card card-pad fade-up" style="border-color:${pending ? "var(--warn)" : "var(--ok)"}">
    <div class="row vcenter" style="gap:10px">
      <div class="notif-ic ${pending ? "warn" : "ok"}" style="width:40px;height:40px;border-radius:11px">${pending ? IC.clock : IC.checkCircle}</div>
      <div>
        <b style="font-size:14px">${pending ? "Reserva enviada — esperando aprobación" : "¡Sesión confirmada!"}</b>
        <div class="muted" style="font-size:12.5px;margin-top:2px">${esc(b.pkgName || "Sesión")} · ${esc(b.dayLabel || "")} ${esc(b.slotLabel || "")}</div>
      </div>
    </div>
    <div class="divider"></div>
    <p class="muted" style="font-size:12.5px;line-height:1.55">${pending
      ? "Le avisamos a tu padre, madre o tutor para que apruebe la sesión desde su Portal de familia. Te notificaremos en cuanto quede confirmada."
      : "Tu pago quedó protegido en custodia (escrow). La sesión ocurre dentro de OTR y los fondos se liberan al coach cuando se completa."}</p>
    <div class="row" style="gap:8px;margin-top:12px">
      <button class="btn btn-soft btn-sm" data-go="messages">${IC.msg} Mensajes</button>
      <button class="btn btn-ghost btn-sm" data-mk-back>Ver más coaches</button>
    </div>
  </div>`;
}

function bookingCard(c, canBook) {
  const w = window;
  const booked = (w.__mkBooked || {})[c.id];
  if (booked) return bookedPanel(booked);
  if (!canBook) {
    return `
    <div class="card card-pad">
      <b style="font-size:13.5px">Reservas</b>
      <p class="muted" style="font-size:12.5px;margin-top:6px">Los estudiantes pueden reservar sesiones desde este perfil. Como coach, gestiona tu perfil y tu disponibilidad desde tu espacio de coach.</p>
    </div>`;
  }
  const sel = selState();
  const pkgs = coachPackages(c);
  const pkg = pkgs.find((p) => p.key === sel.pkg) || pkgs[0] || null;
  const { rows, generic } = availRows(c);
  const days = nextDays(rows);
  const day = days.find((d) => d.key === sel.dayKey) || days[0] || null;
  const slots = slotsFor(rows, day);
  const ready = !!(sel.slotIso && (pkg || !pkgs.length));

  return `
  <div class="card card-pad">
    <b style="font-size:14px">Reserva tu sesión</b>

    <p class="label" style="margin:14px 0 8px">1 · Elige tu paquete</p>
    ${pkgs.length ? `<div class="stack" style="gap:8px">
      ${pkgs.map((p) => {
        const on = pkg && p.key === pkg.key;
        const per = p.sessions > 1 ? `<span class="faint" style="font-size:11.5px">${money(Math.round(p.priceCents / p.sessions))}/sesión</span>` : "";
        return `
        <button class="tile" data-mk-pkg="${esc(p.key)}" style="display:flex;align-items:center;gap:10px;width:100%;text-align:left;cursor:pointer;padding:11px 13px;${on ? "border-color:var(--otr-sky);box-shadow:var(--ring)" : ""}">
          <span style="flex:1;min-width:0">
            <b style="font-size:13px;display:block">${esc(p.name)}</b>
            <span class="faint" style="font-size:11.5px">${p.sessions} sesión${p.sessions === 1 ? "" : "es"} · 60 min</span>
          </span>
          ${p.discountPct > 0 ? `<span class="badge ok" style="flex:none">-${p.discountPct}%</span>` : ""}
          <span style="flex:none;text-align:right"><b class="cc-pct" style="font-size:14px;font-weight:800">${money(p.priceCents)}</b>${per ? `<span style="display:block">${per}</span>` : ""}</span>
        </button>`;
      }).join("")}
    </div>` : `<p class="faint" style="font-size:12.5px">Este coach aún no publicó paquetes — puedes reservar una sesión individual y acordar el precio dentro de OTR.</p>`}

    <p class="label" style="margin:16px 0 8px">2 · Elige el día ${generic ? `<span class="faint" style="font-weight:400">(horario estándar OTR, 9:00–18:00)</span>` : ""}</p>
    ${days.length
      ? `<div class="row wrap" style="gap:6px">${days.slice(0, 10).map((d) => `<button class="chip ${day && d.key === day.key ? "active" : ""}" data-mk-day="${d.key}">${d.label}</button>`).join("")}</div>`
      : `<p class="faint" style="font-size:12.5px">Este coach no tiene días disponibles en las próximas dos semanas.</p>`}

    <p class="label" style="margin:16px 0 8px">3 · Elige la hora</p>
    ${slots.length
      ? `<div class="row wrap" style="gap:6px">${slots.map((s) => `<button class="chip ${sel.slotIso === s.iso ? "active" : ""}" data-mk-slot="${s.iso}" data-mk-slot-label="${s.label}">${s.label}</button>`).join("")}</div>`
      : `<p class="faint" style="font-size:12.5px">Sin horarios libres este día — prueba con otro.</p>`}

    ${pkg && sel.slotIso ? `
    <div class="divider"></div>
    <div class="stack" style="gap:6px;font-size:13px">
      <div class="row between"><span class="muted">Paquete</span><b>${esc(pkg.name)}</b></div>
      <div class="row between"><span class="muted">Primera sesión</span><b>${esc(sel.dayLabel || (day ? day.label : ""))} · ${esc(sel.slotLabel)}</b></div>
      <div class="row between"><span class="muted">Total (tarifa de servicio incluida)</span><b class="cc-pct" style="font-size:15px;font-weight:800">${money(pkg.priceCents)}</b></div>
    </div>
    <p class="faint" style="font-size:11.5px;margin-top:8px">Tu pago queda en custodia (escrow) y se libera al coach al completar la sesión.</p>` : ""}

    ${consentGate()}

    <button class="btn btn-primary btn-block" id="mk-confirm" style="margin-top:14px" ${ready ? "" : "disabled"}>
      ${isMinor() ? "Solicitar aprobación y reservar" : "Confirmar reserva"}
    </button>
    <button class="btn btn-soft btn-block btn-sm" data-go="messages" style="margin-top:8px">${IC.msg} Enviar mensaje</button>
    <p class="faint" style="font-size:11px;margin-top:10px;text-align:center">Sesiones y pagos siempre dentro de OTR — nunca por fuera.</p>
  </div>`;
}

function renderProfile(state) {
  const w = window;
  const id = w.__mkCoachId;
  const base = mkCoaches().find((c) => c.id === id);
  const detail = w.__mkDetail && w.__mkDetail.id === id ? w.__mkDetail.data : null;
  const loading = !detail && !(w.__mkDetailFail === id);
  const c = normCoach({ ...(base || { id }), ...(detail || {}) });
  const canBook = (state && state.role) !== "teacher";
  const specs = String(c.specialties).split(/[,·]/).map((s) => s.trim()).filter(Boolean);
  const reviews = c.reviewsList;

  return `
  <button class="btn btn-quiet btn-sm" data-mk-back style="margin-bottom:14px">${IC.chevL} Volver a coaches</button>

  <div class="card fade-up" style="overflow:hidden;margin-bottom:18px">
    ${heroBlock(c)}
    <div style="padding:18px 22px">
      <div class="row between wrap" style="gap:12px;align-items:flex-start">
        <div style="min-width:0">
          <div class="row vcenter wrap" style="gap:8px">
            <b class="brand-font" style="font-size:19px">${esc(c.name)}</b>
            ${c.verified ? `<span class="badge sky"><span style="display:inline-flex;width:12px;height:12px">${IC.checkCircle}</span>Verificado</span>` : ""}
            ${langBadges(c.languages)}
          </div>
          <div class="muted" style="font-size:13px;margin-top:4px">${esc(c.headline)}</div>
          <div class="row vcenter wrap" style="gap:8px;margin-top:8px;font-size:12.5px">
            ${stars(c.rating, 13)}<b>${c.rating ? c.rating.toFixed(1) : "—"}</b>
            <span class="faint">${c.reviews} reseña${c.reviews === 1 ? "" : "s"}</span>
            ${c.bookingCount ? `<span class="dot-sep"></span><span class="faint">${c.bookingCount} sesiones reservadas</span>` : ""}
            ${c.responseTime ? `<span class="dot-sep"></span><span class="faint">Responde en ${esc(c.responseTime)}</span>` : ""}
          </div>
        </div>
        ${c.fromCents > 0 ? `<div style="text-align:right;flex:none"><span class="faint" style="font-size:11.5px;display:block">desde</span><b class="cc-pct brand-font" style="font-size:22px;font-weight:800">${money(c.fromCents)}</b><span class="faint" style="font-size:11.5px;display:block">por sesión</span></div>` : ""}
      </div>
    </div>
  </div>

  <div class="split rail-360">
    <div class="stack" style="gap:16px">
      ${loading ? `<div class="card card-pad fade-up"><p class="muted" style="font-size:13px">Cargando el perfil completo…</p></div>` : ""}
      <div class="card card-pad fade-up" style="--d:1">
        <b style="font-size:13.5px">Sobre ${esc(c.name.split(" ")[0] || "el coach")}</b>
        <p class="muted" style="font-size:13.5px;line-height:1.6;margin-top:8px">${c.bio ? esc(c.bio) : "Este coach todavía no escribió su biografía."}</p>
        ${c.credentials ? `<div class="divider"></div><b style="font-size:13px">Credenciales</b><div class="stack" style="gap:6px;margin-top:8px">${String(c.credentials).split(/\n|;/).map((x) => x.trim()).filter(Boolean).map((x) => `<div class="row" style="gap:8px;font-size:12.5px;color:var(--text-2)"><span style="display:inline-flex;width:14px;height:14px;flex:none;color:var(--otr-sky-lo);margin-top:1px">${IC.award}</span>${esc(x)}</div>`).join("")}</div>` : ""}
        ${specs.length ? `<div class="divider"></div><b style="font-size:13px">Especialidades</b><div class="row wrap" style="gap:6px;margin-top:8px">${specs.map((s) => `<span class="badge">${esc(s)}</span>`).join("")}</div>` : ""}
      </div>

      <div class="card card-pad fade-up" style="--d:2">
        <div class="row between vcenter"><b style="font-size:13.5px">Reseñas</b><span class="badge sky">${c.reviews}</span></div>
        <p class="faint" style="font-size:11.5px;margin-top:4px">Solo quienes completaron una sesión con este coach pueden dejar reseña.</p>
        ${reviews.length ? `<div class="stack" style="gap:0;margin-top:6px">${reviews.slice(0, 6).map((r) => `
          <div style="padding:12px 0;border-bottom:1px solid var(--border)">
            <div class="row vcenter" style="gap:9px">
              ${C.avatar(esc(r.initials || ini(r.author || r.name)), { size: "sm", bg: "var(--otr-sky-lo)" })}
              <b style="font-size:12.5px">${esc(r.author || r.name || "Alumno OTR")}</b>
              ${stars(Number(r.rating) || 0, 11)}
              <span class="faint" style="font-size:11.5px;margin-left:auto">${esc(r.when || "")}</span>
            </div>
            ${r.body ? `<p class="muted" style="font-size:12.5px;line-height:1.55;margin-top:7px">${esc(r.body)}</p>` : ""}
          </div>`).join("")}</div>`
        : `<p class="muted" style="font-size:12.5px;margin-top:10px">Aún no hay reseñas. Sé el primero en entrenar con ${esc(c.name.split(" ")[0] || "este coach")}.</p>`}
      </div>

      <div class="alert info fade-up" style="--d:3"><span class="ai">${IC.lock}</span>
        <div><div class="at">Tu seguridad primero</div>Las sesiones se hacen dentro de OTR, los pagos quedan en custodia (escrow) y nunca se comparte contacto fuera de la plataforma.</div>
      </div>
    </div>

    <div class="stack" style="gap:16px">
      <div class="fade-up" style="--d:1" id="mk-booking">${bookingCard(c, canBook)}</div>
      ${c.cancelPolicy ? `<div class="card card-pad fade-up" style="--d:2"><b style="font-size:13px">Política de cancelación</b><p class="muted" style="font-size:12.5px;line-height:1.55;margin-top:6px">${esc(c.cancelPolicy)}</p></div>` : ""}
    </div>
  </div>`;
}

/* ---------------- pantalla ---------------- */
S.marketplace = {
  render(state) {
    return (window).__mkCoachId ? renderProfile(state) : renderGrid();
  },

  mount(root, state) {
    const w = window;
    const repaint = () => {
      const page = root.querySelector(".page");
      if (!page) return;
      page.innerHTML = S.marketplace.render(state);
      S.marketplace.mount(root, state);
    };

    // Abrir perfil de coach → carga el detalle real bajo demanda (GET /api/coaches/[id]).
    root.querySelectorAll("[data-coach]").forEach((el) =>
      el.addEventListener("click", async () => {
        const id = el.getAttribute("data-coach");
        w.__mkCoachId = id;
        resetSel();
        repaint();
        const content = root.closest("#content") || root;
        content.scrollTop = 0;
        if (!(w.__mkDetail && w.__mkDetail.id === id)) {
          try {
            const d = await w.api(`/api/coaches/${encodeURIComponent(id)}`, null, "GET");
            w.__mkDetail = { id, data: (d && (d.coach || d)) || {} };
            w.__mkDetailFail = null;
          } catch (e) {
            w.__mkDetailFail = id; // seguimos con los datos del listado
          }
          if (w.__mkCoachId === id) repaint();
        }
      })
    );

    // Volver al grid.
    root.querySelectorAll("[data-mk-back]").forEach((el) =>
      el.addEventListener("click", () => { w.__mkCoachId = null; repaint(); })
    );

    // Filtros del grid.
    root.querySelectorAll("[data-mk-spec]").forEach((el) =>
      el.addEventListener("click", () => { filtersState().spec = el.getAttribute("data-mk-spec"); repaint(); })
    );
    const bindSel = (attr, key) => {
      const sel = root.querySelector(`[${attr}]`);
      sel?.addEventListener("change", () => { filtersState()[key] = sel.value; repaint(); });
    };
    bindSel("data-mk-lang", "lang");
    bindSel("data-mk-price", "price");
    bindSel("data-mk-sort", "sort");

    // Flujo de reserva: paquete → día → hora.
    root.querySelectorAll("[data-mk-pkg]").forEach((el) =>
      el.addEventListener("click", () => { selState().pkg = el.getAttribute("data-mk-pkg"); repaint(); })
    );
    root.querySelectorAll("[data-mk-day]").forEach((el) =>
      el.addEventListener("click", () => {
        const s = selState();
        s.dayKey = el.getAttribute("data-mk-day");
        s.dayLabel = el.textContent.trim();
        s.slotIso = null; s.slotLabel = "";
        repaint();
      })
    );
    root.querySelectorAll("[data-mk-slot]").forEach((el) =>
      el.addEventListener("click", () => {
        const s = selState();
        s.slotIso = el.getAttribute("data-mk-slot");
        s.slotLabel = el.getAttribute("data-mk-slot-label") || el.textContent.trim();
        if (!s.dayLabel) {
          const active = root.querySelector("[data-mk-day].active");
          s.dayLabel = active ? active.textContent.trim() : "";
        }
        repaint();
      })
    );

    // Confirmar → POST /api/bookings (escrow + safety gate del lado del servidor).
    const confirm = root.querySelector("#mk-confirm");
    confirm?.addEventListener("click", async () => {
      const id = w.__mkCoachId;
      const sel = selState();
      if (!id || !sel.slotIso) return;
      const base = mkCoaches().find((x) => x.id === id);
      const detail = w.__mkDetail && w.__mkDetail.id === id ? w.__mkDetail.data : null;
      const c = normCoach({ ...(base || { id }), ...(detail || {}) });
      const pkgs = coachPackages(c);
      const pkg = pkgs.find((p) => p.key === sel.pkg) || pkgs[0] || null;
      confirm.disabled = true;
      confirm.textContent = "Reservando…";
      try {
        const body = { coachId: id, slotAt: sel.slotIso, durationMin: 60 };
        if (pkg && pkg.id) body.packageId = pkg.id;
        const d = await w.api("/api/bookings", body);
        const bk = (d && (d.booking || d)) || {};
        const status = String(bk.status || (isMinor() ? "PENDING" : "CONFIRMED")).toUpperCase();
        w.__mkBooked = w.__mkBooked || {};
        w.__mkBooked[id] = { status, pkgName: pkg ? pkg.name : "Sesión individual", dayLabel: sel.dayLabel, slotLabel: sel.slotLabel };
        w.toast?.(status === "PENDING" ? "Reserva enviada — esperando aprobación parental" : "¡Sesión confirmada!", "ok");
        repaint();
      } catch (e) {
        w.toast?.((e && e.message) || "No se pudo crear la reserva", "danger");
        confirm.disabled = false;
        confirm.textContent = isMinor() ? "Solicitar aprobación y reservar" : "Confirmar reserva";
      }
    });
  },
};
