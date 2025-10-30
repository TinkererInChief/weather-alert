import { prisma } from '@/lib/prisma'

type CreateAlertParams = {
  vesselId: string
  eventId: string
  eventType: 'earthquake' | 'tsunami' | 'storm'
  severity: 'low' | 'moderate' | 'high' | 'critical'
  distance: number
  coordinates: { lat: number; lon: number }
  message: string
  eventMagnitude?: number
  waveHeight?: number
}

type DeliveryChannel = 'sms' | 'email' | 'whatsapp'

/**
 * AlertRoutingService - Centralized alert creation and routing
 * Handles vessel alerts, contact selection, and multi-channel delivery
 */
export class AlertRoutingService {
  /**
   * Create a vessel alert and route to appropriate contacts
   */
  async createAndRouteAlert(params: CreateAlertParams) {
    const {
      vesselId,
      eventId,
      eventType,
      severity,
      distance,
      coordinates,
      message,
      eventMagnitude,
      waveHeight
    } = params

    // Get vessel details
    const vessel = await prisma.vessel.findUnique({
      where: { id: vesselId },
      select: { id: true, name: true, mmsi: true, imo: true }
    })

    if (!vessel) {
      throw new Error(`Vessel not found: ${vesselId}`)
    }

    // Check for duplicate alert (same event, same vessel, within last 24 hours)
    const existingAlert = await this.checkDuplicateAlert(vesselId, eventId)
    if (existingAlert) {
      console.log(`[AlertRouting] Duplicate alert detected for vessel ${vessel.name} and event ${eventId}`)
      return {
        alert: existingAlert,
        isDuplicate: true,
        recipientCount: 0,
        deliveryLogs: []
      }
    }

    // Create the alert
    const alert = await prisma.vesselAlert.create({
      data: {
        vesselId,
        eventId,
        eventType,
        type: eventType,
        severity,
        riskLevel: severity,
        distance,
        coordinates,
        message,
        recommendation: this.generateRecommendation(eventType, severity, distance),
        actions: this.generateActions(eventType, severity),
        status: 'pending',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        tsunamiETA: eventType === 'tsunami' ? this.calculateTsunamiETA(distance) : undefined,
        waveHeight: waveHeight
      }
    })

    console.log(`[AlertRouting] Created alert ${alert.id} for vessel ${vessel.name} (${severity} - ${distance.toFixed(0)}km)`)

    // Get contacts to notify
    const contacts = await this.getContactsForVessel(vesselId, severity)

    if (contacts.length === 0) {
      console.warn(`[AlertRouting] No contacts found for vessel ${vessel.name} at severity ${severity}`)
      return {
        alert,
        isDuplicate: false,
        recipientCount: 0,
        deliveryLogs: [],
        warning: 'No contacts configured for this severity level'
      }
    }

    console.log(`[AlertRouting] Found ${contacts.length} contacts for vessel ${vessel.name}`)

    // Send notifications and create delivery logs
    const deliveryLogs = await this.sendNotifications(alert, vessel, contacts)

    // Update alert status to sent
    await prisma.vesselAlert.update({
      where: { id: alert.id },
      data: {
        status: 'sent',
        sentAt: new Date()
      }
    })

    console.log(`[AlertRouting] Sent ${deliveryLogs.length} notifications for alert ${alert.id}`)

    return {
      alert: {
        ...alert,
        status: 'sent' as const,
        sentAt: new Date()
      },
      isDuplicate: false,
      recipientCount: contacts.length,
      deliveryLogs
    }
  }

  /**
   * Check for duplicate alerts
   */
  private async checkDuplicateAlert(vesselId: string, eventId: string) {
    return prisma.vesselAlert.findFirst({
      where: {
        vesselId,
        eventId,
        status: { in: ['pending', 'sent', 'acknowledged'] },
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      }
    })
  }

