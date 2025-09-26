import { SMSService } from '../sms-service'
import { voiceService, VoiceAlertType } from '../voice-service'
import { WhatsAppService } from './whatsapp-service'
import { EmailService } from './email-service'
import { prisma } from '../prisma'
import { z } from 'zod'

export interface NotificationRequest {
  contact: {
    id: string
    name: string
    phone: string
    email?: string | null
    whatsapp?: string | null
    notificationChannels?: string[]
    active: boolean
  }
  channel: 'sms' | 'email' | 'whatsapp' | 'voice'
  templateData: {
    type: string
    severity: number
    data: any
  }
  alertJobId: string
}

export interface NotificationResult {
  success: boolean
  messageId?: string
  error?: string
  provider?: string
}

/**
 * Multi-channel notification service that coordinates SMS, WhatsApp, Voice, and Email notifications
 */
export class NotificationService {
  private smsService: SMSService
  private whatsappService: WhatsAppService
  private emailService: EmailService
  private settingsCache: { value: {
    notifications: Record<'sms'|'email'|'whatsapp'|'voice', { enabled: boolean; priority: number }>
    alertLevels: Record<'low'|'medium'|'high'|'critical', { channels: Array<'sms'|'email'|'whatsapp'|'voice'> }>
  }; expiresAt: number } | null = null

  constructor() {
    this.smsService = new SMSService()
    this.whatsappService = new WhatsAppService()
    this.emailService = new EmailService()
  }

  // Persist per-channel delivery log
  private async recordDeliveryLog(entry: {
    alertJobId?: string
    contactId?: string
    channel: 'sms' | 'email' | 'whatsapp' | 'voice'
    provider: string
    status: string
    providerMessageId?: string
    errorMessage?: string
    sentAt?: Date
  }): Promise<void> {
    try {
      if (!entry.alertJobId || !entry.contactId) return

      await prisma.deliveryLog.create({
        data: {
          alertJobId: entry.alertJobId,
          contactId: entry.contactId,
          channel: entry.channel,
          provider: entry.provider,
          status: entry.status,
          providerMessageId: entry.providerMessageId || null,
          errorMessage: entry.errorMessage || null,
          sentAt: entry.sentAt || new Date(),
        }
      })
    } catch (err) {
      // Do not throw from logging path; just warn
      console.warn('⚠️ Failed to record delivery log:', err)
    }
  }
 
