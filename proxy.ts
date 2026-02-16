import { withAuth } from 'next-auth/middleware'

export default withAuth(
    function proxy() {
        return
    },
    {
        callbacks: {
            authorized: ({ token }) => !!token,
        },
        pages: {
            signIn: '/auth',
        },
    }
)

export const config = {
    matcher: ['/graphing/:path*', '/agent/:path*'],
}
