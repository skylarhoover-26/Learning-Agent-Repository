# Deleted / Restructured Features — Archive

A running record of features removed from the AI Learning Coach app, what they
did, and how they worked — so we can rebuild or reference them later. Code for
each lives in git history before the commit noted.

---

## Removed 2026-06-29

### Skill Graph  — route `/skill-graph`
**What it did:** A visual node-and-edge map of the learner's AI skills and how
they connect — strengths, growing areas, and gaps — plus a "recommended next
skill."
**How it worked:** Page `app/skill-graph/page.jsx` (~437 lines) rendered the
graph from `lib/skill-graph-data.js` (`GRAPH_NODES`, `GRAPH_EDGES`,
`findRecommendedNext`). Mastery was derived from lesson history, module
progress, and calibration.
**Kept:** `lib/skill-graph-data.js` stays — the daily digest (`app/api/daily-digest`)
and Slack notification still use it. The home "Your Skills" card and the Heatmap
page now link to **Knowledge Heatmap** instead. Knowledge Heatmap (a grid view of
the same strength/gap data) remains the surviving skill-visualization.

### Quests — standalone pages `/quests`, `/quests/[id]`
**What it did:** Browse curated Project Quests, pick one, and work through its
steps to build something real, earning XP (up to +200).
**How it worked:** `app/quests/page.jsx` + `app/quests/[id]/page.jsx` rendered
`lib/quest-data.js` (`QUESTS`).
**Kept:** `lib/quest-data.js` and the **Project Quest lesson format** stay —
Project Quests are still fully available via **Lesson → Project Quest** (the
`project_quest` format in `app/lesson/page.jsx`, which walks the same quest
steps). Only the standalone browse pages were removed.

### Review — route `/review`
**What it did:** Spaced-repetition flashcards to revisit key concepts so they
stick. Awarded +5 XP per card (20/day cap).
**How it worked:** `app/review/page.jsx` (~272 lines) drove cards from
`lib/review-data.js` (`REVIEW_CARDS`) through `lib/review-store.js`, scheduled by
the SM-2 spaced-repetition algorithm in `lib/sm2.js`.
**Deleted libs:** `review-store.js`, `review-data.js`, `sm2.js` (were used only
by this feature). The XP explainer no longer lists "Answer a review card."

### Practice — routes `/structured-lesson`, `/structured-lesson/[id]`
**What it did:** Hands-on structured exercises with instant feedback (separate
from the chat-driven Lesson flow).
**How it worked:** `app/structured-lesson/` pages backed by
`lib/structured-lessons-data.js`. Overlapped with the Lesson flow and the
in-lesson "write" practice activities, which remain.

### Goals (tracker) — route `/goals`  (was the Goals tab of "My Growth")
**What it did:** A personal goal **tracker** — add learning goals (custom or from
a suggestion list), mark them complete, delete them; showed Active vs Completed.
**How it worked:** `lib/goal-store.js` (`getGoals` / `addGoal` / `completeGoal` /
`deleteGoal`), stored in the browser.
**Important distinction:** This is NOT the same as the **goal selection during
onboarding** (`profile.goals` / `profile.goal`), which stays and still feeds
lesson personalization. The **"Aim High" badge (`first_goal`)** is awarded during
onboarding when a learner picks goals — so it is still earnable; its link now
points to `/profile`. `lib/goal-store.js` is now orphaned (left in place,
unused).

### Check-in — route `/checkin`  (was the Check-in tab of "My Growth")
**What it did:** A periodic "6-Week Check-In" — a short re-assessment that
compared the learner's current AI usage to their previous **AI Impact** baseline
and showed the per-dimension change (Personal/Team/Org), nudging next steps. If
nothing had improved, it asked a follow-up "what's blocking you?" question.
**How it worked:** Read the baseline via `lib/scoring-store.js` (`getScores`),
asked delta questions, and wrote updated scores via `saveScores`. The optional
free-text follow-up was scored by `POST /api/scoring`.

---

## Restructured 2026-06-29 (not deleted — moved)

- **AI Impact** self-assessment moved from `/scoring` (and the "My Growth" tab)
  to its own **"My Impact"** page at `/my-impact`, reached from the **profile
  dropdown** (alphabetical). It still writes `ai_impact_scores` via
  `lib/scoring-store.js`, which the **Manager Dashboard** reads — unchanged.
  Component: `components/ai-impact-panel.jsx`. `POST /api/scoring` still scores
  the free-text follow-ups.
- **"My Growth"** (`/growth`) — the short-lived combined page (Goals + AI Impact +
  Check-in tabs) — was removed once Goals and Check-in were dropped and AI Impact
  moved out. `/growth` and `/scoring` now redirect to `/my-impact`; `/goals` and
  `/checkin` redirect home.
