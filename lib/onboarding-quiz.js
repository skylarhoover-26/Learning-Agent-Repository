// The onboarding quiz: the questions we write ourselves, editable in
// /admin/onboarding-quiz.
//
// This replaced runtime AI scenario generation. The generator produced four
// plausible-sounding options with nothing marked correct, so learners hit
// questions where "the best answer isn't there" and never found out whether they
// got it right (feedback #204). Authored questions fix both halves: a human
// picks the best answer, and writes the one-line explanation shown right after
// someone answers.
//
// PURE MODULE — no storage imports, so the client flow and the admin API can
// both use it. Persistence lives in lib/onboarding-quiz-store.js (server only).
//
// Question shape:
//   {
//     id:         stable string key (never reuse across different questions)
//     competency: which SKILL_KEYS competency this measures
//     enabled:    whether learners see it
//     setup:      the situation, shown in a grey panel
//     prompt:     the actual question
//     answers:    [{ text, scores: { competencyKey: 0..1 } }]  (2-6 of them)
//     best:       index into `answers` of the best answer
//     why:        plain-language explanation revealed after answering
//   }
//
// Answer options are kept ROUGHLY EQUAL in length within each question, and the
// best option is deliberately NOT the longest — otherwise learners can guess the
// right answer by picking the wordiest one. Keep that property when editing.

import { SKILL_KEYS } from './competencies';

export const MIN_ANSWERS = 2;
export const MAX_ANSWERS = 6;

