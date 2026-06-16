# AUDIT — OTR Academy (Fase 1 · multi-lente)
**16 jun 2026 · CTO Protocol · rama `cto-audit/recon`** — consolida 2 auditorías con verificación adversarial (CTO 10-dominios + profunda) y la evaluación falta/sobra. Cada hallazgo con evidencia `archivo:línea`. `[✅ RESUELTO]` = arreglado esta sesión.

**Salud general: 6/10 · Postura: lanzar a público chico con riesgos controlados; NO listo para 3.000 sin trabajo previo.**

---
## Lente: SEGURIDAD

```
[SEC-1] Open redirect en recordingUrl (phishing a padres/alumnos)
Lens: security · Severity: Critical · [✅ RESUELTO 16-jun]
Evidence: app/api/bookings/[id]/route.ts:113 (regex solo validaba esquema) + app/api/debates/route.ts:156
Why it matters: un coach podía guardar una URL arbitraria que luego clican padres/alumnos.
Recommendation: whitelist de dominios de video (safeVideoUrl). Tradeoff: limita hosts a YT/Vimeo/Cloudflare.
Effort: S · Risk: reversible · Leverage: systemic (helper reutilizable)
```
```
[SEC-2] Guard de seed de producción saltable + password demo hardcodeada
Lens: security · Severity: High · [✅ RESUELTO 16-jun]
Evidence: prisma/seed.ts:30-43 (guard NODE_ENV dentro de if(!force)); :100 "otr1234"
Why it matters: SEED_FORCE=1 saltaba el guard → riesgo de borrar prod a mano. Password en repo público.
Recommendation: guard de prod SIEMPRE activo (SEED_ALLOW_PROD=1) + password por env/aleatoria. (Hecho)
Effort: XS · Risk: reversible · Leverage: systemic
```
```
[SEC-3] Rate-limiter: agotamiento de RAM (DoS) + IP spoofeable
Lens: security/reliability · Severity: High · [✅ RESUELTO 16-jun]
Evidence: app/lib/rate-limit.ts:11 (sweep solo >5000) + IP=split(",")[0] en login/register/forgot/consultations
Why it matters: flood con x-forwarded-for falso infla el Map sin tope (OOM en 1 CPU) y evade el anti-fuerza-bruta.
Recommendation: tope duro de memoria (evictOldest) + clientIp() = último hop tras Nginx. (Hecho)
Effort: S · Risk: reversible · Leverage: systemic
```
```
[SEC-4] Guard de rol ausente en el router del SPA (fuga de UI admin/teacher)
Lens: security/ux · Severity: Medium · [✅ RESUELTO 16-jun]
Evidence: app/components/Aula.tsx renderApp() no comparaba def.role vs state.role
Why it matters: el backend rechaza los datos, pero la UI ajena se pintaba si se manipula la ruta.
Recommendation: redirigir al home del rol si def.role !== state.role. (Hecho)
Effort: S · Risk: reversible · Leverage: one-off
```
```
[SEC-5] 2 CVEs moderadas en deps de producción
Lens: security · Severity: Medium
Evidence: npm audit --omit=dev → postcss <8.5.10 vía next
Why it matters: XSS de superficie baja (CSS no sanitizado del usuario). esbuild HIGH es solo dev.
Recommendation: NO usar npm audit fix --force (degrada Next); esperar Next 15.6+ o forzar postcss>=8.5.10; Dependabot. Tradeoff: forzar resoluciones puede romper.
Effort: S · Risk: reversible · Leverage: one-off
```
```
[SEC-6] ~23 POST sin rate-limit (DoS de slots, farmeo de XP)
Lens: security · Severity: Medium
Evidence: /api/bookings, /api/quizzes/[id]/attempt, /api/submissions sin rateLimit; el limit es por IP no user.id
Why it matters: un alumno puede farmear XP repitiendo intentos; un atacante satura slots de reserva.
Recommendation: rate-limit por user.id en endpoints sensibles. Effort: M · Risk: reversible · Leverage: systemic
```
```
[SEC-7] AUTH-06 — cambiar rol no invalida la sesión
Lens: security · Severity: Low (riesgo real bajo hoy)
Evidence: app/lib/auth.ts:14-20 (revalida suspended y password fingerprint, NO el rol)
Why it matters: hoy el rol se relee fresco por request → ok; trampa si se añade caching de rol.
Recommendation: incluir rol/epoch en el payload firmado. Effort: S · Risk: reversible · Leverage: one-off
```

---
## Lente: DATOS

