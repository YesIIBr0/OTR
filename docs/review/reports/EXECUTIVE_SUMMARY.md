# Executive Summary — OTR Aula Product Excellence Review

**OVERALL_PRODUCT_SCORE: 6.9 / 10** (36 screens × 11 axes, pre-fix baseline)

**Headline:** OTR Aula is a polished, internally consistent product. The flagship surfaces — the student dashboard (7.3), the lesson reader (7.9, the highest-scoring screen), and the Debate Hub (6.7) — read as premium and behave correctly. Every screen renders for every role with zero console errors. The one dominant, systemic gap is **accessibility (5.5, the weakest of 11 axes)**: primary interactions were built as click-only `<div>`s, leaving the marketplace, quiz, and Debate Hub keyboard-dead. That class of defect was the bulk of this pass's fixes and is now substantially closed.

---

## Methodology

Two-stage, evidence-first. No claim here is unsourced — each maps to a finding id or a file path.

1. **Live behavioral sweep** — every screen driven in-browser (Preview MCP against `npm run dev`) across all **4 roles** (student `analia.reyes@otr.do`, coach `saul@otr.do`, parent `rosa.fermin@otr.do`, admin `admin@otr.do`). Result: **all screens render, 0 console errors, 0 thrown exceptions** — the behavioral ground truth (`capture/behavioral-capture.md`). Student swept 26 routes, coach 10, parent 7, admin 7.
2. **52-agent, 14-lens audit** — WCAG 2.1 AA, Nielsen heuristics, cognitive walkthrough, IA/discoverability, simplification (Tesler), cognitive load (Hick/Miller/Fitts/Jakob), design-system consistency, content reduction, exploratory QA, and enterprise benchmark. Produced **128 findings** (3 critical, 33 high, 56 medium, 36 low).
3. **Adversarial verification** of every high/critical: **26 confirmed**, **10 refuted**. Refutations matter — they kept us from "fixing" non-bugs (see below).

Findings span 11 screen clusters plus 5 cross-cutting globals (IA, design system, accessibility, simplification, cognitive load).

---

## Top 10 issues by severity

