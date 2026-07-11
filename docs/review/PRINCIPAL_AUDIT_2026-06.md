# OTR Academy "Aula" — Principal Engineer + Principal Designer Audit

**Date:** 2026-06 · **Scope:** the "Aula" application (excludes the frozen WebGL landing `public/site/index.html` and `app/consulta`) · **Method:** 7 expert lenses, every claim tied to `file:line` in the actual tree.

---

## 1. Executive Summary

**What it is.** OTR Aula is the web application for a Dominican Republic debate & public-speaking academy ("Own the Room / Domina la sala"). It bundles courses, a 1:1 coaching **marketplace** (escrow + commission), a coach-adjudicated **Glicko-2 debate rating**, and a shareable **Lifetime Progress Profile**, across Free/Pro/Elite membership tiers.

**Who it serves.** Students aged 12–24 (**many are minors**), their **parents** (the payers), and **OTR coaches** (the supply side). The Trust & Safety model for minors is a first-class product concern, not an afterthought.

**The problem it solves.** It turns an offline academy into a role-scoped digital product where a student always has one obvious next action, a parent gets proof + peace of mind, and a coach runs a workspace and earns commission — with a rating and a lifetime profile as the retention/identity loop.

**The single most important architectural truth.** The entire 8,479-LOC UI is a **hand-rolled vanilla-JS string-template SPA** (21 `app/lib/scr-*.ts` screens, each opening with `// @ts-nocheck`), mounted by **one 1,056-LOC React god-component** (`app/components/Aula.tsx`) whose only "store" is ~13 `window.*` globals, rendered by full-shell `innerHTML` replacement. The app pays Next 15 / React 19's price and uses none of its benefits (no SSR content, no code-splitting, no type-checking on the UI, no reactivity, no tests on any render). **This one fact drives most of the findings below.**

**The 5 biggest takeaways.**
1. **The two highest-value journeys are broken at HEAD.** Confirming a coach booking throws a `ReferenceError` (`scr-marketplace.ts:370`, undefined `c` in `bookedPanel(b)`), blanking the marketplace right after the money moment; and the flagship Debate Hub's **Práctica** tab is a "coming soon" placeholder while its 85-line PF timer is unreachable dead code (`scr-debate.ts:269-305` vs `mountPfTimer` at `:651-735`).
2. **A minor-safety guard the team believed shipped is absent from HEAD.** "Confianza total" auto-approval up to ~US$9,999/session applies with **no confirmation** (`scr-parent.ts:612-643`); the intended `window.confirm` guard + i18n key exist only on commit `1cc75e8`, which is **not an ancestor of HEAD**.
3. **This is not AI slop — it's a genuinely good design system that the screens bypass.** The color/token layer is coherent and WCAG-annotated, but the **type and spacing token scales are effectively dead** (`--fs-*` referenced 5×, `--s-*` 3×) against **27 distinct hardcoded font sizes** and **502 raw inline margins**, plus ~1,400 inline `style=` strings.
4. **The god-component + `@ts-nocheck` + zero render tests is the compounding risk.** The largest, most-churned layer has no static and no dynamic verification; the "escape-once" XSS contract is unenforced convention and is already applied inconsistently within a single file (`scr-core.ts:429` unescaped vs `:470` escaped, same sink).
5. **Performance floor is good, ceiling is bad.** Zero `<img>` tags, bounded/defensive Prisma queries — but a **604KB (145KB gz) monolithic `/aula` bundle** ships every role's screens + both languages to everyone, and every single-field mutation re-fetches the entire `getAppData` payload and full-repaints.

**Overall grade: 6.5 / 10.** The product thinking, IA, copy, trust-and-safety modeling, and the token/a11y foundations are above-average-to-excellent (this is not a junior codebase). But two flagship journeys are broken at HEAD, a minor-safety guard silently regressed, and the frontend architecture is a strategic dead end that gets React's cost with none of its benefits. The score is held up by craft and held down by shipped-but-broken flows and deep structural debt.

---

## 2. Phase 1 — Product, Audience, IA & Journeys

**Per-role nav map** (from `app/lib/shell.ts`, per-role `NAV`/`TABBAR` keyed by role, `:118-141`):

- **Student** — *Centro de progreso* group splits progress **four ways**: `lifetime` (Mi trayectoria), `progress` (Niveles), `grades` (Mis calificaciones), `badges` (Logros) (`shell.ts:30-35` → `screens.ts:40-43,74,80`). *Marketplace* group holds `explore`, `my-bookings`, `membership`, `messages` (`shell.ts:36-44`) — **`membership` (billing) is mis-filed under Marketplace** even though its own crumbs read "Cuenta · Membresía" (`screens.ts:81`).
- **Coach (teacher)** — first/top group `group.main` contains a **single demand-side item**: `explore` labelled "Coaches" (`shell.ts:47-50`), i.e. the coach's most prominent slot sends them to shop *other* coaches; their real tools (Panel, Reservas e ingresos, Gestionar) sit in the second group `group.workspace` (`:51-64`), and their start route is `teacher` (`Aula.tsx:1042`).
- **Parent** — "proof + peace of mind" IA (pending approvals first, per-child skill/attendance/spend, approval threshold, monthly report) is well-matched to the payer (`scr-parent.ts` overall). **Keep.**

