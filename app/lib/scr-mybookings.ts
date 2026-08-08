// @ts-nocheck
/* OTR · Reservas del alumno (PRD §7.3 paso 6 + §4.2 ④) — PANEL, no pantalla.
   [UI-CURSOS U3/U4] Dejó de ser una ruta propia ("Mis reservas" salió del nav): sus
   sesiones de coaching son parte de "lo que estoy aprendiendo", así que este panel se
   pinta DENTRO de la sección Cursos, bajo el curso (ver scr-core.ts). El módulo sigue
   siendo el ÚNICO dueño de esta UI — scr-core la embebe, no la duplica.

   La vista demand-side del marketplace: el alumno consulta sus sesiones de
   coaching reservadas. "Próximas" muestra las CONFIRMED/PENDING futuras con
   coach, horario y estado; para las CONFIRMED con sala on-platform aparece el
   botón [Unirse a la sesión] (data-go a la sala interna /aula?room=<id>, o
   window.open del videoUrl externo) más un countdown textual derivado del slot.
   "Historial" lista COMPLETED/CANCELLED con su estado de escrow.

   Sala on-platform: la videollamada real (Cloudflare/Daily) se cabla luego; por
   ahora el videoUrl '/aula?room=<bookingId>' es una vista interna de la app.

   Datos (DB.myBookings, de queries.ts para STUDENT):
     [{ id, status PENDING|CONFIRMED|COMPLETED|CANCELLED|DISPUTED, coachId,
        coachName, coachInitials, packageName, slotLabel, slotAtIso,
        durationMin, upcoming, priceCents, priceLabel,
        escrowStatus HELD|RELEASED|REFUNDED|null, videoUrl }]

   Patrón de la casa: renderBookings()->string + mountBookings(root); IC.* iconos,
   esc() para texto del usuario, navy + sky, fade-up; nada de emojis.
   Cliente vía globales de Aula.tsx: go(ruta), toast(msg,tone), data-go. */
import { DB } from "./data";
import { C } from "./components";
import { IC } from "./icons";
import { esc } from "./esc";
import { t, registerDict } from "./i18n";
// [F4.1] Registra el diccionario de esta pantalla en SU chunk (fuera del inicial): mb.* (directo) + core.* (compartido con dashboard/room). Ver app/lib/i18n.ts.
import { dict as d_mb } from "./i18n-keys/mb";
import { dict as d_core } from "./i18n-keys/core";
registerDict(d_mb);
registerDict(d_core);

/* ---------------- helpers ---------------- */
const list = () => (Array.isArray(DB.myBookings) ? DB.myBookings : []);

// Countdown textual a partir del ISO del slot (RD/local del navegador da igual:
// la diferencia se calcula en ms absolutos). "" si no hay fecha o ya pasó.
function countdown(iso) {
  if (!iso) return "";
  const ts = Date.parse(iso);
  if (Number.isNaN(ts)) return "";
  const ms = ts - Date.now();
  if (ms <= 0) return "";
  const min = Math.round(ms / 60000);
  if (min < 60) return `${t("core.countdownInPrefix")} ${min} ${t("core.countdownMin")}`;
  const hours = Math.round(min / 60);
  if (hours < 24) return `${t("core.countdownInPrefix")} ${hours} ${t("core.countdownHour")}`;
  const days = Math.round(hours / 24);
  return `${t("core.countdownInPrefix")} ${days} ${days === 1 ? t("core.countdownDaySingular") : t("core.countdownDayPlural")}`;
}

// Cada estado necesita una variante DISTINTA del kit para leerse de un vistazo:
// confirmada = naranja (lo que pasa pronto), pendiente = tinte, completada = info,
// cancelada = contorno, disputada = negro (pide atención). Nada de pills.
function statusBadge(status) {
  if (status === "CONFIRMED") return C.chip(t("mb.statusConfirmed"), "accent");
  if (status === "PENDING") return C.chip(t("mb.statusPending"), "tint");
  if (status === "COMPLETED") return C.chip(t("mb.statusCompleted"), "info");
  if (status === "CANCELLED") return C.chip(t("mb.statusCancelled"), "outline");
  if (status === "DISPUTED") return C.chip(t("mb.statusDisputed"), "black");
  return status ? C.chip(esc(status), "outline") : "";
}

