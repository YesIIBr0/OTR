# Information Architecture + Cognitive Walkthrough — OTR Aula

Scope: navigation structure across all 4 roles, discoverability, predictability, redundant
routes, role-gating clarity, plus cognitive walkthroughs of the core student journey
(login→placement→dashboard→course→lesson→quiz) and the coach journey. Grounded in
`findings-raw.json`, the live `behavioral-capture.md`, `SCORES.md`, and `FIXES_APPLIED.md`.
Every issue is tagged FIXED / DEFERRED / OPEN against `FIXES_APPLIED.md`.

**Headline:** the IA is fundamentally sound and the most user-visible IA defect (IA-01,
coach onboarding routed to the wrong, read-only profile) is FIXED. The remaining IA issues
are structural-but-low-severity: a couple were adversarially **refuted as inflated**
(IA-02 search, SIMP-01 progress merge), and the genuine residue (silent no-op routing,
opt-in role gating, a dishonest people-search section) is OPEN/DEFERRED. Discoverability
scores 6.6/10 product-wide — middling, not broken. Removal beats addition on most of what
remains.

---

## 1. Navigation model (live ground truth)

The SPA has one chrome (`renderShell` in `app/lib/shell.ts`) driven by a per-role `NAV`
map (sidebar groups), a per-role `TABBAR` (mobile), `crumbs` per route, and a route
registry `ROUTES` in `app/lib/screens.ts`. Routing is entirely client-side via
`window.go(r)` → `renderApp(r)` in `app/components/Aula.tsx`. Render health is perfect:
every screen in every role renders with **zero console errors** (`behavioral-capture.md`).

### 1.1 Sidebar structure by role (from `shell.ts` `NAV`)

| Role | Group | Items (route) |
|---|---|---|
| **Student** | Principal | Inicio (`dashboard`), Debate Hub (`debate`), Eventos (`events`) |
| | Aprender | Cursos (`catalog`), Mi aprendizaje (`course`) |
| | Centro de progreso | Mi trayectoria (`lifetime`), Niveles (`progress`), Mis calificaciones (`grades`), Logros (`badges`) |
| | Marketplace | Coaches (`explore`), Mis reservas (`my-bookings`), Membresía (`membership`), Mensajes (`messages`) |
| **Coach** | Principal | Coaches (`explore`) — *single-item group* |
| | Espacio de coach | Panel de coach (`teacher`), Reservas e ingresos (`coachwork`), Gestionar (`manage`), Mensajes (`messages`), Mi perfil (`profile`) |
| | Centro de progreso | Participantes (`participants`) — *single-item group* |
| **Parent** | Principal | Portal de familia (`parent`), Membresía (`membership`) |
| | Marketplace | Coaches (`explore`), Mensajes (`messages`) |
| **Admin** | Administración | Moderación (`admin`), Usuarios (`admin-users`), Coaches (`explore`), Debate Hub (`debate`) |

Mobile `TABBAR` mirrors each role with a 4–5 item bottom bar; admin got its own tabbar
(`NAV-06`) so it no longer fell back to the student bar. Breadcrumbs are navigable
(`NAV-04`): non-final segments route to the section root via `crumbsHtml(crumbs, navRoute)`.

**Assessment.** Grouping is coherent and role-appropriate. The student "Principal /
Aprender / Centro de progreso / Marketplace" taxonomy is legible; coach "Espacio de coach"
is a clean supply-side workspace; parent and admin are deliberately lean and match the PRD
scope notes embedded as code comments. The mature, consistent visual language
(`behavioral-capture.md` §Visual) reinforces predictable wayfinding.

### 1.2 Two single-item coach groups — IA-05

The coach sidebar opens with a one-item "Principal" group containing only `explore`
(the consumer marketplace), and isolates "Participantes" in its own one-item "Centro de
progreso" group. A single-item "Principal" that points at the *consumer* side is an odd
anchor when the coach's real home is the workspace (IA-05, low, conf 0.62,
`shell.ts` `NAV.teacher` lines 47–71). Recommendation: fold `explore` into "Espacio de
coach" (or relabel "Marketplace") and drop the lone top group. **OPEN** — not in
`FIXES_APPLIED.md`; low-priority polish, removal-flavored.

---

## 2. Discoverability

Product-wide **discoverability = 6.6/10** (`SCORES.md`), the third-weakest axis. It is
dragged down by a handful of low scorers rather than a systemic failure: `search` (disc 4),
`lifetimeProfile` (disc 5), and `admin`/`teacher` mid-pack. The strongest surfaces
(`dashboard` disc 8, `badges` disc 8) show the team can do discoverability well — the
weakness is localized.

