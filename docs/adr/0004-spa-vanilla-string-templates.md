# ADR-0004 — El "Aula" como SPA vanilla por string-templates dentro de Next
**Estado:** Aceptado (con deuda) · **Fecha:** 2026-06

## Contexto
La app interna (Aula) se portó de un prototipo HTML/JS. En vez de reescribirla en componentes React, se montó como una SPA vanilla: cada pantalla es una función que devuelve un string HTML (`app/lib/scr-*.ts`), un router propio (`screens.ts`: ROUTES/SCREENS) y un único componente React (`Aula.tsx`) que hace `root.innerHTML = ...` y delega clicks por `data-*`. Estado en `window.DB`.

## Decisión
Mantener el patrón string-template para el Aula (no migrar a componentes React por ahora).

## Consecuencias
- **+** Portar el prototipo fue rápido; 1 dev itera muy rápido en HTML plano sin ceremonia de componentes.
- **+** SSR del shell + hidratación simple; el contenido es solo strings.
- **−** Los `scr-*.ts` llevan `// @ts-nocheck` (sin type-safety en la UI). Re-render por `innerHTML` completo (no incremental). Sin code-splitting → `/aula` = 206 kB First Load (todas las pantallas viajan juntas). Estado global mutable sin reactividad (debugging más difícil).
- **−** XSS si se olvida `esc()`/`sanitizeHtml()` — mitigado por convención + CSP, pero frágil sin tipos.
- **Revisar si:** la UI crece mucho o entra un 2º dev frontend → migrar incrementalmente a componentes + code-split por ruta (ARCH-1/FE-1 en ACTION_PLAN), empezando por las pantallas opcionales. No urgente; el costo se paga una vez por sesión.
