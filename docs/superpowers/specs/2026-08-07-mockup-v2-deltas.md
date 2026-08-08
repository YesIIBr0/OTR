# Spec de DELTAS — Mockup v2 (aprobado por Isaac) vs. implementación actual

Fecha: 2026-08-07 · Autor: extracción automática del bundle del mockup v2
Fuente v2: `mockup2.html` (bundle Claude Design, pantalla **Eventos**, single-page).
Base v1 ya implementada: `docs/superpowers/specs/2026-08-07-dashboard-mockup-spec.md`.

## 0. Qué es y qué NO es este mockup

| Hecho | Detalle |
| --- | --- |
| Pantallas incluidas | **UNA sola**: `Eventos` con 3 vistas (Próximos / Calendario / Pasados) + drawer de detalle. El nav apunta a `Panel del Estudiante.dc.html`, **pero ese documento NO viene en el bundle**. |
| Assets de imagen | **2**: el escudo (`320×350` PNG) y **una sola foto** (`1589×1229` PNG, ratio 1.293 — chica en podio con micrófono ante público). |
| Medidas verificadas | Renderizado en Chromium a viewport 1440×1000 y medido con `getBoundingClientRect()`. Los valores marcados «medido» vienen de ahí; el resto son literales del `style=` inline. |
| Lo que NO está en el v2 | Aside/rail lateral, dashboard, highlights, leaderboard, podio, anillo de progreso, tarjeta de rango, insignias. **No inventar valores para esos bloques**: se quedan como están hasta que haya mockup. |

> Aviso sobre "las secciones tienen unas fotos en el fondo" (WhatsApp): en el v2 entregado hay **exactamente una** foto de fondo, la del hero "Ahora mismo · Próximo". Ninguna otra sección, card o fila lleva imagen. La generalización a otras secciones es una decisión de producto pendiente, no un dato del mockup.

---

## 1. Contenedor y aire

| Elemento | v2 (objetivo) | actual (repo) | acción |
| --- | --- | --- | --- |
| `main` max-width | `1120px` | `.page{max-width:1256px}` (app.css:183) | **−136px**. Bajar a 1120. Es el cambio nº1 de "más espacio en blanco". |
| `main` padding | `30px 30px 80px` | `.page{padding:30px 30px 72px}` | Subir el respiro inferior 72→**80px**. Laterales OK. |
| Ancho útil real | 1120px (medido: `main` = 1180 con padding) | 1196px útiles | — |
| `header` ancho interior | **A sangre**: `padding:0 30px`, SIN contenedor centrado (medido `header` = 1425px = viewport) | `.topnav-in{max-width:1256px;margin:0 auto}` (app.css:84) | **Quitar el `max-width` del interior de la top-nav.** En el v2 el escudo va a 30px del borde del monitor y el contenido queda centrado a 1120 → contraste de anchos que hace que la página "respire". |
| Rejilla de columnas / aside | **No existe en el v2** (una sola columna a 1120) | `.dash-grid{1fr 336px;gap:22px}` (screens.css:885) | **Sin dato.** No tocar el rail hasta que haya mockup del dashboard. |
| page-head → contenido | `padding-bottom:18px; margin-bottom:24px; border-bottom:1px solid #E4E3DF; align-items:flex-end; gap:24px` (medido: 80px de alto) | `.page-head--rule{padding-bottom:20px;margin-bottom:26px;gap:24px}` (screens.css:156) | −2px padding, −2px margin. Delta menor. |
| Eyebrow de sección → hero | `margin-bottom:12px` | n/a (el eyebrow del hero vive dentro de la card negra) | Nuevo patrón: eyebrow **fuera** de la card. |
| Hero → primer grupo | `margin-bottom:34px` | `.dash-main{gap:30px}` | 30→**34px** entre hero y lo siguiente. |
| Entre bloques de sección | `margin-bottom:26px` por grupo | `.dash-main{gap:30px}` uniforme | El v2 usa **34px tras el hero** y **26px entre secciones normales** (ritmo no uniforme). |
| Título de sección → card | `margin-bottom:11px` | `.sec-title{margin-bottom:13px}` (screens.css:32) | 13→**11px**. |
| Alto de bloque medido | hero `1120×225`; grupo "Esta semana" `1120×217` (card 186); grupo "Más adelante" `1120×310` (card 279) | — | Referencia de "tamaño de las secciones". |

