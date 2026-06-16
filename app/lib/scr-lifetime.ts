// @ts-nocheck
/* OTR · Lifetime Progress Profile (PRD §8 — el moat) + Membresía (PRD §13).
   Pantallas S.lifetimeProfile ("Mi trayectoria") y S.membership ("Membresía").

   Lee del DB (lo hidrata queries.ts → getAppData). Contratos esperados:
     DB.lifetime = {
       identity:{ name, initials, level, ageBand, memberSinceLabel, languages, location },
       skillGraph:[{ skill, name, score, events:[{ title, whenLabel }] }],
       ledger:{ coursesCompleted, lessonsDone, debates, wins, sessionsAttended, tournaments, hoursStudied },
       performance:{ rating, tier, rd, provisional, history:[{ label, ratingAfter, tierAfter }] },
       credentials:[{ title, issuedLabel }],
       journey:[{ whenLabel, monthLabel, title, detail, type }],
       publicProfile:{ enabled, slug, url, canToggle, minorNote }
     }
     DB.membership = { tier, sinceLabel, prices:{ proMonthly:'US$9', proAnnual:'US$79' } }

   Patrón de la casa: render(state)->string + mount(root,state) opcional; IC.* iconos,
   esc() en todo texto de usuario, navy #0C0C0C + sky #2CAA20, claro, fade-up, sin emojis.
   Acciones del cliente vía los globales de Aula.tsx: go(), api(url,body,method), toast(). */
import { DB } from "./data";
import { C } from "./components";
import { IC } from "./icons";
import { esc } from "./esc";

export const S = {};

/* ================================================================
   HELPERS DE DATOS (defaults defensivos sobre DB.lifetime / DB.membership)
   ================================================================ */
function getLifetime() {
  const lt = DB.lifetime || {};
  const identity = lt.identity || {};
  const ledger = lt.ledger || {};
  const perf = lt.performance || {};
  const pp = lt.publicProfile || {};
  return {
    identity: {
      name: identity.name || "",
      initials: identity.initials || "?",
      level: identity.level || "Novato",
      ageBand: identity.ageBand || "",
      memberSinceLabel: identity.memberSinceLabel || "",
      languages: Array.isArray(identity.languages) ? identity.languages : [],
      location: identity.location || "",
    },
    skillGraph: Array.isArray(lt.skillGraph) ? lt.skillGraph : [],
    ledger: {
      coursesCompleted: Number(ledger.coursesCompleted) || 0,
      lessonsDone: Number(ledger.lessonsDone) || 0,
      debates: Number(ledger.debates) || 0,
      wins: Number(ledger.wins) || 0,
      sessionsAttended: Number(ledger.sessionsAttended) || 0,
      tournaments: Number(ledger.tournaments) || 0,
      hoursStudied: Number(ledger.hoursStudied) || 0,
    },
    performance: {
      rating: typeof perf.rating === "number" ? perf.rating : 1500,
      tier: perf.tier || "Novato",
      rd: typeof perf.rd === "number" ? perf.rd : 350,
      provisional: perf.provisional != null ? !!perf.provisional : true,
      history: Array.isArray(perf.history) ? perf.history : [],
    },
    credentials: Array.isArray(lt.credentials) ? lt.credentials : [],
    journey: Array.isArray(lt.journey) ? lt.journey : [],
    publicProfile: {
      enabled: !!pp.enabled,
      slug: pp.slug || "",
      url: pp.url || "",
      canToggle: pp.canToggle != null ? !!pp.canToggle : true,
      minorNote: pp.minorNote || "",
    },
  };
}
function getMembership() {
  const m = DB.membership || {};
  const prices = m.prices || {};
  return {
    tier: String(m.tier || "free").toLowerCase(),
    sinceLabel: m.sinceLabel || "",
    prices: {
      proMonthly: prices.proMonthly || "US$9",
      proAnnual: prices.proAnnual || "US$79",
    },
  };
}
function clampScore(n) { return Math.max(0, Math.min(100, Number(n) || 0)); }

/* ================================================================
   ① HERO CLARO — identidad (quién es + desde cuándo + idiomas)
   ================================================================ */
