import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { isAdmin } from '@/lib/admin';

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user?.email) {
      return NextResponse.json({ isAdmin: false });
    }
    return NextResponse.json({ isAdmin: await isAdmin(user.email) });
  } catch {
    return NextResponse.json({ isAdmin: false });
  }
}