| Issue | Finding | Sev (verified) | Status |
|---|---|---|---|
| Student global search has no privacy-scoped people index; "Personas" section is **permanently empty** for the only role that can reach search | CORE-02 | **high** (confirmedHigh, conf 0.9) | **DEFERRED** |
| Topbar search box shown to all roles but result set is student-centric; course cards not navigable | IA-02 | **low** (refuted; severity inflated) | **OPEN** (low) |
| Parent "Vincular otro estudiante" buried as 6th rail card, far from the "Hijos vinculados" KPI | PARENT-07 | medium, conf 0.68 | **OPEN** |
| Lifetime "Public Profile" privacy toggle is the *last* rail card; on mobile it lands at the bottom of a long scroll | LIFE-04 | medium, conf 0.62 | **OPEN** |

**CORE-02 (DEFERRED, the real one).** `S.search` reads `DB.students`
(`scr-extra.ts:297`), but `queries.ts` only populates `base.students` inside the
`isTeacher` block (`queries.ts:1514-1526`) — for a student it is `undefined`, so the
"Personas" group is always empty and the result count is silently courses-only.
`FIXES_APPLIED.md` defers this with the correct, simplification-first recommendation:
**remove the "Personas" section and reword the page to "cursos" unless a privacy-cleared
people source exists** (removal > addition). Until then it is an honesty defect on a
prominent affordance.

**IA-02 (OPEN, downgraded).** Adversarial verification *refuted* the high severity: the
verdict (correctedSeverity **low**) confirms `DB.catalog` is built for every role
(`queries.ts:1469`, "visibles para todos los roles"), so coach/parent/admin get a
populated, relevant global course catalog — the "empty/irrelevant for 3 of 4 roles"
premise is false. The genuine residue is two low nits: the box has no role gate, and the
`S.search` course cards carry `class="tile click course-card"` but **no `data-go`/`role`/
`tabindex`** (`scr-extra.ts:306`), so results are not navigable. Worth a small follow-up;
not a high IA failure.

---

## 3. Predictability

Predictability is mostly strong — consistent card/KPI/rail patterns, navigable crumbs,
role-stable chrome — but three concrete predictability defects exist; the worst is FIXED.

| Issue | Finding | Sev | Status |
|---|---|---|---|
| Coach "Activa tu perfil de coach" empty-state routed to read-only **public** profile (`coach`), not the editable one (`profile`); sidebar falsely highlighted "Mi perfil" | IA-01 | **high** (confirmedHigh, conf 0.92) | **FIXED** |
| Coachwork Agenda empty-state "Ver mi perfil en el marketplace" routed to `explore` (the browse grid), not the coach's own listing | CW-01 | **high** (confirmedHigh, conf 0.92) | **FIXED** |
| Unknown/dead route = **silent no-op**: `renderApp` does `if (!def) return;` with no toast, no 404, no console hint | IA-04 | medium, conf 0.7 | **OPEN** |
| Coachwork tab state lives in global `window.__cwTab`, never reset on entry; returning re-opens a stale tab (e.g. Ingresos) with no cue | CW-06 | medium, conf 0.6 | **OPEN** |
| Debate PF practice timer resets to 0:00 on any sub-tab repaint (closure state, not persisted) | DEB-09 | low, conf 0.6 | **OPEN** |

**IA-01 (FIXED) — the most important IA fix.** Two confusingly-named routes collide:
`coach` = public read-only view (`renderStudentSelf`), `profile` = editable self
(`renderCoachSelf`). The onboarding CTA pointed at `coach`, dropping the coach on a
non-editable page while the sidebar lit "Mi perfil". `FIXES_APPLIED.md` §4 confirms the
fix: `data-go="coach"`→`"profile"` in `scr-coachwork.ts`. The finding's *secondary*
recommendation — give the `coach` route honest crumbs and `nav:'explore'` so viewing a
public coach never lights the viewer's own Perfil — is **not yet applied** (residual OPEN
nuance), but the user-facing landing bug is resolved.

**CW-01 (FIXED).** "See my listing" sent the coach to the generic shopping grid;
`FIXES_APPLIED.md` §4 confirms `data-go="explore"`→`"coach"`, matching the sibling
`viewAvailability` empty state that already did it right.

