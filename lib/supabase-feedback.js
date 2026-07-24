import { getSupabase } from '@/lib/supabase';

// Supabase mirror for in-app feedback records. Shadows the blob writes in
// feedback-store.js so the `feedback` table stays in sync while blob remains a
// fallback safety net (same posture as lib/supabase-store.js for profiles/XP).
//
// EVERY Supabase failure is caught and logged only — it must NEVER throw into a
// request path, or a Supabase hiccup would break an admin action (triage, note)
// that the blob write already handled fine.
//
// `raw` is the lossless source of truth on read-back — the flat columns exist
// only for cross-record querying/sorting in the admin views.

// Map a feedback record (see feedback-store.js / app/api/feedback/route.js) onto
// the `feedback` table's columns, keeping the full object under `raw`.
function feedbackRow(record) {
  const r = record || {};
  return {
    id: r.id,
    email: r.email ?? null,
    name: r.name ?? null,
    category: r.category ?? null,
    text: r.text ?? null,
    page: r.page ?? null,
    status: r.status ?? null,
    priority: r.priority ?? null,
    feature: r.feature ?? null,
    done_by: r.doneBy ?? null,
    done_at: r.doneAt ?? null,
    screenshot_urls: Array.isArray(r.screenshotUrls) ? r.screenshotUrls : [],
    notes: Array.isArray(r.notes) ? r.notes : [],
    raw: r,
    created_at: r.at ?? null,
    updated_at: new Date().toISOString(),
  };
}

// Upsert one feedback record. Keyed on id, so re-saves (triage edits, note
// appends) overwrite in place and re-syncs never duplicate.
export async function sbSaveFeedback(record) {
  const supabase = getSupabase();
  if (!supabase || !record?.id) return;
  try {
    const { error } = await supabase
      .from('feedback')
      .upsert(feedbackRow(record), { onConflict: 'id' });
    if (error) throw error;
  } catch (err) {
    console.error('Supabase feedback save failed:', err?.message || err);
  }
}

// Read one record back by id (verbatim `raw`), or null when Supabase is off,
// the row is absent, or on error — the caller then falls back to blob.
export async function sbReadFeedback(id) {
  const supabase = getSupabase();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('feedback')
      .select('raw')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data?.raw ?? null;
  } catch (err) {
    console.error('Supabase feedback read failed:', err?.message || err);
    return null;
  }
}

// All feedback records (verbatim `raw`), newest first. Returns null — NOT [] —
// when Supabase is unconfigured OR holds zero rows, so the caller treats it as
// "not the source yet" and falls back to blob. Once the backfill has run, this
// returns the real set and blob is no longer consulted on read.
export async function sbListFeedback() {
  const supabase = getSupabase();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('feedback')
      .select('raw')
      .order('created_at', { ascending: false })
      .limit(10000);
    if (error) throw error;
    if (!data || data.length === 0) return null; // empty → fall back to blob
    return data.map((row) => row.raw).filter(Boolean);
  } catch (err) {
    console.error('Supabase feedback list failed:', err?.message || err);
    return null;
  }
}

// Delete records by id (used when the tester-import reconcile prunes stale
// `imported-*` rows). Accepts a single id or an array.
export async function sbDeleteFeedback(ids) {
  const supabase = getSupabase();
  if (!supabase) return;
  const list = Array.isArray(ids) ? ids : [ids];
  if (list.length === 0) return;
  try {
    const { error } = await supabase.from('feedback').delete().in('id', list);
    if (error) throw error;
  } catch (err) {
    console.error('Supabase feedback delete failed:', err?.message || err);
  }
}
