import { MODELS } from '@/lib/models';
import { NextResponse } from 'next/server';
import { logAuditEntry } from '@/lib/audit-log';
import { gradeWriting } from '@/lib/grade-writing';

// The grading itself lives in lib/grade-writing.js so the Slack lesson flow can
// use the identical grader — same prompt, same criteria, same 0-100 scale. A
// "write" activity has to mark the same answer the same way whichever surface the
// learner answered it on.
export async function POST(request) {
  try {
    const { message, sourceText, gradingCriteria } = await request.json();
    const trimmed = (message || '').trim();

    const { score, strength, improvement, gradeSource, durationMs } = await gradeWriting({
      message: trimmed,
      sourceText,
      gradingCriteria,
    });
    const gradeResult = { score, strength, improvement };

    logAuditEntry({
      type: 'grade',
      endpoint: '/api/lesson/grade',
      user: { email: 'unknown', name: 'Unknown' },
      model: gradeSource === 'ai' ? MODELS.haiku : 'fallback',
      input: {
        learnerResponse: trimmed,
        sourceText: sourceText || 'a workplace scenario',
        gradingCriteria: gradingCriteria || 'clarity, completeness, tone, and professionalism',
      },
      output: gradeResult,
      durationMs,
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
