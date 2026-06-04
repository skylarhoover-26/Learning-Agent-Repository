// curriculum.js — AI Learning Companion
// All department, sub-team, and task data for the bot.
// Source of truth: curriculum-map.md
// ─────────────────────────────────────────────────────────────────────────────

const DEPARTMENTS = [
  'Analytics',
  'Business Development',
  'Business Solutions',
  'Customer Success',
  'Enablement',
  'Engineering',
  'Enterprise',
  'Executive',
  'Finance',
  'Information Systems',
  'Innovation',
  'Internal Tooling',
  'Legal',
  'Marketing',
  'Partner Development',
  'People',
  'Product',
  'Risk',
  'Sales',
  'Strategy and Operations',
];

// Departments where the bot asks a follow-up sub-team question
const SUBTEAM_DEPTS = ['Business Solutions', 'Customer Success', 'Engineering', 'Risk'];

const SUBTEAMS = {
  'Business Solutions': ['Bookkeeping', 'Operations', 'Payroll', 'Success Advisors', 'Tax'],
  'Customer Success': [
    'Account Management',
    'Onboarding',
    'Operations',
    'Pro Advocate',
    'QA',
    'Retention',
    'Success Advisors',
    'Support',
    'Website Onboarding',
  ],
  Engineering: ['Core', 'Data Engineering', 'DevOps', 'Fintech', 'Innovation', 'Internal Tooling', 'QA', 'Talent Programs'],
  Risk: ['Fraud Data Analysts', 'Operations', 'Payment Support', 'Risk Analysts'],
};

// Default task list per department (up to 8 shown as buttons)
const DEPARTMENT_TASKS = {
  Analytics: [
    'Writing SQL queries',
    'Summarizing and interpreting data',
    'Writing insight summaries for stakeholders',
    'Hypothesis formation',
    'Data quality documentation',
    'Dashboard and report narratives',
  ],
  'Business Development': [
    'Prospect and market research',
    'Outreach and prospecting emails',
    'Pitch decks and proposals',
    'Meeting and call preparation',
    'Competitive landscape analysis',
    'Pipeline reporting and updates',
  ],
  'Business Solutions': [
    'Requirements gathering',
    'Process documentation',
    'Business case writing',
    'Stakeholder presentations',
    'ROI analysis',
    'Competitive or market analysis',
  ],
  'Customer Success': [
    'Writing customer communications',
    'QBR and EBR preparation',
    'Onboarding documentation',
    'Escalation writing',
    'Renewal preparation',
    'Health analysis',
    'Playbook building',
  ],
  Enablement: [
    'Training content creation',
    'Playbook and job aid creation',
    'Content updating',
    'Onboarding program design',
    'Knowledge gap assessment',
    'Effectiveness measurement',
  ],
  Engineering: [
    'Writing code',
    'Debugging',
    'Code review',
    'Writing documentation',
    'Translating technical concepts for stakeholders',
    'Test writing',
    'Workflow automation',
  ],
  Enterprise: [
    'Executive client communications',
    'Enterprise onboarding plans',
    'Business review preparation',
    'Multi-stakeholder coordination',
    'Escalation and issue management',
    'Renewal and expansion strategy',
  ],
  Executive: [
    'Strategic communications',
    'Synthesizing reports and briefings',
    'Board and investor preparation',
    'Cross-functional decision documentation',
    'Performance and goal reviews',
  ],
  Finance: [
    'Variance analysis write-ups',
    'Financial report preparation',
    'Budget preparation support',
    'Stakeholder communication',
    'Contract and document review support',
    'Process documentation',
  ],
  'Information Systems': [
    'Writing user-facing communications',
    'System and process documentation',
    'Troubleshooting support',
    'Vendor evaluation',
    'Security incident documentation',
    'Help desk knowledge base',
  ],
  Innovation: [
    'Emerging technology research',
    'Proof of concept documentation',
    'Internal pitch and proposal writing',
    'Competitive innovation landscape',
    'Knowledge sharing and documentation',
    'AI capability mapping for the org',
  ],
  'Internal Tooling': [
    'Writing automation scripts',
    'Requirements translation',
    'Technical documentation',
    'Identifying automation opportunities',
    'Testing and QA',
    'Org-wide automation playbook',
  ],
  Legal: [
    'Contract review and summarization',
    'Legal research synthesis',
    'Policy and procedure drafting',
    'Legal correspondence and communications',
    'Compliance documentation',
    'Contract template development',
  ],
  Marketing: [
    'Writing content',
    'Research and market analysis',
    'Campaign briefing',
    'Performance reporting',
    'SEO and keyword content',
    'Copywriting variations',
    'Workflow automation',
  ],
  'Partner Development': [
    'Partner research and qualification',
    'Partner outreach and recruitment',
    'Partner onboarding materials',
    'Co-marketing and co-selling support',
    'Partnership performance reporting',
  ],
  People: [
    'Job description writing',
    'Employee communications',
    'Policy writing and updating',
    'Interview and screening support',
    'Performance review support',
    'Onboarding documentation',
  ],
  Product: [
    'Writing PRDs and feature specs',
    'User research synthesis',
    'Competitive analysis',
    'Writing user stories',
    'Roadmap communication',
    'Metrics and decision framing',
    'Workflow automation',
  ],
  Risk: [
    'Risk assessment documentation',
    'Policy review and plain-language summaries',
    'Compliance reporting',
    'Incident documentation',
    'Regulatory research',
    'Risk communication',
  ],
  Sales: [
    'Lead research',
    'Writing outreach emails',
    'Call preparation',
    'Follow-up emails',
    'Proposals and presentations',
    'CRM notes and updates',
    'Objection handling prep',
  ],
  'Strategy and Operations': [
    'Strategic analysis and synthesis',
    'Executive reporting and presentations',
    'OKR tracking and reporting',
    'Process documentation and improvement',
    'Cross-functional project coordination',
    'Strategic options analysis',
  ],
};

