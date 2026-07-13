import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { lookupSlackProfilePhoto } from '@/lib/slack-notify';

// Looks up the CALLER's own Slack profile photo by their authenticated email —
// never accepts an email param, so this can't be used to peek at someone
// else's photo. Used by the Avatar Locker's "Use my Slack photo" toggle.
export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user?.email) {
    return NextResponse.json({ ok: false, error: 'not_authenticated' }, { status: 401 });
  }
  const result = await lookupSlackProfilePhoto(user.email);
  return NextResponse.json(result);
}
