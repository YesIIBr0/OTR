# OTR Academy — Reporte Tecnico

**Fecha:** 2026-06-16
**Generado por auditoria multi-agente OTR**

Hallazgos de ingenieria de la auditoria UX, divididos en dos dimensiones: **Frontend (FE)** y **Backend / Base de datos (BE)**. Cada afirmacion esta respaldada por evidencia `archivo:linea` del corpus verificado adversarialmente. Los hallazgos refutados (`verdict.isReal=false`) se aislan en una seccion aparte y no cuentan como deuda activa. Las severidades reflejan la `correctedSeverity` cuando el veredicto la ajusto.

> **Delegacion de alcance (BE/DB):** la integridad de datos, denormalizacion, migraciones, indices, idempotencia de Stripe y el caracter monolitico del hotpath ya estan catalogados en [`docs/AUDIT.md`](../AUDIT.md) (DATA-2..6, REL-2, PERF-1, QUAL-1) y [`docs/DATA_MODEL.md`](../DATA_MODEL.md) (huecos de integridad + plan de migracion one-way). **No se repiten aqui.** Esta seccion reporta solo lo NUEVO con impacto directo en la experiencia: entrega-fantasma, validacion que rompe UX, cascada serial del hotpath y cobertura de tests = 0.

---

## 1. Resumen de ingenieria

| Dimension | Score | Estado |
|---|---|---|
| Frontend tecnico (FE) | 7.0 | Base solida y segura; deuda estructural de render y God-component |
| Backend + Base de datos (BE) | 6.5 | Auditado por CTO; riesgos criticos identificados con plan |

**Lo mas fuerte (FE 7.0):** pese a ser una SPA de string-templates, esta bien defendida. Un unico punto de inyeccion de HTML de usuario, saneado server-side con `sanitize-html` (parser real, no regex); todo el copy pasa por `esc()` de forma consistente; **sin XSS explotable confirmado**. El sistema de diseno se respeta de punta a punta y el guard de rol en cliente es correcto.

**Lo mas costoso:** la deuda es estructural (re-render total con `innerHTML`, God-component de 817 lineas, cascada serial del hotpath, **0 tests sobre codigo que mueve dinero**), no una falla de seguridad. La capa de validacion esta disenada para nunca fallar, lo que produce exitos falsos (entrega vacia con 200 OK).

---

## 2. Frontend tecnico (FE)

### 2.1 Tabla de hallazgos FE

| ID | Titulo | Severidad | Esfuerzo | Evidencia (archivo:linea) |
|---|---|---|---|---|
| FE-01 | Re-render completo con `root.innerHTML` destruye estado del DOM (scroll, foco, acordeon, audio) | Media* | L | `Aula.tsx:55`, `:629`, `:676`, `:758` |
| FE-02 | God-component: 817 lineas, un solo `useEffect` con 30+ closures, dispatcher de click monolitico | Alta | L | `Aula.tsx:21-814`, `:635-796` |
| FE-03 | Doble-escape de nombres de curso en modal de edicion (el coach ve `&amp;`) | Media | S | `queries.ts:1433`, `scr-extra.ts:233`, `Aula.tsx:142,503` |
| FE-04 | El unico editor de contenido depende de `document.execCommand` (API deprecada) | Media | L | `Aula.tsx:153-155` |
| FE-05 | Item de nav admin sin clave i18n: rompe bilinguismo ES/EN | Baja | S | `shell.ts:78`, `:100` |
| FE-06 | Panel de notificaciones inyecta por `innerHTML` sin `esc()` (defendido solo upstream) | Baja | S | `Aula.tsx:618`, `queries.ts:1339` |
| FE-07 | Recorder de audio se desmonta via hook global `window.__recTeardown` (acoplamiento fragil) | Baja | M | `Aula.tsx:39-44`, `:53` |

\* FE-01: el corpus declaro **Alta**, pero el veredicto la corrigio a **Media** porque el caso de mayor friccion (stream de microfono) ya esta mitigado por `teardownRecorder()` en `Aula.tsx:53`.