function identityHero(lt) {
  const id = lt.identity;
  const meta = [];
  // ageBand viene crudo ('minor'|'adult'): solo el caso menor aporta señal al usuario.
  if (id.ageBand === "minor") meta.push("Menor — cuenta protegida");
  if (id.location) meta.push(esc(id.location));
  // memberSinceLabel ya incluye el prefijo ("Miembro desde octubre 2025").
  if (id.memberSinceLabel) meta.push(esc(id.memberSinceLabel));
  return `
  <div class="card card-pad fade-up" style="--d:0;margin-bottom:18px;background:linear-gradient(120deg,var(--otr-offwhite),#fff)">
    <div class="row vcenter wrap" style="gap:18px">
      ${C.avatar(esc(id.initials), { size: "lg", bg: "var(--otr-navy)" })}
      <div style="flex:1;min-width:220px">
        <p class="eyebrow">Tu historia en OTR</p>
        <div class="row vcenter wrap" style="gap:10px;margin-top:3px">
          <h2 class="brand-font" style="font-size:24px;font-weight:800">${esc(id.name || "Estudiante OTR")}</h2>
          ${C.levelBadge(esc(id.level))}
        </div>
        ${meta.length ? `<p class="muted" style="font-size:13px;margin-top:6px">${meta.join(' <span class="dot-sep"></span> ')}</p>` : ""}
        ${id.languages.length ? `<div class="row wrap" style="gap:6px;margin-top:10px">${id.languages.map((l) => `<span class="chip soft" style="height:24px;font-size:11.5px;font-weight:600">${esc(l)}</span>`).join("")}</div>` : ""}
      </div>
    </div>
  </div>`;
}

/* ================================================================
   ② SKILL GRAPH — radar SVG hexagonal dibujado a mano + lista con atribución
   ================================================================ */
function radarSvg(skills) {
  const n = skills.length;
  if (n < 3) return "";
  const W = 340, H = 300, cx = W / 2, cy = H / 2 + 4, R = 102;
  const pt = (i, r) => {
    const a = -Math.PI / 2 + (2 * Math.PI * i) / n;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  };
  const poly = (f) => skills.map((_, i) => pt(i, R * f).map((v) => v.toFixed(1)).join(",")).join(" ");
  // Anillos de referencia (25 / 50 / 75 / 100)
  const rings = [1, 0.75, 0.5, 0.25].map((f, k) =>
    `<polygon points="${poly(f)}" fill="${k === 0 ? "var(--n-25)" : "none"}" stroke="var(--border)" stroke-width="1"/>`).join("");
  // Ejes del centro a cada punta
  const axes = skills.map((_, i) => {
    const [x, y] = pt(i, R);
    return `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="var(--border)" stroke-width="1"/>`;
  }).join("");
  // Polígono de scores
  const scorePts = skills.map((s, i) => pt(i, R * (clampScore(s.score) / 100)));
  const scorePoly = scorePts.map((p) => p.map((v) => v.toFixed(1)).join(",")).join(" ");
  const dots = scorePts.map((p) =>
    `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3.4" fill="var(--otr-sky-lo)" stroke="#fff" stroke-width="1.6"/>`).join("");
  // Labels en las puntas
  const labels = skills.map((s, i) => {
    const [x, y] = pt(i, R + 18);
    const anchor = Math.abs(x - cx) < 8 ? "middle" : x > cx ? "start" : "end";
    const dy = y < cy - 8 ? -2 : y > cy + 8 ? 9 : 4;
    return `<text x="${x.toFixed(1)}" y="${(y + dy).toFixed(1)}" text-anchor="${anchor}" font-size="11" font-weight="650" fill="var(--text-2)">${esc(s.name || s.skill || "")}</text>`;
  }).join("");
  return `
  <svg viewBox="0 0 ${W} ${H}" width="100%" style="max-width:${W}px;display:block;margin:0 auto" role="img" aria-label="Radar de habilidades">
    ${rings}${axes}
    <polygon points="${scorePoly}" style="fill:color-mix(in srgb,var(--otr-sky) 24%, transparent)" stroke="var(--otr-sky-lo)" stroke-width="2" stroke-linejoin="round"/>
    ${dots}${labels}
  </svg>`;
}

