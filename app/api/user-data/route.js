import { NextResponse } from 'next/server';
import { getUserData, saveUserData, deleteUserData } from '@/lib/blob-store';
import { mirrorSave, mirrorDelete, readDoc } from '@/lib/supabase-store';
import { getAuthenticatedUser } from '@/lib/auth-helpers';

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

    const { type, data } = await request.json();
    if (!type || data === undefined) {
      return NextResponse.json({ error: 'Missing type or data' }, { status: 400 });
    }

    await saveUserData(user.email, type, data);
    // Stage-2 dual-write: shadow into Supabase. Blob is authoritative; this
    // never throws (failures are logged inside mirrorSave).
    await mirrorSave(user.email, type, data);
    return NextResponse.json({ ok: true });
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