**IA-04 (OPEN) — the predictability gap that remains.** `renderApp`'s bare
`if (!def) return;` (`Aula.tsx:53-54`) means any typo'd or stale route dead-ends invisibly.
Live, the only emitters are OFF-by-design screens (`scr-hub.ts`, `scr-community.ts`), so
impact is latent, but the engine assumes every `go()` target is registered. Recommended
fix: `console.warn` in dev + toast/redirect to `ROLE_HOME`. Cheap insurance.

---

## 4. Redundant routes & route inventory

### 4.1 `explore` vs `marketplace` alias — benign, intentional

`screens.ts:61-62` registers **both** `explore` and `marketplace` pointing at the same
`screen:'marketplace'` with identical `nav:'explore'` and crumbs `['Marketplace','Coaches']`.
The comment documents it: "`explore` es el item 'Coaches' del nav; `marketplace` queda como
alias explícito de la misma pantalla." This is a deliberate alias for deep-link stability,
not user-facing redundancy — only `explore` appears in any nav. **No finding, no action.**
Keep it (or, if you want strict minimalism, drop `marketplace` and update any
`data-go="marketplace"` callers — low value, not flagged).

### 4.2 Progress Center: 4 items, proposed merge — SIMP-01 (refuted)

SIMP-01 proposed collapsing the student "Centro de progreso" from 4 items
(`lifetime`/`progress`/`grades`/`badges`) to 2, folding `progress` and `badges` into the
`lifetime` superset. Adversarial verification marked it **not-a-finding** (severity
"high" heavily inflated). The verdict's substance: the core overlap claim is *materially
wrong* — `S.progress` (`scr-profile.ts:54-133`) renders **no radar SVG**; it uniquely owns
competency *bars*, a horizontal level-track ladder, an XP-to-next bar, a 14-cell streak
grid, and a real "Subidas recientes" activity feed (`DB.activity`), **none of which exist
in `lifetimeProfile`**. So this is thematically-adjacent, distinct content — an intentional
PRD-wave decomposition — not redundancy. The merge is a product opinion, not a defect.
**OPEN as a product decision, not a bug.** The one concrete sub-item that *is* dead is
covered separately by IA-06.

### 4.3 Events "Torneos" mirrors Debate Hub — EVT-01

The entire Events "Torneos" section is a non-owning mirror: every `tournamentRow`'s only
control (`Ver e inscribirme →`) plus the footer (`Ver todos en el Debate Hub →`) routes
*away* to `debate`; the file's own comment confirms enrollment "NO se duplica: vive en el
Debate Hub" (EVT-01, medium, conf 0.7, `scr-events.ts`). A redirect surface masquerading
as a destination. Removal-first fix: collapse to a one-line teaser + single pointer to the
Hub. **OPEN.**

### 4.4 Dead static badge — IA-06

`NAV.student` `progress` item declares `badge:'Varsity'` (`shell.ts:32`), but `navBadge()`
overrides it at runtime with `DB.me?.level` (`shell.ts:125`), which per commit `c1dcce4`
is "Novato" for new users. The literal "Varsity" never renders — dead, contradictory source.
Recommended: delete `badge:'Varsity'` (IA-06, low, conf 0.8). **OPEN** — trivial removal.

---

## 5. Role-gating clarity — IA-03 (the structural risk)

The route guard is **opt-in, not an allow-list**. `renderApp` only redirects when a route
carries an explicit `role` field (`Aula.tsx:57`); routes without it are globally reachable.
Confirmed in `screens.ts`: `teacher`/`participants`/`manage`/`course-builder` have
`role:'teacher'`; `admin`/`admin-users` have `role:'admin'`. But the **student-shaped
routes carry no `role` field** — `progress`, `lifetime`, `badges`, `grades`, `course`,
`catalog`, `placement`, `certificate`, `membership`, `my-bookings` — so a coach/parent/
admin who reaches them (via a stray `go()`, a hand-edited `#hash`, or formerly via search)
renders student-only "Niveles / Mi trayectoria / Mis calificaciones" inside their own
shell. The code comments themselves assert these concepts "NO va para el profesor/coach —
no es su concepto" (`shell.ts:66-70`), yet nothing prevents arrival.

IA-03 (medium, conf 0.78, `screens.ts` + guard at `Aula.tsx:57`): tag student-only routes
with `role:'student'` so the existing guard redirects non-students to `ROLE_HOME`. Keep
genuinely shared routes (`membership`, `explore`, `messages`, `settings`, `profile`,
`dashboard`, `events`, `debate`) ungated. **OPEN** — not in `FIXES_APPLIED.md`. This is the
single most worthwhile IA hardening left: it converts an implicit, leaky model into an
explicit positive allow-list. Note it partially intersects CORE-02 — once search stops
exposing cross-role destinations, the practical exposure shrinks, but the guard gap remains.

