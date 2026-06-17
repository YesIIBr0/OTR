/* OTR Aula · i18n keys — scr-learn.ts (prefix "learn")
   Diccionario por-pantalla para el flujo de aprendizaje (entrega de tarea,
   examen, resultados, reproductor de video y calificaciones del alumno).
   Default-safe: solo datos. es = texto original exacto reemplazado en la
   pantalla; en = traducción profesional natural. Consumido por el helper
   t() de ./i18n. */
export const dict = {
  es: {
    // entrega de tarea · cabecera
    "learn.assignmentEyebrow": "Entrega de tarea",

    // tarjeta "Tu entrega"
    "learn.yourSubmission": "Tu entrega",
    "learn.subGraded": "Calificada",
    "learn.subInReview": "En revisión",
    "learn.viewFile": "Ver archivo",
    "learn.coachGrade": "Nota del coach",
    "learn.coachComment": "Comentario del coach",
    "learn.submissionRecorded": "Entrega registrada.",

    // estado de la entrega
    "learn.gradedResubmitHint": "Ya calificada — puedes re-entregar para subir tu nota.",
    "learn.inReviewByCoach": "En revisión por tu coach.",

    // grabador de voz
    "learn.voiceRecorder": "Grabador de voz",
    "learn.recReady": "Listo para grabar — máx. 2:30",
    "learn.recDiscard": "Descartar",
    "learn.recRecord": "Grabar",
    "learn.recPlay": "Reproducir",
    "learn.recording": "Grabando…",
    "learn.recEmpty": "Grabación vacía",
    "learn.recUnsupported": "Grabación no soportada en este navegador",
    "learn.recUploadFailed": "Grabado pero falló la subida",
    "learn.recUploadFailedToast": "No se pudo subir la grabación",
    "learn.micNoAccess": "No se pudo acceder al micrófono",
    "learn.micDenied": "Permiso de micrófono denegado",

    // subida de archivo
    "learn.orPrefix": "O ",
    "learn.uploadFile": "Sube un archivo",
    "learn.fileTypesBadge": "Audio / video / PDF",
    "learn.selectYourFile": "Selecciona tu archivo",
    "learn.fileHint": "Audio, video, PDF o documento (máx. 50 MB)",
    "learn.selectFileBtn": "Seleccionar archivo",
    "learn.fileReady": "Archivo listo",
    "learn.uploadFailed": "No se pudo subir",
    "learn.tryAgain": "Intenta de nuevo",
    "learn.fileTooBig": "El archivo supera 50 MB",

    // respuesta de texto
    "learn.writeYourAnswer": "Escribe tu respuesta",
    "learn.textBadge": "Texto",
    "learn.textPlaceholder": "Escribe aquí tu entrega de texto (opcional)…",

    // calificación / rúbrica
    "learn.gradingTitle": "Calificación",
    "learn.rubricStructure": "Estructura (CWI)",
    "learn.rubricClarity": "Claridad y voz",
    "learn.rubricEvidence": "Evidencia",
    "learn.rubricTiming": "Tiempo y cierre",

    // botón de entrega
    "learn.resubmit": "Re-entregar",
    "learn.submit": "Entregar",
    "learn.resubmitReplaces": "Una re-entrega reemplaza la anterior.",
    "learn.canResubmitLater": "Podrás re-entregar después de enviar.",

    // envío de la entrega
    "learn.submitEmptyWarn": "Sube un archivo, graba audio o escribe tu entrega",
    "learn.submitting": "Entregando…",
    "learn.submittedToast": "Entregado",
    "learn.submittedTitle": "Entregado y en manos de tu coach",
    "learn.submittedBody": "Recibirás feedback para afinar tu próxima entrega.",
    "learn.submitError": "Error al entregar",

    // examen · empty state
    "learn.examTitle": "Examen",
    "learn.examSub": "Pon a prueba lo aprendido en esta unidad",
    "learn.examEmptyHeading": "No hay examen disponible",
    "learn.examEmptyBody": "Tu coach aún no publicó el examen de esta lección. Vuelve pronto — y llega preparado.",
    "learn.backToCourse": "Volver al curso",

    // examen · ya completado
    "learn.alreadyCompleted": "Ya completaste este examen",
    "learn.passed": "Aprobado",
    "learn.toReinforce": "A reforzar",
    "learn.retryAnytime": "reintenta cuando quieras — conservamos tu mejor marca.",
    "learn.retryExam": "Reintentar examen",

    // examen · cabecera y navegación
    "learn.unitExamEyebrow": "Examen de unidad",
    "learn.previous": "Anterior",
    "learn.next": "Siguiente",
    "learn.finishExam": "Finalizar examen",
    "learn.grading": "Calificando…",
    "learn.examSubmitError": "Error al enviar el examen",

    // resultados del examen
    "learn.resultsTitle": "Resultados del examen",
    "learn.resultsEmptyHeading": "No hay un examen reciente",
    "learn.resultsEmptyBody": "Completa un examen y aquí verás tu puntuación, pregunta por pregunta.",
    "learn.passedHonors": "¡Aprobado con honores!",
    "learn.lessonCompleted": "Lección completada",
    "learn.continueCourse": "Continuar curso",
    "learn.review": "Revisión",

    // reproductor de video
    "learn.lessonFallback": "Lección",
    "learn.videoInPrep": "Video en preparación",
    "learn.videoInPrepBody": "Tu coach está preparando el video de esta lección.",
    "learn.unmarkDone": "Quitar la marca de completada",
    "learn.completedUndo": "Completada · deshacer",
    "learn.markComplete": "Marcar como completada",
    "learn.back": "Volver",

    // mis calificaciones
    "learn.gradesTitle": "Mis calificaciones",
    "learn.weightedAvg": "promedio ponderado",
    "learn.gradesEmptyHeading": "Completa un examen o entrega para tu primera nota",
    "learn.gradesEmptyBody": "Tus notas y tu promedio se construyen aquí a medida que avanzas.",
    "learn.kpiAvg": "Promedio",
    "learn.kpiSubmitted": "Entregadas",
    "learn.kpiBest": "Mejor nota",
    "learn.colActivity": "Actividad",
    "learn.colGrade": "Nota",
    "learn.colLetter": "Letra",
  },
  en: {
    // assignment · header
    "learn.assignmentEyebrow": "Assignment submission",

    // "Your submission" card
    "learn.yourSubmission": "Your submission",
    "learn.subGraded": "Graded",
    "learn.subInReview": "In review",
    "learn.viewFile": "View file",
    "learn.coachGrade": "Coach grade",
    "learn.coachComment": "Coach feedback",
    "learn.submissionRecorded": "Submission recorded.",

    // submission status
    "learn.gradedResubmitHint": "Already graded — you can resubmit to raise your grade.",
    "learn.inReviewByCoach": "Under review by your coach.",

    // voice recorder
    "learn.voiceRecorder": "Voice recorder",
    "learn.recReady": "Ready to record — max 2:30",
    "learn.recDiscard": "Discard",
    "learn.recRecord": "Record",
    "learn.recPlay": "Play",
    "learn.recording": "Recording…",
    "learn.recEmpty": "Empty recording",
    "learn.recUnsupported": "Recording is not supported in this browser",
    "learn.recUploadFailed": "Recorded but upload failed",
    "learn.recUploadFailedToast": "Couldn't upload the recording",
    "learn.micNoAccess": "Couldn't access the microphone",
    "learn.micDenied": "Microphone permission denied",

    // file upload
    "learn.orPrefix": "Or ",
    "learn.uploadFile": "upload a file",
    "learn.fileTypesBadge": "Audio / video / PDF",
    "learn.selectYourFile": "Select your file",
    "learn.fileHint": "Audio, video, PDF or document (max 50 MB)",
    "learn.selectFileBtn": "Choose file",
    "learn.fileReady": "File ready",
    "learn.uploadFailed": "Upload failed",
    "learn.tryAgain": "Try again",
    "learn.fileTooBig": "The file exceeds 50 MB",

    // text answer
    "learn.writeYourAnswer": "write your answer",
    "learn.textBadge": "Text",
    "learn.textPlaceholder": "Type your text submission here (optional)…",

    // grading / rubric
    "learn.gradingTitle": "Grading",
    "learn.rubricStructure": "Structure (CWI)",
    "learn.rubricClarity": "Clarity and voice",
    "learn.rubricEvidence": "Evidence",
    "learn.rubricTiming": "Timing and close",

    // submit button
    "learn.resubmit": "Resubmit",
    "learn.submit": "Submit",
    "learn.resubmitReplaces": "A resubmission replaces the previous one.",
    "learn.canResubmitLater": "You can resubmit after sending.",

    // submission send
    "learn.submitEmptyWarn": "Upload a file, record audio, or write your submission",
    "learn.submitting": "Submitting…",
    "learn.submittedToast": "Submitted",
    "learn.submittedTitle": "Submitted and in your coach's hands",
    "learn.submittedBody": "You'll get feedback to sharpen your next submission.",
    "learn.submitError": "Submission error",

    // exam · empty state
    "learn.examTitle": "Exam",
    "learn.examSub": "Test what you've learned in this unit",
    "learn.examEmptyHeading": "No exam available",
    "learn.examEmptyBody": "Your coach hasn't published the exam for this lesson yet. Check back soon — and come prepared.",
    "learn.backToCourse": "Back to course",

    // exam · already completed
    "learn.alreadyCompleted": "You've already completed this exam",
    "learn.passed": "Passed",
    "learn.toReinforce": "Needs work",
    "learn.retryAnytime": "retry whenever you like — we keep your best score.",
    "learn.retryExam": "Retry exam",

    // exam · header and navigation
    "learn.unitExamEyebrow": "Unit exam",
    "learn.previous": "Previous",
    "learn.next": "Next",
    "learn.finishExam": "Finish exam",
    "learn.grading": "Grading…",
    "learn.examSubmitError": "Error submitting the exam",

    // exam results
    "learn.resultsTitle": "Exam results",
    "learn.resultsEmptyHeading": "No recent exam",
    "learn.resultsEmptyBody": "Complete an exam and you'll see your score here, question by question.",
    "learn.passedHonors": "Passed with honors!",
    "learn.lessonCompleted": "Lesson completed",
    "learn.continueCourse": "Continue course",
    "learn.review": "Review",

    // video player
    "learn.lessonFallback": "Lesson",
    "learn.videoInPrep": "Video in preparation",
    "learn.videoInPrepBody": "Your coach is preparing the video for this lesson.",
    "learn.unmarkDone": "Remove the completed mark",
    "learn.completedUndo": "Completed · undo",
    "learn.markComplete": "Mark as completed",
    "learn.back": "Back",

    // my grades
    "learn.gradesTitle": "My grades",
    "learn.weightedAvg": "weighted average",
    "learn.gradesEmptyHeading": "Complete an exam or submission for your first grade",
    "learn.gradesEmptyBody": "Your grades and your average build up here as you progress.",
    "learn.kpiAvg": "Average",
    "learn.kpiSubmitted": "Submitted",
    "learn.kpiBest": "Best grade",
    "learn.colActivity": "Activity",
    "learn.colGrade": "Grade",
    "learn.colLetter": "Letter",
  },
};
