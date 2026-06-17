export const meta = {
  name: 'otr-aula-review-reports',
  description: 'Generate the named product-review report deliverables in parallel from the verified findings',
  phases: [{ title: 'Write reports' }],
}

const REPO = '/Users/wilserbatistamarcelino/repos/OTR_Academy'
const DIR = REPO + '/docs/review'
const OUT = DIR + '/reports'

const CTX = `
You are writing one report in a scientific product-excellence review of OTR Aula (a Next.js 15
debate-education LMS SPA; roles: student, coach, parent, admin). The audit already ran: read these
inputs and synthesize — do NOT re-audit.
INPUTS (Read these):
- ${DIR}/findings-raw.json — 128 findings (fields: id, screen, lens, severity, problem, rootCause,
  userImpact, businessImpact, recommendation, fixType, file, effort, confidence) + per-screen scores
  + confirmedHigh (adversarially verified) + rejectedHigh (refuted).
- ${DIR}/capture/behavioral-capture.md — live behavioral truth (all screens render, 0 console errors).
- ${DIR}/SCORES.md — per-screen 11-axis scores; OVERALL_PRODUCT_SCORE 6.9/10; accessibility weakest (5.5).
- ${DIR}/FIXES_APPLIED.md — what was already fixed + validated, and what is deferred.
RULES: ground every claim in a finding id or file path. Mark each issue you cite as FIXED, DEFERRED,
or OPEN by cross-referencing FIXES_APPLIED.md. Be concrete and skeptical; no filler. Use tight tables
where it helps scanning. Honor the simplification ethos (removal > addition). Keep it crisp.
Write the report as Markdown to the given path. Return only "wrote <path>".
`

const reports = [
  { file: 'EXECUTIVE_SUMMARY.md', scope: `EXECUTIVE SUMMARY. Lead with OVERALL_PRODUCT_SCORE and the headline: a polished, consistent product (strong dashboard/lesson/debate-hub) whose dominant gap is accessibility. Cover: methodology (live behavioral sweep of all screens×4 roles + 52-agent 14-lens audit with adversarial verification), top 10 issues by severity (note FIXED/DEFERRED), what was fixed this pass, per-role health, and a 1-paragraph enterprise-readiness verdict. Link to the other reports.` },
  { file: 'SIMPLIFICATION_REPORT.md', scope: `SIMPLIFICATION (the priority phase). Filter findings to fixType in [eliminate, merge, automate, simplify]. Organize into four sections — ELIMINATE / MERGE / AUTOMATE / SIMPLIFY. For each item give user impact, business impact, and a complexity-reduction score (1–5). Apply the disappear-test ("if this vanished tomorrow, would users miss it?"). End with the single highest-leverage simplification.` },
  { file: 'ACCESSIBILITY_REPORT.md', scope: `ACCESSIBILITY (WCAG 2.1 AA). Filter to fixType=a11y and any contrast/keyboard/semantic findings. Map issues to WCAG criteria (2.1.1 keyboard, 1.4.3 contrast, 4.1.2 name/role/value, 1.3.1 info & relationships, 2.4.6 headings/labels). Clearly separate FIXED (keyboard operability of cards/quiz/chips, ARIA labels, cc-pct contrast) from DEFERRED (heading h1 sweep, global .sky contrast). This is the weakest axis (5.5) — explain the path to AA.` },
  { file: 'HEURISTIC_EVALUATION_REPORT.md', scope: `HEURISTIC EVALUATION. Walk Nielsen's 10 heuristics; for each, cite the relevant findings (by id/screen) and give a 0–10 score with justification. Note strong points too (the product scores well on match-to-real-world and consistency). End with the heuristics most violated.` },
  { file: 'COGNITIVE_LOAD_AND_HIERARCHY_REPORT.md', scope: `COGNITIVE LOAD + VISUAL HIERARCHY + SCANABILITY. Apply Hick / Miller / Fitts / Jakob / Tesler. Use the cognitiveLoad, visualHierarchy, scanability scores + relevant findings (COG-01, dense screens like teacher/parentPortal, mobile stat-card verbosity). Identify the worst offenders and the screens that exemplify good hierarchy (dashboard, lesson, placement).` },
  { file: 'INFORMATION_ARCHITECTURE_REPORT.md', scope: `INFORMATION ARCHITECTURE + COGNITIVE WALKTHROUGH. Cover navigation structure across all 4 roles (from capture doc), discoverability, predictability, redundant routes (explore vs marketplace alias), role-gating clarity, and the IA findings (IA-01 fixed, search/CORE-02). Include a brief cognitive-walkthrough for the core student journey (login→placement→dashboard→course→lesson→quiz) and the coach journey.` },
  { file: 'DESIGN_SYSTEM_REPORT.md', scope: `DESIGN SYSTEM. From the DS findings + capture: token usage (cream/black/green/gold brand), component consistency (buttons, cards, KPIs, pills, tables, chips, modals), drift between scr-*.ts builders, and the chip span→button normalization (now consistent with marketplace). Note the systemic escaping contract (queries escapes; builders render raw) as a design-system rule and the double-escape that violated it (now fixed).` },
  { file: 'QA_REPORT.md', scope: `EXPLORATORY QA. The bug findings (fixType=fix-bug) + empty/error states. Tell the double-escape story (root cause, ~20 sites, validation). Note the environment artifacts that were NOT product bugs (stale .next cache 500s; login hydration mismatch). Confirm render health: every screen × 4 roles renders with 0 console errors (before and after fixes).` },
  { file: 'BENCHMARK_REPORT.md', scope: `ENTERPRISE BENCHMARK + CONTENT REDUCTION. For the key screens, would Stripe/Linear/Notion/Vercel ship them? Score enterprise-readiness per screen (use the scores) and say what would change. Fold in content-reduction findings (fixType=content + verbose surfaces): classify representative copy Required/Useful/Optional/Noise and target a 40–70% trim where flagged.` },
]

log(`Writing ${reports.length} review reports in parallel from the verified findings.`)
const results = await parallel(reports.map(r => () =>
  agent(`${CTX}\n\nWRITE THIS REPORT: ${r.scope}\n\nOutput path: ${OUT}/${r.file}`, { label: `report:${r.file}`, phase: 'Write reports' })
))
return { written: results.filter(Boolean).length, reports: reports.map(r => r.file) }
