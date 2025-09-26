import { NextResponse } from 'next/server'
import { otpService } from '@/lib/services/otp-service'
import { 
  getOtpRequestRateLimit, 
  getClientIdentifier, 
  getPhoneIdentifier,
  checkRateLimit,
  createRateLimitHeaders,
  otpFailureTracker,
  calculateBackoffDelay
} from '@/lib/rate-limit'
import { validateRequest, apiRequestSchemas, validateRequestSize } from '@/lib/validation'
import { verifyCaptcha, isCaptchaConfigured } from '@/lib/captcha-service'

export async function POST(request: Request) {
  try {
    // 1. Validate request size
    if (!validateRequestSize(10)(request)) { // 10KB max
      return NextResponse.json(
        { success: false, error: 'Request too large' },
        { status: 413 }
      )
    }

    // 2. Parse and validate request body
    const body = await request.json()
    const validation = validateRequest(apiRequestSchemas.otpRequest, body)
    
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

    const { phone, captchaToken } = validation.data

    // 3. CAPTCHA verification (if configured and token provided)
    if (isCaptchaConfigured() || captchaToken) {
      if (!captchaToken) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'CAPTCHA verification required',
            requiresCaptcha: true
          },
          { status: 400 }
        )
      }

      const clientIp = request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 'unknown'
      
      const captchaResult = await verifyCaptcha(captchaToken, clientIp)
      
      if (!captchaResult.isValid) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'CAPTCHA verification failed',
            details: captchaResult.errors,
            requiresCaptcha: true,
            riskLevel: captchaResult.riskLevel
          },
          { status: 400 }
        )
      }

      // Log successful CAPTCHA verification
      console.log('CAPTCHA verification successful', {
        phone: phone.replace(/\d(?=\d{4})/g, '*'),
        score: captchaResult.score,
        riskLevel: captchaResult.riskLevel
      })
    }

    // 4. Rate limiting - check both IP and phone-based limits
    const clientId = getClientIdentifier(request)
    const phoneId = getPhoneIdentifier(phone)
    
    // Check IP-based rate limit (prevents distributed attacks)
    const ipRateResult = await checkRateLimit(getOtpRequestRateLimit(), clientId)
    
    // Check phone-based rate limit (prevents phone number abuse)
    const phoneRateResult = await checkRateLimit(getOtpRequestRateLimit(), phoneId)
    
    if (!ipRateResult.success || !phoneRateResult.success) {
      const blockedBy = !ipRateResult.success ? 'IP' : 'phone number'
      const rateLimitHeaders = createRateLimitHeaders(
        !ipRateResult.success ? ipRateResult : phoneRateResult
      )
      
      // Track this as a potential abuse attempt
      await otpFailureTracker.recordFailure(phoneId)
      
      return NextResponse.json(
        {
          success: false,
          error: `Too many OTP requests. Please wait before requesting another code.`,
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
      if (failureCount >= 5) {
        return NextResponse.json(
          {
            success: false,
            error: 'Too many failed attempts. Please try again later.',
            retryAfter: Math.ceil(backoffDelay / 1000)
          },
          { status: 429 }
        )
      }
    }

    // 5. Send OTP
    const result = await otpService.sendOtp({ phone })
    
    // 6. Clear failure count on successful request
    await otpFailureTracker.clearFailures(phoneId)
    
    // 7. Return success with rate limit headers
    const rateLimitHeaders = createRateLimitHeaders(phoneRateResult)
    
    return NextResponse.json(
      {
        success: true,
        maskedPhone: result.maskedPhone,
        timestamp: new Date().toISOString()
      },
      { headers: rateLimitHeaders }
    )
    
  } catch (error) {
    console.error('OTP request error:', {
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
        error: error instanceof Error ? error.message : 'Unable to send verification code',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}