// @ts-nocheck
/* OTR · Eventos (PRD §3.1 📅 Events) — S.events.
   Agrega los próximos eventos de OTR (seminarios, sesiones en vivo, workshops desde
   DB.events / EventItem) + un vistazo a los torneos (DB.tournaments). La inscripción a
   torneos NO se duplica: vive en el Debate Hub (este botón enruta allí). Premium, sin
   emojis, iconos IC.*, tokens de marca.
   [F6.2] GESTIÓN de torneos (crear/editar/borrar) SOLO para staff (ADMIN/TEACHER): controles
   inline que hablan con POST /api/tournaments (op:create), PATCH y DELETE /api/tournaments/[id].
   El alumno ve la pantalla exactamente igual que antes. */
import { DB } from "./data";
import { C } from "./components";
import { IC } from "./icons";
import { esc } from "./esc";
import { t, registerDict } from "./i18n";
// [F4.1] Registra el diccionario de esta pantalla en SU chunk (fuera del inicial): events.* (directo) + debate.* (badges de tier). Ver app/lib/i18n.ts.
import { dict as d_events } from "./i18n-keys/events";
import { dict as d_debate } from "./i18n-keys/debate";
registerDict(d_events);
registerDict(d_debate);
export const S = {};

// ¿El que mira es staff? En el cliente DB.me.role es MINÚSCULA (Aula.tsx fija viewRole).
function isStaff() {
  const r = String(DB.me?.role || "").toLowerCase();
  return r === "admin" || r === "teacher";
}

/* [MOCKUP · Task 6, spec §3.4] Día + mes corto para el .date-box a partir de la etiqueta
   ya formateada que trae el payload ("mié 12 ago · 9:00 AM"). Sin fecha reconocible
   ("Por anunciar", "Hoy") devuelve null y la fila se pinta sin tile — nada inventado. */
function evDateFromLabel(label) {
  const m = /(\d{1,2})\s+([^\s·,]{3,})/.exec(String(label || ""));
  return m ? { day: m[1], mon: m[2].replace(".", "") } : null;
}
// El "tone" del evento decide la variante del chip de tipo (el mockup no usa puntos de color).
const toneChip = (tone) => {
  const s = String(tone || "").toLowerCase();
  if (s === "danger" || s === "live" || s === "vivo") return "black";
  if (s === "gold" || s === "oro" || s === "logro" || s === "green" || s === "verde" || s === "ok") return "accent";
  return "info";
};
const isLiveTone = (tone) => ["danger", "live", "vivo"].includes(String(tone || "").toLowerCase());

function eventCard(e) {
  const live = isLiveTone(e.tone);
  const dt = evDateFromLabel(e.when);
  return `<div class="evrow${live ? " evrow--live" : ""}">
    ${dt ? C.dateBox(dt.day, dt.mon, live) : "<span></span>"}
    <div class="ev-main">
      ${C.chip(t("events.chipEvent"), toneChip(e.tone), { ic: "calendar" })}
      <div class="ev-title">${esc(e.t)}</div>
      <div class="ev-meta">
        <span class="row vcenter" style="gap:6px">${IC.user} ${e.c ? esc(e.c) : "OTR Academy"}</span>
        ${e.when ? `<span class="row vcenter" style="gap:6px">${IC.clock} ${esc(e.when)}</span>` : ""}
      </div>
    </div>
    <span></span>
  </div>`;
}

// [F6.2] Botones de edición/borrado por torneo (SOLO staff). data-tn-name lleva el nombre ya
// escapado: en el atributo el navegador lo decodifica al valor real para el diálogo de confirmar.
function tnAdminBtns(tour) {
  return `<span class="row vcenter" style="gap:6px;flex:none">
    ${C.btn(t("events.tnEdit"), "outline", { size: "sm", attrs: `data-tn-edit="${esc(tour.id)}"` })}
    ${C.btn(t("events.tnDelete"), "outline", { size: "sm", attrs: `data-tn-delete="${esc(tour.id)}" data-tn-name="${tour.name || ""}"` })}
  </span>`;
}

