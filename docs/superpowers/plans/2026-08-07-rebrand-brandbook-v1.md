# Rebrand total → OTR Brand Book V1.0 (2026) — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrar TODO el producto (Aula SPA, consulta, perfiles públicos, emails, certificado, páginas de error, landing pública + orb WebGL, favicon, docs) del sistema crema/verde/oro al Brand Book V1.0: negro `#171717` + naranja `#F25623` único acento + grises fríos, Inter única familia, radios 8/12, escudo monocromo — y desplegarlo.

**Architecture:** El 80% del re-skin pasa por `app/styles/tokens.css` (~374 usos de `var(--otr-*)`; los alias legacy ya redirigen). El resto son superficies con hex hardcodeados (emails, perfil público, landing, shader GLSL, datos en DB) que se migran con una tabla de mapeo ÚNICA (abajo). Un test guardián (rojo primero) escanea el repo y prohíbe la paleta vieja: cuando pasa, no queda nada pendiente.

**Tech Stack:** Next.js 15 App Router, CSS plano con variables (SIN Tailwind), SPA Aula = string templates en `app/lib/scr-*.ts`, Prisma (doble schema SQLite/Postgres), vitest, eslint.

## Global Constraints

- **Rama:** todo se commitea en `feat/rebrand-brandbook-v1` (nunca en main). Conventional Commits en español.
- **Paleta ESTRICTA del brand book** (decisión del usuario 2026-08-07): negro/grises/naranja ÚNICAMENTE. Sin verde, sin oro, sin azul. Estados (ok/warn/danger) y niveles también dentro de esta paleta.
- **Naranja = único acento**, con moderación ("una sola pieza en naranja por vista"). Botón primario **NEGRO** (`#171717`); naranja solo para el CTA estrella, énfasis, foco y datos.
- **Inter única familia** en TODO el sistema, incluida la landing (adiós `Archivo Expanded`). Titulares extrabold 800, tracking `-0.03em`. Cuerpo 15–16px, base UI 14px.
- **Radios:** controles 8px, tarjetas/contenedores 12px, pill 999. Escala corta: 0/4/8/12/pill.
- **Escudo monocromo** siempre: un solo color según fondo (negro sobre claro, blanco sobre oscuro/naranja). Nunca a color sobre fondo de color, nunca sombras/degradados en el escudo.
- **Copy clave** (no reescritura total): nombre de marca visible → "OTR Debating Academy"; CTA estrella → "Inscríbete ahora"; sentence case; mayúsculas solo en eyebrows con tracking; **sin emoji** en UI/copy.
- **Iconos:** familia Lucide-style trazo 2px `currentColor` (la actual en `app/lib/icons.ts` ya cumple — NO tocar los ~50 iconos, solo el escudo).
- **No tocar** `site/` (legacy raíz), `_incoming/`, `docs/review/*` históricos. La landing `public/site/` SÍ se rebrandea (autorizado explícitamente por Wilser 2026-08-07, override del "NUNCA tocar" de CONVENTIONS.md): **solo colores/tipografía/copy clave; la estructura HTML, animaciones y lógica JS no cambian**.
- **Doble schema Prisma:** cualquier cambio en `prisma/schema.prisma` se replica IDÉNTICO en `prisma/schema.postgres.prisma`.
- **Gate de merge:** suite completa (`npx tsc --noEmit` + `npx eslint .` + `npx vitest run` + `npm run build`) verde + clicks verificados en la superficie real antes de mergear.

### TABLA DE MAPEO CANÓNICA (todo reemplazo usa EXACTAMENTE estos valores)

**Tokens nuevos (brand book):**

| Token | Valor |
|---|---|
| ink-900 / negro | `#171717` |
| ink-800 | `#262626` |
| ink-700 | `#333333` |
| ink-600 / dark gray | `#4D4D4D` |
| ink-500 | `#6B6B6B` |
| ink-400 | `#8C8C8C` |
| ink-300 | `#BDBDBD` |
| ink-200 / light gray | `#DEDEDE` |
| ink-150 | `#E7E7E7` |
| ink-100 | `#EFEFEF` |
| ink-50 | `#F7F7F7` |
| ink-25 | `#FCFCFC` |
| blanco | `#FFFFFF` |
| orange-500 (acento) | `#F25623` |
| orange-dark (hover/danger) | `#C8401A` |
| orange-soft (sobre fondo oscuro) | `#F8987A` |
| orange-tint (tintes/fondos) | `#FDE7DE` |
| orange-text (texto AA sobre tint) | `#9E3211` |

