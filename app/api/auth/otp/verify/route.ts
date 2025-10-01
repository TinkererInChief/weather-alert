import { NextResponse } from 'next/server'
import { otpService } from '@/lib/services/otp-service'
import { 
  getOtpVerifyRateLimit, 
  getClientIdentifier, 
  getPhoneIdentifier,
  checkRateLimit,
  createRateLimitHeaders,
  otpFailureTracker,
  calculateBackoffDelay
} from '@/lib/rate-limit'
import { validateRequest, apiRequestSchemas, validateRequestSize } from '@/lib/validation'

export async function POST(request: Request) {
  try {
    // 1. Validate request size
    if (!validateRequestSize(10)(request)) {
      return NextResponse.json(
        { success: false, error: 'Request too large' },
        { status: 413 }
      )
    }

    // 2. Parse and validate request body
    const body = await request.json()
    const validation = validateRequest(apiRequestSchemas.otpVerify, body)
    
    if (!validation.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid request data',
          details: validation.errors 
        },
        { status: 400 }
      )
    }

    const { phone, otp: code } = validation.data

    // 3. Rate limiting - check both IP and phone-based limits
    const clientId = getClientIdentifier(request)
    const phoneId = getPhoneIdentifier(phone)
    
    // Check IP-based rate limit
    const ipRateResult = await checkRateLimit(getOtpVerifyRateLimit(), clientId)
    
    // Check phone-based rate limit
    const phoneRateResult = await checkRateLimit(getOtpVerifyRateLimit(), phoneId)
    
    if (!ipRateResult.success || !phoneRateResult.success) {
      const blockedBy = !ipRateResult.success ? 'IP' : 'phone number'
      const rateLimitHeaders = createRateLimitHeaders(
        !ipRateResult.success ? ipRateResult : phoneRateResult
      )
      
      // Track verification failure
      await otpFailureTracker.recordFailure(phoneId)
      
      return NextResponse.json(
        {
          success: false,
          error: 'Too many verification attempts. Please wait before trying again.',
          rateLimitedBy: blockedBy,
          retryAfter: Math.ceil((rateLimitHeaders['X-RateLimit-Reset'] ? new Date(rateLimitHeaders['X-RateLimit-Reset']).getTime() - Date.now() : 3600000) / 1000)
        },
        { 
          status: 429,
          headers: rateLimitHeaders
        }
      )
    }

    // 4. Check for previous failures and apply exponential backoff
    const failureCount = await otpFailureTracker.getFailureCount(phoneId)
    if (failureCount > 0) {
      const backoffDelay = calculateBackoffDelay(failureCount)
      
      // If too many failures, require longer wait
      if (failureCount >= 10) {
        return NextResponse.json(
          {
            success: false,
            error: 'Too many failed verification attempts. Account temporarily locked.',
            retryAfter: Math.ceil(backoffDelay / 1000)
          },
          { status: 429 }
        )
      }
    }

    // 5. Development bypass for test users (REMOVE IN PRODUCTION!)
    const TEST_PHONE_NUMBERS = ['+1234567890', '+1234567891', '+1234567892', '+1234567893']
    const isDevelopment = process.env.NODE_ENV === 'development'
    const isTestPhone = TEST_PHONE_NUMBERS.includes(phone)
    
    let otpResult
    
    if (isDevelopment && isTestPhone && code === '123456') {
      // Bypass OTP verification for test users in development
      console.log(`🧪 [DEV] Bypassing OTP verification for test user: ${phone}`)
      otpResult = {
        success: true,
        phone,
        maskedPhone: phone.replace(/\d(?=\d{4})/g, '*')
      }
    } else {
      // Normal OTP verification
      otpResult = await otpService.verifyOtp({ phone, code })
    }
    
    // 6. Clear failure count on successful verification
    await otpFailureTracker.clearFailures(phoneId)
    
    // 7. Return success with rate limit headers
    const rateLimitHeaders = createRateLimitHeaders(phoneRateResult)
    
    return NextResponse.json(
      {
        success: true,
        phone: otpResult.phone,
        maskedPhone: otpResult.maskedPhone,
        timestamp: new Date().toISOString()
      },
      { headers: rateLimitHeaders }
    )
    
  } catch (error) {
    console.error('OTP verification error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
      userAgent: request.headers.get('user-agent'),
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip')
    })
    
    // Record failure for rate limiting
    try {
      const body = await request.json().catch(() => ({}))
      if (body.phone) {
        const phoneId = getPhoneIdentifier(body.phone)
        await otpFailureTracker.recordFailure(phoneId)
      }
    } catch {
      // Ignore errors in failure tracking
    }
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Verification failed',
        timestamp: new Date().toISOString()
      },
      { status: 400 }
    )
  }
}