# Rediseño del Aula según mockup "Dashboard UI redesign" — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. La FUENTE DE VERDAD VISUAL es `docs/superpowers/specs/2026-08-07-dashboard-mockup-spec.md` (spec exacto extraído del mockup) + las 2 capturas del usuario. Este plan define tareas y contratos; los valores px/hex EXACTOS están en el spec — úsalo siempre.

**Goal:** Adoptar en TODO el Aula la estética del mockup aprobado (2026-08-07): top-nav horizontal (adiós sidebar), canvas greige `#F1F1EF`, tarjetas blancas planas con radios 3-6px y UNA sombra, héroes/cards negras con acento naranja generoso, texto negro sobre naranja, section-titles con barra naranja; y reconstruir el dashboard replicando el mockup con datos reales.

**Architecture:** (1) tokens de estética en `tokens.css`; (2) shell nuevo con top-nav en `shell.ts`+`app.css`; (3) dashboard reconstruido en `scr-core.ts`; (4) componentes compartidos (`components.ts`, `screens.css`) propagan la estética; (5) pasada por grupos de pantallas `scr-*` en paralelo (archivos disjuntos).

**Tech Stack:** igual que siempre — CSS variables sin Tailwind, SPA de string-templates (`scr-*.ts` con `// @ts-nocheck`), vitest.

## Global Constraints

- Rama: `feat/aula-redesign-mockup` (desde main). Conventional Commits en español. Doble schema Prisma si se tocara (no se prevé).
- **El mockup MANDA sobre la regla previa "una pieza naranja por vista"** (decisión Wilser 2026-08-07): naranja generoso como el mockup. `--text-on-accent: #171717` — **texto NEGRO sobre naranja, siempre** (botones naranjas incluidos).
- **Excepción A11y (única desviación del mockup):** texto naranja <14px sobre canvas claro usa `#CC3F13` (eyebrows, labels); `#F25623` queda para ≥14px bold, iconos, barras, fondos.
- Paleta del guardián intacta: nada de la paleta pre-rebrand (`tests/brand-palette.test.ts` debe seguir verde). Los nuevos neutros cálidos (`#F1F1EF #E4E3DF #EDEDEA #DCDBD6 #ECEBE7 #FBFBFA #F8F8F6`) NO están prohibidos.
- Radios nuevos (spec §18): badges 3px, botones 4px, tiles 5px, contenedores 6px, círculos 50%. CERO pills en chips/badges.
- Sombra única `0 1px 2px rgba(23,23,23,.05)` + glow naranja `0 8px 24px rgba(242,86,35,.32)` solo en CTA/hero.
- Tipografía: Inter; h1 40/800/−0.035em; títulos de card 15-17/800; eyebrows 11/700/0.16em uppercase; chips 10/800/.07em uppercase; números grandes 21-42/800.
- Mobile: la top-nav colapsa; se CONSERVA la bottom-tab-bar actual del Aula en <768px.
- Secciones del dashboard sin datos reales → se ocultan con gracia (nada de datos inventados en producción; el seed puede poblar demo).
- Gate de merge: suite completa verde + clicks reales en las pantallas tocadas + pantalla vecina.

---

### Task 1: Tokens de estética (base de todo)

**Files:** Modify: `app/styles/tokens.css`, `app/globals.css` (sync)

**Interfaces (produce — nombres NUEVOS, sin romper los existentes):**
`--bg:#F1F1EF` · `--bg-sunken:#EDEDEA` · `--surface:#FFFFFF` · `--surface-2:#FBFBFA` · `--border:#E4E3DF` · `--border-strong:#DCDBD6` · `--text-on-accent:#171717` · `--accent-dark:#CC3F13` · `--accent-soft:#F7A98C` · `--r-xs:3px --r-sm:4px --r-md:5px --r-lg:6px` (pill queda solo para círculos/avatares) · `--sh-1:0 1px 2px rgba(23,23,23,.05)`; `--sh-2/3/pop` = `var(--sh-1)` (colapso a una sombra) · `--sh-glow:0 8px 24px rgba(242,86,35,.32)` · inks extra `--ink-800:#202020 --ink-700:#2E2E2E --ink-400:#808080 --ink-300:#B4B4B4`. `--otr-green-text/--otr-gold-text` → `#CC3F13` (naranja oscuro AA para texto pequeño; antes `#9E3211`) — verificar que sobre `#F1F1EF` da ≥4.5:1, si no, mantener `#9E3211`.