// [MOCKUP · Task 6] Cada torneo es una fila .evrow del kit: tile de fecha + chip de tipo
// + título 18/700 + meta + acción a la derecha (naranja = inscribirse).
function tournamentRow(tour, staff) {
  const open = String(tour.status || "").toLowerCase() === "upcoming";
  const live = String(tour.status || "").toLowerCase() === "live";
  const dt = evDateFromLabel(tour.startsLabel);
  const reg = tour.registered
    ? C.chip(t("debate.registered"), "tint", { ic: "check" })
    : open || live
    ? C.btn(t("events.tournamentRegister"), "accent", { icRight: "arrowR", attrs: `data-tn-register="${esc(tour.id)}"` })
    : C.chip(esc(tour.status || ""), "outline");
  return `<div class="evrow${live ? " evrow--live" : ""}">
    ${dt ? C.dateBox(dt.day, dt.mon, live) : "<span></span>"}
    <div class="ev-main">
      ${C.chip(t("events.chipTournament"), live ? "black" : "accent", { ic: "trophy" })}
      <div class="ev-title">${tour.name || t("events.tournamentFallback")}</div>
      <div class="ev-meta">
        ${tour.startsLabel ? `<span class="row vcenter" style="gap:6px">${IC.clock} ${tour.startsLabel}</span>` : ""}
        ${tour.format ? `<span class="row vcenter" style="gap:6px">${IC.flag} ${tour.format}</span>` : ""}
        ${tour.region ? `<span>${tour.region}</span>` : ""}
      </div>
    </div>
    <div class="ev-actions">${reg}${staff ? tnAdminBtns(tour) : ""}</div>
  </div>`;
}

/* [MOCKUP V2 §6] Foto de fondo del héroe. La foto de marca es el FALLBACK y vive en
   el CSS (.hero-photo); esto solo emite --hero-img cuando el DATO trae imagen propia.
   Solo rutas del propio sitio o https (misma política que safeUrl en el servidor). */
