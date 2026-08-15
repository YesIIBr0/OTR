/* OTR · Contrato del vídeo del paso 4 de admisión (DPP) — FUENTE ÚNICA
   ---------------------------------------------------------------------------
   Vive aquí, y no en lib/uploads.ts, porque lo necesitan LOS DOS lados: la pantalla
   que se lo pide al alumno (app/lib/scr-admission.ts, que corre en el navegador y no
   puede importar uploads.ts — arrastra fs y prisma) y el servidor que lo valida
   (app/lib/uploads.ts, que re-exporta desde aquí).

   Por qué importa que sea una sola fuente: cuando la pantalla tenía sus propias copias,
   subía con `kind:"video"` mientras el servidor aplicaba la política del DPP sólo a
   `kind:"dpp-video"`. Resultado medido con clicks: un vídeo de 45 s entró sin una queja,
   con la pantalla prometiendo 30 s. No falló ningún test — no había nada que probar,
   porque cada lado era coherente consigo mismo.

   Módulo deliberadamente PURO (cero imports): lo carga el bundle del cliente.
   ------------------------------------------------------------------------- */

/**
 * `kind` EXACTO con el que hay que subir el vídeo del DPP. No es una etiqueta: es lo que
 * selecciona la política del servidor (duración, tamaño, formatos) y lo que mantiene el
 * archivo fuera de PUBLIC_KINDS — es el vídeo de un alumno que puede ser menor.
 * `kind:"video"` es OTRA cosa: el vídeo de una lección, largo y pesado, que sube el coach.
 */
export const DPP_VIDEO_KIND = "dpp-video";

/* Contenedores aceptados: los que produce un navegador o un móvil Y que la plataforma sabe
   previsualizar inline (un vídeo que el alumno no puede revisar antes de enviarlo no sirve).
     · video/webm      → MediaRecorder en Chrome/Firefox/Edge y Android
     · video/mp4       → MediaRecorder en Safari 17+, y el mp4 del carrete
     · video/quicktime → .mov del carrete de iOS */
export const DPP_VIDEO_MIME = ["video/webm", "video/mp4", "video/quicktime"] as const;

/** Tope de tamaño. El razonamiento completo (bitrate del grabador, clip del carrete) está
 *  en app/lib/uploads.ts, donde se aplica. Es el número que la pantalla debe ANUNCIAR: si
 *  anuncia otro, el alumno espera a que suban 25 MB para leer que el máximo eran 16. */
export const DPP_VIDEO_MAX_BYTES = 16 * 1024 * 1024;

/** Lo que se le PIDE al alumno y lo que la pantalla anuncia: 30 segundos. */
export const DPP_VIDEO_TARGET_SECONDS = 30;

/** Lo que el servidor RECHAZA. Los 10 s de diferencia con el objetivo no son laxitud: una
 *  grabación real de 30 s desde Chrome llegó declarando 30,48 s (latencia de parada más el
 *  redondeo del contenedor), y rechazar a alguien que grabó sus 30 s sería un error nuestro.
 *  Cortar en seco lo que se pasa de verdad —45 s, un minuto— sí es el objetivo. */
export const DPP_VIDEO_MAX_SECONDS = 40;
