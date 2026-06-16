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
4. **`public/site/`** = landing pública congelada (otro equipo). **NUNCA tocar.** OJO: distinto de `site/` (raíz) que es basura legacy eliminable.
5. **El seed es DESTRUCTIVO** (borra todo). Guard de producción: exige `SEED_ALLOW_PROD=1` además de `SEED_FORCE=1`. Password demo via `SEED_PASSWORD` o aleatoria impresa (ya no `otr1234`).
6. **Secretos** (`.env.production`) viven SOLO en el VPS (gitignored). El repo es **público** — nunca commitear secretos.

## Diseño / marca
- Sistema de diseño deriva del landing: **navy `#0C2340` + azul cielo `#4FA9E8/#2E8BD0`**, tipografía Inter. Botón primario navy, sky de acento. **Nada de ámbar.** Verde = éxito, amarillo = logro (no acción primaria).

## Roles
`STUDENT | PARENT | TEACHER | COACH | ADMIN` (String libre, no enum — deuda SEC-3). Authz por propiedad de recurso en `app/lib/authz.ts` (ADMIN bypass).
