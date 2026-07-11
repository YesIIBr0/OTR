# Plan de ejecución — post-llamada Isaac (auditado 2026-07-11)

> Auditoría multi-agente contra `main@7ed2ffa` (desplegado en staging). Cada ítem de la
> llamada fue verificado en código con evidencia file:line. Este plan está escrito para
> ejecutarse con **Sonnet 5**: tareas autocontenidas, con ubicación exacta y criterio de
> aceptación. Reglas de la casa: i18n ES/EN simétrico (test-enforced), contrato de escape
> (queries.ts escapa UNA vez, builders renderizan crudo), schema dual (editar los DOS),
> gate antes de push (tsc + vitest + build), push a main = deploy automático a staging.

## Estado de la llamada — resumen

**HECHO y verificado (16/26):** consolidación Aprender+Marketplace+Reservas (shell.ts:30-35),
cursos activos + "Buscar nuevos" (scr-core.ts:569-608), membresía fuera de cursos (shell.ts:36-40),
catálogo con video de bienvenida + estrellas + overview (scr-extra.ts:193-237), tabs del Debate Hub
= resumen/mis debates/práctica/leaderboard sin analíticas ni torneos (scr-debate.ts:28-33),
KPIs positivos sin derrotas (scr-debate.ts:189-194), "Próximo torneo" (scr-debate.ts:212-227),
historial completo, práctica con drills-placeholder + finder de rivales, coach registra/aprueba
debates (solicitud+cola), shine en "tu posición", torneos no duplicados, OTR Pro (Free/Pro/Elite),
placement saltable al primer login, parent portal completo, admin completo.

**BLOQUEADO externo (2):** NSDA Fase-2 (historial personal — requiere `api_auth_nsda` de NSDA),
video en vivo en la sala (requiere credenciales Cloudflare Stream/Daily del fundador).

**PARCIAL → este plan (8):** ver olas abajo.

---

## OLA 1 — Quick wins de la llamada ✅ COMPLETADA (2026-07-11, commit e6affe1, verificada E2E en staging)

### T1. i18n: hardcodeos ES visibles en EN (los que Isaac vio)
- `app/lib/scr-profile.ts:116` — `${streak} días` → key `profile.streakDays` con `{n}`.
- `app/lib/scr-profile.ts:143` — `${got} de ${DB.badges.length} insignias · sigue ganando…` → key con `{got}/{total}`.
- `app/lib/scr-profile.ts:325` — `${me.streak} días` + `toLocaleString('es')` → usar lang activo.
- `app/lib/scr-profile.ts:72,108` y `app/lib/scr-placement.ts:17-21,48` — nombres de skill
  ('Confianza/Estructura/Evidencia/Refutación/Cross-ex/Delivery') renderizados crudos →
  reutilizar los keys `aula.skill*` que YA existen (Aula.tsx:834 los mapea).
- `app/lib/scr-marketplace.ts:377` — fallback `"Hijo/a"` → key.
- `app/lib/scr-teacher.ts:664` — toast `· ¡${d.tierAfter}!` → key.
- `app/lib/scr-learn.ts:661` muestra `r.score` crudo cuya fuente es `queries.ts:564 "En revisión"` → ver T5.
**Aceptación:** grep de esos literales = 0 en builders; tests i18n verdes; toggle EN sin ES visible en profile/placement.

### T2. Copy "claudito" (pedido explícito de Isaac, 7:07-7:26)
Reescribir en tono directo no-paternalista (ES y EN simétricos):
- `core.courseEmptyTitle` ("Tu entrenamiento empieza aquí", i18n-keys/core.ts:112) → p.ej. "Elige tu primer programa".
- `settings.notifMarketplaceDesc` ("…recomendaciones para ti", settings.ts:39) → sin "para ti".
- `core.coursesEyebrow`, `core.yourProgress` (core.ts:40,139), `profile.yourProgress` (profile.ts:13),
  `settings.notifWeeklyDesc` (settings.ts:35) — quitar "Tu progreso" como muletilla; usar el nombre
  de la cosa ("Programas", "Racha y niveles", etc.).
**Aceptación:** grep "empieza aquí|para ti|Tu progreso" en i18n-keys = 0 user-facing.

### T3. Eventos: torneos como lo principal (llamada 7:54-8:21)
`app/lib/scr-events.ts:57-71` — hoy eventos va primero y torneos segundo con CTA `btn-soft btn-sm`.
- Invertir orden: torneos PRIMERO (--d:0), eventos después.
- CTA de inscripción del torneo destacado: `btn-primary` (mantener idempotencia del POST /api/tournaments).
- El primer torneo puede ir como tarjeta grande/hero ("el botón más grande" que pidió Isaac).
**Aceptación:** captura de staging con torneos arriba; inscripción sigue funcionando (sello "Inscrito").

### T4. Deuda del flujo de debate (3 hallazgos abiertos del review adversarial)
- (a) `app/lib/scr-debate.ts:529,564` envía `comments` top-level pero `app/api/debates/route.ts:55-75`
  no lo lee y el ballot solo persiste si `adjudicated && scores.length` → persistir el comentario del
  alumno (aceptar `body.comments` → Ballot.comments, o campo en DebateRecord; ballot sin scores es válido).
- (c) `scr-debate.ts:543-568` onOk no refetchea: tras POST exitoso, refetch `/api/app-data` y actualizar
  `DB.debate` antes de `repaint()` (patrón softRefresh de scr-teacher.ts:17-28), o insertar optimista.
