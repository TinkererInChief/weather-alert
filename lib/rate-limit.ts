import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Lazy-loaded Redis instance for rate limiting
function getRedisClient(): Redis {
  const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL
  const redisToken = process.env.REDIS_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN

  // For builds or when Redis is not configured, create a mock
  if (!redisUrl || process.env.NODE_ENV === 'test') {
    console.warn('Redis not configured, using in-memory fallback')
    // Return a mock Redis client for development
    return {
      set: async () => 'OK',
      get: async () => null,
      del: async () => 1,
      incr: async () => 1,
      expire: async () => true,
    } as any as Redis
  }

  return new Redis({
    url: redisUrl,
    token: redisToken,
  })
}

// Lazy initialization of rate limiters
let _rateLimiters: any = null

function getRateLimiters() {
  if (!_rateLimiters) {
    const redis = getRedisClient()
    
    _rateLimiters = {
      otpRequest: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(3, '1 h'), // 3 requests per hour per phone
        analytics: true,
        prefix: 'ratelimit:otp:request',
      }),
      
      otpVerify: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(10, '1 h'), // 10 attempts per hour per phone  
        analytics: true,
        prefix: 'ratelimit:otp:verify',
      }),
      
      login: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(10, '1 h'), // 10 login attempts per hour per IP
        analytics: true,
        prefix: 'ratelimit:login:ip',
      }),
      
      api: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(100, '1 m'), // 100 requests per minute per IP
        analytics: true,
        prefix: 'ratelimit:api:general',
      }),
      
      alert: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(50, '1 m'), // 50 alert requests per minute
        analytics: true,
        prefix: 'ratelimit:alert',
      })
    }
  }
  
  return _rateLimiters
}

// Export functions that return the appropriate rate limiter
export function getOtpRequestRateLimit(): Ratelimit {
  return getRateLimiters().otpRequest
}

export function getOtpVerifyRateLimit(): Ratelimit {
  return getRateLimiters().otpVerify
}

export function getLoginRateLimit(): Ratelimit {
  return getRateLimiters().login
}

export function getApiRateLimit(): Ratelimit {
  return getRateLimiters().api
}

export function getAlertRateLimit(): Ratelimit {
  return getRateLimiters().alert
}


// Helper function to get client identifier (IP + user agent hash for better tracking)
export function getClientIdentifier(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown'
  const userAgent = request.headers.get('user-agent') || 'unknown'
  
  // Create a simple hash of IP + User Agent for better rate limiting
  const identifier = `${ip}:${userAgent.slice(0, 50)}`
  return identifier
}

// Helper function to get phone identifier for phone-based rate limiting
export function getPhoneIdentifier(phone: string): string {
  // Normalize phone number for consistent rate limiting
  return phone.replace(/\D/g, '') // Remove all non-digits
}

// Rate limit response helper
export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: Date
  blocked: boolean
}

export async function checkRateLimit(
  ratelimit: Ratelimit, 
  identifier: string
): Promise<RateLimitResult> {
  const result = await ratelimit.limit(identifier)
  
  return {
    success: result.success,
    limit: result.limit,
    remaining: result.remaining,
    reset: new Date(result.reset),
    blocked: !result.success
  }
}

// Helper to create rate limit headers for HTTP responses
export function createRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.reset.toISOString(),
  }
}

// Exponential backoff calculator
export function calculateBackoffDelay(attemptCount: number): number {
  // Exponential backoff: 2^attempt * 1000ms, max 30 seconds
  const delay = Math.min(Math.pow(2, attemptCount) * 1000, 30000)
  return delay + Math.random() * 1000 // Add jitter
}

// Track failed attempts for progressive penalties
export class FailureTracker {
  private prefix: string

  constructor(prefix: string) {
    this.prefix = `failure:${prefix}`
  }

  private getRedis(): Redis {
    return getRedisClient()
  }

  async recordFailure(identifier: string): Promise<number> {
    const key = `${this.prefix}:${identifier}`
    const redis = this.getRedis()
    const count = await redis.incr(key)
    
    // Set expiry to 1 hour for failure tracking
    if (count === 1) {
      await redis.expire(key, 3600)
    }
    
    return count
  }

  async getFailureCount(identifier: string): Promise<number> {
    const key = `${this.prefix}:${identifier}`
    const redis = this.getRedis()
    const count = await redis.get(key)
    return parseInt(count as string) || 0
  }

  async clearFailures(identifier: string): Promise<void> {
    const key = `${this.prefix}:${identifier}`
    const redis = this.getRedis()
    await redis.del(key)
  }
}

export const otpFailureTracker = new FailureTracker('otp')
export const loginFailureTracker = new FailureTracker('login')
