# Push Backlog — batch/aug-11

Work staged during the testing freeze. Nothing here reaches prod until the batch is
released, because **prod only builds from `main`** and this all lives on `batch/aug-11`.

Source: `/admin/feedback` export, 2026-08-11 — 35 open items, filtered to the
18 that are **Critical or High and not yet started** (10 Critical, 8 High).

## Release state

- Base: `main` @ `c858f4e` (equal on `origin` and `personal` at branch creation)
- Branch: `batch/aug-11`
- Status: **FROZEN** — testing in progress, do not touch `main`

## How this gets released

1. `git fetch origin && git fetch personal` — confirm `main` hasn't moved under us
   (other Claude sessions push this repo)
2. `git rebase main batch/aug-11` if it did
3. `git checkout main && git merge --ff-only batch/aug-11`
4. **Read "Verify before release" below and clear every open box for the commits
   you're about to push.** Lint passing is not the same as this working.
5. Push to `personal` **one commit at a time**, verifying prod between each:
   `git push personal <sha>:main`
6. Once all commits are out and verified: `git push origin main`

Each commit must stand on its own — if you verify between pushes, an intermediate
state that depends on a later commit will look broken. Order accordingly.

---

## Verify before release

Caveats and open questions attached to work already committed. These are the things
that lint and `next build` **cannot** catch. Do not push a commit whose boxes are
still open.

### `a835860` + follow-up — #165 checkpoint dead end

**Confirmed by Andrea's screenshot** (2026-08-11): the card rendered its "Quick
check" header, the "Proves: …" objective and "3 of 3 tries left" with **no options
between them** — an empty `options.map()`, exactly as diagnosed.

The screenshot also changed the fix. The step was titled *"SORT THE METRICS"*, which
is a categorize/order activity, not multiple choice. So the payload was probably not
missing — it was the **wrong shape for the declared type**, and `activityType ||
'mcq'` rendered it as an Mcq that found no `options`. The follow-up commit detects
the type from the payload's shape and renders the real activity; the escape hatch is
now only for payloads that match nothing.

- [ ] **Click through a real malformed activity.** The guard only fires when a
      generated activity is missing its collection, which can't be manufactured
      without running the app. Confirm the amber notice + Continue button appear
      and that Continue actually advances the step.
