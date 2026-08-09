# GOAL 2026-08 — Diagnóstico de performance (/api/app-data + bundle)

Rama: feat/goal-extras (HEAD `00c44e7`) · Fecha: 2026-08-08 · Estado: Completo 2026-08-08
Servidor de medición: `PORT=3033 npm run dev` en un **worktree aislado**
(`/tmp/otr-d3-build`, su propio `.next`) apuntando a la MISMA `prisma/dev.db`.

> Informe incremental: cada sección se rellena en cuanto hay medición real.
> NO se aplicó ningún arreglo (diagnóstico puro).

### Nota de método (importante para leer los números)

1. **Escala de la DB de medición.** `prisma/dev.db` (880 kB) tiene 12 usuarios,
   5 cursos, 16 lecciones, 16 inscripciones, 31 ActivityEvent, 6 reseñas. Los
   tiempos de abajo son un **piso**: miden el coste fijo (round-trips, serialización
   JSON, render), no el coste que crece con los datos. Cualquier extrapolación a
   producción es inválida.
2. **Micro-caché `app/lib/cache.ts` (TTL 30 s).** Cachea 4 claves globales
   (`levels`, `events`, `seasonPrizes`, `highlights`) + `leaderboard:top50` +
   `leaderboard:monthXp:<mes>`. Toda medición se reporta en dos modos: **fría**
   (primer golpe tras >30 s de reposo) y **caliente**.
3. **Aviso de contaminación (resuelto).** Los primeros intentos se hicieron con el
   dev server en el árbol principal, donde ya corrían otros 3 `next dev` de otros
   agentes sobre el MISMO `.next`: se pisan los manifests y aparecen **404
   intermitentes** en rutas que existen (`GET /api/app-data 404`, con
   `app/api/app-data/route.ts` presente). Toda la §2 se repitió en un worktree
   con su propio `.next` y validando `%{http_code}` muestra a muestra.

## 0. Inventario inicial

### 0.1 Qué pide el Aula AL CARGAR

**Cero llamadas a API para los datos.** `/aula` es un Server Component
(`app/aula/page.tsx:8` → `export const dynamic = "force-dynamic"`) que llama a
`getAppData(user.email, lang, user)` **en proceso** (`app/aula/page.tsx:17`) y le
pasa el resultado a `<Aula data={…}>`. `app/components/Aula.tsx:28` hace
`Object.assign(DB, data)` y renderiza el SPA sin pedir nada.

Peticiones HTTP reales de una carga en frío de `/aula` (medido con `curl` sobre el
documento y los `src`/`href` que emite):

| # | Recurso | Notas |
|---|---|---|
| 1 | `GET /aula` (documento) | 94.942 B en `next dev`; **lleva el payload completo de app-data embebido** en el flight RSC (21 `self.__next_f.push`; `coursesContent` aparece en el offset 45.138) |
| 2 | `GET /_next/static/css/app/layout.css` | |
| 3-9 | 7 chunks JS (`webpack`, `main-app`, `polyfills`, `app-pages-internals`, `app/aula/page`, `app/error`, `app/global-error`) | en dev; en producción son los 138 kB de First Load JS de §4 |
| 10 | `GET /icon.svg` | |
| 11 | `GET /img/hero-speaking.jpg` | ver §5 |

`/api/app-data` **no se llama en la carga**. Es la ruta del *refresh suave*
posterior a una mutación: 8 call-sites (`grep -rn 'fetch("/api/app-data")' app/`),
todos disparados por acción del usuario —
`app/components/Aula.tsx:226` (`refresh()`), `app/lib/scr-teacher.ts:23`,
`app/lib/scr-events.ts:190`, `app/lib/scr-mybookings.ts:210`,
`app/lib/scr-coachwork.ts:540`, `app/lib/scr-debate.ts:855`,
`app/lib/scr-marketplace.ts:646`, `app/lib/scr-parent.ts:669`. Única otra ruta que
se pide sola al ABRIR una pantalla (no el dashboard): `/api/tabroom/tourns` en
`app/lib/scr-debate.ts:644`.

> Consecuencia medible: el payload de app-data viaja **dos veces** por sesión
> típica — una dentro del HTML de `/aula` y otra completa por cada `refresh()`,
> aunque el usuario solo haya marcado una lección como hecha.

### 0.2 Tamaño del JSON de `/api/app-data` (sesión de `analia.reyes@otr.do`, STUDENT)

