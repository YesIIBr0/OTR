# OTR Aula — Product Review (junio 2026)

## 1. Resumen ejecutivo

OTR Aula es un producto con una arquitectura limpia y una tesis clara (debate-first, el coach mueve el rating), pero hoy **vende lo que no entrega y regala lo que debería cobrar**. Tres patrones se confirman de forma independiente entre múltiples boards: (1) el plan Pro promete features inexistentes —Analytics fue eliminado, Práctica es un placeholder— mientras el activo diferenciador (el Lifetime Profile, "el moat") se da gratis; (2) el flujo del coach —la acción más valiosa, adjudicar, que es lo único que hace real al rating— es lento, manual, sin lote y **literalmente inalcanzable en móvil** (el botón Publicar queda fuera del viewport); (3) hay un **agujero de seguridad crítico de menores**: cualquier "padre" puede reclamar tutela ACTIVA sobre cualquier menor solo con su email, sin verificación. Las tres apuestas mayores: **(A)** rediseñar el paywall sobre lo construido (proof/sharing) y conectar un Stripe real para empezar a medir; **(B)** convertir la pestaña Práctica vacía en un **sparring de IA** y el formulario de adjudicación en **ballots asistidos por IA** —la única vía a un moat y a un loop de engagement diario—; **(C)** cerrar la brecha de tutela y construir la automatización de retención (reportes a padres, nudges de inactividad) que hoy está toda escrita pero nunca se dispara.

---

## 2. Quick wins (alto impacto / bajo esfuerzo)

| Cambio | Por qué importa | Esfuerzo | Boards |
|---|---|---|---|
| Reescribir copy de Pro para que solo describa lo que existe hoy (quitar "Analytics completo" + "Práctica ilimitada"; marcar futuro como "Próximamente") | Promesa rota en el único punto de monetización → mata conversión y dispara reembolsos cuando Stripe sea real | S | first-time-user, ux, business |
| Adjudicación móvil: enrutar el modal por la variante `is-drawer` (ya existe) o dar `max-height`+`overflow-y:auto` | El coach no puede pulsar "Publicar" en el teléfono → la acción núcleo del producto es inusable en su contexto real (torneo) | S | mobile |
| `viewport-fit=cover` + `font-size:16px` en inputs móviles | Activa el safe-area ya codificado (tabbar bajo el home indicator) y frena el auto-zoom de iOS en cada formulario | S | mobile |
| Quitar `debateCard` "Debate Rank" del Home + suavizar eyebrows | Duplica el Debate Hub; tono corporativo para público 12-17 | S | ux |
| Arreglar glitch "12:23 AM": normalizar `startsAt` en seed + `eventDateLabel` omite hora 00:00 | Una hora absurda hace que toda la pantalla parezca de juguete | S | ux |
| Token de texto verde AA-safe (`#176B11`) en `.eyebrow`/`.badge-count`/inline | Un swap arregla ~80 instancias de fallo de contraste AA → riesgo ADA/508 en US, público de menores | S | accessibility |
| Quitar "Coaches" (marketplace) del nav/drawer del coach | Primer ítem del coach es un dead-end role-gated de la competencia | S | ux, mobile |
| Indicador "Video" en `coachCard` cuando hay `introVideoUrl` | El mayor driver de conversión a reserva está enterrado un clic adentro | S | ux, business |
| Índice `@@index([leaderboardOptIn, debateRating])` en User | Leaderboard hace full-scan en CADA carga de dashboard, no solo en su pantalla | S | performance |
| `notify()` helper + `createdAt`/`href`/`type` en Notification | Substrato compartido que desbloquea TODA la automatización (reminders, nudges, alertas) | S | automation |
| Quitar `badge:'2'` hardcodeado del nav de estudiante (dejar `navBadge` real) | Badge que miente entrena al usuario a ignorar todos los badges | S | ux |

---

## 3. Issues críticos (P0 / P1)

### P0 — Seguridad de menores: tutela auto-activada sin verificación
**[CONFIRMADO: security]** `POST /api/guardianship` crea el vínculo padre↔menor como `ACTIVE` inmediatamente (`status = student.ageBand==="adult" ? "PENDING" : "ACTIVE"`). Cualquier cuenta PARENT auto-registrada, con solo el email del menor, obtiene PII completa, grabaciones de sesión, toggle de perfil público y poder de aprobar/cancelar bookings de coaching 1:1 con adultos. El flujo de registro SÍ lo hace bien (`PENDING`), pero esta ruta lo invierte. Para una plataforma cuya promesa central es la seguridad de 12-17, es severidad existencial (COPPA/GDPR-K).
**Recomendación:** crear el vínculo `PENDING` también para menores; exigir verificación out-of-band (link al email del padre **y** match con el `guardianEmail` que el menor declaró en registro). Hasta arreglarlo, gatear `parent-report`/`public-profile`/aprobación de bookings tras un flag `verified`, no `status==='ACTIVE'`. **Esfuerzo: M.**

### P0 — El "moat" (señal de riesgo del coach) es seed data congelada
**[CONFIRMADO: automation]** `risk/trend/engagement/attendance/lastAccess` son columnas con defaults hardcodeados en `Enrollment`; ningún job las recomputa. Un alumno puede dejar de entrar, faltar a todo y perder cada debate, y el panel del coach lo muestra verde con tendencia "up" para siempre. La detección de riesgo —el motor de retención del marketplace pagado— es no funcional. **Recomendación:** job nocturno `computeRiskScores` que derive riesgo de señales reales ya en DB (inactividad vía `ActivityEvent`, ratio de asistencia, win-rate/delta de rating, entregas vencidas). Fase 2 (IA): resumir *por qué* y sugerir una intervención de un clic. **Esfuerzo: M.**