**Where users get confused / dead-end:**
- **Booking journey dead-ends** post-confirmation (`scr-marketplace.ts:353-374`) — see Critical findings.
- **Debate Hub "Práctica" is empty** (`scr-debate.ts:269-305`); the dashboard funnels the exact provisional-rating student here via `window.__debateTab='practice';go('debate')` (`scr-core.ts:111`).
- **Four near-synonymous progress entries** raise choice cost for a 12–24 y/o; the dashboard already summarizes level/achievements/rank (`scr-core.ts:325-348`), so the sidebar duplicates that surface four ways.
- **Incomplete role guard** — student routes `progress/lifetime/grades/badges/course` carry no `role` field (`screens.ts`), so `Aula.tsx:57`'s guard doesn't redirect off-role deep links; a parent/coach on a stale `#progress` hash renders an empty student screen.
- **i18n gaps in always-visible chrome** — `Eventos` has no `k` key (`shell.ts:23`) and `Ajustes` is hardcoded Spanish (`shell.ts:137`), so both stay Spanish in EN.

**Genuine IA strengths (keep):** the "exactly one obvious next action" dashboard engine (`scr-core.ts:90-116`); honest CTA-bearing empty states with no dead ends (`scr-core.ts:262-296`); the minor consent gate (`scr-marketplace.ts:338-351,458-461`); the single role-scoped nav generator (`shell.ts:118-141`); the router + soft-refresh (`Aula.tsx:52-73`); the rating-forward Debate hero (`scr-debate.ts:113-151`).

---

## 3. Phase 2 — Is this AI slop?

**Verdict: No. This is a coherent, hand-built design system with strong color/component discipline — its real flaw is a defined-but-bypassed type/spacing token layer, not machine-generated incoherence.**

The tell of AI slop is competing patterns, random values, and no source of truth. This codebase is the opposite where it counts:

**What proves it's hand-crafted (quantified):**
- **Color goes through tokens:** 324 `var(--token)` references inside inline styles vs only ~51 raw hex — and 41 of those 51 are `#fff`, 5 are `#0c0c0c`.
- **One coherent component vocabulary:** `.btn` + 7 variants, `.card`/`.tile`, `.badge`/`.chip`, `.kpi`, `.input`/`.select` — **195** `.btn` usages, **179** card-class usages, only **10** hand-rolled styled `<button>`s.
- **Radius tokens are adopted:** 64 `var(--r-*)` refs.
- **Zero `!important`** in inline styles across all 21 screens — clean specificity, no override war.
- Reusable, reduced-motion-aware motion system (`app.css:284-372`).

**What's genuinely broken (quantified):**
- **The type & spacing scales are dead code.** `tokens.css:89-96` defines `--fs-11…--fs-44` and `--s-1…--s-16`, but across all of `styles/` + `lib/` the `--fs-*` tokens are referenced **5 times total** and `--s-*` **3 times**. Against that: **27 distinct hardcoded font-size px values** (9…64px; `12.5px` appears 82×, `13px` 76×, `12px` 76×, `13.5px` 63×) and **502 raw margin declarations** inline. A maintainer who edits `--fs-14` or `--s-4` changes almost nothing.
- ~**1,400** inline `style=` strings total (`scr-profile.ts` 165, `scr-parent.ts` 140, `scr-core.ts` 118, `scr-debate.ts` 114, `scr-lifetime.ts` 110).
- A faint **blue-white brand leak**: `rgba(234,242,251,α)` (= `#EAF2FB`, cool blue-white) used **19×** for text-on-dark, contradicting the cream `--text-on-navy` token (`tokens.css:60`).

**Conclusion:** the literals cluster tightly (11–15px dominates), so the app stays visually coherent — this is a **token-hygiene/maintainability debt**, not visual chaos. Fix priority is **below anything user-visible**.

---

## 4. Phase 3 — UX findings (prioritized)

