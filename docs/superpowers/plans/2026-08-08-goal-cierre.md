# Cierre de la campaña GOAL 2026-08 — Plan de ejecución

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Terminar todo lo que quedó pendiente de la sesión anterior (campaña "modo GOAL"): completar los 3 diagnósticos truncados, arreglar los 10 defectos ya inventariados + los que salgan, pasar el gate completo y desplegar al VPS (2.25.205.214) con verificación en producción.

**Architecture:** Orquestador (Fable 5) + agentes Opus 5 por tarea. Fase D = 3 diagnósticos en paralelo (solo escriben su doc `docs/review/GOAL_*.md`, incremental fila a fila). Fase F = fixes conocidos en 2 tandas de 2 agentes con ownership de archivos disjunto. Fase E = fixes emergentes de los diagnósticos. Fase V = gate + clicks (orquestador). Fase P = PR → merge → auto-deploy → verificación prod + carga comparada con julio.

**Tech Stack:** Next.js 15 (App Router, SPA custom en `app/components/Aula.tsx` + builders `app/lib/scr-*.ts`), Prisma (SQLite dev / Postgres prod), vitest, eslint, Playwright/browser para clicks.

## Contexto: qué quedó pendiente y por qué

La sesión anterior (Opus 5, export analizado) murió por límite de cuota en plena campaña GOAL. Estado real:

| Frente | Estado | Evidencia |
|---|---|---|
| Contraste AA | **HECHO** (falta checklist 5 pantallas + bordes input) | commit `f1d2ea1` + `GOAL_2026-08_a11y.md` |
| OG image, tarjetas temporada, copy EN del site | **HECHO** | commits `29d42bf`, `25af38e`, `26d365a` |
| Barrido alumno | **Diagnóstico completo**, 5 defectos SIN arreglar | `GOAL_2026-08_barrido-alumno.md` |
| Barrido staff | **Parcial**: coach hecho (6 defectos SIN arreglar); familia y admin SIN empezar | `GOAL_2026-08_barrido-staff.md` |
| Teclado y semántica | **Vacío** (solo alcance) | `GOAL_2026-08_teclado.md` |
| Perf endpoint/bundle | **Vacío** (secciones 0-5 pendientes) | `GOAL_2026-08_perf.md` |
| Carga y concurrencia vs julio | Sin empezar → va POST-deploy contra staging real | `GOAL_HARDENING_2026-07.md` (baseline: app-data p50 335 / p95 543 ms, logins p95 270 ms) |
| Merge + deploy | Rama `feat/goal-extras` con 4 commits sin PR ni push | `git log origin/main..HEAD` |

Línea base verificada hoy: `npx tsc --noEmit` limpio · `npx vitest run` **675/675 verdes (51 archivos)**.

## Global Constraints

- Paleta guardada por `tests/brand-palette.test.ts`: tinta `#171717`, naranja `#F25623`, greige `#F1F1EF`, naranja-texto-pequeño `#9E3211`. Texto **NEGRO** sobre naranja, nunca blanco. `--ink-400` es `#6B6B6B` (no volver a `#808080`).
- Contrato de escape: `queries.ts` escapa el texto de usuario UNA vez; los builders `scr-*.ts` lo renderizan crudo (nunca re-escapar → saldría `&amp;amp;`).
- Kit mockup: chips y botones SIEMPRE compuestos `class="chip chip--x"` / `class="btn btn-x"`; radios 3-6 px (sin pills nuevas); botones h44/h40/h34.
- `public/site/index.html` (landing orb WebGL) NO se rediseña; solo quedan los cambios ya commiteados.
- Toda string nueva de UI va a `app/lib/i18n.ts` en ES **y** EN.
- Cuentas demo: `analia.reyes@otr.do` (student) · `saul@otr.do` (coach) · `rosa.fermin@otr.do` (parent) · `admin@otr.do` (admin) · pass `rebrand-qa-2026`.
- Cada agente usa SU puerto (`PORT=30XX npm run dev`); `next build` solo en worktree aislado; ningún agente commitea ni cambia de rama (commitea el orquestador); ningún agente re-siembra la DB sin avisar (comparten `dev.db`).
- Gate antes de merge: `npx tsc --noEmit` + `npx vitest run` COMPLETA + `npx eslint .` (0 errores) + `npm run build` OK + clicks reales. Declaraciones del hook solo si son verdad.
- Deploy: SOLO vía PR → merge a `main` → CI → ghcr → cron del VPS `2.25.205.214` (~2 min). El servidor `187.124.251.163` es ajeno: **NO tocar**.

