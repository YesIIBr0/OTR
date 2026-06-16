# OTR Academy — Reporte Ejecutivo de Auditoría UX

**Fecha:** 2026-06-16
**Para:** Fundadores e Inversionistas
*Generado por auditoría multi-agente OTR*

---

## Veredicto en un párrafo

OTR Academy tiene una tesis estratégica coherente y notablemente bien escrita —**prueba + seguridad + estatus**— montada sobre una base técnica de frontend más sólida de lo que aparenta (saneamiento server-side real, sistema de diseño respetado de punta a punta, sin XSS explotable confirmado). Pero la ejecución traiciona su propio modelo de negocio: **el único journey que monetiza —el coaching pagado— es también el único que no se puede completar hoy.** El botón navy más prominente del dashboard del estudiante enruta a un perfil de coach de solo lectura en lugar de a la práctica o a la reserva (`scr-core.ts:109-114`); "Unirse a la sesión" abre la app en una ruta `room` que no existe (`scr-mybookings.ts:71`); y el único comprador que el producto invita a pagar —el padre— recibe un 403 al intentar reservar (`app/api/bookings/route.ts:37`). A esto se suma que la accesibilidad está estructuralmente quebrada (riesgo legal ADA real, dado el segmento de menores y diáspora US) y que la arquitectura de datos no escala más allá de grupos pequeños. **El riesgo no es estético: es de foco y de cierre de loops críticos.** La recomendación de junta es lanzar a un grupo pequeño sin cobro ya, y abrir cobro solo cuando estén resueltos los tres desbloqueadores (video, SMTP, pagos) y la base de accesibilidad.

---

## Tabla de los 12 scores (0-10)

| # | Dimensión | Score | Marca |
|---|-----------|:-----:|:-----:|
| 1 | Claridad de UI | 6.0 | |
| 2 | Simplicidad | 5.5 | |
| 3 | Aprendibilidad (learnability) | 5.5 | |
| 4 | **Accesibilidad** | **3.0** | 🔴 más débil |
| 5 | Navegación | 5.0 | |
| 6 | Arquitectura de información | 5.5 | |
| 7 | UX (experiencia) | 5.0 | |
| 8 | UI (diseño visual) | 6.0 | |
| 9 | Conversión | 4.5 | |
| 10 | Rendimiento | 5.5 | |
| 11 | Escalabilidad | 3.5 | |
| 12 | Mantenibilidad | 5.5 | |

> **Eje más débil — Accesibilidad (3.0):** la navegación core del alumno usa DIVs con `onclick` no enfocables ni operables por teclado (A11Y-01); no existe **ni una sola región viva** en toda la app (toasts y errores son silenciosos para lectores de pantalla — A11Y-02); los modales no tienen `aria-modal`, etiqueta, trampa de foco ni cierre con Escape (A11Y-03); y hay fallos de contraste calculados en elementos de marca de alto valor (badges dorados 2.42:1, botones soft 3.73:1). Para un producto con menores y diáspora en EE.UU. (ADA/Section 508), es un bloqueador de lanzamiento a escala, no un detalle de pulido.

> **Eje más fuerte — Frontend técnico / disciplina de implementación (~7.0):** un único punto de inyección de HTML de usuario saneado server-side con `sanitize-html` (parser real, no regex), todo el copy pasa por `esc()` consistentemente, sin XSS explotable confirmado. El sistema de diseño se respeta de punta a punta y el guard de rol en cliente es correcto. La deuda (re-render total con `innerHTML`, God-component de 817 líneas) es estructural y arreglable, no una falla de seguridad. Es la base más sólida del producto.

---

## Respuesta directa a las 8 preguntas del objetivo final

