import { MODELS } from '@/lib/models';
import { NextResponse } from 'next/server';
import { getAuthenticatedProfile } from '@/lib/auth-helpers';
import { withProjects } from '@/lib/work-projects';
import { generateVideoScript } from '@/lib/ai';
import { QUESTS } from '@/lib/quest-data';
import { logAuditEntry } from '@/lib/audit-log';
import { enforceRateLimit } from '@/lib/rate-limit';

// Narrated lessons are ONE script call (up to VIDEO_FORMAT_TOKENS for the format,
// see lib/ai.js), which runs well past the platform's default function budget.
// This route was relying on that default while every other generation route here
// declares its own — plan is 300s, teach 120s — so a longer script could be cut
// off by the runtime before it ever reached the audit log, making the failure look
// like a client problem. Declare it explicitly.
export const maxDuration = 120;

export async function POST(request) {
  const limited = await enforceRateLimit('lesson/video', 'ai', request);
  if (limited) return limited;

  try {
    const { topic, format, tools, questId } = await request.json();

    // A narrated Project Quest is sourced from the curated quest steps; everything
    // else is a topic-driven narrated lesson.
    const quest = questId ? QUESTS.find((q) => q.id === questId) : null;
    if (questId && !quest) {
      return NextResponse.json({ error: 'Quest not found' }, { status: 404 });
    }

    const scriptTopic = quest ? quest.title : topic;
    if (!scriptTopic || typeof scriptTopic !== 'string' || !scriptTopic.trim()) {
      return NextResponse.json({ error: 'Topic is required' }, { status: 400 });
    }

    const profile = await getAuthenticatedProfile();
    // Projects live outside the profile document, so attach them here — the
    // generator weights tasks, goals AND projects (lib/learner-signals.js).
    const profileForGen = await withProjects(
      tools ? { ...profile, preferred_tools: tools } : profile,
    );

    const start = Date.now();
    let response;
    let error;

    try {
      response = await generateVideoScript(scriptTopic, profileForGen, {
        format: quest ? 'project_quest' : format,
        quest,
      });
    } catch (err) {
      error = err;
    }

    logAuditEntry({
      type: 'lesson_video',
      endpoint: '/api/lesson/video',
      user: { email: profile?.email || 'unknown', name: profile?.display_name || 'Unknown' },
      model: MODELS.sonnet,
      input: { topic: scriptTopic, format: quest ? 'project_quest' : format, questId: questId || null },
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