function skillRows(skills) {
  const openKey = (window as any).__lpSkill || "";
  return skills.map((s, i) => {
    const key = String(s.skill || s.name || i);
    const score = clampScore(s.score);
    const open = key === openKey;
    const events = Array.isArray(s.events) ? s.events : [];
    const expanded = !open ? "" : `
      <div style="margin:2px 0 12px;padding:12px 14px;background:var(--n-25);border:1px solid var(--border);border-radius:var(--r-md)">
        <div class="eyebrow" style="margin-bottom:6px">Qué lo movió</div>
        ${events.length
          ? events.map((e, k) => `<div class="row between vcenter" style="padding:7px 0;${k < events.length - 1 ? "border-bottom:1px solid var(--border)" : ""}">
              <span style="font-size:13px">${esc(e.title || "")}</span>
              <span class="faint" style="font-size:11.5px;flex:none;margin-left:12px">${esc(e.whenLabel || "")}</span>
            </div>`).join("")
          : `<p class="faint" style="font-size:12.5px">Aún sin eventos atribuidos. Tus próximas lecciones, rondas y ballots moverán esta habilidad.</p>`}
      </div>`;
    return `
    <div data-lpskill="${esc(key)}" style="cursor:pointer" title="Ver qué movió esta habilidad">
      <div class="comp-row">
        <span class="cr-name row vcenter" style="gap:6px"><span style="display:inline-flex;width:13px;height:13px;color:var(--text-3);transition:transform .15s;transform:rotate(${open ? 90 : 0}deg)">${IC.chevR}</span>${esc(s.name || s.skill || "")}</span>
        <span class="cr-bar">${C.bar(score, { cls: "navy" })}</span>
        <span class="cr-score" style="color:${score >= 85 ? "var(--ok)" : score >= 60 ? "var(--text)" : "var(--warn)"}">${score}</span>
      </div>
    </div>${expanded}`;
  }).join("");
}

function skillGraphCard(lt) {
  const skills = lt.skillGraph;
  if (!skills.length) {
    return `
    <div class="card fade-up" style="--d:1;margin-bottom:18px"><div class="empty">
      <div class="ill">${IC.target}</div>
      <h4>Tu Skill Graph se está formando</h4>
      <p>Completa lecciones y rondas adjudicadas: cada evento alimenta tus habilidades.</p>
      <button class="btn btn-primary btn-sm" onclick="go('course')">${IC.book} Ir a mis cursos</button>
    </div></div>`;
  }
  const avg = Math.round(skills.reduce((a, s) => a + clampScore(s.score), 0) / skills.length);
  return `
  <div class="card card-pad fade-up" style="--d:1;margin-bottom:18px">
    <div class="row between vcenter wrap" style="gap:10px">
      <div><div class="eyebrow" style="margin-bottom:2px">Skill Graph</div><b style="font-size:15px">Tus habilidades, con historia</b></div>
      <span class="badge sky">${avg} promedio</span>
    </div>
    <div class="row" style="gap:28px;flex-wrap:wrap;align-items:flex-start;margin-top:14px">
      <div style="flex:0 1 360px;min-width:260px">${radarSvg(skills)}</div>
      <div style="flex:1 1 300px;min-width:260px">
        <p class="faint" style="font-size:12.5px;margin-bottom:8px">Toca una habilidad para ver qué la movió.</p>
        ${skillRows(skills)}
      </div>
    </div>
  </div>`;
}

/* ================================================================
   ③ LEDGER — fila de stats (lo que has hecho, en números)
   ================================================================ */
function ledgerTiles(lt) {
  const L = lt.ledger;
  const fmt = (n) => Number(n || 0).toLocaleString("es");
  const top = [
    ["Cursos completados", fmt(L.coursesCompleted), "book"],
    ["Lecciones terminadas", fmt(L.lessonsDone), "check"],
    ["Debates competidos", fmt(L.debates), "mic"],
    ["Victorias", fmt(L.wins), "trophy"],
  ];
  const bottom = [
    ["Sesiones asistidas", fmt(L.sessionsAttended), "headset"],
    ["Torneos", fmt(L.tournaments), "flag"],
    ["Horas estudiadas", fmt(L.hoursStudied), "clock"],
  ];
  return `
  <div class="fade-up" style="--d:2;margin-bottom:18px">
    <div class="grid g-4" style="margin-bottom:14px">${top.map((t) => `<div class="tile">${C.kpi(t[0], t[1], { ic: t[2] })}</div>`).join("")}</div>
    <div class="grid g-3">${bottom.map((t) => `<div class="tile">${C.kpi(t[0], t[1], { ic: t[2] })}</div>`).join("")}</div>
  </div>`;
}

/* ================================================================
   ④ PERFORMANCE — rating + tier + mini-sparkline de la historia
   ================================================================ */
