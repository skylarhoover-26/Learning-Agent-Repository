import { list } from '@vercel/blob';
import { getLevel } from './level-curve';

// Build the cross-user leaderboard by aggregating per-user blobs
// (users/{learnerId}/xp.json + profile.json). Runs server-side only.
//
// Crown rule: the top individual by total XP *within each department* is that
// department's champion. When someone passes the current holder, the crown
// moves automatically the next time the leaderboard is computed — there's no
// stored "crown owner", it's always derived from live XP, so it can't get stale.

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

  const championIds = [];
  for (const dd of deptMap.values()) {
    if (dd.top && dd.top.totalXp > 0) championIds.push(dd.top.learnerId);
  }

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
