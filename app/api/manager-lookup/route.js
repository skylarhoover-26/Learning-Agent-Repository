import { getOrgData } from '@/lib/manager-data';

// On a cold cache this triggers the n8n→Snowflake webhook fetch inline, which
// can exceed Vercel's default ~10s function limit. Give it room so the first
// lookup of the day can't get cut off mid-fetch.
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const norm = (s) => (s || '').toLowerCase().replace(/\s+/g, ' ').trim();

// Index every employee by normalized name → { name, email, title, subTeam,
// hireDate, department }. Used to enrich a manager + their direct reports, since
// the aggregated rollup only carries report *names*.
function buildEmployeeIndex(data) {
  const byName = new Map();
  for (const dept of data.departments || []) {
    for (const e of dept.employees || []) {
      const key = norm(e.name);
      if (key && !byName.has(key)) {
        byName.set(key, { ...e, department: dept.name });
      }
    }
  }
  return byName;
}

export async function POST(request) {
  let name;
  try {
    ({ name } = await request.json());
  } catch {
    return Response.json({ error: 'Invalid request.' }, { status: 400 });
  }
  if (!name || name.trim().length < 2) {
    return Response.json({ error: 'Please enter a valid name.' }, { status: 400 });
  }

  const { data } = await getOrgData();
  if (!data || !Array.isArray(data.managers)) {
    return Response.json(
      { error: 'Team data is not available yet. Open the Manager Dashboard once to load it, then try again.' },
      { status: 503 }
    );
  }

  const q = norm(name);
  const managers = data.managers;
  // Prefer an exact (normalized) match, then a substring match.
  const mgr =
    managers.find(m => norm(m.name) === q) ||
    managers.find(m => norm(m.name).includes(q));

  if (!mgr) {
    return Response.json(
      { error: 'No manager found by that name. Try their full name or a different spelling.', manager: null, directReports: [] },
      { status: 404 }
    );
  }

  const empByName = buildEmployeeIndex(data);
  const mgrEmp = empByName.get(norm(mgr.name)) || {};

  const directReports = (mgr.reportNames || []).map((rn) => {
    const e = empByName.get(norm(rn)) || {};
    return {
      name: rn,
      email: e.email || '',
      title: e.title || '',
      department: e.department || mgr.department || '',
      hireDate: e.hireDate || '',
    };
  });

  return Response.json({
    manager: {
      name: mgr.name,
      title: mgrEmp.title || '',
      department: mgr.department || mgrEmp.department || '',
      email: mgr.email || mgrEmp.email || '',
    },
    directReports,
    teamSize: directReports.length,
    source: 'cache',
  });
}