### P0 — Adjudicación móvil rota: botón Publicar inalcanzable
**[CONFIRMADO: mobile]** El modal de adjudicación (8 campos) usa el `.modal` por defecto sin `max-height` ni `overflow-y`. En 375×667 mide ~700-800px y `.modal-foot` (Cancelar/Publicar) queda fuera del scroll. El coach en un torneo —exactamente cuando adjudica desde el teléfono— no puede registrar la ronda. Es la acción sobre la que se construyó el producto. **Recomendación:** enrutar por la variante `is-drawer` ya existente (coste casi nulo). **Esfuerzo: S.**

### P1 — Pro vende vaporware; el moat se regala
**[CONFIRMADO por 3 boards: first-time-user, ux, business]** La membresía vende "Analytics completo" (pantalla eliminada del Hub) y "Práctica ilimitada" (placeholder vacío para todos). De 5 beneficios, **solo 1 tiene gate server-side, y su UI fue borrada** → Pro hoy no convierte sobre nada real. En paralelo, el Lifetime Profile (radar, ledger, credenciales, sharing) —el activo de estatus y viralidad que el código llama "el moat"— es 100% gratis. **Conflicto declarado:** *first-time-user/ux* recomiendan simplemente reescribir el copy; *business* va más lejos y propone reubicar el paywall. **Resolución del socio director:** hacer ambos en secuencia — reescritura de copy YA (quick win, P1), y reubicar el gate al perfil verificado + certificado/transcript descargable + slug público como track P1 de monetización real. **Esfuerzo: S (copy) → M (re-gate).**

### P1 — El CTA estrella del Home lleva a un callejón sin salida
**[CONFIRMADO: first-time-user, ux]** El "siguiente paso" del Home y la tarjeta Debate Rank empujan "Practica tu primer debate" → pestaña Práctica, que es doble vacío (drills placeholder + finder no clicable). El primer clic intencional del usuario nuevo muere. **Recomendación:** para el debutante, CTA primario = primera lección real / catálogo / reservar coach (acción completable hoy); no ofrecer como "siguiente paso" algo inejecutable. **Esfuerzo: S-M.**

### P1 — Membership es un no-op de DB; sin Stripe no hay aprendizaje
**[CONFIRMADO: business]** `POST /api/membership` solo escribe `membership='pro'`; no hay producto de suscripción, checkout ni webhook. No se puede medir conversión free→Pro, sensibilidad de precio ni trial→paid. Cada decisión de monetización vuela a ciegas. **Recomendación:** conectar UNA suscripción Stripe real (test mode), default ANUAL ($79), e instrumentar intención de upgrade aparte de upgrades completados. **Esfuerzo: M.**

---

## 4. UX

| Hallazgo | Severidad | Recomendación | Esfuerzo |
|---|---|---|---|
| **Home día-0 = pared de ceros** [first-time-user]. Tras placement, el debutante ve 7 bloques sin jerarquía, KPIs en 0, listas vacías. Parece "roto", no "empieza aquí". | high | Estado día-0 distinto: un card de bienvenida + 1 acción + 1 línea de qué es OTR. Ocultar KPIs/leaderboard/logros hasta haber datos. Revelación progresiva. | M |
| **Práctica es callejón sin salida** [ux, first-time-user, ai]. Lista rivales que no puedes desafiar; único CTA lleva a otra tabla muerta. | high | Si Práctica no existe aún, colapsar el sub-tab o marcarlo "Próximamente"; no usarlo como destino de Next Action. Cada fila de rival necesita 1 acción coherente con el modelo coach. | M |
| **Empties terminales sin CTA** [ux]. Drills y finder vacío no ofrecen siguiente paso, a diferencia de `historyEmpty`/`skillEmpty` que sí guían. | low | Regla uniforme "ningún empty sin siguiente paso": reservar coach / repasar lección. | S |
| **Torneos en dos sitios con inscripción inconsistente** [ux]. Eventos tiene botón "Inscribirme", el Hub solo informa — al revés de lo que el comentario del código afirma. | medium | Un lugar canónico; replicar el botón `data-tn-register` en `nextEventCard`. | M |
| **Placement = autoevaluación con jerga** [first-time-user]. Un menor de 12-14 no puede calificarse en "Cross-ex"/"Refutación"; el resultado contamina el Skill Graph oficial y no es skippable. | high | Reemplazar self-rating por 3-4 preguntas de experiencia/comportamiento, o hacerlo skippable con baseline neutral + "tu coach lo ajustará". Glosar términos. | M |
| **Jerga Glicko sin glosar en el hero del Hub** [first-time-user]. "Glicko-2", "±350 RD", "provisional", "adjudica" sin explicación inline para 12-17. | medium | Glosa de adolescente inline ("Tu nivel de debate"); técnica bajo info-icon/hover. | S |
| **Onboarding de metas es código muerto** [first-time-user]. La pantalla que captura intención nunca se muestra: placement consume el flag y recarga al Home. | medium | Encadenar placement → onboarding → dashboard, o fusionar en wizard de 2 pasos; usar las metas para dirigir el CTA del Home. | M |
| **El modelo coach-céntrico no se explica** [first-time-user]. El alumno sin coach nunca sabe que su rating solo se mueve si un coach adjudica. | medium | Card en onboarding "¿Cómo subo de nivel?" + CTA a encontrar coach/curso con coach como paso fundacional. | M |

---

## 5. UI

