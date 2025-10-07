/**
 * Maritime Services Integration Tests
 * Tests all Phase 1 data sources with real-world scenarios
 */

import { calculateMaritimeImpact, type EarthquakeEvent } from '@/lib/maritime-impact-scorer'
import { fetchSeaState, getSeaStateSummary, findNearestBuoy } from '@/lib/services/noaa-ndbc-service'
import { fetchTidalData, getTidalSummary, calculateTsunamiAmplification } from '@/lib/services/noaa-tides-service'
import { fetchAftershockForecast, getAftershockSummary } from '@/lib/services/usgs-aftershock-service'
import { findSARResources, getSARSummary } from '@/lib/services/sar-service'

// Test Scenarios
const testEvents: EarthquakeEvent[] = [
  {
    id: 'test-yukon',
    magnitude: 4.8,
    latitude: 61.41,
    longitude: -140.10,
    depth: 10,
    location: 'Southern Yukon Territory, Canada',
    timestamp: new Date('2025-10-05T17:04:02Z'),
    tsunamiWarning: false
  },
  {
    id: 'test-japan',
    magnitude: 7.2,
    latitude: 35.65,
    longitude: 139.77,
    depth: 10,
    location: 'Near Tokyo, Japan',
    timestamp: new Date('2025-10-05T12:00:00Z'),
    tsunamiWarning: true
  },
  {
    id: 'test-chile',
    magnitude: 5.5,
    latitude: -33.03,
    longitude: -71.60,
    depth: 25,
    location: 'Off Coast of Chile',
    timestamp: new Date('2025-10-05T08:30:00Z'),
    tsunamiWarning: false
  },
  {
    id: 'test-philippines',
    magnitude: 6.8,
    latitude: 7.50,
    longitude: 126.50,
    depth: 35,
    location: 'Mindanao, Philippines',
    timestamp: new Date('2025-10-05T14:15:00Z'),
    tsunamiWarning: true
  }
]

/**
 * Test 1: Maritime Impact Scoring
 */
export async function testMaritimeScoring() {
  console.log('\n========== TEST 1: MARITIME IMPACT SCORING ==========\n')
  
  for (const event of testEvents) {
    const score = calculateMaritimeImpact(event)
    
    console.log(`Event: ${event.location} (M${event.magnitude})`)
    console.log(`├─ Total Score: ${score.totalScore}/100`)
    console.log(`├─ Priority: ${score.priority.toUpperCase()}`)
    console.log(`├─ Should Display: ${score.shouldDisplay ? 'YES' : 'NO'}`)
    console.log(`├─ Should Auto-Fetch: ${score.shouldAutoFetch ? 'YES' : 'NO'}`)
    console.log(`├─ Refresh Interval: ${score.refreshInterval ? `${score.refreshInterval / 1000}s` : 'MANUAL'}`)
    console.log(`├─ Factor Breakdown:`)
    console.log(`│  ├─ Magnitude: ${score.factors.magnitude}/30`)
    console.log(`│  ├─ Proximity to Shipping: ${score.factors.proximityToShipping}/25`)
    console.log(`│  ├─ Tsunami Risk: ${score.factors.tsunamiRisk}/25`)
    console.log(`│  ├─ Port Density: ${score.factors.portDensity}/15`)
    console.log(`│  └─ Historical Impact: ${score.factors.historicalImpact}/5`)
    console.log(`└─ Affected Assets:`)
    console.log(`   ├─ Nearby Ports: ${score.affectedAssets.nearbyPorts.length}`)
    console.log(`   ├─ Shipping Lanes: ${score.affectedAssets.shippingLanes.join(', ') || 'None'}`)
    console.log(`   └─ Est. Vessels in Range: ${score.affectedAssets.estimatedVesselsInRange}`)
    console.log('')
  }
}

/**
 * Test 2: NOAA NDBC Sea State Data
 */
export async function testSeaStateData() {
  console.log('\n========== TEST 2: SEA STATE DATA (NOAA NDBC) ==========\n')
  
  for (const event of testEvents.slice(1, 3)) { // Test Japan and Chile
    console.log(`Event: ${event.location}`)
    console.log(`Coordinates: ${event.latitude}, ${event.longitude}`)
    
    // Find nearest buoy
    const nearestBuoy = findNearestBuoy(event.latitude, event.longitude)
    if (nearestBuoy) {
      console.log(`├─ Nearest Buoy: ${nearestBuoy.buoy.name}`)
      console.log(`├─ Distance: ${Math.round(nearestBuoy.distance)}km`)
      console.log(`└─ Region: ${nearestBuoy.buoy.region}`)
    } else {
      console.log(`└─ No buoy within 500km`)
    }
    
    // Fetch sea state (will be null if too far or API issues)
    try {
      const seaState = await fetchSeaState(event.latitude, event.longitude)
      if (seaState) {
        console.log(`\n   Sea State Data:`)
        console.log(`   ├─ Wave Height: ${seaState.waveHeight}m`)
        console.log(`   ├─ Wave Period: ${seaState.dominantWavePeriod}s`)
        console.log(`   ├─ Wind Speed: ${seaState.windSpeed} m/s`)
        console.log(`   ├─ Wind Direction: ${seaState.windDirection}°`)
        console.log(`   ├─ Water Temp: ${seaState.waterTemperature}°C`)
        console.log(`   ├─ Data Quality: ${seaState.dataQuality}`)
        console.log(`   └─ Summary: ${getSeaStateSummary(seaState)}`)
      } else {
        console.log(`   └─ Sea state data not available (buoy too far or offline)`)
      }
    } catch (error) {
      console.log(`   └─ Error: ${error}`)
    }
    console.log('')
  }
}

