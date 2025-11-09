import { NextResponse } from 'next/server'
import { TsunamiService } from '@/lib/services/tsunami-service'
import { prisma } from '@/lib/prisma'
import { dartEnrichmentService } from '@/lib/services/dart-enrichment.service'
import { dataAggregator } from '@/lib/data-sources/aggregator'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const limit = parseInt(searchParams.get('limit') || '200')

    // If startDate is provided, fetch historical data from database
    if (startDate) {
      console.log(`🌊 Fetching historical tsunami alerts from ${startDate}...`)
      
      // NOTE: The database stores all NOAA/PTWC polling results, creating many
      // duplicate records for the same event. We deduplicate to show unique events only.
      // Severity levels:
      // - 1: Information/Status (earthquake evaluated, no tsunami)
      // - 2: Advisory/Watch (minor tsunami threat)
      // - 3: Warning (significant tsunami threat)
      // - 4: Major Warning (severe tsunami threat)
      
      // Fetch all alerts and deduplicate by description (unique earthquake event)
      const allDbAlerts = await prisma.tsunamiAlert.findMany({
        where: {
          createdAt: {
            gte: new Date(startDate)
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      })
      
      // Deduplicate by description (each unique earthquake has a unique description)
      const uniqueAlertsMap = new Map<string, any>()
      
      for (const alert of allDbAlerts) {
        const rawData = (alert.rawData as any) || {}
        const description = rawData.description || ''
        
        // Keep the most recent record for each unique event
        if (description && !uniqueAlertsMap.has(description)) {
          uniqueAlertsMap.set(description, alert)
        }
      }
      
      // Convert map to array and apply limit
      const dbAlerts = Array.from(uniqueAlertsMap.values()).slice(0, limit)
      
      // Transform database records to match frontend expectations
      const alerts = dbAlerts.map((row) => {
        const rawData = (row.rawData as any) || {}
        const description = rawData.description || ''
        
        // Parse earthquake details from description
        // Format: "...Magnitude: 7.0(Mwp) Lat/Lon: 11.133 / 124.333 Affected Region: LEYTE PHILIPPINES..."
        const magMatch = description.match(/Magnitude:\s*([\d.]+)/)
        const latLonMatch = description.match(/Lat\/Lon:\s*([\d.-]+)\s*\/\s*([\d.-]+)/)
        const regionMatch = description.match(/Affected Region:\s*([^N]+?)(?:\s*Note:|$)/)
        
        const magnitude = magMatch ? parseFloat(magMatch[1]) : null
        const latitude = latLonMatch ? parseFloat(latLonMatch[1]) : null
        const longitude = latLonMatch ? parseFloat(latLonMatch[2]) : null
        const region = regionMatch ? regionMatch[1].trim() : 'Unknown location'
        
        // Determine tsunami status from description
        const noTsunami = description.includes('NO tsunami') || 
                         description.includes('no tsunami danger') ||
                         description.includes('not expected to generate a tsunami')
        
        return {
          id: row.id,
          tsunamiId: row.eventId,
          title: `M${magnitude || '?'} Earthquake ${noTsunami ? '(No Tsunami)' : ''}`,
          location: region,
          ocean: extractOcean(region),
          threat: {
            level: noTsunami ? 'info' : (row.severityLevel >= 3 ? 'warning' : row.severityLevel >= 2 ? 'watch' : 'advisory')
          },
          urgency: noTsunami ? 'Info' : rawData.urgency || row.alertType,
          severity: noTsunami ? 'None' : (row.severityLevel >= 3 ? 'Severe' : row.severityLevel >= 2 ? 'Moderate' : 'Minor'),
          description: description,
          instruction: rawData.instruction || 'No tsunami threat expected from this earthquake.',
          messageType: row.alertType,
          source: row.source,
          latitude: latitude,
          longitude: longitude,
          magnitude: magnitude,
          processedAt: row.createdAt,
          createdAt: row.createdAt,
          timestamp: row.createdAt,
          time: row.createdAt
        }
      })

      return NextResponse.json({
        success: true,
        message: `Fetched ${alerts.length} historical tsunami alerts`,
        data: {
          alertCount: alerts.length,
          alerts,
          sources: Array.from(new Set(alerts.map((a: any) => a.source))),
          lastChecked: new Date().toISOString()
        }
      }, {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
          'CDN-Cache-Control': 'public, s-maxage=60'
        }
      })
    }

    // Otherwise, fetch new alerts from external sources with DART enrichment
    console.log('🌊 Starting tsunami alert monitoring with DART enrichment...')
    
    // Fetch from all tsunami sources (PTWC, JMA, DART, GeoNet)
    const rawAlerts = await dataAggregator.fetchAggregatedTsunamiAlerts()
    console.log(`📊 Raw alerts fetched: ${rawAlerts.length} from sources:`, Array.from(new Set(rawAlerts.map(a => a.source))))
    
    // Enrich with DART confirmation data
    const enrichedAlerts = await dartEnrichmentService.enrichAlerts(rawAlerts)
    console.log(`✨ Enriched alerts: ${enrichedAlerts.length}`)
    
    if (enrichedAlerts.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No active tsunami alerts',
        data: {
          alertCount: 0,
          alerts: [],
          sources: ['PTWC', 'JMA', 'DART', 'GeoNet'],
          lastChecked: new Date().toISOString()
        }
      })
    }

    // Store enriched alerts in database (maintain backwards compatibility)
    const tsunamiService = TsunamiService.getInstance()
    const storedAlerts = []
    
    for (const alert of enrichedAlerts) {
      try {
        // Convert to legacy format for storage
        const legacyAlert = {
          id: alert.id,
          source: alert.source,
          title: alert.title,
          category: alert.category,
          urgency: alert.severity >= 4 ? 'Immediate' : alert.severity >= 3 ? 'Expected' : 'Future',
          severity: alert.severity >= 4 ? 'Extreme' : alert.severity >= 3 ? 'Severe' : 'Moderate',
          description: alert.description || '',
          instruction: alert.instructions || '',
          location: alert.affectedRegions.join(', '),
          latitude: alert.latitude,
          longitude: alert.longitude,
          threat: {
            level: alert.category.toLowerCase(),
            confidence: alert.confidence || 50,
            affectedRegions: alert.affectedRegions
          },
          processedAt: new Date().toISOString()
        }
        
        await tsunamiService.storeTsunamiAlert(legacyAlert as any)
        storedAlerts.push({
          ...alert,
          processedAt: new Date().toISOString()
        })
      } catch (error) {
        console.error(`❌ Error storing alert ${alert.id}:`, error)
      }
    }

    // Always show all configured sources, not just ones with active alerts
    const allSources = ['PTWC', 'JMA', 'DART', 'GeoNet']
    
    return NextResponse.json({
      success: true,
      message: `Processed ${storedAlerts.length} tsunami alerts with DART enrichment`,
      data: {
        alertCount: storedAlerts.length,
        alerts: storedAlerts,
        sources: allSources,
        activeSources: Array.from(new Set(storedAlerts.map(a => a.source))),
        dartEnabled: true,
        lastChecked: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('❌ Tsunami monitoring error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch tsunami alerts',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Helper function to extract ocean name from location string
function extractOcean(location: string): string {
  const oceans = ['Pacific', 'Atlantic', 'Indian', 'Arctic', 'Southern']
  for (const ocean of oceans) {
    if (location.includes(ocean)) return `${ocean} Ocean`
  }
  return 'Unknown'
}

export async function POST() {
  try {
    console.log('🌊 Manual tsunami alert check triggered...')
    
    // This endpoint allows manual triggering of tsunami monitoring
    const tsunamiService = TsunamiService.getInstance()
    const alerts = await tsunamiService.getNewTsunamiAlerts()
    
    return NextResponse.json({
      success: true,
      message: 'Manual tsunami check completed',
      data: {
        alertCount: alerts.length,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('❌ Manual tsunami check error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Manual tsunami check failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
