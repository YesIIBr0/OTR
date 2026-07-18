/* OTR Aula · i18n scaffold (Fase 1)
   Helper LIGERO — NO traduce todas las pantallas (eso es otra ola).
   Solo cubre el CHROME de navegación: labels del nav (sidebar/tabbar),
   grupos del sidebar y los textos del topbar (búsqueda, crear, etc.).

   Uso:
     import { t, getLang, setLang } from "./i18n";
     t("nav.dashboard")            -> usa el idioma actual (cookie otr_lang)
     t("nav.dashboard", "en")      -> fuerza idioma
     getLang()                     -> 'es' | 'en'  (default 'es')
     setLang('en')                 -> escribe cookie otr_lang y recarga

   Default y fallback: 'es'. Si una llave no existe en el idioma activo,
   cae a 'es'; si tampoco existe, devuelve la propia llave (nunca rompe). */

// [i18n Fase 4 · F4.1] Diccionarios POR PANTALLA (app/lib/i18n-keys/*.ts): ya NO se importan
// aquí. Cada scr-*.ts los registra en su propio top-level vía registerDict() al cargar SU chunk
// (import() en screens.ts) — así los ~200 kB de strings de TODAS las pantallas dejan de viajar en
// el chunk inicial de /aula y se code-splittean con su pantalla. Ver docs/review · FASE 4.
//
// ÚNICA excepción: el diccionario del CHROME (err.* + apierr.*), que el shell (Aula.tsx / api.ts)
// pinta como toasts de error ANTES de que cargue ninguna pantalla → se queda estático aquí.
import { dict as d_chrome } from "./i18n-keys/chrome";

export type Lang = "es" | "en";
// Diccionario plano { llave: texto }. Los ~22 módulos de app/lib/i18n-keys/*.ts
// tienen esta misma forma ({es,en} de strings) y se fusionan abajo en DICT.
type Dict = Record<string, string>;
interface LangDict {
  es: Dict;
  en: Dict;
}

