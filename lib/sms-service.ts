import { Contact } from '@/types/earthquake'
import { executeWithCircuitBreaker } from './circuit-breaker'
import { log, withPerformanceLogging } from './logger'

// Dynamic import for Twilio to handle module resolution
let twilio: any = null

async function getTwilio() {
  if (!twilio) {
    try {
      const twilioModule = await import('twilio')
      twilio = twilioModule.default || twilioModule
    } catch (error) {
      log.error('Failed to import Twilio module', error)
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
      log.warn('Twilio credentials missing or incomplete. SMS service disabled.', {
        hasAccountSid: !!accountSid,
        hasAuthToken: !!authToken,
        hasFromNumber: !!this.fromNumber,
        environment: process.env.NODE_ENV
      })
      
      if (process.env.NODE_ENV !== 'production') {
        // Create a mock client to avoid runtime errors in dev
        this.client = {
          messages: {
            create: async (options: any) => {
              // Extract OTP code from message for easy testing
              const otpMatch = options.body?.match(/Use (\d+) to access/)
              const otp = otpMatch ? otpMatch[1] : 'N/A'
              
              console.log('\n' + '='.repeat(60))
              console.log('📱 SMS MOCK - OTP CODE FOR TESTING')
              console.log('='.repeat(60))
              console.log(`Phone: ${options.to}`)
              console.log(`OTP Code: ${otp}`)
              console.log(`Message: ${options.body}`)
              console.log('='.repeat(60) + '\n')
              
              log.debug('SMS mock: message sent', { to: options.to, otp, body: options.body?.substring(0, 50) })
              return { sid: `mock_${Date.now()}` }
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
      log.info('SMS service initialized successfully', { fromNumber: this.fromNumber })
    } catch (error) {
      log.error('Failed to initialize Twilio client', error)
      // Fallback to mock client in development
      if (process.env.NODE_ENV !== 'production') {
        this.client = {
          messages: {
            create: async (options: any) => {
              // Extract OTP code from message for easy testing
              const otpMatch = options.body?.match(/Use (\d+) to access/)
              const otp = otpMatch ? otpMatch[1] : 'N/A'
              
              console.log('\n' + '='.repeat(60))
              console.log('📱 SMS MOCK (FALLBACK) - OTP CODE FOR TESTING')
              console.log('='.repeat(60))
              console.log(`Phone: ${options.to}`)
              console.log(`OTP Code: ${otp}`)
              console.log(`Message: ${options.body}`)
              console.log('='.repeat(60) + '\n')
              
              log.debug('SMS mock (fallback): message sent', { to: options.to, otp, body: options.body?.substring(0, 50) })
              return { sid: `mock_${Date.now()}` }
            }
          }
        }
      } else {
        this.client = null
      }
      this.isInitialized = true
    }
  }

  async sendSMS(to: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const startTime = Date.now()
    
    try {
      await this.initialize()
      if (!this.client) {
        throw new Error('Twilio SMS client not available')
      }
      
      // Use circuit breaker for Twilio API calls
      const result = await executeWithCircuitBreaker('twilio', async () => {
        return await this.client.messages.create({
          body: message,
          from: this.fromNumber,
          to: to
        })
      })

      const duration = Date.now() - startTime
      log.info('SMS sent successfully', {
        to: to.replace(/\d(?=\d{4})/g, '*'), // Mask phone number for privacy
        messageId: result.sid,
        duration,
        messageLength: message.length
      })

      return {
        success: true,
        messageId: result.sid
      }
    } catch (error) {
      const duration = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      log.error('Failed to send SMS', error, {
        to: to.replace(/\d(?=\d{4})/g, '*'), // Mask phone number for privacy
        duration,
        messageLength: message.length,
        fromNumber: this.fromNumber
      })

      return {
        success: false,
        error: errorMessage
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
    const startTime = Date.now()
    const results = []
    let successful = 0
    let failed = 0
    const activeContacts = contacts.filter(c => c.active && c.phone)

    log.info('Starting bulk SMS operation', {
      totalContacts: contacts.length,
      activeContacts: activeContacts.length,
      messageLength: message.length
    })

    // Process in batches to avoid overwhelming the system
    const batchSize = 10
    for (let i = 0; i < activeContacts.length; i += batchSize) {
      const batch = activeContacts.slice(i, i + batchSize)
      
      // Process batch with limited concurrency
      const batchPromises = batch.map(async (contact, index) => {
        // Stagger requests within batch to respect rate limits
        await new Promise(resolve => setTimeout(resolve, index * 200))
        
        const result = await this.sendSMS(contact.phone!, message)
        
        return {
          contact,
          success: result.success,
          messageId: result.messageId,
          error: result.error
        }
      })

      const batchResults = await Promise.allSettled(batchPromises)
      
      for (const promiseResult of batchResults) {
        if (promiseResult.status === 'fulfilled') {
          const result = promiseResult.value
          results.push(result)
          
          if (result.success) {
            successful++
          } else {
            failed++
          }
        } else {
          // Handle rejected promises
          failed++
          log.error('Batch SMS promise rejected', promiseResult.reason)
        }
      }

      // Longer delay between batches to prevent rate limiting
      if (i + batchSize < activeContacts.length) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    const duration = Date.now() - startTime
    log.info('Bulk SMS operation completed', {
      duration,
      totalSent: results.length,
      successful,
      failed,
      successRate: results.length > 0 ? (successful / results.length * 100).toFixed(1) : 0
    })

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
