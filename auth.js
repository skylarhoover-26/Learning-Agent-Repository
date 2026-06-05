import NextAuth from 'next-auth';
import Okta from 'next-auth/providers/okta';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Okta({
      clientId: process.env.AUTH_OKTA_ID,
      clientSecret: process.env.AUTH_OKTA_SECRET,
      issuer: process.env.AUTH_OKTA_ISSUER,
    }),
  ],
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/auth/signin',
  },
  callbacks: {
    signIn({ profile }) {
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