---

## 2. Escala tipográfica por rol

| Elemento | v2 (objetivo) | actual (repo) | acción |
| --- | --- | --- | --- |
| **h1 page-head** | `38px / 800 / -0.035em / line-height:1` | `.ph-title{font-size:40px;font-weight:800;letter-spacing:-.035em;line-height:1}` + `margin:6px 0 0` | **40 → 38px**; quitar el `margin-top:6px` (el v2 usa `margin:0`). |
| **Eyebrow de page-head** | `11px / 700 / 0.16em / uppercase`, color **`#F25623`** (naranja puro), `margin-bottom:9px` | `.ph-eyebrow` = 11/700/.16em, color `--otr-green-text` **#9E3211**, mb 9px | Tamaño OK. El v2 usa naranja puro; **mantener #9E3211** por A11y (11px sobre greige) y documentar la desviación. |
| **Eyebrow de sección (sobre canvas)** | `11px / 800 / 0.18em / uppercase`, color `#4D4D4D`, punto naranja 6px, `gap:9px`, `mb:12px` | `.lbl{10px/700/.16em; color:--ink-400}` | Nuevo rol: eyebrow claro 11/800/.18em en gris oscuro. |
| **Título de sección (h3)** | `16px / 800 / -0.025em` + barra naranja `3×14px`, `gap:10px` | `.sec-title>h3{17px/800/-.025em}` + barra `3×15px`, gap 10px | 17→**16px**; barra 15→**14px**. |
| **Contador junto al título** | `12px / 600`, color `#808080` | n/a | Añadir ("2 eventos"). |
| **h2 del hero** | `31px / 800 / -0.03em / lh 1.04`, `max-width:16ch`, `margin:0 0 16px` | `.dh-title{33px/800/-.03em; lh 1.02; max-width:18ch; margin:0 0 20px}` | 33→**31px**; 18ch→**16ch**; mb 20→**16px**; lh 1.02→**1.04**. |
| **Countdown** | `40px / 800 / -0.04em / lh 1`, tabular-nums; label `10px/700/0.16em` con `mb:3px` | `.dh-cd{42px/800/-.04em}`; label vía `.lbl` 10/700/.16em | 42→**40px**. |
| **Meta del hero** | `14px / 600`, gap `16px`, icono `15px` naranja, separador `1×14px` | `.dh-meta{14px/600; gap:14px}`, icono 16px, sep `1×15px` | gap 14→16; icono 16→15; sep 15→14. |
| **Título de fila/card** | `16px / 700 / -0.02em / lh 1.2`, sin margen propio | `.ev-title{18px/700/-.02em; lh 1.15; margin:7px 0}` | **18 → 16px**; el bloque superior lleva `margin-bottom:4px` y el inferior `margin-top:4px` (no 7). |
| **Metadatos de fila** | `12.5px / 500`, color `#808080`, `gap:6px`, icono `13px`, `margin-top:4px` | `.ev-meta{13px/500; gap:16px}`, icono 14px | 13→**12.5px**; icono 14→13; el v2 pone **un solo meta** (hora), no una fila de 3 con gap 16. |
| **Etiqueta de tipo dentro de la fila** | **Texto plano** `10px / 800 / 0.07em / uppercase`, coloreado: clase `#F25623`, torneo `#171717`, seminario `#4D4D4D`. **Sin fondo, sin padding, sin borde.** | `C.chip(...)` → `.chip--black/--info/--accent` con `padding:3px 8px` y fondo | **Delta fuerte**: en el v2 la etiqueta de tipo de una fila NO es un chip con fondo. Los chips con fondo quedan solo para el hero y el drawer. |
| **Programa (fila)** | `12px / 600`, `#808080`, separado por punto de `3×3px` `#B4B4B4` | n/a | Añadir. |
| **Día corto (date col)** | `10px / 800 / 0.08em / uppercase` | `.db-m{10px/700/.08em}` | peso 700→**800**. |
| **Número de día** | `25px / 800 / -0.03em / lh 1.02`, tabular-nums | `.db-d{20px/800/-.03em; lh 1.05}` | 20→**25px** (el número crece; el resto encoge). |
| **Chips (hero / drawer)** | `10.5px / 800 / 0.06em / uppercase`, `padding:4px 9px`, `radius:3px`, `gap:6px`, icono `12px` | `.chip--*{10px/800/.07em; padding:3px 8px; radius:3px; gap:5px}` icono 12px | 10→10.5px; padding 3/8→**4/9**; tracking .07→.06em. |
| **Chip outline sobre oscuro** | `10.5px / 700 / 0.04em`, `padding:3px 9px`, `radius:3px`, `border:1px solid rgba(255,255,255,.2)` | `.chip--outline` usa `--border-strong` (claro) | Añadir variante sobre oscuro. |
| **Tabs (control segmentado)** | botón `13px / 700 / -0.01em`, `h:34px`, `padding:0 16px`, `radius:4px`; contenedor `padding:3px`, `background:#E7E6E2`, `radius:6px`; activo = `#FFF` + `0 1px 2px rgba(23,23,23,.05)`, inactivo texto `#6B6B6B` | `.tabs/.tab` = barra con subrayado (`padding:10px 14px; 13.5px/600; border-bottom:2px`) | **Cambio de componente**: de tabs subrayadas a **segmented control**. |
| **Botón de acción de fila** | `13.5px / 700` (800 si es acento), `h:40px`, `padding:0 16px`, `radius:4px` | `.btn.btn--sm/.btn-sm{h:34px; padding:0 14px; 13.5px}`; `.btn` base `h:36px` | Altura de la acción de fila 34→**40px**; padding 14→16. |
| **CTA estrella (hero)** | `16px / 800 / -0.01em`, `h:50px`, `padding:0 26px`, `radius:5px`, `gap:9px`, icono `19px`, `box-shadow:0 8px 24px rgba(242,86,35,0.34)` | `.btn.btn-lg{h:50px; padding:0 24px; 16px/800}` + `--sh-glow:0 8px 24px rgba(242,86,35,.32)` | padding 24→26; radius 4→**5px**; sombra .32→**.34**. |
| **Cuerpo del drawer** | `14px / 500 / line-height 1.6`, color `#2E2E2E` | — | Nuevo. |
| **Labels de drawer** | `10px / 800 / 0.1em / uppercase`, `#808080` | `.lbl{10px/700/.16em}` | Variante 0.1em/800. |
| **h2 del drawer** | `24px / 800 / -0.03em / lh 1.1` | — | Nuevo. |
| **Fila "Pasados"** | título `15px/700/-0.015em/lh1.2` (color `#2E2E2E`, no negro); meta `12px/500`; estado `10px/800/0.06em`; intro `13.5px` `#808080` | — | Nuevo (jerarquía apagada para lo histórico). |
| **Calendario** | mes `20px/800/-0.03em`; cabecera de día `10.5px/800/0.08em`; número `12.5px`; píldora de evento `10.5px/700/-0.01em` | — | Nuevo. |
| **Recurso del drawer** | nombre `13px/700/-0.01em`; meta `11px/500` | — | Nuevo. |

