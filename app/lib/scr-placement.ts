// @ts-nocheck
// OTR Hub · Placement de bienvenida (PRD §2.2 Journey A + §4.3).
// Auto-evaluación de 3 minutos para el usuario recién registrado: 6 sliders
// (uno por dimensión) que fijan SU punto de partida en el Skill Graph.
// NO es un examen — texto motivador, no hay respuestas incorrectas.
// Al enviar: POST /api/placement {scores} → toast + go('dashboard') (que ya
// mostrará el rank de debut y el radar poblado).
import { IC } from "./icons";
import { esc } from "./esc";
import { t } from "./i18n";

export const S = {};

// Las 6 dimensiones canónicas, con una descripción corta de qué mide cada una.
// El key es identificador canónico (data-skill, matching con el Skill Graph): NO se
// traduce. La descripción sale del idioma activo vía t(descKey) al renderizar.
const DIMS = [
  { key: "Confianza",  descKey: "placement.descConfianza" },
  { key: "Estructura", descKey: "placement.descEstructura" },
  { key: "Evidencia",  descKey: "placement.descEvidencia" },
  { key: "Refutación", descKey: "placement.descRefutacion" },
  { key: "Cross-ex",   descKey: "placement.descCrossEx" },
  { key: "Delivery",   descKey: "placement.descDelivery" },
];

