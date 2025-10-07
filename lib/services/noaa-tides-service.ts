/**
 * NOAA CO-OPS (Center for Operational Oceanographic Products and Services)
 * Provides real-time tidal data and predictions
 * API Documentation: https://api.tidesandcurrents.noaa.gov/api/prod/
 */

export type TidalData = {
  stationId: string
  stationName: string
  location: {
    latitude: number
    longitude: number
  }
  currentLevel: number          // meters above MLLW datum
  prediction: number            // predicted level
  tidalState: 'rising' | 'falling' | 'high-slack' | 'low-slack'
  nextHighTide: {
    time: Date
    height: number              // meters
  }
  nextLowTide: {
    time: Date
    height: number              // meters
  }
  tidalRange: number            // high-low difference
  currentSpeed?: number         // knots (if available)
  currentDirection?: number     // degrees (if available)
  timestamp: Date
}

export type TsunamiAmplification = {
  baselineHigh: number          // normal high tide
  tsunamiWaveHeight: number     // estimated tsunami
  combinedHeight: number        // total expected height
  amplificationFactor: number   // multiplier effect
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  recommendation: string
}

// Major NOAA tide stations (3000+ exist, selecting key ones)
const TIDE_STATIONS = [
  { id: '9414290', name: 'San Francisco', lat: 37.81, lon: -122.47, region: 'California' },
  { id: '9410170', name: 'San Diego', lat: 32.71, lon: -117.17, region: 'California' },
  { id: '9411340', name: 'Santa Monica', lat: 34.01, lon: -118.50, region: 'California' },
  { id: '9447130', name: 'Seattle', lat: 47.60, lon: -122.34, region: 'Washington' },
  { id: '9454050', name: 'Astoria', lat: 46.21, lon: -123.77, region: 'Oregon' },
  { id: '1612340', name: 'Honolulu', lat: 21.31, lon: -157.87, region: 'Hawaii' },
  { id: '1619910', name: 'Nawiliwili', lat: 21.95, lon: -159.36, region: 'Hawaii' },
  { id: '8729840', name: 'Key West', lat: 24.55, lon: -81.81, region: 'Florida' },
  { id: '8724580', name: 'Key West', lat: 24.55, lon: -81.81, region: 'Florida' },
  { id: '8518750', name: 'The Battery, NY', lat: 40.70, lon: -74.01, region: 'New York' },
  { id: '8443970', name: 'Boston', lat: 42.35, lon: -71.05, region: 'Massachusetts' },
  { id: '8638610', name: 'Sewells Point, VA', lat: 36.95, lon: -76.33, region: 'Virginia' },
  { id: '8665530', name: 'Charleston', lat: 32.78, lon: -79.92, region: 'South Carolina' },
  { id: '9462620', name: 'Kodiak Island', lat: 57.73, lon: -152.51, region: 'Alaska' },
  { id: '9459450', name: 'Sitka', lat: 57.05, lon: -135.34, region: 'Alaska' },
]

/**
 * Calculate distance between two coordinates
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = toRadians(lat2 - lat1)
  const dLon = toRadians(lon2 - lon1)
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180)
}

/**
 * Find nearest tide station
 */
export function findNearestTideStation(latitude: number, longitude: number): {
  station: typeof TIDE_STATIONS[0]
  distance: number
} | null {
  let nearestStation = null
  let minDistance = Infinity

  for (const station of TIDE_STATIONS) {
    const distance = calculateDistance(latitude, longitude, station.lat, station.lon)
    if (distance < minDistance) {
      minDistance = distance
      nearestStation = station
    }
  }

  return nearestStation ? { station: nearestStation, distance: minDistance } : null
}

/**
 * Fetch current water level from NOAA CO-OPS
 */
