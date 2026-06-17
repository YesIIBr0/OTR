# Exploratory QA — OTR Aula

Scope: the bug class of the review — `fixType=fix-bug` findings, empty/error-state
behavior, the systemic double-escape, render health, and the environment artifacts
that were *not* product bugs. Every claim is grounded in a finding id, a source path,
or a verified source line. Status of each issue (FIXED / DEFERRED / OPEN / REFUTED) is
cross-referenced against `docs/review/FIXES_APPLIED.md` and re-checked against live
source where it mattered.

---

## 1. Render health — confirmed, before and after fixes

The behavioral capture (`docs/review/capture/behavioral-capture.md`) is the ground
truth, taken live in-browser via Preview MCP against `npm run dev`:

> **Every screen, in every one of the 4 roles, renders with ZERO console errors and
> zero thrown exceptions.**

| Role | Login | Routes swept | Result |
|---|---|---|---|
| Student | `analia.reyes@otr.do` | 26 (dashboard → search) | all render, 0 errors |
| Coach | `saul@otr.do` (Profesor) | 10 (dashboard, teacher, coachwork, builder…) | all render, 0 errors |
| Parent | `rosa.fermin@otr.do` (Familia) | 7 (parent, dashboard, membership…) | all render, 0 errors |
| Admin | `admin@otr.do` (Administración) | 7 (admin console, admin-users…) | all render, 0 errors |

Render health held **after** the fixes too — `FIXES_APPLIED.md` re-validated all four
roles in-browser, asserting (a) no literal HTML entity in rendered text, (b) zero
console errors, (c) keyboard attributes present on interactive elements. So the fixes
are non-regressive on the one axis that matters most: nothing crashes, nothing throws.

This is the important framing for the rest of the report. **None of the bugs below are
crashes.** They are silent-correctness and silent-failure defects — the kind a smoke
test misses precisely because the screen renders cleanly while showing the wrong thing.

---

## 2. The double-escape story (the one systemic bug)

**The single highest-value QA finding is a class, not an instance.** Multiple lenses
independently surfaced the same defect (CORE-01, CORE-06, MKT-06, COACH-03, DS-01),
which is itself the strongest signal it was real.

**Root cause — a broken escaping contract.** User-text fields are HTML-escaped *once*
at the data layer, in `app/lib/queries.ts` (`name`, `coach`, `headline`, `specialties`,
`format`, `modality`, `programName`, `packageName`, `title`; e.g. `name: esc(...)`,
`coach: esc(...)`). The intended contract is **"queries escapes, builders render raw."**
But there was no documented rule, so roughly half the `scr-*.ts` builders called `esc()`
a *second* time on those already-safe values. Because `esc()` is non-idempotent
(`esc("&amp;") → "&amp;amp;"`, per `app/lib/esc.ts:11`), and the output is injected via
`root.innerHTML` with no decode step, the user saw the literal entity `&amp;`.

The contract drift was visible in-repo: `scr-learn.ts` and `scr-teacher.ts` carry
explicit comments saying *"ya vienen esc() desde queries.ts — no re-escapar"* and do
**not** double-escape, while the other builders did — the same field treated as raw in
one file and pre-escaped in another. Same class as the leaderboard double-escape already
fixed in commit `a062cd5`.

**~20 sites, observed live.** The capture caught it on real seed data:

| Surface | Rendered (bug) | Source |
|---|---|---|
| Catalog card + course-switcher tabs | "Oratoria **&amp;** Speaking" | seed course `prisma/seed.ts:347` |
| Marketplace coach headline | "Lincoln-Douglas **&amp;** Policy" | seed `seed.ts:1163` |

`FIXES_APPLIED.md §1` enumerates the touched builders: `scr-extra.ts` (catalog card,
manage, course-builder ×3, search card), `scr-core.ts` (dashboard recos, course-switcher,
course hero, course-index, next-step), `scr-marketplace.ts` (coach card + profile:
name/headline/specialties), `scr-profile.ts`, `scr-certificate.ts`, `scr-teacher.ts`,
`scr-room.ts`.

