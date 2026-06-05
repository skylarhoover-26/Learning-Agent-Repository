import { auth } from '@/auth';

export default auth((req) => {
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
    '/((?!_next/static|_next/image|favicon\\.ico|api/auth|api/slack|api/manager-data|api/manager-lookup|api/curriculum|api/daily-digest|api/lesson/grade|api/lesson/tones|api/scoring).*)',
  ],
};
