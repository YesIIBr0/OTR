// @ts-nocheck
/* OTR · "Lo mejor de la temporada" — VISTA LARGA (S.highlights) [RONDA3 · Isaac].
   Petición literal del cliente: «esto hazlo un view largo de solo 1 por fila para que se vea
   mejor… haz 4 en vista previa luego "ver todos"» y «cada publicación de esa a un post de IG».
   El dashboard deja 4 de vista previa (scr-core, otro agente); ESTA pantalla es el destino de
   "Ver todos": un logro por fila, foto grande, chip de categoría, título grande y fecha, y la
   fila entera enlaza a su publicación de Instagram (pestaña nueva). Sin enlace no navega.

   Gestión del staff EN LA MISMA PANTALLA (crear / editar / eliminar con el modal del kit):
   es el precedente de la casa para contenido que publica el staff y lee todo el mundo
   —scr-events.ts hace exactamente esto con los torneos (F6.2)— y le da al coach un "view
   fácil" donde edita EXACTAMENTE lo que ve el alumno. El acceso desde su portal cuelga de
   "Mis cursos" (scr-extra), que es la pantalla de gestión que ya tienen coach y admin.

   Contrato de escape — DOS fuentes, distinto estado, a propósito:
     · DB.highlights (payload de queries.ts) es texto de CATÁLOGO SIN escapar, igual que
       badges/events → se escapa AQUÍ, al pintar.
     · GET /api/highlights devuelve el mismo texto YA escapado (contrato de la casa) y solo
       se usa para prefijar el modal: va a value="…", donde el navegador lo decodifica al
       valor real para editar. Nunca se pinta directamente. */
import { DB } from "./data";
import { C } from "./components";
import { IC } from "./icons";
import { esc } from "./esc";
import { t, registerDict } from "./i18n";
// [F4.1] El diccionario viaja en el chunk de ESTA pantalla (hl.*), no en el inicial.
import { dict as d_hl } from "./i18n-keys/hl";
registerDict(d_hl);

export const S = {};

/* ---------------- helpers ---------------- */

// ¿El que mira es staff? En el cliente DB.me.role viene en MINÚSCULA (Aula.tsx fija viewRole).
function isStaff() {
  const r = String(DB.me?.role || "").toLowerCase();
  return r === "admin" || r === "teacher";
}

/* Foto: solo rutas del propio sitio o https (misma política que safeUrl en el servidor).
   Duplica a propósito el helper del dashboard: scr-core no lo exporta y esta ronda no
   puede tocarlo. Sin foto válida la fila degrada a tarjeta negra, no a hueco roto. */
