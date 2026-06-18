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
        system: `You grade a learner's attempt at a hands-on practice exercise on a workplace AI learning platform. Be fair and encouraging — this is practice, not a high-stakes test.

THE TASK THE LEARNER WAS GIVEN (grade against THIS):
"${source}"

GRADE ONLY ON: ${criteria}

RULES:
- Judge only whether the response reasonably does what THE TASK asked. Do NOT penalize for anything the task did not explicitly require.
- If the task invited the learner to use their own example or scenario, ACCEPT their own content — never expect quotes from a specific document or any material they were not given.
- Give partial credit for a genuine, on-task attempt. A solid attempt should land around or above the pass mark. Reserve low scores (under 40) for responses that are off-topic, empty, or clearly ignore the task.
- Keep feedback specific, kind, and actionable.

Return ONLY JSON: {"score": int 0-100, "strength": "one sentence praise", "improvement": "one sentence specific, encouraging suggestion"}.`,
        messages: [
          {
            role: 'user',
            content: `The learner's response:\n"${trimmed}"\n\nGrade it against the task and criteria above.`,
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