**Resumen del delta tipográfico**: h1 −2, título de sección −1, título de hero −2, countdown −2, título de fila **−2**, meta de fila −0.5. La sensación de "textos más chicos" viene sobre todo del **título de fila 18→16** y del **contenedor 1256→1120**.

---

## 3. Top-nav (el cliente dijo que el espaciado del header "es lo principal")

**Buena noticia: nuestra top-nav ya es casi idéntica al v2.** El único delta estructural es el `max-width` del interior.

| Elemento | v2 (objetivo) | actual (repo) | acción |
| --- | --- | --- | --- |
| Alto | `62px` | `.topnav{height:62px}` | **igual** |
| Fondo / borde | `rgba(248,248,246,0.85)` + `backdrop-filter:blur(12px)` + `border-bottom:1px solid #E4E3DF`, `position:sticky; top:0; z-index:20` | idéntico (app.css:77-82) | **igual** |
| Padding horizontal | `0 30px`, **sin contenedor centrado** | `.topnav-in{max-width:1256px;padding:0 30px}` | **Quitar `max-width:1256px`** (único cambio real del header). |
| Gap bloque izquierdo | `38px` | `.tn-left{gap:38px}` | **igual** |
| Logo | `img height:30px; width:auto` (→ ~27×30) + gap `10px` | `.crest{width:26px;height:30px}`, gap 10px | **igual** (±1px) |
| Wordmark "Aula" | `18px / 800 / -0.03em` | `.tn-word{18px/800/-.03em}` | **igual** |
| Gap entre links | `26px` | `.tn-links{gap:26px}` | **igual** |
| Link | `14px / 500 / -0.01em`, color `#808080` | `.tn-link{14px/500/-.01em; color:--ink-400}` | **igual** |
| Link activo | `14px / 700`, color `#171717`, **SIN subrayado** | `.tn-link.active` + `::after` barra naranja de 2px | **Quitar el `::after`** (el v2 marca el activo solo con peso y color). |
| Gap bloque derecho | `14px` | `.tn-right{gap:14px}` | **igual** |
| Pill de XP | `h:34px; padding:0 12px; radius:5px; background:#171717; gap:7px`; icono `14px` naranja; número `13px/700` blanco tabular; "XP" `11px/600` `#B4B4B4` | `.tn-xp` idéntico (radius `--r-md`=5px) | **igual** |
| Campana | `34×34; radius:5px; background:#ECEBE7`; icono `17px` `#4D4D4D` | `.tn-icon` idéntico | **igual** |
| Separador | `1×24px`, `#E4E3DF` | `.tn-sep{width:1px;height:24px}` | **igual** |
| User-chip | `gap:9px`; avatar `34px`; nombre `13px/700/-0.01em`; sub `11px/500` `#808080`; `line-height:1.15`; **sin padding ni fondo hover** | `.tn-user{gap:9px; padding:3px 6px 3px 3px}` + hover `background:--bg-sunken` | Tipografía **igual**. El v2 no lleva padding ni hover; nuestro hover es una mejora funcional — mantener salvo que Isaac lo pida. |