The one role-gating defect that **was** fixed: ADM-01 removed a duplicate `COACH` option
from the admin role picker (TEACHER is canonical) — **FIXED** (`FIXES_APPLIED.md` §4).

---

## 6. Cognitive walkthrough — core student journey

Login → Placement → Dashboard → Course → Lesson → Quiz. Each step asked: *Will the user
know what to do, see the control, understand the feedback?*

| Step | Will they know the next action? | Feedback clear? | Friction / finding |
|---|---|---|---|
| **Login** | Yes — single auth surface | Render OK, 0 errors | `.lb-wave` hydration mismatch was an artifact of a stale `.next` cache, **not code** — excluded (`FIXES_APPLIED.md` §Excluded). No action. |
| **Placement** | Yes — clear, high visual hierarchy (visu 9, avg 7.5) | Strong | Already-placed users see an expected empty state (`behavioral-capture.md`). Range derives from XP (commit `c1dcce4`); everyone starts Novato — consistent. |
| **Dashboard** | **Yes — exemplary.** "TU SIGUIENTE PASO" hero + single primary CTA ("Continuar lección") | Strong; disc 8, clar 8 | Mobile: 4 KPI cards very tall — heavy scroll for 4 numbers (candidate 2×2 grid, `behavioral-capture.md`). Not a blocker. |
| **Course** | Yes — course hero + module accordion | Accordion now keyboard-operable + `aria-expanded` synced (A11Y-02, **FIXED**) | Double-escape on course name/tabs ("Oratoria **&amp;** Speaking") — **FIXED** (CORE-01/double-escape, `FIXES_APPLIED.md` §1). |
| **Lesson** | Mostly — "Volver al curso" is the only exit; **no "next lesson" CTA** (`behavioral-capture.md` flow note) | Excellent hierarchy (avg 7.9, top screen) | **LRN-06 (OPEN):** for a real lesson the "En esta lección" TOC rail collapses to a single dead self-link (`<a href="#" onclick="return false" class="active">`). Removal-first fix: hide the rail when there are no in-content headings (`scr-core.ts:601-607`). |
| **Quiz** | Yes — answer options + question-jump dots | **Weak mid-quiz status** | Options/dots now keyboard-operable (LRN-01 critical, **FIXED**). **LRN-08 (OPEN):** no persistent "answered N/total", no draft persistence — navigating away silently discards every answer; the only completeness signal is a finalize-time toast. Quiz is the journey's weakest screen (avg 6.1; accessibility 3 pre-fix). |

**Verdict.** The happy path is coherent and the primary CTA is always obvious — Dashboard
is a model. Two real walkthrough gaps remain, both OPEN: the lesson's dead TOC rail
(LRN-06, fix by *removal*) and the quiz's missing progress/persistence (LRN-08). Neither
blocks completion; both erode confidence at the moment of effort (a lesson you're reading,
a quiz you're answering).

---

## 7. Cognitive walkthrough — coach journey

Login → Coach Workspace (Panel) → Reservas e ingresos (Agenda/Ingresos/Disponibilidad) →
Gestionar/Course Builder → Participantes → Mi perfil.

| Step | Will they know the next action? | Friction / finding |
|---|---|---|
| **Panel de coach** (`teacher`) | Yes — KPIs + roster ("Seguimiento del grupo") | Screen stacks tracking **and** course management; COG-01 (split into Grupo/Contenido tabs) is **DEFERRED**. No real top-level `<h1>` (COACH-06) — **DEFERRED** (heading codemod). Roster sparkline plots synthetic data (COACH-02) — **DEFERRED**. |
| **Reservas e ingresos** (`coachwork`) | Yes — 3 tabs render cleanly | **IA-01 + CW-01 empty-state mis-routes both FIXED** (the two highest-confidence coach IA bugs). Availability selects got `aria-label`s (CW-03, **FIXED**). Tab ARIA semantics missing (CW-05) and stale-tab-on-return (CW-06) — **OPEN**. |
| **Gestionar / Course Builder** | Yes — "Mis cursos" → builder | Double-escape on panel/manage/builder course names — **FIXED** (`FIXES_APPLIED.md` §1). The lone student-view `course` item was already removed from coach nav (SHELL-NAV-01, comment in `shell.ts`). |
| **Participantes** | Yes — roster table; filter chips now native `<button>` (COACH-01, **FIXED**) | **COG-03 / COACH-07 (OPEN):** every row carries 3 equal-weight actions (Adjudicar / Evaluar / 30×30 icon-only message button with only `title=`, below 44px). Per-row choice overload across the whole roster; collapse rare authoring actions into an overflow `•••`. Search input got `aria-label` (**FIXED**). |
| **Mi perfil** | **Now yes** — IA-01 fix lands the coach on the *editable* `renderCoachSelf`, and the sidebar "Mi perfil" highlight is finally truthful | Residual: viewing a *public* coach (`coach` route) still borrows `nav:'profile'`, so it can falsely light the viewer's own Perfil item (IA-01 secondary rec) — **OPEN** nuance. |

**Verdict.** The coach journey's two genuine wayfinding traps (landing on a read-only
profile; "see my listing" → browse grid) are both **FIXED** — these were the highest-impact
IA defects in the whole audit and they're closed. What remains is supply-side density
(COG-01/COACH-07, per-row overload) and a11y semantics (COACH-06 headings, CW-05 tab roles),
all DEFERRED/OPEN and none blocking.

