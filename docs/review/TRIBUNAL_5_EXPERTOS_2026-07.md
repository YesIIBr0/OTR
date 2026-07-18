# TRIBUNAL DE 5 EXPERTOS — OTR Academy · Julio 2026

**Mandato:** encontrar cómo OTR muere en 12 meses si no actuamos, y el plan para evitarlo.
Cada crítica trae acción concreta, medible y asignable — o no cuenta.

**El tribunal:** Arquitecto Sénior (cínico) · PM Estratégico (mercenario) · DevOps/Security Lead (paranoico) · Growth Hacker (sádico) · UX Researcher (implacable).

**Regla de honestidad aplicada:** OTR es **pre-revenue y pre-lanzamiento** — no existen MAU, MRR, churn, CAC ni cohortes. Donde el tribunal exige métricas de usuarios, se marca la EVIDENCIA pendiente en vez de inventarla. Donde hay datos duros (código, arquitectura, seguridad, proceso), se usan los medidos en esta campaña (descubrimiento 6 dimensiones + fases F1–F6 ejecutadas).

## Contexto verificado (lo que el tribunal auditó)

| Dimensión | Realidad medida |
|---|---|
| Producto | LMS + marketplace de coaching para academia de debate (RD): 4 roles, 23 pantallas, torneos, escrow simulado, membresía simulada, bandeja WhatsApp, flujos COPPA |
| Stack | Next.js 15.5.20 + React 19.2.7 + Prisma 6.19.3 dual (SQLite dev / Postgres 16 prod), node:22-alpine, VPS único, CI ~3 min |
| Escala del código | ~30 000 LOC app/, 64 rutas API, 52 modelos, **503 tests** (0 en enero), `/aula` 136 kB First Load |
| Negocio | **Pre-revenue.** Sin Stripe (llaves pendientes), venta por curso apagada por diseño, membresía sin cobro real. Equipo: 1 founder-dev (Wilser) + founder de negocio (Isaac) + agentes IA |
| Estado deploy | `main` verde con CI; **staging bloqueado por token ghcr vencido** — nada de lo construido desde el 14-jul es observable en un entorno real |

---

# FASE 1 · NEGOCIO — ¿por qué OTR existe y por qué podría dejar de existir?

## [1.1] Value Proposition Stress Test — **VEREDICTO: 🔴 CRÍTICO**

**ESCENARIO DE MUERTE:** El competidor real de OTR no es otra plataforma: es **WhatsApp + Zoom + Excel + la libreta de Isaac** — gratis, ya instalado, y con cero fricción de adopción. Si el lanzamiento no demuestra en 60 días que OTR ahorra horas semanales reales a Isaac Y mejora resultados visibles de los alumnos, las familias volverán al grupo de WhatsApp y OTR será "esa página que probamos una vez". Muerte silenciosa: 12 meses de facturas de VPS con 0 usuarios activos.

**Lo que el producto SÍ tiene** (el PM lo reconoce a regañadientes): el dolor de Isaac es de muelas, no de cabeza — su operación actual (cobros manuales, coordinación por WhatsApp, cero visibilidad para padres) no escala más allá de su memoria personal. OTR ataca exactamente eso: pagos con escrow, calendario, progreso visible para el padre que paga.

**EVIDENCIA QUE NECESITO DE TI:** (1) ¿Cuántos alumnos activos tiene Isaac HOY offline y cuánto pagan? (2) ¿Cuántas horas/semana gasta Isaac en coordinación manual? (3) ¿Qué dijeron los padres cuando Isaac les mencionó la plataforma? Nada de esto está en el repo y es LA variable del negocio.

**ACCIÓN INMEDIATA:** Definir el "aha moment" por rol y escribirlo en una línea cada uno (propuesta del tribunal: padre = *ver el progreso real de su hijo tras la primera semana*; alumno = *completar su primera práctica con feedback*; Isaac = *primera semana sin perseguir un pago por WhatsApp*). Owner: Isaac + Wilser, 1 conversación.
**ACCIÓN ESTRATÉGICA:** Piloto cerrado de 20 familias del círculo actual de Isaac, 4 semanas, con métrica de éxito pre-acordada: ≥10 familias activas en la semana 4. KPI: retención semanal del piloto.
**COSTO DE IGNORAR:** Todo lo construido (30k LOC, 503 tests) vale $0 sin este dato.

