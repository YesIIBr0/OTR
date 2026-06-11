// Sanitización de HTML de usuario — SOLO SERVIDOR (usa sanitize-html, parser real).
// Reemplaza el saneo por regex (bypasseable: H3/H5 de la auditoría). Vive en su propio
// módulo para NO arrastrar la librería al bundle del cliente (que importa video.ts).
import sanitize from "sanitize-html";

const ALLOWED_TAGS = [
  "p", "b", "strong", "i", "em", "u", "h2", "h3", "h4",
  "ul", "ol", "li", "br", "a", "blockquote", "code", "pre", "span", "div",
];

/**
 * Sanea contentHtml antes de persistir, de modo que el cliente pueda inyectarlo por
 * innerHTML con seguridad. Allowlist de tags + atributos + esquemas (http/https/mailto).
 * Elimina script, iframe, style, manejadores on-evento y esquemas peligrosos
 * (javascript:, data:) con un parser real, no con expresiones regulares.
 */
export function sanitizeHtml(html: unknown): string | null {
  const s = String(html ?? "");
  if (!s.trim()) return null;
  const clean = sanitize(s, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: { a: ["href", "title", "target", "rel"] },
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesByTag: { a: ["http", "https", "mailto"] },
    allowProtocolRelative: false,
    disallowedTagsMode: "discard",
    transformTags: {
      a: sanitize.simpleTransform("a", { rel: "noopener noreferrer nofollow", target: "_blank" }),
    },
  });
  const out = clean.trim().slice(0, 20000);
  return out || null;
}