| # | Pregunta | Respuesta corta | Detalle |
|---|----------|:----------------:|---------|
| 1 | ¿Es intuitivo? | **Parcial** | La columna vertebral lo es (IA por rol, dashboard de "una sola acción obvia", placement claro, flujos lección→quiz→entrega). Se rompe en los hotpaths: las 6 personas simuladas dieron `canCompleteUnaided=parcial` sin excepción. El usuario entiende QUÉ es OTR y A DÓNDE ir, pero no qué pasará al pulsar el botón primario —porque varios mienten sobre su destino. |
| 2 | ¿Se usa sin entrenamiento? | **Para aprender sí, para transaccionar no** | El núcleo educativo (lección/examen/tarea) se recorre sin ayuda. El núcleo de ingreso requiere deducción: tras "Inscrito" el sistema no guía, el CTA primario lleva a un coach fantasma, y el marketplace en móvil exige abrir un cajón lateral que no aparece en la tabbar. Un padre no-técnico mira bien pero no puede contratar coaching solo. |
| 3 | ¿Hay demasiado texto? | **Sí, en pantallas densas** | El mensaje de escrow/seguridad se repite en un mismo perfil de coach, el Lifetime Profile repite el discurso de transparencia 3 veces, y cada estado vacío usa titular metafórico + subtítulo redundante. Se puede bajar el esfuerzo de lectura ~40% sin perder nada accionable. |
| 4 | ¿Hay demasiada complejidad? | **En zonas concretas** | Nav del estudiante con 13 ítems y un "Centro de progreso" de 4 sub-ítems solapados; Debate Hub con 6 sub-tabs (límite de Miller); entrega con 3 métodos simultáneos sin jerarquía; crear curso = 10 campos / perfil de coach = 12 con conversión USD implícita. Los formularios de primera vez y el panel docente exceden lo necesario. |
| 5 | ¿Hay clicks innecesarios? | **Sí, sistémicamente** | Cero atajos de teclado en toda la app (único keydown: Enter en el buscador), cero acciones masivas: calificar, publicar, mostrar/ocultar y reordenar son de uno en uno, y reordenar dispara un POST por clic. El admin no puede resolver un reporte de principio a fin: debe memorizar el nombre del infractor y buscarlo a mano para suspenderlo, pese a que el backend ya lo soporta. |
| 6 | ¿Los flujos están optimizados? | **Desigual** | Los flujos de aprendizaje están genuinamente optimizados (lineales, "Siguiente" automático, nunca vacíos) y la reserva paquete→día→hora es excelente de diseño. Pero los que generan ingreso están rotos en su entrada o su clímax: CTA de coaching a una ficha sin botón de reservar, y sala de video inexistente. La estrella polar —sesiones pagadas completadas— está hoy bloqueada por diseño. |
| 7 | ¿La UI guía al usuario? | **A medias** | Guía bien en estructura (jerarquía clara, empties con CTA, "una acción siguiente") pero desvía en los momentos de mayor valor: manda al catálogo como arranque, empuja "Reserva con tu coach" cuando el alumno aún no tiene coach asignado, e invita al padre a un flujo de reserva que luego se le prohíbe con un 403. La guía es confiada y consistente —lo cual empeora el daño cuando apunta mal. |
| 8 | ¿Qué cambiaría una SaaS de clase mundial YA? | **Ver sección dedicada** | Fix de routing de CTAs heroe, sala de video, "reservar para mi hijo/a", base de accesibilidad, Stripe/SMTP reales, command palette + acciones en lote + paginación, y suite de tests sobre el código que mueve dinero. |

---

## Top 5 hallazgos críticos y su impacto

> Severidad reflejada tras verificación adversarial. Los falsos positivos (`verdict.isReal=false`) quedan excluidos de esta lista y separados al final.

