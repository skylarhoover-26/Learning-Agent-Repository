import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { isAdmin } from '@/lib/admin';
import { generateLessonResponse } from '@/lib/ai';

// Caps per format so a runaway lesson can't loop forever.
const MAX_SLIDES = { quick_tip: 2, standard: 6, deep_dive: 12 };

// Admin tool: generate a full lesson for a topic/format by auto-advancing
// through every phase, so admins can review exactly what a learner would see.
export async function POST(request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user?.email || !(await isAdmin(user.email))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { topic, format = 'standard', tier = 'beginner' } = await request.json();
    if (!topic || !topic.trim()) {
      return NextResponse.json({ error: 'Missing topic' }, { status: 400 });
    }

    // A representative learner profile so previewed content is generic, not
    // tied to the admin's own role.
    const profile = {
      display_name: 'Preview Learner',
      department: 'General',
      tier,
      top_tasks: [],
      goal: '',
    };

    const max = MAX_SLIDES[format] || MAX_SLIDES.standard;
    const messages = [{ role: 'user', content: 'Start the lesson' }];
    const slides = [];

    let response = await generateLessonResponse(topic, messages, profile, { format });
    slides.push(response);
    messages.push({ role: 'assistant', content: JSON.stringify(response) });

    let guard = 0;
    while (response.phase !== 'complete' && guard < max) {
      guard++;
      // Near the cap, ask to wrap up so we end on a clean "complete" slide.
      const userInput = guard >= max - 1
        ? "I'm done — please wrap up the lesson."
        : 'Continue to the next part.';
      messages.push({ role: 'user', content: userInput });
      response = await generateLessonResponse(topic, messages, profile, { format });
      slides.push(response);
      messages.push({ role: 'assistant', content: JSON.stringify(response) });
    }

    return NextResponse.json({
      topic,
      format,
      tier,
      slideCount: slides.length,
      slides: slides.map(s => ({
        slideTitle: s.slideTitle,
        phase: s.phase,
        message: s.message,
        keyPoints: s.keyPoints || [],
        recap: s.recap || null,
      })),
    });
  } catch (error) {
    console.error('POST /api/admin/lesson-preview error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate preview' },
      { status: 500 }
    );
  }
}
