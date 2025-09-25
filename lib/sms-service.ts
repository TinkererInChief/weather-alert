import { Contact } from '@/types/earthquake'

// Dynamic import for Twilio to handle module resolution
let twilio: any = null

async function getTwilio() {
  if (!twilio) {
    try {
      const twilioModule = await import('twilio')
      twilio = twilioModule.default || twilioModule
    } catch (error) {
      console.error('Failed to import Twilio:', error)
      throw new Error('Twilio module not available')
    }
  }
  return twilio
}

export class SMSService {
  private client: any = null
  private fromNumber: string = ''
  private isInitialized: boolean = false

  private async initialize() {
    if (this.isInitialized) return

    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN
    this.fromNumber = process.env.TWILIO_PHONE_NUMBER || ''

    if (!accountSid || !authToken || !this.fromNumber) {
      console.warn('⚠️ Twilio credentials missing or incomplete. SMS service disabled.')
      if (process.env.NODE_ENV !== 'production') {
        // Create a mock client to avoid runtime errors in dev
        this.client = {
          messages: {
            create: async (options: any) => {
              console.log(`SMS mock: pretend-sent to ${options.to}`)
              return { sid: 'mock_sid' }
            }
          }
        }
      } else {
        // In production, do not mock - force explicit failure so we can surface it
        this.client = null
      }
      this.isInitialized = true
      return
    }

    try {
      const twilioInstance = await getTwilio()
      this.client = twilioInstance(accountSid, authToken)
      this.isInitialized = true
    } catch (error) {
      console.error('Failed to initialize Twilio client:', error)
      // Fallback to mock client
      this.client = {
        messages: {
          create: async (options: any) => {
            console.log(`SMS mock (fallback): pretend-sent to ${options.to}`)
            return { sid: 'mock_sid' }
          }
        }
      }
      this.isInitialized = true
    }
  }

  async sendSMS(to: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      await this.initialize()
      if (!this.client) {
        throw new Error('Twilio SMS client not available')
      }
      
      const result = await this.client.messages.create({
        body: message,
        from: this.fromNumber,
        to: to
      })

      return {
        success: true,
        messageId: result.sid
      }
    } catch (error) {
      console.error(`Failed to send SMS to ${to}:`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  async sendBulkSMS(contacts: Contact[], message: string): Promise<{
    totalSent: number
    successful: number
    failed: number
    results: Array<{
      contact: Contact
      success: boolean
      messageId?: string
      error?: string
    }>
  }> {
    const results = []
    let successful = 0
    let failed = 0

    for (const contact of contacts) {
      if (!contact.active) {
        continue
      }

      const result = await this.sendSMS(contact.phone, message)
      
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
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    return {
      totalSent: results.length,
      successful,
      failed,
      results
    }
  }

  formatPhoneNumber(phone: string): string {
    // Simple phone number formatting - adds +1 if no country code
    const cleaned = phone.replace(/\D/g, '')
    
    if (cleaned.length === 10) {
      return `+1${cleaned}`
    } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `+${cleaned}`
    } else if (phone.startsWith('+')) {
      // Return the phone with only digits after the +
      return `+${cleaned}`
    } else {
      return `+${cleaned}`
    }
  }

  validatePhoneNumber(phone: string): boolean {
    const cleaned = phone.replace(/\D/g, '')
    return cleaned.length >= 10 && cleaned.length <= 15
  }
}
