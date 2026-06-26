# Design ↔ Code Sync — Cinematic / Minimalist Learning Platform

**Purpose:** Feed this to Claude Design so the design file and the implemented app stay in lock-step. It documents what is **actually built** in the staging app today, plus the deltas from the original handoff (`Cinematic Learning Platform HCP`). Staging only — never shipped to production.

- **Repo / branch:** `skylarhoover-26/Learning-Agent-Repository` → `staging/cinematic-design`
- **Stack:** Next.js (App Router) + Tailwind. Design tokens implemented as CSS custom properties in `app/globals.css`.
- **Source of truth for visuals:** the design handoff README (tokens/type/spacing) — implemented values match it. This doc records the **motion + component** decisions and where code extends the design.

---

## Design tokens (implemented — matches handoff)

CSS custom properties drive both themes. Light is the design default; the app currently keeps the user's saved theme (dark in most screenshots). Tokens live on the cinematic wrappers (`.cine`, `.cine-vars`, `.cine-frame`).

| Token | Light | Dark | Role |
|---|---|---|---|
| `--bg` | `#EAF0FB` | `#06142E` | Page base |
| `--ink` | `#0A2443` | `#EAF2FF` | Primary text |
| `--ink-dim` | `rgba(10,36,67,.6)` | `rgba(234,242,255,.62)` | Secondary text |
| `--glass` | `rgba(255,255,255,.72)` | `rgba(255,255,255,.06)` | Frosted card fill |
| `--line` | `rgba(10,36,67,.1)` | `rgba(255,255,255,.12)` | Borders / dividers |
| `--accent` | `#0055FF` | `#3B94FF` | Primary brand blue |
| `--accent2` | `#3B94FF` | `#6AABFF` | Secondary blue |
| `--gold` | `#FFB706` | `#FFB706` | Streaks / today's pick / milestones |
| `--good` | `#1AA06A` | `#2BB37A` | Success |

**Type:** Plus Jakarta Sans (display/headings/numbers/UI) + Open Sans (body). Hero h1 `clamp(48px,6.6vw,92px)` wt 700, tracking `-.035em`, line-height `.94`. Section h2 `clamp(28px,3.6vw,46px)`. Eyebrows: 11–13px, `letter-spacing:.18em`, uppercase, wt 700.

---

## Signature motion (implemented — copy-paste reference)

These are the four motions that define the feel. All are live in the app.

### 1. Animated gradient name/title — `.cine-grad-flow`
The hero name ("Brian.") and big lesson titles animate a color sweep (NOT static).
```css
.cine-grad-flow{
  background:linear-gradient(90deg,var(--accent) 0%,var(--accent2) 45%,var(--gold) 100%);
  background-size:200% auto;
  -webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;
  animation:cineGradFlow 7s ease infinite;
}
@keyframes cineGradFlow{0%{background-position:0% center}50%{background-position:200% center}100%{background-position:0% center}}
```
(A static variant `.cine-grad-text` exists but is NOT used on the name — the name must move.)

### 2. Scene-wide pointer tilt — `.cine-tilt`
Every card tips toward the cursor based on its position relative to **screen center** (one shared value for all cards, set on `<html>` by a global `mousemove`), plus a hover lift. Matches the design's `data-tilt`.
```css
.cine-tilt{
  transform:perspective(900px) rotateX(var(--tilt-rx,0deg)) rotateY(var(--tilt-ry,0deg)) translateY(var(--tilt-lift,0px));
  transition:transform .3s cubic-bezier(.16,1,.3,1),box-shadow .4s,border-color .3s;
}
.cine-tilt:hover{--tilt-lift:-8px;box-shadow:0 28px 60px -28px var(--accent);}
```
```js
// global handler (rAF-throttled, respects prefers-reduced-motion):
const dx=(e.clientX-innerWidth/2)/(innerWidth/2), dy=(e.clientY-innerHeight/2)/(innerHeight/2);
root.style.setProperty('--tilt-ry', (dx*5)+'deg');
root.style.setProperty('--tilt-rx', (-dy*5)+'deg');
```
Applied to: Ways-to-learn cards, Discover banner, Today's Pick, AI-news cards, Streak + Leaderboard cards.

