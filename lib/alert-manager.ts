import { EarthquakeService } from './earthquake-service'
import { SMSService } from './sms-service'
import { db } from './database'
import { EarthquakeFeature } from '@/types/earthquake'
import { TsunamiService } from './services/tsunami-service'
import { voiceService, VoiceAlertType } from './voice-service'
import { NotificationService } from './services/notification-service'
import AlertQueue from './queue/alert-queue'
import { prisma } from './prisma'

export class AlertManager {
  private earthquakeService: EarthquakeService
  private smsService: SMSService | null = null
  private notificationService: NotificationService
  private isMonitoring: boolean = false
  private monitoringInterval: NodeJS.Timeout | null = null

  constructor() {
    this.earthquakeService = EarthquakeService.getInstance()
    this.notificationService = new NotificationService()
    
    // Initialize SMS service only if Twilio credentials are available (kept for backwards compatibility)
    try {
      this.smsService = new SMSService()
      console.log('✅ SMS Service initialized')
    } catch (error) {
      console.warn('⚠️ SMS Service not available:', error)
    }
    
    console.log('✅ Multi-channel notification service initialized (SMS, Email, WhatsApp, Voice)')
  }

  async processEarthquakeAlert(earthquake: EarthquakeFeature): Promise<void> {
    console.log(`🚨 Processing earthquake alert: ${earthquake.properties.title}`)
    
    // 1. Assess tsunami potential
    const tsunamiThreat = await this.assessTsunamiThreat(earthquake)
    
    const contacts = await db.getActiveContacts()
    const alertMessage = this.createAlertMessage(earthquake, tsunamiThreat)
    
    // Extract sources from aggregated earthquake
    const sources = (earthquake as any).sources || []
    const primarySource = (earthquake as any).primarySource || 'USGS'
    
    let alertResult = {
      earthquakeId: earthquake.id,
      magnitude: earthquake.properties.mag,
      location: earthquake.properties.place,
      latitude: earthquake.geometry.coordinates[1],
      longitude: earthquake.geometry.coordinates[0],
      depth: earthquake.geometry.coordinates[2],
      timestamp: new Date(),
      contactsNotified: 0,
      success: false,
      errorMessage: undefined as string | undefined,
      tsunamiThreat: tsunamiThreat.level,
      dataSources: sources,
      primarySource
    }

    try {
      if (contacts.length > 0) {
        // Use new multi-channel notification system
        const severity = this.getTsunamiSeverity(tsunamiThreat)
        const multiChannelResults = await this.sendMultiChannelAlerts(
          contacts, 
          earthquake, 
          tsunamiThreat, 
          severity
        )
        
        alertResult.contactsNotified = multiChannelResults.totalSuccessful
        alertResult.success = alertResult.contactsNotified > 0
        alertResult.errorMessage = multiChannelResults.errorSummary
      } else {
        alertResult.errorMessage = 'No contacts available for notifications'
      }
    } catch (error) {
      alertResult.success = false
      alertResult.errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('❌ Error processing alert:', error)
    }

    // Log the alert
    await db.addAlertLog(alertResult)
    
    // Cache the earthquake as processed
    await db.markEarthquakeProcessed(earthquake.id)
    
    // Check for vessels at risk
    try {
      const { VesselProximityService } = await import('./services/vessel-proximity-service')
      const vesselProximity = VesselProximityService.getInstance()
      
      const vesselAlertsCount = await vesselProximity.dispatchVesselAlerts(earthquake, {
        minMagnitude: 6.0,
        radiusKm: 500
      })
      
      if (vesselAlertsCount > 0) {
        console.log(`🚢 Created ${vesselAlertsCount} vessel proximity alerts`)
      }
    } catch (error) {
      console.error('❌ Error checking vessel proximity:', error)
    }
    
    // Also log to console for POC demonstration
    console.log('📋 Alert Log:', alertResult)
  }

  async checkForNewEarthquakes(): Promise<EarthquakeFeature[]> {
    try {
      console.log('🔍 Checking for new significant earthquakes...')
      
      const newEarthquakes = await this.earthquakeService.getNewSignificantEarthquakes()
      
      if (newEarthquakes.length > 0) {
        console.log(`🚨 Found ${newEarthquakes.length} new significant earthquake(s)`)
        
        for (const earthquake of newEarthquakes) {
          await this.processEarthquakeAlert(earthquake)
        }
      } else {
        console.log('✅ No new significant earthquakes detected')
      }
      
      return newEarthquakes
    } catch (error) {
      console.error('❌ Error checking for earthquakes:', error)
      throw error
    }
  }

