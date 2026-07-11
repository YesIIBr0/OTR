// @ts-nocheck
/* OTR · Eventos (PRD §3.1 📅 Events) — S.events.
   Agrega los próximos eventos de OTR (seminarios, sesiones en vivo, workshops desde
   DB.events / EventItem) + un vistazo a los torneos (DB.tournaments). La inscripción a
   torneos NO se duplica: vive en el Debate Hub (este botón enruta allí). Premium, sin
   emojis, iconos IC.*, tokens de marca. */
import { DB } from "./data";
import { IC } from "./icons";
import { esc } from "./esc";
import { t } from "./i18n";
export const S = {};

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

function tournamentRow(tour) {
  const open = String(tour.status || "").toLowerCase() === "upcoming";
  // metadata = formato · región · fecha (los campos ya vienen escapados desde queries.ts).
  const meta = [tour.format, tour.region, tour.startsLabel].filter(Boolean).join(" · ");
  return `<div class="row vcenter between wrap" style="gap:10px;padding:13px 0;border-bottom:1px solid var(--border)">
    <div style="min-width:0"><b style="font-size:13.5px">${tour.name || t("events.tournamentFallback")}</b>
      ${meta ? `<div class="faint" style="font-size:12px;margin-top:2px">${meta}</div>` : ""}</div>
    ${tour.registered
      ? `<span class="badge ok" style="flex:none"><span class="dot"></span>${t("debate.registered")}</span>`
      : open
      ? `<button class="btn btn-soft btn-sm" style="flex:none" data-tn-register="${esc(tour.id)}">${t("events.tournamentRegister")}</button>`
      : `<span class="badge" style="flex:none">${esc(tour.status || "")}</span>`}
  </div>`;
}

// [llamada Isaac 7:54-8:21] El próximo torneo es LO PRINCIPAL de Eventos: tarjeta hero
// con CTA primario ("el botón más grande"); el resto de torneos como filas debajo.
function tournamentHero(tour) {
  const open = String(tour.status || "").toLowerCase() === "upcoming";
  const meta = [tour.format, tour.region, tour.startsLabel].filter(Boolean).join(" · ");
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
      ${tour.registered
        ? `<span class="badge ok" style="flex:none"><span class="dot"></span>${t("debate.registered")}</span>`
        : open
        ? `<button class="btn btn-primary" style="flex:none" data-tn-register="${esc(tour.id)}">${IC.trophy} ${t("events.tournamentRegister")}</button>`
        : `<span class="badge" style="flex:none">${esc(tour.status || "")}</span>`}
    </div>
  </div>`;
}

S.events = {
  render() {
    const events = Array.isArray(DB.events) ? DB.events : [];
    const tournaments = Array.isArray(DB.tournaments) ? DB.tournaments : [];
    const [first, ...rest] = tournaments;

    const head = `<div class="page-head fade-up"><div><p class="eyebrow">OTR</p>
      <h1 class="page-title">${t("events.title")}</h1>
      <div class="page-sub">${t("events.subtitle")}</div></div></div>`;

    const tournamentsSection = `<div class="fade-up" style="--d:0;margin-bottom:16px">
      ${first ? tournamentHero(first) : ""}
      <div class="card card-pad">
      <div class="row between vcenter"><b style="font-size:14px">${t("events.upcomingTournamentsTitle")}</b><span class="badge">${tournaments.length}</span></div>
      ${rest.length
        ? `<div style="margin-top:6px">${rest.slice(0, 5).map(tournamentRow).join("")}</div>`
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
  },
};