| # | ID | Sev | Issue | Screen(s) | Status |
|---|----|-----|-------|-----------|--------|
| 1 | MKT-01 | Critical | Marketplace coach cards are click-only `<div>`s — keyboard-dead primary interaction | marketplace/explore | **FIXED** |
| 2 | LRN-01 | Critical | Quiz answer options (`.q-opt`) + jump dots (`.q-dot`) unfocusable — no keyboard/SR path to answer | quiz | **FIXED** |
| 3 | A11Y-01 | Critical | Flagship cards keyboard-inoperable (marketplace + Debate Hub tiles) | marketplace, debateHub | **FIXED** |
| 4 | CORE-01 | High | Systemic `&amp;` double-escape: `&` renders as literal `&amp;` on primary surfaces | catalog, course, marketplace, +~20 sites | **FIXED** |
| 5 | A11Y-02 | High | Course module accordion + lifetime skill rows keyboard-dead (no `role`/`tabindex`/`aria-expanded`) | course, lifetimeProfile | **FIXED** |
| 6 | LIFE-01 | High | Entire Skill-Graph attribution feature keyboard-inoperable | lifetimeProfile | **FIXED** |
| 7 | COACH-01 / ADM-02 | High | Filter chips are bare `<span>` with click-only handlers — not operable by keyboard | participants, adminUsers | **FIXED** |
| 8 | CW-01 / IA-01 | High | Coachwork empty-state CTAs misrouted (profile link → browse grid; "activate profile" → read-only public view) | coachwork | **FIXED** |
| 9 | CORE-02 | High | Student global search "Personas" section is permanently empty (no privacy-scoped people index) | search | **DEFERRED** |
| 10 | MKT-02 | High | Green action text (`--action` #2CAA20) is 3.05:1 on white — below AA 4.5:1 | marketplace, course cards | **PARTIAL** (`.cc-pct` fixed; global `.sky` repoint deferred) |

All three criticals and the highest-impact highs are **FIXED**. The remaining top-10 entries are scoped, low-risk, and documented in `findings-backlog.md`.

---

## What was fixed this pass

15 files changed in live source, **re-validated in-browser across all 4 roles** (assert: no literal HTML entities in rendered text, 0 console errors, keyboard attributes present). Full detail in [FIXES_APPLIED.md](../FIXES_APPLIED.md).

| Theme | Findings | Fix |
|-------|----------|-----|
| Keyboard operability | MKT-01, LRN-01, A11Y-01/02, LIFE-01, DEB-01, PROF-01, COACH-01, ADM-02 | `role="button" tabindex="0"` (+ `aria-pressed`/`aria-expanded`) on click-only divs; chips converted `<span>`→`<button>`. Piggybacks the existing `Aula.tsx` Enter/Space→`.click()` bridge. |
| `&amp;` double-escape | CORE-01, COACH-03, DS-01 | Removed the redundant `esc()` at ~20 builder sites. Contract is "queries escapes, builders render raw"; builders were escaping twice. |
| Form labels | CW-03, PARENT-02 | `aria-label` on coachwork availability selects, parent approval-threshold select, participant search. |
| Routing/logic | CW-01, IA-01, ADM-01 | Corrected misrouted coachwork CTAs; removed duplicate `COACH` option from admin role picker. |
| Contrast | MKT-02 | `.cc-pct` repointed to AA token `--otr-green-text` (#176B11). |

**Deferred (verified, specified — next pass):** heading semantics codemod (A11Y-03/MKT-03/PROF-02, ~45 `<div class="page-title">`→`<h1>` sites — mechanical, visually identical, held for a dedicated sweep), coach tracking/content tab split (COG-01), real rubric/sparkline data (LRN-03/COACH-02), moderation human-label (ADM-03), certificate `@media print` (CERT-01), search people index (CORE-02), global `.sky` contrast repoint (needs dark-surface audit first).

**Refuted by verification — correctly *not* fixed (10):** e.g. LRN-02 (quiz fallback "harm" needs a publish state that doesn't exist in `schema.prisma`), LIFE-02 & PARENT-03 (defects already handled by centralized a11y layers the reviewer missed), DS-01 (duplicate of CORE-01), COACH-03's escape premise (data is already escaped server-side), PARENT-01/SIMP-01/IA-02 (subjective IA preferences, not defects). This discipline avoided needless churn and regressions.

> Excluded as environment artifacts, not product bugs: the login `.lb-wave` hydration mismatch (deterministic `Math.sin`; a stale `.next` cache artifact) and mid-session `Cannot find module` 500s (cleared with `rm -rf .next`).

---

## Per-role health

| Role | Verdict | Notes |
|------|---------|-------|
| **Student** | Strongest. 26 routes render; lesson (7.9), dashboard (7.3), progress (7.5) lead. | Pre-fix gaps were quiz/marketplace/lifetime keyboard access (now FIXED). Open: search "Personas" empty (CORE-02, deferred); progress center over-fragmented (simplification global). |
| **Coach** | Functional but the lowest-scoring cluster. teacher (6.0), coachwork screens. | CTA misroutes FIXED (CW-01/IA-01); form labels FIXED (CW-03). Deferred: "Seguimiento del grupo" stacks tracking + course mgmt (COG-01 — the single worst cognitive-load offender); roster sparkline plots synthetic data (COACH-02). |
| **Parent** | Lowest single screen: parentPortal (5.8). | Form labels FIXED (PARENT-02). High cognitive load on the portal; otherwise renders clean across its 7 routes. |
| **Admin** | Lean by design. adminConsole (6.7), adminUsers (5.9). | Duplicate role option FIXED (ADM-01); chip keyboard access FIXED (ADM-02). Deferred: moderation shows raw `targetId` (ADM-03). Confirm "lean" vs "under-built" against PRD §3.3. |

---

## Enterprise-readiness verdict

OTR Aula presents as a mature, design-disciplined product — a single-source-of-truth token system, near-zero raw hex, consistent card/KPI/hero patterns, an above-average a11y baseline (centralized modal focus-trap, toast live-region, the Enter/Space activator), and a clean behavioral record (every screen, every role, zero errors). Its enterpriseReadiness axis (6.4) and the now-closed keyboard-operability gap were the two things standing between "polished demo" and "shippable to an institution with accessibility obligations." With all three criticals and the dominant high-severity a11y class fixed and re-validated this pass, the product is **enterprise-ready for pilot/staging**, with one remaining must-do before a hard accessibility commitment: land the deferred heading-semantics codemod (A11Y-03/MKT-03/PROF-02) so the a11y axis re-scores materially above 5.5.

---

## Companion reports

- [Accessibility](ACCESSIBILITY_REPORT.md) — the dominant gap, in depth
- [Heuristic Evaluation](HEURISTIC_EVALUATION_REPORT.md)
- [Information Architecture](INFORMATION_ARCHITECTURE_REPORT.md)
- [Cognitive Load & Visual Hierarchy](COGNITIVE_LOAD_AND_HIERARCHY_REPORT.md)
- [Simplification](SIMPLIFICATION_REPORT.md)
- [Design System](DESIGN_SYSTEM_REPORT.md)
- [QA / Behavioral](QA_REPORT.md)
- [Enterprise Benchmark](BENCHMARK_REPORT.md)
- Source data: [SCORES.md](../SCORES.md) · [FIXES_APPLIED.md](../FIXES_APPLIED.md) · [findings-backlog.md](../findings-backlog.md) · [behavioral-capture.md](../capture/behavioral-capture.md)
