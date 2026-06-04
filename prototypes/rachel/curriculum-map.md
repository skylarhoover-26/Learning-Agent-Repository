# AI Learning Companion — Curriculum Map
**Version:** 1.1 (Draft)  
**Last updated:** May 2026  
**Primary tool:** Gemini (tool-agnostic concepts, Gemini used in examples)

## Full Org Structure

| Department | Sub-teams |
|---|---|
| Analytics | Data Analytics, Data Science |
| Business Development | Business Development |
| Business Solutions | Bookkeeping, Bookkeeping_NA, Operations, Payroll, Payroll_NA, Success Advisors, Tax |
| Customer Success | Account Management, Onboarding, Onboarding_NA, Operations, Pro Advocate, QA, Retention, Success Advisors, Support, Support_NA, Website Onboarding, Website Onboarding_NA |
| Enablement | Enablement Operations, Instructional Design, Training, Program Management |
| Engineering | Core, Data Engineering, DevOps, Fintech, Innovation, Internal Tooling, QA, Talent Programs |
| Enterprise | Account Management, Onboarding, Operations |
| Executive | Executive |
| Finance | Accounting, Financial Planning and Analysis |
| Information Systems | Compliance, Information Security, Information Systems |
| Innovation | Innovation |
| Internal Tooling | Enterprise Applications, Product Management, Talent Programs |
| Legal | Legal |
| Marketing | Brand, Growth, Integrated Marketing, Product Marketing |
| Partner Development | Partner Development |
| People | Analytics and Compensation, Organizational Development and Learning, People Operations, Talent Acquisition |
| Product | Product Design, Product Management, Product Operations |
| Risk | Fraud Data Analysts, Operations, Payment Support, Risk Analysts |
| Sales | Inbound, Inbound_NA, Operations, Outbound, Outbound_NA |
| Strategy and Operations | Strategy and Operations |

### On "_NA" sub-teams
Teams labelled `_NA` (e.g. Bookkeeping_NA, Payroll_NA) follow the same curriculum path as their counterpart. The bot does not create a separate learning track — it applies the same role mapping and uses the same task examples.

### On sub-team depth
The bot asks for department during onboarding, then asks a follow-up: *"Which team are you on?"* for departments where sub-teams have meaningfully different day-to-day work (Business Solutions, Customer Success, Engineering, Risk). For departments where sub-teams do similar work at different levels or in different regions, the department-level curriculum applies.

### Company context — fintech
This org operates in financial services (bookkeeping, payroll, tax, payments, fraud). This shapes curriculum in three ways:
1. **Higher verification bar** — AI output touching financial figures, tax guidance, legal language, or client account data must always be human-verified before use. The bot reinforces this in Module 1 and throughout.
2. **Data privacy emphasis** — client financial data and PII are never to be entered into AI tools. The bot teaches what to anonymize or paraphrase before prompting.
3. **Role-specific compliance awareness** — Legal, Risk, Finance, and Business Solutions sub-teams receive additional Module 1 content on responsible AI use in regulated contexts.

---

## How This Document Works

The bot does not serve pre-written lesson content. Instead, this document defines:
- **What** to teach (learning objectives per module per role)
- **Which tasks** to focus on (role-specific task map)
- **What AI can do** for each task (so Claude can generate accurate, relevant content)
- **What success looks like** (so the dashboard can measure real impact)

Claude generates the actual lesson text, scenarios, and prompts dynamically based on this blueprint. When AI capabilities evolve, the content evolves with it — no manual updates required.

---

## Proposed Success Framework

Since success at the task level wasn't defined yet, here is a proposed framework tied to module completion and the existing AI Impact scoring system.

### Task-Level Milestones (per learner, per module)

| Module | What success looks like | Impact Score signal |
|---|---|---|
| 1 — AI Foundations | Learner can name 3 tasks in their role where AI would help and explain why | Moving from score 1 to 2 on AI Development |
| 2 — AI for Your Core Tasks | Learner has used AI for a work task this week — got a useful draft, summary, or answer | Moving from score 2 to 3 on Personal Impact |
| 3 — Prompting That Works | Learner has at least one saved prompt they use regularly for their most common task | Holding or improving score 3 on Personal Impact |
| 4 — Building and Automating | Learner has documented and repeatable AI workflow they use consistently | Reaching score 4 on Personal Impact |
| 5 — Measuring Impact | Learner can describe a before/after example and connect it to a team goal or OKR | Reaching score 4–5 on Org Impact |

### Program-Level Benchmarks (what L&D tracks on the dashboard)

These are starting benchmarks to revisit after the first pilot cohort.

| Timeframe | Target |
|---|---|
| 30 days after onboarding | 80% of team has completed Module 2 (first real AI use) |
| 90 days | 50% of team has a documented workflow (Module 4 complete) |
| 180 days | 25% of team can describe measurable impact tied to a goal (Module 5 complete) |
| Quarterly | Manager scores rising by at least 1 point on team average across all 4 dimensions |

---

## Universal Content — Applies to All Roles

These concepts are covered in Module 1 for everyone, but illustrated with role-specific examples pulled from the learner's profile.

| Concept | What the bot teaches | Why it matters |
|---|---|---|
| What AI actually is | LLMs predict and generate language — they don't "know" things the way humans do | Sets realistic expectations, prevents frustration |
| What AI is good at | Drafting, summarizing, researching, structuring, brainstorming, explaining, translating | Helps learner identify opportunities in their own work |
| What AI is not good at | Real-time data, precise calculations, legal/financial certainty, personal judgment calls | Prevents misuse and builds appropriate trust |
| How to talk to AI | Clear context + specific ask + desired format = better output | Foundation of all prompting |
| Privacy and data | What not to put in AI tools — PII, confidential data, proprietary info | Protects the org |
| When to verify output | Any fact, number, legal claim, or external reference needs human verification | Builds responsible usage habits |

---

## Role-by-Role Curriculum Map

Each role section includes:
- The top tasks for that role
- What AI can do for each task
- The quick win to try first (used in Module 2)
- A sample Gemini prompt (used in Module 3)
- Which module the task lives in

For departments where the bot asks a sub-team question (Business Solutions, Customer Success, Engineering, Risk), the sub-team adjusts which tasks are prioritized in Modules 2–4. The department-level task map applies to all sub-teams; the sub-team notes below define which tasks to surface first and any sub-team-specific additions.

---

### BUSINESS SOLUTIONS — Sub-team Notes

*All sub-teams follow the Business Solutions curriculum. The bot prioritizes tasks based on sub-team selection.*

| Sub-team | Prioritize these tasks first | Additional context |
|---|---|---|
| Bookkeeping | Client financial communication, process documentation, summarizing account activity | Emphasize: never enter client financial data into AI — paraphrase or anonymize first |
| Payroll | Process documentation, compliance summaries, client FAQ writing, payroll communication | Emphasize: payroll figures and employee data are never to be entered into AI tools |
| Tax | Research summarization, client explanation writing, documentation — with strong verification emphasis | Emphasize: AI tax output is a starting point only — all guidance requires professional review |
| Success Advisors | Client advisory communication, upsell research, client-specific recommendations, QBR prep | Standard Business Solutions curriculum applies |
| Operations | Process documentation, reporting narratives, cross-team coordination | Standard Business Solutions curriculum applies |

