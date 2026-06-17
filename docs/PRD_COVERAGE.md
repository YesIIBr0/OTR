# OTR Academy — Cobertura PRD ↔ Site (artefacto canónico de seguimiento)

**Fecha:** 2026-06-16 · **Fuente de verdad:** el *Founder Build Spec* (PRD v1.0) + el *Brand Book de Contenido 2026*.
Este documento mapea CADA sección del PRD a su estado en el código y registra qué se eliminó por no estar en el PRD.

> ⚠️ **REGLA CRÍTICA — leer antes de "borrar lo que no está en el PRD":** varias pantallas están **APAGADAS** en el código (sin ruta en `screens.ts`) pero **SÍ están en el PRD como roadmap (Fase 2/3)** — NO son "sobra", NO se borran: foro/community (§10), arsenal/motion-library (§6.4), certificaciones (§6.6/§8.4). Borrarlas destruye features futuras. Lo único realmente fuera del PRD ya se eliminó (ver §"Eliminado").

Leyenda: **✓** construido · **◐** parcial / apagado-pero-en-PRD (roadmap) · **✗** falta.

## §3.1 — Mapa top-level del PRD (IA)

| Sección PRD | Estado | Notas |
|---|---|---|
| 🏠 Dashboard | ✓ | next-action, skill snapshot, upcoming, debate rank, achievements, opportunities, leaderboard strip |
| 🎓 Learn (Courses / My Learning / Certifications) | ✓ | catálogo, curso/lección/examen/entrega, certificado emitible (LEARN-1) |
| 🎙️ Debate Hub | ✓ | rating **Glicko-2 que se mueve** vía ballots adjudicados coach→alumno (DEBATE-1/2), historial, práctica, leaderboard, analytics, torneos (registro) |
| 🛒 Marketplace | ✓ | browse/search, perfil de coach (video/paquetes/reviews), reserva + escrow, mis reservas (cancelar), mensajes |
| 📈 Progress Center (Skill Graph / Timeline / Achievements / Public Profile) | ✓ / ◐ | skill graph + timeline + logros ✓; perfil público `/p/[slug]` ◐ |
| 👥 Community (clubs, discussion boards, mentorship) | ◐ | código existe **apagado** — PRD §10 = **Fase 3** |
| 📅 Events | ✓ | seminarios/sesiones en vivo (EventItem) + torneos; inscripción vive en el Debate Hub (DRY) |
| 🏆 Leaderboards | ✓ | dentro del Debate Hub (cohort/region/season) |
| 🛡️ Parent Portal | ✓ | progreso, asistencia, logros, próximas, reporte mensual, billing, consentimiento, cancelar reserva |
| 🧑‍🏫 Coach Workspace | ✓ / ◐ | perfil, disponibilidad, inbox, **rúbrica/ballot ✓**, ingresos; payout ◐ (necesita Stripe) |
| ⚙️ Settings | ✓ | cuenta, idioma ES/EN persistente, notificaciones, membresía, privacidad/consentimiento, logout |

**Trust & Safety (§7.4):** ✓ verificación de coach, consentimiento parental, mensajería interna, escrow, reportes + moderación + suspensión, filtro de contacto, reviews verified-booking-only.
**Gamificación (§9):** ◐ XP/niveles/rachas/badges ✓; seasons/challenges/streak-freeze ✗ (Fase 2).
**Monetización (§13):** ✓ membresía (Free/Pro) + comisión de marketplace (escrow 18%) + coaching; ✗ certs-pagadas, tournament-fees, B2B (Fase 2-3).

## Eliminado (en el site, NO en el PRD)
- **`scr-kit`** (playground interno de diseño) — removido.
- **`gradebook`** (matriz de notas) — removido; el PRD §6.5 define el feedback como **ballots/rúbricas**, no una matriz.
- `/consulta` (funnel "Reserva tu consulta gratis") **se conserva**: lo enlaza el landing congelado (top-of-funnel, §18 GHL-adjacent).