### 3. Hover lift — `.cine-lift`
`translateY(-3px)` on hover (small) / `-8px` via `.cine-tilt` (cards). Used on buttons, pills, list items.

### 4. Scroll reveal — `.reveal` / `.reveal.in`
Sections start `translateY(32px)` + `opacity:0`, ease to rest as they enter the viewport (IntersectionObserver adds `.in`). Used in the full-scroll lesson.

Other ambient motion present: `.cine-row` hover highlight on list rows; confetti on lesson completion; `cine-rise` section entrance.

---

## Screens — implemented state

### Home / Dashboard (`components/cinematic/cinematic-home.jsx`)
Wired to **real data**. Sections top→bottom:
1. **Hero** — eyebrow (`{streak}-day streak · {level title}`), h1 "Welcome back, **{firstName}.**" (animated gradient name), "X XP from Level N…" subcopy, Resume (truncated to one line) + Explore buttons.
2. **Level journey** — 5-step ascending staircase, current step marked with a floating "YOU'RE HERE" pill + avatar **anchored above the current bar**, states done/current/next/upcoming; + 3 stat chips (streak / XP / badges).
3. **Discover banner** — full-width accent-gradient card, tilts.
4. **Ways to learn** — 5 colored gradient-tile cards (Games / Just Chat / Lesson / Practice / Review).
5. **Today's pick** — real personalized pick (e.g. "Try: Data Privacy") title + description + CTA.
6. **Your stats** — Current streak card with **M T W T F S S weekday pills** (lit from real activity) + Top-learners leaderboard (your row highlighted).
7. **Your skills** — Strong / Growing / Gaps pills (computed client-side).
8. **AI news** — 3 cards from the real daily scan feed.

### Lesson — full-scroll "Course" reader (`components/cinematic/cinematic-course.jsx`)
Used for **Quick Lesson + Deep Dive, Read mode**. A single scroll-document:
- **100vh hero**: `{format} · {mins}` eyebrow, topic as animated gradient title, objectives, "Scroll to begin".
- **Scroll chrome**: sticky top progress bar (% climbs with scroll) + left vertical fill rail; hero **parallax-fades** on scroll.
- **Reveal sections**: each concept + activity rises/fades in.
- **Inline activities** (real graded MCQ/write), then a **completion moment** (confetti + "+N XP" + Back/Replay).
- Reuses the real engine (`/api/lesson/plan`, `/api/lesson/teach`, grading, `onLessonComplete` XP) — only the presentation is the scroll.

### Other tabs
All tabs (Discover, Library, Games + game screens, Chat, Practice, Heatmap, Leaderboard, Quests, Manager, Admin + sub-pages, etc.) adopt the cinematic chrome (top bar + drawer) via `CinematicFrame`, preserving their existing functionality. Goals / Achievements / Quests / Leaderboard / Home have bespoke cinematic treatments.

---

## Deltas vs. the original handoff (please mirror in design)

1. **Lesson is BOTH an aesthetic reskin AND a full scroll** — the scroll-document course reader is implemented for Quick Lesson + Deep Dive (Read mode). Project Quest (build engine) and Narrated mode keep the step player; Quick Tip stays conversational.
2. **Pointer tilt + animated gradient name are required**, not "nice-to-have" — they're the agreed signature motion.
3. **Theme:** light is the design default, but the app respects the user's saved theme (so dark is common in screenshots).
4. **Known fix pending:** in **light** mode the locked staircase steps (Levels 4–5) render near-white and blend into the background — needs a stronger fill in light theme.
5. Content is **real/dynamic** (AI-generated lessons, live leaderboard, computed skills, daily pick), so exact strings differ from the static seed data in the prototype.

---

## How to use this with Claude Design
Paste this file into Claude Design and ask it to (a) keep the next design iteration consistent with the tokens + signature motion above, (b) design the **light-mode locked staircase** fix, and (c) when proposing new screens, note which existing motion classes (`cine-grad-flow`, `cine-tilt`, `reveal`) apply so implementation stays 1:1.
