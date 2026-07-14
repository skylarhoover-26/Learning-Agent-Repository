import { MODELS } from '@/lib/models';
import { NextResponse } from 'next/server';
import { getAuthenticatedProfile } from '@/lib/auth-helpers';
import { generateImpactScores } from '@/lib/ai';
import { logAuditEntry } from '@/lib/audit-log';

// Synthesizes the four AI Impact competency scores + "why" from the learner's
// answers against the company rubric. Runs the LLM, so give it the full window.
export const maxDuration = 120;

export async function POST(request) {
  try {
    const { entries, calibrationSummary } = await request.json();
    const profile = await getAuthenticatedProfile();

    const start = Date.now();
    const scores = await generateImpactScores(profile, entries, calibrationSummary || '');

    logAuditEntry({
      type: 'impact_score',
      endpoint: '/api/impact-score',
      user: { email: profile?.email || 'unknown', name: profile?.display_name || 'Unknown' },
      model: MODELS.haiku,
      input: { entries },
      output: { scores },
      durationMs: Date.now() - start,
      error: null,
    }).catch(() => {});

    return NextResponse.json({ scores });
  } catch (error) {
    console.error('POST /api/impact-score error:', error);
    return NextResponse.json({ error: error.message || 'Failed to score' }, { status: 500 });
  }
}
