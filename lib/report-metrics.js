import { activityFromByType } from './activity-labels';

// Pure, client-safe helpers for slicing the report by a group of people (a team,
// a manager's org, or a single person) over a date-ranged slice of engagement.
// Used by both the single-view activity chart and the compare panel.

// Email/id identifiers for a set of people, for intersecting with engagement.
export function emailSetFor(people) {
  const s = new Set();
  for (const p of people) {
    if (p.email) s.add(p.email.toLowerCase());
    if (typeof p.learnerId === 'string') s.add(p.learnerId.toLowerCase());
  }
  return s;
}

// Members of a group within the full roster.
export function groupPeople(people, dimension, value) {
  if (dimension === 'team') return people.filter((p) => p.department === value);
  if (dimension === 'manager') return people.filter((p) => p.manager === value);
  if (dimension === 'person') return people.filter((p) => p.name === value);
  return [];
}

// Labeled "what they're doing" breakdown for a set of emails across range days.
export function activityForEmails(rangeEngagement, emailSet) {
  const byType = {};
  for (const d of rangeEngagement) {
    const tbe = d.typeByEmail || {};
    for (const [em, types] of Object.entries(tbe)) {
      if (!emailSet.has(em)) continue;
      for (const [t, c] of Object.entries(types)) byType[t] = (byType[t] || 0) + c;
    }
  }
  return activityFromByType(byType);
}

// Active-users-per-day for a set of emails (engagement trend line).
export function trendForEmails(rangeEngagement, emailSet) {
  return rangeEngagement.map((d) => ({
    date: d.date,
    activeUsers: (d.active || []).filter((a) => emailSet.has((a.email || '').toLowerCase())).length,
  }));
}

// Most-taken topics across a set of people.
export function topTopicsFor(people, limit = 6) {
  const counts = new Map();
  for (const p of people) {
    for (const t of (p.topics || [])) {
      const k = (t || '').trim();
      if (k) counts.set(k, (counts.get(k) || 0) + 1);
    }
  }
  return [...counts.entries()].map(([topic, count]) => ({ topic, count }))
    .sort((a, b) => b.count - a.count).slice(0, limit);
}

// Everything the compare panel needs for one group, over the date range.
export function metricsForGroup(people, rangeEngagement) {
  const set = emailSetFor(people);
  const activeEmails = new Set();
  for (const d of rangeEngagement) {
    for (const a of (d.active || [])) {
      const em = (a.email || '').toLowerCase();
      if (set.has(em)) activeEmails.add(em);
    }
  }
  const lessons = rangeEngagement.reduce((s, d) => {
    const lbe = d.lessonsByEmail || {};
    return s + Object.entries(lbe).reduce((ss, [em, n]) => ss + (set.has(em) ? n : 0), 0);
  }, 0);
  const registered = people.filter((p) => p.registered);
  return {
    employees: people.length,
    registered: registered.length,
    registeredPct: people.length ? Math.round((registered.length / people.length) * 100) : 0,
    active: activeEmails.size,
    activePct: people.length ? Math.round((activeEmails.size / people.length) * 100) : 0,
    lessons,
    xp: people.reduce((s, p) => s + (p.totalXp || 0), 0),
    avgLevel: registered.length ? registered.reduce((s, p) => s + (p.level || 0), 0) / registered.length : 0,
    activity: activityForEmails(rangeEngagement, set),
    topics: topTopicsFor(people),
    trend: trendForEmails(rangeEngagement, set),
  };
}
