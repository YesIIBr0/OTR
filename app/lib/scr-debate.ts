// @ts-nocheck
/* OTR · Debate Hub (flagship, PRD §6) — el cruce de "arena tipo chess.com" con un
   dashboard de atleta, dentro de la gama navy + sky de OTR. Pantalla S.debateHub.

   Lee del DB (lo hidrata el agente A3 / queries.ts → getAppData). Campos esperados:
     DB.debate = {
       rating, rd, tier, provisional,
       recentForm:[{result,opponent,delta}],
       history:[{id,result,format,opponent,eventName,roundLabel,when,ratingAfter,source}],
       analytics:{ byFormat:[{name,wins,losses,draws}], bySide:[{name,wins,losses,draws}], criteria:[{name,avg}] }
     }
     DB.leaderboard = { me:{rank,rating,tier}, rows:[{rank,name,initials,rating,tier,you}] }
     DB.tournaments = [{id,name,format,region,modality,startsLabel,status,entryLabel,registered}]

   Patrón de la casa: render(state)->string + mount(root,state) opcional; IC.* iconos,
   esc() para texto del usuario, clases card/tile/badge/fade-up; nada de emojis.
   Acciones del cliente vía los globales de Aula.tsx: go(), api(url,body,method), toast(). */
import { DB } from "./data";
import { C } from "./components";
import { IC } from "./icons";
import { esc } from "./esc";
import { t, tierLabel } from "./i18n";

export const S = {};

/* ---------------- estado local de la pantalla ---------------- */
// Sub-tab activo (Overview / Mis debates / …). Patrón window.__x como el resto del SPA.
const TABS = [
  { k: "overview", l: t("debate.tabOverview"), ic: "target" },
  { k: "history", l: t("debate.tabHistory"), ic: "flag" },
  { k: "practice", l: t("debate.tabPractice"), ic: "mic" },
  { k: "leaderboard", l: t("debate.tabLeaderboard"), ic: "trophy" },
];
function activeTab() {
  const t = (window as any).__debateTab;
  return TABS.some((x) => x.k === t) ? t : "overview";
}

/* ---------------- helpers de datos (defaults defensivos) ---------------- */
function getDebate() {
  const d = DB.debate || {};
  return {
    rating: typeof d.rating === "number" ? d.rating : 1500,
    rd: typeof d.rd === "number" ? d.rd : 350,
    tier: d.tier || "Novato",
    provisional: d.provisional != null ? !!d.provisional : true,
    // [RATING-2 §6.2] Speaker Rating (promedio de oratoria); null si aún no hay rondas juzgadas.
    speakerAvg: typeof d.speakerAvg === "number" ? d.speakerAvg : null,
    speakerRounds: typeof d.speakerRounds === "number" ? d.speakerRounds : 0,
    recentForm: Array.isArray(d.recentForm) ? d.recentForm : [],
    history: Array.isArray(d.history) ? d.history : [],
    analytics: d.analytics || { byFormat: [], bySide: [], criteria: [] },
  };
}
function getLeaderboard() {
  const lb = DB.leaderboard || {};
  return { me: lb.me || null, rows: Array.isArray(lb.rows) ? lb.rows : [] };
}
function getTournaments() {
  return Array.isArray(DB.tournaments) ? DB.tournaments : [];
}
// [EPIC-6] Estado real de membresía (free|pro|elite) desde DB.membership.tier —
// la misma fuente que lee S.membership / scr-parent. Nada de hardcodear "Pro".
function getMembershipTier() {
  const tier = (DB.membership || {}).tier;
  return tier === "pro" || tier === "elite" ? tier : "free";
}
function isProMember() {
  return getMembershipTier() !== "free";
}

// Escalera de tiers del PRD (Novato → … → Grandmaster). El siguiente tier sirve de meta.
const TIER_LADDER = ["Novato", "Bronze", "Silver", "Gold", "Platinum", "Diamond", "Master", "Grandmaster"];
function nextTier(tier) {
  const i = TIER_LADDER.indexOf(tier);
  return i >= 0 && i < TIER_LADDER.length - 1 ? TIER_LADDER[i + 1] : null;
}

// Color-coding de resultado (WIN verde / LOSS rojo). En debate no hay empates.
function resultStyle(result) {
  const r = String(result || "").toUpperCase();
  if (r === "WIN") return { tone: "ok", label: "WIN", cssVar: "var(--ok)" };
  return { tone: "danger", label: "LOSS", cssVar: "var(--danger)" };
}
// Formatea un delta de rating con signo (+12 / -8 / ±0).
function deltaLabel(n) {
  const v = Math.round(Number(n) || 0);
  if (v > 0) return `+${v}`;
  if (v < 0) return `${v}`;
  return "±0";
}
function deltaColor(n) {
  const v = Number(n) || 0;
  return v > 0 ? "var(--ok)" : v < 0 ? "var(--danger)" : "var(--text-2)";
}

/* ---------------- tira de upsell contextual a OTR Pro (logro/oro) ----------------
   [CNV-03] El único gancho a Pro vivía enterrado en la pestaña Analytics. Esta tira
   compacta (oro = logro, tokens de contraste --otr-gold-text) siembra el upsell donde
   el deseo competitivo es visible — Leaderboard y Torneos — sin tapar el contenido ni
   duplicar el bloque grande de Analytics. data-go="membership" lo enruta el shell. */