function hlImgUrl(url) {
  const u = String(url || "");
  return /^(\/|https:\/\/)[^'"()\s]+$/.test(u) ? esc(u) : "";
}

/* Enlace de la publicación: https y sin comillas/espacios que puedan romper el atributo.
   El servidor ya restringe el host a Instagram (api/highlights/input.ts); esto es el cinturón
   del cliente para un dato viejo o alterado. Vacío ⇒ la fila NO navega. */
function igHref(url) {
  const u = String(url || "");
  return /^https:\/\/[^'"()\s<>]+$/.test(u) ? esc(u) : "";
}

// Categorías conocidas: el VALOR que se guarda va en español (es dato, no enum) y aquí solo
// se traduce la etiqueta. Una categoría fuera de la tabla se pinta cruda (escapada).
const CATS = ["Final", "Torneo", "Equipo", "Premio"];
function catLabel(cat) {
  const raw = String(cat || "");
  if (!raw) return "";
  const key = "hl.cat" + raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
  const label = t(key);
  return label === key ? esc(raw) : label;
}

/* ---------------- fila (1 por fila) ---------------- */

function adminBar(h) {
  // data-hl-name lleva el título ya escapado: en el atributo el navegador lo decodifica al
  // valor real para el diálogo de confirmación.
  return `<div class="hlv-admin">
    ${C.btn(t("hl.editBtn"), "outline", { size: "sm", ic: "pencil", attrs: `data-hl-edit="${esc(h.id || "")}"` })}
    <button class="btn btn-quiet btn--sm hlv-del" data-hl-del="${esc(h.id || "")}" data-hl-name="${esc(h.title || "")}">${IC.close}${t("hl.deleteBtn")}</button>
  </div>`;
}

function hlRow(h, i, staff) {
  const img = hlImgUrl(h.imageUrl);
  const ig = igHref(h.instagramUrl);
  const inner = `
    <span class="hlv-media${img ? "" : " hlv-media--empty"}"${img ? ` style="background-image:url('${img}')"` : ""}>${img ? "" : IC.trophy}</span>
    <span class="hlv-body">
      <span class="hlv-top">
        ${h.category ? C.chip(catLabel(h.category), "accent", { cls: "hlv-tag" }) : ""}
        ${h.dateLabel ? `<span class="hlv-date">${IC.calendar}${esc(h.dateLabel)}</span>` : ""}
      </span>
      <span class="hlv-t">${esc(h.title || "")}</span>
      <span class="hlv-cta${ig ? "" : " hlv-cta--off"}">${ig ? `${t("hl.openIg")}${IC.arrowUR}` : t("hl.noLink")}</span>
    </span>`;
  // Con enlace la fila ENTERA es el <a>; sin enlace es un <div> con el mismo marcado (misma
  // caja, sin afordancia de clic). Los botones del staff van FUERA del ancla: nunca anidados.
  const body = ig
    ? `<a class="hlv-link" href="${ig}" target="_blank" rel="noopener noreferrer">${inner}</a>`
    : `<div class="hlv-link hlv-link--off">${inner}</div>`;
  return `<article class="hlv-row fade-up" style="--d:${Math.min(i, 6)}">${body}${staff ? adminBar(h) : ""}</article>`;
}

/* ---------------- modal del staff ---------------- */

function highlightFields(prefill) {
  const p = prefill || {};
  const cur = String(p.category || "");
  // Si el logro trae una categoría fuera de la tabla, se antepone para no PERDERLA al editar.
  const opts = cur && CATS.indexOf(cur) === -1 ? [cur].concat(CATS) : CATS;
  return [
    { name: "title", label: t("hl.fieldTitle"), type: "text", req: true, value: p.title || "" },
    {
      type: "select", name: "category", label: t("hl.fieldCategory"), value: cur || "Final",
      options: opts.map((c) => ({ value: c, label: catLabel(c) })),
    },
    { name: "date", label: t("hl.fieldDate"), type: "date", value: p.dateISO || "" },
    { name: "imageUrl", label: t("hl.fieldImage"), type: "text", value: p.imageUrl || "", ph: "/img/hero-speaking.jpg" },
    { name: "instagramUrl", label: t("hl.fieldInstagram"), type: "text", value: p.instagramUrl || "", ph: "https://www.instagram.com/p/..." },
  ];
}

function highlightPayload(v) {
  return {
    title: String(v.title || ""),
    category: String(v.category || ""),
    date: String(v.date || ""),
    imageUrl: String(v.imageUrl || ""),
    instagramUrl: String(v.instagramUrl || ""),
  };
}

// Refresco "suave": re-pide el payload y vuelve a pintar la pantalla (mismo helper que
// scr-events usa tras gestionar un torneo; refresh() global es local de Aula.tsx).
async function softRefresh() {
  const w = window;
  try {
    const res = await fetch("/api/app-data");
    if (res.ok) {
      const fresh = await res.json();
      const role = DB.me?.role; // conserva el rol fijado por Aula.tsx
      Object.assign(DB, fresh);
      if (role) DB.me = { ...(fresh.me || {}), role };
    }
  } catch { /* silencioso */ }
  if (w.go) w.go("highlights");
}

/* ================= PANTALLA ================= */
S.highlights = {
  render() {
    const items = Array.isArray(DB.highlights) ? DB.highlights : [];
    const staff = isStaff();

    const back = `<div class="hlv-back">${C.btn(t("hl.back"), "outline", { size: "sm", ic: "chevL", attrs: 'data-go="dashboard"' })}</div>`;

    const head = `<div class="page-head page-head--rule fade-up"><div>
        <span class="ph-eyebrow">${t("hl.eyebrow")}</span>
        <h1 class="ph-title">${t("hl.title")}</h1>
        <div class="page-sub" style="margin-top:8px">${t("hl.subtitle")}</div></div>
      <div class="hlv-head-acts">
        ${items.length ? `<div class="stat-group">${C.statInline(items.length, t("hl.countLabel"), { accent: true })}</div>` : ""}
        ${staff ? C.btn(t("hl.newBtn"), "accent", { size: "sm", ic: "plus", attrs: 'data-hl-new="1"' }) : ""}
      </div></div>`;

    const body = items.length
      ? `<div class="hlv-list">${items.map((h, i) => hlRow(h, i, staff)).join("")}</div>`
      : `<div class="card fade-up"><div class="empty"><div class="ill">${IC.trophy}</div>
          <h2>${t("hl.emptyTitle")}</h2><p>${t("hl.emptyBody")}</p>
          ${staff ? C.btn(t("hl.newBtn"), "accent", { size: "sm", ic: "plus", attrs: 'data-hl-new="1"' }) : ""}
        </div></div>`;

    return back + head + body;
  },

  mount(root) {
    if (!root || !isStaff()) return;
    const w = window;

    const fail = (e) => w.toast?.((e && e.message) || t("hl.errAction"), "warn");

    // Alta
    root.querySelectorAll("[data-hl-new]").forEach((b) =>
      b.addEventListener("click", () => {
        if (!w.otrFormModal) { fail(null); return; }
        w.otrFormModal(t("hl.createTitle"), highlightFields(null), async (v) => {
          await w.api("/api/highlights", highlightPayload(v), "POST");
          w.toast?.(t("hl.created"), "ok");
          await softRefresh();
        });
      }));

    // Edición: el prefill sale del API (trae la fecha en ISO y las URLs, que el payload del
    // dashboard no lleva en crudo). Si el logro ya no está, se avisa en vez de abrir vacío.
    root.querySelectorAll("[data-hl-edit]").forEach((b) =>
      b.addEventListener("click", async () => {
        const id = b.getAttribute("data-hl-edit");
        if (!id || !w.otrFormModal) return;
        b.disabled = true;
        try {
          const d = await w.api("/api/highlights", null, "GET");
          const item = (Array.isArray(d && d.highlights) ? d.highlights : []).find((x) => x.id === id);
          if (!item) throw new Error(t("hl.errAction"));
          w.otrFormModal(t("hl.editTitle"), highlightFields(item), async (v) => {
            await w.api(`/api/highlights/${encodeURIComponent(id)}`, highlightPayload(v), "PATCH");
            w.toast?.(t("hl.updated"), "ok");
            await softRefresh();
          });
        } catch (e) { fail(e); }
        b.disabled = false;
      }));

    // Borrado (confirmación nativa, igual que los torneos del staff)
    root.querySelectorAll("[data-hl-del]").forEach((b) =>
      b.addEventListener("click", async () => {
        const id = b.getAttribute("data-hl-del");
        const name = b.getAttribute("data-hl-name") || "";
        if (!id) return;
        if (!w.confirm(t("hl.deleteConfirm").split("{name}").join(name))) return;
        b.disabled = true;
        try {
          await w.api(`/api/highlights/${encodeURIComponent(id)}`, null, "DELETE");
          w.toast?.(t("hl.deleted"), "ok");
          await softRefresh();
        } catch (e) { fail(e); b.disabled = false; }
      }));
  },
};
