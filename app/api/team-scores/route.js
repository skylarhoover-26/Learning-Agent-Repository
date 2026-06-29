import { NextResponse } from 'next/server';
import { getUserData, saveUserData, listUserDataTypes } from '@/lib/blob-store';

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

  const results = await Promise.all(
    emails.map(async (email) => {
      const [scoringData, managerScores, dataTypes] = await Promise.all([
        getUserData(email, 'ai_impact_scores'),
        getUserData(email, 'manager_scores'),
        listUserDataTypes(email),
      ]);

      const lessonBlob = dataTypes.find(d => d.name.startsWith('lp_lessons_'));
      let lessonCount = 0;
      let lastLessonAt = null;
      if (lessonBlob) {
        try {
          const res = await fetch(lessonBlob.url);
          if (res.ok) {
            const lessons = await res.json();
            if (Array.isArray(lessons)) {
              lessonCount = lessons.length;
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
          const res = await fetch(xpBlob.url);
          if (res.ok) {
            const events = await res.json();
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

      let level = 'Not Started';
      let progress = 0;
      if (selfScores) {
        const values = [selfScores.personal, selfScores.team, selfScores.org, selfScores.development].filter(Boolean);
        const avg = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
        if (avg >= 4) level = 'Power User';
        else if (avg >= 3) level = 'Practitioner';
        else if (avg >= 1) level = 'Beginner';
        progress = Math.round((lessonCount / 10) * 100);
        if (progress > 100) progress = 100;
      }

      let status = 'Not Started';
      if (selfScores && lessonCount > 0) {
        if (progress >= 100) status = 'Completed';
        else if (lessonCount > 0) status = 'On Track';
      } else if (selfScores) {
        status = 'On Track';
      }

      // "Last active" = most recent signal across lessons, XP, and the AI Impact
      // self-assessment — not just the assessment's updated_at (most people never
      // re-open it). ISO timestamps sort chronologically.
      const lastActive = [scoringData?.updated_at, lastLessonAt, lastXpAt]
        .filter(Boolean)
        .sort()
        .at(-1) || null;
      if (status === 'On Track' && lastActive) {
        const daysSince = (Date.now() - new Date(lastActive).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSince > 14) status = 'Needs Nudge';
      }

      return {
        email,
        selfScores,
        managerScores: mgrScores,
        level,
        progress,
        status,
        lessonCount,
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
  const totalLessons = results.reduce((s, r) => s + r.lessonCount, 0);

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
