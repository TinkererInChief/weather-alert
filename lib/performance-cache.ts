/**
 * Performance Cache System
 * Multi-layer caching with intelligent invalidation and performance monitoring
 */

import { log } from './logger'

export interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
  hits: number
  size: number
  tags: string[]
}

export interface CacheStats {
  totalEntries: number
  totalSize: number
  hitRate: number
  missRate: number
  evictions: number
  averageResponseTime: number
  hotKeys: string[]
}

export interface CacheConfig {
  maxSize: number // Maximum cache size in bytes
  maxEntries: number // Maximum number of entries
  defaultTTL: number // Default TTL in milliseconds
  cleanupInterval: number // Cleanup interval in milliseconds
  enableStats: boolean
}

class PerformanceCache {
  private cache = new Map<string, CacheEntry<any>>()
  private stats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    evictions: 0,
    totalSize: 0,
    responseTimes: [] as number[]
  }
  private config: CacheConfig
  private cleanupTimer?: NodeJS.Timeout

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxSize: 50 * 1024 * 1024, // 50MB
      maxEntries: 10000,
      defaultTTL: 300000, // 5 minutes
      cleanupInterval: 60000, // 1 minute
      enableStats: true,
      ...config
    }

    this.startCleanupTimer()
  }

  /**
   * Get item from cache with performance tracking
   */
  async get<T>(key: string): Promise<T | null> {
    const startTime = Date.now()
    
    try {
      const entry = this.cache.get(key)
      
      if (!entry) {
        this.stats.misses++
        return null
      }

      // Check if expired
      if (Date.now() - entry.timestamp > entry.ttl) {
        this.cache.delete(key)
        this.stats.totalSize -= entry.size
        this.stats.misses++
        return null
      }

      // Update hit count and stats
      entry.hits++
      this.stats.hits++
      
      const responseTime = Date.now() - startTime
      this.recordResponseTime(responseTime)

      return entry.data
    } catch (error) {
      log.error('Cache get error', error, { key })
      this.stats.misses++
      return null
    }
  }

  /**
   * Set item in cache with intelligent eviction
   */
  async set<T>(
    key: string, 
    data: T, 
    options: {
      ttl?: number
      tags?: string[]
      priority?: 'low' | 'medium' | 'high'
    } = {}
  ): Promise<boolean> {
    try {
      const size = this.calculateSize(data)
      const ttl = options.ttl || this.config.defaultTTL
      const tags = options.tags || []

      // Check size limits
      if (size > this.config.maxSize * 0.1) { // Don't allow single item > 10% of cache
        log.warn('Cache item too large', { key, size, maxSize: this.config.maxSize })
        return false
      }

      // Evict if necessary
      await this.evictIfNecessary(size)

      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl,
        hits: 0,
        size,
        tags
      }

      this.cache.set(key, entry)
      this.stats.sets++
      this.stats.totalSize += size

      return true
    } catch (error) {
      log.error('Cache set error', error, { key })
      return false
    }
  }

  /**
   * Delete item from cache
   */
  delete(key: string): boolean {
    const entry = this.cache.get(key)
    if (entry) {
      this.cache.delete(key)
      this.stats.deletes++
      this.stats.totalSize -= entry.size
      return true
    }
    return false
  }

  /**
   * Clear all cache entries or by tags
   */
  clear(tags?: string[]): number {
    let cleared = 0

    if (!tags) {
      cleared = this.cache.size
      this.cache.clear()
      this.stats.totalSize = 0
    } else {
      for (const [key, entry] of this.cache.entries()) {
        if (tags.some(tag => entry.tags.includes(tag))) {
          this.cache.delete(key)
          this.stats.totalSize -= entry.size
          cleared++
        }
      }
    }

    log.info('Cache cleared', { cleared, tags })
    return cleared
  }

  /**
   * Get or set with fallback function
   */
  async getOrSet<T>(
    key: string,
    fallback: () => Promise<T>,
    options: Parameters<PerformanceCache['set']>[2] = {}
  ): Promise<T> {
    const cached = await this.get<T>(key)
    if (cached !== null) {
      return cached
    }

    const data = await fallback()
    await this.set(key, data, options)
    return data
  }

  /**
   * Memoize function with cache
   */
  memoize<Args extends any[], Return>(
    fn: (...args: Args) => Promise<Return>,
    options: {
      keyGenerator?: (...args: Args) => string
      ttl?: number
      tags?: string[]
    } = {}
  ) {
    const keyGenerator = options.keyGenerator || ((...args) => JSON.stringify(args))

    return async (...args: Args): Promise<Return> => {
      const key = `memoized:${fn.name}:${keyGenerator(...args)}`
      return this.getOrSet(key, () => fn(...args), {
        ttl: options.ttl,
        tags: options.tags
      })
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const totalRequests = this.stats.hits + this.stats.misses
    const hitRate = totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0
    const missRate = totalRequests > 0 ? (this.stats.misses / totalRequests) * 100 : 0
    
    // Get hot keys (most accessed)
    const hotKeys = Array.from(this.cache.entries())
      .sort((a, b) => b[1].hits - a[1].hits)
      .slice(0, 10)
      .map(([key]) => key)

    const averageResponseTime = this.stats.responseTimes.length > 0
      ? this.stats.responseTimes.reduce((a, b) => a + b, 0) / this.stats.responseTimes.length
      : 0

    return {
      totalEntries: this.cache.size,
      totalSize: this.stats.totalSize,
      hitRate: Math.round(hitRate * 100) / 100,
      missRate: Math.round(missRate * 100) / 100,
      evictions: this.stats.evictions,
      averageResponseTime: Math.round(averageResponseTime * 100) / 100,
      hotKeys
    }
  }

  /**
   * Warm up cache with predefined data
   */
  async warmUp(entries: Array<{ key: string; data: any; options?: any }>): Promise<number> {
    let warmed = 0
    
    for (const entry of entries) {
      const success = await this.set(entry.key, entry.data, entry.options)
      if (success) warmed++
    }

    log.info('Cache warmed up', { entries: warmed, total: entries.length })
    return warmed
  }

  /**
   * Export cache data for persistence
   */
  export(): Record<string, any> {
    const exported: Record<string, any> = {}
    
    for (const [key, entry] of this.cache.entries()) {
      if (Date.now() - entry.timestamp < entry.ttl) {
        exported[key] = {
          data: entry.data,
          timestamp: entry.timestamp,
          ttl: entry.ttl,
          tags: entry.tags
        }
      }
    }

    return exported
  }

  /**
   * Import cache data from persistence
   */
  async import(data: Record<string, any>): Promise<number> {
    let imported = 0
    
    for (const [key, entry] of Object.entries(data)) {
      // Check if entry is still valid
      if (Date.now() - entry.timestamp < entry.ttl) {
        await this.set(key, entry.data, {
          ttl: entry.ttl - (Date.now() - entry.timestamp),
          tags: entry.tags
        })
        imported++
      }
    }

    log.info('Cache imported', { entries: imported, total: Object.keys(data).length })
    return imported
  }

  // Private methods
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup()
    }, this.config.cleanupInterval)
  }

  private cleanup(): void {
    const now = Date.now()
    let cleaned = 0

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key)
        this.stats.totalSize -= entry.size
        cleaned++
      }
    }

    if (cleaned > 0) {
      log.debug('Cache cleanup completed', { cleaned })
    }
  }

  private async evictIfNecessary(newItemSize: number): Promise<void> {
    // Check entry count limit
    if (this.cache.size >= this.config.maxEntries) {
      await this.evictLRU(1)
    }

    // Check size limit
    while (this.stats.totalSize + newItemSize > this.config.maxSize) {
      await this.evictLRU(1)
    }
  }

  private async evictLRU(count: number): Promise<void> {
    // Sort by last access time (least recently used first)
    const entries = Array.from(this.cache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp)

    for (let i = 0; i < count && i < entries.length; i++) {
      const [key, entry] = entries[i]
      this.cache.delete(key)
      this.stats.totalSize -= entry.size
      this.stats.evictions++
    }
  }

  private calculateSize(data: any): number {
    try {
      return new Blob([JSON.stringify(data)]).size
    } catch {
      return JSON.stringify(data).length * 2 // Rough estimate
    }
  }

  private recordResponseTime(time: number): void {
    this.stats.responseTimes.push(time)
    
    // Keep only last 1000 response times for memory efficiency
    if (this.stats.responseTimes.length > 1000) {
      this.stats.responseTimes = this.stats.responseTimes.slice(-1000)
    }
  }

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
    }
    this.cache.clear()
    this.stats.totalSize = 0
  }
}

