import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { isAdmin } from '@/lib/admin';
import { getSupabase, supabaseConfigured } from '@/lib/supabase';

// Admin-only Supabase connectivity check. Read-only: confirms the service-role
// client can reach each table and reports row counts. Used to verify Stage-1
// setup (the service_role key is Sensitive, so it can't be checked via
// `vercel env pull` — it's only available to the runtime, which is here).
export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user?.email || !(await isAdmin(user.email))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  if (!supabaseConfigured) {
    return NextResponse.json({
      configured: false,
      message: 'SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY not set in this environment.',
    });
  }

  const supabase = getSupabase();
  const tables = ['profiles', 'xp_events', 'user_documents', 'system_documents'];
  const results = {};
  let ok = true;

  for (const t of tables) {
    const { count, error } = await supabase
      .from(t)
      .select('*', { count: 'exact', head: true });
    if (error) {
      ok = false;
      // Never echo the raw error: client-config errors can embed the key value.
      // Strip anything resembling a secret key before returning.
      const safe = String(error.message || 'unknown error').replace(/sb_secret_\S+/gi, '[redacted]');
      results[t] = { reachable: false, error: safe };
    } else {
      results[t] = { reachable: true, rows: count ?? 0 };
    }
  }

  return NextResponse.json({ configured: true, ok, tables: results });
}
