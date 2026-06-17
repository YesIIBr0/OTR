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
import { getLang, t } from "./i18n";
export const S = {};

const NOTIF = [
  { k: "session_reminders", labelKey: "settings.notifSessionLabel", descKey: "settings.notifSessionDesc", def: true },
  { k: "weekly_digest", labelKey: "settings.notifWeeklyLabel", descKey: "settings.notifWeeklyDesc", def: true },
  { k: "debate_results", labelKey: "settings.notifDebateLabel", descKey: "settings.notifDebateDesc", def: true },
  { k: "marketplace", labelKey: "settings.notifMarketplaceLabel", descKey: "settings.notifMarketplaceDesc", def: false },
];

// Preferencias persistidas en backend (DB.me.notificationPrefs es un JSON string, puede ser null).
// localStorage queda como caché local; el server es la fuente de verdad entre dispositivos.
function serverPrefs() {
  try { const p = JSON.parse((DB.me && DB.me.notificationPrefs) || "null"); return p && typeof p === "object" ? p : null; } catch { return null; }
}

function notifOn(k, def) {
  const sp = serverPrefs();
  if (sp && Object.prototype.hasOwnProperty.call(sp, k)) return sp[k] === true;
  try { const v = localStorage.getItem("otr_notif_" + k); return v === null ? def : v === "1"; } catch { return def; }
}

// Estado actual de todos los toggles (server > localStorage > default) para construir el payload completo.
function currentPrefs() {
  const out = {};
  for (const n of NOTIF) out[n.k] = notifOn(n.k, n.def);
  return out;
}

// Switch on/off premium (verde de marca al activar). role=switch + aria-checked accesible.
function toggle(key, on) {
  return `<button type="button" role="switch" aria-checked="${on}" data-notif="${key}" aria-label="${t("settings.toggleAria")}"
    style="width:44px;height:25px;border-radius:100px;border:0;cursor:pointer;position:relative;flex:none;transition:background .2s var(--ease);background:${on ? "var(--otr-green)" : "var(--n-200)"}">
    <span style="position:absolute;top:3px;left:${on ? "22px" : "3px"};width:19px;height:19px;border-radius:50%;background:#fff;transition:left .2s var(--ease);box-shadow:0 1px 2px rgba(12,12,12,.25)"></span></button>`;
}