function escrowBadge(st) {
  if (st === "HELD") return C.chip(t("mb.escrowHeld"), "tint");
  if (st === "RELEASED") return C.chip(t("mb.escrowReleased"), "info");
  if (st === "REFUNDED") return C.chip(t("mb.escrowRefunded"), "outline");
  return "";
}

// Día/mes para el .date-box de la fila (70px). "" si el ISO no es utilizable.
function slotDate(iso) {
  const ts = Date.parse(iso || "");
  if (Number.isNaN(ts)) return null;
  const dt = new Date(ts);
  return { d: dt.getDate(), m: dt.toLocaleDateString(undefined, { month: "short" }).replace(".", "") };
}

/* ---------------- filas ---------------- */
function upcomingRow(b) {
  const cd = b.status === "CONFIRMED" || b.status === "PENDING" ? countdown(b.slotAtIso) : "";
  const meta = [b.slotLabel, b.packageName, b.priceLabel].filter(Boolean).map(esc).join(" · ");
  // Sala on-platform: solo CONFIRMED con videoUrl ofrece el botón de unirse.
  const canJoin = b.status === "CONFIRMED" && b.videoUrl;
  const join = canJoin
    ? `<button class="btn btn-accent btn--sm" data-mb-join="${esc(b.id)}" style="flex:none">
         <span class="row vcenter" style="gap:6px"><span style="display:inline-flex;width:15px;height:15px">${IC.video}</span>${t("mb.joinSession")}</span>
       </button>`
    : b.status === "PENDING"
    ? `<span class="faint" style="font-size:11.5px;flex:none">${t("mb.tutorMustApprove")}</span>`
    : "";
  // Fila de evento del mockup: date-box de 70px + título/meta + acciones. Cuando el
  // ISO no sirve, el hueco de la fecha lo ocupa el avatar del coach (nunca queda vacío).
  const dt = slotDate(b.slotAtIso);
  const lead = dt
    ? C.dateBox(dt.d, dt.m, !!cd && cd.includes(t("core.countdownMin")))
    : `<div class="date-box">${C.avatar(esc(b.coachInitials || "C"), { size: "sm", bg: "var(--otr-navy)" })}</div>`;

  return `
  <div class="evrow">
    ${lead}
    <div class="ev-main">
      <div class="ev-title" style="font-size:15px;margin:0">${esc(b.coachName || t("mb.coachFallback"))}</div>
      <div class="ev-meta" style="margin-top:5px;gap:10px">
        <span>${meta || t("mb.coachingSession")}</span>
        ${cd ? `<span class="row vcenter" style="gap:5px"><span style="display:inline-flex;width:13px;height:13px">${IC.clock}</span>${esc(cd)}</span>` : ""}
      </div>
    </div>
    <div class="ev-actions wrap">
      ${statusBadge(b.status)}
      ${join}
      <button class="btn btn-outline btn--sm" data-mb-cancel="${esc(b.id)}" style="flex:none;color:var(--danger)">${t("mb.cancel")}</button>
    </div>
  </div>`;
}

function historyRow(b) {
  const meta = [b.slotLabel, b.packageName, b.priceLabel].filter(Boolean).map(esc).join(" · ");
  return `
  <div class="row vcenter wrap" style="gap:12px;padding:13px 0;border-bottom:1px solid var(--border)">
    ${C.avatar(esc(b.coachInitials || "C"), { size: "sm" })}
    <div style="flex:1;min-width:200px">
      <b style="font-size:13.5px">${esc(b.coachName || t("mb.coachFallback"))}</b>
      <div class="faint" style="font-size:12px;margin-top:2px">${meta || t("mb.coachingSession")}</div>
    </div>
    ${statusBadge(b.status)}
    ${escrowBadge(b.escrowStatus)}
    ${b.recordingUrl ? `<a class="btn btn-outline btn--sm" href="${esc(b.recordingUrl)}" target="_blank" rel="noopener noreferrer" style="flex:none"><span class="row vcenter" style="gap:6px"><span style="display:inline-flex;width:14px;height:14px">${IC.video}</span>${t("mb.recording")}</span></a>` : ""}
    ${b.canReview ? `<button class="btn btn-outline btn-sm" data-mb-review="${esc(b.id)}" data-coach="${esc(b.coachId)}" data-coach-name="${esc(b.coachName || "")}" style="flex:none">${t("mb.leaveReview")}</button>` : ""}
  </div>`;
}

