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

export const S = {};

/* ---------------- estado local de la pantalla ---------------- */
// Sub-tab activo (Overview / Mis debates / …). Patrón window.__x como el resto del SPA.
const TABS = [
  { k: "overview", l: "Resumen", ic: "target" },
  { k: "history", l: "Mis debates", ic: "flag" },
  { k: "practice", l: "Práctica", ic: "mic" },
  { k: "leaderboard", l: "Leaderboard", ic: "trophy" },
  { k: "tournaments", l: "Torneos", ic: "calendar" },
  { k: "analytics", l: "Analytics", ic: "chart" },
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

// Escalera de tiers del PRD (Novato → … → Grandmaster). El siguiente tier sirve de meta.
const TIER_LADDER = ["Novato", "Bronze", "Silver", "Gold", "Platinum", "Diamond", "Master", "Grandmaster"];
function nextTier(tier) {
  const i = TIER_LADDER.indexOf(tier);
  return i >= 0 && i < TIER_LADDER.length - 1 ? TIER_LADDER[i + 1] : null;
}

// Color-coding de resultado (WIN verde / LOSS rojo / DRAW neutro). Devuelve {tone, label, cssVar}.
function resultStyle(result) {
  const r = String(result || "").toUpperCase();
  if (r === "WIN") return { tone: "ok", label: "WIN", cssVar: "var(--ok)" };
  if (r === "LOSS") return { tone: "danger", label: "LOSS", cssVar: "var(--danger)" };
  return { tone: "warn", label: "DRAW", cssVar: "var(--warn)" };
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
function statusBadge(status) {
  const s = String(status || "").toLowerCase();
  if (s === "open" || s === "abierto" || s === "upcoming") return `<span class="badge ok"><span class="dot"></span>Inscripciones abiertas</span>`;
  if (s === "soon" || s === "próximo" || s === "proximo") return `<span class="badge sky"><span class="dot"></span>Próximamente</span>`;
  if (s === "closed" || s === "cerrado") return `<span class="badge warn"><span class="dot"></span>Cerrado</span>`;
  if (s === "live" || s === "en vivo") return `<span class="badge danger"><span class="dot"></span>En vivo</span>`;
  return status ? `<span class="badge">${esc(status)}</span>` : "";
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
    <button class="btn btn-sm" style="flex:none;background:var(--otr-gold);color:#0C0C0C;font-weight:700" data-go="membership">Ver OTR Pro</button>
  </div>`;
}

/* ---------------- panel HERO navy (rating GRANDE + tier) ---------------- */
function heroPanel(d) {
  const nt = nextTier(d.tier);
  const forms = d.recentForm.slice(0, 6);
  return `
  <div class="hello-card fade-up" style="--d:0;margin-bottom:18px">
    <div class="h-row" style="align-items:center">
      <div style="min-width:240px">
        <p class="eyebrow" style="color:var(--otr-sky-hi)">Tu rating Glicko-2</p>
        <div class="row vcenter" style="gap:14px;margin-top:6px">
          <span class="brand-font" style="font-size:64px;font-weight:800;line-height:1;color:#fff">${d.rating}</span>
          <div class="stack" style="gap:7px">
            <span class="badge" style="background:color-mix(in srgb,var(--otr-sky) 26%, transparent);color:#fff;border:1px solid rgba(255,255,255,.22)"><span class="dot" style="background:var(--otr-sky-hi)"></span>${esc(d.tier)}</span>
            <span style="font-size:12.5px;color:rgba(234,242,251,.72)">±${d.rd} RD ${d.provisional ? "· provisional" : "· estable"}</span>
            ${d.speakerAvg != null ? `<span style="font-size:12.5px;color:rgba(234,242,251,.72)" title="Promedio de oratoria juzgada (separado del rating de victoria/derrota)">Orador <b style="color:var(--otr-sky-hi)">${d.speakerAvg}</b>/100 · ${d.speakerRounds} ${d.speakerRounds === 1 ? "ronda" : "rondas"}</span>` : ""}
          </div>
        </div>
        ${d.provisional
          ? `<div class="alert" style="margin-top:14px;background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.18);color:#fff"><span class="ai">${IC.target}</span><div><div class="at" style="color:#fff">Tu rating es provisional</div><span style="color:rgba(234,242,251,.78)">Pocas rondas adjudicadas aún. Cada ballot oficial lo acerca a tu nivel real.</span></div></div>`
          : nt
            ? `<p style="color:rgba(234,242,251,.72);font-size:13px;margin-top:12px">Próximo tier: <b style="color:var(--otr-sky-hi)">${esc(nt)}</b> — gana rondas adjudicadas y asciende.</p>`
            : `<p style="color:var(--otr-sky-hi);font-size:13px;margin-top:12px;font-weight:650">La cima es tuya: ${esc(d.tier)}. Defiéndela.</p>`}
      </div>
      <div class="stack" style="gap:12px;align-self:stretch;justify-content:center;min-width:220px">
        <div>
          <p class="eyebrow" style="color:var(--otr-sky-hi);margin-bottom:8px">Forma reciente</p>
          ${forms.length
            ? `<div class="row" style="gap:6px;flex-wrap:wrap">${forms.map((f) => {
                const rs = resultStyle(f.result);
                return `<span title="${esc(f.opponent || "")} · ${deltaLabel(f.delta)}" style="display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:9px;font-size:12px;font-weight:800;color:#fff;background:${rs.cssVar}">${rs.label[0]}</span>`;
              }).join("")}</div>
               <div class="row" style="gap:6px;flex-wrap:wrap;margin-top:8px">${forms.map((f) => `<span class="tnum" style="width:30px;text-align:center;font-size:11px;color:${deltaColor(f.delta)};font-weight:700">${deltaLabel(f.delta)}</span>`).join("")}</div>`
            : `<span style="font-size:12.5px;color:rgba(234,242,251,.6)">Aún sin rondas. Tu forma empieza con la primera.</span>`}
        </div>
        <button class="btn btn-sm" style="background:#fff;color:var(--otr-navy);font-weight:700" data-action="debate-record">${IC.plus} Registrar un debate</button>
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
  const wins = d.history.filter((h) => String(h.result).toUpperCase() === "WIN").length;
  const losses = d.history.filter((h) => String(h.result).toUpperCase() === "LOSS").length;
  const draws = d.history.filter((h) => String(h.result).toUpperCase() === "DRAW").length;
  const total = d.history.length;
  const winRate = total ? Math.round((wins / total) * 100) : 0;
  const nextEvent = getTournaments().find((t) => !t.registered) || getTournaments()[0] || null;

  const kpis = `
    <div class="grid g-4" style="margin-bottom:18px">
      <div class="tile">${C.kpi("Rondas adjudicadas", String(total), { ic: "flag" })}</div>
      <div class="tile">${C.kpi("Victorias", String(wins), { ic: "trophy" })}</div>
      <div class="tile">${C.kpi("% de victoria", String(winRate), { unit: "%", ic: "chart" })}</div>
      <div class="tile">${C.kpi("Empates · derrotas", `${draws} · ${losses}`, { ic: "levels" })}</div>
    </div>`;

  const recentList = d.history.slice(0, 4);
  const recentCard = `
    <div class="card">
      <div class="card-head"><h3>Debates recientes</h3><a href="#" onclick="return false" data-dtab="history" style="font-size:12.5px">Ver todos</a></div>
      <div class="card-body" style="padding:6px 16px 12px">
        ${recentList.length ? recentList.map((h) => {
          const rs = resultStyle(h.result);
          return `<div class="agenda-item">
            <span class="badge ${rs.tone}" style="min-width:54px;justify-content:center;font-weight:800">${rs.label}</span>
            <div style="flex:1;min-width:0"><div class="ai-t">${esc(h.opponent || "Rival")} · ${esc(h.format || "")}</div><div class="ai-c">${esc(h.eventName || "Práctica")}${h.roundLabel ? " · " + esc(h.roundLabel) : ""}</div></div>
            <span class="ai-w tnum" style="color:${deltaColor(h.delta != null ? h.delta : 0)}">${h.ratingAfter != null ? h.ratingAfter : ""}</span>
          </div>`;
        }).join("") : `<div style="padding:14px 0"><p class="faint" style="font-size:13px">Historial en cero. Juega una práctica o registra tu primera ronda.</p><button class="btn btn-soft btn-sm" style="margin-top:8px" data-dtab="practice">${IC.mic} Ir a práctica</button></div>`}
      </div>
    </div>`;

  const nextEventCard = `
    <div class="card card-pad">
      <div class="eyebrow" style="margin-bottom:2px">Próximo evento</div>
      ${nextEvent
        ? `<b style="font-size:15px;line-height:1.3;display:block">${esc(nextEvent.name)}</b>
           <div class="row vcenter wrap" style="gap:8px;margin-top:8px;font-size:12.5px;color:var(--text-2)">
             ${nextEvent.format ? `<span class="row vcenter" style="gap:5px">${IC.flag} ${esc(nextEvent.format)}</span>` : ""}
             ${nextEvent.region ? `<span class="dot-sep"></span><span>${esc(nextEvent.region)}</span>` : ""}
             ${nextEvent.modality ? `<span class="dot-sep"></span><span>${esc(nextEvent.modality)}</span>` : ""}
           </div>
           ${nextEvent.startsLabel ? `<div class="row vcenter" style="gap:6px;margin-top:10px;font-size:13px;color:var(--text)">${IC.calendar} ${esc(nextEvent.startsLabel)}</div>` : ""}
           <button class="btn btn-soft btn-sm btn-block" style="margin-top:14px" data-dtab="tournaments">Ver torneos ${IC.arrowR}</button>`
        : `<div class="empty" style="padding:18px"><div class="ill">${IC.calendar}</div><h4>Sin eventos en el radar</h4><p>Cuando se abran torneos los verás aquí. Llega entrenado.</p></div>`}
    </div>`;

  return `
    ${kpis}
    <div class="split fade-up" style="--d:0">
      <div class="stack" style="gap:16px">${recentCard}</div>
      <div class="stack" style="gap:16px">${nextEventCard}</div>
    </div>`;
}

/* ================= SECCIÓN · MIS DEBATES ================= */
function viewHistory(d) {
  if (!d.history.length) {
    return `<div class="card fade-up"><div class="empty"><div class="ill">${IC.flag}</div><h4>Registra tu primer debate</h4><p>Un debate (OTR o externo) o una práctica — cada ronda cuenta para tu rating.</p><button class="btn btn-primary btn-sm" data-action="debate-record">${IC.plus} Registrar un debate</button></div></div>`;
  }
  const cards = d.history.map((h, i) => {
    const rs = resultStyle(h.result);
    const src = String(h.source || "").toUpperCase() === "EXTERNAL" ? "Externo" : "OTR";
    return `
    <div class="tile click fade-up" data-debate="${esc(h.id || "")}" style="--d:${i % 8};border-left:3px solid ${rs.cssVar}">
      <div class="row between vcenter" style="gap:10px">
        <span class="badge ${rs.tone}" style="font-weight:800;min-width:54px;justify-content:center">${rs.label}</span>
        <span class="badge ${src === "OTR" ? "sky" : ""}">${src}</span>
      </div>
      <div style="margin-top:10px"><b style="font-size:14.5px;line-height:1.3">vs ${esc(h.opponent || "Rival")}</b></div>
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
    <div class="page-head fade-up"><div><p class="eyebrow">Tu palmarés</p><div class="page-title" style="font-size:20px">Mis debates</div><div class="page-sub">${d.history.length} ronda${d.history.length === 1 ? "" : "s"} · toca una tarjeta para ver el ballot</div></div>
    <button class="btn btn-primary btn-sm" data-action="debate-record">${IC.plus} Registrar un debate</button></div>
    <div class="grid g-3">${cards}</div>`;
}

/* ================= SECCIÓN · PRÁCTICA ================= */
// Flujo PF cronometrado (Constructive → Crossfire → Rebuttal → Summary → Final Focus).
const PF_FLOW = [
  { name: "Constructive", secs: 240 },
  { name: "Crossfire", secs: 180 },
  { name: "Rebuttal", secs: 240 },
  { name: "Summary", secs: 180 },
  { name: "Grand Crossfire", secs: 180 },
  { name: "Final Focus", secs: 120 },
];
function fmtClock(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}
function viewPractice() {
  const lb = getLeaderboard();
  const d = getDebate();
  // Rivales cerca de tu rating (±120) del leaderboard, excluyéndote.
  const near = lb.rows
    .filter((r) => !r.you && typeof r.rating === "number")
    .map((r) => ({ ...r, diff: Math.abs((r.rating || 0) - d.rating) }))
    .sort((a, b) => a.diff - b.diff)
    .slice(0, 5);

  const timer = `
    <div class="card card-pad fade-up">
      <div class="row between vcenter">
        <div><div class="eyebrow" style="margin-bottom:2px">Práctica cronometrada</div><b style="font-size:15px">Flujo Public Forum</b></div>
        <span class="badge sky" id="pf-phase-badge">Listo</span>
      </div>
      <div style="text-align:center;margin:18px 0 8px">
        <div class="brand-font tnum" id="pf-clock" style="font-size:54px;font-weight:800;color:var(--otr-navy);line-height:1">0:00</div>
        <div class="muted" id="pf-phase" style="font-size:13.5px;margin-top:4px">Pulsa "Iniciar" para empezar el Constructive</div>
      </div>
      <div class="bar thin navy" style="margin:8px 0 16px"><i id="pf-bar" style="width:0%"></i></div>
      <div class="row" style="gap:var(--s-2);justify-content:center">
        <button class="btn btn-primary btn-sm" id="pf-start">${IC.play} Iniciar</button>
        <button class="btn btn-soft btn-sm" id="pf-next">Siguiente fase ${IC.arrowR}</button>
        <button class="btn btn-ghost btn-sm" id="pf-reset">${IC.refresh} Reiniciar</button>
      </div>
      <div class="divider"></div>
      <div class="row wrap" style="gap:6px" id="pf-steps">
        ${PF_FLOW.map((p, i) => `<span class="chip" data-step="${i}">${i + 1}. ${p.name} · ${Math.round(p.secs / 60)}m</span>`).join("")}
      </div>
      <button class="btn btn-soft btn-sm btn-block" style="margin-top:16px" data-action="debate-record" data-source="OTR">${IC.check} Registrar resultado de práctica</button>
    </div>`;

  const finder = `
    <div class="card card-pad fade-up" style="--d:1">
      <div class="eyebrow" style="margin-bottom:2px">Encuentra compañero o rival</div>
      <b style="font-size:15px">Cerca de tu rating (${d.rating})</b>
      <div class="stack" style="gap:2px;margin-top:12px">
        ${near.length ? near.map((r) => `
          <div class="row between vcenter" style="padding:9px 0;border-bottom:1px solid var(--border)">
            <span class="row vcenter" style="gap:10px">${C.avatar(esc(r.initials || "?"), { size: "sm", bg: "var(--otr-navy)" })}<span><span style="display:block;font-weight:600;font-size:13px">${esc(r.name || "Debatiente")}</span><span class="faint" style="font-size:11.5px">${esc(r.tier || "")}</span></span></span>
            <span class="row vcenter" style="gap:8px"><span class="tnum" style="font-weight:700;font-size:13px">${r.rating}</span><span class="badge ${r.diff <= 50 ? "ok" : "sky"}" style="font-size:10.5px">±${r.diff}</span></span>
          </div>`).join("") : `<p class="faint" style="font-size:13px">Tu cohort aún no entra a la arena. En cuanto jueguen rondas, tendrás rivales a tu altura.</p>`}
      </div>
      <button class="btn btn-ghost btn-sm btn-block" style="margin-top:12px" data-dtab="leaderboard">Ver leaderboard completo ${IC.arrowR}</button>
    </div>`;

  return `
    <div class="page-head fade-up"><div><p class="eyebrow">Entrena bajo presión</p><div class="page-title" style="font-size:20px">Práctica</div><div class="page-sub">Cronometra un flujo PF completo y registra el resultado. La práctica queda en tu historial; tu rating solo se mueve en rondas adjudicadas por un coach.</div></div></div>
    <div class="split">${timer}<div class="stack" style="gap:16px">${finder}</div></div>`;
}

/* ================= SECCIÓN · LEADERBOARD ================= */
function viewLeaderboard() {
  const lb = getLeaderboard();
  if (!lb.rows.length) {
    return `<div class="card fade-up"><div class="empty"><div class="ill">${IC.trophy}</div><h4>Entra en la clasificación</h4><p>Juega rondas adjudicadas y reclama tu posición antes que el resto del cohort.</p></div></div>`;
  }
  const meRow = lb.me
    ? `<div class="alert info fade-up" style="margin-bottom:16px"><span class="ai">${IC.target}</span><div><div class="at">Tu posición</div>#${lb.me.rank} · ${lb.me.rating} de rating · ${esc(lb.me.tier || "")}</div></div>`
    : "";
  const rows = lb.rows.map((r) => `
    <tr ${r.you ? 'style="background:var(--action-soft)"' : ""}>
      <td><span class="badge ${r.rank <= 3 ? "gold" : ""}" style="min-width:30px;justify-content:center">${r.rank}</span></td>
      <td><div class="row vcenter" style="gap:10px">${C.avatar(esc(r.initials || "?"), { size: "sm", bg: r.you ? "var(--otr-sky-lo)" : "var(--otr-navy)" })}<b style="font-weight:600">${esc(r.name || "")}${r.you ? ' <span class="badge sky" style="font-size:10px;margin-left:4px">Tú</span>' : ""}</b></div></td>
      <td>${esc(r.tier || "")}</td>
      <td class="num tnum"><b>${r.rating}</b></td>
    </tr>`).join("");
  return `
    <div class="page-head fade-up"><div><p class="eyebrow">El cohort</p><div class="page-title" style="font-size:20px">Leaderboard</div><div class="page-sub">Ranking por rating Glicko-2 — solo cuentan las rondas adjudicadas</div></div></div>
    ${proUpsellStrip("¿Listo para subir de tier? Descubre todo lo que incluye OTR Pro.")}
    ${meRow}
    <div class="table-wrap scroll-m fade-up">
      <table class="tbl">
        <thead><tr><th style="width:60px">#</th><th>Debatiente</th><th>Tier</th><th class="num">Rating</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

/* ================= SECCIÓN · TORNEOS ================= */
function viewTournaments() {
  const ts = getTournaments();
  if (!ts.length) {
    return `<div class="card fade-up"><div class="empty"><div class="ill">${IC.calendar}</div><h4>Sin torneos por ahora</h4><p>Cuando OTR abra inscripciones lo verás aquí. Mientras tanto, suma rondas de práctica.</p></div></div>`;
  }
  const cards = ts.map((t, i) => `
    <div class="tile fade-up" data-tournament-card="${esc(t.id || "")}" style="display:flex;flex-direction:column;--d:${i}">
      <div class="row between vcenter" style="gap:10px"><b style="font-size:15px;line-height:1.3">${esc(t.name || "Torneo")}</b>${t.format ? `<span class="badge sky" style="flex:none">${esc(t.format)}</span>` : ""}</div>
      <div class="row vcenter wrap" style="gap:8px;font-size:12px;color:var(--text-2);margin-top:8px">
        ${t.region ? `<span>${esc(t.region)}</span>` : ""}${t.modality ? `<span class="dot-sep"></span><span>${esc(t.modality)}</span>` : ""}${t.entryLabel ? `<span class="dot-sep"></span><span>${esc(t.entryLabel)}</span>` : ""}
      </div>
      ${t.startsLabel ? `<div class="row vcenter" style="gap:6px;margin-top:10px;font-size:12.5px;color:var(--text)">${IC.calendar} ${esc(t.startsLabel)}</div>` : ""}
      <div class="divider" style="margin:14px 0"></div>
      <div class="row between vcenter" style="margin-top:auto;gap:10px">
        ${statusBadge(t.status)}
        ${t.registered
          ? `<span class="badge ok"><span class="dot"></span>Inscrito</span>`
          : String(t.status || "").toLowerCase() === "upcoming"
          ? `<button class="btn btn-primary btn-sm" data-tournament="${esc(t.id || "")}">${IC.plus} Registrarme</button>`
          : ``/* [DEBATE-5] LIVE/cerrado: la API rechaza el registro (409), no mostramos boton — el badge de estado ya lo comunica */}
      </div>
    </div>`).join("");
  return `
    <div class="page-head fade-up"><div><p class="eyebrow">Compite de verdad</p><div class="page-title" style="font-size:20px">Torneos</div><div class="page-sub">Inscríbete a torneos OTR y externos</div></div></div>
    ${proUpsellStrip("Llega a los torneos con ventaja. Conoce OTR Pro.")}
    <div class="grid g-3">${cards}</div>`;
}

/* ================= SECCIÓN · ANALYTICS ================= */
function recordRow(r) {
  const w = Number(r.wins) || 0, l = Number(r.losses) || 0, dr = Number(r.draws) || 0;
  const total = w + l + dr;
  const wr = total ? Math.round((w / total) * 100) : 0;
  return `
    <div class="comp-row">
      ${/* [auditoría] el contrato real de DB.debate.analytics es {format}/{side}, no {name}: leer la clave viva */""}
      <span class="cr-name">${esc(r.format || r.side || r.name || "")}</span>
      <span class="cr-bar">${C.bar(wr, { cls: "navy" })}</span>
      <span class="cr-score">${wr}%</span>
    </div>
    <div class="row" style="gap:8px;margin:-6px 0 4px 0;font-size:11.5px;color:var(--text-2)">
      <span class="badge ok" style="font-size:10.5px">${w}W</span><span class="badge danger" style="font-size:10.5px">${l}L</span><span class="badge warn" style="font-size:10.5px">${dr}D</span>
    </div>`;
}
function viewAnalytics(d) {
  const a = d.analytics || {};
  // PRD §13.2: "Full analytics" es beneficio Pro. Si el backend recortó el bloque
  // a { locked:true } (miembro free), mostramos un estado de upsell premium en vez
  // de los gráficos — el botón lleva a la pantalla de membresía.
  if (a.locked) {
    return `
      <div class="page-head fade-up"><div><p class="eyebrow">Conoce tu juego</p><div class="page-title" style="font-size:20px">Analytics</div><div class="page-sub">Tus patrones por formato, lado de la resolución y criterio de rúbrica</div></div></div>
      <div class="card fade-up"><div class="empty" style="padding:34px 24px">
        <div class="ill">${IC.chart}</div>
        <h4>Analytics completo es parte de OTR Pro</h4>
        <p>Desbloquea tu desglose por formato, por lado (Pro / Con) y el promedio por criterio de la rúbrica del juez. Tus datos ya se están registrando — activa Pro y úsalos a tu favor.</p>
        <button class="btn btn-primary btn-sm" style="margin-top:14px" data-go="membership">${IC.star} Ver OTR Pro</button>
      </div></div>`;
  }
  const byFormat = Array.isArray(a.byFormat) ? a.byFormat : [];
  const bySide = Array.isArray(a.bySide) ? a.bySide : [];
  const criteria = Array.isArray(a.criteria) ? a.criteria : [];
  const hasAny = byFormat.length || bySide.length || criteria.length;
  if (!hasAny) {
    return `<div class="card fade-up"><div class="empty"><div class="ill">${IC.chart}</div><h4>Aún sin datos</h4><p>Juega rondas adjudicadas para ver tu desglose por formato y lado.</p></div></div>`;
  }
  const formatCard = `
    <div class="card card-pad fade-up">
      <div class="eyebrow" style="margin-bottom:2px">Rendimiento</div>
      <b style="font-size:15px">Por formato</b>
      <div style="margin-top:10px">${byFormat.length ? byFormat.map(recordRow).join("") : `<p class="faint" style="font-size:13px">Sin datos por formato.</p>`}</div>
    </div>`;
  const sideCard = `
    <div class="card card-pad fade-up" style="--d:1">
      <div class="eyebrow" style="margin-bottom:2px">Rendimiento</div>
      <b style="font-size:15px">Por lado (Pro / Con)</b>
      <div style="margin-top:10px">${bySide.length ? bySide.map(recordRow).join("") : `<p class="faint" style="font-size:13px">Sin datos por lado.</p>`}</div>
    </div>`;
  const critCard = `
    <div class="card card-pad fade-up" style="--d:2">
      <div class="row between vcenter">
        <div><div class="eyebrow" style="margin-bottom:2px">Rúbrica del juez</div><b style="font-size:15px">Promedio por criterio</b></div>
        <span class="badge sky">0–10</span>
      </div>
      <div style="margin-top:12px">
        ${criteria.length ? criteria.map((c) => {
          const avg = Math.max(0, Math.min(10, Number(c.avg) || 0));
          const pct = Math.round((avg / 10) * 100);
          return `<div class="comp-row"><span class="cr-name">${esc(c.criterion || c.name || "")}</span><span class="cr-bar">${C.bar(pct, { cls: "navy" })}</span><span class="cr-score">${avg.toFixed(1)}</span></div>`;
        }).join("") : `<p class="faint" style="font-size:13px">Sin ballots todavía.</p>`}
      </div>
    </div>`;
  return `
    <div class="page-head fade-up"><div><p class="eyebrow">Conoce tu juego</p><div class="page-title" style="font-size:20px">Analytics</div><div class="page-sub">Tus patrones por formato, lado de la resolución y criterio de rúbrica</div></div></div>
    <div class="split">${critCard}<div class="stack" style="gap:16px">${formatCard}${sideCard}</div></div>`;
}

/* ---------------- router de secciones ---------------- */
function renderTab(tab, d) {
  switch (tab) {
    case "history": return viewHistory(d);
    case "practice": return viewPractice();
    case "leaderboard": return viewLeaderboard();
    case "tournaments": return viewTournaments();
    case "analytics": return viewAnalytics(d);
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

    // Detalle de un debate → carga /api/debates/[id] y abre un modal con el/los ballots.
    root.querySelectorAll("[data-debate]").forEach((el) =>
      el.addEventListener("click", () => openDebateDetail(el.getAttribute("data-debate")))
    );

    // Registrarme a un torneo → POST /api/tournaments.
    root.querySelectorAll("[data-tournament]").forEach((btn) =>
      btn.addEventListener("click", async (e) => {
        e.preventDefault();
        const id = btn.getAttribute("data-tournament");
        btn.disabled = true;
        btn.textContent = "Registrando…";
        try {
          await (window as any).api("/api/tournaments", { tournamentId: id });
          (window as any).toast?.("Inscripción enviada — nos vemos en la arena.", "ok");
          // marca localmente como inscrito y repinta (sin recarga completa)
          (DB.tournaments || []).forEach((t) => { if (t.id === id) t.registered = true; });
          repaint();
        } catch (err) {
          (window as any).toast?.((err && err.message) || "No se pudo registrar", "danger");
          btn.disabled = false;
          btn.innerHTML = `${IC.plus} Registrarme`;
        }
      })
    );

    // Botón "Registrar un debate" / "Registrar resultado de práctica".
    root.querySelectorAll('[data-action="debate-record"]').forEach((btn) =>
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        openRecordDebate(btn.getAttribute("data-source") || "", repaint);
      })
    );

    // Temporizador del flujo PF (solo existe en la pestaña de práctica).
    mountPfTimer(root);
  },
};

/* ---------------- detalle del debate (modal con ballot) ---------------- */
async function openDebateDetail(id) {
  if (!id) return;
  let data = null;
  try {
    data = await (window as any).api(`/api/debates/${encodeURIComponent(id)}`, null, "GET");
  } catch (e) {
    (window as any).toast?.("No se pudo cargar el detalle del debate", "danger");
  }
  const dbt = (data && (data.debate || data)) || null;
  const rs = resultStyle(dbt && dbt.result);
  const ballots = (dbt && Array.isArray(dbt.ballots) ? dbt.ballots : []);
  const body = dbt
    ? `
      <div class="row vcenter" style="gap:10px;margin-bottom:14px">
        <span class="badge ${rs.tone}" style="font-weight:800;min-width:54px;justify-content:center">${rs.label}</span>
        <b style="font-size:15px">vs ${esc(dbt.opponent || "Rival")}</b>
        ${dbt.format ? `<span class="badge sky">${esc(dbt.format)}</span>` : ""}
      </div>
      <div class="row vcenter wrap" style="gap:8px;font-size:12.5px;color:var(--text-2);margin-bottom:14px">
        ${dbt.eventName ? `<span>${esc(dbt.eventName)}</span>` : ""}${dbt.roundLabel ? `<span class="dot-sep"></span><span>${esc(dbt.roundLabel)}</span>` : ""}${dbt.when ? `<span class="dot-sep"></span><span>${esc(dbt.when)}</span>` : ""}
      </div>
      ${ballots.length ? ballots.map((b) => `
        <div class="card card-pad" style="margin-bottom:10px">
          <div class="row between vcenter"><b style="font-size:13.5px">Juez: ${esc(b.judge || "—")}</b></div>
          ${Array.isArray(b.scores) && b.scores.length ? `<div style="margin-top:10px">${b.scores.map((s) => {
            const v = Math.max(0, Math.min(10, Number(s.score) || 0));
            return `<div class="comp-row" style="padding:9px 0"><span class="cr-name" style="width:200px">${s.flagged ? `<span style="color:var(--warn)">${IC.flag}</span> ` : ""}${esc(s.criterion || "")}</span><span class="cr-bar">${C.bar((v / 10) * 100, { cls: "navy" })}</span><span class="cr-score">${v}</span></div>`;
          }).join("")}</div>` : ""}
          ${b.comments ? `<div class="callout" style="margin-top:10px">${esc(b.comments)}</div>` : ""}
          ${b.recordingUrl ? `<a class="btn btn-soft btn-sm" style="margin-top:10px" href="${esc(b.recordingUrl)}" target="_blank" rel="noopener">${IC.play} Ver grabación</a>` : ""}
        </div>`).join("") : `<div class="empty" style="padding:24px"><div class="ill">${IC.doc}</div><h4>Sin ballot todavía</h4><p>Esta ronda aún no tiene un ballot del juez registrado.</p></div>`}`
    : `<div class="empty" style="padding:24px"><div class="ill">${IC.doc}</div><h4>No se pudo cargar</h4><p>Intenta de nuevo más tarde.</p></div>`;

  openModal("Detalle del debate", body);
}

/* ---------------- form: registrar un debate (OTR o externo) ---------------- */
function openRecordDebate(forcedSource, onDone) {
  const isPractice = String(forcedSource || "").toUpperCase() === "OTR";
  const body = `
    <div class="stack" style="gap:12px">
      <div class="field"><label class="label">Resultado</label>
        <div class="seg" id="dr-result">
          <button type="button" data-v="WIN" class="on">Victoria</button>
          <button type="button" data-v="LOSS">Derrota</button>
          <button type="button" data-v="DRAW">Empate</button>
        </div>
      </div>
      <div class="field"><label class="label">Formato</label>
        <select class="select" id="dr-format"><option>Public Forum</option><option>Lincoln-Douglas</option><option>Parliamentary</option><option>World Schools</option><option>Policy</option></select>
      </div>
      <div class="field"><label class="label">Lado</label>
        <select class="select" id="dr-side"><option value="PRO">Pro</option><option value="CON">Con</option></select>
      </div>
      <div class="field"><label class="label">Rival</label><input class="input" id="dr-opponent" placeholder="Equipo o debatiente rival"/></div>
      <div class="field"><label class="label">Compañero (opcional)</label><input class="input" id="dr-partner" placeholder="Tu compañero de equipo"/></div>
      ${!isPractice ? `
      <div class="field"><label class="label">Fuente</label>
        <div class="seg" id="dr-source">
          <button type="button" data-v="OTR" class="on">OTR</button>
          <button type="button" data-v="EXTERNAL">Externo / NSDA</button>
        </div>
      </div>` : ""}
      <div class="field"><label class="label">Evento (opcional)</label><input class="input" id="dr-event" placeholder="Torneo o sesión de práctica"/></div>
      <div class="field"><label class="label">Ronda (opcional)</label><input class="input" id="dr-round" placeholder="Round 3, Cuartos…"/></div>
      <div class="field"><label class="label">Comentarios del juez (opcional)</label><textarea class="input" id="dr-comments" rows="3" style="resize:vertical;font-family:inherit;line-height:1.5"></textarea></div>
    </div>`;

  openModal(isPractice ? "Registrar resultado de práctica" : "Registrar un debate", body, {
    okLabel: "Guardar",
    onOk: async (scrim) => {
      const seg = (id) => scrim.querySelector(`#${id} button.on`)?.getAttribute("data-v");
      const val = (id) => (scrim.querySelector(`#${id}`)?.value || "").trim();
      const payload = {
        result: seg("dr-result") || "WIN",
        format: val("dr-format") || "Public Forum",
        side: seg("dr-side") || (scrim.querySelector("#dr-side")?.value) || "PRO",
        opponent: val("dr-opponent"),
        partner: val("dr-partner"),
        source: isPractice ? "OTR" : (seg("dr-source") || "OTR"),
        eventName: val("dr-event"),
        roundLabel: val("dr-round"),
        comments: val("dr-comments"),
      };
      await (window as any).api("/api/debates", payload);
      (window as any).toast?.("Debate registrado", "ok");
      onDone && onDone();
    },
  });
}

/* ---------------- modal mínimo (reusa estilos .modal del shell) ---------------- */
function openModal(title, bodyHtml, opts = {}) {
  const scrim = document.createElement("div");
  scrim.className = "modal-scrim";
  const foot = opts.onOk
    ? `<div class="modal-foot"><button class="btn btn-ghost" data-x>Cancelar</button><button class="btn btn-primary" data-ok>${esc(opts.okLabel || "Guardar")}</button></div>`
    : `<div class="modal-foot"><button class="btn btn-ghost" data-x>Cerrar</button></div>`;
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
  const okBtn = scrim.querySelector("[data-ok]");
  if (okBtn && opts.onOk) {
    okBtn.addEventListener("click", async () => {
      okBtn.textContent = "Guardando…";
      okBtn.disabled = true;
      try {
        await opts.onOk(scrim);
        close();
      } catch (err) {
        const e = scrim.querySelector(".dm-err");
        if (e) { e.textContent = (err && err.message) || "Error"; e.style.display = "block"; }
        okBtn.textContent = esc(opts.okLabel || "Guardar");
        okBtn.disabled = false;
      }
    });
  }
}

/* ---------------- temporizador del flujo PF ---------------- */
function mountPfTimer(root) {
  const clockEl = root.querySelector("#pf-clock");
  if (!clockEl) return; // no estamos en la pestaña de práctica
  const phaseEl = root.querySelector("#pf-phase");
  const badgeEl = root.querySelector("#pf-phase-badge");
  const barEl = root.querySelector("#pf-bar");
  const stepEls = root.querySelectorAll("#pf-steps [data-step]");
  const startBtn = root.querySelector("#pf-start");
  const nextBtn = root.querySelector("#pf-next");
  const resetBtn = root.querySelector("#pf-reset");

  let idx = -1;       // fase actual (-1 = no iniciado)
  let remaining = 0;  // segundos restantes
  let running = false;
  let handle = null;

  // Limpia cualquier timer previo de esta pantalla (al repintar / navegar).
  try { if ((window as any).__pfTimer) clearInterval((window as any).__pfTimer); } catch (e) {}
  // Aula.tsx llama window.__recTeardown antes de cada navegación; reusamos ese hook
  // para no dejar vivo el setInterval del flujo PF al salir del Debate Hub.
  (window as any).__recTeardown = () => { try { clearInterval(handle); } catch (e) {} (window as any).__recTeardown = null; };

  function paint() {
    if (idx < 0) {
      clockEl.textContent = "0:00";
      phaseEl.textContent = 'Pulsa "Iniciar" para empezar el Constructive';
      if (badgeEl) badgeEl.textContent = "Listo";
      if (barEl) barEl.style.width = "0%";
      stepEls.forEach((s) => s.classList.remove("active"));
      return;
    }
    const phase = PF_FLOW[idx];
    clockEl.textContent = fmtClock(Math.max(0, remaining));
    phaseEl.textContent = `Fase ${idx + 1} de ${PF_FLOW.length} · ${phase.name}`;
    if (badgeEl) badgeEl.textContent = running ? phase.name : "Pausa";
    if (barEl) barEl.style.width = `${Math.round(((phase.secs - remaining) / phase.secs) * 100)}%`;
    stepEls.forEach((s, i) => s.classList.toggle("active", i === idx));
  }
  function tick() {
    if (!running) return;
    remaining -= 1;
    if (remaining <= 0) {
      remaining = 0;
      paint();
      (window as any).toast?.(`Fin de ${PF_FLOW[idx].name}`, "warn");
      goNext(true);
      return;
    }
    paint();
  }
  function startPhase(i) {
    idx = i;
    remaining = PF_FLOW[idx].secs;
    running = true;
    if (startBtn) startBtn.innerHTML = `${IC.pause} Pausar`;
    paint();
  }
  function goNext(auto) {
    if (idx < 0) { startPhase(0); return; }
    if (idx >= PF_FLOW.length - 1) {
      running = false;
      if (!auto) (window as any).toast?.("Flujo PF completado", "ok");
      if (badgeEl) badgeEl.textContent = "Completado";
      if (startBtn) startBtn.innerHTML = `${IC.refresh} Reiniciar flujo`;
      return;
    }
    startPhase(idx + 1);
  }

  handle = setInterval(tick, 1000);
  (window as any).__pfTimer = handle;

  startBtn?.addEventListener("click", () => {
    if (idx < 0) { startPhase(0); return; }
    if (idx >= PF_FLOW.length - 1 && !running && remaining <= 0) { startPhase(0); return; }
    running = !running;
    startBtn.innerHTML = running ? `${IC.pause} Pausar` : `${IC.play} Reanudar`;
    if (badgeEl && !running) badgeEl.textContent = "Pausa";
    paint();
  });
  nextBtn?.addEventListener("click", () => goNext(false));
  resetBtn?.addEventListener("click", () => { running = false; idx = -1; remaining = 0; if (startBtn) startBtn.innerHTML = `${IC.play} Iniciar`; paint(); });

  paint();
}
