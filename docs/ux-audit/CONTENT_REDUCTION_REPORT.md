# Reporte de Reducción de Contenido — OTR Academy

**Fecha:** 2026-06-16
**Generado por auditoría multi-agente OTR**

---

## 1. Propósito y alcance

Este documento consolida TODO lo que debe **eliminarse, simplificarse, combinarse, reescribirse u ocultarse** en la superficie de copy de OTR Academy. Cubre la dimensión **CNT (Reducción de contenido, Fase 5)** y los hallazgos de **labels/copy de la dimensión UIC (Claridad de UI, Fase 4)** que pertenecen al mismo trabajo de reducción.

Cada ítem cita evidencia `archivo:línea` del corpus verificado adversarialmente. Los hallazgos cuya verificación devolvió `verdict.isReal=false` se **excluyen** de las recomendaciones activas y se documentan aparte en la sección 5 (Refutados). Ningún hallazgo fuera del corpus fue inventado.

### Resumen del corpus de reducción

| Dimensión | Score | Hallazgos verdaderos (reducción) | Refutados / reclasificados |
|-----------|:-----:|:--------------------------------:|:--------------------------:|
| CNT — Reducción de contenido | 5.5 | CNT-02, CNT-03, CNT-04, CNT-05, CNT-06 | CNT-01 (`isReal=false`) |
| UIC — Labels/copy | 6.5 | UIC-07, UIC-09, UIC-11, UIC-12, UIC-13 | UIC-01 (`isReal=false`) |

> Veredicto ejecutivo asociado (literal, `executiveAnswers.tooMuchText`): *"Sí, en pantallas densas. (...) Se puede bajar el esfuerzo de lectura ~40% sin perder nada accionable. El ruido motivacional compite con la pregunta real del usuario: '¿qué hago aquí?'."*

---

## 2. Eliminar / consolidar repeticiones

### Lifetime Profile — discurso de transparencia repetido 3 veces + columna editorial muerta
*(CNT-02 · severidad media · `isReal=true`)*

**Antes:**
- `[Hero columna derecha scr-lifetime.ts:113-114]` "Todo lo que hay aquí es real: cada punto es atribuible a tu trabajo."
- `[Card subtítulo scr-lifetime.ts:210]` "Toca una habilidad para ver exactamente qué la movió."
- `[Dentro de cada skill scr-lifetime.ts:176]` "Sin cajas negras: cada cambio de tu Skill Graph apunta a un evento real."
- `[Empty state scr-lifetime.ts:196]` "...cada evento alimenta tus habilidades, con atribución completa."

**Después:**
- Eliminar por completo la columna editorial del hero (`scr-lifetime.ts:113-114`) — el hero gana aire para identidad/nivel.
- Conservar solo `scr-lifetime.ts:210` como instrucción funcional: "Toca una habilidad para ver qué la movió."
- Borrar la línea `scr-lifetime.ts:176` dentro de cada expandible (la atribución ya es visible en la lista de eventos).

**Por qué:** El mismo concepto ("los puntos son reales y atribuibles") aparece en hero, card, expandible y empty state. La atribución es una propiedad que se **demuestra mostrando los eventos, no narrándola** en prosa. El Lifetime Profile es el moat del producto; sobrecargarlo de retórica diluye su valor percibido como evidencia limpia.

**Ahorro de lectura estimado:** ~2 de 3 instancias eliminadas + columna editorial completa fuera del hero → **−60% del texto retórico** de la pantalla.

---

### Flujo de reserva — consentimiento parental duplicado (gate + bookedPanel)
*(CNT-05 · severidad baja · `isReal=true`)*

**Antes:**
- `[Antes de reservar scr-marketplace.ts:305-308]` "Eres menor de edad: al reservar, le enviaremos la solicitud a tu padre, madre o tutor. La sesión queda pendiente hasta que la apruebe desde su Portal de familia."
- `[Después, bookedPanel pending scr-marketplace.ts:329]` "Le avisamos a tu padre, madre o tutor para que apruebe la sesión desde su Portal de familia. Te notificaremos en cuanto quede confirmada."

**Después:**
- `[Antes de reservar]` "Eres menor: tu reserva necesita la aprobación de tu tutor antes de confirmarse."
- Conservar el `bookedPanel` (`:329`) sin cambios — es donde el estado real importa.