function heroImgVar(url) {
  const u = String(url || "");
  return /^(\/|https:\/\/)[^'"()\s]+$/.test(u) ? `;--hero-img:url('${esc(u)}')` : "";
}

// [llamada Isaac 7:54-8:21] El próximo torneo es LO PRINCIPAL de Eventos: tarjeta hero
// con CTA primario ("el botón más grande"); el resto de torneos como filas debajo.
// [MOCKUP V2 §2/§6] El hero usa la MISMA pieza que el del dashboard (.dash-hero +
// .hero-photo): foto de marca de fondo, canto naranja de 3px y h2 de 31px a 16ch.
// El halo decorativo (.card--glow) sobra: ahora el fondo lo da la foto.
function tournamentHero(tour, staff) {
  const open = String(tour.status || "").toLowerCase() === "upcoming";
  const live = String(tour.status || "").toLowerCase() === "live";
  const meta = [tour.format, tour.region].filter(Boolean).join(" · ");
  const reg = tour.registered
    ? C.chip(t("debate.registered"), "accent", { ic: "check" })
    : open || live
    ? C.btn(t("events.tournamentRegister"), "accent", { size: "lg", ic: "trophy", attrs: `data-tn-register="${esc(tour.id)}"` })
    : C.chip(esc(tour.status || ""), "outline");
  return `<section class="card--dark dash-hero hero-photo" style="margin-bottom:34px${heroImgVar(tour.coverUrl || tour.image)}">
    <div class="dh-eyebrow">
      <span class="lbl">${t("events.nextTournamentEyebrow")}</span>
      ${live ? C.chip(t("events.tnStatusLive"), "accent") : ""}
    </div>
    <div class="dh-body">
      <div style="min-width:0">
        <h2 class="dh-title">${tour.name || t("events.tournamentFallback")}</h2>
        <div class="dh-meta">
          ${tour.startsLabel ? `<span class="row vcenter" style="gap:7px">${IC.calendar} ${tour.startsLabel}</span>` : ""}
          ${meta ? `<span class="dh-sep"></span><span>${meta}</span>` : ""}
        </div>
      </div>
      <div class="dh-side">${reg}${staff ? tnAdminBtns(tour) : ""}</div>
    </div>
  </section>`;
}

// --- Modal de gestión de torneo (staff) ---------------------------------------------------
// Convierte pesos ↔ centavos para la cuota; la API guarda entryCents (centavos, entero).
const pesosToCents = (v) => {
  const n = Math.round(Number(v) * 100);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

// Construye los campos del otrFormModal. `prefill` vacío = alta; con datos = edición.
function tournamentFields(prefill) {
  const p = prefill || {};
  const sel = (name, label, value, options) => ({ type: "select", name, label, value, options });
  return [
    { name: "name", label: t("events.tnFieldName"), type: "text", req: true, value: p.name || "" },
    { name: "format", label: t("events.tnFieldFormat"), type: "text", value: p.format || "PF" },
    { name: "ageDivision", label: t("events.tnFieldAgeDivision"), type: "text", value: p.ageDivision || "" },
    { name: "region", label: t("events.tnFieldRegion"), type: "text", value: p.region || "" },
    sel("modality", t("events.tnFieldModality"), p.modality || "online", [
      { value: "online", label: t("events.tnModalityOnline") },
      { value: "presencial", label: t("events.tnModalityPresencial") },
      { value: "híbrido", label: t("events.tnModalityHibrido") },
    ]),
    { name: "entry", label: t("events.tnFieldEntry"), type: "text", value: p.entryCents != null ? p.entryCents / 100 : "" },
    sel("source", t("events.tnFieldSource"), p.source || "OTR", [
      { value: "OTR", label: t("events.tnSourceOTR") },
      { value: "EXTERNAL", label: t("events.tnSourceExternal") },
    ]),
    sel("status", t("events.tnFieldStatus"), p.status || "UPCOMING", [
      { value: "UPCOMING", label: t("events.tnStatusUpcoming") },
      { value: "LIVE", label: t("events.tnStatusLive") },
      { value: "DONE", label: t("events.tnStatusDone") },
    ]),
    { name: "startsAt", label: t("events.tnFieldStartsAt"), type: "date", value: p.startsISO || "" },
  ];
}

// Payload común (sin op): la API aplica su propia allowlist/validación por encima.
function tournamentPayload(v) {
  return {
    name: v.name,
    format: v.format,
    ageDivision: v.ageDivision,
    region: v.region,
    modality: v.modality,
    entryCents: pesosToCents(v.entry),
    source: v.source,
    status: v.status,
    startsAt: v.startsAt,
  };
}

// Refresco "suave": re-pide los datos y re-renderiza Eventos (refresh() global es local de Aula.tsx).
async function softRefresh() {
  const w = window;
  try {
    const res = await fetch("/api/app-data");
    if (res.ok) {
      const fresh = await res.json();
      const role = DB.me?.role; // conserva el rol fijado por Aula.tsx
      Object.assign(DB, fresh);
      if (role) DB.me = { ...(fresh.me || {}), role };
    }
  } catch { /* silencioso */ }
  if (w.go) w.go("events");
}

function findTournament(id) {
  return (Array.isArray(DB.tournaments) ? DB.tournaments : []).find((x) => x.id === id) || null;
}

S.events = {
  render() {
    const events = Array.isArray(DB.events) ? DB.events : [];
    const tournaments = Array.isArray(DB.tournaments) ? DB.tournaments : [];
    const staff = isStaff();
    const [first, ...rest] = tournaments;

    const head = `<div class="page-head page-head--rule fade-up">
      <div><span class="ph-eyebrow">OTR</span>
      <h1 class="ph-title">${t("events.title")}</h1>
      <div class="page-sub" style="margin-top:8px">${t("events.subtitle")}</div></div>
      <div class="stat-group">
        ${C.statInline(tournaments.length, t("events.upcomingTournamentsTitle"))}
        ${C.statInline(events.length, t("events.upcomingTitle"), { accent: true })}
      </div></div>`;

    // Botón "+ Torneo" (staff) SIEMPRE visible en la cabecera, incluso con lista vacía.
    const newBtn = staff ? C.btn(t("events.tnNew"), "primary", { size: "sm", ic: "plus", attrs: 'data-tn-new="1"' }) : "";

    // [MOCKUP V2 §1] Ritmo del v2: 34px tras el héroe (los pone el propio hero) y 26px
    // entre secciones. Y §7: la card de lista ya NO lleva .card-pad.
    const tournamentsSection = `<div class="fade-up" style="--d:0;margin-bottom:26px">
      ${first ? tournamentHero(first, staff) : ""}
      ${C.secTitle(t("events.upcomingTournamentsTitle"), { right: newBtn || C.chip(String(tournaments.length), "outline") })}
      <div class="card ev-list">
      ${rest.length
        ? rest.slice(0, 5).map((tr) => tournamentRow(tr, staff)).join("")
        : first
        ? `<p class="faint" style="font-size:12.5px">${t("events.moreTournamentsSoon")}</p>`
        : `<div class="empty" style="padding:28px"><div class="ill">${IC.trophy}</div><h4>${t("events.emptyTournamentsTitle")}</h4><p>${t("events.emptyTournamentsBody")}</p></div>`}
      </div>
    </div>`;

    const eventsSection = `<div class="fade-up" style="--d:1">
      ${C.secTitle(t("events.upcomingTitle"), { right: C.chip(String(events.length), "outline") })}
      <div class="card ev-list">
      ${events.length
        ? events.map(eventCard).join("")
        : `<div class="empty" style="padding:28px"><div class="ill">${IC.calendar}</div><h4>${t("events.emptyEventsTitle")}</h4><p>${t("events.emptyEventsBody")}</p></div>`}
      </div>
    </div>`;

    return `${head}${tournamentsSection}${eventsSection}`;
  },

  mount(root) {
    if (!root) return;
    const w = window;

    // Inscripción a torneo desde Eventos: POST /api/tournaments (idempotente).
    // Optimista: al confirmar, el botón pasa a sello "Inscrito" sin recargar.
    root.querySelectorAll("[data-tn-register]").forEach((b) =>
      b.addEventListener("click", async () => {
        const id = b.getAttribute("data-tn-register");
        b.disabled = true;
        try {
          await w.api("/api/tournaments", { tournamentId: id });
          w.toast && w.toast(t("events.tournamentRegistered"), "ok");
          b.outerHTML = C.chip(t("debate.registered"), "tint", { ic: "check" });
        } catch (e) {
          b.disabled = false;
          w.toast && w.toast((e && e.message) || t("events.tournamentRegisterError"), "warn");
        }
      }));

    // --- Gestión (staff): crear / editar / borrar ---------------------------------------
    if (!isStaff()) return;

    // Crear
    root.querySelector("[data-tn-new]")?.addEventListener("click", () => {
      if (!w.otrFormModal) { w.toast && w.toast(t("events.tnError"), "warn"); return; }
      w.otrFormModal(t("events.tnCreateTitle"), tournamentFields(null), async (v) => {
        await w.api("/api/tournaments", { op: "create", ...tournamentPayload(v) });
        w.toast && w.toast(t("events.tnCreated"), "ok");
        await softRefresh();
      });
    });

    // Editar (prefill con los campos crudos que queries.ts adjunta para staff)
    root.querySelectorAll("[data-tn-edit]").forEach((b) =>
      b.addEventListener("click", () => {
        const id = b.getAttribute("data-tn-edit");
        const tour = findTournament(id);
        if (!tour || !w.otrFormModal) { w.toast && w.toast(t("events.tnError"), "warn"); return; }
        w.otrFormModal(t("events.tnEditTitle"), tournamentFields(tour), async (v) => {
          await w.api(`/api/tournaments/${id}`, tournamentPayload(v), "PATCH");
          w.toast && w.toast(t("events.tnUpdated"), "ok");
          await softRefresh();
        });
      }));

    // Borrar (confirmación nativa; la API bloquea si el torneo tiene inscritos)
    root.querySelectorAll("[data-tn-delete]").forEach((b) =>
      b.addEventListener("click", async () => {
        const id = b.getAttribute("data-tn-delete");
        const name = b.getAttribute("data-tn-name") || t("events.tournamentFallback");
        if (!w.confirm(t("events.tnDeleteConfirm").replace("{name}", name))) return;
        try {
          await w.api(`/api/tournaments/${id}`, null, "DELETE");
          w.toast && w.toast(t("events.tnDeleted"), "ok");
          await softRefresh();
        } catch (e) {
          w.toast && w.toast((e && e.message) || t("events.tnError"), "warn");
        }
      }));
  },
};