function proUpsellStrip(line) {
  return `
  <div class="fade-up" style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:16px;padding:12px 16px;border-radius:var(--r-md,14px);background:var(--otr-gold-pale);border:1px solid color-mix(in srgb,var(--otr-gold) 40%,transparent)">
    <span style="display:inline-flex;width:18px;height:18px;color:var(--otr-gold-text);flex:none">${IC.star}</span>
    <span style="flex:1;min-width:200px;font-size:13px;color:var(--otr-gold-text)">${line}</span>
    <button class="btn btn-sm" style="flex:none;background:var(--otr-gold);color:#0C0C0C;font-weight:700" data-go="membership">${t("debate.seeOtrPro")}</button>
  </div>`;
}

/* ---------------- sello "OTR Pro" para miembros (logro/oro, NO upsell) ----------------
   [EPIC-6] Al miembro pro/elite no se le re-vende lo que ya tiene: en vez de la tira de
   upsell se muestra un sello que confirma el plan activo. Mismo lenguaje oro (logro) que
   el upsell para coherencia visual, pero con sello + check en vez de CTA de compra. */
function proSealStrip() {
  const tier = getMembershipTier();
  const label = tier === "elite" ? t("debate.sealElite") : t("debate.sealPro");
  return `
  <div class="fade-up" style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:16px;padding:12px 16px;border-radius:var(--r-md,14px);background:var(--otr-gold-pale);border:1px solid color-mix(in srgb,var(--otr-gold) 40%,transparent)">
    <span style="display:inline-flex;width:18px;height:18px;color:var(--otr-gold-text);flex:none">${IC.star}</span>
    <span style="display:inline-flex;align-items:center;gap:6px;flex:none;font-size:12px;font-weight:800;letter-spacing:.02em;color:var(--otr-gold-text);text-transform:uppercase">${label}</span>
    <span style="flex:1;min-width:160px;font-size:13px;color:var(--otr-gold-text)">${t("debate.sealActive")}</span>
    <span style="display:inline-flex;width:18px;height:18px;color:var(--otr-gold-text);flex:none">${IC.checkCircle}</span>
  </div>`;
}
// Tira contextual del leaderboard: upsell para free, sello para miembros.
function proStrip(upsellLine) {
  return isProMember() ? proSealStrip() : proUpsellStrip(upsellLine);
}

/* ---------------- panel HERO navy (rating GRANDE + tier) ---------------- */
function heroPanel(d) {
  const nt = nextTier(d.tier);
  const forms = d.recentForm.slice(0, 6);
  return `
  <div class="hello-card fade-up" style="--d:0;margin-bottom:18px">
    <div class="h-row" style="align-items:center">
      <div style="min-width:240px">
        <h1 class="sr-only">${t("debate.heroSrTitle")}</h1><p class="eyebrow" style="color:var(--otr-sky-hi)">${t("debate.heroEyebrow")}</p>
        <div class="row vcenter" style="gap:14px;margin-top:6px">
          <span class="brand-font" style="font-size:64px;font-weight:800;line-height:1;color:#fff">${d.rating}</span>
          <div class="stack" style="gap:7px">
            <span class="badge" style="background:color-mix(in srgb,var(--otr-sky) 26%, transparent);color:#fff;border:1px solid rgba(255,255,255,.22)"><span class="dot" style="background:var(--otr-sky-hi)"></span>${esc(tierLabel(d.tier))}</span>
            <span style="font-size:12.5px;color:rgba(234,242,251,.72)">±${d.rd} RD ${d.provisional ? "· " + t("debate.rdProvisional") : "· " + t("debate.rdStable")}</span>
            ${d.speakerAvg != null ? `<span style="font-size:12.5px;color:rgba(234,242,251,.72)" title="${t("debate.speakerTitle")}">${t("debate.speakerLabel")} <b style="color:var(--otr-sky-hi)">${d.speakerAvg}</b>/100 · ${d.speakerRounds} ${d.speakerRounds === 1 ? t("debate.roundSingular") : t("debate.roundPlural")}</span>` : ""}
          </div>
        </div>
        ${d.provisional
          ? `<div class="alert" style="margin-top:14px;background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.18);color:#fff"><span class="ai">${IC.target}</span><div><div class="at" style="color:#fff">${t("debate.provisionalTitle")}</div><span style="color:rgba(234,242,251,.78)">${t("debate.provisionalBody")}</span></div></div>`
          : nt
            ? `<p style="color:rgba(234,242,251,.72);font-size:13px;margin-top:12px">${t("debate.nextTierPrefix")} <b style="color:var(--otr-sky-hi)">${esc(tierLabel(nt))}</b> ${t("debate.nextTierSuffix")}</p>`
            : `<p style="color:var(--otr-sky-hi);font-size:13px;margin-top:12px;font-weight:650">${t("debate.topPrefix")} ${esc(tierLabel(d.tier))}. ${t("debate.topSuffix")}</p>`}
      </div>
      <div class="stack" style="gap:12px;align-self:stretch;justify-content:center;min-width:220px">
        <div>
          <p class="eyebrow" style="color:var(--otr-sky-hi);margin-bottom:8px">${t("debate.recentForm")}</p>
          ${forms.length
            ? `<div class="row" style="gap:6px;flex-wrap:wrap">${forms.map((f) => {
                const rs = resultStyle(f.result);
                return `<span title="${esc(f.opponent || "")} · ${deltaLabel(f.delta)}" style="display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:9px;font-size:12px;font-weight:800;color:#fff;background:${rs.cssVar}">${rs.label[0]}</span>`;
              }).join("")}</div>
               <div class="row" style="gap:6px;flex-wrap:wrap;margin-top:8px">${forms.map((f) => `<span class="tnum" style="width:30px;text-align:center;font-size:11px;color:${deltaColor(f.delta)};font-weight:700">${deltaLabel(f.delta)}</span>`).join("")}</div>`
            : `<span style="font-size:12.5px;color:rgba(234,242,251,.6)">${t("debate.noRoundsForm")}</span>`}
        </div>
      </div>
    </div>
  </div>`;
}

