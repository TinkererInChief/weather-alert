import { prisma } from '@/lib/prisma'

// Voice call status types
export enum VoiceCallStatus {
  QUEUED = 'queued',
  RINGING = 'ringing',
  IN_PROGRESS = 'in-progress',
  COMPLETED = 'completed',
  BUSY = 'busy',
  NO_ANSWER = 'no-answer',
  FAILED = 'failed',
  CANCELED = 'canceled'
}

// Voice alert types
export enum VoiceAlertType {
  EARTHQUAKE = 'earthquake',
  TSUNAMI_WARNING = 'tsunami-warning',
  TSUNAMI_WATCH = 'tsunami-watch',
  TSUNAMI_ADVISORY = 'tsunami-advisory',
  TEST = 'test',
  EMERGENCY = 'emergency'
}

// Voice call configuration
export interface VoiceCallConfig {
  maxRetries: number
  retryDelay: number // seconds
  callTimeout: number // seconds
  enableRecording: boolean
  voice: 'alice' | 'man' | 'woman'
  language: string
  speed: number // 0.5 to 2.0
}

// Voice call result
export interface VoiceCallResult {
  success: boolean
  callSid?: string
  status?: VoiceCallStatus
  duration?: number
  errorMessage?: string
  recordingUrl?: string
}

// Voice message template
export interface VoiceMessageTemplate {
  alertType: VoiceAlertType
  priority: 'low' | 'medium' | 'high' | 'critical'
  introduction: string
  mainMessage: string
  instructions: string
  repeatCount: number
  confirmationRequired: boolean
}

export class VoiceService {
  private static instance: VoiceService | null = null
  private twilioClient: any = null
  private isInitialized = false

  // Default configuration
  private config: VoiceCallConfig = {
    maxRetries: 3,
    retryDelay: 30,
    callTimeout: 60,
    enableRecording: false,
    voice: 'alice',
    language: 'en-US',
    speed: 0.9
  }

  private constructor() {}

  static getInstance(): VoiceService {
    if (!VoiceService.instance) {
      VoiceService.instance = new VoiceService()
    }
    return VoiceService.instance
  }

  /**
   * Initialize Twilio Voice client
   */
  private async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      const accountSid = process.env.TWILIO_ACCOUNT_SID
      const authToken = process.env.TWILIO_AUTH_TOKEN
      const env = process.env.NODE_ENV

      // Safe diagnostics (no secrets printed)
      const sidOk = !!accountSid && accountSid.startsWith('AC')
      const tokenOk = !!authToken && authToken.length > 10
      const fromOk = !!process.env.TWILIO_PHONE_NUMBER
      console.log(`🔎 VoiceService init: env=${env} sidOk=${sidOk} tokenOk=${tokenOk} fromOk=${fromOk}`)

      if (!accountSid || !authToken) {
        console.warn('⚠️ Twilio credentials missing. Voice service disabled.')
        this.isInitialized = true
        return
      }

      // Dynamic import for Twilio
      const twilioModule = await import('twilio')
      const twilioClass = twilioModule.default || twilioModule
      this.twilioClient = twilioClass(accountSid, authToken)

