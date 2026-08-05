// @ts-nocheck
/* OTR · Marketplace abierto → "adentro de la clase" (S.listing) [P2].
   La ficha que decide la reserva: quién enseña, qué ofrece, qué dicen sus alumnos y cuánto
   cuesta. Referencia de aire y jerarquía: la ficha de tutor de Preply — no la miniatura
   gritona de un marketplace de encargos. Aquí entran menores y familias: el registro es
   institucional (cover de materia, credenciales, reseñas verificables), nunca publicitario.

   No lee DB.* : fetch-on-demand contra GET /api/listings/[id] (patrón scr-admin-whatsapp /
   scr-listings) usando window.__listing = <id>, que fija quien navega hasta aquí.

   Contrato de escape: title/description/bio/headline/teacherName/reseñas YA vienen escapados
   del servidor — se renderizan CRUDOS aquí (sin re-esc). Solo se escapa lo que se compone en
   el cliente (ids en atributos).

   Datos que el mockup pedía y NO existen todavía en el modelo, así que la pantalla NO los
   inventa: video de presentación (Listing no tiene campo de video) y el descuento de
   membresía ("miembros ahorran X%"). Cuando existan, entran aquí sin tocar el layout. */
import { C } from "./components";
import { IC } from "./icons";
import { esc } from "./esc";
import { t, registerDict } from "./i18n";
import { money } from "./money";
import { listingCover } from "./listing-cover";
import { dict as d_lst } from "./i18n-keys/lst";
registerDict(d_lst);

export const S = {};

/* ---------------- estado del cliente (window.__listingData) ---------------- */
function detState() {
  const w = window;
  if (!w.__listingData) w.__listingData = { id: null, loading: false, error: false, data: null };
  return w.__listingData;
}

const catLabel = (slug) => {
  const key = "lst.cat" + String(slug || "").charAt(0).toUpperCase() + String(slug || "").slice(1);
  const label = t(key);
  return label === key ? esc(slug) : label;
};

const modalityLabel = (m) =>
  m === "presencial" ? t("lst.modalityPresencial") : m === "híbrido" ? t("lst.modalityHibrido") : t("lst.modalityOnline");

// "es,en" → "Español · Inglés". El idioma es criterio de compra real en RD (clases en inglés).
const languagesLabel = (code) =>
  String(code || "es").split(",").map((c) => (c.trim() === "en" ? t("lst.langEn") : t("lst.langEs"))).join(" · ");

// Mes y año de alta del profesor: "desde julio 2026". Da antigüedad sin fingir precisión.
function memberSince(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(t("lst.locale"), { month: "long", year: "numeric" });
}

function relDate(iso) {
  const ms = Date.now() - Date.parse(iso);
  if (!Number.isFinite(ms) || ms < 0) return "";
  const d = Math.floor(ms / 86400000);
  if (d < 7) return t("lst.revThisWeek");
  const w = Math.floor(d / 7);
  if (w < 5) return `${t("lst.revAgo")} ${w} ${w === 1 ? t("lst.revWeek") : t("lst.revWeeks")}`;
  const m = Math.floor(d / 30);
  return `${t("lst.revAgo")} ${m} ${m === 1 ? t("lst.revMonth") : t("lst.revMonths")}`;
}

const stars = (n) => `<span class="lst-stars" aria-hidden="true">${"★".repeat(Math.round(n))}${"☆".repeat(5 - Math.round(n))}</span>`;

/* ---------------- bloques ---------------- */
function sidebar(d) {
  const s = d.stats || {};
  const row = (k, v) => `<div class="lst-fact"><span>${k}</span><b>${v}</b></div>`;
  return `
  <aside class="lst-aside">
    <div class="card card-pad">
      <p class="eyebrow">${t("lst.fromLabel")}</p>
      <div class="row vcenter" style="gap:6px;margin:2px 0 14px">
        <b class="lst-price-xl tnum">${money(d.listing.priceCentsHour)}</b>
        <span class="faint" style="font-size:13px">${t("lst.perHour")}</span>
      </div>
      ${row(t("lst.factSubject"), catLabel(d.listing.category))}
      ${row(t("lst.factModality"), modalityLabel(d.listing.modality))}
      ${row(t("lst.factLanguages"), languagesLabel(d.listing.language))}
      ${s.sessions ? row(t("lst.factSessions"), s.sessions) : ""}
      <button class="btn btn-primary btn-block" style="margin-top:16px" data-lst-book="${esc(d.listing.id)}">${t("lst.bookBtn")}</button>
      <button class="btn btn-soft btn-block" style="margin-top:8px" data-lst-msg="${esc(d.teacher.id)}">
        <span class="row vcenter" style="gap:7px;justify-content:center"><span style="display:inline-flex;width:15px;height:15px">${IC.msg}</span>${t("lst.messageBtn")}</span>
      </button>
      <p class="faint" style="font-size:11.5px;margin-top:12px;line-height:1.45">${t("lst.escrowNote")}</p>
    </div>
  </aside>`;
}

