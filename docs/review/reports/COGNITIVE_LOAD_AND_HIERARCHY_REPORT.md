# Cognitive Load, Visual Hierarchy & Scanability — OTR Aula

Lenses applied: **Hick** (choice count → decision time), **Miller** (7±2 working-memory chunks per surface), **Fitts** (target size/distance), **Jakob** (match external/internal conventions), **Tesler** (irreducible complexity must live *somewhere* — the question is whether the system or the user absorbs it).

Product-wide axis averages (from `SCORES.md`):

| Axis | Avg | Read |
|---|---|---|
| cognitiveLoad | 6.9 | Mid. Not a structural problem; localized to a handful of dense surfaces. |
| visualHierarchy | 7.4 | Strong. The polished student flows carry it. |
| scanability | 7.4 | Strong. Same. |

**Headline:** the product is visually mature and consistent, so cognitive-load defects are *concentrated*, not pervasive. They cluster in the **supply-side (coach) screens**, the **marketplace filter zone**, and the **parent portal** — never in the polished student learning flow. The remedy is overwhelmingly **merge / simplify / eliminate**, not redesign (honors the removal-over-addition ethos). Most of these are still **OPEN**: the fix pass spent its budget on accessibility (keyboard operability + the systemic `&amp;` bug), correctly leaving the density work as a documented next round.

---

## 1. The worst offenders (ranked by disappear-test impact)

### COG-01 — Coach "Seguimiento del grupo" is two full pages on one route — DEFERRED
`app/lib/scr-teacher.ts` (`S.teacher.render` + `managePanel`, ~L56–200). **The single densest screen in the app and the only one with two `page-head`s.** `render()` concatenates a tracking dashboard (page-head "Seguimiento del grupo" + 4 KPIs + 7-column roster + "Requieren atención" rail + "Pendientes de calificar" card) and then `managePanel()` — itself a complete page (its own page-head "Estructura del curso" + 4 *more* KPIs + the Cursos→Módulos→Lecciones→Examen tree). Net: **~8 KPI tiles and two competing primary objectives** (monitor students vs. author content) with no single obvious next action.

- Miller + visual-hierarchy failure. A time-pressed coach must scan ~8 numbers and two headers to orient; the genuinely urgent items (at-risk students, ungraded submissions) compete with course-structure counts that are reference data, not decisions.
- Compounded by **SIMP-04 / COACH-04**: this `managePanel` tree is the *third* overlapping course-structure surface (`teacher.managePanel` + `manage` + `courseBuilder` all render the same tree), and it even links to `manage` via "Editor completo" — so it is largely a redundant preview.
- **Fix (deferred, specified in FIXES_APPLIED.md):** split into `Grupo` | `Contenido` tabs (reuse the existing `.tabs` pattern that debate/coachwork already use) **or** move `managePanel()` to its own `manage` route and replace the inline panel with one compact link card. Surface ONE primary action (Calificar when `pendingSubs>0`, else first at-risk student). Drop the 4 "Estructura del curso" vanity KPIs. Removes ~65 lines and one of two page identities.

### PARENT-01 — Parent controls fragmented across three cards — OPEN
`app/lib/scr-parent.ts` (`childCard` L124–186; `membershipCard` thresholds L319–354; public-profile block L437–449). The right rail stacks **six cards**, and per-child controls for the *same child* are scattered: skill/attendance in the child card, the approval-threshold select inside the **Membership** card, the public-profile toggle inside the **Security** card.

- A non-technical parent — the exact target audience — cannot form a mental model of where to manage a given child. Decisions that belong together are fragmented across visually distant cards; blows past Miller for one scannable surface.
- **Fix:** consolidate into one collapsible "Controles de {child}" section inside each `childCard`; leave the Membership card for plan/billing and the Security card for the static reassurance bullets only. Cuts the rail from 6 → ~4 cards and gives each child one self-contained control surface. (`SIMP-07` is the same merge at lower severity; `PARENT-06` separately calls for a ~40–50% cut of the 3–4×-repeated "everything is safe / you approve everything" reassurance copy.)

### MKT-05 / COG-02 — Marketplace shows up to 11 filter controls before any result — OPEN
`app/lib/scr-marketplace.ts` (`renderGrid` ~L239–269). The filter zone stacks **up to 8 specialty chips** + **3 selects** (Idioma / Precio / Orden) + a conditional clear button — for a catalog that holds a *small* number of coaches. Classic Hick's-law overload: a wall of decision surface (~2 rows above the fold, pushing cards down) where most filters return the same short set, and there is no search box — the higher-value control.

