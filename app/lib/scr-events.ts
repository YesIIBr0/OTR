// @ts-nocheck
/* OTR · Eventos (PRD §3.1 📅 Events) — S.events.
   Agrega los próximos eventos de OTR (seminarios, sesiones en vivo, workshops desde
   DB.events / EventItem) + un vistazo a los torneos (DB.tournaments). La inscripción a
   torneos NO se duplica: vive en el Debate Hub (este botón enruta allí). Premium, sin
   emojis, iconos IC.*, tokens de marca. */
import { DB } from "./data";
import { IC } from "./icons";
import { esc } from "./esc";
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

function tournamentRow(t) {
  const open = String(t.status || "").toLowerCase() === "upcoming";
  const meta = [t.format, t.region, t.startsLabel].filter(Boolean).map(esc).join(" · ");
  return `<div class="row vcenter between wrap" style="gap:10px;padding:13px 0;border-bottom:1px solid var(--border)">
    <div style="min-width:0"><b style="font-size:13.5px">${esc(t.name || "Torneo")}</b>
      ${meta ? `<div class="faint" style="font-size:12px;margin-top:2px">${meta}</div>` : ""}</div>
    ${t.registered
      ? `<span class="badge ok" style="flex:none"><span class="dot"></span>Inscrito</span>`
      : open
      ? `<button class="btn btn-soft btn-sm" style="flex:none" data-go-tournaments>Ver e inscribirme ${IC.arrowR}</button>`
      : `<span class="badge" style="flex:none">${esc(t.status || "")}</span>`}
  </div>`;
}

S.events = {
  render() {
    const events = Array.isArray(DB.events) ? DB.events : [];
    const tournaments = Array.isArray(DB.tournaments) ? DB.tournaments : [];

    const head = `<div class="page-head fade-up"><div><p class="eyebrow">OTR</p>
      <h1 class="page-title">Eventos</h1>
      <div class="page-sub">Seminarios, sesiones en vivo y torneos — todo en un lugar</div></div></div>`;

    const eventsSection = `<div class="card card-pad fade-up" style="--d:0;margin-bottom:16px">
      <div class="row between vcenter"><b style="font-size:14px">Próximos eventos</b><span class="badge sky">${events.length}</span></div>
      ${events.length
        ? `<div class="stack" style="gap:0;margin-top:8px">${events.map(eventCard).join("")}</div>`
        : `<div class="empty" style="padding:28px"><div class="ill">${IC.calendar}</div><h4>Aún no hay eventos en agenda</h4><p>Cuando OTR programe un seminario, sesión en vivo o workshop, aparecerá aquí.</p></div>`}
    </div>`;

    const tournamentsSection = `<div class="card card-pad fade-up" style="--d:1">
      <div class="row between vcenter"><b style="font-size:14px">Torneos</b><span class="badge">${tournaments.length}</span></div>
      ${tournaments.length
        ? `<div style="margin-top:6px">${tournaments.slice(0, 6).map(tournamentRow).join("")}</div>
           <button class="btn btn-ghost btn-sm" style="margin-top:12px" data-go-tournaments>Ver todos en el Debate Hub ${IC.arrowR}</button>`
        : `<div class="empty" style="padding:28px"><div class="ill">${IC.trophy}</div><h4>Sin torneos por ahora</h4><p>Cuando OTR abra inscripciones lo verás aquí. Mientras, suma rondas de práctica.</p></div>`}
    </div>`;

    return `${head}${eventsSection}${tournamentsSection}`;
  },

  mount(root) {
    if (!root) return;
    const w = window;
    // [DRY] La inscripción a torneos vive en el Debate Hub: enrutamos allí, pestaña Torneos.
    root.querySelectorAll("[data-go-tournaments]").forEach((b) =>
      b.addEventListener("click", () => { w.__debateTab = "tournaments"; if (w.go) w.go("debate"); }));
  },
};
