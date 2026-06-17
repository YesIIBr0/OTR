// @ts-nocheck
/* OTR · Mis reservas (PRD §7.3 paso 6 + §4.2 ④) — S.myBookings.
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

   Patrón de la casa: render(state)->string + mount(root,state); IC.* iconos,
   esc() para texto del usuario, navy + sky, fade-up; nada de emojis.
   Cliente vía globales de Aula.tsx: go(ruta), toast(msg,tone), data-go. */
import { DB } from "./data";
import { C } from "./components";
import { IC } from "./icons";
import { esc } from "./esc";

export const S = {};

/* ---------------- helpers ---------------- */
const list = () => (Array.isArray(DB.myBookings) ? DB.myBookings : []);

// Countdown textual a partir del ISO del slot (RD/local del navegador da igual:
// la diferencia se calcula en ms absolutos). "" si no hay fecha o ya pasó.
function countdown(iso) {
  if (!iso) return "";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  const ms = t - Date.now();
  if (ms <= 0) return "";
  const min = Math.round(ms / 60000);
  if (min < 60) return `en ${min} min`;
  const hours = Math.round(min / 60);
  if (hours < 24) return `en ${hours} h`;
  const days = Math.round(hours / 24);
  return `en ${days} día${days === 1 ? "" : "s"}`;
}

function statusBadge(status) {
  if (status === "CONFIRMED") return `<span class="badge ok"><span class="dot"></span>Confirmada</span>`;
  if (status === "PENDING") return `<span class="badge warn"><span class="dot"></span>Esperando consentimiento</span>`;
  if (status === "COMPLETED") return `<span class="badge sky"><span class="dot"></span>Completada</span>`;
  if (status === "CANCELLED") return `<span class="badge">Cancelada</span>`;
  if (status === "DISPUTED") return `<span class="badge warn"><span class="dot"></span>En disputa</span>`;
  return status ? `<span class="badge">${esc(status)}</span>` : "";
}

function escrowBadge(st) {
  if (st === "HELD") return `<span class="badge warn">Pago en escrow</span>`;
  if (st === "RELEASED") return `<span class="badge ok">Pago liberado</span>`;
  if (st === "REFUNDED") return `<span class="badge">Reembolsado</span>`;
  return "";
}

/* ---------------- filas ---------------- */
function upcomingRow(b) {
  const cd = b.status === "CONFIRMED" || b.status === "PENDING" ? countdown(b.slotAtIso) : "";
  const meta = [b.slotLabel, b.packageName, b.priceLabel].filter(Boolean).map(esc).join(" · ");
  // Sala on-platform: solo CONFIRMED con videoUrl ofrece el botón de unirse.
  const canJoin = b.status === "CONFIRMED" && b.videoUrl;
  const join = canJoin
    ? `<button class="btn btn-primary btn-sm" data-mb-join="${esc(b.id)}" style="flex:none">
         <span class="row vcenter" style="gap:6px"><span style="display:inline-flex;width:15px;height:15px">${IC.video}</span>Unirse a la sesión</span>
       </button>`
    : b.status === "PENDING"
    ? `<span class="faint" style="font-size:11.5px;flex:none">Un tutor debe aprobar</span>`
    : "";

  return `
  <div class="row vcenter wrap" style="gap:12px;padding:14px 0;border-bottom:1px solid var(--border)">
    ${C.avatar(esc(b.coachInitials || "C"), { size: "sm", bg: "var(--otr-navy)" })}
    <div style="flex:1;min-width:200px">
      <b style="font-size:13.5px">${esc(b.coachName || "Coach OTR")}</b>
      <div class="faint" style="font-size:12px;margin-top:2px">${meta || "Sesión de coaching"}</div>
    </div>
    <div class="row vcenter" style="gap:8px;flex:none">
      ${statusBadge(b.status)}
      ${cd ? `<span class="badge sky"><span style="display:inline-flex;width:12px;height:12px">${IC.clock}</span>&nbsp;${esc(cd)}</span>` : ""}
    </div>
    ${join}
    <button class="btn btn-ghost btn-sm" data-mb-cancel="${esc(b.id)}" style="flex:none;color:var(--danger)">Cancelar</button>
  </div>`;
}

function historyRow(b) {
  const meta = [b.slotLabel, b.packageName, b.priceLabel].filter(Boolean).map(esc).join(" · ");
  return `
  <div class="row vcenter wrap" style="gap:12px;padding:13px 0;border-bottom:1px solid var(--border)">
    ${C.avatar(esc(b.coachInitials || "C"), { size: "sm" })}
    <div style="flex:1;min-width:200px">
      <b style="font-size:13.5px">${esc(b.coachName || "Coach OTR")}</b>
      <div class="faint" style="font-size:12px;margin-top:2px">${meta || "Sesión de coaching"}</div>
    </div>
    ${statusBadge(b.status)}
    ${escrowBadge(b.escrowStatus)}
    ${b.recordingUrl ? `<a class="btn btn-quiet btn-sm" href="${esc(b.recordingUrl)}" target="_blank" rel="noopener noreferrer" style="flex:none"><span class="row vcenter" style="gap:6px"><span style="display:inline-flex;width:14px;height:14px">${IC.video}</span>Grabación</span></a>` : ""}
    ${b.canReview ? `<button class="btn btn-soft btn-sm" data-mb-review="${esc(b.id)}" data-coach="${esc(b.coachId)}" data-coach-name="${esc(b.coachName || "")}" style="flex:none">Dejar reseña</button>` : ""}
  </div>`;
}

