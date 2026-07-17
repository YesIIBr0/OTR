# PLAN MAESTRO OTR — Julio 2026

**De base sólida a producto premium escalable.**
Documento de ejecución: cada fase es un lote de tareas independientes, cada tarea
termina en ≤3 días con su propio commit y gate verde (`tsc` + `eslint` + `vitest` +
`prisma validate ×2` + `next build` + CI). Nada queda a medias: una tarea que no
cierra su gate no se mergea.

**Fuentes de este plan** (todo con evidencia `ruta:línea`, nada estimado a ojo):
- Descubrimiento de 6 dimensiones (2026-07-17, 6 agentes en paralelo, solo lectura)
- Auditoría CTO Fase 0 (`docs/review/CTO_AUDIT_2026-07.md`, 93 hallazgos + remediación)
- Análisis funcional completo (7 agentes, screens + lógica + pedidos del fundador)

---

## 0 · Stack detectado y baseline real (medido, no estimado)

### Stack

| Capa | Tecnología | Estado 2026 |
|---|---|---|
| Frontend | Next.js **15.5.19** (App Router, standalone) + React **19.2.7** (latest) | Moderno |
| SPA Aula | 23 builders `app/lib/scr-*.ts` (string templates + `window.DB`), code-split por pantalla (`screens.ts` LOADERS) | Patrón propio, deliberado y testeado |
| Backend | 61 rutas API (route handlers), sesión HMAC stateless (cookie), hashing `node:crypto` scrypt (cero deps de auth) | Sólido |
| DB | Prisma **6.19.3** dual-schema (SQLite dev / **Postgres 16** prod), 51 modelos, 51 `@@index`, 3 migraciones reales | Sólido |
| Estilos | CSS propio (OTRBRANDBOOK 2026) — **no hay Tailwind** (supuesto de la auditoría que no aplica) | Ligero |
| Infra | Docker (node:22-alpine) → ghcr → VPS único (staging 2.25.205.214), CI GitHub Actions ~3 min | Funcional; deploy hoy **bloqueado por token ghcr vencido** |

### Métricas base (2026-07-17, commit `78a21e4`)

| Métrica | Valor | Target premium | Veredicto |
|---|---|---|---|
| LOC `app/` | 29 943 | — | — |
| Bundle compartido / `/aula` First Load | 103 kB / **182 kB** | ≤150 kB inicial | `/aula` por encima → **Fase 4** |
| Tests | **342 ejecutados** (169 bloques `it()`; `screens.test.ts` expande por rol) | — | Suite sana, CI verde |
| Cobertura de rutas API | **10 de 61** con test | 100 % de rutas de riesgo alto | **Hueco crítico → Fase 5** (dinero: 0 tests) |
| `getAppData` | ~36–45 queries en 7–8 olas secuenciales, por carga **y por cada refresh** (22 call-sites) | ≤25 queries, ≤5 olas | **Fase 3** |
| Deps | 7 prod + 12 dev; react/eslint en latest; 1 CVE high (nodemailer) | 0 CVEs conocidas | **Fase 1** |
| Backups | pg_dump diario **local en el mismo VPS**, uploads sin respaldo, crons fuera de bootstrap | Offsite + restore probado | **Fase 1** |
| Audit trail admin | **Inexistente** (0 modelos, 0 logs en acciones admin) | 100 % acciones atribuibles | **Fase 2** |
| Imágenes | 0 `<img>` en la app, `public/` = 116 kB | — | No invertir (descartado) |

---

## 1 · Auto-crítica — las 10 preguntas, respondidas para el plan completo

