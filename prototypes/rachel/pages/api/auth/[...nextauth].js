import NextAuth from 'next-auth'
import OktaProvider from 'next-auth/providers/okta'

export const authOptions = {
  providers: [
    OktaProvider({
      clientId: process.env.OKTA_CLIENT_ID,
      clientSecret: process.env.OKTA_CLIENT_SECRET,
      issuer: process.env.OKTA_ISSUER
    })
  ],
  callbacks: {
    async session({ session, token }) {
      session.user.id = token.sub
      session.user.oktaId = token.sub
      return session
    },
    async jwt({ token, account, profile }) {
      if (account) {
        token.sub = profile?.sub || token.sub
      }
      return token
    }
  },
  pages: {
    signIn: '/auth/signin'
  }
}

export default NextAuth(authOptions)
