import { list, put } from '@vercel/blob';
import { getLevel } from './level-curve';
import { getOrgData } from './manager-data';
import { getLeaderboardTotals, getProfileMetaMap } from './supabase-store';

// Build the cross-user leaderboard by aggregating per-user blobs
// (users/{learnerId}/xp.json + profile.json). Runs server-side only.
//
// Crown rule: exactly ONE crown exists — the single #1 learner by total XP
// across everyone. When someone passes the holder, the crown moves automatically
// the next time the leaderboard is computed; there's no stored "crown owner", so
// it can never get stale. Departments still show a top performer for context,
// but only the overall #1 wears the crown.

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
  // XP totals + profile metadata now come from Supabase (one aggregation query
  // + one profiles read) instead of listing and fetching every user's blobs.
  const [totals, metaMap, orgResult] = await Promise.all([
    getLeaderboardTotals(),
    getProfileMetaMap(),
    getOrgData().catch(() => ({ data: null })),
  ]);
  const totalsMap = totals || new Map();
  const meta = metaMap || new Map();
  const { data: orgData } = orgResult;

  // Seed the board from the full company roster (Snowflake/Namely org pull) so
  // EVERYONE shows up — including people who have never opened the app — sitting
  // at 0 XP until they earn some. Platform XP + avatars are left-joined on top.
  const people = [];
  const rosterByEmail = new Map();
  for (const dept of orgData?.departments || []) {
    for (const e of dept.employees || []) {
      const emailLower = (e.email || '').toLowerCase();
      if (emailLower && EXCLUDED.has(emailLower)) continue;
      const fullName = e.name || '';
      const totalXp = Math.max(0, totalsMap.get(emailLower) || 0);
      const m = meta.get(emailLower);
      const person = {
        learnerId: emailLower || `name:${norm(fullName)}`,
        name: m?.display_name || fullName || nameFromId(emailLower),
        department: dept.name || 'Unassigned',
        avatar: m?.avatar || null,
        totalXp,
        level: getLevel(totalXp),
      };
      people.push(person);
      if (emailLower) rosterByEmail.set(emailLower, person);
    }
  }

  // Anyone with platform data (XP earned or a profile) who isn't on the roster —
  // contractor, left the company, or an email mismatch — is added as an extra row.
  const offRoster = new Set([...totalsMap.keys(), ...meta.keys()]);
  for (const emailLower of offRoster) {
    if (EXCLUDED.has(emailLower) || rosterByEmail.has(emailLower)) continue;
    const totalXp = Math.max(0, totalsMap.get(emailLower) || 0);
    const m = meta.get(emailLower);
    // Skip ghosts with nothing to show.
    if (!m && totalXp === 0) continue;
    people.push({
      learnerId: emailLower,
      name: m?.display_name || nameFromId(emailLower),
      department: 'Unassigned',
      avatar: m?.avatar || null,
      totalXp,
      level: getLevel(totalXp),
    });
  }

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
const LEADERBOARD_TTL_MS = 60 * 1000; // 1 minute — keeps standings fresh after resets/new XP

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
