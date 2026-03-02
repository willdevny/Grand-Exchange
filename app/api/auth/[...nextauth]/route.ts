import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'

const handler = NextAuth({
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
    ],
    session: { strategy: 'jwt' },
    callbacks: {
        async session({ session, token }) {
            // Ensure these always exist on the session
            if (session.user) {
                session.user.name = token.name as string | null | undefined
                session.user.email = token.email as string | null | undefined
                session.user.image = token.picture as string | null | undefined
            }
            return session
        },
        async jwt({ token, profile }) {
            // For Google, profile picture is commonly here
            if (profile && 'picture' in profile) {
                token.picture = profile.picture as string
            }
            return token
        },
    },
})

export { handler as GET, handler as POST }