---

### Task 0: Preflight — proteger los diagnósticos y verificar la superficie

**Files:** commit de `docs/review/GOAL_2026-08_{barrido-alumno,barrido-staff,perf,teclado}.md` (hoy sin trackear) + este plan.

- [x] Baseline suite verde (675/675) y tsc limpio — hecho 2026-08-08.
- [ ] `git add docs/review/GOAL_2026-08_*.md docs/superpowers/plans/2026-08-08-goal-cierre.md && git commit -m "docs(goal): diagnósticos de la sesión anterior + plan de cierre"`.
- [ ] Levantar `PORT=3030 npm run dev`, `POST /api/login` con `analia.reyes@otr.do`/`rebrand-qa-2026` → si falla, `SEED_PASSWORD=rebrand-qa-2026 npm run db:seed` ANTES de lanzar agentes (nunca durante).

### Task D1 (agente Opus 5): Barrido familia + admin → completar `GOAL_2026-08_barrido-staff.md`

**Files:** SOLO `docs/review/GOAL_2026-08_barrido-staff.md` (append filas; no tocar código).
Puerto 3031. Cuentas `rosa.fermin@otr.do` y `admin@otr.do`.

- [ ] Familia: dashboard hijos (scr-parent), reservas (scr-mybookings), marketplace + detalle de listing (scr-marketplace/scr-listing), mensajes (scr-community), ajustes (scr-settings), placement si aplica.
- [ ] Admin: consola moderación (scr-admin), usuarios (scr-admin-users), métricas (scr-admin-metrics), WhatsApp (scr-admin-whatsapp).
- [ ] Método idéntico al bloque coach ya escrito: render 1280 + 390, 0 errores de consola, interacción principal con click real, ES y EN, estados vacíos; fila `| rol | pantalla | estado | qué | archivo:línea | gravedad |` escrita EN CUANTO se verifica (incremental). Al cerrar: cambiar "Estado" del doc a "Completo".

### Task D2 (agente Opus 5): Teclado + semántica → `GOAL_2026-08_teclado.md` + flecos de `GOAL_2026-08_a11y.md`

**Files:** SOLO esos 2 docs. Puerto 3032. Cuentas analia + saul.

- [ ] Alcance del doc: foco visible (login, dashboard, top-nav, menú "Más", menú usuario, modal Adjudicar), focus trap + Escape + retorno de foco en modales, jerarquía h1-h3, landmarks, botón vs enlace, labels, aria-current/aria-expanded, nombres accesibles de botones-icono, aria-hidden en decorativos, prefers-reduced-motion. Hallazgos incrementales con archivo:línea y gravedad.
- [ ] a11y.md: marcar el checklist de las 5 pantallas medidas y medir bordes de INPUT (≥3:1) que quedaron pendientes.

### Task D3 (agente Opus 5): Perf → `GOAL_2026-08_perf.md`

**Files:** SOLO ese doc. Puerto 3033; `next build` en worktree propio (`git worktree add`), borrarlo al terminar.

- [ ] §0 inventario: rutas API que llama el Aula y tamaño de `/api/app-data` (bytes).
- [ ] §1 queries: activar log de Prisma y contar queries por carga de `/api/app-data` (sesión alumna); listar N+1.
- [ ] §2 p50/p95 local: 30 GET seriados + 12 paralelos, tabla de tiempos.
- [ ] §3 índices: cruzar `schema.prisma` con los `where/orderBy` reales de `queries.ts`; listar faltantes con el modelo y campos exactos.
- [ ] §4 bundle: `next build` (worktree) → tabla de First Load JS por ruta; top 3 contribuyentes si hay ruta >200 kB.
- [ ] §5 `/img/hero-speaking.jpg`: peso actual, dimensiones, dónde se usa, propuesta (resize/webp/`sizes`) SIN aplicarla.

