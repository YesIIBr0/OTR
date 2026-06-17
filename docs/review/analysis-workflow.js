export const meta = {
  name: 'otr-aula-product-review',
  description: 'Scientific 14-lens product/UX/cognitive/a11y audit of OTR Aula across every screen + role, adversarially verified',
  phases: [
    { title: 'Screen review', detail: 'one reviewer per screen-cluster, all 14 lenses + per-screen scores' },
    { title: 'Cross-cutting', detail: 'IA, design system, accessibility, simplification, cognitive load — global' },
    { title: 'Verify', detail: 'adversarial refutation of every high/critical finding' },
  ],
}

const REPO = '/Users/wilserbatistamarcelino/repos/OTR_Academy'
const CAP = REPO + '/docs/review/capture/behavioral-capture.md'

const CONTEXT = `
PRODUCT: OTR Aula — a Next.js 15 LMS SPA for debate & oratory education (Spanish-first, ES/EN).
Served at /aula. Roles: student, coach(TEACHER), parent(FAMILIA), admin. It is a polished,
in-progress product (PRD Fase 1). Screens are HTML-string builders 'S.<key>' in app/lib/scr-*.ts,
injected by the SPA engine app/components/Aula.tsx; nav/shell in app/lib/shell.ts; routes registry
in app/lib/screens.ts; styles in app/styles/{tokens,app,screens,responsive}.css (design tokens in
tokens.css). Navigation in-app is window.go('<route>').

GROUND TRUTH (already captured live, do not re-verify): every screen in every role renders with
ZERO console errors. Read the behavioral capture first: ${CAP}

OUT OF SCOPE: the marketing landing (public/site/index.html, intentionally separate & locked);
the disabled screens hub/forum/arsenal (scr-hub.ts/scr-community.ts/scr-arsenal.ts — no route by
design); the root-level legacy *.js/*.css prototype (dead). Do NOT propose work on those.
Two bugs are ALREADY known (do not re-report as new, but DO note if you see more instances):
(1) systemic '&amp;' double-escape on names containing '&'; (2) login .lb-wave hydration mismatch.
`

const RUBRIC = `
Evaluate using these lenses (the 14-phase framework). Apply every lens that is relevant to the
screen; you do not need a finding for every lens, only where something genuinely fails:
- Information architecture & discoverability (predictable placement, grouping)
- Cognitive walkthrough (first-time / non-technical / power / mobile / elderly user): will they know
  what to do, find the action, understand the result, know it succeeded?
- Nielsen's 10 heuristics (status visibility, match real world, user control/undo, consistency,
  error prevention, recognition>recall, flexibility/efficiency, minimalist aesthetic, error recovery, help)
- Cognitive load: Hick's (too many choices), Miller's (info overload >7±2), Fitts's (small/distant targets),
  Jakob's (breaks convention), Tesler's (complexity that could be absorbed by the system)
- Visual hierarchy: is the page's primary objective + primary action obvious within 5 seconds?
- Scanability: headings/anchors/whitespace vs walls of text; can it be understood by scanning?
- Content reduction: classify visible text Required/Useful/Optional/Noise; target 40-70% cut of noise.
- Design system: button/input/card/table/modal/badge consistency; visual debt; component drift.
- Accessibility (WCAG 2.1 AA): semantic markup, headings order, labels/alt, focus order & visible focus,
  keyboard operability of clickable divs/rows, color contrast (check against app/styles/tokens.css values),
  ARIA on modals/menus, error announcement. The codebase has [A11Y-*] markers — verify they hold.
- Exploratory QA: broken/empty/error states, double-escaping, locale/date bugs, inconsistent logic.
- Enterprise benchmark: would Stripe/Linear/Notion/Vercel ship this screen? if not, why?

SIMPLIFICATION IS THE PRIORITY LENS. For every element ask first: can it be (1) removed, (2) merged,
(3) simplified, (4) automated, (5) hidden until needed — BEFORE proposing a redesign. The final test
for any element: "if it disappeared tomorrow, would users genuinely miss it?" If no → recommend removal.

For every finding propose a CONCRETE fix tied to a file (and symbol/selector where possible) so it can
be implemented directly. Be specific and skeptical — no vague "could be cleaner". Default to fewer,
higher-confidence findings over a long low-signal list.
`

const FINDING = {
  type: 'object', additionalProperties: false,
  required: ['id','screen','lens','severity','problem','rootCause','userImpact','recommendation','fixType','file','effort','confidence'],
  properties: {
    id: { type: 'string', description: 'short stable id e.g. DASH-03' },
    screen: { type: 'string' },
    lens: { type: 'string', description: 'which lens this comes from' },
    severity: { type: 'string', enum: ['critical','high','medium','low'] },
    problem: { type: 'string' },
    rootCause: { type: 'string' },
    userImpact: { type: 'string' },
    businessImpact: { type: 'string' },
    recommendation: { type: 'string', description: 'concrete fix' },
    fixType: { type: 'string', enum: ['eliminate','merge','automate','simplify','redesign','fix-bug','a11y','content'] },
    file: { type: 'string', description: 'source file (+symbol/selector) where the fix lands' },
    effort: { type: 'string', enum: ['S','M','L'] },
    confidence: { type: 'number', description: '0..1' },
  },
}

