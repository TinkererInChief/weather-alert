import { NextResponse } from 'next/server'
import { withAuth } from 'next-auth/middleware'

export default withAuth(
  function middleware(request) {
    const { pathname } = request.nextUrl
    const rid = request.headers.get('x-request-id') || crypto.randomUUID()
    const headers = new Headers(request.headers)
    headers.set('x-request-id', rid)
    headers.set('x-method', request.method)
    headers.set('x-path', pathname)
    const res = NextResponse.next({ request: { headers } })
    res.headers.set('x-request-id', rid)
    res.headers.set('x-method', request.method)
    res.headers.set('x-path', pathname)
    return res
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl

        // Allow public access to homepage, login page, public pages, and API routes
        if (pathname === '/' ||
            pathname.startsWith('/login') || 
            pathname.startsWith('/api/auth') || 
            pathname.startsWith('/api/health') ||
            
            pathname === '/privacy' ||
            pathname === '/terms' ||
            pathname === '/security-policy' ||
            pathname === '/compliance' ||
            pathname === '/contact' ||
            pathname === '/about' ||
            pathname === '/help' ||
            pathname === '/status' ||
            pathname === '/docs' ||
            pathname === '/data-sources') {
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
