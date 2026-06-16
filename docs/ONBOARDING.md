# ONBOARDING — OTR Academy
**16 jun 2026.** De cero a tu primer cambio desplegado. Empareja con `SYSTEM_MAP.md` (qué es) y `CONVENTIONS.md` (cómo se hace + gotchas).

## 1. Qué es (30 segundos)
Monolito **Next.js 15** que sirve: la landing (estática, congelada), el **Aula** (SPA vanilla en `app/lib/scr-*.ts` montada por `app/components/Aula.tsx`) y una **API** (53 rutas en `app/api/**`) sobre **Prisma + PostgreSQL**. LMS + marketplace de coaching de debate.

## 2. Levantar en local (dev)
```bash
git clone <repo> && cd OTR_Academy
npm install                      # postinstall corre prisma generate (schema SQLite dev)
cp .env.example .env             # AUTH_SECRET (>=16 chars), DATABASE_URL="file:./dev.db"
npx prisma db push               # crea el SQLite local
SEED_PASSWORD=dev1234 npm run db:seed   # datos demo (password = el que pongas)
npm run dev                      # → http://localhost:3000 (landing) · /aula (la app)
```
Verificación rápida: `npx tsc --noEmit` (debe pasar) · `npm run build` (debe compilar).
> **Gotcha:** en dev usas SQLite (`prisma/schema.prisma`); prod es Postgres (`prisma/schema.postgres.prisma`). Si editas el schema, **edita los DOS** (ver CONVENTIONS §gotcha 1).

## 3. Mapa mental para ubicarte
| Quiero tocar… | Mira en… |
|---|---|
| Una pantalla del Aula (alumno/profesor/admin) | `app/lib/scr-*.ts` (+ `screens.ts` para la ruta) |
| El router / modales / handlers del SPA | `app/components/Aula.tsx` |
| Datos que ve el cliente (hotpath) | `app/lib/queries.ts` (`getAppData`) |
| Una API | `app/api/<recurso>/route.ts` (helpers en `app/lib/api.ts`) |
| El modelo de datos | `prisma/schema.postgres.prisma` (48 modelos) |
| Auth / permisos | `app/lib/auth.ts`, `auth-crypto.ts`, `authz.ts` |
| Deploy / ops | `.github/workflows/deploy.yml`, `scripts/*.sh`, `DEPLOY.md` |

## 4. Tu primer cambio (flujo completo)
1. `git checkout -b fix/<algo>` desde `main`.
2. Edita. Mantén el estilo del archivo. Si tocas lógica con datos/dinero, **añade un test** (hoy hay 0 — sé el primero; usa `vitest`).
3. `npx tsc --noEmit && npm run build` → deben pasar (es lo que gatea el CI).
4. Commit en Conventional Commits: `fix(scope): qué`.
5. Push. **`main` despliega solo** (CI → ghcr → el VPS baja la imagen en ≤2 min). Para una feature, abre PR (cuando haya 2º dev) o mergea a main si eres el único dev.
6. Verifica en staging: `https://2.25.205.214.sslip.io/aula`.

## 5. Operación (lo mínimo)
- **Logs de deploy:** `ssh … 'tail /var/log/otr-deploy.log'`. **Backups:** `/opt/otr/backups/` (cron 03:00, `/var/log/otr-backup.log`).
- **Recuperar la BD:** `gunzip -c /opt/otr/backups/otr-<ts>.sql.gz | docker compose exec -T postgres psql -U <user> -d <db>`.
- **Acceso SSH:** llave `~/.ssh/otr_vps_ed25519` (ver memoria del proyecto). VPS staging = `2.25.205.214`. **No tocar el VPS de producción ajeno** (187.124.251.163).

## 6. Riesgos conocidos / no te sorprendas
- 0 tests, `strict:false`, sin migraciones versionadas (se usa `db push`). Ver `AUDIT.md`/`ACTION_PLAN.md`.
- Pagos/correo/video **simulados** (sin llaves). La sala de video **no existe aún** (`/aula?room=` da pantalla en blanco).
- Bus factor = 1: si algo no está aquí documentado, pregunta y **escríbelo** (deja el repo mejor que como lo encontraste).
