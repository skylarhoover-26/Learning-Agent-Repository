export const MODULES = [
  {
    num: 1,
    title: 'AI Foundations',
    subtitle: "What AI can (and can't) do",
    duration: '15 min',
    status: 'available',
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
];
