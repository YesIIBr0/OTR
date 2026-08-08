# GOAL 2026-08 — Auditoría de teclado y semántica (rediseño top-nav)

Estado: Completo (2026-08-08)
Fecha: 2026-08-08
Rama: feat/goal-extras (solo diagnóstico, sin cambios de código)
Servidor: http://127.0.0.1:3032 (`PORT=3032 npm run dev`)
Cuentas: analia.reyes@otr.do (estudiante), saul@otr.do (coach) — pass `rebrand-qa-2026`

Método: Chromium real (Playwright MCP), tabulación con teclado real (`keyboard.press('Tab')`)
midiendo `getComputedStyle(document.activeElement)` 350 ms después de cada parada (el anillo
tiene transición: medir al instante da falsos negativos). Contraste con la fórmula de
luminancia relativa WCAG 2.1, componiendo el alpha del anillo sobre el fondo real.

> Nota de entorno: los 6 `next dev` del repo comparten el mismo `.next`, así que se pisan las
> compilaciones entre sí (ENOENT `.next/server/app/aula/page.js` → 404/500 aleatorios). Esta
> auditoría corrió sobre una COPIA del repo en scratchpad con `node_modules` symlinkeado, y
> contra `127.0.0.1` en vez de `localhost` para no compartir la cookie de sesión con los demás
> agentes (las cookies son por host, no por puerto).

## Alcance
1. Foco visible (login, dashboard, top-nav, menú "Más", menú de usuario, modal Adjudicar)
2. Modales: focus trap, Escape, retorno de foco
3. Semántica: jerarquía de encabezados, landmarks, botón vs enlace, labels, aria-current, aria-expanded
4. Nombre accesible de botones-icono / aria-hidden en iconos decorativos
5. prefers-reduced-motion

## Resumen — 17 hallazgos (5 altas · 10 medias · 2 bajas)

| # | Hallazgo | Gravedad | Dónde |
|---|---|---|---|
| K-01 | El anillo de foco no se ve en `.btn-primary` ni `.btn-accent` | **alta** | `app/styles/screens.css:73,75,313` |
| K-02 | El anillo de foco da 2,37:1 sobre blanco (mínimo 3) | **alta** | `app/styles/tokens.css:141` |
| K-03 | Bordes de input a 1,39:1 (mínimo 3) | **alta** | `app/styles/tokens.css:81` + `app.css:245-248` |
| K-14 | Los 10 campos del modal Adjudicar sin label programática | **alta** | `app/lib/scr-teacher.ts:793` |
| K-15 | El botón de enviar de Mensajes sin nombre accesible | **alta** | `app/lib/scr-community.ts:142` |
| K-04 | Login sin landmarks (`<main>`) | media | `app/components/Auth.tsx` |
| K-05 | Login sin `autocomplete` (1.3.5) | media | `app/components/Auth.tsx` |
| K-06 | Escape no cierra el menú "Más" ni el de usuario | media | `app/components/Aula.tsx:940-956` |
| K-07 | `role="menu"` sin el patrón de teclado APG | media | `app/lib/shell.ts:202,245,268` |
| K-08 | "Más" se anuncia como "Menú" (Label in Name) | media | `app/lib/shell.ts:244` |
| K-09 | Saltos de nivel de encabezado (h1→h3, h1→h4) | media | 8 de 11 pantallas |
| K-10 | `aria-current` ausente en tabbar móvil y menú "Más"; tabbar sin nombre | media | `app/lib/shell.ts:202,210,286` |
| K-11 | "Salir" es un `<a href="#">` (acción como enlace) | media | `app/lib/shell.ts:277` |
| K-12 | `prefers-reduced-motion` no para la animación infinita del login | media | `app/styles/screens.css:191` |
| K-16 | Campos de Mensajes con placeholder como único nombre | media | `app/lib/scr-community.ts:141` |
| K-13 | Un `<svg>` sin `aria-hidden` | baja | `app/lib/scr-learn.ts` (`.ring-wrap`) |
| K-17 | Botones solo-icono que dependen de `title` | baja | `app/lib/scr-teacher.ts` |

