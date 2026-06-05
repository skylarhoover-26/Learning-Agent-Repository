const SCENARIOS = [
  {
    id: 1,
    department: 'Customer Success',
    title: 'Summarize a customer complaint email',
    context:
      'You received a long, emotional email from a customer about a billing issue, a missed appointment, and poor communication. You need a concise summary for your team lead.',
    task: 'Write a prompt that would get an AI to produce a clear, actionable summary of the complaint email.',
  },
  {
    id: 2,
    department: 'People / HR',
    title: 'Draft a job posting for a new role',
    context:
      'Your team is hiring a Senior Customer Success Manager. The role requires 3+ years in SaaS, strong communication skills, and CRM experience. The posting should feel welcoming and inclusive.',
    task: 'Write a prompt that would get an AI to draft a compelling, inclusive job posting.',
  },
  {
    id: 3,
    department: 'Sales',
    title: 'Analyze quarterly sales data',
    context:
      'You have Q1 sales numbers across 4 regions. Revenue is up 12% overall, but the West region dropped 8%. Leadership wants to understand why and what to do.',
    task: 'Write a prompt that would get an AI to analyze this data and surface insights for leadership.',
  },
  {
    id: 4,
    department: 'Enablement',
    title: 'Create a training outline for a new feature',
    context:
      'Your company just launched an AI-powered scheduling feature. You need to train 200+ field service pros on how to use it. Many are not tech-savvy.',
    task: 'Write a prompt that would get an AI to create a clear, practical training outline.',
  },
  {
    id: 5,
    department: 'Operations',
    title: 'Write a project status update for leadership',
    context:
      'You are managing a CRM migration. It is 60% complete, 1 week behind schedule due to a data mapping issue (now resolved). Two milestones are coming up next week.',
    task: 'Write a prompt that would get an AI to draft a concise, professional status update for the exec team.',
  },
  {
    id: 6,
    department: 'Marketing',
    title: 'Write social media copy for a product launch',
    context:
      'Your company is launching an AI-powered scheduling tool. You need 3 social media posts tailored for LinkedIn, X, and Instagram. Each post should match the platform\'s tone and audience expectations.',
    task: 'Write a prompt that would get an AI to produce 3 platform-specific social media posts for this product launch.',
  },
  {
    id: 7,
    department: 'Finance',
    title: 'Analyze expense report trends for budget planning',
    context:
      'Q2 expenses are 15% over budget. Leadership needs to understand the top 3 cost drivers and wants actionable suggestions for where to cut without impacting operations.',
    task: 'Write a prompt that would get an AI to identify cost drivers and recommend specific budget cuts.',
  },
  {
    id: 8,
    department: 'Legal',
    title: 'Summarize a vendor contract for key risks',
    context:
      'You have a 20-page SaaS vendor agreement up for renewal. Your VP needs a 1-page summary covering key terms, obligations, auto-renewal clauses, and potential risks before signing.',
    task: 'Write a prompt that would get an AI to produce a concise, risk-focused summary of the vendor contract.',
  },
  {
    id: 9,
    department: 'Engineering',
    title: 'Write a technical design document outline',
    context:
      'Your team is building a new microservice for notification delivery (email, SMS, push). It needs to handle 10k messages/minute, integrate with 3 providers, and have a clear rollback plan.',
    task: 'Write a prompt that would get an AI to outline a technical design document covering architecture, dependencies, and rollback strategy.',
  },
  {
    id: 10,
    department: 'Product',
    title: 'Synthesize customer feedback into feature priorities',
    context:
      'You have 50 NPS survey responses and 20 support tickets from the last quarter. You need a prioritized list of product improvements backed by evidence from the feedback data.',
    task: 'Write a prompt that would get an AI to analyze this feedback and produce a prioritized feature improvement list with supporting evidence.',
  },
];

export default SCENARIOS;
