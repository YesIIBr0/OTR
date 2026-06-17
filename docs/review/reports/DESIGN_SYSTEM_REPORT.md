# Design System Report — OTR Aula

Scope: token discipline, component consistency, and cross-builder drift across the 21
`app/lib/scr-*.ts` HTML-string builders, the shared shell (`app/lib/shell.ts`), the SPA
engine (`app/components/Aula.tsx`), and the token/style layer
(`app/styles/{tokens,app,screens,responsive}.css`). Grounded in the audit's Design System
global, the per-screen findings, and live behavioral capture. Every issue is tagged
**FIXED** / **DEFERRED** / **OPEN** against `FIXES_APPLIED.md`.

---

## Verdict

The design system is **mature and unusually disciplined for an in-progress product**
(audit Design System global; capture: "design language is mature and consistent"). It is
not the product's weak axis — `consistency` scores 6.8/10 product-wide, above
`accessibility` (5.5), `enterpriseReadiness` (6.4), and `discoverability` (6.6) in
`SCORES.md`. `tokens.css` is the single source of truth; raw hex across 21 builders is
**near-zero (9 literals total, mostly intentional)**; brand color semantics hold
(black = primary CTA, green = action/accent, gold = achievement-only — **no gold misuse
found anywhere**); and modal a11y is centralized (see "Modals" below).

The real DS debt is narrow: **component drift in a handful of repeated controls** (buttons,
chips, switches, badges, selects), a few **token-semantics slips** (green-as-text,
green/green alias collision, green stars), and **one cross-cutting class contract** — the
HTML-escaping ownership rule — whose violation produced the systemic `&amp;` double-escape.
The highest-user-impact item (escaping) is **FIXED**; most remaining items are
low-severity internal consistency.

---

## 1. Token usage — cream / black / green / gold

Brand contract (per `MEMORY.md` OTR design system + `tokens.css`): **cream `#F7F7ED`**
canvas, **black `#0C0C0C`** primary CTA, **green `#2CAA20`** action/accent, **gold
`#F2B814`** achievement/logro. `--otr-sky`/`--otr-navy` are **aliases to green/black**, not
blue.