### Task F1 (agente Opus 5): Router — URL sincronizada con la pantalla

**Files:** Modify `app/components/Aula.tsx` (~135 y ~1114). Test: `tests/router-hash.test.ts` (nuevo).
Defecto (ambos barridos): la nav es `window.go(r)` puro; `renderApp()` se llama tras `preventDefault()` sin tocar el hash; nadie escucha `hashchange`. Sin deep-link, sin back/forward, F5 vuelve a la pantalla anterior.

- [ ] Investigar cómo `go()` guarda la ruta (`window.__route`) y si alguna ruta lleva estado extra; decidir formato `#<route>`.
- [ ] Test primero (rojo): mapeo ruta↔hash puro exportado (p. ej. `routeToHash`/`hashToRoute`) + contrato "go() actualiza el hash" si el patrón de tests del repo lo permite.
- [ ] Implementar: `go(r)` hace `location.hash = r` y el trabajo de render se mueve a un listener `hashchange` (con guard anti doble-render); al montar, leer `location.hash` para la pantalla inicial (deep-link y F5).
- [ ] Clicks obligatorios: navegar 4-5 pantallas → URL cambia; Atrás/Adelante repintan; F5 conserva pantalla; abrir directo `/aula#course` y `/aula#teacher` (coach); repetir en móvil 390. Suite completa verde.

### Task F4 (agente Opus 5): Staff coach — a11y, modal, moneda, mensajes

**Files:** Modify `app/lib/scr-teacher.ts`, `app/lib/scr-my-listings.ts`, `app/lib/scr-coachwork.ts`, `app/lib/scr-community.ts`, `app/lib/queries.ts` (SOLO sección de mensajes). Tests: los `tests/ui-*.test.ts` del patrón existente.

- [ ] S1: `aria-label` (i18n ES/EN) en los botones solo-icono `.ev-actions .btn-outline` de la tabla de alumnos.
- [ ] S2: re-verificar el modal Adjudicar a viewport de 800 px de alto — el CSS ya tiene `max-height` + `overflow-y` (`screens.css:1221-1223`); confirmar que el markup del modal usa `.modal-body`/`.modal-foot`; si no los usa, ese es el fix. Si ya funciona: marcar CORREGIDO en el doc con la medición.
- [ ] S3: unificar moneda tarifa/ingresos — investigar qué domina en el repo (`grep -rn "RD\$" app/lib` vs `$`) y unificar los labels de publicar clase (scr-my-listings) y Disponibilidad/Ingresos (scr-coachwork) a la dominante. Anotar la decisión en el commit.
- [ ] S4: cabecera y lista de conversación deben mostrar la CONTRAPARTE (Analía), no al propio coach. Root cause probable: se pinta `participants[0]` en vez del participante ≠ usuario actual.
- [ ] S5: hilo de Diego Fermín abre vacío pese al preview "Gracias coach · hace 2h" — investigar por qué preview y detalle usan fuentes distintas en `queries.ts`; test rojo→verde con un hilo cuyo detalle devuelve los mensajes del preview.
- [ ] Clicks: pantalla messages con ambos hilos, tabla de alumnos con lector (nombre accesible), modal a 800 px, publicar clase y coachwork con la misma moneda. Suite completa verde.

### Task F2 (agente Opus 5, tras F1/F4): i18n de fechas EN + título de la próxima clase

**Files:** Modify `app/lib/i18n.ts` (~722), `app/lib/queries.ts` (labels de fecha y next-class), `prisma/seed.ts` si el título sale del seed. Tests: `tests/i18n-dates.test.ts` (nuevo) + ajuste del test de next-class si existe.

- [ ] A2: con cookie `otr_lang=en` los labels salen "mar 11 ago · 4:00 PM" (ES). Investigar dónde se formatean (queries vs i18n) y pasar el locale activo (`es-DO`/`en-US`) a TODOS los formatters de fecha del payload. Test: mismo dato → "Tue, Aug 11" con `en`.
- [ ] A4: la "próxima clase" se titula "Single" (tipo de sesión). El título visible debe ser el curso/tema real y el tipo quedar como metadato. Decidir en investigación si es fix de `queries.ts` (campo equivocado) o de seed (dato pobre) — preferir queries para que valga con cualquier dato.
- [ ] Clicks: dashboard ES y EN (cookie), hero + tarjeta del 11-ago sin "Single" como título. Suite completa verde.

