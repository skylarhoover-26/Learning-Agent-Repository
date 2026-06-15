import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { auth } from '@/auth';
import { oktaConfigured, IDENTITY_COOKIE, isCompanyEmail } from '@/lib/auth-helpers';

const ONE_YEAR = 60 * 60 * 24 * 365;

// Report whether a soft-login is needed and who the current identity is.
export async function GET() {
  if (oktaConfigured) {
    const session = await auth().catch(() => null);
    return NextResponse.json({ oktaConfigured: true, email: session?.user?.email || null });
  }
  const store = await cookies();
  const email = store.get(IDENTITY_COOKIE)?.value || null;
  return NextResponse.json({ oktaConfigured: false, email });
}

// Set the soft-login identity cookie (only meaningful while Okta is off).
export async function POST(request) {
  if (oktaConfigured) {
    return NextResponse.json({ error: 'Sign-in is handled by SSO' }, { status: 400 });
  }
  try {
    const { email } = await request.json();
    const clean = String(email || '').trim().toLowerCase();
    if (!isCompanyEmail(clean)) {
      return NextResponse.json({ error: 'Enter a valid @housecallpro.com email' }, { status: 400 });
    }
    const res = NextResponse.json({ ok: true, email: clean });
    res.cookies.set(IDENTITY_COOKIE, clean, {
      path: '/',
      maxAge: ONE_YEAR,
      sameSite: 'lax',
      httpOnly: true,
    });
    return res;
  } catch (error) {
    console.error('POST /api/identity error:', error);
    return NextResponse.json({ error: 'Failed to set identity' }, { status: 500 });
  }
}

// Clear the identity (switch user during testing).
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(IDENTITY_COOKIE, '', { path: '/', maxAge: 0 });
  return res;
}