/* ================= PANTALLA ================= */
S.myBookings = {
  render() {
    const all = list();
    // Próximas: PENDING/CONFIRMED futuras. Historial: COMPLETED/CANCELLED/DISPUTED.
    const upcoming = all.filter(
      (b) => (b.status === "CONFIRMED" || b.status === "PENDING") && b.upcoming,
    );
    const history = all.filter(
      (b) => b.status === "COMPLETED" || b.status === "CANCELLED" || b.status === "DISPUTED" || !b.upcoming,
    );

    const head = `
    <div class="page-head fade-up"><div>
      <p class="eyebrow">Marketplace</p>
      <h1 class="page-title">Mis reservas</h1>
      <div class="page-sub">Tus sesiones de coaching reservadas</div>
    </div></div>`;

    if (!all.length) {
      return `${head}
      <div class="card fade-up" style="--d:1"><div class="empty">
        <div class="ill">${IC.calendar}</div>
        <h4>Tu primera sesión 1:1 te espera</h4>
        <p>Elige a tu coach en el marketplace y reserva. Tu pago queda protegido en escrow y se libera solo al completar la sesión.</p>
        <button class="btn btn-primary" data-go="explore">Encontrar mi coach</button>
      </div></div>`;
    }

    return `${head}
    <div class="card card-pad fade-up" style="--d:1">
      <div class="row between vcenter">
        <b style="font-size:14px">Próximas</b>
        <span class="badge sky">${upcoming.length}</span>
      </div>
      <p class="faint" style="font-size:12px;margin-top:4px">La sala de video se abre dentro de OTR.</p>
      ${upcoming.length
        ? `<div style="margin-top:6px">${upcoming.map(upcomingRow).join("")}</div>`
        : `<p class="muted" style="font-size:13px;margin-top:12px">No tienes sesiones próximas — <a href="#" data-go="explore" style="color:var(--otr-sky-lo);font-weight:600">explora coaches</a> para reservar una.</p>`}
    </div>

    <div class="card card-pad fade-up" style="--d:2;margin-top:16px">
      <div class="row between vcenter">
        <b style="font-size:14px">Historial</b>
        <span class="badge">${history.length}</span>
      </div>
      ${history.length
        ? `<div style="margin-top:6px">${history.map(historyRow).join("")}</div>`
        : `<p class="muted" style="font-size:13px;margin-top:12px">Tu historial se escribe sesión a sesión — cada una quedará registrada aquí.</p>`}
    </div>`;
  },

  mount(root) {
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
      if (w.go) w.go("my-bookings");
    };
    root.querySelectorAll("[data-mb-cancel]").forEach((btn) =>
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-mb-cancel");
        if (!id) return;
        if (btn.getAttribute("data-armed") !== "1") {
          btn.setAttribute("data-armed", "1");
          const t0 = btn.textContent;
          btn.textContent = "¿Cancelar? Tocar de nuevo";
          setTimeout(() => {
            if (btn.isConnected && btn.getAttribute("data-armed") === "1") { btn.removeAttribute("data-armed"); btn.textContent = t0; }
          }, 4000);
          return;
        }
        btn.disabled = true;
        btn.textContent = "Cancelando…";
        try {
          await w.api(`/api/bookings/${encodeURIComponent(id)}`, { action: "cancel" }, "PATCH");
          w.toast?.("Reserva cancelada — tu pago se reembolsa", "ok");
          await softRefresh();
        } catch (e) {
          w.toast?.((e && e.message) || "No se pudo cancelar la reserva", "danger");
          btn.disabled = false;
          btn.removeAttribute("data-armed");
          btn.textContent = "Cancelar";
        }
      }),
    );

    // [REVIEW-CHAIN §7.4] Dejar reseña tras una sesión COMPLETADA (canReview del payload).
    // Postea contra el coach (coachId) → /api/reviews crea la Review sin necesitar un curso.
    root.querySelectorAll("[data-mb-review]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const coachId = btn.getAttribute("data-coach") || "";
        const coachName = btn.getAttribute("data-coach-name") || "tu coach";
        if (!coachId || !w.otrFormModal) return;
        w.otrFormModal(`Reseñar a ${coachName}`, [
          { name: "rating", label: "Tu valoración", type: "select", value: "5", options: [
            { value: "5", label: "★★★★★ Excelente" },
            { value: "4", label: "★★★★ Muy bueno" },
            { value: "3", label: "★★★ Bueno" },
            { value: "2", label: "★★ Regular" },
            { value: "1", label: "★ Malo" },
          ] },
          { name: "body", label: "Tu comentario (opcional)", type: "textarea", ph: "¿Qué tal fue tu sesión de coaching?" },
        ], async (v) => {
          await w.api("/api/reviews", { coachId, rating: Number(v.rating) || 5, body: v.body || "" }, "POST");
          w.toast?.("¡Gracias por tu reseña!", "ok");
          await softRefresh();
        });
      }),
    );
  },
};
