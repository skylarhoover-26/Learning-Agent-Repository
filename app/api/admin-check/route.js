import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/profile';
import { isAdminEmail } from '@/lib/admin';

export async function GET() {
  try {
    const profile = await getProfile();
    if (!profile?.email) {
      return NextResponse.json({ isAdmin: false });
    }
    return NextResponse.json({ isAdmin: isAdminEmail(profile.email) });
  } catch {
    return NextResponse.json({ isAdmin: false });
  }
}
