import { MODELS } from '@/lib/models';
import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { isAdmin } from '@/lib/admin';
import { generateCalibrationScenarios } from '@/lib/ai';

// Admin-only tool to preview what the calibration generator produces for a given
// role — so we can tune the prompt against real output without retaking the gate
// or sharing the API key. Also reports how long generation took (the timeout
// culprit) and which skills came back cleanly.
export const maxDuration = 120;

export async function POST(request) {
  const user = await getAuthenticatedUser();
  if (!user?.email || !(await isAdmin(user.email))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  try {
    const body = await request.json();
    // Accept the role fields the generator reads; coerce tasks from a string.
    const profile = {
      title: body.title || '',
      department: body.department || '',
      sub_team: body.sub_team || '',
      tier: body.tier || '',
      goal: body.goal || '',
      top_tasks: Array.isArray(body.top_tasks)
        ? body.top_tasks
        : String(body.top_tasks || '').split(',').map((t) => t.trim()).filter(Boolean),
    };

    const start = Date.now();
    const scenarios = await generateCalibrationScenarios(profile);
    const durationMs = Date.now() - start;

    return NextResponse.json({
      model: MODELS.haiku,
      durationMs,
      generatedSkills: Object.keys(scenarios),
      scenarios,
      profileUsed: profile,
    });
  } catch (error) {
    console.error('POST /api/admin/scenario-preview error:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate' }, { status: 500 });
  }
}
