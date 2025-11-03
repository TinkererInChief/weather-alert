import { TsunamiAlert } from '@/lib/data-sources/base-source'
import { DARTBuoySource } from '@/lib/data-sources/dart-buoy-source'

/**
 * Service to enrich tsunami alerts with DART buoy confirmation data
 */
export class DartEnrichmentService {
  private dartSource: DARTBuoySource
  
  constructor() {
    this.dartSource = new DARTBuoySource()
  }
  
  /**
   * Enrich tsunami alerts with DART confirmation data
   */
  async enrichAlerts(alerts: TsunamiAlert[]): Promise<TsunamiAlert[]> {
    try {
      // Fetch latest DART detections
      const dartAlerts = await this.dartSource.fetchTsunamiAlerts()
      
      return alerts.map(alert => {
        // Find matching DART confirmation (within 500km, within 2 hours)
        const dartMatch = this.findMatchingDartDetection(alert, dartAlerts)
        
        if (dartMatch) {
          return {
            ...alert,
            dartConfirmation: {
              stationId: dartMatch.rawData?.station || 'Unknown',
              stationName: dartMatch.title,
              height: (dartMatch.rawData?.pressureChange || 0) / 100, // cm to meters
              timestamp: dartMatch.issuedAt,
              region: dartMatch.affectedRegions[0] || 'Unknown'
            },
            confidence: this.calculateConfidence(alert, dartMatch),
            sources: this.aggregateSources(alert, dartMatch),
            sourceCount: this.countSources(alert, dartMatch)
          }
        }
        
        // No DART match, return with base confidence
        return {
          ...alert,
          confidence: this.calculateConfidence(alert, null),
          sources: [alert.source],
          sourceCount: 1
        }
      })
    } catch (error) {
      console.error('DART enrichment failed:', error)
      // Return original alerts on error
      return alerts.map(alert => ({
        ...alert,
        confidence: 50,
        sources: [alert.source],
        sourceCount: 1
      }))
    }
  }
  
  private findMatchingDartDetection(alert: TsunamiAlert, dartAlerts: TsunamiAlert[]): TsunamiAlert | null {
    const maxDistance = 500 // km
    const maxTimeDiff = 2 * 60 * 60 * 1000 // 2 hours
    
    for (const dart of dartAlerts) {
      const distance = this.haversineDistance(
        alert.latitude, alert.longitude,
        dart.latitude, dart.longitude
      )
      
      const timeDiff = Math.abs(alert.issuedAt.getTime() - dart.issuedAt.getTime())
      
      if (distance < maxDistance && timeDiff < maxTimeDiff) {
        return dart
      }
    }
    
    return null
  }
  
  private calculateConfidence(alert: TsunamiAlert, dartMatch: TsunamiAlert | null): number {
    let confidence = 40 // Base confidence
    
    // Official warning source
    if (alert.source === 'JMA') confidence += 25
    else if (alert.source === 'PTWC') confidence += 30
    else if (alert.source === 'GeoNet') confidence += 25
    else confidence += 15
    
    // DART physical confirmation (big boost)
    if (dartMatch) {
      confidence += 30
    }
    
    // Severity alignment
    if (alert.severity >= 4) confidence += 5
    
    return Math.min(100, confidence)
  }
  
  private aggregateSources(alert: TsunamiAlert, dartMatch: TsunamiAlert | null): string[] {
    const sources = [alert.source]
    if (dartMatch) sources.push('DART')
    return [...new Set(sources)]
  }
  
  private countSources(alert: TsunamiAlert, dartMatch: TsunamiAlert | null): number {
    return dartMatch ? 2 : 1
  }
  
  private haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371 // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
  }
}

export const dartEnrichmentService = new DartEnrichmentService()