// Sub-team overrides — reorder the task list to surface the most relevant tasks first
// (same task pool as department, just prioritized differently)
const SUBTEAM_TASK_PRIORITY = {
  'Business Solutions': {
    Bookkeeping: [
      'Process documentation',
      'Business case writing',
      'Requirements gathering',
      'Stakeholder presentations',
      'ROI analysis',
      'Competitive or market analysis',
    ],
    Payroll: [
      'Process documentation',
      'Requirements gathering',
      'Business case writing',
      'Stakeholder presentations',
      'ROI analysis',
      'Competitive or market analysis',
    ],
    Tax: [
      'Business case writing',
      'Process documentation',
      'Requirements gathering',
      'ROI analysis',
      'Stakeholder presentations',
      'Competitive or market analysis',
    ],
    'Success Advisors': [
      'Business case writing',
      'Stakeholder presentations',
      'Requirements gathering',
      'Process documentation',
      'ROI analysis',
      'Competitive or market analysis',
    ],
    Operations: [
      'Process documentation',
      'Requirements gathering',
      'Stakeholder presentations',
      'Business case writing',
      'ROI analysis',
      'Competitive or market analysis',
    ],
  },
  'Customer Success': {
    Support: [
      'Writing customer communications',
      'Escalation writing',
      'Playbook building',
      'QBR and EBR preparation',
      'Onboarding documentation',
      'Renewal preparation',
      'Health analysis',
    ],
    'Account Management': [
      'Writing customer communications',
      'QBR and EBR preparation',
      'Renewal preparation',
      'Health analysis',
      'Escalation writing',
      'Onboarding documentation',
      'Playbook building',
    ],
    Onboarding: [
      'Onboarding documentation',
      'Writing customer communications',
      'Playbook building',
      'QBR and EBR preparation',
      'Escalation writing',
      'Renewal preparation',
      'Health analysis',
    ],
    'Website Onboarding': [
      'Onboarding documentation',
      'Writing customer communications',
      'Playbook building',
      'QBR and EBR preparation',
      'Escalation writing',
      'Renewal preparation',
      'Health analysis',
    ],
    Retention: [
      'Renewal preparation',
      'Health analysis',
      'Writing customer communications',
      'QBR and EBR preparation',
      'Escalation writing',
      'Onboarding documentation',
      'Playbook building',
    ],
    'Success Advisors': [
      'Writing customer communications',
      'QBR and EBR preparation',
      'Renewal preparation',
      'Health analysis',
      'Escalation writing',
      'Onboarding documentation',
      'Playbook building',
    ],
    QA: [
      'Playbook building',
      'Writing customer communications',
      'Escalation writing',
      'Onboarding documentation',
      'QBR and EBR preparation',
      'Renewal preparation',
      'Health analysis',
    ],
    'Pro Advocate': [
      'Writing customer communications',
      'Escalation writing',
      'QBR and EBR preparation',
      'Playbook building',
      'Onboarding documentation',
      'Renewal preparation',
      'Health analysis',
    ],
    Operations: [
      'Playbook building',
      'Onboarding documentation',
      'Writing customer communications',
      'QBR and EBR preparation',
      'Escalation writing',
      'Renewal preparation',
      'Health analysis',
    ],
  },
  Engineering: {
    'Data Engineering': [
      'Writing code',
      'Writing documentation',
      'Debugging',
      'Code review',
      'Test writing',
      'Translating technical concepts for stakeholders',
      'Workflow automation',
    ],
    DevOps: [
      'Writing documentation',
      'Writing code',
      'Workflow automation',
      'Debugging',
      'Test writing',
      'Code review',
      'Translating technical concepts for stakeholders',
    ],
    Fintech: [
      'Writing code',
      'Code review',
      'Writing documentation',
      'Debugging',
      'Test writing',
      'Translating technical concepts for stakeholders',
      'Workflow automation',
    ],
    QA: [
      'Test writing',
      'Writing documentation',
      'Code review',
      'Debugging',
      'Writing code',
      'Translating technical concepts for stakeholders',
      'Workflow automation',
    ],
    Innovation: [
      'Writing documentation',
      'Writing code',
      'Debugging',
      'Code review',
      'Test writing',
      'Workflow automation',
      'Translating technical concepts for stakeholders',
    ],
    'Internal Tooling': [
      'Workflow automation',
      'Writing code',
      'Writing documentation',
      'Debugging',
      'Test writing',
      'Code review',
      'Translating technical concepts for stakeholders',
    ],
  },
};