1. **[CRITICAL] Confirming a booking crashes the success panel** — `scr-marketplace.ts:370` renders `data-mk-message="${esc(c.id)}"` inside `bookedPanel(b)` where `c` is undefined; after a successful confirm the handler sets `w.__mkBooked[id]` + `repaint()` (`:722-725`) → `page.innerHTML = render()` → `renderProfile` → `bookingCard` → `bookedPanel` throws before the string returns. User sees the success toast then a frozen "Reservando…" form; re-opening any coach booked this session re-throws.
2. **[MAJOR] "Confianza total" has no confirmation at HEAD** — `scr-parent.ts:612-643` PATCHes `/api/guardianship` with `consentLevel:'full'` immediately on `<select>` change; `parent.confirmFullConsent` does not exist in the working tree; guard exists only on `1cc75e8` (**not an ancestor of HEAD**). Authorizes auto-booking/charging a minor up to ~US$9,999/session, one click, no friction.
3. **[MAJOR] Debate "Práctica" is a placeholder; 85-line PF timer is unreachable** — `viewPractice()` (`scr-debate.ts:269-305`) emits only a "en construcción" drills block + partner finder; never renders `#pf-clock/#pf-start/#pf-steps`, so `mountPfTimer` (`:651-735`) early-returns at `:653`. The dashboard's provisional-student CTA (`scr-core.ts:111`) deposits its target user exactly here.
4. **[MINOR] Whole coach profile (incl. YouTube iframe) re-renders on every booking sub-step** — `repaint()` does `page.innerHTML = render()` (`scr-marketplace.ts:558-563`); every package/day/slot/keystroke rebuilds `heroBlock` incl. the `<iframe>` (`:323`), which is why the search box needs a manual caret-restore hack (`:659`).
5. **[MINOR] Fabricated grading rubric shown as real** — `scr-learn.ts:202-204` hardcodes `[['Estructura','30'],['Claridad','25'],['Evidencia','25'],['Timing','20']]` for any `maxPoints===100` activity.
6. **[MINOR] Dead no-op controls in the legacy lesson view** — inert "Mark complete" checkbox (`scr-core.ts:652`) and `onclick="return false"` outline links (`:643-646`).
7. **[MINOR] Shared confirm modal always fakes success** — `window.modal` wires OK to `close(); toast('Cambios guardados','ok')` unconditionally, no `onOk` (`Aula.tsx:101-109`); `scr-lifetime.ts:562` notes it and rolls its own.
8. **[MINOR] Locale-locked strings in translated screens** — hardcoded ES countdowns (`scr-core.ts:255-259`, `scr-mybookings.ts:44-46`), price band `'$50 – $100'` (`scr-marketplace.ts:295`), ES month array (`scr-parent.ts:242,264`), `toLocaleString('es')` (`scr-core.ts:140,342`).

---

## 5. Phase 4 — UI / visual-system findings

- **[MAJOR] Brand green used as small text-on-light fails WCAG AA.** `.eyebrow` `color:var(--action)` (=`#2CAA20`) on cream ≈ **2.7:1** (`app.css:120`); `.q-num` on white ≈ **3.0:1** (`screens.css:135`). The team already derived the accessible `--otr-green-text #176B11` (`tokens.css:17`, ≥4.5:1) but these pervasive label classes point at pure green. Fix: repoint `.eyebrow`/`.q-num` to `--otr-green-text` or `--otr-black`; reserve pure green for dark backgrounds, bar/ring fills, and icons.
- **[MINOR] Type scale defined but ignored** — ~20 distinct inline font sizes incl. off-scale `10.5/11.5/12.5/13.5/14.5px` up to `64px` (`scr-debate.ts:123`); none are tokens. (Same root as Phase 2.)
- **[MINOR] Massive inline styling with hardcoded hex/radii** — `#fff`/`#0C0C0C`/`#000` repeated in `scr-lifetime.ts:255,297,298`, `scr-core.ts:186,417`, `scr-debate.ts:109,123`; off-token radii `100px` (5×), `11px`, `10px`, `8px`.
- **[MINOR] Zero dark-mode readiness** — 0 hits for `prefers-color-scheme`/`data-theme`; surfaces use literal `#fff`/`--otr-black` in hundreds of sites. Document as *conscious debt* (OTR is cream+negro), but route surfaces/ink through `--surface`/`--text` so a future theme is a token flip, not a rewrite.
- **[MINOR] Legacy blue-white `rgba(234,242,251,α)` ×19** vs cream `--text-on-navy` (`tokens.css:60`).
- **[MINOR] Alert colors off-brand** — `.alert.ok` uses teal `#155e3f`/`#bfe6d2` (`app.css:243-245`), a third/fourth "green" outside the palette.
- **[COSMETIC] Two blacks coexist** — `--otr-black #0C0C0C` vs `--otr-ink #000000` (`tokens.css:11,26`); `#000` feeds key gradients and `.btn-primary:hover` (`app.css:132`), muddying the warm black.
- **[COSMETIC] Pill radius written 3 ways** (`--r-pill` / `999px` / `100px`) and two divergent hand-rolled toggles (`44×25` vs `46×26`).

---

## 6. Phase 5 — Frontend architecture

**The core tradeoff.** The vanilla-JS string-template SPA is *pragmatic and shipped* — pure `state -> string` renders are simple to reason about and fast to write. But it is wrapped in React 19 / Next 15 that it never uses: `Aula.tsx:1055` returns one `dangerouslySetInnerHTML` div, all work happens in a single `useEffect([])`, first paint is a hardcoded "Cargando…" spinner (`:12-19`). **You pay for RSC/streaming/hydration/Suspense and get a blank client-rendered shell.** This is the deepest strategic mismatch and the crux of Phase 7.