### 2.2 Detalle de hallazgos FE

#### FE-01 — Re-render completo destruye estado del DOM `[Media]`
`Aula.tsx:55` hace `root.innerHTML = renderShell(...)` (reemplazo total), invocado tras **cada** mutacion local: marcar leccion completada (`:676`), marcar notifs leidas (`:629`), toggle de modo edicion (`:758`). El `content.scrollTop = 0` de `Aula.tsx:58` descarta el scroll en cada render; los acordeones (clase `.open` togglada en `:793`) se cierran, y el foco se pierde.

- **Impacto UX:** al marcar una leccion como completada se repinta toda la pantalla — parpadeo desorientador en el bucle central de aprendizaje. **Mitigado:** el stream de microfono se cierra con gracia (`teardownRecorder()` en `:53`); un `<audio>`/`<video>` en reproduccion fuera del recorder si se reiniciaria.
- **Recomendacion:** actualizar solo el nodo afectado tras mutaciones puntuales (togglear clase del `.mitem` + ring de progreso) en vez de `renderShell` completo. A medio plazo, render por seccion con keys o `morphdom`.

#### FE-02 — God-component `[Alta]`
`Aula.tsx` (817 lineas) concentra TODO dentro de un unico `useEffect` (`:21-814`): `modal`, `formModal`, `applyTemplate`, `openCreateCourse`, `openGradeSubs`, `doEnroll`, etc. El dispatcher `onClick` (`:635-796`) es una cadena de ~34 `if (t.closest(...))` con returns donde **el orden importa** (`data-go` al final, `:790`). No existen modulos de descomposicion (`createCourse.ts`, `gradeSubs.ts`).

- **Impacto:** punto unico de conflicto de merge y de bugs cross-feature; un selector mal ordenado puede secuestrar clicks de otra feature. Principal pasivo de mantenibilidad del frontend.
- **Recomendacion:** extraer los handlers a un mapa declarativo `{ 'data-action': fn }` y mover los `openX`/`formModal` a modulos por dominio que reciban contexto (`api`, `refresh`, `renderApp`, `toast`) por parametro. No requiere cambiar la arquitectura SPA.

#### FE-03 — Doble-escape de nombres de curso `[Media]`
La fuente ya viene escapada (`queries.ts:1433` `name: esc(c.name)`) y se re-escapa al emitir el atributo (`scr-extra.ts:233` `data-name="${esc(c.name)}"`); el valor entra sin `esc` al value del input (`Aula.tsx:503` -> render en `:142`).

- **Efecto:** un curso `"Public Forum & Policy"` aparece como `Public Forum &amp; Policy` en el modal de Configuracion; si el coach guarda sin tocar el campo, **persiste el texto corrupto**. Corrupcion progresiva con cada edicion.
- **Recomendacion:** no re-escapar en `scr-extra.ts` (el dato ya viene `esc`): usar `data-name="${c.name}"`. Elegir una sola capa de escape como contrato.

#### FE-04 — Editor depende de `document.execCommand` `[Media]`
`Aula.tsx:153-155` usa `document.execCommand("formatBlock"|"createLink"|cmd)` en la barra del editor richtext del `formModal`. Es la herramienta con la que **todo coach crea el contenido** de lecciones, tareas y recursos.

- **Riesgo:** API obsoleta en la plataforma web, comportamiento ya inconsistente entre navegadores; puede dejar de funcionar sin aviso. Riesgo de plataforma a 12-24 meses sobre un feature central.
- **Recomendacion:** migrar a una libreria mantenida (Lexical, TipTap/ProseMirror, Slate). El contenido ya se sanea server-side, asi que el cambio es de autoria, no de seguridad.

