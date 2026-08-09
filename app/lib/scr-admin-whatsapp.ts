// @ts-nocheck
/* OTR · Admin → WhatsApp (bandeja del equipo, Fase 1). Pantalla role-scoped ADMIN/TEACHER.
   Meta Cloud API: el equipo recibe y responde 1 a 1 desde un número de WhatsApp Business
   real sin usar la app de WhatsApp directamente. A PROPÓSITO no hay ningún botón de "enviar
   a todos/lista" — eso exige plantillas pre-aprobadas por Meta (fuera de alcance, decisión de
   negocio pendiente).

   No lee DB.* : en mount hace window.api('/api/whatsapp/conversations','GET') y, al elegir
   un contacto, window.api('/api/whatsapp/conversations/<id>','GET'). Enviar hace POST a
   /api/whatsapp/send y refetch del hilo (sin polling automático para el MVP).

   Patrón de la casa: render(state)->string + mount(root,state); IC.* iconos, C.avatar,
   reusa las clases de mensajería ya existentes (msg-wrap, msg-list, convo, msg-thread,
   mt-head/mt-body/mt-compose, bubble-row, bubble — ver scr-community.ts S.messages) para
   un look nativo del Aula.
   Contrato de escape: el body de cada mensaje YA viene escapado por el servidor (webhook y
   /send escapan al guardar) — esta pantalla lo renderiza CRUDO, sin volver a esc()arlo. */
import { C } from "./components";
import { IC } from "./icons";
import { esc } from "./esc";
import { t, registerDict } from "./i18n";
// [F4.1] Registra el diccionario de esta pantalla en SU chunk (fuera del inicial): wap.*. Ver app/lib/i18n.ts.
import { dict as d_wap } from "./i18n-keys/wap";
registerDict(d_wap);

export const S = {};

/* ---------------- estado del cliente (window.__adminWhatsapp) ---------------- */
function waState() {
  const w = window as any;
  if (!w.__adminWhatsapp) {
    w.__adminWhatsapp = {
      loaded: false,
      loading: false,
      error: false,
      conversations: [],
      activeId: null,
      thread: { loaded: false, loading: false, error: false, contact: null, messages: [] },
      sending: false,
    };
  }
  return w.__adminWhatsapp;
}

/* ---------------- helpers ---------------- */
const ini = (name) =>
  (String(name || "?").split(" ").map((w) => w[0]).join("") || "?").slice(0, 2).toUpperCase();

// Tiempo relativo corto ("ahora" / "hace 5 min" / "hace 3 h" / "hace 2 d"); más allá de una
// semana cae a la fecha corta localizada — evitamos un "hace 40 d" poco legible.
function fmtRelative(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const diffMs = Date.now() - d.getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return t("wap.timeNow");
  if (min < 60) return t("wap.timeMin").replace("{n}", String(min));
  const hr = Math.floor(min / 60);
  if (hr < 24) return t("wap.timeHour").replace("{n}", String(hr));
  const day = Math.floor(hr / 24);
  if (day < 7) return t("wap.timeDay").replace("{n}", String(day));
  try {
    return d.toLocaleDateString();
  } catch {
    return String(iso).slice(0, 10);
  }
}

const displayName = (c) => c.name || c.phone || t("wap.unnamedContact");

