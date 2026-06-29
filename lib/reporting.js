import { list } from '@vercel/blob';
import { getLevel } from './level-curve';
import { getOrgData } from './manager-data';
import { getAuditEntries } from './audit-log';

// Org-wide reporting rollup for admins + managers. Aggregates every learner's
// per-user blobs (XP, lessons, badges, profile) and joins them to the Snowflake
// org structure so the report can be sliced by team (department), manager, or
// person. Server-side only.

const EXCLUDED = new Set(['demo@housecallpro.com', 'local-learner', 'unknown']);

async function fetchJson(url) {
  try {
    const fresh = `${url}${url.includes('?') ? '&' : '?'}_=${Date.now()}`;
    const res = await fetch(fresh, { cache: 'no-store' });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

function unwrapProfile(raw) {
  if (raw && raw.data && typeof raw.data === 'object' && raw.data.department) return raw.data;
  return raw || {};
}

function nameFromId(id) {
  const local = String(id).split('@')[0];
  const parts = local.split(/[._-]+/).filter(Boolean);
  if (!parts.length) return id;
  return parts.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

const norm = (s) => (s || '').toLowerCase().replace(/\s+/g, ' ').trim();

// Build name/email lookups from the org structure: who's in which department/
// sub-team, and who reports to which manager.
function buildOrgIndex(org) {
  const byEmail = new Map(); // email -> { department, subTeam, title }
  const byName = new Map();  // normalized name -> same
  const managerOfName = new Map(); // normalized report name -> manager name
  if (org) {
    for (const dept of org.departments || []) {
      for (const e of dept.employees || []) {
        const info = { name: e.name || '', department: dept.name, subTeam: e.subTeam || '', title: e.title || '' };
        if (e.email) byEmail.set(e.email.toLowerCase(), info);
        if (e.name) byName.set(norm(e.name), info);
      }
    }
    for (const m of org.managers || []) {
      for (const rn of m.reportNames || []) {
        managerOfName.set(norm(rn), m.name);
      }
    }
  }
  return { byEmail, byName, managerOfName };
}

// The last `n` calendar dates (YYYY-MM-DD), oldest first, so the chart shows a
// continuous run of days even when some had no activity.
function lastNDates(n) {
  const out = [];
  const now = Date.now();
  for (let i = n - 1; i >= 0; i--) {
    out.push(new Date(now - i * 86400000).toISOString().slice(0, 10));
  }
  return out;
}

// One pass over the per-day audit blobs (last `days`) → both the engagement
// series (active users / lessons / events per day) AND a per-email "last seen"
// map. The last-seen map lets "last active" reflect ANY activity (page visits,
// chat, etc.), not just XP/lesson events — so someone who logged in but hasn't
// earned XP isn't shown as "Never".
export async function buildAuditRollup(days = 14) {
  const dates = lastNDates(days);
  const lastSeen = new Map();
  const engagement = await Promise.all(
    dates.map(async (date) => {
      const entries = await getAuditEntries({ date });
      const users = new Set();
      let lessons = 0;
      for (const e of entries) {
        const email = (e.user?.email || '').toLowerCase();
        if (email && email !== 'unknown' && !EXCLUDED.has(email)) {
          users.add(email);
          const ts = e.timestamp || '';
          if (ts && (!lastSeen.has(email) || ts > lastSeen.get(email))) lastSeen.set(email, ts);
        }
        if (e.type === 'lesson_complete') lessons += 1;
      }
      return { date, activeUsers: users.size, lessons, events: entries.length };
    })
  );
  return { engagement, lastSeen };
}

export async function buildReport() {
  let blobs = [];
  try {
    ({ blobs } = await list({ prefix: 'users/' }));
  } catch {
    return { people: [], overview: emptyOverview(), topTopics: [], teams: [], managers: [], generatedAt: new Date().toISOString() };
  }

  // learnerId -> { xp, profile, lessons, badges } blob URLs.
  const byUser = new Map();
  for (const b of blobs) {
    const m = b.pathname.match(/^users\/([^/]+)\/(.+)$/);
    if (!m) continue;
    const [, learnerId, file] = m;
    if (!byUser.has(learnerId)) byUser.set(learnerId, {});
    const slot = byUser.get(learnerId);
    if (file === 'profile.json') slot.profile = b.downloadUrl || b.url;
    else if (/^lp_xp_.*\.json$/.test(file)) slot.xp = b.downloadUrl || b.url;
    else if (/^lp_lessons_.*\.json$/.test(file)) slot.lessons = b.downloadUrl || b.url;
    else if (/^lp_badges_.*\.json$/.test(file)) slot.badges = b.downloadUrl || b.url;
  }

  const { data: orgData } = await getOrgData().catch(() => ({ data: null }));
  const org = buildOrgIndex(orgData);
  const { engagement, lastSeen } = await buildAuditRollup(14);

  const people = [];
  await Promise.all(
    [...byUser.entries()].map(async ([learnerId, urls]) => {
      if (EXCLUDED.has(learnerId.toLowerCase())) return;
      const [xp, profileRaw, lessons, badges] = await Promise.all([
        urls.xp ? fetchJson(urls.xp) : null,
        urls.profile ? fetchJson(urls.profile) : null,
        urls.lessons ? fetchJson(urls.lessons) : null,
        urls.badges ? fetchJson(urls.badges) : null,
      ]);

      const totalXp = Array.isArray(xp) ? Math.max(0, xp.reduce((s, e) => s + (e.amount || 0), 0)) : 0;
      const lastXpAt = Array.isArray(xp) ? xp.reduce((m, e) => (e.created_at > m ? e.created_at : m), '') : '';
      const lessonList = Array.isArray(lessons) ? lessons : [];
      const lessonsCompleted = lessonList.length;
      const lastLessonAt = lessonList.reduce((m, l) => {
        const t = l.completed_at || l.started_at || '';
        return t > m ? t : m;
      }, '');
      const badgesCount = Array.isArray(badges) ? badges.length : 0;
      const p = unwrapProfile(profileRaw);

      // Skip ghosts: nothing to report.
      if (!p.department && totalXp === 0 && lessonsCompleted === 0) return;

      const name = p.display_name || nameFromId(learnerId);
      const emailLower = String(learnerId).toLowerCase();
      const orgInfo = org.byEmail.get(emailLower) || org.byName.get(norm(name)) || {};
      // Manager is mapped by FULL name (the org rollup keys reports by full name),
      // so match on the org employee's full name — the learner's display name is
      // often just a first name and wouldn't match.
      const fullName = orgInfo.name || name;
      const auditLastSeen = lastSeen.get(emailLower) || '';
      const lastActive = [lastXpAt, lastLessonAt, p.updated_at, p.onboarded_at, auditLastSeen]
        .filter(Boolean).sort().at(-1) || '';

      people.push({
        learnerId,
        name,
        email: typeof learnerId === 'string' && learnerId.includes('@') ? learnerId : (p.email || ''),
        // Prefer the authoritative Snowflake/Namely org department over the
        // self-reported profile department (the latter is an onboarding pick and
        // can be wrong — e.g. a trainer who selected "Executive").
        department: orgInfo.department || p.department || 'Unassigned',
        subTeam: orgInfo.subTeam || p.sub_team || '',
        manager: org.managerOfName.get(norm(fullName)) || '',
        title: orgInfo.title || '',
        totalXp,
        level: getLevel(totalXp),
        lessonsCompleted,
        badgesCount,
        topics: lessonList.map((l) => l.topic).filter(Boolean),
        lastActive,
      });
    })
  );

  people.sort((a, b) => b.totalXp - a.totalXp || a.name.localeCompare(b.name));

  // Top topics across everyone.
  const topicCounts = new Map();
  for (const person of people) {
    for (const t of person.topics) {
      const k = t.trim();
      if (k) topicCounts.set(k, (topicCounts.get(k) || 0) + 1);
    }
  }
  const topTopics = [...topicCounts.entries()]
    .map(([topic, count]) => ({ topic, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  const teams = [...new Set(people.map((p) => p.department).filter(Boolean))].sort();
  const managers = [...new Set(people.map((p) => p.manager).filter(Boolean))].sort();

  // Strip the per-person topics array from the payload (only needed for the
  // aggregate); keep everything else.
  const slimPeople = people.map(({ topics, ...rest }) => rest); // eslint-disable-line no-unused-vars

  return {
    people: slimPeople,
    overview: computeOverview(people),
    topTopics,
    teams,
    managers,
    engagement,
    generatedAt: new Date().toISOString(),
  };
}

function computeOverview(people) {
  const now = Date.now();
  const activeThisWeek = people.filter((p) => {
    if (!p.lastActive) return false;
    return (now - new Date(p.lastActive).getTime()) / 86400000 <= 7;
  }).length;
  return {
    totalLearners: people.length,
    activeThisWeek,
    lessonsCompleted: people.reduce((s, p) => s + p.lessonsCompleted, 0),
    totalXp: people.reduce((s, p) => s + p.totalXp, 0),
  };
}

function emptyOverview() {
  return { totalLearners: 0, activeThisWeek: 0, lessonsCompleted: 0, totalXp: 0 };
}