export const QUIZ_DEFAULTS = [
  {
    id: 'privacy',
    competency: 'privacy',
    enabled: true,
    setup: "Your team's approved AI tool says it won't train on your inputs. A teammate drafting a renewal pitch pastes in the customer's org ID, renewal date, invoice amounts, and account exec name.",
    prompt: "What's the issue here, if any?",
    best: 2,
    why: "Approved and \"we don't train on your inputs\" are not the same thing as \"paste anything.\" The habit that keeps you safe is sharing only what the task actually needs — and none of those account details change how the pitch reads.",
    answers: [
      { text: "Nothing — the tool is approved and says it doesn't train on inputs.", scores: { privacy: 0.2 } },
      { text: "The renewal date's fine, but invoice amounts are sensitive financial data — strip those out first.", scores: { privacy: 0.5, prompting: 0.2 } },
      { text: 'Even approved tools: paste only what the task needs; none of it shapes the pitch.', scores: { privacy: 1.0, prompting: 0.5, comms: 0.3 } },
      { text: "It's fine — the customer agreed to data sharing in the contract.", scores: { privacy: 0.1 } },
    ],
  },
  {
    id: 'prompting',
    competency: 'prompting',
    enabled: true,
    setup: "You have 200 customer interview transcripts. Your VP wants 'the top issues' for a leadership presentation tomorrow. You have ~4 hours.",
    prompt: 'Which approach holds up?',
    best: 1,
    why: 'Asking one prompt to read 200 transcripts at once gets you a confident summary you cannot check. Breaking it into extract, then cluster, then spot-check a few originals gives you the same answer plus the ability to defend it when your VP pushes back.',
    answers: [
      { text: "One prompt: 'Find the top 3 themes across all of these transcripts, and quote one example for each.'", scores: { prompting: 0.5, comms: 0.2 } },
      { text: 'Extract issues per transcript, cluster them, then re-read a few to verify.', scores: { prompting: 1.0, eval: 0.6, data: 0.5 } },
      { text: "Tell AI to act like a senior PM and give what they'd present to leadership.", scores: { prompting: 0.35 } },
      { text: 'Run the same prompt 3 times; if themes converge, use the consistent set.', scores: { prompting: 0.2 } },
    ],
  },
  {
    id: 'comms',
    competency: 'comms',
    enabled: true,
    setup: "A 5-year customer with no prior complaints emails at 8am: 'Cancel my account, this isn't working.' That's the whole message. You're at your desk with AI ready.",
    prompt: "What's the best move?",
    best: 1,
    why: "Knowing when NOT to use AI is part of the skill. Five years of relationship and one vague sentence means you're missing the actual reason — and no draft, however well written, can find it. Call, listen, then let AI help you follow up.",
    answers: [
      { text: 'Have AI draft 3 versions — empathetic, problem-solving, retention — and pick the best fit.', scores: { comms: 0.5, prompting: 0.4 } },
      { text: "Pick up the phone — AI can't read 5 years of context. Log it after.", scores: { comms: 1.0, eval: 0.4 } },
      { text: "Ask AI for a curiosity-first one-liner: 'What changed?' — keep the door open.", scores: { comms: 0.65, prompting: 0.4 } },
      { text: 'Ask AI to write an apology and a 20% retention offer.', scores: { comms: 0.15 } },
    ],
  },
  {
    id: 'eval',
    competency: 'eval',
    enabled: true,
    setup: 'A customer says they were told last month the refund window is 60 days, not 30. You ask AI; it confidently says 60, citing an official-looking source.',
    prompt: 'What do you do first?',
    best: 2,
    why: "The question isn't what the policy says today, it's what it said when the customer was told. AI reflects the current docs, so checking the source link only confirms today's version. Confidence and a real-looking citation are not evidence.",
    answers: [
      { text: 'Reply confirming 60 days — AI found the source.', scores: { eval: 0.05 } },
      { text: 'Click through to the source link, verify the actual document itself, then reply to them.', scores: { eval: 0.5, privacy: 0.2 } },
      { text: "Check what the policy said last month — AI only reflects today's docs.", scores: { eval: 1.0, comms: 0.5, data: 0.3 } },
      { text: 'Ask AI for evidence on both 30 and 60; reply with whichever has more.', scores: { eval: 0.2 } },
    ],
  },
  {
    // Off by default: this one presumes you already run an agent, which most
    // people don't yet. Turn it on for teams where that's true.
    id: 'agents',
    competency: 'agents',
    enabled: false,
    setup: "Your AI ticket-categorization agent has been live 2 weeks. Your team says 'it's great — better than us.' Your manager asks if you can expand it to also set ticket priority.",
    prompt: 'What do you do first?',
    best: 1,
    why: '"It feels great" is sentiment, not accuracy. Before you hand an agent more responsibility you need a number you trust, and that means humans re-checking a sample of its calls over time. A one-off audit tells you about two weeks; ongoing sampling tells you whether it holds.',
    answers: [
      { text: "Expand it — the team's positive and momentum matters. Ship priority next sprint.", scores: { agents: 0.1 } },
      { text: 'Track accuracy first: humans re-check 5% of its calls weekly for 4 weeks.', scores: { agents: 1.0, eval: 0.6, data: 0.4 } },
      { text: 'Audit 50 random tickets from the 2 weeks, ask if categorization was right, decide.', scores: { agents: 0.65, eval: 0.4 } },
      { text: 'Survey the team formally — strong sentiment plus a manager ask means expand.', scores: { agents: 0.15 } },
    ],
  },
  {
    // Off by default: presumes hands-on work with spreadsheets or SQL. Turn it
    // on for analyst-heavy teams.
    id: 'data',
    competency: 'data',
    enabled: false,
    setup: "Prepping tomorrow's QBR churn analysis, you ask AI the average tenure of churned vs. retained customers in a 5,000-row CSV. It answers '14.2 vs. 31.6 months' — about what you'd expect.",
    prompt: 'What do you do with that?',
    best: 1,
    why: 'Numbers that match your expectations are the most dangerous kind, because you stop checking. Having AI show the query behind them and running it yourself means you can answer the "where did this come from?" question in the room.',
    answers: [
      { text: 'Use the numbers — the directional gap is what matters for a QBR.', scores: { data: 0.05 } },
      { text: 'Have AI write the SQL behind those numbers, run it, then defend them.', scores: { data: 1.0, eval: 0.6, prompting: 0.4 } },
      { text: 'Ask AI the same question 3 times; if the numbers match, use them.', scores: { data: 0.15, eval: 0.1 } },
      { text: 'Manually average tenure on 10 churned and 10 retained rows; if it lines up, ship it.', scores: { data: 0.55, eval: 0.4 } },
    ],
  },
  {
    // Tool-agnostic on purpose: this measures the JUDGMENT of matching a model
    // to the task (fast/everyday vs. slower deep-reasoning), NOT knowledge of
    // specific model names — those change constantly and live in the
    // model-lineup reference. Never put model names in this question.
    id: 'models',
    competency: 'models',
    enabled: true,
    setup: "Your AI tool lets you pick between a fast everyday model and a slower deep-reasoning one. You've got a tricky, multi-step analysis due today.",
    prompt: 'Which model do you reach for?',
    best: 1,
    why: 'Matching the model to the job is the whole skill. Fast models are great for routine work and quietly cut corners on multi-step reasoning. Always reaching for the most powerful one wastes time and money on easy tasks.',
    answers: [
      { text: "Grab the fast model — it's quicker and its answers usually look fine.", scores: { models: 0.15 } },
      { text: 'Use the deep-reasoning model here; keep the fast one for routine tasks.', scores: { models: 1.0, eval: 0.3 } },
      { text: "Whatever's set as default — honestly I don't notice much difference.", scores: { models: 0.4 } },
      { text: 'Always pick the most powerful model so quality is never a question.', scores: { models: 0.3 } },
    ],
  },
];

