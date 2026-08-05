// OTR · Marketplace abierto — COVER de una clase [P3].
//
// Por qué existe: un listing es texto y una tarifa; no hay foto ni video que subir (y pedir
// una foto a cada profesor antes de publicar mataría la oferta desde el día uno). El cover
// se DERIVA de la materia y es determinista: misma materia ⇒ mismo cover, siempre.
//
// Registro visual INSTITUCIONAL, no de bazar: fondo crema, marco fino tipo diploma, el
// símbolo de la materia y su nombre en versalitas. La referencia es la grilla de materias
// de una academia, no la miniatura gritona de un marketplace de encargos — a esta plataforma
// entran menores y familias, y el cover es lo primero que dice si esto es serio.
//
// Fuente única: la usan el listado (fila) y la ficha (cabecera), así que una clase se ve
// igual en los dos sitios.
import { IC } from "./icons";

/** Materia → símbolo. Un slug desconocido cae en el libro (nunca queda hueco). */
const CAT_ICON: Record<string, string> = {
  debate: "mic", oratoria: "headset", ingles: "msg", matematicas: "chart",
  ciencias: "target", programacion: "grid", ai: "levels", musica: "play", otros: "book",
};

export type CoverSize = "row" | "hero";

/**
 * HTML del cover. `label` ya viene traducido y escapado por quien llama (las pantallas
 * resuelven el slug con su diccionario i18n).
 */
export function listingCover(category: string, label: string, size: CoverSize = "row"): string {
  const key = String(category || "otros");
  const icon = IC[CAT_ICON[key] || "book"] || IC.book;
  return `<div class="lst-cover lst-cover--${size}" data-cat="${key}" aria-hidden="true">
    <span class="lc-frame"></span>
    <span class="lc-ic">${icon}</span>
    <span class="lc-cat">${label}</span>
  </div>`;
}