| # | ID | Hallazgo | Evidencia | Impacto de negocio |
|---|----|----------|-----------|--------------------|
| 1 | **COG-01 / CNV-01 / NAV-02** | El CTA primario del dashboard del estudiante ("Practicar debate" / "Juega tu primer debate de práctica" / "Ver coach") enruta a `go('coach')`, un perfil de coach de **solo lectura**, no a la práctica de debate ni al marketplace. | `scr-core.ts:110,114,269` (`onclick: go('coach')`) → `scr-profile.ts:340` (perfil estático). La ruta de práctica vive en `scr-debate.ts:30,311`. | Mata la activación del feature flagship (Debate Hub) en el onboarding y estrangula la conversión a coaching desde el punto de mayor intención. Fix de una línea: `window.__debateTab='practice';go('debate')`. |
| 2 | **FLW-01** | El CTA primario del dashboard en estado estable ("Reserva una sesión con tu coach") lleva a una ficha de coach **sin botón de reservar**; el flujo real de reserva vive en `explore`/marketplace, inalcanzable desde ahí. | `scr-core.ts:113-114` → `S.coach` (`scr-profile.ts:340`) sin reserva; reserva real en `scr-marketplace.ts:408`. | Mata la conversión a coaching 1:1 desde el lead más caliente (alumno comprometido y al día). Es el motor de ingresos por comisión de marketplace. |
| 3 | **A11Y-01** | La navegación core del alumno (retomar lección, abrir curso, recomendados) usa DIVs con `onclick`: **no enfocables ni operables por teclado**. | `scr-core.ts:371,165,505` (DIVs `onclick`); único keydown global en `Aula.tsx:798` (solo Enter en buscador). | Excluye por completo a usuarios de teclado/lector de pantalla del flujo de aprendizaje. Riesgo legal directo ADA Title III / Section 508 en el mercado de diáspora US; bloqueador de auditoría institucional/escolar. |
| 4 | **A11Y-02** | **Cero regiones vivas** (`aria-live`/`role="alert"`) en toda la app: toasts, errores de login y errores de formulario son completamente silenciosos para lectores de pantalla. | `Aula.tsx:66-67` (toast sin rol), `Auth.tsx:342`, `Aula.tsx:144/162`; grep de `aria-live|role="alert"|role="status"` = 0. | Hace inservibles login, registro, reserva y entrega para usuarios de lector de pantalla. Un ciego no sabe si su login falló o si su entrega se subió. Fix de una línea por ser un único punto de creación. |
| 5 | **PARENT (persona Padre)** | El padre —el único comprador que el producto invita a pagar— recorre todo el flujo de reserva y al confirmar recibe **403 "Solo estudiantes pueden reservar"**. No existe ningún camino "reservar para mi hijo/a". | `app/api/bookings/route.ts:37`; el portal lo empuja al marketplace bloqueado en `scr-parent.ts:178`. | Invierte la promesa del producto ("parents pay for proof"): el payer no puede pagar coaching. Pérdida directa del journey de monetización para el comprador real. |

**Mención de soporte (NAV-07 / FLW-04 / COG-06):** "Unirse a la sesión" abre `/aula?room=<id>`, que el router de la SPA ignora; el usuario aterriza en su dashboard en una pestaña nueva (no en una sala). Verificado como real, severidad corregida a **media** (no pantalla en blanco literal, pero botón funcionalmente inútil y engañoso en el clímax de pago). Es el momento de entrega del servicio pagado.

---

## Los 3 desbloqueadores de producto

Estas tres piezas de infraestructura están declaradas honestamente como "fase de simulación" en la UI, pero **bloquean cobrar dinero real**. Ninguna es de diseño: son cableado de plataforma.

| Desbloqueador | Estado actual | Qué bloquea | Efecto al resolverlo |
|---------------|---------------|-------------|----------------------|
| **🎥 Sala de video (`room`)** | La ruta no existe; el router de la SPA no parsea query params. "Unirse a la sesión" abre la app en su dashboard, no en una sala (NAV-07, FLW-04, CNV-04, COG-06 — todos verificados reales). | **El clímax del coaching pagado.** La estrella polar del negocio —sesiones pagadas *completadas*— no puede ocurrir on-platform. Genera disputas de escrow, reembolsos y reseñas negativas. | Desbloquea la entrega del servicio. Permite que el escrow pase HELD→RELEASED legítimamente y que la comisión del 18% se realice. Sin esto, el GMV de coaching es inerte. |
| **📧 SMTP** | Vacío. `sendPasswordReset` es no-op; el correo nunca llega, pero la UI dice "te enviamos un enlace" (verificado en personas Padre y Mayor). | **La re-entrada a la cuenta.** Un usuario que olvida su contraseña queda permanentemente fuera sin señal de fallo. Crítico para el padre no-técnico y el usuario mayor. | Restaura recuperación de cuenta y notificaciones transaccionales (aprobación de reserva, confirmación). Reduce churn por lockout y tickets de soporte. |
| **💳 Pagos (Stripe)** | Modo manual; membresía y escrow son "pago simulado en esta fase". `COURSE_SALES_ENABLED=false`. | **El cobro real.** La conversión Free→Pro y el GMV de coaching no pueden facturarse. | Activa las dos líneas de ingreso recurrente: suscripción Pro (US$9/mes o US$79/año) y comisión de marketplace (18%). Es lo que convierte el producto en negocio. |

