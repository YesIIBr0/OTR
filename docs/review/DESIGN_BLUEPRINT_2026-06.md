# OTR Aula — Product Redesign Blueprint (Elite Design Review Board)

> Síntesis presidencial de 63 hallazgos de diseño (5 boards: visual-system, type-space, a11y-hf, copy-voice, conversion) integrados con los 103 hallazgos de producto del `docs/review/PRODUCT_REVIEW_2026-06.md`. Esta es la **capa de DISEÑO**: profundiza, deduplica y prioriza. No repite verboso lo ya documentado; lo eleva a sistema accionable.

---

## 1. Veredicto del board

OTR Aula **no se siente world-class todavía**, y la razón es estructural, no cosmética: existe un design system completo (`tokens.css`) que **las pantallas ignoran masivamente** — 871 valores de spacing crudos vs 3 usos de `--s-*`, 480 `font-size` en px vs 3 usos de `--fs-*`. El sistema es decorativo, no normativo, así que el ojo detecta micro-inconsistencias de medio pixel en cada pantalla y el producto "parece plantilla" aunque el Debate Hub demuestre que el equipo SÍ sabe hacer premium. La segunda herida es de **honestidad de producto**: el único plan monetizado (Pro $9) vende "Analytics completo" y "drills ilimitados" — ambos vaporware navegable — y el CTA de activación del Home aterriza en una pantalla vacía ("Drills en camino"); se promete arena y se entrega sala de espera, justo en los momentos que más valen (pagar, activar). La tercera es **accesibilidad de cumplimiento**: con público MENOR de edad en RD+US, la navegación SPA no mueve foco ni anuncia cambios de pantalla, el `levelBadge` falla AA en 4 de 5 tiers, no hay `<main>` ni skip-link — fallos binarios que un distrito escolar US rechaza en auditoría.

**Las 3 palancas de mayor ROI:** (1) **Enforcement del design system** — capa de utilidades sobre tokens + lint en CI que prohíba px/hex inline; convierte "plantilla" en "producto cohesionado". (2) **Cerrar el gap promesa↔producto** — alinear copy de Pro con lo que existe, redirigir el CTA de activación a una acción real, y construir el sparring IA que hace real "drills ilimitados" y da el loop diario que falta. (3) **A11y estructural de un solo sitio** — foco en navegación + `<main>` + skip-link + h1 garantizado + `levelBadge` AA, casi todo centralizable en `Aula.tsx`/shell por bajo costo.

---

## 2. Los 10 hallazgos que importan

| # | Hallazgo | Categoría | Impacto | Esfuerzo | ROI | Boards |
|---|----------|-----------|---------|----------|-----|--------|
| 1 | Design system ignorado: 871 spacing crudos + 480 font-size px vs ~3 usos de tokens; sin enforcement | DS / Type-Space | 🔴 Crítico | XL | ★★★★★ | visual-system, type-space (×2) |
| 2 | Pro vende vaporware navegable (Analytics eliminado + Drills placeholder) — en copy y en card | Producto / Copy | 🔴 Crítico | S→M | ★★★★★ | conversion, copy-voice (×3) |
| 3 | CTA de activación del Home aterriza en pantalla vacía ("Drills en camino") | UX / Conversión | 🔴 Crítico | S | ★★★★★ | conversion, copy-voice |
| 4 | Navegación SPA no mueve foco ni anuncia cambio de pantalla (sin `<main>`/skip-link/h1) | A11y | 🔴 Crítico | S | ★★★★★ | a11y-hf (×3) |
| 5 | Torneo visible en el Hub sin botón "Inscribirme" (vive solo en Eventos) | Conversión | 🔴 Crítico | S | ★★★★★ | conversion |
| 6 | 4 KPI tiles idénticos en Home: vanity, dashboard B2B, KPI 33px aplasta al CTA | UI / IA / Type | 🟠 Alto | S→M | ★★★★★ | visual-system, type-space, conversion |
| 7 | `levelBadge` + eyebrow verde + q-num: contraste 2.0–3.0:1, fallan AA (público menor) | A11y | 🟠 Alto | S | ★★★★★ | a11y-hf (×2) |
| 8 | Cero sparring/feedback IA + cero copiloto de ballot: el loop entero depende de un humano | Automatización / IA | 🟠 Alto | XL | ★★★★ | conversion (×3) |
| 9 | Verde semánticamente sobrecargado (badge 43×, eyebrow 70×) — diluye el verde de acción | DS / Color | 🟠 Alto | M | ★★★★ | visual-system (×2), copy-voice |
| 10 | Heroes y pricing cards copiados, no componetizados (3 estructuras de plan, 5 heroes ad-hoc) | DS / UI | 🟠 Alto | L | ★★★★ | visual-system (×3) |