const DICT: LangDict = {
  es: {
    // grupos del sidebar
    "group.main": "Principal",
    "group.learn": "Aprender",
    "group.membership": "Membresía",
    "group.progress": "Centro de progreso",
    "group.marketplace": "Marketplace",
    "group.workspace": "Espacio de coach",
    "group.system": "Sistema",

    // items de navegación (sidebar + tabbar)
    "nav.dashboard": "Inicio",
    "nav.debate": "Debate Hub",
    "nav.learn": "Aprender",
    "nav.catalog": "Cursos",
    "nav.course": "Cursos",
    "nav.progress": "Niveles",
    "nav.badges": "Logros",
    "nav.grades": "Mis calificaciones",
    "nav.lifetime": "Mi trayectoria",
    "nav.membership": "Membresía",
    "nav.mybookings": "Mis reservas",
    "nav.admin": "Moderación",
    "nav.users": "Usuarios",
    "nav.metrics": "Métricas",
    "nav.whatsapp": "WhatsApp",
    "nav.certifications": "Certificaciones",
    "nav.marketplace": "Marketplace",
    "nav.events": "Eventos",
    "nav.explore": "Coaches",
    "nav.messages": "Mensajes",
    "nav.parent": "Portal de familia",
    "nav.settings": "Ajustes",
    "nav.profile": "Perfil",
    "nav.workspace": "Panel de coach",
    "nav.coachwork": "Reservas e ingresos",
    "nav.gradebook": "Calificador",
    "nav.participants": "Participantes",
    "nav.manage": "Gestionar",
    "nav.designsystem": "Design System",
    "nav.arsenal": "Arsenal",
    "nav.logout": "Salir",

    // topbar / chrome
    "top.search": "Buscar cursos, tareas, personas…",
    "top.create": "+ Crear",
    "top.notifications": "Notificaciones",
    "top.menu": "Menú",
    "top.lang": "Idioma",

    // roles (footer del sidebar)
    "role.student": "Estudiante",
    "role.teacher": "Profesor",
    "role.coach": "Coach",
    "role.parent": "Familia",
    "role.admin": "Administración",

    // placeholder "En construcción"
    "soon.eyebrow": "Próximamente",
    "soon.title": "En construcción",
    "soon.body": "Esta sección llega en esta fase. Estamos afinando los últimos detalles.",

    // shell del Aula (Aula.tsx) — loading, toasts, modales del constructor de cursos
    "aula.loading": "Cargando tu aula…",
    "aula.confirm": "Confirmar",
    "aula.cancel": "Cancelar",
    "aula.save": "Guardar",
    "aula.saving": "Guardando…",
    "aula.close": "Cerrar",
    "aula.changesSaved": "Cambios guardados",
    "aula.noFile": "No hay archivo",
    "aula.uploadError": "Error al subir el archivo",
    "aula.onlyHttpLinks": "Solo se permiten enlaces http o https",
    "aula.linkUrlPrompt": "URL del enlace:",
    // barra de texto rico (labels/tooltips)
    "aula.rtBold": "Negrita",
    "aula.rtItalic": "Cursiva",
    "aula.rtHeading": "Subtítulo",
    "aula.rtList": "Lista",
    "aula.rtLink": "Enlace",
    "aula.rtClearFormat": "Quitar formato",
    // progreso de plantilla
    "aula.preparing": "Preparando…",
    "aula.creatingContent": "Creando contenido… ({done}/{total})",
    "aula.creatingTemplate": "Creando \"{name}\"…",
    "aula.courseFromTemplate": "Curso creado desde plantilla",
    "aula.templatePartialFail": "Se creó el curso, pero falló parte de la plantilla: ",
    // galería "¿cómo empezar?"
    "aula.startTitle": "¿Cómo quieres empezar tu curso?",
    "aula.startBlank": "En blanco",
    "aula.startBlankDesc": "Empieza un curso vacío y constrúyelo tú.",
    "aula.tplSections": "{secs} secciones · {acts} actividades · {format}",
    "aula.tplViewContent": "Ver contenido",
    "aula.tplUse": "Usar esta plantilla",
    // crear curso
    "aula.newCourse": "Nuevo curso",
    "aula.newCourseTpl": "Nuevo curso · {name}",
    "aula.courseFullName": "Nombre completo del curso",
    "aula.courseCode": "Código corto (único)",
    "aula.courseFormat": "Formato / categoría",
    "aula.modality": "Modalidad",
    "aula.modalityOnline": "Online",
    "aula.modalityPresential": "Presencial",
    "aula.modalityHybrid": "Híbrido",
    "aula.capacityOpt": "Cupo (capacidad, opcional)",
    "aula.courseColor": "Color del curso",
    "aula.colorSky": "Azul cielo",
    "aula.colorNavy": "Navy",
    "aula.colorLightBlue": "Azul claro",
    "aula.colorGreen": "Verde",
    "aula.colorGray": "Gris",
    "aula.nextTopicOpt": "Próximo tema (opcional)",
    "aula.nextTopicPh": "Introducción al formato",
    "aula.programSummary": "Resumen del programa",
    "aula.programSummaryPh": "Describe de qué trata este programa…",
    "aula.status": "Estado",
    "aula.statusDraft": "Borrador (oculto del catálogo)",
    "aula.statusPublished": "Publicado (visible en el catálogo)",
    "aula.formatOther": "Otro",
    // [F6.3] Selector de coach dueño (solo ADMIN)
    "aula.courseOwner": "Coach responsable",
    "aula.courseOwnerSelf": "A mi nombre",
    "aula.courseCreated": "Curso creado — añade sus secciones",
    // duplicar
    "aula.copySuffix": " (copia)",
    "aula.lessonDuplicated": "Actividad duplicada",
    "aula.moduleDuplicated": "Sección duplicada",
    "aula.cantDuplicate": "No se pudo duplicar",
    // módulos
    "aula.createCourseFirst": "Primero crea un curso",
    "aula.newModule": "Nuevo módulo",
    "aula.course": "Curso",
    "aula.moduleTitle": "Título del módulo",
    "aula.moduleTitlePh": "Unidad 4 · Estrategia",
    "aula.moduleCreated": "Módulo creado",
    "aula.editModule": "Editar módulo",
    "aula.moduleUpdated": "Módulo actualizado",
    // tipos de lección
    "aula.typeLesson": "Lección",
    "aula.typeVideo": "Video",
    "aula.typeQuiz": "Examen",
    "aula.typeAssign": "Tarea",
    "aula.typeMic": "Grabación",
    "aula.typeFile": "Archivo",
    "aula.typeActivity": "Actividad",
    // tipos de entrega
    "aula.submitAll": "Todos (audio, video, archivo, texto)",
    "aula.submitFile": "Solo archivo",
    "aula.submitText": "Solo texto",
    "aula.submitAudio": "Solo audio (grabación)",
    "aula.submitVideo": "Solo video",
    "aula.submitFileText": "Archivo o texto",
    // crear/editar lección
    "aula.createSectionFirst": "Primero crea una sección dentro del curso",
    "aula.section": "Sección (módulo)",
    "aula.type": "Tipo",
    "aula.title": "Título",
    "aula.titlePh": "Claim · Warrant · Impact",
    "aula.durationOpt": "Duración (opcional)",
    "aula.durationPh": "15 min",
    "aula.video": "Video",
    "aula.videoNone": "Sin video",
    "aula.videoYoutube": "YouTube (pegar URL)",
    "aula.videoCloudflare": "Video alojado en OTR (ID)",
    "aula.videoSrc": "Enlace de YouTube o ID del video",
    "aula.videoSrcPh": "https://youtu.be/… o el ID del video",
    "aula.instructionsForStudent": "Instrucciones para el alumno",
    "aula.activityContent": "Contenido de la actividad",
    "aula.contentPh": "Escribe el contenido…",
    "aula.dueDateOpt": "Fecha límite (opcional)",
    "aula.allowedSubmitKinds": "Tipos de entrega permitidos",
    "aula.maxPointsOpt": "Puntos (máximo, opcional)",
    "aula.newActivityType": "Nueva actividad · {type}",
    "aula.newLessonContent": "Nueva lección / contenido",
    "aula.activityCreated": "Actividad creada",
    // activity chooser
    "aula.chooserLesson": "Lección (página)",
    "aula.chooserLessonDesc": "Página de contenido enriquecido (texto, imágenes, listas).",
    "aula.chooserVideo": "Video",
    "aula.chooserVideoDesc": "Clase en video desde YouTube o subida a OTR.",
    "aula.chooserQuiz": "Examen",
    "aula.chooserQuizDesc": "Cuestionario de opción múltiple autocalificable.",
    "aula.chooserAssign": "Tarea",
    "aula.chooserAssignDesc": "El alumno entrega un trabajo (archivo, texto o audio) para calificar.",
    "aula.chooserMic": "Grabación",
    "aula.chooserMicDesc": "El alumno graba y entrega un audio de práctica de oratoria.",
    "aula.chooserFile": "Archivo / recurso",
    "aula.chooserFileDesc": "Material descargable (PDF, plantilla) o enlace adjunto.",
    "aula.addActivityOrResource": "Añadir actividad o recurso",
    // editar lección
    "aula.prereqNone": "— Sin prerrequisito —",
    "aula.prereq": "Prerrequisito (completar antes de desbloquear)",
    "aula.editActivity": "Editar actividad",
    "aula.activityUpdated": "Actividad actualizada",
    // menú crear
    "aula.create": "Crear",
    // editar curso
    "aula.editCourse": "Editar curso",
    "aula.courseName": "Nombre del curso",
    "aula.format": "Formato",
    "aula.capacity": "Cupo (capacidad)",
    "aula.welcomeVideo": "Video de bienvenida",
    "aula.videoCloudflareStream": "Cloudflare Stream",
    "aula.welcomeVideoSrc": "URL de YouTube o UID de Cloudflare",
    "aula.welcomeVideoSrcPh": "https://youtu.be/… o el UID de Cloudflare",
    "aula.layout": "Layout (cómo lo ve el alumno)",
    "aula.layoutModules": "Módulos (acordeón) — lista de secciones",
    "aula.layoutGrid": "Cuadrícula — tarjeta por sección",
    "aula.layoutSingle": "Una sección por página",
    "aula.courseUpdated": "Curso actualizado",
    "aula.coursePublished": "Curso publicado — visible en el catálogo",
    "aula.courseToDraft": "Curso pasado a borrador",
    // editar perfil
    "aula.fullName": "Nombre completo",
    "aula.headline": "Titular",
    "aula.headlinePh": "ej: Coach · Public Forum",
    "aula.location": "Ubicación",
    "aula.locationPh": "Santo Domingo, RD",
    "aula.aboutMe": "Sobre mí",
    "aula.aboutMePh": "Cuéntale al Hub quién eres…",
    "aula.teachingStyle": "Cómo trabajo (estilo de enseñanza)",
    "aula.teachingStylePh": "Drills intensivos, foco en delivery, repetición deliberada…",
    "aula.formats": "Qué enseño (formatos, separados por coma)",
    "aula.formatsPh": "Public Forum, Lincoln-Douglas, Oratoria",
    "aula.currentPassword": "Contraseña actual (solo si la cambias)",
    "aula.optional": "opcional",
    "aula.newPassword": "Nueva contraseña",
    "aula.editProfile": "Editar perfil",
    "aula.profileUpdated": "Perfil actualizado",
    // perfil de coach · marketplace
    "aula.coachMarketProfile": "Perfil de coach · marketplace",
    "aula.marketVisibility": "Visibilidad en el marketplace",
    "aula.marketVisibleOn": "Visible — los alumnos pueden reservar",
    "aula.marketVisibleOff": "Oculto — no aparece en el marketplace",
    "aula.hourlyRate": "Tarifa por hora (USD)",
    "aula.languages": "Idiomas (separados por coma)",
    "aula.specialties": "Especialidades",
    "aula.specialtiesPh": "Public Forum, Lincoln-Douglas, Oratoria",
    "aula.responseTime": "Tiempo de respuesta",
    "aula.responseTimePh": "Responde en ~2 h",
    "aula.introVideo": "Video de presentación (URL de YouTube)",
    "aula.credentials": "Credenciales",
    "aula.credentialsPh": "Head Coach · 15+ torneos internacionales · ex-seleccionado nacional",
    "aula.cancelPolicy": "Política de cancelación",
    "aula.cancelPolicyPh": "Cancelación gratis hasta 24 h antes de la sesión.",
    "aula.priceSingle": "Precio · 1 sesión (USD)",
    "aula.price5": "Precio · paquete de 5 (USD)",
    "aula.price10": "Precio · paquete de 10 (USD)",
    "aula.coachProfileUpdated": "Perfil de coach actualizado",
    // evaluar habilidades
    "aula.skillConfidence": "Confianza",
    "aula.skillStructure": "Estructura",
    "aula.skillEvidence": "Evidencia",
    "aula.skillRebuttal": "Refutación",
    "aula.skillCrossex": "Cross-ex",
    "aula.skillDelivery": "Delivery",
    "aula.evaluateName": "Evaluar a {name}",
    "aula.skillsSaved": "Habilidades guardadas",
    // reseñas
    "aula.selectRating": "Selecciona una calificación",
    "aula.reviewPublished": "¡Reseña publicada!",
    // notificaciones
    "aula.notifications": "Notificaciones",
    "aula.markRead": "Marcar leídas",
    "aula.viewAll": "Ver todas",
    "aula.notifsMarkedRead": "Notificaciones marcadas como leídas",
    // inscripción / certificado
    "aula.enrolled": "¡Inscrito!",
    "aula.certIssued": "¡Certificado emitido!",
    "aula.programNotCompleted": "Programa no completado",
    // eliminar
    "aula.confirmDeleteCourse": "¿Eliminar el curso completo? Se borran sus módulos, lecciones y exámenes. No se puede deshacer.",
    "aula.confirmDeleteModule": "¿Eliminar el módulo y TODAS sus lecciones? No se puede deshacer.",
    "aula.confirmDeleteLesson": "¿Eliminar esta lección? No se puede deshacer.",
    "aula.deleted": "Eliminado",
    // ocultar/mostrar
    "aula.hiddenFromStudent": "Oculto al alumno",
    "aula.visibleToStudent": "Visible para el alumno",
    // calificar entregas
    "aula.gradeSubmissions": "Calificar entregas",
    "aula.feedback": "Feedback",
    "aula.feedbackPh": "Comentarios para el alumno…",
    "aula.grade0100": "Nota (0-100)",
    "aula.graded": "Calificado: ",
    "aula.pending": "Pendiente",
    "aula.submissionDefault": "entrega",
    "aula.noContentAttached": "Sin contenido adjunto.",
    "aula.download": "Descargar",
    "aula.file": "archivo",
    "aula.noSubmissionsTitle": "Sin entregas todavía",
    "aula.noSubmissionsBody": "Cuando un alumno entregue una tarea, aparecerá aquí.",
    "aula.selectAll": "Seleccionar todas",
    "aula.gradeShort": "Nota",
    "aula.commonFeedbackPh": "Feedback común (opcional)",
    "aula.applyToSelected": "Aplicar a seleccionadas",
    "aula.applying": "Aplicando…",
    "aula.selectAtLeastOne": "Selecciona al menos una entrega",
    "aula.putGradeOrFeedback": "Pon una nota o un feedback para aplicar",
    "aula.gradedCountOne": "{n} entrega calificada",
    "aula.gradedCountMany": "{n} entregas calificadas",
    "aula.gradeSaved": "Calificación guardada",
    // discusiones / recursos
    "aula.newThread": "Nueva discusión",
    "aula.threadTitlePh": "¿Cómo estructurar un rebuttal?",
    "aula.tag": "Etiqueta",
    "aula.tagPh": "Refutación",
    "aula.message": "Mensaje",
    "aula.messagePh": "Cuéntanos tu duda o aporte…",
    "aula.threadCreated": "Discusión creada",
    "aula.newResource": "Nuevo recurso",
    "aula.resourceTitlePh": "Plantilla de caso · Public Forum",
    "aula.resourceKindBrief": "Brief",
    "aula.resourceKindTemplate": "Plantilla",
    "aula.resourceKindDrill": "Drill",
    "aula.resourceKindRecording": "Grabación",
    "aula.resourceKindLink": "Enlace",
    "aula.formatPfPh": "Public Forum",
    "aula.urlOpt": "URL (opcional)",
    "aula.content": "Contenido",
    "aula.resourceContentPh": "Escribe el contenido (admite <b>, <h2>, <ul>, <li>…)",
    "aula.access": "Acceso",
    "aula.accessPublic": "Público",
    "aula.accessEnrolledOnly": "Solo inscritos",
    "aula.resourceCreated": "Recurso creado",
    // marcar lección
    "aula.lessonMarkedDone": "Lección marcada como completada",
    "aula.lessonUnmarked": "Lección desmarcada",
  },
  en: {
    // sidebar groups
    "group.main": "Main",
    "group.learn": "Learn",
    "group.membership": "Membership",
    "group.progress": "Progress Center",
    "group.marketplace": "Marketplace",
    "group.workspace": "Coach Workspace",
    "group.system": "System",

    // navigation items (sidebar + tabbar)
    "nav.dashboard": "Dashboard",
    "nav.debate": "Debate Hub",
    "nav.learn": "Learn",
    "nav.catalog": "Courses",
    "nav.course": "Courses",
    "nav.progress": "Levels",
    "nav.badges": "Achievements",
    "nav.grades": "My Grades",
    "nav.lifetime": "My Journey",
    "nav.membership": "Membership",
    "nav.mybookings": "My Bookings",
    "nav.admin": "Moderation",
    "nav.users": "Users",
    "nav.metrics": "Metrics",
    "nav.whatsapp": "WhatsApp",
    "nav.certifications": "Certifications",
    "nav.marketplace": "Marketplace",
    "nav.events": "Events",
    "nav.explore": "Coaches",
    "nav.messages": "Messages",
    "nav.parent": "Parent Portal",
    "nav.settings": "Settings",
    "nav.profile": "Profile",
    "nav.workspace": "Coach Dashboard",
    "nav.coachwork": "Bookings & Earnings",
    "nav.gradebook": "Gradebook",
    "nav.participants": "Participants",
    "nav.manage": "Manage",
    "nav.designsystem": "Design System",
    "nav.arsenal": "Arsenal",
    "nav.logout": "Sign out",

    // topbar / chrome
    "top.search": "Search courses, assignments, people…",
    "top.create": "+ Create",
    "top.notifications": "Notifications",
    "top.menu": "Menu",
    "top.lang": "Language",

    // roles (sidebar footer)
    "role.student": "Student",
    "role.teacher": "Teacher",
    "role.coach": "Coach",
    "role.parent": "Parent",
    "role.admin": "Admin",

    // "Coming soon" placeholder
    "soon.eyebrow": "Coming soon",
    "soon.title": "Under construction",
    "soon.body": "This section is arriving in this phase. We're polishing the final details.",

    // Aula shell (Aula.tsx) — loading, toasts, course-builder modals
    "aula.loading": "Loading your classroom…",
    "aula.confirm": "Confirm",
    "aula.cancel": "Cancel",
    "aula.save": "Save",
    "aula.saving": "Saving…",
    "aula.close": "Close",
    "aula.changesSaved": "Changes saved",
    "aula.noFile": "No file",
    "aula.uploadError": "Failed to upload the file",
    "aula.onlyHttpLinks": "Only http or https links are allowed",
    "aula.linkUrlPrompt": "Link URL:",
    // rich text toolbar (labels/tooltips)
    "aula.rtBold": "Bold",
    "aula.rtItalic": "Italic",
    "aula.rtHeading": "Heading",
    "aula.rtList": "List",
    "aula.rtLink": "Link",
    "aula.rtClearFormat": "Clear formatting",
    // template progress
    "aula.preparing": "Preparing…",
    "aula.creatingContent": "Creating content… ({done}/{total})",
    "aula.creatingTemplate": "Creating \"{name}\"…",
    "aula.courseFromTemplate": "Course created from template",
    "aula.templatePartialFail": "The course was created, but part of the template failed: ",
    // "how to start?" gallery
    "aula.startTitle": "How do you want to start your course?",
    "aula.startBlank": "Blank",
    "aula.startBlankDesc": "Start an empty course and build it yourself.",
    "aula.tplSections": "{secs} sections · {acts} activities · {format}",
    "aula.tplViewContent": "View content",
    "aula.tplUse": "Use this template",
    // create course
    "aula.newCourse": "New course",
    "aula.newCourseTpl": "New course · {name}",
    "aula.courseFullName": "Full course name",
    "aula.courseCode": "Short code (unique)",
    "aula.courseFormat": "Format / category",
    "aula.modality": "Modality",
    "aula.modalityOnline": "Online",
    "aula.modalityPresential": "In person",
    "aula.modalityHybrid": "Hybrid",
    "aula.capacityOpt": "Capacity (optional)",
    "aula.courseColor": "Course color",
    "aula.colorSky": "Sky blue",
    "aula.colorNavy": "Navy",
    "aula.colorLightBlue": "Light blue",
    "aula.colorGreen": "Green",
    "aula.colorGray": "Gray",
    "aula.nextTopicOpt": "Next topic (optional)",
    "aula.nextTopicPh": "Introduction to the format",
    "aula.programSummary": "Program summary",
    "aula.programSummaryPh": "Describe what this program is about…",
    "aula.status": "Status",
    "aula.statusDraft": "Draft (hidden from catalog)",
    "aula.statusPublished": "Published (visible in catalog)",
    "aula.formatOther": "Other",
    // [F6.3] Owner coach selector (ADMIN only)
    "aula.courseOwner": "Owner coach",
    "aula.courseOwnerSelf": "In my name",
    "aula.courseCreated": "Course created — add its sections",
    // duplicate
    "aula.copySuffix": " (copy)",
    "aula.lessonDuplicated": "Activity duplicated",
    "aula.moduleDuplicated": "Section duplicated",
    "aula.cantDuplicate": "Couldn't duplicate",
    // modules
    "aula.createCourseFirst": "Create a course first",
    "aula.newModule": "New module",
    "aula.course": "Course",
    "aula.moduleTitle": "Module title",
    "aula.moduleTitlePh": "Unit 4 · Strategy",
    "aula.moduleCreated": "Module created",
    "aula.editModule": "Edit module",
    "aula.moduleUpdated": "Module updated",
    // lesson types
    "aula.typeLesson": "Lesson",
    "aula.typeVideo": "Video",
    "aula.typeQuiz": "Quiz",
    "aula.typeAssign": "Assignment",
    "aula.typeMic": "Recording",
    "aula.typeFile": "File",
    "aula.typeActivity": "Activity",
    // submission types
    "aula.submitAll": "All (audio, video, file, text)",
    "aula.submitFile": "File only",
    "aula.submitText": "Text only",
    "aula.submitAudio": "Audio only (recording)",
    "aula.submitVideo": "Video only",
    "aula.submitFileText": "File or text",
    // create/edit lesson
    "aula.createSectionFirst": "Create a section inside the course first",
    "aula.section": "Section (module)",
    "aula.type": "Type",
    "aula.title": "Title",
    "aula.titlePh": "Claim · Warrant · Impact",
    "aula.durationOpt": "Duration (optional)",
    "aula.durationPh": "15 min",
    "aula.video": "Video",
    "aula.videoNone": "No video",
    "aula.videoYoutube": "YouTube (paste URL)",
    "aula.videoCloudflare": "Video hosted on OTR (ID)",
    "aula.videoSrc": "YouTube link or video ID",
    "aula.videoSrcPh": "https://youtu.be/… or the video ID",
    "aula.instructionsForStudent": "Instructions for the student",
    "aula.activityContent": "Activity content",
    "aula.contentPh": "Write the content…",
    "aula.dueDateOpt": "Due date (optional)",
    "aula.allowedSubmitKinds": "Allowed submission types",
    "aula.maxPointsOpt": "Points (maximum, optional)",
    "aula.newActivityType": "New activity · {type}",
    "aula.newLessonContent": "New lesson / content",
    "aula.activityCreated": "Activity created",
    // activity chooser
    "aula.chooserLesson": "Lesson (page)",
    "aula.chooserLessonDesc": "Rich content page (text, images, lists).",
    "aula.chooserVideo": "Video",
    "aula.chooserVideoDesc": "Video class from YouTube or uploaded to OTR.",
    "aula.chooserQuiz": "Quiz",
    "aula.chooserQuizDesc": "Self-graded multiple-choice quiz.",
    "aula.chooserAssign": "Assignment",
    "aula.chooserAssignDesc": "The student submits work (file, text or audio) to be graded.",
    "aula.chooserMic": "Recording",
    "aula.chooserMicDesc": "The student records and submits a speaking-practice audio.",
    "aula.chooserFile": "File / resource",
    "aula.chooserFileDesc": "Downloadable material (PDF, template) or attached link.",
    "aula.addActivityOrResource": "Add activity or resource",
    // edit lesson
    "aula.prereqNone": "— No prerequisite —",
    "aula.prereq": "Prerequisite (complete before unlocking)",
    "aula.editActivity": "Edit activity",
    "aula.activityUpdated": "Activity updated",
    // create menu
    "aula.create": "Create",
    // edit course
    "aula.editCourse": "Edit course",
    "aula.courseName": "Course name",
    "aula.format": "Format",
    "aula.capacity": "Capacity",
    "aula.welcomeVideo": "Welcome video",
    "aula.videoCloudflareStream": "Cloudflare Stream",
    "aula.welcomeVideoSrc": "YouTube URL or Cloudflare UID",
    "aula.welcomeVideoSrcPh": "https://youtu.be/… or the Cloudflare UID",
    "aula.layout": "Layout (how the student sees it)",
    "aula.layoutModules": "Modules (accordion) — list of sections",
    "aula.layoutGrid": "Grid — one card per section",
    "aula.layoutSingle": "One section per page",
    "aula.courseUpdated": "Course updated",
    "aula.coursePublished": "Course published — visible in the catalog",
    "aula.courseToDraft": "Course moved to draft",
    // edit profile
    "aula.fullName": "Full name",
    "aula.headline": "Headline",
    "aula.headlinePh": "e.g.: Coach · Public Forum",
    "aula.location": "Location",
    "aula.locationPh": "Santo Domingo, DR",
    "aula.aboutMe": "About me",
    "aula.aboutMePh": "Tell the Hub who you are…",
    "aula.teachingStyle": "How I work (teaching style)",
    "aula.teachingStylePh": "Intense drills, focus on delivery, deliberate repetition…",
    "aula.formats": "What I teach (formats, comma-separated)",
    "aula.formatsPh": "Public Forum, Lincoln-Douglas, Public Speaking",
    "aula.currentPassword": "Current password (only if changing it)",
    "aula.optional": "optional",
    "aula.newPassword": "New password",
    "aula.editProfile": "Edit profile",
    "aula.profileUpdated": "Profile updated",
    // coach · marketplace profile
    "aula.coachMarketProfile": "Coach profile · marketplace",
    "aula.marketVisibility": "Marketplace visibility",
    "aula.marketVisibleOn": "Visible — students can book",
    "aula.marketVisibleOff": "Hidden — not shown in the marketplace",
    "aula.hourlyRate": "Hourly rate (USD)",
    "aula.languages": "Languages (comma-separated)",
    "aula.specialties": "Specialties",
    "aula.specialtiesPh": "Public Forum, Lincoln-Douglas, Public Speaking",
    "aula.responseTime": "Response time",
    "aula.responseTimePh": "Replies in ~2 h",
    "aula.introVideo": "Intro video (YouTube URL)",
    "aula.credentials": "Credentials",
    "aula.credentialsPh": "Head Coach · 15+ international tournaments · former national team member",
    "aula.cancelPolicy": "Cancellation policy",
    "aula.cancelPolicyPh": "Free cancellation up to 24 h before the session.",
    "aula.priceSingle": "Price · 1 session (USD)",
    "aula.price5": "Price · pack of 5 (USD)",
    "aula.price10": "Price · pack of 10 (USD)",
    "aula.coachProfileUpdated": "Coach profile updated",
    // evaluate skills
    "aula.skillConfidence": "Confidence",
    "aula.skillStructure": "Structure",
    "aula.skillEvidence": "Evidence",
    "aula.skillRebuttal": "Rebuttal",
    "aula.skillCrossex": "Cross-ex",
    "aula.skillDelivery": "Delivery",
    "aula.evaluateName": "Evaluate {name}",
    "aula.skillsSaved": "Skills saved",
    // reviews
    "aula.selectRating": "Select a rating",
    "aula.reviewPublished": "Review published!",
    // notifications
    "aula.notifications": "Notifications",
    "aula.markRead": "Mark as read",
    "aula.viewAll": "View all",
    "aula.notifsMarkedRead": "Notifications marked as read",
    // enrollment / certificate
    "aula.enrolled": "Enrolled!",
    "aula.certIssued": "Certificate issued!",
    "aula.programNotCompleted": "Program not completed",
    // delete
    "aula.confirmDeleteCourse": "Delete the entire course? Its modules, lessons and quizzes will be removed. This can't be undone.",
    "aula.confirmDeleteModule": "Delete the module and ALL its lessons? This can't be undone.",
    "aula.confirmDeleteLesson": "Delete this lesson? This can't be undone.",
    "aula.deleted": "Deleted",
    // hide/show
    "aula.hiddenFromStudent": "Hidden from the student",
    "aula.visibleToStudent": "Visible to the student",
    // grade submissions
    "aula.gradeSubmissions": "Grade submissions",
    "aula.feedback": "Feedback",
    "aula.feedbackPh": "Comments for the student…",
    "aula.grade0100": "Grade (0-100)",
    "aula.graded": "Graded: ",
    "aula.pending": "Pending",
    "aula.submissionDefault": "submission",
    "aula.noContentAttached": "No content attached.",
    "aula.download": "Download",
    "aula.file": "file",
    "aula.noSubmissionsTitle": "No submissions yet",
    "aula.noSubmissionsBody": "When a student submits an assignment, it will appear here.",
    "aula.selectAll": "Select all",
    "aula.gradeShort": "Grade",
    "aula.commonFeedbackPh": "Common feedback (optional)",
    "aula.applyToSelected": "Apply to selected",
    "aula.applying": "Applying…",
    "aula.selectAtLeastOne": "Select at least one submission",
    "aula.putGradeOrFeedback": "Enter a grade or feedback to apply",
    "aula.gradedCountOne": "{n} submission graded",
    "aula.gradedCountMany": "{n} submissions graded",
    "aula.gradeSaved": "Grade saved",
    // threads / resources
    "aula.newThread": "New discussion",
    "aula.threadTitlePh": "How do I structure a rebuttal?",
    "aula.tag": "Tag",
    "aula.tagPh": "Rebuttal",
    "aula.message": "Message",
    "aula.messagePh": "Tell us your question or contribution…",
    "aula.threadCreated": "Discussion created",
    "aula.newResource": "New resource",
    "aula.resourceTitlePh": "Case template · Public Forum",
    "aula.resourceKindBrief": "Brief",
    "aula.resourceKindTemplate": "Template",
    "aula.resourceKindDrill": "Drill",
    "aula.resourceKindRecording": "Recording",
    "aula.resourceKindLink": "Link",
    "aula.formatPfPh": "Public Forum",
    "aula.urlOpt": "URL (optional)",
    "aula.content": "Content",
    "aula.resourceContentPh": "Write the content (supports <b>, <h2>, <ul>, <li>…)",
    "aula.access": "Access",
    "aula.accessPublic": "Public",
    "aula.accessEnrolledOnly": "Enrolled only",
    "aula.resourceCreated": "Resource created",
    // mark lesson
    "aula.lessonMarkedDone": "Lesson marked as complete",
    "aula.lessonUnmarked": "Lesson unmarked",
  },
};

