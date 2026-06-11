# OTR LMS · Aula (theme prototype)

Prototipo interactivo del LMS de **OTR Debate Academy** — theme hijo de *Boost* (Moodle).
Hecho con HTML + CSS + JS vanilla (sin build), pensado para mapear 1:1 a SCSS + plantillas Mustache.

## Estructura
```
index.html            # shell + router + montaje de pantallas
tokens.css            # design tokens (mapeables a variables SCSS de Boost)
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
Paleta estricta OTR (navy `#0C2340`, sky `#4FA9E8`, pale `#DCEEFB`), Inter para UI y
Archivo Expanded para momentos de marca. Niveles: Novato → JV → Varsity → Elite.

## Pendiente
- Mapeo de `tokens.css` → variables SCSS de Boost + plantillas Mustache
- Estados vacíos/error en todas las pantallas
- Datos reales (cursos, alumnos, notas)
- Dark mode (fase 2) · bilingüe ES/EN dentro del aula
