# OTR Aula — Scientific Product Excellence Review

Behavioral UX/product/cognitive/usability audit + refactor of the OTR Aula LMS
(`/aula`, Next.js 15 SPA). Driven live in-browser (Preview MCP) across every
screen and all four roles (student · coach/teacher · parent · admin).

## Method
- **Capture** (`capture/`): live behavioral notes per role — what renders, broken
  states, empty states, console/network errors. Grounded in the running app.
- **Analysis** (`findings/`): 14-lens evaluation (IA, cognitive walkthrough,
  Nielsen heuristics, cognitive load, visual hierarchy, scanability, content
  reduction, design system, accessibility, exploratory QA, simplification,
  benchmarking) fanned out across screens, with adversarial verification.
- **Scoring** (`SCORES.md`): per-screen 0–10 across 11 axes + overall product score.
- **Fixes**: implemented in `app/lib/scr-*.ts` + `app/styles/*.css`, re-validated live.

## Environment
- Run: `npm run dev` (port 3000) → `/aula`
- Demo logins (password `otr1234`):
  - Student: `analia.reyes@otr.do` (PRO, Varsity)
  - Coach:   `saul@otr.do` (TEACHER, verified)
  - Parent:  `rosa.fermin@otr.do` (guardian of Diego)
  - Admin:   `admin@otr.do`
- Live UI source: `app/lib/scr-*.ts` (string-template screens) · `app/components/Aula.tsx` (SPA engine) · `app/lib/shell.ts` (nav) · `app/styles/*.css`
- Nav in-app: `window.go('<route>')` (routes in `app/lib/screens.ts`)
