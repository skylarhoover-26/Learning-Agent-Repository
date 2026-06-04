# AI Academy — Handoff

You are picking up an in-progress AI-learning app for Housecall Pro's ~2,500-person org. This doc tells you what it is, what's built, what's stubbed, and how to keep building.

The whole project — design and code — was prototyped to the point where a learner can land on a personalized home, take a five-minute drill, and admins can approve auto-discovered curriculum updates from a Slack-gated dashboard. The home page is the most-finished surface. The auto-refresh pipeline is real but the "apply the approved patch" step is still a TODO.

---

## 1. Mission

Teach 2,500 HCP employees AI fluency — without the curriculum going stale.

- **Audience:** every HCP employee, segmented into three personas — `non-tech` (Sales/Ops), `tech` (Eng/Data), `leader` (Manager).
- **Core insight from the design chats:** AI ships weekly. Static curriculum dies fast. The product must (a) show a learner where they stand right now and (b) automatically detect when external AI shipments invalidate a lesson and queue a refresh.
- **Two user types:**
  - **Learners** — see the Briefing home, take drills, track their knowledge map.
  - **Content approvers** (gated, small group) — review proposed curriculum changes that the auto-refresh pipeline generates 3×/week.

---

## 2. Tech stack — read this before writing code

```
Next.js  16.2.5     ← non-standard fork, see warning below
React    19.2.4
Prisma   7.8.0      Postgres (Neon / Supabase / Vercel Postgres all fine)
Anthropic SDK 0.95.0  (claude-opus-4-7)
Tailwind 4          (postcss + @tailwindcss/postcss)
lucide-react        icons
Zod      4          API input validation
Open Sans           via next/font in layout.tsx
TypeScript 5
```

**WARNING — Next.js fork.** `AGENTS.md` in the repo root says:

> This is NOT the Next.js you know. This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code.

Treat training-data assumptions about Next 13/14/15 idioms as suspect. When in doubt, open the docs that ship with the installed `next` package.

Deployment target: **Vercel** (cron is configured in `vercel.json`).

---

## 3. Architecture at a glance

```
┌──────────────────────────────────────────────────────────────┐
│  LEARNER SIDE                                                │
│                                                              │
│  /              → BriefingDirection   (production home)      │
│  /onboarding    → Onboarding          (3-question calib)     │
│  /profile       → ProfilePage         (radar + leaderboard)  │
│  /lesson/customer-followups → LessonPlayer (5-step lesson)  │
│                                                              │
│  Profile state: localStorage (lib/profile.ts), NOT API yet.  │
└──────────────────────────────────────────────────────────────┘
                                │
                                │ POST /api/lesson/grade
                                │ GET  /api/lesson/tones
                                ▼
                        ┌──────────────────┐
                        │ Anthropic API    │  claude-opus-4-7
                        │ (lesson-ai.ts)   │  (real if key set,
                        └──────────────────┘   canned fallback)

┌──────────────────────────────────────────────────────────────┐
│  ADMIN SIDE (gated to ~3 approvers)                          │
│                                                              │
│  /admin/curriculum  → AdminRefreshDirection                  │
│                                                              │
│  GET  /api/proposals?status=pending                          │
│  POST /api/proposals/[id]/decision                           │
└──────────────────────────────────────────────────────────────┘
                                │
                                │ approve/reject
                                ▼
                        ┌──────────────────┐
                        │ Slack webhook    │
                        │ (slack.ts)       │
                        └──────────────────┘

┌──────────────────────────────────────────────────────────────┐
│  AUTO-REFRESH PIPELINE — Vercel Cron, 3×/week (Mon/Wed/Fri)  │
│                                                              │
│  GET /api/cron/scan  [Bearer CRON_SECRET]                    │
│       │                                                      │
│       ▼                                                      │
│  scanAllSources()  ← RSS regex parse of 14 sources           │
│       │  (lib/scanner.ts)                                    │
│       ▼                                                      │
│  proposeUpdatesFromFindings()  ← Claude opus-4-7             │
│       │  (lib/curator.ts) → DB: Proposal + ApprovalEvent     │
│       ▼                                                      │
│  notifySlackOnNewProposal()  ← #approvers webhook            │
└──────────────────────────────────────────────────────────────┘
```

