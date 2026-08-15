/* OTR · Clausulado del consentimiento de admisión — FUENTE ÚNICA
   ---------------------------------------------------------------------------
   Vive aquí, y no en la API, porque lo necesitan LOS DOS lados: la pantalla que
   se lo ENSEÑA a la familia (app/lib/i18n-keys/adm.ts) y la API que lo REGISTRA
   como evidencia (app/api/admission/input.ts). Cuando cada lado tenía su propia
   copia, nada impedía cambiar una y olvidar la otra — y enseñar un texto mientras
   se guarda otro invalida la prueba: la familia no consintió lo que quedó escrito.

   Módulo deliberadamente PURO (cero imports): lo carga el bundle del cliente y no
   debe arrastrar nada de servidor.

   MARCO LEGAL que se ha seguido al redactarlo (República Dominicana):
     · Ley 172-13 de Protección de Datos de Carácter Personal — el consentimiento ha
       de ser LIBRE, EXPRESO e INFORMADO, y hay que informar antes de recogerlo de:
       finalidad, destinatarios, existencia del banco de datos y quién responde por él,
       si contestar es obligatorio o facultativo, qué pasa si no se contesta, y cómo se
       ejercen los derechos de acceso, rectificación y supresión.
     · Ley 136-03 (Código para el Sistema de Protección de los Derechos Fundamentales
       de Niños, Niñas y Adolescentes) — quien ejerce la autoridad parental consiente por
       el menor, y su honor, imagen e intimidad tienen protección reforzada: por eso la
       difusión pública de su imagen va en un consentimiento SEPARADO, específico,
       opcional y revocable, que no condiciona la inscripción.
     · Ley 126-02 de Comercio Electrónico, Documentos y Firmas Digitales — sostiene la
       firma por escritura del nombre completo, que es la que recoge el formulario.

   ADVERTENCIA HONESTA: esto lo redactó el equipo de desarrollo siguiendo esas leyes, con
   el cuidado que merece tratar datos de menores. NO sustituye la revisión de un abogado
   dominicano, que sigue siendo necesaria antes de operar de verdad. Lo que sí garantiza
   el diseño es que el día que un abogado lo cambie, cambiarlo sea seguro: se edita aquí,
   se sube CONSENT_VERSION, y la evidencia ya registrada queda intacta.
   ------------------------------------------------------------------------- */

/* ============================================================================
   1 · QUIÉN RESPONDE POR LOS DATOS
   La Ley 172-13 exige identificar al responsable del banco de datos y dar una vía real
   de contacto. Los tres primeros son los que la academia usa de cara al público y están
   verificados en el propio producto; los dos marcados PENDIENTE los tiene que confirmar
   la dirección de OTR — hasta entonces el texto los muestra tal cual, que es preferible
   a inventarlos: un domicilio falso en un aviso de privacidad lo invalida entero.
   ========================================================================== */
export const RESPONSABLE_NOMBRE = "OTR Debating Academy";
export const RESPONSABLE_SITIO = "otr-academy.com";
export const RESPONSABLE_CIUDAD = "Santo Domingo, República Dominicana";
/** Buzón para ejercer derechos. TIENE que existir y ser atendido: si rebota, se está
 *  incumpliendo el derecho de acceso. No vale el no-reply@ que usa el envío automático. */
export const RESPONSABLE_CONTACTO = "privacidad@otr-academy.com";
/** PENDIENTE de la dirección de OTR: razón social registrada, RNC y domicilio fiscal. */
export const RESPONSABLE_RAZON_SOCIAL = "[razón social y RNC por confirmar]";

/**
 * Versión del clausulado vigente. REGLA INNEGOCIABLE: si cambia una coma de los textos de
 * abajo, hay que subir esta versión. El @@unique([admissionId, kind, version]) de
 * AdmissionConsent lo obliga: con la versión intacta, el texto nuevo NO se registraría y la
 * evidencia guardada dejaría de corresponder con lo que la familia vio en pantalla.
 *
 * 2026-08   · primer clausulado (mínimo defendible).
 * 2026-09   · redacción completa conforme a la Ley 172-13: aviso de privacidad con
 *             finalidades, destinatarios, conservación y derechos; declaración del tutor
 *             con autoridad parental y firma; y consentimiento de imagen SEPARADO.
 */
export const CONSENT_VERSION = "2026-09";

/* ============================================================================
   2 · AVISO DE PRIVACIDAD — se muestra ENTERO antes de marcar la casilla
   No es un enlace a otra página que nadie abre: la ley pide que se informe ANTES de
   recoger el consentimiento, así que esto se pinta encima de la casilla y viaja con la
   evidencia. Está escrito para que lo entienda una familia, no para que lo entienda un
   juzgado — que se entienda es parte del requisito de que el consentimiento sea informado.
   ========================================================================== */
