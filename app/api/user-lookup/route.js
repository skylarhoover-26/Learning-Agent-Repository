import { NextResponse } from 'next/server';
import { list } from '@vercel/blob';

export async function POST(request) {
  try {
    const { email } = await request.json();
    if (!email) {
      return NextResponse.json({ error: 'Missing email' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const prefix = `users/${normalizedEmail}/`;
    const { blobs } = await list({ prefix, limit: 1 });

    if (blobs.length === 0) {
      return NextResponse.json({ found: false });
    }

    const profileBlob = blobs.find(b => b.pathname.includes('profile.json'));
    if (!profileBlob) {
      const { blobs: allBlobs } = await list({ prefix });
      if (allBlobs.length === 0) {
        return NextResponse.json({ found: false });
      }
      return NextResponse.json({ found: true, hasProfile: false });
    }

    const res = await fetch(profileBlob.url);
    if (!res.ok) {
      return NextResponse.json({ found: true, hasProfile: false });
    }

    const profile = await res.json();
    return NextResponse.json({ found: true, hasProfile: true, profile });
  } catch (error) {
    console.error('POST /api/user-lookup error:', error);
    return NextResponse.json({ error: 'Lookup failed' }, { status: 500 });
  }
}
