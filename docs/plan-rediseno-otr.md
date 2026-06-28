# Plan de rediseño OTR — feedback de Isaac (meeting 2026-06-27)

**Regla macro:** el rediseño del **Dashboard/Home va de ÚLTIMO**. Primero todo lo demás.
**Estado del código:** parte del registro de debate ya está construido (cola de aprobación del coach, commit `e1f7bf6`, sin desplegar). El resto es nuevo.

Leyenda esfuerzo: **S** ≤ medio día · **M** 1–2 días · **L** 3–5 días.

---

## Fase 1 — i18n: completar inglés (P1 · S–M)
**Problema:** al cambiar a EN quedan textos en español ("novato", "Equipo para el primer curso", etc.).
- Auditar `app/lib/i18n-keys/*.ts` (es/en): detectar claves sin traducción EN.
- Barrer `app/lib/scr-*.ts` por **strings hardcodeados** (texto crudo que no pasa por `t()`).
- Casos vistos: nombres de nivel y el copy de "primer curso" → mover a claves i18n.
- **Archivos:** `i18n-keys/*.ts`, `scr-core.ts`, `components.ts`, los `scr-*.ts` con hardcode.
- **Verificación:** recorrer cada pantalla en EN; 0 strings ES residuales.

## Fase 2 — Consolidar Cursos (Aprender + Marketplace + Reservas) (P1 · M)
**Decisión de producto:** "Mi aprendizaje", "Cursos" y "Mis reservas" son lo mismo → **una sola sección**.
- Nueva sección **Cursos** con dos cosas: **Cursos activos** + **Buscar nuevos** (botón a catálogo).
- Layout: reutilizar el card de cursos activos del Home + botón "Buscar catálogo".
- **Sacar Membresía de Cursos** → nav propio o dentro de Perfil *(DECISIÓN 2)*.
- Colapsar las 3 entradas de nav en una.
- **Archivos:** `app/lib/shell.ts` (nav), `app/lib/screens.ts` (ROUTES/SCREENS), `scr-learn.ts`, `scr-marketplace.ts`, `scr-mybookings.ts` (fusionar vistas), `scr-room.ts` (membresía).

## Fase 3 — Debate Hub overhaul (P1 · L) — debate-first, el bloque grande
Todo en `app/lib/scr-debate.ts` + `i18n-keys/debate.ts` salvo nota.
1. **Desacoplar de niveles/XP** — el Hub no muestra nada de niveles; 100% debate.
2. **KPIs (Resumen):** renombrar "Rondas adjudicadas" → **"Rondas participadas"**. Mostrar **Participadas · Victorias · % de victoria**. **Quitar "Derrotas"** (tono positivo). Ej. "10 ganadas · 20%".
3. **Quitar botón "Registrar" del alumno** — registra el coach *(DECISIÓN 1: alumno sin botón vs. solicitud→aprobación que ya construí)*.
4. **"Próximo evento" → "Próximo torneo"** (el Hub muestra torneos de debate, no eventos). Fuente: `app/api/tournaments`.
5. **Sub-tabs:** dejar **Resumen · Mis debates · Práctica · Leaderboard**. **Eliminar Analytics y Torneos** (redundante con Eventos).
6. **Práctica/Drills:** sacar el botón del Resumen → su propio tab llamativo. Poner **ejercicios de debate in-platform** + **"Encuentra rival cerca de tu ranking"** (matchmaking por rating Glicko — reusa `debateRating`/tier).
7. **Leaderboard OTR:** mantener; **OTR Pro atado a la suscripción** (gating por membresía). Reusar en más secciones.
- **Archivos extra:** `app/api/leaderboards`, `app/api/tournaments`, `scr-teacher.ts` (cola de coach ya hecha), posible `glicko2`-matchmaking helper.

## Fase 4 — Eventos = eventos + torneos (P2 · S–M)
- En **Eventos** se ven **próximos eventos + próximos torneos** (seminarios/workshops + torneos de debate).
- Coherente con Fase 3.4 (los torneos salen de los sub-tabs del Hub y viven en Eventos; el Hub solo destaca el "próximo torneo").
- **Archivos:** `app/lib/scr-events.ts`, `app/api/tournaments`.

## Fase 5 — Catálogo / página del profesor con video (P2 · M–L)
- Página de curso/profesor tipo overview: **video de bienvenida del profesor**, **ratings con estrellas**, qué hace, **resumen del programa**.
- El profe **sube un video presentándose** (OTR ayuda con mercadeo).
- **Schema (ambos):** `CoachProfile`/`Course += welcomeVideoUrl` (vídeo por **Cloudflare Stream**, ya integrado).
- **Archivos:** `prisma/schema.prisma` + `schema.postgres.prisma`, `app/api/coach-profile`, `scr-marketplace.ts` (perfil de coach), `scr-extra.ts` (card de catálogo), `app/lib/video.ts`.

## Fase 6 — NSDA: spike de integración (P3 · investigación)
- NSDA (National Speech & Debate Assoc.): los alumnos ven puntuación e historial. **Investigar factibilidad** de conectar (¿API pública? ¿OAuth? ¿scraping?).
- OTR complementa con **torneos locales** que NSDA no registra.
- **Entregable:** doc de factibilidad + recomendación (NO build aún) *(DECISIÓN 3: ¿spike ahora o backlog?)*.

## Fase 7 — Home / Dashboard redesign (ÚLTIMO · M–L)
Per instrucción explícita de Isaac, va de último. En `app/lib/scr-core.ts` + `tokens.css`/`screens.css`.
- Quitar **"Empieza aquí"** y el framing **"para ti"** / los *eyebrows*.
- "Tus programas" → **"Programas recomendados"** (sin "para ti").
- **Más color, vida y dinamismo** — menos sobrio, efecto "shine"; **es para jóvenes**. (Mantener brandbook OTR, subir energía visual.)
- **Quitar Torneos del Home** (redundante con Eventos).

---

## Decisiones que bloquean
1. **Registro de debate:** ¿alumno SIN botón (solo coach) o mantengo "solicitud del alumno → aprueba coach" (ya construido)?
2. **Membresía:** ¿nav propio o dentro de Perfil?
3. **NSDA:** ¿spike de factibilidad ahora o a backlog?
4. **"Encuentra rival":** ¿matchmaking real (empareja por rating) o solo sugerencia visual en v1?

## Orden de ejecución recomendado
**1 (i18n) → 2 (Cursos) → 3 (Debate Hub) → 4 (Eventos) → 5 (Catálogo/video) → 6 (NSDA spike) → 7 (Dashboard, último).**
i18n y Cursos primero (rápidos, desbloquean); Debate Hub es el de más valor (debate-first); Dashboard al final.

## Ya hecho / parcial
- **Coach aprueba/registra debate** → cola de aprobación construida (`e1f7bf6`, sin push). Falta decidir DECISIÓN 1.
- **Empate/DRAW eliminado** + KPIs base → hecho; falta el ajuste a "participadas/victorias/%" sin derrotas (Fase 3.2).