**Por qué:** El menor lee la misma explicación de "tu tutor aprobará desde su Portal de familia" dos veces: antes y después de reservar. La segunda es la útil (estado real); la primera puede comprimirse. "Desde su Portal de familia" sobra antes de reservar.

**Ahorro de lectura estimado:** ~28 → ~12 palabras en el gate previo → **−55%** en ese bloque.

---

### Sublines/disclaimers que repiten lo que el botón ya dice
*(CNT-06 · severidad baja · `isReal=true`)*

**Antes:**
- `[Línea de página scr-learn.ts:147]` "Puedes re-entregar mientras esté en revisión."
- `[Disclaimer bajo botón scr-learn.ts:195]` "Podrás re-entregar después de enviar." / "Una re-entrega reemplaza la anterior."

**Después:**
- Mantener solo el disclaimer bajo el botón (`scr-learn.ts:195`), donde está el contexto de acción.
- Borrar la línea de página `scr-learn.ts:147` (redundante).

**Por qué:** La idea "puedes re-entregar" aparece dos veces en la misma pantalla de entrega. Un mismo hecho se dice una vez, junto al control que lo permite.

**Ahorro de lectura estimado:** −1 línea completa por pantalla de entrega (**−50%** del copy de re-entrega).

---

## 3. Reescribir — del titular metafórico a la acción

### Empty states con titular metafórico + subtítulo redundante (patrón transversal)
*(CNT-03 · severidad media · `isReal=true`)*

| Pantalla / Evidencia | **Antes** (copy actual) | **Después** (copy recomendado) |
|---|---|---|
| Skills vacío · `scr-core.ts:158` | "Tu radar está por estrenarse — Completa una lección y tu coach medirá tus 6 habilidades." | "Mide tus 6 habilidades — Completa tu primera lección para empezar." |
| Notas vacío · `scr-learn.ts:624` | "Tu marcador está en blanco — Entrega una tarea o completa un examen — tus notas y tu promedio se construyen aquí." | "Aún sin notas — Entrega una tarea o un examen y aparecerá tu promedio." |
| Analytics vacío · `scr-debate.ts:403` | "Tus números están por escribirse — Acumula rondas adjudicadas con ballots y verás tu desglose por formato, lado y criterio." | "Aún sin datos — Juega rondas adjudicadas para ver tu desglose por formato y lado." |
| Plan vacío · `scr-core.ts:511` | "El plan se está armando — Tu coach está cargando actividades. Pronto tendrás ruta." | "Aún sin actividades — Tu coach está cargando tu ruta." |

**Por qué:** El usuario nuevo —que es justo quien ve los empty states— lee un titular poético que no le dice qué hacer, y debajo un subtítulo que repite la idea con otras palabras. La acción concreta ("completa una lección", "entrega una tarea") queda enterrada en la segunda línea. **Patrón unificado:** titular = qué obtienes/qué falta (literal); subtítulo = la UNA acción para conseguirlo (verbo + objeto).

**Ahorro de lectura estimado:** **~40% menos texto por zero-state** y la acción sube a la primera línea (mejora de activación, no solo de longitud).

---

### Hero de Membresía y Free card — filosofía donde el usuario solo quiere decidir
*(CNT-04 · severidad media · `isReal=true`)*

**Antes:**
- `[Hero scr-lifetime.ts:502]` "Tu esfuerzo ya está construyendo evidencia. Tu plan decide qué tan rápido — y qué tanto de esa evidencia puedes mostrar."
- `[Free card título scr-lifetime.ts:520]` "Tu historia empieza aquí"

**Después:**
- `[Hero]` "Tu plan decide cuánto entrenas y cuánto de tu progreso puedes mostrar."
- `[Free card]` "Empieza gratis"

**Por qué:** En la pantalla de membresía (decisión de pago) el hero gasta dos líneas en retórica abstracta ("qué tanto de esa evidencia puedes mostrar") en vez de decir qué tiene el plan. El título del Free card no comunica que es el plan base gratis. En pantalla de conversión, la claridad vende mejor que la poesía; el usuario necesita **comparar, no inspirarse**. La retórica de marca pertenece al landing.

**Ahorro de lectura estimado:** Hero de 2 líneas → 1 línea (**−45%**); título del card de 4 palabras a 2 con significado directo.