**Reemplazos viejo → nuevo (hex hardcodeados en cualquier archivo):**

| Viejo | Nuevo | Nota |
|---|---|---|
| `#0C0C0C` | `#171717` | negro |
| `#F7F7ED` | `#FFFFFF` | canvas de página → blanco; si es tinte/fondo hundido → `#F7F7F7` |
| `#2CAA20` | `#F25623` | acción/acento |
| `#54C247` | `#F25623` | (si es texto pequeño sobre fondo oscuro → `#F8987A`) |
| `#1E8C16` | `#C8401A` | hover/link |
| `#E1F2DE` | `#FDE7DE` | tinte |
| `#176B11` | `#9E3211` | texto sobre tinte |
| `#F2B814` | `#F25623` | logro → acento |
| `#C8920C` | `#C8401A` | |
| `#FBEFCB` | `#FDE7DE` | |
| `#5A4206` | `#9E3211` | |
| `#C2453C` | `#C8401A` | danger |
| `#F7E0DE` | `#FBDDD2` | danger-soft |
| `#FAFAF7` | `#FCFCFC` | neutrales cálidos → fríos |
| `#EFEFE5` | `#EFEFEF` | |
| `#E4E4D9` | `#E7E7E7` | |
| `#D3D3C7` | `#DEDEDE` | |
| `#B4B4A7` | `#BDBDBD` | |
| `#89897D` | `#8C8C8C` | |
| `#5F5F56` | `#6B6B6B` | |
| `#44443D` | `#4D4D4D` | |
| `#2E2E29` | `#333333` | |
| `#1A1A17` | `#262626` | |
| `#F1F1E4` | `#F7F7F7` | |
| `#CDEBC8` `#D9EED5` `#BBE4B5` | `#FDE7DE` | tintes verdes del perfil público |
| `#0C2340` `#0A1A2F` `#062038` | `#171717` | azul navy viejo |
| `#4FA9E8` | `#F25623` | |
| `#7FC8F2` `#9FC6E8` | `#F8987A` | |
| `#2E8BD0` | `#C8401A` | |
| `#DCEEFB` `#CFE4F5` | `#FDE7DE` | |
| `#F3F7FC` `#F4F7FB` `#F4F9FE` `#FBFDFF` | `#F7F7F7` | |
| `#E2E9F2` | `#E7E7E7` | |
| `#4A5A6E` | `#4D4D4D` | |
| `#6B7C90` | `#6B6B6B` | |
| `#8A99AB` | `#8C8C8C` | |
| `#EAF2FB` | `#FFFFFF` | texto claro sobre oscuro |
| `rgba(44,170,32,X)` | `rgba(242,86,35,X)` | misma alfa |
| `rgba(12,12,12,X)` | `rgba(23,23,23,X)` | sombras |
| `rgba(234,242,251,X)` | `rgba(255,255,255,X)` | texto translúcido sobre oscuro |
| `#F5A623` (landing.css) | `#F25623` | |
| `#FF9D2E` (landing.css) | `#C8401A` | (en gradientes: `#F25623 → #C8401A`) |
| `#22C55E` (landing.css) | `#F25623` | |
| `#0A0A0B` (landing.css) | `#171717` | |
| `'Archivo Expanded'` | `'Inter'` (weight 800, tracking -0.03em) | landing |

**Estados y niveles nuevos:** `--ok:#171717`/`--ok-soft:#EFEFEF` · `--warn:#F25623`/`--warn-soft:#FDE7DE` · `--danger:#C8401A`/`--danger-soft:#FBDDD2` · `--info:#4D4D4D`/`--info-soft:#EFEFEF` · niveles: novato `#BDBDBD`, jv `#8C8C8C`, varsity `#4D4D4D`, strategist `#171717`, elite `#F25623`.

---

### Task 1: Test guardián de paleta (rojo primero)

**Files:**
- Create: `tests/brand-palette.test.ts`
- Modify: (ninguno)

**Interfaces:**
- Produces: test que falla mientras exista paleta vieja en superficies de producto; define la lista FORBIDDEN y los directorios escaneados que el resto de tasks debe dejar limpios.

