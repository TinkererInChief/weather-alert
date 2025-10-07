/**
 * NOAA NDBC (National Data Buoy Center) Service
 * Provides real-time sea state conditions from ocean buoys
 * API Documentation: https://www.ndbc.noaa.gov/docs/ndbc_web_data_guide.pdf
 */

export type SeaStateData = {
  buoyId: string
  buoyName: string
  location: {
    latitude: number
    longitude: number
  }
  waveHeight: number          // meters (significant wave height)
  dominantWavePeriod: number  // seconds
  averageWavePeriod: number   // seconds
  waveDirection: number       // degrees
  windSpeed: number           // m/s
  windDirection: number       // degrees
  windGust: number            // m/s
  pressure: number            // hPa
  airTemperature: number      // celsius
  waterTemperature: number    // celsius
  dewPoint: number            // celsius
  visibility: number          // nautical miles
  timestamp: Date
  dataQuality: 'excellent' | 'good' | 'fair' | 'poor'
}

// Major NDBC buoy stations
const NDBC_BUOYS = [
  { id: '46006', name: 'Southeast Papa', lat: 40.90, lon: -137.42, region: 'North Pacific' },
  { id: '46001', name: 'Gulf of Alaska', lat: 56.30, lon: -148.07, region: 'Alaska' },
  { id: '51000', name: 'Hawaii NW', lat: 23.44, lon: -162.28, region: 'Hawaii' },
  { id: '46050', name: 'Stonewall Bank', lat: 44.66, lon: -124.53, region: 'Oregon' },
  { id: '46011', name: 'Santa Maria', lat: 34.88, lon: -120.86, region: 'California' },
  { id: '46054', name: 'West Santa Barbara', lat: 34.27, lon: -120.47, region: 'California' },
  { id: '42001', name: 'Mid Gulf', lat: 25.90, lon: -89.67, region: 'Gulf of Mexico' },
  { id: '42002', name: 'South Central', lat: 26.05, lon: -93.64, region: 'Gulf of Mexico' },
  { id: '44008', name: 'Nantucket', lat: 40.50, lon: -69.25, region: 'Atlantic' },
  { id: '41001', name: 'East Hatteras', lat: 34.68, lon: -72.66, region: 'Atlantic' },
]

/**
 * Calculate distance between two coordinates in km
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
 * Find nearest buoy to given coordinates
 */
export function findNearestBuoy(latitude: number, longitude: number): {
  buoy: typeof NDBC_BUOYS[0]
  distance: number
} | null {
  let nearestBuoy = null
  let minDistance = Infinity

  for (const buoy of NDBC_BUOYS) {
    const distance = calculateDistance(latitude, longitude, buoy.lat, buoy.lon)
    if (distance < minDistance) {
      minDistance = distance
      nearestBuoy = buoy
    }
  }

  return nearestBuoy ? { buoy: nearestBuoy, distance: minDistance } : null
}

/**
 * Parse NDBC standard meteorological data format
 * Format: https://www.ndbc.noaa.gov/data/realtime2/
 */