- [ ] **Confirm shape-recovery works**: a payload whose shape disagrees with its
      `activityType` should render as the shape (e.g. `buckets`+`items` → "Sort
      these out"), with the correct header and icon, and should grade normally.
- [ ] Check that the recovered label doesn't contradict the step title — a step
      titled "sort the metrics" should no longer say "Quick check".
- [ ] Confirm a **normal** activity still renders and grades exactly as before —
      the change wraps the type dispatch, so a mistake here would break all six
      activity types, not just the malformed case.
- [ ] Note: it resolves as **passed**, so a learner who hits a broken checkpoint
      keeps their XP for the run. If that's not the XP behavior you want, say so
      before this ships — it's a one-line change now and a data cleanup later.

### `d53d0b3` — #182 refine loop

- [ ] **Force a refine failure and confirm the amber banner + Try again appear**
      instead of a repeated question. Can't be produced without breaking the API
      call on purpose.
- [ ] **Answer refine 3 times without ever naming a concrete topic** and confirm it
      now commits to a topic rather than asking a 4th time. The forced topic is the
      learner's own last answer, so check it reads sanely in the "Ready: a new
      lesson on X" banner — a rambling answer will show up verbatim there.
- [ ] Confirm a **normal** refine run still reaches "Ready: a new lesson on X" and
      rebuilds. The success path was touched (`d.message` is now required).

### `c032c5a` — #181 Project Quest plan failure

This commit makes the failure **diagnosable**; it does not make generation faster.
#181 stays open until the real cause shows up in the log.

- [ ] After release, hit a plan failure and confirm `/admin/activity-log` now shows
      `format=… attempts=… webSearch=… lastError=…` instead of "Failed to design
      the lesson."
- [ ] Confirm the **learner-facing** message is unchanged — the friendly text is
      still `error.message`, and the diagnostic rides alongside it. If the raw
      cause ever reaches the lesson screen, that's this change leaking.
- [ ] **Then re-open #181 with the real cause.** Both attempts failed at ~129s
      each; we still don't know why.

**Measured, worth acting on separately:** a *successful* project_quest plan for
Azeret's topic took **274.1s** against a **280s** client abort — a 6-second margin.
Quests on long topics are effectively at the ceiling, so some fraction of them fail
purely on timing regardless of cause. The deferred skeleton/detail split is the real
answer; raising the client budget past the route's 300s `maxDuration` is not.

### `5553e54` — #166 Surprise Me overrode the format

- [ ] **Surprise from Project Quest → Narration** now gives a narrated Quest, not a
      quick tip. Confirm — and brace for the wait: this routes surprise into the
      ~274s quest generation from #181, which is the tradeoff Skylar accepted.
- [ ] Surprise from each of the other three formats lands in that same format.
- [ ] **Getting Started → "Surprise me"** still gives a Quick Tip. Its link was
      pinned to `&format=quick_tip` because that card promises a 5-minute prompt;
      without the pin it would have inherited the picker default ("standard").
- [ ] The loader now reads "Finding a surprise &lt;Format&gt; for you…" — check it
      names the right format.

### `328651d` — #164 (and #162) missing "x of n"

**The cluster B diagnosis in this doc was wrong for these two.** It blamed narrated
mode falling through to the legacy streaming view. Andrea's #164 screenshot shows the
read-mode `PlanLessonPlayer` eyebrow (`plan-lesson-player.jsx:1498`), so both reports
are the read path, and the counter at line 1432 *does* render.

The real gap: the total was only in the progress bar at the very top of the player.
Scroll into a step and the bar is off screen, leaving a bare number badge beside the
content. Fixed by putting "of N" next to the step marker itself.

- [ ] Confirm "1 of 8" reads correctly on **Project Quest** and **Deep Dive**, and
      that it tracks as you advance.
- [ ] Confirm it's **hidden on Quick Tip** (single page, chrome suppressed) and on
      any single-step lesson — the guard is `total > 1`, so "of 1" should never show.
- [ ] Check it doesn't crowd the eyebrow on narrow/mobile widths — it sits between
      the badge and an uppercase title that can be long.
- [ ] **#160 is NOT fixed by this.** "Quick Lesson just says Step 1 and Step 2" is
      the legacy streaming view in `app/lesson/page.jsx:1750`, a different file with
      no total available. Still open.

### `d4ecf62` — #189 hidden games

Five games (Family Feud, Two Truths, Jeopardy, Millionaire, Wheel of Fortune) had
routes but no card on `/games`, so they were reachable only through "Generate your
own game". They ship with **no built-in question bank** — the route renders nothing
without `?topic=` — which is why they were never listed.

Chosen approach (Skylar, 2026-08-11): the card routes to `/games?make=<id>`, which
preselects that game in the generator and focuses the topic box. Not a direct launch.

- [ ] All **nine** cards now appear on `/games`, still ordered easy → hard.
- [ ] Clicking one of the five preselects the right game, scrolls the generator into
      view, and lands the cursor in the topic field.
- [ ] Clicking the original four still goes **straight into play** — no regression.
- [ ] The "Built on a topic you pick" line uses `var(--accent)` from the card's
      difficulty glow; check it's legible in light **and** dark.
- [ ] Deep link `/games?make=feud` works on a cold load (not just client nav).

**Not a gap — leave it alone:** AI or Human is deliberately absent from the generator.
Its own comment explains it needs genuine human-written samples, so it can't be
generated from a topic.

### Open questions that predate any commit
- [ ] **Cluster C (#163/#167) — confirm against runtime logs.** Missing
      `maxDuration` is a real defect worth fixing regardless, but a timeout is not
      the only way a screen spins forever. Don't close these on the config change
      alone. (#165 is no longer in this cluster — its cause turned out to be the
      dead end fixed in `a835860`, not a timeout.)
- [ ] **#150 — check the screenshot.** Its second sentence ("Discovery isn't
      visible to me") looks like the admin menu-visibility toggle, not CSS, and
      would be a separate item.

---

## Root-cause clusters

The 18 reports are **not 18 bugs**. Grouped by actual cause:

### A. Fixed chrome is translucent, so the page bleeds through it
**#150 (Critical), #152 (Critical), #154 (Critical)** — 3 reports, 1 cause.

The cinematic sidebar drawer (`components/cinematic/cinematic-shell.jsx:154`) paints
`background: var(--navbg)`, which is **`rgba(10,36,67,.55)` in dark mode** and
`rgba(255,255,255,.82)` in light (`app/globals.css:60-61`, `21-22`). At 55% opacity
the scrolling page shows straight through the drawer — visible in Andrea's screenshot
as the page's "…'s Pick" heading readable *behind* the "Home" row. Row labels and the
hover description popup both sit on that see-through panel, which is exactly
"the description lays transparently making it hard to read."

**This exact bug class was already fixed once elsewhere.** `.cine-popover`
(`globals.css:99-116`) exists specifically because "a translucent panel let the page
bleed through and made the game picker unreadable in dark mode (feedback #146)". The
drawer and top chrome never got the same treatment.

Fix direction: anything `position: fixed` over scrolling content gets an opaque
background, same as `.cine-popover`. Don't just raise `--navbg` opacity globally
without checking what else reads it.

Confidence: **high** for #152/#154. #150 needs a screenshot check — its second
sentence ("Home's left side aligns with Discovery as Discovery isn't visible to me")
is a *separate* point, and "Discovery isn't visible" is likely the admin
menu-visibility toggle, not a CSS bug.

### B. "Step X of Y" only exists on the read path, not the narrated one
**#162 (Critical), #164 (Critical), #160 (High)** — 3 reports, 1 cause.

The counter is rendered in `components/plan-lesson-player.jsx:1416`
(`Step {stepIdx + 1} of {total}`, where `total = steps.length` from the full plan —
reliable). But `app/lesson/page.jsx:1629` only mounts `PlanLessonPlayer` when
**`learnMode === 'read'`**. The other mode — `watch` / "Narrated lesson" — falls
through to the legacy streaming slide view, which renders a bare
`Step {idx + 1}` with **no total** (`app/lesson/page.jsx:1750`). No total is
available there by design: slides stream in one at a time, so the length isn't
known while rendering.

That is precisely #160's wording: *"It just says Step 1 and Step 2."*

Confidence: **high** for the mechanism. #162 says "Read & Practice" (a read-mode
label), which would contradict this — but Andrea's adjacent reports (#163, #166,
#167) are all explicitly Narration, so she was likely in the narrated flow and
naming the format loosely. **Confirm the mode before fixing**, because if the
counter really is missing in read mode too, this is a different bug.

Fix direction: either give the streaming view a known total up front, or show
"Step N" without the "of" until the total is known — silently rendering "of "
with nothing after it is the worst option.

### C. LLM routes with no `maxDuration` get killed mid-generation
**#163 (Critical), #165 (Critical), #167 (Critical)** — 3 reports, 1 cause.

Every route on these hang paths is missing `export const maxDuration`:

| Route | Called from | maxDuration |
|---|---|---|
| `/api/lesson/start` | `app/lesson/page.jsx:546` | **unset** |
| `/api/lesson/continue` | `app/lesson/page.jsx:709` | **unset** |
| `/api/lesson/grade` | `components/lesson-activity.jsx:161` | **unset** |
| `/api/lesson/qa` | `plan-lesson-player.jsx:384` | **unset** |
| `/api/lesson/plan` | (read path) | 300 |
| `/api/lesson/teach` | (read path) | 120 |
| `/api/lesson/quiz` | `app/lesson/page.jsx:749` | 120 |

`vercel.json` sets no function defaults, so the unset routes inherit the short
platform default rather than the 120–300s their siblings get. A long generation
gets cut off and the client spins forever. This is the **already-documented
pattern** in this repo: LLM routes need an explicit `maxDuration` or they time out
before they can even log.

The read path was hardened during the earlier latency work; **the narrated path and
the activity grader were left behind.**

`#165` is the worst of the three: `/api/lesson/grade` gates progression, so when it
dies the learner is hard-blocked — matching "I refreshed, exited and resumed and
still nothing. Course wouldn't let me move forward."

Confidence: **high** as *a* cause of these hangs. Each should still be confirmed
against runtime logs before we call it closed — a timeout is not the only way to
spin forever.

### D. Single-cause one-liners

| # | Pri | Symptom | Cause | Confidence |
|---|-----|---------|-------|-----------|
| 155, 156 | High | Chat is "Just Chat" in the menu but "Chat with your coach" on home | One hardcoded string: `components/cinematic/cinematic-home.jsx:251`. Every other surface says "Just Chat" (`lib/menu-catalog.js:20`, `sidebar.jsx:74`, `home-quick-action.jsx:14`, `cinematic-home.jsx:29`) | **certain** |
| 169 | High | AI-or-Human explanation vanishes before you can read it | Hardcoded `setTimeout(…, 2500)` auto-advance, `app/games/ai-or-human/page.jsx:67`. No way to hold the screen. Reporter's note asks for a Continue/Next click | **certain** |
| 166 | Critical | "Surprise Me" in Project Quest → Narration produces a quick tip | Surprise mode is a **Quick Win** generator (`app/lesson/page.jsx:205-206`, fetches `/api/quick-win` at :909) that runs regardless of the chosen format + learnMode, so it ignores "Project Quest / Narration" entirely | medium-high — needs the full surprise handler read |

### E. Not yet diagnosed

| # | Pri | Item | Note |
|---|-----|------|------|
| 139 | Critical | Onboarding calibration graded an AI-evals expert as very low | Per Skylar's note, **only part 2 is in scope** (grading accuracy), not "remove onboarding". Needs a look at the calibration rubric / scenario grading |
| 168 | High | No visible Refine/Regenerate inside a generating lesson | Refine *exists* (`/api/lesson/refine`, `plan-lesson-player.jsx:545`) but only on the read path and evidently not discoverable. Reporter's note: "make it more obvious" |
| 147 | High | Profile reset must be admin-only before go-live | Straightforward gate, location not yet found |
| 145 | High | AI News should tailor to role/tasks/gaps and feed the heatmap | Feature work, not a bug. Notes add: tie the top bubbles to org impact |
| 173 | High | Slack bot replies "look weird" | Likely Slack `mrkdwn` vs markdown formatting. Not investigated |

---

## Housekeeping to include in this batch

Found while working, not from feedback:

- `CLAUDE.md` still names `skylarhoover-26/Learning-Agent-Repository` as *the* repo,
  with no mention of Codefied or the dual-push rule.
- `CLAUDE.md` pre-push checklist step 3 says to confirm the remote is
  `skylarhoover-26` — that now describes `personal`, not `origin`, and will read as
  "wrong remote" to whoever runs it next.

## Items

Status: `diagnosing` → `fix written` → `committed` → `pushed`

| # | Cluster | Priority | Commit | Status |
|---|---------|----------|--------|--------|
| 150 | A chrome translucency | Critical | | cause found, needs screenshot check |
| 152 | A chrome translucency | Critical | | cause found |
| 154 | A chrome translucency | Critical | | cause found |
| 162 | B step counter | Critical | | cause found, confirm learn mode |
| 164 | B step counter | Critical | | cause found, confirm learn mode |
| 160 | B step counter | High | | cause found |
| 163 | C maxDuration | Critical | | cause found, confirm in logs |
| 165 | C maxDuration | Critical | | cause found, confirm in logs |
| 167 | C maxDuration | Critical | | cause found, confirm in logs |
| 166 | D surprise routing | Critical | | fix committed |
| 155 | D naming | High | | cause certain |
| 156 | D naming | High | | cause certain |
| 169 | D game timing | High | | cause certain |
| 139 | E calibration | Critical | | not diagnosed |
| 168 | E refine discoverability | High | | not diagnosed |
| 147 | E admin gate | High | | not diagnosed |
| 145 | E AI News tailoring | High | | not diagnosed (feature) |
| 173 | E Slack formatting | High | | not diagnosed |
| 182 | refine loop | unset (new, Azeret 8/11) | | fix committed |
| 181 | quest plan failure | unset (new, Azeret 8/11) | | diagnostics only, still open |
| 189 | hidden games | Critical (new, Skylar 8/11) | | fix committed |
