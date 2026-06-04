# AI Learning Platform — Consolidated Backlog

**Last updated:** 2026-06-04
**Project:** AI Learning Platform (learning-agent repo)
**Sources:** Bridget's prototype (foundation), Rachel's AI Coach prototype (Slack bot + scoring + curriculum)

---

## Bridget — Remaining Items

These are features from Bridget's original build that have **not yet been implemented** or are **only partially complete** in the current app.

### B1. Supabase Database (Persistent Backend) — Critical

- **Original:** Bridget had a complete Supabase schema (`supabase/schema.sql`)
- **Status:** Not connected. All data lives in browser cookies (profile) and localStorage (quests, reviews, library usage, XP, lesson history, badges). Persists within a single browser but is **not synced across devices** and is lost if storage is cleared.
- **What's needed:** Supabase project setup, schema migration, API routes read/write from DB instead of localStorage, data seeding for demo
- **Priority:** **Critical blocker** for multi-device and team-wide features. Single-browser usage works with localStorage for now.
- **Note:** All localStorage data shapes were designed to map cleanly to database tables. Rachel's Supabase schema (see R1) covers user profiles, curricula, module progress, and companion sessions — merge both schemas.

### B2. Skill Graph Visualization — Low

- **Original:** Bridget had a more complex skill graph showing relationships between skills and learning paths
- **Status:** Replaced by Brian's knowledge heatmap (4x4 grid), which is simpler. Covers mastery levels but not skill relationships or learning path visualization
- **What's needed:** Graph/tree visualization showing skill dependencies and recommended learning sequences, integration with learner progress data
- **Priority:** Nice-to-have. The heatmap covers the core need; a graph would add depth for power users

---

## Bridget — Completed / Skipped

| Item | Status |
|------|--------|
| Voice Mode (TTS for Lessons) | **DONE** — 2026-06-04, Web Speech API |
| Content Pipeline (Admin Lesson Creation) | **DONE** — 2026-06-04, curated lessons tab on `/admin` |
| Gamification — Real-Time Progression | **DONE** — 2026-06-04, XP/badges/levels/streaks (localStorage) |
| Learner Profile — Full Data Model | **DONE** — 2026-06-04, lesson history + XP events + badges (localStorage) |
| Quest System (Expanded) | **DONE** — 2026-06-04, 10 quests with multi-step walkthroughs (localStorage) |
| Spaced Repetition (SM-2) | **DONE** — 2026-06-04, 20 review cards, 4 categories (localStorage) |
| Use Case Library (Full Dataset) | **DONE** — 2026-06-04, 30 use cases + usage tracking (localStorage) |
| OpenAI / DALL-E Image Generation | **SKIPPED** — platform uses Claude; Lucide icons + emojis suffice |

---

## Rachel — New Items from AI Coach Prototype

Rachel's "AI Coach" prototype is a Slack-first learning system with a web dashboard, built around a 20-department curriculum, AI-scored competency tracking, and manager scoring. These items bring features not yet in the current platform.

### R1. Supabase Schema (Rachel's Version) — Critical

