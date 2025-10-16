import { EarthquakeFeature } from '@/types/earthquake'
import { BaseDataSource, FetchOptions } from './base-source'

/**
 * IRIS (Incorporated Research Institutions for Seismology) data source
 * Coverage: Global (aggregates data from multiple seismic networks)
 * Update frequency: Real-time
 * 
 * IRIS DMC provides FDSN web services that aggregate data from multiple
 * seismological networks worldwide, including some regional networks
 * that may not be directly accessible.
 * 
 * Commercial Use: ✅ Allowed (NSF-funded, open data)
 * Attribution: Requested but not required
 * License: Open access
 */
export class IRISSource extends BaseDataSource {
  readonly name = 'IRIS'
  readonly coverage = ['Global', 'Multi-network aggregation']
  readonly updateFrequency = 60 // seconds
  
  // IRIS FDSN web service endpoint
  private readonly baseUrl = 'https://service.iris.edu/fdsnws/event/1/query'
  
  protected async healthCheck(): Promise<void> {
    const response = await fetch('https://service.iris.edu/', {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000)
    })
    
    if (!response.ok) {
      throw new Error(`IRIS health check failed: ${response.status}`)
    }
  }
  
  async fetchEarthquakes(options?: FetchOptions): Promise<EarthquakeFeature[]> {
    const fetchStartTime = Date.now()
    
    try {
      // Build FDSN query parameters
      // Note: IRIS FDSN uses 'text' format for simple parsing
      // QuakeML is the default but more complex to parse
      const params = new URLSearchParams({
        format: 'text',
        // Request newest first so service can short-circuit sooner
        orderby: 'time'
      })
      
      // Time window
      const windowHours = options?.timeWindowHours ?? 12 // narrow default window
      const endTime = new Date()
      const startTime = new Date(endTime.getTime() - windowHours * 60 * 60 * 1000)
      params.append('starttime', startTime.toISOString())
      params.append('endtime', endTime.toISOString())
      
      // Magnitude filter
      if (options?.minMagnitude) {
        params.append('minmagnitude', options.minMagnitude.toString())
      } else {
        params.append('minmagnitude', '4.0') // Default minimum
      }
      
      // Bounding box (if specified)
      if (options?.boundingBox) {
        const [minLat, minLon, maxLat, maxLon] = options.boundingBox
        params.append('minlatitude', minLat.toString())
        params.append('minlongitude', minLon.toString())
        params.append('maxlatitude', maxLat.toString())
        params.append('maxlongitude', maxLon.toString())
      }
      
      const response = await fetch(`${this.baseUrl}?${params}`, {
        signal: AbortSignal.timeout(10000),
        headers: {
          'Accept': 'text/plain',
          'User-Agent': 'EmergencyAlertSystem/1.0',
          'Cache-Control': 'no-cache'
        }
      })
      
      // Treat 204 (no content) and 404 (no data) as empty results
      if (response.status === 204 || response.status === 404) {
        this.recordSuccess()
        this.recordResponseTime(Date.now() - fetchStartTime)
        return []
      }

      if (!response.ok) {
        throw new Error(`IRIS fetch failed: ${response.status}`)
      }
      
      const textData = await response.text()
      
      this.recordSuccess()
      this.recordResponseTime(Date.now() - fetchStartTime)
      
      // Parse IRIS text format and convert to GeoJSON
      const earthquakes = this.parseIRISTextFormat(textData)
      
      console.log(`✅ IRIS: Retrieved ${earthquakes.length} earthquakes`)
      
      return earthquakes
      
    } catch (error) {
      this.recordFailure(error instanceof Error ? error : new Error('Unknown error'))
      throw error
    }
  }
  
  /**
   * Parse IRIS FDSN text format and convert to GeoJSON
   * 
   * IRIS text format:
   * #EventID | Time | Latitude | Longitude | Depth/km | Author | Catalog | Contributor | ContributorID | MagType | Magnitude | MagAuthor | EventLocationName
   */
  private parseIRISTextFormat(textData: string): EarthquakeFeature[] {
    const earthquakes: EarthquakeFeature[] = []
    const lines = textData.split('\n')
    
    for (const line of lines) {
      // Skip header and empty lines
      if (line.startsWith('#') || line.trim() === '') {
        continue
      }
      
      try {
        const parts = line.split('|').map(p => p.trim())
        
        if (parts.length < 13) {
          continue // Invalid line
        }
        
        const [
          eventId,
          timeStr,
          latStr,
          lonStr,
          depthStr,
          author,
          catalog,
          contributor,
          contributorId,
          magType,
          magStr,
          magAuthor,
          locationName
        ] = parts
        
        const magnitude = parseFloat(magStr)
        const latitude = parseFloat(latStr)
        const longitude = parseFloat(lonStr)
        const depth = parseFloat(depthStr)
        const time = new Date(timeStr).getTime()
        
        // Convert to GeoJSON format (compatible with USGS format)
        const earthquake: EarthquakeFeature = {
          type: 'Feature',
          properties: {
            mag: magnitude,
            place: locationName,
            time,
            updated: time,
            tz: null,
            url: `https://service.iris.edu/fdsnws/event/1/query?eventid=${eventId}`,
            detail: `https://service.iris.edu/fdsnws/event/1/query?eventid=${eventId}`,
            felt: null,
            cdi: null,
            mmi: null,
            alert: null,
            status: 'reviewed',
            tsunami: 0,
            sig: Math.round(magnitude * 100),
            net: contributor,
            code: contributorId,
            ids: eventId,
            sources: contributor,
            types: ',phase-data,origin,',
            nst: null,
            dmin: null,
            rms: 0,
            gap: null,
            magType,
            type: 'earthquake',
            title: `M ${magnitude} - ${locationName}`
          },
          geometry: {
            type: 'Point',
            coordinates: [longitude, latitude, depth]
          },
          id: eventId
        }
        
        earthquakes.push(earthquake)
      } catch (err) {
        console.warn('Failed to parse IRIS line:', line, err)
        continue
      }
    }
    
    return earthquakes
  }
}
