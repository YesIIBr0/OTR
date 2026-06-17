// @ts-nocheck
/* OTR Hub · Arsenal — biblioteca de recursos del coach (briefs, plantillas, drills, grabaciones, enlaces) */
import { DB } from "./data";
import { C } from "./components";
import { IC } from "./icons";
import { esc } from "./esc";
import { t } from "./i18n";

export const S = {};

// Metadatos por tipo de recurso (kind del schema Resource)
const KINDS = {
  brief:     { label: () => t("arsenal.kindBriefs"),      one: () => t("arsenal.kindBrief"),      ic: "doc"      },
  template:  { label: () => t("arsenal.kindTemplates"),   one: () => t("arsenal.kindTemplate"),   ic: "file"     },
  drill:     { label: () => t("arsenal.kindDrills"),      one: () => t("arsenal.kindDrill"),      ic: "target"   },
  recording: { label: () => t("arsenal.kindRecordings"), one: () => t("arsenal.kindRecording"),  ic: "video"    },
  link:      { label: () => t("arsenal.kindLinks"),       one: () => t("arsenal.kindLink"),       ic: "arrowR"   },
};
const KIND_ORDER = ["brief", "template", "drill", "recording", "link"];

function isCoach() {
  const r = (DB.me && DB.me.role) || "";
  return r === "teacher" || r === "admin";
}

