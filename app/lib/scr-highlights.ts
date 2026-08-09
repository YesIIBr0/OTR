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
    // El input de URL sigue existiendo y ES la fuente de verdad del formulario (lo que se
    // envía a la API), pero deja de ser lo PRIMERO que ve el coach: encima se le inyecta la
    // zona de subida (wireHighlightImage) y este campo queda como el atajo "o pega una URL",
    // igual que el modal de recursos de scr-teacher acepta archivo O enlace externo.
    { name: "imageUrl", label: t("hl.imgUrlLabel"), type: "text", value: p.imageUrl || "", ph: "/img/hero-speaking.jpg" },
    { name: "instagramUrl", label: t("hl.fieldInstagram"), type: "text", value: p.instagramUrl || "", ph: "https://www.instagram.com/p/..." },
  ];
}

/* ---------------- subida de la foto (dropzone del modal) ----------------
   Isaac: «que en el otro portal de coach nosotros podamos subir en un view fácil». La foto
   se SUBE, no se pega. Camino: window.otrUpload (Aula.tsx) → POST /api/uploads → disco +
   fila Upload → /uploads/<uuid>.<ext>. NO se monta un canal nuevo ni se toca esa API.

   `kind: "image"` NO es decorativo: app/uploads/[...path] autoriza por objeto y solo deja
   pasar a cualquier autenticado los kinds PÚBLICOS (avatar | image | resource). Con
   cualquier otro kind el archivo sería del coach y la ALUMNA recibiría 404 al pintar la
   foto. "image" ya está en el enum documentado del modelo Upload.

   Validación: /api/uploads acepta bastante más que imágenes (PDF, audio, video, Office) y
   bloquea SVG/HTML y >25 MB. Aquí se ESTRECHA a foto —nunca se relaja— porque un PDF en
   Highlight.imageUrl no se ve: sale un hueco roto en la pantalla del alumno. */
const HL_UPLOAD_KIND = "image";
export const HL_IMAGE_MIME = ["image/png", "image/jpeg", "image/webp", "image/gif"];
// Espejo de MAX_UPLOAD_BYTES (app/lib/uploads.ts). No sustituye al tope del servidor —que
// sigue mandando— sino que evita gastar la subida entera para que la rechacen al final.
const HL_MAX_IMAGE_BYTES = 25 * 1024 * 1024;

/** Motivo por el que este archivo NO puede ser la foto de un logro ("" = adelante). */
export function hlImageReject(file) {
  if (!file) return "";
  const mime = String(file.type || "").toLowerCase().split(";")[0].trim();
  if (HL_IMAGE_MIME.indexOf(mime) === -1) return "hl.imgErrOnlyImages";
  if (typeof file.size === "number" && file.size > HL_MAX_IMAGE_BYTES) return "hl.imgErrTooBig";
  return "";
}

/** Vista previa + "quitar" (tras subir, o con la foto que ya tenía el logro al editar). */
export function hlUploadDone(url, name) {
  const src = hlImgUrl(url);
  if (!src) return "";
  return `<div class="hlv-up-done">
    <img class="hlv-up-img" src="${src}" alt="${t("hl.imgPreviewAlt")}"/>
    <div class="hlv-up-meta">
      ${name ? `<span class="hlv-up-ok">${IC.checkCircle}${t("hl.imgUploaded")}</span><span class="hlv-up-name">${esc(String(name))}</span>` : ""}
      <button type="button" class="btn btn-quiet btn--sm hlv-up-clear" data-hl-imgclear>${IC.close}${t("hl.imgRemove")}</button>
    </div>
  </div>`;
}

const hlUploadBusy = () =>
  `<div class="hlv-up-busy"><span class="spinner"></span>${t("hl.imgUploading")}</div>`;

/** Error honesto: el coach se entera de que NO quedó subida y de por qué. */
export function hlUploadErr(msg) {
  return `<div class="alert danger hlv-up-err"><span class="ai">${IC.flag}</span><div>
    <div class="at">${t("hl.imgErrTitle")}</div>${esc(String(msg || ""))}</div></div>`;
}

