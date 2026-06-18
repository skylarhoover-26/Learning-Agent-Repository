import { list } from '@vercel/blob';
import { getLevel } from './level-curve';

// Build the cross-user leaderboard by aggregating per-user blobs
// (users/{learnerId}/xp.json + profile.json). Runs server-side only.
//
// Crown rule: exactly ONE crown exists — the single #1 learner by total XP
// across everyone. When someone passes the holder, the crown moves automatically
// the next time the leaderboard is computed; there's no stored "crown owner", so
// it can never get stale. Departments still show a top performer for context,
// but only the overall #1 wears the crown.

async function fetchJson(url) {
  try {
    const res = await fetch(url);
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

// Profiles are normally stored flat, but tolerate a { data: {...} } wrapper.
function unwrapProfile(raw) {
  if (raw && raw.data && typeof raw.data === 'object' && raw.data.department) return raw.data;
  return raw || {};
}

export async function buildLeaderboard() {
  let blobs = [];
  try {
    ({ blobs } = await list({ prefix: 'users/' }));
  } catch {
    return { people: [], departments: [], championIds: [] };
  }

  // Map learnerId -> { xp: url, profile: url }
  const byUser = new Map();
  for (const b of blobs) {
    const m = b.pathname.match(/^users\/(.+)\/(xp|profile)\.json$/);
    if (!m) continue;
    const [, learnerId, type] = m;
    if (!byUser.has(learnerId)) byUser.set(learnerId, {});
    byUser.get(learnerId)[type] = b.downloadUrl || b.url;
  }

  const people = [];
  await Promise.all(
    [...byUser.entries()].map(async ([learnerId, urls]) => {
      const [xp, profileRaw] = await Promise.all([
        urls.xp ? fetchJson(urls.xp) : null,
        urls.profile ? fetchJson(urls.profile) : null,
      ]);
      const totalXp = Array.isArray(xp) ? xp.reduce((s, e) => s + (e.amount || 0), 0) : 0;
      const p = unwrapProfile(profileRaw);
      // Skip ghosts: no profile and no XP.
      if (!p.department && totalXp === 0) return;
      people.push({
        learnerId,
        name: p.display_name || learnerId,
        department: p.department || 'Unassigned',
        avatar: p.avatar || null,
        totalXp,
        level: getLevel(totalXp),
      });
    })
  );

  people.sort((a, b) => b.totalXp - a.totalXp);

  // Aggregate per department + find each department's champion.
  const deptMap = new Map();
  for (const person of people) {
    const d = person.department;
    if (!deptMap.has(d)) deptMap.set(d, { name: d, learners: 0, totalXp: 0, levelSum: 0, top: null });
    const dd = deptMap.get(d);
    dd.learners += 1;
    dd.totalXp += person.totalXp;
    dd.levelSum += person.level;
    if (!dd.top || person.totalXp > dd.top.totalXp) dd.top = person;
  }

  // Exactly one crown: the overall #1 (people is sorted desc by XP).
  const championIds = people[0] && people[0].totalXp > 0 ? [people[0].learnerId] : [];

  const departments = [...deptMap.values()]
    .map((d) => ({
      name: d.name,
      learners: d.learners,
      totalXp: d.totalXp,
      avgLevel: d.learners ? d.levelSum / d.learners : 0,
      topPerformer: d.top?.name || '—',
    }))
    .sort((a, b) => b.totalXp - a.totalXp)
    .map((d, i) => ({ ...d, rank: i + 1 }));

  return { people, departments, championIds };
}
