import { NextResponse } from 'next/server';
import { getAuthenticatedUser, getIdentityEmail, oktaConfigured } from '@/lib/auth-helpers';
import { canViewReporting } from '@/lib/reporting-access';
import { getSupabase } from '@/lib/supabase';
import { readCachedData } from '@/lib/manager-data';
import { FULL_LADDER } from '@/lib/adaptive-level';

// Program health, read from Supabase.
//
// This answers "is the org actually using this, and is that going up or down" —
// adoption first, then what people are doing and how they score. It is NOT the
// manager's team view (/manager) or the roster snapshot (/reporting); those
// answer different questions from different sources and all three coexist.
//
// The aggregation happens in Postgres (reporting_activity_rollup /
// reporting_weekly_active). Counting distinct active people in JS would mean
// pulling every event — page views included — into the server just to count
// unique emails.
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const WEEKS = 8;

async function resolveEmail() {
  // Require a REAL identity, never the pre-Okta "demo" default — that default is
  // a seed admin and would hand cross-user data to an unauthenticated request.
  if (oktaConfigured) {
    const user = await getAuthenticatedUser();
    return user?.email || null;
  }
  return getIdentityEmail();
}

// Headcount from the Snowflake/Namely roster, which is what makes adoption a
// PERCENTAGE rather than a bare count. Read from cache only: this is a report,
// and it must not hang on the org webhook. Null when unavailable — the page
// then shows counts without a denominator rather than inventing one.
async function getHeadcount() {
  try {
    const org = await readCachedData();
    const depts = org?.departments || [];
    if (!depts.length) return null;
    const byDept = {};
    let total = 0;
    for (const d of depts) {
      const n = (d.employees || []).length;
      byDept[d.name] = n;
      total += n;
    }
    return { total, byDept };
  } catch {
    return null;
  }
}

function pct(n, d) {
  if (!d) return null;
  return Math.round((n / d) * 100);
}

