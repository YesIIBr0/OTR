// @ts-nocheck
/* OTR · Marketplace abierto → Buscar clases (S.listings) [F-MKT M4 — visión Isaac].
   El alumno busca por MATERIA ("¿de qué quieres clases?"), ve todos los profesores con su
   tarifa por hora y reserva — la pieza de descubrimiento que faltaba sobre GET /api/listings.

   No lee DB.* : fetch-on-demand (patrón scr-admin-whatsapp) → window.api('/api/listings')
   con ?category=&q=. Reservar abre otrFormModal (fecha + hora RD) → POST /api/bookings
   { listingId, slotAt } — la tarifa y las defensas (verificado, Safety Gate de menores,
   choque de agenda) viven en el SERVIDOR; esta pantalla solo pinta y propone.
   Contrato de escape: title/description/teacherName YA vienen escapados por el servidor —
   se renderizan CRUDOS aquí (sin re-esc). */
import { C } from "./components";
import { IC } from "./icons";
import { esc } from "./esc";
import { t, registerDict } from "./i18n";
import { money } from "./money";
import { dict as d_lst } from "./i18n-keys/lst";
registerDict(d_lst);

export const S = {};

/* ---------------- estado del cliente (window.__listings) ---------------- */
function lstState() {
  const w = window;
  if (!w.__listings) {
    w.__listings = { loaded: false, loading: false, error: false, items: [], total: 0, category: "", q: "" };
  }
  return w.__listings;
}

// Slug de categoría → clave i18n (lst.catIngles, etc.). Los slugs los sirve el servidor.
const catLabel = (slug) => {
  const key = "lst.cat" + String(slug || "").charAt(0).toUpperCase() + String(slug || "").slice(1);
  const label = t(key);
  return label === key ? esc(slug) : label; // slug nuevo sin label aún → se muestra crudo
};

const ini = (name) =>
  (String(name || "?").replace(/&[a-z]+;/g, " ").split(/\s+/).map((w) => w[0]).join("") || "?").slice(0, 2).toUpperCase();

/* ---------------- cards de resultados ---------------- */
function listingCard(l, d) {
  const rating = l.rating != null
    ? `<span class="badge gold" style="font-size:10.5px">★ ${Number(l.rating).toFixed(1)} · ${l.reviewCount} ${t("lst.reviewsSuffix")}</span>`
    : "";
  const verified = l.verified ? `<span class="badge sky" style="font-size:10.5px">${IC.check} ${t("lst.verifiedBadge")}</span>` : "";
  return `
  <div class="card card-pad fade-up" style="--d:${d}">
    <div class="row vcenter" style="gap:10px">
      ${C.avatar(esc(ini(l.teacherName)), { size: "sm", bg: "var(--otr-navy)" })}
      <div style="min-width:0;flex:1">
        <b style="font-size:13.5px;display:block">${l.title}</b>
        <div class="faint" style="font-size:12px;margin-top:2px">${l.teacherName}</div>
      </div>
    </div>
    <div class="row vcenter wrap" style="gap:6px;margin-top:10px">
      <span class="badge">${catLabel(l.category)}</span>
      <span class="badge">${l.modality === "presencial" ? t("lst.modalityPresencial") : l.modality === "híbrido" ? t("lst.modalityHibrido") : t("lst.modalityOnline")}</span>
      ${verified}${rating}
    </div>
    ${l.description ? `<p class="muted" style="font-size:12.5px;margin-top:10px;line-height:1.5;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden">${l.description}</p>` : ""}
    <div class="row between vcenter" style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border)">
      <b class="tnum" style="font-size:15px">${money(l.priceCentsHour)}<span class="faint" style="font-size:11.5px;font-weight:400">${t("lst.perHour")}</span></b>
      <button class="btn btn-primary btn-sm" data-lst-book="${esc(l.id)}">${t("lst.bookBtn")}</button>
    </div>
  </div>`;
}

function resultsBody(st) {
  if (!st.loaded && st.loading) {
    return `<div class="card fade-up"><div class="empty"><div class="ill">${IC.search}</div><h4>${t("lst.loadingTitle")}</h4></div></div>`;
  }
  if (st.error) {
    return `<div class="card fade-up"><div class="empty"><div class="ill">${IC.flag}</div><h4>${t("lst.errLoad")}</h4></div></div>`;
  }
  const items = Array.isArray(st.items) ? st.items : [];
  if (!items.length) {
    return `<div class="card fade-up"><div class="empty"><div class="ill">${IC.search}</div><h4>${t("lst.emptyTitle")}</h4><p>${t("lst.emptyBody")}</p></div></div>`;
  }
  return `<div class="grid g-3" style="gap:14px">${items.map((l, i) => listingCard(l, Math.min(i, 6))).join("")}</div>`;
}

