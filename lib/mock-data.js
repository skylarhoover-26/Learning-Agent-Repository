const DEMO_LEARNER = {
  id: 'demo_001',
  display_name: 'Alex',
  slack_handle: '@alex',
  role: 'Customer Success',
  department: 'Customer Success',
  tier: 'beginner',
  goal: 'integrate_daily_workflow',
  total_sessions: 4,
  onboarded_at: '2026-05-20T10:00:00Z',
  last_active_at: '2026-05-28T14:30:00Z',
};

const DEMO_LESSON_HISTORY = [
  {
    id: 'lh_001',
    learner_id: 'demo_001',
    topic: 'Writing effective prompts for customer responses',
    started_at: '2026-05-28T14:00:00Z',
    completed_at: '2026-05-28T14:30:00Z',
  },
  {
    id: 'lh_002',
    learner_id: 'demo_001',
    topic: 'Using AI to summarize long email threads',
    started_at: '2026-05-27T11:00:00Z',
    completed_at: '2026-05-27T11:20:00Z',
  },
  {
    id: 'lh_003',
    learner_id: 'demo_001',
    topic: 'Introduction to AI assistants',
    started_at: '2026-05-26T09:00:00Z',
    completed_at: '2026-05-26T09:25:00Z',
  },
  {
    id: 'lh_004',
    learner_id: 'demo_001',
    topic: 'What can AI do for your role?',
    started_at: '2026-05-25T10:00:00Z',
    completed_at: '2026-05-25T10:15:00Z',
  },
];

const DEMO_GOALS = [
  {
    id: 'g_001',
    learner_id: 'demo_001',
    title: 'Draft customer responses 2x faster with AI',
    description: 'Use AI to help write first-draft responses to common customer questions',
    status: 'active',
    created_at: '2026-05-20T10:00:00Z',
    updated_at: '2026-05-28T14:30:00Z',
  },
  {
    id: 'g_002',
    learner_id: 'demo_001',
    title: 'Automate weekly status report',
    description: 'Build a prompt template that generates my weekly status update from notes',
    status: 'active',
    created_at: '2026-05-22T09:00:00Z',
    updated_at: '2026-05-27T11:00:00Z',
  },
];

const DEMO_PROJECTS = [
  {
    id: 'wp_001',
    learner_id: 'demo_001',
    title: 'Customer onboarding email templates',
    description: 'Creating AI-assisted templates for the new customer onboarding sequence',
    status: 'active',
    created_at: '2026-05-22T10:00:00Z',
    updated_at: '2026-05-28T14:00:00Z',
  },
];

const DEMO_SKILL_EVALUATIONS = [
  { id: 'sk_001', learner_id: 'demo_001', skill: 'Prompt clarity', level: 'strong', evaluated_at: '2026-05-28T14:30:00Z' },
  { id: 'sk_002', learner_id: 'demo_001', skill: 'Email drafting with AI', level: 'strong', evaluated_at: '2026-05-27T11:20:00Z' },
  { id: 'sk_003', learner_id: 'demo_001', skill: 'Conversational AI', level: 'growing', evaluated_at: '2026-05-28T14:30:00Z' },
  { id: 'sk_004', learner_id: 'demo_001', skill: 'Iterative prompting', level: 'growing', evaluated_at: '2026-05-26T09:25:00Z' },
  { id: 'sk_005', learner_id: 'demo_001', skill: 'Workflow automation', level: 'gap', evaluated_at: '2026-05-25T10:15:00Z' },
  { id: 'sk_006', learner_id: 'demo_001', skill: 'Data analysis with AI', level: 'gap', evaluated_at: '2026-05-25T10:15:00Z' },
];

