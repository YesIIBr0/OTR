# Plan de mejora — OTR Aula

## 1. Resumen ejecutivo

OTR Aula es un prototipo funcional con un **defecto de diseño transversal**: toda la UI se construye con strings de HTML inyectados vía `innerHTML`/`dangerouslySetInnerHTML` sin escape, y casi todas las APIs solo verifican autenticación (no rol ni propiedad). Esto produce **XSS almacenado cross-cuenta**, **escalada de privilegios trivial** (cualquiera se registra como profesor) y **broken access control** generalizado, sumado a pantallas con datos hardcodeados que rompen o mienten al usuario recién registrado. **El producto NO es desplegable a producción hoy.**

Conteo por severidad (tras re-triaje del veredicto): **Crítico/seguridad-bloqueante: 5** · **Alto: 11** · **Medio: 11** · **Bajo: 8**. El XSS, la auto-asignación de rol, la falta de autorización en mutaciones, el `AUTH_SECRET` con fallback y el crash del dashboard del alumno son los cinco frentes que hay que cerrar antes de cualquier otra cosa.

---

## 2. 🔴 Crítico / seguridad (must-fix)

| # | Problema | Acción concreta | Archivo | Prio | Esf |
|---|----------|-----------------|---------|------|-----|
| C1 | XSS almacenado en foro/chat/mensajes: contenido de usuario interpolado crudo en HTML y volcado por `innerHTML` → ejecuta en el navegador de todos. | Crear helper `esc(s)` (escapa `& < > " '`) en `app/lib/` y aplicarlo a **todo** valor dinámico de DB en los `scr-*.ts`. Adicional: en el chat usar `textContent` en vez de `div.innerHTML` (scr-community.ts:136). Sanitizar `body`/`title`/`excerpt` en servidor con allowlist al guardar. | `app/lib/scr-community.ts:14-16,51,104,136` · `app/api/forum/{threads,posts}/route.ts` · `app/api/messages/route.ts` | P0 | L |
| C2 | XSS almacenado vía `name` de usuario en panel docente, modal de calificación y notificaciones → ejecuta en sesión del PROFESOR (escalada). | Mismo `esc()` en `userName`/`activity`/`n.t`/`n.d` (Aula.tsx:145,184) y en `s.n`/`me.name` de las pantallas. Validar `name` en registro/perfil (longitud ≤80, rechazar `<>`), derivar `initials` de forma segura. | `app/components/Aula.tsx:145,184` · `app/lib/scr-teacher.ts:36,52-54,129` · `app/lib/scr-profile.ts` · `app/api/auth/register/route.ts:11` · `app/api/profile/route.ts` | P0 | M |
| C3 | Autorización ausente en mutaciones de cursos/módulos/lecciones: cualquier autenticado (incl. estudiante) borra/edita/crea todo; PATCH pasa el body crudo a Prisma (mass-assignment de `teacherId`/`priceCents`/`published`). | Crear helper `requireTeacherOwning(courseId, user)` que cargue el recurso, resuelva `course.teacherId` y exija `user.id===teacherId || user.role==='ADMIN'`. Aplicar en DELETE/PATCH/POST de courses/modules/lessons. En PATCH usar **allowlist explícita** (`name`, `color`, `next`, `published`, `position`) — nunca `data` crudo. | `app/api/courses/[id]/route.ts:9,17-18` · `app/api/modules/route.ts` · `app/api/modules/[id]/route.ts` · `app/api/lessons/route.ts` · `app/api/lessons/[id]/route.ts` | P0 | M |
| C4 | Auto-asignación de rol TEACHER en registro público + `AUTH_SECRET` con fallback hardcodeado conocido → escalada de privilegios y, si falta la env var en prod, sesiones forjables para cualquier `userId`. | (a) Forzar `role: "STUDENT"` en registro; quitar el `<select>` de rol o convertirlo en "solicitar acceso (requiere aprobación)". (b) En `auth-crypto.ts`: eliminar el fallback y `throw` al arrancar si `AUTH_SECRET` falta o mide <32 bytes. | `app/api/auth/register/route.ts:7,15` · `app/components/Auth.tsx:70-78` · `app/lib/auth-crypto.ts:19` | P0 | S |
| C5 | Dashboard del alumno crashea o miente: `S.course` hace `DB.courses[0]` → `TypeError` para alumno sin inscripciones; saludo "Analía", KPIs y nivel "Varsity" hardcodeados para todos. | En `S.course.render`: `if(!DB.courses.length)` devolver estado vacío con CTA `go('catalog')`. Sustituir literales del dashboard por `DB.me.name`, `new Date()`, `DB.me.level`, KPIs derivados (`DB.courses.length`, promedio de `c.progress`, `DB.xp`). | `app/lib/scr-core.ts:34-36,40,46-49,77,85,107,127-137,165-166` | P0 | M |

