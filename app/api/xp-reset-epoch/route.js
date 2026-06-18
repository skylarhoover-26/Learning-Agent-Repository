import { NextResponse } from 'next/server';
import { list } from '@vercel/blob';

// Public: the latest XP-reset timestamp. Clients compare it to what they've
// already applied and clear their local progress when a newer reset exists.
export async function GET() {
  try {
    const { blobs } = await list({ prefix: 'config/xp-reset.json', limit: 1 });
    if (!blobs.length) return NextResponse.json({ resetAt: 0 });
    const base = blobs[0].downloadUrl;
    const url = `${base}${base.includes('?') ? '&' : '?'}_=${Date.now()}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return NextResponse.json({ resetAt: 0 });
    const data = await res.json();
    return NextResponse.json({ resetAt: Number(data?.resetAt) || 0 });
  } catch {
    return NextResponse.json({ resetAt: 0 });
  }
}
