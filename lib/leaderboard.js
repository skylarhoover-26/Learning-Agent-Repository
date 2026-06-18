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

// Accounts to keep off the leaderboard entirely.
const EXCLUDED = new Set(['demo@housecallpro.com', 'local-learner', 'unknown']);

// Turn "mathew.hoover@housecallpro.com" into "Mathew Hoover" when no display
// name is set, so the leaderboard never shows raw emails.
function nameFromId(id) {
  const local = String(id).split('@')[0];
  const parts = local.split(/[._-]+/).filter(Boolean);
  if (!parts.length) return id;
  return parts.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

export async function buildLeaderboard() {
  let blobs = [];
  try {
    ({ blobs } = await list({ prefix: 'users/' }));
  } catch {
    return { people: [], departments: [], championIds: [] };
  }

  // Map learnerId -> { xp: url, profile: url }. XP is stored under the client's
  // localStorage key (lp_xp_<id>.json), not xp.json.
  const byUser = new Map();
  for (const b of blobs) {
    const m = b.pathname.match(/^users\/([^/]+)\/(.+)$/);
    if (!m) continue;
    const [, learnerId, file] = m;
    if (!byUser.has(learnerId)) byUser.set(learnerId, {});
    const slot = byUser.get(learnerId);
    if (file === 'profile.json') slot.profile = b.downloadUrl || b.url;
    else if (/^lp_xp_.*\.json$/.test(file)) slot.xp = b.downloadUrl || b.url;
  }

  const people = [];
  await Promise.all(
    [...byUser.entries()].map(async ([learnerId, urls]) => {
      if (EXCLUDED.has(learnerId.toLowerCase())) return;
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
        name: p.display_name || nameFromId(learnerId),
        department: p.department || 'Unassigned',
        avatar: p.avatar || null,
        totalXp,
        level: getLevel(totalXp),
      });
    })
  );

  // Sort by XP desc, then name asc as a stable tiebreaker so the order is the
  // same everywhere (otherwise all-equal XP gives a random order per fetch).
  people.sort((a, b) => b.totalXp - a.totalXp || a.name.localeCompare(b.name));

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