```
[DATA-1] Sin backup automatizado de la BD (riesgo #1: pérdida total)
Lens: data/reliability · Severity: Critical · [✅ MITIGADO 16-jun — falta offsite]
Evidence: docker-compose.yml (volumen único otr_pgdata, sin pg_dump); seed destructivo
Why it matters: fallo de disco / seed accidental = pérdida irreversible de usuarios, progreso, pagos.
Recommendation: cron pg_dump local + rotación (HECHO) → siguiente: offsite B2/S3. Tradeoff: backup local no protege ante pérdida del disco.
Effort: M · Risk: reversible · Leverage: systemic
```
```
[DATA-2] Escrow huérfano: Booking/EscrowTxn sin FK a User
Lens: data · Severity: Critical · ⏳ PENDIENTE (one-way: migración)
Evidence: schema.postgres.prisma:635-664 — studentId/coachId/consentBy son String sin @relation; User no declara bookings. (32 @relation / 48 modelos.)
Why it matters: borrar un coach/alumno deja escrow HELD sin dueño resoluble; payouts/refunds a cuentas inexistentes al cablear Stripe.
Recommendation: @relation Booking→User (Restrict si hay escrow HELD). Tradeoff: requiere migración + verificar integridad previa. Effort: M · Risk: irreversible · Leverage: systemic
```
```
[DATA-3] Clase amplia de FK huérfanas a User
Lens: data · Severity: High · ⏳ PENDIENTE
Evidence: PasswordReset:444, Upload:456, Report:394, ActivityEvent:497, Guardianship:514-517, Review.teacher:106 — userId String sin @relation/onDelete
Why it matters: avgRating cuenta reviews huérfanas; guardianships/tokens/timeline quedan colgando al borrar usuario.
Recommendation: @relation + onDelete (Cascade uploads/activity/reset; Restrict/SetNull donde haya dinero/consentimiento). Effort: M · Risk: irreversible · Leverage: systemic
```
```
[DATA-4] Contadores denormalizados se desincronizan + create/increment sin transacción
Lens: data · Severity: High · ⏳ PENDIENTE
Evidence: reviews/route.ts (reviewCount nunca sube); bookingCount nunca baja en CANCELLED; enrollments:17-20, checkout:44-47, lessons:23-32 hacen create+increment sin db.$transaction (el patrón correcto existe en bookings/[id]:72)
Why it matters: ratings y métricas mienten; un fallo a mitad deja contadores inconsistentes.
Recommendation: envolver en $transaction; recomputar o trigger para los contadores. Effort: S-M · Risk: reversible · Leverage: systemic
```
```
[DATA-5] Sin migraciones versionadas (db push)
Lens: data/reliability · Severity: Medium · ⏳ PENDIENTE
Evidence: no existe prisma/migrations/; vps-pull.sh usa prisma db push
Why it matters: un cambio de esquema fallido en prod no tiene rollback ni auditoría.
Recommendation: adoptar prisma migrate deploy (baseline + migrate dev). Tradeoff: baseline inicial cuidado sobre BD viva. Effort: M · Risk: irreversible · Leverage: systemic
```
```
[DATA-6] Booking sin @@index([packageId]); Prisma sin connection_limit/statement_timeout
Lens: data/performance · Severity: Medium · ⏳ PENDIENTE
Evidence: schema:650 (índices solo studentId, coachId+slotAt); app/lib/db.ts:6 (new PrismaClient() pelado)
Why it matters: "Mis reservas" degrada al crecer; una query lenta bloquea el único worker sin timeout.
Recommendation: @@index([packageId]); connection_limit + statement_timeout en DATABASE_URL. Effort: XS-S · Risk: reversible · Leverage: one-off
```

---
## Lente: ESCALABILIDAD / RENDIMIENTO / FIABILIDAD

```
[PERF-1] getAppData monolítico: ~35 queries/request, sin caché ni lazy-load
Lens: performance · Severity: High · ⏳ PENDIENTE
Evidence: app/lib/queries.ts (1441 LOC), 4 Promise.all (líneas 151/253/278/813); /aula = 206 kB First Load (build)
Why it matters: TTFB alto y saturación del único CPU en cada navegación; bloqueante para 3.000.
Recommendation: unstable_cache (1h) para estáticos (levels/badges/catálogo) + partir en base + secciones lazy. Effort: L · Risk: reversible · Leverage: systemic
```
```
[ESC-1] 1 vCPU sin cluster; estado (rate-limit/sesión) en memoria de proceso
Lens: reliability/scalability · Severity: High · ⏳ PENDIENTE (cuando suba la carga)
Evidence: 1 proceso Next; rate-limit Map local; db.ts singleton
Why it matters: 50-200 concurrentes bloquean el event loop; no se pueden usar más núcleos sin sacar el estado.
Recommendation: PM2 cluster + Redis + PgBouncer. Tradeoff: +1 dependencia operacional (Redis). Effort: L · Risk: reversible · Leverage: systemic
```
```
[ESC-2] Redeploys sin grace period (cortan a usuarios a mitad de quiz/pago)
Lens: reliability · Severity: High · ⏳ PENDIENTE
Evidence: docker-compose.yml sin stop_grace_period; sin handler SIGTERM
Recommendation: stop_grace_period:30s + SIGTERM (server.close()). Effort: S · Risk: reversible · Leverage: one-off
```
```
[ESC-3] Sin pruebas de carga: techo de escala desconocido
Lens: reliability · Severity: High · ⏳ PENDIENTE
Evidence: 0 deps k6; CI solo tsc+prisma validate
Recommendation: k6 (1.000 VUs) contra staging; SLO P99<2s, error<1%. Effort: M · Risk: reversible · Leverage: systemic
```
```
[REL-1] Sin manejo centralizado de errores ni logging estructurado
Lens: reliability · Severity: Medium · ⏳ PENDIENTE
Evidence: ~15+ endpoints con db.* sin try/catch → 500 opacos; sin pino/Sentry
Recommendation: try/catch con mapeo (409/503) + pino a stdout + Sentry. Effort: M · Risk: reversible · Leverage: systemic
```
```
[REL-2] Webhook Stripe sin idempotencia
Lens: reliability · Severity: High (latente, pagos simulados) · ⏳ PENDIENTE
Evidence: app/api/stripe/webhook/route.ts:30-36 check-then-create fuera de transacción, sin dedup por event.id
Recommendation: tabla StripeEvent(eventId UNIQUE) + $transaction antes de activar pagos reales. Effort: M · Risk: reversible · Leverage: systemic
```