function sparklineSvg(history) {
  const vals = history.map((h) => Number(h.ratingAfter) || 0);
  if (vals.length < 2) return "";
  const W = 252, H = 60, P = 6;
  const min = Math.min(...vals), max = Math.max(...vals), span = (max - min) || 1;
  const pts = vals.map((v, i) => [
    P + (i * (W - 2 * P)) / (vals.length - 1),
    H - P - ((v - min) / span) * (H - 2 * P),
  ]);
  const line = pts.map((p) => p.map((n) => n.toFixed(1)).join(",")).join(" ");
  const area = `${P},${H - P} ${line} ${W - P},${H - P}`;
  const last = pts[pts.length - 1];
  return `
  <svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" preserveAspectRatio="none" aria-hidden="true" style="display:block">
    <polygon points="${area}" style="fill:color-mix(in srgb,var(--otr-sky) 16%, transparent)"/>
    <polyline points="${line}" fill="none" stroke="var(--otr-sky-lo)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
    <circle cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="3.2" fill="var(--otr-navy)" stroke="#fff" stroke-width="1.5"/>
  </svg>`;
}

function performanceCard(lt) {
  const p = lt.performance;
  const hist = p.history;
  const first = hist[0], lastH = hist[hist.length - 1];
  return `
  <div class="card card-pad">
    <div class="eyebrow" style="margin-bottom:2px">Performance</div>
    <b style="font-size:15px">Tu rating competitivo</b>
    <div class="row vcenter" style="gap:12px;margin-top:12px">
      <span class="brand-font tnum" style="font-size:42px;font-weight:800;line-height:1;color:var(--otr-navy)">${p.rating}</span>
      <div class="stack" style="gap:5px">
        <span class="badge sky"><span class="dot"></span>${esc(p.tier)}</span>
        <span class="faint" style="font-size:11.5px">±${p.rd} RD ${p.provisional ? "· provisional" : "· estable"}</span>
      </div>
    </div>
    ${hist.length >= 2
      ? `<div style="margin-top:14px">${sparklineSvg(hist)}
         <div class="row between" style="margin-top:4px">
           <span class="faint" style="font-size:11px">${esc((first && first.label) || "")}</span>
           <span class="faint" style="font-size:11px">${esc((lastH && lastH.label) || "")}${lastH && lastH.tierAfter ? ` · ${esc(lastH.tierAfter)}` : ""}</span>
         </div></div>`
      : `<p class="faint" style="font-size:12.5px;margin-top:12px">Tu curva de rating aparecerá aquí cuando acumules rondas adjudicadas.</p>`}
    <button class="btn btn-soft btn-sm btn-block" style="margin-top:14px" onclick="go('debate')">Ver Debate Hub ${IC.arrowR}</button>
  </div>`;
}

/* ================================================================
   ⑤ CREDENCIALES — sellos verificables
   ================================================================ */
function credentialsCard(lt) {
  const creds = lt.credentials;
  return `
  <div class="card card-pad">
    <div class="eyebrow" style="margin-bottom:2px">Credenciales</div>
    <b style="font-size:15px">Certificaciones verificables</b>
    <div class="stack" style="gap:10px;margin-top:12px">
      ${creds.length
        ? creds.map((c) => `
          <div class="row vcenter" style="gap:12px;border:1px solid var(--border);border-radius:var(--r-md);padding:11px 13px;background:linear-gradient(120deg,var(--otr-offwhite),#fff)">
            <span style="flex:none;width:38px;height:38px;border-radius:50%;background:var(--otr-navy);color:#fff;display:inline-flex;align-items:center;justify-content:center"><span style="display:inline-flex;width:18px;height:18px">${IC.award}</span></span>
            <div style="flex:1;min-width:0">
              <b style="font-size:13px;line-height:1.3;display:block">${esc(c.title || "Certificado")}</b>
              ${c.issuedLabel ? `<span class="faint" style="font-size:11.5px">Emitido ${esc(c.issuedLabel)}</span>` : ""}
            </div>
          </div>`).join("")
        : `<p class="faint" style="font-size:12.5px">Cuando completes un programa, tu certificación aparecerá aquí — prueba verificable de lo que sabes hacer.</p>`}
    </div>
  </div>`;
}

/* ================================================================
   ⑥ JOURNEY — timeline vertical agrupado por mes (la historia emocional)
   ================================================================ */
