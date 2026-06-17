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
- **Diferidos (refactor arquitectónico riesgoso, NO "de golpe"):** FE-01 (render incremental), FE-02 (trocear Aula.tsx), FE-04 (reemplazar execCommand), BE-03 (aplanar getAppData), BE-04 (suite de tests), ENT-07 (paginación server del marketplace), ENT-03 (búsqueda acento-insensible), PRD-03 (reorder optimista por flechas — el drag&drop ya es fluido), PRD-05 (consolidar Panel↔Builder). Cada uno merece su propio esfuerzo enfocado.

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
- **§17.3 I18N-2:** `Module.titleEn` + `pickLang` en el render a alumno.
- **§4 DASHBOARD-ACCESS-1:** cada recomendación explica POR QUÉ se sugiere.
- **§4 DASHBOARD-ACCESS-2:** ciclo de vida (new/active/returning/lapsed) que adapta el saludo del dashboard.

## Bloqueadores de lanzamiento (requieren credenciales del fundador, no código)
- **Sala de video real** (Daily / Cloudflare Stream) → `BOOKING-4`, `COACH-03`.
- **SMTP** (reset de contraseña, reportes por correo).
- **Stripe real** (escrow/payouts) → `COACH-06`.
- Dominio oficial + textos legales.

---

*El Phase-1 MVP del PRD está funcionalmente completo. El §3.1 (IA top-level) está íntegro en el site. Lo que resta es backlog de pulido + Fases 2-4 (roadmap) + los 3 bloqueadores de credenciales.*
