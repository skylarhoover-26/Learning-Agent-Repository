import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { MODELS } from '@/lib/models';
import { getAuthenticatedProfile } from '@/lib/auth-helpers';
import { logAuditEntry } from '@/lib/audit-log';

// LLM generation can take a while for a full 20-clue board — give it room so the
// route doesn't time out before responding (see the maxDuration gotcha).
export const maxDuration = 120;

let client;
function getClient() {
  if (!client) client = new Anthropic();
  return client;
}

const CATEGORIES = 5;
const VALUES = [200, 400, 600, 800];

const SYSTEM_PROMPT = `You are the writer for a Jeopardy!-style quiz game on a corporate AI-learning platform. Given a TOPIC, write a full game board that teaches and tests real, useful knowledge about that topic — practical AI skills people can apply at work.

Return a board with EXACTLY ${CATEGORIES} categories. Each category has EXACTLY ${VALUES.length} clues, one for each dollar value: ${VALUES.join(', ')}. Difficulty MUST increase with the dollar value (200 = easy/foundational, 800 = advanced/nuanced).

Jeopardy rules for the writing:
- The "clue" is phrased as a STATEMENT (the "answer" in Jeopardy terms), e.g. "This prompting technique tells the model to reason step by step before answering."
- The "answer" field is the correct response — the specific term/concept (e.g. "chain-of-thought"). Keep it short (1–5 words), NOT phrased as a question.
- "acceptable" lists 1–4 alternative correct spellings/phrasings a player might type (synonyms, abbreviations, with/without hyphens). Always include the plain term.
- Categories should be punchy, uppercase, and distinct facets of the topic.
- Keep clues accurate and self-contained. No trick questions.

Return ONLY valid JSON (no markdown fences) with this exact shape:
{
  "categories": [
    {
      "name": "CATEGORY NAME",
      "clues": [
        { "value": 200, "clue": "<statement clue>", "answer": "<short response>", "acceptable": ["<alt>", "..."] }
      ]
    }
  ]
}`;

export async function POST(request) {
  try {
    const profile = await getAuthenticatedProfile();
    const body = await request.json().catch(() => ({}));
    const topic = String(body.topic || '').trim();
    if (!topic) {
      return NextResponse.json({ error: 'A topic is required.' }, { status: 400 });
    }

    const response = await getClient().messages.create({
      model: MODELS.sonnet,
      max_tokens: 4000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: `TOPIC: ${topic}\n\nWrite the full ${CATEGORIES}-category board now.` }],
    });

    const text = response.content?.[0]?.text || '';
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      const m = text.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : null;
    }

    const categories = normalizeBoard(parsed);
    if (!categories) {
      return NextResponse.json({ error: 'Could not build a board for that topic. Try rephrasing it.' }, { status: 502 });
    }

    logAuditEntry({
      type: 'generate_jeopardy',
      endpoint: '/api/games/generate-jeopardy',
      user: { email: profile?.email || 'unknown', name: profile?.display_name || 'Unknown' },
      model: MODELS.sonnet,
      input: { topic },
      output: { categories: categories.length },
    }).catch(() => {});

    return NextResponse.json({ topic, categories });
  } catch (error) {
    console.error('POST /api/games/generate-jeopardy error:', error);
    return NextResponse.json({ error: 'Something went wrong generating the game.' }, { status: 500 });
  }
}

// Coerce the model output into a clean board: exactly the expected categories,
// each with one clue per value. Drops anything malformed; returns null if the
// result is too incomplete to play.
function normalizeBoard(parsed) {
  const cats = Array.isArray(parsed?.categories) ? parsed.categories : null;
  if (!cats || cats.length < 3) return null;

  const clean = cats.slice(0, CATEGORIES).map((c) => {
    const byValue = {};
    (Array.isArray(c?.clues) ? c.clues : []).forEach((cl) => {
      const v = Number(cl?.value);
      if (VALUES.includes(v) && cl?.clue && cl?.answer && !byValue[v]) {
        byValue[v] = {
          value: v,
          clue: String(cl.clue).trim(),
          answer: String(cl.answer).trim(),
          acceptable: Array.isArray(cl.acceptable) ? cl.acceptable.map((a) => String(a).trim()).filter(Boolean) : [],
        };
      }
    });
    const clues = VALUES.map((v) => byValue[v]).filter(Boolean);
    return { name: String(c?.name || 'CATEGORY').trim().toUpperCase(), clues };
  }).filter((c) => c.clues.length === VALUES.length);

  return clean.length >= 3 ? clean : null;
}
