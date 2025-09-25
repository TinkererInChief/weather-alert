import twilio, { TwilioClient } from 'twilio'

interface VoiceCallResult {
  success: boolean
  callId?: string
  error?: string
  provider: string
}

interface VoiceCallOptions {
  language?: string
  voice?: string
  repeat?: number
}

export class VoiceService {
  private client: TwilioClient | null = null
  private fromNumber: string = ''

  constructor() {
    this.initialize()
  }

  private initialize() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN
    this.fromNumber = process.env.TWILIO_PHONE_NUMBER || ''

    if (!accountSid || !authToken || !this.fromNumber) {
      console.warn('⚠️ Twilio credentials not complete. Voice service disabled.')
      return
    }

    this.client = twilio(accountSid, authToken)
    console.log('✅ Voice service initialized with Twilio')
  }

  async makeCall(
    to: string, 
    message: string, 
    options: VoiceCallOptions = {}
  ): Promise<VoiceCallResult> {
    if (!this.client) {
      return {
        success: false,
        error: 'Voice service not initialized. Check Twilio credentials.',
        provider: 'twilio'
      }
    }

    try {
      const twiml = this.generateTwiML(message, options)
      
      const call = await this.client.calls.create({
        twiml,
        to: this.formatPhoneNumber(to),
        from: this.fromNumber,
        timeout: 30, // seconds before giving up
        machineDetection: 'DetectMessageEnd', // Handle voicemail
        asyncAmd: 'true'
      })

      return {
        success: true,
        callId: call.sid,
        provider: 'twilio'
      }
    } catch (error: any) {
      console.error(`Voice call failed to ${to}:`, error)
      
      let errorMessage = 'Unknown voice call error'
      if (error.code) {
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

  // Generate TwiML for emergency voice message
  private generateTwiML(message: string, options: VoiceCallOptions): string {
    const language = options.language || 'en-US'
    const voice = options.voice || 'alice'
    const repeat = options.repeat || 2

    let twiml = '<?xml version="1.0" encoding="UTF-8"?>'
    twiml += '<Response>'
    
    // Pause to ensure connection
    twiml += '<Pause length="1"/>'
    
    // Repeat the message for emphasis
    for (let i = 0; i < repeat; i++) {
      twiml += `<Say voice="${voice}" language="${language}">${this.escapeXml(message)}</Say>`
      if (i < repeat - 1) {
        twiml += '<Pause length="1"/>'
      }
    }
    
    // Option for user to press a key to repeat
    twiml += '<Gather action="" method="POST" numDigits="1" timeout="5">'
    twiml += `<Say voice="${voice}" language="${language}">Press any key to hear this message again, or hang up.</Say>`
    twiml += '</Gather>'
    
    // If no input, repeat once more and hang up
    twiml += `<Say voice="${voice}" language="${language}">${this.escapeXml(message)}</Say>`
    twiml += '<Hangup/>'
    
    twiml += '</Response>'
    
    return twiml
  }

  // Create emergency voice message content
  createEmergencyVoiceMessage(data: {
    type: string
    severity: number
    location: string
    magnitude?: number
    waveHeight?: number
    eta?: string
    instructions: string
  }): string {
    let message = `Emergency ${data.type} alert. `
    
    if (data.type === 'earthquake' && data.magnitude) {
      message += `Magnitude ${data.magnitude} earthquake detected near ${data.location}. `
    }
    
    if (data.type === 'tsunami') {
      message += `Tsunami alert for ${data.location}. `
      
      if (data.waveHeight) {
        message += `Expected wave height: ${data.waveHeight} meters. `
      }
      
      if (data.eta) {
        message += `Estimated arrival time: ${data.eta}. `
      }
    }
    
    message += `Immediate action required: ${data.instructions}. `
    message += 'This is not a test. Take action immediately for your safety.'
    
    return message
  }

  // Format phone number for voice calls
  private formatPhoneNumber(phone: string): string {
    // Remove all non-digit characters except +
    let cleaned = phone.replace(/[^\d+]/g, '')
    
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
    
    return cleaned
  }

  // Escape XML special characters for TwiML
  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
  }

  // Get call status
  async getCallStatus(callSid: string): Promise<any> {
    if (!this.client) {
      throw new Error('Voice service not initialized')
    }

    try {
      const call = await this.client.calls(callSid).fetch()
      return {
        status: call.status,
        duration: call.duration,
        startTime: call.startTime,
        endTime: call.endTime,
        direction: call.direction,
        answeredBy: call.answeredBy
      }
    } catch (error) {
      console.error('Error fetching call status:', error)
      throw error
    }
  }

  // Validate phone number for voice calls
  validatePhoneNumber(phone: string): boolean {
    const formatted = this.formatPhoneNumber(phone)
    return /^\+\d{10,15}$/.test(formatted)
  }
}
