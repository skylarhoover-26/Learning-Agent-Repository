# AI Learning Companion — Bot Question Flow Spec
**Version:** 1.0 (Draft)  
**Last updated:** May 2026  
**Purpose:** Defines the exact Slack conversation sequence, branching logic, and score mapping for the AI Learning Companion bot. This document is the content spec that the bot is built from.

---

## How the Bot Works

There are two conversation types:

| Type | When it happens | Purpose |
|---|---|---|
| **Onboarding flow** | First time a user DMs the bot | Builds profile, scores all 4 dimensions, generates personalized learning plan |
| **Check-in flow** | Every 6 weeks after onboarding | Re-scores dimensions, surfaces growth, adjusts learning plan — no reminders sent, check-in is triggered when the user next DMs the bot |

**How scoring works behind the scenes:**
- Multiple choice answers map directly to a score range (defined in the scoring matrix below)
- Free-text answers are analyzed by Claude, which determines the score based on what the person describes
- Self-scores are saved to the dashboard; manager scores are entered separately by the manager

**How Slack interactions work:**
- Multiple choice = Slack buttons (tap to select)
- Open-ended = free text typed in reply
- Bot always responds within a few seconds

---

## PART 1 — ONBOARDING FLOW

### Opening Message

> 👋 Hey [First Name]! I'm your AI Learning Companion.
>
> I'm here to help you grow with AI — not just learn about it, but actually use it to do better work and drive real impact.
>
> Before I build your personalized learning plan, I'd like to understand where you are right now. This takes about 5 minutes, and your answers shape everything — so the more honest you are, the more useful your plan will be.
>
> Ready to get started?

**Buttons:** `Let's go` | `Remind me later`

---

### Section 1 — Profile Setup (3 questions, 4 for some departments)

**Q1 — Department**
> Which team are you on? This helps me tailor your learning plan to work you actually do.

**Buttons:** *(displayed as a scrollable list)*
`Analytics` | `Business Development` | `Business Solutions` | `Customer Success` | `Enablement` | `Engineering` | `Enterprise` | `Executive` | `Finance` | `Information Systems` | `Innovation` | `Internal Tooling` | `Legal` | `Marketing` | `Partner Development` | `People` | `Product` | `Risk` | `Sales` | `Strategy and Operations`

*Saves to profile as: department*  
*No score — used for curriculum personalization only*

---

**Q1b — Sub-team** *(shown only if department = Business Solutions, Customer Success, Engineering, or Risk)*

> Got it — which team within [department] are you on?

**If Business Solutions:**  
`Bookkeeping` | `Operations` | `Payroll` | `Success Advisors` | `Tax`  
*Note: _NA variants select the non-NA equivalent (e.g. Bookkeeping_NA → Bookkeeping)*

**If Customer Success:**  
`Account Management` | `Onboarding` | `Operations` | `Pro Advocate` | `QA` | `Retention` | `Success Advisors` | `Support` | `Website Onboarding`  
*Note: _NA variants select the non-NA equivalent*

**If Engineering:**  
`Core` | `Data Engineering` | `DevOps` | `Fintech` | `Innovation` | `Internal Tooling` | `QA` | `Talent Programs`

**If Risk:**  
`Fraud Data Analysts` | `Operations` | `Payment Support` | `Risk Analysts`

*Saves to profile as: sub_team*  
*No score — used alongside department to sharpen curriculum task selection*

---

**Q2 — AI starting point (warm-up, unscored)**
> Before we dive in — how would you describe your relationship with AI tools right now?

**Buttons:**
- `A` — Just getting started — I know the basics but haven't done much
- `B` — Curious and experimenting — I try things but it's not a regular habit yet
- `C` — Regular user — AI is already part of how I work
- `D` — Power user — I use AI heavily and think about it strategically

*Saves to profile as: starting_point*  
*No score — used to calibrate tone and complexity of follow-up questions*

---

**Q2b — Task discovery**
> Now, what does most of your typical week look like? Pick the 3 tasks that take up the most of your time.

*The task list shown is pulled from the curriculum map for their specific department (and sub-team where applicable). The bot shows up to 8 options as buttons — always the tasks listed in that department's curriculum map, ordered by module priority.*