| Hallazgo | Severidad | Recomendación | Esfuerzo |
|---|---|---|---|
| **Home duplica el Debate Hub + eyebrows corporativos** [ux] | medium | Eliminar `debateCard`; suavizar eyebrows a sentence-case; saludo más cálido para la audiencia teen. | S |
| **Glitch "12:23 AM" en torneos** [ux] | medium | Normalizar `startsAt` en seed (`setHours(18,0,0,0)`); `eventDateLabel` omite hora date-only. | S |
| **Video de bienvenida del coach solo en el perfil** [ux, business] | low | Badge/thumbnail "Video" en `coachCard`; alto retorno de conversión. | S |
| **Badge "2 mensajes" estático e inconsistente** [ux] | low | Quitar literal; dejar `navBadge` derivar el conteo real y recalcular al leer. | S |

---

## 6. Producto (PM)

| Hallazgo | Severidad | Recomendación | Esfuerzo |
|---|---|---|---|
| **Roster del coach partido en dos tablas** [power-user, ux]. "Seguimiento del grupo" (read-only KPIs) y "Participantes" (acciones) en pantallas distintas, cada una con su buscador/filtro. Ver el dato y actuar requiere dos pantallas. | high | Una sola tabla "Mis alumnos": KPIs + acciones por fila (kebab Adjudicar/Evaluar/Calificar/Mensaje). Un buscador, un filtro, una fuente de verdad. | M |
| **Adjudicar y Evaluar skills son dos modales para una ronda** [power-user]. Dos caminos escriben al mismo `StudentSkill` (nudge del ballot vs set directo) sin que uno vea al otro → dos fuentes de verdad. | medium | La rúbrica de la ronda es la fuente primaria (ya nudgea); "Evaluar" pasa a override de calibración explícito mostrando el valor derivado del ballot. | M |
| **El menor se registra sin paso de tutor** [first-time-user]. El copy promete "uso con tutor" pero ningún paso lo materializa. | medium | Si declara ser menor, pedir email del tutor para invitación/consentimiento o estado "pendiente de tutor"; CTA "Invita a tu padre" en el Home del menor. | M |
| **Eventos/torneos no escalan** [power-user]. Inscripción fila-por-fila, sin lote ni vista de jornada/bracket. | medium | Vista de torneo: inscribir en lote, generar bracket, adjudicar rondas desde una pantalla; conecta con el endpoint batch de `/api/debates`. | XL |

---

## 7. Negocio & monetización

| Hallazgo | Severidad | Recomendación | Esfuerzo |
|---|---|---|---|
| **Se regala el moat, se cobra el commodity** [business]. El Lifetime Profile (sharing/credenciales/radar) es gratis; el único gate es la tabla de stats —lo menos valioso emocionalmente para un teen. | high | Perfil visible gratis (es el gancho); gatear las expresiones premium: badge verificado, slug público vanity, certificado/transcript PDF, quitar "provisional" prioritario. Free muestra; Pro **prueba y comparte**. | M |
| **El padre es el pagador pero Pro se le vende al teen** [business]. El portal de familia enruta al mismo copy de estatus juvenil; nunca se construye la superficie de "proof" como producto pagado. | high | Camino de upgrade para padres: gatear el reporte mensual (PDF/email), perfil verificado y certificados con lenguaje de outcome ("prueba lista para admisiones"). Tier padre $15-19 con report + 1 crédito de coaching. | M |
| **Take-rate hardcodeado al 18%; coaches sin monetización** [business]. Sin tarifa por coach, sin dashboard de payouts, sin featured/subscripción de leads. | high | Hacer take-rate configurable/per-coach; tier "OTR Coach Pro" (18%→12% + featured + badge) = ingreso B2B recurrente que **crece la oferta**; promover introVideo al grid; dashboard de earnings con los agregados de escrow ya computados. | L |
| **Sin trigger free→Pro en el momento de deseo** [business]. Único upsell = strip pasivo en Leaderboard. | medium | 2-3 paywalls contextuales sobre features construidas: descarga de certificado, share de perfil, confirmación de booking; trial de 7 días en primer cert. Medir cada trigger. | M |
| **Certificados y torneos = ingresos sin monetizar** [business]. Cert gratis a 100% sin verify; torneos sin entry-fee. | medium | SKU de credencial verificada pagada ($5-15) con página `/verify/{id}` (loop viral de adquisición); torneos premium/sponsored con entry-fee (rails de escrow ya existen). | L |
| **Sin maquinaria de retención/winback** [business, automation]. "Streak protection" prometido pero no construido; lapso no monetizado. | medium | Streak-freeze real Pro (server-enforced); winback por notificación al detectar lapso; instrumentar funnel de activación (signup→1ª lección→1er cert→1ª reserva). | M |

---

## 8. Performance

