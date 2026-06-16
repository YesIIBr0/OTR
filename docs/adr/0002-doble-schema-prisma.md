# ADR-0002 — Doble schema Prisma (SQLite dev / PostgreSQL prod)
**Estado:** Aceptado (con deuda) · **Fecha:** 2026-06

## Contexto
Se quiere desarrollo local sin levantar Postgres, pero producción necesita Postgres (concurrencia, tipos, escala).

## Decisión
Mantener **dos schemas**: `prisma/schema.prisma` (provider `sqlite`, dev) y `prisma/schema.postgres.prisma` (provider `postgresql`, prod). El build de CI hace `cp schema.postgres.prisma schema.prisma` antes de `prisma generate`.

## Consecuencias
- **+** Dev local instantáneo (un archivo SQLite), sin dependencias.
- **−** **Trampa grave:** hay que editar los DOS schemas idénticos a mano; olvidarlo = drift. Y si se hace rsync de `schema.prisma` (SQLite) al VPS, Prisma queda en SQLite → "Unable to open database file (code 14)" aunque `DATABASE_URL` sea Postgres.
- **−** Diferencias sutiles SQLite vs Postgres (p.ej. `mode:"insensitive"` no existe en el client SQLite) → el código debe escribirse para el denominador común.
- **Alternativa recomendada (DEV-1 en ACTION_PLAN):** single source of truth — solo el schema Postgres, y dev usa Postgres en Docker Compose local. Elimina la clase entera de bugs de drift. Pendiente de priorización.
