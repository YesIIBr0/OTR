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
import { getLang, t, registerDict } from "./i18n";
// [F4.1] Registra el diccionario de esta pantalla en SU chunk (fuera del inicial): settings.*. Ver app/lib/i18n.ts.
import { dict as d_settings } from "./i18n-keys/settings";
registerDict(d_settings);
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
    <span style="position:absolute;top:3px;left:${on ? "22px" : "3px"};width:19px;height:19px;border-radius:50%;background:#fff;transition:left .2s var(--ease);box-shadow:0 1px 2px rgba(23,23,23,.25)"></span></button>`;
}

// [GAMIFICATION-1 §9] Switch para el opt-in de la clasificación pública (persiste en backend).
function lbToggle(on) {
  return `<button type="button" role="switch" aria-checked="${on}" data-leaderboard="1" aria-label="${t("settings.leaderboardAria")}"
    style="width:44px;height:25px;border-radius:100px;border:0;cursor:pointer;position:relative;flex:none;transition:background .2s var(--ease);background:${on ? "var(--otr-green)" : "var(--n-200)"}">
    <span style="position:absolute;top:3px;left:${on ? "22px" : "3px"};width:19px;height:19px;border-radius:50%;background:#fff;transition:left .2s var(--ease);box-shadow:0 1px 2px rgba(23,23,23,.25)"></span></button>`;
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
  return `<div class="card card-pad fade-up" style="--d:${d};margin-bottom:16px">${C.secTitle(title, { sm: true })}<div>${inner}</div></div>`;
}

// [BUG vínculo-padre §11.3] El lado del ALUMNO que faltaba: un padre/madre reclamó un vínculo
// (initiatedBy="parent") sobre esta cuenta y quedó PENDING por diseño (COPPA — un padre no
// activa un vínculo sobre un menor por su sola palabra). Antes nada mostraba esta solicitud
// del lado del alumno, así que nunca se confirmaba. DB.pendingGuardianRequests (queries.ts,
// solo para STUDENT) trae { id, parentName, parentEmail, parentInitials } por solicitud.
function guardianRequestsBlock(requests) {
  if (!requests || !requests.length) return "";
  return `
  <div class="card card-pad fade-up" style="border-color:var(--otr-sky);margin-bottom:16px">
    <div class="row between vcenter">
      <b style="font-size:14px">${t("settings.guardianRequestsTitle")}</b>
      ${C.chip(String(requests.length), "black")}
    </div>
    <p class="muted" style="font-size:12.5px;margin-top:4px">${t("settings.guardianRequestsBody")}</p>
    <div class="stack" style="gap:0;margin-top:6px">
      ${requests.map((r, i) => `
      <div class="lrow fade-up" style="padding:12px 0;gap:12px;border-bottom:1px solid var(--border);--d:${i}">
        ${C.avatar(esc(r.parentInitials || "?"), { size: "sm", bg: "var(--otr-sky-lo)" })}
        <div style="flex:1;min-width:0">
          <b style="font-size:13.5px">${t("settings.guardianRequestLine").replace("{name}", esc(r.parentName || t("settings.guardianFallback")))}</b>
          <div class="faint" style="font-size:12px;margin-top:2px">${esc(r.parentEmail || "")}</div>
        </div>
        <div class="row" style="gap:6px;flex:none">
          <button class="btn btn-accent btn--sm" data-guardian-confirm="${esc(r.id)}">${IC.check} ${t("settings.guardianConfirm")}</button>
          <button class="btn btn-outline btn--sm" data-guardian-reject="${esc(r.id)}">${t("settings.guardianReject")}</button>
        </div>
      </div>`).join("")}
    </div>
  </div>`;
}

/* [R5] 2FA TOTP del ADMIN. Estado del flujo de alta en window.__totp2fa:
   null = reposo; { secret, otpauth } = esperando el código de confirmación. El SECRETO
   nunca está en DB.* (viene de POST /api/auth/totp setup y muere al confirmar/cancelar). */
function totpRow() {
  const w = window;
  const enabled = !!(DB.me && DB.me.totpEnabled);
  const setup = w.__totp2fa || null;
  if (setup) {
    return `
    <div class="lrow" style="padding:14px 0;border-bottom:1px solid var(--border);display:block">
      <b style="font-size:13.5px">${t("settings.totpTitle")}</b>
      <p class="muted" style="font-size:12.5px;margin-top:4px">${t("settings.totpSetupHelp")}</p>
      <div class="card" style="padding:10px 12px;margin-top:8px;background:var(--surface-2)">
        <div style="font-size:11.5px" class="faint">${t("settings.totpSecretLabel")}</div>
        <code style="font-size:13px;letter-spacing:1px;user-select:all;word-break:break-all">${esc(setup.secret)}</code>
      </div>
      <div class="row vcenter" style="gap:8px;margin-top:10px;flex-wrap:wrap">
        <input class="input" id="totp-code" inputmode="numeric" maxlength="6" placeholder="123456" style="max-width:130px"/>
        <button class="btn btn-accent btn--sm" data-totp="enable">${t("settings.totpConfirm")}</button>
        <button class="btn btn-outline btn--sm" data-totp="cancel">${t("settings.totpCancel")}</button>
      </div>
    </div>`;
  }
  if (enabled) {
    return `
    <div class="lrow" style="padding:14px 0;border-bottom:1px solid var(--border);display:block">
      <div class="row between vcenter" style="gap:10px;flex-wrap:wrap">
        <div>
          <b style="font-size:13.5px">${t("settings.totpTitle")}</b>
          <span style="margin-left:8px">${C.chip(t("settings.totpOn"), "accent")}</span>
          <p class="muted" style="font-size:12.5px;margin-top:4px">${t("settings.totpOnDesc")}</p>
        </div>
        <div class="row vcenter" style="gap:8px">
          <input class="input" id="totp-code" inputmode="numeric" maxlength="6" placeholder="123456" style="max-width:130px"/>
          <button class="btn btn-outline btn--sm" data-totp="disable" style="color:var(--danger)">${t("settings.totpDisable")}</button>
        </div>
      </div>
    </div>`;
  }
  return `
  <div class="lrow" style="padding:14px 0;border-bottom:1px solid var(--border)">
    <div style="flex:1">
      <b style="font-size:13.5px">${t("settings.totpTitle")}</b>
      <p class="muted" style="font-size:12.5px;margin-top:4px">${t("settings.totpOffDesc")}</p>
    </div>
    <button class="btn btn-outline btn--sm" data-totp="setup">${t("settings.totpEnable")}</button>
  </div>`;
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
        ${/* [GOAL-E4 #11] A 390 el correo se salía de su caja (118 px en un hueco de 99) y
              quedaba TAPADO por "Editar perfil": se leía "rosa.fermin@otr.d". Elipsis + title
              con el correo completo (el min-width:0 del contenedor ya permite encoger). */""}
        <div class="faint" style="font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(me.email || "")}">${esc(me.email || "")}</div>
        <div style="margin-top:7px">${C.chip(roleLabel, role === "TEACHER" || role === "ADMIN" ? "black" : "outline")}</div>
      </div>
      <button class="btn btn-outline btn--sm" data-go="profile" style="flex:none">${IC.user} ${t("settings.editProfile")}</button>
    </div>`;

    // Segmented control del mockup (.set-seg en screens.css): rectángulo r5, activo
    // NEGRO. Era una pill con estilos inline; el mockup no tiene pills.
    const langCtrl = `<div class="set-seg">
      ${["es", "en"].map((lg) => `<button type="button" data-set-lang="${lg}" aria-pressed="${lg === lang}">${lg.toUpperCase()}</button>`).join("")}
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
    // [SONDEO 2026-08-09 · menor] "Perfil público → Mi trayectoria" es la página /p/<slug>
    // del ALUMNO (su lifetime). Al ADMIN se le ofrecía igual, como "Gestionar membresía":
    // conceptos de alumno sin filtrar. Se filtran por rol siguiendo el patrón que ya usaba
    // el ítem de 2FA de esta misma lista (`role === "ADMIN" ? [...] : []`).
    const privacy = [
      role === "ADMIN"
        ? ""
        : role === "PARENT"
          ? row(IC.lock, t("settings.childPrivacyTitle"), t("settings.childPrivacyDesc"), `<button class="btn btn-outline btn--sm" data-go="parent">${t("settings.manage")}</button>`)
          : row(IC.lock, t("settings.publicProfileTitle"), t("settings.publicProfileDesc"), `<button class="btn btn-outline btn--sm" data-go="lifetime">${t("settings.myJourney")} ${IC.arrowR}</button>`),
      leaderboardRow,
      row(IC.doc, t("settings.passwordTitle"), t("settings.passwordDesc"), `<button class="btn btn-outline btn--sm" data-action="change-pw">${t("settings.changePassword")}</button>`),
      // [R5] 2FA TOTP — solo para ADMIN (la llave de los datos de menores no puede ser solo
      // una contraseña). El flujo entero vive en window.__totp2fa + los handlers del mount.
      ...(role === "ADMIN" ? [totpRow()] : []),
    ].join("");

    // [BUG vínculo-padre §11.3] Solo STUDENT recibe pendingGuardianRequests (queries.ts lo
    // añade role-scoped, igual que myBookings/parent) — otros roles nunca ven este banner.
    const guardianRequests = role === "STUDENT" && Array.isArray(DB.pendingGuardianRequests) ? DB.pendingGuardianRequests : [];

    return `
    <div class="page-head page-head--rule fade-up"><div><p class="ph-eyebrow">${t("settings.eyebrow")}</p>
      <h1 class="ph-title">${t("settings.title")}</h1>
      <div class="page-sub">${t("settings.subtitle")}</div></div></div>

    ${guardianRequestsBlock(guardianRequests)}
    ${card(t("settings.cardAccount"), account, 0)}
    ${card(t("settings.cardLanguage"), row("", t("settings.languageTitle"), t("settings.languageDesc"), langCtrl), 1)}
    ${card(t("settings.cardNotifications"), notif, 2)}
    ${/* [SONDEO menor] La membresía (Free/Pro) es del alumno y de su familia; la cuenta del
          equipo OTR no tiene plan que gestionar ni recibos que revisar. */""}
    ${role === "ADMIN" ? "" : card(t("settings.cardMembership"), row(IC.star, t("settings.planTitle"), t("settings.planDesc"), `<button class="btn btn-outline btn--sm" data-go="membership">${t("settings.manageMembership")} ${IC.arrowR}</button>`), 3)}
    ${card(t("settings.cardPrivacy"), privacy, 4)}

    <div class="card card-pad fade-up" style="--d:5;border-color:color-mix(in srgb,var(--danger) 30%,transparent)">
      <div class="row vcenter between" style="gap:14px;flex-wrap:wrap">
        <div><b style="font-size:14px">${t("settings.logoutTitle")}</b><div class="faint" style="font-size:12px;margin-top:2px">${t("settings.logoutDesc")}</div></div>
        <button class="btn btn-outline btn--sm" data-action="logout" style="color:var(--danger);flex:none">${IC.logout} ${t("settings.logout")}</button>
      </div>
      <!-- [GOAL G4] Revocación server-side: mata TODAS las sesiones de la cuenta (móvil, otro
           navegador, o la de alguien con la cookie robada). Dos toques: es irreversible. -->
      <div class="row vcenter between" style="gap:14px;flex-wrap:wrap;margin-top:14px;padding-top:14px;border-top:1px solid var(--border)">
        <div><b style="font-size:14px">${t("settings.logoutAllTitle")}</b><div class="faint" style="font-size:12px;margin-top:2px">${t("settings.logoutAllDesc")}</div></div>
        <button class="btn btn-outline btn--sm" data-logout-all="1" style="color:var(--danger);flex:none">${t("settings.logoutAll")}</button>
      </div>
    </div>`;
  },

  mount(root) {
    if (!root) return;
    const w = window;
    const repaint = () => {
      const page = root.querySelector(".page");
      if (!page) return;
      page.innerHTML = S.settings.render();
      S.settings.mount(root);
    };

    // [BUG vínculo-padre §11.3] Confirmar una solicitud de tutela que un padre/madre reclamó
    // sobre esta cuenta → PATCH /api/guardianship { guardianshipId, action:"confirm" }. El
    // backend activa el vínculo + escribe ConsentRecord (misma transacción que el lado padre).
    root.querySelectorAll("[data-guardian-confirm]").forEach((btn) =>
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-guardian-confirm");
        if (!id) return;
        btn.disabled = true;
        btn.textContent = t("settings.guardianConfirming");
        try {
          await w.api("/api/guardianship", { guardianshipId: id, action: "confirm" }, "PATCH");
          if (Array.isArray(DB.pendingGuardianRequests)) {
            DB.pendingGuardianRequests = DB.pendingGuardianRequests.filter((r) => r.id !== id);
          }
          w.toast?.(t("settings.guardianConfirmed"), "ok");
          repaint();
        } catch (e) {
          w.toast?.((e && e.message) || t("settings.guardianActionFailed"), "danger");
          btn.disabled = false;
          btn.innerHTML = `${IC.check} ${t("settings.guardianConfirm")}`;
        }
      })
    );

    // Rechazar (con armado de dos toques, mismo patrón que data-pcancel en scr-parent.ts) →
    // PATCH { guardianshipId, action:"reject" }, el vínculo pasa a REVOKED.
    root.querySelectorAll("[data-guardian-reject]").forEach((btn) =>
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-guardian-reject");
        if (!id) return;
        if (btn.getAttribute("data-armed") !== "1") {
          btn.setAttribute("data-armed", "1");
          const t0 = btn.textContent;
          btn.textContent = t("settings.guardianRejectArm");
          setTimeout(() => {
            if (btn.isConnected && btn.getAttribute("data-armed") === "1") { btn.removeAttribute("data-armed"); btn.textContent = t0; }
          }, 4000);
          return;
        }
        btn.disabled = true;
        btn.textContent = t("settings.guardianRejecting");
        try {
          await w.api("/api/guardianship", { guardianshipId: id, action: "reject" }, "PATCH");
          if (Array.isArray(DB.pendingGuardianRequests)) {
            DB.pendingGuardianRequests = DB.pendingGuardianRequests.filter((r) => r.id !== id);
          }
          w.toast?.(t("settings.guardianRejected"), "warn");
          repaint();
        } catch (e) {
          w.toast?.((e && e.message) || t("settings.guardianActionFailed"), "danger");
          btn.disabled = false;
          btn.removeAttribute("data-armed");
          btn.textContent = t("settings.guardianReject");
        }
      })
    );

    // [GOAL G4] Cerrar sesión en TODOS los dispositivos (revoca el epoch server-side).
    root.querySelectorAll("[data-logout-all]").forEach((btn) =>
      btn.addEventListener("click", async () => {
        if (btn.getAttribute("data-armed") !== "1") {
          btn.setAttribute("data-armed", "1");
          const t0 = btn.textContent;
          btn.textContent = t("settings.logoutAllArm");
          setTimeout(() => {
            if (btn.isConnected && btn.getAttribute("data-armed") === "1") { btn.removeAttribute("data-armed"); btn.textContent = t0; }
          }, 4000);
          return;
        }
        btn.disabled = true;
        try {
          await w.api("/api/auth/logout", { all: true }, "POST");
          location.reload(); // la sesión propia también murió: vuelve al login
        } catch (e) {
          w.toast?.((e && e.message) || t("settings.logoutAllFailed"), "danger");
          btn.disabled = false;
          btn.removeAttribute("data-armed");
          btn.textContent = t("settings.logoutAll");
        }
      })
    );

    // [R5] 2FA TOTP (ADMIN): setup → confirmar código → enable; disable exige código vigente.
    root.querySelectorAll("[data-totp]").forEach((btn) =>
      btn.addEventListener("click", async () => {
        const action = btn.getAttribute("data-totp");
        try {
          if (action === "setup") {
            const d = await w.api("/api/auth/totp", { action: "setup" }, "POST");
            w.__totp2fa = { secret: d.secret, otpauth: d.otpauth };
            repaint();
          } else if (action === "cancel") {
            w.__totp2fa = null;
            repaint();
          } else if (action === "enable") {
            const code = String(root.querySelector("#totp-code")?.value || "").trim();
            await w.api("/api/auth/totp", { action: "enable", secret: w.__totp2fa?.secret, code }, "POST");
            w.__totp2fa = null;
            if (DB.me) DB.me.totpEnabled = true;
            w.toast?.(t("settings.totpEnabled"), "ok");
            repaint();
          } else if (action === "disable") {
            const code = String(root.querySelector("#totp-code")?.value || "").trim();
            await w.api("/api/auth/totp", { action: "disable", code }, "POST");
            if (DB.me) DB.me.totpEnabled = false;
            w.toast?.(t("settings.totpDisabled"), "warn");
            repaint();
          }
        } catch (e) {
          w.toast?.((e && e.message) || t("settings.totpFailed"), "danger");
        }
      })
    );

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
        w.toast?.(t("settings.saveFailed"), "error");
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
        if (nw.length < 8) throw new Error(t("settings.passwordTooShort")); // [R2] espejo del server
        if (nw !== cf) throw new Error(t("settings.passwordMismatch"));
        await w.api("/api/profile", { currentPassword: cur, newPassword: nw }, "PATCH");
        w.toast?.(t("settings.passwordUpdated"), "ok");
      });
    });
  },
};
