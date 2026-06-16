# ADR-0001 — Monolito Next.js (no microservicios)
**Estado:** Aceptado · **Fecha:** 2026-06 · **Decisor:** Wilser (dev) · validado en auditoría CTO

## Contexto
LMS + marketplace de debate, 1 desarrollador, presupuesto ajustado, objetivo ~3.000 usuarios. Hay que elegir topología.

## Decisión
**Un solo monolito Next.js (App Router)** que sirve landing + SPA (Aula) + API, desplegado como un contenedor sobre 1 VPS, con PostgreSQL al lado.

## Consecuencias
- **+** Una sola base de código, un solo deploy, un solo proceso que un dev puede entender y operar. Cero overhead de orquestación. Coste mínimo.
- **+** Suficiente para 3.000 usuarios con cluster + Redis + PgBouncer (ver ROADMAP) — sin reescribir.
- **−** SPOF: todo en un proceso/VPS. Mitigado con backups + (futuro) réplica.
- **−** No escala a equipos grandes con límites de servicio claros; aceptable a esta escala (Conway: 1 dev = 1 servicio).
- **Revisar si:** el equipo crece a 5+ devs con dominios separados, o un subsistema (video, IA de calificación) necesita escalar/desplegar independientemente.
