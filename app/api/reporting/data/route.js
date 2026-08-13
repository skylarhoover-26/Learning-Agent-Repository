import { NextResponse } from 'next/server';
import { getAuthenticatedUser, getIdentityEmail, oktaConfigured } from '@/lib/auth-helpers';
import { canViewReporting } from '@/lib/reporting-access';
import { getSupabase } from '@/lib/supabase';
import { FULL_LADDER } from '@/lib/adaptive-level';

// Live reporting, read straight from Supabase.
//
// The older /api/reporting builds a daily snapshot out of the blob store and
// joins it to the Snowflake roster. This one answers a different question — what
// people are actually doing and how well — from activity_events and
// learner_levels, live rather than as of the last cron run. The two coexist on
// purpose; migrating the roster report is not worth breaking it for.
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// A hard ceiling on how many events we pull for a range. Crossing it is
// reported to the caller rather than silently truncating — a report that
// quietly drops half its data is worse than one that says it did.
const MAX_EVENTS = 20000;

const PASS_MARK = 70;

// Same identity rule as /api/reporting: require a REAL identity, never the
// pre-Okta "demo" default, which is a seed admin and would hand cross-user data
// to an unauthenticated request.
async function resolveEmail() {
  if (oktaConfigured) {
    const user = await getAuthenticatedUser();
    return user?.email || null;
  }
  return getIdentityEmail();
}

function round(n, dp = 0) {
  const f = 10 ** dp;
  return Math.round((Number(n) || 0) * f) / f;
}

export async function GET(request) {
  const email = await resolveEmail();
  if (!email) return NextResponse.json({ error: 'Sign in to view reporting.' }, { status: 401 });
  if (!(await canViewReporting(email))) {
    return NextResponse.json({ error: 'You do not have access to reporting.' }, { status: 403 });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ available: false, reason: 'Supabase is not configured.' });
  }

  // Default window: the last 30 days. `days=0` means everything.
  const { searchParams } = new URL(request.url);
  const days = Math.max(0, Math.min(365, Number(searchParams.get('days') ?? 30) || 0));
  const since = days ? new Date(Date.now() - days * 86400000).toISOString() : null;

  try {
    let eventQuery = supabase
      .from('activity_events')
      .select('id, created_at, type, email, input')
      .in('type', ['lesson_complete', 'game_complete', 'level_change'])
      .order('created_at', { ascending: false })
      .limit(MAX_EVENTS);
    if (since) eventQuery = eventQuery.gte('created_at', since);

    const [profilesRes, levelsRes, eventsRes] = await Promise.all([
      supabase.from('profiles').select('email, display_name, name, department, tier').limit(10000),
      supabase.from('learner_levels').select('email, earned_tier, score, band, samples, last_change, updated_at').limit(10000),
      eventQuery,
    ]);

    for (const res of [profilesRes, levelsRes, eventsRes]) {
      if (res.error) throw res.error;
    }

    const profiles = profilesRes.data || [];
    const levels = new Map((levelsRes.data || []).map((r) => [String(r.email).toLowerCase(), r]));
    const events = eventsRes.data || [];

    // Per-person rollup, keyed by email.
    const byPerson = new Map();
    const person = (e) => {
      const key = String(e || '').toLowerCase();
      if (!key) return null;
      if (!byPerson.has(key)) {
        byPerson.set(key, {
          lessons: 0, games: 0, failed: 0, scoreSum: 0, scoreCount: 0, lastActive: null, moves: 0,
        });
      }
      return byPerson.get(key);
    };

    for (const e of events) {
      const p = person(e.email);
      if (!p) continue;
      const input = e.input || {};
      if (e.type === 'level_change') { p.moves += 1; continue; }
      if (e.type === 'lesson_complete') p.lessons += 1;
      if (e.type === 'game_complete') p.games += 1;
      if (typeof input.scorePercent === 'number') {
        p.scoreSum += input.scorePercent;
        p.scoreCount += 1;
        if (input.scorePercent < PASS_MARK) p.failed += 1;
      }
      if (!p.lastActive || e.created_at > p.lastActive) p.lastActive = e.created_at;
    }

    const rows = profiles
      .filter((p) => p.email)
      .map((p) => {
        const key = String(p.email).toLowerCase();
        const stats = byPerson.get(key);
        const level = levels.get(key) || null;
        const declared = p.tier || null;
        const earned = level?.earned_tier || declared;
        return {
          email: p.email,
          name: p.display_name || p.name || p.email,
          department: p.department || null,
          declared,
          earned,
          moved: declared && earned && declared !== earned
            ? (FULL_LADDER.indexOf(earned) > FULL_LADDER.indexOf(declared) ? 'up' : 'down')
            : 'none',
          score: level?.score ?? null,
          band: level?.band ?? null,
          lessons: stats?.lessons ?? 0,
          games: stats?.games ?? 0,
          failed: stats?.failed ?? 0,
          avgScore: stats?.scoreCount ? round(stats.scoreSum / stats.scoreCount) : null,
          levelMoves: stats?.moves ?? 0,
          lastActive: stats?.lastActive ?? null,
        };
      })
      .sort((a, b) => (b.lessons + b.games) - (a.lessons + a.games) || a.name.localeCompare(b.name));

    // Org totals. Averaged over scored activities rather than over people, so one
    // very active learner doesn't count the same as one who did a single lesson.
    const scored = events.filter((e) => typeof (e.input || {}).scorePercent === 'number');
    const lessonCount = events.filter((e) => e.type === 'lesson_complete').length;
    const gameCount = events.filter((e) => e.type === 'game_complete').length;
    const passCount = scored.filter((e) => e.input.scorePercent >= PASS_MARK).length;

    const levelSpread = {};
    for (const tier of FULL_LADDER) {
      levelSpread[tier] = rows.filter((r) => r.earned === tier).length;
    }

    return NextResponse.json({
      available: true,
      days,
      // Say so when the ceiling was hit, rather than presenting a truncated
      // window as the whole picture.
      truncated: events.length >= MAX_EVENTS,
      summary: {
        people: rows.length,
        active: rows.filter((r) => r.lessons + r.games > 0).length,
        lessons: lessonCount,
        games: gameCount,
        avgScore: scored.length ? round(scored.reduce((s, e) => s + e.input.scorePercent, 0) / scored.length) : null,
        passRate: scored.length ? round((passCount / scored.length) * 100) : null,
        movedUp: rows.filter((r) => r.moved === 'up').length,
        movedDown: rows.filter((r) => r.moved === 'down').length,
        levelSpread,
      },
      rows,
      recent: events.slice(0, 100).map((e) => ({
        id: e.id,
        at: e.created_at,
        type: e.type,
        email: e.email,
        topic: (e.input || {}).topic || (e.input || {}).game || null,
        scorePercent: (e.input || {}).scorePercent ?? null,
        passed: (e.input || {}).passed ?? null,
        from: (e.input || {}).from ?? null,
        to: (e.input || {}).to ?? null,
      })),
    });
  } catch (error) {
    console.error('GET /api/reporting/data error:', error?.message || error);
    return NextResponse.json({ available: false, reason: 'Could not read reporting data.' }, { status: 500 });
  }
}
