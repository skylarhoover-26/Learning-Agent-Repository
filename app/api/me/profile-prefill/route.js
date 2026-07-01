import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { getOrgData } from '@/lib/manager-data';

// Auth-gated: look the CURRENT user up in the Snowflake-sourced org data (by
// their verified session email) so onboarding can pre-fill department, sub-team,
// title, manager and hire date. Only ever returns the caller's own record — it
// ignores any client input, so it can't be used to enumerate other employees.
//
// Cold cache triggers the n8n→Snowflake webhook inline, which can be slow — give
// it room and never cache the response.
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const norm = (s) => (s || '').toLowerCase().replace(/\s+/g, ' ').trim();

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user?.email) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const email = norm(user.email);
  const { data } = await getOrgData();
  if (!data || !Array.isArray(data.departments)) {
    // Org data unavailable — onboarding falls back to manual entry.
    return NextResponse.json({ found: false });
  }

  // Find the caller's employee record by email.
  let person = null;
  let personDept = null;
  for (const dept of data.departments) {
    for (const e of dept.employees || []) {
      if (norm(e.email) === email) {
        person = e;
        personDept = dept.name;
        break;
      }
    }
    if (person) break;
  }

  if (!person) {
    return NextResponse.json({ found: false });
  }

  // Best-effort manager: whichever manager's report list includes this person.
  let manager = null;
  for (const m of data.managers || []) {
    const reports = (m.reportNames || m.reports || []).map((r) => norm(typeof r === 'string' ? r : r?.name));
    if (reports.includes(norm(person.name))) {
      manager = m.name;
      break;
    }
  }

  return NextResponse.json({
    found: true,
    name: person.name || null,
    title: person.title || null,
    department: personDept || null, // raw Snowflake value; client maps to its list
    subTeam: person.subTeam || null,
    hireDate: person.hireDate || null,
    manager,
  });
}