Lo que **no** falla: la accesibilidad de los modales (trampa de foco, Escape y retorno de foco
funcionan en los dos auditados), el anillo del resto de controles, el skip link, el `<main>`
enfocable de la SPA y el `aria-current` de los links inline del top-nav. Detalle al final.

## Hallazgos

### K-01 · El anillo de foco no se ve en NINGÚN `.btn-primary` ni `.btn-accent` — ALTA

`app/styles/app.css:19` implementa el foco como **box-shadow**:
`:focus-visible{outline:none;box-shadow:var(--ring)}` (especificidad 0,1,0).

`app/styles/screens.css:73-76` lo pisa con **más especificidad** (0,2,0):

- `app/styles/screens.css:75` → `.btn.btn-primary{…;box-shadow:none}`
- `app/styles/screens.css:73` → `.btn.btn-accent{…;box-shadow:none}`
- `app/styles/screens.css:313` → `.rec-btn.recording{…;box-shadow:none}` (mismo patrón, botón de grabar)

Resultado medido en el botón **"Entrar al aula"** del login (`.btn.btn-primary.btn-block`),
con foco de teclado y `:focus-visible` activo (`matchesFV: true`):

```
outline: "3px none"      ← el outline está anulado por app.css:19
box-shadow: "none"       ← el anillo está anulado por screens.css:75
```

No queda NINGÚN indicador. Es el CTA principal del login y el patrón de botón primario/acento
de toda la app (crear curso, guardar, publicar, adjudicar…). Incumple WCAG 2.4.7 Focus Visible (AA).
El resto de paradas del login sí muestran el anillo (`rgba(200,64,26,.55) 0 0 0 3px`), lo que
confirma que el fallo es exclusivo de esas dos clases, no del sistema de foco.

**Dónde se ve en producto** (tabulado con teclado real, `shadow=none` en todos):

| Pantalla | Control ciego al foco |
|---|---|
| Login | "Entrar al aula" (`.btn.btn-primary.btn-block`) |
| Top-nav del coach | **"+ Crear"** (`.btn.btn-primary.btn-sm.tn-create`, shell.ts:251) |
| Dashboard alumna | "Únete a la sesión" (`.btn-accent.btn-lg`), "Unirse", "Inscribirme" |
| Panel de coach | "Calificar" (`.btn-accent.btn--sm`) |
| Modal Adjudicar | **"Adjudicar y publicar"** (`[data-ok].btn-primary`) |
| Modal Configuración de curso | **"Guardar"** (`[data-ok].btn-primary`) |

En los dos modales el botón de CANCELAR (`.btn-outline` / `.btn-ghost`) sí se ilumina y el de
CONFIRMAR no: con teclado, el foco parece perderse justo en el paso irreversible.

### K-02 · El anillo de foco no llega a 3:1 sobre fondo claro — ALTA

`app/styles/tokens.css:141` → `--ring:0 0 0 3px rgba(200,64,26,.55)`.

El alpha .55 compuesto sobre los dos fondos del sistema da **#E19681**:

| Anillo compuesto | Fondo | Ratio | Mínimo (WCAG 1.4.11) | Veredicto |
|---|---|---|---|---|
| #E19681 | blanco #FFFFFF | **2,37:1** | 3 | ❌ FALLA |
| #E19681 (sobre greige) | greige #F1F1EF | **2,25:1** | 3 | ❌ FALLA |
| #E19681 | botón negro #171717 | 7,57:1 | 3 | ✅ |

Es decir: el foco de teclado es perceptible sobre superficies oscuras, pero sobre el blanco y
el greige —que son el 95% de la interfaz— el anillo no alcanza el contraste mínimo de un
indicador de estado. Con el color pleno `#C8401A` (sin alpha) daría 4,84:1 sobre blanco.

### K-03 · Los inputs no tienen borde con 3:1 — ALTA (fleco de a11y.md)

Medido en reposo sobre el login (`#auth-password`): borde `#DCDBD6` (`--border-strong`, 1px)
sobre fondo de input blanco y página blanca → **1,39:1**. El límite de WCAG 1.4.11 para el
contorno de un control es 3:1, y aquí no hay ningún otro límite visual (el fondo del input es
el mismo blanco de la página). Detalle completo y resto de pantallas en
`docs/review/GOAL_2026-08_a11y.md` §Bordes.

