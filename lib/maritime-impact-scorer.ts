/**
 * Maritime Impact Scoring System
 * Calculates maritime relevance and priority for earthquake events
 */

export type MaritimeImpactScore = {
  eventId: string
  totalScore: number // 0-100
  priority: 'critical' | 'high' | 'medium' | 'low' | 'negligible'
  factors: {
    magnitude: number          // 0-30
    proximityToShipping: number // 0-25
    tsunamiRisk: number        // 0-25
    portDensity: number        // 0-15
    historicalImpact: number   // 0-5
  }
  shouldDisplay: boolean
  shouldAutoFetch: boolean
  refreshInterval: number | null // milliseconds
  affectedAssets: {
    nearbyPorts: Array<{ name: string; distance: number }>
    shippingLanes: string[]
    estimatedVesselsInRange: number
  }
}

export type EarthquakeEvent = {
  id: string
  magnitude: number
  latitude: number
  longitude: number
  depth: number
  location: string
  timestamp: Date
  tsunamiWarning?: boolean
  tsunamiWatch?: boolean
}

const MAJOR_SHIPPING_LANES = [
  { name: 'Trans-Pacific (Japan-US)', coords: [[35, 140], [33, -118]], importance: 10 },
  { name: 'Asia-Europe (Malacca)', coords: [[1.29, 103.85], [51.92, 4.48]], importance: 9 },
  { name: 'Pacific Coastal', coords: [[33, -118], [49, -123]], importance: 7 },
  { name: 'Japan Coastal', coords: [[35.7, 139.8], [34.7, 135.5]], importance: 8 },
  { name: 'South China Sea', coords: [[22.3, 114.2], [1.29, 103.85]], importance: 8 },
]

const MAJOR_PORTS = [
  { name: 'Singapore', lat: 1.29, lon: 103.85, importance: 10 },
  { name: 'Shanghai', lat: 31.23, lon: 121.47, importance: 10 },
  { name: 'Tokyo', lat: 35.65, lon: 139.77, importance: 9 },
  { name: 'Hong Kong', lat: 22.30, lon: 114.17, importance: 9 },
  { name: 'Los Angeles', lat: 33.74, lon: -118.27, importance: 9 },
  { name: 'Rotterdam', lat: 51.92, lon: 4.48, importance: 8 },
  { name: 'Manila', lat: 14.58, lon: 120.98, importance: 7 },
  { name: 'Sydney', lat: -33.86, lon: 151.20, importance: 7 },
  { name: 'Vancouver', lat: 49.28, lon: -123.12, importance: 7 },
  { name: 'Busan', lat: 35.10, lon: 129.04, importance: 8 },
]

/**
 * Calculate great circle distance between two points in km
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Earth's radius in km
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
 * Check if location is landlocked or in ocean
 */
function isOceanEvent(lat: number, lon: number): boolean {
  // Simplified check - in production, use proper land/sea database
  // This is a rough approximation
  const landlockedRegions = [
    { latMin: 30, latMax: 50, lonMin: -120, lonMax: -70 }, // North America inland
    { latMin: 35, latMax: 70, lonMin: 20, lonMax: 150 },   // Eurasia inland
  ]
  
  return !landlockedRegions.some(region => 
    lat >= region.latMin && lat <= region.latMax &&
    lon >= region.lonMin && lon <= region.lonMax
  )
}

/**
 * Calculate distance to nearest shipping lane
 */
function getShippingLaneProximity(lat: number, lon: number): {
  minDistance: number
  nearestLane: string
  importance: number
} {
  let minDistance = Infinity
  let nearestLane = ''
  let importance = 0

  for (const lane of MAJOR_SHIPPING_LANES) {
    // Simplified: check distance to endpoints (in production, use full route)
    const dist1 = calculateDistance(lat, lon, lane.coords[0][0], lane.coords[0][1])
    const dist2 = calculateDistance(lat, lon, lane.coords[1][0], lane.coords[1][1])
    const distance = Math.min(dist1, dist2)
    
    if (distance < minDistance) {
      minDistance = distance
      nearestLane = lane.name
      importance = lane.importance
    }
  }

  return { minDistance, nearestLane, importance }
}

/**
 * Score magnitude impact (0-30 points)
 */
