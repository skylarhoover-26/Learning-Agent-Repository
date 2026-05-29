export const CATEGORIES = {
  writing: { label: 'Writing', color: 'bg-blue-100 text-blue-700' },
  analysis: { label: 'Analysis', color: 'bg-purple-100 text-purple-700' },
  communication: { label: 'Communication', color: 'bg-green-100 text-green-700' },
  meetings: { label: 'Meetings', color: 'bg-yellow-100 text-yellow-700' },
  planning: { label: 'Planning', color: 'bg-orange-100 text-orange-700' },
  creative: { label: 'Creative', color: 'bg-pink-100 text-pink-700' },
};

export const DEPARTMENTS = {
  cs: { label: 'Customer Success' },
  sales: { label: 'Sales' },
  engineering: { label: 'Engineering' },
  marketing: { label: 'Marketing' },
  enablement: { label: 'Enablement' },
  people: { label: 'People/HR' },
  operations: { label: 'Operations' },
  finance: { label: 'Finance' },
  leadership: { label: 'Leadership' },
};

export const PROMPTS = [
  {
    id: 1,
    title: 'Summarize Customer Feedback',
    description: 'Analyze and categorize themes from a batch of customer feedback to surface actionable insights.',
    category: 'analysis',
    department: 'cs',
    tags: ['feedback', 'themes', 'insights', 'nps'],
    prompt: `You are a Customer Success analyst. I'm going to share a batch of customer feedback and I need you to analyze it thoroughly.

For the feedback below, please:
1. Identify the top 5 recurring themes and rank them by frequency
2. Categorize each piece of feedback as Positive, Negative, or Neutral
3. Flag any urgent issues that need immediate attention
4. Summarize sentiment distribution (% positive, negative, neutral)
5. Provide 3 specific, actionable recommendations based on the patterns

Format your output as a structured report with clear headers.

Customer feedback to analyze:
[paste customer feedback here]`,
  },
  {
    id: 2,
    title: 'Draft Escalation Response',
    description: 'Write a professional, empathetic escalation response that acknowledges the issue and outlines next steps.',
    category: 'communication',
    department: 'cs',
    tags: ['escalation', 'response', 'customer', 'empathy'],
    prompt: `You are a senior Customer Success manager at a SaaS company. A customer has escalated an issue and I need to send a professional response.

Write an escalation response email that:
1. Opens with genuine empathy and acknowledgment of their frustration
2. Takes clear ownership of the issue (no deflecting)
3. Explains what we know so far about the root cause
4. Provides a concrete timeline for resolution with milestones
5. Offers an interim workaround if possible
6. Closes with direct contact information and a follow-up commitment

Keep the tone warm but professional. Avoid corporate jargon.

Customer name: [customer name]
Issue summary: [describe the issue]
How long it has been unresolved: [timeframe]
Impact on customer: [describe business impact]`,
  },
  {
    id: 3,
    title: 'QBR Preparation',
    description: 'Generate a quarterly business review outline with data-driven talking points and strategic recommendations.',
    category: 'planning',
    department: 'cs',
    tags: ['qbr', 'review', 'quarterly', 'strategy'],
    prompt: `You are preparing a Quarterly Business Review (QBR) for a key customer account. Help me build a compelling presentation outline.

Create a QBR outline that includes:
1. Executive Summary (3-4 bullet points on relationship health)
2. Key Metrics & Results (usage trends, adoption rates, ROI achieved)
3. Goals Review (progress against last quarter's goals, what was met/missed)
4. Success Stories (2-3 specific wins to highlight)
5. Challenges & Resolutions (issues faced and how they were handled)
6. Roadmap Preview (upcoming features relevant to this customer)
7. Recommendations & Next Quarter Goals (3 strategic priorities)
8. Open Discussion Topics

Customer name: [customer name]
Industry: [industry]
Key metrics from this quarter: [paste metrics or data]
Notable events: [any important events, expansions, or issues]`,
  },
  {
    id: 4,
    title: 'Prospect Research Brief',
    description: 'Research a prospect company to prepare insightful talking points before a sales call.',
    category: 'analysis',
    department: 'sales',
    tags: ['prospect', 'research', 'sales call', 'preparation'],
    prompt: `You are a sales research analyst. I have a discovery call coming up and need a quick but thorough research brief on a prospect company.

Based on what you know about this company, create a one-page research brief covering:
1. Company Overview (what they do, size, market position)
2. Recent News & Events (funding, leadership changes, product launches)
3. Likely Pain Points (based on their industry and company stage)
4. How Our Product Could Help (map 2-3 features to their probable needs)
5. Conversation Starters (3 insightful questions that show I did my homework)
6. Potential Objections (and how to address them)
7. Decision-Making Structure (likely stakeholders involved)

Company name: [company name]
Their website: [URL]
What we sell: [brief product description]
Call context: [first meeting, follow-up, referral, etc.]`,
  },
  {
    id: 5,
    title: 'Follow-up Email After Demo',
    description: 'Write a personalized follow-up email after a product demo that reinforces value and drives next steps.',
    category: 'communication',
    department: 'sales',
    tags: ['follow-up', 'demo', 'email', 'sales'],
    prompt: `You are a sales representative writing a follow-up email after a product demo. The email should feel personal, not templated.

Write a follow-up email that:
1. References a specific moment or question from the demo
2. Reinforces 2-3 key value points that resonated with the prospect
3. Addresses any concerns or hesitations they mentioned
4. Includes a brief case study reference relevant to their industry
5. Proposes a clear next step with a specific date/time
6. Keeps the total length under 200 words

Prospect name: [name]
Their company: [company]
Key pain points discussed: [list main pain points]
Features they were most interested in: [list features]
Any objections raised: [list objections or "none"]
Proposed next step: [e.g., technical deep-dive, trial, pricing review]`,
  },
  {
    id: 6,
    title: 'Competitive Comparison',
    description: 'Compare our product against a competitor with an honest, balanced analysis for internal use.',
    category: 'analysis',
    department: 'sales',
    tags: ['competitive', 'comparison', 'battlecard', 'positioning'],
    prompt: `You are a competitive intelligence analyst. Create a detailed but concise competitive comparison for our sales team.

Build a comparison between our product and a competitor covering:
1. Feature-by-Feature Matrix (table format: feature, us, them, verdict)
2. Pricing & Packaging Differences
3. Where We Win (our clear advantages, with proof points)
4. Where They Win (be honest - our team needs to know)
5. Common Objections When Competing (with suggested responses)
6. Ideal Customer Profile for Each (who should choose us vs. them)
7. Talk Track (3-4 key statements for positioning against them)

Our product: [product name and brief description]
Competitor: [competitor name]
Key differentiators we claim: [list our main selling points]
What prospects often mention about them: [what you hear in calls]`,
  },
  {
    id: 7,
    title: 'Code Review Checklist',
    description: 'Generate a thorough code review checklist tailored to a specific type of change.',
    category: 'analysis',
    department: 'engineering',
    tags: ['code review', 'checklist', 'engineering', 'quality'],
    prompt: `You are a senior software engineer conducting a code review. Generate a thorough, context-specific code review checklist.

Create a checklist organized by priority (Critical, Important, Nice-to-have) covering:
1. Correctness (logic errors, edge cases, off-by-one errors)
2. Security (input validation, auth checks, data exposure)
3. Performance (N+1 queries, unnecessary re-renders, memory leaks)
4. Error Handling (try/catch coverage, user-facing error messages, logging)
5. Testing (unit tests present, edge cases covered, integration tests needed)
6. Readability (naming, comments, function length, single responsibility)
7. Architecture (separation of concerns, coupling, design pattern adherence)

Type of change: [feature, bug fix, refactor, migration, etc.]
Language/framework: [e.g., React/TypeScript, Python/Django]
Brief description: [what the PR does]
Files changed: [list key files or paste the diff summary]`,
  },
  {
    id: 8,
    title: 'Technical Documentation',
    description: 'Write clear, structured technical docs from code snippets or architectural decisions.',
    category: 'writing',
    department: 'engineering',
    tags: ['documentation', 'technical', 'api', 'architecture'],
    prompt: `You are a technical writer who specializes in developer documentation. Help me write clear docs for this code or system.

Create documentation that includes:
1. Overview (what this does in 2-3 sentences, plain language)
2. Architecture Diagram Description (components and how they interact)
3. Setup & Prerequisites (what you need before using this)
4. Usage Examples (3 common use cases with code snippets)
5. API Reference (if applicable - endpoints, params, responses)
6. Configuration Options (environment variables, settings, defaults)
7. Troubleshooting (5 common issues and their solutions)
8. Changelog (template for tracking changes)

Write for an audience of mid-level engineers. Avoid over-explaining basics but don't skip important context.

Code or system to document: [paste code, describe the system, or link to repo]
Target audience: [junior devs, senior devs, external developers, etc.]`,
  },
  {
    id: 9,
    title: 'Bug Report Analysis',
    description: 'Analyze and prioritize a list of bug reports to help with sprint planning.',
    category: 'analysis',
    department: 'engineering',
    tags: ['bugs', 'triage', 'prioritization', 'sprint'],
    prompt: `You are an engineering manager triaging bugs for the next sprint. Analyze these bug reports and help me prioritize them.

For each bug, assess and provide:
1. Severity Score (P0-Critical, P1-High, P2-Medium, P3-Low)
2. User Impact (how many users affected, workaround available?)
3. Estimated Complexity (S, M, L, XL)
4. Suggested Sprint Priority (must-fix, should-fix, nice-to-fix, backlog)
5. Recommended Owner (frontend, backend, infra, or specific team area)

Then provide:
- A prioritized sprint plan with the top items to tackle first
- Any bugs that might be related or have the same root cause
- Quick wins that could be fixed in under 2 hours

Bug reports to analyze:
[paste bug reports, tickets, or descriptions here]`,
  },
  {
    id: 10,
    title: 'Blog Post Outline',
    description: 'Create a structured, SEO-friendly blog post outline with hooks and talking points.',
    category: 'creative',
    department: 'marketing',
    tags: ['blog', 'content', 'seo', 'outline'],
    prompt: `You are a content strategist writing for a B2B SaaS blog. Create a detailed blog post outline that drives organic traffic and engagement.

Build an outline that includes:
1. Working Title (compelling, includes target keyword, under 60 characters)
2. Meta Description (155 characters, includes keyword, has a call-to-action)
3. Hook/Introduction (3 options: stat-based, story-based, question-based)
4. Section Headers (H2s and H3s, 5-7 main sections)
5. Key Points Under Each Section (2-3 bullets of what to cover)
6. Data/Stats to Include (suggest relevant statistics to research)
7. Internal/External Link Opportunities (types of pages to link to)
8. Call-to-Action (what action readers should take)
9. Social Media Snippets (2 tweet-length teasers)

Topic: [blog topic]
Target keyword: [primary SEO keyword]
Target audience: [who is reading this]
Goal: [educate, convert, thought leadership, etc.]
Word count target: [e.g., 1500-2000 words]`,
  },
  {
    id: 11,
    title: 'Social Media Calendar',
    description: 'Generate a full week of social media posts across platforms with varied content types.',
    category: 'creative',
    department: 'marketing',
    tags: ['social media', 'calendar', 'content', 'posts'],
    prompt: `You are a social media manager for a B2B SaaS company. Create a week-long social media content calendar.

For each day (Monday-Friday), create posts for LinkedIn and Twitter/X that include:
1. Post Copy (platform-appropriate length and tone)
2. Content Type (thought leadership, product tip, customer story, industry news, team culture)
3. Visual Suggestion (what image, graphic, or video to pair with it)
4. Hashtags (3-5 relevant hashtags per post)
5. Best Time to Post (based on platform best practices)
6. Engagement Hook (question, poll, or CTA to drive comments)

Ensure variety across the week - mix educational, promotional, and engagement content. No more than 1 promotional post per 4 posts.

Company/Product: [company name and what you do]
Target audience: [who follows you]
Key themes this week: [product launch, event, trend, etc.]
Brand voice: [professional, casual, witty, authoritative, etc.]`,
  },
  {
    id: 12,
    title: 'Email Campaign Copy',
    description: 'Write A/B test variants for email campaigns with subject lines and body copy.',
    category: 'writing',
    department: 'marketing',
    tags: ['email', 'campaign', 'ab test', 'copy'],
    prompt: `You are an email marketing specialist. Create A/B test variants for an email campaign.

For each variant (A and B), write:
1. Subject Line (under 50 characters, create 3 options each)
2. Preview Text (the snippet shown in inbox, 90 characters max)
3. Email Body (300 words max, includes headline, body, CTA)
4. CTA Button Text (action-oriented, 3-5 words)
5. P.S. Line (optional but often the most-read part)

Variant A should be more direct/benefit-focused.
Variant B should be more curiosity/story-driven.

Also provide:
- Which metric each variant is optimized for (open rate vs. click rate)
- Suggested send time
- Recommended segment for each variant

Campaign goal: [drive signups, announce feature, re-engage, etc.]
Target audience: [segment description]
Key message: [what you want recipients to know/do]
Offer (if any): [discount, free trial, content download, etc.]`,
  },
  {
    id: 13,
    title: 'Training Module Outline',
    description: 'Create a structured training module outline with learning objectives, activities, and assessments.',
    category: 'planning',
    department: 'enablement',
    tags: ['training', 'module', 'learning', 'curriculum'],
    prompt: `You are an instructional designer creating a training module for adult learners in a corporate setting.

Build a complete training module outline:
1. Module Title & Description (clear and engaging)
2. Learning Objectives (3-5 measurable objectives using Bloom's taxonomy verbs)
3. Prerequisites (what learners should know beforehand)
4. Estimated Duration (total time and per-section breakdown)
5. Content Sections (4-6 sections, each with):
   - Section title and key concepts
   - Teaching method (video, reading, demo, discussion)
   - Practice activity or exercise
   - Transition to next section
6. Knowledge Check Questions (5 quiz questions with answer key)
7. Hands-on Exercise (a realistic scenario they can practice with)
8. Summary & Key Takeaways (5 bullet points)
9. Additional Resources (links, guides, references to suggest)

Topic: [training topic]
Audience: [role and experience level]
Delivery format: [self-paced e-learning, live workshop, blended]
Time constraint: [how long the module should take]`,
  },
  {
    id: 14,
    title: 'Knowledge Check Questions',
    description: 'Generate varied quiz questions with explanations for any training topic.',
    category: 'writing',
    department: 'enablement',
    tags: ['quiz', 'assessment', 'questions', 'knowledge check'],
    prompt: `You are an assessment designer creating knowledge check questions for a training program.

Generate 10 questions in a mix of formats:
- 4 Multiple Choice (4 options each, one correct)
- 2 True/False (with explanation of why)
- 2 Scenario-Based (realistic workplace situation + question)
- 2 Short Answer (open-ended, with model answer)

For each question, provide:
1. The question text
2. Answer options (if applicable)
3. Correct answer
4. Explanation of why it's correct (2-3 sentences)
5. Difficulty level (Basic, Intermediate, Advanced)
6. Which learning objective it maps to

Questions should test understanding, not just memorization. Include at least 2 questions that require applying knowledge to a new situation.

Topic: [training topic]
Key concepts to cover: [list 3-5 main concepts]
Audience level: [beginner, intermediate, advanced]`,
  },
  {
    id: 15,
    title: 'Feature Release Notes',
    description: 'Convert technical release notes into customer-friendly copy that highlights benefits.',
    category: 'writing',
    department: 'enablement',
    tags: ['release notes', 'feature', 'customer-facing', 'communication'],
    prompt: `You are a product communications specialist. Convert these technical release notes into customer-friendly content.

Create three versions:
1. In-App Notification (50 words max, focus on the #1 benefit)
2. Email Announcement (200 words, benefit-focused, includes CTA to try it)
3. Help Article Section (300 words, includes what it does, how to use it, and tips)

Guidelines:
- Lead with the benefit, not the feature name
- Use "you" language, not "we" language
- Include a concrete example of how it helps
- Avoid technical jargon - explain it like the user is a busy small business owner
- Add a "Pro Tip" for getting the most out of the feature

Technical release notes:
[paste technical notes, Jira tickets, or engineering descriptions here]

Target user: [who uses this feature]
Feature category: [billing, scheduling, communication, reporting, etc.]`,
  },
  {
    id: 16,
    title: 'Job Description Generator',
    description: 'Write a compelling, inclusive job posting that attracts top talent.',
    category: 'writing',
    department: 'people',
    tags: ['job description', 'hiring', 'recruiting', 'talent'],
    prompt: `You are a talent acquisition specialist writing an inclusive, compelling job description.

Create a job posting with:
1. Job Title (clear, no internal jargon or inflated titles)
2. Opening Hook (2-3 sentences on why this role matters and what makes it exciting)
3. What You'll Do (6-8 bullet points, start with action verbs, be specific)
4. What You Bring (split into Required and Nice-to-Have, 4-5 each)
5. What We Offer (compensation philosophy, benefits highlights, culture perks)
6. About the Team (who they'll work with, team size, reporting structure)
7. Our Hiring Process (3-5 steps so candidates know what to expect)

Guidelines:
- Use gender-neutral language throughout
- Focus on outcomes over years of experience
- Remove unnecessary requirements that create barriers
- Show the growth opportunity in this role
- Keep total length under 600 words

Role: [job title]
Team: [which team/department]
Level: [entry, mid, senior, lead, manager]
Location: [remote, hybrid, on-site + city]
Key technologies or skills: [list relevant tools/skills]`,
  },
  {
    id: 17,
    title: 'Interview Question Set',
    description: 'Generate role-specific behavioral and technical interview questions with scoring rubrics.',
    category: 'planning',
    department: 'people',
    tags: ['interview', 'hiring', 'questions', 'assessment'],
    prompt: `You are a hiring manager preparing a structured interview. Generate a comprehensive interview question set.

Create an interview guide with:
1. Opening Questions (2 icebreakers to put the candidate at ease)
2. Behavioral Questions (5 questions using STAR format prompts):
   - Each should map to a core competency for the role
   - Include follow-up probes for each
3. Technical/Role-Specific Questions (4 questions):
   - Mix of knowledge checks and scenario-based problems
   - Include expected answer framework
4. Culture & Values Questions (3 questions):
   - Assess alignment with team dynamics and company values
5. Candidate Questions (suggest 3 questions to encourage them to ask)

For each question, include:
- What competency it assesses
- Red flags to watch for
- Green flags that indicate a strong answer
- Scoring rubric (1-4 scale with descriptions)

Role: [job title]
Level: [entry, mid, senior, lead]
Key competencies: [list 4-5 must-have competencies]
Team culture: [describe the team vibe and values]`,
  },
  {
    id: 18,
    title: 'Performance Review Helper',
    description: 'Draft constructive, specific performance feedback with growth-oriented language.',
    category: 'communication',
    department: 'people',
    tags: ['performance review', 'feedback', 'growth', 'development'],
    prompt: `You are an HR business partner helping a manager write a thoughtful performance review.

Draft a performance review that includes:
1. Overall Summary (3-4 sentences capturing the review period holistically)
2. Key Accomplishments (3-5 specific achievements with impact/metrics)
3. Strengths (3 core strengths with concrete examples of each)
4. Growth Areas (2-3 areas for development, framed constructively):
   - What was observed (specific behavior, not character judgment)
   - Why it matters (impact on team, outcomes, or career growth)
   - Suggested action (concrete step to improve)
5. Goals for Next Period (3 SMART goals)
6. Development Recommendations (training, mentorship, stretch assignments)
7. Closing Statement (encouraging, forward-looking)

Tone guidelines:
- Be specific - use examples, not generalizations
- Balance honest feedback with genuine encouragement
- Focus on behaviors and outcomes, not personality traits
- Use "I observed" language, not "you always/never"

Employee name: [name]
Role: [their role]
Review period: [timeframe]
Key projects they worked on: [list projects]
What went well: [your notes on positives]
Where they can grow: [your notes on development areas]`,
  },
  {
    id: 19,
    title: 'Meeting Summary Template',
    description: 'Transform messy meeting notes into a clean summary with decisions, action items, and owners.',
    category: 'meetings',
    department: 'operations',
    tags: ['meeting', 'summary', 'action items', 'notes'],
    prompt: `You are an executive assistant creating a professional meeting summary. Turn these raw notes into a structured, actionable document.

Format the summary as:
1. Meeting Info (title, date, attendees, duration)
2. TL;DR (2-3 sentence executive summary for those who didn't attend)
3. Key Decisions Made (numbered list, be specific about what was decided)
4. Action Items Table:
   | Action Item | Owner | Deadline | Priority |
   | ----------- | ----- | -------- | -------- |
5. Discussion Highlights (3-5 key topics discussed with brief context)
6. Open Questions (unresolved items that need follow-up)
7. Next Meeting (date, proposed agenda items)

Guidelines:
- Convert vague notes into specific, actionable items
- Every action item must have an owner and deadline
- If something was discussed but not decided, put it in Open Questions
- Keep the entire summary under 1 page

Raw meeting notes:
[paste your meeting notes, transcript, or bullet points here]`,
  },
  {
    id: 20,
    title: 'Strategic Initiative Brief',
    description: 'Draft a one-page initiative proposal that makes a compelling case to leadership.',
    category: 'planning',
    department: 'leadership',
    tags: ['strategy', 'initiative', 'proposal', 'business case'],
    prompt: `You are a strategic planning advisor helping draft a one-page initiative brief for executive review.

Create a concise initiative proposal covering:
1. Initiative Title (clear and specific)
2. Executive Summary (3 sentences: problem, solution, expected impact)
3. Problem Statement:
   - What's happening today (current state with data if possible)
   - Why it matters (business impact, risk of inaction)
   - Who it affects (teams, customers, revenue)
4. Proposed Solution:
   - What we'll do (2-3 key components)
   - How it works (high-level approach)
   - Why this approach (vs. alternatives considered)
5. Expected Outcomes:
   - 3 measurable success metrics with targets
   - Timeline to see results
6. Resource Requirements:
   - People (headcount, time commitment)
   - Budget (estimated cost)
   - Dependencies (what needs to be true for this to work)
7. Risks & Mitigation (top 3 risks with mitigation strategies)
8. Ask (what you need from leadership: approval, budget, resources, etc.)

Initiative idea: [describe your initiative]
Problem you're solving: [describe the pain point]
Target outcome: [what success looks like]
Budget context: [any constraints or existing budget]`,
  },
];