### Five-whys desplegado — los 4 críticos

**#1 — El design system es decorativo, no normativo**
1. ¿Por qué 871 spacing y 480 font-size crudos? Porque cada pantalla es un string-template con `@ts-nocheck` y estilo inline.
2. ¿Por qué inline y no clases? El patrón nació como prototipo HTML portado, sin capa de utilidades.
3. ¿Por qué nadie consume los tokens? `font-size:13.5px` es más rápido que recordar/teclear `var(--fs-13)`, y las variables no se autocompletan ni validan en strings.
4. ¿Por qué se permite? No hay enforcement (ni stylelint, ni grep en CI, ni set de utilidades obligatorio).
5. **Causa raíz:** se entregó CSS variables sin una **capa de utilidades/componentes que haga que NO usar el token sea el camino difícil**. Stripe/Linear no exponen el px; exponen tokens y componentes. Y el propio `CLAUDE.md` del repo lo exige: *enforcement determinista en hooks/CI, no en convención*.

**#2 — Pro vende lo que no se puede tocar**
1. ¿Por qué Pro vende Analytics/drills inexistentes? El copy se escribió cuando la pestaña Analytics existía y los drills eran roadmap.
2. ¿Por qué no se actualizó? El copy de pricing (`lifetime.ts:95-96`) y el código que entrega features (`scr-debate.ts`) viven en archivos distintos sin contrato.
3. ¿Por qué nadie lo detectó? No hay test que verifique que cada bullet de plan mapea a una capability/ruta real.
4. ¿Por qué se propagó? El mismo string erróneo alimenta el upsell Y la advertencia de downgrade (`memConfirmFreeBody`) — se asusta al usuario con perder algo que nunca existió.
5. **Causa raíz:** el pricing se trata como **marketing desacoplado del producto**; en freemium el pricing ES la promesa que la primera sesión Pro debe cumplir. "Parents pay for proof" (comentario propio de `scr-lifetime.ts:478`) — si el padre paga y no aparece, es reembolso + reseña negativa.

**#4 — La navegación es invisible para teclado y lector de pantalla**
1. ¿Por qué el foco no se mueve al navegar? `renderApp` (`Aula.tsx:52-73`) solo restaura foco en la rama `keepScroll`; la navegación real (`window.go → renderApp(r)`) no toca foco ni anuncia nada.
2. ¿Por qué solo en `keepScroll`? Se diseñó para mutaciones in-place (marcar lección); la navegación se trató como "página nueva" sin equivalente.
3. ¿Por qué no se trató la navegación? El modelo mental es "recargo HTML como MPA", pero un MPA recarga el documento (el navegador reposiciona foco y el SR anuncia el `<title>`); aquí es un `innerHTML` silencioso que el AT no detecta.
4. ¿Por qué no se detectó? Se validó con ratón/vista, no con teclado+SR.
5. **Causa raíz:** el contrato de "pantalla" se definió como **"string HTML que se inyecta", sin un paso post-render** que reasiente foco y notifique a la capa de accesibilidad. Falta un eslabón en el ciclo de vida de render. (0 ocurrencias de `aria-current`, `<main>`, `document.title=` o focus-en-navegación en todo `app/`.)

**#5 — La acción nace donde no se puede ejecutar**
1. ¿Por qué el torneo del Hub no tiene "Inscribirme"? La tarjeta `nextEventCard` (`scr-debate.ts:212-225`) se diseñó read-only.
2. ¿Por qué read-only? La inscripción se centralizó en Eventos para "no duplicar" (el comentario `scr-events.ts:4-5` dice "la inscripción vive en el Debate Hub" — pero ahí no existe).
3. ¿Por qué se centralizó así? "No duplicar la lógica" se confundió con "no exponer la acción en ningún otro punto de contacto".
4. ¿Por qué importa? El usuario ve el torneo en máxima intención (mirando su rating/forma) y debe abandonar la pantalla, recordar el nombre y buscarlo en Eventos.
5. **Causa raíz:** modelo mental "una pantalla = un dueño de la acción" en vez de **"la acción aparece donde nace la intención"**. La conversión exige el CTA en el punto de decisión, no en el directorio.