## [1.2] Unit Economics & Pricing — **VEREDICTO: 🔴 CRÍTICO**

**ESCENARIO DE MUERTE:** OTR lanza "cuando estén las llaves de Stripe" sin haber decidido QUÉ cobra. El código ya modela membresía + take rate del 18 % en el marketplace, pero no existe ni un documento de pricing: ni el precio de la membresía Pro, ni si el 18 % es sostenible contra lo que un coach cobraría por fuera (desintermediación: el coach conoce al alumno y le pasa su número — el escrow no lo impide, la propuesta de valor sí debe).

**EVIDENCIA QUE NECESITO:** tarifa/hora actual de los coaches de Isaac; qué paga hoy una familia por mes; sensibilidad de precio del mercado RD (¿RD$ o US$?).

**ACCIÓN INMEDIATA:** Documento de pricing v1 de UNA página: precio membresía, take rate justificado, qué es gratis y por qué. Validarlo hablando con 10 padres reales (no encuesta: conversación). Owner: Isaac, 2 semanas, 0 líneas de código.
**ACCIÓN ESTRATÉGICA:** LTV/CAC medible desde el día 1 del piloto: instrumentar el costo de adquirir cada familia (aunque sea "1 hora de Isaac") contra su pago mensual. Umbral sano: LTV/CAC > 3 al mes 6.
**COSTO DE IGNORAR:** Conectar Stripe (F7) sin pricing validado = cobrar un número inventado y quemarse con las primeras 20 familias, que son las únicas que tienes.

## [1.3] Market Position & Moat — **VEREDICTO: 🟡 ADVERTENCIA**

**ESCENARIO DE MUERTE:** Un equipo de 3 devs copia las features en 90 días — cierto e irrelevante. Lo que NO pueden copiar: la comunidad de debate de RD, la marca de Isaac, la conexión NSDA/Tabroom (ya integrada en Fase 1 pública), y el historial de datos (progreso, torneos, rankings Glicko) que se acumula con el uso. **El moat de OTR son datos + comunidad, no código** — pero hoy los datos acumulados son cero porque no hay usuarios.

**ACCIÓN INMEDIATA:** Ninguna de código. Aceptar formalmente (en el plan de negocio) que el moat se construye con el piloto, no antes.
**ACCIÓN ESTRATÉGICA:** El historial de torneos + ranking + certificados debe volverse el "expediente deportivo" del alumno que NO existe en WhatsApp/Excel — exportable para aplicaciones universitarias (NSDA es moneda en admisiones de EE. UU.). Eso es switching cost real. KPI: % de alumnos del piloto con ≥1 torneo registrado en la plataforma.
**COSTO DE IGNORAR:** Producto commodity sustituible por el statu quo gratis.

## [1.4] Feature Bloat Autopsy — **VEREDICTO: 🟢 SANO (con nota)**

El Growth Hacker vino a matar features y encontró que ya estaban muertas las correctas: **foro APAGADO** (menores sin moderación dedicada = riesgo, decisión correcta), **venta por curso APAGADA** (cursos = valor de la membresía), **consultas APAGADAS**, endpoint de quiz legado **410**. Las flags viven en código, no en config — primitivo pero honesto.

**Nota del tribunal:** 23 pantallas para 0 usuarios ES bloat potencial — pero no se mata nada sin datos de uso. `ActivityEvent` (el ledger ya existente) ES tu producto-analytics gratis.
**ACCIÓN INMEDIATA:** Ninguna — no matar features sin datos del piloto.
**ACCIÓN ESTRATÉGICA:** Al cierre del piloto: informe de uso real por pantalla desde ActivityEvent; toda pantalla con <5 % de uso entra a lista de deprecación. Owner: Wilser, 1 día de análisis post-piloto.

