import { BaseDataSource, TsunamiAlert } from './base-source'
import { EarthquakeFeature } from '@/types/earthquake'

/**
 * GeoNet - New Zealand's geological hazard information system
 * Operated by GNS Science
 * Coverage: New Zealand, Southwest Pacific
 * Update frequency: Real-time
 * 
 * Data License: Creative Commons Attribution 3.0 New Zealand License
 * Attribution: REQUIRED - "Data from GeoNet, GNS Science, New Zealand"
 * Commercial Use: Permitted with attribution
 * 
 * APIs:
 * - GeoNet API: https://api.geonet.org.nz/
 * - FDSN Web Services: https://service.geonet.org.nz/fdsnws/event/1/
 */
export class GeoNetSource extends BaseDataSource {
  readonly name = 'GeoNet'
  readonly coverage = ['New Zealand', 'Southwest Pacific', 'Kermadec Islands']
  readonly updateFrequency = 60 // seconds

  private readonly apiUrl = 'https://api.geonet.org.nz'
  private readonly fdsnUrl = 'https://service.geonet.org.nz/fdsnws/event/1/query'
  
  protected async healthCheck(): Promise<void> {
    const response = await fetch(this.apiUrl, {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000)
    })
    
    if (!response.ok) {
      throw new Error(`GeoNet health check failed: ${response.status}`)
    }
  }

  async fetchEarthquakes(options?: { minMagnitude?: number }): Promise<EarthquakeFeature[]> {
    const fetchStartTime = Date.now()
    
    try {
      const minMag = options?.minMagnitude || 4.0
      
      // Use GeoNet's simple quake API
      // Returns felt earthquakes in NZ region, last 365 days
      const response = await fetch(`${this.apiUrl}/quake?MMI=${Math.floor(minMag)}`, {
        signal: AbortSignal.timeout(10000),
        headers: {
          'Accept': 'application/vnd.geo+json;version=2',
          'User-Agent': 'EmergencyAlertSystem/1.0'
        }
      })

      if (!response.ok) {
        this.recordFailure(new Error(`GeoNet fetch failed: ${response.status}`))
        return []
      }

      const data = await response.json()
      this.recordSuccess()
      this.recordResponseTime(Date.now() - fetchStartTime)

      return this.convertGeoNetToStandard(data, minMag)

    } catch (error) {
      this.recordFailure(error instanceof Error ? error : new Error('Unknown error'))
      return []
    }
  }

  private convertGeoNetToStandard(data: any, minMag: number): EarthquakeFeature[] {
    const earthquakes: EarthquakeFeature[] = []
    
    if (!data?.features || !Array.isArray(data.features)) {
      return earthquakes
    }

    for (const feature of data.features) {
      try {
        const props = feature.properties || {}
        const coords = feature.geometry?.coordinates || []
        
        const magnitude = parseFloat(props.magnitude || props.mag || 0)
        if (magnitude < minMag) continue

        const lon = parseFloat(coords[0] || 0)
        const lat = parseFloat(coords[1] || 0)
        const depth = parseFloat(coords[2] || 0)
        
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue

        const time = props.time ? new Date(props.time).getTime() : 
                     props.origintime ? new Date(props.origintime).getTime() : Date.now()
        
        const publicId = props.publicid || props.publicID || feature.id || `geonet_${time}_${lat}_${lon}`
        const locality = props.locality || 'New Zealand region'
        const depth_km = depth < 0 ? Math.abs(depth) : depth

        const earthquake: EarthquakeFeature = {
          type: 'Feature',
          id: `geonet_${publicId}`,
          properties: {
            mag: magnitude,
            place: locality,
            time,
            updated: time,
            tz: 720, // NZST is UTC+12
            url: `https://www.geonet.org.nz/earthquake/${publicId}`,
            detail: `https://api.geonet.org.nz/quake/${publicId}`,
            felt: null,
            cdi: null,
            mmi: props.mmi ? parseFloat(props.mmi) : null,
            alert: null,
            status: props.quality || 'reviewed',
            tsunami: 0, // GeoNet doesn't directly flag tsunami in quake feed
            sig: Math.round(magnitude * 100),
            net: 'geonet',
            code: String(publicId),
            ids: `geonet${publicId}`,
            sources: 'geonet',
            types: 'origin,magnitude',
            nst: null,
            dmin: null,
            rms: 0,
            gap: null,
            magType: 'M',
            type: 'earthquake',
            title: `M ${magnitude.toFixed(1)} - ${locality}`
          },
          geometry: {
            type: 'Point',
            coordinates: [lon, lat, depth_km]
          }
        }

        earthquakes.push(earthquake)
      } catch (err) {
        console.warn('Failed to parse GeoNet earthquake:', err)
        continue
      }
    }

    return earthquakes
  }

  /**
   * Fetch tsunami alerts from GeoNet CAP feed
   * GeoNet provides CAP (Common Alerting Protocol) format alerts
   */
  async fetchTsunamiAlerts(): Promise<TsunamiAlert[]> {
    const fetchStartTime = Date.now()
    
    try {
      // First get recent significant earthquakes
      const earthquakes = await this.fetchEarthquakes({ minMagnitude: 6.0 })
      const alerts: TsunamiAlert[] = []

      // For each significant earthquake, check if CAP alert exists
      for (const eq of earthquakes.slice(0, 5)) {
        try {
          const publicId = eq.properties.code
          const capUrl = `${this.apiUrl}/cap/1.2/GPA1.0/quake/${publicId}`
          
          const response = await fetch(capUrl, {
            signal: AbortSignal.timeout(5000),
            headers: { 'User-Agent': 'EmergencyAlertSystem/1.0' }
          })

          if (!response.ok) continue

          const capXml = await response.text()
          const alert = this.parseGeoNetCAP(capXml, eq)
          
          if (alert) alerts.push(alert)
        } catch {
          continue
        }
      }

      this.recordSuccess()
      this.recordResponseTime(Date.now() - fetchStartTime)
      return alerts

    } catch (error) {
      this.recordFailure(error instanceof Error ? error : new Error('Unknown error'))
      return []
    }
  }

  private parseGeoNetCAP(capXml: string, earthquake: EarthquakeFeature): TsunamiAlert | null {
    try {
      // Simple XML parsing for tsunami keywords
      // In production, you'd want a proper XML parser
      const hasTsunami = capXml.toLowerCase().includes('tsunami')
      if (!hasTsunami) return null

      const props = earthquake.properties
      const coords = earthquake.geometry.coordinates
      
      // Extract severity from CAP
      let category = 'INFORMATION'
      let severity = 2
      let instructions = 'Monitor for updates. Tsunami assessment in progress.'

      if (capXml.includes('<severity>Extreme</severity>')) {
        category = 'WARNING'
        severity = 5
        instructions = 'TSUNAMI WARNING: Evacuate coastal areas immediately. Move to high ground.'
      } else if (capXml.includes('<severity>Severe</severity>')) {
        category = 'WARNING'
        severity = 4
        instructions = 'Tsunami warning in effect. Evacuate low-lying coastal areas.'
      } else if (capXml.includes('<urgency>Expected</urgency>')) {
        category = 'WATCH'
        severity = 3
        instructions = 'Tsunami possible. Stay away from beaches and harbors. Be prepared to evacuate.'
      }

      // Extract headline from CAP
      const headlineMatch = capXml.match(/<headline>(.*?)<\/headline>/s)
      const headline = headlineMatch ? headlineMatch[1].trim() : `Tsunami assessment for ${props.place}`

      // Extract affected areas from areaDesc
      const affectedRegions: string[] = []
      const areaDescMatch = capXml.match(/<areaDesc>(.*?)<\/areaDesc>/g)
      if (areaDescMatch) {
        for (const match of areaDescMatch) {
          const area = match.replace(/<\/?areaDesc>/g, '').trim()
          if (area) affectedRegions.push(area)
        }
      }
      if (affectedRegions.length === 0) {
        affectedRegions.push('New Zealand coastal areas')
      }

      return {
        id: `geonet_tsunami_${props.code}`,
        source: 'GeoNet',
        title: headline,
        category,
        severity,
        latitude: coords[1],
        longitude: coords[0],
        affectedRegions,
        issuedAt: new Date(props.time),
        expiresAt: new Date(props.time + 24 * 60 * 60 * 1000), // 24 hours
        description: `Magnitude ${props.mag.toFixed(1)} earthquake ${props.place}. ${instructions}`,
        instructions,
        rawData: { earthquake: props, capAlert: true }
      }
    } catch (err) {
      console.warn('Failed to parse GeoNet CAP:', err)
      return null
    }
  }
}
