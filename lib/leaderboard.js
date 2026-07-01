import { list } from '@vercel/blob';
import { getLevel } from './level-curve';
import { getOrgData } from './manager-data';

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
    const fresh = `${url}${url.includes('?') ? '&' : '?'}_=${Date.now()}`;
    const res = await fetch(fresh, { cache: 'no-store' });
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

const norm = (s) => (s || '').toLowerCase().replace(/\s+/g, ' ').trim();

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

  // Seed the board from the full company roster (Snowflake/Namely org pull) so
  // EVERYONE shows up — including people who have never opened the app — sitting
  // at 0 XP until they earn some. Platform XP + avatars are left-joined on top.
  // If the roster is unavailable (transient outage) `orgData` is null and we fall
  // back to just the people who have platform data (the old behavior), rather
  // than showing an empty board.
  const { data: orgData } = await getOrgData().catch(() => ({ data: null }));

  const people = [];
  const rosterByEmail = new Map();
  const rosterByName = new Map();
  for (const dept of orgData?.departments || []) {
    for (const e of dept.employees || []) {
      const emailLower = (e.email || '').toLowerCase();
      if (emailLower && EXCLUDED.has(emailLower)) continue;
      const fullName = e.name || '';
      const person = {
        learnerId: emailLower || `name:${norm(fullName)}`,
        name: fullName || nameFromId(emailLower),
        department: dept.name || 'Unassigned',
        avatar: null,
        totalXp: 0,
        level: getLevel(0),
      };
      people.push(person);
      if (emailLower) rosterByEmail.set(emailLower, person);
      if (fullName) rosterByName.set(norm(fullName), person);
    }
  }

  // Left-join each learner's XP + avatar onto their roster row (matched by email,
  // then by name). A learner not on the roster (left the company, contractor, or
  // an email mismatch) is kept as an extra row only if they have platform data.
  const extras = [];
  await Promise.all(
    [...byUser.entries()].map(async ([learnerId, urls]) => {
      if (EXCLUDED.has(learnerId.toLowerCase())) return;
      const [xp, profileRaw] = await Promise.all([
        urls.xp ? fetchJson(urls.xp) : null,
        urls.profile ? fetchJson(urls.profile) : null,
      ]);
      const totalXp = Array.isArray(xp) ? Math.max(0, xp.reduce((s, e) => s + (e.amount || 0), 0)) : 0;
      const p = unwrapProfile(profileRaw);
      const emailLower = String(learnerId).toLowerCase();
      const name = p.display_name || nameFromId(learnerId);

      const target = rosterByEmail.get(emailLower) || rosterByName.get(norm(name));
      if (target) {
        target.totalXp = totalXp;
        target.level = getLevel(totalXp);
        if (p.avatar) target.avatar = p.avatar;
        return;
      }

      // Not on the roster — skip ghosts with nothing to show.
      if (!p.department && totalXp === 0) return;
      extras.push({
        learnerId,
        name,
        department: p.department || 'Unassigned',
        avatar: p.avatar || null,
        totalXp,
        level: getLevel(totalXp),
      });
    })
  );
  people.push(...extras);

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

  // The top 3 learners by XP wear crowns (gold/silver/bronze), in order. Only
  // people with any XP qualify — a 0-XP slot never gets a crown. `championIds`
  // is ordered so consumers can map index 0/1/2 → gold/silver/bronze.
  const championIds = people
    .filter((p) => p.totalXp > 0)
    .slice(0, 3)
    .map((p) => p.learnerId);

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

// ── Cached leaderboard ───────────────────────────────────────────────────────
// buildLeaderboard() pulls the org roster + every learner's blobs, so it's too
// slow to run on every page view (and /api/leaderboard is hit by the page, the
// home widget, the champion crown, and the admin users list). We cache the
// computed snapshot in a blob and serve it, rebuilding on read only when it's
// older than the TTL. A rebuild failure falls back to the last good snapshot.
const LEADERBOARD_CACHE_KEY = 'leaderboard/cache.json';
const LEADERBOARD_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function getStoredLeaderboard() {
  try {
    const { blobs } = await list({ prefix: LEADERBOARD_CACHE_KEY, limit: 1 });
    const blob = blobs.find((b) => b.pathname === LEADERBOARD_CACHE_KEY) || blobs[0];
    if (!blob) return null;
    const res = await fetch(`${blob.downloadUrl || blob.url}?_=${Date.now()}`, { cache: 'no-store' });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

export async function buildAndStoreLeaderboard() {
  const data = await buildLeaderboard();
  const snapshot = { ...data, generatedAt: new Date().toISOString() };
  try {
    await put(LEADERBOARD_CACHE_KEY, JSON.stringify(snapshot), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
      allowOverwrite: true,
      cacheControlMaxAge: 0,
    });
  } catch (e) {
    console.error('Failed to cache leaderboard snapshot:', e);
  }
  return snapshot;
}

// What /api/leaderboard serves: a fresh-enough cached snapshot, rebuilding it
// synchronously when it's missing or stale, and falling back to the stale copy
// if a rebuild errors out.
export async function getLeaderboard() {
  const cached = await getStoredLeaderboard();
  const fresh = cached?.generatedAt
    && (Date.now() - new Date(cached.generatedAt).getTime()) < LEADERBOARD_TTL_MS;
  if (cached && fresh) return cached;
  try {
    return await buildAndStoreLeaderboard();
  } catch (e) {
    console.error('Leaderboard rebuild failed, serving stale cache:', e);
    return cached || { people: [], departments: [], championIds: [] };
  }
}