## [1.5] Cohort & Retention Reality — **VEREDICTO: 🔴 CRÍTICO (por inexistencia)**

No hay cohortes porque no hay usuarios. El riesgo: lanzar sin instrumentación y descubrir en el mes 3 que no sabes POR QUÉ se fueron.

**ACCIÓN INMEDIATA (antes del piloto):** Instrumentar el funnel con eventos que ya soporta el spine: signup → placement completado → primera acción core (lección/práctica/reserva) → primera semana activa. Pintarlo en `/admin` (la pantalla de métricas ya existe). Owner: Wilser, ~2 días.
**North Star propuesta (no vanidad):** *alumnos con ≥1 acción de práctica semanal*. "Usuarios registrados" queda prohibida como métrica de éxito.
**ACCIÓN ESTRATÉGICA:** Entrevista de salida OBLIGATORIA (30 min, no encuesta) con cada familia que abandone el piloto. Owner: Isaac, proceso permanente.
**COSTO DE IGNORAR:** Un piloto sin instrumentación es una anécdota, no un experimento.

## [1.6] Pivot Triggers — **VEREDICTO: 🟡 ADVERTENCIA**

**ACCIÓN INMEDIATA:** Acordar por escrito las 3 métricas-suicidio ANTES del piloto (propuesta del tribunal, ajustable): (1) <50 % de las familias del piloto activas en semana 4; (2) <30 % de retención al mes 3 post-lanzamiento; (3) 2 trimestres seguidos con ingresos < costo de infra+tiempo. Autoridad de pivot: Isaac + Wilser juntos, decisión en 1 reunión, no en 6 meses de negación. Owner: ambos, 1 hora.

---

# FASE 2 · ARQUITECTURA — ¿escala o se rompe bajo presión?

## [2.1] Scalability Ceiling — **VEREDICTO: 🟢 SANO para el próximo 10×, con techo conocido**

Datos reales: `getAppData` = 32 queries (student) / 35 (teacher) por carga **y por cada refresh** tras mutación (22 call-sites) — era 37/45 antes de F3. Payload sin duplicados desde F3. El primer cuello a 10× usuarios: este pipeline monolítico; el segundo: disco del VPS (uploads locales). Ambos tienen camino conocido en el Plan Maestro F10 con disparadores medibles (split por pantalla si p95 > 600 ms; uploads → R2 si disco > 70 %). Costo marginal por usuario: lineal (stateless + Postgres indexado).

**Lo que falta y no se ha hecho:** load testing REAL. No se puede hasta desbloquear staging (token ghcr).
**ACCIÓN INMEDIATA:** [user] renovar token ghcr (5 min) — es prerrequisito de toda medición real.
**ACCIÓN ESTRATÉGICA:** k6 contra staging: 200 usuarios virtuales sobre login + app-data + booking; documentar p95 real y fijar el SLO. Owner: Wilser, 1 día tras el token.

## [2.2] Monolito vs Microservicios — **VEREDICTO: 🟢 SANO**

Monolito modular con boundaries reales (lib/ compartida, rutas finas, builders aislados, helpers de la casa post-F5). Deploy `git push` → producción: ~3 min CI + ≤2 min cron del VPS = **~5 min**, muy por debajo del umbral de 15. Microservicios a esta escala sería malpraxis — el Arquitecto cínico no encontró qué romper aquí y lo admite con dolor.

## [2.3] Database & Data — **VEREDICTO: 🟡 ADVERTENCIA**

Sano: fuente de verdad única por entidad, audit trail admin completo (F2, con antes→después), índices auditados contra call-sites reales (F3.4), N+1 eliminados, purga COPPA de ActivityEvent con cron.
**Gaps reales:** (1) **Right-to-erasure incompleto** — no existe flujo de "borrar/anonimizar TODO lo de este usuario" end-to-end (Ley 172-13 RD lo exige y con menores es peor); el borrado de cursos es hard-delete sin papelera. (2) Backups offsite: código listo, **bucket sin crear** [user].
**ACCIÓN INMEDIATA:** [user] crear bucket B2/R2 (15 min, ~1 USD/mes) — activa el offsite ya implementado.
**ACCIÓN ESTRATÉGICA:** Flujo de erasure: endpoint admin "anonimizar usuario" (nombre→"Usuario eliminado", email→null, uploads borrados, ActivityEvent purgado; AuditLog conserva el rastro por diseño legal). Owner: Wilser, 2 días. KPI: erasure completo demostrable en <30 días desde solicitud.
**COSTO DE IGNORAR:** Una solicitud de un padre que no puedes cumplir + pérdida total de datos si el disco muere antes del bucket.

