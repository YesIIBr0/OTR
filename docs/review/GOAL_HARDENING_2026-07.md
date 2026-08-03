# GOAL — Validación multi-usuario, concurrencia y hardening · Julio 2026

Campaña pedida en modo GOAL: *"que todas las funcionalidades queden válidas, probadas,
funcionales para varios usuarios al mismo tiempo, con toda la seguridad posible, que la
data no falle, queries optimizados, loadings, caché, tokens"*.

Lo distinto de esta campaña: **se probó contra staging REAL con usuarios simultáneos**, no
solo con mocks. Eso encontró dos cosas que ninguna suite de tests había visto.

## 1 · Lo que se probó de verdad (staging, usuarios concurrentes)

| Escenario | Resultado medido |
|---|---|
| 8 registros simultáneos | 4 creados + 4 frenados por el rate-limit de IP · **0 errores 5xx** · 488 ms |
| Logins concurrentes | 100 % OK · p95 **270 ms** |
| 12 cargas de `/api/app-data` en paralelo | p50 **335 ms** · p95 **543 ms** · **0 errores** |
| Carrera del **mismo slot** (varios alumnos reservan a la vez) | La transacción cierra la carrera: los perdedores reciben 409, nunca doble reserva |
| Doble inscripción simultánea | **BUG ENCONTRADO** → corregido (abajo) |

## 2 · Bugs reales encontrados y cerrados

### 2.1 Doble inscripción concurrente devolvía 500 (dinero) — `18e61a8`
Dos checkouts del mismo curso a la vez respondían **200 / 500**. `checkout` y el webhook de
Stripe hacían `findUnique → create`: ambas peticiones veían `null` y la segunda violaba el
unique `userId_courseId` sin manejar. El estado final era correcto (1 inscripción) pero el
usuario veía un error del servidor.

**Arreglo:** `lib/enroll.ts · enrollOnce()` — se INTENTA la escritura y la violación de
unicidad se trata como "ya inscrito". La unicidad la garantiza la base de datos, no un
chequeo previo: entre leer y escribir **siempre** hay ventana. Aplicado en checkout y en el
webhook; el contador `studentsCount` solo sube cuando esa llamada creó la fila.

### 2.2 Test flaky + no-determinismo real — `18e61a8`
`computeRosterMetrics` recibía `nowMs` para ser determinista pero `whenLabel` usaba
`Date.now()` por dentro: la suite reventó sola al cambiar de día. `whenLabel` acepta ahora
el "ahora" inyectable.

## 3 · Hardening y rendimiento añadidos

### 3.1 Revocación de sesiones server-side — `f6ab087`
Antes, "cerrar sesión" solo borraba tu cookie: **un token robado valía 30 días**.
`User.sessionEpoch` viaja DENTRO de la firma HMAC y se compara contra la fila en cada
request. Incrementarlo revoca **todas** las sesiones vivas de la cuenta al instante — O(1),
sin tabla de sesiones que purgar. Botón "Cerrar sesión en todos los dispositivos" en Ajustes
(dos toques). Manipular el epoch del token lo invalida (va firmado).

### 3.2 Micro-caché de datos globales — `8462661`
Con 10 alumnos entrando a la vez, las consultas idénticas para todos (niveles, eventos,
top-50 del leaderboard) se ejecutaban 10 veces. `lib/cache.ts` las cachea 30 s **y deduplica
las peticiones en vuelo**: 10 requests con caché fría = 1 sola query (anti-estampida).
Solo datos globales — la clave no acepta `userId` a propósito. Un error nunca se cachea.
`/uploads/*` pasa a `immutable` (el nombre en disco es un cuid: el contenido de una URL
jamás cambia) — se acabó revalidar avatares y grabaciones en cada carga.

### 3.3 Backstop global de rate limit — `bc8c05e`
La auditoría encontró ~18 rutas de escritura sin tope. En vez de parchear una a una (lo que
deja el agujero abierto para la ruta de mañana), `middleware.ts` aplica un tope por IP a
**cualquier** escritura de `/api`. No sustituye a los límites finos por ruta: es la red de
seguridad. Exentos a propósito los webhooks (firmados, con ráfagas legítimas) y el cron.

## 4 · Estado verificado al cierre

- **601 tests** (la campaña completa empezó en 342), CI verde en cada push
- `tsc` 0 · `eslint` 0 errores · `prisma validate` ×2 · `next build` 0
- Cookies: httpOnly + secure en producción + SameSite lax — auditadas
- Rutas sin autenticación: solo las correctas (health, auth, disponibilidad pública, proxy
  público de Tabroom) — auditadas una a una

## 5 · Lo que queda fuera del alcance del código

- **Prueba de carga a gran escala** (k6, cientos de usuarios virtuales): lo medido aquí son
  decenas de peticiones concurrentes reales, suficiente para el piloto. Para el siguiente
  10× el disparador y el procedimiento están en el Plan Maestro F10.
- **Caché compartida entre nodos** (Redis): innecesaria con un solo nodo; el TTL corto la
  hace correcta igualmente si mañana hay dos.
- **Observabilidad** (Sentry/UptimeRobot): sigue siendo la acción nº 4 del Tribunal y
  depende de una cuenta del fundador — 25 minutos que valen más que cualquier optimización
  adicional de código.
