import { NextResponse } from 'next/server';
import { getUserData, saveUserData, deleteUserData } from '@/lib/blob-store';
import { mirrorSave, mirrorDelete, readDoc } from '@/lib/supabase-store';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { isAppendOnlyLedger, mergeLedger } from '@/lib/ledger-merge';

// Read a stored value the same way GET does — Supabase first, blob as the
// fallback — so a merge is computed against the real union of what exists.
// Reading only the blob would re-drop anything that lives server-side.
async function readStored(email, dataType) {
  const fromSupabase = await readDoc(email, dataType);
  if (fromSupabase !== null && fromSupabase !== undefined) return fromSupabase;
  return await getUserData(email, dataType);
}

export async function GET(request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const dataType = searchParams.get('type');
    if (!dataType) {
      return NextResponse.json({ error: 'Missing type parameter' }, { status: 400 });
    }

    // Read from Supabase first; fall back to the blob store when Supabase has
    // no record (not configured, pre-migration data, or a transient miss).
    let data = await readDoc(user.email, dataType);
    if (data === null || data === undefined) {
      data = await getUserData(user.email, dataType);
    }
    // The profile blob is keyed by email and doesn't store the email as a
    // field — attach it so the client can derive a display name from it.
    if (dataType === 'profile' && data && typeof data === 'object') {
      data = data.data && typeof data.data === 'object'
        ? { ...data, data: { ...data.data, email: user.email } }
        : { ...data, email: user.email };
    }
    return NextResponse.json({ data });
  } catch (error) {
    console.error('GET /api/user-data error:', error);
    return NextResponse.json({ error: 'Failed to load data' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { type, data, mode } = await request.json();
    if (!type || data === undefined) {
      return NextResponse.json({ error: 'Missing type or data' }, { status: 400 });
    }

    // Append-only ledgers merge rather than overwrite, so a whole-array sync from
    // one device can't delete entries written by another writer (another device,
    // an admin grant, or a lesson completed in Slack). `mode: 'replace'` opts out
    // for the writes that legitimately shrink a ledger — the admin XP reset and
    // reverting a role snapshot. See lib/ledger-merge.js.
    let toStore = data;
    let merged = false;
    if (mode !== 'replace' && isAppendOnlyLedger(type) && Array.isArray(data)) {
      const stored = await readStored(user.email, type);
      toStore = mergeLedger(stored, data, type);
      merged = toStore !== data;
    }

    await saveUserData(user.email, type, toStore);
    // Stage-2 dual-write: shadow into Supabase. Blob is authoritative; this
    // never throws (failures are logged inside mirrorSave).
    // Pass the replace intent through: for the XP ledger, Supabase stores one
    // ROW per event, and writing fewer rows never deletes the others.
    await mirrorSave(user.email, type, toStore, { replace: mode === 'replace' });
    // `count` lets a caller confirm the stored ledger is at least as long as what
    // it posted; `merged` says whether anything server-side was folded in.
    return NextResponse.json({
      ok: true,
      ...(Array.isArray(toStore) ? { count: toStore.length, merged } : {}),
    });
  } catch (error) {
    console.error('POST /api/user-data error:', error);
    return NextResponse.json({ error: 'Failed to save data' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const dataType = searchParams.get('type');
    if (!dataType) {
      return NextResponse.json({ error: 'Missing type parameter' }, { status: 400 });
    }

    await deleteUserData(user.email, dataType);
    // Stage-2 dual-write: mirror the delete into Supabase (never throws).
    await mirrorDelete(user.email, dataType);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('DELETE /api/user-data error:', error);
    return NextResponse.json({ error: 'Failed to delete data' }, { status: 500 });
  }
}