## [2.4] API Surface — **VEREDICTO: 🟡 ADVERTENCIA (un gap con nombre)**

Sano: rate limiting en las 12 rutas sensibles (F1), paginación/take-caps en listas (F3), firma HMAC verificada en ambos webhooks (Stripe + WhatsApp), error schema consistente (`ok/bad` + códigos i18n). Versionado: no hay — correcto para API interna sin consumidores externos (decisión documentada, no descuido).
**El gap:** el webhook de Stripe **no deduplica por `event.id` y no es atómico** (create + update sueltos) — documentado y FIJADO en test por F5 como gap explícito de F7.
**ACCIÓN ESTRATÉGICA (bloqueante de F7, no de hoy):** tabla `StripeEvent` procesados + `$transaction` en el webhook — primer commit de F7 cuando lleguen las llaves. Owner: Wilser, 0.5 día. **Stripe no se conecta sin esto.**

## [2.5] Mobile — **VEREDICTO: 🟢 SANO (por ausencia deliberada)**

No hay app nativa/híbrida — correcto: duplicar plataforma pre-piloto sería quemar el runway. La web responsive es la apuesta. Se revisita SOLO si el piloto muestra >70 % de uso móvil con fricción real medida.

## [2.6] Frontend Web — **VEREDICTO: 🟢 SANO con medición pendiente**

Bundle 136 kB First Load (−25 % en F4), fonts self-hosted (sin render-block externo), code-split real por pantalla incluido i18n. Pendiente honesto: FCP/LCP en 3G real — inmedible hasta staging (token). PWA/offline: no — candidato post-piloto si los datos de red de RD lo piden.
**ACCIÓN (tras token):** Lighthouse móvil contra staging; umbral de acción: LCP > 3 s en 3G. Owner: Wilser, 2 horas.

---

# FASE 3 · SEGURIDAD — ¿desastre esperando a suceder?

## [3.1] Security Posture — **VEREDICTO: 🟡 ADVERTENCIA**

Sano y verificado: scrypt + `timingSafeEqual` (cero deps de crypto externas), rate limit en login (8/5min por IP+email), anti-enumeración verificada por test, suspendidos sin cookie (F5-fix), CSP estricta, gitleaks en CI (143 commits, 0 leaks), secrets solo en el VPS.
**Gaps que el Paranoico no perdona:** (1) **Sin 2FA para ADMIN** — la cuenta que puede suspender menores y ver la bandeja de WhatsApp se protege con una contraseña de mínimo... (2) **6 caracteres**. (3) Pentest: nunca (ni automatizado).
**ACCIÓN INMEDIATA:** mínimo de contraseña 8 + lista de comunes en register/reset. Owner: Wilser, 0.5 día.
**ACCIÓN ESTRATÉGICA (antes de usuarios reales):** TOTP para rol ADMIN (2-3 días); pasada de OWASP ZAP contra staging al desbloquearse + `security-review` sobre el repo. KPI: 0 hallazgos high sin resolver antes del piloto.
**COSTO DE IGNORAR:** Un admin phishado = acceso a datos de menores = fin reputacional de una academia que vive de la confianza de padres.

## [3.2] Data Protection & Compliance — **VEREDICTO: 🟡 ADVERTENCIA**

