# AI Learning Coach

Housecall Pro's internal AI learning platform — personalized lessons, games,
prompts, an AI coach, progress tracking, and manager/admin reporting.

**Live app:** [learning-agent-pearl.vercel.app](https://learning-agent-pearl.vercel.app)
**Stack:** Next.js (App Router) · React · Tailwind CSS · Vercel (hosting + Blob storage) · n8n (Snowflake/Slack automations) · Anthropic Claude (lesson/content generation)

---

## What's in this repo

Everything at the root is either application code, a config file the framework
needs, or this README. Project notes and exports live under `docs/` and `n8n/`.

| Item | What it is |
| --- | --- |
| **`app/`** | The application itself (Next.js App Router). Each subfolder is a page/route — e.g. `app/reporting/`, `app/lesson/`, `app/games/`, `app/admin/`. `app/api/` holds the backend routes. `app/page.jsx` is the home page, `app/layout.jsx` the shared shell. |
| **`components/`** | Reusable React UI pieces shared across pages (e.g. `sidebar.jsx`, `report-view.jsx`, `compare-view.jsx`, `searchable-select.jsx`). |
| **`lib/`** | Non-UI logic: data access, auth, reporting rollups, AI calls, content, gamification. See the breakdown below. |
| **`scripts/`** | Helper scripts. `deploy-prod.sh` is the verified production deploy (run via `npm run deploy:prod`). |
| **`n8n/`** | Exported [n8n](https://n8n.io) workflow definitions (Snowflake org pull, Slack notifications, manager-dashboard + daily-digest webhooks). Reference copies of the automations that feed the app. |
| **`prototypes/`** | Early standalone prototypes (Brian's, Rachel's) kept for reference only. **Not** part of the live app. |
| **`docs/`** | All project documentation — backlog, feedback, deleted-feature notes, dated handoffs (`docs/handoffs/`), and QA scripts/results (`docs/qa/`). |
| **`CLAUDE.md`** | Rules for the AI assistant (Claude Code) — how to deploy, the pre-push checklist, and what never to do. |
| **`README.md`** | This file. |
| **`auth.js`, `middleware.js`** | Authentication setup and request middleware. Next.js requires these at the root — don't move them. |
| **Config files** | `next.config.mjs`, `package.json`, `vercel.json` (incl. cron schedules), `tailwind.config.mjs`, `postcss.config.mjs`, `jsconfig.json`, `.gitignore`. Build/deploy depend on these living at the root. |

### Inside `app/`

- **Learner pages:** `discover/`, `library/`, `games/`, `chat/`, `lesson/`,
  `prompts/`, `daily/` (Today's Pick), `modules/`, `quick-win/`.
- **Progress pages:** `achievements/`, `calibration/`, `heatmap/`,
  `leaderboard/`, `growth/`, `my-impact/`, `my-role/`, `my-tasks/`, `my-tools/`.
- **Manager/admin:** `manager/` (team dashboard), `reporting/` (org-wide
  reporting), `admin/` (admin hub).
- **Onboarding:** `onboarding/`, `getting-started/`, `auth/`.
- **`app/api/`:** backend routes — reporting (`api/reporting/`), admin checks,
  manager/org data, AI generation, and scheduled cron jobs (see `vercel.json`).

### Inside `lib/` (grouped)

- **Auth & access:** `auth-helpers.js`, `admin.js`, `manager-data.js` (also the
  manager check), `menu-catalog.js`.
- **Reporting:** `reporting.js` (builds + caches the org report),
  `report-metrics.js` (per-group/compare math), `activity-labels.js`,
  `audit-log.js`.
- **AI & content:** `ai.js`, `ai-tools.js`, `prompts-data.js`, `modules-data.js`,
  `daily-lessons.js`.
- **Gamification & state:** `level-curve.js`, `paused-lessons.js`,
  `sync-store.js`, and the various `*-store.js` blob helpers.

---

## How it all works (for non-developers)

- **Git** connects your terminal to GitHub — how you clone, push, and pull code. (Pre-installed on Mac; Windows users install it from [git-scm.com](https://git-scm.com).)
- **Node.js** runs the app's code. It comes with **npm**, which downloads the libraries the app depends on. Install from [nodejs.org](https://nodejs.org).
- **Vercel** is connected directly to this GitHub repo. You don't touch Vercel — it automatically builds and deploys whenever code is pushed to `main`.

## One-time setup

You only need to do these once on your computer.

1. Install [Git](https://git-scm.com) (Windows only — Mac has it built in) and [Node.js](https://nodejs.org).
2. Clone the repo (downloads a copy to your computer):
   ```
   git clone https://github.com/skylarhoover-26/Learning-Agent-Repository.git
   ```
3. Go into the project folder:
   ```
   cd Learning-Agent-Repository
   ```
4. Install dependencies:
   ```
   npm install
   ```

## Running it locally (optional)

```
npm run dev
```
Then open the URL it prints (usually `http://localhost:3000`).

## Making changes and deploying

All commands run in your terminal, from inside the project folder.

1. Pull the latest code first:
   ```
   git pull origin main
   ```
2. Make your edits in your editor (e.g. VS Code).
3. Stage and commit your changes:
   ```
   git add .
   git commit -m "Brief description of your change"
   ```
4. Push to GitHub (this triggers Vercel to rebuild and deploy):
   ```
   git push origin main
   ```
5. Wait 1–2 minutes for Vercel to finish. Changes go live at
   [learning-agent-pearl.vercel.app](https://learning-agent-pearl.vercel.app).

> For the verified deploy with safety checks, use `npm run deploy:prod` instead
> of a manual Vercel command. See **`CLAUDE.md`** for the full pre-push checklist.

---

## Notes

- **Environment variables** (Snowflake/n8n webhook URLs, Vercel Blob token, Okta
  SSO keys, `CRON_SECRET`, Anthropic key) are configured in the Vercel project
  settings, not in this repo. Anything reading `process.env` needs its variable
  set in Vercel → Production.
- **Scheduled jobs** are defined in `vercel.json` (`crons`) — e.g. the daily
  reporting refresh and the daily curriculum/lesson generation.
- **Project history & plans** live in `docs/` (backlog, handoffs, deleted
  features) if you need context on why something exists.