**The fix honored the simplification ethos: removal, not addition.** The redundant
`esc()` was *deleted* at every confirmed site (kept on genuinely-raw fields like `code`,
ids, urls, and unescaped input like `window.__q`). It was a targeted audit — not a
blanket strip — because over-correcting in the other direction (e.g. the COACH-03
recommendation) would have *re-introduced* the double-escape (see §5).

**Validation (re-verified live in this pass):**

```
grep "esc(c.name)|esc(c.coach)|esc(.headline)|esc(.specialties)" app/lib/scr-*.ts
  → none in any active builder
app/lib/scr-hub.ts (disabled, no route): 23 esc() calls still present — dead code, intentionally untouched
```

`FIXES_APPLIED.md` reports 0 literal entities across student (24 routes), coach (10),
parent (7), admin (7). **Status: FIXED.** The disabled `scr-hub.ts` (forum/arsenal, no
route per PRD) was correctly left alone — fixing dead code adds risk for no user-facing
benefit.

**Follow-up worth doing (OPEN, cheap):** add a one-line contract comment at the top of
`esc.ts` / `queries.ts` ("data from queries.ts is already HTML-safe; never `esc()` it
again in `scr-*.ts`") so the grep `esc(<field-from-queries>)` becomes a standing lint.
DS-01 recommended exactly this; it was refuted only as a *net-new* finding (duplicate of
the systemic bug), not as a bad idea.

---

## 3. Bug findings — disposition (`fixType=fix-bug`, 27 total)

The audit raised 27 bugs. Three were **refuted** by adversarial verification (§5), one
is a refuted duplicate (DS-01), leaving 23 real defects. Disposition below.

### FIXED

| ID | Sev | Screen | Bug | Where |
|---|---|---|---|---|
| CORE-01 | high | catalog | `&amp;` on catalog cards (double-escape) | `scr-extra.ts` |
| CORE-06 | low | dashboard | `esc(a.title)` double-escapes activity rows in leaderboard-empty fallback | `scr-core.ts:332` |
| MKT-06 | med | marketplace | coach specialty `&amp;` (double-escape instance) | `scr-marketplace.ts:206/465` |
| IA-01 | high | coachwork | "Activa tu perfil" CTA routed to read-only public profile; now `data-go="profile"` (editable) | `scr-coachwork.ts:304` |
| CW-01 | high→low | coachwork | Agenda empty-state CTA no longer routes to the browse grid (`explore`→coach route) | `scr-coachwork.ts:209` |

IA-01 was the high-severity one: the single most important supply-side onboarding CTA
("Activa tu perfil de coach") dead-ended a new coach on a *non-editable* public view with
the wrong nav item highlighted. Verified live: line 304 now reads `data-go="profile"`.

### DEFERRED (verified, specified in `findings-backlog.md`)

| ID | Sev | Screen | Bug | Why deferred |
|---|---|---|---|---|
| CERT-01 | high | certificate | `window.print()` has no diploma-scoped print stylesheet → the diploma prints with the dark sidebar, topbar, breadcrumbs, and the print button itself around it. | Needs an `@media print` block + a `#cert-print` hook |
| CORE-02 | high→med | search | "Personas" section is permanently empty for students — `S.search` reads `DB.students`, which `queries.ts` populates **only** in the `isTeacher` block. A student searching a classmate always gets "Sin resultados". Advertised feature dead for its only audience. | Recommend honest removal of the section (no privacy-cleared people source) per simplification ethos |
| MKT-04 | med | coach booking | Generic-availability fallback advertises slots the 12h `LEAD_MS` rule then removes; user dead-ends on "Sin horarios libres este día" with a no-reason disabled confirm | Add provisional-schedule copy + disabled-CTA hint |
| MEM-03 | low | membership | `btn.textContent='Actualizando…'` clobbers the Pro button's icon HTML; restore path rebuilds text only → icon lost after a failed retry | Capture/restore `innerHTML` or lean on `repaint()` |
| CW-04 | med | coachwork | Add-slot validates only `end>start`; no overlap/duplicate check → coaches create conflicting franjas | Client-side overlap scan + warn |
| CW-06 | med | coachwork | `window.__cwTab` never resets on entry; re-entering coachwork silently reopens a stale tab with no URL cue | Reset on fresh nav or sync to route |
| PARENT-05 | med | parentPortal | Threshold `<select>` does **not** revert on a failed PATCH — parent thinks "Auto hasta $50" is active when the backend rejected it. False state on a money/safety control. | Restore prior value in `catch` |
| PARENT-08 | low | parentPortal | Inconsistent destructive guards: per-session "Cancelar" is 2-tap-armed, but Reject-approval has **no** confirm; neither explains the consequence | Align both flows |
| ADM-05 | med | adminUsers | Admin's own row still offers role-change/Suspender; backend rejects after a round-trip → red error toast for a legitimate-looking action | Disable self-controls + "Tú" badge |
| ADM-08 | low | adminUsers | Role change/verify/suspend fire immediately, toast-only, no confirm/undo — one misclick can promote a student to Administrador, silent and irreversible from the UI | Confirm on ADMIN transitions + undo |
| PROF-07 | low | profile | "Tu rango" card prints raw `xpNext-xp` (e.g. `1234`) while the line below uses `.toLocaleString('es')` (`1.234`); no max-level guard → "0 XP para el siguiente nivel" | Reuse the `S.progress` formatting + max-level branch |
| MSG-01 | med | messages | Conversation switch is a full `go('messages')` re-render (loses scroll/focus, re-animates); send is fire-and-forget with a swallowed `.catch` → a failed send shows the user's own bubble with zero error signal | In-place thread swap + send-failure surface |
| SET-03 | low | settings | "Cambiar contraseña" hard-depends on `w.otrFormModal`; if absent it dead-ends with "No disponible aquí" and no fallback | Guarantee the modal or provide a fallback route |
| DEB-05 | med | debateHub | Tournament register + record-debate optimistically patch local `DB` and never `refresh()`; toast says "Debate registrado" but the round is absent from history/KPIs until reload → "did it save?" + re-submit risk | Call global `refresh()` after the POST |
| DEB-09 | low | debateHub | PF practice timer state is closure-local; any `repaint()` (tab switch) resets a running clock to 0:00 with no warning | Persist timer state on `window` |
| IA-03 | med | global | `renderApp()` only role-gates routes with an explicit `role` field; ~11 student-only routes (progress, lifetime, badges, grades…) have none, so coach/parent/admin can reach student-mental-model screens | Tag student routes `role:'student'` |
| IA-04 | med | global | `renderApp()` does `if(!def) return;` — a bad/dead route link is a **silent no-op** (no toast, no 404, no console hint) | `console.warn` + toast/redirect to `ROLE_HOME` |

A11Y-class fixes for some of these screens *did* ship (keyboard operability, form labels,
`ADM-01` duplicate-role-option removal) per `FIXES_APPLIED.md §2–4`; the bug-logic items
above are the deferred remainder, each with an exact file/line/fix in the backlog.

### OPEN (recommended, not yet specified as a deferral)

- **Escaping-contract lint** (from §2 / DS-01) — a grep guard so the double-escape class
  cannot silently return.

---

## 4. Empty / error-state behavior

The capture confirms the **expected** empty states render cleanly and intentionally:
quiz-results (no attempt), room (no active session), placement (already placed). Those
are healthy. The QA concern is the **dishonest or silent** ones:

| State | Finding | Symptom | Status |
|---|---|---|---|
| Search "Personas" | CORE-02 | always empty for students; count + copy silently courses-only | DEFERRED (prefer removal) |
| Coachwork Agenda empty | CW-01 / IA-01 | CTA dead-ended (browse grid / read-only profile) | FIXED |
| Coach booking, no availability | MKT-04 | "Sin horarios libres" + reasonless disabled CTA | DEFERRED |
| Parent threshold failure | PARENT-05 | `<select>` shows the rejected value (false state) | DEFERRED |
| Messages send failure | MSG-01 | swallowed `.catch` → bubble shown, recipient never got it | DEFERRED |
| Debate register | DEB-05 | success toast, round absent until reload | DEFERRED |
| Unknown route | IA-04 | click → nothing (worst feedback state) | DEFERRED |
| Quiz with no exam | LRN-02 | existing "No hay examen disponible" empty state already covers it | REFUTED (see §5) |

The common thread: **success-toast-without-reconciliation** and **silent fallbacks**.
The fixed ones removed dead ends; the deferred ones share a single cheap pattern — call
the global `refresh()` / revert-on-error instead of optimistically trusting a 200.

---

## 5. Refuted bugs — what the adversarial pass caught (don't re-fix these)

The verification pass refuted 4 of the filed bugs. Each refutation is itself a QA result
worth recording, because two of them would have *introduced* a regression if "fixed."

| ID | Filed as | Why refuted |
|---|---|---|
| **LRN-02** | high: student served the *wrong* exam via cross-course fallback, graded on it | **No publish state exists.** `Quiz` (schema 229-237) has no draft/published field, and the nav invariant sets `window.__quizLesson` to the exact clicked lesson, so `byLesson[lid]` returns that lesson's own quiz. The cross-course fallback only fires for a quiz-lesson with zero `Quiz` rows in the entire DB. At most low-severity defensive hardening. |
| **DEB-03** | high: analytics labels render blank from a key mismatch | **Finding inverted the source of truth.** It treated a stale header *comment* as the contract; the actual producer `queries.ts` ships `{format}` (746), `{side}` (747), `{criterion}` (762), and `recordRow` reads exactly those keys. Labels render correctly. Only defect is a cosmetic stale comment. |
| **COACH-03** | high: raw `c.name` in `data-name` breaks attribute / dead buttons | **Premise false + fix harmful.** `teacherCourses[].name` is already escaped at `queries.ts:1553`; `&quot;`/`&amp;` are valid inside a quoted attribute — no break-out. The recommended `esc(c.name)` would *double-escape* "Oratoria & Speaking" and mangle the edit-form prefill. |
| **DS-01** | high: systemic escaping contract failure | Technically real but a **re-filing of the §2 double-escape** (the finding admits "known bug #1"). Not net-new. (Its lint recommendation is still worth doing — tracked as OPEN.) |

Takeaway: the COACH-03 case is the load-bearing one. The `manage`/`courseBuilder`
double-escape *was* real, but at the **visible-title** sites (`scr-extra.ts:228/263/270`),
not at the `data-name` attribute the finding targeted. The applied fix removed `esc()`
from the title sites (correct) and did **not** apply the harmful `esc()`-wrapping the
finding recommended.

---

## 6. Environment artifacts — NOT product bugs (excluded)

Two failures observed during the session were environment noise, correctly excluded from
findings (`behavioral-capture.md`, `FIXES_APPLIED.md §Excluded`):

1. **Stale `.next` dev cache 500s.** `Cannot find module './4996.js'` on every login
   mid-session. Cleared with `rm -rf .next` + restart. A dev-server cache artifact, not
   shipped code.

2. **Login `.lb-wave` hydration mismatch.** The Auth audio-bar wave appeared to emit
   different `height`/`animation-delay` on server vs client. **Refuted as a code bug:**
   the values come from a deterministic `Math.sin` (no randomness), so on a clean build
   server and client emit identical values. The observed mismatch was a symptom of the
   same stale `.next` cache, not the code. Optional hardening only: round `h` to fixed
   precision to make the wave bullet-proof against any future build-order skew.

Both were correctly kept out of the product-defect count — a clean separation of
"the app is broken" from "my dev environment is stale."

---

## 7. Bottom line

- **Render health is solid:** 36 screens × 4 roles, 0 console errors, before and after
  fixes. No crashes were found anywhere.
- **The defining bug is one class — the double-escape (~20 sites) — and it is FIXED by
  removal**, with dead code (`scr-hub.ts`) correctly left alone. The one cheap follow-up
  is a lint comment so it can't silently return (OPEN).
- **The remaining bug surface is silent-failure, not crash:** optimistic writes without
  reconciliation, dishonest empty states, ungated routes. High-stakes ones (IA-01 coach
  onboarding) are FIXED; the financial/irreversible ones (PARENT-05 threshold, ADM-08
  role change, DEB-05 register, MSG-01 send) are DEFERRED with exact fixes specified and
  all share the same one-line remedy: reconcile against server truth instead of trusting
  a 200.
- **The adversarial pass earned its keep:** it refuted 3 filed bugs (LRN-02, DEB-03,
  COACH-03) — one of which had a regression-inducing "fix" — plus a duplicate (DS-01),
  and it correctly separated 2 environment artifacts from product defects.
