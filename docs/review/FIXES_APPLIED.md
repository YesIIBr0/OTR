# Fixes Applied — OTR Aula Product Review

All fixes implemented in the live source (`app/lib/scr-*.ts`, `app/components/Aula.tsx`,
`app/styles/screens.css`) and **re-validated live in-browser** across all four roles.
15 files changed. Validation method: navigate every route as each role; assert (a) no
literal HTML entity (`&amp;`/`&lt;`/`&gt;`) in rendered text, (b) zero console errors,
(c) keyboard attributes present on interactive elements.

## 1. Systemic `&amp;` double-escape — FIXED (HIGH, fix-bug) ✅
**Root cause:** the data layer (`app/lib/queries.ts`) HTML-escapes user-text fields once
(`name`, `coach`, `headline`, `specialties`, `format`, `modality`, `programName`,
`packageName`, `title`). The contract is "queries escapes, builders render raw," but ~20
builder sites called `esc()` again → `&amp;amp;` → the user saw the literal `&amp;`.
Observed on: catalog, course hero, course-switcher tabs, marketplace grid + profile,
student profile, certificate, coach panel, manage, course-builder, search.

**Fix:** removed the redundant `esc()` at every confirmed double-escape site (kept `esc()`
on raw fields like `code`, ids, urls, and genuinely-unescaped input like `window.__q`).
Sites: `scr-extra.ts` (catalog card, manage, course-builder ×3, search card),
`scr-core.ts` (dashboard recos, course-switcher, course hero, course-index, next-step),
`scr-marketplace.ts` (coach card + profile: name/headline/specialties),
`scr-profile.ts` (programs, names, headline, coach), `scr-certificate.ts` (name/title/program),
`scr-teacher.ts` (panel course header), `scr-room.ts` (package name).
**Validation:** 0 literal entities across student (24 routes), coach (10), parent (7), admin (7).
**Not touched:** `scr-hub.ts` (3 sites) — disabled screen (no route), dead code.

## 2. Keyboard operability of primary interactive elements — FIXED (3 CRITICAL + highs, a11y) ✅
Plain `<div>`s carrying click handlers were keyboard-dead. Added `role="button" tabindex="0"`
(+ `aria-label`/`aria-pressed`/`aria-expanded`) so they activate via the existing
`Aula.tsx` Enter/Space→`.click()` bridge:
- **LRN-01 (critical):** quiz answer options (`.q-opt`) + question-jump dots (`.q-dot`) — `scr-learn.ts`.
- **MKT-01 / A11Y-01 (critical):** marketplace coach cards (`data-coach`) — `scr-marketplace.ts`.
- **A11Y-01 (critical) / DEB-01:** Debate Hub history tiles (`data-debate`) — `scr-debate.ts`.
- **PROF-01:** profile "Mis programas" course cards — `scr-profile.ts`.
- **LIFE-01 / A11Y-02:** lifetime skill rows (`data-lpskill`, + `aria-expanded`) — `scr-lifetime.ts`.
- **A11Y-02:** course module accordion headers (`data-acc`, + `aria-expanded` synced on toggle in `Aula.tsx`) — `scr-core.ts` + `Aula.tsx`.
- **COACH-01 / ADM-02:** participant + admin-users filter chips converted `span`→`<button>` (native keyboard; matches the marketplace `.chip` button pattern) — `scr-teacher.ts`, `scr-admin-users.ts`.
**Validation:** coach cards, 4 quiz options, skill rows = `role=button`; 4 participant + 5 admin chips = `<button>`.

## 3. Form-control labels — FIXED (CW-03, PARENT-02, a11y) ✅
- Coachwork availability selects → `aria-label` (Día/Hora inicio/Hora fin); separator `aria-hidden` — `scr-coachwork.ts`.
- Parent approval-threshold select → `aria-label` with child name — `scr-parent.ts`.
- Participant search input → `aria-label` — `scr-teacher.ts`.