> Traducción de "El header así. Mira el espacio entre las cosas": los **valores del header ya coinciden**. Lo que cambia la percepción es que en el v2 el header va a sangre mientras el contenido baja a 1120 → la barra se ve ancha y el contenido, contenido.

---

## 4. Radios ("menos rounded, más cuadrado")

La escala del v2 **coincide con nuestros tokens actuales** (`--r-xs:3 --r-sm:4 --r-md:5 --r-lg:6`). El delta no está en la escala sino en los **restos de `--r-pill`** que quedaron sin migrar.

| Tipo de elemento | v2 (objetivo) | actual (repo) | acción |
| --- | --- | --- | --- |
| Chip / badge / etiqueta | `3px` | `--r-xs:3px` en `.chip--*` | igual |
| Botón (normal, tab, acción de fila) | `4px` | `--r-sm:4px` | igual |
| Botón grande / CTA hero | `5px` | 4px (hereda `--r-sm`) | **4 → 5px** en `.btn-lg` |
| Tile de icono / pill de XP / campana / cerrar drawer | `5px` | `--r-md:5px` | igual |
| Card / sección / contenedor de tabs / rejilla de datos | `6px` | `--r-lg:6px` | igual |
| Píldora de día del calendario | `4px` | — | nuevo |
| Píldora de evento en calendario | `3px` | — | nuevo |
| Círculos reales (avatar, punto, dot) | `999px` | `--r-pill` | igual |
| **Restos en pill que el v2 NO tiene** | — | `.chip` base (app.css:311), `.badge` (292), `.searchbox` (174), `.role-switch` (176-177), `.aud-toggle` (320-321), `.streak` (screens:187), `.quiz-timer` (303), `.eng-pill` (353), `.save-chip` (502), `.toast-retry` (500), `.unread-pill` (458), `.bell-count` (493) | **Migrar a 3/4/5px**. Es lo que Isaac ve como "todavía redondeado". |

