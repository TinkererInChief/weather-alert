import Redis from 'ioredis'

class RedisConnection {
  private static instance: Redis | null = null

  static getInstance(): Redis {
    if (!RedisConnection.instance) {
      // Prefer internal URL in production. In development, allow REDIS_PUBLIC_URL for Railway.
      const urlFromEnv =
        process.env.NODE_ENV === 'production'
          ? process.env.REDIS_URL
          : process.env.REDIS_URL || process.env.REDIS_PUBLIC_URL

      const redisUrl = urlFromEnv || 'redis://localhost:6379'

      const u = new URL(redisUrl)
      const useTLS = u.protocol === 'rediss:'

      // Construct connection via option bag for better control
      RedisConnection.instance = new Redis({
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

      RedisConnection.instance.on('connect', () => {
        console.log('✅ Connected to Redis')
      })

      RedisConnection.instance.on('error', (error) => {
        console.error('❌ Redis connection error:', error)
      })
    }

    return RedisConnection.instance
  }

  static async disconnect(): Promise<void> {
    if (RedisConnection.instance) {
      await RedisConnection.instance.disconnect()
      RedisConnection.instance = null
    }
  }
}

export default RedisConnection