## Wave-3 — cierre de Fase 1 (auditoría UX de 68 hallazgos, reconciliada vs. código actual)
Triage multi-agente de `docs/ux-audit/PRIORITY_MATRIX.md` contra el código de hoy: **33 ya estaban resueltos** en olas previas, **~35 abiertos cerrados** en esta ola, el resto son refactors arquitectónicos diferidos (abajo). Cerrados:
- **Visual/a11y:** VIS-05 (azul del rebrand fuera), VIS-06 (pesos), VIS-07 (tamaños mínimos), VIS-08 (crema de marca), A11Y-08 (verde accesible en login).
- **Navegación:** NAV-04 (migas navegables), NAV-06 (tabbar admin), NAV-08 (membresía en nav del padre).
- **Sala de sesión:** NAV-07/COG-06/FLW-04/CNV-04 (pantalla `room` real; el botón "Unirse" ya entrega el servicio).
- **Admin/escala:** ENT-01 (cola de moderación acotada+paginada), ENT-02 (usuarios paginados + KPIs reales), ENT-04 (filtro por rol), ENT-06 (búsqueda en el roster), ENT-08 (inbox del coach acotado).
- **Autoría/coach:** FE-03 (doble-escape), PRD-01 (Enter-enviar), PRD-02 (calificación en lote), PRD-04 (duplicar pregunta), FLW-08 (preview de plantilla), UIC-03 (cambiar contraseña).
- **Alumno/copy:** FLW-07 (avance confirmado), COG-04 (métodos de entrega), UIC-10 (deshacer completada), COG-07 (limpiar filtros), CNV-05 (CTA de gamificación), CNT-03/CNT-06/COG-09/UIC-07/FLW-09/FE-05 (microcopy).
- **Arquitectura ATACADA (ronda "más rápido/premium"):** ✅ FE-01 (refresh preserva scroll/foco — el gran win de fluidez; no es render incremental completo pero elimina el salto), ✅ BE-03 (eliminado el doble lookup de User en getAppData — más rápido por request), ✅ ENT-07 (techo 100→500: sin cliff de coaches; cursor server-side real, futuro), ✅ ENT-08 (inbox del coach acotado + totales por agregación), ✅ doble-escape del leaderboard, ✅ eventos con `startsAt` (fecha viva derivada).
- **Diferidos con razón concreta (cramear = regresión, NO "bueno"):** FE-02 (trocear Aula.tsx — refactor mayor del dispatcher de toda la app, alto riesgo cross-feature) **sigue diferido** (la auditoría confirma: va después de tener tests). PRD-03 (reorder por flechas — el drag&drop ya es fluido) diferido por bajo valor. **CERRADOS el 17 jun** (ver sección de la pasada multi-agente abajo): FE-04, PRD-05, ENT-03 (client-side, sin backfill), BE-04.

## Backlog restante (del PRD, por construir — nada es "sobra")
- **Fase 2:** gamificación completa (seasons/challenges/streak-freeze), certificaciones pagadas, torneos hosted con brackets/matchmaking, analytics profundo, app nativa, perfil público compartible, tier Elite.
- **Fase 3:** Community a full (clubs/mentorship/discussion boards), B2B/institucional, multi-categoría marketplace.
- **Fase 4:** capa de IA (drills/sparring), red de credenciales, expansión internacional.

## Rectificaciones de conformidad PDF (auditoría de lógica — 10/10 aplicadas)
Desvíos donde la lógica no cortaba al PDF (no faltaban features; la regla estaba mal). Todos corregidos:
- **§11.3 MINORS-CONSENT-01:** la tutela que un menor afirma al registrarse nace `PENDING` (el adulto la confirma vía `POST /api/guardianship`), no `ACTIVE` por su sola palabra.
- **§11.3 MINORS-CONSENT-02:** `Guardianship.consentLevel` default `full`→`standard` (aprobar cada reserva); vocabulario `full|standard|progress_only` reconciliado en API y schema.
- **§7.4 BOOKING-ESCROW-1:** la `EscrowTxn` HELD nace solo al CONFIRMAR; un booking PENDING de un menor no retiene fondos (se crea al aprobar el tutor). `Booking.priceCents` guarda el snapshot.
- **§6.2 RATING-1:** PF/Policy/Parli 2v2 → `DebateRecord.partnerUserId`; al adjudicar, el rating del compañero también se mueve (selector en el modal de adjudicación).
- **§6.2 RATING-2:** Speaker Rating separado del W/L (`User.speakerAvg`/`speakerRounds`, media de la rúbrica×10 por ronda juzgada); visible en el Debate Hub.
- **§9 GAMIFICATION-1:** `User.leaderboardOptIn` (opt-out por usuario, toggle en Ajustes); menores fuera del ranking global SIEMPRE.
- **§9 GAMIFICATION-2:** racha real y no predatoria, derivada del ledger con grace de 1 día (antes era un contador estático en 0).
- **§17.3 I18N-2:** `Module.titleEn` + `pickLang` en el render a alumno (CONTENIDO). **+ 17 jun: i18n EN de las PANTALLAS** — las 21 `scr-*.ts` envuelven sus strings estáticos en `t("<prefijo>.<key>")`; 1356 claves con ES+EN (simetría 100%) en `app/lib/i18n-keys/*.ts`, fusionadas en el `DICT` de `app/lib/i18n.ts`. Las cadenas con interpolación `${…}` quedan en ES (riesgo de romper template literals); el toggle ES/EN del topbar ya repinta todo.
- **§4 DASHBOARD-ACCESS-1:** cada recomendación explica POR QUÉ se sugiere.
- **§4 DASHBOARD-ACCESS-2:** ciclo de vida (new/active/returning/lapsed) que adapta el saludo del dashboard.

