import { SMSService } from '../sms-service'
import { voiceService, VoiceAlertType } from '../voice-service'
import { WhatsAppService } from './whatsapp-service'
import { EmailService } from './email-service'

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

  constructor() {
    this.smsService = new SMSService()
    this.whatsappService = new WhatsAppService()
    this.emailService = new EmailService()
  }

  /**
   * Get preferred notification channels for a contact based on severity
   */
  getPreferredChannels(contact: any, severity: number): string[] {
    const channels: string[] = []
    
    // Always include SMS if phone number is available
    if (contact.phone) {
      channels.push('sms')
    }

    // Add WhatsApp if available and contact has WhatsApp number
    if (contact.whatsapp) {
      channels.push('whatsapp')
    }

    // Add email if available
    if (contact.email) {
      channels.push('email')
    }

    // Add voice calls for high severity alerts (4-5) and if phone is available
    if (severity >= 4 && contact.phone) {
      channels.push('voice')
    }

    // Respect contact's notification channel preferences if set
    if (contact.notificationChannels && contact.notificationChannels.length > 0) {
      return channels.filter(channel => contact.notificationChannels.includes(channel))
    }

    return channels
  }

  /**
   * Send notification through specified channel
   */
  async sendNotification(request: NotificationRequest): Promise<NotificationResult> {
    const { contact, channel, templateData } = request

    try {
      switch (channel) {
        case 'sms':
          return await this.sendSMSNotification(contact, templateData)
        
        case 'whatsapp':
          return await this.sendWhatsAppNotification(contact, templateData)
        
        case 'voice':
          return await this.sendVoiceNotification(contact, templateData)
        
        case 'email':
          return await this.sendEmailNotification(contact, templateData)
        
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
  private async sendSMSNotification(contact: any, templateData: any): Promise<NotificationResult> {
    if (!contact.phone) {
      return {
        success: false,
        error: 'No phone number available for SMS'
      }
    }

    const message = this.formatSMSMessage(templateData)
    const result = await this.smsService.sendSMS(contact.phone, message)

    return {
      success: result.success,
      messageId: result.messageId,
      error: result.error,
      provider: 'twilio-sms'
    }
  }

  /**
   * Send WhatsApp notification
   */
  private async sendWhatsAppNotification(contact: any, templateData: any): Promise<NotificationResult> {
    const whatsappNumber = contact.whatsapp || contact.phone
    
    if (!whatsappNumber) {
      return {
        success: false,
        error: 'No WhatsApp number available'
      }
    }

    const message = this.formatWhatsAppMessage(templateData)
    const result = await this.whatsappService.sendMessage(whatsappNumber, message)

    return {
      success: result.success,
      messageId: result.messageId,
      error: result.error,
      provider: result.provider
    }
  }

  /**
   * Send voice notification
   */
  private async sendVoiceNotification(contact: any, templateData: any): Promise<NotificationResult> {
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

    return {
      success: result.success,
      messageId: result.callSid,
      error: result.errorMessage,
      provider: 'twilio-voice'
    }
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(contact: any, templateData: any): Promise<NotificationResult> {
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

    return {
      success: result.success,
      messageId: result.messageId,
      error: result.error,
      provider: result.provider || 'email'
    }
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