---

### CUSTOMER SUCCESS — Sub-team Notes

*All sub-teams follow the Customer Success curriculum. The bot prioritizes tasks based on sub-team selection.*

| Sub-team | Prioritize these tasks first | Additional context |
|---|---|---|
| Account Management | Client communications, QBR/EBR prep, renewal strategy | Focus on relationship depth and expansion |
| Onboarding | Onboarding documentation, welcome plans, first-week client communications | Focus on speed to value and client confidence |
| Support | Ticket response drafting, escalation writing, knowledge base articles | Focus on response quality and speed |
| Retention | Churn risk analysis summaries, retention communication templates, save conversation prep | Focus on identifying and addressing risk signals |
| QA | QA rubric development, feedback synthesis, quality reporting narratives | Focus on documentation and pattern identification |
| Pro Advocate | Client advocacy case building, feedback synthesis, stakeholder communication | Standard Customer Success curriculum applies |
| Website Onboarding | Onboarding flow documentation, client communication templates, FAQ writing | Same as Onboarding sub-team |
| Success Advisors | Advisory communication, client recommendations, proactive outreach | Same as Account Management focus |
| Operations | Process documentation, reporting, cross-team coordination | Standard Customer Success curriculum applies |

---

### ENGINEERING — Sub-team Notes

*All sub-teams follow the Engineering curriculum. The bot prioritizes tasks based on sub-team selection.*

| Sub-team | Prioritize these tasks first | Additional context |
|---|---|---|
| Core | Code writing, debugging, documentation, code review | Standard Engineering curriculum applies |
| Data Engineering | SQL and pipeline-related prompts, data documentation, data quality | Overlap with Analytics curriculum — lean toward data-specific prompts |
| DevOps | Infrastructure documentation, runbook writing, incident post-mortems, script generation | Focus on automation and documentation |
| Fintech | Code writing with financial context, compliance-aware documentation, security considerations | Emphasize: financial logic and payment code requires rigorous human review |
| Innovation | Research synthesis, POC documentation, rapid prototyping | Overlap with Innovation department curriculum |
| Internal Tooling | Automation script writing, requirements translation, technical documentation | Standard Engineering + Internal Tooling curriculum applies |
| QA | Test case generation, QA documentation, bug report writing | Focus on test coverage and documentation |
| Talent Programs | Program documentation, communication writing, process design | Lean toward Enablement/People curriculum for non-technical tasks |

---

### RISK — Sub-team Notes

*All sub-teams follow the Risk curriculum. The bot prioritizes tasks based on sub-team selection.*

| Sub-team | Prioritize these tasks first | Additional context |
|---|---|---|
| Fraud Data Analysts | Pattern documentation, alert triage summaries, fraud narrative writing, SQL queries | Emphasize: never enter real transaction data or customer PII into AI tools |
| Risk Analysts | Risk assessment documentation, policy summaries, compliance reporting | Standard Risk curriculum applies |
| Payment Support | Payment issue documentation, client-facing communication, escalation writing | Blend of Risk and Customer Success Support curriculum |
| Operations | Process documentation, reporting, cross-team coordination | Standard Risk curriculum applies |

---

### MARKETING

**Who this covers:** Content, Demand Gen, Brand, Social, Email, Campaign Management  
**Primary AI opportunity:** Content creation and research at scale — more output, faster iteration, consistent quality

| Task | What AI can do | Quick win | Sample Gemini prompt | Module |
|---|---|---|---|---|
| Writing content (blogs, social, email) | Draft full pieces from a brief, repurpose one piece into multiple formats, write variations for A/B testing | Paste your last blog brief into Gemini and ask it to write a first draft | "Write a 600-word blog post for [audience] about [topic]. Tone: [conversational/professional]. Include a clear takeaway and a CTA to [goal]." | 2 |
| Competitor and market research | Summarize competitive positioning, identify messaging gaps, synthesize trends from multiple sources | Ask Gemini to summarize the key AI trends relevant to your audience this quarter | "Summarize the top 5 trends in [industry] right now that a marketing team should be aware of. Include why each matters and what it means for messaging." | 2 |
| Campaign briefing | Draft a full campaign brief from bullet points, ensure all stakeholder questions are addressed | Give Gemini your campaign idea in 3 sentences and ask it to expand it into a brief | "Turn these notes into a full campaign brief: [paste notes]. Include: objective, audience, key messages, channels, and success metrics." | 2 |
| Reporting and performance write-ups | Turn raw data into narrative summaries, draft exec-ready insights | Paste your campaign metrics and ask for a narrative summary | "Here are campaign results: [paste data]. Write a 3-paragraph performance summary for a leadership audience. Lead with the most important insight." | 3 |
| SEO and keyword content | Generate keyword-optimized outlines, write meta descriptions, identify content gaps | Ask Gemini to generate a content outline optimized for a target keyword | "Create a content outline for a page targeting the keyword '[keyword]'. Include H2s, key points to cover, and a recommended meta description." | 3 |
| Copywriting variations | Generate multiple headline or CTA options instantly for testing | Paste one headline and ask for 10 variations in different tones | "Write 10 variations of this headline: '[headline]'. Vary the tone from urgent to curious to benefit-led. Label each approach." | 3 |
| Workflow automation | Build a repeatable process for content repurposing (one piece → many formats) | Document your repurposing steps and have Gemini help you turn them into a reusable prompt template | "Create a prompt template I can reuse to repurpose any blog post into: a LinkedIn post, a 3-email nurture sequence, and 5 social captions." | 4 |

---

### ENGINEERING

**Who this covers:** Software Engineers, Backend, Frontend, Full Stack, QA, Platform  
**Primary AI opportunity:** Accelerating code writing, debugging, and documentation — more time for architecture and complex problem-solving

| Task | What AI can do | Quick win | Sample Gemini prompt | Module |
|---|---|---|---|---|
| Writing code | Generate boilerplate, write functions from descriptions, suggest implementations | Ask Gemini to write a function you'd normally write from scratch | "Write a [language] function that [description of what it should do]. Include error handling and add inline comments explaining each section." | 2 |
| Debugging | Identify likely causes of errors, suggest fixes, explain what went wrong | Paste an error message and the relevant code and ask for help | "Here's an error I'm seeing: [error message]. Here's the relevant code: [paste code]. What's causing this and how do I fix it?" | 2 |
| Code review | Spot potential issues, suggest improvements, check for common vulnerabilities | Paste a PR diff and ask for a review before your human reviewer sees it | "Review this code for bugs, performance issues, and readability. Suggest improvements with explanations: [paste code]." | 2 |
| Writing documentation | Generate README files, API docs, and inline comments from existing code | Paste a function and ask Gemini to write the docstring | "Write clear documentation for this function: [paste code]. Include: what it does, parameters, return values, and a usage example." | 3 |
| Translating technical concepts for stakeholders | Rewrite technical explanations in plain language for non-technical audiences | Take your last technical status update and ask Gemini to translate it for a business audience | "Rewrite this technical update for a non-technical audience. Avoid jargon. Focus on what it means for the product and timeline: [paste update]." | 3 |
| Test writing | Generate unit tests from function descriptions, suggest edge cases | Ask Gemini to write tests for a function you just wrote | "Write unit tests for this function in [framework]: [paste function]. Cover normal cases, edge cases, and expected errors." | 3 |
| Workflow automation | Build repeatable prompts for code review, documentation, and PR descriptions | Create a standard prompt template for PR descriptions that your whole team uses | "Create a reusable prompt template that generates a clear PR description from: a summary of changes, the files touched, and the ticket reference." | 4 |