`curl -b cookies -w '%{size_download}'` → **51.330 bytes** sin comprimir
(estable en 30 muestras seguidas). Con `gzip -9`: **5.622 bytes** (89 % de ahorro;
en prod lo comprime Nginx, `next dev` no comprime). 39 claves de primer nivel.

| Clave | Bytes JSON | % |
|---|---:|---:|
| `coursesContent` | 12.300 | 24 % |
| `lifetime` | 4.873 | 9,5 % |
| `coachProfile` | 4.050 | 7,9 % |
| `quizByLesson` | 3.891 | 7,6 % |
| `courseModules` | 3.217 | 6,3 % |
| `debate` | 2.769 | 5,4 % |
| `marketplace` | 2.583 | 5,0 % |
| `catalog` | 2.224 | 4,3 % |
| `activity` | 2.157 | 4,2 % |
| `courses` | 1.464 | 2,9 % |
| resto (29 claves) | ~11.800 | 23 % |

`coursesContent` + `courseModules` + `quizByLesson` = **19,4 kB (38 %)** son el
árbol completo de contenido de los cursos inscritos; el dashboard no usa nada de
eso hasta que el alumno entra a un curso.

## 1. Queries de /api/app-data

### 1.1 Método

`DEBUG="prisma:query"` **no emite nada** con Prisma 6.19 / library engine
(verificado: 0 líneas `prisma:query` en el log del dev server tras varias cargas).
Medición alternativa **sin tocar el repo**: script temporal fuera del árbol que
pre-siembra `globalThis.prisma` con un `PrismaClient({ log:[{emit:'event',
level:'query'}] })` — exactamente el singleton que `app/lib/db.ts:6` reutiliza
(`globalForPrisma.prisma ?? new PrismaClient()`) — y luego llama
`getAppData("analia.reyes@otr.do","es")`. Son las **sentencias SQL reales**, no un
conteo estático. (Referencia estática, para contraste: 62 llamadas `db.*.*()`
literales en `app/lib/queries.ts`, de las que solo se ejecuta el subconjunto del rol.)

### 1.2 Resultado

| Modo | Queries SQL | Wall time del `getAppData` |
|---|---:|---:|
| Caché de `lib/cache.ts` **fría** | **52** | 355 ms (incluye conexión/warm-up del engine) |
| Caché **caliente** (<30 s) | **45** | 7 ms |

Las 7 que ahorra la micro-caché: `Level`, `EventItem`, `SeasonPrize`, `Highlight`,
`User` (top-50 del leaderboard), `User` (nombres del board) y el `groupBy` de
`ActivityEvent` del ranking mensual.

Reparto por modelo de la carga fría (52):

`User` ×7 · `Review` ×5 · `Course` ×4 · `ActivityEvent` ×3 · `Module` ×2 ·
`Lesson` ×2 · `TournamentRegistration` ×2 · y ×1 cada uno: `Level`, `Badge`,
`Notification`, `Enrollment`, `EventItem`, `Conversation`, `ChatMessage`,
`Certificate`, `StudentSkill`, `CoachProfile`, `CoachPackage`, `CoachAvailability`,
`SeasonPrize`, `Highlight`, `Submission`, `QuizAttempt`, `LessonProgress`,
`DebateRecord`, `RatingUpdate`, `RubricScore`, `Booking`, `EscrowTxn`,
`Guardianship`, `Tournament`, `Quiz`, `QuizQuestion`, `QuizOption`.

### 1.3 ¿Hay N+1? — **No.**

Revisadas las 52 sentencias una a una: **ninguna se repite con distinto id**. Todas
las relaciones se resuelven con el batching de Prisma (`WHERE x IN (?,?,…)`), que es
el patrón correcto:

- `CoachPackage`/`CoachAvailability` → `WHERE coachId IN (?,?)` (1 query, no 1 por coach)
- `ChatMessage` → `WHERE conversationId IN (?,?,?,?) ORDER BY position DESC` (take-per-parent de `queries.ts:347`)
- `QuizQuestion` → `WHERE quizId IN (?,?)`; `QuizOption` → `WHERE questionId IN (?,?,…×8)`
- `RatingUpdate` → `WHERE debateId IN (?,…×7)`; `EscrowTxn` → `WHERE bookingId IN (?,?)`
- `Lesson` → `WHERE moduleId IN (?,…×5)`; `Module` → `WHERE id IN (?,…×5)`

