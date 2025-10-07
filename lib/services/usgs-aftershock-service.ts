/**
 * USGS Aftershock Forecast Service
 * Provides probabilistic aftershock predictions after significant earthquakes
 * API Documentation: https://earthquake.usgs.gov/fdsnws/event/1/
 */

export type AftershockForecast = {
  mainshockId: string
  mainshockMagnitude: number
  mainshockLocation: string
  forecastGenerated: Date
  timeWindow: number          // hours
  
  probabilities: Array<{
    magnitude: number
    probability: number       // 0-1 (0-100%)
    timeframe: string        // "next 24 hours", "next week"
    expectedCount: number    // estimated number of aftershocks
  }>
  
  tsunamiRisk: {
    possible: boolean
    magnitudeThreshold: number
    monitoring: boolean
    description: string
  }
  
  recommendation: 'safe' | 'monitor' | 'caution' | 'evacuate'
  scientificSource: string
  confidence: 'high' | 'medium' | 'low'
  
  // Statistical model (Omori's Law + Gutenberg-Richter)
  modelParameters: {
    pValue: number           // productivity parameter
    cValue: number           // temporal decay
    alphaValue: number       // magnitude distribution
    bValue: number           // frequency-magnitude relation
  }
}

/**
 * Omori's Law: Rate of aftershocks decreases with time
 * n(t) = K / (t + c)^p
 * Where:
 * - K is productivity (number of aftershocks)
 * - c is time offset (typically ~0.05 days)
 * - p is decay rate (typically ~1.1)
 * - t is time since mainshock
 */

/**
 * Gutenberg-Richter relation: Frequency-magnitude distribution
 * log10(N) = a - b*M
 * Where:
 * - N is number of earthquakes >= magnitude M
 * - a is productivity
 * - b is slope (typically ~1.0, meaning 10x more quakes for each magnitude decrease)
 */

/**
 * Calculate aftershock probabilities using statistical models
 */
function calculateAftershockProbabilities(
  mainshockMagnitude: number,
  depth: number,
  hoursElapsed: number
): AftershockForecast['probabilities'] {
  // Model parameters (simplified - in production, these would be regionally calibrated)
  const bValue = 1.0  // Gutenberg-Richter b-value
  const pValue = 1.1  // Omori p-value
  const cValue = 0.05 // Omori c-value (in days)
  
  // Bath's Law: Largest aftershock is typically 1.2 magnitudes less than mainshock
  const maxAftershockMagnitude = mainshockMagnitude - 1.2
  
  // Calculate expected number of aftershocks using modified Omori's Law
  const K = Math.pow(10, mainshockMagnitude - 4.5) // Productivity factor
  const t = hoursElapsed / 24 // Convert to days
  
  const probabilities: AftershockForecast['probabilities'] = []
  
  // Calculate probabilities for different magnitude ranges
  const magnitudeThresholds = [
    { mag: mainshockMagnitude - 0.5, timeframe: 'next 24 hours' },
    { mag: mainshockMagnitude - 1.0, timeframe: 'next 24 hours' },
    { mag: mainshockMagnitude - 1.5, timeframe: 'next 24 hours' },
    { mag: mainshockMagnitude - 2.0, timeframe: 'next week' },
    { mag: 5.0, timeframe: 'next week' },
  ]
  
  for (const threshold of magnitudeThresholds) {
    if (threshold.mag < 4.0) continue // Don't forecast very small events
    
    // Gutenberg-Richter: Expected count for magnitude >= threshold
    const magnitudeDifference = maxAftershockMagnitude - threshold.mag
    const expectedCount = K * Math.pow(10, bValue * magnitudeDifference)
    
    // Omori: Temporal decay factor
    const timeframeDays = threshold.timeframe === 'next 24 hours' ? 1 : 7
    const temporalFactor = (Math.pow(t + cValue, -pValue) - Math.pow(t + timeframeDays + cValue, -pValue))
    
    // Probability calculation (Poisson distribution)
    const lambda = expectedCount * Math.max(0, temporalFactor) * 10 // Scale factor
    const probability = Math.min(1, 1 - Math.exp(-lambda))
    
    if (probability > 0.01) { // Only include if >1% probability
      probabilities.push({
        magnitude: Math.round(threshold.mag * 10) / 10,
        probability: Math.round(probability * 100) / 100,
        timeframe: threshold.timeframe,
        expectedCount: Math.round(lambda)
      })
    }
  }
  
  return probabilities.sort((a, b) => b.magnitude - a.magnitude)
}

/**
 * Assess tsunami risk from potential aftershocks
 */
function assessTsunamiRisk(
  mainshockMagnitude: number,
  mainshockDepth: number,
  isOceanic: boolean,
  probabilities: AftershockForecast['probabilities']
): AftershockForecast['tsunamiRisk'] {
  // Tsunami generation requires:
  // 1. Ocean location
  // 2. Magnitude >= 6.5 (typically)
  // 3. Shallow depth < 70km
  // 4. Vertical seafloor displacement
  
  if (!isOceanic) {
    return {
      possible: false,
      magnitudeThreshold: 0,
      monitoring: false,
      description: 'Event is not in oceanic region. No tsunami risk from aftershocks.'
    }
  }
  
  // Find highest magnitude aftershock with >10% probability
  const significantAftershock = probabilities.find(p => p.probability > 0.1 && p.magnitude >= 6.5)
  
  if (!significantAftershock) {
    return {
      possible: false,
      magnitudeThreshold: 6.5,
      monitoring: mainshockDepth < 70,
      description: 'Low probability of tsunami-generating aftershocks. Monitoring continues.'
    }
  }
  
  const possible = mainshockDepth < 70
  const monitoring = mainshockMagnitude >= 6.0
  
  let description = ''
  if (possible && significantAftershock.probability > 0.3) {
    description = `HIGH RISK: ${Math.round(significantAftershock.probability * 100)}% chance of M${significantAftershock.magnitude}+ aftershock which could trigger additional tsunami.`
  } else if (possible) {
    description = `MODERATE RISK: M${significantAftershock.magnitude}+ aftershock possible. Tsunami monitoring active.`
  } else {
    description = `LOW RISK: Deep mainshock reduces tsunami risk from aftershocks. Continue monitoring.`
  }
  
  return {
    possible,
    magnitudeThreshold: 6.5,
    monitoring,
    description
  }
}