---

## 3. ⚡ Rendimiento / fast-loading

| # | Problema | Acción concreta | Archivo | Prio | Esf |
|---|----------|-----------------|---------|------|-----|
| P1 | Cada CRUD hace `location.reload()` → re-ejecuta ~18 queries de `getAppData` y reinyecta el loader navy (parpadeo completo). | Tras éxito, mutar `DB` en memoria (`push`/`Object.assign`) y re-llamar `renderApp(rutaActual)`; reservar `location.reload()` solo como fallback. Eliminar el `setTimeout(...,500)` de `doEnroll`. | `app/components/Aula.tsx:86,93,106,129,137,167,175,202` | P1 | M |
| P2 | `getAppData` lanza 17 queries en `Promise.all` sin timeout ni caché; un fallo de cualquier tabla secundaria tumba toda la home. | Configurar timeouts en `PrismaClient` (db.ts) para fallar rápido. Migrar a `Promise.allSettled` separando datos críticos (`me`, `courses`) de secundarios (forum, activity, gradebook), degradando estos a `[]` si fallan. | `app/lib/queries.ts:15-35` · `app/lib/db.ts` | P2 | M |
| P3 | `getAppData` siempre envía datos docentes (`students`, `gradebook` con PII) a STUDENT → payload inflado + fuga. | Gatear por rol: no incluir `students`/`gradebook`/`teacherCourses` en el payload de un STUDENT (ya hay `isTeacher` calculado en queries.ts:10). Reduce tamaño de hidratación y cierra la fuga (ver R-seguridad). | `app/lib/queries.ts:10,84-88` | P1 | S |
| P4 | No existe `app/loading.tsx`; con BD lenta el Server Component bloquea sin feedback; `.skeleton`/`.spinner` definidos pero no usados en pantallas de datos. | Añadir `app/loading.tsx` con skeleton. Usar el `.skeleton` existente en `openGradeSubs` mientras llega el `fetch`. | `app/` (falta `loading.tsx`) · `app/components/Aula.tsx:141` | P2 | S |

---

## 4. 🛡️ Fiabilidad

