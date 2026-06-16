# TEAM & PROCESS — OTR Academy (Fase 1 + lentes proceso/deps/docs)
**16 jun 2026 · CTO Protocol (Complete Edition).** Cómo se construye y entrega, no solo qué se construyó.

## CONTEXT (equipo) detectado
```
TEAM:            1 contribuidor (git shortlog: YesIIBr0 = 34 commits, 100%) + stakeholder no técnico (Isaac)
BRANCHING:       trunk-based de facto — main + ramas feat/*, fix/* (existen 5: lms-authoring-overhaul,
                 p0-7-moderation-core, p0-9-session-recording, phase1-platform-and-moodle, p0-security-hardening)
REVIEW:          NINGUNO — sin CODEOWNERS, sin PR template, sin required approvals; históricamente se mergea a main directo
CONVENTIONS:     Conventional Commits ✓ consistente (feat()/fix()/docs() con scope). Sin prettier/pre-commit dedicados.
STAKEHOLDERS:    Isaac (decisiones de producto, no técnico) + Wilser (dev único)
```

## Salud del proceso (por lente)

### Lente 8 — Equipo & Colaboración · 🔴 score 3/10
```
[TEAM-1] Bus factor = 1 (riesgo #1 del equipo)
Lens: team · Severity: High · Evidence: git shortlog -sn → 1 solo autor (YesIIBr0, 34/34 commits)
Why it matters: si esa persona se va o se enferma, NADIE puede mantener/operar el sistema. Todo el conocimiento
  (deploy VPS, gotcha del doble schema, mecánica de la SPA) es tribal y no está documentado para terceros.
Recommendation: documentar operación (ONBOARDING/CONVENTIONS/ADRs — entregados en Fase 7) + onboardear un 2º dev.
Effort: M · Risk: reversible · Leverage: systemic
```
```
[TEAM-2] Sin proceso de revisión (todo a main directo)
Lens: team/process · Severity: Medium · Evidence: sin CODEOWNERS/PR template; commits feat/fix directos en main
Why it matters: con 1 dev es tolerable, pero al sumar gente no hay red contra cambios rotos; nada fuerza una 2ª mirada.
Recommendation: branch protection en main + PR obligatorio cuando entre el 2º dev. Hoy: opcional. Tradeoff: fricción vs seguridad.
Effort: S · Risk: reversible · Leverage: systemic (escala con headcount)
```

### Lente 9 — Proceso & Entrega (CI/CD) · 🟡 score 6/10
```
[PROC-1] CI no corre tests (porque hay 0) ni lint
Lens: process · Severity: High · Evidence: .github/workflows/deploy.yml — gates = npm ci + prisma generate/validate + tsc --noEmit; sin "npm test" ni "next lint"
Why it matters: el gate de merge solo atrapa errores de tipos/schema, no de comportamiento. Un bug de lógica de dinero pasa el CI.
Recommendation: añadir "next lint" + (cuando existan) "vitest" al job ci. Hoy bloquea poco. Effort: S · Risk: reversible · Leverage: systemic
```
- **Lo BUENO:** CI/CD pull-based robusto (inmune a drops de red), build reproducible (Docker multi-stage), healthcheck que aborta deploys rotos, deploy determinista (down+up). Versionado/changelog: ausentes (sin CHANGELOG.md, sin tags de versión).

### Lente 10 — Documentación & Conocimiento · 🟡 score 5/10
- **Existe:** README, DEPLOY.md, BRAND.md, CONTRACT.md, IMPROVEMENT_PLAN.md, AUDIT.md/ROADMAP.md (raíz, previos). + los `docs/` de esta auditoría.
- **Falta (entregado en Fase 7):** ADRs (el "por qué" de las decisiones grandes no está escrito), runbooks de operación/incidentes, onboarding para terceros, API docs (OpenAPI). `[DOCS-1]` Medium · Leverage systemic.

### Lente 11 — Dependencias & Supply Chain · 🟡 score 6/10
```
[DEPS-1] Majors atrasados (no EOL, pero deuda creciente)
Lens: deps · Severity: Medium · Evidence: npm outdated → next 15.5.19→16.2.9 · prisma/@prisma/client 6.19.3→7.8.0 · typescript 5.9.3→6.0.3 · nodemailer 8→9
Why it matters: cuanto más se atrasan, más doloroso el salto; Prisma 7 y Next 16 traen cambios de API.
Recommendation: plan de upgrade por olas (TS 6 y nodemailer 9 primero, bajo riesgo; Next 16 / Prisma 7 con su guía de migración). Activar Renovate/Dependabot. Tradeoff: actualizar ya vs estabilidad. Effort: M · Risk: reversible · Leverage: systemic
```
```
[DEPS-2] CVEs: 1 high (dev-only) + 2 moderate
Lens: deps/security · Severity: Medium · Evidence: npm audit → esbuild (HIGH, solo dev server en Windows, NO llega a prod) + postcss (2 moderate vía next)
Why it matters: el HIGH no afecta producción (build-time/Windows). Los moderate son XSS de superficie baja.
Recommendation: NO npm audit fix --force; resolver con el bump de Next; Dependabot para PRs automáticos. Effort: S · Risk: reversible · Leverage: one-off
```
- Lockfile presente (`package-lock.json`), deps de prod mínimas (7), licencias permisivas (MIT/ISC típicas — *escaneo formal no corrido, riesgo bajo*). Bus de supply-chain: bajo (pocas deps directas).

## Resumen de gaps de proceso (qué falta para que el equipo escale)
| Falta | Hoy (1 dev) | Al sumar gente |
|---|---|---|
| CONTRIBUTING / ONBOARDING | tribal | **bloqueante** |
| CODEOWNERS + PR review | innecesario | **necesario** |
| Tests en CI | 0 tests | **crítico** |
| ADRs (el "por qué") | en la cabeza del dev | se pierde |
| CHANGELOG / versionado | ad-hoc | confuso |
| Renovate/Dependabot | manual | escala mal |

→ Lo accionable de esta fase se integra al `ACTION_PLAN.md` (TEAM-1, PROC-1, DEPS-1 ya rankeados). Onboarding/Conventions/ADRs se entregan en Fase 7.