1. **¿Problema real?** Sí: plataforma con menores sin audit trail ni backup offsite = riesgo legal/reputacional real; sin circuito de dinero = no factura; 0 tests en rutas de dinero = no se puede activar Stripe con confianza.
2. **¿Mejor solución para EL stack actual?** Cada fase opera sobre lo que existe (builders, queries.ts, scripts del VPS). Cero reescrituras.
3. **¿La infra actual lo soporta?** Sí. Todo corre en el VPS único actual. Lo único nuevo con costo: bucket offsite (~1 USD/mes).
4. **¿Over-engineering?** Lo descartado está en §2 con nombre y apellido.
5. **¿Rompe convenciones del repo?** No: helpers en `app/lib/`, tests con `route-harness.ts`, migraciones duales, contrato de escape intacto.
6. **¿Mejora lo que percibe el usuario?** Fases 3–4 directamente (carga y refresh más rápidos); 1–2 protegen lo que el usuario no ve hasta que falla; 6 completa flujos que hoy terminan en un callejón.
7. **¿Terminable en 2–3 días?** Ninguna tarea individual supera 2.5 días; las fases son lotes de tareas que shippean solas.
8. **¿Deuda nueva?** La única deuda aceptada conscientemente: quedarse en Prisma 6 / Next 15 / TS 5.9 (líneas soportadas) — registrada en §2 con fecha de reevaluación.
9. **¿Ya existe código que hace esto?** Sí, y se reutiliza: el limiter existente (`rate-limit.ts`) se extiende, el patrón de `purge-activity.js` se replica para recordatorios, la forma correcta de la query de notificaciones ya está escrita en `/api/notifications` y se copia a `queries.ts`.
10. **¿Impacto en seguridad/privacidad considerado?** Es el eje: menores primero (Fases 1–2), dinero después (5→7).

---

## 2 · Descartes explícitos (la regla de hierro en acción)

| Descartado | Por qué | Reevaluar cuando |
|---|---|---|
| Microservicios / K8s / service mesh | 1 dev + IA, 1 VPS, monolito modular sano. Complejidad sin problema que resolver | >5 devs o dominios con escala independiente real |
| Redis / cola de mensajes | El limiter en memoria y los jobs por cron bastan al volumen actual | 2º nodo (el limiter en memoria deja de ser global) |
| Reestructura a `features/` | La arquitectura builders + `queries.ts` es deliberada, testeada y productiva; migrarla es riesgo sin beneficio de usuario | Nunca como big-bang; pantalla a pantalla solo si se necesita UX más rica |
| GraphQL / tRPC | 61 rutas REST simples funcionan; no hay problema de over/under-fetching que el split de Fase 3 no resuelva | — |
| pgvector / RAG / AI search | Sin caso de uso validado hoy; necesitaría API key de embeddings | Si el arsenal/búsqueda crece y el fundador lo pide |
| Data warehouse / MLOps / multi-region | Escala fantasía para el volumen actual | — |
| Upgrade Prisma 7 / Next 16 / TS 7 | Líneas actuales soportadas; los saltos son riesgosos (dual-schema, Turbopack, typescript-eslint sin soporte TS7) y **Next 16 ni siquiera corrige el advisory de postcss** | Trimestral (oct 2026); antes si CVE en la línea actual |
| `next/image` | 0 `<img>` en la app, `public/` 116 kB — no hay nada que optimizar | Si entran imágenes de contenido |
| Mutation testing / property-based | Suite aún con huecos básicos (Fase 5 primero) | Cobertura de riesgo alto completa |
| SOC 2 / ISO 27001 | Sin clientes enterprise que lo exijan | Contrato que lo pida. COPPA + Ley 172-13 RD sí aplican y están en Fases 1–2 |

---

## 3 · Qué significa "premium escalable" aquí (estrella norte)

**Premium** = confiable + se siente terminado + cobra dinero:
1. Ninguna acción del usuario termina en un callejón sin salida (Grupo 1 ✅; Fase 6 completa el resto).
2. Errores visibles para nosotros antes de que el usuario se queje (gate + CI ya; logs del VPS).
3. El dinero entra y sale de verdad (Fase 7, al llegar llaves).
4. Los datos de un menor no se pierden ni se tocan sin rastro (Fases 1–2).

**Escalable** = sirve el próximo 10× sin reescritura:
- Hoy: cientos de concurrentes en el VPS actual (stack stateless + Postgres indexado).
- Próximo 10×: camino conocido e incremental (Fase 10) — uploads a objeto, pooling, split de `getAppData`, 2º nodo. Se ejecuta **cuando una métrica lo pida, no antes** (disparadores en §7).

---

## 4 · Las fases

> Convención: **[user]** = requiere acción/llave del fundador; todo lo demás lo ejecuta Opus.
> Cada tarea = 1 commit con gate. P# = prioridad heredada del descubrimiento.

### FASE 1 — Operación blindada (~3.5 días) · sin llaves salvo bucket

*El VPS único es hoy un punto de pérdida total (app + Postgres + backups en el mismo disco) y tiene un DoS de disco abierto.*