/* ---------------- lista de conversaciones ---------------- */
function convoList(st) {
  if (!st.loaded && st.loading) {
    return `<div class="empty" style="padding:32px 16px"><div class="ill">${IC.msg}</div><h4>${t("wap.loadingTitle")}</h4><p>${t("wap.loadingBody")}</p></div>`;
  }
  if (st.error) {
    return `<div class="empty" style="padding:32px 16px"><div class="ill">${IC.flag}</div><h4>${t("wap.errLoad")}</h4></div>`;
  }
  const rows = Array.isArray(st.conversations) ? st.conversations : [];
  if (!rows.length) {
    return `<div class="empty" style="padding:32px 16px"><div class="ill">${IC.msg}</div><h4>${t("wap.listEmptyTitle")}</h4><p>${t("wap.listEmptyBody")}</p></div>`;
  }
  return rows
    .map((c) => {
      const active = c.id === st.activeId;
      const last = c.lastMessage;
      const preview = last ? (last.direction === "OUT" ? "→ " : "") + last.body : "";
      return `
      <div class="convo ${active ? "active" : ""}" data-wap-convo="${esc(c.id)}" role="button" tabindex="0" style="cursor:pointer">
        ${C.avatar(esc(ini(displayName(c))), { size: "sm", bg: "var(--otr-navy)" })}
        <div class="convo-main">
          <div class="convo-top"><b>${esc(displayName(c))}</b><span class="faint" style="font-size:11.5px">${esc(fmtRelative(c.lastMessageAt))}</span></div>
          <div class="convo-last">${preview}</div>
        </div>
      </div>`;
    })
    .join("");
}

/* ---------------- panel de conversación activa ---------------- */
function threadPanel(st) {
  if (!st.activeId) {
    return `<div class="empty" style="margin:auto;padding:48px 24px;text-align:center"><div class="ill">${IC.msg}</div><h4>${t("wap.noSelectionTitle")}</h4><p>${t("wap.noSelectionBody")}</p></div>`;
  }
  const th = st.thread;
  if (!th.loaded && th.loading) {
    return `<div class="empty" style="margin:auto;padding:48px 24px;text-align:center"><div class="ill">${IC.msg}</div><h4>${t("wap.loadingTitle")}</h4></div>`;
  }
  if (th.error || !th.contact) {
    return `<div class="empty" style="margin:auto;padding:48px 24px;text-align:center"><div class="ill">${IC.flag}</div><h4>${t("wap.errLoadThread")}</h4></div>`;
  }
  const contact = th.contact;
  const messages = Array.isArray(th.messages) ? th.messages : [];
  const bubbles = messages
    .map((m) => {
      const out = m.direction === "OUT";
      // [MOCKUP 2026-08] Chip del kit (r3, versalitas): "fallido" es lo único que pide acción
      // en el hilo, así que va en naranja sólido con texto negro.
      const statusTag =
        out && m.status === "failed"
          ? `<span class="chip chip--accent" style="margin-left:6px">${t("wap.statusFailed")}</span>`
          : out && m.status === "queued"
            ? `<span class="faint" style="font-size:10px;margin-left:6px">${t("wap.statusQueued")}</span>`
            : "";
      // m.body ya viene escapado por el servidor (webhook / send) — se renderiza CRUDO.
      return `
      <div class="bubble-row ${out ? "me" : ""}">
        <div class="bubble">${m.body}<span class="b-time">${esc(fmtRelative(m.createdAt))}${statusTag}</span></div>
      </div>`;
    })
    .join("");
  return `
  <div class="mt-head">
    ${C.avatar(esc(ini(displayName(contact))), { size: "sm", bg: "var(--otr-navy)" })}
    <div><b>${esc(displayName(contact))}</b>${contact.name ? `<div class="faint" style="font-size:12px">${esc(contact.phone)}</div>` : ""}</div>
  </div>
  <div class="mt-body" id="wap-body">${bubbles}</div>
  <div class="mt-compose">
    <input class="input" id="wap-input" placeholder="${t("wap.composePh")}" style="flex:1" ${st.sending ? "disabled" : ""}/>
    <button class="btn btn-primary" id="wap-send" style="width:42px;padding:0" ${st.sending ? "disabled" : ""}>${IC.arrowR}</button>
  </div>`;
}

