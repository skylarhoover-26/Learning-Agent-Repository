// Answer options are kept ROUGHLY EQUAL in length within each scenario, and the
// best (highest-scoring) option is deliberately NOT the longest — so learners
// can't guess the "right" answer just by picking the wordiest one.
export const SCENARIOS = [
  {
    id: 'privacy',
    primary: 'privacy',
    setup: "Your team's approved AI tool says it won't train on your inputs. A teammate drafting a renewal pitch pastes in the customer's org ID, renewal date, invoice amounts, and account exec name.",
    prompt: "What's the issue here, if any?",
    answers: [
      {
        text: "Nothing — the tool is approved and says it doesn't train on inputs.",
        scores: { privacy: 0.2 },
      },
      {
        text: "The renewal date's fine, but invoice amounts are financial data — strip those out.",
        scores: { privacy: 0.5, prompting: 0.2 },
      },
      {
        text: "Even on approved tools, paste only what the task needs; none of that shapes the pitch.",
        scores: { privacy: 1.0, prompting: 0.5, comms: 0.3 },
      },
      {
        text: "It's fine — the customer agreed to data sharing in the contract.",
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
        text: "One prompt: 'Find the top 3 themes from these transcripts. Quote one example each.'",
        scores: { prompting: 0.5, comms: 0.2 },
      },
      {
        text: 'Extract issues per transcript, cluster them, then re-read 5 sources to verify the clusters.',
        scores: { prompting: 1.0, eval: 0.6, data: 0.5 },
      },
      {
        text: "Tell AI to act like a senior PM and give what they'd present to leadership.",
        scores: { prompting: 0.35 },
      },
      {
        text: 'Run the same prompt 3 times; if themes converge, use the consistent set.',
        scores: { prompting: 0.2 },
      },
    ],
  },
  {
    id: 'comms',
    primary: 'comms',
    setup: "A 5-year customer with no prior complaints emails at 8am: 'Cancel my account, this isn't working.' That's the whole message. You're at your desk with AI ready.",
    prompt: "What's the best move?",
    answers: [
      {
        text: 'Have AI draft 3 versions — empathetic, problem-solving, retention — and pick the best fit.',
        scores: { comms: 0.5, prompting: 0.4 },
      },
      {
        text: "Pick up the phone — AI can't read 5 years of context. Log it after.",
        scores: { comms: 1.0, eval: 0.4 },
      },
      {
        text: "Ask AI for a curiosity-first one-liner: 'What changed?' — keep the door open.",
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
    setup: "A customer says they were told last month the refund window is 60 days, not 30. You ask AI; it confidently says 60, citing an official-looking source.",
    prompt: 'What do you do first?',
    answers: [
      {
        text: 'Reply confirming 60 days — AI found the source.',
        scores: { eval: 0.05 },
      },
      {
        text: 'Click the source link, verify the document, then reply.',
        scores: { eval: 0.5, privacy: 0.2 },
      },
      {
        text: "Check what the policy said last month when they called — AI reflects today's docs.",
        scores: { eval: 1.0, comms: 0.5, data: 0.3 },
      },
      {
        text: 'Ask AI for evidence on both 30 and 60; reply with whichever has more.',
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
        text: 'Track accuracy first: humans re-check 5% of its calls weekly for 4 weeks.',
        scores: { agents: 1.0, eval: 0.6, data: 0.4 },
      },
      {
        text: 'Audit 50 random tickets from the 2 weeks, ask if categorization was right, decide.',
        scores: { agents: 0.65, eval: 0.4 },
      },
      {
        text: 'Survey the team formally — strong sentiment plus a manager ask means expand.',
        scores: { agents: 0.15 },
      },
    ],
  },
  {
    id: 'data',
    primary: 'data',
    setup: "Prepping tomorrow's QBR churn analysis, you ask AI the average tenure of churned vs. retained customers in a 5,000-row CSV. It answers '14.2 vs. 31.6 months' — about what you'd expect.",
    prompt: 'What do you do with that?',
    answers: [
      {
        text: 'Use the numbers — the directional gap is what matters for a QBR.',
        scores: { data: 0.05 },
      },
      {
        text: 'Have AI write the SQL/Python behind those numbers, run it, then you can defend them.',
        scores: { data: 1.0, eval: 0.6, prompting: 0.4 },
      },
      {
        text: 'Ask AI the same question 3 times; if the numbers match, use them.',
        scores: { data: 0.15, eval: 0.1 },
      },
      {
        text: 'Manually average tenure on 10 churned and 10 retained rows; if close, ship.',
        scores: { data: 0.55, eval: 0.4 },
      },
    ],
  },
];

// The fixed skill order the calibration measures. Privacy is always first and is
// kept curated (compliance-sensitive); the rest can be role-generated at runtime.
export const CALIBRATION_SKILL_ORDER = ['privacy', 'prompting', 'comms', 'eval', 'agents', 'data'];

// Curated scenarios indexed by skill id — the reliable fallback the flow uses
// when a role-generated scenario is missing or fails to generate.
export const SCENARIO_BY_ID = Object.fromEntries(SCENARIOS.map((s) => [s.id, s]));
