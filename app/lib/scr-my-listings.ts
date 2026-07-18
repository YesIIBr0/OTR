// @ts-nocheck
/* OTR · Marketplace abierto → Mis clases (S.myListings) [F-MKT M5 — visión Isaac].
   El profesor publica y gestiona sus N listings (inglés Y matemáticas = 2 cards), cada uno
   con su tarifa por hora y su ESTADO del vetting: En revisión / Publicada / Pausada /
   No aprobada (con el motivo del admin visible).

   No lee DB.* : fetch-on-demand → GET /api/listings?mine=1. Alta/edición vía otrFormModal
   (patrón de torneos F6.2) → POST /api/listings | PATCH /api/listings/[id]. Pausar/reactivar
   → PATCH { action }. El RE-VETTING lo decide el servidor (editar contenido publicado vuelve
   a revisión) — aquí solo se avisa con el toast correcto.
   Contrato de escape: title/description/rejectReason vienen escapados del servidor; se
   renderizan crudos, y en value="…" del modal el navegador los decodifica para editar. */
import { IC } from "./icons";
import { esc } from "./esc";
import { t, registerDict } from "./i18n";
import { money } from "./money";
import { dict as d_lst } from "./i18n-keys/lst";
registerDict(d_lst);

export const S = {};

/* ---------------- estado del cliente (window.__myListings) ---------------- */
function mineState() {
  const w = window;
  if (!w.__myListings) w.__myListings = { loaded: false, loading: false, error: false, items: [] };
  return w.__myListings;
}

const CATS = ["debate", "oratoria", "ingles", "matematicas", "ciencias", "programacion", "ai", "musica", "otros"];
const catLabel = (slug) => {
  const key = "lst.cat" + String(slug || "").charAt(0).toUpperCase() + String(slug || "").slice(1);
  const label = t(key);
  return label === key ? esc(slug) : label;
};

const STATUS_TONE = { PENDING: "warn", ACTIVE: "sky", PAUSED: "", REJECTED: "warn" };

/* ---------------- campos del modal (alta/edición) ---------------- */
function listingFields(prefill) {
  const p = prefill || {};
  return [
    {
      type: "select", name: "category", label: t("lst.fieldCategory"), value: p.category || "ingles",
      options: CATS.map((c) => ({ value: c, label: catLabel(c) })),
    },
    { name: "title", label: t("lst.fieldTitle"), type: "text", req: true, value: p.title || "" },
    { name: "description", label: t("lst.fieldDesc"), type: "text", value: p.description || "" },
    // Tarifa en RD$ (el payload la convierte a centavos).
    { name: "price", label: t("lst.fieldPrice"), type: "text", req: true, value: p.priceCentsHour != null ? String(p.priceCentsHour / 100) : "" },
    {
      type: "select", name: "modality", label: t("lst.fieldModality"), value: p.modality || "online",
      options: [
        { value: "online", label: t("lst.modalityOnline") },
        { value: "presencial", label: t("lst.modalityPresencial") },
        { value: "híbrido", label: t("lst.modalityHibrido") },
      ],
    },
  ];
}

function listingPayload(v) {
  return {
    category: String(v.category || ""),
    title: String(v.title || ""),
    description: String(v.description || ""),
    priceCentsHour: Math.round(Number(String(v.price || "").replace(",", ".")) * 100),
    modality: String(v.modality || "online"),
  };
}

/* ---------------- card por listing ---------------- */
function mineCard(l, d) {
  const tone = STATUS_TONE[l.status] ?? "";
  const canPause = l.status === "ACTIVE";
  const canActivate = l.status === "PAUSED";
  return `
  <div class="card card-pad fade-up" style="--d:${d}">
    <div class="row between vcenter wrap" style="gap:10px">
      <div style="min-width:0;flex:1">
        <div class="row vcenter wrap" style="gap:8px">
          <b style="font-size:13.5px">${l.title}</b>
          <span class="badge ${tone}" style="font-size:10.5px">${t("lst.status" + l.status)}</span>
          <span class="badge">${catLabel(l.category)}</span>
        </div>
        <div class="faint tnum" style="font-size:12px;margin-top:4px">${money(l.priceCentsHour)}${t("lst.perHour")}</div>
        ${l.status === "REJECTED" && l.rejectReason ? `<p class="muted" style="font-size:12px;margin-top:6px;color:var(--danger)">${t("lst.rejectedReason")}: ${l.rejectReason}</p>` : ""}
      </div>
      <div class="row vcenter" style="gap:6px;flex:none">
        <button class="btn btn-soft btn-sm" data-lst-edit="${esc(l.id)}">${t("lst.editBtn")}</button>
        ${canPause ? `<button class="btn btn-ghost btn-sm" data-lst-pause="${esc(l.id)}">${t("lst.pauseBtn")}</button>` : ""}
        ${canActivate ? `<button class="btn btn-soft btn-sm" data-lst-activate="${esc(l.id)}">${t("lst.activateBtn")}</button>` : ""}
      </div>
    </div>
  </div>`;
}

