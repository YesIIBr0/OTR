# Informe CTO — OTR Academy · Fase 0 Discovery (2026-07-12)

> Auditoría multi-agente (10 dimensiones en paralelo) sobre `main@e82b9bd`, verificada contra el sistema real y el schema Postgres en vivo. 93 hallazgos, 0 críticos, 14 HIGH, 36 MEDIUM, 43 LOW. Salud para su estadio: 70/100 · madurez media L2.8/5 contra vara enterprise.

> Resumen ejecutivo, matriz de madurez y veredicto: ver el informe navegable (artifact). Este archivo es el listado completo con evidencia.


**Totales:** CRITICAL 0 · HIGH 14 · MEDIUM 36 · LOW 43

---


## Config y Secrets (Paso 0.3) — next.config.mjs, tsconfig.json, Dockerfile, docker-compose.yml, .github/workflows/deploy.yml, vitest.config.ts, ecosystem.config.cjs, .gitignore/.dockerignore, .env* (existencia)

**Madurez:** L4 — higiene de config/secretos deliberada y documentada (multi-stage non-root, headers de seguridad completos con CSP/HSTS, secretos fuera del repo con historial git verificado limpio, bootstrap que genera secretos aleatorios, seed con guard de producción); le falta digest-pinning, secret-scanning en CI, CSP sin unsafe-inline y validación de placeholders para llegar a L5.


Los archivos de config existen todos y están comentados con racional operativo: next.config.mjs (CSP + 6 security headers + HSTS preload en prod), Dockerfile multi-stage de 3 etapas con usuario non-root, docker-compose con web atado a 127.0.0.1:3000 y Postgres SIN puertos expuestos, CI en deploy.yml (gate tsc+vitest+prisma validate en cada push/PR, build en runner de GitHub, push a ghcr con token efímero del job — sin PAT en el repo), vitest.config.ts y ecosystem.config.cjs (PM2 alternativo). El grep de patrones de secretos (sk_live/sk_test/AKIA/ghp_/xox/Bearer/password=/token=) sobre todo el código dio CERO hits; .env existe localmente pero está gitignoreado, nunca fue commiteado en el historial (git log --all vacío) y .dockerignore excluye .env* de la imagen; los .example tracked solo contienen placeholders. Las contraseñas del seed ya no están hardcodeadas (SEED_PASSWORD o aleatoria generada, prisma/seed.ts:106). El placeholder AUTH_SECRET del Dockerfile se evaluó y NO es riesgo real de runtime (solo vive en la etapa builder; el runner no lo hereda y auth-crypto falla en el arranque si falta el secreto real). Los riesgos residuales son de segundo orden: placeholders de .env.example que PASARÍAN la validación de longitud mínima, CSP con unsafe-inline (tradeoff arquitectónico documentado), y referencias stale a la contraseña demo "otr1234" en docs y bootstrap.


### [MEDIUM] Los placeholders públicos de AUTH_SECRET en los templates pasan la validación de la app: auth-crypto solo exige >=16 caracteres, y tanto "cambia-esto-por-un-secreto-largo-y-aleatorio" (.env.example:11) como "CAMBIA_POR_UN_SECRETO_LARGO_Y_ALEATORIO_openssl_rand_hex_32" (.env.production.example:23) superan esa longitud. Un operador que copie el template sin cambiar el valor arranca la app con un secreto HMAC públicamente conocido en GitHub.

- **Evidencia:** app/lib/auth-crypto.ts:19-22 (única validación: !SECRET || SECRET.length < 16) + .env.example:11 + .env.production.example:23; el path automatizado sí lo mitiga (scripts/bootstrap-vps.sh:41-45 genera openssl rand -hex 32), pero DEPLOY.md y docker-compose.yml:7 documentan el path manual "cp .env.production.example .env.production (y rellénalo)"

- **Impacto de negocio:** Con el secreto HMAC conocido cualquiera puede forjar cookies de sesión firmadas (signSession es userId+ts+fp+HMAC) → suplantación de cualquier usuario incluyendo admin y acceso a datos de menores. Probabilidad moderada (requiere error del operador en el path manual), impacto crítico.

- **Acción:** En auth-crypto.ts, además del largo mínimo, rechazar una blocklist de valores conocidos (los dos placeholders de los .example y el del Dockerfile) o exigir entropía mínima; es un cambio de 3 líneas que convierte el error de operador en un crash explícito al arranque.


### [MEDIUM] CSP de producción con script-src 'unsafe-inline': la arquitectura de builders string-template (onclick inline + innerHTML) obliga a permitir todo script inline, con lo cual la CSP no detiene XSS — toda la defensa recae en el contrato de escape del servidor (esc() en queries.ts).

- **Evidencia:** next.config.mjs:9 (`script-src 'self' 'unsafe-inline'`) y comentario en :4-5 reconociendo el tradeoff; app/components/Aula.tsx:1137 monta el HTML con dangerouslySetInnerHTML

- **Impacto de negocio:** Un solo fallo de escape en cualquier builder scr-*.ts (archivos con @ts-nocheck, sin tipado) se convierte en XSS ejecutable con acceso a la sesión de estudiantes menores — la CSP que normalmente sería la segunda barrera está desactivada de facto para scripts.

- **Acción:** Corto plazo: mantener y ampliar los tests del contrato de escape (ya existen en tests/). Mediano plazo: migrar los handlers onclick inline a event delegation (un solo listener en el contenedor) para poder quitar 'unsafe-inline' de script-src sin reescribir los builders.


### [MEDIUM] La contraseña demo antigua "otr1234" sigue publicada en el repo aunque el seed ya fue corregido: bootstrap-vps.sh la imprime como login válido al terminar, y DEPLOY.md y docs/review/README.md la documentan como credencial vigente de saul@otr.do (TEACHER/admin) y analia.reyes@otr.do.

- **Evidencia:** scripts/bootstrap-vps.sh:146 (`Login demo: saul@otr.do / analia.reyes@otr.do — otr1234`), DEPLOY.md:48, DEPLOY.md:316, docs/review/README.md:19; el seed actual usa SEED_PASSWORD o aleatoria (prisma/seed.ts:104-107, fix SEC-4/OPS-6)

- **Impacto de negocio:** Si el staging VPS fue sembrado antes del fix, las cuentas reales (incluida la de coach con permisos elevados) siguen accesibles con una contraseña de 7 caracteres publicada en GitHub. El estado vivo de la BD del VPS no es verificable desde el código: no detectado.

- **Acción:** Actualizar bootstrap-vps.sh:146 y los 3 docs para que remitan a SEED_PASSWORD; verificar/rotar en el VPS de staging las contraseñas de las cuentas sembradas históricamente.


### [LOW] docker-compose define credenciales por defecto débiles para Postgres con fallback silencioso: si .env.production no define POSTGRES_PASSWORD, la BD y el DATABASE_URL corren con usuario/contraseña "otr"/"otr" sin ningún error.

- **Evidencia:** docker-compose.yml:32 (`postgresql://${POSTGRES_USER:-otr}:${POSTGRES_PASSWORD:-otr}@postgres...`) y :64-66; mitigado porque el puerto 5432 NO se publica al host (docker-compose.yml:74, comentario explícito) y bootstrap-vps.sh:42-47 genera contraseña aleatoria

- **Impacto de negocio:** Sin exposición externa el riesgo directo es bajo, pero cualquier proceso que llegue a la red interna de compose accede a la BD (datos de menores) con credencial trivial si el operador omitió la variable.

- **Acción:** Quitar los fallbacks `:-otr` de POSTGRES_PASSWORD (dejar que compose falle con variable no definida) — el fallback de usuario y nombre de BD sí puede quedarse.


### [LOW] El CI no tiene secret-scanning ni auditoría de dependencias: el gate es solo typecheck + prisma validate + vitest. Para un flujo de desarrollo de alta velocidad asistido por IA, no hay barrera determinista que impida que un secreto real llegue a un commit futuro.

- **Evidencia:** .github/workflows/deploy.yml:23-47 (job ci completo: npm ci, prisma generate/validate, tsc, vitest — sin gitleaks/trufflehog ni npm audit)

- **Impacto de negocio:** Hoy el repo está limpio (grep de patrones dio cero hits y .env nunca estuvo en el historial), pero un descuido futuro publicaría el secreto en GitHub y en la imagen de ghcr sin que nada lo detenga.

- **Acción:** Añadir un step de gitleaks (acción oficial, ~10 líneas) al job ci y opcionalmente `npm audit --audit-level=high` como advisory.


### [LOW] Ninguna imagen ni action está pinneada por digest: node:20-alpine (3 etapas), postgres:16-alpine y las actions checkout@v4/setup-node@v4 se referencian por tag mutable.

- **Evidencia:** Dockerfile:10,21,37; docker-compose.yml:61; .github/workflows/deploy.yml:27-28

- **Impacto de negocio:** Builds no reproducibles y exposición teórica a supply-chain (un tag re-publicado cambia el contenido sin cambio en el repo). Riesgo bajo en la práctica para imágenes oficiales de Docker Hub/GitHub, pero es la brecha estándar que separa esta config de las buenas prácticas actuales.

- **Acción:** Pinnear por digest (`node:20-alpine@sha256:...`) y las actions por SHA de commit; Dependabot/Renovate puede mantener los digests actualizados.


### [LOW] El deploy consume el tag mutable :latest — el VPS baja "lo último" comparando image IDs, sin verificación de digest esperado, y aunque CI también publica un tag por SHA de commit, el rollback no está cableado.

- **Evidencia:** docker-compose.yml:22 (`image: ghcr.io/yesiibr0/otr:latest`), scripts/vps-pull.sh:13,17-25; CI publica ambos tags en deploy.yml:69-71

- **Impacto de negocio:** Quien controle el paquete de ghcr puede hacer que el VPS despliegue una imagen arbitraria en <=2 min (el cron la baja solo); un rollback ante deploy malo requiere retag manual en ghcr. Aceptable en staging pre-revenue, insuficiente para producción con datos reales.

- **Acción:** Antes de producción: desplegar por tag de SHA (el vps-pull lee el SHA deseado de un archivo/endpoint firmado) o al menos documentar el procedimiento de rollback con los tags por commit que ya existen.


### [LOW] La imagen final incluye las devDependencies completas: el runner copia node_modules del builder (npm ci sin prune), llevando typescript, vitest y @types/* a producción. Parcialmente intencional — el contenedor necesita prisma CLI (migrate deploy en vps-pull.sh:33) y tsx (db:seed) — pero el resto es peso muerto.

