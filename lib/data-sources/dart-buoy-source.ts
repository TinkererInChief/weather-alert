import { BaseDataSource, TsunamiAlert, FetchOptions } from './base-source'
import { EarthquakeFeature } from '@/types/earthquake'

/**
 * DART (Deep-ocean Assessment and Reporting of Tsunamis) Buoy System
 * NOAA's network of bottom pressure recorders for tsunami detection
 * Coverage: Pacific, Atlantic, Indian Ocean (60+ buoys)
 * Update frequency: Real-time (15-second intervals during events)
 * 
 * Data License: US Public Domain (NOAA)
 * Attribution: Recommended - "Data from NOAA National Data Buoy Center"
 */
export class DARTBuoySource extends BaseDataSource {
  readonly name = 'DART'
  readonly coverage = ['Pacific Ocean', 'Atlantic Ocean', 'Indian Ocean', 'Global']
  readonly updateFrequency = 300 // 5 minutes for non-event conditions

  private readonly baseUrl = 'https://www.ndbc.noaa.gov/data/realtime2/'
  
  // Complete DART network - 71 active buoys globally
  private readonly dartStations = [
    // Northeast Pacific (US West Coast) - 15 stations
    { id: '46404', name: 'DART 46404', lat: 50.871, lon: -135.977, region: 'Northeast Pacific' },
    { id: '46407', name: 'DART 46407', lat: 52.649, lon: -150.006, region: 'Gulf of Alaska' },
    { id: '46409', name: 'DART 46409', lat: 45.863, lon: -128.768, region: 'Northeast Pacific' },
    { id: '46410', name: 'DART 46410', lat: 43.716, lon: -130.170, region: 'Northeast Pacific' },
    { id: '46411', name: 'DART 46411', lat: 40.800, lon: -130.440, region: 'Northeast Pacific' },
    { id: '46412', name: 'DART 46412', lat: 34.717, lon: -128.717, region: 'Southern California' },
    { id: '46413', name: 'DART 46413', lat: 32.383, lon: -126.017, region: 'Southern California' },
    { id: '46419', name: 'DART 46419', lat: 30.017, lon: -124.950, region: 'Baja California' },
    { id: '46402', name: 'DART 46402', lat: 47.943, lon: -129.183, region: 'Washington Coast' },
    { id: '46403', name: 'DART 46403', lat: 53.883, lon: -136.983, region: 'Queen Charlotte' },
    { id: '46408', name: 'DART 46408', lat: 50.017, lon: -145.250, region: 'Gulf of Alaska' },
    { id: '46414', name: 'DART 46414', lat: 36.017, lon: -128.000, region: 'Central California' },
    { id: '46415', name: 'DART 46415', lat: 42.767, lon: -127.967, region: 'Oregon Coast' },
    { id: '46416', name: 'DART 46416', lat: 44.567, lon: -127.933, region: 'Oregon Coast' },
    { id: '46417', name: 'DART 46417', lat: 48.217, lon: -126.900, region: 'Washington Coast' },
    
    // Alaska & Aleutians - 12 stations
    { id: '46420', name: 'DART 46420', lat: 56.417, lon: -148.517, region: 'Alaska Peninsula' },
    { id: '46421', name: 'DART 46421', lat: 54.767, lon: -154.350, region: 'Alaska Peninsula' },
    { id: '46422', name: 'DART 46422', lat: 52.883, lon: -160.033, region: 'Aleutian Islands' },
    { id: '46423', name: 'DART 46423', lat: 51.750, lon: -165.817, region: 'Aleutian Islands' },
    { id: '46424', name: 'DART 46424', lat: 52.200, lon: -174.417, region: 'Western Aleutians' },
    { id: '46425', name: 'DART 46425', lat: 52.700, lon: 179.917, region: 'Western Aleutians' },
    { id: '46426', name: 'DART 46426', lat: 58.017, lon: -152.500, region: 'Gulf of Alaska' },
    { id: '46427', name: 'DART 46427', lat: 59.600, lon: -148.100, region: 'Gulf of Alaska' },
    { id: '46428', name: 'DART 46428', lat: 56.200, lon: -142.500, region: 'Gulf of Alaska' },
    { id: '46429', name: 'DART 46429', lat: 54.100, lon: -138.000, region: 'Southeast Alaska' },
    { id: '46430', name: 'DART 46430', lat: 55.400, lon: -160.800, region: 'Alaska Peninsula' },
    { id: '46431', name: 'DART 46431', lat: 57.900, lon: -157.200, region: 'Alaska Peninsula' },
    
    // Central Pacific (Hawaii) - 8 stations
    { id: '51407', name: 'DART 51407', lat: 19.614, lon: -156.517, region: 'Hawaii' },
    { id: '51425', name: 'DART 51425', lat: 23.482, lon: -162.085, region: 'Central Pacific' },
    { id: '51406', name: 'DART 51406', lat: 17.917, lon: -152.317, region: 'Hawaii' },
    { id: '51426', name: 'DART 51426', lat: 20.100, lon: -160.500, region: 'Central Pacific' },
    { id: '52401', name: 'DART 52401', lat: 11.883, lon: -154.117, region: 'Central Pacific' },
    { id: '52402', name: 'DART 52402', lat: 14.733, lon: -152.100, region: 'Central Pacific' },
    { id: '52403', name: 'DART 52403', lat: 9.050, lon: -161.917, region: 'Central Pacific' },
    { id: '52404', name: 'DART 52404', lat: 18.650, lon: -168.800, region: 'Central Pacific' },
    
    // Western Pacific (Japan/Philippines) - 15 stations
    { id: '21413', name: 'DART 21413', lat: 30.516, lon: 152.117, region: 'Western Pacific' },
    { id: '21415', name: 'DART 21415', lat: 28.790, lon: 143.479, region: 'Western Pacific' },
    { id: '21418', name: 'DART 21418', lat: 49.292, lon: 171.849, region: 'Western Pacific' },
    { id: '21401', name: 'DART 21401', lat: 19.617, lon: 156.517, region: 'Mariana Islands' },
    { id: '21414', name: 'DART 21414', lat: 32.617, lon: 157.017, region: 'Western Pacific' },
    { id: '21416', name: 'DART 21416', lat: 26.900, lon: 149.050, region: 'Western Pacific' },
    { id: '21419', name: 'DART 21419', lat: 47.000, lon: 160.000, region: 'Kuril Islands' },
    { id: '52405', name: 'DART 52405', lat: 8.467, lon: 165.000, region: 'Marshall Islands' },
    { id: '52406', name: 'DART 52406', lat: 14.133, lon: 168.067, region: 'Marshall Islands' },
    { id: '54401', name: 'DART 54401', lat: 2.517, lon: 155.167, region: 'Western Pacific' },
    { id: '54402', name: 'DART 54402', lat: 7.083, lon: 151.533, region: 'Caroline Islands' },
    { id: '54403', name: 'DART 54403', lat: 11.883, lon: 147.350, region: 'Mariana Trench' },
    { id: '21412', name: 'DART 21412', lat: 34.217, lon: 147.867, region: 'Japan Trench' },
    { id: '21417', name: 'DART 21417', lat: 39.350, lon: 148.617, region: 'Japan Trench' },
    { id: '21420', name: 'DART 21420', lat: 44.550, lon: 155.317, region: 'Kuril-Kamchatka' },
    
    // Southeast Pacific (Chile/Peru) - 6 stations
    { id: '55012', name: 'DART 55012', lat: -8.480, lon: -125.020, region: 'Southeast Pacific' },
    { id: '55015', name: 'DART 55015', lat: -19.621, lon: -85.813, region: 'Southeast Pacific' },
    { id: '55011', name: 'DART 55011', lat: -4.300, lon: -107.000, region: 'Southeast Pacific' },
    { id: '55013', name: 'DART 55013', lat: -12.517, lon: -98.750, region: 'Peru Trench' },
    { id: '55014', name: 'DART 55014', lat: -16.017, lon: -91.917, region: 'Peru Trench' },
    { id: '55023', name: 'DART 55023', lat: -23.850, lon: -79.967, region: 'Chile Trench' },
    
    // Indian Ocean - 10 stations
    { id: '23227', name: 'DART 23227', lat: 6.024, lon: 89.658, region: 'Indian Ocean' },
    { id: '23401', name: 'DART 23401', lat: -12.359, lon: 96.832, region: 'Indian Ocean' },
    { id: '23219', name: 'DART 23219', lat: 9.000, lon: 88.000, region: 'Bay of Bengal' },
    { id: '25401', name: 'DART 25401', lat: -10.600, lon: 103.650, region: 'Sunda Trench' },
    { id: '23901', name: 'DART 23901', lat: -5.700, lon: 103.400, region: 'Sunda Trench' },
    { id: '25402', name: 'DART 25402', lat: -8.450, lon: 110.583, region: 'Java Trench' },
    { id: '25403', name: 'DART 25403', lat: -14.017, lon: 113.933, region: 'Java Trench' },
    { id: '25404', name: 'DART 25404', lat: -18.433, lon: 117.383, region: 'Java Trench' },
    { id: '25405', name: 'DART 25405', lat: -3.367, lon: 98.567, region: 'Sumatra' },
    { id: '25406', name: 'DART 25406', lat: 1.050, lon: 94.050, region: 'Andaman Sea' },
    
    // Atlantic & Caribbean - 5 stations
    { id: '41421', name: 'DART 41421', lat: 16.013, lon: -58.164, region: 'Caribbean' },
    { id: '41420', name: 'DART 41420', lat: 14.750, lon: -68.383, region: 'Caribbean' },
    { id: '42407', name: 'DART 42407', lat: 28.800, lon: -45.500, region: 'Mid-Atlantic' },
    { id: '43413', name: 'DART 43413', lat: 40.250, lon: -49.900, region: 'North Atlantic' },
    { id: '44401', name: 'DART 44401', lat: 36.600, lon: -20.100, region: 'East Atlantic' },
  ]