*Saves to profile as: top_tasks (array of up to 3)*  
*No score — directly shapes which tasks are featured in Modules 2, 3, and 4*  
*The #1 selected task becomes the Module 2 "quick win" starting point*

**Example — if department = Marketing:**
`Writing content` | `Research & market analysis` | `Campaign briefing` | `Performance reporting` | `SEO & keyword content` | `Copywriting & messaging` | `Workflow automation`

**Example — if department = Customer Success, sub-team = Support:**
`Writing ticket responses` | `Handling escalations` | `Building knowledge base articles` | `Onboarding new customers` | `Writing customer communications` | `Quality review` | `Process documentation`

**Example — if department = Engineering, sub-team = Data Engineering:**
`Writing SQL & pipeline code` | `Data documentation` | `Debugging & troubleshooting` | `Code review` | `Stakeholder reporting on data` | `Test writing` | `Technical documentation`

**What happens with the selections:**

| Selection | How it shapes the curriculum |
|---|---|
| Task ranked #1 | Becomes the Module 2 opening — bot leads with the quick win for this task |
| Task ranked #2 | Featured in Module 3 prompting exercises |
| Task ranked #3 | Featured in Module 4 workflow-building exercise |
| All 3 tasks | Used throughout as examples in Module 1 AI Foundations, contextualized to their actual work |

**Follow-up (shown after task selection):**
> Thanks — one more thing. Are there any repetitive parts of those tasks you wish you could hand off or speed up dramatically?

*Input type: Free text*  
*Saves to profile as: automation_goal*  
*Used in Module 4 to frame the "Building and Automating" lesson around something they've already identified as worth solving*

---

### Section 2 — Personal Impact (2 questions)

> Now let's look at the impact AI is having on your own work.

---

**Q3 — Personal Impact: core question**
> Which of these best describes how AI affects your day-to-day output?

**Buttons:**
- `A` — I haven't really used AI in a meaningful way yet
- `B` — I've tried a few things, but it hasn't changed how I work
- `C` — I use AI for specific tasks and it's saving me real time or improving quality
- `D` — AI has genuinely changed what I can produce — my work is noticeably better or faster because of it

| Answer | Score |
|---|---|
| A | 1 |
| B | 2 |
| C | 3 |
| D | → Go to Q3b |

---

**Q3b — Personal Impact: follow-up (only shown if D)**
> That's great. Can you give me a quick example of how AI has changed what you produce or deliver?

*Input type: Free text*  
*Claude analyzes the response and scores as follows:*

| What they describe | Score |
|---|---|
| Vague or generic (e.g., "it helps me write faster") | 3 |
| Specific productivity improvement with clear before/after | 4 |
| Measurable business outcome — faster delivery, higher quality, more volume, reduced rework | 5 |

---

### Section 3 — Team Impact (2 questions)

> Now let's think about your teammates.

---

**Q4 — Team Impact: core question**
> Which best describes what's happening on your team with AI?

**Buttons:**
- `A` — People are mostly figuring it out on their own — there's no shared approach
- `B` — A few of us use AI, but we don't really talk about it or share what's working
- `C` — I sometimes share what I've learned and help colleagues try things out
- `D` — I actively coach my team on AI — it's something I intentionally bring into our work

| Answer | Score |
|---|---|
| A | 1 |
| B | 2 |
| C | 3 |
| D | → Go to Q4b |

---

**Q4b — Team Impact: follow-up (only shown if D)**
> What's a recent example of you helping someone on your team use AI more effectively?

*Input type: Free text*  
*Claude analyzes the response and scores as follows:*

| What they describe | Score |
|---|---|
| A single instance of helping a colleague | 3 |
| Regular pattern of coaching or sharing with clear improvement in others' work | 4 |
| Systematic, ongoing enablement — whole team using AI better because of their direct involvement | 5 |

---

### Section 4 — Org Impact (1 question)

> Now let's zoom out to the bigger picture.

---

**Q5 — Org Impact: core question**
> Can you connect your AI usage to any team goals or broader business outcomes?