Lo que sí hay es **fan-out de ida y vuelta**: 45 round-trips secuenciales-por-olas
para una sola pantalla. La función está organizada en 4 olas `Promise.all`
(`queries.ts:314`, `:415`, `:452`, `:505`) más colas sueltas; dentro de cada ola las
queries van en paralelo, pero las olas se esperan entre sí.

### 1.4 Las 3 queries caras aunque la DB sea diminuta

1. **`Review.groupBy` ×2 sin filtro** (`queries.ts:416` y `:419`):
   `WHERE 1=1 GROUP BY teacherId` y `… GROUP BY courseId`. Agrega la tabla `Review`
   **entera de la plataforma** en cada carga de cada usuario. Es un dato 100 %
   global e idéntico para todos — y es la única agregación global que **no** pasa
   por `cached()`.
2. **`ActivityEvent.groupBy`** (`queries.ts:690`): `WHERE createdAt >= ? AND < ?
   GROUP BY userId ORDER BY SUM(xp) DESC LIMIT 200`. Recorre todo el mes de eventos
   de toda la plataforma. Sí está cacheada (30 s), pero **sin índice utilizable**
   (§3).
3. **`CoachProfile` `take: 500`** (`queries.ts:375`) con `packages` +
   `availability` incluidos: 3 queries y hasta 500 perfiles con sus hijos en cada
   carga de CUALQUIER rol, incluido un alumno que nunca abre el marketplace.

## 2. Tiempos p50/p95

Medido con `curl -w '%{time_total}'` contra `http://localhost:3033/api/app-data`
con la cookie de sesión de `analia.reyes@otr.do` (STUDENT). Se validó
`%{http_code}` y `%{size_download}` en **cada** muestra: 100 % `200` y 51.330 B
constantes (sin esto los 404 intermitentes del `.next` compartido habrían pasado
por "tiempos rápidos"). 5 tiros de calentamiento descartados antes de cada tanda.

| Modo | n | min | p50 | p90 | p95 | máx |
|---|---:|---:|---:|---:|---:|---:|
| **Seriado**, caché caliente (`for` 1→30) | 30 | 17 ms | **20 ms** | 28 ms | **28 ms** | 30 ms |
| **Paralelo ×12**, caché caliente (`xargs -P12`) | 12 | 49 ms | **111 ms** | 136 ms | **137 ms** | 137 ms |
| **Paralelo ×12**, caché fría (tras 34 s de reposo) | 12 | 123 ms | 179 ms | — | 200 ms | 200 ms |
| 1 GET aislado con caché fría | 1 | — | 43 ms | — | — | — |
| … el GET inmediatamente siguiente (caliente) | 1 | — | 21 ms | — | — | — |

Lectura:

- La tanda seriada de 30 cabe entera en ~0,6 s, o sea **dentro de una sola ventana
  de TTL**: las 30 son golpes calientes. El coste de una carga fría se aísla arriba
  (43 ms vs 21 ms → la micro-caché ahorra ~50 % del tiempo de un GET, consistente
  con las 7 queries de 52 que evita).
- Concurrencia 12 multiplica la latencia individual ×5,5 (20 → 111 ms) aunque la
  caché esté caliente: no es la DB, es que **Node procesa el request en un solo
  hilo** y las 45 queries restantes (las per-user, que la caché no puede tocar)
  se serializan contra el mismo fichero SQLite.
- El anti-estampida de `cache.ts` **funciona**: 12 requests simultáneos con caché
  fría dan p50 179 ms, no 12× el coste frío. Sin dedupe de vuelo esperaríamos que
  los 12 recalcularan las 6 claves globales.

**Comparación con la referencia de julio (staging: p50 335 ms / p95 543 ms):
NO es comparable 1:1** y no debe leerse como una mejora ×16. Difieren en las tres
variables que dominan: (a) motor de DB — SQLite local en fichero vs Postgres por
socket; (b) escala — 12 usuarios/5 cursos aquí vs los datos de staging; (c) red —
loopback sin TLS ni Nginx vs HTTPS sobre el VPS. El número local sirve como
**línea base de regresión local**, no como predicción de producción.

## 3. Índices faltantes

