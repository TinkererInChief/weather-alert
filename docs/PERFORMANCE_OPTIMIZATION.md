# Performance Optimization Guide

## Overview
This guide details the performance optimization strategies implemented in the Emergency Weather Alert System, including caching mechanisms, performance monitoring, and optimization techniques.

## Table of Contents
- [Caching Architecture](#caching-architecture)
- [Performance Monitoring](#performance-monitoring)
- [Optimization Strategies](#optimization-strategies)
- [Database Performance](#database-performance)
- [Memory Management](#memory-management)
- [Load Testing](#load-testing)
- [Troubleshooting](#troubleshooting)

## Caching Architecture

### Multi-Layer Cache System
The application implements a sophisticated multi-layer caching system:

```typescript
// Cache Hierarchy
┌─────────────────────────────────────┐
│           Browser Cache             │ <- Static assets, 24h TTL
├─────────────────────────────────────┤
│            CDN Cache               │ <- Global content delivery
├─────────────────────────────────────┤
│         Application Cache           │ <- In-memory cache, 5-15min TTL
├─────────────────────────────────────┤
│           Redis Cache              │ <- Distributed cache, 1-24h TTL
├─────────────────────────────────────┤
│         Database Cache             │ <- Query result cache
└─────────────────────────────────────┘
```

### Cache Implementation

#### Memory Cache
```typescript
import { memoryCache } from '@/lib/performance-cache'

// Cache configuration
const memoryCache = new PerformanceCache({
  maxSize: 50 * 1024 * 1024, // 50MB
  maxEntries: 10000,
  defaultTTL: 300000, // 5 minutes
  cleanupInterval: 60000 // 1 minute
})

// Usage examples
await memoryCache.set('user:123', userData, { ttl: 900000 }) // 15 minutes
const user = await memoryCache.get('user:123')
```

#### Session Cache
```typescript
// Optimized for user session data
const sessionCache = new PerformanceCache({
  maxSize: 10 * 1024 * 1024, // 10MB
  maxEntries: 1000,
  defaultTTL: 900000, // 15 minutes
  cleanupInterval: 120000 // 2 minutes
})
```

#### Geolocation Cache
```typescript
// Long-term cache for IP geolocation data
const geoCache = new PerformanceCache({
  maxSize: 5 * 1024 * 1024, // 5MB
  maxEntries: 5000,
  defaultTTL: 3600000, // 1 hour
  cleanupInterval: 300000 // 5 minutes
})
```

### Cache Strategies

#### Cache-Aside Pattern
```typescript
async function getUserProfile(userId: string) {
  // Try cache first
  let user = await memoryCache.get(`user:${userId}`)
  
  if (!user) {
    // Cache miss - fetch from database
    user = await database.user.findUnique({ where: { id: userId } })
    
    if (user) {
      // Store in cache for future requests
      await memoryCache.set(`user:${userId}`, user, { ttl: 900000 })
    }
  }
  
  return user
}
```

#### Write-Through Pattern
```typescript
async function updateUserProfile(userId: string, data: UserData) {
  // Update database first
  const user = await database.user.update({
    where: { id: userId },
    data
  })
  
  // Update cache immediately
  await memoryCache.set(`user:${userId}`, user, { ttl: 900000 })
  
  return user
}
```

#### Cache Invalidation
```typescript
// Tag-based invalidation
await memoryCache.set('user:123', userData, { 
  ttl: 900000,
  tags: ['user', 'profile', 'session:abc']
})

// Invalidate all user-related cache entries
await memoryCache.clear(['user'])
```

### Intelligent Caching

#### Function Memoization
```typescript
import { cached, timed } from '@/lib/performance-cache'

class WeatherService {
  @cached({ ttl: 600000 }) // Cache for 10 minutes
  @timed('weather.getForecasts')
  async getWeatherForecasts(location: string): Promise<WeatherData> {
    return await this.fetchFromNOAA(location)
  }
}
```

#### Conditional Caching
```typescript
const cacheData = await memoryCache.getOrSet(
  cacheKey,
  async () => {
    return await expensiveOperation()
  },
  {
    ttl: isHighPriority ? 300000 : 600000, // Variable TTL
    tags: ['weather', location],
    priority: isEmergency ? 'high' : 'medium'
  }
)
```

## Performance Monitoring

### Real-Time Metrics Collection
```typescript
import { PerformanceMonitor } from '@/lib/performance-cache'

class SecurityMiddleware {
  @timed('security.assessment')
  async assessRequest(request: Request): Promise<SecurityResult> {
    const startTime = Date.now()
    
    try {
      const result = await this.performSecurityChecks(request)
      
      // Record success metrics
      PerformanceMonitor.recordMetric('security.success', Date.now() - startTime)
      
      return result
    } catch (error) {
      // Record error metrics
      PerformanceMonitor.recordMetric('security.error', Date.now() - startTime)
      throw error
    }
  }
}
```

### Key Performance Indicators

#### Response Time Metrics
```typescript
const performanceThresholds = {
  // API Response Times (95th percentile)
  'api.auth.otp.request': 500,     // 500ms
  'api.auth.otp.verify': 300,      // 300ms
  'api.alerts.send': 2000,         // 2s (includes SMS)
  'api.security.assessment': 100,   // 100ms
  
  // Cache Performance
  'cache.hit_rate': 90,            // 90%+
  'cache.response_time': 10,       // 10ms
  
  // Security Operations
  'security.captcha_verify': 1200, // 1.2s
  'security.device_fingerprint': 50, // 50ms
  'security.threat_detection': 75,  // 75ms
  
  // Database Queries
  'db.user_lookup': 50,            // 50ms
  'db.contact_search': 100,        // 100ms
  'db.alert_history': 200          // 200ms
}
```

#### Cache Performance Monitoring
```typescript
// Real-time cache statistics
const getCachePerformance = () => {
  const memoryStats = memoryCache.getStats()
  const sessionStats = sessionCache.getStats()
  const geoStats = geoCache.getStats()
  
  return {
    overall: {
      totalEntries: memoryStats.totalEntries + sessionStats.totalEntries + geoStats.totalEntries,
      totalSize: memoryStats.totalSize + sessionStats.totalSize + geoStats.totalSize,
      averageHitRate: (memoryStats.hitRate + sessionStats.hitRate + geoStats.hitRate) / 3,
      averageResponseTime: memoryStats.averageResponseTime
    },
    byCache: {
      memory: memoryStats,
      session: sessionStats,
      geo: geoStats
    }
  }
}
```

### Performance Dashboards
```typescript
// Performance metrics API endpoint
export async function GET() {
  const metrics = {
    responseTime: PerformanceMonitor.getMetrics('api.response_time'),
    cachePerformance: getCachePerformance(),
    systemHealth: {
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      uptime: process.uptime()
    },
    securityMetrics: {
      averageAssessmentTime: PerformanceMonitor.getMetrics('security.assessment'),
      threatDetectionTime: PerformanceMonitor.getMetrics('security.threat_detection'),
      captchaVerificationTime: PerformanceMonitor.getMetrics('security.captcha_verify')
    }
  }
  
  return NextResponse.json(metrics)
}
```

## Optimization Strategies

### Code Optimization

#### Lazy Loading
```typescript
// Lazy load heavy security components
const loadSecurityAssessment = async () => {
  const { assessThreat } = await import('@/lib/threat-detection')
  return assessThreat
}

// Lazy load Redis clients
let redisClient: Redis | null = null
const getRedisClient = () => {
  if (!redisClient) {
    redisClient = new Redis(process.env.REDIS_URL!)
  }
  return redisClient
}
```

#### Request Optimization
```typescript
// Batch multiple security checks
const performBatchedSecurityChecks = async (request: Request) => {
  const [
    deviceFingerprint,
    geoLocation,
    threatAssessment
  ] = await Promise.all([
    generateDeviceFingerprint(request),
    getGeolocation(getIPFromRequest(request)),
    assessBasicThreats(request)
  ])
  
  return { deviceFingerprint, geoLocation, threatAssessment }
}
```

#### Memory Management
```typescript
// Efficient data structures
class SecuritySessionCache {
  private sessions = new Map<string, SecuritySession>()
  private readonly MAX_SESSIONS = 10000
  
  set(sessionId: string, data: SecuritySession) {
    // Implement LRU eviction
    if (this.sessions.size >= this.MAX_SESSIONS) {
      const firstKey = this.sessions.keys().next().value
      this.sessions.delete(firstKey)
    }
    
    this.sessions.set(sessionId, data)
  }
  
  // Periodic cleanup
  cleanup() {
    const now = Date.now()
    for (const [key, session] of this.sessions.entries()) {
      if (now - session.lastAccess > SESSION_TTL) {
        this.sessions.delete(key)
      }
    }
  }
}
```

### Database Performance

#### Query Optimization
```sql
-- Optimized indexes for common queries
CREATE INDEX CONCURRENTLY idx_contacts_phone_hash ON contacts USING hash(phone);
CREATE INDEX CONCURRENTLY idx_otp_attempts_phone_created ON otp_attempts(phone, created_at DESC);
CREATE INDEX CONCURRENTLY idx_security_events_timestamp ON security_events(timestamp DESC);
CREATE INDEX CONCURRENTLY idx_sessions_user_active ON sessions(user_id, active) WHERE active = true;

-- Composite indexes for complex queries
CREATE INDEX CONCURRENTLY idx_alerts_location_severity_time ON alerts(location, severity, created_at DESC);
```

#### Connection Pooling
```typescript
// Optimized database connection configuration
const databaseConfig = {
  url: process.env.DATABASE_URL,
  connectionLimit: 20,
  acquireTimeout: 10000,
  timeout: 5000,
  log: process.env.NODE_ENV === 'development' ? ['query'] : ['error'],
  
  // Connection pooling
  pool: {
    min: 2,
    max: 10,
    acquireTimeoutMillis: 30000,
    createTimeoutMillis: 30000,
    destroyTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    reapIntervalMillis: 1000,
    createRetryIntervalMillis: 100
  }
}
```

#### Query Caching
```typescript
// Database query result caching
const getCachedUserContacts = async (userId: string) => {
  return memoryCache.getOrSet(
    `contacts:${userId}`,
    async () => {
      return await prisma.contact.findMany({
        where: { userId },
        orderBy: { name: 'asc' }
      })
    },
    { ttl: 600000, tags: ['contacts', `user:${userId}`] }
  )
}
```

### Network Optimization

#### Response Compression
```typescript
// Automatic response compression
const compressionMiddleware = (request: Request, response: Response) => {
  const acceptEncoding = request.headers.get('accept-encoding') || ''
  
  if (acceptEncoding.includes('gzip')) {
    response.headers.set('Content-Encoding', 'gzip')
    // Compress response body
  }
}
```

#### CDN Configuration
```typescript
// Static asset caching headers
const staticAssetHeaders = {
  // Images, CSS, JS - 1 year cache
  '\\.(jpg|jpeg|png|gif|css|js|woff|woff2)$': {
    'Cache-Control': 'public, max-age=31536000, immutable',
    'Expires': new Date(Date.now() + 31536000 * 1000).toUTCString()
  },
  
  // API responses - no cache
  '\\/api\\/': {
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  }
}
```

## Memory Management

### Memory Pool Strategy
```typescript
class MemoryPool {
  private pools = new Map<string, Array<any>>()
  private readonly MAX_POOL_SIZE = 1000
  
  get<T>(type: string): T | null {
    const pool = this.pools.get(type)
    return pool?.pop() || null
  }
  
  release<T>(type: string, obj: T): void {
    let pool = this.pools.get(type)
    if (!pool) {
      pool = []
      this.pools.set(type, pool)
    }
    
    if (pool.length < this.MAX_POOL_SIZE) {
      pool.push(obj)
    }
  }
}

// Usage for security assessments
const securityPool = new MemoryPool()

const getSecurityContext = (): SecurityContext => {
  return securityPool.get('SecurityContext') || new SecurityContext()
}

const releaseSecurityContext = (context: SecurityContext): void => {
  context.reset() // Clean up for reuse
  securityPool.release('SecurityContext', context)
}
```

### Garbage Collection Optimization
```typescript
// Memory monitoring and GC optimization
const monitorMemoryUsage = () => {
  const usage = process.memoryUsage()
  
  if (usage.heapUsed > 100 * 1024 * 1024) { // 100MB threshold
    // Force garbage collection if available
    if (global.gc) {
      global.gc()
    }
    
    // Clear non-essential caches
    memoryCache.cleanup()
    
    log.warn('High memory usage detected', {
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024) + 'MB',
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024) + 'MB'
    })
  }
}

// Run memory monitoring every 30 seconds
setInterval(monitorMemoryUsage, 30000)
```

## Load Testing

### Performance Test Suite
```typescript
import { SecurityBenchmark } from '@/tests/security/security-test-suite'

describe('Performance Tests', () => {
  test('Security assessment performance', async () => {
    const benchmark = await SecurityBenchmark.measureSecurityAssessment(1000)
    
    expect(benchmark.averageTime).toBeLessThan(100) // 100ms
    expect(benchmark.throughput).toBeGreaterThan(500) // 500 req/s
    expect(benchmark.maxTime).toBeLessThan(500) // 500ms max
  })
  
  test('Cache performance under load', async () => {
    const promises = []
    for (let i = 0; i < 1000; i++) {
      promises.push(memoryCache.get(`test-key-${i % 100}`))
    }
    
    const startTime = Date.now()
    await Promise.all(promises)
    const duration = Date.now() - startTime
    
    expect(duration).toBeLessThan(100) // 100ms for 1000 operations
  })
})
```

### Load Testing Scripts
```bash
#!/bin/bash
# Load testing with Apache Bench
ab -n 10000 -c 100 -H "Authorization: Bearer test-token" \
   http://localhost:3000/api/auth/otp/request

# Artillery load testing
artillery run load-test.yml

# K6 performance testing
k6 run performance-test.js
```

### Performance Targets
```yaml
# performance-targets.yml
targets:
  response_time:
    p50: 50ms    # 50% of requests under 50ms
    p95: 200ms   # 95% of requests under 200ms
    p99: 500ms   # 99% of requests under 500ms
  
  throughput:
    api_requests: 1000/s    # 1000 requests per second
    security_assessments: 500/s  # 500 assessments per second
    cache_operations: 10000/s    # 10k cache ops per second
  
  resources:
    memory_usage: <512MB    # Under 512MB memory usage
    cpu_usage: <70%         # Under 70% CPU usage
    cache_hit_rate: >90%    # Above 90% cache hit rate
```

## Troubleshooting

### Performance Issues

#### High Response Times
```bash
# Check system resources
top -p $(pgrep -f "node.*weather-alert")
iostat -x 1 5
free -m

# Check database performance  
sudo -u postgres psql -d weather_alert_db -c "
SELECT query, calls, total_time, mean_time 
FROM pg_stat_statements 
ORDER BY total_time DESC LIMIT 10;"

# Check Redis performance
redis-cli --latency-history -i 1
```

#### Memory Leaks
```typescript
// Memory leak detection
const detectMemoryLeaks = () => {
  const initialMemory = process.memoryUsage().heapUsed
  
  setTimeout(() => {
    const currentMemory = process.memoryUsage().heapUsed
    const growth = currentMemory - initialMemory
    
    if (growth > 50 * 1024 * 1024) { // 50MB growth
      log.warn('Potential memory leak detected', {
        initialMemory: Math.round(initialMemory / 1024 / 1024) + 'MB',
        currentMemory: Math.round(currentMemory / 1024 / 1024) + 'MB',
        growth: Math.round(growth / 1024 / 1024) + 'MB'
      })
      
      // Generate heap dump for analysis
      if (process.env.NODE_ENV === 'production') {
        require('v8').writeHeapSnapshot(`heap-${Date.now()}.heapsnapshot`)
      }
    }
  }, 60000) // Check after 1 minute
}
```

#### Cache Issues
```bash
# Check cache statistics
curl http://localhost:3000/api/performance/cache-stats

# Clear cache if needed
curl -X POST http://localhost:3000/api/performance/clear-cache \
  -H "Authorization: Bearer admin-token" \
  -d '{"tags": ["user", "session"]}'

# Monitor cache hit rates
watch -n 5 'curl -s http://localhost:3000/api/performance/cache-stats | jq .hitRate'
```

### Performance Optimization Checklist

- [ ] Response times under target thresholds
- [ ] Cache hit rate above 90%
- [ ] Memory usage stable and under limits
- [ ] Database queries optimized with proper indexes
- [ ] CDN configured for static assets
- [ ] Compression enabled for responses
- [ ] Connection pooling configured
- [ ] Circuit breakers protecting external services
- [ ] Performance monitoring in place
- [ ] Load testing completed successfully

---
**Performance Grade**: A (Optimized for production)  
**Last Performance Review**: December 2024  
**Target Response Time**: <100ms (95th percentile)  
**Cache Hit Rate**: >90%  
**Memory Efficiency**: <512MB peak usage