  /**
   * Get contacts to notify based on vessel and severity
   */
  private async getContactsForVessel(vesselId: string, severity: string) {
    const vesselContacts = await prisma.vesselContact.findMany({
      where: {
        vesselId,
        notifyOn: {
          has: severity
        }
      },
      include: {
        contact: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            whatsapp: true,
            active: true
          }
        }
      },
      orderBy: [
        { priority: 'asc' }, // 1 = highest priority
        { role: 'asc' }
      ]
    })

    // Filter for active contacts only
    return vesselContacts
      .filter(vc => vc.contact.active)
      .map(vc => ({
        ...vc.contact,
        role: vc.role,
        priority: vc.priority
      }))
  }

  /**
   * Send notifications to all contacts via available channels
   */
  private async sendNotifications(alert: any, vessel: any, contacts: any[]) {
    const deliveryLogs = []

    for (const contact of contacts) {
      // Determine available channels
      const channels: DeliveryChannel[] = []
      if (contact.phone) channels.push('sms')
      if (contact.email) channels.push('email')
      if (contact.whatsapp) channels.push('whatsapp')

      // Create delivery log for each channel
      for (const channel of channels) {
        const log = await prisma.deliveryLog.create({
          data: {
            vesselAlertId: alert.id,
            contactId: contact.id,
            channel,
            status: 'pending',
            attempts: 0
          }
        })

        // Send notification (async, non-blocking)
        this.deliverNotification(log.id, contact, channel, alert, vessel)
          .catch(err => {
            console.error(`[AlertRouting] Failed to send ${channel} to ${contact.name}:`, err)
          })

        deliveryLogs.push(log)
      }
    }

    return deliveryLogs
  }

  /**
   * Deliver notification via specific channel
   */
  private async deliverNotification(
    logId: string,
    contact: any,
    channel: DeliveryChannel,
    alert: any,
    vessel: any
  ) {
    try {
      let success = false
      let errorMessage: string | null = null
      let providerMessageId: string | null | undefined = null

      if (channel === 'sms' && contact.phone) {
        const result = await this.sendSMS(contact.phone, alert.message, alert.id)
        success = result.success
        errorMessage = result.error
        providerMessageId = result.messageId || null
      } else if (channel === 'email' && contact.email) {
        const result = await this.sendEmail(contact.email, contact.name, alert, vessel, alert.id)
        success = result.success
        errorMessage = result.error
        providerMessageId = result.messageId || null
      } else if (channel === 'whatsapp' && contact.whatsapp) {
        // WhatsApp implementation (future)
        errorMessage = 'WhatsApp not implemented yet'
      }

      // Update delivery log
      await prisma.deliveryLog.update({
        where: { id: logId },
        data: {
          status: success ? 'sent' : 'failed',
          attempts: 1,
          lastAttemptAt: new Date(),
          providerMessageId,
          errorMessage,
          ...(success && { deliveredAt: new Date() })
        }
      })

      if (success) {
        console.log(`[AlertRouting] ✓ ${channel.toUpperCase()} sent to ${contact.name}`)
      } else {
        console.error(`[AlertRouting] ✗ ${channel.toUpperCase()} failed for ${contact.name}: ${errorMessage}`)
      }

    } catch (error: any) {
      console.error(`[AlertRouting] Error delivering ${channel}:`, error)
      
      await prisma.deliveryLog.update({
        where: { id: logId },
        data: {
          status: 'failed',
          attempts: 1,
          lastAttemptAt: new Date(),
          errorMessage: error.message || 'Unknown error'
        }
      })
    }
  }

  /**
   * Send SMS via Twilio
   */
  private async sendSMS(phone: string, message: string, alertId?: string) {
    try {
      const twilioSid = process.env.TWILIO_ACCOUNT_SID
      const twilioToken = process.env.TWILIO_AUTH_TOKEN
      const twilioPhone = process.env.TWILIO_PHONE_NUMBER

      if (!twilioSid || !twilioToken || !twilioPhone) {
        return { success: false, error: 'Twilio not configured' }
      }

      const twilio = require('twilio')(twilioSid, twilioToken)
      
      // Add acknowledgment link if alertId provided
      let smsBody = message
      if (alertId) {
        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
        const ackUrl = `${baseUrl}/alerts/${alertId}/acknowledge`
        smsBody += `\n\nAcknowledge: ${ackUrl}`
      }
      
      const result = await twilio.messages.create({
        body: smsBody,
        from: twilioPhone,
        to: phone
      })

      return {
        success: !!result.sid,
        messageId: result.sid,
        error: null
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        messageId: null
      }
    }
  }

  /**
   * Send Email via SendGrid
   */
  private async sendEmail(email: string, name: string, alert: any, vessel: any, alertId?: string) {
    try {
      const apiKey = process.env.SENDGRID_API_KEY
      const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'alerts@maritime-alert.com'

      if (!apiKey) {
        return { success: false, error: 'SendGrid not configured' }
      }

      const sgMail = require('@sendgrid/mail')
      sgMail.setApiKey(apiKey)

      const severityEmoji: Record<string, string> = {
        critical: '🔴',
        high: '🟠',
        moderate: '🟡',
        low: '🟢'
      }
      const emoji = severityEmoji[alert.severity] || '⚠️'

      // Generate acknowledgment URL
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
      const ackUrl = alertId ? `${baseUrl}/alerts/${alertId}/acknowledge` : null

      await sgMail.send({
        to: email,
        from: fromEmail,
        subject: `${emoji} MARITIME ALERT: ${alert.severity.toUpperCase()} - ${vessel.name}`,
        text: alert.message + (ackUrl ? `\n\nAcknowledge this alert: ${ackUrl}` : ''),
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #1e40af; color: white; padding: 20px; text-align: center;">
              <h1 style="margin: 0;">${emoji} Maritime Alert</h1>
            </div>
            
            <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 20px; margin: 20px 0;">
              <h2 style="color: #dc2626; margin-top: 0;">⚠️ ${alert.severity.toUpperCase()} ALERT</h2>
              <p style="font-size: 16px; line-height: 1.6;">${alert.message}</p>
            </div>

            <div style="padding: 20px; background: #f9fafb;">
              <h3>Vessel Details:</h3>
              <ul style="list-style: none; padding: 0;">
                <li><strong>Name:</strong> ${vessel.name}</li>
                <li><strong>MMSI:</strong> ${vessel.mmsi}</li>
                ${vessel.imo ? `<li><strong>IMO:</strong> ${vessel.imo}</li>` : ''}
              </ul>

              <h3>Event Details:</h3>
              <ul style="list-style: none; padding: 0;">
                <li><strong>Type:</strong> ${alert.eventType.toUpperCase()}</li>
                <li><strong>Severity:</strong> ${alert.severity.toUpperCase()}</li>
                <li><strong>Distance:</strong> ${alert.distance.toFixed(0)} km</li>
                <li><strong>Time:</strong> ${new Date().toISOString()}</li>
              </ul>

              <h3>Recommended Actions:</h3>
              <p style="background: white; padding: 15px; border-radius: 5px;">
                ${alert.recommendation}
              </p>
            </div>

            ${ackUrl ? `
            <div style="text-align: center; padding: 30px;">
              <a href="${ackUrl}" style="display: inline-block; background: #dc2626; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
                ✓ ACKNOWLEDGE ALERT
              </a>
            </div>
            ` : ''}

            <div style="text-align: center; padding: 20px; color: #6b7280; font-size: 12px;">
              <p>This is an automated alert from your Maritime Alert System.</p>
              ${ackUrl ? `<p>Click the button above or visit: ${ackUrl}</p>` : ''}
            </div>
          </div>
        `
      })

      return {
        success: true,
        messageId: `email-${Date.now()}`,
        error: null
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        messageId: null
      }
    }
  }

  /**
   * Generate recommendation based on alert parameters
   */
  private generateRecommendation(
    eventType: string,
    severity: string,
    distance: number
  ): string {
    if (severity === 'critical') {
      return `IMMEDIATE ACTION REQUIRED: ${eventType.toUpperCase()} detected ${distance.toFixed(0)}km from your position. Evacuate danger zone immediately. Contact shore operations and nearest port authority. Monitor all channels for updates.`
    }

    if (severity === 'high') {
      return `HIGH PRIORITY: ${eventType.toUpperCase()} alert at ${distance.toFixed(0)}km distance. Monitor situation closely. Prepare emergency procedures. Update voyage plan if necessary. Maintain radio watch.`
    }

    if (severity === 'moderate') {
      return `ADVISORY: ${eventType.toUpperCase()} detected ${distance.toFixed(0)}km away. Monitor developments closely. Review emergency procedures. No immediate action required unless situation changes.`
    }

    return `INFORMATION: ${eventType.toUpperCase()} event at ${distance.toFixed(0)}km. For awareness and monitoring. Continue normal operations with heightened alertness.`
  }

  /**
   * Generate action items based on event type and severity
   */
  private generateActions(eventType: string, severity: string): string[] {
    const actions: string[] = []

    if (severity === 'critical' || severity === 'high') {
      actions.push('Alert all crew members')
      actions.push('Contact shore operations immediately')
      actions.push('Monitor emergency channels (VHF 16, DSC)')
    }

    if (eventType === 'tsunami') {
      actions.push('Move to deeper water (>500m depth) if possible')
      actions.push('Avoid coastal areas and harbors')
      actions.push('Prepare for possible strong currents')
    }

    if (eventType === 'earthquake') {
      actions.push('Check for structural damage')
      actions.push('Monitor for aftershocks')
      actions.push('Be alert for tsunami warnings')
    }

    if (eventType === 'storm') {
      actions.push('Secure all loose items and equipment')
      actions.push('Review heavy weather procedures')
      actions.push('Update weather routing')
    }

    return actions
  }

  /**
   * Calculate estimated tsunami arrival time (minutes)
   */
  private calculateTsunamiETA(distanceKm: number): number {
    // Tsunami speed in deep ocean: ~800 km/h
    const speedKmh = 800
    const hours = distanceKm / speedKmh
    const minutes = Math.round(hours * 60)
    return minutes
  }

  /**
   * Retry failed deliveries
   */
  async retryFailedDeliveries(alertId: string) {
    const failedLogs = await prisma.deliveryLog.findMany({
      where: {
        vesselAlertId: alertId,
        status: 'failed',
        attempts: { lt: 3 } // Max 3 attempts
      },
      include: {
        contact: true,
        vesselAlert: {
          include: {
            vessel: true
          }
        }
      }
    })

    console.log(`[AlertRouting] Retrying ${failedLogs.length} failed deliveries for alert ${alertId}`)

    for (const log of failedLogs) {
      if (!log.vesselAlert) {
        console.warn(`[AlertRouting] Skipping log ${log.id} - no vesselAlert found`)
        continue
      }

      await this.deliverNotification(
        log.id,
        log.contact,
        log.channel as DeliveryChannel,
        log.vesselAlert,
        log.vesselAlert.vessel
      )
    }

    return {
      retriedCount: failedLogs.length
    }
  }
}

// Singleton instance
export const alertRoutingService = new AlertRoutingService()
