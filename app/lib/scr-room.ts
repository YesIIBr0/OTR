// @ts-nocheck
/* OTR · Sala de sesión (PRD §7.3 paso 6) — S.room.
   Destino REAL del botón "Unirse a la sesión" del marketplace. Antes el join hacía
   window.open('/aula?room=<id>') y, como el router SPA no maneja query params, caía
   al dashboard (NAV-07/COG-06/FLW-04/CNV-04): el servicio pagado no se entregaba.

   Patrón SPA-nativo: el join hace `window.__room = <bookingId>; go('room')`. Esta
   pantalla resuelve la reserva desde DB (alumno: DB.myBookings; coach:
   DB.coachwork.inbox) por id, valida propiedad/estado y monta la sala.

   La videollamada en vivo real (Cloudflare Stream / Daily) está pendiente de
   credenciales del fundador; mientras tanto la sala es honesta: muestra los datos
   de la sesión, la cuenta atrás y un estado claro de "se habilita aquí" — no un
   reproductor falso (mismo principio que LEARN-4). Si la sesión ya se completó y
   hay grabación, la enlaza.

   Cliente vía globales de Aula.tsx: go(ruta), data-go; IC.* iconos, esc() texto. */
import { DB } from "./data";
import { C } from "./components";
import { IC } from "./icons";
import { esc } from "./esc";

export const S = {};