---

## 4. The design source of truth

The HTML/JS prototype that drove all UI decisions lives in a handoff bundle from claude.ai/design:

- **Bundle URL:** `https://api.anthropic.com/v1/design/h/vYuSsHc8t4BdfR9x0m76Wg?open_file=AI+Academy.html`
- **Extracted path used during development:** `/tmp/ai-academy-design/ai-learning-app-3/`
- **Re-download:** `curl` the URL → it returns a gzipped tar → `tar -xzf` into a temp dir.

Inside the bundle:
```
README.md                              ← READ THIS FIRST
chats/chat1.md, chat2.md               ← decision provenance — read these
project/AI Academy.html                ← canvas mounting all 13 directions
project/AI Academy (standalone).html   ← solo learner view
project/tokens.css                     ← design tokens (already in globals.css)
project/src/direction-*.jsx            ← 13 direction prototypes
project/src/shared.jsx, Primitives.jsx ← shared shell
```

**13 directions were explored.** Only one is the production home. The rest are alt explorations — useful reference, not shipping work.

### Final picks from the chats (don't relitigate these)

| Direction | Status | Why |
|---|---|---|
| **D13 Briefing** | **Shipped as home** | Hybrid of D1 Studio polish + D9 Heatmap insight. One page that answers: where am I, what changed, what next? |
| D1 Studio | Kept as fallback (`StudioDirection.tsx` still in repo) | Lowest-risk fallback. Best for skeptics. |
| D9 Heatmap | Folded into Briefing as the central truth panel | The mastery×freshness grid IS the diagnostic. |
| D4 Self-assessment | Built (`/onboarding`) but not the gate | Surfaces calibration vs measured skill. Optional. |
| D5 Compass | **Rejected** | Linear "journey" metaphor suggests completion, not "you have to revisit this." |
| D6 Constellation | Visual rejected as "too whimsical for leaders" | Kept graphical layout in spirit but downplayed the astronomy language. |
| D2 Quest, D3 Coach, D7 Halflife, D8 Tides, D10 Toolbelt, D11 Dispatch, D12 Brutalist | Not implemented | Pure exploration. Reference only. |

### Hard accessibility constraints

The chat ended with explicit color-blindness feedback. Briefing implements them — don't undo:

- **Color ramp is CVD-safe.** Cool blue (fresh) ↔ warm orange (stale) — never red/green. See `cellColor()` in `BriefingDirection.tsx`.
- **Shape badges in every cell.** check-circle / minus-circle / alert-triangle / alert-octagon. Meaning carries without color.
- **Diagonal hatching on stale cells.** Persistent, not animated. A second redundant non-color signal.
- **Shimmer only adds emphasis.** Not the only stale indicator.

---

## 5. The production home — Briefing (`src/components/BriefingDirection.tsx`)

The single most important file to understand. ~1100 lines, ported from `direction-briefing.jsx` in the design bundle.

**Layout, top to bottom:**

1. **Greeting row** — name, role label, date, optional XP/streak chips (driven by `gamification` prop).
2. **"Do this now" hero** — the recommendation is **derived from heatmap data**, not picked from a separate list. Algorithm: `highMasteryStale[0] || drifting[0] || skills[0]`. Hero copy mentions the actual cell name + days stale + the AI ship that caused it.
3. **Today's actions** — daily-drill ring (5/wk goal) + a 30-second multiple-choice drill with right/wrong feedback animation.
4. **Knowledge heatmap** — 4 categories (Foundations / Application / Safety / Frontier) × 4 skills. Cells render with mastery-driven saturation + freshness-driven hue. Hover → tooltip with mastery%, freshness%, last-refreshed days. One cell wears a `DO THIS NOW` badge — that's the focus cell.
5. **Diagnostic strip** — three cards (High-value gaps / Mid-mastery sliding / AI shipped this week), counts **derived from the grid data** so they always match.
6. **Where you place** — bell curve over the org (2,500) + dot swarm over the role (380). The "YOU" dot is at index 7 of a deterministic random distribution biased toward "active top performer."
7. **Department leaderboard** — 11 departments, vertical scroll. The user's department (depends on `persona`) is highlighted.
8. **What changed this week** — three role-tuned update cards, each tagged to the heatmap cell it touches.