/* ---------------- barra de sub-tabs ---------------- */
function subTabs(active) {
  return `
  <div class="tabs fade-up" style="--d:1" id="debate-tabs">
    ${TABS.map((t) => `<button class="tab ${t.k === active ? "active" : ""}" data-dtab="${t.k}"><span class="row vcenter" style="gap:6px"><span style="display:inline-flex;width:15px;height:15px">${IC[t.ic]}</span>${t.l}</span></button>`).join("")}
  </div>`;
}

/* ================= SECCIÓN · RESUMEN ================= */
function viewOverview(d) {
  // [DEBATE-1] Participadas = todas las rondas del historial (incl. pendientes de adjudicar).
  // Victorias y % se calculan SOLO sobre las rondas ya adjudicadas.
  const participated = d.history.length;
  const adj = d.history.filter((h) => h.adjudicated);
  const wins = adj.filter((h) => String(h.result).toUpperCase() === "WIN").length;
  const adjTotal = adj.length;
  const winRate = adjTotal ? Math.round((wins / adjTotal) * 100) : 0;
  const nextEvent = getTournaments().find((t) => !t.registered) || getTournaments()[0] || null;

  const kpis = `
    <div class="grid g-3" style="margin-bottom:18px">
      <div class="tile">${C.kpi(t("debate.kpiParticipated"), String(participated), { ic: "flag" })}</div>
      <div class="tile">${C.kpi(t("debate.kpiWins"), String(wins), { ic: "trophy" })}</div>
      <div class="tile">${C.kpi(t("debate.kpiWinRate"), String(winRate), { unit: "%", ic: "chart" })}</div>
    </div>`;

  const recentList = d.history.slice(0, 4);
  const recentCard = `
    <div class="card">
      <div class="card-head"><h3>${t("debate.recentDebates")}</h3><a href="#" onclick="return false" data-dtab="history" style="font-size:12.5px">${t("debate.seeAll")}</a></div>
      <div class="card-body" style="padding:6px 16px 12px">
        ${recentList.length ? recentList.map((h) => {
          const rs = resultStyle(h.result);
          return `<div class="agenda-item">
            <span class="badge ${rs.tone}" style="min-width:54px;justify-content:center;font-weight:800">${rs.label}</span>
            <div style="flex:1;min-width:0"><div class="ai-t">${esc(h.opponent || t("debate.fallbackOpponent"))} · ${esc(h.format || "")}</div><div class="ai-c">${esc(h.eventName || t("debate.fallbackEvent"))}${h.roundLabel ? " · " + esc(h.roundLabel) : ""}</div></div>
            <span class="ai-w tnum" style="color:${deltaColor(h.delta != null ? h.delta : 0)}">${h.ratingAfter != null ? h.ratingAfter : ""}</span>
          </div>`;
        }).join("") : `<div style="padding:14px 0"><p class="faint" style="font-size:13px">${t("debate.historyEmpty")}</p><button class="btn btn-soft btn-sm" style="margin-top:8px" data-dtab="practice">${IC.mic} ${t("debate.goToPractice")}</button></div>`}
      </div>
    </div>`;

  const nextEventCard = `
    <div class="card card-pad">
      <div class="eyebrow" style="margin-bottom:2px">${t("debate.nextTournament")}</div>
      ${nextEvent
        ? `<b style="font-size:15px;line-height:1.3;display:block">${esc(nextEvent.name)}</b>
           <div class="row vcenter wrap" style="gap:8px;margin-top:8px;font-size:12.5px;color:var(--text-2)">
             ${nextEvent.format ? `<span class="row vcenter" style="gap:5px">${IC.flag} ${esc(nextEvent.format)}</span>` : ""}
             ${nextEvent.region ? `<span class="dot-sep"></span><span>${esc(nextEvent.region)}</span>` : ""}
             ${nextEvent.modality ? `<span class="dot-sep"></span><span>${esc(nextEvent.modality)}</span>` : ""}
           </div>
           ${nextEvent.startsLabel ? `<div class="row vcenter" style="gap:6px;margin-top:10px;font-size:13px;color:var(--text)">${IC.calendar} ${esc(nextEvent.startsLabel)}</div>` : ""}
           ${nextEvent.registered
             ? `<div style="margin-top:12px"><span class="badge ok"><span class="dot"></span>${t("debate.registered")}</span></div>`
             : `<button class="btn btn-primary btn-sm btn-block" style="margin-top:12px" data-tn-register="${esc(nextEvent.id)}">${t("debate.register")}</button>`}`
        : `<div class="empty" style="padding:18px"><div class="ill">${IC.calendar}</div><h4>${t("debate.noEventsTitle")}</h4><p>${t("debate.noEventsBody")}</p></div>`}
    </div>`;

  // [NSDA Fase-1] Torneos del circuito vía la API pública oficial de Tabroom (indexcards).
  // Placeholder que mount() llena con un fetch al proxy server-side /api/tabroom/tourns
  // (sin key, sin datos personales de terceros). El récord personal es Fase-2.
  const nsdaCard = `
    <div class="card card-pad" data-nsda>
      <div class="eyebrow" style="margin-bottom:2px">NSDA · Tabroom</div>
      <b style="font-size:15px;line-height:1.3;display:block">${t("debate.nsdaTitle")}</b>
      <p class="faint" style="font-size:12px;margin-top:2px">${t("debate.nsdaSub")}</p>
      <div data-nsda-body style="margin-top:10px"><p class="faint" style="font-size:12.5px">${t("debate.nsdaLoading")}</p></div>
    </div>`;

  return `
    ${kpis}
    <div class="split fade-up" style="--d:0">
      <div class="stack" style="gap:16px">${recentCard}</div>
      <div class="stack" style="gap:16px">${nextEventCard}${nsdaCard}</div>
    </div>`;
}

