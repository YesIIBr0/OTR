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
import { listingCover } from "./listing-cover";
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

/* ---------------- fila de resultado ----------------
   Registro Preply, no Fiverr: una FILA por clase — cover institucional de la materia,
   quién enseña con su credencial y sus números reales, y a la derecha el precio con la
   acción. Se escanea en vertical comparando precio contra reputación, que es exactamente
   la decisión que toma el alumno (o el padre que paga). El cover lo arma lib/listing-cover,
   compartido con la ficha, para que una clase se vea igual en los dos sitios. */
function listingRow(l, d) {
  const modality = l.modality === "presencial" ? t("lst.modalityPresencial")
    : l.modality === "híbrido" ? t("lst.modalityHibrido") : t("lst.modalityOnline");
  const rating = l.rating != null
    ? `<span class="row vcenter" style="gap:5px"><b class="tnum">${Number(l.rating).toFixed(1)}</b><span class="lst-stars" aria-hidden="true">★</span><span class="faint">(${l.reviewCount})</span></span>`
    : `<span class="badge">${t("lst.newTeacher")}</span>`;
  return `
  <article class="card lst-row fade-up" style="--d:${d}" role="button" tabindex="0" data-lst-open="${esc(l.id)}">
    ${listingCover(l.category, catLabel(l.category), "row")}
    <div class="lst-row-body">
      <div class="row vcenter wrap" style="gap:9px">
        ${C.avatar(esc(ini(l.teacherName)), { size: "sm", bg: "var(--otr-navy)" })}
        <b style="font-size:15px;letter-spacing:var(--track-tight)">${l.teacherName}</b>
        ${l.verified ? `<span class="badge ok" style="font-size:10.5px">${IC.check} ${t("lst.verifiedBadge")}</span>` : ""}
      </div>
      <b class="lst-row-title">${l.title}</b>
      <div class="row vcenter wrap" style="gap:6px 10px;font-size:12.5px;color:var(--text-2)">
        ${rating}<span class="dot-sep"></span><span>${catLabel(l.category)}</span><span class="dot-sep"></span><span>${modality}</span>
      </div>
      ${l.description ? `<p class="muted lst-row-desc">${l.description}</p>` : ""}
    </div>
    <div class="lst-row-buy">
      <div style="line-height:1.15">
        <b class="lst-price tnum">${money(l.priceCentsHour)}</b>
        <div class="faint" style="font-size:12px">${t("lst.perHour1h")}</div>
      </div>
      <button class="btn btn-primary btn-block" data-lst-book="${esc(l.id)}">${t("lst.bookBtn")}</button>
      <button class="btn btn-soft btn-block" data-lst-open="${esc(l.id)}">${t("lst.viewBtn")}</button>
    </div>
  </article>`;
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
  return `
    <p class="faint" style="font-size:12.5px;margin-bottom:12px">${st.total} ${st.total === 1 ? t("lst.resultOne") : t("lst.resultMany")}</p>
    <div class="stack" style="gap:14px">${items.map((l, i) => listingRow(l, Math.min(i, 6))).join("")}</div>`;
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

    // [P2] Entrar a la clase. La fila entera es el objetivo (Preply): un clic en cualquier
    // parte que no sea "Reservar" abre la ficha. stopPropagation en el botón de reservar
    // evita que reservar navegue además de abrir el modal.
    const open = (id) => { if (!id) return; w.__listing = id; w.go?.("listing"); };
    root.querySelectorAll("[data-lst-open]").forEach((el) => {
      el.addEventListener("click", (e) => { e.stopPropagation(); open(el.getAttribute("data-lst-open")); });
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(el.getAttribute("data-lst-open")); }
      });
    });

    // Reservar: fecha + hora RD (UTC-4 fijo, mismo criterio que el resto del marketplace) →
    // POST /api/bookings { listingId, slotAt ISO }. El server valida lead/horizonte/choques.
    root.querySelectorAll("[data-lst-book]").forEach((btn) =>
      btn.addEventListener("click", (e) => {
        e.stopPropagation(); // la fila entera abre la ficha; reservar NO debe navegar además
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
