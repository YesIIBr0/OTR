# SYSTEM MAP — OTR Debate Academy ("el Aula")
**Fase 0 · CTO Protocol · 15 jun 2026 · rama `cto-audit/recon`** — verificado contra el código en disco.

## 1. Qué es (onboarding en lenguaje llano)
OTR Academy es un **LMS + marketplace de coaching de debate y oratoria** para estudiantes (RD + diáspora US). Un **monolito Next.js** sirve tres cosas desde un solo proceso:
1. La **landing** pública (estática, congelada en `public/site/`, servida por un rewrite de Nginx/Next).
2. El **Aula** (`/aula`): una **SPA vanilla-JS** renderizada con *string-templates* (`app/lib/scr-*.ts`) y montada por un único componente React (`app/components/Aula.tsx`). Toda la app de alumno/profesor/admin/familia vive aquí.
3. Una **API REST** (53 rutas `app/api/**/route.ts`) sobre **Prisma + PostgreSQL**.

Roles: **STUDENT** (gamificación, progreso, debate, certificados), **TEACHER/COACH** (autoría de cursos, marketplace, calificar), **PARENT** (portal de familia, consentimiento de menores), **ADMIN** (moderación, gestión de usuarios).

## 2. Stack (verificado: `package.json`, `Dockerfile`)
| Capa | Tecnología |
|---|---|
| Framework | **Next.js `^15.1.6`** (App Router) · **React `^19`** · **TypeScript `5.7.3`** |
| Runtime | **Node 20-alpine** (`Dockerfile:10`) |
| ORM / BD | **Prisma `6.19.3`** → **PostgreSQL 16** (prod) / **SQLite** (dev) — doble schema |
| Deps prod (7) | `@prisma/client`, `next`, `react`, `react-dom`, `nodemailer`, `sanitize-html`, `stripe` |
| Infra | Docker Compose (web + `postgres:16-alpine`) · Nginx reverse proxy · HTTPS Let's Encrypt |

**Escala del código:** ~17.6k LOC en `app/`, 53 rutas API, 19 pantallas SPA (`scr-*.ts`, casi todas `@ts-nocheck`), 48 modelos Prisma, **2 componentes React** (`Aula.tsx` 813 LOC, `Auth.tsx`).

## 3. Arquitectura — componentes y conexiones
```
                        Internet (HTTPS)
                              │
                       ┌──────▼──────┐  VPS Hostinger (1 vCPU / 3.8GB + swap)
                       │    Nginx    │  80/443 → 127.0.0.1:3000 · rewrite "/" → /site/index.html
                       └──────┬──────┘
              ┌───────────────▼────────────────┐
              │  Next.js standalone (1 proceso) │
              │  ┌──────────┬──────────────────┐│
              │  │ Landing  │  /aula (SPA)      ││  SPA: screens.ts (router ROUTES/SCREENS)
              │  │ public/  │  Aula.tsx monta   ││       → 19 scr-*.ts (string-templates)
              │  │ site/    │  19 scr-*.ts      ││  Estado cliente: window.DB (global mutable)
              │  └──────────┴────────┬─────────┘│
              │   53 rutas /api/** ──┤           │
              └──────────┬───────────┴──────────┘
                  Prisma │ (db.ts singleton)        Externos (HOY casi todos simulados):
              ┌──────────▼──────────┐   ┌──────────────────────────────────────┐
              │  PostgreSQL 16      │   │ Stripe (checkout/webhook) · simulado  │
              │  48 modelos         │   │ nodemailer/SMTP (mail.ts) · a consola │
              │  vol Docker otr_pgdata│  │ Cloudflare Stream (video) · sin llave │
              └─────────────────────┘   └──────────────────────────────────────┘

CI/CD: push→GitHub Actions (ci gate: npm ci + prisma validate ×2 + tsc) → build+push ghcr →
       cron VPS-pull cada 2 min (docker compose down+up --remove-orphans + prisma db push + healthcheck)
Backup: cron 03:00 → scripts/backup-db.sh (pg_dump local + rotación 14d) — falta offsite
```
**SPOF (punto único de fallo):** todo (web + Postgres) en **un VPS de 1 vCPU**, sin réplica.