### K-04 · Login sin landmarks — MEDIA

`app/components/Auth.tsx`: la pantalla de login no tiene ni `<main>` ni `<header>` ni `<nav>`;
los únicos roles del documento son los dos `role="group"` de los toggles (Idioma, ¿Quién eres?).
Verificado en DOM: `header,nav,main,footer,aside` → 0 elementos. Un usuario de lector de pantalla
no puede saltar al contenido principal (la app SÍ tiene `<main id="content">`, shell.ts:284 —
es solo el login el que se queda sin él).

### K-05 · Inputs del login sin `autocomplete` — MEDIA

`#auth-email` (type=email) y `#auth-password` (type=password) no declaran `autocomplete`
(`autocomplete: null` en DOM). WCAG 2.1 **1.3.5 Identify Input Purpose (AA)** pide
`autocomplete="email"` / `"current-password"`. Además impide el autorrelleno del gestor de
contraseñas, que es la vía de acceso de mucha gente con discapacidad motriz.

### K-06 · Ni el menú "Más" ni el de usuario cierran con Escape — MEDIA

Medido con teclado real sobre el dashboard de la alumna:

| Paso | Menú "Más" (`<details>`, shell.ts:243) | Menú de usuario (shell.ts:257-268) |
|---|---|---|
| Enter sobre el disparador | abre (`open`) ✅ | abre (`aria-expanded=true`, `hidden=false`) ✅ |
| Tab | entra al primer ítem visible ("Buscar nuevos" / "Perfil") ✅ | ✅ |
| **Escape** | **sigue abierto** ❌ | **sigue abierto, `aria-expanded` se queda en `true`** ❌ |

`app/components/Aula.tsx:940-956` solo cierra el menú de usuario con un **click** fuera; no hay
ningún `keydown` de Escape para popovers (el único handler de Escape, `onModalKey` en
Aula.tsx:1160, exige un `.modal-scrim` y devuelve antes si no lo hay). Con teclado no existe
forma de descartar el menú abierto sin activar un ítem. No es trampa de foco (se puede tabular
fuera), pero el panel se queda flotando sobre el contenido.

Sobre `aria-expanded`: el chip de usuario lo declara y lo actualiza bien (`false`→`true` al
abrir, Aula.tsx:946) — solo se queda desincronizado cuando el menú se queda abierto tras
Escape. El `<summary>` de "Más" no lo lleva y **no le hace falta**: el `<details>` nativo ya
expone el estado expandido/colapsado al lector. Ese punto del alcance está cubierto.

### K-07 · `role="menu"`/`role="menuitem"` sin el patrón de teclado que prometen — MEDIA

`app/lib/shell.ts:245` (`<div class="tn-menu" role="menu">`), `shell.ts:268`
(`<div class="tn-usermenu" role="menu">`) y los `<a role="menuitem">` de `shell.ts:202` y
`shell.ts:269-277`. Ese rol le promete al lector de pantalla el patrón APG de menú: flechas
arriba/abajo, Home/End, Escape y **un solo tab-stop** (roving tabindex). Aquí no hay nada de
eso: se navega con Tab ítem a ítem y las flechas no hacen nada. Son listas de enlaces de
navegación, no comandos de menú.

### K-08 · El disparador "Más" se llama "Menú" para el lector de pantalla — MEDIA

`app/lib/shell.ts:244`: `<summary aria-label="${t('top.menu', lang)}">…<span class="lbl">Más</span>`.
El `aria-label` **pisa** el texto visible: el nombre accesible es "Menú" y el texto en pantalla
es "Más". Incumple WCAG 2.5.3 **Label in Name (A)**: quien usa control por voz dice "Más" y no
pasa nada. Además duplica el nombre del landmark hermano `<nav class="tn-links" aria-label="Menú">`
(shell.ts:241), así que el lector anuncia dos cosas distintas con el mismo nombre.

### K-09 · Saltos de nivel en los encabezados — MEDIA

Recorrido de `main h1..h6` por pantalla (alumna):