---

### SALES

**Who this covers:** Account Executives, SDRs, Sales Managers, Account Managers  
**Primary AI opportunity:** More personalized outreach in less time, better call prep, faster follow-up

| Task | What AI can do | Quick win | Sample Gemini prompt | Module |
|---|---|---|---|---|
| Lead research | Summarize a prospect's business, identify pain points, surface relevant news | Paste a prospect's LinkedIn or website and ask Gemini to summarize what matters for your pitch | "Summarize this company for a sales call. Focus on: what they do, likely pain points for [your product area], recent news, and questions I should ask: [paste company info]." | 2 |
| Writing outreach emails | Draft personalized cold and follow-up emails, write multiple variations | Paste a prospect's info and ask Gemini to write a first outreach email | "Write a personalized cold email to [name], [title] at [company]. Reference: [specific detail]. Goal: book a 20-minute call. Keep it under 100 words. No jargon." | 2 |
| Call preparation | Generate a call agenda, anticipate objections, prepare discovery questions | Ask Gemini to prepare you for a specific call based on what you know about the account | "Prepare me for a discovery call with [company] in [industry]. Suggest: 5 discovery questions, likely objections and responses, and a clear call objective." | 2 |
| Follow-up emails | Draft timely, relevant follow-up emails after calls and demos | Right after a call, paste your notes and ask for a follow-up draft | "Write a follow-up email based on these call notes: [paste notes]. Reference what we discussed, recap next steps, and keep it warm but concise." | 3 |
| Proposals and presentations | Draft proposal narratives, create exec summaries, structure slide content | Give Gemini your deal context and ask it to draft the executive summary | "Write an executive summary for a proposal to [company]. Their challenge: [describe]. Our solution: [describe]. Key outcomes: [describe]. Tone: confident and consultative." | 3 |
| CRM notes and updates | Summarize call notes into clean CRM entries, extract action items | Paste your raw call notes and ask for a clean CRM-ready summary | "Summarize these call notes into a CRM entry: [paste notes]. Format: what was discussed, next steps, and any risks or opportunities to flag." | 3 |
| Objection handling prep | Build a personalized objection-response guide for a specific deal | Ask Gemini to prepare you for the toughest objections on your current deal | "List the 5 most likely objections for selling [product] to a [company type] and write a strong, honest response to each." | 4 |

---

### CUSTOMER SUCCESS

**Who this covers:** Customer Success Managers, Onboarding Specialists, Account Health, Renewals  
**Primary AI opportunity:** Faster, more personalized customer communication and proactive health management

| Task | What AI can do | Quick win | Sample Gemini prompt | Module |
|---|---|---|---|---|
| Writing customer communications | Draft check-in emails, onboarding messages, renewal outreach — personalized at scale | Paste a customer's context and ask for a check-in email | "Write a warm check-in email to [customer name] at [company]. They've been a customer for [time], recently [milestone/challenge]. Goal: schedule a call to review progress." | 2 |
| QBR and EBR preparation | Build the narrative structure for reviews, draft talking points from account data | Paste account data and ask for a QBR structure | "Build a QBR structure for [customer] based on this data: [paste metrics]. Include: what went well, what to improve, and 3 recommendations for next quarter." | 2 |
| Onboarding documentation | Create customized onboarding plans, welcome materials, training outlines | Ask Gemini to generate a 30-day onboarding plan for a new customer type | "Create a 30-day onboarding plan for a new [customer type] customer. Include key milestones, who owns each step, and what success looks like at day 30." | 2 |
| Escalation writing | Draft clear, professional escalation summaries for internal stakeholders | Paste your escalation notes and ask for a clean summary | "Write an internal escalation summary for [customer]. Include: the issue, timeline, customer impact, what we've tried, and recommended next steps." | 3 |
| Renewal preparation | Build the business case for renewal, identify risk signals, draft the renewal narrative | Ask Gemini to help you build the renewal case from account health data | "Build a renewal business case for [customer]. They've been with us [time], usage is [high/low], key wins include [describe]. Write a narrative that makes staying the obvious choice." | 3 |
| Health analysis | Summarize customer health signals from usage data, identify at-risk patterns | Paste usage data into Gemini and ask what it signals | "Here is usage data for [customer]: [paste data]. What does this suggest about their engagement? Are there any risk signals I should address?" | 4 |
| Playbook building | Build repeatable playbooks for onboarding, escalation, and renewal workflows | Turn your best process into a documented, reusable playbook using AI | "Turn these steps into a formal playbook for [onboarding / escalation / renewal]: [paste process notes]. Format it so a new CSM could follow it on day one." | 4 |

---

### BUSINESS SOLUTIONS

**Who this covers:** Business Analysts, Solutions Consultants, Strategy, Process Improvement  
**Primary AI opportunity:** Faster synthesis, clearer recommendations, and better-structured business cases

| Task | What AI can do | Quick win | Sample Gemini prompt | Module |
|---|---|---|---|---|
| Requirements gathering | Turn messy stakeholder input into structured requirements documents | Paste raw meeting notes and ask for a structured requirements doc | "Turn these stakeholder notes into a structured requirements document: [paste notes]. Format: problem statement, goals, functional requirements, constraints, open questions." | 2 |
| Process documentation | Map out workflows from descriptions, identify gaps and redundancies | Describe a process and ask Gemini to map it and flag inefficiencies | "Document this process as a step-by-step workflow: [describe process]. Then identify any steps that seem redundant, risky, or could be automated." | 2 |
| Business case writing | Draft the narrative, structure the argument, suggest ROI framing | Give Gemini your recommendation and ask it to build the business case | "Write a business case for [recommendation]. Include: the problem, proposed solution, expected benefits, estimated costs, risks, and a recommended decision." | 2 |
| Stakeholder presentations | Structure slide narratives, write executive summaries, build the storyline | Turn your recommendation into a presentation structure | "Build a presentation structure for recommending [solution] to [audience]. Start with the problem, build the case, and end with a clear ask. Suggest 8 slides with talking points for each." | 3 |
| ROI analysis | Frame financial benefit cases, calculate time-to-value, structure impact narratives | Ask Gemini to help frame the ROI of a project you're working on | "Help me frame the ROI for [project]. Benefits include: [list]. Costs include: [list]. What's the strongest way to present this to a finance-minded audience?" | 3 |
| Competitive or market analysis | Synthesize research, compare options, structure recommendations | Paste research notes and ask for a comparison and recommendation | "Compare these three options based on the following criteria: [list]. Then recommend the best option with a clear rationale: [paste options]." | 4 |