Sano: COPPA-style real (ConsentRecord transaccional, banda <13, PENDING por defecto, purga de actividad), TLS (certbot), PII fuera de logs (no hay logging de bodies).
**Gaps:** erasure end-to-end (ver 2.3); backups remotos sin cifrar → usar `rclone crypt` al crear el bucket (mismo esfuerzo); Privacy Policy/ToS: no constan escritos por abogado — con menores en RD esto no es template de internet.
**ACCIÓN:** [user] 1 revisión legal de ToS/Privacidad (Ley 172-13 + COPPA si hay alumnos US) antes del piloto público.

## [3.3] Disaster Recovery — **VEREDICTO: 🟡 ADVERTENCIA (de 🔴 a 🟡 esta semana)**

Antes de F1 era 🔴 puro: backup local en el MISMO disco, uploads sin respaldo, crons solo en la crontab manual. Hoy: pg_dump diario + backup de uploads + rotación + offsite implementado con verificación + crons idempotentes en bootstrap + restore documentado. **Lo que falta para 🟢:** bucket creado [user] y UN restore ensayado de verdad en el VPS.
**ACCIÓN INMEDIATA:** [user] bucket (15 min) → **ACCIÓN SIGUIENTE:** ensayo de restore completo documentando el tiempo real (RTO medido, no imaginado). Owner: Wilser, 2 horas con acceso.
**Multi-región:** NO — sobre-ingeniería a esta escala; RPO ≤24 h con offsite es el estándar correcto para el piloto.

## [3.4] Supply Chain — **VEREDICTO: 🟢 SANO**

**19 dependencias directas** (contra >500 típicas), 0 CVEs conocidas (nodemailer high cerrado en F1), Dependabot semanal con majors congelados por decisión escrita, gitleaks en CI, auth sin vendor (cero lock-in de Auth0/Firebase). SBOM: `npm sbom` cuando algún cliente lo pida — no antes.

---

# FASE 4 · OBSERVABILIDAD — ¿ciego o con rayos X?

## [4.1–4.3] Los tres pilares — **VEREDICTO: 🔴 CRÍTICO (el área más débil del producto)**

**ESCENARIO DE MUERTE:** Semana 2 del piloto. Un deploy introduce un 500 en la reserva de sesiones. Nadie lo ve: no hay Sentry, no hay alertas, los logs viven en `docker logs` del VPS. Los padres del piloto lo intentan dos veces, no funciona, escriben al WhatsApp de Isaac... o peor, no escriben. Pierdes 5 de tus 20 familias por un bug de 15 minutos de arreglo que descubriste 4 días tarde. **Si el usuario reporta el bug antes que tu tooling, tu observabilidad falló** — y hoy fallaría siempre.

Lo que existe: `/api/health` con healthcheck del cron de deploy, CI verde por push, métricas de NEGOCIO en `/admin` (esto último inusualmente bien para la etapa). Lo que NO existe: captura de errores, alertas, logs estructurados, tracing.

**EVIDENCIA QUE NECESITO:** ninguna — la ausencia es total y verificada.

**ACCIÓN INMEDIATA (paquete "ojos mínimos", <1 día dev + 25 min user):**
1. [user] Cuenta Sentry free (10 min) → Wilser cablea `@sentry/nextjs` (2-3 h): todo 500 y toda excepción del SPA reportada con release tag.
2. [user] UptimeRobot free (10 min) sobre `/api/health` staging+prod: caída → email/telegram en 5 min.
3. Logs estructurados: `console.error` de rutas → JSON con requestId (pino o formato propio, 3 h). Retención: los 14 días del docker log rotation ya configurado bastan para el piloto.

**ACCIÓN ESTRATÉGICA:** SLO inicial único y honesto: **p95 de `/api/app-data` < 800 ms y error rate < 0.5 % semanal** — pintado en `/admin` desde datos propios. Error budget: si se gasta, la semana siguiente es de estabilidad, no features (regla escrita, Isaac la conoce).
**COSTO DE IGNORAR:** El piloto entero — es tu única cohorte y no la puedes repetir.

---

# FASE 5 · PROCESO Y EQUIPO — ¿la máquina está rota?

## [5.1] Velocity vs Salud Técnica — **VEREDICTO: 🟢 SANO (con asterisco)**