  /**
   * Get preferred notification channels for a contact based on severity
   */
  async getPreferredChannels(contact: any, severity: number): Promise<Array<'sms'|'email'|'whatsapp'|'voice'>> {
    type Channel = 'sms'|'email'|'whatsapp'|'voice'

    const loadSettings = async () => {
      const now = Date.now()
      if (this.settingsCache && this.settingsCache.expiresAt > now) return this.settingsCache.value

      // Partial schema to avoid circular imports
      const PartialSchema = z.object({
        notifications: z.object({
          sms: z.object({ enabled: z.boolean(), priority: z.number() }),
          email: z.object({ enabled: z.boolean(), priority: z.number() }),
          whatsapp: z.object({ enabled: z.boolean(), priority: z.number() }),
          voice: z.object({ enabled: z.boolean(), priority: z.number() }),
        }),
        alertLevels: z.object({
          low: z.object({ channels: z.array(z.enum(['sms','email','whatsapp','voice'])) }),
          medium: z.object({ channels: z.array(z.enum(['sms','email','whatsapp','voice'])) }),
          high: z.object({ channels: z.array(z.enum(['sms','email','whatsapp','voice'])) }),
          critical: z.object({ channels: z.array(z.enum(['sms','email','whatsapp','voice'])) }),
        })
      })

      try {
        const row = await prisma.systemSettings.findUnique({ where: { id: 'global' }, select: { settings: true } })
        const parsed = PartialSchema.safeParse(row?.settings)
        const value = parsed.success ? parsed.data : {
          notifications: {
            sms: { enabled: true, priority: 1 },
            email: { enabled: true, priority: 3 },
            whatsapp: { enabled: true, priority: 2 },
            voice: { enabled: true, priority: 4 },
          },
          alertLevels: {
            low: { channels: ['sms','email'] as Channel[] },
            medium: { channels: ['sms','email','whatsapp'] as Channel[] },
            high: { channels: ['sms','email','whatsapp','voice'] as Channel[] },
            critical: { channels: ['sms','email','whatsapp','voice'] as Channel[] },
          },
        }
        this.settingsCache = { value, expiresAt: now + 60_000 }
        return value
      } catch {
        // Fallback defaults if DB access fails
        return {
          notifications: {
            sms: { enabled: true, priority: 1 },
            email: { enabled: true, priority: 3 },
            whatsapp: { enabled: true, priority: 2 },
            voice: { enabled: true, priority: 4 },
          },
          alertLevels: {
            low: { channels: ['sms','email'] as Channel[] },
            medium: { channels: ['sms','email','whatsapp'] as Channel[] },
            high: { channels: ['sms','email','whatsapp','voice'] as Channel[] },
            critical: { channels: ['sms','email','whatsapp','voice'] as Channel[] },
          },
        }
      }
    }

    const settings = await loadSettings()

    // Map numeric severity to labeled level
    const level: 'low'|'medium'|'high'|'critical' = severity >= 5 ? 'critical' : severity === 4 ? 'high' : severity === 3 ? 'medium' : 'low'
    const allowedByLevel = new Set<Channel>(settings.alertLevels[level].channels)

    // Is channel enabled globally
    const enabled = (ch: Channel) => settings.notifications[ch]?.enabled !== false

    // Contact availability
    const available: Channel[] = []
    if (contact.phone) available.push('sms')
    if (contact.whatsapp) available.push('whatsapp')
    if (contact.email) available.push('email')
    if (contact.phone) available.push('voice')

    // Intersection: level-allowed ∩ enabled ∩ available
    let selected = available.filter((ch) => allowedByLevel.has(ch) && enabled(ch)) as Channel[]

    // Respect contact preferences, if present
    if (contact.notificationChannels && Array.isArray(contact.notificationChannels) && contact.notificationChannels.length > 0) {
      const preferred = new Set<string>(contact.notificationChannels)
      selected = selected.filter((ch) => preferred.has(ch))
    }

    // Sort by configured priority (ascending)
    selected.sort((a, b) => {
      const pa = settings.notifications[a]?.priority ?? 999
      const pb = settings.notifications[b]?.priority ?? 999
      return pa - pb
    })

    return selected
  }

  /**
   * Send notification through specified channel
   */
  async sendNotification(request: NotificationRequest): Promise<NotificationResult> {
    const { contact, channel, templateData } = request

    try {
      switch (channel) {
        case 'sms':
          return await this.sendSMSNotification(contact, templateData, request.alertJobId)
        
        case 'whatsapp':
          return await this.sendWhatsAppNotification(contact, templateData, request.alertJobId)
        
        case 'voice':
          return await this.sendVoiceNotification(contact, templateData, request.alertJobId)
        
        case 'email':
          return await this.sendEmailNotification(contact, templateData, request.alertJobId)
        
        default:
          return {
            success: false,
            error: `Unsupported notification channel: ${channel}`
          }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown notification error'
      }
    }
  }

  /**
   * Send SMS notification
   */
  private async sendSMSNotification(contact: any, templateData: any, alertJobId?: string): Promise<NotificationResult> {
    if (!contact.phone) {
      return {
        success: false,
        error: 'No phone number available for SMS'
      }
    }

    const message = this.formatSMSMessage(templateData)
    const result = await this.smsService.sendSMS(contact.phone, message)

    const response: NotificationResult = {
      success: result.success,
      messageId: result.messageId,
      error: result.error,
      provider: 'twilio-sms'
    }

    // Record delivery log if an alert job is present
    await this.recordDeliveryLog({
      alertJobId,
      contactId: contact.id,
      channel: 'sms',
      provider: 'twilio',
      status: result.success ? 'sent' : 'failed',
      providerMessageId: result.messageId,
      errorMessage: result.error,
      sentAt: new Date()
    })

    return response
  }