/* ================= SECCIÓN · MIS DEBATES ================= */
function viewHistory(d) {
  if (!d.history.length) {
    return `<div class="card fade-up"><div class="empty"><div class="ill">${IC.flag}</div><h4>${t("debate.historyEmptyTitle")}</h4><p>${t("debate.historyEmptyBody")}</p><div class="row vcenter" style="gap:8px;justify-content:center"><button class="btn btn-primary btn-sm" data-action="debate-record">${IC.plus} ${t("debate.recordDebate")}</button><button class="btn btn-soft btn-sm" data-dtab="practice">${IC.mic} ${t("debate.goToPractice")}</button></div></div></div>`;
  }
  const cards = d.history.map((h, i) => {
    const rs = resultStyle(h.result);
    const src = String(h.source || "").toUpperCase() === "EXTERNAL" ? t("debate.sourceExternal") : "OTR";
    return `
    <div class="tile click fade-up" data-debate="${esc(h.id || "")}" role="button" tabindex="0" aria-label="${t("debate.viewDebateDetail")} ${esc(h.title || "")}" style="--d:${i % 8};border-left:3px solid ${rs.cssVar}">
      <div class="row between vcenter" style="gap:10px">
        <span class="badge ${rs.tone}" style="font-weight:800;min-width:54px;justify-content:center">${rs.label}</span>
        <span class="row vcenter" style="gap:6px">
          ${h.status === "pending" ? `<span class="badge warn">${t("debate.statusPending")}</span>` : h.status === "rejected" ? `<span class="badge danger">${t("debate.statusRejected")}</span>` : ""}
          <span class="badge ${src === "OTR" ? "sky" : ""}">${src}</span>
        </span>
      </div>
      <div style="margin-top:10px"><b style="font-size:14.5px;line-height:1.3">vs ${esc(h.opponent || t("debate.fallbackOpponent"))}</b></div>
      ${h.status === "rejected" && h.rejectionReason ? `<div class="faint" style="font-size:12px;margin-top:5px;font-style:italic">${t("debate.rejectionPrefix")}: ${h.rejectionReason}</div>` : ""}
      <div class="row vcenter wrap" style="gap:7px;margin-top:6px;font-size:12px;color:var(--text-2)">
        ${h.format ? `<span class="row vcenter" style="gap:4px">${IC.flag} ${esc(h.format)}</span>` : ""}
        ${h.eventName ? `<span class="dot-sep"></span><span>${esc(h.eventName)}</span>` : ""}
        ${h.roundLabel ? `<span class="dot-sep"></span><span>${esc(h.roundLabel)}</span>` : ""}
      </div>
      <div class="divider" style="margin:12px 0"></div>
      <div class="row between vcenter">
        <span class="faint" style="font-size:12px">${esc(h.when || "")}</span>
        <span class="row vcenter" style="gap:8px">
          ${h.ratingAfter != null ? `<span class="tnum" style="font-size:13px;font-weight:700">${h.ratingAfter}</span>` : ""}
          ${h.delta != null ? `<span class="tnum badge ${Number(h.delta) >= 0 ? "ok" : "danger"}" style="font-weight:700">${deltaLabel(h.delta)}</span>` : ""}
        </span>
      </div>
    </div>`;
  }).join("");
  return `
    <div class="page-head fade-up"><div><p class="eyebrow">${t("debate.historyEyebrow")}</p><h1 class="page-title" style="font-size:20px">${t("debate.historyTitle")}</h1><div class="page-sub">${d.history.length} ${d.history.length === 1 ? t("debate.roundSingular") : t("debate.roundPlural")} · ${t("debate.historySubTap")}</div></div><button class="btn btn-primary btn-sm" data-action="debate-record">${IC.plus} ${t("debate.recordDebate")}</button></div>
    <div class="grid g-3">${cards}</div>`;
}