---

## 5. Alturas de controles

| Elemento | v2 (objetivo) | actual (repo) | acción |
| --- | --- | --- | --- |
| CTA hero / CTA drawer | `h:50px`, `padding:0 26px`, `radius:5px`, `16px/800` | `.btn.btn-lg{h:50px; padding:0 24px; 16px/800; radius:4}` | padding +2, radius +1 |
| Acción de fila (primaria y outline) | `h:40px`, `padding:0 16px`, `radius:4px`, `13.5px/700-800`; outline `border:1px solid #DCDBD6`, fondo transparente | `.btn.btn--sm/.btn-sm{h:34px; padding:0 14px; 13.5px}`; `.btn.btn-outline{border:1.5px}` | **34 → 40px**; padding 14→16; borde outline 1.5→**1px** |
| Botón de tab (segmented) | `h:34px`, `padding:0 16px`, `radius:4px`, `13px/700` | `.tab{padding:10px 14px; 13.5px/600}` (underline) | reemplazar componente |
| Botón de navegación del calendario | `30×30`, `radius:4px`, `border:1px solid #DCDBD6`, icono `16px` | `.icon-btn{36×36; radius:4px}` | 36→30 en ese contexto |
| Cerrar drawer | `30×30`, `radius:5px`, `background:rgba(255,255,255,.08)`, icono `17px` | — | nuevo |
| Chip (etiqueta) | altura auto: `padding:4px 9px` (≈21px) | `.chip--*{padding:3px 8px}` (≈20px) | +1/+1 |
| Columna de fecha (date-box) | **`60px` de ancho, SIN caja**: texto centrado, sin fondo, sin padding, sin radio. Vivo → día y número en `#F25623`; normal → día `#808080`, número `#171717` | `.date-box{width:70px; background:var(--bg); padding:9px 4px; border-radius:5px}` | **Quitar la caja.** 70→60px, sin fondo ni radio. Aire ganado: ~10px por fila + el peso visual de la caja gris. |
| Tile de icono de fila | `34×34`, `radius:5px`; clase `rgba(242,86,35,.1)` con icono naranja, torneo `#171717` con icono blanco, seminario `#ECEBE7` con icono gris; icono `17px` | no existe | **nuevo elemento** en la rejilla de fila |
| Fila de evento (próximos) | `display:grid; grid-template-columns:60px 34px 1fr auto; gap:18px; padding:17px 20px 17px 17px; border-left:3px solid <edge>; border-bottom:1px solid #EDEDEA` (medido **92px de alto**) | `.evrow{grid-template-columns:70px 1fr auto; gap:16px; padding:14px 0; border-left:3px solid transparent; border-bottom:1px solid var(--bg-sunken)}` | rejilla de **4 columnas**, gap 16→18, padding vertical 14→17 y **padding horizontal real** (17/20) en vez de `--ev-bleed` |
| Fila en vivo | `background:rgba(242,86,35,0.043)`, `border-left:3px solid #F25623` | `.evrow--live{background:rgba(242,86,35,.045)}` + márgenes negativos de sangrado | color **igual**; **eliminar el hack de márgenes negativos** (con el padding dentro de la fila deja de hacer falta) |
| Fila de "Pasados" | `grid:30px 1fr auto; gap:16px; padding:15px 18px; background:#FBFBFA; border:1px solid #ECEBE7; radius:5px`; separadas por `gap:8px` (no divisores) | — | nuevo |
| Hover de fila | `background:#FAFAF9`, chevron `translateX(3px)` + `opacity 1`, transición `.14s` | `.evrow:hover{background:var(--surface-2)}` (#FBFBFA) | añadir el chevron `18px` `#B4B4B4` `opacity:.55` |
| Celda de calendario | `min-height:96px; padding:8px 9px; border-right/bottom:1px solid #F0F0EE` | — | nuevo |

---

## 6. Fotos de fondo

**Ubicación exacta: solo el hero "Ahora mismo · Próximo".** Nada más en todo el v2.

Estructura literal (4 capas):

```html
<section style="position:relative; overflow:hidden; border-radius:6px;
                background:#171717; margin-bottom:34px; cursor:pointer">
  <!-- 1) foto -->
  <div style="position:absolute; inset:0;
              background-image:url(<foto>);
              background-size:cover;              /* = object-fit:cover */
              background-position:center 26%;
              opacity:0.6"></div>
  <!-- 2) overlay de protección, HORIZONTAL (no el vertical del design system) -->
  <div style="position:absolute; inset:0;
              background:linear-gradient(100deg,
                rgba(18,18,18,0.95) 0%,
                rgba(18,18,18,0.80) 48%,
                rgba(18,18,18,0.22) 100%)"></div>
  <!-- 3) canto naranja -->
  <div style="position:absolute; left:0; top:0; bottom:0; width:3px; background:#F25623"></div>
  <!-- 4) contenido -->
  <div style="position:relative; padding:26px 30px 28px"> … </div>
</section>
```

| Elemento | v2 (objetivo) | actual (repo) | acción |
| --- | --- | --- | --- |
| Dónde hay foto | Solo el hero de Eventos | Solo `.hl` (highlights del dashboard) | Añadir capa de foto al hero |
| Fondo base de la sección | `#171717` (`--otr-ink-900`) bajo la foto | `.card--dark{background:var(--otr-black)}` | igual |
| Imagen | `background-size:cover`, `background-position:center 26%`, `opacity:0.6` | `.hl{background:… center/cover}`, sin opacity | Nueva capa con `opacity:.6` y foco a `center 26%` |
| Overlay | `linear-gradient(100deg, rgba(18,18,18,.95) 0%, rgba(18,18,18,.80) 48%, rgba(18,18,18,.22) 100%)` — **horizontal**, protege el texto de la izquierda y deja ver la foto a la derecha | `.hl::after{linear-gradient(180deg, rgba(18,18,18,0) 42%, rgba(18,18,18,.9) 100%)}` — vertical | El hero usa el **horizontal**; los tiles tipo highlight seguirían con el vertical |
| Token de overlay del design system | `--overlay-photo: linear-gradient(180deg, rgba(23,23,23,0) 20%, rgba(23,23,23,0.88) 100%)` — **definido pero NO usado por el hero** | no existe | Se puede adoptar como token para tiles; el hero **no** lo usa |
| Canto naranja | `div` absoluto `width:3px`, `#F25623` | `.dash-hero::after{width:3px}` | igual |
| Padding del contenido | `26px 30px 28px` | `.dash-hero{padding:26px 30px 28px}` | **igual** |
| Proporción / altura | **El v2 NO fija `aspect-ratio` ni `min-height`**: la altura la da el contenido. Medido a 1120px de ancho → **225px** (≈ 4.98:1) | `.hl{aspect-ratio:5/4}` (eso es el tile, no el hero) | No inventar altura fija: dejar que mande el contenido |
| Asset | PNG `1589×1229` (ratio 1.293), figura a la derecha del encuadre | — | El recorte `center 26%` está calibrado para esa foto: si se cambia la imagen hay que recalibrar |

---

## 7. Densidad de las cards

| Elemento | v2 (objetivo) | actual (repo) | acción |
| --- | --- | --- | --- |
| Card contenedora de lista | `background:#FFF; border:1px solid #E4E3DF; border-radius:6px; box-shadow:0 1px 2px rgba(23,23,23,.05); overflow:hidden;` **`padding:0`** (las filas traen el suyo) | `.card{…}` + `.card-pad{padding:20px 22px}` con `--ev-bleed:22px` | **Card sin padding**, filas a sangre con `padding:17px 20px 17px 17px`. Adiós al truco de márgenes negativos. |
| Separación entre filas | `border-bottom:1px solid #EDEDEA`, **sin gap** (última fila sin borde) | `.evrow{border-bottom:1px solid var(--bg-sunken)}` (#EDEDEA) | **igual** |
| Card del hero | `padding:26px 30px 28px` | `.dash-hero{padding:26px 30px 28px}` | **igual** |
| Cabecera del drawer | `padding:22px 24px` sobre `#171717` | — | nuevo |
| Cuerpo del drawer | `padding:22px 24px 28px` | — | nuevo |
| Rejilla de datos del drawer | 2 columnas con `gap:1px` + `background:#ECEBE7` (los 1px hacen de divisor), celdas `#FFF` con `padding:13px 15px`, contenedor `radius:6px; overflow:hidden`, `margin-bottom:22px` | — | nuevo (truco de divisores por gap) |
| Caja de info (lugar) | `padding:12px 14px; background:#F6F6F4; border:1px solid #ECEBE7; radius:5px; gap:10px` | — | nuevo |
| Fila de recurso | `padding:11px 13px; border:1px solid #E4E3DF; radius:5px; gap:11px`; icono en tile `32×32 radius:5 background:#F1F1EF` | — | nuevo |
| Gap entre recursos | `7px` | — | nuevo |
| Fila de "Pasados" | `padding:15px 18px`, separadas por `gap:8px` | — | nuevo |
| Bloque coach del drawer | `padding:13px 0; border-bottom:1px solid #EDEDEA; gap:12px`; avatar `42px` | — | nuevo |
| Drawer | `width:468px; max-width:92vw`; velo `rgba(18,18,18,0.5)`; entrada `drawerIn .26s cubic-bezier(0.16,1,0.3,1)` + `fadeIn .18s` | — | nuevo |
| Cabecera de calendario | `padding:10px 12px; background:#FAFAF9; border-bottom:1px solid #EDEDEA` | — | nuevo |
| Celda de calendario | `min-height:96px; padding:8px 9px` | — | nuevo |

---

## 8. Paleta: nada que cambiar

Los hex del v2 son exactamente los nuestros: `#171717`, `#F25623`, `#CC3F13`, `#4D4D4D`, `#808080`, `#B4B4B4`, `#E4E3DF`, `#DCDBD6`, `#EDEDEA`, `#ECEBE7`, `#F1F1EF`, `#FBFBFA`, `#FAFAF9`. Grises nuevos que aparecen y no tenemos como token: `#E7E6E2` (fondo del segmented), `#F0F0EE` (divisor de calendario / tile apagado), `#F6F6F4` (caja de info), `#E2E2E2` (`--border-subtle` del design system, sin uso real en la pantalla).

Única desviación deliberada nuestra que **NO** hay que revertir: el eyebrow pequeño en `#9E3211` en vez de `#F25623` (A11y AA sobre el canvas greige).

---

## 9. Riesgos y decisiones abiertas

1. **Header a sangre vs. alineado.** El v2 desalinea el escudo del título de página. Es lo que Isaac aprobó, pero conviene confirmarlo antes de tocar `.topnav-in`.
2. **Etiqueta de tipo sin fondo.** Quitar el fondo del chip de tipo dentro de la fila mejora el aire pero baja el contraste percibido; el naranja `#F25623` a 10px/800 sobre blanco da ~3.6:1 → **no cumple AA**. Recomendación: usar `#9E3211` en ese texto (como ya hacemos en el eyebrow) y reportarlo como desviación consciente.
3. **Foto en "las secciones"** (plural, dicho por WhatsApp): el v2 solo trae una. Pedir a Isaac qué otras secciones quiere con foto antes de generalizar.
4. **No hay mockup del dashboard v2.** Los bloques del rail (rango, insignias, leaderboard, highlights) no se tocan; si se aplica la escala tipográfica global habrá que revisarlos a ojo.