function offers(d) {
  // "Lo que ofrezco": las OTRAS materias del mismo profesor. Es la visión de Isaac hecha
  // producto — un profesor sube un listing por materia, y aquí se ven todas juntas.
  if (!d.others || !d.others.length) return "";
  return `
  <section class="lst-block">
    <h2 class="lst-h">${t("lst.offersTitle")}</h2>
    <div class="stack" style="gap:10px">
      ${d.others.map((o) => `
        <div class="card lst-offer" role="button" tabindex="0" data-lst-open="${esc(o.id)}">
          <div style="min-width:0;flex:1">
            <b style="font-size:14px;display:block">${o.title}</b>
            <div class="faint" style="font-size:12.5px;margin-top:3px">${catLabel(o.category)} · ${modalityLabel(o.modality)}</div>
          </div>
          <div class="row vcenter" style="gap:14px;flex:none">
            <b class="tnum" style="font-size:15px">${money(o.priceCentsHour)}<span class="faint" style="font-size:11.5px;font-weight:400">${t("lst.perHour")}</span></b>
            <span class="btn btn-quiet btn-sm">${t("lst.viewBtn")}</span>
          </div>
        </div>`).join("")}
    </div>
  </section>`;
}

function reviews(d) {
  if (!d.reviews || !d.reviews.length) {
    return `<section class="lst-block">
      <h2 class="lst-h">${t("lst.reviewsTitle")}</h2>
      <div class="card card-pad"><p class="muted" style="font-size:13px;margin:0">${t("lst.reviewsEmpty")}</p></div>
    </section>`;
  }
  return `
  <section class="lst-block">
    <h2 class="lst-h">${t("lst.reviewsTitle")} <span class="faint" style="font-weight:500">(${d.stats.reviewCount})</span></h2>
    <div class="card card-pad stack" style="gap:0">
      ${d.reviews.map((r, i) => `
        <div style="padding:${i ? "14px" : "0"} 0 14px;${i ? "border-top:1px solid var(--border)" : ""}">
          <div class="row vcenter wrap" style="gap:8px">
            ${stars(r.rating)}
            <b style="font-size:13px">${r.author || t("lst.revAnon")}</b>
            <span class="faint" style="font-size:12px">· ${relDate(r.createdAtIso)}</span>
          </div>
          ${r.body ? `<p class="muted" style="font-size:13px;line-height:1.55;margin-top:6px">${r.body}</p>` : ""}
        </div>`).join("")}
    </div>
  </section>`;
}

function body(d) {
  const s = d.stats || {};
  const ratingLine = s.rating != null
    ? `<span class="row vcenter" style="gap:6px">${stars(s.rating)}<b>${s.rating}</b><span class="faint">· ${s.reviewCount} ${t("lst.reviewsSuffix")}</span></span>`
    : `<span class="badge">${t("lst.newTeacher")}</span>`;
  const since = memberSince(d.teacher.memberSinceIso);

  return `
  <div class="lst-detail">
    <div class="lst-main">
      ${/* Cabecera: la FOTO del profesor si la tiene, y si no el emblema institucional de
           la materia. Sin video porque no existe campo para subirlo — mejor un cover
           honesto que un reproductor vacío. */""}
      ${listingCover(d.listing.category, catLabel(d.listing.category), "hero", d.teacher.avatarUrl || "")}

      <h1 class="lst-title">${d.listing.title}</h1>

      <div class="lst-teacher">
        ${d.teacher.avatarUrl
          ? `<img class="avatar lg" src="${esc(d.teacher.avatarUrl)}" alt="" style="width:56px;height:56px;border-radius:50%;object-fit:cover"/>`
          : C.avatar(d.teacher.initials || "?", { size: "lg", bg: "var(--otr-navy)" })}
        <div style="min-width:0">
          <div class="row vcenter wrap" style="gap:9px">
            <b style="font-size:18px;letter-spacing:var(--track-tight)">${d.teacher.name}</b>
            ${d.teacher.verified ? `<span class="badge ok" style="font-size:11px">${IC.check} ${t("lst.verifiedBadge")}</span>` : ""}
          </div>
          ${d.teacher.headline ? `<div class="muted" style="font-size:13.5px;margin-top:3px">${d.teacher.headline}</div>` : ""}
          <div class="row vcenter wrap" style="gap:6px 12px;margin-top:7px;font-size:13px;color:var(--text-2)">
            ${ratingLine}
            ${d.teacher.location ? `<span class="dot-sep"></span><span>${d.teacher.location}</span>` : ""}
            ${since ? `<span class="dot-sep"></span><span>${t("lst.memberSince")} ${esc(since)}</span>` : ""}
          </div>
        </div>
      </div>

      ${d.teacher.bio || d.listing.description ? `
      <section class="lst-block">
        <h2 class="lst-h">${t("lst.aboutTitle")}</h2>
        ${d.teacher.bio ? `<p class="lst-prose">${d.teacher.bio}</p>` : ""}
        ${d.listing.description ? `<p class="lst-prose" style="margin-top:10px">${d.listing.description}</p>` : ""}
        ${d.teacher.formats ? `<div class="row wrap" style="gap:7px;margin-top:12px">${
          String(d.teacher.formats).split(",").map((f) => `<span class="chip soft">${f.trim()}</span>`).join("")
        }</div>` : ""}
      </section>` : ""}

      ${offers(d)}
      ${reviews(d)}
    </div>
    ${sidebar(d)}
  </div>`;
}