// The questions learners actually see, in author order.
export function activeQuestions(questions) {
  return (Array.isArray(questions) ? questions : []).filter((q) => q.enabled !== false);
}

// Which competencies a given question set actually measures. The results screen
// shows ONLY these: a competency nobody was asked about would otherwise display
// its untouched 0.3 baseline as if it were a real measurement.
export function measuredCompetencies(questions) {
  const seen = new Set();
  for (const q of activeQuestions(questions)) {
    for (const a of q.answers || []) {
      for (const key of Object.keys(a.scores || {})) seen.add(key);
    }
  }
  return SKILL_KEYS.filter((k) => seen.has(k));
}

function cleanScores(scores) {
  const out = {};
  for (const [key, raw] of Object.entries(scores || {})) {
    if (!SKILL_KEYS.includes(key)) continue;
    const n = Number(raw);
    if (!Number.isFinite(n)) continue;
    out[key] = Math.max(0, Math.min(1, n));
  }
  return out;
}

// Normalize one authored question, or return null if it's too malformed to show.
// Admin input is the only source here, but a half-saved question must never be
// able to break the gate every new hire has to walk through.
export function normalizeQuestion(q, index = 0) {
  if (!q || typeof q !== 'object') return null;
  const competency = SKILL_KEYS.includes(q.competency) ? q.competency : null;
  if (!competency) return null;

  const setup = typeof q.setup === 'string' ? q.setup.trim() : '';
  const prompt = typeof q.prompt === 'string' ? q.prompt.trim() : '';
  if (!prompt) return null;

  const answers = (Array.isArray(q.answers) ? q.answers : [])
    .map((a) => ({
      text: typeof a?.text === 'string' ? a.text.trim() : '',
      scores: cleanScores(a?.scores),
    }))
    .filter((a) => a.text)
    .slice(0, MAX_ANSWERS);
  if (answers.length < MIN_ANSWERS) return null;

  const bestRaw = Number(q.best);
  const best = Number.isInteger(bestRaw) && bestRaw >= 0 && bestRaw < answers.length ? bestRaw : 0;

  return {
    id: typeof q.id === 'string' && q.id.trim() ? q.id.trim() : `q${index + 1}`,
    competency,
    enabled: q.enabled !== false,
    setup,
    prompt,
    answers,
    best,
    why: typeof q.why === 'string' ? q.why.trim() : '',
  };
}

// Normalize a whole set, dropping unusable questions and de-duplicating ids.
export function normalizeQuiz(questions) {
  const seen = new Set();
  const out = [];
  (Array.isArray(questions) ? questions : []).forEach((q, i) => {
    const clean = normalizeQuestion(q, i);
    if (!clean) return;
    let { id } = clean;
    let n = 2;
    while (seen.has(id)) id = `${clean.id}-${n++}`;
    seen.add(id);
    out.push({ ...clean, id });
  });
  return out;
}