/* registerDict(d) — fusiona un diccionario {es,en} en el DICT central (idempotente vía
   Object.assign). Es el mecanismo que reemplaza el import estático de los 23 diccionarios:
   cada scr-*.ts elegible llama registerDict(suDict) en su top-level, así que cuando screens.ts
   hace import() del builder, el diccionario queda fusionado ANTES del primer t() de esa pantalla.
   En los tests (imports estáticos de los builders) el top-level también corre → misma fusión.
   Registrar dos veces el mismo dict es inocuo (mismas claves, mismos valores). El chrome
   inline (group/nav/top/role/soon/aula.*) NO se pisa: esos prefijos no viven en ningún dict. */
export function registerDict(d?: { es?: Dict; en?: Dict } | null): void {
  if (!d) return;
  if (d.es) Object.assign(DICT.es, d.es);
  if (d.en) Object.assign(DICT.en, d.en);
}

// Diccionario del CHROME (err.* + apierr.*): estático, viaja en el chunk inicial con el resto
// del shell porque Aula.tsx/api.ts pintan estos toasts antes de cargar cualquier pantalla.
registerDict(d_chrome);

export const LANGS: Lang[] = ["es", "en"];
const DEFAULT_LANG: Lang = "es";
const COOKIE = "otr_lang";