| Hallazgo | Severidad | Recomendación | Esfuerzo |
|---|---|---|---|
| **`getAppData` re-descarga TODA la app en cada refresh suave** [power-user, performance, architecture]. Marcar una lección re-corre ~58 queries y re-serializa marketplace+lifetime+parent+roster. **(El hallazgo más confirmado del informe: 3 boards.)** | high/critical | Update local optimista de la entidad afectada (patrón ya usado en mark-lesson-done/notificaciones); `/api/app-data` acepta parámetro `scope`; reservar el re-fetch total para cambios estructurales. | L |
| **`getAppData` over-fetch de `contentHtml` completo de cada lección en cada carga** [performance]. Cientos de KB de cuerpos HTML que nunca se renderizan en dashboard/listas. | high | Quitar `contentHtml`/`contentHtmlEn` del shape masivo; lazy-load vía `GET /api/lessons/[id]` al abrir. | M |
| **Sin índice en `User.debateRating`** [performance]. Leaderboard = full-scan+sort en cada carga (no solo en su pantalla). | high | `@@index([leaderboardOptIn, debateRating])`; computar leaderboard solo en su ruta. | S |
| **Sin índice en `EscrowTxn.status`** [performance]. 3 agregados de earnings escanean todo el escrow en cada carga de coach. | medium | `@@index([status])`; opcional denormalizar `coachId`. | S |
| **Sin code-splitting: 24 pantallas en un bundle ~206KB** [performance, devex, architecture]. Un alumno baja admin/teacher/coachwork/parent. | medium | Dynamic-import por rol; los string-templates con shape `{render,mount}` permiten registry lazy de bajo riesgo. | M |
| **Waterfall secuencial en `getAppData`** [performance]. ~8 etapas; dos `groupBy` sueltos entre bloques paralelos. | medium | Fundir `reviewAgg`/`reviewByCourseAgg` en wave-1; colapsar 8 etapas hacia 3-4. | M |
| **`force-dynamic`+`no-store` re-consulta reference data invariante** [performance]. levels/badges/competencies idénticos para todos en cada request. | low | `unstable_cache`/memo con TTL keyed by lang. | S |
| **Notificaciones `take:200` filtradas en JS** [performance]. Trae 200 filas (de otros usuarios) para descartar. | low | `where:{OR:[{userId:me.id},{userId:null}]}` usando el índice existente. | S |

---

## 9. Automatización

| Hallazgo | Severidad | Recomendación | Esfuerzo |
|---|---|---|---|
| **Adjudicar 20 rondas = 20 modales, sin lote ni "guardar y siguiente"** [power-user]. Cada fila → modal → 1 POST → re-fetch total. Oponente texto libre re-tecleado; rúbrica arranca en "7" fijo → datos sucios. | critical | "Adjudicar jornada" con tabla inline + POST batch; "Guardar y siguiente" + ⌘Enter; prefill de Evento/Formato; oponente = combobox sobre roster; rúbrica sin default numérico; endpoint `/api/debates` que acepte array. | L |
| **Reporte mensual a padres nunca se envía** [automation]. El "arma de retención" del PRD está escrita pero `sendMail` no se invoca. | high | Cron mensual que itere Guardianships ACTIVE, reúse el composer y `mail.ts`; opt-in en Settings. IA: narrativa personalizada de 2 frases. | M |
| **Ciclo de booking 100% manual, cero notificaciones** [automation]. Padre nunca avisado de aprobación pendiente; escrow solo libera si el coach pulsa "complete" → coach no cobra. | high | Notificación+email en cada transición vía `notify()`; sweep nocturno que auto-complete (o avise) bookings CONFIRMED pasados; recordatorio 24h. | M |
| **Calificar entregas: lote serializado que congela la UI** [power-user]. `for...of await` uno por uno; catch vacío traga fallos. | high | `Promise.allSettled`/endpoint bulk; progreso N/total; reintento de fallidos; update local. | M |
| **Sin command palette ni atajos** [power-user]. Todo mouse a través de tabs anidados; el power-user no va más rápido que un novato. | high | ⌘K con acciones; ⌘Enter guardar en modales (engancha en `onModalKey`); j/k entre filas; number-key entre sub-tabs. | L |
| **RD de Glicko-2 nunca decae** [automation]. Jugadores inactivos mantienen rating falsamente confiado y dominan el leaderboard. | medium | Cron semanal que aplique el paso de inflación de RD por inactividad (la matemática ya está en `glicko2.ts`); recomputar `provisional`. | M |
| **Torneos sin recordatorios** [automation]. Registro no genera ni ActivityEvent; no-shows por olvido. | medium | Confirmación + recordatorio 24h/1h; mismo sweep que escanea `Booking.slotAt` y `Tournament.startsAt`. | S |
| **Sin nudge de re-engagement** [automation]. `computeStreak` ya detecta lapsos; nada actúa. | medium | Job diario que avise streak-a-punto-de-romperse / 7+ días inactivo; plegar en el mismo pase que computa riesgo del coach. | M |
| **Webhook Stripe solo maneja checkout one-time** [automation]. Sin subscription/dunning lifecycle para Pro. | medium | Antes de billing real: manejar `subscription.*`, `invoice.payment_failed` (dunning), `invoice.paid`; entitlement 100% webhook-driven. | M |

---

## 10. Oportunidades de IA (apuestas transformadoras)

