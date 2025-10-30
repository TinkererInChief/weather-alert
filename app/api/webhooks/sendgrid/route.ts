export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

/**
 * POST /api/webhooks/sendgrid
 * Handle SendGrid email event webhooks
 * 
 * SendGrid Event Types:
 * - processed: Message has been received and is ready to be delivered
 * - dropped: Message was dropped (invalid email, spam, etc.)
 * - delivered: Message has been successfully delivered
 * - deferred: Recipient's email server temporarily rejected the message
 * - bounce: Receiving server permanently rejected the message
 * - open: Recipient opened the email (requires open tracking)
 * - click: Recipient clicked a link in the email (requires click tracking)
 * - spam_report: Recipient marked the email as spam
 * - unsubscribe: Recipient clicked the unsubscribe link
 */
export async function POST(req: NextRequest) {
  try {
    // Get SendGrid verification key
    const verificationKey = process.env.SENDGRID_WEBHOOK_VERIFICATION_KEY

    // Parse JSON array of events
    const events = await req.json()

    if (!Array.isArray(events)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    // Verify signature if configured
    if (verificationKey) {
      const signature = req.headers.get('x-twilio-email-event-webhook-signature')
      const timestamp = req.headers.get('x-twilio-email-event-webhook-timestamp')
      
      if (signature && timestamp) {
        const body = await req.text()
        if (!verifySendGridSignature(body, signature, timestamp, verificationKey)) {
          console.error('[SendGrid Webhook] Invalid signature')
          return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
        }
      }
    }

    console.log(`[SendGrid Webhook] Processing ${events.length} events`)

    // Process each event
    const results = await Promise.allSettled(
      events.map(event => processEmailEvent(event))
    )

    const successful = results.filter(r => r.status === 'fulfilled').length
    const failed = results.filter(r => r.status === 'rejected').length

    console.log(`[SendGrid Webhook] Processed: ${successful} successful, ${failed} failed`)

    return NextResponse.json({
      success: true,
      processed: successful,
      failed
    })
  } catch (error) {
    console.error('[SendGrid Webhook] Error processing webhook:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Process individual SendGrid event
 */
async function processEmailEvent(event: any) {
  const {
    event: eventType,
    sg_message_id,
    email,
    timestamp,
    reason,
    url
  } = event

  // Extract message ID (SendGrid uses format like: <message_id>@sendgrid.com)
  const messageId = sg_message_id?.split('.')[0]

  if (!messageId) {
    console.warn('[SendGrid Webhook] No message ID in event')
    return
  }

  console.log(`[SendGrid Webhook] Event: ${eventType} for ${messageId}`)

  // Find delivery log by provider message ID
  const deliveryLog = await prisma.deliveryLog.findFirst({
    where: {
      providerMessageId: messageId,
      channel: 'email'
    }
  })

  if (!deliveryLog) {
    console.warn(`[SendGrid Webhook] Delivery log not found for message: ${messageId}`)
    return
  }

  // Update delivery log based on event type
  const updateData: any = {
    updatedAt: new Date()
  }

  switch (eventType) {
    case 'processed':
      updateData.status = 'queued'
      break

    case 'delivered':
      updateData.status = 'delivered'
      updateData.deliveredAt = new Date(timestamp * 1000)
      if (!deliveryLog.sentAt) {
        updateData.sentAt = new Date(timestamp * 1000)
      }
      break

    case 'open':
      // Email was opened - set readAt timestamp
      updateData.readAt = new Date(timestamp * 1000)
      if (!deliveryLog.deliveredAt) {
        updateData.deliveredAt = new Date(timestamp * 1000)
      }
      if (!deliveryLog.sentAt) {
        updateData.sentAt = new Date(timestamp * 1000)
      }
      // Keep status as delivered (multiple opens possible)
      if (deliveryLog.status !== 'delivered') {
        updateData.status = 'delivered'
      }
      break

    case 'click':
      // Email link was clicked - also indicates message was read
      if (!deliveryLog.readAt) {
        updateData.readAt = new Date(timestamp * 1000)
      }
      // Store click metadata
      updateData.metadata = {
        ...(deliveryLog.metadata as any || {}),
        clicks: [
          ...((deliveryLog.metadata as any)?.clicks || []),
          {
            url,
            timestamp: new Date(timestamp * 1000)
          }
        ]
      }
      break

    case 'bounce':
    case 'dropped':
      updateData.status = 'bounced'
      updateData.errorMessage = reason || 'Email bounced'
      break

    case 'deferred':
      updateData.status = 'queued'
      updateData.errorMessage = reason || 'Delivery deferred'
      break

    case 'spam_report':
    case 'unsubscribe':
      // Store in metadata but don't change delivery status
      updateData.metadata = {
        ...(deliveryLog.metadata as any || {}),
        [eventType]: {
          timestamp: new Date(timestamp * 1000)
        }
      }
      break
  }

  // Update the delivery log
  await prisma.deliveryLog.update({
    where: { id: deliveryLog.id },
    data: updateData
  })

  console.log(`[SendGrid Webhook] Updated delivery log ${deliveryLog.id}: ${eventType}`)
}

/**
 * Verify SendGrid webhook signature
 */
function verifySendGridSignature(
  payload: string,
  signature: string,
  timestamp: string,
  verificationKey: string
): boolean {
  try {
    const timestampedPayload = timestamp + payload
    const hmac = crypto
      .createHmac('sha256', verificationKey)
      .update(timestampedPayload)
      .digest('base64')

    return hmac === signature
  } catch (error) {
    console.error('[SendGrid Webhook] Signature verification error:', error)
    return false
  }
}

/**
 * GET /api/webhooks/sendgrid
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    service: 'SendGrid Webhook Handler',
    status: 'active',
    events: [
      'processed',
      'delivered',
      'open',
      'click',
      'bounce',
      'dropped',
      'deferred',
      'spam_report',
      'unsubscribe'
    ]
  })
}