Datos de ESTA semana: 6 fases del Plan Maestro ejecutadas (F1–F6) con gate completo por commit, +133 tests netos, 0 regresiones, CI verde en cada push. El ratio features/deuda/incendios es sanísimo porque la deuda se atacó primero (Plan Maestro ordenó exactamente eso).
**El asterisco del PM mercenario:** velocidad de élite construyendo... un producto que aún no vende. La máquina está afinada; el asterisco es del negocio (Fase 1), no del proceso.

## [5.2] Bus Factor — **VEREDICTO: 🟡 ADVERTENCIA**

El conocimiento está inusualmente documentado (DEPLOY.md con restore, SYSTEM_MAP, Plan Maestro, auditorías, comentarios de intención en el código). El bus factor real NO es conocimiento: es **acceso** — GitHub, VPS (llave SSH), dominio, y pronto Stripe/Meta viven en las cuentas personales de Wilser.
**ACCIÓN INMEDIATA:** [user] gestor de contraseñas compartido founder-a-founder + llave SSH de respaldo impresa/offline + Isaac como owner secundario del repo GitHub. 1 hora, cero código.
**COSTO DE IGNORAR:** Un teléfono robado = la empresa entera inaccesible.

## [5.3] Deployment & CI/CD — **VEREDICTO: 🟡 ADVERTENCIA (un gap concreto)**

Deploys: cada push a main (verdadera CD). Feature flags: constantes en código — suficientes ahora.
**El gap:** rollback. `vps-pull.sh` sigue `:latest` — volver atrás hoy = revertir commit + esperar CI (~8 min) o cirugía manual. El umbral de 5 min no se cumple.
**ACCIÓN INMEDIATA:** taggear cada imagen con el SHA + guardar `last-good`; `rollback.sh` que repunta el compose al tag anterior y recarga (sin CI de por medio). Owner: Wilser, 0.5 día. KPI: rollback demostrado en <5 min.

## [5.4] Code Quality — **VEREDICTO: 🟢 SANO**

Review real (supervisor verifica línea a línea cada diff de agente — el patrón de esta campaña con desobediencias justificadas documentadas), ESLint 0 errores como gate, tsc estricto en CI, 503 tests con las rutas de dinero/sesión/menores cubiertas, i18n con enforcement automático. Coverage % no se mide — con la cobertura dirigida a riesgo que hay, el número sería vanidad.

---

# FASE 6 · UX & GROWTH — ¿retiene o es un funnel con fugas?

## [6.1] Onboarding & First Value — **VEREDICTO: 🟡 ADVERTENCIA**

Existe: registro → placement (6 dimensiones) → dashboard con curso demo sembrado. QA de 4 roles pasó al 100 %. **Nadie ha medido el tiempo real** de signup → primera acción core, y el placement — correcto pedagógicamente — es fricción pre-valor para un niño de 11 años.
**ACCIÓN INMEDIATA:** medir time-to-value con los eventos de 1.5 desde el día 1 del piloto; umbral: <5 min hasta primera acción core. Si el placement lo rompe → hacerlo posponible ("hazlo luego" visible). Owner: Wilser, decisión con datos de la semana 1.

## [6.2] Retention & Habit Loop — **VEREDICTO: 🟢 SANO en mecánica, sin datos**

El loop existe de verdad post-campaña: racha con gracia + XP solo-si-mejora (anti-farmeo verificado) + notificaciones reales (G1) + **recordatorios de sesión** (F6.1 — el gancho que trae de vuelta sin email marketing). Falta lo único que no se puede codear: comprobar que funciona con humanos. Se mide en el piloto (1.5).

## [6.3/6.4] Web/Mobile UX — **VEREDICTO: 🟡 pendiente de campo**

Responsive verificado en QA; 3G real de RD sin medir (staging bloqueado); estados vacíos y de error cuidados en las 23 pantallas (campaña de diseño previa). NPS: prematuro — la entrevista de salida del piloto (1.5) vale más que un número con n=20.
**ACCIÓN:** sesión de observación real: 3 alumnos + 2 padres usando la app EN SUS TELÉFONOS delante de Isaac, sin ayuda. 1 tarde. Cada fricción observada = issue. Owner: Isaac + Wilser, semana 1 del piloto.

