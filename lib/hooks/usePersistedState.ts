import { useState, useEffect, Dispatch, SetStateAction } from 'react'

type CacheConfig = {
  ttl: number // Time to live in milliseconds
  version?: string // Cache version for invalidation
}

/**
 * Custom hook for persisting state in localStorage with TTL
 * @param key - localStorage key
 * @param initialValue - Initial value if no cache exists
 * @param config - Cache configuration (ttl, version)
 */
export function usePersistedState<T>(
  key: string,
  initialValue: T,
  config: CacheConfig = { ttl: 60000 } // Default 1 minute
): [T, Dispatch<SetStateAction<T>>, boolean] {
  const [state, setState] = useState<T>(initialValue)
  const [isFromCache, setIsFromCache] = useState(false)

  // Load from cache on mount
  useEffect(() => {
    try {
      const cached = localStorage.getItem(key)
      if (cached) {
        const { value, timestamp, version } = JSON.parse(cached)
        const now = Date.now()
        const isExpired = now - timestamp > config.ttl
        const isVersionMismatch = config.version && version !== config.version

        if (!isExpired && !isVersionMismatch) {
          setState(value)
          setIsFromCache(true)
        } else {
          // Clear expired or outdated cache
          localStorage.removeItem(key)
        }
      }
    } catch (error) {
      console.error(`Failed to load cache for ${key}:`, error)
      localStorage.removeItem(key)
    }
  }, [key])

  // Save to cache when state changes
  useEffect(() => {
    try {
      const cacheData = {
        value: state,
        timestamp: Date.now(),
        version: config.version || '1.0'
      }
      localStorage.setItem(key, JSON.stringify(cacheData))
    } catch (error) {
      console.error(`Failed to save cache for ${key}:`, error)
      // Quota exceeded - clear old caches
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        localStorage.clear()
      }
    }
  }, [state, key, config.version])

  return [state, setState, isFromCache]
}

/**
 * Utility to invalidate all caches matching a pattern
 */
export function invalidateCache(pattern: string) {
  try {
    const keys = Object.keys(localStorage)
    keys.forEach(key => {
      if (key.includes(pattern)) {
        localStorage.removeItem(key)
      }
    })
  } catch (error) {
    console.error('Failed to invalidate cache:', error)
  }
}

/**
 * Utility to clear all caches
 */
export function clearAllCaches() {
  try {
    localStorage.clear()
  } catch (error) {
    console.error('Failed to clear caches:', error)
  }
}
