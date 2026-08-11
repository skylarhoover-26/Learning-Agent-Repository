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
    // Every cron path in vercel.json must be listed here — a Vercel cron sends a
    // CRON_SECRET bearer token, never a session cookie, so anything this matcher
    // catches gets 302'd to /auth/signin and the job silently does nothing.
    // `api/reporting/refresh` and `api/model-lineup/refresh` were missing and
    // were failing exactly that way; both authenticate themselves in-route.
    //
    // NOTE: the curriculum exclusion is `api/curriculum/daily`, NOT the whole
    // `api/curriculum` prefix. Only `daily` is a cron; every other curriculum
    // route is admin-UI driven and belongs behind SSO. Widening this back to the
    // bare prefix re-opens security review F-07/F-09 — see docs/security/STATUS.md.
    '/((?!_next/static|_next/image|favicon\\.ico|icon\\.png|brand/|api/auth|api/slack|api/cron|api/manager-data|api/manager-lookup|api/curriculum/daily|api/reporting/refresh|api/model-lineup/refresh|api/daily-digest|api/lesson/grade|api/lesson/tones|api/scoring).*)',
  ],
};
