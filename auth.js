import NextAuth from 'next-auth';
import Okta from 'next-auth/providers/okta';

const oktaConfigured = !!(process.env.AUTH_OKTA_ID && process.env.AUTH_OKTA_SECRET && process.env.AUTH_OKTA_ISSUER);

// HCP Okta Integration Standard: use the ORG authorization server only.
// Custom auth servers (including the "default" one) live under /oauth2/<id> and are not allowed.
// We never log the issuer value itself — only flag a misconfiguration shape.
const issuer = process.env.AUTH_OKTA_ISSUER || '';
if (oktaConfigured && /\/oauth2\//.test(issuer)) {
  console.error(
    'AUTH_OKTA_ISSUER points at a custom Okta authorization server. ' +
      'Per HCP standards, use the org issuer (https://housecallpro.okta.com) with no /oauth2/<id> path.'
  );
}

const providers = oktaConfigured
  ? [
      Okta({
        clientId: process.env.AUTH_OKTA_ID,
        clientSecret: process.env.AUTH_OKTA_SECRET,
        issuer,
        // Defense-in-depth: always run the server-side code exchange with PKCE (S256) + state.
        // This is the Okta provider default; we set it explicitly so the requirement is visible.
        checks: ['pkce', 'state'],
        // Default scopes per the standard.
        authorization: { params: { scope: 'openid profile email' } },
      }),
    ]
  : [];

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  session: { strategy: 'jwt' },
  secret: process.env.AUTH_SECRET || 'dev-secret-not-for-production',
  pages: {
    signIn: '/auth/signin',
  },
  callbacks: {
    signIn({ profile }) {
      if (!oktaConfigured) return true;
      const email = profile?.email?.toLowerCase() || '';
      return email.endsWith('@housecallpro.com');
    },
    jwt({ token, profile }) {
      if (profile) {
        token.email = profile.email?.toLowerCase();
        token.name = profile.name;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.email = token.email;
        session.user.name = token.name;
      }
      return session;
    },
  },
});