---

## 3. UX — problemas + fix, priorizados

| Prioridad | Problema | Fix | Archivo |
|-----------|----------|-----|---------|
| P0 | CTA primario de activación cae en empty-state (`__debateTab='practice'`) | Redirigir rama provisional a "Encuentra rival" (ya funciona) o reserva 1:1; nunca aterrizar en vacío | `scr-core.ts:122,327` |
| P0 | Torneo en Hub sin CTA de inscripción | Reusar handler idempotente `data-tn-register` inline en `nextEventCard` y Home | `scr-debate.ts:212`, `scr-events.ts:79` |
| P1 | Reserva de coach exige 3 decisiones manuales (slot nunca auto-llenado) | Smart defaults: paquete recomendado + día próximo + primer slot; botón activo de entrada + atajo "Reservar próximo hueco" | `scr-marketplace.ts:133,401` |
| P1 | Marketplace ordena por rating global, ignora "tu coach" del curso | Ranking personalizado: tu coach → tu formato/idioma/nivel → resto; fila sticky "Continúa con [coach]" | `scr-marketplace.ts:128,262` |
| P1 | Registro de torneo no muestra `entryLabel` (costo) antes de confirmar | Renderizar badge "Gratis"/"US$X"; paso ligero de confirmación si hay fee o es menor | `scr-events.ts:33` |
| P2 | Onboarding captura metas/pace que mueren en localStorage | Persistir en perfil (como teacher) y consumir en next-action, recomendaciones de curso/coach | `scr-hub.ts:312`, `scr-core.ts:189` |
| P2 | Dos onboardings (hub + placement) sin hilo común | Unificar en "arma tu ruta" donde cada respuesta cambia visiblemente lo siguiente | `scr-hub.ts`, `scr-placement.ts` |

---

## 4. UI / Sistema visual

**El problema central: hay primitivos para lo decorativo y vacíos para lo funcional.**

| Hallazgo | Fix |
|----------|-----|
| 3 estructuras de plan distintas (Free=`.tile`, Pro=`<div>` hand-rolled navy, Elite=`.tile` opacity) | Un solo `C.planCard({tier,price,features,featured,state})` con variantes `default/featured/disabled`. Badge "Recomendado" = **oro**, nunca verde de fondo (`scr-lifetime.ts:511-545`) |
| 5 heroes reusan `.hello-card` como fondo copiado, estructura interna divergente, márgenes 18/20px | `C.pageHero({eyebrow,title,sub,meta,action,accent})` con slots fijos y margen tokenizado |
| Toggle hand-rolled con ~12 estilos inline, repetido en 3 sitios | `C.toggle({on,label,id})` + `.switch` con estados on/off/disabled/focus tokenizados (`scr-lifetime.ts:371`) |
| 3 patrones de selección sin regla (`.tabs`/`.seg`/`.chip`), `coursesSubTabs` vs `subTabs` duplicados | Regla: `.tabs`=secciones · `.seg`=2-3 modos de una vista · `.chip`=filtros aditivos. Extraer `C.tabs()` compartido |
| Avatar navy/verde según capricho del call-site | Color derivado por hash del nombre; verde `sky-lo` reservado SOLO a "tú". `C.avatar(initials,{you})` |
| `.page-title` override a 6 tamaños (20/22/24/`--fs-20`/`--fs-28`); 72 `<b style=font-size>` como headings | Roles tipográficos: `.h-1/.h-2/.h-3/.text-body/.text-caption`. Un solo tamaño de `page-title`. Prohibir override inline |

**Completar el catálogo de primitivos:** `pageHero`, `planCard`, `tabs`, `toggle`, `segmented`, `stepper`, `iconBtn` — hoy faltan todos los controles que la app realmente usa.

---

## 5. Tipografía & Espaciado

**Diagnóstico cuantificado:** la escala de tokens está muerta (480 px crudos vs 3 tokens). El uso real son **9 tamaños apretados en la banda 11–15px con pasos de 0.5px** (12.5px ×92, 13.5px ×80, 214 medios-píxel) — ruido sub-perceptual que además emborrona el texto en mobile no-retina, justo el dispositivo del público.