---
## Lente: ARQUITECTURA · CALIDAD · FRONTEND/UX · PRODUCTO

```
[QUAL-1] 0 tests + strict:false + 19 @ts-nocheck
Lens: quality · Severity: High · ⏳ PENDIENTE
Evidence: 0 archivos test; tsconfig strict:false; scr-*.ts con @ts-nocheck. Churn: Aula.tsx 11×, queries.ts 7×.
Why it matters: dinero (bookings/escrow) y grading sin red; los archivos más cambiados no tienen cobertura.
Recommendation: tests P0 de /api/bookings y /api/quizzes (vitest+supertest); luego quitar @ts-nocheck. Effort: XL · Risk: reversible · Leverage: systemic
```
```
[PROD-1] La SALA DE VIDEO no existe (flujo roto)
Lens: product · Severity: Critical (funcional) · ⏳ PENDIENTE
Evidence: scr-mybookings.ts:71 abre videoUrl="/aula?room=<id>" (bookings/route.ts:154) pero Aula.tsx ignora el query param → ventana en blanco
Why it matters: el alumno paga, entra a la clase y NO ve nada. Mata la propuesta del marketplace.
Recommendation: ruta 'room' + leer query param + proveedor de video (Daily/Cloudflare) + reusar el safety-gate de menores. Tradeoff: requiere proveedor (coste/decisión). Effort: XL · Risk: reversible · Leverage: systemic
```
```
[PROD-2] Email de reset no llega (sin SMTP)
Lens: product/reliability · Severity: High · ⏳ PENDIENTE (necesita credenciales)
Evidence: app/lib/mail.ts:15-19 (sin SMTP_URL → console.log)
Why it matters: quien olvida su clave queda fuera. Recommendation: SMTP_URL (Resend/Postmark/buzón Hostinger). Effort: S · Risk: reversible
```
```
[ARCH-1] SPA monolítica sin code-split + estado global window.DB
Lens: architecture/frontend · Severity: Medium · ⏳ PENDIENTE
Evidence: screens.ts importa 19 scr-* estáticos; Aula.tsx re-render por innerHTML completo; /aula 206 kB
Recommendation: dynamic import por ruta (parent/debate/admin primero). Effort: L · Risk: reversible · Leverage: systemic
```
```
[UX-1] Modales sin aria-modal/inert (a11y, WCAG 4.1.2)
Lens: ux · Severity: Medium · ⏳ PENDIENTE
Evidence: funciones modal de Aula.tsx con role=dialog pero sin aria-modal ni inert en el fondo
Recommendation: aria-modal + inert, o <dialog> nativo. Effort: M · Risk: reversible
```
```
[SOBRA-1] Dead code eliminable
Lens: quality · Severity: Low · ⏳ PENDIENTE (esperar OK)
Evidence: .js/.css legacy en raíz (app.js, screens-*.js...), dirs site/ y _incoming/, pantallas fantasma S.kit/S.gradebook, endpoints 410 (forum/consultations). OJO: public/site/ es la landing — NO tocar.
Recommendation: eliminar con respaldo git. Tradeoff: forum/arsenal si Fase 2/3 sigue en roadmap → mover a _disabled/. Effort: S · Risk: reversible · Leverage: one-off (reduce ruido/bundle)
```

> **Refutados (no son problemas, transparencia):** inflación de rating por rol cacheado, carrera de Guardianship (no hay ruta REVOKED), IDOR en GET /api/messages, N+1 en GET /api/bookings (es batching), "secretos en git", consentimiento parental "muerto" (sí funciona), `consultations.ts` "dead code" (lo usa el marketplace vivo).

---
*Detalle extendido con notas de verificación en `~/Downloads/OTR-Auditoria-CTO-2026-06-15.md` y `OTR-Evaluacion-Falta-Sobra-2026-06-15.md`.*