**Genuine risk (fix / decide):**
- **`@ts-nocheck` across all 21 screens + `strict:false`** (`tsconfig.json:11`; `DB:any` at `data.ts:5`) — zero compile-time safety on the largest, most-churned layer. A renamed `DB` field or typo'd `ROUTES` key surfaces only in the user's browser. **[MAJOR]**
- **`Aula.tsx` god-component** — router + ~165-line click dispatcher (`:809-974`) + ~20 modal builders + `document.execCommand` rich-text toolbar (`:181-208`) + **13 `window.*` globals as the only cross-screen state**, mutated from 21 files by magic string. No store, no reactivity, no traceability, nothing unit-testable in isolation. This is the known-deferred **FE-02** debt and it compounds everything. **[MAJOR]**
- **Unenforced XSS contract.** `esc()` is an HTML-text escaper reused verbatim inside inline-JS `onclick` string literals (`scr-core.ts:276,224,160,417,470`; `scr-arsenal.ts:51`), where the HTML parser decodes `&#39;`→`'` before the JS engine sees it — so `esc()` gives **no** JS-context protection there. Safe *today only* because ids are server cuids (a provenance assumption, not a guarantee). And the contract is already applied **inconsistently within one file**: `scr-core.ts:429` injects a lesson id into an `onclick` unescaped while `:470` escapes the same kind of value into the same sink. **[MAJOR — latent stored-XSS on a platform with minors]**
- **Full-shell `innerHTML` repaint on every nav/mutation** (`Aula.tsx:68`), with focus/scroll hand-restored by element `id` (`:65,72`) — O(page) work for O(1) changes; loses uncommitted input, media position, open `<details>`, and focus on any element without an `id`. **[MAJOR — perf + a11y]**
- **Zero render/dispatcher tests** — `tests/` is only `esc/glicko2/i18n-wiring/text`; of 9,535 LOC (screens + Aula) zero lines are exercised. The renders are pure `state->string` — the *easiest* thing here to snapshot. Highest-leverage, cheapest gap. **[MAJOR]**
- **Mutable module-global `DB` singleton** `Object.assign`'d from the server payload (`data.ts:5`, `Aula.tsx:24,37,144`) — latent shared-instance hazard; works only because all reads happen after the client-side assign. **[MAJOR — strategic]**

**Acceptable / defensible:**
- Server-only `sanitizeHtml` uses the real parser with a tag/attr/scheme allowlist and is applied at every write sink (`sanitize.ts:17-33`). **Keep — do not weaken to a regex.**
- `esc()` itself is correct for HTML text/attribute contexts and *is* applied consistently at that boundary (`queries.ts:1497`, `scr-community.ts:103-111`, `scr-profile.ts:30,446`).
- The centralized modal-a11y `MutationObserver` (`Aula.tsx:996-1039`) is a pragmatic single-point fix given 6+ hand-rolled modal builders — keep until a shared modal primitive replaces the duplication it compensates for.
- `computeStreak`/`lifecycleState` (`queries.ts:43-71`), the client role guard (`Aula.tsx:52-73`), and the clamping `C.bar`/`C.ring` helpers (`components.ts:20-35`) are clean.

**Verdict:** the string-template model is not itself the sin — the sin is `@ts-nocheck` + no tests + global-mutable state + full-repaint on top of a framework that offers better primitives for free. Decide the migration deliberately (Phase 7); *do not* attempt a big-bang rewrite.

---

## 7. Phase 6 — Performance

**Structural bottlenecks:**
- **[MAJOR] No code-splitting** — `.next/static/chunks/app/aula/page-*.js` = **604,247 B / 145,770 B gz** (measured). `screens.ts:2-22` static-imports all 21 screens; `i18n.ts` eagerly merges all 21 dicts in **both** es+en; no `next/dynamic` or dynamic `import()` anywhere. A student who only opens the dashboard still downloads `scr-teacher/scr-admin/scr-coachwork/scr-parent` + the full EN dictionary. Highest-value lever for the mobile 12–24 audience.
- **[MAJOR] Full-shell `innerHTML` repaint on every navigation** — `Aula.tsx:68` rebuilds sidebar+topbar+crumbs+content as one string even when only `#content` differs; re-runs mount() + re-binds 130 `addEventListener`s + re-fires the `.page rise` entrance animation each nav. Dominant INP cost. Fix: mount the shell once, swap only `#content` on same-role nav.
- **[MAJOR] Soft-refresh re-fetches the ENTIRE `getAppData` payload after every single-field mutation** — `refresh()` (`Aula.tsx:139-148`) is called from 19 sites; grading 25 submissions = 25 full-payload rebuilds + full repaints. Fix: return just the affected slice and patch `DB.*` + re-render `#content` only.
- **[MINOR] Serial DB waves** — `review.groupBy` (`queries.ts:293`) and `streakRows` (`:487`) sit outside the nearest `Promise.all` with no dependency forcing it, adding avoidable RTT to the most-called server function.
- **[MINOR] Render-blocking Google Fonts** (5 weights, `layout.tsx:16-21`) instead of self-hosted `next/font` (font-src already CSP-allowed).
- **[MINOR] Language switch = `location.reload()`** (`i18n.ts:191-197`) though both dicts are already bundled.

**Genuine perf assets (keep):** **zero `<img>` tags** (CSS-initial avatars, inline SVG icons) — no image weight/LCP/CLS; single delegated, leak-free `root` listener (`Aula.tsx:975,990,1052`); bounded, `select`-defensive, `Promise.all`-batched Prisma queries; correct `private, no-store` + `Vary: Cookie` on the per-user payload (`app-data/route.ts:17-20`).