| Acción | Detalle |
|--------|---------|
| **Colapsar a conjunto cerrado** | `.t-display/.t-h1/.t-h2/.t-h3/.t-body/.t-caption/.t-eyebrow/.t-num`, cada una encapsula size+line-height+weight+tracking. La banda 11-15 → **3 pasos**: 11 (caption), 13 (UI default), 15 (lead). Eliminar 11.5/12.5/13.5/14.5 |
| **Snapear spacing al 4pt** | 9→8, 10→8/12, 13→12, 18→16/20, 22→20/24, 23→24. Utilidades `.p-4/.gap-3/.mt-5` + componente `Stack` |
| **Pesos fantasma** | `font-weight:650/750` (×11) NO se cargan (`layout.tsx:19` solo 400-800). Cargar Inter **variable** (`wght@400..800`, una petición, pesa menos que 5 ejes) — un peso intermedio en H1 de perfil/cert SÍ aporta jerarquía premium. Test de CI que cruce `<link>` vs pesos usados |
| **Invertir jerarquía del Home** | KPI numeral 33px (`app.css:193`) aplasta `page-title` 24px y saludo 22px. Bajar KPI a 24-26px. El elemento más grande de Home debe ser la **acción**, no contar cursos. Reservar 33px+ para donde el número ES el héroe (rating 64px del Hub está bien) |
| **Tracking de caps** | 5 valores (.04–.12em) para el mismo gesto. Un solo `--track-caps` (~.08em) en toda clase uppercase |
| **line-height por rol** | `--lh-tight` 1.1 (display/num) · `--lh-ui` 1.3 (labels/botones) · `--lh-prose` 1.6-1.7. Eliminar los 46 parches inline; la UI de una línea no debe heredar el 1.45 de párrafo |
| **Mobile** | KPIs en grid 2×2 (`.grid.keep-2`), numeral 22-24px, padding 14px → de ~360px a ~160px de muro. La acción above-the-fold, no bajo un muro de métricas |

**Enforcement (CLAUDE.md lo exige):** grep en CI que falle si aparece `font-size:Npx`, `gap:Npx` no-múltiplo-de-4, o `font-weight:650/750`. El 480 baja a ~0.

---

## 6. Color · Marca · Diseño emocional

**El verde de marca está sobreusado como decoración y subusado como acción** — la queja confirmada por 3 boards.

| Problema | Fix |
|----------|-----|
| `.badge.sky` (verde) = "confirmado", "inscrito", "OTR", "ES/EN", "mes", "tú", contador — todo el mismo color (43×) | **Taxonomía de badge:** contadores/tags → gris neutro · idiomas → `.tag-soft` · estados → ok/warn/danger · logro/wins/certs → oro · identidad "tú" → `sky--alive` SOLO |
| Eyebrow verde en 70 cards (15 en Profile) — tic visual "plantilla" que diluye el verde de acción | Reducir a ~1 eyebrow/pantalla; si se conserva, color **neutro `--text-3`** para liberar el verde como señal de acción exclusiva |
| 51 hex hardcodeados (`#0C0C0C` tecleado en vez de `var(--otr-black)`); `rgba(234,242,251,.x)` repetido sin token | Tokens on-dark: `--on-navy-strong/--on-navy/--on-navy-soft`. Lint que prohíba hex en `scr-*.ts`. Empezar por lifetime/core/debate (50% de los casos) |
| Alias legacy `--otr-navy/--otr-sky` mienten (sky no es azul) y se propagan en código nuevo | Codemod a `--otr-black/--otr-green`, marcar alias `/* DEPRECATED */`, lint que avise en código nuevo |
| KPI de XP (logro) tratado igual que "Pendientes" (admin) — el número que debería enganchar se ahoga | Variantes: `kpi--hero` (XP/rating, oro, micro-sparkline/delta), `kpi--default`, `kpi--task`. En "arena", el número ES el trofeo (chess.com/Duolingo) |

---

## 7. Motion & Microinteracciones (delight)

El review previo ya marcó "sin motion celebratorio". La capa de diseño lo concreta:

- **Momentos de logro merecen motion:** entregar tarea, aprobar examen, inscribirse a torneo, reclamar certificado, **subir de tier**. Hoy un hito grande recibe un toast "Entregado" de una palabra. Definir una tier de animación de celebración (confeti contenido / pulso del badge de tier / delta de rating animado) reservada SOLO a hitos reales para que signifique algo.
- **Delta de rating animado** cuando se publica un ballot — cierra el loop dopaminérgico que hoy es estático.
- **Estados de control con foco y transición tokenizados** (el toggle, las tabs) en vez de los actuales hand-rolled inconsistentes.
- **Premium = motion con sentido, no flashy:** transición de foco al navegar (que además resuelve a11y), hover/active de cards con la misma curva, micro-sparkline en KPI hero.

---

## 8. Carga cognitiva & Arquitectura de información

| Hallazgo | Fix |
|----------|-----|
| 4 KPI tiles de igual peso roban foco al CTA (viola el propio PRD: "exactamente UNA acción siguiente obvia", `scr-core.ts:66`) | Reducir a 1-2 métricas que muevan comportamiento (racha en riesgo, XP al siguiente tier ya calculado en `scr-core.ts:309`); fundir el resto en hero/programas |
| "Debate Rank" del Home DUPLICA el Debate Hub | Eliminar la duplicación; el Home enlaza al Hub, no lo replica |
| Glicko-2 / RD crudos en la pantalla insignia para chavos de 12 | "Tu rating Glicko-2" → "Tu nivel competitivo"; "±112 RD" → "Confianza: alta / calibrando" con tooltip. El número técnico para quien lo busque |
| Jerga sin glosar: escrow, cohort, ballot, payout, briefs/drills, CWI | Mini-glosario + regla "primera mención se explica" (tooltip inline); usar equivalente ES donde exista |

---

## 9. Accesibilidad

**Riesgo de cumplimiento alto: público MENOR de edad en RD+US = exposición directa ADA/Sección 508/WCAG 2.1 AA.** Un distrito US que audite rechaza la compra. Casi todo es centralizable.

