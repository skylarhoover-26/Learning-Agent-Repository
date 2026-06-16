import { MODELS } from '@/lib/models';
import { NextResponse } from 'next/server';
import { getAuthenticatedProfile } from '@/lib/auth-helpers';
import { generateDiscoverOpportunities } from '@/lib/ai';
import { logAuditEntry } from '@/lib/audit-log';

export async function POST(request) {
  try {
    const { workDescription, tool } = await request.json();
    const profile = await getAuthenticatedProfile();
    const profileForGen = tool ? { ...profile, preferred_tool: tool } : profile;

    const start = Date.now();
    let opportunities;
    let error;

    try {
      opportunities = await generateDiscoverOpportunities(workDescription, profileForGen);
    } catch (err) {
      error = err;
    }

    logAuditEntry({
      type: 'discover',
      endpoint: '/api/discover',
      user: { email: profile?.email || 'unknown', name: profile?.display_name || 'Unknown' },
      model: MODELS.sonnet,
      input: { workDescription },
      output: error ? null : { opportunityCount: opportunities?.length || 0, opportunities },
      durationMs: Date.now() - start,
      error: error?.message || null,
    }).catch(() => {});

    if (error) throw error;

    return NextResponse.json({ opportunities });
  } catch (error) {
    console.error('POST /api/discover error:', error);
    return NextResponse.json(
      { error: error.message || 'Search failed' },
      { status: 500 }
    );
  }
}