/* Cuenta atrás textual desde el ISO del slot ("" si no hay fecha). */
function countdown(iso) {
  if (!iso) return "";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  const ms = t - Date.now();
  if (ms <= -90 * 60000) return "finalizada";
  if (ms <= 0) return "en curso";
  const min = Math.round(ms / 60000);
  if (min < 60) return `comienza en ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `comienza en ${h} h`;
  const d = Math.round(h / 24);
  return `comienza en ${d} día${d === 1 ? "" : "s"}`;
}

/* Resuelve la reserva por id desde el lado que corresponde al rol. */
function findBooking(id) {
  if (!id) return null;
  // DB.me.role es MINÚSCULA en el cliente (queries usa toLowerCase + Aula fija viewRole).
  const role = String(DB.me?.role || "").toLowerCase();
  if (role === "teacher" || role === "coach") {
    const box = (DB.coachwork && DB.coachwork.inbox) || {};
    const all = [...(box.upcoming || []), ...(box.past || [])];
    const b = all.find((x) => x && x.id === id);
    if (b) return { b, side: "coach", who: b.studentName, ini: b.studentInitials, back: "coachwork", backLabel: "Volver a Reservas" };
    return null;
  }
  const mine = Array.isArray(DB.myBookings) ? DB.myBookings : [];
  const b = mine.find((x) => x && x.id === id);
  if (b) return { b, side: "student", who: b.coachName, ini: b.coachInitials, back: "my-bookings", backLabel: "Volver a Mis reservas" };
  return null;
}

S.room = {
  render() {
    const id = (typeof window !== "undefined" && window.__room) || "";
    const found = findBooking(id);

    // Reserva inexistente / ajena / sin sesión: estado honesto + salida.
    if (!found) {
      const role = String(DB.me?.role || "").toLowerCase();
      const isCoach = role === "teacher" || role === "coach";
      const back = isCoach ? "coachwork" : "my-bookings";
      const backLabel = isCoach ? "Ir a Reservas" : "Ir a Mis reservas";
      return `
      <div class="page-head fade-up"><div><p class="eyebrow">Sesión</p>
        <h1 class="page-title">Sala de sesión</h1></div></div>
      <div class="card card-pad fade-up" style="--d:0">
        <div class="empty" style="padding:36px 24px">
          <div class="ill">${IC.video}</div>
          <h4>No encontramos esta sesión</h4>
          <p>El enlace puede haber caducado o la reserva ya no está disponible.</p>
          <button class="btn btn-primary btn-sm" style="margin-top:12px" data-go="${back}">${backLabel} ${IC.arrowR}</button>
        </div>
      </div>`;
    }

    const { b, side, who, ini, back, backLabel } = found;
    const cd = countdown(b.slotAtIso);
    const completed = b.status === "COMPLETED";
    const cancelled = b.status === "CANCELLED";
    const pending = b.status === "PENDING";
    const recordingUrl = b.recordingUrl || null;

    // Estado de la sala según el estado de la reserva.
    let panel;
    if (cancelled) {
      panel = `<div class="empty" style="padding:32px 24px"><div class="ill">${IC.x || IC.alert || IC.video}</div>
        <h4>Esta sesión fue cancelada</h4><p>No hay sala activa. Los fondos retenidos se reembolsaron.</p></div>`;
    } else if (pending) {
      panel = `<div class="empty" style="padding:32px 24px"><div class="ill">${IC.clock || IC.video}</div>
        <h4>Pendiente de aprobación</h4><p>La sala se habilita cuando el tutor apruebe la sesión.</p></div>`;
    } else if (completed) {
      panel = `<div class="empty" style="padding:32px 24px"><div class="ill">${IC.checkCircle || IC.video}</div>
        <h4>Sesión completada</h4>
        <p>${recordingUrl ? "La grabación está disponible abajo." : "Esta sesión ya finalizó."}</p>
        ${recordingUrl ? `<a class="btn btn-soft btn-sm" style="margin-top:12px" href="${esc(recordingUrl)}" target="_blank" rel="noopener noreferrer">${IC.video} Ver grabación</a>` : ""}</div>`;
    } else {
      // CONFIRMED — sala lista. Video en vivo pendiente de credenciales (honesto).
      panel = `
      <div style="border:1px dashed var(--border);border-radius:16px;background:var(--bg-sunken);padding:40px 24px;text-align:center">
        <div style="display:inline-flex;width:48px;height:48px;align-items:center;justify-content:center;border-radius:14px;background:var(--action-soft);color:var(--otr-green-text)">${IC.video}</div>
        <h3 style="margin:14px 0 4px;font-size:18px">Tu sala está lista</h3>
        <p class="muted" style="max-width:440px;margin:0 auto;font-size:13.5px">La videollamada en vivo se abrirá aquí, dentro de OTR. La conexión de video se está habilitando; cuando esté activa, este es el lugar de tu sesión 1:1.</p>
        ${cd ? `<div class="badge sky" style="margin-top:14px;height:26px"><span class="dot"></span>${esc(cd)}</div>` : ""}
      </div>`;
    }

    const aside = `
      <div class="card card-pad">
        <div class="eyebrow" style="margin-bottom:8px">Detalle de la sesión</div>
        <div class="row vcenter" style="gap:12px;margin-bottom:12px">
          ${C.avatar(esc(ini || "?"), { size: "md", bg: "var(--otr-navy)" })}
          <div style="min-width:0">
            <div style="font-weight:700;font-size:15px">${esc(who || (side === "coach" ? "Alumno" : "Coach"))}</div>
            <div class="faint" style="font-size:12.5px">${side === "coach" ? "Tu alumno" : "Tu coach"}</div>
          </div>
        </div>
        <div class="kv" style="font-size:13px;display:grid;gap:7px">
          <div class="row between"><span class="faint">Cuándo</span><span style="font-weight:600">${esc(b.slotLabel || "")}</span></div>
          ${b.durationMin ? `<div class="row between"><span class="faint">Duración</span><span style="font-weight:600">${b.durationMin} min</span></div>` : ""}
          ${b.packageName ? `<div class="row between"><span class="faint">Paquete</span><span style="font-weight:600">${b.packageName}</span></div>` : ""}
          ${(b.priceLabel || b.amountLabel) ? `<div class="row between"><span class="faint">Monto</span><span style="font-weight:600">${esc(b.priceLabel || b.amountLabel)}</span></div>` : ""}
          <div class="row between"><span class="faint">Estado</span><span style="font-weight:600">${esc(b.status)}</span></div>
        </div>
        <button class="btn btn-soft btn-sm btn-block" style="margin-top:16px" data-go="${back}">${backLabel}</button>
      </div>`;

    return `
    <div class="page-head fade-up"><div><p class="eyebrow">Sesión de coaching</p>
      <h1 class="page-title">Sala de sesión</h1>
      <div class="page-sub">${side === "coach" ? "Sesión con tu alumno" : "Sesión con tu coach"} · ${esc(b.slotLabel || "")}</div></div></div>

    <div class="grid" style="grid-template-columns:1.6fr 1fr;gap:18px;align-items:start">
      <div class="card card-pad fade-up" style="--d:0">${panel}</div>
      <div class="fade-up" style="--d:1">${aside}</div>
    </div>`;
  },

  mount() {
    // Sin handlers propios: navegación vía data-go (dispatcher global de Aula.tsx).
  },
};
