# OTR Academy "Aula" — Product Audit (June 2026)

> Consolidated final audit merging 6 user panels + 5 expert lenses (UX, UI, Navigation, AI/Automation, Product/Business, QA/Emotional). Brutally constructive, prioritized by (impact × reach) / effort. Honors the 2026 brandbook and the credential-blocked constraints (live video, SMTP, real Stripe are not buildable today and are NOT flagged as bugs). Already-fixed items from the unmerged PR are excluded.

---

## 1. Executive Summary

**What it is.** A Spanish-first Next.js SPA ("Aula") for a Dominican debate & public-speaking academy — *Domina la sala / By Students, For Students*. It bundles courses, a 1:1 coaching marketplace (18% escrow), a coach-adjudicated Glicko-2 debate rating, and a shareable Lifetime Progress Profile. Monetization = Free/Pro/Elite membership + marketplace commission.

**Who it's for.** Students 12–24 (many minors), their parents (the payers), and OTR coaches. Three jobs-to-be-done: the teen wants confidence + status; the parent wants proof + peace of mind + safety; the coach wants to run sessions and adjudicate fast.

**Overall grade: 6.0 / 10.** The engineering and design foundations are genuinely strong — a strict, well-tokenized design system, cohesive SPA, thoughtful empty states, real a11y plumbing. But the product **breaks its own core promise on day one for every persona**, and that drags an otherwise-7.5 codebase down to a 6.

**The 3–5 biggest takeaways:**

1. **The flagship journey dead-ends.** The new-student dashboard hero says "Practica tu primer debate" and routes to a Practice tab that is an empty "Drills en camino" placeholder plus a rival list with no challenge button. The single most important moment — new student → first action — terminates in a coming-soon card. Every persona independently flagged this; it is the #1 problem.
2. **The payer can't pay, and can't tell if it's working.** Parents (credit card + urgency) cannot book — `canBook = role === "student"` — and the portal leads with *Gasto del mes* and a wall of context-free absolute scores instead of a one-line "is my kid improving?" verdict. The buyer is locked out of the buy button and starved of the one answer they renew for.
3. **Pro sells vaporware.** The paywall lists "Analytics completo" and "Práctica y drills ilimitados" — neither exists (Analytics was removed; Practice is a placeholder). When Stripe goes live this is refund-and-1-star fuel, with parents-of-minors as the audience. Meanwhile the real moat (public profile, certificate, credentials) is given away free.
4. **Zero AI in a 2026 debate-coaching product.** Every high-value repeatable judgment — ballots, drills, opponent matching, parent narratives, coach recommendations, placement — is manual coach labor or a placeholder. This is the biggest strategic gap and the clearest differentiation lever.
5. **The first touch leaks before the app even loads.** The landing has no "create account" door (every CTA is "Reserva tu consulta gratis"); the only entry is a gray "Acceder" link that opens a *login* form (wrong default for a stranger); then two setup walls (goals onboarding + 6-slider placement, all required) before any value is shown.

The product has a clear thesis and the bones to win. It loses points because the highest-traffic paths (first action, parent proof, paywall) are unfinished or pointed at dead ends, and because it ships none of the AI that its category now leads on.

---

## 2. Critical Problems

These hurt at scale, across many users, on the highest-traffic paths.

### C1 — The hero next-action dead-ends in an empty Practice tab
**Problem.** `scr-core.ts` sets the provisional student's primary CTA to `window.__debateTab='practice';go('debate')` ("Practica tu primer debate"). `viewPractice()` renders only a "Drills en camino" empty state (no button) + a rival list whose rows have no challenge handler. The CTA repeats verbatim in the achievements card too.
**Why it matters.** This is the day-one aha-moment for the exact user the funnel was built for. It fires within 60s of finishing placement and resolves to nothing completable. Activation dies here.
**Fix.** Until drills/matchmaking ship, re-point the provisional CTA at something completable **today**: "Empieza tu primera lección" (real lesson) or "Reserva tu primer debate de práctica con un coach" (the real path that moves rating anyway). A next-action must always land on a finishable thing.

### C2 — The parent (payer) is locked out of booking and of "is it working?"
**Problem.** `renderProfile` gates `canBook = role === "student"`; the parent sees only "your kid must book," then the kid's booking bounces back as a pending approval (double work). The portal `childCard` shows skills as static absolute scores (Confianza 62) with no trend, no verdict, and leads with *Gasto del mes* as the heaviest element.
**Why it matters.** The parent has the card and the urgency and can't transact; and they can't answer the only question that makes them renew. Cost-anxiety is primed instead of pride.
**Fix.** Let a parent book on behalf of a linked child from the coach profile (child-picker → `POST /api/bookings {onBehalfOf:childId}`, auto-confirmed since the parent is the consenting adult). Lead each child card with a one-line verdict ("Subiendo — Estructura y Refutación mejoraron este mes" / "Estable — sin sesiones en 3 semanas") derived from first-vs-latest assessment. Demote spend.