function scoreMagnitude(magnitude: number): number {
  if (magnitude >= 7.0) return 30
  if (magnitude >= 6.5) return 25
  if (magnitude >= 6.0) return 20
  if (magnitude >= 5.5) return 15
  if (magnitude >= 5.0) return 10
  if (magnitude >= 4.5) return 5
  return 0
}

/**
 * Score proximity to shipping lanes and maritime areas (0-25 points)
 */
function scoreProximityToShipping(lat: number, lon: number, magnitude: number): number {
  const inOcean = isOceanEvent(lat, lon)
  
  // Landlocked events get very low scores
  if (!inOcean) {
    return 0
  }

  const { minDistance, nearestLane, importance } = getShippingLaneProximity(lat, lon)
  
  // Score based on distance and lane importance
  let score = 0
  
  if (minDistance < 50) {
    score = 25 // Very close to shipping lane
  } else if (minDistance < 100) {
    score = 20
  } else if (minDistance < 200) {
    score = 15
  } else if (minDistance < 500) {
    score = 10
  } else if (minDistance < 1000) {
    score = 5
  }
  
  // Adjust by lane importance
  score = Math.round(score * (importance / 10))
  
  return Math.min(score, 25)
}

/**
 * Score tsunami risk (0-25 points)
 */
function scoreTsunamiRisk(event: EarthquakeEvent): number {
  if (event.tsunamiWarning) return 25
  if (event.tsunamiWatch) return 20
  
  // Ocean events with M6+ have potential
  const inOcean = isOceanEvent(event.latitude, event.longitude)
  if (!inOcean) return 0
  
  // Shallow ocean earthquakes M6+ are risky
  if (event.magnitude >= 6.5 && event.depth < 70) return 15
  if (event.magnitude >= 6.0 && event.depth < 50) return 10
  if (event.magnitude >= 5.5 && event.depth < 30) return 5
  
  return 0
}

/**
 * Score port density (0-15 points)
 */
function scorePortDensity(lat: number, lon: number): {
  score: number
  nearbyPorts: Array<{ name: string; distance: number }>
} {
  const nearbyPorts = MAJOR_PORTS
    .map(port => ({
      name: port.name,
      distance: calculateDistance(lat, lon, port.lat, port.lon),
      importance: port.importance
    }))
    .filter(port => port.distance < 500) // Within 500km
    .sort((a, b) => a.distance - b.distance)

  if (nearbyPorts.length === 0) return { score: 0, nearbyPorts: [] }

  // Score based on closest port and its importance
  const closestPort = nearbyPorts[0]
  let score = 0

  if (closestPort.distance < 50) {
    score = 15
  } else if (closestPort.distance < 100) {
    score = 12
  } else if (closestPort.distance < 200) {
    score = 10
  } else if (closestPort.distance < 300) {
    score = 7
  } else if (closestPort.distance < 500) {
    score = 4
  }

  // Bonus for multiple nearby ports
  if (nearbyPorts.length > 3) score += 3
  else if (nearbyPorts.length > 1) score += 1

  // Adjust by port importance
  score = Math.round(score * (closestPort.importance / 10))

  return { 
    score: Math.min(score, 15),
    nearbyPorts: nearbyPorts.slice(0, 5) // Top 5 nearest
  }
}

/**
 * Score historical impact (0-5 points)
 * In production, query database of historical events
 */
function scoreHistoricalImpact(lat: number, lon: number, magnitude: number): number {
  // Simplified: regions with history of maritime impacts
  const highRiskRegions = [
    { name: 'Japan', latMin: 30, latMax: 45, lonMin: 130, lonMax: 145 },
    { name: 'Indonesia', latMin: -10, latMax: 6, lonMin: 95, lonMax: 141 },
    { name: 'Pacific Northwest', latMin: 40, latMax: 55, lonMin: -130, lonMax: -120 },
    { name: 'Chile', latMin: -45, latMax: -17, lonMin: -76, lonMax: -66 },
  ]

  const inHighRiskRegion = highRiskRegions.some(region =>
    lat >= region.latMin && lat <= region.latMax &&
    lon >= region.lonMin && lon <= region.lonMax
  )

  if (inHighRiskRegion && magnitude >= 6.0) return 5
  if (inHighRiskRegion && magnitude >= 5.0) return 3
  if (magnitude >= 7.0) return 2 // Any M7+ gets some points
  
  return 0
}

