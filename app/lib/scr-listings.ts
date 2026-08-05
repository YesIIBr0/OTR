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

/* ---------------- thumbnail de materia ----------------
   El marketplace no tiene imágenes que subir (un listing es texto + tarifa), así que el
   thumbnail se DERIVA de la materia: icono + etiqueta sobre el degradado de marca. Es
   determinista (misma materia = mismo thumbnail siempre), no pide gestión de archivos y
   deja la tarjeta escaneable de un vistazo. Paleta de marca (verde/oro/negro) — el ángulo
   del degradado varía por materia para que dos categorías vecinas no se confundan. */
const CAT_ICON = {
  debate: "mic", oratoria: "headset", ingles: "msg", matematicas: "chart",
  ciencias: "target", programacion: "grid", ai: "levels", musica: "play", otros: "book",
};
// Tonos de ARRANQUE del degradado. Todos son de la paleta de marca (verde/oro) y ninguno es
// el negro del final: así el degradado SIEMPRE tiene profundidad. Se eligen por hash del slug,
// no por un mapa a mano — una materia nueva recibe su tono sola y nunca cae en un negro plano.
const CAT_TONES = [
  "var(--otr-green-hi)", "var(--otr-gold)", "var(--otr-green)",
  "var(--otr-gold-lo)", "var(--otr-green-lo)",
];
// Hash estable del slug: mismo slug ⇒ mismo tono y mismo ángulo, siempre.
function slugHash(slug) {
  let h = 0;
  for (const ch of String(slug || "")) h = (h * 31 + ch.charCodeAt(0)) % 9973;
  return h;
}
function thumb(category) {
  const key = String(category || "otros");
  const icon = IC[CAT_ICON[key] || "book"] || IC.book;
  const h = slugHash(key);
  const tone = CAT_TONES[h % CAT_TONES.length];
  const angle = 110 + (h % 60); // 110°–169°: siempre diagonal, nunca plano
  return `
  <div class="lst-thumb" style="background:linear-gradient(${angle}deg,${tone},var(--otr-ink))">
    <span class="lt-ic">${icon}</span>
    <span class="lt-cat">${catLabel(key)}</span>
  </div>`;
}

/* ---------------- cards de resultados ---------------- */
function listingCard(l, d) {
  const rating = l.rating != null
    ? `<span class="badge gold" style="font-size:11px">★ ${Number(l.rating).toFixed(1)} · ${l.reviewCount} ${t("lst.reviewsSuffix")}</span>`
    : "";
  const verified = l.verified ? `<span class="badge sky" style="font-size:11px">${IC.check} ${t("lst.verifiedBadge")}</span>` : "";
  const modality = l.modality === "presencial" ? t("lst.modalityPresencial")
    : l.modality === "híbrido" ? t("lst.modalityHibrido") : t("lst.modalityOnline");
  return `
  <div class="card lst-card fade-up" style="--d:${d}">
    ${thumb(l.category)}
    <div class="lst-body">
      <div>
        <b style="font-size:16px;font-weight:750;line-height:1.3;letter-spacing:var(--track-tight);display:block">${l.title}</b>
        <div class="row vcenter wrap" style="gap:8px;margin-top:8px">
          ${C.avatar(esc(ini(l.teacherName)), { size: "sm", bg: "var(--otr-navy)" })}
          <span style="font-size:13px;font-weight:600">${l.teacherName}</span>
          ${verified}${rating}
        </div>
      </div>
      ${l.description ? `<p class="muted" style="font-size:13px;line-height:1.55;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${l.description}</p>` : ""}
      <div class="row between vcenter wrap" style="gap:10px;margin-top:auto;padding-top:13px;border-top:1px solid var(--border)">
        <div style="line-height:1.25">
          <b class="lst-price tnum">${money(l.priceCentsHour)}</b><span class="faint" style="font-size:12px;font-weight:400">${t("lst.perHour")}</span>
          <div class="faint" style="font-size:11.5px">${modality}</div>
        </div>
        <button class="btn btn-primary" data-lst-book="${esc(l.id)}">${t("lst.bookBtn")}</button>
      </div>
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
  return `<div class="lst-grid">${items.map((l, i) => listingCard(l, Math.min(i, 6))).join("")}</div>`;
}

/* ================= PANTALLA ================= */
S.listings = {
  render() {
    const st = lstState();
    // Chips de categoría: "Todas" + la taxonomía que el servidor reportó (o la conocida).
    const cats = st.categories || ["debate", "oratoria", "ingles", "matematicas", "ciencias", "programacion", "ai", "musica", "otros"];
    // [UI-CURSOS U5] Chips GRANDES: elegir materia es la acción principal de esta pantalla
    // (y el objetivo táctil de 28px se quedaba corto en móvil). Ver .chip--lg en app.css.
    const chips = [`<button type="button" class="chip chip--lg ${st.category ? "" : "active"}" data-lst-cat="">${t("lst.allCats")}</button>`]
      .concat(cats.map((c) => `<button type="button" class="chip chip--lg ${st.category === c ? "active" : ""}" data-lst-cat="${esc(c)}">${catLabel(c)}</button>`))
      .join("");
    return `
    <div class="page-head fade-up"><div>
      <p class="eyebrow">${t("lst.eyebrow")}</p>
      <h1 class="page-title">${t("lst.title")}</h1>
      <div class="page-sub">${t("lst.subtitle")}</div>
    </div></div>

    <div class="card card-pad fade-up" style="--d:1;margin-bottom:16px">
      <div class="row vcenter" style="gap:10px">
        <input class="input" id="lst-q" placeholder="${t("lst.searchPh")}" value="${esc(st.q || "")}" style="flex:1;height:46px;font-size:15px"/>
        <button class="btn btn-primary" id="lst-search" style="height:46px;padding:0 20px">${IC.search}</button>
      </div>
      <div class="row wrap" style="gap:9px;margin-top:14px">${chips}</div>
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