### C3 — Pro sells features that don't exist; the moat is given away free
**Problem.** `lifetime.ts` Pro lists "Analytics completo" (removed from Debate Hub) and "Práctica y drills ilimitados" (placeholder). None of the 5 Pro benefits has a working gate. Meanwhile the Lifetime Profile, public `/p/[slug]`, and printable certificate are 100% free.
**Why it matters.** Paying for vaporware → refunds + bad reviews + lost parent trust the day Stripe connects. And the status/viral asset a teen would actually pay to flaunt is free.
**Fix.** Rewrite Pro copy now to describe only what exists; mark Analytics/Práctica "Próximamente." Move the gate from statistics to **expression of achievement**: gate the vanity public slug, the downloadable PDF certificate/transcript with a `/verify/{id}` page, and the "verificado" badge. Sell proof + share, not charts.

### C4 — Zero AI where the product burns the most human time
**Problem.** Confirmed zero LLM integration. Coaches hand-type every ballot (5 scores defaulting to "7" + free-text comment, per round), hand-write all feedback, hand-build every quiz; the parent report is a static template; coach recommendations are substring matching; placement is self-rated noise.
**Why it matters.** It's the axis a 2026 ed-tech buyer expects to lead on, and it's the supply-side time sink that limits how many students a coach can serve.
**Fix.** Prioritize (ranked in §9): AI ballot draft from the recording → AI parent-report narrative → rules-based coach recommender → AI sparring drill (fills the empty Practice tab AND makes "práctica ilimitada" true). Always coach-owned drafts; never auto-publish.

### C5 — First-touch acquisition leaks: no signup door, login-as-default, double setup walls
**Problem.** Landing's only entry is a gray "Acceder" text link; every prominent CTA books a sales call. `Auth.tsx` defaults `mode='login'` ("De vuelta al entrenamiento" to a stranger). Post-signup the student hits BOTH a goals "onboarding" screen and a 6-slider placement, both fully required, before seeing the academy.
**Why it matters.** Each step is a measurable drop for a 12–24 audience that never reads docs and bounces fast.
**Fix.** Add a primary "Crear cuenta gratis" CTA on the landing hero/nav deep-linking to `/aula?mode=register`; open register mode when arriving from it. Cut to ONE post-signup step: drop the goals screen (or fold 2 chips into the dashboard), keep placement, and make it skippable with the 50-default counting as a valid answer.

