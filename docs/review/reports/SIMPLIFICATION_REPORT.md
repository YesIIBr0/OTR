# Simplification Report — OTR Aula

**Phase priority: SIMPLIFICATION (removal > addition).** Filtered to `fixType ∈ {eliminate, merge, automate, simplify}` from `findings-raw.json` (56 of 128 findings, 44%). Status is cross-referenced against `FIXES_APPLIED.md`: **FIXED** (1), **DEFERRED** (2), **REJECTED** by adversarial verification (4), **OPEN** (49). Every claim is grounded in a finding id + file path.

The product scores 6.9/10 overall (`SCORES.md`), with **simplicity 6.7** the third-weakest axis. Behavioral truth: every screen renders with zero console errors (`behavioral-capture.md`) — so nothing here is about breakage. It is about *surface*: the app does too much in too many places. The signal across 56 findings is consistent — duplicated CTAs, duplicated progress surfaces, redundant nav destinations, decorative data, and copy-pasted controls. None of it is load-bearing.

**Disappear-test framing:** for each item I ask "if this vanished tomorrow, would users miss it?" A confident *no* is the strongest simplification signal.

---

## Status legend & verification notes

Four "simplification" findings were filed as HIGH but **REFUTED** by adversarial verification (`rejectedHigh`). They are documented here so they are not re-opened:

| Id | Filed as | Verdict | Why refuted |
|---|---|---|---|
| SIMP-01 | merge progress nav 4→2 | **REJECTED** | "core overlap claim is materially wrong … subjective IA preference." `progress`/`badges` carry unique surfaces (level track, cert/badge grid). |
| DEB-02 | merge Debate Hub 6 tabs → 3-4 | **REJECTED** | Citations accurate but each tab is a real destination; merge is preference, not defect. (Lower-conf `COG-05` reframes this correctly as content de-dup, not tab removal.) |
| PARENT-01 | merge per-child controls | **REJECTED** | "factual substrate accurate but … subjective IA preference dressed as a high-severity defect." (Lower-sev `SIMP-07`/`PARENT-04` capture the genuine sub-issues.) |
| IA-02 | gate/scope topbar search | **REJECTED** | Citations accurate (search is student-only, shown to all roles) but graded a preference, not a confirmed defect. |

**Takeaway:** the verified high-severity simplification wins are narrower than the raw findings suggest. The durable, defensible removals are the *duplicates* (CORE-03/SIMP-02, PROF-04, CW-07), *decorative/dead* code (COACH-02/08, DS-04, IA-06), *non-actionable surfaces* (MEM-01/SIMP-08, EVT-01/SIMP-03), and *component drift* (DS-02/05/06, ROOM-01).

---

## ELIMINATE — remove it; nobody will miss it

Items where the disappear-test answer is a clean *no*. Complexity-reduction score (CRS) 1–5 = how much surface area vanishes.