| Pantalla | Secuencia | Veredicto |
|---|---|---|
| Dashboard | h1 → h2 → h3 h3 h3 → h4 | ✅ sin saltos |
| Eventos | h1 → h2 → h3 h3 | ✅ sin saltos |
| Debate Hub | h1 → **h3** "Debates recientes" → h4 h4 | ❌ salto h1→h3 |
| Cursos | h1 → **h3** "Mis reservas" → h4 h4 | ❌ salto h1→h3 |
| Niveles | h1 → **h4** "Camino a OTR Strategist" → h4 → **h3** "Subidas recientes" | ❌ salto h1→h4 y además h3 DESPUÉS de h4 |

Builders: `app/lib/scr-debate.ts`, `app/lib/scr-core.ts` (Mis reservas), `app/lib/scr-learn.ts`
(Progreso y niveles). Todas tienen exactamente un `<h1>`, que es lo importante; lo que falla es
la escalera intermedia.

### K-10 · `aria-current` solo en los links inline del top-nav — MEDIA

`app/lib/shell.ts:188` pone `aria-current="page"` en el link activo de la barra. No lo ponen:

- `app/lib/shell.ts:202` — los ítems del menú "Más" (`.tn-mi.active` lleva solo la clase).
- `app/lib/shell.ts:210` — **el tabbar móvil**. Verificado a 390px: `nav.tabbar` está en
  `display:flex`, `nav.tn-links` en `display:none` → en móvil el tabbar ES la navegación, y
  sus 5 enlaces devuelven `aria-current = null`. El usuario de lector de pantalla en móvil no
  tiene forma de saber en qué sección está.
- El mismo `nav.tabbar` (shell.ts:286) no tiene `aria-label`: en móvil queda un landmark de
  navegación sin nombre.

### K-11 · Acciones implementadas como enlaces — BAJA/MEDIA

- `app/lib/shell.ts:277` — **"Salir"** es `<a class="tn-mi" href="#" data-action="logout">`.
  Cerrar sesión es una acción, no un destino: debería ser `<button>` (WCAG 4.1.2 / patrón). Con
  el JS caído el enlace deja al usuario en `#` creyendo que salió. MEDIA.
- `app/lib/scr-core.ts` — "Ver todo" (`a.hl-all`) y "Ver todas las insignias" (`a.db-foot`) usan
  `href="#"` con `data-go="events"` / `data-go="badges"`. Sí navegan (el delegador los atiende),
  pero pierden ctrl+click / abrir en pestaña nueva y ensucian el historial. BAJA.

### K-12 · `prefers-reduced-motion`: bien lo grande, se escapan dos cosas — MEDIA

Medido emulando la preferencia en Chromium (`emulateMedia`), comparando `getComputedStyle`
antes/después:

| Elemento | Normal | Con `reduce` | |
|---|---|---|---|
| `.content > .page` (entrada de cada pantalla) | `riseIn 0.5s` | `none 0s` | ✅ |
| `.card` | `transition box-shadow, border-color .18s` | `none 0s` | ✅ |
| `.otr-shine::after` (app.css:35), `.hl-img` (screens.css:1060) | — | apagados por regla propia | ✅ |
| Modales/toasts (`enter()`, Aula.tsx:159) | fade-up JS | consulta `matchMedia` y no anima | ✅ |
| **`.lb-wave i` del login** (screens.css:191) | `lbw 1.6s infinite` | **`lbw 1.6s infinite`, `state=running`** | ❌ |
| `.tn-more > summary .chev` (app.css:113) | `transform .2s` | **`transform .2s`** | ❌ |
| `.module-head .chev` (screens.css:259), `.rate-star svg` (screens.css:562) | `transform .2s/.15s` | sin regla que las apague | ❌ |

El caso grave es el primero: las barras del ecualizador del login (`app/components/Auth.tsx:413`,
estilo en `app/styles/screens.css:191`) se escalan **en bucle infinito** y la preferencia del
sistema no las detiene — verificado con `animationPlayState: running` bajo `reduce`. Es también
un roce con WCAG 2.2.2 (contenido en movimiento automático y perpetuo sin control para pararlo).
El bloque de `app/styles/app.css:493-507` no las contempla.

