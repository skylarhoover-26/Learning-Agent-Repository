import { put, list, del } from '@vercel/blob';
import { classifyFeedback } from '@/lib/feedback-triage';
import {
  sbSaveFeedback,
  sbReadFeedback,
  sbListFeedback,
  sbDeleteFeedback,
  sbAppendFeedbackNote,
} from '@/lib/supabase-feedback';

// Each feedback submission is stored as its OWN blob under `feedback/` so
// concurrent submissions never race a shared list. Screenshots live under a
// separate `feedback-screenshots/` prefix (which does NOT match the `feedback/`
// list prefix, so record listing never picks up image blobs).
const RECORD_PREFIX = 'feedback/';
const SHOT_PREFIX = 'feedback-screenshots/';
const MAX_SHOT_BYTES = 5 * 1024 * 1024; // 5MB per image

// "data:image/png;base64,AAAA" -> { buffer, contentType, ext } (or null).
function parseImageDataUrl(dataUrl) {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl || '');
  if (!match) return null;
  const contentType = match[1];
  if (!contentType.startsWith('image/')) return null;
  const ext = (contentType.split('/')[1] || 'png').split('+')[0];
  return { buffer: Buffer.from(match[2], 'base64'), contentType, ext };
}

// Upload one screenshot; returns its public URL, or null if it can't be stored.
export async function uploadFeedbackScreenshot(dataUrl) {
  const parsed = parseImageDataUrl(dataUrl);
  if (!parsed) return null;
  if (parsed.buffer.length > MAX_SHOT_BYTES) return null;
  try {
    const blob = await put(`${SHOT_PREFIX}shot.${parsed.ext}`, parsed.buffer, {
      access: 'public',
      contentType: parsed.contentType,
      addRandomSuffix: true,
    });
    return blob.url;
  } catch (error) {
    console.error('Feedback screenshot upload failed:', error);
    return null;
  }
}

// Write one record to blob (the fallback store). Full-record overwrite.
async function writeFeedbackBlob(record) {
  const key = `${RECORD_PREFIX}${record.id}.json`;
  await put(key, JSON.stringify(record), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 0,
  });
}

export async function saveFeedback(record) {
  await writeFeedbackBlob(record);
  // Dual-write: mirror into Supabase (the read source). Never throws — a
  // Supabase failure leaves the authoritative blob write intact.
  await sbSaveFeedback(record);
  return record;
}

// Derive a record id from its blob pathname (`feedback/<id>.json`).
function idFromPathname(pathname) {
  return pathname.slice(RECORD_PREFIX.length).replace(/\.json$/, '');
}