---

# TOP 10 KILLER ACTIONS (90 días, ordenadas por impacto/esfuerzo)

| # | Acción | Owner | Esfuerzo | Por qué mata más que el resto |
|---|---|---|---|---|
| 1 | **Renovar token ghcr** + `docker login` en VPS | Wilser (humano) | **5 min** | Desbloquea TODO: staging, mediciones reales, Lighthouse, k6, ZAP. Todo lo demás espera detrás |
| 2 | **Pricing v1 validado con 10 padres** (doc de 1 página + conversaciones) | Isaac | 2 semanas, 0 código | Sin precio validado, Stripe conecta un número inventado |
| 3 | **Piloto cerrado 20 familias** con métrica de éxito pre-acordada (≥10 activas en semana 4) | Isaac + Wilser | 4 semanas | La única forma de saber si el negocio existe |
| 4 | **Paquete "ojos mínimos"**: Sentry + UptimeRobot + bucket B2 con `rclone crypt` | user 35 min + dev 1 d | 1 día | Sin esto, el piloto quema fallos en silencio y sin paracaídas de datos |
| 5 | **Stripe + Connect (F7)** con el dedupe de webhook como PRIMER commit | Wilser | 4-5 días tras llaves | El círculo económico — con la red de tests F5 ya esperándolo |
| 6 | **Instrumentar funnel + North Star** (signup→placement→core action→semana activa) en `/admin` | Wilser | 2 días | Convierte el piloto de anécdota en experimento |
| 7 | **2FA TOTP para ADMIN + contraseña mínima 8** | Wilser | 3 días | La llave de los datos de menores no puede ser una password de 6 |
| 8 | **`rollback.sh` en <5 min** (tags por SHA + last-good) | Wilser | 0.5 día | Cada deploy del piloto deja de ser un acto de fe |
| 9 | **Erasure end-to-end** (anonimizar usuario completo) | Wilser | 2 días | Ley 172-13 + menores: la primera solicitud real no se puede improvisar |
| 10 | **Entrevistas de salida** obligatorias (30 min) con cada baja del piloto | Isaac | permanente | El dato de churn más barato y valioso que existirá |

**Regla del tribunal sobre la lista:** las acciones 1–4 van ANTES de invitar a la primera familia. La 5 puede ir en paralelo. Nada de features nuevas hasta que el piloto arroje datos.

---

# PREGUNTA FINAL DEL TRIBUNAL

**"Con $1M, ¿OTR o su competidor más cercano?"**

Respuesta brutal: hoy no lo pondría en ninguno de los dos — porque el "competidor más cercano" es WhatsApp+Excel (no invertible) y OTR aún no ha demostrado que UNA familia pague. **Pero** el tribunal reconoce lo inusual: el riesgo de OTR ya NO es técnico. La ingeniería está por encima del percentil de su etapa (503 tests, seguridad auditada, COPPA real, CI/CD, deuda atacada ANTES de escalar — el orden correcto que casi nadie sigue). Todo el riesgo restante está concentrado en UNA incógnita: **distribución y disposición a pagar en el mercado de Isaac**.

**Qué debe cambiar para que la respuesta sea "en OTR":** exactamente las Killer Actions 1–3. Si el piloto termina con ≥10 familias activas pagando un precio validado, OTR pasa de "producto bonito" a "negocio con moat local y ingeniería que sobra para el próximo 10×" — y entonces el $1M va a OTR sin dudarlo, a distribución (más coaches, más ciudades, contenido), no a reescribir nada.

*Tribunal cerrado. Auditoría basada en: descubrimiento de 6 dimensiones (2026-07-17), Plan Maestro F1–F6 ejecutado y verificado, 93 hallazgos del audit CTO previo, y el estado real de `main` en el commit de esta fecha. Las áreas de negocio quedan explícitamente pendientes de los datos listados en cada "EVIDENCIA QUE NECESITO".*
