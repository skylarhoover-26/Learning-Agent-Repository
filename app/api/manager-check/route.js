import { getAuthenticatedUser, getIdentityEmail, oktaConfigured } from '@/lib/auth-helpers';
import { isManagerEmail } from '@/lib/manager-data';

// Is the current viewer a people-manager (has direct reports)? Drives whether
// the sidebar shows the Manager section. Resolves the real identity the same way
// the reporting API does (Okta when configured, the soft-login cookie otherwise).
export const dynamic = 'force-dynamic';

export async function GET() {
  let email = null;
  if (oktaConfigured) {
    const user = await getAuthenticatedUser();
    email = user?.email || null;
  } else {
    email = await getIdentityEmail();
  }
  // cacheOnly: this is just menu gating — never trigger the slow Snowflake
  // refresh here (it must not delay the sidebar from rendering).
  return Response.json({ isManager: await isManagerEmail(email, { cacheOnly: true }) });
}
