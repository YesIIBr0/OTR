# ACTION PLAN — OTR Academy (Fase 2 · backlog priorizado)
**16 jun 2026 · CTO Protocol.** Un solo backlog rankeado. `puerta`: two-way = reversible, one-way = irreversible (requiere aprobación explícita).

## Ya RESUELTO esta sesión (✅)
SEC-1 open-redirect · SEC-2 seed guard · SEC-3 rate-limiter+IP · SEC-4 role guard · DATA-1 backup (local; falta offsite). Todo en `main` (commits `f463f9c`, `bef70c6`), build+tsc verde, deploy 200.

## Backlog rankeado

| Rank | ID | Título | Sev | Impacto | Esf | Puerta | Leverage |
|---|---|---|---|---|---|---|---|
| **P0** | PROD-1 | **Sala de video** (flujo roto: alumno paga y no ve nada) | Crít | Mata el marketplace | XL | two-way | systemic |
| **P0** | DATA-2 | **FK Booking/Escrow→User** (dinero huérfano) | Crít | Integridad financiera | M | **one-way** | systemic |
| **P0** | DATA-1b | **Backup OFFSITE** (B2/S3) sobre el local ya hecho | Crít | Sobrevivir pérdida de disco | S | two-way | systemic |
| **P0** | PROD-2 | **SMTP** (reset de contraseña no llega) | Alto | Acceso de usuarios | S | two-way | one-off |
| **P1** | DATA-3/4 | FK huérfanas restantes + contadores en `$transaction` | Alto | Datos consistentes | S-M | one-way (FK) | systemic |
| **P1** | DATA-5 | Migraciones versionadas (`prisma migrate`) | Med | Rollback de esquema | M | **one-way** | systemic |
| **P1** | REL-2 | Idempotencia webhook Stripe | Alto* | Pagos sin doble cobro | M | two-way | systemic |
| **P1** | ESC-2 | Grace period en deploys | Alto | No cortar quizzes/pagos | S | two-way | one-off |
| **P1** | PERF-1 | Caché de estáticos en `getAppData` (sin partir aún) | Alto | TTFB / carga del CPU | M | two-way | systemic |
| **P1** | QUAL-1a | Tests P0: `/api/bookings` + `/api/quizzes` | Alto | Red de seguridad del dinero | L | two-way | systemic |
| **P1** | REL-1 | Logging estructurado + Sentry | Med | Observabilidad ("¿qué pasó?") | M | two-way | systemic |
| **P2** | ESC-3 | Prueba de carga k6 (baseline) | Alto | Saber si aguanta 3.000 | M | two-way | systemic |
| **P2** | SEC-5/6/7 | CVEs postcss · rate-limit por user.id · enum/epoch de rol | Med | Endurecimiento | S-M | two-way | mix |
| **P2** | DATA-6 | índice `Booking.packageId` + Prisma timeout/pool | Med | Latencia bajo carga | XS-S | two-way | one-off |
| **P2** | SOBRA-1 | Eliminar dead-code (legacy `.js`, `site/`, `_incoming/`, pantallas fantasma) | Bajo | Menos ruido/bundle | S | two-way | one-off |
| **P3** | ESC-1 | PM2 cluster + Redis + PgBouncer | Alto | Escala horizontal | L | two-way | systemic |
| **P3** | PERF-1b | Partir `getAppData` + code-split SPA (ARCH-1) | Med | Rendimiento a escala | L | two-way | systemic |
| **P3** | UX-1 | a11y de modales (`<dialog>`/inert) | Med | Inclusión / WCAG | M | two-way | one-off |
| **P3** | — | Unificar nombres de formato + variable de color | Bajo | Consistencia | XS-M | two-way | one-off |

\* latente: los pagos están simulados; sube a bloqueante el día que se cablee Stripe real.

## Secuencia recomendada (dependencias)
1. **Ahora (no requieren terceros):** DATA-2 + DATA-3/4 + DATA-5 **juntos en UNA migración** (mismo `migrate` que adopta el versionado y arregla las FK/contadores) → ESC-2 (grace period) → PERF-1 (caché) → DATA-6.
2. **Requieren tu decisión/credenciales:** DATA-1b (bucket B2/S3), PROD-2 (proveedor SMTP), PROD-1 (proveedor de video), REL-2 (cuando actives Stripe).
3. **Continuo:** QUAL-1a (tests) + REL-1 (logging) en paralelo a lo demás.
4. **Cuando la carga lo justifique (>200 concurrentes medidos):** ESC-1 + PERF-1b.

## Las 3-5 jugadas de mayor LEVERAGE
1. **La migración única DATA-2+3+4+5** — adopta migraciones versionadas Y mata la clase entera de FK huérfanas + contadores en una sola pasada. Máximo leverage.
2. **Caché de estáticos (PERF-1)** — ~30% menos queries por request sin reescribir nada.
3. **Tests P0 del dinero (QUAL-1a)** — convierte cada cambio futuro de B+ arriesgado a iteración segura.
4. **Sala de video (PROD-1)** — desbloquea la propuesta de valor central del marketplace.
5. **Backup offsite (DATA-1b)** — cierra del todo el riesgo que puede matar el negocio.

## Qué NO hacer ahora (deliberado)
- **No** PM2/Redis/PgBouncer todavía: 1 usuario real; es optimización para una carga que aún no existe. Esperar a que k6 o el tráfico real lo pidan.
- **No** reescribir la SPA a React/code-split aún: funciona; el costo se paga una vez por sesión. Prioridad solo si Lighthouse real lo justifica.
- **No** reactivar foro/arsenal/consulta: fuera de alcance Fase 1; o se apagan limpio o se posponen.
- **No** perseguir el A+ de cobertura de tests: empezar por el dinero, no por el 100%.

→ **STOP (Fase 2).** Selecciona qué ejecutar (Fase 4, por ítem). Recomiendo arrancar por **la migración única (P0/P1 de datos)** porque ya está todo identificado y es el mayor leverage.
