import { MODELS } from '@/lib/models';
import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { logAuditEntry } from '@/lib/audit-log';

let client;
function getClient() {
  if (!client) client = new Anthropic();
  return client;
}

function cannedGrade(input) {
  const lower = input.toLowerCase();
  const wordCount = input.split(/\s+/).length;
  const hasStructure = wordCount > 20;
  const hasTone = /thank|please|appreciate|glad|happy|hope/.test(lower);

  let score = 45;
  if (wordCount > 12) score += 8;
  if (wordCount > 25) score += 8;
  if (hasStructure) score += 8;
  if (hasTone) score += 8;
  if (/[.!?]$/.test(input.trim())) score += 5;
  score = Math.min(score, 88);

  return {
    score,
    strength: hasTone
      ? 'Good tone — you kept it friendly and approachable.'
      : 'You captured the key information clearly.',
    improvement: hasStructure
      ? 'Try tightening the language — shorter sentences land harder.'
      : 'Add more detail or structure to make your response complete.',
  };
}

export async function POST(request) {
  try {
    const { message, sourceText, gradingCriteria } = await request.json();
    const trimmed = (message || '').trim();

    if (trimmed.length < 12) {
      return NextResponse.json({
        score: 12,
        strength: "You started — that's the hardest part.",
        improvement: 'Write a more complete response — at least a few sentences.',
      });
    }

    const source = sourceText || 'a workplace scenario';
    const criteria = gradingCriteria || 'clarity, completeness, tone, and professionalism';

    const start = Date.now();
    let gradeResult;
    let gradeSource = 'fallback';

    try {
      const response = await getClient().messages.create({
        model: MODELS.haiku,
        max_tokens: 400,
        system: `You grade written responses for a workplace AI learning platform.
You receive source material and the learner's written response.
Score 0-100 based on: ${criteria}.
Return ONLY JSON: {"score": int, "strength": "one sentence praise", "improvement": "one sentence specific suggestion"}.`,
        messages: [
          {
            role: 'user',
            content: `Source material:\n"${source}"\n\nLearner's response:\n"${trimmed}"\n\nGrade it.`,
          },
        ],
      });

      let text = response.content[0].text.trim();
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        gradeResult = {
          score: Math.max(0, Math.min(100, Math.round(parsed.score))),
          strength: parsed.strength,
          improvement: parsed.improvement,
        };
        gradeSource = 'ai';
      }
    } catch (error) {
      console.error('Grade API error, using fallback:', error);
    }

    if (!gradeResult) {
      gradeResult = cannedGrade(trimmed);
    }

    logAuditEntry({
      type: 'grade',
      endpoint: '/api/lesson/grade',
      user: { email: 'unknown', name: 'Unknown' },
      model: gradeSource === 'ai' ? MODELS.haiku : 'fallback',
      input: { learnerResponse: trimmed, sourceText: source, gradingCriteria: criteria },
      output: gradeResult,
      durationMs: Date.now() - start,
    }).catch(() => {});

    return NextResponse.json(gradeResult);
  } catch (error) {
    console.error('POST /api/lesson/grade error:', error);
    return NextResponse.json(
      { error: error.message || 'Grading failed' },
      { status: 500 }
    );
  }
}