function parseNDBCData(data: string, buoyInfo: typeof NDBC_BUOYS[0]): SeaStateData | null {
  const lines = data.trim().split('\n')
  if (lines.length < 3) return null

  // Line 0: headers
  // Line 1: units
  // Line 2: latest data
  const headers = lines[0].split(/\s+/)
  const latest = lines[2].split(/\s+/)

  const dataMap: Record<string, string> = {}
  headers.forEach((header, index) => {
    dataMap[header] = latest[index]
  })

  // Parse values (999 or MM means missing data)
  const parseValue = (val: string): number => {
    if (val === 'MM' || val === '999' || val === '99') return 0
    return parseFloat(val)
  }

  // Calculate data quality based on missing fields
  const missingCount = Object.values(dataMap).filter(v => v === 'MM' || v === '999').length
  let dataQuality: SeaStateData['dataQuality'] = 'excellent'
  if (missingCount > 5) dataQuality = 'poor'
  else if (missingCount > 3) dataQuality = 'fair'
  else if (missingCount > 1) dataQuality = 'good'

  return {
    buoyId: buoyInfo.id,
    buoyName: buoyInfo.name,
    location: {
      latitude: buoyInfo.lat,
      longitude: buoyInfo.lon
    },
    waveHeight: parseValue(dataMap['WVHT'] || '0'),
    dominantWavePeriod: parseValue(dataMap['DPD'] || '0'),
    averageWavePeriod: parseValue(dataMap['APD'] || '0'),
    waveDirection: parseValue(dataMap['MWD'] || '0'),
    windSpeed: parseValue(dataMap['WSPD'] || '0'),
    windDirection: parseValue(dataMap['WDIR'] || '0'),
    windGust: parseValue(dataMap['GST'] || '0'),
    pressure: parseValue(dataMap['PRES'] || '0'),
    airTemperature: parseValue(dataMap['ATMP'] || '0'),
    waterTemperature: parseValue(dataMap['WTMP'] || '0'),
    dewPoint: parseValue(dataMap['DEWP'] || '0'),
    visibility: parseValue(dataMap['VIS'] || '0'),
    timestamp: new Date(`${dataMap['#YY']}-${dataMap['MM']}-${dataMap['DD']}T${dataMap['hh']}:${dataMap['mm']}:00Z`),
    dataQuality
  }
}

/**
 * Fetch sea state data from NOAA NDBC
 */
export async function fetchSeaState(
  latitude: number,
  longitude: number,
  maxDistance: number = 500 // km
): Promise<SeaStateData | null> {
  try {
    const nearest = findNearestBuoy(latitude, longitude)
    
    if (!nearest || nearest.distance > maxDistance) {
      console.warn(`No NDBC buoy found within ${maxDistance}km of ${latitude}, ${longitude}`)
      return null
    }

    const response = await fetch(
      `https://www.ndbc.noaa.gov/data/realtime2/${nearest.buoy.id}.txt`,
      {
        headers: {
          'User-Agent': process.env.EXTERNAL_REQUEST_USER_AGENT || 'WeatherAlertSystem/1.0'
        }
      }
    )

    if (!response.ok) {
      throw new Error(`NDBC API error: ${response.status}`)
    }

    const text = await response.text()
    const data = parseNDBCData(text, nearest.buoy)

    return data
  } catch (error) {
    console.error('Error fetching NDBC sea state data:', error)
    return null
  }
}

/**
 * Fetch sea state for multiple locations
 */
export async function fetchMultipleSeaStates(
  locations: Array<{ lat: number; lon: number }>
): Promise<SeaStateData[]> {
  const promises = locations.map(loc => fetchSeaState(loc.lat, loc.lon))
  const results = await Promise.allSettled(promises)
  
  return results
    .filter((result): result is PromiseFulfilledResult<SeaStateData | null> => 
      result.status === 'fulfilled' && result.value !== null
    )
    .map(result => result.value!)
}

/**
 * Get sea state summary for a region
 */
export function getSeaStateSummary(seaState: SeaStateData): string {
  const { waveHeight, windSpeed, dataQuality } = seaState
  
  if (dataQuality === 'poor') {
    return 'Sea state data quality is poor. Conditions uncertain.'
  }
  
  let waveCondition = 'calm'
  if (waveHeight > 6) waveCondition = 'very rough'
  else if (waveHeight > 4) waveCondition = 'rough'
  else if (waveHeight > 2.5) waveCondition = 'moderate'
  else if (waveHeight > 1.25) waveCondition = 'slight'
  
  let windCondition = 'light'
  if (windSpeed > 20) windCondition = 'gale force'
  else if (windSpeed > 15) windCondition = 'strong'
  else if (windSpeed > 10) windCondition = 'moderate'
  else if (windSpeed > 5) windCondition = 'fresh'
  
  return `Sea state: ${waveCondition} (waves ${waveHeight.toFixed(1)}m), winds ${windCondition} (${windSpeed.toFixed(1)} m/s)`
}