async function fetchWaterLevel(stationId: string): Promise<{
  level: number
  timestamp: Date
} | null> {
  try {
    const now = new Date()
    const startDate = new Date(now.getTime() - 60 * 60 * 1000) // 1 hour ago
    
    const url = new URL('https://api.tidesandcurrents.noaa.gov/api/prod/datagetter')
    url.searchParams.set('station', stationId)
    url.searchParams.set('product', 'water_level')
    url.searchParams.set('datum', 'MLLW')
    url.searchParams.set('time_zone', 'gmt')
    url.searchParams.set('units', 'metric')
    url.searchParams.set('format', 'json')
    url.searchParams.set('begin_date', formatDate(startDate))
    url.searchParams.set('end_date', formatDate(now))

    const response = await fetch(url.toString())
    if (!response.ok) return null

    const data = await response.json()
    if (!data.data || data.data.length === 0) return null

    const latest = data.data[data.data.length - 1]
    return {
      level: parseFloat(latest.v),
      timestamp: new Date(latest.t)
    }
  } catch (error) {
    console.error('Error fetching water level:', error)
    return null
  }
}

/**
 * Fetch tide predictions from NOAA CO-OPS
 */
async function fetchTidePredictions(stationId: string): Promise<Array<{
  time: Date
  height: number
  type: 'H' | 'L'
}>> {
  try {
    const now = new Date()
    const endDate = new Date(now.getTime() + 48 * 60 * 60 * 1000) // 48 hours ahead
    
    const url = new URL('https://api.tidesandcurrents.noaa.gov/api/prod/datagetter')
    url.searchParams.set('station', stationId)
    url.searchParams.set('product', 'predictions')
    url.searchParams.set('datum', 'MLLW')
    url.searchParams.set('time_zone', 'gmt')
    url.searchParams.set('units', 'metric')
    url.searchParams.set('format', 'json')
    url.searchParams.set('interval', 'hilo')
    url.searchParams.set('begin_date', formatDate(now))
    url.searchParams.set('end_date', formatDate(endDate))

    const response = await fetch(url.toString())
    if (!response.ok) return []

    const data = await response.json()
    if (!data.predictions) return []

    return data.predictions.map((pred: any) => ({
      time: new Date(pred.t),
      height: parseFloat(pred.v),
      type: pred.type as 'H' | 'L'
    }))
  } catch (error) {
    console.error('Error fetching tide predictions:', error)
    return []
  }
}

/**
 * Format date for NOAA API (YYYYMMDD HH:MM)
 */
function formatDate(date: Date): string {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  const hours = String(date.getUTCHours()).padStart(2, '0')
  const minutes = String(date.getUTCMinutes()).padStart(2, '0')
  return `${year}${month}${day} ${hours}:${minutes}`
}

/**
 * Determine tidal state
 */
function determineTidalState(
  currentLevel: number,
  predictions: Array<{ time: Date; height: number; type: 'H' | 'L' }>
): TidalData['tidalState'] {
  if (predictions.length < 2) return 'rising'

  const nextTide = predictions[0]
  const followingTide = predictions[1]

  // If next tide is high, we're rising
  if (nextTide.type === 'H') {
    // Check if we're close to high tide (within 10 minutes and within 10cm)
    const timeDiff = nextTide.time.getTime() - Date.now()
    const heightDiff = Math.abs(nextTide.height - currentLevel)
    if (timeDiff < 10 * 60 * 1000 && heightDiff < 0.1) {
      return 'high-slack'
    }
    return 'rising'
  } else {
    // Next tide is low, we're falling
    const timeDiff = nextTide.time.getTime() - Date.now()
    const heightDiff = Math.abs(nextTide.height - currentLevel)
    if (timeDiff < 10 * 60 * 1000 && heightDiff < 0.1) {
      return 'low-slack'
    }
    return 'falling'
  }
}

/**
 * Fetch complete tidal data
 */
