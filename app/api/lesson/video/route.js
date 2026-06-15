import { NextResponse } from 'next/server';
import { getAuthenticatedProfile } from '@/lib/auth-helpers';
import { generateVideoScript } from '@/lib/ai';
import { logAuditEntry } from '@/lib/audit-log';

export async function POST(request) {
  try {
    const { topic, format } = await request.json();

    if (!topic || typeof topic !== 'string' || !topic.trim()) {
      return NextResponse.json({ error: 'Topic is required' }, { status: 400 });
    }

    const profile = await getAuthenticatedProfile();

    const start = Date.now();
    let response;
    let error;

    try {
      response = await generateVideoScript(topic, profile, { format });
    } catch (err) {
      error = err;
    }

    logAuditEntry({
      type: 'lesson_video',
      endpoint: '/api/lesson/video',
      user: { email: profile?.email || 'unknown', name: profile?.display_name || 'Unknown' },
      model: 'claude-sonnet-4-6',
      input: { topic, format },
      output: error ? null : { title: response?.title, sceneCount: response?.scenes?.length },
      durationMs: Date.now() - start,
      error: error?.message || null,
    }).catch(() => {});

    if (error) throw error;

    return NextResponse.json(response);
  } catch (error) {
    console.error('POST /api/lesson/video error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate the video lesson' },
      { status: 500 }
    );
  }
}
