# CONVENTIONS — OTR Academy
**16 jun 2026.** Convenciones detectadas en el repo + las trampas (gotchas) que hoy solo conoce el dev. Léelo antes de tocar nada.

## Git & commits
- **Conventional Commits** (obligatorio, ya es el estándar de facto): `tipo(scope): mensaje`. Tipos usados: `feat`, `fix`, `docs`, `chore`. Scopes reales: `authoring`, `seguridad`, `deploy`, `ops`, `authz`. Ej: `feat(authoring): creador de cursos v2`.
- **Ramas:** trunk-based. `main` es la rama de release (cada push despliega). Trabajo en `feat/*`, `fix/*`, `cto-audit/*`. **No reescribir historia de ramas compartidas.**
- **Hoy no hay PR review** (1 dev). Al sumar un 2º dev: activar branch protection + PR obligatorio (ver `TEAM_PROCESS.md`).

## Estilo de código
- **TypeScript** en todo (`strict: false` hoy — deuda). Las pantallas del Aula (`app/lib/scr-*.ts`) llevan `// @ts-nocheck` por diseño (son templates string vanilla).
- **Sin prettier/eslint dedicados**; se usa `next lint`. Mantén el estilo del archivo que tocas (densidad de comentarios, naming, idioma de comentarios = español).
- Helpers de API: usa siempre `ok()/bad()/readJson()/clean()/safeUrl()/safeVideoUrl()/clientIp()` de `app/lib/api.ts`. Texto de usuario → `esc()`. HTML de usuario → `sanitizeHtml()` antes de persistir.

## ⚠️ GOTCHAS CRÍTICOS (causan bugs difíciles si no los sabes)
1. **Doble schema Prisma.** `prisma/schema.prisma` = SQLite (dev); `prisma/schema.postgres.prisma` = Postgres (prod). **Edita SIEMPRE los DOS idénticamente.** El build de CI hace `cp schema.postgres.prisma schema.prisma` antes de compilar. **NUNCA hagas rsync de `schema.prisma` (SQLite) al VPS** → rompe Postgres con "Unable to open database file (code 14)". (Ver ADR-0002.)
2. **La SPA "Aula"** no es React: son templates string en `app/lib/scr-*.ts`, registrados en `screens.ts` (ROUTES/SCREENS), montados por `app/components/Aula.tsx`. Estado global mutable en `window.DB`. Handlers: genéricos en el `onClick` delegado de `Aula.tsx` (por `data-*`), específicos de una pantalla en su `mount()`. Tras mutar → `refresh()` re-pide `/api/app-data` y re-renderiza.
3. **Deploy = solo `git push` a main.** No se despliega a mano. CI construye la imagen → ghcr → el VPS la baja por cron (`vps-pull.sh`, cada 2 min, `down+up` + `db push` + healthcheck). Cambios de **schema** se aplican con `prisma db push` en el deploy (no hay migraciones versionadas todavía — ver ADR y ACTION_PLAN DATA-5).
4. **`public/site/`** = landing pública. **Rebrandeada al Brand Book V1.0 el 2026-08-07 con autorización explícita de Wilser** (solo colores, tipografía y copy clave). Su **ESTRUCTURA y lógica siguen congeladas**: no tocar el HTML estructural, las animaciones ni el JS (incluido el orb WebGL) sin pedido explícito. OJO: distinto de `site/` (raíz) que es basura legacy eliminable.
5. **El seed es DESTRUCTIVO** (borra todo). Guard de producción: exige `SEED_ALLOW_PROD=1` además de `SEED_FORCE=1`. Password demo via `SEED_PASSWORD` o aleatoria impresa (ya no `otr1234`).
6. **Secretos** (`.env.production`) viven SOLO en el VPS (gitignored). El repo es **público** — nunca commitear secretos.

