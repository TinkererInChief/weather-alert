/**
 * React Hook for Live DART Status
 * Fetches real-time status from NOAA NDBC with auto-refresh
 */

import { useState, useEffect, useCallback } from 'react'
import { DartStationData } from '@/lib/data/dart-stations'

type DartLiveStatus = DartStationData & {
  lastPing?: Date
  lastDataTime?: string
  isResponding: boolean
}

type LiveStatusData = {
  stations: DartLiveStatus[]
  stats: {
    total: number
    online: number
    detecting: number
    offline: number
    health: number
  }
  lastUpdated: Date | null
  nextUpdate: Date | null
}

type UseLiveDartStatusReturn = {
  data: LiveStatusData
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  isRefreshing: boolean
}

const REFRESH_INTERVAL = 5 * 60 * 1000 // 5 minutes (matches cache TTL)

/**
 * Hook to fetch and auto-refresh live DART station status
 * 
 * @param enableAutoRefresh - Whether to automatically refresh data (default: true)
 * @param refreshInterval - Refresh interval in milliseconds (default: 5 minutes)
 */
export function useLiveDartStatus(
  enableAutoRefresh = true,
  refreshInterval = REFRESH_INTERVAL
): UseLiveDartStatusReturn {
  const [data, setData] = useState<LiveStatusData>({
    stations: [],
    stats: {
      total: 71,
      online: 0,
      detecting: 0,
      offline: 0,
      health: 0
    },
    lastUpdated: null,
    nextUpdate: null
  })
  
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const fetchStatus = useCallback(async () => {
    try {
      console.log('🔄 Fetching live DART status...')
      
      const response = await fetch('/api/dart/status')
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch DART status')
      }
      
      setData({
        stations: result.stations.map((station: any) => ({
          ...station,
          lastPing: station.lastDataTime ? new Date(station.lastDataTime) : undefined
        })),
        stats: {
          total: result.status.total,
          online: result.status.online,
          detecting: result.status.detecting,
          offline: result.status.offline,
          health: result.status.health
        },
        lastUpdated: new Date(result.status.lastUpdate),
        nextUpdate: result.cache?.nextUpdate ? new Date(result.cache.nextUpdate) : null
      })
      
      setError(null)
      console.log('✅ Live DART status updated:', {
        online: result.status.online,
        detecting: result.status.detecting,
        offline: result.status.offline
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      console.error('❌ Failed to fetch DART status:', errorMessage)
      setError(errorMessage)
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }, [])
  
  const refresh = useCallback(async () => {
    setIsRefreshing(true)
    await fetchStatus()
  }, [fetchStatus])
  
  // Initial fetch
  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])
  
  // Auto-refresh
  useEffect(() => {
    if (!enableAutoRefresh) return
    
    const interval = setInterval(() => {
      console.log('⏰ Auto-refreshing DART status...')
      refresh()
    }, refreshInterval)
    
    return () => clearInterval(interval)
  }, [enableAutoRefresh, refreshInterval, refresh])
  
  return {
    data,
    loading,
    error,
    refresh,
    isRefreshing
  }
}