const JOURNEY_ICON = {
  course: "book", lesson: "book", debate: "mic", win: "trophy", tournament: "trophy",
  rating: "chart", tier: "levels", certificate: "award", credential: "award",
  session: "headset", coaching: "headset", milestone: "flag", skill: "target",
  badge: "medal", start: "flame", hours: "clock",
};
function journeyCard(lt) {
  const journey = lt.journey;
  if (!journey.length) {
    return `
    <div class="card"><div class="empty">
      <div class="ill">${IC.flag}</div>
      <h4>Tu historia empieza hoy</h4>
      <p>Cada lección, debate y logro quedará registrado aquí — la línea de tiempo que algún día vas a querer compartir.</p>
      <button class="btn btn-primary btn-sm" onclick="go('course')">${IC.play} Empezar a aprender</button>
    </div></div>`;
  }
  // Agrupa cronológicamente por monthLabel (conservando el orden recibido).
  const groups = [];
  journey.forEach((ev) => {
    const m = ev.monthLabel || "";
    const last = groups[groups.length - 1];
    if (last && last.month === m) last.items.push(ev);
    else groups.push({ month: m, items: [ev] });
  });
  return `
  <div class="card card-pad">
    <div class="row between vcenter wrap" style="gap:10px">
      <div><div class="eyebrow" style="margin-bottom:2px">Journey</div><b style="font-size:15px">Tu línea de tiempo</b></div>
      <span class="badge">${journey.length} hito${journey.length === 1 ? "" : "s"}</span>
    </div>
    <div class="stack" style="gap:4px;margin-top:16px">
      ${groups.map((g) => `
        ${g.month ? `<div class="row vcenter" style="gap:8px;margin:6px 0 10px"><span class="badge sky" style="font-weight:700">${esc(g.month)}</span><span style="flex:1;height:1px;background:var(--border)"></span></div>` : ""}
        <div class="timeline" style="margin-left:6px">
          ${g.items.map((ev) => {
            const ic = IC[JOURNEY_ICON[String(ev.type || "").toLowerCase()] || "star"];
            return `
            <div class="tl-item">
              <div class="row between" style="gap:10px">
                <div style="min-width:0">
                  <b style="font-size:13.5px;line-height:1.35"><span style="display:inline-flex;width:13px;height:13px;color:var(--otr-sky-lo);vertical-align:-2px;margin-right:5px">${ic}</span>${esc(ev.title || "")}</b>
                  ${ev.detail ? `<div class="muted" style="font-size:12.5px;margin-top:2px">${esc(ev.detail)}</div>` : ""}
                </div>
                ${ev.whenLabel ? `<span class="faint" style="font-size:11.5px;flex:none">${esc(ev.whenLabel)}</span>` : ""}
              </div>
            </div>`;
          }).join("")}
        </div>`).join("")}
    </div>
  </div>`;
}

/* ================================================================
   ⑦ PERFIL PÚBLICO — toggle con consentimiento (privacy-default OFF)
   ================================================================ */
function publicProfileCard(lt) {
  const pp = lt.publicProfile;
  const absUrl = pp.url || (pp.slug ? `/p/${pp.slug}` : "");
  const toggle = `
    <button id="pp-switch" role="switch" aria-checked="${pp.enabled ? "true" : "false"}" aria-label="Perfil público"
      style="flex:none;width:46px;height:26px;padding:0;border-radius:999px;border:1px solid var(--border-strong);background:${pp.enabled ? "var(--otr-sky-lo)" : "var(--n-150)"};position:relative;cursor:pointer;transition:background .18s">
      <span style="position:absolute;top:2.5px;left:${pp.enabled ? "23px" : "3px"};width:19px;height:19px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(12,12,12,.28);transition:left .18s"></span>
    </button>`;
  return `
  <div class="card card-pad">
    <div class="eyebrow" style="margin-bottom:2px">Comparte tu historia</div>
    <b style="font-size:15px">Perfil público</b>
    <p class="muted" style="font-size:12.5px;margin-top:6px">Tu Skill Graph, credenciales y journey en una sola página — la prueba pública de tu nivel.</p>
    ${!pp.canToggle
      ? `<div class="alert info" style="margin-top:12px"><span class="ai">${IC.lock}</span><div><div class="at">Requiere consentimiento</div>${esc(pp.minorNote || "Por tu seguridad, tu familia debe habilitar el perfil público desde su portal.")}</div></div>`
      : `
      <div class="row between vcenter" style="gap:12px;margin-top:14px">
        <span style="font-size:13px;font-weight:600">${pp.enabled ? "Visible con el enlace" : "Desactivado (privado)"}</span>
        ${toggle}
      </div>
      ${pp.enabled && absUrl ? `
        <div style="margin-top:12px;padding:9px 12px;border:1px solid var(--border);border-radius:var(--r-md);background:var(--n-25);font-family:var(--font-mono);font-size:11.5px;color:var(--text-2);word-break:break-all">${esc(absUrl)}</div>
        <div class="row wrap" style="gap:8px;margin-top:10px">
          <button class="btn btn-soft btn-sm" id="pp-copy">${IC.doc} Copiar enlace</button>
          <a class="btn btn-ghost btn-sm" href="${esc(absUrl)}" target="_blank" rel="noopener">${IC.eye} Ver perfil público</a>
        </div>` : ""}
      <p class="faint" style="font-size:11.5px;margin-top:12px">Privado por defecto. Tú decides cuándo y con quién compartirlo.</p>`}
  </div>`;
}

