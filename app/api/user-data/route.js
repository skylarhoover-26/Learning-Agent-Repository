import { NextResponse } from 'next/server';
import { getUserData, saveUserData, deleteUserData } from '@/lib/blob-store';
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

    const data = await getUserData(user.email, dataType);
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
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('DELETE /api/user-data error:', error);
    return NextResponse.json({ error: 'Failed to delete data' }, { status: 500 });
  }
}