| # | Tarea | Evidencia | Esfuerzo |
|---|---|---|---|
| 1.1 | **Backup offsite**: `rclone` a bucket B2/R2 al final de `backup-db.sh` + verificación de subida. **[user: crear bucket, ~15 min, ~1 USD/mes]** | `backup-db.sh:7-8` lo reconoce pendiente | 1 d |
| 1.2 | **Backup del volumen uploads** (`otr_uploads`: tareas, grabaciones) — hoy 0 respaldo; tar incremental + rotación + offsite | `docker-compose.yml:69`, `DEPLOY.md:255` (manual, ruta desactualizada) | 0.5 d |
| 1.3 | **Crons al bootstrap**: backup 03:00 y `vps-pull` viven solo en la crontab manual del VPS — re-provisionar los perdería en silencio. Instalarlos desde `bootstrap-vps.sh` + doc de restore probado | grep crontab en scripts/docs → 0 resultados | 0.5 d |
| 1.4 | **Rate limit donde falta**: `POST /api/uploads` (25 MB/req sin límite = llenar disco → tumba Postgres y backups), `auth/reset` (fuerza bruta de token), `messages`, `forum`, `reviews`, `reports`, `quiz-attempts`. Reusar `app/lib/rate-limit.ts` | `uploads/route.ts:6-8`; grep rateLimit → solo 4 rutas | 1 d |
| 1.5 | **Deps**: nodemailer 8→**9.0.3** (CVE high GHSA-p6gq-j5cr-w38f; hoy no explotable — `mail.ts` nunca usa `raw` — pero se cierra), `npm update` de los 8 minors (incluye `sanitize-html`), `.github/dependabot.yml`, gitleaks como paso de CI | npm audit; `mail.ts:21-23` | 1 d |
| 1.6 | **Anti-lockout** en `PATCH /api/reports` (hoy permite suspender a otro ADMIN; `admin/users` ya tiene la guarda — copiarla) | `reports/route.ts:128-136` vs `admin/users/route.ts:94-100` | 0.25 d |

**Entregable:** pérdida del disco del VPS ≠ pérdida de datos; disco no llenable por un usuario; 0 CVEs conocidas; CVEs futuras avisan solas.

### FASE 2 — Trazabilidad y gobernanza de menores (~3 días) · sin llaves

*Cambiar el rol o suspender la cuenta de un menor hoy no deja rastro de qué admin lo hizo; la moderación se resuelve a ciegas.*

| # | Tarea | Evidencia | Esfuerzo |
|---|---|---|---|
| 2.1 | **Modelo `AuditLog`** (ambos schemas + migración): `{actorId, action, targetType, targetId, detail, createdAt}` + escritura en `admin/users` PATCH (rol/verificación/suspensión), `reports` PATCH (resolución/suspend, incluye `resolvedBy` que hoy no existe), `courses` DELETE | 0 modelos de auditoría en schema; `admin/users/route.ts:105-107` sin log; `Report` sin `resolvedBy` | 1.5 d |
| 2.2 | **Pestaña "Auditoría"** en la consola admin (lista paginada, filtro por actor/acción; patrón `window.__mod`) | — | 0.5 d |
| 2.3 | **Moderación con contexto**: el GET de reports resuelve el contenido reportado (`ChatMessage`/`Conversation`/`Booking`) para que el admin vea QUÉ está moderando, no un `targetId` opaco | `scr-admin.ts:55-88`; `reports/route.ts:49-110` jamás consulta el mensaje | 1 d |

**Entregable:** 100 % de acciones admin atribuibles y visibles; moderación informada. Base de evidencia para COPPA / Ley 172-13 RD.

### FASE 3 — Queries: matar lo muerto, acotar lo infinito (~3 días) · sin llaves

*El pipeline central corre queries cuyo resultado se descarta y carga hasta 10 000 filas de chat por render. Incluye un bug de corrección, no solo de velocidad.*