/* ================= SECCIÓN · PRÁCTICA ================= */
// [REDISEÑO Jean] La práctica es Drills + "Encuentra rival". El flujo PF cronometrado
// se retiró (commit f8a5678) — sin timer aquí.
function viewPractice() {
  const lb = getLeaderboard();
  const d = getDebate();
  // Rivales cerca de tu rating (±120) del leaderboard, excluyéndote.
  const near = lb.rows
    .filter((r) => !r.you && typeof r.rating === "number")
    .map((r) => ({ ...r, diff: Math.abs((r.rating || 0) - d.rating) }))
    .sort((a, b) => a.diff - b.diff)
    .slice(0, 5);

  const drills = `
    <div class="card card-pad fade-up">
      <div class="empty" style="padding:44px 20px">
        <div class="ill">${IC.mic}</div>
        <h4>${t("debate.drillsTitle")}</h4>
        <p>${t("debate.drillsBody")}</p>
      </div>
    </div>`;

  const finder = `
    <div class="card card-pad fade-up" style="--d:1">
      <div class="eyebrow" style="margin-bottom:2px">${t("debate.findPartner")}</div>
      <b style="font-size:15px">${t("debate.nearYourRating")} (${d.rating})</b>
      <div class="stack" style="gap:2px;margin-top:12px">
        ${near.length ? near.map((r) => `
          <div class="row between vcenter" style="padding:9px 0;border-bottom:1px solid var(--border)">
            <span class="row vcenter" style="gap:10px">${C.avatar(r.initials || "?", { size: "sm", bg: "var(--otr-navy)" })}<span><span style="display:block;font-weight:600;font-size:13px">${r.name || t("debate.fallbackDebater")}</span><span class="faint" style="font-size:11.5px">${esc(tierLabel(r.tier || ""))}</span></span></span>
            <span class="row vcenter" style="gap:8px"><span class="tnum" style="font-weight:700;font-size:13px">${r.rating}</span><span class="badge ${r.diff <= 50 ? "ok" : "sky"}" style="font-size:10.5px">±${r.diff}</span></span>
          </div>`).join("") : `<p class="faint" style="font-size:13px">${t("debate.cohortEmptyFinder")}</p>`}
      </div>
      <button class="btn btn-ghost btn-sm btn-block" style="margin-top:12px" data-dtab="leaderboard">${t("debate.seeFullLeaderboard")} ${IC.arrowR}</button>
    </div>`;

  return `
    <div class="page-head fade-up"><div><p class="eyebrow">${t("debate.practiceEyebrow")}</p><h1 class="page-title" style="font-size:20px">${t("debate.practiceTitle")}</h1><div class="page-sub">${t("debate.practiceSub")}</div></div></div>
    <div class="split">${drills}<div class="stack" style="gap:16px">${finder}</div></div>`;
}