---

### ANALYTICS

**Who this covers:** Data Analysts, BI Analysts, Data Scientists, Reporting  
**Primary AI opportunity:** Faster query writing, clearer data storytelling, and better stakeholder communication of insights

| Task | What AI can do | Quick win | Sample Gemini prompt | Module |
|---|---|---|---|---|
| Writing SQL queries | Generate, optimize, and explain SQL from plain-language descriptions | Describe what you want from your data and ask Gemini to write the query | "Write a SQL query that [describe what you want]. Tables: [list tables and key columns]. Filter for: [conditions]. Return: [output columns]." | 2 |
| Summarizing and interpreting data | Turn numbers into clear narrative insights, identify what matters most | Paste a data table and ask what story it tells | "Here's a dataset: [paste data]. What are the 3 most important insights? What would you recommend based on what you see?" | 2 |
| Writing insight summaries for stakeholders | Translate analytical findings into plain-language executive summaries | Take your last analysis and ask Gemini to write the stakeholder summary | "Write an executive summary of this analysis for a non-technical audience: [paste findings]. Lead with the most important takeaway. Keep it to 3 short paragraphs." | 2 |
| Hypothesis formation | Brainstorm potential causes, suggest what to test next, structure analytical questions | When you're stuck, ask Gemini to help you think through possible explanations | "I'm seeing [describe anomaly or trend] in our data. What are the most likely explanations? What would I need to test to confirm each one?" | 3 |
| Data quality documentation | Write data dictionaries, flag potential data quality issues, document assumptions | Ask Gemini to help you document a dataset you're working with | "Help me write a data dictionary for this table: [paste schema]. Include a description of each field, expected values, and any known data quality issues." | 3 |
| Dashboard and report narratives | Write the written commentary that accompanies dashboards and reports | Take your dashboard metrics and ask Gemini to write the accompanying narrative | "Write a monthly performance narrative based on these metrics: [paste metrics]. Highlight what changed, why it likely changed, and what we should watch next month." | 4 |

---

### FINANCE

**Who this covers:** Finance Business Partners, FP&A, Accounting, Financial Reporting  
**Primary AI opportunity:** Faster reporting narratives, clearer stakeholder communication, and smarter variance analysis framing

| Task | What AI can do | Quick win | Sample Gemini prompt | Module |
|---|---|---|---|---|
| Variance analysis write-ups | Turn numbers into clear narrative explanations of why things changed | Paste your variance data and ask for a narrative explanation | "Write a variance analysis narrative for [period]. Actuals vs. budget: [paste data]. Explain the key drivers in plain language for a business audience." | 2 |
| Financial report preparation | Draft the written sections of financial reports, create exec summaries | Ask Gemini to draft the narrative section of your next report | "Write the executive summary section of our monthly financial report. Key figures: [paste]. Highlight performance vs. plan, key drivers, and outlook." | 2 |
| Budget preparation support | Structure budget narratives, draft justification memos, summarize assumptions | Paste your budget build and ask for a justification narrative | "Write a budget justification memo for [department/line item]. Budget request: [amount]. Rationale: [paste notes]. Audience: Finance leadership." | 3 |
| Stakeholder communication | Translate financial data into clear, non-jargon communication for business partners | Take a financial update and rewrite it for a non-finance stakeholder | "Rewrite this financial update for a non-finance audience: [paste update]. Focus on what it means for the business, not the accounting." | 3 |
| Contract and document review support | Summarize key terms, flag unusual clauses, extract financial commitments | Paste a contract section and ask for a plain-language summary | "Summarize the financial terms in this contract section in plain language: [paste]. Flag anything that seems unusual or that I should bring to legal." | 3 |
| Process documentation | Document month-end close steps, build process guides for the team | Ask Gemini to turn your close process into a formal documented workflow | "Turn these month-end close steps into a formatted process guide: [paste steps]. Include: who owns each step, timing, and what good looks like." | 4 |

---

### RISK

**Who this covers:** Risk Management, Compliance, Internal Audit, Information Security  
**Primary AI opportunity:** Faster policy research, cleaner documentation, and more consistent risk communication

| Task | What AI can do | Quick win | Sample Gemini prompt | Module |
|---|---|---|---|---|
| Risk assessment documentation | Structure risk assessments from notes, draft formal risk narratives | Paste your risk notes and ask for a formatted assessment | "Turn these notes into a formal risk assessment: [paste notes]. Include: risk description, likelihood, impact, current controls, and recommended mitigations." | 2 |
| Policy review and plain-language summaries | Summarize complex policy language, identify gaps, write employee-facing summaries | Paste a policy section and ask for a plain-language summary | "Summarize this policy section in plain language for employees: [paste policy]. What does it mean for their day-to-day? What do they need to do or avoid?" | 2 |
| Compliance reporting | Draft compliance report narratives, summarize control test results | Ask Gemini to help draft the narrative section of a compliance report | "Write a compliance report narrative for [control/program]: [paste test results]. Summarize what was tested, what was found, and what we're doing about it." | 3 |
| Incident documentation | Write clear incident summaries and post-mortems from notes | Paste your incident notes and ask for a structured summary | "Write a post-incident summary from these notes: [paste]. Include: what happened, timeline, root cause, impact, and what we're doing to prevent it from happening again." | 3 |
| Regulatory research | Summarize regulatory guidance, identify what's relevant to specific business activities | Ask Gemini to summarize a regulatory update and what it means for your team | "Summarize this regulatory guidance and explain what it means for a company that [describe your business activity]: [paste guidance or describe regulation]." | 3 |
| Risk communication | Write stakeholder-ready risk summaries, translate technical findings for business audiences | Take a risk finding and rewrite it for a non-risk audience | "Rewrite this risk finding for a business audience: [paste finding]. Focus on business impact and what they need to do, not the technical or compliance details." | 4 |

---

### ENABLEMENT

**Who this covers:** Sales Enablement, Learning & Development, Training, Instructional Design  
**Primary AI opportunity:** Faster content creation, always-current materials, and personalized learning at scale

| Task | What AI can do | Quick win | Sample Gemini prompt | Module |
|---|---|---|---|---|
| Training content creation | Draft course outlines, write module content, create quiz questions | Give Gemini a learning objective and ask it to build a lesson outline | "Create a lesson outline for teaching [skill] to [audience]. Include: learning objectives, key concepts to cover, a practice activity, and 3 assessment questions." | 2 |
| Playbook and job aid creation | Build sales playbooks, reference guides, and quick-reference cards from SME input | Paste SME notes from an interview and ask Gemini to turn them into a job aid | "Turn these SME notes into a one-page job aid for [audience]: [paste notes]. Format it so someone can use it on the job without any other training." | 2 |
| Content updating | Identify what's outdated in existing materials, suggest updates, rewrite stale sections | Paste an old training section and ask Gemini to flag what needs updating | "Review this training content and flag anything that seems outdated, inaccurate, or unclear: [paste content]. Suggest updated language for each flagged section." | 2 |
| Onboarding program design | Build onboarding plans, write welcome sequences, structure 30/60/90 day frameworks | Ask Gemini to help build a 30/60/90 day onboarding plan for a role | "Design a 30/60/90 day onboarding plan for a new [role]. Include: what they should know, do, and achieve by each milestone." | 3 |
| Knowledge gap assessment | Design assessment questions that reveal gaps, analyze assessment results | Ask Gemini to design a knowledge assessment for a specific skill area | "Write 10 assessment questions to measure [skill] knowledge for [audience]. Mix question types. Include an answer key and what each question is testing." | 3 |
| Effectiveness measurement | Write survey questions to measure training impact, analyze qualitative feedback | Ask Gemini to help you design a post-training effectiveness survey | "Write a 5-question survey to measure the effectiveness of training on [topic] for [audience]. Include both rating scale and open-ended questions." | 4 |

