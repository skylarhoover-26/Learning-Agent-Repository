import { getShareToken } from '@/lib/reporting-share';
import { buildReport } from '@/lib/reporting';

// PUBLIC, no auth — the unguessable token IS the authorization. Returns only the
// slice the token was scoped to (so a team link can't read the whole org), and
// omits engagement/top-topics so a scoped link can't leak app-wide aggregates.
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function GET(request) {
  const token = new URL(request.url).searchParams.get('token');
  const rec = await getShareToken(token);
  if (!rec) return Response.json({ error: 'This link is invalid or has expired.' }, { status: 404 });

  const f = rec.filters || {};
  const pq = (f.person || '').toLowerCase();
  const report = await buildReport();
  const people = report.people.filter((p) =>
    (!f.team || p.department === f.team) &&
    (!f.manager || p.manager === f.manager) &&
    (!pq || p.name.toLowerCase().includes(pq) || (p.email || '').toLowerCase().includes(pq))
  );

  const now = Date.now();
  const active = people.filter((p) => p.lastActive && (now - new Date(p.lastActive).getTime()) / 86400000 <= 7).length;
  const overview = {
    learners: people.length,
    active,
    lessons: people.reduce((s, p) => s + (p.lessonsCompleted || 0), 0),
    xp: people.reduce((s, p) => s + (p.totalXp || 0), 0),
    avgLevel: people.length ? people.reduce((s, p) => s + (p.level || 0), 0) / people.length : 0,
  };

  const scopeLabel = f.person ? `Person: ${f.person}`
    : f.manager ? `Manager: ${f.manager}`
    : f.team ? `Team: ${f.team}`
    : 'Everyone';

  return Response.json({ people, overview, scope: f, scopeLabel, generatedAt: report.generatedAt });
}