  /**
   * Send WhatsApp notification
   */
  private async sendWhatsAppNotification(contact: any, templateData: any, alertJobId?: string): Promise<NotificationResult> {
    const whatsappNumber = contact.whatsapp || contact.phone
    
    if (!whatsappNumber) {
      return {
        success: false,
        error: 'No WhatsApp number available'
      }
    }

    const message = this.formatWhatsAppMessage(templateData)
    const result = await this.whatsappService.sendMessage(whatsappNumber, message)

    const response: NotificationResult = {
      success: result.success,
      messageId: result.messageId,
      error: result.error,
      provider: result.provider
    }

    await this.recordDeliveryLog({
      alertJobId,
      contactId: contact.id,
      channel: 'whatsapp',
      provider: 'twilio',
      status: result.success ? 'sent' : 'failed',
      providerMessageId: result.messageId,
      errorMessage: result.error,
      sentAt: new Date()
    })

    return response
  }

  /**
   * Send voice notification
   */
  private async sendVoiceNotification(contact: any, templateData: any, alertJobId?: string): Promise<NotificationResult> {
    if (!contact.phone) {
      return {
        success: false,
        error: 'No phone number available for voice call'
      }
    }

    const alertType = this.getVoiceAlertType(templateData)
    const customMessage = this.formatVoiceMessage(templateData)

    const result = await voiceService.makeVoiceCall(
      contact.phone,
      alertType,
      customMessage,
      contact.name
    )

    const response: NotificationResult = {
      success: result.success,
      messageId: result.callSid,
      error: result.errorMessage,
      provider: 'twilio-voice'
    }

    await this.recordDeliveryLog({
      alertJobId,
      contactId: contact.id,
      channel: 'voice',
      provider: 'twilio',
      status: result.success ? 'queued' : 'failed',
      providerMessageId: result.callSid,
      errorMessage: result.errorMessage,
      sentAt: new Date()
    })

    return response
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(contact: any, templateData: any, alertJobId?: string): Promise<NotificationResult> {
    if (!contact.email) {
      return {
        success: false,
        error: 'No email address available'
      }
    }

    const { subject, htmlContent, textContent } = this.formatEmailMessage(templateData)
    
    const result = await this.emailService.sendEmail({
      to: contact.email,
      subject,
      htmlContent,
      textContent
    })

    const response: NotificationResult = {
      success: result.success,
      messageId: result.messageId,
      error: result.error,
      provider: result.provider || 'email'
    }

    await this.recordDeliveryLog({
      alertJobId,
      contactId: contact.id,
      channel: 'email',
      provider: 'sendgrid',
      status: result.success ? 'sent' : 'failed',
      providerMessageId: result.messageId,
      errorMessage: result.error,
      sentAt: new Date()
    })

    return response
  }

  /**
   * Format SMS message from template data
   */
  private formatSMSMessage(templateData: any): string {
    const { type, data } = templateData

    if (type === 'earthquake') {
      let message = `🚨 EARTHQUAKE ALERT\n`
      message += `Magnitude: ${data.magnitude}\n`
      message += `Location: ${data.location}\n`
      message += `Time: ${data.timestamp}\n`

      if (data.tsunamiLevel && data.tsunamiLevel !== 'INFORMATION') {
        message += `\n🌊 TSUNAMI ${data.tsunamiLevel.toUpperCase()}\n`
        message += `${data.instructions}\n`
      }

      message += `\nEmergency Alert System`
      return message
    }

    return `Emergency Alert: ${data.title || 'Alert notification'}`
  }

  /**
   * Format WhatsApp message from template data
   */
  private formatWhatsAppMessage(templateData: any): string {
    const { type, data } = templateData

    if (type === 'earthquake') {
      let message = `🚨 *EARTHQUAKE ALERT*\n\n`
      message += `📍 *Location:* ${data.location}\n`
      message += `📊 *Magnitude:* ${data.magnitude}\n`
      message += `🕐 *Time:* ${data.timestamp}\n`

      if (data.tsunamiLevel && data.tsunamiLevel !== 'INFORMATION') {
        message += `\n🌊 *TSUNAMI ${data.tsunamiLevel.toUpperCase()}*\n`
        message += `⚠️ ${data.instructions}\n`
      }

      message += `\n_Emergency Alert System_`
      return message
    }

    return `🚨 *Emergency Alert*\n\n${data.title || 'Alert notification'}`
  }

  /**
   * Format voice message from template data
   */
  private formatVoiceMessage(templateData: any): string {
    const { type, data } = templateData

    if (type === 'earthquake') {
      let message = `A magnitude ${data.magnitude} earthquake has been detected near ${data.location}.`

      if (data.tsunamiLevel && data.tsunamiLevel !== 'INFORMATION') {
        const threatLevel = data.tsunamiLevel.replace('_', ' ').toLowerCase()
        message += ` A tsunami ${threatLevel} is in effect.`
        
        if (data.tsunamiLevel === 'WARNING') {
          message += ' Evacuate coastal areas immediately and move to higher ground.'
        } else if (data.tsunamiLevel === 'WATCH') {
          message += ' Be prepared to evacuate coastal areas quickly if conditions change.'
        } else {
          message += ' Stay away from beaches and harbors.'
        }
      }

      return message
    }

    return data.title || 'Emergency alert notification'
  }

  /**
   * Format email message from template data
   */
  private formatEmailMessage(templateData: any): { subject: string; htmlContent: string; textContent: string } {
    const { type, data } = templateData

    if (type === 'earthquake') {
      const subject = `🚨 Earthquake Alert - M${data.magnitude} ${data.location}`
      
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #dc2626; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">🚨 EARTHQUAKE ALERT</h1>
          </div>
          
          <div style="padding: 20px; background-color: #f9f9f9;">
            <h2 style="color: #dc2626; margin-top: 0;">Earthquake Details</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px; font-weight: bold;">Magnitude:</td>
                <td style="padding: 8px;">${data.magnitude}</td>
              </tr>
              <tr>
                <td style="padding: 8px; font-weight: bold;">Location:</td>
                <td style="padding: 8px;">${data.location}</td>
              </tr>
              <tr>
                <td style="padding: 8px; font-weight: bold;">Time:</td>
                <td style="padding: 8px;">${data.timestamp}</td>
              </tr>
              ${data.depth ? `
              <tr>
                <td style="padding: 8px; font-weight: bold;">Depth:</td>
                <td style="padding: 8px;">${data.depth} km</td>
              </tr>
              ` : ''}
            </table>

            ${data.tsunamiLevel && data.tsunamiLevel !== 'INFORMATION' ? `
            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
              <h3 style="color: #92400e; margin-top: 0;">🌊 Tsunami ${data.tsunamiLevel.toUpperCase()}</h3>
              <p style="margin-bottom: 0; color: #92400e;">${data.instructions}</p>
            </div>
            ` : ''}

            <div style="margin-top: 20px; padding: 15px; background-color: #e5e7eb; border-radius: 5px;">
              <p style="margin: 0; font-size: 14px; color: #374151;">
                This alert was sent by the Emergency Alert System. Stay safe and follow official guidance.
              </p>
            </div>
          </div>
        </div>
      `

      const textContent = `
EARTHQUAKE ALERT

Magnitude: ${data.magnitude}
Location: ${data.location}
Time: ${data.timestamp}
${data.depth ? `Depth: ${data.depth} km` : ''}

${data.tsunamiLevel && data.tsunamiLevel !== 'INFORMATION' ? `
TSUNAMI ${data.tsunamiLevel.toUpperCase()}
${data.instructions}
` : ''}

This alert was sent by the Emergency Alert System. Stay safe and follow official guidance.
      `

      return { subject, htmlContent, textContent }
    }

    // Default format
    const subject = `Emergency Alert: ${data.title || 'Notification'}`
    const htmlContent = `<h1>Emergency Alert</h1><p>${data.title || 'Alert notification'}</p>`
    const textContent = `Emergency Alert: ${data.title || 'Alert notification'}`

    return { subject, htmlContent, textContent }
  }

  /**
   * Get voice alert type from template data
   */
  private getVoiceAlertType(templateData: any): VoiceAlertType {
    const { type, data } = templateData

    if (type === 'earthquake') {
      if (data.tsunamiLevel) {
        switch (data.tsunamiLevel) {
          case 'WARNING':
            return VoiceAlertType.TSUNAMI_WARNING
          case 'WATCH':
            return VoiceAlertType.TSUNAMI_WATCH
          case 'ADVISORY':
            return VoiceAlertType.TSUNAMI_ADVISORY
          default:
            return VoiceAlertType.EARTHQUAKE
        }
      }
      return VoiceAlertType.EARTHQUAKE
    }

    return VoiceAlertType.EMERGENCY
  }
}