---

## 4. Labels / copy de UI a reescribir u ocultar (dimensión UIC)

### Toast genérico del modal — confirmación vacía
*(UIC-07 · severidad baja · `isReal=true`)*

**Antes:** `[Aula.tsx:92]` `toast("Acción confirmada", "ok")` (literal fijo, independiente de la acción).
**Después:** `toast(opts.successMsg || "", "ok")` — mensaje específico por acción, o ningún toast dejando que el caller confirme con su propio copy descriptivo.
**Por qué:** "Acción confirmada" no dice qué acción ni si tuvo efecto; genera duda de si algo ocurrió.
**Ahorro de lectura estimado:** Elimina ruido sin valor (un toast que no informa); reduce relecturas.

---

### Copy de reseña — jerga interna "verified-booking-only" visible al usuario final
*(UIC-12 · severidad baja · `isReal=true`)*

**Antes:** `[scr-marketplace.ts:457]` "Solo alumnos con reserva completada pueden dejar reseña (verified-booking-only)."
**Después:** "Solo quienes completaron una sesión con este coach pueden dejar reseña."
**Por qué:** El paréntesis en inglés técnico no aporta nada y resta confianza/limpieza en una sección sensible (trust del marketplace, menores). La parte en español ya comunica la regla.
**Ahorro de lectura estimado:** −1 término de jerga; **−15%** de la longitud de la línea.

---

### Acceso de recurso — término "gated" sin traducir
*(UIC-13 · severidad baja · `isReal=true`)*

**Antes:** `[scr-core.ts:439]` opción "Solo inscritos (gated)".
**Después:** "Solo inscritos" (unificar con la variante correcta ya existente en `scr-teacher.ts:472`).
**Por qué:** "(gated)" es inglés técnico junto a la opción en español e inconsistente con el otro formulario de recursos del mismo producto, que no lo usa.
**Ahorro de lectura estimado:** −1 término; alinea dos formularios en un solo copy.

---

### Label de prerrequisito — redactado al revés del modelo mental
*(UIC-11 · severidad baja · `isReal=true`)*

**Antes:** `[scr-core.ts:378]` "Prerrequisito (completar antes de desbloquear)".
**Después:** "Mostrar esta actividad solo después de completar:"
**Por qué:** El paréntesis está redactado de forma ambigua: la lección elegida es la que debe completarse ANTES, no la actual. Es fácil invertir la lógica y bloquear el curso. La reescritura deja claro qué desbloquea a cuál.
**Ahorro de lectura estimado:** No reduce longitud, **reescribe para eliminar el error** de interpretación (menos soporte por curso bloqueado).

---

### Copy del gradebook — promesa funcional falsa que debe ocultarse
*(UIC-09 · severidad baja · `isReal=true`)*

**Antes:** `[scr-teacher.ts:575]` "Toca cualquier celda para calificar · las notas se sincronizan con el gradebook de Moodle."
**Después:** Eliminar la referencia a Moodle. Si/cuando se reactive el gradebook: "Toca una celda para calificar. Las notas se guardan al instante."
**Por qué:** Menciona un producto externo (Moodle) que no es parte del sistema (es una SPA propia) y promete sincronización inexistente. Deuda de copy peligrosa.

> **Nota de alcance:** la pantalla `gradebook` está APAGADA a propósito (`screens.ts:48`, "APAGADA (PRD-estricto)"). El copy sigue vivo en el código pero hoy no es alcanzable. Por eso se clasifica como **ocultar/limpiar deuda latente**, no como fix de superficie visible. (El hallazgo de escalabilidad ENT-05, que asumía la pantalla viva, fue refutado por esta misma razón — ver sección 5.)

**Ahorro de lectura estimado:** −1 cláusula falsa; elimina riesgo de confusión si se reactiva.

---

## 5. Hallazgos refutados (`verdict.isReal=false`) — NO accionar

Estos ítems aparecían en el corpus como hallazgos de reducción pero la verificación adversarial los descartó. Se documentan para trazabilidad; **no deben implementarse** como cambios de contenido.