| # | Tarea | Evidencia | Esfuerzo |
|---|---|---|---|
| 3.1 | **Eliminar las 5 queries muertas** de `getAppData` (corren en cada carga y cada refresh; 2 con includes pesados — una trae Users completos con `passwordHash` a memoria) + las 3 claves muertas del payload (`gradebook`, `chat` — duplica 200 mensajes —, `competencies`) + deduplicar `courseModules`/quiz ×3 | `queries.ts:266-270` («no usado»), `:1833/:1715/:1688`; 0 consumidores en builders | 1 d |
| 3.2 | **Fix Notification (corrección)**: hoy trae las 200 globales sin `where` y filtra por usuario en JS — con más usuarios, las notificaciones propias desaparecen del feed. Copiar la forma ya correcta de `/api/notifications` (where OR + take 30) | `queries.ts:284,:1699` vs `notifications/route.ts:17-21` | 0.5 d |
| 3.3 | **Acotar findMany sin `take`**: `convos` (50×200 = 10 000 filas ChatMessage), `coachProfiles` (500 con packages para todos los roles), `whatsapp/conversations` (todos los mensajes de 100 contactos para derivar el último), `reviews` GET (tabla entera), `myQuizzes`, `gradeCells` | `queries.ts:294-300,:333-340`; `whatsapp/conversations/route.ts:24-28`; `reviews/route.ts:79-85` | 1 d |
| 3.4 | **Índices compuestos** que las queries calientes piden: `Booking @@index([studentId, slotAt])`, `Submission @@index([userId, createdAt])` (ambos schemas + migración) | `schema.prisma:729-731,:480-484` vs usos | 0.5 d |

**Entregable:** `getAppData` ≤25 queries; payload sin duplicados; notificaciones correctas a escala. Medición antes/después en el commit.

### FASE 4 — Bundle y first paint (~2 días) · sin llaves

*El code-split de pantallas funciona, pero i18n lo anula: los 23 diccionarios (~209 kB fuente, ES+EN, todos los roles) viajan en el chunk inicial.*

| # | Tarea | Evidencia | Esfuerzo |
|---|---|---|---|
| 4.1 | **i18n por pantalla**: cada `scr-*.ts` registra su diccionario al cargar su chunk (`Object.assign` al DICT central); estático solo el chrome — como el propio header de `i18n.ts` planteaba. Ajustar `i18n-wiring.test.ts` (y de paso: generar la lista de dicts dinámicamente — hoy es estática y una pantalla nueva no se auto-inscribe) | `i18n.ts:20-42` (23 imports estáticos); `i18n-keys/` = 209 054 bytes | 1.5 d |
| 4.2 | **`COURSE_TEMPLATES` a `import()`** dentro del modal de crear curso (11.6 kB que todos los alumnos descargan) + **`next/font`** para Inter (hoy `<link>` bloqueante a Google Fonts, 5 pesos) | `Aula.tsx:10,:382,:405`; `layout.tsx:16-21` | 0.5 d |

**Entregable:** `/aula` First Load **182 kB → ≤130 kB** (medido en el build del commit); FCP de visita fría mejor sin round-trip a Google Fonts.

### FASE 5 — Red de tests donde duele + helpers (~4 días) · sin llaves

*Solo 10 de 61 rutas tienen test. Las de dinero: cero. No se enchufa Stripe real sin esto.*

| # | Tarea | Riesgo | Esfuerzo |
|---|---|---|---|
| 5.1 | Tests de **dinero**: `checkout`, `stripe/webhook` (firma inválida, evento duplicado, montos), `membership` | **P0** | 1.5 d |
| 5.2 | Tests de **sesión y cuentas**: `auth/login` (credenciales, suspendido, rate limit), `logout`, `forgot`/`reset` (token vencido/reusado), `admin/users` (anti-lockout), `uploads` POST (tipo, tamaño, cuota) | **P0** | 1.5 d |
| 5.3 | Tests de **menores**: `parent-report`, `placement`, `consultations` (+`[id]`, availability), `whatsapp/conversations` | P1 | 1 d* |
| 5.4 | **Helpers anti-duplicación** (con sus tests): `recalcCourseProgress()` (el bloque ya está copiado en **3** rutas — lesson-progress, quiz attempt y submissions desde el Grupo 1), `notify()` (5+ sitios), `requireRole()` (57 comparaciones ad-hoc en 15 rutas) | P1 | 1 d |

\* 5.3 puede solaparse con 5.1–5.2 (archivos distintos).
**Entregable:** todas las rutas de riesgo alto con red; refactor sin cambio de comportamiento (tests lo prueban). Las rutas de contenido (P2, ~5 d) quedan para huecos entre fases.

### FASE 6 — Completar el producto (~6.5 días, 4 tareas independientes) · sin llaves