---

## 8. Accessibility

**Above-average work already done (keep):** centralized modal focus-trap + return + `aria-modal`/`labelledby` (`Aula.tsx:1000-1040`); global Enter/Space activator for `[role=button][tabindex]` (`:985-988`); `aria-live` toasts with status/alert split (`:80-82`); best-in-repo `formModal` with `aria-required`/`aria-describedby`/focus-first-invalid (`:155-241`); never-killed `:focus-visible` ring (`app.css:19`); `aria-hidden` on decorative icons (`icons.ts:6`); `role="switch"` toggles; deliberately contrast-engineered tokens (`tokens.css:17,21,106`); reduced-motion honored in JS + CSS.

**Real gaps:**
- **[MAJOR] Focus dropped to `<body>` on every full route change with no announcement** — restoration only runs on the `keepScroll` path (`Aula.tsx:65,72`); `window.go` passes no opts so `keep=false` (`:74`). Fix: move focus to the screen `<h1>` (`tabindex=-1`) and push the title into a visually-hidden `aria-live` region.
- **[MAJOR] No `<main>` landmark and no skip-link** — 0 hits for `<main`/`role=main`; content is a plain `div` (`shell.ts:184`); the ~15-item sidebar (`:148`) has no role/label. Keyboard users re-traverse the full nav after each nav.
- **[MAJOR] Rich-text `contenteditable` is not a labelled textbox** — `<label for>` can't bind to a div; missing `role="textbox"`/`aria-multiline` (`Aula.tsx:161,167`). Primary coach authoring surface.
- **[MAJOR] Coach cards on Explore/Hub are mouse-only** — `scr-hub.ts:176,142` are clickable divs with no `role`/`tabindex`, while `scr-marketplace.ts:217` does it correctly — an inconsistency, so mirror the marketplace pattern.
- **[MINOR]** No `aria-current` on active nav (`shell.ts:131`); course-builder `<b>` accordion is mouse-only (`scr-extra.ts:64`); forum row click-only div (`scr-community.ts:13`); star-rating exposes no selected state (`scr-profile.ts:464`); bell/burger lack `aria-expanded`/`haspopup` (`shell.ts:170,181`); modal background not inerted.
- **[COSMETIC]** Two infinite animations not disabled under reduced-motion (`screens.css:15,287`).

---

## 9. What to KEEP untouched (merged across all lenses)

**Product / IA / journeys**
- "Exactly one obvious next action" dashboard engine — `scr-core.ts:90-133`.
- Honest, CTA-bearing empty/loading states, no dead ends — `scr-core.ts:262-296`; three-state render `scr-parent.ts:429-433`.
- Achievements card reusing `na.onclick` so gamification points at the real next action — `scr-core.ts:345-348`.
- Minor consent gate + role-scoped booking copy — `scr-marketplace.ts:338-351,382-398,458-461`.
- Two-tap arm-then-confirm destructive cancel (4s auto-disarm) — `scr-parent.ts:551-563`, `scr-mybookings.ts:191-199`.
- Quiz finish-guard jumping to first blank — `scr-learn.ts:474-479`; honest media states (mic-denied/unsupported fallbacks).
- Parent portal layout; single role-scoped nav generator (`shell.ts:118-141`); router + soft-refresh + role guard (`Aula.tsx:52-73`); rating-forward Debate hero (`scr-debate.ts:113-151`).

**Design system / UI**
- The color/semantic token layer with inline WCAG annotations — `tokens.css:9-118` (source of truth).
- Contrast-derived text tokens `--otr-green-text #176B11`, `--otr-gold-text #5A4206` — **do not lighten these**.
- The CSS component set (`.btn`+7, card/tile, badge/chip, kpi, input/select) — 195/179 reuse.
- Motion/elevation system + full `prefers-reduced-motion` block — `app.css:284-372`.
- Adopted radius tokens (64 refs); zero `!important`; print sheet `screens.css:361-372`; single-source icon set + hand-made `otrCrest` (`icons.ts:3-52,75-95`).

**Architecture / a11y / perf**
- Server-only `sanitizeHtml` allowlist at every write sink — `sanitize.ts:17-33` (do not regex it).
- `esc()` at the HTML boundary where honored; `computeStreak`/`lifecycleState` (`queries.ts:43-71`); clamping `C.bar`/`C.ring`.
- Centralized modal-a11y MutationObserver; global keyboard activator; live-region toasts; `formModal` a11y; `:focus-visible` ring; `role=switch` toggles.
- Zero `<img>`; leak-free delegated `root` listener; bounded `select`-defensive `Promise.all` queries; `private,no-store`+`Vary:Cookie` payload.

---

## 10. Phase 7 — Redesign Strategy

**North star.** *Every role opens the app and, within one screen, sees exactly one true thing to do next — and can complete it without the app breaking under them.* The product already believes this (`scr-core.ts:90-116`); the redesign is about making the **architecture and the two flagship journeys honor it**, not about repainting.

**This is diagnosis-led direction, not a polish pass and not a full redesign.** Concretely:

1. **Fix the flagship journeys first — they define the product.** The booking confirmation crash and the empty Debate Práctica tab are not "bugs in a backlog"; they are the two moments the whole business rests on (commission event + flagship rating loop). Nothing else in this plan matters if these stay broken.

2. **Consolidate progress IA from four nav items into one hub with tabs** (Niveles · Logros · Calificaciones · Trayectoria), and rebalance the coach nav so *Panel de coach* leads (`shell.ts:47-64`) and *Membresía* moves to a Cuenta/System group (`shell.ts:36-44`). Fewer, truer destinations — remove, don't add.

3. **The architecture decision — do NOT do a big-bang React rewrite; do a deliberate, incremental convergence, and keep the string-template render model for now.** Rationale, decisively:
   - The `state -> string` renders are the *good* part — pure, testable, cheap to author. The framework mismatch (React-as-mount-shim, `Aula.tsx:1055`) is real but **rewriting 8,479 LOC of working screens into React components is high-risk, low-immediate-value churn** on a team already churning (Jean/Andy). The user's own rule applies: reconsider from the root rather than stack parches — and the root fix is *enforcement + seams*, not a framework swap.
   - **What must change is the substrate around the strings, in this order:** (a) restore type-checking by lifting `@ts-nocheck` file-by-file behind a typed `DB` interface exported from `queries.ts`; (b) split `Aula.tsx` along seams that already exist (modal builders → module; dispatcher → `data-action → handler` map; `window.__*` nav params → one typed nav-state object) — this is **FE-02** and it's mechanical; (c) add snapshot/smoke tests over every `SCREENS[x].render(state)`; (d) stop full-repainting — mount shell once, patch `#content`; (e) make the XSS contract deterministic (route data through the delegated dispatcher's `data-*`, ban `${…}` inside `onclick` via lint).
   - **Only after** those four land is a per-route/per-role *component* migration worth revisiting — and if it happens, it happens screen-by-screen behind the router indirection (`ROUTES[r].screen`) that already exists, so it can be incremental and reversible. **Defer that decision; it is not this cycle's work.**

4. **Design substrate: enforce the system you already own** (Phase 8). The tokens are good; the screens ignore them. The strategic move is *enforcement*, not more tokens.

**Non-goals (explicitly out):** live video, real Stripe money, SMTP send — all credential-blocked; do not plan them as buildable. Dark mode — conscious debt, route surfaces through semantic tokens only. Brandbook (crema/negro/verde/oro, Inter, black primary, no emojis) is non-negotiable.

---

## 11. Phase 8 — Design System (production-ready spec)

