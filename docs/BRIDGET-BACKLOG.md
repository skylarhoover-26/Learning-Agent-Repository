# Bridget's Remaining Backlog Items

**Last updated:** 2026-06-04 (updated after quests, spaced repetition, library expansion, and image gen decision)
**Project:** AI Learning Platform (Learning-Agent-Repository)
**Source:** Bridget's original prototype (`ai-learning-agent.zip`)

Bridget's Next.js prototype was the foundation for the consolidated platform. Most of her core features have been ported and are live. The items below are features from her original build that have **not yet been implemented** or are **only partially complete** in the current app.

---

## Not Yet Implemented

### ~~1. Voice Mode (Text-to-Speech for Lessons)~~ — DONE
- **Shipped:** 2026-06-04
- **Implementation:** Browser Web Speech API with play/pause/stop controls on every lesson slide and recap card. Strips markdown before reading. No external API or dependency needed.
- **Files:** `lib/use-tts.js`, `components/lesson-slide.jsx`

### ~~2. Content Pipeline (Admin Lesson Creation Tool)~~ — DONE
- **Shipped:** 2026-06-04
- **Implementation:** "Curated Lessons" tab on `/admin` with full authoring form (topic, format, multi-slide builder with key points). Stored in localStorage. Curated lessons appear on the `/lesson` picker in a dedicated section and deliver slides instantly without calling Claude.
- **Files:** `lib/curated-lessons.js`, `app/admin/page.jsx`, `app/lesson/page.jsx`

### 3. Skill Graph Visualization
- **Original:** Bridget had a more complex skill graph showing relationships between skills and learning paths
- **Status:** Replaced by Brian's knowledge heatmap (4x4 grid), which is simpler. The heatmap covers mastery levels but not skill relationships or learning path visualization
- **What's needed:** Graph/tree visualization showing skill dependencies and recommended learning sequences, integration with learner progress data
- **Priority consideration:** Nice-to-have. The heatmap covers the core need; a graph would add depth for power users

### 4. Slack Bot Integration
- **Original:** Bridget built a companion Slack bot alongside the web app
- **Status:** Not ported. The platform is web-only
- **What's needed:** Slack app setup, bot commands for quick lessons/tips, notification delivery (lesson reminders, streak alerts, badge earned), deep links back to the web app
- **Priority consideration:** High value for adoption — meets users where they already work. Jenny's curriculum spec also calls for daily/weekly Slack messages

### 5. Supabase Database (Persistent Backend)
- **Original:** Bridget had a complete Supabase schema ready (`supabase/schema.sql`) for PostgreSQL
- **Status:** Not connected. All data currently lives in browser cookies (profile) and localStorage (quests, reviews, library usage, XP, lesson history, badges). Data persists within a single browser but is **not synced across devices** and is lost if browser storage is cleared.
- **What's needed:** Supabase project setup, schema migration, API routes updated to read/write from DB instead of localStorage, data seeding for demo
- **Priority consideration:** **Critical blocker** for multi-device and team-wide features. Single-browser usage works with localStorage for now.

### ~~6. OpenAI-Specific Features (DALL-E Image Generation)~~ — SKIPPED
- **Decision:** 2026-06-04 — Skipped intentionally. The platform switched to Anthropic Claude and Lucide icons + emojis handle the UI well. Not worth adding a second AI provider for cosmetic imagery.

---

## Partially Implemented

### ~~7. Quests System (Expanded)~~ — DONE
- **Shipped:** 2026-06-04
- **Implementation:** 10 detailed quests with multi-step guided walkthroughs. Each quest has step-by-step progression UI with task descriptions, success criteria, and tips. Quest state (started/in-progress/completed) tracked in localStorage. XP awarded on completion. "First quest" badge earned automatically.
- **Files:** `lib/quest-data.js`, `lib/quest-store.js`, `lib/xp-store.js`, `app/quests/page.jsx`, `app/quests/[id]/page.jsx`
- **What's remaining:** Persistence is localStorage only — will migrate to Supabase when database is added. Data shapes are designed for DB migration.

### ~~8. Spaced Repetition System (Expanded)~~ — DONE
- **Shipped:** 2026-06-04
- **Implementation:** Full SM-2 scheduling algorithm. 20 review cards across 4 categories (Prompt Basics, Prompt Techniques, AI Safety, Workflows). Again/Hard/Good/Easy rating buttons with next-review-interval preview. Performance tracking (accuracy stats). Review queue management surfaces due cards + new cards. XP awarded for correct answers.
- **Files:** `lib/sm2.js`, `lib/review-data.js`, `lib/review-store.js`, `app/review/page.jsx`
- **What's remaining:** Card generation from completed lessons (currently a static pool). Persistence is localStorage — will migrate to Supabase.