// ─── Quick Wins ───────────────────────────────────────────────────────────────
// Maps department → task → { quickWin, prompt, what }
// Used by Module 2 to give each user a personalized "try it now" prompt.
// If a department/task combo isn't listed, modules.js falls back to a generic prompt.

const QUICK_WINS = {
  Analytics: {
    'Writing SQL queries': {
      quickWin: 'Use AI to generate or debug a SQL query in under 5 minutes',
      prompt: 'I\'m a data analyst at a fintech company. Write a SQL query that [describe what you need — e.g. "joins the users and transactions tables and returns monthly active users by region for the last 6 months"]. Use standard SQL syntax and add comments explaining each major step.',
      what: 'a working query with comments you can run or hand off immediately',
    },
    'Summarizing and interpreting data': {
      quickWin: 'Turn a dataset or table into a plain-language insight summary',
      prompt: 'I\'m analyzing [describe the dataset]. Here are the key numbers: [paste your data or describe it]. Write a 3-bullet insight summary for a non-technical audience. Lead with the most important finding, then two supporting observations.',
      what: 'a crisp summary your stakeholders will actually read',
    },
    'Writing insight summaries for stakeholders': {
      quickWin: 'Draft your next insight summary in under 10 minutes',
      prompt: 'I need to write an insight summary for [audience, e.g. "our VP of Product"]. The key data points are: [paste your findings]. Write a 200-word summary in plain language. Start with the headline finding, explain why it matters, and end with a recommended action.',
      what: 'a polished stakeholder summary that would normally take 45 minutes',
    },
    'Dashboard and report narratives': {
      quickWin: 'Write the narrative section of your next report with AI',
      prompt: 'Help me write the narrative section for a [weekly/monthly/quarterly] report. The audience is [team/leadership]. Key metrics this period: [paste metrics]. Write 3 short paragraphs: (1) what happened, (2) what it means, (3) what we\'re doing about it.',
      what: 'a report narrative that takes minutes instead of an hour',
    },
  },
  'Business Development': {
    'Prospect and market research': {
      quickWin: 'Get a research brief on a target company or market in minutes',
      prompt: 'I\'m in business development at a fintech company. Research [company name or market segment] for me. I need: (1) what they do and who they serve, (2) recent news or growth signals, (3) potential fit with our product (we help [brief description]), (4) 3 smart questions I should ask in an intro call.',
      what: 'a call prep brief that would normally take an hour of research',
    },
    'Outreach and prospecting emails': {
      quickWin: 'Write a personalized cold outreach email that doesn\'t sound like a template',
      prompt: 'Write a cold outreach email to [prospect role, e.g. "a CFO at a mid-market SaaS company"]. Context: [one sentence about their company or a recent trigger — e.g. "they just raised a Series B"]. Our value prop: [one sentence]. Goal: get a 20-min discovery call. Keep it under 100 words, no jargon, end with a soft ask.',
      what: 'a short, personalized email with a much higher reply rate than a template',
    },
    'Pitch decks and proposals': {
      quickWin: 'Use AI to structure your next pitch or proposal outline',
      prompt: 'Help me outline a business proposal for [prospect or situation]. The goal is [what you\'re proposing]. Key facts: [pain points, their situation, your solution]. Create a slide-by-slide outline with: (1) the problem, (2) our solution, (3) how it works, (4) results/proof, (5) next steps. Include a one-sentence talking point for each slide.',
      what: 'a full proposal outline you can take straight into slides',
    },
  },
  'Customer Success': {
    'Writing customer communications': {
      quickWin: 'Draft your next customer-facing email or message in under 5 minutes',
      prompt: 'I\'m a Customer Success Manager. Write a professional, warm email to a customer about [situation — e.g. "an upcoming QBR", "a delayed feature", "a renewal"]. Key context: [relevant details]. Tone: confident but human. Length: 3–4 short paragraphs. End with a clear next step.',
      what: 'a polished customer email that sounds like you, not a template',
    },
    'QBR and EBR preparation': {
      quickWin: 'Build your next QBR agenda and talking points with AI',
      prompt: 'I\'m preparing a Quarterly Business Review for a customer in [industry]. Their goals are: [list 2-3]. What we\'ve delivered this quarter: [key wins]. Open issues: [any gaps or concerns]. Create: (1) a 45-min agenda, (2) 3 key talking points per section, (3) suggested questions to ask them to uncover expansion opportunities.',
      what: 'a ready-to-use QBR plan that takes 15 minutes instead of 2 hours',
    },
    'Escalation writing': {
      quickWin: 'Write a clear, professional escalation message that gets action',
      prompt: 'Write a professional escalation message for this situation: [describe the issue]. The customer is [describe their sentiment — frustrated, at risk, etc.]. I need to escalate internally to [team/leader]. Include: (1) clear summary of the issue, (2) customer impact, (3) what\'s been tried, (4) what I\'m asking for. Keep it factual and concise.',
      what: 'an escalation that gets read and acted on, not deprioritized',
    },
    'Playbook building': {
      quickWin: 'Turn your best process knowledge into a reusable playbook section',
      prompt: 'Help me document a CS playbook for [scenario — e.g. "handling an at-risk customer", "onboarding a new enterprise account"]. Structure it as: (1) when to use this playbook, (2) step-by-step process, (3) key messages to use, (4) common pitfalls to avoid. Write in plain language a new team member could follow.',
      what: 'a playbook section that captures your expertise for the whole team',
    },
  },
  Enablement: {
    'Training content creation': {
      quickWin: 'Draft a training module outline and key learning points in minutes',
      prompt: 'I\'m designing training content for [audience — e.g. "new Customer Success reps"]. Topic: [topic]. Learning objective: after this training, participants will be able to [specific skill or behavior]. Create: (1) a 30-min session outline, (2) 3 key learning points, (3) one practice activity, (4) a 3-question knowledge check.',
      what: 'a complete training module outline you can build from immediately',
    },
    'Playbook and job aid creation': {
      quickWin: 'Turn a process into a one-page job aid people will actually use',
      prompt: 'Create a one-page job aid for [process or task]. Audience: [role]. Format: step-by-step with a decision tree if needed. Include: what to do, what not to do, and one example of the right output. Write in plain language — this will be used in the moment, not studied.',
      what: 'a job aid your team will actually refer to during their work',
    },
    'Content updating': {
      quickWin: 'Update outdated content without rewriting from scratch',
      prompt: 'I need to update this training content to reflect [what changed — e.g. "a new product feature", "a process change"]. Here\'s the original content: [paste]. Here\'s what changed: [describe]. Rewrite only the sections that need updating and flag any other areas that may need a human review.',
      what: 'updated content in minutes without losing what already works',
    },
  },
  Engineering: {
    'Writing code': {
      quickWin: 'Use AI to write a first draft of a function or component',
      prompt: 'Write a [language] function that [describe what it does]. Requirements: [list any constraints, inputs, outputs]. Add inline comments explaining the logic. Include basic error handling. Don\'t optimize prematurely — prioritize readability.',
      what: 'a working first draft that takes minutes to review and refine',
    },
    Debugging: {
      quickWin: 'Paste an error and get a diagnosis in under 2 minutes',
      prompt: 'I\'m getting this error: [paste error message]. Here\'s the relevant code: [paste code]. Context: [what you were trying to do when it broke]. Give me: (1) what\'s causing this error, (2) the fix with explanation, (3) how to prevent it in the future.',
      what: 'a diagnosis and fix explanation that saves you a long debugging session',
    },
    'Writing documentation': {
      quickWin: 'Turn your code into clear, useful docs in one prompt',
      prompt: 'Write documentation for this code: [paste code or describe the function/module]. Include: (1) what it does, (2) inputs and outputs with types, (3) usage example, (4) any important edge cases or limitations. Format: Markdown.',
      what: 'complete, readable docs in the time it would take to write one paragraph',
    },
    'Code review': {
      quickWin: 'Get a pre-review before you submit — catch issues AI can spot',
      prompt: 'Review this code for: [language]. Look for: (1) logic errors or edge cases, (2) performance issues, (3) readability and naming, (4) anything that could cause bugs in production. Here\'s the code: [paste]. Give me specific line-by-line feedback where relevant.',
      what: 'a pre-review that catches obvious issues before your teammates do',
    },
  },
  Finance: {
    'Variance analysis write-ups': {
      quickWin: 'Write your next variance analysis narrative in under 10 minutes',
      prompt: 'I need to write a variance analysis narrative for [period]. Budget vs. actual: [key numbers and variances — describe rather than paste raw financial data]. Primary drivers of variance: [list reasons]. Audience: [finance team / executive leadership]. Write 2–3 paragraphs: what happened, why it happened, and what we\'re watching going forward.',
      what: 'a clear variance narrative that communicates the story, not just the numbers',
    },
    'Financial report preparation': {
      quickWin: 'Get the structure and language for your next financial report',
      prompt: 'Help me structure a [monthly/quarterly] financial report for [audience]. Key sections to include: [executive summary, P&L, key metrics, risks, outlook]. For each section, give me the recommended structure and 2–3 example sentences showing the right tone and level of detail for this audience.',
      what: 'a report template and sample language you can customize with your numbers',
    },
    'Stakeholder communication': {
      quickWin: 'Translate financial results into a message non-finance stakeholders will understand',
      prompt: 'I need to communicate [financial results or situation] to [non-finance audience — e.g. "department heads", "the exec team"]. The key facts are: [describe the situation without sensitive data]. Write a clear, jargon-free 150-word summary that explains what happened and what it means for the business.',
      what: 'a message your stakeholders will actually read and understand',
    },
  },
  Legal: {
    'Contract review and summarization': {
      quickWin: 'Summarize the key terms and risks in a contract section',
      prompt: 'I\'m reviewing a contract and need help summarizing [section or clause type — e.g. "the indemnification clause", "the termination provisions"]. Here\'s a paraphrased version of the key terms: [describe the terms without actual contract text or party names]. Summarize: (1) what this clause does, (2) key obligations for each party, (3) any standard risks or red flags to consider. Note: I will do the final legal review — this is to help me prep.',
      what: 'a plain-language summary that speeds up your review process',
    },
    'Legal correspondence and communications': {
      quickWin: 'Draft a professional legal communication with the right tone',
      prompt: 'Help me draft a [type of communication — e.g. "cease and desist letter", "response to a vendor inquiry", "internal legal memo"]. Context: [describe the situation in general terms — no names or sensitive details]. Tone: [formal/professional]. Include: [key points to address]. I will review and finalize before sending.',
      what: 'a first draft that captures the right structure and tone',
    },
    'Compliance documentation': {
      quickWin: 'Turn a compliance requirement into clear, actionable documentation',
      prompt: 'Help me document a compliance process for [requirement or regulation — described in general terms]. The audience is [internal team / employees / auditors]. Format: step-by-step with clear ownership at each step. Include what triggers the process, what must be done, and how it\'s recorded.',
      what: 'a compliance document that\'s audit-ready and employee-friendly',
    },
  },
  Marketing: {
    'Writing content': {
      quickWin: 'Draft a piece of marketing content in the time it takes to brief a writer',
      prompt: 'Write a [content type — e.g. "LinkedIn post", "blog intro", "email newsletter"] about [topic]. Audience: [target reader]. Tone: [brand voice — e.g. "professional but conversational", "direct and data-driven"]. Key message: [what you want them to take away]. Length: [word count or format]. Include a clear call to action: [what you want them to do].',
      what: 'a content draft ready for your review in minutes',
    },
    'Research and market analysis': {
      quickWin: 'Get a structured competitive or market brief faster than a Google deep dive',
      prompt: 'Help me analyze [market segment or competitor] for a fintech marketing team. I need: (1) overview of the space and key players, (2) key messaging themes competitors are using, (3) gaps or opportunities our brand could own, (4) 3 questions I should be answering in our content strategy.',
      what: 'a research brief that informs your content and campaign decisions',
    },
    'Campaign briefing': {
      quickWin: 'Write a campaign brief that gives your team everything they need to execute',
      prompt: 'Write a campaign brief for [campaign name or goal]. Include: campaign objective, target audience, key message, channels, deliverables, success metrics, and timeline. Make it specific enough that a designer or copywriter could start working from it without a kickoff call.',
      what: 'a complete brief that reduces back-and-forth with your creative team',
    },
    'Copywriting variations': {
      quickWin: 'Generate 5 variations of a headline or CTA instantly',
      prompt: 'Write 5 variations of [a headline/CTA/subject line] for [channel — email, ad, landing page]. Goal: [what you want the reader to do]. Audience: [who they are]. Include a mix of: emotional, benefit-led, curiosity-driven, and direct styles. Flag which approach each one uses.',
      what: '5 options to test instead of agonizing over one version',
    },
  },
  People: {
    'Job description writing': {
      quickWin: 'Write a job description that attracts the right candidates',
      prompt: 'Write a job description for a [role title] at a fintech company. The role reports to [manager role]. Key responsibilities: [list 4-5]. Must-have qualifications: [list 3-4]. Nice-to-have: [list 1-2]. Tone: professional but human — we want candidates to feel excited, not intimidated. Avoid jargon and gendered language.',
      what: 'a polished JD that your recruiting team can post immediately',
    },
    'Employee communications': {
      quickWin: 'Draft a clear, empathetic people communication in minutes',
      prompt: 'Write an employee communication about [topic — e.g. "a policy change", "a new benefit", "a reorg update"]. Audience: [all employees / a specific team]. Tone: transparent, direct, and human. Include: (1) what\'s changing, (2) why, (3) what it means for employees, (4) next steps or where to ask questions.',
      what: 'a communication that reduces confusion and builds trust',
    },
    'Performance review support': {
      quickWin: 'Draft performance review language that\'s specific and fair',
      prompt: 'Help me write performance review feedback for an employee in [role]. Strengths I want to highlight: [describe in general terms]. Areas for growth: [describe]. The feedback should be: specific, behavior-focused (not personality-focused), and actionable. Write 2 paragraphs: one on strengths, one on growth areas.',
      what: 'review language that\'s fair, specific, and ready to use',
    },
  },
  Product: {
    'Writing PRDs and feature specs': {
      quickWin: 'Draft a PRD structure and problem statement section with AI',
      prompt: 'Help me write a PRD for [feature name]. Problem we\'re solving: [describe]. User: [who this is for and their pain point]. Proposed solution: [high-level]. Include sections for: problem statement, goals and success metrics, user stories, scope (in/out), and open questions. Keep it concise — this PRD should fit on 2 pages.',
      what: 'a structured PRD first draft your team can react to immediately',
    },
    'User research synthesis': {
      quickWin: 'Turn raw research notes into a clear synthesis in one prompt',
      prompt: 'I have research notes from [number] user interviews about [topic]. Key themes I\'m seeing: [list what you\'ve noticed]. Help me: (1) structure these into 3–5 main insight clusters, (2) write a one-sentence summary of each insight, (3) identify the most important implication for our product roadmap.',
      what: 'a research synthesis that\'s ready to share with your team or stakeholders',
    },
    'Writing user stories': {
      quickWin: 'Generate a set of well-formed user stories from a feature idea',
      prompt: 'Write user stories for [feature name]. The core user is [role] who wants to [goal] so that [benefit]. Include: (1) the primary happy path story, (2) 2–3 edge case or error state stories, (3) acceptance criteria for each in Given/When/Then format.',
      what: 'a complete set of user stories with acceptance criteria for your sprint',
    },
  },
  Sales: {
    'Lead research': {
      quickWin: 'Build a call prep brief on a prospect in under 5 minutes',
      prompt: 'Help me prepare for a sales call with [prospect role] at [company type — e.g. "a mid-market SaaS company"]. I need: (1) what challenges this type of company typically faces that our product solves, (2) 3 discovery questions I should ask, (3) likely objections and how to handle them, (4) one hook for the opening of the call.',
      what: 'a call prep brief that makes you sound like you\'ve done hours of research',
    },
    'Writing outreach emails': {
      quickWin: 'Write a cold email that gets replies — not deleted',
      prompt: 'Write a cold outreach email to a [prospect role] at [company type]. Trigger: [why you\'re reaching out now — e.g. "they just posted a job for a CFO", "they announced expansion"]. Our value: [one sentence]. Keep it under 75 words. No bullet points. End with one clear, low-commitment ask.',
      what: 'a personalized email that doesn\'t read like every other sales email they get',
    },
    'Follow-up emails': {
      quickWin: 'Write a follow-up email after a meeting that keeps momentum',
      prompt: 'Write a follow-up email after a [meeting type — e.g. "discovery call", "demo"]. What we covered: [key points discussed]. Next step agreed: [what they said they\'d do]. My ask: [what I need from them]. Tone: warm but direct. Under 100 words. Include a clear subject line.',
      what: 'a follow-up that reinforces the conversation and gets a reply',
    },
    'Objection handling prep': {
      quickWin: 'Build an objection-handling cheat sheet for your top 5 objections',
      prompt: 'I\'m a SaaS sales rep selling [brief product description]. My top objections are: [list 3-5 you hear most often]. For each one, give me: (1) why the prospect really raises this objection, (2) the right response, (3) a reframe or follow-up question that keeps the conversation moving.',
      what: 'a cheat sheet you can reference before every call',
    },
  },
  Risk: {
    'Risk assessment documentation': {
      quickWin: 'Structure your next risk assessment with AI in minutes',
      prompt: 'Help me document a risk assessment for [risk area — described in general terms, no sensitive data]. Include: (1) risk description, (2) likelihood and impact rating (High/Medium/Low with rationale), (3) existing controls, (4) residual risk, (5) recommended next steps. Format as a table.',
      what: 'a structured risk assessment that\'s audit-ready and easy to review',
    },
    'Policy review and plain-language summaries': {
      quickWin: 'Turn a complex policy into a plain-language employee summary',
      prompt: 'I need to communicate [policy or regulatory requirement — described generally] to employees who aren\'t compliance experts. Write a plain-language summary that explains: (1) what this policy requires, (2) what employees must do (or not do), (3) why it matters, (4) where to go with questions. Maximum 300 words.',
      what: 'a summary your employees will actually read and understand',
    },
    'Compliance reporting': {
      quickWin: 'Draft your next compliance report narrative faster',
      prompt: 'Help me draft a narrative section for a compliance report covering [area — e.g. "Q2 BSA/AML activity", "data privacy controls"]. Key findings: [describe at a high level without sensitive details]. Audience: [internal leadership / regulators]. Tone: formal, precise, evidence-based. Format: 3 paragraphs: summary, findings, next steps.',
      what: 'a report narrative that\'s clear, professional, and ready for leadership review',
    },
  },
  'Strategy and Operations': {
    'Strategic analysis and synthesis': {
      quickWin: 'Get a structured framework for your next strategic analysis',
      prompt: 'I\'m analyzing [strategic question or decision — e.g. "whether to expand into a new market segment"]. Help me structure the analysis using a [SWOT / pros and cons / options analysis] framework. Key context: [brief situation description]. Generate the framework with prompting questions for each section I should answer.',
      what: 'a structured analysis framework that ensures you\'re not missing anything',
    },
    'Executive reporting and presentations': {
      quickWin: 'Draft exec-level messaging that lands with leadership',
      prompt: 'Help me write an executive-level summary of [topic] for [audience — e.g. "the CEO and leadership team"]. Key points to communicate: [list 3-5]. Recommendation: [what you\'re proposing]. Format: 1-page briefing with headline, situation, key findings, recommendation, and next steps. Write at an executive reading level — concise and direct.',
      what: 'a briefing that gives executives exactly what they need to make a decision',
    },
    'Process documentation and improvement': {
      quickWin: 'Document a process and spot improvement opportunities in one session',
      prompt: 'Help me document and improve [process name]. Here\'s how it currently works: [describe the steps]. Pain points: [what\'s slow, unclear, or manual]. Create: (1) a clean process map in numbered steps, (2) the top 3 improvement opportunities, (3) a recommendation for which to prioritize and why.',
      what: 'a documented process with improvement recommendations ready for your team',
    },
  },
  Enterprise: {
    'Executive client communications': {
      quickWin: 'Draft a high-stakes client communication in the right tone and register',
      prompt: 'Write an executive-level communication to [client role — e.g. "a CFO at an enterprise account"]. Purpose: [e.g. "QBR follow-up", "escalation resolution", "renewal discussion"]. Key message: [what you need to convey]. Tone: formal, confident, relationship-aware. Format: 3 short paragraphs with a clear ask at the end.',
      what: 'a polished executive message that strengthens the relationship',
    },
    'Business review preparation': {
      quickWin: 'Build your EBR agenda and talking points with AI',
      prompt: 'I\'m preparing an Executive Business Review for a [size] enterprise customer. Their strategic goals: [list 2-3]. What we\'ve delivered: [key wins]. Open risks or gaps: [describe]. Create: (1) a 60-min EBR agenda, (2) the 3 key narratives to reinforce, (3) 3 questions to ask that position us as a strategic partner.',
      what: 'an EBR plan that positions you as a trusted advisor, not just a vendor',
    },
  },
  'Information Systems': {
    'Writing user-facing communications': {
      quickWin: 'Write a clear system notification or tech communication non-technical users will understand',
      prompt: 'Write a user communication about [tech situation — e.g. "a scheduled maintenance window", "a new tool rollout", "a security update required"]. Audience: non-technical employees. Include: (1) what\'s happening, (2) when, (3) what they need to do (if anything), (4) who to contact for help. Keep it short and jargon-free.',
      what: 'a clear communication that reduces help desk tickets and confusion',
    },
    'Help desk knowledge base': {
      quickWin: 'Turn a recurring ticket into a self-service knowledge base article',
      prompt: 'Write a knowledge base article for this common IT issue: [describe the issue]. Include: (1) a plain-language title, (2) symptoms (how users know they have this problem), (3) step-by-step fix, (4) when to escalate to IT. Format: easy to scan, numbered steps, no jargon.',
      what: 'a KB article that lets users self-serve and reduces repeat tickets',
    },
  },
  Innovation: {
    'Emerging technology research': {
      quickWin: 'Get a structured briefing on a new technology in minutes',
      prompt: 'Brief me on [technology or AI capability — e.g. "multimodal AI", "AI agents", "RAG"]. I work at a fintech company focused on [brief description]. Include: (1) what it is in plain language, (2) how it\'s being used in financial services, (3) potential applications for our company, (4) what I\'d need to know to evaluate it further.',
      what: 'a briefing you can share with leadership or use to start a POC conversation',
    },
    'Internal pitch and proposal writing': {
      quickWin: 'Draft an internal pitch for a new AI initiative',
      prompt: 'Help me write an internal pitch for [initiative — e.g. "piloting an AI tool for X team"]. Audience: [leadership / department head]. Include: (1) the problem it solves, (2) the proposed approach, (3) expected impact (time saved, quality improved, etc.), (4) what we\'d need to get started, (5) how we\'d measure success.',
      what: 'a pitch deck outline and talking points your leadership will take seriously',
    },
  },
  'Internal Tooling': {
    'Writing automation scripts': {
      quickWin: 'Get a working automation script draft in one prompt',
      prompt: 'Write a [language — e.g. Python / JavaScript] script that automates [task description]. Inputs: [what the script receives]. Output: [what it should produce]. Requirements: [any constraints]. Add comments, include error handling, and make it easy for a non-developer to configure the key variables.',
      what: 'a working script draft you can test and refine immediately',
    },
    'Identifying automation opportunities': {
      quickWin: 'Map out automation opportunities across a workflow',
      prompt: 'Help me identify automation opportunities in this workflow: [describe the current process step by step]. For each step, evaluate: (1) how manual/repetitive it is, (2) automation potential (High/Medium/Low), (3) recommended approach (script, no-code tool, AI). Prioritize by impact vs. effort.',
      what: 'a prioritized automation roadmap for your team',
    },
  },
  'Partner Development': {
    'Partner research and qualification': {
      quickWin: 'Research and qualify a potential partner in one session',
      prompt: 'Help me evaluate [partner type or company] as a potential partner for our fintech company. We\'re looking for partners who [describe what you need]. Research: (1) what they do and who they serve, (2) how a partnership could work, (3) alignment with our goals, (4) 3 qualifying questions I should ask in an intro call.',
      what: 'a partner qualification brief that tells you if it\'s worth pursuing',
    },
    'Partner onboarding materials': {
      quickWin: 'Draft a partner welcome and onboarding guide section',
      prompt: 'Help me create an onboarding guide for new partners. The audience is [describe partner type]. Include: (1) welcome and overview of the partnership, (2) how the program works, (3) resources and tools they have access to, (4) their first 30 days — what to do when. Tone: professional and welcoming.',
      what: 'a partner onboarding guide that sets partners up for success from day one',
    },
  },
};