## Diseño / marca
Sistema vigente: **OTR Brand Book V1.0 (2026) + estética del mockup aprobado 2026-08-07** (spec exacto en
`docs/superpowers/specs/2026-08-07-dashboard-mockup-spec.md`). Fuente de verdad de los valores: `app/styles/tokens.css`.
Resumen de marca en `BRAND.md`.

- **Paleta:** negro `#171717` · blanco `#FFFFFF` · naranja `#F25623` como **único acento**, sobre grises fríos de texto (`#4D4D4D`, `#DEDEDE`…) y un **canvas greige cálido** `#F1F1EF` con bordes `#E4E3DF`/`#DCDBD6` y superficies `#FFFFFF`/`#FBFBFA` (estética mockup). Apoyos del naranja: `#CC3F13` (dark), `#F7A98C`/`#F8987A` (soft), `#FDE7DE` (tinte), `#9E3211` (texto AA — `#CC3F13` da 4.33:1 sobre greige y NO alcanza AA en texto pequeño). **Sin verde, sin oro, sin azul, sin ámbar.**
- **Acento (regla del mockup, deroga la "una pieza por vista"):** naranja generoso — barras de sección, badges, filas en vivo, datos, podios. **Texto sobre naranja SIEMPRE negro** (`--text-on-accent:#171717`). Conviven botón primario negro y botón acento naranja (texto negro).
- **Estados y niveles dentro de la paleta:** `--ok:#171717`/`#EFEFEF` · `--warn:#F25623`/`#FDE7DE` · `--danger:#C8401A`/`#FBDDD2` · `--info:#4D4D4D`/`#EFEFEF`. Niveles: novato `#BDBDBD` → jv `#8C8C8C` → varsity `#4D4D4D` → strategist `#171717` → elite `#F25623`.
- **Tipografía:** **Inter única familia** en todo el sistema (UI, marca y landing). Titulares extrabold **800** con tracking **-0.03em** (`--track-tight`; `-0.035em` en display grande). Cuerpo 15–16px, base UI 14px. Mayúsculas solo en eyebrows con tracking; el resto en **sentence case**.
- **Radios (mockup):** badges **3px** (`--r-xs`), botones **4px** (`--r-sm`), tiles **5px** (`--r-md`), contenedores **6px** (`--r-lg`); pill solo para círculos/avatares — **cero pills en chips y badges**. **Sombra única** `0 1px 2px rgba(23,23,23,.05)` (+ glow naranja solo en CTA/hero).
- **Shell:** top-nav sticky de 62px (sin sidebar en desktop); main `max-width:1256px`. Kit de componentes del mockup en `screens.css` ("KIT MOCKUP 2026-08"): `.sec-title`, `.chip chip--*`, `.btn btn-*` (variantes llevan la geometría), `.card--dark`, `.evrow`, `.date-box`, `.stat-inline`, `.ring`, `.page-head--rule`.
- **Escudo monocromo siempre:** un solo color según el fondo (negro sobre claro, blanco sobre oscuro o naranja). `otrCrest({ ink, paper })` en `app/lib/icons.ts` lo parametriza. Nunca a color sobre fondo de color, nunca sombras ni degradados en el escudo.
- **Iconos:** familia Lucide-style, trazo 2px, `currentColor` (`app/lib/icons.ts`). **Sin emoji** en UI ni en copy.
- **Copy de marca:** nombre visible **"OTR Debating Academy"**; CTA estrella **"Inscríbete ahora"**.
- **Enforcement:** el test guardián `tests/brand-palette.test.ts` escanea `app/`, `public/site/` y `prisma/` y **falla** si aparece cualquier hex de la paleta pre-rebrand (crema/verde/oro/navy) o `Archivo Expanded`. Si necesitas un color nuevo, sale de la rampa de arriba — no lo agregues al margen.

## Roles
`STUDENT | PARENT | TEACHER | COACH | ADMIN` (String libre, no enum — deuda SEC-3). Authz por propiedad de recurso en `app/lib/authz.ts` (ADMIN bypass).
