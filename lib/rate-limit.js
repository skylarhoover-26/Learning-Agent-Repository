import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { getAuthenticatedUser } from '@/lib/auth-helpers';

// Throttle for routes that cost money to run (security review F-09).
//
// F-09 asked for two things on the curriculum routes: admin auth, and rate
// limiting. Auth landed first and closed the finding's actual exploit — an
// anonymous caller looping `POST /api/curriculum/scan` to bill us for Haiku
// calls and point 13 outbound feed fetches at providers who will eventually
// ban us. This is the second half: a cap on how often an *authenticated*
// caller can do the same thing, whether maliciously or through a runaway
// client loop.
//
// Counters live in Supabase (see docs/supabase-schema.sql). Not an in-process
// Map: every serverless cold start would get its own, so a caller spreads
// across instances and the limit means nothing. Not a new Redis either — one
// Postgres round trip against a database we already run is roughly 30ms
// against LLM calls that take seconds.
//
// ── Failure behaviour, stated explicitly ────────────────────────────────────
// This FAILS OPEN. If Supabase is unreachable the request proceeds.
//
// That is the opposite of what F-04 and F-08 required, and the difference is
// deliberate: those were authorization checks, where failing open let an
// anonymous caller in. This is a cost guardrail sitting BEHIND authorization —
// every caller here has already proven they are a signed-in employee. Failing
// closed would mean a Supabase hiccup takes out every AI feature in the app to
// prevent, at worst, some extra model spend by someone we can already identify
// in the audit log. Failing open is the proportionate trade, and it is logged
// so a limiter that silently stops limiting is visible.

// Tiers, not per-route numbers, so the intent stays legible and the limits are
// tuned in one place.
export const LIMITS = {
  // The expensive fan-out routes F-09 names. The finding suggested 1/60s; kept
  // exactly, because these are admin maintenance actions nobody runs in a loop
  // on purpose. A scan is 13 outbound fetches plus model calls.
  curriculum: { limit: 1, windowSeconds: 60 },

  // Everything else that reaches a model. Set high enough that no real learning
  // session touches it — a lesson is a handful of calls and the busiest tester
  // in a day sits well under this — and low enough to stop a client stuck in a
  // retry loop from running up a bill overnight.
  ai: { limit: 60, windowSeconds: 600 },
};

// Identify the caller. Prefer the authenticated email: this app is entirely
// behind SSO, so a real identity is available, and it is both harder to rotate
// than an IP and immune to the whole office sharing one NAT address. IP is only
// the fallback for a route that somehow runs without a session.
async function callerKey(request) {
  try {
    const user = await getAuthenticatedUser();
    if (user?.email) return `u:${user.email.toLowerCase()}`;
  } catch {
    // fall through to IP
  }
  const fwd = request?.headers?.get?.('x-forwarded-for') || '';
  const ip = fwd.split(',')[0].trim();
  return ip ? `ip:${ip}` : 'anon';
}

// Returns { allowed, count, resetAt }. Never throws.
export async function checkRateLimit(bucket, tier, request) {
  const { limit, windowSeconds } = LIMITS[tier] || LIMITS.ai;
  const supabase = getSupabase();
  if (!supabase) return { allowed: true, count: 0, resetAt: null, skipped: 'no-supabase' };

  const key = `${bucket}:${await callerKey(request)}`;
  try {
    const { data, error } = await supabase.rpc('rate_limit_hit', {
      p_key: key,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) throw new Error('rate_limit_hit returned no row');
    return {
      allowed: !!row.allowed,
      count: row.current_count,
      resetAt: row.reset_at ? new Date(row.reset_at) : null,
    };
  } catch (error) {
    // Loud, because a limiter that has stopped limiting looks exactly like one
    // that is working.
    console.error(`[rate-limit] check failed for ${key}, allowing through:`, error?.message || error);
    return { allowed: true, count: 0, resetAt: null, skipped: 'error' };
  }
}

// Route guard, shaped like requireAdmin(): returns a Response to return, or
// null to carry on.
//
//   const limited = await enforceRateLimit('curriculum:scan', 'curriculum', request);
//   if (limited) return limited;
export async function enforceRateLimit(bucket, tier, request) {
  const { allowed, resetAt } = await checkRateLimit(bucket, tier, request);
  if (allowed) return null;

  const retryAfter = resetAt
    ? Math.max(1, Math.ceil((resetAt.getTime() - Date.now()) / 1000))
    : LIMITS[tier]?.windowSeconds || 60;

  return NextResponse.json(
    {
      error: 'Rate limit exceeded. Please wait a moment and try again.',
      retryAfter,
    },
    { status: 429, headers: { 'Retry-After': String(retryAfter) } }
  );
}
