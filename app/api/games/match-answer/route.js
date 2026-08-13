import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { MODELS } from '@/lib/models';
import { enforceRateLimit } from '@/lib/rate-limit';

// Family Feud only. A guess is checked against the board locally first (exact
// text, whole-phrase containment, keywords); this route is consulted ONLY when
// that misses, so a strike is never charged until a model agrees the guess isn't
// on the board. "Have AI provide sources" shares no substring with "ask for
// citations", and no keyword list will ever cover every phrasing — synonym
// judgement is the model's job.
//
// Small model, small prompt, and the client falls back to the local miss if this
// fails, so a hiccup costs a wrong strike rather than a hung game.
export const maxDuration = 15;

let client;
function getClient() {
  if (!client) client = new Anthropic();
  return client;
}

const SYSTEM = `You judge whether a player's guess means the same thing as one of the answers on a Family Feud board.

You will get the survey QUESTION, the numbered ANSWERS on the board, and the player's GUESS.

Return ONLY a JSON object: { "index": <0-based index of the answer the guess means, or -1 if none> }

Rules:
- Say YES (return the index) when the guess and the answer are the same idea in different words: "have AI provide sources" vs "ask for citations", "it uses uncertain language" vs "it hedges with phrases like may or typically". Different wording, same substance — that counts.
- Say NO (-1) when the guess is merely about the same general topic, is vaguer than the answer, or would match several answers equally well. Being in the neighborhood is not the same as naming the answer.
- If the guess genuinely fits two answers, pick the closest single one.
- Judge the meaning only. Ignore spelling, grammar, word order, and length.`;

export async function POST(request) {
  const limited = await enforceRateLimit('games/match-answer', 'ai', request);
  if (limited) return limited;

  try {
    const body = await request.json().catch(() => ({}));
    const guess = String(body.guess || '').trim();
    const answers = Array.isArray(body.answers) ? body.answers.map((a) => String(a || '').trim()) : [];
    const question = String(body.question || '').trim();

    if (!guess || !answers.length) {
      return NextResponse.json({ index: -1 });
    }

    const board = answers.map((a, i) => `${i}. ${a}`).join('\n');
    const response = await getClient().messages.create({
      model: MODELS.haiku,
      max_tokens: 100,
      system: SYSTEM,
      messages: [{ role: 'user', content: `QUESTION: ${question}\n\nANSWERS:\n${board}\n\nGUESS: ${guess}` }],
    });

    const text = response.content?.[0]?.text || '';
    let index = -1;
    try {
      const parsed = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || '{}');
      const n = Number(parsed.index);
      if (Number.isInteger(n) && n >= 0 && n < answers.length) index = n;
    } catch {
      // unparseable — treat as no match
    }

    return NextResponse.json({ index });
  } catch (error) {
    console.error('POST /api/games/match-answer error:', error);
    // Never block the game on this: no match means the local result stands.
    return NextResponse.json({ index: -1 });
  }
}
