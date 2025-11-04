/**
 * DART Live Status Service
 * Fetches real-time status from NOAA National Data Buoy Center (NDBC)
 */

import { DART_STATIONS, DartStationData } from '@/lib/data/dart-stations'

type DartLiveStatus = DartStationData & {
  lastPing?: Date
  lastDataTime?: string
  isResponding: boolean
}

type DartNetworkStatus = {
  total: number
  online: number
  detecting: number
  offline: number
  lastUpdated: Date
  stations: DartLiveStatus[]
}

/**
 * Fetch latest data from NOAA NDBC for a single DART station
 * 
 * DART stations use .dart files with format:
 * YY MM DD hh mm ss T HEIGHT
 */
async function fetchStationStatus(stationId: string): Promise<{
  isOnline: boolean
  lastDataTime?: Date
  waterHeight?: number
}> {
  try {
    // DART-specific endpoint (not .txt like regular buoys!)
    const url = `https://www.ndbc.noaa.gov/data/realtime2/${stationId}.dart`
    
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000) // 5s timeout
    
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'TsunamiMonitoring/1.0'
      }
    })
    
    clearTimeout(timeoutId)
    
    if (!response.ok) {
      return { isOnline: false }
    }
    
    const text = await response.text()
    const lines = text.trim().split('\n')
    
    // DART format: First line is header (#YY MM DD...), second line is units
    // Third line onwards is data
    if (lines.length < 3) {
      return { isOnline: false }
    }
    
    // Parse the most recent data line (line 2, index after headers)
    const dataLine = lines[2].trim()
    const parts = dataLine.split(/\s+/)
    
    if (parts.length < 8) {
      return { isOnline: false }
    }
    
    // DART format: YY MM DD hh mm ss T HEIGHT
    const year = parseInt(parts[0])
    const month = parseInt(parts[1]) - 1 // JS months are 0-indexed  
    const day = parseInt(parts[2])
    const hour = parseInt(parts[3])
    const minute = parseInt(parts[4])
    const second = parseInt(parts[5])
    const waterHeight = parseFloat(parts[7])
    
    // Handle 2-digit year (2025 → 25)
    const fullYear = year < 100 ? 2000 + year : year
    
    const lastDataTime = new Date(fullYear, month, day, hour, minute, second)
    
    return {
      isOnline: true,
      lastDataTime,
      waterHeight
    }
  } catch (error) {
    // Network error, timeout, or parse error
    console.warn(`Failed to fetch status for DART ${stationId}:`, error)
    return { isOnline: false }
  }
}

/**
 * Determine station status based on last data time
 */
function determineStatus(
  lastDataTime?: Date,
  isResponding?: boolean
): 'online' | 'offline' | 'detecting' {
  if (!isResponding || !lastDataTime) {
    return 'offline'
  }
  
  const now = new Date()
  const hoursAgo = (now.getTime() - lastDataTime.getTime()) / (1000 * 60 * 60)
  
  // If data is more than 24 hours old, consider offline
  if (hoursAgo > 24) {
    return 'offline'
  }
  
  // TODO: Implement actual tsunami detection logic
  // For now, all recent data means "online"
  // In production, you'd analyze wave height anomalies
  return 'online'
}

/**
 * Fetch live status for all DART stations
 * This is the main function called by the API endpoint
 */
export async function fetchLiveDartStatus(): Promise<DartNetworkStatus> {
  console.log('🌊 Fetching REAL DART status from NOAA NDBC...')
  
  const startTime = Date.now()
  
  // Fetch status for all stations in parallel (with concurrency limit)
  const BATCH_SIZE = 10 // Fetch 10 at a time to avoid overwhelming NOAA servers
  const results: DartLiveStatus[] = []
  
  for (let i = 0; i < DART_STATIONS.length; i += BATCH_SIZE) {
    const batch = DART_STATIONS.slice(i, i + BATCH_SIZE)
    
    const batchResults = await Promise.all(
      batch.map(async (station) => {
        const { isOnline, lastDataTime } = await fetchStationStatus(station.id)
        const status = determineStatus(lastDataTime, isOnline)
        
        return {
          ...station,
          status,
          lastPing: lastDataTime,
          lastDataTime: lastDataTime?.toISOString(),
          isResponding: isOnline
        }
      })
    )
    
    results.push(...batchResults)
    
    // Small delay between batches to be nice to NOAA servers
    if (i + BATCH_SIZE < DART_STATIONS.length) {
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }
  
  const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(1)
  console.log(`✅ Fetched REAL status for ${results.length} stations in ${elapsedTime}s`)
  
  // Calculate statistics
  const stats = {
    total: results.length,
    online: results.filter(s => s.status === 'online').length,
    detecting: results.filter(s => s.status === 'detecting').length,
    offline: results.filter(s => s.status === 'offline').length,
    lastUpdated: new Date(),
    stations: results
  }
  
  console.log('📊 Network Status:', {
    online: stats.online,
    detecting: stats.detecting,
    offline: stats.offline
  })
  
  return stats
}

/**
 * Get cached status (for use in components)
 * In production, you'd implement Redis/memory cache here
 */
let cachedStatus: DartNetworkStatus | null = null
let cacheExpiry: number = 0
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export async function getCachedDartStatus(): Promise<DartNetworkStatus> {
  const now = Date.now()
  
  if (cachedStatus && now < cacheExpiry) {
    console.log('📦 Returning cached DART status')
    return cachedStatus
  }
  
  console.log('🔄 Cache expired, fetching fresh DART status...')
  cachedStatus = await fetchLiveDartStatus()
  cacheExpiry = now + CACHE_TTL
  
  return cachedStatus
}

/**
 * Invalidate cache (call this when you need fresh data immediately)
 */
export function invalidateDartStatusCache() {
  cachedStatus = null
  cacheExpiry = 0
  console.log('🗑️ DART status cache invalidated')
}