/* ================================================================
   PANTALLA · S.lifetimeProfile — "Mi trayectoria"
   ================================================================ */
S.lifetimeProfile = {
  render(state) {
    const lt = getLifetime();
    return `
      ${identityHero(lt)}
      ${skillGraphCard(lt)}
      ${ledgerTiles(lt)}
      <div class="split fade-up" style="--d:3">
        <div class="stack" style="gap:16px">${journeyCard(lt)}</div>
        <div class="stack" style="gap:16px">
          ${performanceCard(lt)}
          ${credentialsCard(lt)}
          ${publicProfileCard(lt)}
        </div>
      </div>`;
  },

  mount(root, state) {
    // Repinta solo esta pantalla dentro de .page, conservando el shell.
    const repaint = () => {
      const page = root.querySelector(".page");
      if (!page) return;
      page.innerHTML = S.lifetimeProfile.render(state);
      S.lifetimeProfile.mount(root, state);
    };

    // Expandir/colapsar atribución de un skill (window.__lpSkill = clave abierta).
    root.querySelectorAll("[data-lpskill]").forEach((el) =>
      el.addEventListener("click", () => {
        const key = el.getAttribute("data-lpskill");
        (window as any).__lpSkill = (window as any).__lpSkill === key ? "" : key;
        repaint();
      })
    );

    // Toggle de perfil público → POST /api/public-profile {enabled}.
    const sw = root.querySelector("#pp-switch");
    if (sw) {
      sw.addEventListener("click", async () => {
        const lt = getLifetime();
        const next = !lt.publicProfile.enabled;
        sw.disabled = true;
        try {
          const resp = await (window as any).api("/api/public-profile", { enabled: next });
          DB.lifetime = DB.lifetime || {};
          DB.lifetime.publicProfile = { ...(DB.lifetime.publicProfile || {}), enabled: next };
          // Si el server devuelve slug/url frescos, consérvalos.
          if (resp && resp.publicProfile) DB.lifetime.publicProfile = { ...DB.lifetime.publicProfile, ...resp.publicProfile };
          (window as any).toast?.(next ? "Tu perfil público está activo" : "Perfil público desactivado", "ok");
          repaint();
        } catch (err) {
          (window as any).toast?.((err && err.message) || "No se pudo actualizar", "danger");
          sw.disabled = false;
        }
      });
    }

    // Copiar enlace del perfil público.
    const copyBtn = root.querySelector("#pp-copy");
    if (copyBtn) {
      copyBtn.addEventListener("click", async () => {
        const pp = getLifetime().publicProfile;
        const raw = pp.url || (pp.slug ? `/p/${pp.slug}` : "");
        const full = /^https?:\/\//.test(raw) ? raw : `${location.origin}${raw}`;
        try {
          await navigator.clipboard.writeText(full);
          (window as any).toast?.("Enlace copiado", "ok");
        } catch (e) {
          (window as any).toast?.("No se pudo copiar el enlace", "danger");
        }
      });
    }
  },
};

/* ================================================================
   PANTALLA · S.membership — "Membresía" (PRD §13, pago SIMULADO)
   "Parents pay for proof; students pay for status & speed":
   se venden resultados (evidencia, velocidad, estatus), no features.
   ================================================================ */
const TIER_LABEL = { free: "Free", pro: "Pro", elite: "Elite" };

function featureLi(text, opts = {}) {
  const color = opts.muted ? "var(--text-3)" : "var(--ok)";
  return `<li class="row" style="gap:9px;padding:6px 0;font-size:13px;align-items:flex-start${opts.muted ? ";color:var(--text-2)" : ""}">
    <span style="flex:none;display:inline-flex;width:15px;height:15px;color:${color};margin-top:1px">${IC.check}</span><span>${text}</span></li>`;
}

