import { getSupabase } from '@/lib/supabase';

// Stage-2 dual-write mirror. These functions shadow every blob write into
// Supabase so the two stores stay in sync while blob remains authoritative.
// EVERY Supabase failure is caught and logged only — it must NEVER throw into
// the request path, or a Supabase hiccup would break a user action that the
// blob write already handled fine.

// Profile blobs are sometimes wrapped as { data: {...} } and sometimes bare.
// Flatten either shape into columns for the `profiles` table.
function profileRow(email, payload) {
  const p = payload && payload.data && typeof payload.data === 'object' ? payload.data : (payload || {});
  return {
    email,
    learner_id: p.id ?? null,
    display_name: p.display_name ?? null,
    name: p.name ?? null,
    department: p.department ?? null,
    sub_team: p.sub_team ?? null,
    tier: p.tier ?? null,
    avatar: p.avatar ?? null,
    title: p.title ?? null,
    manager: p.manager ?? null,
    hire_date: p.hire_date ?? null,
    onboarded: !!p.onboarded,
    // Support both the newer multi- and legacy single-value fields.
    goals: p.goals ?? (p.goal ? [p.goal] : []),
    preferred_tools: p.preferred_tools ?? (p.preferred_tool ? [p.preferred_tool] : []),
    role_history: p.role_history ?? [],
    scheduled_role_change: p.scheduled_role_change ?? null,
    role_changed_at: p.role_changed_at ?? null,
    // Full profile object, stored verbatim so reads are lossless (columns above
    // exist for cross-user querying; `raw` is the source of truth on read-back).
    raw: p,
    updated_at: new Date().toISOString(),
  };
}

function isXpType(dataType) {
  return /^lp_xp_/.test(dataType);
}

// Read a single doc back from Supabase, reconstructing the exact shape the
// client stored. Returns null when Supabase isn't configured, the record is
// absent, or on error — the caller then falls back to the blob store.
//   'profile'    ← profiles.raw (full object, lossless)
//   'lp_xp_<id>' ← xp_events rows → the event array
//   else         ← user_documents.data (jsonb, verbatim)
export async function readDoc(email, dataType) {
  const supabase = getSupabase();
  if (!supabase) return null;
  try {
    if (dataType === 'profile') {
      const { data, error } = await supabase
        .from('profiles')
        .select('raw')
        .eq('email', email)
        .maybeSingle();
      if (error) throw error;
      return data?.raw ?? null;
    }

    if (isXpType(dataType)) {
      const { data, error } = await supabase
        .from('xp_events')
        .select('id, source, amount, created_at, meta')
        .eq('email', email)
        .order('created_at', { ascending: true });
      if (error) throw error;
      if (!data || data.length === 0) return null; // absent → fall back to blob
      return data.map((e) => ({
        id: e.id,
        source: e.source,
        amount: e.amount,
        created_at: e.created_at,
        meta: e.meta ?? {},
      }));
    }

    const { data, error } = await supabase
      .from('user_documents')
      .select('data')
      .eq('email', email)
      .eq('doc_type', dataType)
      .maybeSingle();
    if (error) throw error;
    return data?.data ?? null;
  } catch (err) {
    console.error(`Supabase read failed (${dataType}):`, err?.message || err);
    return null;
  }
}

// Cross-user XP totals for the leaderboard, via a Postgres function that sums
// xp_events per email server-side (one round-trip, scales past the 1000-row
// select cap). Returns a Map(email → totalXp), or null if unavailable.
export async function getLeaderboardTotals() {
  const supabase = getSupabase();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.rpc('leaderboard_totals');
    if (error) throw error;
    const map = new Map();
    for (const row of data || []) {
      map.set(String(row.email).toLowerCase(), Number(row.total_xp) || 0);
    }
    return map;
  } catch (err) {
    console.error('Supabase leaderboard_totals failed:', err?.message || err);
    return null;
  }
}

// All profiles' display metadata (name/avatar) for the leaderboard join.
// Returns a Map(email → { display_name, avatar }), or null on failure.
export async function getProfileMetaMap() {
  const supabase = getSupabase();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('email, display_name, avatar')
      .limit(10000);
    if (error) throw error;
    const map = new Map();
    for (const row of data || []) {
      map.set(String(row.email).toLowerCase(), { display_name: row.display_name, avatar: row.avatar });
    }
    return map;
  } catch (err) {
    console.error('Supabase getProfileMetaMap failed:', err?.message || err);
    return null;
  }
}

