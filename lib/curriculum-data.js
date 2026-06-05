export const DEPARTMENTS = [
  'Analytics',
  'Business Development',
  'Business Operations',
  'Business Solutions',
  'Coaching',
  'Conquer',
  'Content',
  'Customer Success',
  'Enablement',
  'Engineering',
  'Enterprise',
  'Executive',
  'Finance',
  'Fintech and BizSol',
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

export const SUBTEAM_DEPTS = ['Business Solutions', 'Customer Success', 'Engineering', 'Risk'];

export const SUBTEAMS = {
  'Business Solutions': ['Bookkeeping', 'Operations', 'Payroll', 'Success Advisors', 'Tax'],
  'Customer Success': [
    'Account Management', 'Onboarding', 'Operations', 'Pro Advocate',
    'QA', 'Retention', 'Success Advisors', 'Support', 'Website Onboarding',
  ],
  Engineering: [
    'Core', 'Data Engineering', 'DevOps', 'Fintech',
    'Innovation', 'Internal Tooling', 'QA', 'Talent Programs',
  ],
  Risk: ['Fraud Data Analysts', 'Operations', 'Payment Support', 'Risk Analysts'],
};

export const DEPARTMENT_TASKS = {
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
  'Business Operations': [
    'Process documentation and improvement',
    'Cross-functional project coordination',
    'Operational reporting',
    'Vendor and partner management',
    'Workflow optimization',
    'Policy and procedure writing',
  ],
  'Business Solutions': [
    'Requirements gathering',
    'Process documentation',
    'Business case writing',
    'Stakeholder presentations',
    'ROI analysis',
    'Competitive or market analysis',
  ],
  Coaching: [
    'Coaching session preparation',
    'Performance feedback writing',
    'Development plan creation',
    'Call review and scoring',
    'Training material development',
    'Team performance analysis',
  ],
  Conquer: [
    'Strategic planning and execution',
    'Market expansion research',
    'Competitive analysis',
    'Initiative tracking and reporting',
    'Cross-team collaboration',
    'Presentation development',
  ],
  Content: [
    'Content creation and writing',
    'Content strategy planning',
    'Editorial calendar management',
    'Content performance analysis',
    'SEO and keyword research',
    'Brand voice and style guidance',
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
  'Fintech and BizSol': [
    'Payment processing analysis',
    'Financial product documentation',
    'Technical requirements writing',
    'Stakeholder communication',
    'Compliance and regulatory documentation',
    'Process automation planning',
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
    'QA for teams',
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

export const SUBTEAM_TASK_PRIORITY = {
  'Business Solutions': {
    Bookkeeping: [
      'Process documentation', 'Business case writing', 'Requirements gathering',
      'Stakeholder presentations', 'ROI analysis', 'Competitive or market analysis',
    ],
    Payroll: [
      'Process documentation', 'Requirements gathering', 'Business case writing',
      'Stakeholder presentations', 'ROI analysis', 'Competitive or market analysis',
    ],
    Tax: [
      'Business case writing', 'Process documentation', 'Requirements gathering',
      'ROI analysis', 'Stakeholder presentations', 'Competitive or market analysis',
    ],
    'Success Advisors': [
      'Business case writing', 'Stakeholder presentations', 'Requirements gathering',
      'Process documentation', 'ROI analysis', 'Competitive or market analysis',
    ],
    Operations: [
      'Process documentation', 'Requirements gathering', 'Stakeholder presentations',
      'Business case writing', 'ROI analysis', 'Competitive or market analysis',
    ],
  },
  'Customer Success': {
    Support: [
      'Writing customer communications', 'Escalation writing', 'Playbook building',
      'QBR and EBR preparation', 'Onboarding documentation', 'Renewal preparation', 'Health analysis',
    ],
    'Account Management': [
      'Writing customer communications', 'QBR and EBR preparation', 'Renewal preparation',
      'Health analysis', 'Escalation writing', 'Onboarding documentation', 'Playbook building',
    ],
    Onboarding: [
      'Onboarding documentation', 'Writing customer communications', 'Playbook building',
      'QBR and EBR preparation', 'Escalation writing', 'Renewal preparation', 'Health analysis',
    ],
    'Website Onboarding': [
      'Onboarding documentation', 'Writing customer communications', 'Playbook building',
      'QBR and EBR preparation', 'Escalation writing', 'Renewal preparation', 'Health analysis',
    ],
    Retention: [
      'Renewal preparation', 'Health analysis', 'Writing customer communications',
      'QBR and EBR preparation', 'Escalation writing', 'Onboarding documentation', 'Playbook building',
    ],
    'Success Advisors': [
      'Writing customer communications', 'QBR and EBR preparation', 'Renewal preparation',
      'Health analysis', 'Escalation writing', 'Onboarding documentation', 'Playbook building',
    ],
    QA: [
      'Playbook building', 'Writing customer communications', 'Escalation writing',
      'Onboarding documentation', 'QBR and EBR preparation', 'Renewal preparation', 'Health analysis',
    ],
    'Pro Advocate': [
      'Writing customer communications', 'Escalation writing', 'QBR and EBR preparation',
      'Playbook building', 'Onboarding documentation', 'Renewal preparation', 'Health analysis',
    ],
    Operations: [
      'Playbook building', 'Onboarding documentation', 'Writing customer communications',
      'QBR and EBR preparation', 'Escalation writing', 'Renewal preparation', 'Health analysis',
    ],
  },
  Engineering: {
    'Data Engineering': [
      'Writing code', 'Writing documentation', 'Debugging', 'Code review',
      'Test writing', 'Translating technical concepts for stakeholders', 'Workflow automation',
    ],
    DevOps: [
      'Writing documentation', 'Writing code', 'Workflow automation', 'Debugging',
      'Test writing', 'Code review', 'Translating technical concepts for stakeholders',
    ],
    Fintech: [
      'Writing code', 'Code review', 'Writing documentation', 'Debugging',
      'Test writing', 'Translating technical concepts for stakeholders', 'Workflow automation',
    ],
    QA: [
      'Test writing', 'Writing documentation', 'Code review', 'Debugging',
      'Writing code', 'Translating technical concepts for stakeholders', 'Workflow automation',
    ],
    Innovation: [
      'Writing documentation', 'Writing code', 'Debugging', 'Code review',
      'Test writing', 'Workflow automation', 'Translating technical concepts for stakeholders',
    ],
    'Internal Tooling': [
      'Workflow automation', 'Writing code', 'Writing documentation', 'Debugging',
      'Test writing', 'Code review', 'Translating technical concepts for stakeholders',
    ],
  },
};

export const QUICK_WINS = {
  Analytics: {
    'Writing SQL queries': {
      quickWin: 'Use AI to generate or debug a SQL query in under 5 minutes',
      prompt: 'I\'m a data analyst at a fintech company. Write a SQL query that joins the users and transactions tables and returns monthly active users by region for the last 6 months. Use standard SQL syntax and add comments explaining each major step.',
      what: 'a working query with comments you can run or hand off immediately',
    },
    'Summarizing and interpreting data': {
      quickWin: 'Turn a dataset or table into a plain-language insight summary',
      prompt: 'I\'m analyzing our Q2 customer retention data. Here are the key numbers: 92% renewal rate (up from 88%), churn concentrated in SMB segment, NPS improved from 42 to 51. Write a 3-bullet insight summary for a non-technical audience. Lead with the most important finding, then two supporting observations.',
      what: 'a crisp summary your stakeholders will actually read',
    },
    'Writing insight summaries for stakeholders': {
      quickWin: 'Draft your next insight summary in under 10 minutes',
      prompt: 'I need to write an insight summary for our VP of Product. The key data points are: feature adoption for the new scheduling tool is at 34% after 6 weeks, power users average 12 sessions/week, and the biggest drop-off happens during onboarding step 3. Write a 200-word summary in plain language. Start with the headline finding, explain why it matters, and end with a recommended action.',
      what: 'a polished stakeholder summary that would normally take 45 minutes',
    },
    'Dashboard and report narratives': {
      quickWin: 'Write the narrative section of your next report with AI',
      prompt: 'Help me write the narrative section for a monthly analytics report. The audience is our leadership team. Key metrics this period: revenue up 8% MoM, customer acquisition cost down 12%, but support ticket volume increased 15%. Write 3 short paragraphs: (1) what happened, (2) what it means, (3) what we\'re doing about it.',
      what: 'a report narrative that takes minutes instead of an hour',
    },
  },
  'Business Development': {
    'Prospect and market research': {
      quickWin: 'Get a research brief on a target company or market in minutes',
      prompt: 'I\'m in business development at a home services fintech company. Research the mid-market HVAC franchise segment for me. I need: (1) what the typical HVAC franchise operation looks like and who they serve, (2) recent growth signals in the industry, (3) potential fit with our field service management platform, (4) 3 smart questions I should ask in an intro call.',
      what: 'a call prep brief that would normally take an hour of research',
    },
    'Outreach and prospecting emails': {
      quickWin: 'Write a personalized cold outreach email that doesn\'t sound like a template',
      prompt: 'Write a cold outreach email to a CFO at a mid-market plumbing company with 50+ technicians. Context: they just expanded to a second metro area. Our value prop: we help home service businesses get paid faster with automated invoicing and payment processing. Goal: get a 20-min discovery call. Keep it under 100 words, no jargon, end with a soft ask.',
      what: 'a short, personalized email with a much higher reply rate than a template',
    },
    'Pitch decks and proposals': {
      quickWin: 'Use AI to structure your next pitch or proposal outline',
      prompt: 'Help me outline a business proposal for a regional pest control company considering our platform. The goal is to show how our scheduling and dispatch tools can reduce their missed appointments by 40%. Key facts: they currently lose 15% of appointments to no-shows, they have 30 technicians across 3 locations, their current system is paper-based. Create a slide-by-slide outline with: (1) the problem, (2) our solution, (3) how it works, (4) results/proof, (5) next steps. Include a one-sentence talking point for each slide.',
      what: 'a full proposal outline you can take straight into slides',
    },
  },
  'Customer Success': {
    'Writing customer communications': {
      quickWin: 'Draft your next customer-facing email or message in under 5 minutes',
      prompt: 'I\'m a Customer Success Manager at a home services platform. Write a professional, warm email to a customer about their upcoming QBR. Key context: they\'ve been on the platform for 8 months, adoption is at 78%, and they recently started using our payment processing feature. Tone: confident but human. Length: 3-4 short paragraphs. End with a clear next step.',
      what: 'a polished customer email that sounds like you, not a template',
    },
    'QBR and EBR preparation': {
      quickWin: 'Build your next QBR agenda and talking points with AI',
      prompt: 'I\'m preparing a Quarterly Business Review for a customer in the HVAC industry with 25 technicians. Their goals are: reduce scheduling conflicts, improve first-time fix rates, increase online booking. What we\'ve delivered this quarter: 30% reduction in double-bookings, mobile app rollout to all techs. Open issues: GPS tracking adoption is low. Create: (1) a 45-min agenda, (2) 3 key talking points per section, (3) suggested questions to ask them to uncover expansion opportunities.',
      what: 'a ready-to-use QBR plan that takes 15 minutes instead of 2 hours',
    },
    'Escalation writing': {
      quickWin: 'Write a clear, professional escalation message that gets action',
      prompt: 'Write a professional escalation message for this situation: a customer\'s payment processing has been delayed for 3 business days, affecting their cash flow. The customer is frustrated and considering switching providers. I need to escalate internally to the Fintech engineering lead. Include: (1) clear summary of the issue, (2) customer impact, (3) what\'s been tried, (4) what I\'m asking for. Keep it factual and concise.',
      what: 'an escalation that gets read and acted on, not deprioritized',
    },
    'Playbook building': {
      quickWin: 'Turn your best process knowledge into a reusable playbook section',
      prompt: 'Help me document a CS playbook for handling an at-risk customer who is considering cancellation. Structure it as: (1) when to use this playbook (signals), (2) step-by-step process, (3) key messages to use, (4) common pitfalls to avoid. Write in plain language a new team member could follow.',
      what: 'a playbook section that captures your expertise for the whole team',
    },
  },
  Enablement: {
    'Training content creation': {
      quickWin: 'Draft a training module outline and key learning points in minutes',
      prompt: 'I\'m designing training content for new Customer Success reps at a home services platform. Topic: how to run an effective QBR. Learning objective: after this training, participants will be able to prepare and deliver a 45-minute QBR that uncovers expansion opportunities. Create: (1) a 30-min session outline, (2) 3 key learning points, (3) one practice activity, (4) a 3-question knowledge check.',
      what: 'a complete training module outline you can build from immediately',
    },
    'Playbook and job aid creation': {
      quickWin: 'Turn a process into a one-page job aid people will actually use',
      prompt: 'Create a one-page job aid for handling inbound customer escalations. Audience: Customer Success reps. Format: step-by-step with a decision tree if needed. Include: what to do, what not to do, and one example of the right output. Write in plain language — this will be used in the moment, not studied.',
      what: 'a job aid your team will actually refer to during their work',
    },
    'Content updating': {
      quickWin: 'Update outdated content without rewriting from scratch',
      prompt: 'I need to update our onboarding training to reflect a new scheduling feature that replaces the old calendar view. Here\'s what changed: the calendar now shows real-time technician locations, supports drag-and-drop rescheduling, and has a new conflict detection system. The original training covered the old static calendar with manual time slots. Rewrite only the sections that need updating and flag any other areas that may need a human review.',
      what: 'updated content in minutes without losing what already works',
    },
  },
  Engineering: {
    'Writing code': {
      quickWin: 'Use AI to write a first draft of a function or component',
      prompt: 'Write a JavaScript function that takes an array of technician schedules (each with techId, date, startTime, endTime, jobType) and returns a summary object with: total hours per technician, most common job type, and any scheduling conflicts (overlapping times). Add inline comments explaining the logic. Include basic error handling. Don\'t optimize prematurely — prioritize readability.',
      what: 'a working first draft that takes minutes to review and refine',
    },
    Debugging: {
      quickWin: 'Paste an error and get a diagnosis in under 2 minutes',
      prompt: 'I\'m getting this error: "TypeError: Cannot read properties of undefined (reading \'map\')" in a React component that renders a list of customer appointments. The data comes from an API call in useEffect. The component worked fine until we added a loading state. Give me: (1) what\'s causing this error, (2) the fix with explanation, (3) how to prevent it in the future.',
      what: 'a diagnosis and fix explanation that saves you a long debugging session',
    },
    'Writing documentation': {
      quickWin: 'Turn your code into clear, useful docs in one prompt',
      prompt: 'Write documentation for a REST API endpoint POST /api/appointments/reschedule that takes { appointmentId, newDate, newTimeSlot, reason } and returns the updated appointment object or a conflict error. Include: (1) what it does, (2) request body with types, (3) response format for success and error cases, (4) usage example with curl, (5) important edge cases. Format: Markdown.',
      what: 'complete, readable docs in the time it would take to write one paragraph',
    },
    'Code review': {
      quickWin: 'Get a pre-review before you submit — catch issues AI can spot',
      prompt: 'Review this JavaScript code for a payment processing webhook handler. Look for: (1) logic errors or edge cases, (2) security issues (especially around payment data), (3) error handling gaps, (4) anything that could cause bugs in production. Focus on idempotency — this webhook might fire multiple times for the same event. Give me specific line-by-line feedback where relevant.',
      what: 'a pre-review that catches obvious issues before your teammates do',
    },
  },
  Finance: {
    'Variance analysis write-ups': {
      quickWin: 'Write your next variance analysis narrative in under 10 minutes',
      prompt: 'I need to write a variance analysis narrative for Q2. Budget vs. actual: revenue was $2.1M vs $1.9M budget (11% over), but COGS was $850K vs $720K budget (18% over) due to higher payment processing fees. Primary drivers: faster-than-expected customer growth and a rate increase from our payment processor. Audience: finance leadership. Write 2-3 paragraphs: what happened, why it happened, and what we\'re watching going forward.',
      what: 'a clear variance narrative that communicates the story, not just the numbers',
    },
    'Financial report preparation': {
      quickWin: 'Get the structure and language for your next financial report',
      prompt: 'Help me structure a monthly financial report for our executive leadership team. Key sections to include: executive summary, P&L highlights, key metrics (ARR, CAC, LTV, churn), risks, and outlook. For each section, give me the recommended structure and 2-3 example sentences showing the right tone and level of detail.',
      what: 'a report template and sample language you can customize with your numbers',
    },
    'Stakeholder communication': {
      quickWin: 'Translate financial results into a message non-finance stakeholders will understand',
      prompt: 'I need to communicate our Q2 financial results to department heads who are not finance experts. Key facts: we beat revenue targets by 11% but margins compressed due to payment processing costs. We\'re on track for annual targets but need to watch unit economics. Write a clear, jargon-free 150-word summary that explains what happened and what it means for the business.',
      what: 'a message your stakeholders will actually read and understand',
    },
  },
  Legal: {
    'Contract review and summarization': {
      quickWin: 'Summarize the key terms and risks in a contract section',
      prompt: 'I\'m reviewing a vendor contract and need help summarizing the indemnification clause. Here\'s a paraphrased version: the vendor indemnifies us for IP infringement claims but caps liability at 12 months of fees, excludes consequential damages, and requires us to notify within 30 days. Summarize: (1) what this clause does, (2) key obligations for each party, (3) any standard risks or red flags to consider. Note: I will do the final legal review — this is to help me prep.',
      what: 'a plain-language summary that speeds up your review process',
    },
    'Legal correspondence and communications': {
      quickWin: 'Draft a professional legal communication with the right tone',
      prompt: 'Help me draft a response to a vendor who wants to modify our data processing agreement to allow them to use aggregated customer data for their own analytics. Context: we\'re a fintech handling sensitive financial data. Tone: formal, professional, protective of our customers. Include: our position (we need to protect customer data), what we\'d need to see before considering, and next steps. I will review and finalize.',
      what: 'a first draft that captures the right structure and tone',
    },
    'Compliance documentation': {
      quickWin: 'Turn a compliance requirement into clear, actionable documentation',
      prompt: 'Help me document a compliance process for PCI DSS requirements around payment card data handling. The audience is our engineering and customer success teams. Format: step-by-step with clear ownership at each step. Include what triggers the process, what must be done, and how it\'s recorded.',
      what: 'a compliance document that\'s audit-ready and employee-friendly',
    },
  },
  Marketing: {
    'Writing content': {
      quickWin: 'Draft a piece of marketing content in the time it takes to brief a writer',
      prompt: 'Write a LinkedIn post about how home service businesses are using AI to reduce scheduling conflicts and improve customer satisfaction. Audience: home service business owners and operators. Tone: professional but conversational, data-aware. Key message: AI isn\'t replacing dispatchers — it\'s giving them superpowers. Length: 150-200 words. Include a clear call to action to learn more.',
      what: 'a content draft ready for your review in minutes',
    },
    'Research and market analysis': {
      quickWin: 'Get a structured competitive or market brief faster than a Google deep dive',
      prompt: 'Help me analyze the home services SaaS market for our marketing team. I need: (1) overview of the space and key players (ServiceTitan, Jobber, FieldEdge, etc.), (2) key messaging themes competitors are using, (3) gaps or opportunities our brand could own, (4) 3 questions I should be answering in our content strategy.',
      what: 'a research brief that informs your content and campaign decisions',
    },
    'Campaign briefing': {
      quickWin: 'Write a campaign brief that gives your team everything they need to execute',
      prompt: 'Write a campaign brief for our "Get Paid Faster" campaign promoting our automated invoicing feature. Include: campaign objective (drive 500 trial signups in Q3), target audience (home service business owners doing 20+ jobs/week), key message, channels (email, LinkedIn, Google Ads), deliverables, success metrics, and timeline. Make it specific enough that a designer or copywriter could start working from it.',
      what: 'a complete brief that reduces back-and-forth with your creative team',
    },
    'Copywriting variations': {
      quickWin: 'Generate 5 variations of a headline or CTA instantly',
      prompt: 'Write 5 variations of a landing page headline for our automated scheduling feature. Goal: get home service business owners to start a free trial. Audience: busy plumbing, HVAC, and electrical business owners. Include a mix of: emotional, benefit-led, curiosity-driven, and direct styles. Flag which approach each one uses.',
      what: '5 options to test instead of agonizing over one version',
    },
  },
  People: {
    'Job description writing': {
      quickWin: 'Write a job description that attracts the right candidates',
      prompt: 'Write a job description for a Senior Customer Success Manager at a home services fintech company. The role reports to the VP of Customer Success. Key responsibilities: manage a portfolio of 40+ enterprise accounts, drive adoption and expansion, run QBRs, reduce churn. Must-have: 3+ years in B2B SaaS CS, experience with enterprise accounts. Nice-to-have: home services or fintech experience. Tone: professional but human. Avoid jargon and gendered language.',
      what: 'a polished JD that your recruiting team can post immediately',
    },
    'Employee communications': {
      quickWin: 'Draft a clear, empathetic people communication in minutes',
      prompt: 'Write an employee communication about our new hybrid work policy taking effect next month. All employees will be in-office Tuesday through Thursday, with Monday and Friday flexible. Audience: all employees. Tone: transparent, direct, and human. Include: (1) what\'s changing, (2) why (collaboration and culture), (3) what it means for employees, (4) next steps and where to ask questions.',
      what: 'a communication that reduces confusion and builds trust',
    },
    'Performance review support': {
      quickWin: 'Draft performance review language that\'s specific and fair',
      prompt: 'Help me write performance review feedback for a Customer Success Manager. Strengths: consistently exceeds renewal targets (98% retention), customers frequently praise their responsiveness, mentors two junior CSMs. Areas for growth: tends to avoid difficult conversations about underperforming accounts, could improve data storytelling in QBRs. Write 2 paragraphs: one on strengths, one on growth areas. Make it specific, behavior-focused, and actionable.',
      what: 'review language that\'s fair, specific, and ready to use',
    },
  },
  Product: {
    'Writing PRDs and feature specs': {
      quickWin: 'Draft a PRD structure and problem statement section with AI',
      prompt: 'Help me write a PRD for a "Smart Dispatch" feature that automatically assigns the best technician to each job based on location, skills, and availability. Problem: dispatchers spend 2+ hours daily manually assigning jobs, leading to suboptimal routing and technician idle time. User: dispatch managers at home service companies with 10+ technicians. Include sections for: problem statement, goals and success metrics, user stories, scope (in/out), and open questions. Keep it concise — 2 pages max.',
      what: 'a structured PRD first draft your team can react to immediately',
    },
    'User research synthesis': {
      quickWin: 'Turn raw research notes into a clear synthesis in one prompt',
      prompt: 'I have research notes from 8 user interviews about our mobile app experience for field technicians. Key themes I\'m seeing: techs want offline access to job details, the photo upload flow is too slow on cellular, and they love the GPS-based arrival notifications. Help me: (1) structure these into 3-5 main insight clusters, (2) write a one-sentence summary of each insight, (3) identify the most important implication for our product roadmap.',
      what: 'a research synthesis that\'s ready to share with your team or stakeholders',
    },
    'Writing user stories': {
      quickWin: 'Generate a set of well-formed user stories from a feature idea',
      prompt: 'Write user stories for a "Customer Self-Scheduling" feature. The core user is a homeowner who wants to book a service appointment online so that they don\'t have to call during business hours. Include: (1) the primary happy path story, (2) 2-3 edge case stories (rescheduling, no available slots, emergency service), (3) acceptance criteria for each in Given/When/Then format.',
      what: 'a complete set of user stories with acceptance criteria for your sprint',
    },
  },
  Sales: {
    'Lead research': {
      quickWin: 'Build a call prep brief on a prospect in under 5 minutes',
      prompt: 'Help me prepare for a sales call with an operations manager at a mid-market plumbing company with 40 technicians. I need: (1) what challenges this type of company typically faces (scheduling, dispatching, payments), (2) 3 discovery questions I should ask, (3) likely objections (cost, switching pain, "we use spreadsheets and it works") and how to handle them, (4) one hook for the opening of the call.',
      what: 'a call prep brief that makes you sound like you\'ve done hours of research',
    },
    'Writing outreach emails': {
      quickWin: 'Write a cold email that gets replies — not deleted',
      prompt: 'Write a cold outreach email to an owner of a growing HVAC company. Trigger: they just posted 5 new technician job openings on Indeed, signaling rapid growth. Our value: we help growing home service companies manage scheduling, dispatch, and payments without adding back-office headcount. Keep it under 75 words. No bullet points. End with one clear, low-commitment ask.',
      what: 'a personalized email that doesn\'t read like every other sales email they get',
    },
    'Follow-up emails': {
      quickWin: 'Write a follow-up email after a meeting that keeps momentum',
      prompt: 'Write a follow-up email after a discovery call with the owner of a 30-technician electrical company. What we covered: they\'re losing 2 hours/day to manual scheduling, they want to offer online booking, and they\'re concerned about the migration from their current system. Next step agreed: they\'ll share their current tech stack list. My ask: get that list by Friday. Tone: warm but direct. Under 100 words.',
      what: 'a follow-up that reinforces the conversation and gets a reply',
    },
    'Objection handling prep': {
      quickWin: 'Build an objection-handling cheat sheet for your top 5 objections',
      prompt: 'I\'m a SaaS sales rep selling a field service management platform to home service businesses. My top objections are: (1) "We already use ServiceTitan/Jobber", (2) "It\'s too expensive for our size", (3) "My team won\'t adopt new software", (4) "We\'re too busy to switch right now", (5) "Can\'t we just use Google Calendar?". For each: (1) why they really raise it, (2) the right response, (3) a reframe question that keeps the conversation moving.',
      what: 'a cheat sheet you can reference before every call',
    },
  },
  Risk: {
    'Risk assessment documentation': {
      quickWin: 'Structure your next risk assessment with AI in minutes',
      prompt: 'Help me document a risk assessment for third-party payment processor integration reliability. Include: (1) risk description, (2) likelihood and impact rating (High/Medium/Low with rationale), (3) existing controls (redundancy, monitoring, SLAs), (4) residual risk, (5) recommended next steps. Format as a table.',
      what: 'a structured risk assessment that\'s audit-ready and easy to review',
    },
    'Policy review and plain-language summaries': {
      quickWin: 'Turn a complex policy into a plain-language employee summary',
      prompt: 'I need to communicate our updated data retention policy to employees who aren\'t compliance experts. The policy requires: customer financial data retained for 7 years, PII purged within 30 days of account closure, backup data follows same retention schedule. Write a plain-language summary that explains: (1) what this policy requires, (2) what employees must do, (3) why it matters, (4) where to go with questions. Maximum 300 words.',
      what: 'a summary your employees will actually read and understand',
    },
    'Compliance reporting': {
      quickWin: 'Draft your next compliance report narrative faster',
      prompt: 'Help me draft a narrative section for a compliance report covering Q2 payment processing controls. Key findings: all PCI DSS controls passed audit, one minor finding on log retention (resolved), zero data breaches. Audience: internal leadership and external auditors. Tone: formal, precise, evidence-based. Format: 3 paragraphs: summary, findings, next steps.',
      what: 'a report narrative that\'s clear, professional, and ready for leadership review',
    },
  },
  'Strategy and Operations': {
    'Strategic analysis and synthesis': {
      quickWin: 'Get a structured framework for your next strategic analysis',
      prompt: 'I\'m analyzing whether we should expand into the commercial/facilities management segment (beyond residential home services). Help me structure the analysis using a SWOT framework. Key context: we\'re strong in residential with 5,000 customers, commercial has larger deal sizes but longer sales cycles and different feature requirements. Generate the framework with prompting questions for each section I should answer.',
      what: 'a structured analysis framework that ensures you\'re not missing anything',
    },
    'Executive reporting and presentations': {
      quickWin: 'Draft exec-level messaging that lands with leadership',
      prompt: 'Help me write an executive-level summary of our AI adoption initiative for the CEO and leadership team. Key points: 34% of employees have completed AI training, Customer Success team saw 25% reduction in email drafting time, three departments haven\'t started yet. Recommendation: mandate completion by end of Q3 with manager accountability. Format: 1-page briefing with headline, situation, key findings, recommendation, and next steps.',
      what: 'a briefing that gives executives exactly what they need to make a decision',
    },
    'Process documentation and improvement': {
      quickWin: 'Document a process and spot improvement opportunities in one session',
      prompt: 'Help me document and improve our customer onboarding process. Here\'s how it currently works: (1) signed contract triggers Salesforce notification, (2) CSM manually creates account in 3 systems, (3) welcome email sent from template, (4) kickoff call scheduled via email thread, (5) training sessions booked individually. Pain points: steps 2-4 take 2+ hours per customer, manual data entry causes errors. Create: (1) a clean process map, (2) top 3 improvement opportunities, (3) which to prioritize and why.',
      what: 'a documented process with improvement recommendations ready for your team',
    },
  },
  Enterprise: {
    'Executive client communications': {
      quickWin: 'Draft a high-stakes client communication in the right tone',
      prompt: 'Write an executive-level communication to a VP of Operations at a 200-technician enterprise account. Purpose: follow up after resolving a payment processing outage that affected them for 4 hours last week. Key message: what happened, what we\'ve done to prevent recurrence, and our commitment going forward. Tone: formal, confident, relationship-aware. Format: 3 short paragraphs with a clear ask at the end.',
      what: 'a polished executive message that strengthens the relationship',
    },
    'Business review preparation': {
      quickWin: 'Build your EBR agenda and talking points with AI',
      prompt: 'I\'m preparing an Executive Business Review for a 150-technician enterprise HVAC company. Their strategic goals: reduce average dispatch time to under 15 minutes, achieve 95% first-time fix rate, expand to 3 new markets this year. What we\'ve delivered: dispatch time down 40%, mobile app adoption at 92%. Open risks: integration with their legacy ERP is behind schedule. Create: (1) a 60-min EBR agenda, (2) the 3 key narratives to reinforce, (3) 3 questions that position us as a strategic partner.',
      what: 'an EBR plan that positions you as a trusted advisor, not just a vendor',
    },
  },
  'Information Systems': {
    'Writing user-facing communications': {
      quickWin: 'Write a clear system notification non-technical users will understand',
      prompt: 'Write a user communication about a scheduled maintenance window for our payment processing system this Saturday from 2-6 AM EST. Audience: non-technical employees and field technicians. Include: (1) what\'s happening, (2) when, (3) what they need to do (nothing — payments will queue and process automatically after), (4) who to contact for help. Keep it short and jargon-free.',
      what: 'a clear communication that reduces help desk tickets and confusion',
    },
    'Help desk knowledge base': {
      quickWin: 'Turn a recurring ticket into a self-service knowledge base article',
      prompt: 'Write a knowledge base article for this common IT issue: users can\'t sync their mobile app after a password reset. Include: (1) a plain-language title, (2) symptoms (app shows "authentication failed" after password change), (3) step-by-step fix (sign out of app, clear cache, sign in with new password), (4) when to escalate to IT. Format: easy to scan, numbered steps, no jargon.',
      what: 'a KB article that lets users self-serve and reduces repeat tickets',
    },
  },
  Innovation: {
    'Emerging technology research': {
      quickWin: 'Get a structured briefing on a new technology in minutes',
      prompt: 'Brief me on AI agents and autonomous workflows. I work at a home services fintech company focused on scheduling, dispatch, and payments. Include: (1) what AI agents are in plain language, (2) how they\'re being used in field service management, (3) potential applications for our company (automated dispatch, intelligent scheduling, predictive maintenance), (4) what I\'d need to know to evaluate a POC.',
      what: 'a briefing you can share with leadership or use to start a POC conversation',
    },
    'Internal pitch and proposal writing': {
      quickWin: 'Draft an internal pitch for a new AI initiative',
      prompt: 'Help me write an internal pitch for piloting an AI-powered customer support chatbot that can handle common scheduling questions (reschedule, cancel, check status). Audience: VP of Customer Success and CTO. Include: (1) the problem (30% of support calls are simple scheduling questions), (2) the proposed approach (Claude-powered chatbot integrated with our scheduling API), (3) expected impact (reduce call volume by 25%, save 2 FTE equivalent), (4) what we need to start (3 engineers, 6 weeks, API access), (5) how we\'d measure success.',
      what: 'a pitch your leadership will take seriously',
    },
    'QA for teams': {
      quickWin: 'Generate a structured QA checklist for a team\'s feature release',
      prompt: 'Create a QA checklist for a new feature release on a home services platform. The feature is an updated scheduling flow that lets pros set recurring availability windows. Include: (1) functional test cases (happy path, edge cases like overlapping windows, timezone handling), (2) regression checks for existing scheduling, (3) mobile vs desktop coverage, (4) accessibility checks, (5) data validation (what happens if a pro deletes a recurring window with existing bookings). Format as a checklist I can hand to any team.',
      what: 'a reusable QA checklist template you can adapt for any team\'s releases',
    },
  },
  'Internal Tooling': {
    'Writing automation scripts': {
      quickWin: 'Get a working automation script draft in one prompt',
      prompt: 'Write a JavaScript script that reads a CSV of customer accounts, checks each one against our API for missing payment methods, and outputs a report of accounts that need attention. Inputs: CSV file path. Output: a new CSV with columns for account ID, customer name, status, and what\'s missing. Add comments, include error handling, and make it easy for a non-developer to configure the API endpoint and CSV path.',
      what: 'a working script draft you can test and refine immediately',
    },
    'Identifying automation opportunities': {
      quickWin: 'Map out automation opportunities across a workflow',
      prompt: 'Help me identify automation opportunities in our new customer setup workflow: (1) CSM receives signed contract via email, (2) manually creates account in CRM, billing system, and support platform, (3) copies customer data between systems, (4) sends welcome email from template, (5) schedules kickoff call via email thread, (6) creates training plan in spreadsheet. For each step, evaluate: automation potential (High/Medium/Low), recommended approach (script, Zapier, AI), and prioritize by impact vs. effort.',
      what: 'a prioritized automation roadmap for your team',
    },
  },
  'Partner Development': {
    'Partner research and qualification': {
      quickWin: 'Research and qualify a potential partner in one session',
      prompt: 'Help me evaluate a regional HVAC equipment distributor as a potential referral partner for our field service platform. We\'re looking for partners who serve home service businesses and can recommend our software during equipment sales. Research: (1) how equipment distributors typically work with service companies, (2) how a referral partnership could work, (3) alignment with our growth goals, (4) 3 qualifying questions for an intro call.',
      what: 'a partner qualification brief that tells you if it\'s worth pursuing',
    },
    'Partner onboarding materials': {
      quickWin: 'Draft a partner welcome and onboarding guide section',
      prompt: 'Help me create an onboarding guide for new referral partners (equipment distributors and industry consultants). Include: (1) welcome and overview of the partnership, (2) how the referral program works (commissions, tracking, support), (3) resources and tools they have access to, (4) their first 30 days — what to do when. Tone: professional and welcoming.',
      what: 'a partner onboarding guide that sets partners up for success from day one',
    },
  },
};

export const HIGH_COMPLIANCE_DEPTS = ['Legal', 'Risk', 'Finance', 'Business Solutions'];

export function getTaskList(department, subteam) {
  if (subteam && SUBTEAM_TASK_PRIORITY[department]?.[subteam]) {
    return SUBTEAM_TASK_PRIORITY[department][subteam];
  }
  return DEPARTMENT_TASKS[department] || [];
}

export function getModulePlan(department, topTasks) {
  const task1 = topTasks[0] || 'your core tasks';
  const task2 = topTasks[1] || task1;
  const task3 = topTasks[2] || task1;

  return [
    { num: 1, title: 'AI Foundations', desc: `What AI can (and can't) do — with examples from ${department}` },
    { num: 2, title: 'AI for Your Core Tasks', desc: `Your quick win: use AI for "${task1}" this week` },
    { num: 3, title: 'Prompting That Works', desc: `Build prompts for "${task2}" you can reuse every time` },
    { num: 4, title: 'Building and Automating', desc: `Create a repeatable AI workflow for "${task3}"` },
    { num: 5, title: 'Measuring Impact', desc: 'Connect your AI use to a team goal and show the before/after' },
  ];
}

export function getQuickWin(department, task) {
  return QUICK_WINS[department]?.[task] || null;
}

export function isHighComplianceDept(department) {
  return HIGH_COMPLIANCE_DEPTS.includes(department);
}
