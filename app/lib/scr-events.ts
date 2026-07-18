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

// Acento por "tone" del evento (mapea a tokens de marca; oro = logro, verde = activo).
const toneVar = (t) => {
  const s = String(t || "").toLowerCase();
  if (s === "gold" || s === "oro" || s === "logro") return "var(--otr-gold)";
  if (s === "green" || s === "verde" || s === "ok") return "var(--otr-green)";
  if (s === "danger" || s === "live" || s === "vivo") return "var(--danger)";
  return "var(--otr-sky)";
};

function eventCard(e, i) {
  return `<div class="lrow" style="gap:12px;padding:12px 0;border-bottom:1px solid var(--border)">
    <span style="width:10px;height:10px;border-radius:50%;background:${toneVar(e.tone)};flex:none;margin-top:5px"></span>
    <div style="flex:1;min-width:0">
      <div style="font-weight:650;font-size:14px">${esc(e.t)}</div>
      <div class="faint" style="font-size:12.5px;margin-top:2px">${e.c ? esc(e.c) : "OTR Academy"}</div>
    </div>
    ${e.when ? `<span class="badge sky" style="flex:none"><span style="display:inline-flex;width:12px;height:12px">${IC.calendar}</span>&nbsp;${esc(e.when)}</span>` : ""}
  </div>`;
}

// [F6.2] Botones de edición/borrado por torneo (SOLO staff). data-tn-name lleva el nombre ya
// escapado: en el atributo el navegador lo decodifica al valor real para el diálogo de confirmar.
function tnAdminBtns(tour) {
  return `<span class="row vcenter" style="gap:6px;flex:none">
    <button class="btn btn-quiet btn-sm" data-tn-edit="${esc(tour.id)}">${t("events.tnEdit")}</button>
    <button class="btn btn-quiet btn-sm" data-tn-delete="${esc(tour.id)}" data-tn-name="${tour.name || ""}">${t("events.tnDelete")}</button>
  </span>`;
}

function tournamentRow(tour, staff) {
  const open = String(tour.status || "").toLowerCase() === "upcoming";
  // metadata = formato · región · fecha (los campos ya vienen escapados desde queries.ts).
  const meta = [tour.format, tour.region, tour.startsLabel].filter(Boolean).join(" · ");
  const reg = tour.registered
    ? `<span class="badge ok" style="flex:none"><span class="dot"></span>${t("debate.registered")}</span>`
    : open
    ? `<button class="btn btn-soft btn-sm" style="flex:none" data-tn-register="${esc(tour.id)}">${t("events.tournamentRegister")}</button>`
    : `<span class="badge" style="flex:none">${esc(tour.status || "")}</span>`;
  return `<div class="row vcenter between wrap" style="gap:10px;padding:13px 0;border-bottom:1px solid var(--border)">
    <div style="min-width:0"><b style="font-size:13.5px">${tour.name || t("events.tournamentFallback")}</b>
      ${meta ? `<div class="faint" style="font-size:12px;margin-top:2px">${meta}</div>` : ""}</div>
    <span class="row vcenter" style="gap:8px;flex:none">${reg}${staff ? tnAdminBtns(tour) : ""}</span>
  </div>`;
}

// [llamada Isaac 7:54-8:21] El próximo torneo es LO PRINCIPAL de Eventos: tarjeta hero
// con CTA primario ("el botón más grande"); el resto de torneos como filas debajo.
function tournamentHero(tour, staff) {
  const open = String(tour.status || "").toLowerCase() === "upcoming";
  const meta = [tour.format, tour.region, tour.startsLabel].filter(Boolean).join(" · ");
  const reg = tour.registered
    ? `<span class="badge ok" style="flex:none"><span class="dot"></span>${t("debate.registered")}</span>`
    : open
    ? `<button class="btn btn-primary" style="flex:none" data-tn-register="${esc(tour.id)}">${IC.trophy} ${t("events.tournamentRegister")}</button>`
    : `<span class="badge" style="flex:none">${esc(tour.status || "")}</span>`;
  return `<div class="card card-pad hello-card" style="margin-bottom:14px">
    <div class="row vcenter between wrap" style="gap:14px">
      <div class="row vcenter" style="gap:13px;min-width:0">
        <span style="display:inline-flex;width:38px;height:38px;color:var(--otr-gold)">${IC.trophy}</span>
        <div style="min-width:0">
          <div class="eyebrow" style="margin-bottom:3px">${t("events.nextTournamentEyebrow")}</div>
          <b style="font-size:17px;display:block">${tour.name || t("events.tournamentFallback")}</b>
          ${meta ? `<div class="faint" style="font-size:12.5px;margin-top:3px">${meta}</div>` : ""}
        </div>
      </div>
      <span class="row vcenter" style="gap:8px;flex:none">${reg}${staff ? tnAdminBtns(tour) : ""}</span>
    </div>
  </div>`;
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

    const head = `<div class="page-head fade-up"><div><p class="eyebrow">OTR</p>
      <h1 class="page-title">${t("events.title")}</h1>
      <div class="page-sub">${t("events.subtitle")}</div></div></div>`;

    // Botón "+ Torneo" (staff) SIEMPRE visible en la cabecera, incluso con lista vacía.
    const newBtn = staff ? `<button class="btn btn-primary btn-sm" data-tn-new="1">+ ${t("events.tnNew")}</button>` : "";

    const tournamentsSection = `<div class="fade-up" style="--d:0;margin-bottom:16px">
      ${first ? tournamentHero(first, staff) : ""}
      <div class="card card-pad">
      <div class="row between vcenter"><b style="font-size:14px">${t("events.upcomingTournamentsTitle")}</b>
        <span class="row vcenter" style="gap:8px">${newBtn}<span class="badge">${tournaments.length}</span></span></div>
      ${rest.length
        ? `<div style="margin-top:6px">${rest.slice(0, 5).map((tr) => tournamentRow(tr, staff)).join("")}</div>`
        : first
        ? `<p class="faint" style="font-size:12.5px;margin:10px 0 2px">${t("events.moreTournamentsSoon")}</p>`
        : `<div class="empty" style="padding:28px"><div class="ill">${IC.trophy}</div><h4>${t("events.emptyTournamentsTitle")}</h4><p>${t("events.emptyTournamentsBody")}</p></div>`}
      </div>
    </div>`;

    const eventsSection = `<div class="card card-pad fade-up" style="--d:1">
      <div class="row between vcenter"><b style="font-size:14px">${t("events.upcomingTitle")}</b><span class="badge sky">${events.length}</span></div>
      ${events.length
        ? `<div class="stack" style="gap:0;margin-top:8px">${events.map(eventCard).join("")}</div>`
        : `<div class="empty" style="padding:28px"><div class="ill">${IC.calendar}</div><h4>${t("events.emptyEventsTitle")}</h4><p>${t("events.emptyEventsBody")}</p></div>`}
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
          b.outerHTML = `<span class="badge ok" style="flex:none"><span class="dot"></span>${t("debate.registered")}</span>`;
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