- [ ] Aplicar valores, correr `npx vitest run tests/brand-palette.test.ts` (verde) + `npx tsc --noEmit`, mirar el Aula en dev (canvas greige, radios apretados). Commit `feat(ui): tokens de estética del mockup (greige, radios 3-6, sombra única)`.

### Task 2: Shell top-nav

**Files:** Modify: `app/lib/shell.ts`, `app/styles/app.css`, `app/styles/responsive.css`

**Interfaces:** top-nav sticky 62px según spec §6 (fondo `rgba(248,248,246,.85)`+blur 12, borde inferior `#E4E3DF`): escudo 30px + "Aula" 18/800/−0.03em · links de nav (los mismos ítems que la sidebar actual, agrupados por rol; overflow → menú "Más") con estado activo (texto negro + subrayado/barra 2px naranja) · derecha: pill XP negra 34px r5 (`⚡ {xp} XP`), campana 34px fondo `#ECEBE7`, user-chip (avatar 34px + nombre + tier/nivel) que abre el menú de usuario actual (perfil/membresía/settings/salir). El `main` pasa a `max-width:1256px; padding:30px 30px 72px; margin:0 auto`. La sidebar y `--sidebar-w` desaparecen del layout desktop. Mobile <768px: top-nav compacta (logo + XP + campana + avatar) y se conserva la bottom-tab-bar existente. Breadcrumbs actuales del topbar se integran o eliminan según spec (el mockup no los tiene: el header de página los sustituye).

- [ ] Implementar, verificar en dev con clicks (todas las entradas de nav de student y coach funcionan, menú usuario abre, mobile conserva tabs), `npx vitest run` (arreglar tests de shell si asertan sidebar), commit `feat(ui): top-nav horizontal según mockup (adiós sidebar en desktop)`.

### Task 3: Componentes compartidos de la estética

**Files:** Modify: `app/lib/components.ts`, `app/styles/screens.css` (secciones compartidas)

**Interfaces (produce — clases nuevas disponibles para todas las pantallas):**
`.sec-title` (barra naranja 3×15px + h3 17/800/−0.025em; variante `.sec-title--sm` 3×14 + 15/800) · `.chip` reescrito: uppercase 10/800/.07em, r3, variantes `--black`(sólido negro) `--accent`(naranja, texto negro) `--outline` `--tint`(fondo `rgba(242,86,35,.045)`) `--info`(`#E7EBEE`+`#3F5566`) · `.btn` h44 r4: `.btn-accent` naranja con TEXTO NEGRO + glow, `.btn-primary` negro/blanco, `.btn-outline` `1.5px solid #DCDBD6` · `.card` r6 blanca + `--sh-1`; `.card--dark` negra r6 (para héroes/leaderboards) · `.date-box` (70px, día grande, r5) · `.evrow` (grid `70px 1fr auto`, variante `--live` con `border-left:3px` naranja + fondo tinte) · `.stat-inline` (número 21/800 + label 10/700 uppercase, divisores 1px) · `.ring` (anillo `conic-gradient` naranja, 96px/aro 9px) · `.page-head` (eyebrow fecha `#CC3F13` + h1 40/800 + stats a la derecha).

- [ ] Implementar contra el spec, página de prueba visual rápida en dev, `npx tsc --noEmit`, commit `feat(ui): kit de componentes del mockup (sec-title, chips, btns, cards, evrow)`.

### Task 4: Dashboard reconstruido (réplica del mockup con datos reales)

**Files:** Modify: `app/lib/scr-core.ts` (pantalla dashboard), `app/lib/i18n-keys/` correspondientes, `app/styles/screens.css` (bloque dashboard)