- [ ] **Step 1: Escribir el test** — escanea recursivamente `app/`, `public/site/`, `prisma/seed.ts`, `prisma/schema.prisma`, `prisma/schema.postgres.prisma` (extensiones `.ts .tsx .css .html .js .mjs .prisma`) buscando (case-insensitive): `#2CAA20 #54C247 #1E8C16 #E1F2DE #176B11 #F2B814 #C8920C #FBEFCB #5A4206 #F7F7ED #EFEFE5 #E4E4D9 #D3D3C7 #B4B4A7 #89897D #5F5F56 #44443D #0C2340 #0A1A2F #4FA9E8 #2E8BD0 #7FC8F2 #9FC6E8 #DCEEFB #F5A623 #FF9D2E #0C0C0C rgba(44,170,32 rgba(234,242,251 Archivo Expanded`. Excluir: `node_modules`, `.next`, `app/uploads`. El test acumula `archivo:línea → match` y hace `expect(violations).toEqual([])` para que el output liste todo lo pendiente.
- [ ] **Step 2: Correr `npx vitest run tests/brand-palette.test.ts`** — Expected: **FAIL** con cientos de matches (ese listado ES el inventario de trabajo).
- [ ] **Step 3: Commit** — `test(brand): guardián que prohíbe la paleta pre-rebrand`

### Task 2: Tokens núcleo (`tokens.css` + `globals.css`)

**Files:**
- Modify: `app/styles/tokens.css` (todo el `:root`)
- Modify: `app/globals.css` (`:root` duplicado + fondo del hero)

**Interfaces:**
- Produces: los nombres de token EXISTENTES no cambian (`--otr-black`, `--otr-green*`, `--otr-gold*`, `--n-*`, `--r-*`, alias `--otr-sky*`…) — solo cambian los VALORES, para no tocar 374 call-sites. Nuevos valores según tabla canónica.

- [ ] **Step 1: Reescribir la paleta de `tokens.css`:** `--otr-black:#171717`; `--otr-cream:#FFFFFF`; familia verde → naranja (`--otr-green:#F25623`, `-hi:#F8987A`, `-lo:#C8401A`, `-pale:#FDE7DE`, `-text:#9E3211`); familia gold → mismos valores naranja (`--otr-gold:#F25623`, `-lo:#C8401A`, `-pale:#FDE7DE`, `-text:#9E3211`); rampa `--n-*` fría (tabla ink-25→900); `--bg:#FFFFFF`, `--bg-sunken:#F7F7F7`, `--surface-2:#FCFCFC`; `--text-on-navy:#FFFFFF`; estados y niveles según tabla; `--track-tight:-0.03em`, `--track-tighter:-0.035em`; radios `--r-xs:4px --r-sm:8px --r-md:8px→NO — mantener --r-md:12px` ⇒ escala final: `--r-xs:4px; --r-sm:8px; --r-md:12px; --r-lg:12px; --r-xl:12px; --r-pill:999px`; sombras `rgba(23,23,23,…)`; `--ring:0 0 0 3px rgba(200,64,26,.55)`. Actualizar el comentario de cabecera al Brand Book V1.0.
- [ ] **Step 2: Sincronizar `globals.css`:** mismos valores literales (`--otr-navy:#171717; --otr-sky:#F25623; --otr-sky-hi:#F8987A; --otr-sky-lo:#C8401A; --otr-pale:#FDE7DE`), fondo del body `radial-gradient(...rgba(242,86,35,.18)...) #171717`, texto `#FFFFFF`, `rgba(234,242,251,…)→rgba(255,255,255,…)`, `rgba(44,170,32,.16)→rgba(242,86,35,.16)`, `.btn` radius `10px→8px`.
- [ ] **Step 3: `npm run dev` + abrir `/aula`, login demo, mirar dashboard** — el grueso del Aula debe verse ya negro/blanco/naranja.
- [ ] **Step 4: Commit** — `feat(brand): tokens núcleo al Brand Book V1.0 (negro/naranja/gris frío)`

### Task 3: Escudo monocromo + favicon + metadata

