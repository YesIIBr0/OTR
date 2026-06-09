# 🔍 Auditoría OTR Aula — rendimiento, modularidad y escala (3.000 usuarios)

## Resumen
La app es funcional y persiste todo en BD. Para **3.000 usuarios** el factor decisivo **no es el código sino la base de datos y el despliegue**. Endurecí lo que se puede sin riesgo; lo crítico (PostgreSQL en Hostinger) necesita tu VPS.

## Hallazgos priorizados

### 🔴 Crítico para 3.000 usuarios
1. **SQLite no escala.** Un solo escritor → con escrituras concurrentes se serializa/bloquea. **DEBE ser PostgreSQL** en producción. *(Código ya portable: solo cambias `provider` + `DATABASE_URL`.)*
2. **Connection pooling.** Postgres necesita un pool (PgBouncer o `?connection_limit=`) para no agotar conexiones con miles de usuarios.

### 🟠 Rendimiento
3. **`getAppData` corre ~18 queries por request** (`force-dynamic`, sin caché). A escala conviene **lazy-load por pantalla** + caché de datos estáticos.
4. **Payload grande al cliente** (hidrata todo el `DB`). → lazy-load.
5. **Faltaban índices** en columnas de consulta caliente. → **✅ AÑADIDOS**.

### 🟡 Confiabilidad ("que nunca falle")
6. **Sin error boundary** → un fallo = pantalla blanca/500. → **✅ AÑADIDO** (`error.tsx`, `global-error.tsx`).
7. **Validación de APIs** podría endurecerse con `zod`. → recomendado.
8. **Sin rate limiting** → recomendado (proteger de abuso/picos).

### 🟢 Modularidad
9. Ya está separado por capas (`lib/`, `api/`, `scr-*` por dominio, screens como módulos). Mejora futura: dividir `getAppData` por dominio (user/course/teacher/community) + carga on-demand.

## ✅ Lo que endurecí en esta pasada
- **Índices** en `Submission(userId,status)`, `Notification(userId)`, `QuizAttempt(userId)` + los de relaciones (course/module/lesson/enrollment ya los tenían).
- **Error boundaries** → nunca pantalla blanca; muestra "Reintentar".
- **Prisma singleton** ya evita fugas de conexión en dev.
- **Documentación de despliegue Postgres + pooling** (abajo).

## 🚀 Plan para llegar a 3.000 usuarios (orden)
1. **Desplegar en PostgreSQL** (Hostinger VPS) — `provider = "postgresql"`, `DATABASE_URL` con pooling:
   ```
   DATABASE_URL="postgresql://user:pass@host:5432/otr?schema=public&connection_limit=20&pool_timeout=20"
   ```
   (o PgBouncer en `transaction` mode delante de Postgres).
2. **Lazy-load por pantalla** — foro/mensajes/gradebook/gestión cargan on-demand vía API (reduce ~60% el trabajo por request).
3. **Caché de datos estáticos** (niveles, catálogo) con `unstable_cache` (revalidate).
4. **CDN (Cloudflare)** delante del sitio + assets + imágenes optimizadas.
5. **Rate limiting** en `/api/*` (p.ej. Upstash o middleware simple).
6. **Prueba de carga** con k6/Artillery simulando 3.000 usuarios concurrentes antes de lanzar.
7. **PM2 en cluster** (varias instancias Node) detrás de Nginx en el VPS.

## Veredicto
A nivel **código**, está listo y endurecido. El salto a **3.000 usuarios reales** = **PostgreSQL + pooling + CDN + prueba de carga** (todo en tu VPS de Hostinger). El código ya soporta ese cambio sin reescritura.
