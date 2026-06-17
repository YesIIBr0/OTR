// @ts-nocheck
import { DB } from "./data";
import { C } from "./components";
import { IC, otrCrest } from "./icons";
import { esc } from "./esc";
export const S = {};

/* ---------------- CERTIFICADO / DIPLOMA OFICIAL OTR ---------------- */

// Sello del certificado — marco circular ceremonial (anillos dorados = LOGRO)
// con el ESCUDO OTR del brand book centrado como svg anidado; el markup
// canónico del escudo vive en ./icons (otrCrest).
const otrSeal = () => `
  <span class="cert-seal" aria-hidden="true">
    <svg viewBox="0 0 120 120" width="92" height="92" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="60" cy="60" r="56" fill="var(--otr-navy)"/>
      <circle cx="60" cy="60" r="50" fill="none" stroke="var(--otr-gold)" stroke-width="1.6" stroke-dasharray="2 4"/>
      <circle cx="60" cy="60" r="42" fill="none" stroke="var(--otr-gold)" stroke-width="1.2"/>
      ${otrCrest({ id: "seal", attrs: 'x="43" y="40.5" width="34" height="39"' })}
    </svg>
  </span>`;

S.certificate = {
  render() {
    const certs = DB.certificates || [];

    // Estado vacío: ningún certificado en DB.
    if (!certs.length) {
      return `
      <div class="page-head"><div>
        <h1 class="page-title">Certificado</h1>
        <div class="page-sub">Diploma oficial OTR Debate Academy</div>
      </div></div>
      <div class="empty" style="padding:48px 24px;max-width:520px;margin:0 auto;text-align:center">
        <div class="ill">${IC.award}</div>
        <h4>Aún no tienes certificados</h4>
        <p>Completa un programa al 100% para ganar tu primer diploma oficial OTR.</p>
        <button class="btn btn-primary btn-sm" onclick="go('badges')">Volver a logros</button>
      </div>`;
    }

    // Buscar el cert por window.__cert; si no hay match, usar el primero.
    const wanted = typeof window !== "undefined" ? window.__cert : null;
    const cert = (wanted && certs.find((c) => String(c.id) === String(wanted))) || certs[0];

    const name = (DB.me && DB.me.name) || "";
    const title = cert.title || "";
    const program = cert.programName || "";
    const issued = esc(cert.issuedAt || "");

    return `
    <div class="page-head"><div>
      <h1 class="page-title">Certificado</h1>
      <div class="page-sub">Diploma oficial OTR Debate Academy</div>
    </div>
    <div class="row" style="gap:8px">
      <button class="btn btn-soft btn-sm" onclick="window.print()">${IC.download} Imprimir</button>
      <button class="btn btn-ghost btn-sm" onclick="go('badges')">${IC.chevL} Volver</button>
    </div></div>

    <div class="diploma-wrap fade-up" style="max-width:820px;margin:0 auto">
      <div class="diploma card" style="
        position:relative;overflow:hidden;text-align:center;
        padding:52px 56px 46px;
        border:1px solid var(--otr-pale);
        box-shadow:var(--sh-2);
        background:
          radial-gradient(circle at 50% 0%, color-mix(in srgb, var(--otr-pale) 55%, #fff) 0%, #fff 60%),
          var(--otr-white);
      ">
        <!-- Marco doble interior -->
        <span aria-hidden="true" style="
          position:absolute;inset:14px;border:2px solid var(--otr-navy);border-radius:10px;pointer-events:none"></span>
        <span aria-hidden="true" style="
          position:absolute;inset:20px;border:1px solid var(--otr-sky);border-radius:8px;pointer-events:none;opacity:.55"></span>

        <div style="position:relative">
          ${otrSeal()}

          <div class="eyebrow" style="margin:18px 0 6px;letter-spacing:.22em">Certificado oficial OTR</div>

          <div class="muted" style="font-size:13px;letter-spacing:.04em;margin-bottom:6px">
            Se otorga el presente diploma a
          </div>

          <div class="brand-font cert-name" style="
            font-size:42px;line-height:1.08;color:var(--otr-navy);margin:6px 0 4px">${name}</div>

          <div style="width:120px;height:2px;background:linear-gradient(90deg,transparent,var(--otr-sky),transparent);margin:14px auto 18px"></div>

          <div class="muted" style="font-size:13px;letter-spacing:.04em">
            por haber completado satisfactoriamente el programa
          </div>
          <div style="font-size:20px;font-weight:750;color:var(--text);margin-top:8px">${title}</div>
          ${program ? `<div class="sky" style="font-size:13.5px;font-weight:600;margin-top:4px">${program}</div>` : ""}

          <div class="divider" style="margin:30px auto 22px;max-width:520px"></div>

          <div class="row between vcenter" style="max-width:520px;margin:0 auto;gap:16px">
            <div style="text-align:center;flex:1">
              <div class="brand-font" style="font-size:18px;color:var(--otr-navy);border-bottom:1.5px solid var(--otr-navy);padding-bottom:6px">OTR Debate Academy</div>
              <div class="faint" style="font-size:11px;margin-top:7px;letter-spacing:.08em;text-transform:uppercase">Firma</div>
            </div>
            <div style="text-align:center;flex:1">
              <div class="brand-font" style="font-size:18px;color:var(--otr-navy);border-bottom:1.5px solid var(--otr-navy);padding-bottom:6px">${issued || "—"}</div>
              <div class="faint" style="font-size:11px;margin-top:7px;letter-spacing:.08em;text-transform:uppercase">Fecha de emisión</div>
            </div>
          </div>
        </div>
      </div>
    </div>`;
  }
};