**Files:**
- Modify: `app/lib/icons.ts:77-97` (`otrCrest`)
- Modify: call-sites: `app/lib/shell.ts:229`, `app/components/Auth.tsx:403`, `app/components/Aula.tsx:20`, `app/not-found.tsx:12`, `app/lib/scr-certificate.ts:23`
- Create: `app/icon.svg`
- Modify: `app/layout.tsx` (metadata)

**Interfaces:**
- Produces: `otrCrest({ id, attrs, ink = "#171717", paper = "#FFFFFF", outline = ink })` — `ink` = color del escudo, `paper` = color de los cuadrantes claros. Sobre fondo oscuro los callers pasan `ink:"#FFFFFF", paper:"#171717"`.

- [ ] **Step 1:** Sustituir las constantes `CREAM/BLACK` por los parámetros `paper/ink` (defaults `#FFFFFF`/`#171717`); `outline` default = `ink`. Cuadrantes: los que eran CREAM→`paper`, BLACK→`ink`; letras igual invertidas. Actualizar los 5 call-sites según su fondo (sidebar negra y loading → blanco sobre negro; login/404/certificado sobre claro → negro).
- [ ] **Step 2:** Crear `app/icon.svg`: tile 64×64, `rect` blanco `rx="12"`, escudo `#171717` centrado (reusar el path del shield escalado). Next lo sirve como favicon automáticamente.
- [ ] **Step 3:** En `layout.tsx` metadata: `title: "OTR Debating Academy · Aula"`, description on-brand, `themeColor: "#171717"`.
- [ ] **Step 4:** Verificar en dev: favicon en pestaña, escudo correcto en login, sidebar, 404. Commit — `feat(brand): escudo monocromo parametrizado + favicon + metadata`

### Task 4: Hoja de estilos del Aula (`app.css`, `screens.css`) y radios

**Files:**
- Modify: `app/styles/app.css`, `app/styles/screens.css`

**Interfaces:**
- Consumes: tokens de Task 2. Solo quedan aquí rgba/hex sueltos.

- [ ] **Step 1:** Reemplazar todas las `rgba(44,170,32,…)`, `rgba(12,12,12,…)`, `rgba(234,242,251,…)` y cualquier hex de la tabla por sus nuevos valores. Radios hardcodeados: valores >12px en tarjetas → `var(--r-lg)` (12); controles 9/10px → `var(--r-sm)` (8); no tocar `999px`/`50%`.
- [ ] **Step 2:** Revisión de moderación del acento: donde había verde masivo (chips, barras, fondos), preferir negro/gris y dejar naranja solo en el elemento principal por vista (regla del book). Ajustar clases obvias (ej. chips activos → fondo negro texto blanco).
- [ ] **Step 3:** Click-through rápido en dev de 4-5 pantallas (dashboard, curso, foro, marketplace, settings). Commit — `feat(brand): app.css/screens.css sin restos de paleta vieja`

### Task 5: Superficies hardcodeadas fuera del Aula

**Files:**
- Modify: `app/p/[slug]/page.tsx` (32 hex + 5 rgba), `app/error.tsx`, `app/global-error.tsx`, `app/not-found.tsx`, `app/components/Auth.tsx` (fallbacks), `app/consulta/consulta.css` (34 fallbacks azules), `app/consulta/booking-flow.tsx:1016` (paleta), `app/lib/scr-extra.ts`, `scr-profile.ts`, `scr-lifetime.ts`, `scr-teacher.ts`, `scr-debate.ts`, `scr-core.ts`, `scr-placement.ts`, `scr-marketplace.ts`, `scr-learn.ts`, `scr-settings.ts`, `app/lib/shell.ts` (hex sueltos), `app/api/guardianship/route.ts`, `app/api/debates/[id]/route.ts`, `app/api/bookings/route.ts`, `app/api/bookings/[id]/route.ts`, `app/api/cron/reminders/route.ts`, `app/api/courses/route.ts`

**Interfaces:**
- Consumes: tabla de mapeo canónica. `booking-flow.tsx` paleta nueva: `["#171717","#4D4D4D","#F25623","#8C8C8C"]`.

- [ ] **Step 1:** Aplicar la tabla de mapeo archivo por archivo (son sustituciones mecánicas; el test guardián de Task 1 lista cada línea).
- [ ] **Step 2:** `npx vitest run tests/brand-palette.test.ts` — deben quedar solo las violaciones de emails (Task 6), datos (Task 7) y landing (Task 8).
- [ ] **Step 3:** Commit — `feat(brand): perfiles, consulta, errores y scr-* al nuevo sistema`