| Apuesta | Severidad/valor | Recomendación | Esfuerzo |
|---|---|---|---|
| **Sparring con IA = el verdadero moat de Pro** [ai]. La pestaña Práctica vacía debería ser un oponente LLM: el alumno elige resolución+lado, la IA debate el lado opuesto en estructura PF/LD (texto→voz vía TTS+MediaRecorder ya existente), cierra con auto-ballot sobre la rúbrica real. | high | Gatear volumen por tier (free: pocas rondas/sem; Pro: ilimitado) → hace VERDADERA la promesa "práctica ilimitada". Es la apuesta insignia; todo lo demás compone sobre ella. | XL |
| **Ballot asistido por IA** [ai, automation]. Cuando hay `recordingUrl`, transcribir y pre-rellenar las 5 rúbricas + comentarios como DRAFT que el coach edita y firma. Adjudicar de ~20 min → ~2 min. | high | El humano sigue siendo el adjudicador (preserva la garantía anti-gaming); sube el throughput del coach = más GMV y más rondas adjudicadas. | L |
| **Feedback de IA instantáneo en cada entrega** [ai]. El alumno ya graba audio; entre grabar y la nota humana hay cero feedback. | high | Pasada LLM que puntúe la rúbrica visible + 2-3 fixes con timestamps, distinta de la nota oficial del coach. Loop de engagement + upsell Pro. | L |
| **Copilot del Skill Graph "tu siguiente paso"** [ai]. El graph se computa pero nunca prescribe; re-truthea la promesa "ve dónde ganar puntos" que Analytics eliminado dejó falsa. | medium | Card personalizada desde el skill más débil + ballots recientes → 1 recomendación concreta que enlaza a drill/sparring/marketplace. | M |
| **Generador de casos/contenciones + quizzes** [ai]. Drills vacíos; coaches suben todo a mano. | medium | "Genera tu caso" (resolución+lado→contenciones/rebuttals); botón "Generar con IA" en quiz builder desde `contentHtml`. Llena la pestaña drills con contenido infinito. | M |
| **Matching semántico de coaches** [ai]. Hoy substring matching; señales (skill graph, tier, idioma) sin usar. | medium | Búsqueda en lenguaje natural + rail "Recomendados para ti" rankeando contra el skill graph del alumno. Bajo riesgo (sin generación en flujo de menor). | M |
| **Capa de moderación/seguridad IA** [ai, security]. Producto de menores con texto+voz libres y features generativas planeadas, sin screening automático. | high | **Dependencia bloqueante** de cualquier feature generativa hacia menores: clasificar mensajes/transcripciones/reviews, system prompts apropiados a edad, output moderation, auto-flag a la cola de admin. | L |

---

## 11. Seguridad

| Hallazgo | Severidad | Recomendación | Esfuerzo |
|---|---|---|---|
| **Tutela auto-activada sin verificación** [security] — *ver §3 P0* | critical | PENDING + verificación out-of-band para menores. | M |
| **IDOR: cualquier TEACHER muta cualquier consultation** [security]. `updateMany({where:{id}})` sin filtro de propiedad; PII de leads. Única ruta de escritura que rompe el patrón de ownership del codebase. | high | Check de ownership/asignación antes del update; o restringir a ADMIN; gatear PATCH tras el mismo flag `CONSULTA`. | S |
| **`/api/*` devuelve texto de usuario sin escapar** [security, devex]. `review.body`/nombres crudos violan el contrato de escape; XSS latente si un futuro renderer hace innerHTML sin re-escapar. | medium | Decidir un único boundary de escape y enforcement por lint/grep en CI (`review.body/.name`→innerHTML sin esc). | S |
| **Reports aceptan `targetId` arbitrario que dirige suspensiones de admin** [security]. Sin validación ni rate-limit; flood + suspensión socialmente inducida. | medium | Validar `targetType+targetId` en creación; rate-limit; confirmación de identidad en el PATCH suspend. | M |
| **CSP `unsafe-inline` para scripts = único amplificador estructural de XSS** [security]. El escape es la ÚNICA defensa; sin backstop. | medium | CSP basada en nonce; la delegación por `data-*` ya elimina onclick inline → strict CSP factible sin rewrite. | L |
| **Autorización fragmentada: 47/54 rutas con checks inline** [security, devex, architecture]. **(Confirmado por 3 boards.)** Solo 3 helpers en `authz.ts`; relaciones coach↔alumno/padre↔hijo ad-hoc. | high | Capa central `requireUser(req,{role?,owns?,relation?})`; expandir `authz.ts` a todas las relaciones del dominio; tests de 403 cross-tenant. | L |
| **Rate-limit en memoria + sesiones sin revocación** [security, architecture]. Se multiplica por N en cluster; cookie filtrada válida 30 días. | low | Adaptador Redis tras la misma firma al escalar; acortar maxAge/idle timeout para coach/admin/parent. | M |

---

## 12. Accesibilidad

| Hallazgo | Severidad | Recomendación | Esfuerzo |
|---|---|---|---|
| **Verde de marca falla contraste AA como texto** [accessibility]. `#2CAA20` = 3.05:1; afecta `.eyebrow` (~70×), `.badge-count`, 11 inline. El token AA-safe `#176B11` ya existe pero no está cableado. | high | Un swap de token arregla ~80 instancias; `#2CAA20` solo para fills/borders/texto ≥18.66px. | S |
| **Botones icon-only con `title` pero sin `aria-label`** [accessibility]. El coach con lector oye "button…button…"; delete indistinguible de duplicate. | high | `aria-label` en cada botón icon-only + SVGs `aria-hidden`; helper compartido. | M |
| **Patrón clickable-card operable solo en algunas pantallas** [accessibility]. `scr-hub`/`scr-extra` sin `role=button`/`tabindex` → unreachable por teclado. | high | Auditar todo `tile click`/`cursor:pointer` div; `role=button tabindex=0`+`aria-label` o convertir a `<a>/<button>`. | M |
| **Sin `<h1>` en 2 pantallas; `.page-title` en `<div>` rompe el outline** [accessibility]. | medium | Un `<h1>` por ruta; `.page-title` siempre en heading real; helper `pageTitle()`. | M |
| **Sub-tabs sin semántica de tabs; estado solo por color** [accessibility]. | medium | `role=tablist/tab` + `aria-selected` + `aria-controls`; "Ver todos" de `<a href=#>` a `<button>`. | M |
| **Drawer móvil no oculta contenido de AT; sin skip link** [accessibility]. | medium | Skip link; `inert`/`aria-hidden` en sidebar cerrado y en `.main` con drawer abierto + focus-trap. | M |
| **Targets <24px (WCAG 2.5.8)** [accessibility]. Toggle ES/EN, checkboxes de grading 16px. | low | ≥24px efectivo (≥44 para touch primario). | S |
| **Lección bloqueada solo por glifo, sin estado programático** [accessibility]. | low | `aria-disabled` + sr-only con condición de desbloqueo; lock SVG `aria-hidden`. | S |