| # | Problema | Acción concreta | Archivo | Prio | Esf |
|---|----------|-----------------|---------|------|-----|
| F1 | `renderApp` corre en `useEffect` sin try/catch; un `undefined.map`/`DB.courses[0]` lanza y el error **no** lo captura `error.tsx` (los errores en effects no van al boundary) → spinner "Cargando…" colgado para siempre. | Envolver **todo** el cuerpo del `useEffect` (no solo renderApp) en try/catch que, ante fallo, pinte `root.innerHTML` con estado de error + botón "Reintentar" (`location.reload`). Usar `(DB.x||[]).map` defensivo en todos los `render`. | `app/components/Aula.tsx:18-232,27-35` · `app/lib/scr-core.ts:10,65,94,107,108` · `scr-community.ts:34,95,102` · `scr-teacher.ts:12,35,127` · `scr-profile.ts:19,68,148` | P1 | M |
| F2 | Toda ruta API hace `await req.json()` sin try/catch: body malformado o BD caída → 500 genérico sin `{error}`; el cliente muestra "Error" opaco. | Crear `readJson(req)` (try/catch → 400 `{error:'Cuerpo inválido'}`) y un wrapper `withApi(handler)` con try/catch global: P2025→404, P2002→409 `{ok:true,already:true}`, error de conexión→503, resto→500 controlado, logueando `err`. Aplicar a las 18 rutas. | `app/api/**/route.ts` (todas) | P1 | M |
| F3 | Mutaciones de conteo no atómicas (`studentsCount`/`lessonsCount`/`position`) + P2002 no capturado en enroll/checkout → 500 en doble-click, posiciones duplicadas, contadores desincronizados. | Envolver `create+update` en `db.$transaction([...])`. Capturar P2002 en checkout/enrollments → `{ok:true,already:true}`. Derivar counts con `_count` o usar `position` autoincrement. | `app/api/checkout/route.ts:30-35` · `app/api/enrollments/route.ts:10-15` · `app/api/lessons/route.ts:10-15` · `lessons/[id]/route.ts:9-11` | P2 | M |
| F4 | Calificar NO es idempotente: cada PATCH suma `Math.round(g/2)` XP de nuevo; quiz-attempts otorga XP confiando en `score`/`total` del cliente, sin tope de intentos → XP/nivel inflables a voluntad. | Solo otorgar XP en la **primera transición a GRADED** (o guardar delta aplicado). En quiz: re-calcular score en servidor desde respuestas reales, rechazar 2º intento por (usuario, lección), validar `0<=score<=total`. Envolver en `$transaction`. | `app/api/submissions/[id]/route.ts:12-26` · `app/api/quiz-attempts/route.ts:9,17-24` | P1 | M |
| F5 | DELETE con id inexistente (doble-click, recurso ya borrado) → P2025 → 500 + toast "Error" opaco. | Hacer DELETE idempotente (capturar P2025 → 200 `{ok:true}`, o usar `deleteMany`). Deshabilitar el botón `[data-del]` tras el primer click. | `app/api/courses/[id]/route.ts:9` · `modules/[id]/route.ts:9` · `lessons/[id]/route.ts:10` · `app/components/Aula.tsx:197-202` | P2 | S |
| F6 | `fetch` de chat (scr-community.ts:134) y quiz (scr-learn.ts:130) usan `.catch(()=>{})` y simulan éxito → fallo invisible, el usuario cree que envió/guardó algo que se perdió. | Comprobar `res.ok`; ante fallo, toast "No se pudo enviar, reintenta" y marcar la burbuja como no-entregada. No simular la respuesta del coach hasta confirmar el POST. Exponer/unificar con el helper `api()`. | `app/lib/scr-community.ts:134` · `app/lib/scr-learn.ts:130` | P2 | M |
| F7 | Checkout: import dinámico + `stripe.checkout.sessions.create` sin try/catch ni webhook → un pago real **nunca** crea enrollment (el `?paid=` no se valida server-side; el branch de enroll vive solo en el else sin Stripe). | try/catch → 502 `{error:'No se pudo iniciar el pago'}`. Implementar webhook de Stripe que cree el enrollment al confirmar pago. Allow-list del `origin` para las URLs de éxito/cancelación. | `app/api/checkout/route.ts:16-26` | P2 | M |
| F8 | `submissions GET` devuelve **todas** las entregas (nombre, nota, feedback) a cualquier autenticado; modelo de conversaciones sin ownership (IDOR/spoofing en mensajería). | GET submissions: exigir TEACHER/ADMIN y filtrar a cursos propios; estudiante → `where:{userId:user.id}`. Mensajería: añadir participantes con `userId` al modelo Conversation y validar pertenencia antes de insertar; registrar `senderId` real en vez del booleano `me`. | `app/api/submissions/route.ts:15-20` · `app/api/messages/route.ts:8-20` · `prisma/schema.prisma:201-222` | P1 | M |

---

## 5. 🎨 UI/UX

