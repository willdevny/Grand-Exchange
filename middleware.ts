import { withAuth } from 'next-auth/middleware'

export default withAuth(
    function middleware(req) {
        // If we get here, the user is authenticated
        return
    },
    {
        callbacks: {
            authorized: ({ token }) => !!token,
        },
    }
)

export const config = {
    matcher: ['/graphing/:path*', '/agent/:path*'],
}