# Quick Wins — OTR Academy

**Fecha:** 2026-06-16
**Generado por auditoria multi-agente OTR**

> Alcance: solo hallazgos **reales** (verificados adversarialmente, `verdict.isReal = true`) con **esfuerzo = S** y **alto impacto** sobre el usuario o la conversion. Son los cambios ejecutables **HOY**. Ordenados por ratio impacto/esfuerzo (a igual esfuerzo S, primero los de severidad e impacto de negocio mas alto). Cada fila esta respaldada por evidencia `archivo:linea` del corpus. Los hallazgos con `verdict.isReal = false` quedan **excluidos** y se listan aparte al final.

---

## Tabla de Quick Wins (ordenada por impacto/esfuerzo)

Todos los items: esfuerzo = **S**.

| # | ID | Que cambiar | Evidencia (archivo:linea) | Antes -> Despues (copy/codigo) | Impacto esperado |
|---|----|-------------|---------------------------|-------------------------------|------------------|
| 1 | COG-01 / CNV-01 / NAV-02 | Re-enrutar las CTAs heroe del dashboard del estudiante: hoy `go('coach')` (perfil de solo lectura) en vez de la practica de debate. Cambiar a la pestana de practica del Debate Hub. | `app/lib/scr-core.ts:110`, `:114`, `:269`, `:271`; destino roto `app/lib/scr-profile.ts:340`; pestana real `app/lib/scr-debate.ts:30,311` | `onclick: go('coach')` -> `onclick: window.__debateTab='practice';go('debate')` | Desbloquea la activacion del feature flagship (primer debate = primer rating real) justo en la accion mas prominente del onboarding. Fix de una linea, journey mas caro. |
| 2 | FLW-01 / CNV-06 | Re-enrutar las CTAs de **coaching** del dashboard (estado estable): `go('coach')` lleva a una ficha SIN boton de reservar; el flujo real esta en el marketplace. | `app/lib/scr-core.ts:113-114`, `:183`; ruta `app/lib/screens.ts:55`; reserva real `app/lib/scr-marketplace.ts:408` | `cta: 'Ver coach', onclick: go('coach')` -> `cta: 'Reservar sesion', onclick: go('explore')` (fijar `window.__mkCoachId` para llevar a un coach concreto) | Recupera la conversion a coaching 1:1 (comision de marketplace) desde el punto de mayor intencion: el alumno comprometido y al dia. |
| 3 | CNV-03 | Subir **Membresia** por encima de Mensajes en el grupo Marketplace y sembrar el upsell Pro fuera de Analytics (hoy enterrado como ultimo item, ausente en tabbar movil). | `app/lib/shell.ts:40`, `:86`; unico upsell actual `app/lib/scr-debate.ts:388-396` | Pro solo visible al abrir Debate Hub > Analytics en free -> CTAs 'Ver OTR Pro' contextuales + Membresia elevada en nav | Activa la palanca de ingresos mas desaprovechada (free->Pro). El reordenamiento de nav y los CTAs contextuales son cambios de bajo esfuerzo. |
| 4 | CNV-02 | Anadir barra de progreso al placement (6 sliders) y micro-feedback "tocado/sin tocar"; cambiar default 50 a estado vacio explicito. | `app/lib/scr-placement.ts:37,42-61`; mount `:74-113` | `<span class="badge">Evaluacion inicial - 6 habilidades</span>` (sin progreso) -> barra "Has ubicado 3 de 6 habilidades" + sliders sin valor fijado hasta tocarlos | Reduce abandono y el "envio en 50 por inercia" en el cuello de botella de activacion #1, que alimenta el Skill Graph (el moat). |
| 5 | VIS-01 / A11Y-04 | Oscurecer el **texto** dorado de los badges de LOGRO y el chip de RACHA (hoy 2.42:1, ilegible y falla WCAG AA). El icono/medalla puede seguir dorado. | `app/styles/app.css:198`; `app/styles/screens.css:30`; tokens `app/styles/tokens.css:18-19`; uso `app/lib/scr-core.ts:128,286` | `.badge.gold{color:var(--otr-gold-lo)}` (2.42:1) -> `.badge.gold{color:#5A4206}` (~6.8:1) | Hace legible la moneda emocional de retencion (insignias, dias de racha) para baja vision; cierra un fallo WCAG AA con un cambio de un token de color. |
| 6 | A11Y-05 | Oscurecer el texto verde de `.btn-soft` y `.badge.sky` (hoy 3.73:1) usando un token de texto verde mas oscuro solo sobre `--action-soft`. | `app/styles/app.css:135,195`; tokens `app/styles/tokens.css:61-62` | `.btn-soft{color:var(--action-hover)}` (3.73:1) -> `color:#176B11` (>=4.5:1) | Hace legibles los CTAs secundarios mas frecuentes del dashboard (navegacion de activacion) para baja vision; corrige WCAG AA sin tocar fondos ni marca. |
| 7 | NAV-03 | Anadir el item **Mensajes** a la navegacion del coach (sidebar y tabbar): hoy el coach no tiene entrada a su unico canal con alumnos/padres. | `app/lib/shell.ts:38` (comentario del canal), `:39` (student lo tiene), grupo coach `:44-63`; ruta viva `app/lib/screens.ts:46`; badge ya cableado `:104` | (sin item) -> `{ r:'messages', ic:'msg', k:'nav.messages', l:'Mensajes' }` en `NAV.teacher` y `TABBAR.teacher` | Reabre el canal pre-reserva del marketplace; las consultas dejan de morir sin respuesta -> mas conversion a reserva y comision. Ruta ya existe, solo falta exponerla. |
| 8 | ENT-03 | Hacer la busqueda de admin tolerante a mayusculas/acentos (SQLite `contains` es case-sensitive): normalizar a minusculas la query y los campos. | `app/api/admin/users/route.ts:40`; provider `prisma/schema.prisma:10`; empty enganoso `app/lib/scr-admin-users.ts:109` | `{ name: { contains: q } }` -> normalizar query+campos a lowercase (o `LOWER()` raw) | Evita falsos "Sin resultados" (buscar 'maria' no halla 'Maria Reyes'); en RD los acentos son la norma. Previene cuentas duplicadas y denegacion de servicio en soporte. |
| 9 | UIC-06 | Quitar la jerga de infraestructura "UID de Cloudflare Stream" de la UI del coach; dejar solo "Subir archivo" y "YouTube" (Cloudflare bajo "Avanzado"). | `app/lib/scr-core.ts:323-324,380-381`; `app/lib/scr-teacher.ts:369,381,399` | `Cloudflare Stream (UID)` / `URL de YouTube o UID de Cloudflare` -> `Subir video (MP4)` / `Enlace de YouTube` | Reduce abandono/error en la subida de video del coach (lado oferta); deja de filtrar detalle de proveedor al usuario final. |
| 10 | UIC-12 | Eliminar el termino interno "verified-booking-only" del copy de reseñas en el marketplace. | `app/lib/scr-marketplace.ts:457` | `Solo alumnos con reserva completada pueden dejar resena (verified-booking-only).` -> `Solo quienes completaron una sesion con este coach pueden dejar resena.` | Limpia ruido tecnico en una seccion sensible (trust del marketplace, menores); refuerza la confianza sin coste. |
| 11 | UIC-13 | Unificar el copy de acceso a recurso: quitar "(gated)" en ingles, dejar solo "Solo inscritos" (como ya hace la otra version del formulario). | `app/lib/scr-core.ts:439`; variante correcta `app/lib/scr-teacher.ts:472` | `Solo inscritos (gated)` -> `Solo inscritos` | Consistencia de copy entre dos formularios que hacen lo mismo; elimina jerga inglesa para el coach. |
| 12 | UIC-09 | Eliminar la referencia a "gradebook de Moodle" (producto externo inexistente) del copy del gradebook. | `app/lib/scr-teacher.ts:575` | `...las notas se sincronizan con el gradebook de Moodle.` -> `Las notas se guardan al instante.` | Quita una promesa funcional falsa y deuda de copy peligrosa (menciona Moodle, que no es parte del sistema). |