  startMonitoring(intervalMs: number = 60000): void {
    // Skip monitoring during build or when explicitly disabled
    if (process.env.SKIP_MONITORING === '1' || process.env.SKIP_MONITORING === 'true') {
      console.log('⏭️ Skipping earthquake monitoring (SKIP_MONITORING)')
      return
    }

    if (this.isMonitoring) {
      console.log('⚠️ Monitoring is already running')
      return
    }

    console.log(`🔄 Starting earthquake monitoring (checking every ${intervalMs/1000}s)`)
    
    this.isMonitoring = true
    
    // Check immediately
    this.checkForNewEarthquakes().catch(console.error)
    
    // Set up interval
    this.monitoringInterval = setInterval(() => {
      this.checkForNewEarthquakes().catch(console.error)
    }, intervalMs)
  }

  stopMonitoring(): void {
    if (!this.isMonitoring) {
      console.log('⚠️ Monitoring is not running')
      return
    }

    console.log('🛑 Stopping earthquake monitoring')
    
    this.isMonitoring = false
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
    }
  }

  getMonitoringStatus(): { isMonitoring: boolean; smsAvailable: boolean } {
    return {
      isMonitoring: this.isMonitoring,
      smsAvailable: this.smsService !== null
    }
  }

  // Manual test functions for POC
  async testSMSService(): Promise<{ success: boolean; message: string }> {
    if (!this.smsService) {
      return {
        success: false,
        message: 'SMS service not configured. Please check Twilio credentials.'
      }
    }

    const contacts = await db.getActiveContacts()
    
    if (contacts.length === 0) {
      return {
        success: false,
        message: 'No active contacts found. Please add contacts first.'
      }
    }

    try {
      // Use template service for test messages
      const { TemplateService } = await import('./services/template-service')
      const templateService = new TemplateService()
      
      const results = []
      
      for (const contact of contacts.slice(0, 1)) { // Test with first contact only
        const rendered = await templateService.renderTemplate({
          type: 'test',
          channel: 'sms',
          language: 'en',
          data: {
            systemName: 'Emergency Alert System',
            timestamp: new Date().toLocaleString(),
            contactName: contact.name,
            status: 'Operational',
            contactId: contact.id
          }
        })
        
        const result = await this.smsService.sendSMS(contact.phone!, rendered.content)
        results.push(result)
      }
      
      const successful = results.filter(r => r.success).length
      
      return {
        success: successful > 0,
        message: `Test sent to ${successful}/${results.length} contacts.`
      }
    } catch (error) {
      return {
        success: false,
        message: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  /**
   * Assess tsunami threat for an earthquake
   */
  private async assessTsunamiThreat(earthquake: EarthquakeFeature): Promise<any> {
    try {
      // Create earthquake data object for assessment
      const earthquakeData = {
        magnitude: earthquake.properties.mag || 0,
        depth: earthquake.geometry.coordinates[2] || 0, // depth is 3rd coordinate
        latitude: earthquake.geometry.coordinates[1],
        longitude: earthquake.geometry.coordinates[0],
        location: earthquake.properties.place || 'Unknown location'
      }

      // Use TsunamiService to analyze earthquake for tsunami potential
      const tsunamiService = TsunamiService.getInstance()
      const wouldGenerateTsunami = await tsunamiService.analyzeEarthquakeForTsunami(earthquakeData)
      
      // Simple threat assessment based on magnitude and depth
      const mag = earthquakeData.magnitude
      const depth = earthquakeData.depth
      
      let level = 'information'
      let confidence = 0
      
      if (wouldGenerateTsunami) {
        if (mag >= 8.5 && depth <= 35) {
          level = 'emergency'
          confidence = 0.9
        } else if (mag >= 7.5 && depth <= 50) {
          level = 'warning'
          confidence = 0.7
        } else if (mag >= 7.0) {
          level = 'advisory'
          confidence = 0.5
        } else {
          level = 'watch'
          confidence = 0.3
        }
        
        console.log(`🌊 Tsunami threat assessed: ${level} (confidence: ${Math.round(confidence * 100)}%)`)
      }

      return {
        level,
        confidence,
        affectedRegions: [earthquake.properties.place || 'Unknown']
      }

    } catch (error) {
      console.error('❌ Error assessing tsunami threat:', error)
      return {
        level: 'information',
        confidence: 0,
        affectedRegions: [earthquake.properties.place || 'Unknown']
      }
    }
  }

  /**
   * Create alert message including tsunami information
   */
  private createAlertMessage(earthquake: EarthquakeFeature, tsunamiThreat: any): string {
    const baseMessage = this.earthquakeService.formatEarthquakeAlert(earthquake)
    
    // Add tsunami information if there's a significant threat
    if (tsunamiThreat.level !== 'information' || tsunamiThreat.confidence > 0.3) {
      const tsunamiEmoji = this.getTsunamiEmoji(tsunamiThreat.level)
      const confidenceText = Math.round(tsunamiThreat.confidence * 100)
      
      return `${baseMessage}

${tsunamiEmoji} TSUNAMI ASSESSMENT:
Level: ${tsunamiThreat.level.toUpperCase()}
Confidence: ${confidenceText}%

${this.getTsunamiGuidance(tsunamiThreat.level)}

Emergency Alert System`
    }

    return baseMessage
  }

  /**
   * Get appropriate emoji for tsunami threat level
   */
  private getTsunamiEmoji(level: string): string {
    switch (level) {
      case 'emergency': return '🆘🌊'
      case 'warning': return '🚨🌊'
      case 'watch': return '⚠️🌊'
      case 'advisory': return '📢🌊'
      default: return '🌊'
    }
  }

  /**
   * Get local emergency number by country code
   */
  private getEmergencyNumber(country: string): string {
    const emergencyNumbers: Record<string, string> = {
      'US': '911',
      'CA': '911',
      'UK': '999',
      'GB': '999',
      'EU': '112',
      'DE': '112',
      'FR': '112',
      'IT': '112',
      'ES': '112',
      'AU': '000',
      'NZ': '111',
      'IN': '112',
      'JP': '110',
      'CN': '120',
      'KR': '112',
      'SG': '999',
      'MY': '999',
      'PH': '911',
      'TH': '191',
      'ID': '112',
      'VN': '113',
      'BR': '190',
      'MX': '911',
      'AR': '911',
      'CL': '133',
      'ZA': '10111',
      'EG': '122',
      'SA': '999',
      'AE': '999',
      'IL': '100',
      'TR': '112',
      'RU': '112',
      'UA': '112'
    }
    
    return emergencyNumbers[country.toUpperCase()] || '911'
  }

  /**
   * Get guidance text for tsunami threat level
   */
  private getTsunamiGuidance(level: string): string {
    switch (level) {
      case 'emergency':
      case 'warning':
        return 'EVACUATE COASTAL AREAS IMMEDIATELY! Move to higher ground now.'
      case 'watch':
        return 'Be prepared to evacuate coastal areas. Monitor official sources.'
      case 'advisory':
        return 'Stay away from beaches and harbors. Follow local guidance.'
      default:
        return 'Monitor conditions and be aware of tsunami potential.'
    }
  }

  /**
   * Map tsunami threat level to notification severity (1-5 scale)
   */
  private getTsunamiSeverity(tsunamiThreat: any): number {
    switch (tsunamiThreat.level) {
      case 'emergency':
        return 5 // Critical - all channels (voice + sms + whatsapp + email)
      case 'warning':
        return 5 // Critical - all channels (voice + sms + whatsapp + email)
      case 'watch':
        return 4 // High - all channels  
      case 'advisory':
        return 3 // Medium - fast channels (sms + whatsapp + email)
      case 'information':
      default:
        return 2 // Medium - fast channels (sms + whatsapp + email)
    }
  }

  /**
   * Send multi-channel notifications using NotificationService
   */
  private async sendMultiChannelAlerts(
    contacts: any[],
    earthquake: EarthquakeFeature,
    tsunamiThreat: any,
    severity: number
  ): Promise<{ totalSuccessful: number; errorSummary?: string }> {
    console.log(`📢 Enqueuing multi-channel alerts (severity: ${severity}) to ${contacts.length} contacts`)

    // Create an AlertJob to anchor DeliveryLog rows
    const alertJob = await prisma.alertJob.create({
      data: {
        type: 'earthquake',
        eventType: 'earthquake',
        severity,
        priority: 1,
        targetingSnapshot: { contacts: contacts.length },
        status: 'queued',
        scheduledFor: new Date(),
        startedAt: new Date(),
        metadata: {
          sourceId: earthquake.id,
          title: earthquake.properties.title,
        }
      }
    })

    const queue = AlertQueue.getInstance()

    const enqueued: Array<{ contactId: string; channel: string }> = []
    const errors: string[] = []

    for (const contact of contacts) {
      const preferredChannels = await this.notificationService.getPreferredChannels(contact, severity)
      console.log(`📋 Contact ${contact.name}: using channels [${preferredChannels.join(', ')}]`)

      const templateData = {
        type: 'earthquake',
        severity: severity,
        data: {
          contactName: contact.name,
          contactId: contact.id,
          magnitude: earthquake.properties.mag,
          location: earthquake.properties.place,
          depth: Math.round(earthquake.geometry?.coordinates?.[2] || 0),
          timestamp: new Date(earthquake.properties.time).toLocaleString(),
          time: new Date(earthquake.properties.time).toISOString(),
          title: earthquake.properties.title || `M${earthquake.properties.mag} - ${earthquake.properties.place}`,
          tsunamiLevel: tsunamiThreat.level,
          tsunamiConfidence: Math.round((tsunamiThreat.confidence || 0) * 100),
          tsunamiWarning: tsunamiThreat.level !== 'INFORMATION' 
            ? `⚠️ ${this.getTsunamiEmoji(tsunamiThreat.level)} TSUNAMI THREAT: ${tsunamiThreat.level}`
            : '',
          instructions: this.getTsunamiGuidance(tsunamiThreat.level),
          detailsUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/alerts`,
          preferencesUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/contacts`,
          emergencyNumber: this.getEmergencyNumber(contact.country || 'US')
        }
      }

      for (const channel of preferredChannels) {
        try {
          await queue.addAlert({
            alertJobId: alertJob.id,
            contactId: contact.id,
            channel: channel as 'sms'|'email'|'whatsapp'|'voice',
            templateData,
            priority: severity,
          })
          enqueued.push({ contactId: contact.id, channel })
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e)
          errors.push(`${channel} to ${contact.name}: ${msg}`)
        }
      }
    }

    try {
      await prisma.alertJob.update({
        where: { id: alertJob.id },
        data: {
          status: enqueued.length > 0 ? 'queued' : 'failed',
          metadata: {
            ...(alertJob as any).metadata,
            enqueued: { count: enqueued.length },
            errors: errors.slice(0, 5),
          }
        }
      })
    } catch (e) {
      console.warn('⚠️ Failed to update AlertJob queued summary:', e)
    }

    return {
      totalSuccessful: enqueued.length,
      errorSummary: errors.length > 0 ? errors.slice(0, 3).join('; ') + (errors.length > 3 ? '...' : '') : undefined
    }
  }

  /**
   * Determine if voice calls should be made based on threat level
   */
  private shouldMakeVoiceCalls(tsunamiThreat: any): boolean {
    // Make voice calls for high-priority alerts
    return (
      tsunamiThreat.level === 'emergency' ||
      tsunamiThreat.level === 'warning' ||
      tsunamiThreat.level === 'watch' ||
      (tsunamiThreat.level === 'advisory' && tsunamiThreat.confidence > 0.7)
    )
  }

  /**
   * Send voice alerts to contacts
   */
  private async sendVoiceAlerts(
    contacts: any[],
    earthquake: EarthquakeFeature,
    tsunamiThreat: any
  ): Promise<{ successful: number; failed: number }> {
    try {
      // Determine voice alert type based on tsunami threat
      let alertType: VoiceAlertType
      
      switch (tsunamiThreat.level) {
        case 'emergency':
        case 'warning':
          alertType = VoiceAlertType.TSUNAMI_WARNING
          break
        case 'watch':
          alertType = VoiceAlertType.TSUNAMI_WATCH
          break
        case 'advisory':
          alertType = VoiceAlertType.TSUNAMI_ADVISORY
          break
        default:
          alertType = VoiceAlertType.EARTHQUAKE
          break
      }

      // Format contacts for voice service
      const voiceContacts = contacts.map(contact => ({
        phone: contact.phone,
        name: contact.name
      }))

      // Create custom voice message
      const customMessage = this.createVoiceMessage(earthquake, tsunamiThreat)

      // Make bulk voice calls
      const result = await voiceService.makeBulkVoiceCalls(
        voiceContacts,
        alertType,
        customMessage
      )

      return {
        successful: result.successful,
        failed: result.failed
      }

    } catch (error) {
      console.error('❌ Error sending voice alerts:', error)
      return {
        successful: 0,
        failed: contacts.length
      }
    }
  }

  /**
   * Create custom voice message for alerts
   */
  private createVoiceMessage(earthquake: EarthquakeFeature, tsunamiThreat: any): string {
    const magnitude = earthquake.properties.mag?.toFixed(1) || 'unknown'
    const location = earthquake.properties.place || 'your area'
    
    let message = `A magnitude ${magnitude} earthquake has been detected near ${location}.`

    if (tsunamiThreat.level !== 'information') {
      const threatLevel = tsunamiThreat.level.replace('_', ' ')
      const confidence = Math.round(tsunamiThreat.confidence * 100)
      
      message += ` A tsunami ${threatLevel} is in effect with ${confidence} percent confidence.`
      
      if (tsunamiThreat.level === 'emergency' || tsunamiThreat.level === 'warning') {
        message += ' Evacuate coastal areas immediately and move to higher ground.'
      } else if (tsunamiThreat.level === 'watch') {
        message += ' Be prepared to evacuate coastal areas quickly if conditions change.'
      } else {
        message += ' Stay away from beaches and harbors.'
      }
    }

    return message
  }
}

// Export singleton instance
export const alertManager = new AlertManager()