**Props (all five share across the prototype's tweak panel):**

```ts
accent?: string;       // '#0E6FBE' HCP blue (default) | '#623CC9' AI purple | 'gradient'
gamification?: 'off' | 'light' | 'heavy';
persona?: 'non-tech' | 'tech' | 'leader';
density?: 'cozy' | 'compact';
animation?: 'off' | 'normal';
```

The mock data inside Briefing — `skills` (16), `departments` (11), `updates` (3) — is hardcoded in the component. **Replace these with API calls** when you wire to real data (see §11 Roadmap).

**Briefing-specific keyframes** (`shimmer-cell`, `pulse-strobe-briefing`, `critical-pulse-briefing`, `focus-glow`, `pulse-you`, `arrowUp`) are inlined in a `<style>` tag at the bottom of the component because some reference the runtime accent color. Don't move them to globals.css.

---

## 6. Other UI surfaces

### `/onboarding` (`src/components/Onboarding.tsx`)
Three scenario-based questions, each calibrated to a primary `SkillKey` (privacy, prompting, agents, etc.) with partial credit bleed into related skills. Compares **self-rating** (slider) vs **measured** (quiz answers). Renders the calibration gap on completion. Persists the resulting `Profile` to **localStorage** (see §8).

### `/lesson/customer-followups` (`src/components/LessonPlayer.tsx`)
The only finished lesson. 5-step flow: `Read → Try → Compare → Ship → Reflect`. The "Try" step takes a learner's draft customer message and grades it via `POST /api/lesson/grade`. The "Compare" step calls `GET /api/lesson/tones` to show warm/concise/playful AI variants of the same message. Both API routes call Claude opus-4-7 when `ANTHROPIC_API_KEY` is set, fall back to canned responses otherwise.

The grading target is a fixed HVAC tech note used as the lesson prompt:
```
"cust said AC blowing warm — checked refrig, low — added 2lb 410a — recommended coil clean nxt visit"
```

### `/profile` (`src/components/ProfilePage.tsx`)
Renders the persisted onboarding profile as:
- `ProfileRadar` — 6-skill radar chart (privacy, prompting, comms, agents, eval, data).
- `CalibrationChart` — bar chart of self-rating vs measured per skill, sorted by gap.
- `PersonalLeaderboard` — fake ranking inside the user's role, anchored to a deterministic name pool (Priya M., Devon K., Marcus L., etc.).
- "Retake assessment" CTA → clears localStorage profile.

### `/admin/curriculum` (`src/components/AdminRefreshDirection.tsx`)
**Gated UI for content approvers, not learners.** Currently the dashboard renders hardcoded mock proposals — the real DB-backed list is served at `GET /api/proposals` but the page hasn't been wired to it yet. Status: design-complete, backend-complete, **wiring TODO**.

---

## 7. Shared primitives

`src/components/Shared.tsx` — `HcpAppBar` (top nav with HCP wordmark + tabs), `AnimatedNumber` (eased count-up), `Ring` (SVG progress ring), `XPChip`, `useReveal`, type defs (`Density`, `Animation`, `Persona`, `Gamification`), and `PERSONAS` (the persona → topic/example map used across components).

`src/components/Primitives.tsx` — `Button`, `Chip`, `Avatar`, `Icon` wrapper. All consume CSS classes (`hcp-btn`, `hcp-chip`) defined in `src/app/globals.css`.

`src/app/globals.css` — design tokens (HCP blue, AI purple, gradient, semantic colors, greys), button/chip classes, eyebrow utility, and the cross-component keyframes (float, pulse, shimmer, spin-slow, flicker, pop, shake, slideInUp, progressShine, wobble). Tokens here mirror `tokens.css` in the design bundle — keep them in sync when the design changes.

---

## 8. Data model (`prisma/schema.prisma`)

Postgres, accessed via the Prisma client singleton in `src/lib/db.ts`.

| Model | Purpose | Key fields |
|---|---|---|
| **Learner** | Org employee | email, name, department, persona, xp, streakDays |
| **Track** | Top-level curriculum bucket | slug, title, persona |
| **Module** | Section inside a track | trackId → Track, title, level, body, position |
| **Lesson** | Single lesson page | moduleId → Module, title, body, position |
| **Enrollment** | Per-learner lesson state | learnerId, lessonId, status: `not_started | in_progress | completed` |
| **Attempt** | Submission + score | learnerId, lessonId, score, rubric (JSON) |
| **Source** | External AI news source | name, url, kind: `blog | rss | arxiv | hn | reddit`, lastScan |
| **Finding** | One scraped item | sourceId → Source, externalId, title, url, publishedAt, raw (JSON) |
| **Proposal** | Auto-generated curriculum change | title, type: `NEW MODULE | CONTENT UPDATE | DEPRECATION`, severity, summary, affects, diffAdded/Edited/Removed, confidence, status: `pending | approved | rejected`, patch, decidedAt, decidedBy |
| **ApprovalEvent** | Audit trail for Proposal | proposalId, actor, action: `approved | rejected | edited | flagged | discovered` |
| **ProposalFinding** | M:N join | composite (proposalId, findingId) |

**Important:** Learner records are **not yet wired** to the UI. The Onboarding profile lives in `localStorage` (`lib/profile.ts`). Migration to backend is a Phase 2 task.

---

## 9. Server libs (`src/lib/`)

| File | Purpose | External calls | Stub? |
|---|---|---|---|
| `db.ts` | PrismaClient singleton (hot-reload safe) | Postgres | Real |
| `scanner.ts` | `scanAllSources()` — RSS regex parse of 14 sources (OpenAI blog, Anthropic news, DeepMind, arXiv cs.CL/cs.AI, HuggingFace daily, HN AI, r/LocalLLaMA, …). 15s per-fetch timeout, silent catch, upserts Source + Finding rows. | HTTP GET to feeds | **Real** but minimalist regex parser — replace with a real RSS lib if a feed breaks |
| `curator.ts` | `proposeUpdatesFromFindings(findings)` — sends findings to Claude opus-4-7 with existing curriculum titles, parses JSON proposals, writes Proposal + ApprovalEvent rows. Returns `[]` on parse failure. | Anthropic | Phase-1 stub — works end-to-end but the prompt is simple |
| `slack.ts` | `notifySlackOnNewProposal(p)` / `notifySlackOnDecision(p, decision, actor)` posts to `SLACK_APPROVERS_WEBHOOK_URL`. Approver handles `@brian.wells`, `@skylar`, `@bridget` are hardcoded — **change these.** | Slack incoming webhook | Real, but silent skip if webhook env not set |
| `profile.ts` | localStorage-backed Profile: `loadProfile()`, `saveProfile()`, `clearProfile()`, `recommendNextLesson(p)`, `orgPercentile(p)`. Hand-tuned `roleWeight` matrix per role × skill. | None (browser) | Real for demo; **migrate to DB-backed** for prod |
| `lesson-ai.ts` | `gradeMessage(input)` + `generateTones()` — Claude opus-4-7 if key set, canned fallback otherwise. Hardcoded HVAC TECH_NOTE prompt. | Anthropic | Real with fallback |

---

## 10. API routes (`src/app/api/`)

| Route | Method | Purpose | Auth |
|---|---|---|---|
| `/api/cron/scan` | GET | Vercel Cron → scan + curate + Slack notify. Returns `{ scanned, proposed }`. `maxDuration: 300s`. | Bearer `CRON_SECRET` |
| `/api/cron/scan` | POST | Admin manual trigger | **NONE YET — Phase 2 TODO** |
| `/api/lesson/grade` | POST | Grade a customer-followup draft. Zod body: `{ message: string (1..2000) }` → `Grade` | None (demo) |
| `/api/lesson/tones` | GET | Return 3 tone variants of the HVAC message | None |
| `/api/proposals` | GET | List proposals. Query: `?status=pending` (default). Includes related Finding/Source. | None (demo) — gate before prod |
| `/api/proposals/[id]/decision` | POST | Approve/reject. Zod body: `{ decision: 'approved' \| 'rejected', actor: email, note? }`. Updates Proposal, logs ApprovalEvent, fires Slack. | None (demo) |

**Phase 2 must-do:** add auth on every route except `/api/cron/scan` GET (which is already Bearer-gated).

---

## 11. Auto-refresh pipeline — end-to-end

The "curriculum that updates itself" feature. Designed for 3×/week cadence to balance freshness with reviewer load.

**Vercel Cron** triggers `GET /api/cron/scan` every Mon/Wed/Fri at 13:00 UTC (`0 13 * * 1,3,5` in `vercel.json`).

1. **Scan.** `scanAllSources()` fetches each feed in parallel (15s timeout per), regex-parses items, upserts new Findings keyed on `externalId`.
2. **Curate.** `proposeUpdatesFromFindings(findings)` sends new Findings + current curriculum titles to Claude opus-4-7. Claude returns a JSON list of proposed curriculum changes (NEW MODULE / CONTENT UPDATE / DEPRECATION) with severity, confidence, affected modules, diff counts, and a `patch` string. We write a `Proposal` + a `discovered` `ApprovalEvent` per item.
3. **Notify.** `notifySlackOnNewProposal(p)` posts a card to `#approvers` with title, type, severity, confidence, source citations, and an approve/edit/reject deep-link to `/admin/curriculum`.
4. **Review.** An approver opens `/admin/curriculum` (gated UI — gate is **not yet implemented** at the route level), reads the proposal + sources + diff, decides.
5. **Decide.** `POST /api/proposals/[id]/decision` updates status, logs an ApprovalEvent, pings Slack.
6. **Apply.** **TODO.** The decision endpoint contains a comment `// apply patch when approved (Phase 2)`. Approved proposals currently just sit at status `approved` — nothing rewrites curriculum content yet.

**Closing this loop is the most valuable next deliverable.** See Roadmap.

---

## 12. Setup

### Prerequisites
- Node 20+ (Next 16 requires it)
- A Postgres database — Neon's free tier is enough for demo/staging
- An Anthropic API key
- A Slack incoming webhook (or skip — the code silently no-ops without one)

### First-time setup

```bash
git clone <repo>             # NB: repo is not currently under git — see §15
cd ai-academy
npm install
cp .env.example .env         # then fill in values
```

`.env` keys (all required for full functionality; UI loads without them):
```
DATABASE_URL=postgresql://user:pass@host:5432/aiacademy
ANTHROPIC_API_KEY=sk-ant-...
SLACK_APPROVERS_WEBHOOK_URL=https://hooks.slack.com/services/...
APP_URL=https://aiacademy.example.com
CRON_SECRET=<long random string Vercel Cron sends as Bearer>
```

### Database

```bash
npx prisma migrate dev       # apply schema
npx prisma generate          # client
npx tsx prisma/seed.ts       # seed if seed file exists
```

### Dev

```bash
npm run dev                  # http://localhost:3000
```

You'll see the **Briefing** home immediately. With no DB/Anthropic keys, the Briefing renders fine (it's hardcoded mocks), but `/lesson/customer-followups` falls back to canned grading and `/admin/curriculum` is empty if you wire it to `/api/proposals`.