export async function fetchTidalData(
  latitude: number,
  longitude: number,
  maxDistance: number = 300 // km
): Promise<TidalData | null> {
  try {
    const nearest = findNearestTideStation(latitude, longitude)
    
    if (!nearest || nearest.distance > maxDistance) {
      console.warn(`No tide station found within ${maxDistance}km of ${latitude}, ${longitude}`)
      return null
    }

    const [waterLevel, predictions] = await Promise.all([
      fetchWaterLevel(nearest.station.id),
      fetchTidePredictions(nearest.station.id)
    ])

    if (!waterLevel || predictions.length === 0) {
      return null
    }

    const highs = predictions.filter(p => p.type === 'H')
    const lows = predictions.filter(p => p.type === 'L')

    if (highs.length === 0 || lows.length === 0) {
      return null
    }

    const tidalState = determineTidalState(waterLevel.level, predictions)
    const nextHigh = highs[0]
    const nextLow = lows[0]
    const tidalRange = nextHigh.height - nextLow.height

    // Estimate prediction for current time
    const prediction = predictions.length > 0 ? predictions[0].height : waterLevel.level

    return {
      stationId: nearest.station.id,
      stationName: nearest.station.name,
      location: {
        latitude: nearest.station.lat,
        longitude: nearest.station.lon
      },
      currentLevel: waterLevel.level,
      prediction,
      tidalState,
      nextHighTide: {
        time: nextHigh.time,
        height: nextHigh.height
      },
      nextLowTide: {
        time: nextLow.time,
        height: nextLow.height
      },
      tidalRange,
      timestamp: waterLevel.timestamp
    }
  } catch (error) {
    console.error('Error fetching tidal data:', error)
    return null
  }
}

/**
 * Calculate tsunami amplification with tidal effects
 */
export function calculateTsunamiAmplification(
  tidalData: TidalData,
  estimatedTsunamiHeight: number // meters
): TsunamiAmplification {
  const { currentLevel, nextHighTide, tidalRange } = tidalData
  
  // Use next high tide as baseline (worst case scenario)
  const baselineHigh = nextHighTide.height
  const combinedHeight = baselineHigh + estimatedTsunamiHeight
  
  // Amplification factor (tidal range affects tsunami energy)
  // Larger tidal range = more amplification
  const amplificationFactor = 1 + (tidalRange / 10) * 0.2 // Up to 20% increase
  
  const amplifiedHeight = combinedHeight * amplificationFactor
  
  // Determine risk level
  let riskLevel: TsunamiAmplification['riskLevel']
  let recommendation: string
  
  if (amplifiedHeight > 10) {
    riskLevel = 'critical'
    recommendation = 'IMMEDIATE EVACUATION REQUIRED. Combined tsunami + high tide presents extreme danger.'
  } else if (amplifiedHeight > 5) {
    riskLevel = 'high'
    recommendation = 'Evacuate coastal areas immediately. High tide will significantly amplify tsunami impact.'
  } else if (amplifiedHeight > 2) {
    riskLevel = 'medium'
    recommendation = 'Prepare for coastal flooding. Tidal conditions will worsen tsunami effects.'
  } else {
    riskLevel = 'low'
    recommendation = 'Monitor conditions. Minimal tidal amplification expected.'
  }
  
  return {
    baselineHigh,
    tsunamiWaveHeight: estimatedTsunamiHeight,
    combinedHeight: amplifiedHeight,
    amplificationFactor,
    riskLevel,
    recommendation
  }
}

/**
 * Get tidal summary for display
 */
export function getTidalSummary(tidalData: TidalData): string {
  const { tidalState, currentLevel, nextHighTide, nextLowTide } = tidalData
  
  const stateText = {
    'rising': 'rising',
    'falling': 'falling',
    'high-slack': 'at high tide',
    'low-slack': 'at low tide'
  }[tidalState]
  
  const timeUntilHigh = Math.round((nextHighTide.time.getTime() - Date.now()) / (60 * 1000))
  const timeUntilLow = Math.round((nextLowTide.time.getTime() - Date.now()) / (60 * 1000))
  
  let timing = ''
  if (timeUntilHigh < timeUntilLow) {
    timing = `high tide in ${Math.abs(timeUntilHigh)} min`
  } else {
    timing = `low tide in ${Math.abs(timeUntilLow)} min`
  }
  
  return `Tide ${stateText} (${currentLevel.toFixed(2)}m), ${timing}`
}