// [GAMIFICATION-1 §9] Switch para el opt-in de la clasificación pública (persiste en backend).
function lbToggle(on) {
  return `<button type="button" role="switch" aria-checked="${on}" data-leaderboard="1" aria-label="${t("settings.leaderboardAria")}"
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
    // DB.me.role llega en MINÚSCULA; normalizamos a MAYÚSCULA para todas las comparaciones
    // de abajo (roleLabel, badge, toggle de clasificación, privacidad). Antes, comparar contra
    // "ADMIN"/"TEACHER"/etc. siempre fallaba → roleLabel caía a "Estudiante" y el toggle de
    // clasificación nunca se mostraba (regresión de GAMIFICATION-1).
    const role = String(me.role || "").toUpperCase();
    const roleLabel = role === "ADMIN" ? t("settings.roleAdmin") : role === "TEACHER" ? t("settings.roleCoach") : role === "PARENT" ? t("settings.roleFamily") : t("settings.roleStudent");

    const account = `<div class="row vcenter" style="gap:14px;padding:8px 0 14px">
      ${C.avatar(esc(me.initials || "?"), { size: "lg", bg: "var(--otr-navy)" })}
      <div style="flex:1;min-width:0">
        <div style="font-weight:700;font-size:16px;letter-spacing:var(--track-tight)">${esc(me.name || "")}</div>
        <div class="faint" style="font-size:13px">${esc(me.email || "")}</div>
        <div style="margin-top:7px">${C.badge(roleLabel, role === "TEACHER" || role === "ADMIN" ? "navy" : "sky")}</div>
      </div>
      <button class="btn btn-soft btn-sm" data-go="profile" style="flex:none">${IC.user} ${t("settings.editProfile")}</button>
    </div>`;

    const langCtrl = `<div class="row" style="gap:3px;border:1px solid var(--border);border-radius:100px;padding:3px;display:inline-flex">
      ${["es", "en"].map((lg) => `<button type="button" data-set-lang="${lg}"
        style="border:0;border-radius:100px;padding:5px 15px;font-weight:600;font-size:12.5px;cursor:pointer;transition:.2s var(--ease);background:${lg === lang ? "var(--otr-navy)" : "transparent"};color:${lg === lang ? "#fff" : "var(--text-2)"}">${lg.toUpperCase()}</button>`).join("")}
    </div>`;

    const notif = NOTIF.map((n) => row(IC.bell, t(n.labelKey), t(n.descKey), toggle(n.k, notifOn(n.k, n.def)))).join("");

    const isMinor = me.ageBand === "minor";
    // [GAMIFICATION-1 §9] Clasificación pública: opt-out por usuario. Los menores NUNCA
    // aparecen en el ranking global (§9.4), así que no se les ofrece el toggle.
    const leaderboardRow = (role === "STUDENT" || role === "TEACHER")
      ? row(IC.trophy, t("settings.leaderboardTitle"),
          isMinor
            ? t("settings.leaderboardMinorDesc")
            : t("settings.leaderboardDesc"),
          isMinor ? `<span class="faint" style="font-size:12px">${t("settings.notAvailable")}</span>` : lbToggle(me.leaderboardOptIn !== false))
      : "";
    const privacy = [
      role === "PARENT"
        ? row(IC.lock, t("settings.childPrivacyTitle"), t("settings.childPrivacyDesc"), `<button class="btn btn-soft btn-sm" data-go="parent">${t("settings.manage")}</button>`)
        : row(IC.lock, t("settings.publicProfileTitle"), t("settings.publicProfileDesc"), `<button class="btn btn-soft btn-sm" data-go="lifetime">${t("settings.myJourney")} ${IC.arrowR}</button>`),
      leaderboardRow,
      row(IC.doc, t("settings.passwordTitle"), t("settings.passwordDesc"), `<button class="btn btn-soft btn-sm" data-action="change-pw">${t("settings.changePassword")}</button>`),
    ].join("");

    return `
    <div class="page-head fade-up"><div><p class="eyebrow">${t("settings.eyebrow")}</p>
      <h1 class="page-title">${t("settings.title")}</h1>
      <div class="page-sub">${t("settings.subtitle")}</div></div></div>

    ${card(t("settings.cardAccount"), account, 0)}
    ${card(t("settings.cardLanguage"), row("", t("settings.languageTitle"), t("settings.languageDesc"), langCtrl), 1)}
    ${card(t("settings.cardNotifications"), notif, 2)}
    ${card(t("settings.cardMembership"), row(IC.star, t("settings.planTitle"), t("settings.planDesc"), `<button class="btn btn-soft btn-sm" data-go="membership">${t("settings.manageMembership")} ${IC.arrowR}</button>`), 3)}
    ${card(t("settings.cardPrivacy"), privacy, 4)}

    <div class="card card-pad fade-up" style="--d:5;border-color:color-mix(in srgb,var(--danger) 30%,transparent)">
      <div class="row vcenter between" style="gap:14px;flex-wrap:wrap">
        <div><b style="font-size:14px">${t("settings.logoutTitle")}</b><div class="faint" style="font-size:12px;margin-top:2px">${t("settings.logoutDesc")}</div></div>
        <button class="btn btn-ghost btn-sm" data-action="logout" style="color:var(--danger);flex:none">${IC.logout} ${t("settings.logout")}</button>
      </div>
    </div>`;
  },

  mount(root) {
    if (!root) return;
    const w = window;
    // Idioma: reusa el toggle global (persistente en localStorage + re-render del shell).
    root.querySelectorAll("[data-set-lang]").forEach((b) =>
      b.addEventListener("click", () => { const lg = b.getAttribute("data-set-lang"); if (w.otrSetLang) w.otrSetLang(lg); }));
    // Notificaciones: persiste en backend (PATCH /api/profile) + caché local; toggle optimista accesible.
    root.querySelectorAll("[data-notif]").forEach((sw) =>
      sw.addEventListener("click", async () => {
        const k = sw.getAttribute("data-notif");
        const next = sw.getAttribute("aria-checked") !== "true";
        const knob = sw.querySelector("span");
        // Optimista: actualiza UI + caché local de inmediato.
        try { localStorage.setItem("otr_notif_" + k, next ? "1" : "0"); } catch {}
        sw.setAttribute("aria-checked", String(next));
        sw.style.background = next ? "var(--otr-green)" : "var(--n-200)";
        if (knob) knob.style.left = next ? "22px" : "3px";
        w.toast?.(next ? t("settings.notifEnabled") : t("settings.notifDisabled"), "ok");
        // Construye el objeto completo de prefs (con el nuevo valor) y persiste server-side.
        const prefs = currentPrefs();
        prefs[k] = next;
        try {
          await w.api("/api/profile", { notificationPrefs: JSON.stringify(prefs) }, "PATCH");
          if (w.DB?.me) w.DB.me.notificationPrefs = JSON.stringify(prefs);
        } catch {
          // Revertir el switch y la caché si falló el guardado.
          try { localStorage.setItem("otr_notif_" + k, next ? "0" : "1"); } catch {}
          sw.setAttribute("aria-checked", String(!next));
          sw.style.background = !next ? "var(--otr-green)" : "var(--n-200)";
          if (knob) knob.style.left = !next ? "22px" : "3px";
          w.toast?.(t("settings.saveFailed"), "error");
        }
      }));
    // [GAMIFICATION-1 §9] Clasificación pública: persiste en backend (PATCH /api/profile).
    const lb = root.querySelector("[data-leaderboard]");
    if (lb) lb.addEventListener("click", async () => {
      const next = lb.getAttribute("aria-checked") !== "true";
      lb.setAttribute("aria-checked", String(next));
      lb.style.background = next ? "var(--otr-green)" : "var(--n-200)";
      const knob = lb.querySelector("span"); if (knob) knob.style.left = next ? "22px" : "3px";
      try {
        await w.api("/api/profile", { leaderboardOptIn: next }, "PATCH");
        if (w.DB?.me) w.DB.me.leaderboardOptIn = next;
        w.toast?.(next ? t("settings.leaderboardVisible") : t("settings.leaderboardHidden"), "ok");
      } catch {
        // revertir el switch si falló
        lb.setAttribute("aria-checked", String(!next));
        lb.style.background = !next ? "var(--otr-green)" : "var(--n-200)";
        if (knob) knob.style.left = !next ? "22px" : "3px";
        w.toast?.("No se pudo guardar el cambio", "error");
      }
    });
    // [UIC-03] Cambiar contraseña: modal dedicado (actual + nueva + confirmar) → PATCH /api/profile.
    const pwBtn = root.querySelector('[data-action="change-pw"]');
    if (pwBtn) pwBtn.addEventListener("click", () => {
      if (!w.otrFormModal) { w.toast?.(t("settings.notAvailableHere"), "warn"); return; }
      w.otrFormModal(t("settings.changePassword"), [
        { name: "currentPassword", label: t("settings.currentPassword"), type: "password", req: true },
        { name: "newPassword", label: t("settings.newPassword"), type: "password", req: true },
        { name: "confirm", label: t("settings.confirmPassword"), type: "password", req: true },
      ], async (v) => {
        const cur = String(v.currentPassword || "").trim();
        const nw = String(v.newPassword || "").trim();
        const cf = String(v.confirm || "").trim();
        if (nw.length < 6) throw new Error(t("settings.passwordTooShort"));
        if (nw !== cf) throw new Error(t("settings.passwordMismatch"));
        await w.api("/api/profile", { currentPassword: cur, newPassword: nw }, "PATCH");
        w.toast?.(t("settings.passwordUpdated"), "ok");
      });
    });
  },
};