| # | Problema | Acción concreta | Archivo | Prio | Esf |
|---|----------|-----------------|---------|------|-----|
| U1 | Role-switch Estudiante/Profesor visible para todos → un alumno entra a la vista docente y ve PII (nombres, emails derivados, notas) de compañeros. | Renderizar `#role-switch` **solo** si `user.role` es TEACHER/ADMIN (pasar el rol real al shell). Combinar con P3 (no enviar roster a STUDENT). | `app/lib/shell.ts:102-105` · `app/components/Aula.tsx:211-212` | P0 | S |
| U2 | Perfil muestra stats falsas para todos: "4 insignias", "89% promedio", "subió a Varsity hace 6 días", ubicación/fecha de alta inventadas. | Derivar de DB real: `DB.me.level`, `DB.badges.filter(b=>b.got).length`, `DB.courses.length`, `DB.competencies`, `DB.activity`. Estados vacíos honestos. Omitir ubicación/fecha (no existen en el modelo). | `app/lib/scr-profile.ts:11,19,106-116,127-133,140-143` | P1 | M |
| U3 | Sin onboarding ni estado vacío para alumno nuevo: grid vacío sin CTA, KPIs falsos, "Mi curso" crashea (ver C5). | Estado vacío de bienvenida en dashboard cuando `DB.courses.length===0`: saludo con `DB.me.name`, explicación y botón "Explorar catálogo" (`go('catalog')`). Reutilizar `.empty`/`.ill` ya en CSS. | `app/lib/scr-core.ts:10,58` | P1 | M |
| U4 | Navegación con `onclick` en `<div>`/`<tr>`: no enfocable por Tab, no responde a Enter/Espacio, no anunciada por lectores → usuario de teclado no puede entrar a curso/lección/hilo. | Convertir contenedores navegables en `<a href data-go>` (ya soportado por el delegado) o añadir `role="button" tabindex="0"` + handler keydown (Enter/Espacio) en el listener de Aula.tsx. `:focus-visible` visible. | `app/lib/scr-core.ts:11,117,199` · `scr-teacher.ts:35` · `scr-community.ts:11,96` · `app/components/Aula.tsx:221-228` | P1 | M |
| U5 | Controles de filtro y pestañas decorativos (tabs de curso, segmented, chips, "Ver todo", toolbar editor): pulsarlos no hace nada → sensación de app rota. | Implementar filtrado/cambio de pestaña real, o deshabilitar visiblemente con tooltip "Próximamente", o dar feedback (toast/estado activo). Eliminar enlaces muertos `onclick="return false"`. | `app/lib/scr-core.ts:56,63,150-155` · `scr-community.ts:30,71` · `scr-teacher.ts:83,117` · `app/components/Aula.tsx:184` | P2 | L |
| U6 | Modales sin focus-trap, sin cierre con Escape, sin `aria-modal`/`aria-labelledby`, sin restaurar foco; drawer móvil sin Escape ni scrim de cierre. | Helper común de diálogo: enfocar primer control, focus-trap, cierre con Escape, `aria-modal`/`aria-labelledby`, restaurar foco al disparador. Drawer: cerrar con Escape y scrim. Asociar labels con `for`/`id` en formModal. | `app/components/Aula.tsx:48-163,208` | P2 | M |
| U7 | Toasts sin `aria-live` (confirmaciones/errores no anunciados); badge de campana hardcodeado "3"; panel de notificaciones sin gestión de foco. | `toast-wrap` con `role="status" aria-live="polite"` (`assertive` para `danger`). Calcular `bell-count` desde `DB.notifications.filter(n=>n.unread).length`, ocultar si 0. Foco + Escape en el panel. | `app/components/Aula.tsx:38-47,178-186` · `app/lib/shell.ts:107` | P2 | S |
| U8 | Login (Auth.tsx) sin `htmlFor`/`id` en labels, sin `type="email"`/`autoComplete`, credenciales demo prerellenadas; `renderLogin` en shell.ts es código muerto con password `········` hardcodeada. | Añadir `id`+`htmlFor`, `type="email"`, `autoComplete` en Auth.tsx. No prerellenar credenciales en prod. **Eliminar `renderLogin` (shell.ts:117-169)** — código muerto, segunda fuente de verdad del login. | `app/components/Auth.tsx:13-14,58-73` · `app/lib/shell.ts:117-169` | P2 | M |
| U9 | Breadcrumbs no clicables y hardcodeados ("Public Forum I" siempre); badges sidebar ("Mensajes 2", "Varsity") literales; "Mi curso" singular. | Hacer clicables los segmentos (salvo el último) con `data-go` al padre. Derivar migas del curso activo. Badges desde DB real (no leídos, nivel). Revisar singular/plural. | `app/lib/shell.ts:15,21,43-47` · `app/lib/screens.ts:13-36` | P2 | M |
| U10 | Grabador y subida de tarea no funcionales pero "Entregar" confirma "¡Entregado y guardado!" sin contenido. | Si es maqueta: etiquetar como simulación y deshabilitar "Entregar" hasta que haya grabación/archivo. Idealmente `MediaRecorder` real + `input file` con validación tipo/tamaño y barra de progreso. | `app/lib/scr-learn.ts:36-41,59-84` | P2 | L |