export const PRIVACY_NOTICE_TEXT = [
  `QUIÉN TRATA TUS DATOS. ${RESPONSABLE_NOMBRE} (${RESPONSABLE_RAZON_SOCIAL}), con sede en ${RESPONSABLE_CIUDAD} y sitio web ${RESPONSABLE_SITIO}, es responsable del banco de datos donde se guarda esta información. Para cualquier asunto relacionado con tus datos puedes escribir a ${RESPONSABLE_CONTACTO}.`,

  `QUÉ RECOGEMOS. Del estudiante: nombre y apellido, fecha de nacimiento, teléfono o WhatsApp, correo, institución educativa, nivel académico, experiencia previa en debate, días de preferencia y el video de 30 segundos del paso 4. Si el estudiante tiene menos de 21 años, además, del padre, madre o tutor: nombre completo, número de cédula o pasaporte, relación con el estudiante, teléfono y, opcionalmente, correo. Durante el entrenamiento se genera también información sobre el desempeño: asistencia, resultados de rondas, evaluaciones de los coaches y progreso.`,

  `PARA QUÉ. (1) Tramitar la admisión y decidir el nivel y el grupo que corresponden. (2) Impartir y organizar las clases, torneos y evaluaciones. (3) Comunicarnos con el estudiante y con su familia sobre horarios, cambios, resultados y avisos de la academia. (4) Cumplir con obligaciones legales y contables, y dejar constancia de los consentimientos otorgados. El video del paso 4 se usa como punto de partida pedagógico —para comparar el antes y el después del propio estudiante— y NO se publica ni se enseña fuera de la academia salvo que se autorice aparte, en el consentimiento de imagen que aparece más abajo.`,

  `POR QUÉ PODEMOS HACERLO. Porque tú lo autorizas con esta casilla, y porque hace falta para prestarte el servicio que estás contratando. Contestar es voluntario: los campos marcados con asterisco son los mínimos para poder inscribirte, y si no los aportas no podemos tramitar la admisión. Los demás son opcionales y no dejarlos no tiene ninguna consecuencia.`,

  `CON QUIÉN SE COMPARTEN. No vendemos ni cedemos datos personales a terceros. Solo los tratan, por cuenta nuestra y para las finalidades de arriba, los proveedores que hacen funcionar la plataforma: el proveedor de alojamiento donde corre el servicio, el proveedor de correo con el que se envían los avisos, la pasarela de pagos cuando hay una matrícula o una clase de por medio, el proveedor de video que almacena y sirve las grabaciones, y el servicio de mensajería si eliges recibir avisos por WhatsApp. Alguno de esos proveedores puede tratar los datos fuera del país; en ese caso se exige que ofrezcan un nivel de protección equivalente al de la Ley 172-13. Además, se entregarán datos a una autoridad cuando una ley o una orden judicial lo obliguen.`,

  `QUIÉN LOS VE DENTRO DE LA ACADEMIA. El coach asignado ve lo que necesita para entrenar al estudiante, no su expediente completo: no ve el documento de identidad del tutor ni sus datos de contacto. La dirección de la academia accede al expediente para lo administrativo y legal. El padre, madre o tutor con vínculo confirmado accede a la información de su hijo.`,

  `CUÁNTO TIEMPO. Mientras el estudiante siga vinculado a la academia y, después, el tiempo que exijan las obligaciones legales y contables. Los consentimientos se conservan como prueba de que se otorgaron, aun después de darse de baja, porque su razón de ser es precisamente acreditar que existieron. Si se solicita la supresión, se borran los datos personales del expediente y se conserva únicamente el registro de que hubo un consentimiento y en qué fecha, sin el contenido personal.`,

  `TUS DERECHOS. Puedes pedir acceder a tus datos, rectificar los que estén mal o incompletos, solicitar que se supriman y oponerte a un uso concreto. También puedes RETIRAR este consentimiento cuando quieras, sin que retirarlo afecte a lo que se hizo antes de retirarlo; ten en cuenta que sin él no podemos seguir prestando el servicio. Para cualquiera de esas cosas escribe a ${RESPONSABLE_CONTACTO} desde el correo de la cuenta, o desde el correo del tutor si el estudiante es menor de edad, y respondemos por la misma vía.`,

  `SI EL ESTUDIANTE ES MENOR DE EDAD. Quien ejerce la autoridad parental o la tutela es quien consiente por él, y ese consentimiento se recoge en la declaración firmada que aparece a continuación. La academia trata los datos de menores con protección reforzada: no se publican, no se usan con fines publicitarios y no se comparten con otros estudiantes ni con sus familias.`,
].join("\n\n");

