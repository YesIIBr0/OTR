# Requerimientos — Rediseño OTR (meeting Isaac, 2026-06-27)

> Documento autoritativo. Supera al borrador `docs/plan-rediseno-otr.md`.
> Basado en investigación del código real (refs `archivo:línea`). Estado por requisito:
> **🟢 Hecho · 🟡 Parcial · 🔵 Nuevo · 🟣 Spike/investigación**.
> Esfuerzo: **S** ≤½ día · **M** 1–2 d · **L** 3–5 d.

---

## 0. Hallazgos que reencuadran el alcance

La investigación cambió varias suposiciones del meeting — **mucho ya está construido**:

| Tema | Realidad en el código | Implicación |
|---|---|---|
| "El coach registra, no el alumno" | El registro del alumno YA es una **solicitud** (`adjudicated:false`, no mueve rating) que el coach aprueba. `openRecordDebate` `scr-debate.ts:564` + cola del coach (`e1f7bf6`). | No hay que rehacer el flujo; solo **decidir** si se oculta el botón del alumno. |
| "Debate Hub no debe tener niveles" | El Hub **ya está limpio** de `user.level`/`user.xp`. El único "Novato" es el **tier Glicko-2** (distinto, debe quedarse). | Requisito casi cumplido; solo verificar. |
| "Video de bienvenida del profe" | `CoachProfile.introVideoUrl` **ya existe** y se renderiza (YouTube/Cloudflare/video) en `scr-marketplace.ts:321`. `ratingAvg`/`reviewCount` también. | Coach: hecho. Falta solo video a nivel **curso**. |
| "OTR Pro atado a suscripción" | `User.membership` (free/pro/elite) **existe**; gating real de analytics en `queries.ts:780`. Pero `/api/membership` es **simulado** (sin Stripe sub real). | El gating funciona; falta la **pasarela real** si se quiere cobrar. |
| "Inglés incompleto" | ~1.550 claves i18n son **simétricas ES↔EN** (test las verifica). El problema son ~20-25 **strings hardcodeados** + valores **enum** ("Novato" tier) renderizados crudos. | No es traducir todo: es cazar hardcode. |
| NSDA | **Sin API pública**; Tabroom reescribiendo su API sin fecha; sync NSDA↔Tabroom es solo roster import. | Integración automática **no factible** ahora. |

---

## EPIC 1 — i18n: completar inglés 🟡 (S–M)

**Objetivo:** que al cambiar a EN no quede texto en español.

**Lógica/cambios:**
- No falta traducir el diccionario (es simétrico). Hay que **mover ~20-25 strings hardcodeados** a claves `t()`. Ubicaciones confirmadas:
  - `scr-core.ts`: `"Retoma…"` (99), `"% completado"` (100,389), saludos (123), `"días de racha"` (129), `"prom."` (156), `"con …"` (165), countdown `"en X min/h/día"` (225-229), `"X de Y actividades"` (490).
  - `scr-learn.ts`: `"Entregada/Entrega/Examen"` (140,156,205,416,537,547).
  - `scr-hub.ts`: labels de ritmo y goals (238,248,305).
- **Valores enum** ("Novato" tier en `scr-core.ts:282`, `scr-debate.ts:47`): añadir un mapa `tierLabel(tier, lang)` para traducir el tier mostrado.

**Criterios de aceptación:** recorrer las ~20 pantallas en EN → 0 strings ES de cara al usuario; el tier se muestra traducido; el test `i18n-wiring` sigue verde.

---

## EPIC 2 — Consolidar "Cursos" 🔵 (M)

**Objetivo:** una sola sección de cursos = **activos + buscar**; sacar Membresía.

**Hallazgo:** hoy son **dos** items de nav en grupo "Aprender" (`shell.ts:26-29`): **Cursos** (`catalog`→`S.catalog`, explorar/inscribirse, `scr-extra.ts:181`) y **Mi aprendizaje** (`course`→`S.course`, cursos activos con progreso, `scr-core.ts:453`). El grupo "Marketplace" tiene **Coaches** (`S.marketplace`), **Mis reservas** (`S.myBookings`) y **Membresía** (`S.membership` en `scr-lifetime.ts`).

> ⚠️ Aclaración: Coaches/Reservas son **coaching** (1:1), no cursos. No son "tus programas" como pensaba Isaac. La consolidación real y correcta es **fusionar `catalog` + `course` en una sección "Cursos"** con dos tabs.

**Lógica/cambios:**
- Nueva pantalla **"Cursos"** (ruta única) con sub-tabs: **Mis cursos** (activos, reusa `S.course`) + **Catálogo / Buscar nuevos** (reusa `S.catalog`). Patrón de tabs como el del Debate Hub (`window.__coursesTab`).
- Botón CTA "Buscar catálogo" desde Mis cursos.
- Nav: colapsar las dos entradas en una. `shell.ts` + `screens.ts`.
- **Membresía** sale del grupo Marketplace → **nav propio** (recomendado) o dentro de Perfil. *(DECISIÓN 2)*
- Coaches + Reservas: se mantienen (son coaching), pero se pueden reagrupar bajo "Coaching".