function mineBody(st) {
  if (!st.loaded && st.loading) {
    return `<div class="card fade-up"><div class="empty"><div class="ill">${IC.book}</div><h4>${t("lst.loadingMineTitle")}</h4></div></div>`;
  }
  if (st.error) {
    return `<div class="card fade-up"><div class="empty"><div class="ill">${IC.flag}</div><h4>${t("lst.errLoad")}</h4></div></div>`;
  }
  const items = Array.isArray(st.items) ? st.items : [];
  if (!items.length) {
    return `<div class="card fade-up"><div class="empty"><div class="ill">${IC.book}</div><h4>${t("lst.emptyMineTitle")}</h4><p>${t("lst.emptyMineBody")}</p></div></div>`;
  }
  return `<div class="stack" style="gap:12px">${items.map((l, i) => mineCard(l, Math.min(i, 6))).join("")}</div>`;
}

/* ================= PANTALLA ================= */
S.myListings = {
  render() {
    const st = mineState();
    return `
    <div class="page-head fade-up"><div>
      <p class="eyebrow">${t("lst.myEyebrow")}</p>
      <h1 class="page-title">${t("lst.myTitle")}</h1>
      <div class="page-sub">${t("lst.mySubtitle")}</div>
    </div></div>

    <div class="row fade-up" style="--d:1;margin-bottom:14px;justify-content:flex-end">
      <button class="btn btn-primary btn-sm" id="lst-new">${IC.plus || ""} ${t("lst.newBtn")}</button>
    </div>

    <div class="fade-up" style="--d:2" id="lst-mine">${mineBody(st)}</div>`;
  },

  mount(root) {
    const w = window;
    const st = mineState();

    const repaint = () => {
      const page = root.querySelector(".page");
      if (!page) return;
      page.innerHTML = S.myListings.render();
      S.myListings.mount(root);
    };

    const load = () => {
      st.loading = true;
      w.api("/api/listings?mine=1", null, "GET")
        .then((d) => { st.items = Array.isArray(d && d.listings) ? d.listings : []; st.error = false; st.loaded = true; })
        .catch(() => { st.items = []; st.error = true; st.loaded = true; })
        .finally(() => { st.loading = false; repaint(); });
    };

    if (!st.loaded && !st.loading) { load(); return; }

    // Alta
    root.querySelector("#lst-new")?.addEventListener("click", () => {
      if (!w.otrFormModal) return;
      w.otrFormModal(t("lst.createTitle"), listingFields(null), async (v) => {
        await w.api("/api/listings", listingPayload(v), "POST");
        w.toast?.(t("lst.created"), "ok");
        load();
      });
    });

    // Edición (prefill desde la card; el server decide el re-vetting)
    root.querySelectorAll("[data-lst-edit]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-lst-edit");
        const item = st.items.find((x) => x.id === id);
        if (!id || !item || !w.otrFormModal) return;
        const wasActive = item.status === "ACTIVE";
        w.otrFormModal(t("lst.editTitle"), listingFields(item), async (v) => {
          await w.api(`/api/listings/${encodeURIComponent(id)}`, listingPayload(v), "PATCH");
          w.toast?.(wasActive ? t("lst.revetNote") : t("lst.updated"), wasActive ? "warn" : "ok");
          load();
        });
      }));

    // Pausar / reactivar
    const simpleAction = (attr, action, okKey, tone) => {
      root.querySelectorAll(`[${attr}]`).forEach((btn) =>
        btn.addEventListener("click", async () => {
          const id = btn.getAttribute(attr);
          if (!id) return;
          btn.disabled = true;
          try {
            await w.api(`/api/listings/${encodeURIComponent(id)}`, { action }, "PATCH");
            w.toast?.(t(okKey), tone);
            load();
          } catch (e) {
            w.toast?.((e && e.message) || t("lst.actionFail"), "danger");
            btn.disabled = false;
          }
        }));
    };
    simpleAction("data-lst-pause", "pause", "lst.paused", "warn");
    simpleAction("data-lst-activate", "activate", "lst.activated", "ok");
  },
};
