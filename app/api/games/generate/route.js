import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { MODELS } from '@/lib/models';
import { getAuthenticatedProfile } from '@/lib/auth-helpers';
import { logAuditEntry } from '@/lib/audit-log';

// LLM generation of a full custom round can take a while — give it room so the
// route doesn't time out before responding (see the maxDuration gotcha).
export const maxDuration = 120;

let client;
function getClient() {
  if (!client) client = new Anthropic();
  return client;
}

// Per game-type: the system prompt and a normalizer that coerces the model
// output into the exact shape that game expects (dropping malformed items).
const SPEED_COUNT = 10;

const GENERATORS = {
  speed: {
    maxTokens: 3000,
    system: `You are writing a "Speed Round" quiz for a corporate AI-learning platform. Given a TOPIC, write EXACTLY ${SPEED_COUNT} rapid-fire multiple-choice questions that teach and test genuinely useful, practical knowledge about that topic.

Rules:
- Each question has EXACTLY 4 options, with ONE clearly correct answer.
- "correct" is the 0-based index (0–3) of the right option.
- Keep questions and options short enough to read in a few seconds.
- Vary difficulty from foundational to nuanced. Accurate, no trick questions.
- "explanation" is one sentence on why the answer is right.

Return ONLY valid JSON (no markdown fences):
{ "questions": [ { "q": "<question>", "options": ["a","b","c","d"], "correct": <0-3>, "explanation": "<one sentence>" } ] }`,
    normalize: (parsed) => {
      const arr = Array.isArray(parsed?.questions) ? parsed.questions : null;
      if (!arr) return null;
      const clean = arr
        .filter((x) => x && typeof x.q === 'string' && Array.isArray(x.options) && x.options.length === 4 && Number.isInteger(x.correct) && x.correct >= 0 && x.correct <= 3)
        .map((x) => ({
          q: String(x.q).trim(),
          options: x.options.map((o) => String(o).trim()),
          correct: x.correct,
          explanation: String(x.explanation || '').trim(),
        }))
        .slice(0, SPEED_COUNT);
      return clean.length >= 5 ? { questions: clean } : null;
    },
  },
};

export async function POST(request) {
  try {
    const profile = await getAuthenticatedProfile();
    const body = await request.json().catch(() => ({}));
    const type = String(body.type || '').trim();
    const topic = String(body.topic || '').trim();

    const gen = GENERATORS[type];
    if (!gen) return NextResponse.json({ error: 'Unknown game type.' }, { status: 400 });
    if (!topic) return NextResponse.json({ error: 'A topic is required.' }, { status: 400 });

    const response = await getClient().messages.create({
      model: MODELS.sonnet,
      max_tokens: gen.maxTokens,
      system: gen.system,
      messages: [{ role: 'user', content: `TOPIC: ${topic}\n\nWrite the full round now.` }],
    });

    const text = response.content?.[0]?.text || '';
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      const m = text.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : null;
    }

    const result = gen.normalize(parsed);
    if (!result) {
      return NextResponse.json({ error: 'Could not build that round. Try rephrasing your topic.' }, { status: 502 });
    }

    logAuditEntry({
      type: `generate_game_${type}`,
      endpoint: '/api/games/generate',
      user: { email: profile?.email || 'unknown', name: profile?.display_name || 'Unknown' },
      model: MODELS.sonnet,
      input: { type, topic },
      output: { ok: true },
    }).catch(() => {});

    return NextResponse.json({ type, topic, ...result });
  } catch (error) {
    console.error('POST /api/games/generate error:', error);
    return NextResponse.json({ error: 'Something went wrong generating the game.' }, { status: 500 });
  }
}
