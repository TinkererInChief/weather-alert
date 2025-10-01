import { EarthquakeService } from './earthquake-service'
import { SMSService } from './sms-service'
import { db } from './database'
import { EarthquakeFeature } from '@/types/earthquake'
import { TsunamiService, TsunamiAlertLevel } from './tsunami-service'
import { voiceService, VoiceAlertType } from './voice-service'
import { NotificationService } from './services/notification-service'
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
      tsunamiThreat: tsunamiThreat.level
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
      // Fetch latest tsunami alerts to correlate
      const tsunamiAlerts = await TsunamiService.fetchLatestAlerts()
      
      // Create earthquake data object for assessment
      const earthquakeData = {
        magnitude: earthquake.properties.mag || 0,
        depth: earthquake.geometry.coordinates[2] || 0, // depth is 3rd coordinate
        latitude: earthquake.geometry.coordinates[1],
        longitude: earthquake.geometry.coordinates[0],
        location: earthquake.properties.place || 'Unknown location'
      }

      // Assess tsunami threat
      const threat = TsunamiService.assessTsunamiThreat(earthquakeData, tsunamiAlerts)
      
      if (threat.level !== TsunamiAlertLevel.INFORMATION) {
        console.log(`🌊 Tsunami threat assessed: ${threat.level} (confidence: ${Math.round(threat.confidence * 100)}%)`)
      }

      return threat

    } catch (error) {
      console.error('❌ Error assessing tsunami threat:', error)
      return {
        level: TsunamiAlertLevel.INFORMATION,
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
    if (tsunamiThreat.level !== TsunamiAlertLevel.INFORMATION || tsunamiThreat.confidence > 0.3) {
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
  private getTsunamiEmoji(level: TsunamiAlertLevel): string {
    switch (level) {
      case TsunamiAlertLevel.WARNING: return '🚨🌊'
      case TsunamiAlertLevel.WATCH: return '⚠️🌊'
      case TsunamiAlertLevel.ADVISORY: return '📢🌊'
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
  private getTsunamiGuidance(level: TsunamiAlertLevel): string {
    switch (level) {
      case TsunamiAlertLevel.WARNING:
        return 'EVACUATE COASTAL AREAS IMMEDIATELY! Move to higher ground now.'
      case TsunamiAlertLevel.WATCH:
        return 'Be prepared to evacuate coastal areas. Monitor official sources.'
      case TsunamiAlertLevel.ADVISORY:
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
      case TsunamiAlertLevel.WARNING:
        return 5 // Critical - all channels (voice + sms + whatsapp + email)
      case TsunamiAlertLevel.WATCH:
        return 4 // High - all channels  
      case TsunamiAlertLevel.ADVISORY:
        return 3 // Medium - fast channels (sms + whatsapp + email)
      case TsunamiAlertLevel.INFORMATION:
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
    console.log(`📢 Sending multi-channel alerts (severity: ${severity}) to ${contacts.length} contacts`)

    // Create an AlertJob to anchor DeliveryLog rows
    const alertJob = await prisma.alertJob.create({
      data: {
        type: 'earthquake',
        eventType: 'earthquake',
        severity,
        priority: 1,
        targetingSnapshot: { contacts: contacts.length },
        status: 'processing',
        scheduledFor: new Date(),
        startedAt: new Date(),
        metadata: {
          sourceId: earthquake.id,
          title: earthquake.properties.title,
        }
      }
    })

    const channelStats = {
      sms: { successful: 0, failed: 0 },
      email: { successful: 0, failed: 0 },
      whatsapp: { successful: 0, failed: 0 },
      voice: { successful: 0, failed: 0 }
    }

    const errors: string[] = []

    // Process each contact
    for (const contact of contacts) {
      // Get preferred channels based on severity (async; respects settings + priorities)
      const preferredChannels = await this.notificationService.getPreferredChannels(contact, severity)
      console.log(`📋 Contact ${contact.name}: using channels [${preferredChannels.join(', ')}]`)

      // Create template data with enhanced variables
      const templateData = {
        type: 'earthquake',
        severity: severity,
        data: {
          // Contact information
          contactName: contact.name,
          contactId: contact.id,
          
          // Earthquake details
          magnitude: earthquake.properties.mag,
          location: earthquake.properties.place,
          depth: Math.round(earthquake.geometry?.coordinates?.[2] || 0),
          timestamp: new Date(earthquake.properties.time).toLocaleString(),
          time: new Date(earthquake.properties.time).toISOString(),
          title: earthquake.properties.title || `M${earthquake.properties.mag} - ${earthquake.properties.place}`,
          
          // Tsunami information
          tsunamiLevel: tsunamiThreat.level,
          tsunamiConfidence: Math.round((tsunamiThreat.confidence || 0) * 100),
          tsunamiWarning: tsunamiThreat.level !== 'INFORMATION' 
            ? `⚠️ ${this.getTsunamiEmoji(tsunamiThreat.level)} TSUNAMI THREAT: ${tsunamiThreat.level}`
            : '',
          
          // Action instructions
          instructions: this.getTsunamiGuidance(tsunamiThreat.level),
          
          // URLs
          detailsUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/alerts`,
          preferencesUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/contacts`,
          
          // Emergency information
          emergencyNumber: this.getEmergencyNumber(contact.country || 'US')
        }
      }

      // Send notifications for each preferred channel
      for (const channel of preferredChannels) {
        try {
          const result = await this.notificationService.sendNotification({
            contact,
            channel: channel as 'sms' | 'email' | 'whatsapp' | 'voice',
            templateData,
            alertJobId: alertJob.id
          })

          if (result.success) {
            channelStats[channel as keyof typeof channelStats].successful++
          } else {
            channelStats[channel as keyof typeof channelStats].failed++
            if (result.error) {
              errors.push(`${channel} to ${contact.name}: ${result.error}`)
            }
          }
        } catch (error) {
          channelStats[channel as keyof typeof channelStats].failed++
          errors.push(`${channel} to ${contact.name}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }
    }

    // Calculate totals and create summary
    const totalSuccessful = Object.values(channelStats).reduce((sum, stat) => sum + stat.successful, 0)
    const totalFailed = Object.values(channelStats).reduce((sum, stat) => sum + stat.failed, 0)

    console.log(`📊 Multi-channel results: ${totalSuccessful} successful, ${totalFailed} failed`)
    console.log(`📊 By channel: SMS(${channelStats.sms.successful}/${channelStats.sms.successful + channelStats.sms.failed}), ` +
                `Email(${channelStats.email.successful}/${channelStats.email.successful + channelStats.email.failed}), ` +
                `WhatsApp(${channelStats.whatsapp.successful}/${channelStats.whatsapp.successful + channelStats.whatsapp.failed}), ` +
                `Voice(${channelStats.voice.successful}/${channelStats.voice.successful + channelStats.voice.failed})`)

    // Update AlertJob status summary
    try {
      await prisma.alertJob.update({
        where: { id: alertJob.id },
        data: {
          status: totalSuccessful > 0 && totalFailed === 0 ? 'completed' : (totalSuccessful > 0 ? 'completed' : 'failed'),
          completedAt: new Date(),
          errorMessage: errors.length > 0 ? errors.slice(0, 5).join('; ') : null,
          metadata: {
            ...(alertJob as any).metadata,
            channelStats,
            totals: { totalSuccessful, totalFailed }
          }
        }
      })
    } catch (e) {
      console.warn('⚠️ Failed to update AlertJob summary:', e)
    }

    return {
      totalSuccessful,
      errorSummary: errors.length > 0 ? errors.slice(0, 3).join('; ') + (errors.length > 3 ? '...' : '') : undefined
    }
  }

  /**
   * Determine if voice calls should be made based on threat level
   */
  private shouldMakeVoiceCalls(tsunamiThreat: any): boolean {
    // Make voice calls for high-priority alerts
    return (
      tsunamiThreat.level === TsunamiAlertLevel.WARNING ||
      tsunamiThreat.level === TsunamiAlertLevel.WATCH ||
      (tsunamiThreat.level === TsunamiAlertLevel.ADVISORY && tsunamiThreat.confidence > 0.7)
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
        case TsunamiAlertLevel.WARNING:
          alertType = VoiceAlertType.TSUNAMI_WARNING
          break
        case TsunamiAlertLevel.WATCH:
          alertType = VoiceAlertType.TSUNAMI_WATCH
          break
        case TsunamiAlertLevel.ADVISORY:
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

    if (tsunamiThreat.level !== TsunamiAlertLevel.INFORMATION) {
      const threatLevel = tsunamiThreat.level.replace('_', ' ')
      const confidence = Math.round(tsunamiThreat.confidence * 100)
      
      message += ` A tsunami ${threatLevel} is in effect with ${confidence} percent confidence.`
      
      if (tsunamiThreat.level === TsunamiAlertLevel.WARNING) {
        message += ' Evacuate coastal areas immediately and move to higher ground.'
      } else if (tsunamiThreat.level === TsunamiAlertLevel.WATCH) {
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
