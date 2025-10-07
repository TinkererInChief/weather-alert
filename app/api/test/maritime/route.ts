import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/test/maritime
 * Create test earthquake alerts with coastal coordinates for maritime testing
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await req.json()
    const { location } = body

    // Test location presets with coastal coordinates
    const testLocations: Record<string, {
      location: string
      latitude: number
      longitude: number
      magnitude: number
      depth: number
      description: string
    }> = {
      'san-francisco': {
        location: 'San Francisco Bay, California',
        latitude: 37.81,
        longitude: -122.47,
        magnitude: 6.5,
        depth: 10,
        description: 'Near San Francisco - Best for testing all 4 panels (NDBC buoy, tide station, aftershocks, SAR)'
      },
      'seattle': {
        location: 'Puget Sound, Washington',
        latitude: 47.60,
        longitude: -122.34,
        magnitude: 6.2,
        depth: 15,
        description: 'Puget Sound - Good coastal data availability'
      },
      'socal': {
        location: 'Southern California Coast',
        latitude: 34.27,
        longitude: -120.47,
        magnitude: 6.8,
        depth: 8,
        description: 'Southern California - Near multiple buoys and tide stations'
      },
      'hawaii': {
        location: 'Hawaiian Islands',
        latitude: 21.31,
        longitude: -157.87,
        magnitude: 7.0,
        depth: 12,
        description: 'Hawaii - Pacific Ocean data, high tsunami potential'
      },
      'alaska': {
        location: 'Gulf of Alaska',
        latitude: 56.30,
        longitude: -148.07,
        magnitude: 6.5,
        depth: 20,
        description: 'Alaska - Arctic/Pacific data sources'
      }
    }

    const selectedLocation = location || 'san-francisco'
    const testData = testLocations[selectedLocation]

    if (!testData) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Invalid location. Choose from: ${Object.keys(testLocations).join(', ')}`,
          availableLocations: Object.keys(testLocations)
        },
        { status: 400 }
      )
    }

    // Create earthquake ID
    const earthquakeId = `test-maritime-${selectedLocation}-${Date.now()}`
    const timestamp = new Date()

    // Get all active contacts for notification simulation
    const contacts = await prisma.contact.findMany({
      where: { active: true }
    })

    // Create alert log entry
    await prisma.alertLog.create({
      data: {
        earthquakeId,
        magnitude: testData.magnitude,
        location: testData.location,
        latitude: testData.latitude,
        longitude: testData.longitude,
        depth: testData.depth,
        timestamp,
        contactsNotified: contacts.length,
        success: true,
        primarySource: 'TEST',
        dataSources: ['TEST-MARITIME'],
        sourceMetadata: {
          testLocation: selectedLocation,
          description: testData.description,
          generatedAt: timestamp.toISOString()
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: `Maritime test earthquake created: ${testData.location}`,
      data: {
        earthquakeId,
        location: testData.location,
        coordinates: {
          latitude: testData.latitude,
          longitude: testData.longitude
        },
        magnitude: testData.magnitude,
        depth: testData.depth,
        timestamp: timestamp.toISOString(),
        contactsNotified: contacts.length,
        description: testData.description,
        expectedPanels: [
          '🌊 Sea State (NOAA NDBC)',
          '🌀 Tidal (NOAA CO-OPS)',
          '⚡ Aftershocks (USGS)',
          '🚁 SAR Resources'
        ],
        dashboardUrl: '/dashboard',
        note: 'Refresh dashboard to see the Maritime Intelligence Widget with all 4 environmental panels'
      }
    })
  } catch (error) {
    console.error('[Maritime Test API] Error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create maritime test data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/test/maritime
 * List available test locations
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    availableLocations: {
      'san-francisco': {
        location: 'San Francisco Bay, California',
        coordinates: [37.81, -122.47],
        magnitude: 6.5,
        description: 'Best for testing all 4 panels'
      },
      'seattle': {
        location: 'Puget Sound, Washington',
        coordinates: [47.60, -122.34],
        magnitude: 6.2,
        description: 'Good coastal data'
      },
      'socal': {
        location: 'Southern California Coast',
        coordinates: [34.27, -120.47],
        magnitude: 6.8,
        description: 'Multiple data sources'
      },
      'hawaii': {
        location: 'Hawaiian Islands',
        coordinates: [21.31, -157.87],
        magnitude: 7.0,
        description: 'Pacific Ocean data'
      },
      'alaska': {
        location: 'Gulf of Alaska',
        coordinates: [56.30, -148.07],
        magnitude: 6.5,
        description: 'Arctic/Pacific sources'
      }
    },
    usage: {
      create: 'POST /api/test/maritime with {"location": "san-francisco"}',
      list: 'GET /api/test/maritime',
      defaultLocation: 'san-francisco (if location param omitted)'
    }
  })
}
