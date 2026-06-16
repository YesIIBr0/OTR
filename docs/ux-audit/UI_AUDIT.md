# Auditoría de UI — OTR Academy

**Fecha:** 2026-06-16
**Alcance:** Claridad de UI (UIC), Diseño visual (VIS), Accesibilidad WCAG 2.1 AA (A11Y) y Frontend técnico / sistema de diseño (FE).
**Generado por auditoría multi-agente OTR**

> Documento de la junta de revisión. Todo hallazgo está respaldado por evidencia `archivo:línea` del corpus verificado adversarialmente. Los hallazgos con veredicto `isReal=false` se excluyen de las secciones principales y se listan aparte en [§6 — Hallazgos descartados](#6--hallazgos-descartados). Cuando un veredicto corrigió la severidad declarada, se usa la **severidad corregida** y se anota el cambio.

---

## 1. Resumen por dimensión

| Dimensión | Clave | Puntuación | Hallazgos reales | Veredicto en una línea |
|---|---|---|---|---|
| Claridad de UI: labels, botones, formularios | UIC | 6.5 / 10 | 12 | Copy cálido y consistente, pero botones que prometen lo que no entregan, formularios largos sin marca de requeridos y jerga de infraestructura filtrada al usuario. |
| Diseño visual: tipografía, espaciado, color, layout | VIS | 6.0 / 10 | 8 | Base estética coherente, pero el sistema de tokens es ficción (espaciado 0% usado, tipografía 2/12) y hay fallos de contraste en elementos de marca. |
| Accesibilidad WCAG 2.1 AA | A11Y | 3.5 / 10 | 10 | NO cumple AA: navegación core por DIVs no operables por teclado, cero regiones vivas, modales sin foco/etiqueta. Bloqueador legal a escala. |
| Frontend técnico / sistema de diseño | FE | 7.0 / 10 | 7 | Base segura y disciplinada (un único punto de inyección saneado, esc() consistente); deuda estructural en re-render total y God-component. |

**Conteo total de hallazgos UI reales:** 37 (1 descartado por `isReal=false` cae fuera de UIC; ver §6).

---

## 2. Claridad de UI (UIC) — 6.5 / 10

El copy en español es consistente, cálido y mayormente claro: los estados vacíos tienen voz de marca, los botones primarios usan verbos accionables y el flujo Moodle (sección → actividad → chooser) está bien rotulado. No llega a 8+ por tres patrones que dañan al usuario nuevo: (1) botones de máxima prominencia que prometen acciones que no se completan; (2) formularios largos de primera vez sin marca de requeridos ni validación en línea; (3) jerga técnica de infraestructura filtrada al usuario final. El motor `formModal` solo muestra UNA línea de error tras pulsar Guardar, lo que en formularios de 10-12 campos obliga a adivinar.

> **Nota de severidad:** El hallazgo **UIC-01** ("Unirse" lleva a pantalla en blanco) fue verificado como **`isReal=false`** y se trasladó a §6. La premisa de que la ruta `/aula` no existe es incorrecta.

| ID | Severidad | Título | Evidencia | Impacto en el usuario |
|---|---|---|---|---|
| UIC-02 | Media | Dos botones "Calificar" compiten en la misma pantalla del coach con destinos casi idénticos | `app/lib/scr-teacher.ts:73` (`data-action="grade-subs"` "Calificar") y `scr-teacher.ts:117` ("Calificar entregas"); ambos abren `openGradeSubs` (`Aula.tsx:642`) | El coach no sabe si hacen lo mismo; la redundancia de dos primarios diluye la jerarquía. |
| UIC-03 | Media | El cambio de contraseña vive escondido en "Editar perfil" como dos campos opcionales sueltos | `app/lib/scr-core.ts:529-531` (`currentPassword` "(solo si la cambias)" y `newPassword`, ambos "opcional") | Es el ÚNICO camino real para cambiar contraseña (reset por email no llega) y está oculto, sin confirmación ni medidor de fuerza. |
| UIC-04 | Media | Crear curso pide 10 campos en la primera acción del coach; opcionales no se distinguen | `app/lib/scr-core.ts:233-247` (name, code, format, modality, capacity, color, next, summary, published); sin marca visual de requerido | Muro de 10 campos antes de tener nada; "Código corto (único)" sin validación en cliente, falla con error genérico al submit. |
| UIC-05 | Media | `formModal` no marca campos requeridos ni valida en línea: solo una línea de error tras Guardar | `app/lib/scr-core.ts:144` (`<p class="fm-err" ... display:none>`); error solo al fallar `onSubmit` (`scr-core.ts:162`); sin `required` (`scr-core.ts:136-143`) | El usuario llena 10-12 campos, pulsa Guardar y recibe UNA frase del backend sin señalar el campo. Adivinanza pura. |
| UIC-06 | Media | Jerga de infraestructura expuesta al coach: "UID de Cloudflare", "Cloudflare Stream (UID)" | `app/lib/scr-core.ts:323-324`, `scr-core.ts:380-381`, `scr-teacher.ts:369,381,399` | Un coach de debate no sabe qué es un "UID de Cloudflare Stream" ni dónde obtenerlo; abandona la subida de video o la hace mal. |
| UIC-07 | Baja | Toast del modal genérico dice "Acción confirmada" — confirmación vacía | `app/components/Aula.tsx:92` (`toast("Acción confirmada", "ok")` fijo para toda acción) | Mensaje neutro que no dice qué acción ni si tuvo efecto; genera duda de si algo ocurrió. |
| UIC-08 | Media | Perfil de coach: 12 campos con conversión USD/centavos opaca y 4 campos de precio separados | `app/lib/scr-core.ts:545-557` (12 entradas); precios en USD pero convertidos a centavos (`scr-core.ts:559` `usdToCents`) sin que el usuario lo vea | El precio es el campo más sensible del marketplace; confusión → precios erróneos → disputas. "Idiomas (separados por coma)" mezcla código con texto libre. |
| UIC-09 | Baja | El gradebook promete sincronización con Moodle inexistente | `app/lib/scr-teacher.ts:575` ("las notas se sincronizan con el gradebook de Moodle") | Promesa funcional falsa que menciona un producto externo no presente. (Pantalla apagada en `screens.ts:48`, pero el copy sigue vivo en código.) |
| UIC-10 | Baja | El botón "Completada ✓" de la lección en realidad DESmarca al pulsarlo, sin indicarlo | `app/lib/scr-core.ts:589-591` (estado completado → `data-done="false"`) | El alumno pulsa creyendo confirmar y revierte su progreso sin advertencia; baja el % del curso. |
| UIC-11 | Baja | Label de prerrequisito de lección con copy técnico ambiguo, sin ejemplo | `app/lib/scr-core.ts:378` (`releaseAfterId`, "Prerrequisito (completar antes de desbloquear)") | El paréntesis está redactado al revés de cómo piensa el usuario; fácil invertir la lógica y bloquear el curso. |
| UIC-12 | Baja | Copy de menores muestra el término interno "verified-booking-only" al usuario final | `app/lib/scr-marketplace.ts:457` ("...pueden dejar reseña (verified-booking-only).") | Jerga de producto en inglés entre paréntesis que resta confianza/limpieza en una sección sensible (menores). |
| UIC-13 | Baja | Acceso de recurso usa el término "gated" sin traducir en el formulario del coach | `app/lib/scr-core.ts:439` ("Solo inscritos (gated)"); la variante de `scr-teacher.ts:472` ya dice solo "Solo inscritos" | Inconsistencia de copy entre dos formularios que hacen lo mismo. |

### Recomendaciones prioritarias (UIC)
- **UIC-04 / UIC-05:** reducir crear-curso al paso mínimo (Nombre + Formato), autogenerar el código, marcar requeridos con asterisco y validar en cliente ANTES de llamar a la API, resaltando el campo concreto.
- **UIC-06:** ofrecer solo "Subir archivo" y "YouTube" al coach; esconder Cloudflare tras "Avanzado".
- **UIC-10:** al estar completada, usar un badge no-botón "Completada ✓" + acción secundaria "Desmarcar".

---

## 3. Diseño visual (VIS) — 6.0 / 10

La base estética es sólida y coherente con el brand book (crema/negro/verde, Inter, escala de sombras neutra, `prefers-reduced-motion`). El layout escanea bien. Hay dos clases de problemas reales, no de gusto: (1) el sistema de tokens es **ficción** — los tokens de tipografía (`--fs-*`) se usan 2 de 12 veces y los de espaciado (`--s-*`) CERO veces, con todo hardcodeado en px (~28 tamaños distintos, ~20 half-pixel, y pesos no estándar 550/650/750); (2) fallos de contraste WCAG verificables en elementos de marca de alto valor (dorado de logro/racha 2.42:1, badge/botón verde sobre verde 3.73:1).

| ID | Severidad | Título | Evidencia (token / archivo:línea) | Ratio / dato |
|---|---|---|---|---|
| VIS-01 | Alta | Insignias de LOGRO y chip de RACHA: dorado sobre dorado, ilegible | `app/styles/app.css:198` `.badge.gold{...color:var(--otr-gold-lo)}` (#C8920C sobre #FBEFCB); racha en `screens.css:30` usada en `scr-core.ts:128` | **2.42:1** (falla AA texto 4.5 y UI 3) |
| VIS-02 | Alta | Sistema de tokens de espaciado MUERTO: `--s-1..s-16` definidos, usados 0 veces | `tokens.css:91-93`; `grep "var(--s-"` (excl. tokens.css) = 0; padding/margin/gap en 13 valores literales (7/9/11/13/18px fuera de la rejilla 4pt) | 0% adopción; off-grid en `.btn`/`.card`/`.sb-item`/`.topbar` |
| VIS-03 | Media *(declarada Alta; corregida a Media)* | Escala tipográfica MUERTA: `--fs-*` usado 2 de 12 veces; ~28 (real: 46) tamaños px distintos, ~20 half-pixel | `tokens.css:86-88`; usos solo en `app.css:8` y `app.css:113`; literales 9/9.5/10/10.5/.../13.5(x18)/14.5px | Half-pixel no se alinean a step de escala. **Corregido a Media:** invisible en alta DPI, sin funcionalidad rota. |
| VIS-04 | Media | Contador de no-leídos y botón-acento en verde/blanco fallan AA | `app/styles/app.css:78` `.sb-item .badge-count{background:var(--otr-sky);color:#FFF}` (#2CAA20); `.btn-accent` igual (`app.css:131`) | **3.05:1** (falla AA texto 4.5) |
| VIS-05 | Media | Restos del rebrand viejo: azul #5F7390 y scrims navy `rgba(10,26,47)` que el brand book prohíbe | `app.css:161` (chevron del select `stroke='%235F7390'`); `screens.css:320` y `responsive.css:7` (scrims navy) | Tinte azul en cada dropdown y modal vs canon crema/negro/verde |
| VIS-06 | Baja | Pesos tipográficos no estándar (550/650/750) que Inter no garantiza | `screens.css:81` (550), `screens.css:136,248` (650), `app.css:323` (750) | Énfasis pretendido cae a 500/600/700 según plataforma; aplana jerarquía |
| VIS-07 | Baja | Tipografía sub-mínima en chips/contadores: bell-count 9.5px, grupo sidebar mini 9px, tabbar 10.5px | `screens.css:309` (9.5px); `app.css:68` (9px); `responsive.css:48` (tabbar 10.5px) | El label de la tabbar es la nav primaria móvil y es el texto más pequeño |
| VIS-08 | Baja | El canvas de la app no usa la crema de marca: body es `--bg-sunken` #F1F1E4, no `--bg` #F7F7ED | `tokens.css:47` (`--bg`); `app.css:11` y `app.css:87` (body/main usan `--bg-sunken`) | Contraste tarjeta/fondo de **1.14:1**; las cards apenas "flotan" |

### Recomendaciones prioritarias (VIS)
- **VIS-01 (Alta):** oscurecer el texto dorado del badge de logro a ~#5A4206 (≈6.8:1 sobre #FBEFCB), dejando el dorado vivo solo en el icono/borde.
- **VIS-02 (Alta):** migrar paddings/margins/gaps a los tokens `--s-*` y prohibir literales fuera de la rejilla 4pt, empezando por `.btn`, `.card`, `.card-body`, `.lrow`, `.page`.
- **VIS-04:** usar `--otr-green-lo` (#1E8C16 ≈ 4.6:1) en `badge-count` y `.btn-accent`.

---

## 4. Accesibilidad WCAG 2.1 AA (A11Y) — 3.5 / 10

OTR Academy **NO cumple WCAG 2.1 AA** y hoy es inutilizable para un usuario de teclado o lector de pantalla en sus rutas core. Es el eje más roto y de mayor riesgo legal (ADA / Section 508 para la diáspora US, con menores). Tres bloqueadores estructurales: navegación core por DIVs `onclick`, cero regiones vivas, y modales sin foco/etiqueta/Escape. A esto se suman fallos de contraste verificados por cálculo.

> **Nota de severidad:** los veredictos corrigieron **A11Y-02** y **A11Y-03** de `critical`/`high` a sus valores ajustados (A11Y-02 → Alta, A11Y-03 → Alta), por ser conformance que no bloquea por completo el uso por personas videntes y por tener fix localizado. Se reflejan corregidas abajo.

| ID | Severidad | Título | Evidencia | Criterio WCAG |
|---|---|---|---|---|
| A11Y-01 | **Crítica** | La navegación core del alumno usa DIVs con `onclick`: no enfocables ni operables por teclado | `scr-core.ts:371` (filas `.mitem`), `scr-core.ts:165` (recomendados), `scr-core.ts:505` (`<tr>`); único keydown en `Aula.tsx:798-805` (solo Enter en buscador) | 2.1.1 (Teclado, A); 4.1.2 (Nombre/Rol/Valor, A) |
| A11Y-02 | Alta *(declarada Crítica; corregida a Alta)* | Cero regiones vivas: toasts y errores son invisibles para lectores de pantalla | `Aula.tsx:66-67` (toast sin `role`/`aria-live`); `Auth.tsx:342` y `Aula.tsx:144/162` (errores); `grep aria-live\|role="alert"\|role="status"` = 0 en `app/lib` y `app/components` | 4.1.3 (Mensajes de estado, AA); 3.3.1 (A) |
| A11Y-03 | Alta | Modales sin `aria-modal`, sin etiqueta, sin trampa de foco ni cierre con Escape | `Aula.tsx:87` (`role="dialog"` solo); patrón repetido en `:144,:169,:218,:356,:481`; cierre solo por click (`Aula.tsx:91`), sin Escape ni `focus()` inicial | 2.1.2; 2.4.3 (Orden de foco); 4.1.2 |
| A11Y-04 | Alta | Badges de logro (dorado) y avisos: contraste 2.42:1 | `tokens.css:18-19`/`app.css:198` (badge gold, texto 11.5px); `tokens.css:68` (`--warn` = mismo par) | 1.4.3 (Contraste mínimo, AA) — **2.42:1** |
| A11Y-05 | Alta | Botones "soft" y badge "sky" (verde sobre verde pálido): 3.73:1 | `app.css:135` `.btn-soft` y `app.css:195` `.badge.sky` (`--action-soft` #E1F2DE / `--action-hover` #1E8C16); usado en ≥10 pantallas | 1.4.3 (AA) — **3.73:1** |
| A11Y-06 | Alta | Inputs de formulario sin asociación label↔input ni `aria-invalid` | `Auth.tsx:315-316` (sin `htmlFor`/`id`, repetido en todos los campos); `Aula.tsx:142,:137,:141` (formModal, llamado ~11 veces) | 1.3.1 (A); 3.3.1; 4.1.2 |
| A11Y-07 | Media | El buscador del topbar no tiene etiqueta accesible | `shell.ts:151-154` (`<input>` solo con `placeholder`; icono `aria-hidden`) | 4.1.2; 2.4.6 |
| A11Y-08 | Media | Texto de aviso/éxito verde sobre fondo claro en login: hasta 2.09:1 | `Auth.tsx:227-231` (`--otr-sky-hi` #54C247 sobre tinte verde → 2.09:1); enlace "¿Olvidaste tu contraseña?" `Auth.tsx:353` (#2CAA20 sobre blanco → 3.05:1) | 1.4.3 (AA) |
| A11Y-09 | Media | Indicador de foco de bajo contraste (anillo verde ~3:1 o menos) | `app.css:19` `:focus-visible{outline:none;box-shadow:var(--ring)}`; `tokens.css:103` `--ring:0 0 0 3px rgba(44,170,32,.35)` | 2.4.11 / 1.4.11 — 2.83:1 sobre crema |
| A11Y-10 | Baja | Placeholder como texto y separador de migas con contraste insuficiente | `app.css:156` `.input::placeholder{color:var(--n-400)}` (#89897D = 3.54:1); `app.css:100` `.crumbs .sep{color:var(--n-300)}` (#B4B4A7 = 2.09:1) | 1.4.3 (AA) |

### Recomendaciones prioritarias (A11Y) — bloqueadores de lanzamiento a escala
- **A11Y-01 (Crítica):** convertir filas/tarjetas clicables en `<button>`/`<a href>`, o como mínimo `role="button" tabindex="0"` con delegación Enter/Espacio. Reutilizar el patrón ya correcto de `.chip-course` (`scr-core.ts:359`, ya es `<button>`).
- **A11Y-02 (Alta):** `role="alert"`/`aria-live="assertive"` para errores y `aria-live="polite"` para toasts ok. Un punto único de creación cubre casi toda la app.
- **A11Y-03 (Alta):** centralizar en el helper de modal `aria-modal="true"`, `aria-labelledby` al `<h3>`, foco inicial, trampa de Tab, cierre con Escape y retorno de foco al disparador.
- **A11Y-04 / A11Y-05:** definir tokens de texto verde/dorado oscuros (~#176B11 / ~#6B4E05) usados SOLO sobre los tintes pálidos correspondientes.

---

## 5. Frontend técnico / sistema de diseño (FE) — 7.0 / 10

La arquitectura SPA de string-templates + `window.DB` es sorprendentemente disciplinada: un único punto de inyección de HTML de usuario saneado server-side con `sanitize-html` (parser real, no regex), todo el copy pasa por `esc()` de forma consistente, sin XSS explotable confirmado. El sistema de diseño (navy+sky, Inter, iconos en vez de emojis) se respeta de punta a punta. Los problemas son de **deuda estructural y consistencia**, no de seguridad.

| ID | Severidad | Título | Evidencia | Impacto |
|---|---|---|---|---|
| FE-01 | Media *(declarada Alta; corregida a Media)* | Re-render completo con `root.innerHTML` en cada mutación local destruye estado del DOM | `Aula.tsx:55` (`root.innerHTML = renderShell(...)`) invocado tras cada acción: `Aula.tsx:676,629,758`; scroll forzado a 0 en `Aula.tsx:58` | Al marcar lección, se repinta TODO: scroll salta, foco se pierde, acordeones se cierran. El recorder sí se desmonta con gracia (`Aula.tsx:53`), por eso se corrige a Media. |
| FE-02 | Alta | `Aula.tsx` es un God-component: 817 líneas, un único `useEffect` con 30+ closures y un listener de click monolítico | `Aula.tsx:21-814` (todo en un `useEffect`); dispatcher `onClick` `Aula.tsx:635-796` (~34 `if (t.closest(...))`); `data-go` al final (`:790`) | Punto único de conflicto de merge y de bugs cross-feature; el orden de los `if` importa. |
| FE-03 | Media | Doble-escape de nombres de curso en el modal de edición: el coach ve `&amp;` / `&quot;` | Fuente ya escapada en `queries.ts:1433` (`name: esc(c.name)`); re-escapada en `scr-extra.ts:233` (`data-name="${esc(c.name)}"`); entra sin esc al value en `Aula.tsx:503` → `:142` | Nombres con `&`, comillas o `<` muestran entidades crudas y se corrompen progresivamente al guardar. |
| FE-04 | Media | El único editor de contenido depende de `document.execCommand` (API deprecada) | `Aula.tsx:153-155` (`formatBlock`, `createLink`, `execCommand`) en la barra del editor richtext (`Aula.tsx:139,148-156`) | Herramienta con la que TODO coach crea contenido; comportamiento ya inconsistente entre navegadores, puede dejar de funcionar sin aviso. |
| FE-05 | Baja | Item de nav de admin sin clave i18n: rompe el bilingüismo ES/EN | `shell.ts:78` (`{ r:'admin-users', ic:'users', l:'Usuarios' }`, sin `k`); fallback en `shell.ts:100` | Con EN activo, el nav admin mezcla idiomas ("Moderation / Usuarios / Coaches"). |
| FE-06 | Baja | El panel de notificaciones inyecta `n.t`/`n.d` por `innerHTML` sin `esc()` (defendido solo por escape upstream) | `Aula.tsx:618` (sin `esc()`); seguridad depende de `queries.ts:1339` (`t: esc(n.title)`) | Riesgo de regresión, no actual: una notif futura por otra ruta sin ese map se vuelve vector XSS sin aviso. |
| FE-07 | Baja | El recorder de audio se desmonta vía hook global `window.__recTeardown` — acoplamiento implícito y frágil | `Aula.tsx:39-44` (lee `window.__recTeardown`), invocado en `Aula.tsx:53`; el contrato vive en `scr-learn`, fuera de `Aula.tsx` | Una pantalla nueva con micro/cámara que olvide registrar su teardown deja el stream activo (privacidad). |

### Recomendaciones prioritarias (FE)
- **FE-02 (Alta):** extraer el registro de handlers a un mapa declarativo `{ 'data-action': fn }` y mover los `openX`/`formModal` a módulos por dominio que reciban contexto por parámetro. No cambia la arquitectura SPA.
- **FE-03:** elegir UNA sola capa de escape como contrato — no re-escapar en `scr-extra.ts` (el dato ya viene esc de `queries.ts`).
- **FE-04:** migrar el editor richtext a Lexical/TipTap/Slate; el contenido ya se sanea server-side, así que el cambio es de UX/autoría, no de seguridad.

---

## 6. Hallazgos descartados (`verdict.isReal = false`)

Estos hallazgos fueron refutados en la verificación adversarial y NO deben tratarse como problemas reales. Se documentan para trazabilidad.

| ID | Dim. | Título original | Razón del descarte (veredicto, confianza) |
|---|---|---|---|
| UIC-01 | UIC | El botón "Unirse" del dashboard lleva a pantalla en blanco | **Falso positivo (confianza alta).** La premisa "la ruta de sala no existe" es errónea: `/app/aula/page.tsx` SÍ existe y es el shell SPA. `videoUrl` se fija siempre a `/aula?room=<id>` (`bookings/route.ts:157-160`); `safeUrl()` pasa rutas relativas sin cambio (`api.ts:35`). El botón está tras doble guard (`scr-core.ts:223`, `canJoin = CONFIRMED && videoUrl`); cuando renderiza, la URL es una ruta interna válida. No abre pestaña en blanco. |

> **Aclaración relacionada (no es un hallazgo UI, se documenta por contexto):** otros agentes reportaron el mismo "Unirse" como defecto real en dimensiones de navegación/flujo, con la severidad **corregida a Media**: el destino `/aula?room=<id>` es una ruta válida, pero el router de la SPA ignora el query param y el usuario aterriza en su dashboard, no en una sala. El resultado es un botón engañoso (no una pantalla en blanco). Esto cae fuera del alcance estricto de UI de este documento; se incluye solo para conciliar la discrepancia entre dimensiones.

### Hallazgos reales con severidad corregida (resumen de trazabilidad)

Para transparencia de la junta, los hallazgos de las dimensiones UI cuya severidad declarada fue ajustada por el veredicto:

| ID | Dim. | Severidad declarada → corregida | Motivo |
|---|---|---|---|
| VIS-03 | VIS | Alta → **Media** | Half-pixel invisible en alta DPI; deuda de mantenibilidad, sin funcionalidad rota. |
| A11Y-02 | A11Y | Crítica → **Alta** | Conformance 4.1.3 violada, pero no bloquea uso por videntes; fix localizado en dos atributos. |
| A11Y-03 | A11Y | (mantiene **Alta**) | Confirmada verbatim; afecta authoring/calificación del coach. |
| FE-01 | FE | Alta → **Media** | El recorder se desmonta con gracia (`Aula.tsx:53`); las regresiones restantes (acordeón, scroll, foco) son moderadas. |

---

## 7. Síntesis de la junta

La superficie de UI de OTR Academy es **estéticamente coherente y técnicamente segura**, pero su accesibilidad está estructuralmente quebrada y su sistema de tokens es decorativo más que operativo. El orden de remediación recomendado:

1. **Accesibilidad base (A11Y-01, A11Y-02, A11Y-03):** bloqueador legal a escala. Convertir DIVs en controles, añadir regiones vivas y arreglar los modales — todo centralizado, alto retorno.
2. **Contraste de marca (VIS-01, A11Y-04, A11Y-05):** el dorado de logro y el verde soft fallan AA en los elementos de mayor valor emocional (gamificación) y los CTAs más frecuentes.
3. **Deuda de tokens (VIS-02, VIS-03):** migrar a `--s-*` / `--fs-*` para poder re-skinear y ajustar densidad a escala.
4. **Claridad de formularios (UIC-04, UIC-05, UIC-06):** reducir campos, marcar requeridos, validar en línea y quitar jerga de infraestructura.
5. **Mantenibilidad del frontend (FE-02, FE-04):** descomponer el God-component y migrar el editor fuera de `execCommand`.

---

*Documento generado por auditoría multi-agente OTR. Evidencia trazada a `archivo:línea` del corpus verificado adversarialmente. Severidades reflejan los veredictos corregidos cuando aplica; los hallazgos `isReal=false` quedan excluidos de las secciones principales.*