### Manual scan trigger (after env is set)

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  http://localhost:3000/api/cron/scan
```

### Deploy
Push to a Vercel project. Add the five env vars in Vercel project settings. Cron picks up `vercel.json` automatically.

---

## 13. What's REAL vs what's STUBBED

### Real and working
- Briefing home, all visuals + animations + accessibility treatment.
- Onboarding 3-question calibration → localStorage profile → radar/leaderboard/calibration chart.
- Lesson Player 5-step flow with real Claude grading + tone variants.
- Scanner pulling from 14 RSS-ish feeds.
- Curator generating proposals from findings via Claude.
- Slack notifications (with caveat that approver handles are placeholders).
- Vercel Cron schedule on `vercel.json`.
- Prisma schema covers everything the pipeline needs.
- Token system + globals.css matches the design bundle's `tokens.css`.

### Stubbed / Mocked / TODO
- **Briefing data is hardcoded** — 16 skills, 11 departments, 3 weekly updates. No API to feed it real per-learner mastery×freshness yet.
- **Profile is localStorage-only.** Move to DB-backed Learner record.
- **AdminRefreshDirection UI is not wired to `/api/proposals`** — currently shows hardcoded mock proposals.
- **Approved proposals don't apply their patch.** `decision` endpoint has the TODO comment.
- **No auth anywhere except `/api/cron/scan` GET.** Add SSO/role check before exposing `/admin/*` or proposal mutation routes.
- **Slack approver handles are placeholder names** (`@brian.wells`, `@skylar`, `@bridget`). Move to env or DB.
- **Only one lesson exists** (`customer-followups`). Track/Module/Lesson tables are designed for many — the curriculum just isn't seeded yet.
- **Tweaks panel** (the design's accent/persona/density/gamification chooser) is not ported. Briefing accepts the props but the runtime UI defaults to one config. Add a per-org or per-user setting if you want it.
- **No tests.** No `npm test` script. No CI.

---

## 14. Roadmap — recommended order

1. **Initialize git** and push to your hosted repo. The directory has no `.git` yet — preserve history from this point forward.
2. **Add auth** to `/admin/*` and `/api/proposals/*`. Use HCP SSO if available; minimum, an env-gated approver email allowlist.
3. **Wire AdminRefreshDirection to `/api/proposals`.** Replace the mock array with a `fetch('/api/proposals')` call. The component already has the right shape (`Proposal` type matches).
4. **Implement the "apply patch" step** in `POST /api/proposals/[id]/decision`. Closes the auto-refresh loop. The simplest version: when `decision === 'approved'`, parse `proposal.patch` as a diff/replacement and update the Module/Lesson body in a transaction.
5. **Move Profile to DB.** Replace `lib/profile.ts` localStorage IO with API calls to a new `/api/profile` route backed by the Learner table. Onboarding writes there; Briefing reads from there.
6. **Replace Briefing's hardcoded skills/departments/updates** with API data. Add `/api/learner/me/heatmap`, `/api/learner/me/leaderboard`, `/api/updates?for=role`. Keep the same shape — Briefing's render code is already general.
7. **Seed real curriculum.** Track/Module/Lesson tables exist; populate them.
8. **Replace placeholder Slack handles** with real ones (env or DB).
9. **Run a real scan in prod.** Confirm Findings land in the DB, Proposals get generated, Slack delivers, decisions persist.
10. **More lessons.** Customer-followups is one. The Track table is built for many — pick the top 5 from each persona.

---

## 15. Known gotchas

- **The directory is not a git repo.** Run `git init && git add . && git commit -m 'initial handoff state'` before doing any work. There's no history to lose, but everything you write from here on should be tracked.
- **`AGENTS.md` says read Next.js docs from `node_modules`.** This is a non-standard Next.js fork. Don't trust LLM training data on Next idioms — verify in the installed package docs.
- **Briefing's animated XP ticker uses `setInterval`** — if you SSR this component aggressively or wrap in Suspense, double-check the `useEffect` cleanup behaves.
- **The cell color function in Briefing is hand-tuned** (`cellColor()`). It was iterated on for colorblind accessibility — don't replace with a standard library palette without re-validating against deuteranopia/protanopia/tritanopia.
- **Image warning in dev:** the layout uses `<Image>` with the HCP wordmark and the dev server complains about width-without-height. Pre-existing; safe to fix later by adding `style={{ width: 'auto' }}`.
- **`prisma.config.ts` is custom** — Prisma 7 supports a TS config. Don't accidentally introduce a `prisma` section in `package.json`; it will conflict.
- **Briefing keyframes are inlined** in the component because they reference the dynamic `accentColor`. Don't be tempted to move them into globals.css — they need template-literal interpolation.

---

## 16. File map

```
ai-academy/
├── AGENTS.md                                   ← read first; Next.js fork warning
├── CLAUDE.md                                   → @AGENTS.md
├── HANDOFF.md                                  ← this doc
├── README.md                                   create-next-app default; ignore
├── .env.example                                ← copy to .env, fill values
├── next.config.ts                              empty stub
├── next-env.d.ts                               auto-generated
├── package.json                                deps + dev/build/start scripts
├── postcss.config.mjs                          tailwind v4
├── tsconfig.json                               strict TS
├── prisma.config.ts                            seed runner: `tsx prisma/seed.ts`
├── prisma/
│   └── schema.prisma                           ← data model — §8
├── public/
│   └── (HCP logo SVGs etc.)
├── vercel.json                                 cron: 0 13 * * 1,3,5
└── src/
    ├── app/
    │   ├── layout.tsx                          Open Sans, root metadata
    │   ├── globals.css                         tokens + button/chip classes + keyframes
    │   ├── page.tsx                            → <BriefingDirection />  (HOME)
    │   ├── onboarding/page.tsx                 → <Onboarding />
    │   ├── profile/page.tsx                    → <ProfilePage />
    │   ├── lesson/customer-followups/page.tsx  → <LessonPlayer />
    │   ├── admin/curriculum/page.tsx           → <AdminRefreshDirection />
    │   └── api/
    │       ├── cron/scan/route.ts              GET (Bearer), POST (no auth yet)
    │       ├── lesson/grade/route.ts           POST → Claude
    │       ├── lesson/tones/route.ts           GET → Claude
    │       ├── proposals/route.ts              GET (list)
    │       └── proposals/[id]/decision/route.ts POST (approve/reject)
    ├── components/
    │   ├── BriefingDirection.tsx               ← PRODUCTION HOME — §5
    │   ├── StudioDirection.tsx                 D1 fallback; routed off but kept
    │   ├── AdminRefreshDirection.tsx           admin proposals UI (mock data — wire to /api/proposals)
    │   ├── Onboarding.tsx                      3-question calibration
    │   ├── LessonPlayer.tsx                    5-step lesson, Claude-graded
    │   ├── ProfilePage.tsx                     radar + leaderboard + calibration
    │   ├── ProfileRadar.tsx                    SVG radar chart
    │   ├── CalibrationChart.tsx                self vs measured bar chart
    │   ├── PersonalLeaderboard.tsx             role-rank UI with deterministic names
    │   ├── WhatsNewWidget.tsx                  3 hardcoded role-tuned news cards
    │   ├── Shared.tsx                          HcpAppBar, AnimatedNumber, Ring, useReveal, PERSONAS, type defs
    │   └── Primitives.tsx                      Button, Chip, Avatar, Icon
    └── lib/
        ├── db.ts                               Prisma singleton
        ├── scanner.ts                          14-source RSS scan
        ├── curator.ts                          Claude-driven proposal generation
        ├── slack.ts                            approver webhook
        ├── profile.ts                          localStorage profile + role/skill matrix
        └── lesson-ai.ts                        Claude grader + tone generator
```

---

## 17. Quick test plan after onboarding to the repo

1. `npm install && cp .env.example .env` and fill in at least `DATABASE_URL` + `ANTHROPIC_API_KEY`.
2. `npx prisma migrate dev`.
3. `npm run dev` and open `http://localhost:3000` — confirm Briefing renders.
4. Open `/onboarding`, answer 3 questions, confirm `/profile` shows your radar.
5. Open `/lesson/customer-followups`, submit a draft message, confirm Claude grades it (or you see the canned fallback).
6. Trigger scan: `curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/scan` and check the DB for new `Finding` + `Proposal` rows.
7. `GET /api/proposals?status=pending` should now return those proposals.

If all six pass, the pipeline is healthy and you're ready to start picking up §14 Roadmap items.

---

## 18. Original design intent — one paragraph

The product is a bet that AI fluency is the new literacy for service businesses, and the only sustainable way to teach it is to admit that the curriculum will go stale every 1-2 weeks. So instead of writing a "course," we built a system that watches what AI ships, scores how those shipments invalidate what an employee knows, surfaces the highest-value gap as the daily lesson, and routes proposed updates through a small set of approvers before they hit learners. The Briefing home makes that promise visible — every cell in the heatmap is a real bet that "you used to know this" and every shimmer is "and the world moved." Keep that load-bearing.
