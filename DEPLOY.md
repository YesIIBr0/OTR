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
> `analia.reyes@otr.do` (estudiante); la contraseña es la definida en `SEED_PASSWORD` (o la aleatoria que imprime el seed si no la fijaste).

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

Los archivos que suben los usuarios (entregas, grabaciones, avatares) se guardan en
`var/uploads/` (`UPLOAD_DIR`, **fuera** de `public/` y fuera de git) y se sirven por la
ruta autenticada `app/uploads/[...path]/route.ts`, **no** como estáticos de Next. Deben
sobrevivir a los redeploys:

- **Opción A (PM2):** `var/uploads/` ya persiste en disco; solo no lo borres en los
  redeploys. Para mayor seguridad móntalo en un disco aparte y enlázalo:
  ```bash
  mkdir -p /var/otr-uploads
  rm -rf var/uploads && ln -s /var/otr-uploads var/uploads
  touch /var/otr-uploads/.gitkeep
  ```
- **Opción B (Docker):** ya está cubierto por el volumen `otr_uploads` (montado en
  `/app/var/uploads`) en `docker-compose.yml`.

El **backup de estos archivos y de la base de datos está automatizado** (crons +
offsite) — ver la sección [Backups offsite y restauración](#backups-offsite-y-restauración).

---

## Backups offsite y restauración

El VPS es un **único punto de pérdida total**: app, Postgres, uploads y backups viven en
el mismo disco. Estos scripts cierran ese riesgo con copia local **y** offsite.

### Qué corre automáticamente

`bootstrap-vps.sh` instala tres crons en `/etc/cron.d/otr` (idempotente: se reescribe en
cada bootstrap, nunca duplica):

| Cron | Script | Qué hace | Rotación local |
|---|---|---|---|
| `0 3 * * *` | `scripts/backup-db.sh` | `pg_dump` gz de Postgres | 14 días |
| `30 3 * * *` | `scripts/backup-uploads.sh` | `tar.gz` del volumen `otr_uploads` (entregas, grabaciones, avatares) | 7 días |
| `*/2 * * * *` | `scripts/vps-pull.sh` | auto-deploy de la última imagen de ghcr | — |

Los backups quedan en `/opt/otr/backups/` y se registran en `/var/log/otr-backup.log`.
Tras cada dump local, si **rclone está configurado** se sube a un bucket remoto y **se
verifica** (`rclone check`), con rotación remota a 30 días. Si rclone **no** está
configurado, los scripts degradan con gracia: dejan el backup local, avisan en el log y
**no** rompen el cron.

### Activar offsite (una sola vez en el VPS) — Backblaze B2

Bucket ~1 USD/mes. Crea una **Application Key** en el panel de Backblaze (con acceso al
bucket) y corre en el VPS:

```bash
apt-get install -y rclone
# 1) Configura el remote 'otr-backups' (reemplaza los valores por los tuyos):
rclone config create otr-backups b2 account=TU_KEY_ID key=TU_APPLICATION_KEY
# 2) Crea el bucket (nombre de ejemplo; debe ser único global en B2):
rclone mkdir otr-backups:otr-academy-backups
# 3) Fija el destino para los crons (persistente, lo leen los scripts de backup):
echo 'OTR_BACKUP_REMOTE=otr-backups:otr-academy-backups' > /etc/otr-backup.env
# 4) Verifica que el remote responde:
rclone lsd otr-backups:
# 5) Prueba el backup completo (debe imprimir "subido y verificado"):
/opt/otr/scripts/backup-db.sh
```

### Activar offsite — Cloudflare R2 (alternativa, S3-compatible)

R2 no cobra egress. Crea un **API Token** de R2 (Access Key ID + Secret) y su
`ACCOUNT_ID` en el panel de Cloudflare, y corre:

```bash
apt-get install -y rclone
# 1) Remote 's3' apuntando al endpoint de R2 de tu cuenta:
rclone config create otr-backups s3 provider=Cloudflare \
  access_key_id=TU_ACCESS_KEY secret_access_key=TU_SECRET_KEY \
  endpoint=https://TU_ACCOUNT_ID.r2.cloudflarestorage.com
# 2) Crea el bucket:
rclone mkdir otr-backups:otr-academy-backups
# 3) Destino persistente para los crons:
echo 'OTR_BACKUP_REMOTE=otr-backups:otr-academy-backups' > /etc/otr-backup.env
# 4) Verifica y 5) prueba:
rclone lsd otr-backups:
/opt/otr/scripts/backup-uploads.sh
```

> Sin `/etc/otr-backup.env`, el default es `otr-backups:` (remote pelado, **sin** bucket):
> los scripts avisan y se quedan en backup local. Con B2/R2 el destino **debe** incluir el
> bucket, por eso el paso 3 es obligatorio.

### Restaurar la base de datos (probado)

```bash
cd /opt/otr
# 1) Elige el dump: el último local, o bájalo del offsite primero:
#    rclone copy otr-backups:otr-academy-backups/db/otr-YYYYMMDD-HHMMSS.sql.gz /opt/otr/backups/
DUMP=$(ls -1t /opt/otr/backups/otr-*.sql.gz | head -n1)
# 2) Restaura dentro del contenedor postgres (DROP+CREATE de objetos vía el dump):
gunzip -c "$DUMP" | docker compose --env-file .env.production exec -T postgres \
  sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
# 3) Reinicia la app para reconectar limpio:
docker compose --env-file .env.production restart web
```

### Restaurar los uploads (probado)

```bash
cd /opt/otr
# 1) Elige el tar (último local, o bájalo del offsite como arriba con .../uploads/):
TAR=$(ls -1t /opt/otr/backups/otr-uploads-*.tar.gz | head -n1)
# 2) Detecta el nombre real del volumen (compose lo prefija con el proyecto):
VOL=$(docker volume ls --format '{{.Name}}' | grep -E '(^|_)otr_uploads$' | head -n1)
# 3) Extrae el tar DENTRO del volumen (sobrescribe el contenido actual):
docker run --rm -v "$VOL":/data -v /opt/otr/backups:/backup:ro alpine \
  sh -c "cd /data && tar xzf /backup/$(basename "$TAR")"
```

> Prueba de humo del restore (recomendada antes de confiar en él): restaura en un stack de
> staging aparte y confirma login + que una entrega con adjunto abre el archivo.

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
- [ ] Login con `saul@otr.do` / `analia.reyes@otr.do` (pass = `SEED_PASSWORD`, o la aleatoria que imprimió el seed).
- [ ] Subir un audio/PDF en una entrega persiste en `var/uploads/` (volumen `otr_uploads`).
- [ ] `pm2 logs otr` (o `docker compose --env-file .env.production logs web`) sin errores.
- [ ] Crons de backup activos (`cat /etc/cron.d/otr`) y offsite configurado (`rclone lsd otr-backups:`).

---

## WhatsApp Business (Meta Cloud API) — bandeja del equipo

Fase 1: el equipo recibe y responde 1 a 1, desde el panel admin, los mensajes de un número
de WhatsApp Business real — sin usar la app de WhatsApp directamente. **No** incluye envío
masivo/broadcast (eso requiere plantillas pre-aprobadas por Meta; decisión de negocio
pendiente, fuera de alcance de esta fase).

Las 4 variables son **opcionales en runtime**: sin ellas, el webhook GET responde 403 (Meta
no logra verificar la URL) y enviar mensajes falla suave (`sendWhatsAppMessage` nunca lanza),
pero el resto de la app sigue funcionando con normalidad.

- `WHATSAPP_ACCESS_TOKEN` — token de acceso de la app de Meta (Graph API).
- `WHATSAPP_PHONE_NUMBER_ID` — ID del número de WhatsApp Business (Meta dashboard).
- `WHATSAPP_VERIFY_TOKEN` — token propio (inventado) que se configura también en el
  dashboard de Meta para el handshake de verificación del webhook.
- `WHATSAPP_APP_SECRET` — App Secret de Meta, usado para verificar la firma HMAC-SHA256 de
  cada webhook entrante (header `X-Hub-Signature-256`).

En el dashboard de Meta (WhatsApp → Configuration → Webhook), configura la URL:

```
https://TU-DOMINIO/api/whatsapp/webhook
```

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
| `WHATSAPP_ACCESS_TOKEN` / `WHATSAPP_PHONE_NUMBER_ID` / `WHATSAPP_VERIFY_TOKEN` / `WHATSAPP_APP_SECRET` | no | Bandeja de WhatsApp Business (Meta Cloud API). |
| `PORT` | no | Puerto de escucha (default 3000). |