**Secuencia recomendada para lanzar/cobrar:** lanzar a un grupo pequeño **sin cobro ya** (el núcleo educativo está listo y es de los mejores auditados). Abrir cobro **solo** cuando estén los tres desbloqueadores + la base de accesibilidad + un marco legal de menores. Antes de cablear Stripe real, resolver la deuda de datos crítica (escrow huérfano, backups offsite, idempotencia de webhook) ya catalogada en `docs/AUDIT.md`.

---

## Qué cambiaría una SaaS de clase mundial — YA

1. **Arreglar el routing de las CTAs heroe del dashboard** (`go('coach')` → `go('debate')`/`go('explore')` según el copy del botón). Fix de una línea que desbloquea el journey más caro. (COG-01, CNV-01, NAV-02, FLW-01)
2. **Construir o stubear la sala de video** para que "Unirse" deje de aterrizar en el dashboard en el clímax de pago. Mientras no exista, degradar el botón a un estado honesto en vez de abrir ciego. (NAV-07, FLW-04)
3. **Habilitar "reservar para mi hijo/a" para el rol PARENT** — hoy el único comprador no puede comprar (403 en `bookings/route.ts:37`). (Persona Padre)
4. **Remediar la base de accesibilidad:** convertir DIVs `onclick` en `<button>`, añadir `aria-live` para toasts/errores, y `aria-modal` + trampa de foco + Escape en modales. Bloqueador legal ADA. (A11Y-01, A11Y-02, A11Y-03)
5. **Conectar Stripe/SMTP reales** o eliminar las promesas que no se cumplen (reset de contraseña que nunca llega, precio "$X · Inscribirme" en un modelo que no vende cursos sueltos).
6. **Añadir command palette (Cmd+K), acciones en lote** (calificar/publicar/ocultar/duplicar) y **paginación real** en listas admin/profesor/marketplace. Hoy `take:200` sin paginación; cola de moderación sin límite (ENT-01, ENT-02, PRD-01, PRD-02).
7. **Conectar el escrow y las notas a una suite de tests** — hoy **cero cobertura** sobre código que mueve dinero, y `/api/submissions` acepta entregas vacías con 200 OK vía abuso directo de API. (BE-04, BE-01)

---

## Anexo — Hallazgos refutados en verificación (`isReal=false`)

Excluidos del análisis ejecutivo por no resistir verificación adversarial. Se listan por transparencia:

| ID | Afirmación original | Por qué es falso positivo |
|----|---------------------|----------------------------|
| **NAV-01** | La búsqueda global crashea: la pantalla `search` no existe. | La pantalla SÍ está implementada y cableada (`scr-extra.ts:292`, importada y esparcida en `screens.ts:9,23`). `SCREENS['search'].render` existe; no hay TypeError. |
| **UIC-01** | "Unirse" del dashboard lleva a pantalla en blanco porque la ruta `room` no existe. | La ruta `/aula` sí existe; el guard `canJoin` solo renderiza el botón con `videoUrl` válido. (El problema real del `?room=` ignorado está capturado en NAV-07/FLW-04 con severidad media.) |
| **CNT-01** | El mensaje de escrow se repite 5 veces en un solo perfil de coach. | Máximo 3 instancias co-renderizadas y en zonas UI distintas; las líneas 276 y 330 son mutuamente excluyentes con el perfil. Severidad real: baja. |
| **FLW-02** | "Inscribirme" dispara un toast "¡Inscrito!" **falso**. | El backend SÍ inscribe de verdad (`db.enrollment.create` con `source="FREE"`); el toast es correcto. El issue real es de copy (no comunica que es por membresía). Severidad: media. |
| **FLW-05** | El dashboard manda al catálogo roto como acción de arranque. | Hereda su severidad de FLW-02 (refutado). El flujo de primera visita es coherente y funcional. |
| **ENT-05** | Gradebook: filtros y "Exportar CSV" son UI muerta. | La pantalla `gradebook` está **APAGADA a propósito** (`screens.ts:48`, `shell.ts:57`). Código inalcanzable, no defecto en vivo. |

*Nota: varios hallazgos `high` fueron corregidos a `medium` tras verificación (BE-01, BE-03, ENT-01/02/03, NAV-07, FLW-03/04, COG-06, CNV-04, FE-01, PRD-01/02, A11Y-02). El COG-01/CNV-01 (CTA heroe roto) y A11Y-01 (teclado) se confirmaron como críticos reales.*