### K-13 · Un `<svg>` sin `aria-hidden` — BAJA

En "Cursos" hay 1 de 22 `<svg>` sin `aria-hidden="true"` y sin `<title>`: el del anillo de
progreso, dentro de `span.ring-wrap` (`app/lib/scr-learn.ts`). Los otros 21 lo llevan. Sin
nombre ni ocultación, algunos lectores lo anuncian como gráfico vacío.

### K-14 · Los 10 campos del modal "Adjudicar" no tienen label programática — ALTA

`app/lib/scr-teacher.ts:793` define el helper de campo así:

```js
const fld = (label, html) => `<div class="field"><label class="label">${label}</label>${html}</div>`;
```

El `<label>` **no tiene `for`** y **no envuelve** al control. Verificado en el modal abierto
(coach → Participantes → Adjudicar): los 10 controles dan `label:false`, `aria-label:null`,
`aria-labelledby:null`.

| Control | id | Texto visible al lado | Nombre accesible |
|---|---|---|---|
| `<select>` Resultado | `bl-result` | "Resultado" | **ninguno** |
| `<select>` Formato | `bl-format` | "Formato" | **ninguno** |
| `<input>` Oponente | `bl-opp` | "Oponente (opcional)" | solo el placeholder |
| `<select>` Compañero | `bl-partner` | "Compañero de equipo (2v2)" | **ninguno** |
| 5 × `<input type=number>` rúbrica | **sin id** | Argumentation / Rebuttal / Delivery / Evidence / Crossfire (en un `<span>`, scr-teacher.ts:801) | **ninguno** |
| `<textarea>` Comentarios | `bl-comments` | "Comentarios del juez" | solo el placeholder |

Los cinco campos de puntuación son el caso grave: idénticos entre sí, sin id, sin nombre — un
lector de pantalla anuncia cinco veces "spin button, 7" sin decir cuál criterio es. Incumple
WCAG 1.3.1 y 4.1.2 (A). **El contraste es que `formModal` (Aula.tsx:246) sí lo hace bien**
(`for`/`id`, `aria-required`, `aria-describedby`): el defecto es exclusivo de `buildModal` +
`fld()` de `scr-teacher.ts` — el mismo helper que usan los modales de quiz, video y recurso
(scr-teacher.ts:313, 445, 551).

### K-15 · El botón de ENVIAR de Mensajes no tiene nombre accesible — ALTA

`app/lib/scr-community.ts:142` — `#chat-send` es un botón solo-icono (flecha `IC.arrowR`) sin
texto, sin `aria-label` y sin `title`:

```html
<button class="btn btn-primary" id="chat-send" style="width:42px;padding:0"><svg class="ic" …
```

El árbol de accesibilidad real de Chromium lo expone como `- button` **a secas**. Es el único
control para enviar un mensaje en toda la pantalla de Mensajes. WCAG 4.1.2 (A). Único botón
solo-icono SIN nombre de todo el barrido; ver K-17 para los que se apoyan solo en `title`.

### K-16 · Los campos de Mensajes solo tienen placeholder — MEDIA

En la pantalla Mensajes, `#chat-input` (`app/lib/scr-community.ts:141`) y el buscador de conversaciones
("Buscar…") no tienen `<label>`, ni `aria-label`, ni `aria-labelledby`: su único nombre es el
`placeholder`, que desaparece en cuanto se escribe y que varios lectores no anuncian como
nombre. WCAG 1.3.1 / 3.3.2. (En contraste, el buscador de Participantes `#pt-search` sí tiene
`<label for>` — el patrón correcto ya existe en el repo.)

### K-17 · Botones solo-icono que dependen de `title` — BAJA

`app/lib/scr-teacher.ts` (Panel de coach): 2 × `<button class="btn btn-outline btn--sm"
data-go="messages" title="Enviar mensaje">` con solo un `<svg>` dentro. Chromium SÍ calcula el
nombre desde `title` (el árbol devuelve `button "Enviar mensaje"`), así que no es un fallo
duro, pero `title` es el último recurso de la cadena de nombre: no aparece en táctil, no lo
anuncian todos los lectores y no se traduce con el resto de la UI. Debería ser `aria-label`.

