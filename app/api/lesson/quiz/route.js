import { MODELS } from '@/lib/models';
import { NextResponse } from 'next/server';
import { getAuthenticatedProfile } from '@/lib/auth-helpers';
import { generateLessonQuiz } from '@/lib/ai';
import { logAuditEntry } from '@/lib/audit-log';

export async function POST(request) {
  try {
    const { topic, format, messages } = await request.json();
    const profile = await getAuthenticatedProfile();

    // Quick tips are completion-only — never quizzed.
    if (format === 'quick_tip') {
      return NextResponse.json({ questions: [] });
    }

    // Flatten the assistant slides into a transcript so the quiz is grounded in
    // what was actually taught.
    const transcript = (Array.isArray(messages) ? messages : [])
      .filter(m => m && m.role === 'assistant')
      .map(m => {
        try {
          const slide = JSON.parse(m.content);
          return [slide.slideTitle, slide.message, (slide.keyPoints || []).join('; ')]
            .filter(Boolean).join('\n');
        } catch {
          return typeof m.content === 'string' ? m.content : '';
        }
      })
      .filter(Boolean)
      .join('\n\n');

    const start = Date.now();
    let result;
    let error;
    try {
      result = await generateLessonQuiz(topic, transcript, profile, { format });
    } catch (err) {
      error = err;
    }

    logAuditEntry({
      type: 'lesson_quiz',
      endpoint: '/api/lesson/quiz',
      user: { email: profile?.email || 'unknown', name: profile?.display_name || 'Unknown' },
      model: MODELS.sonnet,
      input: { topic, format },
      output: error ? null : { questionCount: result?.questions?.length || 0 },
      durationMs: Date.now() - start,
      error: error?.message || null,
    }).catch(() => {});

    if (error) throw error;

    return NextResponse.json(result);
  } catch (error) {
    console.error('POST /api/lesson/quiz error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate quiz' },
      { status: 500 }
    );
  }
}
