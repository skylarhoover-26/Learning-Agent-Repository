import { NextResponse } from 'next/server';
import { readJsonBlob } from '@/lib/blob-json';

// Public: the latest XP-reset timestamp. Clients compare it to what they've
// already applied and clear their local progress when a newer reset exists.
export async function GET() {
  try {
    const data = await readJsonBlob('config/xp-reset.json', { fresh: true });
    return NextResponse.json({ resetAt: Number(data?.resetAt) || 0 });
  } catch {
    return NextResponse.json({ resetAt: 0 });
  }
}