### Lo que SÍ está bien

**Login**
- Labels reales: `<label for="auth-email">Correo` y `<label for="auth-password">Contraseña`
  (asociación verificada en DOM, no `aria-label` postizo).
- Jerarquía h1 → h2 sin saltos (h1 "Domina la sala…", h2 "Inicia sesión").
- El único `<svg>` decorativo lleva `aria-hidden="true"`.
- 0 botones solo-icono sin nombre en esta pantalla.
- Orden de tabulación = orden visual, sin trampas ni paradas fantasma.

**Foco visible (todo lo que no sea `.btn-primary`/`.btn-accent`)**
- Top-nav completo de alumna y de coach: logo, los 5 links, "Más", campana y chip de usuario —
  anillo presente en las 10 paradas.
- Skip link "Saltar al contenido": aparece al enfocarlo y usa `outline` real de 3px
  (app.css:206), no el box-shadow, así que sobrevive incluso al problema K-01.
- Chips de filtro, links de contenido, inputs y `<select>`: anillo presente.
- `@media (forced-colors: active)` (app.css:23-26) restaura un `outline` de sistema para el
  modo alto contraste — bien pensado.

**Modales (los dos auditados)** — `enhanceModal` de `app/components/Aula.tsx:1145-1184` es sólido:

| Comprobación | Adjudicar (`buildModal`) | Configuración de curso (`formModal`) |
|---|---|---|
| `role="dialog"` + `aria-modal="true"` | ✅ | ✅ |
| `aria-labelledby` → id autogenerado del `<h3>` | ✅ `mdl-title-1` | ✅ `mdl-title-2` |
| Foco inicial dentro del diálogo | ✅ primer campo | ✅ primer campo |
| **Trampa de Tab** (18 y 14 tabulaciones seguidas) | ✅ nunca sale, cicla | ✅ nunca sale, cicla |
| Shift+Tab desde el primero → último | ✅ | ✅ |
| **Escape cierra** | ✅ | ✅ |
| **El foco VUELVE al disparador** | ✅ (`activeElement === trigger`) | ✅ |

El único fallo dentro de los modales es el botón primario sin anillo (K-01) y, en Adjudicar,
los campos sin label (K-14). El modal de progreso ignora Escape a propósito (Aula.tsx:1163),
lo cual es correcto: no tiene botón de cerrar.

**Semántica general**
- Un solo `<h1>` por pantalla en las 11 pantallas revisadas.
- `<main id="content" tabindex="-1">` con `aria-label`, y el foco se mueve a él en cada
  navegación SPA (Aula.tsx:130) — así el lector anuncia el cambio de pantalla.
- 21 de 22 `<svg>` decorativos con `aria-hidden="true"`.
- Enter y Espacio activan los `[role="button"][tabindex]` (Aula.tsx:1130) — los tiles que no
  son `<button>` nativos siguen siendo operables con teclado.

## Cobertura (qué se tabuló y qué no)

**Tabulado con teclado real:** login (10 paradas), dashboard de alumna (22 paradas), top-nav de
alumna y de coach (11 paradas), menú "Más", menú de usuario, modal Adjudicar (18 tabulaciones) y
modal Configuración de curso (14 tabulaciones).

**Auditado por DOM/árbol de accesibilidad** (encabezados, landmarks, labels, nombres accesibles,
`aria-current`): dashboard, Eventos, Debate Hub, Cursos, Niveles (alumna); Panel de coach,
Reservas e ingresos, Mis cursos, Mis clases, Mensajes, Participantes, Mi perfil (coach); y los
modales Adjudicar, Configuración de curso y Publicar una clase.

**No auditado** (queda fuera): pantallas de admin y de familia, Marketplace/Explorar, el
constructor de cursos por dentro (drag & drop — su accesibilidad de teclado merece pasada
propia), el flujo de grabación (`.rec-btn`, solo detectado por CSS) y el registro/recuperación
de contraseña. Tampoco se probó con un lector de pantalla real (VoiceOver/NVDA): todo lo de
aquí es árbol de accesibilidad de Chromium + `getComputedStyle`.
