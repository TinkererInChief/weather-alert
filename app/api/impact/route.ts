import { NextResponse } from 'next/server'
import { pagerService } from '@/lib/services/pager'
import { geonamesService } from '@/lib/services/geonames-service'
import { calculateShakingRadius } from '@/lib/event-calculations'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')
  const mag = searchParams.get('mag')
  const depth = searchParams.get('depth')
  const eventId = searchParams.get('eventId') // USGS event ID if available

  if (!lat || !lon || !mag) {
    return NextResponse.json(
      { error: 'Missing required parameters: lat, lon, mag' },
      { status: 400 }
    )
  }

  const latitude = parseFloat(lat)
  const longitude = parseFloat(lon)
  const magnitude = parseFloat(mag)
  const depthKm = depth ? parseFloat(depth) : 10 // Default to 10km if not provided

  try {
    // Strategy 1: Try USGS PAGER first (most accurate for processed earthquakes)
    if (eventId) {
      console.log(`🔍 Attempting to fetch PAGER data for event ${eventId}`)
      const pagerData = await pagerService.getImpactData(eventId)
      
      if (pagerData) {
        console.log('✅ PAGER data retrieved successfully')
        return NextResponse.json(pagerData)
      }
      
      console.log('ℹ️ PAGER data not available, falling back to GeoNames')
    }

    // Strategy 2: Fallback to GeoNames + estimated population exposure
    console.log('🔍 Fetching real city data from GeoNames')
    
    const radius = calculateShakingRadius(magnitude, depthKm)
    // GeoNames free tier supports radius up to 300km
    const maxSearchRadius = Math.min(radius.light, 300)
    
    const cities = await geonamesService.getNearbyCitiesWithIntensity(
      latitude,
      longitude,
      magnitude,
      depthKm,
      maxSearchRadius
    )

    if (cities.length === 0) {
      const message = process.env.GEONAMES_USERNAME === 'demo' || !process.env.GEONAMES_USERNAME
        ? 'Impact data unavailable. Please configure GEONAMES_USERNAME in environment variables.'
        : 'No populated areas within estimated impact radius'
      
      console.log(`⚠️ ${message}`)
      return NextResponse.json({
        strongShaking: 0,
        moderateShaking: 0,
        lightShaking: 0,
        totalAffected: 0,
        cities: [],
        source: 'no-data',
        message
      })
    }

    // Estimate population exposure based on real city data
    let strongShaking = 0
    let moderateShaking = 0
    let lightShaking = 0

    cities.forEach(city => {
      // Distribute city population based on intensity
      // This is a conservative estimate - only counting actual city populations
      if (city.intensity === 'Strong') {
        strongShaking += city.population
      } else if (city.intensity === 'Moderate') {
        moderateShaking += city.population
      } else if (city.intensity === 'Light') {
        lightShaking += city.population
      }
    })

    console.log(`✅ Real impact data calculated: ${cities.length} cities affected`)

    return NextResponse.json({
      strongShaking,
      moderateShaking,
      lightShaking,
      totalAffected: strongShaking + moderateShaking + lightShaking,
      cities: cities.map(c => ({
        name: c.name,
        population: c.population,
        distance: Math.round(c.distance),
        intensity: c.intensity
      })),
      source: 'geonames-estimated',
      dataSource: 'GeoNames API with calculated intensity'
    })

  } catch (error) {
    console.error('❌ Error fetching impact data:', error)
    
    return NextResponse.json({
      strongShaking: 0,
      moderateShaking: 0,
      lightShaking: 0,
      totalAffected: 0,
      cities: [],
      source: 'error',
      error: error instanceof Error ? error.message : 'Failed to fetch impact data',
      message: 'Real impact data unavailable'
    })
  }
}