### Task 6: Emails transaccionales unificados

**Files:**
- Modify: `app/lib/mail.ts` (shell + botón + copy)
- Modify: `app/api/consultations/route.ts:114-152` (migrar a `emailShell`)

**Interfaces:**
- Produces: `emailShell(title, bodyHtml)` y `emailButton(label, href)` conservan firma. Nuevo look: fondo `#F7F7F7`, card blanca borde `#DEDEDE` radius **12px**, header `#171717` con marca **"OTR Debating Academy"** y tagline `#F25623`, botón **negro `#171717`** radius **8px**, texto `#4D4D4D`/`#6B6B6B`, footer `#8C8C8C` **"© OTR Debating Academy · Own the Room."**.

- [ ] **Step 1:** Reescribir `emailShell`/`emailButton` con los valores de arriba (los emails no soportan CSS vars: hex literales). Actualizar textos `#44443D→#4D4D4D`, `#5F5F56→#6B6B6B`, `#89897D→#8C8C8C` en `sendPasswordReset` y comentarios.
- [ ] **Step 2:** En `consultations/route.ts`, borrar el HTML azul propio y componer el correo con `emailShell` + `emailButton` importados, conservando el contenido/campos actuales del mensaje.
- [ ] **Step 3:** Test existente de mail (si asserta colores, actualizar) + `npx vitest run` de los tests de bookings/consultations. Commit — `feat(brand): emails unificados en emailShell negro/naranja`

### Task 7: Colores como datos (Prisma, seed, picker) + migración

**Files:**
- Modify: `app/components/Aula.tsx:448-449` (picker de color de curso), `prisma/schema.prisma:109`, `prisma/schema.postgres.prisma` (mismo campo), `prisma/seed.ts`
- Create: `scripts/rebrand-colors.sql`

**Interfaces:**
- Produces: picker nuevo: `["#171717","#4D4D4D","#F25623","#8C8C8C","#C8401A"]`; default de schema `@default("#171717")` en AMBOS schemas; SQL de remapeo para filas existentes.

- [ ] **Step 1:** Actualizar picker, defaults de ambos schemas y hex del seed (`#2CAA20→#F25623`, `#F2B814→#F25623`, `#1E8C16→#C8401A`).
- [ ] **Step 2:** Escribir `scripts/rebrand-colors.sql` con `UPDATE` por cada campo `color` (revisar los 2 campos del schema) mapeando: `'#2E8BD0','#0C2340'→'#171717'`; `'#4FA9E8','#2CAA20','#F2B814'→'#F25623'`; `'#1E8C16'→'#C8401A'`; `'#64748B'→'#4D4D4D'`. Se ejecutará en staging tras el deploy.
- [ ] **Step 3:** `npx prisma generate` + `npx vitest run` (los tests que sembraban colores viejos pueden fallar → se arreglan en Task 9). Commit — `feat(brand): colores de curso y defaults de DB a la paleta nueva`

### Task 8: Landing pública + orb WebGL + landing.css

**Files:**
- Modify: `public/site/index.html` (vars líneas ~11-386, `<link>` de fuentes, SVGs del escudo líneas 394-405/467/549-552, CTA copy)
- Modify: `public/site/orb.js` (constantes GLSL ~29-35)
- Modify: `public/site/landing.css`

**Interfaces:**
- Consumes: tabla de mapeo. Estructura/animaciones/JS NO cambian — solo valores.

