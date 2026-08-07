# OTR LMS · Aula

LMS de **OTR Debating Academy**. Las pantallas del Aula son templates string en
HTML + CSS + JS vanilla montados sobre Next.js (ver `docs/SYSTEM_MAP.md`).

## Estructura
```
index.html            # shell + router + montaje de pantallas
tokens.css            # design tokens (Brand Book V1.0)
app.css               # shell + librería de componentes
screens.css           # estilos por pantalla
responsive.css        # mobile-first (drawer + bottom tabs)
icons.js              # set de íconos (stroke)
data.js               # contenido placeholder (reemplazable)
components.js         # helpers de UI (avatar, badge, bar, kpi, ring…)
app.js                # router por hash, login, notificaciones, toasts, modal
screens-core.js       # dashboard, curso, índice, lección
screens-learn.js      # tarea/grabador, examen, resultados, reproductor, notas
screens-teacher.js    # panel profesor (tracking), calificador, participantes
screens-profile.js    # progreso/niveles, insignias/certificados, perfil
screens-community.js  # foro, hilo, mensajería
screens-kit.js        # Design System / Kit
```

## Cómo correrlo
Es estático. Sirve la carpeta con cualquier servidor:
```bash
npx serve .        # o: python3 -m http.server
```
Abre `index.html`. La app arranca en el login → "Entrar al aula".

## Pantallas (15 + kit)
Login · Dashboard/Mis cursos · Vista de curso · Índice · Lección · Entrega (grabador) ·
Examen + Resultados · Reproductor · Panel del profesor · Calificador · Participantes ·
Progreso/Niveles · Insignias/Certificados · Perfil · Foro · Hilo · Mensajería · Design System.

## Marca
**OTR Brand Book V1.0 (2026)**: paleta estricta de negro `#171717`, blanco `#FFFFFF` y
naranja `#F25623` como único acento (con moderación) sobre una rampa de grises fríos
(`#4D4D4D`, `#DEDEDE`). Botón primario negro; **Inter** única familia (titulares 800,
tracking -0.03em); radios 8px en controles y 12px en tarjetas; escudo monocromo.
Niveles: Novato → JV → Varsity → Strategist → Elite (gris claro → negro → naranja).
Valores en `app/styles/tokens.css`, detalle en `BRAND.md` y `docs/CONVENTIONS.md`;
el test `tests/brand-palette.test.ts` bloquea cualquier resto de la paleta anterior.

## Pendiente
- Estados vacíos/error en todas las pantallas
- Datos reales (cursos, alumnos, notas)
- Dark mode (fase 2) · bilingüe ES/EN dentro del aula