/* ================= PANEL EMBEBIDO EN CURSOS ================= */
/**
 * HTML del bloque de reservas que va BAJO los cursos.
 * Devuelve "" cuando el payload no trae `myBookings` — queries.ts solo lo sirve al
 * STUDENT, así que el profesor/admin que abre el curso en vista previa no ve una
 * sección que no es suya (antes eso lo resolvía el guard de la ruta, que ya no existe).
 */
export function renderBookings() {
  if (!Array.isArray(DB.myBookings)) return "";
  const all = list();
  // Próximas: PENDING/CONFIRMED futuras. Historial: COMPLETED/CANCELLED/DISPUTED.
  const upcoming = all.filter(
    (b) => (b.status === "CONFIRMED" || b.status === "PENDING") && b.upcoming,
  );
  const history = all.filter(
    (b) => b.status === "COMPLETED" || b.status === "CANCELLED" || b.status === "DISPUTED" || !b.upcoming,
  );

  // Cabecera de SECCIÓN (ya no de pantalla): el <h1> y el eyebrow los pone Cursos.
  // [GOAL F3 · K-09] Y por eso el tag es h2, no el h3 por defecto de secTitle: colgaba
  // del <h1> del curso saltándose un nivel. El diseño lo dan las clases (.sec-title
  // viste igual h2/h3/h4), así que el tag cambia sin mover un píxel.
  const head = `
  <div class="fade-up" style="margin:28px 0 12px">
    ${C.secTitle(t("mb.title"), { tag: 'h2', attrs: 'style="margin-bottom:4px"' })}
    <div class="faint" style="font-size:12.5px">${t("mb.subtitle")}</div>
  </div>`;

  if (!all.length) {
    return `${head}
    <div class="card fade-up" style="--d:1"><div class="empty">
      <div class="ill">${IC.calendar}</div>
      <h3>${t("mb.emptyHeading")}</h3>
      <p>${t("mb.emptyBody")}</p>
      <button class="btn btn-accent" data-go="explore">${t("mb.emptyCta")}</button>
    </div></div>`;
  }

  return `${head}
  <div class="card card-pad fade-up" style="--d:1">
    ${C.secTitle(t("mb.upcomingTitle"), { sm: true, tag: 'h3', right: C.chip(String(upcoming.length), "black") })}
    <p class="faint" style="font-size:12px;margin-top:4px">${t("mb.videoRoomNote")}</p>
    ${upcoming.length
      ? `<div style="margin-top:6px;--ev-bleed:22px">${upcoming.map(upcomingRow).join("")}</div>`
      : `<p class="muted" style="font-size:13px;margin-top:12px">${t("mb.upcomingEmptyPre")} <a href="#" data-go="explore" style="color:var(--otr-green-text);font-weight:700">${t("mb.upcomingEmptyLink")}</a> ${t("mb.upcomingEmptyPost")}</p>`}
  </div>

  <div class="card card-pad fade-up" style="--d:2;margin-top:16px">
    ${C.secTitle(t("mb.historyTitle"), { sm: true, tag: 'h3', right: C.chip(String(history.length), "outline") })}
    ${history.length
      ? `<div style="margin-top:6px">${history.map(historyRow).join("")}</div>`
      : `<p class="muted" style="font-size:13px;margin-top:12px">${t("mb.historyEmpty")}</p>`}
  </div>`;
}

