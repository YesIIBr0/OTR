# Heuristic Evaluation — OTR Aula

**Method:** Nielsen's 10 usability heuristics, scored 0–10, grounded in the 128-finding
audit (`docs/review/findings-raw.json`), live behavioral truth
(`docs/review/capture/behavioral-capture.md`), and the per-screen 11-axis scores
(`docs/review/SCORES.md`, OVERALL 6.9/10). Each cited finding is tagged **FIXED**,
**DEFERRED**, or **OPEN** against `docs/review/FIXES_APPLIED.md`. No re-audit; synthesis only.

**Baseline render health is strong:** every screen in all four roles renders with zero
console errors and zero thrown exceptions (`behavioral-capture.md`). The defects below are
correctness, accessibility, and information-design issues on screens that *do* render — not
crashes.

| Heuristic | Score |
|---|---|
| 1. Visibility of system status | 6.5 |
| 2. Match between system & real world | **8.0** |
| 3. User control & freedom | 5.5 |
| 4. Consistency & standards | **7.5** |
| 5. Error prevention | 5.0 |
| 6. Recognition rather than recall | 7.5 |
| 7. Flexibility & efficiency of use | 6.5 |
| 8. Aesthetic & minimalist design | 6.0 |
| 9. Help users recognize/recover from errors | 6.5 |
| 10. Help & documentation | 7.0 |

The product's strengths (heuristics 2 and 4) are real and earned. Its weaknesses cluster in
**error prevention (5.0)**, **user control & freedom (5.5)**, and **minimalist design (6.0)** —
the same places the 11-axis scores flag accessibility (5.5) and simplicity (6.7) as weakest.

---

## 1. Visibility of system status — 6.5

Status is *present* on most surfaces (KPI strips, "Plan vigente" badges, toasts), but several
states are either wrong, raw, or unconfirmed.

| Finding | Issue | Status |
|---|---|---|
| ROOM-01 (room) | Session aside prints the raw enum `CONFIRMED`/`PENDING`/`COMPLETED`; everywhere else `scr-mybookings.ts statusBadge` humanizes these to "Confirmada" etc. | OPEN |
| LRN-05 (quizResults) | `tone = passed ? (pct>=90?'ok':'ok')` — both ternary branches return `'ok'`, so "Aprobado con honores" never gets a distinct visual tone; the honors state is invisible. | OPEN |
| MEM-03 (membership) | In-flight button states are lossy — "Actualizando…" overwrites the `IC.flame` icon and isn't restored correctly on failure; the user can't trust what state the plan change is in. | OPEN |
| SET-01 (settings) | Notification toggles persist only to `localStorage` but the toast says "Notificación activada" as if account-saved — the status message misrepresents where the state lives. | OPEN |
| DEB-03 (debateHub) | Analytics `recordRow` reads `r.format` against a `{name,...}` contract. **Refuted** (rejectedHigh): the finding inverts the source of truth — the header comment is stale, not the code. | OPEN (not a bug) |

Justification: the system *talks* (toasts, badges, KPIs) but occasionally lies about state
(SET-01, MEM-03) or shows it raw (ROOM-01). These are localized, not systemic — hence 6.5,
not lower. Most are OPEN; none were in the fix scope.

## 2. Match between system & the real world — 8.0 (STRONG)

This is a genuine strength. The live capture calls the design language "mature and
consistent… reads as premium," with role-appropriate Spanish-first copy throughout. The
violations are narrow and bounded.

| Finding | Issue | Status |
|---|---|---|
| DEB-07 (debateHub) | Hero leads with "Tu rating Glicko-2 · ±350 RD · provisional" — unexplained jargon ("Glicko-2", "RD") as the single largest element, wrong for the Spanish-first / non-technical persona. | OPEN |
| COACH-09 / COG-04 (teacher) | KPI tile labeled "Engagement promedio" is actually fed `k.onTime` (puntualidad); the label doesn't match the number — the code comment admits it. | OPEN |
| ADM-03 (adminConsole) | Moderation report identifies its target by raw opaque `targetId` chip instead of a human label. | DEFERRED (specified in FIXES_APPLIED §Deferred). |
| ROOM-01 | (see H1) raw enum vs the rest of the app's humanized labels. | OPEN |