S.arsenal = {
  render() {
    const all = Array.isArray(DB.arsenal) ? DB.arsenal : [];
    const coach = isCoach();

    // Estado de filtros (patrón window.__x — re-render vía go('arsenal'))
    const activeKind = window.__arsenalKind || "all";
    const q = (window.__arsenalQ || "").toLowerCase().trim();

    // Filtro por kind + texto
    const items = all.filter((r) => {
      if (activeKind !== "all" && r.kind !== activeKind) return false;
      if (q) {
        const hay = `${r.title || ""} ${r.tag || ""} ${r.format || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    // Conteos por kind sobre el set completo (para los chips)
    const countOf = (k) => all.filter((r) => r.kind === k).length;

    // ---- Chips de filtro ----
    const chip = (key, label, count) =>
      `<button type="button" class="chip ${activeKind === key ? "active" : ""}"
        onclick="window.__arsenalKind='${key}';go('arsenal')">${esc(label)}${
        count != null ? ` <span class="faint" style="font-weight:600">${count}</span>` : ""
      }</button>`;

    const chips = [
      chip("all", t("arsenal.chipAll"), all.length),
      ...KIND_ORDER.filter((k) => countOf(k) > 0).map((k) => chip(k, KINDS[k].label(), countOf(k))),
    ].join("");

    // ---- Tarjeta de recurso ----
    const card = (r, i = 0) => {
      const meta = KINDS[r.kind] || { one: () => r.kind || t("arsenal.resource"), ic: "doc" };
      const ic = IC[meta.ic] || IC.doc;
      const tags = [];
      if (r.tag) tags.push(`<span class="tag-soft">${esc(r.tag)}</span>`);
      if (r.format) tags.push(`<span class="tag-soft">${esc(r.format)}</span>`);
      const gated = r.gated
        ? `<span class="badge navy"><span class="lead" style="display:inline-flex;width:13px;height:13px;vertical-align:-2px">${IC.lock}</span> ${t("arsenal.premium")}</span>`
        : "";
      const href = r.url ? esc(r.url) : "";
      const openable = r.locked
        ? `<button type="button" class="btn btn-ghost btn-sm btn-block" onclick="go('catalog')"><span class="lead" style="display:inline-flex;width:14px;height:14px;vertical-align:-2px">${IC.lock}</span> ${t("arsenal.enrollToAccess")}</button>`
        : href
          ? `<a class="btn btn-soft btn-sm btn-block" href="${href}" target="_blank" rel="noopener noreferrer"><span class="lead" style="display:inline-flex;width:14px;height:14px;vertical-align:-2px">${IC.eye}</span> ${t("arsenal.open")}</a>`
          : `<span class="btn btn-ghost btn-sm btn-block" style="opacity:.55;pointer-events:none"><span class="lead" style="display:inline-flex;width:14px;height:14px;vertical-align:-2px">${IC.doc}</span> ${t("arsenal.resource")}</span>`;
      return `
      <div class="tile arsenal-card fade-up" data-kind="${esc(r.kind || "")}"
        data-hay="${esc(`${r.title || ""} ${r.tag || ""} ${r.format || ""}`.toLowerCase())}"
        style="display:flex;flex-direction:column;gap:0;--d:${i}">
        <div class="row vcenter between" style="gap:10px;margin-bottom:12px">
          <span class="ar-ic" style="display:inline-flex;width:40px;height:40px;align-items:center;justify-content:center;border-radius:12px;background:color-mix(in srgb,var(--otr-sky) 14%,white);color:var(--otr-sky-lo);flex:none">${ic}</span>
          ${gated}
        </div>
        <div class="cc-name" style="font-size:15px;font-weight:700;line-height:1.35">${esc(r.title || t("arsenal.untitled"))}</div>
        <div class="row wrap" style="gap:6px;margin:10px 0 14px">
          <span class="badge sky">${esc(meta.one())}</span>${tags.join("")}
        </div>
        <div class="row" style="margin-top:auto">${openable}</div>
      </div>`;
    };

    // ---- Estado vacío ----
    const emptyAll = `
      <div class="card"><div class="empty">
        <div class="ill">${IC.book}</div>
        <h4>${t("arsenal.emptyHeading")}</h4>
        <p>${
          coach
            ? t("arsenal.emptyCoachBody")
            : t("arsenal.emptyStudentBody")
        }</p>
        ${coach ? `<button class="btn btn-primary btn-sm" data-action="new-resource">${IC.plus} ${t("arsenal.createResource")}</button>` : ""}
      </div></div>`;

    const emptyFiltered = `
      <div class="card"><div class="empty">
        <div class="ill">${IC.search}</div>
        <h4>${t("arsenal.noMatchesHeading")}</h4>
        <p>${t("arsenal.noMatchesBody")}</p>
        <button class="btn btn-ghost btn-sm" type="button"
          onclick="window.__arsenalKind='all';window.__arsenalQ='';go('arsenal')">${t("arsenal.clearFilters")}</button>
      </div></div>`;

    const body = all.length === 0
      ? emptyAll
      : items.length === 0
        ? emptyFiltered
        : `<div class="grid g-3" id="arsenal-grid">${items.map(card).join("")}</div>`;

    return `
    <div class="page-head"><div>
      <p class="eyebrow">OTR Hub</p>
      <div class="page-title">Arsenal</div>
      <div class="page-sub">${t("arsenal.pageSub")}</div>
    </div>
    ${coach ? `<button class="btn btn-primary" data-action="new-resource">${IC.plus} ${t("arsenal.newResource")}</button>` : ""}
    </div>

    <div class="row between vcenter" style="margin-bottom:18px;flex-wrap:wrap;gap:12px">
      <div class="searchbox" style="flex:1 1 240px;max-width:320px;min-width:0">
        <span style="display:flex;width:16px;height:16px;flex:none">${IC.search}</span>
        <input id="arsenal-search" placeholder="${t("arsenal.searchPlaceholder")}" value="${esc(window.__arsenalQ || "")}" autocomplete="off"/>
      </div>
      <div class="row wrap" style="gap:8px;flex:1 1 auto;justify-content:flex-end">${chips}</div>
    </div>

    ${body}`;
  },

  mount(root) {
    const input = root.querySelector("#arsenal-search");
    const grid = root.querySelector("#arsenal-grid");
    if (!input) return;

    // Filtrado en vivo en el cliente (sin re-render → conserva el foco del input).
    // window.__arsenalQ se mantiene sincronizado para que los chips re-rendericen coherentes.
    const apply = () => {
      const q = input.value.toLowerCase().trim();
      window.__arsenalQ = input.value;
      if (!grid) return;
      let visible = 0;
      grid.querySelectorAll(".arsenal-card").forEach((el) => {
        const hay = el.getAttribute("data-hay") || "";
        const show = !q || hay.includes(q);
        el.style.display = show ? "" : "none";
        if (show) visible++;
      });
      let none = root.querySelector("#arsenal-none");
      if (visible === 0) {
        if (!none) {
          none = document.createElement("div");
          none.id = "arsenal-none";
          none.className = "faint";
          none.style.cssText = "padding:24px 4px;font-size:13px";
          none.textContent = t("arsenal.noMatchesLive");
          grid.parentNode.insertBefore(none, grid.nextSibling);
        }
      } else if (none) {
        none.remove();
      }
    };

    input.addEventListener("input", apply);
    // Evita que el handler global ('.searchbox input' + Enter → pantalla "search") nos saque del Arsenal.
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); apply(); }
    });
  },
};
