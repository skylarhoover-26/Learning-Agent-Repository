import { getAuthenticatedUser, getIdentityEmail, oktaConfigured } from '@/lib/auth-helpers';
import { isAdmin } from '@/lib/admin';
import { isManagerEmail } from '@/lib/manager-data';
import { buildAndStoreReport, getStoredReport } from '@/lib/reporting';

// GET serves the cached snapshot (built daily by /api/reporting/refresh), so it's
// fast for everyone. POST lets an admin force a rebuild. Building reads every
// learner blob + the org webhook, so give the cold-build path room.
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

// This report exposes cross-user data, so require a REAL identity — not the
// pre-Okta "demo" default that getAuthenticatedUser falls back to when there's
// no identity cookie (that default is a seed admin, which would let an
// unauthenticated request read the whole report).
async function resolveEmail() {
  if (oktaConfigured) {
    const user = await getAuthenticatedUser();
    return user?.email || null;
  }
  return getIdentityEmail();
}

export async function GET() {
  const email = await resolveEmail();
  if (!email) return Response.json({ error: 'Sign in to view reporting.' }, { status: 401 });

  const [admin, manager] = await Promise.all([isAdmin(email), isManagerEmail(email)]);
  if (!admin && !manager) {
    return Response.json({ error: 'Reporting is available to admins and managers.' }, { status: 403 });
  }

  // Serve the cached snapshot; rebuild if it's missing or was cached without the
  // org roster (older caches won't have orgLoaded set → treated as needing a
  // rebuild, which self-heals a previously poisoned/empty snapshot).
  let report = await getStoredReport();
  if (!report || !report.orgLoaded) report = await buildAndStoreReport();
  return Response.json({ ...report, viewer: { email, isAdmin: admin, isManager: manager } });
}

// Admin-only manual refresh — rebuilds the snapshot now instead of waiting for
// the daily cron. Heavy, so it's gated to admins.
export async function POST() {
  const email = await resolveEmail();
  if (!email) return Response.json({ error: 'Sign in to refresh reporting.' }, { status: 401 });
  if (!(await isAdmin(email))) {
    return Response.json({ error: 'Only admins can refresh the report.' }, { status: 403 });
  }
  const report = await buildAndStoreReport();
  return Response.json({ ok: true, generatedAt: report.generatedAt });
}