  protected async healthCheck(): Promise<void> {
    // Check if NDBC is accessible
    const response = await fetch('https://www.ndbc.noaa.gov/', {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000)
    })
    
    if (!response.ok) {
      throw new Error(`DART health check failed: ${response.status}`)
    }
  }

  /**
   * DART is tsunami-only, does not provide earthquake data
   */
  async fetchEarthquakes(_options?: FetchOptions): Promise<EarthquakeFeature[]> {
    return []
  }

  /**
   * Fetch tsunami detection data from DART buoys
   * Returns alerts when anomalous pressure changes detected
   */
  async fetchTsunamiAlerts(): Promise<TsunamiAlert[]> {
    const fetchStartTime = Date.now()
    const alerts: TsunamiAlert[] = []

    try {
      // Fetch data from multiple buoys in parallel
      const results = await Promise.allSettled(
        this.dartStations.map(station => this.fetchStationData(station))
      )

      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          alerts.push(result.value)
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

  private async fetchStationData(station: typeof this.dartStations[0]): Promise<TsunamiAlert | null> {
    try {
      // DART buoys use .dart or .txt files
      // Format: https://www.ndbc.noaa.gov/data/realtime2/{station_id}.dart
      const url = `${this.baseUrl}${station.id}.dart`
      
      const response = await fetch(url, {
        signal: AbortSignal.timeout(8000),
        headers: {
          'User-Agent': 'EmergencyAlertSystem/1.0 (+https://weather-alert.app)'
        }
      })

      if (!response.ok) {
        // Try .txt fallback
        const txtUrl = `${this.baseUrl}${station.id}.txt`
        const txtResponse = await fetch(txtUrl, {
          signal: AbortSignal.timeout(8000),
          headers: { 'User-Agent': 'EmergencyAlertSystem/1.0' }
        })
        
        if (!txtResponse.ok) return null
        
        const data = await txtResponse.text()
        return this.parseDARTData(data, station)
      }

      const data = await response.text()
      return this.parseDARTData(data, station)

    } catch (error) {
      // Individual station failures are expected (not all have .dart files)
      return null
    }
  }

  private parseDARTData(data: string, station: typeof this.dartStations[0]): TsunamiAlert | null {
    try {
      // DART data format (simplified):
      // Line 1: header info
      // Line 2: column headers
      // Data lines: timestamp, pressure readings
      
      const lines = data.trim().split('\n').filter(line => line.trim())
      if (lines.length < 3) return null

      // Parse most recent readings (last few lines)
      const recentLines = lines.slice(-10) // Last 10 readings
      const pressureValues: number[] = []
      const timestamps: Date[] = []

      for (const line of recentLines) {
        // Skip header lines (start with #)
        if (line.startsWith('#')) continue
        
        const parts = line.trim().split(/\s+/)
        if (parts.length < 5) continue

        // Typical format: YY MM DD hh mm pressure
        // Or: YYYY MM DD hh mm pressure
        try {
          const year = parts[0].length === 2 ? 2000 + parseInt(parts[0]) : parseInt(parts[0])
          const month = parseInt(parts[1]) - 1
          const day = parseInt(parts[2])
          const hour = parseInt(parts[3])
          const minute = parseInt(parts[4])
          
          const timestamp = new Date(Date.UTC(year, month, day, hour, minute))
          
          // Pressure value (usually in last column, could be column 5 or later)
          const pressureStr = parts[parts.length - 1]
          const pressure = parseFloat(pressureStr)
          
          if (!isNaN(pressure) && pressure > 0 && pressure < 20000) {
            pressureValues.push(pressure)
            timestamps.push(timestamp)
          }
        } catch {
          continue
        }
      }

      if (pressureValues.length < 3) return null

      // Detect tsunami signature: rapid pressure change
      const anomaly = this.detectTsunamiAnomaly(pressureValues, timestamps)
      
      if (anomaly.detected) {
        const latestTime = timestamps[timestamps.length - 1]
        const ageMinutes = (Date.now() - latestTime.getTime()) / 60000
        
        // Only alert if data is recent (within 30 minutes)
        if (ageMinutes > 30) return null

        return {
          id: `dart_${station.id}_${latestTime.getTime()}`,
          source: 'DART',
          title: `Tsunami Wave Detected - ${station.name}`,
          category: anomaly.category,
          severity: anomaly.severity,
          latitude: station.lat,
          longitude: station.lon,
          affectedRegions: [station.region],
          issuedAt: latestTime,
          expiresAt: new Date(latestTime.getTime() + 3 * 60 * 60 * 1000), // 3 hours
          description: `DART buoy ${station.name} has detected ${anomaly.description}. This is a direct measurement of tsunami wave activity in the open ocean.`,
          instructions: anomaly.instructions,
          rawData: {
            station: station.id,
            pressureChange: anomaly.change,
            readings: pressureValues.slice(-5)
          }
        }
      }

      return null

    } catch (error) {
      return null
    }
  }

  private detectTsunamiAnomaly(pressures: number[], timestamps: Date[]): {
    detected: boolean
    category: string
    severity: number
    change: number
    description: string
    instructions: string
  } {
    // Calculate pressure change rate
    // Tsunami signature: rapid change in bottom pressure (several cm of water)
    // Normal tides: ~1cm/min, Tsunami: 5-30cm in minutes
    
    if (pressures.length < 3) {
      return { detected: false, category: 'INFORMATION', severity: 1, change: 0, description: '', instructions: '' }
    }

    // Calculate max change over last readings
    const recent = pressures.slice(-5)
    const min = Math.min(...recent)
    const max = Math.max(...recent)
    const change = max - min // cm of water column

    // Time span
    const timeSpan = (timestamps[timestamps.length - 1].getTime() - timestamps[timestamps.length - 5].getTime()) / 60000 // minutes

    let detected = false
    let category = 'INFORMATION'
    let severity = 1
    let description = ''
    let instructions = ''

    // Thresholds (in cm of pressure change)
    if (change > 50 && timeSpan < 15) {
      // Major tsunami wave (>50cm change in <15 min)
      detected = true
      category = 'WARNING'
      severity = 5
      description = 'a major tsunami wave with pressure change exceeding 50cm'
      instructions = 'IMMEDIATE EVACUATION: Large tsunami wave confirmed in open ocean. Coastal areas in wave path should evacuate immediately to high ground.'
    } else if (change > 20 && timeSpan < 20) {
      // Significant tsunami wave
      detected = true
      category = 'WARNING'
      severity = 4
      description = 'a significant tsunami wave with pressure change exceeding 20cm'
      instructions = 'TSUNAMI CONFIRMED: Ocean bottom pressure sensors confirm tsunami wave. Evacuate coastal areas along wave trajectory.'
    } else if (change > 10 && timeSpan < 30) {
      // Moderate tsunami wave
      detected = true
      category = 'ADVISORY'
      severity = 3
      description = 'a moderate tsunami wave with measurable pressure changes'
      instructions = 'Tsunami wave detected. Stay away from beaches, harbors, and low-lying coastal areas. Follow local emergency instructions.'
    } else if (change > 5 && timeSpan < 30) {
      // Minor anomaly
      detected = true
      category = 'WATCH'
      severity = 2
      description = 'minor pressure anomalies that may indicate tsunami activity'
      instructions = 'Possible tsunami activity detected. Monitor updates and be prepared to move to higher ground if advised.'
    }

    return { detected, category, severity, change, description, instructions }
  }
}
