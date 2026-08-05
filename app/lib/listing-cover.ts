// OTR · Marketplace abierto — COVER de una clase [P3/P5].
//
// Dos registros, en este orden:
//  1) FOTO del profesor si la tiene (User.avatarUrl, que ya se edita desde el perfil). En un
//     marketplace de clases la cara ES la señal de confianza: es lo que decide si alguien
//     sigue leyendo. Si existe, manda.
//  2) EMBLEMA de la materia si no hay foto. Un listing es texto y una tarifa; no hay imagen
//     que subir, y exigirla antes de publicar mataría la oferta el día uno. El emblema se
//     deriva del slug y es determinista: misma materia ⇒ mismo cover, siempre.
//
// El emblema va en registro INSTITUCIONAL, no de bazar: crema, marco fino tipo diploma,
// símbolo y versalitas. La referencia es la grilla de materias de una academia, no la
// miniatura gritona de un marketplace de encargos — a esta plataforma entran menores y
// familias, y el cover es lo primero que dice si esto es serio.
//
// Fuente única: la usan el listado (fila) y la ficha (cabecera), así una clase se ve igual
// en los dos sitios.
import { IC } from "./icons";
import { esc } from "./esc";

/** Materia → símbolo. Un slug desconocido cae en el libro (nunca queda hueco). */
const CAT_ICON: Record<string, string> = {
  debate: "mic", oratoria: "headset", ingles: "msg", matematicas: "chart",
  ciencias: "target", programacion: "grid", ai: "levels", musica: "play", otros: "book",
};

export type CoverSize = "row" | "hero";

/**
 * HTML del cover. `label` ya viene traducido y escapado por quien llama (las pantallas
 * resuelven el slug con su diccionario i18n). `photoUrl` es opcional: si viene, se usa la
 * foto; la URL se escapa en el atributo para que no pueda cerrar el src e inyectar un
 * manejador (`" onerror="…`).
 */
export function listingCover(category: string, label: string, size: CoverSize = "row", photoUrl = ""): string {
  const key = String(category || "otros");
  if (photoUrl) {
    return `<div class="lst-cover lst-cover--${size} lst-cover--photo" data-cat="${key}">
      <img src="${esc(photoUrl)}" alt="" loading="lazy" decoding="async"/>
      <span class="lc-cat">${label}</span>
    </div>`;
  }
  const icon = IC[CAT_ICON[key] || "book"] || IC.book;
  return `<div class="lst-cover lst-cover--${size}" data-cat="${key}" aria-hidden="true">
    <span class="lc-frame"></span>
    <span class="lc-ic">${icon}</span>
    <span class="lc-cat">${label}</span>
  </div>`;
}
