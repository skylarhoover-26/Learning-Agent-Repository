import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

let client;
function getClient() {
  if (!client) client = new Anthropic();
  return client;
}

const MODEL = 'claude-haiku-4-5-20251001';

async function scoreWithClaude(prompt, validScores) {
  try {
    const response = await getClient().messages.create({
      model: MODEL,
      max_tokens: 10,
      messages: [{ role: 'user', content: prompt }],
    });
    const raw = response.content[0].text.trim();
    const parsed = parseFloat(raw);
    if (validScores.includes(parsed)) return parsed;
    return validScores[0];
  } catch (error) {
    console.error('Claude scoring error:', error);
    return validScores[0];
  }
}

const SCORING_PROMPTS = {
  personal: {
    prompt: (text) => `You are scoring a response for an AI learning program. The person was asked:
"Can you give me a quick example of how AI has changed what you produce or deliver?"

Their response: "${text}"

Score using exactly this rubric:
- Score 3: Vague or generic — no specifics about what changed or how (e.g. "it helps me write faster")
- Score 4: Specific productivity improvement with a clear before/after (e.g. "I used to spend 2 hours writing reports; now I draft in 30 min")
- Score 5: Measurable business outcome — faster delivery, higher output volume, higher quality, or reduced rework with evidence

Respond with ONLY a single number: 3, 4, or 5. No other text.`,
    validScores: [3, 4, 5],
  },
  team: {
    prompt: (text) => `You are scoring a response for an AI learning program. The person was asked:
"What's a recent example of you helping someone on your team use AI more effectively?"

Their response: "${text}"

Score using exactly this rubric:
- Score 3: A single instance of helping a colleague — one-off, no pattern
- Score 4: Regular pattern of coaching or sharing, with clear improvement in others' work
- Score 5: Systematic, ongoing enablement — the whole team is using AI better because of their direct, ongoing involvement

Respond with ONLY a single number: 3, 4, or 5. No other text.`,
    validScores: [3, 4, 5],
  },
  org: {
    prompt: (text) => `You are scoring a response for an AI learning program. The person was asked:
"What's an example of AI helping you connect to team goals or broader business outcomes?"

Their response: "${text}"

Score using exactly this rubric:
- Score 4: Individual or team-level impact — AI practice benefits their direct team or department
- Score 5: Cross-functional or org-level impact — AI practices they built are used across multiple teams or at org level, with demonstrated/measurable outcomes

Respond with ONLY a single number: 4 or 5. No other text.`,
    validScores: [4, 5],
  },
};

export async function POST(request) {
  try {
    const { dimension, text } = await request.json();

    if (!dimension || !text) {
      return NextResponse.json(
        { error: 'Missing dimension or text' },
        { status: 400 }
      );
    }

    const config = SCORING_PROMPTS[dimension];
    if (!config) {
      return NextResponse.json(
        { error: `Unknown dimension: ${dimension}` },
        { status: 400 }
      );
    }

    const score = await scoreWithClaude(config.prompt(text), config.validScores);
    return NextResponse.json({ score, dimension });
  } catch (error) {
    console.error('POST /api/scoring error:', error);
    return NextResponse.json(
      { error: error.message || 'Scoring failed' },
      { status: 500 }
    );
  }
}