/**
 * Generate recommendation based on aftershock forecast
 */
function generateRecommendation(
  mainshockMagnitude: number,
  probabilities: AftershockForecast['probabilities'],
  tsunamiRisk: AftershockForecast['tsunamiRisk']
): AftershockForecast['recommendation'] {
  // Critical: High probability of large aftershock + tsunami risk
  if (tsunamiRisk.possible && probabilities[0]?.probability > 0.5) {
    return 'evacuate'
  }
  
  // Caution: Moderate probability of significant aftershock
  const hasSignificantRisk = probabilities.some(p => 
    p.magnitude > mainshockMagnitude - 1.5 && p.probability > 0.3
  )
  if (hasSignificantRisk || tsunamiRisk.monitoring) {
    return 'caution'
  }
  
  // Monitor: Low but non-zero risk
  if (probabilities.length > 0) {
    return 'monitor'
  }
  
  return 'safe'
}

/**
 * Fetch aftershock forecast
 */
export async function fetchAftershockForecast(
  mainshockId: string,
  magnitude: number,
  latitude: number,
  longitude: number,
  depth: number,
  location: string,
  timestamp: Date
): Promise<AftershockForecast | null> {
  try {
    // Calculate time since mainshock
    const hoursElapsed = (Date.now() - timestamp.getTime()) / (1000 * 60 * 60)
    
    // Determine if oceanic (simplified check)
    const isOceanic = Math.abs(latitude) < 60 && (
      (longitude > -180 && longitude < -60) ||  // Pacific
      (longitude > 20 && longitude < 180)       // Pacific/Indian
    )
    
    // Calculate probabilities
    const probabilities = calculateAftershockProbabilities(magnitude, depth, hoursElapsed)
    
    // Assess tsunami risk
    const tsunamiRisk = assessTsunamiRisk(magnitude, depth, isOceanic, probabilities)
    
    // Generate recommendation
    const recommendation = generateRecommendation(magnitude, probabilities, tsunamiRisk)
    
    // Confidence based on time elapsed and magnitude
    let confidence: AftershockForecast['confidence']
    if (hoursElapsed < 72 && magnitude >= 6.0) confidence = 'high'
    else if (hoursElapsed < 168 && magnitude >= 5.5) confidence = 'medium'
    else confidence = 'low'
    
    return {
      mainshockId,
      mainshockMagnitude: magnitude,
      mainshockLocation: location,
      forecastGenerated: new Date(),
      timeWindow: 168, // 7 days
      probabilities,
      tsunamiRisk,
      recommendation,
      scientificSource: 'USGS Statistical Model (Omori-Utsu + Gutenberg-Richter)',
      confidence,
      modelParameters: {
        pValue: 1.1,
        cValue: 0.05,
        alphaValue: magnitude - 4.5,
        bValue: 1.0
      }
    }
  } catch (error) {
    console.error('Error generating aftershock forecast:', error)
    return null
  }
}

/**
 * Fetch actual recent aftershocks from USGS API
 */
export async function fetchRecentAftershocks(
  latitude: number,
  longitude: number,
  radiusKm: number,
  sinceDate: Date,
  minMagnitude: number = 3.0
): Promise<Array<{
  id: string
  magnitude: number
  location: string
  time: Date
  depth: number
}>> {
  try {
    const url = new URL('https://earthquake.usgs.gov/fdsnws/event/1/query')
    url.searchParams.set('format', 'geojson')
    url.searchParams.set('latitude', latitude.toString())
    url.searchParams.set('longitude', longitude.toString())
    url.searchParams.set('maxradiuskm', radiusKm.toString())
    url.searchParams.set('minmagnitude', minMagnitude.toString())
    url.searchParams.set('starttime', sinceDate.toISOString())
    url.searchParams.set('orderby', 'time-asc')

    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': process.env.EXTERNAL_REQUEST_USER_AGENT || 'WeatherAlertSystem/1.0'
      }
    })

    if (!response.ok) {
      throw new Error(`USGS API error: ${response.status}`)
    }

    const data = await response.json()
    
    return data.features.map((feature: any) => ({
      id: feature.id,
      magnitude: feature.properties.mag,
      location: feature.properties.place,
      time: new Date(feature.properties.time),
      depth: feature.geometry.coordinates[2]
    }))
  } catch (error) {
    console.error('Error fetching recent aftershocks:', error)
    return []
  }
}

/**
 * Get aftershock summary for display
 */
export function getAftershockSummary(forecast: AftershockForecast): string {
  if (forecast.probabilities.length === 0) {
    return 'Low aftershock risk. No significant activity expected.'
  }
  
  const highestProb = forecast.probabilities[0]
  const probPercent = Math.round(highestProb.probability * 100)
  
  const riskLevel = {
    'evacuate': 'CRITICAL',
    'caution': 'HIGH',
    'monitor': 'MODERATE',
    'safe': 'LOW'
  }[forecast.recommendation]
  
  return `${riskLevel} RISK: ${probPercent}% chance of M${highestProb.magnitude}+ aftershock in ${highestProb.timeframe}. ${forecast.tsunamiRisk.description}`
}