// Type guard sobre LANGS (en vez de LANGS.includes(v) crudo) para que TS pueda
// angostar `string` a `Lang` — Array.includes no angosta por sí solo.
function isLang(v: string): v is Lang {
  return (LANGS as readonly string[]).includes(v);
}

/* Lee el idioma activo desde la cookie 'otr_lang'. Default 'es'.
   Seguro en SSR: si no hay document, devuelve el default. */
export function getLang(): Lang {
  try {
    if (typeof document === "undefined") return DEFAULT_LANG;
    const m = document.cookie.match(/(?:^|;\s*)otr_lang=([^;]+)/);
    const v = m ? decodeURIComponent(m[1]) : "";
    return isLang(v) ? v : DEFAULT_LANG;
  } catch {
    return DEFAULT_LANG;
  }
}

/* Escribe la cookie 'otr_lang' (1 año) y recarga para repintar todo el chrome.
   Mantiene el patrón del landing (toggle ES/EN) — recarga simple y honesta.
   `lang` acepta `string` (no `Lang`) porque quien llama —el toggle ES/EN
   renderizado como string en shell.ts— pasa el valor crudo del atributo HTML. */
export function setLang(lang: string): void {
  const l = isLang(lang) ? lang : DEFAULT_LANG;
  try {
    document.cookie = `${COOKIE}=${l};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`;
  } catch {}
  try { location.reload(); } catch {}
}