/**
 * Test 3: NOAA Tidal Data
 */
export async function testTidalData() {
  console.log('\n========== TEST 3: TIDAL DATA (NOAA CO-OPS) ==========\n')
  
  for (const event of testEvents.slice(1, 3)) {
    console.log(`Event: ${event.location}`)
    console.log(`Coordinates: ${event.latitude}, ${event.longitude}`)
    
    try {
      const tidalData = await fetchTidalData(event.latitude, event.longitude)
      if (tidalData) {
        console.log(`├─ Station: ${tidalData.stationName}`)
        console.log(`├─ Current Level: ${tidalData.currentLevel.toFixed(2)}m`)
        console.log(`├─ Tidal State: ${tidalData.tidalState}`)
        console.log(`├─ Next High Tide: ${tidalData.nextHighTide.time.toLocaleString()} (${tidalData.nextHighTide.height.toFixed(2)}m)`)
        console.log(`├─ Next Low Tide: ${tidalData.nextLowTide.time.toLocaleString()} (${tidalData.nextLowTide.height.toFixed(2)}m)`)
        console.log(`├─ Tidal Range: ${tidalData.tidalRange.toFixed(2)}m`)
        console.log(`└─ Summary: ${getTidalSummary(tidalData)}`)
        
        // If tsunami warning, calculate amplification
        if (event.tsunamiWarning) {
          const amplification = calculateTsunamiAmplification(tidalData, 3.0) // Assume 3m tsunami
          console.log(`\n   Tsunami Amplification:`)
          console.log(`   ├─ Baseline High Tide: ${amplification.baselineHigh.toFixed(2)}m`)
          console.log(`   ├─ Tsunami Wave: ${amplification.tsunamiWaveHeight.toFixed(2)}m`)
          console.log(`   ├─ Combined Height: ${amplification.combinedHeight.toFixed(2)}m`)
          console.log(`   ├─ Amplification Factor: ${amplification.amplificationFactor.toFixed(2)}x`)
          console.log(`   ├─ Risk Level: ${amplification.riskLevel.toUpperCase()}`)
          console.log(`   └─ Recommendation: ${amplification.recommendation}`)
        }
      } else {
        console.log(`└─ Tidal data not available (station too far)`)
      }
    } catch (error) {
      console.log(`└─ Error: ${error}`)
    }
    console.log('')
  }
}

/**
 * Test 4: USGS Aftershock Forecasts
 */
export async function testAftershockForecasts() {
  console.log('\n========== TEST 4: AFTERSHOCK FORECASTS (USGS) ==========\n')
  
  for (const event of testEvents.slice(1, 4)) { // Test significant events
    console.log(`Event: ${event.location} (M${event.magnitude})`)
    
    const forecast = await fetchAftershockForecast(
      event.id,
      event.magnitude,
      event.latitude,
      event.longitude,
      event.depth,
      event.location,
      event.timestamp
    )
    
    if (forecast) {
      console.log(`├─ Forecast Confidence: ${forecast.confidence.toUpperCase()}`)
      console.log(`├─ Recommendation: ${forecast.recommendation.toUpperCase()}`)
      console.log(`├─ Probabilities:`)
      forecast.probabilities.forEach((prob, i) => {
        console.log(`│  ${i === forecast.probabilities.length - 1 ? '└' : '├'}─ M${prob.magnitude}+: ${Math.round(prob.probability * 100)}% in ${prob.timeframe} (~${prob.expectedCount} events)`)
      })
      console.log(`├─ Tsunami Risk:`)
      console.log(`│  ├─ Possible: ${forecast.tsunamiRisk.possible ? 'YES' : 'NO'}`)
      console.log(`│  ├─ Monitoring: ${forecast.tsunamiRisk.monitoring ? 'ACTIVE' : 'INACTIVE'}`)
      console.log(`│  └─ Description: ${forecast.tsunamiRisk.description}`)
      console.log(`└─ Summary: ${getAftershockSummary(forecast)}`)
    }
    console.log('')
  }
}