Justification: a handful of mislabels and one jargon hero against an otherwise excellent
domain-language fit. The 8.0 reflects that match-to-real-world is mostly right; the
exceptions are concentrated on the debate-rating hero and two coach/admin labels.

## 3. User control & freedom — 5.5

The recurring failure is **destructive, money-moving actions guarded only by a "tap again
within 4s" pattern** — no modal, no stated consequence, no undo. This pattern repeats across
four roles, which is what drags the score below 6.

| Finding | Issue | Status |
|---|---|---|
| MB-01 (myBookings) | Cancel triggers escrow REFUND but the only guard is a 4s re-tap; no modal stating the financial consequence. | OPEN |
| PARENT-08 (parentPortal) | Per-session "Cancelar" uses the same 4s re-tap; consequence (payment impact) unexplained. | OPEN |
| ADM-04 (adminConsole) | "Suspender al usuario" — same inline 4s arm pattern; also no `aria-live`, so SR users never hear the arm state. | OPEN |
| ADM-08 (adminUsers) | Role change / verification / suspension fire immediately on change with only a success toast and **no undo** — one accidental `<select>` change promotes a student to Administrador. | OPEN |
| PARENT-05 (parentPortal) | Threshold `<select>` is not reverted on backend failure — the dropdown keeps showing the rejected value, so local UI and server state silently diverge. | OPEN |
| ADM-01 (adminUsers) | Role picker offered both "Profesor / Coach" (TEACHER) and "Coach" (COACH) as distinct options for the same concept — an error-trap removed. | **FIXED** (FIXES_APPLIED §4). |
| IA-04 (Aula.tsx) | Unknown route → `if (!def) return;` does nothing: no toast, no 404, no recovery affordance. | OPEN |

Justification: 5.5 because the few hard exits that exist are unsafe (no undo on irreversible
financial/permission changes), and dead-link navigation strands the user (IA-04). ADM-01
was the one structural trap closed; the rest are OPEN. This heuristic and #5 share root cause.

## 4. Consistency & standards — 7.5 (STRONG)

The biggest *standards* violation — the systemic `&amp;` double-escape that broke the data
layer's "queries escapes, builders render raw" contract — is **fixed**. What remains is
lower-stakes component drift.

| Finding | Issue | Status |
|---|---|---|
| CORE-01 / MKT-06 / DS-01 | Systemic `&amp;` double-escape on catalog, course tabs, marketplace, profile, certificate, etc. — escaped values escaped again. (DS-01 was a re-filing; rejectedHigh.) | **FIXED** (FIXES_APPLIED §1; 0 literal entities across 48 routes). |
| DS-03 (global) | `btn-soft` (54 uses) and `btn-ghost` (48 uses) applied to the *same* secondary-action role with no rule — "Ver más coaches" ghost vs "Explorar coaches" soft. | OPEN |
| DS-02 / DS-05 | On/off switch hand-coded inline in 3 places; ES/EN language pill duplicated with copy-pasted inline styles in 2. | OPEN |
| DS-06 | Pill radius written as literal `100px`/`999px` in 6+ spots instead of `var(--r-pill)`. | OPEN |
| PROF-03 (coach) | Rating stars rendered in brand GREEN (`--otr-sky` aliases green) where gold (`--otr-gold`) is the achievement token — brand-token misuse. | OPEN |
| CW-05 (coachwork) | Internal tab bar uses plain `<button class="tab">` with no `role="tablist"`/`aria-selected` — diverges from ARIA tab standard. | OPEN |

Justification: the live capture confirms a consistent visual system (cream/dark/green/gold,
repeated card/KPI/hero patterns). The headline contract violation is fixed; the residue is
token discipline and one ARIA-standards gap. 7.5 is well-earned and would rise with a
`btn-soft`/`btn-ghost` rule and a shared toggle component.

## 5. Error prevention — 5.0 (MOST VIOLATED, tied)

Weakest heuristic. The system permits accidental destructive actions and lets bad input
through.

| Finding | Issue | Status |
|---|---|---|
| ADM-08 (adminUsers) | Role `<select>` change applies immediately, no confirm — a slip promotes a student to admin. | OPEN |
| ADM-05 (adminUsers) | Admin's own row still shows enabled role/suspend controls the backend then rejects — the UI invites an action it can't complete. | OPEN |
| MB-01 / PARENT-08 / ADM-04 | Irreversible/financial actions guarded only by a 4s re-tap, no consequence modal. | OPEN |
| CW-04 (coachwork) | "Añadir franja" validates only `endMin > startMin` — duplicate/overlapping availability windows slip through. | OPEN |
| ADM-01 (adminUsers) | Duplicate COACH/TEACHER role options (an input trap). | **FIXED**. |
| IA-04 (Aula.tsx) | Dead links to non-existent routes silently no-op instead of being prevented/surfaced. | OPEN |