// Departments with elevated compliance/privacy reminders in Module 1
const HIGH_COMPLIANCE_DEPTS = ['Legal', 'Risk', 'Finance', 'Business Solutions'];

// Get the prioritized task list for a user's department + sub-team
function getTaskList(department, subteam) {
  if (subteam && SUBTEAM_TASK_PRIORITY[department]?.[subteam]) {
    return SUBTEAM_TASK_PRIORITY[department][subteam];
  }
  return DEPARTMENT_TASKS[department] || [];
}

// Build the 5-module learning plan titles based on the user's top tasks
function getModulePlan(department, topTasks) {
  const task1 = topTasks[0] || 'your core tasks';
  const task2 = topTasks[1] || task1;
  const task3 = topTasks[2] || task1;

  return [
    {
      num: 1,
      title: 'AI Foundations',
      desc: `What AI can (and can't) do — with examples from ${department}`,
    },
    {
      num: 2,
      title: 'AI for Your Core Tasks',
      desc: `Your quick win: use AI for "${task1}" this week`,
    },
    {
      num: 3,
      title: 'Prompting That Works',
      desc: `Build prompts for "${task2}" you can reuse every time`,
    },
    {
      num: 4,
      title: 'Building and Automating',
      desc: `Create a repeatable AI workflow for "${task3}"`,
    },
    {
      num: 5,
      title: 'Measuring Impact',
      desc: 'Connect your AI use to a team goal and show the before/after',
    },
  ];
}

module.exports = {
  DEPARTMENTS,
  SUBTEAM_DEPTS,
  SUBTEAMS,
  DEPARTMENT_TASKS,
  SUBTEAM_TASK_PRIORITY,
  QUICK_WINS,
  HIGH_COMPLIANCE_DEPTS,
  getTaskList,
  getModulePlan,
};