**Buttons:**
- `A` — Not really — I use AI, but I haven't thought about it in terms of goals or outcomes
- `B` — Loosely — some of what I do with AI relates to our goals, but I can't point to clear results
- `C` — Yes — I can point to specific ways AI has helped us move faster or deliver better on our goals
- `D` — Definitely — I've built or shared AI practices that others now use, and I can show the impact

| Answer | Score |
|---|---|
| A | 1 |
| B | 2 |
| C | 3 |
| D | 4–5 (Claude assesses follow-up context) |

*Note: If D is selected, bot asks: "What's an example?" and Claude determines 4 vs. 5 based on whether the impact is individual/team-level (4) or cross-functional/org-level with demonstrated outcomes (5).*

---

### Section 5 — AI Development (1 question)

> Last one — this one is about your knowledge and curiosity around AI itself.

---

**Q6 — AI Development: core question**
> When it comes to understanding and experimenting with AI — which feels most like you?

**Buttons:**
- `A` — I know the basics, but I'm still learning what's out there
- `B` — I use a handful of tools comfortably — I'm consistent but not experimenting much
- `C` — I actively try new things and can adapt AI tools to different situations
- `D` — I go deep — I understand how models work, I experiment with new techniques, and others come to me for guidance

| Answer | Score |
|---|---|
| A | 1–2 |
| B | 3 |
| C | 4 |
| D | 5 |

*Note: For A, bot asks one clarifying question: "Have you used any AI tools at work yet, even casually?" → Yes = score 2, No = score 1*

---

### Learning Plan Generation

After all questions are answered, the bot generates a summary and learning plan:

> Here's your AI Impact profile, [First Name]:
>
> 📊 **Personal Impact:** [Level label] ([score]/5)
> 👥 **Team Impact:** [Level label] ([score]/5)
> 🏢 **Org Impact:** [Level label] ([score]/5)
> 🧠 **AI Development:** [Level label] ([score]/5)
>
> **Overall AI Impact Level: [Low / Medium / High]**
>
> Based on your role and where you are right now, I've put together a 5-module learning path for you. It's designed to move you from where you are today toward [next level up].
>
> **Your Learning Path:**
> ✅ Module 1: [Title] — [one-line description]
> ⬜ Module 2: [Title]
> ⬜ Module 3: [Title]
> ⬜ Module 4: [Title]
> ⬜ Module 5: [Title]
>
> You can work through these at your own pace. I'll check in every 6 weeks to track your progress and update your scores.
>
> You can also ask me anything, anytime — just DM me or mention me in a channel.
>
> Want to start Module 1 now?

**Buttons:** `Start Module 1` | `Save for later`

---

## PART 2 — CHECK-IN FLOW

*Triggered automatically every 6 weeks. Bot initiates the DM.*

### Opening Message

*Triggered when a user DMs the bot and 6 or more weeks have passed since their last check-in. No proactive reminder is sent — the check-in happens naturally when they next engage with the bot.*

> Hey [First Name]! It's been a little while — before we get into it, mind if I do a quick 2-minute check-in on your AI progress? Your answers update your scores on the dashboard.

**Buttons:** `Sure, let's do it` | `Skip for now`

---

### Check-in Question 1 — Personal Impact update

> Since we last talked, has the way you use AI in your own work changed?

**Buttons:**
- `A` — Not much — about the same as before
- `B` — Yes — I'm using it more consistently now
- `C` — Yes — I'm using it for things I wasn't doing before
- `D` — Yes — I've delivered something I can point to as a real AI-driven outcome

| Answer | Score adjustment |
|---|---|
| A | Score stays the same |
| B | +0.5 to 1 point |
| C | +1 point |
| D | → Follow-up for 4 or 5 |

---

### Check-in Question 2 — Team Impact update

> Has anything changed in how AI is used across your team?

**Buttons:**
- `A` — Not really — still mostly individual
- `B` — Yes — I've shared more or helped a colleague apply AI
- `C` — Yes — there's now a more consistent approach on my team and I helped create it

| Answer | Score adjustment |
|---|---|
| A | Score stays the same |
| B | +0.5 to 1 point |
| C | +1 to 2 points |

---