/* ================= SECCIÓN · LEADERBOARD ================= */
function viewLeaderboard() {
  const lb = getLeaderboard();
  if (!lb.rows.length) {
    return `<div class="card fade-up"><div class="empty"><div class="ill">${IC.trophy}</div><h4>${t("debate.lbEmptyTitle")}</h4><p>${t("debate.lbEmptyBody")}</p></div></div>`;
  }
  const meRow = lb.me
    ? `<div class="alert info fade-up otr-shine" style="margin-bottom:16px"><span class="ai">${IC.target}</span><div><div class="at">${t("debate.yourPosition")}</div>#${lb.me.rank} · ${lb.me.rating} ${t("debate.ofRating")} · ${esc(tierLabel(lb.me.tier || ""))}</div></div>`
    : "";
  const rows = lb.rows.map((r) => `
    <tr ${r.you ? 'style="background:var(--action-soft);box-shadow:inset 3px 0 0 var(--otr-green)"' : ""}>
      <td><span class="badge ${r.rank <= 3 ? "gold" : ""}" style="min-width:30px;justify-content:center">${r.rank}</span></td>
      ${/* [auditoría] name/initials ya vienen esc() de queries (leaderboardRowsOut) → render crudo, sin doble-escape */""}
      <td><div class="row vcenter" style="gap:10px">${C.avatar(r.initials || "?", { size: "sm", bg: r.you ? "var(--otr-sky-lo)" : "var(--otr-navy)" })}<b style="font-weight:600">${r.name || ""}${r.you ? ` <span class="badge sky" style="font-size:10px;margin-left:4px">${t("debate.youBadge")}</span>` : ""}</b></div></td>
      <td>${esc(tierLabel(r.tier || ""))}</td>
      <td class="num tnum"><b>${r.rating}</b></td>
    </tr>`).join("");
  return `
    <div class="page-head fade-up"><div><p class="eyebrow">${t("debate.lbEyebrow")}</p><h1 class="page-title" style="font-size:20px">${t("debate.lbPageTitle")}</h1><div class="page-sub">${t("debate.lbSub")}</div></div></div>
    ${proStrip(t("debate.lbUpsell"))}
    ${meRow}
    <div class="table-wrap scroll-m fade-up">
      <table class="tbl">
        <thead><tr><th style="width:60px">#</th><th>${t("debate.colDebater")}</th><th>${t("debate.colTier")}</th><th class="num">${t("debate.colRating")}</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

/* ---------------- router de secciones ---------------- */
function renderTab(tab, d) {
  switch (tab) {
    case "history": return viewHistory(d);
    case "practice": return viewPractice();
    case "leaderboard": return viewLeaderboard();
    default: return viewOverview(d);
  }
}

/* ================= PANTALLA ================= */
S.debateHub = {
  render(state) {
    const d = getDebate();
    const tab = activeTab();
    return `
      ${heroPanel(d)}
      ${subTabs(tab)}
      <div class="fade-up" style="--d:2" id="debate-body">${renderTab(tab, d)}</div>`;
  },

  mount(root, state) {
    // Repinta solo la pantalla del debate dentro del .page, conservando el shell.
    const repaint = () => {
      const page = root.querySelector(".page");
      if (!page) return;
      page.innerHTML = S.debateHub.render(state);
      S.debateHub.mount(root, state);
      const content = root.querySelector("#content") || root;
      if (content) content.scrollTop = 0;
    };

    // Cambio de sub-tab (botones de la barra y enlaces "Ver todos" con data-dtab).
    root.querySelectorAll("[data-dtab]").forEach((el) =>
      el.addEventListener("click", (e) => {
        e.preventDefault();
        (window as any).__debateTab = el.getAttribute("data-dtab");
        repaint();
      })
    );

    // [REQ-1] "Registrar un debate": el alumno envía una SOLICITUD (evento + código de
    // torneo + compañero si es formato de equipo) que su coach revisa y aprueba — el
    // rating solo se mueve al aprobar. Un coach/admin registra directo por su panel.
    root.querySelectorAll('[data-action="debate-record"]').forEach((btn) =>
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        openRecordDebate(btn.getAttribute("data-source") || "", repaint);
      })
    );

    // [NSDA Fase-1] Rellena la tarjeta de torneos con la API pública oficial de Tabroom
    // (vía el proxy server-side /api/tabroom/tourns). Degrada a mensaje si la API no responde.
    const nsdaBody = root.querySelector("[data-nsda] [data-nsda-body]");
    if (nsdaBody) {
      const fmtD = (iso) => { try { return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }); } catch { return ""; } };
      fetch("/api/tabroom/tourns")
        .then((r) => r.json())
        .then((d0) => {
          const tourns = (d0 && Array.isArray(d0.tourns) ? d0.tourns : []).slice(0, 5);
          if (!tourns.length) { (nsdaBody as any).innerHTML = `<p class="faint" style="font-size:12.5px">${t("debate.nsdaEmpty")}</p>`; return; }
          (nsdaBody as any).innerHTML = tourns.map((tn) => `
            <a href="${esc(tn.resultsUrl)}" target="_blank" rel="noopener" class="agenda-item" style="text-decoration:none;color:inherit">
              <div style="flex:1;min-width:0">
                <div class="ai-t">${esc(tn.name)}</div>
                <div class="ai-c">${esc([tn.city, tn.state].filter(Boolean).join(", "))}${tn.start ? " · " + esc(fmtD(tn.start)) : ""}</div>
              </div>
              <span class="sky" style="font-size:11.5px;white-space:nowrap">${t("debate.nsdaViewResults")} ${IC.arrowR}</span>
            </a>`).join("") + `<p class="faint" style="font-size:11px;margin-top:8px;line-height:1.4">${t("debate.nsdaPhase2")}</p>`;
        })
        .catch(() => { (nsdaBody as any).innerHTML = `<p class="faint" style="font-size:12.5px">${t("debate.nsdaEmpty")}</p>`; });
    }

    // [FIX conversión] Inscripción al torneo desde el Hub (donde nace la intención): POST
    // /api/tournaments (idempotente) + sello "Inscrito" optimista, sin saltar a otra pantalla.
    root.querySelectorAll("[data-tn-register]").forEach((el) =>
      el.addEventListener("click", async () => {
        const id = el.getAttribute("data-tn-register");
        (el as any).disabled = true;
        try {
          await (window as any).api("/api/tournaments", { tournamentId: id });
          (window as any).toast?.(t("debate.registerSent"), "ok");
          (el as any).outerHTML = `<div style="margin-top:12px"><span class="badge ok"><span class="dot"></span>${t("debate.registered")}</span></div>`;
        } catch (e) {
          (el as any).disabled = false;
          (window as any).toast?.((e && (e as any).message) || t("debate.registerError"), "warn");
        }
      })
    );

    // Detalle de un debate → carga /api/debates/[id] y abre un modal con el/los ballots.
    root.querySelectorAll("[data-debate]").forEach((el) =>
      el.addEventListener("click", () => openDebateDetail(el.getAttribute("data-debate")))
    );

    // [REDISEÑO] El alumno ya NO auto-registra debates — los registra y adjudica el
    // coach (botón "Adjudicar" en su panel). Por eso no hay entry points "debate-record".

  },
};

/* ---------------- detalle del debate (modal con ballot) ---------------- */
async function openDebateDetail(id) {
  if (!id) return;
  let data = null;
  try {
    data = await (window as any).api(`/api/debates/${encodeURIComponent(id)}`, null, "GET");
  } catch (e) {
    (window as any).toast?.(t("debate.detailLoadError"), "danger");
  }
  const dbt = (data && (data.debate || data)) || null;
  const rs = resultStyle(dbt && dbt.result);
  const ballots = (dbt && Array.isArray(dbt.ballots) ? dbt.ballots : []);
  const body = dbt
    ? `
      <div class="row vcenter" style="gap:10px;margin-bottom:14px">
        <span class="badge ${rs.tone}" style="font-weight:800;min-width:54px;justify-content:center">${rs.label}</span>
        <b style="font-size:15px">vs ${esc(dbt.opponent || t("debate.fallbackOpponent"))}</b>
        ${dbt.format ? `<span class="badge sky">${esc(dbt.format)}</span>` : ""}
      </div>
      <div class="row vcenter wrap" style="gap:8px;font-size:12.5px;color:var(--text-2);margin-bottom:14px">
        ${dbt.eventName ? `<span>${esc(dbt.eventName)}</span>` : ""}${dbt.roundLabel ? `<span class="dot-sep"></span><span>${esc(dbt.roundLabel)}</span>` : ""}${dbt.when ? `<span class="dot-sep"></span><span>${esc(dbt.when)}</span>` : ""}
      </div>
      ${ballots.length ? ballots.map((b) => `
        <div class="card card-pad" style="margin-bottom:10px">
          <div class="row between vcenter"><b style="font-size:13.5px">${t("debate.judge")}: ${esc(b.judge || "—")}</b></div>
          ${Array.isArray(b.scores) && b.scores.length ? `<div style="margin-top:10px">${b.scores.map((s) => {
            const v = Math.max(0, Math.min(10, Number(s.score) || 0));
            return `<div class="comp-row" style="padding:9px 0"><span class="cr-name" style="width:200px">${s.flagged ? `<span style="color:var(--warn)">${IC.flag}</span> ` : ""}${esc(s.criterion || "")}</span><span class="cr-bar">${C.bar((v / 10) * 100, { cls: "navy" })}</span><span class="cr-score">${v}</span></div>`;
          }).join("")}</div>` : ""}
          ${b.comments ? `<div class="callout" style="margin-top:10px">${esc(b.comments)}</div>` : ""}
          ${b.recordingUrl ? `<a class="btn btn-soft btn-sm" style="margin-top:10px" href="${esc(b.recordingUrl)}" target="_blank" rel="noopener">${IC.play} ${t("debate.watchRecording")}</a>` : ""}
        </div>`).join("") : `<div class="empty" style="padding:24px"><div class="ill">${IC.doc}</div><h4>${t("debate.noBallotTitle")}</h4><p>${t("debate.noBallotBody")}</p></div>`}`
    : `<div class="empty" style="padding:24px"><div class="ill">${IC.doc}</div><h4>${t("debate.loadFailedTitle")}</h4><p>${t("debate.loadFailedBody")}</p></div>`;

  openModal(t("debate.detailModalTitle"), body);
}

/* ---------------- form: registrar un debate (OTR o externo) ---------------- */
// [REQ-1] Formatos de EQUIPO (exigen compañero). LD es 1v1. Espeja isTeamFormat del backend.
function drIsTeamFormat(f) {
  const s = String(f || "").toUpperCase();
  if (s.includes("LINCOLN") || s === "LD") return false;
  return /PF|PUBLIC FORUM|POLICY|PARLI|WORLD/.test(s);
}

function openRecordDebate(forcedSource, onDone) {
  const isPractice = String(forcedSource || "").toUpperCase() === "OTR";
  const req = `<span style="color:var(--danger)">*</span>`;
  const body = `
    <div class="stack" style="gap:12px">
      <div class="card" style="background:var(--action-soft);border:none;padding:10px 12px;font-size:12.5px;color:var(--otr-green-text);line-height:1.45">${t("debate.requestIntro")}</div>
      <div class="field"><label class="label">${t("debate.fieldResult")}</label>
        <div class="seg" id="dr-result">
          <button type="button" data-v="WIN" class="on">${t("debate.resultWin")}</button>
          <button type="button" data-v="LOSS">${t("debate.resultLoss")}</button>
        </div>
      </div>
      <div class="field"><label class="label">${t("debate.fieldFormat")}</label>
        <select class="select" id="dr-format"><option>Public Forum</option><option>Lincoln-Douglas</option><option>Parliamentary</option><option>World Schools</option><option>Policy</option></select>
      </div>
      <div class="field"><label class="label">${t("debate.fieldSide")}</label>
        <select class="select" id="dr-side"><option value="PRO">Pro</option><option value="CON">Con</option></select>
      </div>
      <div class="field"><label class="label">${t("debate.fieldOpponent")}</label><input class="input" id="dr-opponent" placeholder="${t("debate.phOpponent")}"/></div>
      <div class="field" id="dr-partner-wrap"><label class="label">${t("debate.fieldPartner")} ${req}</label><input class="input" id="dr-partner" placeholder="${t("debate.phPartner")}"/><div class="hint" style="font-size:11.5px;color:var(--text-3);margin-top:4px">${t("debate.partnerRequiredHint")}</div></div>
      ${!isPractice ? `
      <div class="field"><label class="label">${t("debate.fieldSource")}</label>
        <div class="seg" id="dr-source">
          <button type="button" data-v="OTR" class="on">OTR</button>
          <button type="button" data-v="EXTERNAL">${t("debate.sourceExternalNsda")}</button>
        </div>
      </div>` : ""}
      <div class="field"><label class="label">${t("debate.fieldEvent")} ${req}</label><input class="input" id="dr-event" placeholder="${t("debate.phEvent")}"/></div>
      <div class="field"><label class="label">${t("debate.fieldTournamentCode")} ${req}</label><input class="input" id="dr-code" placeholder="${t("debate.phTournamentCode")}"/><div class="hint" style="font-size:11.5px;color:var(--text-3);margin-top:4px">${t("debate.tournamentCodeHint")}</div></div>
      <div class="field"><label class="label">${t("debate.fieldRound")}</label><input class="input" id="dr-round" placeholder="${t("debate.phRound")}"/></div>
      <div class="field"><label class="label">${t("debate.fieldJudgeComments")}</label><textarea class="input" id="dr-comments" rows="3" style="resize:vertical;font-family:inherit;line-height:1.5"></textarea></div>
    </div>`;

  openModal(t("debate.recordDebate"), body, {
    drawer: true,
    okLabel: t("debate.submitRequest"),
    // [REQ-1] el campo Compañero solo aparece (y es obligatorio) en formatos de equipo.
    afterMount: (scrim) => {
      const fmt = scrim.querySelector("#dr-format");
      const wrap = scrim.querySelector("#dr-partner-wrap");
      const sync = () => { if (wrap) wrap.style.display = drIsTeamFormat(fmt?.value) ? "" : "none"; };
      fmt && fmt.addEventListener("change", sync);
      sync();
    },
    onOk: async (scrim) => {
      const seg = (id) => scrim.querySelector(`#${id} button.on`)?.getAttribute("data-v");
      const val = (id) => (scrim.querySelector(`#${id}`)?.value || "").trim();
      const format = val("dr-format") || "Public Forum";
      const eventName = val("dr-event");
      const tournamentCode = val("dr-code");
      const partner = val("dr-partner");
      // Validación en cliente (el backend la repite por seguridad).
      if (!eventName) throw new Error(t("debate.errEvent"));
      if (!tournamentCode) throw new Error(t("debate.errCode"));
      if (drIsTeamFormat(format) && !partner) throw new Error(t("debate.errPartner"));
      const payload = {
        result: seg("dr-result") || "WIN",
        format,
        side: seg("dr-side") || (scrim.querySelector("#dr-side")?.value) || "PRO",
        opponent: val("dr-opponent"),
        partner,
        source: isPractice ? "OTR" : (seg("dr-source") || "OTR"),
        eventName,
        tournamentCode,
        roundLabel: val("dr-round"),
        comments: val("dr-comments"),
      };
      await (window as any).api("/api/debates", payload);
      // Refetch: la solicitud recién enviada debe aparecer en el historial sin recargar
      // (DB.debate viene del boot; el POST no lo actualiza solo).
      try {
        const res = await fetch("/api/app-data");
        if (res.ok) { const fresh = await res.json(); if (fresh && fresh.debate) DB.debate = fresh.debate; }
      } catch { /* silencioso: el toast ya confirmó el envío */ }
      (window as any).toast?.(t("debate.requestSent"), "ok");
      onDone && onDone();
    },
  });
}

