# Accessibility Report — OTR Aula (WCAG 2.1 AA)

**Axis score: 5.5 / 10 — the weakest axis in the product** (SCORES.md). Everything below
is synthesized from `findings-raw.json` (34 `fixType:a11y` findings + the contrast/keyboard
/semantic items), cross-referenced against `FIXES_APPLIED.md`. Status tags: **FIXED**
(landed + re-validated live), **DEFERRED** (verified, specified, scheduled), **OPEN**
(verified, no fix yet, not yet scheduled), **NOT-A-DEFECT** (adversarially refuted).

## TL;DR

The score is low because of one structural class of defect, now largely closed: the SPA
renders interactive controls as bare `<div>`s with mouse-only click handlers, so keyboard
and screen-reader users could not operate the primary surfaces of five screens. The
**operability fixes shipped** (quiz, marketplace, debate, profile, lifetime, accordions,
filter chips) — these were the criticals dragging the axis down. What remains is mostly
**semantic depth, not basic operability**: a heading-structure sweep (`<div class="page-title">`
→ `<h1>`, deferred as a codemod) and a long tail of small contrast and `name/role/value`
gaps. The render layer is healthy — every screen in every role renders with **zero console
errors** (behavioral-capture.md), so this is a markup-semantics problem, not a runtime one.

One important credit: modal accessibility is **not** broken. A centralized `MutationObserver`
in `Aula.tsx` (`enhanceModal`, marked `[A11Y-03]`) retrofits `aria-modal` / `aria-labelledby`
/ focus-trap / Escape onto every `.modal-scrim` as it mounts. Two findings that alleged broken
modals (LIFE-02, PARENT-03) were **refuted** on exactly this basis — see NOT-A-DEFECT below.

---

## Issues mapped to WCAG 2.1 AA criteria

### 2.1.1 Keyboard (Level A) — the criterion that sank the score

Plain `<div>`s carrying `onclick` had no `role`, no `tabindex`, no key handler. The SPA's
global Enter/Space bridge in `Aula.tsx` (~line 960) only activates elements that declare
`role="button" tabindex="0"`, so these controls were keyboard-dead.

| ID | Screen | Control | Status |
|---|---|---|---|
| LRN-01 (critical) | quiz | `.q-opt` answer options + `.q-dot` jump dots | **FIXED** |
| A11Y-01 / MKT-01 (critical) | marketplace | coach cards (`data-coach`) | **FIXED** |
| A11Y-01 / DEB-01 (critical/high) | debate hub | history + tournament tiles (`data-debate`) | **FIXED** |
| A11Y-02 / LIFE-01 (high) | course / lifetime | module accordion (`data-acc`) + skill rows (`data-lpskill`) | **FIXED** |
| PROF-01 (high) | profile | "Mis programas" course cards | **FIXED** |
| COACH-01 (high) | participants | filter chips `span`→`<button>` | **FIXED** |
| ADM-02 (high) | adminUsers | role filter chips `span`→`<button>` | **FIXED** |
| PL-01 (medium) | placement | range sliders have no `:focus-visible` ring; `.pl-range`/`.pl-out` CSS undefined (`scr-placement.ts:59`) | **OPEN** |

Fix pattern: `role="button" tabindex="0"` (+ `aria-label`/`aria-pressed`/`aria-expanded`)
piggybacking on the existing `Aula.tsx` bridge, and `span`→`<button>` for chips (native
keyboard, matches the marketplace `.chip` precedent). Re-validated: coach cards, 4 quiz
options, skill rows all report `role=button`; 4 participant + 5 admin chips are `<button>`
(FIXES_APPLIED.md §2). **2.1.1 is now satisfied on every primary interaction.** PL-01 is the
one remaining gap — the slider is operable but the focus indicator is the browser default
with no visible ring (also touches 2.4.7 Focus Visible).

### 1.4.3 Contrast (Minimum) (Level AA)