#### FE-05 — Nav admin sin clave i18n `[Baja]`
`shell.ts:78` `{ r:'admin-users', ic:'users', l:'Usuarios' }` carece de propiedad `k`. El resolutor (`shell.ts:100` `it.k ? t(it.k, lang) : it.l`) cae siempre al fallback espanol. Con EN activo, el nav admin mezcla idiomas (`Moderation / Usuarios / Coaches / Debate Hub`).

- **Recomendacion:** anadir `k:'nav.adminUsers'` + entrada en el diccionario; lint que falle si un item de NAV/TABBAR carece de `k`.

#### FE-06 — Notificaciones por `innerHTML` sin `esc()` `[Baja]`
`Aula.tsx:618` inyecta `n.t`/`n.d` por `innerHTML` sin `esc()`. La seguridad depende **exclusivamente** de que `queries.ts:1339` emita `esc(n.title)`/`esc(n.detail)`. Sin riesgo hoy; el peligro es regresion si una ruta futura crea notifs sin pasar por ese map.

- **Recomendacion:** defensa en profundidad — aplicar `esc()` tambien en el punto de inyeccion.

#### FE-07 — Teardown del recorder via hook global `[Baja]`
`Aula.tsx:39-44` lee `window.__recTeardown` (contrato no tipado que vive en `scr-learn`), invocado en cada `renderApp` (`:53`). Si una pantalla nueva con micro/camara olvida registrar su teardown, el stream queda activo tras navegar (luz del micro encendida) — sensible en producto con menores.

- **Recomendacion:** formalizar un `unmount(content)` por pantalla simetrico al `mount` existente, en vez de un unico hook global.

---

## 3. Backend + Base de datos (BE)

### 3.1 Tabla de hallazgos BE

| ID | Titulo | Severidad | Esfuerzo | Evidencia (archivo:linea) |
|---|---|---|---|---|
| BE-01 | `/api/submissions` acepta entregas VACIAS con 200 OK | Media* | S | `submissions/route.ts:30-36` |
| BE-02 | `clean/readJson` disenados para no fallar nunca -> entradas invalidas devuelven 200 con datos vacios | Media | M | `api.ts:13-24`, `submissions/route.ts:16-18`, `lesson-progress/route.ts:14` |
| BE-03 | Hotpath `getAppData`: cascada serial + 2 lookups de User redundantes por refresh | Media* | L | `app-data/route.ts:8`, `auth.ts:14`, `queries.ts:127` |
| BE-04 | Cobertura de tests = 0 sobre escrow y grading (confirmado) | Alta | L | `bookings/route.ts:122-178`, `quizzes/[id]/attempt/route.ts:82-102` |
| BE-05 | Delegacion explicita a AUDIT.md / DATA_MODEL.md (FK, denormalizacion, Stripe, indices, cache) | Baja | S | `AUDIT.md:76-151`, `DATA_MODEL.md:25-83` |

\* BE-01 y BE-03: el corpus declaro **Alta**; los veredictos las corrigieron a **Media** (ver detalle).

### 3.2 Detalle de hallazgos BE

#### BE-01 — Entregas vacias aceptadas con 200 OK `[Media]`
`submissions/route.ts:30-36` no comprueba que `fileUrl || fileName || textBody` tenga contenido antes de `db.submission.create`. Un POST con `{}` crea una `Submission` con los tres en `null` y devuelve `ok({ submission })`.

- **Matiz del veredicto (corregida a Media):** el flujo normal de UI **si** valida — `scr-learn.ts:333-335` muestra `toast('Sube un archivo, graba audio o escribe tu entrega')` y aborta antes de llamar a la API. El riesgo se materializa solo via llamada HTTP directa de un usuario inscrito. Es un hueco de defensa-en-profundidad (validacion server-side ausente), no la confusion de usuario que el titulo original implicaba.
- **Recomendacion:** antes del create, `if (!fileUrl && !textBody) return bad('Adjunta un archivo o escribe tu respuesta antes de entregar', 400);`.

