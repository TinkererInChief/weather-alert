import { prisma } from '../prisma'
import { EmailService } from './email-service'

interface TemplateRenderRequest {
  type: string // earthquake, tsunami, test
  channel: string // sms, email, whatsapp, voice
  language: string
  data: Record<string, any>
}

interface RenderedMessage {
  content: string
  subject?: string // for email
  html?: string // for email
}

export class TemplateService {
  private emailService: EmailService
  private defaultTemplates: Map<string, string> = new Map()

  constructor() {
    this.emailService = new EmailService()
    this.initializeDefaultTemplates()
  }

  // Initialize default templates if database is empty
  private initializeDefaultTemplates() {
    // SMS Templates
    this.defaultTemplates.set('earthquake:sms:en', 
      '🚨 EARTHQUAKE ALERT\nM{magnitude} @ {location}\nDepth: {depth}km\n{timestamp}\n⚠️ {instructions}')
    
    this.defaultTemplates.set('tsunami:sms:en',
      '🌊 TSUNAMI {alertType}: {waveHeight}m waves expected at {location}. ETA: {eta}. {instructions}')
    
    this.defaultTemplates.set('test:sms:en',
      '🧪 TEST ALERT: {systemName} test for {contactName}. Time: {timestamp}. Status: {status}. This is only a test.')
    
    this.defaultTemplates.set('test:email:en',
      `SYSTEM TEST - Emergency Alert System

Hello {contactName},

This is a test of the Emergency Alert System notification channels.

Test Details:
- Time: {timestamp}
- System Status: {status}
- Your Contact ID: {contactId}
- Channels Tested: {channelsTested}

✅ If you received this message, your contact information is correctly configured.

Reply to this message or visit the dashboard to update your preferences.

---
Emergency Alert System
Automated Test - Do not reply`)

    this.defaultTemplates.set('test:email:en:subject',
      '🧪 System Test - Emergency Alert System')
    
    this.defaultTemplates.set('test:whatsapp:en',
      '🧪 *SYSTEM TEST*\n\n✅ *Status:* {status}\n👤 *Contact:* {contactName}\n🕒 *Time:* {timestamp}\n\nThis is a test of the Emergency Alert System.\n\nReply STOP to unsubscribe from alerts.')
    
    this.defaultTemplates.set('test:voice:en',
      'This is a test message from the Emergency Alert System for {contactName}. The current time is {timestamp}. System status: {status}. All systems are operational. This was only a test.')

    // Email Templates (combined)
    this.defaultTemplates.set('earthquake:email:en',
      `EARTHQUAKE ALERT

Hello {contactName},

An earthquake has been detected:

EARTHQUAKE DETAILS
------------------
Magnitude: {magnitude}
Location: {location}
Depth: {depth} km
Time: {timestamp}

TSUNAMI ASSESSMENT
------------------
Threat Level: {tsunamiLevel}
Confidence: {tsunamiConfidence}%

RECOMMENDED ACTIONS
------------------
{instructions}

{tsunamiWarning}

VIEW FULL DETAILS
Visit the dashboard for real-time updates: {detailsUrl}

EMERGENCY CONTACTS
Local Emergency: {emergencyNumber}

---
Emergency Alert System
Automated notification - Do not reply
Update preferences at {preferencesUrl}`)

    // Email subject templates
    this.defaultTemplates.set('earthquake:email:en:subject',
      'EARTHQUAKE ALERT - M{magnitude} {location}')

    this.defaultTemplates.set('tsunami:email:en',
      `TSUNAMI {alertType}
      
Location: {location}
Wave Height: {waveHeight}m
Estimated Arrival: {eta}
Alert Level: {alertType}

IMMEDIATE ACTION REQUIRED:
{instructions}

Stay tuned for updates and follow official evacuation orders.`)

    this.defaultTemplates.set('tsunami:email:en:subject',
      'TSUNAMI {alertType} - {location}')

    // WhatsApp Templates
    this.defaultTemplates.set('earthquake:whatsapp:en',
      '🚨 *EARTHQUAKE ALERT*\n\n👤 {contactName}\n📊 *Magnitude:* {magnitude}\n📍 *Location:* {location}\n📏 *Depth:* {depth}km\n🕒 *Time:* {timestamp}\n\n⚠️ *IMMEDIATE ACTION:*\n{instructions}\n\n🔗 [View Details]({detailsUrl})\n📞 Emergency: {emergencyNumber}')

    this.defaultTemplates.set('tsunami:whatsapp:en',
      '🌊 *TSUNAMI {alertType}*\n\n📍 Location: {location}\n📏 Wave Height: {waveHeight}m\n⏰ ETA: {eta}\n\n🆘 *URGENT:* {instructions}')

    // Voice Templates (simple, clear speech)
    this.defaultTemplates.set('earthquake:voice:en',
      'Emergency earthquake alert for {contactName}. A magnitude {magnitude} earthquake occurred at {location}. Depth: {depth} kilometers. {instructions}. The event occurred at {timestamp}. Your local emergency number is {emergencyNumber}. This is not a test.')

    this.defaultTemplates.set('tsunami:voice:en',
      'Tsunami {alertType}. {waveHeight} meter waves expected at {location}. Estimated arrival time {eta}. {instructions}. Take action immediately.')
  }