/* ================= PANTALLA ================= */
S.listings = {
  render() {
    const st = lstState();
    // Chips de categoría: "Todas" + la taxonomía que el servidor reportó (o la conocida).
    const cats = st.categories || ["debate", "oratoria", "ingles", "matematicas", "ciencias", "programacion", "ai", "musica", "otros"];
    const chips = [`<button type="button" class="chip ${st.category ? "" : "active"}" data-lst-cat="">${t("lst.allCats")}</button>`]
      .concat(cats.map((c) => `<button type="button" class="chip ${st.category === c ? "active" : ""}" data-lst-cat="${esc(c)}">${catLabel(c)}</button>`))
      .join("");
    return `
    <div class="page-head fade-up"><div>
      <p class="eyebrow">${t("lst.eyebrow")}</p>
      <h1 class="page-title">${t("lst.title")}</h1>
      <div class="page-sub">${t("lst.subtitle")}</div>
    </div></div>

    <div class="card card-pad fade-up" style="--d:1;margin-bottom:16px">
      <div class="row vcenter" style="gap:8px">
        <input class="input" id="lst-q" placeholder="${t("lst.searchPh")}" value="${esc(st.q || "")}" style="flex:1"/>
        <button class="btn btn-primary btn-sm" id="lst-search">${IC.search}</button>
      </div>
      <div class="row wrap" style="gap:8px;margin-top:12px">${chips}</div>
    </div>

    <div class="fade-up" style="--d:2" id="lst-body">${resultsBody(st)}</div>`;
  },

  mount(root) {
    const w = window;
    const st = lstState();

    const repaint = () => {
      const page = root.querySelector(".page");
      if (!page) return;
      page.innerHTML = S.listings.render();
      S.listings.mount(root);
    };

    const load = () => {
      st.loading = true;
      const params = new URLSearchParams();
      if (st.category) params.set("category", st.category);
      if (st.q) params.set("q", st.q);
      w.api(`/api/listings${params.toString() ? "?" + params.toString() : ""}`, null, "GET")
        .then((d) => {
          st.items = Array.isArray(d && d.listings) ? d.listings : [];
          st.total = (d && d.total) || 0;
          st.categories = (d && d.categories) || st.categories;
          st.error = false;
          st.loaded = true;
        })
        .catch(() => { st.items = []; st.error = true; st.loaded = true; })
        .finally(() => { st.loading = false; repaint(); });
    };

    if (!st.loaded && !st.loading) { load(); return; }

    root.querySelector("#lst-search")?.addEventListener("click", () => {
      st.q = String(root.querySelector("#lst-q")?.value || "").trim();
      load();
    });
    root.querySelector("#lst-q")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { st.q = String(e.target.value || "").trim(); load(); }
    });
    root.querySelectorAll("[data-lst-cat]").forEach((chip) =>
      chip.addEventListener("click", () => { st.category = chip.getAttribute("data-lst-cat") || ""; load(); }));

    // Reservar: fecha + hora RD (UTC-4 fijo, mismo criterio que el resto del marketplace) →
    // POST /api/bookings { listingId, slotAt ISO }. El server valida lead/horizonte/choques.
    root.querySelectorAll("[data-lst-book]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-lst-book");
        if (!id || !w.otrFormModal) return;
        w.otrFormModal(t("lst.bookTitle"), [
          { name: "date", label: t("lst.bookDate"), type: "text", req: true, value: "" },
          { name: "time", label: t("lst.bookTime"), type: "text", req: true, value: "" },
        ], async (v) => {
          const date = String(v.date || "").trim();
          const time = String(v.time || "").trim();
          if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
            throw new Error(t("lst.bookBadSlot"));
          }
          const slot = new Date(`${date}T${time}:00-04:00`); // hora RD (UTC-4 fijo)
          if (Number.isNaN(slot.getTime())) throw new Error(t("lst.bookBadSlot"));
          await w.api("/api/bookings", { listingId: id, slotAt: slot.toISOString() }, "POST");
          w.toast?.(t("lst.bookOk"), "ok");
        });
      }));
  },
};
