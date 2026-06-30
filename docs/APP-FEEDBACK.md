# App Feedback — 2026-06-11

Captured from Skylar's usage. Grouped by readiness. ✏️ = copy/quick, 🔧 = needs build, ❓ = needs a decision/spec before building.

## ✏️ Quick copy / UI changes (ready once wording confirmed)

1. **Chat landing question** — `app/chat/page.jsx:134`
   - Change "What do you want to know about AI?" → **"How can AI optimize your workflow?"**
   - Goal: more thought-provoking, work-optimization framing.

2. **Find AI hero subtitle** — `components/find-ai-hero.jsx:39`
   - Reframe around "tell me about your **day-to-day** work."
   - Current: "Tell me about your day or a task you do regularly. I'll find specific AI opportunities…"
   - Proposed: "Tell me about your day-to-day work and I'll find specific AI opportunities you can use today — for YOUR actual work, not generic ideas."

3. **"Just Chat"** — keep/position the chat page as a space for *just chatting* (vs. structured lessons). ❓ Confirm: relabel only, or also strip tracking/XP from this mode?

## 🔧 Projects screen — `app/projects/page.jsx`

4. **Add a "bubble" for tasks** — ❓ what exactly? A tasks chip/section linking to My Tasks, or per-project task bubbles?
5. **Back arrow** — note: PageHeader already has a back arrow → it goes to `/` (dashboard). ❓ Do you want it to go to the *previous* page instead, or is a sub-view missing it?

## ❓ Privacy / tracking (needs a decision)

6. **Chat saves history "without prompt"** — `saveChatHistory` runs on every message (`app/chat/page.jsx:96`). Plus chat content flows to the admin **Activity Log** (audit). Concern: admin can see chat history.
   - Decision needed: (a) add a clear privacy notice, (b) stop logging chat *content* to the admin audit, (c) make chat history opt-out / not auto-saved, or some mix.

## ❓ New feature — AI Impact Assessment

7. **Recurring AI Impact Assessment** — every **6 weeks**, prompt the user (on login, shown *after* they land on the dashboard) to fill in an impact/competency self-assessment. Likely ties to the existing `/scoring` "AI Impact" page.
   - Needs spec: questions, exact cadence reset (6 weeks from last completion), modal vs. page, where results are stored, what the dashboard does with them.

## 🔧 Navigation

8. **"Toolshed" menu bar** — stays sticky, with an option to **close** it. ❓ Which element is the "Toolshed menu bar"? (No component by that name found — is it the hamburger nav, or a specific toolbar?)

---

## Already shipped (context)
Voice + video lessons, skill-graph surfacing, manager dashboard/lookup, XP fixes, white Level cards — all live on `main` as of 2026-06-11.
