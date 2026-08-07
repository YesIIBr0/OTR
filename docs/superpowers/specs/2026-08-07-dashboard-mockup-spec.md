# Spec visual — Dashboard del Aula (mockup "Made with Claude Design")

Fecha: 2026-08-07
Fuente: `mockup.html` (2.7 MB, un solo template escapado; extraído con grep/sed/python).
Alcance: UNA pantalla (dashboard del alumno) con top-nav. Todos los valores de este
documento están copiados **literalmente** del archivo — no hay aproximaciones.

Estructura interna del mockup:
- 6 bloques `<style>` en `<helmet>`: webfonts (Inter, Google Fonts), color tokens,
  typography tokens, spacing tokens, effects tokens, y un bloque de overrides/hover.
- El marcado es **todo inline styles** (React/DCLogic). Las clases CSS reales son
  solo 5: `.navlink`, `.evrow`, `.hl` / `.hl-img`, `.badge-tile`, `.rlink` (hover).
- Los datos (eventos, ranking, logros, highlights) viven en `renderVals()` de un
  `class Component extends DCLogic`, con los colores por fila como strings.

---

## 1. Tokens

### 1.1 Color — paleta bruta

```css
--otr-black:      #171717;
--otr-orange:     #F25623;   /* único acento */
--otr-gray-dark:  #4D4D4D;
--otr-gray-light: #DEDEDE;
--otr-white:      #FFFFFF;

/* Escala ink (derivada de #171717) */
--otr-ink-900: #171717;
--otr-ink-800: #202020;
--otr-ink-700: #2E2E2E;
--otr-ink-600: #4D4D4D;
--otr-ink-400: #808080;
--otr-ink-300: #B4B4B4;

/* Superficies claras (sustituyen a los antiguos "cream") */
--otr-cream-200: #DEDEDE;
--otr-cream-100: #EBEBEB;
--otr-cream-50:  #F5F5F5;

/* Acento único; los nombres legacy yellow/green resuelven al naranja */
--otr-yellow:      #F25623;
--otr-yellow-dark: #CC3F13;
--otr-yellow-soft: #F7A98C;
--otr-green:       #F25623;
--otr-green-dark:  #CC3F13;
--otr-green-soft:  #F7A98C;
```

### 1.2 Color — alias semánticos

```css
--bg-page:           var(--otr-cream-50);   /* #F5F5F5 */
--bg-page-dark:      var(--otr-black);
--surface-card:      #FFFFFF;
--surface-card-dark: var(--otr-ink-800);    /* #202020 */
--surface-sunken:    var(--otr-cream-100);  /* #EBEBEB */

--text-strong:       var(--otr-black);
--text-body:         var(--otr-ink-700);    /* #2E2E2E */
--text-muted:        var(--otr-ink-400);    /* #808080 */
--text-on-dark:      var(--otr-cream-50);
--text-on-dark-muted:var(--otr-ink-300);    /* #B4B4B4 */
--text-on-accent:    var(--otr-black);      /* ← texto NEGRO sobre naranja */

--accent:        var(--otr-orange);
--accent-hover:  var(--otr-yellow-dark);    /* #CC3F13 */
--success:       var(--otr-orange);
--success-hover: var(--otr-yellow-dark);

--border-subtle: #E2E2E2;
--border-strong: var(--otr-black);
--border-on-dark: rgba(255,255,255,0.14);

--focus-ring: var(--otr-orange);
```

### 1.3 Colores "de página" usados inline (NO tokenizados)

Estos hexes aparecen hardcodeados en el marcado y son los que realmente definen el
aire del mockup (una gama **cálida/greige**, no la gris fría de los tokens):