- (d) `queries.ts:737-751` debateHistory no expone `status/rejectionReason` → añadir
  `status: rejectedAt ? "rejected" : adjudicated ? "approved" : "pending"` + `rejectionReason: esc(...)`
  (escapar AQUÍ, una vez) y pintar badge Pendiente/Rechazada en `viewHistory` (scr-debate.ts:253-277)
  con motivo visible. Residual (b): en `app/api/debates/[id]/route.ts:78-96`, mover el check de estado
  dentro de la tx con `updateMany({ where: { id, adjudicated: false, rejectedAt: null } })` y verificar
  count=1 — cierra la carrera approve-vs-reject.
**Aceptación:** E2E: solicitar → aparece "Pendiente" sin recargar; rechazar → badge "Rechazada" + motivo;
comentario del alumno visible para el coach; doble-click en aprobar+rechazar no corrompe estado.

## OLA 2 — i18n capa servidor (el grueso de "se quedó en español")

### T5. queries.ts manda ES fijo al cliente
- `queries.ts:23-29` tiempos relativos "hace X días" → devolver `{n, unit}` o key+params y formatear
  en el builder con `t()`; o computar según `lang` (queries ya recibe el request/cookie).
- `queries.ts:1035` `WEEKDAYS_ES` → según lang.
- `queries.ts:564` `"En revisión"` → key (`learn.inReview`) resuelta en builder.
- `queries.ts:1384` minorNote → key.
**Aceptación:** con cookie `otr_lang=en`, el feed de actividad, días de agenda y estados salen en EN.

### T6. Errores de API como toasts (~118 strings ES)
Pragmático en dos pasos: (1) inventario de los ~20 endpoints que la UI llama con más frecuencia
(login, register, bookings, debates, enrollments, profile) → devolver además un `code` estable;
(2) en `Aula.tsx apiErrorMsg`, mapear `code`→key i18n con fallback al mensaje del servidor.
No tocar los 118 de golpe; cubrir el top-20 visible.
**Aceptación:** en EN, los toasts de error de esos flujos salen en inglés.

## OLA 3 — Vibrancy (llamada 7:31-7:46: "menos sobrio, más dinámico")

### T7. Extender el tratamiento vivo
Hoy: `.otr-shine` solo en leaderboard; `sky--alive` y `hello-card` en core/debate/hub/placement/lifetime;
sparkline solo en lifetime. Pantallas planas: settings, room, mybookings, events, community, arsenal;
KPIs planos en teacher(16)/coachwork(9)/admin(12)/learn(6).
- Variante `C.kpi(..., {hero:true})` con gradiente suave verde/oro + número grande (reusar tokens).
- Aplicar hero al KPI principal de teacher (alumnos activos), coachwork (ingresos), learn (progreso).
- `hello-card` o franja con gradiente en events y mybookings.
- NO tocar: reduced-motion (el shine ya lo respeta), contraste AA (usar --otr-green-text para texto).
**Aceptación:** capturas antes/después de teacher/learn/events; sin regresión AA (contrast-check).

## OLA 4 — Dashboard redesign (Isaac: "para el FINAL")

### T8. Blueprint §6/§8: jerarquía del Home
- Crear variantes `kpi--hero` / `kpi--default` / `kpi--task` (solo existe propuesta en
  DESIGN_BLUEPRINT_2026-06.md:121; app.css:220-224 tiene .kpi base plano).
- Home student: 1-2 métricas hero (XP/rating con delta) en vez de 4 tiles iguales de 33px.
- Mantener coach-reco + active-courses (ya entregados).
**Hacerlo ÚLTIMO** (pedido explícito de Isaac 0:11-0:17). Revisar con captura antes de push.

## OLA 5 — COPPA/legal (requiere 1 decisión de producto)

### T9. Cierre de gaps COPPA
- Banda `<13` en ageBand (register/route.ts:54 hoy solo minor/adult) + flujo de consentimiento
  verificable previo para <13 (email-plus al tutor).
- Modelo `ConsentRecord` (quién/cuándo/qué versión de política) en AMBOS schemas.
- `Guardianship @default("ACTIVE")` → `PENDING` en schema (los flujos ya lo fuerzan explícito;
  es footgun-proofing) — migración segura.
- Job de purga/retención de ActivityEvent (no existe ninguno).
**Decisión de Wilser/Isaac antes de codificar:** ¿bloquear registro <13 hasta consentimiento, o
permitir cuenta limitada? (COPPA exige consentimiento verificable ANTES de recolectar datos).

## Bloqueados — acciones de Isaac/Wilser, no de código
1. **NSDA Fase-2**: solicitar `api_auth_nsda` institucional a NSDA (o OAuth del alumno en Tabroom).
2. **Video en vivo**: credenciales Cloudflare Stream o Daily → activa sala + grabación de práctica.
3. **Stripe/SMTP**: llaves reales → pagos de cursos de pago + emails salientes.
4. **Contenido**: cursos reales de los profesores (el builder ya funciona; PF-FUND-2026 es demo).

## Orden recomendado de ejecución (Sonnet 5)
1 sesión = 1 ola, con gate (tsc+vitest+build) y push al final de cada una (deploy automático).
Ola 1 → Ola 2 → Ola 3 → (decisión COPPA) → Ola 5 → Ola 4 (dashboard al FINAL, como pidió Isaac).