### ~~9. Use Case Library (Full Dataset)~~ — DONE
- **Shipped:** 2026-06-04
- **Implementation:** Expanded from 8 to 30 use cases with detailed starter prompts covering writing, analysis, meetings, and decisions across all roles. localStorage-based usage tracking (tries + copies per use case). "Popular" and "Recent" badges shown on cards.
- **Files:** `lib/library-store.js`, `app/library/page.jsx`
- **What's remaining:** Community-submitted use cases (requires database + moderation flow).

### ~~10. Gamification — Real-Time Progression~~ — DONE
- **Shipped:** 2026-06-04
- **Implementation:** Completing a lesson awards 50 XP in real time. Streak bonuses (+10 XP) auto-detect consecutive learning days. All 11 badges evaluate dynamically against real activity (lesson count, streak length, level). Celebration toast shows XP earned, level-ups, streak bonuses, and new badges on lesson completion. Dashboard and achievements page read live data instead of mock data. Uses localStorage (per-browser persistence) — database upgrade deferred.
- **Files:** `lib/progression.js`, `lib/learner-store.js`, `components/progression-provider.jsx`, `components/xp-toast.jsx`, `components/live-stats-pills.jsx`, `components/live-level-badges.jsx`, `components/live-streak-card.jsx`, `components/live-recent-lesson.jsx`, `components/achievements-live.jsx`
- **Earnable now:** first_lesson, three_lessons, ten_lessons, three_day_streak, seven_day_streak, level_5. Quiz/quest/project/goal badges activate when those systems ship.

### ~~11. Learner Profile — Full Data Model~~ — DONE
- **Shipped:** 2026-06-04
- **Implementation:** Lesson history, XP events, earned badges with timestamps, and learning streaks are now tracked from real user activity and stored in localStorage (keyed by learner ID). Profile identity remains in cookies; activity data is in localStorage. Dashboard shows real "pick up where you left off" from actual completed lessons.
- **Files:** `lib/learner-store.js`, `components/live-recent-lesson.jsx`, `components/progression-provider.jsx`
- **What's still mock:** Skill evaluations, goals, and projects remain on mock data. Quiz cards (#8) are now live with SM-2 scheduling.

---

## Summary by Priority

| Priority | Item | Status |
|----------|------|--------|
| ~~Medium~~ | ~~Voice Mode (#1)~~ | **DONE** — 2026-06-04 |
| ~~Medium~~ | ~~Content Pipeline (#2)~~ | **DONE** — 2026-06-04 |
| ~~**High**~~ | ~~Gamification Real-Time (#10)~~ | **DONE** — 2026-06-04 (localStorage) |
| ~~**Medium**~~ | ~~Learner Profile Full Data (#11)~~ | **DONE** — 2026-06-04 (localStorage) |
| ~~**High**~~ | ~~Quest Tracking (#7)~~ | **DONE** — 2026-06-04 (10 quests, localStorage) |
| ~~**Medium**~~ | ~~Spaced Repetition (#8)~~ | **DONE** — 2026-06-04 (SM-2, 20 cards, localStorage) |
| ~~**Low**~~ | ~~Use Case Library (#9)~~ | **DONE** — 2026-06-04 (30 use cases + tracking) |
| ~~**Low**~~ | ~~Image Generation (#6)~~ | **SKIPPED** — not needed |
| **Critical** | Supabase Database (#5) | Blocks cross-device persistence |
| **High** | Slack Bot (#4) | Independent — adoption driver |
| **Low** | Skill Graph (#3) | Heatmap covers core need |

---

## Notes

- All originally database-blocked items (#7, #8, #10, #11) are now functional using localStorage. Supabase (#5) remains the blocker for cross-device sync and team-wide features.
- The AI provider switch from OpenAI to Anthropic Claude is complete. DALL-E image generation was intentionally skipped.
- Bridget's original Supabase schema file was at `supabase/schema.sql`. Schema should be adapted for the current data model (including quest_progress, review_card_state, library_usage tables) before migration.
- All localStorage data shapes were designed to map cleanly to database tables for easy migration.