/* ================= PANTALLA ================= */
S.listing = {
  render() {
    const st = detState();
    const head = `<div class="page-head fade-up"><div>
      <p class="eyebrow"><a href="#listings" data-go="listings" style="color:inherit">${t("lst.eyebrow")}</a></p>
    </div></div>`;
    if (st.error) {
      return `${head}<div class="card fade-up"><div class="empty">
        <div class="ill">${IC.search}</div><h4>${t("lst.detailErr")}</h4>
        <button class="btn btn-primary btn-sm" data-go="listings">${t("lst.backToSearch")}</button>
      </div></div>`;
    }
    if (!st.data) {
      return `${head}<div class="card fade-up"><div class="empty"><div class="ill">${IC.search}</div><h4>${t("lst.loadingTitle")}</h4></div></div>`;
    }
    return `${head}<div class="fade-up" style="--d:1">${body(st.data)}</div>`;
  },

  mount(root) {
    const w = window;
    const st = detState();
    const id = w.__listing || "";

    const repaint = () => {
      const page = root.querySelector(".page");
      if (!page) return;
      page.innerHTML = S.listing.render();
      S.listing.mount(root);
    };

    // Carga si aún no tenemos ESTE listing (cambiar de clase re-pide; volver no).
    if (id && st.id !== id && !st.loading) {
      st.loading = true; st.error = false; st.data = null; st.id = id;
      w.api(`/api/listings/${encodeURIComponent(id)}`, null, "GET")
        .then((d) => { st.data = d && d.listing ? d : null; st.error = !st.data; })
        .catch(() => { st.error = true; })
        .finally(() => { st.loading = false; repaint(); });
      return;
    }

    // Abrir otra clase del mismo profesor ("Lo que ofrezco").
    const open = (el) => {
      const other = el.getAttribute("data-lst-open");
      if (!other) return;
      w.__listing = other;
      st.id = null; // fuerza recarga del nuevo listing
      w.go?.("listing");
    };
    root.querySelectorAll("[data-lst-open]").forEach((el) => {
      el.addEventListener("click", () => open(el));
      el.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(el); } });
    });

    // Mensaje al profesor: la conversación ya existe como canal; aquí solo se enruta.
    root.querySelectorAll("[data-lst-msg]").forEach((btn) =>
      btn.addEventListener("click", () => { w.go?.("messages"); }));

    // Reservar: MISMO contrato que el listado (fecha + hora RD → POST /api/bookings).
    // El servidor valida tarifa, verificación, Safety Gate de menores y choques de agenda.
    root.querySelectorAll("[data-lst-book]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const lid = btn.getAttribute("data-lst-book");
        if (!lid || !w.otrFormModal) return;
        w.otrFormModal(t("lst.bookTitle"), [
          { name: "date", label: t("lst.bookDate"), type: "text", req: true, value: "" },
          { name: "time", label: t("lst.bookTime"), type: "text", req: true, value: "" },
        ], async (v) => {
          const date = String(v.date || "").trim();
          const time = String(v.time || "").trim();
          if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) throw new Error(t("lst.bookBadSlot"));
          const slot = new Date(`${date}T${time}:00-04:00`); // hora RD (UTC-4 fijo)
          if (Number.isNaN(slot.getTime())) throw new Error(t("lst.bookBadSlot"));
          await w.api("/api/bookings", { listingId: lid, slotAt: slot.toISOString() }, "POST");
          w.toast?.(t("lst.bookOk"), "ok");
        });
      }));
  },
};