      console.log('✅ Twilio Voice service initialized')
      this.isInitialized = true

    } catch (error) {
      console.error('❌ Failed to initialize Twilio Voice:', error)
      this.isInitialized = true // Prevent retry loops
    }
  }

  /**
   * Make a voice call with emergency alert
   */
  async makeVoiceCall(
    toNumber: string,
    alertType: VoiceAlertType,
    customMessage?: string,
    contactName?: string
  ): Promise<VoiceCallResult> {
    try {
      await this.initialize()

      if (!this.twilioClient) {
        return {
          success: false,
          errorMessage: 'Twilio Voice client not available'
        }
      }

      const fromNumber = process.env.TWILIO_PHONE_NUMBER
      if (!fromNumber) {
        return {
          success: false,
          errorMessage: 'Twilio phone number not configured'
        }
      }

      // Generate TwiML for the voice message
      const twiml = this.generateTwiML(alertType, customMessage, contactName)

      console.log(`📞 Making voice call to ${toNumber} for ${alertType}`)

      // Make the call
      const call = await this.twilioClient.calls.create({
        to: toNumber,
        from: fromNumber,
        twiml: twiml,
        timeout: this.config.callTimeout,
        record: this.config.enableRecording
      })

      // Store call record in database
      await this.storeCallRecord(call.sid, toNumber, alertType, 'queued')

      console.log(`✅ Voice call initiated: ${call.sid}`)

      return {
        success: true,
        callSid: call.sid,
        status: VoiceCallStatus.QUEUED
      }

    } catch (error) {
      console.error('❌ Voice call failed:', error)
      
      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown voice call error'
      }
    }
  }

  /**
   * Make bulk voice calls to multiple contacts
   */
  async makeBulkVoiceCalls(
    contacts: Array<{ phone: string; name: string }>,
    alertType: VoiceAlertType,
    customMessage?: string
  ): Promise<{
    successful: number
    failed: number
    totalCalls: number
    results: Array<{ contact: string; success: boolean; callSid?: string; error?: string }>
  }> {
    const results = []
    let successful = 0
    let failed = 0

    console.log(`📞 Starting bulk voice calls to ${contacts.length} contacts`)

    for (const contact of contacts) {
      if (!contact.phone) {
        results.push({
          contact: contact.name,
          success: false,
          error: 'No phone number provided'
        })
        failed++
        continue
      }

      try {
        const result = await this.makeVoiceCall(
          contact.phone,
          alertType,
          customMessage,
          contact.name
        )

        results.push({
          contact: contact.name,
          success: result.success,
          callSid: result.callSid,
          error: result.errorMessage
        })

        if (result.success) {
          successful++
        } else {
          failed++
        }

        // Small delay between calls to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000))

      } catch (error) {
        results.push({
          contact: contact.name,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
        failed++
      }
    }

    console.log(`📞 Bulk voice calls completed: ${successful} successful, ${failed} failed`)

    return {
      successful,
      failed,
      totalCalls: contacts.length,
      results
    }
  }

  /**
   * Generate TwiML (Twilio Markup Language) for voice message
   */
  private generateTwiML(
    alertType: VoiceAlertType,
    customMessage?: string,
    contactName?: string
  ): string {
    const template = this.getVoiceTemplate(alertType)
    const greeting = contactName ? `Hello ${contactName}.` : 'Hello.'

    let message = customMessage || template.mainMessage

    // Add tsunami-specific urgent tone for warnings
    if (alertType === VoiceAlertType.TSUNAMI_WARNING) {
      message = `URGENT ALERT. ${message}`
    }

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="${this.config.voice}" language="${this.config.language}" rate="${this.config.speed}">
    ${greeting} ${template.introduction}
  </Say>
  <Pause length="1"/>
  <Say voice="${this.config.voice}" language="${this.config.language}" rate="${this.config.speed}" loop="${template.repeatCount}">
    ${message}
  </Say>
  <Pause length="1"/>
  <Say voice="${this.config.voice}" language="${this.config.language}" rate="${this.config.speed}">
    ${template.instructions}
  </Say>
  ${template.confirmationRequired ? this.generateConfirmationTwiML() : ''}
  <Say voice="${this.config.voice}" language="${this.config.language}" rate="${this.config.speed}">
    This message was sent by the Emergency Alert System. Stay safe.
  </Say>
</Response>`

    return twiml
  }

  /**
   * Generate confirmation TwiML for critical alerts
   */
  private generateConfirmationTwiML(): string {
    return `
  <Gather input="dtmf" numDigits="1" timeout="10" action="/api/voice/confirm">
    <Say voice="${this.config.voice}" language="${this.config.language}">
      Press 1 to confirm you received this alert, or press 9 to repeat the message.
    </Say>
  </Gather>`
  }

  /**
   * Get voice message template for alert type
   */
  private getVoiceTemplate(alertType: VoiceAlertType): VoiceMessageTemplate {
    switch (alertType) {
      case VoiceAlertType.TSUNAMI_WARNING:
        return {
          alertType,
          priority: 'critical',
          introduction: 'This is an emergency tsunami warning alert.',
          mainMessage: 'A tsunami warning has been issued for your area. Evacuate coastal areas immediately and move to higher ground now. This is not a drill.',
          instructions: 'Leave coastal areas now. Move inland and to higher elevation. Follow official evacuation routes. Do not return until authorities declare it safe.',
          repeatCount: 2,
          confirmationRequired: true
        }

      case VoiceAlertType.TSUNAMI_WATCH:
        return {
          alertType,
          priority: 'high',
          introduction: 'This is a tsunami watch alert.',
          mainMessage: 'A tsunami watch has been issued for your area. Be prepared to evacuate coastal areas immediately if upgraded to a warning.',
          instructions: 'Monitor official sources. Be ready to evacuate quickly. Stay away from beaches and harbors.',
          repeatCount: 1,
          confirmationRequired: false
        }

      case VoiceAlertType.TSUNAMI_ADVISORY:
        return {
          alertType,
          priority: 'medium',
          introduction: 'This is a tsunami advisory alert.',
          mainMessage: 'A tsunami advisory is in effect for your area. Stay away from beaches, harbors, and coastal waters.',
          instructions: 'Avoid coastal areas. Follow local guidance and monitor official sources for updates.',
          repeatCount: 1,
          confirmationRequired: false
        }

      case VoiceAlertType.EARTHQUAKE:
        return {
          alertType,
          priority: 'high',
          introduction: 'This is an earthquake alert.',
          mainMessage: 'A significant earthquake has been detected in your area. Take immediate safety precautions.',
          instructions: 'Drop, cover, and hold on if shaking continues. Check for injuries and hazards. Monitor for tsunami warnings if near coast.',
          repeatCount: 1,
          confirmationRequired: false
        }

      case VoiceAlertType.TEST:
        return {
          alertType,
          priority: 'low',
          introduction: 'This is a test of the emergency alert system.',
          mainMessage: 'This is only a test. No action is required at this time.',
          instructions: 'This concludes the test. Thank you for your attention.',
          repeatCount: 1,
          confirmationRequired: false
        }

      case VoiceAlertType.EMERGENCY:
        return {
          alertType,
          priority: 'critical',
          introduction: 'This is an emergency alert.',
          mainMessage: 'An emergency situation has been detected that may affect your safety.',
          instructions: 'Follow local emergency guidance. Monitor official sources for updates and instructions.',
          repeatCount: 2,
          confirmationRequired: true
        }

      default:
        return {
          alertType,
          priority: 'medium',
          introduction: 'This is an emergency alert.',
          mainMessage: 'Please monitor official sources for emergency information.',
          instructions: 'Follow local guidance and stay alert for further updates.',
          repeatCount: 1,
          confirmationRequired: false
        }
    }
  }

  /**
   * Check call status and update database
   */
  async checkCallStatus(callSid: string): Promise<VoiceCallResult> {
    try {
      await this.initialize()

      if (!this.twilioClient) {
        return {
          success: false,
          errorMessage: 'Twilio client not available'
        }
      }

      const call = await this.twilioClient.calls(callSid).fetch()

      // Update call status in database
      await this.updateCallRecord(callSid, call.status, call.duration)

      return {
        success: call.status !== 'failed',
        callSid: call.sid,
        status: call.status as VoiceCallStatus,
        duration: call.duration
      }

    } catch (error) {
      console.error('❌ Error checking call status:', error)
      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Store call record in database
   */
  private async storeCallRecord(
    callSid: string,
    phoneNumber: string,
    alertType: VoiceAlertType,
    status: string
  ): Promise<void> {
    try {
      await prisma.voiceCall.create({
        data: {
          callSid,
          phoneNumber,
          alertType,
          status,
          createdAt: new Date()
        }
      })
    } catch (error) {
      console.error('❌ Error storing call record:', error)
    }
  }

  /**
   * Update call record in database
   */
  private async updateCallRecord(
    callSid: string,
    status: string,
    duration?: number
  ): Promise<void> {
    try {
      await prisma.voiceCall.updateMany({
        where: { callSid },
        data: {
          status,
          duration,
          completedAt: ['completed', 'no-answer', 'busy', 'failed'].includes(status) 
            ? new Date() 
            : undefined
        }
      })
    } catch (error) {
      console.error('❌ Error updating call record:', error)
    }
  }

  /**
   * Get call statistics
   */
  async getCallStats(): Promise<{
    totalCalls: number
    successfulCalls: number
    failedCalls: number
    averageDuration: number
    callsByType: Record<string, number>
    recentCalls: any[]
  }> {
    try {
      const [
        totalCalls,
        successfulCalls,
        failedCalls,
        avgDuration,
        callsByType,
        recentCalls
      ] = await Promise.all([
        // Total calls
        prisma.voiceCall.count(),
        
        // Successful calls
        prisma.voiceCall.count({
          where: { status: 'completed' }
        }),
        
        // Failed calls
        prisma.voiceCall.count({
          where: { status: { in: ['failed', 'busy', 'no-answer'] } }
        }),
        
        // Average duration
        prisma.voiceCall.aggregate({
          _avg: { duration: true },
          where: { duration: { not: null } }
        }),
        
        // Calls by type
        prisma.voiceCall.groupBy({
          by: ['alertType'],
          _count: { alertType: true }
        }),
        
        // Recent calls
        prisma.voiceCall.findMany({
          orderBy: { createdAt: 'desc' },
          take: 10
        })
      ])

      return {
        totalCalls,
        successfulCalls,
        failedCalls,
        averageDuration: avgDuration._avg.duration || 0,
        callsByType: callsByType.reduce(
          (
            acc: Record<string, number>,
            item: { alertType: string; _count: { alertType: number } }
          ) => {
            acc[item.alertType] = item._count.alertType
            return acc
          },
          {} as Record<string, number>
        ),
        recentCalls
      }

    } catch (error) {
      console.error('❌ Error fetching call stats:', error)
      return {
        totalCalls: 0,
        successfulCalls: 0,
        failedCalls: 0,
        averageDuration: 0,
        callsByType: {},
        recentCalls: []
      }
    }
  }

  /**
   * Update voice service configuration
   */
  updateConfig(newConfig: Partial<VoiceCallConfig>): void {
    this.config = { ...this.config, ...newConfig }
    console.log('✅ Voice service configuration updated')
  }

  /**
   * Get current configuration
   */
  getConfig(): VoiceCallConfig {
    return { ...this.config }
  }
}

// Export singleton instance
export const voiceService = VoiceService.getInstance()
