# ============================================================
#  OTR Academy · Dockerfile (multi-stage, Node 20 alpine)
#  deps → build → runner. Sirve con `next start` en el puerto 3000.
#  Producción usa PostgreSQL: el cliente Prisma se genera contra
#  prisma/schema.prisma (que en el servidor debe ser el de Postgres,
#  ver DEPLOY.md: cp prisma/schema.postgres.prisma prisma/schema.prisma).
# ============================================================

# ---------- 1) deps: instala dependencias (con cache) ----------
FROM node:20-alpine AS deps
# libc6-compat: requerido por algunos binarios nativos en alpine.
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# Copiamos manifest + schema porque `postinstall` ejecuta `prisma generate`.
COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm ci

# ---------- 2) builder: compila Next ----------
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Regenera el cliente Prisma (por si el schema cambió) y construye Next.
# AUTH_SECRET es obligatorio en runtime, pero también se valida al importar
# auth-crypto durante el build de rutas → se pasa un valor de build.
ENV NEXT_TELEMETRY_DISABLED=1
ENV AUTH_SECRET="build-time-placeholder-secret-32chars"
RUN npx prisma generate
RUN npm run build

# ---------- 3) runner: imagen final mínima ----------
FROM node:20-alpine AS runner
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

# Usuario sin privilegios.
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# Copiamos la app construida y sus dependencias.
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/next.config.mjs ./next.config.mjs
# Fuente + tsconfig: necesarios para `npm run db:seed` (seed.ts importa app/lib/auth-crypto).
COPY --from=builder /app/app ./app
COPY --from=builder /app/tsconfig.json ./tsconfig.json

# Directorio de uploads persistente, FUERA de public/ (montar volumen aquí en compose).
# Se sirve por app/uploads/[...path]/route.ts, no por el estático de Next.
RUN mkdir -p /app/var/uploads && chown -R nextjs:nodejs /app/var

USER nextjs
EXPOSE 3000

# `next start` respeta el PORT. La BD se migra/siembra fuera (ver DEPLOY.md).
CMD ["node_modules/.bin/next", "start", "-p", "3000"]