/** Cablea unirse / cancelar / reseñar del panel. Lo llama el mount de la sección Cursos. */
export function mountBookings(root) {
    const w = window;
    // [NAV-07/FLW-04] Unirse a la sesión → pantalla room SPA-nativa (antes window.open
    // de '/aula?room=<id>' caía al dashboard porque el router no lee query params). El
    // botón lleva el bookingId; fijamos window.__room y navegamos a 'room'.
    root.querySelectorAll("[data-mb-join]").forEach((btn) =>
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const id = btn.getAttribute("data-mb-join") || "";
        if (!id) return;
        w.__room = id; w.go?.("room");
      }),
    );

    // [BOOKING-1] Cancelar una reserva propia (PENDING/CONFIRMED). El backend ya lo
    // soporta (PATCH action:'cancel' → escrow REFUNDED); antes el alumno no tenía
    // NINGUNA salida desde la app. Refresca re-pidiendo app-data y re-renderizando.
    const softRefresh = async () => {
      try {
        const r = await fetch("/api/app-data");
        if (r.ok) { const fresh = await r.json(); const role = DB.me?.role; Object.assign(DB, fresh); if (role) DB.me = { ...(fresh.me || {}), role }; }
      } catch { /* silencioso */ }
      // [UI-CURSOS U4] El panel vive embebido (hoy en 'course'), así que repinta la ruta
      // ACTUAL en vez de saltar a una pantalla propia — que ya no existe. Aula.tsx publica
      // window.__route en cada navegación; 'course' es el respaldo por si aún no se fijó.
      if (w.go) w.go(w.__route || "course");
    };
    root.querySelectorAll("[data-mb-cancel]").forEach((btn) =>
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-mb-cancel");
        if (!id) return;
        if (btn.getAttribute("data-armed") !== "1") {
          btn.setAttribute("data-armed", "1");
          const t0 = btn.textContent;
          btn.textContent = t("mb.cancelArm");
          setTimeout(() => {
            if (btn.isConnected && btn.getAttribute("data-armed") === "1") { btn.removeAttribute("data-armed"); btn.textContent = t0; }
          }, 4000);
          return;
        }
        btn.disabled = true;
        btn.textContent = t("mb.cancelling");
        try {
          await w.api(`/api/bookings/${encodeURIComponent(id)}`, { action: "cancel" }, "PATCH");
          w.toast?.(t("mb.cancelled"), "ok");
          await softRefresh();
        } catch (e) {
          w.toast?.((e && e.message) || t("mb.cancelError"), "danger");
          btn.disabled = false;
          btn.removeAttribute("data-armed");
          btn.textContent = t("mb.cancel");
        }
      }),
    );

    // [REVIEW-CHAIN §7.4] Dejar reseña tras una sesión COMPLETADA (canReview del payload).
    // Postea contra el coach (coachId) → /api/reviews crea la Review sin necesitar un curso.
    root.querySelectorAll("[data-mb-review]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const coachId = btn.getAttribute("data-coach") || "";
        const coachName = btn.getAttribute("data-coach-name") || t("mb.reviewCoachFallback");
        if (!coachId || !w.otrFormModal) return;
        w.otrFormModal(t("mb.reviewModalTitle").replace("{name}", coachName), [
          { name: "rating", label: t("mb.reviewRatingLabel"), type: "select", value: "5", options: [
            { value: "5", label: t("mb.reviewRating5") },
            { value: "4", label: t("mb.reviewRating4") },
            { value: "3", label: t("mb.reviewRating3") },
            { value: "2", label: t("mb.reviewRating2") },
            { value: "1", label: t("mb.reviewRating1") },
          ] },
          { name: "body", label: t("mb.reviewBodyLabel"), type: "textarea", ph: t("mb.reviewBodyPh") },
        ], async (v) => {
          await w.api("/api/reviews", { coachId, rating: Number(v.rating) || 5, body: v.body || "" }, "POST");
          w.toast?.(t("mb.reviewThanks"), "ok");
          await softRefresh();
        });
      }),
    );
}