Green-on-light text using `--action` (#2CAA20) measures **3.05:1 on white / 2.83:1 on cream**
— below the 4.5:1 normal-text floor.

| ID | Target | Measured | Status |
|---|---|---|---|
| MKT-02 | `.course-card .cc-pct` % text | repointed `--action-hover`→`--otr-green-text` (#176B11 ≥4.5:1) | **FIXED** |
| MKT-02 / A11Y-04 | `.sky` text class (`app.css:24`, drives "Ver perfil" + 77 `.eyebrow` uses) | 3.05:1 | **DEFERRED** |
| A11Y-04 / MKT-08 | `.badge.ok` (#1E8C16 on #E1F2DE) | 3.73:1 | **OPEN** |
| A11Y-04 | `.badge.danger` (#C2453C on #F7E0DE) | 3.96:1 | **OPEN** |
| A11Y-04 | `.tab.active` text | sub-4.5:1 | **OPEN** |
| LIFE-03 | sub-60 skill score in `--warn` (#C8920C on #FFF, 13.5px) | ~3.6:1 (tokens.css itself flags #C8920C as not-AA) | **OPEN** |
| DEB-06 | recent-form pills at 10.5–11px | undersized + color-only | **OPEN** |

The `.sky` repoint is **DEFERRED, not skipped, and for a real reason**: `.sky` is also used
on dark surfaces (the hero), so a blind global swap to a dark green risks invisible text. It
needs a usage audit first (FIXES_APPLIED.md §5). The token to land on already exists:
`--otr-green-text` #176B11. Fixing `.sky` + the three `A11Y-04` badge/tab tokens in
`app.css`/`tokens.css` is the single highest-leverage contrast change — it clears the
majority of normal-text failures in one token edit.

### 4.1.2 Name, Role, Value (Level A)

Controls missing a programmatic accessible name, or whose state is CSS-only.

| ID | Screen | Gap | Status |
|---|---|---|---|
| CW-03 | coachwork › Disponibilidad | 3 bare `<select>` (Día/Inicio/Fin) → `aria-label`; separator `aria-hidden` | **FIXED** |
| PARENT-02 | parentPortal | approval-threshold `<select>` → `aria-label` with child name | **FIXED (select)** / link & report-card form labels **OPEN** |
| — | participants | search input → `aria-label` | **FIXED** |
| LRN-09 | assignment | icon-only recorder buttons named by `title` only (not reliably announced); no `aria-live` on status | **OPEN** |
| ADM-07 | adminUsers | per-row role `<select>`, `#au-search`, verify/suspend buttons unlabeled (need name + user) | **OPEN** |
| ADM-04 | adminConsole | two-tap "Suspender" arm state has no `aria-live` — SR users never hear the confirm prompt | **OPEN** |
| PROF-05 | coach | 5-star rating: buttons labeled but no `radiogroup`, selection is `.on` class only (no `aria-checked`) | **OPEN** |
| CW-05 | coachwork | `subTabs` use plain `<button>` — no `role=tab`/`aria-selected`/`tablist`; active state color-only | **OPEN** |
| A11Y-05 | course builder | rich-text `<label for>` points at a `contenteditable <div>` (`for` doesn't bind); needs `role="textbox"` + `aria-labelledby` | **OPEN** |
| CORE-08 | badges | locked badges differ by glyph+opacity only; no text/`aria` "Bloqueada" status | **OPEN** |

The three form-label fixes that shipped were the highest-traffic controls (coach availability,
parent approval, roster search). The OPEN items are real but lower-traffic; ADM-04 is the most
user-affecting because a destructive action's state change is silent to AT.

### 1.3.1 Info and Relationships (Level A)

| ID | Screen | Gap | Status |
|---|---|---|---|
| CORE-07 | grades | coach-feedback `.fb-row <tr>` has no programmatic link to its parent grade row; status is color+badge only | **OPEN** |
| LIFE-05 | lifetimeProfile | card section titles are `<b>` not headings (overlaps 2.4.6) | **OPEN** |
| MKT-07 | marketplace | coach photo is a CSS `background-image` on a `<span>` (no alt); initials hidden with `color:transparent` | **OPEN** |

### 4.1.2 / state — modal pattern (NOT a regression; intentionally centralized)

`LIFE-02` (downgrade confirm) and `PARENT-03` (monthly-report modal) alleged missing
`aria-modal`/labelledby/focus-trap/Escape. **Both REFUTED** — these are caught by the
centralized `enhanceModal` MutationObserver in `Aula.tsx` (the Design System global confirms
the inline `role="dialog"`-only markup is intentional precisely because the observer retrofits
the rest). See NOT-A-DEFECT.

### 2.4.6 Headings and Labels + 1.3.1 (heading structure) — the deferred sweep

This is the **single biggest remaining contributor to the 5.5**. The page title is rendered as
`<div class="page-title">` in **~42 places**; only 2 screens use a real `<h1>`. Worse,
`scr-debate.ts`, `scr-marketplace.ts`, `scr-teacher.ts`, `scr-parent.ts`, `scr-admin.ts`,
`scr-lifetime.ts` have **no `<h1>` at all** and jump straight to `<h3>`/`<h4>` — screen-reader
users get no document outline and "navigate by heading" is broken across the app.

| ID | Scope | Status |
|---|---|---|
| A11Y-03 (high, systemic) | `<div class="page-title">` → `<h1>` across ~42 sites | **DEFERRED** |
| MKT-03 (high) | marketplace grid title `<h1>`; coach name `<b>`→`<h1>`; section labels `<h2>` | **DEFERRED** |
| PROF-02 (high) | progress/badges `.page-title`→`<h1>`; profile/coach name `<h2>` needs `<h1>` above | **DEFERRED** |
| LRN-04 (medium) | quiz/assignment have no heading element; quizResults/player start at `<h2>` with no `<h1>` | **DEFERRED (with sweep)** |
| COACH-06 (medium) | teacher/participants/manage/courseBuilder page-title `<div>`→`<h1>` | **DEFERRED (with sweep)** |
| LIFE-05 (low) | lifetime card `<b>` titles → `<h3>` | **OPEN** |

**Why deferred, not done:** the change is mechanical and **visually identical** — the
`.page-title` class carries all styling, so `<div>`→`<h1>` changes nothing on screen. It was
deferred specifically to run as one dedicated codemod rather than hand-editing 42+ tags on a
flaky dev build (FIXES_APPLIED.md "Deferred"). This is the right call: a hand sweep risks
introducing multiple `<h1>`s per screen (a new 1.3.1 violation). The fix is low-risk but must
be done as a scripted pass with a one-`<h1>`-per-screen assertion.

---

## NOT-A-DEFECT (adversarially refuted — do not re-open)

| ID | Claim | Why refuted |
|---|---|---|
| LIFE-02 | downgrade modal not keyboard-accessible | `enhanceModal` MutationObserver (`Aula.tsx`) sets aria-modal/labelledby/focus-trap/Escape on every `.modal-scrim`; `confirmModal` is appended with that class |
| PARENT-03 | report modal missing aria-modal + focus mgmt | same centralized observer; modal appended to `document.body` with `class="modal-scrim"` (`scr-parent.ts:666`) so it is enhanced |

These are credited the other way: the centralized observer is a **strength** — modal a11y is
solved once for the whole app instead of per-screen.

---

## Path to WCAG 2.1 AA (and to lifting the 5.5)

Ordered by leverage. The criticals (2.1.1) are already closed; the remaining path is mostly
two scripted passes plus a token edit.

1. **Heading codemod (A11Y-03 / MKT-03 / PROF-02 / LRN-04 / COACH-06)** — biggest score
   mover. One scripted `<div class="page-title">`→`<h1 class="page-title">` sweep across the
   6 heading-less builders + the no-`<h1>` learn screens, with an assertion of exactly one
   `<h1>` per screen and promotion of card titles to `<h2>`/`<h3>`. Satisfies 2.4.6 + 1.3.1.
   Effort M, visually nil. **This is the deferred item to schedule first.**
2. **Contrast token pass (A11Y-04 + the deferred `.sky`)** — repoint `.sky`, `.badge.ok`,
   `.badge.danger`, `.tab.active`, and the sub-60 score color to AA-safe tokens
   (`--otr-green-text` #176B11 already exists). One token edit clears the bulk of 1.4.3
   normal-text failures. Gate `.sky` behind the dark-surface usage audit already specified.
3. **Name/role/value tail (ADM-04, ADM-07, LRN-09, PROF-05, CW-05, A11Y-05, CORE-08)** —
   add `aria-label`s with entity names, `aria-live` on the suspend arm-state and recorder
   status, `radiogroup`/`aria-checked` on the star rating, `role=tab`/`aria-selected` on
   coachwork tabs, `role="textbox"`/`aria-labelledby` on the rich-text editor, and a
   visually-hidden "Bloqueada" on locked badges. Mostly S-effort, additive.
4. **Relationships + slider focus (CORE-07, MKT-07, PL-01)** — associate feedback rows,
   expose coach photos as `role="img"`/`<img alt>`, and add a `.pl-range :focus-visible`
   ring (also clears 2.4.7).

After step 1 alone the accessibility axis should move materially (it currently penalizes every
screen for the missing outline). Steps 1–3 together put the product at a defensible WCAG 2.1
AA posture; the criticals that defined the floor are already fixed and re-validated.

**Simplification note:** every remaining fix is additive markup/tokens except MKT-07 and
A11Y-05, where the cleaner move is to *remove* an anti-pattern (drop `color:transparent` on
the initials; stop relying on `<label for>` against a non-labelable `contenteditable`) rather
than layer ARIA on top of a broken structure. Prefer those removals.