---

## 8. Status roll-up (IA + walkthrough findings)

| Finding | What | Sev (verified) | Status |
|---|---|---|---|
| IA-01 | Coach onboarding → read-only profile (sidebar lies) | high (confirmed) | **FIXED** |
| CW-01 | Coachwork Agenda "see my listing" → browse grid | high (confirmed) | **FIXED** |
| CORE-02 | Search "Personas" permanently empty for students | high (confirmed) | **DEFERRED** (remove section / reword) |
| ADM-01 | Duplicate COACH role-picker option | high (confirmed) | **FIXED** |
| IA-03 | Student-only routes globally reachable (opt-in guard) | medium | **OPEN** |
| IA-04 | Unknown route = silent no-op (no 404/toast) | medium | **OPEN** |
| CW-06 | Coachwork tab state stale on return | medium | **OPEN** |
| EVT-01 | Events "Torneos" mirrors Debate Hub (redirect surface) | medium | **OPEN** |
| PARENT-07 | "Vincular otro estudiante" buried in rail | medium | **OPEN** |
| LIFE-04 | Lifetime privacy toggle last in rail | medium | **OPEN** |
| LRN-06 | Lesson TOC rail = single dead self-link | medium | **OPEN** (fix by removal) |
| LRN-08 | Quiz no progress counter / no draft persistence | medium | **OPEN** |
| COG-03 / COACH-07 | Participants per-row action overload | medium | **OPEN** |
| IA-05 | Coach single-item "Principal" group | low | **OPEN** |
| IA-06 | Dead `badge:'Varsity'` on Niveles | low | **OPEN** (trivial removal) |
| DEB-09 | PF practice timer resets on repaint | low | **OPEN** |
| **IA-02** | Topbar search not role-aware | **refuted → low** | **OPEN** (low nit: gate box + make cards navigable) |
| **SIMP-01** | Merge 4 progress items → 2 | **refuted → not-a-finding** | **OPEN as product decision, not a bug** |
| `explore`/`marketplace` alias | Documented intentional alias | n/a | **No action** |

---

## 9. Recommendations (priority, simplification ethos)

1. **DEFERRED → do next: CORE-02.** *Remove* the dead "Personas" section from search and
   reword to "cursos" — honest, removal-first, no new privacy surface. (`scr-extra.ts`)
2. **OPEN → highest-value hardening: IA-03.** Add `role:'student'` to the student-only
   routes so the existing guard turns an implicit leaky model into an explicit allow-list.
   (`screens.ts`)
3. **OPEN → cheap safety net: IA-04.** Replace the silent `if (!def) return;` with a
   dev `console.warn` + user toast/redirect to `ROLE_HOME`. (`Aula.tsx:53-54`)
4. **OPEN → removal wins:** IA-06 (delete dead `badge:'Varsity'`), LRN-06 (hide the dead
   lesson TOC rail), EVT-01 (collapse Torneos to a one-line pointer).
5. **OPEN → journey confidence: LRN-08.** Add a persistent "answered N/total" + sessionStorage
   draft so quiz answers survive navigation.
6. **Skip / re-scope:** IA-02 (low nits only — gate the box, make `S.search` course cards
   navigable), SIMP-01 (product opinion; the screens are distinct, not redundant), the
   `explore`/`marketplace` alias (intentional, keep).

The IA story is healthy: the navigation taxonomy is role-coherent, the two worst wayfinding
traps are fixed, and the remaining work is dominated by *removing* dead surfaces rather than
adding new structure.
