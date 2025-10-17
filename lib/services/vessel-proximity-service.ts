import { prisma } from '@/lib/prisma'
import { EarthquakeFeature } from '@/types/earthquake'

type ProximityConfig = {
  minMagnitude: number
  radiusKm: number
  tsunamiLevels?: string[]
}

type VesselAtRisk = {
  vessel: any
  position: any
  distance: number
  riskLevel: string
  recommendation: string
}

export class VesselProximityService {
  private static instance: VesselProximityService
  
  static getInstance() {
    if (!VesselProximityService.instance) {
      VesselProximityService.instance = new VesselProximityService()
    }
    return VesselProximityService.instance
  }
  
  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
  }
  
  async findVesselsAtRisk(
    event: EarthquakeFeature,
    config: ProximityConfig
  ): Promise<VesselAtRisk[]> {
    const eventLat = event.geometry.coordinates[1]
    const eventLon = event.geometry.coordinates[0]
    const mag = event.properties.mag
    
    if (mag < config.minMagnitude) return []
    
    const recentPositions = await prisma.vesselPosition.findMany({
      where: {
        timestamp: {
          gte: new Date(Date.now() - 30 * 60 * 1000)
        }
      },
      include: {
        vessel: {
          include: {
            contacts: {
              include: { contact: true }
            }
          }
        }
      },
      orderBy: {
        timestamp: 'desc'
      },
      distinct: ['vesselId']
    })
    
    const atRisk: VesselAtRisk[] = []
    
    for (const position of recentPositions) {
      const distance = this.calculateDistance(
        eventLat, eventLon,
        position.latitude, position.longitude
      )
      
      if (distance <= config.radiusKm) {
        atRisk.push({
          vessel: position.vessel,
          position,
          distance,
          riskLevel: this.calculateRiskLevel(mag, distance, event.geometry.coordinates[2]),
          recommendation: this.generateRecommendation(mag, distance, event.geometry.coordinates[2])
        })
      }
    }
    
    return atRisk
  }
  
  private calculateRiskLevel(magnitude: number, distanceKm: number, depth: number): string {
    if (magnitude >= 7.5 && distanceKm < 100) return 'critical'
    if (magnitude >= 7.0 && distanceKm < 200) return 'high'
    if (magnitude >= 6.5 && distanceKm < 300) return 'moderate'
    if (magnitude >= 6.0 && distanceKm < 400) return 'low'
    return 'info'
  }
  
  private generateRecommendation(magnitude: number, distanceKm: number, depth: number): string {
    let rec = `M${magnitude.toFixed(1)} earthquake ${distanceKm.toFixed(0)}km away. `
    
    if (magnitude >= 7.0 && depth < 50 && distanceKm < 200) {
      rec += 'TSUNAMI RISK: Move to deep water (>200m depth) or safe harbor immediately. '
    } else if (magnitude >= 6.5 && distanceKm < 150) {
      rec += 'Possible tsunami. Monitor PTWC bulletins and prepare to alter course. '
    }
    
    if (distanceKm < 100) {
      rec += 'Strong shaking possible. Secure cargo and prepare for aftershocks.'
    } else {
      rec += 'Monitor local authorities and remain vigilant.'
    }
    
    return rec
  }
  
  async dispatchVesselAlerts(
    event: EarthquakeFeature,
    config: ProximityConfig
  ) {
    const atRisk = await this.findVesselsAtRisk(event, config)
    
    for (const { vessel, position, distance, riskLevel, recommendation } of atRisk) {
      const alert = await prisma.vesselAlert.create({
        data: {
          vesselId: vessel.id,
          type: 'earthquake',
          severity: this.mapRiskToSeverity(riskLevel),
          eventId: event.id,
          eventType: 'earthquake',
          riskLevel,
          distance,
          recommendation,
          actions: this.generateActions(riskLevel)
        }
      })
      
      const contacts = vessel.contacts || []
      
      if (contacts.length > 0) {
        console.log(`🚢 Alert created for vessel ${vessel.name} (${vessel.mmsi}): ${riskLevel} risk, ${contacts.length} contacts`)
      }
    }
    
    return atRisk.length
  }
  
  private mapRiskToSeverity(riskLevel: string): string {
    const map: Record<string, string> = {
      critical: 'critical',
      high: 'high',
      moderate: 'moderate',
      low: 'low',
      info: 'low'
    }
    return map[riskLevel] || 'low'
  }
  
  private generateActions(riskLevel: string): string[] {
    const actions: Record<string, string[]> = {
      critical: [
        'Alter course to deep water immediately',
        'Secure all cargo and equipment',
        'Brief crew on tsunami procedures',
        'Monitor emergency frequencies'
      ],
      high: [
        'Prepare to alter course',
        'Monitor PTWC bulletins',
        'Secure loose items',
        'Standby for further instructions'
      ],
      moderate: [
        'Monitor situation',
        'Review evacuation procedures',
        'Maintain communication'
      ],
      low: [
        'Stay informed',
        'Continue normal operations with vigilance'
      ]
    }
    return actions[riskLevel] || actions.low
  }
}
