# Behavioral Capture — OTR Aula (live, in-browser)

Captured live via Preview MCP against `npm run dev` (port 3000). All four roles
swept. **Render health: every screen in every role renders with ZERO console
errors and zero thrown exceptions.** This is the behavioral ground truth the
analysis lenses build on.

## Screen → source file map (where fixes land)
Routes are registered in `app/lib/screens.ts`; each screen key resolves to an `S.<key>`
HTML-string builder in one of these `app/lib/scr-*.ts` files. SPA engine: `app/components/Aula.tsx`. Nav/shell: `app/lib/shell.ts`. Styles: `app/styles/{tokens,app,screens,responsive}.css`.

| Cluster | File | Screens |
|---|---|---|
| Core/dashboard/learn | `scr-core.ts`, `scr-learn.ts` | dashboard, catalog, course, courseIndex, lesson, assignment, quiz, quizResults, progress, badges, grades, search |
| Debate Hub (flagship) | `scr-debate.ts` | debateHub |
| Marketplace | `scr-marketplace.ts` | marketplace/explore, coach profile |
| Lifetime + Membership | `scr-lifetime.ts` | lifetimeProfile, membership |
| Coach supply-side | `scr-teacher.ts`, `scr-coachwork.ts` | teacher, participants, manage, courseBuilder, coachwork |
| Parent | `scr-parent.ts` | parentPortal |
| Admin | `scr-admin.ts`, `scr-admin-users.ts` | adminConsole, adminUsers |
| Profile | `scr-profile.ts` | profile, coach |
| Misc | `scr-mybookings.ts`, `scr-placement.ts`, `scr-settings.ts`, `scr-events.ts`, `scr-room.ts`, `scr-certificate.ts`, `scr-extra.ts` | myBookings, placement, settings, events, room, certificate, messages, onboarding |
| OFF (no route) | `scr-hub.ts`, `scr-community.ts`, `scr-arsenal.ts` | hub, forum, arsenal (intentionally disabled per PRD) |

## Per-role render health (all screens, 0 console errors)
- **Student** (`analia.reyes@otr.do`): 26 routes swept — dashboard, catalog, course, course-index, lesson, assignment, quiz, quiz-results, player, progress, badges, grades, lifetime, profile, messages, explore, my-bookings, membership, room, events, debate, settings, placement, onboarding, certificate, search. All render. Expected empty states: quiz-results (no attempt), room (no active session), placement (already placed).
- **Coach** (`saul@otr.do`, role Profesor): dashboard, teacher (Seguimiento del grupo — KPIs + roster table), coachwork (Reservas e ingresos — Agenda/Ingresos/Disponibilidad tabs), manage (Mis cursos), course-builder (Constructor de curso), participants (roster table), explore, messages, profile, settings. All render.
- **Parent** (`rosa.fermin@otr.do`, role Familia): parent (Portal de familia — child card Diego Fermín + KPIs + approval queue + notifications rail), dashboard, explore, messages, membership (OTR Free), settings, profile. All render.
- **Admin** (`admin@otr.do`, role Administración): admin (Consola de moderación — 2 KPIs + moderation queue, intentionally lean), admin-users (Gestión de usuarios), dashboard, explore, debate, settings, profile. All render.

## CONFIRMED BUGS (seen rendering live)
1. **Systemic `&amp;` double-escape** — any name containing `&` renders the literal entity `&amp;` to the user instead of `&`. Observed on: course "Oratoria **&amp;** Speaking" (catalog card + course switcher tabs), coach specialty "Lincoln-Douglas **&amp;** Policy" (marketplace card). Root cause class: a value that is already HTML-escaped gets escaped again when interpolated into the screen template (prior art: the leaderboard double-escape fixed in commit a062cd5). Affects catalog, course tabs, marketplace, and likely anywhere course/coach names render. **HIGH — user-visible correctness defect on primary surfaces.**
2. **Login hydration mismatch** — `Auth` component's `.lb-wave` audio-bars (`app/lib/shell.ts` login render) emit different `height`/`animation-delay` values on server vs client (server truncates to 4 decimals + `0.6s`; client emits full precision + `0.60s`), producing a React hydration error on every login page load. `suppressHydrationWarning` is on `<html>`/`<body>` but not the wave bars. **MEDIUM — console error on first paint, the literal first screen every user sees.**

## Visual / UX observations (from live capture)
- **Design language is mature and consistent**: cream canvas, dark sidebar, green action accents, gold for achievement; consistent card/KPI/hero/right-rail patterns across all roles. Dashboard, lesson, debate hub, marketplace all read as premium.
- **Dashboard (student)**: strong "TU SIGUIENTE PASO" hero + 4 KPI cards + RADAR OTR skill bars + right rail (próximas sesiones / debate rank / logros). High info density, clear primary CTA ("Continuar lección").
- **Lesson**: excellent long-form hierarchy, "Regla OTR" callout, in-lesson TOC, completion checkbox. Only nav out is "Volver al curso" (no "next lesson" CTA — flow note).
- **Mobile (390px)**: hero/stat/tabbar adapt well. Notes: (a) the 4 KPI cards are very tall — heavy vertical scroll for 4 simple numbers (candidate for 2×2 grid); (b) coach topbar "+ Crear" truncates to "Crea"; (c) a floating circular avatar overlaps the bottom tab bar.
- **Admin console**: intentionally minimal (2 KPIs + queue) — verify it is "lean by design" vs "under-built" against PRD §3.3.

## Environment note (NOT a product bug)
A stale `.next` dev cache produced `Cannot find module './4996.js'` 500s on every login mid-session; cleared with `rm -rf .next` + restart. Excluded from findings.
