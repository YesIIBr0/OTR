// @ts-nocheck
/* OTR · Ajustes (PRD §3.1 ⚙️ Settings) — S.settings.
   Hub role-scoped: cuenta/perfil, idioma (ES/EN persistente), notificaciones,
   membresía/facturación, privacidad y consentimiento, seguridad y cerrar sesión.
   REUTILIZA lo existente: el toggle global de idioma (window.otrSetLang), y enruta
   a las pantallas que ya gestionan cada cosa (profile / membership / parent / lifetime).
   Las preferencias de notificación persisten en localStorage (sin backend en el MVP).
   Premium, sin emojis, iconos IC.*. */
import { DB } from "./data";
import { C } from "./components";
import { IC } from "./icons";
import { esc } from "./esc";
import { getLang } from "./i18n";
export const S = {};

const NOTIF = [
  { k: "session_reminders", label: "Recordatorios de sesiones", desc: "Avisos antes de cada sesión reservada.", def: true },
  { k: "weekly_digest", label: "Resumen semanal", desc: "Tu progreso, racha y próximos pasos cada semana.", def: true },
  { k: "debate_results", label: "Resultados de debate", desc: "Cuando tu rating se mueve o asciendes de tier.", def: true },
  { k: "marketplace", label: "Novedades del marketplace", desc: "Nuevos coaches y recomendaciones para ti.", def: false },
];

function notifOn(k, def) {
  try { const v = localStorage.getItem("otr_notif_" + k); return v === null ? def : v === "1"; } catch { return def; }
}

// Switch on/off premium (verde de marca al activar). role=switch + aria-checked accesible.
function toggle(key, on) {
  return `<button type="button" role="switch" aria-checked="${on}" data-notif="${key}" aria-label="Activar/desactivar"
    style="width:44px;height:25px;border-radius:100px;border:0;cursor:pointer;position:relative;flex:none;transition:background .2s var(--ease);background:${on ? "var(--otr-green)" : "var(--n-200)"}">
    <span style="position:absolute;top:3px;left:${on ? "22px" : "3px"};width:19px;height:19px;border-radius:50%;background:#fff;transition:left .2s var(--ease);box-shadow:0 1px 2px rgba(12,12,12,.25)"></span></button>`;
}

function row(icon, title, desc, right) {
  return `<div class="row vcenter between" style="gap:14px;padding:13px 0;border-bottom:1px solid var(--border)">
    <div class="row vcenter" style="gap:12px;min-width:0">
      ${icon ? `<span style="display:inline-flex;width:18px;height:18px;color:var(--text-2);flex:none">${icon}</span>` : ""}
      <div style="min-width:0"><div style="font-weight:600;font-size:13.5px">${title}</div>${desc ? `<div class="faint" style="font-size:12px;margin-top:1px;line-height:1.4">${desc}</div>` : ""}</div>
    </div>
    ${right ? `<div style="flex:none">${right}</div>` : ""}
  </div>`;
}

function card(title, inner, d = 0) {
  return `<div class="card card-pad fade-up" style="--d:${d};margin-bottom:16px"><b style="font-size:14px">${title}</b><div style="margin-top:4px">${inner}</div></div>`;
}

