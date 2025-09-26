import type Redis from 'ioredis'
import RedisConnection from '@/lib/queue/redis-connection'

// Get shared ioredis client
function getRedis(): Redis {
  return RedisConnection.getInstance()
}

// Parse window strings like '1 h', '1 m', '30 s' to milliseconds
function parseWindowToMs(window: string): number {
  const trimmed = window.trim().toLowerCase()
  const match = trimmed.match(/^(\d+)\s*(s|m|h|d)$/)
  if (!match) throw new Error(`Invalid window: ${window}`)
  const value = Number(match[1])
  const unit = match[2]
  switch (unit) {
    case 's': return value * 1000
    case 'm': return value * 60 * 1000
    case 'h': return value * 60 * 60 * 1000
    case 'd': return value * 24 * 60 * 60 * 1000
    default: throw new Error(`Invalid window unit: ${unit}`)
  }
}

// Minimal limiter interface (compatible with how we use it in this codebase)
type RateLimiter = {
  limit: (identifier: string) => Promise<{
    success: boolean
    limit: number
    remaining: number
    reset: number // epoch ms
  }>
}

function createSlidingWindowLimiter(options: { limit: number; window: string; prefix: string }): RateLimiter {
  const redis = getRedis()
  const windowMs = parseWindowToMs(options.window)
  const windowSec = Math.ceil(windowMs / 1000)
  const prefix = options.prefix

  return {
    async limit(identifier: string) {
      const now = Date.now()
      const key = `${prefix}:${identifier}`

      const pipeline = (redis as any).multi()
      // Remove old entries
      pipeline.zremrangebyscore(key, 0, now - windowMs)
      // Add current timestamp as score and member (unique member via now + random)
      const member = `${now}-${Math.random().toString(36).slice(2, 8)}`
      pipeline.zadd(key, now, member)
      // Count
      pipeline.zcard(key)
      // Set TTL
      pipeline.expire(key, windowSec)
      // Get TTL
      pipeline.ttl(key)

      const results = await pipeline.exec()
      // results: [zremrangebyscore, zadd, zcard, expire, ttl]
      const count = Number(results?.[2]?.[1] ?? 0)
      const ttlSec = Number(results?.[4]?.[1] ?? windowSec)
      const allowed = count <= options.limit
      const remaining = Math.max(0, options.limit - count)
      const reset = Date.now() + (ttlSec > 0 ? ttlSec * 1000 : windowMs)

      return {
        success: allowed,
        limit: options.limit,
        remaining,
        reset,
      }
    },
  }
}

// Lazy initialization of rate limiters
let _rateLimiters: null | {
  otpRequest: RateLimiter
  otpVerify: RateLimiter
  login: RateLimiter
  api: RateLimiter
  alert: RateLimiter
} = null

function getRateLimiters() {
  if (!_rateLimiters) {
    _rateLimiters = {
      otpRequest: createSlidingWindowLimiter({ limit: 3, window: '1 h', prefix: 'ratelimit:otp:request' }),
      otpVerify: createSlidingWindowLimiter({ limit: 10, window: '1 h', prefix: 'ratelimit:otp:verify' }),
      login: createSlidingWindowLimiter({ limit: 10, window: '1 h', prefix: 'ratelimit:login:ip' }),
      api: createSlidingWindowLimiter({ limit: 100, window: '1 m', prefix: 'ratelimit:api:general' }),
      alert: createSlidingWindowLimiter({ limit: 50, window: '1 m', prefix: 'ratelimit:alert' }),
    }
  }
  return _rateLimiters
}

// Export functions that return the appropriate rate limiter
export function getOtpRequestRateLimit() {
  return getRateLimiters().otpRequest
}

export function getOtpVerifyRateLimit() {
  return getRateLimiters().otpVerify
}

export function getLoginRateLimit() {
  return getRateLimiters().login
}

export function getApiRateLimit() {
  return getRateLimiters().api
}

export function getAlertRateLimit() {
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
  ratelimit: ReturnType<typeof getOtpRequestRateLimit>, 
  identifier: string
): Promise<RateLimitResult> {
  const result = await ratelimit.limit(identifier)
  return {
    success: result.success,
    limit: result.limit,
    remaining: result.remaining,
    reset: new Date(result.reset),
    blocked: !result.success,
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
    return getRedis()
  }

  async recordFailure(identifier: string): Promise<number> {
    const key = `${this.prefix}:${identifier}`
    const redis = this.getRedis()
    const count = await (redis as any).incr(key)
    
    // Set expiry to 1 hour for failure tracking
    if (count === 1) {
      await (redis as any).expire(key, 3600)
    }
    
    return count
  }

  async getFailureCount(identifier: string): Promise<number> {
    const key = `${this.prefix}:${identifier}`
    const redis = this.getRedis()
    const count = await (redis as any).get(key)
    return parseInt(count as string) || 0
  }

  async clearFailures(identifier: string): Promise<void> {
    const key = `${this.prefix}:${identifier}`
    const redis = this.getRedis()
    await (redis as any).del(key)
  }
}

export const otpFailureTracker = new FailureTracker('otp')
export const loginFailureTracker = new FailureTracker('login')