Cruce de los `where`/`orderBy` REALES observados en §1.2 (SQL emitido, no lectura
del código) contra `prisma/schema.prisma`. **`schema.postgres.prisma` declara
exactamente los mismos `@@index`/`@@unique`** (diff de ambas listas: idéntico), así
que todo lo de abajo aplica a los dos motores.

### 3.1 La tanda ya añadida (revisada, sigue siendo correcta)

- `418d621` — `User @@index([leaderboardOptIn, debateRating])`, `Review @@index([studentId])`
- `c91b98e` — `Submission @@index([userId, createdAt])`, `Booking @@index([studentId, slotAt])`

Verificado contra el SQL emitido: las 4 **cubren** sus consultas
(`leaderboardRows` `queries.ts:584`, `mySubs` `:509`, `myBookingRows` `:613`,
`Review WHERE studentId` `:1340`). No hay que tocarlas.

### 3.2 Faltantes con impacto real (ordenados por daño esperado)

| # | Modelo | Índice propuesto (campos EXACTOS) | Query que lo justifica | Por qué |
|---|---|---|---|---|
| 1 | `Course` | `@@index([published, position])` | `app/lib/queries.ts:350` — `where:{published:true}, orderBy:{position:"asc"}` | `Course` **solo** tiene `@@index([teacherId])`. Es el catálogo que se lee en **cada carga de cada rol**; hoy es scan + sort |
| 2 | `ActivityEvent` | `@@index([createdAt])` | `app/lib/queries.ts:690` — `groupBy userId where:{createdAt:{gte,lt}} orderBy _sum.xp desc take 200` | El índice existente `[userId, createdAt]` **no sirve**: el `where` filtra por `createdAt` SIN `userId`, y `createdAt` es la 2ª columna. Rango de un mes = scan completo de la tabla que más crece del sistema |
| 3 | `ChatMessage` | `@@index([conversationId, position])` | `app/lib/queries.ts:347` — `include messages orderBy:{position:"desc"} take:60` sobre `conversationId IN (…)` | Hoy `@@index([conversationId])`: lee TODOS los mensajes de cada conversación y ordena en memoria para quedarse con 60. El coste crece con el historial, no con la ventana |
| 4 | `Notification` | `@@index([userId, unread, position])` | `app/lib/queries.ts:324-327` — `where OR([{userId}, {userId:null}]), orderBy:[{unread:"desc"},{position:"asc"}], take:50` | Hoy `@@index([userId])`: el `ORDER BY unread, position` se resuelve siempre con sort |
| 5 | `QuizAttempt` | `@@index([userId, createdAt])` | `app/lib/queries.ts:514` — `where:{userId}, orderBy:{createdAt:"desc"}, take:200` | Existe `[userId]` y `[userId, lessonTitle]`, ninguno cubre el `orderBy createdAt`. Mismo caso exacto que ya se arregló en `Submission` (c91b98e) y que aquí se dejó fuera |
| 6 | `Tournament` | `@@index([status, startsAt])` | `app/lib/queries.ts:593` — `where:{status:{in:["UPCOMING","LIVE"]}}, orderBy:[{startsAt:"asc"}], take:20` | Hoy `@@index([status])`: filtra bien, ordena en memoria |
| 7 | `Module` | `@@index([courseId, position])` | `app/lib/queries.ts:534` — `where:{courseId:{in:[…]}}, orderBy:[{courseId:"asc"},{position:"asc"}]` | Hoy `@@index([courseId])`; el `position` se ordena en memoria en cada carga |
| 8 | `Lesson` | `@@index([moduleId, position])` | `app/lib/queries.ts:534` (`include lessons orderBy position`) y `:355` | Hoy `@@index([moduleId])`; mismo patrón que 7 |

### 3.3 Faltantes menores (ganancia real pequeña — anotados, no recomendados aún)

- `Certificate @@index([userId, issuedAt])` — `queries.ts:361`; pocos certificados por alumno.
- `Review @@index([courseId, createdAt])` — `queries.ts:458`; el prefijo `courseId` ya lo da `@@unique([courseId, studentId])`, solo falta evitar el sort.
- `Level`, `Badge`, `EventItem`, `SeasonPrize`, `Highlight`, `Conversation`: `orderBy position` **sin ningún índice**. Son catálogos de decenas de filas y 4 de los 6 están cacheados 30 s → indexarlos es ruido, no ganancia.

### 3.4 Lo que NO se arregla con índices (dicho explícito)