| Id | What to remove | Disappear test | User impact | Business impact | CRS | Status |
|---|---|---|---|---|---|---|
| **SIMP-02 / CORE-03** | Dashboard "Achievements" footer button = byte-for-byte copy of the hero's primary CTA (`scr-core.ts:308`) | **No** — hero owns the action | Two identical primary buttons violate the screen's own "exactly ONE next action" rule (`scr-core.ts:54`) | None | 2 | **OPEN** |
| **COACH-02** | Roster "7 días" sparkline — synthetic; 3 hardcoded bar arrays keyed off one boolean, identical for any two "up" students (`scr-teacher.ts:93,101,7`) | **No** — text Engagement pill + Últ. acceso already carry the signal | Coach misreads decorative glyph as real weekly engagement → mistrust on a "who's slipping" decision | None | 3 | **DEFERRED** |
| **MEM-01 / SIMP-08** | Membership "Elite" tier card — fully disabled ("Próximamente", price "Muy pronto", 4 phantom bullets), eats 1/3 of the pricing grid (`scr-lifetime.ts:544-558`) | **No** — nothing is purchasable | Burns attention on a dead column on the conversion-critical screen; Pro CTA is 1-of-3 not 1-of-2 | None (arguably hurts conversion) | 3 | **OPEN** |
| **PROF-04** | Coach self-profile rating+reviews shown **three times** (hero row, hero KPI strip, right-rail card) (`scr-profile.ts:221-223`) | **No** — rail card already owns it | Redundant numbers dilute the one unique KPI (Programas) | None | 2 | **OPEN** |
| **CW-07** | Escrow/take-rate copy repeated 3×; the Disponibilidad-tab escrow alert is off-topic noise (`scr-coachwork.ts:375-377,254-262`) | **No** — keep one canonical Ingresos alert | Repetition + scroll; dilutes the tab's real job (edit slots) | None | 2 | **OPEN** |
| **CORE-05** | Catalog "Gratis" price slot on 100% of cards (`price:0` forced in `queries.ts:1430`; dead `price>0` branch in `scr-extra.ts:191`) | **No** — implies a pricing axis that doesn't exist | Noise that slightly cheapens the prestige brand; latent dead branch | None | 2 | **OPEN** |
| **COACH-04 / SIMP-04** | Teacher dashboard's embedded `managePanel` — 2nd 4-KPI strip + read-only course tree duplicating manage/course-builder (`scr-teacher.ts:136-200`) | **Mostly** — tracking is the screen's job; structure lives in manage | Two page identities on one route; ~65 lines + a redundant KPI grid | None | 4 | **OPEN** |
| **SIMP-03** | Events nav item — no action it owns; every CTA redirects to Debate Hub; list mirrors dashboard's upcoming rail (`shell.ts:23`, `scr-events.ts`) | **No** — dashboard + Debate Hub do it faster | Extra top-level nav + mobile-tab pressure for a pure redirect surface | None | 3 | **OPEN** |
| **COACH-08** | `trendIc` helper — never called; tangled one-liner with a no-op `.replace` short-circuit (`scr-teacher.ts:8`) | **No** — dead code | None (maintenance hazard) | None | 1 | **OPEN** |
| **DS-04** | `.btn-accent` green-primary class — 0 uses; only refs are the CSS def + a comment (`app.css:134-135`) | **No** — dead | None today; latent brand-violation trap (primary must be black) | None | 1 | **OPEN** |
| **IA-06** | `badge:'Varsity'` literal on the student "Niveles" nav item — never renders (runtime override wins from `DB.me.level`) (`shell.ts:32`) | **No** — already overridden | None (source-of-truth contradiction for maintainers) | None | 1 | **OPEN** |
| **SIMP-09** | Lesson `defaultProse` 10-line demo essay on the unreachable no-lesson path, duplicated across `scr-learn.ts:551` and `scr-core.ts:541-616` | **No** — replace with honest empty state | Risk of demo text leaking; two divergent `S.lesson` defs invite drift | None | 2 | **OPEN** |
| **LRN-06** | In-lesson outline rail that, for a real lesson, collapses to one dead self-link `<a href="#" onclick="return false">` (`scr-core.ts:601-607`) | **No** — a TOC of one fake link | ~220px sticky rail with a clickable-looking no-op (links should go somewhere) | None | 2 | **OPEN** |

---

## MERGE — two surfaces doing one job; fold them