S.settings = {
  render() {
    const me = DB.me || {};
    const lang = getLang();
    const role = me.role;
    const roleLabel = role === "ADMIN" ? "Administrador" : role === "TEACHER" ? "Coach" : role === "PARENT" ? "Familia" : "Estudiante";

    const account = `<div class="row vcenter" style="gap:14px;padding:8px 0 14px">
      ${C.avatar(esc(me.initials || "?"), { size: "lg", bg: "var(--otr-navy)" })}
      <div style="flex:1;min-width:0">
        <div style="font-weight:700;font-size:16px;letter-spacing:var(--track-tight)">${esc(me.name || "")}</div>
        <div class="faint" style="font-size:13px">${esc(me.email || "")}</div>
        <div style="margin-top:7px">${C.badge(roleLabel, role === "TEACHER" || role === "ADMIN" ? "navy" : "sky")}</div>
      </div>
      <button class="btn btn-soft btn-sm" data-go="profile" style="flex:none">${IC.user} Editar perfil</button>
    </div>`;

    const langCtrl = `<div class="row" style="gap:3px;border:1px solid var(--border);border-radius:100px;padding:3px;display:inline-flex">
      ${["es", "en"].map((lg) => `<button type="button" data-set-lang="${lg}"
        style="border:0;border-radius:100px;padding:5px 15px;font-weight:600;font-size:12.5px;cursor:pointer;transition:.2s var(--ease);background:${lg === lang ? "var(--otr-navy)" : "transparent"};color:${lg === lang ? "#fff" : "var(--text-2)"}">${lg.toUpperCase()}</button>`).join("")}
    </div>`;

    const notif = NOTIF.map((n) => row(IC.bell, n.label, n.desc, toggle(n.k, notifOn(n.k, n.def)))).join("");

    const privacy = [
      role === "PARENT"
        ? row(IC.lock, "Consentimiento y privacidad del hijo/a", "Aprobaciones de reserva, visibilidad de sesiones y perfil público del menor.", `<button class="btn btn-soft btn-sm" data-go="parent">Gestionar</button>`)
        : row(IC.lock, "Perfil público", "Controla si tu trayectoria es compartible (apagado por defecto para menores).", `<button class="btn btn-soft btn-sm" data-go="lifetime">Mi trayectoria ${IC.arrowR}</button>`),
      row(IC.doc, "Contraseña", "Para cambiarla, cierra sesión y usa “¿Olvidaste tu contraseña?” en el inicio.", ""),
    ].join("");

    return `
    <div class="page-head fade-up"><div><p class="eyebrow">Cuenta</p>
      <div class="page-title">Ajustes</div>
      <div class="page-sub">Tu cuenta, idioma, notificaciones, membresía y privacidad</div></div></div>

    ${card("Cuenta", account, 0)}
    ${card("Idioma", row("", "Idioma de la plataforma", "Cambia toda la interfaz al instante.", langCtrl), 1)}
    ${card("Notificaciones", notif, 2)}
    ${card("Membresía y facturación", row(IC.star, "Tu plan", "Revisa tu plan, beneficios y recibos.", `<button class="btn btn-soft btn-sm" data-go="membership">Gestionar membresía ${IC.arrowR}</button>`), 3)}
    ${card("Privacidad y seguridad", privacy, 4)}

    <div class="card card-pad fade-up" style="--d:5;border-color:color-mix(in srgb,var(--danger) 30%,transparent)">
      <div class="row vcenter between" style="gap:14px;flex-wrap:wrap">
        <div><b style="font-size:14px">Cerrar sesión</b><div class="faint" style="font-size:12px;margin-top:2px">Saldrás de tu cuenta en este dispositivo.</div></div>
        <button class="btn btn-ghost btn-sm" data-action="logout" style="color:var(--danger);flex:none">${IC.logout} Cerrar sesión</button>
      </div>
    </div>`;
  },

  mount(root) {
    if (!root) return;
    const w = window;
    // Idioma: reusa el toggle global (persistente en localStorage + re-render del shell).
    root.querySelectorAll("[data-set-lang]").forEach((b) =>
      b.addEventListener("click", () => { const lg = b.getAttribute("data-set-lang"); if (w.otrSetLang) w.otrSetLang(lg); }));
    // Notificaciones: persistencia local (MVP) + toggle visual accesible.
    root.querySelectorAll("[data-notif]").forEach((sw) =>
      sw.addEventListener("click", () => {
        const k = sw.getAttribute("data-notif");
        const next = sw.getAttribute("aria-checked") !== "true";
        try { localStorage.setItem("otr_notif_" + k, next ? "1" : "0"); } catch {}
        sw.setAttribute("aria-checked", String(next));
        sw.style.background = next ? "var(--otr-green)" : "var(--n-200)";
        const knob = sw.querySelector("span"); if (knob) knob.style.left = next ? "22px" : "3px";
        w.toast?.(next ? "Notificación activada" : "Notificación desactivada", "ok");
      }));
  },
};
