#!/usr/bin/env tsx

/**
 * Vessel Proximity Monitor
 * 
 * Continuously monitors vessel positions against active earthquake/tsunami events
 * and automatically creates alerts when vessels enter danger zones.
 * 
 * Usage: pnpm monitor:vessels
 */

import { prisma } from '../lib/prisma'
import { alertRoutingService } from '../lib/services/alert-routing-service'

// Configuration
const CHECK_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes
const DANGER_ZONE_RADII = {
  earthquake: {
    critical: 100,  // km
    high: 300,
    moderate: 500,
    low: 1000
  },
  tsunami: {
    critical: 50,
    high: 200,
    moderate: 500,
    low: 1000
  }
}

class VesselProximityMonitor {
  private isRunning = false
  private checkCount = 0

  /**
   * Start monitoring
   */
  async start() {
    console.log('═══════════════════════════════════════════════════════')
    console.log('🚢 VESSEL PROXIMITY MONITOR')
    console.log('═══════════════════════════════════════════════════════')
    console.log(`Check interval: ${CHECK_INTERVAL_MS / 1000}s`)
    console.log(`Danger zones: ${JSON.stringify(DANGER_ZONE_RADII, null, 2)}`)
    console.log('Starting monitoring...\n')

    this.isRunning = true

    // Run initial check
    await this.checkProximity()

    // Schedule regular checks
    while (this.isRunning) {
      await this.sleep(CHECK_INTERVAL_MS)
      await this.checkProximity()
    }
  }

  /**
   * Stop monitoring
   */
  stop() {
    console.log('\n[Monitor] Stopping...')
    this.isRunning = false
  }

  /**
   * Main proximity check logic
   */
  private async checkProximity() {
    this.checkCount++
    const startTime = Date.now()

    console.log(`\n${'─'.repeat(60)}`)
    console.log(`[Check #${this.checkCount}] ${new Date().toISOString()}`)
    console.log(`${'─'.repeat(60)}`)

    try {
      // Get active events (earthquakes and tsunamis from last 24 hours)
      const events = await this.getActiveEvents()
      console.log(`[Events] Found ${events.length} active events`)

      if (events.length === 0) {
        console.log('[Events] No active events to monitor')
        return
      }

      // Get active vessels with recent positions
      const vessels = await this.getActiveVessels()
      console.log(`[Vessels] Found ${vessels.length} vessels with recent positions`)

      if (vessels.length === 0) {
        console.log('[Vessels] No active vessels to check')
        return
      }

      // Check each vessel against each event
      let alertsCreated = 0

      for (const event of events) {
        for (const vessel of vessels) {
          const result = await this.checkVesselAgainstEvent(vessel, event)
          if (result.alertCreated) {
            alertsCreated++
          }
        }
      }

      const duration = Date.now() - startTime
      console.log(`\n[Summary] Check complete in ${duration}ms`)
      console.log(`[Summary] Alerts created: ${alertsCreated}`)

    } catch (error) {
      console.error('[Monitor] Error during proximity check:', error)
    }
  }

  /**
   * Get active earthquake and tsunami events
   */
  private async getActiveEvents() {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours

    const earthquakes = await prisma.earthquakeEvent.findMany({
      where: {
        createdAt: { gte: since },
        status: 'active',
        magnitude: { gte: 5.0 } // Only significant earthquakes
      },
      orderBy: { magnitude: 'desc' }
    })

    const tsunamis = await prisma.tsunamiAlert.findMany({
      where: {
        createdAt: { gte: since },
        cancellationTime: null // Not cancelled
      },
      include: {
        sourceEarthquake: true
      }
    })

    // Convert to unified event format
    const events = [
      ...earthquakes.map(eq => ({
        id: eq.id,
        type: 'earthquake' as const,
        latitude: eq.latitude,
        longitude: eq.longitude,
        magnitude: eq.magnitude,
        depth: eq.depth,
        occurredAt: eq.occurredAt,
        location: eq.location
      })),
      ...tsunamis.map(ts => ({
        id: ts.id,
        type: 'tsunami' as const,
        latitude: ts.sourceEarthquake?.latitude || 0,
        longitude: ts.sourceEarthquake?.longitude || 0,
        magnitude: ts.severityLevel,
        waveHeight: ts.estimatedWaveHeight,
        occurredAt: ts.createdAt,
        location: ts.sourceEarthquake?.location || 'Unknown'
      }))
    ]

    return events
  }

