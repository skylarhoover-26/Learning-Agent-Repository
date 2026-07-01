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
    updated_at: new Date().toISOString(),
  };
}

function isXpType(dataType) {
  return /^lp_xp_/.test(dataType);
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
