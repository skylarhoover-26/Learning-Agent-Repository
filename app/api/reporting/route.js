import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { isAdmin } from '@/lib/admin';
import { getOrgData } from '@/lib/manager-data';
import { buildReport } from '@/lib/reporting';

// Reads every learner's blobs + the org webhook, so it can run long; give it room
// and never cache (the numbers change as people learn).
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

// A manager is anyone who appears as a manager in the Snowflake org rollup.
async function isManager(email) {
  if (!email) return false;
  try {
    const { data } = await getOrgData();
    if (!data?.managers) return false;
    const e = email.toLowerCase();
    return data.managers.some((m) => (m.email || '').toLowerCase() === e);
  } catch {
    return false;
  }
}

export async function GET() {
  const user = await getAuthenticatedUser();
  const email = user?.email;
  if (!email) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const [admin, manager] = await Promise.all([isAdmin(email), isManager(email)]);
  if (!admin && !manager) {
    return Response.json({ error: 'Reporting is available to admins and managers.' }, { status: 403 });
  }

  const report = await buildReport();
  return Response.json({ ...report, viewer: { email, isAdmin: admin, isManager: manager } });
}
