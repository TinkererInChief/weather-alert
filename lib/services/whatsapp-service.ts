import twilio, { TwilioClient } from 'twilio'
import { formatDualTime } from '../time-display'

interface WhatsAppResult {
  success: boolean
  messageId?: string
  error?: string
  provider: string
}

export class WhatsAppService {
  private client: TwilioClient | null = null
  private fromNumber: string = ''

  constructor() {
    this.initialize()
  }

  private initialize() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN
    // Use dedicated WhatsApp number or fall back to sandbox
    this.fromNumber = process.env.TWILIO_WHATSAPP_NUMBER || '+14155238886'

    if (!accountSid || !authToken) {
      console.warn('⚠️ Twilio credentials not complete. WhatsApp service disabled.')
      return
    }

    this.client = twilio(accountSid, authToken)
    
    if (this.fromNumber === '+14155238886') {
      console.log('✅ WhatsApp service initialized with Twilio Sandbox')
      console.log('📱 Using sandbox number: whatsapp:+14155238886')
      console.log('ℹ️  Note: Users must first send "join <sandbox-keyword>" to the sandbox number')
    } else {
      console.log('✅ WhatsApp service initialized with Twilio Business number')
    }
  }

  async sendMessage(to: string, message: string): Promise<WhatsAppResult> {
    if (!this.client) {
      return {
        success: false,
        error: 'WhatsApp service not initialized. Check Twilio credentials.',
        provider: 'twilio'
      }
    }

    try {
      // Format phone number for WhatsApp (must include whatsapp: prefix)
      const formattedTo = this.formatWhatsAppNumber(to)
      const formattedFrom = `whatsapp:${this.fromNumber}`

      const result = await this.client.messages.create({
        body: message,
        from: formattedFrom,
        to: formattedTo
      })

      return {
        success: true,
        messageId: result.sid,
        provider: 'twilio'
      }
    } catch (error: any) {
      console.error(`WhatsApp message failed to ${to}:`, error)
      
      let errorMessage = 'Unknown WhatsApp error'
      if (error.code === 63007) {
        if (this.fromNumber === '+14155238886') {
          errorMessage = `WhatsApp Sandbox Error: Contact must first send "join <keyword>" to whatsapp:+14155238886. Visit https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn to set up sandbox.`
        } else {
          errorMessage = `WhatsApp Channel Error: ${error.message}. Check if your WhatsApp Business number is properly configured in Twilio.`
        }
      } else if (error.code) {
        errorMessage = `Twilio error ${error.code}: ${error.message}`
      } else if (error.message) {
        errorMessage = error.message
      }

      return {
        success: false,
        error: errorMessage,
        provider: 'twilio'
      }
    }
  }

  // Send templated message (required for WhatsApp Business API)
  async sendTemplatedMessage(
    to: string, 
    templateName: string, 
    parameters: string[]
  ): Promise<WhatsAppResult> {
    if (!this.client) {
      return {
        success: false,
        error: 'WhatsApp service not initialized.',
        provider: 'twilio'
      }
    }

    try {
      const formattedTo = this.formatWhatsAppNumber(to)
      const formattedFrom = `whatsapp:${this.fromNumber}`

      // Build a simple text message from template name + parameters
      const text = `[${templateName}] ${parameters.join(' ')}`

      const result = await this.client.messages.create({
        from: formattedFrom,
        to: formattedTo,
        body: text
      })

      return {
        success: true,
        messageId: result.sid,
        provider: 'twilio'
      }
    } catch (error: any) {
      console.error(`WhatsApp template message failed:`, error)
      return {
        success: false,
        error: error.message || 'Template message failed',
        provider: 'twilio'
      }
    }
  }

  // Format phone number for WhatsApp
  private formatWhatsAppNumber(phone: string): string {
    // Remove any existing whatsapp: prefix
    let cleaned = phone.replace(/^whatsapp:/, '')
    
    // Remove all non-digit characters except +
    cleaned = cleaned.replace(/[^\d+]/g, '')
    
    // Add + if not present
    if (!cleaned.startsWith('+')) {
      // Assume US number if no country code
      if (cleaned.length === 10) {
        cleaned = `+1${cleaned}`
      } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
        cleaned = `+${cleaned}`
      } else {
        cleaned = `+${cleaned}`
      }
    }
    
    return `whatsapp:${cleaned}`
  }

  // Validate WhatsApp number format
  validateWhatsAppNumber(phone: string): boolean {
    const formatted = this.formatWhatsAppNumber(phone)
    const cleaned = formatted.replace('whatsapp:', '')
    
    // Basic validation: should start with + and be 10-15 digits
    return /^\+\d{10,15}$/.test(cleaned)
  }

  // Get pre-approved emergency templates for different alert types
  getEmergencyTemplates(): Record<string, string> {
    return {
      earthquake: process.env.WHATSAPP_EARTHQUAKE_TEMPLATE || '',
      tsunami: process.env.WHATSAPP_TSUNAMI_TEMPLATE || '',
      test: process.env.WHATSAPP_TEST_TEMPLATE || ''
    }
  }

  // Format emergency message for WhatsApp
  formatEmergencyMessage(data: {
    type: string
    severity: number
    location: string
    magnitude?: number
    waveHeight?: number
    eta?: string
    instructions: string
  }): string {
    const emoji = this.getSeverityEmoji(data.severity)
    const typeEmoji = data.type === 'tsunami' ? '🌊' : '🏔️'
    
    let message = `${emoji} ${typeEmoji} *${data.type.toUpperCase()} ALERT*\n\n`
    
    if (data.type === 'earthquake' && data.magnitude) {
      message += `📊 *Magnitude:* ${data.magnitude}\n`
    }
    
    if (data.type === 'tsunami' && data.waveHeight) {
      message += `📏 *Wave Height:* ${data.waveHeight}m\n`
    }
    
    message += `📍 *Location:* ${data.location}\n`
    
    if (data.eta) {
      message += `⏰ *ETA:* ${data.eta}\n`
    }
    
    message += `\n⚠️ *Action Required:*\n${data.instructions}\n\n`
    message += `🕒 ${new Date().toLocaleString()}`
    
    return message
  }

  private getSeverityEmoji(severity: number): string {
    const emojis = {
      5: '🆘', // Emergency
      4: '🚨', // Warning
      3: '⚠️', // Advisory
      2: '🔔', // Watch
      1: 'ℹ️'  // Information
    }
    return emojis[severity as keyof typeof emojis] || '📢'
  }

  /**
   * Send WhatsApp messages to multiple contacts
   */
  async sendBulkWhatsApp(
    contacts: Array<{ name: string; whatsapp?: string | null; phone?: string | null }>,
    message: string
  ): Promise<{
    totalSent: number
    successful: number
    failed: number
    results: Array<{
      contact: { name: string; whatsapp?: string | null; phone?: string | null }
      success: boolean
      messageId?: string
      error?: string
    }>
  }> {
    const results = []
    let successful = 0
    let failed = 0

    console.log(`📱 Starting bulk WhatsApp messages to ${contacts.length} contacts`)

    for (const contact of contacts) {
      const whatsappNumber = contact.whatsapp || contact.phone
      
      if (!whatsappNumber) {
        results.push({
          contact,
          success: false,
          error: 'No WhatsApp number or phone number available'
        })
        failed++
        continue
      }

      const result = await this.sendMessage(whatsappNumber, message)
      
      results.push({
        contact,
        success: result.success,
        messageId: result.messageId,
        error: result.error
      })

      if (result.success) {
        successful++
      } else {
        failed++
      }

      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200))
    }

    console.log(`📱 Bulk WhatsApp completed: ${successful} successful, ${failed} failed`)

    return {
      totalSent: results.length,
      successful,
      failed,
      results
    }
  }
}