### Task F3 (agente Opus 5, junto a F2): UI alumno — chip cortado + progress sin controles

**Files:** Modify `app/lib/scr-core.ts`, `app/styles/screens.css` (sección propia al final). Test: asserts en el ui-test del dashboard/progress existente si lo hay.

- [ ] A3: chip `Semifinalista` desborda con `overflow:hidden` sin ellipsis → `max-width` + `text-overflow:ellipsis` + `title` con el texto completo (o 2 líneas como decidió la sesión anterior para insignias — seguir ese precedente).
- [ ] A5: `progress` no tiene ni un control → añadir enlaces `btn-outline btn--sm` a Logros (`badges`) y Debate Hub (`debate`) vía `window.go`, strings i18n ES/EN.
- [ ] Clicks: dashboard con el chip completo visible, progress con los 2 enlaces funcionando (van a su pantalla). Suite completa verde.

### Task E (agentes Opus 5 según hallazgos): fixes emergentes de D1-D3

- [ ] Leer los 3 docs; arreglar TODO lo de gravedad bloquea/molesta/media (familia/admin, teclado, a11y) con ownership de archivos disjunto por agente; cosméticos solo si son triviales.
- [ ] Perf: aplicar SOLO quick wins seguros — índices `@@index` que D3 justifique con query real + optimización de `hero-speaking.jpg` (resize/compresión, mismo path). Nada de refactors de caché sin medición.
- [ ] Cada fix: investigación → test si aplica → clicks. Marcar cada fila arreglada en su doc como **CORREGIDO** con hash.

### Task V (orquestador): Gate + barrido de clicks propio

- [ ] `npx tsc --noEmit` · `npx vitest run` COMPLETA · `npx eslint .` (0 errores) · `npm run build` OK.
- [ ] Clicks míos (no delegados): login 4 roles; por rol la pantalla principal + las tocadas por F/E + una vecina no tocada; back/forward y F5 (por F1); EN con cookie (por F2); móvil 390 en dashboard/eventos/participants.
- [ ] Correos: renderizar el HTML real de `mail.ts` (bienvenida/confirmación) en navegador y mirarlos.
- [ ] Actualizar docs GOAL: cada defecto con CORREGIDO + hash, o justificar por qué queda.

### Task P (orquestador): PR → merge → deploy → verificación en prod

- [ ] Commit final de docs; `git push -u origin feat/goal-extras`; PR a `main` con resumen de campaña.
- [ ] Merge SOLO con el gate verde y clicks hechos (declaraciones del hook verdaderas). Nada de push directo a main.
- [ ] CI verde (`gh run watch`); esperar el auto-deploy del cron (~2 min) y comprobar paridad: el commit servido en `https://2.25.205.214.sslip.io` == merge commit de main (vía SSH `docker image inspect` o endpoint de salud).
- [ ] Clicks EN PRODUCCIÓN: login 4 roles, dashboard, eventos + inscripción, participantes + modal Adjudicar, mensajes, deep-link con hash, EN.
- [ ] Carga vs julio (baseline `GOAL_HARDENING_2026-07.md`): 12 GET paralelos a `/api/app-data` → p50/p95 vs 335/543 ms; logins concurrentes vs p95 270 ms. Si empeora >2x: investigar antes de cerrar (los índices de D3 son el sospechoso #1).
- [ ] `187.124.251.163` NO se toca.

### Task R (orquestador): Informe final + memoria

- [ ] Informe: lo VISTO (textos/números de pantalla), lo NO visto y por qué, números de carga comparados, y las preguntas que quedan para Wilser/Isaac: (1) moneda elegida — avisar cuál y por qué; (2) fotos reales de temporada de Isaac (hoy mock); (3) fecha del highlight St. Michael's (sin fuente).
- [ ] Actualizar memoria del proyecto (estado GOAL cerrado, defectos corregidos, números de prod).