/* ============================================================================
   3 · LAS TRES DECLARACIONES QUE SE FIRMAN
   Separadas a propósito, porque consienten cosas distintas y solo una es obligatoria.
   ========================================================================== */

/** ① Casilla del estudiante (o de la familia): tratamiento de datos. OBLIGATORIA — sin
 *  ella no hay admisión, y así se le dice. Incorpora el aviso completo de arriba. */
export const CONSENT_TEXT_DATA =
  "He leído el aviso de privacidad que aparece encima y doy mi consentimiento libre, expreso e informado para que OTR Debating Academy trate los datos personales que aquí facilito, con las finalidades de admisión, formación y comunicación que ese aviso describe. Sé que puedo acceder a mis datos, rectificarlos, pedir que se supriman y retirar este consentimiento en cualquier momento escribiendo a " +
  RESPONSABLE_CONTACTO +
  ".";

/** ② Declaración del padre, madre o tutor, que se firma escribiendo el nombre completo.
 *  Recoge las tres cosas que tienen que constar: que quien firma OSTENTA la autoridad
 *  parental o la tutela (si no, no puede consentir por el menor), que AUTORIZA la
 *  inscripción, y que CONSIENTE el tratamiento de los datos del menor. La firma por
 *  escritura del nombre se apoya en la Ley 126-02; por eso el texto dice expresamente
 *  qué valor se le da, y se registra junto a la fecha, la hora y la cuenta que la envió. */
export const CONSENT_TEXT_GUARDIAN =
  "Declaro que soy el padre, la madre o el tutor legal del estudiante y que ejerzo sobre él la autoridad parental o la tutela, y que los datos que he facilitado son ciertos. He leído el aviso de privacidad y, en esa condición, autorizo su inscripción en OTR Debating Academy y consiento el tratamiento de sus datos personales con las finalidades de admisión, formación y comunicación allí descritas. Sé que puedo ejercer en su nombre los derechos de acceso, rectificación, supresión y oposición, y retirar este consentimiento, escribiendo a " +
  RESPONSABLE_CONTACTO +
  ". Firmo escribiendo mi nombre completo, y acepto que esa escritura tenga el valor de mi firma conforme a la Ley 126-02 de Comercio Electrónico, Documentos y Firmas Digitales.";

/** ③ Imagen y voz — SEPARADO, OPCIONAL y REVOCABLE. Va aparte porque la difusión pública
 *  de la imagen de un menor no se puede colar dentro del consentimiento que hace falta
 *  para inscribirse: sería un consentimiento ni libre ni específico. Y porque la
 *  plataforma SÍ publica: los "highlights" de la temporada enlazan a Instagram. Quien no
 *  marque esto entrena exactamente igual. */
export const CONSENT_TEXT_MEDIA =
  "Además, y de forma voluntaria, autorizo que OTR Debating Academy capte y utilice la imagen y la voz del estudiante en fotografías y videos de clases, torneos y actividades, y que los publique en sus canales de difusión —redes sociales, sitio web y materiales de promoción— para dar a conocer la actividad de la academia y los logros de sus estudiantes. Esta autorización no incluye ceder el material a terceros con fines comerciales, no se remunera y no condiciona la inscripción: si no la doy, el estudiante participa en todo igual. Puedo revocarla cuando quiera escribiendo a " +
  RESPONSABLE_CONTACTO +
  ", y a partir de ese momento el material dejará de publicarse, sin que ello alcance a lo ya difundido con anterioridad.";

export const CONSENT_KIND_DATA = "data_processing";
export const CONSENT_KIND_GUARDIAN = "guardian_signature";
export const CONSENT_KIND_MEDIA = "media_release";

/**
 * Lo que se REGISTRA como evidencia de la casilla de datos: el aviso completo MÁS la
 * declaración, porque eso es lo que la familia tuvo delante. Guardar solo la frase de la
 * casilla probaría que aceptó una frase, no que fue informada — y "informado" es
 * justamente lo que la ley exige acreditar.
 */
export const CONSENT_EVIDENCE_DATA = `${PRIVACY_NOTICE_TEXT}\n\n---\n\n${CONSENT_TEXT_DATA}`;

/**
 * El clausulado VINCULANTE es el español: es el que se registra como evidencia y el idioma
 * en el que opera la academia (RD). La versión inglesa del diccionario es una traducción de
 * cortesía para que se entienda antes de firmar, no un segundo contrato — por eso el texto
 * que viaja al servidor sale SIEMPRE de estas constantes, nunca de lo que se pintó.
 */
export const CONSENT_BINDING_LANG = "es";
