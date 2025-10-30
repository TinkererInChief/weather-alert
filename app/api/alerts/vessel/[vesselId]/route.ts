import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'

// Validation schema
const createAlertSchema = z.object({
  eventId: z.string(),
  eventType: z.enum(['earthquake', 'tsunami', 'storm']),
  severity: z.enum(['low', 'moderate', 'high', 'critical']),
  distance: z.number().positive(),
  coordinates: z.object({
    lat: z.number().min(-90).max(90),
    lon: z.number().min(-180).max(180)
  }),
  message: z.string().min(10)
})

/**
 * POST /api/alerts/vessel/[vesselId]
 * Create a vessel alert and route to assigned contacts
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { vesselId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { vesselId } = params
    const body = await req.json()

    // Validate input
    const validatedData = createAlertSchema.parse(body)

    // Verify vessel exists
    const vessel = await prisma.vessel.findUnique({
      where: { id: vesselId },
      select: { id: true, name: true, mmsi: true }
    })

    if (!vessel) {
      return NextResponse.json({ error: 'Vessel not found' }, { status: 404 })
    }

    // Check for duplicate alert
    const existingAlert = await prisma.vesselAlert.findFirst({
      where: {
        vesselId,
        eventId: validatedData.eventId,
        status: { in: ['pending', 'sent', 'acknowledged'] }
      }
    })

    if (existingAlert) {
      return NextResponse.json(
        { error: 'Alert already exists for this event', alert: existingAlert },
        { status: 409 }
      )
    }

    // Create vessel alert
    const alert = await prisma.vesselAlert.create({
      data: {
        vesselId,
        eventId: validatedData.eventId,
        eventType: validatedData.eventType,
        type: validatedData.eventType,
        severity: validatedData.severity,
        riskLevel: validatedData.severity,
        distance: validatedData.distance,
        message: validatedData.message,
        coordinates: validatedData.coordinates,
        recommendation: generateRecommendation(validatedData),
        status: 'pending',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      }
    })

    // Get contacts to notify
    const vesselContacts = await prisma.vesselContact.findMany({
      where: {
        vesselId,
        // Filter by severity threshold in notifyOn array
        notifyOn: {
          has: validatedData.severity
        }
      },
      include: {
        contact: true
      },
      orderBy: [
        { priority: 'asc' },
        { role: 'asc' }
      ]
    })

    if (vesselContacts.length === 0) {
      console.warn(`[Alert] No contacts found for vessel ${vessel.name} (${vesselId})`)
      return NextResponse.json({
        alert,
        warning: 'No contacts assigned to receive this severity level',
        recipientCount: 0,
        deliveryLogs: []
      })
    }

    // Create delivery logs and send notifications
    const deliveryLogs = []
    
    for (const vc of vesselContacts) {
      const contact = vc.contact

      // Determine channels to use
      const channels = []
      if (contact.phone) channels.push('sms')
      if (contact.email) channels.push('email')
      if (contact.whatsapp) channels.push('whatsapp')

      // Create delivery log for each channel
      for (const channel of channels) {
        try {
          const log = await prisma.deliveryLog.create({
            data: {
              vesselAlertId: alert.id,
              contactId: contact.id,
              channel,
              status: 'pending',
              attempts: 0
            }
          })

          // Send notification (async, don't block)
          sendNotification(log.id, contact, channel, alert, vessel).catch(err => {
            console.error(`[Alert] Failed to send ${channel} to ${contact.name}:`, err)
          })

          deliveryLogs.push(log)
        } catch (error) {
          console.error(`[Alert] Error creating delivery log:`, error)
        }
      }
    }

    // Update alert status to sent
    await prisma.vesselAlert.update({
      where: { id: alert.id },
      data: {
        status: 'sent',
        sentAt: new Date()
      }
    })

    return NextResponse.json({
      alert: {
        ...alert,
        status: 'sent',
        sentAt: new Date()
      },
      recipientCount: vesselContacts.length,
      deliveryLogs: deliveryLogs.length,
      success: true
    })

  } catch (error) {
    console.error('[Alert API] Error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create alert' },
      { status: 500 }
    )
  }
}

/**
 * Send notification via channel
 */
async function sendNotification(
  logId: string,
  contact: any,
  channel: string,
  alert: any,
  vessel: any
) {
  try {
    let success = false
    let errorMessage = null

    if (channel === 'sms' && contact.phone) {
      // Send SMS via Twilio
      const twilioSid = process.env.TWILIO_ACCOUNT_SID
      const twilioToken = process.env.TWILIO_AUTH_TOKEN
      const twilioPhone = process.env.TWILIO_PHONE_NUMBER

      if (twilioSid && twilioToken && twilioPhone) {
        const twilio = require('twilio')(twilioSid, twilioToken)
        
        const result = await twilio.messages.create({
          body: alert.message,
          from: twilioPhone,
          to: contact.phone
        })

        success = result.sid ? true : false
      } else {
        errorMessage = 'Twilio not configured'
      }
    } else if (channel === 'email' && contact.email) {
      // Send Email via SendGrid
      const sgMail = require('@sendgrid/mail')
      const apiKey = process.env.SENDGRID_API_KEY
      
      if (apiKey) {
        sgMail.setApiKey(apiKey)
        
        await sgMail.send({
          to: contact.email,
          from: process.env.SENDGRID_FROM_EMAIL || 'alerts@example.com',
          subject: `🚨 ALERT: ${alert.severity.toUpperCase()} - ${vessel.name}`,
          text: alert.message,
          html: `
            <h2>🚨 Maritime Alert</h2>
            <p><strong>Vessel:</strong> ${vessel.name} (${vessel.mmsi})</p>
            <p><strong>Severity:</strong> ${alert.severity.toUpperCase()}</p>
            <p><strong>Event:</strong> ${alert.eventType}</p>
            <p><strong>Distance:</strong> ${alert.distance.toFixed(0)}km</p>
            <hr>
            <p>${alert.message}</p>
          `
        })

        success = true
      } else {
        errorMessage = 'SendGrid not configured'
      }
    } else if (channel === 'whatsapp' && contact.whatsapp) {
      // WhatsApp via Twilio (if configured)
      errorMessage = 'WhatsApp not implemented yet'
    }

    // Update delivery log
    await prisma.deliveryLog.update({
      where: { id: logId },
      data: {
        status: success ? 'sent' : 'failed',
        attempts: 1,
        lastAttemptAt: new Date(),
        ...(success && { deliveredAt: new Date() }),
        ...(errorMessage && { errorMessage })
      }
    })

  } catch (error: any) {
    console.error(`[Notification] Error sending ${channel}:`, error)
    
    // Update log with failure
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
 * Generate recommendation based on alert data
 */
function generateRecommendation(data: z.infer<typeof createAlertSchema>): string {
  const { eventType, severity, distance } = data

  if (severity === 'critical') {
    return `IMMEDIATE ACTION REQUIRED: ${eventType} detected ${distance.toFixed(0)}km from your position. Evacuate danger zone immediately. Contact shore operations.`
  } else if (severity === 'high') {
    return `HIGH PRIORITY: ${eventType} alert. Monitor situation closely. Prepare emergency procedures. Distance: ${distance.toFixed(0)}km.`
  } else if (severity === 'moderate') {
    return `ADVISORY: ${eventType} detected ${distance.toFixed(0)}km away. Monitor developments. No immediate action required.`
  } else {
    return `INFORMATION: ${eventType} event at ${distance.toFixed(0)}km. For awareness only.`
  }
}