Los dos `Review.groupBy` de `queries.ts:416`/`:419` van con `WHERE 1=1`: **ningún
índice evita agregar la tabla entera**. Su arreglo es de diseño (meterlos en
`cached()` como el resto de datos globales, o materializar el agregado), no de
schema. Lo mismo para el `take: 500` de `CoachProfile` (`:375`) en cargas de alumno.

## 4. Bundle

`npm run build` ejecutado en el worktree `/tmp/otr-d3-build` (nunca en el árbol
principal). Compiló limpio: `✓ Compiled successfully in 4.3s`, 61 páginas, **cero
errores y cero warnings**.

```
Route (app)                                 Size  First Load JS
┌ ○ /_not-found                            304 B         103 kB
├ ƒ /aula                                35.3 kB         138 kB
├ ○ /consulta                            7.58 kB         110 kB
├ ○ /icon.svg                                0 B            0 B
├ ƒ /p/[slug]                              304 B         103 kB
└ ƒ /uploads/[...path]                     304 B         103 kB
   (+ 66 rutas ƒ /api/**  ·  todas 304 B / 103 kB)

+ First Load JS shared by all             102 kB
  ├ chunks/0f14d1c6-e3cc024697cc354d.js  54.2 kB
  ├ chunks/4364-88fa7616db3a708b.js      45.7 kB
  └ other shared chunks (total)          2.44 kB

ƒ Middleware                             34.7 kB
```

**Ninguna ruta pasa de 200 kB** → no aplica el análisis de top-3 contribuyentes
que pedía el encargo. La peor es `/aula` con **138 kB** de First Load JS, un 31 %
por debajo del umbral.

Notas de lo que sí se ve en la tabla:

- Las 66 rutas `/api/**` reportan 304 B / 103 kB: es el suelo de framework que Next
  contabiliza para cualquier entrada, no JS que baje un cliente (son handlers de
  servidor). El bundle **real** de cliente son solo 3 entradas: `/aula` (138 kB),
  `/consulta` (110 kB) y `/_not-found` / `/p/[slug]` (103 kB).
- De los 138 kB de `/aula`, **102 kB (74 %) son el chunk compartido** (React 19 +
  runtime de Next: 54,2 + 45,7 + 2,44 kB) y solo **35,3 kB son código propio** —
  todo el SPA del Aula, sus ~25 pantallas `scr-*` y el kit de componentes. Eso ya
  está bien: `COURSE_TEMPLATES` (~11,6 kB) se carga con `import()` diferido
  (`app/components/Aula.tsx:405`) y no viaja en el first load.
- El **Middleware pesa 34,7 kB**. Su matcher es `"/api/:path*"` (`middleware.ts:63`),
  así que NO toca documentos ni estáticos — pero sí se ejecuta en **cada una** de
  las llamadas a API, incluidos los `refresh()` de app-data. No cuenta en el First
  Load JS; sí en la latencia por request. Es el bloque de la tabla que más
  sorprende para lo que hace y merece una mirada aparte.
- El coste que domina `/aula` **no es JS, es el payload de datos**: 51,3 kB de JSON
  embebido en el HTML (§0.2) frente a 35,3 kB de código propio.

## 5. Imagen /img/hero-speaking.jpg

### 5.1 Lo que es hoy

| Dato | Valor |
|---|---|
| Peso en disco | **182.424 B (178 kB)** |
| Dimensiones reales (`sips`) | **1600 × 1237 px** (relación 1,29:1) |
| Formato | JPEG, sin variantes (`public/img/` contiene **este único archivo**) |
| Servido por | estático de Next desde `public/`, sin `next/image` |

### 5.2 Dónde se referencia

- **CSS, 1 sitio:** `app/styles/screens.css:1099` — es el *fallback* de
  `.hero-photo::before`: `var(--hero-img, url("/img/hero-speaking.jpg"))`. Aplica
  al héroe del dashboard (`app/lib/scr-core.ts:207` y `:237`) y al de eventos
  (`app/lib/scr-events.ts:118`) cuando el dato no trae imagen propia — que es el
  caso hoy.
- **Datos, 4 sitios:** `prisma/seed.ts:1548` (`MOCK_FOTO`) la mete como
  `imageUrl` en los 4 `Highlight`. Se confirma en el payload real:
  `DB.highlights[0..3].imageUrl === "/img/hero-speaking.jpg"`. Se pintan como
  `background-image` de `.hl-img` en `app/lib/scr-core.ts:459`.

