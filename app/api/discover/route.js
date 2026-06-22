import { MODELS } from '@/lib/models';
import { NextResponse } from 'next/server';
import { getAuthenticatedProfile } from '@/lib/auth-helpers';
import { generateDiscoverOpportunities } from '@/lib/ai';
import { logAuditEntry } from '@/lib/audit-log';

// Sonnet generation here can take 20-40s+ (other AI routes see 30-65s). Without
// this the function falls back to Vercel's short default timeout and gets killed
// mid-generation — before the audit log runs — so the user sees "Found 0 ways"
// with nothing recorded. Match the other long AI routes (lesson/plan, etc.).
export const maxDuration = 120;

export async function POST(request) {
  try {
    const { workDescription, tools } = await request.json();
    const profile = await getAuthenticatedProfile();
    const profileForGen = tools ? { ...profile, preferred_tools: tools } : profile;

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
