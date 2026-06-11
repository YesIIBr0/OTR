#!/usr/bin/env bash
# ============================================================
#  OTR Academy · bootstrap de VPS (Hostinger / Ubuntu 22.04+)
#  Un solo comando: deja la app + Postgres + Nginx + HTTPS lista.
#
#  Uso (en el VPS, dentro del repo ya clonado):
#     sudo DOMAIN=otr-academy.com CERTBOT_EMAIL=tu@correo.com bash scripts/bootstrap-vps.sh
#
#  Escenario por defecto: el Hub REEMPLAZA otr-academy.com
#  (sirve la landing en / y el Aula en /aula). www.otr-academy.com incluido.
#
#  Idempotente: puedes correrlo varias veces. NO sobrescribe un
#  .env.production existente (conserva tus secretos/llaves).
# ============================================================
set -euo pipefail

DOMAIN="${DOMAIN:-otr-academy.com}"
CERTBOT_EMAIL="${CERTBOT_EMAIL:-}"
APP_PORT="${APP_PORT:-3000}"
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_DIR"

say() { printf '\n\033[1;33m▸ %s\033[0m\n' "$*"; }
die() { printf '\n\033[1;31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || die "Corre con sudo/root (necesito instalar Docker, Nginx y certbot)."

# ---------- 1) Docker + Compose plugin ----------
if ! command -v docker >/dev/null 2>&1; then
  say "Instalando Docker…"
  curl -fsSL https://get.docker.com | sh
fi
if ! docker compose version >/dev/null 2>&1; then
  say "Instalando docker compose plugin…"
  apt-get update -y && apt-get install -y docker-compose-plugin
fi

# ---------- 2) .env.production (genera secretos si no existe) ----------
if [ ! -f .env.production ]; then
  say "Generando .env.production con secretos aleatorios…"
  AUTH_SECRET="$(openssl rand -hex 32)"
  PGPASS="$(openssl rand -hex 24)"
  cp .env.production.example .env.production
  # Inyecta secretos generados + dominio (sed con delimitador | para URLs).
  sed -i "s|AUTH_SECRET=.*|AUTH_SECRET=\"${AUTH_SECRET}\"|" .env.production
  sed -i "s|POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=\"${PGPASS}\"|" .env.production
  sed -i "s|^DATABASE_URL=.*|DATABASE_URL=\"postgresql://otr:${PGPASS}@postgres:5432/otr_aula?schema=public\&connection_limit=30\&pool_timeout=20\"|" .env.production
  sed -i "s|APP_URL=.*|APP_URL=\"https://${DOMAIN}\"|" .env.production
  echo "  → .env.production creado. (SMTP/Stripe/Cloudflare quedan vacíos: se activan luego.)"
else
  say ".env.production ya existe — lo conservo intacto."
fi

# ---------- 3) Schema PostgreSQL ----------
say "Activando el schema de PostgreSQL…"
cp prisma/schema.postgres.prisma prisma/schema.prisma

# ---------- 4) Levantar app + Postgres ----------
say "Construyendo y levantando contenedores (app + postgres)…"
docker compose --env-file .env.production up -d --build

say "Esperando a que la app responda en :${APP_PORT}…"
for i in $(seq 1 60); do
  if curl -fsS "http://127.0.0.1:${APP_PORT}/aula" >/dev/null 2>&1; then
    echo "  → app lista (intento $i)"; break
  fi
  sleep 2
  [ "$i" -eq 60 ] && die "La app no respondió. Revisa: docker compose logs web"
done

# ---------- 5) Migrar esquema + sembrar contenido real ----------
say "Aplicando el esquema a la base de datos…"
# --skip-generate: el cliente Prisma ya viene generado en la imagen; regenerarlo
# como usuario sin privilegios daría EACCES en node_modules/.prisma.
docker compose exec -T web npx prisma db push --skip-generate

# Sembrar SOLO si la base está vacía (primer despliegue). El seed es DESTRUCTIVO
# (borra todo); por eso se condiciona al conteo de usuarios. Re-ejecutar el bootstrap
# para reparar Nginx/HTTPS NO vuelve a sembrar ni borra datos reales.
USERS=$(docker compose exec -T web node -e "new (require('@prisma/client').PrismaClient)().user.count().then(n=>{console.log(n);process.exit(0)}).catch(()=>{console.log(0);process.exit(0)})" 2>/dev/null | tr -dc '0-9')
if [ "${USERS:-0}" = "0" ]; then
  say "Base vacía → sembrando el contenido real de OTR (programas, coach, reviews, quiz)…"
  docker compose exec -T -e SEED_FORCE=1 web npm run db:seed
else
  say "La base ya tiene ${USERS} usuario(s) → NO se siembra (se conservan los datos reales)."
fi

# ---------- 6) Nginx reverse proxy ----------
if ! command -v nginx >/dev/null 2>&1; then
  say "Instalando Nginx…"
  apt-get update -y && apt-get install -y nginx
fi
say "Configurando Nginx para ${DOMAIN} y www.${DOMAIN}…"
cat > "/etc/nginx/sites-available/otr.conf" <<NGINX
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN} www.${DOMAIN};

    client_max_body_size 55M;   # permite subir archivos (límite app = 50MB)

    # --- Compresión (win #1: app-data 35KB→~8KB; aplica a TODAS las /api y assets) ---
    gzip on;
    gzip_vary on;               # añade Vary: Accept-Encoding (caché segura)
    gzip_proxied any;           # comprime también las respuestas proxied (la app)
    gzip_comp_level 6;
    gzip_min_length 1024;
    gzip_types application/json application/javascript text/javascript text/css
               text/plain image/svg+xml application/manifest+json application/xml;
    # Brotli (opcional, ~-14% extra sobre gzip): requiere el módulo ngx_brotli.
    #   apt-get install -y libnginx-mod-http-brotli  (o compilar ngx_brotli)
    #   y añadir: brotli on; brotli_comp_level 5; brotli_types <mismos tipos>;

    location / {
        proxy_pass http://127.0.0.1:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 300;
    }
}
NGINX
ln -sf /etc/nginx/sites-available/otr.conf /etc/nginx/sites-enabled/otr.conf
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# ---------- 7) HTTPS (Let's Encrypt) ----------
if [ -n "$CERTBOT_EMAIL" ]; then
  say "Emitiendo certificado TLS con certbot…"
  apt-get install -y certbot python3-certbot-nginx
  certbot --nginx -d "${DOMAIN}" -d "www.${DOMAIN}" \
    --non-interactive --agree-tos -m "${CERTBOT_EMAIL}" --redirect \
    || echo "  ⚠ certbot falló (¿el DNS de ${DOMAIN} ya apunta a este VPS?). Reintenta: certbot --nginx -d ${DOMAIN} -d www.${DOMAIN}"
else
  echo "  ⚠ Sin CERTBOT_EMAIL: omito HTTPS. Cuando el DNS apunte aquí, corre:"
  echo "     certbot --nginx -d ${DOMAIN} -d www.${DOMAIN}"
fi

say "¡Listo! OTR Academy está corriendo."
echo "  · Sitio:  https://${DOMAIN}    (landing)"
echo "  · Aula:   https://${DOMAIN}/aula"
echo "  · Login demo: saul@otr.do / analia.reyes@otr.do — otr1234"
echo "  · Logs:   docker compose logs -f web"
echo "  · Cambia los secretos/llaves en: ${REPO_DIR}/.env.production  (luego: docker compose up -d)"