- **What it is:** Ready-to-run SQL schema covering `user_profiles`, `curricula`, `module_progress`, `companion_sessions` with RLS policies
- **Status:** Schema file exists (`supabase-schema.sql` in Rachel's project) but not deployed
- **What's needed:** Merge with Bridget's data model (add quest_progress, review_card_state, library_usage, xp_events, badges tables). Add the missing competency scoring fields (see R3). Add the missing `increment_question_count` RPC function.
- **Priority:** Merge into B1 — this gives us a head start on the Supabase migration

### R2. Slack Bot — High

- **What it is:** Full Slack bot (`bot.js`, ~1,300 lines) with:
  - Conversational onboarding: 6 scored questions, personalized by department/sub-team/top 3 tasks
  - Module delivery (Modules 1–3 complete) with compliance warnings for Legal/Risk/Finance/BizSolutions
  - Games: "Spot the Bad Prompt" (5 rounds) and "AI Trivia" (5 questions)
  - Weekly challenges with personalized prompts
  - 6-week check-in flow that re-scores and updates the dashboard
  - Companion mode: free-form AI Q&A in DMs
  - Channel mention support for quick answers
- **Status:** Fully built but uses in-memory state (Map objects). Two bot implementations exist: `bot.js` (Socket Mode, 20-dept curriculum) and `lib/bot.js` (HTTP mode for Next.js, simpler 8-bucket roles). Need to reconcile.
- **What's needed:** Pick one architecture (recommended: keep root `bot.js` curriculum + scoring, wire to Supabase, retire `lib/bot.js`). Slack app approval from IT is pending. Icon needs resize to 512x512 PNG.
- **Priority:** High — meets users where they already work. Biggest adoption driver.

### R3. AI Impact Competency Scoring (P/T/O/D) — High

- **What it is:** Four-dimension scoring framework using Claude AI:
  - **P**ersonal Impact: individual AI usage and output (1–5)
  - **T**eam Impact: sharing AI skills and coaching team (1–5)
  - **O**rg Impact: AI practices beyond immediate team (1–5)
  - **AI D**evelopment: depth of AI knowledge and experimentation (1–5)
- **Implementation:** `scoring.js` uses Claude Haiku for fast, low-cost integer scoring of free-text answers. Self-scores (S) from bot onboarding + 6-week check-ins. Manager scores (M) entered via dashboard.
- **Status:** Scoring logic complete. Schema needs columns added (see R1). Score display exists in static HTML only (see R5).
- **What's needed:** Add scoring fields to Supabase schema, integrate scoring into the web app's lesson/onboarding flow, wire check-in flow
- **Priority:** High — this is the measurement layer that connects learning to business impact

### R4. 20-Department Curriculum + Quick Wins — High

- **What it is:** `curriculum.js` (~700 lines) with:
  - 20 departments, 4 have sub-teams (BizSolutions, CS, Engineering, Risk)
  - 6–8 tasks per department shown as selectable buttons
  - Sub-team-specific task priority reordering
  - ~60 QUICK_WINS entries mapping dept+task → quick win description + copy-paste Gemini prompt + "what you'll get"
  - `HIGH_COMPLIANCE_DEPTS` array for extra data safety warnings
  - `getTaskList()` and `getModulePlan()` helpers
- **Status:** Complete in Rachel's codebase. Current platform has no department-level personalization.
- **What's needed:** Port curriculum data into the platform. Adapt Gemini prompt references to Claude. Integrate department/task selection into onboarding or profile setup.
- **Priority:** High — personalization is what makes this feel relevant to each learner vs generic training

### R5. Manager Dashboard + AI Impact Competencies Table — Medium

- **What it is:** Full dashboard UI in `dashboard-v2.html` (static HTML, HCP brand colors):
  - **Learner view:** stat cards, AI proficiency level bar (Beginner→Expert), 5-module progress, topic chips, activity feed, privacy banner
  - **Manager view:** team table with name/role/level badge/progress bar/status (On Track / Not Started / Needs Nudge / Completed)
  - **AI Impact Competencies table:** 4 dimensions (P/T/O/D) per team member, S and M scores shown as color-coded dot pairs (1=red, 2=orange, 3=yellow, 4=green, 5=purple)
  - Overall AI Impact level badges: Low (Blue 25 #9BCBEB), Medium (Classic Blue #009FDA), High (Cyber Blue #0055FF)
  - "Rate Team" button with inline score pickers and Save/Cancel
- **Status:** Fully designed in static HTML/CSS. Not yet implemented as React/Next.js components.
- **What's needed:** Build as React components. Create `/manager` page (role-gated). Build `pages/api/manager-scores.js` endpoint. Wire to Supabase.
- **Priority:** Medium — depends on Supabase (B1/R1) and scoring (R3) being live first

### R6. Modules 4 and 5 — Medium

- **What it is:**
  - Module 4: "Building and Automating" — repeatable AI workflow built around user's third top task
  - Module 5: "Measuring Impact" — connecting AI use to a team goal with before/after comparison
- **Status:** Not written. Modules 1–3 are complete in Rachel's `modules.js`.
- **What's needed:** Follow the pattern in `modules.js` (lesson content → interactive activity → weekly challenge with personalized prompt). Add as exported functions, wire action handlers in `bot.js`.
- **Priority:** Medium — completes the 5-module learning path

### R7. 6-Week Check-In Flow — Medium

- **What it is:** Automated re-scoring flow that runs 6 weeks after onboarding. Re-asks scoring questions, updates P/T/O/D self-scores, shows progress delta on dashboard.
- **Status:** Logic exists in `bot.js` (Slack-side). No web equivalent.
- **What's needed:** Decide delivery channel (Slack push, email, or in-app prompt). Build score comparison view. Store check-in history in a `checkins` table.
- **Priority:** Medium — the "over time" tracking that proves ROI

### R8. Okta SSO Integration — Medium

- **What it is:** NextAuth with Okta provider for the web dashboard. Redirects unauthenticated users to Okta sign-in. Matches users by email.
- **Status:** Complete in Rachel's codebase (`pages/api/auth/[...nextauth].js`). Not yet integrated into the current platform.
- **What's needed:** Add NextAuth + Okta provider to current app. Gate dashboard/manager pages behind auth. Map Okta email to learner profile.
- **Priority:** Medium — required for org-wide rollout, not needed for demo/pilot

### R9. Interactive Mockup (9-Step Walkthrough) — Low

- **What it is:** `mockup.html` — interactive 9-step demo showing the full learner+manager experience side by side (Slack DM left panel, web dashboard right panel). Demo user: Sarah Kim, Marketing.
- **Status:** Complete as standalone HTML. Useful for stakeholder demos.
- **What's needed:** Keep as-is for presentations, or rebuild as an in-app guided tour.
- **Priority:** Low — demo asset, not a product feature

---

## Brian — New Items from AI Academy Prototype

Brian's "AI Academy" prototype is a Next.js/TypeScript app focused on a self-updating curriculum pipeline, scenario-based skill assessment, and a structured lesson player with Claude grading. These items bring features not yet in the current platform.

### BR1. Auto-Refresh Curriculum Pipeline — High

- **What it is:** Automated system that keeps curriculum from going stale. Runs 3x/week via Vercel Cron (Mon/Wed/Fri):
  1. **Scanner** (`lib/scanner.ts`) — fetches 14 RSS sources (OpenAI blog, Anthropic news, DeepMind, arXiv cs.CL/cs.AI, HuggingFace daily, HN AI, r/LocalLLaMA, etc.) in parallel, upserts new Findings
  2. **Curator** (`lib/curator.ts`) — sends Findings + existing curriculum titles to Claude Opus, generates structured proposals (NEW MODULE / CONTENT UPDATE / DEPRECATION) with severity, confidence, affected modules, and a patch string
  3. **Slack Notify** (`lib/slack.ts`) — posts proposal cards to `#approvers` with deep-link to admin dashboard
  4. **Admin Review** — approvers open `/admin/curriculum`, review proposals + sources + diff, approve/reject
  5. **Apply Patch** — **TODO in Brian's code** — approved proposals sit at status `approved` but nothing rewrites curriculum content yet
- **Status:** Steps 1–4 are real and working end-to-end. Step 5 (applying approved patches) is the key gap.
- **What's needed:** Port scanner + curator to current app. Close the loop by implementing patch application on approval. Replace placeholder Slack approver handles (`@brian.wells`, `@skylar`, `@bridget`) with real ones.
- **Priority:** High — Brian's handoff calls this "the most valuable next deliverable." Solves the core problem that AI curriculum goes stale every 1–2 weeks.

### BR2. Calibration Onboarding (Scenario-Based Assessment) — Medium

- **What it is:** 3 scenario-based questions in `/onboarding`, each calibrated to a primary skill (privacy, prompting, agents, etc.) with partial credit bleed into related skills. Compares **self-rating** (slider) vs **measured** (quiz answers) to surface calibration gaps. Persists resulting Profile to localStorage.
- **Status:** Complete in Brian's prototype (`src/components/Onboarding.tsx`).
- **What's needed:** Port to current app. Replace localStorage with DB-backed profile. Could complement or replace current onboarding flow.
- **Priority:** Medium — gives a real skill baseline vs self-reported data, which makes the heatmap and recommendations meaningful

### BR3. Structured Lesson Player (5-Step Flow) — Medium

- **What it is:** `LessonPlayer.tsx` — 5-step lesson flow: **Read → Try → Compare → Ship → Reflect**. The "Try" step takes learner input and grades it via Claude (`POST /api/lesson/grade`). The "Compare" step calls Claude to show warm/concise/playful AI variants of the same content. Falls back to canned responses if no API key.
- **Status:** One lesson exists (`/lesson/customer-followups` — HVAC tech note). The player framework is complete; just needs more lesson content.
- **What's needed:** Port lesson player component. Create more lessons across personas (non-tech, tech, leader). Wire to Track/Module/Lesson data model.
- **Priority:** Medium — the current platform has lessons but this structured flow with Claude grading is more interactive

### BR4. Profile Radar + Calibration Chart — Low

- **What it is:** Two visualization components on `/profile`:
  - `ProfileRadar.tsx` — 6-skill SVG radar chart (privacy, prompting, comms, agents, eval, data)
  - `CalibrationChart.tsx` — bar chart comparing self-rating vs measured score per skill, sorted by gap
- **Status:** Complete, reads from localStorage profile set during onboarding.
- **What's needed:** Port components. Wire to DB-backed profile. Depends on calibration onboarding (BR2).
- **Priority:** Low — nice-to-have visualization; the heatmap already covers skill visibility

### BR5. Prisma Schema (Brian's Data Model) — Reference

- **What it is:** Full Postgres schema via Prisma covering: Learner, Track, Module, Lesson, Enrollment, Attempt, Source, Finding, Proposal, ApprovalEvent, ProposalFinding (M:N join)
- **Status:** Complete in `prisma/schema.prisma`. Designed for the auto-refresh pipeline.
- **What's needed:** Merge relevant models into the Supabase migration (B1/R1). The Source/Finding/Proposal/ApprovalEvent tables are essential if we build BR1.
- **Priority:** Reference — informs the database design, especially for the auto-refresh pipeline

---

## Summary by Priority

| Priority | Item | Source | Blocks / Blocked By |
|----------|------|--------|---------------------|
| **Critical** | Supabase Database (B1 + R1 + BR5) | All three | Blocks cross-device, manager features, scoring, pipeline |
| **High** | Slack Bot (R2) | Rachel | Independent — adoption driver |
| **High** | AI Impact Competency Scoring (R3) | Rachel | Blocked by Supabase |
| **High** | 20-Department Curriculum (R4) | Rachel | Independent — personalization layer |
| **High** | Auto-Refresh Curriculum Pipeline (BR1) | Brian | Blocked by Supabase; solves curriculum staleness |
| **Medium** | Manager Dashboard + Competencies Table (R5) | Rachel | Blocked by Supabase + Scoring |
| **Medium** | Modules 4 and 5 (R6) | Rachel | Independent — content work |
| **Medium** | 6-Week Check-In Flow (R7) | Rachel | Blocked by Supabase + Scoring |
| **Medium** | Okta SSO (R8) | Rachel | Independent — required for org rollout |
| **Medium** | Calibration Onboarding (BR2) | Brian | Independent — scenario-based skill baseline |
| **Medium** | Structured Lesson Player (BR3) | Brian | Independent — Claude-graded 5-step flow |
| **Low** | Skill Graph Visualization (B2) | Bridget | Heatmap covers core need |
| **Low** | Profile Radar + Calibration Chart (BR4) | Brian | Depends on BR2 |
| **Low** | Interactive Mockup (R9) | Rachel | Demo asset |

---

## Notes

- **Product name:** Rachel's prototype is called "AI Coach" (renamed from "AI Learning Companion" to avoid confusion with an LMS integration called "AI Companion"). Code still has old name references to update.
- **HCP Brand colors:** Dark Blue #00205C, Cyber Blue #0055FF, Classic Blue #009FDA, Blue 25 #9BCBEB, Light Grey #EEF2F7 — applied in `dashboard-v2.html`, should carry through to all components.
- **Two Claude models:** Rachel uses Haiku for scoring (fast/cheap integer responses) and Sonnet for content generation (curriculum, lessons, companion Q&A). Good pattern to keep.
- **Compliance departments:** Legal, Risk, Finance, Business Solutions get extra data safety warnings in Module 1. Controlled by `HIGH_COMPLIANCE_DEPTS` in `curriculum.js`.
- **All localStorage items** (quests, reviews, XP, badges, library usage, lesson history) were designed to map cleanly to database tables for migration when Supabase ships.
- **Slack app status:** IT has the app in review for internal workspace distribution — pending approval.
- **Rachel's source files** are at `prototypes/rachel/`. Key files: `bot.js`, `modules.js`, `curriculum.js`, `scoring.js`, `lib/claude.js`, `lib/supabase.js`, `supabase-schema.sql`, `dashboard-v2.html`, `mockup.html`.
- **Brian's source files** are at `prototypes/brian/`. Key files: `src/lib/scanner.ts`, `src/lib/curator.ts`, `src/lib/slack.ts`, `src/components/BriefingDirection.tsx`, `src/components/Onboarding.tsx`, `src/components/LessonPlayer.tsx`, `prisma/schema.prisma`.
- **Brian's auto-refresh pipeline** is the standout unique feature — no other prototype has curriculum that updates itself. Scans 14 AI news sources, generates proposals via Claude, and routes through Slack-gated approvals.
- **Slack approver handles** in Brian's code are placeholders (`@brian.wells`, `@skylar`, `@bridget`) — update before deploying.
- **Brian uses Claude Opus** for both curation and lesson grading (higher quality). Rachel uses Haiku for scoring + Sonnet for content. Consider a tiered model strategy.