- **Evidencia:** Dockerfile:18 (npm ci) + Dockerfile:50 (COPY node_modules completo al runner); package.json devDependencies (typescript, vitest, @types/*)

- **Impacto de negocio:** Imagen más pesada (pulls más lentos en el VPS de 1 CPU, más disco) y superficie de ataque mayor; sin impacto funcional.

- **Acción:** Adoptar `output: 'standalone'` de Next o un `npm prune --omit=dev` selectivo conservando prisma/tsx; ganancia real pero no urgente.


### [LOW] tsconfig con strict:false (+allowJs, skipLibCheck) y los builders scr-*.ts con @ts-nocheck: el gate de typecheck del CI existe pero verifica poco justo en la capa que genera HTML con datos de usuario.

- **Evidencia:** tsconfig.json:11 (`"strict": false`); CI corre tsc --noEmit en deploy.yml:42-43

- **Impacto de negocio:** Errores de null/undefined y de tipos en la capa de renderizado (la más sensible por el contrato de escape) solo se detectan en runtime; reduce el valor del gate de CI como control de calidad.

- **Acción:** Activar strict de forma incremental (empezar con strictNullChecks solo en app/lib y app/api) sin tocar los builders legacy todavía.


### [LOW] CSP img-src con wildcard `https:` — cualquier origen HTTPS puede servir imágenes dentro del Aula.

- **Evidencia:** next.config.mjs:12 (`img-src 'self' data: blob: https:`)

- **Impacto de negocio:** Permite tracking pixels y exfiltración de baja anchura de banda vía URLs de imagen en contenido generado por usuarios, en un producto con menores. Riesgo menor porque el texto de usuario se escapa y no debería inyectar tags img, pero es la única directiva laxa de una CSP por lo demás estricta.

- **Acción:** Acotar img-src a los hosts realmente usados (self, data:, blob:, dominios de YouTube/Cloudflare thumbnails) cuando se conozca la lista.


### [LOW] AUTH_SECRET placeholder del Dockerfile — EVALUADO Y DESCARTADO como riesgo real: el ENV vive solo en la etapa builder (necesario porque auth-crypto valida al importar durante next build), la etapa runner parte de un FROM limpio y no lo hereda, y en runtime la app crashea al arrancar (fail-closed) si el secreto real falta o es corto.

- **Evidencia:** Dockerfile:32 (etapa builder, con comentario del racional) vs Dockerfile:37-68 (runner sin AUTH_SECRET); app/lib/auth-crypto.ts:19-22 (throw al importar); docker-compose.yml:33 lo inyecta desde .env.production

- **Impacto de negocio:** Ninguno detectado: el valor placeholder no puede terminar firmando sesiones reales salvo que alguien despliegue deliberadamente la etapa builder. Se reporta para cerrar el issue conocido con veredicto explícito.

- **Acción:** Nada urgente; la blocklist de placeholders propuesta en el finding #1 también cubriría este valor como defensa en profundidad.


### [LOW] El pull de ghcr desde el VPS depende de un PAT clásico de larga vida con scope read:packages guardado en el docker login del VPS (el token efímero del job solo se usa para el push desde CI).

- **Evidencia:** scripts/vps-pull.sh:8-9 (requisito documentado: `docker login ghcr.io -u <user> -p <PAT_read_packages>`)

- **Impacto de negocio:** Credencial permanente en un VPS de staging; su alcance es solo lectura de paquetes, así que el impacto de fuga es bajo (descargar la imagen privada), pero no hay política de rotación detectada.

- **Acción:** Documentar rotación periódica del PAT en DEPLOY.md o migrar a un fine-grained token con expiración cuando Hostinger/ghcr lo permita.


---


## Testing, calidad de código y documentación (PASO 0.7 + 0.12)

**Madurez:** L3 — hay un gate de CI real en cada push/PR (tsc + validación de ambos schemas Prisma + 200 tests deterministas que pasan en 0.4s) y un corpus de docs/ADRs inusualmente rico para un solo dev pre-revenue, pero el tipado está apagado justo donde vive la UI (strict:false + 30 @ts-nocheck), el lint es inexistente (script roto, sin eslint instalado) y las 57 rutas API tienen cero tests.


La suite de tests es pequeña pero honesta y determinista: 5 archivos, 200 tests verdes en 416ms (verificado ejecutando `npx vitest run`), entorno node sin red ni DB. Composición: 20 tests unitarios puros (esc/escaping 4, glicko2 4, text 6, i18n-wiring 6) + 180 smoke-tests de render generados dinámicamente (tests/screens.test.ts: 21 pantallas × roles, con stub de window — un arnés poco común que ya atrapó un ReferenceError real). Lo que NO cubre: los 57 route handlers de app/api (0 tests de API), integración con DB, y los e2e Playwright de QA que viven FUERA del repo (scratchpad del operador) — no versionados ni en CI. Calidad: TypeScript con strict:false, 30 archivos con @ts-nocheck (toda la capa Aula: scr-*.ts, data.ts, i18n.ts, shell.ts) y 343 usos de `any` en app/; el lint no existe (script `next lint` sin eslint en devDependencies ni config, y CI no lo corre); sin hooks pre-commit. Conventional Commits sí se cumple rigurosamente (55/60 commits recientes, en español). Docs: muy por encima del estándar de la etapa (CONVENTIONS, ONBOARDING, TEAM_PROCESS, SYSTEM_MAP, DATA_MODEL, 4 ADRs, backlog.csv, 17 reportes de review/ux-audit), pero congeladas al 15-16 de junio: el README describe el prototipo estático de Moodle que ya no existe, CONVENTIONS enseña la marca navy/sky obsoleta y niega migraciones que ya existen (prisma/migrations/), y no hay OpenAPI ni runbooks (el propio TEAM_PROCESS lo admite como gap DOCS-1).


### [HIGH] 57 route handlers de API con CERO tests: toda la lógica de negocio (reservas, escrow simulado, consentimiento COPPA, adjudicación Glicko-2, admin) carece de pruebas en la capa HTTP; la suite solo cubre funciones de lib y render de pantallas

- **Evidencia:** `find app/api -name route.ts | wc -l` → 57; tests/ contiene solo esc.test.ts, glicko2.test.ts, text.test.ts, i18n-wiring.test.ts, screens.test.ts (ninguno importa app/api)

- **Impacto de negocio:** Regresiones en flujos de dinero y de seguridad de menores (consentimiento, reservas) llegan a staging con CI verde; el gate actual da falsa confianza sobre el backend

- **Acción:** Agregar tests de integración vitest para los ~10 handlers críticos (auth, booking, consent COPPA, adjudicate, admin) invocando los route handlers directamente con Request/Response y SQLite de fixture


### [HIGH] Lint inexistente y no funcional: el script `lint: next lint` existe pero eslint NO está en devDependencies, no hay ningún .eslintrc*/eslint.config.*, y el job de CI no tiene paso de lint

- **Evidencia:** package.json:10 (script lint) vs devDependencies sin eslint (package.json:32-42); `ls .eslintrc* eslint.config.*` → no matches; .github/workflows/deploy.yml:23-47 sin paso lint; `grep eslint package-lock.json` → vacío

- **Impacto de negocio:** Ninguna detección automática de código muerto, variables sin usar o patrones inseguros; contradice la política del propio dev de enforcement determinista en CI

- **Acción:** Instalar eslint + eslint-config-next (o Biome, más liviano), crear config mínima, corregir el script y añadir el paso al job ci de deploy.yml


### [HIGH] TypeScript efectivamente apagado en la capa UI: strict:false global, 30 archivos con @ts-nocheck (todas las pantallas scr-*.ts MÁS libs núcleo: data.ts, i18n.ts, components.ts, shell.ts, screens.ts, icons.ts) y 343 ocurrencias de `any` en app/

- **Evidencia:** tsconfig.json:11 ("strict": false); `grep -rl @ts-nocheck app` → 30 archivos; `grep -rn ': any|as any' app | wc -l` → 343; tsc --noEmit pasa (exit 0) pero con garantías débiles

- **Impacto de negocio:** La clase de bug que el arnés de render atrapó (ReferenceError de variable `c` en scr-marketplace, documentado en tests/screens.test.ts:14-18) es exactamente lo que el compilador habría prevenido gratis

- **Acción:** Encendido incremental: noImplicitAny + strictNullChecks primero en app/api y libs sin @ts-nocheck; mantener scr-* como deuda aceptada (ya documentada en ADR-0004) con fecha de revisión


### [MEDIUM] La suite e2e Playwright (QA de 4 roles que validó el sitio completo) vive fuera del repo, en el scratchpad del operador: no está versionada, no es reproducible y no corre en CI

- **Evidencia:** No existe playwright.config.* ni carpeta e2e/ ni dependencia playwright en package.json; los resultados solo sobreviven como reportes estáticos en docs/review/reports/QA_REPORT.md

- **Impacto de negocio:** La única red de seguridad de flujo completo (login→reserva→pago simulado→portal padres) se pudre en silencio y no puede gatear deploys; irreproducible si cambia el operador

- **Acción:** Commitear los specs a tests/e2e/ con playwright.config.ts y correr al menos un subset smoke en CI tras build-and-push (o nightly contra staging)


### [MEDIUM] README.md totalmente obsoleto: describe el prototipo estático del 9 de junio ("theme hijo de Boost (Moodle)", correr con `npx serve .`, paleta navy/sky, niveles JV/Varsity) — nada de eso corresponde a la app Next.js 15 + Prisma actual ni a la marca verde/negro ni a los OTR Degrees

- **Evidencia:** README.md:1-45; `git log -1 -- README.md` → 2026-06-09 "Initial commit" (nunca actualizado en 32 días de desarrollo intenso)

- **Impacto de negocio:** El primer punto de entrada para cualquier colaborador, inversionista o auditor externo miente sobre qué es el producto

- **Acción:** Reescribir a 1 página (qué es, stack real, cómo correr, link a docs/ONBOARDING.md y DEPLOY.md)


### [MEDIUM] El gate de CI en PRs no ejecuta `next build`: solo tsc+tests; el build real ocurre dentro del docker build del job build-and-push, que se salta en pull_request — un PR verde puede romper el build de producción y se descubre después del merge

- **Evidencia:** .github/workflows/deploy.yml:23-47 (job ci sin build) y :49-51 (build-and-push con `if: github.event_name != 'pull_request'`); el build vive en Dockerfile:34 (`RUN npm run build`)

- **Impacto de negocio:** Pipeline de deploy bloqueado post-merge hasta arreglar; en un flujo de un solo dev con push directo a main el riesgo es medio, pero crecerá con el 2º dev

- **Acción:** Añadir paso `next build` (con cache de .next) al job ci, o al menos ejecutarlo en PRs


### [MEDIUM] El corpus de docs internas (CONVENTIONS, ONBOARDING, ADRs, SYSTEM_MAP, TEAM_PROCESS) quedó congelado el 15-16 de junio mientras el producto cambió sustancialmente en julio (olas 1-5, COPPA/ConsentRecord, rebrand verde/negro, migraciones Prisma, drills, panel de métricas): el doc de gotchas ahora enseña cosas falsas

- **Evidencia:** git log -1 por archivo → todos 2026-06-15/16; staleness concreta: docs/CONVENTIONS.md sección "Diseño / marca" dice "navy #0C2340 + azul cielo #4FA9E8" (marca vieja) y el gotcha 3 dice "no hay migraciones versionadas todavía" pero prisma/migrations/ existe (0_init + 20260711000000_add_user_created_at)

- **Impacto de negocio:** CONVENTIONS.md se vende como "léelo antes de tocar nada" — un colaborador nuevo (o una IA) que lo siga aplicará la paleta equivocada y usará db push en vez de migraciones

- **Acción:** Un pase de actualización de CONVENTIONS/ONBOARDING + convención de fecha "última verificación" en el header de cada doc


### [LOW] Sin hooks pre-commit de ningún tipo: no hay Husky ni lint-staged en package.json y los git hooks del repo padre son solo samples; en un repo PÚBLICO con secretos en el VPS, no hay escaneo de secretos previo al commit

- **Evidencia:** package.json sin husky/lint-staged; OTR_Academy/.git/hooks/ sin hooks custom (OTR_work es worktree); CONVENTIONS.md gotcha 6 confirma que el repo es público

- **Impacto de negocio:** La barrera anti-fuga de secretos y anti-commit-roto depende 100% de disciplina humana; CI mitiga lo segundo pero no lo primero

- **Acción:** Hook pre-commit mínimo: gitleaks/secretlint + tsc rápido; barato de instalar y alineado con la política de enforcement determinista del dev


### [LOW] No hay OpenAPI ni documentación de la superficie API: 57 handlers documentados solo implícitamente (CONTRACT.md cubre el contrato de datos del Aula, no los endpoints); el propio proceso lo reconoce como deuda

- **Evidencia:** grep -rli openapi en todo el repo → única mención docs/TEAM_PROCESS.md:44 ("Falta... API docs (OpenAPI). [DOCS-1] Medium")

- **Impacto de negocio:** Aceptable con 1 dev; se vuelve bloqueante al integrar terceros (Tabroom/NSDA planificado) o al sumar el 2º dev

- **Acción:** No urgente: mantener el gap registrado; generar inventario mínimo de rutas (método, path, rol requerido) como tabla en docs/ cuando se aborde la integración NSDA


### [LOW] Sin runbooks de operación/incidentes y DEPLOY.md (11 jun) no describe el flujo de deploy REAL actual: no menciona el cron vps-pull.sh cada 2 min ni el healthcheck; scripts/backup-db.sh existe pero ningún doc explica el restore

- **Evidencia:** `grep -i 'vps-pull|cron' DEPLOY.md` → 0 resultados vs .github/workflows/deploy.yml:60-63 que documenta el flujo real; "runbook" solo aparece como gap en docs/TEAM_PROCESS.md

- **Impacto de negocio:** Con un solo VPS de 1 CPU y deploy por cron-pull, un incidente a las 2am se resuelve de memoria; el riesgo real es la recuperación de la DB de menores sin procedimiento escrito

- **Acción:** Runbook de 1 página: qué hacer si el healthcheck falla, cómo hacer rollback a la imagen ghcr anterior por SHA, y procedimiento de restore de backup-db.sh


---


## Base de datos (Prisma dual-schema SQLite/Postgres)

**Madurez:** L2-L3 — esquema funcional, bien comentado y con índices deliberados + migraciones baselined + backup diario + deploy gateado, pero con FKs fantasma, cero updatedAt, enums-como-strings y modelos legacy con fechas congeladas como labels de UI; por encima de L2 puro en operación, por debajo de L3 en integridad/auditabilidad.


49 modelos en prisma/schema.postgres.prisma, sin enums nativos (todo String+comentario) y sin un solo updatedAt en todo el esquema. La mitad del esquema es relacional sólido y recientemente reforzado (relaciones inversas [DATA-2/3], Restrict en Booking para proteger el ledger de escrow, índices con rationale documentado que cubren los hot paths de queries.ts); la otra mitad arrastra modelos demo-legacy (GradeCell, ForumThread, Conversation) con fechas congeladas como strings de UI y sin FKs. Los riesgos reales que importan: ~10 columnas userId/senderId son strings crudos sin @relation (huérfanos posibles en historial de debate, consentimiento COPPA y chat), coexisten dos estrategias de aplicación de esquema (migrate deploy en vps-pull.sh vs db push en deploy.sh/bootstrap-vps.sh) que pueden desincronizar _prisma_migrations, y el rastro de auditoría para transiciones de dinero (EscrowTxn) y consentimiento (Guardianship) es incompleto. El dual-schema hoy está sincronizado (diff = solo provider + comentarios) pero se mantiene a mano sin guard de paridad en CI. PII de menores en claro es aceptable en staging pre-revenue, pero los pg_dump sin cifrar en el mismo disco agravan la exposición.


### [HIGH] FKs fantasma: ~10 columnas de referencia son String crudo sin @relation → cero integridad referencial en Postgres. Afecta DebateRecord.userId, ChatMessage.senderId, CoachProfile.userId, TournamentRegistration.userId, ClubMembership.userId, ConsentRecord.studentId/grantedById, Notification.userId, ConsultationBooking.userId, Resource.teacherId y Booking.packageId (indexado pero sin relación a CoachPackage).

- **Evidencia:** prisma/schema.postgres.prisma:601 (DebateRecord.userId sin relation), :454 (ChatMessage.senderId), :666 (CoachProfile.userId @unique sin relation), :588-589 (ConsentRecord), :713 (Booking.packageId). Contraste: el esfuerzo [DATA-2/3] (líneas 56-66) añadió relaciones inversas a otros 10 modelos pero dejó estos fuera.

- **Impacto de negocio:** Borrar un User huérfana su historial Glicko-2 (activo core del producto), su perfil de coach y sus registros de torneo sin que la DB lo impida; el rastro de consentimiento COPPA puede apuntar a IDs de usuario inexistentes — exactamente el tipo de hueco que un auditor de privacidad señalaría.

- **Acción:** Añadir @relation con onDelete explícito (Restrict para DebateRecord/ConsentRecord, SetNull para ChatMessage.senderId) en una migración; ConsentRecord puede quedarse sin FK deliberadamente (evidencia que sobrevive al borrado) pero entonces documentarlo y snapshotear nombre/email en la fila.


### [HIGH] Dos estrategias de aplicación de esquema conviven contra la misma DB: vps-pull.sh usa `prisma migrate deploy` (gateado, aborta si falla — bien) pero deploy.sh y bootstrap-vps.sh usan `prisma db push --skip-generate`, que altera el DDL sin registrar en _prisma_migrations.

- **Evidencia:** scripts/vps-pull.sh:33 (`migrate deploy` con abort), scripts/deploy.sh:26 y scripts/bootstrap-vps.sh:75 (`db push --skip-generate`), docker-compose.yml:11 sugiere ambos como equivalentes ("migrate deploy # o db push").

- **Impacto de negocio:** Si alguien corre deploy.sh tras una migración nueva, _prisma_migrations queda desincronizado del DDL real → el siguiente `migrate deploy` falla o aplica DDL sobre columnas ya existentes, tumbando el pipeline de deploy en el peor momento. Con 1 solo dev es fácil que ocurra.

- **Acción:** Eliminar `db push` de todos los scripts de servidor (dejarlo solo para dev SQLite local); estandarizar en `migrate deploy` y borrar o corregir el comentario de docker-compose.yml.


### [MEDIUM] Cero campos updatedAt en los 49 modelos y 30/49 sin createdAt. Crítico donde hay máquinas de estado con dinero o consentimiento: EscrowTxn (HELD→RELEASED→REFUNDED) solo timestampea releasedAt — un REFUNDED no tiene fecha; Booking.status (5 estados) y Guardianship.status (PENDING→ACTIVE→REVOKED, el corazón COPPA) no registran cuándo transicionaron.

- **Evidencia:** grep 'updatedAt' schema.postgres.prisma → 0 resultados; EscrowTxn :735-745 (solo createdAt+releasedAt); Guardianship :562-582 (solo createdAt); Booking :709-733. Sin createdAt: Enrollment, ChatMessage, DebateRecord (usa recordedAt), CoachProfile, entre 30.

- **Impacto de negocio:** Ante una disputa de reserva o una revocación de consentimiento parental no se puede reconstruir la línea de tiempo — inaceptable cuando el pago deje de ser simulado y débil ya hoy para el rastro COPPA que ConsentRecord dice garantizar.

- **Acción:** Migración barata: añadir `updatedAt DateTime @updatedAt` a los modelos con status (Booking, EscrowTxn, Guardianship, Report, Enrollment, DebateRecord) + campos de transición explícitos (revokedAt, refundedAt); ActivityEvent ya sirve como ledger para el resto.


### [MEDIUM] 0 enums nativos: 20+ máquinas de estado son String con el vocabulario en un comentario (User.role, Booking.status, EscrowTxn.status, Guardianship.status, Enrollment.status, membership, ageBand…). Sin enum de Postgres ni CHECK constraint, un typo ('COMPLETE' vs 'COMPLETED') se inserta sin error y los filtros lo pierden en silencio. Es el costo directo del dual-schema: SQLite no soporta enums, así que el mínimo común denominador gobierna a Postgres.

- **Evidencia:** grep -c '^enum ' schema.postgres.prisma → 0; schema.postgres.prisma:18 (role), :717 (Booking.status), :741 (EscrowTxn.status), :568 (Guardianship.status), :285-292 (Enrollment: 4 vocabularios string en un modelo).

- **Impacto de negocio:** Estados inválidos silenciosos en el flujo de dinero (escrow) y de consentimiento; cada consumidor debe conocer el vocabulario de memoria. El riesgo crece linealmente con cada endpoint nuevo.

- **Acción:** Corto plazo: centralizar los vocabularios como const objects TypeScript y validarlos en la capa de escritura (queries.ts). Al retirar SQLite (o aceptar divergencia controlada): migrar los status de dinero/consentimiento a enums nativos de Postgres.


### [MEDIUM] PII de menores en claro sin cifrado a nivel de campo (esperable en este estadio) PERO agravado por la cadena de backups: pg_dump gzip SIN cifrar, en el MISMO disco del VPS, con 14 días de retención. User.name/email/birthYear/ageBand/location + ConsultationBooking captura name/email/phone de prospectos (incluidos menores) sin cuenta, con índice por email.

- **Evidencia:** schema.postgres.prisma:16-17 (birthYear/ageBand), :60 (location), :518-535 (ConsultationBooking con phone e @@index([email])); scripts/backup-db.sh:8-9 admite explícitamente 'backup LOCAL en el MISMO VPS… NO protege ante pérdida del disco'; grep de cifrado en app/lib → solo hashing de auth, nada de cifrado de campo.

- **Impacto de negocio:** Un compromiso del VPS único expone 14 días de dumps completos con PII de menores — el radio de daño de cualquier intrusión se multiplica. Para COPPA, los datos de menores en backups también cuentan.

- **Acción:** Antes de offsite: cifrar el dump (age/gpg con clave pública, descifrado offline) — 2 líneas en backup-db.sh. El cifrado a nivel de campo puede esperar a revenue; el cifrado del backup no debería.


### [MEDIUM] Sin soft-deletes (0 deletedAt/isDeleted en 49 modelos) + Cascade generalizado: borrar un User destruye en cascada Reviews, QuizAttempts, Uploads y TODO su ActivityEvent — el 'ledger universal' que el propio esquema declara como spine del producto. No hay camino de anonimización modelado.

- **Evidencia:** grep deletedAt/isDeleted → 0; schema.postgres.prisma:547 (ActivityEvent onDelete: Cascade), :543-544 (comentario: 'write target universal… Dashboard/Lifetime Progress/Parent Report leen'); contraste positivo: Booking usa Restrict (:726-727) protegiendo el escrow.

- **Impacto de negocio:** El 'derecho a borrar' COPPA hoy es binario: o se niega (Restrict por bookings) o se vaporiza el historial de progreso que otros features consumen. Reviews de coaches desaparecen al borrar al alumno autor, alterando ratings del marketplace retroactivamente.

- **Acción:** Definir el flujo de borrado/anonimización como operación explícita (el comentario [DATA-2/3] sugiere que ya se pensó): anonimizar User (name→'Usuario eliminado', email→tombstone) preservando agregados, en vez de delete físico.


### [MEDIUM] Dual-schema mantenido a mano sin guard de paridad: schema.prisma (SQLite) y schema.postgres.prisma son copias paralelas de 818/819 líneas. HOY están sincronizados (diff = provider + 2 comentarios — disciplina real), y CI valida el postgres y lo copia para el build, pero nada falla si alguien edita solo uno.

- **Evidencia:** diff schema.prisma schema.postgres.prisma → solo líneas 10-11 (provider) y 2 bloques de comentario; .github/workflows/deploy.yml:41 (validate) y :68 (cp postgres→prisma); ningún job compara ambos archivos.

- **Impacto de negocio:** El día que diverjan, dev (SQLite) y prod (Postgres) prueban esquemas distintos: bugs invisibles en local que explotan en deploy. Con builders @ts-nocheck encima, la DB es de las pocas capas tipadas que quedan — perder su paridad duele doble.

- **Acción:** Job de CI de 5 líneas: diff de ambos schemas ignorando provider/url y comentarios; falla el build si divergen. Alternativa mejor a mediano plazo: generar el de SQLite desde el de Postgres con un script.


### [MEDIUM] Aislamiento por rol 100% en capa de aplicación (single-tenant, no aplica RLS multi-tenant, pero la observación vale): el scoping de datos sensibles (conversaciones de menores, hijos de un padre, notas) vive solo en cláusulas where de queries.ts; la DB no tiene segunda línea de defensa y el usuario de DB de la app es dueño total del esquema.

- **Evidencia:** app/lib/queries.ts:227 (participants some userId — scoping correcto de chat), :464 (guardianship por parentId), :959 (bookings de hijos); no se detectó RLS ni usuario de DB restringido en docker-compose/bootstrap.

- **Impacto de negocio:** Un solo where olvidado en queries.ts (1641 líneas, todos los roles servidos por la misma mega-función) filtra datos de menores entre roles. Ya pasó una vez con ChatMessage.me (bug [CROSS-01] documentado en el propio esquema :451-453).

- **Acción:** Aceptable hoy; mitigar con tests de autorización por rol sobre app-data (asserts de que el payload de student no contiene datos de otros) — más barato y realista que RLS en este estadio.


### [LOW] User como tabla Dios incipiente: 51 campos (el mayor del esquema) mezclando 7 dominios — auth, gamificación XP, rating Glicko-2, speaker rating, membresía, perfil marketplace y preferencias como JSON-en-String sin validar (preferences, notificationPrefs).

- **Evidencia:** schema.postgres.prisma:14-85 (modelo completo); conteo de campos: User 51, siguiente Course/Lesson 25; :61-62 (preferences/notificationPrefs String JSON).

- **Impacto de negocio:** Todavía manejable, pero cada dominio nuevo (Stripe real, NSDA sync) tenderá a engordar User; los JSON-string son estado no consultable ni migrable con seguridad.

- **Acción:** No urgente. Cuando llegue Stripe: extraer membresía/billing a su propio modelo en vez de añadir más columnas; considerar Json nativo de Postgres para preferences al retirar SQLite.


### [LOW] Modelos demo-legacy con datos modelados como labels de UI congelados: ChatMessage.timeLabel, ForumPost/Conversation.whenLabel, ActivityItem.whenLabel, Enrollment.lastAccess String(''), Submission.createdLabel('ahora'), y GradeCell — una celda de hoja de cálculo keyed por studentName sin ningún FK. EventItem ya fue corregido (startsAt real) pero el resto sigue.

- **Evidencia:** schema.postgres.prisma:457 (timeLabel), :410-411, :372, :294 (lastAccess String @default("")), :478, :300-308 (GradeCell completo); :359-360 (comentario del fix de EventItem reconoce el patrón como deuda).

- **Impacto de negocio:** 'hace 2h' congelado para siempre; ordenar/filtrar por fecha imposible en foro y chat; GradeCell se desincroniza si un alumno cambia de nombre. Es deuda del prototipo conviviendo con el esquema serio.

- **Acción:** Aplicar el mismo patrón del fix de EventItem (timestamp real + label derivado en lectura) a ChatMessage y ForumPost al tocarlos; GradeCell candidato a rediseño o eliminación.


### [LOW] Contadores denormalizados con doble fuente de verdad: CoachProfile.ratingAvg/reviewCount/bookingCount existen como columnas PERO queries.ts recalcula los agregados de Review con groupBy en cada carga de app-data; Course.lessonsCount/studentsCount y ForumThread.replies/views sin mecanismo de reconciliación.

- **Evidencia:** schema.postgres.prisma:674-676 vs app/lib/queries.ts:293-296 (db.review.groupBy by teacherId y por courseId en el Promise.all principal); schema :104-105, :382-383.

- **Impacto de negocio:** Deriva silenciosa entre columna y agregado real → un coach muestra rating distinto según la pantalla. Costo bajo hoy (recalcular es barato a esta escala), pero es confusión latente.

- **Acción:** Elegir una fuente: o borrar las columnas denormalizadas (el groupBy ya paga el costo) o mantenerlas con actualización transaccional al escribir Review/Booking.


### [LOW] Cobertura de índices en general BUENA (hot paths de queries.ts cubiertos con rationale documentado), con huecos menores: la query de notificaciones trae las 200 primeras de TODA la tabla sin where (el @@index([userId]) queda sin usar y usuarios ven posiciones globales), quizAttempt.findMany del usuario sin take (unbounded), y ConsentRecord.grantedById/ChatMessage.senderId sin índice para consultas inversas futuras.

- **Evidencia:** app/lib/queries.ts:215 (notification.findMany sin where) vs schema :338 (@@index([userId])); queries.ts:368 (quizAttempt sin take); positivos: schema :83 ([leaderboardOptIn,debateRating] con comentario [PERF]), :484-485, :731 ([coachId,slotAt]), :557 ([userId,createdAt]).

- **Impacto de negocio:** En un VPS de 1 CPU donde cada carga de app-data ya dispara ~40 queries en Promise.all, las queries sin bound son las que degradarán primero al crecer filas — pero hoy no es el cuello de botella.

- **Acción:** Añadir where userId/global a la query de notificaciones y take a quizAttempts; los índices faltantes pueden esperar a que exista la consulta que los necesite.


---


## Frontend — SPA "Aula" (builders string-template scr-*.ts @ts-nocheck + innerHTML montados por React)

**Madurez:** L2 — Arquitectura deliberadamente simple (string templates + innerHTML + @ts-nocheck, sin type-safety de UI ni testing de componentes granular), pero ejecutada con bolsones de disciplina L3-L4 (focus-trap centralizado por MutationObserver, code-splitting real por módulo, aria-live/skip-link/AA, contrato esc() y 200 smoke-tests verdes). Neto honesto: L2 con rigor L3 en a11y/perf.


La SPA Aula es un patrón de builders string-template: cada scr-*.ts (22 archivos, ~9.100 líneas, todos @ts-nocheck) exporta S = { ruta: { render()->string, mount() } } y Aula.tsx (1139 líneas) los monta con innerHTML y delega clicks con un event-delegation global. Las ventajas son reales para un dev+IA pre-revenue: cero dependencias de UI, simplicidad, no hay hidratación que romper, y el code-splitting por import() (screens.ts) funciona de verdad — un alumno no baja el código del admin. Pero el costo también es real: no hay type-safety en la capa de UI, la defensa XSS depende 100% de la disciplina de llamar esc() (476 llamadas en builders, 122 en queries.ts) y ese contrato se ROMPE en el contexto string-JS-dentro-de-atributo (onclick), no existe testing de componentes más allá de smoke de render(), y el estado global vive en ~22 variables window.__x + window.DB (dataset completo). La a11y está notablemente por encima del típico para este patrón (focus-trap, aria-live, skip-link, modales con retorno de foco), lo que demuestra que cuando el equipo detecta un problema, lo centraliza bien (money() consolidado es otra prueba). Los gaps que importan: XSS por esc()-en-onclick, ausencia de error boundary que cubra el runtime del SPA, y duplicación divergente de helpers.


### [HIGH] El contrato esc() (única defensa XSS) se rompe en el contexto string-JS-dentro-de-atributo: onclick="window.__course='${esc(c.code)}';go('course')". esc() convierte la comilla simple a &#39;, pero el parser HTML la re-decodifica a ' al asignar el atributo onclick, rompiendo el literal de string JS y ejecutando código. course.code lo controla un teacher/coach (clean() en courses/route.ts solo trima y corta a 40 chars, no filtra comillas), así que es XSS ALMACENADO que dispara cuando un alumno (menor) hace click en la tarjeta del curso.

- **Evidencia:** app/lib/scr-core.ts:173, :291, :431 y app/lib/scr-extra.ts:309 (onclick="window.__course='${esc(c.code)}'…"); app/lib/esc.ts:11 (mapea ' -> &#39;); app/api/courses/route.ts:13 (const code = clean(body.code,40), sin filtro de charset)

- **Impacto de negocio:** XSS almacenado explotable por cualquier cuenta de coach self-service, que ejecuta en la sesión de estudiantes menores de edad: robo de cookie de sesión, acciones en nombre de la víctima, exfiltración de window.DB. El comentario en next.config.mjs afirma 'el riesgo XSS está mitigado' por esc() — la afirmación es falsa en este contexto.

- **Acción:** No renderizar valores dentro de literales JS en atributos onclick. Migrar estos sinks a data-* + delegación (ya existe el patrón data-go/data-enroll en Aula.tsx) o usar un escape específico de contexto JS. Auditar los ~22 usos de window.__x en onclick.


### [MEDIUM] Ningún error boundary cubre el runtime del SPA. error.tsx y global-error.tsx solo capturan errores durante el render de React; toda la lógica de Aula corre en useEffect, event handlers y el async renderApp() — contextos que los error boundaries de React NO atrapan. Un builder @ts-nocheck (sin chequeo de tipos) que lance en render(state) deja la pantalla congelada/en blanco sin UI de recuperación.

- **Evidencia:** app/components/Aula.tsx:108 (root.innerHTML = renderShell(...screen.render(state)...) sin try/catch), :100 (keepPage.innerHTML = screen.render(state)), :1133 (renderApp(startRoute) inicial sin guardia); error.tsx solo recibe {error,reset} del árbol React

- **Impacto de negocio:** Un fallo de datos en cualquiera de las 35 pantallas (campo null inesperado, dato mal formado) tumba toda el aula a pantalla congelada en vez de degradar; sin type-safety de UII el riesgo es cotidiano. El usuario ve el spinner de carga o una pantalla muerta, no el 'Reintentar' que el equipo cree tener.

- **Acción:** Envolver screen.render()/mount() y renderApp() en try/catch que pinte un estado de error recuperable dentro de #content (reusando el toast de retry ya existente) en vez de dejar burbujear el throw.


### [MEDIUM] Estado global de la app en ~22 variables window.__x (routing params: __course, __lesson, __room, __convo, __builderCourseId…) más window.DB = el dataset COMPLETO del usuario asignado por Object.assign(DB, data) y mutado in-place para updates optimistas. No hay encapsulación: cualquier script/extensión lee todos los datos (incluidos los de menores) desde window.DB, y los __x persisten entre navegaciones/roles como estado stale.

- **Evidencia:** app/components/Aula.tsx:26 (Object.assign(DB, data)), :219 (Object.assign(DB, fresh)); app/lib/data.ts:5 (export const DB: any = {}); 22 identificadores window.__* distintos en scr-*.ts

- **Impacto de negocio:** Fugas de estado entre pantallas (un __course viejo puede pintar la pantalla equivocada), imposibilidad de test unitario del estado, y exposición del dataset entero en window — smell de privacidad para una plataforma con datos de menores. Acopla toda la SPA a globals mutables difíciles de razonar.

- **Acción:** No bloqueante a corto plazo; a mediano plazo mover los params de ruta a un objeto de estado encapsulado pasado por renderApp(state) y evitar exponer el dataset completo en window (o al menos no mutarlo in-place).


### [LOW] Duplicación divergente de helpers entre builders: ini() (iniciales de avatar) está copiado 6 veces con implementaciones DISTINTAS (unas devuelven 'A', otras 'C' con replace(/Coach /), otras '?'); stars() duplicado 2 veces byte a byte; card() aparece con 4 firmas incompatibles. Contrasta con money() que SÍ se consolidó en money.ts (buena señal de que el equipo deduplica cuando lo nota).

- **Evidencia:** ini(): scr-admin.ts:33, scr-admin-users.ts:38, scr-coachwork.ts:55, scr-marketplace.ts:39, scr-parent.ts:30, scr-profile.ts:200; stars(): scr-marketplace.ts:31, scr-hub.ts:25; money() ya consolidado en app/lib/money.ts

- **Impacto de negocio:** Bajo — inconsistencia visual (mismas iniciales renderizadas distinto según pantalla) y mantenimiento a 6 sitios. No afecta funcionalidad ni seguridad. Existe app/lib/components.ts (objeto C) como lugar natural para consolidarlos.

- **Acción:** Mover ini()/stars() a components.ts (C.avatarInitials, C.stars) como se hizo con money(). Bajo esfuerzo, alto orden.


### [LOW] a11y de tablas incompleta: los <th> no llevan scope="col", no hay <caption>, y varias filas de datos usan role=button+tabindex en vez de semántica de tabla nativa. El RESTO de la a11y es sólida (skip-link, aria-live para cambio de ruta, focus-trap centralizado en modales vía MutationObserver con retorno de foco, cierre con Escape, AA en badges de nivel).

- **Evidencia:** app/lib/scr-teacher.ts:86 y :622, app/lib/scr-admin-metrics.ts:77 (<th> sin scope); focus-trap OK en Aula.tsx:1074-1122; skip-link en shell.ts:151; aria-live en Aula.tsx:58-67

- **Impacto de negocio:** Lectores de pantalla no anuncian la relación celda-encabezado en las tablas de tracking de alumnos/participantes/métricas. Impacto acotado (pocas tablas), y el grueso de la a11y ya cumple — es pulido, no un bloqueo.

- **Acción:** Añadir scope="col" a los <th> y un <caption> (sr-only) por tabla. Cambio mecánico de bajo riesgo.


### [LOW] Bundle real y code-splitting: EVALUACIÓN POSITIVA. El split por módulo con import() funciona (screens.ts LOADERS + ensureScreen + prefetchForRole por rol en idle). Chunk inicial aula/page ~280KB + framework 189KB + main 137KB + polyfills 112KB + 2 chunks compartidos ~172KB (React DOM). Total .next/static = 1.9MB. El diccionario i18n (763 líneas) e icons viajan en el chunk inicial.

- **Evidencia:** du -sh .next/static = 1.9M; .next/static/chunks/app/aula/page = 280KB; framework 189KB; screens.ts:12-35 (LOADERS por módulo), :94-101 (prefetchForRole)

- **Impacto de negocio:** Ninguno negativo — para un VPS de 1 CPU y esta superficie de features el peso es razonable y el split evita que roles bajen código ajeno. Informativo: se podría lazy-cargar i18n del idioma no activo, pero no es prioritario.

- **Acción:** Ninguna acción requerida. Opcional futuro: separar el diccionario i18n EN del chunk inicial si el TTI en 3G importa.


---


## PASO 0.1+0.2 — Estructura del repo y stack tecnológico (/Users/wilserbatistamarcelino/repos/OTR_work @ integrate-all)

**Madurez:** L3 — stack vigente y arquitectura deliberada (4 ADRs, CI real, docs de onboarding ejemplares para 1 dev pre-revenue), pero lastrado por type-safety apagada en la capa más grande (strict:false + @ts-nocheck en 30 archivos), runtime Node 20 EOL y un major de retraso en Next/Prisma/TS.


Mapa real: monolito Next.js 15 App Router con servidor en capas — 57 route handlers (app/api/**: auth, bookings, checkout, stripe/webhook, guardianship, membership, debates, tabroom…) → helpers transversales (app/lib/api.ts ok/bad/clean, auth.ts+auth-crypto.ts+authz.ts, rate-limit.ts, safety.ts, sanitize.ts) → hotpath app/lib/queries.ts (1.641 LOC, getAppData) → Prisma dual-schema (49 modelos IDÉNTICOS verificados por diff entre prisma/schema.prisma SQLite-dev y schema.postgres.prisma, con migraciones versionadas 0_init + 1) — más scripts/ (vps-pull.sh, backup-db.sh), tests/ (5 archivos, 200 tests que PASAN en 387ms) y .github/workflows/deploy.yml (gate tsc+prisma validate x2+vitest → imagen a ghcr → VPS-pull por cron). El patrón NO es big-ball-of-mud ni layered puro: es un híbrido propio documentado en ADR-0004 — React solo como host (app/components/Aula.tsx, 1.138 LOC, único punto de montaje + handlers delegados) de una SPA vanilla de string-templates (22 builders app/lib/scr-*.ts, estado global mutable window.DB, ~26.263 LOC TS/TSX en app/), decisión consciente que concentra el riesgo en el contrato de escape esc() y en la ausencia de tipos. Un dev nuevo se orienta en <30 min SI empieza por docs/ (ONBOARDING.md con "de cero a primer cambio desplegado", SYSTEM_MAP.md, CONVENTIONS.md con 6 gotchas reales, 4 ADRs) — no hay CLAUDE.md, y el README raíz describe un prototipo muerto, lo que desorienta los primeros minutos. Stack exacto del lockfile (v3, 206 paquetes totales — excepcionalmente magro): Next 15.5.19 (L4, un major detrás de 16.2.10), React 19.2.7 (L4), Prisma 6.19.3 (L4, latest 7.8.0), TypeScript 5.9.3 (L4 nominal / L2 efectivo por strict:false), Vitest 4.1.9 (L5), stripe 22.2.0 (L4), sanitize-html 2.17.4 (L4), nodemailer 8.0.10 (L3, advisory alto), Node 20-alpine en Docker y CI (L2: EOL abril 2026, hoy jul-2026). Cero deps fantasma (las 7 deps de producción tienen import verificado; stripe vía dynamic import) y licencias limpias para SaaS (sin GPL/AGPL; único LGPL-3.0 es el binario opcional de sharp/libvips que trae Next). npm audit: 0 críticas / 1 alta / 2 moderadas / 1 baja.


### [HIGH] Runtime Node 20 en fin de vida (EOL 30-abr-2026; hoy 11-jul-2026): las tres etapas de la imagen Docker de producción y el runner de CI corren un Node que ya no recibe parches de seguridad.

- **Evidencia:** Dockerfile:10,21,37 `FROM node:20-alpine` (deps/builder/runner) + .github/workflows/deploy.yml:30 `node-version: "20"`

- **Impacto de negocio:** La app pública que maneja datos de MENORES (COPPA) corre sobre un runtime sin soporte de seguridad; cualquier CVE futuro de Node queda sin parche en staging/prod.

- **Acción:** Subir a node:22-alpine (LTS activo) en Dockerfile y CI — cambio de 4 líneas; verificar `npm ci && npm run build && npm test` y el healthcheck del deploy.


### [HIGH] Type-safety efectivamente apagada en la capa más grande del sistema: tsconfig strict:false y 30 archivos con // @ts-nocheck (los 22 builders scr-*.ts + i18n.ts, shell.ts, data.ts, icons.ts, screens.ts, components.ts, text.ts, drills-data.ts) — >13.5k LOC donde el gate de CI `tsc --noEmit` no verifica casi nada.

- **Evidencia:** tsconfig.json:11 `"strict": false`; `grep -rl @ts-nocheck app` = 30 archivos; wc -l app/lib = 13.503 LOC

- **Impacto de negocio:** Regresiones en flujos de dinero (escrow/membresías), rating Glicko-2 y consentimiento COPPA solo se detectan en runtime; cada refactor de la SPA es a ciegas, y el 'typecheck verde' del CI da falsa confianza.

- **Acción:** Plan incremental: (1) quitar @ts-nocheck de las libs que NO son templates (data.ts, i18n.ts, drills-data.ts, text.ts), (2) strict:true con errores existentes suprimidos por archivo, (3) los scr-*.ts quedan como excepción documentada en ADR-0004 si se decide mantener el patrón.


### [MEDIUM] npm audit: 4 vulnerabilidades — 1 ALTA (nodemailer <=9.0.0, GHSA-p6gq-j5cr-w38f: opción raw permite lectura arbitraria de archivos y SSRF; instalado 8.0.10), 2 moderadas (postcss <8.5.10 vía next), 1 baja (esbuild, solo dev). Exploitabilidad práctica de la alta es baja porque app/lib/mail.ts no expone `raw` a input de usuario, pero la dependencia queda en rango vulnerable.

- **Evidencia:** `npm audit` → {critical:0, high:1, moderate:2, low:1}; nodemailer importado en app/lib/mail.ts:5

- **Impacto de negocio:** Superficie de ataque conocida y publicada en un repo público; un uso futuro descuidado de nodemailer (p.ej. adjuntos con paths de usuario) activaría el vector de lectura de archivos del VPS.

- **Acción:** `npm i nodemailer@9` (breaking mayor: revisar mail.ts, hay 200 tests como red) y `npm i next@15.5.20` para la moderada de postcss; re-correr audit en CI.


### [MEDIUM] Lint inexistente y script muerto: package.json declara `lint: next lint` pero eslint NO está en devDependencies, no existe ningún .eslintrc/eslint.config, node_modules/.bin/eslint no existe, y Next 15.5 deprecó `next lint`. El CI tampoco corre lint (solo tsc+vitest).

- **Evidencia:** package.json:10 `"lint": "next lint"`; `ls node_modules/.bin/eslint` → No such file; deploy.yml sin paso de lint

- **Impacto de negocio:** En una arquitectura basada en innerHTML + string-templates, no hay ninguna regla automática que detecte concatenaciones sin esc() ni patrones peligrosos; el único enforcement es la disciplina del dev (bus factor 1).

- **Acción:** O borrar el script (honestidad) o —mejor— añadir eslint flat config mínimo (eslint + typescript-eslint, sin estilo) y engancharlo al job `ci` de deploy.yml.


### [MEDIUM] Escombros del prototipo original trackeados en git desorientan el onboarding: el README raíz describe 'theme prototype... HTML+CSS+JS vanilla (sin build)' (el producto muerto), y la raíz contiene index.html, app.js, screens-*.js, components.js, data.js, icons.js (~1.6k LOC) más app.css/tokens.css/screens.css/responsive.css que DUPLICAN los nombres de los reales en app/styles/*; site/ (460K) es lo que CONVENTIONS.md llama literalmente 'basura legacy eliminable'.

- **Evidencia:** README.md:1-8; `git ls-files | grep screens-` (trackeados); docs/CONVENTIONS.md gotcha 4; app.css (16.9KB raíz) vs app/styles/app.css (27.8KB real)

- **Impacto de negocio:** Un dev nuevo (o una IA) pierde sus primeros 15-30 min en el artefacto equivocado y puede editar el CSS/JS muerto creyendo que es el vivo — el riesgo exacto que un repo de 1 dev no puede permitirse.

- **Acción:** Borrar prototipo raíz + site/ en un commit chore (git conserva la historia) y reescribir README.md en 20 líneas apuntando a docs/ONBOARDING.md.


### [MEDIUM] Los docs (excelentes en estructura) están desactualizados en afirmaciones que un dev nuevo usará para decidir: ONBOARDING dice 'hoy hay 0 tests' (hay 200 que pasan) y '53 rutas' (hay 57); CONVENTIONS gotcha 3 dice 'no hay migraciones versionadas, se usa db push' cuando vps-pull.sh ya hace `migrate deploy` y prisma/migrations/ existe; SYSTEM_MAP fija TS 5.7.3/Next ^15.1.6 vs lock 15.5.19/5.9.3; CONVENTIONS §Diseño manda navy/sky cuando el Aula ya migró a crema/negro/verde.

- **Evidencia:** docs/ONBOARDING.md §4.2 y §6 vs `npx vitest run` (200 passed) y `find app/api -name route.ts | wc -l` = 57; docs/CONVENTIONS.md gotcha 3 vs scripts/vps-pull.sh:33

- **Impacto de negocio:** Docs que contradicen el código pierden autoridad rápido; el dev deja de leerlos y el bus factor 1 vuelve a ser total — se pierde la mejor inversión del repo.

- **Acción:** Barrido de 1h: actualizar los 4 números/afirmaciones y añadir fecha de última verificación a cada doc; idealmente un check de CI que cuente rutas/tests y falle si el doc diverge.


### [LOW] Un major de retraso en el núcleo del stack: next 15.5.19→16.2.10, prisma 6.19.3→7.8.0, typescript 5.9.3→7.0.2, nodemailer 8→9. Las líneas actuales siguen mantenidas (no es urgente), pero el costo del salto crece con cada pantalla nueva.

- **Evidencia:** `npm outdated` (Current vs Latest) sobre package-lock.json

- **Impacto de negocio:** Deuda de migración compuesta: saltar Next 16 + Prisma 7 con 26k LOC será más caro que con 30k; además Next 15 eventualmente saldrá de ventana de parches.

- **Acción:** Agendar el salto Next 16 + Prisma 7 como tarea única post-estabilización (los 200 tests + tsc + smoke QA de 4 roles son la red); mientras tanto, mantener patches (15.5.20, 22.3.1, etc.).


### [LOW] Dos caminos de deploy divergentes para el schema: el camino real (scripts/vps-pull.sh:33) usa `prisma migrate deploy` con abort si falla, pero el script manual scripts/deploy.sh:26 todavía aplica `prisma db push --skip-generate` directo contra el Postgres de prod.

- **Evidencia:** scripts/deploy.sh:25-26 vs scripts/vps-pull.sh:30-34

- **Impacto de negocio:** Si alguien corre deploy.sh a mano en una emergencia, db push puede resolver drift destruyendo columnas/datos sin las salvaguardas del camino de migraciones.

- **Acción:** Borrar deploy.sh o alinearlo a `migrate deploy`; dejar una sola verdad de deploy (la de ADR-0003).


### [LOW] tsconfig con knobs de scaffold viejo: target ES2017, moduleResolution 'node' (vs 'bundler' moderno), allowJs true — funciona, pero es señal de config heredada del create-next-app original y limita sintaxis/resolución modernas.

- **Evidencia:** tsconfig.json:3 `"target": "ES2017"`, :16 `"moduleResolution": "node"`

- **Impacto de negocio:** Impacto directo bajo (Next transpila igual); costo aparece al adoptar libs ESM-only o al activar strict, donde la resolución vieja genera falsos errores.

- **Acción:** Al tocar tipos (finding strict), actualizar a target ES2022 + moduleResolution bundler en el mismo commit.


### [LOW] POSITIVO (para el registro del discovery): higiene de dependencias excepcional y licencias limpias — 7 deps de producción, 206 paquetes totales en lockfile (una app Next típica trae 800+), CERO deps fantasma (nodemailer→app/lib/mail.ts:5, sanitize-html→app/lib/sanitize.ts:4, stripe→dynamic import en app/api/checkout/route.ts:28 y app/api/stripe/webhook/route.ts:12), sin GPL/AGPL; único copyleft es LGPL-3.0 en @img/sharp-libvips (binario transitorio opcional de Next, enlace dinámico — sin obligaciones para SaaS) y CC-BY-4.0 en caniuse-lite (datos). Los 83 'UNKNOWN' del análisis son binarios por-plataforma no instalados en esta máquina, no un riesgo.

- **Evidencia:** package.json:23-31 + grep de imports por dep + análisis de licencias sobre package-lock.json

- **Impacto de negocio:** Superficie de ataque y de supply-chain mínima, installs rápidos en el VPS de 1 CPU, cero riesgo legal de licencias para comercializar el SaaS.

- **Acción:** Ninguna — preservar la disciplina: toda dep nueva debe justificarse (este equilibrio es raro y valioso).


---


## Performance y Escalabilidad

**Madurez:** L3 — ingeniería consciente de su estadio (batching sin N+1, 58 índices, caps con `take`, code-splitting, streaming con Range), pero arquitectura de una sola caja sin capa de caché y con payload monolítico; el camino de escala está documentado en comentarios, no implementado.


Medido en vivo contra el seed real: getAppData ejecuta 56 queries (STUDENT) a 61 (TEACHER) por carga, devolviendo 56-65 KB de JSON; PARENT/ADMIN quedan en 44-50 queries y ~11 KB. No hay N+1 evidentes: el código batchea deliberadamente en ~8-9 olas de Promise.all con `in(...)`, groupBy y agregaciones, y el schema Postgres tiene 58 índices (varios compuestos). La navegación soft NO re-fetchea (renderiza desde el DB en memoria del cliente), pero cada mutación dispara refresh() que re-pide el payload COMPLETO (22 call sites). No existe ninguna capa de caché salvo revalidate:1800 en tabroom; Redis no detectado y honestamente no hace falta aún. La infraestructura es 1 VPS 1-CPU con Node+Postgres+Nginx compartiendo el mismo core: aguanta ~100 usuarios concurrentes con patrón LMS normal, pero un burst de 500 (inicio de clase/torneo) encola segundos y arriesga restart-storm vía healthcheck. Lo primero que rompe al crecer: la CPU única; lo segundo: la amplificación del refresh monolítico; lo tercero: el rate-limit en memoria + uploads en disco local al intentar una segunda instancia.


### [HIGH] Single point of failure total y techo de capacidad: 1 VPS Hostinger 1-CPU corre Node (proceso único, sin cluster), PostgreSQL y Nginx en el mismo core; el backup es local EN EL MISMO DISCO. Estimación cuantitativa: una carga inicial de /aula = ~60 queries + render RSC de ~60 KB ≈ 100-300 ms de CPU → ~5-10 cargas completas/s en el mejor caso. ~100 concurrentes con patrón LMS (SPA navega en cliente): OK con p95 degradado en bursts. 500 concurrentes simultáneos: cola de segundos, y el healthcheck (30s/5s timeout/3 retries contra /aula) puede marcar unhealthy bajo saturación → restart → thundering herd.

- **Evidencia:** docker-compose.yml:15-74 (un solo servicio web + postgres, healthcheck :49-55); Dockerfile:68 (next start, un proceso); ecosystem.config.cjs (instances: 1, max_memory_restart 512M); scripts/backup-db.sh:7 ("backup LOCAL en el MISMO VPS… NO protege ante pérdida del disco")

- **Impacto de negocio:** Un disco muerto pierde datos de menores y padres (reputacionalmente letal para un producto COPPA); un evento de tráfico real (torneo, lanzamiento con un colegio) tumba el servicio justo cuando hay audiencia. Aceptable HOY como staging pre-revenue, inaceptable con el primer cliente pagando.

- **Acción:** Antes del primer cliente real: backup off-site (pg_dump a S3/B2 diario, ~$1/mes), y subir a un VPS 2-4 vCPU (~$20/mes) separando mentalmente (no físicamente aún) DB de app. Vigilar el healthcheck: subir timeout o apuntarlo a /api/health para no reiniciar bajo carga legítima.


### [MEDIUM] Amplificación del payload monolítico: refresh() re-descarga el payload COMPLETO de getAppData (56-61 queries, 56-65 KB) tras CADA mutación — hay 22 call sites en Aula.tsx. Calificar una entrega, marcar una lección o confirmar una reserva re-ejecuta las ~60 queries y re-serializa todo, cuando la mutación tocó una fila. Además el mismo payload viaja DOS veces en la carga inicial (embebido en el RSC de /aula y de nuevo en cada refresh).

- **Evidencia:** app/components/Aula.tsx:214-223 (refresh() → fetch /api/app-data → Object.assign(DB, fresh) → renderApp), 22 invocaciones contadas con grep; app/api/app-data/route.ts:13; medición real: 56q/56.6KB STUDENT, 61q/64.8KB TEACHER (script tsx contra prisma/dev.db)

- **Impacto de negocio:** Multiplica ~10-60x el costo de cada acción de usuario en el único core disponible. Es el factor #2 que consume el techo de capacidad del VPS: 20 profesores calificando activamente generan la carga de cientos de navegaciones.

- **Acción:** No reescribir aún (funciona y el patrón es coherente con la SPA). Cuando haya usuarios reales: respuestas parciales por dominio (p.ej. /api/app-data?scope=submissions) o aplicar el patch local que ya usan las notificaciones (Aula.tsx:880,908 ya lo hacen sin re-fetch — extender ese patrón).


### [MEDIUM] Vectores de crecimiento del payload sin límite práctico: conversaciones trae hasta 50 convos × 200 mensajes CADA una (potencial 10.000 mensajes por carga para un usuario chatero); marketplace trae hasta 500 CoachProfiles CON packages y availability y filtra/ordena EN CLIENTE (el propio comentario ENT-07 lo admite); quizzes trae TODAS las preguntas+opciones de todos los cursos inscritos. Hoy con seed son 57-65 KB; crece linealmente con contenido y mensajería.

- **Evidencia:** app/lib/queries.ts:226-231 (convos take:50 + messages take:200), :260-271 (comentario [ENT-07] + coachProfile.findMany take:500), :379-384 (quiz.findMany con questions+options de todos los cursos)

- **Impacto de negocio:** Un estudiante activo en mensajería o un catálogo de 100+ coaches convierte cada carga y cada refresh() en cientos de KB sin comprimir sobre un VPS de 1 core — la experiencia degrada primero para los usuarios MÁS comprometidos, que son los que pagan.

- **Acción:** Paginar mensajes por conversación (cargar lista de convos + últimos ~20 mensajes de la activa); mover filtro/orden del marketplace al endpoint /api/coaches con cursor que según el comentario ya existe; cargar quiz on-demand al abrir la lección.


### [MEDIUM] Cero capa de caché para datos públicos/compartidos: catálogo, levels, badges, marketplace, leaderboard y torneos se re-consultan desde Postgres para CADA usuario en CADA carga y CADA refresh(), siendo idénticos entre usuarios. El único caché de todo el codebase es el revalidate:1800 de tabroom. Redis: no detectado — y con razón: NO hace falta todavía; un memo TTL in-process eliminaría ~15-20 de las 56 queries sin infraestructura nueva.

- **Evidencia:** app/api/tabroom/tourns/route.ts:21 (único next:{revalidate:1800} del repo); app/api/app-data/route.ts:19 (Cache-Control: private, no-store); app/lib/queries.ts:204,213-217,233,264,429-444 (levels/badges/notifications/courses/coachProfiles/leaderboard/tournaments por-request)

- **Impacto de negocio:** ~1/3 de la carga de DB por request es redundante entre usuarios. En 1 core, eso es capacidad regalada: con caché de 60s en 6 queries públicas, el mismo VPS atendería sensiblemente más concurrencia sin gastar un dólar.

- **Acción:** Memo in-process con TTL 30-60s (un Map módulo-level, mismo patrón que rate-limit.ts) para levels/badges/catalog/marketplace/leaderboard/tournaments. Redis solo cuando haya 2ª instancia — no antes.


### [MEDIUM] La compresión gzip que el código asume no está respaldada por la config de deploy: app-data/route.ts afirma "La compresión la añade Nginx con gzip_vary on", pero el bloque Nginx de DEPLOY.md no contiene NINGUNA directiva gzip (gzip_types application/json: no detectado). El default de Nginx solo comprime text/html — el JSON de 57-65 KB probablemente viaja sin comprimir (sería ~10-15 KB gzipeado).

- **Evidencia:** app/api/app-data/route.ts:16 (comentario que delega gzip a Nginx) vs DEPLOY.md:204-222 (server block sin gzip on/gzip_types); no existe archivo nginx.conf versionado en el repo

- **Impacto de negocio:** 4-5x más bytes por carga y por refresh() para usuarios en móvil/redes lentas (estudiantes dominicanos en datos móviles), y más tiempo de socket ocupado en el único core. Fix de 3 líneas con impacto real.

- **Acción:** Añadir al server block de DEPLOY.md (y al VPS): gzip on; gzip_vary on; gzip_types application/json text/css application/javascript; gzip_min_length 1024. Verificar con curl -H 'Accept-Encoding: gzip' -sI.


### [MEDIUM] Estado en memoria/disco local que rompe al pasar a 2 instancias: (a) rate-limit es un Map en memoria del proceso — con 2 réplicas cada una lleva su propia cuenta y el límite efectivo se duplica (el propio archivo lo admite); (b) uploads viven en un volumen Docker local del host (otr_uploads) — una 2ª instancia en otro host no los ve. En cambio las sesiones SÍ son stateless (cookie firmada, sin tabla de sesión) — eso escala bien.

- **Evidencia:** app/lib/rate-limit.ts:1-2 ("Para múltiples instancias, migrar a Redis"); docker-compose.yml:56-58 (volumen otr_uploads local); app/lib/auth.ts:8-22 (verifySession de cookie firmada, stateless)

- **Impacto de negocio:** No es un problema HOY (instancia única y el código lo documenta honestamente); es la lista exacta de trabajo previo a escalar horizontalmente. Sin resolverlo, añadir una réplica debilita la protección anti-abuso y rompe archivos de usuarios (entregas de estudiantes).

- **Acción:** Nada que hacer ahora; dejar registrado como precondición de escala: rate-limit → Redis (la API ya está diseñada para el swap), uploads → S3/R2 (Cloudflare R2 sin egress encaja con el uso ya existente de Cloudflare Stream).


### [LOW] getSessionUser ejecuta db.user.findUnique SIN select (fila completa, incluido passwordHash para el fingerprint) en CADA request autenticado — incluida cada imagen/archivo servido por /uploads/[...path]. Es +1 query por hit de API; el patrón [BE-03] ya evita el doble lookup en app-data, pero el resto de rutas paga la query completa.

- **Evidencia:** app/lib/auth.ts:14 (findUnique sin select en cada request); app/uploads/[...path]/route.ts:34 (getSessionUser antes de servir cada archivo)

- **Impacto de negocio:** Con Postgres local es <1ms por hit, así que hoy es ruido; a partir de cientos de req/s se vuelve la query más ejecutada de todo el sistema por puro volumen.

- **Acción:** Cuando se optimice: select mínimo (id, role, passwordHash, campos usados) y/o memo TTL 30s por token. No urgente.


### [LOW] Fuentes desde Google Fonts externo (fonts.googleapis.com CSS render-blocking + fonts.gstatic.com) en vez de next/font self-hosted: dependencia de tercero en el critical path de pintado y un origen externo más en el CSP. next/image no se usa en ninguna parte, aunque el impacto real es menor porque la UI usa mayormente iniciales/SVG en vez de fotos.

- **Evidencia:** app/layout.tsx:16-19 (link a fonts.googleapis.com/css2?family=Inter); grep next/image en app/ → 0 resultados; next.config.mjs:10-11 (CSP permite fonts.googleapis/gstatic)

- **Impacto de negocio:** First paint depende de la latencia de Google en cada visita fría y falla feo si el tercero está bloqueado (colegios con filtros de red no es un escenario exótico para este público). Impacto acotado: Inter con display=swap.

- **Acción:** Migrar a next/font/google (self-host automático en build, cero requests externos) — cambio de ~10 líneas que además permite endurecer el CSP.


### [LOW] La imagen Docker de producción copia node_modules COMPLETO (con devDependencies del stage builder) y el código fuente app/ al runner en vez de usar output:'standalone' de Next — imagen considerablemente más pesada que lo necesario, que el VPS de 1 CPU baja de ghcr en cada deploy (cron cada 2 min detecta cambio → pull + down/up con 10-15s de downtime asumido). El bundle cliente en sí está bien: 1.9 MB estático total (~250 KB gzip en critical path) con code-splitting real por import() dinámico de los builders scr-*.

- **Evidencia:** Dockerfile:49-58 (COPY node_modules + app/ + tsconfig al runner; sin output standalone en next.config.mjs); scripts/vps-pull.sh (down/up en cada imagen nueva); .next/static = 1.9 MB medido; app/lib/screens.ts:13-21 (import() lazy por módulo)

- **Impacto de negocio:** Pulls más lentos y más presión de disco/IO en el VPS en cada deploy; el downtime de 10-15s por deploy es aceptable en staging pero se sentirá con usuarios en sesión (un quiz a mitad se salva por el stop_grace_period de 30s, bien pensado).

- **Acción:** Añadir output:'standalone' a next.config.mjs y copiar .next/standalone en el runner (reduce la imagen típicamente 60-80%). Opcional, bajo esfuerzo, no urgente.


---


## Seguridad Zero-Trust (AuthN / MFA / AuthZ / XSS / SQLi / Headers / CSRF / Uploads / Rate-limit / Secrets / COPPA residual)

**Madurez:** L4 — Fundamentos de grado producción bien ejecutados (cripto de sesión sólida, AuthZ consistente por ruta, uploads endurecidos, headers completos, SQLi ~nulo, reset robusto, COPPA con enforcement real). No llega a L5 por gaps identificables: sin MFA, CSP anulado por 'unsafe-inline' arquitectónico (esc() queda como única defensa XSS), rate-limit solo en 4 endpoints, sin capa CSRF más allá de SameSite=lax, y mínimo de contraseña débil (6). Muy por encima de lo esperable para pre-revenue de un solo dev+IA en staging.


La autenticación es de diseño maduro: scrypt con sal aleatoria + timingSafeEqual (auth-crypto.ts:4-17), sesión HMAC-SHA256 con expiración de 30 días y comparación en tiempo constante, y una huella (passwordFingerprint) que liga la sesión al passwordHash actual — cambiar contraseña o suspender invalida sesiones al instante (auth.ts:16-20). La cookie tiene httpOnly, secure en prod, sameSite=lax y path correctos. La autorización es consistente: gates por rol en cada ruta, ownership de coach/profesor en authz.ts, scoping de mensajería por ConversationParticipant, gate de reseñas por booking COMPLETED, y safety-gate de menores en bookings. SQLi es prácticamente nulo (Prisma parametriza; el único queryRawUnsafe es un "SELECT 1" constante). Uploads están bien endurecidos (allowlist MIME + bloqueo explícito SVG/HTML, UUID, fuera de public/, nosniff, anti-traversal). Headers de seguridad completos en next.config.mjs. Los puntos débiles reales son sistémicos y arquitectónicos: el CSP obligado a 'unsafe-inline' por los onclick inline, la ausencia total de MFA, el rate-limiting parcial, y residuales COPPA por age-gate autodeclarado. No hay secretos hardcodeados; .env/.env.production están gitignored.


### [HIGH] El CSP obliga a script-src 'unsafe-inline' porque toda la SPA 'Aula' usa onclick inline + innerHTML, lo que ANULA la protección XSS del propio CSP. Si una sola cadena derivada de usuario se renderiza en un builder scr-*.ts sin pasar por esc() exactamente una vez, es XSS almacenado ejecutable — el CSP no lo frenaría. esc() (esc.ts) queda como la ÚNICA defensa sistémica, y su cobertura depende de disciplina manual (122 llamadas esc() solo en queries.ts) sin test que verifique cobertura, solo la función.

- **Evidencia:** next.config.mjs:9 `script-src 'self' 'unsafe-inline'`; comentario admite el trade-off en next.config.mjs:4-5. innerHTML masivo en app/components/Aula.tsx:100,108,137,160,247,299,395,533,575,698,874 y en los 22 builders scr-*.ts (@ts-nocheck). Contrato esc() en app/lib/esc.ts:10-12; escape único en app/lib/queries.ts (122 usos).

- **Impacto de negocio:** Plataforma con MENORES: un XSS almacenado (p.ej. en nombre de coach, bio, mensaje, título de lección mal escapado) ejecuta JS en la sesión de otros usuarios/padres/admin, permite robo de sesión (aunque httpOnly limita lectura de cookie, permite acciones autenticadas vía fetch same-origin y sameSite=lax) y contenido malicioso servido a niños. Riesgo reputacional y legal severo.

- **Acción:** Mitigado parcialmente hoy por sanitizeHtml (parser real) en contentHtml y por esc() en el resto; correcto. Añadir: (1) tests que afirmen que un payload `<img src=x onerror>`/`<script>` inyectado en cada campo de usuario sale escapado (fuzz sobre render() de cada scr-*); (2) hoja de ruta para eliminar onclick inline → delegación de eventos, y así poder quitar 'unsafe-inline' y recuperar el CSP como segunda barrera. No bloqueante para staging, sí antes de tráfico real de menores.


### [MEDIUM] No existe MFA/2FA en ninguna parte del sistema, ni siquiera para la cuenta ADMIN, que puede cambiar roles, verificar coaches y suspender usuarios. Una credencial de admin comprometida (phishing, reuse) da control total sin segundo factor.

- **Evidencia:** Búsqueda de mfa/totp/2fa/twoFactor en app+prisma: sin coincidencias reales (solo falsos positivos de 'sanitize'). Poder de ADMIN en app/api/admin/users/route.ts:80-94 (PATCH role/coachVerified/suspended). Login sin segundo factor en app/api/auth/login/route.ts:7-24.

- **Impacto de negocio:** Toma de cuenta admin → escalada total: promover cuentas a ADMIN, verificar coaches falsos que luego reservan con menores, suspender usuarios legítimos. En un LMS de menores el admin es el activo más sensible.

- **Acción:** Aceptable en pre-revenue, pero priorizar TOTP al menos para ADMIN/COACH antes de abrir marketplace real. De bajo costo: TOTP con speakeasy/otplib, secret por usuario, sin dependencia externa.


### [MEDIUM] Rate-limiting solo cubre 4 endpoints (login, register, forgot, consultations). Todo lo demás —uploads (25MB c/u), messages, bookings, checkout, profile PATCH, reset de contraseña y TODAS las rutas admin/mutación— no tiene límite. El limiter es en memoria de un solo proceso (correcto para 1 VPS) pero se reinicia en cada redeploy y no hay tope global de peticiones.

- **Evidencia:** rateLimit() solo en app/api/auth/login/route.ts:14, register:11, forgot:12, consultations/route.ts:23. app/api/auth/reset/route.ts sin rateLimit (grep -c = 0). app/api/uploads/route.ts y app/api/messages/route.ts sin rate-limit. Limiter en memoria: app/lib/rate-limit.ts:3-4.

- **Impacto de negocio:** Un usuario autenticado puede inundar /api/uploads (agotar disco del VPS 1-CPU con archivos de 25MB) o /api/messages (spam a menores), o martillar endpoints costosos degradando el único proceso. Reset sin límite permite intentos de fuerza bruta de token (mitigado por token de 256 bits, pero es defensa en profundidad ausente).

- **Acción:** Aplicar rateLimit por-usuario/IP a mutaciones sensibles (uploads, messages, bookings, checkout, reset). Para multi-instancia futura, migrar a Redis con la misma API (ya previsto en el comentario de rate-limit.ts:2).


### [MEDIUM] Residual COPPA: el age-gate se basa en birthYear AUTODECLARADO sin verificación. El bloqueo duro <14 protege a los <13, pero un menor de 13-17 se crea cuenta libremente y, si nombra un guardianEmail que no corresponde a un User PARENT existente, la cuenta se crea SIN guardián y puede navegar/recolectar datos antes de cualquier consentimiento parental verificable (el gate solo aplica al reservar, no a la creación de cuenta ni a recolección de datos).

- **Evidencia:** app/api/auth/register/route.ts:48-64 (birthYear autodeclarado, corte <14). register/route.ts:102-133: si el parent no existe o no es PARENT, el menor 'se crea igual SIN guardián' (comentario y código). Safety-gate solo en booking: app/api/bookings/route.ts (SAFETY GATE §11.3).

- **Impacto de negocio:** Riesgo de cumplimiento COPPA/FTC: se recolectan datos (nombre, email, año nacimiento, actividad) de un menor de 13-17 sin consentimiento verificable previo. Un niño de 12 que miente el año pasa el corte. Multas FTC por violación COPPA son materiales.

- **Acción:** Documentado como decisión consciente (over-block <14). Para lanzamiento: exigir vínculo de guardián ACTIVE antes de habilitar CUALQUIER recolección/actividad del menor (no solo booking), o diferir la creación de cuenta del menor hasta confirmación del tutor. Añadir flujo de retención/borrado de datos del menor (ConsentRecord existe en schema.prisma:585 pero no detecté purga automática).


### [LOW] CSRF: la única defensa es la cookie SameSite=lax; no hay token CSRF ni verificación de header Origin/Sec-Fetch-Site como defensa en profundidad. SameSite=lax es el baseline moderno correcto (bloquea POST cross-site con cookie en navegadores actuales) y no hay CORS Allow-Origin abierto, así que la explotabilidad real es baja, pero falta la segunda barrera.

- **Evidencia:** Cookie sameSite:'lax' en app/lib/auth.ts:29. Sin middleware.ts ni verificación de Origin en rutas (grep origin/csrf/sec-fetch sin checks de seguridad). Sin Access-Control-Allow-Origin en next.config.mjs.

- **Impacto de negocio:** Bajo con navegadores modernos; un navegador antiguo sin soporte SameSite o un bypass de lax dejaría mutaciones POST/PATCH expuestas a CSRF (cambiar perfil, reservar, mensajear).

- **Acción:** Defensa en profundidad barata: verificar header Origin/Referer contra APP_URL en mutaciones (rechazar cross-origin) en un middleware o helper compartido. No urgente.


### [LOW] Mínimo de contraseña de solo 6 caracteres en registro, reset y cambio de perfil, en una plataforma con menores y cuentas de padres/coaches/admin. No hay comprobación de contraseñas comunes ni longitud recomendada.

- **Evidencia:** app/api/auth/register/route.ts:41 (`password.length < 6`), app/api/auth/reset/route.ts:14, app/api/profile/route.ts:39 (newPassword < 6).

- **Impacto de negocio:** Contraseñas de 6 chars son triviales de forzar offline si se filtra la base (aunque scrypt encarece el ataque). Facilita toma de cuentas.

- **Acción:** Subir mínimo a 8-12 y opcionalmente bloquear top-N contraseñas comunes. Cambio de una línea por call-site.


### [LOW] Las sesiones son HMAC sin estado con 30 días de vida y no se pueden revocar del lado servidor salvo cambiando la contraseña o suspendiendo al usuario (que mutan la huella). El logout solo borra la cookie del cliente (clearSession); un token capturado sigue siendo válido hasta expirar o hasta cambio de passwordHash.

- **Evidencia:** MAX_AGE_MS 30 días en app/lib/auth-crypto.ts:24; logout solo hace clearSession() (borra cookie) en app/api/auth/logout/route.ts:4-7; no hay lista de revocación ni jti/version por sesión.

- **Impacto de negocio:** Si un token se filtra (XSS pese a httpOnly no lo expone, pero sí logs/proxy/backup), no hay botón de 'cerrar todas las sesiones' salvo forzar reset de contraseña. Ventana de 30 días.

- **Acción:** Aceptable para el estadio. Si se quiere revocación real: añadir un contador/versión de sesión por usuario incluido en la huella, o mover a sesiones con estado en DB. La huella actual ya cubre el caso más importante (post-reset).


### [LOW] Inconsistencia de límite de subida: el endpoint enforce 25MB (MAX_UPLOAD_BYTES) pero el mensaje de error dice '50MB', y nginx en DEPLOY.md configura client_max_body_size 50M. Confunde operación y usuarios, y el proxy acepta 50M que la app rechazará a 25M.

- **Evidencia:** app/lib/uploads.ts:11 `MAX_UPLOAD_BYTES = 25 * 1024 * 1024`; mensaje 'máx 50MB' en app/api/uploads/route.ts:28; nginx `client_max_body_size 50M` en DEPLOY.md:210.

- **Impacto de negocio:** Cosmético/operativo: usuario sube 40MB, nginx lo acepta, la app lo rechaza con mensaje que dice que el límite es 50MB. Fricción y confusión, no riesgo de seguridad.

- **Acción:** Unificar a un solo valor (25MB o 50MB) en uploads.ts, el mensaje del route y client_max_body_size.


---


## AI/ML y arquitectura moderna (Paso 0.11)

**Madurez:** L2 — versiones de stack 2026 (Next 15.1, React 19, Prisma 6) pero cero IA y cero patrones modernos en uso (0 RSC/"use server", 0 Suspense/streaming, 0 middleware, 0 colas, 0 edge); lo poco que hay (cron de SO, webhook Stripe firmado, cache revalidate, rate-limit in-memory con caps) está deliberadamente right-sized para 1 VPS de 1 CPU, lo que lo salva de L1.


Cero integración de IA confirmada: ningún SDK (anthropic/openai/embeddings/vector) en package.json ni en app/ — el único match del grep es el verbo español "llama a" en un comentario (app/lib/queries.ts:162). El propio repo lo tiene diagnosticado y ranqueado: docs/review/PRODUCT_AUDIT_2026-06.md declara "Zero AI in a 2026 debate-coaching product" como el mayor gap estratégico y prioriza ballot-draft desde grabaciones → narrativa de parent report → recommender → sparring (§C4 y §9). En event-driven no hay colas ni outbox ni webhooks salientes; los únicos procesos asíncronos son 3 crons de SO en el VPS (deploy-pull cada 2 min, backup diario, purga COPPA semanal) que NO se instalan desde el repo — un rebuild del VPS los pierde en silencio. El único webhook entrante (Stripe) verifica firma sobre raw body correctamente pero maneja un solo evento sin persistir event.id. Nada corre en edge runtime, y para este estadio (pre-revenue, 1 VPS 1-CPU) eso es lo correcto: añadir Redis/BullMQ/edge hoy sería sobre-ingeniería; el gap real y accionable es la ausencia total de IA en un producto cuyo insumo (recordingUrl de speeches) ya existe en el modelo de datos. Puntos a favor: observabilidad mínima deliberada (instrumentation.ts loguea JSON a stdout con hook Sentry gated por DSN) y el proxy Tabroom usa fetch con next.revalidate 1800 y degradación elegante — patrones modernos bien aplicados donde sí existen.


### [HIGH] Cero IA/LLM en todo el producto: ningún SDK ni llamada a proveedor de IA en dependencias ni código; toda judgment repetible de alto valor (ballots, drills, parent report, recomendación de coaches, placement) es trabajo manual del coach o placeholder

- **Evidencia:** package.json deps (solo @prisma/client, next, nodemailer, react, sanitize-html, stripe — ningún SDK IA); grep -rniE 'anthropic|openai|claude|embedding|pgvector...' app/ = 0 hits reales (único match: comentario en español 'llama a getAppData' en app/lib/queries.ts:162); el propio repo lo confirma en docs/review/PRODUCT_AUDIT_2026-06.md:20 ('Zero AI in a 2026 debate-coaching product... biggest strategic gap'), :46-49 (C4: 'Confirmed zero LLM integration') y :148-152 (§9 ranking de oportunidades)

- **Impacto de negocio:** El costo marginal por alumno no baja con escala (cada ballot son ~10 min de coach), la promesa de 'práctica ilimitada' es un placeholder, y la categoría edtech 2026 compite en feedback IA de speeches — es el gap estratégico #1 según el propio blueprint del repo, no un bug operativo (justo para pre-revenue)

- **Acción:** Ejecutar UN vertical delgado del ranking ya existente en docs/review: transcripción + borrador de ballot desde el recordingUrl que ya existe en submissions (una llamada API a un proveedor, borrador siempre editado/publicado por el coach, nunca auto-publish). NO montar infra de embeddings/vector DB/RAG todavía — sería moda innecesaria en este estadio


### [MEDIUM] Los 3 crons críticos del sistema (deploy-pull cada 2 min, backup diario de Postgres, purga COPPA de ActivityEvent) existen solo como crontab manual en el VPS: ni bootstrap-vps.sh ni deploy.sh los instalan, y no hay heartbeat que detecte un cron muerto

- **Evidencia:** scripts/vps-pull.sh:4-5 ('Un cron corre este script cada ~2 min'), scripts/backup-db.sh:4-6 (cron sugerido en comentario, backup LOCAL en el mismo VPS), scripts/purge-activity.js:5-6 ('Uso (cron semanal del VPS)'); grep -n 'cron|crontab' scripts/bootstrap-vps.sh scripts/deploy.sh = 0 resultados

- **Impacto de negocio:** Un rebuild o migración del VPS pierde en silencio: los deploys dejan de llegar, los backups dejan de generarse y la purga de retención de datos de MENORES (compromiso COPPA) deja de correr — sin ninguna alarma que lo delate

- **Acción:** Añadir instalación idempotente del crontab (o systemd timers) a bootstrap-vps.sh y versionarla en el repo; añadir una línea de log tipo heartbeat por cron para poder detectar 'cron muerto' en docker logs / el log de backup


### [MEDIUM] El stack es 2026 pero el uso es pre-moderno: 0 Server Actions ('use server'), 0 Suspense/streaming, 0 middleware.ts; la SPA Aula renderiza por string-templates innerHTML con 30 archivos @ts-nocheck, lo que además fuerza CSP script-src 'unsafe-inline'

- **Evidencia:** grep 'use server' app/ = 0; grep Suspense = 0; middleware.ts inexistente; 30 archivos con @ts-nocheck en app/lib/ (scr-*.ts, p.ej. app/lib/queries.ts 1641 líneas); next.config.mjs:4-9 lo admite: 'La arquitectura usa onclick inline + estilos inline (innerHTML), por eso unsafe-inline'; docs/review/PRINCIPAL_AUDIT_2026-06.md:24 lo llama 'strategic dead end'

- **Impacto de negocio:** No es un bug hoy, pero anula los beneficios de RSC/React 19 que ya se pagan en bundle, y cierra la puerta a UX de IA moderna (streaming de tokens, formularios optimistas) — la primera feature IA chocará con esta arquitectura de innerHTML

- **Acción:** No reescribir big-bang: ruta incremental — construir las PRÓXIMAS pantallas (empezando por la primera feature de IA) como componentes React reales montados dentro del shell existente, y congelar el crecimiento de los builders scr-*.ts


### [LOW] Efectos secundarios (emails transaccionales) corren inline en el request path, best-effort, con errores tragados sin registro persistente: no hay retry, outbox ni visibilidad de fallos de entrega

- **Evidencia:** app/lib/mail.ts:1-3 y 24-26 ('Nunca lanza: cualquier fallo se loguea y se traga'); awaited en el handler en app/api/bookings/route.ts:233-247 y app/api/debates/[id]/route.ts:111-114

- **Impacto de negocio:** Un SMTP caído pierde emails de confirmación de reservas/consultas/reportes sin que nadie se entere (solo un console.error en docker logs); para el estadio actual es un trade-off razonable — una cola BullMQ+Redis en 1 CPU sería sobre-ingeniería

- **Acción:** Mantener el envío inline pero registrar cada intento en una tabla EmailLog (status SENT/FAILED + payload mínimo) para tener visibilidad y replay manual; diferir cualquier cola real hasta tener volumen


### [LOW] Webhook Stripe (único webhook entrante): fundamentos correctos — firma verificada sobre raw body y acceso otorgado solo ahí — pero maneja un solo tipo de evento (checkout.session.completed), no persiste event.id, y no cubre refunds/disputes/renovaciones

- **Evidencia:** app/api/stripe/webhook/route.ts:17-23 (constructEvent sobre req.text()) y :26-39 (solo checkout.session.completed; idempotencia implícita vía findUnique de enrollment, sin tabla de eventos)

- **Impacto de negocio:** Hoy nulo (pago simulado, Stripe degradado con gracia sin credenciales); al activar pagos reales faltará el manejo de refund/dispute y un registro de eventos para reconciliación

- **Acción:** Al activar Stripe real (no antes): tabla StripeEvent con id único como guard de idempotencia + manejar charge.refunded; mientras el pago sea simulado, no tocar


### [LOW] Rate limiter en memoria de proceso único (Map con SOFT_CAP/HARD_CAP y evicción): correcto y bien defendido hoy, pero se rompe silenciosamente el día que haya 2+ réplicas o se mueva detrás de un balanceador

- **Evidencia:** app/lib/rate-limit.ts:1-2 ('Suficiente para un proceso Node persistente... Para múltiples instancias, migrar a Redis con la misma API') y :5-6 (caps anti-flood OPS-04)

- **Impacto de negocio:** Ninguno hoy (docker-compose corre 1 instancia web); es deuda documentada, no defecto — se lista para que el requisito 'una sola réplica' quede explícito en el runbook de escalado

- **Acción:** Nada ahora; añadir una nota en DEPLOY.md de que escalar a >1 réplica requiere migrar rate-limit (y sesiones si aplica) a Redis primero


### [LOW] 'No detectado' y CORRECTO para el estadio: sin colas (BullMQ/Redis), sin patrón outbox, sin webhooks salientes, sin edge runtime, sin serverless — la arquitectura asíncrona completa son 3 crons de SO + fetch cacheado

- **Evidencia:** package.json sin bullmq/redis/agenda; grep 'runtime.*edge' app/ next.config.mjs = 0; docker-compose.yml define solo web+postgres; app/api/tabroom/tourns/route.ts:18-22 usa fetch con next:{revalidate:1800} y degradación a lista vacía (patrón moderno bien aplicado)

- **Impacto de negocio:** Positivo: en un producto pre-revenue sobre 1 VPS de 1 CPU, añadir colas/edge/eventos sería sobre-ingeniería pura; este hallazgo existe para que ningún reviewer futuro lo 'arregle' sin necesidad

- **Acción:** Mantener; reevaluar colas/outbox solo cuando aparezca la primera necesidad real (p.ej. transcripciones de IA de minutos de duración, que sí exigirán trabajo fuera del request path — ese será el momento de un worker, no antes)


---


## API / Backend endpoints (app/api — 57 route.ts, ~80 handlers método+ruta)

**Madurez:** L3 — Backend sólido y consistente para un solo dev+IA: `getSessionUser()` uniforme, gates de rol donde importan, webhook Stripe con firma verificada, escrow que nace solo al confirmar, gating COPPA de menores, anti-enumeración en forgot, `passwordHash` nunca filtrado (selects defensivos). Lo frena a L4 la ausencia total de validación por esquema (0 Zod), rate limiting solo en auth, un IDOR en la entrega de archivos y la falta de idempotencia explícita en escrituras financieras.


La capa API es notablemente coherente para el estadio: TODOS los endpoints autenticados resuelven el usuario con `getSessionUser()` (que además invalida sesión al instante si el user está suspendido o cambió su password — auth.ts:16-20), y los gates de rol están donde deben (admin/*, reports GET/PATCH, parent-report, guardianship, placement POST, courses/skills/resources POST = TEACHER/ADMIN, debates judge, consultations GET = ADMIN por PII de leads). Los 5 endpoints sin auth son correctos por diseño: health, tabroom/tourns (proxy público NSDA), consultations/availability (query de slots libres), stripe/webhook (verifica firma), y auth/*. El problema que el prompt sospechaba —`passwordHash` filtrado en algún select— NO existe: queries.ts (170-171, 449) y admin/users SELECT lo excluyen explícitamente. Los huecos reales son transversales: (1) rate limiting vive solo en login/register/forgot/consultations — falta en uploads, messages, reports, bookings; (2) CERO validación por esquema, todo es `clean()` manual con coerción `Number()` de rangos inconsistentes; (3) la entrega de archivos subidos no verifica propiedad (IDOR sobre media de menores); (4) el anti-doble-reserva de bookings depende de un scan en transacción, no de un unique constraint en DB. No hay versioning, lo cual es correcto para este estadio (único cliente = su propia SPA).


### [HIGH] IDOR en la entrega de archivos subidos: cualquier usuario autenticado puede descargar CUALQUIER archivo (incluidos audio/video de submissions de menores y grabaciones de sesiones de coaching) — no hay verificación de propiedad ni de vínculo.

- **Evidencia:** app/uploads/[...path]/route.ts:34-63 — solo valida sesión (getSessionUser) y anti-traversal; hace `db.upload.findFirst({ where:{ filename: base } })` únicamente para leer mime/nombre, SIN comprobar `row.userId === user.id`, inscripción, guardianship ni rol. Contrasta con el rigor del resto (bookings/[id] sí valida ownership).

- **Impacto de negocio:** Producto que sirve a MENORES: acceso no autorizado a media de un niño (video/audio de sus entregas) por cualquier cuenta que obtenga/comparta la URL es un fallo de seguridad infantil y COPPA, no solo un IDOR técnico. Mitigación real: los filenames son UUID v4 no enumerables (uploads.ts:112), así que no se puede barrer la carpeta; la exposición requiere que una URL circule (referrer, log, reenvío). Por eso es HIGH-por-impacto aunque la explotabilidad esté acotada a conocer la URL.

- **Acción:** Añadir autorización por objeto en la ruta de servir: cargar la fila Upload y permitir solo si el solicitante es el dueño, o tiene relación legítima (coach/estudiante del booking, padre vinculado, admin). Alternativamente firmar URLs con expiración.


### [MEDIUM] Rate limiting solo en auth: falta en endpoints autenticados de alto costo/abuso. Crítico en /api/uploads (flood de escrituras de 25MB a disco en VPS de 1 CPU) y relevante en /api/messages, /api/reports, /api/bookings, /api/conversations.

- **Evidencia:** grep rateLimitRefs=0 en todos salvo auth/login, auth/register, auth/forgot y consultations. app/api/uploads/route.ts:6-37 no llama rateLimit; escribe a disco (UPLOAD_DIR) sin throttle por usuario. auth/reset tampoco tiene rate limit (rateLimitRefs=0).

- **Impacto de negocio:** En un único VPS Hostinger 1-CPU, un usuario autenticado puede llenar el disco o saturar CPU/IO subiendo archivos en bucle (no hay cuota por usuario), o spamear mensajes/reportes hacia menores. reset sin límite habilita fuerza-bruta de token (mitigado por token de 256 bits, riesgo bajo). El limiter en memoria ya existe y tiene tope duro anti-flood (rate-limit.ts:6) — solo falta aplicarlo.

- **Acción:** Aplicar rateLimit(`upload:${user.id}`,...) en uploads (por usuario, no por IP) y límites por-usuario en messages/reports/bookings; añadir rate limit a auth/reset.


### [MEDIUM] Cero validación por esquema en toda la API: 100% `clean()` manual + coerción `Number()`. Los rangos numéricos/enums se validan de forma inconsistente entre endpoints.

- **Evidencia:** grep zod = 0 (la única coincidencia 'bookings' es un substring de comentario). Ej. inconsistencia: coach-profile PATCH sí acota hourlyCents 100–50000 (coach-profile/route.ts ~148), pero reviews acepta cualquier `Number(body.rating)` y lo recorta con Math.min/max (reviews/route.ts:17), tournaments POST no valida forma alguna del body más allá de clean(). api.ts:57 `clean()` solo trunca strings.

- **Impacto de negocio:** Defensa-en-profundidad ausente para un producto con pagos/escrow y datos de menores. No es un exploit activo (la coerción evita inyección de tipos), pero cada endpoint reinventa la validación → superficie de bugs y drift. Es la brecha de madurez más clara frente a L4.

- **Acción:** Introducir un esquema Zod por endpoint (o un validador compartido) para body/query; centraliza rangos, enums y requeridos, y elimina los ~118 clean() ad-hoc como única defensa.


### [MEDIUM] El anti-doble-reserva de bookings NO está garantizado por constraint de DB: depende de un scan de vecinos dentro de la transacción. Bajo concurrencia/reintento puede crear dos reservas solapadas.

- **Evidencia:** bookings/route.ts:151-168 evalúa el choque leyendo `tx.booking.findMany` y comparando en memoria; no hay `@@unique` sobre (coachId, slotAt) en schema.prisma (model Booking, líneas 708-732 solo tiene @@index([coachId, slotAt])). El escrow sí está protegido por EscrowTxn.bookingId @unique.

- **Impacto de negocio:** Correctitud financiera: dos requests simultáneos (o un doble-submit del cliente) para el mismo slot pueden ganar la carrera si el scan de uno no ve la fila del otro aún no commiteada, generando dos bookings CONFIRMED y dos escrows sobre el mismo horario del coach. En marketplace con dinero (aunque simulado hoy) es un defecto real al cablear Stripe.

- **Acción:** Añadir un unique constraint que materialice 'un coach no puede tener dos reservas activas en el mismo slot' (p.ej. columna derivada slot+coach con @@unique parcial a status activo, o serializar por advisory lock), y tratar el conflicto como error de constraint en vez de solo scan.


### [LOW] Upload lee el archivo completo a memoria antes de la comprobación real de tamaño, y los límites/mensajes están desalineados (25MB en la lib vs 50MB en el mensaje del route y en el Nginx documentado).

- **Evidencia:** uploads.ts:106-109 hace `Buffer.from(await file.arrayBuffer())` y recién ahí compara size>MAX_UPLOAD_BYTES; MAX_UPLOAD_BYTES=25MB (uploads.ts:11) pero app/api/uploads/route.ts:29 responde 'máx 50MB' y DEPLOY.md:209 configura `client_max_body_size 50M`. El check de tamaño declarado (uploads.ts:102) mitiga, pero es falsificable.

- **Impacto de negocio:** En VPS de poca RAM, subir un cuerpo que miente su size declarado carga hasta el límite de Nginx (50MB) en RAM antes del rechazo (presión de memoria). La incoherencia 25/50MB confunde y deja un rango donde el archivo pasa Nginx pero el usuario ve un error engañoso.

- **Acción:** Unificar el límite (una sola constante), reflejarlo en el mensaje y en Nginx, y rechazar por Content-Length/streaming antes de bufferizar todo el arrayBuffer.


### [LOW] Serialización de salida: varios GET devuelven filas Prisma crudas (campos de más), aunque NINGUNA filtra passwordHash. El riesgo real es de PII amplia en respuestas admin, no de credenciales.

- **Evidencia:** consultations/route.ts:100-110 devuelve `bookings` crudos (name/email/phone/goal de leads) — ADMIN-only, aceptable pero sin shape. reports/route.ts GET devuelve Report crudos; tournaments/route.ts:70 devuelve `registration` cruda. En contraste, los endpoints sensibles SÍ usan select defensivo (queries.ts:170-171,247,449; admin/users SELECT sin passwordHash/email).

- **Impacto de negocio:** Bajo: los campos extra van a superficies admin/propias, no exponen secretos. Es deuda de forma (el cliente recibe columnas internas que podrían cambiar), no una fuga. Confirma que la sospecha de passwordHash filtrado NO se materializa.

- **Acción:** Estandarizar un mapeo de salida explícito (como ya hace bookings GET) en consultations/reports/tournaments para no devolver el modelo entero.


### [LOW] Sin Idempotency-Key en escrituras; la idempotencia se apoya solo en unique constraints, presentes en unos endpoints y ausentes en otros (reports/messages/submissions duplican en doble-submit).

- **Evidencia:** grep 'Idempotency' = 0 en toda la app. Bien cubiertos por unique/upsert: enrollments (@@unique userId,courseId), tournamentRegistration (tournamentId_userId), membership (chequeo de estado idempotente membership/route.ts:41), reviews (upsert). Sin red: reports/route.ts:25 crea Report en cada POST; messages y submissions también.

- **Impacto de negocio:** Bajo hoy: duplicados de reportes/mensajes/entregas ante reintentos o doble clic ensucian datos y colas de moderación, pero no rompen dinero. Importará más al cablear pagos reales.

- **Acción:** Para escrituras no idempotentes que importen (bookings al integrar Stripe, reports), aceptar y deduplicar por Idempotency-Key, o añadir unique constraints donde el dominio lo permita.


### [LOW] Sin versioning de API (no /v1). Para este estadio es la decisión correcta, se reporta como informativo — no como defecto.

- **Evidencia:** Rutas montadas directamente bajo app/api/* sin prefijo de versión. El único consumidor es la propia SPA 'Aula' del mismo repo (acoplamiento total cliente-servidor).

- **Impacto de negocio:** Ninguno negativo ahora: con un solo cliente propio y pre-revenue, versionar sería sobre-ingeniería. Solo se vuelve relevante si se expone la API a terceros o apps móviles independientes.

- **Acción:** No actuar por ahora; reconsiderar versioning solo cuando exista un consumidor externo o contrato público.


---


## Observabilidad y Resiliencia (Paso 0.10)

**Madurez:** L2 — observabilidad mínima pero deliberada y bien comentada (error-log JSON a stdout, /api/health con check de DB, healthchecks Docker, deploy gated por migraciones); por debajo de L3 porque no hay métricas, ni alerting, ni backup offsite, ni restore probado, ni visibilidad alguna de errores del cliente — el modo de detección de incidentes hoy es "alguien lo nota".


La capa de observabilidad es honesta pero mínima: instrumentation.ts loguea UNA línea JSON por error no capturado y ahí termina — cero logging en las 57 rutas API, sin access logs de app, sin latencia/throughput, sin request/trace IDs, sin RUM, sin SLOs documentados. El endpoint /api/health está bien diseñado (503 real si la DB falla) pero no se detectó ningún monitor/alerting configurado que lo consuma: un 503 a las 3am no lo ve nadie. La resiliencia tiene aciertos reales para el estadio (migrate-before-swap que aborta el deploy si la migración falla, healthchecks de contenedor, stop_grace_period 30s, backup diario con check de dump vacío), pero el backup vive en el MISMO disco del único VPS, nunca se ha probado un restore, no hay PITR (RPO 24h) y los uploads de usuarios no se respaldan en ningún script. El deploy no tiene rollback: si el healthcheck post-swap falla, el script solo escribe una línea en un log local y la imagen rota queda sirviendo. El downtime de ~10-15s por deploy es aceptable y está conscientemente documentado. Para un producto pre-revenue de un dev es un piso razonable, pero los dos gaps que sí importan YA (offsite + alerting) son baratos y siguen abiertos.


### [HIGH] Backup diario solo LOCAL en el mismo disco del único VPS, sin copia offsite, sin restore jamás probado y sin PITR (RPO 24h). El propio script lo declara 'riesgo #1' y deja el offsite como TODO.

- **Evidencia:** scripts/backup-db.sh:7-8 ('Es backup LOCAL en el MISMO VPS… NO protege ante pérdida del disco hasta subirlo OFFSITE') y :17 (pg_dump a /opt/otr/backups); ningún script/doc de restore detectado (grep restore|pg_restore en scripts/ y DEPLOY.md sin resultados relevantes); docs/SYSTEM_MAP.md:48 confirma 'falta offsite'.

- **Impacto de negocio:** Fallo de disco, borrado del VPS o ransomware = pérdida TOTAL de datos, incluyendo cuentas y registros de consentimiento COPPA de menores. Un backup nunca restaurado es una hipótesis, no un backup. Es el riesgo existencial #1 y su mitigación (rclone a B2/S3, ~1h de trabajo) es la más barata de todo el audit.

- **Acción:** Subir el dump diario a Backblaze B2/S3 (rclone tras pg_dump, credenciales en el VPS) y ejecutar UN restore de prueba a un Postgres efímero (docker run) documentando el procedimiento; añadir verificación mensual automatizable.


### [HIGH] Sin alerting de ningún tipo: no se detectó UptimeRobot/healthchecks.io/ntfy ni webhook alguno configurado. Si /api/health devuelve 503 a las 3am, o si el healthcheck post-deploy falla, el único rastro es una línea en un log local que nadie lee.

- **Evidencia:** app/api/health/route.ts:4 menciona '(UptimeRobot, etc.)' como intención pero ningún monitor está configurado en repo/docs (grep uptimerobot|alert|ntfy|telegram|slack en DEPLOY.md y docs/ sin resultados operativos); scripts/vps-pull.sh:54 en fallo solo hace echo al log del cron.

- **Impacto de negocio:** MTTD (tiempo hasta detectar una caída) = indefinido; con usuarios reales (padres pagando, menores en clase) un outage nocturno dura hasta que alguien entre a mirar. El endpoint ya existe: falta solo el consumidor externo.

- **Acción:** Dar de alta UptimeRobot free (o healthchecks.io) apuntando a /api/health con alerta a email/Telegram — 15 minutos. Añadir un curl a ntfy.sh/Telegram en la rama de fallo de vps-pull.sh:54 y en el exit 1 de backup-db.sh.


### [MEDIUM] El deploy no tiene rollback: vps-pull.sh publica y arranca la imagen nueva; si el healthcheck post-swap no llega a 200 en ~60s solo loguea '✗' y termina — la app rota (o caída) queda en producción y :latest sigue apuntando a la imagen mala, así que el siguiente cron no revierte nada.

- **Evidencia:** scripts/vps-pull.sh:45-54 (loop de 20×3s → 'healthcheck no llegó a 200 tras el redeploy' sin acción); las imágenes por SHA existen (deploy.yml:69-71 pushea ghcr.io/yesiibr0/otr:$SHA) pero nada las usa.

- **Impacto de negocio:** Un build que pasa CI pero revienta en runtime (env faltante, migración incompatible en caliente) produce downtime indefinido y silencioso. El buen trabajo del gate de migraciones (vps-pull.sh:28-36, que SÍ aborta antes del swap) queda incompleto en la segunda mitad del deploy.

- **Acción:** Guardar el image ID anterior antes del swap y, si el healthcheck falla, re-taggear/levantar la imagen previa (docker tag $before ghcr.io/…:latest + up -d) + notificación. Son ~10 líneas sobre lo que ya hay.


### [MEDIUM] Logging estructurado SOLO para errores no capturados: cero console.* en las 57 route.ts, sin access log de aplicación, sin latencia/throughput, sin request/trace IDs ni correlación con Nginx. Los errores tragados deliberadamente (5 catch{} en rutas, mail.ts) desaparecen o quedan como texto suelto.

- **Evidencia:** instrumentation.ts:10-27 (única fuente de logs estructurados); grep console. en app/api/**/route.ts = 0 resultados; app/lib/mail.ts:24-26 traga el fallo de envío con console.error no estructurado; grep requestId|traceId|otel|prometheus en app/ sin resultados.

- **Impacto de negocio:** Imposible responder '¿está lenta la app?', '¿cuántos logins fallan?', '¿se envió el email de reset a este padre?' sin reproducir a mano. Debugging de incidencias = arqueología en docker logs sin IDs para correlacionar request→error→usuario.

- **Acción:** Añadir un helper log() JSON (ts, level, path, status, ms, userId?) y llamarlo al menos en las rutas de dinero/auth (login, checkout, webhook, bookings) + en el catch de mail.ts; un middleware ligero con x-request-id daría correlación. No hace falta APM todavía.


### [MEDIUM] Docker logging driver por defecto (json-file) sin rotación configurada: ni bootstrap-vps.sh ni compose fijan max-size/max-file ni daemon.json; los logs de contenedor crecen sin límite en el mismo disco de 1 VPS que aloja Postgres, uploads Y los backups.

- **Evidencia:** grep log-driver|max-size|daemon.json|logrotate en todo el repo (yml/sh/md/json) = 0 resultados; scripts/bootstrap-vps.sh instala Docker (líneas 29-36) sin configurar logging; los cron logs (/var/log/otr-backup.log, backup-db.sh:5) tampoco tienen logrotate.

- **Impacto de negocio:** Disk-full es el modo de muerte clásico de un VPS single-node: cuando el disco se llena, Postgres deja de escribir (caída total) y — ironía — también fallan los backups locales que compartían disco. Con errores frecuentes logueados por instrumentation.ts el crecimiento puede ser rápido.

- **Acción:** Fijar logging: {driver: json-file, options: {max-size: 10m, max-file: 3}} en ambos servicios del docker-compose.yml (o /etc/docker/daemon.json en bootstrap) + logrotate para /var/log/otr-*.log. 20 minutos.


### [MEDIUM] Cero visibilidad de errores del CLIENTE: el SPA Aula (builders string-template con @ts-nocheck — la zona de mayor churn y riesgo del repo según su propio SYSTEM_MAP) no tiene window.onerror/unhandledrejection ni beacon de reporte; error.tsx/global-error.tsx solo pintan 'Reintentar' sin reportar nada. Tampoco hay RUM/web-vitals.

- **Evidencia:** grep window.onerror|addEventListener('error')|unhandledrejection en app/ = 0 resultados; app/error.tsx y app/global-error.tsx descartan el parámetro error; grep web-vitals|posthog|plausible = 0; docs/SYSTEM_MAP.md §7 identifica Aula.tsx/scr-*.ts como lo más cambiado con 0 tests (histórico).

- **Impacto de negocio:** Los crashes de cliente — la clase de bug ya documentada (M1: crash al confirmar reserva, el happy path de dinero) — son invisibles en producción: el usuario ve la pantalla rota, nadie más se entera. En un SPA sin type-checking, el error del cliente ES el error de producción más probable.

- **Acción:** Registrar window.onerror + unhandledrejection en el shell del Aula y POSTear {msg, stack 6 líneas, screen, ua} a un endpoint /api/client-error (rate-limited) que reutilice el formato JSON de instrumentation.ts. RUM/web-vitals puede esperar; el error-beacon no.


### [LOW] Fetch a la API externa de Tabroom sin timeout explícito, sin retry y sin circuit breaker; la degradación (unavailable:true + caché revalidate 1800) es correcta, pero un hang de api.tabroom.com mantiene la request colgada hasta el timeout por defecto de undici (~300s) en un servidor de 1 vCPU.

- **Evidencia:** app/api/tabroom/tourns/route.ts:18-22 (fetch sin AbortSignal.timeout); catch global en :43-46 degrada bien pero no cubre el hang; es el ÚNICO fetch server-side a terceros del código (grep confirmado).

- **Impacto de negocio:** Bajo hoy: una sola integración, cacheada 30 min, con degradación elegante. El riesgo real es acumulación de requests colgadas si Tabroom se cae 'lento' (no 'rápido') justo cuando expira la caché con tráfico.

- **Acción:** Añadir signal: AbortSignal.timeout(5000) al fetch — una línea. Circuit breaker formal es sobre-ingeniería para este estadio; el patrón timeout+catch+caché ya es el 90%.


### [LOW] Los healthchecks (post-deploy y de contenedor) validan /aula (HTML) en vez de /api/health (DB): un redeploy puede marcarse '✓ deploy OK (HTTP 200)' con la base de datos inaccesible, según cuánto de /aula dependa de la DB para el render sin sesión.

- **Evidencia:** scripts/vps-pull.sh:46 (curl http://127.0.0.1:3000/aula) y docker-compose.yml:51 (healthcheck a /aula), teniendo /api/health disponible con check real de DB (app/api/health/route.ts:9-14).

- **Impacto de negocio:** Falso verde tras deploy: el cron reporta éxito mientras toda mutación falla. Menor porque el SSR de /aula probablemente sí toca la DB para usuarios con sesión, pero el endpoint correcto ya existe y no se usa.

- **Acción:** Cambiar ambas URLs a /api/health (que ya devuelve 503 si la DB falla). Dos líneas.


### [LOW] vps-pull.sh corre por cron cada ~2 min SIN lock (flock): dos ejecuciones pueden solaparse si un deploy tarda más de 2 minutos (migración lenta + pull), con riesgo de down/up concurrente — justo la causa del contenedor huérfano que el propio script comenta haber sufrido.

- **Evidencia:** scripts/vps-pull.sh:11-12 (sin flock/lockfile; grep flock en scripts/ = 0); la comparación before/after de image IDs (:17-25) mitiga la mayoría de solapes pero no el de un deploy en curso; el comentario en :38-40 describe el síntoma histórico ('container name already in use' + 502).

- **Impacto de negocio:** Ventana de carrera pequeña pero el fallo resultante (dos compose down/up entrelazados en 1 CPU) es exactamente el tipo de estado zombi que ya les costó un 502.

- **Acción:** Envolver el cron en flock: `flock -n /tmp/otr-deploy.lock scripts/vps-pull.sh`. Una línea en el crontab.


### [LOW] El hook de Sentry es un stub inerte: si algún día se setea SENTRY_DSN, el bloque if está vacío y no hace nada — el camino 'enchufar APM' no está a una env var de distancia como sugiere el comentario, requiere código y deploy.

- **Evidencia:** instrumentation.ts:33-35 (if (process.env.SENTRY_DSN) { /* TODO: import… */ } — cuerpo vacío); decisión documentada y razonada en :29-32 (no cargar el paquete sin DSN).

- **Impacto de negocio:** Mínimo hoy (decisión consciente y bien argumentada contra peso muerto). El riesgo es de expectativa: en un incidente futuro, setear la variable no activará nada.

- **Acción:** O implementar el import dinámico condicional real (@sentry/nextjs solo con DSN), o cambiar el comentario a 'requiere instalar el paquete + código'. Documentar cuál es el plan.


### [LOW] Sin SLOs ni objetivos de disponibilidad/latencia en ningún documento, y docs/SYSTEM_MAP.md está desactualizado respecto a la resiliencia real (dice 'No hay prisma/migrations → deploy con db push sin rollback de esquema', pero prisma/migrations/ ya existe y vps-pull.sh usa migrate deploy con gate). El downtime de deploy de ~10-15s está documentado y es aceptable para el estadio.

- **Evidencia:** grep -i SLO en docs/*.md sin resultados reales (solo falsos positivos de 'slot'); docs/SYSTEM_MAP.md:52 vs prisma/migrations/{0_init,20260711000000_add_user_created_at} y scripts/vps-pull.sh:33 (migrate deploy); downtime consciente en vps-pull.sh:41.

- **Impacto de negocio:** Sin SLO no hay definición de 'roto' ni criterio para invertir en HA — hoy tolerable (staging, pre-revenue), pero la doc desactualizada hace que quien audite o herede subestime la resiliencia YA construida (el gate de migraciones es de lo mejor del pipeline).

- **Acción:** Fijar un SLO informal en README/DEPLOY.md (ej. 99% mensual, deploy-downtime <30s aceptado) y actualizar SYSTEM_MAP.md §4-5: migrate deploy con historial y gate, no db push.


---