const SCORE = {
  type: 'object', additionalProperties: false,
  required: ['screen','clarity','simplicity','learnability','discoverability','accessibility','efficiency','scanability','visualHierarchy','cognitiveLoad','consistency','enterpriseReadiness'],
  properties: {
    screen: { type: 'string' },
    clarity: { type: 'number' }, simplicity: { type: 'number' }, learnability: { type: 'number' },
    discoverability: { type: 'number' }, accessibility: { type: 'number' }, efficiency: { type: 'number' },
    scanability: { type: 'number' }, visualHierarchy: { type: 'number' }, cognitiveLoad: { type: 'number' },
    consistency: { type: 'number' }, enterpriseReadiness: { type: 'number' },
  },
}

const CLUSTER_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['area','scores','findings'],
  properties: {
    area: { type: 'string' },
    scores: { type: 'array', items: SCORE },
    findings: { type: 'array', items: FINDING },
  },
}

const GLOBAL_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['area','summary','findings'],
  properties: {
    area: { type: 'string' },
    summary: { type: 'string' },
    findings: { type: 'array', items: FINDING },
  },
}

const VERDICT = {
  type: 'object', additionalProperties: false,
  required: ['id','isReal','confidence','reason','correctedSeverity'],
  properties: {
    id: { type: 'string' },
    isReal: { type: 'boolean' },
    confidence: { type: 'number' },
    reason: { type: 'string' },
    correctedSeverity: { type: 'string', enum: ['critical','high','medium','low','not-a-finding'] },
  },
}

const clusters = [
  { area: 'Dashboard & core', files: ['app/lib/scr-core.ts'], screens: ['dashboard','catalog','progress','badges','grades','search'] },
  { area: 'Learn flow', files: ['app/lib/scr-learn.ts'], screens: ['course','courseIndex','lesson','assignment','quiz','quizResults','player'] },
  { area: 'Debate Hub (flagship)', files: ['app/lib/scr-debate.ts'], screens: ['debateHub'] },
  { area: 'Marketplace', files: ['app/lib/scr-marketplace.ts'], screens: ['marketplace/explore','coach profile'] },
  { area: 'Lifetime & Membership', files: ['app/lib/scr-lifetime.ts'], screens: ['lifetimeProfile','membership'] },
  { area: 'Coach / Teacher', files: ['app/lib/scr-teacher.ts'], screens: ['teacher','participants','manage','courseBuilder'] },
  { area: 'Coach workspace', files: ['app/lib/scr-coachwork.ts'], screens: ['coachwork'] },
  { area: 'Parent portal', files: ['app/lib/scr-parent.ts'], screens: ['parentPortal'] },
  { area: 'Admin', files: ['app/lib/scr-admin.ts','app/lib/scr-admin-users.ts'], screens: ['adminConsole','adminUsers'] },
  { area: 'Profile', files: ['app/lib/scr-profile.ts'], screens: ['profile','coach'] },
  { area: 'Account & misc', files: ['app/lib/scr-settings.ts','app/lib/scr-events.ts','app/lib/scr-room.ts','app/lib/scr-certificate.ts','app/lib/scr-mybookings.ts','app/lib/scr-placement.ts','app/lib/scr-extra.ts'], screens: ['settings','events','room','certificate','myBookings','placement','messages','onboarding'] },
]

const globals = [
  { area: 'Information Architecture', read: ['app/lib/shell.ts','app/lib/screens.ts'], focus: 'Navigation structure & grouping across all 4 roles, feature discoverability, predictability of placement, mental models, redundant/duplicate routes (e.g. explore vs marketplace alias), role-gating clarity.' },
  { area: 'Design System', read: ['app/styles/tokens.css','app/styles/app.css','app/styles/screens.css','app/lib/shell.ts'], focus: 'Component & token consistency (buttons, inputs, cards, tables, modals, badges, pills), visual debt, drift between scr-*.ts builders, spacing scale, color usage vs brand (cream #F7F7ED + black #0C0C0C + green #2CAA20 action + gold #F2B814). Grep scr-*.ts for inconsistent class usage.' },
  { area: 'Accessibility WCAG 2.1 AA', read: ['app/styles/tokens.css','app/styles/app.css','app/components/Aula.tsx','app/lib/shell.ts'], focus: 'Contrast ratios from token values, visible focus, keyboard operability of clickable rows/cards/tr (verify [A11Y-*] markers in Aula.tsx hold), modal aria/focus-trap/escape, heading order, form labels, icon-only buttons missing labels. Spot-check 3-4 representative scr-*.ts builders.' },
  { area: 'Simplification (PRIORITY)', read: ['app/lib/screens.ts'], focus: 'Across the WHOLE app: what to ELIMINATE (screens/sections/actions/text nobody would miss), MERGE (consolidate duplicate surfaces), AUTOMATE (manual steps the system could do), SIMPLIFY (reduce workflow steps), HIDE until needed. Apply the disappear-test. This is the highest-priority output.' },
  { area: 'Cognitive Load (Hick/Miller/Fitts/Jakob/Tesler)', read: [], focus: 'Across screens (use the capture doc + a few representative builders you Read): decision complexity, info overload, target sizes, convention breaks, system-absorbable complexity. Flag the worst offenders only.' },
]

