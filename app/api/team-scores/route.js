import { NextResponse } from 'next/server';
import { getUserData, saveUserData, listUserDataTypes } from '@/lib/blob-store';
import { getLevelsForEmails } from '@/lib/supabase-store';
import { FULL_LADDER } from '@/lib/adaptive-level';

// Days of silence before a manager should hear about it.
const IDLE_AFTER_DAYS = 7;
const NUDGE_AFTER_DAYS = 14;

// What counts toward "lessons". The ledger also collects daily quick tips and
// lessons someone finished without reaching the pass bar; neither is a lesson
// passed, and counting them made a padded number look like progress.
//
// `passed` is set on every graded lesson record. Rows old enough to predate it
// fall back to the same 70% bar the field itself encodes, so history doesn't
// silently vanish from the count.
// A lesson someone actually sat down to. Daily quick tips are not lessons.
function isLessonAttempt(l) {
  return !!l && l.format !== 'quick_tip';
}

function isPassedLesson(l) {
  if (!isLessonAttempt(l)) return false;
  if (typeof l.passed === 'boolean') return l.passed;
  return typeof l.correctness === 'number' && l.correctness >= 0.7;
}

// Days since an ISO timestamp, or null.
function daysSince(iso) {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return (Date.now() - t) / 86400000;
}

// Which way someone has moved from the level they declared at onboarding. Same
// comparison /admin/levels makes, so the two views can never disagree.
function levelDrift(declared, earned) {
  const a = FULL_LADDER.indexOf(declared);
  const b = FULL_LADDER.indexOf(earned);
  if (a < 0 || b < 0 || a === b) return 'none';
  return b > a ? 'up' : 'down';
}

