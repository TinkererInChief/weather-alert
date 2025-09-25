import { TsunamiService, TsunamiAlertLevel } from '@/lib/tsunami-service'
import { SMSService } from '@/lib/sms-service'
import { prisma } from '@/lib/prisma'

export interface TsunamiMonitorConfig {
  checkInterval: number // minutes
  alertThresholds: {
    minimumMagnitude: number
    maximumDepth: number
    coastalProximity: number // km from coast
  }
  notificationSettings: {
    enableSMS: boolean
    enableEmail: boolean
    priorityLevels: TsunamiAlertLevel[]
  }
}

export class TsunamiMonitor {
  private static instance: TsunamiMonitor | null = null
  private smsService: SMSService
  private isMonitoring = false
  private monitoringInterval: NodeJS.Timeout | null = null
  
  private config: TsunamiMonitorConfig = {
    checkInterval: 5, // Check every 5 minutes
    alertThresholds: {
      minimumMagnitude: 6.5,
      maximumDepth: 100,
      coastalProximity: 100
    },
    notificationSettings: {
      enableSMS: true,
      enableEmail: false,
      priorityLevels: [
        TsunamiAlertLevel.WARNING,
        TsunamiAlertLevel.WATCH,
        TsunamiAlertLevel.ADVISORY
      ]
    }
  }

  private constructor() {
    this.smsService = new SMSService()
  }

  static getInstance(): TsunamiMonitor {
    if (!TsunamiMonitor.instance) {
      TsunamiMonitor.instance = new TsunamiMonitor()
    }
    return TsunamiMonitor.instance
  }

