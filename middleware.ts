import { NextResponse } from 'next/server'
import { withAuth } from 'next-auth/middleware'

export default withAuth(
  function middleware(request) {
    const { pathname } = request.nextUrl

    // Handle health check endpoint
    if (pathname === '/api/health') {
      if (request.method === 'HEAD') {
        return new Response(null, { status: 200 })
      }
      return NextResponse.json({ status: 'ok', ts: Date.now() }, { status: 200 })
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl

        // Allow public access to homepage, login page, and API routes
        if (pathname === '/' ||
            pathname.startsWith('/login') || 
            pathname.startsWith('/api/auth') || 
            pathname === '/api/health') {
          return true
        }

        // Require authentication for all other routes (dashboard, admin pages, etc.)
        return !!token
      },
    },
  }
)

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
