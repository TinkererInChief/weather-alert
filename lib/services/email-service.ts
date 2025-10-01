import sgMail from '@sendgrid/mail'
import { 
  createEarthquakeAlertEmail, 
  createTsunamiAlertEmail,
  type EarthquakeAlertData,
  type TsunamiAlertData 
} from '@/lib/email-templates'

interface EmailRequest {
  to: string
  subject: string
  htmlContent?: string
  textContent?: string
  html?: string
  text?: string
}

interface EmailResult {
  success: boolean
  messageId?: string
  error?: string
  provider: string
}

export class EmailService {
  private initialized: boolean = false

  constructor() {
    this.initialize()
  }

  private initialize() {
    const apiKey = process.env.SENDGRID_API_KEY
    
    if (!apiKey) {
      console.warn('⚠️ SendGrid API key not provided. Email service disabled.')
      return
    }

    sgMail.setApiKey(apiKey)
    this.initialized = true
    console.log('✅ Email service initialized with SendGrid')
  }

  async sendEmail(request: EmailRequest): Promise<EmailResult> {
    if (!this.initialized) {
      return {
        success: false,
        error: 'Email service not initialized. Check SENDGRID_API_KEY.',
        provider: 'sendgrid'
      }
    }

    try {
      const msg = {
        to: request.to,
        from: {
          email: process.env.SENDGRID_FROM_EMAIL || 'alerts@example.com',
          name: process.env.SENDGRID_FROM_NAME || 'Emergency Alert System'
        },
        subject: request.subject,
        html: request.htmlContent || request.html || '',
        text: request.textContent || request.text || '',
        categories: ['emergency-alert'],
        customArgs: {
          type: 'emergency',
          timestamp: new Date().toISOString()
        }
      }

      const [response] = await sgMail.send(msg)
      
      return {
        success: true,
        messageId: response.headers['x-message-id'] as string,
        provider: 'sendgrid'
      }
    } catch (error: any) {
      console.error('SendGrid email failed:', error)
      
      let errorMessage = 'Unknown email error'
      if (error.response?.body?.errors?.[0]?.message) {
        errorMessage = error.response.body.errors[0].message
      } else if (error.message) {
        errorMessage = error.message
      }

      return {
        success: false,
        error: errorMessage,
        provider: 'sendgrid'
      }
    }
  }

  // Validate email address format
  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  /**
   * Send earthquake alert email using modern template
   */
  async sendEarthquakeAlert(to: string, data: EarthquakeAlertData): Promise<EmailResult> {
    const { html, text, subject } = createEarthquakeAlertEmail(data)
    
    return this.sendEmail({
      to,
      subject,
      html,
      text
    })
  }
  
  /**
   * Send tsunami alert email using modern template
   */
  async sendTsunamiAlert(to: string, data: TsunamiAlertData): Promise<EmailResult> {
    const { html, text, subject } = createTsunamiAlertEmail(data)
    
    return this.sendEmail({
      to,
      subject,
      html,
      text
    })
  }
  
  /**
   * @deprecated Use sendEarthquakeAlert or sendTsunamiAlert instead
   * Legacy method for backward compatibility
   */
  createEmergencyEmailHTML(data: {
    type: string
    severity: number
    title: string
    message: string
    details?: Record<string, any>
    actionUrl?: string
  }): string {
    const severityColors = {
      5: '#dc2626', // red-600
      4: '#ea580c', // orange-600
      3: '#d97706', // amber-600
      2: '#ca8a04', // yellow-600
      1: '#0891b2'  // cyan-600
    }

    const severityLabels = {
      5: 'EMERGENCY',
      4: 'WARNING', 
      3: 'ADVISORY',
      2: 'WATCH',
      1: 'INFORMATION'
    }

    const color = severityColors[data.severity as keyof typeof severityColors] || '#0891b2'
    const label = severityLabels[data.severity as keyof typeof severityLabels] || 'ALERT'

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${data.title}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f9fafb; }
        .container { max-width: 600px; margin: 0 auto; background-color: white; }
        .header { background-color: ${color}; color: white; padding: 20px; text-align: center; }
        .severity-badge { display: inline-block; background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
        .content { padding: 30px 20px; }
        .alert-title { font-size: 24px; font-weight: bold; margin: 0 0 20px; color: #1f2937; }
        .alert-message { font-size: 16px; line-height: 1.6; color: #4b5563; margin-bottom: 20px; }
        .details { background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0; }
        .details h4 { margin: 0 0 10px; color: #1f2937; }
        .details p { margin: 5px 0; color: #6b7280; font-size: 14px; }
        .action-button { display: inline-block; background: ${color}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { background: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 14px; }
        .timestamp { color: #9ca3af; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="severity-badge">${label}</div>
            <h1 style="margin: 10px 0 0; font-size: 28px;">${data.type.toUpperCase()} ALERT</h1>
        </div>
        
        <div class="content">
            <h2 class="alert-title">${data.title}</h2>
            <div class="alert-message">${data.message}</div>
            
            ${data.details ? `
            <div class="details">
                <h4>Event Details</h4>
                ${Object.entries(data.details).map(([key, value]) => 
                  `<p><strong>${key}:</strong> ${value}</p>`
                ).join('')}
            </div>
            ` : ''}
            
            ${data.actionUrl ? `
            <a href="${data.actionUrl}" class="action-button">View More Information</a>
            ` : ''}
            
            <div class="timestamp">
                Alert sent: ${new Date().toLocaleString()}
            </div>
        </div>
        
        <div class="footer">
            <p>This is an automated emergency alert. Do not reply to this email.</p>
            <p>Emergency Alert System | Stay Safe, Stay Informed</p>
        </div>
    </div>
</body>
</html>
    `
  }
}
