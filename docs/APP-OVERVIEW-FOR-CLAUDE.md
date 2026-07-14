# AI Learning Coach — Full App Overview (context primer for Claude chat)

> Paste or upload this file at the start of a Claude.ai conversation so Claude
> understands how the app works end to end. It describes **what the app does**,
> **how a user moves through it**, and **how it's built** — no need to read the
> whole codebase.

---

## 1. What it is

**AI Learning Coach** (repo/package name: `ai-learning-platform`) is Housecall
Pro's internal web app for helping employees build practical AI skills. It
delivers personalized lessons, hands-on games, a prompt library, an AI coach
chat, progress/XP tracking, skill calibration, and manager/admin reporting.

- **Live app:** https://learning-agent-pearl.vercel.app
- **Audience:** Housecall Pro employees (login required via Okta SSO), plus a
  manager view and an admin hub.
- **Core idea:** meet each employee where they are (role, tools they use,
  self-assessed skill), then coach them in *their own* AI tool (e.g. Gemini,
  ChatGPT) rather than locking them into an in-app chatbot.

## 2. Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js (App Router), React, JavaScript (not TypeScript) |
| Styling | Tailwind CSS (dark-mode + accessibility themes supported) |
| Hosting | Vercel (auto-deploys on push to `main`) |
| Data | Supabase (Postgres) as primary store, with Vercel Blob as a fallback/safety net |
| Auth | Okta SSO via Auth.js (NextAuth); 8-hour sliding session |
| AI | Anthropic Claude (all lesson/quiz/coach/scenario generation) |
| Automation | n8n workflows (Snowflake org-data pull, Slack notifications, manager digest) |
| TTS | Edge / browser voices for narrated lessons |

## 3. The user journey (start to finish)

1. **Login (Okta SSO).** Auth is required for everyone. Session lasts 8 hours
   (sliding). Auth lives in `auth.js` + `middleware.js`.
2. **Onboarding.** New users get a profile prefilled from Snowflake (name, role,
   department, manager) via `/api/me/profile-prefill`, shown as a confirmation
   card they adjust. They also pick the AI tool(s) they use (`preferred_tool`).
3. **Calibration gate.** Before using the app, a user completes a required
   full-screen **calibration** flow (self-rating + AI-scored scenarios) that
   establishes a starting skill/AI-impact baseline (`calibrated_at` flag). It
   refreshes non-blocking every ~6 weeks. Later reachable as "My Calibration."
4. **Home.** A two-zone homepage: a "Find AI" hero (describe your work → get AI
   opportunities), Today's Pick, quick actions, live level/streak badges, a home
   leaderboard, and a live sources feed. Sidebar sections can be toggled per-user
   by admins ("Coming soon" if off).
5. **Learn.** Users pick a topic and go through an AI-generated **lesson**
   (plan → teach steps → Q&A → quiz → next steps), can **refine/regenerate** if
   the topic is too vague/broad, and earn **XP**. Content is deliberately
   ordered easy→hard everywhere.
6. **Practice & explore.** Games (each with a start screen + XP once per
   content-day), a categorized Library of use cases, a Prompts library, Modules,
   Daily lessons ("Today's Pick"), Quick Wins, and Discovery.
7. **Coach.** A "Just Chat" AI coach and a "Find AI" opportunity finder. The app
   nudges users to run prompts in their own external LLM window
   (`open-llm-window`, `llm-window-callout`).
8. **Track progress.** XP/levels, streaks (counts all activity), achievements,
   a knowledge **heatmap**, a **leaderboard** (podium + "Near me / All" toggle),
   growth, "My Impact," "My Role," "My Tasks," "My Tools."
9. **Managers** see a team dashboard (`/manager`) with team scores and
   calibration insights, fed by an n8n webhook.
10. **Admins** get an admin hub (`/admin`): menu visibility toggles, profile
    visibility controls, curriculum pipeline, audit log, and org-wide reporting.

## 4. Architecture map

