import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const pathname = req.nextUrl.pathname

    // Admin-only routes
    if (pathname.startsWith('/admin') && token?.role !== 'admin') {
      return NextResponse.redirect(new URL('/', req.url))
    }
    return NextResponse.next()
  },
  {
    callbacks: {
      // Allow access to admin routes only to authenticated users (role checked above)
      authorized: ({ token, req }) => {
        if (req.nextUrl.pathname.startsWith('/admin')) return !!token
        return true // all other routes are public
      },
    },
  }
)

export const config = {
  matcher: ['/admin/:path*'],
}