| Id | What to merge | User impact | Business impact | CRS | Status |
|---|---|---|---|---|---|
| **COG-01** | Teacher route = two full pages on one scroll (tracking dashboard + `managePanel` content authoring), ~8 KPIs, two page-heads — the densest screen in the app (`scr-teacher.ts:56-200`) | Coach scans 8 numbers + 2 headers with no single obvious next action; urgent items (at-risk, ungraded) compete with vanity counts | None | 4 | **DEFERRED** |
| **ADM-01** | Role picker offers **both** "Profesor / Coach" (TEACHER) and "Coach" (COACH) — app treats them as one role (`isCoachRole`, backend merges them) (`scr-admin-users.ts:26-32`) | Admin can't predict which to pick; silently splits coach data across two stored values | None | 2 | **FIXED** ✅ |
| **ROOM-01** | Session room prints raw enum `CONFIRMED`/`PENDING` while `scr-mybookings.ts` `statusBadge()` humanizes it everywhere else (`scr-room.ts` Estado row) | Untranslated DB code inside the *paid* room — breaks Spanish-first polish exactly where trust matters | None | 2 | **OPEN** |
| **DS-02** | On/off switch hand-coded inline in 3 places (`scr-settings.ts:28,35` verbatim copies + `scr-lifetime.ts:372`), with **drifted colors** (`--otr-green` vs `--otr-sky-lo`) | Same "enabled" state shows two greens across screens; 3× maintenance surface | None | 3 | **OPEN** |
| **DS-05** | ES/EN language pill implemented twice with copy-pasted inline styles, already drifted in font-size/padding (`shell.ts:177-178` + `scr-settings.ts:76-78`) | Same control looks subtly different in topbar vs Settings | None | 2 | **OPEN** |
| **LRN-07** | "Marcar como completada" lives in two different spots across player vs lesson; player also has two "Volver" paths (`scr-learn.ts:604-618`, `scr-core.ts:595-614`) | Student must re-hunt for "mark complete"; duplicate back buttons add Hick's overhead | None | 2 | **OPEN** |
| **DEB-04** | Debate Hub ships its own `openModal()` + `.seg` wiring duplicating the centralized `Aula.tsx` helpers (`scr-debate.ts:621-658`) | Mostly maintainer-facing; subtle modal inconsistency, future shared fixes won't reach it | None | 2 | **OPEN** |
| **SET-02** | Three single-row "cards" (Idioma, Membresía, Perfil público) whose only content is a route-elsewhere button (`scr-settings.ts`) | Tall cards for one-line routers dilute the screen's real owned controls | None | 2 | **OPEN** |
| **COACH-07 / COG-03** | Participant rows carry 3 competing actions (Adjudicar / Evaluar / 30px icon msg) at 3 weights; icon button below touch target, no `aria-label` (`scr-teacher.ts:612-617`) | Dense per-row control strip; touch + AT users get an unlabeled 30px target | None | 2 | **OPEN** |
| **LIFE-04** | Public-profile privacy toggle is the *last* rail card (bottom of a long mobile scroll) — the one control that most needs to be findable (`scr-lifetime.ts:409,91`) | Consent control has poor discoverability; move to top of rail or surface a status chip | None | 2 | **OPEN** |
| **SIMP-07** | Parent rail = 6 stacked cards; two consent-style controls (public-profile, approval-threshold) split across different cards (`scr-parent.ts:330-353,428-450`) | "Where do I control what my kid shares?" is harder than it should be for a non-technical parent | None | 2 | **OPEN** |
| **IA-05** | Coach sidebar: lone "Coaches" marketplace link as a one-item "Principal" group above the actual workspace (`shell.ts:47-71`) | Top sidebar slot is a cross-side browse link, not the coach's home; redundant group header | None | 1 | **OPEN** |

> Refuted merges (do not re-open): **SIMP-01**, **DEB-02**, **PARENT-01** — see verification table above.

---

## AUTOMATE — the system has the signal; stop asking the user

Only 2 findings in the whole audit are `automate` — both about completion bookkeeping the system already knows.

| Id | What to automate | User impact | Business impact | CRS | Status |
|---|---|---|---|---|---|
| **SIMP-05** | Auto-mark a lesson complete when its terminal action succeeds. Quiz-pass already flips `doneByMe` server-side; assignment submit + video/text do **not** — so a finished lesson still shows pending and blocks auto-advance (`scr-learn.ts:349-359` + `/api/submissions`) | Student submits an assignment, then must remember a 2nd "mark complete" click on another screen; course % silently lags reality → "the system isn't tracking me" | None | 3 | **OPEN** |
| **LRN-08** | Quiz has no "answered N/Y" state and no persistence — all answers live in a `mount()` closure (`scr-learn.ts:421-489`); a stray `go()` discards everything with no warning, completeness only surfaced in a finalize-time toast | A mis-click loses all work on a graded exam; no at-a-glance progress; anxiety on a high-stakes surface | None | 2 | **OPEN** |

*Note:* `LRN-08` is partly an additive fix (a counter + sessionStorage) rather than pure removal — it earns its place because it *removes a failure mode* (silent data loss). `SIMP-05` is the cleaner automation: delete a step the system can infer.

