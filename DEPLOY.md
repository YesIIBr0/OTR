# Despliegue de OTR Academy en Hostinger (VPS)

## ⚡ Inicio rápido (escenario: el Hub REEMPLAZA otr-academy.com)

**1) Consigue el VPS.** En Hostinger → **VPS (KVM)**, plantilla **Ubuntu 24.04**.
Recomendado: **KVM 2** (2 vCPU · 8 GB RAM · 100 GB) — sobra para cientos de alumnos.
Mínimo viable: **KVM 1** (1 vCPU · 4 GB). Anota la **IP pública**.

**2) Apunta el DNS de tu dominio al VPS** (en el panel donde gestionas otr-academy.com):
   - Registro **A**  `@`   → `IP_DEL_VPS`
   - Registro **A**  `www` → `IP_DEL_VPS`
   *(Esto "reemplaza" el sitio actual: la nueva landing pasa a ser la principal.)*

**3) Un solo comando en el VPS:**
```bash
ssh root@IP_DEL_VPS
apt-get update -y && apt-get install -y git
git clone <URL_DE_TU_REPO> otr && cd otr
sudo DOMAIN=otr-academy.com CERTBOT_EMAIL=tu@correo.com bash scripts/bootstrap-vps.sh
```
Eso instala Docker, **genera los secretos**, levanta la app + PostgreSQL, aplica el
esquema, **siembra el contenido real**, configura Nginx y emite **HTTPS**.
Al terminar: `https://otr-academy.com` (landing) y `https://otr-academy.com/aula`.

**4) Activar después (cuando tengas las llaves)** — edita `.env.production` y `docker compose --env-file .env.production up -d`:
   - **Email real:** crea un buzón en Hostinger (ej. `no-reply@otr-academy.com`) y pon
     `SMTP_URL="smtps://no-reply@otr-academy.com:CONTRASEÑA@smtp.hostinger.com:465"`
   - **Video por CDN (Cloudflare Stream):** rellena `CLOUDFLARE_*` (ya está cableado, hoy apagado).
   - **Pagos (Stripe):** rellena `STRIPE_SECRET_KEY` y `STRIPE_WEBHOOK_SECRET`.

> ⚠️ Importante: al reemplazar el dominio, la antigua página `/book-your-consultation/`
> deja de existir. Los botones del landing ahora apuntan a `/aula` (inscripción dentro
> del Hub). Si tienes un agendador real (Calendly/WhatsApp), dímelo y lo cableo.

---

## Guía detallada

Para poner **OTR Academy** (Next.js 15 + Prisma + PostgreSQL) en
producción sobre un **VPS de Hostinger** (Ubuntu 22.04+). Hay dos caminos:

- **Opción A — PM2 + Postgres del sistema** (recomendado para un VPS estándar).
- **Opción B — Docker Compose** (la app y Postgres en contenedores). El script de
  inicio rápido de arriba usa esta opción.

> La app del LMS vive en `/aula`. La raíz `/` sirve la landing estática
> (`public/site/`). Login demo tras el seed: `saul@otr.do` (coach) y
> `analia.reyes@otr.do` (estudiante), contraseña `otr1234`.

---

## 0. Requisitos del VPS

```bash
# Conéctate por SSH
ssh root@TU_IP_VPS

# Node 20 LTS (vía nvm o nodesource)
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs git

# Comprueba
node -v   # v20.x
npm -v
```

---

## 1. Clonar el repositorio

```bash
cd /var/www
git clone https://TU-REPO/otr-academy.git otr
cd otr
```

---

## 2. Variables de entorno de producción

```bash
cp .env.production.example .env.production
nano .env.production
```

Rellena al menos:

- `DATABASE_URL` — cadena de conexión a PostgreSQL.
- `AUTH_SECRET` — genera uno fuerte: `openssl rand -hex 32`.
- `APP_URL` — la URL pública (p. ej. `https://aula.otr-academy.com`).
- `SMTP_URL` — si quieres correos de recuperación reales (si no, se loguean).
- `STRIPE_*` y `CLOUDFLARE_*` — opcionales.

> **Importante:** asegúrate de que `.env.production` esté en `.gitignore`
> (añade la línea `.env.production` si no está) para no comitear secretos.

Carga las variables en la sesión actual del shell:

```bash
set -a && . ./.env.production && set +a
```

---

## 3. Cambiar el esquema a PostgreSQL

El esquema activo (`prisma/schema.prisma`) usa SQLite para desarrollo. En el
servidor, **sustitúyelo** por la versión PostgreSQL (idéntica, solo cambia el
`provider`):

```bash
cp prisma/schema.postgres.prisma prisma/schema.prisma
```

---

## 4. Instalar dependencias y generar el cliente Prisma

```bash
npm ci
# `postinstall` ya ejecuta `prisma generate`, pero lo forzamos por si acaso:
npx prisma generate
```

---

## 5. Base de datos PostgreSQL

### Opción A — Postgres del sistema

```bash
apt-get install -y postgresql
sudo -u postgres psql <<'SQL'
CREATE DATABASE otr_aula;
CREATE USER otr WITH ENCRYPTED PASSWORD 'CAMBIA_ESTA_CONTRASENA';
GRANT ALL PRIVILEGES ON DATABASE otr_aula TO otr;
ALTER DATABASE otr_aula OWNER TO otr;
SQL
```

Ajusta `DATABASE_URL` en `.env.production` con esa contraseña.

### Aplicar el esquema

