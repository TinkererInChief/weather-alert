export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/test-message
 * Send a test message to verify webhook tracking
 * Public endpoint for testing - no auth required
 */
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { email, phone, channel = 'email' } = body

    if (!email && !phone) {
      return NextResponse.json(
        { error: 'Provide either email or phone' },
        { status: 400 }
      )
    }

    // Find or create test contact
    let contact = await prisma.contact.findFirst({
      where: {
        OR: [
          email ? { email } : {},
          phone ? { phone } : {}
        ]
      }
    })

    if (!contact) {
      contact = await prisma.contact.create({
        data: {
          name: 'Test Contact',
          email: email || null,
          phone: phone || null
        }
      })
    }

    // Send based on channel
    if (channel === 'email' && email) {
      const sgMail = require('@sendgrid/mail')
      const apiKey = process.env.SENDGRID_API_KEY
      
      if (!apiKey) {
        return NextResponse.json(
          { error: 'SendGrid not configured' },
          { status: 500 }
        )
      }

      sgMail.setApiKey(apiKey)

      const msg = {
        to: email,
        from: {
          email: process.env.SENDGRID_FROM_EMAIL || 'alerts@example.com',
          name: 'Test Alert System'
        },
        subject: '🧪 Test Message - Webhook Tracking',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #2563eb;">🧪 Test Message</h1>
            <p style="font-size: 16px; line-height: 1.6;">
              This is a test message to verify webhook tracking.
            </p>
            <div style="background: #eff6ff; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0;">
              <p style="margin: 0;"><strong>What to do:</strong></p>
              <ol>
                <li>You're reading this email right now ✓</li>
                <li>Check your app's delivery logs</li>
                <li>You should see this message marked as "Acknowledged"</li>
              </ol>
            </div>
            <p style="color: #64748b; font-size: 14px;">
              Sent at: ${new Date().toISOString()}
            </p>
          </div>
        `,
        trackingSettings: {
          clickTracking: { enable: true },
          openTracking: { enable: true }
        }
      }

      const [response] = await sgMail.send(msg)
      const messageId = response.headers['x-message-id']

      // Create delivery log
      const deliveryLog = await prisma.deliveryLog.create({
        data: {
          contactId: contact.id,
          channel: 'email',
          provider: 'sendgrid',
          status: 'queued',
          providerMessageId: messageId,
          sentAt: new Date(),
          metadata: {
            testMessage: true
          }
        }
      })

      return NextResponse.json({
        success: true,
        message: 'Test email sent!',
        data: {
          to: email,
          messageId,
          deliveryLogId: deliveryLog.id
        }
      })
    }

    if (channel === 'sms' && phone) {
      const twilioSid = process.env.TWILIO_ACCOUNT_SID
      const twilioToken = process.env.TWILIO_AUTH_TOKEN
      const twilioPhone = process.env.TWILIO_PHONE_NUMBER

      if (!twilioSid || !twilioToken || !twilioPhone) {
        return NextResponse.json(
          { error: 'Twilio not configured' },
          { status: 500 }
        )
      }

      const twilio = require('twilio')(twilioSid, twilioToken)
      
      // For webhooks to work, use your public ngrok URL
      // Set WEBHOOK_BASE_URL env var to your ngrok URL
      const webhookBaseUrl = process.env.WEBHOOK_BASE_URL || process.env.NEXTAUTH_URL
      
      const messageOptions: any = {
        body: '🧪 TEST: This is a test message to verify webhook tracking. Check your delivery logs!',
        from: twilioPhone,
        to: phone
      }
      
      // Only add statusCallback if we have a public URL (not localhost)
      if (webhookBaseUrl && !webhookBaseUrl.includes('localhost')) {
        messageOptions.statusCallback = `${webhookBaseUrl}/api/webhooks/twilio`
      }

      const result = await twilio.messages.create(messageOptions)

      // Create delivery log
      const deliveryLog = await prisma.deliveryLog.create({
        data: {
          contactId: contact.id,
          channel: 'sms',
          provider: 'twilio',
          status: 'queued',
          providerMessageId: result.sid,
          sentAt: new Date(),
          metadata: {
            testMessage: true
          }
        }
      })

      return NextResponse.json({
        success: true,
        message: 'Test SMS sent!',
        data: {
          to: phone,
          messageId: result.sid,
          deliveryLogId: deliveryLog.id
        }
      })
    }

    return NextResponse.json(
      { error: 'Invalid channel or missing contact info' },
      { status: 400 }
    )
  } catch (error: any) {
    console.error('Test message error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

/**
 * GET /api/test-message
 * Get instructions
 */
export async function GET() {
  return NextResponse.json({
    message: 'Send a test message',
    usage: {
      method: 'POST',
      body: {
        email: 'your@email.com',
        channel: 'email'
      },
      example: 'curl -X POST http://localhost:3000/api/test-message -H "Content-Type: application/json" -d \'{"email":"your@email.com","channel":"email"}\''
    }
  })
}
