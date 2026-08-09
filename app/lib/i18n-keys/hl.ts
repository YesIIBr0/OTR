// OTR · i18n — "Lo mejor de la temporada" (hl.*): la vista LARGA de highlights
// (scr-highlights, 1 logro por fila) + la gestión del staff que vive en esa misma
// pantalla. scr-extra lo registra también, porque el acceso desde "Mis cursos"
// (portal del coach) usa hl.manageBtn antes de que cargue el chunk de highlights.
// Las etiquetas de categoría mapean los valores que se guardan en Highlight.category
// (texto, no enum): el valor viaja en español a la DB y aquí solo se traduce el label;
// una categoría que no esté en la tabla se pinta cruda (sin inventar traducción).
export const dict = {
  es: {
    "hl.eyebrow": "Temporada",
    "hl.title": "Lo mejor de la temporada",
    "hl.subtitle": "Cada logro del equipo, con su publicación en Instagram",
    "hl.countLabel": "Logros",
    "hl.back": "Volver al inicio",

    "hl.openIg": "Ver la publicación en Instagram",
    "hl.noLink": "Sin publicación enlazada",

    "hl.emptyTitle": "Todavía no hay logros publicados",
    "hl.emptyBody": "Cuando el equipo suba un logro de la temporada, aparecerá aquí.",

    // Categorías (valor guardado → label)
    "hl.catFinal": "Final",
    "hl.catTorneo": "Torneo",
    "hl.catEquipo": "Equipo",
    "hl.catPremio": "Premio",

    // --- Gestión (coach / admin) ---
    "hl.manageBtn": "Lo mejor de la temporada",
    "hl.newBtn": "Nuevo logro",
    "hl.editBtn": "Editar",
    "hl.deleteBtn": "Eliminar",
    "hl.createTitle": "Publicar un logro",
    "hl.editTitle": "Editar el logro",
    "hl.fieldTitle": "Título",
    "hl.fieldCategory": "Categoría",
    "hl.fieldDate": "Fecha",
    "hl.fieldImage": "Foto del logro",
    "hl.fieldInstagram": "Enlace de la publicación de Instagram",
    "hl.created": "Logro publicado",
    "hl.updated": "Logro actualizado",
    "hl.deleted": "Logro eliminado",
    "hl.deleteConfirm": "¿Eliminar el logro «{name}»? No se puede deshacer.",
    "hl.errAction": "No se pudo completar la acción",

    // --- Subida de la foto (dropzone del modal del staff) ---
    // El tope de 25 MB y los formatos son los que YA aplica /api/uploads: aquí solo se
    // enuncian para que el coach no descubra el límite al fallar la subida.
    "hl.imgDropTitle": "Arrastra la foto o elígela",
    "hl.imgHint": "PNG, JPG, WEBP o GIF · hasta 25 MB",
    "hl.imgPick": "Elegir imagen",
    "hl.imgRemove": "Quitar la foto",
    "hl.imgUploading": "Subiendo la foto…",
    "hl.imgUploaded": "Foto subida",
    "hl.imgPreviewAlt": "Vista previa de la foto del logro",
    "hl.imgErrTitle": "No se pudo subir la foto",
    "hl.imgErrOnlyImages": "Solo se aceptan imágenes (PNG, JPG, WEBP o GIF).",
    "hl.imgErrTooBig": "La imagen pesa más de 25 MB. Elige una más ligera.",
    "hl.imgUrlLabel": "O pega la URL de una imagen",
  },
  en: {
    "hl.eyebrow": "Season",
    "hl.title": "Best of the season",
    "hl.subtitle": "Every team achievement, with its Instagram post",
    "hl.countLabel": "Highlights",
    "hl.back": "Back to dashboard",

    "hl.openIg": "View the post on Instagram",
    "hl.noLink": "No post linked",

    "hl.emptyTitle": "No highlights published yet",
    "hl.emptyBody": "When the team publishes a season achievement, it will show up here.",

    "hl.catFinal": "Final",
    "hl.catTorneo": "Tournament",
    "hl.catEquipo": "Team",
    "hl.catPremio": "Award",

    "hl.manageBtn": "Best of the season",
    "hl.newBtn": "New highlight",
    "hl.editBtn": "Edit",
    "hl.deleteBtn": "Delete",
    "hl.createTitle": "Publish a highlight",
    "hl.editTitle": "Edit highlight",
    "hl.fieldTitle": "Title",
    "hl.fieldCategory": "Category",
    "hl.fieldDate": "Date",
    "hl.fieldImage": "Highlight photo",
    "hl.fieldInstagram": "Instagram post link",
    "hl.created": "Highlight published",
    "hl.updated": "Highlight updated",
    "hl.deleted": "Highlight deleted",
    "hl.deleteConfirm": "Delete the highlight “{name}”? This cannot be undone.",
    "hl.errAction": "Could not complete the action",

    "hl.imgDropTitle": "Drag the photo here or pick one",
    "hl.imgHint": "PNG, JPG, WEBP or GIF · up to 25 MB",
    "hl.imgPick": "Choose image",
    "hl.imgRemove": "Remove photo",
    "hl.imgUploading": "Uploading the photo…",
    "hl.imgUploaded": "Photo uploaded",
    "hl.imgPreviewAlt": "Preview of the highlight photo",
    "hl.imgErrTitle": "The photo could not be uploaded",
    "hl.imgErrOnlyImages": "Only images are accepted (PNG, JPG, WEBP or GIF).",
    "hl.imgErrTooBig": "The image is larger than 25 MB. Choose a lighter one.",
    "hl.imgUrlLabel": "Or paste an image URL",
  },
};