---

## 13. Mobile

| Hallazgo | Severidad | Recomendación | Esfuerzo |
|---|---|---|---|
| **Modal de adjudicación inalcanzable** [mobile] — *ver §3 P0* | critical | Enrutar por `is-drawer`. | S |
| **Inputs 13.5px → iOS auto-zoom en cada focus** [mobile]. | high | `@media(max-width:760px){.input,.select,.textarea{font-size:16px}}`; NO usar `maximum-scale=1`. | S |
| **Safe-area inset es código muerto sin `viewport-fit=cover`** [mobile]. Tabbar bajo el home indicator. | high | `export const viewport={...viewportFit:'cover'}`; cero CSS. | S |
| **Targets primarios 28-30px <44px** [mobile]. `.btn-sm`/`.chip`/icon-buttons; fila Participantes cruje 3 controles. | high | Floor móvil 40px; colapsar la fila de 3 acciones a "Adjudicar" full-width + overflow. | M |
| **KPI cards apilados comen ~300px** [ux, mobile]. Debate Hub abre con muro de stats antes de cualquier acción. | medium | 2-up grid o chips horizontales con clase `.kpi-row` opt-in; reducir rating a ~44px en móvil. | S-M |
| **Tablas solo scroll-x, sin transform a card** [mobile]. Coach pierde la columna nombre al scrollear el roster. | medium | Transform a stacked cards; interim: primera columna `position:sticky`. | L |
| **Topbar coach abarrotado en 375px** [mobile]. | low | Mover ES/EN al drawer; "Crear" a icono. | S |
| **Sub-tab strips sin afford de scroll** [mobile]. Leaderboard puede quedar clipeado sin señal. | low | Fade-out gradient + `scroll-snap`. | S |
| **Coach ve "Coaches" en drawer/tabbar admin** [mobile, ux] — *ver §5* | low | Auditar NAV/TABBAR por rol. | S |

---

## 14. Deuda técnica & Arquitectura

| Hallazgo | Severidad | Recomendación | Esfuerzo |
|---|---|---|---|
| **`getAppData` = god-function ~1.464-1.626 líneas, ~58 queries, todos los roles, cada carga Y cada refresh** [architecture, devex, power-user, performance]. **(El hallazgo de mayor consenso y mayor ROI del informe — 4 boards.)** Es el techo de escala real, muy por debajo de los 3.000 usuarios que ADR-0001 promete. | critical | Descomponer en loaders por dominio (`getLearnData`/`getDebateData`/…) con fachada delgada; `/api/app-data` acepta `scope`; refresh suave carga solo el dominio actual. | L |
| **Doble schema Prisma sincronizado a mano** [architecture]. Drift trap de fallo silencioso (constraint en un entorno, no en otro). | medium | Single source = solo Postgres; dev levanta Postgres en Docker Compose; eliminar copia en CI. (DEV-1 ya identificado.) | S |
| **Pagos/escrow simulado entrelazado con CRUD de booking** [architecture]. Donde nacen bugs de doble cobro cuando entre Stripe Connect. | medium | Extraer `lib/payments` (`holdEscrow`/`releaseEscrow`/`computePayout`) con la misma firma que mañana llama a Stripe — patrón ya logrado en `glicko2.ts`/`video.ts`. | M |
| **Contrato implícito scr-*.ts ↔ payload de queries.ts** [architecture, devex]. Sin tipo compartido; rename de clave = break en runtime sin aviso de build. | medium | `app-data.types.ts` exporta slices tipados; tipar el return de `getAppData`; cast tipado en el punto de lectura. Prerrequisito de bajo coste para descomponer `getAppData`. | M |
| **Cero type-safety en UI (`@ts-nocheck` ×21) + 4 tests solo de leaf utils** [devex]. queries.ts y los 54 handlers sin cobertura. | high | Tests de integración de rutas+`authz.ts` primero; pelar `@ts-nocheck` de los scr más pequeños tipando `window.DB` como `AppData`. | L |
| **Aula.tsx = 1 componente de 1.061 líneas con 1 useEffect de 1.037** [devex]. Chokepoint de merge; switch de delegación de 30+ ramas. | high | Extraer tabla de delegación a `actions: Record<string,fn>`; modal builders a `lib/modals/*.ts` con ctx explícito. | L |
| **~23 globals `window.__*` sin tipos = state machine implícita** [devex]. Bleed de estado entre navegaciones. | medium | Centralizar en `window.__OTR` tipado / `ui-state.ts` con getters/setters. | M |
| **i18n a medio migrar; literales ES hardcodeados fuera de `t()`** [devex]. `lang=en` deja Spanglish → bloquea launch US. | medium | Lint que falle CI ante literales ES sin `t()`; barrer toast-strings de Aula.tsx primero. | M |
| **Contrato de escape sin enforcement** [devex, security]. `@ts-nocheck` deja pasar interpolaciones erróneas. | medium | Tipo branded `Safe` o helper `html\`\`` que escape por defecto con `raw()` opt-out. | M |
| **README documenta un prototipo muerto + ~2.430 LOC legacy git-tracked** [devex]. Búsquedas devuelven falsos positivos live/dead. | high | Reescribir README al stack real; borrar app vanilla root + `_incoming/`. | S |
| **Sin ESLint config + 5.1MB de binarios de arquitectura por commitear** [devex]. | low | ESLint real (`next/core-web-vitals` + no-floating-promises); `.gitignore` para `docs/architecture/*.{docx,pdf,html}`. | S |
| **Rate-limit in-memory + Prisma singleton sin pooling** [architecture, security]. La promesa "drop-in a cluster" del ADR es optimista. | high | Adaptador Redis tras misma firma; documentar que cluster ⇒ Redis + PgBouncer; ampliar rate-limit a checkout/bookings/uploads/debates (hoy 4/54). | M |
| **CI/CD pull-cron con ~10-15s downtime + SPOF de 1 VPS** [architecture]. Correcto para staging; deuda declarada para prod. | low | No actuar ahora; gate de prod: health-gated swap + réplica/backup-restore. | M |

