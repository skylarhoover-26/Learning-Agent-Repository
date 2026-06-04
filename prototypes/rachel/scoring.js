// scoring.js — AI Learning Companion
// Uses Claude to score free-text answers from the onboarding and check-in flows.
// All scoring prompts map directly to the scoring matrix in bot-question-flow.md.
// ─────────────────────────────────────────────────────────────────────────────

const Anthropic = require('@anthropic-ai/sdk');

// Initialize once — reused across all scoring calls
let client;
function getClient() {
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

// Helper: call Claude with a scoring prompt and parse the integer response
async function askClaude(prompt, validScores) {
  const response = await getClient().messages.create({
    model: 'claude-3-haiku-20240307',
    max_tokens: 10,
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = response.content[0].text.trim();
  const parsed = parseFloat(raw);

  // Return the parsed score if valid, otherwise return the lowest valid score
  if (validScores.includes(parsed)) return parsed;
  return validScores[0];
}

// ─── Onboarding: Q3b — Personal Impact follow-up ─────────────────────────────
// Called when the user selects D on Q3 (AI has genuinely changed my output)
// Scoring matrix:
//   3 = Vague or generic ("it helps me write faster")
//   4 = Specific improvement with clear before/after
//   5 = Measurable business outcome (volume, speed, quality, reduced rework)

async function scorePersonalImpact(text) {
  const prompt = `You are scoring a response for an AI learning program. The person was asked:
"Can you give me a quick example of how AI has changed what you produce or deliver?"

Their response: "${text}"

Score using exactly this rubric:
- Score 3: Vague or generic — no specifics about what changed or how (e.g. "it helps me write faster")
- Score 4: Specific productivity improvement with a clear before/after (e.g. "I used to spend 2 hours writing reports; now I draft in 30 min")
- Score 5: Measurable business outcome — faster delivery, higher output volume, higher quality, or reduced rework with evidence

Respond with ONLY a single number: 3, 4, or 5. No other text.`;

  return await askClaude(prompt, [3, 4, 5]);
}

// ─── Onboarding: Q4b — Team Impact follow-up ─────────────────────────────────
// Called when the user selects D on Q4 (I actively coach my team on AI)
// Scoring matrix:
//   3 = A single instance of helping a colleague
//   4 = Regular pattern of coaching with clear improvement in others' work
//   5 = Systematic, ongoing enablement — whole team using AI better because of them

async function scoreTeamImpact(text) {
  const prompt = `You are scoring a response for an AI learning program. The person was asked:
"What's a recent example of you helping someone on your team use AI more effectively?"

Their response: "${text}"

Score using exactly this rubric:
- Score 3: A single instance of helping a colleague — one-off, no pattern
- Score 4: Regular pattern of coaching or sharing, with clear improvement in others' work
- Score 5: Systematic, ongoing enablement — the whole team (or a significant portion) is using AI better because of their direct, ongoing involvement

Respond with ONLY a single number: 3, 4, or 5. No other text.`;

  return await askClaude(prompt, [3, 4, 5]);
}

// ─── Onboarding: Q5 follow-up — Org Impact ───────────────────────────────────
// Called when the user selects D on Q5 (I've built or shared practices others use)
// Scoring matrix:
//   4 = Individual or team-level impact
//   5 = Cross-functional or org-level with demonstrated outcomes

async function scoreOrgImpact(text) {
  const prompt = `You are scoring a response for an AI learning program. The person was asked:
"What's an example of AI helping you connect to team goals or broader business outcomes?"

Their response: "${text}"

Score using exactly this rubric:
- Score 4: Individual or team-level impact — AI practice benefits their direct team or department
- Score 5: Cross-functional or org-level impact — AI practices they built are used across multiple teams or at org level, with demonstrated/measurable outcomes

Respond with ONLY a single number: 4 or 5. No other text.`;

  return await askClaude(prompt, [4, 5]);
}

// ─── Check-in: Personal Impact follow-up ─────────────────────────────────────
// Called when the user selects D on check-in Q1 (delivered a real AI-driven outcome)
// Scoring matrix:
//   4 = Specific, describable AI-driven outcome at individual or team level
//   5 = Measurable business outcome with clear evidence

async function scoreCheckinPersonal(text) {
  const prompt = `You are scoring a check-in response for an AI learning program. The person said they've delivered something they can point to as a real AI-driven outcome. They were asked to describe it.

Their response: "${text}"

Score using exactly this rubric:
- Score 4: Specific, describable AI-driven outcome at the individual or team level
- Score 5: Measurable business outcome — clear metric improvement, significant time saved, or quality gain with evidence

Respond with ONLY a single number: 4 or 5. No other text.`;

  return await askClaude(prompt, [4, 5]);
}

module.exports = {
  scorePersonalImpact,
  scoreTeamImpact,
  scoreOrgImpact,
  scoreCheckinPersonal,
};