const DEMO_XP_EVENTS = [
  { id: 'xp_001', learner_id: 'demo_001', source: 'lesson_complete', amount: 50, created_at: '2026-05-28T14:30:00Z' },
  { id: 'xp_002', learner_id: 'demo_001', source: 'lesson_complete', amount: 50, created_at: '2026-05-27T11:20:00Z' },
  { id: 'xp_003', learner_id: 'demo_001', source: 'lesson_complete', amount: 50, created_at: '2026-05-26T09:25:00Z' },
  { id: 'xp_004', learner_id: 'demo_001', source: 'lesson_complete', amount: 50, created_at: '2026-05-25T10:15:00Z' },
  { id: 'xp_005', learner_id: 'demo_001', source: 'streak_day', amount: 10, created_at: '2026-05-28T14:30:00Z' },
  { id: 'xp_006', learner_id: 'demo_001', source: 'streak_day', amount: 10, created_at: '2026-05-27T11:20:00Z' },
  { id: 'xp_007', learner_id: 'demo_001', source: 'streak_day', amount: 10, created_at: '2026-05-26T09:25:00Z' },
  { id: 'xp_008', learner_id: 'demo_001', source: 'project_added', amount: 5, created_at: '2026-05-22T10:00:00Z' },
  { id: 'xp_009', learner_id: 'demo_001', source: 'goal_added', amount: 5, created_at: '2026-05-20T10:00:00Z' },
  { id: 'xp_010', learner_id: 'demo_001', source: 'goal_added', amount: 5, created_at: '2026-05-22T09:00:00Z' },
];

const DEMO_BADGES_EARNED = [
  { id: 'be_001', learner_id: 'demo_001', badge_id: 'first_lesson', earned_at: '2026-05-25T10:15:00Z' },
  { id: 'be_002', learner_id: 'demo_001', badge_id: 'three_lessons', earned_at: '2026-05-27T11:20:00Z' },
  { id: 'be_003', learner_id: 'demo_001', badge_id: 'first_project', earned_at: '2026-05-22T10:00:00Z' },
  { id: 'be_004', learner_id: 'demo_001', badge_id: 'first_goal', earned_at: '2026-05-20T10:00:00Z' },
  { id: 'be_005', learner_id: 'demo_001', badge_id: 'three_day_streak', earned_at: '2026-05-27T11:20:00Z' },
];

const DEMO_QUIZ_CARDS = [
  {
    id: 'qc_001',
    learner_id: 'demo_001',
    source_lesson: 'Writing effective prompts for customer responses',
    type: 'multiple_choice',
    question: 'What makes a prompt "specific" rather than "vague"?',
    answer: 'Including context, constraints, and desired format',
    options: [
      'Using longer sentences',
      'Including context, constraints, and desired format',
      'Adding please and thank you',
      'Using technical jargon',
    ],
    next_review_at: '2026-05-28T00:00:00Z',
    review_count: 0,
    correct_count: 0,
  },
  {
    id: 'qc_002',
    learner_id: 'demo_001',
    source_lesson: 'Using AI to summarize long email threads',
    type: 'short_answer',
    question: 'Name two things you should include when asking AI to summarize an email thread.',
    answer: 'The desired length/format and who the summary is for (audience)',
    next_review_at: '2026-05-28T00:00:00Z',
    review_count: 0,
    correct_count: 0,
  },
];

const DEMO_KNOWLEDGE = [
  {
    title: 'Claude 4 released with improved reasoning',
    summary: 'Anthropic released Claude 4 with significantly better reasoning, coding, and instruction-following capabilities.',
    ingested_at: '2026-05-27T08:00:00Z',
  },
  {
    title: 'Google launches Gemini 2.5 Pro',
    summary: 'Google\'s latest model shows strong performance on coding and multimodal tasks.',
    ingested_at: '2026-05-25T08:00:00Z',
  },
  {
    title: 'AI adoption in field services growing 40% YoY',
    summary: 'A new report shows that field service companies are adopting AI tools at an accelerating rate, primarily for scheduling and customer communication.',
    ingested_at: '2026-05-23T08:00:00Z',
  },
];

export {
  DEMO_LEARNER,
  DEMO_LESSON_HISTORY,
  DEMO_GOALS,
  DEMO_PROJECTS,
  DEMO_SKILL_EVALUATIONS,
  DEMO_XP_EVENTS,
  DEMO_BADGES_EARNED,
  DEMO_QUIZ_CARDS,
  DEMO_KNOWLEDGE,
};
