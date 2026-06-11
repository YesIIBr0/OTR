// OTR · Trust & Safety (server) — protección de menores en mensajería (PRD §7.4 + §17.4).
// Objetivo: evitar que un menor reciba/comparta datos de contacto que muevan la
// conversación fuera de la plataforma (teléfonos, emails, handles de apps externas,
// invitaciones tipo "escríbeme a…", URLs). NO bloqueamos el mensaje: lo ENMASCARAMOS
// con '•••' para que la interacción siga, pero sin filtrar el dato sensible.
// El enforcement vive en la capa de datos/API, no en la UI.

const MASK = "•••";

// Apps/canales externos y muletillas de "contáctame fuera de aquí".
// \b no funciona bien con acentos/ñ, así que cerramos con límites laxos.
const EXTERNAL_PATTERNS: { re: RegExp; reason: string }[] = [
  { re: /\bwhats?app\b/gi, reason: "whatsapp" },
  { re: /\bwsp\b/gi, reason: "whatsapp" },
  { re: /\bwpp\b/gi, reason: "whatsapp" },
  { re: /\btelegram\b/gi, reason: "telegram" },
  { re: /\b(?:instagram|insta|ig)\b/gi, reason: "instagram" },
  { re: /\bsnapchat\b/gi, reason: "snapchat" },
  { re: /\bsignal\b/gi, reason: "signal" },
  { re: /\bdiscord\b/gi, reason: "discord" },
  { re: /escr[ií]beme a/gi, reason: "invite_offplatform" },
  { re: /m[ií] n[uú]mero/gi, reason: "phone_intro" },
];

// Email — captura razonablemente direcciones aunque tengan subdominios.
const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;

// URLs http(s) — para que no compartan enlaces externos a un menor.
const URL_RE = /\bhttps?:\/\/[^\s]+/gi;

// Handles tipo @usuario (Instagram/Telegram/etc.).
const HANDLE_RE = /(^|[\s(])@[a-z0-9_.]{2,}/gi;

// Teléfonos: 7+ dígitos en una secuencia con separadores comunes ( ), -, ., espacio,
// opcionalmente con prefijo internacional +1 / 809 dominicano. Contamos dígitos reales
// para evitar enmascarar cosas como "2024" o un score "10-7".
const PHONE_RE = /\+?\d[\d\s().-]{6,}\d/g;

/**
 * Filtra y enmascara información de contacto de un texto libre.
 * @returns { clean, blocked, reasons } — clean = texto con datos enmascarados;
 *          blocked = true si se enmascaró algo; reasons = etiquetas de lo detectado.
 */
export function filterContactInfo(text: string): {
  clean: string;
  blocked: boolean;
  reasons: string[];
} {
  let out = String(text ?? "");
  const reasons: string[] = [];
  const flag = (r: string) => {
    if (!reasons.includes(r)) reasons.push(r);
  };

  // 1) Emails (antes de teléfonos: un email puede contener dígitos).
  out = out.replace(EMAIL_RE, () => {
    flag("email");
    return MASK;
  });

  // 2) URLs http(s).
  out = out.replace(URL_RE, () => {
    flag("url");
    return MASK;
  });

  // 3) Apps externas e invitaciones off-platform.
  for (const { re, reason } of EXTERNAL_PATTERNS) {
    out = out.replace(re, () => {
      flag(reason);
      return MASK;
    });
  }

  // 4) Handles @usuario (preservando el separador inicial capturado).
  out = out.replace(HANDLE_RE, (_m, pre) => {
    flag("handle");
    return `${pre}${MASK}`;
  });

  // 5) Teléfonos: solo enmascara si la secuencia tiene 7+ dígitos reales.
  out = out.replace(PHONE_RE, (m) => {
    const digits = m.replace(/\D/g, "");
    if (digits.length >= 7) {
      flag("phone");
      return MASK;
    }
    return m;
  });

  return { clean: out, blocked: reasons.length > 0, reasons };
}

/** True si el usuario es menor de edad (PRD age-band). */
export function isMinor(user: { ageBand?: string | null } | null | undefined): boolean {
  return !!user && user.ageBand === "minor";
}
