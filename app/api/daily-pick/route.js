import { NextResponse } from 'next/server';
import { getAuthenticatedProfile } from '@/lib/auth-helpers';
import { getUserData, saveUserData } from '@/lib/blob-store';
import { resolveLearnerId } from '@/lib/learner-id';
import { getMergedSkillLevels } from '@/lib/skill-levels';
import { computeDailyPick } from '@/lib/daily-pick';
import { contentDayKey } from '@/lib/content-day';

// Reads mutable per-user data every call — never cache at the framework level.
export const dynamic = 'force-dynamic';

// Today's Pick, computed SERVER-SIDE from the learner's Supabase-backed data
// (lesson history, module progress, calibration skills, tier) using the shared
// algorithm in lib/daily-pick.js. The result is cached per content-day so:
//   1. the browser, the /daily redirect, and the lesson all read the same pick;
//   2. the Phase-2 pre-generation cron can pre-write this slot and warm the
//      matching lesson, making the Slack click load instantly.
// Deterministic per day anyway, so re-computing on a cache miss is safe.
export async function GET() {
  try {
    const profile = await getAuthenticatedProfile();
    if (!profile?.email) {
      return NextResponse.json({ pick: null, reason: 'no_profile' });
    }
    const email = profile.email;
    const learnerId = resolveLearnerId(profile);
    const today = contentDayKey();

    // Return a cached pick for today if one exists (set here on first load, or
    // pre-written by the pre-gen cron in Phase 2).
    const cached = await getUserData(email, 'daily_pick');
    const cachedData = cached?.data || cached;
    if (cachedData?.date === today && cachedData?.pick) {
      return NextResponse.json({ pick: cachedData.pick, date: today, cached: true });
    }

    // Gather the same signals the browser uses, from the server-side stores.
    const [lessonsRaw, moduleRaw, calibrationRaw, levelOverrides] = await Promise.all([
      getUserData(email, `lp_lessons_${learnerId}`),
      getUserData(email, 'learner_module_state'),
      getUserData(email, 'calibration_profile'),
      getMergedSkillLevels().catch(() => ({})),
    ]);
    const lessonHistory = Array.isArray(lessonsRaw?.data) ? lessonsRaw.data
      : Array.isArray(lessonsRaw) ? lessonsRaw : [];
    const moduleState = moduleRaw?.data || moduleRaw || {};
    const moduleProgress = moduleState.modules || {};
    const calibration = calibrationRaw?.data || calibrationRaw || null;
    const calibrationSkills = calibration?.skills || null;

    const pick = computeDailyPick({
      lessonHistory,
      moduleProgress,
      calibrationSkills,
      tier: profile.tier,
      levelOverrides: levelOverrides || {},
    });

    // Best-effort cache so the pick is stable for the day and Phase 2 has a slot.
    saveUserData(email, 'daily_pick', { date: today, pick }).catch(() => {});

    return NextResponse.json({ pick, date: today, cached: false });
  } catch (error) {
    console.error('GET /api/daily-pick error:', error);
    return NextResponse.json({ pick: null, reason: 'error' }, { status: 200 });
  }
}