---

## 6. 🧹 Calidad / mantenibilidad

| # | Problema | Acción concreta | Archivo | Prio | Esf |
|---|----------|-----------------|---------|------|-----|
| Q1 | Cero validación de esquema en las APIs; `data:any` + Prisma propenso a mass-assignment al reutilizar. | Añadir `zod` (no está en `package.json`): esquemas por ruta (tipos, longitudes, enums); allowlists explícitas en todo create/update. | `app/api/**/route.ts` · `package.json` | P1 | M |
| Q2 | Patrón estructural frágil: UI como strings + `innerHTML` para datos de usuario es la causa raíz de C1/C2/F1. Sin CSP que mitigue. | Dirección a mediano plazo: migrar datos de usuario a nodos/`textContent` o un renderer con escape por defecto. Añadir **CSP estricta** (sin `unsafe-inline`) en `next.config.mjs`/headers como defensa en profundidad. | `app/layout.tsx` · `next.config.mjs` · `app/lib/scr-*.ts` | P1 | L |
| Q3 | Sin rate limiting en login/registro/APIs → fuerza bruta, enumeración, creación masiva de cuentas, XP farming. | Rate limiting por IP/cuenta en login/registro (middleware + Upstash o store en memoria/Redis) con backoff y lockout tras N intentos. Límites genéricos en `/api/*`. | `middleware.ts` (no existe) · `app/api/auth/{login,register}/route.ts` | P1 | M |
| Q4 | Sin CSRF token ni verificación de Origin/Referer en mutaciones (mitigado parcialmente por SameSite=Lax + API solo-JSON). | Hardening: validar Origin/Referer contra el host esperado en rutas mutantes (helper compartido), exigir `Content-Type: application/json`. | `app/api/**/route.ts` · `app/lib/auth.ts:21` | P2 | M |
| Q5 | Enumeración de cuentas por timing en login (no hay hash dummy si el usuario no existe); `register` devuelve 409 que también enumera. scrypt con N por defecto. | Ejecutar `verifyPassword` contra hash dummy cuando el usuario no exista. Considerar argon2id o subir coste scrypt. Mensaje de error genérico (ya correcto). | `app/api/auth/login/route.ts:8-11` · `app/lib/auth-crypto.ts:10-17` | P2 | S |
| Q6 | Token de sesión sin expiración/rotación/revocación (`userId.HMAC(userId)`); logout solo borra cookie cliente. | Incluir `exp` (+ versión/nonce) en el payload firmado y verificarlo; o sesiones server-side en DB con id revocable. Cookie `secure` explícito en prod. | `app/lib/auth-crypto.ts:21-36` · `app/lib/auth.ts:17-25` | P1 | M |
| Q7 | Falta `not-found.tsx`; sin logging estructurado de errores de servidor. | Añadir `app/not-found.tsx`. Logging estructurado de `err` en el wrapper `withApi` (F2). | `app/` · `app/api/**` | P2 | S |

---

## 7. Roadmap por fases

