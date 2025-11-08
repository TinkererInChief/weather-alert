import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Update test vessels with realistic positions in Pacific Ocean region
 */

const pacificRegions = [
  // Tokyo Bay area
  { lat: 35.5, lon: 139.8, name: 'Tokyo Bay' },
  { lat: 35.4, lon: 139.6, name: 'Tokyo Bay' },
  { lat: 35.6, lon: 139.9, name: 'Tokyo Bay' },
  
  // Pacific Ocean (East of Japan)
  { lat: 36.0, lon: 142.0, name: 'Pacific (East Japan)' },
  { lat: 37.5, lon: 143.5, name: 'Pacific (East Japan)' },
  { lat: 38.3, lon: 142.4, name: 'Pacific (Tohoku)' },
  
  // South Pacific
  { lat: 10.0, lon: 145.0, name: 'South Pacific' },
  { lat: 12.5, lon: 150.0, name: 'South Pacific' },
  { lat: -5.0, lon: 155.0, name: 'South Pacific' },
  
  // Southeast Asia
  { lat: -8.5, lon: 119.5, name: 'Indonesia' },
  { lat: 1.3, lon: 103.8, name: 'Singapore Strait' },
  { lat: 14.6, lon: 120.9, name: 'Philippines' },
  
  // US West Coast
  { lat: 37.8, lon: -122.4, name: 'San Francisco' },
  { lat: 34.0, lon: -118.2, name: 'Los Angeles' },
  { lat: 47.6, lon: -122.3, name: 'Seattle' },
  
  // Hawaii region
  { lat: 21.3, lon: -157.8, name: 'Hawaii' },
  { lat: 20.0, lon: -156.0, name: 'Hawaii' },
  
  // Australia
  { lat: -33.9, lon: 151.2, name: 'Sydney' },
  { lat: -37.8, lon: 144.9, name: 'Melbourne' },
  
  // Indian Ocean
  { lat: 6.9, lon: 79.9, name: 'Sri Lanka' },
  { lat: -6.2, lon: 106.8, name: 'Jakarta' },
  
  // Additional scattered positions
  { lat: 25.0, lon: 121.5, name: 'Taiwan' },
  { lat: 22.3, lon: 114.2, name: 'Hong Kong' },
  { lat: 13.7, lon: 100.5, name: 'Thailand' },
]

async function main() {
  console.log('🌊 Updating vessel positions...')

  const vessels = await prisma.vessel.findMany({
    take: 25 // Update first 25 vessels
  })

  console.log(`📍 Found ${vessels.length} vessels to update`)

  for (let i = 0; i < vessels.length; i++) {
    const vessel = vessels[i]
    const position = pacificRegions[i % pacificRegions.length]
    
    // Add some randomization to avoid exact overlaps
    const lat = position.lat + (Math.random() - 0.5) * 1
    const lon = position.lon + (Math.random() - 0.5) * 1

    // Create a VesselPosition record
    await prisma.vesselPosition.create({
      data: {
        vesselId: vessel.id,
        latitude: lat,
        longitude: lon,
        speed: Math.random() * 20, // Random speed 0-20 knots
        course: Math.random() * 360, // Random course 0-360 degrees
        timestamp: new Date(),
        dataSource: 'AIS'
      }
    })

    console.log(`✅ ${vessel.name || vessel.mmsi}: ${lat.toFixed(2)}°N, ${lon.toFixed(2)}°E (${position.name})`)
  }

  console.log('\n✅ Vessel positions updated successfully!')
  console.log('🌊 Vessels are now positioned across the Pacific and Indian Ocean regions')
}

main()
  .catch((e) => {
    console.error('Error updating vessel positions:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
