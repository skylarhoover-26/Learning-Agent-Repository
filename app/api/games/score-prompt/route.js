import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getProfile } from '@/lib/profile';

let client;
function getClient() {
  if (!client) {
    client = new Anthropic();
  }
  return client;
}

const SYSTEM_PROMPT = `You are an expert prompt-engineering evaluator on a corporate AI learning platform.

The user will provide a scenario and a prompt they wrote for that scenario.
Score the prompt on three dimensions, each from 1 to 5:

1. **Clarity** - Is the prompt clear and unambiguous?
2. **Specificity** - Does it include enough context and constraints?
3. **Effectiveness** - Would this prompt produce a useful, high-quality output?

Return ONLY a JSON object with this exact shape (no markdown fences):
{
  "clarity": { "score": <1-5>, "feedback": "<1-2 sentences>" },
  "specificity": { "score": <1-5>, "feedback": "<1-2 sentences>" },
  "effectiveness": { "score": <1-5>, "feedback": "<1-2 sentences>" },
  "overallTip": "<1-2 sentences with the single most impactful improvement>"
}

Be encouraging but honest. Tailor feedback to a non-technical business professional.`;

export async function POST(request) {
  try {
    const { scenario, prompt } = await request.json();
    const profile = await getProfile();

    if (!scenario || !prompt) {
      return NextResponse.json(
        { error: 'scenario and prompt are required' },
        { status: 400 }
      );
    }

    const learnerContext = profile
      ? `\nLearner context: ${profile.display_name || 'Anonymous'}, ${profile.department || 'unknown department'}, tier: ${profile.tier || 'beginner'}.`
      : '';

    const response = await getClient().messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 600,
      system: SYSTEM_PROMPT + learnerContext,
      messages: [
        {
          role: 'user',
          content: `Scenario: ${scenario}\n\nThe learner's prompt:\n${prompt}`,
        },
      ],
    });

    let text = response.content[0].text.trim();
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
    const scores = JSON.parse(text);

    return NextResponse.json(scores);
  } catch (error) {
    console.error('POST /api/games/score-prompt error:', error);
    return NextResponse.json(
      { error: error.message || 'Something went wrong' },
      { status: 500 }
    );
  }
}
