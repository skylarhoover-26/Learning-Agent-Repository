# Handoff — 2026-06-09 — Pulse Check

**Branch:** `security/sso-auth-hardening`
**Status:** 5 commits ahead of `origin/main` (not yet pushed). Uncommitted local changes from today's fixes.
**Production:** https://learning-agent-pearl.vercel.app

---

## Fixes Deployed Today

### 1. Manager Dashboard / NADN Snowflake Lookup
**File:** `app/api/manager-lookup/route.js`

The route crashed when the n8n webhook (`https://housecallpro.app.n8n.cloud/webhook/manager-lookup`) returned an empty body. The n8n workflow itself is healthy with correct Snowflake credentials and query — the issue was Vercel-side JSON parsing. Fixed to handle empty/non-JSON responses gracefully with clear error messages.

### 2. Auth Session Crash (Root Cause of Lesson + Chat Errors)
**Files:** `auth.js`, `app/api/auth/[...nextauth]/route.js`, `components/profile-provider.jsx`

NextAuth tried to initialize the Okta provider with undefined credentials (Okta not yet configured — waiting on IT). This returned HTTP 500, which crashed `SessionProvider` on every page and caused React error #310 on all client-side pages.

Fixes:
- `auth.js` — Skip Okta provider when credentials are not set; add fallback secret.
- `app/api/auth/[...nextauth]/route.js` — Wrapped handlers in try/catch to return `{}` if NextAuth throws.
- `components/profile-provider.jsx` — Handle unauthenticated state without crashing.

### 3. Lesson Page React Hooks Violation
**File:** `app/lesson/page.jsx`

`useCallback` and `useEffect` were placed AFTER a conditional early return (`if (view === 'picker')`), violating React's Rules of Hooks. React 19 enforces this strictly and crashed the page. Moved hooks above the early return.

### 4. Key Points Dark Mode Styling
**File:** `components/lesson-slide.jsx`

Key Points box had light-mode-only background (`bg-brand-50`) with faded text in dark mode. Added `dark:bg-slate-700/50`, `dark:text-brand-300` for the label, and `dark:text-slate-200` for items.

### 5. Learning Path Modules on Dashboard
**Files:** `components/live-module-progress.jsx` (NEW), `app/page.jsx`

Created a dashboard widget showing all 5 modules with completion status, progress bars, and percentages. The modules were already defined in `lib/modules-data.js` and accessible at `/modules`, but had zero dashboard visibility. Widget added above the Quests section on the main dashboard.

### 6. Error Boundary
**File:** `app/error.jsx` (NEW)

Shows actual error message and stack trace instead of the generic "Application error" page. Improves debugging speed significantly.

### 7. Pre-Push GitHub Checklist
**File:** `CLAUDE.md`

Added a mandatory 8-step verification process to prevent cross-project deployment issues. Also saved as a memory entry.

---

## All Files Changed

| File | Change |
|------|--------|
| `app/api/manager-lookup/route.js` | Empty response handling |
| `app/api/auth/[...nextauth]/route.js` | try/catch wrapper |
| `auth.js` | Conditional Okta provider |
| `components/profile-provider.jsx` | Auth state handling |
| `app/lesson/page.jsx` | Hooks order fix |
| `components/lesson-slide.jsx` | Dark mode key points |
| `components/live-module-progress.jsx` | **NEW** — Dashboard module widget |
| `app/page.jsx` | Added LiveModuleProgress import + section |
| `app/error.jsx` | **NEW** — Error boundary |
| `CLAUDE.md` | Pre-push checklist |

---

## What's Next

### Bridget's Backlog
- See `BRIDGET-BACKLOG.md` in this repo for the full list.
- `lib/curated-lessons.js` is documented as shipped but deleted from the working tree — needs investigation.
- The 5 modules are on the dashboard now, but verify if Bridget's original prototype had additional modules/content.

### Lesson UX Improvements (Skylar's Feedback)
1. **Show conversation history in lessons** — When the user types a response, their previous message disappears. Should show chat-style history so users have context for what they asked.
2. **Shorter AI responses** — The lesson AI generates walls of text. Tighten the system prompt in `lib/ai.js` (`buildLessonSystemPrompt`) and lower `max_tokens` for more bite-sized responses, especially for beginners.
3. **More prominent TTS** — The read-aloud speaker icon exists (top-right of each slide) but is subtle. Consider auto-playing or making it more visible.
4. **Voice input (speech-to-text)** — Use the browser Web Speech API to let users speak instead of type. Medium effort.
5. **Voice conversation mode** — Combine speech-to-text input + auto-play TTS responses for a back-and-forth voice experience. Medium-large effort.
6. **Embedded video walkthroughs** — Embed Loom/YouTube clips or interactive demos per topic to show how things work visually. Medium effort.

### Still Pending from Earlier
- **SSO:** Code-complete, blocking on IT for Okta credentials (`AUTH_OKTA_ID`, `AUTH_OKTA_SECRET`, `AUTH_OKTA_ISSUER`).
- **n8n batch Snowflake workflow** (`n8n-snowflake-manager-dashboard.json`): Has placeholder query and no credentials. Needs to be updated with the correct `production.namely.people_vw` + `profiles` schema. The real-time webhook workflow already has the correct query.

---

## Production URLs

| Service | URL |
|---------|-----|
| Learning Agent | https://learning-agent-pearl.vercel.app |
| Course Builder | https://course-builder-gray-one.vercel.app |
| n8n | https://housecallpro.app.n8n.cloud |