// Mirror a save into Supabase. dataType routes to the right table:
//   'profile'    -> profiles (relational)
//   'lp_xp_<id>' -> xp_events rows (append-only ledger)
//   everything else -> user_documents (jsonb, shape unchanged)
export async function mirrorSave(email, dataType, data) {
  const supabase = getSupabase();
  if (!supabase) return; // dormant until configured — no-op

  try {
    if (dataType === 'profile') {
      const { error } = await supabase
        .from('profiles')
        .upsert(profileRow(email, data), { onConflict: 'email' });
      if (error) throw error;
      return;
    }

    if (isXpType(dataType)) {
      // xp_events.email is a FK to profiles — make sure a row exists first, but
      // don't clobber an existing full profile (ignoreDuplicates).
      await supabase
        .from('profiles')
        .upsert({ email }, { onConflict: 'email', ignoreDuplicates: true });

      const events = Array.isArray(data) ? data : [];
      const rows = events
        .filter((e) => e && e.id)
        .map((e) => ({
          id: e.id,
          email,
          source: e.source ?? 'unknown',
          amount: Math.floor(Number(e.amount) || 0), // keep raw (may be negative for corrections)
          created_at: e.created_at ?? new Date().toISOString(),
          meta: e.meta ?? {},
        }));
      if (rows.length) {
        // Ledger is append-only; id is the client-generated PK, so existing
        // rows are skipped and re-syncs never duplicate.
        const { error } = await supabase
          .from('xp_events')
          .upsert(rows, { onConflict: 'id', ignoreDuplicates: true });
        if (error) throw error;
      }
      return;
    }

    // Long tail: store the document verbatim.
    const { error } = await supabase
      .from('user_documents')
      .upsert({ email, doc_type: dataType, data, updated_at: new Date().toISOString() }, { onConflict: 'email,doc_type' });
    if (error) throw error;
  } catch (err) {
    console.error(`Supabase mirror save failed (${dataType}):`, err?.message || err);
  }
}

// Mirror the admin "reset all progress" action: clear the XP ledger and the
// badges/lessons documents for everyone, matching what reset-xp does to blob.
// Destructive + admin-triggered only. Never throws.
export async function mirrorResetAllProgress() {
  const supabase = getSupabase();
  if (!supabase) return;
  try {
    // Delete every xp_events row. .neq on the PK matches all rows (Supabase
    // requires a filter on delete).
    await supabase.from('xp_events').delete().neq('id', '');
    // Clear badges + lesson-history documents. Inside .or(), PostgREST's like
    // wildcard is `*` (not SQL `%`).
    await supabase.from('user_documents').delete().or('doc_type.like.lp_badges_*,doc_type.like.lp_lessons_*');
  } catch (err) {
    console.error('Supabase mirror reset failed:', err?.message || err);
  }
}

// Full wipe: clear all per-user Supabase data for a fresh start. Deletes
// xp_events (FK child) first, then profiles, plus every user_documents row.
// Preserves system_documents (admin/notify allowlists). Never throws.
export async function mirrorWipeAll() {
  const supabase = getSupabase();
  if (!supabase) return;
  try {
    // .neq on a never-matching value deletes all rows (Supabase requires a filter).
    await supabase.from('xp_events').delete().neq('id', '');
    await supabase.from('user_documents').delete().neq('email', '');
    await supabase.from('profiles').delete().neq('email', '');
  } catch (err) {
    console.error('Supabase mirror wipe-all failed:', err?.message || err);
  }
}

// Mirror a delete into Supabase.
export async function mirrorDelete(email, dataType) {
  const supabase = getSupabase();
  if (!supabase) return;

  try {
    if (dataType === 'profile') {
      const { error } = await supabase.from('profiles').delete().eq('email', email);
      if (error) throw error;
    } else if (isXpType(dataType)) {
      const { error } = await supabase.from('xp_events').delete().eq('email', email);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('user_documents')
        .delete()
        .eq('email', email)
        .eq('doc_type', dataType);
      if (error) throw error;
    }
  } catch (err) {
    console.error(`Supabase mirror delete failed (${dataType}):`, err?.message || err);
  }
}