| # | Tarea | Evidencia | Esfuerzo |
|---|---|---|---|
| 6.1 | **Recordatorios de sesión**: script cron estilo `purge-activity.js` que emaila X horas antes de `Booking`/`ConsultationBooking` respetando la preferencia `session_reminders` — que Settings ya vende y **nada consume** | `scr-settings.ts:17`; grep → 1 sola aparición | 1.5 d |
| 6.2 | **CRUD de torneos** (API + UI admin/coach): hoy los torneos solo existen por seed; cero create/update/delete | `tournaments/route.ts` solo GET+register; `seed.ts:1088+` | 2.5 d |
| 6.3 | **Cursos por admin**: selector de coach en el create (hoy `teacherId = user.id` fijo → el curso queda a nombre del admin), reasignación validada en PATCH, pantalla `manage` visible para ADMIN | `courses/route.ts:36`; `screens.ts:151,154`; nav sin cursos | 1.5 d |
| 6.4 | **Export CSV** (usuarios, inscripciones, bookings) con `?format=csv` + botón en consola admin — hoy 0 export en toda la app | grep csv → solo `window.print` del certificado | 1 d |

**Entregable:** el equipo opera torneos, cursos y datos sin tocar la base a mano.

### FASE 7 — El círculo económico · **BLOQUEADA [user: cuenta Stripe + Connect]**

*Lo único que separa a OTR de facturar. El código simulado ya modela todo (Booking + EscrowTxn HELD→RELEASED/REFUNDED, payout = monto − 18 %).*

1. Checkout real (Payment Intents) sobre el flujo de reserva existente; webhook ya verificado por firma pasa a escribir el estado real del escrow.
2. **Stripe Connect** (Express) para coaches: onboarding desde Coach Workspace, payout real al completar sesión (la lógica RELEASED ya existe; se le conecta la transferencia).
3. Membresía real (Billing) — reemplaza el simulado.
4. `COURSE_SALES_ENABLED=true` cuando 1–3 estén verdes.
5. **Decisión de negocio [user]**: facturación electrónica e-CF (DGII, RD) — si aplica, se cotiza integración aparte; no bloquea 1–4.

Esfuerzo estimado al llegar llaves: **4–5 días** (los tests de Fase 5.1 ya esperan esto).

### FASE 8 — Sala en vivo · **BLOQUEADA [user: elegir y pagar proveedor de video]**

`scr-room.ts` es un placeholder honesto que ya valida reserva/estado/propiedad. Recomendación: **Daily.co** (SDK embebido simple, token por sala, ~99 USD/mes el tier serio; alternativa Cloudflare Calls). Al decidir: room por `Booking` CONFIRMED con token efímero, grabación opcional al volumen de uploads. **4 días.**

### FASE 9 — Comunicaciones activas · **BLOQUEADA [user: 3 llaves]**

| Pieza | Qué falta de ti | Qué pasa al conectarla |
|---|---|---|
| **Token ghcr** (PAT `read:packages` + `docker login` en el VPS) | 5 min | **Todo lo mergeado desde `37ad8e5` baja a staging** — es el desbloqueador nº 1 de valor |
| SMTP real | cuenta (p. ej. Resend/Postmark) | Emails de reserva/COPPA/reset salen de verdad; recordatorios de 6.1 cobran vida |
| WhatsApp Meta (app secret + phone id + token) | ~30 min en Meta Business | La bandeja del equipo (ya desplegada en código) recibe y responde con el (809) 292-0939 |
| NSDA `api_auth_nsda` (opcional) | pedir a NSDA | Historial personal de torneos en Tabroom |

### FASE 10 — Escala 10× · **CONDICIONAL (no ejecutar sin disparador)**

| Cambio | Disparador que lo activa |
|---|---|
| Revocación de sesión server-side (jti + store) — hoy logout no invalida el token 30 días | Incidente de sesión, o antes de dinero real (junto a Fase 7) |
| Split de `getAppData` por pantalla + caché | p95 de `/api/app-data` > 600 ms sostenido, o > 300 usuarios activos/día |
| Uploads → R2/S3 | Disco VPS > 70 %, o necesidad de 2º nodo |
| PgBouncer | Conexiones Postgres > 60 % del máximo |
| 2º nodo + LB (exige lo anterior + limiter compartido) | CPU sostenida > 70 % con lo anterior hecho |
| Contraseña mínima 8+ + lista de comunes; magic bytes en uploads | Con Fase 7 (antes de dinero real) |

