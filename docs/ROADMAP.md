# ROADMAP — OTR Academy (Fase 5 · evolución)
**16 jun 2026 · CTO Protocol.** Hacia ~3.000 usuarios con 1 dev y presupuesto ajustado.

## Tesis
**El monolito Next.js actual es la decisión correcta — NO reescribir.** Para 3.000 usuarios (pico realista 100-300 concurrentes) no hacen falta microservicios ni Kubernetes; eso sería sobre-ingeniería que un solo dev no puede operar. El trabajo es **hacer el mismo monolito resiliente y elástico** dentro del VPS, con 2-3 servicios baratos colgados, en olas.

## Arquitectura objetivo (incremental sobre lo actual)
```
HOY                                   OBJETIVO (~3.000 usuarios)
1 VPS · 1 vCPU · 1 proceso Next   →   1-2 VPS (KVM 2, 2 vCPU, ~+15 USD/mes)
estado en memoria de proceso      →   PM2 cluster (usa ambos núcleos) + Redis (rate-limit/sesión)
PrismaClient pelado               →   PgBouncer (transaction-pooling, ×3-5 capacidad) + timeouts
getAppData ~35 queries, sin caché →   base + secciones lazy + unstable_cache (estáticos)
sin réplica, backup local         →   backup OFFSITE (B2/S3) → luego read-replica gestionada (HA)
sin observabilidad                →   pino (logs) + Sentry (errores) + k6 en CI (techo conocido)
assets desde el VPS               →   Cloudflare (free) CDN delante de estáticos/uploads
```
**Trade-offs honestos:** (1) el cluster obliga a sacar el estado del proceso → Redis deja de ser opcional. (2) una sola máquina sigue siendo SPOF de *disponibilidad*; el backup mitiga *pérdida de datos*, no *downtime* — la read-replica (medio plazo) es lo que da HA real, pero es decisión de coste. (3) la CDN añade una capa de caché que hay que invalidar bien.

## Migración segura (orden por riesgo/leverage)
**Ola 1 — Cimientos (sin terceros, esta/próxima semana):**
1. Migración única **FK + versionado** (DATA-2/3/4/5) — ver `DATA_MODEL.md` (one-way, con verificación de huérfanos previa).
2. Grace period en deploys (ESC-2). 3. Caché de estáticos en getAppData (PERF-1). 4. índice + timeouts Prisma (DATA-6).

**Ola 2 — Integraciones (requieren tu decisión/credenciales):**
5. Backup **offsite** B2/S3 (DATA-1b). 6. SMTP real (PROD-2). 7. **Sala de video** + proveedor (PROD-1). 8. Idempotencia webhook + Stripe real (REL-2).

**Ola 3 — Confianza y escala (cuando el tráfico lo justifique):**
9. Tests P0 del dinero (QUAL-1a) + logging/Sentry (REL-1) — en paralelo desde ya. 10. k6 baseline (ESC-3). 11. PM2 cluster + Redis + PgBouncer (ESC-1) tras medir >200 concurrentes. 12. Code-split SPA + partir getAppData (ARCH-1/PERF-1b).

## Las 3-5 apuestas que más importan
1. **Cerrar la integridad del dinero + versionar el esquema** (la migración única). Es el mayor leverage: mata una clase entera de bugs y desbloquea iterar sin miedo a romper prod.
2. **Terminar la sala de video.** Sin ella, el marketplace de coaching —el corazón del negocio— no entrega lo que cobra.
3. **Red de seguridad: backup offsite + tests del dinero.** Convierte el sistema de "frágil pero funciona" a "puedo iterar rápido sin jugarme el negocio".
4. **Caché + PgBouncer.** El 80% de la escalabilidad a 3.000 usuarios por el 20% del esfuerzo, sin reescribir.
5. **Decisiones de producto pendientes** (Stripe/SMTP/video/dominio/legal — ver `~/Downloads/OTR-Preguntas-Stakeholder-*`). Ningún trabajo técnico sustituye estas: son las que convierten el MVP en producto cobrable.

## Qué vigilar (señales para reordenar)
- Si k6 muestra saturación <200 concurrentes → adelantar Ola 3 (cluster/Redis).
- Si se cablea Stripe real → REL-2 (idempotencia) y DATA-2 (FK escrow) suben a **bloqueante inmediato**.
- Si entra contenido/usuarios reales de menores → la política de borrado + consentimiento + legal pasan a P0.

---
*Deliverable de Fase 5. Roadmap vivo: revísalo tras cada ola.*