function membershipHero(m) {
  const label = TIER_LABEL[m.tier] || "Free";
  return `
  <div class="hello-card fade-up" style="--d:0;margin-bottom:20px">
    <div class="h-row">
      <div style="max-width:560px">
        <p class="eyebrow" style="color:var(--otr-sky-hi)">Membresía</p>
        <h2 class="brand-font" style="margin-top:2px">Tu plan: OTR ${esc(label)}</h2>
        <p style="color:rgba(234,242,251,.78);font-size:13.5px;margin-top:10px">Tu plan decide cuánto entrenas y cuánto de tu progreso puedes mostrar.</p>
        ${m.sinceLabel ? `<p style="color:rgba(234,242,251,.6);font-size:12px;margin-top:6px">En este plan ${esc(String(m.sinceLabel).charAt(0).toLowerCase() + String(m.sinceLabel).slice(1))}</p>` : ""}
      </div>
      <span class="badge" style="background:color-mix(in srgb,var(--otr-sky) 26%, transparent);color:#fff;border:1px solid rgba(255,255,255,.22);align-self:flex-start"><span class="dot" style="background:var(--otr-sky-hi)"></span>OTR ${esc(label)}</span>
    </div>
  </div>`;
}

function tierCards(m) {
  const cur = m.tier;
  const btn = (tier, label, cls) => cur === tier
    ? `<button class="btn ${cls} btn-block" disabled style="margin-top:auto;opacity:.65;cursor:default">${IC.check} Tu plan actual</button>`
    : `<button class="btn ${cls} btn-block" data-mem="${tier}" style="margin-top:auto">${label}</button>`;

  const freeCard = `
  <div class="tile fade-up" style="--d:1;display:flex;flex-direction:column">
    <div class="eyebrow" style="margin-bottom:2px">Free</div>
    <b style="font-size:15px">Empieza gratis</b>
    <div class="row vcenter" style="gap:6px;margin-top:10px"><span class="brand-font tnum" style="font-size:30px;font-weight:800;color:var(--otr-navy)">US$0</span><span class="faint" style="font-size:12px">para siempre</span></div>
    <ul class="stack" style="list-style:none;margin:12px 0 16px;padding:0">
      ${featureLi("Perfil + Skill Graph básico")}
      ${featureLi("Práctica limitada")}
      ${featureLi("Marketplace a tarifa estándar")}
    </ul>
    ${btn("free", "Cambiar a Free", "btn-ghost")}
  </div>`;

  const proCard = `
  <div class="fade-up" style="--d:2;display:flex;flex-direction:column;background:linear-gradient(150deg,var(--otr-navy),var(--otr-ink));color:#fff;border-radius:var(--r-lg);padding:18px;box-shadow:var(--sh-3);position:relative">
    <span class="badge" style="position:absolute;top:14px;right:14px;background:var(--otr-sky);color:var(--otr-navy);font-weight:800">Recomendado</span>
    <div class="eyebrow" style="color:var(--otr-sky-hi);margin-bottom:2px">Pro</div>
    <b style="font-size:15px;color:#fff">El plan de los que compiten</b>
    <div class="row vcenter wrap" style="gap:8px;margin-top:10px">
      <span class="brand-font tnum" style="font-size:30px;font-weight:800;color:#fff">${esc(m.prices.proMonthly)}</span><span style="font-size:12px;color:rgba(234,242,251,.7)">/mes</span>
      <span style="font-size:12px;color:rgba(234,242,251,.7)">· o ${esc(m.prices.proAnnual)}/año (2 meses gratis)</span>
    </div>
    <ul class="stack" style="list-style:none;margin:12px 0 16px;padding:0">
      ${featureLi("Analytics completo: ve exactamente dónde ganar puntos")}
      ${featureLi("Práctica y drills ilimitados — entrena sin techo")}
      ${featureLi("Protección de racha: un mal día no borra tu constancia")}
      ${featureLi("Recomendaciones prioritarias de tu siguiente paso")}
      ${featureLi("Descuentos en certificaciones y coaching")}
    </ul>
    ${m.tier === "pro"
      ? `<button class="btn btn-block" disabled style="margin-top:auto;background:rgba(255,255,255,.16);color:#fff;border:1px solid rgba(255,255,255,.25);cursor:default">${IC.check} Tu plan actual</button>`
      : `<button class="btn btn-block" data-mem="pro" style="margin-top:auto;background:#fff;color:var(--otr-navy);font-weight:700">${IC.flame} Pasar a Pro</button>`}
  </div>`;

  const eliteCard = `
  <div class="tile fade-up" style="--d:3;display:flex;flex-direction:column;opacity:.72">
    <div class="row between vcenter"><div class="eyebrow" style="margin-bottom:2px">Elite</div><span class="badge sky"><span class="dot"></span>Próximamente</span></div>
    <b style="font-size:15px">Para quienes van por todo</b>
    <div class="row vcenter" style="gap:6px;margin-top:10px"><span class="brand-font" style="font-size:22px;font-weight:800;color:var(--otr-navy)">Muy pronto</span></div>
    <ul class="stack" style="list-style:none;margin:12px 0 16px;padding:0">
      ${featureLi("Todo Pro", { muted: true })}
      ${featureLi("Créditos de coaching incluidos", { muted: true })}
      ${featureLi("Acceso temprano a torneos", { muted: true })}
      ${featureLi("Contenido premium", { muted: true })}
    </ul>
    <button class="btn btn-soft btn-block" disabled style="margin-top:auto;cursor:default">${IC.lock} Próximamente</button>
  </div>`;

  return `<div class="grid g-3" style="align-items:stretch">${freeCard}${proCard}${eliteCard}</div>`;
}

