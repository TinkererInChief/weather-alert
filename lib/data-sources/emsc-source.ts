import { EarthquakeFeature } from '@/types/earthquake'
import { BaseDataSource, FetchOptions } from './base-source'

/**
 * EMSC (European-Mediterranean Seismological Centre) earthquake data source
 * Coverage: Europe, Mediterranean, Middle East, North Africa
 * Update frequency: Real-time (updates every few minutes)
 */
export class EMSCSource extends BaseDataSource {
  readonly name = 'EMSC'
  readonly coverage = ['Europe', 'Mediterranean', 'Middle East', 'North Africa']
  readonly updateFrequency = 120 // seconds
  
  private readonly baseUrl = 'https://www.seismicportal.eu/fdsnws/event/1'
  
  protected async healthCheck(): Promise<void> {
    const response = await fetch(`${this.baseUrl}/version`, {
      signal: AbortSignal.timeout(5000)
    })
    
    if (!response.ok) {
      throw new Error(`EMSC health check failed: ${response.status}`)
    }
  }
  
  async fetchEarthquakes(options?: FetchOptions): Promise<EarthquakeFeature[]> {
    const fetchStartTime = Date.now()
    
    try {
      const params = new URLSearchParams({
        format: 'json',
        limit: String(options?.limit || 100),
        orderby: 'time-desc'
      })
      
      // Time window
      const timeWindow = options?.timeWindowHours || 24
      const queryStartTime = new Date(Date.now() - timeWindow * 60 * 60 * 1000)
      params.append('starttime', queryStartTime.toISOString())
      
      // Magnitude filter
      if (options?.minMagnitude) {
        params.append('minmagnitude', String(options.minMagnitude))
      }
      
      // Bounding box
      if (options?.boundingBox) {
        const [minLat, minLng, maxLat, maxLng] = options.boundingBox
        params.append('minlatitude', String(minLat))
        params.append('maxlatitude', String(maxLat))
        params.append('minlongitude', String(minLng))
        params.append('maxlongitude', String(maxLng))
      }
      
      const response = await fetch(`${this.baseUrl}/query?${params}`, {
        signal: AbortSignal.timeout(15000)
      })
      
      if (!response.ok) {
        throw new Error(`EMSC fetch failed: ${response.status}`)
      }
      
      const data = await response.json()
      
      this.recordSuccess()
      this.recordResponseTime(Date.now() - fetchStartTime)
      
      // Convert EMSC format to our standard format
      const earthquakes = this.convertEMSCToStandard(data)
      
      return earthquakes
      
    } catch (error) {
      this.recordFailure(error instanceof Error ? error : new Error('Unknown error'))
      throw error
    }
  }
  
  private convertEMSCToStandard(data: any): EarthquakeFeature[] {
    if (!data.features || !Array.isArray(data.features)) {
      return []
    }
    
    return data.features.map((feature: any) => {
      const props = feature.properties || {}
      const geom = feature.geometry || {}
      const coords = geom.coordinates || [0, 0, 0]
      
      // EMSC uses different field names
      const magnitude = props.mag || props.magnitude || 0
      const time = props.time ? new Date(props.time).getTime() : Date.now()
      const place = props.flynn_region || props.place || 'Unknown location'
      
      return {
        type: 'Feature',
        id: `emsc_${feature.id || `${time}_${coords[0]}_${coords[1]}`}`,
        properties: {
          mag: magnitude,
          place: place,
          time: time,
          updated: time,
          tz: null,
          url: `https://www.emsc-csem.org/Earthquake/earthquake.php?id=${feature.id}`,
          detail: '',
          felt: null,
          cdi: null,
          mmi: null,
          alert: null,
          status: props.status || 'automatic',
          tsunami: 0,
          sig: Math.round(magnitude * 100),
          net: 'emsc',
          code: String(feature.id || ''),
          ids: `emsc${feature.id}`,
          sources: 'emsc',
          types: 'origin,magnitude',
          nst: null,
          dmin: null,
          rms: 0,
          gap: null,
          magType: props.magtype || props.magnitudetype || 'M',
          type: 'earthquake',
          title: `M ${magnitude.toFixed(1)} - ${place}`
        },
        geometry: {
          type: 'Point',
          coordinates: [
            coords[0], // longitude
            coords[1], // latitude
            coords[2] || 10 // depth (default 10km if not provided)
          ]
        }
      }
    })
  }
}