---

## Notas de ejecucion

- **Items 1 y 2 comparten causa raiz** (`go('coach')` usado como destino de accion). El item 1 cubre las CTAs de *debate*; el item 2 cubre las CTAs de *coaching/reserva*. Auditar las 5 ocurrencias de `go('coach')` en `scr-core.ts` (`:110, :114, :183, :269, :271`) y enrutar cada una segun el copy del boton: practica -> `go('debate')`; reserva -> `go('explore')`.
- **Items 5 y 6** son el mismo patron de bajo contraste del sistema de diseño (verde/dorado sobre tinte palido) en superficies de alto valor; ambos se resuelven anadiendo/oscureciendo un token de texto sin tocar fondos ni marca.
- **Item 4** (`CNV-02`) tiene una parte de UI (barra de progreso) que es estrictamente S; el cambio de default y micro-feedback usa el `mount()` ya existente.

---

## Excluidos (verdict.isReal = false) — NO ejecutar como Quick Win

Estos hallazgos fueron **refutados** en la verificacion adversarial. Se listan para trazabilidad; no deben implementarse como cambios:

| ID | Por que se excluye (verdict) |
|----|------------------------------|
| NAV-01 | Falso positivo: la pantalla `search` SI existe y esta cableada (`app/lib/scr-extra.ts:292`, importada y propagada en `screens.ts`); no hay TypeError ni crash. |
| UIC-01 | Falso positivo: `/app/aula/page.tsx` existe; `videoUrl` es ruta interna valida y el boton "Unirse" esta tras doble guard (`scr-core.ts:223`). No abre pantalla en blanco cuando renderiza. |
| CNT-01 | Severidad refutada (real -> low): el mensaje de escrow no aparece 5 veces simultaneas; maximo 2-3 instancias en zonas UI distintas. No es un Quick Win de alto impacto. |
| ENT-05 | Falso positivo: la pantalla `gradebook` esta APAGADA a proposito (`screens.ts:48`, `shell.ts:57`); los controles muertos viven en codigo inalcanzable. |
| FLW-05 | Falso positivo: el catalogo NO esta roto; `/api/checkout` con ventas off hace una inscripcion gratuita real y refresca el dashboard. La premisa (FLW-02 "toast falso") fue refutada. |

> Nota sobre FLW-02 / FLW-04 / NAV-07 / COG-06 / CNV-04: son **reales** pero con `correctedSeverity` rebajada a medium y/o esfuerzo M-L (sala de video, copy de inscripcion). No califican como Quick Win S; se documentan en los entregables de severidad correspondientes, no aqui.