---

### PEOPLE (HR)

**Who this covers:** HR Business Partners, Talent Acquisition, People Operations, Total Rewards  
**Primary AI opportunity:** Faster, more consistent documentation and communication — more time for the human parts of HR

| Task | What AI can do | Quick win | Sample Gemini prompt | Module |
|---|---|---|---|---|
| Job description writing | Draft JDs from role notes, update existing JDs, ensure inclusive language | Paste a role brief and ask Gemini to write the job description | "Write a job description for a [role title] at a [company type]. Must-haves: [list]. Nice-to-haves: [list]. Tone: professional and inclusive. Avoid jargon." | 2 |
| Employee communications | Draft org-wide announcements, team updates, policy change communications | Ask Gemini to draft your next people team announcement | "Write an employee communication announcing [topic]. Audience: all employees. Tone: transparent and human. Include: what's changing, why, and what employees need to know or do." | 2 |
| Policy writing and updating | Draft new policies, update existing ones, write plain-language employee summaries | Paste a policy you need to update and ask Gemini to revise it | "Update this HR policy to reflect [change]: [paste current policy]. Keep the tone clear and direct. Add a plain-language summary at the top for employees." | 2 |
| Interview and screening support | Write interview question banks, create scoring rubrics, draft screening criteria | Ask Gemini to build an interview question bank for a role | "Write 10 behavioral interview questions for a [role]. Focus on: [key competencies]. Include what a strong answer would demonstrate for each question." | 3 |
| Performance review support | Draft review templates, write manager guidance, help employees with self-reflection prompts | Ask Gemini to write self-reflection prompts for your next review cycle | "Write 5 self-reflection prompts for an employee performance review. Focus on: impact, growth, collaboration, and goals for next year. Tone: thoughtful and growth-oriented." | 3 |
| Onboarding documentation | Create onboarding checklists, welcome guides, first-week agendas | Ask Gemini to build an onboarding checklist for a new hire | "Create a new hire onboarding checklist for the first two weeks. Include: logistics, system access, key meetings, and culture introductions. Format as a checklist." | 4 |

---

### INTERNAL TOOLING

**Who this covers:** Internal Tools Engineers, Business Systems Engineers, Automation Engineers  
**Primary AI opportunity:** Faster builds, better documentation, and proactive identification of automation opportunities across the org

| Task | What AI can do | Quick win | Sample Gemini prompt | Module |
|---|---|---|---|---|
| Writing automation scripts | Generate Python, JS, or shell scripts from descriptions, debug automation code | Describe a repetitive task and ask Gemini to write the script | "Write a Python script that [describe what it should do]. Include comments explaining each section and error handling for common failure points." | 2 |
| Requirements translation | Turn business requests into technical specs, ask clarifying questions to surface gaps | Paste a business request and ask Gemini to turn it into a technical spec | "Turn this business request into a technical spec: [paste request]. Include: what it should do, what it should not do, edge cases to handle, and open questions for the requester." | 2 |
| Technical documentation | Write system docs, integration guides, and runbooks from code or notes | Paste code or architecture notes and ask for documentation | "Write technical documentation for this system: [paste code/notes]. Include: what it does, how it works, how to set it up, and how to troubleshoot common issues." | 2 |
| Identifying automation opportunities | Analyze business processes to spot repetitive tasks that could be automated | Ask Gemini to analyze a workflow and identify automation candidates | "Review this workflow and identify which steps are candidates for automation: [describe workflow]. For each, suggest what type of automation would work and what the time savings might be." | 3 |
| Testing and QA | Generate test cases from specs, write test scripts, identify edge cases | Paste a spec and ask Gemini to generate a test plan | "Generate a test plan for this feature: [paste spec]. Include: happy path tests, edge cases, and error scenarios. Format as a checklist." | 3 |
| Org-wide automation playbook | Document automation patterns that work so other teams can replicate them | Turn your best automation into a reusable how-to guide | "Write a how-to guide so a non-technical team member could request and implement [type of automation] without needing to understand the code." | 4 |

---

### INFORMATION SYSTEMS

**Who this covers:** IT, Systems Administration, Help Desk, Security, Infrastructure  
**Primary AI opportunity:** Faster documentation, clearer user communication, and smarter troubleshooting support

| Task | What AI can do | Quick win | Sample Gemini prompt | Module |
|---|---|---|---|---|
| Writing user-facing communications | Draft system outage notices, maintenance windows, IT announcements in plain language | Ask Gemini to draft your next IT announcement | "Write a user-facing communication about [system event]. Audience: all employees. Keep it under 100 words. Lead with what users need to do, not what happened technically." | 2 |
| System and process documentation | Write runbooks, system guides, and IT process documentation from notes | Paste your process notes and ask for a formatted runbook | "Turn these notes into a runbook for [process]: [paste notes]. Format: step-by-step, with a decision tree for common issues and escalation path." | 2 |
| Troubleshooting support | Analyze error messages, suggest root causes, walk through diagnostic steps | Paste an error or ticket description and ask for troubleshooting steps | "Here's an issue users are reporting: [describe]. What are the most likely causes and what steps would you take to diagnose and resolve it?" | 2 |
| Vendor evaluation | Structure evaluation criteria, summarize RFP responses, compare options | Ask Gemini to build an evaluation framework for a vendor decision | "Build an evaluation framework for selecting a [system/tool]. Include: key criteria, weighting, and a scoring rubric. Audience: IT and business stakeholders." | 3 |
| Security incident documentation | Draft incident reports, write post-mortems, create user-facing security notices | Paste incident notes and ask for a clean incident report | "Write a security incident report from these notes: [paste]. Include: what happened, who was affected, what we did, and what we're doing to prevent recurrence." | 3 |
| Help desk knowledge base | Build help desk articles from common tickets, write step-by-step user guides | Take your 5 most common tickets and ask Gemini to turn them into KB articles | "Write a help desk knowledge base article for this common issue: [describe issue]. Include: symptoms, step-by-step resolution for the user, and when to escalate." | 4 |

---

### COACHING

**Who this covers:** Internal Coaches, Executive Coaches, Career Development, Manager Development  
**Primary AI opportunity:** Better session preparation, more consistent documentation, and more time in the session instead of on admin

