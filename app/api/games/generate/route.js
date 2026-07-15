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
const HALLUC_ROUNDS = 3;
const PROMPT_COUNT = 4;

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

  halluc: {
    maxTokens: 4000,
    system: `You are writing "Hallucination Hunt" rounds for a corporate AI-learning platform. Given a TOPIC, write EXACTLY ${HALLUC_ROUNDS} rounds. Each round is a realistic AI-generated answer about the topic that contains a few PLANTED factual errors ("hallucinations") the player must spot.

Rules per round:
- "context": one sentence framing what was asked (e.g. 'You asked an AI: "..."'), related to the topic.
- "sentences": 6–8 short, standalone sentences forming the AI's answer.
- "hallucinations": array of the 0-based indices of the sentences that are factually WRONG. Include 1–2 per round (never 0). The rest must be TRUE and plausible.
- "explanations": an object keyed by each hallucination index, each a one-sentence explanation of what's actually correct.
- Errors must be genuinely wrong but believable — not obvious. Everything else must be accurate.

Return ONLY valid JSON (no markdown fences):
{ "rounds": [ { "context": "<...>", "sentences": ["...","..."], "hallucinations": [3], "explanations": { "3": "<why it's wrong>" } } ] }`,
    normalize: (parsed) => {
      const arr = Array.isArray(parsed?.rounds) ? parsed.rounds : null;
      if (!arr) return null;
      const clean = arr.map((r, i) => {
        const sentences = Array.isArray(r?.sentences) ? r.sentences.map((s) => String(s).trim()).filter(Boolean) : [];
        const hallucinations = (Array.isArray(r?.hallucinations) ? r.hallucinations : [])
          .map((n) => Number(n)).filter((n) => Number.isInteger(n) && n >= 0 && n < sentences.length);
        const explanations = {};
        hallucinations.forEach((n) => { explanations[n] = String(r?.explanations?.[n] || r?.explanations?.[String(n)] || 'This claim is not accurate.').trim(); });
        return { id: i + 1, context: String(r?.context || '').trim(), sentences, hallucinations, explanations };
      }).filter((r) => r.context && r.sentences.length >= 4 && r.hallucinations.length >= 1)
        .slice(0, HALLUC_ROUNDS);
      return clean.length >= 2 ? { rounds: clean } : null;
    },
  },

  prompt: {
    maxTokens: 2500,
    system: `You are writing "Prompt Battle" scenarios for a corporate AI-learning platform. Given a TOPIC, write EXACTLY ${PROMPT_COUNT} realistic workplace scenarios where the player must write a good prompt for an AI tool, all connected to the topic.

Rules per scenario:
- "department": the team this fits (e.g. "Sales", "Operations", "Customer Success").
- "title": a short task name.
- "context": 1–2 sentences of realistic situation/background.
- "task": one sentence telling the player what prompt to write (e.g. "Write a prompt that would get an AI to draft ...").
- Make each scenario distinct and genuinely useful for the topic.

Return ONLY valid JSON (no markdown fences):
{ "scenarios": [ { "department": "<team>", "title": "<short title>", "context": "<1-2 sentences>", "task": "<what prompt to write>" } ] }`,
    normalize: (parsed) => {
      const arr = Array.isArray(parsed?.scenarios) ? parsed.scenarios : null;
      if (!arr) return null;
      const clean = arr
        .filter((x) => x && x.title && x.context && x.task)
        .map((x, i) => ({
          id: i + 1,
          department: String(x.department || 'Your work').trim(),
          title: String(x.title).trim(),
          context: String(x.context).trim(),
          task: String(x.task).trim(),
        }))
        .slice(0, PROMPT_COUNT);
      return clean.length >= 2 ? { scenarios: clean } : null;
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