/**
 * Test 5: SAR Resources
 */
export async function testSARResources() {
  console.log('\n========== TEST 5: SAR RESOURCES ==========\n')
  
  for (const event of testEvents) {
    console.log(`Event: ${event.location}`)
    console.log(`Coordinates: ${event.latitude}, ${event.longitude}`)
    
    const sarData = findSARResources(event.latitude, event.longitude, 500)
    
    if (sarData.nearestCoastGuard) {
      const cg = sarData.nearestCoastGuard
      console.log(`├─ Nearest Coast Guard: ${cg.name}`)
      console.log(`│  ├─ Distance: ${Math.round(cg.distance)}km`)
      console.log(`│  ├─ ETA: ${cg.estimatedResponseTime} minutes`)
      console.log(`│  ├─ Phone: ${cg.contact.phone}`)
      console.log(`│  └─ VHF: ${cg.contact.vhf || 'N/A'}`)
    } else {
      console.log(`├─ No Coast Guard station within 500km`)
    }
    
    if (sarData.nearestSalvageTug) {
      const tug = sarData.nearestSalvageTug
      console.log(`├─ Nearest Salvage Tug: ${tug.name}`)
      console.log(`│  ├─ Distance: ${Math.round(tug.distance)}km`)
      console.log(`│  └─ ETA: ${tug.estimatedResponseTime} minutes`)
    }
    
    console.log(`├─ Overall Capability: ${sarData.overallResponseCapability.toUpperCase()}`)
    console.log(`├─ Total Resources in Range: ${sarData.allResourcesWithin500km.length}`)
    console.log(`└─ Summary: ${getSARSummary(sarData)}`)
    console.log('')
  }
}

/**
 * Test 6: Complete Integration
 */
export async function testCompleteIntegration() {
  console.log('\n========== TEST 6: COMPLETE INTEGRATION ==========\n')
  console.log('Testing M7.2 Japan Earthquake with ALL data sources...\n')
  
  const event = testEvents[1] // Japan M7.2
  
  // 1. Impact Score
  const score = calculateMaritimeImpact(event)
  console.log(`1. IMPACT ASSESSMENT`)
  console.log(`   Score: ${score.totalScore}/100 - ${score.priority.toUpperCase()}`)
  console.log(`   Auto-fetch: ${score.shouldAutoFetch ? 'YES' : 'NO'}`)
  console.log('')
  
  // 2. Sea State
  console.log(`2. SEA CONDITIONS`)
  try {
    const seaState = await fetchSeaState(event.latitude, event.longitude)
    if (seaState) {
      console.log(`   ${getSeaStateSummary(seaState)}`)
    } else {
      console.log(`   Data not available`)
    }
  } catch (e) {
    console.log(`   Error: ${e}`)
  }
  console.log('')
  
  // 3. Tidal
  console.log(`3. TIDAL CONDITIONS`)
  try {
    const tidal = await fetchTidalData(event.latitude, event.longitude)
    if (tidal) {
      console.log(`   ${getTidalSummary(tidal)}`)
      if (event.tsunamiWarning) {
        const amp = calculateTsunamiAmplification(tidal, 3.0)
        console.log(`   Tsunami + Tide Risk: ${amp.riskLevel.toUpperCase()} (${amp.combinedHeight.toFixed(1)}m combined)`)
      }
    } else {
      console.log(`   Data not available`)
    }
  } catch (e) {
    console.log(`   Error: ${e}`)
  }
  console.log('')
  
  // 4. Aftershocks
  console.log(`4. AFTERSHOCK FORECAST`)
  const forecast = await fetchAftershockForecast(
    event.id, event.magnitude, event.latitude, event.longitude,
    event.depth, event.location, event.timestamp
  )
  if (forecast) {
    console.log(`   ${getAftershockSummary(forecast)}`)
  }
  console.log('')
  
  // 5. SAR
  console.log(`5. SAR RESOURCES`)
  const sar = findSARResources(event.latitude, event.longitude)
  console.log(`   ${getSARSummary(sar)}`)
  console.log('')
  
  console.log(`========== INTEGRATION TEST COMPLETE ==========`)
}

/**
 * Run all tests
 */
export async function runAllTests() {
  console.log('\n')
  console.log('╔════════════════════════════════════════════════════════╗')
  console.log('║     MARITIME INTELLIGENCE PHASE 1 TEST SUITE          ║')
  console.log('╚════════════════════════════════════════════════════════╝')
  
  await testMaritimeScoring()
  await testSeaStateData()
  await testTidalData()
  await testAftershockForecasts()
  await testSARResources()
  await testCompleteIntegration()
  
  console.log('\n✅ All tests completed!\n')
}

// Export for command-line testing
if (require.main === module) {
  runAllTests().catch(console.error)
}