### 5.3 Cuántas veces se descarga por carga de página

**Referencias en el DOM del dashboard: 5** (1 héroe + 4 tarjetas de "Lo mejor de la
temporada"). **Descargas HTTP: 1.** Las 5 apuntan a la MISMA URL, así que el
navegador emite una sola petición y reutiliza la respuesta para las otras 4 capas
(y en cargas siguientes la sirve del caché HTTP).

> Verificación: conteo estático de referencias (1 regla CSS + 4 `imageUrl` en el
> JSON de `/api/app-data`, comprobados en el payload real). **No se instrumentó un
> navegador**: habría requerido teclear la contraseña de la cuenta demo en el
> formulario de login, y no introduzco contraseñas en formularios. Lo que queda sin
> verificar en un `Network` real es únicamente eso: que el navegador deduplica —
> comportamiento estándar, pero no medido aquí.

Así que el problema **no es el número de descargas: es el tamaño de esa única
descarga**. 178 kB es más que TODO el JS propio de `/aula` (35,3 kB) y 3,5× el
payload de datos comprimido (5,6 kB).

### 5.4 Propuesta concreta (NO aplicada)

1. **Recomprimir el original y bajar a WebP.** 1600 × 1237 es un tamaño razonable
   para el héroe (ocupa los 1120 px del contenedor, ~1,4× para pantallas 2×), pero
   no a 178 kB de JPEG. WebP calidad ~75 sobre el mismo lienzo debería quedar en
   **60-80 kB** (ahorro 55-65 %) sin cambiar una línea de layout.
   → `public/img/hero-speaking.webp` a **1600 × 1237**.
2. **Variante pequeña para las tarjetas.** `.hl-grid` es de 4 columnas con `gap:12`
   dentro del contenedor de 1120 (`screens.css:1038`) y cada `.hl` tiene
   `aspect-ratio:5/4` → cada tarjeta mide **271 × 217 CSS px**; a 2× necesita
   **542 × 434**. Hoy baja 1600 px de ancho para pintar 271: **~6× más píxeles de
   los necesarios**. → `public/img/hero-speaking-640.webp` a **640 × 495**
   (cubre 2× con margen), estimado **25-35 kB**.
3. **`sizes` / selección de variante — ojo con el mecanismo.** Las 5 referencias son
   `background-image` de CSS, **no `<img>`**: `srcset`/`sizes` NO aplican tal cual.
   Dos caminos, hay que elegir uno:
   - *Mínimo*: en `.hl-img` usar `image-set()` con la variante de 640
     (`background-image: image-set(url(...-640.webp) 1x, url(...-1280.webp) 2x)`),
     y dejar el héroe con la de 1600. Sin tocar el HTML generado.
   - *Correcto a largo plazo*: convertir la foto de la tarjeta en un `<img>` real
     con `srcset="…-640.webp 640w, …-1280.webp 1280w"` y
     `sizes="(max-width:640px) 100vw, (max-width:860px) 50vw, 271px"` +
     `loading="lazy"` + `decoding="async"`. Esto además arregla que hoy las 4 fotos
     no tienen `alt` ni son diferibles.
4. **Fallback JPEG.** Mantener el `.jpg` actual (recomprimido) como último recurso
   en la lista de `image-set()`/`<picture>` para navegadores sin WebP.
5. **Ahorro estimado total** en la primera carga del dashboard: de 178 kB a
   **~65-85 kB** si solo se hace (1), o a **~30 kB** si el héroe se carga diferido
   y las tarjetas usan la variante de 640 — es decir, entre **-55 % y -83 %** del
   recurso más pesado de la pantalla.

> Recordatorio del encargo: nada de esto se aplicó. `public/img/` sigue con el único
> `hero-speaking.jpg` de 182.424 B.

## Cierre de campaña (2026-08-08)

- **§3 índices: APLICADOS los 8** en ambos schemas + migración `20260808000000_add_perf_indexes` (nombres canónicos de Prisma, aditiva; el VPS tiene las 12 previas aplicadas → entra limpia). Ola E1.
- **§5 hero: APLICADO** — 182.424 → **84.760 B** (1280×989, mismo aspect), in-place sin tocar referencias. Ola E1.
- §2: los p50/p95 de staging se re-medirán tras el deploy de esta rama (comparativa julio: 335/543 ms).
