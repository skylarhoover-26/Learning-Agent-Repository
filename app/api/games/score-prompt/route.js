import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getAuthenticatedProfile } from '@/lib/auth-helpers';

let client;
function getClient() {
  if (!client) {
    client = new Anthropic();
  }
  return client;
}

const SYSTEM_PROMPT = `You are an expert prompt-engineering evaluator on a corporate AI learning platform.

The user will provide a scenario and a prompt they wrote for that scenario.
Score the prompt on four dimensions, each from 1 to 5, based on the RCTF framework:

1. **Role** - Does the prompt start by assigning a role to the AI? (e.g., "You are a customer success manager..."). A good prompt always tells the AI WHO to be.
2. **Context** - Does it provide relevant background information and constraints? The AI needs to understand the situation.
3. **Task** - Is the actual request clear and specific? The AI should know exactly what to do.
4. **Format** - Does it specify the desired output format? (e.g., bullet points, email, table, 3 paragraphs). Without this, output is unpredictable.

Return ONLY a JSON object with this exact shape (no markdown fences):
{
  "clarity": { "score": <1-5>, "feedback": "<1-2 sentences evaluating Role — did they tell the AI who to be?>" },
  "specificity": { "score": <1-5>, "feedback": "<1-2 sentences evaluating Context + Task — enough background and a clear ask?>" },
  "effectiveness": { "score": <1-5>, "feedback": "<1-2 sentences evaluating Format + overall quality — would this produce useful output?>" },
  "overallTip": "<1-2 sentences. If the prompt is missing Role, Context, Task, or Format, call out which RCTF element to add. Reference the framework by name.>"
}

Be encouraging but honest. Always reference the RCTF framework (Role, Context, Task, Format) in your feedback. Tailor to a non-technical business professional.`;

export async function POST(request) {
  try {
    const { scenario, prompt } = await request.json();
    const profile = await getAuthenticatedProfile();

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
