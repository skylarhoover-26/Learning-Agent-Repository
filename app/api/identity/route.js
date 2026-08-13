import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { auth } from '@/auth';
import { oktaConfigured, IDENTITY_COOKIE, isCompanyEmail } from '@/lib/auth-helpers';

const ONE_YEAR = 60 * 60 * 24 * 365;

// Mark the identity cookie Secure everywhere it is actually served over HTTPS,
// which is every deployed environment. It was previously HttpOnly but not
// Secure (security review F-06, verify-agent observation): Production never
// exercises this path because Okta is configured there and POST below returns
// 400, but Preview has no AUTH_OKTA_ISSUER and still runs the soft login, so
// the cookie was being set without it on a real hostname.
//
// Exempting development is deliberate: `next dev` serves http://localhost.
// Browsers do treat localhost as a trustworthy origin, but not every tool in
// the chain does, and a dev-only cookie is not the thing being protected here.
const SECURE_COOKIES = process.env.NODE_ENV !== 'development';

const IDENTITY_COOKIE_OPTIONS = {
  path: '/',
  sameSite: 'lax',
  httpOnly: true,
  secure: SECURE_COOKIES,
};

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
    res.cookies.set(IDENTITY_COOKIE, clean, { ...IDENTITY_COOKIE_OPTIONS, maxAge: ONE_YEAR });
    return res;
  } catch (error) {
    console.error('POST /api/identity error:', error);
    return NextResponse.json({ error: 'Failed to set identity' }, { status: 500 });
  }
}

// Clear the identity (switch user during testing).
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  // Same attributes as the set above — a browser matches the cookie to
  // overwrite by name/path, and mismatched flags are how a "sign out" ends up
  // leaving the original cookie in place.
  res.cookies.set(IDENTITY_COOKIE, '', { ...IDENTITY_COOKIE_OPTIONS, maxAge: 0 });
  return res;
}