  // Render template with data
  async renderTemplate(request: TemplateRenderRequest): Promise<RenderedMessage> {
    try {
      console.log(`🎨 Rendering template: ${request.type}:${request.channel}:${request.language}`)
      
      // First try to get template from database
      let template = await this.getTemplateFromDatabase(request)
      
      // Fall back to default templates if not found
      if (!template) {
        template = this.getDefaultTemplate(request)
        console.log(`Using default template for ${request.type}:${request.channel}:${request.language}`)
      }

      if (!template) {
        // Create a basic fallback template
        console.warn(`No template found, creating basic fallback for ${request.type}:${request.channel}:${request.language}`)
        template = this.createFallbackTemplate(request)
      }

      // Render the template
      const rendered = this.interpolateTemplate(template, request.data)

      // For email, create HTML version and get subject
      if (request.channel === 'email') {
        const subject = await this.renderEmailSubject(request)
        const html = this.createEmailHTML(request, rendered.content)
        
        return {
          content: rendered.content,
          subject,
          html
        }
      }

      return rendered
    } catch (error) {
      console.error('Template rendering failed:', error)
      throw error
    }
  }

  // Create a basic fallback template when no template is found
  private createFallbackTemplate(request: TemplateRenderRequest): any {
    const { type, channel } = request
    
    if (channel === 'email') {
      return {
        content: `${type.toUpperCase()} ALERT

Alert Type: ${type}
Time: {timestamp}
Location: {location}

This is an automated emergency alert from the Emergency Alert System.`,
        subject: `${type.toUpperCase()} ALERT`
      }
    }
    
    if (channel === 'sms') {
      return {
        content: `🚨 ${type.toUpperCase()} ALERT: {location} at {timestamp}. Please stay safe and follow local guidance.`
      }
    }
    
    if (channel === 'whatsapp') {
      return {
        content: `🚨 *${type.toUpperCase()} ALERT*\n\n📍 Location: {location}\n🕒 Time: {timestamp}\n\n⚠️ Please stay safe and follow local emergency guidance.`
      }
    }
    
    if (channel === 'voice') {
      return {
        content: `Emergency ${type} alert. Location: {location}. Time: {timestamp}. Please follow local emergency guidance. This is not a test.`
      }
    }
    
    return {
      content: `${type.toUpperCase()} ALERT at {location}. Time: {timestamp}. Stay safe.`
    }
  }

  // Get template from database
  private async getTemplateFromDatabase(request: TemplateRenderRequest): Promise<any> {
    try {
      const template = await prisma.messageTemplate.findFirst({
        where: {
          type: request.type,
          channel: request.channel,
          language: request.language,
          isActive: true
        },
        orderBy: {
          version: 'desc' // Get latest version
        }
      })

      return template
    } catch (error) {
      // Database might not have messageTemplate table yet, fall back to defaults
      console.warn('Could not query message templates from database:', error)
      return null
    }
  }

  // Get default template
  private getDefaultTemplate(request: TemplateRenderRequest): any {
    const key = `${request.type}:${request.channel}:${request.language}`
    const content = this.defaultTemplates.get(key)
    
    if (!content) {
      // Try English as fallback
      const fallbackKey = `${request.type}:${request.channel}:en`
      const fallbackContent = this.defaultTemplates.get(fallbackKey)
      
      if (fallbackContent) {
        return { content: fallbackContent }
      }
      
      return null
    }

    return { content }
  }

  // Render email subject
  private async renderEmailSubject(request: TemplateRenderRequest): Promise<string> {
    const subjectKey = `${request.type}:${request.channel}:${request.language}:subject`
    let subject = this.defaultTemplates.get(subjectKey)
    
    if (!subject) {
      // Try to get from database
      const template = await this.getTemplateFromDatabase(request)
      subject = template?.subject || `${request.type.toUpperCase()} ALERT`
    }

    return this.interpolateTemplate({ content: subject }, request.data).content
  }