Si tienes carpeta `prisma/migrations` versionada:

```bash
npm run db:migrate        # = prisma migrate deploy
```

Si **no** hay migraciones (proyecto sin historial de migraciones), empuja el
esquema directamente:

```bash
npm run db:push           # = prisma db push
```

### Cargar los datos reales (solo la primera vez)

```bash
npm run db:seed           # carga el contenido OTR (idempotente)
```

> El seed es **idempotente**: borra y vuelve a sembrar en orden seguro por FKs.
> No lo ejecutes en producción una vez que haya datos reales de usuarios.

---

## 6. Compilar la app

```bash
npm run build
```

---

## 7. Arrancar con PM2 (Opción A)

```bash
npm i -g pm2
mkdir -p logs

# Carga las variables y arranca:
set -a && . ./.env.production && set +a
pm2 start ecosystem.config.cjs

pm2 save           # guarda el set de procesos
pm2 startup        # genera el servicio de arranque (ejecuta el comando que imprime)
pm2 logs otr       # ver logs en vivo
```

La app queda escuchando en `127.0.0.1:3000`.

---

## 8. Nginx como reverse proxy + HTTPS (certbot)

```bash
apt-get install -y nginx
nano /etc/nginx/sites-available/otr
```

```nginx
server {
    listen 80;
    server_name aula.otr-academy.com;

    # Tamaño máximo de subida (coincide con el límite de 50MB de /api/uploads)
    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
ln -s /etc/nginx/sites-available/otr /etc/nginx/sites-enabled/otr
nginx -t && systemctl reload nginx

# Certificado TLS gratuito
apt-get install -y certbot python3-certbot-nginx
certbot --nginx -d aula.otr-academy.com
```

Certbot edita el server block para servir en HTTPS y renueva automáticamente.

---

## 9. Persistencia de archivos subidos

Los archivos que suben los usuarios se guardan en `public/uploads/` (servidos
por Next en `/uploads/...`). **No se versionan en git** y deben sobrevivir a los
redeploys:

- **Opción A (PM2):** el directorio ya persiste en disco; solo asegúrate de no
  borrarlo en los redeploys. Para mayor seguridad, móntalo en un volumen/disco
  aparte y enlázalo:
  ```bash
  mkdir -p /var/otr-uploads
  rm -rf public/uploads && ln -s /var/otr-uploads public/uploads
  mkdir -p /var/otr-uploads && touch /var/otr-uploads/.gitkeep
  ```
- **Opción B (Docker):** ya está cubierto por el volumen `otr_uploads` en
  `docker-compose.yml`.

Haz **backup periódico** de `public/uploads/` y de la base de datos
(`pg_dump otr_aula`).

---

## Opción B — Despliegue con Docker Compose

Si prefieres contenedores (la app + Postgres juntos):

> ⚠️ Usa SIEMPRE `--env-file .env.production` en cada comando de compose. Sin él,
> docker-compose ignora tu `.env.production` y arranca Postgres con la contraseña
> por defecto insegura (`otr`). Es la fuente nº1 de errores de "password authentication failed".

```bash
cd /var/www/otr
cp .env.production.example .env.production && nano .env.production
cp prisma/schema.postgres.prisma prisma/schema.prisma

# Construye y arranca (web + postgres) — SIEMPRE con --env-file
docker compose --env-file .env.production up -d --build

# Aplica el esquema y siembra (dentro del contenedor web)
docker compose --env-file .env.production exec web npx prisma db push --skip-generate
docker compose --env-file .env.production exec -e SEED_FORCE=1 web npm run db:seed

docker compose --env-file .env.production logs -f web
```

La app queda en `127.0.0.1:3000` → pon Nginx + certbot delante (paso 8).
Postgres persiste en el volumen `otr_pgdata`; las subidas en `otr_uploads`.

---

## 10. Redeploys (actualizar la app)

```bash
cd /var/www/otr
git pull

# Mantén el provider de Postgres tras el pull (schema.prisma vuelve a SQLite):
cp prisma/schema.postgres.prisma prisma/schema.prisma

npm ci
npx prisma generate
npm run db:migrate        # o db:push si no usas migraciones
npm run build

# PM2:
pm2 reload otr
# Docker:
# docker compose up -d --build
```

> **No** ejecutes `npm run db:seed` en redeploys: borraría los datos reales.

---

## 11. Checklist de salud

- [ ] `https://aula.otr-academy.com/` muestra la landing.
- [ ] `https://aula.otr-academy.com/aula` carga el LMS.
- [ ] Login con `saul@otr.do` / `analia.reyes@otr.do` (pass `otr1234`).
- [ ] Subir un audio/PDF en una entrega persiste en `public/uploads/`.
- [ ] `pm2 logs otr` (o `docker compose --env-file .env.production logs web`) sin errores.
- [ ] Backup de BD (`pg_dump`) y de `public/uploads/` programado.

---

## Variables de entorno (referencia rápida)

| Variable | Obligatoria | Descripción |
|---|---|---|
| `DATABASE_URL` | sí | Cadena de conexión PostgreSQL. |
| `AUTH_SECRET` | sí | Secreto HMAC de sesión (≥16 chars). |
| `APP_URL` | recomendada | URL pública (enlaces de email). |
| `SMTP_URL` | no | SMTP para correos reales; si falta, se loguean. |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | no | Pagos de programas. |
| `CLOUDFLARE_*` | no | Video protegido vía Cloudflare Stream. |
| `PORT` | no | Puerto de escucha (default 3000). |