export async function POST(request) {
  try {
    const { action, emails, managerEmail, memberEmail, scores } = await request.json();

    if (action === 'rate') {
      return handleRateTeamMember(managerEmail, memberEmail, scores);
    }

    return handleFetchTeamScores(emails);
  } catch (error) {
    console.error('POST /api/team-scores error:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}

async function handleFetchTeamScores(emails) {
  if (!Array.isArray(emails) || emails.length === 0) {
    return NextResponse.json({ error: 'Missing emails array' }, { status: 400 });
  }

  // The real learner level — declared at onboarding, moved by performance —
  // read once for the whole team. null means Supabase couldn't be reached.
  const levelMap = await getLevelsForEmails(emails);

  const results = await Promise.all(
    emails.map(async (email) => {
      const [scoringData, managerScores, calibrationData, dataTypes] = await Promise.all([
        getUserData(email, 'ai_impact_scores'),
        getUserData(email, 'manager_scores'),
        getUserData(email, 'calibration_profile'),
        listUserDataTypes(email),
      ]);

      const lessonBlob = dataTypes.find(d => d.name.startsWith('lp_lessons_'));
      let lessonsPassed = 0;
      let lessonsTaken = 0;
      let lastLessonAt = null;
      if (lessonBlob) {
        try {
          // Read by data-type through the store (blobs are private — a bare
          // URL fetch 401s).
          {
            const lessons = await getUserData(email, lessonBlob.name);
            if (Array.isArray(lessons)) {
              // Taken vs. passed, because "0 passed" on its own can't tell a
              // manager whether someone is failing lessons or never opening one.
              const attempts = lessons.filter(isLessonAttempt);
              lessonsTaken = attempts.length;
              lessonsPassed = attempts.filter(isPassedLesson).length;
              // Recency counts EVERY row, including tips and failed attempts —
              // those are activity even when they aren't progress.
              for (const l of lessons) {
                const t = l.completed_at || l.started_at;
                if (t && (!lastLessonAt || t > lastLessonAt)) lastLessonAt = t;
              }
            }
          }
        } catch { /* skip */ }
      }

      const xpBlob = dataTypes.find(d => d.name.startsWith('lp_xp_'));
      let totalXp = 0;
      let lastXpAt = null;
      if (xpBlob) {
        try {
          {
            const events = await getUserData(email, xpBlob.name);
            if (Array.isArray(events)) {
              // XP events store the points in `amount` (not `xp`).
              totalXp = events.reduce((sum, e) => sum + (e.amount || 0), 0);
              for (const e of events) {
                const t = e.created_at;
                if (t && (!lastXpAt || t > lastXpAt)) lastXpAt = t;
              }
            }
          }
        } catch { /* skip */ }
      }

      const selfScores = scoringData?.scores || null;
      const mgrScores = managerScores?.scores || null;

      // Level is the adaptive learner level (declared vs. earned), NOT a band
      // derived from the AI Impact scores. Those scores are a 1-5 self-rating on
      // four dimensions; bucketing their average into tier-shaped names made the
      // column look like the level system while being a different number
      // entirely — a Developer with no impact assessment read "Not Started".
      const stored = levelMap?.get(String(email).toLowerCase()) || null;
      const declared = stored?.declared || null;
      const earned = stored?.earned || declared;
      const tier = declared
        ? { declared, earned, drift: levelDrift(declared, earned) }
        : null;

      // "Last active" = most recent signal across lessons, XP, and the AI Impact
      // self-assessment — not just the assessment's updated_at (most people never
      // re-open it). ISO timestamps sort chronologically.
      const lastActive = [scoringData?.updated_at, lastLessonAt, lastXpAt]
        .filter(Boolean)
        .sort()
        .at(-1) || null;

      // Status is engagement, full stop. It used to report whether the AI Impact
      // assessment had been taken — which the AI Impact column already says — so
      // the badge repeated its neighbour and left the manager with no read on who
      // has gone quiet. "Completed" went with it: it fired at ten ledger rows and
      // read as "finished the programme".
      const idleDays = daysSince(lastActive);
      let status = 'Never';
      if (idleDays !== null) {
        if (idleDays > NUDGE_AFTER_DAYS) status = 'Needs nudge';
        else if (idleDays > IDLE_AFTER_DAYS) status = 'Idle';
        else status = 'Active';
      }

      return {
        email,
        selfScores,
        managerScores: mgrScores,
        // Per-competency detail { self, measured, why } and a trimmed dated
        // history so the manager view can show the "why" and month-over-month trend.
        detail: scoringData?.detail || null,
        history: Array.isArray(scoringData?.history)
          ? scoringData.history.slice(-6).map(h => ({ scored_at: h.scored_at, scores: h.scores }))
          : [],
        // Skill calibration insights (measured mastery + self-rating, 0-1) so the
        // manager sees the fuller picture, not just the 4 impact competencies.
        calibration: (calibrationData?.skills)
          ? { skills: calibrationData.skills, selfRating: calibrationData.selfRating || null }
          : null,
        tier,
        status,
        lessonsPassed,
        lessonsTaken,
        totalXp,
        lastActive,
      };
    })
  );

  const enrolled = results.filter(r => r.selfScores !== null);
  const activeThisWeek = results.filter(r => {
    if (!r.lastActive) return false;
    const daysSince = (Date.now() - new Date(r.lastActive).getTime()) / (1000 * 60 * 60 * 24);
    return daysSince <= 7;
  });
  const totalLessons = results.reduce((s, r) => s + r.lessonsPassed, 0);

  const levelValues = enrolled.map(r => {
    const s = r.selfScores;
    return [s.personal, s.team, s.org, s.development].filter(Boolean);
  }).flat();
  const avgLevel = levelValues.length > 0
    ? (levelValues.reduce((a, b) => a + b, 0) / levelValues.length).toFixed(1)
    : null;

  return NextResponse.json({
    members: results,
    overview: {
      activeThisWeek: activeThisWeek.length,
      totalLessons,
      avgLevel,
    },
  });
}

async function handleRateTeamMember(managerEmail, memberEmail, scores) {
  if (!managerEmail || !memberEmail || !scores) {
    return NextResponse.json({ error: 'Missing managerEmail, memberEmail, or scores' }, { status: 400 });
  }

  const payload = {
    scores: {
      personal: clampScore(scores.personal),
      team: clampScore(scores.team),
      org: clampScore(scores.org),
      development: clampScore(scores.development),
    },
    rated_by: managerEmail,
    rated_at: new Date().toISOString(),
  };

  await saveUserData(memberEmail, 'manager_scores', payload);
  return NextResponse.json({ ok: true, saved: payload });
}

function clampScore(val) {
  if (val === null || val === undefined) return null;
  const n = Number(val);
  if (isNaN(n)) return null;
  return Math.max(1, Math.min(5, Math.round(n)));
}