// Fetch a blob's JSON (cache-busted), or null if it can't be read.
async function fetchBlobJson(blob) {
  try {
    const base = blob.downloadUrl;
    const url = `${base}${base.includes('?') ? '&' : '?'}_=${Date.now()}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// Triage fields are admin-controlled in the UI, so they're preserved across
// re-imports rather than clobbered by the file's seed values.
const TRIAGE_FIELDS = ['status', 'priority', 'feature', 'doneBy', 'doneAt'];

// Write the given imported tester records, then delete any previously-imported
// records that are no longer in the set. Scoped strictly to `imported-` ids, so
// real in-app submissions (timestamp-uuid ids) are never touched. Existing
// records keep any admin-set triage fields (status/priority). Returns how many
// were written and removed.
export async function reconcileImportedFeedback(records) {
  const { blobs } = await list({ prefix: RECORD_PREFIX });
  const blobById = new Map(blobs.map((b) => [idFromPathname(b.pathname), b]));

  for (const record of records) {
    const existingBlob = blobById.get(record.id);
    let merged = record;
    if (existingBlob) {
      const prev = await fetchBlobJson(existingBlob);
      if (prev) {
        merged = { ...record };
        for (const field of TRIAGE_FIELDS) {
          if (prev[field] != null) merged[field] = prev[field];
        }
      }
    }
    await saveFeedback(merged);
  }

  const keepIds = new Set(records.map((r) => r.id));
  const stale = blobs.filter((b) => {
    const id = idFromPathname(b.pathname);
    return id.startsWith('imported-') && !keepIds.has(id);
  });
  if (stale.length > 0) {
    await del(stale.map((b) => b.url));
    // Mirror the prune into Supabase so the read source doesn't keep orphans.
    await sbDeleteFeedback(stale.map((b) => idFromPathname(b.pathname)));
  }
  return { imported: records.length, removed: stale.length };
}

// Fetch a single record straight from blob (cache-busted), or null if missing.
async function readFeedbackFromBlob(id) {
  try {
    const key = `${RECORD_PREFIX}${id}.json`;
    const { blobs } = await list({ prefix: key });
    const match = blobs.find((b) => b.pathname === key);
    if (!match) return null;
    return await fetchBlobJson(match);
  } catch (error) {
    console.error('readFeedbackFromBlob error:', error);
    return null;
  }
}

// Fetch a single feedback record by id. Prefers Supabase (the read source);
// falls back to blob when Supabase is off, hasn't been backfilled yet, or the
// row is missing there. Read-modify-write callers (patch/append) build on this,
// so a not-yet-mirrored record is still found and then re-saved into both.
async function readFeedback(id) {
  const fromSupabase = await sbReadFeedback(id);
  if (fromSupabase) return fromSupabase;
  return readFeedbackFromBlob(id);
}

// Fill in an AI-assigned priority (+ reason, + bug verdict for Bug reports) on
// any record that doesn't have a priority yet — imported records, or ones
// submitted before this shipped. Never overrides an existing priority, since
// that's either the AI's call at submit time or an admin's manual override.
// Returns the full record set (newest first, with any backfills applied) plus
// how many were updated, so callers can both persist and render in one pass.
export async function backfillPriorities() {
  const records = await listFeedback();
  let updated = 0;
  const result = [];
  for (const record of records) {
    let rec = record;
    // Only backfill a MISSING priority here — this runs on every admin page
    // load, so it must stay a cheap no-op once the backlog is classified.
    // Feature tags are seeded by the batched "Re-run AI triage" button and on
    // new submissions, NOT here, so a load never fans out one Haiku call per
    // record and times out the route (maxDuration 60). We still opportunistically
    // adopt a feature only when we're already classifying for a missing priority.
    if (rec.priority == null && rec.category !== 'Praise') {
      const classification = await classifyFeedback(rec);
      if (classification) {
        rec = {
          ...rec,
          priority: classification.priority,
          aiReason: classification.reason,
          aiBugVerdict: classification.bugVerdict,
          priorityIsAiAssigned: true,
        };
        if (rec.feature == null && classification.feature) {
          rec.feature = classification.feature;
          rec.featureIsAiAssigned = true;
        }
        await saveFeedback(rec);
        updated += 1;
      }
    }
    result.push(rec);
  }
  result.sort((a, b) => (b.at || '').localeCompare(a.at || ''));
  return { records: result, updated };
}

const RECLASSIFY_CONCURRENCY = 8;

// Re-run AI classification on every record whose priority is still AI-assigned
// (never manually overridden by an admin via the dropdown) — used to correct
// the backlog after a triage-prompt fix, without touching any admin-set
// priority. Unlike backfillPriorities, this REPLACES an existing priority.
// Runs in small concurrent batches so a large backlog doesn't time out.
export async function reclassifyAiPriorities() {
  const records = await listFeedback();
  // Re-run anything whose priority OR feature is still AI-owned; each field is
  // only overwritten if it hasn't been manually pinned by an admin.
  const targets = records.filter((r) => r.category !== 'Praise' && (r.priorityIsAiAssigned !== false || r.featureIsAiAssigned !== false));

  let updated = 0;
  for (let i = 0; i < targets.length; i += RECLASSIFY_CONCURRENCY) {
    const batch = targets.slice(i, i + RECLASSIFY_CONCURRENCY);
    const classifications = await Promise.all(batch.map(classifyFeedback));
    await Promise.all(batch.map(async (record, j) => {
      const classification = classifications[j];
      if (!classification) return;
      const next = { ...record };
      if (record.priorityIsAiAssigned !== false) {
        next.priority = classification.priority;
        next.aiReason = classification.reason;
        next.aiBugVerdict = classification.bugVerdict;
        next.priorityIsAiAssigned = true;
      }
      if (record.featureIsAiAssigned !== false && classification.feature) {
        next.feature = classification.feature;
        next.featureIsAiAssigned = true;
      }
      await saveFeedback(next);
      updated += 1;
    }));
  }
  return { updated };
}

// Merge a partial patch into a record and re-save. Returns the updated record,
// or null if the id doesn't exist.
export async function patchFeedback(id, patch) {
  const existing = await readFeedback(id);
  if (!existing) return null;
  const updated = { ...existing, ...patch };
  await saveFeedback(updated);
  return updated;
}

// Append an admin note to a record's note thread (e.g. "needs more info from
// Skylar"). Returns the updated record, or null if the id doesn't exist.
//
// Prefers an ATOMIC DB-side append (single UPDATE) so two notes added in quick
// succession — or notes from different admins — can never overwrite each other,
// which the old read-whole-record / rewrite-whole-record path allowed. The
// authoritative Supabase result is then mirrored back to blob (fallback store).
// Falls back to the blob read-modify-write only when Supabase is off or hasn't
// mirrored this record yet (that fallback also self-heals by creating the row).
export async function appendFeedbackNote(id, note) {
  const viaSupabase = await sbAppendFeedbackNote(id, note);
  if (viaSupabase) {
    // Mirror the authoritative result into blob so the fallback store stays
    // current. Never throws into the request path.
    await writeFeedbackBlob(viaSupabase).catch((e) =>
      console.error('appendFeedbackNote blob mirror failed:', e?.message || e)
    );
    return viaSupabase;
  }
  // Supabase off, erroring, or row not mirrored yet: read-modify-write on the
  // best available copy (Supabase-first, then blob) and dual-write it back.
  const existing = await readFeedback(id);
  if (!existing) return null;
  const notes = Array.isArray(existing.notes) ? existing.notes : [];
  const updated = { ...existing, notes: [...notes, note] };
  await saveFeedback(updated);
  return updated;
}

// Recording URLs (screen recordings) arrive as client-provided strings — the
// file was uploaded directly browser→Blob, so the app only ever sees the URL.
// Accept it only if it actually points at our Blob store, never an arbitrary
// external URL a caller could inject.
export function isBlobUrl(url) {
  if (typeof url !== 'string') return false;
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && u.hostname.endsWith('.blob.vercel-storage.com');
  } catch {
    return false;
  }
}

// Append a screen-recording URL to a record's set. Recordings live under the
// `recordingUrls` field (inside `raw` — no flat column, so no schema change).
// Returns the updated record, or null if the id doesn't exist.
export async function appendFeedbackRecording(id, url) {
  const existing = await readFeedback(id);
  if (!existing) return null;
  const recs = Array.isArray(existing.recordingUrls) ? existing.recordingUrls : [];
  const updated = { ...existing, recordingUrls: [...recs, url] };
  await saveFeedback(updated);
  return updated;
}

// Append a screenshot URL to a record's existing set — lets an admin attach
// an image after the fact (e.g. after reproducing the report themselves),
// on top of whatever the original submission included. Returns the updated
// record, or null if the id doesn't exist.
export async function appendFeedbackScreenshot(id, url) {
  const existing = await readFeedback(id);
  if (!existing) return null;
  const shots = Array.isArray(existing.screenshotUrls) ? existing.screenshotUrls : [];
  const updated = { ...existing, screenshotUrls: [...shots, url] };
  await saveFeedback(updated);
  return updated;
}

// All feedback records straight from blob, newest first. Reads each fresh
// (cache-busted) so nothing shows a stale CDN copy. This is the fallback path
// and the source the one-time migration reads from.
export async function listFeedbackFromBlob() {
  try {
    const { blobs } = await list({ prefix: RECORD_PREFIX });
    const records = await Promise.all(
      blobs.map(async (b) => {
        try {
          const base = b.downloadUrl;
          const url = `${base}${base.includes('?') ? '&' : '?'}_=${Date.now()}`;
          const res = await fetch(url, { cache: 'no-store' });
          if (!res.ok) return null;
          return await res.json();
        } catch {
          return null;
        }
      })
    );
    return records
      .filter(Boolean)
      .sort((a, b) => (b.at || '').localeCompare(a.at || ''));
  } catch (error) {
    console.error('listFeedbackFromBlob error:', error);
    return [];
  }
}

// All feedback records, newest first. Prefers Supabase (the read source);
// falls back to blob when Supabase is unconfigured or hasn't been backfilled
// yet (sbListFeedback returns null on empty). Once the migration has run and
// dual-write is live, this reads exclusively from Supabase.
export async function listFeedback() {
  const fromSupabase = await sbListFeedback();
  if (fromSupabase) return fromSupabase;
  return listFeedbackFromBlob();
}

// One-time backfill: copy every existing blob record into Supabase. Must run in
// prod, where BLOB_READ_WRITE_TOKEN points at the real store. Idempotent —
// upserts by id, so re-running only refreshes rows. Returns how many were
// mirrored (and how many failed to read from blob).
export async function migrateBlobToSupabase() {
  const records = await listFeedbackFromBlob();
  let migrated = 0;
  for (const record of records) {
    if (!record?.id) continue;
    await sbSaveFeedback(record);
    migrated += 1;
  }
  return { total: records.length, migrated };
}