**Estructura (spec §7-17), TODA con datos de `window.DB`:**
1. `.page-head`: eyebrow con fecha de hoy (formato "MIÉRCOLES, 6 DE AGOSTO"), "Hola, {nombre}", stats derecha: posición en clasificación XP (si `leaderboardOptIn`), nº de clases, racha (naranja).
2. Hero "TU PRÓXIMA CLASE" (`.card--dark` + foto de la clase si existe, si no degradado negro + barra naranja 3px): título de la próxima sesión real, horario, coach, badge "EN VIVO PRONTO" si <60min, countdown mm:ss activo si <60min, CTA "Únete por Zoom/Meet" (naranja, texto negro) si la sesión tiene URL; sin próxima sesión → hero con CTA "Explorar cursos".
3. "Próximos eventos" con filtro Todos/Clases/Torneos (chips negro activo): sesiones + torneos reales; fila `--live` para hoy-en-curso; acciones: Unirse (naranja) / Recordar (outline) / Inscribirme (negro).
4. Aside "Tu rango": card negra con `.ring` (progreso XP hacia el siguiente nivel real), NIVEL {n}, nombre del nivel, "Te faltan {xp} XP", badge tier (del debateTier real).
5. Aside "Logros": grid 2×2 de los últimos 4 badges reales con +XP; enlace "Ver todas las insignias" → pantalla badges.
6. "Clasificación de {mes}": card negra con podio 3 + lista con la fila propia destacada, XP del mes (si el cálculo mensual no existe en DB, usar XP total y etiquetar "Clasificación general"; SIN premios inventados — la línea de premios solo si hay dato).
7. "Lo mejor de la temporada": SOLO si existen media/highlights reales; si no, la sección NO se renderiza.

- [ ] Implementar, probar con los 4 logins demo con clicks (student con datos, usuario sin sesiones → fallbacks), actualizar tests de dashboard que aserten el markup viejo, commit `feat(aula): dashboard replicando el mockup con datos reales`.

### Task 5-8: Pasada de estética por grupos de pantallas (paralelo, archivos disjuntos)

Aplicar el kit de Task 3 (sec-titles, chips r3, botones, cards, héroes negros donde el patrón aplique) y limpiar estilos que contradigan la estética (pills, sombras múltiples, radios grandes, hero claros):

- **Task 5** — Aprendizaje: `scr-learn.ts`, `scr-course.ts`(si existe; si no, módulo equivalente en `scr-core.ts`), `scr-lesson/assignment/quiz` según módulos reales, `scr-placement.ts`.
- **Task 6** — Competición y comunidad: `scr-debate.ts`, `scr-extra.ts` (eventos), `scr-forum/messages` módulos, `scr-lifetime.ts`, `scr-profile.ts`.
- **Task 7** — Marketplace y familia: `scr-marketplace.ts`, `scr-teacher.ts`, `scr-parent.ts`, `scr-settings.ts`, `scr-hub.ts`.
- **Task 8** — Admin y restos: `scr-admin*.ts`, `scr-certificate.ts` (solo chips/botones — el diploma NO cambia de composición), `Auth.tsx` (login con la estética: canvas greige, botón h44), páginas de error.

Cada task: SOLO sus archivos + su bloque de `screens.css` (coordinar: los bloques de screens.css se reparten SIN solaparse; si dos tasks necesitan la misma regla compartida, va a Task 3). Verificación por task: `npx tsc --noEmit` + vitest de sus pantallas + click en dev de sus pantallas principales.

### Task 9: Docs + guardián de estética

- `BRAND.md`/`docs/CONVENTIONS.md`: nueva regla de acento (naranja generoso según mockup, texto negro sobre naranja, radios 3-6, sombra única, top-nav), referencia al spec.
- Revisar `tests/` que aserten radios/clases viejas. Suite completa + lint.

### Task 10: Gate + PR + merge + deploy

- Suite completa (`tsc`+`eslint`+`vitest`+`build`) con output real; clicks en dev: dashboard 4 roles + 2 pantallas por grupo + mobile (bottom tabs) + pantalla vecina sin cambios esperados; screenshots.
- PR → merge (declaraciones SOLO siendo verdad) → push a main → **el auto-deploy ya funciona** (cron 2 min) → verificar staging con clicks.
