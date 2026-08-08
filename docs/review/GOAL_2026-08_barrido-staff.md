# GOAL 2026-08 — Barrido de pantallas STAFF (coach / familia / admin)

Diagnóstico post-rebrand + rediseño. **Solo lectura**: no se tocó código.

- Rama: `feat/goal-extras`
- Servidor: `PORT=3026 npm run dev` (local)
- Logins: `saul@otr.do` (coach), `rosa.fermin@otr.do` (familia), `admin@otr.do` (admin)
- Viewport desktop 1280 y móvil 390; idioma ES y EN.

## Estado

_En curso — este informe se va rellenando pantalla por pantalla._

## Hallazgos

| rol | pantalla | estado | qué exactamente | archivo:línea | gravedad |
| --- | --- | --- | --- | --- | --- |
| coach | teacher (`#teacher`) | OK | Render limpio a 1280, 0 errores de consola. Pestañas Grupo/Contenido conmutan (Grupo: KPIs 90%/50%/66%/2 + tabla de 8 alumnos; Contenido: 5 cursos, 5 módulos, 16 lecciones, 3 exámenes). Sin scroll horizontal (scrollWidth=clientWidth=1280). | — | — |
| coach | teacher (`#teacher`) | defecto | Botones de acción por alumno (`.ev-actions .btn-outline`) son solo-icono con `title="Enviar mensaje"` y **sin `aria-label`**: lector de pantalla los anuncia vacíos. | app/lib/scr-teacher.ts | baja |
| coach | participants | OK | Render limpio, 0 errores. Filtros Todos·9 / Estudiantes·8 / Coaches·1 / En riesgo·2 y tabla con XP y último acceso. Sin scroll horizontal a 1280. | — | — |
| coach | participants → modal **Adjudicar** | OK | Abre `.modal.modal--v2` "Adjudicar ronda · Isabella Guzmán" con Resultado (2 opc.), Formato (4), Oponente (texto), Compañero (8 opc.), rúbrica de 5 sliders numéricos (valor 7) y Cancelar / Adjudicar y publicar. | — | — |
| coach | participants → modal Adjudicar | defecto | El modal mide **860 px de alto**; con 900 px de viewport queda a 20 px del borde y en portátiles de 800 px de alto los botones Cancelar/Adjudicar quedan fuera de pantalla (el `.modal` no tiene scroll propio). | app/lib/scr-teacher.ts (modal Adjudicar) | media |
| coach | coachwork | OK | Render limpio, 0 errores. Las 3 pestañas conmutan: Agenda (2 próximas sesiones + historial), Ingresos ($90 escrow / $45 liberado / $36.90 payout / take rate 18%), Disponibilidad (tarifa $45/h + 6 franjas). Sin scroll horizontal ni texto cortado a 1280. | — | — |
| coach | manage (Mis cursos) | OK | Render limpio, 0 errores. 5 cursos con badge PUBLICADO y trío Construir/Configuración/Eliminar. "Configuración" abre el modal "Editar curso" (nombre, formato, modalidad, cupo, video, layout, estado) y cierra bien. Sin scroll horizontal ni texto cortado a 1280. | — | — |
| coach | my-listings (Mis clases) | OK | Render limpio, 0 errores. Empty state correcto ("Aún no has publicado clases") y el botón "Publicar clase" abre el modal con materia (9 opciones), título, descripción, tarifa y modalidad; cierra bien. Sin scroll horizontal a 1280. | — | — |
| coach | my-listings vs coachwork | defecto | **Moneda inconsistente**: el modal de publicar clase pide "Tarifa por hora (**RD$**) *" mientras coachwork/Disponibilidad muestra "Tarifa por hora: **$45**/hora" y los ingresos van en `$` ($90 escrow, $36.90 payout). Mismo dato, dos monedas. | app/lib/scr-my-listings.ts vs app/lib/scr-coachwork.ts | media |
| coach | messages | OK (parcial) | Render limpio, 0 errores. Cambiar de conversación funciona (`.convo.active` se mueve) y el composer existe. Sin scroll horizontal a 1280. | — | — |
| coach | messages | defecto | La conversación abierta se etiqueta con **el propio coach**: cabecera y lista dicen "SM · Coach Saúl Méndez" aunque el hilo es con Analía ("¡Hola Analía! Vi tu diagnóstico…"). Debería mostrar la contraparte, como sí hace el hilo de Diego Fermín. | app/lib/scr-community.ts (bloque messages) | media |
| coach | messages | defecto | El hilo de **Diego Fermín** abre **vacío** (0 burbujas, solo el separador "Hoy") pese a que la lista previsualiza "Gracias coach · hace 2h". Preview y detalle no coinciden. | app/lib/scr-community.ts / app/lib/queries.ts | media |
| todos | **global (router)** | defecto | La navegación NO sincroniza la URL: tras pulsar "Participantes" `window.__route === 'participants'` pero `location.hash` sigue en `#teacher`. `renderApp()` se llama tras `e.preventDefault()` sin tocar el hash → sin deep-link, sin botón Atrás, y F5 devuelve a la pantalla anterior. | app/components/Aula.tsx:1114 | media |