| Task | What AI can do | Quick win | Sample Gemini prompt | Module |
|---|---|---|---|---|
| Session preparation | Build session agendas from goals and prior notes, generate powerful coaching questions | Paste the coachee's goal and prior session notes and ask for a session plan | "Prepare a coaching session agenda for [coachee context]. Their goal: [goal]. Last session: [summary]. Suggest 3 powerful questions to explore and a theme for this session." | 2 |
| Session documentation | Turn raw session notes into clean structured summaries, capture commitments and themes | Paste your session notes and ask Gemini to structure them | "Turn these coaching session notes into a clean summary: [paste notes]. Include: key themes explored, insights, commitments made, and focus for next session." | 2 |
| Development plan writing | Draft personalized development plans from assessment data and goal discussions | Ask Gemini to help structure a development plan for a coachee | "Write a development plan for someone in [role] working on [development area]. Include: current state, goal, 3 specific actions, success measures, and timeline." | 3 |
| Resource curation | Find and summarize relevant frameworks, models, or reading for a coachee's topic | Describe a topic and ask Gemini to suggest frameworks and resources | "Suggest 3 coaching frameworks or models relevant to [topic/challenge]. For each, explain what it is and how I might introduce it in a coaching session." | 3 |
| Program effectiveness reporting | Summarize coaching program outcomes, write stakeholder reports on program impact | Ask Gemini to draft a coaching program summary from your outcome data | "Write a summary of our coaching program outcomes for [period]: [paste data/outcomes]. Audience: HR leadership. Focus on impact, themes, and recommendations." | 4 |
| Stakeholder communication | Draft updates to managers or sponsors about a coachee's progress (without violating confidentiality) | Ask Gemini to help draft a stakeholder update that protects coachee privacy | "Write a progress update for a coachee's manager without revealing session content. Tone: positive and forward-looking. Focus on engagement and trajectory, not specifics." | 4 |

---

### PRODUCT

**Who this covers:** Product Managers, Product Owners, Product Strategy, Growth  
**Primary AI opportunity:** Faster spec writing, better user insight synthesis, and clearer cross-functional communication

| Task | What AI can do | Quick win | Sample Gemini prompt | Module |
|---|---|---|---|---|
| Writing PRDs and feature specs | Draft full product requirement documents from bullet points, ensure completeness | Give Gemini your feature idea and ask it to structure a PRD | "Write a PRD for this feature: [describe]. Include: problem statement, user stories, acceptance criteria, out of scope, success metrics, and open questions." | 2 |
| User research synthesis | Synthesize interview notes into themes, surface patterns, write insight summaries | Paste interview notes from multiple sessions and ask for a synthesis | "Synthesize these user interview notes into key themes and insights: [paste notes]. What are the top 3 findings? What do they suggest we should build or change?" | 2 |
| Competitive analysis | Summarize competitor features, identify gaps, structure a competitive landscape | Ask Gemini to help you analyze a competitor based on publicly available info | "Analyze [competitor] from a product perspective. What do they do well, where are their gaps, and what does this mean for our product strategy?" | 2 |
| Writing user stories | Generate user stories and acceptance criteria from feature descriptions | Paste a feature description and ask for user stories | "Write user stories for this feature: [describe]. Format: As a [user type], I want to [action] so that [outcome]. Include acceptance criteria for each." | 3 |
| Roadmap communication | Draft roadmap narratives, write stakeholder updates, communicate trade-offs clearly | Ask Gemini to help you write the narrative for your next roadmap review | "Write a roadmap narrative for [quarter/period]. Priorities: [list]. Trade-offs made: [describe]. Audience: cross-functional leadership. Tone: clear and decisive." | 3 |
| Metrics and decision framing | Structure the analytical case for a product decision, frame trade-offs clearly | Ask Gemini to help you structure a data-driven product decision | "Help me frame a product decision between [option A] and [option B]. Relevant metrics: [paste data]. What framework would you use to make this decision, and what does the data suggest?" | 4 |
| Workflow automation | Build reusable prompt templates for PRDs, user stories, and roadmap updates | Turn your PRD template into a Gemini prompt you use every time | "Create a reusable prompt template I can use to draft a PRD for any new feature. It should prompt me for the right inputs and produce a consistent, complete output every time." | 4 |

---

## How the Bot Uses This Document

When a learner completes onboarding and selects their role and top tasks, the bot:

1. Identifies their department from the list above
2. Pulls the 3 tasks they selected as most relevant to their work
3. Builds a 5-module curriculum that uses those tasks as the primary examples throughout
4. In Module 2, leads with the "Quick win" task — something they can try in Gemini today
5. In Module 3, teaches prompting using the sample prompts above as starting points
6. In Module 4, focuses on building a repeatable workflow for their highest-value task
7. In Module 5, asks them to connect one outcome from Modules 2–4 to a team goal

All module content is generated by Claude at the time of delivery — this document provides the blueprint and ensures accuracy and relevance.

---

---

### BUSINESS DEVELOPMENT

**Who this covers:** Business Development Managers and Reps  
**Primary AI opportunity:** Faster, more targeted prospecting and outreach — more time on relationships, less on research and drafting

| Task | What AI can do | Quick win | Sample Gemini prompt | Module |
|---|---|---|---|---|
| Prospect and market research | Synthesize company backgrounds, surface pain points, identify ideal timing for outreach | Paste a prospect's website into Gemini and ask for a BD-focused summary | "Summarize this company for a BD outreach. Focus on: what they do, their likely growth challenges, and why now might be a good time to reach out: [paste company info]." | 2 |
| Outreach and prospecting emails | Draft personalized first-touch and follow-up emails, write multiple variations quickly | Ask Gemini to write a first outreach email for a prospect you're working | "Write a personalized outreach email to [name], [title] at [company]. Reference: [specific detail about them]. Goal: start a conversation about [opportunity]. Under 100 words, no jargon." | 2 |
| Pitch decks and proposals | Draft executive summaries, structure the narrative, write slide talking points | Give Gemini your pitch idea in bullet points and ask it to structure the story | "Turn these notes into a pitch narrative: [paste notes]. Structure: the problem we solve, why us, what the opportunity looks like. Audience: [describe]. Tone: confident and clear." | 3 |
| Meeting and call preparation | Generate discovery questions, anticipate objections, prepare talking points | Before your next BD call, ask Gemini to prepare you based on what you know about the prospect | "Prepare me for a BD call with [company] in [industry]. Suggest: 5 discovery questions, likely concerns, and a clear objective for the meeting." | 3 |
| Competitive landscape analysis | Compare positioning, identify whitespace, summarize where competitors are strong or weak | Ask Gemini to help map the competitive landscape for a deal you're working | "Compare these competitors from a BD perspective: [list]. What does each do well, where are their gaps, and where do we have the clearest opportunity?" | 4 |
| Pipeline reporting and updates | Summarize pipeline status, draft deal notes, write clean CRM entries from call notes | Paste your call notes and ask Gemini to turn them into a pipeline update | "Turn these BD call notes into a pipeline update: [paste notes]. Include: where we are in the process, next steps, and any risks or opportunities to flag." | 3 |

---

### ENTERPRISE

