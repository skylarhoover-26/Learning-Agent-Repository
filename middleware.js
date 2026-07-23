import { auth } from '@/auth';

const oktaConfigured = !!(process.env.AUTH_OKTA_ID && process.env.AUTH_OKTA_SECRET && process.env.AUTH_OKTA_ISSUER);

export default auth((req) => {
  if (!oktaConfigured) return;

  const { pathname } = req.nextUrl;

  if (pathname.startsWith('/auth')) return;

  if (!req.auth) {
    const signInUrl = new URL('/auth/signin', req.url);
    signInUrl.searchParams.set('callbackUrl', req.url);
    return Response.redirect(signInUrl);
  }
});

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|icon\\.png|api/auth|api/slack|api/cron|api/manager-data|api/manager-lookup|api/curriculum|api/daily-digest|api/lesson/grade|api/lesson/tones|api/scoring).*)',
  ],
};