| Severidad | Hallazgo | Fix | WCAG |
|-----------|----------|-----|------|
| 🔴 Crítico | Navegación SPA no mueve foco ni anuncia (sin `<main>`/skip-link/`document.title`/aria-live) | En `renderApp` rama navegación: `tabindex=-1`+`.focus()` al `<main>`, actualizar `document.title` desde `def.crumbs`, escribir en `aria-live` persistente fuera del root. ~25 líneas, un sitio (`Aula.tsx:52`) | 2.4.3 |
| 🟠 Alto | Sin `<main>`, sin skip-link, sin `aria-current` | `<main id=main tabindex=-1>` (doble: landmark + destino de foco), skip-link visible en foco, `aria-current=page` en nav activa (`shell.ts:151-193`) | 2.4.1, 1.3.1 |
| 🟠 Alto | `levelBadge` 2.0–3.0:1 falla AA en 4/5 tiers | Usar color de texto oscuro AA-safe por tier (espejo de `--otr-green-text` 5.71:1 ya existente); tinte como fondo. Verificar ≥4.5:1 (`components.ts:15-19`) | 1.4.3 |
| 🟠 Alto | Eyebrow verde + q-num 2.8–3.0:1 (en CASI cada card → máximas instancias) | `color:var(--otr-green-text)` (#176B11, conserva matiz). Verde brillante solo en bordes/dots/barras (`app.css:120`, `screens.css:135`) | 1.4.3 |
| 🟠 Alto | Touch targets <44px (tabbar ~38px, `.btn-sm` 30px, `.icon-btn` 36px) — público móvil | En breakpoint móvil: tabbar min-height 48px, `--ctrl-h-sm`→40px, icon-btn 44×44. Densidad compacta solo en desktop | 2.5.5 |
| 🟠 Alto | `outline:none` + solo box-shadow → invisible en Windows High Contrast (0 reglas `forced-colors`) | `outline:2px solid var(--focus)` de respaldo + `@media (forced-colors:active)` (`app.css:19`) | 2.4.7 |
| 🟡 Medio | Tabs sin `role=tablist`/`aria-selected`/flechas; quiz como `role=button` en vez de radiogroup | Helper `tabs()` con roving tabindex; quiz → `<fieldset>` + radios nativos estilados | 4.1.2 |
| 🟡 Medio | Botones solo-icono dependen de `title=` (grabador de audio = acción nuclear) | `aria-label` en todos; toggle de grabar refleja estado `Grabar`/`Detener`. Helper `iconBtn(icon,label)` (`scr-learn.ts:172`) | 4.1.2 |
| 🟡 Medio | Modal atrapa Tab pero el fondo no es `inert` (SR escapa en modo lectura) | `inert` en la raíz de la app mientras el scrim viva (`Aula.tsx:1005`) | 1.3.1 |
| 🟡 Medio | 2 pantallas sin h1, otras con 4-5; cambio de idioma no actualiza `document.lang` | Router emite **un** h1 desde `def.crumbs`; `otrSetLang` setea `document.documentElement.lang` + anuncia | 1.3.1, 3.1.1 |
| 🟡 Medio | Texto 10-10.5px en px fijos (no rem) para adolescentes en móvil | Mínimo cuerpo 12px; migrar escala px→rem para respetar zoom/preferencia | 1.4.4 |
| 🟢 Bajo | Iconos SVG inline sin `aria-hidden` → ruido en SR | `IC[]` emite `aria-hidden=true focusable=false` por defecto (un punto) | — |

---

## 10. Copywriting & Voz

**Voz partida:** el Debate Hub habla como arena ("nos vemos en la arena", "Defiéndela", "La cima es tuya"); el Home habla como dashboard B2B ("Progreso medio", "Entregas pendientes"). Escribir un **voice guide de una página** (segunda persona, verbos de combate/ascenso, cero corporativismo) y pasar todo el Home por él.

| Prioridad | Problema | Fix |
|-----------|----------|-----|
| 🔴 | Pro vende "Analytics completo" (pestaña eliminada) | Reescribir a beneficio real: "Tu curva de rating y forma reciente, en detalle". Quitar de `memConfirmFreeBody` (`lifetime.ts:95,116`) |
| 🟠 | Login (`Auth.tsx`) 100% hardcodeado en español — rompe bilingüismo en la puerta de entrada | Detectar locale antes de auth (`navigator.language`/`?lang=`), diccionario `auth.*` ES/EN. Mitad del target es US |
| 🟠 | 75 errores "No se pudo X" sin razón ni recuperación; 2 son literal "Error" | Plantilla causa+acción: "No pudimos confirmar tu reserva. Revisa tu conexión y reintenta" + botón. Distinguir red (reintentable) de negocio |
| 🟠 | CTA "Practica tu primer debate" → "Drills en camino / pronto" | Copy honesto y accionable hoy: "Pídele a tu coach tu primera ronda" hasta que los drills existan |
| 🟡 | Hora cruda de DB ("12:23 AM") | Formateador localizado (24h RD-ES / AM-PM US-EN, día relativo); sanear seeds (`scr-events.ts:29`) |
| 🟡 | Éxitos sin celebración ("Entregado"); 2 voces para inscribirse | Tier de copy de logro con orgullo+siguiente paso; unificar inscripción usando la versión del Hub |
| 🟡 | Advertencia de downgrade cita features fantasma | Alinear con lo que Pro entrega hoy; no frenar con pérdidas falsas (manipulador al detectarse) |
| 🟢 | Eyebrows genéricos/repetidos ("OTR", "Tu siguiente paso" ×2) | Eyebrow = categorización útil o nada; diferenciar los duplicados |
| 🟢 | Foro hardcodeado "Public Forum I" para todos | Inyectar nombre de grupo: "Foro · {nombreGrupo}" |

---

## 11. Estados (empty / loading / success / error)

| Estado | Problema | Fix |
|--------|----------|-----|
| **Empty** | Práctica/Drills = empty-state estático sin acción; es el destino del CTA primario | Mientras no exista contenido, el empty debe ofrecer la **mejor acción real** (encuentra rival / reserva), no "pronto" |
| **Error** | 75 callejones sin salida; 2 "Error" pelados | Plantilla causa+acción+reintento; eliminar "Error" genéricos |
| **Success** | Anticlimático ("Entregado"), sin motion, 2 voces | Tier de logro: copy con orgullo + motion celebratorio reservado a hitos reales |
| **Loading** | (No evaluado en profundidad; el review previo nota `loading.tsx` rompe hidratación) | Mantener la prohibición de `app/loading.tsx` root; estados de carga locales por pantalla |

---

## 12. Eliminar / Fusionar / Simplificar

**✂️ Cortar:**
- 2 de los 4 KPI tiles del Home (vanity sin acción).
- El bloque "Debate Rank" del Home (duplica el Hub).
- "Analytics completo" y "drills ilimitados" del copy de Pro hasta que existan.
- Los 5 valores de tracking de caps → 1. Los 9 tamaños 11-15px → 3. Pesos 650/750 fantasma.
- Eyebrows de relleno (de 70 a ~1/pantalla).

**🔗 Fundir:**
- 3 estructuras de plan → 1 `C.planCard`.
- 5 heroes ad-hoc → 1 `C.pageHero`.
- `coursesSubTabs` + `subTabs` → 1 `C.tabs`.
- 3 toggles hand-rolled → 1 `C.toggle`.
- 2 onboardings (hub + placement) → 1 hilo "arma tu ruta".
- Toast de inscripción (Eventos seco + Hub celebratorio) → la versión del Hub.
- Sistemas de color paralelos (`--lvl-*` crudos vs `--*-text` AA-safe) → regla única.

**⚡ Simplificar:**
- Reserva de coach: 3 decisiones → smart defaults + 1 atajo.
- Booking/activación: CTA siempre con destino accionable.
- `font-size:px` inline → clases tipográficas (480 → ~0).
- Glicko-2/RD → lenguaje humano con tooltip opcional.

---

## 13. Automatización & IA

| Iniciativa | Qué hace | ROI |
|------------|----------|-----|
| **Sparring IA (primer drill ejecutable)** | IA propone resolución → alumno graba/escribe caso (claim/warrant/impact ya es el currículo) → copiloto devuelve feedback por las 6 dimensiones del radar, sin tocar rating oficial | ★★★★★ Llena la pantalla vacía, hace real "drills ilimitados" de Pro, da el **loop diario self-serve** que falta, alimenta el Skill Graph con señal objetiva |
| **Copiloto de ballot para el coach** | Desde grabación/notas, IA pre-rellena scores por criterio + borrador de feedback que el coach edita/aprueba; adjudicación en lote para torneos | ★★★★★ Desatasca el **cuello de botella de TODO el rating**: más ballots/hora = más rondas = loop de recompensa + más capacidad de marketplace = más GMV |
| **Skill Graph vivo** | Tras cada ballot, mapear scores por criterio → 6 dimensiones del radar (taxonomía casi 1:1), media ponderada a recientes. Mostrar delta ("+8 Refutación este mes") | ★★★★ Convierte el radar de self-report estático en estimador vivo = el **"proof" que los padres pagan**; salva el moat "Lifetime Progress" |
| **Placement objetivo** | Sliders sin ancla en 50 + 1-2 micro-tareas objetivas (grabar 30s / mini-quiz de estructura) + señales del onboarding (metas/formato/edad) | ★★★ Debut creíble; sin sesgo Dunning-Kruger que contamina matchmaking y recomendaciones |
| **Nudges automáticos** | Sobre eventos que YA existen: recordatorio de sesión -24h/-1h (baja no-shows, protege escrow), racha en riesgo, "tu ballot está publicado", win-back para `lapsed` | ★★★★ Retención D7/D30; empezar por email/in-app (sin infra push) |
| **Paywall contextual** | Al topar cada límite Free (práctica, tarifa marketplace, analytics) con microvistazo del valor + reducción de riesgo | ★★★ Sube free→Pro vs página de planes desconectada |

---

## 14. Premium feel — checklist de artesanía que falta

- [ ] **Tokens normativos, no decorativos** — px/hex inline prohibidos por CI.
- [ ] **Una escala tipográfica cerrada** por roles (no 24 tamaños, no medios-píxel).
- [ ] **Ritmo vertical en rejilla 4pt** — la página "late" en un compás, no vibra.
- [ ] **Un solo hero, un solo plan card, un solo tab, un solo toggle** — variantes, no copias.
- [ ] **Jerarquía correcta** — el elemento más grande es la acción/el héroe, no la métrica de inventario.
- [ ] **Verde con significado único** (acción), no 70 eyebrows inertes.
- [ ] **Motion con sentido** — celebración en hitos reales, foco animado al navegar, delta de rating vivo.
- [ ] **Copy con una sola voz** (arena) en toda pantalla.
- [ ] **Foco visible siempre**, incluso en Alto Contraste.
- [ ] **Inter variable** cargado — pesos intermedios reales en vitrinas (cert, perfil).
- [ ] **Tracking de caps único** — los eyebrows como una voz coherente.
- [ ] **Avatares de identidad estable** (hash del nombre), no color al azar.

---

## 15. Plan priorizado por IMPACTO × ESFUERZO × ROI

| Prioridad | Iniciativa | Impacto | Esfuerzo | ROI |
|-----------|------------|---------|----------|-----|
| **P0** | Redirigir CTA de activación fuera del empty-state (`scr-core.ts:122`) | 🔴 | S | ★★★★★ |
| **P0** | CTA "Inscribirme" inline en torneo del Hub/Home | 🔴 | S | ★★★★★ |
| **P0** | Foco + `<main>` + skip-link + `document.title` + aria-live en navegación | 🔴 | S | ★★★★★ |
| **P0** | `levelBadge` + eyebrow + q-num a colores AA-safe | 🔴 | S | ★★★★★ |
| **P0** | Alinear copy de Pro con features reales (quitar vaporware) | 🔴 | S | ★★★★★ |
| **P1** | Variantes de KPI + reducir a 1-2 + invertir jerarquía del Home | 🟠 | S→M | ★★★★★ |
| **P1** | Smart defaults en reserva de coach | 🟠 | S | ★★★★ |
| **P1** | Plantilla de error causa+acción (75 strings) | 🟠 | M | ★★★★ |
| **P1** | Login bilingüe (locale pre-auth) | 🟠 | M | ★★★★ |
| **P1** | Touch targets ≥44px + foco en forced-colors | 🟠 | M | ★★★★ |
| **P1** | h1 garantizado + `document.lang` en cambio de idioma | 🟠 | M | ★★★★ |
| **P2** | Capa de utilidades sobre tokens + lint CI (font-size/gap/hex) | 🔴 | XL | ★★★★★ |
| **P2** | Componentizar: `pageHero`, `planCard`, `tabs`, `toggle` | 🟠 | L | ★★★★ |
| **P2** | Taxonomía de badge + liberar el verde de acción | 🟠 | M | ★★★ |
| **P2** | Colapsar escala tipográfica + snapear spacing 4pt + Inter variable | 🟠 | L | ★★★★ |
| **P2** | Sparring IA (primer drill) | 🟠 | XL | ★★★★ |
| **P2** | Copiloto de ballot | 🟠 | XL | ★★★★ |
| **P2** | Nudges automáticos | 🟠 | L | ★★★★ |
| **P3** | Skill Graph vivo + placement objetivo | 🟡 | L | ★★★ |
| **P3** | Marketplace personalizado + persistir metas | 🟡 | M | ★★★ |
| **P3** | Voice guide + tier de copy de logro + motion celebratorio | 🟡 | M | ★★★ |
| **P3** | tabs ARIA, quiz radiogroup, modal inert, iconos aria-hidden | 🟡 | M | ★★ |

---

## 16. Roadmap de diseño

### 🟢 AHORA (días — quick wins de máximo ROI, casi todo 1 sitio)
Cerrar el gap promesa↔producto y los fallos a11y binarios: redirigir el CTA de activación, CTA "Inscribirme" en el Hub, foco/`<main>`/skip-link/title/aria-live en navegación, `levelBadge`/eyebrow/q-num AA, copy de Pro alineado, variantes de KPI + invertir jerarquía del Home, smart defaults de reserva. **Resultado: la app deja de mentir, deja de dejar al usuario en callejones, y pasa una auditoría a11y básica.**

### 🟡 PRÓXIMO (semanas — sistematización y conversión)
La capa de enforcement (utilidades + lint CI), componentización (`pageHero`/`planCard`/`tabs`/`toggle`), colapso de escala tipográfica + 4pt + Inter variable, taxonomía de badge, login bilingüe, plantilla de errores, touch targets/forced-colors, paywalls contextuales, nudges automáticos. **Resultado: el producto se siente cohesionado y world-class; la conversión deja de fugar.**

### 🔵 DESPUÉS (mes+ — el moat de IA)
Sparring IA self-serve, copiloto de ballot, Skill Graph vivo alimentado por ballots, placement objetivo, marketplace personalizado, persistencia de intención, voice guide + motion celebratorio completo. **Resultado: el loop diario self-serve existe, el coach escala, y el "Lifetime Progress" se vuelve prueba real — el moat que justifica el precio.**

---

*Board: visual-system · type-space · a11y-hf · copy-voice · conversion. Integrado con `docs/review/PRODUCT_REVIEW_2026-06.md` (103 hallazgos). Principio: los vitales pocos, profundos y priorizados — no relleno.*