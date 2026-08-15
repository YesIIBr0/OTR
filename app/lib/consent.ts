/* OTR · Clausulado del consentimiento de admisión — FUENTE ÚNICA
   ---------------------------------------------------------------------------
   Vive aquí, y no en la API, porque lo necesitan LOS DOS lados: la pantalla que
   se lo ENSEÑA a la familia (app/lib/i18n-keys/adm.ts) y la API que lo REGISTRA
   como evidencia (app/api/admission/input.ts). Cuando cada lado tenía su propia
   copia, nada impedía cambiar una y olvidar la otra — y enseñar un texto mientras
   se guarda otro invalida la prueba: la familia no consintió lo que quedó escrito.

   Módulo deliberadamente PURO (cero imports): lo carga el bundle del cliente y no
   debe arrastrar nada de servidor.
   ------------------------------------------------------------------------- */

/**
 * Versión del clausulado vigente. REGLA INNEGOCIABLE: si cambia una coma de los textos de
 * abajo, hay que subir esta versión. El @@unique([admissionId, kind, version]) de
 * AdmissionConsent lo obliga: con la versión intacta, el texto nuevo NO se registraría y la
 * evidencia guardada dejaría de corresponder con lo que la familia vio en pantalla.
 */
export const CONSENT_VERSION = "2026-08";

/** Checkbox del alumno — copiado LITERAL del mockup de Isaac. */
export const CONSENT_TEXT_DATA =
  "Doy mi consentimiento para el uso de mis datos personales por OTR Academy con fines de admisión y comunicación.";

/**
 * Firma del tutor. El mockup solo dibuja el campo "Firma (nombre completo)" sin decir QUÉ se
 * firma — y una firma sin texto no prueba nada. Este clausulado es el mínimo defendible y
 * está PENDIENTE de validación legal (plan §"Lo que hace falta de Isaac"); al reemplazarlo,
 * subir CONSENT_VERSION.
 */
export const CONSENT_TEXT_GUARDIAN =
  "Como padre, madre o tutor legal del estudiante, autorizo su inscripción en OTR Academy y consiento el tratamiento de sus datos personales con fines de admisión, formación y comunicación. Firmo escribiendo mi nombre completo.";

export const CONSENT_KIND_DATA = "data_processing";
export const CONSENT_KIND_GUARDIAN = "guardian_signature";

/**
 * El clausulado VINCULANTE es el español: es el que se registra como evidencia y el idioma
 * en el que opera la academia (RD). La versión inglesa del diccionario es una traducción de
 * cortesía para que se entienda antes de firmar, no un segundo contrato — por eso el texto
 * que viaja al servidor sale SIEMPRE de estas constantes, nunca de lo que se pintó.
 */
export const CONSENT_BINDING_LANG = "es";