---

## 15. Plan de acción priorizado

| # | Acción | Impacto | Esfuerzo | Prioridad | Boards |
|---|---|---|---|---|---|
| 1 | Cerrar tutela auto-activada sin verificación (PENDING+verify para menores) | Existencial (seguridad/legal) | M | **P0** | security |
| 2 | Reescribir copy de Pro a lo construido + marcar futuro "Próximamente" | Alto (confianza/conversión) | S | **P0** | first-time-user, ux, business |
| 3 | Adjudicación móvil por `is-drawer` (Publicar alcanzable) | Alto (acción núcleo) | S | **P0** | mobile |
| 4 | Job nocturno `computeRiskScores` (señal de riesgo real) | Alto (retención marketplace) | M | **P0** | automation |
| 5 | `viewport-fit=cover` + inputs 16px móvil | Alto (cada sesión móvil) | S | **P0** | mobile |
| 6 | Refresh suave con `scope` (no re-descargar toda la app) | Alto (escala + percepción) | L | **P1** | power-user, performance, architecture |
| 7 | CTA del Home del debutante → acción completable hoy | Alto (activación D1) | S | **P1** | first-time-user, ux |
| 8 | Conectar UNA suscripción Stripe real (test) + default anual + instrumentar | Alto (aprendizaje monetización) | M | **P1** | business, automation |
| 9 | Re-gate del paywall al perfil verificado/cert/sharing | Alto (captura de valor) | M | **P1** | business |
| 10 | Capa central de autorización `requireUser()` + tests cross-tenant | Alto (seguridad/onboarding) | L | **P1** | security, devex, architecture |
| 11 | IDOR consultations + escape `/api/*` + rate-limit reports | Medio-alto | S-M | **P1** | security |
| 12 | Token de texto verde AA-safe (~80 fixes) | Alto (legal US/menores) | S | **P1** | accessibility |
| 13 | Adjudicación batch + "guardar y siguiente" + oponente combobox + rúbrica sin default | Alto (throughput coach) | L | **P1** | power-user |
| 14 | Cron reporte mensual a padres + notificaciones de booking + winback | Alto (retención B2C) | M | **P1** | automation |
| 15 | Fusionar roster del coach en una tabla "Mis alumnos" | Medio-alto | M | **P1** | power-user, ux |
| 16 | Índices `User.debateRating` / `EscrowTxn.status` + strip de `contentHtml` | Medio-alto | S-M | **P2** | performance |
| 17 | Sparring con IA (pestaña Práctica) | Transformador | XL | **P2** | ai |
| 18 | Ballot asistido por IA desde recording | Transformador | L | **P2** | ai, automation |
| 19 | Descomponer `getAppData` en loaders por dominio + tipos compartidos | Alto (escala+dev) | L | **P2** | architecture, devex |
| 20 | Code-split por rol + capa de moderación IA (gating de features generativas) | Medio-alto | M-L | **P2** | performance, ai, security |
| 21 | A11y: aria-labels icon-only, cards operables, headings, tab semantics | Medio | M | **P2** | accessibility |
| 22 | Glitch de hora, badge "2", video en coachCard, eyebrows, nav coach | Medio | S | **P2** | ux, mobile |
| 23 | Single source Prisma (Postgres+Docker), `lib/payments`, command palette, code-split, README/dead-code | Medio | S-L | **P3** | architecture, devex, power-user |
| 24 | Decay de RD Glicko, recordatorios torneos, dunning Stripe webhook, retention winback | Medio | M | **P3** | automation |

---

## 16. Roadmap sugerido

