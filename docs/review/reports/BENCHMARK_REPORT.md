# Enterprise Benchmark + Content Reduction — OTR Aula

**Question asked:** for the screens that matter, would Stripe / Linear / Notion / Vercel ship them as-is? **Short answer: no — but the gap is small and almost entirely fixable with removal, not addition.** OTR Aula's *visual* craft already reads enterprise-grade (mature cream/dark/green design language, consistent card/KPI/hero patterns, zero console errors across 36 screens × 4 roles — `behavioral-capture.md`). What blocks a "ship it" verdict at those bars is mechanical and bounded: keyboard inoperability, non-semantic headings, fabricated/ambiguous data labels, and verbose copy that those teams would cut on sight.

Grounding: `enterpriseReadiness` axis product-wide is **6.4/10** (`SCORES.md`), the second-weakest axis after accessibility (5.5). Those two move together — at Stripe/Linear/Vercel, a keyboard-dead primary control or a `<div>` page title is a release blocker, so the a11y debt *is* the enterprise debt.

---

## 1. The enterprise bar, by name

| House | What they would gate on | Where OTR fails it today |
|---|---|---|
| **Stripe** | Correctness of money/trust copy; no fabricated specificity | `SET-01` (toggle says "activada" but only writes localStorage), `LRN-03` (hardcoded rubric pretends to be this assignment's), `COACH-02`/`COACH-09` (synthetic sparkline + mislabeled KPI) |
| **Linear** | Keyboard-first; every interaction operable without a mouse; tight surfaces | `LRN-01`, `MKT-01`, `A11Y-01/02`, `LIFE-01`, `COACH-01` (primary cards/options were `<div>`s) — **FIXED**; `COG-01` two pages on one route — **DEFERRED** |
| **Notion** | Semantic structure, calm density, plain language | `A11Y-03`/`MKT-03`/`PROF-02` (`<div class=page-title>` ×42, no `<h1>`) — **DEFERRED**; `DEB-07` (Glicko-2/RD jargon as the hero) — **OPEN** |
| **Vercel** | Ruthless copy economy; one message stated once | `PARENT-06`, `MEM-02`, `CW-07`, `CW-02` (same guarantee/status restated 3–4×) — **OPEN** |

---

## 2. Enterprise-readiness per key screen

Scored from `SCORES.md` (enterprise axis + the two that drag it: accessibility, simplicity). **Verdict** = would a top-tier team ship this screen as-is?

| Screen | Ente | Acc | Simp | Verdict | What changes to pass | Status |
|---|---|---|---|---|---|---|
| **search** | 4 | 6 | 7 | **No** | Empty "Personas" index for the only role that sees it (`CORE-02`) — scope it or remove the tab. Removal is the honest fix. | DEFERRED |
| **adminUsers** | 5 | 4 | 6 | **No** | Filter chips were keyboard-dead + duplicate COACH role option (`ADM-02`, `ADM-01`) — **FIXED**. Still missing: clear-search affordance (`ADM-06`). | Mixed: chips/role FIXED; `ADM-06` OPEN |
| **adminConsole** | 5 | 4 | 8 | **Borderline** | Raw `targetId` chip on report cards (`ADM-03`) — show a human label + "Ver". Confirm "lean by design" vs under-built (`behavioral-capture.md`). | DEFERRED |
| **quiz** | 5 | **3** | 7 | **No** (was) | Answer options/jump-dots were unkeyable `<div>`s (`LRN-01`, critical) — **FIXED**. Accessibility was the single lowest score in the product; re-score should jump. | FIXED |
| **certificate** | 5 | 6 | 7 | **No** | `window.print()` with no print stylesheet — prints the app chrome (`CERT-01`). Add `@media print`. | DEFERRED |
| **messages** | 5 | 6 | 7 | **Borderline** | No blocking defect surfaced; enterprise score is efficiency/polish, not correctness. | OPEN (no fix needed yet) |
| **marketplace / explore** | 6 | 4 | 6 | **No** (was) | Coach cards — the primary interaction — were keyboard-dead `<div>`s (`MKT-01`/`A11Y-01`, critical) — **FIXED**. Green action text 3.05:1 (`MKT-02`) — **FIXED on `.cc-pct`**, global `.sky` repoint **DEFERRED**. No real `<h1>` (`MKT-03`) — **DEFERRED**. | Mixed |
| **parentPortal** | 6 | 5 | 5 | **No** | Lowest avg screen (5.8) and lowest cognitiveLoad (4). Form labels (`PARENT-02`) — **FIXED**. Still: 6-card rail + scattered per-child controls (`PARENT-01`), 3–4× reassurance copy (`PARENT-06`). Trust the user once. | Mixed: labels FIXED; `PARENT-01`/`-06` OPEN |
| **teacher (Seguimiento)** | 6 | 5 | **5** | **No** | Two full pages on one route (`COG-01`/`COACH-04`) + KPI labeled "Engagement" but fed `onTime` (`COACH-09`/`COG-04`) + synthetic sparkline (`COACH-02`). Split into Grupo/Contenido tabs; fix or remove the fake data. | DEFERRED |
| **courseBuilder** | 6 | 4 | 6 | **No** | Six controls crammed in the hero (`COACH-05`); demote/group to one primary. Filter chips a11y shared with `COACH-01`. | OPEN |
| **profile** | 6 | 4 | 6 | **No** (was) | "Mis programas" rows keyboard-dead (`PROF-01`) — **FIXED**. Ambiguous "Perfil de marketplace" button names a place not an action (`PROF-06`). No `<h1>` (`PROF-02`) — **DEFERRED**. | Mixed |
| **coach profile + booking** | 6 | 4 | 7 | **Borderline** | Same a11y heading/contrast family as marketplace; booking flow itself is clean. | DEFERRED (shared fixes) |
| **debateHub (flagship)** | 7 | 5 | 6 | **No** | History/tournament tiles keyboard-dead (`DEB-01`/`A11Y-01`) — **FIXED**. Hero leads with "Glicko-2 / ±350 RD" jargon (`DEB-07`) and 6 sub-tabs with Overview duplication (`DEB-02`/`COG-05`). | Mixed: a11y FIXED; copy/IA OPEN |
| **membership** | 7 | 5 | 6 | **Borderline** | Plan status restated 3× + a sales sentence competing with the tier cards (`MEM-02`). Pure copy cut. | OPEN |
| **coachwork** | 7 | 5 | 7 | **Borderline** | Empty-state CTA mis-routed (`CW-01`) + availability selects unlabeled (`CW-03`) + activate-profile CTA mis-routed (`IA-01`) — all **FIXED**. Still: PENDING pill is a full sentence (`CW-02`), escrow message ×3 (`CW-07`). | Mixed |
| **dashboard / lesson / grades / progress / badges** | 7–8 | 6–7 | 6–8 | **Yes** (with the systemic a11y sweep) | Highest scorers. Only blockers are the *product-wide* ones below (headings, `&amp;`). Lesson lacks a "next lesson" CTA — flow polish, not a gate (`behavioral-capture.md`). | Systemic only |

**Pattern:** no key screen fails on layout or visual design. Every "No" traces to (a) a keyboard-dead control — **largely FIXED**, (b) a missing semantic heading — **DEFERRED as one codemod**, (c) fabricated/ambiguous data — **mostly DEFERRED/OPEN**, or (d) copy that should be cut — **OPEN**. None require a redesign.

### Two product-wide blockers that gate *every* screen at this bar

- **`&amp;` double-escape** (`CORE-01`/`DS-01`, confirmedHigh): literal `&amp;` rendered in course/coach names on primary surfaces. No top-tier team ships visible mojibake. **FIXED** — redundant `esc()` removed at ~20 sites, validated 0 literal entities across all roles (`FIXES_APPLIED.md` §1).
- **Non-semantic `<h1>`** (`A11Y-03`/`MKT-03`/`PROF-02`, confirmedHigh): `<div class="page-title">` in 42 places; no programmatic top-level heading anywhere. Screen-reader and SEO failure. **DEFERRED** — mechanical, visually identical codemod; the single highest-leverage remaining fix for the enterprise + accessibility axes.

---

## 3. Content reduction — classify and trim

The simplification ethos here is **removal > addition**. Seven findings carry `fixType=content`; another cluster (`merge`/`simplify`/`eliminate`) is verbose surface. Below, representative copy is classified **Required** (user cannot act without it) / **Useful** (helps, keep one instance) / **Optional** (cut unless cheap) / **Noise** (cut). Targets land in the requested 40–70% band where flagged.

### 3a. Parent Portal — trust copy stated 3–4× (`PARENT-06`, content, OPEN)

| Copy | Class | Action |
|---|---|---|
| Security card 3 bullets (escrow / you approve / progress is real), L431-435 | **Required** | Keep — single source of the trust message |
| Hero sub "El progreso real… cada sesión segura y cada peso bajo tu control" (L392) | Useful | Trim to identity line |
| Pending-approvals subtitle "Ninguna sesión… sin tu aprobación" (L419) | **Noise** | **Cut** — Security card already says it |
| Threshold helper (L351) + Messages card subtitle | Optional | Collapse to one short line |

**Target: ~40–50% cut of reassurance copy.** Finding's own recommendation. A parent who reads the guarantee once does not need it four times; repetition reads as anxiety, not assurance.

### 3b. Debate Hub hero — algorithm jargon as the headline (`DEB-07`, content, OPEN)

| Copy | Class | Action |
|---|---|---|
| Human tier badge (e.g. "Novato/Varsity") | **Required** | Promote to prominent secondary |
| Numeric rating value | **Useful** | Keep |
| "Glicko-2" (eyebrow) | **Noise** | Move to an info tooltip |
| "±350 RD · provisional" | Optional | Show only when non-provisional; raw RD behind tooltip |

~95% of the Spanish-first student persona cannot act on "Glicko-2" or "RD" — pure content cut, **no layout change**.

### 3c. Membership — plan status ×3 + competing sales line (`MEM-02`, simplify, OPEN)

Hero H2 "Tu plan: OTR Free" + "Plan vigente" badge + "En este plan desde…" + disabled "Tu plan actual" button = the same fact four times. **Required:** one identity line ("Tu plan: OTR Free · desde octubre 2025"). **Cut** the badge *or* the prose sentence, and the "Tu plan decide cuánto entrenas…" sales line (the tier cards make the point concretely). ~50% hero copy reduction.

### 3d. Coachwork — escrow/take-rate ×3 + sentence-in-a-pill (`CW-07`, `CW-02`, OPEN)

- `CW-07`: "OTR retiene 18% / se libera vía escrow" appears in the Ingresos tile sub, an Ingresos info alert, *and* the Availability tab. **Keep one** ("Transparencia total" in Ingresos); **cut** the duplicate alert from `viewAvailability()`.
- `CW-02`: PENDING status renders "Esperando consentimiento del padre" inside a 22px pill. Pill copy is **Required → relabel to "Pendiente"**; move the sentence to the row's faint subtext. A pill is a label, not a sentence.

### 3e. Settings — dishonest toast (`SET-01`, content, OPEN)

Not verbose — *misleading*. Four notification toggles write only `localStorage` yet toast "Notificación activada" as if account-saved; the leaderboard toggle beside them really PATCHes `/api/profile`. **Add one faint line** "Se guardan en este dispositivo por ahora" and soften the toast. Honesty over brevity here.

### 3f. Other verbose surfaces (lower priority, OPEN)

| ID | Screen | Trim | Status |
|---|---|---|---|
| `LIFE-06` | lifetimeProfile | 7 ledger KPI tiles → 4 high-signal counters, rest to a "detalle" line | OPEN |
| `SIMP-09` | lesson | Remove 10-line hardcoded `defaultProse` demo essay (dead-ish content) | OPEN |
| `IA-06` | student sidebar | Hardcoded "Varsity" badge on Niveles item — derive or remove | OPEN |
| `COG-05`/`DEB-02` | debateHub | De-dup Overview vs hero; consider 6 tabs → 3–4 (`merge`) | OPEN |

### 3g. Fabricated specificity (content, but a correctness cut, not a copy cut)

- **`LRN-03` (high, DEFERRED):** the assignment "Calificación" card hardcodes an identical CWI rubric (30/25/25/20) for *every* 100-point assignment, regardless of whether it's an essay or upload. The non-100-point branch already shows an honest generic message — proof the specific branch is fabricated. **Remove the hardcoded array;** drive from `L.rubric` or fall back to the honest generic line. Stripe would never ship invented detail presented as real.
- **`COACH-09`/`COG-04` (DEFERRED):** KPI labeled "Engagement promedio" fed by `k.onTime`. Label and source must agree — rename the field or the label, plus a one-line tooltip.
- **`COACH-02` (DEFERRED):** roster "7 días" sparkline plots synthetic data. Feed a real 7-day series or **remove the column.**

---

## 4. Verdict and the shortest path to "ship it"

**Today:** not shippable at Stripe/Linear/Notion/Vercel standards — **but the delta is a punch-list, not a redesign.** Visual craft and behavioral stability already clear the bar.

**Already cleared (FIXES_APPLIED.md):** all keyboard-dead primary controls (3 critical + highs), the systemic `&amp;` defect, form-control labels, three mis-routed CTAs, the duplicate admin role, and the worst contrast instance. These were the hard "No → Yes" flips on quiz, marketplace, profile, lifetime, coachwork, participants.

**To clear the bar, in priority order:**
1. **`<h1>` codemod** (`A11Y-03`, DEFERRED) — 42 sites, visually identical, single biggest lift to both weak axes.
2. **Remove fabricated data** (`LRN-03`, `COACH-02`, `COACH-09`) — correctness; removal beats faking.
3. **Copy cuts** (`PARENT-06`, `MEM-02`, `DEB-07`, `CW-02`, `CW-07`) — all "say it once," 40–70% trims, zero layout risk.
4. **Honesty + finish** (`SET-01` disclosure, `CERT-01` print stylesheet, `ADM-03` human label, `CORE-02` scope/remove empty search index).
5. **Split the teacher route** into Grupo/Contenido tabs (`COG-01`, DEFERRED).

Every remaining item is removal, relabeling, or a mechanical sweep. The enterprise gap is real but cheap to close — and closing it mostly means **deleting copy and faking, not building features.**

---
*Sources: `findings-raw.json` (128 findings, scores, confirmedHigh/rejectedHigh), `SCORES.md` (6.9 overall; enterprise 6.4, accessibility 5.5), `FIXES_APPLIED.md` (fix status), `capture/behavioral-capture.md` (live render truth).*