- **Fix:** cap chips to ~5 with a "+N más" expander; merge the selects or keep only specialty + price; add a single name/specialty text search (it absorbs the chips — Tesler's). Gate the chip row behind a "Filtros" toggle until `all.length` exceeds ~9. Results visible without scrolling past the filter bar.

### COACH-05 — courseBuilder hero: six equal-weight ghost buttons, no primary — OPEN
`app/lib/scr-extra.ts` (`S.courseBuilder` hero L273–279). The hero crams six controls into one row (back-link, save-chip, edit-mode toggle, publish toggle, Configuración, Vista previa) — and the screen's actual objective, *build the course*, has **no primary button in the hero**; the real "Añadir actividad" is buried per-section below. **The 5-second test fails:** the eye lands on a row of equally-weighted ghost/soft buttons with no anchor.

- **Fix:** promote ONE primary ("+ Añadir sección"); collapse Configuración + Vista previa into a quiet overflow cluster; drop the duplicate publish surface (hero toggle vs. Configuración → Estado — pick one).

### CW-02 — Pending status is a 30-char sentence stuffed into a pill — DEFERRED
`app/lib/scr-coachwork.ts` (`statusBadge()` ~L158). PENDING renders as `<span class="badge warn">Esperando consentimiento del padre</span>`. `.badge` is a 22px-tall, 700-weight, pill-radius component built for 1–2-word states (`Confirmada`, `Completada`). A ~30-char string either overflows, wraps into a lumpy multi-line pill, or breaks the row — worst on the mobile wrap row — and **out-weights the actual status it sits beside**.

- **Fix (deferred):** set the pill to "Pendiente" (≤2 words like every other state) and move the explanation into the faint subtext line of `bookingRow()`.

---

## 2. Mobile-specific load: stat-card verbosity

Flagged in `behavioral-capture.md` and formalized as **CORE-04** (`scr-core.ts` KPIs L135–141 + `responsive.css .grid.g-4`) — **OPEN**:

- The 4 student-dashboard KPI cards are **very tall on mobile** — "a full screen of scroll for 4 simple numbers." Above the fold the dashboard already stacks hero + 4 KPI tiles + 6-bar radar + 3 reco cards + a right rail (upcoming / debate rank / achievements / leaderboard) = **8+ card regions and ~25 discrete data points** competing on first paint (>7±2).
- Capture also noted two adjacent mobile defects to fold into the same pass: coach topbar "+ Crear" truncates to "Crea"; a floating circular avatar overlaps the bottom tab bar.
- **Fix:** collapse the 4 tiles to a 2×2 compact grid on mobile (adjust `.grid.g-4`), and visually subordinate the reco + leaderboard blocks (lighter heading weight / muted) so the hero + next-session read as primary. **No data removal — pure hierarchy.**

---

## 3. Duplicated primary actions (hierarchy dilution)

The most prominent action should appear **once**. Two confirmed violations, both **OPEN**:

| ID | Screen | Defect | Fix |
|---|---|---|---|
| CORE-03 / SIMP-02 | dashboard | Achievements card footer button is a **byte-for-byte copy** of the hero CTA — same icon, label, `onclick` (`scr-core.ts:308` reuses `na.onclick`/`na.cta`). Identical primary action twice within one scroll. | Repoint to "Ver logros" → `go('lifetime')` (or `badges`). Hero owns the single CTA. |
| MEM-02 | membership | Plan status stated **three times** (hero H2 + "Plan vigente" badge + "En este plan desde…") then a 4th in the disabled tier button; a sales sentence competes with the cards that make the same point. | Shrink hero to one identity line; drop the badge or the prose. Reserve the dark treatment for the Pro card, not the status hero. |
| PROF-04 | coach (self) | Rating + review count shown **three times** (hero inline row + hero KPI strip + right-rail "Valoración" card). | Drop Rating/Reseñas from the hero KPI strip; let the rail card own it. |

---

## 4. Per-row choice multiplication (Hick + Fitts)

**COG-03 / COACH-07** — `app/lib/scr-teacher.ts` participants roster (`studentRow` ~L605–617) — **OPEN**. Every row carries **three competing actions of three visual weights**: "Adjudicar" (btn-soft), "Evaluar" (btn-ghost), and a **30×30px icon-only** message button. The repeated 3-way decision multiplies across the whole roster (Hick); the icon button is below the 44px Fitts/touch target and labeled only by `title=` (invisible to touch/AT). Two heavyweight authoring actions (Adjudicar moves Glicko rating; Evaluar = eval-skills) are surfaced at equal prominence on every row.

- **Fix:** demote to one primary row action + an overflow ("⋯") menu, or drop the per-row message icon (reachable from student detail). For any icon-only control: add `aria-label`, bump to 36–44px. Same fix applies to the icon button in the "Requieren atención" rows (`scr-teacher.ts:117`).

---

## 5. Faked hierarchy — visual weight without semantics

**MKT-03 / A11Y-03 / PROF-02** — heading structure is faked with font-weight only — **DEFERRED** (codemod sweep). The marketplace grid title is `<div class="page-title">` (`scr-marketplace.ts:244`); the coach name is `<b class="brand-font">` (L441); every section label ("Sobre…", "Reseñas", "Reserva tu sesión", "Credenciales", "Especialidades") is a bold `<b>`. Sighted users see hierarchy; a screen-reader user gets **no heading landmarks and no programmatic page title** — scanability collapses for AT. The deferral is sound: it is mechanical and visually identical (the class carries all styling), batched as a `<div class="page-title">→<h1>` + section `<h2>` codemod across ~45 sites to avoid hand-editing on a flaky dev build. This is the main drag on the otherwise-strong scanability/hierarchy scores once you account for AT.

Related lower-severity hierarchy noise (all **OPEN**): **PROF-08** — `S.progress` labels a block "Radar OTR" but renders 6 horizontal bars, losing the multi-axis "shape" a radar communicates at a glance (cheapest fix: rename to "Competencias"). **LRN-05** — `quizResults` honors tone is dead code (`tone = passed ? (pct>=90?'ok':'ok')`), so the 90%+ moment is visually flat. **LRN-06** — a real lesson's "En esta lección" TOC rail collapses to a single dead `href="#"` self-link (~220px of sticky noise; passes the disappear test).

---

## 6. Counterexamples — screens that exemplify good hierarchy

These set the bar the offenders should be held to, and confirm the team *knows how* to do this — the defects are localized, not systemic.

| Screen | Avg | visu | scan | cogn | Why it works |
|---|---|---|---|---|---|
| **lesson** | 7.9 | **9** | 8 | 8 | Excellent long-form hierarchy: clear title → "Regla OTR" callout → in-lesson TOC → completion checkbox. Strongest hierarchy score in the product. (Note the TOC degrades on real lessons — LRN-06.) |
| **placement** | 7.5 | **9** | 8 | 8 | One job, one surface: 6 sliders, unambiguous. Highest visualHierarchy in the app. (Marred only by PL-01: sliders get the *least* design attention despite being the whole task — no `.pl-range` CSS, default thumb, no focus ring.) |
| **dashboard** | 7.3 | **8** | 7 | 6 | Strong "TU SIGUIENTE PASO" hero + clear primary CTA anchors the page despite high density. The hierarchy *holds* the load — but `cognitiveLoad` (6) is its weakest axis, exactly the CORE-04/SIMP-02 pressure: the hero is great, the surrounding 8 regions dilute it. |

The lesson: where one surface owns **one objective and one primary action**, OTR's hierarchy is excellent (8–9). Where a route stacks two objectives (teacher), six equal buttons (courseBuilder), six cards (parentPortal), or eleven filters (marketplace), it falls to 5.8–6.0. The fix in every case is to **give the surface back a single answer to "what do I do here?"** — by merging, demoting, or removing, never by adding.

---

## Fix-status ledger

| ID | Issue | Status |
|---|---|---|
| COG-01 | Coach screen = two pages / ~8 KPIs / two page-heads | **DEFERRED** (split into Grupo/Contenido tabs — specified) |
| CW-02 | Pending status sentence in a fixed-height pill | **DEFERRED** (label→"Pendiente", move text to subtext) |
| MKT-03 / A11Y-03 / PROF-02 | Faked headings (no landmarks for AT) | **DEFERRED** (codemod `<div class=page-title>`→`<h1>`, ~45 sites) |
| CORE-04 | Dashboard density + tall mobile KPI cards | **OPEN** (2×2 mobile grid + subordinate reco/leaderboard) |
| CORE-03 / SIMP-02 | Dashboard duplicate hero CTA | **OPEN** |
| PARENT-01 / SIMP-07 / PARENT-06 | Parent controls fragmented + repeated reassurance | **OPEN** |
| MKT-05 / COG-02 | Marketplace ~11 filters before any result | **OPEN** |
| COACH-05 | courseBuilder hero: 6 equal buttons, no primary | **OPEN** |
| COACH-04 / SIMP-04 | Coach: 3 overlapping course-structure surfaces | **OPEN** |
| COG-03 / COACH-07 | Participants 3-action rows + 30×30 icon target | **OPEN** (icon-btn a11y handled centrally; demotion not) |
| MEM-01 / MEM-02 / PROF-04 / LIFE-06 | Repeated status / non-buyable Elite tier / 7 undifferentiated tiles | **OPEN** |
| PROF-08 / LRN-05 / LRN-06 / EVT-01 / SET-02 / DEB-07 / COG-05 | Hierarchy/scanability noise (radar mislabel, dead honors tone, dead TOC, redirect-surface Events, over-carded Settings, "Glicko-2" jargon hero, Overview/hero dup) | **OPEN** |
| SIMP-01 | Progress Center: 4 nav items, 3 overlap (highest-leverage IA merge) | **OPEN** (cross-ref IA report; 4→2 destinations) |

Scope note per `behavioral-capture.md`: every screen renders with **zero console errors** — none of the above is a crash or a render failure. These are *attention-economy* defects: the product works, but on a handful of surfaces it makes the user, not the system, absorb the complexity (Tesler). The keyboard-operability and `&amp;` correctness work shipped first (see `FIXES_APPLIED.md`); this density backlog is the recommended next pass and is almost entirely merge/eliminate.
