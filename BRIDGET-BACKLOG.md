# Bridget's Remaining Backlog Items

**Last updated:** 2026-06-04
**Project:** AI Learning Platform (Learning-Agent-Repository)
**Source:** Bridget's original prototype (`ai-learning-agent.zip`)

Bridget's Next.js prototype was the foundation for the consolidated platform. Most of her core features have been ported and are live. The items below are features from her original build that have **not yet been implemented** or are **only partially complete** in the current app.

---

## Not Yet Implemented

### 1. Voice Mode (Text-to-Speech for Lessons)
- **Original:** Bridget's prototype used OpenAI TTS to read lesson slides aloud
- **Status:** Not ported. The current app has no audio/voice capability
- **What's needed:** TTS integration (likely via Anthropic or a third-party TTS API), audio player UI on lesson slides, play/pause controls
- **Priority consideration:** Accessibility win; also valuable for on-the-go learning

### 2. Content Pipeline (Admin Lesson Creation Tool)
- **Original:** Bridget had tooling for admins to author and publish new lesson content
- **Status:** The current `/admin` page shows a curriculum moderation UI with mock proposals, but it is not wired to actually create, edit, or publish lesson content
- **What's needed:** Admin authoring flow (create/edit lesson templates, set topics, define slide structures), approval workflow connected to real data, publish-to-live pipeline
- **Priority consideration:** Currently all lesson content is AI-generated on-the-fly via Claude. A content pipeline would allow curated, vetted lessons alongside AI-generated ones

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
- **Status:** Not connected. All data currently lives in browser cookies (profile only) and hardcoded mock data (everything else). Learner progress, completed lessons, earned badges, and goals are **lost when cookies expire or the browser is cleared**
- **What's needed:** Supabase project setup, schema migration, API routes updated to read/write from DB instead of mock data, data seeding for demo
- **Priority consideration:** **Critical blocker.** Without a database, nothing persists. This is the single most important infrastructure item remaining

### 6. OpenAI-Specific Features (DALL-E Image Generation)
- **Original:** Bridget used DALL-E for generating lesson imagery and visual content
- **Status:** Not ported. The platform switched to Anthropic Claude API for all AI features. Claude does not generate images
- **What's needed:** Decide whether to add image generation (via a separate service) or rely on static/stock imagery
- **Priority consideration:** Low — cosmetic enhancement. Static images or Lucide icons work fine for the current UI

---

## Partially Implemented

### 7. Quests System (Expanded)
- **Original:** Bridget had 3 detailed quest templates with multi-step guided walkthroughs
- **Current:** 20 quests exist on the `/quests` page, but they are **display-only mock data** — you can browse them but can't start, track progress through, or complete a quest
- **What's needed:** Quest state tracking (started/in-progress/completed), step-by-step progression UI, XP reward on completion, persistence (requires database)

### 8. Spaced Repetition System (Expanded)
- **Original:** Bridget had a full spaced repetition engine with scheduling algorithms
- **Current:** `/review` page exists with 2 mock quiz cards showing `next_review_at` dates, but the scheduling algorithm is not implemented and cards don't update based on performance
- **What's needed:** SM-2 or similar scheduling algorithm, card generation from completed lessons, performance tracking (correct/incorrect), review queue management, persistence (requires database)

### 9. Use Case Library (Full Dataset)
- **Original:** Bridget had 30 fully detailed use cases with starter prompts
- **Current:** 30 use cases exist on `/library` page and are browsable/filterable — this is largely complete
- **What's remaining:** Use cases are static. Original concept included community-submitted use cases and usage tracking (which use cases people actually try)

### 10. Gamification — Real-Time Progression
- **Original:** XP, levels, and badges updated in real time as the learner completed activities
- **Current:** XP system, 10 levels, and 11 badges are all defined and displayed. Dashboard shows the learner's current state from mock data
- **What's remaining:** Progression doesn't actually happen. Completing a lesson doesn't award XP. Badges aren't earned through activity. Everything is frozen at the mock data state. Requires database + event system to become functional

### 11. Learner Profile — Full Data Model
- **Original:** Rich learner profile stored in Supabase with full history
- **Current:** Profile stored in browser cookies with basic fields (name, department, sub_team, tier, goal). Editable on `/profile` page
- **What's remaining:** Lesson history, skill evaluations, XP events, badge timestamps, and learning streaks are all in mock data only — not tied to the actual user's activity

---

## Summary by Priority

| Priority | Item | Blocker? |
|----------|------|----------|
| **Critical** | Supabase Database (#5) | Yes — blocks all persistence |
| **High** | Gamification Real-Time (#10) | Blocked by #5 |
| **High** | Slack Bot (#4) | Independent — adoption driver |
| **High** | Quest Tracking (#7) | Blocked by #5 |
| **Medium** | Spaced Repetition Engine (#8) | Blocked by #5 |
| **Medium** | Content Pipeline (#2) | Independent |
| **Medium** | Voice Mode (#1) | Independent |
| **Medium** | Learner Profile Full Data (#11) | Blocked by #5 |
| **Low** | Skill Graph (#3) | Heatmap covers core need |
| **Low** | Use Case Community Features (#9) | Blocked by #5 |
| **Low** | Image Generation (#6) | Cosmetic only |

---

## Notes

- Items #7, #8, #10, and #11 are all **blocked by #5 (database)**. Once Supabase is connected, these can be tackled in parallel.
- The AI provider switch from OpenAI to Anthropic Claude was intentional and is considered complete. Features that relied specifically on OpenAI capabilities (DALL-E, TTS) need alternative solutions.
- Bridget's original Supabase schema file was at `supabase/schema.sql` in her prototype. That schema should be reviewed and adapted for the current data model before migration.
