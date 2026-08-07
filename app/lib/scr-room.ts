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
import { t, registerDict } from "./i18n";
// [F4.1] Registra el diccionario de esta pantalla en SU chunk (fuera del inicial): room.* (directo) + core.* (compartido). Ver app/lib/i18n.ts.
import { dict as d_room } from "./i18n-keys/room";
import { dict as d_core } from "./i18n-keys/core";
registerDict(d_room);
registerDict(d_core);

export const S = {};

/* Cuenta atrás textual desde el ISO del slot ("" si no hay fecha). */
function countdown(iso) {
  if (!iso) return "";
  const ts = Date.parse(iso);
  if (Number.isNaN(ts)) return "";
  const ms = ts - Date.now();
  if (ms <= -90 * 60000) return t("room.countdownFinished");
  if (ms <= 0) return t("room.countdownInProgress");
  const min = Math.round(ms / 60000);
  if (min < 60) return `${t("room.countdownStartsPrefix")} ${min} ${t("core.countdownMin")}`;
  const h = Math.round(min / 60);
  if (h < 24) return `${t("room.countdownStartsPrefix")} ${h} ${t("core.countdownHour")}`;
  const d = Math.round(h / 24);
  return `${t("room.countdownStartsPrefix")} ${d} ${d === 1 ? t("core.countdownDaySingular") : t("core.countdownDayPlural")}`;
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
    if (b) return { b, side: "coach", who: b.studentName, ini: b.studentInitials, back: "coachwork", backLabel: t("room.backToBookingsCoach") };
    return null;
  }
  const mine = Array.isArray(DB.myBookings) ? DB.myBookings : [];
  const b = mine.find((x) => x && x.id === id);
  // [UI-CURSOS U4] La vuelta del alumno es "Cursos": ahí viven ahora sus reservas.
  if (b) return { b, side: "student", who: b.coachName, ini: b.coachInitials, back: "course", backLabel: t("room.backToBookingsStudent") };
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
      const back = isCoach ? "coachwork" : "course";
      const backLabel = isCoach ? t("room.goToBookingsCoach") : t("room.goToBookingsStudent");
      return `
      <div class="page-head page-head--rule fade-up"><div><p class="ph-eyebrow">${t("room.eyebrowSession")}</p>
        <h1 class="ph-title">${t("room.title")}</h1></div></div>
      <div class="card card-pad fade-up" style="--d:0">
        <div class="empty" style="padding:36px 24px">
          <div class="ill">${IC.video}</div>
          <h4>${t("room.notFoundHeading")}</h4>
          <p>${t("room.notFoundBody")}</p>
          <button class="btn btn-primary btn--sm" style="margin-top:12px" data-go="${back}">${backLabel} ${IC.arrowR}</button>
        </div>
      </div>`;
    }

    const { b, side, who, ini, back, backLabel } = found;
    const cd = countdown(b.slotAtIso);
    const completed = b.status === "COMPLETED";
    const cancelled = b.status === "CANCELLED";
    const pending = b.status === "PENDING";
    const recordingUrl = b.recordingUrl || null;

    // Estado de la sala según el estado de la reserva. Cada variante trae su propio
    // contenedor: la sala CONFIRMADA es el HÉROE OSCURO del mockup (.card--dark con la
    // barra naranja de 3px), el resto son estados vacíos sobre card blanca.
    let panel;
    if (cancelled) {
      panel = `<div class="card card-pad"><div class="empty" style="padding:32px 24px"><div class="ill">${IC.x || IC.alert || IC.video}</div>
        <h4>${t("room.cancelledHeading")}</h4><p>${t("room.cancelledBody")}</p></div></div>`;
    } else if (pending) {
      panel = `<div class="card card-pad"><div class="empty" style="padding:32px 24px"><div class="ill">${IC.clock || IC.video}</div>
        <h4>${t("room.pendingHeading")}</h4><p>${t("room.pendingBody")}</p></div></div>`;
    } else if (completed) {
      panel = `<div class="card card-pad"><div class="empty" style="padding:32px 24px"><div class="ill">${IC.checkCircle || IC.video}</div>
        <h4>${t("room.completedHeading")}</h4>
        <p>${recordingUrl ? t("room.completedRecordingAvailable") : t("room.completedNoRecording")}</p>
        ${recordingUrl ? `<a class="btn btn-outline btn--sm" style="margin-top:12px" href="${esc(recordingUrl)}" target="_blank" rel="noopener noreferrer">${IC.video} ${t("room.viewRecording")}</a>` : ""}</div></div>`;
    } else {
      // CONFIRMED — sala lista. Video en vivo pendiente de credenciales (honesto).
      panel = `
      <div class="card card--dark accent-edge room-stage">
        <div class="rs-ic">${IC.video}</div>
        <h3>${t("room.readyHeading")}</h3>
        <p>${t("room.readyBody")}</p>
        ${cd ? `<div class="rs-cd">${C.chip(esc(cd), "accent", { ic: "clock" })}</div>` : ""}
      </div>`;
    }

    const aside = `
      <div class="card card-pad">
        ${C.secTitle(t("room.detailEyebrow"), { sm: true })}
        <div class="row vcenter" style="gap:12px;margin-bottom:12px">
          ${C.avatar(esc(ini || "?"), { size: "md", bg: "var(--otr-navy)" })}
          <div style="min-width:0">
            <div style="font-weight:700;font-size:15px">${esc(who || (side === "coach" ? t("room.roleStudent") : t("room.roleCoach")))}</div>
            <div class="faint" style="font-size:12.5px">${side === "coach" ? t("room.yourStudent") : t("room.yourCoach")}</div>
          </div>
        </div>
        <div class="kv" style="font-size:13px;display:grid;gap:7px">
          <div class="row between"><span class="faint">${t("room.kvWhen")}</span><span style="font-weight:600">${esc(b.slotLabel || "")}</span></div>
          ${b.durationMin ? `<div class="row between"><span class="faint">${t("room.kvDuration")}</span><span style="font-weight:600">${b.durationMin} min</span></div>` : ""}
          ${b.packageName ? `<div class="row between"><span class="faint">${t("room.kvPackage")}</span><span style="font-weight:600">${b.packageName}</span></div>` : ""}
          ${(b.priceLabel || b.amountLabel) ? `<div class="row between"><span class="faint">${t("room.kvAmount")}</span><span style="font-weight:600">${esc(b.priceLabel || b.amountLabel)}</span></div>` : ""}
          <div class="row between"><span class="faint">${t("room.kvStatus")}</span><span style="font-weight:600">${esc(b.status)}</span></div>
        </div>
        <button class="btn btn-outline btn--sm btn-block" style="margin-top:16px" data-go="${back}">${backLabel}</button>
      </div>`;

    return `
    <div class="page-head page-head--rule fade-up"><div><p class="ph-eyebrow">${t("room.eyebrowCoaching")}</p>
      <h1 class="ph-title">${t("room.title")}</h1>
      <div class="page-sub" style="margin-top:8px">${side === "coach" ? t("room.subWithStudent") : t("room.subWithCoach")} · ${esc(b.slotLabel || "")}</div></div></div>

    <div class="grid" style="grid-template-columns:1.6fr 1fr;gap:18px;align-items:start">
      <div class="fade-up" style="--d:0">${panel}</div>
      <div class="fade-up" style="--d:1">${aside}</div>
    </div>`;
  },

  mount() {
    // Sin handlers propios: navegación vía data-go (dispatcher global de Aula.tsx).
  },
};
