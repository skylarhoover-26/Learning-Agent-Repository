import { NextResponse } from 'next/server';
import { getModelLineup, saveModelLineup } from '@/lib/model-lineup';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { isAdmin } from '@/lib/admin';

// Reads mutable blob state, so it must not be statically cached.
export const dynamic = 'force-dynamic';

// GET — the current live model lineup (seed fallback if nothing is stored yet).
// Used by an admin view and for verifying a refresh landed.
export async function GET() {
  const lineup = await getModelLineup();
  return NextResponse.json({ lineup });
}

// POST — admin manual override (e.g. correct a model name the AI got wrong).
export async function POST(req) {
  try {
    const user = await getAuthenticatedUser();
    if (!user?.email || !(await isAdmin(user.email))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json();
    const saved = await saveModelLineup({
      ...body,
      updated_at: new Date().toISOString(),
      source: 'admin',
    });
    return NextResponse.json({ status: 'ok', lineup: saved });
  } catch (error) {
    console.error('Model lineup save failed:', error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