/** El bloque completo que se inyecta encima del campo de URL. `url` = foto actual (o ""). */
export function hlUploadBlock(url) {
  return `<div class="field hlv-up">
    <span class="label">${t("hl.fieldImage")}</span>
    <div class="dropzone hlv-drop" data-hl-drop>
      <div class="ill">${IC.file}</div>
      <b class="hlv-up-title">${t("hl.imgDropTitle")}</b>
      <p class="hlv-up-hint">${t("hl.imgHint")}</p>
      <button type="button" class="btn btn-outline btn--sm" data-hl-pick>${t("hl.imgPick")}</button>
      <input type="file" accept="${HL_IMAGE_MIME.join(",")}" data-hl-file style="display:none"/>
    </div>
    <div class="hlv-up-state" data-hl-state role="status" aria-live="polite">${hlUploadDone(url, "")}</div>
  </div>`;
}

/* Cablea la zona de subida DENTRO del modal del kit (otrFormModal, Aula.tsx).
   Por qué inyectar y no un modal propio: formModal no tiene tipo "file" y Aula.tsx es de
   otro agente esta ronda; duplicar el modal costaría perder su validación de requeridos,
   el foco, aria-describedby y el Enter/Esc. El input de URL sigue siendo el valor que lee
   el modal al guardar, así que la subida solo tiene que escribir ahí. */
function wireHighlightImage(scrim) {
  const w = window;
  const urlInput = scrim && scrim.querySelector('[data-f="imageUrl"]');
  if (!urlInput) return;
  const fieldWrap = urlInput.closest(".field") || urlInput.parentElement;
  if (!fieldWrap || !fieldWrap.parentElement) return;

  const holder = document.createElement("div");
  holder.innerHTML = hlUploadBlock(urlInput.value || "");
  const block = holder.firstElementChild;
  fieldWrap.parentElement.insertBefore(block, fieldWrap);

  const fileInput = block.querySelector("[data-hl-file]");
  const drop = block.querySelector("[data-hl-drop]");
  const state = block.querySelector("[data-hl-state]");
  const okBtn = scrim.querySelector("[data-ok]");
  const paint = (html) => { state.innerHTML = html; };

  async function handle(file) {
    const err = hlImageReject(file);
    if (err) { paint(hlUploadErr(t(err))); w.toast?.(t(err), "warn"); fileInput.value = ""; return; }
    paint(hlUploadBusy());
    // Guardar a medias subida deja el logro sin foto: se bloquea el botón mientras tanto.
    if (okBtn) okBtn.disabled = true;
    try {
      const res = await w.otrUpload(file, HL_UPLOAD_KIND);
      if (!res || !res.url) throw new Error(t("hl.imgErrTitle"));
      urlInput.value = res.url;
      paint(hlUploadDone(res.url, res.original || file.name));
    } catch (e) {
      // otrUpload ya avisa por toast con el mensaje del servidor; aquí queda escrito en el
      // formulario para que no se guarde creyendo que la foto entró.
      paint(hlUploadErr((e && e.message) || t("hl.imgErrTitle")));
      fileInput.value = "";
    } finally {
      if (okBtn) okBtn.disabled = false;
    }
  }

  block.querySelector("[data-hl-pick]")?.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", () => {
    const f = fileInput.files && fileInput.files[0];
    if (f) handle(f);
  });

  // Arrastrar y soltar sobre la zona (delegado: el botón "quitar" se repinta con el estado).
  ["dragenter", "dragover"].forEach((ev) =>
    drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add("is-over"); }));
  ["dragleave", "dragend", "drop"].forEach((ev) =>
    drop.addEventListener(ev, () => drop.classList.remove("is-over")));
  drop.addEventListener("drop", (e) => {
    e.preventDefault();
    const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) handle(f);
  });

  state.addEventListener("click", (e) => {
    if (!e.target.closest || !e.target.closest("[data-hl-imgclear]")) return;
    urlInput.value = "";
    fileInput.value = "";
    paint("");
  });

  // Si el coach usa el atajo de pegar URL, la vista previa también le responde.
  urlInput.addEventListener("change", () => paint(hlUploadDone(urlInput.value, "")));
}

/* El modal se crea SÍNCRONAMENTE (formModal hace appendChild antes de devolver), así que
   justo después el último .modal-scrim del documento es el nuestro. */
function wireLastModalImage() {
  try {
    const all = document.querySelectorAll(".modal-scrim");
    if (all.length) wireHighlightImage(all[all.length - 1]);
  } catch { /* sin DOM (tests de builder) no hay nada que cablear */ }
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
        wireLastModalImage();
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
          wireLastModalImage();
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
