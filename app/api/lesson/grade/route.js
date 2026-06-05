import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

let client;
function getClient() {
  if (!client) client = new Anthropic();
  return client;
}

const TECH_NOTE =
  "cust said AC blowing warm — checked refrig, low — added 2lb 410a — recommended coil clean nxt visit";

function cannedGrade(input) {
  const lower = input.toLowerCase();
  const wordCount = input.split(/\s+/).length;
  const greets = /hi|hello|hey|good (morning|afternoon)|thanks/.test(lower);
  const tooTechnical = /\b410a\b|\brefrigerant\b/.test(lower);
  const mentionsClean = /clean|coil|maintenance|service/.test(lower);

  let score = 40;
  if (wordCount > 12) score += 10;
  if (wordCount > 25) score += 10;
  if (greets) score += 8;
  if (mentionsClean) score += 12;
  if (!tooTechnical) score += 10;
  if (/[?!]/.test(input)) score += 4;
  score = Math.min(score, 92);

  return {
    score,
    strength: greets
      ? "Friendly opener — that sets the tone before the technical detail."
      : "You captured what was done and the next step. That's what customers care about.",
    improvement: tooTechnical
      ? "Swap '410a' for plain words — 'topped off the AC' lands better than the chemical name."
      : 'Add one sentence about what to expect next (when to schedule the coil clean, what it costs).',
  };
}

export async function POST(request) {
  try {
    const { message } = await request.json();
    const trimmed = (message || '').trim();

    if (trimmed.length < 12) {
      return NextResponse.json({
        score: 12,
        strength: "You started — that's the hardest part.",
        improvement: 'Try a full 2-sentence message: what you found, what you did, and one next step.',
      });
    }

    try {
      const response = await getClient().messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        system: `You grade short customer messages written by Housecall Pro technicians.
You receive a messy technician note and the technician's customer-facing rewrite.
Score 0-100 based on: clarity, friendliness, includes what was found + what was done + next step, no jargon.
Return ONLY JSON: {"score": int, "strength": "one sentence praise", "improvement": "one sentence specific suggestion"}.`,
        messages: [
          {
            role: 'user',
            content: `Technician note:\n"${TECH_NOTE}"\n\nTechnician's customer rewrite:\n"${trimmed}"\n\nGrade it.`,
          },
        ],
      });

      let text = response.content[0].text.trim();
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        return NextResponse.json({
          score: Math.max(0, Math.min(100, Math.round(parsed.score))),
          strength: parsed.strength,
          improvement: parsed.improvement,
        });
      }
    } catch (error) {
      console.error('Grade API error, using fallback:', error);
    }

    return NextResponse.json(cannedGrade(trimmed));
  } catch (error) {
    console.error('POST /api/lesson/grade error:', error);
    return NextResponse.json(
      { error: error.message || 'Grading failed' },
      { status: 500 }
    );
  }
}