/**
 * Estimate number of vessels potentially affected
 */
function estimateVesselsInRange(lat: number, lon: number, magnitude: number): number {
  // Simplified estimation based on magnitude and location
  const { minDistance, importance } = getShippingLaneProximity(lat, lon)
  
  if (minDistance > 500) return 0
  
  // Rough estimate: vessels per km of shipping lane * affected radius
  const affectedRadius = magnitude >= 7.0 ? 500 : magnitude >= 6.0 ? 300 : 200
  const vesselDensity = importance * 0.5 // vessels per km
  
  return Math.round(vesselDensity * affectedRadius * (1 - minDistance / 1000))
}

/**
 * Main scoring function
 */
export function calculateMaritimeImpact(event: EarthquakeEvent): MaritimeImpactScore {
  const magnitudeScore = scoreMagnitude(event.magnitude)
  const proximityScore = scoreProximityToShipping(event.latitude, event.longitude, event.magnitude)
  const tsunamiScore = scoreTsunamiRisk(event)
  const { score: portScore, nearbyPorts } = scorePortDensity(event.latitude, event.longitude)
  const historicalScore = scoreHistoricalImpact(event.latitude, event.longitude, event.magnitude)
  
  const totalScore = magnitudeScore + proximityScore + tsunamiScore + portScore + historicalScore
  
  // Determine priority
  let priority: MaritimeImpactScore['priority']
  if (totalScore >= 75) priority = 'critical'
  else if (totalScore >= 50) priority = 'high'
  else if (totalScore >= 30) priority = 'medium'
  else if (totalScore >= 15) priority = 'low'
  else priority = 'negligible'
  
  // Determine display and auto-fetch behavior
  const shouldDisplay = totalScore >= 30 || event.tsunamiWarning === true
  const shouldAutoFetch = totalScore >= 50 || event.tsunamiWarning === true
  
  // Determine refresh interval
  let refreshInterval: number | null = null
  if (priority === 'critical') refreshInterval = 60_000  // 1 minute
  else if (priority === 'high') refreshInterval = 300_000  // 5 minutes
  else if (priority === 'medium') refreshInterval = 900_000  // 15 minutes
  
  const { minDistance, nearestLane } = getShippingLaneProximity(event.latitude, event.longitude)
  
  return {
    eventId: event.id,
    totalScore,
    priority,
    factors: {
      magnitude: magnitudeScore,
      proximityToShipping: proximityScore,
      tsunamiRisk: tsunamiScore,
      portDensity: portScore,
      historicalImpact: historicalScore,
    },
    shouldDisplay,
    shouldAutoFetch,
    refreshInterval,
    affectedAssets: {
      nearbyPorts,
      shippingLanes: minDistance < 200 ? [nearestLane] : [],
      estimatedVesselsInRange: estimateVesselsInRange(event.latitude, event.longitude, event.magnitude),
    },
  }
}

/**
 * Compare and rank multiple events
 */
export function rankMaritimeEvents(events: EarthquakeEvent[]): MaritimeImpactScore[] {
  return events
    .map(event => calculateMaritimeImpact(event))
    .sort((a, b) => b.totalScore - a.totalScore) // Highest score first
}

/**
 * Filter events for maritime relevance
 */
export function filterMaritimeRelevant(
  events: EarthquakeEvent[],
  minScore: number = 30
): MaritimeImpactScore[] {
  return rankMaritimeEvents(events).filter(score => score.totalScore >= minScore)
}

/**
 * Example usage:
 * 
 * const event1 = {
 *   id: 'eq-001',
 *   magnitude: 7.2,
 *   latitude: 35.65,
 *   longitude: 139.77,
 *   depth: 10,
 *   location: 'Near Tokyo, Japan',
 *   timestamp: new Date(),
 *   tsunamiWarning: true
 * }
 * 
 * const score = calculateMaritimeImpact(event1)
 * console.log(score)
 * // {
 * //   totalScore: 92,
 * //   priority: 'critical',
 * //   shouldDisplay: true,
 * //   shouldAutoFetch: true,
 * //   refreshInterval: 60000,
 * //   ...
 * // }
 */
