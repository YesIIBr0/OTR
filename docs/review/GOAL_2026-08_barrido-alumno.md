# GOAL 2026-08 · Barrido visual/funcional del rol ALUMNO (post-rebrand)

- **Fecha**: 2026-08-08
- **Rama**: feat/goal-extras (solo diagnóstico, sin cambios de código)
- **Entorno**: `PORT=3021 npm run dev` → Next tomó el **3024** (3021 ya ocupado); las pruebas corren en `http://localhost:3024/aula`
- **Cuenta**: analia.reyes@otr.do (rol student)
- **Método**: Playwright — render, consola, interacción principal (`element.click()` real en el DOM), 390px

Leyenda de gravedad: **bloquea** / **molesta** / **cosmético**

## Hallazgos por pantalla

| Pantalla | Estado | Qué exactamente | Archivo:línea | Gravedad |
|---|---|---|---|---|
| (global) | defecto | **La URL no refleja la pantalla**: la navegación es `window.go(r)` puro y nadie escucha `hashchange`. Verificado: con la app abierta, cambiar el hash a `#course` NO repinta (sigue el dashboard), y el hash queda congelado en el de la primera carga mientras el título sí cambia. Sin deep-link ni back/forward dentro del Aula. | app/components/Aula.tsx:135 | molesta |
| (global) | defecto | La cookie `otr_lang=en` deja la UI **mezclada**: chrome y títulos en inglés ("Hi, Analía", "LESSONS", "STREAK") pero fechas y datos en español ("mar 11 ago · 4:00 PM", "sáb 15 ago"). Visto en dashboard antes de forzar `otr_lang=es`. | app/lib/i18n.ts:722 | molesta |
| dashboard | OK | Renderiza "Hola, Analía" + KPIs (#2 clasificación, 5 lecciones, 5 racha), próxima clase y "Próximos eventos". Cero errores de consola. Interacción principal OK: el filtro `Torneos` quita la CLASE del 11-ago y deja solo los 3 torneos. Sin restos de paleta vieja. | app/lib/scr-core.ts | — |
| dashboard | defecto | Texto cortado: el chip `SPAN:Semifinalista` (logro del ranking de agosto) desborda su caja con `overflow:hidden` y SIN `text-overflow:ellipsis` → se corta a media palabra. | app/lib/scr-core.ts | cosmético |
| dashboard | defecto | La "próxima clase" se titula literalmente **"Single"** (el tipo de sesión, no el curso/tema), tanto en el hero como en la tarjeta del 11-ago. Dato de seed, pero el alumno lee "Single" como título. | app/lib/scr-core.ts | molesta |
| course | OK | "Mis cursos" pinta los 3 cursos (PF-101 50%, LD-101 0%, ORA-101 0%) + detalle de Public Forum I con sub-tabs Contenido/Calificaciones, unidades y actividades. Cero errores, sin textos cortados, sin paleta vieja. Interacción principal OK: `Continuar` abre la entrega "Construye tu primer contention" (EN REVISIÓN) con el grabador de voz. | app/lib/scr-learn.ts | — |
| events | OK | Hero "Eventos" + contadores (3 próximos torneos / 2 próximos eventos), torneo destacado y las dos listas. Cero errores, sin textos cortados, sin paleta vieja. Interacción principal OK: `Inscribirme` en "Copa Lincoln-Douglas RD" cambia el botón a **INSCRITO** en el acto. | app/lib/scr-events.ts | — |
| debate | OK | Debate Hub pinta rating Glicko-2 (1720, tier ORO, ±80 RD), forma reciente W/L/W/W/L, y los 4 sub-tabs. Cero errores, sin paleta vieja. Interacción principal OK: el tab `Leaderboard` repinta el panel ("EL COHORT", #3 tu posición, 1720 rating). | app/lib/scr-debate.ts | — |
| badges | OK | "Insignias y certificados": 3 de 6 insignias + 3 certificados. Cero errores, sin textos cortados, sin paleta vieja. Interacción principal OK: `Ver certificado` abre el diploma con el nombre real ("Analía Reyes", Fundamentos de Oratoria, ago 2026) y botones Imprimir/Volver. | app/lib/scr-certificate.ts | — |
| lifetime | OK | "Tu historia en OTR": radar de 6 habilidades (promedio 82), 7 métricas de trayectoria y línea de tiempo de 17 hitos. Cero errores, sin textos cortados, sin paleta vieja; el switch icónico de perfil público sí tiene `aria-label="Perfil público"`. Interacción principal OK: `Copiar enlace` no lanza error y muestra el toast de enlace copiado. | app/lib/scr-lifetime.ts | — |
| progress | OK | "Progreso y niveles": 3120 XP, racha 5, escalera de 5 tiers con el actual (OTR Competitor) marcado, barra "1880 XP para OTR Strategist" y las 6 competencias. Cero errores, sin textos cortados, sin paleta vieja. | app/lib/scr-core.ts | — |
| progress | defecto | La pantalla **no tiene ni un solo control** (`main button` = 0): es 100% lectura, sin filtro, sin enlace a Logros ni a Debate Hub. Nada roto, pero no hay "interacción principal" que probar. | app/lib/scr-core.ts | cosmético |
