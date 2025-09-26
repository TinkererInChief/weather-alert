import Redis from 'ioredis'

class RedisConnection {
  private static instance: Redis | null = null
  private static currentUrl: string | null = null

  static getInstance(): Redis {
    if (!RedisConnection.instance) {
      // Prefer internal URL, but if it's the Railway internal host and fails in some envs,
      // fall back to the public URL when available. This makes deployments more robust.
      const internalUrl = process.env.REDIS_URL
      const publicUrl = process.env.REDIS_PUBLIC_URL

      let redisUrl = internalUrl || publicUrl || 'redis://localhost:6379'
      try {
        const parsed = new URL(redisUrl)
        if (
          process.env.NODE_ENV === 'production' &&
          parsed.hostname === 'redis.railway.internal' &&
          publicUrl
        ) {
          // Use public endpoint in production when the internal DNS may be unavailable
          redisUrl = publicUrl
          console.warn('[RedisConnection] Using REDIS_PUBLIC_URL fallback in production')
        }
      } catch {
        // ignore URL parse errors; we'll attempt default behavior
      }

      const buildClient = (url: string) => {
        const u = new URL(url)
        const useTLS = u.protocol === 'rediss:'

        // Construct connection via option bag for better control
        const client = new Redis({
          host: u.hostname,
          port: u.port ? parseInt(u.port, 10) : 6379,
          username: u.username || undefined,
          password: u.password || undefined,
          tls: useTLS ? {} : undefined,
          // Do not throw after 20 retries; let commands fail fast and be reported by health
          maxRetriesPerRequest: null,
          enableReadyCheck: true,
          lazyConnect: true,
          connectTimeout: 5000,
          retryStrategy: (attempt) => Math.min(1000 * attempt, 5000),
        })

        const safeUrl = `${u.protocol}//${u.hostname}:${u.port || 6379}`
        console.log(`[RedisConnection] Connecting to ${safeUrl}`)

        client.on('connect', () => {
          console.log(`[RedisConnection] ✅ Connected to ${safeUrl}`)
        })

        client.on('error', async (error) => {
          console.error('❌ Redis connection error:', error)
          // On DNS resolution failure to internal host, try switching to REDIS_PUBLIC_URL
          const isDnsError = (error as any)?.code === 'ENOTFOUND'
          const usingInternal = u.hostname === 'redis.railway.internal'
          if (
            process.env.NODE_ENV === 'production' &&
            isDnsError &&
            usingInternal &&
            publicUrl &&
            RedisConnection.currentUrl === url
          ) {
            try {
              console.warn('[RedisConnection] Switching to REDIS_PUBLIC_URL due to ENOTFOUND on internal host')
              await client.disconnect()
              const publicClient = buildClient(publicUrl)
              RedisConnection.instance = publicClient
              RedisConnection.currentUrl = publicUrl
            } catch (e) {
              console.error('[RedisConnection] Failed to switch to public Redis URL', e)
            }
          }
        })

        return client
      }

      RedisConnection.instance = buildClient(redisUrl)
      RedisConnection.currentUrl = redisUrl

      // initial connect attempt (non-blocking)
      ;(async () => {
        try { await RedisConnection.instance?.connect() } catch {}
      })()
    }

    return RedisConnection.instance
  }

  static async disconnect(): Promise<void> {
    if (RedisConnection.instance) {
      await RedisConnection.instance.disconnect()
      RedisConnection.instance = null
    }
  }

  // Expose the currently configured URL (including credentials). Use carefully and never log full value.
  static getCurrentUrl(): string | null {
    return RedisConnection.currentUrl
  }

  // Return a sanitized endpoint string for display (protocol + host + port only)
  static getCurrentEndpoint(): string | null {
    const url = RedisConnection.currentUrl
    if (!url) return null
    try {
      const u = new URL(url)
      return `${u.protocol}//${u.hostname}:${u.port || 6379}`
    } catch {
      return null
    }
  }
}

export default RedisConnection