  // Create HTML email
  private createEmailHTML(request: TemplateRenderRequest, textContent: string): string {
    const severity = request.data.severity || 3
    const type = request.type
    const title = request.data.title || `${type.toUpperCase()} ALERT`
    
    return this.emailService.createEmergencyEmailHTML({
      type,
      severity,
      title,
      message: textContent,
      details: this.extractDetailsFromData(request.data),
      actionUrl: request.data.detailsUrl
    })
  }

  // Extract details for email display
  private extractDetailsFromData(data: Record<string, any>): Record<string, any> {
    const details: Record<string, any> = {}
    
    // Common fields to include in details
    const includeFields = [
      'magnitude', 'depth', 'location', 'timestamp', 
      'waveHeight', 'eta', 'alertType', 'source'
    ]
    
    for (const field of includeFields) {
      if (data[field] !== undefined) {
        const label = this.formatFieldLabel(field)
        details[label] = this.formatFieldValue(field, data[field])
      }
    }
    
    return details
  }

  // Format field labels for display
  private formatFieldLabel(field: string): string {
    const labels: Record<string, string> = {
      'magnitude': 'Magnitude',
      'depth': 'Depth',
      'location': 'Location', 
      'timestamp': 'Time',
      'waveHeight': 'Wave Height',
      'eta': 'Estimated Arrival',
      'alertType': 'Alert Type',
      'source': 'Source'
    }
    
    return labels[field] || field.charAt(0).toUpperCase() + field.slice(1)
  }

  // Format field values for display
  private formatFieldValue(field: string, value: any): string {
    switch (field) {
      case 'magnitude':
        return `M${value}`
      case 'depth':
        return `${value} km`
      case 'waveHeight':
        return `${value} meters`
      case 'timestamp':
        return new Date(value).toLocaleString()
      case 'eta':
        return typeof value === 'string' ? value : new Date(value).toLocaleString()
      case 'alertType':
        return value.toUpperCase()
      default:
        return String(value)
    }
  }

  // Interpolate template with data
  private interpolateTemplate(template: any, data: Record<string, any>): RenderedMessage {
    let content = template.content || template

    // Replace {variable} placeholders
    content = content.replace(/\{(\w+)\}/g, (match: string, key: string) => {
      if (data[key] !== undefined) {
        return String(data[key])
      }
      return match // Leave placeholder if no data
    })

    // Add default values for common fields
    if (!data.timestamp) {
      content = content.replace(/\{timestamp\}/g, new Date().toLocaleString())
    }

    return { content }
  }

  // Create emergency instructions based on type and severity
  getEmergencyInstructions(type: string, severity: number, data: any = {}): string {
    if (type === 'earthquake') {
      if (severity >= 4) {
        return 'Take cover immediately. Drop, Cover, and Hold On. Check for injuries and hazards after shaking stops.'
      } else if (severity >= 2) {
        return 'Be aware of potential aftershocks. Check for damage and stay alert.'
      } else {
        return 'Monitor for updates. Review earthquake safety procedures.'
      }
    }

    if (type === 'tsunami') {
      if (severity >= 4) {
        return 'EVACUATE IMMEDIATELY to high ground or inland. Do not wait. Move quickly and stay away from the ocean.'
      } else if (severity >= 3) {
        return 'Move away from beaches and low-lying coastal areas. Seek higher ground and monitor official updates.'
      } else {
        return 'Stay alert and away from beaches. Monitor official channels for updates.'
      }
    }

    return 'Follow local emergency protocols and official guidance.'
  }

  // Seed default templates to database
  async seedDefaultTemplates(): Promise<void> {
    console.log('Seeding default message templates...')
    
    try {
      for (const [key, content] of this.defaultTemplates.entries()) {
        const [type, channel, language, extra] = key.split(':')
        
        // Skip subject-only templates (handled separately)
        if (extra === 'subject') continue
        
        const subjectKey = `${type}:${channel}:${language}:subject`
        const subject = this.defaultTemplates.get(subjectKey)
        
        await prisma.messageTemplate.upsert({
          where: {
            name_channel_language_version: {
              name: `${type}_${channel}_default`,
              channel,
              language,
              version: 1
            }
          },
          update: {
            content,
            subject
          },
          create: {
            name: `${type}_${channel}_default`,
            type,
            channel,
            language,
            subject,
            content,
            variables: this.extractVariables(content),
            version: 1,
            isActive: true
          }
        })
      }
      
      console.log('✅ Default templates seeded successfully')
    } catch (error) {
      console.error('Error seeding templates:', error)
      throw error
    }
  }

  // Extract variables from template content
  private extractVariables(content: string): string[] {
    const matches = content.match(/\{(\w+)\}/g)
    return matches ? matches.map(match => match.slice(1, -1)) : []
  }
}
