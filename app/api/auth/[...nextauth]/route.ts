import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'

const handler = NextAuth({
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            authorization: {
                params: {
                    scope: [
                        "openid email profile https://www.googleapis.com/auth/drive.file",
                        "openid",
                        "email",
                        "profile",
                        "https://www.googleapis.com/auth/drive.file", // 👈 ADD THIS
                    ].join(" "),
                    access_type: "offline",
                    prompt: "consent",
                },
            },
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

            session.accessToken = token.accessToken as string;

            return session
        },
        async jwt({ token, account, profile }) {
            // For Google, profile picture is commonly here
            if (profile && 'picture' in profile) {
                token.picture = profile.picture as string
            }

            if (account) {
                token.accessToken = account.access_token;
            }
            return token
        },
    },
})

export { handler as POST }
