// @ts-nocheck
// OTR Hub · Placement de bienvenida (PRD §2.2 Journey A + §4.3).
// Auto-evaluación de 3 minutos para el usuario recién registrado: 6 sliders
// (uno por dimensión) que fijan SU punto de partida en el Skill Graph.
// NO es un examen — texto motivador, no hay respuestas incorrectas.
// Al enviar: POST /api/placement {scores} → toast + go('dashboard') (que ya
// mostrará el rank de debut y el radar poblado).
import { IC } from "./icons";
import { esc } from "./esc";

export const S = {};

// Las 6 dimensiones canónicas, con una descripción corta de qué mide cada una.
const DIMS = [
  { key: "Confianza",  desc: "Qué tan firme te plantas al hablar frente al público o al juez." },
  { key: "Estructura", desc: "Tu capacidad de ordenar ideas: claim, warrant e impacto claros." },
  { key: "Evidencia",  desc: "Cómo respaldas tus argumentos con datos, ejemplos y fuentes." },
  { key: "Refutación", desc: "Tu habilidad para responder y desmontar los argumentos del rival." },
  { key: "Cross-ex",   desc: "Cómo preguntas con intención y respondes sin ceder terreno en el cruzado." },
  { key: "Delivery",   desc: "Voz, ritmo y presencia: cómo llega tu discurso a la sala." },
];

S.placement = {
  render() {
    const firstName = esc((window.DB?.me?.name || "").split(" ")[0] || "");

    const hero = `
      <div class="hello-card fade-up" style="--d:0;margin-bottom:18px">
        <div class="h-row">
          <div style="max-width:600px">
            <p class="eyebrow" style="color:var(--otr-sky-hi)">Bienvenido a OTR${firstName ? ", " + firstName : ""}</p>
            <h2 class="brand-font" style="margin-top:2px">Ubiquémonos en 3 minutos</h2>
            <p style="color:rgba(234,242,251,.82);font-size:14.5px;margin-top:12px;line-height:1.55">
              No hay respuestas incorrectas — esto fija <b>TU</b> punto de partida. Mueve cada barra
              hasta donde estás hoy en cada habilidad. Desde ahí, solo queda subir.
            </p>
            <span class="badge" style="margin-top:14px;display:inline-flex;height:30px;padding:0 13px;gap:7px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.16);color:#fff;font-size:13px;font-weight:600">${IC.target} Evaluación inicial · 6 habilidades</span>
          </div>
        </div>
      </div>`;

    const sliders = DIMS.map((d, i) => `
      <div class="card card-pad fade-up" style="--d:${i + 1};margin-bottom:12px">
        <div class="row between vcenter" style="gap:12px">
          <div style="flex:1;min-width:0">
            <label for="pl-${esc(d.key)}" style="display:block"><b style="font-size:14.5px">${esc(d.key)}</b></label>
            <p class="faint" style="font-size:12.5px;margin-top:3px;line-height:1.45">${esc(d.desc)}</p>
          </div>
          <output class="badge sky pl-out" data-out="${esc(d.key)}" style="min-width:46px;text-align:center;font-variant-numeric:tabular-nums">50</output>
        </div>
        <input
          id="pl-${esc(d.key)}"
          class="pl-range"
          type="range"
          min="0" max="100" step="1" value="50"
          data-skill="${esc(d.key)}"
          aria-label="${esc(d.key)} — del 0 al 100"
          aria-valuemin="0" aria-valuemax="100" aria-valuenow="50"
          style="width:100%;margin-top:14px;accent-color:var(--otr-sky)"
        />
      </div>`).join("");

    return `
      <div class="page-stack" style="max-width:720px;margin:0 auto">
        ${hero}
        ${sliders}
        <div class="row between vcenter fade-up" style="--d:7;margin-top:6px;gap:12px;flex-wrap:wrap">
          <p class="faint" style="font-size:12.5px;margin:0">Podrás afinar todo esto más adelante con tu coach.</p>
          <button class="btn btn-primary" id="pl-submit">Fijar mi punto de partida ${IC.arrowR}</button>
        </div>
      </div>`;
  },

  mount(root) {
    if (!root) return;

    // Reflejo en vivo del valor de cada slider en su <output> + aria-valuenow.
    const syncOne = (range) => {
      const skill = range.getAttribute("data-skill");
      const out = root.querySelector(`[data-out="${CSS && CSS.escape ? CSS.escape(skill) : skill}"]`);
      if (out) out.textContent = String(range.value);
      range.setAttribute("aria-valuenow", String(range.value));
    };
    const ranges = Array.from(root.querySelectorAll(".pl-range"));
    ranges.forEach((r) => {
      r.addEventListener("input", () => syncOne(r));
      syncOne(r);
    });

    const btn = root.querySelector("#pl-submit");
    btn?.addEventListener("click", async () => {
      const scores = {};
      ranges.forEach((r) => {
        const skill = r.getAttribute("data-skill");
        scores[skill] = Math.max(0, Math.min(100, Number(r.value) || 0));
      });
      btn.disabled = true;
      const prev = btn.innerHTML;
      btn.textContent = "Guardando…";
      try {
        await window.api("/api/placement", { scores });
        window.toast?.("Listo — este es tu punto de partida", "ok");
        // Recarga real (no go): el placement acaba de escribir StudentSkill +
        // placedAt; el dashboard debe cargar FRESCO para mostrar el resultado
        // (un go() repintaría con el DB cacheado de antes del placement).
        setTimeout(() => { window.location.href = "/aula"; }, 400);
      } catch (e) {
        window.toast?.(e?.message || "No se pudo guardar tu evaluación", "danger");
        btn.disabled = false;
        btn.innerHTML = prev;
      }
    });
  },
};