export async function GET(request) {
  const email = await resolveEmail();
  if (!email) return NextResponse.json({ error: 'Sign in to view reporting.' }, { status: 401 });
  if (!(await canViewReporting(email))) {
    return NextResponse.json({ error: 'You do not have access to reporting.' }, { status: 403 });
  }

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ available: false, reason: 'Supabase is not configured.' });

  const { searchParams } = new URL(request.url);
  const days = Math.max(0, Math.min(365, Number(searchParams.get('days') ?? 30) || 0));

  try {
    const [profilesRes, levelsRes, rollupRes, weeklyRes, headcount] = await Promise.all([
      supabase.from('profiles').select('email, display_name, name, department, tier, onboarded').limit(10000),
      supabase.from('learner_levels').select('email, earned_tier, score, band, last_change').limit(10000),
      supabase.rpc('reporting_activity_rollup', { p_days: days }),
      supabase.rpc('reporting_weekly_active', { p_weeks: WEEKS }),
      getHeadcount(),
    ]);

    for (const res of [profilesRes, levelsRes, rollupRes, weeklyRes]) {
      if (res.error) throw res.error;
    }

    const profiles = (profilesRes.data || []).filter((p) => p.email);
    const levels = new Map((levelsRes.data || []).map((r) => [String(r.email).toLowerCase(), r]));
    const rollup = new Map((rollupRes.data || []).map((r) => [String(r.email).toLowerCase(), r]));

    // Per-person rows. Kept for the People tab — leadership sees departments, the
    // enablement side still needs to see who to go and help.
    const rows = profiles.map((p) => {
      const key = String(p.email).toLowerCase();
      const a = rollup.get(key);
      const level = levels.get(key) || null;
      const declared = p.tier || null;
      const earned = level?.earned_tier || declared;
      return {
        email: p.email,
        name: p.display_name || p.name || p.email,
        department: p.department || 'Unassigned',
        declared,
        earned,
        moved: declared && earned && declared !== earned
          ? (FULL_LADDER.indexOf(earned) > FULL_LADDER.indexOf(declared) ? 'up' : 'down')
          : 'none',
        lessons: Number(a?.lessons || 0),
        games: Number(a?.games || 0),
        failures: Number(a?.failures || 0),
        avgScore: a?.avg_score === null || a?.avg_score === undefined ? null : Number(a.avg_score),
        lastActive: a?.last_active || null,
        active: Number(a?.events || 0) > 0,
      };
    }).sort((a, b) => (b.lessons + b.games) - (a.lessons + a.games) || a.name.localeCompare(b.name));

    // Department adoption — the headline table.
    const deptMap = new Map();
    for (const r of rows) {
      if (!deptMap.has(r.department)) {
        deptMap.set(r.department, { department: r.department, onboarded: 0, active: 0, lessons: 0, games: 0, scoreSum: 0, scoreCount: 0 });
      }
      const d = deptMap.get(r.department);
      d.onboarded += 1;
      if (r.active) d.active += 1;
      d.lessons += r.lessons;
      d.games += r.games;
      if (r.avgScore !== null) { d.scoreSum += r.avgScore; d.scoreCount += 1; }
    }
    const departments = [...deptMap.values()].map((d) => {
      // Denominator is headcount where we have it, so a department where only
      // three of forty people ever signed in reads as 7% rather than 100%.
      const headcountFor = headcount?.byDept?.[d.department] ?? null;
      return {
        department: d.department,
        headcount: headcountFor,
        onboarded: d.onboarded,
        active: d.active,
        activePct: pct(d.active, headcountFor ?? d.onboarded),
        lessons: d.lessons,
        games: d.games,
        avgScore: d.scoreCount ? Math.round(d.scoreSum / d.scoreCount) : null,
      };
    }).sort((a, b) => (b.activePct ?? -1) - (a.activePct ?? -1) || a.department.localeCompare(b.department));

    const weekly = (weeklyRes.data || []).map((w) => ({
      weekStart: w.week_start,
      people: Number(w.active_people || 0),
      lessons: Number(w.lessons || 0),
      games: Number(w.games || 0),
    }));

    // Trend: the most recent complete-ish week against the one before it. Stated
    // as a count difference too, because a percentage off a tiny base is noise.
    const last = weekly[weekly.length - 1]?.people ?? 0;
    const prev = weekly[weekly.length - 2]?.people ?? 0;

    const activeCount = rows.filter((r) => r.active).length;
    const onboardedCount = profiles.filter((p) => p.onboarded !== false).length;
    const scored = rows.filter((r) => r.avgScore !== null);

    const levelSpread = {};
    for (const tier of FULL_LADDER) levelSpread[tier] = rows.filter((r) => r.earned === tier).length;

    return NextResponse.json({
      available: true,
      days,
      headcountKnown: !!headcount,
      summary: {
        headcount: headcount?.total ?? null,
        onboarded: onboardedCount,
        onboardedPct: pct(onboardedCount, headcount?.total),
        active: activeCount,
        activePct: pct(activeCount, headcount?.total ?? onboardedCount),
        neverActive: onboardedCount - activeCount,
        lessons: rows.reduce((s, r) => s + r.lessons, 0),
        games: rows.reduce((s, r) => s + r.games, 0),
        avgScore: scored.length ? Math.round(scored.reduce((s, r) => s + r.avgScore, 0) / scored.length) : null,
        movedUp: rows.filter((r) => r.moved === 'up').length,
        movedDown: rows.filter((r) => r.moved === 'down').length,
        levelSpread,
        trend: { last, prev, delta: last - prev },
      },
      weekly,
      departments,
      rows,
    });
  } catch (error) {
    console.error('GET /api/reporting/data error:', error?.message || error);
    return NextResponse.json({
      available: false,
      // The rollups are functions, not tables — a fresh database has the tables
      // but not these until the schema is re-run. Say so instead of "unknown error".
      reason: 'Could not read reporting data. If the rollup functions are missing, re-run docs/supabase-schema.sql.',
    }, { status: 500 });
  }
}