/* t(key, lang?) — traduce una llave. Fallback en cascada:
   idioma activo -> 'es' -> la propia llave (nunca devuelve undefined). */
export function t(key: string, lang?: string): string {
  const l = lang && isLang(lang) ? lang : getLang();
  const table = DICT[l] || DICT[DEFAULT_LANG];
  if (table && key in table) return table[key];
  const base = DICT[DEFAULT_LANG];
  if (base && key in base) return base[key];
  return key;
}

/* tierLabel(tier, lang?) — etiqueta visible de un tier de debate (Novato, Bronze, …).
   El valor de `tier` es un dato de DB (any/unknown) y NO se altera; solo se mapea a
   la clave i18n "debate.tier.<minúsculas>" para mostrarlo traducido. Si el tier no
   está mapeado, devuelve el valor crudo (nunca rompe ni esconde un tier nuevo del
   backend). */
export function tierLabel(tier: unknown, lang?: string): string {
  const raw = String(tier ?? "").trim();
  if (!raw) return raw;
  const key = "debate.tier." + raw.toLowerCase();
  const out = t(key, lang);
  return out === key ? raw : out;
}

/* Exponemos setLang en window para que el toggle ES/EN del topbar (renderizado
   como string vía innerHTML en shell.ts) lo invoque por onclick — sin tener que
   tocar la delegación de clics de Aula.tsx. Patrón idéntico a window.go/api/toast. */
declare global {
  interface Window {
    otrSetLang?: typeof setLang;
    otrGetLang?: typeof getLang;
  }
}
if (typeof window !== "undefined") {
  window.otrSetLang = setLang;
  window.otrGetLang = getLang;
}

export const I18N = DICT;