#### BE-02 — Validacion que produce exitos falsos `[Media]`
`api.ts:13-24`: `readJson` con `catch { return {} }` (body malformado -> objeto vacio sin error) y `clean(v,max)` que coacciona `null/undefined/numero` a string vacio. Aplicado en `submissions/route.ts:16-18` y `lesson-progress/route.ts:14` (`const done = Boolean(body.done)` -> body sin `done` se interpreta como **desmarcar**, no como error).

- **Impacto UX:** un bug de cliente (campo mal nombrado, JSON roto, payload truncado en red movil) no produce error accionable sino una operacion a medias que parece exitosa. Sintoma desconectado de la causa; soporte imposible de diagnosticar.
- **Distincion:** es el problema **inverso** a REL-1 de AUDIT.md (que cubre 500 opacos por falta de try/catch); esto es exitos falsos por exceso de tolerancia.
- **Recomendacion:** separar "ausente" de "vacio" — validar campos requeridos explicitamente y devolver `bad()` con mensaje. Considerar `zod` o helpers `requireString/requireBool` en los ~10 POST de escritura.

#### BE-03 — Cascada serial del hotpath `getAppData` `[Media]`
`app-data/route.ts:8` -> `getSessionUser()` (`auth.ts:14` `db.user.findUnique({ where: { id } })`, **lookup #1**, trae todo incl. `passwordHash`) -> `getAppData(email)` (`queries.ts:127` `findUnique({ where: { email } })`, **lookup #2 del mismo usuario**). La funcion encadena ondas seriales: stage 1 (`:127`), stage 2 (`:151-217`), stage 3 (`:253`), stage 4 (`:278-398`), stage 5 condicional (`:813`).

- **Matiz del veredicto (corregida a Media):** el doble lookup es real y eliminable; la cascada anade ~4 round-trips de latencia por refresh suave. **Pero** la recomendacion (b) original es inexacta: el stage 3 (`:253`) lee `meEnrollments[0]?.courseId` y `taughtCourses[0]?.id` producidos por el stage 2, asi que **no** puede hoistearse. Sin impacto de correctitud ni seguridad; dataset actual pequeno.
- **Recomendacion valida:** (a) pasar el objeto `user` ya resuelto por `getSessionUser` a `getAppData` (recibe by-id, elimina lookup #2) — esfuerzo S, es el aporte nuevo sobre PERF-1. (c) `unstable_cache(1h)` para catalogos estaticos, como ya senala PERF-1.

#### BE-04 — Cobertura de tests = 0 sobre dinero y notas `[Alta]`
Confirmado: `find` de `*.test.ts`/`*.spec.ts` (excl. `node_modules`) -> 0; sin dirs `__tests__/tests/e2e`; `grep` de `vitest|jest|playwright|...` en `package.json` -> NONE. El codigo sin red incluye:
- **Escrow transaccional:** `bookings/route.ts:122-178` (`$transaction` que crea `Booking` + `EscrowTxn` HELD + `increment bookingCount`, con guard de race-condition `SLOT_TAKEN` y `takeRatePct=18` hardcodeado).
- **Grading + XP:** `quizzes/[id]/attempt/route.ts:82-102` (XP solo si mejora, `quizAttempt.create` + `user.update(xp)`).

- **Impacto:** una regresion en el guard de slot o en la formula de payout/XP corrompe registros financieros o de gamificacion en produccion **sin deteccion**. Mayor multiplicador de riesgo para escalar.
- **Recomendacion:** confirma QUAL-1 de AUDIT.md. Priorizar P0 por impacto-a-usuario: (1) escrow/consent de `POST /api/bookings`, (2) grading+XP de `POST /api/quizzes/[id]/attempt`, (3) guard de entrega vacia de BE-01. `vitest` + Prisma contra DB de test efimera; cubrir ramas de status (CONFIRMED/PENDING/403) y calculo de payout.

#### BE-05 — Delegacion explicita `[Baja]`
La deuda de datos critica (escrow huerfano `DATA-2`, FK a User `DATA-3`, contadores sin `$transaction` `DATA-4`, sin migraciones versionadas `DATA-5`, falta `@@index([packageId])` `DATA-6`, webhook Stripe sin idempotencia `REL-2`, hotpath monolitico `PERF-1`) ya esta catalogada con evidencia, severidad y plan en `AUDIT.md:76-151` y `DATA_MODEL.md:25-83`. Verificado en `queries.ts:224-241,751-755` que `Booking` se une a `User`/`CoachPackage` por joins manuales (sin `@relation`), confirmando DATA-2/3.

- **Recomendacion:** seguir el plan de `DATA_MODEL.md §3` (migracion one-way con paso 0 de verificacion de huerfanos). Unico matiz: aplicar BE-01/BE-03 (UX-bloqueantes, bajo esfuerzo) sin esperar a la migracion de FK.

---

## 4. Apendice — Hallazgos refutados (`verdict.isReal=false`)

Estos hallazgos del barrido inicial fueron **refutados** en la verificacion adversarial. Se documentan para trazabilidad; **no son deuda activa.**

| ID | Titulo reclamado | Por que es falso positivo |
|---|---|---|
| NAV-01 | La busqueda global del topbar crashea (pantalla `search` no existe) | La pantalla SI existe: `scr-extra.ts:292` exporta `S.search`, importada en `screens.ts:9` y propagada en `:23` (`...extra`). `SCREENS['search'].render()` resuelve sin error. |
| UIC-01 | El boton "Unirse" lleva a pantalla en blanco (ruta `room` no existe) | Premisa falsa: `app/aula/page.tsx` existe y es el shell SPA. `videoUrl` se setea a `/aula?room=<id>` (ruta interna valida); `safeUrl()` deja pasar paths relativos. El boton solo renderiza con doble guard `CONFIRMED && videoUrl`. (Nota: el comportamiento real — abrir el dashboard en vez de una sala — si es una friccion UX real, recogida con severidad Media en otras dimensiones del corpus, no aqui.) |
| CNT-01 | El mensaje de escrow se repite 5 veces en un perfil de coach | Las instancias son mutuamente exclusivas por estructura de render: `:276` vive en el grid, `:330` en `bookedPanel` (reemplaza el `bookingCard`). En la pagina de perfil real el maximo simultaneo es 2 fijas + 1 condicional. |
| FLW-02 | "Inscribirme" dispara un toast `¡Inscrito!` FALSO | El toast es **veraz**: con `COURSE_SALES_ENABLED=false`, `checkout/route.ts:41-50` ejecuta un `db.enrollment.create()` real (source=`FREE`) en `$transaction`. El usuario SI queda inscrito. (Queda como issue de copy/UX de severidad Media, no funcional.) |
| FLW-05 | El dashboard manda al catalogo "roto" como arranque | Inherita su severidad de FLW-02, que fue refutado. El flujo completo es coherente: dashboard -> catalogo -> enrollment real -> `refresh()` -> dashboard actualiza. |
| ENT-05 | Gradebook con filtros/CSV/calificacion inline son UI muerta | La pantalla `gradebook` esta **APAGADA a proposito**: ruta comentada en `screens.ts:48` y nav en `shell.ts:57`, ambas con anotacion "APAGADA (PRD-estricto)". El codigo descrito es inalcanzable. |

> Nota sobre ajustes de severidad: varios hallazgos de routing del dashboard (`go('coach')`) y del boton "Unirse" aparecen en multiples dimensiones del corpus con severidades distintas. En las dimensiones de UX/navegacion conservan su severidad corregida (critical/medium segun el caso). En esta dimension tecnica se reportan unicamente los hallazgos de ingenieria pura (FE-*/BE-*); el routing de CTAs es un defecto de logica de presentacion cubierto por las dimensiones NAV/COG/CNV/FLW.

---

*Fin del reporte. Evidencia trazable a `archivo:linea` del codigo fuente verificado. Para deuda de datos completa ver `docs/AUDIT.md` y `docs/DATA_MODEL.md`.*
