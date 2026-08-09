# Plan de reparación — defectos del sondeo 2026-08-09

Repara lo hallado en `SONDEO_2026-08-09.md`. Planificado con Fable, ejecutado por **3 agentes Opus 5** en worktrees con ownership de archivos disjunto (sin colisiones), base `origin/main` (449abf4). Cada frente: investigar → fix mínimo → test → gate → clicks. Revisión adversarial por frente antes de integrar. Debate Hub: solo cara de rol admin, SIN tocar su diseño (pedido de Isaac).

## Frente A — Visual/CSS (`app/styles/screens.css` + builder de modal si falta estructura)
- **G1** Modales genéricos sin scroll: dar al `.modal` BASE (screens.css:539) el tratamiento que hoy solo tiene `.modal--v2` — `display:flex;flex-direction:column;max-height:calc(100vh - 40px)`, `.modal-body{overflow-y:auto}`, head/foot `flex:none`. Así Calificar entregas y Editar curso heredan scroll. Si "Calificar entregas" no tiene `.modal-body`, darle la estructura en su builder.
- **G3** Portal de familia @375: la tarjeta "X quiere reservar con Y" se parte letra por letra → arreglar el flex/grid que colapsa a ancho ~0.
- **G4** Dashboard @375: `.dash-lb .dlb-head` (screens.css:1001) el ranking se superpone con su meta cuando el h3 pasa a 2 líneas → `flex-wrap`/reflow.
- Email con elipsis en Ajustes móvil (menor cosmético) si es 1 línea.

## Frente B — Marketplace/rating (`scr-marketplace.ts`, `scr-profile.ts`, `components.ts`, `i18n-keys`)
- **G2** Nav congelada tras ficha de coach: al re-renderizar la ruta marketplace/explore, limpiar el sub-estado de la ficha abierta (`window.__coach*`/detail) para que un clic del top-nav vuelva a la lista en vez de quedar congelado. Verificar con el router por hash.
- **M3** Estrellas inconsistentes: consolidar a UNA implementación de estrellas (helper en components.ts) usada por marketplace y perfil, rellenas de forma coherente con el rating.
- Menor: política de cancelación del coach sin traducir bajo heading EN.

## Frente C — Roles/estado (`scr-debate.ts`, `scr-parent.ts`, `scr-settings.ts`, `i18n`)
- **M1** Debate Hub sin rama admin: el admin ve rating Glicko falso + "Regístrame". Añadir rama de rol que muestre una cara honesta (sin datos de competidor). NO cambiar el diseño/función para student/coach.
- **M2** Aprobar reserva no refresca "Próximas" hasta F5: tras el 200, refrescar la UI (mismo patrón de repintado que el resto).
- Menor: Ajustes muestra "Gestionar membresía / Mi trayectoria" al admin → filtrar por rol (el ítem 2FA ya es admin-aware, seguir ese patrón).

## Gate + cierre
Cada frente: tsc + vitest COMPLETA (base main) + TZ=UTC + eslint 0 errores + clicks reales (pueden usar el harness `scratchpad/qa-harness.mjs` apuntado a su dev local). Revisión adversarial → integración con conflictos resueltos por Fable → gate integrado → PR → merge → deploy VPS → re-verificación en prod de los 4 graves.