---

## SIMPLIFY — keep the capability, cut the surface

Hierarchy, defaults, and noise reduction — no capability removed.

| Id | Simplification | User impact | Business impact | CRS | Status |
|---|---|---|---|---|---|
| **CW-02** | PENDING status is a ~30-char sentence stuffed in a pill built for 1-2 words → overflows/wraps, especially mobile (`scr-coachwork.ts:158`) | Lumpy pill competes with the "Rechazar" action; mobile agenda row noisy | None | 2 | **OPEN** |
| **COACH-05** | courseBuilder hero crams 6 equal-weight controls and has **no primary button** for the screen's actual job (add sections); duplicate publish path (`scr-extra.ts:273-279`, `Aula.tsx:661`) | 5-second test fails; non-technical coach can't tell what the screen is for; two publish surfaces invite confusion | None | 3 | **OPEN** |
| **COG-02 / MKT-05** | Marketplace shows up to **11 filter controls** (8 spec chips + 3 selects) above any result, on a small coach list (`scr-marketplace.ts:239-269`) | Choice paralysis before seeing value; filters push cards below the fold; most users never touch them | None | 2 | **OPEN** |
| **MEM-02** | Membership plan status restated 3× in the hero + once more in the tier card (`scr-lifetime.ts:488`) | First ~5s spent on restated status instead of the upgrade decision | None | 2 | **OPEN** |
| **LRN-10** | Assignment shows all 3 submission methods (record/upload/text) stacked + co-equal when `submitKinds` unset (`scr-learn.ts:95-189`) | Decision paralysis + long scroll for what's usually one submission type | None | 2 | **OPEN** |
| **LIFE-06** | Ledger renders 7 undifferentiated big-number tiles in a 4+3 split with overlapping concepts (`scr-lifetime.ts:217-227`) | Reads as a scoreboard wall; user scans all 7 to find the 2-3 that matter; heavy on mobile | None | 2 | **OPEN** |
| **ADM-06** | User search has no clear/reset; empty state offers no "Limpiar búsqueda" → admin lands in a filtered dead-end (`scr-admin-users.ts:104-161`) | Non-technical admin concludes "no users" when a stale filter is active | None | 2 | **OPEN** |
| **ADM-09** | Moderation queue can't segment OPEN vs REVIEWED; reviewed cards stay in the list (`scr-admin.ts:91-137`) | Admin loses the actionable signal in resolved noise; risk of missing an OPEN report | None | 2 | **OPEN** |
| **SIMP-06** | Student self-profile rebuilds level/XP/streak + badges cards — a 4th copy of progress data (`scr-profile.ts:316-333`) | Profile reads as a progress dashboard, not an identity page; duplicated numbers | None | 2 | **OPEN** |
| **EVT-01** | Events "Torneos" section per-row "Ver e inscribirme" buttons all redirect to Debate Hub (`scr-events.ts`) | Read list whose every action bounces the user elsewhere — a redirect masquerading as a destination | None | 2 | **OPEN** |
| **PARENT-04** | Two selects, two base classes/sizes; threshold select kills the design-system height + chevron via inline padding (`scr-parent.ts:227,338`) | Reads unpolished; lost chevron hurts dropdown discoverability | None | 1 | **OPEN** |
| **OB-01** | Onboarding footer = two near-equal exits ("Saltar" ghost vs primary CTA), both go to dashboard; skip silently discards input (`scr-hub.ts` ob-foot) | New users face a two-choice fork at the key moment; competitive "Saltar" lowers setup completion | None | 1 | **OPEN** |
| **CERT-02** | Certificate references 3 undefined CSS classes (`.cert-seal/.cert-name/.diploma`) → renders on inline-style accidents (`scr-certificate.ts` + `screens.css`) | Fragile, non-tunable layout; can't be made print-safe via CSS | None | 1 | **OPEN** |
| **PROF-08** | Block labeled "Radar OTR" renders as a vertical bar list, not a radar (`scr-profile.ts:102-107`) | Over-promises; the comparative "shape" of a debater's profile is flattened. Cheapest fix: rename to "Competencias" | None | 1 | **OPEN** |
| **CW-08** | Same student gets a black avatar in Agenda, green in Ingresos (`scr-coachwork.ts:186,271`) | Identity color should be stable per person across one screen | None | 1 | **OPEN** |
| **DS-03** | `btn-soft` (54×) vs `btn-ghost` (48×) applied to the same secondary-action role with no rule (`app.css` + 4 scr files) | The tinted button loses its meaning as an emphasis signal; author-by-author drift | None | 2 | **OPEN** |
| **DS-06** | Pill radius written as literal `100px`/`999px` in 6+ inline spots instead of `var(--r-pill)` (`scr-settings.ts`, `scr-lifetime.ts`, `scr-placement.ts`, `shell.ts`) | Negligible visually; token-discipline debt — fold into DS-02/DS-05 | None | 1 | **OPEN** |
| **DEB-08 / COG-05** | "Registrar un debate" appears in 3 button styles + a 2nd label that opens the same flow; Overview tab restates the hero (`scr-debate.ts:146,219,248,297`) | Recognition burden; can't tell two labels open one form; hero/Overview overlap. Content de-dup, **not** tab removal (cf. refuted DEB-02) | None | 1 | **OPEN** |
| **CORE-04** | Dashboard stacks 8+ card regions / ~25 data points above the fold; 4 KPI tiles very tall on mobile (`scr-core.ts` + `responsive.css .grid.g-4`) | First-time users face >7±2 regions; "one next step" diluted; mobile KPI row is a full screen of scroll. Hierarchy fix, no data removed | None | 2 | **OPEN** |