S.placement = {
  render() {
    const firstName = esc((window.DB?.me?.name || "").split(" ")[0] || "");

    const hero = `
      <div class="hello-card fade-up" style="--d:0;margin-bottom:18px">
        <div class="h-row">
          <div style="max-width:600px">
            <h1 class="sr-only">${t("placement.srHeading")}</h1><p class="eyebrow" style="color:var(--otr-sky-hi)">${t("placement.welcome")}${firstName ? ", " + firstName : ""}</p>
            <h2 class="brand-font" style="margin-top:2px">${t("placement.title")}</h2>
            <p style="color:rgba(234,242,251,.82);font-size:14.5px;margin-top:12px;line-height:1.55">
              ${t("placement.intro")}
            </p>
            <span class="badge" style="margin-top:14px;display:inline-flex;height:30px;padding:0 13px;gap:7px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.16);color:#fff;font-size:13px;font-weight:600">${IC.target} ${t("placement.badge")}</span>
          </div>
        </div>
      </div>`;

    const sliders = DIMS.map((d, i) => `
      <div class="card card-pad fade-up" style="--d:${i + 1};margin-bottom:12px">
        <div class="row between vcenter" style="gap:12px">
          <div style="flex:1;min-width:0">
            <label for="pl-${esc(d.key)}" style="display:block"><b style="font-size:14.5px">${esc(d.key)}</b></label>
            <p class="faint" style="font-size:12.5px;margin-top:3px;line-height:1.45">${t(d.descKey)}</p>
          </div>
          <output class="badge pl-out" data-out="${esc(d.key)}" style="min-width:46px;text-align:center;font-variant-numeric:tabular-nums">—</output>
        </div>
        <input
          id="pl-${esc(d.key)}"
          class="pl-range"
          type="range"
          min="0" max="100" step="1" value="50"
          data-skill="${esc(d.key)}"
          aria-label="${t("placement.sliderAria").replace("{skill}", esc(d.key))}"
          aria-valuemin="0" aria-valuemax="100" aria-valuenow="50"
          style="width:100%;margin-top:14px;accent-color:var(--otr-sky)"
        />
      </div>`).join("");

    return `
      <div class="page-stack" style="max-width:720px;margin:0 auto">
        ${hero}
        ${sliders}
        <div class="fade-up" style="--d:7;margin:10px 0 2px">
          <div class="row between vcenter" style="font-size:12.5px;color:var(--text-2);margin-bottom:6px">
            <span>${t("placement.placed").replace("{count}", '<b id="pl-count" style="color:var(--text)">0</b>').replace("{total}", String(DIMS.length))}</span>
            <span class="faint">${t("placement.moveBars")}</span>
          </div>
          <div style="height:8px;background:var(--n-150);border-radius:100px;overflow:hidden" role="progressbar" aria-valuemin="0" aria-valuemax="${DIMS.length}" aria-label="${t("placement.progressAria")}">
            <div id="pl-progress-fill" style="height:100%;width:0;background:var(--otr-green);transition:width .25s var(--ease)"></div>
          </div>
        </div>
        <div class="row between vcenter fade-up" style="--d:8;margin-top:6px;gap:12px;flex-wrap:wrap">
          <p class="faint" style="font-size:12.5px;margin:0">${t("placement.coachNote")}</p>
          <div class="row vcenter" style="gap:8px;flex:none">
            <button class="btn btn-quiet btn-sm" id="pl-skip">${t("placement.skip")}</button>
            <button class="btn btn-primary" id="pl-submit">${t("placement.submit")} ${IC.arrowR}</button>
          </div>
        </div>
      </div>`;
  },

  mount(root) {
    if (!root) return;

    const ranges = Array.from(root.querySelectorAll(".pl-range"));
    const btn = root.querySelector("#pl-submit");
    const fill = root.querySelector("#pl-progress-fill");
    const countEl = root.querySelector("#pl-count");
    const total = ranges.length || 6;
    const touchedCount = () => ranges.filter((r) => r.getAttribute("data-touched") === "1").length;

    // Refleja el progreso: cuántas barras YA fueron ubicadas (tocadas) sobre el total.
    const syncProgress = () => {
      const n = touchedCount();
      if (countEl) countEl.textContent = String(n);
      if (fill) fill.style.width = `${Math.round((n / total) * 100)}%`;
      if (btn) btn.disabled = n < total;
    };

    // Reflejo en vivo del valor de UNA barra ya tocada en su <output> + aria.
    const syncOne = (range) => {
      const skill = range.getAttribute("data-skill");
      const out = root.querySelector(`[data-out="${CSS && CSS.escape ? CSS.escape(skill) : skill}"]`);
      if (out) { out.textContent = String(range.value); out.classList.add("sky"); }
      range.setAttribute("aria-valuenow", String(range.value));
      range.setAttribute("aria-label", t("placement.sliderAriaSet").replace("{skill}", skill).replace("{value}", String(range.value)));
      range.style.opacity = "1";
    };
    ranges.forEach((r) => {
      r.addEventListener("input", () => {
        if (r.getAttribute("data-touched") !== "1") { r.setAttribute("data-touched", "1"); syncProgress(); }
        syncOne(r);
      });
    });
    syncProgress();

    // Lee los valores actuales de las 6 barras (default 50 = neutral en las no tocadas).
    const readScores = () => {
      const scores = {};
      ranges.forEach((r) => {
        const skill = r.getAttribute("data-skill");
        scores[skill] = Math.max(0, Math.min(100, Number(r.value) || 0));
      });
      return scores;
    };
    // Envío compartido por el CTA principal y por "Saltar por ahora".
    const send = async (triggerBtn) => {
      const scores = readScores();
      if (triggerBtn) { triggerBtn.dataset.prev = triggerBtn.innerHTML; triggerBtn.disabled = true; triggerBtn.textContent = t("placement.saving"); }
      if (btn) btn.disabled = true;
      try {
        await window.api("/api/placement", { scores });
        window.toast?.(t("placement.savedOk"), "ok");
        // Recarga real (no go): el placement acaba de escribir StudentSkill + placedAt;
        // el dashboard debe cargar FRESCO (un go() repintaría con el DB cacheado de antes).
        setTimeout(() => { window.location.href = "/aula"; }, 400);
      } catch (e) {
        window.toast?.(e?.message || t("placement.saveError"), "danger");
        if (triggerBtn) { triggerBtn.disabled = false; triggerBtn.innerHTML = triggerBtn.dataset.prev || triggerBtn.innerHTML; }
        if (btn) btn.disabled = touchedCount() < total;
      }
    };
    btn?.addEventListener("click", () => {
      // Anti-inercia: el CTA PRINCIPAL sí exige ubicar las 6 barras (auto-evaluación real).
      if (touchedCount() < total) { window.toast?.(t("placement.missing").replace("{n}", String(total - touchedCount())), "warn"); return; }
      send(btn);
    });
    // [ONBOARDING · audit] "Saltar por ahora": envía los valores por defecto (50 = neutral
    // válido) y entra al aula SIN muro. El placement deja de ser una pared en el pico de
    // abandono (primer contacto); el alumno puede refinar sus skills después.
    root.querySelector("#pl-skip")?.addEventListener("click", (e) => send(e.currentTarget));
  },
};