Justification: 5.0 because the riskiest actions in the product (suspend user, change role,
cancel a paid booking, downgrade a plan) lack real prevention, and one validation gap
(CW-04) admits malformed data. Only ADM-01 was fixed; the destructive-action confirmation
backlog is entirely OPEN.

## 6. Recognition rather than recall — 7.5

Generally good — the UI is card- and label-driven. The exceptions are raw identifiers and
state the user must remember across navigation.

| Finding | Issue | Status |
|---|---|---|
| ADM-03 (adminConsole) | Report target shown as opaque `targetId` — admin must recall/look up who that is. | DEFERRED. |
| ROOM-01 | Raw status enum the user must mentally translate. | OPEN |
| CW-06 (coachwork) | Tab state in global `window.__cwTab`, not in the URL and never reset; returning to coachwork silently reopens "Ingresos" — no recognizable default. | OPEN |
| CORE-02 (search) | "Personas" search section is permanently empty for students (the only role that reaches search) — nothing to recognize. | OPEN (confirmedHigh; CORE-02 scope flagged DEFERRED under CORE-02 in FIXES_APPLIED). |

Justification: strong defaults overall (the dashboard "TU SIGUIENTE PASO" hero, labeled KPI
cards), pulled down by a few raw-ID and hidden-state spots. 7.5.

## 7. Flexibility & efficiency of use — 6.5

Few power-user accelerators, and some manual steps the system already has the signal to
automate.

| Finding | Issue | Status |
|---|---|---|
| SIMP-05 / LRN-07 (learn flow) | "Mark lesson complete" is manual even when the system already has the completion signal (e.g. a passed quiz returns the result); completion handled two different ways across player vs lesson. | OPEN |
| ADM-06 (adminUsers) | Search requires explicit "Buscar" click and offers **no clear/reset** — the term sticks until manually deleted. | OPEN |
| MSG-01 (messages) | Switching conversations does a full screen re-render via `go('messages')` rather than swapping the thread — slow for a high-frequency action. | OPEN |
| LRN-08 (quiz) | No "answered X of Y" summary or save state; progress lives only in a `mount()` closure and small dots. | OPEN |

Justification: nothing is broken, but the product under-automates known signals and lacks
quick accelerators (clearable search, in-place thread swap). 6.5.

## 8. Aesthetic & minimalist design — 6.0

Visually the product is clean (capture: "premium"), but **content/control density** is a
recurring theme — 36 findings touch content-reduction/cognitive-load lenses. This is the
heuristic where the "removal > addition" ethos pays off most, and the relevant fixes are
mostly deferred.

| Finding | Issue | Status |
|---|---|---|
| COG-01 (teacher) | `S.teacher.render()` concatenates two complete pages (tracking dashboard + course management) on one route. | DEFERRED (FIXES_APPLIED §Deferred, COG-01 → tabs). |
| COACH-04 / SIMP-04 (coach) | Three overlapping course-structure surfaces (teacher / manage / course-builder). | OPEN |
| COG-02 / MKT-05 (marketplace) | Up to 11 filtering controls (8 specialty chips + 3 selects) above results. | OPEN |
| PARENT-01 / SIMP-07 (parentPortal) | Right rail stacks six cards + extras; lowest-scoring screen (5.8). | OPEN (PARENT-01 a subjective IA pref, rejectedHigh). |
| MEM-01 / SIMP-08 (membership) | Always-rendered disabled "Elite — Próximamente" tier with four muted bullets — noise. | OPEN |
| CORE-03 / SIMP-02 (dashboard) | Achievements card footer is a byte-for-byte duplicate of the hero's primary CTA. | OPEN |
| DS-04 (global) | `.btn-accent` fully defined in CSS, used 0 times — dead style. | OPEN |
| LRN-06 / SIMP-09 (lesson) | In-lesson outline collapses to a single dead anchor; 10-line hardcoded `defaultProse`. | OPEN |