  /**
   * Start continuous tsunami monitoring
   */
  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      console.log('🌊 Tsunami monitoring already active')
      return
    }

    console.log('🌊 Starting tsunami monitoring service...')
    this.isMonitoring = true

    // Initial check
    await this.performMonitoringCheck()

    // Set up periodic monitoring
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.performMonitoringCheck()
      } catch (error) {
        console.error('❌ Tsunami monitoring check failed:', error)
      }
    }, this.config.checkInterval * 60 * 1000) // Convert minutes to milliseconds

    console.log(`✅ Tsunami monitoring started (checking every ${this.config.checkInterval} minutes)`)
  }

  /**
   * Stop tsunami monitoring
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) {
      console.log('🌊 Tsunami monitoring not active')
      return
    }

    console.log('🛑 Stopping tsunami monitoring...')
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
    }
    
    this.isMonitoring = false
    console.log('✅ Tsunami monitoring stopped')
  }

  /**
   * Perform a single monitoring check
   */
  private async performMonitoringCheck(): Promise<void> {
    try {
      console.log('🔍 Performing tsunami monitoring check...')

      // 1. Fetch latest tsunami alerts from NOAA
      const alerts = await TsunamiService.fetchLatestAlerts()
      
      if (alerts.length === 0) {
        console.log('ℹ️ No active tsunami alerts found')
        return
      }

      console.log(`📡 Found ${alerts.length} tsunami alerts`)

      // 2. Get recent earthquakes to correlate with alerts
      const recentEarthquakes = await this.getRecentEarthquakes()

      // 3. Process each alert
      for (const alert of alerts) {
        await this.processTsunamiAlert(alert, recentEarthquakes)
      }

      // 4. Check for new high-magnitude earthquakes that might generate tsunamis
      await this.checkEarthquakesForTsunami(recentEarthquakes)

    } catch (error) {
      console.error('❌ Tsunami monitoring check failed:', error)
      throw error
    }
  }

  /**
   * Process individual tsunami alert
   */
  private async processTsunamiAlert(alert: any, earthquakes: any[]): Promise<void> {
    try {
      // Find related earthquake if any
      const relatedEarthquake = earthquakes.find(eq => 
        TsunamiService['isNearLocation'](
          eq.latitude, eq.longitude,
          alert.latitude, alert.longitude,
          100 // 100km radius
        )
      )

      // Assess threat level
      const threat = TsunamiService.assessTsunamiThreat(
        relatedEarthquake || {
          magnitude: alert.magnitude || 0,
          depth: alert.depth ? parseFloat(alert.depth.replace(/[^\d.]/g, '')) : 0,
          latitude: alert.latitude,
          longitude: alert.longitude,
          location: alert.location
        },
        [alert]
      )

      // Check if this is a new or updated alert
      const existingAlert = await prisma.tsunamiAlert.findFirst({
        where: {
          rawData: {
            path: ['title'],
            equals: alert.title
          }
        }
      })

      if (!existingAlert && this.shouldNotify(threat)) {
        console.log(`🚨 New tsunami alert: ${alert.title} - Level: ${threat.level}`)
        
        // Store in database
        await TsunamiService.storeTsunamiAlert(alert, threat)
        
        // Send notifications
        await this.sendTsunamiNotifications(alert, threat)
      }

    } catch (error) {
      console.error(`❌ Error processing tsunami alert:`, error)
    }
  }

  /**
   * Check earthquakes for potential tsunami generation
   */
  private async checkEarthquakesForTsunami(earthquakes: any[]): Promise<void> {
    for (const earthquake of earthquakes) {
      // Skip if already processed for tsunami
      const existingCheck = await prisma.earthquakeEvent.findFirst({
        where: {
          sourceId: earthquake.earthquakeId,
          tsunamiPossible: true
        }
      })

      if (existingCheck) continue

      // Assess tsunami potential
      const magnitude = earthquake.magnitude || 0
      const depth = earthquake.depth || 0

      // Simplified tsunami generation criteria
      const tsunamiPossible = (
        magnitude >= this.config.alertThresholds.minimumMagnitude &&
        depth <= this.config.alertThresholds.maximumDepth &&
        this.isNearCoast(earthquake.latitude, earthquake.longitude)
      )

      if (tsunamiPossible) {
        console.log(`⚠️ Earthquake may generate tsunami: M${magnitude} at ${earthquake.location}`)
        
        // Update earthquake record
        await prisma.earthquakeEvent.updateMany({
          where: { sourceId: earthquake.earthquakeId },
          data: { tsunamiPossible: true }
        })

        // Create tsunami threat assessment
        const threat = TsunamiService.assessTsunamiThreat(earthquake, [])
        
        if (this.shouldNotify(threat)) {
          await this.sendTsunamiPotentialAlert(earthquake, threat)
        }
      }
    }
  }

  /**
   * Send tsunami notifications to contacts
   */
  private async sendTsunamiNotifications(alert: any, threat: any): Promise<void> {
    try {
      if (!this.config.notificationSettings.enableSMS) {
        console.log('📱 SMS notifications disabled for tsunami alerts')
        return
      }

      // Get coastal contacts (simplified - all active contacts for now)
      const contacts = await prisma.contact.findMany({
        where: { 
          active: true,
          phone: { not: null }
        }
      })

      if (contacts.length === 0) {
        console.log('📞 No contacts found for tsunami notifications')
        return
      }

      // Create tsunami-specific message
      const message = this.createTsunamiMessage(alert, threat)

      let successCount = 0
      
      for (const contact of contacts) {
        if (!contact.phone) continue

        try {
          const result = await this.smsService.sendSMS(contact.phone, message)
          
          if (result.success) {
            successCount++
            console.log(`✅ Tsunami alert sent to ${contact.name}`)
          } else {
            console.error(`❌ Failed to send tsunami alert to ${contact.name}: ${result.error}`)
          }

        } catch (error) {
          console.error(`❌ Error sending tsunami alert to ${contact.name}:`, error)
        }
      }

      console.log(`📱 Tsunami notifications sent to ${successCount}/${contacts.length} contacts`)

    } catch (error) {
      console.error('❌ Error sending tsunami notifications:', error)
    }
  }

  /**
   * Send potential tsunami alert for high-magnitude earthquakes
   */
  private async sendTsunamiPotentialAlert(earthquake: any, threat: any): Promise<void> {
    try {
      const contacts = await prisma.contact.findMany({
        where: { 
          active: true,
          phone: { not: null }
        }
      })

      const message = `🌊 TSUNAMI POTENTIAL ALERT
      
Magnitude ${earthquake.magnitude} earthquake detected near ${earthquake.location}.

This earthquake may generate a tsunami. Monitor official sources and be prepared to evacuate if in coastal areas.

Location: ${earthquake.latitude}, ${earthquake.longitude}
Depth: ${earthquake.depth}km
Time: ${new Date().toLocaleString()}

Stay alert and follow local emergency guidance.

Emergency Alert System`

      for (const contact of contacts) {
        if (contact.phone) {
          await this.smsService.sendSMS(contact.phone, message)
        }
      }

    } catch (error) {
      console.error('❌ Error sending tsunami potential alert:', error)
    }
  }

  /**
   * Create tsunami-specific alert message
   */
  private createTsunamiMessage(alert: any, threat: any): string {
    let urgencyEmoji = '🌊'
    
    switch (threat.level) {
      case TsunamiAlertLevel.WARNING:
        urgencyEmoji = '🚨🌊'
        break
      case TsunamiAlertLevel.WATCH:
        urgencyEmoji = '⚠️🌊'
        break
      case TsunamiAlertLevel.ADVISORY:
        urgencyEmoji = '📢🌊'
        break
    }

    return `${urgencyEmoji} TSUNAMI ${alert.category.toUpperCase()}

${alert.title}

${alert.instruction}

Confidence: ${Math.round(threat.confidence * 100)}%
Time: ${new Date().toLocaleString()}

${threat.level === TsunamiAlertLevel.WARNING ? 'EVACUATE COASTAL AREAS IMMEDIATELY!' : 'Monitor conditions and follow local guidance.'}

Emergency Alert System`
  }

  /**
   * Get recent earthquakes from database
   */
  private async getRecentEarthquakes(): Promise<any[]> {
    try {
      const recentEarthquakes = await prisma.earthquakeCache.findMany({
        where: {
          timestamp: {
            gte: new Date(Date.now() - 6 * 60 * 60 * 1000) // Last 6 hours
          }
        },
        orderBy: {
          timestamp: 'desc'
        },
        take: 50
      })

      return recentEarthquakes

    } catch (error) {
      console.error('❌ Error fetching recent earthquakes:', error)
      return []
    }
  }

  /**
   * Check if location is near coast (simplified)
   */
  private isNearCoast(latitude: number, longitude: number): boolean {
    // Simplified coastal proximity check
    // In production, this would use a proper coastal database/API
    
    // Major ocean proximity (simplified latitude/longitude ranges)
    const isPacificCoast = (longitude >= -180 && longitude <= -100) || (longitude >= 100 && longitude <= 180)
    const isAtlanticCoast = longitude >= -80 && longitude <= 20
    const isIndianOcean = longitude >= 20 && longitude <= 100
    
    return isPacificCoast || isAtlanticCoast || isIndianOcean
  }

  /**
   * Determine if threat level warrants notifications
   */
  private shouldNotify(threat: any): boolean {
    return (
      this.config.notificationSettings.priorityLevels.includes(threat.level) ||
      threat.confidence >= 0.5
    )
  }

  /**
   * Get monitoring status
   */
  getStatus() {
    return {
      isMonitoring: this.isMonitoring,
      checkInterval: this.config.checkInterval,
      config: this.config
    }
  }

  /**
   * Update monitoring configuration
   */
  updateConfig(newConfig: Partial<TsunamiMonitorConfig>): void {
    this.config = { ...this.config, ...newConfig }
    console.log('✅ Tsunami monitoring configuration updated')
  }
}

// Export singleton instance
export const tsunamiMonitor = TsunamiMonitor.getInstance()