---

## 5 · Lo que solo tú puedes hacer (lista completa, con tiempos)

| Acción | Tiempo | Desbloquea |
|---|---|---|
| **Renovar token ghcr** y `docker login` en el VPS | 5 min | Deploy de TODO lo hecho desde el 14-jul (WhatsApp, Grupo 1, y cada fase futura) |
| Crear bucket B2/R2 para backups | 15 min (~1 USD/mes) | Fase 1.1 (offsite real) |
| Cuenta Stripe + activar Connect | 1–2 h + verificación | Fase 7 — facturar |
| Elegir proveedor de video (recomiendo Daily) | decisión + tarjeta | Fase 8 — sala en vivo |
| Cuenta SMTP (Resend/Postmark) | 20 min | Emails reales + recordatorios |
| Credenciales WhatsApp en Meta Business | 30 min | Bandeja del equipo activa |
| Decisión e-CF DGII (¿aplica facturación electrónica?) | conversación | Alcance final de Fase 7 |

---

## 6 · Riesgos y mitigaciones

| Riesgo | Prob. | Impacto | Mitigación |
|---|---|---|---|
| Pérdida del disco del VPS único | Media | **Total** (datos de menores incluidos) | Fase 1.1–1.2 la neutraliza; hasta entonces es el riesgo nº 1 del proyecto |
| Deploy bloqueado se olvida y staging diverge semanas de `main` | Alta (ya ocurre) | Medio | Acción de 5 min del fundador (§5); el plan lo repite en cada entrega |
| Migraciones duales divergen (SQLite/Postgres) | Baja | Alto | Regla vigente: cada cambio toca ambos schemas + `prisma validate ×2` en CI (ya activo) |
| Activar Stripe sin red de tests | — | Alto | Fase 5.1 es **prerrequisito duro** de Fase 7 (orden del plan lo fuerza) |
| Refactors de Fase 3/5.4 cambian comportamiento | Media | Medio | Tests antes del refactor (5.4 incluye los suyos); gate por commit; medición antes/después |
| Un agente ejecutor reporta "hecho" sin estarlo | Media | Medio | Protocolo vigente: verificación línea a línea + gate independiente por el supervisor antes de commitear |

---

## 7 · Métricas de éxito y cadencia

| Métrica | Hoy | Objetivo | Se mide en |
|---|---|---|---|
| CVEs conocidas en deps | 1 high | 0 | Fase 1 (y dependabot después) |
| RPO de datos | ∞ (disco único) | ≤24 h offsite, restore probado | Fase 1 |
| Acciones admin con rastro | 0 % | 100 % | Fase 2 |
| Queries por carga de `getAppData` | 36–45 | ≤25 | Fase 3 |
| First Load `/aula` | 182 kB | ≤130 kB | Fase 4 |
| Rutas de riesgo alto con test | ~10/24 | 24/24 | Fase 5 |
| Flujos sin callejón sin salida | Grupo 1 ✅ | + torneos, cursos admin, recordatorios | Fase 6 |
| Ingresos reales posibles | No | Sí | Fase 7 (llaves) |

**Cadencia:** al cerrar cada fase → commit(s) con gate + push a `main` (CI valida) + resumen al fundador con métricas antes/después. Reevaluación del plan completo al cerrar Fase 6 o al llegar las llaves de Stripe (lo que ocurra primero).

## 8 · Cronograma (trabajo de Opus, sin llaves)

| Semana | Fases | Días-esfuerzo |
|---|---|---|
| 1 | F1 (operación) + F2 (gobernanza) | ~6.5 |
| 2 | F3 (queries) + F4 (bundle) | ~5 |
| 3 | F5 (tests + helpers) | ~4 |
| 4 | F6 (producto) + colchón | ~6.5 |
| Al llegar llaves | F7 → F8 → F9 se intercalan con prioridad sobre lo pendiente | 4–5 + 4 |

**Total sin llaves: ~22 días-esfuerzo en 4 semanas.** Con las llaves de §5, OTR queda **100 % funcional como negocio**: cobra, paga a coaches, da clase en vivo, avisa por email/WhatsApp, con backups, auditoría y tests donde duele.
