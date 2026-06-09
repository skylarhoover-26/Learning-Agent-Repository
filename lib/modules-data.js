export const MODULES = [
  {
    num: 1,
    title: 'AI Foundations',
    subtitle: "What AI can (and can't) do",
    duration: '15 min',
    status: 'available',
    tiers: ['beginner'],
    sections: [
      {
        title: 'What AI actually is',
        content: 'AI tools like Claude and ChatGPT are language models — they predict what text should come next based on patterns in their training data. They\'re excellent at drafting, summarizing, rewriting, and structuring text. They\'re unreliable for real-time info, precise math, and decisions that require context they don\'t have.',
      },
      {
        title: 'What AI is great at',
        content: 'Drafting emails, summarizing meetings, structuring documents, brainstorming ideas, explaining technical concepts in plain language, rewriting for different audiences, and generating first drafts of almost anything text-based.',
      },
      {
        title: 'What AI struggles with',
        content: 'AI can hallucinate — generating confident-sounding but incorrect information. It doesn\'t know what happened today, can\'t access your internal systems, and shouldn\'t make final decisions on complex business problems. Always verify facts, numbers, and citations.',
      },
      {
        title: 'Data safety basics',
        content: 'Even on approved tools, only paste what\'s needed for the task. Paraphrase or anonymize sensitive data (client names, account numbers, financial details) before sharing with AI. The safest prompt is one that contains no personally identifiable information.',
      },
    ],
    activity: {
      type: 'quiz',
      title: 'Quick check: Can you spot the hallucination risk?',
      question: 'You ask AI to verify a policy\'s refund window and it returns "60 days" with a confident source link. What should you do?',
      options: [
        'Use the answer — AI found a source',
        'Click the source link to verify',
        'Check what the policy said at the time in question — AI sources reflect current docs, not historical versions',
        'Ask AI the same question 3 times for consistency',
      ],
      correct: 2,
      explanation: 'AI sources reflect today\'s docs, not the version that was active at a given point in time. Always check the relevant version for time-sensitive questions.',
    },
  },
  {
    num: 2,
    title: 'AI for Your Core Tasks',
    subtitle: 'Your first quick win',
    duration: '10 min',
    status: 'available',
    tiers: ['beginner', 'practitioner'],
    sections: [
      {
        title: 'Start with what you already do',
        content: 'The fastest way to learn AI isn\'t reading about it — it\'s running a real task. Pick something you do every week (writing emails, prepping for meetings, summarizing data) and try having AI draft the first version.',
      },
      {
        title: 'The quick win formula',
        content: 'A great AI prompt has 4 parts: Role (who you are), Context (the situation), Task (what to do), and Format (what the output should look like). This is the RCTF framework — it works for almost everything.',
      },
      {
        title: 'Try it now',
        content: 'Go to the Quick Win page and pick your top task. You\'ll get a ready-to-use prompt you can paste into Claude or ChatGPT right now. Your first win takes under 5 minutes.',
        action: { label: 'Get my Quick Win', href: '/quick-win' },
      },
    ],
    activity: {
      type: 'action',
      title: 'Your challenge',
      description: 'Complete one Quick Win from the Quick Win page and notice how long it takes compared to doing it manually.',
      action: { label: 'Go to Quick Wins', href: '/quick-win' },
    },
  },
  {
    num: 3,
    title: 'Prompting That Works',
    subtitle: 'Build prompts you can reuse',
    duration: '15 min',
    status: 'available',
    tiers: ['beginner', 'practitioner', 'power_user'],
    sections: [
      {
        title: 'Why good prompts matter',
        content: 'A vague prompt like "summarize this" gives vague results. A specific prompt like "summarize the key decisions and action items in bullet points, flagging deadlines" gets you something you can actually use. The difference is 30 seconds of setup.',
      },
      {
        title: 'The iteration skill',
        content: 'AI conversations have memory within a session. If the first response isn\'t right, don\'t start over — refine: "Make it shorter," "Focus on the budget section," "Rewrite for a non-technical audience." Iteration is faster than perfection on the first try.',
      },
      {
        title: 'Building reusable prompts',
        content: 'When you find a prompt that works well, save it. A good reusable prompt has: a clear role, the right context slots to fill in, a specific task, and the format you need. The Shared Prompts page has 20 examples from across HCP.',
        action: { label: 'Browse Shared Prompts', href: '/prompts' },
      },
      {
        title: 'Spot the bad prompt',
        content: 'Practice identifying what makes a prompt effective vs. vague. The key signals: specific audience, concrete data points, clear structure, and defined output format. Play the games to test your skills.',
        action: { label: 'Play Prompt Battle', href: '/games/prompt-battle' },
      },
    ],
    activity: {
      type: 'action',
      title: 'Build your first reusable prompt',
      description: 'Take a task you do weekly. Write a prompt that works for it, test it with AI, then save it somewhere you can find it again. Bonus: share it on the Shared Prompts page.',
      action: { label: 'Go to Shared Prompts', href: '/prompts' },
    },
  },
  {
    num: 4,
    title: 'Building and Automating',
    subtitle: 'Create a repeatable AI workflow',
    duration: '20 min',
    status: 'available',
    tiers: ['beginner', 'practitioner', 'power_user', 'builder', 'developer'],
    sections: [
      {
        title: 'From one-off to repeatable',
        content: 'Using AI once saves a few minutes. Building a repeatable workflow saves hours every week. The difference: instead of crafting a new prompt each time, you create a template with slots that you fill in for each instance.',
      },
      {
        title: 'Anatomy of an AI workflow',
        content: 'A good AI workflow has three parts: (1) Input — what changes each time (the customer name, the data, the topic), (2) Process — your tested prompt template with those slots, (3) Output — the format you need every time (email, summary, report section). Document all three.',
      },
      {
        title: 'Example: Weekly report workflow',
        content: 'Input: this week\'s key metrics and notable events. Process: a prompt that takes those inputs and generates a 3-paragraph narrative (what happened, what it means, what we\'re doing about it). Output: a polished report section ready to paste into your deck. Total time: 5 minutes instead of 45.',
      },
      {
        title: 'Multi-step workflows',
        content: 'Some tasks need multiple AI passes. For example: (1) Extract key points from a transcript, (2) Cluster them into themes, (3) Draft the executive summary. Each step feeds the next. This staged approach produces better results than a single massive prompt.',
      },
      {
        title: 'When NOT to automate',
        content: 'Not everything should be an AI workflow. Skip it when: the task requires real-time judgment (escalation calls), the output needs to feel genuinely personal (not just personalized), or the stakes are too high for AI error (legal filings, financial commitments). AI should draft, not decide.',
      },
    ],
    activity: {
      type: 'build',
      title: 'Build your workflow',
      description: 'Pick a task you do at least weekly. Document it as a workflow: what\'s the input, what\'s the prompt template, and what\'s the expected output. Test it 3 times this week and refine.',
      steps: [
        'Pick a recurring task from your top 3',
        'Write the prompt template with [SLOTS] for variable data',
        'Test it with real data from this week',
        'Refine: what worked, what needs adjustment?',
        'Save the final version in your Quick Wins or Shared Prompts',
      ],
    },
  },
  {
    num: 5,
    title: 'Measuring Impact',
    subtitle: 'Connect AI use to business outcomes',
    duration: '15 min',
    status: 'available',
    tiers: ['beginner', 'practitioner', 'power_user', 'builder', 'developer'],
    sections: [
      {
        title: 'Why measurement matters',
        content: 'Using AI because it\'s interesting is a hobby. Using AI because it measurably improves your output is a skill. The difference matters for your career, your team, and getting leadership buy-in for more AI investment.',
      },
      {
        title: 'The before/after framework',
        content: 'Pick one task you now do with AI. Measure it on two dimensions: (1) Time — how long did it take before vs. now? (2) Quality — is the output better, more consistent, or more thorough? Even rough estimates are valuable: "QBR prep went from 2 hours to 40 minutes" is a real number.',
      },
      {
        title: 'Connecting to team goals',
        content: 'Your manager cares about outcomes, not tools. Frame your AI use in terms of what it enables: "I can now handle 30% more accounts because prep time dropped by half" or "Our customer response time improved because first drafts are instant." Connect AI to something your team already measures.',
      },
      {
        title: 'Building your impact story',
        content: 'A strong impact story has four parts: (1) What I was doing before (the manual/slow/inconsistent way), (2) What I changed (the AI workflow I built), (3) What improved (time, quality, volume, consistency), (4) What\'s next (where else this pattern applies). This is what you share with your manager and your team.',
      },
      {
        title: 'Scaling impact beyond yourself',
        content: 'The biggest jump in AI impact comes from sharing what works. When you build a workflow that saves you 2 hours/week, and 5 teammates adopt it, that\'s 10 hours/week of team capacity recovered. Document your best workflows and share them.',
        action: { label: 'Share a prompt', href: '/prompts' },
      },
    ],
    activity: {
      type: 'reflect',
      title: 'Write your impact story',
      description: 'Answer these four questions about one task you now do with AI:',
      questions: [
        'What were you doing before? (How long, what was the quality like?)',
        'What did you change? (What AI workflow did you build?)',
        'What improved? (Time saved, quality increase, volume handled?)',
        'Where else could this pattern apply on your team?',
      ],
    },
  },
  {
    num: 6,
    title: 'Advanced Prompting Patterns',
    subtitle: 'Techniques that unlock better AI output',
    duration: '20 min',
    status: 'available',
    tiers: ['practitioner', 'power_user', 'builder', 'developer'],
    sections: [
      {
        title: 'Chain-of-thought prompting',
        content: 'When you need AI to reason through a problem, tell it to think step by step. Instead of "Is this a good deal?", try "Walk through the unit economics step by step, then give your assessment." This forces the model to show its work and catches reasoning errors you can correct.',
      },
      {
        title: 'Few-shot prompting',
        content: 'Show AI 2-3 examples of what you want before asking for the real output. "Here are two escalation emails I wrote that worked well: [example 1] [example 2]. Now write one for this situation..." The model mirrors your tone, structure, and judgment much more accurately.',
      },
      {
        title: 'System prompts and personas',
        content: 'A system prompt sets the AI\'s behavior for an entire conversation. "You are a senior CSM who has run 200+ QBRs. You give direct, actionable feedback. Never sugarcoat." This is more powerful than repeating instructions in every message — it shapes every response.',
      },
      {
        title: 'Structured output control',
        content: 'When you need a specific format, define it explicitly: "Return your answer as a JSON object with keys: summary, risk_level, next_steps" or "Use this template: SITUATION: / IMPACT: / ACTION: / TIMELINE:". AI follows structure instructions reliably when they\'re clear.',
      },
    ],
    activity: {
      type: 'quiz',
      title: 'Quick check: Which prompting technique fits?',
      question: 'You need AI to analyze whether a customer account is at risk of churning. You want it to consider usage data, support tickets, and renewal timeline before making a call. Which technique gets the best result?',
      options: [
        'Few-shot: show examples of at-risk vs. healthy accounts',
        'Chain-of-thought: ask it to reason through each signal step by step',
        'System prompt: tell it to act as a retention specialist',
        'Structured output: request a risk score from 1-10',
      ],
      correct: 1,
      explanation: 'Chain-of-thought is the best fit here. You want the AI to reason through multiple data points (usage, tickets, timeline) before reaching a conclusion. This surfaces the reasoning you can verify, rather than just getting a score or mimicking examples.',
    },
  },
  {
    num: 7,
    title: 'AI-Powered Workflows',
    subtitle: 'Automate end-to-end with AI in the loop',
    duration: '25 min',
    status: 'available',
    tiers: ['power_user', 'builder', 'developer'],
    sections: [
      {
        title: 'Beyond copy-paste: AI in your tools',
        content: 'Copy-pasting between ChatGPT and your work tools is a workflow, but it\'s manual. The next level: connecting AI directly to the systems you use — Slack, email, spreadsheets, CRM. Tools like n8n, Zapier, and Make let you trigger AI steps automatically when events happen.',
      },
      {
        title: 'Designing an AI pipeline',
        content: 'A good AI pipeline has: a trigger (new Slack message, form submission, scheduled time), an AI step (summarize, classify, draft, analyze), and an action (send email, update spreadsheet, create ticket). Start by identifying where you repeatedly do the same AI task and build the pipe around it.',
      },
      {
        title: 'Handling AI output quality',
        content: 'AI in automated workflows needs guardrails. Add validation steps: check output length, verify required fields are present, flag low-confidence results for human review. A workflow that sends bad AI output automatically is worse than no automation at all.',
      },
      {
        title: 'Human-in-the-loop patterns',
        content: 'Not every step should be fully automated. The best workflows use AI for the heavy lifting (draft, summarize, classify) and route to humans for judgment calls (approve, edit, escalate). Design approval gates at the points where mistakes are most costly.',
      },
      {
        title: 'Monitoring and iteration',
        content: 'Once a workflow is running, watch it. Track: how often does the AI output need manual correction? What types of inputs produce bad results? Use these signals to refine your prompts and add edge case handling. A workflow that never improves will eventually break.',
      },
    ],
    activity: {
      type: 'build',
      title: 'Design your first AI pipeline',
      description: 'Pick a repetitive task and sketch an automated workflow that uses AI. You don\'t need to build it yet — just design the pipeline on paper.',
      steps: [
        'Pick a task you do at least 3x per week that involves AI',
        'Define the trigger: what event starts this task?',
        'Define the AI step: what does AI do? (draft, classify, summarize, etc.)',
        'Define the action: where does the output go?',
        'Identify the approval gate: what should a human review before it ships?',
      ],
    },
  },
  {
    num: 8,
    title: 'AI for Engineering',
    subtitle: 'Code, debug, and build with AI',
    duration: '25 min',
    status: 'available',
    tiers: ['developer'],
    sections: [
      {
        title: 'AI-assisted code generation',
        content: 'AI code generation works best when you provide clear context: the language, framework, existing patterns in your codebase, and what the function should do. Be specific about edge cases and error handling upfront — "write a function that handles X" produces better code than fixing AI\'s assumptions after the fact.',
      },
      {
        title: 'Debugging with AI',
        content: 'Paste the error, the relevant code, and what you\'ve already tried. AI excels at pattern-matching common errors and suggesting fixes you might not have considered. For complex bugs, ask AI to reason through the execution flow step by step — it often catches off-by-one errors and race conditions.',
      },
      {
        title: 'Code review and refactoring',
        content: 'Use AI as a pre-reviewer before submitting PRs. Ask it to check for: security issues, error handling gaps, naming consistency, and potential edge cases. For refactoring, describe the target architecture and let AI suggest the transformation — then review every change. AI refactors are fast but need human verification.',
      },
      {
        title: 'Test generation',
        content: 'AI is excellent at generating test cases from a function signature and description. Prompt it with: the function code, the expected behavior, and any edge cases you know about. It\'ll generate a test suite covering happy path, error cases, and boundary conditions. Always review the assertions — AI sometimes tests for what the code does, not what it should do.',
      },
      {
        title: 'Building AI-powered features',
        content: 'When adding AI to your product, start with the simplest integration that delivers value: a summarization endpoint, a classification step, or a draft generator. Use streaming responses for long outputs. Cache aggressively — most AI calls with the same input return similar output. Design for graceful degradation when the AI service is slow or down.',
      },
    ],
    activity: {
      type: 'quiz',
      title: 'Quick check: AI code review',
      question: 'You\'re using AI to review a PR that modifies a payment processing endpoint. The AI says "looks good, no issues found." What should you do?',
      options: [
        'Merge it — AI confirmed it\'s safe',
        'Ask AI to specifically check for idempotency, input validation, and error handling',
        'Ignore AI review entirely and only rely on human reviewers',
        'Run it through a second AI model for a tiebreaker',
      ],
      correct: 1,
      explanation: 'A generic "looks good" from AI is low-value. Direct AI to check specific concerns relevant to the code being changed — for payment endpoints, that means idempotency, validation, and error handling. Targeted prompts produce targeted reviews.',
    },
  },
  {
    num: 9,
    title: 'Scaling AI Across Teams',
    subtitle: 'Turn individual wins into team capability',
    duration: '20 min',
    status: 'available',
    tiers: ['builder'],
    sections: [
      {
        title: 'From personal tool to team capability',
        content: 'Your individual AI workflows are valuable, but the biggest impact comes from making them available to your entire team. A workflow that saves you 2 hours/week saves 20 hours/week if 10 people adopt it. The challenge isn\'t building — it\'s packaging for adoption.',
      },
      {
        title: 'Building shared prompt libraries',
        content: 'Start by documenting your best prompts with: what it does, when to use it, required inputs, and an example output. Organize by task type, not by tool. A shared prompt library that\'s easy to browse and copy-paste gets used. One that requires setup or explanation doesn\'t.',
      },
      {
        title: 'Teaching AI skills to non-builders',
        content: 'Most people aren\'t builders — they need ready-to-use tools, not explanations of how they work. Package your workflows as simple forms or templates: "Paste your meeting notes here, click go, get your summary." Remove every step that isn\'t strictly necessary.',
      },
      {
        title: 'Measuring team-wide impact',
        content: 'Track adoption (how many people use it), frequency (how often), and outcome (time saved, quality improved). The metrics that get leadership attention: "12 people use this weekly, saving a combined 24 hours/week" is more compelling than "I built a cool AI workflow."',
      },
    ],
    activity: {
      type: 'reflect',
      title: 'Plan your team rollout',
      description: 'Think about how to share your best AI workflow with your team:',
      questions: [
        'Which of your AI workflows would benefit the most people on your team?',
        'What would you need to change to make it usable by someone with no AI experience?',
        'How would you measure whether the team is actually using it?',
        'What resistance do you expect, and how would you address it?',
      ],
    },
  },
];

export function getModulesForTier(tier) {
  const validTier = tier || 'beginner';
  return MODULES.filter((mod) => mod.tiers.includes(validTier));
}

export function getPersonalizedSubtitle(moduleNum, topTasks) {
  if (!topTasks || topTasks.length === 0) return null;
  const task1 = topTasks[0];
  const task2 = topTasks[1] || task1;
  const task3 = topTasks[2] || task1;

  const personalizations = {
    2: `Your quick win: use AI for "${task1}"`,
    3: `Build reusable prompts for "${task2}"`,
    4: `Create a repeatable workflow for "${task3}"`,
    6: `Advanced techniques for "${task1}" and beyond`,
    7: `Automate "${task1}" end-to-end`,
  };

  return personalizations[moduleNum] || null;
}