**Criterios:** un solo item "Cursos" con activos + catálogo; Membresía fuera de ese grupo; sin rutas rotas (migas/`data-go`).

**Esfuerzo:** M (fusión de vistas + nav + rutas).

---

## EPIC 3 — Debate Hub overhaul 🟡 (M–L)

Todo en `scr-debate.ts` + `i18n-keys/debate.ts` salvo nota. Es el bloque de más valor (debate-first).

| ID | Requisito | Lógica | Estado |
|---|---|---|---|
| 3.1 | **Desacoplar de niveles** | El Hub ya no usa `level`/`xp`. Solo verificar que ningún KPI/badge muestre nivel académico. | 🟢 verificar |
| 3.2 | **KPIs:** "Rondas participadas · Victorias · % victoria"; **quitar Derrotas** | `scr-debate.ts:163-177`. Renombrar `kpiAdjudicated`→participadas. **Decisión de cálculo:** *Participadas* = `history.length` (todas, incl. pendientes) o solo adjudicadas. Recomiendo: **Participadas = total enviadas**, Victorias/% = sobre **adjudicadas**. Quitar el 4º tile (derrotas). | 🟡 |
| 3.3 | **Quitar botón "Registrar" del alumno** | Botones en `scr-debate.ts:147,221`. Ya es solicitud (no mueve rating). *(DECISIÓN 1: ocultar del alumno y dejar solo coach, o mantener solicitud).* | 🟡 decisión |
| 3.4 | **"Próximo evento" → "Próximo torneo"** | `scr-debate.ts:169` ya elige el siguiente `Tournament` (`startsAt`, `status=UPCOMING`). Cambiar label + asegurar `registered` boolean por-usuario en `queries.ts` (hoy la API da conteo, `tournaments/route.ts:40`). | 🟡 |
| 3.5 | **Sub-tabs: solo Resumen/Mis debates/Práctica/Leaderboard** — quitar **Analytics** y **Torneos** | Lista en `scr-debate.ts:28-35`. ⚠️ **Analytics es la ÚNICA feature Pro** (`queries.ts:780`). Quitar la pestaña pierde el gancho Pro → mover analytics a un panel "OTR Pro" o folrarlo en Resumen para Pro. *(DECISIÓN abierta)*. Torneos → migra a Eventos (EPIC 4). | 🔵 |
| 3.6 | **Práctica/Drills** en lugar propio | Ya es un sub-tab (`viewPractice` 269-305): timer PF (hecho) + **drills placeholder vacío** (282) + finder "encuentra rival". Falta **contenido de drills** (ejercicios in-platform). | 🟡/🔵 |
| 3.7 | **"Encuentra rival cerca de tu ranking"** | Ya existe client-side (`scr-debate.ts:288-300`): ordena el leaderboard por `|rating−tu rating|`, top 5. Isaac lo aprobó. v2 opcional: endpoint `/api/matchmaking` con disponibilidad. | 🟢 (v1) / 🔵 (v2) |
| 3.8 | **Leaderboard + OTR Pro** | Leaderboard ya existe (`api/leaderboards`, ordena por `debateRating`, opt-in, excluye menores). OTR Pro atado a `membership` (ya gatea analytics). | 🟢 / ver EPIC 6 |

**Esfuerzo:** M–L (3.2/3.4/3.5 son S; 3.6 drills es M).

---

## EPIC 4 — Eventos = eventos + torneos 🔵 (S–M)

**Objetivo:** en Eventos se ven **próximos eventos + próximos torneos**; el Debate Hub solo destaca el "próximo torneo".

**Lógica:** `scr-events.ts` (hoy `EventItem`) + añadir sección de **torneos** (`Tournament`, `status=UPCOMING`, orden `startsAt`). Reusa la API `tournaments`. Quitar la pestaña Torneos del Hub (EPIC 3.5).

**Criterios:** Eventos lista seminarios/workshops + torneos próximos; sin duplicar la lista de torneos en el Hub.

---

## EPIC 5 — Catálogo + página de profesor/curso 🟡 (S–M)

**Hallazgo:** el **video de bienvenida + ratings del COACH ya está** (`introVideoUrl`, `ratingAvg`, `reviewCount`; render en `scr-marketplace.ts:321`). Falta solo a nivel **curso**.

**Lógica/cambios:**
- Curso: añadir `welcomeVideoKind`/`welcomeVideoSrc` a `Course` (ambos schemas) + render con `videoEmbedHtml()` (reutiliza `video.ts`, sin tocarlo) en la cabecera del curso / catálogo.
- Subida: reusa el modal de video del profe (`scr-teacher.ts:390`, soporta YouTube/Cloudflare/upload ≤25 MB).
- Catálogo: mostrar overview (video + estrellas + resumen) en la tarjeta/detalle (`scr-extra.ts`).

**Criterios:** un curso puede tener video de bienvenida; el catálogo muestra rating + overview.

---

