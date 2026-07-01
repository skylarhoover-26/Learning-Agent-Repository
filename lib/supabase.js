import { createClient } from '@supabase/supabase-js';

// Server-only Supabase client. Talks to Postgres with the service_role key, so
// this module must NEVER be imported into client components — the key would leak.
// All access goes through server-side API routes that have already authenticated
// the user via Okta and scoped the query by email.
//
// Dormant-safe: mirrors the `oktaConfigured` pattern in auth-helpers.js. Until the
// env vars are set in Vercel, `supabaseConfigured` is false and `getSupabase()`
// returns null, so any dual-write caller no-ops instead of throwing. This lets the
// wiring ship ahead of the credentials without changing app behavior.

export const supabaseConfigured = !!(
  process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
);

let client = null;

// Returns the shared service-role client, or null when Supabase isn't configured.
// Callers must handle null (treat it as "Supabase off, fall back to blob only").
export function getSupabase() {
  if (!supabaseConfigured) return null;
  if (client) return client;
  // Strip any whitespace/newlines the key may have picked up during copy-paste.
  // Secret keys never contain whitespace, and a stray newline makes it an
  // invalid HTTP header value (throws on every request).
  const url = process.env.SUPABASE_URL.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY.replace(/\s+/g, '');
  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}