/* Modal de confirmación local (window.modal del shell no soporta callback). */
function confirmModal(title, body, okLabel) {
  return new Promise((resolve) => {
    const scrim = document.createElement("div");
    scrim.className = "modal-scrim";
    scrim.innerHTML = `<div class="modal" role="dialog" style="max-width:440px">
      <div class="modal-head"><h3>${esc(title)}</h3></div>
      <div class="modal-body"><p style="font-size:13.5px;line-height:1.55">${esc(body)}</p></div>
      <div class="modal-foot"><button class="btn btn-ghost" data-x>Cancelar</button><button class="btn btn-primary" data-ok>${esc(okLabel || "Confirmar")}</button></div>
    </div>`;
    document.body.appendChild(scrim);
    const done = (v) => { scrim.remove(); resolve(v); };
    scrim.addEventListener("click", (e) => { if (e.target === scrim || e.target.closest("[data-x]")) done(false); });
    scrim.querySelector("[data-ok]")?.addEventListener("click", () => done(true));
  });
}

S.membership = {
  render(state) {
    const m = getMembership();
    return `
      ${membershipHero(m)}
      ${tierCards(m)}
      <div class="alert info fade-up" style="--d:4;margin-top:20px">
        <span class="ai">${IC.lock}</span>
        <div><div class="at">Pago simulado en esta fase</div>La facturación real llega con el lanzamiento. Mientras tanto puedes cambiar de plan libremente para explorar lo que cada uno desbloquea.</div>
      </div>`;
  },

  mount(root, state) {
    const repaint = () => {
      const page = root.querySelector(".page");
      if (!page) return;
      page.innerHTML = S.membership.render(state);
      S.membership.mount(root, state);
    };

    root.querySelectorAll("[data-mem]").forEach((btn) =>
      btn.addEventListener("click", async () => {
        const target = btn.getAttribute("data-mem");
        // Bajar a Free pide confirmación: se pierden los beneficios Pro.
        if (target === "free") {
          const okGo = await confirmModal(
            "¿Cambiar a Free?",
            "Perderás analytics completo, práctica ilimitada y la protección de tu racha. Tu progreso y tu historia se conservan intactos.",
            "Sí, cambiar a Free"
          );
          if (!okGo) return;
        }
        btn.disabled = true;
        btn.textContent = "Actualizando…";
        try {
          const resp = await (window as any).api("/api/membership", { tier: target });
          DB.membership = DB.membership || {};
          DB.membership.tier = target;
          if (resp && resp.membership) DB.membership = { ...DB.membership, ...resp.membership };
          (window as any).toast?.(target === "pro" ? "Bienvenido a OTR Pro" : "Tu plan cambió a Free", "ok");
          repaint();
        } catch (err) {
          (window as any).toast?.((err && err.message) || "No se pudo cambiar el plan", "danger");
          btn.disabled = false;
          btn.textContent = target === "pro" ? "Pasar a Pro" : "Cambiar a Free";
        }
      })
    );
  },
};