## EPIC 6 — OTR Pro / Membresía 🟡 (S real / L si Stripe real)

**Hallazgo:** `User.membership` (free/pro/elite) existe; `isProMember` gatea analytics (`queries.ts:784`); pero `/api/membership` es **simulado** (set directo, sin Stripe). `/api/checkout` tiene ventas **desactivadas** (`COURSE_SALES_ENABLED=false`); el webhook no maneja suscripciones.

**Lógica/posibilidades:**
- **v1 (S):** mantener `membership` simulado; **mover Membresía** a su nav (EPIC 2) y **extender el gating** a las features Pro nuevas (leaderboard avanzado, drills premium, analytics) leyendo `me.membership`.
- **v2 (L):** Stripe **subscriptions** reales → `stripeCustomerId`/`stripeSubscriptionId` en User, productos/price en Stripe, webhook `customer.subscription.*` que sincronice `membership`. *(DECISIÓN: ¿se cobra ya o sigue simulado?)*

**Criterios:** las features Pro se gatean por `membership`; la pantalla de Membresía vive fuera de Cursos.

---

## EPIC 7 — NSDA / Tabroom 🟣 (spike — NO build aún)

**Posibilidades investigadas (jun 2026):**
- **No hay API pública** ni de NSDA ni de Tabroom. Tabroom está **reescribiendo** su backend (Node/Express + Svelte) y *quizá* abra API después — **sin fecha**; su equipo técnico es 1 persona.
- Existe `tabroom.com/api/download_data.mhtml`: exporta el JSON **completo de UN torneo** si estás logueado y eres dueño de ese torneo. Útil solo para **torneos que corra un coach OTR**.
- El sync NSDA↔Tabroom es **roster import** + push de puntos (confirmado por el coach), no una API de lectura para terceros.

**Recomendación (faseada):**
1. **v1 (factible ya):** OTR es la **fuente de verdad de torneos locales** (modelo `Tournament` ya existe) — exactamente el hueco que NSDA no cubre. Campo opcional `nsdaMeritId` en User para mostrarlo (manual, sin sync).
2. **v2 (medio):** si OTR/coaches corren torneos en Tabroom, importar resultados de ESE torneo vía `download_data.mhtml` (requiere credenciales del coach). Scraping de resultados públicos = frágil + riesgo ToS (no recomendado).
3. **v3 (estratégico):** partnership formal con NSDA/Tabroom cuando su API nueva exista.

**Entregable del spike:** este análisis. **No** construir sync automático ahora. *(DECISIÓN 3: ¿se prioriza v1 manual + torneos locales?)*

---

## EPIC 8 — Home / Dashboard redesign 🔵 (M) — **ÚLTIMO**

Por instrucción de Isaac, va de último. `scr-core.ts` + `tokens.css`/`app.css`.

| ID | Requisito | Lógica |
|---|---|---|
| 8.1 | Quitar "Empieza aquí" / "Para ti" / eyebrows | Claves `core.naStartEyebrow` (`core.ts:10`) y `core.recoEyebrow` (`core.ts:43`); 6 usos de `.eyebrow` en `scr-core.ts`. Renombrar "Tus programas"→"Programas recomendados"; quitar el framing "para ti". |
| 8.2 | Más vida/color/dinamismo (para jóvenes) | El "verde plano" es `.badge.sky` (`app.css:200`, `#E1F2DE`/`#176B11`). Añadir variante con gradiente/profundidad/animación sutil, manteniendo el brandbook. |
| 8.3 | Quitar Torneos redundante del Home | No hay bloque de Torneos en el Home; la redundancia percibida es el **Debate Rank card** (`scr-core.ts:276-293`) que duplica el Hub. Simplificar/atenuar ese card. |

---

## Decisiones que bloquean
1. **Registro de debate:** ¿ocultar el botón del alumno (solo coach) o mantener "solicitud→aprobación" ya construida?
2. **Membresía:** ¿nav propio o dentro de Perfil?
3. **NSDA:** ¿v1 (torneos locales + ID manual) ahora, o todo a backlog?
4. **OTR Pro / Stripe:** ¿se cobra ya (Stripe subscriptions reales) o sigue simulado?
5. **Analytics (Hub):** al quitar la pestaña, ¿dónde vive la analítica Pro (panel OTR Pro nuevo / dentro de Resumen para Pro)?

## Orden de ejecución recomendado
**1 (i18n) → 2 (Cursos) → 3 (Debate Hub) → 4 (Eventos) → 5 (Catálogo/video) → 6 (Pro gating v1) → 7 (NSDA v1) → 8 (Dashboard, último).**
Arrancar por i18n + Cursos (rápidos, sin decisiones); Debate Hub es el de más valor; Dashboard al final.

## Fuentes (NSDA/Tabroom)
- Tabroom Help — API/FAQ: https://docs.tabroom.com/overview/faq · https://docs.tabroom.com/results/nsda-points
- NSDA — Points entry / membership: https://www.speechanddebate.org/points-entry/ · https://www.speechanddebate.org/membership-database/