/* ---------------- modal mínimo (reusa estilos .modal del shell) ---------------- */
function openModal(title, bodyHtml, opts = {}) {
  const scrim = document.createElement("div");
  // [REQ-1] opts.drawer ⇒ panel lateral derecho (registro de debate como "solicitud").
  scrim.className = "modal-scrim" + (opts.drawer ? " is-drawer" : "");
  const foot = opts.onOk
    ? `<div class="modal-foot"><button class="btn btn-ghost" data-x>${t("debate.cancel")}</button><button class="btn btn-primary" data-ok>${esc(opts.okLabel || t("debate.save"))}</button></div>`
    : `<div class="modal-foot"><button class="btn btn-ghost" data-x>${t("debate.close")}</button></div>`;
  scrim.innerHTML = `<div class="modal" role="dialog" style="max-width:560px"><div class="modal-head"><h3>${esc(title)}</h3></div><div class="modal-body">${bodyHtml}<p class="dm-err" style="color:var(--danger);font-size:13px;display:none;margin:8px 0 0"></p></div>${foot}</div>`;
  document.body.appendChild(scrim);
  const close = () => scrim.remove();
  // segmented buttons internos
  scrim.querySelectorAll(".seg").forEach((seg) =>
    seg.querySelectorAll("button").forEach((b) =>
      b.addEventListener("click", () => {
        seg.querySelectorAll("button").forEach((x) => x.classList.remove("on"));
        b.classList.add("on");
      })
    )
  );
  scrim.addEventListener("click", (e) => {
    if (e.target === scrim || e.target.closest("[data-x]")) close();
  });
  // [REQ-1] hook post-render para que el llamador conecte interactividad (p. ej. el
  // toggle formato→compañero del registro de debate).
  if (opts.afterMount) opts.afterMount(scrim);
  const okBtn = scrim.querySelector("[data-ok]");
  if (okBtn && opts.onOk) {
    okBtn.addEventListener("click", async () => {
      okBtn.textContent = t("debate.saving");
      okBtn.disabled = true;
      try {
        await opts.onOk(scrim);
        close();
      } catch (err) {
        const e = scrim.querySelector(".dm-err");
        if (e) { e.textContent = (err && err.message) || t("debate.error"); e.style.display = "block"; }
        okBtn.textContent = esc(opts.okLabel || t("debate.save"));
        okBtn.disabled = false;
      }
    });
  }
}