**Who this covers:** Enterprise Account Management, Enterprise Onboarding, Enterprise Operations  
**Primary AI opportunity:** Managing complex, high-value client relationships with consistently excellent, personalized communication — at a level of quality that matches enterprise expectations

*Note: Enterprise sub-teams follow the same curriculum arc as Customer Success but with emphasis on executive-level communication, complex implementations, and multi-stakeholder relationship management.*

| Task | What AI can do | Quick win | Sample Gemini prompt | Module |
|---|---|---|---|---|
| Executive client communications | Draft polished, appropriately formal updates, proposals, and relationship touchpoints | Ask Gemini to draft a proactive executive check-in for a key account | "Write an executive-level check-in email to [name], [title] at [company]. Reference: [recent milestone or event]. Tone: warm, professional, and brief. Goal: maintain relationship and surface any concerns." | 2 |
| Enterprise onboarding plans | Build detailed, customized onboarding plans for complex implementations | Give Gemini your implementation scope and ask it to build a phased onboarding plan | "Build a phased onboarding plan for an enterprise client implementing [product/service]. Their team includes: [stakeholders]. Key complexity: [describe]. Format as a timeline with milestones and owners." | 2 |
| Business review preparation | Draft QBR and EBR narratives, build the business case for continued partnership | Paste account data and ask Gemini to build the business review structure | "Build an EBR structure for [company]. They've been with us [time], key wins include [describe], current challenges: [describe]. Audience: their [title]. Tone: strategic and forward-looking." | 3 |
| Multi-stakeholder coordination | Draft clear communication for multiple stakeholders with different priorities | Ask Gemini to help you tailor the same message for different enterprise stakeholders | "I need to communicate [situation] to three audiences: [exec], [technical lead], and [finance]. Write a version tailored to each person's priorities." | 3 |
| Escalation and issue management | Write clear, composed escalation documentation and client-facing responses | Paste your escalation notes and ask for a polished client response | "Write a professional response to an enterprise client escalating [issue]. Acknowledge the concern, explain what we're doing, and outline next steps. Tone: calm, accountable, and solution-focused." | 4 |
| Renewal and expansion strategy | Build the business case for renewal, identify expansion signals, draft the renewal narrative | Ask Gemini to help structure the renewal conversation for a key account | "Build a renewal strategy for [company]. Contract value: [amount]. Usage: [high/medium/low]. Key wins: [describe]. Risks: [describe]. What's the strongest case for renewal and expansion?" | 4 |

---

### EXECUTIVE

**Who this covers:** C-suite, Senior VPs, Department Heads  
**Primary AI opportunity:** Synthesizing large amounts of information faster, communicating with clarity and precision at scale, and making better-informed decisions without getting buried in prep work

| Task | What AI can do | Quick win | Sample Gemini prompt | Module |
|---|---|---|---|---|
| Strategic communications | Draft all-hands messages, company updates, and leadership announcements from bullet points | Give Gemini your key points and ask it to draft your next all-hands message | "Draft an all-hands message based on these points: [paste]. Tone: transparent, energizing, and human. Include: where we are, what's changed, and what it means for the team." | 2 |
| Synthesizing reports and briefings | Summarize long reports, distill key decisions from data, surface what matters most | Paste a long report and ask Gemini to give you the three things you need to know | "Read this report and give me: the 3 most important findings, what decision they point toward, and any risks I should be aware of: [paste report]." | 2 |
| Board and investor preparation | Build structured board narratives, draft talking points, anticipate board questions | Ask Gemini to help you structure your next board update | "Help me structure a board update for [period]. Key topics: [list]. Format: what we committed to, what happened, what we're doing about gaps, and what we need from the board." | 3 |
| Cross-functional decision documentation | Write clear decision memos, document trade-offs, create alignment summaries after key discussions | After a key leadership decision, ask Gemini to help document the rationale | "Write a decision memo for [decision]. Include: context, options considered, decision made, rationale, trade-offs, and what happens next. Audience: the leadership team." | 3 |
| Performance and goal reviews | Draft goal-setting frameworks, write team performance summaries, prepare for review conversations | Ask Gemini to help structure your annual goal-setting communication | "Write a goal-setting communication for my team for [period]. Priorities: [list]. Tone: clear and motivating. Include what we're focused on, what we're not doing, and why." | 4 |

---

### INNOVATION

**Who this covers:** Innovation team — research, emerging technology, internal R&D  
**Primary AI opportunity:** This team is uniquely positioned to go deep with AI — rapid research, concept development, and translating emerging capabilities into org-wide opportunities

| Task | What AI can do | Quick win | Sample Gemini prompt | Module |
|---|---|---|---|---|
| Emerging technology research | Synthesize recent developments, summarize what's relevant to the business, cut through noise | Ask Gemini to brief you on a technology area you're researching | "Give me a current briefing on [technology/trend]. Focus on: what's new in the last 6 months, what's overhyped vs. genuinely significant, and what it could mean for a fintech company." | 2 |
| Proof of concept documentation | Turn early-stage ideas into structured proposals, write POC briefs from rough concepts | Take a concept you're exploring and ask Gemini to help structure it as a POC brief | "Help me write a POC brief for this idea: [describe]. Include: the problem it solves, what we'd test, what success looks like, and what we'd need to run it." | 2 |
| Internal pitch and proposal writing | Build compelling pitches for new initiatives, structure the case for experimentation | Give Gemini your innovation idea and ask it to build the internal pitch | "Write an internal pitch for [initiative]. Audience: leadership. Include: the opportunity, why now, what we'd build or test, what it costs, and what we'd learn." | 3 |
| Competitive innovation landscape | Map what competitors and adjacent industries are doing with AI and emerging tech | Ask Gemini to analyze how your competitive set is approaching a specific technology | "Map how companies in [industry] are using [technology]. What are the most interesting examples, what patterns do you see, and what opportunity does that suggest for us?" | 3 |
| Knowledge sharing and documentation | Turn research and experiments into clear internal publications, summarize learnings concisely | After finishing a research sprint, ask Gemini to help write the internal summary | "Turn these research notes into an internal knowledge-share document: [paste notes]. Format: key findings, what we tried, what we learned, and recommended next steps." | 4 |
| AI capability mapping for the org | Identify where AI could drive the most value across departments, build the internal case | Use Gemini to help map AI opportunities across a specific department or workflow | "Map the top AI opportunities for a [department] team at a fintech company. For each opportunity: what the task is, what AI could do, and what the potential time or quality impact might be." | 4 |

---

### LEGAL

**Who this covers:** In-house Legal Counsel, Paralegals, Legal Operations  
**Primary AI opportunity:** Faster first-pass research and document review — more time on judgment-intensive work, less on information gathering and drafting

⚠️ **Important:** Legal AI use carries a higher verification requirement than most roles. All AI-generated legal language, summaries of regulations, and contract analyses must be reviewed by qualified legal counsel before reliance or use. The bot reinforces this explicitly in Module 1 for this team.

