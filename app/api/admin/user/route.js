import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { isAdmin } from '@/lib/admin';
import { getUserData } from '@/lib/blob-store';
import { getLevel, getLevelProgress } from '@/lib/level-curve';

function unwrapProfile(raw) {
  if (raw && raw.data && typeof raw.data === 'object' && raw.data.department) return raw.data;
  return raw || {};
}

// Admin-only: full progress detail for one learner, for the admin user view.
export async function GET(request) {
  const admin = await getAuthenticatedUser();
  if (!admin?.email || !(await isAdmin(admin.email))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const learnerId = searchParams.get('learnerId');
  if (!learnerId) {
    return NextResponse.json({ error: 'learnerId required' }, { status: 400 });
  }

  try {
    const [xpRaw, badgesRaw, lessonsRaw, profileRaw] = await Promise.all([
      getUserData(learnerId, 'xp'),
      getUserData(learnerId, 'badges'),
      getUserData(learnerId, 'lessons'),
      getUserData(learnerId, 'profile'),
    ]);

    const xpEvents = Array.isArray(xpRaw) ? xpRaw : [];
    const badges = Array.isArray(badgesRaw) ? badgesRaw : [];
    const lessons = Array.isArray(lessonsRaw) ? lessonsRaw : [];
    const profile = unwrapProfile(profileRaw);
    const totalXp = xpEvents.reduce((s, e) => s + (e.amount || 0), 0);

    return NextResponse.json({
      learnerId,
      profile: {
        display_name: profile.display_name || learnerId,
        department: profile.department || null,
        sub_team: profile.sub_team || null,
        tier: profile.tier || null,
        avatar: profile.avatar || null,
      },
      totalXp,
      level: getLevel(totalXp),
      levelProgress: getLevelProgress(totalXp),
      badges,
      lessons: lessons.slice().reverse(),     // most recent first
      xpEvents: xpEvents.slice().reverse(),   // most recent first
    });
  } catch (error) {
    console.error('GET /api/admin/user error:', error);
    return NextResponse.json({ error: 'Failed to load user' }, { status: 500 });
  }
}