### Fase 1 — Críticos + quick wins (cerrar la brecha de seguridad y el crash del alumno)
**Alcance:** C1, C2, C3, C4, C5, U1 + quick wins F5, U7 (badge campana), U8 (eliminar `renderLogin`).
**Definición de hecho:**
- Helper `esc()` aplicado a todo dato de usuario en los `scr-*.ts`; payload `<img src=x onerror>` en foro/chat/nombre/notificaciones se renderiza como texto inerte (verificado con cuenta de prueba en foro + modal de calificación).
- Registro público crea **siempre** STUDENT; el `<select>` de rol ya no escala privilegios.
- La app **falla al arrancar** sin `AUTH_SECRET` válido (≥32 bytes); no hay fallback en el binario.
- DELETE/PATCH/POST de courses/modules/lessons rechazan con 403 a quien no sea profesor-propietario o ADMIN; PATCH solo acepta campos de la allowlist (probado intentando setear `teacherId`/`priceCents`).
- Un alumno **recién registrado** (0 inscripciones) ve un dashboard con su nombre real, KPIs derivados y, al pulsar "Mi curso", un estado vacío con CTA al catálogo — **sin crash**.
- El role-switch no aparece para STUDENT.

### Fase 2 — Fiabilidad + autorización fina + accesibilidad core
**Alcance:** F1, F2, F4, F8, P1, P3, U2, U3, U4, Q1, Q3, Q6.
**Definición de hecho:**
- `withApi`/`readJson` en las 18 rutas: body malformado → 400 con `{error}`, BD caída → 503, P2025 → 404; nunca un 500 desnudo; errores logueados.
- `renderApp` envuelto en try/catch: una excepción de render muestra "Reintentar", nunca deja el spinner colgado.
- Calificar dos veces **no** duplica XP; reenviar un quiz **no** suma XP (score re-calculado en servidor, 1 intento por lección).
- `GET /api/submissions` y mensajería ya no filtran datos de otros usuarios; un STUDENT no recibe `students`/`gradebook` en su payload.
- Navegación (curso, lección, hilo, fila docente) operable por teclado (Tab + Enter/Espacio) con foco visible; perfil y dashboard sin datos hardcodeados.
- Validación `zod` en todas las rutas; rate limiting activo en login/registro; sesión con `exp` y revocable.
- CRUD sin `location.reload()` (re-render en memoria); sin parpadeo navy.

### Fase 3 — Pulido UX, rendimiento y hardening restante
**Alcance:** P2, P4, F3, F6, F7, U5, U6, U9, U10, Q2, Q4, Q5, Q7.
**Definición de hecho:**
- CSP estricta activa (sin `unsafe-inline`); datos de usuario migrados a renderer con escape por defecto (defensa en profundidad sobre `esc()`).
- Filtros/pestañas/chips funcionan o están claramente deshabilitados ("Próximamente"); sin enlaces muertos.
- Modales con focus-trap + Escape + `aria-modal`; toasts con `aria-live`; drawer cierra con scrim/Escape.
- Checkout con webhook de Stripe que crea el enrollment; conteos en `$transaction`; fetch de chat/quiz reportan fallos visibles.
- `loading.tsx`, `not-found.tsx`, timeouts de Prisma y `Promise.allSettled` con degradación por bloque; grabador real o etiquetado como simulación.
- Breadcrumbs clicables y derivados del contexto; copys singular/plural correctos.

---

**Causa raíz a no perder de vista:** los tres frentes más graves (C1, C2, C3) nacen de **dos decisiones de arquitectura** — (a) construir UI con strings + `innerHTML` sin escape y (b) APIs que confían en autenticación sin verificar rol/propiedad. Los parches de Fase 1 detienen el sangrado; Q2 (renderer con escape + CSP) y el helper de autorización centralizado son las inversiones que evitan que vuelvan a aparecer.

Archivos clave verificados: `app/lib/auth-crypto.ts:19`, `app/lib/auth.ts:17-25`, `app/components/Aula.tsx:31,145,184`, `app/lib/queries.ts:10,84-88`, `app/lib/scr-core.ts:34-49,107,127-137`, `app/lib/scr-community.ts:14-16,104,136`, `app/lib/shell.ts:102-107,117-169`, `app/api/auth/register/route.ts:15`, `app/api/courses/[id]/route.ts:17-18`, `app/api/submissions/route.ts:18`. Confirmado: no hay `next.config` con headers, no hay `middleware.ts`, no hay `zod` ni dependencia de rate-limiting en `package.json`.