Justification: 6.0 — the aesthetic is good but the screens carry redundant/duplicate/dead
content and over-dense control rows. The single content-correctness contract issue
(`&amp;`) is fixed; the *reduction* backlog (duplicate CTA, dead `.btn-accent`, Elite-tier
noise, page-splitting) is almost entirely OPEN.

## 9. Help users recognize, diagnose & recover from errors — 6.5

Toasts exist, but error states often don't *recover* — they leave the UI diverged from
truth, and some are inaccessible.

| Finding | Issue | Status |
|---|---|---|
| PARENT-05 (parentPortal) | On backend failure the threshold `<select>` is not reverted; UI shows a value the server rejected. | OPEN |
| MEM-03 (membership) | Failed plan change restores button as plain text, losing the icon and leaving an ambiguous state. | OPEN |
| ADM-04 (adminConsole) | Arm-to-confirm state has no `aria-live` — SR users get no diagnosis of the armed/destructive state. | OPEN |
| IA-04 (Aula.tsx) | Dead/unknown route → silent no-op; user gets no error to recognize or recover from. | OPEN |
| SET-03 (settings) | "Cambiar contraseña" bails to "No disponible aquí" if `w.otrFormModal` is absent — a dead end with no recovery path. | OPEN |

Justification: success paths are well-toasted, but failure paths frequently don't roll back
state (PARENT-05, MEM-03) or surface nothing at all (IA-04, SET-03). 6.5.

## 10. Help & documentation — 7.0

Not a primary review focus and not a major source of findings — the product is largely
self-evident (strong learnability axis, 7.6). The closest relevant gaps are
explanatory-content issues rather than missing help systems.

| Finding | Issue | Status |
|---|---|---|
| DEB-07 (debateHub) | "Glicko-2 · ±350 RD" jargon presented with no inline explanation. | OPEN |
| SET-01 (settings) | No disclosure that notification prefs are device-local, not account-synced. | OPEN |
| CW-07 (coachwork) | Escrow/take-rate explanation repeated 3+ times — over-documented in one spot, a redundancy not a gap. | OPEN |

Justification: 7.0 — few documentation gaps because the UI is self-explaining; the one place
help is genuinely needed (debate-rating jargon) is OPEN, and one place is *over*-explained.

---

## Heuristics most violated (ranked)

1. **Error prevention (5.0)** — destructive, often irreversible/money-moving actions (suspend,
   role change, cancel booking, plan downgrade) guarded only by a 4s re-tap with no undo;
   `ADM-08`, `MB-01`, `PARENT-08`, `ADM-04`, `ADM-05`, plus the validation gap `CW-04`. Only
   `ADM-01` (the duplicate-role trap) is **FIXED**; the rest are **OPEN**.
2. **User control & freedom (5.5)** — same destructive-action cluster, plus no UI rollback on
   failure (`PARENT-05`) and silent dead-link no-ops (`IA-04`). Shares root cause with #1.
3. **Aesthetic & minimalist design (6.0)** — 36 findings on density/duplication/dead content
   (`COG-01`, `SIMP-02/04/07/08`, `MEM-01`, `DS-04`, `LRN-06`). High-leverage for the
   removal-over-addition ethos; mostly **OPEN/DEFERRED**.

**Cross-cut not scored as a single heuristic:** accessibility is the weakest 11-axis score
(5.5) and underlies violations of #4 (standards: `CW-05` ARIA tabs), #1/#9 (no `aria-live`:
`ADM-04`), and #3 (keyboard-dead controls). The most severe of these — the three CRITICAL
keyboard-operability defects (`LRN-01`, `MKT-01`/`A11Y-01`, `DEB-01`) plus `COACH-01`,
`LIFE-01`, `PROF-01`, `ADM-02`, `CW-03`, `PARENT-02` — are **FIXED** (FIXES_APPLIED §2–3). The
`<div class="page-title">`→`<h1>` heading sweep across ~45 sites (`A11Y-03`/`MKT-03`/`PROF-02`)
is **DEFERRED** as a codemod, and the global `.sky` contrast repoint is **DEFERRED** pending a
dark-surface audit.

**Strongest heuristics:** match between system & real world (8.0) and consistency & standards
(7.5), corroborated by the live capture ("mature and consistent… premium") and by the
contract-level `&amp;` fix landing across 48 routes with zero residual literal entities.
