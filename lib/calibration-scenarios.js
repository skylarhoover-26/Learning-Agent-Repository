export const SCENARIOS = [
  {
    id: 'privacy',
    primary: 'privacy',
    setup: "Your team uses an HCP-approved AI chat tool. The vendor's docs explicitly say 'we don't train on your inputs.' A teammate is using it to draft a renewal pitch and pastes in the customer's org ID, renewal date, last 5 invoice amounts, and account exec name.",
    prompt: "What's the issue here, if any?",
    answers: [
      {
        text: "Nothing — the tool is approved and explicitly says it doesn't train on inputs.",
        scores: { privacy: 0.2 },
      },
      {
        text: 'The renewal date is fine, but the invoice amounts may count as financial data — strip those.',
        scores: { privacy: 0.5, prompting: 0.2 },
      },
      {
        text: "Even on an approved tool, paste only what's needed for the task. None of that data shapes the pitch tone you're drafting.",
        scores: { privacy: 1.0, prompting: 0.5, comms: 0.3 },
      },
      {
        text: "Generally fine — the customer agreed to data sharing in the contract.",
        scores: { privacy: 0.1 },
      },
    ],
  },
  {
    id: 'prompting',
    primary: 'prompting',
    setup: "You have 200 customer interview transcripts. Your VP wants 'the top issues' for a leadership presentation tomorrow. You have ~4 hours.",
    prompt: 'Which approach holds up?',
    answers: [
      {
        text: "One prompt: 'Find the top 3 themes from these transcripts. Quote one example per theme.'",
        scores: { prompting: 0.5, comms: 0.2 },
      },
      {
        text: 'Three stages: (1) extract issues from each transcript, (2) cluster them, (3) re-read 5 source transcripts to verify the clusters reflect reality.',
        scores: { prompting: 1.0, eval: 0.6, data: 0.5 },
      },
      {
        text: "Tell AI to act like a senior PM and give you what they'd present to leadership.",
        scores: { prompting: 0.35 },
      },
      {
        text: "Run the same prompt 3 times. If themes converge, that's signal. Use the consistent set.",
        scores: { prompting: 0.2 },
      },
    ],
  },
  {
    id: 'comms',
    primary: 'comms',
    setup: "A 5-year customer (no prior complaints) sends a curt email at 8am: 'Cancel my account, this isn't working.' That's the entire message. You're at your desk with AI ready.",
    prompt: "What's the best move?",
    answers: [
      {
        text: 'Ask AI to draft 3 versions: empathetic / problem-solving / retention-focused. Pick the most fitting.',
        scores: { comms: 0.5, prompting: 0.4 },
      },
      {
        text: "Pick up the phone. AI can't read 5 years of context. Use AI afterward to log the call and draft the follow-up.",
        scores: { comms: 1.0, eval: 0.4 },
      },
      {
        text: "Ask AI to draft a curiosity-first one-liner: 'What changed?' — keep the door open.",
        scores: { comms: 0.65, prompting: 0.4 },
      },
      {
        text: 'Ask AI to write an apology and a 20% retention offer.',
        scores: { comms: 0.15 },
      },
    ],
  },
  {
    id: 'eval',
    primary: 'eval',
    setup: "A customer says 'I called last month and was told the refund window is 60 days, not 30.' You ask AI to verify. AI returns a confident yes — 60 days — citing what looks like an official source link.",
    prompt: 'What do you do first?',
    answers: [
      {
        text: 'Reply confirming 60 days. AI found the source.',
        scores: { eval: 0.05 },
      },
      {
        text: 'Click the source link, verify the document. Then reply.',
        scores: { eval: 0.5, privacy: 0.2 },
      },
      {
        text: "Check what the policy said *last month* when they actually called. AI sources reflect today's docs, not the version that was active then.",
        scores: { eval: 1.0, comms: 0.5, data: 0.3 },
      },
      {
        text: "Ask AI to find evidence for both 30 and 60. Reply with whichever has more sources backing it.",
        scores: { eval: 0.2 },
      },
    ],
  },
  {
    id: 'agents',
    primary: 'agents',
    setup: "Your AI ticket-categorization agent has been live 2 weeks. Your team says 'it's great — better than us.' Your manager asks if you can expand it to also set ticket priority.",
    prompt: 'What do you do first?',
    answers: [
      {
        text: "Expand it — the team's positive and momentum matters. Ship priority next sprint.",
        scores: { agents: 0.1 },
      },
      {
        text: "Set up accuracy tracking: have humans re-categorize 5% of its decisions weekly. Measure for 4 weeks before scoping up.",
        scores: { agents: 1.0, eval: 0.6, data: 0.4 },
      },
      {
        text: 'Audit the past 2 weeks: pull 50 random tickets, ask the team if categorization was right, then decide.',
        scores: { agents: 0.65, eval: 0.4 },
      },
      {
        text: 'Survey the team formally. Strong positive sentiment + manager ask = green light to expand.',
        scores: { agents: 0.15 },
      },
    ],
  },
  {
    id: 'data',
    primary: 'data',
    setup: "You're prepping a churn analysis for tomorrow's QBR. You ask AI: 'In this 5,000-row CSV, what's the average tenure of churned vs. retained customers?' AI returns: '14.2 months churned vs. 31.6 months retained' — directionally what you'd expect.",
    prompt: 'What do you do with that?',
    answers: [
      {
        text: "Use the numbers in the deck. The directional difference is what matters; the exact number is fine for a QBR.",
        scores: { data: 0.05 },
      },
      {
        text: "Ask AI to write the SQL or Python that produces those numbers. Run it. Now you can defend the deck.",
        scores: { data: 1.0, eval: 0.6, prompting: 0.4 },
      },
      {
        text: "Ask AI the same question 3 times. If the numbers match, use them.",
        scores: { data: 0.15, eval: 0.1 },
      },
      {
        text: 'Spot-check by averaging tenure on 10 random churned + 10 retained rows manually. If close, ship it.',
        scores: { data: 0.55, eval: 0.4 },
      },
    ],
  },
];