## Bloqueadores de lanzamiento (requieren credenciales del fundador, no código)
- **Sala de video real** (Daily / Cloudflare Stream) → `BOOKING-4`, `COACH-03`.
- **SMTP** (reset de contraseña, reportes por correo).
- **Stripe real** (escrow/payouts) → `COACH-06`.
- Dominio oficial + textos legales.

## Pasada de conformidad multi-agente (17 jun 2026)
Auditoría adversarial (un agente por área del §3.1, verificada por un segundo agente) **contra el código vivo** porque este ledger había **sobre-declarado** (marcaba marketplace y sala de video listos cuando estaban rotos/ausentes). Resultado: **26 huecos construibles confirmados**, todos cerrados salvo FE-02 (diferido por diseño). Por severidad:
- **ALTOS (features rotas):** (1) las reseñas de coach no renderizaban (la API devolvía `reviews` como clave hermana y el cliente la descartaba + nombres de campo no calzaban) → arreglado en `scr-marketplace.ts` + `normReview`. (2) Imposible reseñar a un coach tras una sesión (la cadena moría: `Review.courseId` era obligatorio) → `Review.courseId` nullable + path coach en `POST /api/reviews` + CTA "Dejar reseña" en Mis reservas (`canReview`). (3) Tutelas PENDIENTES invisibles en el Portal de Padres (núcleo de MINORS-CONSENT-01) → `queries.ts` carga PENDING + bloque "Solicitudes pendientes" con confirmar. (4) Bajar el umbral de aprobación del menor NO bajaba `consentLevel` (seguía auto-confirmando) → el PATCH ahora **siempre** envía `consentLevel`. (5) Sin UI de reporte → botón "Reportar" en perfil de coach (targetType coach, por `coachProfile.id`) y en el hilo de mensajes (targetType conversation).
- **MEDIOS/BAJOS:** recoWhy por formatos inscritos; saludo lifecycle "returning"; link de grabación (coach adjunta / alumno-padre ve, `recordingUrl` proyectado); "Enviar mensaje" inicia conversación (`POST /api/conversations` find-or-create + deep-link por índice); búsqueda **acento-insensible** client-side (`app/lib/text.ts` `norm`/`matches`) en marketplace/roster/tabla/catálogo/global (ENT-03 sin backfill); KPI de debate sobre rondas **adjudicadas** (no auto-reportes); banner de examen + tarjeta de entrega estables al cambiar idioma (`titleEs` + `Submission.lessonId`); timeline público solo hitos reales (whitelist `MILESTONE_ACTIVITY_TYPES`); default `consentLevel` seguro en cliente; coachwork con botón al editor; prefs de notificación persisten (`User.notificationPrefs` + `/api/profile`); **FE-04** (createLink vía Range, sin `execCommand`); **PRD-05** (Panel↔Builder consolidado, sin árbol duplicado); copy suavizado (reporte por correo, crecimiento mensual sin respaldo).
- **Schema (ambos en sync):** `Review.courseId` nullable, `Submission.lessonId`, `User.notificationPrefs` — aditivo/nullable, `prisma db push` los aplica sin migración destructiva.
- **BE-04 (tests):** Vitest en `tests/` — escaping contract (`esc`), búsqueda acento-insensible (`text`), tiers/movimiento de Glicko-2. `npm test` (14 casos). `tsc` + `next build` verdes.
- **i18n EN de pantallas:** ver §17.3 arriba (1356 claves, 21 pantallas).
- **Bloqueado por credenciales (no construible):** envío del reporte mensual por correo (SMTP). **Diferido Fase 2-4:** delta de habilidades mes-a-mes (necesita modelo de snapshots) — el copy ya no lo promete.

---

*El Phase-1 MVP del PRD está funcionalmente completo y, tras la pasada del 17 jun, reconciliado con el código vivo (sin sobre-declaración). Resta: FE-02 (refactor diferido), Fases 2-4 (roadmap) y los bloqueadores de credenciales (SMTP, video en vivo, Stripe, dominio/legal).*