### Check-in Question 3 — Blockers (shown only if no improvement in Q1 or Q2)

> What's been getting in the way of using AI more? (This helps me adjust your learning plan)

**Buttons:**
- `A` — Too busy — haven't had time to focus on it
- `B` — Not sure how to apply it to my actual work
- `C` — I've been using it the same amount, just not leveling up
- `D` — Something else

*Bot adjusts next module recommendation based on answer.*

---

### Check-in Closing

> Here's where you stand now, [First Name]:
>
> 📊 **Personal Impact:** [old score] → [new score] [↑ or →]
> 👥 **Team Impact:** [old score] → [new score]
> 🏢 **Org Impact:** [old score] → [new score]
> 🧠 **AI Development:** [old score] → [new score]
>
> [If improvement]: 🎉 Nice growth since last time — keep building on it.
> [If flat]: No change yet — that's okay. Here's what I'd focus on next: [next module or suggested action]
>
> Your dashboard has been updated. Talk soon!

---

## SCORING MATRIX — Full Reference

### Personal Impact

| Score | Label | What it looks like |
|---|---|---|
| 1 | Needs Improving | Does not use AI, or usage has no effect on work output |
| 2 | Still Developing | Occasional or surface-level use — minimal productivity effect |
| 3 | Fully Successful | Uses AI for common tasks with noticeable but inconsistent efficiency gains |
| 4 | Often Exceeds | Regularly uses AI to improve quality and speed across multiple tasks |
| 5 | Role Model | AI generates measurable business value — output volume, speed, or quality has meaningfully improved |

### Team Impact

| Score | Label | What it looks like |
|---|---|---|
| 1 | Needs Improving | Does not promote or support AI usage within the team |
| 2 | Still Developing | Limited focus on enabling AI — adoption is individual, not manager-driven |
| 3 | Fully Successful | Supports basic team AI use — some adoption, but not consistent across team |
| 4 | Often Exceeds | Actively encourages and helps direct reports apply AI — clear efficiency improvements |
| 5 | Role Model | Builds a strong AI culture — coaches team, drives measurable team-level productivity and quality gains |

### Org Impact

| Score | Label | What it looks like |
|---|---|---|
| 1 | Needs Improving | AI use doesn't connect to departmental OKRs — no contribution to org adoption |
| 2 | Still Developing | Ad hoc efforts — limited connection to goals, not yet tied to OKRs |
| 3 | Fully Successful | AI supports team or departmental OKRs — impact present but limited to immediate scope |
| 4 | Often Exceeds | Actively integrates AI into departmental workflows — contributes to broader initiatives |
| 5 | Role Model | Drives AI adoption at department level — establishes scalable practices, delivers measurable impact against OKRs |

### AI Development

| Score | Label | What it looks like |
|---|---|---|
| 1 | Needs Improving | Little to no understanding or usage — no meaningful experimentation |
| 2 | Still Developing | Limited knowledge — some usage but minimal experimentation, needs guidance |
| 3 | Fully Successful | Solid baseline — uses AI tools effectively, occasionally experiments |
| 4 | Often Exceeds | Strong working knowledge — experiments regularly, adapts tools to different use cases |
| 5 | Role Model | Deep understanding — experiments with new models/techniques, shares knowledge, influences how others use AI |

---

## Design Notes

**Keep it conversational, not survey-like**
The bot should feel like a colleague asking questions, not a form. Each question leads naturally to the next. Avoid jargon. Use plain language.

**Let Claude score open-ended answers**
For free-text responses, Claude analyzes what the person describes and maps it to a score. This is better than asking people to rate themselves on a scale — it surfaces what they actually do rather than what they think they should say.

**Don't ask all questions every time**
Check-ins are shorter than onboarding. If someone scores a 5 in a dimension at onboarding, the check-in for that dimension is a single confirmation question, not a full re-assessment.

**Respect people's time**
Onboarding: ~5 minutes, ~6-8 questions total
Check-ins: ~2 minutes, ~2-4 questions total

**Privacy boundary**
Self-scores are visible to the learner and their manager on the dashboard. The specific text of free-text answers is private to the learner — only the resulting score is surfaced to the manager.