---

## Note: every `businessImpact` is "None"

Across all 56 simplification findings, the audit recorded `businessImpact: None`. That is honest, not a gap: these are *internal* surface-complexity costs (cognitive load, maintenance, brand coherence, scan time) rather than direct revenue events. The two that flirt with revenue — **MEM-01/SIMP-08** (a dead Elite card stealing focus from the only purchasable upgrade) and **EVT-01/SIMP-03** (a nav slot that converts nothing) — are the ones worth watching if conversion ever gets instrumented.

---

## The single highest-leverage simplification

**COACH-04 + COG-01 + SIMP-04 — collapse the coach's three overlapping course surfaces into one tracking dashboard + one authoring path.**

These three findings (all HIGH/medium, conf 0.7–0.85) describe **one root problem from three angles**: the teacher route concatenates *two full pages* on a single scroll — a student-tracking dashboard **and** an embedded `managePanel` content-authoring tree (`scr-teacher.ts:56-200`) — while `manage` (list) and `courseBuilder` (edit) already own authoring. The result is the densest screen in the app: ~8 KPI tiles, two page-heads, two competing primary objectives, and a course tree that is a third redundant view of structure the coach edits elsewhere.

Why it's the top pick:

- **Highest CRS in the report (4).** A single removal — strip `managePanel` from `S.teacher`, demote it to a one-line "Ir a Mis cursos" link, relocate the genuine 4 content-count KPIs to `manage` — deletes ~65 lines, one of two page identities, and a whole duplicated KPI grid.
- **Verified, not preference.** Unlike the refuted nav/tab merges (SIMP-01, DEB-02, PARENT-01), **COG-01 is in `confirmedHigh`** — adversarially upheld.
- **Directly lifts the weakest screens.** `teacher` scores **6.0** (simplicity 5, cognitive 5) — 2nd-lowest of 36 screens in `SCORES.md`. This is exactly where attention pays off.
- **Pure removal, zero capability loss.** Authoring already lives in `manage`/`courseBuilder`; the embedded tree is read-mostly and reachable two ways. Disappear-test: **no** — a coach loses nothing.

**Status: DEFERRED** (COG-01 is in the `FIXES_APPLIED.md` deferred list as "split teacher into Grupo/Contenido tabs"). Recommended next-pass execution: prefer *removal* over the tab-split — relocate the panel rather than re-home it inline, so the teacher dashboard becomes purely tracking with one obvious next action (`Calificar entregas` when `pendingSubs > 0`, else the first at-risk student).
