import { getAuthenticatedUser, getIdentityEmail, oktaConfigured } from '@/lib/auth-helpers';
import { isAdmin } from '@/lib/admin';
import { getOrgData } from '@/lib/manager-data';
import { createShareToken } from '@/lib/reporting-share';

export const maxDuration = 30;
export const dynamic = 'force-dynamic';

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

// Mint a public, read-only share token scoped to the given filters. Admin/manager
// only, real-identity required (not the pre-Okta demo default).
export async function POST(request) {
  let email = null;
  if (oktaConfigured) {
    const user = await getAuthenticatedUser();
    email = user?.email || null;
  } else {
    email = await getIdentityEmail();
  }
  if (!email) return Response.json({ error: 'Sign in to share reporting.' }, { status: 401 });

  const [admin, manager] = await Promise.all([isAdmin(email), isManager(email)]);
  if (!admin && !manager) {
    return Response.json({ error: 'Only admins and managers can create share links.' }, { status: 403 });
  }

  let filters = {};
  try { ({ filters = {} } = await request.json()); } catch { /* no body */ }

  const rec = await createShareToken({ filters, createdBy: email });
  return Response.json({ token: rec.token, expiresAt: rec.expiresAt });
}
