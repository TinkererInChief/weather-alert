/**
 * Test Endpoint Protection
 * Prevents test endpoints from being accessed in production
 */

import { NextResponse } from 'next/server'

/**
 * Check if test endpoints should be enabled
 * Only enabled in development and staging environments
 */
export function isTestEndpointEnabled(): boolean {
  const env = process.env.NODE_ENV
  const allowTests = process.env.ALLOW_TEST_ENDPOINTS === 'true'
  
  // Allow in development
  if (env === 'development') return true
  
  // Allow in staging if explicitly enabled
  if (env !== 'production' && allowTests) return true
  
  // Block in production
  return false
}

/**
 * Protect a test endpoint with environment check
 * Returns 403 error if accessed in production
 */
export function protectTestEndpoint(): NextResponse | null {
  if (!isTestEndpointEnabled()) {
    return NextResponse.json(
      { 
        success: false,
        error: 'Test endpoints are disabled in production',
        message: 'This endpoint is only available in development and staging environments'
      },
      { status: 403 }
    )
  }
  
  return null
}

/**
 * Wrapper for test endpoint handlers
 * Usage: export const GET = withTestProtection(async (req) => { ... })
 */
export function withTestProtection(
  handler: (req: Request) => Promise<NextResponse>
): (req: Request) => Promise<NextResponse> {
  return async (req: Request) => {
    const protection = protectTestEndpoint()
    if (protection) return protection
    
    return handler(req)
  }
}