/* ================= PANTALLA ================= */
S.adminWhatsapp = {
  render(state) {
    const st = waState();
    return `
    <!-- [MOCKUP 2026-08] Cabecera del kit: h1 de 40px + línea inferior (sin eyebrow, R3). -->
    <div class="page-head page-head--rule fade-up"><div>
      <h1 class="ph-title">${t("wap.title")}</h1>
      <div class="page-sub">${t("wap.subtitle")}</div>
    </div></div>

    <div class="row" style="margin-bottom:14px;justify-content:flex-end">
      <button class="btn btn-outline btn--sm" id="wap-refresh" ${st.loading ? "disabled" : ""}>${IC.refresh} ${st.loading ? t("wap.refreshing") : t("wap.refresh")}</button>
    </div>

    <div class="msg-wrap fade-up" style="--d:1">
      <aside class="msg-list" id="wap-list">${convoList(st)}</aside>
      <section class="msg-thread" id="wap-thread">${threadPanel(st)}</section>
    </div>`;
  },

  mount(root, state) {
    const w = window;
    const st = waState();

    const repaint = () => {
      const page = root.querySelector(".page");
      if (!page) return;
      page.innerHTML = S.adminWhatsapp.render(state);
      S.adminWhatsapp.mount(root, state);
    };

    const loadConversations = () => {
      st.loading = true;
      w.api("/api/whatsapp/conversations", null, "GET")
        .then((d) => {
          st.conversations = Array.isArray(d && d.conversations) ? d.conversations : [];
          st.error = false;
          st.loaded = true;
        })
        .catch((e) => {
          st.conversations = [];
          st.error = true;
          st.loaded = true;
          w.toast?.((e && e.message) || t("wap.errLoad"), "danger");
        })
        .finally(() => {
          st.loading = false;
          repaint();
        });
    };

    const loadThread = (id) => {
      st.thread.loading = true;
      w.api(`/api/whatsapp/conversations/${encodeURIComponent(id)}`, null, "GET")
        .then((d) => {
          st.thread.contact = (d && d.contact) || null;
          st.thread.messages = Array.isArray(d && d.messages) ? d.messages : [];
          st.thread.error = false;
          st.thread.loaded = true;
        })
        .catch((e) => {
          st.thread.contact = null;
          st.thread.messages = [];
          st.thread.error = true;
          st.thread.loaded = true;
          w.toast?.((e && e.message) || t("wap.errLoadThread"), "danger");
        })
        .finally(() => {
          st.thread.loading = false;
          repaint();
        });
    };

    // Carga inicial (una sola vez por sesión de pantalla).
    if (!st.loaded && !st.loading) {
      loadConversations();
      return;
    }

    root.querySelector("#wap-refresh")?.addEventListener("click", () => {
      loadConversations();
      if (st.activeId) loadThread(st.activeId);
    });

    root.querySelectorAll("[data-wap-convo]").forEach((el) => {
      const open = () => {
        const id = el.getAttribute("data-wap-convo");
        if (!id || id === st.activeId) return;
        st.activeId = id;
        // loading:true YA en el reset — si no, el repaint síncrono de abajo (antes de que
        // loadThread() marque loading) cae en la rama de error ("!contact" sin loading true).
        st.thread = { loaded: false, loading: true, error: false, contact: null, messages: [] };
        repaint();
        loadThread(id);
      };
      el.addEventListener("click", open);
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          open();
        }
      });
    });

    const input = root.querySelector("#wap-input");
    const sendBtn = root.querySelector("#wap-send");
    if (input && sendBtn && st.activeId) {
      const send = () => {
        const body = String(input.value || "").trim();
        if (!body || st.sending) return;
        st.sending = true;
        repaint();
        w.api("/api/whatsapp/send", { contactId: st.activeId, body }, "POST")
          .then(() => {
            w.toast?.(t("wap.sendOk"), "ok");
          })
          .catch((e) => {
            w.toast?.((e && e.message) || t("wap.sendError"), "danger");
          })
          .finally(() => {
            st.sending = false;
            loadConversations();
            loadThread(st.activeId);
          });
      };
      sendBtn.addEventListener("click", send);
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") send();
      });
    }

    const body = root.querySelector("#wap-body");
    if (body) body.scrollTop = body.scrollHeight;
  },
};