## 4. Routing / logic — FIXED ✅
- **CW-01:** coachwork Agenda empty-state CTA `data-go="explore"`→`"coach"` (was sending "see my profile" to the browse grid) — `scr-coachwork.ts`.
- **IA-01:** coachwork "Activa tu perfil" CTA `data-go="coach"`→`"profile"` (read-only view → editable profile) — `scr-coachwork.ts`.
- **ADM-01:** removed duplicate `COACH` option from the admin role picker (kept its label for legacy rows; TEACHER is canonical) — `scr-admin-users.ts`.

## 5. Contrast — PARTIAL (MKT-02, a11y) ✅/deferred
- `.course-card .cc-pct` repointed `--action-hover`→`--otr-green-text` (#176B11, AA ≥4.5:1) — `screens.css`.
- **Deferred:** global `.sky{color:var(--action)}` repoint — needs an audit of `.sky` usage on dark surfaces first (risk of invisible text on the dark hero). Specified for a follow-up.

## 6. Heading semantics — FIXED (repair pass) (A11Y-03 / MKT-03 / PROF-02, a11y) ✅
Every screen now exposes exactly one `<h1>` (was zero — screen titles were plain `<div>`s).
- **35 `<div class="page-title">` → `<h1 class="page-title">`** via a safe codemod (only matched content with no nested `<div>`, so the closing tag is unambiguous) across all live `scr-*.ts`.
- Added **`.page-title{margin:0}`** so the `<h1>` is pixel-identical to the old div (verified: computed font-size 24px, margin 0).
- 5 hero screens had no `page-title`: promoted the explicit-size hero titles to `<h1>` (course name, profile/coach names, lifetime name) and added a visually-hidden `<h1>` (new `.sr-only` class) for the dashboard / Debate Hub / membership / placement heroes — proper page heading for AT, zero visual change.
- Demoted the teacher panel's embedded "Estructura del curso" to `<h2>` (it's a sub-section under the screen's `<h1>`) to keep one h1 per screen.
- **Validated:** student (24 routes), coach, parent, admin — every screen exactly 1 `<h1>`, 0 multi-h1, 0 console errors.

## 7. Certificate print — FIXED (CERT-01) ✅
Added an `@media print` block (`screens.css`) so `window.print()` on the certificate prints only the diploma (`body:has(.diploma-wrap)` hides the shell + action chrome via visibility, repositions the diploma full-width, drops its shadow).

## Deferred (verified, specified — recommended next pass)
Documented in [findings-backlog.md](findings-backlog.md) with exact file/line/fix. These need a backend/data change or a product decision, so they were not forced:
- **COG-01:** split the coach "Seguimiento del grupo" into Grupo/Contenido tabs (it currently stacks tracking + course management — a layout redesign).
- **CORE-02:** student global search has no privacy-scoped people index — scope or hide (needs a query-layer change).
- **LRN-03:** assignment screen shows a generic CWI rubric for all 100-pt work — drive from real `L.rubric` data (needs the field; may be intentional default — product call).
- **COACH-02:** teacher roster sparkline plots a shape derived from a trend flag, not real daily data — feed a real 7-day series or remove the column (product call).
- **ADM-03:** moderation report shows raw `targetId` — show the target's name + "Ver" link (needs `targetName` joined in `queries.ts`).
- **MKT-02 (rest):** global `.sky{color:var(--action)}` contrast repoint — needs an audit of `.sky` usage on dark surfaces first (risk of invisible text on the dark hero).

## Excluded (not real bugs)
- **Login `.lb-wave` hydration mismatch:** deterministic `Math.sin` (no randomness); on a clean build server & client emit identical values. The mismatch was an artifact of a stale `.next` cache, not code. (Optional hardening: round `h` to fixed precision.)
- **Stale `.next` cache 500s** during the session — environment artifact, cleared with `rm -rf .next`.
- 10 findings refuted by adversarial verification (subjective IA preferences; defects already handled by centralized a11y layers; DS-01 = duplicate of the double-escape). See [findings-backlog.md](findings-backlog.md).