| Task | What AI can do | Quick win | Sample Gemini prompt | Module |
|---|---|---|---|---|
| Contract review and summarization | Summarize key terms, flag unusual clauses, pull out obligations and deadlines — as a first-pass only | Paste a vendor contract section and ask Gemini to summarize key terms | "Summarize the key terms of this contract section in plain language: [paste]. Flag anything that seems unusual, risky, or that I should bring to a senior attorney. This is a first-pass review only." | 2 |
| Legal research synthesis | Summarize publicly available legal guidance, synthesize multiple sources, identify relevant precedents for further research | Ask Gemini to help you get oriented on an unfamiliar legal topic | "Give me a plain-language overview of [legal area/regulation] and how it typically applies to a fintech company. Note: I will verify all of this with primary sources." | 2 |
| Policy and procedure drafting | Draft first versions of internal policies, write plain-language employee summaries of legal requirements | Give Gemini your policy requirements and ask for a first draft | "Draft an internal policy for [topic]. Requirements: [paste notes]. Audience: all employees. Tone: clear and direct. Include a plain-language summary at the top." | 3 |
| Legal correspondence and communications | Draft professional legal correspondence, write clear responses to external inquiries | Ask Gemini to draft a response to a standard external legal inquiry | "Draft a professional response to this inquiry: [describe or paste]. Tone: formal and precise. I will review and finalize before sending." | 3 |
| Compliance documentation | Write compliance summaries, draft regulatory response frameworks, document control procedures | Ask Gemini to help structure a compliance documentation framework | "Help me structure compliance documentation for [regulation/requirement]. Include: what we're required to do, how we demonstrate compliance, and what records we need to keep." | 4 |
| Contract template development | Build reusable contract template frameworks, write standard clause libraries | Ask Gemini to help draft a standard clause for a contract type you use often | "Draft a standard [clause type] clause for our [contract type]. Plain language, legally grounded. I'll have this reviewed by counsel before use." | 4 |

---

### PARTNER DEVELOPMENT

**Who this covers:** Partner Development Managers and Reps  
**Primary AI opportunity:** More personalized partner outreach and enablement, faster partner research, better-quality partnership materials

| Task | What AI can do | Quick win | Sample Gemini prompt | Module |
|---|---|---|---|---|
| Partner research and qualification | Research potential partners, understand their business model, identify fit and opportunity | Paste a potential partner's website and ask Gemini for a partnership-focused summary | "Summarize this company as a potential partner: [paste info]. Focus on: what they do, who their customers are, where there's potential complementarity, and what a partnership could look like." | 2 |
| Partner outreach and recruitment | Draft personalized outreach to potential partners, write follow-up sequences | Ask Gemini to write a first outreach to a partner prospect | "Write a personalized outreach email to [name] at [company] about a potential partnership. Context: [describe]. Goal: start a conversation. Under 100 words, specific and relevant." | 2 |
| Partner onboarding materials | Build partner welcome guides, onboarding checklists, and enablement resources | Ask Gemini to draft a partner onboarding welcome guide | "Write a partner onboarding guide for new [type] partners. Include: how the partnership works, what resources are available, key contacts, and what success looks like in the first 90 days." | 3 |
| Co-marketing and co-selling support | Draft joint messaging, build co-sell talking points, write partner-specific content | Ask Gemini to draft a co-marketing one-pager for a specific partner | "Write a co-marketing one-pager for our partnership with [type of partner]. Audience: their customers. Focus on: the combined value, key benefits, and a clear call to action." | 3 |
| Partnership performance reporting | Summarize partner performance data, draft partner business reviews, write internal pipeline updates | Paste partner performance data and ask for a summary narrative | "Write a partner performance summary for [partner/period]: [paste data]. Include: what's working, what's not, and recommendations for the next period." | 4 |

---

### STRATEGY AND OPERATIONS

**Who this covers:** Strategy Analysts, Operations Managers, Chiefs of Staff, Business Operations  
**Primary AI opportunity:** Synthesizing complex information faster, producing cleaner executive-ready outputs, and building more repeatable operational processes

| Task | What AI can do | Quick win | Sample Gemini prompt | Module |
|---|---|---|---|---|
| Strategic analysis and synthesis | Synthesize data from multiple sources into a coherent narrative, identify key themes and tensions | Paste a set of data sources or research and ask Gemini to synthesize the key strategic insight | "Synthesize these inputs into a strategic summary: [paste data/notes]. What are the key findings, what tensions exist, and what does this suggest we should do or decide?" | 2 |
| Executive reporting and presentations | Build clean, decision-ready executive reports from raw data and notes | Take your data and ask Gemini to structure the executive report | "Build an executive report structure for [topic/period]. Inputs: [paste data]. Format: situation, key findings, implications, and recommended decisions. Audience: [leadership level]." | 2 |
| OKR tracking and reporting | Write OKR progress narratives, summarize cross-functional goal status, flag at-risk goals | Paste your OKR data and ask Gemini to write the progress narrative | "Write an OKR progress update for [period] based on this data: [paste]. For each goal: status, key drivers of progress or gap, and what's needed to close the gap by end of period." | 3 |
| Process documentation and improvement | Document existing processes from notes or interviews, identify inefficiencies, propose improvements | Take a process you own and ask Gemini to document it and flag improvement opportunities | "Document this process from these notes: [paste]. Then identify: any steps that are redundant, slow, or error-prone, and suggest what could be simplified or automated." | 3 |
| Cross-functional project coordination | Write project briefs, draft stakeholder updates, build RACI frameworks, document decisions | Ask Gemini to write the project brief for an initiative you're kicking off | "Write a project brief for [initiative]. Include: objective, scope, stakeholders and their roles, key milestones, dependencies, and what success looks like." | 4 |
| Strategic options analysis | Structure a clear options analysis for a leadership decision, present trade-offs fairly | Ask Gemini to help you build a strategic options memo for a decision you're working | "Structure a strategic options analysis for [decision]. Options: [list]. For each: what it involves, the upside, the downside, and what assumptions it depends on. End with a recommended path and rationale." | 4 |

---

## What Still Needs to Be Defined

- [ ] **Sub-team depth for bot onboarding:** Confirmed that the bot will ask sub-team for Business Solutions, Customer Success, Engineering, and Risk. Need to confirm the full list of sub-teams to present as options in the onboarding question for each of those departments.
- [ ] **Success metrics:** Confirm or adjust the program-level benchmarks with L&D leadership after the first pilot cohort.
- [ ] **Fintech-specific AI guardrails:** Work with Legal, Risk, and Compliance to confirm which AI use cases are off-limits or require additional verification steps — especially for Tax, Fraud, and Legal sub-teams.
- [ ] **Gemini-specific features:** Confirm whether Gemini for Workspace features (Gems, Workspace integrations, NotebookLM) should be highlighted for specific roles.
- [ ] **Manager learning path:** Managers score their teams on Team Impact — they likely need content on *how* to coach AI adoption, not just how to use AI themselves. Decide if this is a 6th module for managers or a separate track.
- [ ] **Executive track depth:** Confirm whether the Executive department wants a full 5-module path or a condensed track given time constraints.
- [ ] **Innovation team:** This team may be able to skip Module 1 entirely or move through it faster — confirm whether they get an accelerated path.
