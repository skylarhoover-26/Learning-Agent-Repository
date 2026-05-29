import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/profile';
import { generateDiscoverOpportunities } from '@/lib/ai';

export async function POST(request) {
  try {
    const { workDescription } = await request.json();
    const profile = await getProfile();

    const opportunities = await generateDiscoverOpportunities(workDescription, profile);

    return NextResponse.json({ opportunities });
  } catch (error) {
    console.error('POST /api/discover error:', error);
    return NextResponse.json(
      { error: error.message || 'Search failed' },
      { status: 500 }
    );
  }
}
