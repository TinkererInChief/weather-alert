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
        const { pathname, searchParams } = req.nextUrl

        // Always allow public static media files (defense-in-depth)
        if (/\.(mp4|webm|mov|m4v|mp3|wav|ogg|svg|png|jpg|jpeg|gif|webp|ico|txt|css|js|map)$/i.test(pathname)) {
          return true
        }

        // Allow Open Graph/Twitter preview image routes for crawlers
        if (pathname === '/opengraph-image' || pathname === '/twitter-image') {
          return true
        }

        // Allow recording mode without authentication (for Puppeteer)
        if (pathname.startsWith('/dashboard/simulate-tsunami-map') && searchParams.get('record') === '1') {
          return true
        }

        // Allow public access to homepage, login page, public pages, and certain API routes
        if (pathname === '/' ||
            pathname.startsWith('/login') || 
            pathname.startsWith('/api/auth') || 
            pathname.startsWith('/api/health') ||
            pathname.startsWith('/api/database') ||
            pathname.startsWith('/api/vessels') ||
            pathname.startsWith('/api/webhooks') ||
            pathname.startsWith('/api/test') || // Allow all test API routes
            pathname.startsWith('/api/test-message') ||
            
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

        // Require authentication for dashboard pages
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
     * - audio files (for earcons)
     */
    '/((?!_next/|favicon.ico|audio/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|css|js|map|mp3|wav|ogg|mp4|webm|mov|m4v)$).*)',
  ],
}