**Audit of the current token layer (`app/styles/tokens.css`, 118 LOC — keep and extend, don't replace):**

- **Color (works — keep as source of truth):** brand `--otr-cream #F7F7ED`, `--otr-black #0C0C0C`, `--otr-green #2CAA20` (action/affirmative), `--otr-gold #F2B814` (achievement); warm neutral ramp; semantic aliases (`--bg/--surface/--text`, `--action`, `--text-on-navy:var(--otr-cream)`); accessible text derivations `--otr-green-text #176B11` (≥4.5:1), `--otr-gold-text #5A4206` (~6.8:1); legacy `--otr-navy/--otr-sky` alias to negro/verde (reskin seam). **Extensions:** (1) collapse `--otr-ink #000000` into `--otr-black` except where pure black is deliberate; (2) derive `.alert.*` colors from the brand family (`--otr-green-text`, `--otr-gold-text`, `--danger`) to kill the teal `#155e3f`; (3) add a token/`color-mix` for text-on-dark to replace the 19× `rgba(234,242,251,α)` with the cream `#F7F7ED`.
- **Type (broken — adopt it):** `--fs-11…--fs-44` exists but is referenced 5×. **Standardize the 4 real body sizes (12/13/14 + the display sizes) into utility classes `.t-12/.t-13/.t-14` or map onto `--fs-*`; drop half-px steps (12.5/13.5/14.5) — they add nothing.** Ban new inline `font-size` in review + lint.
- **Spacing (broken — adopt it):** `--s-1…--s-16` (4pt) referenced 3× against 502 raw margins. Map the clustered literals mechanically; provide spacing utilities.
- **Radius (works — model for the rest):** 64 `var(--r-*)` refs; normalize the pill (`999px`/`100px` → `--r-pill`) and fold `11px/14px` one-offs.
- **Elevation:** diffuse `--sh-1..pop` — keep. **Motion:** fade-up + nth-child stagger, `.lift`, sheen, full reduced-motion block — keep; extend reduced-motion to `.lb-wave i`/`.typing i`.

**Component set to standardize (extract a small string-component kit in `components.ts`, centralizing inline styles into classes):**
- `button` (all 7 `.btn` variants, black primary), `card`/`tile`, `badge`/`chip`, `kpi`, `input`/`select`/`label`, `empty-state`, **one `modal` primitive** (retire the 6+ hand-rolled builders and the MutationObserver that compensates for them), **one `toggle`** (kill the 44×25 vs 46×26 divergence), star-rating (with `radiogroup`/`aria-checked`).

**How to kill inline-style sprawl (enforcement, per the user's "no CLAUDE.md as enforcement" rule):**
- Lint rule banning new inline `font-size`, raw `margin`, hardcoded hex (`#fff`/`#000`/`#0C0C0C`), and `border-radius` literals in `scr-*.ts`; require `var(--token)`/utility class.
- Lint rule banning `${…}` interpolation inside `onclick="…"` except a whitelisted helper.
- Mechanical find/replace pass on the hot files first (`scr-profile`, `scr-lifetime`, `scr-debate`, `scr-parent`, `scr-core`).
- Either delete the unused `--fs-*/--s-*` scales **or** adopt them — stop advertising a system that isn't used.

---

## 12. Phase 9 — Implementation Roadmap

Each milestone ships independently, compiles, and passes lint/types/tests with no regressions. FE-02 split and token enforcement are early. **No credential-blocked work (video/Stripe/SMTP) is included.**

| # | Milestone | Objective | Files affected | Risk | Rollback | Testing | Acceptance | Complexity |
|---|-----------|-----------|----------------|------|----------|---------|-----------|------------|
| M1 | Fix booking-confirmation crash | Restore the marketplace money-moment happy path | `scr-marketplace.ts:353-384` (+ try/catch in `renderProfile`) | Med (core flow) | Revert 1 file | Smoke test: render profile with `__mkBooked` populated → no throw; confirm booking E2E | Confirm booking shows booked panel; re-opening booked coach doesn't blank | S |
| M2 | Re-apply "Confianza total" confirm guard | Restore missing minor-safety friction | `scr-parent.ts:612-643`, `i18n-keys/parent.*` (es/en) | Med (safety) | Revert change | Test: selecting full-consent option requires confirm; cancel reverts `<select>` | No full-consent PATCH without an explicit confirm | S |
| M3 | Debate Práctica: render or retire | End the flagship dead-end | `scr-debate.ts:269-305` (render PF UI) or delete `PF_FLOW`/`mountPfTimer` `:256-263,651-735` | Med | Revert 1 file | Timer mounts + counts steps, OR honest empty state; dashboard CTA lands on content | Provisional CTA no longer lands on a placeholder | M |
| M4 | Render smoke-test harness | Dynamic safety net over the UI layer | `tests/screens.test.ts` (new), fixtures | Low | Delete tests | `SCREENS[x].render(fixture)` returns string, no throw, no `undefined`/`[object Object]` leak | All 21 screens covered; CI gate | M |
| M5 | Design-token enforcement (lint) | Freeze the sprawl before fixing it | ESLint config, `scr-*.ts` (violations) | Low | Disable rule | Lint fails on new inline font-size/hex/radius and on `${…}` in `onclick` | New violations blocked in CI | S |
| M6 | FE-02: split `Aula.tsx` god-component | Extract seams; typed nav-state object | `Aula.tsx` → `modals.ts`, `dispatcher.ts`, `nav-state.ts` | High (central) | Revert branch | M4 smoke tests + manual per-role click-through | Behavior identical; each module independently importable | L |
| M7 | Contrast + a11y quick wins | AA text + landmarks/skip-link/focus-on-nav | `app.css:120`, `screens.css:135`, `shell.ts:184`, `Aula.tsx:68` | Low | Per-file revert | Axe/contrast check on `.eyebrow`/`.q-num`; keyboard nav lands on `<main>` | AA passes; skip-link + focus move on route change | M |
| M8 | Lift `@ts-nocheck` behind typed `DB` | Restore compile-time safety incrementally | `queries.ts` (export interface), `data.ts`, smallest screens first (`scr-events.ts`, `scr-placement.ts`) | Med | Re-add `@ts-nocheck` per file | `tsc` passes per de-nocheck'd file | `DB` typed; ≥2 screens type-checked, no build errors | L |
| M9 | Scope repaints to `#content` | Kill full-shell reflow per nav/mutation | `Aula.tsx:52-73,139-148`, `shell.ts:118-189` | Med | Revert | INP/manual: sidebar persists; input/media/`<details>` survive mutation | Same-role nav swaps only `#content` | M |
| M10 | Code-split by role/route + `next/font` | Cut the 604KB monolith; self-host Inter | `screens.ts:2-22`, `i18n.ts`, `Aula.tsx:8`, `layout.tsx:16-21` | Med | Revert to static imports | Bundle-size assert per role; active-lang dict only | Student bundle excludes teacher/admin/coach/parent + inactive lang | L |
| M11 | Targeted mutation responses | Stop full `getAppData` refetch per field | mutating `api/*/route.ts`, `Aula.tsx:139-148` | Med | Fall back to `refresh()` | Grade/lesson-done patch `DB.*` slice, no full refetch | Single-field mutations issue no full payload rebuild | L |
| M12 | Standardize component kit + tokens adopt | One modal/toggle; map literals to tokens | `components.ts`, hot `scr-*.ts`, `tokens.css` | Med | Per-file revert | Visual regression on hot screens; a11y on modal/toggle | 6+ modal builders → 1; `--fs-*/--s-*` adopted or deleted | L |

---

## 13. Ranked Top 30

| # | Item | Phase | Severity/Impact | Effort | Why |
|---|------|-------|-----------------|--------|-----|
| 1 | Booking confirmation `ReferenceError` (`scr-marketplace.ts:370`) | UX/IA | Critical | S | Breaks the commission event — the single most valuable journey |
| 2 | "Confianza total" has no confirm at HEAD (`scr-parent.ts:612-643`) | UX | Major (safety) | S | One-click auto-charge of a minor up to ~$9,999; guard silently regressed |
| 3 | Debate Práctica empty; PF timer unreachable (`scr-debate.ts:269-305`) | UX/IA | Major | M | Flagship CTA funnels the target user to a dead end |
| 4 | Zero render/dispatcher tests (`tests/`) | FE-arch | Major | M | Cheapest safety net over 9,535 LOC; catches the exact `@ts-nocheck` class of bug |
| 5 | Brand green as small text fails AA (`app.css:120`, `screens.css:135`) | UI/A11y | Major | S | Pervasive `.eyebrow` label; accessible token already exists |
| 6 | FE-02: `Aula.tsx` god-component split | FE-arch | Major | L | Compounds every other finding; mechanical seams already exist |
| 7 | `@ts-nocheck` across all 21 screens + `strict:false` | FE-arch | Major | L | No compile-time safety on the most-churned layer |
| 8 | XSS contract unenforced + inconsistent (`scr-core.ts:429` vs `:470`) | FE-arch | Major | M | Latent stored-XSS on a platform with minors |
| 9 | Focus dropped to `<body>` on every nav, no announcement (`Aula.tsx:68`) | A11y | Major | M | Highest-impact SPA a11y defect; hits every route |
| 10 | No `<main>`/skip-link (`shell.ts:184`) | A11y | Major | M | No landmark to focus, no way to bypass 15-item nav |
| 11 | 604KB monolithic `/aula` bundle, no splitting (`screens.ts:2-22`) | Perf | Major | L | Ships every role + both langs to every mobile user |
| 12 | Full-shell `innerHTML` repaint per nav (`Aula.tsx:68`) | Perf/FE | Major | M | Dominant INP cost; O(page) for O(1) |
| 13 | Full `getAppData` refetch per single-field mutation (`Aula.tsx:139-148`) | Perf | Major | L | 25 grades = 25 full rebuilds |
| 14 | Rich-text editor not a labelled textbox (`Aula.tsx:161,167`) | A11y | Major | S | Primary coach authoring surface, unnamed to SR |
| 15 | Coach cards on Hub mouse-only (`scr-hub.ts:176,142`) | A11y | Major | S | Core value prop grid excludes keyboard users |
| 16 | Type & spacing tokens dead (5×/3× vs 27 sizes, 502 margins) | AI-slop/UI | Major | L | No single lever for type/rhythm; maintainability debt |
| 17 | Mutable module-global `DB` singleton (`data.ts:5`) | FE-arch | Major | M | Latent shared-instance hazard; audit via typed accessor |
| 18 | Progress IA over-split four ways (`shell.ts:30-35`) | IA | Minor | M | Raises choice cost; duplicates dashboard surface |
| 19 | Coach nav leads with demand-side "Coaches" (`shell.ts:47-50`) | IA | Minor | S | Misframes the coach's home |
| 20 | Coach profile + iframe re-renders per booking sub-step (`scr-marketplace.ts:558-563`) | UX/Perf | Minor | M | Flicker/jank exactly at the spend decision |
| 21 | Incomplete role guard on student routes (`screens.ts`, `Aula.tsx:57`) | IA | Minor | S | Off-role deep links render empty screens |
| 22 | ~1,400 inline styles + hardcoded hex/radii | UI | Minor | L | Brand/theme change = fragile find/replace in 21 files |
| 23 | Fabricated grading rubric shown as real (`scr-learn.ts:202-204`) | UX | Minor | S | Misleads effort; erodes trust |
| 24 | Shared confirm modal always fakes success (`Aula.tsx:101-109`) | UX/FE | Minor | S | False "guardado"; screens reinvent modals |
| 25 | Serial DB waves on hot path (`queries.ts:293,487`) | Perf | Minor | S | Avoidable RTT on most-called server fn |
| 26 | Membresía mis-filed under Marketplace (`shell.ts:36-44`) | IA | Minor | S | Billing is an account concern |
| 27 | Locale-locked strings in translated screens (`scr-core.ts:255-259` et al.) | UX/i18n | Minor | M | EN users see ES countdowns/months/price band |
| 28 | Blue-white `rgba(234,242,251)` ×19 vs cream token (`tokens.css:60`) | UI | Minor | S | Un-migrated navy-era leak; contradicts brandbook |
| 29 | Render-blocking Google Fonts, 5 weights (`layout.tsx:16-21`) | Perf | Minor | S | Cross-origin critical-path request; `next/font` fixes |
| 30 | `Eventos`/`Ajustes` untranslated in EN (`shell.ts:23,137`) | IA/i18n | Cosmetic | S | Always-visible chrome breaks bilingual promise |

---