// Specialized cache instances
export const memoryCache = new PerformanceCache({
  maxSize: 50 * 1024 * 1024, // 50MB
  maxEntries: 10000,
  defaultTTL: 300000, // 5 minutes
  cleanupInterval: 60000 // 1 minute
})

export const sessionCache = new PerformanceCache({
  maxSize: 10 * 1024 * 1024, // 10MB
  maxEntries: 1000,
  defaultTTL: 900000, // 15 minutes
  cleanupInterval: 120000 // 2 minutes
})

export const geoCache = new PerformanceCache({
  maxSize: 5 * 1024 * 1024, // 5MB
  maxEntries: 5000,
  defaultTTL: 3600000, // 1 hour
  cleanupInterval: 300000 // 5 minutes
})

// Cache decorators for functions
export function cached<T extends any[], R>(
  options: {
    cache?: PerformanceCache
    ttl?: number
    keyGenerator?: (...args: T) => string
    tags?: string[]
  } = {}
) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value
    const cache = options.cache || memoryCache
    
    descriptor.value = cache.memoize(method, {
      keyGenerator: options.keyGenerator,
      ttl: options.ttl,
      tags: options.tags
    })
  }
}

// Performance monitoring utilities
export class PerformanceMonitor {
  private static metrics = new Map<string, number[]>()

  static recordMetric(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, [])
    }
    
    const values = this.metrics.get(name)!
    values.push(value)
    
    // Keep only last 1000 values
    if (values.length > 1000) {
      this.metrics.set(name, values.slice(-1000))
    }
  }

  static getMetrics(name: string): {
    average: number
    min: number
    max: number
    count: number
  } | null {
    const values = this.metrics.get(name)
    if (!values || values.length === 0) return null

    return {
      average: values.reduce((a, b) => a + b, 0) / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      count: values.length
    }
  }

  static getAllMetrics(): Record<string, any> {
    const result: Record<string, any> = {}
    
    for (const [name, values] of this.metrics.entries()) {
      if (values.length > 0) {
        result[name] = {
          average: values.reduce((a, b) => a + b, 0) / values.length,
          min: Math.min(...values),
          max: Math.max(...values),
          count: values.length
        }
      }
    }
    
    return result
  }
}

// Export the PerformanceCache class
export { PerformanceCache }

// Performance timing decorator
export function timed(metricName?: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value
    const name = metricName || `${target.constructor.name}.${propertyName}`

    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now()
      try {
        const result = await method.apply(this, args)
        const duration = Date.now() - startTime
        PerformanceMonitor.recordMetric(name, duration)
        return result
      } catch (error) {
        const duration = Date.now() - startTime
        PerformanceMonitor.recordMetric(`${name}.error`, duration)
        throw error
      }
    }
  }
}