## 4. Datos, integraciones, auth, config
- **Almacén:** PostgreSQL 16 (volumen Docker `otr_pgdata`). **48 modelos** en `prisma/schema.postgres.prisma`. **No hay `prisma/migrations/`** → deploy con **`prisma db push`** (sin historial ni rollback de esquema).
- **Externos:** Stripe (`app/api/checkout`, `app/api/stripe/webhook` — `COURSE_SALES_ENABLED=false`, simulado), nodemailer (`app/lib/mail.ts` — sin `SMTP_URL` escribe a consola), Cloudflare Stream (`app/lib/video.ts` — sin llave, iframe público).
- **Auth:** cookie `otr_session` HMAC firmada (`app/lib/auth.ts` + `auth-crypto.ts`, scrypt + `timingSafeEqual`); `getSessionUser()` relee el User fresco por request e invalida si `suspended` o cambia el password (fingerprint). Roles = `String` libre (no enum). Authz por propiedad: `authz.ts` (`teacherOwnsCourse/Module/Lesson`, ADMIN bypass).
- **Config/secretos:** `.env.production` SOLO en el VPS (gitignored); solo `.env.example`/`.env.production.example` trackeados. **Repo GitHub PÚBLICO** (sin secretos filtrados, verificado).

## 5. Build / Run / Deploy (verificado, corrido)
| Acción | Comando | Resultado |
|---|---|---|
| Build | `npm run build` (next build) | ✅ **OK (exit 0)** · `/aula` = **206 kB First Load JS** |
| Typecheck | `npx tsc --noEmit` | ✅ **OK (exit 0)** |
| Tests | — | ⚠️ **0 archivos** de test (`*.test.*`/`*.spec.*` = 0) |
| Lint | `next lint` | sin config eslint dedicada |
| `npm audit` (prod) | — | ⚠️ **2 vulnerabilidades moderadas** (postcss vía Next) |
| Deploy | push a `main` → CI → ghcr → cron VPS-pull | down+up determinista + `db push` + healthcheck |
| Backup | cron 03:00 `scripts/backup-db.sh` | pg_dump local + rotación 14d (falta offsite) |

## 6. Rutas críticas (trazadas)
- **Request lifecycle:** Nginx → Next standalone → `/aula` (SSR del shell + `getAppData()` para los datos) → SPA hidrata `window.DB` y enruta por `renderApp()`; mutaciones → `fetch /api/*` → `refresh()` re-pide `/api/app-data` completo.
- **Data flow (hotpath):** `app/lib/queries.ts::getAppData()` (**1441 LOC**) ejecuta **~35 consultas en 4 `Promise.all`** y arma el objeto `DB` que consumen todas las pantallas. Sin caché ni lazy-load.
- **Auth flow:** login (`/api/auth/login`, rate-limited por IP) → `setSession` (cookie HMAC) → cada request `getSessionUser()` revalida contra BD.
- **Deploy pipeline:** GitHub Actions (gate tsc+prisma) → imagen a ghcr → el VPS la baja por cron (sin SSH entrante).

## 7. Zonas de mayor RIESGO (churn alto + 0 tests)
`git log` — archivos más cambiados (= donde un cambio rompe más fácil, sin red de tests):
`Aula.tsx` (11) · `scr-extra.ts` (9) · `schema.prisma` (7) · `queries.ts` (7) · `scr-core.ts` (7) · `shell.ts` (6). **El builder de cursos (`scr-extra.ts`/`Aula.tsx`) y el hotpath de datos (`queries.ts`) son a la vez lo más tocado y lo más crítico → máxima prioridad de pruebas.**

## 8. Supuestos (a confirmar)
- `staging` = entorno **LIVE** de facto; **no existe un prod separado** todavía.
- El objetivo de escala (~3.000 usuarios) viene de `AUDIT.md`, no de tráfico real (hoy ~1 usuario real).
- `public/site/` (landing) es **inmodificable** (otro equipo).
- Dos auditorías previas de esta sesión (CTO + falta/sobra, en `~/Downloads/`) son insumo verificado para las Fases 1-2.

---
**→ STOP (frontera de Fase 0).** Confirma que este modelo del sistema es correcto antes de pasar a la Fase 1 (auditoría multi-lente). Deliverable: este archivo.