  /**
   * Get active vessels with recent positions
   */
  private async getActiveVessels() {
    const since = new Date(Date.now() - 60 * 60 * 1000) // Last hour

    const vessels = await prisma.vessel.findMany({
      where: {
        active: true,
        positions: {
          some: {
            timestamp: { gte: since }
          }
        }
      },
      include: {
        positions: {
          orderBy: { timestamp: 'desc' },
          take: 1
        }
      }
    })

    // Filter vessels with positions
    return vessels
      .filter(v => v.positions.length > 0)
      .map(v => ({
        ...v,
        latestPosition: v.positions[0]
      }))
  }

  /**
   * Check if vessel is in danger zone of an event
   */
  private async checkVesselAgainstEvent(vessel: any, event: any) {
    const position = vessel.latestPosition

    // Calculate distance between vessel and event
    const distance = this.calculateDistance(
      position.latitude,
      position.longitude,
      event.latitude,
      event.longitude
    )

    // Determine severity based on distance and event type
    const severity = this.determineSeverity(distance, event)

    if (!severity) {
      // Vessel is not in any danger zone
      return { alertCreated: false }
    }

    console.log(`[Alert] ${vessel.name} is ${distance.toFixed(0)}km from ${event.type} (${severity})`)

    // Create alert via routing service
    try {
      const result = await alertRoutingService.createAndRouteAlert({
        vesselId: vessel.id,
        eventId: event.id,
        eventType: event.type,
        severity,
        distance,
        coordinates: {
          lat: event.latitude,
          lon: event.longitude
        },
        message: this.generateAlertMessage(vessel, event, distance, severity),
        eventMagnitude: event.magnitude,
        waveHeight: event.waveHeight
      })

      if (result.isDuplicate) {
        console.log(`[Alert] Skipped duplicate alert for ${vessel.name}`)
        return { alertCreated: false }
      }

      console.log(`[Alert] ✓ Created alert ${result.alert.id} for ${vessel.name}`)
      console.log(`[Alert] ✓ Notified ${result.recipientCount} contacts`)

      return { alertCreated: true, alert: result.alert }

    } catch (error) {
      console.error(`[Alert] Failed to create alert for ${vessel.name}:`, error)
      return { alertCreated: false, error }
    }
  }

  /**
   * Determine severity based on distance and event type
   */
  private determineSeverity(
    distance: number,
    event: any
  ): 'critical' | 'high' | 'moderate' | 'low' | null {
    const zones = DANGER_ZONE_RADII[event.type as 'earthquake' | 'tsunami']

    if (distance <= zones.critical) return 'critical'
    if (distance <= zones.high) return 'high'
    if (distance <= zones.moderate) return 'moderate'
    if (distance <= zones.low) return 'low'

    return null // Outside all danger zones
  }

  /**
   * Generate alert message
   */
  private generateAlertMessage(
    vessel: any,
    event: any,
    distance: number,
    severity: string
  ): string {
    const severityEmoji = {
      critical: '🔴',
      high: '🟠',
      moderate: '🟡',
      low: '🟢'
    }[severity] || '⚠️'

    let message = `${severityEmoji} MARITIME ALERT - ${severity.toUpperCase()}\n\n`
    message += `Vessel: ${vessel.name} (${vessel.mmsi})\n`
    message += `Event: ${event.type.toUpperCase()}\n`
    message += `Distance: ${distance.toFixed(0)} km\n`
    message += `Location: ${event.location}\n\n`

    if (event.type === 'earthquake') {
      message += `Magnitude: ${event.magnitude.toFixed(1)}\n`
      if (event.depth) {
        message += `Depth: ${event.depth.toFixed(0)} km\n`
      }
    }

    if (event.type === 'tsunami') {
      message += `Severity Level: ${event.magnitude}\n`
      if (event.waveHeight) {
        message += `Wave Height: ${event.waveHeight.toFixed(1)}m\n`
      }
    }

    message += `\nTime: ${new Date().toISOString()}\n`
    message += `\n⚠️ TAKE APPROPRIATE ACTION BASED ON YOUR EMERGENCY PROCEDURES.`

    return message
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371 // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1)
    const dLon = this.toRad(lon2 - lon1)

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2)

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  private toRad(degrees: number): number {
    return (degrees * Math.PI) / 180
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// Main execution
if (require.main === module) {
  const monitor = new VesselProximityMonitor()

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n[Monitor] Received SIGINT, shutting down gracefully...')
    monitor.stop()
    process.exit(0)
  })

  process.on('SIGTERM', () => {
    console.log('\n[Monitor] Received SIGTERM, shutting down gracefully...')
    monitor.stop()
    process.exit(0)
  })

  // Start monitoring
  monitor.start().catch(error => {
    console.error('[Monitor] Fatal error:', error)
    process.exit(1)
  })
}

export { VesselProximityMonitor }