### C6 — Minor signs up with no guardian in the loop; no email verification
**Problem.** Student register shows "Si eres menor de 18, tu cuenta se configura para uso con tutor" but never captures a tutor email or fires an invite. No email verification on either side; a minor can name any adult as "tutor." Consent/spend safeguards then ride on unverified identities.
**Why it matters.** Trust/safety + legal hole for a minor-heavy product, and you lose activation of the side that pays. (SMTP is blocked, so don't claim verification emails send — but the UI must still capture the link and surface the unverified state.)
**Fix.** If `birthYear` indicates a minor, require the tutor email and create a PENDING guardianship link at registration; show a persistent "Invita a tu mamá/papá" card on the minor's home until linked. Gate minor public-profile/spend consent behind the verified state in the UI even while real email delivery is deferred.

### C7 — "Confianza total" silently switches on unlimited auto-charge
**Problem.** Choosing "Confianza total" in the per-child threshold sends `consentLevel:'full'`; thereafter the child's bookings auto-confirm and charge with no second prompt — the only feedback is a toast "Umbral actualizado." Buried in a billing card a busy parent never scrolls to.
**Why it matters.** A serious financial control hidden in a dropdown, written in manual-speak ("Umbral"), the opposite of how a non-technical parent thinks.
**Fix.** Confirm explicitly on selection ("A partir de ahora las clases de {hijo} se cobrarán automáticamente sin pedirte permiso. ¿Seguro?"), show a persistent "auto-cobro activo" reminder on the child card, and rewrite all threshold copy in the first person ("Pídeme permiso siempre" / "Confío — no me pidas permiso").

### C8 — On-demand fetches show no loading state; the app looks frozen
**Problem.** Route changes repaint synchronously from cache (fine), but every fetch — debate ballot (`openDebateDetail`), coach detail, booking confirm — shows nothing between tap and result. No skeleton, no spinner.
**Why it matters.** On a slow phone (the dominant device for teens) the user taps and sees nothing happen, then taps again.
**Fix.** Open modals immediately with a skeleton / "Cargando ballot…" then swap content; add an `aria-busy` skeleton to the coach-profile detail; give every async action an instant optimistic acknowledgment.

### C9 — Paid session room resolves to "video is being enabled" at start time
**Problem.** The CONFIRMED room is an honest dashed placeholder, but it's where a paid 1:1 "happens." A parent who paid (escrow) and a student arriving on time see a box with no join button and no fallback; the countdown even flips to "en curso" while video can't connect.
**Why it matters.** Maximum anxiety at the paid moment-of-truth. (Live video is credential-blocked — the fix is a fallback, not building video.)
**Fix.** Add a coach-pasted `meetingUrl` (Zoom/Meet/WhatsApp) rendered as a primary "Unirse a la llamada," plus a "contacta a tu coach" link. A paid session must never resolve to "se está habilitando." Also: until video lands, the booking button should say "Ver detalles" / show an inline countdown rather than "Unirse," which promises instant entry.

---

## 3. Quick Wins (high impact, low effort)

A tight checklist — mostly copy + routing + small UI, no new infra:

- [ ] **Re-point the provisional hero CTA** from the empty Practice tab to a real lesson or coach booking (C1).
- [ ] **Rewrite Pro copy** to only list shipped benefits; mark Analytics/Práctica "Próximamente" (C3).
- [ ] **Add "Crear cuenta gratis"** to the landing hero/nav → `/aula?mode=register`; open register mode from it (C5).
- [ ] **Make placement skippable**; treat the 50 default as a valid answer (enable submit immediately).
- [ ] **Replace "escrow" with human copy** everywhere it faces a parent ("tu pago queda retenido y seguro; el coach lo cobra al terminar").
- [ ] **Rewrite the threshold control** title + options in the first person; add confirm dialog for "Confianza total" (C7).
- [ ] **Lead each child card with a one-line progress verdict**; demote *Gasto del mes* (C2).
- [ ] **Translate / annotate ranks**: "OTR Initiate (Principiante · nivel 1 de 6)"; drop bare "XP" from the parent report.
- [ ] **Remove the hardcoded `badge:'2'`** on Mensajes so the real `navBadge()` count drives it; make "Ver todas" (notifications) route somewhere or delete it.
- [ ] **Mobile brand header**: collapse the login brand panel into a slim header (crest + "Academia #1" + 60px mini-waveform) instead of `display:none` (C-UI).
- [ ] **Rewrite the dashboard greeting** with coach voice ("A trabajar," / "La sala te espera,") and resolve gender via the name, not "/a".
- [ ] **Label tournaments** "Inscripción abierta · el cuadro se publica el [fecha]" and confirm after registering, so it doesn't read as a dropped ball.
- [ ] **Remove the unreachable `teacher` branch** from the public register form.
- [ ] **Collapse the rating "provisional" disclaimer** (shown 3×) into one progress counter: "Rating real en N rondas más."
- [ ] **Branch the room PENDING copy** on age: minors → "cuando tu tutor apruebe"; adults → "cuando se confirme el pago."

---

## 4. UX (prioritized)

1. **Every async action needs an instant ack** — skeletons/optimistic state for ballot, coach detail, booking (C8).
2. **Booking is 6 taps; make it 2.** Pre-select "Sesión individual" + the coach's nearest slot, render the summary immediately, confirm in one tap with "cambiar horario" to override. On mobile, reveal steps progressively and pin a sticky summary+confirm bar.
3. **Language toggle does a full `location.reload()`** — dumps SPA state, scroll, open modals, resets route. Re-render in place (`renderApp(currentRoute,{keepScroll:true})`); all screens read `t()` at render time.
4. **Coach approval rows lack decision data.** Add coach avatar, session duration, "ver coach" link, and microcopy under Reject ("no se cobra nada") so the parent decides without leaving the row.
5. **Power-user friction (coach):** no keyboard shortcuts anywhere; adjudication retypes the same format/opponent per kid; "Completar sesión" releases escrow instantly with no undo; availability is one 30-min slot at a time with no recurrence/copy-day; every mutation triggers a full `softRefresh` repaint that flashes and loses scroll.
6. **Debate history** forces a fetch + modal per round; show the last ballot's 6 criteria inline and preload the most recent.
7. **Public-profile toggle** ("Activar"/"Despublicar") never tells the parent *what* becomes visible — show an exact preview (what's shown / hidden) before enabling.

## 5. UI & Personality (prioritized)

1. **Restore the signature 6-dim radar to the dashboard.** It was replaced by a flat course-progress bar list; the home now looks like any LMS (the `DASH_SKILL_DIMS`/`comps`/`skillAvg` are still computed but unrendered). Bring back a compact hand-drawn SVG hexagon (animate the polygon with `stroke-dasharray`) — this is OTR's screenshot-able signature. Either restore it or delete the dead computation.
2. **The mobile first impression is the blandest screen** — the crafted login waveform + gradient are `display:none` below 860px. Costs ~30 lines to rescue (Quick Win).
3. **One gradient trick reused 5×** (navy→ink hero on login, hello-card, recorder, course-hero, placement). Differentiate by surface: arena stripes on Debate, a waveform echo on Dashboard, a timeline line on Lifetime — same palette, different texture.
4. **Empty states are all icon-in-a-tinted-square; avatars are flat initials pucks.** Commission 4–5 line illustrations for the highest-traffic empties (podium, mic+waves, empty bracket); make coach photos mandatory and deterministically vary initials backgrounds. Real faces on coach cards = the biggest marketplace trust lever.
5. **Personality is mis-distributed.** Empty states have real voice ("Tu cohort aún no entra a la arena") while the CTAs everyone sees are generic ("Explorar catálogo"). Move the arena voice to primary CTAs/titles ("Arma tu entrenamiento").
6. **Gaming tier ladder (Bronce→Diamante→Gran Maestro)** clashes with the Harvard-aspiration ethos and feels asset-pack. Unify on the new "OTR Degrees" voice across Debate Hub too.
7. **Flat card hierarchy + near-monochrome-green status.** Give one elevated "primary" card per screen; differentiate status by shape/weight, not just hue (the green ramp makes WIN, confirmed, link, and progress-bar read identical).
8. **Lower-leverage craft:** snap hardcoded border-radii to the token ramp; design 3 medal tiers with real depth + a one-time earned animation; lean into tabular-nums as the display signature; dark mode is cheap given the token discipline (later).

## 6. Navigation & IA (prioritized)

1. **Sidebar is 9–12 items across 5 groups vs the promised 7-item IA.** Collapse "Centro de progreso" (Trayectoria/Niveles/Logros/Calificaciones = overlapping) into one "Mi progreso" with internal tabs, exactly like Debate Hub already does. Move standalone "Membresía" into Marketplace or Ajustes.
2. **No search on mobile** (it's `desk-only`) — the device where a catalog + coach marketplace needs it most. Add a topbar search icon that expands an inline field (reuse the existing Enter handler).
3. **Events is read-only** (cards with no action). Either add a micro-action per card ("Recordarme" / .ics) or fold Events into a dashboard strip and drop the top-level nav entry — it doesn't earn a first-level click while it does nothing.
4. **Duplicate/dead nav signals:** hardcoded Mensajes badge vs real count; dead "Ver todas" link; two unrelated unread systems (bell vs messages). Reconcile.

## 7. Onboarding & Activation (prioritized)

1. **One step, not three walls.** Landing login-default → goals onboarding → 6-slider placement is three gates before value. Drop the goals screen, make placement skippable, land on the dashboard in one tap (C5).
2. **The hero CTA must complete.** Re-point provisional users off the empty Practice tab (C1).
3. **Reward before redirect.** Placement ends in a hard `location.reload()` — the most motivating instant (your radar/debut rank lighting up) is spent on a white flash. Animate the result in-place, then router-`go()` to the dashboard.
4. **Placement produces dirty official data.** 12–14-year-olds can't self-rate "Cross-ex"/"Refutación"; the noise writes straight to the Skill Graph coaches and parents see as truth. Replace with 3–4 behavioral questions ("¿Has debatido antes?") or — better — an optional 60-sec recorded response the AI scores (§9). Glossary each term inline.
5. **Pull the guardian into the loop at signup** (C6) and surface a persistent "invita a tu tutor" card.
6. **Close the parent cold-start.** First login should auto-surface children who named this adult as guardian (`pendingLinks`) as one-tap "Confirmar" cards above the email form, not demand typing the kid's exact email.
7. **Reclaim the dead goals capture** — if kept, chain placement → goals → dashboard (no reload) and use the chosen goal to direct the home CTA ("Tu meta: ganar torneos → reserva un coach de torneo").

## 8. Accessibility (prioritized)

1. **Status conveyed by hue alone** (everything is green) fails at-a-glance + color-vision scanning. Add shape/weight differentiation (filled pill vs gold outline vs underline-on-hover).
2. **No global keyboard model** beyond chip-level Enter/Esc/Space — add `/`-to-search, `g`+key jumps, Cmd/Ctrl+Enter to submit modals, j/k row nav, `?` cheat-sheet (also a power-user win).
3. **Loading states are invisible** — add `aria-busy` + visible skeletons so screen-reader and low-bandwidth users know something's happening (C8).
4. **Preserve scroll/focus across repaint** (language toggle + softRefresh currently reset both).
5. Good existing baseline: `prefers-reduced-motion` is wired and chip a11y exists — extend that discipline to new motion (radar draw, medal pop).

---

## 9. AI & Automation Opportunities (ranked, product-specific)

Always coach-owned drafts; never auto-publish a ballot or send a message unattended.

1. **AI ballot draft from the recording.** Transcribe the existing `recordingUrl`, pre-fill all 5 rubric scores *with one-line evidence each* + a draft comment; coach edits & publishes. Kills the most-repeated high-skill manual task (10 min → 90 s) and makes every ballot evidence-backed. *(H impact / H effort)*
2. **AI parent-report narrative.** Generate 3–4 sentences from the month's ballot comments + skill deltas + attendance ("Sofía subió su Refutación de 58 a 67…") above the existing numbers. This is what makes a parent renew. *(H/M)*
3. **Rules-based coach recommender.** Rank coaches by weakest-skill dimension × specialty × tier-fit × availability × review sentiment, with a real `recoWhy` ("Trabaja Refutación, donde tu hijo está más bajo"). Directly grows 18%-commission bookings; needs no LLM to start. *(H/M)*
4. **AI sparring drill = fill the empty Practice tab.** Serve a motion, student records/types a 2-min rebuttal, LLM returns feedback on the 6 dims + one cross-ex follow-up. Async, unlimited, rating-neutral. This is the missing daily-active hook AND it makes Pro's "práctica ilimitada" true. *(H/H)*
5. **Auto session recap from the recording.** One recording → three payloads: student recap (3 wins / 2 focuses / 1 drill), one-line parent note, coach notes. Feeds the next-action card and the sparring tab. *(H/M)*
6. **AI placement diagnostic.** Optional 60-sec recorded response → LLM positions the 6 sliders; turns garbage-in self-rating into a credible debut rank and a wow moment. *(H/H)*
7. **Gap-driven lesson/course reco + smarter next-action.** Rank lessons by gap-to-target on the weakest dimension and recurring ballot themes ("tu coach marcó débil tu weighing 2 rondas → Lección: Comparativa de impactos"). *(H/M)*
8. **AI quiz/assignment draft.** "Generar borrador desde la lección" pre-fills the existing quiz builder; rubric-scored draft feedback for assignments. Removes the #1 barrier to coaches building content. *(M/M)*
9. **Churn-risk ranking + auto-drafted re-engagement.** Turn the static at-risk flag into a ranked, predictive list with a tailored draft nudge per student (instead of dumping the coach in a blank inbox). *(M/M)*
10. **"Pregúntale a OTR" assistant** grounded in the student's own data + content, deep-linking to screens ("tu próxima sesión es el jueves 4pm [Ir]"). Monetizable Pro perk; cuts clicks/thinking for the target age. *(M/H)*

---

## 10. Business: Activation, Retention, Conversion, Trust

**Activation.** Day-one aha is broken (C1) and the guardian/payer never enters the loop (C6). Fix the dead-end CTA and pull the parent in at signup — activation of *both* sides depends on it.

**Retention.** There is **no daily self-serve loop.** Streaks exist and Pro promises "protección de racha," but Practice is empty, the Skill Graph only decorates (never prescribes), and rating moves only when a coach adjudicates (not daily). Seed a daily hook now (drill/quiz-of-the-day, "repasa tu último ballot," reto de la semana); the AI sparring tab (§9.4) is the durable version. The parent monthly report — the PRD's retention weapon — is a print-only data dump; the AI narrative (§9.2) is what actually renews subscriptions.

**Conversion.**
- **Stop selling vaporware** (C3) — this is table stakes before Stripe.
- **Move the gate to the moat**: public vanity slug, PDF certificate/transcript with `/verify/{id}`, "verificado" badge.
- **Contextual paywalls at the moment of desire**, not the passive `proUpsellStrip`: at certificate download, at "compartir perfil," at first cert (7-day trial), at OTR-Degree-up. Measure each trigger.
- **Membership is a DB no-op** (`User.membership='pro'`, no Stripe) — you're flying blind on the funnel. Connect ONE Stripe test-mode subscription, default **annual** ($79, better LTV), and instrument upgrade-intent (CTA click) vs upgrade-complete.
- **Build a "Plan Familia/Proof" SKU** ($15–19) in outcome language for the *payer*: monthly report, verified profile, "listo para admisiones" cert, 1 coaching credit. Probably the highest-converting SKU — today all upsell is aimed at the teen, not the cardholder.
- **Transactional revenue on existing rails**: paid verified credential ($5–15, viral via `/verify`) and entry-fee tournaments reusing the existing `holdEscrow`/`releaseEscrow`.
- Reduce **Elite** from a ghost "Muy pronto" third column to a one-line waitlist; focus the comparator on Free vs Pro.

**Trust (esp. parents-of-minors).**
- De-jargon the parent surface: kill "escrow," "Umbral," bare "XP," English ranks (C-copy).
- Make "Confianza total" auto-charge explicit + reversible + persistently flagged (C7).
- Show exactly what a public minor profile exposes before enabling it.
- Distinct icons: shield = "menor protegido" (good) vs bell/dot = "requiere tu acción" (the lock icon currently means both).
- Require verified email on both sides before guardianship/consent flips PENDING→ACTIVE; surface the unverified state in-UI while SMTP is blocked (C6).
- Give forgot-password a working fallback ("contacta a soporte/tu coach") since the reset email silently never sends.
- Lead the auth card with confidence/growth, not forced-uppercase championship flexing, for a nervous-minor audience.

---

## 11. Remove (cut these)

- **The goals "onboarding" screen** before placement — dead code path users never reach anyway; fold 2 chips into the dashboard.
- **The unreachable `teacher` branch** in the public register form.
- **The "Práctica" tab framing** (or the tab itself) until it does something — an empty placeholder on the flagship tab reads as broken. At minimum hide the Drills card and relabel.
- **The hardcoded Mensajes `badge:'2'`** and the dead "Ver todas" notifications link.
- **Duplicate hero CTA** repeated in the achievements card on the dashboard.
- **The triple "provisional" disclaimer** → one progress counter.
- **The Elite ghost column** → one-line waitlist.
- **2 of 4 dashboard KPI tiles** (XP total, % promedio are vanity that prescribe no action) — collapse or push below the fold.
- **Dead `DASH_SKILL_DIMS`/`comps`/`skillAvg` computation** if the radar isn't restored.
- **"Cuartel general" / competing slogans** — pick one metaphor (aula/training).

## 12. Add (worth building)

- **AI ballot draft, parent-report narrative, coach recommender, sparring drill** (§9 — ranked).
- **Parent-books-on-behalf-of-child** flow (C2).
- **Daily habit hook** (drill/quiz-of-the-day) (§10 retention).
- **Coach `meetingUrl` fallback** for the live room (C9).
- **Guardian-invite at signup** + verified-email gating of consent (C6).
- **Stripe test-mode subscription** + funnel instrumentation; **Plan Familia/Proof SKU**; **contextual paywalls**.
- **Global keyboard model** + power-user actions (save-and-next adjudication, recurring availability, undo on Completar).
- **Skeleton/loading states** for all async fetches.
- **In-place language switch** (no reload).
- **Mobile search** + **mobile brand header**.
- **Bespoke empty-state illustrations** + **restored dashboard radar**.

---

## 13. Feels Generic vs Feels Premium

| Feels generic (template smell) | Feels premium (handcrafted) |
| --- | --- |
| "Buenas," dashboard greeting; "/a" gender slashes | The 64px tabular-nums debate rating — confident, distinctive |
| Flat course-progress bars where the radar used to be | The animated login waveform (oratoria = sound wave) — on-brand signature |
| Same navy→ink gradient on 5 dark panels | Strict, well-built token system + warm-neutral ramp |
| Icon-in-a-tinted-square empty states everywhere | The empty-state *copy* ("entra a la arena / rivales a tu altura") |
| Initials-puck avatars; coach photos optional | Real motion/elevation logic, `prefers-reduced-motion` wired |
| Gaming ladder Bronce→Gran Maestro | The "OTR Degrees" direction (commit'd) — coined here |
| Generic CTAs ("Explorar catálogo"); feature-list subhead ("en un solo lugar") | "Domina la sala. Empieza por entrenar." — punchy, rhythmic H1 |
| Bare "XP" number; "OTR Initiate" with no scale | "10 campeonatos · 55 clasificaciones · Harvard '26" — concrete proof |
| Empty Practice tab presented as a playable action | Honest, well-written empty states elsewhere |
| Wall of equal-weight white cards, monochrome-green status | Lifecycle-aware greeting concept (just needs real voice) |

The pattern: **the personality and craft exist but are hidden** (empty states, waveform, numerals) or **removed from where everyone looks** (radar). Premium is mostly a redistribution job, not a from-scratch one.

---

## 14. How To

**Reduce clicks.** Pre-select the single-session package + nearest slot (booking 6→2 taps). Parent books directly for a child. One-tap "Confirmar" guardianship cards. Save-and-next adjudication; recurring/copy-day availability; bulk "mensaje a seleccionados." Inline last-ballot criteria instead of a modal-per-round. One-tap skip on placement.

**Reduce thinking.** One-line "is my kid improving?" verdict instead of six numbers. First-person threshold copy. Human words for escrow/XP/ranks. Real `recoWhy` so the buyer reaches a defensible choice in one read. Collapse "provisional" to "rating real en N rondas más." One elevated primary card per screen so the eye knows where to go.

**Increase delight.** Live-building radar as you drag placement sliders; reward-before-redirect reveal of your debut rank. Earned-medal confetti pop. Recurring waveform motif (dashboard divider, recording indicator). Coach-voice greetings and CTAs.

**Feel human.** Kill jargon at the parent surface. Branch room/consent copy on age (don't tell an adult "espera a tu tutor"). AI narrative report that reads like a coach wrote it. Distinct, labeled icons. Lead with confidence over championship flexing for nervous teens.

**Feel premium SaaS.** Skeletons on every fetch (never "frozen"). In-place language switch. Keyboard shortcuts + `?` overlay. Optimistic mutations + preserved scroll. Real coach photos. Per-surface gradient texture. Snapped radius scale + nested-radius rule. Dark mode (later) off the existing token discipline.

---

## 15. Roadmap

**Now (this sprint — copy/routing/small UI, mostly Quick Wins).**
Re-point hero CTA off empty Practice · rewrite Pro copy (no vaporware) · landing "Crear cuenta gratis" + register-mode default · skippable placement (50 = valid) · de-jargon parent surface (escrow/XP/ranks) · first-person threshold + "Confianza total" confirm · child-card progress verdict + demote spend · remove hardcoded badge / dead link / duplicate CTA / teacher branch · mobile brand header + mobile search · branch room PENDING copy · tournament "cuadro se publica el…" labeling · coach `meetingUrl` fallback.

**Next (this quarter — needs modest build).**
Parent-books-for-child · restore dashboard radar · loading skeletons everywhere · in-place language switch · single-tap booking + progressive steps · guardian-invite at signup + verified-consent gating · collapse IA to 7 destinations · daily habit hook (drill/quiz-of-the-day) · **AI ballot draft** + **AI parent-report narrative** + **rules-based coach recommender** · Stripe test-mode annual subscription + funnel instrumentation · contextual paywalls + move gate to certificate/slug · keyboard model + power-user adjudication/availability/undo · reward-before-redirect placement.

**Later (next 1–2 quarters).**
AI sparring drill (real Practice tab) + AI placement diagnostic · auto session recap · gap-driven lesson reco · AI quiz/assignment drafts · churn-risk ranking + auto-nudge · "Pregúntale a OTR" assistant · Plan Familia SKU + verified-credential + entry-fee tournaments · bespoke empty-state illustrations + medal tiers · dark mode · token de-aliasing (sky/navy → action/ink).

---

## 16. Top 40 Improvements (ranked by impact-per-effort)

| # | Improvement | Category | Impact | Effort | Biz value | Why it ranks here |
|---|---|---|---|---|---|---|
| 1 | Re-point provisional hero CTA off the empty Practice tab to a real lesson/coach booking | Onboarding | H | L | H | Fixes the day-one dead-end for every new student; pure routing |
| 2 | Rewrite Pro copy to drop non-existent Analytics/Práctica ("Próximamente") | Business | H | L | H | Stops selling vaporware before Stripe; string change in one file |
| 3 | Add "Crear cuenta gratis" on landing + open register mode from it | Onboarding | H | L | H | Closes the biggest acquisition leak; the only entry is a gray link today |
| 4 | Make placement skippable; treat 50-default as valid (enable submit now) | Onboarding | H | L | M | Removes a hard gate at peak abandon; toddler-simple change |
| 5 | Replace "escrow"/"Umbral"/bare-XP/English-ranks with human copy on parent surface | Copy/Trust | H | L | H | The trust words a parent must understand are the ones they can't; copy-only |
| 6 | "Confianza total" confirm dialog + persistent auto-charge flag | Trust | H | L | H | Serious financial control hidden in a dropdown; cheap to fence |
| 7 | Lead each child card with a one-line progress verdict; demote spend | Product/Emotional | H | L | H | Answers the only question a parent renews for; reorders existing data |
| 8 | Rules-based coach recommender with real recoWhy | AI/Business | H | M | H | Core growth lever for 18% commission; no LLM needed to start |
| 9 | Parent books on behalf of a linked child (auto-confirmed) | Product | H | M | H | The payer is locked out of the buy button; collapses a double round-trip |
| 10 | AI ballot draft from the recording (coach-edited) | AI | H | H | H | Kills the supply-side time sink; makes ballots evidence-backed; the AI flagship |
| 11 | AI parent-report narrative above the numbers | AI/Business | H | M | H | Turns a data dump into the thing that renews subscriptions |
| 12 | Loading skeletons / optimistic state on all async fetches | UX/Perf | H | M | M | App currently looks frozen on slow phones — the dominant device |
| 13 | Mobile brand header (crest + eyebrow + mini-waveform) instead of display:none | UI | H | L | M | Rescues the first impression on the majority device; ~30 lines |
| 14 | Single-tap booking: pre-select package + nearest slot | UX | H | M | H | Cuts friction on the highest-revenue action from 6 taps to ~1 |
| 15 | Guardian-invite at signup + verified-consent gating | Onboarding/Trust | H | M | H | Activates the payer side and closes a minor safety/legal hole |
| 16 | Restore the 6-dim radar to the dashboard | UI/Product | H | M | M | Recovers the screenshot-able brand signature on the most-viewed screen |
| 17 | Daily habit hook (drill/quiz-of-the-day, "repasa tu ballot") | Product/Retention | H | M | H | The product has no daily self-serve loop; D7/D30 depend on it |
| 18 | Coach meetingUrl fallback for the live room | UX/Trust | H | M | H | Removes peak anxiety at the paid moment-of-truth; video stays deferred |
| 19 | Collapse IA to ~7 destinations (merge Centro de progreso, move Membresía) | Navigation | H | M | M | Sidebar is 9–12 items; tab-ify like Debate Hub already does |
| 20 | Cut goals onboarding to one step; reward-before-redirect placement | Onboarding | H | M | M | Two setup walls → one; spends the aha-moment on a reveal not a reload |
| 21 | Stripe test-mode annual subscription + funnel instrumentation | Business | M | M | H | Membership is a DB no-op; you can't price what you can't measure |
| 22 | Contextual paywalls (cert download, share profile, 1st cert trial) | Business | H | M | H | Upsell where desire peaks, not a passive background strip |
| 23 | Move the gate to the moat: vanity slug + PDF cert/transcript + verified badge | Business | H | M | H | Gate the status asset teens flaunt, not the charts they ignore |
| 24 | In-place language switch (no full reload) | UX | M | M | M | A core bilingual control currently nukes state/scroll/modals |
| 25 | First-person threshold copy + approval-row decision data (avatar/duration/"no se cobra") | UX/Trust | M | L | M | Lets a parent decide without leaving the row; copy + small UI |
| 26 | Coach photos mandatory + deterministic initials backgrounds | UI/Trust | H | M | H | Real faces are the #1 marketplace trust lever for parents |
| 27 | Plan Familia/Proof SKU in outcome language | Business | H | M | H | Sells to the actual cardholder; likely highest-converting SKU |
| 28 | Global keyboard model + save-and-next adjudication, recurring availability, undo on Completar | UX/Automation | M | M | M | Daily-driver coach friction; rage-quit territory at volume |
| 29 | Mobile search entry point | Navigation | M | L | M | Search is desk-only on a phone-heavy catalog+marketplace |
| 30 | Remove hardcoded Mensajes badge + dead "Ver todas" + duplicate hero CTA | UI | M | L | L | Stale/dead signals erode trust; trivial deletions |
| 31 | Auto session recap (student + parent + coach) from recording | AI/Automation | H | M | H | The most expensive event produces zero follow-up today |
| 32 | AI sparring drill = real Practice tab | AI/Product | H | H | H | The missing daily loop AND makes Pro's "ilimitada" true |
| 33 | Status differentiation by shape/weight, not hue alone | UI/A11y | M | L | M | Everything green reads identical; accessibility + scannability |
| 34 | Tournament labeling + post-register confirmation | Product/Copy | M | L | M | Stops registration-only from reading as a dropped ball |
| 35 | Branch room/consent copy on age (don't tell adults "espera a tu tutor") | Copy | M | L | L | Confusing + infantilizing for adult learners; reuse existing age signal |
| 36 | Replace placement self-rating with behavioral Qs (or AI diagnostic) | Onboarding/AI | M | M | M | Stops seeding the official Skill Graph with teen-guess noise |
| 37 | Forgot-password fallback path (support/coach) while SMTP blocked | QA/Trust | H | M | M | Only recovery path silently fails — a churn trap for a forgetful audience |
| 38 | AI quiz/assignment draft from lesson into existing builders | AI/Automation | M | M | M | Removes the #1 barrier to coaches authoring content |
| 39 | Churn-risk ranking + auto-drafted re-engagement | Automation | M | M | M | Turns a static at-risk flag into actionable retention infra |
| 40 | Per-surface gradient texture + medal tiers + radius snapping + dark mode | UI | M | M | L | Craft polish; real but lower-leverage than everything above |

---

*Audit compiled from 11 independent perspectives. Already-fixed items (per the unmerged PR) and credential-blocked work (live video, SMTP, real Stripe) were excluded from problem flags by design.*