### Ahora (próximas 2 semanas — confianza, seguridad, no-regret)
- **Seguridad:** tutela PENDING+verify (#1), IDOR consultations + escape `/api/*` + rate-limit reports (#11).
- **Verdad del producto:** reescribir copy de Pro (#2); CTA del Home del debutante (#7); arreglar glitch de hora, badge "2", nav del coach, video en coachCard (#22).
- **Móvil no-regret:** adjudicación por drawer (#3), `viewport-fit=cover`+inputs 16px (#5).
- **A11y barata:** token verde AA-safe (#12).
- **Datos reales:** `computeRiskScores` nocturno (#4); índices DB (#16).

### Próximo (4-8 semanas — monetización real, throughput del coach, escala)
- Stripe real + default anual + instrumentación (#8); re-gate del paywall a proof/sharing (#9); paywalls contextuales + trial.
- Capa central de autorización + tests (#10).
- Refresh con `scope` (#6); strip de `contentHtml` (#16).
- Adjudicación batch + roster fusionado (#13, #15).
- Cron de reporte a padres + notificaciones de booking + winback (#14).

### Después (trimestre — moat de IA y deuda estructural)
- **Sparring con IA** (#17) + **ballot asistido** (#18) + feedback instantáneo, todos detrás de la **capa de moderación IA** (#20) como dependencia bloqueante.
- Descomponer `getAppData` + tipos compartidos (#19); code-split por rol; `lib/payments`; single-source Prisma; command palette.
- Tier "OTR Coach Pro" (take-rate variable + featured), credenciales verificadas pagadas, torneos premium.
- Decay de RD Glicko, dunning webhook, table→card móvil (#24).

---

## 17. Apuestas de producto (features futuras transformadoras)

1. **Sparring de IA — el gimnasio de debate diario.** Es la diferencia entre un sitio de contenido y un producto con loop de hábito diario. El alumno elige resolución y lado; la IA debate el opuesto en estructura PF/LD (texto→voz), y cierra con un auto-ballot sobre la misma rúbrica que usa el coach. Gatear el volumen por tier hace *verdadera* la promesa "práctica ilimitada" de Pro. **Es la apuesta de la que todo lo demás compone.**

2. **Ballot asistido por IA — desbloquea la oferta del marketplace.** El throughput del coach es la restricción de toda la economía (rating + GMV). Transcribir el `recordingUrl` y pre-rellenar las 5 rúbricas + comentarios como DRAFT firmable baja la adjudicación de ~20 a ~2 min, preserva la garantía humana anti-gaming, y se vende como diferenciador Pro/Elite ("ballots asistidos por IA").

3. **Copilot de progreso (Skill Graph prescriptivo) — re-truthea la promesa Pro.** El graph ya se computa pero solo decora; un "tu siguiente paso" personalizado (skill más débil + ballots recientes → 1 recomendación que enlaza a drill/sparring/coach) cierra honestamente la promesa "ve dónde ganar puntos" que la eliminación de Analytics dejó falsa, y cose el flywheel recomendar→practicar→re-medir.

4. **"Proof Plan" para padres — el SKU de mayor conversión.** En 12-17 el padre tiene la tarjeta. Reporte mensual con narrativa de IA, perfil verificado, certificado/transcript "listo para admisiones" y crédito de coaching incluido, a $15-19. Monetiza el outcome, no la feature, y construye la superficie de proof que el código ya tiene a medias.

5. **Credenciales verificadas + torneos premium con loop viral.** Certificado pagado con página pública `/verify/{id}` que el teen comparte (adquisición viral) y torneos con entry-fee sobre los rails de escrow ya existentes — ingreso transaccional independiente de la suscripción que sube el ARPU y alimenta el motor de estatus.

---

# Anexo — Boards UI + PM (relleno; fallaron en la corrida principal por el cap del schema)

## Board UI (refuerzo)
- **levelBadge falla contraste AA** (`components.ts:18`): texto `--lvl-*` sobre fondo casi blanco (~2.3–3.0:1), y se muestra en el hero del Home. Usar tokens `*-text` oscuros. **high · S**
- **Root cause del glitch "12:23 AM"**: `queries.ts:108` usa `getHours()` crudo (TZ del servidor); `consultations.ts:71` sí usa TZ fija (America/Santo_Domingo). Delegar `eventDateLabel` en `dateLabel`/`timeLabel`. **high · S**
- **El verde de marca es plano**: `.badge.sky--alive` (`app.css:204`, gradiente con profundidad) existe pero solo en micro-badges; los heroes son negro→negro. Introducir una superficie verde saturada para logro/racha/win. **high · M**
- **Sin motion celebratorio**: la gamificación es estática (solo `fade-up`). Pulse/pop al ganar, subir de rank o extender racha (respetar `prefers-reduced-motion`). **medium · M**
- **3 patrones de pastilla compiten** (badge/chip/tag-soft/seg) + ~141 estilos inline en `scr-core.ts` → ritmo vertical irregular entre cards. Documentar semántica + estandarizar spacing. **medium · M–L**
- **Alias legacy `--otr-navy`/`--otr-sky`** (= negro/verde) esconden la intención de color y arriesgan reintroducir azul por accidente. Migrar gradualmente y retirar. **low · L**

## Board PM (refuerzo)
- **[CRÍTICO] El CTA de activación del Home está roto**: "Practica tu primer debate" (`scr-core.ts:119`) cae en la pestaña Práctica, que es placeholder de drills + finder sin acción → el aha-moment del usuario nuevo muere el día 1. Apuntar el CTA a una acción completable (reservar coach / primera lección). **critical · M**
- **"Encuentra rival" es ventana, no puerta**: calcula rivales (±120) pero sin acción (solo "Ver leaderboard"). Conectar a "pídele a tu coach un duelo con X" o eliminar. **high · S/M**
- **Adjudicación = 8 rondas → 8 modales**: sin "guardar y siguiente" ni lote, siendo el input del que depende todo el rating/leaderboard/engagement. Flujo por sesión con pairings. **high · M/L**
- **Sin loop diario**: la racha existe y Pro la "protege", pero nada trae al alumno de vuelta. Añadir un hook diario self-serve (drill del día / repasa tu último ballot). **high · M**
- **El Hub del alumno es 100% pasivo**: debate-first sin agencia del debatiente. Dar 1 acción propia (reaccionar al ballot, fijar meta, pedir ronda). **medium · M**
- **Qué cortar sin que nadie lo extrañe**: card de drills "próximamente", finder sin acción, y la estructura `analytics` muerta aún fetcheada (`scr-debate.ts:52`). **low · S**

---
*Generado por la corrida de review autónoma (14 boards · 103+ hallazgos). Inspección en vivo: 9 capturas, alumna + coach, 0 errores de consola.*