| Hex | Uso |
|---|---|
| `#F1F1EF` | `body` background (canvas de la pantalla) + tile de fecha neutro + fondo de icono de logro neutro |
| `rgba(248,248,246,0.85)` | fondo del header sticky (con `backdrop-filter: blur(12px)`) |
| `#E4E3DF` | borde inferior del header, bordes de card, divisores verticales |
| `#EDEDEA` | divisor entre filas de eventos; borde superior del pie de "Logros" |
| `#ECEBE7` | fondo del botón campana |
| `#FBFBFA` | fondo de tile de logro "apagado" |
| `#FAFAF9` | hover de fila de evento (`.evrow:hover`) |
| `#DCDBD6` | borde del botón outline "Recordar" (1.5px) |
| `#E7EBEE` / `#3F5566` | fondo / texto del chip "CLASE" (única desviación fría de la paleta) |
| `rgba(242,86,35,0.045)` | fondo de fila de evento en vivo |
| `rgba(242,86,35,0.1)` | tile de fecha en vivo + fondo de icono de logro naranja |
| `rgba(242,86,35,0.12)` | fondo de la fila "Tú" del leaderboard |
| `rgba(18,18,18,…)` | negro de los degradados sobre foto (ojo: **#121212**, no #171717) |

### 1.4 Tipografía (tokens)

```css
--font-sans:    'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif;
--font-display: 'Inter', system-ui, -apple-system, sans-serif;

--fw-regular:400; --fw-medium:500; --fw-semibold:600; --fw-bold:700; --fw-extrabold:800;

--fs-display-xl:72px; --fs-display-lg:56px; --fs-display:44px;
--fs-h1:34px; --fs-h2:26px; --fs-h3:20px;
--fs-body-lg:18px; --fs-body:16px; --fs-sm:14px; --fs-xs:12px; --fs-eyebrow:12px;

--lh-tight:1.02; --lh-snug:1.15; --lh-heading:1.1; --lh-body:1.55;

--ls-display:-0.03em; --ls-heading:-0.02em; --ls-body:-0.006em; --ls-eyebrow:0.16em;
```

Inter se carga desde Google Fonts en pesos 400 y 700 (romana e itálica) con
`font-display: swap` y subsets latin / latin-ext / greek / cyrillic / vietnamese.
El peso **800** se usa masivamente en el marcado aunque no hay `@font-face` 800
declarado (cae en síntesis / variable si está disponible).

### 1.5 Espaciado y tamaños (tokens, rejilla 4px)

```css
--space-0:0;   --space-1:4px;  --space-2:8px;  --space-3:12px; --space-4:16px;
--space-5:20px;--space-6:24px; --space-8:32px; --space-10:40px;--space-12:48px;
--space-16:64px; --space-20:80px; --space-24:96px;

--container-max:1200px;      /* NOTA: el main real usa 1256px inline */
--container-narrow:760px;
--control-h:44px;
--control-h-sm:36px;
```

### 1.6 Efectos (radios, bordes, sombras, movimiento)

```css
--radius-none:0; --radius-sm:4px; --radius-md:8px; --radius-lg:12px; --radius-pill:999px;

--border-w:1px; --border-w-strong:2px;

--shadow-sm:   0 1px 2px rgba(23,23,23,0.05);
--shadow-md:   0 2px 8px rgba(23,23,23,0.06);
--shadow-lg:   0 10px 30px rgba(23,23,23,0.10);
--shadow-focus:0 0 0 3px rgba(242,86,35,0.40);

--overlay-photo: linear-gradient(180deg, rgba(23,23,23,0) 20%, rgba(23,23,23,0.88) 100%);

--ease-out:      cubic-bezier(0.16, 1, 0.3, 1);
--ease-standard: cubic-bezier(0.4, 0, 0.2, 1);
--dur-fast:120ms; --dur-med:220ms; --dur-slow:400ms;
```

> Contradicción a tener en cuenta: la escala de radios tokenizada es 4/8/12, pero
> **el marcado no la usa**: usa 3/4/5/6px inline (ver §5).

### 1.7 Reset / base

```css
body { margin:0; background:#F1F1EF; -webkit-font-smoothing:antialiased; }
a       { color:var(--otr-orange); text-decoration:none; }
a:hover { color:var(--otr-yellow-dark); }
.navlink:hover    { color:var(--otr-black) !important; }
.evrow:hover      { background:#FAFAF9 !important; }
.hl:hover .hl-img { transform:scale(1.045); }
.badge-tile:hover { border-color:var(--otr-ink-700) !important; }
.rlink:hover      { color:var(--otr-black) !important; }
```

Wrapper raíz: `font-family:var(--font-sans); color:var(--text-body); min-height:100vh; letter-spacing:-0.006em;`

---

## 2. Layout del shell

### 2.1 Top-nav (`<header>`)

```
position:sticky; top:0; z-index:20;
display:flex; align-items:center; justify-content:space-between;
height:62px; padding:0 30px;
background:rgba(248,248,246,0.85); backdrop-filter:blur(12px);
border-bottom:1px solid #E4E3DF;
```

**Bloque izquierdo** — `display:flex; align-items:center; gap:38px`
- Logo: `<img>` escudo, `height:30px; width:auto` + `gap:10px` + wordmark
  `"Aula"` → `font-weight:800; font-size:18px; letter-spacing:-0.03em; color:#171717`.
- Nav: `display:flex; align-items:center; gap:26px`, 5 items
  (`Inicio`, `Mis clases`, `Torneos`, `Clasificación`, `Progreso`).
  - Activo: `font-weight:700; font-size:14px; letter-spacing:-0.01em; color:var(--otr-black)`.
  - Inactivo (`.navlink`): `font-weight:500; font-size:14px; letter-spacing:-0.01em;
    color:var(--otr-ink-400); cursor:pointer; transition:color .15s` → hover `#171717`.
  - **No hay subrayado ni pill de activo**: solo el peso y el color.

**Bloque derecho** — `display:flex; align-items:center; gap:14px`
1. **XP pill** (rectangular, no pill): `display:inline-flex; align-items:center; gap:7px;
   height:34px; padding:0 12px; border-radius:5px; background:var(--otr-ink-900)`.
   Contenido: icono lucide `zap` 14×14 en `var(--otr-orange)` + `1,240`
   (`font-size:13px; font-weight:700; color:#FFF; font-variant-numeric:tabular-nums`)
   + `XP` (`font-size:11px; font-weight:600; color:var(--otr-ink-300)`).
2. **Campana**: `inline-flex; center; width:34px; height:34px; border-radius:5px;
   background:#ECEBE7`, icono lucide `bell` 17×17 en `var(--otr-ink-600)`.
3. **Divisor**: `width:1px; height:24px; background:#E4E3DF`.
4. **User chip**: `display:flex; align-items:center; gap:9px; cursor:pointer` →
   Avatar 34px (componente del design system) + bloque `line-height:1.15` con
   nombre (`font-weight:700; font-size:13px; letter-spacing:-0.01em; color:#171717`)
   y sub (`font-size:11px; font-weight:500; color:var(--otr-ink-400)` → "Tier Oro · Nivel 7").

### 2.2 Contenedor

```
main { max-width:1256px; margin:0 auto; padding:30px 30px 72px; }
```

Preview declarado del artboard: `1256 × 1320`.

### 2.3 Header de página (saludo + strip de stats)

```
display:flex; align-items:flex-end; justify-content:space-between; gap:24px;
padding-bottom:20px; margin-bottom:26px; border-bottom:1px solid #E4E3DF;
```

- **Eyebrow de fecha** ("Miércoles, 6 de agosto"):
  `font-size:11px; font-weight:700; letter-spacing:0.16em; text-transform:uppercase;
  color:var(--otr-orange); margin-bottom:9px`.
- **Display h1** ("Hola, Mateo"):
  `margin:0; font-size:40px; font-weight:800; letter-spacing:-0.035em;
  color:var(--otr-black); line-height:1`.
- **Stats row** (derecha, `display:flex; align-items:center; gap:26px; padding-bottom:3px`),
  3 stats alineados a la derecha separados por divisores `width:1px; height:30px; background:#E4E3DF`:
  - Número: `font-size:21px; font-weight:800; letter-spacing:-0.02em;
    color:var(--otr-black); font-variant-numeric:tabular-nums; line-height:1`.
    El tercero (`6`, racha) va en `var(--otr-orange)`.
  - Label: `font-size:11px; font-weight:600; color:var(--otr-ink-400); margin-top:4px;
    text-transform:uppercase; letter-spacing:0.04em`.
  - Valores: `#5 Clasificación`, `18 Clases`, `6 Racha · sem`.

### 2.4 Grid de 2 columnas

```
display:grid; grid-template-columns:1fr 336px; gap:22px; align-items:start;
```

- Columna izquierda: `display:flex; flex-direction:column; gap:30px`
  (Hero → Próximos eventos → Clasificación → Lo mejor de la temporada).
- Aside derecho (336px): `display:flex; flex-direction:column; gap:18px`
  (Tu rango → Logros).

---

## 3. Componentes

### 3.1 Hero "Tu próxima clase"

Contenedor `<section>`: `position:relative; overflow:hidden; border-radius:6px;
background:var(--otr-ink-900)`.

Capas absolutas (`inset:0`), en orden:
1. **Foto**: `background-size:cover; background-position:center 28%; opacity:0.66`.
2. **Degradado de protección** (lateral, no vertical):
   `linear-gradient(100deg, rgba(18,18,18,0.93) 0%, rgba(18,18,18,0.78) 48%, rgba(18,18,18,0.18) 100%)`.
3. **Barra de acento izquierda**: `left:0; top:0; bottom:0; width:3px; background:var(--otr-orange)`.

Contenido: `position:relative; padding:26px 30px 28px`.

- **Fila de eyebrow** (`display:flex; align-items:center; gap:11px; margin-bottom:22px`):
  - Eyebrow "Tu próxima clase": `font-size:11px; font-weight:700; letter-spacing:0.18em;
    text-transform:uppercase; color:var(--otr-ink-300)`.
  - **Badge EN VIVO**: `inline-flex; align-items:center; gap:6px; padding:3px 9px;
    border-radius:3px; background:var(--otr-orange); color:var(--otr-black);
    font-size:11px; font-weight:800; letter-spacing:0.03em; text-transform:uppercase`,
    con punto `width:6px; height:6px; border-radius:999px; background:var(--otr-black)`.
    Texto dinámico: `"En vivo pronto"` si `secs <= 15*60`, si no `"Hoy"`.
- **Cuerpo**: `display:grid; grid-template-columns:1fr auto; gap:30px; align-items:end`.
  - Módulo: `font-size:12px; font-weight:600; letter-spacing:0.01em;
    color:var(--otr-ink-300); margin-bottom:10px`.
  - Título `<h2>`: `margin:0 0 20px; font-size:33px; font-weight:800;
    letter-spacing:-0.03em; color:#FFF; line-height:1.02; max-width:15ch`.
  - Meta (`display:flex; align-items:center; gap:18px; flex-wrap:wrap`):
    hora con icono `clock` 16×16 en naranja, texto `color:var(--otr-cream-100);
    font-size:14px; font-weight:600`; divisor `width:1px; height:15px;
    background:rgba(255,255,255,0.18)`; avatar 26px + nombre del coach (mismo estilo).
- **Columna derecha del hero** (`flex-direction:column; align-items:flex-end; gap:15px`):
  - Label "Comienza en": `font-size:10px; font-weight:700; letter-spacing:0.16em;
    text-transform:uppercase; color:var(--otr-ink-400); margin-bottom:3px`.
  - **Countdown**: `font-size:42px; font-weight:800; letter-spacing:-0.04em;
    color:#FFF; font-variant-numeric:tabular-nums; line-height:1`.
    Formato `m:ss`, arranca en `12*60` y decrementa 1/s (`setInterval`).
  - **Botón naranja**: `inline-flex; align-items:center; gap:9px; height:50px;
    padding:0 24px; border:none; border-radius:5px; background:var(--otr-orange);
    color:var(--otr-black); font-family:var(--font-sans); font-weight:800;
    font-size:16px; letter-spacing:-0.01em; white-space:nowrap;
    box-shadow:0 8px 24px rgba(242,86,35,0.32); transition:transform .12s`,
    icono `video` 19×19. Press: `transform:translateY(1px)`.

### 3.2 Card "Tu rango" (aside)

`position:relative; overflow:hidden; background:var(--otr-ink-900);
border-radius:6px; padding:22px 20px`.

- Cabecera (`flex; space-between; margin-bottom:19px`):
  - Label "Tu rango": `font-size:10px; font-weight:700; letter-spacing:0.16em;
    text-transform:uppercase; color:var(--otr-ink-400)`.
  - **Badge TIER ORO**: `inline-flex; align-items:center; gap:5px; padding:4px 9px;
    border-radius:3px; background:var(--otr-orange); color:var(--otr-black);
    font-size:11px; font-weight:800; letter-spacing:0.04em; text-transform:uppercase`,
    icono `shield` 12×12.
- **Anillo de progreso** (conic-gradient, sin SVG):
  - Aro: `width:96px; height:96px; border-radius:999px; flex:none;
    background:conic-gradient(var(--otr-orange) 0deg 223deg, rgba(255,255,255,0.1) 223deg 360deg)`
    (223° ≈ 62 %).
  - Núcleo: `width:78px; height:78px; border-radius:999px; background:var(--otr-ink-900)`
    → grosor efectivo del aro **9px**.
  - Dentro: "NIVEL" (`font-size:9px; font-weight:700; letter-spacing:0.12em;
    text-transform:uppercase; color:var(--otr-ink-400)`) + `7`
    (`font-size:33px; font-weight:800; color:#FFF; line-height:1; letter-spacing:-0.03em`).
- Texto a la derecha (`gap:18px` respecto al anillo):
  título `font-size:14px; font-weight:700; color:#FFF; margin-bottom:5px; letter-spacing:-0.01em`;
  descripción `font-size:12.5px; font-weight:500; color:var(--otr-ink-300); line-height:1.4`
  con `<strong>` naranja (`font-weight:800`) para el XP y `<strong>` blanco (700) para el nivel.

### 3.3 Section title (barra naranja izquierda)

```
wrapper: display:flex; align-items:center; gap:10px;
barra:   width:3px; height:15px; background:var(--otr-orange); display:inline-block;
h3:      margin:0; font-size:17px; font-weight:800; letter-spacing:-0.025em; color:var(--otr-black);
```

Fila completa: `display:flex; align-items:center; justify-content:space-between;
margin-bottom:13px` (en "Lo mejor de la temporada" es `align-items:flex-end`).

Variante en card ("Logros"): barra `width:3px; height:14px`, `gap:9px`,
`h4 { font-size:15px; font-weight:800; letter-spacing:-0.02em }`.

Acciones a la derecha del título:
- **Filtros de eventos** (`display:flex; gap:4px`):
  - Activo: `padding:5px 12px; border-radius:4px; font-size:12px; font-weight:700;
    background:var(--otr-black); color:#FFF`.
  - Inactivo (`.rlink`): `padding:5px 12px; border-radius:4px; font-size:12px;
    font-weight:600; color:var(--otr-ink-400)` → hover negro.
- **"Ver todo"** (`.rlink`): `inline-flex; gap:5px; font-size:13px; font-weight:600;
  color:var(--otr-ink-400)` + icono `arrow-right` 14×14.

### 3.4 Lista de "Próximos eventos"

Contenedor: `background:var(--surface-card); border:1px solid #E4E3DF;
border-radius:6px; box-shadow:var(--shadow-sm); overflow:hidden`.

Fila (`.evrow`):
```
display:grid; grid-template-columns:70px 1fr auto; gap:22px; align-items:center;
padding:21px 24px 21px 21px;
border-left:3px solid {edge};      /* var(--otr-orange) o transparent */
border-bottom:1px solid {divider}; /* #EDEDEA, transparent en la última */
background:{rowBg};                /* rgba(242,86,35,0.045) en vivo, si no transparent */
transition:background .15s;        /* hover → #FAFAF9 */
```

- **Date-box** (70px): `text-align:center; background:{dateTile}; border-radius:5px; padding:9px 4px`.
  - Día corto: `font-size:10px; font-weight:800; letter-spacing:0.08em; text-transform:uppercase`.
  - Número: `font-size:27px; font-weight:800; letter-spacing:-0.03em; line-height:1.02;
    font-variant-numeric:tabular-nums`.
  - En vivo: `dateTile:rgba(242,86,35,0.1)`, día y número en `var(--otr-orange)`.
  - Normal: `dateTile:#F1F1EF`, día `var(--otr-ink-400)`, número `var(--otr-black)`.
  - Torneo: `dateTile:#F1F1EF`, día `var(--otr-orange)`, número `var(--otr-black)`.
- **Chip de tipo**: `inline-flex; align-items:center; gap:5px; padding:3px 8px;
  border-radius:3px; font-size:10px; font-weight:800; letter-spacing:0.07em;
  text-transform:uppercase`, icono 12×12. Variantes:
  - `Clase en vivo` → `background:var(--otr-ink-900); color:#FFF` (icono `graduation-cap`).
  - `Clase` → `background:#E7EBEE; color:#3F5566` (icono `graduation-cap`).
  - `Torneo` → `background:var(--otr-orange); color:var(--otr-black)` (icono `trophy`).
  - `margin-bottom:7px` bajo la fila de chips.
- **Título**: `font-size:18px; font-weight:700; color:var(--otr-black);
  letter-spacing:-0.02em; line-height:1.15; margin-bottom:7px`.
- **Meta**: `display:flex; gap:16px; font-size:13px; font-weight:500;
  color:var(--otr-ink-400)`, iconos 14×14 (`clock`, `user` / `map-pin`).
- **Botones de acción** — base común (`_btn`): `inline-flex; align-items:center; gap:7px;
  height:38px; padding:0 15px; border-radius:4px; font-family:var(--font-sans);
  font-weight:700; font-size:13px; letter-spacing:-0.01em; cursor:pointer`.
  En las filas se sobreescriben a **height:44px**:
  - `Unirse` (naranja): `background:var(--otr-orange); color:var(--otr-black);
    border:none; font-weight:800; height:44px; padding:0 20px; font-size:14px`, icono `video`.
  - `Recordar` (outline): `background:transparent; color:var(--otr-black);
    border:1.5px solid #DCDBD6; height:44px; padding:0 18px; font-size:14px`,
    icono `calendar-plus` (mantiene `font-weight:700`).
  - `Inscribirme` (negro): `background:var(--otr-black); color:#FFF; border:none;
    font-weight:800; height:44px; padding:0 20px; font-size:14px`, icono `arrow-right`.

### 3.5 Leaderboard "Clasificación de agosto"

Card: `position:relative; overflow:hidden; background:var(--otr-ink-900);
border-radius:6px`; contenido `position:relative; padding:24px 26px 26px`.

- **Glow decorativo**: `position:absolute; top:-60px; right:-30px; width:220px;
  height:220px; background:radial-gradient(circle, rgba(242,86,35,0.18), transparent 68%)`.
- Cabecera (`flex; align-items:flex-end; space-between; margin-bottom:20px`):
  icono `trophy` 19×19 naranja + `h3` `font-size:17px; font-weight:800;
  letter-spacing:-0.025em; color:#FFF`; a la derecha metatexto
  `font-size:10px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase;
  color:var(--otr-ink-400)` ("Faltan 24 días · Premios al cierre").
- **Grid interno**: `display:grid; grid-template-columns:minmax(0,1.05fr) minmax(0,0.92fr);
  gap:26px; align-items:start`.

**Podio** — `display:grid; grid-template-columns:1fr 1.16fr 1fr; gap:10px; align-items:end`.
- 2º/3º: `background:var(--otr-ink-700); border-radius:5px; padding:17px 12px 14px; text-align:center`.
  - Puesto: `font-size:22px; font-weight:800; color:var(--otr-ink-300); letter-spacing:-0.02em; line-height:1`.
  - Nombre: `font-size:14px; font-weight:700; color:#FFF; margin-top:11px; line-height:1.1`.
  - XP: `font-size:11px; font-weight:700; color:var(--otr-ink-300); margin-top:3px; tabular-nums`.
  - Premio: `margin-top:11px; padding:6px 7px; border-radius:4px;
    background:rgba(255,255,255,0.05); font-size:10.5px; font-weight:600;
    color:var(--otr-cream-200); line-height:1.25`.
- 1º: `background:linear-gradient(165deg, var(--otr-orange), var(--otr-yellow-dark));
  border-radius:5px; padding:17px 12px 15px; text-align:center`.
  - Corona `crown` 22×22 en `var(--otr-black)`, `margin-bottom:8px`.
  - Puesto: `font-size:26px; font-weight:800; color:var(--otr-black); letter-spacing:-0.02em`.
  - Nombre: `font-size:16px; font-weight:800; color:var(--otr-black); margin-top:10px;
    line-height:1.1; letter-spacing:-0.01em`.
  - XP: `font-size:12px; font-weight:800; color:var(--otr-black); margin-top:3px`.
  - Premio: `margin-top:11px; padding:7px 7px; border-radius:4px;
    background:rgba(0,0,0,0.18); font-size:11px; font-weight:700; color:var(--otr-black)`.

**Lista de puestos 4–8** — fila:
```
display:grid; grid-template-columns:26px minmax(0,1fr) auto; gap:12px; align-items:center;
padding:11px 12px; border-radius:4px;
background:{rowBg}; border-left:{accent}; border-bottom:1px solid rgba(255,255,255,0.05);
```
- Fila normal: `rowBg:transparent`, `accent:2px solid transparent`,
  número `var(--otr-ink-400)`, nombre `var(--otr-cream-100)` peso 600,
  XP `var(--otr-ink-300)`.
- **Fila propia ("Tú")**: `rowBg:rgba(242,86,35,0.12)`, `accent:2px solid var(--otr-orange)`,
  número naranja, nombre `#FFF` peso 800, XP naranja, y sufijo de texto `"  ·  Tú"`.
- Tipos: número `font-size:14px; font-weight:800; text-align:center; tabular-nums`;
  nombre `font-size:13.5px; letter-spacing:-0.01em; white-space:nowrap; overflow:hidden;
  text-overflow:ellipsis`; XP `font-size:12.5px; font-weight:700; tabular-nums; white-space:nowrap`.

### 3.6 Grid de logros (aside)

Card: `background:var(--surface-card); border:1px solid #E4E3DF; border-radius:6px;
box-shadow:var(--shadow-sm)`.
- Cabecera: `padding:18px 18px 14px`, section title variante `h4` (§3.3) + contador
  `inline-flex; gap:4px; font-size:12px; font-weight:800; color:var(--otr-orange);
  tabular-nums` con icono `zap` 13×13 → "+1,240 XP".
- Grid: `display:grid; grid-template-columns:1fr 1fr; gap:8px; padding:0 18px 18px`.
- **Tile** (`.badge-tile`): `display:flex; align-items:center; gap:10px; padding:11px 12px;
  background:{tileBg}; border:1px solid {tileBorder}; border-radius:5px;
  transition:border-color .15s` → hover `border-color:var(--otr-ink-700)`.
  - Logro naranja: `tileBg:#FFFFFF`, `tileBorder:#E4E3DF`, icono en tile
    `background:rgba(242,86,35,0.1)`, `iconColor:var(--otr-orange)`.
  - Logro neutro: `tileBg:#FBFBFA`, `tileBorder:#E4E3DF`, icono en tile
    `background:#F1F1EF`, `iconColor:var(--otr-ink-700)`.
  - **Tile del icono**: `inline-flex; center; width:34px; height:34px;
    border-radius:5px; flex:none`, icono lucide 17×17.
  - Nombre: `font-size:12px; font-weight:700; color:var(--otr-black);
    line-height:1.15; letter-spacing:-0.01em`.
  - XP: `font-size:10.5px; font-weight:600; color:var(--otr-ink-400); tabular-nums`.
  - Iconos usados: `flame`, `mic`, `target`, `trending-up`.
- Pie (`.rlink`): `display:flex; center; gap:5px; padding:13px;
  border-top:1px solid #EDEDEA; font-size:12.5px; font-weight:600;
  color:var(--otr-ink-400)` + `arrow-right` 13×13.

### 3.7 Cards "Lo mejor de la temporada"

Grid: `display:grid; grid-template-columns:repeat(4, 1fr); gap:12px`.

Card (`.hl`): `border-radius:5px; overflow:hidden; background:var(--otr-ink-900); cursor:pointer`.
- Media: `position:relative; aspect-ratio:5/4; overflow:hidden`.
  - Imagen (`.hl-img`): `position:absolute; inset:0; background-size:cover;
    background-position:center; transition:transform .45s cubic-bezier(0.16,1,0.3,1)`
    → hover `scale(1.045)`.
  - Degradado: `linear-gradient(180deg, rgba(18,18,18,0) 42%, rgba(18,18,18,0.9) 100%)`.
- **Badge de categoría**: `position:absolute; top:9px; left:9px; padding:3px 7px;
  border-radius:3px; background:var(--otr-orange); color:var(--otr-black);
  font-size:9px; font-weight:800; letter-spacing:0.06em; text-transform:uppercase`.
  (Categorías: Final, Torneo, Equipo, Masterclass — todas en naranja sólido en este mockup.)
- Texto: caja `position:absolute; left:12px; right:12px; bottom:11px`.
  - Título: `font-size:13px; font-weight:700; color:#FFF; letter-spacing:-0.015em;
    line-height:1.2; margin-bottom:3px`.
  - Fecha: `font-size:11px; font-weight:500; color:var(--otr-ink-300)`.

### 3.8 Catálogo completo de chips / badges

| Variante | Estilo exacto | Dónde |
|---|---|---|
| **Naranja sólido (grande)** | `padding:3px 9px; radius:3px; bg:var(--otr-orange); color:var(--otr-black); 11px/800; ls:0.03em; uppercase; gap:6px` + punto 6px negro | Badge EN VIVO del hero |
| **Naranja sólido (tier)** | `padding:4px 9px; radius:3px; bg:var(--otr-orange); color:var(--otr-black); 11px/800; ls:0.04em; uppercase; gap:5px` + icono 12px | Badge TIER ORO |
| **Naranja sólido (mini)** | `padding:3px 7px; radius:3px; bg:var(--otr-orange); color:var(--otr-black); 9px/800; ls:0.06em; uppercase` | Categoría de highlight |
| **Naranja sólido (tipo)** | `padding:3px 8px; radius:3px; 10px/800; ls:0.07em; uppercase; gap:5px` + icono 12px | Chip TORNEO |
| **Negro sólido (tipo)** | igual que el anterior con `bg:var(--otr-ink-900); color:#FFF` | Chip CLASE EN VIVO |
| **Negro sólido (filtro)** | `padding:5px 12px; radius:4px; bg:var(--otr-black); color:#FFF; 12px/700` | Filtro "Todos" activo |
| **Tinte frío (tipo)** | `padding:3px 8px; radius:3px; bg:#E7EBEE; color:#3F5566; 10px/800; ls:0.07em; uppercase` | Chip CLASE |
| **Fantasma / texto (filtro)** | `padding:5px 12px; radius:4px; sin fondo; color:var(--otr-ink-400); 12px/600` → hover negro | Filtros inactivos, "Ver todo", "Ver todas las insignias" |
| **Tinte naranja (tile fecha)** | `bg:rgba(242,86,35,0.1); radius:5px; padding:9px 4px` | Date-box de evento en vivo |
| **Tinte naranja (icono)** | `bg:rgba(242,86,35,0.1); radius:5px; 34×34` | Icono de logro destacado |
| **Neutro (tile)** | `bg:#F1F1EF; radius:5px` | Date-box normal / icono de logro neutro |
| **Premio sobre negro** | `padding:6px 7px; radius:4px; bg:rgba(255,255,255,0.05); 10.5px/600; color:var(--otr-cream-200)` | Podio 2º/3º |
| **Premio sobre naranja** | `padding:7px 7px; radius:4px; bg:rgba(0,0,0,0.18); 11px/700; color:var(--otr-black)` | Podio 1º |
| **Pill XP (nav)** | `height:34px; padding:0 12px; radius:5px; bg:var(--otr-ink-900)` | Top-nav |
| **Outline** | `border:1.5px solid #DCDBD6; radius:4px; bg:transparent; color:var(--otr-black); 14px/700; height:44px` | Botón "Recordar" |

> Regla observable: **ningún chip es pill (999px)**. Todos son rectángulos de 3–5px.
> El texto sobre naranja es **siempre negro `#171717`**, nunca blanco.

---

## 4. Tipografía por rol

| Rol | Tamaño | Peso | Tracking | Line-height | Color |
|---|---|---|---|---|---|
| Display de página ("Hola, Mateo") | 40px | 800 | -0.035em | 1 | `#171717` |
| Countdown | 42px | 800 | -0.04em | 1 | `#FFF` + tabular-nums |
| Nivel del anillo | 33px | 800 | -0.03em | 1 | `#FFF` |
| Título de hero | 33px | 800 | -0.03em | 1.02 | `#FFF`, `max-width:15ch` |
| Número de date-box | 27px | 800 | -0.03em | 1.02 | contextual, tabular-nums |
| Puesto 1º del podio | 26px | 800 | -0.02em | 1 | `#171717` |
| Puestos 2º/3º | 22px | 800 | -0.02em | 1 | `var(--otr-ink-300)` |
| Stat del header | 21px | 800 | -0.02em | 1 | `#171717` / naranja, tabular-nums |
| Título de evento | 18px | 700 | -0.02em | 1.15 | `#171717` |
| Wordmark "Aula" | 18px | 800 | -0.03em | — | `#171717` |
| Section title (`h3`) | 17px | 800 | -0.025em | — | `#171717` / `#FFF` |
| Nombre 1º del podio | 16px | 800 | -0.01em | 1.1 | `#171717` |
| CTA del hero | 16px | 800 | -0.01em | — | `#171717` sobre naranja |
| Section title en card (`h4`) | 15px | 800 | -0.02em | — | `#171717` |
| Cuerpo / meta del hero | 14px | 600 | — | — | `var(--otr-cream-100)` |
| Nav link activo / inactivo | 14px | 700 / 500 | -0.01em | — | `#171717` / `#808080` |
| Botón de fila | 14px | 800 (700 outline) | -0.01em | — | contextual |
| Título de rango / podio 2-3 | 14px | 700 | -0.01em | 1.1 | `#FFF` |
| Nombre de leaderboard | 13.5px | 600 / 800 (tú) | -0.01em | — | cream-100 / `#FFF` |
| Meta de evento | 13px | 500 | — | — | `var(--otr-ink-400)` |
| Título de highlight | 13px | 700 | -0.015em | 1.2 | `#FFF` |
| Nombre de usuario (nav) | 13px | 700 | -0.01em | 1.15 | `#171717` |
| XP del nav | 13px | 700 | — | — | `#FFF`, tabular-nums |
| "Ver todo" / links quiet | 13px / 12.5px | 600 | — | — | `var(--otr-ink-400)` |
| Descripción de rango | 12.5px | 500 | — | 1.4 | `var(--otr-ink-300)` |
| XP de leaderboard | 12.5px | 700 | — | — | tabular-nums |
| Filtro / contador XP | 12px | 700 / 800 | — | — | `#171717` / naranja |
| Nombre de logro | 12px | 700 | -0.01em | 1.15 | `#171717` |
| Módulo del hero | 12px | 600 | 0.01em | — | `var(--otr-ink-300)` |
| **Eyebrow de fecha** | 11px | 700 | **0.16em** | — | `var(--otr-orange)`, uppercase |
| **Eyebrow del hero** | 11px | 700 | **0.18em** | — | `var(--otr-ink-300)`, uppercase |
| Label de stat | 11px | 600 | 0.04em | — | `var(--otr-ink-400)`, uppercase |
| Badge EN VIVO / TIER | 11px | 800 | 0.03–0.04em | — | negro sobre naranja, uppercase |
| Sub del user chip / fecha de highlight | 11px | 500 | — | — | `var(--otr-ink-400)` / `ink-300` |
| Label "Comienza en" / "Tu rango" | 10px | 700 | **0.16em** | — | `var(--otr-ink-400)`, uppercase |
| Meta del leaderboard | 10px | 700 | **0.1em** | — | `var(--otr-ink-400)`, uppercase |
| Chip de tipo | 10px | 800 | **0.07em** | — | uppercase |
| Día corto del date-box | 10px | 800 | **0.08em** | — | uppercase |
| XP de logro / premio de podio | 10.5px | 600 | — | 1.25 | `var(--otr-ink-400)` / cream-200 |
| Badge de highlight | 9px | 800 | **0.06em** | — | negro sobre naranja, uppercase |
| Label "NIVEL" del anillo | 9px | 700 | **0.12em** | — | `var(--otr-ink-400)`, uppercase |

Tamaños "fuera de rejilla" que el mockup usa deliberadamente:
**10.5, 12.5, 13.5** px. `font-variant-numeric: tabular-nums` en TODOS los números
(XP, stats, countdown, puestos, fechas).

---

## 5. Radios, bordes y sombras

**Radios (los tokens 4/8/12 casi no se usan; el marcado es 3–6px):**

| Valor | Elementos |
|---|---|
| `3px` | badges/chips (EN VIVO, TIER ORO, tipo de evento, categoría de highlight) |
| `4px` | botones de fila (`_btn`), filtros de sección, filas del leaderboard, cajas de premio |
| `5px` | pill XP, botón campana, CTA del hero, date-box, tiles de podio, tiles de logro, tile de icono 34px, cards de highlight |
| `6px` | contenedores grandes: hero, card de eventos, card de leaderboard, card de rango, card de logros |
| `999px` | solo círculos: anillo de rango (96/78px) y el punto de 6px del badge EN VIVO |

**Bordes:**
- `1px solid #E4E3DF` — cards claras y header (borde inferior).
- `1px solid #EDEDEA` — divisor entre filas de evento; borde superior del pie de Logros.
- `1px solid rgba(255,255,255,0.05)` — divisor entre filas del leaderboard.
- `1.5px solid #DCDBD6` — botón outline.
- `3px solid var(--otr-orange)` — `border-left` de la fila en vivo y barra del hero.
- `2px solid var(--otr-orange)` — `border-left` de la fila "Tú" del leaderboard.
- `3px × 15px` (o 14px) — barra de section title (es un `<span>`, no un border).
- `1px` de divisores verticales: `height:24px` (nav), `height:30px` (stats),
  `height:15px` sobre negro con `rgba(255,255,255,0.18)`.

**Sombras:** solo dos en toda la pantalla.
- `var(--shadow-sm)` = `0 1px 2px rgba(23,23,23,0.05)` en la card de eventos y la de logros.
- `0 8px 24px rgba(242,86,35,0.32)` — **glow naranja** bajo el CTA del hero (única sombra de color).
- Las cards negras **no llevan sombra**: la profundidad viene del contraste.

**Degradados:**
- Hero: `linear-gradient(100deg, rgba(18,18,18,0.93) 0%, rgba(18,18,18,0.78) 48%, rgba(18,18,18,0.18) 100%)`.
- Highlight: `linear-gradient(180deg, rgba(18,18,18,0) 42%, rgba(18,18,18,0.9) 100%)`.
- Podio 1º: `linear-gradient(165deg, var(--otr-orange), var(--otr-yellow-dark))`.
- Glow del leaderboard: `radial-gradient(circle, rgba(242,86,35,0.18), transparent 68%)`.
- Anillo: `conic-gradient(var(--otr-orange) 0deg 223deg, rgba(255,255,255,0.1) 223deg 360deg)`.

**Movimiento:** `transition:color .15s` (links/nav), `background .15s` (filas),
`border-color .15s` (tiles), `transform .12s` (press del CTA),
`transform .45s cubic-bezier(0.16,1,0.3,1)` (zoom de foto).

---

## 6. Espaciado recurrente

| Contexto | Valor |
|---|---|
| Padding horizontal del shell | `30px` (header y main) |
| Alto del header | `62px` |
| Padding del main | `30px 30px 72px` |
| Gap de las 2 columnas | `22px` |
| Gap vertical de la columna izquierda | `30px` |
| Gap vertical del aside | `18px` |
| Header de página | `padding-bottom:20px; margin-bottom:26px` |
| Título de sección → contenido | `margin-bottom:13px` |
| Padding del hero | `26px 30px 28px` |
| Padding de fila de evento | `21px 24px 21px 21px` (izq. -3px por el borde de acento) |
| Padding de card de leaderboard | `24px 26px 26px` |
| Padding de card de rango | `22px 20px` |
| Card de logros | cabecera `18px 18px 14px`, grid `0 18px 18px`, pie `13px` |
| Padding de fila del leaderboard | `11px 12px` |
| Padding de tile de logro | `11px 12px` |
| Padding de tile de podio | `17px 12px 14px` (1º: `17px 12px 15px`) |
| Gaps de flex frecuentes | `5, 6, 7, 8, 9, 10, 11, 12, 14, 16, 18, 22, 26, 30, 38` px |
| Gap de grid de logros | `8px`; highlights `12px`; podio `10px` |
| Alturas de control | `34px` (nav), `38px` (`_btn` base), `44px` (acciones de fila), `50px` (CTA del hero) |
| Tamaños de icono lucide | `12, 13, 14, 15, 16, 17, 19, 22` px |

---

## 7. Deltas vs. sistema actual del Aula

Comparado con `app/styles/tokens.css` y `app/styles/app.css`.

### 7.1 Lo que YA coincide (no tocar)
- Negro `#171717`, naranja `#F25623`, naranja oscuro (`#CC3F13` mockup vs `#C8401A` repo — casi),
  gris `#4D4D4D`, gris claro `#DEDEDE`.
- Inter con tracking compacto; `--track-tight:-0.03em` ≈ `--ls-display:-0.03em`.
- Rejilla de 4px, `font-variant-numeric:tabular-nums` (`.tnum`).
- Filosofía "un solo acento naranja + grises".

### 7.2 Canvas y superficies — **cambio real**
| | Aula hoy | Mockup |
|---|---|---|
| `body` | `--bg:#FFFFFF` (blanco puro) | `#F1F1EF` (greige cálido) |
| Borde de card | `--border:#E7E7E7` (gris **frío**) | `#E4E3DF` (gris **cálido**) |
| Divisor interno | `--border:#E7E7E7` | `#EDEDEA` |
| Superficie suave | `--otr-offwhite:#F7F7F7` | `#F1F1EF` / `#FBFBFA` / `#ECEBE7` |

**Acción:** el mockup abandona la rampa fría del Brand Book por una greige cálida.
O se añade una rampa `--n-*w` cálida, o se re-tinta `--n-50/100/150` hacia
`#F1F1EF/#EDEDEA/#E4E3DF`. Es la decisión de fondo más grande: cambia todas las
pantallas, no solo el dashboard. **Requiere OK explícito** (choca con el comentario
`[VIS-08] blanco de marca #FFFFFF` en `app.css:11`).

### 7.3 Radios — **cambio grande**
- Aula: `--r-xs:4 / --r-sm:8 / --r-md:12 / --r-lg:12 / --r-xl:12 / --r-pill:999`,
  cards a 12px, controles a 8px, badges y chips a **999px**.
- Mockup: contenedores **6px**, tiles/controles **5px**, badges **3px**, botones **4px**,
  y **cero pills** salvo círculos reales.
- **Acción:** redefinir la escala a `--r-xs:3; --r-sm:4; --r-md:5; --r-lg:6` y
  **quitar `--r-pill` de `.badge` / `.chip` / `.searchbox` / `.role-switch` / `.aud-toggle`**.
  Es el delta con mayor impacto visual: hoy el Aula lee "redondeado/amable",
  el mockup lee "editorial/afilado".

### 7.4 Sombras — **simplificar**
- Aula: 5 niveles (`--sh-1..3`, `--sh-pop`, `--ring`) + `.lift` con `translateY(-3px)`,
  `.tile.click:hover` con `translateY(-2px)`, sheen en `.btn-primary`, `.otr-shine`.
- Mockup: **una sola** sombra (`0 1px 2px rgba(23,23,23,0.05)`) + un glow naranja
  bajo el CTA. Ni una card negra con sombra; ningún hover que levante.
- **Acción:** bajar `.card`/`.tile` a `--sh-1`, eliminar el `translateY` del hover
  (dejar solo `background`/`border-color`), y añadir un token nuevo
  `--sh-accent:0 8px 24px rgba(242,86,35,.32)` para el CTA estrella.

### 7.5 Chips y badges — **rediseño**
| | Aula hoy | Mockup |
|---|---|---|
| `.badge` | `height:22px; padding:0 9px; radius:999px; 11.5px/700; ls:.01em; sin uppercase` | `padding:3px 8px; radius:3px; 10px/800; ls:.07em; UPPERCASE` |
| `.chip` | `height:28px; padding:0 12px; radius:999px; border 1px; 12.5px/500` | filtro: `padding:5px 12px; radius:4px; 12px/700`, sin borde |
| Texto sobre naranja | `.btn-accent{color:#fff}` | **siempre `#171717`** (`--text-on-accent:var(--otr-black)`) |
| Badge de logro | `.badge.gold` → tinte `#FDE7DE` + texto `#9E3211` | naranja **sólido** + texto negro |

**Acción:** añadir variantes `.badge--type` (uppercase, 10px/800, tracking .07em,
radius 3px) en negro sólido / naranja sólido / tinte frío `#E7EBEE`+`#3F5566`, y
cambiar `--text-on-accent` a negro. **Ojo A11Y:** naranja `#F25623` con texto negro
da ≈ 8.4:1 (pasa AA/AAA), mejor que el `#FFF` actual (≈ 3.1:1, que hoy solo se salva
por ser texto grande/bold). Este delta **mejora** el contraste.

### 7.6 Section titles — **componente nuevo**
El Aula no tiene equivalente: usa `.card-head h3 {15px/700}` y `.page-title {24px/800}`.
**Acción:** crear `.sec-title` = `flex; gap:10px` + `<span>` de `3px × 15px` en
`var(--otr-sky)` + `h3 {17px/800; ls:-0.025em}`; variante en card con `14px` de barra,
`gap:9px` y `h4 {15px/800; ls:-0.02em}`. Sustituye a `.card-head` en las secciones.

### 7.7 Heroes — **inversión de concepto**
- Aula: `.tile--hero` / `.tile--hero-gold` = **card blanca** con
  `linear-gradient(135deg,#fff, var(--action-soft))` y borde `color-mix` naranja.
- Mockup: hero = **card negra** (`--otr-ink-900`) con foto al `opacity:.66`,
  degradado lateral a 100°, barra naranja de 3px a la izquierda y CTA naranja con glow.
- **Acción:** añadir `.hero--dark` (negro + foto + `--overlay-photo` lateral + barra de
  acento) y mantener `.tile--hero` solo para KPIs. La card de rango y el leaderboard
  siguen el mismo patrón negro: hoy el Aula no tiene ninguna superficie oscura fuera
  del sidebar (`.sidebar{background:var(--otr-navy)}`).

### 7.8 Shell de navegación — **cambio estructural**
- Aula: `grid-template-columns:248px 1fr` (sidebar negro) + topbar de 56px
  con breadcrumbs, searchbox pill y role-switch; `--maxw:1320px`; `.page{padding:28px 32px 72px}`.
- Mockup: **sin sidebar**. Top-nav horizontal de 62px translúcida
  (`rgba(248,248,246,0.85)` + `blur(12px)`), `max-width:1256px`, `padding:30px 30px 72px`.
- **Acción:** decisión de producto, no de tokens. Si se adopta, hay que reubicar
  todos los grupos de `.sb-nav` (Mis programas, etc.). Alternativa de bajo riesgo:
  mantener el sidebar y adoptar solo §7.2–7.7.

### 7.9 Botón primario — **conflicto con la regla de marca**
El Brand Book vigente (comentario en `app.css:187`) manda **botón primario NEGRO**
y "una sola pieza naranja por vista". El mockup pone naranja en el CTA del hero,
en "Unirse", en el podio 1º, en el eyebrow de fecha, en la stat de racha, en 2 chips
de tipo, en 2 badges de logro y en la fila del leaderboard: **≥ 9 piezas naranjas**.
**Acción:** o se relaja explícitamente la regla de moderación del acento, o se
rebaja el mockup (naranja solo en hero-CTA + fila en vivo, resto en negro/gris).
Decisión de Wilser — no la tomo yo.

### 7.10 Escala tipográfica — **añadir tamaños**
El Aula tiene `--fs-11..--fs-44` en saltos "limpios". El mockup usa
**9, 10, 10.5, 12.5, 13.5, 17, 21, 27, 33, 40, 42** px, y trackings de eyebrow de
**0.06 / 0.07 / 0.08 / 0.1 / 0.12 / 0.16 / 0.18em** (el Aula tiene un único
`.eyebrow{letter-spacing:.1em}`).
**Acción:** añadir `--fs-9/-10/-10.5/-17/-21/-27/-33/-40` y una familia
`--ls-label-{sm,md,lg}` = `.07em / .12em / .16em`. También: el `.eyebrow` del Aula
usa `--otr-green-text:#9E3211` por A11Y; el mockup usa `#F25623` puro a 11px sobre
`#F1F1EF` (≈ 3.0:1 → **falla AA**). Si se adopta el eyebrow naranja hay que
mantener `#9E3211` o subirlo a 700/uppercase con ≥14px.

### 7.11 Tokens nuevos que convendría importar
```css
--overlay-photo-side: linear-gradient(100deg, rgba(18,18,18,.93) 0%, rgba(18,18,18,.78) 48%, rgba(18,18,18,.18) 100%);
--overlay-photo-btm:  linear-gradient(180deg, rgba(18,18,18,0) 42%, rgba(18,18,18,.9) 100%);
--grad-podium:        linear-gradient(165deg, #F25623, #CC3F13);
--glow-accent:        radial-gradient(circle, rgba(242,86,35,.18), transparent 68%);
--sh-accent:          0 8px 24px rgba(242,86,35,.32);
--tint-accent-045:    rgba(242,86,35,.045);   /* fila en vivo */
--tint-accent-10:     rgba(242,86,35,.10);    /* tiles */
--tint-accent-12:     rgba(242,86,35,.12);    /* fila propia */
```

---

## 8. Notas de fidelidad

- La sección "Made with Claude Design" (badge fijo abajo a la derecha, con su propio
  `<style>` y la fuente "Anthropic Sans") **no forma parte del diseño**: es marca de
  agua de la herramienta. Ignorar por completo.
- Los iconos son **lucide** vía `data-lucide` (`window.lucide.createIcons()` en cada
  update). El Aula ya usa iconos SVG propios (`svg.ic`): mapear, no importar lucide.
- El mockup no define estados de foco visibles más allá de `--shadow-focus`
  (`0 0 0 3px rgba(242,86,35,0.40)`), que **no se aplica en ningún sitio del marcado**.
  El Aula ya tiene `--ring` aplicado en `:focus-visible` — conservarlo.
- No hay media queries ni versión responsive en el mockup: está diseñado a 1256px fijos.
- El componente `Avatar` viene del bundle `OTRAcademyDesignSystem_82ad49` (no inspeccionable
  desde el HTML); tamaños usados: 34px (nav), 26px (hero).
