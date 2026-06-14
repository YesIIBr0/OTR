// Plantillas de curso OTR (debate y oratoria) para el creador v2 "Empezar desde plantilla".
// Son datos estáticos: al elegir una, el cliente orquesta POST /api/courses → /api/modules
// → /api/lessons (→ /api/quizzes si la lección trae questions) y deja el curso ya armado.
// Cada lección puede traer: title, type, dur?, contentHtml?, videoKind?, videoSrc?,
// dueAt?, submitKinds?, maxPoints?, questions?[] (solo type=quiz).
//
// Tipos de actividad válidos: lesson | video | quiz | assign | mic | file.

export type TemplateLesson = {
  title: string;
  type: string;
  dur?: string;
  contentHtml?: string;
  submitKinds?: string;
  maxPoints?: number;
  questions?: { prompt: string; options: { text: string; correct: boolean }[] }[];
};
export type CourseTemplate = {
  id: string;
  name: string;
  desc: string;
  format: string;
  level: string;
  summary: string;
  sections: { title: string; lessons: TemplateLesson[] }[];
};

const p = (html: string) => `<p>${html}</p>`;

export const COURSE_TEMPLATES: CourseTemplate[] = [
  {
    id: "pf-fundamentos",
    name: "Fundamentos de Debate (Public Forum)",
    desc: "Curso introductorio de 4 unidades para debatistas nuevos en PF: del claim a la primera ronda completa.",
    format: "Public Forum",
    level: "Starter",
    summary: "Aprende el formato Public Forum desde cero: estructura, argumentos, evidencia y tu primera ronda.",
    sections: [
      { title: "Unidad 1 · Bienvenida y formato PF", lessons: [
        { title: "Qué es Public Forum", type: "video", dur: "8 min", contentHtml: p("Una introducción al formato: para qué sirve, cómo se juzga y por qué es el mejor punto de entrada al debate competitivo.") },
        { title: "Estructura de una ronda y tiempos", type: "lesson", dur: "12 min", contentHtml: p("Constructive, Rebuttal, Summary, Final Focus y los Crossfires. Edita esta lección con los tiempos exactos y un diagrama.") },
        { title: "Glosario y plantilla de flujo", type: "file", contentHtml: p("Adjunta aquí el glosario de términos de debate y la plantilla de flowing descargable.") },
      ]},
      { title: "Unidad 2 · Construir argumentos", lessons: [
        { title: "Claim · Warrant · Impact", type: "lesson", dur: "15 min", contentHtml: p("La anatomía de un argumento sólido. Explica cada parte con ejemplos del tema actual.") },
        { title: "Escribe tus 3 primeras contentions", type: "assign", submitKinds: "text,file", maxPoints: 30, contentHtml: p("Redacta 3 contentions con su Claim, Warrant e Impact. Entrega en texto o archivo.") },
        { title: "Anatomía de un argumento", type: "quiz", questions: [
          { prompt: "En la estructura Claim · Warrant · Impact, ¿qué es el WARRANT?", options: [
            { text: "La afirmación principal en una frase", correct: false },
            { text: "El razonamiento que conecta la evidencia con el claim", correct: true },
            { text: "Lo que pasa en el mundo si el claim es cierto", correct: false },
          ]},
          { prompt: "¿Qué representa el IMPACT?", options: [
            { text: "Por qué importa el argumento / su consecuencia", correct: true },
            { text: "La fuente de la evidencia", correct: false },
            { text: "La refutación del rival", correct: false },
          ]},
        ]},
      ]},
      { title: "Unidad 3 · Evidencia y cita", lessons: [
        { title: "Cómo cortar cards", type: "lesson", dur: "14 min", contentHtml: p("Cómo encontrar, recortar y citar evidencia de forma honesta y persuasiva.") },
        { title: "Plantilla de evidencia OTR", type: "file", contentHtml: p("Adjunta la plantilla estándar de evidencia (autor, año, fuente, cita textual).") },
        { title: "Sube 5 cards citadas", type: "assign", submitKinds: "file", maxPoints: 25, contentHtml: p("Reúne 5 piezas de evidencia bien citadas sobre el tema y súbelas en un archivo.") },
      ]},
      { title: "Unidad 4 · Tu primera ronda", lessons: [
        { title: "Demo de ronda comentada", type: "video", dur: "18 min", contentHtml: p("Una ronda completa con comentarios para ver todo en acción.") },
        { title: "Graba tu Constructive de 4 min", type: "mic", submitKinds: "audio", maxPoints: 40, contentHtml: p("Graba tu discurso constructivo. Foco en estructura y claridad.") },
        { title: "Examen final de unidad", type: "quiz" },
      ]},
    ],
  },
  {
    id: "refutacion",
    name: "Refutación y Rebuttal",
    desc: "3 unidades para escuchar, responder y desarmar el caso rival.",
    format: "Public Forum",
    level: "Intermedio",
    summary: "Domina la refutación: flowing, line-by-line, turns y un rebuttal en vivo.",
    sections: [
      { title: "Unidad 1 · Escuchar y flujar", lessons: [
        { title: "Sistema de flowing", type: "lesson", dur: "13 min", contentHtml: p("Cómo tomar notas estructuradas de la ronda para no perder ningún argumento.") },
        { title: "Plantilla de flow descargable", type: "file", contentHtml: p("Adjunta tu plantilla de flow.") },
        { title: "Flujea esta ronda grabada", type: "assign", submitKinds: "file", maxPoints: 20, contentHtml: p("Mira la ronda y entrega tu flow.") },
      ]},
      { title: "Unidad 2 · Refutar", lessons: [
        { title: "Signposting y line-by-line", type: "lesson", dur: "12 min", contentHtml: p("Responde de forma ordenada para que el juez te siga.") },
        { title: "Turns vs. respuestas defensivas", type: "lesson", dur: "10 min", contentHtml: p("La diferencia entre defenderte y voltear el argumento a tu favor.") },
        { title: "Tipos de respuesta", type: "quiz", questions: [
          { prompt: "¿Qué es un 'turn'?", options: [
            { text: "Convertir el argumento rival en una razón para votar por ti", correct: true },
            { text: "Repetir tu propio argumento más fuerte", correct: false },
            { text: "Ignorar el argumento rival", correct: false },
          ]},
        ]},
      ]},
      { title: "Unidad 3 · Rebuttal en vivo", lessons: [
        { title: "Graba un rebuttal de 4 min", type: "mic", submitKinds: "audio", maxPoints: 40, contentHtml: p("Responde el caso de muestra en 4 minutos.") },
        { title: "Bloque de respuestas escrito", type: "assign", submitKinds: "text", maxPoints: 30, contentHtml: p("Prepara respuestas a los 5 argumentos más comunes del tema.") },
        { title: "Rebuttals modelo comentados", type: "video", dur: "15 min" },
      ]},
    ],
  },
  {
    id: "crossfire",
    name: "Cross-Examination & Crossfire",
    desc: "Mini-curso de 3 unidades de práctica deliberada de interpelación.",
    format: "Public Forum",
    level: "Drills",
    summary: "Haz preguntas que ganan rondas: del fundamento al crossfire bajo presión.",
    sections: [
      { title: "Unidad 1 · Fundamentos", lessons: [
        { title: "Objetivos del crossfire", type: "lesson", dur: "9 min", contentHtml: p("Qué buscas en cada crossfire y cómo no perderlo.") },
        { title: "Buenas vs malas preguntas", type: "video", dur: "11 min" },
      ]},
      { title: "Unidad 2 · Drills", lessons: [
        { title: "Diseña 8 preguntas trampa", type: "assign", submitKinds: "text", maxPoints: 20, contentHtml: p("Escribe preguntas que expongan debilidades del caso rival.") },
        { title: "Graba un crossfire simulado", type: "mic", submitKinds: "audio", maxPoints: 30 },
      ]},
      { title: "Unidad 3 · Bajo presión", lessons: [
        { title: "Detecta la falacia", type: "quiz" },
        { title: "Crossfire en vivo cronometrado", type: "mic", submitKinds: "audio", maxPoints: 40 },
        { title: "Checklist de crossfire", type: "file" },
      ]},
    ],
  },
  {
    id: "oratoria",
    name: "Oratoria y Delivery",
    desc: "4 unidades de public speaking centradas en voz, cuerpo y presencia.",
    format: "Oratoria",
    level: "Starter",
    summary: "Habla con presencia: voz, lenguaje corporal, estructura y un discurso final.",
    sections: [
      { title: "Unidad 1 · Voz y dicción", lessons: [
        { title: "Proyección, ritmo y pausas", type: "lesson", dur: "12 min", contentHtml: p("Las herramientas de la voz para mantener la atención.") },
        { title: "Lee este pasaje en voz alta", type: "mic", submitKinds: "audio", maxPoints: 20 },
      ]},
      { title: "Unidad 2 · Lenguaje corporal", lessons: [
        { title: "Postura, gesto y contacto visual", type: "video", dur: "13 min" },
        { title: "Sube un video de 2 min", type: "assign", submitKinds: "video", maxPoints: 30, contentHtml: p("Preséntate en cámara durante 2 minutos.") },
      ]},
      { title: "Unidad 3 · Estructura del discurso", lessons: [
        { title: "Apertura, cuerpo, cierre", type: "lesson", dur: "11 min" },
        { title: "Storytelling y ganchos", type: "lesson", dur: "10 min" },
        { title: "Partes de un discurso", type: "quiz" },
      ]},
      { title: "Unidad 4 · Discurso final", lessons: [
        { title: "Discurso persuasivo de 5 min", type: "assign", submitKinds: "video", maxPoints: 50, contentHtml: p("Tu discurso final, grabado en video.") },
        { title: "Rúbrica de delivery OTR", type: "file" },
      ]},
    ],
  },
  {
    id: "case-writing",
    name: "Construcción de Caso (Case Writing)",
    desc: "3 unidades para investigar y redactar un caso competitivo de principio a fin.",
    format: "Public Forum",
    level: "Intermedio",
    summary: "Del tema a la tesis: investiga, redacta y pule un caso ganador.",
    sections: [
      { title: "Unidad 1 · Investigación", lessons: [
        { title: "Del tema a la tesis", type: "lesson", dur: "12 min" },
        { title: "Fuentes y credibilidad", type: "lesson", dur: "10 min" },
        { title: "Plantilla de research doc", type: "file" },
      ]},
      { title: "Unidad 2 · Redacción", lessons: [
        { title: "Framework, contentions y weighing", type: "lesson", dur: "15 min" },
        { title: "Borrador de caso completo", type: "assign", submitKinds: "text,file", maxPoints: 40 },
        { title: "Componentes del caso", type: "quiz" },
      ]},
      { title: "Unidad 3 · Pulido", lessons: [
        { title: "Edición de casos comentada", type: "video", dur: "14 min" },
        { title: "Versión final del caso", type: "assign", submitKinds: "file", maxPoints: 50 },
        { title: "Lee tu Constructive cronometrado", type: "mic", submitKinds: "audio", maxPoints: 20 },
      ]},
    ],
  },
  {
    id: "torneo-prep",
    name: "Torneo: Prep Intensivo",
    desc: "Curso corto de 3 unidades para preparar un torneo: práctica, blocks y simulacro.",
    format: "Public Forum",
    level: "Avanzado",
    summary: "Llega listo al torneo: pre-flow del tema, práctica deliberada y simulacro.",
    sections: [
      { title: "Unidad 1 · Pre-flow del tema", lessons: [
        { title: "Análisis del resolution", type: "lesson", dur: "13 min" },
        { title: "Banco de blocks pro/con", type: "assign", submitKinds: "file", maxPoints: 30 },
      ]},
      { title: "Unidad 2 · Práctica", lessons: [
        { title: "Ronda de práctica grabada", type: "mic", submitKinds: "audio", maxPoints: 40 },
        { title: "Auto-evaluación con rúbrica", type: "assign", submitKinds: "text", maxPoints: 20 },
      ]},
      { title: "Unidad 3 · Simulacro", lessons: [
        { title: "Ronda completa modelo", type: "video", dur: "20 min" },
        { title: "Reglas y procedimiento del torneo", type: "quiz" },
        { title: "Checklist del día del torneo", type: "file" },
      ]},
    ],
  },
];