- [ ] **Step 1 `index.html`:** vars → `--navy:#171717; --ink:#171717; --sky:#F25623; --sky-hi:#F8987A; --sky-lo:#C8401A; --pale:#FDE7DE; --offwhite:#F7F7F7; --paper:#FFFFFF`. Fuentes: quitar `Archivo+Expanded` del `<link>` (dejar `Inter:wght@400;500;600;700;800`), `--display:'Inter',…` y en los estilos de titulares display añadir `font-weight:800; letter-spacing:-0.03em; font-style:normal`. SVG escudos: `fill #0C2340→#171717`; el texto del lockup `#7FC8F2→#171717` sobre claro / `#FFFFFF` sobre oscuro (escudo monocromo). CTA principal → texto "Inscríbete ahora" (mantener href).
- [ ] **Step 2 `orb.js`:** constantes GLSL → `NAVY vec3(0.090,0.090,0.090)`, `INK vec3(0.051,0.051,0.051)`, `SKY vec3(0.949,0.337,0.137)`, `SKYHI vec3(0.973,0.596,0.478)`, `PALE vec3(0.992,0.906,0.871)`, `OFF vec3(0.969,0.969,0.969)`, `WHITE` igual. Actualizar fallback CSS `.glow` si tiene rgba azules.
- [ ] **Step 3 `landing.css`:** `--amber:#F25623; --amber-hi:#C8401A; --grad:linear-gradient(100deg,#F25623 0%,#C8401A 100%); --green:#F25623; --black:#171717` (paneles `#1F1F1F`/`#242424`, grises `#A1A1AA→#8C8C8C`, `#71717A→#6B6B6B`).
- [ ] **Step 4:** Abrir `/` en dev: verificar orb naranja/negro renderizando, tipografía Inter en titulares, las 3 rutas SPA (`#route-home/resultados/nosotros`), y `prefers-reduced-motion` fallback. Commit — `feat(brand): landing + orb GLSL al Brand Book (autorizado por Wilser)`

### Task 9: Tests existentes + certificado + barrido final

**Files:**
- Modify: `tests/screens.test.ts` (10 asserts), `tests/ui-cursos-clases.test.ts` (2), `tests/ui-shell-dashboard.test.ts` (1)
- Modify: `app/lib/scr-certificate.ts` (verificación visual del sello con gold→naranja)

**Interfaces:**
- Consumes: los asserts esperan ahora `#F25623` (ex-verde y ex-oro) y `#C8401A` según el caso.

- [ ] **Step 1:** Actualizar los 13 asserts a los valores nuevos (correr cada test para confirmar el valor que renderiza).
- [ ] **Step 2:** Abrir el certificado en dev (pantalla `certificate` + `window.print()` preview): sello con anillos naranja sobre negro debe verse digno; si el `color-mix` con `--otr-pale` quedó sucio, ajustar a `#FDE7DE`.
- [ ] **Step 3:** `npx vitest run tests/brand-palette.test.ts` → **VERDE** (cero violaciones). Suite completa `npx vitest run` → verde. Commit — `test(brand): asserts a la paleta nueva; guardián en verde`

### Task 10: Docs de marca

**Files:**
- Modify: `docs/CONVENTIONS.md` (sección Diseño/marca + nota de landing), `BRAND.md` (reescribir a V1.0), `README.md` (párrafo de marca)

- [ ] **Step 1:** CONVENTIONS: paleta nueva con hex, botón primario negro, naranja único acento, radios 8/12, Inter única; landing: "rebrandeada 2026-08-07 con autorización explícita; estructura sigue congelada". BRAND.md = resumen fiel del Brand Book V1.0 (paleta, tipografía, radios, escudo, voz). README: actualizar mención de paleta.
- [ ] **Step 2:** Commit — `docs(brand): CONVENTIONS/BRAND/README al Brand Book V1.0`

### Task 11: Verificación completa (gate) + PR + merge + deploy

**Files:** (ninguno nuevo; ejecución y evidencia)

- [ ] **Step 1: Suite completa:** `npx tsc --noEmit` && `npx eslint .` && `npx vitest run` && `npm run build` — TODO verde (pegar output real).
- [ ] **Step 2: Clicks en superficie real (dev):** landing `/` (3 rutas + orb), `/aula` login de los 4 roles demo (student/coach/parent/admin), dashboard, curso, lección, marketplace, listado institucional, certificado, `/consulta` flujo completo, `/p/[slug]`, 404, pantalla vecina sin cambios esperados. Screenshot de landing + dashboard + email de prueba como evidencia.
- [ ] **Step 3:** Push de rama, PR a main con resumen + screenshots, merge declarando `SUITE_VERDE=si` y `CLICKS_VERIFICADOS=si` (SOLO si es verdad).
- [ ] **Step 4:** Push a main dispara CI→ghcr→VPS staging (cron 2 min). Verificar paridad y clicks en `https://2.25.205.214.sslip.io` (landing + login + dashboard). Ejecutar `scripts/rebrand-colors.sql` en la DB de staging por SSH. Reportar lo VISTO y lo que quedó sin ver.