function findPrompt(c) {
  return `${CONTEXT}\n\nYou are a senior product/UX reviewer auditing the "${c.area}" cluster of OTR Aula.\nScreens in scope: ${c.screens.join(', ')}.\nRead these source files in full: ${c.files.map(f => REPO + '/' + f).join(', ')}.\nAlso Read the behavioral capture (${CAP}) and app/styles/tokens.css for color/contrast values.\n\n${RUBRIC}\n\nReturn: (1) a per-screen score (0-10) on all 11 axes for EACH screen in scope, and (2) a list of\nfindings. Aim for the real issues — typically 4-12 findings for a large cluster. Severity-rank them.\nEvery finding must name the concrete file (+symbol/selector) where the fix lands.`
}

function globalPrompt(g) {
  const reads = (g.read && g.read.length) ? g.read.map(f => REPO + '/' + f).join(', ') : '(use the capture doc + Read a few representative app/lib/scr-*.ts builders yourself)'
  return `${CONTEXT}\n\nYou are the dedicated reviewer for the cross-cutting dimension: "${g.area}".\nFocus: ${g.focus}\nRead: ${reads}. Also Read the behavioral capture (${CAP}). Grep across app/lib/scr-*.ts as needed.\n\n${RUBRIC}\n\nReturn a short summary and a severity-ranked list of findings, each with a concrete file-tied fix.`
}

function verifyFinding(f, area) {
  return agent(
    `${CONTEXT}\n\nADVERSARIAL VERIFICATION. A reviewer of "${area}" filed this finding:\n${JSON.stringify(f, null, 2)}\n\n` +
    `Your job is to REFUTE it. Read the actual source file named in the finding (under ${REPO}) and the relevant CSS/tokens. ` +
    `Check: does the problem actually exist in the current code? is the cited file/symbol accurate? is it already handled (guard, [A11Y-*] marker, existing class)? is the severity inflated? ` +
    `Default to isReal=false / correctedSeverity="not-a-finding" if you cannot substantiate it in the source. Be strict.`,
    { label: `verify:${f.id}`, phase: 'Verify', schema: VERDICT }
  ).then(v => ({ ...f, verdict: v })).catch(() => ({ ...f, verdict: null }))
}

function verifyStage(res) {
  if (!res) return null
  const hs = (res.findings || []).filter(f => f.severity === 'critical' || f.severity === 'high')
  if (!hs.length) return { ...res, verified: [] }
  return parallel(hs.map(f => () => verifyFinding(f, res.area))).then(v => ({ ...res, verified: v.filter(Boolean) }))
}

log(`Reviewing ${clusters.length} screen-clusters + ${globals.length} cross-cutting dimensions, then adversarially verifying high-severity findings.`)

const clustersP = pipeline(
  clusters,
  c => agent(findPrompt(c), { label: `review:${c.area}`, phase: 'Screen review', schema: CLUSTER_SCHEMA }),
  verifyStage
)

const globalsP = parallel(globals.map(g => () =>
  agent(globalPrompt(g), { label: `global:${g.area}`, phase: 'Cross-cutting', schema: GLOBAL_SCHEMA }).then(verifyStage)
))

const [clusterResults, globalResults] = await Promise.all([clustersP, globalsP])

const cr = clusterResults.filter(Boolean)
const gr = globalResults.filter(Boolean)
const allScores = cr.flatMap(r => r.scores || [])
const allFindings = [...cr, ...gr].flatMap(r => r.findings || [])
const allVerified = [...cr, ...gr].flatMap(r => r.verified || [])
const confirmedHigh = allVerified.filter(x => x.verdict && x.verdict.isReal)
const rejectedHigh = allVerified.filter(x => x.verdict && !x.verdict.isReal)

log(`Done. ${allFindings.length} findings (${allVerified.length} high/critical verified → ${confirmedHigh.length} confirmed, ${rejectedHigh.length} refuted). ${allScores.length} screen scores.`)

return {
  scores: allScores,
  findingCount: allFindings.length,
  findings: allFindings,
  confirmedHigh,
  rejectedHigh,
  clusters: cr.map(r => ({ area: r.area, summary: r.summary || null })),
  globals: gr.map(r => ({ area: r.area, summary: r.summary })),
}
