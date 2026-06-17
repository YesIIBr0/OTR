// @ts-nocheck
/* OTR · Helpers de texto compartidos (cliente).
   norm(): normaliza para BÚSQUEDA acento-insensible y case-insensible. Quita los
   diacríticos (NFD + corta los combining marks U+0300–U+036F) y baja a minúsculas. La
   misma técnica que app/api/public-profile/route.ts. [ENT-03] Aplicado a los filtros
   en-navegador (marketplace, roster, tabla de personas, catálogo, búsqueda global) — sin
   migración: los filtros corren sobre arrays ya cargados, basta normalizar ambos lados. */
export function norm(s) {
  return String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

// ¿`haystack` contiene `needle` ignorando acentos y mayúsculas? needle vacío = match.
export function matches(haystack, needle) {
  const q = norm(needle);
  if (!q) return true;
  return norm(haystack).includes(q);
}
