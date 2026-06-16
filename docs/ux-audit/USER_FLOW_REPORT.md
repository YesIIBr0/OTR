# Reporte de Flujos de Usuario — OTR Academy

**Fecha:** 2026-06-16
**Dimensión analizada:** FLW (Análisis de flujos de usuario, Fase 6) + las 6 personas simuladas
*Generado por auditoría multi-agente OTR*

---

## 0. Cómo leer este documento

- Cada flujo clave del producto se descompone en **pasos**, **conteo de clics/pantallas/decisiones**, **fricción**, **riesgo de abandono** y una **versión optimizada**.
- Toda afirmación está respaldada por evidencia `archivo:línea` del corpus verificado adversarialmente.
- Los hallazgos con `verdict.isReal = false` (refutados) NO se reportan como problemas reales: se aíslan al final, en la sección [Apéndice A — Hallazgos refutados](#apéndice-a--hallazgos-refutados-verdictisrealfalse).
- Cuando el veredicto corrigió la severidad (`correctedSeverity`), se usa la severidad corregida y se anota el cambio.

**Hallazgo central transversal** (verificado en múltiples dimensiones): el journey que monetiza el producto — coaching pagado — es el único que no se puede completar hoy. El CTA navy más prominente del dashboard enruta a un perfil de coach de solo lectura (`go('coach')`), no a la práctica ni a la reserva; "Unirse a la sesión" abre la app sin la sala; y el único comprador (el padre) recibe 403 al intentar reservar.

---

## 1. Tabla resumen por persona

| Persona | canCompleteUnaided | Mayor bloqueo (con evidencia) |
|---|---|---|
| **Usuario Nuevo** (estudiante, primera vez) | **Parcial** | El hero del dashboard empuja "Reserva una sesión con tu coach" / "Ver coach" → `go('coach')` cuando el recién registrado no tiene coach asignado; y tras "Inscribirme" el sistema lo deja con un toast sin llevarlo a ninguna parte (`scr-core.ts:113`, `Aula.tsx:417-418`). |
| **Madre/Padre no-técnico** (Portal de Familia) | **Parcial** | El único comprador no puede comprar: el portal lo invita al marketplace ("explora coaches con tu hijo/a", `scr-parent.ts:178`) pero al confirmar reserva el backend devuelve 403 "Solo estudiantes pueden reservar sesiones de coaching" (`app/api/bookings/route.ts:37`). |
| **Power User** (estudiante avanzado, rating estable) | **Parcial** | Cero atajos de teclado en toda la app salvo Enter en el buscador (`Aula.tsx:800-802`); y los CTAs primarios mienten su destino: "Unirse a la sesión" abre pantalla muerta, "Practicar debate" va a un perfil de coach (`scr-mybookings.ts:71`, `scr-core.ts:109-110`). |
| **Administrador** (modera, gestiona usuarios) | **Parcial** | No puede resolver un reporte de principio a fin: desde la cola solo "Marcar revisado"/"Descartar", debe memorizar el nombre del infractor y buscarlo a mano en otra consola para suspender, pese a que el backend ya lo soporta (`scr-admin.ts:80-81` vs `reports/route.ts:101`). |
| **Usuario Móvil** (RD, ~380px, 3G) | **Parcial** | La tabbar inferior del estudiante no incluye Coaches, Mis reservas ni Mensajes (`shell.ts:86`); el marketplace que monetiza solo vive en un cajón lateral que ni se cierra tocando fuera (`Aula.tsx:774`). |
| **Usuario Mayor / baja visión** | **Parcial** | Dos callejones sin salida: "Unirse a la sesión" recarga la app en blanco (`scr-mybookings.ts:71`, `Aula.tsx:49`) y el reset de contraseña promete un correo que nunca llega (`Auth.tsx:80`, SMTP vacío); más texto base de 14px sin control de tamaño ni alto contraste. |

**Patrón:** las 6 personas dieron `canCompleteUnaided = parcial` sin excepción. El núcleo educativo (lección → examen → entrega) se completa sin ayuda; el núcleo de ingreso (descubrir y consumir coaching pagado) no.

---

## 2. Análisis por flujo clave

Calificación de la dimensión FLW: **5.5 / 10**.

> *Resumen de la dimensión (corpus):* "Para un alumno ya inscrito, los flujos de aprendizaje (lección, examen, tarea) son de los mejores que he auditado: lineales, con 'Siguiente' automático, navegación contextual y estados vacíos honestos. PERO la primera visita de un alumno NUEVO se rompe en los dos flujos que generan ingreso."

Convención de columnas: **Clics** = clics mínimos del happy path; **Pantallas** = transiciones de pantalla; **Decisiones** = puntos donde el usuario debe elegir.

---

### Flujo 1 — Primera visita / onboarding

| Métrica | Valor |
|---|---|
| Clics (happy path) | ~6 (placement: 6 sliders + enviar → dashboard) |
| Pantallas | 2 (placement → dashboard) |
| Decisiones | 6 sliders de autoevaluación |

**Pasos:** Registro → redirección forzada a Placement (`Aula.tsx:810`, si `needsPlacement`) → 6 sliders "Ubiquémonos en 3 minutos" → enviar → Dashboard con radar poblado y un Next Action hero.

**Fricción:**
- El placement no muestra barra de progreso ni "paso N de 6"; todos los sliders arrancan en 50 y mover uno no se distingue de no tocarlo, así que el usuario puede enviar los 6 en 50 por inercia, corrompiendo el dato de partida del Skill Graph (CNV-02, **high**, verificado: `scr-placement.ts:42-61`, sin tracking de "tocado", `Aula.tsx:810`).
- No hay opción de saltar ni indicación de qué pasa después (persona Usuario Nuevo, low).
- Al terminar, el feedback es un toast genérico + recarga a ciegas; se pierde el momento "mira lo que construiste" (CNV-07, low: `scr-placement.ts:104-106`).
- El dashboard post-placement muestra estados vacíos encadenados ("Tu radar está por estrenarse") que para el recién llegado se sienten como panel a medio llenar (persona Usuario Nuevo, medium: `scr-core.ts:158`).

**Riesgo de abandono:** **ALTO en el momento más frágil del funnel.** El placement es lo primero que ve todo estudiante; sin señal de progreso ni de impacto, es el cuello de botella de activación #1.

**Versión optimizada:**
1. Barra de progreso fija ("Has ubicado 3 de 6 habilidades") + sliders sin valor fijado hasta que el usuario los toca (elimina el envío-en-50 por inercia).
2. Micro-celebración antes de entrar: mostrar el radar recién poblado y el tier de debut ("Así arrancas — desde aquí solo subes"), reutilizando `radarSvg` de `scr-lifetime.ts`.
3. Hilo conductor explícito del placement a la primera acción real (inscribir un curso o explorar coaches), no caer a un dashboard con tarjetas vacías.

---

### Flujo 2 — Inscripción a un curso

| Métrica | Valor |
|---|---|
| Clics (happy path) | 2 ("Inscribirme" → confirmación) |
| Pantallas | 1 (permanece en el catálogo) |
| Decisiones | Elegir curso |

**Pasos:** Catálogo (primer ítem del grupo Aprender, `shell.ts:26`) → tarjeta con precio en USD y botón "Inscribirme" → `doEnroll` → toast "¡Inscrito!".

**Fricción:**
- El botón dice "Inscribirme" con icono "+" y muestra precio en dólares (`scr-extra.ts:191-194`), lo que sugiere una compra, pero el modelo NO vende cursos sueltos (`COURSE_SALES_ENABLED = false`, `checkout/route.ts:13`). La inscripción es real y gratuita por membresía, pero el copy y el precio confunden sobre si va a cobrar (FLW-02, severidad **corregida a medium** — el backend SÍ inscribe correctamente con `source="FREE"`; el problema es de copy/expectativa, no funcional).
- Tras inscribirse, el sistema deja al usuario en el catálogo sin "¡Empieza ahora!" ni `go('course')`; el usuario nuevo debe deducir que su siguiente paso es navegar a mano al sidebar "Mi aprendizaje" (persona Usuario Nuevo, **high**: `Aula.tsx:417-418`).
- "Cursos" (catálogo) y "Mi aprendizaje" (course) están apilados en el nav; un novato puede volver en bucle a "Cursos" en vez de entrar a su curso (persona Usuario Nuevo, medium: `shell.ts:26-27`).

**Riesgo de abandono:** **MEDIO.** No bloquea, pero rompe la continuación en el momento de mayor intención de uso y siembra confusión de modelo de ingresos ("¿me cobró? ¿qué compré?").

**Versión optimizada:**
1. Si `COURSE_SALES_ENABLED=false`: botón "Acceder (incluido con tu membresía)" y toast "Curso añadido a tu aprendizaje"; ocultar el precio en USD.
2. Tras inscribir, navegar directo al curso (`go('course')`) con un CTA de continuación, en vez de dejar al usuario parado en el catálogo.

---

### Flujo 3 — Tomar una lección

| Métrica | Valor |
|---|---|
| Clics (happy path) | 2-3 (abrir lección → ver → "Marcar como completada") |
| Pantallas | 1-2 (curso → lección) |
| Decisiones | Cuándo marcar completada |

**Pasos:** "Mi aprendizaje" → curso (hero + módulos en acordeón) → fila de lección → reproductor/contenido → "Marcar como completada" → progreso y radar suben.

**Fricción:**
- La navegación core es la mejor lograda del producto: lineal, con "Siguiente" automático, estados vacíos honestos. *Sin embargo*, las filas de lección se construyen con `<div onclick>` no enfocables ni operables por teclado (A11Y-01, **critical**, verificado: `scr-core.ts:371`); un usuario de teclado nunca puede abrir una lección.
- Si el coach no publicó el contenido, el estado vacío es honesto pero sin ruta ("Lección en preparación — Vuelve pronto", `scr-core.ts:547`); el primer clic del novato puede ser un "vuelve pronto" sin sugerir otra lección (persona Usuario Nuevo, medium).
- Al marcar completada se repinta TODA la pantalla con `root.innerHTML` (FE-01, severidad corregida a **medium**: `Aula.tsx:55,676`): el scroll salta arriba, los acordeones se cierran y se pierde el foco. La grabación de micro sí está protegida por `teardownRecorder()`.
- El control "Completada ✓" en realidad DESmarca la lección al pulsarlo, sin advertir (UIC-10, low: `scr-core.ts:589-591`): el alumno puede revertir su progreso por accidente.

**Riesgo de abandono:** **BAJO** para usuario con ratón; **bloqueante** para usuario de teclado/lector de pantalla.

**Versión optimizada:**
1. Convertir filas de lección en `<button>` (patrón `chip-course` ya correcto en `scr-core.ts:359`) o `role="button" tabindex="0"` + Enter/Espacio.
2. Mutar solo el nodo afectado al marcar completada (togglear clase + actualizar el ring de progreso) en lugar de `renderApp` completo.
3. Cuando esté completada, mostrar badge no-interactivo "Completada ✓" + acción secundaria explícita "Desmarcar".

---

### Flujo 4 — Hacer un examen

| Métrica | Valor |
|---|---|
| Clics (happy path) | 1 por pregunta + "Siguiente" + finalizar (~N·2 + 1) |
| Pantallas | 2 (quiz → quiz-results) |
| Decisiones | 1 por pregunta |

**Pasos:** Lección-quiz → selección de opción por clic (`scr-learn.ts:443`) → "Siguiente" → finalizar (valida todo respondido, salta a la primera sin contestar) → quiz-results con score → "Continuar curso" / "Reintentar".

**Fricción:**
- Selección y avance solo por clic; no hay envío por teclado ni navegación por flechas — lento en exámenes de varias preguntas (persona Power User, low: `scr-learn.ts:443`).
- Tras enviar el examen, la pantalla de resultados NO marca la lección-quiz como completada ni muestra el % del curso actualizado (FLW-07, medium): el alumno no recibe señal de avance, debilitando el bucle de recompensa justo en una actividad de alto esfuerzo.
- El banner de reintento dice "subir tu marca" pero no afirma que se conserva la mejor nota; el reintento es directo sin confirmar (FLW-09, low: `scr-learn.ts:382-393`, el backend sí toma el `MAX`).
- Labels inconsistentes para la misma acción: "Continuar" / "Continuar curso" / "Continuar lección" y "Reintentar" / "Reintentar examen" (COG-09, low).

**Riesgo de abandono:** **BAJO.** Flujo sólido; la fricción es de pulido y de cierre de bucle de progreso.

**Versión optimizada:**
1. Al aprobar en quiz-results, marcar la lección como `doneByMe` y mostrar el delta ("Lección completada · curso al 62%").
2. Banner de reintento: "Reintenta las veces que quieras — guardamos tu mejor marca, nunca baja."
3. Estandarizar verbos de avance y permitir envío con teclado.

---

### Flujo 5 — Entregar una tarea

| Métrica | Valor |
|---|---|
| Clics (happy path) | 2-3 (elegir método → adjuntar/escribir → "Entregar") |
| Pantallas | 1 |
| Decisiones | Elegir entre 3 métodos de entrega |

**Pasos:** Pantalla de entrega → grabador de voz / subir archivo / escribir texto (los tres con igual peso) → "Entregar" → "Entregado y en manos de tu coach" → queda "En revisión" hasta calificación manual.

**Fricción:**
- Los 3 métodos (grabar/subir/escribir) se presentan en paralelo, con igual peso visual y encabezados "O...", sin recomendación según el tipo de actividad (COG-04, medium: `scr-learn.ts:149-181`): fatiga de decisión en el momento de entrega.
- No hay confirmación de avance en el curso tras entregar; la entrega queda "En revisión" sin nota y el alumno no sabe si "cuenta" (FLW-07, medium: `scr-learn.ts:350,104`).
- Sin envío por teclado (Cmd+Enter); el botón "Entregar" está en el rail opuesto al textarea (persona Power User, low: `scr-learn.ts:194`).
- Los controles del grabador son botones redondos solo con icono, sin etiqueta visible; estado en gris 12.5px sobre fondo oscuro (persona Usuario Mayor, medium: `scr-learn.ts:156-161`).
- **Nota de backend (defensa en profundidad):** `/api/submissions` no valida presencia de contenido en el servidor (BE-01, severidad **corregida a medium** — el frontend SÍ guarda con `if (!up.fileUrl && !textBody) return` en `scr-learn.ts:333-335`; el riesgo es solo vía llamada directa a la API, no en el flujo de UI).

**Riesgo de abandono:** **BAJO-MEDIO.** El flujo funciona; el riesgo es de claridad (qué método usar) y de cierre de bucle (¿avanzó mi progreso?).

**Versión optimizada:**
1. Destacar el método recomendado según `it.type` (oratoria → grabador) y colapsar el resto bajo "Otra forma de entregar".
2. Tras entregar: "Tu coach revisará en ~X; mientras tanto, continúa con la siguiente lección."
3. Etiquetas de texto en los controles del grabador + envío con Cmd+Enter.
4. Validar presencia de contenido también en el servidor (`if (!fileUrl && !textBody) return bad(...)`).

---

### Flujo 6 — Reservar un coach

| Métrica | Valor |
|---|---|
| Clics (happy path) | ~5 (descubrir marketplace → coach → paquete → día → hora → confirmar) |
| Pantallas | 2-3 (marketplace → perfil de coach → confirmación) |
| Decisiones | Coach, paquete, día, hora |

**Pasos:** Coaches (filtros) → perfil de coach del marketplace → reserva en 3 pasos (paquete → día → hora) → si menor, candado parental (PENDING) → "Confirmar reserva" → escrow HELD.

**Fricción — este es el journey roto en su entrada Y en su clímax:**

1. **Entrada rota — el CTA primario del dashboard no lleva al marketplace.** El hero "Reserva una sesión con tu coach" / "Ver coach" enruta a `go('coach')`, que renderiza un perfil de coach de SOLO LECTURA (`S.coach` en `scr-profile.ts:340`) sin botón de reservar. El flujo de reserva real vive en `S.marketplace.renderProfile`, alcanzable solo vía `go('explore')` con `window.__mkCoachId` (FLW-01, **critical**, verificado: `scr-core.ts:113-114`; afecta también `:110,183,269,271`).

2. **Dos conceptos de "coach" sin puente.** La ficha pública (`go('coach')`, lee `DB.coachProfile`) y el marketplace (`go('explore')`, lee `window.__mkCoachId`) son dos sistemas de datos distintos sin enlace entre sí (FLW-03, severidad **corregida a medium** — no bloquea absolutamente: el usuario puede llegar al marketplace por el sidebar; pero el CTA primario es un dead-end para la intención de reservar).

3. **El padre — único comprador — recibe 403.** El portal invita al padre al marketplace ("explora coaches con tu hijo/a", `scr-parent.ts:178`), el padre recorre paquete→día→hora y al confirmar el backend responde 403 "Solo estudiantes pueden reservar sesiones de coaching" (`app/api/bookings/route.ts:37`); no existe selector "reservar para mi hijo/a" (persona Madre/Padre, **critical**).

4. **Candado parental al final, no al inicio.** El menor recorre todo el flujo y solo al llegar al botón descubre que la sesión quedará pendiente de aprobación (FLW-06, medium: `scr-marketplace.ts:300-314,398`); con `ageBand=null` el aviso es aún más débil (nota faint, `scr-marketplace.ts:310-311`).

5. **Clímax roto — "Unirse a la sesión" abre la app sin sala.** El botón abre `/aula?room=<id>`; el router de la SPA ignora el query param y monta el dashboard del usuario, no una sala (FLW-04 / NAV-07 / COG-06 / UIC-01, severidad **corregida a medium** en todas — NO es pantalla en blanco literal: renderiza el dashboard, pero el botón es funcionalmente inútil y engañoso para toda sesión confirmada. La sala real Cloudflare/Daily es un pendiente conocido y documentado en `scr-mybookings.ts:11`).

> **Nota sobre el bloqueo del padre:** el corpus reporta la severidad cruda como **critical** en la persona; el backend efectivamente bloquea con 403 en `bookings/route.ts:37`. No hay flujo "reservar para mi hijo/a" en ninguna parte del código.

**Riesgo de abandono:** **MUY ALTO / bloqueante.** Este es el journey que genera la comisión de marketplace (estrella polar del negocio: sesiones pagadas completadas) y está roto en la entrada (CTA), en el comprador (padre 403) y en el clímax (sala inexistente).

**Versión optimizada:**
1. Cambiar los CTAs de coaching del dashboard de `go('coach')` a `go('explore')` (marketplace navegable), fijando `window.__mkCoachId` si se quiere un coach concreto (`scr-core.ts:110,114,183,269,271`).
2. Consolidar el concepto de coach: que `S.coach` incluya un botón "Reservar" que lleve a `renderProfile` con el `id` fijado, o redirija al marketplace.
3. Habilitar "reservar para mi hijo/a" para el rol PARENT (selector de hijo + `studentId` del hijo, no del padre).
4. Mostrar el candado parental ARRIBA de la tarjeta de reserva cuando `band==='minor'`.
5. Hasta cablear la sala real, degradar "Unirse" a un estado honesto ("La sala se habilita 10 min antes — te avisaremos") o deshabilitarlo con tooltip; no abrir una pestaña ciega.

---

### Flujo 7 — Crear un curso (coach/profesor)

| Métrica | Valor |
|---|---|
| Clics (happy path) | Decenas (plantilla → 10 campos config → constructor → N actividades una por una) |
| Pantallas | 3 (galería de plantillas → config → constructor) |
| Decisiones | Plantilla, 10 campos de config, estructura |

**Pasos:** "Nuevo curso" → galería (En blanco + plantillas) → formulario de config (10 campos) → constructor estilo Moodle (secciones, drag&drop, activity chooser, exámenes) → publicar.

**Fricción:**
- Crear curso pide 10 campos en la primera acción del coach sin distinguir requeridos de opcionales; "Código corto (único)" no valida unicidad en cliente (UIC-04, medium: `scr-core.ts:233-247`).
- El `formModal` no marca campos requeridos ni valida en línea: solo una línea de error al pie tras Guardar (UIC-05, medium: `scr-core.ts:144,162`).
- Cero atajos de teclado en los modales: ni Enter para guardar, ni Escape para cerrar, ni autofocus (PRD-01, severidad **corregida a medium**: `Aula.tsx:798-805`, `scr-teacher.ts:223-236` — funcional con ratón, pero fricción constante).
- Jerga de infraestructura expuesta: "UID de Cloudflare Stream" en el formulario de video del coach (UIC-06, medium: `scr-core.ts:323-324`, `scr-teacher.ts:369`).
- Reordenar por flechas dispara un POST + `refresh()` completo por clic; el scroll salta al tope entre clics (PRD-03, medium: `Aula.tsx:701-732`). El drag&drop del builder es muy superior (un solo reorder al soltar).
- Constructor de examen 100% manual: sin duplicar pregunta, sin banco, sin pegar en lote (PRD-04, medium: `scr-teacher.ts:243-352`).
- Dos superficies de gestión de contenido compiten: el árbol read-only del Panel del profesor vs. el constructor real en otra pantalla (PRD-05, medium: `scr-teacher.ts:127-191` vs `scr-extra.ts:212-290`).
- Publicar está escondido como el 7º campo de un modal de configuración; no hay botón "Publicar" de un clic (PRD-06, medium: `Aula.tsx:512-513`).
- La galería de plantillas no permite previsualizar ni volver atrás del modal de creación (FLW-08, low: `Aula.tsx:205-258`).
- El editor de contenido depende de `document.execCommand` (API deprecada) (FE-04, medium: `Aula.tsx:153-155`).

**Riesgo de abandono:** **MEDIO** para el coach (lado oferta del marketplace). El flujo es de calidad y maduro, pero la palanca repetitiva (sin atajos, sin acciones en lote, todo de a uno) hace que armar un curso de 8 actividades cueste cientos de clics. Cursos terminados pueden quedar en Borrador porque publicar no es evidente, dejando el catálogo vacío de cara al alumno.

**Versión optimizada:**
1. Reducir el paso 1 a Nombre + Formato (autogenerar código); marcar requeridos con asterisco; validación en línea por campo.
2. Atajos de teclado en modales (Enter→guardar, Escape→cerrar, autofocus); reutilizar el patrón Esc-para-cerrar ya presente en `scr-parent.ts:613-624`.
3. Botón "Duplicar pregunta" + "pegar en lote" en el constructor de examen; reorder local sin `refresh()`.
4. Una sola fuente de verdad para gestión de contenido (Panel = tracking + atajo; Constructor = autoría).
5. Botón directo "Publicar curso" / "Pasar a borrador" en el hero del builder y en la tarjeta de Mis cursos.
6. Migrar el editor richtext a una librería mantenida (Lexical/TipTap/ProseMirror).
7. Ocultar "Cloudflare Stream (UID)" tras "Avanzado"; ofrecer "Subir video" y "YouTube" por defecto.

---

## 3. Síntesis de riesgo de abandono por flujo

| Flujo | Clics | Pantallas | Decisiones | Riesgo de abandono | Hallazgo más grave |
|---|---|---|---|---|---|
| 1. Primera visita | ~6 | 2 | 6 | **Alto** (momento más frágil) | CNV-02 (high) — placement sin progreso |
| 2. Inscripción | 2 | 1 | 1 | Medio | FLW-02 (medium) — copy de compra engañoso |
| 3. Lección | 2-3 | 1-2 | 1 | Bajo / bloqueante por teclado | A11Y-01 (critical) — divs onclick |
| 4. Examen | ~N·2+1 | 2 | N | Bajo | FLW-07 (medium) — sin cierre de bucle |
| 5. Entrega | 2-3 | 1 | 3 | Bajo-medio | COG-04 (medium) — 3 métodos sin jerarquía |
| 6. Reservar coach | ~5 | 2-3 | 4 | **Muy alto / bloqueante** | FLW-01 (critical) + padre 403 (critical) |
| 7. Crear curso | Decenas | 3 | 10+ | Medio | PRD-01..06 (medium) — palanca repetitiva |

---

## 4. Recomendaciones priorizadas (orden de impacto)

1. **Arreglar el routing de las CTAs heroe del dashboard** (FLW-01, COG-01, CNV-01 — critical, fix de pocas líneas): `go('coach')` → `go('explore')` o `window.__debateTab='practice';go('debate')` según el copy. Desbloquea el journey más caro.
2. **Habilitar "reservar para mi hijo/a" para el rol PARENT** (persona Madre/Padre, critical): hoy el único comprador recibe 403 (`bookings/route.ts:37`).
3. **Construir o stubear la sala de video** para que "Unirse" deje de ser un botón engañoso en el clímax de pago (FLW-04 y duplicados, medium corregido).
4. **Remediar accesibilidad base** (A11Y-01 critical): convertir divs onclick en botones; bloqueador legal ADA/Section 508 para la diáspora US.
5. **Continuación tras inscribir + copy honesto** (FLW-02 medium): navegar al curso y reflejar "incluido con tu membresía".
6. **Placement con progreso e impacto** (CNV-02 high): barra de avance, sliders sin valor por defecto, micro-celebración del radar.
7. **Productividad del coach** (PRD-01..06 medium): atajos de teclado, acciones en lote, publicar de un clic, una sola superficie de autoría.

---

## Apéndice A — Hallazgos refutados (`verdict.isReal=false`)

Los siguientes hallazgos del corpus fueron **refutados** en la verificación adversarial y NO constituyen problemas reales. Se documentan aquí por transparencia y para evitar que se re-reporten.

| ID | Título reclamado | Por qué es falso positivo |
|---|---|---|
| **NAV-01** | "La búsqueda global del topbar crashea: la pantalla 'search' no existe" | **Falso.** `S.search` SÍ está implementada en `scr-extra.ts:292` dentro del objeto `S`, importada como `extra` en `screens.ts:9` y propagada a `SCREENS` (`...extra`, línea 23). `SCREENS['search'].render()` resuelve a una función válida que filtra catálogo y estudiantes. No se lanza TypeError. |
| **UIC-01** | "El botón 'Unirse' del dashboard lleva a pantalla en blanco (la ruta room no existe)" | **Falso.** `/app/aula/page.tsx` SÍ existe y es la SPA autenticada. `videoUrl` se fija siempre a `/aula?room=<id>`, una ruta interna válida que resuelve a la app. El botón está tras doble guard `canJoin = b.status==='CONFIRMED' && b.videoUrl`; cuando no aplica, cae a un botón "Ver →". (El problema real — el query param se ignora y monta el dashboard — se captura como medium en FLW-04/NAV-07/COG-06.) |
| **CNT-01** | "El mensaje de escrow se repite 5 veces en un solo perfil de coach" | **Falso (severidad real: low).** Las 5 instancias no co-renderizan: `:276` vive en la grilla del marketplace; `:330` solo aparece tras reserva completada (mutuamente excluyente con `:396/:404`). En el perfil real el máximo simultáneo es 2 fijas + 1 condicional = 3, repartidas en zonas distintas con pesos visuales menores. |
| **FLW-05** | "El dashboard manda al catálogo roto como acción de arranque" | **Falso.** Hereda su severidad de FLW-02, cuya premisa ("catálogo roto") es incorrecta: `/api/checkout` inscribe de verdad (`db.enrollment.create`, `source="FREE"`), `refresh()` actualiza el dashboard y el CTA cambia. El flujo de arranque es coherente y funcional. |
| **ENT-05** | "Gradebook: filtros, calificación inline y Exportar CSV son UI muerta" | **Falso.** La pantalla `gradebook` está explícitamente APAGADA en `screens.ts:48` y `shell.ts:57` ("APAGADA (PRD-estricto)"). Los controles sin wiring viven en código inalcanzable; no hay ruta de usuario que los exponga. |

*Nota sobre el copy de Moodle (UIC-09):* la línea "se sincronizan con el gradebook de Moodle" (`scr-teacher.ts:575`) es deuda de copy real pero vive dentro de la misma pantalla `gradebook` APAGADA; impacto bajo mientras la pantalla no se reactive.

---

## Apéndice B — Nota metodológica sobre severidades corregidas

Varios hallazgos del corpus llegaron con `verdict.correctedSeverity` distinta de la severidad cruda. Este reporte usa la **corregida** y la anota inline. Resumen de las correcciones aplicadas en la dimensión FLW y personas:

| ID | Severidad cruda | Corregida | Motivo |
|---|---|---|---|
| FLW-02 | critical | **medium** | El backend inscribe correctamente (`source="FREE"`); es copy/expectativa, no funcional. |
| FLW-03 | high | **medium** | No bloquea absolutamente; el marketplace es alcanzable por el sidebar. |
| FLW-04 | high | **medium** | No es pantalla en blanco: renderiza el dashboard; botón inútil/engañoso, no crash. |
| NAV-07 / COG-06 / UIC-01 | high/critical | **medium / (UIC-01 refutado)** | Mismo bug de query param; degradado a confusión recuperable. |

---

*Fin del Reporte de Flujos de Usuario. Todas las citas `archivo:línea` provienen del corpus verificado adversarialmente. Los hallazgos con `verdict.isReal=false` se aíslan en el Apéndice A y no se cuentan como problemas reales.*