```
app/                Next.js App Router — one folder per page/route
  page.jsx          Home
  layout.jsx        Shared shell (sidebar, theme, auth gate)
  lesson/ games/ library/ prompts/ chat/ discover/ daily/ modules/ quick-win/
  calibration/ heatmap/ leaderboard/ achievements/ growth/
  my-impact/ my-role/ my-tasks/ my-tools/
  onboarding/ getting-started/ auth/
  manager/          Team dashboard
  reporting/        Org-wide reporting
  admin/            Admin hub
  api/              Backend routes (see below)

components/         ~70 reusable React UI pieces (sidebar, report-view, etc.)

lib/                Non-UI logic:
  ai.js             ALL Claude prompt-building + generation (lessons, quizzes,
                    coach chat, discover, calibration scenarios, impact scores,
                    video scripts, tool recommendations…)
  supabase.js / supabase-store.js   Primary Postgres data access
  blob-store.js + *-store.js        Vercel Blob fallback + per-domain stores
  auth-helpers.js, admin.js, manager-data.js   Access control
  reporting.js, report-metrics.js   Reporting rollups + compare math
  menu-catalog.js, menu-visibility.js   Sidebar config (single source of truth)
  level-curve.js, difficulty.js, badges.js, progression.js   Gamification
  ai-tools.js       BYO external-tool coaching (Gemini default, etc.)

auth.js, middleware.js   Okta SSO + request gating (must stay at repo root)
vercel.json         Cron schedules
n8n/                Exported n8n workflow definitions (reference copies)
docs/               Backlog, handoffs, QA, migration plans (project history)
```

### Key API routes (`app/api/`)
`auth`, `me` (profile/prefill), `identity`, `chat`, `discover`, `lesson`,
`daily-lessons`, `curriculum`, `games`, `prompts`, `modules`, `calibration-scenarios`,
`impact-score`, `scoring`, `skill-levels`, `leaderboard`, `team-scores`,
`manager-data` / `manager-check` / `manager-lookup`, `reporting`, `admin` /
`admin-check`, `menu-visibility`, `profile-visibility`, `tools` / `ai-tools`,
`notifications`, `tts`, `track` (activity), `audit-log`, `slack`,
`daily-digest`, `xp-reset-epoch`.

## 5. Data model & flow

- **Primary store:** Supabase Postgres (project keyed per env). `supabase-store.js`
  exposes `readDoc(email, dataType)`, `mirrorSave(...)`, leaderboard totals via a
  `leaderboard_totals()` RPC, and profile metadata maps. Reads fall back to Blob.
- **Fallback:** Vercel Blob (kept as a safety net; there are two blob stores —
  the real data lives in `learning-agent-blob`).
- **Org data source:** Snowflake (`production.namely.people_vw` + `profiles`) is
  pulled via n8n to prefill profiles and power manager/reporting rollups.
- **Identity key:** a user's **email** is the primary key across stores.
- **XP model:** local-first (client), with blob/Supabase as backup — logout must
  never wipe local XP keys or it re-grants the welcome bonus.

## 6. AI usage (all through `lib/ai.js` → Anthropic Claude)

Everything generative funnels through `lib/ai.js`, which builds a system prompt
tailored to the learner's profile and calls Claude. Functions include:
lesson plan/teach/Q&A/quiz generation, coach + help + discover replies,
suggested topics & daily prompts, calibration scenarios, AI-impact scoring
(self-vs-measured), tool recommendations/descriptions, topic clarification &
refinement, and video/quest scripts.

> **Gotcha:** LLM API routes must set `export const maxDuration = 120` or they
> time out silently. Config-reading GET routes need `export const dynamic =
> 'force-dynamic'` or Next caches stale admin settings.

## 7. Scheduled jobs (Vercel cron — `vercel.json`)

- `POST /api/curriculum/daily` — daily at **08:00 UTC** (generate daily
  curriculum/lessons).
- `POST /api/reporting/refresh` — daily at **06:00 UTC** (rebuild + cache the
  org report).
Both are protected by a `CRON_SECRET`.

## 8. Deploy & environment

- Push to `main` → Vercel auto-builds and deploys to
  `learning-agent-pearl.vercel.app`. Preferred: `npm run deploy:prod` (runs the
  verified deploy script + pre-push checks).
- **Env vars live in Vercel project settings, not the repo:** Anthropic key,
  Supabase keys, Snowflake/n8n webhook URLs, Vercel Blob token, Okta SSO keys,
  `CRON_SECRET`. Anything reading `process.env` needs its var set in Vercel →
  Production. (Note: Vercel "Sensitive" vars return blank on `vercel env pull` —
  verify secrets via a runtime health check, not local pull.)

## 9. Glossary of app-specific terms

- **Calibration** — the required baseline flow (self-rating + AI-scored
  scenarios) that seeds a user's skill and AI-impact level.
- **AI Impact** — an AI-synthesized score of how much AI is affecting a user's
  work, with a "why" and self-vs-measured comparison.
- **Content-day** — the unit that caps once-per-day XP for repeatable content
  (games, daily lessons).
- **BYO tool** — the app coaches users in their own external AI tool rather than
  an in-app-only chatbot.
- **Menu visibility** — admins can hide sidebar sections/items per audience;
  hidden = "Coming soon" for regular users, admins exempt.
```
