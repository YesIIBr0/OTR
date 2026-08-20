// @ts-nocheck
/* OTR · Admin → AJUSTES DE PLATAFORMA. Pantalla role-scoped ADMIN.

   Existe porque el enlace del grupo de WhatsApp del paso 3 de la admisión vivía SOLO en una
   variable de entorno: cambiarlo obligaba a entrar por SSH al servidor y redesplegar. Es
   decir, el sitio no se podía administrar sin un desarrollador.

   No lee DB.*: en mount pide GET /api/admin/settings y pinta cada ajuste con su valor
   EFECTIVO y de DÓNDE sale (definido aquí / viene del servidor / sin definir). Esa
   distinción importa: el admin tiene que poder ver si lo que hay en vigor lo puso él o
   venía del despliegue, antes de cambiarlo.

   Patrón de la casa: render(state)->string + mount(root,state); C.*, IC.*, sin emoji.
   Cliente vía globales de Aula.tsx: api(url,body,method), toast(). */
import { C } from "./components";
import { esc } from "./esc";
import { IC } from "./icons";
import { t, registerDict } from "./i18n";
import { dict as d_aset } from "./i18n-keys/aset";
registerDict(d_aset);

export const S = {};

function st() {
  const w = window;
  if (!w.__adminSettings) w.__adminSettings = { loaded: false, loading: false, error: false, rows: [], saving: "" };
  return w.__adminSettings;
}

/** Chip de procedencia. Es lo que evita el malentendido de "lo cambié y no pasó nada". */
function sourceChip(s) {
  if (s.source === "db") return C.chip(t("aset.srcDb"), "paper");
  if (s.source === "env") return C.chip(t("aset.srcEnv"), "outline");
  return C.chip(t("aset.srcUnset"), "outline");
}

function fieldRow(s) {
  const saving = st().saving === s.key;
  const id = `aset-${s.key.replace(/[^a-zA-Z0-9]/g, "-")}`;
  return `<div class="aset-row" data-aset-row="${esc(s.key)}">
    <div class="aset-head">
      <label class="label" for="${id}">${esc(s.label)}</label>
      ${sourceChip(s)}
    </div>
    <p class="hint aset-help">${esc(s.help)}</p>
    ${s.source === "env" ? `<p class="hint">${t("aset.srcEnvHelp").replace("{v}", esc(s.envName))}</p>` : ""}
    <div class="aset-ctl">
      <input class="input" id="${id}" type="url" inputmode="url" value="${esc(s.value || "")}"
        placeholder="https://…" data-aset-input="${esc(s.key)}" ${saving ? "disabled" : ""} />
      <button type="button" class="btn btn-accent" data-aset-save="${esc(s.key)}" ${saving ? "disabled" : ""}>
        ${saving ? t("aset.saving") : t("aset.save")}
      </button>
    </div>
    <p class="hint">${t("aset.emptyHint")}</p>
    ${s.updatedByName ? `<p class="hint aset-by">${t("aset.by").replace("{n}", esc(s.updatedByName)).replace("{d}", esc((s.updatedAt || "").slice(0, 10)))}</p>` : ""}
    <p class="adm-err" data-aset-err="${esc(s.key)}" hidden></p>
  </div>`;
}

function body() {
  const s = st();
  if (s.loading && !s.loaded) return `<p class="adm-loading" role="status">${t("aset.loading")}</p>`;
  if (s.error) return `<div class="alert danger"><div><div class="at">${t("aset.errLoad")}</div></div>
    <button type="button" class="btn btn-outline btn--sm" id="aset-retry">${t("aset.retry")}</button></div>`;
  return `<div class="aset-list">${(s.rows || []).map(fieldRow).join("")}</div>`;
}

S.adminSettings = {
  render() {
    return `
    <div class="page-head page-head--rule fade-up"><div>
      <h1 class="ph-title">${t("aset.title")}</h1>
      <div class="page-sub">${t("aset.subtitle")}</div>
    </div></div>
    <div class="fade-up" style="--d:1" id="aset-body">${body()}</div>`;
  },

  mount(root) {
    const w = window;
    const s = st();

    const repaint = () => {
      const page = root.querySelector(".page");
      if (!page) return;
      page.innerHTML = S.adminSettings.render();
      S.adminSettings.mount(root);
    };

    root.querySelector("#aset-retry")?.addEventListener("click", () => {
      s.loaded = false; s.error = false; repaint();
    });

    root.querySelectorAll("[data-aset-save]").forEach((b) => b.addEventListener("click", async () => {
      const key = b.getAttribute("data-aset-save");
      const input = root.querySelector(`[data-aset-input="${key}"]`);
      const err = root.querySelector(`[data-aset-err="${key}"]`);
      const value = String(input?.value || "").trim();
      if (err) { err.hidden = true; err.textContent = ""; }
      s.saving = key; repaint();
      try {
        await w.api("/api/admin/settings", { key, value }, "PATCH");
        s.saving = ""; s.loaded = false;          // se recarga para ver la procedencia real
        w.toast?.(t("aset.saved"), "ok");
        repaint();
      } catch (e) {
        s.saving = ""; repaint();
        const el = root.querySelector(`[data-aset-err="${key}"]`);
        if (el) { el.hidden = false; el.textContent = (e && e.message) || t("aset.errLoad"); }
      }
    }));

    if (s.loaded || s.loading) return;
    s.loading = true;
    w.api("/api/admin/settings", null, "GET")
      .then((d) => { s.rows = (d && d.settings) || []; s.loaded = true; })
      .catch(() => { s.error = true; })
      .finally(() => { s.loading = false; repaint(); });
  },
};