| Area | State | Evidence |
|---|---|---|
| Token source-of-truth (`tokens.css`) | **Solid** | DS global: single source of truth; 9 raw-hex literals across 21 builders, mostly intentional |
| Black = primary CTA, green = action, gold = achievement | **Holds** | DS global: "brand color semantics hold … no gold misuse found anywhere" |
| Green-as-text below AA contrast (MKT-02) | **FIXED (partial)** | `--action`/`--action-hover` used for text on white/cream = 3.0–3.9:1; `--otr-green-text` (#176B11, 6.67:1) exists for exactly this |
| Gold-as-text below AA (LIFE-03, MKT-08) | **OPEN** | sub-60 skill score in `--warn` #C8920C on white (~3.6:1); discount `.badge.ok` 3.73:1 |
| Green stars (token-semantics violation) (PROF-03) | **OPEN** | rating stars hardcode `var(--otr-sky)` (= green); achievement should be gold |
| green/green alias collision (DEB-06) | **OPEN** | `--otr-sky === --otr-green`, so "ok" vs "sky" states render the same hue, defeating the encoding |

### MKT-02 — green text below AA contrast — **FIXED (partial)**
`--action` (#2CAA20) is 3.05:1 on white / 2.83:1 on cream; `--action-hover` (#1E8C16) ≈3.9:1
— both under the 4.5:1 AA floor for normal text, even though the system **already ships
`--otr-green-text` (#176B11, 6.67:1) created expressly for green text**. This is avoidable
token drift, not a missing token.
- **FIXED:** `.course-card .cc-pct` repointed `--action-hover` → `--otr-green-text` in
  `screens.css` (FIXES_APPLIED §5).
- **DEFERRED:** the global `.sky { color: var(--action) }` (`app.css:24`) and `.eyebrow`
  (`app.css:118`) repoints — held back pending an audit of `.sky` usage on **dark**
  surfaces (risk of invisible green text on the dark hero). Specified for follow-up. The
  "Ver perfil" link and "Marketplace" eyebrow still inherit the sub-AA green.

### PROF-03 — green rating stars — **OPEN**
`starsRO()` (`scr-profile.ts:12`) and the clickable review `.star` buttons (`:463`) fill in
`var(--otr-sky)`, which aliases to **green** — but stars are an *achievement/quality* signal
and the brand reserves **gold** for that. This is both a token-semantics violation and a
universal-convention break (Jakob). Same file already uses gold correctly for the
certificate seal and badge medals, so the fix is a one-token swap to `--otr-gold`. Removal
is not applicable; correctness here is recoloring.

### LIFE-03 / MKT-08 — gold/warn used as text on pale — **OPEN**
`tokens.css:19` itself flags `--otr-gold-lo`/#C8920C as "NO texto sobre pálido: 2.4:1," yet
the sub-60 skill score (`scr-lifetime.ts:178`) and the `-N%` discount badge
(`.badge.ok`, `app.css:202`) use that hue family as readable text. Fix = use the darker
text token, keep the bright hue only on bars/icons. Low severity, low effort.

---

## 2. Component consistency

Capture confirms a **consistent card / KPI / hero / right-rail vocabulary across all four
roles** ("Dashboard, lesson, debate hub, marketplace all read as premium"). The drift is
concentrated in five repeated *controls*, not in the page-level composition.

| Component | State | Detail |
|---|---|---|
| **Cards / KPIs / hero / right-rail** | **Consistent** | capture: mature, consistent patterns across roles |
| **Modals** | **Centralized (intentional)** | `Aula.tsx` MutationObserver retrofits aria-modal/labelledby/focus-trap/Escape onto every injected `.modal` → inline `role="dialog"`-only markup is correct, NOT a finding (DS global) |
| **Chips (filters)** | **FIXED** | span→`<button>` normalization — see §3 |
| **Buttons (secondary)** | **OPEN** | `btn-soft` (54×) vs `btn-ghost` (48×) used interchangeably for the same secondary role; no rule; "Volver" rendered as both |
| **Buttons (affirmative-green)** | **OPEN** | `.btn-accent` fully defined in CSS, used **0 times** — dead code inviting future inconsistency |
| **On/off switch** | **OPEN** | hand-rolled inline 3×; real color drift — settings uses `--otr-green`, lifetime uses `--otr-sky-lo` for the identical "on" state |
| **Language toggle** | **OPEN** | copy-pasted between `shell.ts` and `scr-settings.ts` |
| **Status badges/pills** | **PARTIAL** | pill overloaded with a full sentence (CW-02, OPEN); raw enum vs humanized label (ROOM-01, OPEN) |
| **Selects** | **OPEN** | `.input` vs `.select` mixed on one screen; inline padding override kills `--ctrl-h` (PARENT-04) |
| **Internal tabs** | **OPEN** | `subTabs()` lack `role="tablist"`/`aria-selected`; active state is color-only (CW-05) |

### Buttons
- **Secondary-action drift (DS global #4) — OPEN.** `btn-soft` and `btn-ghost` carry the
  same secondary-action role with no governing rule, including "Volver" rendered both ways.
  Visible downstream: COACH-05 — the courseBuilder hero is "a wall of equally-weighted
  ghost/soft buttons" with no primary, failing the 5-second test. LRN-07 — "mark complete"
  sits in different places on `player` vs `lesson`. DEB-08 — the *same* "Registrar un
  debate" action ships in **three** button styles (white-on-navy hero, `btn-primary`,
  `btn-soft`) with two labels. Honor removal: pick one secondary weight, delete the other's
  usage; collapse DEB-08's three entry points to one.
- **`.btn-accent` dead component (DS global #1) — OPEN.** Fully styled, zero call sites.
  **Removal > addition**: delete it, or adopt it deliberately as *the* affirmative button so
  the on/off-switch green stops being hand-rolled.

### Switches & language toggle (DS global #2, #3) — OPEN
The on/off switch is reimplemented inline three times and **drifts in color** (settings
`--otr-green` vs lifetime `--otr-sky-lo` for the same "on"). The language toggle is
duplicated across `shell.ts` and `scr-settings.ts`. Both are textbook extract-to-shared-
component candidates; consolidation reduces surface and removes the drift by construction.

### Status badges / pills — PARTIAL
- **CW-02 (high) — OPEN.** The PENDING status renders a **~30-char sentence** ("Esperando
  consentimiento del padre") inside a `.badge` pill built for 1–2-word states
  (height 22px, weight 700, pill radius; `app.css:197`) — it wraps/overflows and out-weights
  the status it sits beside. The component is being overloaded; the explanation belongs in
  the row subtext. Removal-oriented: shorten the pill to "Pendiente," move the sentence out.
- **ROOM-01 (medium) — OPEN.** The room aside prints the **raw enum** `CONFIRMED`/`PENDING`
  via `esc(b.status)` (`scr-room.ts:129`), while `scr-mybookings.ts statusBadge()`
  humanizes the *same* booking to "Confirmada." Same data, two renderings across linked
  screens. Fix = reuse/extract the shared `statusBadge()`.

### Selects (PARENT-04) — OPEN
On the parent portal, the report selector uses `class="input"` while the threshold selector
uses `class="select"` **plus** an inline `padding` override that defeats the design-system
`--ctrl-h` (36px) and the `.select` chevron — yielding one 36px control and one ad-hoc
shrunk control in the same view. Standardize on `.select`, drop the inline override.

### KPI density (CORE-04, capture) — OPEN
Not a token issue but a KPI-component composition one: the student dashboard stacks 8+ card
regions / ~25 data points above the fold, and capture flags the **4 KPI cards as very tall
on mobile** ("heavy scroll for 4 numbers") — candidate for a 2×2 grid via `responsive.css`
`.grid.g-4`. CORE-03 also surfaces a **verbatim-duplicated primary CTA** (hero CTA repeated
in the Achievements card footer, `scr-core.ts:308`) — removal recommended.

---

## 3. Chip span→button normalization — **FIXED**

This was the clearest component-drift cluster and is now resolved. The app had **three
different chip implementations** for the same filter-chip role:

| Site | Pre-fix | Pattern |
|---|---|---|
| Marketplace (`scr-marketplace.ts`) | `<button class="chip">` | **canonical** — native keyboard |
| Teacher "En riesgo" (`scr-teacher.ts:89`) | `<span class="chip" role="button" tabindex="0">` + keydown | a11y-correct, verbose |
| Participants filter (`scr-teacher.ts:626-629`) | bare `<span class="chip">`, click-only | **keyboard-dead** (COACH-01, high) |
| Admin role filter (`scr-admin-users.ts:133-134`) | bare `<span class="chip">`, click-only | **keyboard-dead** (ADM-02, high) — "the ONLY chip-as-filter that breaks the pattern" |

The two broken span-chips were **converted `span` → `<button>`**, inheriting native
keyboard operability and aligning with the marketplace canonical pattern
(FIXES_APPLIED §2: `scr-teacher.ts`, `scr-admin-users.ts`; validated: 4 participant + 5 admin
chips are now `<button>`). This is the right resolution — the `<button>` element absorbs the
role/tabindex/keydown that the `<span role="button">` variant had to add by hand, so it
**removes** scaffolding rather than adding it. A `makeChipKeyboardable()` shared helper was
proposed (COACH-01) but the `<button>` route made it unnecessary.

> Open follow-up: the marketplace chips already carry `aria-pressed`; confirm the newly
> converted filter buttons reflect active state via `aria-pressed` too (recommended in
> COACH-01/ADM-02). Not asserted as validated in FIXES_APPLIED.

The same keyboard-operability gap on **clickable `<div>`s** (not chips — coach cards,
debate tiles, quiz options, lifetime skill rows, profile course rows, course accordions)
was fixed in the same pass by adding `role="button" tabindex="0"` so the existing
`Aula.tsx` Enter/Space→`.click()` bridge picks them up (FIXES_APPLIED §2; findings LRN-01,
MKT-01/A11Y-01, DEB-01, PROF-01, LIFE-01/A11Y-02). These share the chip cluster's root
cause — clickable behavior attached without the `role`+`tabindex` the central handler
requires — so they belong to the same design-system contract: **anything clickable must
match `[role="button"][tabindex]` or be a native interactive element.**

---

## 4. The escaping contract — a design-system rule

This is the single most consequential DS finding and is now codified by the fix.

**The rule:** `queries.ts` (the **data layer**) HTML-escapes user-text fields **once**;
`scr-*.ts` (the **view/builder layer**) renders those fields **raw** (`${field}`), never
`esc()`-ing them again. `esc()` (`esc.ts:11`) is **non-idempotent** —
`esc("&amp;")` → `"&amp;amp;"` — so any second escape on a queries-sourced field corrupts
the output.

**The violation (systemic `&amp;` double-escape, known bug #1):** the contract was
**undocumented**, so builders disagreed about who owns escaping. Roughly half the surfaces
re-`esc()`'d already-escaped fields. The split was literally visible in adjacent files:

- `scr-learn.ts:567` comments "YA vienen esc() desde queries.ts" and renders raw — **correct**.
- `scr-teacher.ts:600` carries the same warning — **correct**.
- `scr-core.ts`, `scr-marketplace.ts`, `scr-debate.ts`, `scr-extra.ts`, `scr-profile.ts`,
  `scr-certificate.ts`, `scr-room.ts` re-`esc()`'d — **wrong**, producing literal `&amp;`.

User-visible on the exact commercial surfaces that sell the product: course "Oratoria
**&amp;** Speaking" (catalog cards + course-switcher tabs), coach headline "Lincoln-Douglas
**&amp;** Policy" (marketplace cards + profile) — confirmed live in `behavioral-capture.md`
(CONFIRMED BUG #1) and against seed data. **Same defect class as the leaderboard
double-escape already fixed in commit `a062cd5`** — i.e. this was a *recurrence*, which is
the strongest argument for writing the rule down.

**Status — FIXED.** FIXES_APPLIED §1 removed the redundant `esc()` at **~20 confirmed
double-escape sites** across `scr-extra.ts`, `scr-core.ts`, `scr-marketplace.ts`,
`scr-profile.ts`, `scr-certificate.ts`, `scr-teacher.ts`, `scr-room.ts`. The fix was an
**audit, not a blanket strip**: `esc()` was *kept* on genuinely-raw fields (`code`, ids,
urls) and on truly-unescaped input (`window.__q`). Validated live: **0 literal entities**
across student (24 routes), coach (10), parent (7), admin (7). Dead code in `scr-hub.ts`
(3 sites, disabled/no-route) intentionally left untouched.

**Finding-tracking nuance.** This was filed twice. The screen-level instances (CORE-01,
CORE-06, MKT-06, COACH-03) are in `confirmedHigh`/findings and FIXED. The **global
contract framing, DS-01, sits in `rejectedHigh`** — but it was rejected *only* as a
**net-new** finding (it re-files known bug #1, which scope rules barred from re-reporting),
and its severity was corrected high → **medium** (cosmetic text only, no XSS, two
ampersand-bearing fields in current data). The adversarial verdict explicitly confirms
**"the underlying defect is technically real"** and even caught two factual slips in the
original filing (the cited string is the `headline` field, not `specialties`;
`queries.ts:790` is inside `initialsFrom`, the real escape is `:798`). So: the *defect* is
real and **fixed**; only the *duplicate filing* was rejected.

**Recommended hardening (DEFERRED, from DS-01's own recommendation):** add a one-line
contract comment at the top of `esc.ts` and `queries.ts` — *"data from queries.ts is
already HTML-safe; never esc() it again in scr-\*.ts"* — and treat any
`esc(<field-from-queries>)` as a grep-able lint rule. Without the written rule, the fact
that this exact class recurred (leaderboard → catalog/marketplace) predicts a third
recurrence. Optional: make `esc()` idempotent so a double-escape is a no-op rather than a
defect — but that masks the contract instead of enforcing it; prefer the documented rule.

A sibling attribute-escaping gap (COACH-03, `scr-extra.ts:233/277`: `data-name="${c.name}"`
interpolated **raw** into a data attribute, breaking on `"` and participating in the `&amp;`
class) was part of the same §1 fix sweep.

---

## 5. Heading semantics — the other systemic class contract — **DEFERRED**

Adjacent to escaping, and the same "visual class applied to whatever element is convenient"
anti-pattern: the page title is a **non-semantic `<div class="page-title">` in ~42 places**;
only 2 screens use a real `<h1>`, and `scr-debate.ts`, `scr-marketplace.ts`,
`scr-teacher.ts`, `scr-parent.ts`, `scr-admin.ts`, `scr-lifetime.ts` contain **no `<h1>` at
all** (A11Y-03, MKT-03, PROF-02, COACH-06, LRN-04, LIFE-05). The class carries all styling,
so promoting `<div class="page-title">` → `<h1 class="page-title">` is **mechanical and
visually identical**. **DEFERRED** as a dedicated codemod sweep (FIXES_APPLIED "Deferred")
to avoid hand-editing ~45 tags on a flaky dev build — the right call: a sweep is one
reviewable diff, hand-edits drift. This is the largest single lever on the weakest axis
(`accessibility` 5.5 in `SCORES.md`).

---

## 6. Priority queue (DS-scoped)

| # | Item | Finding(s) | Severity | Status | Action |
|---|---|---|---|---|---|
| 1 | Escaping contract / `&amp;` double-escape | DS-01, CORE-01/06, MKT-06, COACH-03 | high→med | **FIXED** | Add written contract comment + grep guard (DEFERRED) |
| 2 | Chip span→button normalization | COACH-01, ADM-02 | high | **FIXED** | Confirm `aria-pressed` on converted buttons |
| 3 | Heading `<div>`→`<h1>` codemod | A11Y-03, MKT-03, PROF-02, COACH-06, LRN-04, LIFE-05 | high | **DEFERRED** | One codemod sweep; biggest a11y lever |
| 4 | Green-as-text contrast | MKT-02 | high | **FIXED (partial)** | Repoint `.sky`/`.eyebrow` after dark-surface audit |
| 5 | Status pill overload / raw enum | CW-02, ROOM-01 | high/med | **OPEN** | Shorten pill; reuse shared `statusBadge()` |
| 6 | Secondary-button rule (`btn-soft`/`btn-ghost`) | DS global #4, COACH-05, DEB-08, LRN-07 | low | **OPEN** | Pick one weight; remove the other's usage |
| 7 | Switch + language-toggle duplication | DS global #2, #3 | low | **OPEN** | Extract shared components; kills color drift |
| 8 | Dead `.btn-accent` component | DS global #1 | low | **OPEN** | Remove (or adopt as canonical affirmative) |
| 9 | Green stars → gold | PROF-03 | medium | **OPEN** | One-token swap to `--otr-gold` |
| 10 | green/green alias collision | DEB-06 | medium | **OPEN** | Repoint "ok"/"sky" pair to distinct tokens |
| 11 | gold/warn-as-text contrast | LIFE-03, MKT-08 | low/med | **OPEN** | Use darker text token; keep hue on bars/icons |
| 12 | Select class/height inconsistency | PARENT-04 | medium | **OPEN** | Standardize on `.select`; drop inline padding |

---

## Bottom line

The OTR Aula design system is in **good shape** — token discipline holds, brand semantics
are clean (especially gold-as-achievement, which has **zero misuse**), and modal a11y is
correctly centralized. The two **systemic class contracts** are where DS rigor pays off:
escaping (now **FIXED**, and the recurrence argues for writing the rule down) and headings
(**DEFERRED** to a codemod, the single biggest accessibility lever). The chip span→button
normalization is **done and correct** — it removed bespoke scaffolding in favor of a native
element. The remaining OPEN items are low-severity control drift (buttons, switches, badges,
selects, stars) best resolved by **consolidation and removal** (delete dead `.btn-accent`,
extract the duplicated switch/toggle, pick one secondary-button weight) rather than adding
new components — consistent with the simplification ethos.