### CNT-01 — "El mensaje de escrow se repite 5 veces en un solo perfil de coach"
**Estado:** `isReal=false` · confianza alta · severidad corregida: **low**.
**Por qué se refuta:** El conteo de "5 repeticiones simultáneas" es incorrecto. `scr-marketplace.ts:276` vive en `renderGrid()` (listado, nunca co-renderiza con el perfil). `scr-marketplace.ts:330` vive en `bookedPanel()`, que solo aparece tras completar una reserva y **reemplaza** el `bookingCard`, siendo mutuamente excluyente con `:396`/`:404`. En la página de perfil real, el máximo simultáneo es 2 mensajes always-on + 1 condicional (`:472`, `:404`, y `:396` solo al seleccionar paquete+hora). La repetición es leve y está en zonas de UI funcionalmente distintas (columna info / booking card / resumen de orden), en pesos visuales tenues (11–11.5px). No procede consolidar 5 → 1.

### UIC-01 — "El botón 'Unirse' lleva a pantalla en blanco" (re-label propuesto)
**Estado:** `isReal=false` · confianza alta · severidad corregida: **low**.
**Por qué se refuta (respecto al cambio de copy):** La premisa "la ruta room no existe" es falsa: `/app/aula/page.tsx` existe y es el shell autenticado de la SPA; `videoUrl` siempre es `/aula?room=<id>` (ruta interna válida). El botón está tras doble guard (`scr-core.ts:223`: `CONFIRMED && videoUrl`). El re-label propuesto ("Ver detalles de la sesión") parte de una premisa incorrecta y **no debe aplicarse como cambio de contenido**.
> *Matiz de otras dimensiones:* el comportamiento del enlace `?room=` (el router ignora el query param y carga el dashboard, no una sala) sí es un problema de **flujo/navegación** documentado en NAV-07 / FLW-04 / COG-06 (severidad corregida a **medium**, no un dead-end en blanco). No es un problema de reducción de contenido y queda fuera del alcance de este reporte.

---

## 6. Estimación de reducción total y principios

### Reducción total estimada
Aplicando los 9 ítems verdaderos de las secciones 2–4, el esfuerzo de lectura en las pantallas densas afectadas (perfil de coach, Lifetime Profile, membresía, empty states, flujo de entrega y reserva) baja en línea con el veredicto ejecutivo del corpus:

> **~40% de reducción del esfuerzo de lectura** en pantallas densas, **sin perder ninguna información accionable** (`executiveAnswers.tooMuchText`, literal del corpus).

Desglose por zona donde es mayor el ahorro:
- Lifetime Profile (retórica de atribución): **~60%** del texto editorial eliminado (CNT-02).
- Empty states (titular metafórico → acción): **~40%** por estado, y la acción asciende a primera línea (CNT-03).
- Hero de membresía: **~45%** (CNT-04).
- Gate de consentimiento parental: **~55%** en el bloque previo (CNT-05).
- Disclaimers de re-entrega y jerga de labels: eliminación de líneas/términos redundantes (CNT-06, UIC-07/09/12/13).

### Principios aplicados

| Principio | Cómo se aplica en este reporte |
|---|---|
| **Progressive disclosure** | Mostrar, no narrar: la atribución del Skill Graph se prueba con los eventos visibles, no repitiéndola (CNT-02). El consentimiento detallado vive donde importa el estado (post-reserva), no antes (CNT-05). La re-entrega se explica junto al control, una vez (CNT-06). El copy del gradebook apagado permanece oculto hasta reactivarse (UIC-09). |
| **Smart defaults** | Empty states que ofrecen la UNA acción siguiente por defecto en la primera línea, en vez de motivación genérica (CNT-03). El toast de éxito por defecto deja de ser un literal vacío y describe la acción real o calla (UIC-07). |
| **Claridad sobre retórica en momentos de decisión** | En pantalla de pago/conversión (membresía), la comparación gana a la poesía (CNT-04). |
| **Un hecho, un lugar** | Eliminar repeticiones del mismo mensaje; conservar la instancia con mayor contexto de acción (CNT-05, CNT-06). |
| **Idioma y jerga** | Quitar términos técnicos/ingleses filtrados al usuario final ("verified-booking-only", "gated", "Moodle") y reescribir labels ambiguos al modelo mental del usuario (UIC-11, UIC-12, UIC-13, UIC-09). |

---

*Documento limitado al corpus verificado. Hallazgos con `verdict.isReal=false` (CNT-01, UIC-01) excluidos de las recomendaciones activas y registrados en la sección 5.*
